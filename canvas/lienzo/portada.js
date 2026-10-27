// Portada: las áreas del producto, con sus pantallas y los estados que faltan.
import { html, render } from "./preact-htm.js";
import { cargarAreas, escucharCambios, estadosQueFaltan } from "./motor.js";

const areas = await cargarAreas();

function Portada() {
  return html`<main class="lz-pagina">
    <header class="lz-pagina-cabecera">
      <h1>Diseño · EASY One</h1>
      <p>Demo del canvas. Cada área tiene su tablero; la biblioteca reúne tokens y componentes.</p>
      <nav><a class="lz-enlace" href="biblioteca.html">Biblioteca →</a></nav>
    </header>

    ${areas.map((a) => html`<section class="lz-area">
      <div class="lz-area-cabecera">
        <div><h2>${a.nombre}</h2><p>${a.descripcion}</p></div>
        <a class="lz-boton-claro" href=${`tablero.html?area=${a.id}`}>Abrir tablero</a>
      </div>
      <ul class="lz-lista">
        ${a.pantallas.map((p) => {
          const faltan = estadosQueFaltan(p);
          return html`<li>
            <a href=${`marco.html#${p.id}/${p.estados[0].id}`}>${p.nombre}</a>
            <span class="lz-tenue">${p.estados.length} estados</span>
            ${faltan.length > 0 && html`<span class="lz-falta">Sin dibujar: ${faltan.map((e) => e.nombre).join(", ")}</span>`}
          </li>`;
        })}
      </ul>
    </section>`)}

    <section class="lz-ayuda">
      <h2>Cómo se usa</h2>
      <ul>
        <li>Pídele a tu sesión de Claude lo que quieres diseñar o cambiar. Los cambios aparecen solos, sin recargar.</li>
        <li>En el tablero, la barra de abajo tiene las herramientas: Mover y elegir (V), Mano (H) y Señalar (S), el zoom y Probar. Arrastra para moverte, Ctrl + rueda (o pellizca) para el zoom, Espacio mantenido para mover con cualquier herramienta.</li>
        <li>Con Mover, un clic elige una pantalla (su ficha sale a la derecha) y un doble clic la abre para probarla.</li>
        <li>Con Señalar, haz clic en un elemento y díselo a Claude: «esto, más grande».</li>
        <li>Las etiquetas moradas (EO-12…) son las historias que usan cada pantalla. Las amarillas, los estados que faltan por dibujar.</li>
      </ul>
    </section>
  </main>`;
}

render(html`<${Portada} />`, document.getElementById("app"));
escucharCambios(() => location.reload());
