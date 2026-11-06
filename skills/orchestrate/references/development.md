# Development: from the kickoff to the merge

Builders do the code; you brief them and check their evidence (`references/delegation.md`). The plugin ships no builder at the moment (`SKILL.md`, §5): until the team defines who writes the code, stop where a step needs one and tell your human.

**One branch per story:** `story/<ID>`.

## Kickoff

1. **Read the story with your human first.** When a criterion is ambiguous, contradicts another, lacks a state or an error, or cannot be built with what exists, write it under **Open questions**, one line per criterion ID, and resolve it with your human before anything is built.
2. **Kickoff.** Create `story/<ID>` from the integration branch on the remote. If the story touches a risk area its `tags` do not name (`riskTags` in `.orchestrator.json`), add that tag. That is the only frontmatter edit at the kickoff, with one exception: a tag the machine asks for later. `stories.mjs --check` (in the pipeline) and `--pr` fail when the story branch changes a path that `.orchestrator.json` → `riskPaths` gives a tag the story lacks, and a builder's `Risk:` line can name one; add it in a commit of its own (`<ID>: risk tag <tag>`). A tag is never removed to make the check pass. A story that creates a module in a risk area also adds its `riskPaths` entry at the kickoff (`references/risk-map.md`). Commit `<ID>: kickoff` and push.

## Build: one criterion at a time

Your human gives the ok on the first criterion, where the pattern shows, and on the finished build. Between the two you carry on alone. For each criterion, in the story's order:

1. **Brief** the builder for that one criterion. Launch it for the first; resume it for the next ones.
2. **Check the evidence yourself:** the test's name starts with the criterion ID; RED failed on an assertion about the criterion, not on a compile error; GREEN and the fast checks pass; every changed file belongs to this criterion, and is inside the builder's paths when its role has them (`roles.<role>.paths`); the `GRAPH:` line names the callers the code graph returned for each function the change touches, or why the graph could not answer (a report with neither goes back); each pin passed before the change and passes after, and when the change touches shared code (a handler, a validation, a query, a shared component or hook) and the report names no pin, its reason holds; the `Risk:` line names no risk tag the story lacks, or you add it; when it names code no `riskPaths` entry covers, offer your human a `chore/risk-map` pull request that adds it (`references/risk-map.md`). A criterion reported as already met has no RED: check that its assertion observes the criterion, and commit the test alone. A failed check goes back to the same builder. After three builder runs without a commit (`verify.maxBuilderRuns` in `.orchestrator.json`), the guard asks your human before each further run. Give them one line per run, what it was for and what it returned, and leave the answer to them: never advise it.
3. **First criterion: your human's ok.** In at most 8 lines: the criterion, the test's name, what its assertion checks, the RED and GREEN lines, the files changed. No code. Ask: "Does this assertion check what the criterion says?" A refactor or a change goes back to the same builder (`Change: refactor <criterion ID>`), with what your human said, word for word, under `Request:`.
4. **Commit:** the files from the report by name, message `<criterion ID>: <the rule, short>`. After the first, commit each one without asking.
5. **Stop and go to your human** at a BLOCKED or a concern, a further run the guard asks about, or an irreversible step (a migration on a shared database, deleting data, a live external service). They may also ask for the ok on every criterion.

## Close the build

When every criterion is green:

1. **Verify everything once.** Run `verify.all` yourself: the builders ran only the fast checks. A failure goes back to the builder.
2. **Show the result:** one line per criterion (its test and what it checks), the files changed. Your human's ok closes the build; a change reopens the criteria it names.
3. **Lock.** List the story's acceptance-test files, with the helpers they import and the runners' config, in `.orchestrator/locked/<ID>.txt`. Commit it alone (`<ID>: lock tests`) and push. From here no builder can change those tests, and the pipeline knows the build is closed.

**Locks never expire.** When other work must change a locked file (another story, a runner upgrade, a hotfix), remove it from its list in a commit of its own (`<ID>: unlock <file>`), with your human's ok, and lock it again when the change is done.

**Reopen the build** when a change comes back to it: a review finding, or a criterion that changed. Remove from the lock list the tests of the criteria that change, in a commit of its own (`<ID>: unlock <criterion IDs>`), before you brief the builder: the guard reads the locks from that commit. Then build those criteria again, verify, and lock again.

## Markers

When the build is closed:

1. Run `node <scripts>/stories.mjs --tests`. A criterion whose tests all pass becomes `[test]`. Anything only a person can check (an email that arrives, a live service, how a screen looks) is checked now by your human and becomes `[manual YYYY-MM-DD, <name>]`. No criterion stays `[unbuilt]`. Commit `<ID>: markers`. Builders never edit stories.
2. Push, and go on to the risk review and the merge.

## Risk review

If the story carries a risk tag, brief a fresh `reviewer` with the story and one exact commit, never the branch: push, then take `git rev-parse origin/story/<ID>` and name it as `Commit:` in the brief, with `git diff <integration branch>...<commit>`. Your checkout stays at that commit while the reviewer works (`git rev-parse HEAD` must print it): the code graph indexes the working tree, the reviewer asks it what the commit reaches outside its diff, and it does not use the graph when HEAD is another commit. The same holds for every re-review, at its new commit. A review of a moving branch can approve code that is not what merges. Write the reviewed commit in your ledger. Critical and Important findings reopen the build to fix them once; the re-review checks only that fix, `git diff <reviewed commit>..<new commit>`, and its commit becomes the reviewed one. There is no second round: whatever is still open after it, your human decides. Minor findings go to the ledger, never to a round.

## Merge

Open the pull request only when `node <scripts>/stories.mjs --pr <ID>` shows every criterion as a passing `[test]` or a `[manual]`. `story/<ID>` → integration branch; body: that output, the review summary if any, and any ⚠️ manual steps; reviewer: someone other than your human. When it is approved, and before you merge a story that had a risk review, run `git diff --name-only <reviewed commit> origin/story/<ID>`: it may list only the story file and the lock list. Any other file is code nobody reviewed: brief a re-review of `git diff <reviewed commit>..origin/story/<ID>` first, with `git rev-parse origin/story/<ID>` as its `Commit:` and your checkout pulled to it. Then merge it through the API on your human's ok, with a merge commit that deletes `story/<ID>` (`references/git.md`).

## Reopen a done story

When the behaviour of a done story must change, or a bug breaks one of its criteria, reopen the same story; never write a new one on top. An urgent bug in production is a hotfix first (`references/outside-stories.md`).

1. Create `story/<ID>` again from the integration branch on the remote. A change sets each changed criterion back to `[unbuilt]`; a bug marks the criterion it breaks `[failing: <what fails>]`, or adds a criterion when none covers it. Commit `<ID>: reopen <criterion IDs>` and push.
2. Reopen the build. For a bug, find the root cause first; the builder writes a test under the criterion's ID that reproduces the bug and fails (`stories` skill, "Fixing a bug").
3. Then markers, risk review and merge, as always.
