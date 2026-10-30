---
name: install
description: Set a project up for easyone-orchestrator, in two parts. Part 1 (day one) writes the configuration, the story folder, the project's documents and a first pipeline, so design can start writing stories. Part 2 (once the foundations exist) measures the verification commands, the OpenAPI contract, each side's paths and checks and the test reports, completes the pipeline and lists the patterns; it opens development to the whole team. Run only when the human asks for /easyone-cimientos:install.
disable-model-invocation: true
---

# Install

This skill belongs to `easyone-cimientos`, the plugin of the technical leads. The team works with `easyone-orchestrator`, which carries the method: never copy the method into the project. The install writes only what is the project's own: its plugs in `.orchestrator.json` and `CLAUDE.md`, the story folder, the seed rules, and the pipeline. The project keeps no copy of the story scripts: sessions run the team plugin's (`<scripts>`, which its guard names at session start), and the pipeline downloads them.

There is no architecture document: Claude learns the project from its code, the rules and the stories. Never copy a rule from another project.

**Which part.** No `.orchestrator.json` → Part 1; ask the human whether the foundations already exist, and if they do, run Part 2 right after. A `.orchestrator.json` without `roles` → Part 2.

## Part 1: stories

### 1.1 Read, then confirm in one message

Do not run a questionnaire. These are fixed: the project's language is Spanish (`es`); the integration branch is `develop`; the risk tags are those of `assets/orchestrator.json`; the releases start as `Entrega 1`, `Entrega 2` and `Más adelante`; design adds the personas with its first stories.

Read from Jira, with the Jira tools this machine has (when none answers, set up `acli` as `orchestrate` → `references/access.md` says):
- the site and the project: propose the one that fits;
- the seven statuses `Diseño`, `Contrato`, `Desarrollo`, `Integración`, `Revisión visual`, `Hecha` and `Descartada`, and say which are missing. The workflow must let any status move to any other, because the pipeline moves cards both ways;
- the people fields **Backend** and **Frontend** (`GET /rest/api/3/field`), whose IDs go to `jira.fields`. If they are missing, offer to create them.

Then one message: what you will use, what is missing in Jira and what you offer to create, and "shall I go on?".

### 1.2 Write

1. **`.orchestrator.json`** from `assets/orchestrator.json`, only `language`, `storiesDir` (default `product`), `riskTags`, `jira` and `git`. Part 2 adds the rest.
2. **The story folder**, `<storiesDir>/`:
   - `stories.config.json` from `assets/stories.config.json`, with `idPrefix` set to the Jira project key and without `tests` and `contractSpec` (Part 2 adds them). Its labels are already in Spanish;
   - `templates/` from `assets/templates/`, with the Jira key in place of `{{JIRA_PROJECT_KEY}}`;
   - `README.md` from `assets/stories-readme.md`;
   - `activities.json` with one activity; design adds the rest with its stories;
   - empty `stories/` and `decisions/`.
3. **`.gitignore`:** `<storiesDir>/.test-results*`, `<storiesDir>/map.md`, `.orchestrator/me.json`, `.orchestrator/state.md`, `.orchestrator/work/` and `.claude/settings.local.json`. They are generated or personal.
4. **`.orchestrator/locked/README.md`**, one line: each side of a story lists its locked tests here as `<ID>-<side>.txt`.
5. **`.claude/settings.json`:** `"enabledPlugins": { "easyone-orchestrator@hyliacom": true }`, so the team plugin is on in this repository for everyone. `easyone-cimientos` is never enabled there: the leads install it with `--scope local`.
6. **`docs/rules/`:** copy `assets/rules/comunes.md`, `backend.md` and `frontend.md` as they are.
7. **`README.md`**, in Spanish: what the product is, in at most five lines the human gives; the folder map; how to run it locally (`pending: entrega 0` until the foundations name the commands); and how the team works, as a link to the team plugin. If a README exists, merge into it.
8. **`CLAUDE.md`** from `assets/claude-md.md`, filled; the lines Part 2 measures say `pending: install Part 2`. If a `CLAUDE.md` exists, replace only what is between its markers. A lessons section is not kept: propose each lesson to the human as a rule in `docs/rules/`.
9. **`bitbucket-pipelines.yml`** from `assets/bitbucket-pipelines.yml`, only the `stories` step with `image: node:22`, on `design/*`, the integration branch and `default`, so every pull request has a build. Ask the human to add the secured repository variables `JIRA_EMAIL` and `JIRA_API_TOKEN`; never write a token into a file.
10. Give the human the Bitbucket settings of `orchestrate` → `references/git.md`, "Repository settings". Do not apply them yourself.

### 1.3 Verify

- No `{{` is left in what you wrote.
- `node <scripts>/stories.mjs` runs clean on the empty folder, and `node <scripts>/jira-sync.mjs --dry-run` reads the configuration.
- Jira answers: one card of the project reads, and every status in `jira.statuses` and field in `jira.fields` exists.

Report each check as ✅, ⚠️ (with the manual step) or ❌. Tell the human that design can start, and that Part 2 comes when the foundations are in place; until then the leads follow them with the `estado` skill. Everything Part 1 writes reaches the integration branch in one pull request.

## Part 2: development

### 2.1 Measure

Run things; do not read them off `package.json`, `go.mod` or a README.

1. **Verification commands.** The Go and TypeScript lint, typecheck, test and build commands. Run each one and record the exact command and whether it was already red.
2. **The contract.** The OpenAPI spec generated from Go, the command that regenerates it and the one that regenerates the TypeScript client and its mocks. Run both, and check that a change in a Go type reaches the spec and the client: `contract.spec`, `contract.generateSpec`, `contract.generateClient`.
3. **Each side's paths and fast checks.** Backend: the Go code, the migrations and the spec. Frontend: the React apps, the shared UI packages and the generated client. No path belongs to both, and every root file (`bitbucket-pipelines.yml`, the task file, the lockfiles, `go.mod`, the linters' configuration, `.mcp.json`) belongs to one: propose and let the human confirm. For each side, the fast commands that prove a builder's work when it stops (`go vet` and the touched modules' tests; typecheck and Vitest for the touched app), as `roles.<role>.onStop`. Run them.
4. **Test reports.** A machine-readable report per runner: Go through JUnit (`gotestsum --junitfile <file>`), Vitest with `--reporter=json --outputFile=<file>`, the end-to-end runner through JUnit. Name one test `[EO-0.1] ...` in each and make the end-to-end one fail: `node <scripts>/stories.mjs --tests --check` must find all three and fail. A runner that names tests another way needs a match in the team plugin's `scripts/stories.mjs`, in the plugin's repository with a version bump.
5. **Setup.** The command that installs the dependencies in a fresh checkout, the same as the pipeline's. Run it once in a fresh clone, then one lint command, which must pass.
6. **What the tests cannot prove**, in one sentence (`runnerLimit`): what a person must still check.
7. **The code graph,** if the foundations set up code-review-graph: one of its tools answers from this session. Otherwise its `CLAUDE.md` line says "not set up".

Ask the human only what you cannot measure, in one message: whether agents may check the UI in a browser and which test data they may touch (the `ui` key; remove it when the answer is no).

### 2.2 Complete

1. Add the rest of `assets/orchestrator.json` to `.orchestrator.json`, filled: `setup`, `verify`, `contract`, `roles`, `runnerLimit`, `ui`, `seams` (the contract: the spec and the generated client, watched by the frontend's typecheck), `audit`. Remove `verify.mutation` unless the project already has a mutation tool.
2. Add `tests` and `contractSpec` to `<storiesDir>/stories.config.json`.
3. Replace the pipeline with the whole of `assets/bitbucket-pipelines.yml`: the project's image, the `setup` line and the verification lines (the commands of `verify.all` that the test sources do not already run).
4. Fill the `pending:` lines of `CLAUDE.md` and the local-run section of `README.md`.
5. **The rules meet the machine.** For each rule in `docs/rules/` that a measured check already enforces, move its line to *Checked by the machine* as `R-xx → <the command or setting>`, after proving that the check fails on a deliberately bad line and passes once it is fixed.
6. **The patterns.** Under *Patterns* in `docs/rules/backend.md` and `frontend.md`, one line each for the reference code every brief will cite: the reference module, the module generator, the toy endpoint and its screen.

Everything Part 2 writes reaches the integration branch in one pull request the humans merge.

### 2.3 Verify

- No `{{` and no `pending:` left; every command in `.orchestrator.json` runs; every path in `roles.*.paths`, `CLAUDE.md` and *Patterns* exists, and no role's paths include `docs/rules/` or `<storiesDir>/`.
- `node <scripts>/stories.mjs --tests --check` passes, as the pipeline will run it.
- One Agent-tool subagent runs as `easyone-orchestrator:backend-builder` and returns a report file, and the guard acts on it: its edit of a file outside `roles.backend-builder.paths` is blocked. A subagent the guard does not stop works with no rules.
- The big architecture choices are closed `DEC` files with their why (`estado` skill).

Report each check as ✅, ⚠️ or ❌. Tell the human that when this pull request merges, development is open for the whole team, with nothing to install; the next step is the foundations' audit (`estado` skill). After it, the leads can uninstall this plugin (`claude plugin uninstall easyone-cimientos@hyliacom --scope local`).

## A project installed before easyone-orchestrator 0.10.0

It keeps copies of `stories.mjs` and `jira-sync.mjs` in its story folder, and a pipeline that runs them. In one `chore/` pull request: delete both copies, replace the pipeline's script lines with the downloading lines of `assets/bitbucket-pipelines.yml`, and remove `plugin` from `.orchestrator.json` if it is there.

## Migrating an existing story folder

When the project already has stories in another format:

1. Map its fields to the orchestrator keys (`id`, `title`, `activity`, `persona`, `release`, `blocked_by`, `depends_on`, `tags`, `screens`, `sides`, `operations`, `discarded`). Each story needs a Jira card, whose key becomes the new ID; write the mapping down first.
2. Map its markers and headings to `labels`; if the existing words work, keep them as the labels.
3. Rename the activity file keys to `code`, `name`, `folder`, `lane`, `purpose`.
4. Change the files with a script: the IDs, the criterion IDs and the test names that carry them. Run the validator before and after; the number of stories and criteria must not change.
5. Fix the drift the validator reports, and list it in the report.
