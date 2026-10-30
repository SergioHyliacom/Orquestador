# Delivery audit

The tests prove that each story does what it says, not how the code is built. So, at the close of each delivery, a technical lead may ask for an audit, and every finding that can recur becomes something that stops it next time. It is never automatic, and only the person who asked for it sees it.

1. **Sample, with a fixed rule.** From the stories merged in the delivery, take `audit.sample` (default 5): at least one of each side, every one with a risk tag, then the largest diffs. The auditor never chooses what to look at.
2. **Audit.** Brief a fresh `auditor` with the sample, the rules in `docs/rules/`, the previous audits in `docs/audits/` and the path of its report.
3. **Verify.** Run the `Check` of every Critical and Important finding before anyone reads it. One that does not reproduce is dropped. A bug against a story becomes a failing criterion of that story, which reopens it (`references/development.md`).
4. **Close it.**
   - **Checks, without asking.** A verified finding whose prevention is a machine check enforcing a rule already in `docs/rules/` is accepted. Build your side's checks as one check pull request (`chore/check-audit-<delivery>-<back | front>`, `references/outside-stories.md`). Never brief the other side's builder: its checks go into the record as pending for that side.
   - **The rest goes to your human:** findings with no rule behind them (proposals), a prevention that has to be a rule or a pattern, and what cannot be a check pull request (Critical, a risk area, a locked test). Build only what they confirm; new rules go in through a pull request another person approves.
5. **Record** `docs/audits/<delivery>.md`, in your side's check pull request (or a pull request of its own): the sample, and each finding with its outcome — accepted, rejected with the reason, or dropped. Each accepted finding carries its prevention and two lines: `Lado: backend` or `Lado: frontend`, and `Estado: pendiente` or `Estado: hecha (<commit>)`. The next audit reads it: a rejected finding is not raised again.

## Pending checks

At the close of a block of work, a developer's session looks in `docs/audits/` on the integration branch (`git ls-tree --name-only origin/<integration branch> docs/audits/`, then `git show origin/<integration branch>:<file>`) for findings whose `Lado` is its side and whose `Estado` is `pendiente`. It builds them without asking, as one check pull request per audit that also sets their `Estado` to `hecha (<commit>)`. Its human does not need to do anything.
