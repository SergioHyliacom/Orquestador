# Roles

The shipped roles are a starting set, not a closed list. A project gets every role its work needs, including roles nobody has written yet.

## When a role earns its own agent

Create a role when the work meets at least one test:

1. **Independence.** It judges someone else's work, and sharing the author's reasoning would weaken that judgement. Examples: legal review, accessibility audit, security review, domain-expert check.
2. **Different tools or permissions.** It needs tools others must not have, or must be denied tools others have. Examples: a data role with database access; a read-only auditor.
3. **Its own deliverable with its own quality bar.** It owns a file or an output, and that output has a standard of its own. Examples: copy master document, translations, SEO metadata, release notes, data migrations.

If none applies, do not create a role. Load the relevant skill into the builder, or put the rule in `CLAUDE.md`.

A finding that recurs across reviews also signals a missing role.

## Examples by signal

These are examples, not a list to pick from. Read the project and decide.

| Signal in the project | Possible role |
|---|---|
| Legal pages, contracts, privacy, regulated data | `legal-reviewer` |
| Public UI with accessibility obligations | `accessibility-auditor` |
| Auth, payments, personal data, file uploads | `security-reviewer` |
| Database schema, migrations, analytics | `data-engineer` |
| Several UI languages | `translator` |
| Search traffic matters | `seo-reviewer` |
| A specialised domain (medical, finance, education) | `<domain>-expert` |
| Infrastructure, deploys, CI | `ops` |

## Creating a role

1. Write `.claude/agents/<role>.md` in the project from `role-template.md` (next to this file). Project roles live in the project, not in the plugin.
2. Fill every field. A role is a contract: purpose, inputs, output file, tools, model, turn limit, escalation rule, report shape.
3. Read-only roles get `Write` only to write their report under `.orquestador/work/`. They get no `Edit`. Only roles that own a deliverable edit project files, and only their deliverable.
4. State in the role's `description` which test it meets.
5. Record the addition in `.orquestador/state.md` as a ruling, and list it in the close report.

Creating, changing or retiring a role is the orchestrator's call. It is internal and reversible. It does not need the human's approval.

## Retiring a role

Retire a role when it stops producing findings or deliverables, or when its work moves elsewhere. Delete its file and record the ruling.

## Naming

A role name is a lowercase noun or noun phrase with hyphens: `legal-reviewer`, `data-engineer`. An instance adds the scope: `legal-reviewer-ACC-003`. A role means the same thing in every project that has it.
