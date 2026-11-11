---
name: diseno
description: Sets up and refreshes the link with the design repo (Sydney's front-sydser) on this machine in one go - finds or clones the repo, writes this machine's config, fetches the lock tags, brings the repo up to date and says which designs are closed and which ported stories drifted. Use on a new machine (the office PC), at the start of a session that will port screens, and whenever they say "configura el diseño", "conecta con lo de Sydney", "actualiza el diseño", "qué pantallas están cerradas", "no encuentra el repo de diseño", or `design-source.mjs` says there is no config.
---

# Diseño

One command for your human, no manual steps. Everything here is read-only on the design repo's files; the method is in the `orchestrate` skill, §5. `<scripts>` is the folder the guard names. Run `node <scripts>/design-source.mjs`.

## 1. Is this machine configured?

Run `--list`.

- It lists stories: configured. Go to step 3.
- It says there is no config, or that the path is not a git repository: go to step 2.

## 2. Configure

1. **Find the clone.** Look, in this order, for a folder `front-sydser` (or a repo whose `origin` is `sydneyhylia/easy-one`) in: the project itself (`<project>/front-sydser`), the folder next to the current project, `D:\Escritorio\Hyliacom\easyone\`, and the user folder's `Escritorio`/`Desktop`. A clone inside the project must be excluded on this machine: check `git check-ignore -q front-sydser`, and if it is not ignored, offer to add `/front-sydser/` to `.git/info/exclude`, never to the shared `.gitignore`. Use `git -C <folder> remote get-url origin` to confirm. If there is exactly one, use it.
2. **Not found:** ask your human one question: where do they want it cloned, offering `<project>/front-sydser`, excluded as above. Then `git clone https://github.com/sydneyhylia/easy-one.git <path>`. If the clone asks for credentials or fails, report it as it is and stop; do not look for tokens.
3. **Several found:** ask which one.
4. Run `--init <path>`. It prints where it wrote the config: tell your human.

## 3. Refresh

1. `--sync` (fetches the tags).
2. If it says the branch is behind its remote: check the clone is clean (`git -C <path> status --porcelain` empty) and on its main branch, and then `git -C <path> pull --ff-only`. If it is not clean or not on main, do not pull: say what is in the way and leave it to your human.
3. Run `--list` again, and `--drift`.

## 4. Report, bad news first

In plain words, short:

- Ported stories that drifted (`--drift`), each with why.
- The stories with a closed design (`locked`) that are not ported yet: these are what can be built now.
- How many have no lock yet (not ported until Sydney closes them).
- What you did to the machine: config written, repo cloned, repo pulled.

Then offer, as a yes or no question, to port the first locked story (`stories` skill, "Porting a story from the design repo"). Change nothing in the project until they answer.

## Never

- Write, commit or push in the design repo. The only things this skill may change there are the tags `--sync` fetches and a fast-forward `pull`.
- Put the path or the ledger anywhere inside the EASY One repository.
