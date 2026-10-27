// Todos los componentes, y la lista que pinta la biblioteca.
import * as aviso from "./Aviso.js";
import * as boton from "./Boton.js";
import * as cabecera from "./Cabecera.js";
import * as campo from "./Campo.js";
import * as cifra from "./Cifra.js";
import * as etiqueta from "./Etiqueta.js";
import * as icono from "./Icono.js";
import * as panel from "./Panel.js";
import * as pestanas from "./Pestanas.js";
import * as tabla from "./Tabla.js";
import * as tarjeta from "./Tarjeta.js";
import * as vacio from "./Vacio.js";

export const { Aviso } = aviso;
export const { Boton } = boton;
export const { Cabecera } = cabecera;
export const { Campo } = campo;
export const { Cifra, Cifras } = cifra;
export const { Etiqueta } = etiqueta;
export const { Icono } = icono;
export const { Panel } = panel;
export const { Pestanas } = pestanas;
export const { Tabla } = tabla;
export const { Tarjeta } = tarjeta;
export const { Vacio } = vacio;

// Panel y Cabecera no salen en la biblioteca: se ven en el tablero, dentro de cada pantalla.
export const biblioteca = [
  { nombre: "Botón", componente: "Boton", ejemplos: boton.ejemplos },
  { nombre: "Campo", componente: "Campo", ejemplos: campo.ejemplos },
  { nombre: "Etiqueta de estado", componente: "Etiqueta", ejemplos: etiqueta.ejemplos },
  { nombre: "Cifra", componente: "Cifra", ejemplos: cifra.ejemplos },
  { nombre: "Pestañas", componente: "Pestanas", ejemplos: pestanas.ejemplos },
  { nombre: "Tabla", componente: "Tabla", ejemplos: tabla.ejemplos },
  { nombre: "Aviso", componente: "Aviso", ejemplos: aviso.ejemplos },
  { nombre: "Vacío", componente: "Vacio", ejemplos: vacio.ejemplos },
  { nombre: "Tarjeta", componente: "Tarjeta", ejemplos: tarjeta.ejemplos },
  { nombre: "Iconos", componente: "Icono", ejemplos: icono.ejemplos },
];
