// Modo selección: la diseñadora hace clic en un elemento y su sesión de Claude sabe qué es «esto».
// Lo que se señala se manda al servidor, que lo guarda en .seleccion.json.

let activa = false;
let resaltado = null;
let describirPantalla = () => ({});
let alSeleccionar = () => {};

export function prepararSeleccion({ pantalla, avisar }) {
  describirPantalla = pantalla;
  alSeleccionar = avisar;
  document.addEventListener("mouseover", alPasar, true);
  document.addEventListener("mousedown", bloquear, true);
  document.addEventListener("click", alPulsar, true);
}

export function activarSeleccion(valor) {
  activa = valor;
  document.documentElement.classList.toggle("lz-seleccionando", activa);
  if (!activa) quitarResaltado();
}

export const seleccionActiva = () => activa;

const esDelLienzo = (el) => el.closest?.(".lz-ui");

function alPasar(evento) {
  if (!activa || esDelLienzo(evento.target)) return;
  quitarResaltado();
  resaltado = evento.target;
  resaltado.classList?.add("lz-resaltado");
}

function quitarResaltado() {
  resaltado?.classList?.remove("lz-resaltado");
  resaltado = null;
}

function bloquear(evento) {
  if (activa && !esDelLienzo(evento.target)) evento.preventDefault();
}

function alPulsar(evento) {
  if (!activa || esDelLienzo(evento.target)) return;
  evento.preventDefault();
  evento.stopPropagation();
  const info = { ...describirPantalla(), ...describir(evento.target) };
  fetch("__seleccion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(info) }).catch(() => {});
  alSeleccionar(info);
}

function describir(el) {
  const componentes = [];
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.dataset?.c) componentes.unshift(n.dataset.v ? `${n.dataset.c} (${n.dataset.v})` : n.dataset.c);
  }
  const texto = (el.innerText || el.value || el.getAttribute?.("placeholder") || el.getAttribute?.("aria-label") || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return { componentes, elemento: el.tagName.toLowerCase(), texto, ruta: rutaCss(el) };
}

function rutaCss(el) {
  const partes = [];
  for (let n = el; n && n !== document.body && partes.length < 6; n = n.parentElement) {
    let parte = n.tagName.toLowerCase();
    const clases = [...(n.classList ?? [])].filter((c) => !c.startsWith("lz-"));
    if (clases.length) parte += "." + clases.join(".");
    const iguales = n.parentElement ? [...n.parentElement.children].filter((h) => h.tagName === n.tagName) : [];
    if (iguales.length > 1) parte += `:nth-of-type(${iguales.indexOf(n) + 1})`;
    partes.unshift(parte);
  }
  return partes.join(" > ");
}

// Texto corto para avisar en pantalla de lo que se ha seleccionado.
export function resumen(info) {
  const quien = info.componentes?.at(-1) ?? info.elemento;
  const texto = info.texto ? ` «${info.texto}»` : "";
  return { que: `${quien}${texto}`, donde: info.nombre ?? info.pantalla };
}
