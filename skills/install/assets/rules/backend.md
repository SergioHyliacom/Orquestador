# Reglas del backend

Las lee el `backend-builder` en cada encargo, junto con las comunes; también el `reviewer` cuando el diff toca el backend, y el `auditor`. Cada regla dice qué, por qué y de dónde sale. Cambian por PR (skill `orchestrate`, §11).

- **R-07** La cuenta sale de la sesión, el token o el `Host` validado, en un solo sitio; ningún handler la toma de la petición. — Se leerían datos de otra cuenta. — Definición §12.1.2.
- **R-08** Los datos de una cuenta se leen y escriben solo por la conexión a su BD; sin consultas cruzadas entre BDs. — Es el aislamiento físico entre cuentas. — D2, definición §9.3.
- **R-09** La autorización está centralizada y deniega por defecto: ningún endpoint sin política, y cada acceso por id comprueba la propiedad. — Un endpoint sin política queda abierto. — Definición §12.1.3.
- **R-10** Lo que la API expone de una cuenta tiene un test que prueba que otra cuenta no puede leerlo ni cambiarlo. — Aislamiento entre cuentas. — Definición §12.1.2.
- **R-11** Las migraciones son compatibles hacia atrás: expandir, desplegar, contraer. — Se aplican cuenta a cuenta, y conviven versiones. — Definición §9.3.
- **R-12** Los scripts y las tareas periódicas se lanzan solo por CLI o por la cola, nunca por HTTP. — Un endpoint de mantenimiento es una puerta abierta. — Definición §12.1.12.

## Patrones

_(se escriben al cerrar la entrega 0, a partir del código de los cimientos: el módulo de referencia y el generador de módulos)_

## Comprobadas por la máquina

_(ninguna todavía: las primeras llegan con la entrega 0)_
