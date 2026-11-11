# easyone-orchestrator

Plugin de Claude Code con el que Sergio desarrolla EASY One. Es una adaptación del [Orchestrator](https://github.com/sydneyhylia/Orchestrator) de Sydney y Claude.

- **Lo usa una sola persona y es solo suyo.** Tu sesión de Claude (Opus) orquesta tu trabajo. Sus ficheros viven en tu equipo, excluidos de git, y nada del método entra en el repositorio de EASY One. Al empezar, y cada vez que le preguntas «¿qué me toca?», como te salga, te dice en qué punto estás y qué sigue, y te pregunta sí o no.
- **Manda el repositorio.** `CONTRIBUTING.md`, `CODING_STANDARDS.md`, las «Reglas que no se negocian» y «Qué obliga y qué no» de `CLAUDE.md`, los ADR aceptados y la sección 14 de la definición obligan siempre. El plugin los aplica y no relaja ninguno: si choca con ellos, ganan ellos.
- **Las historias se escriben en gg-ez**, el tablero del equipo, con sus criterios de aceptación. Tú las construyes en EASY One.
- **Un criterio cada vez.** El agente `builder` escribe el test, lo ve fallar, lo hace pasar y se para; la sesión comprueba las pruebas y hace el commit. Tú das el ok en el primer criterio y en la construcción terminada.
- **Cada PR lleva revisión con Claude** (el agente `reviewer`, que repasa también el checklist de `CODING_STANDARDS.md`) y la aprobación de otra persona. Se fusiona con Squash.
- **Una guardia** (un hook) impide lo peligroso: ningún agente hace commit, cada uno escribe solo donde le toca, y nadie toca los tests bloqueados ni las historias.
- **Cada cosa tiene un solo sitio.** Está en la skill `orchestrate`, `references/where-things-live.md`.
- **Al cerrar cada entrega, una auditoría por muestreo** contra las normas del proyecto. Lo que puede repetirse se propone como comprobación de la máquina o como línea de `CODING_STANDARDS.md`, siempre por PR.

## Cómo encaja en el repositorio de EASY One

| Norma del repositorio | Cómo la cumple el plugin |
|---|---|
| Ramas `feature/`, `fix/`, `hotfix/`, en inglés y kebab-case; no hay `chore/` | La rama de una historia es `feature/<id>-<slug>` (`feature/alt-001-email-signup`); si se reabre por un bug, `fix/<id>-<slug>`. El trabajo fuera de las historias va en `feature/<slug>` o `fix/<slug>` |
| Commits `tipo(ámbito): descripción`, que lefthook comprueba | Un commit por criterio, con el ID al empezar la descripción: `feat(identity): ALT-001.1 rechazar un correo ya registrado` |
| Claude no hace commits ni push salvo que se le pida, y `.claude/settings.json` los pregunta | Pedir que se construya una historia y dar el ok al primer criterio es pedir sus commits. El aviso de cada `git commit` y `git push` es tu confirmación, y la sesión no vuelve a preguntar |
| PR con el título en el formato de los commits y la lista de `CONTRIBUTING.md` al final | La sesión lo abre así por la API de Bitbucket, con otra persona como revisora |
| `feature/` y `fix/` → `develop` con Squash, con el título del PR como mensaje | La sesión fusiona así, con tu ok, cuando otra persona aprueba, no hay tareas abiertas y el pipeline está en verde. No hay PR que se fusione solo |
| Revisión con Claude en todos los PR | El `reviewer`, en cada PR, no solo en los de riesgo |
| Normas en `CONTRIBUTING.md` y `CODING_STANDARDS.md` | Los agentes citan el documento y el apartado, o el ID del checklist. Una norma nueva se propone como PR a esos documentos |
| Decisiones en ADR y en la definición | Una historia que espera una decisión la cita en `blocked_by: [ADR-0023]`, y no se construye mientras el ADR esté propuesto. Si toca algo de la lista «Para y propón un ADR», se para antes de programar |
| Comprobaciones de «Comprobaciones» y README del módulo al día | Al cerrar la construcción, con `pnpm test:go` para los tests con BD. Un test saltado no cuenta como verde |
| Las vulnerabilidades no se detallan en un PR | Los hallazgos de seguridad se te cuentan en la sesión y no van al PR |

## Pendiente

**El enlace con gg-ez.** Hoy el servidor MCP de gg-ez solo devuelve el identificador, el título y la columna de cada tarea, y no puede escribir (guarda G-3). Para que el orquestador trabaje desde gg-ez faltan tres piezas, por este orden:

1. **Acordar cómo es una historia en gg-ez**, con el orquestador de Sydney, que es quien las sube.
2. **En gg-ez:** que el MCP devuelva una historia con sus criterios, y que pueda marcar el estado de la tarjeta y cada criterio cumplido. Lo segundo lleva su decisión sobre la guarda G-3.
3. **En el orquestador:** traer la historia a un fichero de `<storiesDir>/stories/` (generado, sin editarlo a mano; cada criterio conserva su marca si su texto no cambia) y devolver el progreso.

**Las operaciones de la API que hará backend.** El front llama a la API solo con el cliente generado, y la OpenAPI se genera desde Go. Cuando una historia necesita una operación que aún no existe y la va a hacer backend, falta acordar contigo y con el equipo cómo se prepara el front: quién la declara en Go y cómo se prueba mientras tanto.

Hasta entonces, las sesiones lo dicen en vez de improvisar (skill `orchestrate`, §5).

## Contenido

| Ruta | Qué es |
|---|---|
| `agents/builder.md` | El único agente que escribe código: un criterio o una tarea por encargo, en todas las capas que toque (Go y PostgreSQL, React, Hyliable) |
| `agents/reviewer.md` | La revisión con Claude de cada PR: tests, criterios, código y el checklist de `CODING_STANDARDS.md` |
| `agents/auditor.md` | Auditoría por muestreo al cerrar cada entrega, contra las normas del proyecto |
| `agents/researcher.md` | Investigación de solo lectura |
| `skills/orchestrate/` | El día a día de la sesión. Un núcleo corto (`SKILL.md`) y referencias que se leen solo cuando el trabajo las necesita (`references/`): desarrollo, encargos a los agentes, trabajo fuera de las historias, auditoría, mapa de riesgo, dónde vive cada cosa, git y Bitbucket, y acceso |
| `skills/que-hago/` | En qué punto estás y qué sigue: rama, historias, PR y bitácora. Claude la carga al empezar y cuando preguntas qué te toca |
| `skills/stories/` | Cómo es una historia, sus criterios y sus marcas |
| `skills/diseno/` | Monta y refresca en cada equipo el enlace con el repo de diseño de Sydney |
| `scripts/` | El validador de historias (`stories.mjs`) y la lectura del repo de diseño (`design-source.mjs`). El proyecto no guarda copia: la sesión ejecuta los del plugin, y nunca van al pipeline |
| `hooks/guard.mjs` | La guardia |
| `tests/` | Los tests de la guardia y de los scripts: `node --test "tests/*.test.mjs"` |

## Instalar el plugin

**Solo para ti y solo en el proyecto de EASY One.** Abre una terminal en la carpeta del proyecto y ejecuta:

```
claude plugin marketplace add SergioHyliacom/Orquestador
claude plugin install easyone-orchestrator@hyliacom --scope local
```

`--scope local` lo apunta en `.claude/settings.local.json`, que no se sube: el resto del equipo no lo ve ni lo carga. Cada clon del proyecto lo instala por su cuenta.

Para probar el plugin desde esta carpeta, sin instalarlo: `claude --plugin-dir <ruta de esta carpeta>`.

Claude Code carga los plugins al arrancar. Después de instalar, abre una sesión nueva: hay que reiniciar el CLI, no basta con `/clear`.

**Los hooks de tus otros plugins también se ejecutan en el proyecto**, aunque no uses sus skills. Si uno estorba aquí, desactívalo solo en este proyecto: `claude plugin disable <nombre> --scope local`.

## La primera vez

La sesión comprueba que puede abrir tus PR en Bitbucket. Si no, te guía para crear un token de API con permisos de PR y guardarlo en tu entorno: `BITBUCKET_USER`, que es el email de tu cuenta Atlassian, no tu usuario de Bitbucket, y `BITBUCKET_TOKEN`. El token nunca se escribe en el chat ni en un fichero. Sin él sigues trabajando igual: los PR se abren desde la web.

Lo que se escribe en el repositorio (código, commits, PR) va en español, salvo los identificadores, que van en inglés (`CODING_STANDARDS.md`).

## Preparar tu equipo

Todo esto es tuyo y vive en tu clon de EASY One, sin entrar en git. Se excluye con `.git/info/exclude`, nunca con el `.gitignore` compartido:

```
/.orchestrator/
/.orchestrator.json
```

- `.orchestrator.json`: `storiesDir` (por ejemplo `.orchestrator/historias`), `git` (con `allowPush: false`, para que cada push y cada fusión te pregunten), `verify` (las comprobaciones de «Comprobaciones» de `CONTRIBUTING.md`), `roles` (con las comprobaciones rápidas del builder en `roles.builder.onStop`), `contextDocs` y el mapa de riesgo (`riskTags`, `riskPaths`; skill `orchestrate`, `references/risk-map.md`). El desarrollo se abre cuando tiene `roles`.
- `<storiesDir>/stories.config.json`: las entregas, los perfiles y las fuentes de tests. Los de Go se leen de `go test -json`, sin dependencias nuevas: `{ "command": "pnpm -s test:go -json ./... > {report}", "format": "go-json" }`. Los de Vitest, en `jest-json`.

## Requisitos

- Claude Code con soporte de plugins.
- Node.js 20 o posterior en el `PATH`. Lo usan la guardia y el validador. Sin Node la guardia no arranca y no puede avisar, así que lo comprueba Claude al empezar cada sesión y ofrece instalarlo; en Windows, con `winget install OpenJS.NodeJS.LTS`. Mientras falte, no hace commits ni push.
- Git y el repositorio de EASY One en Bitbucket, con su entorno local montado (`CONTRIBUTING.md`, «Entorno local»): los tests con BD necesitan los servicios arrancados. Un token de API de Bitbucket con permiso sobre los PR, en `BITBUCKET_USER` y `BITBUCKET_TOKEN` de tu entorno. Sin él, abres y fusionas los PR desde la web.

## Diferencias con el original

| Original | easyone-orchestrator |
|---|---|
| Un humano y una sesión que orquesta casi sin intervención | Un humano y su sesión; das el ok en el primer criterio y en la construcción terminada |
| Un `builder` que hace la historia entera | Un `builder` que hace un criterio por encargo |
| `reviewer` después de cada builder | `reviewer` una vez por PR, en todos |
| Las historias se escriben en el repositorio | Las historias se escriben en gg-ez (el enlace está pendiente) y viven en tu equipo |
| Identificador por actividad (`ACC-002`) | El de la historia en gg-ez |
| Un comando de tests | Varias fuentes de tests (Go con `go test -json`, Vitest, E2E); un criterio pasa si pasan todos sus tests |
| Una lista de tests bloqueados en git | Una lista por historia, `.orchestrator/locked/<ID>.txt`, en tu equipo, con el commit en el que se bloqueó |
| — | Auditoría por muestreo al cerrar cada entrega (`auditor`) |
| Lecciones en `CLAUDE.md` | Las normas del proyecto: `CONTRIBUTING.md`, `CODING_STANDARDS.md` y los ADR |
| GitHub y `gh` | Bitbucket |
| Fusiona el humano | Fusionas tú, con Squash, después de que otra persona del equipo apruebe el PR |

## Versiones y actualizaciones

El número de `version` en `.claude-plugin/plugin.json` decide qué recibes: Claude Code te deja en la versión que instalaste hasta que ese número cambia. Un cambio subido sin cambiar la versión no te llega.

- **El número del medio** (`0.2.0` → `0.3.0`) cuando cambia cómo se trabaja.
- **El último** (`0.2.0` → `0.2.1`) cuando solo se arregla algo.

Se actualiza con `claude plugin update easyone-orchestrator@hyliacom` y reiniciando Claude Code.

**De la 0.19 a la 0.20:** las historias, las listas de bloqueo y la auditoría dejan de ir en el repositorio. Si tenías algo en `story/<ID>`, `docs/rules/`, `docs/audits/` o `<storiesDir>/decisions/`, muévelo a `.orchestrator/` (las decisiones de arquitectura, a ADR) y excluye la carpeta. Una lista de bloqueo que no está en git necesita su línea `# commit <sha>`.

## Traer mejoras del original

En este repositorio local, `main` es una copia del original y la adaptación vive en la rama `easyone`. En GitHub (`SergioHyliacom/Orquestador`), `main` es la adaptación: se sube con `git push fork easyone:main`.

```
git fetch upstream
git switch main && git merge --ff-only upstream/main
git switch easyone && git merge main
```

Las skills y los agentes siguen en inglés, como en el original: los lee el modelo, y así se fusionan mejor las mejoras. Lo que el plugin escribe en el proyecto de EASY One va en español.

## Estado

- **Probado:** la guardia (escenarios simulados de cada rol, el cortocircuito del builder y las normas de easyone) y el validador con resultados de Go (`go test -json` y JUnit) y Vitest, con `node --test "tests/*.test.mjs"`. `claude plugin validate` pasa.
- **Sin probar todavía:** las skills y la instalación en el repositorio real de EASY One. La primera historia sirve de piloto.

## Autores

Adaptación de Hyliacom con Claude (Claude Code, Opus 5.5) a partir del Orchestrator de Sydney y Claude. Licencia MIT; ver `LICENSE`.
