@README.md
@docs/rules/comunes.md

## The definition, by topic

`docs/definicion.md` is the starting architecture. Never load it whole: read the section the work needs. A decision in `{{STORIES_DIR}}/decisions/` that names a section wins over its text.

- Accounts and one database per account: §9.3. Domain model: §6. Permissions: §6.3
- Users and identity: §7.2
- Modules and their manifests: §7.4
- Base services (domains, outgoing mail, literals and languages): §7.7
- Backend: §9.2. API: §9.4
- Panel: §9.7. Employee section: §9.8
- Websites and Hyliable: §9.5, §9.13
- File storage: §9.9
- Stack: §10
- AI and its gateway: §11
- Security by design: §12.1

<!-- ORCHESTRATOR:START -->
## Orchestrated work (easyone-orchestrator)

This project uses the easyone-orchestrator plugin. Every session follows the `easyone-orchestrator:orchestrate` skill. Stories follow the `easyone-orchestrator:stories` skill.

- **Who you work with:** `.orchestrator/me.json` (personal: name, side, Jira account). Each person's session is the orchestrator for their side: design, backend or frontend.
- **Shared state:** the story's Jira card in project {{JIRA_PROJECT_KEY}} shows its stage; the Bitbucket pipeline moves it. Stories: `{{STORIES_DIR}}/stories/`. Map: `{{STORIES_DIR}}/map.md` (generated). Decisions, of product and of architecture: `{{STORIES_DIR}}/decisions/`, from DEC-031.
- **Design:** Figma is the only source of the design: {{FIGMA_FILES}}. Mobbin is for references, never the design. Claude creates each story's Jira card with its title, its sentence and the links; the criteria live only in the story file. Checked on a designer's machine: {{DESIGN_TOOLS_STATUS}}
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
