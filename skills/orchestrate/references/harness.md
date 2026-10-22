# Harness

Detect once per session. The harness decides **how** you delegate, not whether. Every judgement in the `orchestrate` skill stays the same; only the mechanism changes.

## Detect

| Signal | Harness |
|---|---|
| `TERM_PROGRAM=Orca`, or any `ORCA_*` variable | Orca |
| none of the above | Plain Claude Code |

Check with `env | grep -E '^(TERM_PROGRAM|ORCA_|CLAUDECODE)'` or `Get-ChildItem env: | Where-Object Name -match 'ORCA|TERM_PROGRAM|CLAUDECODE'`.

Write the verdict on the first line of `.orquestador/state.md`, with the Run id when the harness is Orca. A session that does not know its harness delegates to the wrong mechanism silently.

## Two mechanisms

|  | Orca supervised worker | Claude Code subagent (Agent tool) |
|---|---|---|
| Where it runs | its own agent session, own terminal, own workspace | inside your turn |
| The human | sees a named terminal, a row in `orca worktree ps`, the Run inbox | sees nothing; the output reaches only you |
| Survives your compaction | yes; output stays readable with `worker-read` | no; it dies with your turn |
| Blocking question | `orchestration ask` → your `reply`; decision gates | `NEEDS_CONTEXT` → `SendMessage` to the agent id |
| Role rules in the guard | `agent_type` is empty — you must declare the role (see **The guard**) | `agent_type` carries the role |
| Cost | a whole agent session | cheap |

**In Orca the worker is the default.** Use the Agent tool only for a short read-only lookup whose answer only you need and that you would otherwise do yourself. Everything that writes, runs long, or produces a verdict the human will read is a supervised worker. Never substitute the Agent tool when the human asked to supervise, monitor or track the work: that request is for Orca provenance, and an in-process subagent leaves none.

**In plain Claude Code** the Agent tool is the only mechanism. Parallel writers get `isolation: worktree`. Separate sessions only if the human runs them; coordinate through files in `.orquestador/work/` and cross-session messages (ListAgents/SendMessage). A message lasts only as long as the session; the branch and the files are the durable record.

## Orca: the guide is the authority

Run `orca skills get orchestration` before the first delegation and follow it. It is version-matched to the installed CLI; this file only maps orquestador onto it and never overrides it. Use the same executable for the whole run, and read a reference at its action gate. On Windows, PowerShell splits a multi-line `--spec` at its quotes; write the spec to a file and pass it from Git Bash as `--spec "$(cat <file>)"`.

```
orca skills get orchestration --reference references/<file>.md
```

`coordinator-loop` (waves, model/effort, terminal reuse) · `placement-and-remote` (new workspace, SSH, remote) · `messaging-and-gates` (inbox replay, groups, gates) · `recovery-and-cleanup` (failure, retry, stop, release) · `worker-contract` (what your workers owe you) · `low-level-topology` · `legacy-contract-migration`.

`orca status --json` names your own Orca session. If the orchestration layer is not reachable, report the exact error, fall back to the Agent tool, and say in the close report that the work ran unsupervised.

## The loop

One Run per block of work, not one per story: the Run is your inbox and your namespace. It does not place or schedule anything.

```
orca orchestration run-create --objective "<the block of work>" --json     # or run-use --run <id>
orca orchestration worker-start --spec "<the brief, inline>" --task-title "builder-ACC-002" ... --json
orca orchestration worker-start --spec "<the brief, inline>" --task-title "researcher-pagos" ... --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json
```

1. **Start the whole independent wave before the first wait.** `worker-start --spec` creates the Task and its attempt in one call. Use `task-create --deps` plus `worker-start --task <id>` only for real ordering, and prefer parallel waves to chains deeper than three or four steps.
2. **Process every message in a Delivery before `--ack`.** The batch replays until acknowledged and carries the whole FIFO queue whatever the type filter says. Reply to each question, validate each `worker_done` against the Task you expected and against the evidence rule of §5 of the skill, and decide each settled terminal's next owner.
3. **Account for every settled worker, immediately, exactly once:** reuse its proven terminal for the next Dispatch (`worker-start --task <next> --terminal <handle>`), `worker-retain` only when the human asked for it, or `worker-release`. Never `terminal close`. Do not end your turn while `worker-list --run <id> --terminal-state reclaimable --json` returns rows.
4. **An empty wait or a timeout is a checkpoint, not a failure.** Keep rolling waits until every expected Dispatch settles. After three consecutive empty waits, enumerate with `worker-list --run <id> --include-remote --json` and run each row's literal `projection.nextAction`; a `none` action means read `liveness.reason` and keep waiting.
5. **Absence proves nothing.** `unverifiable`, a null `agentWait`, an unchanged output tail and a lost connection are all absence, and absence authorizes no stop, abandon, retry or release. Leave a wait only on positive proof: `exited` liveness, the worker's own observation of exit, or a transcript whose last agent turn sent no `worker_done`. Then load `recovery-and-cleanup` and choose `worker-stop` or `worker-abandon` explicitly.
6. **Read each new worker once, and any worker that seems stuck.** Right after `worker-start`, and whenever a worker goes quiet, run `worker-read` on its terminal. If the agent waits at a prompt (the Bypass Permissions warning, a trust dialog, a tool permission request), never answer it: that is the human's consent. `worker-stop` the worker, tell the human the exact prompt, and run that role through the Agent tool meanwhile. Record it as unsupervised.
7. **A non-zero `worker-start` is not a reason to relaunch.** Read the receipt's `failedStage` and `residualResources` and follow `recovery-and-cleanup`. After three failed attempts a Task circuit-breaks: report it to the human instead of routing around it with a new Run or Task.

### The statuses of §5, in Orca terms

| §5 status | Orca |
|---|---|
| `DONE` | `worker_done --outcome succeeded` |
| `DONE_WITH_CONCERNS` | `worker_done --outcome succeeded`, concerns in the body and the report |
| `BLOCKED` | an `escalation` before completion, or `worker_done --outcome failed` |
| `NEEDS_CONTEXT` | the worker's `ask`; you answer with `reply --id <message_id>` |

A gate is for a decision **you** own that blocks one Task while the rest of the wave runs: `gate-create --task <id> --question … --options …`, then `gate-resolve`. It is where you record an answer, not a licence to give one: §7 of the skill still decides whether the answer is yours or the human's. Never create a gate merely to answer a worker's `ask`.

## Placement

A fresh worker means a fresh terminal, not a new Git worktree.

- **Writers** never share your workspace: `--worktree new-child --name <role>-<scope> --setup run`. One worktree per writer, and the branch rules of `references/git.md` apply inside it.
- **Read-only roles** (`reviewer`, `researcher`, `designer`, a reviewing `copywriter`) run on `--worktree current`: they judge what is already there and write only their report. They need no commit and no worktree, so they stay supervised workers even when a ruling keeps the writers in the main checkout.
- **Folder workspaces are first-class.** When the workspace is a folder, there is no worktree lineage and no branch: `git.md` does not apply, and the story's evidence is the verification commands alone. Say so in the close report.
- **Name the work, do not rename terminals:** `--task-title "<role>-<scope>"` and `--display-name "<role>-<scope>"`. How the worker appears — chat or terminal — follows the human's own setting for new agent tabs. There is no flag for it and no reason to ask.
- `--agent claude` unless the human named another agent. Pass `--model`/`--effort` only when the human named them, and compare `launch.requested` with `launch.effective` before claiming either took effect.
- Role agents do not dispatch workers; their contracts say so. Nested workers obey `nested_worker_depth_exceeded`, and a new Run does not reset depth.

## The brief is the spec

Orca requires a **self-contained** spec: the injected preamble is all the worker starts with, and a worker in another workspace cannot read your ignored files by relative path. So pass the §4 brief **inline** as `--spec`, and keep writing it to `.orquestador/work/<scope>/brief.md` as the durable record.

| Orca spec field | §4 brief line |
|---|---|
| Target | `Target:` |
| Change | `Change:` (reviewers: `Judge:`) |
| Constraints | `Constraints:` and `Read first:` |
| Ownership | `You may edit:` plus the role name |
| Observable acceptance | `Done when:` — the exact command |

The spec also carries the absolute path of the brief file, the absolute path of the report, the role name for the first line of the report, and the escalation clause. The worker writes its report and names it in `worker_done --report-path`.

**The spec also carries the role contract itself.** An Orca worker is a plain agent session: it never loads `agents/<role>.md`, because that file defines a Claude Code subagent, not a session. Nothing but the spec and the project's own `CLAUDE.md` reaches it. So:

- For a **project role**, add its file to `Read first:` — `.claude/agents/<role>.md` is inside the workspace and the worker can read it.
- For a **plugin role** (`builder`, `reviewer`, `researcher`, `copywriter`, `designer`), paste its Rules, its stop-and-report condition, its Output shape and the `If Orca dispatched you` block into the spec. Do not paraphrase them, and do not cite the plugin by path: the plugin lives outside the workspace and the path is not portable.
- Either way the spec ends with the lifecycle clause: `ask` for a blocking question, `check --terminal <handle>` at each checkpoint and once before finishing, exactly one `worker_done` with both lifecycle IDs, an explicit `--outcome` and `--report-path`.

A worker that was not told its contract will invent one.

## Browser

Orca exposes its workspace browser tab through the `orca` CLI: `tab list`, `goto`, `snapshot`, `screenshot --json`, `click`, `fill`, `type`, `keypress`, `eval`, and `exec --command console`. Check that `orca tab list` returns a tab before you promise a UI check. Plain Claude Code exposes no browser of its own; skip the UI check there.

What a real run taught:
- A click on an element outside the viewport does not register. Scroll it into view with `eval` first.
- The snapshot can lag behind the page. Screenshots are the evidence.
- Pick elements by the snapshot's ref, not by a regex over its text. A regex picked the wrong combobox twice.
- Scope every query to the content region, with a container selector. A text match also hit the sidebar's user menu.
- After a code change, run `orca reload` before checking. Hot reload missed a new component, and the tab stayed stale.
- There is one tab. Never give the UI check to two agents at the same time.

## The guard

`hooks/guard.mjs` reads the role from the hook's `agent_type`, which exists only for Agent-tool subagents. **An Orca worker is a full Claude Code session: `agent_type` is empty there.** Without a declared role, the read-only roles stop being read-only and the builder stops being held to red-to-green — silently. The git rules and the locked acceptance tests still apply, because those do not depend on the role.

So, for every Orca worker, before you dispatch it:

1. Write `<the worker's workspace>/.orquestador/role.json`:

```json
{ "role": "builder", "scope": "ACC-002", "workspace": "<absolute path of that workspace>" }
```

The guard reads it when `agent_type` is empty, checks that `workspace` is the workspace it is running in, and then applies the same role rules — plus the builder's verification gate, on the worker's `Stop` instead of `SubagentStop`.

2. **Never write it into your own workspace.** It would apply those rules to you. That is the second reason a writer gets its own workspace.
3. Delete it when you release the worker.
4. A workspace whose root has no `.orquestador.json` is unguarded. Do not place a writer there.

## Prove it once per project

Before you rely on any of this, prove the chain exists. This check is cheap and it is the one whose absence let an entire plugin ship unexercised:

```
orca orchestration run-list --json                 # your Run is there
orca orchestration worker-list --run <id> --json   # your worker is there
orca worktree ps                                   # its row, named <role>-<scope>
```

Record the result as a ruling in `.orquestador/state.md`. Only `run_legacy_local` and an empty worker list mean the orchestration layer has never been used in this project.

## Avoid

- Experimental agent teams as the backbone. Their plan approvals bypass the human, and teammates do not survive resume.
- Two writers on the same files, in any harness.
- `dispatch --inject` (it leaves the process unsupervised), `terminal close` in place of `worker-release`, and `orchestration reset` during active coordination.
- Claiming a worker is dead, or retrying it, from absence alone.
- Opening a browser — Orca's embedded browser included — unless the brief or the human allows it. The `ui` key in `.orquestador.json` is the human's permission for the UI check, and only for it.
