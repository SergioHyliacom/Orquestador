import { html } from "../lienzo/preact-htm.js";
import { Icono } from "./Icono.js";

const secciones = [
  { id: "inicio", texto: "Inicio", icono: "casa" },
  { id: "facturas", texto: "Facturas", icono: "factura", ir: "facturacion/lista/datos" },
  { id: "clientes", texto: "Clientes", icono: "personas" },
  { id: "ajustes", texto: "Ajustes", icono: "ajustes" },
];

// Estructura de la aplicación: menú lateral, barra superior y contenido.
export function Panel({ seccion = "facturas", children }) {
  return html`<div class="panel" data-c="Panel">
    <aside class="panel-lateral">
      <div class="panel-marca">EASY <span>One</span></div>
      <nav class="panel-nav">
        ${secciones.map(
          (s) => html`<a href=${s.ir ? "#" + s.ir : null} aria-current=${s.id === seccion ? "page" : null}>
            <${Icono} nombre=${s.icono} />${s.texto}
          </a>`,
        )}
      </nav>
    </aside>
    <div class="panel-principal">
      <header class="panel-barra">
        <div class="panel-barra-izq">
          <button type="button" class="boton boton-fantasma solo-movil" aria-label="Menú"><${Icono} nombre="menu" /></button>
          <span class="panel-marca solo-movil">EASY <span>One</span></span>
        </div>
        <div class="panel-cuenta"><span>Talleres Miño S.L.</span><span class="avatar">AL</span></div>
      </header>
      <main class="panel-contenido">${children}</main>
    </div>
  </div>`;
}

export const ejemplos = [];
