// A builder that goes round in circles inside one run: the failures it sees even when a pipe hides them, the same
// failure that comes back, too many failed checks, and a check that hangs when it stops.
// Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const GUARD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "hooks", "guard.mjs");
const BUILDER = "easyone-orchestrator:builder";

function project(config = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "guard-loops-"));
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, stdio: "ignore" });
  git("init", "-q", "-b", "feature/pru-1-alta");
  writeFileSync(path.join(dir, ".orchestrator.json"), JSON.stringify({ roles: { builder: { onStop: [] } }, ...config }));
  writeFileSync(path.join(dir, ".gitignore"), ".orchestrator/\n.orchestrator.json\n");
  git("add", ".gitignore");
  git("commit", "-q", "-m", "inicio");
  const guard = (event) => spawnSync("node", [GUARD], { input: JSON.stringify({ cwd: dir, ...event }), encoding: "utf8" });
  return {
    dir,
    guard,
    hasBreaker: () => existsSync(path.join(dir, ".orchestrator", "work", "breaker.json")),
    breaker: () => JSON.parse(readFileSync(path.join(dir, ".orchestrator", "work", "breaker.json"), "utf8")),
  };
}

// A command that exited 0, with what it printed: a failing test behind `| tail`.
const ran = (p, command, stdout, id = "a1") => p.guard({ hook_event_name: "PostToolUse", tool_name: "Bash", agent_id: id,
  agent_type: BUILDER, tool_input: { command }, tool_response: { stdout, stderr: "", interrupted: false } });
const failed = (p, command, error, id = "a1") => p.guard({ hook_event_name: "PostToolUseFailure", tool_name: "Bash", agent_id: id,
  agent_type: BUILDER, tool_input: { command }, error });
const before = (p, command, id = "a1") => p.guard({ hook_event_name: "PreToolUse", tool_name: "Bash", agent_id: id,
  agent_type: BUILDER, tool_input: { command } });
const context = (r) => (r.stdout ? JSON.parse(r.stdout).hookSpecificOutput?.additionalContext ?? "" : "");

const goFail = (got, ms = "0.01") => [
  `    --- FAIL: TestNotes/[PRU-1.1]_rechaza_un_NIF_vacío (${ms}s)`,
  `        notes_test.go:42: got ${got}, want 422`,
  "FAIL",
  `FAIL\tgithub.com/hyliacom/easyone/modules/notes\t${ms}s`,
].join("\n");
const TEST = "pnpm test:go -run TestNotes ./modules/notes 2>&1 | tail -20";

test("un test que falla detrás de | tail cuenta, aunque el comando salga con 0, y el builder lo sabe", () => {
  const p = project();
  const r = ran(p, TEST, goFail(404));
  assert.equal(r.status, 0);
  assert.match(context(r), /exited 0.*pipe hid/s);
  assert.equal(p.breaker().failures.a1.checks.failed, 1);
});

test("el mismo fallo tres veces en la ejecución para los checks del builder, con cualquier comando", () => {
  const p = project();
  ran(p, TEST, goFail(404, "0.01"));
  const second = ran(p, `${TEST.replace("tail -20", "tail -40")}`, goFail(404, "0.53"));
  assert.match(context(second), /once more/, "avisa antes de parar");
  assert.equal(before(p, TEST).status, 0, "dos veces no para");
  ran(p, "pnpm test:go -v -run TestNotes ./modules/notes | grep -E 'FAIL|ok'", goFail(404, "0.61"));
  for (const command of [TEST, "go test ./modules/notes", "pnpm --filter @easyone/panel exec vitest run"]) {
    const r = before(p, command);
    assert.equal(r.status, 2, command);
    assert.match(r.stderr, /came back 3 times in this run.*TestNotes\/\[PRU-1\.1\].*report BLOCKED/s);
  }
  assert.equal(before(p, "git diff --stat").status, 0, "lo que no es un check sigue permitido");
  assert.equal(before(p, TEST, "a2").status, 0, "otro builder no hereda la cuenta");
});

test("un fallo que vuelve entre otros también es el mismo fallo", () => {
  const p = project();
  for (const got of [404, 500, 404, 500]) ran(p, TEST, goFail(got));
  assert.equal(before(p, TEST).status, 0);
  ran(p, TEST, goFail(404));
  assert.equal(before(p, TEST).status, 2);
});

test("un fallo que cambia de motivo es otro fallo: el rojo y los intentos no se suman como el mismo", () => {
  const p = project();
  for (const got of [404, 500, 200, 201]) ran(p, TEST, goFail(got));
  assert.equal(before(p, TEST).status, 0);
});

test("diez checks fallidos en una ejecución paran los checks; maxFailedChecks lo cambia y 0 lo apaga", () => {
  const p = project();
  for (let i = 0; i < 9; i++) ran(p, TEST, goFail(400 + i));
  assert.equal(before(p, TEST).status, 0);
  const last = ran(p, TEST, goFail(499));
  assert.match(context(last), /10 of 10/);
  const r = before(p, TEST);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /10 checks failed in this run.*report BLOCKED/s);

  const loose = project({ verify: { maxFailedChecks: 0 } });
  for (let i = 0; i < 12; i++) ran(loose, TEST, goFail(400 + i));
  assert.equal(before(loose, TEST).status, 0);
  const tight = project({ verify: { maxFailedChecks: 2 } });
  ran(tight, TEST, goFail(401));
  ran(tight, TEST, goFail(402));
  assert.equal(before(tight, TEST).status, 2);
});

test("un check que pasa no cuenta, ni lo que no es un check aunque imprima FAIL", () => {
  const p = project();
  ran(p, TEST, "ok  \tgithub.com/hyliacom/easyone/modules/notes\t0.532s");
  ran(p, "grep -rn FAIL modules/notes", "modules/notes/notes_test.go:12:// FAIL\tsi el NIF está vacío");
  assert.ok(!p.hasBreaker() || !p.breaker().failures?.a1?.checks);
});

test("los fallos con código de salida también cuentan como checks", () => {
  const p = project();
  for (let i = 0; i < 3; i++) failed(p, "go test ./modules/notes", `Exit code 1\n${goFail(404, `0.${i + 1}`)}`);
  assert.equal(before(p, "pnpm test:go ./modules/notes").status, 2);
});

test("reanudar el builder empieza la cuenta de nuevo", () => {
  const p = project();
  for (let i = 0; i < 3; i++) ran(p, TEST, goFail(404));
  assert.equal(before(p, TEST).status, 2);
  // It reports BLOCKED and stops; the orchestrator resumes it with a new idea.
  p.guard({ hook_event_name: "SubagentStop", agent_id: "a1", agent_type: BUILDER, stop_hook_active: false });
  p.guard({ hook_event_name: "PreToolUse", tool_name: "SendMessage", tool_input: { to: "a1", message: "sigue" } });
  assert.equal(before(p, TEST).status, 0);
});

test("fuera de un builder, la salida de un test no deja rastro", () => {
  const p = project();
  const r = p.guard({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: TEST },
    tool_response: { stdout: goFail(404) } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.ok(!p.hasBreaker());
});

test("un check de onStop que se cuelga se corta a su tiempo, con sus procesos hijos", () => {
  // A check that starts a child that never ends, as a test runner waiting on a server does.
  const hang = `node -e "require('child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)'], { stdio: 'inherit' }); setTimeout(() => {}, 120000)"`;
  const p = project({ roles: { builder: { onStop: [hang] } }, verify: { checkTimeout: 2 } });
  const started = Date.now();
  const r = p.guard({ hook_event_name: "SubagentStop", agent_id: "a1", agent_type: BUILDER, stop_hook_active: false });
  const seconds = (Date.now() - started) / 1000;
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /did not finish in 2 s/);
  assert.ok(seconds < 20, `tardó ${seconds} s`);
});

test("un check de onStop que falla sigue diciendo su salida", () => {
  const p = project({ roles: { builder: { onStop: ["node -e \"console.log('--- FAIL: TestX'); process.exit(1)\""] } } });
  const r = p.guard({ hook_event_name: "SubagentStop", agent_id: "a1", agent_type: BUILDER, stop_hook_active: false });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /failed\. Fix it, or report it as ❌ with this output:\n.*--- FAIL: TestX/s);
});
