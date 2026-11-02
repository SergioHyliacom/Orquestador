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
- Los tests bloqueados: \`.orchestrator/locked/<ID>-<lado>.txt\`.
- Comandos: \`pnpm lint\`, \`pnpm install\`, \`pnpm --filter e2e exec playwright install\`, \`pnpm run build\` y \`pnpm gen:spec\`.
`;

function project({ contextDocs } = {}) {
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
  writeFileSync(path.join(p.dir, "docs", "rules", "backend.md"), "- **R-02** El módulo de referencia: `apps/api/internal/modules/notes/module.go`.\n");
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "add", "docs/rules/backend.md"], { cwd: p.dir, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "regla"], { cwd: p.dir, stdio: "ignore" });
  p.remove("apps/api/internal/modules/notes/module.go");
  const r = p.run("--check");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/rules\/backend\.md:1: names apps\/api\/internal\/modules\/notes\/module\.go, which does not exist/);
});

test("sin contextDocs no se revisa ningún texto", () => {
  const p = project();
  assert.equal(p.run("--check").status, 0);
});
