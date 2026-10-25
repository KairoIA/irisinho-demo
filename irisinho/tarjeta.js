// Tarjeta de Irisinho DENTRO de la página, justo debajo del bloque del que habla (24-oct-2026, Javi: en el móvil la hoja
// que sube desde abajo «se pisa» con lo que hace el cliente y tapa media pantalla; quiere lo de antes, debajo de cada
// recuadro, para que no moleste). Desde el 25-oct se usa igual en el móvil y en el ordenador, para la guía y los consejos.
//
// Encima del bloque se abre un «escenario» (Javi, 25-oct: «el texto debajo de la sección, pero Irisinho arriba,
// explicando y señalando, para que se vea bien y se lea claro»): un hueco sobre el título donde Irisinho se coloca con su
// bocadillo. El escenario es un div de la página (solo ocupa sitio); a Irisinho lo coloca irisinho.js mirando dónde está.
//
// La tarjeta es su propio elemento con Shadow DOM: no hereda ni toca los estilos de la web. Al cambiar de bloque, la
// anterior se recoge y la nueva entra, sin tirones (Javi, 25-oct: «que todo sea fluido»; ver suave.js).

import { cambiarSinSalto, desplazarSuave } from "./suave.js";

const CSS = `
:host { display: block; grid-column: 1 / -1; width: 100%; }
* { box-sizing: border-box; }
.tarjeta { margin-top: 12px; background: #fff; border: 1.6px solid #000; border-radius: 12px; box-shadow: 3px 3px 0 #000;
  padding: 10px 13px 11px; font: 400 14px/1.45 Montserrat, Arial, sans-serif; color: #111; text-align: left; }
.entra { animation: entra .32s cubic-bezier(.2,.8,.2,1); }
@keyframes entra { from { opacity: 0; transform: translateY(-6px) scale(.985); } to { opacity: 1; transform: none; } }
button { font-family: inherit; cursor: pointer; }
b { font-weight: 800; }

/* Cabecera: quién habla, en qué paso va y cerrar */
.cab { display: flex; align-items: center; gap: 6px; }
.nombre { font-weight: 800; font-size: 12px; }
.ia { background: #FF0099; color: #fff; font-weight: 800; font-size: 9.5px; padding: 1px 5px; border-radius: 4px; letter-spacing: .3px; }
.paso-cuenta { font-size: 11.5px; font-weight: 700; color: #6a6a7a; }
.cerrar { margin-left: auto; border: 0; background: none; font-size: 22px; line-height: 1; padding: 0 2px; color: #000; }
.paso-barra { height: 4px; background: #ececf6; border-radius: 2px; margin: 6px 0 10px; overflow: hidden; }
.paso-barra i { display: block; height: 100%; background: #FF0099; border-radius: 2px; transition: width .45s cubic-bezier(.2,.8,.2,1); }
.paso-titulo { font-size: 18px; font-weight: 800; line-height: 1.25; margin: 2px 0 4px; }
.texto { font-size: 15px; line-height: 1.45; }

/* Lo que ha elegido: nombre grande y qué es, en una línea */
.op-nombre { font-size: 18px; font-weight: 800; line-height: 1.2; }
.op-que { font-size: 14px; color: #4a4a55; line-height: 1.4; margin-top: 2px; }

/* Lo que Irisinho opina */
.veredicto { display: flex; gap: 8px; align-items: flex-start; margin-top: 10px; font-size: 15.5px; font-weight: 600; line-height: 1.42; }
.marca { flex: none; display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #000;
  font: 900 11px/1 Montserrat, sans-serif; background: #fff; margin-top: 1px; }
.veredicto.bien .marca { background: #CCCCFF; }
.veredicto.info .marca { background: #fff; }

/* Cajas: «Mi consejo» (algo le irá mejor) y «Y si quieres…» (algo que suma) */
.consejo { margin-top: 10px; border: 1.5px solid #000; border-radius: 10px; padding: 9px 11px 10px; }
.consejo.mejor { background: #FFFBD6; }
.consejo.tambien { background: #F1EFFF; }
.consejo-etq { font-size: 10.5px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 3px; }
.consejo.mejor .consejo-etq { color: #7a5c00; }
.consejo.tambien .consejo-etq { color: #4b3fbf; }
.consejo-txt { font-size: 15px; line-height: 1.45; }
.consejo .btn { margin-top: 8px; }

/* Resumen final */
.chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0 4px; }
.chip { border: 1.3px solid #000; border-radius: 999px; padding: 3px 9px; font-size: 12.5px; font-weight: 700; background: #F7F7FF; }
.total { font-size: 15px; margin-top: 8px; }
.total b { font-size: 20px; }
.aviso { margin-top: 8px; font-size: 13.5px; color: #8a0050; font-weight: 600; }

/* Botones y pie */
.btn { border: 1.6px solid #000; border-radius: 8px; background: #fff; padding: 9px 13px; font-size: 14px; font-weight: 800; color: #000;
  transition: transform .12s ease, filter .12s ease; }
.btn:active { transform: scale(.97); }
.btn.principal { background: #FFFF33; }
.btn.tambien { background: #CCCCFF; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn.late { animation: late 1.6s ease-in-out 2; }
@keyframes late { 0%, 100% { transform: none; } 15% { transform: scale(1.06); } 30% { transform: none; } 45% { transform: scale(1.04); } 60% { transform: none; } }
.btn:focus-visible, .enlace:focus-visible, .cerrar:focus-visible { outline: 3px solid #FF0099; outline-offset: 2px; }
.acciones { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; justify-content: flex-end; }
.paso-nav, .pie { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px 16px; }
.enlace { border: 0; background: none; padding: 2px 0; font-size: 12px; color: #666; text-decoration: underline; text-underline-offset: 2px; }
@media (min-width: 992px) { .tarjeta { max-width: 640px; } }
@media (prefers-reduced-motion: reduce) { .entra, .btn.late { animation: none; } }
`;

class IrisinhoTarjeta extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="tarjeta" role="region" aria-label="Irisinho"></div>`;
    this.caja = this.shadowRoot.querySelector(".tarjeta");
  }
}
customElements.define("irisinho-tarjeta", IrisinhoTarjeta);

let tarjeta = null;
let escenario = null;
const reducir = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const bloque = (ancla) => {
  const el = document.querySelector(`[data-iris-ancla="${ancla}"]`);
  return el && (el.offsetWidth || el.offsetHeight) ? el : null;
};
// Lo que no debe moverse cuando cambia algo por encima: en un bloque del configurador, su fila de opciones (lo que ha
// tocado el cliente); si no, el propio elemento.
const quieto = (el) => (el.matches(".grupo") && el.querySelector(".selector")) || el;

// Recoge una tarjeta o un hueco hacia arriba (alto y opacidad a cero) y lo quita al acabar.
function recoger(el, ms = 320) {
  if (!el?.isConnected) return;
  const h = el.offsetHeight;
  if (!h || reducir()) { el.remove(); return; }
  el.style.overflow = "hidden";
  el.style.pointerEvents = "none";
  el.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: ms, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" })
    .finished.then(() => el.remove(), () => el.remove());
}

// Pone la tarjeta junto al bloque `ancla` con ese HTML y devuelve su caja (para enlazar los botones), o null si el
// bloque no está. Por defecto va debajo del bloque; con `antes`, encima (la bienvenida y la lectura del PDF, Javi 25-oct:
// «Irisinho con su bocadillo, debajo "hola, soy Irisinho", y luego subir documentos»). Al cambiar de sitio, la anterior se
// recoge y la nueva entra; con `fijar`, el bloque que toca el cliente no se mueve (si la guía va a desplazar la página
// hasta el paso nuevo, no hace falta: el viaje lo hace todo de una vez y sin saltos).
export function ponerTarjeta(ancla, html, { antes = false, fijar = true } = {}) {
  const el = bloque(ancla);
  if (!el) return null;
  const dentro = !antes && el.matches(".grupo");
  const sitioBien = tarjeta?.isConnected && !tarjeta.recogiendo
    && (antes ? tarjeta.nextElementSibling === el : dentro ? tarjeta.parentElement === el : tarjeta.previousElementSibling === el);
  if (!sitioBien) {
    const vieja = tarjeta;
    tarjeta = document.createElement("irisinho-tarjeta");
    tarjeta.style.maxWidth = dentro ? "" : getComputedStyle(el).maxWidth;
    const meter = () => {
      if (vieja) { vieja.recogiendo = true; recoger(vieja); }
      if (antes) el.before(tarjeta);
      else if (dentro) el.append(tarjeta);
      else el.after(tarjeta);
    };
    tarjeta.caja.innerHTML = html;
    if (fijar) cambiarSinSalto(quieto(el), meter);
    else meter();
    if (!reducir()) tarjeta.caja.classList.add("entra");
    return tarjeta.caja;
  }
  // Mismo sitio, contenido nuevo: si cambia de alto, crece o encoge suave (nada de saltos).
  const h0 = tarjeta.offsetHeight;
  tarjeta.caja.innerHTML = html;
  const h1 = tarjeta.offsetHeight;
  if (Math.abs(h1 - h0) > 2 && !reducir()) {
    tarjeta.animate([{ height: h0 + "px", overflow: "hidden" }, { height: h1 + "px", overflow: "hidden" }], { duration: 260, easing: "cubic-bezier(.4,0,.2,1)" });
  }
  return tarjeta.caja;
}

export function quitarTarjeta(animado = true) {
  const t = tarjeta;
  if (!t?.isConnected) return;
  tarjeta = null;
  if (!animado) { t.remove(); return; }
  t.recogiendo = true;
  recoger(t, 240);
}

// Ojo: se mide la tarjeta de dentro (caja), no el elemento: en una columna flex su margen no se junta con el de fuera.
export function tarjetaPuesta() {
  return tarjeta?.isConnected ? tarjeta : null;
}

// Escenario de Irisinho (alto en px): por defecto encima del bloque `ancla`; con `junto`, justo encima de la tarjeta
// (el resumen final: Irisinho baja al cuadro de «¡Todo listo!»). Al abrirse crece suave y el anterior se cierra suave.
// `inmediato`: ya abierto (al cargar la página, para que Irisinho aparezca directamente en su sitio).
export function ponerEscenario(ancla, alto, { junto = false, fijar = true, inmediato = false } = {}) {
  const el = bloque(ancla);
  const ref = junto ? tarjetaPuesta() : null;
  if (!el || (junto && !ref)) { quitarEscenario(); return null; }
  const dentro = !junto && el.matches(".grupo");
  const bienPuesto = escenario?.isConnected && (junto ? escenario.nextElementSibling === ref
    : dentro ? escenario.parentElement === el && el.firstElementChild === escenario : escenario.nextElementSibling === el);
  if (bienPuesto) {
    if (parseFloat(escenario.style.height) !== alto) {
      if (inmediato) escenario.style.transition = "none";
      escenario.style.height = alto + "px";
      if (inmediato) { void escenario.offsetHeight; escenario.style.transition = "height .42s cubic-bezier(.4,0,.2,1)"; }
    }
    return escenario;
  }
  const nuevo = document.createElement("div");
  nuevo.className = "irisinho-escenario";
  nuevo.setAttribute("aria-hidden", "true");
  const ya = inmediato || reducir();
  Object.assign(nuevo.style, { display: "block", gridColumn: "1 / -1", width: "100%", height: ya ? alto + "px" : "0px", transition: "height .42s cubic-bezier(.4,0,.2,1)" });
  // Fuera de un bloque del configurador (la subida, la lista de archivos), tan ancho como ese elemento.
  if (junto) nuevo.style.maxWidth = ref.style.maxWidth;
  else if (!dentro) nuevo.style.maxWidth = getComputedStyle(el).maxWidth;
  const viejo = escenario;
  const meter = () => {
    cerrarHueco(viejo);
    if (junto) ref.before(nuevo);
    else if (dentro) el.prepend(nuevo);
    else el.before(nuevo);
  };
  if (fijar) cambiarSinSalto(quieto(el), meter);
  else meter();
  escenario = nuevo;
  if (!ya) requestAnimationFrame(() => requestAnimationFrame(() => { nuevo.style.height = alto + "px"; }));
  return nuevo;
}

function cerrarHueco(e) {
  if (!e?.isConnected) return;
  if (reducir()) { e.remove(); return; }
  e.style.height = "0px";
  setTimeout(() => e.remove(), 440);
}

export function quitarEscenario() {
  const e = escenario;
  escenario = null;
  cerrarHueco(e);
}

export function escenarioPuesto() {
  return escenario?.isConnected ? escenario : null;
}

// Lleva la vista, deslizando, al bloque con su escenario y su tarjeta: todo junto si cabe; si no, que se vea desde el
// escenario. El destino se recalcula mientras se desplaza (el hueco crece, la tarjeta anterior se recoge).
export function verTarjeta(ancla, { arriba = 56, abajo = 0 } = {}) {
  const el = bloque(ancla);
  if (!el || !tarjetaPuesta()) return;
  desplazarSuave(() => {
    const t = tarjetaPuesta();
    if (!t) return window.scrollY;
    const re = el.getBoundingClientRect();
    const rt = t.caja.getBoundingClientRect();
    const st = escenarioPuesto();
    const rs = st?.getBoundingClientRect();
    const falta = st ? Math.max(0, (parseFloat(st.style.height) || 0) - rs.height) : 0;
    const top = Math.min(re.top, rt.top, rs ? rs.top : Infinity);
    const bottom = Math.max(re.bottom, rt.bottom) + falta;
    const fondo = window.innerHeight - abajo - 12;
    const y = bottom - top <= fondo - arriba ? top - arriba : Math.min(top - arriba, rt.bottom + falta - fondo);
    return window.scrollY + y;
  });
}

export function tarjetaVisible({ arriba = 40, abajo = 0 } = {}) {
  const t = tarjetaPuesta();
  if (!t) return false;
  const r = t.caja.getBoundingClientRect();
  return r.bottom > arriba + 20 && r.top < window.innerHeight - abajo - 20;
}

// Hace latir un botón de la tarjeta (el de seguir) para indicar el siguiente paso.
export function latirBoton(selector) {
  const b = tarjeta?.caja.querySelector(selector);
  if (!b || reducir()) return;
  b.classList.remove("late");
  void b.offsetWidth;
  b.classList.add("late");
}
