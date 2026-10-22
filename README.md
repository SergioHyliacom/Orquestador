# orquestador

A Claude Code plugin for orchestrated product work.

- The main session is the **orchestrator**. It contacts the human only for irreversible actions, product calls, what machines cannot verify, and final acceptance. It decides the rest itself.
- **The harness decides how it delegates.** In [Orca](https://orca.computer) the roles run as supervised workers under one orchestration Run: each in its own named terminal, with blocking questions, decision gates and a settlement the orchestrator must account for. In plain Claude Code they run as Agent-tool subagents. `skills/orchestrate/references/harness.md` maps the method onto each.
- **Role agents** do the work. The plugin ships `builder` (the only role agent that writes code), `reviewer`, `researcher`, `copywriter` and `designer`. These are a starting set: each project gets every role its work needs, written into the project's `.claude/agents/` from a template. Each role is a contract: inputs, output file, tools, turn limit and when to stop.
- **User stories** drive product work. Each story has acceptance criteria with a verification marker. A validator computes the status of each story and generates the map.
- **A guard hook** blocks the dangerous actions: push, force, `--no-verify`, `reset --hard`, commits on protected branches, broad `git add`, and edits to locked acceptance tests. It also holds each role to its contract: a Claude Code subagent is recognised by its `agent_type`, an Orca worker by the `.orquestador/role.json` the orchestrator writes into that worker's own workspace.

The plugin is inert in projects without `.orquestador.json`. In projects with it, a session-start hook tells the main session to load the `orchestrate` skill.

## Contents

| Path | What it is |
|---|---|
| `skills/orchestrate/` | The orchestrator's operating procedure, harness detection, git rules |
| `skills/stories/` | How to write, split and maintain stories; English templates |
| `skills/install/` | Adapts the plugin to one project; assets copied into the project |
| `agents/` | The role contracts |
| `hooks/` | The guard |

## Install the plugin

From this folder:

```
claude plugin validate .
claude plugin marketplace add .
claude plugin install orquestador@orquestador-local
```

To try it without installing: `claude --plugin-dir <path to this folder>`.

## Set up a project

Open the project and run `/orquestador:install`. The install runs only on that command. It measures the project and asks only what it cannot measure. Then it writes:

- `.orquestador.json`: the measured plugs (commands, runner limit, seams, language, git rules);
- project roles in `.claude/agents/`, when the project needs them;
- the story folder in the project's language, with `stories.mjs`;
- a block in `CLAUDE.md`;
- `.orquestador/`: the ledger and the locked-tests list.

## Languages

The plugin is written in English. Each project's files are written in that project's language only. The install step translates the headings, markers and templates into `stories.config.json` → `labels` and `<storiesDir>/templates/`.

## Requirements

- Claude Code with plugin support.
- Node.js 20 or later, on `PATH` (the guard and the validator use it).
- Git. The GitHub steps use the `gh` CLI.
