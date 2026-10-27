import { html } from "../lienzo/preact-htm.js";

// opciones: si las hay, es un desplegable · ancho: "total" ocupa toda la fila del formulario.
export function Campo({ etiqueta, valor = "", placeholder, ayuda, error, opciones, deshabilitado = false, ancho }) {
  const id = "campo-" + etiqueta.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-");
  const invalido = error ? "true" : null;
  const control = opciones
    ? html`<select id=${id} disabled=${deshabilitado} aria-invalid=${invalido}>
        ${opciones.map((o) => html`<option selected=${o === valor}>${o}</option>`)}
      </select>`
    : html`<input id=${id} value=${valor} placeholder=${placeholder} disabled=${deshabilitado} aria-invalid=${invalido} />`;
  const clase = ["campo", error && "campo-con-error", ancho === "total" && "ancho-total"].filter(Boolean).join(" ");
  return html`<div class=${clase} data-c="Campo">
    <label for=${id}>${etiqueta}</label>
    ${control}
    ${error ? html`<span class="campo-error">${error}</span>` : ayuda && html`<span class="campo-ayuda">${ayuda}</span>`}
  </div>`;
}

export const ejemplos = [
  { nombre: "Texto", ver: () => html`<${Campo} etiqueta="Concepto" placeholder="Qué estás facturando" />` },
  { nombre: "Con ayuda", ver: () => html`<${Campo} etiqueta="IVA" opciones=${["21 %", "10 %", "4 %"]} valor="21 %" ayuda="El tipo general es el 21 %" />` },
  { nombre: "Con error", ver: () => html`<${Campo} etiqueta="Cliente" opciones=${["Elige un cliente"]} error="Elige a quién va la factura" />` },
  { nombre: "Desactivado", ver: () => html`<${Campo} etiqueta="Serie" valor="F2026" deshabilitado />` },
];
