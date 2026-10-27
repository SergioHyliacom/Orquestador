import { html } from "../lienzo/preact-htm.js";

// Trazos de 24 × 24, línea de 2 px.
const trazos = {
  mas: ["M12 5v14", "M5 12h14"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  casa: ["M3 10.5 12 3l9 7.5", "M5 9.5V21h14V9.5"],
  factura: ["M6 3h9l4 4v14H6z", "M15 3v4h4", "M9 12h6", "M9 16h6"],
  personas: ["M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1", "M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M22 19v-1a4 4 0 0 0-3-3.87", "M16 4.13a3 3 0 0 1 0 5.74"],
  ajustes: ["M4 6h10", "M18 6h2", "M16 4v4", "M4 12h2", "M10 12h10", "M8 10v4", "M4 18h8", "M16 18h4", "M14 16v4"],
  alerta: ["M12 3 2 20h20z", "M12 10v4", "M12 17h.01"],
  candado: ["M6 11h12v10H6z", "M8 11V8a4 4 0 0 1 8 0v3"],
  check: ["M20 6 9 17l-5-5"],
  reintentar: ["M3 12a9 9 0 1 0 3-6.7", "M3 4v5h5"],
  izquierda: ["M15 18l-6-6 6-6"],
  derecha: ["M9 18l6-6-6-6"],
};

export function Icono({ nombre, tamano = 18 }) {
  return html`<svg class="icono" data-c="Icono" data-v=${nombre} width=${tamano} height=${tamano} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${(trazos[nombre] ?? []).map((d) => html`<path d=${d} />`)}
  </svg>`;
}

export const ejemplos = Object.keys(trazos).map((nombre) => ({
  nombre,
  ver: () => html`<${Icono} nombre=${nombre} tamano=${24} />`,
}));
