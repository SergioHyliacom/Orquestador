import { html } from "../lienzo/preact-htm.js";
import { Icono } from "./Icono.js";

// variante: primario | secundario | fantasma · tamano: normal | pequeno
// ir: ancla de la pantalla a la que lleva en el prototipo, p. ej. "facturacion/nueva/rellena".
export function Boton({ variante = "primario", tamano = "normal", ir, icono, disabled = false, children }) {
  const clase = ["boton", `boton-${variante}`, tamano === "pequeno" && "boton-pequeno"].filter(Boolean).join(" ");
  const contenido = html`${icono && html`<${Icono} nombre=${icono} />`}${children}`;
  return ir && !disabled
    ? html`<a class=${clase} href=${"#" + ir} data-c="Boton" data-v=${variante}>${contenido}</a>`
    : html`<button type="button" class=${clase} disabled=${disabled} data-c="Boton" data-v=${variante}>${contenido}</button>`;
}

export const ejemplos = [
  { nombre: "Primario", ver: () => html`<${Boton} icono="mas">Nueva factura<//>` },
  { nombre: "Secundario", ver: () => html`<${Boton} variante="secundario">Cancelar<//>` },
  { nombre: "Fantasma", ver: () => html`<${Boton} variante="fantasma">Ver todas<//>` },
  { nombre: "Pequeño", ver: () => html`<${Boton} variante="secundario" tamano="pequeno">Siguiente<//>` },
  { nombre: "Desactivado", ver: () => html`<${Boton} disabled>Emitiendo…<//>` },
];
