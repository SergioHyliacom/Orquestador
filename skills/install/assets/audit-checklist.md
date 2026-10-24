# Audit checklist

The auditor judges the code against this list, not against its own taste. The team owns it and changes it through pull requests:

- A finding the team accepts, that no machine check can express, becomes an item under "Check by eye".
- An item a machine check now enforces moves to "Covered by the machine": the auditor stops looking at it.
- An item that produced only rejected findings for two audits in a row is reworded or removed.

Each item: what to look for — why it matters — where the rule comes from.

## Check by eye

- **A-01** The account is resolved on the server, in one place; no handler takes it from the request. — Another account's data leaks. — Architecture.
- **A-02** Account data is read and written only through that account's database connection. — Another account's data leaks. — Architecture.
- **A-03** No personal data or secrets in logs, errors or responses. — GDPR and security. — Architecture.
- **A-04** One way to solve each recurring problem: a second pattern where one exists is a finding. — The AI copies whichever it finds. — Team.
- **A-05** No query inside a loop; a new query on a large table has an index; a list has a limit. — Performance. — Team.
- **A-06** Account data exposed through the API has a test that another account cannot read or change it. — Account isolation. — Team.
- **A-07** A test observes its criterion: not snapshot-only, not mock-was-called, not "does not throw". — A green test that proves nothing. — Team.
- **A-08** A new dependency was chosen on purpose: the story or a decision names it. — Licences, upkeep, attack surface. — Team.

## Covered by the machine

The auditor skips these: a check already enforces them.

- {{CHECK: what it enforces — the command, lint rule or test that does it}}
