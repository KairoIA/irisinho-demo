// Precio de una configuración, siempre de la calculadora real de iriscopyshop.app (no inventamos precios).
// Lo usan la página, Irisinho y la API de Cloudflare (lib/comun.js), así que no toca `window` al cargarse.
//
// Dónde se pregunta (25-oct-2026, Javi: los domingos de fútbol las operadoras bloquean direcciones de Cloudflare y la
// demo no abre; hay una copia en GitHub Pages para enseñársela a Nacho):
//   - en Cloudflare Pages, a nuestra API (/api/precio), que guarda en caché las respuestas;
//   - en GitHub Pages, que solo sirve ficheros, el navegador pregunta directamente a su API (acepta cualquier origen).

import { CATALOGO } from "./catalogo.js";

export const API_PRECIOS = "https://api.iriscopyshop.app/api/v1/public/iriscopy/prices/print/line";

const FOLIOS = ["white", "blue", "green", "yellow", "red"];
const CODIGO = /^[a-z0-9-]{1,60}$/;

export class ErrorDatos extends Error {}

function elegir(lista, code) {
  const o = CATALOGO[lista].find((x) => x.code === code);
  if (!o) throw new ErrorDatos(`Opción no válida en ${lista}`);
  return o;
}

// Convierte la configuración de la demo ({paperSize:"A4", ...}, archivos) en la «línea» que espera su API.
export function lineaDesde(config, archivos) {
  if (!config || typeof config !== "object") throw new ErrorDatos("Falta la configuración");
  if (!Array.isArray(archivos) || archivos.length === 0 || archivos.length > 20) throw new ErrorDatos("Archivos no válidos");
  const files = archivos.map((a, i) => {
    const paginas = Number(a.paginas);
    if (!Number.isInteger(paginas) || paginas < 1 || paginas > 5000) throw new ErrorDatos("Páginas no válidas");
    return { id: i + 1, name: `archivo${i + 1}.pdf`, pages: paginas, colorMass: null, colorMassCalculated: false };
  });
  const copias = Number(config.copias ?? 1);
  if (!Number.isInteger(copias) || copias < 1 || copias > 500) throw new ErrorDatos("Copias no válidas");
  const tipo = elegir("printType", config.printType);
  const linea = {
    orientation: elegir("orientation", config.orientation ?? "vertical-derecha-izquierda"),
    finishType: elegir("finishType", config.finishType),
    pagesPerSide: elegir("pagesPerSide", config.pagesPerSide),
    printForm: elegir("printForm", config.printForm),
    printType: tipo,
    printTypeCover: tipo,
    paperType: elegir("paperType", config.paperType),
    paperSize: elegir("paperSize", config.paperSize),
    boundType: elegir("boundTypes", config.boundType ?? "individual"),
    boundPages: elegir("boundPages", config.boundPages ?? "no"),
    copiesQuantity: copias,
    additionalComments: "",
    files,
  };
  if (linea.finishType.code === "encuadernado") {
    const e = config.encuadernacion || {};
    for (const k of ["anillas", "delantera", "trasera"]) {
      if (!CODIGO.test(String(e[k] || ""))) throw new ErrorDatos("Encuadernación no válida");
    }
    linea.boundColors = {
      anillas: { code: e.anillas, type: "ring" },
      delantera: { code: e.delantera, type: "cover" },
      trasera: { code: e.trasera, type: "cover" },
    };
    const modo = linea.boundPages.code;
    const color = FOLIOS.includes(e.colorFolio) ? e.colorFolio : "white";
    linea.bindingSheets = {
      frontCount: modo === "delante" || modo === "ambos" ? 1 : 0,
      backCount: modo === "detras" || modo === "ambos" ? 1 : 0,
      frontColor: modo === "delante" || modo === "ambos" ? color : null,
    };
  }
  return linea;
}

// Lo que devuelve su API, en nuestro formato: {precio, notas, tomos} o {error, codigo}.
export function leerRespuesta(ok, datos) {
  return ok
    ? {
        precio: Number(datos.precio),
        notas: (datos.notas || []).map((n) => ({ texto: String(n.text || ""), pideComentario: !!n.require_comments })),
        tomos: Number(datos.details?.bindings || 0),
      }
    : { error: String(datos.message || "No se ha podido calcular el precio."), codigo: String(datos.code || "") };
}

// ¿Estamos en un sitio sin servidor propio (GitHub Pages)? Allí no hay /api: precios directos y chat apagado.
export function sinServidor() {
  return typeof location !== "undefined" && location.hostname.endsWith("github.io");
}

// Precio para la página e Irisinho. Lanza si no hay conexión; los datos que no valen vuelven como {error}.
export async function pedirPrecio(config, archivos, api = "/api") {
  if (!sinServidor()) {
    const r = await fetch(`${api}/precio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, archivos }),
    });
    return r.json();
  }
  let linea;
  try {
    linea = lineaDesde(config, archivos);
  } catch (e) {
    if (e instanceof ErrorDatos) return { error: e.message };
    throw e;
  }
  const r = await fetch(API_PRECIOS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line: linea, order: [linea] }),
  });
  let datos;
  try {
    datos = await r.json();
  } catch {
    return { error: "La calculadora de la tienda no responde ahora mismo." };
  }
  return leerRespuesta(r.ok, datos);
}
