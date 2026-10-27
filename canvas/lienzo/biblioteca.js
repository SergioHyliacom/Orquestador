// Biblioteca: los tokens (leídos de tokens.css) y cada componente con sus variantes.
import { html, render } from "./preact-htm.js";
import { biblioteca } from "../componentes/index.js";
import { escucharCambios } from "./motor.js";

// Lee las variables de :root que empiezan por un prefijo, en el orden de tokens.css.
function tokens(prefijo) {
  const encontrados = [];
  for (const hoja of document.styleSheets) {
    let reglas;
    try {
      reglas = hoja.cssRules;
    } catch {
      continue;
    }
    for (const regla of reglas) {
      if (regla.selectorText !== ":root") continue;
      for (const nombre of regla.style) {
        if (nombre.startsWith(prefijo)) encontrados.push([nombre, regla.style.getPropertyValue(nombre).trim()]);
      }
    }
  }
  return encontrados;
}

function Biblioteca() {
  return html`<main class="lz-pagina">
    <header class="lz-pagina-cabecera">
      <h1>Biblioteca</h1>
      <p>Tokens y componentes. Lo que cambia aquí cambia en todas las pantallas.</p>
      <nav><a class="lz-enlace" href="index.html">← Áreas</a></nav>
    </header>

    <section class="lz-seccion">
      <h2>Colores</h2>
      <div class="lz-muestras">
        ${tokens("--color-").map(([nombre, valor]) => html`<figure class="lz-muestra">
          <div style=${`background: var(${nombre})`}></div>
          <figcaption><code>${nombre}</code><span>${valor}</span></figcaption>
        </figure>`)}
      </div>
    </section>

    <section class="lz-seccion">
      <h2>Tipografía</h2>
      ${tokens("--texto-").map(([nombre, valor]) => html`<div class="lz-tipo">
        <code>${nombre} · ${valor}</code>
        <span style=${`font-size: var(${nombre})`}>Factura F2026-0142 · 1.240,50 €</span>
      </div>`)}
    </section>

    <section class="lz-seccion">
      <h2>Espaciado y radios</h2>
      ${tokens("--esp-").map(([nombre, valor]) => html`<div class="lz-tipo">
        <code>${nombre} · ${valor}</code><span class="lz-barra-esp" style=${`width: var(${nombre})`}></span>
      </div>`)}
      <div class="lz-radios">
        ${tokens("--radio-").map(([nombre, valor]) => html`<figure>
          <div style=${`border-radius: var(${nombre})`}></div><figcaption><code>${nombre}</code> ${valor}</figcaption>
        </figure>`)}
      </div>
    </section>

    ${biblioteca.map((c) => html`<section class="lz-seccion">
      <h2>${c.nombre} <code>${c.componente}</code></h2>
      <div class="lz-ejemplos">
        ${c.ejemplos.map((e) => html`<figure class="lz-ejemplo">
          <div class="lz-ejemplo-caja">${e.ver()}</div>
          <figcaption>${e.nombre}</figcaption>
        </figure>`)}
      </div>
    </section>`)}
  </main>`;
}

render(html`<${Biblioteca} />`, document.getElementById("app"));
escucharCambios(() => location.reload());
