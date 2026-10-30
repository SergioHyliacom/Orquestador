# Producto: historias de usuario

Esta carpeta describe qué hace el producto, qué le falta y cuánto queda para la primera entrega.

- **Empieza por el mapa**, `map.md`. Lo genera tu sesión de Claude con `stories.mjs`, que viene en el plugin: muestra cada historia, su estado y el avance hacia la primera entrega. Nunca se sube a git. La etapa en la que está cada historia (diseño, contrato, desarrollo…) es su tarjeta de Jira.
- **Las historias** están en `stories/`, una por fichero.
- **Las decisiones**, de producto y de arquitectura, están en `decisions/`, desde DEC-001. Una decisión abierta bloquea las historias que la nombran.

## Niveles

| Nivel | Qué es |
|---|---|
| Actividad | Un paso del recorrido de la persona (`activities.json`) |
| Historia | Una capacidad que una persona nota |
| Criterio | Un comportamiento observable, comprobado de una sola forma |

## Estados

Nadie escribe un estado a mano. `stories.mjs` lo calcula a partir de los criterios y las decisiones.

Gana la primera fila que se cumple, de arriba abajo.

| Estado | Regla |
|---|---|
| ⛔ Descartada | La historia se abandonó. Conserva el motivo. |
| 🔒 Bloqueada | La historia depende de una decisión abierta. |
| ❌ Falla | Al menos un criterio falla. |
| ⬜ Pendiente | No hay ningún criterio construido. |
| 🟡 Parcial | Al menos un criterio está sin construir. |
| ⚠️ Sin verificar | Al menos un criterio está sin verificar. |
| ✅ Funciona | Todos los criterios están verificados. |

## Comandos

Los ejecuta tu sesión de Claude. El script es del plugin `easyone-orchestrator`: el proyecto no guarda copia, y el pipeline lo descarga del repositorio del plugin.

```
node <scripts>/stories.mjs              genera el mapa con los últimos resultados de los tests
node <scripts>/stories.mjs --tests      ejecuta los tests y después genera el mapa
node <scripts>/stories.mjs --check      además, falla si un criterio de la primera entrega falla
node <scripts>/stories.mjs --ready ID   comprueba que una historia está lista para construirse
node <scripts>/stories.mjs --pr ID      imprime la lista de comprobación del PR de una historia
```

## Reglas para quien cambie el producto

- Un cambio en lo que una persona puede hacer actualiza su historia en el mismo commit.
- Un fallo no es una historia nueva. Reabre la historia que rompe y marca ese criterio como `[falla: motivo]`.
- Una capacidad nueva necesita su historia antes de empezar el trabajo.
- Las plantillas están en `templates/`.
