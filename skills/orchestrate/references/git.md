# Git and GitHub

## Local rules

- Never commit on a protected branch (`git.protectedBranches`, default `main`, `master`). The guard blocks it.
- One branch per story: `story/<ID>-<slug>`. Non-story work: `chore/<slug>` or `fix/<slug>`.
- A parallel writer works in its own worktree, inside the repo's configured worktree location. Do not create worktree folders outside the repo: they are easy to lose and other tools do not see them.
- Stage files by name. The guard blocks `git add .`, `-A` and `--all` unless `git.blockBroadAdd` is `false`.
- Batch commits: one commit per story, or one per coherent block. Not one per edit.
- Commit message: `<ID>: <story title>` on the first line, then the criteria that changed status.
- Check `git status` before staging. Unrelated changes stay out of the commit.
- Never `--no-verify`, `reset --hard`, `clean -f` or force push. The guard blocks them.

## Push and remote

- Push only when the human asks. The guard blocks `git push` unless `git.allowPush` is `true`. If blocked, tell the human to run `! git push -u origin <branch>`.
- Check `git remote -v` and the auth setup before the first push in a project. Non-interactive sessions cannot answer credential prompts.

## Pull requests

- One PR per story. Title: `<ID>: <title>`.
- Body: the output of `node <storiesDir>/stories.mjs --pr <ID>`, then the review summary and any ⚠️ manual steps.
- Create with `gh pr create` only after the human approves the push.
- Merge only on the human's OK. If the project names a code owner (`git.codeOwner`), the PR goes to them for review.
- Never merge your own PR on a red check.

## Optional: shared repositories

Use these only when several people work in the repository. The human applies them, because they change a shared repository.

- Branch protection on the default branch: PR required, status checks required.
- Required checks: the project's verification commands plus `node <storiesDir>/stories.mjs --tests --check`.
- `CODEOWNERS`: the acceptance-test paths and the stories folder go to the product owner or the named code owner.

Example `gh` call for protection (review before running):

```
gh api -X PUT repos/<owner>/<repo>/branches/<default>/protection \
  -f required_status_checks.strict=true \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F enforce_admins=false -F restrictions=
```

### Reserving story IDs across machines

When several people or machines create stories, reserve the ID by pushing an empty branch `story/<ID>-<slug>` as soon as the story file exists. Check free IDs against the default branch, remote branches and open PRs. Only a pushed branch reserves an ID.
