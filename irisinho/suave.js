// Movimiento de la página sin tirones (25-oct-2026, Javi: «cuando le doy a siguiente va del tirón para abajo; tiene
// que ser fluido, como un slide; en toda la interfaz»).
//
// - desplazarSuave: el desplazamiento del navegador es rápido y seco en distancias largas; aquí dura más cuanto más
//   lejos va y la curva arranca y frena despacio. El destino se recalcula en cada fotograma, así que si la página cambia
//   mientras se desplaza (se abre el hueco de Irisinho, se recoge la tarjeta anterior), el viaje se corrige sin saltos.
//   Si el cliente toca la pantalla, la rueda o una tecla, se para y manda él.
// - cambiarSinSalto: cuando algo cambia por encima del bloque que el cliente está tocando, ese bloque se queda quieto
//   bajo su dedo (se compensa en cada fotograma mientras dura la animación).

const reducir = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const curva = (p) => (1 - Math.cos(Math.PI * p)) / 2;
const CORTAN = ["wheel", "touchstart", "keydown", "mousedown"];
let viaje = null;
let fija = null;

export function desplazando() {
  return !!viaje;
}

export function pararDesplazamiento() {
  if (!viaje) return;
  cancelAnimationFrame(viaje.raf);
  viaje = null;
  if (!fija) document.documentElement.style.overflowAnchor = "";
  for (const ev of CORTAN) window.removeEventListener(ev, pararDesplazamiento, { capture: true });
}

// destino: el scrollY al que ir, o una función que lo calcula (se llama en cada fotograma).
export function desplazarSuave(destino) {
  const calcular = typeof destino === "function" ? destino : () => destino;
  const limitar = (y) => Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, y));
  pararDesplazamiento();
  fija = null;
  document.documentElement.style.overflowAnchor = "";
  const y0 = window.scrollY;
  const y1 = limitar(calcular());
  const d = Math.abs(y1 - y0);
  if (d < 3) return;
  if (reducir()) { window.scrollTo({ top: y1, behavior: "instant" }); return; }
  // Durante el viaje manda este desplazamiento (el anclaje del navegador, apagado).
  document.documentElement.style.overflowAnchor = "none";
  viaje = { t0: performance.now(), dur: Math.min(1250, Math.max(620, 430 + d * 0.55)), y0, calcular, raf: 0 };
  for (const ev of CORTAN) window.addEventListener(ev, pararDesplazamiento, { passive: true, capture: true });
  const paso = (ahora) => {
    const v = viaje;
    if (!v) return;
    const p = Math.min(1, (ahora - v.t0) / v.dur);
    window.scrollTo({ top: v.y0 + (limitar(v.calcular()) - v.y0) * curva(p), behavior: "instant" });
    if (p < 1) v.raf = requestAnimationFrame(paso);
    else pararDesplazamiento();
  };
  viaje.raf = requestAnimationFrame(paso);
}

// Hace el cambio `mover` sin que `el` se mueva en la pantalla, también durante los `ms` siguientes (animaciones de
// alto). Si el cliente desplaza la página entretanto, se deja de compensar. Mientras tanto se apaga el «anclaje» del
// navegador (que también intenta compensar, a su manera, y se pelean): solo compensa esto.
export function cambiarSinSalto(el, mover, ms = 600) {
  if (!el) { mover(); return; }
  document.documentElement.style.overflowAnchor = "none";
  const top = el.getBoundingClientRect().top;
  mover();
  const dif = el.getBoundingClientRect().top - top;
  if (Math.abs(dif) > 0.5) window.scrollBy({ top: dif, behavior: "instant" });
  const hasta = performance.now() + ms;
  if (fija) { Object.assign(fija, { el, top, y: window.scrollY, hasta: Math.max(fija.hasta, hasta) }); return; }
  fija = { el, top, y: window.scrollY, hasta };
  const fin = () => { fija = null; document.documentElement.style.overflowAnchor = ""; };
  const paso = (ahora) => {
    const f = fija;
    if (!f || viaje || Math.abs(window.scrollY - f.y) > 1) { fin(); return; }
    const d = f.el.isConnected ? f.el.getBoundingClientRect().top - f.top : 0;
    if (Math.abs(d) > 0.5) window.scrollBy({ top: d, behavior: "instant" });
    f.y = window.scrollY;
    if (ahora < f.hasta) requestAnimationFrame(paso);
    else fin();
  };
  requestAnimationFrame(paso);
}
