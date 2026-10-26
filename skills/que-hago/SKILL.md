---
name: que-hago
description: Tells the person where they are in the EASY One flow and what to do next, from their Jira cards, the requests addressed to them, their git state, their stories and their pull requests, and offers the next step as a yes or no question. Use at the start of every session in a project that has .orchestrator.json, and whenever the person asks what to do, what is theirs or where they are, in any words - "¿qué hago?", "¿qué me toca?", "¿qué me toca ahora?", "¿por dónde voy?", "¿en qué punto estoy?", "¿qué tengo pendiente?", "¿y ahora qué?", "¿qué sigue?", "what's next", "what should I do".
---

# Qué hago

The person does not know the method and does not need to. Find out where they are, say it in plain words, and offer the next step as a question they answer with yes or no. Gathering changes nothing: act only after they answer, following the `orchestrate` skill.

## 1. Gather

Read all of this before you say anything. Run the independent reads in parallel.

**First, the phase.** If `.orchestrator.json` has no `roles`, Part 2 of the install is not done yet and the developers are laying the foundations (delivery 0). A designer works on stories as usual. For a developer, gather only who they are, their git, their pull requests and the ledger (1, 2, 5 and 6 below), and then follow §5, "During the foundations", instead of §2.

1. **Who.** `.orchestrator/me.json`: their name, side (`design`, `backend` or `frontend`) and Jira account. If it is missing, ask once and write it (`orchestrate` skill, §1).
2. **Git.**
   - Run `git fetch --prune` and `git status`, and note the current branch.
   - Note commits not pushed and changes not committed.
   - Note local branches whose remote is gone.
3. **Jira.** Use the Jira tools this machine has (the Atlassian MCP server or `acli`). If none works, say so and ask for their cards. Never guess them.
   - **Their cards:** the project's cards not in the done or discarded status where they are the assignee, the reporter, or in their side's field (`.orchestrator.json` → `jira.fields`). For each: its stage and who it is assigned to.
   - **Requests to them:** a comment that mentions them with no later comment of theirs.
   - **Their requests to others:** a comment of theirs that mentions someone who has not answered since. Note how old each is.
   - **Available cards:** only when nothing is theirs, the cards in their side's stages with their side's field empty, in backlog order.
4. **Stories.** Run `node <storiesDir>/stories.mjs --json` once. For the story of each card: the criteria by marker, and what waits for whom.
5. **Pull requests.** With `BITBUCKET_USER` and `BITBUCKET_TOKEN` (`orchestrate` skill, `references/git.md`):
   - their open pull requests, and for each: approved, changes requested, build green or red;
   - the pull requests where they are a reviewer and have not approved yet.

   Without a token, skip this and say so once.
6. **The ledger.** `.orchestrator/state.md`: what this session left half done last time.

## 2. Decide what is next

Take the first rule that applies. The rest become the other lines of your answer.

1. **Work left half done in this session.** Changes not committed, a criterion waiting for the ok, a half finished waiting for the ok, a commit not pushed. Finish it first.
2. **Requests to them.** They are holding someone else up.
3. **Pull requests:**
   - review another person's pull request;
   - merge one of theirs that is approved (`orchestrate` skill, §6.8);
   - fix one of theirs with changes requested or a red build.
4. **Their cards, by stage:**

| Stage | What is next for them |
|---|---|
| Design, they are the reporter | Go on writing the story, or open its pull request (§6.1) |
| Contract, assigned to them | The kickoff (§6.2), or the contract proposal waiting for an answer |
| Build, their side open | The next criterion (§6.3), or the ok on the finished half (§6.4) |
| Integration, assigned to them | Integrate, set the markers, the risk review, or the final pull request (§6.5–§6.8) |
| Visual review, assigned to them as designer | Look at the screenshots: approved, or what to change (§6.6) |

5. **Nothing of theirs.** The first available card of their side; offer to take it, which puts them in their side's field.
6. **Their requests to others older than a day.** Offer to remind the person with a comment, with their ok on the text.
7. **A delivery ready for its audit**, once (`orchestrate` skill, §1).

## 3. Tell them

In the project's language, at most 10 lines, with no git or Jira words beyond the card keys:

```
<Name> · <side>
1. <requests and bad news first: card, what happened, the question>
2. …
Te recomiendo: <the next step>, porque <one line>. ¿Seguimos?
```

- Each line names its card (`EO-123`) and says what happened.
- A request ends with its answer options: sí, no, or hablamos.
- If a local branch's remote is gone, add one line offering to delete it.

Then wait for the answer:
- On yes, do it, following the `orchestrate` skill.
- On "hablamos", draft a comment mentioning the other person, show it, and post it on their ok.

Never move a card. Never show code, and never give them git commands to run: the session runs them.

## 4. When they ask for something specific

When the person asks for a step instead ("programa EO-123", "abre el PR", "fusiónalo"), check first that it fits the story's stage (`orchestrate` skill, §6, "Check the stage before you act"). If it does not, say where the story is and what is missing, and offer the step that comes first, as a yes or no question.

## 5. During the foundations

While `.orchestrator.json` has no `roles`, a developer's "what is next" is the state of the foundations. It disappears once Part 2 is installed. Read only: run no generator, edit nothing, commit nothing.

1. **The list.** Take the foundations of delivery 0 from `docs/definicion.md` (its §15). Add what Part 2 of the install will check (`install` skill, 2.1 and 2.3):
   - the verification commands run;
   - one endpoint goes from Go through the OpenAPI spec and the generated client to the panel and an end-to-end test, on a real PostgreSQL;
   - the checks §12.1 of the definition asks of the CI;
   - the module generator and a reference module;
   - the code graph, configured in the repository;
   - the pipeline in Bitbucket.
2. **Each item gets one mark:**
   - ✅ with its evidence: a file, or a command and its result;
   - ❌ with what is missing;
   - ⚠️ when it cannot be checked without changing something.

   Run only commands that read or test, such as the task file's lint and test commands. Skip anything that regenerates or writes. When the reading is long, brief a `researcher`.
3. **Open decisions.** The files in `<storiesDir>/decisions/` with `status: Open`, and the items each one holds up.
4. **Tell them.** In at most 10 lines: half-done work and pull requests first (§2, rules 1 and 3), then the items and the open decisions. Recommend one step, usually closing the decision that holds up the most items. When every item is ✅, offer Part 2 of the install (`/easyone-orchestrator:install`).
