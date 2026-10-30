# Reglas comunes

Las lee cada sesión, porque las importa `CLAUDE.md`, y cada agente. Cada regla dice qué, por qué y de dónde sale. Lo que ya comprueba la máquina no se lee aquí: está en *Comprobadas por la máquina*. Cambian por PR (skill `orchestrate`, `references/where-things-live.md`).

- **R-01** Ningún dato personal ni credencial en logs, mensajes de error ni respuestas de la API. — Lo exige el RGPD, y un secreto en un log ya es público. — Acordada al arrancar.
- **R-02** Toda llamada a un modelo de IA pasa por el AI Gateway; ningún módulo ni servicio llama directamente a un proveedor, tampoco el servicio del agente de Hyliable. — Sin el gateway no hay medición, cuotas ni redacción de datos personales. — Acordada al arrancar.
- **R-03** Todo texto visible se escribe en castellano en el código, con el contenedor de su módulo declarado una vez por fichero. — Es lo que la CI extrae y traduce. — Acordada al arrancar.
- **R-04** Una sola forma de resolver cada problema recurrente: si ya hay un patrón, se usa; uno nuevo necesita una decisión. — La IA copia lo que encuentra, también el segundo patrón. — Método del orquestador.
- **R-05** Un test cuenta solo si una aserción observa el comportamiento de su criterio: ni solo una captura, ni «se llamó al mock», ni «no lanza error». — Un test en verde que no prueba nada. — Método del orquestador.
- **R-06** Una dependencia nueva entra solo si la nombra la historia o una decisión. — Licencias, mantenimiento y superficie de ataque. — Acordada al arrancar.

## Comprobadas por la máquina

_(ninguna todavía: las primeras llegan con la entrega 0)_
