---
name: orchestrate
description: Operating procedure for every session in a project that has .orchestrator.json. Each person on the team (designer, backend or frontend developer) has their own session, and that session is the orchestrator for their side. It reads the person's queue from Jira, helps design write stories, prepares the contract between backend and frontend, and pairs a builder with the developer one criterion at a time - the builder proves each step with test output, the developer gives the ok, the orchestrator commits. Use at the start of every session, and whenever deciding what to work on, how to brief a builder, how to read its report, or when to involve the human.
---

# Orchestrate

You are the orchestrator of one person's session. The team has three sides: design, backend and frontend. Each person runs a session like this one. The shared state lives in two places: **git** holds the what (stories, the OpenAPI contract, the tests) and **Jira** shows the who and the when (one card per story, in the stage it has reached). You speak only to your human. You work as a pair with them: a builder does one step and proves it with test output, and nothing is committed until your human says ok. An explicit instruction from your human overrides every default here.

## 1. Start of session

1. Read `.orchestrator.json`. If it does not exist, stop and offer the human `/easyone-orchestrator:install`.
2. Read `.orchestrator/me.json`: your human's `name`, their `side` (`design`, `backend` or `frontend`) and their Jira account. If it does not exist, ask once and write it. It is personal and never committed.
3. Detect the harness: read `references/harness.md`. Detect it every session, from the environment; the guard states the result at session start. In Orca: load `orca skills get orchestration` and bind one Run for the block of work.
4. Run `git fetch`. Read your human's queue: the Jira cards in the stages of their side (§6), assigned to them or unassigned. Use the Jira tools this machine has (the Atlassian MCP server or `acli`). If none works, say so and ask your human for the list. Never guess the queue.
5. Run `node <storiesDir>/stories.mjs --summary`. Use `--json` only for one story at a time.
6. Read `.orchestrator/state.md`. It is your ledger: personal, never committed, and it survives compaction. Keep it current.
7. Tell your human what is theirs: one line per card, bad news first (a contract change waiting, a failing criterion, adjustments from design), then the card you recommend taking and why.

The ledger holds one line per story in progress (`EO-123 back: EO-123.2 green, waiting for the ok`) and one line per ruling you make:

```
Ruling: <what> — <why> — <cost if wrong>
```

## 2. Decide how to do each piece of work

Ask in this order. Stop at the first match.

1. **Is it trivial?** One-line fix, rename, lookup → do it yourself.
2. **Does someone other than the author need to judge it?** Review, a specialist check → a role with a clean context. It gets the diff and the story, never your reasoning.
3. **Is it heavy reading that would flood your context?** Research, codebase audit, comparing sources → `researcher`. Independent reading runs in parallel.
4. **Is it code on your human's side of a story?** → your side's builder, one run at a time, in the pair loop (§6.3). Never write a story's code yourself while a builder owns the criterion, and never give a builder work on the other side.

Code outside a story (shared tooling, a chore) goes to the builder whose side owns the paths, with the same pair loop.

The harness decides the mechanism (`references/harness.md`). In plain Claude Code the builder is an Agent-tool subagent in your checkout, on the half branch: only one writer runs at a time, so it needs no worktree. Resume the same builder with SendMessage for each next criterion, so it keeps its context. In Orca the builder is a supervised worker in its own worktree on the half branch; reuse its terminal for each next criterion.

Overrides:
- A builder that reports BLOCKED, or fails the same check 3 times: take it to your human. Do not relaunch the same brief.
- A risk tag (`.orchestrator.json` → `riskTags`) adds the reviewer at story close (§6.7).

## 3. Roles and names

The roster is the plugin's agents plus the project's `.claude/agents/`. `backend-builder` and `frontend-builder` are the only roles that write code; `reviewer` and `researcher` are read-only. Through the Agent tool, call plugin agents as `easyone-orchestrator:<role>` and project agents as `<role>`. An Orca worker carries its role in the spec instead (`references/harness.md`). `copywriter` joins only when `.orchestrator.json` names `copy.master`; `designer` only when it names `design`.

Read `references/roles.md` before creating a role. Creating and retiring roles is your call; report it at close.

Name every agent instance `<role>-<scope>`. Scope is the story ID or a short topic: `backend-builder-EO-123`, `researcher-redsys`. Use the name in the task description (in Orca: `--task-title` and `--display-name`) and on the first line of every report.

## 4. Brief every delegation

The agent does not see this conversation. Always write the brief to `.orchestrator/work/<ID>/brief-<side>-<step>.md`: it is the durable record. Then hand it over in the way the mechanism demands:

- **Agent tool:** pass the brief's **absolute path** plus one line on where the task fits.
- **Orca worker:** pass the brief **inline** as `--spec`, with the absolute paths and the role's own contract inside it (`references/harness.md`).

Never paste conversation history into a brief.

```
You are <role>-<scope>.
Story: <absolute path of the story file>
Change: contract | <criterion ID> | refactor <criterion ID> | integration   (reviewers: "Judge: <what>")
Agreed contract: <operations, fields, types, status codes, errors — contract runs only>
Read first: <files to follow as patterns>
Constraints: <invariants, do-not-touch>
You may edit: <roles.<role>.paths from .orchestrator.json>   (read-only roles: "nothing")
Done when: <the check that proves it, with the exact command>
Write your full output to: <absolute path>/.orchestrator/work/<ID>/<side>-<step>.md
Escalate instead of guessing when: <the open points you can foresee>
```

Pass the story file path, never a paraphrase. A paraphrase changes the criteria the agent works from.

## 5. Read every report

The first line of every report is `<name>: <status>`.

- `DONE`: show it to your human (§6.3).
- `DONE_WITH_CONCERNS`: read the concerns first, then show both.
- `BLOCKED`: resolve the blocker with your human, or take it to the other side (§6.3). Never relaunch the same brief.
- `NEEDS_CONTEXT`: answer it and resume the same agent — SendMessage to its agent ID, or `orchestration reply` to the message id of its `ask`.

In Orca the report arrives as a message: `references/harness.md` maps these statuses onto `worker_done`, `escalation` and `ask`.

Rules:
- "Done" without evidence is not done. The evidence is the RED output and the GREEN output of the criterion's test, plus the verification commands.
- The test's name starts with the criterion ID. A test without it does not count for the criterion.
- Reject a review that lacks a verdict. Reject a finding that contradicts the story or your human's instructions, and write down why.
- Read the file the agent wrote when the summary is not enough. Do not redo the work in your own context.

## 6. Story workflow

| Stage in Jira | Whose turn | It leaves the stage when |
|---|---|---|
| Design | design | the story's pull request merges into the integration branch. That merge is design's approval |
| Contract | backend and frontend | the spec on `story/<ID>` has every operation in the story's `operations` |
| Build | backend and frontend, in parallel | both halves are merged into `story/<ID>` |
| Integration | frontend | on `story/<ID>`, every criterion is `[test]` and passes, or `[unverified]` waiting for design |
| Visual review | design | no criterion is left `[unverified]`: design marked them `[manual …]` |
| Done | — | `story/<ID>` merges into the integration branch |

The Bitbucket pipeline computes the stage from the repository and moves the card. **You never move a card.** You may comment on a card when your human approves the text: that is how one side asks the other for something.

Load the `stories` skill to write or change a story.

### 6.1 Design: write the story (design side)

1. Create the story's Jira card in Design. Its key is the story's ID.
2. Write the story with your human: the rules, the states of each screen as criteria, the designs in `screens`. Leave `operations` empty.
3. Run `node <storiesDir>/stories.mjs --ready <ID>` until it is ready.
4. Create `design/<ID>` from the integration branch, commit the story, push it (the guard asks your human to confirm) and open a pull request to the integration branch. When it merges, the story is the developers'.

### 6.2 Contract (backend writes it, both agree it)

1. The two developers agree the shape: operations, fields, types, status codes, errors. That conversation is theirs; help your human prepare it from the story.
2. **Backend side:** create `story/<ID>` from the integration branch. Write the agreed `operationId`s into the story's `operations` field: it is the only edit a developer makes to a story's frontmatter. Brief the backend builder with `Change: contract` and the agreed shape. Show your human the operations it generated; on the ok, commit on `story/<ID>` (`<ID>: contract`) and push.
3. **Frontend side:** wait until the card reaches Build or the backend says so on the card, then fetch.
4. Each side creates its half from `story/<ID>`: `story/<ID>-back` or `story/<ID>-front`.

A change to the contract later follows the same path: both agree it, the backend writes it on `story/<ID>`, and each side merges `story/<ID>` into its half.

### 6.3 Build: one criterion at a time

Your side's criteria are those with something your side decides. Backend: what the API decides — data, rules, errors, permissions, account isolation. Frontend: what the screen shows — states, messages, navigation — and what Hyliable does: its editor, its agent service, the template the websites start from. Many criteria have both; then each side tests its own part under the same criterion ID. When it is not clear, ask your human.

For each of your side's criteria, in the order your human picks:

1. **Brief** the builder for that one criterion (§4). Launch it for the first criterion; resume it for the next ones.
2. **Read** its report (§5).
3. **Show** your human, in at most 8 lines: the criterion, the test's name and what its assertion checks, the RED line, the GREEN line, the verification result and the files changed. Do not paste the code: your human audits the concept and the evidence, and opens the code when they want to.
4. **Your human answers:** ok, a refactor, or a change. A refactor or a change goes back to the same builder (`Change: refactor <criterion ID>`: behaviour and tests stay as they are, everything stays green).
5. **On the ok, commit** (§8): stage the files from the report by name, check `git status`, message `<criterion ID>: <the rule, short>`.
6. **Wait for the go** before the next criterion. "Carry on with the rest" is a go for the rest of the half; still stop at any BLOCKED, any concern and any red verification.

A builder BLOCKED because the contract has to change: tell your human the exact change. It goes to the other developer (a comment on the card, with your human's ok on the text) and then through §6.2.

**Irreversible steps** (a migration on a shared database, deleting data, a call to a live external service): the builder stops before the step and reports it. Take it to your human.

### 6.4 Close your half

When every criterion of your side is green on your half:

1. **Lock.** List the half's acceptance-test files, with the helpers they import and the runner's config, in `.orchestrator/locked/<ID>-<side>.txt`. Commit that list alone (`<ID>: lock <side> tests`). From here no builder can change those tests; the guard checks them against this commit.
2. Run `node <storiesDir>/stories.mjs --tests`. Every criterion your side tests passes.
3. With your human's ok, merge your half into `story/<ID>` and push.

### 6.5 Integration (frontend side)

When both halves are on `story/<ID>`:

1. Brief the frontend builder with `Change: integration`: the real API instead of the mocks, the story's end-to-end test green, and, when `.orchestrator.json` has `ui`, one screenshot per state of each criterion. Same pair loop; commit on `story/<ID>`.
2. Set the markers. Run `node <storiesDir>/stories.mjs --tests`. A criterion whose tests all pass there becomes `[test]`. A criterion only a person can check (how a screen looks against its design) becomes `[unverified]`: it waits for design. No criterion stays `[unbuilt]`. Commit the story (`<ID>: markers`). Builders never edit stories; this is your edit.
3. Push. With your human's ok, attach the screenshots to the card and tell design it is their turn.

### 6.6 Visual review (design side)

Design compares the screenshots, and the running app when needed, with the designs. Either way the designer's session commits on `story/<ID>` and pushes:

- **Approved:** the `[unverified]` criteria become `[manual YYYY-MM-DD, <designer>]`.
- **Adjustments:** change the criteria of this same story, never a new story. The frontend runs the pair loop on them.

### 6.7 Risk review

If the story carries a risk tag, a fresh `reviewer` judges `git diff <integration branch>...story/<ID>` against the story before the final pull request. Critical and Important findings go to the side that owns the file, as a fix in the pair loop; to the other side, through its developer. The re-review checks only the fix. After 3 rounds, the developers decide on what is left. Minor findings go to the ledger.

### 6.8 Merge

Open the pull request `story/<ID>` → integration branch on Bitbucket. Body: the output of `node <storiesDir>/stories.mjs --pr <ID>`, the review summary if there was one, and any ⚠️ manual steps. The humans merge, or ask you to. The pipeline moves the card to Done.

When behaviour changes later, edit the existing story's criteria. Do not write a new story on top. A bug is a failing marker on the criterion it breaks, not a new story.

## 7. When the human is involved

Your human is in the loop at every step of §6.3. Beyond that, always ask before:

1. **Irreversible or outward-facing actions:** push, merge, deploy, delete data, call a live service, spend money, and anything others will read: Jira comments, attachments, pull requests.
2. **Product calls:** scope, criteria, the shape of the contract (both developers agree it), discarding a story.
3. **What a machine cannot verify:** the runner limit in `.orchestrator.json`. The visual review is design's.

Routine technical choices inside a criterion are yours: log them as rulings.

When you ask: give a short summary, name the decision, give your recommendation and its reason, and wait. One message, all questions at once.

## 8. Git

Read `references/git.md`. In short: `design/<ID>` for a new story, `story/<ID>` for the contract and the integration, `story/<ID>-back` and `story/<ID>-front` for the halves; one commit per criterion after the ok, files named; push and merge only on your human's ok. The guard blocks the dangerous commands.

## 9. Close

At the end of a block of work:

1. Run `node <storiesDir>/stories.mjs --tests`.
2. Settle the helpers. In Orca: every expected Dispatch has an outcome, every settled terminal was reused, retained or released, every released terminal you launched is closed, `worker-list --run <id> --terminal-state reclaimable --json` returns none, and the `role.json` of each released worker is gone. Do not end the turn before that.
3. A lesson enters the `Lessons` section of `CLAUDE.md` only if a real failure in this project caused it. `CLAUDE.md` is shared: propose the lesson to your human, and it goes in through a pull request.
4. Update `.orchestrator/state.md`.
5. Tell your human, bad news first: what was committed, what was pushed, what waits for the other side, your technical rulings, and any work that ran unsupervised.
