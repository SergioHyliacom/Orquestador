---
name: stories
description: Write, split, review and maintain user stories in a project that uses easyone-orchestrator. Covers the story file format, acceptance criteria as rules plus key examples, verification markers, splitting patterns, the ADRs a story waits for, and the anti-patterns the validator flags. Use when creating or editing a story, turning a request into stories, splitting a large story, checking if a story is ready, or recording that a criterion fails.
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
- ID: a prefix and a number, e.g. `EO-123` (`stories.config.json` → `idPrefix` pins the prefix). It comes with the story from gg-ez, where the story is written (`orchestrate` skill, §5); until that link exists, the human gives it. The same ID, in lowercase, starts the story's branch (`feature/eo-123-<slug>`) and tags the tests. Criterion ID: `<ID>.N`, e.g. `EO-123.1`. IDs are permanent. Never reuse or renumber them, even after discarding.
- Activity: the `activity` field names it exactly as in `activities.json`. It decides the folder.
- Tags: `tags` holds the risk tags (`.orchestrator.json` → `riskTags`) of the areas the story touches. Whoever writes the story sets them; one is added at the kickoff when the story touches an area it does not name, and later when the machine asks for it: `stories.mjs --check` and `--pr` fail when the story branch changes a path that `.orchestrator.json` → `riskPaths` gives a tag the story lacks. A tag is never removed to make that check pass. A risk tag adds the reviewer at story close.
- Title: starts with a verb in the infinitive or imperative and names what the person achieves.
- Status is never written by hand. The script computes it from the criteria and the ADRs it waits for.
- Where it lives: on your machine, in `<storiesDir>/stories/` under `.orchestrator/`, never in the repository (`orchestrate` skill, `references/where-things-live.md`).

Sections, in order (the project uses its translated headings):

1. **Story**: "As a <persona>, I want <capability>, so that <benefit>." The persona comes from `stories.config.json` → `personas`. The benefit is not a restatement of the capability.
2. **Acceptance criteria**: see below.
3. **Out of scope**: what this story does not do, with the story ID that does it if one exists. Agents add unrequested features when nothing excludes them.
4. **Verification**: the exact command that checks this story.
5. **Open questions**: must be empty before the story is built. The kickoff writes here what it cannot build, one line per criterion ID, until they are answered and the section is empty again.
6. **Notes**: optional. Files to follow as patterns, context for the builder. Never restate the Definition of Done or the project's norms (`CONTRIBUTING.md`, `CODING_STANDARDS.md`, the ADRs).

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
- More than 6 criteria: split the story.

### Verification markers

Each criterion's rule line ends with exactly one marker (the project uses its translated markers):

| Marker | Meaning |
|---|---|
| `[test: <file> › "<test title>"]` | An automated test covers it. Counts only while the test passes. |
| `[manual YYYY-MM-DD, who]` | A person checked it by hand on that date. |
| `[unbuilt]` | The behaviour does not exist yet. |
| `[failing: reason]` | The behaviour exists and does not hold. |

In this project a test is tagged by starting its name with the criterion ID, and the marker is `[test]` with no reference:

- Go: a subtest, `t.Run("[EO-123.1] rejects an invalid NIF", ...)`.
- Vitest and the end-to-end runner: the title, `it("[EO-123.1] shows 'NIF no válido' under the field")`.

A criterion can have several tests with the same ID, in different runners (a Go subtest and an end-to-end test). It works only when every test with its ID passes.

A bug is not a new story. Mark the criterion it breaks as failing.

## Fixing a bug

A bug reopens the story it breaks (`orchestrate` skill, `references/development.md`); an urgent one in production is a hotfix first (`references/outside-stories.md`).

1. Find the criterion the bug breaks. On the reopened story (its branch `fix/<id>-<slug>`), mark it failing, with the reason. If no criterion covers the behaviour, add one to the story it belongs to.
2. Find the root cause before changing code. Check the project's seams first: a bug where nothing errors and the old behaviour keeps showing is usually one end of a seam that did not change.
3. The builder writes a test, under the criterion's ID, that reproduces the bug, and watches it fail. Unlock that test file first if it is locked.
4. The same builder fixes the code until the test passes, in the pair loop. The marker is set again at the markers step.

## Decisions: the ADRs

A choice of architecture, and anything in the list of `CONTRIBUTING.md` «Cuándo hace falta un ADR», is an ADR of the project: `docs/adr/NNNN-<title>.md`, from its `README.md`, accepted by the technical lead. The decisions D1-D30 are in section 14 of `docs/definicion.md`. There are no decision files of the plugin's own: never write a `DEC-NNN`.

A story that waits for an ADR names it in `blocked_by`: `blocked_by: [ADR-0023]`. `stories.mjs` reads its `Estado` line: while it says `propuesta`, the story is blocked and cannot be built; once `aceptada`, it is not. A product choice (a flow, a screen, a text) needs no ADR: it is the story's, and gg-ez's.


## Discarding

Never delete a story. Set `discarded: true` and add a **Discard reason** section with the date and the reason. The discard arrives from gg-ez (`orchestrate` skill, §5); until that link exists, the human says so and the discard goes in its own pull request.

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

Never split by layer ("API for…", "database for…", "front end of…"). A layer delivers nothing a person notices: the layers a story crosses are parts of the same story, not stories of their own.

## Porting a story from the design repo

When this machine has a design repo configured (`design-source.mjs --init`), a screen's story can start there (`orchestrate` skill, §5). Run `design-source.mjs --show <ID>` and rewrite it as a story of this project:

- Keep what the person achieves and the states (loading, empty, error, success). Take the ID this project gives it; note the design repo's ID in Notes so the two can be matched.
- Drop what belongs to its prototype: demo data, the control bar, `[test: src/data/…]` markers. Every criterion starts `[unbuilt]`.
- Name in Notes the lock (`lock/<ID>-<screen>`) and the captures the builder must match, and which `@easyone/ui` components are likely to carry it. Design values (sizes, colours, copy) are read from the lock by the builder, never written into the story.
- Name in Notes the API operations the story needs, and whether each is already in `packages/api-client/openapi.json`. One that is not is still to be agreed (`orchestrate` skill, §5): it goes to Open questions.
- What contradicts what binds (`CLAUDE.md`, «Qué obliga y qué no») goes to Open questions. A flow, a step or a button that differs from the definition's description of the product does not: design and product decide those.
- Close with `design-source.mjs --record <ID>`.

## Turning a request into stories

1. Find the activity. If none fits, propose a new one to the human; activities are product calls.
2. Take the story's ID (see *The story file*).
3. Write the story and its rules. Ask the human only what you cannot infer, all at once.
4. Add key examples where a rule is ambiguous.
5. Fill out-of-scope and verification.
6. Run `node <scripts>/stories.mjs --ready <ID>`.

A story is approved where it is written, in gg-ez. The kickoff reads it again before anything is built (`orchestrate` skill, `references/development.md`).

A story is a capability, not a screen. One screen can hold several stories (a list, its filter, its export); one story can cross several screens (a sign-up in three steps). Split by what a person achieves, with the patterns in *Splitting a story*.

## What the validator flags

`stories.mjs` checks structure on every run and readiness with `--ready`:

- Errors: an ID that is not a prefix and a number, repeated IDs, file in the wrong folder, activity name that does not match `activities.json`, unknown release or persona, missing marker, unknown marker, missing test, an ADR in `blocked_by` with no file in `docs/adr/`, unknown `depends_on`, discarded without reason.
- Not ready: empty out-of-scope, empty verification, open questions, a proposed ADR in `blocked_by`, hedged words in a rule.
- Warnings: story text not in the persona/want/benefit shape, vague words ("fast", "easy", "intuitive"…), more than 6 criteria, dependency not yet working.

Things the validator cannot see. Check them yourself when you write or edit a story:
- A generic persona ("user") where a specific one exists.
- A benefit that restates the want.
- A solution in the want: button, modal, endpoint, table. Test: would the wording change if the implementation changed?
- A horizontal slice with no observable outcome.
- The Definition of Done leaking into criteria ("tests written", "code reviewed").
- Over-specification: file names, algorithms or class structure without a stated reason.
