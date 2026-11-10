# Delivery audit

The tests prove that each story does what it says, not how the code is built. So, at the close of each delivery, your human may ask for an audit, and every finding that can recur becomes something that stops it next time. It is never automatic, and only your human sees it.

1. **Sample, with a fixed rule.** From the stories merged in the delivery, take `audit.sample` (default 5): every one with a risk tag, then the largest diffs. The auditor never chooses what to look at.
2. **Audit.** Brief a fresh `auditor` with the sample, the rules in `docs/rules/`, the previous audits in `docs/audits/`, the risk map (`.orchestrator.json` → `riskTags`, `riskPaths`, and the path of `references/risk-map.md`) and the path of its report.
3. **Verify.** Run the `Check` of every Critical and Important finding before anyone reads it. One that does not reproduce is dropped. A bug against a story becomes a failing criterion of that story, which reopens it (`references/development.md`).
4. **Close it.**
   - **Checks, without asking.** A verified finding whose prevention is a machine check enforcing a rule already in `docs/rules/` is accepted. Build them as one check pull request (`chore/check-audit-<delivery>`, `references/outside-stories.md`). The ones you cannot build now go into the record as pending.
   - **The rest goes to your human:** findings with no rule behind them (proposals), a prevention that has to be a rule or a pattern, what cannot be a check pull request (Critical, a risk area, a locked test), and the gaps in the risk map, which go in as one `chore/risk-map` pull request on their ok. Build only what they confirm; new rules go in through a pull request another person approves.
5. **Record** `docs/audits/<delivery>.md`, in the check pull request (or a pull request of its own): the sample, and each finding with its outcome — accepted, rejected with the reason, or dropped. Each accepted finding carries its prevention and a line `Estado: pendiente` or `Estado: hecha (<commit>)`. The next audit reads it: a rejected finding is not raised again.

## Pending checks

At the close of a block of work, a session looks in `docs/audits/` on the integration branch (`git ls-tree --name-only origin/<integration branch> docs/audits/`, then `git show origin/<integration branch>:<file>`) for findings whose `Estado` is `pendiente`. It builds them without asking, as one check pull request per audit that also sets their `Estado` to `hecha (<commit>)`. Its human does not need to do anything.
