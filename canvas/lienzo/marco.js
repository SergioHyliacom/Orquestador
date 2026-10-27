// Pinta un estado de una pantalla: #area/pantalla/estado.
// Dentro del tablero es un marco más; abierto solo, es el modo prototipo.
import { html, render } from "./preact-htm.js";
import { cargarArea, cargarHistorias, escucharCambios, historiasDe } from "./motor.js";
import { activarSeleccion, prepararSeleccion, resumen, seleccionActiva } from "./seleccion.js";

const app = document.getElementById("app");
const enTablero = window.top !== window;
const indice = await cargarHistorias();
let actual = null;
let aviso = null;

async function mostrar() {
  const ancla = decodeURIComponent(location.hash.slice(1));
  const [areaId, pantallaId, estadoId] = ancla.split("/");
  try {
    const area = await cargarArea(areaId);
    const pantalla = area.pantallas.find((p) => p.id === `${areaId}/${pantallaId}`);
    if (!pantalla) throw new Error(`No hay ninguna pantalla «${areaId}/${pantallaId}» en ${area.nombre}`);
    const estado = pantalla.estados.find((e) => e.id === estadoId) ?? pantalla.estados[0];
    actual = { area, pantalla, estado };
    document.title = `${pantalla.nombre} · ${estado.nombre}`;
    render(html`${estado.ver()}${!enTablero && html`<${Barra} />`}`, app);
  } catch (error) {
    actual = null;
    render(html`<div class="lz-error"><strong>No se puede pintar «${ancla}».</strong><br />${error.message}</div>`, app);
  }
}

// Barra del modo prototipo.
function Barra() {
  const { area, pantalla, estado } = actual;
  const historias = historiasDe(indice, `${pantalla.id}/${estado.id}`);
  return html`<div class="lz-ui lz-barra-prototipo">
    <a class="lz-boton" href=${`tablero.html?area=${area.id}`}>← Tablero</a>
    <span class="lz-titulo">${pantalla.nombre}</span>
    <select class="lz-select" aria-label="Estado" onChange=${(e) => (location.hash = `${pantalla.id}/${e.target.value}`)}>
      ${pantalla.estados.map((e) => html`<option value=${e.id} selected=${e.id === estado.id}>${e.nombre}</option>`)}
    </select>
    ${historias.map((h) => html`<span class="lz-historia" title=${indice.historias?.[h] ?? ""}>${h}</span>`)}
    <button type="button" class=${`lz-boton ${seleccionActiva() ? "lz-activo" : ""}`} title="Señala un elemento para decírselo a Claude (Esc para salir)"
      onClick=${() => { activarSeleccion(!seleccionActiva()); mostrar(); }}>Seleccionar</button>
    ${aviso && html`<div class="lz-aviso-prototipo"><strong>${aviso.que}</strong><small>${aviso.donde} · ya puedes decirle a Claude «esto…»</small></div>`}
  </div>`;
}

prepararSeleccion({
  pantalla: () =>
    actual
      ? { pantalla: `${actual.pantalla.id}/${actual.estado.id}`, nombre: `${actual.pantalla.nombre} › ${actual.estado.nombre}` }
      : {},
  avisar: (info) => {
    if (enTablero) return parent.postMessage({ tipo: "lz-seleccionado", info }, location.origin);
    aviso = resumen(info);
    mostrar();
  },
});

// Mensajes del tablero: activar o desactivar la selección.
window.addEventListener("message", (evento) => {
  if (evento.origin === location.origin && evento.data?.tipo === "lz-seleccion") activarSeleccion(evento.data.activa);
});
window.addEventListener("keydown", (evento) => {
  if (!enTablero && evento.key === "Escape" && seleccionActiva()) {
    activarSeleccion(false);
    mostrar();
  }
});

// Dentro del tablero, el marco crece hasta el alto de su contenido.
if (enTablero) {
  const avisarAlto = () => parent.postMessage({ tipo: "lz-alto", alto: document.documentElement.scrollHeight }, location.origin);
  new ResizeObserver(avisarAlto).observe(document.body);

  // Con Señalar activo, el cursor y el teclado están dentro de esta pantalla:
  // las teclas y la rueda se pasan al tablero, que es quien las usa.
  const teclas = ["key", "code", "repeat", "shiftKey", "ctrlKey", "metaKey", "altKey"];
  const pasarTecla = (tipo) => (evento) => {
    if (evento.code === "Space" || evento.ctrlKey || evento.metaKey) evento.preventDefault();
    parent.postMessage({ tipo, tecla: Object.fromEntries(teclas.map((k) => [k, evento[k]])) }, location.origin);
  };
  window.addEventListener("keydown", pasarTecla("lz-tecla"));
  window.addEventListener("keyup", pasarTecla("lz-tecla-suelta"));
  window.addEventListener(
    "wheel",
    (evento) => {
      evento.preventDefault();
      const { clientX, clientY, deltaX, deltaY, deltaMode, ctrlKey, metaKey, shiftKey } = evento;
      parent.postMessage({ tipo: "lz-rueda", rueda: { clientX, clientY, deltaX, deltaY, deltaMode, ctrlKey, metaKey, shiftKey } }, location.origin);
    },
    { passive: false },
  );
}

window.addEventListener("hashchange", () => {
  aviso = null;
  mostrar();
});
escucharCambios(() => location.reload());
await mostrar();
