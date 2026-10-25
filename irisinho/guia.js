// Guía paso a paso de Irisinho (24-oct-2026, petición de Javi): en vez de soltar consejos de golpe, lleva al cliente por
// partes: 1) sube el PDF, 2) lo lee y dice qué es, 3) un paso por bloque del configurador (tamaño, papel, color, caras,
// hoja, páginas por cara, acabado y colores de la espiral), explicando lo marcado y si le conviene, 4) resumen y pago.
// El cliente puede tocar cualquier opción cuando quiera: la guía salta a ese paso. «Prefiero hacerlo solo» la apaga.
//
// Cómo se ve (25-oct, igual en el móvil y en el ordenador): encima de cada sección, Irisinho con su bocadillo diciendo de
// qué va (GLOBO) y señalando; debajo de las opciones, la tarjeta con lo elegido, su opinión y, si toca, «Mi consejo» o
// «Y si quieres…» con su botón (tarjeta.js). Reacciona a cada elección: asiente y 👍 si le va bien, niega y señala si hay
// algo mejor, y señala la propuesta «también»; al terminar, voltereta y confeti.
import { explicar } from "./explicaciones.js";
import { latirBoton, ponerEscenario, ponerTarjeta, quitarEscenario, quitarTarjeta, verTarjeta } from "./tarjeta.js";

const NOMBRES = {
  paperType: { normal: "Estándar 80 g", premium: "Premium 90 g", cartulina: "Cartulina 180 g", fotografico: "Fotográfico 250 g" },
  printType: { "blanco-negro": "Blanco y negro", "color-envio": "Color Lowcost", color: "Color CMYK", "color-pro": "Color PRO" },
  printForm: { "una-cara": "Una cara", "doble-cara": "Doble cara" },
  finishType: { "sin-acabado": "Sin acabado", grapado: "Grapado", "dos-taladros": "Dos taladros", "cuatro-taladros": "Cuatro taladros", plastificado: "Plastificado", encuadernado: "Espiral" },
};
// Lo que dice Irisinho en su bocadillo encima de cada sección: de qué va, corto y en positivo (cabe en dos líneas).
const GLOBO = {
  subida: "¡Hola! Sube tu PDF y lo dejamos perfecto juntos",
  leyendo: "Dame un segundo, estoy leyendo tu PDF…",
  listo: "¡Ya lo he leído! Vamos paso a paso",
  paperSize: "Primero, el tamaño de la hoja",
  paperType: "Ahora el papel: cuantos más gramos, más grueso",
  printType: "¿Color o blanco y negro? Te digo qué luce más",
  printForm: "¿Por una cara o por las dos?",
  orientation: "¿Cómo va la hoja? De pie o tumbada",
  pagesPerSide: "¿Cuántas páginas de tu PDF por cara?",
  finishType: "Y el acabado: sueltas, grapa, espiral…",
  encuadernacion: "¡Elige los colores de tu espiral!",
  final: "¡Listo para imprimir!",
};
const MARCA = { bien: "✓", mejor: "!", info: "i" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export class Guia {
  constructor(ia, u) {
    this.ia = ia;          // el componente Irisinho
    this.u = u;            // utilidades: {euros, esc, base, esMovil}
    this.activa = true;
    this.pausada = false;
    this.paso = "subida";
    this.turno = 0;
  }

  pasos() {
    const lista = ["paperSize", "paperType", "printType", "printForm", "orientation", "pagesPerSide", "finishType"];
    if (this.ia.estado?.config?.finishType === "encuadernado") lista.push("encuadernacion");
    return lista;
  }
  esPaso(campo) {
    return this.pasos().includes(campo);
  }
  puedeVerse() {
    const ia = this.ia;
    return this.activa && !this.pausada && !ia.chat.abierto && ia.estado?.pagina !== "carrito" && !(ia.actual && !ia.actual.guia);
  }
  mayor() {
    const a = this.ia.estado?.archivos || [];
    return a.reduce((m, x) => (!m || x.hojas > m.hojas ? x : m), null);
  }
  // Alto del escenario de Irisinho: lo justo para que quepa él (y su bocadillo a su lado).
  altoEscenario() {
    return Math.round(this.ia.t * 0.9);
  }

  // ------------------------------------------------------------------ navegación
  ir(paso, opciones = { desplazar: true }) {
    this.paso = paso;
    return this.pintar(opciones);
  }
  siguiente() {
    const p = this.pasos();
    const i = p.indexOf(this.paso);
    if (this.paso === "listo") return this.ir(p[0]);
    if (i >= 0 && i < p.length - 1) return this.ir(p[i + 1]);
    return this.ir("final");
  }
  atras() {
    const p = this.pasos();
    const i = p.indexOf(this.paso);
    if (this.paso === "final") return this.ir(p[p.length - 1]);
    if (i > 0) return this.ir(p[i - 1]);
    return this.ir("listo");
  }
  pausar() {
    this.pausada = true;
    this.ocultar();
    this.ia.pintarEtiqueta();
  }
  reanudar() {
    this.pausada = false;
    this.pintar({ desplazar: true });
  }
  salir() {
    this.activa = false;
    this.ocultar();
    try { localStorage.setItem("irisinho_guia", "no"); } catch { /* nada */ }
    this.ia.pintarEtiqueta();
    this.ia.programarRevision(1500);
  }
  ocultar() {
    const ia = this.ia;
    if (!ia.actual?.guia) return;
    ia.actual = null;
    ia.anclado = null;
    ia.bocadillo.classList.remove("visible");
    ia.hoja.classList.remove("visible");
    quitarTarjeta();
    quitarEscenario();
    ia.mascota.classList.remove("oculto");
    setTimeout(() => { if (!ia.actual) { ia.bocadillo.hidden = true; ia.hoja.hidden = true; } }, 300);
    ia.ponerGloboSeccion(null);
    ia.pose("reposo");
    ia.colocar(true);
  }

  // ------------------------------------------------------------------ lo que dice la página
  alSubirArchivo() {
    if (this.activa && ["subida", "listo", "leyendo"].includes(this.paso)) this.ir("leyendo", { desplazar: false });
  }
  alTerminarAnalisis() {
    if (!this.activa) return;
    if (this.paso === "leyendo") this.ir("listo", { desplazar: false });
    else if (this.esPaso(this.paso) || this.paso === "final") this.pintar({ desplazar: false });
  }
  alCambiarEstado(prev) {
    if (!this.activa) return;
    const e = this.ia.estado;
    if (e.pagina === "carrito") { if (this.ia.actual?.guia) this.ocultar(); return; }
    if (prev?.pagina === "carrito") return this.pintar({ desplazar: false });
    if (!e.archivos?.length && !["subida"].includes(this.paso)) return this.ir("subida", { desplazar: false });
    const uc = e.ultimoCambio;
    if (uc && uc.n !== this.ultimoN) {
      this.ultimoN = uc.n;
      if (this.paso === "subida" || this.paso === "leyendo") return;
      if (uc.campo === "copias") return;
      if (uc.origen === "cliente" && this.esPaso(uc.campo) && uc.campo !== this.paso) {
        this.cambio = uc;
        return this.ir(uc.campo, { desplazar: false });
      }
      this.cambio = uc;
      return this.pintar({ desplazar: false });
    }
    // Precio nuevo (por ejemplo, tras subir otro archivo): el resumen final lo usa.
    if (this.paso === "final" && e.precio?.n !== prev?.precio?.n) this.pintar({ desplazar: false });
  }

  // ------------------------------------------------------------------ qué dice cada paso
  async contenido() {
    const ia = this.ia;
    const { euros, esc } = this.u;
    const e = ia.estado;
    const cfg = e.config;
    const mayor = this.mayor();
    const r = mayor ? ia.analisis.get(mayor.id) : null;
    const pasoFinal = this.pasos().at(-1);

    if (this.paso === "subida") {
      const otro = e.carrito?.lineas?.length > 0;
      return {
        titulo: otro ? "¿Otro documento?" : "¡Hola! Soy Irisinho",
        cuerpo: otro ? "Súbelo y lo configuramos igual, paso a paso. O ve al carrito para pagar."
          : "Te ayudo a elegir cada opción para que tu PDF quede perfecto. Súbelo aquí arriba o prueba con un ejemplo.",
        ancla: "subida", pose: "saluda", botones: [],
      };
    }
    if (this.paso === "leyendo") {
      return { titulo: "Leyendo tu PDF…", cuerpo: "Miro el tamaño, las páginas, el color y la letra.", ancla: "archivos", pose: "lupa", botones: [] };
    }
    if (this.paso === "listo") {
      const n = mayor?.paginas || 0;
      const chips = [`${n} página${n === 1 ? "" : "s"}`];
      if (r?.tamano && r.tamano !== "otro") chips.push(r.tamano);
      if (r) chips.push(r.fraccionApaisadas >= 0.6 ? "apaisado" : r.fraccionApaisadas <= 0.1 ? "vertical" : "vertical y apaisado");
      if (r?.escaneado) chips.push("escaneado");
      else if (r?.fraccionFoto >= 0.25) chips.push("muchas fotos y color");
      else if (r?.fraccionColor != null && r.fraccionColor <= 0.08) chips.push("texto en negro");
      else if (r?.fraccionColor != null) chips.push("algo de color");
      const varios = (e.archivos?.length || 0) > 1 ? ` y ${e.archivos.length - 1} archivo${e.archivos.length > 2 ? "s" : ""} más` : "";
      return {
        titulo: "¡Ya he leído tu PDF!",
        cuerpo: `<b>${esc(mayor?.nombre || "")}</b>${varios}<div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>Ahora vamos sección por sección y te digo qué le queda mejor.`,
        ancla: "archivos", pose: "celebra",
        botones: [{ etiqueta: "Empezar →", principal: true, accion: () => this.siguiente() }],
      };
    }
    if (this.paso === "final") {
      const tot = e.precio?.total;
      const resumen = [cfg.paperSize, NOMBRES.paperType[cfg.paperType], NOMBRES.printType[cfg.printType], NOMBRES.printForm[cfg.printForm], NOMBRES.finishType[cfg.finishType]];
      if (cfg.copias > 1) resumen.push(`${cfg.copias} copias`);
      const botones = [];
      let extra = "";
      const pide = (e.precio?.notas || []).some((x) => x.pideComentario) && !String(cfg.comentario || "").trim();
      if (pide) {
        const corte = Math.round((mayor?.paginas || 0) / Math.max(2, e.precio?.tomos || 2));
        extra += `<div class="consejo mejor"><div class="consejo-etq">Falta un detalle</div><div class="consejo-txt">Va en varios tomos: dime por dónde partirlo.</div><button type="button" class="btn principal" data-b="${botones.length}">Por la mitad (pág. ${corte})</button></div>`;
        botones.push({ enCuerpo: true, accion: () => ia.ejecutar({ tipo: "comentario", texto: `Dividir el documento por la página ${corte}.` }) });
      }
      const tfg = mayor && /\b(tfg|tfm|tesis|trabajo[ _-]?fin)/i.test(mayor.nombre.replace(/_/g, " "));
      const conFotos = r?.fraccionFoto >= 0.25;
      if ((r?.escaneado || tfg || conFotos) && !e.carrito?.revision) {
        const por = r?.escaneado ? "Como es un escaneo" : tfg ? "Es tu TFG" : "Con tantas fotos";
        extra += `<div class="consejo tambien"><div class="consejo-etq">Para ir sobre seguro</div><div class="consejo-txt">${por}: por <b>1,90 €</b> una persona revisa márgenes e imágenes antes de imprimir.</div><button type="button" class="btn tambien" data-b="${botones.length}">Añadir revisión · 1,90 €</button></div>`;
        botones.push({ enCuerpo: true, accion: () => { ia.ejecutar({ tipo: "revision", valor: true }); ia.celebrar(); setTimeout(() => this.pintar({ desplazar: false }), 200); } });
      }
      const listo = tot != null && !pide && !e.precio?.cargando;
      botones.push({ etiqueta: "Añadir al carrito", deshabilitado: !listo, accion: () => ia.ejecutar({ tipo: "carrito" }) });
      botones.push({ etiqueta: "Finalizar y pagar", principal: true, deshabilitado: !listo, accion: () => ia.ejecutar({ tipo: "pagar" }) });
      return {
        titulo: "¡Todo listo!",
        cuerpo: `<div class="chips">${resumen.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>`
          + `<div class="total">Total: <b>${euros(tot)}</b>${e.carrito?.revision ? " <span>+ 1,90 € de revisión</span>" : ""}</div>${extra}`,
        ancla: pasoFinal, pose: "celebra", botones, cuenta: "Último paso", progreso: 1,
      };
    }

    // Pasos del configurador
    const pasos = this.pasos();
    const k = pasos.indexOf(this.paso) + 1;
    const campo = this.paso;
    await this.esperarPrecio();
    let res = null;
    if (campo === "encuadernacion") {
      const uc = this.cambio?.campo === "encuadernacion" && ["anillas", "delantera", "trasera"].includes(this.cambio.clave) ? this.cambio : null;
      if (uc) {
        if (!ia.catalogo) ia.catalogo = await fetch(new URL("encuadernacion.json", document.baseURI)).then((x) => x.json()).catch(() => null);
        res = await explicar("encuadernacion", this.ctx(uc));
      } else {
        res = { nombre: "Espiral clásica", que: "Anilla metálica negra, tapa transparente y trasera negra", tipo: "bien", texto: "La de siempre, sin recargo.",
          extra: { texto: "¿Le das tu toque? Elige arriba <b>anillas o tapas de color</b>, por +0,30 €." } };
      }
    } else {
      res = await explicar(campo, this.ctx({ campo, valor: cfg[campo] }));
    }
    // Botones: el del consejo va dentro de su caja; abajo, seguir.
    const botones = [];
    const aceptar = (accion) => () => { ia.ejecutar(accion); ia.celebrar(); };
    let cuerpo = "";
    if (res) {
      cuerpo += `<div class="op-nombre">${esc(res.nombre)}</div><div class="op-que">${res.que}.</div>`;
      if (res.tipo !== "mejor") cuerpo += `<div class="veredicto ${res.tipo}"><span class="marca" aria-hidden="true">${MARCA[res.tipo] || "i"}</span><span>${res.texto}</span></div>`;
      if (res.tipo === "mejor") {
        cuerpo += `<div class="consejo mejor"><div class="consejo-etq">Mi consejo para tu PDF</div><div class="consejo-txt">${res.texto}</div>`;
        if (res.accion) {
          cuerpo += `<button type="button" class="btn principal" data-b="${botones.length}">${esc(res.accion.etiqueta)}</button>`;
          botones.push({ enCuerpo: true, accion: aceptar(res.accion.accion) });
        }
        cuerpo += "</div>";
      } else if (res.extra) {
        cuerpo += `<div class="consejo tambien"><div class="consejo-etq">Y si quieres…</div><div class="consejo-txt">${res.extra.texto}</div>`;
        if (res.extra.accion) {
          cuerpo += `<button type="button" class="btn tambien" data-b="${botones.length}">${esc(res.extra.accion.etiqueta)}</button>`;
          botones.push({ enCuerpo: true, accion: aceptar(res.extra.accion.accion) });
        }
        cuerpo += "</div>";
      }
    }
    const conConsejo = res?.tipo === "mejor" && res.accion;
    botones.push({ etiqueta: conConsejo ? "Así está bien →" : k === pasos.length ? "Ver el resumen →" : "Siguiente →", principal: !conConsejo, siguiente: true, accion: () => this.siguiente() });
    return {
      cuerpo, tipo: res?.tipo, extra: !!(res?.extra && res.tipo !== "mejor"),
      ancla: campo, pose: "reposo", botones, cuenta: `Paso ${k} de ${pasos.length}`, progreso: k / (pasos.length + 1),
    };
  }
  ctx(cambio) {
    const ia = this.ia;
    const mayor = this.mayor();
    return {
      estado: ia.estado, analisis: mayor ? ia.analisis.get(mayor.id) : null, cambio, catalogo: ia.catalogo,
      precioCon: (c) => ia.precioCon(c), diferencia: (a, b) => ia.diferencia(a, b), euros: this.u.euros, esc: this.u.esc,
    };
  }
  async esperarPrecio() {
    const t0 = Date.now();
    for (;;) {
      const e = this.ia.estado;
      const n = e.ultimoCambio?.n ?? 0;
      if (!e.archivos?.length || (e.precio && !e.precio.cargando && (e.precio.n ?? 0) >= n) || Date.now() - t0 > 4000) return;
      await espera(120);
    }
  }

  // ------------------------------------------------------------------ pintar el paso
  async pintar({ desplazar = false } = {}) {
    const turno = ++this.turno;
    if (!this.puedeVerse()) {
      if (this.ia.actual?.guia && !this.ia.chat.abierto) this.ocultar();
      return;
    }
    const c = await this.contenido();
    if (turno !== this.turno || !this.puedeVerse()) return;
    const ia = this.ia;
    const { esc } = this.u;
    const pie = c.botones.map((b, i) => [b, i]).filter(([b]) => !b.enCuerpo);
    const html = `
      <div class="cab">
        <span class="nombre">Irisinho</span><span class="ia" title="Asistente con inteligencia artificial">IA</span>
        ${c.cuenta ? `<span class="paso-cuenta">· ${c.cuenta}</span>` : ""}
        <button type="button" class="cerrar" aria-label="Ocultar la guía">×</button>
      </div>
      ${c.progreso != null ? `<div class="paso-barra" aria-hidden="true"><i style="width:${Math.round(c.progreso * 100)}%"></i></div>` : ""}
      ${c.titulo ? `<div class="paso-titulo">${esc(c.titulo)}</div>` : ""}
      <div class="texto">${c.cuerpo}</div>
      ${pie.length ? `<div class="acciones">${pie.map(([b, i]) => `<button type="button" class="btn${b.principal ? " principal" : ""}${b.siguiente ? " seguir" : ""}" data-b="${i}"${b.deshabilitado ? " disabled" : ""}>${esc(b.etiqueta)}</button>`).join("")}</div>` : ""}
      <div class="paso-nav">
        ${this.esPaso(this.paso) || this.paso === "final" ? `<button type="button" class="enlace" data-nav="atras">← Atrás</button>` : ""}
        <button type="button" class="enlace" data-nav="duda">¿Tienes dudas?</button>
        <button type="button" class="enlace" data-nav="solo">Prefiero hacerlo solo</button>
      </div>`;
    for (const b of [ia.bocadillo, ia.hoja]) { b.hidden = true; b.classList.remove("visible"); }
    const caja = ponerTarjeta(c.ancla || "subida", html);
    if (!caja) return;
    ponerEscenario(c.ancla || "subida", this.altoEscenario());
    caja.querySelector(".cerrar").addEventListener("click", () => this.pausar());
    for (const b of caja.querySelectorAll("[data-b]")) b.addEventListener("click", () => c.botones[Number(b.dataset.b)].accion());
    caja.querySelector("[data-nav='atras']")?.addEventListener("click", () => this.atras());
    caja.querySelector("[data-nav='duda']").addEventListener("click", () => ia.abrirChat());
    caja.querySelector("[data-nav='solo']").addEventListener("click", () => this.salir());

    ia.actual = { guia: true, clave: "guia", ancla: c.ancla, pose: c.pose };
    ia.ponerGloboSeccion(GLOBO[this.paso] ? { clave: "sec:" + this.paso, texto: GLOBO[this.paso] } : null);
    ia.pose(c.pose);
    ia.hablar();
    // Reacción: primero a lo que acaba de elegir el cliente en este paso; si no, al paso nuevo.
    const uc = ia.estado.ultimoCambio;
    let reaccion = null;
    if (this.esPaso(this.paso) && uc && uc.n !== this.reaccionN && uc.origen === "cliente" && uc.campo === this.paso) {
      reaccion = c.tipo === "mejor" ? "mejor" : c.tipo === "bien" ? (c.extra ? "extra" : "bien") : "senalar";
      // Si le va bien, el botón de seguir late: el siguiente paso es por ahí.
      if (c.tipo === "bien") setTimeout(() => latirBoton(".btn.seguir"), 900);
    } else if (this.paso !== this.pasoPintado) {
      reaccion = this.paso === "final" ? "final" : this.esPaso(this.paso) ? "senalar" : null;
    }
    if (uc) this.reaccionN = uc.n;
    this.pasoPintado = this.paso;
    if (reaccion) setTimeout(() => { if (turno === this.turno) ia.reaccionar(reaccion); }, 600);
    if (this.paso === "listo") ia.pistaChat();
    ia.anclado = null;
    ia.mascota.classList.remove("oculto");
    ia.colocar(true);
    if (desplazar) {
      ia.enCaminoHasta = Date.now() + 1100;
      requestAnimationFrame(() => verTarjeta(c.ancla || "subida", { abajo: ia.carritoAbierto() ? 0 : ia.barra() }));
    }
    if (!this.u.esMovil()) setTimeout(() => caja.querySelector(".btn.principal:not([disabled])")?.focus({ preventScroll: true }), 80);
  }
}
