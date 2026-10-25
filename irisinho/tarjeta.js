// Tarjeta de Irisinho DENTRO de la página, justo debajo del bloque del que habla (24-oct-2026, Javi: en el móvil la hoja
// que sube desde abajo «se pisa» con lo que hace el cliente y tapa media pantalla; quiere lo de antes, debajo de cada
// recuadro, para que no moleste). Desde el 25-oct se usa igual en el móvil y en el ordenador, para la guía y los consejos.
//
// Encima del bloque se abre un «escenario» (Javi, 25-oct: «el texto debajo de la sección, pero Irisinho arriba,
// explicando y señalando, para que se vea bien y se lea claro»): un hueco sobre el título donde Irisinho se coloca con su
// bocadillo. El escenario es un div de la página (solo ocupa sitio); a Irisinho lo coloca irisinho.js mirando dónde está.
//
// La tarjeta es su propio elemento con Shadow DOM: no hereda ni toca los estilos de la web. Solo hay una tarjeta y un
// escenario a la vez; al cambiar de bloque se mueven sin que la página dé un salto bajo el dedo del cliente.

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
.paso-titulo { font-size: 17px; font-weight: 800; line-height: 1.25; margin: 2px 0 4px; }
.texto { font-size: 14px; }

/* Lo que ha elegido: nombre grande y qué es, en una línea */
.op-nombre { font-size: 17px; font-weight: 800; line-height: 1.2; }
.op-que { font-size: 13px; color: #555; margin-top: 2px; }

/* Lo que Irisinho opina */
.veredicto { display: flex; gap: 8px; align-items: flex-start; margin-top: 10px; font-size: 14.5px; font-weight: 600; line-height: 1.4; }
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
.consejo-txt { font-size: 14px; line-height: 1.42; }
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

// Mueve un nodo de la página sin que el bloque de destino se desplace en la pantalla.
function sinSalto(el, mover) {
  const antes = el.getBoundingClientRect().top;
  mover();
  const salto = el.getBoundingClientRect().top - antes;
  if (Math.abs(salto) > 1) window.scrollBy({ top: salto, behavior: "instant" });
}

// Pone la tarjeta bajo el bloque `ancla` con ese HTML y devuelve su caja (para enlazar los botones), o null si el bloque
// no está.
export function ponerTarjeta(ancla, html) {
  const el = bloque(ancla);
  if (!el) return null;
  const dentro = el.matches(".grupo");
  if (!tarjeta) tarjeta = document.createElement("irisinho-tarjeta");
  const sitioBien = tarjeta.isConnected && (dentro ? tarjeta.parentElement === el : tarjeta.previousElementSibling === el);
  if (!sitioBien) {
    sinSalto(el, () => {
      tarjeta.remove();
      if (dentro) el.append(tarjeta);
      else el.after(tarjeta);
    });
    tarjeta.style.maxWidth = dentro ? "" : getComputedStyle(el).maxWidth;
    tarjeta.caja.classList.remove("entra");
    void tarjeta.caja.offsetWidth;
    tarjeta.caja.classList.add("entra");
  }
  tarjeta.caja.innerHTML = html;
  return tarjeta.caja;
}

export function quitarTarjeta(animado = true) {
  const t = tarjeta;
  if (!t?.isConnected) return;
  tarjeta = null;
  const h = t.offsetHeight;
  if (!animado || !h || reducir()) { t.remove(); return; }
  t.style.overflow = "hidden";
  t.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 220, easing: "ease-in" })
    .finished.then(() => t.remove(), () => t.remove());
}

// Ojo: se mide la tarjeta de dentro (caja), no el elemento: en una columna flex su margen no se junta con el de fuera.
export function tarjetaPuesta() {
  return tarjeta?.isConnected ? tarjeta : null;
}

// Escenario de Irisinho encima del bloque `ancla` (alto en px). Al abrirse crece suave; el anterior se quita sin salto.
export function ponerEscenario(ancla, alto) {
  const el = bloque(ancla);
  if (!el) { quitarEscenario(); return null; }
  const dentro = el.matches(".grupo");
  if (escenario?.isConnected && (dentro ? escenario.parentElement === el && el.firstElementChild === escenario : escenario.nextElementSibling === el)) {
    if (parseFloat(escenario.style.height) !== alto) escenario.style.height = alto + "px";
    return escenario;
  }
  const nuevo = document.createElement("div");
  nuevo.className = "irisinho-escenario";
  nuevo.setAttribute("aria-hidden", "true");
  Object.assign(nuevo.style, { display: "block", gridColumn: "1 / -1", width: "100%", height: reducir() ? alto + "px" : "0px", transition: "height .32s cubic-bezier(.2,.8,.2,1)" });
  // Fuera de un bloque del configurador (la subida, la lista de archivos), tan ancho como ese elemento.
  if (!dentro) nuevo.style.maxWidth = getComputedStyle(el).maxWidth;
  sinSalto(el, () => {
    escenario?.remove();
    if (dentro) el.prepend(nuevo);
    else el.before(nuevo);
  });
  escenario = nuevo;
  if (!reducir()) requestAnimationFrame(() => { nuevo.style.height = alto + "px"; });
  return nuevo;
}

export function quitarEscenario() {
  const e = escenario;
  escenario = null;
  if (!e?.isConnected) return;
  if (reducir()) { e.remove(); return; }
  e.style.height = "0px";
  setTimeout(() => e.remove(), 340);
}

export function escenarioPuesto() {
  return escenario?.isConnected ? escenario : null;
}

// Lleva la vista al bloque con su escenario y su tarjeta: todo junto si cabe; si no, que se vea desde el escenario.
export function verTarjeta(ancla, { arriba = 56, abajo = 0 } = {}) {
  const el = bloque(ancla);
  const t = tarjetaPuesta();
  if (!el || !t) return;
  const re = el.getBoundingClientRect();
  const rt = t.caja.getBoundingClientRect();
  const rs = escenarioPuesto()?.getBoundingClientRect();
  const alto = rs ? parseFloat(escenarioPuesto().style.height) || rs.height : 0;
  const top = Math.min(re.top, rt.top, rs ? rs.top : Infinity);
  const bottom = Math.max(re.bottom, rt.bottom) + (rs && rs.height < alto ? alto - rs.height : 0);
  const fondo = window.innerHeight - abajo - 12;
  const y = bottom - top <= fondo - arriba ? top - arriba : Math.min(top - arriba, rt.bottom - fondo);
  if (Math.abs(y) > 4) window.scrollTo({ top: Math.max(0, window.scrollY + y), behavior: "smooth" });
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
