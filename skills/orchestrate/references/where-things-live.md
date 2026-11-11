# Where each thing lives

1. **Every fact has one home.** Everything else links to it and never copies it.
2. **What a machine can check is not written as prose.** It becomes a check, and its message cites the norm it enforces.
3. **The project's documents bind; this plugin adds nothing to them.** What binds in EASY One is in the project, not here (below, "The project's norms"). The plugin's method is yours alone and never enters the repository.
4. **Shared files change through a pull request** that another person approves. Generated files are never edited by hand. Your files never travel.
5. **A conversation is not documentation.** What two people agree, in a pull request comment or anywhere else, goes into the story, an ADR or the document it belongs to.

| What | Where |
|---|---|
| What binds: decisions, architecture, stack, security | `docs/definicion.md` (section 14 and sections 9, 10 and 12) and the accepted ADRs in `docs/adr/` |
| What the product does at the start (flows, screens) | `docs/definicion.md` (sections 4, 6, 7 and 8), as the starting intention; design and product change it without touching the definition |
| How to work: branches, commits, pull requests, checks, tests | `CONTRIBUTING.md` |
| How the code is written | `CODING_STANDARDS.md`, with its checklist (ARCH-1, GO-1, TS-1…), and the «Reglas que no se negocian» of `CLAUDE.md`; what a machine checks, in the linters' configuration and CI |
| How each module or app works today | its README (`modules/<id>/README.md`, `apps/<app>/README.md`), updated in the same pull request as the code. `modules/example` is the pattern every module copies |
| The context of every session | the project's `CLAUDE.md` |
| The code graph | its configuration in the repository (`.mcp.json`, server `code-review-graph`); the graph on each machine, never committed |
| What a story asks for | gg-ez, where the stories are written; here, on your machine, `<storiesDir>/stories/` |
| What a screen looks like (the design) | Figma, linked from the module's or app's README, and the design repo, cloned on each machine and read with `design-source.mjs`; never copied or edited here |
| Where that clone is, and which design each story was ported at | the Claude config folder of each machine (`easyone-design-source.json` and `.ledger.json`) |
| Where each story stands | its branch, its lock list and `<storiesDir>/map.md`, generated |
| Plugs, locked tests, the risk map and its reasons, audits | `.orchestrator.json`, `.orchestrator/locked/`, `.orchestrator/risk-map.md`, `.orchestrator/audits/` |
| Your ledger, briefs and reports | `.orchestrator/state.md`, `.orchestrator/work/` |

Everything under `.orchestrator/` and `.orchestrator.json` is yours, on this machine, excluded with `.git/info/exclude`: the team does not see it, and nothing in the repository names it. `<storiesDir>` is `.orchestrator.json` → `storiesDir`, inside `.orchestrator/`.

## The project's norms

There is no `docs/rules/` and no rule IDs of the plugin's own: the norms are the project's documents, and an agent cites them by document and section (`CONTRIBUTING.md` «Tests obligatorios»), by checklist ID (`CODING_STANDARDS.md` ARCH-3), by ADR (`ADR 0012`) or by decision (`D2`). The patterns a brief cites under "Read first" are the module template (`modules/example` and its README) and the code the work touches.

## Where do I write this?

Ask in this order and stop at the first match:

1. Behaviour a person notices? → a criterion of its story.
2. A choice of architecture, or anything in the ADR list of `CONTRIBUTING.md` («Cuándo hace falta un ADR»)? → an ADR, proposed to your human; the technical lead accepts it. When it changes section 14 or sections 9, 10 or 12, `docs/definicion.md` changes in the same pull request (the version in its header and a row in its change log).
3. How the code must be written? → a machine check; else a line in `CODING_STANDARDS.md` (or `CONTRIBUTING.md` for how to work); else the module template. Always proposed to your human first, then a pull request another person approves.
4. How a module or app works, or how to run it? → its README; the whole project, `README.md` and `CONTRIBUTING.md`.
5. None of these → it is not written down.

The builders never edit those documents. You do, through a pull request, and the project asks your human before any edit of `docs/definicion.md` or `docs/adr/`. A behaviour is never a norm: it is a criterion.

## The context is the code

You learn the project from what is built and from its documents: the module's README, the code the work touches, the norms, the stories and the ADRs. Read only what the work needs: `docs/definicion.md` by sections, with the table «Qué leer según la tarea» of `CLAUDE.md`, never whole.

When a description of how the code works (a README, a convention, a command) disagrees with the code, follow the code, list the inconsistencies, and offer your human a `feature/` or `fix/` pull request that fixes the text. What binds is the exception: code that breaks `CODING_STANDARDS.md`, `CONTRIBUTING.md`, an accepted ADR or a story's criterion is a broken norm or a failing criterion, never something to copy.

Part of that rot a machine catches, once the session names the texts. `.orchestrator.json` → `contextDocs` lists them (`["CLAUDE.md", "README.md", "CONTRIBUTING.md", "CODING_STANDARDS.md", "modules/*/README.md", "apps/*/README.md"]`); without it nothing is checked, and `stories.mjs --check` says so on every run. With it, `--check` fails when one of those texts names a path or a `pnpm` script that no longer exists, in backticks or in a shell code block. It checks a `pnpm` script only where nothing else can be meant (`pnpm run <x>`, or a name with a colon such as `pnpm test:go`), since a bare `pnpm <x>` may run a dependency's binary. A stale text is offered to your human as a pull request; `stories.mjs` runs only in your session, never in the pipeline. A contradiction of meaning (a text that says one thing while the code does another) no check sees: that is the rule above and the delivery audit.

Who depends on a piece of code is the code graph's question, not grep's («Grafo de código» of `CLAUDE.md`). The builders cite its callers in their report, and the reviewer starts from what it says a commit reaches outside its diff.
