// <irisinho-asistente api="/api"> · Asistente de Iris Copy (prototipo de Mesa 10 Studio, 23-oct-2026)
//
// Es la pieza que se pegaría en iriscopyshop.app. Vive en su propio Shadow DOM (no toca los estilos de la web) y se
// entiende con la página por eventos:
//   - escucha `iris:estado` (lo que el cliente configura), `iris:archivo` (PDF subido), `iris:pago-rechazado`,
//     `iris:pedido-pendiente` e `iris:pedido-completado`;
//   - pide cambios con `iris:accion` (la página decide y los aplica).
// Los consejos salen de reglas con datos reales (sin IA y sin coste); las cifras, de la calculadora de la tienda.
// La IA solo se usa en el chat, con correo verificado.
import * as pdfjs from "../vendor/pdfjs/pdf.min.mjs";
import { pedirPrecio, sinServidor } from "../js/calculadora.js";
import { CAMPOS_CON_NOTA, escalaPagina, explicar, temaDe } from "./explicaciones.js";
import { Guia } from "./guia.js";
import { CSS_MUNECO, Muneco } from "./muneco.js";
import { escenarioPuesto, ponerEscenario, ponerTarjeta, quitarEscenario, quitarTarjeta, tarjetaPuesta, tarjetaVisible, verTarjeta } from "./tarjeta.js";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;

const BASE = new URL(".", import.meta.url).href;
const CHAT_APAGADO = "El chat de la demo aún no está encendido. Los consejos mientras configuras sí funcionan. Para dudas: pedidos@iris-copy.es.";
class ChatApagado extends Error {}
const euros = (n) => (n == null || Number.isNaN(n) ? "—" : n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €");
const esMovil = () => window.matchMedia("(max-width: 991px)").matches;
const sinMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const FACTOR_PPS = { "1_vertical": 1, "1_horizontal": 1, "2_vertical": 0.5, "2_horizontal": 0.5, "4_horizontal": 0.25 };
const hojas = (paginas, cfg) => Math.ceil(paginas * (FACTOR_PPS[cfg.pagesPerSide] ?? 1) * (cfg.printForm === "doble-cara" ? 0.5 : 1));
const TIENDA = "pedidos@iris-copy.es (lunes a viernes, 7:00-15:00)";

function rangos(nums) {
  const out = [];
  let ini = null;
  let prev = null;
  for (const n of nums) {
    if (ini === null) ini = prev = n;
    else if (n === prev + 1) prev = n;
    else { out.push(ini === prev ? `${ini}` : `${ini}-${prev}`); ini = prev = n; }
  }
  if (ini !== null) out.push(ini === prev ? `${ini}` : `${ini}-${prev}`);
  return out.join(", ");
}

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.capa { position: fixed; inset: 0; pointer-events: none; z-index: 250; font-family: Montserrat, Arial, sans-serif; color: #000; }
button { font-family: inherit; cursor: pointer; }

/* ---------------- Mascota ---------------- */
.mascota { position: absolute; left: 0; top: 0; width: var(--t, 104px); height: var(--t, 104px); pointer-events: auto;
  cursor: pointer; will-change: transform; -webkit-tap-highlight-color: transparent; outline: none; }
.mascota:focus-visible .cuerpo { outline: 3px solid #FF0099; outline-offset: 4px; border-radius: 50%; }
.aparta { position: absolute; inset: 0; transition: transform .35s cubic-bezier(.3,.7,.3,1), opacity .35s; }
.apartado .aparta { transform: translateX(62%) scale(.86); opacity: .75; }
.oculto .aparta { transform: translateY(140%); opacity: 0; }
.sombra { position: absolute; left: 24%; right: 24%; bottom: -7%; height: 10%; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(25,20,60,.34), rgba(25,20,60,0)); animation: sombra 3.4s ease-in-out infinite; }
.cuerpo { position: absolute; inset: 0; animation: flotar 3.4s ease-in-out infinite; }
.balancea { position: absolute; inset: 0; transform-origin: 50% 72%; animation: balancear 5.8s ease-in-out infinite; }
.inclina { position: absolute; inset: 0; transform-origin: 50% 80%; transition: transform .5s cubic-bezier(.3,.7,.3,1); transform: rotate(var(--mira, 0deg)); }
.pop { position: absolute; inset: 0; transform-origin: 50% 88%; }
.llama { position: absolute; left: 39%; width: 22%; top: 80%; height: 20%; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255,0,153,.8), rgba(255,0,153,.25) 55%, rgba(255,0,153,0));
  animation: llama .19s ease-in-out infinite alternate; transform-origin: 50% 0%; }
.volando .llama { animation-duration: .09s; transform: scale(1.5, 1.9); }
.pose { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity .2s ease;
  pointer-events: none; user-select: none; -webkit-user-drag: none; }
.pose.activa { opacity: 1; }
.brillo { position: absolute; left: 31%; top: 22%; width: 40%; height: 40%; border-radius: 50%; overflow: hidden; pointer-events: none; }
.brillo::after { content: ""; position: absolute; top: -20%; left: -80%; width: 40%; height: 140%; transform: rotate(25deg);
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.75), rgba(255,255,255,0)); opacity: 0; }
.brillando .brillo::after { animation: brillo .9s ease-out 1; }
.insignia { position: absolute; top: 2%; right: 4%; min-width: 22px; height: 22px; border-radius: 11px; background: #FF0099; color: #fff;
  font: 800 12px/22px Montserrat, sans-serif; text-align: center; border: 2px solid #000; padding: 0 5px; display: none; }
.con-insignia .insignia { display: block; animation: latido 1.4s ease-in-out infinite; }
.progreso { position: absolute; inset: -6%; pointer-events: none; opacity: 0; transition: opacity .25s; }
.analizando .progreso { opacity: 1; }
.progreso circle { fill: none; stroke-width: 5; }
.progreso .fondo { stroke: rgba(0,0,0,.08); }
.progreso .barra { stroke: #FF0099; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dashoffset .25s; }
.etiqueta { position: absolute; right: calc(100% + 10px); top: 26%; white-space: nowrap; background: #fff; color: #000; font-size: 13px;
  font-weight: 700; padding: 6px 11px; border: 2px solid #000; border-radius: 10px; box-shadow: 3px 3px 0 #000;
  opacity: 0; transform: translateX(8px) scale(.96); transform-origin: 100% 50%; transition: opacity .25s, transform .25s; pointer-events: none; }
.etiqueta::after { content: ""; position: absolute; right: -8px; top: calc(50% - 6px); width: 10px; height: 10px; background: #fff;
  border-top: 2px solid #000; border-right: 2px solid #000; transform: rotate(45deg); }
.mascota:hover .etiqueta, .analizando .etiqueta, .invita .etiqueta { opacity: 1; transform: none; }
.invita .etiqueta { animation: invitar 4.5s ease-in-out 1.2s infinite; }
@keyframes invitar { 0%, 82%, 100% { transform: none; } 88% { transform: translateX(-4px); } 94% { transform: translateX(0); } }
.quieto .etiqueta { animation: none !important; }
.sin-etiqueta .etiqueta { opacity: 0 !important; }
.invita:not(.sin-etiqueta) .etiqueta { pointer-events: auto; cursor: pointer; }
/* Bocadillo junto a Irisinho: qué se elige en cada sección, avisos y lo que puede hacer. Siempre con × */
.globo { position: absolute; left: 0; top: 0; width: max-content; max-width: 260px; pointer-events: auto; background: #fff;
  border: 2px solid #000; border-radius: 12px; box-shadow: 3px 3px 0 #000; padding: 6px 26px 7px 10px; color: #000;
  font: 700 12.5px/1.3 Montserrat, Arial, sans-serif; opacity: 0; transform: scale(.9); transform-origin: 100% 70%;
  transition: opacity .2s, transform .2s; }
.globo.visible { opacity: 1; transform: none; }
.globo[hidden] { display: none; }
.globo::after { content: ""; position: absolute; right: -8px; top: var(--cola, 50%); width: 10px; height: 10px; background: #fff;
  border-top: 2px solid #000; border-right: 2px solid #000; transform: translateY(-50%) rotate(45deg); }
.globo.accion .globo__texto { cursor: pointer; }
.globo.con-flecha .globo__texto::after { content: " →"; color: #FF0099; }
.globo__x { position: absolute; top: 1px; right: 2px; border: 0; background: none; font: 400 17px/1 Montserrat, sans-serif;
  padding: 2px 5px; color: #000; }
.globo__x:focus-visible { outline: 3px solid #FF0099; outline-offset: 1px; }
.zeta { position: absolute; font: 900 15px/1 Montserrat, Arial, sans-serif; color: #FF0099; -webkit-text-stroke: .6px #000;
  pointer-events: none; animation: zeta 2.2s ease-out forwards; }
@keyframes zeta { 0% { opacity: 0; transform: translate(0, 0) scale(.6) rotate(-10deg); } 15% { opacity: 1; }
  100% { opacity: 0; transform: translate(18px, -40px) scale(1.25) rotate(12deg); } }
.confeti { position: absolute; width: 7px; height: 11px; border: 1.2px solid #000; border-radius: 2px; pointer-events: none; z-index: 5; }
.pausa { position: absolute; left: -6px; bottom: 4px; width: 26px; height: 26px; border-radius: 50%; border: 1.6px solid #000;
  background: #fff; display: grid; place-items: center; opacity: 0; transition: opacity .2s; padding: 0; }
.mascota:hover .pausa, .pausa:focus-visible { opacity: 1; }

@keyframes flotar { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6%); } }
@keyframes balancear { 0%, 100% { transform: rotate(-2.2deg); } 50% { transform: rotate(2.2deg); } }
@keyframes sombra { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(.78); opacity: .55; } }
@keyframes llama { from { transform: scale(.85, .8); opacity: .55; } to { transform: scale(1.12, 1.3); opacity: .95; } }
@keyframes brillo { 0% { left: -80%; opacity: 0; } 15% { opacity: 1; } 100% { left: 140%; opacity: 0; } }
@keyframes latido { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }

.quieto .cuerpo, .quieto .balancea, .quieto .sombra, .quieto .llama, .quieto .insignia { animation: none !important; }

/* ---------------- Resalte del campo ---------------- */
.resalte { position: absolute; border: 3px solid #FF0099; border-radius: 12px; opacity: 0; transition: opacity .25s;
  box-shadow: 0 0 0 6px rgba(255,0,153,.16); pointer-events: none; }
.resalte.visible { opacity: 1; animation: pulso 1.3s ease-in-out 3; }
@keyframes pulso { 0%, 100% { box-shadow: 0 0 0 4px rgba(255,0,153,.14); } 50% { box-shadow: 0 0 0 11px rgba(255,0,153,.06); } }
.quieto .resalte { animation: none; }

/* ---------------- Bocadillo (ordenador) ---------------- */
.bocadillo { position: absolute; width: 330px; max-width: calc(100vw - 24px); pointer-events: auto; background: #fff; border: 2px solid #000;
  border-radius: 12px; box-shadow: 4px 4px 0 #000; padding: 12px 14px 10px; font-size: 14px; line-height: 1.42;
  opacity: 0; transform: translateY(6px) scale(.98); transform-origin: var(--origen, 0 50%); transition: opacity .2s, transform .2s; }
.bocadillo.visible { opacity: 1; transform: none; }
.bocadillo[hidden] { display: none; }
.bocadillo::before { content: ""; position: absolute; width: 14px; height: 14px; background: #fff; border-left: 2px solid #000;
  border-bottom: 2px solid #000; left: var(--cola-x, -9px); top: var(--cola-y, 26px); transform: rotate(var(--cola-r, 45deg)); }
.cab { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.nombre { font-weight: 800; font-size: 13px; }
.ia { background: #FF0099; color: #fff; font-weight: 800; font-size: 10.5px; padding: 1px 6px; border-radius: 5px; letter-spacing: .3px; }
.quien { font-size: 11px; color: #555; }
.cerrar { margin-left: auto; border: 0; background: none; font-size: 20px; line-height: 1; padding: 0 2px; color: #000; }
.texto b { font-weight: 800; }
.acciones { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.btn { border: 1.6px solid #000; border-radius: 6px; background: #fff; padding: 7px 11px; font-size: 13px; font-weight: 700; color: #000; }
.btn.principal { background: #FFFF33; }
.btn:hover { filter: brightness(.95); }
.btn:focus-visible, .enlace:focus-visible { outline: 3px solid #FF0099; outline-offset: 2px; }
.pie { margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.enlace { border: 0; background: none; padding: 0; font-size: 11.5px; color: #555; text-decoration: underline; }

/* ---------------- Guía paso a paso ---------------- */
.bocadillo.guia { width: 350px; }
.paso-cuenta { margin-left: 2px; font-size: 11px; font-weight: 700; color: #555; }
.paso-barra { height: 4px; background: #ececf6; border-radius: 2px; margin: 4px 0 8px; overflow: hidden; }
.paso-barra i { display: block; height: 100%; background: #FF0099; border-radius: 2px; transition: width .35s ease; }
.paso-titulo { font-size: 15.5px; font-weight: 800; margin: 0 0 4px; }
.paso-pista { margin-top: 6px; font-size: 11.5px; color: #666; }
.paso-ejemplos { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 12px; color: #444; }
.paso-ejemplos span { width: 100%; }
.paso-nav { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px 14px; }
.texto .ver { margin-top: 4px; }
.texto .marca { display: inline-grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: 1.4px solid #000;
  font: 900 10px/1 Montserrat, sans-serif; margin-right: 5px; vertical-align: -3px; background: #fff; }
.texto .bien .marca { background: #CCCCFF; }
.texto .mejor .marca { background: #FFFF33; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn.tambien { background: #CCCCFF; }
.texto .tambien .marca { background: #FF0099; color: #fff; }

/* ---------------- Hoja (móvil) ---------------- */
.hoja { position: absolute; left: 0; right: 0; bottom: var(--abajo, 0px); pointer-events: auto; background: #fff; border-top: 2px solid #000;
  border-radius: 18px 18px 0 0; box-shadow: 0 -5px 0 #FF0099; padding: 14px 16px 16px; font-size: 14.5px; line-height: 1.42;
  transform: translateY(110%); transition: transform .32s cubic-bezier(.2,.8,.2,1); max-height: 60vh; overflow: auto; }
.hoja.visible { transform: none; }
.hoja[hidden] { display: none; }
.hoja .avatar { width: 40px; height: 40px; }
.hoja .acciones .btn { flex: 1 1 auto; padding: 10px 12px; font-size: 14px; }

/* ---------------- Chat ---------------- */
.chat { position: absolute; pointer-events: auto; display: flex; flex-direction: column; background: #fff; border: 2px solid #000;
  border-radius: 14px; box-shadow: 5px 5px 0 #000; overflow: hidden; opacity: 0; transform: translateY(10px); transition: opacity .2s, transform .2s; }
.chat.visible { opacity: 1; transform: none; }
.chat[hidden] { display: none; }
.chat__cab { background: #CCCCFF; border-bottom: 2px solid #000; padding: 8px 10px; display: flex; align-items: center; gap: 8px; }
.avatar { width: 44px; height: 44px; object-fit: contain; flex: none; }
.chat__titulo { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.chat__titulo .fila { display: flex; align-items: center; gap: 6px; }
.icono { border: 1.6px solid #000; background: #fff; border-radius: 50%; width: 30px; height: 30px; display: grid; place-items: center; padding: 0; flex: none; }
.chat__cab .icono:first-of-type { margin-left: auto; }
.icono[aria-pressed="true"] { background: #FFFF33; }
.chat__msgs { flex: 1; overflow: auto; padding: 14px 12px; display: flex; flex-direction: column; gap: 10px; background: #F7F7FF; overscroll-behavior: contain; }
.msg { max-width: 88%; padding: 9px 11px; font-size: 14px; line-height: 1.42; border: 1.6px solid #000; white-space: pre-wrap; word-wrap: break-word; }
.msg.bot { align-self: flex-start; background: #fff; border-radius: 12px 12px 12px 4px; }
.msg.yo { align-self: flex-end; background: #CCCCFF; border-radius: 12px 12px 4px 12px; }
.msg.aviso { align-self: center; border-style: dashed; background: #fffbe0; font-size: 12.5px; }
.msg .acciones { margin-top: 8px; }
.escribiendo { align-self: flex-start; display: flex; gap: 5px; padding: 12px 14px; background: #fff; border: 1.6px solid #000; border-radius: 12px 12px 12px 4px; }
.escribiendo i { width: 7px; height: 7px; border-radius: 50%; background: #FF0099; animation: punto 1s infinite ease-in-out; }
.escribiendo i:nth-child(2) { animation-delay: .15s; } .escribiendo i:nth-child(3) { animation-delay: .3s; }
@keyframes punto { 0%, 100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(-5px); opacity: 1; } }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1.4px solid #000; background: #fff; border-radius: 999px; padding: 6px 10px; font-size: 12.5px; font-weight: 600; }
.chip:hover { background: #FFFF33; }
.chat__pie { border-top: 2px solid #000; padding: 10px; display: flex; gap: 8px; background: #fff; }
.chat__pie input { flex: 1; min-width: 0; border: 1.6px solid #000; border-radius: 999px; padding: 10px 14px; font: 400 14px Montserrat, sans-serif; outline: none; }
.chat__pie input:focus { border-color: #FF0099; }
.enviar { width: 42px; height: 42px; border-radius: 50%; border: 0; background: #FF0099; color: #fff; display: grid; place-items: center; flex: none; padding: 0; }
.enviar:disabled { opacity: .45; }
.alta { display: flex; flex-direction: column; gap: 10px; background: #fff; border: 1.6px solid #000; border-radius: 12px; padding: 14px; font-size: 13.5px; line-height: 1.45; }
.alta h3 { margin: 0; font-size: 16px; font-weight: 800; }
.alta input[type=email], .alta input[inputmode=numeric] { border: 1.6px solid #000; border-radius: 8px; padding: 10px 12px; font: 400 15px Montserrat, sans-serif; width: 100%; }
.alta label { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; }
.alta small { color: #555; font-size: 11.5px; }
.error { color: #b00050; font-size: 12.5px; }
.solo-lectores { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

const ICONOS = {
  pausa: `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/></svg>`,
  play: `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>`,
  campana: `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zm-2 15a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  campanaNo: `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zm-2 15a2 2 0 0 0 4 0M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  cerrar: `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  enviar: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z" fill="currentColor"/></svg>`,
};

class IrisinhoAsistente extends HTMLElement {
  constructor() {
    super();
    this.api = "/api";
    this.estado = null;
    this.analisis = new Map();       // id de archivo -> resultado del análisis del PDF
    this.vistos = new Set();         // consejos ya enseñados (no se repiten)
    this.suaves = 0;                 // máximo 2 consejos que no son errores (venta o ayuda) por pedido
    this.actual = null;              // consejo en pantalla
    this.pendiente = null;           // consejo guardado mientras están los consejos silenciados
    this.silenciado = false;
    this.quieto = false;
    this.pos = { x: 0, y: 0 };
    this.anclado = null;             // nombre del campo al que señala
    this.ultimoCierre = 0;
    this.preciosCache = new Map();
    this.cubiertos = new Set();      // temas que ya explicó una nota (no se repiten en bocadillo)
    this.notaN = 0;
    this.globoCerrado = new Set();   // mensajes del bocadillo que el cliente ha cerrado con la ×
    this.gestosRecientes = [];
    this.chat = { abierto: false, mensajes: [], alta: null, codigo: null, enviando: false };
  }

  connectedCallback() {
    this.api = this.getAttribute("api") || "/api";
    try {
      this.silenciado = localStorage.getItem("irisinho_silencio") === "1";
      this.quieto = localStorage.getItem("irisinho_quieto") === "1";
      this.chat.alta = JSON.parse(localStorage.getItem("irisinho_alta") || "null");
    } catch { /* sin almacenamiento */ }
    this.montar();
    let sinGuia = false;
    try { sinGuia = localStorage.getItem("irisinho_guia") === "no"; } catch { /* nada */ }
    this.guia = new Guia(this, { euros, esc, base: BASE, esMovil });
    if (sinGuia) this.guia.activa = false;
    this.escuchar();
    setTimeout(() => { if (this.guia.activa && this.estado) this.guia.pintar({ desplazar: false }); }, 1300);
    this.colocarEnCasa(false);
    if (!this.quieto && !sinMovimiento()) setTimeout(() => this.saludar(), 900);
    this.microAcciones();
    this.seguirB = (ms) => this.seguir(ms);
    this.rafSeguir = requestAnimationFrame(this.seguirB);
    this.vigilarSueno();
    document.dispatchEvent(new CustomEvent("iris:pedir-estado"));
  }

  // ------------------------------------------------------------------ montaje
  montar() {
    const r = this.attachShadow({ mode: "open" });
    const poses = `<img class="pose espera activa" src="${BASE}poses/reposo.webp" alt="" draggable="false"><div class="rig"></div>`
      + `<img class="pose lupa" src="${BASE}poses/lupa.webp" alt="" draggable="false">`;
    r.innerHTML = `
      <style>${CSS}${CSS_MUNECO}</style>
      <div class="capa${this.quieto ? " quieto" : ""}">
        <div class="resalte"></div>
        <div class="mascota" role="button" tabindex="0" aria-label="Irisinho, asistente con IA de Iris Copy. Abrir el chat">
          <div class="aparta">
            <div class="sombra"></div>
            <div class="cuerpo"><div class="balancea"><div class="inclina"><div class="pop">
              <div class="llama"></div>${poses}<div class="brillo"></div>
            </div></div></div></div>
            <svg class="progreso" viewBox="0 0 100 100" aria-hidden="true"><circle class="fondo" cx="50" cy="50" r="46"/><circle class="barra" cx="50" cy="50" r="46" stroke-dasharray="289" stroke-dashoffset="289"/></svg>
            <span class="insignia">1</span>
            <span class="etiqueta">¿Dudas? Pregúntame</span>
            <button class="pausa" type="button" aria-label="Pausar la animación">${ICONOS.pausa}</button>
          </div>
        </div>
        <div class="globo" role="status" hidden><span class="globo__texto"></span><button type="button" class="globo__x" aria-label="Cerrar el bocadillo">×</button></div>
        <div class="bocadillo" role="dialog" aria-label="Consejo de Irisinho" hidden></div>
        <div class="hoja" role="dialog" aria-label="Consejo de Irisinho" hidden></div>
        <section class="chat" role="dialog" aria-label="Chat con Irisinho" hidden></section>
        <div class="solo-lectores" aria-live="polite"></div>
      </div>`;
    this.$ = (s) => r.querySelector(s);
    this.capa = this.$(".capa");
    this.mascota = this.$(".mascota");
    this.bocadillo = this.$(".bocadillo");
    this.hoja = this.$(".hoja");
    this.panel = this.$(".chat");
    this.resalte = this.$(".resalte");
    this.vivo = this.$(".solo-lectores");
    this.globo = this.$(".globo");
    this.globo.querySelector(".globo__x").addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.globoMsg) this.globoCerrado.add(this.globoMsg.clave);
      if (this.avisoGlobo && this.avisoGlobo.clave === this.globoMsg?.clave) this.avisoGlobo = null;
      this.pintarEtiqueta();
    });
    this.globo.querySelector(".globo__texto").addEventListener("click", () => this.globoMsg?.accion?.());
    this.muneco = new Muneco(this.$(".rig"), this.$(".pose.lupa"), BASE);
    if (this.quieto || sinMovimiento()) this.muneco.quieto(true);
    this.ajustarTamano();
    this.pintarPausa();

    // Pulsar a Irisinho abre siempre el chat (Javi, 25-oct: «que pueda siempre pulsar para resolver una duda»). Lo que
    // dice su etiqueta (seguir con la guía, ver el consejo que dejó…) se hace pulsando la etiqueta.
    this.mascota.addEventListener("click", (e) => {
      if (e.target.closest(".pausa")) return;
      if (e.target.closest(".etiqueta")) return this.alPulsarEtiqueta();
      this.alternarChat();
    });
    this.mascota.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.alternarChat(); }
    });
    this.$(".pausa").addEventListener("click", (e) => { e.stopPropagation(); this.alternarQuieto(); });
  }

  ajustarTamano() {
    this.t = esMovil() ? 70 : 92;
    this.mascota.style.setProperty("--t", this.t + "px");
    this.muneco?.tamano(this.t);
  }

  // ------------------------------------------------------------------ eventos de la página
  escuchar() {
    document.addEventListener("iris:estado", (e) => {
      const previo = this.estado;
      this.estado = e.detail;
      this.pintarEtiqueta();
      const firma = (this.estado.archivos || []).map((a) => a.id).join(",");
      if (firma !== this.firmaArchivos) {
        this.firmaArchivos = firma;
        this.globoCerrado.clear();
        this.cubiertos.clear();
        for (const nota of document.querySelectorAll("irisinho-nota")) nota.cerrar();
      }
      if (this.estado.precio?.cargando) {
        // Si el precio tarda, se impacienta un poco (tamborilea los dedos).
        clearTimeout(this.tEspera);
        this.tEspera = setTimeout(() => { if (this.estado?.precio?.cargando && !this.quieto && !sinMovimiento()) this.muneco.accion(Math.random() < 0.5 ? "pensar" : "tamborilear"); }, 700);
      }
      const uc = this.estado.ultimoCambio;
      if (uc && uc.n !== this.ultimoN) {
        this.ultimoN = uc.n;
        if (uc.origen === "cliente" && CAMPOS_CON_NOTA.includes(uc.campo) && !this.guia.activa) this.mostrarNota(uc);
      }
      this.guia.alCambiarEstado(previo);
      if (!this.estado.archivos?.length && !this.estado.carrito?.lineas?.length) this.suaves = 0;
      for (const id of [...this.analisis.keys()]) if (!this.estado.archivos.some((a) => a.id === id)) this.analisis.delete(id);
      if (this.actual && !this.sigueValido(this.actual)) this.cerrarConsejo(false);
      this.colocar(false);
      this.programarRevision();
    });
    document.addEventListener("iris:archivo", (e) => { this.guia.alSubirArchivo(); this.analizar(e.detail); });
    document.addEventListener("iris:pago-rechazado", () => this.consejoPagoRechazado());
    document.addEventListener("iris:pedido-pendiente", (e) => this.consejoPendiente(e.detail));
    document.addEventListener("iris:pedido-completado", () => {
      this.cerrarConsejo(false);
      this.vistos.clear();
      this.suaves = 0;
      this.pose("celebra", 2600);
      this.saltito();
    });
    let rafPendiente = false;
    const recolocar = () => {
      if (rafPendiente) return;
      rafPendiente = true;
      requestAnimationFrame(() => { rafPendiente = false; this.colocar(false); });
    };
    window.addEventListener("resize", () => { this.ajustarTamano(); recolocar(); });
    const actividad = () => this.actividad();
    for (const ev of ["pointerdown", "keydown", "touchstart", "wheel"]) document.addEventListener(ev, actividad, { passive: true, capture: true });
    document.addEventListener("pointerdown", (e) => this.mirarToque(e), { passive: true });
    window.addEventListener("scroll", () => {
      this.actividad();
      this.alDesplazar();
      recolocar();
      this.apartarAlDesplazar();
      if (this.notaFuera && tarjetaVisible({ abajo: this.barra() })) { this.notaFuera = false; this.pintarEtiqueta(); }
    }, { passive: true });
    document.addEventListener("focusin", (e) => this.alEnfocar(e));
    document.addEventListener("focusout", () => setTimeout(() => this.alEnfocar(null), 50));
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (this.chat.abierto) this.cerrarChat();
      else if (this.actual?.guia) this.guia.pausar();
      else if (this.actual) this.cerrarConsejo(true);
    });
    document.addEventListener("pointermove", (e) => {
      this.mirarCursor(e);
      if (e.pointerType === "mouse" && Date.now() - (this.ultimaActividad || 0) > 1000) this.actividad();
    }, { passive: true });
  }

  // ------------------------------------------------------------------ posición
  barra() {
    const b = document.querySelector("#confirm-bar");
    return b && !b.hidden ? b.getBoundingClientRect().height : 0;
  }
  carritoAbierto() {
    const v = document.querySelector("#veloCarrito");
    return !!v && !v.hidden;
  }
  casa() {
    const t = this.t;
    const alto = window.innerHeight;
    const barra = this.carritoAbierto() ? 0 : this.barra();
    const ancho = document.documentElement.clientWidth || window.innerWidth;
    if (esMovil()) return { x: ancho - t - 8, y: alto - (barra ? barra - 18 : 14) - t };
    return { x: ancho - t - 30, y: alto - barra - t - 26 };
  }
  ancla(nombre) {
    const el = document.querySelector(`[data-iris-ancla="${nombre}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return r;
  }
  visible(r) {
    const arriba = 40;
    const abajo = window.innerHeight - (this.carritoAbierto() ? 0 : this.barra());
    return r.top >= arriba - 10 && r.top + Math.min(r.height, 60) <= abajo;
  }
  destino() {
    if (this.chat.abierto && !esMovil()) return this.casa();
    return this.posadero() || this.casa();
  }
  // Con una tarjeta suya puesta, Irisinho se coloca en el escenario que se abre encima de ese bloque (a la derecha,
  // señalando hacia abajo, con su bocadillo al lado) y va pegado a la página al desplazarse (Javi, 25-oct: «Irisinho
  // arriba, explicando y señalando»). Si el escenario sale de la vista, le acompaña desde el borde de la pantalla —arriba o
  // abajo, según dónde quedó el paso— y su bocadillo lo dice.
  posadero() {
    if (!this.actual || this.chat.abierto) return null;
    const st = escenarioPuesto();
    const r = st?.getBoundingClientRect();
    if (!r?.width) return null;
    const t = this.t;
    const alto = parseFloat(st.style.height) || r.height || t * 0.9;
    const cinta = document.querySelector(".demo-cinta")?.getBoundingClientRect().bottom || 0;
    const abajo = window.innerHeight - (this.carritoAbierto() ? 0 : this.barra());
    this.escenario = { left: r.left, right: r.right, top: r.top, alto };
    const medio = r.top + alto * 0.5;
    // Mientras la página se desplaza hacia un paso nuevo, va directo a su sitio (sin decir «seguimos aquí abajo»).
    const enCamino = Date.now() < (this.enCaminoHasta || 0);
    if (enCamino || (medio > cinta && medio < abajo)) return { x: r.right - t + 4, y: r.top - t * 0.06, posado: true, pagina: true };
    // El escenario se fue por arriba pero el bloque o su tarjeta siguen a la vista: se queda pegado arriba, acompañando
    // (sin bocadillo, para no tapar las opciones).
    const tar = tarjetaPuesta()?.caja.getBoundingClientRect();
    const fondoBloque = Math.max(tar?.bottom || 0, st.parentElement?.getBoundingClientRect().bottom || 0);
    if (medio <= cinta && fondoBloque > cinta + t * 1.2) return { x: r.right - t + 4, y: cinta + 2, pegado: true };
    const ancho = document.documentElement.clientWidth || window.innerWidth;
    if (medio <= cinta) return { x: ancho - t - (esMovil() ? 8 : 30), y: cinta + 8, fuera: "arriba" };
    return { ...this.casa(), fuera: "abajo" };
  }
  colocar() {
    this.colocarBocadillo();
    this.colocarGlobo();
    this.colocarChat();
  }
  // Movimiento continuo (25-oct, Javi: «que se mueva fluido, no que aparezca y desaparezca en un sitio»): en cada
  // fotograma Irisinho persigue su sitio con un muelle. Si su sitio va pegado a la página (el escenario de un bloque), el
  // muelle trabaja en coordenadas de la página: al desplazarse va pegado al contenido, y el muelle solo se nota cuando el
  // sitio cambia (otro paso, la página se recoloca). Los cambios grandes (otra sección, ir al borde) van volando en arco.
  seguir(ms) {
    this.rafSeguir = requestAnimationFrame(this.seguirB);
    const dt = Math.min(0.05, Math.max(0, (ms - (this.tSeguir ?? ms)) / 1000));
    this.tSeguir = ms;
    if (this.volando || document.hidden) return;
    const d = this.destino();
    if (!!d.posado !== !!this.posado || d.fuera !== this.fuera || !!d.pegado !== !!this.pegado) {
      this.posado = !!d.posado;
      this.fuera = d.fuera;
      this.pegado = !!d.pegado;
      this.pintarEtiqueta();
      if ((d.fuera || d.posado) && !this.dormido) setTimeout(() => this.senalar(true), 350);
    }
    const ox = d.pagina ? window.scrollX : 0;
    const oy = d.pagina ? window.scrollY : 0;
    let m = this.muellePos;
    if (!m || m.pagina !== !!d.pagina) m = this.muellePos = { pagina: !!d.pagina, x: this.pos.x + ox, y: this.pos.y + oy, vx: 0, vy: 0 };
    const tx = d.x + ox;
    const ty = d.y + oy;
    const quieto = this.quieto || sinMovimiento();
    if (Math.hypot(tx - m.x, ty - m.y) > 150 && !quieto) { this.muellePos = null; this.volar(d); return; }
    if (quieto || !dt) { m.x = tx; m.y = ty; m.vx = 0; m.vy = 0; }
    else {
      for (let resto = dt; resto > 0; resto -= 1 / 120) {
        const h = Math.min(resto, 1 / 120);
        m.vx += (150 * (tx - m.x) - 21 * m.vx) * h;
        m.vy += (150 * (ty - m.y) - 21 * m.vy) * h;
        m.x += m.vx * h;
        m.y += m.vy * h;
      }
    }
    const x = m.x - ox;
    const y = m.y - oy;
    if (Math.abs(x - this.pos.x) > 0.05 || Math.abs(y - this.pos.y) > 0.05 || this.globoSucio) {
      this.globoSucio = false;
      this.pos = { x, y };
      this.mascota.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      this.colocarBocadillo();
      this.colocarGlobo();
    }
  }
  colocarEnCasa(animado) {
    this.anclado = null;
    this.colocar(animado);
  }
  fijar(d) {
    this.pos = { x: d.x, y: d.y };
    this.mascota.style.transform = `translate(${d.x}px, ${d.y}px)`;
  }
  volar(d) {
    const desde = { ...this.pos };
    const dist = Math.hypot(d.x - desde.x, d.y - desde.y);
    const dur = Math.min(950, 420 + dist * 0.55);
    const dir = Math.sign(d.x - desde.x) || 1;
    this.vuelo = { desde, t0: performance.now(), dur, alto: Math.min(90, 30 + dist * 0.12) };
    this.muneco.accion("volar", { dir, ms: dur });
    if (this.volando) return;            // ya volaba: solo cambia el plan
    this.volando = true;
    this.capa.classList.add("volando");
    this.$(".pop").animate([{ transform: "rotate(0deg)" }, { transform: `rotate(${dir * 9}deg)` }, { transform: `rotate(${dir * 6}deg)` }, { transform: "rotate(0deg)" }], { duration: dur, easing: "ease-in-out" });
    const suaveV = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const paso = () => {
      const v = this.vuelo;
      const p = Math.min(1, (performance.now() - v.t0) / v.dur);
      const k = suaveV(p);
      const fin = this.destino();
      const x = v.desde.x + (fin.x - v.desde.x) * k;
      const y = v.desde.y + (fin.y - v.desde.y) * k - Math.sin(Math.PI * k) * v.alto;
      this.pos = { x, y };
      this.mascota.style.transform = `translate(${x}px, ${y}px)`;
      this.colocarBocadillo();
      this.colocarGlobo();
      if (p < 1) { this.rafVuelo = requestAnimationFrame(paso); return; }
      this.volando = false;
      this.vuelo = null;
      this.capa.classList.remove("volando");
      this.aterrizar();
      this.muellePos = null;
      this.fijar(this.destino());
      this.colocarBocadillo();
      this.colocarGlobo();
    };
    this.rafVuelo = requestAnimationFrame(paso);
  }
  aterrizar() {
    if (this.quieto || sinMovimiento()) return;
    this.$(".pop").animate([
      { transform: "scale(1,1)" }, { transform: "scale(1.1,.88)" }, { transform: "scale(.95,1.06)" }, { transform: "scale(1,1)" },
    ], { duration: 420, easing: "ease-out" });
  }
  saltito() {
    if (this.quieto || sinMovimiento()) return;
    this.$(".pop").animate([
      { transform: "translateY(0) scale(1,1)" }, { transform: "translateY(2%) scale(1.08,.92)", offset: .15 },
      { transform: "translateY(-16%) scale(.95,1.06)", offset: .45 }, { transform: "translateY(0) scale(1.06,.94)", offset: .75 },
      { transform: "translateY(0) scale(1,1)" },
    ], { duration: 650, easing: "ease-out" });
  }
  pose(nombre, ms) {
    clearTimeout(this.tPose);
    if (this.dormido && nombre !== "reposo") this.despertar();
    this.muneco.pose(nombre);
    if (nombre !== this.poseActual && !this.quieto && !sinMovimiento()) {
      this.$(".pop").animate([{ transform: "scale(1)" }, { transform: "scale(1.07,.93)" }, { transform: "scale(.97,1.04)" }, { transform: "scale(1)" }], { duration: 360, easing: "ease-out" });
    }
    this.poseActual = nombre;
    if (ms) this.tPose = setTimeout(() => this.pose(this.actual?.pose || "reposo"), ms);
  }
  saludar() {
    this.pose("saluda", 2200);
    this.brillar();
  }
  brillar() {
    const c = this.capa;
    c.classList.remove("brillando");
    void c.offsetWidth;
    c.classList.add("brillando");
  }
  microAcciones() {
    // Vida: el ojo, las manos y la antena se mueven siempre (muneco.js). Además, cada 6-11 s hace algo: rascarse la
    // cabeza, girarse a mirar la página, mirar alrededor, mirarse el guante, un saltito o un brillo. Mientras señala un
    // bloque no hace gestos grandes (sigue señalando, parpadea y mira).
    // 25-oct (Javi: «no son suficientes, que se sienta más vivo»): cada 3,5-7 s, y también con la tarjeta puesta (entonces
    // sobre todo la señala).
    const siguiente = () => setTimeout(() => {
      if (!this.quieto && !sinMovimiento() && !this.chat.abierto && !document.hidden && !this.volando && !this.mirandoPdf
        && !this.dormido && !this.mascota.classList.contains("oculto")) this.gestoAlAzar();
      siguiente();
    }, 3500 + Math.random() * 3500);
    siguiente();
  }
  // Un gesto al azar (con pesos), sin repetir ninguno de los dos últimos (Javi, 25-oct: «que no repita seguidas»).
  gestoAlAzar() {
    const todos = this.actual
      ? [["senalar", 20], ["antena", 9], ["pirueta", 7], ["voltereta", 6], ["rascar", 8], ["alrededor", 7], ["brazos", 8], ["guante", 5], ["asentir", 5], ["saltito", 4], ["estirarse", 4], ["aplaudir", 3], ["idea", 7], ["pensar", 6], ["pulgar", 4], ["ok", 3]]
      : [["antena", 10], ["pirueta", 8], ["voltereta", 7], ["rascar", 10], ["girar", 9], ["alrededor", 8], ["guante", 8], ["brazos", 10], ["estirarse", 6], ["aplaudir", 3], ["saltito", 4], ["saludo", 4], ["brillo", 2], ["idea", 7], ["pensar", 7], ["pulgar", 3], ["ok", 3]];
    const lista = todos.filter(([g]) => !this.gestosRecientes.includes(g));
    let r = Math.random() * lista.reduce((s, [, peso]) => s + peso, 0);
    const [g] = lista.find(([, peso]) => (r -= peso) < 0) || lista[0];
    let hecho = true;
    const m = this.muneco;
    const libre = m.modoEfectivo() === "reposo" && !m.ocupado();
    if (g === "senalar") hecho = m.accion("senalar", { apunta: this.apuntaHacia() });
    else if (g === "saltito") this.saltito();
    else if (g === "brillo") this.brillar();
    else if (g === "voltereta") { if (libre) this.voltereta(); else hecho = false; }
    else if (g === "saludo") { if (libre) this.pose("saluda", 2400); else hecho = false; }
    else hecho = m.accion(g, { dir: -1 });
    if (hecho) this.gestosRecientes = [g, ...this.gestosRecientes].slice(0, 2);
  }
  // Señala la tarjeta (posado: hacia abajo a la izquierda), el bloque (a su lado: a la izquierda) o hacia arriba.
  apuntaHacia() {
    return this.fuera === "arriba" ? 45 : this.fuera === "abajo" ? -70 : this.posado || this.pegado ? -35 : 28;
  }
  senalar(forzar = false) {
    this.muneco.accion("senalar", { apunta: this.apuntaHacia(), forzar });
  }
  volverAlPaso() {
    if (this.actual?.ancla) verTarjeta(this.actual.ancla, { abajo: this.carritoAbierto() ? 0 : this.barra() });
  }
  // Reacción a lo que acaba de elegir el cliente.
  reaccionar(tipo) {
    if (this.quieto || sinMovimiento()) return;
    const m = this.muneco;
    if (tipo === "bien") {
      // Asiente y después 👍, OK o aplauso (sin repetir el de la vez anterior).
      m.accion("asentir");
      const opciones = ["pulgar", "ok", "aplaudir"].filter((g) => g !== this.ultimoBien);
      const g = opciones[Math.floor(Math.random() * opciones.length)];
      this.ultimoBien = g;
      setTimeout(() => m.accion(g, { forzar: true }), 700);
    }
    else if (tipo === "mejor") { m.accion("negar"); setTimeout(() => this.senalar(true), 800); }
    else if (tipo === "extra") { m.accion("asentir"); setTimeout(() => this.senalar(true), 800); }
    else if (tipo === "senalar") this.senalar(true);
    else if (tipo === "final") this.celebrar(true);
  }
  celebrar(grande = false) {
    // La mitad de las veces, puño arriba en vez de las dos manos.
    if (!grande && Math.random() < 0.5 && this.muneco.accion("puno", { forzar: true })) {
      this.saltito();
      this.confeti();
      return;
    }
    this.pose("celebra", 1600);
    this.saltito();
    this.confeti();
    if (grande) setTimeout(() => this.voltereta(), 650);
  }
  voltereta() {
    if (this.quieto || sinMovimiento()) return;
    // Coge impulso (se agacha), voltereta en el aire y aterriza aplastándose un poco.
    this.$(".pop").animate([
      { transform: "translateY(0) rotate(0deg) scale(1, 1)" },
      { transform: "translateY(4%) rotate(0deg) scale(1.08, .9)", offset: 0.14 },
      { transform: "translateY(-18%) rotate(-180deg) scale(.96, 1.05)", offset: 0.55 },
      { transform: "translateY(0) rotate(-360deg) scale(1.07, .93)", offset: 0.88 },
      { transform: "translateY(0) rotate(-360deg) scale(1, 1)" },
    ], { duration: 1080, easing: "cubic-bezier(.45,0,.3,1)" });
  }
  confeti() {
    if (this.quieto || sinMovimiento()) return;
    const cx = this.pos.x + this.t / 2;
    const cy = this.pos.y + this.t * 0.4;
    const colores = ["#FF0099", "#FFFF33", "#CCCCFF", "#7FD6FF"];
    for (let i = 0; i < 18; i++) {
      const c = document.createElement("i");
      c.className = "confeti";
      Object.assign(c.style, { left: cx + "px", top: cy + "px", background: colores[i % colores.length] });
      this.capa.append(c);
      const ang = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
      const dist = 40 + Math.random() * 55;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - 30;
      c.animate([
        { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${200 + Math.random() * 300}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.2}px), calc(-50% + ${dy + 80}px)) rotate(${400 + Math.random() * 300}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 300, easing: "cubic-bezier(.2,.7,.3,1)" }).finished.then(() => c.remove(), () => c.remove());
    }
  }
  // Una vez por visitante: le recuerda que puede pulsarle para preguntar (5 s en su bocadillo).
  pistaChat() {
    try { if (localStorage.getItem("irisinho_pista_chat")) return; localStorage.setItem("irisinho_pista_chat", "1"); } catch { /* nada */ }
    setTimeout(() => {
      if (!this.chat.abierto) this.avisarGlobo({ clave: "pista", texto: "¿Dudas? Pulsa aquí", accion: () => this.abrirChat() }, 5000);
    }, 1200);
  }
  alPulsarEtiqueta() {
    if (this.notaFuera) return this.verNotaFuera();
    if (this.guia.activa && this.guia.pausada) return this.guia.reanudar();
    if (this.pendiente && !this.actual) return this.mostrar(this.pendiente, true);
    if (!this.estado?.archivos?.length) return this.ejecutar({ tipo: "subir" });
    return this.alternarChat();
  }
  // ------------------------------------------------------------------ se da cuenta de lo que haces (25-oct)
  // Mira hacia donde toca o pulsa el cliente.
  mirarToque(e) {
    if (this.quieto || sinMovimiento() || e.composedPath?.().includes(this.mascota)) return;
    const dx = e.clientX - (this.pos.x + this.t / 2);
    const dy = e.clientY - (this.pos.y + this.t * 0.45);
    this.muneco.mirarA(Math.max(-1, Math.min(1, dx / 200)), Math.max(-1, Math.min(1, dy / 200)));
  }
  // Velocidad del desplazamiento: al bajar o subir rápido, manos y antena se quedan atrás y rebotan.
  alDesplazar() {
    const ahora = performance.now();
    const y = window.scrollY;
    if (this.desplazAnterior) {
      const dt = Math.max(16, ahora - this.desplazAnterior.t) / 1000;
      this.muneco.empujar((y - this.desplazAnterior.y) / dt);
    }
    this.desplazAnterior = { t: ahora, y };
  }
  // Si nadie toca nada durante 25 s se duerme (ojo cerrado y «Zzz»); al tocar la pantalla se despierta de un respingo.
  actividad() {
    this.ultimaActividad = Date.now();
    if (this.dormido) this.despertar();
  }
  vigilarSueno() {
    this.ultimaActividad = Date.now();
    setInterval(() => {
      if (this.dormido || Date.now() - this.ultimaActividad < 25000) return;
      if (this.chat.abierto || this.mirandoPdf || this.volando || this.quieto || sinMovimiento() || document.hidden) return;
      this.dormir();
    }, 1000);
  }
  dormir() {
    this.dormido = true;
    this.muneco.dormir(true);
    this.pintarEtiqueta();
    const zeta = () => {
      if (!this.dormido) return;
      const z = document.createElement("span");
      z.className = "zeta";
      z.textContent = "Z";
      Object.assign(z.style, { left: this.pos.x + this.t * 0.7 + "px", top: this.pos.y + this.t * 0.12 + "px", fontSize: 12 + Math.random() * 6 + "px" });
      this.capa.append(z);
      setTimeout(() => z.remove(), 2300);
    };
    setTimeout(zeta, 900);
    this.tZetas = setInterval(zeta, 1100);
  }
  despertar() {
    if (!this.dormido) return;
    this.dormido = false;
    clearInterval(this.tZetas);
    this.muneco.dormir(false);
    this.muneco.accion("respingo");
    this.saltito();
    this.pintarEtiqueta();
  }
  hablar(ms = 900) {
    if (!this.quieto && !sinMovimiento()) this.muneco.accion("hablar", { ms });
  }
  mirarCursor(e) {
    // El ojo sigue al ratón cuando pasa cerca (antes giraba el robot entero).
    if (esMovil() || this.quieto || this.volando || this.actual) return;
    const cx = this.pos.x + this.t / 2;
    const cy = this.pos.y + this.t / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    if (Math.hypot(dx, dy) > 650) return this.muneco.mirarA(null);
    this.muneco.mirarA(Math.max(-1, Math.min(1, dx / 260)), Math.max(-1, Math.min(1, dy / 260)));
  }
  apartarAlDesplazar() {
    // Ya no se aparta al desplazar (25-oct): va con el cliente.
  }
  alEnfocar(e) {
    // En el móvil, mientras el cliente escribe en un campo de la página, Irisinho se aparta para no tapar el teclado.
    const el = e?.target;
    const escribe = !!el && el !== this && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["radio", "checkbox", "button"].includes(el.type)));
    this.mascota.classList.toggle("oculto", esMovil() && escribe && !this.chat.abierto);
    this.escribiendo = escribe;
    this.pintarEtiqueta();
  }
  alternarQuieto() {
    this.quieto = !this.quieto;
    this.capa.classList.toggle("quieto", this.quieto);
    this.muneco.quieto(this.quieto || sinMovimiento());
    try { localStorage.setItem("irisinho_quieto", this.quieto ? "1" : "0"); } catch { /* nada */ }
    this.pintarPausa();
  }
  pintarPausa() {
    const b = this.$(".pausa");
    b.innerHTML = this.quieto ? ICONOS.play : ICONOS.pausa;
    b.setAttribute("aria-label", this.quieto ? "Reanudar la animación" : "Pausar la animación");
    const c = this.shadowRoot.querySelector(".chat [data-accion='quieto']");
    if (c) { c.innerHTML = this.quieto ? ICONOS.play : ICONOS.pausa; c.setAttribute("aria-pressed", this.quieto ? "true" : "false"); }
  }

  // ------------------------------------------------------------------ notas bajo cada opción (qué eliges y si te conviene)
  async mostrarNota(uc) {
    const n = ++this.notaN;
    const necesitaColor = ["printType", "paperType", "printForm"].includes(uc.campo);
    const t0 = Date.now();
    // Espera al precio nuevo (lo recalcula la página tras el cambio) y al análisis del PDF, con tope.
    for (;;) {
      const e = this.estado;
      const hay = e.archivos?.length > 0;
      const mayor = hay ? e.archivos.reduce((m, a) => (!m || a.hojas > m.hojas ? a : m), null) : null;
      const r = mayor ? this.analisis.get(mayor.id) : null;
      const precioListo = !hay || (e.precio && !e.precio.cargando && (e.precio.n ?? 0) >= uc.n);
      const pdfListo = !hay || (r && (!necesitaColor || r.paginasColor != null));
      if ((precioListo && pdfListo) || Date.now() - t0 > 4500) break;
      await espera(150);
      if (n !== this.notaN) return;
    }
    const e = this.estado;
    const valorAhora = uc.campo === "encuadernacion" ? e.config.encuadernacion?.[uc.clave] : e.config[uc.campo];
    if (valorAhora !== uc.valor) return;
    if (uc.campo === "encuadernacion" && !this.catalogo) {
      this.catalogo = await fetch(new URL("encuadernacion.json", document.baseURI)).then((r) => r.json()).catch(() => null);
    }
    const mayor = (e.archivos || []).reduce((m, a) => (!m || a.hojas > m.hojas ? a : m), null);
    let res = null;
    try {
      res = await explicar(uc.campo, {
        estado: e, analisis: mayor ? this.analisis.get(mayor.id) : null, cambio: uc, catalogo: this.catalogo,
        precioCon: (c) => this.precioCon(c), diferencia: (a, b) => this.diferencia(a, b), euros, esc,
      });
    } catch { res = null; }
    if (!res || n !== this.notaN) return;
    const tema = temaDe(uc.campo, uc.valor);
    if (tema && e.archivos?.length) this.cubiertos.add(tema);
    this.pintarNota(uc.campo, res);
  }
  pintarNota(campo, res) {
    const grupo = document.querySelector(`[data-iris-ancla="${campo}"]`);
    if (!grupo) return;
    for (const otra of document.querySelectorAll("irisinho-nota")) if (otra.parentElement !== grupo) otra.cerrar();
    let nota = [...grupo.children].find((x) => x.tagName === "IRISINHO-NOTA" && !x.cerrando);
    if (!nota) {
      nota = document.createElement("irisinho-nota");
      grupo.append(nota);
    }
    nota.pintar(res, BASE, (accion) => {
      this.ejecutar(accion);
      nota.confirmar();
      this.celebrar();
    });
    if (this.actual || this.chat.abierto) return;
    this.hablar(700);
    if (res.tipo === "mejor") this.reaccionar("mejor");
    else if (res.tipo === "bien") this.reaccionar(res.extra ? "extra" : "bien");
  }

  // La etiqueta pequeña solo sale al pasar el ratón («¿Dudas? Pregúntame») o mientras revisa el PDF. Lo demás va en el
  // bocadillo, que tiene ×.
  pintarEtiqueta() {
    const et = this.$(".etiqueta");
    if (!et) return;
    this.pintarGlobo();
    this.capa.classList.remove("invita");
    this.capa.classList.toggle("sin-etiqueta", !!this.actual || this.chat.abierto || !!this.globoMsg);
    et.textContent = this.mirandoPdf ? "Revisando tu PDF…" : "¿Dudas? Pregúntame";
  }

  // Bocadillo junto a Irisinho (25-oct, Javi): qué está eligiendo el cliente en cada sección (móvil, con la guía; fijo
  // mientras está en ella), avisos de un momento («¿Dudas? Pulsa aquí», 5 s) y lo que puede hacer (seguir la guía, ver el
  // consejo que dejó, subir un PDF; se pulsa el texto). Siempre con ×: si el cliente lo cierra, ese mensaje no vuelve.
  pintarGlobo() {
    const g = this.globo;
    if (!g) return;
    const e = this.estado;
    const vacio = !e?.archivos?.length && !e?.carrito?.lineas?.length;
    const libre = !this.chat.abierto && !this.dormido && !this.mascota.classList.contains("oculto");
    let m = null;
    if (libre) {
      if (this.avisoGlobo && Date.now() < this.avisoGlobo.hasta) m = this.avisoGlobo;
      else if (this.fuera && this.actual) {
        const sube = this.fuera === "arriba";
        m = { clave: `fuera:${this.fuera}:${this.actual.ancla}`, accion: () => this.volverAlPaso(),
          texto: this.actual.guia ? (sube ? "Seguimos aquí arriba ↑" : "Seguimos aquí abajo ↓") : (sube ? "Te he dejado un consejo ↑" : "Te he dejado un consejo ↓") };
      } else if (this.notaFuera) m = { clave: "fuera", texto: "Te he dejado un consejo " + ((tarjetaPuesta()?.caja.getBoundingClientRect().top ?? 1) < 0 ? "↑" : "↓"), accion: () => this.verNotaFuera() };
      else if (this.guia?.activa && this.guia.pausada && !this.actual) m = { clave: "pausada", texto: "¿Seguimos con la guía?", accion: () => this.guia.reanudar() };
      else if (this.pendiente && !this.actual) m = { clave: "guardado", texto: "Tengo un consejo para ti", accion: () => this.mostrar(this.pendiente, true) };
      else if (this.seccionGlobo && !this.pegado) m = this.seccionGlobo;
      else if (vacio && !this.actual && !this.mirandoPdf) m = { clave: "vacio", texto: "Sube un PDF y te ayudo", accion: () => this.ejecutar({ tipo: "subir" }) };
    }
    if (m && this.globoCerrado.has(m.clave)) m = null;
    this.globoMsg = m;
    clearTimeout(this.tGlobo);
    if (!m) {
      g.classList.remove("visible");
      this.tGlobo = setTimeout(() => { if (!this.globoMsg) g.hidden = true; }, 200);
      return;
    }
    const txt = g.querySelector(".globo__texto");
    const nuevo = txt.textContent !== m.texto;
    if (nuevo) txt.textContent = m.texto;
    g.classList.toggle("accion", !!m.accion);
    g.classList.toggle("con-flecha", !!m.accion && !/[↑↓→]/.test(m.texto));
    if (g.hidden) {
      g.hidden = false;
      this.colocarGlobo();
      requestAnimationFrame(() => g.classList.add("visible"));
      return;
    }
    g.classList.add("visible");
    this.colocarGlobo();
    if (nuevo && !this.quieto && !sinMovimiento()) g.animate([{ transform: "scale(.9)" }, { transform: "scale(1.04)" }, { transform: "none" }], { duration: 260, easing: "ease-out" });
  }
  colocarGlobo() {
    const g = this.globo;
    if (!g || g.hidden) return;
    const { x, y } = this.pos;
    const t = this.t;
    const e = this.posado && this.escenario;
    g.style.maxWidth = Math.max(140, Math.min(esMovil() ? 290 : 330, x - (e ? e.left : 0) - 12)) + "px";
    const w = g.offsetWidth;
    const h = g.offsetHeight;
    const cinta = document.querySelector(".demo-cinta")?.getBoundingClientRect().bottom || 0;
    // En el escenario: a la izquierda de Irisinho, centrado en el hueco que se abre encima del bloque.
    let top = e ? y + t * 0.06 + (e.alto - h) / 2 : y + t * 0.3 - h / 2;
    top = Math.max(cinta + 4, Math.min(top, window.innerHeight - h - 6));
    g.style.left = Math.max(e ? e.left : 8, x - w - 4) + "px";
    g.style.top = top + "px";
    g.style.setProperty("--cola", Math.max(12, Math.min(h - 12, y + t * 0.38 - top)) + "px");
  }
  avisarGlobo(m, ms = 5000) {
    this.avisoGlobo = { ...m, hasta: Date.now() + ms };
    this.pintarEtiqueta();
    clearTimeout(this.tAviso);
    this.tAviso = setTimeout(() => { this.avisoGlobo = null; this.pintarEtiqueta(); }, ms + 30);
  }
  ponerGloboSeccion(m) {
    this.seccionGlobo = m;
    this.pintarEtiqueta();
  }

  // ------------------------------------------------------------------ análisis del PDF (en el navegador del cliente)
  // Dos pasos para que el cliente no espere:
  //   A) lo rápido (orientación, texto y tamaño de letra; < 1 s): en cuanto acaba, Irisinho ya puede aconsejar;
  //   B) el color (hay que dibujar páginas: con fotos, hasta ~1 s cada una en un equipo lento), en segundo plano,
  //      con una muestra repartida por el PDF y un tope de tiempo. Si solo ha mirado una muestra, no da cifras exactas.
  async analizar({ id, nombre, paginas, datos }) {
    this.analizando = (this.analizando || 0) + 1;     // frena los consejos (solo durante el paso A)
    this.mirandoPdf = (this.mirandoPdf || 0) + 1;     // anillo y lupa (pasos A y B)
    this.capa.classList.add("analizando");
    this.pintarEtiqueta();
    this.pose("lupa");
    this.vivo.textContent = `Irisinho está revisando ${nombre}.`;
    const barra = this.$(".progreso .barra");
    const progreso = (f) => barra.setAttribute("stroke-dashoffset", String(289 * (1 - f)));
    progreso(0.05);
    let doc = null;
    let res = { paginas, nombre, apaisadas: [], fraccionApaisadas: 0, exactoApaisadas: true, letra: null, paginasFoto: null, paginasColor: null, escaneado: false, estimado: true };
    let pasoA = false;
    const terminarA = () => {
      if (pasoA) return;
      pasoA = true;
      this.analisis.set(id, { ...res });
      this.analizando--;
      this.programarRevision(150);
    };
    try {
      doc = await pdfjs.getDocument({ data: datos }).promise;
      const n = doc.numPages;
      res.paginas = n;
      const repartidas = (cuantas) => (n <= cuantas ? Array.from({ length: n }, (_, k) => k + 1)
        : [...new Set(Array.from({ length: cuantas }, (_, k) => 1 + Math.round((k * (n - 1)) / (cuantas - 1))))]);
      // A1) orientación (todas si son pocas; si no, 150 repartidas)
      const ori = repartidas(150);
      const apaisadas = [];
      for (const i of ori) {
        const pg = await doc.getPage(i);
        const v = pg.getViewport({ scale: 1 });
        if (v.width > v.height + 0.5) apaisadas.push(i);
      }
      res.apaisadas = apaisadas;
      res.fraccionApaisadas = apaisadas.length / ori.length;
      res.exactoApaisadas = ori.length === n;
      const v1 = (await doc.getPage(1)).getViewport({ scale: 1 });
      res.anchoPt = v1.width;
      res.altoPt = v1.height;
      res.tamano = tamanoDe(v1.width, v1.height);
      progreso(0.25);
      // A2) texto y tamaño de letra en 40 páginas repartidas
      const conTexto = repartidas(40);
      const tamanos = [];
      const letrasDe = new Map();
      for (const i of conTexto) {
        const pg = await doc.getPage(i);
        const tc = await pg.getTextContent();
        let letras = 0;
        for (const it of tc.items) {
          const s = (it.str || "").trim();
          if (!s) continue;
          letras += s.length;
          const tam = Math.hypot(it.transform[2], it.transform[3]);
          if (tam > 2 && tam < 80) tamanos.push([tam, s.length]);
        }
        letrasDe.set(i, letras);
      }
      tamanos.sort((a, b) => a[0] - b[0]);
      const pesoTotal = tamanos.reduce((s, x) => s + x[1], 0);
      let acum = 0;
      for (const [tam, peso] of tamanos) {
        acum += peso;
        if (acum >= pesoTotal / 2) { res.letra = Math.round(tam * 10) / 10; break; }
      }
      progreso(0.4);
      terminarA();

      // B) color, fotos y escaneo, dibujando páginas en miniatura con tope de tiempo
      const orden = repartidas(60).sort((a, b) => ((a * 0.6180339887) % 1) - ((b * 0.6180339887) % 1));
      const PRESUPUESTO_MS = 2500;
      const MINIMO = Math.min(3, orden.length);
      const lienzo = document.createElement("canvas");
      const ctx = lienzo.getContext("2d", { willReadFrequently: true });
      let foto = 0, color = 0, escaneadas = 0, hechas = 0;
      const tB = performance.now();
      for (const i of orden) {
        if (hechas >= MINIMO && performance.now() - tB > PRESUPUESTO_MS) break;
        const pg = await doc.getPage(i);
        const v = pg.getViewport({ scale: 1 });
        const vp = pg.getViewport({ scale: 64 / Math.max(v.width, v.height) });
        lienzo.width = Math.ceil(vp.width);
        lienzo.height = Math.ceil(vp.height);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, lienzo.width, lienzo.height);
        await pg.render({ canvasContext: ctx, viewport: vp }).promise;
        const px = ctx.getImageData(0, 0, lienzo.width, lienzo.height).data;
        let col = 0, tinta = 0;
        for (let k = 0; k < px.length; k += 4) {
          const r = px[k], g = px[k + 1], b = px[k + 2];
          if (Math.max(r, g, b) - Math.min(r, g, b) > 46) col++;
          if ((r + g + b) / 3 < 225) tinta++;
        }
        const total = px.length / 4;
        if (col / total > 0.12) foto++;
        if (col / total > 0.004) color++;
        let letras = letrasDe.get(i);
        if (letras === undefined) {
          const tc = await pg.getTextContent();
          letras = tc.items.reduce((s, it) => s + (it.str || "").trim().length, 0);
        }
        if (letras < 15 && tinta / total > 0.04) escaneadas++;
        hechas++;
        pg.cleanup();
        progreso(0.4 + 0.6 * Math.max(hechas / orden.length, Math.min(1, (performance.now() - tB) / PRESUPUESTO_MS)));
      }
      const m = Math.max(1, hechas);
      res = {
        ...res,
        estimado: m < n,
        muestra: m,
        paginasFoto: Math.round((foto / m) * n),
        paginasColor: Math.round((color / m) * n),
        fraccionFoto: foto / m,
        fraccionColor: color / m,
        escaneado: escaneadas / m >= 0.6,
      };
    } catch {
      res = { ...res, fallo: true, paginasFoto: res.paginasFoto ?? 0, paginasColor: res.paginasColor ?? 0 };
    } finally {
      try { await doc?.destroy(); } catch { /* nada */ }
    }
    terminarA();
    this.analisis.set(id, res);
    this.mirandoPdf--;
    if (this.mirandoPdf > 0) return;
    this.capa.classList.remove("analizando");
    this.pintarEtiqueta();
    if (!this.actual) this.pose("reposo");
    this.vivo.textContent = `Irisinho ha revisado ${nombre}.`;
    this.programarRevision(150);
    this.guia.alTerminarAnalisis();
  }

  // ------------------------------------------------------------------ precios (siempre de la calculadora de la tienda)
  async precioCon(cambios) {
    const e = this.estado;
    if (!e?.archivos?.length) return null;
    const config = { ...e.config, ...cambios, encuadernacion: { ...e.config.encuadernacion, ...(cambios.encuadernacion || {}) } };
    const archivos = e.archivos.map((a) => ({ paginas: a.paginas }));
    const clave = JSON.stringify({ config, archivos });
    if (this.preciosCache.has(clave)) return this.preciosCache.get(clave);
    const prom = pedirPrecio(config, archivos, this.api)
      .then((d) => (d.error ? null : d))
      .catch(() => null);
    this.preciosCache.set(clave, prom);
    return prom;
  }
  diferencia(nuevo, actual) {
    const d = Math.round((nuevo - actual) * 100) / 100;
    if (Math.abs(d) < 0.005) return "mismo precio";
    return d > 0 ? `+${euros(d)}` : `${euros(-d)} menos`;
  }

  // ------------------------------------------------------------------ motor de consejos
  programarRevision(ms = 650) {
    clearTimeout(this.tRevision);
    this.tRevision = setTimeout(() => this.revisar(), ms);
  }
  async revisar() {
    const e = this.estado;
    if (!e || this.actual || this.chat.abierto || this.revisando) return;
    if (this.guia.activa && e.pagina !== "carrito") return;
    if (e.precio?.cargando || this.analizando > 0) return this.programarRevision(400);
    if (Date.now() - this.ultimoCierre < 3500) return this.programarRevision(3600 - (Date.now() - this.ultimoCierre));
    if (this.escribiendo) return this.programarRevision(1500);
    this.revisando = true;
    try {
      for (const regla of this.reglas()) {
        let c = null;
        try { c = await regla(); } catch { c = null; }
        if (!c || this.vistos.has(c.clave) || this.cubiertos.has(c.clave.split(":")[0])) continue;
        if (c.tipo !== "error" && this.suaves >= 2) continue;
        if (this.estado !== e) return this.programarRevision(200); // cambió mientras pensaba
        this.mostrar(c);
        return;
      }
    } finally {
      this.revisando = false;
    }
  }
  sigueValido(c) {
    try { return c.valido ? c.valido(this.estado) : true; } catch { return false; }
  }

  // Cada regla devuelve un consejo o null. Orden = prioridad: evitar errores > ayudar > vender.
  reglas() {
    const e = this.estado;
    const cfg = e.config;
    const archivos = e.archivos || [];
    const mayor = archivos.reduce((m, a) => (!m || a.hojas > m.hojas ? a : m), null);
    const total = e.precio?.total;
    const an = (a) => this.analisis.get(a.id);
    const enCarrito = e.pagina === "carrito";
    return [
      // Lowcost + recogida (en el carrito): su web lo bloquea; Irisinho explica la salida.
      async () => {
        if (!enCarrito || !e.carrito.lowcost || e.carrito.entrega !== "recogida") return null;
        return {
          clave: "lowcost-recogida", tipo: "error", ancla: "entrega", pose: "senala",
          texto: "El <b>color lowcost</b> es una tarifa para envíos: no se puede recoger en tienda. Con envío a casa mantienes ese precio" + (e.carrito.total >= 39 ? " y el envío te sale gratis." : "."),
          acciones: [{ etiqueta: "Enviar a casa (48 h)", principal: true, accion: { tipo: "entrega", valor: "envio" } }, { etiqueta: "Vale", cerrar: true }],
          valido: (s) => s.pagina === "carrito" && s.carrito.lowcost && s.carrito.entrega === "recogida",
        };
      },
      // Envío gratis desde 39 € (dato de su FAQ): solo si está cerca.
      async () => {
        if (!enCarrito || e.carrito.entrega === "recogida") return null;
        const t = e.carrito.total;
        if (!(t >= 29 && t < 39)) return null;
        return {
          clave: "envio-gratis", tipo: "venta", ancla: "entrega", pose: "senala",
          texto: `Te faltan <b>${euros(39 - t)}</b> para que el envío a Península te salga <b>gratis</b> (desde 39 €).`,
          acciones: [{ etiqueta: "Seguir comprando", principal: true, accion: { tipo: "cerrarCarrito" } }, { etiqueta: "Así está bien", cerrar: true }],
          valido: (s) => s.pagina === "carrito" && s.carrito.total < 39,
        };
      },
      // Archivo repetido.
      async () => {
        const vistos = new Map();
        for (const a of archivos) {
          if (vistos.has(a.huella)) {
            return {
              clave: "repetido:" + a.id, tipo: "error", ancla: "archivos", pose: "senala",
              texto: `Has subido <b>${esc(a.nombre)}</b> dos veces, así que se imprimiría dos veces. ¿Quito el repetido?`,
              acciones: [{ etiqueta: "Quitar el repetido", principal: true, accion: { tipo: "quitarArchivo", id: a.id } }, { etiqueta: "Lo quiero doble", cerrar: true }],
              valido: (s) => s.archivos.some((x) => x.id === a.id),
            };
          }
          vistos.set(a.huella, a);
        }
        return null;
      },
      // Grapado de más de 50 folios (su web lo avisa en la «i», pero deja pedirlo).
      async () => {
        if (cfg.finishType !== "grapado" || !mayor || mayor.hojas <= 50) return null;
        const h2 = hojas(mayor.paginas, { ...cfg, printForm: "doble-cara" });
        const enc = await this.precioCon({ finishType: "encuadernado" });
        if (cfg.printForm === "una-cara" && h2 <= 50) {
          const doble = await this.precioCon({ printForm: "doble-cara" });
          return {
            clave: "grapa:" + mayor.id + ":" + mayor.hojas, tipo: "error", ancla: "finishType", pose: "senala",
            texto: `La grapadora llega a <b>50 folios</b> y tu documento sale en <b>${mayor.hojas}</b>. A doble cara son ${h2} folios y sí se grapa.`,
            acciones: [
              doble && { etiqueta: `Doble cara (${euros(doble.precio)})`, principal: true, accion: { tipo: "cambiar", campo: "printForm", valor: "doble-cara" } },
              enc && { etiqueta: `Encuadernar (${euros(enc.precio)})`, accion: { tipo: "cambiar", campo: "finishType", valor: "encuadernado" } },
            ].filter(Boolean),
            valido: (s) => s.config.finishType === "grapado",
          };
        }
        return {
          clave: "grapa:" + mayor.id + ":" + mayor.hojas, tipo: "error", ancla: "finishType", pose: "senala",
          texto: `La grapadora llega a <b>50 folios</b> y tu documento sale en <b>${mayor.hojas}</b>: no se puede grapar. Encuadernado en espiral sí${enc ? `, por <b>${euros(enc.precio)}</b>` : ""}.`,
          acciones: [
            { etiqueta: "Encuadernar en espiral", principal: true, accion: { tipo: "cambiar", campo: "finishType", valor: "encuadernado" } },
            { etiqueta: "Elijo otro acabado", cerrar: true },
          ],
          valido: (s) => s.config.finishType === "grapado",
        };
      },
      // Más de 350 hojas por encuadernación: su web lo parte y obliga a escribir por dónde.
      async () => {
        if (cfg.finishType !== "encuadernado" || !(e.precio?.tomos > 1) || total == null) return null;
        const tomos = e.precio.tomos;
        const pags = mayor?.paginas || 0;
        const cortes = Array.from({ length: tomos - 1 }, (_, i) => Math.round(((i + 1) * pags) / tomos));
        const textoCorte = cortes.length === 1 ? `Dividir el documento por la página ${cortes[0]}.` : `Dividir el documento por las páginas ${cortes.join(" y ")}.`;
        const base = {
          clave: "tomos:" + tomos + ":" + cfg.printForm, tipo: "error", ancla: "finishType", pose: "senala",
          valido: (s) => s.config.finishType === "encuadernado" && s.precio?.tomos > 1,
        };
        if (cfg.printForm === "una-cara") {
          const doble = await this.precioCon({ printForm: "doble-cara" });
          if (doble && doble.tomos === 1) {
            return {
              ...base,
              ancla: "printForm",
              texto: `Tu documento no cabe en una sola espiral (máx. 350 hojas) e iría en <b>${tomos} tomos</b>. A doble cara cabe en <b>uno</b> y te sale por <b>${euros(doble.precio)}</b> (${this.diferencia(doble.precio, total)}).`,
              acciones: [
                { etiqueta: "Pasar a doble cara", principal: true, accion: { tipo: "cambiar", campo: "printForm", valor: "doble-cara" } },
                { etiqueta: `Prefiero ${tomos} tomos`, accion: { tipo: "comentario", texto: textoCorte } },
              ],
            };
          }
        }
        return {
          ...base,
          texto: `Tu documento va en <b>${tomos} tomos</b> (máx. 350 hojas por espiral) y la tienda necesita saber por dónde partirlo. ¿Lo dejo escrito?`,
          acciones: [
            { etiqueta: cortes.length === 1 ? `Por la mitad (pág. ${cortes[0]})` : "En partes iguales", principal: true, accion: { tipo: "comentario", texto: textoCorte } },
            { etiqueta: "Lo escribo yo", accion: { tipo: "enfocar", campo: "comentario" } },
          ],
        };
      },
      // Hoja que no encaja con el PDF (con 1 página por cara; con 2 o 4 lo explica la nota de orientación).
      async () => {
        if (!cfg.pagesPerSide.startsWith("1_")) return null;
        const hoja = cfg.orientation.startsWith("horizontal") ? "horizontal" : "vertical";
        for (const a of archivos) {
          const r = an(a);
          if (!r) continue;
          const apaisado = r.fraccionApaisadas >= 0.6;
          const vertical = r.fraccionApaisadas <= 0.1;
          if (apaisado && hoja === "vertical") {
            return {
              clave: "apaisado:" + a.id, tipo: "error", ancla: "orientation", pose: "senala",
              texto: `<b>${esc(a.nombre)}</b> es apaisado: sus páginas son horizontales. En hoja vertical saldría girado y más pequeño. ¿Te pongo la hoja horizontal?`,
              acciones: [{ etiqueta: "Hoja horizontal", principal: true, accion: { tipo: "cambiar", campo: "orientation", valor: "horizontal-abajo-arriba" } }, { etiqueta: "Lo dejo así", cerrar: true }],
              valido: (s) => !s.config.orientation.startsWith("horizontal") && s.config.pagesPerSide.startsWith("1_") && s.archivos.some((x) => x.id === a.id),
            };
          }
          if (vertical && hoja === "horizontal") {
            return {
              clave: "apaisado:" + a.id, tipo: "error", ancla: "orientation", pose: "senala",
              texto: `<b>${esc(a.nombre)}</b> es vertical. En hoja horizontal saldría girado y más pequeño. ¿Te pongo la hoja vertical?`,
              acciones: [{ etiqueta: "Hoja vertical", principal: true, accion: { tipo: "cambiar", campo: "orientation", valor: "vertical-derecha-izquierda" } }, { etiqueta: "Lo dejo así", cerrar: true }],
              valido: (s) => s.config.orientation.startsWith("horizontal") && s.config.pagesPerSide.startsWith("1_") && s.archivos.some((x) => x.id === a.id),
            };
          }
        }
        return null;
      },
      // Letra demasiado pequeña con 2 o 4 páginas por cara.
      async () => {
        const n = parseInt(cfg.pagesPerSide, 10);
        if (!(n > 1)) return null;
        for (const a of archivos) {
          const r = an(a);
          if (!r?.letra) continue;
          const escala = Math.min(1, escalaPagina(cfg.pagesPerSide, cfg.paperSize, r.anchoPt, r.altoPt) ?? (n === 4 ? 0.5 : 0.707));
          const pt = r.letra * escala;
          if (pt >= 6.5) continue;
          const alt = n === 4 ? "2_horizontal" : cfg.orientation.startsWith("horizontal") ? "1_horizontal" : "1_vertical";
          const ptAlt = r.letra * Math.min(1, escalaPagina(alt, cfg.paperSize, r.anchoPt, r.altoPt) ?? (n === 4 ? 0.707 : 1));
          return {
            clave: "letra:" + a.id + ":" + n, tipo: "error", ancla: "pagesPerSide", pose: "lupa",
            texto: `Con ${n} páginas por cara, la letra de <b>${esc(a.nombre)}</b> quedaría a unos <b>${pt.toFixed(1).replace(".", ",")} pt</b>: cuesta leerla. Con ${n === 4 ? 2 : 1} por cara, unos ${ptAlt.toFixed(1).replace(".", ",")} pt.`,
            acciones: [{ etiqueta: `${n === 4 ? 2 : 1} página${n === 4 ? "s" : ""} por cara`, principal: true, accion: { tipo: "cambiar", campo: "pagesPerSide", valor: alt } }, { etiqueta: "Me vale así", cerrar: true }],
            valido: (s) => parseInt(s.config.pagesPerSide, 10) === n,
          };
        }
        return null;
      },
      // B/N con un PDF lleno de fotos a color.
      async () => {
        if (cfg.printType !== "blanco-negro" || total == null) return null;
        for (const a of archivos) {
          const r = an(a);
          if (!r || r.paginasFoto == null || r.escaneado || r.paginasFoto < Math.max(3, r.paginas * 0.15)) continue;
          const cmyk = await this.precioCon({ printType: "color" });
          if (!cmyk) return null;
          return {
            clave: "bn-fotos:" + a.id, tipo: "venta", ancla: "printType", pose: "lupa",
            texto: `${cuantasPaginas(r)} de <b>${esc(a.nombre)}</b> tienen fotos o fondos de color. En blanco y negro saldrían en grises; <b>a color</b> lucen como en tu pantalla.`,
            acciones: [
              { etiqueta: `Imprimir a color (${this.diferencia(cmyk.precio, total)})`, principal: true, accion: { tipo: "cambiar", campo: "printType", valor: "color" } },
              { etiqueta: "Lo quiero en B/N", cerrar: true },
            ],
            valido: (s) => s.config.printType === "blanco-negro" && s.archivos.some((x) => x.id === a.id),
          };
        }
        return null;
      },
      // Escaneado: ofrecer la revisión de archivos (1,90 €, servicio que ya tienen).
      async () => {
        if (e.carrito?.revision) return null;
        for (const a of archivos) {
          const r = an(a);
          if (!r?.escaneado) continue;
          return {
            clave: "escaneado:" + a.id, tipo: "venta", ancla: "archivos", pose: "lupa",
            texto: `<b>${esc(a.nombre)}</b> parece un escaneo (imágenes, sin texto). Por <b>1,90 €</b> una persona revisa que todo se lea bien antes de imprimir. Se añade al pagar.`,
            acciones: [{ etiqueta: "Añadir revisión (1,90 €)", principal: true, accion: { tipo: "revision", valor: true } }, { etiqueta: "No, gracias", cerrar: true }],
            valido: (s) => !s.carrito.revision && s.archivos.some((x) => x.id === a.id),
          };
        }
        return null;
      },
      // TFG / TFM: la revisión de archivos tiene todo el sentido.
      async () => {
        if (e.carrito?.revision) return null;
        const a = archivos.find((x) => /\b(tfg|tfm|tesis|trabajo[ _-]?fin)/i.test(x.nombre.replace(/_/g, " ")));
        if (!a || !an(a)) return null;
        return {
          clave: "tfg:" + a.id, tipo: "venta", ancla: "archivos", pose: "saluda",
          texto: `Es tu <b>TFG</b>: por <b>1,90 €</b> una persona revisa márgenes, imágenes y que todo se vea bien antes de imprimir. Se añade al pagar.`,
          acciones: [{ etiqueta: "Añadir revisión (1,90 €)", principal: true, accion: { tipo: "revision", valor: true } }, { etiqueta: "No, gracias", cerrar: true }],
          valido: (s) => !s.carrito.revision && s.archivos.some((x) => x.id === a.id),
        };
      },
      // Muchos folios sueltos: encuadernar.
      async () => {
        if (cfg.finishType !== "sin-acabado" || !mayor || mayor.hojas < 40 || total == null) return null;
        const enc = await this.precioCon({ finishType: "encuadernado" });
        if (!enc) return null;
        return {
          clave: "sueltas:" + mayor.id, tipo: "venta", ancla: "finishType", pose: "senala",
          texto: `Son <b>${mayor.hojas} folios sueltos</b>. Encuadernado en espiral queda en <b>${euros(enc.precio)}</b> (${this.diferencia(enc.precio, total)}) y no se te desordenan.`,
          acciones: [{ etiqueta: "Encuadernar", principal: true, accion: { tipo: "cambiar", campo: "finishType", valor: "encuadernado" } }, { etiqueta: "Sueltos, gracias", cerrar: true }],
          valido: (s) => s.config.finishType === "sin-acabado",
        };
      },
    ];
  }

  consejoPagoRechazado() {
    const total = this.estado?.carrito?.total || 0;
    const acciones = [{ etiqueta: "Reintentar el pago", principal: true, accion: { tipo: "reintentarPago" } }];
    if (this.estado?.carrito?.pago !== "bizum" && total >= 6) acciones.push({ etiqueta: "Pagar con Bizum", accion: { tipo: "pago", valor: "bizum" } });
    this.mostrar({
      clave: "pago-rechazado:" + Date.now(), tipo: "error", ancla: "pago", pose: "saluda",
      texto: "Tranquilo: <b>no se ha cobrado nada</b> y tu pedido sigue guardado. Suele ser la verificación de tu banco; puedes reintentarlo ahora" + (acciones.length > 1 ? " o pagar con Bizum." : "."),
      acciones,
    }, true);
  }
  consejoPendiente({ total, nombres }) {
    this.mostrar({
      clave: "pendiente", tipo: "ayuda", ancla: null, pose: "saluda",
      texto: `¡Hola de nuevo! Tienes un pedido a medias${total ? ` de <b>${euros(total)}</b>` : ""}${nombres?.length ? ` (${nombres.map(esc).join(", ")})` : ""}. ¿Seguimos donde lo dejaste?`,
      acciones: [{ etiqueta: "Seguir con mi pedido", principal: true, accion: { tipo: "restaurar" } }, { etiqueta: "Empezar de cero", accion: { tipo: "descartar" } }],
    }, true);
  }

  // ------------------------------------------------------------------ enseñar un consejo
  mostrar(c, forzar = false) {
    if (this.actual && !forzar) return;
    if (this.actual) this.cerrarConsejo(false);
    if (this.silenciado && !forzar) {
      // En silencio no hay bocadillo: solo un «1» en la mascota por si quiere verlo.
      this.pendiente = c;
      this.mascota.classList.add("con-insignia");
      this.capa.classList.add("con-insignia");
      return;
    }
    this.pendiente = null;
    this.capa.classList.remove("con-insignia");
    this.vistos.add(c.clave);
    if (c.tipo !== "error") this.suaves++;
    this.actual = c;
    this.pintarEtiqueta();
    this.primerConsejo = this.primerConsejo === undefined;
    if ((c.pose || "senala") === "senala") { c.pose = "reposo"; c.senalar = true; }
    const html = this.htmlConsejo(c);
    const caja = ponerTarjeta(c.ancla || "subida", html);
    if (caja) {
      ponerEscenario(c.ancla || "subida", Math.round(this.t * 0.9));
      this.enlazarConsejo(caja, c, false);
      this.pintarEtiqueta();
    } else if (esMovil()) {
      this.hoja.innerHTML = html;
      this.hoja.hidden = false;
      this.hoja.style.setProperty("--abajo", (this.carritoAbierto() ? 0 : this.barra()) + "px");
      requestAnimationFrame(() => this.hoja.classList.add("visible"));
      this.mascota.classList.add("oculto");
      this.enlazarConsejo(this.hoja, c);
    } else {
      this.bocadillo.innerHTML = html;
      this.bocadillo.hidden = false;
      this.enlazarConsejo(this.bocadillo, c);
    }
    this.anclado = caja ? null : c.ancla;
    this.pose(c.pose || "senala");
    this.hablar();
    if (c.senalar) setTimeout(() => { if (this.actual === c) this.senalar(true); }, 700);
    this.colocar(true);
    if (!caja && !esMovil()) requestAnimationFrame(() => { this.colocarBocadillo(); this.bocadillo.classList.add("visible"); });
    this.vivo.textContent = "Irisinho: " + c.texto.replace(/<[^>]+>/g, "");
  }
  verNotaFuera() {
    this.notaFuera = false;
    this.pintarEtiqueta();
    const t = tarjetaPuesta();
    if (t) verTarjeta(this.actual?.ancla || "subida", { abajo: this.carritoAbierto() ? 0 : this.barra() });
  }
  htmlConsejo(c) {
    const ancla = !esMovil() && c.ancla && this.ancla(c.ancla) && !this.visible(this.ancla(c.ancla));
    const botones = c.acciones.map((a, i) => `<button type="button" class="btn${a.principal ? " principal" : ""}" data-i="${i}">${esc(a.etiqueta)}</button>`).join("");
    return `
      <div class="cab">
        <span class="nombre">Irisinho</span><span class="ia" title="Asistente con inteligencia artificial">IA</span>
        ${this.primerConsejo && !esMovil() ? `<span class="quien">asistente de Iris Copy</span>` : ""}
        <button type="button" class="cerrar" aria-label="Cerrar">×</button>
      </div>
      <div class="texto">${c.texto}</div>
      <div class="acciones">${botones}${ancla ? `<button type="button" class="btn" data-ensenar="1">Enséñamelo</button>` : ""}</div>
      <div class="pie"><button type="button" class="enlace" data-silenciar="1">Silenciar consejos</button></div>`;
  }
  enlazarConsejo(caja, c, enfocar = true) {
    caja.querySelector(".cerrar").addEventListener("click", () => this.cerrarConsejo(true));
    caja.querySelector("[data-silenciar]").addEventListener("click", () => { this.silenciar(true); this.cerrarConsejo(true); });
    caja.querySelector("[data-ensenar]")?.addEventListener("click", (ev) => {
      ev.currentTarget.remove();
      document.querySelector(`[data-iris-ancla="${c.ancla}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => this.colocar(true), 650);
    });
    for (const b of caja.querySelectorAll("[data-i]")) {
      b.addEventListener("click", () => {
        const a = c.acciones[Number(b.dataset.i)];
        if (a.accion) this.ejecutar(a.accion);
        const celebra = a.principal && a.accion;
        this.cerrarConsejo(true);
        if (celebra) this.celebrar();
      });
    }
    if (enfocar) setTimeout(() => caja.querySelector(".btn.principal")?.focus({ preventScroll: true }), 60);
  }
  ejecutar(accion) {
    if (accion.tipo === "cerrarCarrito") {
      document.querySelector("#cerrarCarrito")?.click();
      return;
    }
    document.dispatchEvent(new CustomEvent("iris:accion", { detail: accion }));
  }
  cerrarConsejo(porCliente) {
    if (!this.actual) return;
    if (this.actual.guia) { this.guia.ocultar(); return; }
    this.actual = null;
    this.pintarEtiqueta();
    this.ultimoCierre = porCliente ? Date.now() : 0;
    this.bocadillo.classList.remove("visible");
    this.hoja.classList.remove("visible");
    quitarTarjeta();
    quitarEscenario();
    if (this.notaFuera) { this.notaFuera = false; this.pintarEtiqueta(); }
    if (!this.chat.abierto) this.mascota.classList.remove("oculto");
    setTimeout(() => { if (!this.actual) { this.bocadillo.hidden = true; this.hoja.hidden = true; } }, 320);
    this.pose("reposo");
    this.colocarEnCasa(true);
    this.programarRevision(porCliente ? 3600 : 500);
    if (this.guia.activa && !this.guia.pausada) setTimeout(() => { if (!this.actual) this.guia.pintar({ desplazar: false }); }, 450);
  }
  silenciar(si) {
    this.silenciado = si;
    try { localStorage.setItem("irisinho_silencio", si ? "1" : "0"); } catch { /* nada */ }
    const b = this.shadowRoot.querySelector(".chat [data-accion='silencio']");
    if (b) { b.innerHTML = si ? ICONOS.campanaNo : ICONOS.campana; b.setAttribute("aria-pressed", si ? "true" : "false"); }
  }
  pintarResalte() {
    const r = null;
    if (!r || !this.visible(r)) { this.resalte.classList.remove("visible"); return; }
    Object.assign(this.resalte.style, { left: r.left - 6 + "px", top: r.top - 6 + "px", width: r.width + 12 + "px", height: r.height + 12 + "px" });
    this.resalte.classList.add("visible");
  }
  colocarBocadillo() {
    if (esMovil() || this.bocadillo.hidden) return;
    const b = this.bocadillo;
    const w = b.offsetWidth || 330;
    const h = b.offsetHeight || 150;
    const { x, y } = this.pos;
    const t = this.t;
    let left, top;
    const derecha = x + t + 8 + w <= window.innerWidth - 10;
    if (this.anclado && derecha) {
      left = x + t + 6;
      top = Math.max(44, Math.min(y + t * 0.05, window.innerHeight - h - 12));
      b.style.setProperty("--cola-x", "-9px");
      b.style.setProperty("--cola-y", Math.max(14, Math.min(h - 28, y + t * 0.42 - top)) + "px");
      b.style.setProperty("--cola-r", "45deg");
      b.style.setProperty("--origen", "0 50%");
    } else {
      left = Math.max(10, Math.min(x + t - w + 10, window.innerWidth - w - 10));
      top = Math.max(8, y - h - 14);   // antes de tapar la cabeza del robot, sube sobre la cinta de arriba
      b.style.setProperty("--cola-x", Math.max(16, Math.min(w - 30, x + t * 0.5 - left)) + "px");
      b.style.setProperty("--cola-y", h - 7 + "px");
      b.style.setProperty("--cola-r", "-45deg");
      b.style.setProperty("--origen", "100% 100%");
    }
    b.style.left = left + "px";
    b.style.top = top + "px";
  }

  // ------------------------------------------------------------------ chat
  alternarChat() {
    if (this.chat.abierto) this.cerrarChat();
    else this.abrirChat();
  }
  abrirChat() {
    // La tarjeta de la guía se queda donde está (quitarla y ponerla movía la página); el chat va encima o al lado.
    if (this.actual && !this.actual.guia) this.cerrarConsejo(false);
    this.chat.abierto = true;
    this.pintarEtiqueta();
    this.anclado = null;
    this.pintarChat();
    this.panel.hidden = false;
    this.colocar(true);
    requestAnimationFrame(() => this.panel.classList.add("visible"));
    this.mascota.classList.toggle("oculto", esMovil());
    this.pose("saluda", 1600);
  }
  cerrarChat() {
    this.chat.abierto = false;
    this.pintarEtiqueta();
    this.panel.classList.remove("visible");
    setTimeout(() => { if (!this.chat.abierto) this.panel.hidden = true; }, 220);
    this.mascota.classList.remove("oculto");
    this.colocar(true);
    this.mascota.focus({ preventScroll: true });
    this.programarRevision(2500);
    if (this.guia.activa && !this.guia.pausada) setTimeout(() => this.guia.pintar({ desplazar: false }), 260);
  }
  colocarChat() {
    if (this.panel.hidden) return;
    const p = this.panel.style;
    if (esMovil()) {
      Object.assign(p, { left: "0px", right: "0px", width: "auto", top: "7vh", bottom: "0px", height: "auto", borderRadius: "18px 18px 0 0" });
      return;
    }
    const casa = this.casa();
    const abajo = window.innerHeight - casa.y + 10;
    const alto = Math.min(580, window.innerHeight - abajo - 50);
    Object.assign(p, { left: "auto", right: "24px", width: "380px", top: "auto", bottom: abajo + "px", height: alto + "px", borderRadius: "14px" });
  }
  pintarChat() {
    const verificado = !!this.chat.alta?.verificado;
    this.panel.innerHTML = `
      <div class="chat__cab">
        <img class="avatar" src="${BASE}poses/saluda.webp" alt="">
        <div class="chat__titulo">
          <div class="fila"><span class="nombre" style="font-size:15px">Irisinho</span><span class="ia">IA</span></div>
          <span class="quien">Asistente con IA de Iris Copy</span>
        </div>
        <button type="button" class="icono" data-accion="quieto" aria-label="Pausar la animación" aria-pressed="${this.quieto}">${this.quieto ? ICONOS.play : ICONOS.pausa}</button>
        <button type="button" class="icono" data-accion="silencio" aria-label="Silenciar consejos" aria-pressed="${this.silenciado}">${this.silenciado ? ICONOS.campanaNo : ICONOS.campana}</button>
        <button type="button" class="icono" data-accion="cerrar" aria-label="Cerrar el chat">${ICONOS.cerrar}</button>
      </div>
      <div class="chat__msgs"></div>
      ${verificado ? `<form class="chat__pie"><input type="text" maxlength="400" placeholder="Escribe tu pregunta…" aria-label="Tu pregunta"><button class="enviar" type="submit" aria-label="Enviar">${ICONOS.enviar}</button></form>` : ""}`;
    this.panel.querySelector("[data-accion='cerrar']").addEventListener("click", () => this.cerrarChat());
    this.panel.querySelector("[data-accion='quieto']").addEventListener("click", () => this.alternarQuieto());
    this.panel.querySelector("[data-accion='silencio']").addEventListener("click", () => this.silenciar(!this.silenciado));
    const caja = this.panel.querySelector(".chat__msgs");
    if (!verificado) {
      caja.append(this.formularioAlta());
      return;
    }
    if (!this.chat.mensajes.length) {
      this.chat.mensajes.push({ rol: "irisinho", texto: this.saludoChat() });
    }
    for (const m of this.chat.mensajes) caja.append(this.burbuja(m));
    if (this.chat.mensajes.length <= 1) caja.append(this.sugerencias());
    const form = this.panel.querySelector("form");
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const inp = form.querySelector("input");
      const t = inp.value.trim();
      if (t) { inp.value = ""; this.preguntar(t); }
    });
    setTimeout(() => form.querySelector("input").focus({ preventScroll: true }), 80);
    caja.scrollTop = caja.scrollHeight;
  }
  saludoChat() {
    const a = this.estado?.archivos?.[0];
    return a
      ? `¡Hola! Soy Irisinho, el asistente con IA de Iris Copy. Veo que estás con «${a.nombre}». ¿En qué te ayudo?`
      : "¡Hola! Soy Irisinho, el asistente con IA de Iris Copy. Pregúntame lo que quieras sobre tu impresión, envíos o pagos.";
  }
  sugerencias() {
    const d = document.createElement("div");
    d.className = "chips";
    for (const t of ["¿Cuándo me llega si pido hoy?", "¿Qué me recomiendas para un TFG?", "¿Puedo poner la portada en cartulina?"]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = t;
      b.addEventListener("click", () => { d.remove(); this.preguntar(t); });
      d.append(b);
    }
    return d;
  }
  formularioAlta() {
    const d = document.createElement("div");
    d.className = "alta";
    const paso2 = !!this.chat.alta?.correo && !this.chat.alta?.verificado;
    d.innerHTML = paso2
      ? `<h3>Mira tu correo</h3>
         <p>Te hemos mandado un código de 6 cifras a <b></b>.</p>
         <input inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="Código" aria-label="Código de 6 cifras">
         <span class="error" hidden>El código no es correcto.</span>
         <button type="button" class="btn principal" data-ok>Entrar al chat</button>
         <button type="button" class="enlace" data-otro>Usar otro correo</button>`
      : `<h3>Habla con Irisinho</h3>
         <p>Para chatear conmigo déjame tu correo: te mando un código y listo. Los consejos mientras configuras siguen funcionando sin registrarte.</p>
         <input type="email" autocomplete="email" placeholder="tu@correo.com" aria-label="Tu correo">
         <label><input type="checkbox"> Quiero recibir ofertas de Iris Copy (opcional)</label>
         <span class="error" hidden>Revisa el correo.</span>
         <button type="button" class="btn principal" data-ok>Enviarme el código</button>
         <small>Irisinho es un asistente con IA: puede equivocarse, y lo importante te lo confirma la tienda. Tu correo lo trata Iris Copy según su política de privacidad.</small>`;
    if (paso2) d.querySelector("b").textContent = this.chat.alta.correo;
    const inp = d.querySelector("input");
    const err = d.querySelector(".error");
    d.querySelector("[data-ok]").addEventListener("click", () => {
      if (!paso2) {
        const correo = inp.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) { err.hidden = false; return; }
        this.chat.codigo = String(Math.floor(100000 + Math.random() * 900000));
        this.chat.alta = { correo, ofertas: d.querySelector("input[type=checkbox]").checked, verificado: false };
        this.pintarChat();
        // En la demo no se manda correo: el código se enseña aquí.
        const aviso = this.burbuja({ rol: "aviso", texto: `Demo: en la web real el código llega por correo. Aquí es ${this.chat.codigo}.` });
        this.panel.querySelector(".chat__msgs").prepend(aviso);
      } else {
        if (inp.value.trim() !== this.chat.codigo) { err.hidden = false; return; }
        this.chat.alta.verificado = true;
        try { localStorage.setItem("irisinho_alta", JSON.stringify(this.chat.alta)); } catch { /* nada */ }
        this.pose("celebra", 1500);
        this.saltito();
        this.pintarChat();
      }
    });
    d.querySelector("[data-otro]")?.addEventListener("click", () => { this.chat.alta = null; this.pintarChat(); });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") d.querySelector("[data-ok]").click(); });
    setTimeout(() => inp.focus({ preventScroll: true }), 80);
    return d;
  }
  burbuja(m) {
    const d = document.createElement("div");
    d.className = "msg " + (m.rol === "cliente" ? "yo" : m.rol === "aviso" ? "aviso" : "bot");
    d.textContent = m.texto;
    if (m.acciones?.length) {
      const ac = document.createElement("div");
      ac.className = "acciones";
      for (const a of m.acciones) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn principal";
        b.textContent = a.etiqueta;
        b.addEventListener("click", () => {
          this.ejecutar(a.accion);
          b.disabled = true;
          b.textContent = "Hecho ✓";
          this.pose("celebra", 1200);
        });
        ac.append(b);
      }
      d.append(ac);
    }
    return d;
  }
  resumenParaChat() {
    const e = this.estado;
    if (!e) return null;
    return {
      pagina: e.pagina,
      config: e.config,
      archivos: (e.archivos || []).map((a) => {
        const r = this.analisis.get(a.id);
        return {
          nombre: a.nombre, paginas: a.paginas, hojas: a.hojas,
          analisis: r ? { paginasFoto: r.paginasFoto, paginasColor: r.paginasColor, estimado: !!r.estimado, apaisadas: Math.round((r.fraccionApaisadas || 0) * r.paginas), rangosApaisadas: r.exactoApaisadas ? rangos(r.apaisadas).slice(0, 80) : "", escaneado: r.escaneado, letraPt: r.letra } : null,
        };
      }),
      precio: { total: e.precio?.total ?? null, tomos: e.precio?.tomos ?? 0, notas: (e.precio?.notas || []).map((n) => n.texto.replace(/<[^>]+>/g, "")) },
      carrito: e.carrito,
    };
  }
  async preguntar(texto) {
    if (this.chat.enviando) return;
    const caja = this.panel.querySelector(".chat__msgs");
    caja.querySelector(".chips")?.remove();
    const yo = { rol: "cliente", texto };
    this.chat.mensajes.push(yo);
    caja.append(this.burbuja(yo));
    const puntos = document.createElement("div");
    puntos.className = "escribiendo";
    puntos.setAttribute("aria-label", "Irisinho está escribiendo");
    puntos.innerHTML = "<i></i><i></i><i></i>";
    caja.append(puntos);
    caja.scrollTop = caja.scrollHeight;
    this.chat.enviando = true;
    this.panel.querySelector(".enviar").disabled = true;
    this.pose("lupa");
    let resp;
    try {
      // En la copia de GitHub Pages no hay servidor: dice lo mismo que la API cuando el chat está apagado.
      if (sinServidor()) throw new ChatApagado();
      const r = await fetch(`${this.api}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: this.chat.mensajes.filter((m) => m.rol !== "aviso").slice(-12).map((m) => ({ rol: m.rol, texto: m.texto })), estado: this.resumenParaChat() }),
      });
      resp = await r.json();
    } catch (e) {
      resp = e instanceof ChatApagado ? { texto: CHAT_APAGADO, acciones: [] } : null;
    }
    puntos.remove();
    const m = resp?.texto
      ? { rol: "irisinho", texto: resp.texto, acciones: (resp.acciones || []).filter((a) => a?.accion) }
      : { rol: "irisinho", texto: `Ahora mismo no puedo responder. Si es urgente, escribe a ${TIENDA}.` };
    this.chat.mensajes.push(m);
    caja.append(this.burbuja(m));
    caja.scrollTop = caja.scrollHeight;
    this.chat.enviando = false;
    const env = this.panel.querySelector(".enviar");
    if (env) env.disabled = false;
    this.pose("reposo");
    this.vivo.textContent = "Irisinho: " + m.texto;
  }
}

// Si solo se ha mirado una muestra, se dice en palabras (no se inventa un número exacto).
function cuantasPaginas(r) {
  if (!r.estimado) return `<b>${r.paginasFoto} de las ${r.paginas} páginas</b>`;
  const f = r.fraccionFoto ?? r.paginasFoto / r.paginas;
  if ((r.muestra || 0) < 10) return f >= 0.4 ? "<b>Muchas páginas</b>" : "<b>Algunas páginas</b>";
  if (f >= 0.85) return "<b>Casi todas las páginas</b>";
  if (f >= 0.5) return "<b>La mayoría de las páginas</b>";
  if (f >= 0.25) return "<b>Muchas páginas</b>";
  return "<b>Varias páginas</b>";
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Tamaño del PDF por su primera página (en puntos): A4, A3 u otro.
function tamanoDe(w, h) {
  const [a, b] = [Math.min(w, h), Math.max(w, h)];
  const cerca = (x, y) => Math.abs(x - y) / y < 0.03;
  if (cerca(a, 595) && cerca(b, 842)) return "A4";
  if (cerca(a, 842) && cerca(b, 1191)) return "A3";
  return "otro";
}

// Nota de Irisinho bajo una opción. Es su propio elemento con Shadow DOM: no hereda ni toca los estilos de la web.
const CSS_NOTA = `
:host { display: block; overflow: hidden; grid-column: 1 / -1; }
.nota { position: relative; padding-right: 26px !important; margin-top: 8px; display: grid; grid-template-columns: 28px 1fr; gap: 8px; align-items: start; background: #F7F7FF;
  border: 1.6px solid #000; border-radius: 8px; padding: 7px 10px 8px; font: 400 12.5px/1.45 Montserrat, Arial, sans-serif; color: #000;
  animation: entra .28s ease-out; }
.nota.mejor { background: #FFFDE3; }
img { width: 28px; height: 28px; object-fit: contain; }
.que b { font-weight: 800; }
.ver { margin-top: 2px; }
.marca { display: inline-grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: 1.4px solid #000;
  font: 900 10px/1 Montserrat, sans-serif; margin-right: 5px; vertical-align: -3px; background: #fff; }
.bien .marca { background: #CCCCFF; }
.mejor .marca { background: #FFFF33; }
button { margin: 3px 0 0 4px; display: inline-block; background: #FFFF33; border: 1.4px solid #000; border-radius: 5px;
  font: 700 12px Montserrat, sans-serif; padding: 3px 9px; cursor: pointer; color: #000; }
button:hover { filter: brightness(.95); }
button:focus-visible { outline: 3px solid #FF0099; outline-offset: 2px; }
button.b2 { background: #CCCCFF; }
button.x { position: absolute; top: 2px; right: 3px; margin: 0; border: 0; background: none; font: 400 17px/1 Montserrat, sans-serif; padding: 2px 5px; }
.tambien { margin-top: 3px; }
.tambien .marca { background: #FF0099; color: #fff; }
@keyframes entra { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .nota { animation: none; } }
`;
class IrisinhoNota extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  pintar(res, base, alPulsar) {
    const marca = { bien: "✓", mejor: "!", info: "i" }[res.tipo] || "i";
    this.shadowRoot.innerHTML = `<style>${CSS_NOTA}</style>
      <div class="nota ${res.tipo}" role="status">
        <button type="button" class="x" aria-label="Cerrar la nota">×</button>
        <img src="${base}poses/${res.tipo === "mejor" ? "senala" : "reposo"}.webp" alt="">
        <div><div class="que">${res.html}</div>
          <div class="ver"><span class="marca" aria-hidden="true">${marca}</span>${res.texto}${res.accion ? ` <button type="button" class="b1">${esc(res.accion.etiqueta)}</button>` : ""}</div>
          ${res.extra && !res.accion ? `<div class="tambien"><span class="marca" aria-hidden="true">+</span>${res.extra.texto}${res.extra.accion ? ` <button type="button" class="b2">${esc(res.extra.accion.etiqueta)}</button>` : ""}</div>` : ""}
        </div>
      </div>`;
    this.shadowRoot.querySelector(".x").addEventListener("click", () => this.cerrar());
    this.shadowRoot.querySelector(".b1")?.addEventListener("click", () => alPulsar(res.accion.accion));
    this.shadowRoot.querySelector(".b2")?.addEventListener("click", () => alPulsar(res.extra.accion.accion));
  }
  confirmar() {
    const ver = this.shadowRoot.querySelector(".ver");
    if (ver) ver.innerHTML = `<span class="marca" aria-hidden="true" style="background:#CCCCFF">✓</span>Hecho.`;
    setTimeout(() => this.cerrar(), 1800);
  }
  cerrar() {
    if (this.cerrando) return;
    this.cerrando = true;
    const h = this.offsetHeight;
    if (!h || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { this.remove(); return; }
    this.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 220, easing: "ease-in" })
      .finished.then(() => this.remove(), () => this.remove());
  }
}
customElements.define("irisinho-nota", IrisinhoNota);

customElements.define("irisinho-asistente", IrisinhoAsistente);
