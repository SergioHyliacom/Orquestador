#!/usr/bin/env node
// easyone-orchestrator guard. Claude Code hook for SessionStart, PreToolUse and SubagentStop.
// Inert unless the repository has .orchestrator.json at its root.
// Exit 0 = allow. Exit 2 = block; stderr goes back to Claude. Exit 0 with permissionDecision "ask" on
// stdout = Claude Code asks the human to confirm.

import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WIN = process.platform === "win32";
const stripBom = (s) => s.replace(/^﻿/, "");
const input = JSON.parse(stripBom(readFileSync(0, "utf8")) || "{}");
const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
// Every role that writes code ends in -builder: backend-builder, frontend-builder.
const BUILDER = /(^|:)([a-z0-9]+-)*builder$/;
// A failed command matters only inside a builder (the breaker below): every other session leaves at once.
if (input.hook_event_name === "PostToolUseFailure" && !BUILDER.test(String(input.agent_type ?? ""))) process.exit(0);

function block(reason) {
  process.stderr.write(`easyone-orchestrator: ${reason}\n`);
  process.exit(2);
}

// A command the human must confirm. It is reported only after every other check on the line passed,
// so a blocked command never reaches the prompt.
let confirmReason = null;
const confirm = (reason) => { confirmReason ??= `easyone-orchestrator: ${reason}`; };

function toplevel(dir) {
  let d = path.resolve(dir);
  while (!existsSync(d) && path.dirname(d) !== d) d = path.dirname(d);
  try { return path.resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: d, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()); }
  catch { return null; }
}

// One file can be reached by two paths: on macOS /var is /private/var, and a project folder can be opened
// through a link. git names the real one, so every path is compared by its real path. A path that does not
// exist yet resolves through its nearest folder that does.
function real(p) {
  let d = path.resolve(p);
  const rest = [];
  while (!existsSync(d) && path.dirname(d) !== d) { rest.unshift(path.basename(d)); d = path.dirname(d); }
  try { return path.join(realpathSync.native(d), ...rest); }
  catch { return path.resolve(p); }
}

// The checkout the session works in. A worktree has its own toplevel and its own branch.
const root = toplevel(cwd) ?? path.resolve(process.env.CLAUDE_PROJECT_DIR || cwd);
// Projects installed before the rename keep .orquestador.json and .orquestador/ until they migrate.
const STATE = existsSync(path.join(root, ".orchestrator.json")) || !existsSync(path.join(root, ".orquestador.json")) ? ".orchestrator" : ".orquestador";
const configPath = path.join(root, `${STATE}.json`);
if (!existsSync(configPath)) process.exit(0);

let config;
try { config = JSON.parse(stripBom(readFileSync(configPath, "utf8"))); }
catch (e) { block(`${STATE}.json is not valid JSON (${e.message}). Fix it before continuing.`); }

const git = config.git ?? {};
const protectedBranches = git.protectedBranches ?? ["main", git.integrationBranch ?? "develop"];
const broadAddBlocked = git.blockBroadAdd !== false;
// The role of this session: a Claude Code subagent carries it in agent_type. The orchestrator's own
// session has none.
const agentType = String(input.agent_type ?? "");
const inSubagent = Boolean(agentType);
// Per-role settings live in .orchestrator.json → roles, keyed by the role name without the plugin prefix.
const roleConfig = config.roles?.[agentType.split(":").pop()] ?? {};
const rolePaths = Array.isArray(roleConfig.paths) && roleConfig.paths.length ? roleConfig.paths : null;
const builderRole = BUILDER.test(agentType);
// Only builders and the roles .orchestrator.json gives paths to (a translator that owns locales/) write, and a
// role only in its paths. Every other subagent only reads, whatever its name: the plugin's reviewer, researcher
// and auditor, a project role with no paths, a general-purpose agent. A role named for judging (security-reviewer,
// ui-designer) stays read-only even with paths.
const judgeName = /(^|[:-])(reviewer|researcher|auditor|designer)$/.test(agentType);
const writerRole = builderRole || (inSubagent && !judgeName && Boolean(rolePaths));
const readOnlyRole = inSubagent && !writerRole;

// Paths are compared repo-relative, so a worktree copy of a locked file matches too.
const key = (p) => { const k = p.split(path.sep).join("/").replace(/^\.\//, ""); return WIN ? k.toLowerCase() : k; };
const relTo = (base, p) => key(path.relative(real(base), real(path.resolve(base, p))));
// Each side of a story locks its tests in its own list, .orchestrator/locked/<ID>-<side>.txt, so the
// two sides never conflict on the story branch. locked-tests.txt is still read.
const LOCK_REL = key(`${STATE}/locked-tests.txt`);
const LOCK_DIR_REL = key(`${STATE}/locked`);
const isLockList = (rel) => rel === LOCK_REL || rel === LOCK_DIR_REL || rel.startsWith(LOCK_DIR_REL + "/");
const lockFiles = [path.join(root, STATE, "locked-tests.txt"),
  ...(existsSync(path.join(root, STATE, "locked")) ? readdirSync(path.join(root, STATE, "locked")).filter((f) => f.endsWith(".txt")).map((f) => path.join(root, STATE, "locked", f)) : [])];
const lockedPaths = lockFiles.filter((f) => existsSync(f))
  .flatMap((f) => stripBom(readFileSync(f, "utf8")).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
const locked = new Set(lockedPaths.map(key));
// A directory that holds a locked file: deleting or moving it takes the file with it.
const holdsLocked = (rel) => rel === "" || [...locked].some((l) => l.startsWith(rel + "/"));
const storiesRel = config.storiesDir ? key(path.join(config.storiesDir, "stories")) + "/" : null;
const mapRel = config.storiesDir ? key(path.join(config.storiesDir, "map.md")) : null;

function currentBranch(dir) {
  try { return execFileSync("git", ["symbolic-ref", "--short", "HEAD"], { cwd: dir, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return null; }
}
function headOf(dir) {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return null; }
}

// ---------- The breaker: a builder that does not converge goes to the human
// .orchestrator/work/breaker.json is the guard's own file, personal and never committed. It holds the builder runs
// since the checkout's last commit, the role of each builder by its agent id, and, inside a run, how many times in
// a row each command failed with the same output. No agent edits it: a commit, or the human, resets it.
const BREAKER_REL = key(`${STATE}/work/breaker.json`);
const breakerPath = path.join(root, STATE, "work", "breaker.json");
const maxRuns = config.verify?.maxBuilderRuns ?? 3;
const maxSameFailure = config.verify?.maxSameFailure ?? 3;
const commandKey = (c) => String(c ?? "").replace(/\s+/g, " ").trim();
function readBreaker() {
  try { return JSON.parse(stripBom(readFileSync(breakerPath, "utf8"))); } catch { return {}; }
}
function writeBreaker(b) {
  mkdirSync(path.dirname(breakerPath), { recursive: true });
  const tmp = `${breakerPath}.${process.pid}`;
  writeFileSync(tmp, JSON.stringify(b, null, 2));
  renameSync(tmp, breakerPath);
}
// The runs count while the checkout stays on the same commit: a commit, a pull or a switch starts the count again.
function runsSinceCommit(b) {
  return b.branch === currentBranch(root) && b.head === headOf(root) ? b.runs ?? [] : [];
}
// One run of a builder, read from its transcript: it starts at the last message it was given (the brief, or the
// orchestrator's resume), and its report is the last handback or text after that. What the run was for is the
// `Change:` line of the brief that message names, or else the message's first line.
function lastRun(file) {
  let lines;
  try { lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } }); }
  catch { return { status: null, ms: null, change: null, brief: null }; }
  const said = (l) => { const c = l.message?.content; return typeof c === "string" ? c : Array.isArray(c) && c.length && c.every((x) => x.type === "text") ? c.map((x) => x.text).join("") : null; };
  const start = lines.findLastIndex((l) => l.type === "user" && said(l) !== null && !said(l).startsWith("<system-reminder>"));
  const message = start < 0 ? "" : said(lines[start]).replace(/^The coordinator sent a message while you were working:\s*/i, "");
  const brief = message.match(/[^\s"'`(]*brief-[^\s"'`)]*\.md/i)?.[0] ?? null;
  let change = null;
  try { if (brief) change = readFileSync(path.resolve(root, brief), "utf8").match(/^Change:\s*(.+)$/m)?.[1].trim() ?? null; } catch { /* no brief: the message says it */ }
  change ??= message.split(/\r?\n/).find((l) => l.trim())?.trim() ?? null;
  if (change?.length > 60) change = `${change.slice(0, 59)}…`;
  let report = null;
  for (const l of lines.slice(Math.max(start, 0))) {
    if (l.type !== "assistant" || !Array.isArray(l.message?.content)) continue;
    for (const c of l.message.content) {
      if (c.type === "tool_use" && c.name === "SubagentHandback") report = String(c.input?.message ?? "");
      else if (c.type === "text" && c.text?.trim()) report = c.text;
    }
  }
  // The report's first line is `<name>: <status>`.
  const first = String(report ?? "").trim().split(/\r?\n/)[0];
  const status = (first.includes(":") ? first.split(":").pop().trim() : first).slice(0, 40) || null;
  const began = Date.parse(lines[start]?.timestamp ?? "");
  return { status, ms: Number.isNaN(began) ? null : Date.now() - began, change, brief: brief && key(path.resolve(root, brief)) };
}

// A check pull request needs nobody (orchestrate skill, references/outside-stories.md): pushing chore/check-*
// branches, and nothing else, and merging a pull request from one into the integration branch, need no confirmation.
const CHECK_BRANCH = /^(refs\/heads\/)?chore\/check-[\w.-]+$/;
function pushesOnlyChecks(rest, dir) {
  if (rest.some((a) => a.startsWith("-") && !/^(-u|--set-upstream)$/.test(a))) return false;
  const [, ...refspecs] = rest.filter((a) => !a.startsWith("-"));
  const current = currentBranch(dir) ?? "";
  const branch = (b) => (b === "HEAD" ? current : b);
  if (!refspecs.length) return CHECK_BRANCH.test(current);
  return refspecs.every((r) => { const [src, dst = src] = r.split(":"); return CHECK_BRANCH.test(branch(src)) && CHECK_BRANCH.test(branch(dst)); });
}
// Only Bitbucket knows a pull request's branches, so ask it. Any doubt (no token, a URL built from
// variables, no answer in time) leaves the confirmation in place.
// The API base is api.bitbucket.org, or BITBUCKET_API when the command reads it (a self-hosted or simulated one).
const MERGE = /\/pullrequests\/[^/\s"']+\/merge\b/i;
async function mergesCheck(command) {
  const m = command.match(/(https?:\/\/[^\s"']+?|\$\{?BITBUCKET_API\}?)\/repositories\/([\w.-]+)\/([\w.-]+)\/pullrequests\/(\d+)\/merge/i);
  const { BITBUCKET_USER: user, BITBUCKET_TOKEN: token, BITBUCKET_API: envApi } = process.env;
  const api = m && (m[1].startsWith("$") ? envApi : m[1]);
  if (!m || !api || !user || !token) return false;
  try {
    const res = await fetch(`${api.replace(/\/$/, "")}/repositories/${m[2]}/${m[3]}/pullrequests/${m[4]}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString("base64")}`, Accept: "application/json" },
      signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const pr = await res.json();
    return CHECK_BRANCH.test(pr.source?.branch?.name ?? "") && pr.destination?.branch?.name === (git.integrationBranch ?? "develop");
  } catch { return false; }
}

// ---------- SessionStart: load the procedure

if (input.hook_event_name === "SessionStart") {
  // The project keeps no copy of the scripts: sessions run the plugin's, and the pipeline downloads them.
  const scripts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");
  const where = ` The story scripts are this plugin's: \`<scripts>\` in the skills is ${scripts}; run them from inside the repository.`;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart",
    additionalContext: `This project uses easyone-orchestrator. Load the easyone-orchestrator:orchestrate skill before any work and follow it.${where}` } }));
  process.exit(0);
}

// ---------- PreToolUse: launching or resuming a builder

// After maxBuilderRuns runs without a commit, every further run needs the human's yes: the guard asks them, and
// the model cannot answer for them. A resume starts a new run, so the builder's failures in a row start over.
if (input.hook_event_name === "PreToolUse" && ["Agent", "SendMessage"].includes(input.tool_name)) {
  const b = readBreaker();
  const to = String(input.tool_input?.to ?? "");
  const role = input.tool_name === "Agent" ? String(input.tool_input?.subagent_type ?? "") : b.agents?.[to] ?? "";
  if (!BUILDER.test(role)) process.exit(0);
  if (b.failures?.[to]) { delete b.failures[to]; writeBreaker(b); }
  if (maxRuns <= 0) process.exit(0);
  const runs = runsSinceCommit(b);
  if (runs.length < maxRuns) process.exit(0);
  const minutes = Math.round(runs.reduce((s, r) => s + (r.ms ?? 0), 0) / 60000);
  const reason = `easyone-orchestrator: ${role.split(":").pop()} lleva ${runs.length} ejecuciones sin commit en ${b.branch}: `
    + `${runs.map((r) => `${r.change ?? "?"} → ${r.status ?? "sin informe"}`).join(" · ")}${minutes ? ` (${minutes} min)` : ""}. ¿Lanzar otra?`;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse",
    permissionDecision: "ask", permissionDecisionReason: reason } }));
  process.exit(0);
}

// ---------- PostToolUseFailure: the same failure in a row, inside a builder's run

// Durations, counts and line numbers change from one attempt to the next; the failure itself does not.
if (input.hook_event_name === "PostToolUseFailure") {
  if (!["Bash", "PowerShell"].includes(input.tool_name) || input.is_interrupt || maxSameFailure <= 0) process.exit(0);
  const id = String(input.agent_id ?? "");
  const cmd = commandKey(input.tool_input?.command);
  const signature = createHash("sha1").update(String(input.error ?? "").replace(/\d+/g, "#").replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);
  const b = readBreaker();
  const mine = ((b.failures ??= {})[id] ??= {});
  mine[cmd] = { signature, times: mine[cmd]?.signature === signature ? mine[cmd].times + 1 : 1 };
  writeBreaker(b);
  process.exit(0);
}

// ---------- PreToolUse: file edits

// A builder, or a role with paths, works in its own workspace. Outside it, it writes only its report
// (.orchestrator/work/) and scratch files in the temporary folder: anything else would land in another
// checkout, out of reach of its stop checks.
const TMP = key(real(tmpdir()));
const TMP_TOKEN = /^(\/tmp\/|\$\{?(TMPDIR|TMP|TEMP)\}?[\\/]|\$env:(TMP|TEMP)[\\/])/i;
function checkWorkspace(absolute, token = "") {
  if (!writerRole) return;
  const resolved = real(absolute);
  const r = path.relative(real(root), resolved);
  if (r !== ".." && !r.startsWith(".." + path.sep) && !path.isAbsolute(r)) return;
  const k = key(resolved);
  if (k.includes(`/${key(STATE)}/work/`) || k === TMP || k.startsWith(TMP + "/") || TMP_TOKEN.test(token)) return;
  block(`${agentType} works only in its own workspace, ${root}. ${absolute} is outside it: report what needs to change there instead.`);
}

// A builder stays on its side of the contract, and a role on its deliverable: each edits only the paths its
// role lists.
function checkRolePaths(rel) {
  if (!writerRole || !rolePaths) return;
  // Outside the workspace, checkWorkspace has already decided.
  if (rel.startsWith("..") || rel.startsWith(`${key(STATE)}/work/`)) return;
  if (!rolePaths.some((a) => rel === key(a).replace(/\/$/, "") || rel.startsWith(key(a).replace(/\/$/, "") + "/"))) {
    block(`${agentType} edits only ${rolePaths.join(", ")}. ${rel} is outside them: report what needs to change there.`);
  }
}

const STORIES_OWNED = "role agents do not edit story files. Report what should change (a builder, the criterion status); the orchestrator updates them.";
const BREAKER_OWNED = `${BREAKER_REL} is the guard's own count of the builder runs. Do not change it: a commit resets it, and so can your human.`;

function checkFileWrite(rel, absolute) {
  if (rel === BREAKER_REL) block(BREAKER_OWNED);
  checkWorkspace(absolute);
  if (locked.has(rel)) block(`${rel} is a locked acceptance test. Report the problem instead of changing the test; only the orchestrator unlocks it, on the product owner's request.`);
  if (rel === mapRel) block(`${rel} is generated. Change the stories and run stories.mjs instead.`);
  if (inSubagent && isLockList(rel)) block("subagents cannot change the locked-tests lists.");
  if (writerRole && storiesRel && rel.startsWith(storiesRel)) block(STORIES_OWNED);
  checkRolePaths(rel);
  if (readOnlyRole && !key(absolute).includes(`/${STATE}/work/`)) block(`${agentType} is read-only. It writes only its report under .orchestrator/work/.`);
}

if (input.hook_event_name === "PreToolUse" && ["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(input.tool_name)) {
  const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  if (!target) process.exit(0);
  const abs = path.resolve(cwd, target);
  const base = toplevel(path.dirname(abs)) ?? root;
  checkFileWrite(relTo(base, abs), abs);
  process.exit(0);
}

// ---------- PreToolUse: shell commands

// Split a command line into simple commands. Quoted text is kept apart: it is checked
// as a command of its own only when it is itself a git or shell call (bash -c "git push").
function commands(line) {
  const quoted = [];
  const bare = line.replace(/"((?:[^"\\]|\\.)*)"|'([^']*)'/g, (_, d, s) => { quoted.push(d ?? s); return ` __Q${quoted.length - 1}__ `; });
  const restore = (t) => t.replace(/__Q(\d+)__/g, (_, i) => quoted[i]);
  const out = [];
  const nested = new Set();
  for (const seg of bare.split(/&&|\|\||;|\||\n|\$\(|`|\(|\)/)) {
    const tokens = seg.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    // Each command keeps its tokens before the quotes come back: a > inside quotes is not a redirection.
    const cmd = tokens.map(restore);
    cmd.bare = tokens;
    cmd.restore = restore;
    out.push(cmd);
    // The script a shell runs (bash -c "…", pwsh -Command "…") is commands of its own.
    if (cmd.slice(0, 3).some((t) => /^(\S*[\\/])?(bash|sh|zsh|dash|pwsh|powershell|cmd)(\.exe)?$/i.test(t))) {
      for (const t of tokens) { const q = t.match(/^__Q(\d+)__$/); if (q) nested.add(+q[1]); }
    }
  }
  quoted.forEach((q, i) => { if (/^\s*(\S*[\\/])?git(\.exe)?\s/i.test(q) || /^\s*(bash|sh|pwsh|powershell)\b/i.test(q)) nested.add(i); });
  for (const i of nested) out.push(...commands(quoted[i]));
  return out;
}

const isGit = (t) => /(^|[\\/])git(\.exe)?$/i.test(t);

// What a read-only role may run: git commands that only read. branch and remote may only list.
function readsOnly(args) {
  let i = 0;
  while (i < args.length && args[i].startsWith("-")) i += /^(-C|-c|--git-dir|--work-tree|--namespace)$/.test(args[i]) ? 2 : 1;
  const sub = (args[i] ?? "").toLowerCase();
  const rest = args.slice(i + 1);
  if (/^(status|diff|log|show|blame|grep|ls-files|rev-parse|merge-base|rev-list|cat-file|shortlog|describe)$/.test(sub)) return true;
  if (sub === "branch") {
    const changes = rest.some((a) => /^-[^-]*[dDmMcCfu]/.test(a) || /^--(delete|move|copy|force|set-upstream-to|unset-upstream|edit-description|track|no-track)/.test(a));
    const lists = rest.some((a) => /^(-l|--list|--contains|--no-contains|--merged|--no-merged|--points-at)/.test(a));
    return !changes && (lists || rest.every((a) => a.startsWith("-")));
  }
  if (sub === "remote") return !rest.length || /^(-v|--verbose|show|get-url)$/.test(rest[0]);
  return false;
}

function checkGit(args, cwd) {
  // Skip global options to find the subcommand: git -C dir -c k=v push ...
  let i = 0;
  while (i < args.length && args[i].startsWith("-")) {
    if (args[i] === "-c" && /^core\.hookspath=/i.test(args[i + 1] ?? "")) block("overriding core.hooksPath skips the project's hooks.");
    i += /^(-C|-c|--git-dir|--work-tree|--namespace)$/.test(args[i]) ? 2 : 1;
  }
  const sub = (args[i] ?? "").toLowerCase();
  const rest = args.slice(i + 1);
  const has = (re) => rest.some((a) => re.test(a));
  const dirArg = args.indexOf("-C") >= 0 ? path.resolve(cwd, args[args.indexOf("-C") + 1] ?? ".") : cwd;
  if (writerRole && !readsOnly(args)) checkWorkspace(dirArg);
  // Only the orchestrator commits, after it checks the evidence. A subagent's commit would skip that check
  // and start the breaker's count again, so no subagent runs a git command that makes or replays commits.
  if (inSubagent && ["commit", "merge", "rebase", "cherry-pick", "pull", "am", "revert"].includes(sub)) {
    block(`role agents never run git ${sub}: only the orchestrator commits, after it checks your evidence. Leave the change in the tree and report it.`);
  }

  if (sub === "push") {
    if (has(/^(--force|--force-with-lease|--force-if-includes)/) || has(/^-[a-z]*f/i) || has(/^\+/)) block("force push is blocked.");
    if (has(/^--no-verify$/)) block("--no-verify is blocked. Fix the failing hook instead.");
    if (inSubagent) block("role agents never push. Report DONE; the orchestrator pushes when the product owner asks.");
    if (git.allowPush === false && !pushesOnlyChecks(rest, dirArg)) confirm("git.allowPush is false in this project, so every push needs the product owner's confirmation.");
  }
  if (sub === "commit") {
    if (has(/^--no-verify$/) || has(/^-[a-z]*n/i)) block("skipping commit hooks is blocked. Fix the failing hook instead.");
    if (broadAddBlocked && (has(/^--all$/) || has(/^-[a-z]*a/i))) block("`git commit -a` stages everything. Stage the story's files by name.");
    const b = currentBranch(dirArg);
    if (b && protectedBranches.includes(b)) block(`commits on ${b} are blocked. Create the story branch first.`);
  }
  if (["merge", "rebase", "cherry-pick", "pull", "am", "revert"].includes(sub)) {
    const b = currentBranch(dirArg);
    // Catching up with the remote creates no commit, so `git pull --ff-only` stays allowed.
    const fastForward = ["merge", "pull"].includes(sub) && has(/^--ff-only$/);
    if (b && protectedBranches.includes(b) && !fastForward) block(`git ${sub} on ${b} is blocked: ${b} changes only through pull requests. To bring it up to date use \`git pull --ff-only\`, or branch from origin/${b}.`);
  }
  if (sub === "add" && broadAddBlocked && rest.some((a) => /^(-A|--all|-u|--update|\.|\.\/|:\/|\*)$/.test(a))) {
    block("broad `git add` is blocked. Stage the story's files by name.");
  }
  if (sub === "reset" && has(/^--hard$/)) block("git reset --hard is blocked. It discards work.");
  if (sub === "clean" && has(/^-[a-z]*f/i)) block("git clean -f is blocked. It deletes untracked files.");
  if ((sub === "checkout" || sub === "restore") && rest.some((a) => a === "." || a === ":/")) block(`git ${sub} . discards every uncommitted change. Name the files instead.`);
  // Restoring a locked file to HEAD is how a role undoes a change to it, so that stays allowed.
  const toHead = (sub === "restore" && !has(/^(-s|--source)/))
    || (sub === "checkout" && rest.includes("--") && rest.slice(0, rest.indexOf("--")).every((a) => /^HEAD$/i.test(a)));
  if (["rm", "mv"].includes(sub)) checkPaths(sub === "mv" ? rest.slice(0, -1) : rest, dirArg, true);
  if (["rm", "mv", "checkout", "restore"].includes(sub) && !toHead) checkPaths(rest, dirArg);
}

const WRITERS = /^(rm|del|erase|rmdir|mv|move|cp|copy|tee|sed|truncate|remove-item|move-item|copy-item|set-content|add-content|out-file|clear-content|new-item)$/i;

// The arguments a writer command may write. sed writes only in place (-i), and its script is not a file:
// `sed -n '/Running/,/at D:/p' log` reads, and its expression must not be taken for a path.
function writtenArgs(tokens) {
  const args = tokens.slice(1);
  if (!/^sed$/i.test(tokens[0])) return args;
  if (!args.some((a) => /^--in-place/.test(a) || /^-[a-zA-Z]*i/.test(a))) return [];
  const files = [];
  let script = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (/^(-e|-f|--expression|--file)$/.test(a)) { script = true; i++; continue; }
    if (/^(--expression=|--file=)/.test(a)) { script = true; continue; }
    if (a.startsWith("-")) continue;
    if (!script) { script = true; continue; }
    files.push(a);
  }
  return files;
}
const REMOVERS = /^(rm|del|erase|rmdir|rd|mv|move|remove-item|move-item|ri|mi)$/i;

function checkPaths(tokens, dir, removes = false) {
  const base = toplevel(dir) ?? root;
  for (const t of tokens) {
    const p = t.replace(/^[<>]+/, "").replace(/^(-\w+:)/, "");
    if (!p || p.startsWith("-")) continue;
    const rel = relTo(base, path.resolve(dir, p));
    if (rel === BREAKER_REL || (removes && rel !== "" && BREAKER_REL.startsWith(rel + "/"))) block(BREAKER_OWNED);
    if (locked.has(rel)) block(`${rel} is a locked acceptance test. It cannot be changed, moved or deleted.`);
    if (removes && !rel.startsWith("..") && holdsLocked(rel)) block(`${rel || "."} holds locked acceptance tests. It cannot be moved or deleted.`);
    if (inSubagent && isLockList(rel)) block("subagents cannot change the locked-tests lists.");
    if (writerRole && storiesRel && rel.startsWith(storiesRel)) block(STORIES_OWNED);
    if (rel === mapRel) block(`${rel} is generated. Change the stories and run stories.mjs instead.`);
  }
}

if (input.hook_event_name === "PreToolUse" && ["Bash", "PowerShell"].includes(input.tool_name)) {
  if (builderRole && maxSameFailure > 0) {
    const cmd = commandKey(input.tool_input?.command);
    const failed = readBreaker().failures?.[String(input.agent_id ?? "")]?.[cmd];
    if (failed?.times >= maxSameFailure) block(`\`${cmd.slice(0, 200)}\` failed ${failed.times} times in a row with the same output. Do not run it again: stop and report BLOCKED with that output and what you tried.`);
  }
  const cmds = commands(String(input.tool_input?.command ?? "").replace(/\d*>&\d/g, " "));
  // The branch check reads HEAD before the command runs, so a switch and a commit must not share a command.
  const gitSubs = cmds.filter((c) => isGit(c[0]) || isGit(c[1] ?? "")).map((c) => c.join(" ").toLowerCase());
  if (gitSubs.some((c) => /\s(switch|checkout)\s/.test(c + " ")) && gitSubs.some((c) => /\scommit(\s|$)/.test(c))) {
    block("run the branch switch and the commit as separate commands.");
  }
  // A cd earlier in the line moves where the later relative paths point: `cd apps/panel/src && echo x > a.ts`.
  let here = cwd;
  const merges = [];
  for (const raw of cmds) {
    // Strip wrappers and VAR=value prefixes: `HUSKY=0 git commit` is still a git commit.
    let s = 0;
    while (s < raw.length && (/^(rtk|sudo|command|exec|env|nohup|time|&)$/i.test(raw[s]) || /^\$?(env:)?[A-Za-z_]\w*=/.test(raw[s]))) {
      if (/^\$?(env:)?HUSKY=0/i.test(raw[s])) block("HUSKY=0 skips the commit hooks. Fix the failing hook instead.");
      s++;
    }
    const tokens = raw.slice(s);
    if (!tokens.length) continue;
    if (/^(cd|pushd|chdir|set-location|sl)$/i.test(tokens[0])) {
      const dest = tokens.slice(1).find((t) => !t.startsWith("-"));
      if (dest && dest !== "~" && !dest.startsWith("~/")) here = path.resolve(here, dest);
      else if (dest) here = path.join(homedir(), dest.slice(1));
      continue;
    }
    if (isGit(tokens[0])) {
      if (readOnlyRole && !readsOnly(tokens.slice(1))) block(`${agentType} is read-only. It may only run git commands that read.`);
      checkGit(tokens.slice(1), here);
      continue;
    }
    // Bitbucket has no official CLI: a merge is a POST to the pull request's /merge endpoint, on whatever
    // host or variable the URL is built from. The id may come from a variable; then the merge is still a merge.
    if (tokens.some((t) => MERGE.test(t))) {
      if (inSubagent) block("role agents never merge. The product owner merges, or asks the orchestrator to.");
      if (git.allowPush === false) merges.push(tokens.join(" "));
    }
    // Redirections write too: split "x>file" and "> file" into their own tokens. Only the unquoted text is
    // read, so `node -e "a => a"` and `grep "a > b"` are not redirections; a quoted target comes back whole.
    const bareTokens = (raw.bare ?? raw).slice(s);
    const split = bareTokens.flatMap((t) => t.split(/(>>?)/)).filter(Boolean);
    const redirTargets = split.filter((t, i) => i > 0 && /^>>?$/.test(split[i - 1])).map((t) => (raw.restore ? raw.restore(t) : t));
    const written = WRITERS.test(tokens[0]) ? writtenArgs(tokens) : [];
    if (written.length) checkPaths(written, here);
    if (REMOVERS.test(tokens[0])) checkPaths(/^(mv|move|move-item|mi)$/i.test(tokens[0]) ? tokens.slice(1, -1) : tokens.slice(1), here, true);
    if (redirTargets.length) checkPaths(redirTargets, here);
    const notNull = (t) => !/^&?\d*$/.test(t) && !/^\/dev\/null$|^\$null$|^nul$/i.test(t);
    const targets = [...written.filter((t) => !t.startsWith("-")), ...redirTargets].filter(notNull);
    for (const t of targets) checkWorkspace(path.resolve(here, t), t);
    for (const t of redirTargets.filter((t) => notNull(t) && !TMP_TOKEN.test(t))) checkRolePaths(relTo(toplevel(here) ?? root, path.resolve(here, t)));
    if (readOnlyRole) {
      const outside = targets.find((t) => !key(path.resolve(here, t)).includes(`/${STATE}/work/`));
      if (outside) block(`${agentType} is read-only. It writes only its report under .orchestrator/work/ (not ${outside}).`);
    }
  }
  for (const m of merges) if (!(await mergesCheck(m))) confirm("git.allowPush is false in this project, so every merge needs the product owner's confirmation.");
  if (confirmReason) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse",
    permissionDecision: "ask", permissionDecisionReason: confirmReason } }));
  process.exit(0);
}

// ---------- SubagentStop: the builder does not stop on red, and no writing agent leaves its paths

if (input.hook_event_name === "SubagentStop") {
  if (!writerRole) process.exit(0);
  // Count the run before any check below can send the builder back: the stop after that retry is the same run.
  if (builderRole) {
    const b = readBreaker();
    const id = String(input.agent_id ?? "");
    const branch = currentBranch(root), head = headOf(root);
    if (b.branch !== branch || b.head !== head) Object.assign(b, { branch, head, runs: [] });
    (b.agents ??= {})[id] = agentType;
    const runs = (b.runs ??= []);
    const last = runs.findLast((r) => r.agent === id);
    const now = lastRun(input.agent_transcript_path);
    if (input.stop_hook_active && last) Object.assign(last, now, { change: last.change });
    else {
      // The same brief sent again is a second try at the same work, not new work.
      if (now.brief && last?.brief === now.brief && now.change) now.change += " (de nuevo)";
      runs.push({ agent: id, role: agentType.split(":").pop(), ...now, at: new Date().toISOString() });
    }
    writeBreaker(b);
  }
  // Content, not command shape: whatever tool changed a locked file, the story files or the lock
  // list, the difference from HEAD shows it. The builder shares the orchestrator's checkout, so a change
  // there may be the orchestrator's own: the agent restores only what it changed, and says the rest.
  const spec = (list) => list.map((p) => (WIN ? `:(icase)${p}` : p));
  const lockSet = spec([...lockedPaths, `${STATE}/locked-tests.txt`, `${STATE}/locked`]);
  const run = (a) => { try { return execFileSync("git", a, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };
  const names = (a) => run(a).split(/\r?\n/).filter(Boolean);
  const changed = names(["diff", "--name-only", "HEAD", "--", ...lockSet, ...spec(storiesRel ? [storiesRel, mapRel] : [])]);
  if (changed.length && !input.stop_hook_active) block(`these locked or orchestrator-owned files differ from HEAD: ${changed.join(", ")}. Restore the ones you changed with \`git restore <file>\` and report what you needed to change them for. Do not restore the ones you did not change: name them in your report.`);
  // A commit made through an interpreter leaves the tree equal to HEAD. The orchestrator commits each
  // lock, so the last commit that touched the lock list is the base the locked files must still match.
  // Only this branch's own commits count: a change that came from the integration branch is not the agent's.
  const base = run(["log", "-1", "--format=%H", "--", `${STATE}/locked-tests.txt`, `${STATE}/locked`]);
  const integration = `refs/remotes/origin/${git.integrationBranch ?? "develop"}`;
  const own = run(["rev-parse", "--verify", "--quiet", integration]) ? ["--not", integration] : [];
  const committed = base ? [...new Set(names(["log", "--no-merges", "--format=", "--name-only", `${base}..HEAD`, ...own, "--", ...lockSet]))] : [];
  if (committed.length && !input.stop_hook_active) block(`locked files were committed after the lock (${base.slice(0, 7)}): ${committed.join(", ")}. Do not undo it yourself. Report BLOCKED and name these files and the commit.`);
  // Files someone else changed would trap the builder, so this check gives one retry, then lets it report.
  if (!input.stop_hook_active && rolePaths) {
    const inside = (f) => rolePaths.some((a) => { const d = key(a).replace(/\/$/, ""); return f === d || f.startsWith(d + "/"); });
    const touched = [...names(["diff", "--name-only", "HEAD"]), ...names(["ls-files", "--others", "--exclude-standard"])]
      .map(key).filter((f) => !f.startsWith(`${key(STATE)}/`) && !inside(f));
    if (touched.length) block(`${agentType} edits only ${rolePaths.join(", ")}, and these files outside them differ from HEAD: ${touched.join(", ")}. Restore the ones you changed with \`git restore <file>\` (or delete them if new) and report what needs to change there. If you did not change them, say so in your report.`);
  }
  if (input.stop_hook_active) process.exit(0); // One retry for the verification commands; then the agent reports honestly.
  const deadline = Date.now() + 1000 * 1000; // Stay inside the hook timeout in hooks.json.
  for (const c of roleConfig.onStop ?? (builderRole ? config.verify?.onBuilderStop : null) ?? []) {
    const left = deadline - Date.now();
    if (left <= 0) block("the verification checks ran out of time. Report the unchecked commands as ⚠️.");
    try { execSync(c, { cwd: root, stdio: ["ignore", "pipe", "pipe"], timeout: left, maxBuffer: 64 * 1024 * 1024 }); }
    catch (e) {
      const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.split(/\r?\n/).slice(-40).join("\n");
      block(`\`${c}\` failed. Fix it, or report it as ❌ with this output:\n${out}`);
    }
  }
  process.exit(0);
}

process.exit(0);
