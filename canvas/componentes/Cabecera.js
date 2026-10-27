import { html } from "../lienzo/preact-htm.js";
import { Icono } from "./Icono.js";

// volver: { texto, ir } para el enlace de vuelta encima del título.
// Los hijos son las acciones de la página (botones).
export function Cabecera({ titulo, subtitulo, volver, children }) {
  return html`<div class="cabecera" data-c="Cabecera">
    <div>
      ${volver && html`<a class="cabecera-volver" href=${"#" + volver.ir}><${Icono} nombre="izquierda" tamano=${16} />${volver.texto}</a>`}
      <h1>${titulo}</h1>
      ${subtitulo && html`<p>${subtitulo}</p>`}
    </div>
    ${children && html`<div class="cabecera-acciones">${children}</div>`}
  </div>`;
}

export const ejemplos = [];
