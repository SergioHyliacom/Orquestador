# Delegation: who does each piece of work

## Decide

Ask in this order and stop at the first match:

1. **Trivial?** A one-line fix, a rename, a lookup → do it yourself.
2. **Must someone other than the author judge it?** A review → a role with a clean context. It gets the diff and the story, never your reasoning.
3. **Heavy reading that would flood your context?** Research, comparing sources → a `researcher`. Independent questions run in parallel.
4. **Code?** → the builder, one run at a time. Never write a story's code yourself while a builder owns the criterion. The plugin ships no builder at the moment (`SKILL.md`, §5).

Code outside a story goes to the builder too, as a task (`references/outside-stories.md`). The stories and the rules belong to no builder: you edit them.

**The mechanism.** A builder is an Agent-tool subagent in your checkout, on the branch of the work: only one writer runs at a time, so it needs no worktree. Resume the same builder with SendMessage for each next criterion, so it keeps its context. It shares your working tree: commit your own edits to stories and lock lists before you brief it, and touch nothing in the tree while it runs. When it stops, the guard compares those files with HEAD.

A builder that reports BLOCKED goes to your human. The guard counts the builder runs since the checkout's last commit in `.orchestrator/work/breaker.json`: after `verify.maxBuilderRuns` (3 by default), it asks your human before each further launch or resume, and only a commit, or your human, resets the count. That question is your human's alone: before it and after it, give them one line per run, what it was for and what it returned, and never tell them how to answer it or that they can accept it. Inside a run, the same command failing `verify.maxSameFailure` times in a row with the same output (3 by default) makes the builder report BLOCKED. Never relaunch the same brief.

## Roles and names

A role whose name ends in `-builder` writes code; the plugin ships none at the moment (`SKILL.md`, §5). `reviewer`, `researcher` and `auditor` are read-only. No agent commits: you do, once you have checked its evidence, and the guard blocks a subagent's `git commit`, `merge`, `pull`, `rebase`, `cherry-pick`, `am` and `revert`. A project role writes only when `.orchestrator.json` → `roles.<role>.paths` gives it paths, and only in them; every other subagent, a general-purpose one too, is read-only for the guard. Call them through the Agent tool as `easyone-orchestrator:<role>`; the project's own roles in `.claude/agents/` by their name. Before creating a role, read `references/roles.md`; a role file is shared, so it goes in through a pull request.

Name every instance `<role>-<scope>`, the scope being the story ID or a short topic (`reviewer-EO-123`, `researcher-redsys`), and use the name in the task description.

## Brief

The agent does not see this conversation. Write the brief to `.orchestrator/work/<ID>/brief-<step>.md` (a task uses its slug as `<ID>`) and pass its absolute path, plus one line on where the task fits.

```
You are <role>-<scope>.
Story: <absolute path of the story file>   (a task: "none", and the branch)
Change: <criterion ID> | refactor <criterion ID> | task <slug>: <what changes>   (reviewers: "Judge: <what>")
Request: <your human's words that ask for this work, verbatim — a task, a refactor, a change they asked for at their ok; omit it when the story's criterion is the whole request>
Commit: <the exact commit to judge — reviewers only; a re-review also names the commit already reviewed>
Read first: <the Patterns in docs/rules/ that apply, and the code the work touches>
Constraints: <invariants, do-not-touch>
You may edit: <roles.<role>.paths, or what the work touches>   (read-only roles: "nothing")
Done when: <the check that proves it, with the exact command>
Write your full output to: <absolute path>/.orchestrator/work/<ID>/<step>.md
Escalate instead of guessing when: <the open points you can foresee>
```

Pass the story file's path, never a paraphrase, and never paste the conversation. Work your human asked for outside a criterion carries their own words under `Request:`, copied, not retold: `Change:` is your reading of them, and the agent needs both to see where they part.

## Read the report

Its first line is `<name>: <status>`.

- `DONE`: check the evidence and carry on.
- `DONE_WITH_CONCERNS`: read the concerns first, then show both to your human.
- `BLOCKED`: resolve it with your human. Never relaunch the same brief.
- `NEEDS_CONTEXT`: a technical question (a convention, where something lives, which helper to reuse) you answer yourself: log it as a ruling and resume the same agent. A product call (what a criterion means, scope, what a person sees or reads: the skill's §3, item 2) is your human's, never yours: show it as the agent wrote it, with every option it gives and what each one changes, without summarising, reordering or choosing; a choice between a few options goes through `AskUserQuestion` when the session has it. Resume the same agent once, with their answer in their own words.

"Done" without evidence is not done. The evidence is the RED and GREEN output of the criterion's test plus the fast checks; for a task, the output of its "Done when" commands. A test without the criterion ID at the start of its name does not count. Reject a review without a verdict, and a finding that contradicts the story or your human's instructions, saying why. Read the agent's file when the summary is not enough; do not redo its work in your context.
