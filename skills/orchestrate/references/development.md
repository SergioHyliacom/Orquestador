# Development: from the kickoff to the merge

The `builder` does the code; you brief it and check its evidence (`references/delegation.md`).

**One branch per story:** `feature/<id>-<slug>` (`references/git.md`).

## Kickoff

1. **Read the story with your human first.** When a criterion is ambiguous, contradicts another, lacks a state or an error, or cannot be built with what exists, write it under **Open questions**, one line per criterion ID, and take it to your human before anything is built: the story is written in gg-ez, and its author answers there.
2. **Check it against what binds.** Read the sections of `docs/definicion.md` that the table «Qué leer según la tarea» of the project's `CLAUDE.md` gives for what the story touches (never the whole file), and the accepted ADRs it names. Product, flows and screens are the starting intention: a different flow, step or button is no reason to stop. What binds is section 14, the accepted ADRs, sections 9, 10 and 12, the «Reglas que no se negocian» of `CLAUDE.md`, `CONTRIBUTING.md` and `CODING_STANDARDS.md`.
   - **Stop and propose an ADR before anything is built** when the story falls in the list «Para y propón un ADR antes de programar» of `CLAUDE.md` (`CONTRIBUTING.md`, «Cuándo hace falta un ADR»): a new provider or external service, a change to how people sign in, sessions or permissions, payments or fiscal data, new personal data or data sent to a third party, an incompatible change to the shared data model, account isolation or `/v1`, the infrastructure, or anything that contradicts what binds. Tell your human which item and why, and offer to draft the ADR (`docs/adr/`, from its `README.md`, status `propuesta`) in its own `feature/` pull request. The technical lead accepts it; you never settle it. The story gets `blocked_by: [ADR-NNNN]` and waits.
3. **The API it uses.** When the story reaches the API from the front, list the operations it needs and, for each, whether it exists in `packages/api-client/openapi.json`. The front reaches the API only through the generated client (`@easyone/api-client`); the OpenAPI is generated from the Go code, never written by hand. An operation that does not exist yet and the story does not build itself is still to be agreed (`SKILL.md`, §5): name it to your human, and do not let the builder invent it.
4. **The plan, when the story is large.** When it touches several modules or apps, explain the plan to your human in a few lines and wait for their ok (`CLAUDE.md`, «Forma de trabajar»).
5. **Kickoff.** Create `feature/<id>-<slug>` from the integration branch on the remote. If the story touches a risk area its `tags` do not name (`riskTags` in `.orchestrator.json`), add that tag to the story. That is the only frontmatter edit at the kickoff, with one exception: a tag the machine asks for later. `stories.mjs --check` and `--pr` fail when the story's branch changes a path that `.orchestrator.json` → `riskPaths` gives a tag the story lacks, and a builder's `Risk:` line can name one; add it then. A tag is never removed to make the check pass. A story that creates a module in a risk area also adds its `riskPaths` entry (`references/risk-map.md`). The story file is yours, on this machine: nothing is committed at the kickoff. Write the kickoff in the ledger.

## Build: one criterion at a time

Your human gives the ok on the first criterion, where the pattern shows, and on the finished build. Between the two you carry on alone. For each criterion, in the story's order:

1. **Brief** the builder for that one criterion. Launch it for the first; resume it for the next ones.
2. **Check the evidence yourself:** the test's name starts with the criterion ID; RED failed on an assertion about the criterion, not on a compile error; GREEN and the fast checks pass, and a Go test that touches the database ran through `pnpm test:go` and passed, never skipped (without `TEST_DATABASE_URL` it skips, and a skip is not green); every changed file belongs to this criterion, and is inside the builder's paths when its role has them (`roles.<role>.paths`); the `GRAPH:` line names the callers the code graph returned for each function the change touches, or why the graph could not answer (a report with neither goes back); each pin passed before the change and passes after, and when the change touches shared code (a handler, a validation, a query, a shared component or hook) and the report names no pin, its reason holds; the `Risk:` line names no risk tag the story lacks, or you add it; when it names code no `riskPaths` entry covers, offer your human to add it (`references/risk-map.md`); what the criterion regenerates (the OpenAPI and its client, sqlc, `locales/`) was regenerated with the project's commands, never edited by hand. A criterion reported as already met has no RED: check that its assertion observes the criterion, and commit the test alone. A failed check goes back to the same builder. After three builder runs without a commit (`verify.maxBuilderRuns` in `.orchestrator.json`), the guard asks your human before each further run. Give them one line per run, what it was for and what it returned, and leave the answer to them: never advise it.
3. **First criterion: your human's ok.** In at most 8 lines: the criterion, the test's name, what its assertion checks, the RED and GREEN lines, the files changed. No code. Ask: "Does this assertion check what the criterion says?" A refactor or a change goes back to the same builder (`Change: refactor <criterion ID>`), with what your human said, word for word, under `Request:`.
4. **Commit:** the files from the report by name, message `tipo(ámbito): <criterion ID> <la regla, corta>` (`references/git.md`). The project asks your human to confirm each commit; after the first, do not ask them in the conversation as well.
5. **Stop and go to your human** at a BLOCKED or a concern, a further run the guard asks about, or an irreversible step (a migration on a shared database, deleting data, a live external service). They may also ask for the ok on every criterion.

## Close the build

When every criterion is green:

1. **Verify everything once.** Run `verify.all` yourself: the project's checks of `CONTRIBUTING.md` («Comprobaciones») that the story affects. The builders ran only the fast checks. A failure goes back to the builder.
2. **The README.** The module's (`modules/<id>/README.md`, shaped like `modules/example`'s) or the app's (`apps/<app>/README.md`) tells how it works after the change, with the link to its Figma design when it has screens (`CONTRIBUTING.md`, «Lo que lleva cada cambio»). Bring it up to date in this branch, in a commit of its own (`docs(<scope>): <ID> …`).
3. **Show the result:** one line per criterion (its test and what it checks), the files changed. Your human's ok closes the build; a change reopens the criteria it names.
4. **Lock.** List the story's acceptance-test files, with the helpers they import and the runners' config, in `.orchestrator/locked/<ID>.txt`, under a first line `# commit <the full sha of HEAD>`. From here no builder can change those tests. The list is yours, on this machine: nothing is committed.

**Locks never expire.** When other work must change a locked file (another story, a runner upgrade, a hotfix), remove it from its list with your human's ok, and lock it again when the change is done, with the new `# commit`.

**Reopen the build** when a change comes back to it: a review finding, or a criterion that changed. Remove from the lock list the tests of the criteria that change before you brief the builder: the guard reads the locks from the list. Then build those criteria again, verify, and lock again with the new `# commit`.

## Markers

When the build is closed:

1. Run `node <scripts>/stories.mjs --tests`. A criterion whose tests all pass becomes `[test]`. Anything only a person can check (an email that arrives, a live service, how a screen looks) is checked now by your human and becomes `[manual YYYY-MM-DD, <name>]`. No criterion stays `[unbuilt]`. Builders never edit stories.
2. Push, on your human's ok, and go on to the Claude review.

## Claude review

Every pull request gets a Claude review before it opens (`CONTRIBUTING.md`, «Pull requests»), not only a risky one. Brief a fresh `reviewer` with the story and one exact commit, never the branch: push, then take `git rev-parse origin/<the story's branch>` and name it as `Commit:` in the brief, with `git diff <integration branch>...<commit>`. Name the story's risk tags in the brief: the reviewer judges the code under them first. Your checkout stays at that commit while the reviewer works (`git rev-parse HEAD` must print it): the code graph indexes the working tree, the reviewer asks it what the commit reaches outside its diff, and it does not use the graph when HEAD is another commit. The same holds for every re-review, at its new commit. A review of a moving branch can approve code that is not what merges. Write the reviewed commit in your ledger.

Critical and Important findings reopen the build to fix them once; the re-review checks only that fix, `git diff <reviewed commit>..<new commit>`, and its commit becomes the reviewed one. There is no second round: whatever is still open after it, your human decides. Minor findings go to the ledger, never to a round. A security finding is told to your human in the session and never written into the pull request until it is fixed.

## Merge

Run `node <scripts>/stories.mjs --check` and open the pull request only when `node <scripts>/stories.mjs --pr <ID>` shows every criterion as a passing `[test]` or a `[manual]`. Branch → integration branch; title, body and reviewer as `references/git.md` says. When it is approved, and before you merge, run `git diff --name-only <reviewed commit> origin/<the story's branch>`: it must list nothing. Any file is code nobody reviewed: brief a re-review of `git diff <reviewed commit>..origin/<the story's branch>` first, with that commit as its `Commit:` and your checkout pulled to it. Then merge it through the API on your human's ok, with Squash, the title as the message, and the branch deleted (`references/git.md`, "Merge").

After the merge, `git fetch`, and find the squash commit (`git log -1 --format=%H origin/develop`, checking its title): write it in your ledger, and as the `# commit` line of `.orchestrator/locked/<ID>.txt`, since the branch's commits are gone from the remote. Then go back to `develop` and delete the local branch.

## Reopen a done story

When the behaviour of a done story must change, or a bug breaks one of its criteria, reopen the same story; never write a new one on top. An urgent bug in production is a hotfix first (`references/outside-stories.md`).

1. Create `feature/<id>-<slug>` (a change) or `fix/<id>-<slug>` (a bug) from the integration branch on the remote. A change sets each changed criterion back to `[unbuilt]`; a bug marks the criterion it breaks `[failing: <what fails>]`, or adds a criterion when none covers it.
2. Reopen the build. For a bug, find the root cause first; the builder writes a test under the criterion's ID that reproduces the bug and fails (`stories` skill, "Fixing a bug").
3. Then markers, Claude review and merge, as always.
