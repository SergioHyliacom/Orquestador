import { html } from "../lienzo/preact-htm.js";

const textos = { emitida: "Pendiente de cobro", pagada: "Pagada", vencida: "Vencida", borrador: "Borrador" };

// tipo: emitida | pagada | vencida | borrador
export function Etiqueta({ tipo }) {
  return html`<span class=${`etiqueta etiqueta-${tipo}`} data-c="Etiqueta" data-v=${tipo}>${textos[tipo] ?? tipo}</span>`;
}

export const ejemplos = Object.keys(textos).map((tipo) => ({ nombre: textos[tipo], ver: () => html`<${Etiqueta} tipo=${tipo} />` }));
