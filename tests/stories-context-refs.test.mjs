// stories.mjs and contextDocs: the texts every session reads name only paths and pnpm scripts that exist.
// Run with: node --test "tests/*.test.mjs"
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const STORIES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "stories.mjs");

// What a project's CLAUDE.md might say: real paths, a removed script, generated and personal files, branch names,
// placeholders and pnpm commands, some of them stale.
const CLAUDE_MD = `# Proyecto

- El validador: \`node product/stories.mjs\`, que ya no está en el proyecto.
- La API está en \`apps/api/\`, y su módulo de referencia en \`apps/api/internal/modules/notes/module.go\`.
- El mapa, \`product/map.md\`, se genera y no se sube; lo personal va en \`.orchestrator/me.json\`.
- Las ramas: \`origin/develop\`, \`story/<ID>\` y \`chore/check-*\`.
- Los tests bloqueados: \`.orchestrator/locked/<ID>.txt\`.
- Comandos: \`pnpm lint\`, \`pnpm install\`, \`pnpm --filter e2e exec playwright install\`, \`pnpm run build\` y \`pnpm gen:spec\`.
`;

function project({ contextDocs, files = {} } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "stories-refs-"));
  const write = (rel, text) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), text); };
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, stdio: "ignore" });
  write(".orchestrator.json", JSON.stringify({ storiesDir: "product", git: { integrationBranch: "develop" }, contextDocs }));
  write(".gitignore", "product/map.md\n.orchestrator/me.json\n");
  write("product/activities.json", "[]");
  write("product/stories.config.json", JSON.stringify({ releases: ["Entrega 1"], idPrefix: "PRU" }));
  mkdirSync(path.join(dir, "product", "stories"), { recursive: true });
  write("apps/api/internal/modules/notes/module.go", "package notes\n");
  write("package.json", JSON.stringify({ scripts: { lint: "x", build: "x" } }));
  write("CLAUDE.md", CLAUDE_MD);
  write("docs/rules/comunes.md", "- **R-01** Las reglas viven en `docs/rules/comunes.md`.\n");
  for (const [rel, text] of Object.entries(files)) write(rel, text);
  git("init", "-q", "-b", "develop");
  git("add", ".");
  git("commit", "-q", "-m", "base");
  const env = { ...process.env };
  delete env.BITBUCKET_BRANCH;
  delete env.CI;
  return {
    dir,
    remove: (rel) => { rmSync(path.join(dir, rel)); git("rm", "-q", "--cached", rel); git("commit", "-q", "-m", `quita ${rel}`); },
    run: (...args) => spawnSync("node", [STORIES, ...args], { cwd: dir, env, encoding: "utf8" }),
  };
}

const problems = (r) => r.stderr.split(/\r?\n/).filter((l) => l.startsWith("  - ")).map((l) => l.slice(4));

test("una ruta o un script pnpm que ya no existen fallan --check, con su fichero y su línea", () => {
  const p = project({ contextDocs: ["CLAUDE.md", "docs/rules/*.md"] });
  const r = p.run("--check");
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(problems(r), [
    "CLAUDE.md:3: names product/stories.mjs, which does not exist. Fix the text, or remove it if the code already says it.",
    "CLAUDE.md:8: names `pnpm gen:spec`, and package.json has no script gen:spec. Fix the text, or remove it if the code already says it.",
  ]);
});

test("un texto al día no da problemas", () => {
  const p = project({ contextDocs: ["docs/rules/*.md"] });
  const r = p.run("--check");
  assert.equal(r.status, 0, r.stderr);
});

test("cuando el código se mueve, el texto que lo nombra caduca en esa misma rama", () => {
  const p = project({ contextDocs: ["docs/rules/*.md"] });
  assert.equal(p.run("--check").status, 0);
  p.remove("docs/rules/comunes.md");
  writeFileSync(path.join(p.dir, "docs", "rules", "api.md"), "- **R-02** El módulo de referencia: `apps/api/internal/modules/notes/module.go`.\n");
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "add", "docs/rules/api.md"], { cwd: p.dir, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "regla"], { cwd: p.dir, stdio: "ignore" });
  p.remove("apps/api/internal/modules/notes/module.go");
  const r = p.run("--check");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/rules\/api.md:1: names apps\/api\/internal\/modules\/notes\/module\.go, which does not exist/);
});

test("sin contextDocs no se revisa ningún texto, y --check lo dice", () => {
  const p = project();
  const r = p.run("--check");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /no contextDocs, so no text is checked/);
});

test("una entrada de contextDocs que no corresponde a ningún fichero falla --check", () => {
  const p = project({ contextDocs: ["claude.md", "docs/rules/*.md"] });
  const r = p.run("--check");
  assert.equal(r.status, 1);
  assert.deepEqual(problems(r), [".orchestrator.json: contextDocs → claude.md matches no file in the repository. Fix the entry: until then those texts are not checked."]);
});

test("un texto que git tiene y el disco no, no tumba el validador", () => {
  const p = project({ contextDocs: ["docs/rules/*.md"], files: { "docs/rules/api.md": "- **R-02** `apps/api/`\n" } });
  rmSync(path.join(p.dir, "docs", "rules", "api.md"));
  const r = p.run("--check");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /map\.md written/);
});

test("pnpm solo caduca cuando no puede ser otra cosa que un script", () => {
  const p = project({ contextDocs: ["docs/comandos.md"], files: { "docs/comandos.md": [
    "Binarios y comandos de pnpm: `pnpm vitest run`, `pnpm tsc --noEmit`, `pnpm eslint .`, `pnpm approve-builds`, `pnpm dedupe`.",
    "Un script que ya no está: `pnpm run typecheck`.",
  ].join("\n") } });
  assert.deepEqual(problems(p.run("--check")), [
    "docs/comandos.md:2: names `pnpm run typecheck`, and package.json has no script typecheck. Fix the text, or remove it if the code already says it.",
  ]);
});

test("los marcadores, las rutas con espacios y las rutas con tildes", () => {
  const p = project({ contextDocs: ["docs/rutas.md"], files: {
    "docs/Mi carpeta/guia.md": "guía\n",
    "docs/decisiones/DEC-002-cuentas.md": "decisión\n",
    "docs/rutas.md": [
      "El código va en `apps/api/...`, la guía en `docs/Mi carpeta/guia.md`.",
      "La decisión: `docs/decisiones/DEC-001-autenticación.md`.",
    ].join("\n"),
  } });
  assert.deepEqual(problems(p.run("--check")), [
    "docs/rutas.md:2: names docs/decisiones/DEC-001-autenticación.md, which does not exist. Fix the text, or remove it if the code already says it.",
  ]);
});

test("un texto anidado busca sus rutas junto a él, y sus scripts en su package.json", () => {
  const p = project({ contextDocs: ["**/CLAUDE.md"], files: {
    "apps/web/package.json": JSON.stringify({ scripts: { "gen:client": "x" } }),
    "apps/web/docs/arquitectura.md": "arquitectura\n",
    "apps/web/src/app.tsx": "export {}\n",
    "apps/web/CLAUDE.md": "Lee `docs/arquitectura.md` y `src/app.tsx`; no `src/main.tsx`. Genera con `pnpm gen:client`, no con `pnpm gen:types`.\n",
  } });
  const r = p.run("--check");
  const nested = problems(r).filter((x) => x.startsWith("apps/web/"));
  assert.deepEqual(nested, [
    "apps/web/CLAUDE.md:1: names src/main.tsx, which does not exist. Fix the text, or remove it if the code already says it.",
    "apps/web/CLAUDE.md:1: names `pnpm gen:types`, and apps/web/package.json has no script gen:types. Fix the text, or remove it if the code already says it.",
  ]);
});

test("las mayúsculas cuentan igual en Windows, macOS y el pipeline", () => {
  const p = project({ contextDocs: ["docs/indice.md"], files: { "docs/indice.md": "Las reglas: `docs/rules/Comunes.md`.\n" } });
  assert.deepEqual(problems(p.run("--check")), [
    "docs/indice.md:1: names docs/rules/Comunes.md, and git has docs/rules/comunes.md: the case differs, and the pipeline will not find it. Fix the text, or remove it if the code already says it.",
  ]);
});

test("un fichero que solo está en el disco se avisa como no subido", () => {
  const p = project({ contextDocs: ["docs/indice.md"], files: { "docs/indice.md": "Lo nuevo: `docs/nuevo.md`.\n" } });
  writeFileSync(path.join(p.dir, "docs", "nuevo.md"), "sin commit\n");
  assert.deepEqual(problems(p.run("--check")), [
    "docs/indice.md:1: names docs/nuevo.md, which is not committed: commit it, or add it to .gitignore if it is generated. Fix the text, or remove it if the code already says it.",
  ]);
});

test("se leen los bloques de shell y cada comando de una cadena; los demás bloques no", () => {
  const p = project({ contextDocs: ["docs/arranque.md"], files: {
    "apps/api/package.json": JSON.stringify({ scripts: { "gen:spec": "x" } }),
    "docs/arranque.md": [
      "```bash",
      "# El validador antiguo",
      "$ node product/stories.mjs --check",
      "cd apps/api && pnpm gen:spec && pnpm gen:docs",
      "```",
      "```go",
      "// apps/api/internal/no/existe.go",
      "```",
      "```",
      "apps/api/internal/tampoco.go: no such file",
      "```",
    ].join("\n"),
  } });
  assert.deepEqual(problems(p.run("--check")), [
    "docs/arranque.md:3: names product/stories.mjs, which does not exist. Fix the text, or remove it if the code already says it.",
    "docs/arranque.md:4: names `pnpm gen:docs`, and apps/api/package.json has no script gen:docs. Fix the text, or remove it if the code already says it.",
  ]);
});
