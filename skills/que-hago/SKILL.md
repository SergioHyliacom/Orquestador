---
name: que-hago
description: Tells your human where they are in the EASY One flow and what to do next, from their git state, the stories, their pull requests and the session's ledger, and offers the next step as a yes or no question. Use at the start of every session in a project that has .orchestrator.json, and whenever they ask what to do or where they are, in any words - "¿qué hago?", "¿qué me toca?", "¿qué me toca ahora?", "¿por dónde voy?", "¿en qué punto estoy?", "¿qué tengo pendiente?", "¿y ahora qué?", "¿qué sigue?", "what's next", "what should I do".
---

# Qué hago

Find out where your human is, say it in plain words, and offer the next step as a question they answer with yes or no. Gathering changes nothing: act only after they answer, following the `orchestrate` skill.

## 1. Gather

Read all of this before you say anything. Run the independent reads in parallel.

1. **Git.**
   - Run `git fetch --prune` and `git status`, and note the current branch.
   - Note commits not pushed and changes not committed.
   - Note local branches whose remote is gone.
   - Note the `story/<ID>` branches on the remote, and for each whether `.orchestrator/locked/<ID>.txt` is on it.
2. **Stories.** Run `node <scripts>/stories.mjs --json` once (the guard names `<scripts>`). If `node` is missing, say so first and offer to install it (`orchestrate` skill, §1, step 1). For each story in progress: the criteria by marker, and what it waits for. The stories not started: no `story/<ID>` branch, not done and not discarded.
3. **Pull requests.** With `BITBUCKET_USER` and `BITBUCKET_TOKEN` (`orchestrate` skill, `references/git.md`): their open pull requests, and for each: approved, changes requested, build green or red. Without a token, or when Bitbucket rejects it, skip this, say so once and offer to set it up (`orchestrate` skill, `references/access.md`).
4. **The ledger.** `.orchestrator/state.md`: the stories in progress, and what this session left half done last time.

## 2. Decide what is next

The check pull requests (`chore/check-`) are nobody's work: merge each one whose build is green, without asking (`orchestrate` skill, `references/outside-stories.md`), and leave the red ones for the close. They never become a line of your answer.

Take the first rule that applies. The rest become the other lines of your answer.

1. **Work left half done in this session.** Changes not committed, a criterion waiting for the ok, a finished build waiting for the ok, a commit not pushed. Finish it first.
2. **Pull requests:**
   - merge one that is approved (`references/development.md`, "Merge");
   - fix one with changes requested or a red build.
3. **The stories in progress,** by where they are:

| Where the story is | What is next |
|---|---|
| No `story/<ID>` yet | The kickoff (`references/development.md`) |
| `story/<ID>` without its lock list | The next criterion, or the ok on the finished build (`references/development.md`) |
| `story/<ID>` with its lock list | The markers, the risk review, or the final pull request (`references/development.md`) |

4. **Nothing in progress.** Offer the first story not started, in the order of the releases. Before development opens (`.orchestrator.json` has no `roles`), there is nothing to build yet: say so in one line.
5. **A delivery ready for its audit**, once (`orchestrate` skill, §1).

## 3. Tell them

In their language, at most 10 lines, with no git words beyond the story IDs:

```
1. <bad news first: the story, what happened, the question>
2. …
Te recomiendo: <the next step>, porque <one line>. ¿Seguimos?
```

- Each line names its story (`EO-123`) and says what happened.
- A question ends with its answer options: sí or no.
- If a local branch's remote is gone, add one line offering to delete it.

Then wait for the answer. On yes, do it, following the `orchestrate` skill.

## 4. When they ask for something specific

When your human asks for a step instead ("programa EO-123", "abre el PR", "fusiónalo"), check first that it fits where the story is (`orchestrate` skill, §2). If it does not, say where the story is and what is missing, and offer the step that comes first, as a yes or no question.
