// Who may write and who may commit. Only the orchestrator commits: a subagent's commit would skip the session's
// evidence check and start the breaker's count again. Only builders and the roles .orchestrator.json gives paths
// to write, and only there: any other subagent only reads, whatever its name.
// Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const GUARD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "hooks", "guard.mjs");
const BUILDER = "easyone-orchestrator:builder";

function project(roles = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "guard-roles-"));
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, stdio: "ignore" });
  git("init", "-q", "-b", "story/PRU-1");
  writeFileSync(path.join(dir, ".orchestrator.json"), JSON.stringify({
    roles: { "builder": { paths: ["apps/api/"], onStop: [] }, ...roles },
  }));
  mkdirSync(path.join(dir, "apps", "api"), { recursive: true });
  mkdirSync(path.join(dir, "locales"), { recursive: true });
  writeFileSync(path.join(dir, "apps", "api", "nif.go"), "package api\n");
  writeFileSync(path.join(dir, "locales", "es.json"), "{}\n");
  git("add", ".");
  git("commit", "-q", "-m", "inicio");
  const guard = (event) => spawnSync("node", [GUARD], { input: JSON.stringify({ cwd: dir, ...event }), encoding: "utf8" });
  const write = (agent_type, rel) => guard({ hook_event_name: "PreToolUse", tool_name: "Write", agent_type,
    tool_input: { file_path: path.isAbsolute(rel) ? rel : path.join(dir, rel), content: "x\n" } });
  const bash = (agent_type, command) => guard({ hook_event_name: "PreToolUse", tool_name: "Bash", agent_type, tool_input: { command } });
  return { dir, guard, write, bash };
}

test("ningún subagente hace commit; la sesión sí", () => {
  const p = project();
  for (const command of ["git commit -m x", "rtk git commit -m x apps/api/nif.go", "git pull --rebase", "git cherry-pick abc123", "git revert HEAD"]) {
    const r = p.bash(BUILDER, command);
    assert.equal(r.status, 2, `${command}: ${r.stderr}`);
    assert.match(r.stderr, /only the orchestrator commits/);
  }
  const session = p.bash(undefined, "git commit -m x");
  assert.equal(session.status, 0, session.stderr);
  const reads = p.bash(BUILDER, "git status && git diff");
  assert.equal(reads.status, 0, reads.stderr);
});

test("un rol del proyecto sin rutas solo lee, se llame como se llame", () => {
  const p = project();
  for (const role of ["translator", "general-purpose", "data-engineer"]) {
    const w = p.write(role, "locales/es.json");
    assert.equal(w.status, 2, `${role}: ${w.stderr}`);
    assert.match(w.stderr, /is read-only/);
    const report = p.write(role, ".orchestrator/work/PRU-1/informe.md");
    assert.equal(report.status, 0, `${role} escribe su informe: ${report.stderr}`);
    const add = p.bash(role, "git add locales/es.json");
    assert.equal(add.status, 2, `${role}: ${add.stderr}`);
  }
});

test("un rol del proyecto con rutas escribe solo en ellas", () => {
  const p = project({ translator: { paths: ["locales/"] }, "security-reviewer": { paths: ["apps/api/"] } });
  const inside = p.write("translator", "locales/en.json");
  assert.equal(inside.status, 0, inside.stderr);
  const outside = p.write("translator", "apps/api/nif.go");
  assert.equal(outside.status, 2, outside.stderr);
  assert.match(outside.stderr, /edits only locales\//);
  // The temporary folder, where these projects live, is open to scratch files: another checkout is not.
  const elsewhere = p.write("translator", path.join(path.parse(p.dir).root, "otro-proyecto", "x.json"));
  assert.equal(elsewhere.status, 2, "fuera de su espacio sigue bloqueado");
  // A role named for judging stays read-only even when the config gives it paths.
  const judge = p.write("security-reviewer", "apps/api/nif.go");
  assert.equal(judge.status, 2, judge.stderr);
  assert.match(judge.stderr, /is read-only/);
});

test("al parar, un rol con rutas responde de lo que tocó fuera de ellas, sin contar en el cortocircuito", () => {
  const p = project({ translator: { paths: ["locales/"] } });
  writeFileSync(path.join(p.dir, "apps", "api", "nif.go"), "package api // tocado\n");
  const stop = p.guard({ hook_event_name: "SubagentStop", agent_id: "t1", agent_type: "translator", agent_transcript_path: "" });
  assert.equal(stop.status, 2, stop.stderr);
  assert.match(stop.stderr, /edits only locales\/.*apps\/api\/nif\.go/s);
  assert.equal(existsSync(path.join(p.dir, ".orchestrator", "work", "breaker.json")), false, "un rol que no es builder no cuenta ejecuciones");
});
