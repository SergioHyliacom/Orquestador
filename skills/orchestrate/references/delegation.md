# Delegation: who does each piece of work

## Decide

Ask in this order and stop at the first match:

1. **Trivial?** A one-line fix, a rename, a lookup → do it yourself.
2. **Must someone other than the author judge it?** A review → a role with a clean context. It gets the diff and the story, never your reasoning.
3. **Heavy reading that would flood your context?** Research, comparing sources → a `researcher`. Independent questions run in parallel.
4. **Code on your human's side?** → your side's builder, one run at a time. Never write a story's code yourself while a builder owns the criterion, and never give a builder work on the other side.

Code outside a story goes to the builder whose side owns the paths, as a task (`references/outside-stories.md`). Every path belongs to one side's `roles.<role>.paths`. The stories and the rules belong to no builder: you edit them.

**The mechanism.** In VS Code or a terminal, a builder is an Agent-tool subagent in your checkout, on the branch of the work: only one writer runs at a time, so it needs no worktree. Resume the same builder with SendMessage for each next criterion, so it keeps its context. In Orca, read `references/harness.md`.

A builder that reports BLOCKED, or fails the same check 3 times, goes to your human. Never relaunch the same brief.

## Roles and names

`backend-builder` and `frontend-builder` are the only roles that write code; `reviewer`, `researcher` and `auditor` are read-only. Call them through the Agent tool as `easyone-orchestrator:<role>`; the project's own roles in `.claude/agents/` by their name. `copywriter` joins only when `.orchestrator.json` names `copy.master`, and `designer` only when it names `design`. Before creating a role, read `references/roles.md`; a role file is shared, so it goes in through a pull request.

Name every instance `<role>-<scope>`, the scope being the story ID or a short topic (`backend-builder-EO-123`, `researcher-redsys`), and use the name in the task description.

## Brief

The agent does not see this conversation. Write the brief to `.orchestrator/work/<ID>/brief-<side>-<step>.md` (a task uses its slug as `<ID>`) and pass its absolute path, plus one line on where the task fits.

```
You are <role>-<scope>.
Story: <absolute path of the story file>   (a task: "none", and the branch)
Change: contract | <criterion ID> | refactor <criterion ID> | integration | task <slug>: <what changes>   (reviewers: "Judge: <what>")
Agreed contract: <operations, fields, types, status codes, errors — contract runs only>
Read first: <the Patterns of docs/rules/<side>.md that apply, and the code the work touches>
Constraints: <invariants, do-not-touch>
You may edit: <roles.<role>.paths>   (read-only roles: "nothing")
Done when: <the check that proves it, with the exact command>
Write your full output to: <absolute path>/.orchestrator/work/<ID>/<side>-<step>.md
Escalate instead of guessing when: <the open points you can foresee>
```

Pass the story file's path, never a paraphrase, and never paste the conversation.

## Read the report

Its first line is `<name>: <status>`.

- `DONE`: check the evidence and carry on.
- `DONE_WITH_CONCERNS`: read the concerns first, then show both to your human.
- `BLOCKED`: resolve it with your human, or take it to the other side. Never relaunch the same brief.
- `NEEDS_CONTEXT`: answer it and resume the same agent.

"Done" without evidence is not done. The evidence is the RED and GREEN output of the criterion's test plus the side's fast checks; for a task, the output of its "Done when" commands. A test without the criterion ID at the start of its name does not count. Reject a review without a verdict, and a finding that contradicts the story or your human's instructions, saying why. Read the agent's file when the summary is not enough; do not redo its work in your context.
