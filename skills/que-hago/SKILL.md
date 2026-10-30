---
name: que-hago
description: Tells the person where they are in the EASY One flow and what to do next, from their Jira cards, the requests addressed to them, their git state, their stories and their pull requests, and offers the next step as a yes or no question. Use at the start of every session in a project that has .orchestrator.json, and whenever the person asks what to do, what is theirs or where they are, in any words - "¿qué hago?", "¿qué me toca?", "¿qué me toca ahora?", "¿por dónde voy?", "¿en qué punto estoy?", "¿qué tengo pendiente?", "¿y ahora qué?", "¿qué sigue?", "what's next", "what should I do".
---

# Qué hago

The person does not know the method and does not need to. Find out where they are, say it in plain words, and offer the next step as a question they answer with yes or no. Gathering changes nothing: act only after they answer, following the `orchestrate` skill.

## 1. Gather

Read all of this before you say anything. Run the independent reads in parallel.

1. **Who.** `.orchestrator/me.json`: their name, side (`design`, `backend` or `frontend`), Jira account and the language they talk to you in. If it is missing, ask who they are first and write it (`orchestrate` skill, §1, step 3).
2. **Git.**
   - Run `git fetch --prune` and `git status`, and note the current branch.
   - Note commits not pushed and changes not committed.
   - Note local branches whose remote is gone.
3. **Jira.** Use the Jira tools this machine has (the Atlassian MCP server or `acli`). If none works, say so, offer to set up their access (`orchestrate` skill, `references/access.md`) and, until then, ask for their cards. Never guess them.
   - **Their cards:** the project's cards not in the done or discarded status where they are the assignee, the reporter, or in their side's field (`.orchestrator.json` → `jira.fields`). For each: its stage and who it is assigned to.
   - **Requests to them:** a comment that mentions them with no later comment of theirs.
   - **Their requests to others:** a comment of theirs that mentions someone who has not answered since. Note how old each is.
   - **Available cards:** only when nothing is theirs, the cards in their side's stages with their side's field empty, in backlog order.
4. **Stories.** Run `node <scripts>/stories.mjs --json` once (the guard names `<scripts>`). If `node` is missing, say so first and offer to install it (`orchestrate` skill, §1, step 1). For the story of each card: the criteria by marker, and what waits for whom.
5. **Pull requests.** With `BITBUCKET_USER` and `BITBUCKET_TOKEN` (`orchestrate` skill, `references/git.md`):
   - their open pull requests, and for each: approved, changes requested, build green or red;
   - the pull requests where they are a reviewer and have not approved yet.

   Without a token, or when Bitbucket rejects it, skip this, say so once and offer to set it up (the same place).
6. **The ledger.** `.orchestrator/state.md`: what this session left half done last time.

## 2. Decide what is next

Their check pull requests (`chore/check-`) are not their work: merge each one whose build is green, without asking (`orchestrate` skill, `references/outside-stories.md`), and leave the red ones for the close. They never become a line of your answer: they are nobody's work.

Take the first rule that applies. The rest become the other lines of your answer.

1. **Work left half done in this session.** Changes not committed, a criterion waiting for the ok, a finished side waiting for the ok, a commit not pushed. Finish it first.
2. **Requests to them.** They are holding someone else up.
3. **Pull requests:**
   - review another person's pull request;
   - merge one of theirs that is approved (`references/development.md`, "Merge"), or a story of theirs they want to merge alone (`references/design.md`);
   - fix one of theirs with changes requested or a red build.
4. **Their cards, by stage:**

| Stage | What is next for them |
|---|---|
| Design, they are the reporter | Go on writing the story, or hand it over; a story the kickoff returned: answer its open questions (`references/design.md`) |
| Contract, assigned to them | Read the story, then the kickoff, or return it to design; or the contract proposal waiting for an answer (`references/development.md`) |
| Build, their side open | The next criterion, or the ok on the finished side (`references/development.md`) |
| Integration, assigned to them | Integrate, the markers, the risk review, or the final pull request (`references/development.md`) |
| Visual review, assigned to them as designer | Look at the screenshots: approved, or what to change (`references/design.md`) |

5. **Nothing of theirs.** The first available card of their side; offer to take it, which puts them in their side's field. Before development opens (`.orchestrator.json` has no `roles`), a developer has nothing to build yet: say in one line that development opens when the technical leads finish setting the project up, and offer to write a story with no screen (`references/design.md`). A technical lead with `estado` (§1, item 7) gets its lines instead of this one.
6. **Their requests to others older than a day.** Offer to remind the person with a comment, with their ok on the text.
7. **A delivery ready for its audit**, once (`orchestrate` skill, §1). The foundations' audit comes from `estado`.

## 3. Tell them

In their language, at most 10 lines, with no git or Jira words beyond the card keys:

```
<Name> · <side>
1. <requests and bad news first: card, what happened, the question>
2. …
Te recomiendo: <the next step>, porque <one line>. ¿Seguimos?
```

- Each line names its card (`EO-123`) and says what happened.
- Speak in their department's terms. To design: the story, its criteria and its screens; never tests, the API, the contract or code. Design's stories that are with the developers take one line at most, all together ("3 historias tuyas en desarrollo").
- A request ends with its answer options: sí, no, or hablamos.
- If a local branch's remote is gone, add one line offering to delete it.

Then wait for the answer:
- On yes, do it, following the `orchestrate` skill.
- On "hablamos", draft a comment mentioning the other person, show it, and post it on their ok.

Never move a card. Never show code, and never give them git commands to run: the session runs them.

## 4. When they ask for something specific

When the person asks for a step instead ("programa EO-123", "abre el PR", "fusiónalo"), check first that it fits the story's stage (`orchestrate` skill, §4). If it does not, say where the story is and what is missing, and offer the step that comes first, as a yes or no question.
