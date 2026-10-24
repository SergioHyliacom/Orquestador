# Metodología y adaptación del orquestador · EASY One

**Versión 2 · 2026-10-24.** Sustituye a la versión 1 (`propuesta.md`, sin fecha). Recoge lo decidido al llevar aquella propuesta al stack de EASY One y al plugin. Al final hay una lista de qué cambia respecto a la v1 y por qué.

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

1. **Día uno.** Repositorio en Bitbucket, proyecto de Jira con sus 6 estados e **instalación, parte 1** (historias, Jira, git, pipeline mínimo). Desde ese momento diseño escribe las historias de la entrega 1 (plataforma mínima), en paralelo con los cimientos.
2. **Cimientos (entrega 0 de la definición).** Los responsables técnicos, con Claude y la misma disciplina:
   - las pruebas técnicas pendientes que necesitan las primeras historias;
   - el monorepo (Go, panel React, PostgreSQL);
   - un endpoint de juguete de punta a punta: Go → OpenAPI → cliente → panel → E2E;
   - las reglas que no se negocian: la cuenta se resuelve en el servidor, una base de datos por cuenta, límites entre módulos, linters;
   - la CI en Bitbucket.

   **No** se hacen tablas de negocio, el módulo de identidad ni un CRUD genérico «por si acaso».
3. **Instalación, parte 2.** Mide comandos, contrato, rutas y tests. Sus comprobaciones son el criterio de salida de los cimientos.
4. **Primera historia, como piloto.** Pequeña, pero que pase por todas las piezas y todas las etapas. Lo que falle se corrige en el plugin antes de que entre todo el equipo.

## 7. Auditoría al cerrar cada entrega

**La IA no aprende de vosotros.** El modelo no se reentrena con vuestro trabajo y cada sesión empieza de cero. Lo que se acumula es lo que queda escrito en el repositorio: el código (cuyos patrones la IA copia, los buenos y los malos), `CLAUDE.md`, los estándares, los tests, la guardia y los linters. La inercia cultural de la sección 1 la lleva el repositorio, y hay que cuidarla a propósito.

Los tests prueban que cada historia hace lo que dice, no cómo está construido el código. Por eso cada entrega pasa una auditoría por muestreo.

**Cuándo y quién.** Al cerrar cada entrega, **empezando por los cimientos**, cuyos patrones son los que copiarán todas las historias. Nunca es automática: la pide una persona, normalmente un responsable técnico, y la sesión avisa cuando una entrega tiene todas sus historias funcionando y aún no tiene auditoría.

**Cómo funciona, y cómo se evita que el auditor se invente cosas:**

1. **Muestra con regla fija:** 5 historias por defecto, al menos una de cada lado, todas las que llevan riesgo y las de diffs más grandes. El auditor no elige qué mirar.
2. **Audita contra la lista del equipo** (`docs/audits/checklist.md`), no contra su gusto. Cada hallazgo dice qué regla rompe. Si no rompe ninguna regla escrita, va aparte como propuesta, marcada como opinión.
3. **Cada hallazgo trae su prueba:** el comando que lo demuestra. Antes de que nadie lo lea, el orquestador lo repite, y si no se reproduce se descarta como falso positivo.
4. **Se decide qué se convierte en regla.** Por orden de preferencia: una comprobación de la máquina (linter, test de arquitectura, paso de la CI); una lección en `CLAUDE.md`, si no hay comprobación posible; o un fichero de ejemplo para los encargos. Un fallo de comportamiento es un criterio que falla en su historia, no una regla.
5. **La regla demuestra que funciona:** falla sobre el código malo que la motivó y pasa cuando se corrige. Si no, no entra.
6. **Se registra** en `docs/audits/<entrega>.md`: cada hallazgo como aceptado, rechazado (con el motivo) o falso positivo, y el porcentaje de acierto. Lo rechazado no se vuelve a sacar.
7. **La lista aprende:** lo aceptado que la máquina no puede comprobar entra en la lista; lo que ya comprueba la máquina sale de ella. Si dos auditorías seguidas aciertan menos de la mitad, se revisan la lista y el encargo antes de la siguiente.

**Pendiente de decidir: ¿la confirma una persona al final?** Con `audit.confirm: human`, una persona decide qué hallazgos se convierten en reglas. Con `auto`, el orquestador lo hace por su cuenta y abre el PR. En los dos casos las reglas entran por un PR que fusionan las personas, y lo crítico y lo que afecta a zonas de riesgo siempre lo ve una persona. Mientras no se decida (`pending`), la confirma una persona. Un criterio posible: empezar así y pasar a `auto` cuando el auditor lleve varias entregas con un acierto alto.

Así la revisión de código baja de verdad con el tiempo: no porque haya que fiarse más de la IA, sino porque cada error encontrado deja de poder repetirse. Lo que no baja nunca es «cero fe» ni la revisión de las zonas de riesgo.

## 8. Hyliable

Hyliable es el constructor de webs que usan el equipo de diseño de Hyliacom y los clientes. **Desarrollarlo** es trabajo del lado de frontend. **Usarlo** para hacer la web de un cliente es trabajo de producción y queda fuera de este flujo.

De momento Hyliable sigue en su propio repositorio, con su configuración actual (el orquestador original y sus 133 historias). Cuando todo esté definido se migrará al monorepo y a claves de Jira. La definición ya prevé integrarlo en la entrega 2.

## 9. Decisiones tomadas

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

## 10. Qué cambia respecto a la versión 1

| Versión 1 | Versión 2 | Por qué |
|---|---|---|
| Contratos y memoria de arquitectura en un servidor MCP sobre PostgreSQL con `pgvector` | El contrato es el OpenAPI generado desde Go, en el repositorio. Jira lleva el estado compartido | En el stack de EASY One el contrato ya sale del código. Una copia en `pgvector` se desincronizaría, no viajaría con la rama, nadie la revisaría en un PR y no se podría usar en la CI. `pgvector` sirve para buscar por parecido; un contrato hay que leerlo exacto. Lo que de verdad hacía falta era saber a quién le toca cada historia, y eso lo da Jira |
| Desactivar el `reviewer` | Se mantiene solo para historias con riesgo | Los tests los escribe el mismo agente que escribe el código. En aislamiento entre cuentas, identidad, pagos o fiscal, un test en verde puede probar solo el caso fácil |
| El humano hace el `git commit` de cada paso | Lo hace el orquestador tras el ok | La decisión sigue siendo humana, pero así los ficheros van por nombre, el formato del mensaje es siempre el mismo y el bloqueo de tests entra en el mismo commit |
| `frontend-builder` para Astro y React | React y Hyliable | Las webs de los clientes se hacen con Hyliable; desarrollar Hyliable es trabajo de frontend |
| El orquestador decide la rama y despacha | Una sesión orquestadora por persona | Es un equipo: la coordinación entre lados pasa por Jira y por el contrato, no por una sola sesión |
| Cinco fases | Seis etapas, con la integración separada | La integración con la API real es un paso propio de frontend, antes de que diseño revise |
| Sin plan de arranque | Día uno, cimientos, instalación en dos partes, historia piloto | El flujo necesita un esqueleto que funcione antes de la primera historia |

## 11. Pendiente

- **Probar el acceso a Jira desde Claude Code** (servidor MCP de Atlassian o `acli`) y el pipeline con Jira real.
- **Elegir el generador del contrato:** Huma (código primero) u oapi-codegen (contrato primero). Es una de las pruebas técnicas de los cimientos; oapi-codegen encaja mejor con acordar el contrato antes de escribir código.
- **Subir el fork a Bitbucket**, para que cada miembro del equipo lo instale desde allí.
- **Hacer la historia piloto** y corregir el plugin con lo que salga.
- **Migrar Hyliable** al monorepo y a claves de Jira, cuando se decida.
- **Decidir quién cierra la auditoría de cada entrega:** una persona (`audit.confirm: human`) o el orquestador por su cuenta (`auto`). Mientras tanto la confirma una persona.
