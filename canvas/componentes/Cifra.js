import { html } from "../lienzo/preact-htm.js";

// tono: normal | error
export function Cifra({ etiqueta, valor, nota, tono = "normal", cargando = false }) {
  return html`<section class=${["tarjeta cifra", tono === "error" && "cifra-error"].filter(Boolean).join(" ")} data-c="Cifra" data-v=${tono}>
    <span class="cifra-etiqueta">${etiqueta}</span>
    ${cargando
      ? html`<span class="esqueleto" style="width: 60%; height: 22px; margin: 3px 0"></span>`
      : html`<span class="cifra-valor">${valor}</span>`}
    ${nota && !cargando && html`<span class="cifra-nota">${nota}</span>`}
  </section>`;
}

export function Cifras({ children }) {
  return html`<div class="cifras" data-c="Cifras">${children}</div>`;
}

export const ejemplos = [
  { nombre: "Normal", ver: () => html`<${Cifra} etiqueta="Pendiente de cobro" valor="8.420,50 €" nota="9 facturas" />` },
  { nombre: "Error", ver: () => html`<${Cifra} etiqueta="Vencido" valor="10.295,25 €" nota="3 facturas" tono="error" />` },
  { nombre: "Cargando", ver: () => html`<${Cifra} etiqueta="Cobrado en octubre" cargando />` },
];
