// The guard compares real paths: a project opened through a link, or macOS's /var (really /private/var),
// must not slip past a lock or the breaker, nor make a builder's own files look outside its workspace.
// Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const GUARD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "hooks", "guard.mjs");
const BUILDER = "easyone-orchestrator:backend-builder";
// Creating a link on Windows needs privileges most machines lack.
const skip = process.platform === "win32" ? "los enlaces simbólicos piden permisos en Windows" : false;

// A project with a locked test, reached through a link in another folder.
function linkedProject() {
  const dir = mkdtempSync(path.join(tmpdir(), "guard-real-"));
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, stdio: "ignore" });
  git("init", "-q", "-b", "story/PRU-1");
  writeFileSync(path.join(dir, ".orchestrator.json"), JSON.stringify({
    roles: { "backend-builder": { paths: ["apps/api/"], onStop: [] } },
  }));
  mkdirSync(path.join(dir, "apps", "api"), { recursive: true });
  writeFileSync(path.join(dir, "apps", "api", "nif_test.go"), "package api\n");
  mkdirSync(path.join(dir, ".orchestrator", "locked"), { recursive: true });
  writeFileSync(path.join(dir, ".orchestrator", "locked", "PRU-1-back.txt"), "apps/api/nif_test.go\n");
  git("add", ".");
  git("commit", "-q", "-m", "inicio");
  const link = path.join(mkdtempSync(path.join(tmpdir(), "guard-real-link-")), "proyecto");
  symlinkSync(dir, link, "dir");
  const guard = (event) => spawnSync("node", [GUARD], { input: JSON.stringify({ cwd: link, ...event }), encoding: "utf8" });
  return { link, guard };
}

test("a través de un enlace, un test bloqueado sigue bloqueado", { skip }, () => {
  const p = linkedProject();
  const write = p.guard({ hook_event_name: "PreToolUse", tool_name: "Write", agent_type: BUILDER,
    tool_input: { file_path: path.join(p.link, "apps", "api", "nif_test.go"), content: "package api\n" } });
  assert.equal(write.status, 2, write.stderr);
  assert.match(write.stderr, /locked acceptance test/);
  const rm = p.guard({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "rm apps/api/nif_test.go" } });
  assert.equal(rm.status, 2, rm.stderr);
  assert.match(rm.stderr, /locked acceptance test/);
});

test("a través de un enlace, nadie toca el fichero del cortocircuito", { skip }, () => {
  const p = linkedProject();
  const r = p.guard({ hook_event_name: "PreToolUse", tool_name: "Write",
    tool_input: { file_path: path.join(p.link, ".orchestrator", "work", "breaker.json"), content: "{}" } });
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /guard's own count/);
});

test("a través de un enlace, el builder escribe en sus rutas sin salirse de su espacio", { skip }, () => {
  const p = linkedProject();
  const r = p.guard({ hook_event_name: "PreToolUse", tool_name: "Write", agent_type: BUILDER,
    tool_input: { file_path: path.join(p.link, "apps", "api", "nif.go"), content: "package api\n" } });
  assert.equal(r.status, 0, r.stderr);
  const out = p.guard({ hook_event_name: "PreToolUse", tool_name: "Write", agent_type: BUILDER,
    tool_input: { file_path: path.join(p.link, "apps", "web", "x.ts"), content: "" } });
  assert.equal(out.status, 2, "fuera de sus rutas sigue bloqueado");
  assert.match(out.stderr, /edits only apps\/api\//);
});
