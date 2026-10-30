#!/usr/bin/env node
// easyone-orchestrator guard. Claude Code hook for SessionStart, PreToolUse and SubagentStop.
// Inert unless the repository has .orchestrator.json at its root.
// Exit 0 = allow. Exit 2 = block; stderr goes back to Claude. Exit 0 with permissionDecision "ask" on
// stdout = Claude Code asks the human to confirm.

import { execFileSync, execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WIN = process.platform === "win32";
const stripBom = (s) => s.replace(/^﻿/, "");
const input = JSON.parse(stripBom(readFileSync(0, "utf8")) || "{}");
const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

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
// Every role that only judges or reads ends in reviewer, researcher, auditor or designer, the project's
// own too (security-reviewer).
const readOnlyRole = /(^|[:-])(reviewer|researcher|auditor|designer)$/.test(agentType);
// Every role that writes code ends in -builder: backend-builder, frontend-builder.
const builderRole = /(^|:)([a-z0-9]+-)*builder$/.test(agentType);
// Per-role settings live in .orchestrator.json → roles, keyed by the role name without the plugin prefix.
const roleConfig = config.roles?.[agentType.split(":").pop()] ?? {};

// Paths are compared repo-relative, so a worktree copy of a locked file matches too.
const key = (p) => { const k = p.split(path.sep).join("/").replace(/^\.\//, ""); return WIN ? k.toLowerCase() : k; };
const relTo = (base, p) => key(path.relative(base, path.resolve(base, p)));
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

// ---------- PreToolUse: file edits

// A builder works in its own workspace. Outside it, it writes only its report (.orchestrator/work/) and
// scratch files in the temporary folder: anything else would land in another checkout, out of reach
// of its stop checks.
const TMP = key(path.resolve(tmpdir()));
const TMP_TOKEN = /^(\/tmp\/|\$\{?(TMPDIR|TMP|TEMP)\}?[\\/]|\$env:(TMP|TEMP)[\\/])/i;
function checkWorkspace(absolute, token = "") {
  if (!builderRole) return;
  const r = path.relative(root, absolute);
  if (r !== ".." && !r.startsWith(".." + path.sep) && !path.isAbsolute(r)) return;
  const k = key(absolute);
  if (k.includes(`/${key(STATE)}/work/`) || k === TMP || k.startsWith(TMP + "/") || TMP_TOKEN.test(token)) return;
  block(`${agentType} works only in its own workspace, ${root}. ${absolute} is outside it: report what needs to change there instead.`);
}

// A builder stays on its side of the contract: it edits only the paths its role lists.
function checkRolePaths(rel) {
  const allowed = roleConfig.paths;
  if (!builderRole || !Array.isArray(allowed) || !allowed.length) return;
  // Outside the workspace, checkWorkspace has already decided.
  if (rel.startsWith("..") || rel.startsWith(`${key(STATE)}/work/`)) return;
  if (!allowed.some((a) => rel === key(a).replace(/\/$/, "") || rel.startsWith(key(a).replace(/\/$/, "") + "/"))) {
    block(`${agentType} edits only ${allowed.join(", ")}. ${rel} is outside its side of the contract: report what the other side needs to change.`);
  }
}

function checkFileWrite(rel, absolute) {
  checkWorkspace(absolute);
  if (locked.has(rel)) block(`${rel} is a locked acceptance test. Report the problem instead of changing the test; only the orchestrator unlocks it, on the product owner's request.`);
  if (rel === mapRel) block(`${rel} is generated. Change the stories and run stories.mjs instead.`);
  if (inSubagent && isLockList(rel)) block("subagents cannot change the locked-tests lists.");
  if (builderRole && storiesRel && rel.startsWith(storiesRel)) block("the builder does not edit story files. Report the criterion status; the orchestrator updates the markers.");
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
  if (builderRole && !readsOnly(args)) checkWorkspace(dirArg);

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
    // A role must not commit a change to a locked file: the Stop check compares against HEAD.
    if (inSubagent) {
      let staged = [];
      try { staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: dirArg, stdio: ["ignore", "pipe", "ignore"] }).toString().split(/\r?\n/).filter(Boolean).map(key); }
      catch { /* not a repository: nothing staged */ }
      const hit = staged.find((f) => locked.has(f) || isLockList(f));
      if (hit) block(`${hit} is locked. Unstage it; only the orchestrator commits changes to locked files.`);
    }
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
    if (locked.has(rel)) block(`${rel} is a locked acceptance test. It cannot be changed, moved or deleted.`);
    if (removes && !rel.startsWith("..") && holdsLocked(rel)) block(`${rel || "."} holds locked acceptance tests. It cannot be moved or deleted.`);
    if (inSubagent && isLockList(rel)) block("subagents cannot change the locked-tests lists.");
    if (builderRole && storiesRel && rel.startsWith(storiesRel)) block("the builder does not edit story files. Report the criterion status; the orchestrator updates the markers.");
    if (rel === mapRel) block(`${rel} is generated. Change the stories and run stories.mjs instead.`);
  }
}

if (input.hook_event_name === "PreToolUse" && ["Bash", "PowerShell"].includes(input.tool_name)) {
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

// ---------- SubagentStop: the builder does not stop on red

if (input.hook_event_name === "SubagentStop") {
  if (!builderRole) process.exit(0);
  // Content, not command shape: whatever tool changed a locked file, the story files or the lock
  // list, the difference from HEAD shows it. The builder shares the orchestrator's checkout, so a change
  // there may be the orchestrator's own: the builder restores only what it changed, and says the rest.
  const spec = (list) => list.map((p) => (WIN ? `:(icase)${p}` : p));
  const lockSet = spec([...lockedPaths, `${STATE}/locked-tests.txt`, `${STATE}/locked`]);
  const run = (a) => { try { return execFileSync("git", a, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };
  const names = (a) => run(a).split(/\r?\n/).filter(Boolean);
  const changed = names(["diff", "--name-only", "HEAD", "--", ...lockSet, ...spec(storiesRel ? [storiesRel, mapRel] : [])]);
  if (changed.length && !input.stop_hook_active) block(`these locked or orchestrator-owned files differ from HEAD: ${changed.join(", ")}. Restore the ones you changed with \`git restore <file>\` and report what you needed to change them for. Do not restore the ones you did not change: name them in your report.`);
  // A commit made through an interpreter leaves the tree equal to HEAD. The orchestrator commits each
  // lock, so the last commit that touched the lock list is the base the locked files must still match.
  // Only this branch's own commits count: a change that came from the integration branch is not the builder's.
  const base = run(["log", "-1", "--format=%H", "--", `${STATE}/locked-tests.txt`, `${STATE}/locked`]);
  const integration = `refs/remotes/origin/${git.integrationBranch ?? "develop"}`;
  const own = run(["rev-parse", "--verify", "--quiet", integration]) ? ["--not", integration] : [];
  const committed = base ? [...new Set(names(["log", "--no-merges", "--format=", "--name-only", `${base}..HEAD`, ...own, "--", ...lockSet]))] : [];
  if (committed.length && !input.stop_hook_active) block(`locked files were committed after the lock (${base.slice(0, 7)}): ${committed.join(", ")}. Do not undo it yourself. Report BLOCKED and name these files and the commit.`);
  // Files someone else changed would trap the builder, so this check gives one retry, then lets it report.
  if (!input.stop_hook_active && Array.isArray(roleConfig.paths) && roleConfig.paths.length) {
    const inside = (f) => roleConfig.paths.some((a) => { const d = key(a).replace(/\/$/, ""); return f === d || f.startsWith(d + "/"); });
    const touched = [...names(["diff", "--name-only", "HEAD"]), ...names(["ls-files", "--others", "--exclude-standard"])]
      .map(key).filter((f) => !f.startsWith(`${key(STATE)}/`) && !inside(f));
    if (touched.length) block(`${agentType} edits only ${roleConfig.paths.join(", ")}, and these files outside them differ from HEAD: ${touched.join(", ")}. Restore the ones you changed with \`git restore <file>\` (or delete them if new) and report what the other side needs. If you did not change them, say so in your report.`);
  }
  if (input.stop_hook_active) process.exit(0); // One retry for the verification commands; then the builder reports honestly.
  const deadline = Date.now() + 1000 * 1000; // Stay inside the hook timeout in hooks.json.
  for (const c of roleConfig.onStop ?? config.verify?.onBuilderStop ?? []) {
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
