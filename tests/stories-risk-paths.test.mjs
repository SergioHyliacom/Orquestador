// stories.mjs and riskPaths: a story branch that touches a risk path needs that risk tag.
// Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const STORIES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "stories.mjs");

const STORY = (tags) => `---
id: PRU-9
title: Guardar una nota
activity: Tomar notas
persona: Responsable de la cuenta
release: Entrega 1
blocked_by: []
depends_on: []
tags: [${tags.join(", ")}]
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

function project({ riskPaths, riskTags = ["identity", "personal-data"] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "stories-risk-"));
  const write = (rel, text) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), text); };
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, stdio: "ignore" });
  write(".orchestrator.json", JSON.stringify({ storiesDir: "product", git: { integrationBranch: "develop" }, riskTags, riskPaths }));
  write("product/activities.json", JSON.stringify([{ code: "NOT", name: "Tomar notas", folder: "notas" }]));
  write("product/stories.config.json", JSON.stringify({ releases: ["Entrega 1"], idPrefix: "PRU" }));
  write("product/stories/notas/PRU-9-guardar-una-nota.md", STORY([]));
  write("apps/api/main.go", "package main\n");
  // The code the risk paths name exists on the integration branch.
  write("apps/api/internal/platform/authz/authz.go", "package authz\n");
  write("apps/api/internal/modules/notes/migrations/0001_create_notes.sql", "-- notas\n");
  git("init", "-q", "-b", "develop");
  git("add", ".");
  git("commit", "-q", "-m", "base");
  git("update-ref", "refs/remotes/origin/develop", "HEAD");
  git("switch", "-q", "-c", "story/PRU-9");
  const env = { ...process.env };
  delete env.BITBUCKET_BRANCH;
  delete env.CI;
  return {
    change: (rel) => { write(rel, "x\n"); git("add", rel); git("commit", "-q", "-m", `cambia ${rel}`); },
    move: (from, to) => { git("mv", from, to); git("commit", "-q", "-m", `mueve ${from}`); },
    tag: (...tags) => { write("product/stories/notas/PRU-9-guardar-una-nota.md", STORY(tags)); git("add", "."); git("commit", "-q", "-m", "tags"); },
    switchTo: (branch) => git("switch", "-q", "-c", branch),
    run: (...args) => spawnSync("node", [STORIES, ...args], { cwd: dir, env, encoding: "utf8" }),
  };
}

const RISK_PATHS = { identity: ["apps/api/internal/platform/authz/"], "personal-data": ["apps/api/**/migrations/*.sql"] };

test("una rama de historia que toca una ruta de riesgo sin su etiqueta falla --check y --pr", () => {
  const p = project({ riskPaths: RISK_PATHS });
  p.change("apps/api/internal/modules/notes/migrations/0002_texto.sql");
  const check = p.run("--check");
  assert.equal(check.status, 1, check.stdout + check.stderr);
  assert.match(check.stderr, /changes apps\/api\/internal\/modules\/notes\/migrations\/0002_texto\.sql, a personal-data path .* lack personal-data/);
  const pr = p.run("--pr", "PRU-9");
  assert.equal(pr.status, 1);
  assert.match(pr.stderr, /lack personal-data/);
  assert.match(pr.stdout, /PRU-9\.1/, "el resumen del PR sigue saliendo");
});

test("con la etiqueta puesta, la rama pasa", () => {
  const p = project({ riskPaths: RISK_PATHS });
  p.change("apps/api/internal/modules/notes/migrations/0002_texto.sql");
  p.tag("personal-data");
  const check = p.run("--check");
  assert.equal(check.status, 0, check.stderr);
  assert.equal(p.run("--pr", "PRU-9").status, 0);
});

test("una carpeta termina en / y cuenta todo lo que hay dentro; lo demás no es riesgo", () => {
  const p = project({ riskPaths: RISK_PATHS });
  p.change("apps/api/internal/modules/notes/module.go");
  assert.equal(p.run("--check").status, 0, "un fichero fuera de las rutas no pide etiqueta");
  p.change("apps/api/internal/platform/authz/account.go");
  const check = p.run("--check");
  assert.equal(check.status, 1);
  assert.match(check.stderr, /a identity path/);
});

test("solo cuentan los cambios de la propia rama, y solo en una rama de historia", () => {
  const p = project({ riskPaths: RISK_PATHS });
  p.switchTo("chore/migracion");
  p.change("apps/api/internal/modules/notes/migrations/0002_texto.sql");
  assert.equal(p.run("--check").status, 0, "una rama que no es de historia no tiene historia que etiquetar");
});

test("riskPaths solo puede nombrar etiquetas de riskTags", () => {
  const p = project({ riskPaths: { pagos: ["apps/api/internal/modules/payments/"] } });
  const check = p.run("--check");
  assert.equal(check.status, 1);
  assert.match(check.stderr, /riskPaths names pagos, which is not in riskTags/);
});

test("una entrada que no corresponde a ningún fichero falla --check", () => {
  const p = project({ riskPaths: { identity: ["apps/api/internal/platform/auth/"] } });
  const check = p.run("--check");
  assert.equal(check.status, 1);
  assert.match(check.stderr, /riskPaths identity → apps\/api\/internal\/platform\/auth\/ matches no file in the repository/);
});

test("mover el código de una ruta de riesgo deja la entrada caducada en esa misma rama", () => {
  const p = project({ riskPaths: RISK_PATHS });
  p.tag("identity");
  p.move("apps/api/internal/platform/authz", "apps/api/internal/platform/permisos");
  const check = p.run("--check");
  assert.equal(check.status, 1);
  assert.match(check.stderr, /riskPaths identity → apps\/api\/internal\/platform\/authz\/ matches no file/);
});

test("sin riskPaths no cambia nada", () => {
  const p = project();
  p.change("apps/api/internal/modules/notes/migrations/0002_texto.sql");
  assert.equal(p.run("--check").status, 0);
});
