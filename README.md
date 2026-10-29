# easyone-orchestrator

Plugin de Claude Code con el que el equipo de Hyliacom desarrolla EASY One. Es una adaptación del [Orchestrator](https://github.com/sydneyhylia/Orchestrator) de Sydney y Claude.

Diseño, backend y frontend trabajan sobre las mismas historias de usuario:

- **Cada persona tiene su propia sesión de Claude (Opus)**, que orquesta su parte del trabajo. Al empezar, y cada vez que le preguntas «¿qué me toca?» como te salga, te dice en qué punto estás y qué sigue, y te pregunta sí o no. Nadie tiene que saberse el flujo ni recordar comandos.
- **Diseño escribe las historias con Claude**, a partir del diseño en Figma y con Mobbin como referencia: sus criterios, incluidos los estados de cada pantalla. Claude crea la tarjeta en Jira, con el título, la frase y los enlaces; los criterios viven solo en el fichero. Al final, diseño hace la revisión visual.
- **Backend y frontend acuerdan el contrato** (el OpenAPI generado desde Go) y desarrollan sus dos mitades en paralelo.
- **Cada desarrollador trabaja en pareja con su agente (Sonnet)**, un criterio cada vez. El agente escribe el test, lo ve fallar, lo hace pasar y se para; la sesión comprueba las pruebas y hace el commit. La persona da el ok en el primer criterio de cada mitad y en la mitad terminada.
- **Git guarda el qué; Jira muestra el quién y el cuándo.** Las tarjetas las mueve Bitbucket Pipelines a partir de lo que hay en el repositorio, y las asigna a quien le toca en cada etapa con los campos Backend y Frontend de la tarjeta.
- **Una guardia** (un hook) impide lo peligroso y mantiene a cada agente en su lado.
- **Cada cosa tiene un solo sitio.** El comportamiento, en las historias; las elecciones, en decisiones; el contrato, en el OpenAPI; cómo se escribe el código, en comprobaciones de la máquina y, cuando no es posible, en las reglas del proyecto (`docs/rules/`: comunes, backend y frontend). Si algo no encaja en ninguno, no se escribe. El método está en la skill `orchestrate`, §11.
- **Al cerrar cada entrega, una auditoría por muestreo** comprueba el código contra las reglas de `docs/rules/` y convierte cada error que puede repetirse en una comprobación de la máquina o, si no es posible, en una regla. Lo aprendido vive en el repositorio. Está pendiente decidir si la confirma una persona al final (`audit.confirm`).

**Para todo el equipo, la versión corta:** [`docs/resumido.html`](docs/resumido.html). **El detalle, para quienes llevan el proyecto:** [`docs/detallado.html`](docs/detallado.html). **El porqué de cada decisión:** [`docs/propuesta.md`](docs/propuesta.md).

## Contenido

| Ruta | Qué es |
|---|---|
| `agents/backend-builder.md` | Agente de backend (Go + PostgreSQL): el contrato, un criterio o una tarea fuera de las historias por encargo |
| `agents/frontend-builder.md` | Agente de frontend (React, Hyliable y la plantilla Astro): un criterio, la integración o una tarea fuera de las historias por encargo |
| `agents/reviewer.md` | Revisión independiente al cerrar una historia, solo si lleva etiqueta de riesgo |
| `agents/auditor.md` | Auditoría por muestreo al cerrar cada entrega: lo que los tests no ven, convertido en reglas |
| `agents/researcher.md` | Investigación de solo lectura |
| `agents/copywriter.md`, `agents/designer.md` | Del original. Inactivos salvo que `.orchestrator.json` los configure |
| `skills/orchestrate/` | El día a día de cada sesión: etapas, contrato, bucle en pareja, integración, merge, auditoría y dónde vive cada cosa (§11). Git y Bitbucket en `references/git.md` |
| `skills/que-hago/` | En qué punto está la persona y qué le toca: tarjetas, peticiones, rama, historias y PR. Claude la carga al empezar y cuando alguien pregunta qué le toca |
| `skills/stories/` | Cómo se escriben y mantienen las historias |
| `scripts/` | El validador de historias (`stories.mjs`) y la sincronización con Jira (`jira-sync.mjs`). El proyecto lleva una copia de cada uno, que es la que ejecuta el pipeline |
| `hooks/guard.mjs` | La guardia |
| `docs/` | El diagrama y la propuesta |
| `cimientos/` | Otro plugin, `easyone-cimientos`, solo para los responsables técnicos: prepara el proyecto y sigue los cimientos hasta que se abre el desarrollo. Ver [`cimientos/README.md`](cimientos/README.md) |

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

La primera persona que lo instala con `--scope project` deja el plugin activado en `.claude/settings.json`, y eso se sube con el resto del proyecto. Las demás, al hacer pull, lo tienen activado pero sin descargar: cada una ejecuta los dos comandos de arriba una sola vez. Si el repositorio del fork es privado, cada persona necesita acceso de lectura a él.

**Cada carpeta lo instala por su cuenta.** Otro clon del proyecto, aunque esté dentro de la misma carpeta, no hereda la instalación: ejecuta allí también los dos comandos. Si se te olvida, Claude te lo dice al abrir la sesión (lo pide `CLAUDE.md`) y no hace commits ni push hasta que esté instalado.

Para probar el plugin desde una copia en tu equipo, sin instalarlo: `claude --plugin-dir <ruta de esta carpeta>`.

Claude Code carga los plugins al arrancar. Después de instalar, abre una sesión nueva: hay que reiniciar el CLI, no basta con `/clear`.

**Si tienes instalado el orquestador original** (`orchestrator`), sus hooks también actuarían en el repositorio de EASY One. La instalación lo desactiva para ese proyecto en `.claude/settings.json`, que es un fichero compartido. Cada miembro del equipo necesita tener el plugin instalado.

**Los hooks de tus otros plugins también se ejecutan en el proyecto**, aunque no uses sus skills: un plugin con un hook después de cada edición que necesita una herramienta que no tienes (por ejemplo, Python) falla en cada edición. En tu primera sesión, Claude te dice qué plugins tienen hooks y te ofrece desactivarlos solo en este proyecto (`claude plugin disable <nombre> --scope local`).

## Tu primera sesión

La primera vez que abres Claude en el proyecto, tu sesión empieza preguntándote quién eres: tu nombre y si trabajas en diseño, backend o frontend. Tu cuenta de Jira la lee de Jira, y el idioma lo toma de cómo le escribes. Lo guarda en `.orchestrator/me.json`, que es personal y no entra en git.

Después comprueba que puede leer tus tarjetas de Jira y abrir tus PR en Bitbucket, cada uno con tus credenciales:

- **Jira:** si no responde, te ofrece instalar `acli`, la herramienta de Atlassian, y te pide que inicies sesión tú (`acli jira auth login --web`, que abre el navegador para que aceptes).
- **Bitbucket:** `acli` no sirve para Bitbucket, así que te guía para crear un token de API con permisos de PR y guardarlo en tu entorno: `BITBUCKET_USER`, que es el email de tu cuenta Atlassian, no tu usuario de Bitbucket, y `BITBUCKET_TOKEN`.

El token nunca se escribe en el chat ni en un fichero del repositorio. Si dices que no o no funciona, sigues trabajando igual: la sesión te pide la lista de tarjetas y los PR se abren desde la web.

Luego va directa a tu trabajo:

- **Diseño:** las historias que estás escribiendo, o qué diseño de Figma quieres convertir en historia.
- **Backend y frontend:** tus tarjetas y lo que espera de ti. Si el desarrollo aún no está abierto, te lo dice en una línea y te ofrece escribir historias sin pantalla.

Lo que se escribe en el repositorio (historias, reglas, commits, tarjetas) va siempre en español.

## Preparar un proyecto

Lo hacen los responsables técnicos con otro plugin, `easyone-cimientos`, que el resto del equipo no instala: [`cimientos/README.md`](cimientos/README.md). Mientras ponen los cimientos, diseño ya escribe historias. El desarrollo se abre para todos cuando terminan, sin que nadie tenga que instalar nada más.

## Requisitos

- Claude Code con soporte de plugins.
- Node.js 20 o posterior en el `PATH`, también en los equipos de diseño. Lo usan la guardia, el validador y la sincronización con Jira. Sin Node la guardia no arranca y no puede avisar, así que lo comprueba Claude al empezar cada sesión (por eso está en el bloque de `CLAUDE.md`) y ofrece instalarlo; en Windows, con `winget install OpenJS.NodeJS.LTS`. Mientras falte, no hace commits ni push.
- Git y un repositorio en Bitbucket con Pipelines. Cada persona, un token de API de Bitbucket con permiso sobre los PR, en `BITBUCKET_USER` (el email de su cuenta Atlassian) y `BITBUCKET_TOKEN` de su entorno; la primera sesión la guía para crearlo. Sin él, abre y fusiona los PR desde la web.
- Jira Cloud. Para que las sesiones lean la cola: el servidor MCP de Atlassian o `acli`; si no hay ninguno, la primera sesión ofrece instalar `acli` y guía el login. Sin ninguno de los dos, la sesión pide la lista a la persona.
- Para diseño: el conector de Figma en Claude, con acceso a los ficheros del proyecto, y Mobbin si el equipo lo usa. Su cuenta de Jira tiene que poder crear y editar tarjetas.
- En el proyecto: `gotestsum` para el informe de los tests de Go, Vitest y un runner E2E con informe JUnit.
- Opcional: [Orca](https://orca.dev). Sin él, los agentes funcionan como subagentes de Claude Code.

## Diferencias con el original

| Original | easyone-orchestrator |
|---|---|
| Un humano y una sesión que orquesta casi sin intervención | Una sesión por persona; el humano valida el primer criterio de cada mitad y la mitad terminada |
| Un `builder` que hace la historia entera | `backend-builder` y `frontend-builder`, un criterio por encargo, cada uno en su lado |
| `reviewer` después de cada builder | `reviewer` una vez al cerrar, solo si la historia tiene riesgo |
| Identificador por actividad (`ACC-002`) | Clave de Jira (`EO-123`) |
| Un comando de tests | Varias fuentes de tests (Go, Vitest, E2E); un criterio pasa si pasan todos sus tests |
| Una lista de tests bloqueados | Una lista por mitad de historia, para evitar conflictos |
| — | Auditoría por muestreo al cerrar cada entrega (`auditor`) |
| Lecciones en `CLAUDE.md` | Reglas en `docs/rules/`, con ID y origen; cada cosa en un solo sitio |
| GitHub y `gh` | Bitbucket y Bitbucket Pipelines |
| El estado vive en `.orchestrator/state.md` | Jira es el estado compartido; `state.md` es personal |

## Versiones y actualizaciones

El número de `version` en `.claude-plugin/plugin.json` decide qué recibe el equipo: Claude Code deja a cada persona en la versión que instaló hasta que ese número cambia. Un cambio subido sin cambiar la versión no le llega a nadie.

Cada vez que un cambio tiene que llegar al equipo, en el mismo commit:

- **el número del medio** (`0.2.0` → `0.3.0`) cuando cambia cómo se trabaja;
- **el último** (`0.2.0` → `0.2.1`) cuando solo se arregla algo.

Cada persona lo actualiza con `claude plugin update easyone-orchestrator@hyliacom` y reinicia Claude Code.

`easyone-cimientos` tiene su propia versión, en `cimientos/.claude-plugin/plugin.json`, con la misma regla. Sube la del plugin que cambia: un cambio en `scripts/` o en una plantilla de `skills/stories/templates/` es del plugin del equipo, aunque lo copie la instalación.

Las copias de `stories.mjs` y `jira-sync.mjs` que hay en el proyecto no se actualizan con el plugin. Al abrir la sesión, Claude avisa si son distintas de las del plugin y ofrece actualizarlas con un PR `chore/`.

## Traer mejoras del original

En este repositorio local, `main` es una copia del original y la adaptación vive en la rama `easyone`. En GitHub (`SergioHyliacom/Orquestador`), `main` es la adaptación: se sube con `git push fork easyone:main`.

```
git fetch upstream
git switch main && git merge --ff-only upstream/main
git switch easyone && git merge main
```

Las skills y los agentes siguen en inglés, como en el original: los lee el modelo, y así se fusionan mejor las mejoras. Lo que el plugin escribe en el proyecto de EASY One va en español.

## Estado

- **Probado:** la guardia (escenarios simulados de cada rol), el validador con resultados de Go y Vitest, y la sincronización con Jira de principio a fin contra un Jira simulado, también reabrir una historia hecha, descartar una y una build sin resultados de tests. `claude plugin validate` pasa.
- **Sin probar todavía:** las skills y la instalación en el repositorio real de EASY One, Jira real, el acceso a Jira desde Claude Code y el pipeline en Bitbucket. La primera historia sirve de piloto.

## Autores

Adaptación de Hyliacom con Claude (Claude Code, Opus 5.5) a partir del Orchestrator de Sydney y Claude. Licencia MIT; ver `LICENSE`.
