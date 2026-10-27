import { html } from "../../lienzo/preact-htm.js";
import { Boton, Cabecera, Campo, Panel, Tarjeta, Vacio } from "../../componentes/index.js";
import { clientes } from "../../datos/clientes.js";
import { euros } from "../../datos/formato.js";

const cliente = clientes[0].nombre;
const linea = { concepto: "Revisión anual de la flota (3 vehículos)", cantidad: 3, precio: 185 };
const base = linea.cantidad * linea.precio;
const iva = base * 0.21;

const cabecera = () => html`<${Cabecera}
  titulo="Nueva factura"
  subtitulo="Talleres Miño S.L. · Serie F2026"
  volver=${{ texto: "Facturas", ir: "facturacion/lista/datos" }}
/>`;

function Formulario({ rellena = true, errores = {}, enviando = false }) {
  const elegir = "Elige un cliente";
  return html`<div class="dos-columnas">
    <${Tarjeta}>
      <div class="formulario">
        <${Campo} etiqueta="Cliente" opciones=${[elegir, ...clientes.map((c) => c.nombre)]}
          valor=${rellena ? cliente : elegir} error=${errores.cliente} deshabilitado=${enviando} />
        <${Campo} etiqueta="Fecha de emisión" valor="27/10/2026" deshabilitado=${enviando} />
        <${Campo} etiqueta="Concepto" ancho="total" placeholder="Qué estás facturando"
          valor=${rellena ? linea.concepto : ""} error=${errores.concepto} deshabilitado=${enviando} />
        <${Campo} etiqueta="Cantidad" valor=${String(linea.cantidad)} deshabilitado=${enviando} />
        <${Campo} etiqueta="Precio unitario" valor=${rellena ? euros(linea.precio) : ""} placeholder="0,00 €" deshabilitado=${enviando} />
        <${Campo} etiqueta="IVA" opciones=${["21 %", "10 %", "4 %", "Exenta"]} valor="21 %" ayuda="El tipo general es el 21 %" deshabilitado=${enviando} />
        <${Campo} etiqueta="Serie" opciones=${["F2026 · Facturas", "R2026 · Rectificativas"]} valor="F2026 · Facturas" deshabilitado=${enviando} />
      </div>
      <div class="formulario-pie">
        <${Boton} variante="secundario" ir="facturacion/lista/datos" disabled=${enviando}>Cancelar<//>
        <${Boton} ir=${rellena ? "facturacion/nueva/emitida" : "facturacion/nueva/error"} disabled=${enviando}>
          ${enviando ? "Emitiendo…" : "Emitir factura"}
        <//>
      </div>
    <//>
    <${Tarjeta} clase="resumen">
      <h2>Resumen</h2>
      <div class="resumen-fila"><span>Base imponible</span><span>${euros(rellena ? base : 0)}</span></div>
      <div class="resumen-fila"><span>IVA (21 %)</span><span>${euros(rellena ? iva : 0)}</span></div>
      <div class="resumen-total"><span>Total</span><span>${euros(rellena ? base + iva : 0)}</span></div>
      <p class="resumen-nota">Al emitirla, la factura queda registrada y ya no se puede editar: solo rectificar.</p>
    <//>
  </div>`;
}

export default {
  id: "facturacion/nueva",
  nombre: "Nueva factura",
  noAplica: ["cargando", "vacia"],
  estados: [
    { id: "rellena", nombre: "Rellena", ver: () => html`<${Panel}>${cabecera()}<${Formulario} /><//>` },
    {
      id: "error",
      nombre: "Faltan datos",
      ver: () => html`<${Panel}>
        ${cabecera()}
        <${Formulario} rellena=${false} errores=${{ cliente: "Elige a quién va la factura", concepto: "Escribe qué estás facturando" }} />
      <//>`,
    },
    { id: "enviando", nombre: "Emitiendo", ver: () => html`<${Panel}>${cabecera()}<${Formulario} enviando /><//>` },
    {
      id: "emitida",
      nombre: "Emitida",
      ver: () => html`<${Panel}>
        ${cabecera()}
        <${Tarjeta}>
          <${Vacio} icono="check" tono="exito" titulo="Factura F2026-0143 emitida"
            texto=${`Ya aparece en tu lista de facturas, pendiente de cobro. Total: ${euros(base + iva)}.`}>
            <${Boton} variante="secundario" ir="facturacion/lista/datos">Volver a facturas<//>
            <${Boton} icono="mas" ir="facturacion/nueva/rellena">Emitir otra<//>
          <//>
        <//>
      <//>`,
    },
    {
      id: "sinPermiso",
      nombre: "Sin permiso",
      ver: () => html`<${Panel}>
        ${cabecera()}
        <${Tarjeta}>
          <${Vacio} icono="candado" tono="neutro" titulo="No puedes emitir facturas"
            texto="Tu perfil no tiene permiso para emitir facturas en esta empresa. Pídeselo a quien administra la cuenta.">
            <${Boton} variante="secundario" ir="facturacion/lista/datos">Volver a facturas<//>
          <//>
        <//>
      <//>`,
    },
  ],
};
