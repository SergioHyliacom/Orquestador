# Work outside a story

## Fix or chore

- A `fix/` repairs something that is not a story's behaviour: the build, the configuration, a script.
- A `chore/` is any other work outside the stories: dependencies, tooling, documentation.
- A bug in behaviour is never a fix: it reopens its story (`references/development.md`).

1. Create `fix/<slug>` or `chore/<slug>`, in English kebab-case, from the integration branch on the remote.
2. Brief the builder whose side owns the paths with `Change: task <slug>: <what changes>`, and under "Done when" the commands that prove it. Show your human the evidence and commit on their ok. Text only you write (a README line, a rule) needs no builder. Before development opens there are no builders.
3. Open a pull request to the integration branch with someone other than your human as reviewer. When it is approved, merge it through the API with squash, on your human's ok. No card moves.

## Check

A check pull request only adds or tightens a machine check (a lint rule, an architecture test, a CI step) that enforces a rule already in `docs/rules/`, together with the fix of the code it catches, the move of that rule to *Checked by the machine* and, from an audit, the audit's record. It comes from a failure (the close, `SKILL.md` §6) or an audit (`references/audit.md`). It is nobody's work and nobody decides it: a developer's session builds it, pushes it and merges it without asking, once development is open.

1. Create `chore/check-<slug>` from the integration branch on the remote. Your side's builder builds it as a task; a one-line lint setting you do yourself.
2. **It proves itself:** before the commit, show that the check fails on the code that motivated it and passes once that code is fixed, and that `verify.all` is green. A check that stays green on the bad code catches nothing: drop it.
3. Push and open the pull request with the failing and passing lines in its body and no reviewer. The guard lets the push and the merge of a `chore/check-` branch through without asking your human.
4. Merge it through the API with squash once its build is green (`que-hago` does it when it gathers; the close does too). Fix a red build at the next close, in the same pull request.

It is not a check pull request, and it goes to your human like any task, when it creates or changes a rule, touches a risk area (`riskTags`), comes from a Critical finding, or needs a locked test changed.

## Hotfix

An urgent bug in production.

1. `git switch -c hotfix/<slug> origin/main`.
2. When it breaks a criterion: unlock only that criterion's test files (`references/development.md`, "Close your side"), have the builder write a test that reproduces the bug and fails, then the fix, and lock again. When both sides must change, run one builder after the other on the same branch. Never commit a `[failing]` marker on a hotfix: the card stays Done. A hotfix that breaks no criterion is a plain task.
3. Open a pull request to `main`, merged with squash: someone other than its author approves it, and a person the team authorizes merges it.
4. Right away, the same person opens the pull request `main` → integration branch, with a merge commit. If it conflicts, create `hotfix/<slug>-develop` from the integration branch, merge `origin/main` into it, resolve with the side that owns the files, and open that pull request instead, also with a merge commit.

## Going to production

`main` is what is in production. The team decides when, usually at the close of a delivery. A person the team authorizes opens the pull request integration branch → `main` once the integration branch's last build is green and every hotfix has come back to it. Someone other than its author approves it, an authorized person merges it with fast forward, and it is deployed as the project's `README.md` says.
