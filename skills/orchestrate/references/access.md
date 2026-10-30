# A person's access to Jira and Bitbucket

Check both at a person's first session, and again when one that worked stops answering. When both answer, say nothing. Each person uses their own credentials.

**Jira** answers when the Atlassian MCP server or `acli` reads one card of the project (`acli jira workitem search --jql "project = <jira.project>" --limit 1 --json`). When neither does, offer `acli` in plain words ("to read your cards I need a tool from Atlassian; shall I install it?") and, on their yes, install it:
- macOS: `brew tap atlassian/homebrew-acli`, then `brew install acli`;
- Windows: `Invoke-WebRequest -Uri https://acli.atlassian.com/windows/latest/acli_windows_amd64/acli.exe -OutFile "$env:LOCALAPPDATA\Microsoft\WindowsApps\acli.exe"`.

Then they log in themselves: ask them to type `! acli jira auth login --web` in this prompt. Their browser opens and they accept with their Jira account. Check with `acli jira auth status`, then read the card again.

**Bitbucket** answers when `BITBUCKET_USER` and `BITBUCKET_TOKEN` are set and `GET https://api.bitbucket.org/2.0/repositories/<workspace>/<repo>/pullrequests?pagelen=1` (the workspace and repo from `git remote get-url origin`) returns 200. Print only the status code. A 401 means the email or the token is wrong (often the Bitbucket username in place of the email); a 403, a missing scope. To set it up, guide them one step at a time: at id.atlassian.com, Security, "Create and manage API tokens", "Create API token with scopes"; the app is Bitbucket, the scopes read and write pull requests and read the repository. `BITBUCKET_USER` is their Atlassian account email. They set both in their own environment (macOS: two `export` lines in `~/.zshrc`; Windows: `setx BITBUCKET_USER <email>` and `setx BITBUCKET_TOKEN <token>` in a terminal of their own), then restart Claude Code.

**A secret never passes through you.** The person types the token where it is stored, never in this conversation; if they paste one here, tell them to revoke it and create another. Never print a token or write it into a file.

When they decline, or it still fails: for Jira, ask them for their cards; for Bitbucket, they open and merge pull requests in the web UI, and you tell them the strategy (`references/git.md`). Say it once.
