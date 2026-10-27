import { html } from "../../lienzo/preact-htm.js";
import { Aviso, Boton, Cabecera, Cifra, Cifras, Etiqueta, Panel, Pestanas, Tabla, Tarjeta, Vacio } from "../../componentes/index.js";
import { facturas } from "../../datos/facturas.js";
import { euros, fecha } from "../../datos/formato.js";

const columnas = [
  { id: "numero", titulo: "Número" },
  { id: "cliente", titulo: "Cliente" },
  { id: "fecha", titulo: "Fecha" },
  { id: "estado", titulo: "Estado" },
  { id: "total", titulo: "Total", num: true },
];

const filas = facturas.map((f) => ({
  numero: html`<strong>${f.numero}</strong>`,
  cliente: f.cliente,
  fecha: fecha(f.fecha),
  estado: html`<${Etiqueta} tipo=${f.estado} />`,
  total: euros(f.total),
}));

const filtros = [
  { id: "todas", texto: "Todas", cuenta: 24 },
  { id: "emitidas", texto: "Pendientes de cobro", cuenta: 9 },
  { id: "pagadas", texto: "Pagadas", cuenta: 12 },
  { id: "vencidas", texto: "Vencidas", cuenta: 3 },
];

const cabecera = () => html`<${Cabecera} titulo="Facturas" subtitulo="Las facturas que ha emitido tu empresa">
  <${Boton} icono="mas" ir="facturacion/nueva/rellena">Nueva factura<//>
<//>`;

const cifras = (cargando = false) => html`<${Cifras}>
  <${Cifra} etiqueta="Pendiente de cobro" valor="8.420,50 €" nota="9 facturas" cargando=${cargando} />
  <${Cifra} etiqueta="Vencido" valor="10.295,25 €" nota="3 facturas" tono="error" cargando=${cargando} />
  <${Cifra} etiqueta="Cobrado en octubre" valor="14.112,85 €" nota="12 facturas" cargando=${cargando} />
<//>`;

export default {
  id: "facturacion/lista",
  nombre: "Lista de facturas",
  noAplica: [],
  estados: [
    {
      id: "cargando",
      nombre: "Cargando",
      ver: () => html`<${Panel}>
        ${cabecera()} ${cifras(true)}
        <${Tarjeta}><${Pestanas} opciones=${filtros} activa="todas" /><${Tabla} columnas=${columnas} cargando /><//>
      <//>`,
    },
    {
      id: "vacia",
      nombre: "Vacía",
      ver: () => html`<${Panel}>
        ${cabecera()}
        <${Tarjeta}>
          <${Vacio} titulo="Aún no has emitido ninguna factura" texto="Cuando emitas la primera, la verás aquí con su estado de cobro.">
            <${Boton} icono="mas" ir="facturacion/nueva/rellena">Emitir la primera factura<//>
          <//>
        <//>
      <//>`,
    },
    {
      id: "datos",
      nombre: "Con datos",
      ver: () => html`<${Panel}>
        ${cabecera()} ${cifras()}
        <${Tarjeta}>
          <${Pestanas} opciones=${filtros} activa="todas" />
          <${Tabla} columnas=${columnas} filas=${filas} />
          <div class="tabla-pie">
            <span>Mostrando 8 de 24 facturas</span>
            <div class="paginacion">
              <${Boton} variante="secundario" tamano="pequeno" disabled>Anterior<//>
              <${Boton} variante="secundario" tamano="pequeno">Siguiente<//>
            </div>
          </div>
        <//>
      <//>`,
    },
    {
      id: "error",
      nombre: "Error",
      ver: () => html`<${Panel}>
        ${cabecera()}
        <${Aviso} titulo="No hemos podido cargar las facturas" texto="Revisa tu conexión y vuelve a intentarlo. Si sigue pasando, avisa a soporte.">
          <${Boton} variante="secundario" icono="reintentar" ir="facturacion/lista/datos">Reintentar<//>
        <//>
      <//>`,
    },
  ],
};
