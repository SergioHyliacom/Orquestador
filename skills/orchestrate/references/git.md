# Git and Bitbucket

## Branches

| Branch | From | Who works on it | What it carries |
|---|---|---|---|
| `design/<ID>` | the integration branch | design | the new story, until its pull request merges |
| `story/<ID>` | the integration branch | the side that starts, for the kickoff and the contract; the side that integrates; design for the visual review | the kickoff, the contract if the API changes, the halves once merged, the end-to-end test, the markers |
| `story/<ID>-back` | `story/<ID>`, after the kickoff | backend | the backend half, when `sides` has `back` |
| `story/<ID>-front` | `story/<ID>`, after the kickoff | frontend | the frontend half, when `sides` has `front` |

The integration branch is `git.integrationBranch` (default `develop`). Non-story work: `chore/<slug>` or `fix/<slug>`.

The halves end in `-back` and `-front`, never `/back`: git cannot hold both `story/<ID>` and `story/<ID>/back`.

## Local rules

- Never commit on a protected branch (`git.protectedBranches`, default `main` and `develop`). The guard blocks it.
- In Orca a builder works in its own worktree, inside the repo's configured worktree location. In plain Claude Code it works in your checkout: only one writer runs at a time.
- Stage files by name. The guard blocks `git add .`, `-A` and `--all` unless `git.blockBroadAdd` is `false`.
- One commit per criterion, after your human's ok. Message: `<criterion ID>: <the rule, short>`. The kickoff: `<ID>: kickoff`. The contract: `<ID>: contract`. A lock: `<ID>: lock <side> tests`. An unlock, when a half reopens: `<ID>: unlock <side> <criterion IDs>`, committed alone.
- Check `git status` before staging. Unrelated changes stay out of the commit.
- Never `--no-verify`, `reset --hard`, `clean -f` or force push. The guard blocks them.
- Each half's locked tests live in `.orchestrator/locked/<ID>-<side>.txt`, so the two halves never touch the same list.
- Personal files never travel: `.orchestrator/me.json`, `.orchestrator/state.md`, `.orchestrator/work/` and `.orchestrator/role.json` are in `.gitignore`.

## Push and remote

- Push only when your human asks. When your human says "commit and push", do both: a commit alone is half the request.
- Role agents never push; the guard blocks it. With `git.allowPush: false` the guard makes Claude Code ask your human to confirm each push; that prompt is their consent, so run the command and let them approve it. Do not hand the command back.
- Push your half when it closes (§6.4 of the skill) and whenever your human wants the pipeline to see the progress. The pipeline only sees what is pushed.
- Check `git remote -v` and the auth setup before the first push in a project. Non-interactive sessions cannot answer credential prompts.

## Pull requests on Bitbucket

- Two kinds: `design/<ID>` → integration branch (the new story) and `story/<ID>` → integration branch (the finished story). The halves merge into `story/<ID>` directly, with your human's ok.
- Title: `<ID>: <story title>`. Body for a finished story: the output of `node <storiesDir>/stories.mjs --pr <ID>`, the review summary if there was one, and any ⚠️ manual steps.
- Bitbucket has no official CLI. Open the pull request in the web UI with your human, or through the REST API (`POST /2.0/repositories/<workspace>/<repo>/pullrequests`) when the machine has a token for it. Never write the token into a file the repository tracks.
- Merge only on your human's ok. A merge through the API (`POST …/pullrequests/<id>/merge`) is a merge: the guard asks your human to confirm it and blocks it for role agents.
- Never merge on a red pipeline.

## Optional: repository settings

The human applies these in Bitbucket, because they change a shared repository.

- Branch restrictions on `main` and `develop`: no direct pushes, merge only through a pull request. No minimum number of approvals: the author may merge their own pull request, so the work goes on when someone is away (`orchestrate` skill, §6.1). Bitbucket does not let authors approve their own pull requests, so a required approval would block them.
- Merge checks: a green pipeline on the pull request. Bitbucket enforces merge checks only on some plans; where it does not, they are a warning and the team keeps the rule by hand.
- Required pipeline steps: the project's verification commands plus `node <storiesDir>/stories.mjs --tests --check`.
- Default reviewers, to keep others informed, never required: the contract spec to one developer of each side.

## Story IDs

Jira hands out the story IDs: the card's key is the ID. Two people can never pick the same one, so there is nothing to reserve.
