<!-- ORCHESTRATOR:START -->
## Orchestrated work (easyone-orchestrator)

This project uses the easyone-orchestrator plugin. Every session follows the `easyone-orchestrator:orchestrate` skill. Stories follow the `easyone-orchestrator:stories` skill.

- **Who you work with:** `.orchestrator/me.json` (personal: name, side, Jira account). Each person's session is the orchestrator for their side: design, backend or frontend.
- **Shared state:** the story's Jira card in project {{JIRA_PROJECT_KEY}} shows its stage; the Bitbucket pipeline moves it. Stories: `{{STORIES_DIR}}/stories/`. Map: `{{STORIES_DIR}}/map.md` (generated). Decisions: `{{STORIES_DIR}}/decisions/`.
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
<!-- ORCHESTRATOR:END -->

### Lessons

_(none yet: only real failures in this project add lessons here)_
