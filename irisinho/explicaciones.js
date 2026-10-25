// Notas de Irisinho bajo cada opción: QUÉ está eligiendo el cliente y si le conviene para SU PDF (24-oct-2026).
// Petición de Javi: «que sepa lo que está eligiendo, si es bueno o no para su pedido, y si no, que le aconseje la otra
// opción y por qué; escueto pero entendible». Solo datos de la tienda (su web y su FAQ) y del análisis del PDF; las cifras,
// de su calculadora (precioCon). Nada de promesas: si algo depende de la tienda, se dice.
// 25-oct (Javi): además de «esto te va bien», si otra opción también le aporta algo (y deja más a la tienda), se le ofrece
// con amabilidad: «extra» = {texto, accion?}. Solo cuando de verdad tiene sentido para su PDF; nunca en vez de un aviso.
// 25-oct, segunda vuelta (Javi: «quita lo de que el B/N es lo más barato; que la gente gaste un poco más sin engañarle;
// textos más claros y fáciles de leer»): frases cortas en positivo, nada de «lo más barato», y no se proponen opciones
// más baratas salvo para evitar un error (A3 con un PDF A4, cartulina o fotográfico para un documento entero…).
// 25-oct, cuarta vuelta (Javi: «eso de 10,5 pt, ¿qué es?; la gente tiene que entenderlo; explica mejor la hoja y las
// páginas por cara»): la letra se describe con palabras (como en tu PDF, pequeña, muy pequeña), nunca en puntos.

export const CAMPOS_CON_NOTA = ["paperSize", "paperType", "printType", "printForm", "orientation", "pagesPerSide", "finishType", "boundType", "encuadernacion", "boundPages"];

// Consejo en bocadillo que ya cubre la nota de esa elección (para no decir lo mismo dos veces).
const TEMAS = {
  finishType: { "sin-acabado": "sueltas", grapado: "grapa", encuadernado: "tomos" },
  printType: { "blanco-negro": "bn-fotos", "color-envio": "color-texto", color: "color-texto", "color-pro": "color-texto" },
  printForm: { "una-cara": "doble-cara" },
};
export function temaDe(campo, valor) {
  if (campo === "orientation") return "apaisado";
  if (campo === "pagesPerSide") return "letra";
  return TEMAS[campo]?.[valor] || null;
}

// Hueco de cada página en la hoja (mm, sobre A4), según sus iconos: 2_vertical = una encima de otra (hoja vertical),
// 2_horizontal = una al lado de otra (hoja horizontal), 4_horizontal = cuadrícula en hoja horizontal.
const HUECOS = { "1_vertical": [210, 297], "1_horizontal": [297, 210], "2_vertical": [210, 148.5], "2_horizontal": [148.5, 210], "4_horizontal": [148.5, 105] };
const PT_A_MM = 25.4 / 72;

// Cuánto se reduce una página del PDF al meterla en su hueco (se supone que se gira si así cabe mejor).
export function escalaPagina(pps, paperSize, anchoPt, altoPt) {
  const h = HUECOS[pps];
  if (!h || !anchoPt || !altoPt) return null;
  const f = paperSize === "A3" ? Math.SQRT2 : 1;
  const [cw, ch] = [h[0] * f, h[1] * f];
  const [pw, ph] = [anchoPt * PT_A_MM, altoPt * PT_A_MM];
  return Math.max(Math.min(cw / pw, ch / ph), Math.min(cw / ph, ch / pw));
}

// Orientación de hoja ideal para el PDF según las páginas por cara.
export function hojaIdeal(paginaApaisada, pps) {
  const n = parseInt(pps, 10);
  if (n === 4) return "horizontal";
  if (n === 2) return paginaApaisada ? "vertical" : "horizontal";
  return paginaApaisada ? "horizontal" : "vertical";
}

// Qué es cada opción, en una frase corta y clara (sin punto final: se pone al pintar).
const QUE = {
  paperSize: { A4: "El folio de siempre (21 × 29,7 cm)", A3: "El doble de un folio (29,7 × 42 cm), para planos y carteles" },
  paperType: {
    normal: "El papel de toda la vida para apuntes y trabajos",
    premium: "Más grueso y suave al tacto, y se transparenta menos",
    cartulina: "Cartulina blanca y rígida, la de las portadas",
    fotografico: "Papel fotográfico con brillo: los colores al máximo",
  },
  printType: {
    "blanco-negro": "Todo en negro y tonos de gris",
    "color-envio": "Color con tarifa especial para envíos a casa (no se recoge en tienda)",
    color: "Impresión a todo color",
    "color-pro": "El color de más calidad de la tienda",
  },
  printForm: { "una-cara": "Se imprime solo por delante; la parte de atrás queda en blanco", "doble-cara": "Se imprime por delante y por detrás de cada hoja" },
  pagesPerSide: {
    "1_vertical": "Cada página de tu PDF ocupa una cara entera del folio, a tamaño completo",
    "1_horizontal": "Cada página de tu PDF ocupa una cara entera del folio, a tamaño completo",
    "2_vertical": "Dos páginas de tu PDF en cada cara del folio, una encima de otra y más pequeñas",
    "2_horizontal": "Dos páginas de tu PDF en cada cara del folio, una al lado de otra y más pequeñas",
    "4_horizontal": "Cuatro páginas de tu PDF en cada cara del folio, en tamaño pequeño",
  },
  finishType: {
    "sin-acabado": "Hojas sueltas, sin grapa ni espiral",
    grapado: "Una grapa en la esquina (hasta 50 hojas)",
    "dos-taladros": "Dos agujeros para tu carpeta de anillas",
    "cuatro-taladros": "Cuatro agujeros para archivadores",
    plastificado: "Cada hoja plastificada: rígida y protegida",
    encuadernado: "Espiral con tapa transparente y trasera negra",
  },
  boundType: { individual: "Cada archivo en su propia espiral", agrupados: "Todos tus archivos juntos en una espiral" },
};
const NOMBRE = {
  paperSize: { A4: "A4", A3: "A3" },
  paperType: { normal: "Estándar 80 g", premium: "Premium 90 g", cartulina: "Cartulina 180 g", fotografico: "Fotográfico 250 g" },
  printType: { "blanco-negro": "Blanco y negro", "color-envio": "Color Lowcost", color: "Color CMYK", "color-pro": "Color PRO" },
  printForm: { "una-cara": "Una cara", "doble-cara": "Doble cara" },
  orientation: {
    "vertical-derecha-izquierda": "Hoja vertical (de pie)", "vertical-abajo-arriba": "Hoja vertical (de pie)",
    "horizontal-abajo-arriba": "Hoja horizontal (tumbada)", "horizontal-derecha-izquierda": "Hoja horizontal (tumbada)",
  },
  pagesPerSide: { "1_vertical": "1 página por cara", "1_horizontal": "1 página por cara", "2_vertical": "2 páginas por cara", "2_horizontal": "2 páginas por cara", "4_horizontal": "4 páginas por cara" },
  finishType: { "sin-acabado": "Sin acabado", grapado: "Grapado", "dos-taladros": "Dos taladros", "cuatro-taladros": "Cuatro taladros", plastificado: "Plastificado", encuadernado: "Encuadernado en espiral" },
  boundType: { individual: "Individualmente", agrupados: "Agrupados" },
};
const PASO = {
  "vertical-derecha-izquierda": "como un libro", "vertical-abajo-arriba": "hacia arriba, como un bloc",
  "horizontal-abajo-arriba": "hacia arriba, como un calendario", "horizontal-derecha-izquierda": "como un libro apaisado",
};

// Devuelve {nombre, que, html, tipo: "bien"|"mejor"|"info", texto, accion?: {etiqueta, accion}, extra?: {texto, accion?}}
// o null. «mejor» = hay algo que le irá mejor (o un error que evitar); «extra» = también podría añadir algo.
// ctx: {estado, analisis (del archivo mayor o null), cambio (ultimoCambio), precioCon, euros, diferencia, esc, catalogo}
export async function explicar(campo, ctx) {
  const { estado, cambio, precioCon, euros, diferencia, esc } = ctx;
  const cfg = estado.config;
  const archivos = estado.archivos || [];
  const mayor = archivos.reduce((m, a) => (!m || a.hojas > m.hojas ? a : m), null);
  const r = ctx.analisis;
  const total = estado.precio?.total;
  const hay = !!mayor;
  const valor = campo === "encuadernacion" ? cfg.encuadernacion?.[cambio?.clave] : cfg[campo];
  const sinPdf = "Sube tu PDF y te digo cómo le queda.";
  const alt = async (cambios) => {
    const p = await precioCon(cambios);
    if (!p) return null;
    return { precio: p.precio, tomos: p.tomos, dif: total != null ? diferencia(p.precio, total) : null };
  };
  // Etiqueta del botón: «Premium 90 g · +0,64 €»
  const conPrecio = (a) => (a ? (a.dif && a.dif !== "mismo precio" ? ` · ${a.dif}` : a.dif ? "" : ` · ${euros(a.precio)}`) : "");
  const salida = (nombre, que, tipo, texto, accion, extra) => ({
    nombre, que, html: `<b>${esc(nombre)}</b>: ${que.charAt(0).toLowerCase() + que.slice(1)}.`, tipo, texto, accion: accion || null, extra: extra || null,
  });
  const cambiarA = (c, v) => ({ tipo: "cambiar", campo: c, valor: v });
  const fotos = r?.fraccionFoto;        // null mientras no se ha mirado el color
  const colorF = r?.fraccionColor;
  const casiTexto = colorF != null && colorF <= 0.08;
  const muchasFotos = fotos != null && fotos >= 0.25;
  const premium = async (texto) => {
    const a = await alt({ paperType: "premium" });
    return { etiqueta: `Premium 90 g${conPrecio(a)}`, accion: cambiarA("paperType", "premium"), texto };
  };

  switch (campo) {
    case "paperSize": {
      const que = QUE.paperSize[valor];
      if (!hay || !r) return salida(valor, que, "info", sinPdf);
      if (r.tamano === valor) return salida(valor, que, "bien", `Tu PDF es ${valor}: sale exacto, sin recortes.`);
      if (r.tamano === "A4" || r.tamano === "A3") {
        const a = await alt({ paperSize: r.tamano });
        return salida(valor, que, "mejor", valor === "A3"
          ? "Tu PDF es A4: en A3 saldría ampliado y podría verse borroso. Si no buscas un póster, mejor en A4."
          : "Tu PDF es A3: en A4 saldría reducido y la letra muy pequeña.",
        { etiqueta: `Imprimir en ${r.tamano}${conPrecio(a)}`, accion: cambiarA("paperSize", r.tamano) });
      }
      return salida(valor, que, "info", `Tu PDF tiene otro tamaño: se ajustará a la hoja ${valor}.`);
    }

    case "paperType": {
      const nombre = NOMBRE.paperType[valor];
      const que = QUE.paperType[valor];
      if (!hay) return salida(nombre, que, "info", sinPdf);
      if (valor === "normal") {
        if (muchasFotos) {
          const p = await premium();
          return salida(nombre, que, "mejor", "Tu PDF lleva muchas fotos: en Premium lucen más y no se transparentan.", p);
        }
        const p = await premium("Si es para entregar o presentar, el <b>Premium</b> da un acabado más profesional.");
        return salida(nombre, que, "bien", "Perfecto para leer y estudiar.", null, { texto: p.texto, accion: { etiqueta: p.etiqueta, accion: p.accion } });
      }
      if (valor === "premium") {
        return salida(nombre, que, "bien", muchasFotos ? "¡Buena elección! Tus fotos van a lucir mucho más." : "¡Buena elección! Queda con un acabado más profesional.");
      }
      if (valor === "cartulina") {
        if (mayor.paginas > 4) {
          const p = await premium();
          return salida(nombre, que, "mejor", `Son ${mayor.paginas} páginas y la cartulina es para portadas: el interior queda mejor en Premium.`, p);
        }
        return salida(nombre, que, "bien", "Perfecta para una portada o unas pocas hojas.");
      }
      if (valor === "fotografico") {
        if (muchasFotos && cfg.printType !== "blanco-negro") return salida(nombre, que, "bien", "¡Lo mejor que hay para tus fotos a color!");
        const p = await premium();
        return salida(nombre, que, "mejor", "El fotográfico es para fotos a color. Para tu PDF, el Premium queda genial.", p);
      }
      return null;
    }

    case "printType": {
      const nombre = NOMBRE.printType[valor];
      const que = QUE.printType[valor];
      if (!hay) return salida(nombre, que, "info", sinPdf);
      if (colorF == null) return salida(nombre, que, "info", "Estoy mirando el color de tu PDF: en un momento te digo.");
      const color = async (texto) => {
        const a = await alt({ printType: "color" });
        return a && { etiqueta: `Color${conPrecio(a)}`, accion: cambiarA("printType", "color"), texto };
      };
      if (valor === "blanco-negro") {
        if (fotos >= 0.15) return salida(nombre, que, "mejor", "Tu PDF tiene mucho color: en blanco y negro, las fotos y los gráficos pierden detalle y se ven apagados.", await color());
        if (!casiTexto) {
          const c = await color("Para que se vean esos colores, imprímelo <b>a color</b>.");
          return salida(nombre, que, "info", "Tu PDF tiene algo de color (títulos o gráficos) y saldrá en grises.", null, c && { texto: c.texto, accion: { etiqueta: c.etiqueta, accion: c.accion } });
        }
        return salida(nombre, que, "bien", "Tu PDF es texto en negro: saldrá nítido y bien contrastado.");
      }
      if (casiTexto) return salida(nombre, que, "bien", "Tu PDF es casi todo texto: el color hará resaltar títulos y gráficos.");
      const pro = muchasFotos && valor !== "color-pro" ? await alt({ printType: "color-pro" }) : null;
      const extraPro = pro && { texto: "Para fotos, el <b>Color PRO</b> da colores más fieles e intensos.", accion: { etiqueta: `Color PRO${conPrecio(pro)}`, accion: cambiarA("printType", "color-pro") } };
      if (valor === "color-envio") return salida(nombre, que, "bien", "Buena opción para tu PDF a color, con envío a casa.", null, extraPro);
      if (valor === "color") return salida(nombre, que, "bien", "¡Tus colores saldrán vivos!", null, extraPro);
      if (valor === "color-pro") return salida(nombre, que, "bien", muchasFotos ? "¡La máxima calidad para tus fotos!" : "La máxima calidad de color de la tienda.");
      return null;
    }

    case "printForm": {
      const nombre = NOMBRE.printForm[valor];
      const que = QUE.printForm[valor];
      if (!hay) return salida(nombre, que, "info", sinPdf);
      if (valor === "una-cara") {
        if (["cartulina", "fotografico"].includes(cfg.paperType)) return salida(nombre, que, "bien", "Es lo normal con este papel.");
        return salida(nombre, que, "bien", muchasFotos ? "Así las fotos no se transparentan y todo se ve más limpio." : "Se lee cómodo y te queda la parte de atrás para notas.");
      }
      if (cfg.paperType === "normal" && muchasFotos) {
        const p = await premium();
        return salida(nombre, que, "mejor", "Con tantas fotos, en papel de 80 g se transparentaría la otra cara. El Premium es más opaco.", p);
      }
      return salida(nombre, que, "bien", "Abulta la mitad y pesa menos.");
    }

    case "orientation": {
      const hoja = valor.startsWith("horizontal") ? "horizontal" : "vertical";
      const comoHoja = (h) => (h === "horizontal" ? "tumbada" : "de pie");
      const base = hoja === "horizontal" ? "La hoja tumbada, más ancha que alta" : "La hoja de pie, más alta que ancha, como un folio normal";
      const que = cfg.printForm === "doble-cara" ? `${base}. Para leer la otra cara, se pasa ${PASO[valor]}` : base;
      const nombre = NOMBRE.orientation[valor];
      if (!hay || !r) return salida(nombre, que, "info", sinPdf);
      if (r.fraccionApaisadas > 0.4 && r.fraccionApaisadas < 0.6) return salida(nombre, que, "info", "Tu PDF tiene páginas de pie y tumbadas: cada una se ajusta sola a la hoja.");
      const apaisado = r.fraccionApaisadas >= 0.6;
      const ideal = hojaIdeal(apaisado, cfg.pagesPerSide);
      const n = parseInt(cfg.pagesPerSide, 10);
      const paginas = apaisado ? "tumbadas (más anchas que altas)" : "de pie (más altas que anchas)";
      if (ideal === hoja) {
        return salida(nombre, que, "bien", n > 1 ? `Con ${n} páginas en cada cara, así caben bien y se aprovecha toda la hoja.` : `Las páginas de tu PDF son ${paginas}: así encajan perfectas en la hoja.`);
      }
      const valorIdeal = ideal === "horizontal" ? "horizontal-abajo-arriba" : "vertical-derecha-izquierda";
      return salida(nombre, que, "mejor", n > 1
        ? `Con ${n} páginas en cada cara, en la hoja ${comoHoja(hoja)} cada página saldría más pequeña de lo necesario.`
        : `Las páginas de tu PDF son ${paginas}: en la hoja ${comoHoja(hoja)} saldrían giradas y más pequeñas.`,
      { etiqueta: `Hoja ${ideal} (${comoHoja(ideal)})`, accion: cambiarA("orientation", valorIdeal) });
    }

    case "pagesPerSide": {
      const nombre = NOMBRE.pagesPerSide[valor];
      const n = parseInt(valor, 10);
      const que = QUE.pagesPerSide[valor];
      if (!hay || !r) return salida(nombre, que, "info", n > 1 ? "Sube tu PDF y te digo si se leerá bien." : sinPdf);
      if (!r.letra) return salida(nombre, que, "info", n > 1 ? "No puedo medir la letra de tu PDF: saldrá más pequeña, mira que se lea bien." : "Cada página sale a tamaño completo, como en tu PDF.");
      const esc0 = escalaPagina(valor, cfg.paperSize, r.anchoPt, r.altoPt) ?? (n === 4 ? 0.5 : n === 2 ? 0.707 : 1);
      const letra = r.letra * Math.min(1, esc0);
      if (n === 1) return salida(nombre, que, "bien", "La letra sale del mismo tamaño que en tu PDF: cómoda de leer.");
      if (letra < 6.5) {
        const menos = n === 4 ? (cfg.orientation.startsWith("horizontal") ? "2_horizontal" : "2_vertical") : (cfg.orientation.startsWith("horizontal") ? "1_horizontal" : "1_vertical");
        return salida(nombre, que, "mejor", "La letra saldría muy pequeña, más que la de un periódico: costaría leerla.",
          { etiqueta: n === 4 ? "2 páginas por cara" : "1 página por cara", accion: cambiarA("pagesPerSide", menos) });
      }
      if (letra < 8) return salida(nombre, que, "info", "La letra saldría pequeña: se lee, pero hay que mirarla de cerca.");
      return salida(nombre, que, "bien", "La letra saldría algo más pequeña que en tu PDF, pero se lee bien.");
    }

    case "finishType": {
      const nombre = NOMBRE.finishType[valor];
      const que = QUE.finishType[valor];
      if (!hay) return salida(nombre, que, "info", sinPdf);
      const h = mayor.hojas;
      const espiral = async (texto) => {
        const a = await alt({ finishType: "encuadernado" });
        return a && { texto, accion: { etiqueta: `Encuadernar${conPrecio(a)}`, accion: cambiarA("finishType", "encuadernado") } };
      };
      if (valor === "sin-acabado") {
        if (h >= 40) {
          const e = await espiral();
          return salida(nombre, que, "mejor", `Son ${h} hojas sueltas: en espiral no se desordenan ni se pierden.`, e?.accion);
        }
        let extra = null;
        if (h >= 10) extra = await espiral("Si es para entregar o para estudiar, en <b>espiral</b> queda como un libro.");
        else if (h >= 2) {
          const gr = await alt({ finishType: "grapado" });
          extra = gr && { texto: "Para que no se te mezclen, te las <b>grapamos</b> en la esquina.", accion: { etiqueta: `Grapar${conPrecio(gr)}`, accion: cambiarA("finishType", "grapado") } };
        } else {
          const pl = await alt({ finishType: "plastificado" });
          extra = pl && { texto: "Si se va a manosear o colgar, <b>plastificada</b> aguanta mucho más.", accion: { etiqueta: `Plastificar${conPrecio(pl)}`, accion: cambiarA("finishType", "plastificado") } };
        }
        return salida(nombre, que, "bien", `Bien para ${h} hoja${h === 1 ? "" : "s"}.`, null, extra);
      }
      if (valor === "grapado") {
        if (h > 50) {
          const e = await espiral();
          return salida(nombre, que, "mejor", `Tu documento tiene ${h} hojas y la grapa llega a 50: así no se puede grapar.`, e && { etiqueta: e.accion.etiqueta.replace("Encuadernar", "En espiral"), accion: e.accion.accion });
        }
        if (h === 1) return salida(nombre, que, "info", "Con una sola hoja no hace falta grapa.");
        const e = h >= 10 ? await espiral("Si quieres que quede más presentable, en <b>espiral</b> se abre del todo y no se rompe la esquina.") : null;
        return salida(nombre, que, "bien", `${h} hojas: se grapan sin problema.`, null, e);
      }
      if (valor === "dos-taladros" || valor === "cuatro-taladros") return salida(nombre, que, "bien", "Listo para tu carpeta o archivador.");
      if (valor === "plastificado") {
        if (h > 2) {
          return salida(nombre, que, "mejor", `Se plastificarían las ${h} hojas. Si solo quieres la portada plastificada, súbela como PDF aparte.`,
            { etiqueta: "Quitar plastificado", accion: cambiarA("finishType", "sin-acabado") });
        }
        return salida(nombre, que, "bien", "Perfecto para una hoja o una portada.");
      }
      if (valor === "encuadernado") {
        const tomos = estado.precio?.tomos || 1;
        if (tomos > 1) {
          const corte = Math.round(mayor.paginas / tomos);
          return salida(nombre, que, "mejor", `Son ${h} hojas: van en ${tomos} tomos (hasta 350 hojas cada uno). Dime por dónde partirlo.`,
            { etiqueta: tomos === 2 ? `Por la mitad (pág. ${corte})` : "En partes iguales", accion: { tipo: "comentario", texto: tomos === 2 ? `Dividir el documento por la página ${corte}.` : `Dividir el documento en ${tomos} partes iguales.` } });
        }
        return salida(nombre, que, "bien", "Queda como un libro y no se pierde ninguna hoja.", null,
          { texto: "En el siguiente paso puedes darle tu toque: <b>anillas o tapas de color</b> por +0,30 €." });
      }
      return null;
    }

    case "boundType": {
      const nombre = NOMBRE.boundType[valor];
      const que = QUE.boundType[valor];
      if (archivos.length < 2) return salida(nombre, que, "info", "Con un solo archivo da igual: es para cuando subes varios.");
      return salida(nombre, que, "bien", valor === "agrupados" ? `Tus ${archivos.length} archivos irán juntos en una espiral.` : `Cada uno de tus ${archivos.length} archivos irá en su espiral.`);
    }

    case "encuadernacion": {
      const clave = cambio?.clave;
      const cat = ctx.catalogo;
      if (clave === "colorFolio") return null;
      const item = clave === "anillas" ? cat?.rings?.find((x) => x.code === valor) : cat?.covers?.find((x) => x.code === valor);
      if (!item) return null;
      const extra = item.surcharge ? `+${euros(item.surcharge)}` : "sin recargo";
      if (clave === "anillas") {
        if (valor === "metalica-negra") return salida(item.name, "La anilla clásica, sin recargo", "bien", "Aguanta hasta 350 hojas por tomo.", null, { texto: "También la tienes en <b>colores</b> por +0,30 €: elige la que más te guste." });
        const h = hay ? Math.max(...archivos.map((a) => a.hojas)) : 0;
        return salida(item.name, `Anilla de color, ${extra}`, h > 200 ? "mejor" : "bien",
          h > 200 ? `Aguanta hasta 200 hojas y tu documento tiene ${h}: para tanto, la metálica.` : "¡Le da un toque muy chulo! Aguanta hasta 200 hojas.");
      }
      const lado = clave === "delantera" ? "Portada" : "Trasera";
      if (valor === "acetato-transparente") return salida(item.name, "Portada transparente, sin recargo", "bien", "Se ve tu primera página.", null, { texto: "Una <b>tapa de color</b> le da otro aire, por +0,30 €." });
      if (valor === "negra-grofada") return salida(item.name, "La trasera clásica, sin recargo", "bien", "La de la espiral de siempre.", null, { texto: "También la hay en <b>colores</b>, por +0,30 €." });
      return salida(item.name, `${lado} de color, ${extra}`, "bien", "¡Queda genial! Según disponibilidad en la tienda.");
    }

    case "boundPages": {
      const donde = { no: null, delante: "delante", detras: "detrás", ambos: "delante y detrás" }[valor];
      if (!donde) return null;
      return salida(`Folio extra ${donde}`, "Para proteger o separar el documento", "bien", "Blanco +0,03 € por folio; de color +0,05 €.");
    }
  }
  return null;
}
