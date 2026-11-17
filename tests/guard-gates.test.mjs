// What judges a change stays out of that change's reach. A role agent is held to .orchestrator.json as it was when
// the orchestrator launched it, and deleting the file does not switch the guard off. The protected gate keeps role
// agents away from .orchestrator.json, the project's norms and, on a story's branch, the configuration of the checks:
// in observe it records what it would block, in enforce it blocks.
// Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const GUARD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "hooks", "guard.mjs");
const BUILDER = "easyone-orchestrator:builder";

function project({ config = {}, branch = "feature/pru-1-guardar-nota" } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "guard-gates-"));
  const put = (rel, text) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), text); };
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, stdio: "ignore" });
  git("init", "-q", "-b", branch);
  // As in EASY One: the orchestrator's files are one person's, out of git.
  appendFileSync(path.join(dir, ".git", "info", "exclude"), ".orchestrator.json\n.orchestrator/\n");
  put(".orchestrator.json", JSON.stringify({ roles: { builder: { onStop: [] } }, ...config }));
  put("apps/api/nif.go", "package api\n");
  put(".golangci.yml", "linters: {}\n");
  put("apps/panel/playwright.config.ts", "export default {};\n");
  put("CODING_STANDARDS.md", "- ARCH-1 Una norma.\n");
  put("CONTRIBUTING.md", "# Contribuir\n");
  put("docs/adr/0001-una-decision.md", "# 1. Una decisión\n");
  git("add", ".");
  git("commit", "-q", "-m", "inicio");
  const guard = (event) => spawnSync("node", [GUARD], { input: JSON.stringify({ cwd: dir, ...event }), encoding: "utf8" });
  // The orchestrator launches the builder: the guard takes .orchestrator.json as it is now.
  const launch = () => guard({ hook_event_name: "PreToolUse", tool_name: "Agent", tool_input: { subagent_type: BUILDER } });
  const write = (agent_type, rel) => guard({ hook_event_name: "PreToolUse", tool_name: "Write", agent_type,
    tool_input: { file_path: path.join(dir, rel), content: "x\n" } });
  const bash = (agent_type, command) => guard({ hook_event_name: "PreToolUse", tool_name: "Bash", agent_type, tool_input: { command } });
  const stop = (extra = {}) => guard({ hook_event_name: "SubagentStop", agent_id: "b1", agent_type: BUILDER, agent_transcript_path: "", ...extra });
  const log = () => { const f = path.join(dir, ".orchestrator", "work", "gates.log"); return existsSync(f) ? readFileSync(f, "utf8") : ""; };
  launch();
  return { dir, put, git, guard, launch, write, bash, stop, log };
}
const re = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("un subagente sigue .orchestrator.json tal como estaba al lanzarlo", () => {
  const p = project({ config: { roles: { builder: { onStop: ["node -e process.exit(1)"] } } } });
  // The builder rewrites its own fast checks in the tree: the guard still runs the ones it was launched with.
  p.put(".orchestrator.json", JSON.stringify({ roles: { builder: { onStop: [] } } }));
  const stop = p.stop();
  assert.equal(stop.status, 2, stop.stderr);
  assert.match(stop.stderr, /node -e process\.exit\(1\)` failed/);
});

test("la sesión sigue .orchestrator.json del árbol, y la siguiente vez que lanza un agente se lo pasa", () => {
  const p = project();
  p.put(".orchestrator.json", JSON.stringify({ git: { protectedBranches: ["feature/pru-1-guardar-nota"] } }));
  const commit = p.bash(undefined, "git commit -m x");
  assert.equal(commit.status, 2, commit.stderr);
  assert.match(commit.stderr, /commits on feature\/pru-1-guardar-nota are blocked/);
  // The builder launched before the change still has the old configuration; the next launch takes the new one.
  assert.equal(p.bash(BUILDER, "git checkout -b otra").status, 0);
  p.launch();
  p.put(".orchestrator.json", JSON.stringify({}));
  const push = p.bash(BUILDER, "git push");
  assert.equal(push.status, 2, push.stderr);
});

test("borrar .orchestrator.json del árbol no apaga la guardia", () => {
  const p = project();
  rmSync(path.join(p.dir, ".orchestrator.json"));
  for (const agent of [BUILDER, undefined]) {
    const push = p.bash(agent, "git push --force");
    assert.equal(push.status, 2, `${agent ?? "sesión"}: ${push.stderr}`);
  }
  const commit = p.bash(BUILDER, "git commit -m x");
  assert.equal(commit.status, 2, commit.stderr);
});

test("sin .orchestrator.json ni foto de un lanzamiento, la guardia no hace nada", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "guard-gates-none-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  const r = spawnSync("node", [GUARD], { input: JSON.stringify({ cwd: dir, hook_event_name: "PreToolUse", tool_name: "Bash", agent_type: BUILDER, tool_input: { command: "git push --force" } }), encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

const JUDGES = [".golangci.yml", "CODING_STANDARDS.md", "CONTRIBUTING.md", "docs/adr/0002-otra.md", ".orchestrator.json", "apps/panel/playwright.config.ts"];

test("observe, por defecto: no bloquea y apunta lo que habría bloqueado", () => {
  const p = project();
  for (const rel of JUDGES) {
    const w = p.write(BUILDER, rel);
    assert.equal(w.status, 0, `${rel}: ${w.stderr}`);
    assert.match(p.log(), new RegExp(`protected\\tobserved\\t${re(BUILDER)}\\tfeature/pru-1-guardar-nota\\tWrite ${re(rel)}`, "i"));
  }
  assert.equal(p.write(BUILDER, "apps/api/nif.go").status, 0);
  assert.doesNotMatch(p.log(), /nif\.go/);
  // The session itself is not held by the gate.
  const before = p.log();
  assert.equal(p.write(undefined, ".golangci.yml").status, 0);
  assert.equal(p.log(), before);
});

test("enforce: un agente no cambia la configuración, las normas ni la configuración de un check", () => {
  const p = project({ config: { gates: { protected: "enforce" } } });
  for (const rel of JUDGES) {
    const w = p.write(BUILDER, rel);
    assert.equal(w.status, 2, `${rel}: ${w.stderr}`);
    assert.match(w.stderr, /judges/);
    assert.match(p.log(), new RegExp(`protected\\tblocked\\t.*Write ${re(rel)}`, "i"));
  }
  for (const command of ["sed -i s/a/b/ .golangci.yml", "echo x > CODING_STANDARDS.md", "rm .orchestrator.json", "rm -r docs", "git mv .golangci.yml otro.yml"]) {
    const r = p.bash(BUILDER, command);
    assert.equal(r.status, 2, `${command}: ${r.stderr}`);
  }
  // Undoing a change is how the agent gets out of it.
  const restore = p.bash(BUILDER, "git restore .golangci.yml CODING_STANDARDS.md");
  assert.equal(restore.status, 0, restore.stderr);
  assert.equal(p.write(BUILDER, "apps/api/nif.go").status, 0);
  assert.equal(p.write(undefined, ".golangci.yml").status, 0, "la sesión no queda atada");
});

test("fuera de las historias la configuración de los checks se puede tocar; la del orquestador y las normas, no", () => {
  for (const branch of ["feature/check-no-fetch", "fix/build-script"]) {
    const p = project({ config: { gates: { protected: "enforce" } }, branch });
    assert.equal(p.write(BUILDER, ".golangci.yml").status, 0, branch);
    assert.equal(p.write(BUILDER, "apps/panel/playwright.config.ts").status, 0, branch);
    assert.equal(p.write(BUILDER, "CODING_STANDARDS.md").status, 2, branch);
    assert.equal(p.write(BUILDER, ".orchestrator.json").status, 2, branch);
  }
  // A story's branch, also when a bug reopens it, and a hotfix: the checks are protected.
  for (const branch of ["fix/pru-1-correo-duplicado", "hotfix/caida-login", "story/PRU-1"]) {
    const p = project({ config: { gates: { protected: "enforce" } }, branch });
    assert.equal(p.write(BUILDER, ".golangci.yml").status, 2, branch);
  }
});

test("gates.protectedPaths sustituye la lista de checks; las normas siguen protegidas", () => {
  const p = project({ config: { gates: { protected: "enforce", protectedPaths: ["tsconfig.base.json"] } } });
  assert.equal(p.write(BUILDER, "tsconfig.base.json").status, 2);
  assert.equal(p.write(BUILDER, ".golangci.yml").status, 0);
  assert.equal(p.write(BUILDER, "CODING_STANDARDS.md").status, 2);
});

test("al parar, lo escrito por cualquier vía se ve: las normas en git, .orchestrator.json contra su foto", () => {
  const p = project({ config: { gates: { protected: "enforce" } } });
  // An interpreter's write never reaches PreToolUse as a path.
  p.put(".golangci.yml", "linters: { disable-all: true }\n");
  p.put("docs/adr/0002-nueva.md", "# 2. Otra\n");
  p.put(".orchestrator.json", JSON.stringify({ gates: { protected: "off" } }));
  const stop = p.stop();
  assert.equal(stop.status, 2, stop.stderr);
  for (const f of [".golangci.yml", "docs/adr/0002-nueva.md", ".orchestrator.json"]) assert.match(stop.stderr, new RegExp(re(f), "i"));
  assert.match(stop.stderr, /git restore/);
  // One retry, then the agent reports.
  assert.equal(p.stop({ stop_hook_active: true }).status, 0);
});

test("al parar en observe, se apunta y no se bloquea", () => {
  const p = project();
  p.put(".golangci.yml", "linters: { disable-all: true }\n");
  const stop = p.stop();
  assert.equal(stop.status, 0, stop.stderr);
  assert.match(p.log(), /protected\tobserved\t.*\tstop \.golangci\.yml/);
});

test("off: ni bloquea ni apunta", () => {
  const p = project({ config: { gates: { protected: "off" } } });
  assert.equal(p.write(BUILDER, ".golangci.yml").status, 0);
  p.put(".golangci.yml", "linters: { disable-all: true }\n");
  assert.equal(p.stop().status, 0);
  assert.equal(p.log(), "");
});

test("el registro de las compuertas es de la guardia; las supresiones aprobadas, del orquestador", () => {
  const p = project();
  for (const agent of [BUILDER, undefined]) {
    const w = p.write(agent, ".orchestrator/work/gates.log");
    assert.equal(w.status, 2, w.stderr);
    assert.match(w.stderr, /record of its gates/);
  }
  assert.equal(p.bash(BUILDER, "rm .orchestrator/work/gates.log").status, 2);
  const approve = p.write(BUILDER, ".orchestrator/suppressions.json");
  assert.equal(approve.status, 2, approve.stderr);
  assert.match(approve.stderr, /only the orchestrator writes it/);
  assert.equal(p.bash(BUILDER, "echo [] > .orchestrator/suppressions.json").status, 2);
  assert.equal(p.write(undefined, ".orchestrator/suppressions.json").status, 0, "la sesión la escribe");
  // Written by an interpreter, it shows at the stop like the stories and the lock lists.
  p.launch();
  p.put(".orchestrator/suppressions.json", "[]\n");
  const stop = p.stop();
  assert.equal(stop.status, 2, stop.stderr);
  assert.match(stop.stderr, /suppressions\.json/);
});

test("un modo desconocido bloquea hasta que se corrija", () => {
  const p = project({ config: { gates: { protected: "enforced" } } });
  assert.equal(p.launch().status, 2, "ni siquiera lanza un agente");
  const r = p.write(undefined, "apps/api/nif.go");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /gates\.protected is "enforced": it must be off, observe or enforce/);
});
