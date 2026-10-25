// Copia del configurador de iriscopyshop.app/print para la demo de Irisinho.
// Hace lo que hace su web (opciones, subida de PDF, precio real, carrito) y, además, cumple el «contrato» que le
// pediríamos a su desarrollador: emitir `iris:estado` con lo que configura el cliente y escuchar `iris:accion`.
import { CATALOGO, COLORES_FOLIO, IMAGENES, INFO_GRAPADO } from "./catalogo.js";
import { pedirPrecio } from "./calculadora.js";
import * as pdfjs from "../vendor/pdfjs/pdf.min.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const euros = (n) => (n == null || Number.isNaN(n) ? "—" : n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €");
const CLAVE_GUARDADO = "irisdemo_pedido";

const PREDETERMINADA = {
  paperSize: "A4", paperType: "normal", printType: "blanco-negro", printForm: "una-cara",
  orientation: "vertical-derecha-izquierda", pagesPerSide: "1_vertical", finishType: "sin-acabado",
  boundType: "individual", boundPages: "no",
  encuadernacion: { anillas: "metalica-negra", delantera: "acetato-transparente", trasera: "negra-grofada", colorFolio: "white" },
  copias: 1, comentario: "",
};

const estado = {
  config: structuredClone(PREDETERMINADA),
  archivos: [],
  precio: { total: null, notas: [], tomos: 0, cargando: false, error: null },
  carrito: { lineas: [], entrega: "envio", pago: "tarjeta", revision: false, abierto: false },
  pestana: "anillas",
};
let catalogoEnc = { rings: [], covers: [] };
// Qué fue lo último que cambió y quién (cliente o Irisinho): Irisinho explica las elecciones del cliente.
let nCambio = 0;
let siguienteId = 1;

// ---------------------------------------------------------------- utilidades de opciones
const opcion = (lista, code) => CATALOGO[lista].find((o) => o.code === code);
const esHorizontal = (code) => code.startsWith("horizontal");
const factorPps = () => opcion("pagesPerSide", estado.config.pagesPerSide)?.factor ?? 1;
const factorCara = () => opcion("printForm", estado.config.printForm)?.factor ?? 1;
export const hojasDe = (paginas, cfg = estado.config) => {
  const pps = opcion("pagesPerSide", cfg.pagesPerSide)?.factor ?? 1;
  const cara = opcion("printForm", cfg.printForm)?.factor ?? 1;
  return Math.ceil(paginas * pps * cara);
};
function hojasPorEncuadernacion() {
  const hojas = estado.archivos.map((a) => hojasDe(a.paginas));
  if (!hojas.length) return 0;
  return estado.config.boundType === "agrupados" ? hojas.reduce((a, b) => a + b, 0) : Math.max(...hojas);
}

function avisar(texto, ms = 4200) {
  const el = $("#avisoFlotante");
  const barra = $("#confirm-bar");
  // Siempre encima de la barra del precio, también si la barra aparece mientras se ve el aviso.
  const colocar = () => {
    el.style.setProperty("--abajo", (barra && !barra.hidden ? barra.getBoundingClientRect().height : 0) + "px");
    if (!el.hidden) requestAnimationFrame(colocar);
  };
  el.textContent = texto;
  el.hidden = false;
  colocar();
  clearTimeout(avisar.t);
  avisar.t = setTimeout(() => (el.hidden = true), ms);
}

// ---------------------------------------------------------------- pintar selectores
function boton({ code, name, description, img, activo, deshabilitado, info }) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "opcion";
  b.setAttribute("role", "radio");
  b.setAttribute("aria-checked", activo ? "true" : "false");
  b.dataset.valor = code;
  if (deshabilitado) b.disabled = true;
  if (img) {
    const i = document.createElement("img");
    i.src = `assets/tienda/${img}${activo ? "_active" : ""}.png`;
    i.alt = name;
    b.append(i);
    b.setAttribute("aria-label", name);
  } else {
    b.innerHTML = `<span class="opcion__lbl"></span>${description ? '<span class="opcion__desc"></span>' : ""}`;
    b.querySelector(".opcion__lbl").textContent = name;
    if (description) b.querySelector(".opcion__desc").textContent = description;
  }
  if (info) {
    const i = document.createElement("span");
    i.className = "opcion__info";
    i.textContent = "i";
    i.setAttribute("role", "button");
    i.setAttribute("aria-label", "Información");
    i.addEventListener("click", (e) => { e.stopPropagation(); avisar(info, 6000); });
    b.append(i);
  }
  return b;
}

function pintarSelectores() {
  const c = estado.config;
  for (const sel of $$(".selector[data-campo]")) {
    const campo = sel.dataset.campo;
    sel.replaceChildren();
    let lista;
    if (campo === "orientation") {
      lista = CATALOGO.orientation.filter((o) => (sel.dataset.filtro === "horizontal") === esHorizontal(o.code));
    } else if (campo === "pagesPerSide") {
      const h = esHorizontal(c.orientation);
      lista = CATALOGO.pagesPerSide.filter((o) => o.code.endsWith(h ? "_horizontal" : "_vertical"));
    } else if (campo === "finishType") {
      lista = CATALOGO.finishType.slice(sel.dataset.fila === "0" ? 0 : 3, sel.dataset.fila === "0" ? 3 : 6);
    } else if (campo === "boundType") {
      lista = CATALOGO.boundTypes;
    } else {
      lista = CATALOGO[campo];
    }
    for (const o of lista) {
      sel.append(boton({
        ...o,
        img: IMAGENES[o.code] && (campo === "orientation" || campo === "pagesPerSide") ? IMAGENES[o.code] : null,
        activo: c[campo] === o.code,
        info: o.code === "grapado" ? INFO_GRAPADO : null,
      }));
    }
  }
  $("#bloqueEncuadernado").hidden = c.finishType !== "encuadernado";
  if (c.finishType === "encuadernado") pintarEncuadernado();
  $("#copias").value = c.copias;
  if ($("#comentario").value !== c.comentario) $("#comentario").value = c.comentario;
}

function pintarEncuadernado() {
  const e = estado.config.encuadernacion;
  const pest = $("#pestanasColor");
  pest.replaceChildren();
  for (const [code, name] of [["anillas", "Anillas"], ["delantera", "Tapa delantera"], ["trasera", "Tapa trasera"]]) {
    const b = boton({ code, name, activo: estado.pestana === code });
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", estado.pestana === code ? "true" : "false");
    b.dataset.pestana = code;
    pest.append(b);
  }
  const caja = $("#coloresEncuadernado");
  caja.replaceChildren();
  const anillas = estado.pestana === "anillas";
  const items = anillas ? catalogoEnc.rings : catalogoEnc.covers.filter((x) => (x.sides || []).includes(estado.pestana));
  const hojas = hojasPorEncuadernacion();
  const categorias = [...new Set(items.map((x) => x.category))];
  for (const cat of categorias) {
    const bloque = document.createElement("div");
    bloque.className = "colores__categoria";
    bloque.innerHTML = `<h3></h3><div class="colores__lista"></div>`;
    bloque.querySelector("h3").textContent = cat + ":";
    for (const x of items.filter((i) => i.category === cat)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "color";
      b.dataset.color = x.code;
      b.title = x.name + (x.surcharge ? ` (+${x.surcharge.toFixed(2)} €)` : "");
      b.setAttribute("aria-pressed", e[estado.pestana] === x.code ? "true" : "false");
      const lleno = anillas && x.maxSheets != null && hojas > x.maxSheets;
      if (lleno) {
        b.disabled = true;
        b.title = `Hasta ${x.maxSheets} hojas por encuadernación`;
      }
      if (x.image) b.innerHTML = `<img src="${x.image}" alt="">`;
      else b.innerHTML = `<span class="color__muestra" style="background:${x.color};opacity:${x.opacity ?? 1}"></span>`;
      b.setAttribute("aria-label", b.title);
      bloque.querySelector(".colores__lista").append(b);
    }
    caja.append(bloque);
  }
  const elegido = items.find((x) => x.code === e[estado.pestana]);
  $("#colorElegido").textContent = elegido?.name || "";
  $("#avisoAnilla").hidden = !elegido?.advice;
  $("#avisoAnilla").textContent = elegido?.advice || "";

  const folios = $("#coloresFolio");
  const conDelante = ["delante", "ambos"].includes(estado.config.boundPages);
  folios.hidden = !conDelante;
  const lista = folios.querySelector(".folios-color__lista");
  lista.replaceChildren();
  for (const f of COLORES_FOLIO) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.folio = f.code;
    b.setAttribute("aria-pressed", e.colorFolio === f.code ? "true" : "false");
    b.innerHTML = `<i style="background:${f.color}"></i><span>${f.priceLabel}</span>`;
    b.title = f.name;
    lista.append(b);
  }
}

// ---------------------------------------------------------------- cambios de configuración
function cambiar(campo, valor, origen = "cliente") {
  const c = estado.config;
  if (campo === "orientation") {
    if (!opcion("orientation", valor)) return;
    const antes = esHorizontal(c.orientation);
    c.orientation = valor;
    if (antes !== esHorizontal(valor)) {
      const n = c.pagesPerSide.split("_")[0];
      const fam = esHorizontal(valor) ? "_horizontal" : "_vertical";
      c.pagesPerSide = opcion("pagesPerSide", n + fam) ? n + fam : "2" + fam;
    }
  } else if (campo === "boundType") {
    if (!opcion("boundTypes", valor)) return;
    c.boundType = valor;
  } else if (campo in CATALOGO) {
    if (!opcion(campo, valor)) return;
    c[campo] = valor;
  } else if (campo === "pagesPerSide") {
    c.pagesPerSide = valor;
  } else return;
  // Si una anilla de color se queda pequeña, la web real la deshabilita: volvemos a la metálica negra.
  const anilla = catalogoEnc.rings.find((r) => r.code === c.encuadernacion.anillas);
  if (anilla?.maxSheets != null && hojasPorEncuadernacion() > anilla.maxSheets) c.encuadernacion.anillas = "metalica-negra";
  estado.ultimoCambio = { campo, valor, origen, n: ++nCambio };
  pintarSelectores();
  actualizar(origen);
}

function cambiarEncuadernacion(clave, valor, origen = "cliente") {
  estado.config.encuadernacion[clave] = valor;
  estado.ultimoCambio = { campo: "encuadernacion", clave, valor, origen, n: ++nCambio };
  pintarEncuadernado();
  actualizar();
}

// ---------------------------------------------------------------- archivos (como hace su subida)
async function anadirArchivo(file) {
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
    avisar(`El archivo ${file.name} no es un PDF. La web solo admite PDF.`);
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    avisar(`El archivo ${file.name} pesa más de 50 MB. Comprímelo y súbelo de nuevo.`);
    return;
  }
  const id = "a" + siguienteId++;
  const fila = document.createElement("li");
  fila.className = "archivo";
  fila.dataset.id = id;
  fila.innerHTML = `<canvas width="52" height="68" aria-hidden="true"></canvas><div><div class="archivo__nombre"></div><div class="archivo__info">Subiendo…</div></div><button type="button" class="archivo__quitar" aria-label="Quitar archivo">×</button>`;
  fila.querySelector(".archivo__nombre").textContent = file.name;
  $("#listaArchivos").append(fila);
  try {
    const datos = new Uint8Array(await file.arrayBuffer());
    const huella = await crypto.subtle.digest("SHA-256", datos).then((b) => [...new Uint8Array(b).slice(0, 8)].map((x) => x.toString(16).padStart(2, "0")).join(""));
    const doc = await pdfjs.getDocument({ data: datos.slice() }).promise;
    const archivo = { id, nombre: file.name, tamano: file.size, paginas: doc.numPages, huella, muestra: file.muestra || null };
    estado.archivos.push(archivo);
    fila.querySelector(".archivo__info").textContent = `${doc.numPages} página${doc.numPages === 1 ? "" : "s"}`;
    miniatura(doc, fila.querySelector("canvas"));
    document.dispatchEvent(new CustomEvent("iris:archivo", { detail: { id, nombre: file.name, paginas: doc.numPages, datos } }));
    actualizar();
  } catch (err) {
    fila.remove();
    const clave = String(err?.name || "");
    avisar(clave === "PasswordException" ? `El archivo ${file.name} tiene contraseña. Quítasela y súbelo de nuevo.` : `No hemos podido leer ${file.name}. ¿Es un PDF válido?`);
  }
}

async function miniatura(doc, canvas) {
  const p = await doc.getPage(1);
  const v = p.getViewport({ scale: 1 });
  const escala = Math.min(104 / v.width, 136 / v.height);
  const vp = p.getViewport({ scale: escala });
  canvas.width = vp.width;
  canvas.height = vp.height;
  await p.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
}

function quitarArchivo(id) {
  estado.archivos = estado.archivos.filter((a) => a.id !== id);
  $(`.archivo[data-id="${id}"]`)?.remove();
  actualizar();
}

async function cargarMuestra(nombre) {
  avisar(`Cargando el ejemplo «${nombre.replace(/_/g, " ").replace(".pdf", "")}»…`, 1800);
  const r = await fetch("muestras/" + nombre);
  const f = new File([await r.blob()], nombre, { type: "application/pdf" });
  f.muestra = nombre;
  await anadirArchivo(f);
}

// ---------------------------------------------------------------- precio real (su calculadora)
let ordenPrecio = 0;
async function calcularPrecio() {
  const nConfig = nCambio;
  if (!estado.archivos.length) {
    estado.precio = { total: null, notas: [], tomos: 0, cargando: false, error: null, n: nConfig };
    pintarBarra();
    return;
  }
  const n = ++ordenPrecio;
  estado.precio.cargando = true;
  pintarBarra();
  try {
    const d = await pedirPrecio(estado.config, estado.archivos.map((a) => ({ paginas: a.paginas })));
    if (n !== ordenPrecio) return;
    estado.precio = d.error
      ? { total: null, notas: [], tomos: 0, cargando: false, error: d.error, n: nConfig }
      : { total: d.precio, notas: d.notas || [], tomos: d.tomos || 0, cargando: false, error: null, n: nConfig };
  } catch {
    if (n !== ordenPrecio) return;
    estado.precio = { total: null, notas: [], tomos: 0, cargando: false, error: "No hay conexión con la calculadora de precios.", n: nConfig };
  }
  pintarBarra();
  emitir();
}

function textoSeguro(html) {
  // Las notas de su API traen <b>; solo dejamos esa etiqueta.
  const t = document.createElement("span");
  t.textContent = html.replace(/<\/?b>/g, "§");
  return t.innerHTML.replace(/§(.*?)§/g, "<b>$1</b>");
}

function pintarBarra() {
  const hay = estado.archivos.length > 0;
  $("#confirm-bar").hidden = !hay;
  document.body.classList.toggle("con-barra", hay);
  const p = estado.precio;
  $("#precio").textContent = p.total != null ? euros(p.total) : p.error ? "—" : "…";
  $("#precio").classList.toggle("cargando", p.cargando);
  const notas = $("#notas");
  notas.replaceChildren();
  for (const n of p.notas) {
    const d = document.createElement("div");
    d.innerHTML = textoSeguro(n.texto);
    notas.append(d);
  }
  if (p.error) {
    const d = document.createElement("div");
    d.textContent = p.error;
    notas.append(d);
  }
  const pide = p.notas.some((n) => n.pideComentario) && !estado.config.comentario.trim();
  $("#comentario").classList.toggle("pide", pide);
  for (const b of [$("#botonPagar"), $("#botonCarrito")]) b.disabled = p.cargando || pide || !!p.error || p.total == null;
}

// ---------------------------------------------------------------- contrato con Irisinho
function instantanea() {
  const total = estado.carrito.lineas.reduce((s, l) => s + l.precio, 0) + (estado.carrito.revision ? 1.9 : 0);
  return {
    version: 1,
    pagina: estado.carrito.abierto ? "carrito" : "imprimir",
    ultimoCambio: estado.ultimoCambio ? { ...estado.ultimoCambio } : null,
    config: structuredClone(estado.config),
    archivos: estado.archivos.map((a) => ({ id: a.id, nombre: a.nombre, paginas: a.paginas, tamano: a.tamano, huella: a.huella, hojas: hojasDe(a.paginas) })),
    precio: { ...estado.precio },
    carrito: {
      lineas: estado.carrito.lineas.map((l) => ({ descripcion: l.descripcion, precio: l.precio, printType: l.config.printType })),
      total: Math.round(total * 100) / 100,
      entrega: estado.carrito.entrega,
      pago: estado.carrito.pago,
      revision: estado.carrito.revision,
      lowcost: estado.carrito.lineas.some((l) => l.config.printType === "color-envio"),
    },
  };
}
function emitir() {
  document.dispatchEvent(new CustomEvent("iris:estado", { detail: instantanea() }));
}
let temporizador;
let precioPendiente = false;
function actualizar() {
  pintarBarra();
  emitir();
  guardar();
  clearTimeout(temporizador);
  precioPendiente = true;
  temporizador = setTimeout(async () => {
    await calcularPrecio();
    precioPendiente = false;
  }, 220);
}

document.addEventListener("iris:accion", (ev) => {
  const a = ev.detail || {};
  switch (a.tipo) {
    case "cambiar": cambiar(a.campo, a.valor, "irisinho"); break;
    case "encuadernacion": cambiarEncuadernacion(a.clave, a.valor, "irisinho"); break;
    case "comentario":
      estado.config.comentario = String(a.texto || "").slice(0, 500);
      $("#comentario").value = estado.config.comentario;
      $("#comentario").focus();
      actualizar();
      break;
    case "enfocar": {
      const el = a.campo === "comentario" ? $("#comentario") : $(`[data-iris-ancla="${a.campo}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (a.campo === "comentario") setTimeout(() => $("#comentario").focus({ preventScroll: true }), 350);
      break;
    }
    case "quitarArchivo": quitarArchivo(a.id); break;
    case "entrega": elegirEntrega(a.valor); break;
    case "pago":
      estado.carrito.pago = a.valor === "bizum" ? "bizum" : "tarjeta";
      $(`input[name="pago"][value="${estado.carrito.pago}"]`).checked = true;
      emitir();
      break;
    case "revision":
      estado.carrito.revision = !!a.valor;
      pintarCarrito();
      emitir();
      break;
    case "reintentarPago":
      if (!estado.carrito.abierto) abrirCarrito();
      $("#pagarOk").focus();
      break;
    case "restaurar": restaurar(); break;
    case "descartar": localStorage.removeItem(CLAVE_GUARDADO); break;
    case "abrirCarrito": abrirCarrito(); break;
    case "subir": $("#entradaArchivo").click(); break;
    case "muestra":
      if (/^[A-Za-z_]+\.pdf$/.test(String(a.nombre || ""))) cargarMuestra(a.nombre);
      break;
    case "carrito": $("#botonCarrito").click(); break;
    case "pagar": $("#botonPagar").click(); break;
  }
});
document.addEventListener("iris:pedir-estado", emitir);

// ---------------------------------------------------------------- carrito simulado
function descripcion(cfg, archivos) {
  const partes = [opcion("paperSize", cfg.paperSize).name, opcion("printType", cfg.printType).name, opcion("printForm", cfg.printForm).name, opcion("finishType", cfg.finishType).name];
  const pags = archivos.reduce((s, a) => s + a.paginas, 0);
  return `${archivos.map((a) => a.nombre).join(", ")} · ${partes.join(" · ")} · ${pags} págs. × ${cfg.copias}`;
}
function anadirAlCarrito() {
  if (!estado.archivos.length || estado.precio.total == null) return false;
  estado.carrito.lineas.push({
    config: structuredClone(estado.config),
    archivos: estado.archivos.map((a) => ({ nombre: a.nombre, paginas: a.paginas, muestra: a.muestra })),
    descripcion: descripcion(estado.config, estado.archivos),
    precio: estado.precio.total,
  });
  // Como su web: tras añadir, se vacía la subida y se vuelve arriba.
  estado.archivos = [];
  $("#listaArchivos").replaceChildren();
  estado.config.comentario = "";
  $("#contadorCarrito").hidden = false;
  $("#contadorCarrito").textContent = estado.carrito.lineas.length;
  actualizar();
  return true;
}
function pintarCarrito() {
  const ul = $("#lineasCarrito");
  ul.replaceChildren();
  for (const l of estado.carrito.lineas) {
    const li = document.createElement("li");
    li.innerHTML = `<span></span><b></b>`;
    li.querySelector("span").textContent = l.descripcion;
    li.querySelector("b").textContent = euros(l.precio);
    ul.append(li);
  }
  if (estado.carrito.revision) {
    const li = document.createElement("li");
    li.innerHTML = `<span>Servicio premium: revisión de archivos</span><b>1,90 €</b>`;
    ul.append(li);
  }
  const total = estado.carrito.lineas.reduce((s, l) => s + l.precio, 0) + (estado.carrito.revision ? 1.9 : 0);
  $("#totalCarrito").textContent = euros(total);
  const lowcost = estado.carrito.lineas.some((l) => l.config.printType === "color-envio");
  const bloqueo = lowcost && estado.carrito.entrega === "recogida";
  $("#avisoRecogida").hidden = !bloqueo;
  $("#local").hidden = estado.carrito.entrega !== "recogida";
  $("#pagarOk").disabled = bloqueo || !estado.carrito.lineas.length;
  $("#pagarMal").disabled = bloqueo || !estado.carrito.lineas.length;
}
function abrirCarrito() {
  if (!estado.carrito.lineas.length) {
    avisar("Tu carrito está vacío.");
    return;
  }
  estado.carrito.abierto = true;
  pintarCarrito();
  $("#veloCarrito").hidden = false;
  $("#cerrarCarrito").focus();
  emitir();
}
function cerrarCarrito() {
  estado.carrito.abierto = false;
  $("#veloCarrito").hidden = true;
  emitir();
}
function elegirEntrega(valor) {
  if (!["envio", "urgente", "recogida"].includes(valor)) return;
  estado.carrito.entrega = valor;
  $(`input[name="entrega"][value="${valor}"]`).checked = true;
  pintarCarrito();
  emitir();
}
function pagar(bien) {
  if (bien) {
    cerrarCarrito();
    document.dispatchEvent(new CustomEvent("iris:pedido-completado", { detail: { total: Number($("#totalCarrito").textContent.replace(/[^\d,]/g, "").replace(",", ".")) } }));
    avisar("¡Pedido simulado! En la web real aquí se pagaría con Redsys o Bizum.", 5000);
    estado.carrito.lineas = [];
    estado.carrito.revision = false;
    $("#contadorCarrito").hidden = true;
    localStorage.removeItem(CLAVE_GUARDADO);
    emitir();
  } else {
    avisar("El pago no se ha completado. La operación ha sido denegada por tu banco.", 5000);
    document.dispatchEvent(new CustomEvent("iris:pago-rechazado", { detail: { pago: estado.carrito.pago } }));
  }
}

// ---------------------------------------------------------------- guardar y volver otro día
function guardar() {
  const muestras = estado.archivos.filter((a) => a.muestra).map((a) => a.muestra);
  const lineas = estado.carrito.lineas;
  if (!muestras.length && !lineas.length) return;
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify({ config: estado.config, muestras, lineas, fecha: Date.now(), total: estado.precio.total }));
  } catch { /* sin almacenamiento: la escena de «vuelvo otro día» no estará */ }
}
async function restaurar() {
  let g;
  try { g = JSON.parse(localStorage.getItem(CLAVE_GUARDADO) || "null"); } catch { g = null; }
  if (!g) return;
  estado.config = { ...structuredClone(PREDETERMINADA), ...g.config };
  estado.carrito.lineas = g.lineas || [];
  if (estado.carrito.lineas.length) {
    $("#contadorCarrito").hidden = false;
    $("#contadorCarrito").textContent = estado.carrito.lineas.length;
  }
  pintarSelectores();
  for (const m of g.muestras || []) await cargarMuestra(m);
  actualizar();
}
function pedidoPendiente() {
  let g;
  try { g = JSON.parse(localStorage.getItem(CLAVE_GUARDADO) || "null"); } catch { g = null; }
  if (!g || !(g.muestras?.length || g.lineas?.length)) return;
  const total = (g.lineas || []).reduce((s, l) => s + l.precio, 0) || g.total;
  const nombres = [...(g.lineas || []).flatMap((l) => l.archivos.map((a) => a.nombre)), ...(g.muestras || [])];
  setTimeout(() => document.dispatchEvent(new CustomEvent("iris:pedido-pendiente", { detail: { total, nombres, fecha: g.fecha } })), 1200);
}

// ---------------------------------------------------------------- escenas de la guía
async function asegurarLinea(muestra, cambios = {}) {
  if (!estado.carrito.lineas.length) {
    if (!estado.archivos.length) await cargarMuestra(muestra);
    for (const [k, v] of Object.entries(cambios)) cambiar(k, v);
    await esperarPrecio();
    anadirAlCarrito();
  }
}
function esperarPrecio() {
  return new Promise((ok) => {
    const t0 = Date.now();
    (function mirar() {
      if ((!precioPendiente && !estado.precio.cargando && estado.precio.total != null) || Date.now() - t0 > 8000) ok();
      else setTimeout(mirar, 150);
    })();
  });
}

// ---------------------------------------------------------------- eventos de la página
function enlazar() {
  document.addEventListener("click", (e) => {
    const op = e.target.closest(".opcion[data-valor]");
    if (op && !op.disabled) {
      const sel = op.closest(".selector");
      if (op.dataset.pestana) {
        estado.pestana = op.dataset.pestana;
        pintarEncuadernado();
      } else if (sel?.dataset.campo) {
        cambiar(sel.dataset.campo, op.dataset.valor);
      }
      return;
    }
    const col = e.target.closest(".color[data-color]");
    if (col && !col.disabled) return cambiarEncuadernacion(estado.pestana, col.dataset.color);
    const fol = e.target.closest("[data-folio]");
    if (fol) return cambiarEncuadernacion("colorFolio", fol.dataset.folio);
    const mu = e.target.closest("[data-muestra]");
    if (mu) {
      $("#guia").hidden = true;
      return cargarMuestra(mu.dataset.muestra);
    }
    const q = e.target.closest(".archivo__quitar");
    if (q) return quitarArchivo(q.closest(".archivo").dataset.id);
    const cp = e.target.closest("[data-copias]");
    if (cp) {
      estado.config.copias = Math.min(500, Math.max(1, estado.config.copias + Number(cp.dataset.copias)));
      $("#copias").value = estado.config.copias;
      actualizar();
    }
  });

  $("#copias").addEventListener("change", (e) => {
    estado.config.copias = Math.min(500, Math.max(1, parseInt(e.target.value, 10) || 1));
    e.target.value = estado.config.copias;
    actualizar();
  });
  $("#comentario").addEventListener("input", (e) => {
    estado.config.comentario = e.target.value;
    pintarBarra();
    emitir();
  });

  const entrada = $("#entradaArchivo");
  $("#botonSubir").addEventListener("click", () => entrada.click());
  entrada.addEventListener("change", async () => {
    for (const f of entrada.files) await anadirArchivo(f);
    entrada.value = "";
  });
  $("#botonDrive").addEventListener("click", () => avisar("En la demo, sube el PDF desde tu equipo o usa un ejemplo."));
  const zona = $("#zonaSubida");
  for (const t of ["dragenter", "dragover"]) document.addEventListener(t, (e) => { e.preventDefault(); zona.classList.add("arrastrando"); });
  for (const t of ["dragleave", "drop"]) document.addEventListener(t, (e) => { e.preventDefault(); if (t === "drop" || !e.relatedTarget) zona.classList.remove("arrastrando"); });
  document.addEventListener("drop", async (e) => {
    for (const f of e.dataTransfer?.files || []) await anadirArchivo(f);
  });

  $("#botonCarrito").addEventListener("click", () => { if (anadirAlCarrito()) avisar("Añadido al carrito. Puedes subir otro documento."); });
  $("#botonPagar").addEventListener("click", () => { if (anadirAlCarrito()) abrirCarrito(); });
  $("#iconoCarrito").addEventListener("click", (e) => { e.preventDefault(); abrirCarrito(); });
  $("#cerrarCarrito").addEventListener("click", cerrarCarrito);
  $("#veloCarrito").addEventListener("click", (e) => { if (e.target.id === "veloCarrito") cerrarCarrito(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("#veloCarrito").hidden) cerrarCarrito();
      $("#guia").hidden = true;
    }
  });
  for (const r of $$('input[name="entrega"]')) r.addEventListener("change", () => elegirEntrega(r.value));
  for (const r of $$('input[name="pago"]')) r.addEventListener("change", () => { estado.carrito.pago = r.value; emitir(); });
  $("#pagarOk").addEventListener("click", () => pagar(true));
  $("#pagarMal").addEventListener("click", () => pagar(false));

  // Guía
  $("#abrirGuia").addEventListener("click", () => { $("#guia").hidden = !$("#guia").hidden; });
  $("#cerrarGuia").addEventListener("click", () => { $("#guia").hidden = true; });
  $("#escenaRecogida").addEventListener("click", async () => {
    $("#guia").hidden = true;
    estado.carrito.lineas = [];
    await asegurarLinea("TFG_Arquitectura.pdf", { printType: "color-envio" });
    abrirCarrito();
    setTimeout(() => elegirEntrega("recogida"), 600);
  });
  $("#escenaPagoMal").addEventListener("click", async () => {
    $("#guia").hidden = true;
    await asegurarLinea("Apuntes_Derecho_Civil.pdf", { printForm: "doble-cara", finishType: "encuadernado" });
    abrirCarrito();
    setTimeout(() => pagar(false), 700);
  });
  $("#escenaVuelve").addEventListener("click", async () => {
    $("#guia").hidden = true;
    if (!estado.archivos.length && !estado.carrito.lineas.length) {
      await cargarMuestra("TFG_Arquitectura.pdf");
      await esperarPrecio();
    }
    guardar();
    sessionStorage.setItem("irisdemo_vuelve", "1");
    location.reload();
  });
  $("#reiniciarDemo").addEventListener("click", () => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* nada */ }
    location.reload();
  });
}

// ---------------------------------------------------------------- arranque
async function arrancar() {
  try { catalogoEnc = await (await fetch("encuadernacion.json")).json(); } catch { /* sin colores */ }
  pintarSelectores();
  enlazar();
  pintarBarra();
  emitir();
  if (sessionStorage.getItem("irisdemo_vuelve")) {
    sessionStorage.removeItem("irisdemo_vuelve");
    pedidoPendiente();
  } else {
    try { localStorage.removeItem(CLAVE_GUARDADO); } catch { /* nada */ }
  }
}
arrancar();
