// What a check's output says: whether it failed and which failure it was, with the output a builder sees after
// trimming it. Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { test } from "node:test";
import { blockedByHook, isCheckCommand, readFailure } from "../hooks/test-output.mjs";

const goFail = ({ ms = "0.01", line = 42, role = "t3fa9c01b", got = 404 } = {}) => [
  "=== RUN   TestNotes/[EO-1.1]_rechaza_un_NIF_vacío",
  `    --- FAIL: TestNotes/[EO-1.1]_rechaza_un_NIF_vacío (${ms}s)`,
  `        notes_test.go:${line}: role ${role}_api: got ${got}, want 422`,
  `--- FAIL: TestNotes (${ms}s)`,
  "FAIL",
  `FAIL\tgithub.com/hyliacom/easyone/modules/notes\t${ms}s`,
].join("\n");

test("go test: el subtest que falla, con su mensaje; la duración, la línea y el rol aleatorio no cambian el fallo", () => {
  const a = readFailure(goFail());
  assert.ok(a.failed);
  assert.ok(a.named.includes("go TestNotes/[EO-1.1]_rechaza_un_NIF_vacío"), a.named.join("\n"));
  const b = readFailure(goFail({ ms: "0.53", line: 47, role: "t9e0b77a2" }));
  assert.equal(b.signature, a.signature);
  assert.notEqual(readFailure(goFail({ got: 500 })).signature, a.signature, "otro motivo es otro fallo");
});

test("go test: un paquete que no compila", () => {
  const r = readFailure([
    "# github.com/hyliacom/easyone/modules/notes",
    "modules/notes/handler.go:12:3: undefined: ValidarNIF",
    "FAIL\tgithub.com/hyliacom/easyone/modules/notes [build failed]",
  ].join("\n"));
  assert.ok(r.failed);
  assert.ok(r.named.some((n) => /undefined: ValidarNIF/.test(n)), r.named.join("\n"));
  assert.ok(r.named.some((n) => /build failed/.test(n)), r.named.join("\n"));
});

test("Vitest recortado con tail: el test que falla y el resumen", () => {
  const out = (ms) => [
    "⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯",
    "",
    " FAIL  src/routes/alta.test.tsx > alta > [ALT-001.2] muestra «Correo ya registrado» bajo el campo",
    "AssertionError: expected 'Crear cuenta' to be 'Correo ya registrado'",
    " ❯ src/routes/alta.test.tsx:88:31",
    "",
    " Test Files  1 failed | 3 passed (4)",
    "      Tests  1 failed | 16 passed (17)",
    `   Duration  ${ms}s (transform 120ms, setup 0ms)`,
  ].join("\n");
  const r = readFailure(out("4.21"));
  assert.ok(r.failed);
  assert.ok(r.named.some((n) => n.includes("[ALT-001.2]")), r.named.join("\n"));
  assert.equal(readFailure(out("6.02")).signature, r.signature);
});

test("lo que pasa no es un fallo", () => {
  for (const out of [
    " ✓ src/routes/alta.test.tsx (17 tests) 812ms\n\n Test Files  4 passed (4)\n      Tests  17 passed (17)",
    "ok  \tgithub.com/hyliacom/easyone/modules/notes\t0.532s",
    "ℹ tests 70\nℹ pass 67\nℹ fail 0\nℹ skipped 3",
    "  12 passed (8.1s)",
    "Checked 412 files in 220ms. No fixes applied.",
  ]) assert.equal(readFailure(out).failed, false, out);
});

test("Playwright: el test que falla, con otro número y otra duración en el segundo intento", () => {
  const out = (n, s) => [
    `  ✘  ${n} [chromium] › e2e/alta.e2e.ts:41:3 › alta › [ALT-001.7] el botón carga mientras se procesa (${s}s)`,
    "",
    "  1 failed",
    `    [chromium] › e2e/alta.e2e.ts:41:3 › alta › [ALT-001.7] el botón carga mientras se procesa`,
    "  11 passed (9.4s)",
  ].join("\n");
  const r = readFailure(out(3, "5.2"));
  assert.ok(r.failed);
  assert.equal(readFailure(out(7, "6.8")).signature, r.signature);
});

test("tsc a través de turbo, y node --test", () => {
  const tsc = readFailure("@easyone/panel:typecheck: src/routes/alta.tsx(252,7): error TS2698: Spread types may only be created from object types.\n@easyone/panel:typecheck:  ELIFECYCLE  Command failed with exit code 2.");
  assert.ok(tsc.named.includes("tsc src/routes/alta.tsx TS2698"), tsc.named.join("\n"));
  const node = readFailure("✖ rechaza un correo repetido (3.1ms)\nℹ tests 4\nℹ pass 3\nℹ fail 1");
  assert.ok(node.failed);
  assert.ok(node.named.includes("node rechaza un correo repetido"), node.named.join("\n"));
});

test("con el código de salida distinto de cero falla aunque la salida no nombre nada", () => {
  const r = readFailure("Exit code 1\nalgo salió mal", { exitFailed: true });
  assert.ok(r.failed);
  assert.match(r.signature, /algo salió mal/);
});

test("el resumen de un fallo sin nombre es la línea que dice que falló, no la última", () => {
  const r = readFailure(" Test Files  1 failed (1)\n      Tests  no tests\n   Start at  12:22:09\n   Duration  1.20s (transform 80ms)");
  assert.ok(r.failed);
  assert.equal(r.summary, "Test Files 1 failed (1)");
});

test("lo que devuelve un comando que otro hook bloqueó no es la salida de nada", () => {
  assert.ok(blockedByHook("PreToolUse:Bash hook error: [node guard.mjs]: orchestrator: a.test.ts is a locked acceptance test."));
  assert.ok(!blockedByHook("Exit code 1\n--- FAIL: TestX"));
});

test("qué comandos son checks", () => {
  for (const c of [
    "pnpm test:go -run TestNotes ./modules/notes 2>&1 | tail -30",
    "cd apps/panel && pnpm exec vitest run src/routes/alta.test.tsx | tail -40",
    "go test -failfast ./modules/...",
    "go -C apps/api test ./...",
    "node --test \"tests/*.test.mjs\"",
    "pnpm --filter @easyone/panel typecheck",
    "pnpm lint",
    "pnpm --filter @easyone/panel exec playwright test e2e/alta.e2e.ts",
    "go run ./tools/literals check",
  ]) assert.ok(isCheckCommand(c), c);
  for (const c of [
    "grep -rn \"FAIL\" apps/panel/src",
    "git log --oneline --grep test",
    "cat apps/panel/src/routes/alta.test.tsx",
    "ls tests",
    "pnpm sqlc generate",
  ]) assert.ok(!isCheckCommand(c), c);
});
