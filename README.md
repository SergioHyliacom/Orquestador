# easyone-orchestrator

Plugin de Claude Code con el que Sergio desarrolla EASY One. Es una adaptación del [Orchestrator](https://github.com/sydneyhylia/Orchestrator) de Sydney y Claude.

- **Lo usa una sola persona.** Tu sesión de Claude (Opus) orquesta tu trabajo. Al empezar, y cada vez que le preguntas «¿qué me toca?» como te salga, te dice en qué punto estás y qué sigue, y te pregunta sí o no.
- **Las historias se escriben en gg-ez**, el tablero del equipo, con sus criterios de aceptación. Tú las construyes en EASY One.
- **Un criterio cada vez.** El agente `builder` escribe el test, lo ve fallar, lo hace pasar y se para; la sesión comprueba las pruebas y hace el commit. Tú das el ok en el primer criterio y en la construcción terminada.
- **Git guarda dónde está cada historia:** su rama, su lista de tests bloqueados y el mapa que genera el validador.
- **Una guardia** (un hook) impide lo peligroso: ningún agente hace commit, y cada uno escribe solo donde le toca.
- **Cada cosa tiene un solo sitio.** Está en la skill `orchestrate`, `references/where-things-live.md`.
- **Al cerrar cada entrega, una auditoría por muestreo** convierte cada error que puede repetirse en una comprobación de la máquina o, si no es posible, en una regla.

## Pendiente: el enlace con gg-ez

Hoy el servidor MCP de gg-ez solo devuelve el identificador, el título y la columna de cada tarea, y no puede escribir (guarda G-3). Para que el orquestador trabaje desde gg-ez faltan tres piezas, por este orden:

1. **Acordar cómo es una historia en gg-ez**, con el orquestador de Sydney, que es quien las sube.
2. **En gg-ez:** que el MCP devuelva una historia con sus criterios, y que pueda marcar el estado de la tarjeta y cada criterio cumplido. Lo segundo lleva su decisión sobre la guarda G-3.
3. **En el orquestador:** traer la historia a un fichero de `<storiesDir>/stories/` (generado, sin editarlo a mano; cada criterio conserva su marca si su texto no cambia) y devolver el progreso.

Hasta entonces, las sesiones lo dicen en vez de improvisar (skill `orchestrate`, §5): tú les das la historia.

## Contenido

| Ruta | Qué es |
|---|---|
| `agents/builder.md` | El único agente que escribe código: un criterio o una tarea por encargo, en todas las capas que toque (Go y PostgreSQL, React, Hyliable) |
| `agents/reviewer.md` | Revisión independiente al cerrar una historia, solo si lleva etiqueta de riesgo |
| `agents/auditor.md` | Auditoría por muestreo al cerrar cada entrega: lo que los tests no ven, convertido en reglas |
| `agents/researcher.md` | Investigación de solo lectura |
| `skills/orchestrate/` | El día a día de la sesión. Un núcleo corto (`SKILL.md`: el inicio, qué se comprueba antes de actuar, qué no se hace nunca, cuándo se te pregunta, el cierre y lo pendiente) y referencias que se leen solo cuando el trabajo las necesita (`references/`): desarrollo, encargos a los agentes, trabajo fuera de las historias, auditoría, mapa de riesgo, dónde vive cada cosa, git y Bitbucket, y acceso |
| `skills/que-hago/` | En qué punto estás y qué sigue: rama, historias, PR y bitácora. Claude la carga al empezar y cuando preguntas qué te toca |
| `skills/stories/` | Cómo es una historia, sus criterios y sus marcas |
| `scripts/` | El validador de historias (`stories.mjs`). El proyecto no guarda copia: la sesión ejecuta el del plugin |
| `hooks/guard.mjs` | La guardia |
| `tests/` | Los tests de la guardia y del validador: `node --test "tests/*.test.mjs"` |

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

La sesión comprueba que puede abrir tus PR en Bitbucket. Si no, te guía para crear un token de API con permisos de PR y guardarlo en tu entorno: `BITBUCKET_USER`, que es el email de tu cuenta Atlassian, no tu usuario de Bitbucket, y `BITBUCKET_TOKEN`. El token nunca se escribe en el chat ni en un fichero del repositorio. Sin él sigues trabajando igual: los PR se abren desde la web.

Lo que se escribe en el repositorio (historias, reglas, commits) va siempre en español.

## Preparar el proyecto

`.orchestrator.json`, la carpeta de historias, las reglas de `docs/rules/` y el mapa de riesgo (qué es de riesgo en el proyecto y dónde vive en el código: la sesión lo propone con pruebas y tú lo apruebas; skill `orchestrate`, `references/risk-map.md`). El desarrollo se abre cuando `.orchestrator.json` tiene `roles`, con las comprobaciones rápidas del builder en `roles.builder.onStop`.

## Requisitos

- Claude Code con soporte de plugins.
- Node.js 20 o posterior en el `PATH`. Lo usan la guardia y el validador. Sin Node la guardia no arranca y no puede avisar, así que lo comprueba Claude al empezar cada sesión y ofrece instalarlo; en Windows, con `winget install OpenJS.NodeJS.LTS`. Mientras falte, no hace commits ni push.
- Git y un repositorio en Bitbucket. Un token de API de Bitbucket con permiso sobre los PR, en `BITBUCKET_USER` y `BITBUCKET_TOKEN` de tu entorno. Sin él, abres y fusionas los PR desde la web.
- En el proyecto: `gotestsum` para el informe de los tests de Go, Vitest y un runner E2E con informe JUnit.

## Diferencias con el original

| Original | easyone-orchestrator |
|---|---|
| Un humano y una sesión que orquesta casi sin intervención | Un humano y su sesión; das el ok en el primer criterio y en la construcción terminada |
| Un `builder` que hace la historia entera | Un `builder` que hace un criterio por encargo |
| `reviewer` después de cada builder | `reviewer` una vez al cerrar, solo si la historia tiene riesgo |
| Las historias se escriben en el repositorio | Las historias se escriben en gg-ez (el enlace está pendiente) |
| Identificador por actividad (`ACC-002`) | El de la historia en gg-ez |
| Un comando de tests | Varias fuentes de tests (Go, Vitest, E2E); un criterio pasa si pasan todos sus tests |
| Una lista de tests bloqueados | Una lista por historia, `.orchestrator/locked/<ID>.txt` |
| — | Auditoría por muestreo al cerrar cada entrega (`auditor`) |
| Lecciones en `CLAUDE.md` | Reglas en `docs/rules/`, con ID y origen |
| GitHub y `gh` | Bitbucket |
| Fusiona el humano | Fusionas tú, después de que otra persona del equipo apruebe el PR |

## Versiones y actualizaciones

El número de `version` en `.claude-plugin/plugin.json` decide qué recibes: Claude Code te deja en la versión que instalaste hasta que ese número cambia. Un cambio subido sin cambiar la versión no te llega.

- **El número del medio** (`0.2.0` → `0.3.0`) cuando cambia cómo se trabaja.
- **El último** (`0.2.0` → `0.2.1`) cuando solo se arregla algo.

Se actualiza con `claude plugin update easyone-orchestrator@hyliacom` y reiniciando Claude Code.

`jira-sync.mjs` ya no existe desde la 0.18.0. Un pipeline que todavía lo descarga de `raw.githubusercontent.com/SergioHyliacom/Orquestador/main/scripts` falla (`curl -f` da error con el 404): quita su descarga y su paso.

## Traer mejoras del original

En este repositorio local, `main` es una copia del original y la adaptación vive en la rama `easyone`. En GitHub (`SergioHyliacom/Orquestador`), `main` es la adaptación: se sube con `git push fork easyone:main`.

```
git fetch upstream
git switch main && git merge --ff-only upstream/main
git switch easyone && git merge main
```

Las skills y los agentes siguen en inglés, como en el original: los lee el modelo, y así se fusionan mejor las mejoras. Lo que el plugin escribe en el proyecto de EASY One va en español.

## Estado

- **Probado:** la guardia (escenarios simulados de cada rol; el cortocircuito del builder, con `node --test "tests/*.test.mjs"`) y el validador con resultados de Go y Vitest. `claude plugin validate` pasa.
- **Sin probar todavía:** las skills y la instalación en el repositorio real de EASY One. La primera historia sirve de piloto.

## Autores

Adaptación de Hyliacom con Claude (Claude Code, Opus 5.5) a partir del Orchestrator de Sydney y Claude. Licencia MIT; ver `LICENSE`.
