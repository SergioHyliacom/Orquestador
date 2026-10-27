const formatoEuros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const formatoFecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });

export const euros = (n) => formatoEuros.format(n);
export const fecha = (iso) => formatoFecha.format(new Date(`${iso}T12:00:00`));
