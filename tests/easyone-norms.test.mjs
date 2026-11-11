// The plugin keeps to the project's CONTRIBUTING.md: every pull request needs another person, the story branch is
// feature/<id>-<slug>, the orchestrator's files live outside git (.git/info/exclude), the architecture decisions are
// the ADRs, and the Go tests are read from `go test -json`.
// Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.resolve(HERE, "..", "hooks", "guard.mjs");
const STORIES = path.resolve(HERE, "..", "scripts", "stories.mjs");
const BUILDER = "easyone-orchestrator:builder";

const STORY = ({ tags = [], blockedBy = [], marker = "[unbuilt]" } = {}) => `---
id: PRU-9
title: Guardar una nota
activity: Tomar notas
persona: Responsable de la cuenta
release: Entrega 1
blocked_by: [${blockedBy.join(", ")}]
depends_on: []
tags: [${tags.join(", ")}]
discarded: false
---

## Story
As the account owner,
I want to save a note,
so that I keep it.

## Acceptance criteria
- **PRU-9.1** When the person saves a note, the system keeps its text. ${marker}

## Out of scope
- Borrar notas.

## Verification
pnpm test:go

## Open questions
`;

// A repository like easyone: the orchestrator's files under .orchestrator/, excluded on this machine only.
function project({ orchestrator = {}, story = {}, tests } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "easyone-norms-"));
  const write = (rel, text) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), text); };
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, stdio: "ignore" });
  git("init", "-q", "-b", "develop");
  appendFileSync(path.join(dir, ".git", "info", "exclude"), "/.orchestrator/\n/.orchestrator.json\n");
  write(".orchestrator.json", JSON.stringify({ storiesDir: ".orchestrator/historias", git: { integrationBranch: "develop", allowPush: false },
    roles: { builder: { paths: ["modules/"], onStop: [] } }, ...orchestrator }));
  write(".orchestrator/historias/activities.json", JSON.stringify([{ code: "NOT", name: "Tomar notas", folder: "notas" }]));
  write(".orchestrator/historias/stories.config.json", JSON.stringify({ releases: ["Entrega 1"], idPrefix: "PRU", ...(tests ? { tests } : {}) }));
  write(".orchestrator/historias/stories/notas/PRU-9-guardar-una-nota.md", STORY(story));
  write("modules/notes/notes.go", "package notes\n");
  write("modules/notes/notes_test.go", "package notes\n");
  write("modules/identity/authz.go", "package identity\n");
  git("add", ".");
  git("commit", "-q", "-m", "chore(repo): base");
  git("update-ref", "refs/remotes/origin/develop", "HEAD");
  const env = { ...process.env };
  delete env.BITBUCKET_BRANCH;
  delete env.CI;
  return {
    dir, write, git,
    commit: (rel, text = "x\n") => { write(rel, text); git("add", rel); git("commit", "-q", "-m", `feat(notes): cambiar ${rel}`); },
    head: () => execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir }).toString().trim(),
    stories: (...args) => spawnSync("node", [STORIES, ...args], { cwd: dir, env, encoding: "utf8" }),
    guard: (event) => spawnSync("node", [GUARD], { input: JSON.stringify({ cwd: dir, ...event }), encoding: "utf8" }),
  };
}
const asks = (r) => r.status === 0 && /"permissionDecision":"ask"/.test(r.stdout);

test("no hay ramas que se suban o se fusionen solas: chore/check- también pregunta", () => {
  const p = project();
  p.git("switch", "-q", "-c", "chore/check-sql");
  const bash = (command) => p.guard({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command } });
  assert.ok(asks(bash("git push -u origin chore/check-sql")), "el push de una comprobación pregunta");
  assert.ok(asks(bash("git push origin feature/pru-9-save-note")), "el push de una historia pregunta");
  const merge = bash(`curl -s -X POST -u "$BITBUCKET_USER:$BITBUCKET_TOKEN" https://api.bitbucket.org/2.0/repositories/hyliacom/easyone/pullrequests/7/merge --data-binary @-`);
  assert.ok(asks(merge), merge.stdout + merge.stderr);
});

test("una historia fuera de git: el builder que la cambia lo cuenta al parar", () => {
  const p = project();
  p.git("switch", "-q", "-c", "feature/pru-9-save-note");
  const launch = p.guard({ hook_event_name: "PreToolUse", tool_name: "Agent", tool_input: { subagent_type: BUILDER, prompt: "x" } });
  assert.equal(launch.status, 0, launch.stderr);
  p.write(".orchestrator/historias/stories/notas/PRU-9-guardar-una-nota.md", STORY({ marker: "[test]" }));
  const stop = p.guard({ hook_event_name: "SubagentStop", agent_id: "a1", agent_type: BUILDER, stop_hook_active: false });
  assert.equal(stop.status, 2, stop.stderr);
  assert.match(stop.stderr, /orchestrator-owned files changed while you ran: \.orchestrator\/historias\/stories\/notas\/PRU-9-guardar-una-nota\.md/);
});

test("una historia fuera de git que nadie toca deja parar al builder", () => {
  const p = project();
  p.git("switch", "-q", "-c", "feature/pru-9-save-note");
  p.guard({ hook_event_name: "PreToolUse", tool_name: "Agent", tool_input: { subagent_type: BUILDER, prompt: "x" } });
  p.write("modules/notes/notes.go", "package notes\n\nfunc Save() {}\n");
  const stop = p.guard({ hook_event_name: "SubagentStop", agent_id: "a1", agent_type: BUILDER, stop_hook_active: false });
  assert.equal(stop.status, 0, stop.stderr);
});

test("una lista de bloqueo fuera de git guarda su commit: lo que se cambia después se ve", () => {
  const p = project();
  p.git("switch", "-q", "-c", "feature/pru-9-save-note");
  p.commit("modules/notes/notes_test.go", "package notes\n\n// [PRU-9.1]\n");
  p.write(".orchestrator/locked/PRU-9.txt", `# commit ${p.head()}\nmodules/notes/notes_test.go\n`);
  const clean = p.guard({ hook_event_name: "SubagentStop", agent_id: "a1", agent_type: BUILDER, stop_hook_active: false });
  assert.equal(clean.status, 0, clean.stderr);
  p.commit("modules/notes/notes_test.go", "package notes\n\n// cambiado\n");
  const stop = p.guard({ hook_event_name: "SubagentStop", agent_id: "a1", agent_type: BUILDER, stop_hook_active: false });
  assert.equal(stop.status, 2, stop.stderr);
  assert.match(stop.stderr, /locked files were committed after the lock .*modules\/notes\/notes_test\.go/);
  const check = p.stories("--check");
  assert.match(check.stderr, /modules\/notes\/notes_test\.go is locked in \.orchestrator\/locked\/PRU-9\.txt and changed after its lock/);
});

test("la rama feature/<id>-<slug> es la de la historia: sin su etiqueta de riesgo, --check y --pr fallan", () => {
  const p = project({ orchestrator: { riskTags: ["identity"], riskPaths: { identity: ["modules/identity/"] } } });
  p.git("switch", "-q", "-c", "feature/pru-9-save-note");
  p.commit("modules/identity/authz.go", "package identity\n\n// cambio\n");
  const check = p.stories("--check");
  assert.equal(check.status, 1);
  assert.match(check.stderr, /this branch changes modules\/identity\/authz\.go, a identity path/);
  const pr = p.stories("--pr", "PRU-9");
  assert.equal(pr.status, 1);
  assert.doesNotMatch(pr.stdout, /\.orchestrator\//, "el cuerpo del PR no enlaza un fichero que solo está en este equipo");
  // Otra rama que no es de esa historia no le pide nada.
  p.git("switch", "-q", "-c", "fix/session-timeout");
  assert.doesNotMatch(p.stories("--check").stderr, /identity path/);
});

test("blocked_by cita un ADR: propuesto bloquea la historia, aceptado no", () => {
  const p = project({ story: { blockedBy: ["ADR-0023"] } });
  const adr = (estado) => p.write("docs/adr/0023-notas-cifradas.md", `# 0023. Notas cifradas\n\n- **Estado:** ${estado}\n- **Fecha:** 2026-11-11\n`);
  adr("propuesta");
  const open = p.stories("--ready", "PRU-9");
  assert.equal(open.status, 1, open.stdout + open.stderr);
  assert.match(open.stdout, /blocked by an open decision: ADR-0023/);
  adr("aceptada");
  const closed = p.stories("--ready", "PRU-9");
  assert.equal(closed.status, 0, closed.stdout + closed.stderr);
  p.write(".orchestrator/historias/stories/notas/PRU-9-guardar-una-nota.md", STORY({ blockedBy: ["ADR 24"] }));
  assert.match(p.stories().stderr, /decision ADR-0024 does not exist \(no docs\/adr\/0024-\*\.md\)/);
});

test("los tests de Go se leen de go test -json: un subtest saltado no cuenta como verde", () => {
  const events = (action) => [
    { Action: "run", Package: "easyone/modules/notes", Test: "TestSave" },
    { Action: "run", Package: "easyone/modules/notes", Test: "TestSave/[PRU-9.1]_keeps_the_text" },
    { Action: "output", Package: "easyone/modules/notes", Test: "TestSave/[PRU-9.1]_keeps_the_text", Output: "--- PASS\n" },
    { Action: action, Package: "easyone/modules/notes", Test: "TestSave/[PRU-9.1]_keeps_the_text" },
    { Action: "pass", Package: "easyone/modules/notes", Test: "TestSave" },
  ].map((e) => JSON.stringify(e)).join("\n");
  const p = project({ story: { marker: "[test]" }, tests: [{ command: "node gotest.mjs > {report}", format: "go-json" }] });
  p.write(".orchestrator/historias/gotest.mjs", "");
  const run = (action) => {
    p.write("gotest.mjs", `process.stdout.write(${JSON.stringify(`> easyone@ test:go\n${events(action)}\n`)});\n`);
    return p.stories("--tests");
  };
  const pass = run("pass");
  assert.equal(pass.status, 0, pass.stdout + pass.stderr);
  assert.match(readFileSync(path.join(p.dir, ".orchestrator/historias/map.md"), "utf8"), /✅ \[PRU-9\]/);
  const skip = run("skip");
  assert.match(readFileSync(path.join(p.dir, ".orchestrator/historias/map.md"), "utf8"), /⚠️ \[PRU-9\]/, skip.stdout + skip.stderr);
  assert.match(p.stories("--check").stderr, /the test for PRU-9\.1 is skipped/);
});
