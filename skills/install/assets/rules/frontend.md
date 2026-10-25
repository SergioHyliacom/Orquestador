# Reglas del frontend

Las lee el `frontend-builder` en cada encargo, junto con las comunes; también el `reviewer` cuando el diff toca el frontend, y el `auditor`. Cada regla dice qué, por qué y de dónde sale. Cambian por PR (skill `orchestrate`, §11).

- **R-13** A la API de Go solo se llega por el cliente generado; nunca con una petición escrita a mano. — Si el contrato cambia, el error de tipos lo avisa. — D6, el contrato.

## Patrones

_(se escriben al cerrar la entrega 0, a partir del código de los cimientos)_

## Comprobadas por la máquina

_(ninguna todavía: las primeras llegan con la entrega 0)_
