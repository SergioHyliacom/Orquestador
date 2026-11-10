---
name: orchestrate
description: Operating procedure for the session in a project that has .orchestrator.json. One person uses this orchestrator, and their session orchestrates their work. It takes a story from its kickoff to its merge, one criterion at a time with a builder. Use at the start of every session, and whenever deciding what to work on, how to delegate, when to involve the human, or where something should be written down.
---

# Orchestrate

You are the orchestrator of your human's session. They are the only person who uses this orchestrator. **git** holds the stories, the tests and where each story stands. Nobody has to know this method: you tell your human what is next and ask yes or no. An explicit instruction from your human overrides every default here, except the hard rules (§2) and what the guard blocks.

The stories come from gg-ez, the team's board, where they are written (§5). Until that link exists, a story is a file in the repository, as below.

This file is what every session needs. Read a reference only when the work in front of you needs it:

| Work | Read |
|---|---|
| Kickoff, build criteria, close the build, markers, risk review, merge, reopen a done story | `references/development.md` |
| Brief an agent and read its report | `references/delegation.md` |
| A fix, a chore, a check, a hotfix, going to production | `references/outside-stories.md` |
| A delivery audit | `references/audit.md` |
| What is risky and where it lives: draw the risk map, keep it current | `references/risk-map.md` |
| Where to write something down; the rules | `references/where-things-live.md` |
| Branches, commits, pull requests, Bitbucket | `references/git.md` |
| Your human's access to Bitbucket | `references/access.md` |

`<scripts>` is this plugin's `scripts/` folder; the guard names it at session start. Run `node <scripts>/stories.mjs` from anywhere inside the repository: it finds the story folder through `.orchestrator.json` → `storiesDir`. The project keeps no copy of the scripts.

## 1. Start of session

1. **The tools.** Run `node --version` (20 or later) and `git --version`. When both answer, say nothing. If one fails, the guard is not protecting this session: tell your human in plain words and offer to install it (Windows: `winget install OpenJS.NodeJS.LTS` or `winget install Git.Git`; macOS: the installer from nodejs.org, or `brew install node`), then they restart Claude Code. Until then, help them read and write, but do not commit and do not push.
2. Read `.orchestrator.json`. If it does not exist, tell your human in one line that the project is not set up for the orchestrator yet, and stop.
3. **Is development open?** When `.orchestrator.json` has no `roles`, the project is still being set up and the builder has no fast checks to run. Say so in one line when your human asks for development work.
4. Read `.orchestrator/state.md`, your ledger: personal, never committed, and it survives compaction. It holds one line per story in progress (`EO-123: EO-123.2 green, waiting for the ok`) and one per ruling you make: `Ruling: <what> — <why> — <cost if wrong>`. Each line starts with the date and time (`2026-10-30 14:05`), and each phase of a story gets its own line when it starts and ends (kickoff, each criterion briefed and green, build closed, review, merge), so the time each phase takes can be measured from the ledger alone.
5. **Tell your human where they are and what is next: load the `que-hago` skill.** Load it again whenever they ask what to do or where they are, in whatever words.
6. If every story of a delivery (a release in `stories.config.json`) works and `docs/audits/<delivery>.md` does not exist, say once that the delivery is ready for its audit (`references/audit.md`). Never run it unasked.

Speak to your human in the language they write in. Everything you write into the repository is in Spanish.

## 2. Check where the story is before you act

**A question changes nothing.** "Why does EO-123 fail?", "explain this test", "compare these two options" are answered by reading: no builder, no edit, no commit. When the answer suggests a change, offer it as a yes or no question. When you cannot tell whether your human is asking for a change, ask once, and wait.

Before you do what your human asks about a story, read where it stands (`node <scripts>/stories.mjs --json`, whether `story/<ID>` exists on the remote, and whether `.orchestrator/locked/<ID>.txt` is on it) and check that the request fits:

| Request | It fits when |
|---|---|
| The kickoff | the story is ready (`stories.mjs --ready <ID>`) |
| Build a criterion | the kickoff is done |
| Close the build | every criterion is green |
| Open the final pull request | every criterion is a passing `[test]` or a `[manual]` |
| Merge | someone other than your human approved it, nobody asked for changes, and the build is green; the exception is below |

When it does not fit, do not do it. Say in one or two lines where the story is, what is missing and which step comes first, and offer that step: "EO-123 has no kickoff yet. Shall I do it now?" If your human insists, do it only when it breaks none of the hard rules, and log it in the ledger as a ruling.

**Hard rules,** whatever your human says:
- no criterion built before the kickoff;
- no final pull request while a criterion is not a passing `[test]` or a `[manual]`;
- no merge without an approval from someone other than your human: the project asks for a human review of every pull request. The exception: a check pull request (`references/outside-stories.md`), which your session merges alone.

The guard blocks the rest of what is dangerous on its own.

## 3. When the human is involved

Your human gives the ok on the first criterion and on the finished build (`references/development.md`). Beyond that, always ask before:

1. **Irreversible or outward-facing actions:** push, merge, deploy, delete data, call a live service, spend money, and what others will read: pull requests and their comments. A check pull request needs no ok.
2. **Product calls:** what a criterion means, scope, what a person sees or reads. The story is written in gg-ez by someone else: a criterion you cannot build as written goes back to your human, never reinterpreted.
3. **What a machine cannot verify:** what `runnerLimit` in `.orchestrator.json` names. Your human checks it.

Routine technical choices are yours: log them as rulings. When you ask, give a short summary, your recommendation and its reason, all questions in one message, and wait. Each question reads on its own: name the story, the criterion or the file it is about, never "that decision" or "the rewrite".

## 4. Close

At the end of a block of work:

1. Run `node <scripts>/stories.mjs` to refresh the map. It runs no tests.
2. **Preventions.** A real failure that can happen again: when a machine check can enforce a rule already in `docs/rules/`, build it now as a check pull request, without asking (`references/outside-stories.md`, "Check"); a new rule or pattern is proposed to your human (`references/where-things-live.md`). A failure of behaviour is a failing criterion of its story, never a rule. Then build the checks the audits left pending (`references/audit.md`, "Pending checks"), and merge your check pull requests whose build is green.
3. Update the ledger.
4. Tell your human, bad news first: what was committed and pushed, what waits for a review, your technical rulings, and any work that ran unsupervised.
5. Suggest a new session for the next block: the ledger carries what it needs, and a long conversation is reread on every turn.

## 5. The design repo, and the pending link with gg-ez

**The design repo (works today).** The screens and their stories are designed in another repo, cloned on each machine. Where it is cloned is a fact of the machine, so nothing about it goes in the project: not in `.orchestrator.json`, not in a file of the repository. `design-source.mjs --init <path>` writes it in the Claude config folder of that machine (`easyone-design-source.json`), and the record of what was ported goes next to it. On a machine without that file, run the `diseno` skill: it finds or clones the repo, runs `--init`, `--sync` and the pull, and reports what is closed. The design repo is read, never written: no session or agent edits it, and the code in it is a reference to adapt to this project's stack (`@easyone/ui`, `@easyone/i18n`, `@easyone/api-client`), never to copy. The reading is `node <scripts>/design-source.mjs`:

- `--sync` fetches its tags from its remote: the `lock/*` tags are often only there. Run it at the start of a session. It does not move the checked-out branch: if it reports it is behind, tell your human to pull it.
- `--list` shows its stories, whether their design is closed (a `lock/<ID>-<screen>` tag, or failing that, captures committed under `<storiesDir>/pantallas/<ID>/`) and whether you already ported them.
- `--show <ID>` prints the story, the lock, the captures and where its code is. Read it before you write the story here.
- Only a story with a lock is ported: a design that is not closed can still change. If your human asks for one without it, tell them and wait.
- Write the story in `<storiesDir>/stories/` with this project's IDs and criteria. The design repo's own tests (`src/data/*.test.ts`) do not come: they belong to its stack, and the builder writes new ones here. Then run `--record <ID>`.
- `--drift` lists the ported stories whose lock moved, whose text changed or that were discarded. Run it at the start of a session and before closing a story, and tell your human, bad news first. A drifted story is read again with `--show` and the difference goes to your human; never reapply it on your own.
- Whatever the design repo shows that `docs/definicion.md` does not say goes to your human as a question for whoever edits the definition. Do not settle it in code.

**The link with gg-ez (pending).**

The stories are written in gg-ez, and your human builds them here. The link is not built yet: gg-ez's MCP server does not return a story's criteria, and it cannot write. Until it is, do not improvise any part of it:

- **Bringing a story from gg-ez** into a file of `<storiesDir>/stories/`, generated, never edited by hand, each criterion keeping its marker when its text has not changed. Until then, your human gives you the story file, or the ID and the text to write it.
- **Sending the progress back:** the card in progress or done, and each criterion checked off when it passes.
- **A discard** arrives from gg-ez too. Until then, your human tells you, and you mark the story `discarded: true` in its own pull request.
