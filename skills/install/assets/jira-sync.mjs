#!/usr/bin/env node
// Moves each story's Jira card to the stage the repository proves, and assigns it to whoever's turn it is
// (easyone-orchestrator). No dependencies: Node >= 20.
//
//   node jira-sync.mjs                    compute the stages for the branch being built, move the cards
//   node jira-sync.mjs --dry-run          compute and print; move nothing
//   node jira-sync.mjs --branch <name>    the branch to evaluate; it must be the one checked out (default: BITBUCKET_BRANCH, else the current one)
//   node jira-sync.mjs --no-fetch         do not fetch the story branches first
//
// It reads <root>/.orchestrator.json (jira, including jira.fields, and git.integrationBranch) and `stories.mjs --json`, so run
// `stories.mjs --tests` first on a story branch. Credentials come from the environment: JIRA_EMAIL and
// JIRA_API_TOKEN (Bitbucket secured variables). JIRA_BASE_URL overrides https://<jira.site>.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

// The six stages in order, and Discarded beside them: a card reaches it from any stage.
const FLOW = ["design", "contract", "build", "integration", "visual", "done"];
const STAGES = [...FLOW, "discarded"];
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

const checkedOut = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const branch = after("--branch") ?? process.env.BITBUCKET_BRANCH ?? checkedOut;
// The stories and the merges are read from the checkout, so they only prove the branch that is checked out.
if (checkedOut !== "HEAD" && branch !== checkedOut) fail(`${branch} is not checked out (this is ${checkedOut}). Check it out first.`);
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

// A side is closed when its lock list is on this branch: a half commits it before it merges into the story
// branch, and a story with one side commits it on the story branch itself. The lists stay on the integration
// branch, so a reopened story finds its sides closed, and deleting a half branch changes nothing.
const lockList = (id, side) => existsSync(path.join(ROOT, ".orchestrator", "locked", `${id}-${side}.txt`));
// Work here that the integration branch does not have yet: a story in progress, or one reopened after it
// was done. Only that takes a card out of Done, so a card dragged to Done by hand comes back on the next push.
const ahead = () => !gitOk(["merge-base", "--is-ancestor", "HEAD", `refs/remotes/origin/${INTEGRATION}`]);

function storyBranchStage(id) {
  const s = story(id);
  if (!s) return { error: `${id} is not in the stories folder on this branch.` };
  if (s.discarded) return { skip: `${id} is discarded; its card moves when the discard reaches ${INTEGRATION}` };
  // A build that failed before the tests ran has no results: every [test] would look unsettled.
  if (s.criteria.some((c) => c.kind === "test" && c.result === "noResults")) return { skip: "there are no test results (the build failed before the tests ran)" };
  const base = { sides: s.sides, ahead: ahead() };
  if (s.contractMissing.length) return { ...base, stage: "contract", why: `the spec lacks ${s.contractMissing.join(", ")}` };
  const open = s.sides.filter((h) => !lockList(id, h));
  if (open.length) return { ...base, stage: "build", why: `${open.join(" and ")} not closed yet (no lock list)`, open };
  const pending = s.criteria.filter((c) => !settled(c)).map((c) => c.id);
  if (pending.length) return { ...base, stage: "integration", why: `not settled yet: ${pending.join(", ")}` };
  // Visual review only while a criterion waits for design. Once nothing waits, the card waits for the merge
  // where it is: in Visual review after design approved, else in Integration. A [manual] check a developer
  // made (an email, a live service) never sends the card to design.
  if (s.criteria.some((c) => c.kind === "unverified")) return { ...base, stage: "visual", why: "waiting for design" };
  return { ...base, stage: "integration", why: "every criterion passes or a person checked it; waiting for the merge", holdVisual: true };
}

// ---------- What this push proves: [{ id, stage, why, mode, ahead, holdVisual, sides, open }].
// mode "forward" never moves a card back; only "set" with ahead moves a card out of Done.

const plan = [];
let m;
if ((m = branch.match(/^story\/([A-Z][A-Z0-9]+-\d+)-(back|front)$/))) {
  plan.push({ id: m[1], stage: "build", why: `${branch} pushed`, mode: "forward", sides: story(m[1])?.sides ?? [] });
} else if ((m = branch.match(/^story\/([A-Z][A-Z0-9]+-\d+)$/))) {
  const r = storyBranchStage(m[1]);
  if (r.error) fail(r.error);
  if (r.skip) { console.log(`jira-sync: ${m[1]} not moved: ${r.skip}.`); process.exit(0); }
  plan.push({ id: m[1], mode: "set", ...r });
} else if (branch === INTEGRATION) {
  // Done means every criterion is verified here: a [test] whose tests pass, or a [manual]. Only the merge
  // of story/<ID> brings those markers, and the rule still holds after Bitbucket deletes the merged branch.
  const verified = (s) => s.criteria.length > 0 && s.criteria.every((c) => (c.kind === "test" && c.result === "pass") || c.kind === "manual");
  // A story branch on the remote that is not merged here is a story reopened after it was done: its old
  // markers are still here, but it is not done.
  const reopened = (s) => remoteHas(`story/${s.id}`) && !merged(`story/${s.id}`);
  for (const s of state.stories) {
    if (s.discarded) plan.push({ id: s.id, stage: "discarded", why: `the story is discarded on ${INTEGRATION}`, mode: "set" });
    else if (verified(s) && !reopened(s)) plan.push({ id: s.id, stage: "done", why: `every criterion is verified on ${INTEGRATION}`, mode: "forward" });
    else plan.push({ id: s.id, stage: "contract", why: `the story is on ${INTEGRATION}: design approved it`, mode: "fromDesign", sides: s.sides });
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

// ---------- Whose turn: the assignee follows the stage. The designer is the card's reporter; the backend and
// frontend people are the fields named in jira.fields, set when the story is handed out.
const FIELDS = jira.fields ?? {};
const accountOf = (v) => (Array.isArray(v) ? v[0] : v)?.accountId ?? null;
function turnOf(stage, p, f) {
  const designer = accountOf(f.reporter);
  const of = (side) => (FIELDS[side === "back" ? "backend" : "frontend"] ? accountOf(f[FIELDS[side === "back" ? "backend" : "frontend"]]) : null);
  const sides = p.sides?.length ? p.sides : ["back", "front"];
  const integrator = sides.includes("front") ? of("front") : of("back");
  if (stage === "design") return designer;
  if (stage === "contract") return of("back") ?? of("front");
  if (stage === "build") return (p.open?.length === 1 ? of(p.open[0]) : sides.length === 1 ? of(sides[0]) : null);
  if (stage === "integration") return integrator;
  if (stage === "visual") return p.holdVisual ? integrator : designer;
  return null;
}

let problems = 0;
const extra = ["assignee", "reporter", FIELDS.backend, FIELDS.frontend].filter(Boolean).join(",");
for (const p of plan) {
  const label = (s) => `${statusOf[s]}`;
  if (!auth) { console.log(`${p.id}: would be ${label(p.stage)} (${p.why})${p.mode === "set" ? "" : `, ${p.mode}`}`); continue; }
  try {
    const issue = await api("GET", `/rest/api/3/issue/${p.id}?fields=status,${extra}`);
    const currentName = issue.fields.status.name;
    const current = stageOfStatus(currentName);
    if (!current) { console.log(`${p.id}: left in "${currentName}", a status outside the seven of jira.statuses (${p.why}).`); continue; }
    const skip = current === p.stage
      || current === "discarded"
      || (current === "done" && !p.ahead && p.stage !== "discarded")
      || (p.holdVisual && current === "visual")
      || (p.mode === "forward" && FLOW.indexOf(current) > FLOW.indexOf(p.stage))
      || (p.mode === "fromDesign" && current !== "design");
    let stage = current;
    if (skip) { if (current !== p.stage && p.mode !== "fromDesign") console.log(`${p.id}: stays ${currentName} (${p.why}).`); }
    else if (DRY) { console.log(`${p.id}: would move ${currentName} → ${label(p.stage)} (${p.why})`); continue; }
    else {
      const { transitions } = await api("GET", `/rest/api/3/issue/${p.id}/transitions`);
      const t = transitions.find((x) => x.to?.name?.toLowerCase() === String(statusOf[p.stage]).toLowerCase());
      if (!t) { problems++; console.log(`${p.id}: WARNING the workflow has no transition ${currentName} → ${label(p.stage)}. Allow all statuses to transition to it.`); continue; }
      await api("POST", `/rest/api/3/issue/${p.id}/transitions`, { transition: { id: t.id } });
      console.log(`${p.id}: ${currentName} → ${label(p.stage)} (${p.why})`);
      stage = p.stage;
    }
    // The assignee follows the stage the card is in now; a story branch push also corrects it in place.
    if (skip && p.mode !== "set") continue;
    const turn = turnOf(stage, p, issue.fields);
    if (turn && turn !== accountOf(issue.fields.assignee)) {
      await api("PUT", `/rest/api/3/issue/${p.id}/assignee`, { accountId: turn });
      console.log(`${p.id}: assigned to whoever's turn it is in ${label(stage)}.`);
    }
  } catch (e) {
    problems++;
    console.log(`${p.id}: WARNING ${e.message}`);
  }
}
// A Jira outage must not turn the build red: the problems are printed, and the build goes on.
if (problems) console.log(`jira-sync: ${problems} card(s) not moved. See the warnings above.`);
