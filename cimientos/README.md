# easyone-cimientos

Plugin de Claude Code **solo para los responsables técnicos**. Sirve para preparar un proyecto para [`easyone-orchestrator`](../README.md) y para seguir los cimientos (la entrega 0) hasta que se abre el desarrollo. El resto del equipo no lo instala ni lo ve: su sesión empieza preguntando quién es y se pone con las historias de su departamento.

## Qué lleva

| Ruta | Qué es |
|---|---|
| `skills/install/` | `/easyone-cimientos:install`: prepara el proyecto en dos partes. Plantillas de `.orchestrator.json`, `CLAUDE.md`, la semilla de reglas (`assets/rules/`), la carpeta de historias (configuración, plantillas y README, ya en español) y el pipeline. No copia ningún script al proyecto: las sesiones ejecutan el validador (`stories.mjs`) y la sincronización con Jira (`jira-sync.mjs`) del plugin del equipo, y el pipeline los descarga de su repositorio en GitHub |
| `skills/estado/` | En qué punto están los cimientos: cada pieza con ✅, ❌ o ⚠️ y su prueba, las decisiones abiertas y qué cerrar primero. También la auditoría de los cimientos. Claude la carga cuando un responsable técnico pregunta cómo van los cimientos o qué le toca antes de que se abra el desarrollo |

## Instalar

En la carpeta del proyecto, después de instalar el plugin del equipo:

```
claude plugin marketplace add SergioHyliacom/Orquestador
claude plugin install easyone-orchestrator@hyliacom --scope project
claude plugin install easyone-cimientos@hyliacom --scope local
```

**Siempre con `--scope local`**: queda apuntado en tu `.claude/settings.local.json`, que no se sube, así que no le llega a nadie más al hacer pull. Con `--scope project` se activaría para todo el equipo.

Después, reinicia Claude Code.

Cuando se fusiona la parte 2 y está hecha la auditoría de los cimientos, ya no lo necesitas:

```
claude plugin uninstall easyone-cimientos@hyliacom --scope local
```

Se vuelve a instalar para volver a medir el proyecto, para migrar una carpeta de historias (por ejemplo, la de Hyliable) o para otro producto.

## Preparar un proyecto

Abre el proyecto y ejecuta `/easyone-cimientos:install`. La instalación tiene dos partes:

1. **Parte 1, historias (el día uno).** Mínima. Escribe `.orchestrator.json`, la carpeta de historias (su configuración, sus plantillas y su README ya vienen en español), `.gitignore`, `.claude/settings.json` con el plugin del equipo activado para todos, `docs/rules/` con la semilla de reglas, `README.md`, `CLAUDE.md` y un primer pipeline que solo valida las historias. Casi no pregunta: el idioma (español), `develop`, las etiquetas de riesgo y las entregas están fijados; lee de Jira el proyecto, sus 7 estados (las 6 etapas y «Descartada») y los campos de persona Backend y Frontend, dice qué falta y lo confirma en un solo mensaje. Solo comprueba que los scripts del plugin se ejecutan y que Jira responde. Los ajustes de Bitbucket los aplica una persona (abajo), y el acceso de cada persona a Jira y a Bitbucket lo guía su propia sesión la primera vez. No hay documento de definición: el contexto de Claude es el código que se va construyendo (los patrones, las reglas, las historias y las decisiones). Con esto diseño ya puede escribir historias.
2. **Cimientos (entrega 0).** Los responsables técnicos, con Claude, fuera del flujo de historias: por PR desde ramas `chore/`, sin agentes que programan ni tarjetas. Qué entra y qué no está en la skill `estado`. Para ver cómo van, pregunta «¿cómo van los cimientos?».
3. **Parte 2, desarrollo (al acabar los cimientos).** Se ejecuta cuando un endpoint de prueba va de Go al panel pasando por el OpenAPI y una prueba E2E, con PostgreSQL real. Mide los comandos de verificación, el contrato y sus generadores, las rutas y comprobaciones de cada lado y los informes de tests, y completa el pipeline. El grafo de código es opcional: si los cimientos lo montaron, comprueba que responde; si no, `CLAUDE.md` dice que no está. Escribe los patrones de cada lado, que desde ahí son el contexto de Claude. Cuando su PR se fusiona, el desarrollo queda abierto para todo el equipo, sin que nadie instale nada.

Mientras tanto, a los desarrolladores que no llevan los cimientos su sesión solo les dice que el desarrollo aún no está abierto y les ofrece escribir historias sin pantalla.

**Variables del pipeline** (repositorio de Bitbucket, como variables protegidas): `JIRA_EMAIL` y `JIRA_API_TOKEN`. Ningún token se escribe en un fichero del repositorio.

**Scripts del pipeline:** cada build descarga `stories.mjs` y `jira-sync.mjs` de `raw.githubusercontent.com/SergioHyliacom/Orquestador/main/scripts`. Para fijar una versión, cambia `main` por un commit de ese repositorio en `bitbucket-pipelines.yml`.

**Un proyecto instalado antes de la 0.10.0 de `easyone-orchestrator`** guarda copias de `stories.mjs` y `jira-sync.mjs` en su carpeta de historias. En un solo PR `chore/`: se borran las dos copias, el pipeline pasa a las líneas que las descargan y se quita `plugin` de `.orchestrator.json` si está.

**Flujo de Jira:** cada estado tiene que poder recibir tarjetas desde cualquier otro («allow all statuses to transition to this one»), porque el pipeline mueve las tarjetas en los dos sentidos: una historia reabierta sale de Hecha, y una descartada sale de cualquier etapa.

**Ajustes de Bitbucket** (los aplica una persona; la lista está en `skills/orchestrate/references/git.md` del plugin del equipo): `main` y `develop` sin push directo, sin borrado y sin reescritura; para fusionar, 1 aprobación, sin cambios pedidos, sin tareas abiertas y con el build en verde (sin Premium solo avisa, y así el autor de una historia puede fusionar su PR `design/<ID>` sin aprobación); a `main` solo fusionan las personas autorizadas; estrategia por defecto, Merge commit. Los PR los abre y los fusiona la sesión por la API, con la estrategia correcta para cada uno.

## Versiones

Tiene su propia versión, en `cimientos/.claude-plugin/plugin.json`, con la misma regla que el plugin del equipo: el número del medio cuando cambia cómo se trabaja y el último cuando solo se arregla algo. Se actualiza con `claude plugin update easyone-cimientos@hyliacom`.
