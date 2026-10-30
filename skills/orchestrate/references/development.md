# Development: from the kickoff to the merge

Builders do the code; you brief them and check their evidence (`references/delegation.md`).

**One branch per story.** Both sides work on `story/<ID>`. Each side changes only its own paths (`roles.<role>.paths`), so they do not collide. Before each push, `git pull --rebase`; a conflict means both sides touched the same file: stop and tell your human.

**Whose criterion.** Backend: what the API decides — data, rules, errors, permissions, account isolation. Frontend: what the screen shows — states, messages, navigation — and Hyliable: its editor, its agent service, the website template. A criterion with both gets a test on each side under the same criterion ID. When it is not clear, ask your human.

## Kickoff and contract

Who does the kickoff depends on the story. **With a screen,** the card's Frontend person: they read in the spec (`contract.spec`, generated from the code) whether the API already gives what the screen needs. **With no screen,** the card's Backend person. When the card lacks that person, the other one. The pipeline assigns the card to them.

1. **Read the story with your human first.** When a criterion is ambiguous, contradicts another, lacks a state or an error, or cannot be built with what exists, return the story instead: create `design/<ID>` from the integration branch on the remote, write under **Open questions** what is missing, one line per criterion ID, open its pull request with the designer as reviewer, and merge it (your human may merge it alone). With their ok on the text, mention the designer in a card comment. The pipeline moves the card back to Design.
2. **Decide the case.** What matters is whether the **shape** of the API changes: its endpoints, the fields they take or return, their errors. A new rule or new stored data does not change it.

   | Case | Example | Contract | `sides` |
   |---|---|---|---|
   | It changes the API | a new endpoint, a new or renamed field, a new error | agreed by both, written by the backend | `[back, front]`, or `[back]` when no screen uses it yet |
   | Front only | showing a field that already arrives, an empty state, the Hyliable editor | none | `[front]` |
   | Back only | a rule on the data, a periodic task, emails, an importer | none | `[back]` |

3. **Kickoff.** Propose the case to your human and confirm it. Create `story/<ID>` from the integration branch on the remote and write in the story's frontmatter `sides`, `operations` (the `operationId`s it uses, existing or new) and, when the API changes, `changes` (the existing operations whose shape it changes: a new parameter, field or error). Until the spec on `story/<ID>` differs from the integration branch's for each of them, the validator counts the contract as missing, and the card stays in Contract. If it touches a risk area its `tags` do not name (`riskTags` in `.orchestrator.json`), add that tag. These are the only frontmatter edits a developer makes. Commit `<ID>: kickoff` and push.
4. **Contract, only when the API changes.** When the frontend did the kickoff, it tells the card's Backend person in a card comment what the screen needs from the API that the spec lacks (a fact, no ok needed). It is a written proposal, not a meeting. The backend session drafts the shape (operations, fields, types, status codes, errors) and, with its human's ok, posts it as a card comment that mentions the Frontend person. Their session asks them: yes, no (and what to change), or let's talk. On a yes, brief the backend builder with `Change: contract`, show your human the generated operations, commit `<ID>: contract` on `story/<ID>` and push.

A later change to the contract follows the same path. A story that turns out to need the other side gets it added to `sides`.

## Build: one criterion at a time

Your human gives the ok on the first criterion of your side, where the pattern shows, and on the finished side. Between the two you carry on alone. For each of your side's criteria, in the story's order:

1. **Brief** the builder for that one criterion. Launch it for the first; resume it for the next ones.
2. **Check the evidence yourself:** the test's name starts with the criterion ID; RED failed on an assertion about the criterion, not on a compile error; GREEN and the side's fast checks pass; every changed file is in your side's paths and belongs to this criterion. A criterion reported as already met has no RED: check that its assertion observes the criterion, and commit the test alone. A failed check goes back to the same builder; twice, to your human.
3. **First criterion: your human's ok.** In at most 8 lines: the criterion, the test's name, what its assertion checks, the RED and GREEN lines, the files changed. No code. Ask: "Does this assertion check what the criterion says?" A refactor or a change goes back to the same builder (`Change: refactor <criterion ID>`).
4. **Commit:** the files from the report by name, message `<criterion ID>: <the rule, short>`. After the first, commit each one without asking.
5. **Stop and go to your human** at a BLOCKED or a concern, the same failure 3 times, a change to the contract, or an irreversible step (a migration on a shared database, deleting data, a live external service). They may also ask for the ok on every criterion.

A builder BLOCKED because the contract must change: tell your human the exact change; it goes to the other developer as a card comment, with their ok, and then through the contract step.

## Close your side

When every criterion of your side is green:

1. **Verify everything once.** Run `verify.all` yourself: the builders ran only the fast checks. A failure goes back to the builder.
2. **Show the result:** one line per criterion (its test and what it checks), the files changed, the screenshots if any. Your human's ok closes the side; a change reopens the criteria it names.
3. **Lock.** List your side's acceptance-test files, with the helpers they import and the runner's config, in `.orchestrator/locked/<ID>-<side>.txt`. Commit it alone (`<ID>: lock <side> tests`) and push. From here no builder can change those tests, and the pipeline knows your side is closed.

**Locks never expire.** When other work must change a locked file (another story, a runner upgrade, a hotfix), remove it from its list in a commit of its own (`<ID>: unlock <side> <file>`), with your human's ok, and lock it again when the change is done.

**Reopen your side** when a change comes back to it: an end-to-end test that fails because of your side, an adjustment from design, or a review finding. Remove from your lock list the tests of the criteria that change, in a commit of its own (`<ID>: unlock <side> <criterion IDs>`), before you brief the builder: the guard reads the locks from that commit. Then build those criteria again (agree the contract first when the API's shape changes), verify, and lock again.

## Integration and markers

The frontend integrates; the backend, when the story has no screen. When every side in `sides` is closed:

1. **With a screen:** brief the frontend builder with `Change: integration`: the real API instead of the mocks, the story's end-to-end test green, and, when `.orchestrator.json` has `ui`, one screenshot per state of each criterion. If the end-to-end test fails because of the API, the builder reports BLOCKED and never touches backend code: tell the backend developer the exact problem in a card comment (a fact, no ok needed). They reopen their side, and integration resumes.
2. **Markers.** Run `node <scripts>/stories.mjs --tests`. A criterion whose tests all pass becomes `[test]`. How a screen looks against its design becomes `[unverified]` and waits for design. Anything else only a person can check (an email that arrives, a live service, what Hyliable's agent does) is checked now by your human or the developer of the side that owns it, and becomes `[manual YYYY-MM-DD, <name>]`. No criterion stays `[unbuilt]`. Commit `<ID>: markers`. Builders never edit stories.
3. **Push.** If a criterion waits for design, attach the screenshots to the card and mention the designer in a comment that names the screens and states to look at. Otherwise go on to the risk review and the merge.

## Risk review

If the story carries a risk tag, brief a fresh `reviewer` with `git diff <integration branch>...story/<ID>` and the story before the final pull request. Critical and Important findings go to the side that owns the file, which reopens its side to fix them once; the re-review checks only that fix. There is no second round: whatever is still open after it, the developers decide with their humans. Minor findings go to the ledger, never to a round.

## Merge

Open the pull request only when `node <scripts>/stories.mjs --pr <ID>` shows every criterion as a passing `[test]` or a `[manual]`. `story/<ID>` → integration branch; body: that output, the review summary if any, and any ⚠️ manual steps; reviewer: someone other than your human (by default the other side's person on the card). When it is approved, merge it through the API on your human's ok, with a merge commit that deletes `story/<ID>` (`references/git.md`). The pipeline moves the card to Done.

## Reopen a done story

When the behaviour of a done story must change, or a bug breaks one of its criteria, reopen the same story; never write a new one on top. An urgent bug in production is a hotfix first (`references/outside-stories.md`). Design reopens it for a change of behaviour; for a bug, the developer of the side that owns what fails.

1. Create `story/<ID>` again from the integration branch on the remote. A change sets each changed criterion back to `[unbuilt]`; a bug marks the criterion it breaks `[failing: <what fails>]`, or adds a criterion when none covers it. Empty `changes` unless the reopened story changes the API again: the old contract is already on the integration branch. Commit `<ID>: reopen <criterion IDs>` and push. The card goes from Done to Integration.
2. Tell the other side on the card which criteria reopened, when they are theirs.
3. Each side that owns what changes reopens its side. For a bug, find the root cause first; the builder writes a test under the criterion's ID that reproduces the bug and fails (`stories` skill, "Fixing a bug").
4. Then integration, markers, visual review when needed, risk review and merge, as always.
