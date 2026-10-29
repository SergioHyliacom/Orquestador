# Git and Bitbucket

## Branches

| Branch | From → into | Who works on it | What it carries |
|---|---|---|---|
| `main` | — | nobody directly | what is in production. It receives pull requests only from `develop` or from a `hotfix/` |
| `develop` | — | nobody directly | integration: the finished stories and fixes come together here |
| `design/<ID>` | `develop` → `develop` | design, or whoever writes, returns or discards the story | a new story; a rewording before the kickoff; the open questions of a story the kickoff returns, and design's answer (§6.2); a discard, at any stage (`orchestrate` skill, §6.10) |
| `story/<ID>` | `develop` → `develop` | the card's Backend person (or Frontend, when it has none) for the kickoff and the contract; the side itself when the story has one side; the side that integrates; design for the visual review; whoever reopens a done story (§6.9) | the kickoff, the contract if the API changes, the halves once merged, the end-to-end test, the markers. Created again from `develop` to reopen a done story (§6.9) |
| `story/<ID>-back` | `story/<ID>` → `story/<ID>`, after the kickoff | backend | the backend half, only when `sides` has both sides. Deleted after the story merges (§6.8) |
| `story/<ID>-front` | `story/<ID>` → `story/<ID>`, after the kickoff | frontend | the frontend half, only when `sides` has both sides. Deleted after the story merges (§6.8) |
| `fix/<slug>` | `develop` → `develop` | the side that owns the paths | a non-urgent fix of something that is not a story's behaviour: the build, the configuration, a script. A behaviour bug reopens its story (§6.9) |
| `chore/<slug>` | `develop` → `develop` | the side that owns the paths | work that is not a story: dependencies, tooling, documentation |
| `hotfix/<slug>` | `main` → `main`, then `main` → `develop` | the side that owns what fails | an urgent fix in production (§6.11) |

`develop` stands for the integration branch, `git.integrationBranch`. Stories' branches carry the Jira key; the slugs of the others are in English and kebab-case, like the other identifiers: `fix/session-timeout`, `chore/upgrade-vite`.

Create every branch from the remote, so it starts from what is really there: `git fetch`, then `git switch -c <branch> origin/develop` (`origin/main` for a hotfix). Your local `develop` and `main` only move forward to their remote, with `git pull --ff-only` (or `git merge --ff-only origin/<branch>`); the guard blocks any other merge, pull or rebase on them.

The halves end in `-back` and `-front`, never `/back`: git cannot hold both `story/<ID>` and `story/<ID>/back`.

## Local rules

- Never commit on a protected branch (`git.protectedBranches`, default `main` and `develop`). The guard blocks it.
- In Orca a builder works in its own worktree, inside the repo's configured worktree location. In plain Claude Code it works in your checkout: only one writer runs at a time.
- Stage files by name. The guard blocks `git add .`, `-A` and `--all` unless `git.blockBroadAdd` is `false`.
- One commit per criterion; your human's ok comes on the first one of each half and on the finished half (§6.3). Message: `<criterion ID>: <the rule, short>`. The kickoff: `<ID>: kickoff`. The contract: `<ID>: contract`. A lock: `<ID>: lock <side> tests`. An unlock, when a half reopens: `<ID>: unlock <side> <criterion IDs>`, committed alone; when other work must change a locked file: `<ID>: unlock <side> <file>`. A reopened story: `<ID>: reopen <criterion IDs>`. A task: what changes, short.
- Check `git status` before staging. Unrelated changes stay out of the commit.
- Never `--no-verify`, `reset --hard`, `clean -f` or force push. The guard blocks them.
- Each half's locked tests live in `.orchestrator/locked/<ID>-<side>.txt`, so the two halves never touch the same list.
- Personal files never travel: `.orchestrator/me.json`, `.orchestrator/state.md`, `.orchestrator/work/`, `.orchestrator/roles/` and `.orchestrator/role.json` are in `.gitignore`, and so are the builders' worktrees when Orca puts them inside the repository (`/*-builder-*/`).

## Push and remote

- Push only when your human asks. When your human says "commit and push", do both: a commit alone is half the request.
- Role agents never push; the guard blocks it. With `git.allowPush: false` the guard makes Claude Code ask your human to confirm each push; that prompt is their consent, so run the command and let them approve it. Do not hand the command back.
- Push your half when it closes (§6.4 of the skill) and whenever your human wants the pipeline to see the progress. The pipeline only sees what is pushed.
- Check `git remote -v` and the auth setup before the first push in a project. Non-interactive sessions cannot answer credential prompts.

## Pull requests on Bitbucket

- A story's pull requests: `design/<ID>` → `develop` (the new story) and `story/<ID>` → `develop` (the finished story). Title: `<ID>: <story title>`. Body for a finished story: the output of `node <storiesDir>/stories.mjs --pr <ID>`, the review summary if there was one, and any ⚠️ manual steps.
- The others: `fix/` and `chore/` → `develop`, `develop` → `main`, `hotfix/` → `main` and then `main` → `develop`. Title: what changes, short.
- The halves are not pull requests: each merges into `story/<ID>` with `git merge`, on your human's ok. The pipeline knows a side is closed by its lock list on `story/<ID>`, not by the half branch, so the halves are deleted after the story merges, and a reopened story creates them again (§6.9).
- **You open and merge the pull requests, through the REST API**, so nobody has to pick a strategy by hand. Bitbucket has no official CLI: use `POST /2.0/repositories/<workspace>/<repo>/pullrequests` with `BITBUCKET_USER` and `BITBUCKET_TOKEN` from your human's environment. `BITBUCKET_USER` is their Atlassian account email, not their Bitbucket username; their session sets both up with them at their first session (`orchestrate` skill, §1, step 2). Add as reviewer someone other than your human (`reviewers` in the body). Never write the token into a file the repository tracks. Without a token, your human does it in the web UI and you tell them the strategy of the table below.
- A pull request merges only after at least one person other than its author approves it (`orchestrate` skill, §6.1). The exception is a `design/<ID>` pull request: its author may merge it alone.
- Merge only on your human's ok. A merge through the API (`POST …/pullrequests/<id>/merge`) is a merge: the guard asks your human to confirm it and blocks it for role agents. Before it, read the pull request (`GET …/pullrequests/<id>`): some participant other than the `author` must have `approved: true` (not for a `design/<ID>` its author merges alone), and none may have `state: changes_requested`; and its builds (`GET …/pullrequests/<id>/statuses`) must all be `SUCCESSFUL`. Bitbucket only warns about these on this plan, so you check them. If one fails, do not merge; tell your human what it is waiting for. Send the strategy of the table below as `merge_strategy` (`squash`, `merge_commit` or `fast_forward`) and `close_source_branch` as the table says.
- Never merge on a red pipeline.

### How each pull request merges

| Pull request | Strategy | Delete the source branch | Why |
|---|---|---|---|
| `design/<ID>` → `develop` | Squash | yes | the story enters `develop` as one commit |
| `story/<ID>` → `develop` | Merge commit | yes; then the halves | keeps one commit per criterion and the lock commits: the story's trail. Squash would collapse it all into one commit |
| `fix/` or `chore/` → `develop` | Squash | yes | it enters `develop` as one commit, in the commit format |
| `develop` → `main` | Fast forward | no | `main` moves to the same commit as `develop` without new commits, so both stay identical and `develop` is never behind `main` |
| `hotfix/` → `main` | Squash | yes | like a fix, towards `main` |
| `main` → `develop`, after a hotfix | Merge commit | no | brings the hotfix commit into `develop` as it is. With Squash it would be another commit, `develop` would stay behind `main` and the next fast forward would fail |
| `hotfix/<slug>-develop` → `develop`, when that conflicts | Merge commit | yes | the same, with the conflicts resolved on a branch of its own (§6.11) |

The repository's default is Merge commit, so a pull request merged by hand in the web UI never loses a story's history: at worst a design, fix or chore pull request gets a merge commit it did not need. Your merges send the strategy of the table.

## Repository settings

The human applies these in Bitbucket, because they change a shared repository.

- Branch restrictions on `main` and `develop`: no direct pushes, no deleting the branch and no rewriting its history. Everything enters through a pull request.
- Merge checks: at least 1 approval, which is always someone else's because Bitbucket does not let authors approve their own pull requests (`orchestrate` skill, §6.1). Without Premium it only warns, so an author can still merge their own `design/<ID>` alone; on a plan that enforces it, the team decides whether story pull requests need a review again or the check leaves `develop`; no changes requested; no open tasks; the last build green; on `main`, also that the source branch is not behind.
- Merge permissions: anyone may merge into `develop`; into `main`, only the people the team authorizes in Bitbucket.
- Default merge strategy: Merge commit. The sessions send the right strategy for each pull request; the default only matters for a merge made by hand.
- Bitbucket blocks a merge on a failing check only on Premium; on the other plans the checks warn. The team rule is the same either way: no pull request merges with a check in red.
- Required pipeline steps: the project's verification commands plus `node <storiesDir>/stories.mjs --tests --check`, on every branch (`default` covers `fix/`, `chore/` and `hotfix/`). Until development opens (§1 of the `orchestrate` skill) the pipeline runs only `stories.mjs --check`, but on every branch too, so every pull request has a build.
- Default reviewers, to keep others informed, never required: the contract spec to one developer of each side.

## Story IDs

Jira hands out the story IDs: the card's key is the ID. Two people can never pick the same one, so there is nothing to reserve.
