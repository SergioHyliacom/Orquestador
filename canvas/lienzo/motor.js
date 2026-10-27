// Piezas comunes del lienzo: cargar áreas, historias y estados que faltan, y la recarga automática.

// Los estados que casi toda pantalla necesita. Una pantalla que no dibuja alguno
// lo declara en noAplica; si no, el tablero avisa de que falta.
export const ESTADOS_HABITUALES = [
  { id: "cargando", nombre: "Cargando" },
  { id: "vacia", nombre: "Vacía" },
  { id: "error", nombre: "Error" },
  { id: "sinPermiso", nombre: "Sin permiso" },
];

export async function cargarArea(id) {
  if (!/^[a-z0-9-]+$/.test(id ?? "")) throw new Error(`«${id}» no es un nombre de área válido`);
  try {
    return (await import(`../areas/${id}/area.js`)).default;
  } catch (error) {
    throw new Error(`No se pudo cargar el área «${id}»: ${error.message}`);
  }
}

export async function cargarAreas() {
  const { areas } = await import("../areas/index.js");
  return Promise.all(areas.map(cargarArea));
}

export function estadosQueFaltan(pantalla) {
  const dibujados = new Set(pantalla.estados.map((e) => e.id));
  const noAplica = new Set(pantalla.noAplica ?? []);
  return ESTADOS_HABITUALES.filter((e) => !dibujados.has(e.id) && !noAplica.has(e.id));
}

export async function cargarHistorias() {
  try {
    const respuesta = await fetch("historias.json", { cache: "no-cache" });
    if (respuesta.ok) return await respuesta.json();
  } catch {}
  return { historias: {}, pantallas: {} };
}

// Las historias que enlazan un estado: las que lo nombran a él y las que nombran su pantalla entera.
export function historiasDe(indice, ancla) {
  const pantallas = indice.pantallas ?? {};
  const pantalla = ancla.split("/").slice(0, 2).join("/");
  return [...new Set([...(pantallas[pantalla] ?? []), ...(pantallas[ancla] ?? [])])];
}

// Solo la página de arriba escucha: los marcos del tablero se recargan con ella.
// ?estatico la desactiva (para hacer capturas: la conexión abierta no deja terminar de cargar).
export function escucharCambios(alCambiar) {
  if (window.top !== window || new URLSearchParams(location.search).has("estatico")) return;
  const fuente = new EventSource("__recarga");
  fuente.onmessage = () => alCambiar();
}
