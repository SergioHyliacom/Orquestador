#!/usr/bin/env node
// Moves each story's Jira card to the stage the repository proves (easyone-orchestrator).
// No dependencies: Node >= 20.
//
//   node jira-sync.mjs                    compute the stages for the branch being built, move the cards
//   node jira-sync.mjs --dry-run          compute and print; move nothing
//   node jira-sync.mjs --branch <name>    the branch to evaluate (default: BITBUCKET_BRANCH, else the current one)
//   node jira-sync.mjs --no-fetch         do not fetch the story branches first
//
// It reads <root>/.orchestrator.json (jira, git.integrationBranch) and `stories.mjs --json`, so run
// `stories.mjs --tests` first on a story branch. Credentials come from the environment: JIRA_EMAIL and
// JIRA_API_TOKEN (Bitbucket secured variables). JIRA_BASE_URL overrides https://<jira.site>.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const lf = (s) => s.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
const readJson = (p) => JSON.parse(lf(readFileSync(p, "utf8")));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const after = (f) => { const i = args.indexOf(f); return i < 0 ? null : args[i + 1] ?? null; };
const fail = (msg) => { console.error(`jira-sync: ${msg}`); process.exit(2); };

const storiesConfig = readJson(path.join(DIR, "stories.config.json"));
const ROOT = path.resolve(DIR, storiesConfig.root ?? "..");
let config;
try { config = readJson(path.join(ROOT, ".orchestrator.json")); } catch (e) { fail(`cannot read .orchestrator.json (${e.message}).`); }

const STAGES = ["design", "contract", "build", "integration", "visual", "done"];
const jira = config.jira ?? {};
const statusOf = jira.statuses ?? {};
for (const s of STAGES) if (!statusOf[s] || String(statusOf[s]).includes("{{")) fail(`.orchestrator.json → jira.statuses.${s} is not set.`);
const stageOfStatus = (name) => STAGES.find((s) => String(statusOf[s]).toLowerCase() === String(name ?? "").toLowerCase()) ?? null;
const INTEGRATION = config.git?.integrationBranch ?? "develop";
const DRY = flag("--dry-run");

// ---------- Git

const git = (a) => execFileSync("git", a, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const gitOk = (a) => spawnSync("git", a, { cwd: ROOT, stdio: "ignore" }).status === 0;
const remoteHas = (b) => gitOk(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${b}`]);
const merged = (b, into = "HEAD") => remoteHas(b) && gitOk(["merge-base", "--is-ancestor", `refs/remotes/origin/${b}`, into]);

const branch = after("--branch") ?? process.env.BITBUCKET_BRANCH ?? git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (!flag("--no-fetch")) {
  // A pipeline clones one branch. The stage depends on the story branches and the integration branch too.
  try { git(["fetch", "--quiet", "origin", "+refs/heads/story/*:refs/remotes/origin/story/*", `+refs/heads/${INTEGRATION}:refs/remotes/origin/${INTEGRATION}`]); }
  catch (e) { console.warn(`jira-sync: WARNING could not fetch the story branches (${String(e.stderr ?? e.message).trim()}). Using what is here.`); }
}

// ---------- Stories, as the validator computes them on this checkout

const run = spawnSync(process.execPath, [path.join(DIR, "stories.mjs"), "--json"], { cwd: ROOT, encoding: "utf8" });
let state;
try { state = JSON.parse(run.stdout); } catch { fail(`stories.mjs --json gave no JSON:\n${run.stderr}`); }
const story = (id) => state.stories.find((s) => s.id === id);

// A criterion is settled when its tests all pass, a person checked it, or it waits for design.
const settled = (c) => (c.kind === "test" && c.result === "pass") || c.kind === "manual" || c.kind === "unverified";

function storyBranchStage(id) {
  const s = story(id);
  if (!s) return { error: `${id} is not in the stories folder on this branch.` };
  if (s.contractMissing.length) return { stage: "contract", why: `the spec lacks ${s.contractMissing.join(", ")}` };
  // Every half the story declares must be merged; a half nobody has pushed yet is still open.
  const open = s.sides.filter((h) => !merged(`story/${id}-${h}`));
  if (open.length) return { stage: "build", why: open.map((h) => `story/${id}-${h}`).join(" and ") + " not merged yet" };
  const pending = s.criteria.filter((c) => !settled(c)).map((c) => c.id);
  if (pending.length) return { stage: "integration", why: `not settled yet: ${pending.join(", ")}` };
  // Visual review only when a person has something to check; otherwise the card waits for the merge here.
  if (s.criteria.some((c) => c.kind === "unverified")) return { stage: "visual", why: "waiting for design" };
  if (s.criteria.some((c) => c.kind === "manual")) return { stage: "visual", why: "checked by a person; waiting for the merge" };
  return { stage: "integration", why: "every criterion passes and nothing waits for a person; waiting for the merge" };
}

// ---------- What this push proves: [{ id, stage, why, mode }]. mode "forward" never moves a card back.

const plan = [];
let m;
if ((m = branch.match(/^story\/([A-Z][A-Z0-9]+-\d+)-(back|front)$/))) {
  plan.push({ id: m[1], stage: "build", why: `${branch} pushed`, mode: "forward" });
} else if ((m = branch.match(/^story\/([A-Z][A-Z0-9]+-\d+)$/))) {
  const r = storyBranchStage(m[1]);
  if (r.error) fail(r.error);
  plan.push({ id: m[1], stage: r.stage, why: r.why, mode: "set" });
} else if (branch === INTEGRATION) {
  for (const s of state.stories.filter((x) => !x.discarded)) {
    if (merged(`story/${s.id}`)) plan.push({ id: s.id, stage: "done", why: `story/${s.id} is merged into ${INTEGRATION}`, mode: "forward" });
    else plan.push({ id: s.id, stage: "contract", why: `the story is on ${INTEGRATION}: design approved it`, mode: "fromDesign" });
  }
} else {
  console.log(`jira-sync: ${branch} is not a story branch or ${INTEGRATION}; nothing to move.`);
  process.exit(0);
}

// ---------- Jira

const base = process.env.JIRA_BASE_URL ?? (jira.site ? `https://${jira.site}` : null);
const auth = process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN
  ? "Basic " + Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString("base64") : null;
if (!base) fail(".orchestrator.json → jira.site is not set.");
if (!auth && !DRY) fail("JIRA_EMAIL and JIRA_API_TOKEN are not set. Add them as secured repository variables.");

async function api(method, url, body) {
  const res = await fetch(base + url, { method, headers: { Authorization: auth, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

let problems = 0;
for (const p of plan) {
  const label = (s) => `${statusOf[s]}`;
  if (!auth) { console.log(`${p.id}: would be ${label(p.stage)} (${p.why})${p.mode === "set" ? "" : `, ${p.mode}`}`); continue; }
  try {
    const issue = await api("GET", `/rest/api/3/issue/${p.id}?fields=status`);
    const currentName = issue.fields.status.name;
    const current = stageOfStatus(currentName);
    if (!current) { console.log(`${p.id}: left in "${currentName}", a status outside the six stages (${p.why}).`); continue; }
    const skip = current === p.stage
      || current === "done"
      || (p.mode === "forward" && STAGES.indexOf(current) > STAGES.indexOf(p.stage))
      || (p.mode === "fromDesign" && current !== "design");
    if (skip) { if (current !== p.stage && p.mode !== "fromDesign") console.log(`${p.id}: stays ${currentName} (${p.why}).`); continue; }
    if (DRY) { console.log(`${p.id}: would move ${currentName} → ${label(p.stage)} (${p.why})`); continue; }
    const { transitions } = await api("GET", `/rest/api/3/issue/${p.id}/transitions`);
    const t = transitions.find((x) => x.to?.name?.toLowerCase() === String(statusOf[p.stage]).toLowerCase());
    if (!t) { problems++; console.log(`${p.id}: WARNING the workflow has no transition ${currentName} → ${label(p.stage)}. Allow all statuses to transition to it.`); continue; }
    await api("POST", `/rest/api/3/issue/${p.id}/transitions`, { transition: { id: t.id } });
    console.log(`${p.id}: ${currentName} → ${label(p.stage)} (${p.why})`);
  } catch (e) {
    problems++;
    console.log(`${p.id}: WARNING ${e.message}`);
  }
}
// A Jira outage must not turn the build red: the problems are printed, and the build goes on.
if (problems) console.log(`jira-sync: ${problems} card(s) not moved. See the warnings above.`);
