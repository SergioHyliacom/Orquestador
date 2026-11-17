// stories.mjs and gates.suppressions: a branch does not switch off the checks that judge it. A suppression it adds
// (eslint-disable, //nolint, a skipped or focused test...) is listed in observe, and fails --check and --pr in enforce
// unless the orchestrator recorded it, on its human's ok, in .orchestrator/suppressions.json.
// Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const STORIES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "stories.mjs");

const STORY = `---
id: PRU-9
title: Guardar una nota
activity: Tomar notas
persona: Responsable de la cuenta
release: Entrega 1
blocked_by: []
depends_on: []
tags: []
discarded: false
---

## Story
As the account owner,
I want to save a note,
so that I keep it.

## Acceptance criteria
- **PRU-9.1** When the person saves a note, the system keeps its text. [unbuilt]
  - Given the text «Llamar», when the person saves it, then the note says «Llamar».

## Out of scope

## Verification

## Open questions
`;

function project(gates) {
  const dir = mkdtempSync(path.join(tmpdir(), "stories-suppr-"));
  const write = (rel, text) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), text); };
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, stdio: "ignore" });
  git("init", "-q", "-b", "develop");
  // As in EASY One: the orchestrator's files are one person's, out of git.
  appendFileSync(path.join(dir, ".git", "info", "exclude"), ".orchestrator.json\n.orchestrator/\n");
  write(".orchestrator.json", JSON.stringify({ storiesDir: ".orchestrator/historias", git: { integrationBranch: "develop" }, ...(gates ? { gates } : {}) }));
  write(".orchestrator/historias/activities.json", JSON.stringify([{ code: "NOT", name: "Tomar notas", folder: "notas" }]));
  write(".orchestrator/historias/stories.config.json", JSON.stringify({ releases: ["Entrega 1"], idPrefix: "PRU" }));
  write(".orchestrator/historias/stories/notas/PRU-9-guardar-una-nota.md", STORY);
  // A suppression the integration branch already has is not this branch's.
  write("apps/api/config.go", "package main\n\nconst secret = \"x\" //nolint:gosec // G101: nombre del fichero\n");
  write("apps/panel/src/nota.ts", "export const nota = 1;\n");
  git("add", ".");
  git("commit", "-q", "-m", "base");
  git("update-ref", "refs/remotes/origin/develop", "HEAD");
  git("switch", "-q", "-c", "feature/pru-9-guardar-nota");
  const env = { ...process.env };
  delete env.BITBUCKET_BRANCH;
  delete env.CI;
  return {
    write,
    commit: (rel, text) => { write(rel, text); git("add", rel); git("commit", "-q", "-m", `feat(panel): cambia ${rel}`); },
    run: (...args) => spawnSync("node", [STORIES, ...args], { cwd: dir, env, encoding: "utf8" }),
  };
}

const TS_DISABLE = "export const nota = 1;\n// eslint-disable-next-line no-console\nconsole.log(nota);\n";

test("observe, por defecto: --check lista la supresión y no falla", () => {
  const p = project();
  p.commit("apps/panel/src/nota.ts", TS_DISABLE);
  const check = p.run("--check");
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.match(check.stdout, /observe\): apps\/panel\/src\/nota\.ts:2 adds a suppression: \/\/ eslint-disable-next-line no-console/);
  const pr = p.run("--pr", "PRU-9");
  assert.equal(pr.status, 0, pr.stderr);
  assert.match(pr.stderr, /nota\.ts:2 adds a suppression/);
});

test("enforce: una supresión que el humano no aprobó falla --check y --pr", () => {
  const p = project({ suppressions: "enforce" });
  p.commit("apps/panel/src/nota.ts", TS_DISABLE);
  const check = p.run("--check");
  assert.equal(check.status, 1, check.stdout + check.stderr);
  assert.match(check.stderr, /apps\/panel\/src\/nota\.ts:2 adds a suppression.*record it in \.orchestrator\/suppressions\.json/);
  assert.equal(p.run("--pr", "PRU-9").status, 1);
});

test("enforce: aprobada en .orchestrator/suppressions.json con su motivo, pasa; sin motivo u otra línea, no", () => {
  const p = project({ suppressions: "enforce" });
  p.commit("apps/panel/src/nota.ts", TS_DISABLE);
  const approve = (entries) => p.write(".orchestrator/suppressions.json", JSON.stringify(entries));
  approve([{ file: "apps/panel/src/nota.ts", line: "// eslint-disable-next-line no-console" }]);
  assert.equal(p.run("--check").status, 1, "sin motivo no cuenta");
  approve([{ file: "apps/panel/src/nota.ts", line: "// eslint-disable-next-line", reason: "otra línea" }]);
  assert.equal(p.run("--check").status, 1, "aprueba la línea exacta, no el fichero");
  approve([{ file: "apps/panel/src/nota.ts", line: "// eslint-disable-next-line no-console", reason: "el log es la salida del script" }]);
  const check = p.run("--check");
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.equal(p.run("--pr", "PRU-9").status, 0);
  // A second suppression in the same file needs its own ok.
  p.commit("apps/panel/src/nota.ts", `${TS_DISABLE}// @ts-ignore\nexport const y: number = "x";\n`);
  assert.equal(p.run("--check").status, 1);
});

test("se detectan las supresiones de Go, TypeScript, Biome y los tests saltados o enfocados", () => {
  const p = project({ suppressions: "enforce" });
  const lines = [
    ["apps/api/a.go", "x := 1 //nolint:errcheck"],
    ["apps/api/a_test.go", "t.Skip(\"luego\")"],
    ["apps/panel/src/b.ts", "// @ts-expect-error falta el tipo"],
    ["apps/panel/src/c.tsx", "// biome-ignore lint/a11y/useAltText: decorativa"],
    ["apps/panel/e2e/d.e2e.ts", "test.only('[PRU-9.1] guarda', async () => {});"],
    ["apps/panel/e2e/e.e2e.ts", "test.describe.skip('nota', () => {});"],
    ["apps/panel/src/f.test.ts", "it.skipIf(lento)('[PRU-9.1] guarda', () => {});"],
  ];
  for (const [rel, text] of lines) p.commit(rel, `${text}\n`);
  const check = p.run("--check");
  assert.equal(check.status, 1);
  for (const [rel] of lines) assert.match(check.stderr, new RegExp(`${rel.replace(/\./g, "\\.")}:1 adds a suppression`), rel);
});

test("ni el texto de un .md ni lo que la rama de integración ya tenía cuentan", () => {
  const p = project({ suppressions: "enforce" });
  p.commit("CODING_STANDARDS.md", "- GO-9 Nunca `//nolint` sin motivo.\n");
  p.commit("apps/api/config.go", "package main\n\nconst secret = \"x\" //nolint:gosec // G101: nombre del fichero\n\nconst otro = 2\n");
  const check = p.run("--check");
  assert.equal(check.status, 0, check.stdout + check.stderr);
});

test("off: no se mira; un modo desconocido es un error", () => {
  const off = project({ suppressions: "off" });
  off.commit("apps/panel/src/nota.ts", TS_DISABLE);
  const r = off.run("--check");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, /suppression/);
  const bad = project({ suppressions: "enforced" });
  const b = bad.run("--check");
  assert.equal(b.status, 1);
  assert.match(b.stderr, /gates\.suppressions is "enforced"; it must be off, observe or enforce/);
});
