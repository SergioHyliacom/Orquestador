---
name: estado
description: Shows a technical lead where the foundations of a project stand (delivery 0, the work before development opens) - each piece that Part 2 of the install will check, marked ✅, ❌ or ⚠️ with its evidence, and the open decisions - and runs the foundations' audit once Part 2 is in. Use when a technical lead asks how the foundations are going, what is left before development opens, or what is next while .orchestrator.json has no roles, in any words - "¿cómo van los cimientos?", "¿qué falta para abrir el desarrollo?", "¿qué me toca?". Also when they ask for the foundations' audit.
---

# Estado de los cimientos

The foundations (delivery 0) are the work the technical leads do, with Claude, before development opens: outside the story flow, on `chore/` branches, through pull requests like every other change (`orchestrate` skill, `references/git.md`), with no builder and no Jira card. The rest of the team does not see them: their sessions only say that development is not open yet. Development opens when Part 2 of the install (`/easyone-cimientos:install`) merges and `.orchestrator.json` has `roles`.

The skills named here without a prefix (`orchestrate`, `stories`, `que-hago`) are `easyone-orchestrator`'s.

## 1. What the foundations are

- The technical tests the first stories need. Each choice to prove (for EASY One: Huma or oapi-codegen, goose or Atlas, fosite or ZITADEL, the task file…) is opened by the technical lead as a decision, from `DEC-001` (`stories` skill, "Decisions"), and closed by its test.
- The skeleton and one toy endpoint end to end: Go → OpenAPI → generated client → panel → end-to-end test, on a real PostgreSQL.
- The rules that are not negotiated (for EASY One: the account is resolved on the server, one database per account, limits between modules) and the linters.
- The security checks the CI runs (for EASY One: no concatenated SQL, gitleaks, govulncheck).
- The module generator and a reference module: they become the patterns every story copies.
- The code graph (code-review-graph), configured in the repository.
- The pipeline in Bitbucket.
- The big decisions that shape the code, written down: the 5 to 10 architecture choices the code cannot explain by itself (for EASY One: one database per account, the modular monolith, the OpenAPI generated from Go, the AI gateway…), each a `DEC` file of half a page with its why. The code shows what was chosen, never why. Sessions read each one only when the work touches it.

**Not in the foundations:** business tables, the identity module, or a generic CRUD "just in case". Those arrive through stories; building them now would be building by layers, blind.

## 2. Where the foundations stand

Read only: run no generator, edit nothing, commit nothing.

1. **Gather.** `que-hago` loads this skill for a technical lead (its §1, item 7), after gathering who they are, their git, their pull requests and the ledger. When the lead asks you directly, gather those first (`que-hago` §1, items 1, 2, 5 and 6).
2. **The list.** The pieces of §1 that Part 2 of the install checks (`install` skill, 2.1 and 2.3):
   - the verification commands run;
   - the toy endpoint goes from Go through the OpenAPI spec and the generated client to the panel and an end-to-end test, on a real PostgreSQL;
   - the security checks run in the CI;
   - the module generator and the reference module exist;
   - the code graph is configured in the repository;
   - the pipeline runs in Bitbucket;
   - the big decisions are closed `DEC` files, each with its why.
3. **Each item gets one mark:**
   - ✅ with its evidence: a file, or a command and its result;
   - ❌ with what is missing;
   - ⚠️ when it cannot be checked without changing something.

   Run only commands that read or test, such as the task file's lint and test commands. Skip anything that regenerates or writes. When the reading is long, brief a `researcher`.
4. **Open decisions.** The files in `<storiesDir>/decisions/` with `status: Open`, and the items each one holds up.
5. **Tell them.** In at most 10 lines, inside `que-hago`'s answer when it loaded you: half-done work and pull requests first (`que-hago` §2, rules 1 and 3), then the items and the open decisions. Recommend one step, usually closing the decision that holds up the most items. When every item is ✅, offer Part 2 of the install (`/easyone-cimientos:install`).

**Once development is open** (`.orchestrator.json` has `roles`), skip the list. Look for `docs/audits/entrega-0.md` on the integration branch (`git ls-tree --name-only origin/<integration branch> docs/audits/`):
- missing: add one line offering the foundations' audit (§3), once per session;
- there: add one line saying the foundations are closed and this plugin can be uninstalled (its README says how).

## 3. The foundations' audit

The first audit, right after Part 2 merges: the foundations' patterns are the ones every story will copy. Run the `orchestrate` skill's §10 with one change: the sample is not stories but the main pieces of the foundations and their commits (the reference module, the module generator, the toy endpoint and its screen), named by you; the auditor never chooses what to look at. Say in the brief that this is the foundations' audit, with no stories: the auditor then names each finding's module and commit instead. The record is `docs/audits/entrega-0.md`. The checks are built without asking and the other side's go into the record as pending for it, as in any audit (`orchestrate` §10, steps 4 and 6).
