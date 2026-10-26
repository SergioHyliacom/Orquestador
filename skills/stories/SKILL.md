---
name: stories
description: Write, split, review and maintain user stories in a project that uses easyone-orchestrator. The design team writes them; the developers add the contract's operations. Covers the story file format, acceptance criteria as rules plus key examples, verification markers, splitting patterns, decisions, and the anti-patterns the validator flags. Use when creating or editing a story, turning a request into stories, splitting a large story, checking if a story is ready, or recording that a criterion fails.
---

# Stories

Stories are the only product artifact. There is no separate spec layer. A story records what one person can do, and its criteria record exactly what is true. The tests are the executable proof. The map is generated.

Story files are written in the project's language. Frontmatter keys stay in English. This skill names headings and markers by their English defaults; the project's translated labels live in `stories.config.json` → `labels`, and the project template lives in `<storiesDir>/templates/`.

## Levels

| Level | What it is |
|---|---|
| Activity | One step of the user's journey. Lives in `activities.json`. The backbone of the map. |
| Story | One capability a person notices. One file. |
| Criterion | One observable behaviour, checked one way. |

Stories have no priority field. The release sets the order. The first release in `stories.config.json` is the one that measures progress.

## The story file

- File: `stories/<activity folder>/<ID>-<short-title>.md`. Lowercase, no accents, hyphens.
- ID: the story's **Jira key**, e.g. `EO-123`. Create the Jira card first and use its key; the same ID names the branches and tags the tests. Criterion ID: `<ID>.N`, e.g. `EO-123.1`. IDs are permanent. Never reuse or renumber them, even after discarding.
- Activity: the `activity` field names it exactly as in `activities.json`. It decides the folder.
- Author: design writes every story with a screen. A story with no screen can be written by the developer who understands it, backend or frontend.
- Approval: the story's pull request. At least one person other than its author approves it; then the author or that person merges it.
- Tags: `tags` holds the risk tags (`.orchestrator.json` → `riskTags`) of the areas the story touches. Whoever writes the story sets them; a developer adds one at the kickoff when the story touches an area it does not name. A risk tag adds the reviewer at story close.
- Sides: the `sides` field lists the halves the story has: `[back, front]` (the default), `[front]` when it only uses the API as it is, `[back]` when it has no screen. The developers set it at the kickoff.
- Operations: the `operations` field lists the API operations (OpenAPI `operationId`s) the story uses, existing or new. Design leaves it empty. The developers fill it at the kickoff, and the validator checks that each one is in the spec.
- Title: starts with a verb in the infinitive or imperative and names what the person achieves.
- Status is never written by hand. The script computes it from the criteria and the decisions.

Sections, in order (the project uses its translated headings):

1. **Story**: "As a <persona>, I want <capability>, so that <benefit>." The persona comes from `stories.config.json` → `personas`. The benefit is not a restatement of the capability.
2. **Acceptance criteria**: see below.
3. **Out of scope**: what this story does not do, with the story ID that does it if one exists. Agents add unrequested features when nothing excludes them.
4. **Verification**: the exact command that checks this story.
5. **Open questions**: must be empty before the story is built.
6. **Notes**: optional. Files to follow as patterns, context for the builder. Never restate the Definition of Done, the project conventions or the rules in `docs/rules/`.

## Acceptance criteria

Each criterion is a **rule**, optionally followed by **key examples**.

```
- **EO-123.1** When the user saves a text, the system shows the new text in the preview. [unbuilt]
  - Given the heading says "Hello", when the user changes it to "Hi" and saves, then the preview shows "Hi".
  - Given the user clears the text, when they save, then the system keeps the previous text and shows an error.
```

- The rule states what the system does. No hedging: never "should", "may", "could". Name the behaviour.
- Add examples only where a rule could be read two ways. A boundary or an error case is the usual reason. An obvious rule needs no example.
- One behaviour per criterion. One "when" per example.
- Write examples declaratively ("the user saves"), not as clicks, selectors or URLs.
- Include the unhappy paths: error, empty, permission, limit. Agents skip them unless told.
- For a screen, name its states as criteria: loading, empty, error, success. Each state is something a test can observe.
- How a screen looks against its design is a criterion too. No test checks it: the design team checks it in the visual review and marks it `[manual YYYY-MM-DD, who]`.
- More than 6 criteria: split the story.

### Verification markers

Each criterion's rule line ends with exactly one marker (the project uses its translated markers):

| Marker | Meaning |
|---|---|
| `[test: <file> › "<test title>"]` | An automated test covers it. Counts only while the test passes. |
| `[manual YYYY-MM-DD, who]` | A person checked it by hand on that date. |
| `[unverified]` | The behaviour exists. Nobody has checked it. |
| `[unbuilt]` | The behaviour does not exist yet. |
| `[failing: reason]` | The behaviour exists and does not hold. |

In this project a test is tagged by starting its name with the criterion ID, and the marker is `[test]` with no reference:

- Go: a subtest, `t.Run("[EO-123.1] rejects an invalid NIF", ...)`.
- Vitest and the end-to-end runner: the title, `it("[EO-123.1] shows 'NIF no válido' under the field")`.

A criterion that both halves implement has a test on each side with the same ID. It works only when every test with its ID passes.

A bug is not a new story. Mark the criterion it breaks as failing.

## Fixing a bug

A bug reopens the story it breaks (`orchestrate` skill, §6.9); an urgent one in production is a hotfix first (§6.11).

1. Find the criterion the bug breaks. On the reopened `story/<ID>`, mark it failing, with the reason. If no criterion covers the behaviour, add one to the story it belongs to.
2. Find the root cause before changing code. Check the project's seams first: a bug where nothing errors and the old behaviour keeps showing is usually one half of a seam that did not change.
3. The builder of the side that owns it writes a test, under the criterion's ID, that reproduces the bug, and watches it fail. Unlock that test file first if it is locked.
4. The same builder fixes the code until the test passes, in the pair loop. The marker is set again at integration.

## Decisions

A decision is a choice between options, of product or of architecture: a provider, a library, hosting, pricing. It is the only place for one; there is no separate folder of architecture records. File: `decisions/DEC-NNN-<title>.md`, numbered from `DEC-001`. IDs are never reused.

A story names a decision in `blocked_by`. A story blocked by an open decision cannot be built. Decisions are human calls, and `decides` names who closes it: management for product and business, the technical lead for architecture. It closes through a pull request.


## Discarding

Never delete a story. Set `discarded: true` and add a **Discard reason** section with the date and the reason. It reaches the integration branch through `design/<ID>`, never through the story's own branches, and the card moves to Discarded when it merges (`orchestrate` skill, §6.10).

## Splitting a story

First check the story against INVEST without "small". A story that delivers nothing alone is a task: merge it into a valuable slice instead.

Then try these patterns in order. Prefer the split that lets you drop or defer a piece.

1. Workflow steps: the simple end-to-end path first, the extra steps later.
2. Operations: create, read, update, delete as separate stories.
3. Business-rule variations: one rule per story.
4. Data variations: one data type or source first.
5. Data-entry methods: the simplest input first.
6. Major effort: the first case carries the infrastructure; the rest are cheap.
7. Simple versus complex: the core case first, the variations later.
8. Defer performance: make it work, then make it fast, as two stories.
9. Spike: when the unknown is too big, a time-boxed investigation first.

Never split by layer ("API for…", "database for…", "front end of…"). A layer delivers nothing a person notices. The backend and frontend halves of a story are two sides of the same story, not two stories.

## Turning a request into stories

1. Find the activity. If none fits, propose a new one to the human; activities are product calls.
2. Create the story's Jira card, in the design status, after the human's ok on its text, and take its key as the ID. The card carries the title, the story sentence and the Figma link; the link to the story file is added when its pull request opens. Never the criteria.
3. Write the story and its rules. Ask the human only what you cannot infer, all at once.
4. Add key examples where a rule is ambiguous.
5. Fill out-of-scope and verification. Link the Figma frames in `screens`.
6. Run `node <storiesDir>/stories.mjs --ready <ID>`.
7. The story enters the integration branch through a pull request, which at least one person other than its author approves. Merging it is the approval: from then on it is the developers' turn.

## From a Figma design

Design's stories start from the design project in Figma (`orchestrate` skill, §6.1). Figma is the only home of the design: the story links its frames and never copies images, measurements or colours.

- **A story is a capability, not a screen.** One screen can hold several stories (a list, its filter, its export); one story can cross several screens (a sign-up in three steps). Split by what a person achieves, with the patterns in *Splitting a story*.
- **Each drawn state is a criterion:** loading, empty, error, success, permission denied, a limit reached. A state the story needs and Figma does not draw goes under Open questions until design draws it: the story is not ready.
- **`screens`** holds one link per frame the story uses: the Figma URL with its `node-id`, in the order of the flow.
- **How it looks against the frame** is the criterion design checks in the visual review (`[manual YYYY-MM-DD, who]`). Do not restate spacing, colours or type in criteria: Figma holds them.
- **Mobbin is a reference.** Use it to find the states and unhappy paths that similar flows in other apps handle and this design does not. It never becomes a criterion directly: what design adopts is drawn in Figma first. The references design keeps go to a Mobbin collection named after the story, never into the repository.
- **The activity** comes from where the flow sits in the product's journey (`activities.json`), not from the Figma page it was drawn on.

## What the validator flags

`stories.mjs` checks structure on every run and readiness with `--ready`:

- Errors: an ID that is not a Jira key, repeated IDs, file in the wrong folder, activity name that does not match `activities.json`, unknown release or persona, missing marker, unknown marker, missing test, unknown decision or `depends_on`, discarded without reason.
- Not ready: empty out-of-scope, empty verification, open questions, open blocking decision, hedged words in a rule.
- Warnings: story text not in the persona/want/benefit shape, vague words ("fast", "easy", "intuitive"…), more than 6 criteria, dependency not yet working.

Things the validator cannot see. Check them yourself when you write or edit a story:
- A generic persona ("user") where a specific one exists.
- A benefit that restates the want.
- A solution in the want: button, modal, endpoint, table. Test: would the wording change if the implementation changed?
- A horizontal slice with no observable outcome.
- The Definition of Done leaking into criteria ("tests written", "code reviewed").
- Over-specification: file names, algorithms or class structure without a stated reason.
