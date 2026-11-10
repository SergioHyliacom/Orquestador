// design-source.mjs: reads the design repo, records what was ported, flags drift, never writes there.
// Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "design-source.mjs");

const story = (extra = "") => `---
id: ALT-9
title: Entrar en la prueba
discarded: false
---

## Historia
Como propietario, quiero entrar.${extra}
`;

function setup() {
  const design = mkdtempSync(path.join(tmpdir(), "design-"));
  const project = mkdtempSync(path.join(tmpdir(), "project-"));
  const g = (...a) => execFileSync("git", ["-C", design, "-c", "user.email=t@t", "-c", "user.name=t", ...a], { stdio: "ignore" });
  g("init", "-q");
  mkdirSync(path.join(design, "producto", "stories", "alta"), { recursive: true });
  writeFileSync(path.join(design, "producto", "stories", "alta", "ALT-9-entrar.md"), story());
  g("add", "."); g("commit", "-qm", "story");
  const config = path.join(mkdtempSync(path.join(tmpdir(), "claude-")), "easyone-design-source.json");
  const run = (...a) => spawnSync("node", [SCRIPT, ...a], { cwd: project, encoding: "utf8", env: { ...process.env, DESIGN_SOURCE_CONFIG: config } });
  assert.equal(run("--init", design).status, 0);
  return { design, project, config, g, run };
}

test("a story with no lock cannot be recorded", () => {
  const { run } = setup();
  assert.match(run("--list").stdout, /ALT-9\tno lock/);
  const r = run("--record", "ALT-9");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no lock tag/);
});

test("record, then drift when the tag moves or the story changes", () => {
  const { design, project, g, run } = setup();
  g("tag", "lock/ALT-9-entrada");
  assert.equal(run("--record", "ALT-9").status, 0);
  assert.equal(run("--drift").status, 0);

  writeFileSync(path.join(design, "producto", "stories", "alta", "ALT-9-entrar.md"), story("\nQuiero algo más."));
  g("commit", "-qam", "edit"); g("tag", "-f", "lock/ALT-9-entrada");
  const d = run("--drift");
  assert.equal(d.status, 1);
  assert.match(d.stdout, /tag lock\/ALT-9-entrada moved; story text changed/);
});

test("it writes only in the machine config, never in the design repo or the project", () => {
  const { design, project, config, g, run } = setup();
  g("tag", "lock/ALT-9-entrada");
  const before = execFileSync("git", ["-C", design, "status", "--porcelain"], { encoding: "utf8" });
  run("--record", "ALT-9");
  assert.equal(execFileSync("git", ["-C", design, "status", "--porcelain"], { encoding: "utf8" }), before);
  assert.ok(JSON.parse(readFileSync(config.replace(/\.json$/, ".ledger.json"), "utf8"))["ALT-9"]);
  assert.deepEqual(readdirSync(project), []);
});

test("without a config it says how to create it", () => {
  const { run } = setup();
  const r = spawnSync("node", [SCRIPT, "--list"], { encoding: "utf8", env: { ...process.env, DESIGN_SOURCE_CONFIG: path.join(tmpdir(), "nope", "x.json") } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--init/);
});

test("--sync brings the lock tags that only the remote has", () => {
  const { design, g, run } = setup();
  const remote = mkdtempSync(path.join(tmpdir(), "remote-"));
  execFileSync("git", ["clone", "-q", "--bare", design, remote], { stdio: "ignore" });
  g("remote", "add", "origin", remote);
  execFileSync("git", ["-C", remote, "tag", "lock/ALT-9-entrada", "HEAD"], { stdio: "ignore" });
  assert.match(run("--list").stdout, /ALT-9	no lock/);
  assert.equal(run("--sync").status, 0);
  assert.match(run("--list").stdout, /ALT-9	locked/);
});
