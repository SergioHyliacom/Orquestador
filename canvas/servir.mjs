// Servidor local del canvas. Sin dependencias: solo Node.
// - Sirve los ficheros de esta carpeta.
// - Avisa al navegador cuando un fichero cambia, para que se recargue solo (/__recarga).
// - Guarda en .seleccion.json lo último que la diseñadora ha señalado (/__seleccion),
//   para que su sesión de Claude sepa a qué se refiere con «esto».
//
// Uso: node servir.mjs [--abrir]      Puerto: variable PORT (por defecto 4321)

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(fileURLToPath(import.meta.url));
const puerto = Number(process.env.PORT) || 4321;
const direccion = `http://localhost:${puerto}`;

const tipos = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".md": "text/plain; charset=utf-8",
};

const oyentes = new Set();

function recarga(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
  });
  res.write(": conectado\n\n");
  oyentes.add(res);
  req.on("close", () => oyentes.delete(res));
}

function seleccion(req, res) {
  const trozos = [];
  let tamano = 0;
  req.on("data", (trozo) => {
    trozos.push(trozo);
    tamano += trozo.length;
    if (tamano > 100_000) req.destroy();
  });
  req.on("end", () => {
    try {
      const datos = { ...JSON.parse(Buffer.concat(trozos).toString("utf8")), fecha: new Date().toISOString() };
      fs.writeFileSync(path.join(raiz, ".seleccion.json"), JSON.stringify(datos, null, 2) + "\n");
      const texto = datos.texto ? ` «${datos.texto}»` : "";
      console.log(`Seleccionado: ${datos.componentes?.at(-1) ?? datos.elemento}${texto} en ${datos.pantalla}`);
      res.writeHead(204).end();
    } catch {
      res.writeHead(400).end();
    }
  });
}

function fichero(req, res, url) {
  let ruta = decodeURIComponent(url.pathname);
  if (ruta.endsWith("/")) ruta += "index.html";
  // Nada que empiece por punto: ni .git ni .seleccion.json.
  if (ruta.split("/").some((parte) => parte.startsWith("."))) return noExiste(res, ruta);
  const destino = path.resolve(raiz, "." + ruta);
  if (!destino.startsWith(raiz + path.sep)) return noExiste(res, ruta);

  fs.stat(destino, (error, info) => {
    if (error || !info.isFile()) return noExiste(res, ruta);
    const etiqueta = `"${info.size}-${Math.round(info.mtimeMs)}"`;
    const cabeceras = {
      "Content-Type": tipos[path.extname(destino).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
      ETag: etiqueta,
    };
    if (req.headers["if-none-match"] === etiqueta) return res.writeHead(304, cabeceras).end();
    fs.createReadStream(destino).pipe(res.writeHead(200, cabeceras));
  });
}

function noExiste(res, ruta) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end(`No existe: ${ruta}`);
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, direccion);
  if (url.pathname === "/__recarga") return recarga(req, res);
  if (url.pathname === "/__seleccion" && req.method === "POST") return seleccion(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") return res.writeHead(405).end();
  fichero(req, res, url);
});

// Recarga automática: cualquier cambio, salvo ficheros y carpetas que empiezan por punto.
let espera;
fs.watch(raiz, { recursive: true }, (_evento, nombre) => {
  if (!nombre || nombre.split(/[\\/]/).some((parte) => parte.startsWith("."))) return;
  clearTimeout(espera);
  espera = setTimeout(() => {
    for (const oyente of oyentes) oyente.write(`data: ${nombre.replaceAll("\\", "/")}\n\n`);
  }, 120);
});
setInterval(() => {
  for (const oyente of oyentes) oyente.write(": latido\n\n");
}, 30_000);

servidor.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`El puerto ${puerto} está ocupado. Prueba con otro: PORT=4322 node servir.mjs`);
    process.exit(1);
  }
  throw error;
});

servidor.listen(puerto, "127.0.0.1", () => {
  console.log(`Canvas en ${direccion}`);
  if (process.argv.includes("--abrir")) {
    const orden =
      process.platform === "win32" ? `start "" "${direccion}"` : process.platform === "darwin" ? `open "${direccion}"` : `xdg-open "${direccion}"`;
    exec(orden);
  }
});
