import { html } from "../lienzo/preact-htm.js";

export function Tarjeta({ clase, children }) {
  return html`<section class=${["tarjeta", clase].filter(Boolean).join(" ")} data-c="Tarjeta">${children}</section>`;
}

export const ejemplos = [
  { nombre: "Tarjeta", ver: () => html`<${Tarjeta}><div style="padding:24px">Contenido de la tarjeta</div><//>` },
];
