# Metodología y adaptación del orquestador · EASY One

**Versión 2.1 · 2026-10-25.** Sustituye a la versión 1 (`propuesta.md`, sin fecha). Recoge lo decidido al llevar aquella propuesta al stack de EASY One y al plugin. La 2.1 añade dónde vive cada cosa y qué reglas se siguen (sección 8), que sustituye a lo que proponía la definición en su §18.3. Al final hay una lista de qué cambia respecto a la v1 y por qué.

Este documento define cómo trabaja el equipo de Hyliacom (diseño, backend y frontend) para desarrollar EASY One con Claude Code, y qué se ha cambiado del plugin *Orchestrator* para conseguirlo. El plugin adaptado se llama `easyone-orchestrator`. El esquema visual para el equipo está en [`esquema-orquestador.html`](esquema-orquestador.html).

Se trabaja por **historias verticales** y en **pareja con la IA**: la persona navega y el agente conduce. La validación se hace **por evidencias y fundamentos, no revisando el código línea por línea**. Queda prohibido el desarrollo dirigido por especificaciones masivas (SDD) y construir por capas a ciegas: toda historia entrega algo que una persona nota, desde la base de datos hasta la pantalla.

---

## 1. Filosofía: «cero fe, crea evidencia»

- **Auditoría de fundamentos y evidencias.** El equipo no revisa código línea por línea. Revisa los conceptos, los flujos, la arquitectura y las pruebas: tests en verde (Go, Vitest, E2E) y un contrato que se genera del propio código.
- **Inercia cultural de la arquitectura.** Al principio el esfuerzo va a las reglas, los contratos y las restricciones: los cimientos (sección 6). Una vez puestos, el repositorio, los tests y la guardia guían a la IA sin vigilar la sintaxis.
- **Cero fe.** Ningún agente da nada por terminado sin enseñar la salida del test: primero en rojo, luego en verde, y las comprobaciones de su lado.

## 2. Roles

| Rol | Quién | Qué hace |
|---|---|---|
| **Orquestador** | La sesión de Claude (Opus) de **cada persona** | Lee en Jira lo que le toca a su persona, prepara cada encargo, le enseña las pruebas, hace el commit tras su ok |
| **Agentes que programan** | `backend-builder` y `frontend-builder` (Sonnet) | Un encargo cada vez: el contrato, un criterio o la integración. Prueban, se paran e informan |
| **Desarrolladores** | Backend (Go) y frontend (TypeScript) | Navegan: acuerdan el contrato, validan cada paso, deciden |
| **Diseño** | Equipo de diseño, como product owners | Escribe las historias verticales con sus estados y hace la revisión visual. Las historias técnicas, sin pantalla, puede escribirlas un desarrollador |
| **Revisor** | `reviewer`, solo lectura | Revisa la historia completa al cerrarla, **solo si lleva etiqueta de riesgo** |
| **Investigador** | `researcher`, solo lectura | Resuelve dudas sin tocar nada |
| **Auditor** | `auditor`, solo lectura | Al cerrar cada entrega, revisa una muestra de historias buscando lo que los tests no ven |

`copywriter` y `designer` (del plugin original) quedan inactivos: solo actúan si el proyecto los configura.

## 3. Qué se ha cambiado del plugin

El plugin adaptado está en el fork local `Orquestador-EasyOne`, rama `easyone`.

### A. Agentes

1. **El `builder` genérico desaparece.** Lo sustituyen dos agentes, cada uno en su lado:
   - `backend-builder`: Go + PostgreSQL. Escribe el contrato (endpoints con sus tipos, sin implementar) o un criterio por encargo. Prueba contra PostgreSQL real y comprueba que una cuenta no ve los datos de otra.
   - `frontend-builder`: React (panel, sección de empleados) y **Hyliable** (su interfaz, su servicio Node del agente y la plantilla Astro). Construye contra el contrato con simulaciones generadas a partir de él. Nunca toca el contrato. En los tests nunca llama al modelo.
2. **El `reviewer` se mantiene, pero solo para riesgo.** Una revisión al cerrar la historia, si lleva etiqueta de riesgo (aislamiento entre cuentas, identidad, pagos, fiscal, datos personales, producción). Comprueba que los tests prueban de verdad cada criterio y que la historia se cumple. El humano sigue sin revisar líneas: el revisor audita las evidencias.

### B. El contrato vive en el repositorio

El contrato entre backend y frontend es el **OpenAPI que se genera desde Go**. De él salen el cliente TypeScript y las simulaciones de los tests. Lo acuerdan los dos desarrolladores y lo escribe el backend. Si cambia de forma que rompe al frontend, salta como error de tipos.

### C. Jira sincroniza a los departamentos

Una tarjeta por historia, en una de seis etapas (sección 4). **Las tarjetas las mueve Bitbucket Pipelines** con lo que hay en el repositorio, no las personas ni las sesiones. Al abrir Claude, cada sesión lee en Jira lo que le toca a su persona.

El estado compartido es Jira. El registro de cada sesión (`.orchestrator/state.md`) y quién es cada persona (`.orchestrator/me.json`) son personales y no entran en git.

### D. Historias

- El identificador de cada historia es **su clave de Jira** (`EO-123`): la misma en la tarjeta, el fichero, las ramas y los tests.
- Los tests llevan el criterio al principio del nombre: `t.Run("[EO-123.1] …")` en Go, `it("[EO-123.1] …")` en Vitest y E2E. Un criterio pasa solo si pasan **todos** sus tests, de los dos lados.
- El campo `operations` de la historia lista los endpoints que necesita. El validador comprueba que estén en el OpenAPI.

### E. La guardia

Además de lo que ya hacía el original (push forzado, `reset --hard`, commits en `main` o `develop`, `git add .`, tests bloqueados…):
- **Cada agente solo toca su lado.** Lo comprueba al editar y otra vez sobre el diff cuando el agente termina.
- **Cada agente pasa las comprobaciones de su lado** al terminar: Go en backend, TypeScript en frontend.
- **Cada mitad bloquea sus tests en su propia lista**, para que las dos mitades no choquen al juntarse.
- **Pide confirmación para cada push y cada merge en Bitbucket.**

### F. Bitbucket

Ramas, PR y pipeline en Bitbucket (sección 5).

## 4. Flujo de una historia

| Etapa en Jira | Le toca a | Qué pasa | Avanza cuando |
|---|---|---|---|
| **Diseño** | Diseño (un desarrollador si la historia no tiene pantalla) | Crea la tarjeta y escribe la historia en `design/EO-123`: reglas, estados de cada pantalla, diseños enlazados | El PR de la historia entra en `develop`. **Es la aprobación** |
| **Contrato** | Backend + frontend | Arranque: el lado que empieza crea `story/EO-123` y anota las mitades de la historia (`sides`) y los endpoints que usa (`operations`). **Solo si la historia cambia la API**, los dos la acuerdan y el agente de backend genera los endpoints sin implementar | Existe la rama de la historia y el OpenAPI tiene sus endpoints |
| **Desarrollo** | Las mitades de la historia, en paralelo | Cada lado trabaja en su mitad (`story/EO-123-back`, `-front`), **un criterio cada vez**. Al acabar, bloquea sus tests y junta su mitad | Todas las mitades de la historia están en `story/EO-123` |
| **Integración** | Frontend; backend si la historia no tiene pantalla | API real en lugar de simulaciones, E2E en verde, capturas por estado, marcadores. Sin pantalla, solo los marcadores | Todo pasa y algo espera a diseño. Si nada espera a diseño, la tarjeta se queda aquí hasta el merge |
| **Revisión visual** | Diseño; después el revisor si hay riesgo, y el merge | Solo historias con algo que mirar. Diseño compara capturas y app con su diseño: aprueba o pide ajustes en la misma historia (vuelve a Integración) | Las personas hacen el merge del PR a `develop` |
| **Hecha** | — | La historia está en `develop` con todos sus criterios verificados | — |

### No todas las historias tienen las dos mitades

La pregunta clave es: **¿cambia la forma de la API?** Es decir, sus endpoints, los campos que reciben o devuelven, o sus errores. Cambiar una regla o los datos guardados **no** es cambiar la API.

| Caso | Ejemplos | Contrato | Mitades (`sides`) |
|---|---|---|---|
| Cambia la API | Un endpoint nuevo, un campo nuevo o renombrado, un error nuevo | Se acuerda y lo escribe el backend, aunque ninguna pantalla lo use todavía | `[back, front]`, o `[back]` si ninguna pantalla lo usa todavía |
| Solo frontend | Usa la API tal como está: mostrar un dato que ya llega, un estado vacío, un ajuste de pantalla, el editor de Hyliable | Ninguno | `[front]` |
| Solo backend | Sin pantalla: una regla sobre los datos, una tarea periódica, el envío de correos, un importador, corregir datos guardados | Ninguno, salvo que cambie la API | `[back]` |

**Ejemplo, EO-140 · «Las facturas rectificativas usan su propia serie».** Cambia una regla, no la API, y no tiene pantalla:

1. **Diseño:** la escribe un desarrollador y se aprueba con su PR.
2. **Contrato:** arranque con `sides: [back]` y sin endpoints; pasa en minutos.
3. **Desarrollo:** solo la mitad `-back`, un criterio cada vez.
4. **Integración:** el backend junta su mitad y pone los marcadores. La tarjeta espera aquí el merge.
5. **Revisión visual:** no pasa. Como es fiscal, antes del merge revisa el `reviewer`.
6. **Hecha:** PR y merge.

Si la historia corrige datos ya guardados, eso es una migración: el agente se para antes de ejecutarla en una base de datos compartida, y la decide la persona.

Los desarrolladores lo deciden en el arranque, leyendo la historia. El pipeline espera a las mitades que diga la historia: si backend termina antes de que frontend empiece, la tarjeta sigue en Desarrollo.

### El bucle en pareja (un criterio)

1. La sesión prepara el encargo de **un solo criterio**.
2. El agente escribe el test y lo ve fallar por la razón correcta (**rojo**).
3. Escribe lo mínimo para que pase (**verde**) y ejecuta las comprobaciones de su lado.
4. Se para. La sesión te lo enseña en un máximo de 8 líneas: el criterio, qué comprueba el test, la salida en rojo y en verde, y los ficheros tocados. Sin código.
5. **Tú decides:** ok, refactor o cambio. Un refactor o un cambio vuelve al mismo agente, con los tests en verde.
6. Con el ok, la sesión hace el commit (ficheros por nombre, un commit por criterio).
7. Siguiente criterio cuando digas «sigue».

Si el agente se bloquea (por ejemplo, al contrato le falta algo), se para. Tu sesión lo lleva al otro lado con un comentario en la tarjeta, que tú apruebas. El agente nunca improvisa.

## 5. Git y Bitbucket

| Rama | Sale de | Para qué |
|---|---|---|
| `design/EO-123` | `develop` | La historia nueva, hasta que entra su PR |
| `story/EO-123` | `develop` | El arranque, el contrato si cambia la API, la integración, los marcadores y la revisión visual |
| `story/EO-123-back` / `-front` | `story/EO-123` | Las mitades que tenga la historia |

- Un commit por criterio, tras el ok, con los ficheros por nombre.
- Push y merge solo cuando la persona lo pide, y la guardia pide confirmación.
- Los PR van a `develop`: el de la historia nueva y el de la historia terminada. Las mitades se juntan directamente en `story/EO-123`.
- El pipeline verifica cada push y mueve la tarjeta, incluso si la verificación falla, para que la tarjeta refleje los fallos. Si Jira no responde, avisa sin poner la build en rojo.

## 6. Cómo arrancamos

El stack no sale de las historias: el esqueleto se monta antes, porque el propio flujo lo necesita. Las funcionalidades solo llegan a través de historias.

1. **Día uno.** Repositorio en Bitbucket, proyecto de Jira con sus 6 estados e **instalación, parte 1**: historias, Jira, git y pipeline mínimo; la definición en `docs/definicion.md`; `README.md` y `CLAUDE.md`; `docs/rules/` con la semilla de reglas, y los pendientes técnicos de la definición como decisiones abiertas (sección 8). Desde ese momento diseño escribe las historias de la entrega 1 (plataforma mínima), en paralelo con los cimientos.
2. **Cimientos (entrega 0 de la definición).** Los responsables técnicos, con Claude y la misma disciplina:
   - las pruebas técnicas pendientes que necesitan las primeras historias, que cierran sus decisiones;
   - el monorepo (Go, panel React, PostgreSQL);
   - un endpoint de juguete de punta a punta: Go → OpenAPI → cliente → panel → E2E;
   - las reglas que no se negocian: la cuenta se resuelve en el servidor, una base de datos por cuenta, límites entre módulos, linters;
   - las comprobaciones que pide la §12.1 de la definición: bloquear el SQL concatenado, gitleaks, govulncheck;
   - el generador de módulos y un módulo de referencia, que serán los patrones;
   - la CI en Bitbucket.

   **No** se hacen tablas de negocio, el módulo de identidad ni un CRUD genérico «por si acaso».
3. **Instalación, parte 2.** Mide comandos, contrato, rutas y tests. **Congela la definición** y escribe los patrones de cada lado. Sus comprobaciones son el criterio de salida de los cimientos.
4. **Primera historia, como piloto.** Pequeña, pero que pase por todas las piezas y todas las etapas. Lo que falle se corrige en el plugin antes de que entre todo el equipo.

## 7. Auditoría al cerrar cada entrega

**La IA no aprende de vosotros.** El modelo no se reentrena con vuestro trabajo y cada sesión empieza de cero. Lo que se acumula es lo que queda escrito en el repositorio: el código (cuyos patrones la IA copia, los buenos y los malos), las reglas de `docs/rules/`, los tests, la guardia y los linters. La inercia cultural de la sección 1 la lleva el repositorio, y hay que cuidarla a propósito.

Los tests prueban que cada historia hace lo que dice, no cómo está construido el código. Por eso cada entrega pasa una auditoría por muestreo.

**Cuándo y quién.** Al cerrar cada entrega, **empezando por los cimientos**, cuyos patrones son los que copiarán todas las historias. Nunca es automática: la pide una persona, normalmente un responsable técnico, y la sesión avisa cuando una entrega tiene todas sus historias funcionando y aún no tiene auditoría.

**Cómo funciona, y cómo se evita que el auditor se invente cosas:**

1. **Muestra con regla fija:** 5 historias por defecto, al menos una de cada lado, todas las que llevan riesgo y las de diffs más grandes. El auditor no elige qué mirar.
2. **Audita contra las reglas del equipo** (`docs/rules/`), no contra su gusto. Cada hallazgo cita el ID de la regla que rompe. Si no rompe ninguna regla escrita, va aparte como propuesta, marcada como opinión.
3. **Cada hallazgo trae su prueba:** el comando que lo demuestra. Antes de que nadie lo lea, el orquestador lo repite, y si no se reproduce se descarta como falso positivo.
4. **Se decide qué se convierte en regla.** Por orden de preferencia: una comprobación de la máquina (linter, test de arquitectura, paso de la CI); una regla en `docs/rules/`, si no hay comprobación posible; o un patrón, código de referencia que citan los encargos. Un fallo de comportamiento es un criterio que falla en su historia, no una regla.
5. **La regla demuestra que funciona:** falla sobre el código malo que la motivó y pasa cuando se corrige. Si no, no entra.
6. **Se registra** en `docs/audits/<entrega>.md`: cada hallazgo como aceptado, rechazado (con el motivo) o falso positivo, y el porcentaje de acierto. Lo rechazado no se vuelve a sacar.
7. **Las reglas aprenden:** lo aceptado que la máquina no puede comprobar entra como regla en `docs/rules/`; lo que ya comprueba la máquina pasa a «Comprobadas por la máquina». Si dos auditorías seguidas aciertan menos de la mitad, se revisan las reglas y el encargo antes de la siguiente.

**Pendiente de decidir: ¿la confirma una persona al final?** Con `audit.confirm: human`, una persona decide qué hallazgos se convierten en reglas. Con `auto`, el orquestador lo hace por su cuenta y abre el PR. En los dos casos las reglas entran por un PR que fusionan las personas, y lo crítico y lo que afecta a zonas de riesgo siempre lo ve una persona. Mientras no se decida (`pending`), la confirma una persona. Un criterio posible: empezar así y pasar a `auto` cuando el auditor lleve varias entregas con un acierto alto.

Así la revisión de código baja de verdad con el tiempo: no porque haya que fiarse más de la IA, sino porque cada error encontrado deja de poder repetirse. Lo que no baja nunca es «cero fe» ni la revisión de las zonas de riesgo.

## 8. Dónde vive cada cosa y qué reglas se siguen

Todo gira en torno al orquestador. El método está en el plugin (skill `orchestrate`, §11) y nunca se copia al proyecto; lo que es de EASY One vive en su repositorio. Sustituye a lo que proponía la definición en su §18.3: no hay `CONTRIBUTING.md`, `CODING_STANDARDS.md`, `docs/adr/` ni web de documentación.

### Principios

1. **Cada cosa tiene un solo sitio.** Lo demás enlaza; nunca copia.
2. **Lo que la máquina puede comprobar no se escribe en prosa.** Se convierte en un linter, un test de arquitectura o un paso del pipeline, y su mensaje de error cita el ID de la regla.
3. **Ninguna regla sin origen:** la arquitectura de la definición, una decisión, o un fallo real o una auditoría de este proyecto. Nada «por si acaso» ni copiado de otro repo.
4. **Lo compartido cambia por PR** (historias, decisiones, reglas, `CLAUDE.md`). Lo generado no se edita a mano. Lo personal no se sube.
5. **Jira no es documentación.** Muestra quién y cuándo; el qué está en git. Lo que se acuerda en un comentario de una tarjeta se escribe en la historia, el contrato o una decisión en el siguiente commit.

### En el repositorio de EASY One

| Qué | Dónde | Lo escribe | Lo mantiene al día |
|---|---|---|---|
| Qué hace el producto | `producto/stories/EO-123-….md` | Diseño; un desarrollador si no hay pantalla | `stories.mjs --check` y los tests por criterio |
| Estado de todo, bloqueos | `producto/map.md` | Se genera | El pipeline |
| Decisiones nuevas, de producto o de arquitectura | `producto/decisions/DEC-031-….md` en adelante (las D1–D30 siguen en la definición) | Quien figura en `decides`: dirección o el responsable técnico | El validador, que las enlaza a las historias que bloquean |
| Arquitectura de partida y D1–D30 | `docs/definicion.md` | Por PR hasta el cierre de la entrega 0; entonces se congela | Después, solo avisos de una línea que enlazan a la decisión que lo cambia |
| Contrato de la API | El OpenAPI generado desde Go | `backend-builder`, cuando los dos lados lo han acordado | `generateSpec` y el test de la costura |
| Cliente TS y simulaciones | `packages/api-client/` | Se genera | El test de la costura |
| Qué declara cada módulo | Su manifiesto en `modules/<id>/` | Backend | — |
| Reglas para todos | `docs/rules/comunes.md` | PR | La auditoría |
| Reglas y patrones de cada lado | `docs/rules/backend.md`, `docs/rules/frontend.md` | PR | La auditoría |
| Estilo de Go y TS | La configuración de los linters | Entrega 0 | `verify.all` |
| Auditorías | `docs/audits/<entrega>.md` | Orquestador y `auditor` | — |
| Qué es EASY One, mapa de carpetas, arrancar en local | `README.md` | PR | Los comandos tienen nombre en un único fichero de tareas, que usan el README y `.orchestrator.json` |
| Contexto de cada sesión | `CLAUDE.md`: importa `@README.md` y `@docs/rules/comunes.md`, apunta por tema a apartados de la definición y lleva el bloque del orquestador | Instalación y PR | La instalación comprueba que no queda ningún `{{` y que las rutas existen |
| Configuración del orquestador | `.orchestrator.json`, `.orchestrator/locked/` | La instalación y el cierre de cada mitad | La guardia |
| Ficheros personales | `.orchestrator/me.json`, `state.md`, `work/` | Cada persona | `.gitignore`: nunca se suben |

**Fuera del repositorio:** el método (skills, agentes, guardia, esta propuesta y el esquema), en el plugin; el README del proyecto lo enlaza. Jira, una tarjeta por historia, cuyas etapas mueve el pipeline. Hyliable, en su propio repositorio hasta que se migre. Los manuales para clientes y soporte quedan fuera de este sistema.

**Lo que desaparece:** `CONTRIBUTING.md`, `CODING_STANDARDS.md` y `docs/adr/`; la sección *Lessons* de `CLAUDE.md` (las lecciones son reglas); `docs/audits/checklist.md` (la lista del auditor son las reglas de `docs/rules/`); la web de Starlight y las páginas de código escritas por IA. Si algún día hace falta una web, será solo generada.

### ¿Dónde escribo esto?

Antes de escribir nada, estas preguntas, por orden. Vale la primera que encaje:

1. **¿Es algo que una persona nota?** Un criterio de su historia, nueva o existente.
2. **¿Es una elección entre opciones?** Una decisión.
3. **¿Es cómo se escribe el código?** Una comprobación; si la máquina no puede, una regla; si no, un patrón.
4. **¿Es cómo se instala o se arranca?** `README.md`.
5. **¿Nada de lo anterior?** No se escribe.

### La definición

`docs/definicion.md` es la arquitectura de partida. Se edita por PR hasta el cierre de la entrega 0; entonces la instalación (parte 2) la congela. Desde ahí, un cambio es una decisión que dice qué apartado cambia, y bajo ese apartado solo se añade un aviso de una línea que enlaza a la decisión. `CLAUDE.md` remite a sus apartados por tema: nunca se carga entera.

### Las reglas

**Tres niveles, de más fuerte a más débil:**
1. **Comprobación de la máquina:** un linter, un test de arquitectura o un paso del pipeline. Vive en su configuración, y su mensaje de error cita el ID de la regla.
2. **Regla escrita** en `docs/rules/`, solo cuando la máquina no puede comprobarla.
3. **Patrón:** código de referencia que los encargos citan en «Read first». Cada lado los lista en la sección *Patrones* de su fichero. El principal es el generador de módulos.

**Formato:** una línea por regla, con un ID que no se reutiliza nunca: qué, por qué y de dónde sale.

```
- **R-07** La cuenta sale de la sesión, el token o el `Host` validado, en un solo sitio; ningún handler la toma de la petición. — Se leerían datos de otra cuenta. — Definición §12.1.2.
```

Al final de cada fichero, *Comprobadas por la máquina*: una línea por regla que ya cubre una comprobación (`R-xx → .golangci.yml`). Los agentes no las leen: ya las comprueba la máquina.

**Quién las lee:** cada sesión, `comunes.md`, porque lo importa `CLAUDE.md`; cada builder, `comunes.md` y el fichero de su lado; el `reviewer`, las de los lados que toca el diff; el `auditor`, todas, porque son su lista.

**Ciclo de vida, siempre por PR:**
1. **Nace** de la arquitectura, de una decisión o de un fallo real. Se propone al cerrar un bloque de trabajo o en una auditoría.
2. **Pasa a la máquina** si una comprobación puede expresarla. Tiene que fallar sobre el código malo y pasar cuando se corrige; entonces la línea va a *Comprobadas por la máquina*.
3. **Se reescribe o se quita** si en dos auditorías seguidas solo da hallazgos rechazados.

Un comportamiento nunca es una regla: es un criterio de su historia.

**Ejemplo, la §12.1 de la definición:** lo que es comportamiento (argon2id, doble factor, cookies `__Host-`, límite de intentos, cotejo del importe en los pagos) son criterios de las historias de identidad y de pagos, con sus tests. Lo que pide a la CI (bloquear el SQL concatenado, gitleaks, govulncheck) se monta en la entrega 0 y entra directamente en *Comprobadas por la máquina*. Solo lo que queda son reglas escritas.

**Semilla del día uno.** Solo reglas con origen; el estilo es de los linters. La de rendimiento (consultas en bucle, índices) se quitó porque aún no tiene origen en este proyecto: volverá si aparece un fallo real. Los patrones de cada lado se escriben al cerrar la entrega 0.

*Comunes* (`docs/rules/comunes.md`):
- **R-01** Ningún dato personal ni credencial en logs, mensajes de error ni respuestas de la API. — Lo exige el RGPD, y un secreto en un log ya es público. — Definición §12.1.13.
- **R-02** Toda llamada a un modelo de IA pasa por el AI Gateway; ningún módulo ni servicio llama directamente a un proveedor, tampoco el servicio del agente de Hyliable. — Sin el gateway no hay medición, cuotas ni redacción de datos personales. — Definición §11.1.
- **R-03** Todo texto visible se escribe en castellano en el código, con el contenedor de su módulo declarado una vez por fichero. — Es lo que la CI extrae y traduce. — D23, definición §7.7.
- **R-04** Una sola forma de resolver cada problema recurrente: si ya hay un patrón, se usa; uno nuevo necesita una decisión. — La IA copia lo que encuentra, también el segundo patrón. — Método del orquestador.
- **R-05** Un test cuenta solo si una aserción observa el comportamiento de su criterio: ni solo una captura, ni «se llamó al mock», ni «no lanza error». — Un test en verde que no prueba nada. — Método del orquestador.
- **R-06** Una dependencia nueva entra solo si la nombra la historia o una decisión. — Licencias, mantenimiento y superficie de ataque. — Definición §12.1.16.

*Backend* (`docs/rules/backend.md`):
- **R-07** La cuenta sale de la sesión, el token o el `Host` validado, en un solo sitio; ningún handler la toma de la petición. — Se leerían datos de otra cuenta. — Definición §12.1.2.
- **R-08** Los datos de una cuenta se leen y escriben solo por la conexión a su BD; sin consultas cruzadas entre BDs. — Es el aislamiento físico entre cuentas. — D2, definición §9.3.
- **R-09** La autorización está centralizada y deniega por defecto: ningún endpoint sin política, y cada acceso por id comprueba la propiedad. — Un endpoint sin política queda abierto. — Definición §12.1.3.
- **R-10** Lo que la API expone de una cuenta tiene un test que prueba que otra cuenta no puede leerlo ni cambiarlo. — Aislamiento entre cuentas. — Definición §12.1.2.
- **R-11** Las migraciones son compatibles hacia atrás: expandir, desplegar, contraer. — Se aplican cuenta a cuenta, y conviven versiones. — Definición §9.3.
- **R-12** Los scripts y las tareas periódicas se lanzan solo por CLI o por la cola, nunca por HTTP. — Un endpoint de mantenimiento es una puerta abierta. — Definición §12.1.12.

*Frontend* (`docs/rules/frontend.md`):
- **R-13** A la API de Go solo se llega por el cliente generado; nunca con una petición escrita a mano. — Si el contrato cambia, el error de tipos lo avisa. — D6, el contrato.

### Cómo actuar en cada momento

| Momento | Qué se hace | Dónde queda |
|---|---|---|
| **Día uno** (instalación, parte 1) | La definición entra en el repositorio. Se crean `README.md`, `CLAUDE.md` y `docs/rules/` con la semilla. Los pendientes técnicos del §14 de la definición que afectan a la construcción se abren como decisiones: Huma u oapi-codegen, goose o Atlas, fosite o ZITADEL, el fichero de tareas… | `docs/`, `producto/decisions/` |
| **Entrega 0** | Las pruebas técnicas cierran decisiones. Se montan los linters, los tests de arquitectura, las comprobaciones de la §12.1, el generador de módulos y un módulo de referencia. La definición todavía se edita por PR | Decisiones, configuración, código |
| **Cierre de la entrega 0** (instalación, parte 2) | Se congela la definición, se escriben los patrones de cada lado y se auditan los cimientos | `docs/`, `docs/rules/`, `docs/audits/` |
| **Historia nueva** | Como siempre (sección 4) | `producto/stories/` y su tarjeta |
| **Aparece una elección que bloquea** | Se crea una decisión abierta y la historia la cita en `blocked_by`. Quien decide la cierra por PR. Si cambia la definición, se añade un aviso de una línea bajo el apartado afectado | `producto/decisions/` |
| **Arranque y contrato** | Como siempre. Lo acordado en Jira termina en el commit del contrato | El OpenAPI |
| **Se construye un criterio** | El builder lee las reglas comunes, las de su lado y los patrones del encargo | — |
| **Algo falla en el bucle o en la revisión** | Si es comportamiento, es un criterio que falla. Si puede repetirse, al cerrar se propone, por este orden, comprobación, regla o patrón | PR a `docs/rules/` o a la configuración |
| **Se cierra una entrega** | Auditoría contra `docs/rules/` (sección 7); lo que la máquina puede comprobar pasa a ella | `docs/audits/` |
| **Cambia algo ya hecho** | Se editan los criterios de su historia | La misma historia |
| **Alguien quiere documentar algo** | «¿Dónde escribo esto?». **Si no encaja en nada, no se escribe** | — |

## 9. Hyliable

Hyliable es el constructor de webs que usan el equipo de diseño de Hyliacom y los clientes. **Desarrollarlo** es trabajo del lado de frontend. **Usarlo** para hacer la web de un cliente es trabajo de producción y queda fuera de este flujo.

De momento Hyliable sigue en su propio repositorio, con su configuración actual (el orquestador original y sus 133 historias). Cuando todo esté definido se migrará al monorepo y a claves de Jira. La definición ya prevé integrarlo en la entrega 2.

## 10. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Repositorio | Bitbucket |
| Sincronización entre departamentos | Jira; las tarjetas las mueve el pipeline |
| Identificador de historia | La clave de Jira, en todas partes |
| Contrato | OpenAPI generado desde Go, en el repositorio. Se acuerda solo cuando la historia cambia la API |
| Mitades | Cada historia dice las suyas (`sides`): las dos, solo frontend o solo backend |
| Autor de la historia | Diseño; las historias sin pantalla puede escribirlas un desarrollador. La aprobación es siempre el PR |
| Auditoría | Por muestreo al cerrar cada entrega, con el agente `auditor`. **Pendiente:** si la confirma una persona al final |
| Agentes | `backend-builder` y `frontend-builder` con Sonnet; orquestador con Opus |
| Commits | Los hace el orquestador tras el ok de la persona |
| Revisor | Solo en historias con riesgo, una vez al cerrar |
| Hyliable | Lado de frontend; sigue en su repositorio hasta la migración |
| Instalación | En dos partes: historias el día uno; desarrollo al acabar los cimientos |
| Documentación | Cada cosa tiene un solo sitio (sección 8). Sin `CONTRIBUTING.md`, `CODING_STANDARDS.md`, `docs/adr/` ni web de documentación |
| Reglas | En `docs/rules/` (comunes, backend y frontend), con ID, porqué y origen; lo que la máquina puede comprobar pasa a ella. Semilla de 13 reglas. Sin sección de lecciones en `CLAUDE.md` |
| Definición | `docs/definicion.md`, editable por PR hasta el cierre de la entrega 0; entonces se congela y mandan las decisiones, desde `DEC-031` |

## 11. Qué cambia respecto a la versión 1

| Versión 1 | Versión 2 | Por qué |
|---|---|---|
| Contratos y memoria de arquitectura en un servidor MCP sobre PostgreSQL con `pgvector` | El contrato es el OpenAPI generado desde Go, en el repositorio. Jira lleva el estado compartido | En el stack de EASY One el contrato ya sale del código. Una copia en `pgvector` se desincronizaría, no viajaría con la rama, nadie la revisaría en un PR y no se podría usar en la CI. `pgvector` sirve para buscar por parecido; un contrato hay que leerlo exacto. Lo que de verdad hacía falta era saber a quién le toca cada historia, y eso lo da Jira |
| Desactivar el `reviewer` | Se mantiene solo para historias con riesgo | Los tests los escribe el mismo agente que escribe el código. En aislamiento entre cuentas, identidad, pagos o fiscal, un test en verde puede probar solo el caso fácil |
| El humano hace el `git commit` de cada paso | Lo hace el orquestador tras el ok | La decisión sigue siendo humana, pero así los ficheros van por nombre, el formato del mensaje es siempre el mismo y el bloqueo de tests entra en el mismo commit |
| `frontend-builder` para Astro y React | React y Hyliable | Las webs de los clientes se hacen con Hyliable; desarrollar Hyliable es trabajo de frontend |
| El orquestador decide la rama y despacha | Una sesión orquestadora por persona | Es un equipo: la coordinación entre lados pasa por Jira y por el contrato, no por una sola sesión |
| Cinco fases | Seis etapas, con la integración separada | La integración con la API real es un paso propio de frontend, antes de que diseño revise |
| Sin plan de arranque | Día uno, cimientos, instalación en dos partes, historia piloto | El flujo necesita un esqueleto que funcione antes de la primera historia |
| Las reglas y la configuración del método, en `CLAUDE.md` | Cada cosa en un solo sitio; las reglas en `docs/rules/`, con origen, y lo que puede comprobar la máquina, en la máquina | `CLAUDE.md` lo cargan todas las sesiones y todos los agentes, así que cada línea se paga muchas veces. Una regla que nadie hace cumplir se olvida, y dos sitios para lo mismo acaban diciendo cosas distintas |

## 12. Pendiente

- **Probar el acceso a Jira desde Claude Code** (servidor MCP de Atlassian o `acli`) y el pipeline con Jira real.
- **Elegir el generador del contrato:** Huma (código primero) u oapi-codegen (contrato primero). Es una de las pruebas técnicas de los cimientos; oapi-codegen encaja mejor con acordar el contrato antes de escribir código.
- **Subir el fork a Bitbucket**, para que cada miembro del equipo lo instale desde allí.
- **Hacer la historia piloto** y corregir el plugin con lo que salga.
- **Migrar Hyliable** al monorepo y a claves de Jira, cuando se decida.
- **Decidir quién cierra la auditoría de cada entrega:** una persona (`audit.confirm: human`) o el orquestador por su cuenta (`auto`). Mientras tanto la confirma una persona.
