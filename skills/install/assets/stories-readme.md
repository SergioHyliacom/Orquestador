# Product: user stories

This folder describes what the product does, what it lacks and how far it is from the first release.

- **Start with the [map](map.md).** It shows every story, its status and the progress to the first release.
- **Stories** are in `stories/`, one per file.
- **Decisions**, of product and of architecture, are in `decisions/`, from DEC-031 (D1–D30 are in `docs/definicion.md`). An open decision blocks the stories that name it.

## Levels

| Level | What it is |
|---|---|
| Activity | One step of the user's journey (`activities.json`) |
| Story | One capability a person notices |
| Criterion | One observable behaviour, checked one way |

## Statuses

Nobody writes a status by hand. `stories.mjs` computes it from the criteria and the decisions.

The first matching row wins, top to bottom.

| Status | Rule |
|---|---|
| ⛔ Discarded | The story was dropped. It keeps the reason. |
| 🔒 Blocked | The story depends on an open decision. |
| ❌ Failing | At least one criterion fails. |
| ⬜ Pending | No criterion is built. |
| 🟡 Partial | At least one criterion is unbuilt. |
| ⚠️ Unverified | At least one criterion is unverified. |
| ✅ Works | Every criterion is verified. |

## Commands

```
node {{STORIES_DIR}}/stories.mjs              generate the map with the last test results
node {{STORIES_DIR}}/stories.mjs --tests      run the tests, then generate the map
node {{STORIES_DIR}}/stories.mjs --check      fail on errors or a stale map
node {{STORIES_DIR}}/stories.mjs --ready ID   check that a story is ready to build
node {{STORIES_DIR}}/stories.mjs --pr ID      print the PR checklist for a story
```

## Rules for anyone who changes the product

- A change to what a person can do updates its story in the same commit.
- A bug is not a new story. Mark the criterion it breaks as failing.
- A new capability needs its story before work starts.
- Templates are in `templates/`.
