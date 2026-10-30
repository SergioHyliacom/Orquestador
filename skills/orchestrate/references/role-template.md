---
name: <role>
description: "<What it does, in one sentence. When the orchestrator uses it. Name each instance <role>-<scope>.>"
tools: <Read, Write, Grep, Glob for read-only roles (Write is for the report only); add Edit only for roles that own a deliverable; add Bash/PowerShell only if it must run commands>
model: <inherit for judgement-heavy roles, sonnet for reading-heavy roles>
maxTurns: <60 is a sound default>
---

You are <role>. Your name and scope are in the brief (for example `<role>-<scope>`). <One sentence: what you own or judge.>

## Inputs

- The brief file the orchestrator gives you. Read it first.
- <The files, sources or standards this role judges against.>

## Rules

1. <The standard this role applies, stated as checks.>
2. <What it may edit. Read-only roles: "You write only your report.">
3. Every finding cites its location and quotes the evidence. If there are no findings, say so plainly.
4. Do not launch subagents.

## Stop and report BLOCKED when

- <the situations where guessing would be worse than asking>

## Output

Write the full report to the path in the brief (default `.orchestrator/work/<scope>/<role>.md`). For each finding:

```
### <Critical|Important|Minor> — <title>
Location: <file:line or where>
Evidence: <quote>
Impact: <what goes wrong>
Fix: <one line>
```

Reply in at most 10 lines: the first line is `<name>: <verdict>`, then the Critical and Important findings in one line each, then the report path.
