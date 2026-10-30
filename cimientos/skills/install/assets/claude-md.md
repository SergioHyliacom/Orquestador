@README.md
@docs/rules/comunes.md

<!-- ORCHESTRATOR:START -->
## Orchestrated work (easyone-orchestrator)

Every session follows the `easyone-orchestrator:orchestrate` skill; stories follow the `easyone-orchestrator:stories` skill. There is no architecture document: the context is the code, the rules in `docs/rules/`, the stories and the decisions.

- **The plugin in this folder:** each folder (each clone) installs it on its own. If the `easyone-orchestrator:orchestrate` skill is not available, tell your human in plain words and offer to install it (`claude plugin marketplace add SergioHyliacom/Orquestador`, then `claude plugin install easyone-orchestrator@hyliacom --scope project`, then restart Claude Code). Until then the guard is not protecting this session: do not commit and do not push.
- **Node and Git** are needed on every machine, design's included: without Node the guard never starts. If `node --version` or `git --version` fails, offer to install it, and do not commit or push until it is installed.
- **When the text and the code disagree:** a description of how the code is written loses to the code: follow the code and list the inconsistencies. The rules in `docs/rules/` and the stories' criteria are the exception: code that breaks one is a broken rule or a failing criterion.
- **Jira:** project {{JIRA_PROJECT_KEY}}; each story's card shows its stage, and the pipeline moves it. Stories: `{{STORIES_DIR}}/stories/`; decisions: `{{STORIES_DIR}}/decisions/`, from DEC-001.
- **Contract:** `{{CONTRACT_SPEC}}`, generated with `{{GENERATE_SPEC}}`; client and mocks with `{{GENERATE_CLIENT}}`. Only the backend writes it, after both sides agree it.
- **Sides:** backend edits {{BACKEND_PATHS}}; frontend edits {{FRONTEND_PATHS}}.
- **Done means:** `{{FULL_VERIFICATION_COMMANDS}}` pass, and `stories.mjs --tests --check` passes.
- **Tests cannot prove:** {{RUNNER_LIMIT}}
- **Test naming:** the test's name starts with the criterion ID. Go: `t.Run("[EO-123.1] ...")`. Vitest and end-to-end: `it("[EO-123.1] ...")`.
- **Code graph:** {{CODE_GRAPH: "code-review-graph, MCP server `code-review-graph`; agents reach it as mcp__code-review-graph__*", or "not set up"}}
<!-- ORCHESTRATOR:END -->
