# Canvas de diseño · demo

Prueba de un canvas para diseñar EASY One sin Figma y sin instalar nada: Preact y htm van copiados en `lienzo/preact-htm.js`, no hay `npm install` ni compilación. Solo sirve para diseñar y sacar historias; el código del producto se escribe aparte.

**Estado:** demo en debate. Todavía no forma parte del método del orquestador (las historias siguen saliendo de Figma, `orchestrate` §6.1). El área de Facturación y las historias EO-12, EO-14 y EO-15 son de ejemplo.

## Abrirlo

Desde la raíz del repositorio:

```
node canvas/servir.mjs --abrir
```

Abre `http://localhost:4321`. Necesita Node 20 o posterior. Otro puerto: `PORT=4322 node servir.mjs`.

## Qué hay

- **Portada** (`index.html`): las áreas, sus pantallas y los estados que faltan por dibujar.
- **Tablero** (`tablero.html?area=facturacion`): cada fila es una pantalla a un tamaño (escritorio, móvil) y cada columna uno de sus estados. Abajo, una barra de herramientas como la de Figma: Mover y elegir (V), Mano (H), Señalar (S), zoom (−, menú con ver todo, zoom a la pantalla elegida, 50/100/200 %, +) y Probar. Espacio mantenido mueve el tablero con cualquier herramienta. Un clic con Mover elige una pantalla y abre su ficha (ancla para copiar, historias); doble clic la prueba.
- **Prototipo** (`marco.html#facturacion/lista/datos`): la pantalla a tamaño real, navegable. La barra de abajo cambia de estado y vuelve al tablero.
- **Señalar**: clic en un elemento; se guarda en `.seleccion.json` para que la sesión de Claude sepa qué es «esto».
- **Biblioteca** (`biblioteca.html`): tokens y componentes con sus variantes.
- **Recarga sola** cuando cambia cualquier fichero.

## Dónde está cada cosa

| Carpeta o fichero | Qué es | Quién lo cambia |
|---|---|---|
| `tokens.css` | Colores, tipografía, espaciados, radios, sombras | Claude, a petición de diseño |
| `componentes/` | Componentes y sus variantes (`ejemplos` alimenta la biblioteca) | Claude, a petición de diseño |
| `areas/<área>/` | Las pantallas: cada una con sus estados | Claude, a petición de diseño |
| `datos/` | Datos de ejemplo en español | Claude |
| `historias.json` | Qué historias usan cada pantalla | La sesión, a partir de las historias |
| `lienzo/` | El motor: tablero, prototipo, selección, biblioteca | Nadie a mano: viene del plugin |
| `servir.mjs` | Servidor local sin dependencias | Nadie a mano: viene del plugin |

Una pantalla declara sus estados; los habituales (cargando, vacía, error, sin permiso) que no dibuje y no marque en `noAplica` salen como «Sin dibujar».

Licencias: Preact (MIT) y htm (Apache-2.0), en `lienzo/preact-htm.js` (htm 3.1.1, `preact/standalone`). El icono de la mano de la barra es de Lucide (ISC).
