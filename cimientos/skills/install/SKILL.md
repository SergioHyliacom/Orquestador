---
name: install
description: Set a project up for easyone-orchestrator, in two parts. Part 1 (day one) sets up the stories, Jira and git so the design team can start writing stories, and the project's documents: README.md, CLAUDE.md and the seed rules in docs/rules/. Part 2 (once the foundations exist) measures the verification commands, the OpenAPI contract and its generators, each side's paths and checks and the test reports, adds the pipeline that moves the Jira cards, and writes each side's patterns; it opens development to the whole team. Run only when the human asks for /easyone-cimientos:install. Not for spec-driven (SDD) setups.
disable-model-invocation: true
---

# Install

This skill belongs to `easyone-cimientos`, the plugin the technical leads use to set a project up. The team works with `easyone-orchestrator`: it carries the method, and the files this install copies from it. The skills named here without a prefix (`orchestrate`, `stories`, `que-hago`) are that plugin's.

**First, find the team's plugin.** Run `claude plugin list --json` and take the entry whose `id` is `easyone-orchestrator@hyliacom` and whose `projectPath` is this repository (one at user scope has none). Its `installPath` is called `<team plugin>` below. If the human runs it from a local copy (`claude --plugin-dir`), that folder is `<team plugin>`. If there is no such entry, stop: give the human the two commands in this plugin's README to install it in this project first, and ask them to restart Claude Code.

The install has three layers. Store each one in its own place:

- **Method:** fixed. It lives in `easyone-orchestrator` (`orchestrate`, `stories`, `que-hago`, the agents, the guard). Never copy it into the project.
- **Plugs:** measured in this repo. Commands, paths, the contract, each side's checks, Jira. They go into `.orchestrator.json` and the `CLAUDE.md` block.
- **Rules:** `docs/rules/` starts with the seed in `assets/rules/`: 13 rules the team agreed at the start, or that come from the method. The rest come only from real failures and audits in this project (`orchestrate` skill, §11.2).

The project has no architecture document for Claude to read. Claude learns the project from its code: the patterns the foundations leave, the rules, and the stories. A definition or design document the team keeps for itself stays outside the repository, and the install never asks for it.

Never copy a rule from another project. Where each thing lives is the `orchestrate` skill's §11; the install creates those homes and nothing else.

## Which part to run

The install runs in two parts, because design can start before there is any code:

- **Part 1, stories.** Day one, on an empty or almost empty repository: the story folder and its validator, Jira, the git settings, the personal files and the project's documents. Enough for design to write the first stories while the developers lay the foundations.
- **Part 2, development.** When the foundations are in place, at the close of delivery 0: one endpoint goes from Go through the OpenAPI spec and the generated client to the panel and an end-to-end test, on a real PostgreSQL. Part 2 measures all of that, adds the pipeline and writes the patterns.

No `.orchestrator.json` → Part 1. Ask the human whether the foundations already exist; if they do, run Part 2 right after. A `.orchestrator.json` without `roles` → Part 2.

## Part 1: stories

### 1.1 Read, then confirm in one message

Do not run a questionnaire. Most of what Part 1 needs is fixed by the method or can be read; read it, then show the human one message to confirm.

**Fixed, never asked:**
- the project's language is Spanish (`language: es`): stories, rules, markers and docs. Each person's language with Claude is theirs, set in their `me.json` at their first session (`orchestrate` skill, §1);
- the integration branch is `develop`;
- the risk tags are those of `assets/orchestrator.json`; they change later through a pull request;
- decisions are closed by role: management for product and business, the technical lead for architecture;
- Mobbin is a reference for design, and the Figma files come with each story, so the install asks for neither;
- the releases start as `Entrega 1`, `Entrega 2` and `Más adelante`; the team renames them through a pull request when it plans;
- the personas are not listed up front: design adds each one with its first story.

**Read from Jira**, with the Jira tools this machine has:
- the site and the project: the projects the person can see; propose the one that fits;
- the seven statuses (design, contract, build, integration, visual review, done, discarded), named `Diseño`, `Contrato`, `Desarrollo`, `Integración`, `Revisión visual`, `Hecha` and `Descartada`: say which are missing. The workflow must let any status move to any other ("allow all statuses to transition to this one" on each status), because the pipeline moves cards both ways;
- the people fields **Backend** and **Frontend** (`GET /rest/api/3/field`): their IDs go to `jira.fields`. Whoever hands out the work fills them from the backlog, and the pipeline assigns each card to whoever's turn it is from them and the card's reporter, the designer. If they are missing, offer to create them, with the human's ok.

**The one message:** what you will use, what is missing in Jira and what you offer to create, and "shall I go on?". Ask a question only when reading cannot answer it: no Jira tool works, or more than one project fits. When no Jira tool works on this machine, offer the `acli` login first, the way the team's sessions do (`orchestrate` skill, §1, step 2, "Their access to Jira and Bitbucket"), and read again.

### 1.2 Write `.orchestrator.json`

From `assets/orchestrator.json`, write only `language` (`es`), `storiesDir`, `riskTags`, `jira` and `git`. Leave out everything Part 2 measures: `setup`, `verify`, `contract`, `roles`, `runnerLimit`, `ui`, `seams`, `orca`. No `{{` may remain in what you write.

### 1.3 Create the story folder

1. Create `<storiesDir>/` (default `product/`; use the project-language word if the project names folders in its language).
2. Copy `<team plugin>/scripts/stories.mjs` and `<team plugin>/scripts/jira-sync.mjs` into it unchanged. The pipeline runs these copies. They must stay identical to the team plugin's: at session start its guard says when they differ, and the session offers to update them through a `chore/` pull request.
3. Write `<storiesDir>/stories.config.json` from `assets/stories.config.json`, without `tests` and `contractSpec` (Part 2 adds them):
   - `idPrefix` is the Jira project key.
   - `releases` and `mainRelease`: `Entrega 1`, `Entrega 2`, `Más adelante`, with `Entrega 1` as the main one. Leave out `personas`: the validator then accepts any, and design adds them with its stories.
   - `labels` holds every heading, marker, status and map text **in Spanish**. Translate the English defaults in `stories.mjs` (`DEFAULTS`).
   - Translate the vague-word and hedge lists too. They are what the ready check flags.
4. Write `<storiesDir>/activities.json` with the backbone activities. If none exist yet, write one activity and ask the human for the rest at the first story session.
5. Write `<storiesDir>/templates/story.md` and `templates/decision.md`: the templates in `<team plugin>/skills/stories/templates/`, in Spanish. Keep the frontmatter keys in English.
6. Write `<storiesDir>/README.md` from `assets/stories-readme.md`, in Spanish.
7. Create `<storiesDir>/stories/` and `<storiesDir>/decisions/`.
8. Add `<storiesDir>/.test-results*` and `<storiesDir>/map.md` to `.gitignore`. The map is generated on each machine: committed, every two pull requests would conflict on it.
9. Run `node <storiesDir>/stories.mjs`. It must run clean on the empty folder.

All files the project reads are in Spanish.

### 1.4 Git and Claude Code

1. Create `.orchestrator/locked/` with a `README.md` of one line: each half of a story lists its locked tests here as `<ID>-<side>.txt`. Track it.
2. Add `.orchestrator/me.json`, `.orchestrator/state.md`, `.orchestrator/work/`, `.orchestrator/roles/`, `.orchestrator/role.json` and `.claude/settings.local.json` to `.gitignore`. They are personal: who the human is and their own settings, their ledger, their briefs and reports, the role of each Orca worker, and their own Claude Code settings for this project (permissions, model, their own MCP servers). None of them may travel with a branch: a pull would hand one person's settings to everyone. What is shared goes in `.claude/settings.json` and `.orchestrator.json`, through a pull request. Add `/*-builder-*/` too: Orca can put a builder's worktree inside the repository folder, and it must not show up as untracked (`orchestrate` skill, `references/harness.md`, Placement).
3. **Each plugin at its scope.**
   - `easyone-orchestrator` is installed at project scope (`claude plugin install easyone-orchestrator@hyliacom --scope project`), so it is on in this repository for everyone and nowhere else: `.claude/settings.json` gets `"enabledPlugins": { "easyone-orchestrator@hyliacom": true }`. If `claude plugin list` shows it at user scope, tell the human it would load in every project on this machine, and offer to move it: uninstall it at user scope and install it at project scope. Tell the human that each teammate runs the install command once in the project's folder; that plugin's README says how.
   - `easyone-cimientos` is installed at local scope (`--scope local`), only on the technical leads' machines. If `.claude/settings.json` enables it, everyone who pulls would get it: offer to remove it from there and install it at local scope.
4. If the upstream `orchestrator` plugin is installed on this machine (`claude plugin list`), its guard would run here too. Disable it for this project in `.claude/settings.json`: `"enabledPlugins": { "orchestrator@<its marketplace>": false }`. Tell the human every teammate needs the same, and that the file is shared.
   Then look at the other plugins enabled on this machine (`claude plugin list`). A plugin's hooks run on their events in every project where it is enabled, whether or not anyone uses its skills: a hook after each edit that calls a tool this machine lacks fails on every edit here. For each plugin that has hooks (`hooks/hooks.json` under its path, or `hooks` in its manifest), say which events it hooks and what it runs, and offer to disable it for this project only: `claude plugin disable <name> --scope local`, which writes to the person's `.claude/settings.local.json` and travels with no one. Each teammate's session does the same at their first session (`orchestrate` skill, §1).
5. Write a first `bitbucket-pipelines.yml` from `assets/bitbucket-pipelines.yml`: only the `stories` step, with `image: node:22`, on `design/*`, the integration branch and every other branch (`default`), so every pull request has a build for the merge check. That is enough for the card to move from design to contract when a story's pull request merges, and to Discarded when a discard merges. Ask the human to add the secured repository variables `JIRA_EMAIL` and `JIRA_API_TOKEN` in Bitbucket; never write a token into a tracked file.
6. Give the human the Bitbucket repository settings in the `orchestrate` skill's `references/git.md`, with the minimum of 1 approval on `main` and `develop` (without Premium it only warns, which lets an author merge their own story's `design/<ID>`, as the method allows) and Merge commit as the default strategy, before the first story's pull request. Do not apply them yourself.
7. **Each person's Bitbucket access for the session.** Sessions open, read and merge pull requests through the Bitbucket REST API. Each person creates a Bitbucket API token with scopes (pull requests read and write, repository read) and sets `BITBUCKET_USER`, their Atlassian account email, and `BITBUCKET_TOKEN` in their own environment, never in a tracked file. Their session checks it and guides them through it at their first session (`orchestrate` skill, §1, step 2); check yours now the same way. Without them the session still works, but the person opens and merges pull requests in the web UI.

### 1.5 The project's documents

Each one has its home in the `orchestrate` skill's §11. Create these and nothing else: no `CONTRIBUTING.md`, `CODING_STANDARDS.md` or `docs/adr/`.

1. **The rules.** Copy `assets/rules/comunes.md`, `backend.md` and `frontend.md` to `docs/rules/` as they are. Do not add rules of your own.
2. **`README.md`**, in Spanish: what the product is, in at most five lines the human gives or confirms; the folder map; how to run it locally and how to generate the code graph (`pending: delivery 0` until the foundations name the commands, which live once in a single task file that the README and `.orchestrator.json` both use); and how the team works, as a link to this plugin. If a README exists, merge into it; do not overwrite it.

No decisions are written up front. A decision is born when it is needed: a technical choice the foundations must settle (opened by the technical lead), or a choice that blocks a story (`stories` skill, "Decisions").

### 1.6 CLAUDE.md

Write the root `CLAUDE.md` from `assets/claude-md.md`, filled. It imports `README.md` and `docs/rules/comunes.md` and carries the orchestrator block between its markers. Write `pending: install Part 2` on every line of the block Part 2 measures (contract, sides, done means, tests cannot prove, seams, delegation, code graph). A re-install replaces only what is between the markers.

`CLAUDE.md` has no lessons section: lessons are rules (`orchestrate` skill, §11.2). If an existing `CLAUDE.md` has one, propose each lesson to the human as a rule in the `docs/rules/` file of its side, with its origin, and remove the section once they agree.

### 1.7 Verify Part 1

- `grep -r "{{" .orchestrator.json CLAUDE.md README.md docs/rules <storiesDir>` returns nothing.
- Every `@` import in `CLAUDE.md` resolves to a file.
- `node <storiesDir>/stories.mjs` runs clean, with the open decisions in the map.
- **Jira answers.** Read one card of the project with the Jira tools this machine has (the Atlassian MCP server or `acli`), and check that each status in `jira.statuses` exists in the project's workflow and that the fields in `jira.fields` exist on its cards. If no tool works, even after the `acli` login, record it in the `CLAUDE.md` block: sessions will ask the human for the queue.
- **Design's machines can do their part.** On the machine of at least one designer, without creating anything: `node --version` (20 or later) and `git --version` answer, or the session offers to install them; the Jira account may create and edit issues in the project (Jira's permissions query for the project: `CREATE_ISSUES`, `EDIT_ISSUES`); the Figma connector reads each Figma file of the project; Mobbin answers one search, if the team uses it. Record the files and the result in the `CLAUDE.md` block's **Design** line. Each designer's session checks its own machine at start (`orchestrate` skill, §1).
- `node <storiesDir>/jira-sync.mjs --dry-run` reads the configuration without errors.
- The guard is active: ask the human to try `git push --force` in a fresh session and confirm it is blocked.

Report each check as ✅ measured and working, ⚠️ not verified (with the manual step), ❌ failed. Then tell the human that design can start, and what Part 2 needs: the foundations, entrega 0, which are what Part 2 checks (2.1 and 2.3). Until then, the team's sessions tell developers that development is not open yet, and the technical leads follow the foundations with this plugin's `estado` skill.

## Part 2: development

### 2.1 Measure

Run things. Do not read them off `package.json`, `go.mod` or a README.

1. **Verification commands.** Find the Go and TypeScript lint, typecheck, test and build commands. Run each one. Record the exact command, the time it took, and whether it was already red before any change. A command that does not run is not a plug.
2. **The contract.** Find the OpenAPI spec generated from Go, the command that regenerates it, and the command that regenerates the TypeScript client and the test mocks from it. Run both generators and check that the spec and the client change when a Go type changes. These are `contract.spec`, `contract.generateSpec` and `contract.generateClient`.
3. **Each side's paths and stop checks.** Backend: the Go code, the migrations and the spec. Frontend: the React apps, the shared UI packages and the generated client. Record them as `roles.backend-builder.paths` and `roles.frontend-builder.paths`; no path may belong to both. Every path the builders may need belongs to one side, root files included: `bitbucket-pipelines.yml`, the task file, the root lockfile and `go.mod`, the linters' configuration, `.mcp.json`. Propose a side for each and let the human confirm; a task that touches one goes to that side's builder (`orchestrate` skill, §6.11). For each side, pick the fast commands that prove its work when its builder stops (for example `go vet` and the tests of the touched modules; typecheck and Vitest for the touched app) as `roles.<role>.onStop`. Run them.
4. **Test reports.** Get a machine-readable report from each side and run each once: Go through JUnit (`gotestsum --junitfile <file>`), Vitest with `--reporter=json --outputFile=<file>`, the end-to-end runner through JUnit. Check that a Go subtest named `[EO-0.1] ...` shows up as `Parent/[EO-0.1]_...` in the report. Do the same for the end-to-end runner with a test named `[EO-0.1] ...` inside a describe block, made to fail: its report must carry the ID right after a `›` or at the start, and `node <storiesDir>/stories.mjs --tests --check` must fail on it. A runner that names tests another way needs its own match in `stories.mjs` (`testResult`): make it in `<team plugin>/scripts/stories.mjs` (in the plugin's repository, with a version bump), never only in the project's copy, so the copy stays identical to the team plugin's and the session can tell when it falls behind.
5. **Runner limit.** Write a three-line test that checks something the runner cannot see (rendering, layout, a real network call, a real browser). Run it and watch it fail or pass vacuously. Record in one sentence what the tests cannot prove. The human reviews everything that sentence lists.
6. **Seams.** The contract is the main seam: the spec and the generated client, watched by the frontend's typecheck. Prove it once: change a field in a Go type, regenerate, run the typecheck, confirm it fails, then revert. Look for other seams too (twin files, a hand-written list mirroring another, a version bumped in two places) and pick one watcher for each: a test, deriving one side from the other, or a named person. A watcher that stays green is ❌ in the install report.
7. **Mutation (optional).** If the project already has a mutation tool, record a command that mutates only the changed files as `verify.mutation`. Otherwise remove the key. Do not add a tool only for this.
8. **Roster.** The two builders, the reviewer, the researcher and the auditor come with the plugin. Add a project role only when it passes the tests in the `orchestrate` skill's `references/roles.md`. List each role with one line on why it exists.
9. **The code graph.** The foundations set up code-review-graph with its configuration in the repository: the MCP server in `.mcp.json` under the name `code-review-graph` (the agents' tool lists name it as `mcp__code-review-graph__*`; any other name leaves them without it), its hooks and skills in the shared settings, the version pinned, what is not indexed (the builders' worktrees, `*-builder-*/`, among them), and the folder where it keeps the graph in `.gitignore`. Build the graph with the README's command. Then prove three things: one of its tools answers from this session and from one builder run in the harness this machine uses (in Orca the builder works in its own worktree); after an edit the graph updates; and the guard still blocks `git push --force` with the graph's hooks active. Record the result in the `CLAUDE.md` block's **Code graph** line. If it does not work, say so there: the agents fall back to Grep and Read.

10. **Setup.** The command that installs the dependencies in a fresh checkout, the same one the pipeline runs before its checks. Prove it on a fresh worktree: `git worktree add` from the integration branch, run it there, then run one lint or typecheck command, which must pass; remove the worktree. This is `setup`. In Orca, a builder's worktree gets nothing else installed (`orchestrate` skill, `references/harness.md`, Placement).

Ask the human only what you cannot measure, all at once: the code owner if any; whether agents may check the UI in a browser during the build, and if yes which test data they may touch (the `ui` key is that permission: remove it when the answer is no); in Orca, which permission mode the workers launch in by default (`orca.workerPermissionMode`; remove the key to use the orchestrator's own mode). Each person may set their own in `.orchestrator/me.json`, which wins over the shared one.

### 2.2 Complete the configuration

1. Add the rest of `assets/orchestrator.json` to `.orchestrator.json` and fill every slot: `setup`, `verify`, `contract`, `roles`, `runnerLimit`, `ui`, `seams`, `orca`, `audit`. Do not leave a `{{` anywhere.
2. Add `tests` (the three reports from 2.1) and `contractSpec` (`contract.spec`) to `<storiesDir>/stories.config.json`.
3. Replace the Part 1 `bitbucket-pipelines.yml` with the whole of `assets/bitbucket-pipelines.yml`, with the project's image, its setup line (the `setup` command) and the verification commands. Keep `stories.mjs --tests --check` right after the setup: the card moves on the test results even when a later check fails. The verification lines are the commands of `verify.all` that the test sources do not already run.
4. Fill the lines of the `CLAUDE.md` block that Part 1 left pending, and the local run section of `README.md` with the names of the task file's commands.
5. **The rules meet the machine.** For each rule in `docs/rules/` that a check measured in 2.1 already enforces (a linter setting, an architecture test, a pipeline step, the security checks of the CI), move its line to *Checked by the machine* as `R-xx → <the command or setting>`. Prove each one first: it fails on a deliberately bad line and passes once the line is fixed. A check that stays green on the bad line does not count.
6. **The patterns.** Under *Patterns* in `docs/rules/backend.md` and `docs/rules/frontend.md`, list the reference code of the foundations each side's briefs will cite: the reference module, the module generator, the toy endpoint and its screen. One line each: what it shows and its path.
7. **The code is the context from now on.** The patterns of step 6 are what every brief cites under "Read first". Tell the human that the foundations' audit (`estado` skill, "The foundations' audit") is the next step, because every story will copy these patterns.

Everything Part 2 writes reaches the integration branch in one pull request the humans merge.

### 2.3 Verify Part 2

- `grep -r "{{" .orchestrator.json CLAUDE.md README.md docs/rules <storiesDir> bitbucket-pipelines.yml` returns nothing, and no `pending:` is left in `CLAUDE.md` or `README.md`.
- Every command in `.orchestrator.json` runs, the two generators included.
- Every path cited in the `CLAUDE.md` block, in `roles.*.paths` and under *Patterns* exists.
- The big architecture choices that shape the code are written as closed `DEC` files, each of half a page with its why (`estado` skill). The code shows what was chosen, never why; without them the reason is lost the day someone wants to change it.
- No role's paths include `docs/rules/` or `<storiesDir>/`: builders never edit the rules or the stories.
- The code graph answers from a builder run, updates after an edit, and leaves the guard working (2.1, step 9). `git status` shows none of its files.
- `node <storiesDir>/stories.mjs --tests --check` passes. The pipeline runs the same command.
- The first pipeline run on a branch prints the stage `jira-sync.mjs` computed. With `--dry-run` locally, the computed stages match what the human expects for the stories that exist.
- **The delegation mechanism works.** Detect the harness (`orchestrate` skill → `references/harness.md`) and prove the chain once, now, with the smallest real delegation — not by reading the documentation. In Orca: bind a Run, dispatch one `researcher` on a throwaway question, and confirm `orca orchestration run-list --json`, `worker-list --run <id> --json` and `orca worktree ps` all show it; then release it. Before that, check folder trust, because no permission mode skips it: read the Claude profile Orca launches with: `claude-profiles/<id>/home/.claude.json` under Orca's app data folder when that exists, otherwise the user's own `~/.claude.json`. There `projects.<path>.hasTrustDialogAccepted` must be true for the repository and for Orca's worktree folder. A trusted parent is not proof. When `orca.workerPermissionMode` is `bypassPermissions`, also check `skipDangerousModePermissionPrompt`; if it is not true, the human accepts the warning once in an Orca Claude tab. When one is missing, tell the human which folder to trust (opening Claude there from Orca once and answering yes is enough) and never write the key yourself unless the human asks you to. If the worker stops at a launch prompt anyway, do not answer it: show it to the human. The chain is proven only when the worker runs a turn. In plain Claude Code: one Agent-tool subagent that returns a report file. Record the result in the `CLAUDE.md` block's **Delegation** line. A mechanism nobody has exercised is not installed.

Report each check as ✅ measured and working, ⚠️ not verified (with the manual step), ❌ failed. Then tell the human that when this pull request merges, development is open for the whole team: their sessions pick it up from `roles` in `.orchestrator.json`, with nothing to install. After the foundations' audit, the technical leads can uninstall this plugin (`claude plugin uninstall easyone-cimientos@hyliacom --scope local`); they install it again to re-measure, to migrate a story folder, or for another product.

## Migrating an existing story folder

When the project already has stories in another format:

1. Map its fields to the orchestrator keys (`id`, `title`, `activity`, `persona`, `release`, `blocked_by`, `depends_on`, `tags`, `screens`, `sides`, `operations`, `discarded`). Each story needs a Jira card: its key becomes the new ID. Write the mapping (old ID → Jira key) down before changing files.
2. Map its markers and headings to `labels`. If the existing words already work, keep them as the labels instead of rewriting every file.
3. Rename the activity file keys to `code`, `name`, `folder`, `lane`, `purpose`.
4. Change files with a script, not by hand: the IDs, the criterion IDs and the test names that carry them. Run the validator before and after; the number of stories and criteria must not change.
5. Fix the drift the validator now reports (for example activity names that no longer match). List what it found in the report.
6. Keep the old generator until the new one gives the same map. Then delete the old one in the same commit.
