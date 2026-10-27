// Tablero de un área: cada fila es una pantalla a un tamaño, cada columna uno de sus estados.
// Abajo, la barra de herramientas: mover y elegir (V), mano (H), señalar para Claude (S), zoom y probar.
import { html, render } from "./preact-htm.js";
import { cargarArea, cargarHistorias, escucharCambios, estadosQueFaltan, historiasDe } from "./motor.js";
import { resumen } from "./seleccion.js";

const areaId = new URLSearchParams(location.search).get("area") ?? "facturacion";
const raizApp = document.getElementById("app");

let area;
try {
  area = await cargarArea(areaId);
} catch (error) {
  render(html`<div class="lz-error"><strong>No se puede abrir el tablero.</strong><br />${error.message}</div>`, raizApp);
  throw error;
}
const indice = await cargarHistorias();
document.title = `${area.nombre} · Tablero`;

// Qué pantalla y qué estado es cada ancla, para el panel de la pantalla elegida.
const fichas = new Map();
for (const pantalla of area.pantallas) for (const estado of pantalla.estados) fichas.set(`${pantalla.id}/${estado.id}`, { pantalla, estado });

// Estado de la interfaz.
const ui = { herramienta: "mover", elegido: null, menuZoom: false, espacio: false };

function Historias({ ancla }) {
  return historiasDe(indice, ancla).map((h) => html`<span class="lz-historia" title=${indice.historias?.[h] ?? ""}>${h}</span>`);
}

function Tablero() {
  return html`
    <header class="lz-ui lz-barra">
      <a class="lz-boton" href="index.html">Áreas</a>
      <strong class="lz-titulo">${area.nombre}</strong>
      <span class="lz-separador"></span>
      <a class="lz-boton" href="biblioteca.html">Biblioteca</a>
    </header>
    <div class="lz-lienzo" id="lz-lienzo">
      <div class="lz-mundo" id="lz-mundo">
        ${area.pantallas.map((p) => {
          const faltan = estadosQueFaltan(p);
          return html`<section class="lz-pantalla">
            ${(p.tamanos ?? area.tamanos).map((t, i) => html`<div class="lz-fila">
              <div class="lz-fila-cabecera">
                <h2>${p.nombre}</h2>
                <span>${t.nombre} · ${t.ancho} px</span>
                ${i === 0 && html`<code>${p.id}</code>`}
                ${i === 0 && faltan.length > 0 && html`<span class="lz-falta" title="Estados habituales que esta pantalla no dibuja">Sin dibujar: ${faltan.map((e) => e.nombre).join(", ")}</span>`}
              </div>
              <div class="lz-marcos">
                ${p.estados.map((e) => {
                  const ancla = `${p.id}/${e.id}`;
                  return html`<figure class="lz-marco" data-ancla=${ancla} data-tamano=${`${t.nombre} · ${t.ancho} px`}>
                    <figcaption><span>${e.nombre}</span><${Historias} ancla=${ancla} /></figcaption>
                    <iframe data-src=${`marco.html#${ancla}`} width=${t.ancho} height=${t.alto}
                      style=${`height: ${t.alto}px`} title=${`${p.nombre} · ${e.nombre} · ${t.nombre}`}></iframe>
                  </figure>`;
                })}
              </div>
            </div>`)}
          </section>`;
        })}
      </div>
    </div>
    <div id="lz-panel"></div>
    <div id="lz-herramientas"></div>
    <div class="lz-ui lz-aviso" id="lz-aviso" hidden></div>`;
}

render(html`<${Tablero} />`, raizApp);

const lienzo = document.getElementById("lz-lienzo");
const mundo = document.getElementById("lz-mundo");
const marcos = [...mundo.querySelectorAll("iframe")];
const raiz = document.documentElement;

// --- Vista: posición y zoom ---------------------------------------------------
const claveVista = `lz-vista-${area.id}`;
let vista = JSON.parse(sessionStorage.getItem(claveVista) ?? "null");

// Se pinta como mucho una vez por fotograma, aunque lleguen muchos pasos de rueda.
// Mientras se mueve, el tablero se escala como una imagen ya pintada (lz-moviendo);
// al parar se vuelve a pintar nítido y se guarda la vista.
let pintarPendiente = false;
let enReposo;
function aplicar() {
  if (pintarPendiente) return;
  pintarPendiente = true;
  requestAnimationFrame(() => {
    pintarPendiente = false;
    mundo.style.transform = `translate(${vista.x}px, ${vista.y}px) scale(${vista.z})`;
    mundo.classList.add("lz-moviendo");
    pintarInterfaz();
    clearTimeout(enReposo);
    enReposo = setTimeout(() => {
      mundo.classList.remove("lz-moviendo");
      mundo.style.setProperty("--lz-inv", String(1 / vista.z));
      sessionStorage.setItem(claveVista, JSON.stringify(vista));
    }, 150);
  });
}

// La barra de herramientas ocupa la parte de abajo: lo que se encuadra queda por encima.
const altoUtil = () => lienzo.clientHeight - 72;

function verTodo() {
  const z = Math.min((lienzo.clientWidth - 80) / mundo.offsetWidth, 1);
  vista = { z, x: Math.max(40, (lienzo.clientWidth - mundo.offsetWidth * z) / 2), y: 40 };
  aplicar();
}

// Zoom manteniendo fijo el punto (px, py) del lienzo: lo que está bajo el cursor no se mueve.
function zoomEn(px, py, factor) {
  const z = Math.min(Math.max(vista.z * factor, 0.05), 2);
  const k = z / vista.z;
  vista = { z, x: px - (px - vista.x) * k, y: py - (py - vista.y) * k };
  aplicar();
}

const zoomCentro = (factor) => zoomEn(lienzo.clientWidth / 2, altoUtil() / 2, factor);
const zoomPorcentaje = (porcentaje) => zoomCentro(porcentaje / 100 / vista.z);

function posicionEnMundo(elemento) {
  let x = 0;
  let y = 0;
  for (let n = elemento; n && n !== mundo; n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y, ancho: elemento.offsetWidth, alto: elemento.offsetHeight };
}

// Encuadra una pantalla en la ventana.
function zoomA(marco) {
  if (!marco) return;
  const r = posicionEnMundo(marco);
  const ancho = lienzo.clientWidth;
  const alto = altoUtil();
  const z = Math.min((ancho - 120) / r.ancho, (alto - 80) / r.alto, 2);
  vista = { z, x: (ancho - r.ancho * z) / 2 - r.x * z, y: Math.max(40, (alto - r.alto * z) / 2) - r.y * z };
  aplicar();
}

// --- Herramientas -------------------------------------------------------------
function usar(herramienta) {
  ui.herramienta = herramienta;
  ui.menuZoom = false;
  raiz.dataset.herramienta = herramienta;
  const senalar = herramienta === "senalar";
  for (const marco of marcos) marco.contentWindow?.postMessage({ tipo: "lz-seleccion", activa: senalar }, location.origin);
  pintarInterfaz();
}

function elegir(marco) {
  ui.elegido?.classList.remove("lz-elegido");
  ui.elegido = marco ?? null;
  ui.elegido?.classList.add("lz-elegido");
  pintarInterfaz();
}

function probar() {
  const marco = ui.elegido ?? mundo.querySelector(".lz-marco");
  if (marco) location.href = `marco.html#${marco.dataset.ancla}`;
}

function cerrarMenu() {
  if (!ui.menuZoom) return;
  ui.menuZoom = false;
  pintarInterfaz();
}

// Iconos de la barra (trazos de 24 × 24; la mano, de Lucide, licencia ISC).
const iconos = {
  mover: ["M5 3l13 7.5-5.8 1.6-2.7 5.9z"],
  mano: [
    "M18 11V6a2 2 0 0 0-4 0",
    "M14 10V4a2 2 0 0 0-4 0v2",
    "M10 10.5V6a2 2 0 0 0-4 0v8",
    "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
  ],
  senalar: ["M12 3v3", "M12 18v3", "M3 12h3", "M18 12h3", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 12h.01"],
  menos: ["M5 12h14"],
  mas: ["M12 5v14", "M5 12h14"],
  abajo: ["M7 10l5 5 5-5"],
  probar: ["M7 4.5v15l12.5-7.5z"],
};
const Icono = ({ nombre }) => html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconos[nombre].map((d) => html`<path d=${d} />`)}</svg>`;

function Herramienta({ id, icono, ayuda, atajo }) {
  const activa = ui.herramienta === id;
  return html`<button type="button" class=${`lz-herr ${activa ? "lz-activo" : ""}`} aria-label=${ayuda} aria-pressed=${activa}
    data-ayuda=${`${ayuda}   ${atajo}`} onClick=${() => usar(id)}><${Icono} nombre=${icono} /></button>`;
}

function opcionesZoom() {
  return [
    { texto: "Acercar", atajo: "Ctrl +", hacer: () => zoomCentro(1.25) },
    { texto: "Alejar", atajo: "Ctrl −", hacer: () => zoomCentro(0.8) },
    "-",
    { texto: "Ver todo", atajo: "Mayús 1", hacer: verTodo },
    { texto: "Zoom a la pantalla elegida", atajo: "Mayús 2", hacer: () => zoomA(ui.elegido), desactivada: !ui.elegido },
    "-",
    { texto: "50 %", atajo: "", hacer: () => zoomPorcentaje(50) },
    { texto: "100 %", atajo: "Mayús 0", hacer: () => zoomPorcentaje(100) },
    { texto: "200 %", atajo: "", hacer: () => zoomPorcentaje(200) },
  ];
}

function Herramientas() {
  return html`<div class="lz-ui lz-herramientas" role="toolbar" aria-label="Herramientas del tablero">
    <${Herramienta} id="mover" icono="mover" ayuda="Mover y elegir pantalla" atajo="V" />
    <${Herramienta} id="mano" icono="mano" ayuda="Mano: arrastrar el tablero" atajo="H" />
    <${Herramienta} id="senalar" icono="senalar" ayuda="Señalar un elemento para Claude" atajo="S" />
    <span class="lz-herr-sep"></span>
    <button type="button" class="lz-herr" aria-label="Alejar" data-ayuda="Alejar   Ctrl −" onClick=${() => zoomCentro(0.8)}><${Icono} nombre="menos" /></button>
    <div class="lz-zoom-caja">
      <button type="button" class="lz-herr lz-herr-zoom" aria-haspopup="menu" aria-expanded=${ui.menuZoom}
        onClick=${() => { ui.menuZoom = !ui.menuZoom; pintarInterfaz(); }}>
        ${Math.round(vista.z * 100)} %<${Icono} nombre="abajo" />
      </button>
      ${ui.menuZoom && html`<div class="lz-menu" role="menu">
        ${opcionesZoom().map((o) => o === "-"
          ? html`<hr />`
          : html`<button type="button" role="menuitem" disabled=${o.desactivada}
              onClick=${() => { ui.menuZoom = false; o.hacer(); pintarInterfaz(); }}><span>${o.texto}</span><kbd>${o.atajo}</kbd></button>`)}
      </div>`}
    </div>
    <button type="button" class="lz-herr" aria-label="Acercar" data-ayuda="Acercar   Ctrl +" onClick=${() => zoomCentro(1.25)}><${Icono} nombre="mas" /></button>
    <span class="lz-herr-sep"></span>
    <button type="button" class="lz-herr" aria-label="Probar" data-ayuda=${ui.elegido ? "Probar la pantalla elegida   Intro" : "Probar   Intro"} onClick=${probar}><${Icono} nombre="probar" /></button>
  </div>`;
}

// Panel de la pantalla elegida.
function Ficha() {
  const marco = ui.elegido;
  if (!marco) return null;
  const ancla = marco.dataset.ancla;
  const { pantalla, estado } = fichas.get(ancla);
  const historias = historiasDe(indice, ancla);
  return html`<aside class="lz-ui lz-ficha" aria-label="Pantalla elegida">
    <strong>${pantalla.nombre}</strong>
    <span class="lz-tenue">${estado.nombre} · ${marco.dataset.tamano}</span>
    <div class="lz-ficha-ancla">
      <code title="El enlace que pone la historia en screens">${ancla}</code>
      <button type="button" class="lz-boton-ficha" onClick=${(e) => copiar(ancla, e.currentTarget)}>Copiar</button>
    </div>
    ${historias.length
      ? html`<ul class="lz-ficha-historias">${historias.map((h) => html`<li><span class="lz-historia">${h}</span> ${indice.historias?.[h] ?? ""}</li>`)}</ul>`
      : html`<span class="lz-tenue">Ninguna historia usa esta pantalla todavía.</span>`}
    <div class="lz-ficha-acciones">
      <button type="button" class="lz-boton-ficha lz-primario" onClick=${probar}>Probar</button>
      <button type="button" class="lz-boton-ficha" onClick=${() => zoomA(marco)}>Encuadrar</button>
    </div>
  </aside>`;
}

async function copiar(texto, boton) {
  try {
    await navigator.clipboard.writeText(texto);
    boton.textContent = "Copiado";
  } catch {
    boton.textContent = "No se pudo";
  }
  setTimeout(() => (boton.textContent = "Copiar"), 1500);
}

const contenedorHerramientas = document.getElementById("lz-herramientas");
const contenedorFicha = document.getElementById("lz-panel");
function pintarInterfaz() {
  render(html`<${Herramientas} />`, contenedorHerramientas);
  render(html`<${Ficha} />`, contenedorFicha);
}

raiz.dataset.herramienta = ui.herramienta;
if (vista) aplicar();
else verTodo();

// --- Rueda: desplazar, o zoom con Ctrl ----------------------------------------
// Se escucha en toda la página: así Ctrl + rueda nunca amplía la página entera,
// aunque el cursor esté sobre una barra.
const pixeles = (evento, delta) => delta * (evento.deltaMode === 1 ? 16 : evento.deltaMode === 2 ? lienzo.clientHeight : 1);
function alGirarRueda(evento) {
  const caja = lienzo.getBoundingClientRect();
  const dentro = evento.clientY >= caja.top && !evento.target?.closest?.(".lz-herramientas, .lz-ficha");
  if (evento.ctrlKey || evento.metaKey) {
    evento.preventDefault();
    const factor = Math.min(Math.max(Math.exp(-pixeles(evento, evento.deltaY) * 0.0025), 0.5), 2);
    if (dentro) zoomEn(evento.clientX - caja.left, evento.clientY - caja.top, factor);
    else zoomCentro(factor);
  } else if (dentro) {
    evento.preventDefault();
    const dx = pixeles(evento, evento.shiftKey ? evento.deltaY : evento.deltaX);
    const dy = evento.shiftKey ? 0 : pixeles(evento, evento.deltaY);
    vista = { ...vista, x: vista.x - dx, y: vista.y - dy };
    aplicar();
  }
}
window.addEventListener("wheel", alGirarRueda, { passive: false });

// --- Ratón: arrastrar mueve el tablero; con Mover, un clic elige pantalla ------
let arrastre = null;
// Que el navegador no empiece a seleccionar texto ni a arrastrar elementos.
lienzo.addEventListener("mousedown", (evento) => evento.preventDefault());
lienzo.addEventListener("dragstart", (evento) => evento.preventDefault());
lienzo.addEventListener("pointerdown", (evento) => {
  if (evento.button !== 0 && evento.button !== 1) return;
  evento.preventDefault();
  window.getSelection()?.removeAllRanges();
  cerrarMenu();
  arrastre = {
    x: evento.clientX, y: evento.clientY, vx: vista.x, vy: vista.y,
    movido: false, boton: evento.button, marco: evento.target.closest(".lz-marco"),
  };
  lienzo.setPointerCapture(evento.pointerId);
});
lienzo.addEventListener("pointermove", (evento) => {
  if (!arrastre) return;
  const dx = evento.clientX - arrastre.x;
  const dy = evento.clientY - arrastre.y;
  if (!arrastre.movido && Math.hypot(dx, dy) < 4) return;
  arrastre.movido = true;
  lienzo.classList.add("lz-arrastrando");
  vista = { ...vista, x: arrastre.vx + dx, y: arrastre.vy + dy };
  aplicar();
});
lienzo.addEventListener("pointerup", () => {
  if (arrastre && !arrastre.movido && arrastre.boton === 0 && ui.herramienta === "mover" && !ui.espacio) elegir(arrastre.marco);
  soltar();
});
lienzo.addEventListener("pointercancel", soltar);
function soltar() {
  arrastre = null;
  lienzo.classList.remove("lz-arrastrando");
}

// Doble clic en una pantalla: probarla en el prototipo.
mundo.addEventListener("dblclick", (evento) => {
  const marco = evento.target.closest(".lz-marco");
  if (marco && ui.herramienta !== "senalar") location.href = `marco.html#${marco.dataset.ancla}`;
});

// Un clic fuera del menú de zoom lo cierra.
document.addEventListener("pointerdown", (evento) => {
  if (ui.menuZoom && !evento.target.closest(".lz-zoom-caja")) cerrarMenu();
}, true);

// --- Teclado -------------------------------------------------------------------
window.addEventListener("keydown", alPulsarTecla);
window.addEventListener("keyup", alSoltarTecla);

function alPulsarTecla(evento) {
  const ctrl = evento.ctrlKey || evento.metaKey;
  if (ctrl) {
    // Ctrl + y Ctrl − acercan y alejan el tablero, no la página; Ctrl 0 lo ajusta a la ventana.
    if (evento.key === "+" || evento.key === "=") zoomCentro(1.25);
    else if (evento.key === "-") zoomCentro(0.8);
    else if (evento.key === "0") verTodo();
    else return;
    evento.preventDefault();
    return;
  }
  if (evento.altKey) return;
  if (evento.code === "Space") {
    // Espacio mantenido: mano temporal, con cualquier herramienta.
    evento.preventDefault();
    if (!evento.repeat) {
      ui.espacio = true;
      raiz.classList.add("lz-espacio");
    }
    return;
  }
  if (evento.shiftKey) {
    if (evento.code === "Digit1") verTodo();
    else if (evento.code === "Digit2") zoomA(ui.elegido);
    else if (evento.code === "Digit0") zoomPorcentaje(100);
    else return;
    evento.preventDefault();
    return;
  }
  const tecla = evento.key.toLowerCase();
  if (tecla === "v") usar("mover");
  else if (tecla === "h") usar("mano");
  else if (tecla === "s") usar("senalar");
  else if (tecla === "enter") probar();
  else if (tecla === "escape") {
    if (ui.menuZoom) cerrarMenu();
    else if (ui.herramienta !== "mover") usar("mover");
    else elegir(null);
  } else return;
  evento.preventDefault();
}

function alSoltarTecla(evento) {
  if (evento.code !== "Space") return;
  ui.espacio = false;
  raiz.classList.remove("lz-espacio");
}

// --- Marcos: se cargan al entrar en pantalla y crecen con su contenido --------
const observador = new IntersectionObserver(
  (entradas) => {
    for (const entrada of entradas) {
      if (!entrada.isIntersecting) continue;
      const marco = entrada.target;
      marco.src = marco.dataset.src;
      observador.unobserve(marco);
    }
  },
  { root: lienzo, rootMargin: "300px" },
);
for (const marco of marcos) {
  observador.observe(marco);
  marco.addEventListener("load", () =>
    marco.contentWindow.postMessage({ tipo: "lz-seleccion", activa: ui.herramienta === "senalar" }, location.origin),
  );
}

window.addEventListener("message", (evento) => {
  if (evento.origin !== location.origin) return;
  const marco = marcos.find((m) => m.contentWindow === evento.source);
  if (evento.data?.tipo === "lz-alto" && marco) {
    const alto = Math.max(Number(marco.getAttribute("height")), Math.ceil(evento.data.alto));
    if (Math.abs(alto - marco.offsetHeight) > 1) marco.style.height = `${alto}px`;
  }
  if (evento.data?.tipo === "lz-seleccionado") avisar(evento.data.info);
  // Teclas y rueda que llegan desde dentro de una pantalla (con Señalar activo).
  const sinEfecto = { preventDefault() {} };
  if (evento.data?.tipo === "lz-tecla") alPulsarTecla({ ...evento.data.tecla, ...sinEfecto });
  if (evento.data?.tipo === "lz-tecla-suelta") alSoltarTecla({ ...evento.data.tecla, ...sinEfecto });
  if (evento.data?.tipo === "lz-rueda" && marco) {
    // Coordenadas de dentro de la pantalla → coordenadas del tablero.
    const r = marco.getBoundingClientRect();
    const escala = r.width / Number(marco.getAttribute("width"));
    const { clientX, clientY, ...resto } = evento.data.rueda;
    alGirarRueda({ ...resto, ...sinEfecto, clientX: r.left + clientX * escala, clientY: r.top + clientY * escala });
  }
});

// --- Aviso de lo que se ha señalado -------------------------------------------
const caja = document.getElementById("lz-aviso");
let ocultar;
function avisar(info) {
  const { que, donde } = resumen(info);
  render(html`<strong>${que}</strong><small>${donde} · ya puedes decirle a Claude «esto…»</small>`, caja);
  caja.hidden = false;
  clearTimeout(ocultar);
  ocultar = setTimeout(() => (caja.hidden = true), 8000);
}

escucharCambios(() => location.reload());
