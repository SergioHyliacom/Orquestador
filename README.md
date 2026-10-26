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

**Para todo el equipo, la versión corta:** [`docs/equipo.html`](docs/equipo.html). **El detalle, para quienes llevan el proyecto:** [`docs/esquema-orquestador.html`](docs/esquema-orquestador.html). **El porqué de cada decisión:** [`docs/propuesta.md`](docs/propuesta.md).

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
| `skills/install/` | Prepara un proyecto, en dos partes. Plantillas (también la semilla de reglas, en `assets/rules/`), validador (`stories.mjs`), sincronización con Jira (`jira-sync.mjs`) y pipeline |
| `hooks/guard.mjs` | La guardia |
| `docs/` | El diagrama y la propuesta |

## Instalar el plugin

El fork está de momento solo en local. Desde su carpeta:

```
claude plugin validate .
claude plugin marketplace add .
claude plugin install easyone-orchestrator@easyone-orchestrator-local
```

Para probarlo sin instalarlo: `claude --plugin-dir <ruta de esta carpeta>`.

Claude Code carga los plugins al arrancar. Después de instalar, abre una sesión nueva: hay que reiniciar el CLI, no basta con `/clear`.

**Si tienes instalado el orquestador original** (`orchestrator`), sus hooks también actuarían en el repositorio de EASY One. La instalación lo desactiva para ese proyecto en `.claude/settings.json`, que es un fichero compartido. Cada miembro del equipo necesita tener el plugin instalado.

## Preparar un proyecto

Abre el proyecto y ejecuta `/easyone-orchestrator:install`. La instalación tiene dos partes:

1. **Parte 1, historias (el día uno).** Carpeta de historias y validador, proyecto de Jira con sus 7 estados (las 6 etapas y «Descartada») y los campos de persona Backend y Frontend, ajustes de git y de Bitbucket y un pipeline mínimo. También la definición en `docs/definicion.md`, `README.md`, `CLAUDE.md`, `docs/rules/` con la semilla de reglas y los pendientes técnicos como decisiones abiertas. Con esto diseño ya puede escribir historias.
2. **Parte 2, desarrollo (al acabar los cimientos).** Se ejecuta cuando un endpoint de prueba va de Go al panel pasando por el OpenAPI y una prueba E2E, con PostgreSQL real. Mide los comandos de verificación, el contrato y sus generadores, las rutas y comprobaciones de cada lado y los informes de tests, y completa el pipeline. Congela la definición y escribe los patrones de cada lado.

La primera vez que cada persona abre Claude en el proyecto, su sesión le pregunta quién es y de qué lado trabaja (`.orchestrator/me.json`, que es personal y no entra en git).

**Variables del pipeline** (repositorio de Bitbucket, como variables protegidas): `JIRA_EMAIL` y `JIRA_API_TOKEN`. Ningún token se escribe en un fichero del repositorio.

**Flujo de Jira:** cada estado tiene que poder recibir tarjetas desde cualquier otro («allow all statuses to transition to this one»), porque el pipeline mueve las tarjetas en los dos sentidos: una historia reabierta sale de Hecha, y una descartada sale de cualquier etapa.

**Ajustes de Bitbucket** (los aplica una persona; la lista está en `skills/orchestrate/references/git.md`): `main` y `develop` sin push directo, sin borrado y sin reescritura; para fusionar, 1 aprobación, sin cambios pedidos, sin tareas abiertas y con el build en verde; a `main` solo fusionan las personas autorizadas; estrategia por defecto, Merge commit. Los PR los abre y los fusiona la sesión por la API, con la estrategia correcta para cada uno.

## Requisitos

- Claude Code con soporte de plugins.
- Node.js 20 o posterior en el `PATH`. Lo usan la guardia, el validador y la sincronización con Jira.
- Git y un repositorio en Bitbucket con Pipelines. Cada persona, un token de Bitbucket con permiso sobre los PR, en `BITBUCKET_USER` y `BITBUCKET_TOKEN` de su entorno. Sin él, abre y fusiona los PR desde la web.
- Jira Cloud. Para que las sesiones lean la cola: el servidor MCP de Atlassian o `acli`. Sin ninguno de los dos, la sesión pide la lista a la persona.
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

## Traer mejoras del original

`main` es una copia del original y la adaptación vive en la rama `easyone`:

```
git fetch upstream
git switch main && git merge --ff-only upstream/main
git switch easyone && git merge main
```

Las skills y los agentes siguen en inglés, como en el original: los lee el modelo, y así se fusionan mejor las mejoras. Cada proyecto escribe sus historias en su propio idioma.

## Estado

- **Probado:** la guardia (escenarios simulados de cada rol), el validador con resultados de Go y Vitest, y la sincronización con Jira de principio a fin contra un Jira simulado, también reabrir una historia hecha, descartar una y una build sin resultados de tests. `claude plugin validate` pasa.
- **Sin probar todavía:** las skills y la instalación en el repositorio real de EASY One, Jira real, el acceso a Jira desde Claude Code y el pipeline en Bitbucket. La primera historia sirve de piloto.

## Autores

Adaptación de Hyliacom con Claude (Claude Code, Opus 5.5) a partir del Orchestrator de Sydney y Claude. Licencia MIT; ver `LICENSE`.
