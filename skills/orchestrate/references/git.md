# Git and Bitbucket

The project's `CONTRIBUTING.md` («Ramas», «Reglas en Bitbucket», «Cómo se fusiona cada PR», «Commits», «Pull requests») is the rule. This file says how the session applies it; where the two disagree, `CONTRIBUTING.md` wins, and you tell your human so the plugin gets fixed.

## Branches

| Branch | From → into | What it carries |
|---|---|---|
| `main` | — | what is in production. It receives pull requests only from `develop` or from a `hotfix/` |
| `develop` | — | integration: the finished stories and fixes come together here |
| `feature/<id>-<slug>` | `develop` → `develop` | a story: its code and tests, one commit per criterion. Also a done story reopened because its behaviour changes |
| `fix/<id>-<slug>` | `develop` → `develop` | a done story reopened because a bug breaks one of its criteria |
| `feature/<slug>` | `develop` → `develop` | work outside the stories: tooling, a machine check (`feature/check-<slug>`), documentation |
| `fix/<slug>` | `develop` → `develop` | a non-urgent fix of something that is not a story's behaviour: the build, the configuration, a script |
| `hotfix/<slug>` | `main` → `main`, then `main` → `develop` | an urgent fix in production (`references/outside-stories.md`) |
| `deps/…`, `spike/…` | — | Renovate's and the technical tests' branches. Not yours: leave them alone |

`develop` stands for the integration branch, `git.integrationBranch`. Names are in English and kebab-case. A story's branch starts with its ID in lowercase, then a short slug of what it does: `feature/alt-001-email-signup`. `stories.mjs` reads the story from that ID.

Create every branch from the remote, so it starts from what is really there: `git fetch`, then `git switch -c <branch> origin/develop` (`origin/main` for a hotfix). Your local `develop` and `main` only move forward to their remote, with `git pull --ff-only` (or `git merge --ff-only origin/<branch>`); the guard blocks any other merge, pull or rebase on them. When `develop` moves while a story is open, bring it into the story's branch with `git merge origin/develop`, as `CONTRIBUTING.md` says.

## What never enters the repository

Your orchestrator files are yours alone: `.orchestrator.json` and `.orchestrator/` (the stories, the lock lists, the ledger, the briefs and reports, the audits) are excluded on this machine with `.git/info/exclude`, never through the shared `.gitignore`, and never committed. So the story's branch carries only code: no kickoff, lock, marker or unlock commits. Nothing in a commit, a pull request or a file of the repository mentions the plugin or its files; a story is named by its ID, which comes from gg-ez.

## Commits

- Format: `tipo(ámbito): descripción`, in Spanish and in the imperative (`CONTRIBUTING.md`, «Commits»). Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`. The scope is the module (`identity`, `invoicing`), the app (`panel`, `api`), the shared package (`i18n`, `outbox`), the document (`definicion`, `contributing`) or `repo`. lefthook checks the title on every commit (`commit-msg`): a commit it rejects is fixed, never skipped.
- A criterion: the criterion's ID opens the description. `feat(identity): ALT-001.1 rechazar un correo ya registrado`; `test(panel): ALT-001.2 …` when the behaviour already existed and only the test is new. A module or app README brought up to date at the close: `docs(<scope>): ALT-001 …`. A task: what changes, with no ID.
- One commit per criterion. Your human's ok comes on the first one and on the finished build; their asking you to build the story is the request to commit its criteria. The project's settings ask them to confirm every `git commit` and `git push`: that prompt is their consent, so run the command and let them approve it; do not ask again in the conversation.
- Never commit on a protected branch (`git.protectedBranches`, default `main` and `develop`). The guard blocks it.
- A builder works in your checkout: only one writer runs at a time.
- Stage files by name. The guard blocks `git add .`, `-A` and `--all` unless `git.blockBroadAdd` is `false`. Check `git status` before staging: unrelated changes stay out of the commit.
- Never `--no-verify`, `reset --hard`, `clean -f` or force push. The guard blocks them.

## Push and remote

- Push only when your human asks. When they say "commit and push", do both: a commit alone is half the request.
- Role agents never push; the guard blocks it. With `git.allowPush: false` the guard makes Claude Code ask your human to confirm each push and each merge; that prompt is their consent, so run the command and let them approve it. Do not hand the command back.
- The pipeline runs on each pull request, not on a `feature/` branch: push when the build closes, and whenever your human wants their work on the remote.
- Check `git remote -v` and the auth setup before the first push in a project. Non-interactive sessions cannot answer credential prompts.

## Pull requests on Bitbucket

- Every change enters through a pull request, one purpose each: to `develop`, except a `hotfix/`, which goes to `main`.
- **Title:** the commit format. A story: `feat(<scope>): <ID> <what the person can now do, in the imperative>`. The squash commit takes it.
- **Body:** for a story, the criteria with their result (`node <scripts>/stories.mjs --pr <ID>`; it names no story file when the story lives only on your machine), the ⚠️ manual steps, and what the Claude review found and how it was settled. Then, at the end, the checklist of `CONTRIBUTING.md` («Pull requests»), each box ticked only when it holds:

  ```markdown
  - [x] En su carpeta
  - [x] README del módulo o de la aplicación al día
  - [x] Tests de lo nuevo, y el de aislamiento si toca datos
  - [x] Comprobaciones en local y CI en verde
  - [x] ¿Toca algo que obliga? No
  ```

  The last box says `Sí: ADR NNNN` when the change touches what binds, and the pull request then carries its ADR or goes after it is accepted. CI is not green when you open it: tick that box when the pipeline is.
- **A vulnerability is never detailed in a pull request, a comment or a task** until it is fixed (`CONTRIBUTING.md`, «Seguridad»). Tell your human in the session; they warn the technical lead in private.
- **Reviewers:** someone other than your human (`reviewers` in the body). Every pull request also gets a Claude review before it opens (`references/development.md`, "Claude review").
- **You open and merge the pull requests through the REST API**, so nobody has to pick a strategy by hand. Bitbucket has no official CLI: use `POST /2.0/repositories/<workspace>/<repo>/pullrequests` with `BITBUCKET_USER` and `BITBUCKET_TOKEN` from your human's environment. `BITBUCKET_USER` is their Atlassian account email, not their Bitbucket username; you set both up with them the first time (`references/access.md`). Never write the token into a file. Without a token, your human does it in the web UI and you tell them the strategy and the message of the table below.
- **Text you send to Bitbucket travels as UTF-8 JSON.** Build the body with `node` (`JSON.stringify`) and pipe it to `curl --data-binary @-`, the merge message too. Text written inside the shell command loses its accents on Windows, and a squash commit keeps it broken for good.

## Merge

A pull request merges only on your human's ok, and only when all of this holds; read it first (`GET …/pullrequests/<id>` and `GET …/pullrequests/<id>/statuses`):

- at least one participant other than the `author` has `approved: true`: no exception, whoever wrote it;
- none has `state: changes_requested`;
- no task is open (`task_count` is 0);
- the last pipeline is `SUCCESSFUL`;
- into `main`, the source branch is not behind.

Bitbucket only warns about these on this plan, so you check them. If one fails, do not merge; tell your human what it is waiting for. A merge through the API (`POST …/pullrequests/<id>/merge`) is a merge: the guard asks your human to confirm it, and blocks it for role agents. Send `merge_strategy` and `close_source_branch` as the table says, and with Squash, `message` set to the pull request's title: Bitbucket's own proposal («Merged in feature/… (pull request #N)», or a list starting with «* ») is never kept, and no hook checks that message.

| Pull request | Strategy | Delete the source branch | Message |
|---|---|---|---|
| `feature/`, `fix/` → `develop` | Squash | yes | the title |
| `develop` → `main` | Fast forward | **no** | — |
| `hotfix/` → `main` | Squash | yes | the title |
| `main` → `develop`, after a hotfix | Merge commit | **no** | Bitbucket's (git's `Merge …` passes the commit check) |
| `hotfix/<slug>-develop` → `develop`, when that conflicts | Merge commit | yes | Bitbucket's |

A story's trail (one commit per criterion) stays in its pull request; `develop` gets one commit. After the merge, write that commit in your ledger and as the `# commit` line of the story's lock list (`references/development.md`, "Merge").

## Repository settings

They are the team's, in Bitbucket, and `CONTRIBUTING.md` says what they are; you never change them. The default merge strategy is Squash. Nothing of this plugin runs in the pipeline: `stories.mjs` runs only in your session.

## Story IDs

A story ID is a prefix and a number (`ALT-001`). It comes with the story from gg-ez, where it is written (`SKILL.md`, §5); until that link exists, your human gives it to you. Ported from the design repo, it keeps the design repo's ID unless your human gives another.
