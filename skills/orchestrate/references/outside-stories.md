# Work outside a story

## Fix or task

- A `fix/<slug>` repairs something that is not a story's behaviour: the build, the configuration, a script.
- A `feature/<slug>` is any other work outside the stories: tooling, a machine check, documentation. Dependencies are Renovate's (`deps/`) or, the ones `CONTRIBUTING.md` («Dependencias») lists as by hand, a pull request of their own; the project asks your human before any dependency is added or updated.
- A bug in behaviour is never a fix of this kind: it reopens its story (`references/development.md`).

1. Create the branch, in English kebab-case, from the integration branch on the remote.
2. Brief the builder with `Change: task <slug>: <what changes>`, your human's request word for word under `Request:`, and under "Done when" the commands that prove it. Show your human the evidence and commit on their ok, in the commit format (`references/git.md`). Text only you write (a README line, a line of a norm) needs no builder. Before development opens there are no builders.
3. The Claude review (`references/development.md`), then a pull request to the integration branch with someone other than your human as reviewer, ending with the checklist of `CONTRIBUTING.md`. When it is approved and green, merge it through the API with Squash and the title as the message, on your human's ok.

## Check

A check adds or tightens a machine check (a lint rule, an architecture test, a CI step) that enforces a norm the project already has: a line of `CODING_STANDARDS.md` or `CONTRIBUTING.md`, an accepted ADR, a rule of `CLAUDE.md`. It comes from a failure (the close, `SKILL.md` §4) or an audit (`references/audit.md`). Like any change, it is proposed to your human, goes through a pull request and needs another person's approval: nothing merges on its own.

1. On your human's ok, create `feature/check-<slug>` from the integration branch on the remote. The builder builds it as a task; a one-line lint setting you do yourself. When the project documents the check (`CODING_STANDARDS.md` names what CI checks), the same pull request says it there.
2. **It proves itself:** before the commit, show that the check fails on the code that motivated it and passes once that code is fixed, and that `verify.all` is green. A check that stays green on the bad code catches nothing: drop it.
3. Push and open the pull request with the failing and passing lines in its body, a reviewer other than your human and the checklist of `CONTRIBUTING.md`. It merges like any other: approved, green, Squash, on your human's ok.

A check that changes a linter's configuration (`.golangci.yml`, `tools/lint/rules.go`) also says in its body that each person cleans the cache (`./bin/golangci-lint cache clean`), as `CONTRIBUTING.md` asks.

## Hotfix

An urgent bug in production.

1. `git switch -c hotfix/<slug> origin/main`.
2. When it breaks a criterion: unlock only that criterion's test files (`references/development.md`, "Close the build"), have the builder write a test that reproduces the bug and fails, then the fix, and lock again. Never mark the criterion `[failing]` for a hotfix: the hotfix restores the behaviour, so the story stays done. A hotfix that breaks no criterion is a plain task.
3. Open a pull request to `main`, merged with Squash and the title as the message: someone other than its author approves it, and a person the team authorizes merges it.
4. Right away, the same person opens the pull request `main` → integration branch, with a merge commit and without deleting `main`. If it conflicts, create `hotfix/<slug>-develop` from the integration branch, merge `origin/main` into it, resolve the conflicts, and open that pull request instead, also with a merge commit.

## Going to production

`main` is what is in production. The team decides when, usually at the close of a delivery. A person the team authorizes opens the pull request integration branch → `main`, titled `chore(repo): pasar a main …`, once the integration branch's last build is green and every hotfix has come back to it. Someone other than its author approves it, an authorized person merges it with Fast forward and without deleting `develop`, and it may be tagged on `main` (`v0.1.0`). It is deployed as `deploy/README.md` says.

## A spike

A technical test (◇ in the definition) lives on `spike/<slug>`: its commits go straight to the branch, it is never merged, its results go in its README, and what is decided goes to an ADR and to the definition through a `feature/` pull request (`CONTRIBUTING.md`, «Ramas»). It is not a story: the session helps as with any work your human asks for.
