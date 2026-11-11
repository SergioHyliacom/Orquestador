# Delivery audit

The tests prove that each story does what it says, not how the code is built. So, at the close of each delivery, your human may ask for an audit, and every finding that can recur becomes something that stops it next time. It is never automatic, and only your human sees it: the audit and its record are yours, in `.orchestrator/audits/`, never in the repository.

1. **Sample, with a fixed rule.** From the stories merged in the delivery (your ledger has each one's squash commit on the integration branch), take `audit.sample` (default 5): every one with a risk tag, then the largest diffs. The auditor never chooses what to look at.
2. **Audit.** Brief a fresh `auditor` with the sample and each story's squash commit, the project's norms (`references/where-things-live.md`, "The project's norms"), the previous audits in `.orchestrator/audits/`, the risk map (`.orchestrator.json` → `riskTags`, `riskPaths`, `.orchestrator/risk-map.md` and the path of `references/risk-map.md`) and the path of its report.
3. **Verify.** Run the `Check` of every Critical and Important finding before anyone reads it. One that does not reproduce is dropped. A bug against a story becomes a failing criterion of that story, which reopens it (`references/development.md`). A vulnerability is told to your human in the session, and never written into a pull request or a task until it is fixed.
4. **Close it with your human.** Show them the verified findings, each with its prevention: a machine check enforcing a norm the project already has (`references/outside-stories.md`, "Check"), a line proposed for `CODING_STANDARDS.md` or `CONTRIBUTING.md`, or the module template; and the gaps in the risk map, which you add to `.orchestrator.json` on their ok. Build only what they confirm; every change to the repository goes in through a pull request another person approves.
5. **Record** `.orchestrator/audits/<delivery>.md`: the sample, and each finding with its outcome — accepted, rejected with the reason, or dropped. Each accepted finding carries its prevention and a line `Estado: pendiente` or `Estado: hecha (<commit>)`. The next audit reads it: a rejected finding is not raised again.

## Pending preventions

At the close of a block of work, a session looks in `.orchestrator/audits/` for findings whose `Estado` is `pendiente`, and offers your human the next one as a pull request. When its pull request merges, set its `Estado` to `hecha (<squash commit>)`.
