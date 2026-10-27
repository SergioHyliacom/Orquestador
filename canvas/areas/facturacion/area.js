import lista from "./lista-facturas.js";
import nueva from "./nueva-factura.js";

export default {
  id: "facturacion",
  nombre: "Facturación",
  descripcion: "Consultar las facturas emitidas y emitir una nueva",
  // Tamaños a los que se dibuja cada pantalla en el tablero.
  tamanos: [
    { id: "escritorio", nombre: "Escritorio", ancho: 1440, alto: 900 },
    { id: "movil", nombre: "Móvil", ancho: 390, alto: 844 },
  ],
  pantallas: [lista, nueva],
};
