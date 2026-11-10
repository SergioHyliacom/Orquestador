#!/usr/bin/env node
// Read-only bridge to the design repo (Sydney's front-sydser).
// It never writes in the design repo's files and never writes in the project's repo either: its config and its
// record of what was ported live in the Claude config folder of THIS machine (CLAUDE_CONFIG_DIR, or ~/.claude),
// because the path to the design repo differs per machine and nothing about it may travel with the project.
//
//   <claude dir>/easyone-design-source.json         { "path": "D:\...\front-sydser", "storiesDir": "producto" }
//   <claude dir>/easyone-design-source.ledger.json  what was ported, and at which design
//   (DESIGN_SOURCE_CONFIG=<file> points to another config file; its ledger sits next to it)
//
//   node design-source.mjs --init <path> [<storiesDir>]  write the config of this machine
//   node design-source.mjs --sync                 git fetch --tags in the design repo (the lock tags are often only on the remote)
//   node design-source.mjs --list                 stories of the design repo, with lock tag and screens
//   node design-source.mjs --show <ID>            story text + lock tag + screenshots + files that implement it
//   node design-source.mjs --record <ID>          note that <ID> was ported at the current lock tag
//   node design-source.mjs --drift [<ID>]         ported stories whose design changed afterwards
//
// Exit code 1 on --drift when something drifted, so /que-hago can use it.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const fail = (m) => { console.error(`design-source: ${m}`); process.exit(2); };
const cfgFile = process.env.DESIGN_SOURCE_CONFIG
  ?? path.join(process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude"), "easyone-design-source.json");
const ledgerFile = cfgFile.replace(/\.json$/, ".ledger.json");
const [cmd, arg, arg2] = process.argv.slice(2);

if (cmd === "--init") {
  if (!arg) fail("usage: --init <path to the design repo> [<storiesDir>]");
  if (!existsSync(path.join(arg, ".git"))) fail(`${arg} is not a git repository: clone it first.`);
  mkdirSync(path.dirname(cfgFile), { recursive: true });
  writeFileSync(cfgFile, JSON.stringify({ path: path.resolve(arg), storiesDir: arg2 ?? "producto" }, null, 2) + "\n");
  console.log(`config written: ${cfgFile}`);
  process.exit(0);
}

if (!existsSync(cfgFile)) fail(`no config on this machine. Run: node design-source.mjs --init <path to the design repo>  (writes ${cfgFile})`);
const ds = JSON.parse(readFileSync(cfgFile, "utf8"));
const repo = ds.path;
if (!repo || !existsSync(path.join(repo, ".git"))) fail(`${repo} is not a git repository: clone it on this machine or run --init with the right path.`);
const dir = path.join(repo, ds.storiesDir ?? "producto");

const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const gitOk = (...a) => { try { return git(...a); } catch { return ""; } };

function walk(d, out = []) {
  if (!existsSync(d)) return out;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

function stories() {
  const files = walk(path.join(dir, "stories")).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const text = readFileSync(f, "utf8");
    const fm = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
    const get = (k) => new RegExp(`^${k}:\\s*(.*)$`, "m").exec(fm)?.[1]?.trim();
    return { id: get("id"), title: get("title"), discarded: get("discarded") === "true", file: f, text };
  }).filter((s) => s.id);
}

// Lock tag: lock/<ID>-<screen>. Several screens -> several tags.
// Fallback when the tag is missing: the last commit that touched producto/pantallas/<ID>/.
const locks = (id) => {
  const tags = gitOk("tag", "-l", `lock/${id}-*`).split("\n").filter(Boolean)
    .map((tag) => ({ tag, sha: git("rev-list", "-n", "1", tag) }));
  if (tags.length) return tags;
  const rel = path.posix.join(ds.storiesDir ?? "producto", "pantallas", id);
  const sha = gitOk("log", "-n", "1", "--format=%H", "--", rel);
  return sha ? [{ tag: `pantallas/${id}`, sha }] : [];
};
const screens = (id) => walk(path.join(dir, "pantallas", id)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const hash = (t) => createHash("sha256").update(t).digest("hex").slice(0, 16);

const readLedger = () => (existsSync(ledgerFile) ? JSON.parse(readFileSync(ledgerFile, "utf8")) : {});
const find = (id) => stories().find((s) => s.id === id) ?? fail(`story ${id} not found in ${dir}.`);

if (cmd === "--sync") {
  execFileSync("git", ["-C", repo, "fetch", "--tags", "--quiet", "origin"], { stdio: "inherit" });
  const behind = gitOk("rev-list", "--count", "HEAD..@{u}");
  console.log(`fetched. ${gitOk("tag", "-l", "lock/*").split("\n").filter(Boolean).length} lock tags here.` + (Number(behind) ? ` The checked-out branch is ${behind} commits behind its remote: pull it yourself, this script does not.` : ""));
} else if (cmd === "--list") {
  const ledger = readLedger();
  for (const s of stories().sort((a, b) => a.id.localeCompare(b.id))) {
    const l = locks(s.id);
    const state = s.discarded ? "discarded" : l.length ? "locked" : "no lock";
    console.log(`${s.id}\t${state}\t${ledger[s.id] ? "ported" : "-"}\t${s.title}`);
  }
} else if (cmd === "--show") {
  const s = find(arg);
  const l = locks(s.id);
  console.log(s.text);
  console.log("\n--- design reference (read-only) ---");
  console.log(`repo: ${repo}  HEAD: ${gitOk("rev-parse", "--short", "HEAD")}`);
  console.log(l.length ? l.map((x) => `lock: ${x.tag} @ ${x.sha.slice(0, 10)}`).join("\n") : "lock: none (the design is not closed)");
  const shots = screens(s.id);
  console.log(shots.length ? `screens:\n${shots.map((x) => `  ${x}`).join("\n")}` : "screens: none");
  if (l.length) {
    const files = gitOk("ls-tree", "-r", "--name-only", l[0].sha, "--", "src").split("\n")
      .filter((f) => /\.(tsx|ts|css)$/.test(f) && !/\.test\./.test(f));
    console.log(`code at the lock (reference, not to copy; ${files.length} files under src/):\n  git -C "${repo}" show ${l[0].sha.slice(0, 10)}:<file>`);
  }
} else if (cmd === "--record") {
  const s = find(arg);
  const l = locks(s.id);
  if (!l.length) fail(`${s.id} has no lock tag: the design is not closed, do not port it yet.`);
  const ledger = readLedger();
  ledger[s.id] = { locks: Object.fromEntries(l.map((x) => [x.tag, x.sha])), storyHash: hash(s.text), portedAt: new Date().toISOString().slice(0, 10) };
    writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + "\n");
  console.log(`${s.id}: recorded at ${l.map((x) => x.tag).join(", ")}`);
} else if (cmd === "--drift") {
  const ledger = readLedger();
  const ids = arg ? [arg] : Object.keys(ledger);
  let drifted = 0;
  for (const id of ids) {
    const rec = ledger[id];
    if (!rec) { console.log(`${id}: never ported`); continue; }
    const s = find(id);
    const now = Object.fromEntries(locks(id).map((x) => [x.tag, x.sha]));
    const why = [];
    for (const [t, sha] of Object.entries(rec.locks)) {
      if (!now[t]) why.push(`tag ${t} removed`);
      else if (now[t] !== sha) why.push(`tag ${t} moved`);
    }
    for (const t of Object.keys(now)) if (!rec.locks[t]) why.push(`new tag ${t}`);
    if (hash(s.text) !== rec.storyHash) why.push("story text changed");
    if (s.discarded) why.push("story discarded");
    if (why.length) { drifted++; console.log(`${id}: DRIFT (ported ${rec.portedAt}) - ${why.join("; ")}`); }
    else console.log(`${id}: ok`);
  }
  process.exit(drifted ? 1 : 0);
} else {
  fail("usage: --init <path> | --sync | --list | --show <ID> | --record <ID> | --drift [<ID>]");
}
