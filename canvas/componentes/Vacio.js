import { html } from "../lienzo/preact-htm.js";
import { Icono } from "./Icono.js";

// Un mensaje centrado con icono: lista vacía, operación terminada o acceso denegado.
// tono: marca | exito | neutro · los hijos son las acciones.
export function Vacio({ icono = "factura", tono = "marca", titulo, texto, children }) {
  return html`<div class="vacio" data-c="Vacio" data-v=${tono}>
    <div class=${`vacio-icono tono-${tono}`}><${Icono} nombre=${icono} tamano=${24} /></div>
    <h2>${titulo}</h2>
    ${texto && html`<p>${texto}</p>`}
    ${children && html`<div class="vacio-acciones">${children}</div>`}
  </div>`;
}

export const ejemplos = [
  { nombre: "Marca", ver: () => html`<${Vacio} titulo="Aún no hay nada" texto="Cuando lo haya, aparecerá aquí." />` },
  { nombre: "Éxito", ver: () => html`<${Vacio} icono="check" tono="exito" titulo="Hecho" texto="La operación ha terminado bien." />` },
  { nombre: "Neutro", ver: () => html`<${Vacio} icono="candado" tono="neutro" titulo="Sin acceso" texto="Pídeselo a quien administra la cuenta." />` },
];
