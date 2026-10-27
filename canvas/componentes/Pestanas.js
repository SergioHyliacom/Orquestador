import { html } from "../lienzo/preact-htm.js";

// opciones: [{ id, texto, cuenta }] · activa: id de la opción marcada
export function Pestanas({ opciones, activa }) {
  return html`<nav class="pestanas" data-c="Pestanas">
    ${opciones.map(
      (o) => html`<a aria-current=${o.id === activa ? "true" : null}>
        ${o.texto}${o.cuenta != null && html`<span class="cuenta">${o.cuenta}</span>`}
      </a>`,
    )}
  </nav>`;
}

export const ejemplos = [
  {
    nombre: "Con cuentas",
    ver: () => html`<${Pestanas} activa="todas" opciones=${[
      { id: "todas", texto: "Todas", cuenta: 24 },
      { id: "pendientes", texto: "Pendientes de cobro", cuenta: 9 },
      { id: "pagadas", texto: "Pagadas", cuenta: 12 },
    ]} />`,
  },
];
