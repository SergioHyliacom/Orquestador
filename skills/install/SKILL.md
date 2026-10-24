---
name: install
description: Install easyone-orchestrator in one project, in two parts. Part 1 (day one) sets up the stories, Jira and git so the design team can start writing stories. Part 2 (once the foundations exist) measures the verification commands, the OpenAPI contract and its generators, each side's paths and checks and the test reports, and adds the pipeline that moves the Jira cards. Run only when the human asks for /easyone-orchestrator:install. Not for spec-driven (SDD) setups.
disable-model-invocation: true
---

# Install

The install has three layers. Store each one in its own place:

- **Method:** fixed. It lives in the plugin (`orchestrate`, `stories`, the agents, the guard). Never copy it into the project.
- **Plugs:** measured in this repo. Commands, paths, the contract, each side's checks, Jira, language. They go into `.orchestrator.json` and the `CLAUDE.md` block.
- **Lessons:** start empty. Only real failures in this project add them, at close time.

Never copy a rule or a lesson from another project.

## Which part to run

The install runs in two parts, because design can start before there is any code:

- **Part 1, stories.** Day one, on an empty or almost empty repository: the story folder and its validator, Jira, the git settings and the personal files. Enough for design to write the first stories while the developers lay the foundations.
- **Part 2, development.** When the foundations are in place: one endpoint goes from Go through the OpenAPI spec and the generated client to the panel and an end-to-end test, on a real PostgreSQL. Part 2 measures all of that and adds the pipeline.

No `.orchestrator.json` → Part 1. Ask the human whether the foundations already exist; if they do, run Part 2 right after. A `.orchestrator.json` without `roles` → Part 2.

## Part 1: stories

### 1.1 Ask

Ask the human, all at once:
- the language of the project's docs and UI;
- the product's personas and the release names;
- the Jira site, the project key, and the exact name of the Jira status for each stage: design, contract, build, integration, visual review, done. The workflow must let any status move to any other (in Jira's workflow editor, "allow all statuses to transition to this one" on each status), because the pipeline moves cards both ways;
- the risk tags that matter (the template lists account isolation, identity, payments, fiscal, personal data and production);
- the name of the integration branch (default `develop`).

### 1.2 Write `.orchestrator.json`

From `assets/orchestrator.json`, write only `language`, `storiesDir`, `riskTags`, `jira` and `git`. Leave out everything Part 2 measures: `verify`, `contract`, `roles`, `runnerLimit`, `ui`, `seams`, `orca`. No `{{` may remain in what you write.

### 1.3 Create the story folder

1. Create `<storiesDir>/` (default `product/`; use the project-language word if the project names folders in its language).
2. Copy `assets/stories.mjs` and `assets/jira-sync.mjs` into it unchanged.
3. Write `<storiesDir>/stories.config.json` from `assets/stories.config.json`, without `tests` and `contractSpec` (Part 2 adds them):
   - `idPrefix` is the Jira project key.
   - `labels` holds every heading, marker, status and map text **translated into the project's language**. Translate the English defaults in `stories.mjs` (`DEFAULTS`). If the project language is English, delete `labels`.
   - Translate the vague-word and hedge lists too. They are what the ready check flags.
4. Write `<storiesDir>/activities.json` with the backbone activities. If none exist yet, write one activity and ask the human for the rest at the first story session.
5. Write `<storiesDir>/templates/story.md` and `templates/decision.md`: the plugin templates from `skills/stories/templates/`, translated into the project's language. Keep the frontmatter keys in English.
6. Write `<storiesDir>/README.md` from `assets/stories-readme.md`, translated.
7. Create `<storiesDir>/stories/` and `<storiesDir>/decisions/`.
8. Add `<storiesDir>/.test-results*` to `.gitignore`.
9. Run `node <storiesDir>/stories.mjs`. It must run clean on the empty folder.

All files the project reads are in one language: the project's.

### 1.4 Git and Claude Code

1. Create `.orchestrator/locked/` with a `README.md` of one line: each half of a story lists its locked tests here as `<ID>-<side>.txt`. Track it.
2. Add `.orchestrator/me.json`, `.orchestrator/state.md`, `.orchestrator/work/` and `.orchestrator/role.json` to `.gitignore`. They are personal: who the human is, their ledger, their briefs and reports, a worker's role. None of them may travel with a branch.
3. If the upstream `orchestrator` plugin is installed on this machine (`claude plugin list`), its guard would run here too. Disable it for this project in `.claude/settings.json`: `"enabledPlugins": { "orchestrator@<its marketplace>": false }`. Tell the human every teammate needs the same, and that the file is shared.
4. Write a first `bitbucket-pipelines.yml` from `assets/bitbucket-pipelines.yml`: only the `stories` step, with `image: node:22`, on `design/*` and the integration branch. That is enough for the card to move from design to contract when a story's pull request merges. Ask the human to add the secured repository variables `JIRA_EMAIL` and `JIRA_API_TOKEN` in Bitbucket; never write a token into a tracked file.
5. Offer the human the Bitbucket repository settings in the `orchestrate` skill's `references/git.md`. Do not apply them yourself.

### 1.5 The CLAUDE.md block

Insert `assets/claude-md-block.md`, filled and translated, into the root `CLAUDE.md`. Write `pending: install Part 2` on every line Part 2 measures (contract, sides, done means, tests cannot prove, seams, delegation). Keep the `Lessons` section below the markers: it belongs to the project, and a re-install never touches it. If it does not exist, add it below the block.

### 1.6 Verify Part 1

- `grep -r "{{" .orchestrator.json CLAUDE.md <storiesDir>` returns nothing.
- `node <storiesDir>/stories.mjs` runs clean.
- **Jira answers.** Read one card of the project with the Jira tools this machine has (the Atlassian MCP server or `acli`), and check that each status in `jira.statuses` exists in the project's workflow. If no tool works, record it in the `CLAUDE.md` block: sessions will ask the human for the queue.
- `node <storiesDir>/jira-sync.mjs --dry-run` reads the configuration without errors.
- The guard is active: ask the human to try `git push --force` in a fresh session and confirm it is blocked.

Report each check as ✅ measured and working, ⚠️ not verified (with the manual step), ❌ failed. Then tell the human that design can start, and what Part 2 needs: the foundations of §15 of the project's definition, entrega 0.

## Part 2: development

### 2.1 Measure

Run things. Do not read them off `package.json`, `go.mod` or a README.

1. **Verification commands.** Find the Go and TypeScript lint, typecheck, test and build commands. Run each one. Record the exact command, the time it took, and whether it was already red before any change. A command that does not run is not a plug.
2. **The contract.** Find the OpenAPI spec generated from Go, the command that regenerates it, and the command that regenerates the TypeScript client and the test mocks from it. Run both generators and check that the spec and the client change when a Go type changes. These are `contract.spec`, `contract.generateSpec` and `contract.generateClient`.
3. **Each side's paths and stop checks.** Backend: the Go code, the migrations and the spec. Frontend: the React apps, the shared UI packages and the generated client. Record them as `roles.backend-builder.paths` and `roles.frontend-builder.paths`; no path may belong to both. For each side, pick the fast commands that prove its work when its builder stops (for example `go vet` and the tests of the touched modules; typecheck and Vitest for the touched app) as `roles.<role>.onStop`. Run them.
4. **Test reports.** Get a machine-readable report from each side and run each once: Go through JUnit (`gotestsum --junitfile <file>`), Vitest with `--reporter=json --outputFile=<file>`, the end-to-end runner through JUnit. Check that a Go subtest named `[EO-0.1] ...` shows up as `Parent/[EO-0.1]_...` in the report.
5. **Runner limit.** Write a three-line test that checks something the runner cannot see (rendering, layout, a real network call, a real browser). Run it and watch it fail or pass vacuously. Record in one sentence what the tests cannot prove. The human reviews everything that sentence lists.
6. **Seams.** The contract is the main seam: the spec and the generated client, watched by the frontend's typecheck. Prove it once: change a field in a Go type, regenerate, run the typecheck, confirm it fails, then revert. Look for other seams too (twin files, a hand-written list mirroring another, a version bumped in two places) and pick one watcher for each: a test, deriving one side from the other, or a named person. A watcher that stays green is ❌ in the install report.
7. **Mutation (optional).** If the project already has a mutation tool, record a command that mutates only the changed files as `verify.mutation`. Otherwise remove the key. Do not add a tool only for this.
8. **Roster.** The two builders, the reviewer and the researcher come with the plugin. Add a project role only when it passes the tests in the `orchestrate` skill's `references/roles.md`. List each role with one line on why it exists.

Ask the human only what you cannot measure, all at once: the code owner if any; whether agents may check the UI in a browser during the build, and if yes which test data they may touch (the `ui` key is that permission: remove it when the answer is no); in Orca, which permission mode the workers launch in (`orca.workerPermissionMode`; remove the key to use the orchestrator's own mode).

### 2.2 Complete the configuration

1. Add the rest of `assets/orchestrator.json` to `.orchestrator.json` and fill every slot: `verify`, `contract`, `roles`, `runnerLimit`, `ui`, `seams`, `orca`, `audit`. Leave `audit.confirm` as `pending` until the team decides whether a person confirms each audit. Do not leave a `{{` anywhere.
2. Add `tests` (the three reports from 2.1) and `contractSpec` (`contract.spec`) to `<storiesDir>/stories.config.json`.
3. Replace the Part 1 `bitbucket-pipelines.yml` with the whole of `assets/bitbucket-pipelines.yml`, with the project's image, setup and verification commands.
4. Fill the lines of the `CLAUDE.md` block that Part 1 left pending.

### 2.3 Verify Part 2

- `grep -r "{{" .orchestrator.json CLAUDE.md <storiesDir> bitbucket-pipelines.yml` returns nothing.
- Every command in `.orchestrator.json` runs, the two generators included.
- Every path cited in the `CLAUDE.md` block and in `roles.*.paths` exists.
- `node <storiesDir>/stories.mjs --tests --check` passes. The pipeline runs the same command.
- The first pipeline run on a branch prints the stage `jira-sync.mjs` computed. With `--dry-run` locally, the computed stages match what the human expects for the stories that exist.
- **The delegation mechanism works.** Detect the harness (`orchestrate` skill → `references/harness.md`) and prove the chain once, now, with the smallest real delegation — not by reading the documentation. In Orca: bind a Run, dispatch one `researcher` on a throwaway question, and confirm `orca orchestration run-list --json`, `worker-list --run <id> --json` and `orca worktree ps` all show it; then release it. Before that, check folder trust, because no permission mode skips it: read the Claude profile Orca launches with: `claude-profiles/<id>/home/.claude.json` under Orca's app data folder when that exists, otherwise the user's own `~/.claude.json`. There `projects.<path>.hasTrustDialogAccepted` must be true for the repository and for Orca's worktree folder. A trusted parent is not proof. When `orca.workerPermissionMode` is `bypassPermissions`, also check `skipDangerousModePermissionPrompt`; if it is not true, the human accepts the warning once in an Orca Claude tab. When one is missing, tell the human which folder to trust (opening Claude there from Orca once and answering yes is enough) and never write the key yourself unless the human asks you to. If the worker stops at a launch prompt anyway, do not answer it: show it to the human. The chain is proven only when the worker runs a turn. In plain Claude Code: one Agent-tool subagent that returns a report file. Record the result in the `CLAUDE.md` block's **Delegation** line. A mechanism nobody has exercised is not installed.

Report each check as ✅ measured and working, ⚠️ not verified (with the manual step), ❌ failed.

## Migrating an existing story folder

When the project already has stories in another format:

1. Map its fields to the orchestrator keys (`id`, `title`, `activity`, `persona`, `release`, `blocked_by`, `depends_on`, `tags`, `screens`, `sides`, `operations`, `discarded`). Each story needs a Jira card: its key becomes the new ID. Write the mapping (old ID → Jira key) down before changing files.
2. Map its markers and headings to `labels`. If the existing words already work, keep them as the labels instead of rewriting every file.
3. Rename the activity file keys to `code`, `name`, `folder`, `lane`, `purpose`.
4. Change files with a script, not by hand: the IDs, the criterion IDs and the test names that carry them. Run the validator before and after; the number of stories and criteria must not change.
5. Fix the drift the validator now reports (for example activity names that no longer match). List what it found in the report.
6. Keep the old generator until the new one gives the same map. Then delete the old one in the same commit.
