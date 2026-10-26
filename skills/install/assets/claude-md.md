@README.md
@docs/rules/comunes.md

## Where the context is

There is no architecture document to read. The context is the code: the patterns listed in `docs/rules/backend.md` and `docs/rules/frontend.md`, the rules in `docs/rules/`, the stories and the decisions. Read the code the work touches, not more.

<!-- ORCHESTRATOR:START -->
## Orchestrated work (easyone-orchestrator)

This project uses the easyone-orchestrator plugin. Every session follows the `easyone-orchestrator:orchestrate` skill. Stories follow the `easyone-orchestrator:stories` skill.

- **Tools on this machine:** this project needs Node 20 or later and Git on every machine, design's included: the guard and the story validator run on Node. At the start of every session, run `node --version` and `git --version`. If one fails, the guard is not protecting this session: tell your human in plain words ("to work safely in this project I need to install a tool, Node; shall I?") and, on their yes, install it (Windows: `winget install OpenJS.NodeJS.LTS` or `winget install Git.Git`, which asks once for administrator permission; macOS: the installer from nodejs.org, or `brew install node`). Then they restart Claude Code. Until it is installed, help them read and write, but do not commit and do not push.

- **Who you work with:** `.orchestrator/me.json` (personal: name, side, Jira account, and the language they speak with you). Answer each person in their language; everything written in the repository is in Spanish. Each person's session is the orchestrator for their side: design, backend or frontend.
- **Shared state:** the story's Jira card in project {{JIRA_PROJECT_KEY}} shows its stage; the Bitbucket pipeline moves it. Stories: `{{STORIES_DIR}}/stories/`. Map: `{{STORIES_DIR}}/map.md`, generated on each machine by `node {{STORIES_DIR}}/stories.mjs` and never committed. Decisions, of product and of architecture: `{{STORIES_DIR}}/decisions/`, from DEC-001.
- **Design:** Figma is the only source of the design; each story links its frames in `screens`. Mobbin is for references, never the design. Claude creates each story's Jira card with its title, its sentence and the links; the criteria live only in the story file. Checked on a designer's machine: {{DESIGN_TOOLS_STATUS}}
- **Rules:** `docs/rules/`: `comunes.md` (imported above), `backend.md` and `frontend.md`. Where each thing lives, and how a rule is born and changes: the `orchestrate` skill, §11.
- **Contract:** `{{CONTRACT_SPEC}}`, generated with `{{GENERATE_SPEC}}`. Client and mocks: `{{GENERATE_CLIENT}}`. Only the backend writes the contract, after both sides agree it.
- **Sides:** backend edits {{BACKEND_PATHS}}; frontend edits {{FRONTEND_PATHS}}. The guard keeps each builder on its side.
- **Plugs:** `.orchestrator.json`. **Ledger:** `.orchestrator/state.md` (personal). **Locked tests:** `.orchestrator/locked/<ID>-<side>.txt`.
- **Done means:** `{{FULL_VERIFICATION_COMMANDS}}` all pass, and `node {{STORIES_DIR}}/stories.mjs --tests --check` passes.
- **Tests cannot prove:** {{RUNNER_LIMIT}} The human reviews these.
- **Test naming:** the test's name starts with the criterion ID. Go: `t.Run("[EO-123.1] ...")`. Vitest and end-to-end: `it("[EO-123.1] ...")`.
- **Seams:** {{SEAMS_ONE_LINE_EACH}}
- **Delegation:** {{HARNESS_STATUS: in Orca, supervised workers under one Run; the Agent tool only for short read-only lookups. Plain Claude Code: the Agent tool. Measured on this machine: ...}}
- **Jira on this machine:** {{JIRA_ACCESS: the tool that reads the cards, or "none: ask the human for the queue"}}
- **Hooks on this machine:** {{HOOKS_STATUS}}
- **Code graph:** {{CODE_GRAPH: "code-review-graph, MCP server `code-review-graph`, built with <the README's command>; agents reach it as mcp__code-review-graph__*" or what does not work on this machine}}
<!-- ORCHESTRATOR:END -->
