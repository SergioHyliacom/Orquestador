# Where each thing lives

1. **Every fact has one home.** Everything else links to it and never copies it.
2. **What a machine can check is not written as prose.** It becomes a check, whose message cites the rule's ID.
3. **No rule without an origin:** the seed the team agreed at the start, a decision, or a real failure or audit in this project. Never "just in case", never copied from another project.
4. **Shared files change through a pull request.** Generated files are never edited by hand. Personal files never travel.
5. **Jira is not documentation.** It shows who and when; git holds what. What two people agree in a card comment goes into the story, the contract or a decision.

| What | Where |
|---|---|
| What the product does | `<storiesDir>/stories/` |
| The design | Figma; the story links its frames in `screens` |
| References from other apps | Mobbin collections named after the story, outside the repository |
| Where each story stands | its Jira card; `<storiesDir>/map.md`, generated on each machine and never committed |
| A choice of product or architecture | `<storiesDir>/decisions/DEC-NNN-*.md`, from DEC-001 |
| The API contract and the generated client | `contract.spec`, and what `contract.generateClient` writes |
| Rules for every side; one side's rules and patterns | `docs/rules/comunes.md`; `docs/rules/backend.md`, `docs/rules/frontend.md` |
| Code style | the linters' configuration |
| The code graph | its configuration in the repository (`.mcp.json`, server `code-review-graph`); the graph on each machine, never committed |
| Audits | `docs/audits/<delivery>.md` |
| What the product is, the folders, how to run it | `README.md` |
| The context of every session | `CLAUDE.md`, which imports `README.md` and `docs/rules/comunes.md`; the rest is the code |
| Plugs and locked tests | `.orchestrator.json`, `.orchestrator/locked/` |
| Personal files | `.orchestrator/me.json`, `state.md`, `work/`, never committed |

The method lives in this plugin and is never copied into the project. Jira cards carry the title, the sentence and the links, never the criteria. There is no `CONTRIBUTING.md`, `CODING_STANDARDS.md`, `docs/adr/`, documentation site or lessons section in `CLAUDE.md`: do not create them.

## Where do I write this?

Ask in this order and stop at the first match:

1. Behaviour a person notices? → a criterion of its story.
2. A choice between options? → a decision.
3. How the code must be written? → a machine check; else a rule; else a pattern.
4. How to set up or run the project? → `README.md`.
5. None of these → it is not written down.

## Rules

Three levels, strongest first: a **machine check** (a linter setting, an architecture test, a pipeline step); a **written rule** in `docs/rules/`, only when no machine can check it; a **pattern**, reference code the briefs cite under "Read first", listed under *Patterns* in each side's file.

One line per rule, with an ID that is never reused: `- **R-07** <the rule>. — <why it matters>. — <origin>.` At the end of each file, *Checked by the machine* lists `R-xx → <the command or setting>` for each rule a check now enforces; agents do not read those as rules. A new check must fail on the code that motivated it and pass once that code is fixed. Builders cannot edit `docs/rules/`; you edit it, through a pull request. A behaviour is never a rule: it is a criterion.

## The context is the code

There is no architecture document. You learn the project from what is built: the patterns in `docs/rules/`, the code the work touches, the rules, the stories and the decisions. Read only what the work needs. The why of the big architecture choices is in their `DEC` files: read one when the work touches it.

When a description of how the code is written (a convention, a library, a command, an old decision) disagrees with the code, follow the code, list the inconsistencies, and offer your human a `chore/` pull request that fixes the text. The rules in `docs/rules/` and the stories' criteria are the exception: they say what must hold, so code that breaks one is a broken rule or a failing criterion, never something to copy.
