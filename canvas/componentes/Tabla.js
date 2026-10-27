import { html } from "../lienzo/preact-htm.js";

// columnas: [{ id, titulo, num }] · filas: [{ [id]: contenido }]
// cargando: pinta filas de esqueleto en vez de filas.
export function Tabla({ columnas, filas = [], cargando = false, filasCargando = 6 }) {
  const cuerpo = cargando
    ? Array.from({ length: filasCargando }, (_, i) => html`<tr>
        ${columnas.map((c, j) => html`<td class=${c.num ? "num" : null} data-etiqueta=${c.titulo}>
          <span class="esqueleto" style=${`width: ${35 + ((i * 17 + j * 23) % 50)}%; ${c.num ? "margin-left: auto" : ""}`}></span>
        </td>`)}
      </tr>`)
    : filas.map((f) => html`<tr>
        ${columnas.map((c) => html`<td class=${c.num ? "num" : null} data-etiqueta=${c.titulo}>${f[c.id]}</td>`)}
      </tr>`);
  return html`<table class="tabla" data-c="Tabla">
    <thead><tr>${columnas.map((c) => html`<th class=${c.num ? "num" : null}>${c.titulo}</th>`)}</tr></thead>
    <tbody>${cuerpo}</tbody>
  </table>`;
}

const columnas = [
  { id: "numero", titulo: "Número" },
  { id: "cliente", titulo: "Cliente" },
  { id: "total", titulo: "Total", num: true },
];

export const ejemplos = [
  {
    nombre: "Con filas",
    ver: () => html`<${Tabla} columnas=${columnas} filas=${[
      { numero: "F2026-0142", cliente: "Panadería Rial", total: "1.240,50 €" },
      { numero: "F2026-0141", cliente: "Clínica Dental Ortigueira", total: "3.872,00 €" },
    ]} />`,
  },
  { nombre: "Cargando", ver: () => html`<${Tabla} columnas=${columnas} cargando filasCargando=${3} />` },
];
