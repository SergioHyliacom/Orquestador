# easyone-orchestrator

Plugin de Claude Code con el que el equipo de Hyliacom desarrolla EASY One. Es una adaptación del [Orchestrator](https://github.com/sydneyhylia/Orchestrator) de Sydney y Claude.

- **Cada persona tiene su propia sesión de Claude (Opus)**, que orquesta su trabajo. Al empezar, y cada vez que le preguntas «¿qué me toca?» como te salga, te dice en qué punto estás y qué sigue, y te pregunta sí o no. Nadie tiene que saberse el flujo ni recordar comandos.
- **Las historias de usuario** recogen el comportamiento en criterios, en ficheros del repositorio.
- **Un criterio cada vez.** Un agente escribe el test, lo ve fallar, lo hace pasar y se para; la sesión comprueba las pruebas y hace el commit. La persona da el ok en el primer criterio y en la construcción terminada.
- **Git lo guarda todo:** las historias, los tests y en qué punto está cada historia (su rama, su lista de tests bloqueados y el mapa que genera el validador).
- **Una guardia** (un hook) impide lo peligroso.
- **Cada cosa tiene un solo sitio.** El comportamiento, en las historias; las elecciones, en decisiones; cómo se escribe el código, en comprobaciones de la máquina y, cuando no es posible, en las reglas del proyecto (`docs/rules/`). Si algo no encaja en ninguno, no se escribe. Está en la skill `orchestrate`, `references/where-things-live.md`.
- **Al cerrar cada entrega, una auditoría por muestreo** comprueba el código contra las reglas de `docs/rules/` y convierte cada error que puede repetirse en una comprobación de la máquina o, si no es posible, en una regla. Lo aprendido vive en el repositorio. Las comprobaciones se construyen y se fusionan solas, sin que nadie decida; las reglas nuevas, lo crítico y las zonas de riesgo los decide quien pidió la auditoría.

## Pendiente

Se han quitado los departamentos de diseño, backend y frontend: sus agentes (`backend-builder` y `frontend-builder`), el contrato OpenAPI entre los dos lados, la revisión visual, Figma y Mobbin, la demo del lienzo (`canvas/`) y los documentos que explicaban el método (`docs/`). También Jira: las tarjetas, sus etapas, la sincronización (`jira-sync.mjs`), los comentarios entre personas y el acceso con `acli`. Queda por decidir, y las sesiones lo dicen en vez de improvisar (skill `orchestrate`, §5):

- quién escribe el código: el plugin no trae ningún builder;
- cómo se aprueba una historia antes de construirla, y cómo llega un descarte a la rama de integración;
- quién da el número a una historia nueva, para que dos personas no cojan el mismo (lo daba Jira);
- quién coge cada historia, y cómo se pide algo una persona a otra.

## Contenido

| Ruta | Qué es |
|---|---|
| `agents/reviewer.md` | Revisión independiente al cerrar una historia, solo si lleva etiqueta de riesgo |
| `agents/auditor.md` | Auditoría por muestreo al cerrar cada entrega: lo que los tests no ven, convertido en reglas |
| `agents/researcher.md` | Investigación de solo lectura |
| `skills/orchestrate/` | El día a día de cada sesión. Un núcleo corto que carga cada sesión (`SKILL.md`: el inicio, qué se comprueba antes de actuar, qué no se hace nunca, cuándo se pregunta a la persona, el cierre y lo pendiente) y referencias que se leen solo cuando el trabajo las necesita (`references/`): desarrollo, encargos a los agentes, trabajo fuera de las historias, auditoría, dónde vive cada cosa, git y Bitbucket, y accesos |
| `skills/que-hago/` | En qué punto está la persona y qué le toca: rama, historias, PR y su bitácora. Claude la carga al empezar y cuando alguien pregunta qué le toca |
| `skills/stories/` | Cómo se escriben y mantienen las historias |
| `scripts/` | El validador de historias (`stories.mjs`). El proyecto no guarda copia: las sesiones ejecutan el del plugin y el pipeline lo descarga de este repositorio |
| `hooks/guard.mjs` | La guardia |
| `tests/` | Los tests de la guardia y del validador (rutas de riesgo y referencias de los textos de contexto): `node --test "tests/*.test.mjs"` |

## Instalar el plugin

**Lo instala todo el equipo, y solo en el proyecto de EASY One, no en todo el ordenador.** Abre una terminal en la carpeta del proyecto y ejecuta:

```
claude plugin marketplace add SergioHyliacom/Orquestador
claude plugin install easyone-orchestrator@hyliacom --scope project
```

Claude Code tiene tres alcances para un plugin:

| Alcance | Dónde funciona | Dónde lo apunta |
|---|---|---|
| `--scope project` (el nuestro) | Solo en este repositorio, para todo el equipo | `.claude/settings.json`, que se sube |
| `--scope local` | Solo en este repositorio y solo para ti, por ejemplo para probarlo | `.claude/settings.local.json`, que no se sube |
| `--scope user` (el que se usa si no dices nada) | En todos tus proyectos | Tu configuración de usuario. **No lo uses** |

La primera persona que lo instala con `--scope project` deja el plugin activado en `.claude/settings.json`, y eso se sube con el resto del proyecto. Las demás, al hacer pull, lo tienen activado pero sin descargar: cada una ejecuta los dos comandos de arriba una sola vez. El repositorio del plugin en GitHub tiene que ser público: el pipeline de Bitbucket descarga de él los scripts.

**Cada carpeta lo instala por su cuenta.** Otro clon del proyecto, aunque esté dentro de la misma carpeta, no hereda la instalación: ejecuta allí también los dos comandos. Si se te olvida, Claude te lo dice al abrir la sesión (lo pide `CLAUDE.md`) y no hace commits ni push hasta que esté instalado.

Para probar el plugin desde una copia en tu equipo, sin instalarlo: `claude --plugin-dir <ruta de esta carpeta>`.

Claude Code carga los plugins al arrancar. Después de instalar, abre una sesión nueva: hay que reiniciar el CLI, no basta con `/clear`.

**Los hooks de tus otros plugins también se ejecutan en el proyecto**, aunque no uses sus skills; también los del orquestador original (`orchestrator`), si lo tienes instalado. Si uno estorba aquí (por ejemplo, un hook después de cada edición que necesita una herramienta que no tienes), desactívalo solo en este proyecto: `claude plugin disable <nombre> --scope local`.

## Tu primera sesión

La primera vez que abres Claude en el proyecto, tu sesión empieza preguntándote tu nombre. El idioma lo toma de cómo le escribes. Lo guarda en `.orchestrator/me.json`, que es personal y no entra en git.

Después comprueba que puede abrir tus PR en Bitbucket con tus credenciales. Si no, te guía para crear un token de API con permisos de PR y guardarlo en tu entorno: `BITBUCKET_USER`, que es el email de tu cuenta Atlassian, no tu usuario de Bitbucket, y `BITBUCKET_TOKEN`. El token nunca se escribe en el chat ni en un fichero del repositorio. Si dices que no o no funciona, sigues trabajando igual: los PR se abren desde la web.

Luego va directa a tu trabajo: tus historias en curso y tus PR. Si el desarrollo aún no está abierto, te lo dice en una línea y te ofrece escribir historias.

Lo que se escribe en el repositorio (historias, reglas, commits) va siempre en español.

## Preparar un proyecto

Lo hacen los responsables técnicos: `.orchestrator.json`, la carpeta de historias, `CLAUDE.md`, las reglas de `docs/rules/`, el pipeline y el mapa de riesgo (qué es de riesgo en el proyecto y dónde vive en el código: la sesión lo propone con pruebas y el responsable lo aprueba; skill `orchestrate`, `references/risk-map.md`). Mientras ponen los cimientos, ya se pueden escribir historias. El desarrollo se abre para todos cuando `.orchestrator.json` tiene `roles`, sin que nadie tenga que instalar nada más.

## Requisitos

- Claude Code con soporte de plugins.
- Node.js 20 o posterior en el `PATH`. Lo usan la guardia y el validador. Sin Node la guardia no arranca y no puede avisar, así que lo comprueba Claude al empezar cada sesión (por eso está en el bloque de `CLAUDE.md`) y ofrece instalarlo; en Windows, con `winget install OpenJS.NodeJS.LTS`. Mientras falte, no hace commits ni push.
- Git y un repositorio en Bitbucket con Pipelines. Cada persona, un token de API de Bitbucket con permiso sobre los PR, en `BITBUCKET_USER` (el email de su cuenta Atlassian) y `BITBUCKET_TOKEN` de su entorno; la primera sesión la guía para crearlo. Sin él, abre y fusiona los PR desde la web.
- En el proyecto: `gotestsum` para el informe de los tests de Go, Vitest y un runner E2E con informe JUnit.

## Diferencias con el original

| Original | easyone-orchestrator |
|---|---|
| Un humano y una sesión que orquesta casi sin intervención | Una sesión por persona; el humano valida el primer criterio y la construcción terminada |
| Un `builder` que hace la historia entera | Ninguno por ahora: quién escribe el código está pendiente |
| `reviewer` después de cada builder | `reviewer` una vez al cerrar, solo si la historia tiene riesgo |
| Identificador por actividad (`ACC-002`) | Prefijo y número (`EO-123`); quién reparte los números está pendiente |
| Un comando de tests | Varias fuentes de tests (Go, Vitest, E2E); un criterio pasa si pasan todos sus tests |
| Una lista de tests bloqueados | Una lista por historia, `.orchestrator/locked/<ID>.txt` |
| — | Auditoría por muestreo al cerrar cada entrega (`auditor`) |
| Lecciones en `CLAUDE.md` | Reglas en `docs/rules/`, con ID y origen; cada cosa en un solo sitio |
| GitHub y `gh` | Bitbucket y Bitbucket Pipelines |
| El estado vive en `.orchestrator/state.md` | Cada sesión tiene su `state.md`, personal; lo compartido está en git |

## Versiones y actualizaciones

El número de `version` en `.claude-plugin/plugin.json` decide qué recibe el equipo: Claude Code deja a cada persona en la versión que instaló hasta que ese número cambia. Un cambio subido sin cambiar la versión no le llega a nadie.

Cada vez que un cambio tiene que llegar al equipo, en el mismo commit:

- **el número del medio** (`0.2.0` → `0.3.0`) cuando cambia cómo se trabaja;
- **el último** (`0.2.0` → `0.2.1`) cuando solo se arregla algo.

Cada persona lo actualiza con `claude plugin update easyone-orchestrator@hyliacom` y reinicia Claude Code.

El proyecto no guarda copia de `stories.mjs`. Las sesiones ejecutan el del plugin que tiene instalado cada persona (la guardia le dice a la sesión dónde está), y el pipeline de Bitbucket lo descarga en cada build de `raw.githubusercontent.com/SergioHyliacom/Orquestador/main/scripts`. Por eso un cambio en `scripts/` llega al pipeline de todos los proyectos en cuanto se sube a `main` en GitHub, sin esperar al número de versión; para fijar una versión, se cambia `main` por un commit en el pipeline del proyecto. Un proyecto instalado antes de la 0.10.0 todavía guarda la copia: un PR `chore/` la borra, quita `plugin` de `.orchestrator.json` si está y cambia en cada paso del pipeline la orden `node <carpeta de historias>/stories.mjs` por estas líneas y `node /tmp/orq/stories.mjs`:

```
- export ORQ=https://raw.githubusercontent.com/SergioHyliacom/Orquestador/main/scripts
- mkdir -p /tmp/orq && curl -fsSL "$ORQ/stories.mjs" -o /tmp/orq/stories.mjs
```

`jira-sync.mjs` ya no existe. Un pipeline que todavía lo descarga falla en cuanto este cambio llega a `main` en GitHub (`curl -f` da error con el 404): quita su descarga y su paso.

## Traer mejoras del original

En este repositorio local, `main` es una copia del original y la adaptación vive en la rama `easyone`. En GitHub (`SergioHyliacom/Orquestador`), `main` es la adaptación: se sube con `git push fork easyone:main`.

```
git fetch upstream
git switch main && git merge --ff-only upstream/main
git switch easyone && git merge main
```

Las skills y los agentes siguen en inglés, como en el original: los lee el modelo, y así se fusionan mejor las mejoras. Lo que el plugin escribe en el proyecto de EASY One va en español.

## Estado

- **Probado:** la guardia (escenarios simulados de cada rol; el cortocircuito de los builders, con `node --test "tests/*.test.mjs"`) y el validador con resultados de Go y Vitest. `claude plugin validate` pasa.
- **Sin probar todavía:** las skills y la instalación en el repositorio real de EASY One y el pipeline en Bitbucket. La primera historia sirve de piloto.

## Autores

Adaptación de Hyliacom con Claude (Claude Code, Opus 5.5) a partir del Orchestrator de Sydney y Claude. Licencia MIT; ver `LICENSE`.
