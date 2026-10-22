#!/usr/bin/env node
// orquestador guard. Claude Code hook for SessionStart, PreToolUse and SubagentStop.
// Inert unless the repository has .orquestador.json at its root.
// Exit 0 = allow. Exit 2 = block; stderr goes back to Claude.

import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const WIN = process.platform === "win32";
const stripBom = (s) => s.replace(/^﻿/, "");
const input = JSON.parse(stripBom(readFileSync(0, "utf8")) || "{}");
const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

function block(reason) {
  process.stderr.write(`orquestador: ${reason}\n`);
  process.exit(2);
}

function toplevel(dir) {
  let d = path.resolve(dir);
  while (!existsSync(d) && path.dirname(d) !== d) d = path.dirname(d);
  try { return path.resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: d, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()); }
  catch { return null; }
}

// The checkout the session works in. A worktree has its own toplevel and its own branch.
const root = toplevel(cwd) ?? path.resolve(process.env.CLAUDE_PROJECT_DIR || cwd);
const configPath = path.join(root, ".orquestador.json");
if (!existsSync(configPath)) process.exit(0);

let config;
try { config = JSON.parse(stripBom(readFileSync(configPath, "utf8"))); }
catch (e) { block(`.orquestador.json is not valid JSON (${e.message}). Fix it before continuing.`); }

const git = config.git ?? {};
const protectedBranches = git.protectedBranches ?? ["main", "master"];
const broadAddBlocked = git.blockBroadAdd !== false;
// The role of this session. A Claude Code subagent carries it in agent_type. An Orca worker is a
// whole session and carries none, so the orchestrator declares it in the worker's own workspace.
function declaredRole() {
  const file = path.join(root, ".orquestador", "role.json");
  if (!existsSync(file)) return "";
  // A role file in the main checkout would gag the orchestrator. Only a linked worktree, or a
  // workspace with no git at all, can be a worker's own.
  try {
    const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (!gitDir.split(path.sep).join("/").includes("/worktrees/")) return "";
  } catch { /* folder workspace: nothing to compare, trust the file */ }
  let role;
  try { role = JSON.parse(stripBom(readFileSync(file, "utf8"))); }
  catch (e) { block(`.orquestador/role.json is not valid JSON (${e.message}). Fix it or delete it.`); }
  // A copy that travelled with the branch names someone else's workspace. Ignore it.
  if (role.workspace && path.resolve(role.workspace) !== root) return "";
  return String(role.role ?? "");
}

const agentType = String(input.agent_type ?? "") || declaredRole();
const inSubagent = Boolean(agentType);
const isRole = (r) => new RegExp(`(^|:)${r}$`).test(agentType);
const readOnlyRole = ["reviewer", "researcher", "designer"].some(isRole);

// Paths are compared repo-relative, so a worktree copy of a locked file matches too.
const key = (p) => { const k = p.split(path.sep).join("/").replace(/^\.\//, ""); return WIN ? k.toLowerCase() : k; };
const relTo = (base, p) => key(path.relative(base, path.resolve(base, p)));
const LOCK_REL = key(".orquestador/locked-tests.txt");
const lockFile = path.join(root, ".orquestador", "locked-tests.txt");
const lockedPaths = existsSync(lockFile)
  ? stripBom(readFileSync(lockFile, "utf8")).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  : [];
const locked = new Set(lockedPaths.map(key));
// A directory that holds a locked file: deleting or moving it takes the file with it.
const holdsLocked = (rel) => rel === "" || [...locked].some((l) => l.startsWith(rel + "/"));
const storiesRel = config.storiesDir ? key(path.join(config.storiesDir, "stories")) + "/" : null;
const mapRel = config.storiesDir ? key(path.join(config.storiesDir, "map.md")) : null;

function currentBranch(dir) {
  try { return execFileSync("git", ["symbolic-ref", "--short", "HEAD"], { cwd: dir, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return null; }
}

// ---------- SessionStart: load the procedure

if (input.hook_event_name === "SessionStart") {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart",
    additionalContext: "This project uses orquestador. Load the orquestador:orchestrate skill before any work and follow it." } }));
  process.exit(0);
}

// ---------- PreToolUse: file edits

function checkFileWrite(rel, absolute) {
  if (locked.has(rel)) block(`${rel} is a locked acceptance test. Report the problem instead of changing the test; only the orchestrator unlocks it, on the product owner's request.`);
  if (rel === mapRel) block(`${rel} is generated. Change the stories and run stories.mjs instead.`);
  if (inSubagent && rel === LOCK_REL) block("subagents cannot change the locked-tests list.");
  if (isRole("builder") && storiesRel && rel.startsWith(storiesRel)) block("the builder does not edit story files. Report the criterion status; the orchestrator updates the markers.");
  if (readOnlyRole && !key(absolute).includes("/.orquestador/work/")) block(`${agentType} is read-only. It writes only its report under .orquestador/work/.`);
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
  const out = [];
  for (const seg of bare.split(/&&|\|\||;|\||\n|\$\(|`|\(|\)/)) {
    const tokens = seg.trim().split(/\s+/).filter(Boolean);
    if (tokens.length) out.push(tokens.map((t) => t.replace(/__Q(\d+)__/g, (_, i) => quoted[i])));
  }
  for (const q of quoted) if (/^\s*(\S*[\\/])?git(\.exe)?\s/i.test(q) || /^\s*(bash|sh|pwsh|powershell)\b/i.test(q)) out.push(...commands(q));
  return out;
}

const isGit = (t) => /(^|[\\/])git(\.exe)?$/i.test(t);

function checkGit(args) {
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

  if (sub === "push") {
    if (has(/^(--force|--force-with-lease|--force-if-includes)/) || has(/^-[a-z]*f/i) || has(/^\+/)) block("force push is blocked.");
    if (has(/^--no-verify$/)) block("--no-verify is blocked. Fix the failing hook instead.");
    if (!git.allowPush) block("git push is blocked. Ask the product owner to push, or to run it with `! git push`.");
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
      const hit = staged.find((f) => locked.has(f) || f === LOCK_REL);
      if (hit) block(`${hit} is locked. Unstage it; only the orchestrator commits changes to locked files.`);
    }
  }
  if (["merge", "rebase", "cherry-pick", "pull", "am", "revert"].includes(sub)) {
    const b = currentBranch(dirArg);
    if (b && protectedBranches.includes(b)) block(`git ${sub} on ${b} is blocked. Merging into ${b} happens only on the product owner's request.`);
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
const REMOVERS = /^(rm|del|erase|rmdir|rd|mv|move|remove-item|move-item|ri|mi)$/i;

function checkPaths(tokens, dir, removes = false) {
  const base = toplevel(dir) ?? root;
  for (const t of tokens) {
    const p = t.replace(/^[<>]+/, "").replace(/^(-\w+:)/, "");
    if (!p || p.startsWith("-")) continue;
    const rel = relTo(base, path.resolve(dir, p));
    if (locked.has(rel)) block(`${rel} is a locked acceptance test. It cannot be changed, moved or deleted.`);
    if (removes && !rel.startsWith("..") && holdsLocked(rel)) block(`${rel || "."} holds locked acceptance tests. It cannot be moved or deleted.`);
    if (inSubagent && rel === LOCK_REL) block("subagents cannot change the locked-tests list.");
    if (isRole("builder") && storiesRel && rel.startsWith(storiesRel)) block("the builder does not edit story files. Report the criterion status; the orchestrator updates the markers.");
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
  for (const raw of cmds) {
    // Strip wrappers and VAR=value prefixes: `HUSKY=0 git commit` is still a git commit.
    let s = 0;
    while (s < raw.length && (/^(rtk|sudo|command|exec|env|nohup|time|&)$/i.test(raw[s]) || /^\$?(env:)?[A-Za-z_]\w*=/.test(raw[s]))) {
      if (/^\$?(env:)?HUSKY=0/i.test(raw[s])) block("HUSKY=0 skips the commit hooks. Fix the failing hook instead.");
      s++;
    }
    const tokens = raw.slice(s);
    if (!tokens.length) continue;
    if (isGit(tokens[0])) {
      if (readOnlyRole && !/^(status|diff|log|show|blame|grep|ls-files|rev-parse|branch|remote)$/i.test(tokens.find((t, i) => i > 0 && !t.startsWith("-")) ?? "")) block(`${agentType} is read-only. It may only run git commands that read.`);
      checkGit(tokens.slice(1));
      continue;
    }
    if (/^gh$/i.test(tokens[0]) && /^pr$/i.test(tokens[1] ?? "") && /^merge$/i.test(tokens[2] ?? "") && !git.allowPush) block("gh pr merge is blocked. The product owner merges.");
    // Redirections write too: split "x>file" and "> file" into their own tokens.
    const split = tokens.flatMap((t) => t.split(/(>>?)/)).filter(Boolean);
    const redirTargets = split.filter((t, i) => i > 0 && /^>>?$/.test(split[i - 1]));
    if (WRITERS.test(tokens[0])) checkPaths(tokens.slice(1), cwd);
    if (REMOVERS.test(tokens[0])) checkPaths(/^(mv|move|move-item|mi)$/i.test(tokens[0]) ? tokens.slice(1, -1) : tokens.slice(1), cwd, true);
    if (redirTargets.length) checkPaths(redirTargets, cwd);
    if (readOnlyRole) {
      const targets = [...(WRITERS.test(tokens[0]) ? tokens.slice(1).filter((t) => !t.startsWith("-")) : []), ...redirTargets]
        .filter((t) => !/^&?\d*$/.test(t) && !/^\/dev\/null$|^\$null$|^nul$/i.test(t));
      const outside = targets.find((t) => !key(path.resolve(cwd, t)).includes("/.orquestador/work/"));
      if (outside) block(`${agentType} is read-only. It writes only its report under .orquestador/work/ (not ${outside}).`);
    }
  }
  process.exit(0);
}

// ---------- Stop and SubagentStop: the builder does not stop on red
// SubagentStop fires for a Claude Code subagent; Stop fires at the end of a turn, which is how an
// Orca worker finishes. In the orchestrator's own session there is no role, so Stop exits at once.

if (input.hook_event_name === "SubagentStop" || input.hook_event_name === "Stop") {
  if (!isRole("builder")) process.exit(0);
  // Content, not command shape: whatever tool changed a locked file, the story files or the lock
  // list, the difference from HEAD shows it. This check ignores stop_hook_active: the builder
  // restores the files (git restore <file>) or stops for good only by reporting BLOCKED.
  const spec = (list) => list.map((p) => (WIN ? `:(icase)${p}` : p));
  const lockSet = spec([...lockedPaths, ".orquestador/locked-tests.txt"]);
  const run = (a) => { try { return execFileSync("git", a, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };
  const names = (a) => run(a).split(/\r?\n/).filter(Boolean);
  const changed = names(["diff", "--name-only", "HEAD", "--", ...lockSet, ...spec(storiesRel ? [storiesRel, mapRel] : [])]);
  if (changed.length) block(`these locked or orchestrator-owned files differ from HEAD: ${changed.join(", ")}. Restore them with \`git restore <file>\`, then report what you needed to change them for.`);
  // A commit made through an interpreter leaves the tree equal to HEAD. The orchestrator commits each
  // lock, so the last commit that touched the lock list is the base the locked files must still match.
  const base = run(["log", "-1", "--format=%H", "--", ".orquestador/locked-tests.txt"]);
  const committed = base ? names(["diff", "--name-only", base, "HEAD", "--", ...lockSet]) : [];
  if (committed.length && !input.stop_hook_active) block(`locked files were committed after the lock (${base.slice(0, 7)}): ${committed.join(", ")}. Do not undo it yourself. Report BLOCKED and name these files and the commit.`);
  if (input.stop_hook_active) process.exit(0); // One retry for the verification commands; then the builder reports honestly.
  const deadline = Date.now() + 1000 * 1000; // Stay inside the hook timeout in hooks.json.
  for (const c of config.verify?.onBuilderStop ?? []) {
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
