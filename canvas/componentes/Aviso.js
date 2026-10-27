import { html } from "../lienzo/preact-htm.js";
import { Icono } from "./Icono.js";

const iconos = { error: "alerta", info: "alerta", exito: "check" };

// tipo: error | info | exito · los hijos son las acciones.
export function Aviso({ tipo = "error", titulo, texto, children }) {
  return html`<div class=${`aviso aviso-${tipo}`} role=${tipo === "error" ? "alert" : null} data-c="Aviso" data-v=${tipo}>
    <${Icono} nombre=${iconos[tipo]} />
    <div class="aviso-cuerpo"><strong>${titulo}</strong>${texto && html`<span>${texto}</span>`}</div>
    ${children}
  </div>`;
}

export const ejemplos = [
  { nombre: "Error", ver: () => html`<${Aviso} titulo="No hemos podido guardar" texto="Vuelve a intentarlo en unos segundos." />` },
  { nombre: "Info", ver: () => html`<${Aviso} tipo="info" titulo="Hay 3 facturas vencidas" texto="Revisa su estado de cobro." />` },
  { nombre: "Éxito", ver: () => html`<${Aviso} tipo="exito" titulo="Cambios guardados" />` },
];
