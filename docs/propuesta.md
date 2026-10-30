# Metodología y adaptación del orquestador · EASY One

**Versión 2.9 · 2026-10-30.** Sustituye a la versión 1 (`propuesta.md`, sin fecha). Recoge lo decidido al llevar aquella propuesta al stack de EASY One y al plugin. La 2.1 añade dónde vive cada cosa y qué reglas se siguen (sección 8). La 2.2 añade todas las ramas, las reglas de Bitbucket, cómo se fusiona cada PR y el trabajo fuera de las historias (sección 5), y qué pasa cuando una historia hecha se reabre o una historia se descarta (sección 4). La 2.3 añade «qué hago», los campos Backend y Frontend con el asignado automático, tu ok solo en el primer criterio de cada mitad y en la mitad terminada, y los PR que abre y fusiona la sesión (secciones 4 y 5). La 2.4 quita el documento de definición: el contexto de Claude es el código que se va construyendo, y todo lo del repositorio se escribe en español (secciones 6 y 8). La 2.5 separa los cimientos en otro plugin, `easyone-cimientos`, que solo instalan los responsables técnicos: el resto del equipo empieza diciendo quién es y se pone con las historias de su departamento (secciones 6 y 10). La 2.6 quita verificaciones repetidas del bucle en pareja: en cada criterio, solo el test y las comprobaciones rápidas de su lado; la verificación completa, una vez al cerrar la mitad (sección 4). La 2.7 cambia quién aprueba una historia: por defecto la revisa otra persona de diseño, su autor puede fusionarla sin esperar, y el arranque la devuelve a Diseño si un criterio no se puede construir (secciones 4 y 10). La 2.8 hace que a cada persona solo le llegue lo suyo: sin comentarios de estado, los avisos que solo cuentan un hecho salen sin pedir ok, y las comprobaciones de la máquina que salen de una auditoría o de un fallo se construyen y se fusionan solas, sin que nadie decida (secciones 4, 5 y 7). La 2.9 hace lo mismo con la puesta al día del proyecto cuando sale una versión nueva del plugin: la hace sola una sesión de desarrollo, y a diseño no le llega (sección 5). Al final hay una lista de qué cambia respecto a la v1 y por qué.

Este documento define cómo trabaja el equipo de Hyliacom (diseño, backend y frontend) para desarrollar EASY One con Claude Code, y qué se ha cambiado del plugin *Orchestrator* para conseguirlo. El plugin adaptado se llama `easyone-orchestrator`. El esquema visual para el equipo está en [`detallado.html`](detallado.html).

Se trabaja por **historias verticales** y en **pareja con la IA**: la persona navega y el agente conduce. La validación se hace **por evidencias y fundamentos, no revisando el código línea por línea**. Queda prohibido el desarrollo dirigido por especificaciones masivas (SDD) y construir por capas a ciegas: toda historia entrega algo que una persona nota, desde la base de datos hasta la pantalla.

---

## 1. Filosofía: «cero fe, crea evidencia»

- **Auditoría de fundamentos y evidencias.** El equipo no revisa código línea por línea. Revisa los conceptos, los flujos, la arquitectura y las pruebas: tests en verde (Go, Vitest, E2E) y un contrato que se genera del propio código.
- **Inercia cultural de la arquitectura.** Al principio el esfuerzo va a las reglas, los contratos y las restricciones: los cimientos (sección 6). Una vez puestos, el repositorio, los tests y la guardia guían a la IA sin vigilar la sintaxis.
- **Cero fe.** Ningún agente da nada por terminado sin enseñar la salida del test: primero en rojo, luego en verde, y las comprobaciones de su lado.

## 2. Roles

| Rol | Quién | Qué hace |
|---|---|---|
| **Orquestador** | La sesión de Claude (Opus) de **cada persona** | Le dice a su persona en qué punto está y qué le toca («qué hago»), prepara cada encargo, comprueba las pruebas, hace los commits y abre y fusiona los PR |
| **Agentes que programan** | `backend-builder` y `frontend-builder` (Sonnet) | Un encargo cada vez: el contrato, un criterio, la integración o una tarea fuera de las historias (un `fix/`, un `chore/`). Prueban, se paran e informan |
| **Desarrolladores** | Backend (Go) y frontend (TypeScript) | Navegan: acuerdan el contrato, validan el primer criterio de cada mitad y la mitad terminada, deciden |
| **Diseño** | Equipo de diseño, como product owners | Escribe con Claude las historias verticales a partir del diseño en Figma, con Mobbin como referencia, y hace la revisión visual. Claude crea la tarjeta en Jira. Las historias técnicas, sin pantalla, puede escribirlas un desarrollador |
| **Revisor** | `reviewer`, solo lectura | Revisa la historia completa al cerrarla, **solo si lleva etiqueta de riesgo** |
| **Investigador** | `researcher`, solo lectura | Resuelve dudas sin tocar nada |
| **Auditor** | `auditor`, solo lectura | Al cerrar cada entrega, revisa una muestra de historias buscando lo que los tests no ven |

`copywriter` y `designer` (del plugin original) quedan inactivos: solo actúan si el proyecto los configura.

## 3. Qué se ha cambiado del plugin

El plugin adaptado está en el fork local `Orquestador-EasyOne`, rama `easyone`.

### A. Agentes

1. **El `builder` genérico desaparece.** Lo sustituyen dos agentes, cada uno en su lado:
   - `backend-builder`: Go + PostgreSQL. Escribe el contrato (endpoints con sus tipos, sin implementar), un criterio o una tarea fuera de las historias por encargo. Prueba contra PostgreSQL real y comprueba que una cuenta no ve los datos de otra.
   - `frontend-builder`: React (panel, sección de empleados) y **Hyliable** (su interfaz, su servicio Node del agente y la plantilla Astro). Construye contra el contrato con simulaciones generadas a partir de él. Nunca toca el contrato. En los tests nunca llama al modelo.
2. **El `reviewer` se mantiene, pero solo para riesgo.** Una revisión al cerrar la historia, si lleva etiqueta de riesgo (aislamiento entre cuentas, identidad, pagos, fiscal, datos personales, producción). La etiqueta (`tags`) la pone quien escribe la historia, y un desarrollador la añade en el arranque si la historia toca una zona de riesgo que no lleva. Comprueba que los tests prueban de verdad cada criterio y que la historia se cumple. El humano sigue sin revisar líneas: el revisor audita las evidencias.

### B. El contrato vive en el repositorio

El contrato entre backend y frontend es el **OpenAPI que se genera desde Go**. De él salen el cliente TypeScript y las simulaciones de los tests. Lo acuerdan los dos desarrolladores y lo escribe el backend. Si cambia de forma que rompe al frontend, salta como error de tipos.

### C. Jira sincroniza a los departamentos

Una tarjeta por historia, en una de seis etapas o en «Descartada» (sección 4). **Las tarjetas las mueve Bitbucket Pipelines** con lo que hay en el repositorio, no las personas ni las sesiones; una tarjeta arrastrada a mano se corrige en el siguiente push. Cada tarjeta lleva dos campos de persona, **Backend** y **Frontend**, que rellena quien reparte el trabajo desde el backlog; la diseñadora es quien la crea. El pipeline asigna la tarjeta a quien le toca en cada etapa.

El estado compartido es Jira. El registro de cada sesión (`.orchestrator/state.md`) y quién es cada persona (`.orchestrator/me.json`) son personales y no entran en git.

### D. Historias

- El identificador de cada historia es **su clave de Jira** (`EO-123`): la misma en la tarjeta, el fichero, las ramas y los tests.
- Los tests llevan el criterio al principio del nombre: `t.Run("[EO-123.1] …")` en Go, `it("[EO-123.1] …")` en Vitest y E2E. Un criterio pasa solo si pasan **todos** sus tests, de los dos lados.
- El campo `operations` de la historia lista los endpoints que necesita. El validador comprueba que estén en el OpenAPI.

### E. La guardia

Además de lo que ya hacía el original (push forzado, `reset --hard`, commits en `main` o `develop`, `git add .`, tests bloqueados…):
- **Cada agente solo toca su lado.** Lo comprueba al editar y otra vez sobre el diff cuando el agente termina.
- **Cada agente pasa las comprobaciones de su lado** al terminar: Go en backend, TypeScript en frontend.
- **Cada mitad bloquea sus tests en su propia lista**, para que las dos mitades no choquen al juntarse. Los agentes no pueden tocar esas listas; tu sesión sí, para bloquear y desbloquear.
- **Pide confirmación para cada push y cada merge en Bitbucket.**
- **`main` y `develop` solo cambian por PR.** En local solo se actualizan con `git pull --ff-only`; cualquier otro merge, pull o rebase sobre ellas está bloqueado.
- **Los agentes de solo lectura solo leen**, también en git: no pueden borrar ramas ni tocar los remotos.

### F. Bitbucket

Ramas, PR y pipeline en Bitbucket (sección 5).

## 4. Flujo de una historia

| Etapa en Jira | Le toca a | Qué pasa | Avanza cuando |
|---|---|---|---|
| **Diseño** | Diseño (un desarrollador si la historia no tiene pantalla) | Claude lee el diseño en Figma y propone las historias; crea la tarjeta y escribe cada historia en `design/EO-123`: reglas, estados de cada pantalla, enlaces a Figma | El PR de la historia entra en `develop`. **Es la aprobación**, y la da al menos una persona distinta de quien la escribió |
| **Contrato** | La persona de Backend de la tarjeta (la de Frontend si no hay); los dos si cambia la API | Arranque: su sesión le propone el caso y, con su ok, crea `story/EO-123` y anota los lados de la historia (`sides`) y los endpoints que usa (`operations`). **Solo si la historia cambia la API**, backend propone el contrato por escrito en un comentario de la tarjeta, frontend responde sí, no o «hablamos» en su sesión, y el agente de backend genera los endpoints sin implementar | Existe la rama de la historia y el OpenAPI tiene sus endpoints |
| **Desarrollo** | Cada lado de la historia, en paralelo | Con los dos lados, cada uno en su mitad (`story/EO-123-back`, `-front`); con uno solo, directamente en `story/EO-123`. **Un criterio cada vez**, con tu ok en el primero y en la mitad terminada. Al acabar, bloquea sus tests y junta su mitad | Cada lado tiene su lista de bloqueo en `story/EO-123` |
| **Integración** | Frontend; backend si la historia no tiene pantalla | API real en lugar de simulaciones, E2E en verde, capturas por estado, marcadores. Si la E2E falla por la API, lo arregla el backend reabriendo su mitad. Sin pantalla, solo los marcadores. Lo que solo una persona puede comprobar y no es visual (un correo que llega, una llamada a un servicio real, lo que hace el agente de Hyliable con un prompt) lo comprueba ahora el desarrollador de su lado, y queda como `[manual fecha, nombre]` | Todo pasa y algo espera a diseño. Si nada espera a diseño, la tarjeta se queda aquí hasta el merge |
| **Revisión visual** | Diseño; después el lado que integra: el revisor si hay riesgo, y el merge | Solo historias con algo que mirar. Diseño compara capturas y app con su diseño: aprueba en su sesión, que cambia esos criterios a `[manual fecha, nombre]` y hace todo el git, o pide ajustes en la misma historia (vuelve a Integración). Cada ajuste va al lado al que le toca: la pantalla, a frontend; los datos, las reglas o los errores de la API, a backend | La sesión del lado que integra abre el PR a `develop` con un revisor distinto del autor y lo fusiona cuando está aprobado, con tu ok. Solo se abre cuando todos los criterios pasan o están comprobados por una persona |
| **Hecha** | — | La historia está en `develop` con todos sus criterios verificados | Si cambia o aparece un bug, se reabre la misma historia y vuelve a Integración (ver «Cuando algo vuelve atrás») |
| **Descartada** | — | La historia se descartó: entra en `develop` con `discarded: true` y su motivo, desde cualquier etapa | — |

**A quién le toca.** La tarjeta se asigna sola a quien le toca: a la diseñadora en Diseño y mientras algo espera a diseño; a la persona de Backend en Contrato (a la de Frontend si no hay); en Desarrollo, a la del lado que sigue abierto; a la del lado que integra en Integración y cuando diseño ya ha aprobado. Si coges una tarjeta que nadie te ha dado, tu sesión te pone en el campo de tu lado.

**A cada persona solo le llega lo que le toca hacer o juzgar.** Un comentario en la tarjeta existe solo cuando otra persona tiene que hacer algo, y la menciona; su «qué hago» se lo enseña lo primero. Hay dos clases:

- **Una decisión tuya** que la otra persona contesta: la propuesta de contrato o un cambio en él, una historia que se devuelve a diseño con sus preguntas, un recordatorio. Llevan tu ok sobre el texto.
- **Un hecho que la otra persona necesita** para hacer su parte: una E2E que falla por la API, qué criterios han cambiado, las capturas que esperan a diseño. Sale sin pedir ok, porque no decide nada, y la sesión te lo dice en una línea.

No hay comentarios de estado: el pipeline mueve y asigna la tarjeta, y Jira enseña la rama y el PR. Nada de comprobaciones, auditorías ni herramientas llega a una tarjeta. Cada comentario se escribe para el departamento que lo lee: a diseño, en términos de la historia, sus criterios y sus pantallas, nunca de tests, API ni código; a un desarrollador, el dato técnico exacto.

### Qué hago

Nadie tiene que saberse el flujo. Al abrir Claude, y cada vez que preguntas «¿qué me toca?», «¿por dónde voy?» o como te salga, tu sesión mira tus tarjetas, las peticiones que te han hecho, tu rama, tus historias y tus PR, y te dice en pocas líneas en qué punto estás: primero lo que tiene parado a otros, después lo tuyo, y lo que te recomienda hacer. Respondes sí o no. Es la skill `que-hago`: no hace falta ningún comando.

**Si pides algo que aún no toca**, por ejemplo programar una historia que sigue en Diseño, tu sesión no lo hace: te dice en qué punto está la historia, qué falta y qué va antes, y te lo ofrece. Si insistes, solo lo hace cuando saltarse el orden no rompe nada. Hay cosas que no hace nunca, aunque insistas: programar sin la historia aprobada, construir sin arranque, cambiar el contrato sin el sí del otro lado, abrir el PR final con criterios sin verificar y fusionar sin la aprobación de otra persona.

### Cómo nace una historia de diseño

La diseñadora trabaja con su sesión de Claude. **Figma es el único sitio del diseño**; Mobbin solo da referencias.

1. **Leer el diseño en Figma.** La diseñadora le pasa a su sesión el fichero o la página. Claude lo lee con el conector de Figma (pantallas, variantes, componentes, capturas) y propone la lista de historias: **una por cada cosa que una persona puede hacer, no una por pantalla**. Los estados dibujados (cargando, vacío, error) se convierten en criterios; los que faltan, los señala para que se dibujen.
2. **Contrastar con Mobbin.** Cómo resuelven ese flujo otras apps, para encontrar estados y casos de error que falten. Es referencia, no diseño: lo que se adopta se dibuja primero en Figma. Las referencias que se quedan van a una colección de Mobbin con el nombre de la historia, nunca al repositorio.
3. **La diseñadora confirma la lista:** qué historias salen, cómo se dividen y a qué actividad pertenece cada una.
4. **Claude crea la tarjeta en Jira**, con el ok de la diseñadora sobre el texto. La tarjeta lleva solo el título, la frase «Como… quiero… para…» y el enlace a Figma. **Nunca los criterios:** viven en el fichero. Su clave es el ID.
5. **Claude escribe la historia** en `design/EO-123`, con los enlaces a las pantallas de Figma en `screens`, y la pasa por `--ready` hasta que está lista.
6. **PR y aprobación.** Push y PR a `develop`, que Claude abre con un revisor distinto de ti (por defecto, otra persona de diseño; si no hay, la de Backend) y con el enlace al fichero de la historia en la tarjeta. Claude te pregunta si lo fusiona ya o esperas a la revisión: si ves la historia bien, puedes fusionarla sin esperar. Si esperas, tu «qué hago» te avisa cuando está aprobado.
7. **El arranque puede devolverla.** Antes de empezar, backend lee la historia. Si un criterio no se puede construir tal como está (ambiguo, contradictorio, le falta un estado o un error), escribe lo que falta en sus «Preguntas abiertas» y la tarjeta vuelve sola a Diseño, a ti. Respondes cambiando la historia y vaciando esa sección, y la tarjeta vuelve a Contrato.

Si después cambian el título o la frase, Claude actualiza la tarjeta con el ok de la diseñadora; nada más de la historia va a Jira. El enlace al fichero apunta a la rama de integración, así que funciona cuando el PR entra. Mientras tanto, si Bitbucket está conectado con Jira, la rama y el PR salen en la propia tarjeta, porque llevan la clave. La historia de un desarrollador sin pantalla se salta los pasos 1 a 3.

### No todas las historias tienen las dos mitades

La pregunta clave es: **¿cambia la forma de la API?** Es decir, sus endpoints, los campos que reciben o devuelven, o sus errores. Cambiar una regla o los datos guardados **no** es cambiar la API.

| Caso | Ejemplos | Contrato | Mitades (`sides`) |
|---|---|---|---|
| Cambia la API | Un endpoint nuevo, un campo nuevo o renombrado, un error nuevo | Se acuerda y lo escribe el backend, aunque ninguna pantalla lo use todavía | `[back, front]`, o `[back]` si ninguna pantalla lo usa todavía |
| Solo frontend | Usa la API tal como está: mostrar un dato que ya llega, un estado vacío, un ajuste de pantalla, el editor de Hyliable (cuando se migre al monorepo) | Ninguno | `[front]` |
| Solo backend | Sin pantalla: una regla sobre los datos, una tarea periódica, el envío de correos, un importador, corregir datos guardados | Ninguno, salvo que cambie la API | `[back]` |

**Ejemplo, EO-140 · «Las facturas rectificativas usan su propia serie».** Cambia una regla, no la API, y no tiene pantalla:

1. **Diseño:** la escribe un desarrollador; su PR lo revisa la persona de Backend, o lo fusiona su autor si la ve bien.
2. **Contrato:** arranque con `sides: [back]` y sin endpoints; pasa en minutos.
3. **Desarrollo:** sin rama de mitad: el backend trabaja directamente en `story/EO-140`, un criterio cada vez.
4. **Integración:** el backend bloquea sus tests y pone los marcadores. La tarjeta espera aquí el merge.
5. **Revisión visual:** no pasa. Como es fiscal, antes del merge revisa el `reviewer`.
6. **Hecha:** PR y merge.

Si la historia corrige datos ya guardados, eso es una migración: el agente se para antes de ejecutarla en una base de datos compartida, y la decide la persona.

Los desarrolladores lo deciden en el arranque, leyendo la historia. El pipeline espera a los lados que diga la historia: si backend termina antes de que frontend empiece, la tarjeta sigue en Desarrollo, asignada a frontend.

### El bucle en pareja (un criterio cada vez)

1. **Encargo.** La sesión prepara el encargo de **un solo criterio**.
2. **Rojo.** El agente escribe el test y lo ve fallar por la razón correcta. Si ya pasa porque un criterio anterior construyó ese comportamiento, lo informa como ya cumplido y no escribe código.
3. **Verde mínimo.** Escribe lo mínimo para que pase.
4. **Verificación.** Ejecuta las comprobaciones rápidas de su lado. La verificación completa del proyecto la pasa la sesión una vez, al cerrar la mitad, y después el pipeline en cada push.
5. **La sesión comprueba las pruebas:** que el nombre del test lleva el criterio, que el rojo falló por lo que dice el criterio y no por un error de compilación, que el verde y las comprobaciones pasan, y que solo ha tocado ficheros de su lado y de ese criterio. Si algo no cuadra, vuelve al agente.
6. **Commit.** La sesión hace el commit (ficheros por nombre, un commit por criterio) y sigue con el siguiente.

**Tu ok, solo dos veces por mitad:**
- **En el primer criterio**, donde se ve si el agente ha entendido el patrón. La sesión te lo enseña en un máximo de 8 líneas, sin código, y te hace una pregunta: «¿esta aserción comprueba lo que dice el criterio?». Respondes ok, refactor o cambio; un refactor o un cambio vuelve al mismo agente, con los tests en verde.
- **Con la mitad terminada:** una línea por criterio (su test y qué comprueba) y las capturas si hay pantalla. Con tu ok se cierra la mitad.

Entre medias la sesión sigue sola. Se para y te pregunta si el agente se bloquea o tiene dudas, si una comprobación falla dos veces, si el mismo fallo se repite tres veces, si hay que cambiar el contrato o si el paso siguiente no tiene vuelta atrás (una migración en una base compartida). Si prefieres dar el ok en cada criterio, díselo. El agente nunca improvisa: si se bloquea porque al contrato le falta algo, tu sesión lo lleva al otro lado en un comentario de la tarjeta que apruebas tú.

Los arreglos y las tareas fuera de las historias (`fix/`, `chore/`) siguen el mismo bucle: el encargo dice qué cambia y qué comandos lo demuestran, y si cambia algo que un test puede mostrar, primero va el test en rojo.

### Cuando algo vuelve atrás

Una mitad ya juntada puede tener que reabrirse: la E2E de la integración falla por la API, diseño pide un ajuste o el revisor encuentra algo. **Cada cambio va al lado al que le toca**, con la misma regla que al construir: lo que decide la API (los datos que devuelve, su orden, una regla, un mensaje de error, un límite) es de backend; lo que muestra la pantalla, de frontend; si toca a los dos, a los dos. El frontend nunca arregla código de backend, ni al revés.

1. Si es un ajuste de diseño, diseño cambia los criterios en la misma historia y los devuelve a «sin construir», para que un test antiguo no los dé por buenos. La tarjeta vuelve a Integración.
2. El lado al que le toca trae `story/EO-123` a su mitad, o la vuelve a crear desde ella si ya se borró (con un solo lado, trabaja en `story/EO-123`).
3. Su sesión desbloquea solo los tests de los criterios que cambian, en un commit propio (`EO-123: unlock back EO-123.3`).
4. Bucle en pareja sobre esos criterios. Si cambia la forma de la API, antes se acuerda el contrato.
5. Vuelve a bloquear los tests y junta otra vez su mitad.
6. Si hay pantalla, el frontend repite la integración (E2E y capturas), se ponen los marcadores y la historia vuelve a diseño.

**Si la historia ya está Hecha.** Si cambia lo que hace o aparece un bug, se reabre la misma historia; nunca se escribe una nueva encima. Un bug urgente en producción va primero por un hotfix (sección 5).

1. **Quién:** diseño, si cambia el comportamiento; si es un bug, el desarrollador del lado al que le toca.
2. **Se reabre:** crea otra vez `story/EO-123` desde `develop` y edita los criterios. Lo que cambia vuelve a «sin construir». El criterio que rompe el bug pasa a `[failing: qué falla]`, o se añade uno si ninguno cubría ese comportamiento. Commit (`EO-123: reopen EO-123.2`) y push: la tarjeta sale de Hecha y vuelve a Integración.
3. **Se arregla:** el lado al que le toca vuelve a crear su mitad desde `story/EO-123`. Si es un bug, el agente escribe primero un test que lo reproduce y lo ve fallar.
4. **Después, como siempre:** integración, revisión visual si hay algo que mirar, revisor si hay riesgo y PR.

### Descartar una historia

Es una decisión de producto. Quien la toma lo hace desde su sesión:

1. **Se descarta en `develop`.** Crea `design/EO-123` desde `develop`, pone `discarded: true` y el motivo, y abre el PR, que aprueba otra persona o fusiona su autor. Cuando entra, el pipeline mueve la tarjeta a **Descartada**, esté en la etapa que esté.
2. **Se borran sus ramas.** La rama de la historia y sus mitades nunca se fusionan, porque tienen trabajo sin terminar. Se borran después, y las listas de bloqueo que solo vivían en ellas, también.

Si la historia ya estaba hecha, su código, sus tests y sus listas de bloqueo siguen en `develop`: quitarlos es una tarea aparte, que desbloquea sus tests antes de borrarlos (sección 5).

## 5. Git y Bitbucket

### Ramas

| Rama | Para qué | Quién |
|---|---|---|
| `main` | Lo que está en producción. Solo recibe PR desde `develop` o desde un `hotfix/` | Nadie directamente |
| `develop` | Integración: aquí se juntan las historias y los arreglos terminados | Nadie directamente |
| `design/EO-123` | La historia nueva, reescribirla antes del arranque, o descartarla, esté en la etapa que esté. Sale de `develop` y vuelve a `develop` | Diseño, o quien escribe o descarta la historia |
| `story/EO-123` | La rama de la historia: el arranque, el contrato si cambia la API, la integración, los marcadores y la revisión visual. Sale de `develop` y vuelve a `develop`. Se crea otra vez para reabrir una historia hecha | La persona de Backend de la tarjeta en el arranque (la de Frontend si no hay); el propio lado si la historia tiene uno solo; el que integra; diseño en la revisión visual, sin tocar git, y quien reabre una historia hecha |
| `story/EO-123-back` / `-front` | Las mitades, solo si la historia tiene los dos lados. Salen de `story/EO-123` y vuelven a ella, sin PR. Se borran cuando la historia entra en `develop` | Backend / frontend |
| `fix/short-description` | Corrección no urgente de algo que no es comportamiento de una historia: la build, la configuración, un script. Sale de `develop` y vuelve a `develop` | El lado al que pertenecen los ficheros |
| `chore/short-description` | Trabajo que no es una historia: dependencias, herramientas, documentación. Sale de `develop` y vuelve a `develop` | El lado al que pertenecen los ficheros |
| `hotfix/short-description` | Arreglo urgente en producción. Sale de `main` y vuelve a `main`; después se lleva a `develop` | El lado al que le toca lo que falla |

Las ramas de las historias llevan la clave de Jira. Las demás van en inglés y en kebab-case, como el resto de identificadores: `fix/session-timeout`, `chore/upgrade-vite`. Cada rama se crea desde el remoto, para que salga de lo que de verdad hay: `git fetch` y `git switch -c <rama> origin/develop` (`origin/main` para un hotfix).

- Un fallo de comportamiento no es un `fix/`: reabre su historia (sección 4, «Cuando algo vuelve atrás»).
- Un commit por criterio, con los ficheros por nombre; tu ok va en el primero de cada mitad y en la mitad terminada.
- Push y merge solo cuando la persona lo pide, y la guardia pide confirmación.
- El pipeline verifica cada push y mueve la tarjeta, incluso si la verificación falla, para que la tarjeta refleje los fallos. Los tests van primero; si la build falla antes de ellos (al instalar las dependencias), la tarjeta se queda donde está. Si Jira no responde, avisa sin poner la build en rojo.

### Reglas en Bitbucket

- Ni `main` ni `develop` admiten push directo, borrado ni reescritura del historial: todo entra por PR.
- Para fusionar un PR hace falta:
  - al menos una aprobación de otra persona (Bitbucket no deja que el autor apruebe el suyo). Las excepciones son los PR de historia (`design/<ID>`), que su autor puede fusionar sin aprobación, y los PR de comprobación (`chore/check-`), que fusiona la sesión sola: sin Premium la comprobación solo avisa;
  - que no haya cambios pedidos;
  - que no queden tareas abiertas;
  - que el último build esté en verde (hasta la instalación, parte 2, el pipeline solo valida las historias, pero en todas las ramas, para que cada PR tenga build);
  - en `main`, además, que la rama de origen no vaya por detrás.
- A `develop` puede fusionar cualquiera; a `main`, solo las personas autorizadas en Bitbucket.
- La estrategia por defecto del repositorio es **Merge commit**.
- **Estas comprobaciones avisan, pero no bloquean**, porque el bloqueo es de Bitbucket Premium. La regla del equipo es que **no se fusiona un PR con una comprobación en rojo**. Claude tampoco lo hace: antes de fusionar comprueba que otra persona lo ha aprobado, que nadie ha pedido cambios y que el build está en verde.

### Cómo se fusiona cada PR

| PR | Estrategia | ¿Borrar la rama de origen? | Por qué |
|---|---|---|---|
| `design/EO-123` → `develop` | **Squash** | Sí | La historia entra en `develop` como un solo commit |
| `story/EO-123` → `develop` | **Merge commit** | Sí; después las mitades | Conserva un commit por criterio y los commits de bloqueo de tests: es el rastro de la historia. Con Squash quedaría todo en un solo commit |
| `fix/` o `chore/` → `develop` | **Squash** | Sí | Todo el PR entra en `develop` como un solo commit, con el formato de los commits |
| `develop` → `main` | **Fast forward** | No | `main` avanza hasta el mismo commit que `develop`, sin crear commits nuevos. Así las dos ramas quedan idénticas y `develop` nunca va por detrás de `main` |
| `hotfix/` → `main` | **Squash** | Sí | Igual que un arreglo, pero hacia `main` |
| `main` → `develop`, tras un hotfix | **Merge commit** | No | Mete en `develop` el commit del hotfix tal cual. Con Squash sería otro commit, `develop` seguiría «por detrás» de `main` y el siguiente Fast forward fallaría |
| `hotfix/…-develop` → `develop`, si lo anterior choca | **Merge commit** | Sí | Lo mismo, con los conflictos resueltos en una rama propia |

**Los PR los abre y los fusiona la sesión**, por la API de Bitbucket y con la estrategia de esta tabla, así que nadie tiene que elegirla. Cada persona tiene su token (`BITBUCKET_USER` y `BITBUCKET_TOKEN`, fuera del repositorio). La sesión pone de revisor a alguien distinto del autor (por defecto, la persona del otro lado); cuando el PR está aprobado, tu «qué hago» te lo dice y la sesión lo fusiona con tu ok. La estrategia por defecto del repositorio es Merge commit: si alguien fusiona a mano desde la web, como mucho sobra un commit de merge, pero nunca se pierde el rastro de una historia.

Las mitades no pasan por PR: cada lado junta la suya en `story/EO-123` con el ok de su persona. El pipeline sabe que un lado está cerrado por su lista de bloqueo en `story/EO-123`, no por la rama de la mitad. Por eso las mitades se borran cuando la historia entra en `develop` (lo hace la sesión), y si la historia se reabre, se vuelven a crear. La tarjeta pasa a Hecha cuando todos los criterios de la historia están verificados en `develop`, aunque su rama ya no exista. Si alguien arrastra una tarjeta a mano, el siguiente push la devuelve a la etapa que dice git.

En local, `develop` y `main` solo se actualizan con `git pull --ff-only`; la guardia bloquea cualquier otro merge, pull o rebase sobre ellas. Al empezar, la sesión hace `git fetch --prune` y te ofrece borrar las ramas locales cuyo remoto ya no existe.

### Trabajo fuera de las historias

**Arreglo o tarea (`fix/`, `chore/`).** Lo hace el lado al que pertenecen los ficheros, con su agente y el mismo bucle en pareja. El encargo es una tarea, no un criterio: dice qué cambia y qué comandos lo demuestran. Si cambia algo que un test puede mostrar, el agente escribe primero ese test y lo ve fallar. La sesión abre el PR a `develop` con un revisor y lo fusiona con Squash cuando está aprobado. No mueve ninguna tarjeta. Los ficheros de la raíz (el pipeline, el fichero de tareas, el lockfile, los linters) también son de un lado: la instalación los reparte.

**Comprobación (`chore/check-`).** Un PR que solo añade o endurece una comprobación de la máquina (una regla del linter, un test de arquitectura, un paso de la CI) que hace cumplir una regla que ya está en `docs/rules/`, junto con el arreglo del código que esa comprobación pilla. Sale de una auditoría o de un fallo real. No es trabajo de nadie ni lo decide nadie: la sesión del lado al que pertenece lo construye, demuestra que la comprobación falla sobre el código malo y pasa al corregirlo, lo sube y lo fusiona sola cuando el build está en verde, sin revisor y sin preguntar; la guardia deja pasar ese push y ese merge. Si crea o cambia una regla, toca una zona de riesgo, viene de un hallazgo crítico o necesitaría cambiar un test bloqueado, no es un PR de comprobación: va a la persona como cualquier tarea.

**Puesta al día con el plugin (`chore/plugin-<versión>`).** El proyecto guarda copias de dos scripts del plugin (`stories.mjs` y `jira-sync.mjs`, que ejecuta el pipeline) y unas líneas que escribe la instalación; `.orchestrator.json` → `plugin` dice con qué versión están al día. Cuando una sesión de desarrollo trae un plugin más nuevo, al cerrar su bloque de trabajo copia los scripts, añade las líneas que falten (la orden `setup`, la saca del pipeline), apunta la versión y lo fusiona sola con el build en verde. Es mantenimiento: no se lo dice a nadie, y si otra sesión ya lo está haciendo, no lo repite. Las sesiones de diseño no lo ven. Si el plugin de una persona es más viejo que el del proyecto, el proyecto no se toca: su sesión le dice que actualice el plugin. Lo que necesita un dato que solo saben los responsables técnicos se lo dice solo a ellos.

**Hotfix: urgencia en producción.**
1. `hotfix/short-description` desde `origin/main`.
2. Si rompe un criterio, se trabaja como al reabrir una mitad, pero en esta rama: se desbloquean solo los tests de ese criterio, el agente escribe primero un test que reproduce el fallo, lo arregla, y se vuelven a bloquear. Si hacen falta los dos lados, un agente detrás del otro en la misma rama. Nunca se sube un `[failing]`: el criterio vuelve a cumplirse al fusionar, así que la tarjeta sigue en Hecha.
3. PR a `main`, Squash. Lo aprueba otra persona y lo fusiona una persona autorizada.
4. Enseguida, la misma persona abre el PR de `main` a `develop`, con merge commit. Si hay conflictos, se crea `hotfix/short-description-develop` desde `develop`, se junta `origin/main`, se resuelve con el lado dueño de los ficheros y se abre ese PR, también con merge commit.

**Paso a producción (`develop` → `main`).** Cuando el equipo lo decide, normalmente al cerrar una entrega. Una persona autorizada abre el PR. Antes de fusionar, el último build de `develop` está en verde y todos los hotfix han vuelto a `develop`; si no, el Fast forward falla. Las historias que siguen en sus ramas no lo impiden: su código aún no está en `develop`. Lo aprueba otra persona y lo fusiona una persona autorizada, con Fast forward. Después se despliega como diga el `README.md`.

**Un fichero bloqueado que otro trabajo tiene que cambiar** (otra historia, una tarea que actualiza el runner de tests, un hotfix): tu sesión lo quita de la lista que lo bloquea, en un commit propio y con tu ok, y lo vuelve a bloquear en la misma rama al terminar. Los bloqueos no caducan: después del merge las listas siguen en `develop`. Y van por fichero: desbloquear un fichero de tests desbloquea todos los criterios que prueba.

## 6. Cómo arrancamos

El stack no sale de las historias: el esqueleto se monta antes, porque el propio flujo lo necesita. Las funcionalidades solo llegan a través de historias.

Todo esto lo llevan los **responsables técnicos** con otro plugin, `easyone-cimientos`, instalado solo en sus equipos (`--scope local`): la instalación y el estado de los cimientos. El resto del equipo instala únicamente `easyone-orchestrator` y no ve nada de los cimientos. Su primera sesión empieza preguntándoles quién son (nombre, y si trabajan en diseño, backend o frontend) y va directa a las historias de su departamento.

1. **Día uno.** Repositorio en Bitbucket, proyecto de Jira con sus 7 estados (las 6 etapas y «Descartada») e **instalación, parte 1**: historias, Jira con los campos Backend y Frontend, git, pipeline mínimo y el token de Bitbucket de cada persona; `README.md` y `CLAUDE.md`, y `docs/rules/` con la semilla de reglas (sección 8). Casi no pregunta nada: el idioma (español), `develop`, las etiquetas de riesgo y quién cierra cada decisión ya están fijados; lee de Jira el proyecto, los estados que faltan y los campos Backend y Frontend, y lo confirma todo en un solo mensaje. Desde ese momento diseño escribe las historias de la entrega 1 (plataforma mínima), en paralelo con los cimientos.
2. **Cimientos (entrega 0).** Los responsables técnicos, con Claude, fuera del flujo de historias: todavía no hay agentes que programan, bucle en pareja ni tarjetas, que llegan con la instalación, parte 2. Todo entra por PR desde ramas `chore/`, aprobado por otra persona:
   - las pruebas técnicas que necesitan las primeras historias; cada elección la abre el responsable técnico como decisión (desde `DEC-001`) y la cierra la prueba;
   - el monorepo (Go, panel React, PostgreSQL);
   - un endpoint de juguete de punta a punta: Go → OpenAPI → cliente → panel → E2E;
   - las reglas que no se negocian: la cuenta se resuelve en el servidor, una base de datos por cuenta, límites entre módulos, linters;
   - las comprobaciones de seguridad en la CI: bloquear el SQL concatenado, gitleaks, govulncheck;
   - el generador de módulos y un módulo de referencia, que serán los patrones;
   - el grafo de código (code-review-graph), con su configuración en el repositorio;
   - la CI en Bitbucket;
   - las decisiones grandes que dan forma al código, por escrito: de 5 a 10 ficheros `DEC` de media página con su porqué (una base de datos por cuenta, monolito modular, el OpenAPI generado desde Go, el gateway de IA…). El código enseña qué se eligió, pero no por qué. Claude solo lee cada una cuando el trabajo toca ese tema.

   **No** se hacen tablas de negocio, el módulo de identidad ni un CRUD genérico «por si acaso».

   Mientras duran los cimientos, a los responsables técnicos «¿qué me toca?» o «¿cómo van los cimientos?» les enseña su estado (skill `estado` de `easyone-cimientos`): cada pieza con ✅, ❌ o ⚠️ y su prueba, las decisiones abiertas y qué conviene cerrar primero. Es la misma lista que comprobará la parte 2, así que, cuando todo está en ✅, la sesión propone lanzarla. A los demás desarrolladores su sesión solo les dice que el desarrollo aún no está abierto y les ofrece escribir historias sin pantalla.
3. **Instalación, parte 2.** Mide comandos, contrato, rutas y tests. Comprueba que los agentes llegan al grafo de código y que sus hooks conviven con la guardia. Escribe los patrones de cada lado, que desde ese momento son el contexto de Claude. Sus comprobaciones son el criterio de salida de los cimientos, y la misma lista que enseña la skill `estado` mientras tanto. Cuando su PR se fusiona, el desarrollo queda abierto para todo el equipo sin instalar nada más; tras la auditoría de los cimientos, los responsables técnicos pueden desinstalar `easyone-cimientos`.
4. **Primera historia, como piloto.** Pequeña, pero que pase por todas las piezas y todas las etapas. Lo que falle se corrige en el plugin antes de que entre todo el equipo.

## 7. Auditoría al cerrar cada entrega

**La IA no aprende de vosotros.** El modelo no se reentrena con vuestro trabajo y cada sesión empieza de cero. Lo que se acumula es lo que queda escrito en el repositorio: el código (cuyos patrones la IA copia, los buenos y los malos), las reglas de `docs/rules/`, los tests, la guardia y los linters. La inercia cultural de la sección 1 la lleva el repositorio, y hay que cuidarla a propósito.

Los tests prueban que cada historia hace lo que dice, no cómo está construido el código. Por eso cada entrega pasa una auditoría por muestreo.

**Cuándo y quién.** Al cerrar cada entrega, **empezando por los cimientos**, cuyos patrones son los que copiarán todas las historias. Nunca es automática: la pide una persona, normalmente un responsable técnico, y la sesión avisa cuando una entrega tiene todas sus historias funcionando y aún no tiene auditoría.

**Cómo funciona, y cómo se evita que el auditor se invente cosas:**

1. **Muestra con regla fija:** 5 historias por defecto, al menos una de cada lado, todas las que llevan riesgo y las de diffs más grandes. El auditor no elige qué mirar.
2. **Audita contra las reglas del equipo** (`docs/rules/`), no contra su gusto. Cada hallazgo cita el ID de la regla que rompe. Si no rompe ninguna regla escrita, va aparte como propuesta, marcada como opinión.
3. **Cada hallazgo trae su prueba:** el comando que lo demuestra. Antes de que nadie lo lea, el orquestador lo repite, y si no se reproduce se descarta como falso positivo.
4. **Se decide qué se convierte en regla.** Por orden de preferencia: una comprobación de la máquina (linter, test de arquitectura, paso de la CI); una regla en `docs/rules/`, si no hay comprobación posible; o un patrón, código de referencia que citan los encargos. Un fallo de comportamiento es un criterio que falla en su historia, no una regla. **Las comprobaciones no las decide nadie:** si la prevención es una comprobación de la máquina que hace cumplir una regla ya escrita, la sesión que audita construye las de su lado como PR de comprobación (sección 5) y las fusiona sola. Las del otro lado quedan anotadas en `docs/audits/` como pendientes de ese lado (`Lado` y `Estado`), y las sesiones de ese lado las construyen solas al cerrar su siguiente bloque de trabajo, sin preguntar a nadie. Lo demás lo decide solo la persona que pidió la auditoría, nadie más: las propuestas (reglas que aún no existen), lo que tiene que ser una regla o un patrón porque ninguna comprobación lo expresa, lo crítico y lo que toca zonas de riesgo.
5. **La regla demuestra que funciona:** falla sobre el código malo que la motivó y pasa cuando se corrige. Si no, no entra.
6. **Se registra** en `docs/audits/<entrega>.md`: cada hallazgo como aceptado, rechazado (con el motivo) o falso positivo, y el porcentaje de acierto. Lo rechazado no se vuelve a sacar.
7. **Las reglas aprenden:** lo aceptado que la máquina no puede comprobar entra como regla en `docs/rules/`; lo que ya comprueba la máquina pasa a «Comprobadas por la máquina». Si dos auditorías seguidas aciertan menos de la mitad, se revisan las reglas y el encargo antes de la siguiente.

**Decidido (2026-10-30): nadie confirma las comprobaciones.** Una comprobación que demuestra que funciona no necesita que nadie la mire: si se equivoca, el build lo dice. Las reglas nuevas siguen entrando por un PR que aprueba otra persona, y lo crítico y lo que afecta a zonas de riesgo siempre lo ve la persona que pidió la auditoría. Ya no existe `audit.confirm`.

Así la revisión de código baja de verdad con el tiempo: no porque haya que fiarse más de la IA, sino porque cada error encontrado deja de poder repetirse. Lo que no baja nunca es «cero fe» ni la revisión de las zonas de riesgo.

## 8. Dónde vive cada cosa y qué reglas se siguen

Todo gira en torno al orquestador. El método está en el plugin (skill `orchestrate`, §11) y nunca se copia al proyecto; lo que es de EASY One vive en su repositorio. No hay `CONTRIBUTING.md`, `CODING_STANDARDS.md`, `docs/adr/` ni web de documentación.

### Principios

1. **Cada cosa tiene un solo sitio.** Lo demás enlaza; nunca copia.
2. **Lo que la máquina puede comprobar no se escribe en prosa.** Se convierte en un linter, un test de arquitectura o un paso del pipeline, y su mensaje de error cita el ID de la regla.
3. **Ninguna regla sin origen:** acordada por el equipo al arrancar, una decisión, o un fallo real o una auditoría de este proyecto. Nada «por si acaso» ni copiado de otro repo.
4. **Lo compartido cambia por PR** (historias, decisiones, reglas, `CLAUDE.md`). Lo generado no se edita a mano. Lo personal no se sube.
5. **Jira no es documentación.** Muestra quién y cuándo; el qué está en git. Lo que se acuerda en un comentario de una tarjeta se escribe en la historia, el contrato o una decisión en el siguiente commit.

### En el repositorio de EASY One

| Qué | Dónde | Lo escribe | Lo mantiene al día |
|---|---|---|---|
| Qué hace el producto | `producto/stories/EO-123-….md` | Diseño; un desarrollador si no hay pantalla | `stories.mjs --check` y los tests por criterio |
| Estado de todo, bloqueos | `producto/map.md`, en el equipo de cada uno; nunca se sube | Se genera con `node producto/stories.mjs` | El validador. La etapa de cada historia está en su tarjeta de Jira |
| El diseño: pantallas, estados, componentes | Figma, fuera del repositorio. La historia enlaza sus pantallas en `screens` | Diseño | La revisión visual compara lo construido con Figma |
| Referencias de otras apps | Colecciones de Mobbin con el nombre de la historia, fuera del repositorio | Diseño, con Claude | — (son referencia, no diseño) |
| Decisiones, de producto o de arquitectura | `producto/decisions/DEC-001-….md` en adelante; nacen cuando hacen falta | Quien figura en `decides`: dirección o el responsable técnico | El validador, que las enlaza a las historias que bloquean |
| Contrato de la API | El OpenAPI generado desde Go | `backend-builder`, cuando los dos lados lo han acordado | `generateSpec` y el test de la costura |
| Cliente TS y simulaciones | `packages/api-client/` | Se genera | El test de la costura |
| Qué declara cada módulo | Su manifiesto en `modules/<id>/` | Backend | — |
| Reglas para todos | `docs/rules/comunes.md` | PR | La auditoría |
| Reglas y patrones de cada lado | `docs/rules/backend.md`, `docs/rules/frontend.md` | PR | La auditoría |
| Estilo de Go y TS | La configuración de los linters | Entrega 0 | `verify.all` |
| Grafo de código (code-review-graph) | Su configuración, en el repositorio: servidor MCP en `.mcp.json` con el nombre `code-review-graph`, hooks, skills, versión fijada. El grafo, en el equipo de cada uno | Entrega 0; el grafo se genera | La instalación, parte 2: los agentes llegan a él y la guardia sigue funcionando. Nunca entra en git |
| Auditorías | `docs/audits/<entrega>.md` | Orquestador y `auditor` | — |
| Qué es EASY One, mapa de carpetas, arrancar en local | `README.md` | PR | Los comandos tienen nombre en un único fichero de tareas, que usan el README y `.orchestrator.json` |
| Contexto de cada sesión | `CLAUDE.md`: importa `@README.md` y `@docs/rules/comunes.md` y lleva el bloque del orquestador. El resto del contexto es el código | Instalación y PR | La instalación comprueba que no queda ningún `{{` y que las rutas existen |
| Configuración del orquestador | `.orchestrator.json`, `.orchestrator/locked/` | La instalación y el cierre de cada mitad | La guardia |
| Ficheros personales | `.orchestrator/me.json`, `state.md`, `work/` | Cada persona | `.gitignore`: nunca se suben |

**Fuera del repositorio:** el método (skills, agentes, guardia, esta propuesta y el esquema), en el plugin; el README del proyecto lo enlaza. Jira, una tarjeta por historia, cuyas etapas mueve el pipeline; lleva solo el título, la frase «Como… quiero… para…», el enlace a Figma y el enlace al fichero de la historia, nunca los criterios. Figma, el único sitio del diseño, y Mobbin, el de las referencias. Hyliable, en su propio repositorio hasta que se migre. Los manuales para clientes y soporte quedan fuera de este sistema.

**Lo que desaparece:** `CONTRIBUTING.md`, `CODING_STANDARDS.md` y `docs/adr/`; la sección *Lessons* de `CLAUDE.md` (las lecciones son reglas); `docs/audits/checklist.md` (la lista del auditor son las reglas de `docs/rules/`); la web de Starlight y las páginas de código escritas por IA. Si algún día hace falta una web, será solo generada.

### ¿Dónde escribo esto?

Antes de escribir nada, estas preguntas, por orden. Vale la primera que encaje:

1. **¿Es algo que una persona nota?** Un criterio de su historia, nueva o existente.
2. **¿Es una elección entre opciones?** Una decisión.
3. **¿Es cómo se escribe el código?** Una comprobación; si la máquina no puede, una regla; si no, un patrón.
4. **¿Es cómo se instala o se arranca?** `README.md`.
5. **¿Nada de lo anterior?** No se escribe.

### El contexto es el código

No hay documento de arquitectura en el repositorio. Claude aprende el proyecto de lo que se va construyendo: los patrones de cada lado (el módulo de referencia y el generador de módulos), el código que toca el trabajo, las reglas, las historias y las decisiones. Si el equipo guarda una definición o un documento de diseño para sí, queda fuera del repositorio y Claude no lo usa. Todo lo que hay en el repositorio (historias, reglas, commits, tarjetas) se escribe en español; cada persona habla con Claude en su idioma.

**Cuando un texto y el código se contradicen.** Un estudio de 2026 (Georgia Tech y Colorado Boulder, arXiv 2610.30571) vio que Claude Code y Codex siguen el `CLAUDE.md` viejo en 9 de cada 10 casos, aunque noten la contradicción. Por eso hay una regla escrita en `CLAUDE.md`, en la sesión y en los agentes. Si lo que choca con el código es una descripción de cómo se escribe (una convención, una librería, un comando, un patrón), manda el código: Claude sigue el código, enumera cada contradicción y te ofrece corregir el texto con un PR `chore/`. Si es una regla de `docs/rules/` o un criterio de una historia, manda la regla: Claude no copia el código, lo trata como un fallo y te lo dice.

### Las reglas

**Tres niveles, de más fuerte a más débil:**
1. **Comprobación de la máquina:** un linter, un test de arquitectura o un paso del pipeline. Vive en su configuración, y su mensaje de error cita el ID de la regla.
2. **Regla escrita** en `docs/rules/`, solo cuando la máquina no puede comprobarla.
3. **Patrón:** código de referencia que los encargos citan en «Read first». Cada lado los lista en la sección *Patrones* de su fichero. El principal es el generador de módulos.

**Formato:** una línea por regla, con un ID que no se reutiliza nunca: qué, por qué y de dónde sale.

```
- **R-07** La cuenta sale de la sesión, el token o el `Host` validado, en un solo sitio; ningún handler la toma de la petición. — Se leerían datos de otra cuenta. — Acordada al arrancar.
```

Al final de cada fichero, *Comprobadas por la máquina*: una línea por regla que ya cubre una comprobación (`R-xx → .golangci.yml`). Los agentes no las leen: ya las comprueba la máquina.

**Quién las lee:** cada sesión, `comunes.md`, porque lo importa `CLAUDE.md`; cada builder, `comunes.md` y el fichero de su lado; el `reviewer`, las de los lados que toca el diff; el `auditor`, todas, porque son su lista.

**Ciclo de vida, siempre por PR:**
1. **Nace** de lo acordado al arrancar, de una decisión o de un fallo real. Se propone al cerrar un bloque de trabajo o en una auditoría.
2. **Pasa a la máquina** si una comprobación puede expresarla. Tiene que fallar sobre el código malo y pasar cuando se corrige; entonces la línea va a *Comprobadas por la máquina*.
3. **Se reescribe o se quita** si en dos auditorías seguidas solo da hallazgos rechazados.

Un comportamiento nunca es una regla: es un criterio de su historia.

**Ejemplo, la seguridad:** lo que es comportamiento (argon2id, doble factor, cookies `__Host-`, límite de intentos, cotejo del importe en los pagos) son criterios de las historias de identidad y de pagos, con sus tests. Lo que se puede pedir a la CI (bloquear el SQL concatenado, gitleaks, govulncheck) se monta en la entrega 0 y entra directamente en *Comprobadas por la máquina*. Solo lo que queda son reglas escritas.

**Semilla del día uno.** Las acordó el equipo al arrancar, porque son lo que el código todavía no enseña en un repositorio vacío; con el tiempo cada una pasa a ser una comprobación de la máquina o se quita si en dos auditorías no aporta nada. Solo reglas con origen; el estilo es de los linters. La de rendimiento (consultas en bucle, índices) se quitó porque aún no tiene origen en este proyecto: volverá si aparece un fallo real. Los patrones de cada lado se escriben al cerrar la entrega 0.

*Comunes* (`docs/rules/comunes.md`):
- **R-01** Ningún dato personal ni credencial en logs, mensajes de error ni respuestas de la API. — Lo exige el RGPD, y un secreto en un log ya es público. — Acordada al arrancar.
- **R-02** Toda llamada a un modelo de IA pasa por el AI Gateway; ningún módulo ni servicio llama directamente a un proveedor, tampoco el servicio del agente de Hyliable. — Sin el gateway no hay medición, cuotas ni redacción de datos personales. — Acordada al arrancar.
- **R-03** Todo texto visible se escribe en castellano en el código, con el contenedor de su módulo declarado una vez por fichero. — Es lo que la CI extrae y traduce. — Acordada al arrancar.
- **R-04** Una sola forma de resolver cada problema recurrente: si ya hay un patrón, se usa; uno nuevo necesita una decisión. — La IA copia lo que encuentra, también el segundo patrón. — Método del orquestador.
- **R-05** Un test cuenta solo si una aserción observa el comportamiento de su criterio: ni solo una captura, ni «se llamó al mock», ni «no lanza error». — Un test en verde que no prueba nada. — Método del orquestador.
- **R-06** Una dependencia nueva entra solo si la nombra la historia o una decisión. — Licencias, mantenimiento y superficie de ataque. — Acordada al arrancar.

*Backend* (`docs/rules/backend.md`):
- **R-07** La cuenta sale de la sesión, el token o el `Host` validado, en un solo sitio; ningún handler la toma de la petición. — Se leerían datos de otra cuenta. — Acordada al arrancar.
- **R-08** Los datos de una cuenta se leen y escriben solo por la conexión a su BD; sin consultas cruzadas entre BDs. — Es el aislamiento físico entre cuentas. — Acordada al arrancar.
- **R-09** La autorización está centralizada y deniega por defecto: ningún endpoint sin política, y cada acceso por id comprueba la propiedad. — Un endpoint sin política queda abierto. — Acordada al arrancar.
- **R-10** Lo que la API expone de una cuenta tiene un test que prueba que otra cuenta no puede leerlo ni cambiarlo. — Aislamiento entre cuentas. — Acordada al arrancar.
- **R-11** Las migraciones son compatibles hacia atrás: expandir, desplegar, contraer. — Se aplican cuenta a cuenta, y conviven versiones. — Acordada al arrancar.
- **R-12** Los scripts y las tareas periódicas se lanzan solo por CLI o por la cola, nunca por HTTP. — Un endpoint de mantenimiento es una puerta abierta. — Acordada al arrancar.

*Frontend* (`docs/rules/frontend.md`):
- **R-13** A la API de Go solo se llega por el cliente generado; nunca con una petición escrita a mano. — Si el contrato cambia, el error de tipos lo avisa. — Acordada al arrancar.

### Cómo actuar en cada momento

| Momento | Qué se hace | Dónde queda |
|---|---|---|
| **Día uno** (instalación, parte 1) | Se crean `README.md`, `CLAUDE.md` y `docs/rules/` con la semilla. No se escribe ninguna decisión: nacen cuando hacen falta | `docs/rules/`, `README.md`, `CLAUDE.md` |
| **Entrega 0** | El responsable técnico abre como decisiones las elecciones que hay que probar (Huma u oapi-codegen, goose o Atlas, fosite o ZITADEL, el fichero de tareas…) y las pruebas técnicas las cierran. Se montan los linters, los tests de arquitectura, las comprobaciones de seguridad de la CI, el generador de módulos y un módulo de referencia | Decisiones, configuración, código |
| **Cierre de la entrega 0** (instalación, parte 2) | Se escriben los patrones de cada lado, que desde ahí son el contexto de Claude, y se auditan los cimientos | `docs/rules/`, `docs/audits/` |
| **Se reparte el trabajo** | Desde el backlog de Jira, quien reparte rellena Backend y Frontend en la tarjeta; el pipeline la asigna a quien le toca en cada etapa | La tarjeta |
| **Empiezas a trabajar, o no sabes qué toca** | Abre Claude o pregúntale «¿qué me toca?»: te dice en qué punto estás y qué sigue (sección 4) | — |
| **Historia nueva** | Como siempre (sección 4) | `producto/stories/` y su tarjeta |
| **Aparece una elección que bloquea** | Se crea una decisión abierta y la historia la cita en `blocked_by`. Quien decide la cierra por PR | `producto/decisions/` |
| **Arranque y contrato** | Lo hace la persona de Backend de la tarjeta. El contrato es una propuesta escrita en la tarjeta que frontend acepta o no; lo acordado termina en el commit del contrato | El OpenAPI |
| **Se construye un criterio** | El builder lee las reglas comunes, las de su lado y los patrones del encargo | — |
| **Algo falla en el bucle o en la revisión** | Si es comportamiento, es un criterio que falla. Si puede repetirse, al cerrar se propone, por este orden, comprobación, regla o patrón | PR a `docs/rules/` o a la configuración |
| **Se cierra una entrega** | Auditoría contra `docs/rules/` (sección 7); lo que la máquina puede comprobar pasa a ella | `docs/audits/` |
| **Cambia algo ya hecho, o aparece un bug** | Se reabre la misma historia: `story/EO-123` otra vez desde `develop`, los criterios que cambian a «sin construir» o el que falla a `[failing]`. La tarjeta vuelve a Integración (sección 4) | La misma historia |
| **Bug urgente en producción** | Hotfix desde `main`, y enseguida de `main` a `develop` (sección 5) | El código y los tests de su criterio |
| **Se descarta una historia** | `discarded: true` y el motivo, por PR desde `design/EO-123`. La tarjeta pasa a Descartada; sus ramas se borran sin fusionar (sección 4) | La misma historia |
| **Un arreglo o una tarea fuera de las historias** | `fix/` o `chore/`, con el agente del lado al que pertenecen los ficheros y el mismo bucle en pareja (sección 5) | El código y la configuración |
| **Paso a producción** | PR de `develop` a `main` con Fast forward, cuando el equipo lo decide (sección 5) | `main` |
| **Alguien quiere documentar algo** | «¿Dónde escribo esto?». **Si no encaja en nada, no se escribe** | — |

## 9. Hyliable

Hyliable es el constructor de webs que usan el equipo de diseño de Hyliacom y los clientes. **Desarrollarlo** es trabajo del lado de frontend. **Usarlo** para hacer la web de un cliente es trabajo de producción y queda fuera de este flujo.

De momento Hyliable sigue en su propio repositorio, con su configuración actual (el orquestador original y sus 133 historias). Cuando todo esté definido se migrará al monorepo y a claves de Jira; la previsión es integrarlo en la entrega 2.

## 10. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Repositorio | Bitbucket |
| Sincronización entre departamentos | Jira; las tarjetas las mueve el pipeline |
| Identificador de historia | La clave de Jira, en todas partes |
| Contrato | OpenAPI generado desde Go, en el repositorio. Se acuerda solo cuando la historia cambia la API |
| Mitades | Cada historia dice las suyas (`sides`): las dos, solo frontend o solo backend |
| Autor de la historia | Diseño; las historias sin pantalla puede escribirlas un desarrollador, de backend o de frontend |
| Aprobación de los PR | Todo PR de código a `develop` o a `main` lo aprueba al menos una persona distinta de quien lo crea, salvo los de comprobación (`chore/check-`), que fusiona la sesión sola; después lo fusiona la sesión del autor (a `main`, una persona autorizada). Bitbucket pide 1 aprobación y no deja que el autor apruebe el suyo, pero sin Premium solo avisa: la regla la cumple el equipo, y Claude la comprueba antes de fusionar |
| Aprobación de las historias | El PR `design/<ID>` lo revisa por defecto otra persona de diseño (si no hay, o la escribió un desarrollador, la de Backend). Su autor puede fusionarlo sin esperar si la ve bien. El arranque es la segunda lectura: si un criterio no se puede construir, lo escribe en «Preguntas abiertas» y la tarjeta vuelve a Diseño |
| Ramas y merges | `main` es producción y `develop`, integración. Ramas de historia con la clave de Jira; `fix/`, `chore/` y `hotfix/` para lo demás. Squash para diseño, arreglos, tareas y hotfix; merge commit para la rama de la historia y para llevar un hotfix a `develop`; fast forward de `develop` a `main`. Merge commit es la estrategia por defecto del repositorio. Las mitades solo existen con los dos lados y se borran al fusionar la historia (sección 5) |
| Qué hago | Al abrir Claude o al preguntar «¿qué me toca?», la sesión dice en qué punto estás y qué sigue (skill `que-hago`). Sin comandos |
| A quién le toca | Campos Backend y Frontend en la tarjeta, que rellena quien reparte desde el backlog; el pipeline asigna la tarjeta a quien le toca en cada etapa. Arranca la persona de Backend (la de Frontend si no hay) |
| Entre lados | Peticiones y contrato por escrito, en comentarios de la tarjeta que mencionan a la persona; su «qué hago» se lo enseña |
| Pull requests | Los abre y los fusiona la sesión por la API de Bitbucket, con revisor y la estrategia correcta; cada persona tiene su token |
| Revisión visual | Diseño responde en su sesión; la sesión hace todo el git |
| Historia hecha que cambia o falla | Se reabre la misma historia y su tarjeta vuelve a Integración. Nunca una historia nueva encima |
| Historias descartadas | Séptimo estado en Jira, «Descartada»; lo mueve el pipeline cuando el descarte entra en `develop` |
| Mapa de historias | `map.md` se genera en el equipo de cada uno y no se sube: en el repositorio, dos PR siempre chocarían en él |
| Comprobaciones que solo puede hacer una persona | Las visuales, diseño. Las demás (un correo, un servicio real, el agente de Hyliable), el desarrollador de su lado en la integración |
| Fuente del diseño | Figma. Mobbin, como referencia; lo que se adopta se dibuja en Figma |
| Tarjeta de Jira | La crea Claude con el ok de la diseñadora: título, frase y enlaces (Figma y, al abrir el PR, el fichero). Los criterios, solo en el fichero |
| Auditoría | Por muestreo al cerrar cada entrega, con el agente `auditor`. Las comprobaciones que salen de ella se construyen y se fusionan solas; las reglas nuevas, lo crítico y las zonas de riesgo, los decide quien pidió la auditoría |
| Agentes | `backend-builder` y `frontend-builder` con Sonnet; orquestador con Opus |
| Commits | Los hace el orquestador. La persona da el ok en el primer criterio de cada mitad y en la mitad terminada; entre medias la sesión comprueba las pruebas y sigue sola |
| Revisor | Solo en historias con riesgo, una vez al cerrar |
| Hyliable | Lado de frontend; sigue en su repositorio hasta la migración |
| Instalación | En dos partes: historias el día uno; desarrollo al acabar los cimientos. Las dos, y el estado de los cimientos, en `easyone-cimientos`, que solo instalan los responsables técnicos (`--scope local`) |
| Primera sesión | Pregunta quién eres: nombre y departamento (diseño, backend o frontend). La cuenta de Jira la lee de Jira y el idioma lo toma de cómo le escribes. Después, directa a tu trabajo |
| Documentación | Cada cosa tiene un solo sitio (sección 8). Sin `CONTRIBUTING.md`, `CODING_STANDARDS.md`, `docs/adr/` ni web de documentación |
| Reglas | En `docs/rules/` (comunes, backend y frontend), con ID, porqué y origen; lo que la máquina puede comprobar pasa a ella. Semilla de 13 reglas acordadas al arrancar. Sin sección de lecciones en `CLAUDE.md` |
| Contexto de Claude | Sin documento de definición en el repositorio: el contexto es el código (los patrones, el código que toca el trabajo), las reglas, las historias y las decisiones, desde `DEC-001`. Las decisiones nacen cuando hacen falta |
| Texto y código que se contradicen | Una descripción de cómo se escribe el código pierde frente al código: Claude sigue el código, enumera las contradicciones y propone corregir el texto. Una regla o un criterio gana: si el código lo rompe, es un fallo |
| Idioma | Todo lo del repositorio (historias, reglas, commits, tarjetas) en español. Cada persona habla con Claude en su idioma: el de su primera sesión, guardado en `me.json` |
| Origen de la semilla | Las 13 reglas: 11 acordadas al arrancar y 2 del método del orquestador |

## 11. Qué cambia respecto a la versión 1

| Versión 1 | Versión 2 | Por qué |
|---|---|---|
| Contratos y memoria de arquitectura en un servidor MCP sobre PostgreSQL con `pgvector` | El contrato es el OpenAPI generado desde Go, en el repositorio. Jira lleva el estado compartido | En el stack de EASY One el contrato ya sale del código. Una copia en `pgvector` se desincronizaría, no viajaría con la rama, nadie la revisaría en un PR y no se podría usar en la CI. `pgvector` sirve para buscar por parecido; un contrato hay que leerlo exacto. Lo que de verdad hacía falta era saber a quién le toca cada historia, y eso lo da Jira |
| Desactivar el `reviewer` | Se mantiene solo para historias con riesgo | Los tests los escribe el mismo agente que escribe el código. En aislamiento entre cuentas, identidad, pagos o fiscal, un test en verde puede probar solo el caso fácil |
| El humano hace el `git commit` de cada paso | Lo hace el orquestador; la persona da el ok en el primer criterio de cada mitad y en la mitad terminada | Así los ficheros van por nombre, el formato del mensaje es siempre el mismo y el bloqueo de tests va en su propio commit (`EO-123: lock back tests`), que es contra el que compara la guardia. Un ok en cada criterio acaba siendo un sí sin mirar: el control lo llevan las pruebas que comprueba la sesión, los tests bloqueados, la guardia y el revisor |
| `frontend-builder` para Astro y React | React y Hyliable | Las webs de los clientes se hacen con Hyliable; desarrollar Hyliable es trabajo de frontend |
| El orquestador decide la rama y despacha | Una sesión orquestadora por persona | Es un equipo: la coordinación entre lados pasa por Jira y por el contrato, no por una sola sesión |
| Cinco fases | Seis etapas, con la integración separada | La integración con la API real es un paso propio de frontend, antes de que diseño revise |
| Sin plan de arranque | Día uno, cimientos, instalación en dos partes, historia piloto | El flujo necesita un esqueleto que funcione antes de la primera historia |
| Un documento de definición como contexto de la IA | Sin documento de definición: el contexto es el código que se va construyendo, las reglas, las historias y las decisiones | Un documento muy grande como contexto mete ruido y, a la larga, hace que la IA alucine. Claude aprende de lo que de verdad hay: los patrones, el código y las reglas que salen de fallos reales |
| Las reglas y la configuración del método, en `CLAUDE.md` | Cada cosa en un solo sitio; las reglas en `docs/rules/`, con origen, y lo que puede comprobar la máquina, en la máquina | `CLAUDE.md` lo cargan todas las sesiones y todos los agentes, así que cada línea se paga muchas veces. Una regla que nadie hace cumplir se olvida, y dos sitios para lo mismo acaban diciendo cosas distintas |

## 12. Pendiente

- **Probar el acceso a Jira desde Claude Code** (servidor MCP de Atlassian o `acli`) y el pipeline con Jira real.
- **Elegir el generador del contrato:** Huma (el OpenAPI sale del código Go) u oapi-codegen (el OpenAPI se escribe y genera el código Go). La abre el responsable técnico como decisión en los cimientos y la cierra su prueba técnica. Si gana oapi-codegen, donde este documento dice «OpenAPI generado desde Go» pasa a ser «OpenAPI escrito por el backend», y la instalación, parte 2, mide ese comando en lugar de `generateSpec`.
- **Subir el fork a Bitbucket**, para que cada miembro del equipo lo instale desde allí.
- **Hacer la historia piloto** y corregir el plugin con lo que salga.
- **Al cerrar la entrega 0**, reducir «Cómo arrancamos» (sección 6 aquí y punto 6 del esquema) a una línea con la fecha de cierre y el enlace a la auditoría de los cimientos.
- **Migrar Hyliable** al monorepo y a claves de Jira, cuando se decida.
