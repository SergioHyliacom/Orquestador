# The risk map

A story with a risk tag gets the `reviewer` at its close. What is risky is a person's call; the machine finds where it lives in the code, raises a story that touches it, and notices when the map falls behind. The map is `.orchestrator.json` → `riskTags` (the categories) and `riskPaths` (where each one lives).

## What risk means

A change is risky when a mistake in it would be hard to detect, hard to undo, or reach beyond the change. The default categories, which a project keeps, renames, drops or extends when it draws its map:

| Category | What it covers | Typical code |
|---|---|---|
| Stored data | data that cannot be rebuilt | migrations, deletions, changes to what is already stored or to its format |
| Identity | who can do what | login, sessions, permissions, credentials, secrets |
| Account isolation | which customer owns each piece of data | resolving the account of a request, per-account connections, queries that filter by account |
| Personal data | what the law protects | personal fields, exports, logs and error messages that could carry them |
| Contracts others use | what someone else already consumes | a public API, integrations, webhooks, exported formats |
| Money | payments and legal duties | payments, invoices, taxes |
| Production | how it runs and ships | deployment, CI, infrastructure, dependencies |

A category with no code yet keeps its tag and has no path: stories carry it by their tags and the builders' `Risk:` line until that code exists.

## Draw the map

When a project is set up, or adopts the map, your session:

1. **Briefs a `researcher`** (read-only) with this file's path, `.orchestrator.json`, `docs/rules/`, the decisions and the code graph when it works on this machine. It looks for each category in the code: package names and what they import (authentication, cryptography, a payment SDK), migration folders, what the decisions and the rules name as critical, the code most others depend on (the graph's hub nodes), and the path a request takes to reach the data.
2. **Reads its proposal:** one line per entry, `tag → path or glob → why`, with `file:line` evidence; and the categories it found no code for. One entry per responsibility: the file that carries it, not a whole folder that also holds unrelated code. A path ending in `/` is a folder; `*` stays inside one folder, `**` crosses them.
3. **Shows it to its human,** each line with its reason, and the trade-off: a broad map sends most stories to the reviewer, a narrow one lets risk through. They choose the categories and approve the entries.
4. **Writes** `riskTags` and `riskPaths` into `.orchestrator.json` in a `chore/risk-map` pull request whose body carries the table with the reasons (the JSON holds no comments, and the reasons must survive). Someone other than its human approves it.

## Keep it current

- **Raise, never lower.** Anyone adds a tag to a story or an entry to the map. Removing either takes a pull request that says why.
- **A builder's `Risk:` line** that names code no `riskPaths` entry covers is a gap in the map: tell your human and offer a `chore/risk-map` pull request that adds it.
- **A module created in a risk area** adds its entry in the story that creates it, at its kickoff.
- **A moved path:** `stories.mjs --check` fails when a `riskPaths` entry matches no file in the repository. Fix the entry in the same branch that moved the code.
- **The delivery audit** checks the map against what the delivery built (`references/audit.md`).
