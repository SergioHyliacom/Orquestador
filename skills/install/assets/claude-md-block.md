<!-- ORCHESTRATOR:START -->
## Orchestrated work (orchestrator)

This project uses the easyone-orchestrator plugin. The main session follows the `easyone-orchestrator:orchestrate` skill. Stories follow the `easyone-orchestrator:stories` skill.

- **Product state:** `{{STORIES_DIR}}/map.md` (generated). Stories: `{{STORIES_DIR}}/stories/`. Decisions: `{{STORIES_DIR}}/decisions/`.
- **Plugs:** `.orchestrator.json`. **Ledger:** `.orchestrator/state.md`. **Locked tests:** `.orchestrator/locked-tests.txt`.
- **Done means:** `{{FULL_VERIFICATION_COMMANDS}}` all pass, and `node {{STORIES_DIR}}/stories.mjs --tests --check` passes.
- **Tests cannot prove:** {{RUNNER_LIMIT}} The human reviews these.
- **Test naming:** {{TEST_NAMING_CONVENTION}}
- **Seams:** {{SEAMS_ONE_LINE_EACH}}
- **Delegation:** {{HARNESS_STATUS: in Orca, supervised workers under one Run; the Agent tool only for short read-only lookups. Plain Claude Code: the Agent tool. Measured on this machine: ...}}
- **Hooks on this machine:** {{HOOKS_STATUS}}
<!-- ORCHESTRATOR:END -->

### Lessons

_(none yet: only real failures in this project add lessons here)_
