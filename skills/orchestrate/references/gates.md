# Gates

What judges a change stays out of that change's reach. A role agent does not loosen the configuration, the norms or the checks its work is judged by, and a branch does not switch a check off in its own code. Each gate has a mode in `.orchestrator.json` → `gates`:

- `observe`, the default: it blocks nothing and records what it would have blocked, so its false positives show before anyone is stopped by them.
- `enforce`: it blocks.
- `off`: neither.

| Gate | What it holds | Who checks it | Where it records |
|---|---|---|---|
| `protected` | No role agent changes `.orchestrator.json` or the project's norms (`CONTRIBUTING.md`, `CODING_STANDARDS.md`, `CLAUDE.md`, `docs/definicion.md`, `docs/adr/`), on any branch. On a story's branch (`feature/<id>-…`, `fix/<id>-…`) or a `hotfix/`, it does not change the configuration of a check either: the pipeline, the git hooks, the linters, the test runners. Outside the stories (`feature/<slug>`, `fix/<slug>`) that configuration can be the work itself. `gates.protectedPaths` replaces that list of checks. | The guard: at each edit, and when the agent stops, on the diff and on `.orchestrator.json` against its copy from the launch, whatever tool wrote them | `.orchestrator/work/gates.log`: one line per event, with when, the gate, `observed` or `blocked`, the agent, the branch and the file |
| `suppressions` | A branch does not add a line that switches a check off: `eslint-disable`, `biome-ignore`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `//nolint`, `t.Skip`, or a skipped or focused test (`.skip`, `.skipIf`, `.only`, `.fixme`, `xit`, `fit`). Only the lines the branch adds count, only in code files. | `stories.mjs --check` and `--pr` | Their output |

**A subagent is held to `.orchestrator.json` as it was when you launched or resumed it.** The guard keeps a copy at each launch; the copy in the tree is one the agent could edit, and git does not keep it. Deleting the file does not switch the guard off. So finish your edits to `.orchestrator.json` before you brief an agent. Your own session reads the tree.

## A suppression that must stay

The builder writes a suppression only when nothing else works, with its reason in the tool's own syntax (`//nolint:gosec // G101: …`), and reports it under Concerns with the file, the line and why. Take it to your human with that reason, before the commit. On their ok, record it in `.orchestrator/suppressions.json`, yours like everything under `.orchestrator/`, one entry per line:

```json
[{ "file": "internal/migrate/database.go", "line": "if _, err := admin.Exec(ctx, stmt); err != nil { //nolint:gocritic // DDL con identificadores saneados", "reason": "DDL con identificadores saneados", "ok": "2026-11-17" }]
```

`line` is the added line as it reads, so the ok covers that line and no other. Only your session writes that file: the guard blocks a role agent's edit, and tells you at its stop if one changed it anyway. Without the entry, an enforced gate fails `--check` and `--pr`. Without your human's ok, the same builder removes the suppression.

## From observe to enforce

At each close (`SKILL.md` §4), read the lines `gates.log` gained since the previous close, and what `--check` listed under `gates.suppressions`. Tell your human what each gate would have blocked, bad news first: a real problem it caught, or a false positive and why. A false positive is fixed in the gate: a path in `gates.protectedPaths`, or a pattern. When a gate's record holds only real problems over a few blocks of work, offer your human to switch it to `enforce` in `.orchestrator.json`.
