// The guard's breaker: builder runs without a commit, and the same failure in a row inside one run.
// Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const GUARD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "hooks", "guard.mjs");
const BUILDER = "easyone-orchestrator:backend-builder";

function project() {
  const dir = mkdtempSync(path.join(tmpdir(), "guard-breaker-"));
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, stdio: "ignore" });
  git("init", "-q", "-b", "story/PRU-1");
  writeFileSync(path.join(dir, ".orchestrator.json"), JSON.stringify({
    roles: { "backend-builder": { paths: ["apps/api/"], onStop: [] } },
  }));
  writeFileSync(path.join(dir, ".gitignore"), ".orchestrator/work/\n");
  git("add", ".orchestrator.json", ".gitignore");
  git("commit", "-q", "-m", "inicio");
  const transcripts = mkdtempSync(path.join(tmpdir(), "guard-breaker-transcripts-"));
  return {
    dir,
    commit: () => { writeFileSync(path.join(dir, "x.txt"), String(Math.random())); git("add", "x.txt"); git("commit", "-q", "-m", "x"); },
    guard: (event) => spawnSync("node", [GUARD], { input: JSON.stringify({ cwd: dir, ...event }), encoding: "utf8" }),
    breaker: () => JSON.parse(readFileSync(path.join(dir, ".orchestrator", "work", "breaker.json"), "utf8")),
    hasBreaker: () => existsSync(path.join(dir, ".orchestrator", "work", "breaker.json")),
    // A builder's transcript: the brief, then its report through the handback.
    transcript: (report, minutesAgo = 5) => {
      const file = path.join(transcripts, `${Math.random()}.jsonl`);
      const at = new Date(Date.now() - minutesAgo * 60000).toISOString();
      writeFileSync(file, [
        { type: "user", timestamp: at, message: { role: "user", content: "Brief: .orchestrator/work/PRU-1/brief-back-1.md" } },
        { type: "assistant", timestamp: at, message: { content: [{ type: "tool_use", name: "SubagentHandback", input: { message: report } }] } },
      ].map((l) => JSON.stringify(l)).join("\n"));
      return file;
    },
  };
}

const stop = (p, id, report, extra = {}) => p.guard({ hook_event_name: "SubagentStop", agent_id: id, agent_type: BUILDER,
  stop_hook_active: false, agent_transcript_path: p.transcript(report), ...extra });
const launch = (p, subagent_type = BUILDER) => p.guard({ hook_event_name: "PreToolUse", tool_name: "Agent",
  tool_input: { subagent_type, description: "backend-builder-PRU-1", prompt: "brief" } });
const resume = (p, to) => p.guard({ hook_event_name: "PreToolUse", tool_name: "SendMessage", tool_input: { to, message: "sigue" } });
const asks = (r) => r.status === 0 && r.stdout.includes('"permissionDecision":"ask"');
const fail = (p, id, command, error) => p.guard({ hook_event_name: "PostToolUseFailure", tool_name: "Bash", agent_id: id,
  agent_type: BUILDER, tool_input: { command }, error });
const run = (p, id, command) => p.guard({ hook_event_name: "PreToolUse", tool_name: "Bash", agent_id: id,
  agent_type: BUILDER, tool_input: { command } });

test("tres ejecuciones sin commit: la cuarta pregunta a la persona", () => {
  const p = project();
  stop(p, "a1", "backend-builder-PRU-1: DONE_WITH_CONCERNS");
  stop(p, "a1", "backend-builder-PRU-1: DONE");
  assert.ok(!asks(launch(p)), "con dos ejecuciones no pregunta");
  stop(p, "a1", "backend-builder-PRU-1: BLOCKED");
  const r = launch(p);
  assert.ok(asks(r), r.stdout + r.stderr);
  assert.match(r.stdout, /backend-builder lleva 3 ejecuciones sin commit en story\/PRU-1 \(DONE_WITH_CONCERNS · DONE · BLOCKED; 15 min\)/);
});

test("reanudar el mismo builder con SendMessage también pregunta; otro agente no", () => {
  const p = project();
  for (let i = 0; i < 3; i++) stop(p, "a1", "backend-builder-PRU-1: DONE");
  assert.ok(asks(resume(p, "a1")));
  const other = resume(p, "researcher-x");
  assert.equal(other.status, 0);
  assert.equal(other.stdout, "");
});

test("un commit pone la cuenta a cero", () => {
  const p = project();
  for (let i = 0; i < 3; i++) stop(p, "a1", "backend-builder-PRU-1: DONE");
  p.commit();
  assert.ok(!asks(launch(p)));
  stop(p, "a1", "backend-builder-PRU-1: DONE");
  assert.equal(p.breaker().runs.length, 1);
});

test("la vuelta que fuerza la guardia al parar es la misma ejecución", () => {
  const p = project();
  stop(p, "a1", "backend-builder-PRU-1: DONE");
  stop(p, "a1", "backend-builder-PRU-1: BLOCKED", { stop_hook_active: true });
  const runs = p.breaker().runs;
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, "BLOCKED");
});

test("los roles que no escriben código no cuentan ni se frenan", () => {
  const p = project();
  for (let i = 0; i < 3; i++) p.guard({ hook_event_name: "SubagentStop", agent_id: "r1", agent_type: "easyone-orchestrator:researcher", stop_hook_active: false });
  assert.ok(!p.hasBreaker());
  for (let i = 0; i < 3; i++) stop(p, "a1", "backend-builder-PRU-1: DONE");
  assert.ok(!asks(launch(p, "easyone-orchestrator:researcher")));
});

test("maxBuilderRuns cambia el límite, y 0 lo apaga", () => {
  const p = project();
  writeFileSync(path.join(p.dir, ".orchestrator.json"), JSON.stringify({ roles: { "backend-builder": { paths: ["apps/api/"], onStop: [] } }, verify: { maxBuilderRuns: 0 } }));
  for (let i = 0; i < 5; i++) stop(p, "a1", "backend-builder-PRU-1: DONE");
  assert.ok(!asks(launch(p)));
});

test("el mismo fallo tres veces seguidas bloquea el cuarto intento del builder", () => {
  const p = project();
  const cmd = "go -C apps/api test ./...";
  fail(p, "a1", cmd, "Exit code 1\n--- FAIL: TestBuscar (0.53s)\nexpected 2 results");
  fail(p, "a1", cmd, "Exit code 1\n--- FAIL: TestBuscar (0.61s)\nexpected 2 results");
  assert.equal(run(p, "a1", cmd).status, 0, "dos fallos no bloquean");
  fail(p, "a1", `${cmd}  `, "Exit code 1\n--- FAIL: TestBuscar (0.48s)\nexpected 2 results");
  const r = run(p, "a1", cmd);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /failed 3 times in a row with the same output.*report BLOCKED/);
  assert.equal(run(p, "a1", "go -C apps/api test -run TestOtro ./...").status, 0, "otro comando sigue permitido");
  assert.equal(run(p, "a2", cmd).status, 0, "otro builder no hereda los fallos");
});

test("un fallo distinto vuelve a empezar la cuenta", () => {
  const p = project();
  const cmd = "pnpm test:ts";
  fail(p, "a1", cmd, "Exit code 1\nexpected 2 results");
  fail(p, "a1", cmd, "Exit code 1\nexpected 2 results");
  fail(p, "a1", cmd, "Exit code 1\ncannot read property id");
  assert.equal(run(p, "a1", cmd).status, 0);
  assert.equal(p.breaker().failures.a1[cmd].times, 1);
});

test("reanudar el builder borra sus fallos seguidos", () => {
  const p = project();
  const cmd = "pnpm test:ts";
  for (let i = 0; i < 3; i++) fail(p, "a1", cmd, "Exit code 1\nexpected 2 results");
  stop(p, "a1", "backend-builder-PRU-1: BLOCKED");
  assert.ok(!asks(resume(p, "a1")));
  assert.equal(run(p, "a1", cmd).status, 0);
});

test("fuera de un builder, un fallo no deja rastro", () => {
  const p = project();
  const r = p.guard({ hook_event_name: "PostToolUseFailure", tool_name: "Bash", tool_input: { command: "pnpm test" }, error: "Exit code 1" });
  assert.equal(r.status, 0);
  assert.ok(!p.hasBreaker());
});

test("nadie edita ni borra el fichero del cortocircuito", () => {
  const p = project();
  stop(p, "a1", "backend-builder-PRU-1: DONE");
  const file = path.join(p.dir, ".orchestrator", "work", "breaker.json");
  const edit = p.guard({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: file, content: "{}" } });
  assert.equal(edit.status, 2);
  for (const command of ["rm .orchestrator/work/breaker.json", "echo {} > .orchestrator/work/breaker.json", "rm -rf .orchestrator/work"]) {
    const r = p.guard({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command } });
    assert.equal(r.status, 2, command);
    assert.match(r.stderr, /guard's own count/);
  }
  mkdirSync(path.join(p.dir, ".orchestrator", "work", "PRU-1"), { recursive: true });
  const report = p.guard({ hook_event_name: "PreToolUse", tool_name: "Write", agent_type: BUILDER,
    tool_input: { file_path: path.join(p.dir, ".orchestrator", "work", "PRU-1", "back-1.md"), content: "informe" } });
  assert.equal(report.status, 0, "el informe del builder sigue permitido");
});
