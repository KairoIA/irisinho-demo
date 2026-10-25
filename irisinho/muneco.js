// Irisinho por piezas (24-oct-2026, Javi: «tiene que estar vivo: que se mueva, que se rasque la cabeza, que se gire»).
//
// El dibujo de reposo está despiezado en capas (tools/generar_rig.py): cuerpo, ojo (la «C»), brillo del cristal, boca,
// antena, manos, llama y chispas. Aquí se mueven una a una en cada fotograma:
//   - siempre: las manos y la antena siguen al cuerpo con retraso, el ojo mira de un lado a otro y parpadea;
//   - de vez en cuando (lo decide irisinho.js): se rasca la cabeza, se gira a mirar la página, mira alrededor, se mira
//     el guante, hace molinillos con los brazos, se estira, aplaude, asiente o niega, señala la tarjeta, se toca la
//     antena (que se queda vibrando) y gira sobre sí mismo (de espaldas no se le ve la cara);
//   - además va a la deriva un poco de lado a lado y «respira» (25-oct, Javi: «que se sienta más vivo, que mueva los brazos»);
//   - reacciona a lo que hace el cliente (25-oct, «la 2 es buena»): inercia al desplazar la página (manos y antena se quedan
//     atrás y rebotan), se duerme si nadie hace nada (ojo cerrado, cae un poco) y se despierta con un respingo, y tamborilea
//     los dedos si el precio tarda;
//   - según lo que hace: señala (mano con el dedo), saluda, celebra (manos arriba), habla (la boca parpadea) y, al leer
//     un PDF, saca la lupa (esa pose sigue siendo un dibujo entero, con un vaivén de «estar leyendo»).
//   - «A» (25-oct): todo va con muelles (se pasa un poco y vuelve; manos y antena siguen moviéndose cuando el cuerpo
//     para), coge impulso antes de saltar, parpadea con párpado, de espaldas se le ve la espalda dibujada, y tiene más
//     manos (pulgar arriba, OK, puño, dedo arriba «¡idea!», mano en la barbilla pensando).
// Con «pausar la animación» o «reducir movimiento» se queda quieto (cambia de pose, pero sin movimiento).
import { MUNECAS, PARTES, PIVOTES } from "./rig/partes.js";

const DEL_TORSO = ["chispasLlama", "llama", "antena", "chispasAntena", "cuerpo", "espalda", "ojo", "brillo", "boca"].filter((n) => PARTES[n]);
const MANOS_EXTRA = ["manoSenala", "manoSaluda", "manoArribaI", "manoArribaD", "manoPulgar", "manoOk", "manoPuno", "manoIdea", "manoPensar"].filter((n) => PARTES[n]);
const MANOS = ["manoI", "manoD", ...MANOS_EXTRA];
// Muñeca (punto de giro) de las manos que salen de otras poses, en fracción de su propia caja (la calcula generar_rig.py
// por el puño lila del guante; estas son las de respaldo).
const MUNECA = { manoSenala: [0.9, 0.5], manoSaluda: [0.82, 0.92], manoArribaI: [0.69, 0.86], manoArribaD: [0.1, 0.83], ...(MUNECAS || {}) };
// Muelles (rigidez, amortiguación): cuanto menos amortiguado, más rebota.
const MUELLE = { mano: [170, 15], antena: [80, 6], torso: [200, 22], ojo: [380, 34] };
const MODOS = ["senala", "saluda", "celebra"];

const suave = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const env = (tau, D, entra = 0.25, sale = 0.3) => suave(tau / entra) * suave((D - tau) / sale);
const bump = (u) => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u));
const azar = (a, b) => a + Math.random() * (b - a);

function pivote(nombre) {
  const p = PARTES[nombre];
  if (MUNECA[nombre]) return [p.x + MUNECA[nombre][0] * p.w, p.y + MUNECA[nombre][1] * p.h];
  return PIVOTES[nombre] || [p.x + p.w / 2, p.y + p.h / 2];
}

export const CSS_MUNECO = `
.rig { position: absolute; inset: 0; opacity: 0; transition: opacity .18s ease; pointer-events: none; }
.rig.lista { opacity: 1; }
.rig.oculta { opacity: 0; }
.rig .torso, .rig .pantalla { position: absolute; inset: 0; }
.rig .torso { z-index: 2; transform-origin: 50% 62%; }
.rig .pantalla { clip-path: circle(12.7% at 52.23% 45.85%); }
.rig .parpado { position: absolute; left: 39.4%; top: 33.1%; width: 25.6%; height: 25.6%; transform: translateY(-101%);
  background: linear-gradient(#D4CBF6, #B19DE0 70%, #9D8BD4); box-shadow: inset 0 -1.5px 0 #000; will-change: transform; }
.rig .p-espalda { opacity: 0; }
.rig img { position: absolute; display: block; user-select: none; -webkit-user-drag: none; pointer-events: none; will-change: transform; }
.rig .m { z-index: 3; }
.rig .p-llama { animation: llamaRig .16s ease-in-out infinite alternate; }
.rig .p-chispasLlama, .rig .p-chispasAntena { animation: chispas 1.1s steps(2, jump-none) infinite; }
.rig .p-chispasAntena { animation-duration: 1.7s; }
@keyframes llamaRig { from { transform: scale(.9, .84); } to { transform: scale(1.06, 1.14); } }
@keyframes chispas { 0% { opacity: 1; } 50% { opacity: .35; } 100% { opacity: 1; } }
.pose.lupa.activa { animation: leer 1.5s ease-in-out infinite; }
@keyframes leer { 0%, 100% { transform: translateX(-2.5%) rotate(-2deg); } 50% { transform: translateX(2.5%) rotate(2deg); } }
.quieto .rig .p-llama, .quieto .rig .p-chispasLlama, .quieto .rig .p-chispasAntena, .quieto .pose.lupa { animation: none !important; }
`;

export class Muneco {
  constructor(rig, lupa, base) {
    this.rig = rig;
    this.lupa = lupa;
    this.t = 104;
    this.modo = "reposo";
    this.peso = { senala: 0, saluda: 0, celebra: 0 };
    this.apunta = 0;                 // giro del dedo: 0 = a la izquierda, + = hacia arriba
    this.acciones = [];
    this.mira = { x: 0, y: 0 };      // hacia dónde mira el ojo ahora (en % del lienzo)
    this.objetivo = { x: 0, y: 0 };
    this.cursor = null;
    this.parado = false;
    this.proxParpadeo = 1.5;
    this.inercia = { y: 0, v: 0, obj: 0 };
    this.dormido = false;
    this.pesoSueno = 0;
    this.proxMirada = 1;
    this.el = {};
    this.piv = Object.fromEntries(MANOS.map((n) => [n, pivote(n)]));
    this.muelles = {};
    this.vistaAntes = {};
    this.montar(base);
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  montar(base) {
    const img = (n, clase = "") => {
      const p = PARTES[n];
      const [px, py] = pivote(n);
      const i = document.createElement("img");
      i.className = `p-${n} ${clase}`.trim();
      i.alt = "";
      i.draggable = false;
      i.src = `${base}rig/${n}.webp`;
      Object.assign(i.style, {
        left: p.x + "%", top: p.y + "%", width: p.w + "%", height: p.h + "%",
        transformOrigin: `${((px - p.x) / p.w) * 100}% ${((py - p.y) / p.h) * 100}%`,
      });
      this.el[n] = i;
      return i;
    };
    const torso = document.createElement("div");
    torso.className = "torso";
    const pantalla = document.createElement("div");
    pantalla.className = "pantalla";
    const parpado = document.createElement("div");
    parpado.className = "parpado";
    for (const n of DEL_TORSO) {
      if (n === "ojo") { pantalla.append(img(n), parpado); torso.append(pantalla); }
      else torso.append(img(n));
    }
    this.el.pantalla = pantalla;
    this.el.parpado = parpado;
    // La antena y sus chispas giran sobre la base de la antena.
    const [ax, ay] = PIVOTES.antena;
    const ch = PARTES.chispasAntena;
    this.el.chispasAntena.style.transformOrigin = `${((ax - ch.x) / ch.w) * 100}% ${((ay - ch.y) / ch.h) * 100}%`;
    this.rig.append(torso);
    for (const n of MANOS) this.rig.append(img(n, "m"));
    for (const n of MANOS_EXTRA) this.el[n].style.opacity = "0";
    this.el.torso = torso;
    const imgs = [...this.rig.querySelectorAll("img")];
    // Hasta que cargan las piezas se ve el dibujo de reposo entero.
    Promise.all(imgs.map((i) => i.decode().catch(() => null))).then(() => {
      this.rig.classList.add("lista");
      this.rig.parentElement.querySelector(".pose.espera")?.classList.remove("activa");
    });
  }

  // ------------------------------------------------------------------ lo que le pide irisinho.js
  tamano(t) { this.t = t; }
  quieto(si) {
    this.parado = si;
    if (si) {
      cancelAnimationFrame(this.raf);
      this.acciones = [];
      for (const m of MODOS) this.peso[m] = this.modo === m ? 1 : 0;
      this.mira = { x: 0, y: 0 };
      this.pintar(0, 0);
    } else {
      this.tPrev = undefined;
      this.raf = requestAnimationFrame(this.tick);
    }
  }
  pose(nombre) {
    const nuevo = MODOS.includes(nombre) || nombre === "lupa" ? nombre : "reposo";
    if (nuevo !== this.modo) this.inicioModo = this.ahora ?? 0;
    this.modo = nuevo;
    const lupa = this.modo === "lupa";
    this.rig.classList.toggle("oculta", lupa);
    this.lupa.classList.toggle("activa", lupa);
    this.rig.parentElement.querySelector(".pose.espera")?.classList.toggle("activa", !lupa && !this.rig.classList.contains("lista"));
    if (nombre !== "senala") this.apunta = 0;
    if (this.parado) this.quieto(true);
  }
  apuntar(haciaArriba) { this.apunta = haciaArriba ? 28 : 0; }
  // Gestos que usan las manos: no se mezclan entre sí.
  static GRANDES = ["rascar", "girar", "alrededor", "guante", "senalar", "aplaudir", "brazos", "estirarse", "antena", "pirueta", "tamborilear",
    "pulgar", "ok", "puno", "idea", "pensar"];
  mirarA(nx, ny) { this.cursor = nx == null ? null : { x: nx, y: ny, cuando: performance.now() }; }
  // Velocidad del desplazamiento de la página (px/s): las partes sueltas se quedan atrás y rebotan como un muelle.
  empujar(v) { this.inercia.obj = Math.max(-12, Math.min(12, v * 0.004)); }
  dormir(si) {
    this.dormido = si;
    if (si) this.acciones = this.acciones.filter((a) => !a.grande);
  }
  ocupado() { return this.acciones.some((a) => a.grande); }
  // Saludar y celebrar son un momento: después baja las manos aunque la pose siga puesta (si no, parecería que baila).
  modoEfectivo(t = this.ahora ?? 0) {
    const dura = { saluda: 2.6, celebra: 2.2 }[this.modo];
    return dura && t - (this.inicioModo ?? 0) > dura ? "reposo" : this.modo;
  }
  accion(nombre, o = {}) {
    if (this.parado) return false;
    const D = {
      parpadeo: 0.15, rascar: 2.4, girar: 2.1, alrededor: 2.7, guante: 2.3, senalar: 1.9, aplaudir: 1.5, brazos: 1.9,
      estirarse: 2.3, asentir: 0.9, negar: 0.9, antena: 1.9, pirueta: 1.35, respingo: 0.7, tamborilear: 1.6,
      pulgar: 1.7, ok: 1.7, puno: 1.5, idea: 1.9, pensar: 2.4, hablar: (o.ms || 900) / 1000, volar: (o.ms || 700) / 1000,
    }[nombre];
    if (!D) return false;
    if (this.dormido && nombre !== "respingo") return false;
    const mano = { pulgar: "manoPulgar", ok: "manoOk", puno: "manoPuno", idea: "manoIdea", pensar: "manoPensar" }[nombre];
    if (mano && !PARTES[mano]) return false;
    const grande = Muneco.GRANDES.includes(nombre);
    // Las reacciones a lo que hace el cliente (forzar) cortan el gesto que hubiera; las de relleno esperan su turno.
    if (grande && o.forzar) this.acciones = this.acciones.filter((a) => !a.grande);
    if (grande && (this.ocupado() || this.modoEfectivo() !== "reposo")) return false;
    this.acciones = this.acciones.filter((a) => a.nombre !== nombre);
    this.acciones.push({ nombre, t0: this.ahora ?? 0, D, o, grande });
    return true;
  }

  // ------------------------------------------------------------------ cada fotograma
  tick(ms) {
    const t = ms / 1000;
    const dt = this.tPrev === undefined ? 0 : Math.min(0.05, t - this.tPrev);
    this.tPrev = t;
    this.ahora = t;
    if (!this.parado) this.pintar(t, dt);
    this.raf = requestAnimationFrame(this.tick);
  }

  pintar(t, dt) {
    const v = {
      torso: { x: 0, y: 0, r: 0, sx: 1, sy: 1 },
      ojo: { x: 0, y: 0, r: 0, sx: 1, sy: 1 },
      antena: { r: 0 },
      boca: { o: 1 },
      giro: 1,       // girar sobre sí mismo: 1 de frente, -1 de espaldas (ancho del cuerpo)
    };
    for (const n of MANOS) v[n] = { x: 0, y: 0, r: 0, s: 1, o: n === "manoI" || n === "manoD" ? 1 : 0, z: 3 };
    const quieto = this.parado;

    // 1) Base: las manos y la antena siguen al cuerpo (que flota con el CSS) con un poco de retraso.
    if (!quieto) {
      const w = (Math.PI * 2) / 3.4;
      v.manoI.y += Math.sin(w * t - 0.8) * 2.2;
      v.manoD.y += Math.sin(w * t - 1.1) * 2.2;
      v.manoI.x += Math.sin(w * 0.5 * t + 1.3) * 1;
      v.manoD.x += Math.sin(w * 0.5 * t + 3.1) * -1;
      v.manoI.r += Math.sin(w * 0.5 * t + 0.4) * 7;
      v.manoD.r += Math.sin(w * 0.5 * t + 2.1) * -7;
      v.antena.r += Math.sin(w * t - 1.4) * 5;
      v.torso.sy += Math.sin(w * t) * 0.012;
      v.torso.sx += Math.sin(w * t + Math.PI) * 0.008;
      this.deriva = { x: Math.sin(t * 0.83) * 3 + Math.sin(t * 0.31) * 2, y: Math.sin(t * 0.57) * 1.2 };
      this.mirada(t, dt);
      v.ojo.x += this.mira.x;
      v.ojo.y += this.mira.y;
      v.torso.r += this.mira.x * 0.35;
      // Inercia: muelle que persigue la velocidad del desplazamiento y vuelve a cero con rebote.
      const ine = this.inercia;
      ine.obj *= Math.exp(-dt * 5);
      ine.v += (70 * (ine.obj - ine.y) - 9 * ine.v) * dt;
      ine.y += ine.v * dt;
      v.manoI.y += ine.y * 0.9;
      v.manoD.y += ine.y * 0.9;
      v.manoI.r += ine.y * 1.5;
      v.manoD.r -= ine.y * 1.5;
      v.antena.r += ine.y * 1.8;
      // Sueño: el ojo se cierra despacio, cae un poco y respira lento; al despertar vuelve rápido.
      const metaS = this.dormido ? 1 : 0;
      this.pesoSueno += Math.sign(metaS - this.pesoSueno) * Math.min(Math.abs(metaS - this.pesoSueno), dt / (this.dormido ? 1.4 : 0.25));
      const zz = suave(this.pesoSueno);
      if (zz > 0) {
        v.ojo.sy += -0.9 * zz;
        v.ojo.y += 1.6 * zz;
        v.torso.y += 3 * zz;
        v.torso.sy += Math.sin(t * 1.6) * 0.02 * zz;
        v.manoI.y += 4 * zz;
        v.manoD.y += 4 * zz;
        v.antena.r += 12 * zz;
      }
      this.sueno = zz;
      if (this.dormido) this.proxParpadeo = Math.max(this.proxParpadeo, t + 1);
      if (t > this.proxParpadeo) {
        this.acciones.push({ nombre: "parpadeo", t0: t, D: 0.15 });
        if (Math.random() < 0.22) this.acciones.push({ nombre: "parpadeo", t0: t + 0.26, D: 0.15 });
        this.proxParpadeo = t + azar(2.2, 5.8);
      }
    }

    // 2) Poses que duran (señalar, saludar, celebrar): pasan de una mano a otra a mitad del gesto.
    const modo = quieto ? this.modo : this.modoEfectivo(t);
    for (const m of MODOS) {
      const meta = modo === m ? 1 : 0;
      const p = this.peso[m];
      this.peso[m] = quieto ? meta : p + Math.sign(meta - p) * Math.min(Math.abs(meta - p), dt / 0.32);
    }
    const ps = suave(this.peso.senala), pz = suave(this.peso.saluda), pc = suave(this.peso.celebra);
    if (ps > 0) {
      this.cambiarMano(v, "manoI", "manoSenala", ps, -30, 25);
      const tap = quieto ? 0 : bump(((t % 2.6) - 2) / 0.4);
      v.manoSenala.x += -1.8 * tap * ps;
      v.manoSenala.r += this.apunta * ps + 4 * tap;
      v.ojo.x += -2.6 * ps;
      v.ojo.y += (this.apunta ? -1.6 : 0.3) * ps;
      v.torso.r += -3 * ps;
    }
    if (pz > 0) {
      this.cambiarMano(v, "manoI", "manoSaluda", pz, 90, -90);
      if (!quieto) v.manoSaluda.r += Math.sin(t * Math.PI * 2 * 2.4) * 16 * pz;
      v.ojo.sy += -0.16 * pz;
      v.ojo.y += -1 * pz;
      v.torso.r += (-2 + (quieto ? 0 : Math.sin(t * 4) * 1.2)) * pz;
    }
    if (pc > 0) {
      this.cambiarMano(v, "manoI", "manoArribaI", pc, 90, -60);
      this.cambiarMano(v, "manoD", "manoArribaD", pc, -90, 60);
      if (!quieto) {
        const s = Math.sin(t * Math.PI * 2 * 3.6);
        v.manoArribaI.y += s * 1.6 * pc;
        v.manoArribaD.y += -s * 1.6 * pc;
        v.manoArribaI.r += s * 9 * pc;
        v.manoArribaD.r += s * 9 * pc;
        v.ojo.sx += 0.08 * pc * (1 + Math.sin(t * 15)) / 2;
        v.ojo.sy += 0.08 * pc * (1 + Math.sin(t * 15)) / 2;
      }
      v.ojo.y += -0.8 * pc;
    }

    // 3) Gestos sueltos.
    this.acciones = this.acciones.filter((a) => t - a.t0 < a.D);
    for (const a of this.acciones) {
      const tau = t - a.t0;
      if (tau < 0) continue;
      this.gesto(a, tau, v, t);
    }

    this.aplicar(v, dt);
  }

  // Muelle: la parte persigue su sitio y, como un muelle, se pasa un poco y vuelve. «saltar» la pone en su sitio de golpe.
  muelle(clave, objetivo, [k, c], dt, saltar) {
    let s = this.muelles[clave];
    if (!s || saltar || !dt) { this.muelles[clave] = { p: objetivo, v: 0 }; return objetivo; }
    for (let resto = dt; resto > 0; resto -= 1 / 120) {
      const h = Math.min(resto, 1 / 120);
      s.v += (k * (objetivo - s.p) - c * s.v) * h;
      s.p += s.v * h;
    }
    return s.p;
  }

  // La mano de reposo va hacia la otra, y a mitad del camino se cambia el dibujo (con el movimiento no se nota).
  cambiarMano(v, base, otra, p, giroBase, giroOtra) {
    const [bx, by] = pivote(base);
    const [ox, oy] = pivote(otra);
    const dx = ox - bx, dy = oy - by;
    const kb = Math.min(1, p / 0.5);
    const ko = Math.min(1, (1 - p) / 0.5);
    v[base].x += dx * 0.5 * kb;
    v[base].y += dy * 0.5 * kb;
    v[base].r += giroBase * kb;
    v[otra].x += -dx * 0.5 * ko;
    v[otra].y += -dy * 0.5 * ko;
    v[otra].r += giroOtra * ko;
    if (p >= 0.5) { v[base].o = 0; v[otra].o = 1; }
  }

  // El ojo va saltando de un sitio a otro (como miramos nosotros) o sigue el ratón si está cerca.
  mirada(t, dt) {
    const c = this.cursor && performance.now() - this.cursor.cuando < 2500 ? this.cursor : null;
    if (this.dormido) this.objetivo = { x: 0, y: 0 };
    else if (c) this.objetivo = { x: c.x * 3, y: c.y * 2.2 };
    else if (t > this.proxMirada) {
      this.objetivo = Math.random() < 0.35 ? { x: 0, y: 0 } : { x: azar(-1.8, 1.8), y: azar(-1.3, 1.1) };
      this.proxMirada = t + azar(1.2, 3.4);
    }
    const k = 1 - Math.exp(-dt * 16);
    this.mira.x += (this.objetivo.x - this.mira.x) * k;
    this.mira.y += (this.objetivo.y - this.mira.y) * k;
  }

  gesto(a, tau, v, t) {
    const D = a.D;
    switch (a.nombre) {
      case "parpadeo":
        v.ojo.sy += -0.92 * bump(tau / D);
        break;
      case "hablar": {
        // La boca parpadea como cuando habla un robot.
        const azarPaso = Math.abs(Math.sin(Math.floor(tau / 0.085) * 12.9898) * 43758.5453) % 1;
        v.boca.o = tau > D - 0.1 || azarPaso > 0.5 ? 1 : 0.15;
        break;
      }
      case "rascar": {
        // Sube la mano izquierda a la cabeza, se rasca y mira hacia arriba, pensativo.
        const e = env(tau, D, 0.45, 0.45);
        const dentro = env(tau, D, 0.55, 0.55);
        const osc = Math.sin(tau * Math.PI * 2 * 5.5) * dentro;
        v.manoI.x += 2 * e - 13 * Math.sin(Math.PI * e) + 1.1 * osc;
        v.manoI.y += -57 * e;
        v.manoI.r += -40 * e + 11 * osc;
        v.torso.r += -5 * e;
        v.torso.x += 1 * e;
        v.ojo.x += -2.2 * e;
        v.ojo.y += -2.4 * e;
        v.ojo.sy += -0.28 * e;
        v.antena.r += 4 * e + 2 * osc;
        break;
      }
      case "girar": {
        // Se gira a mirar a un lado (la página): el cuerpo se estrecha, el ojo se va al lado y la mano del fondo se esconde.
        const dir = a.o.dir || -1;
        const e = env(tau, D, 0.4, 0.45);
        v.torso.sx += -0.055 * e;
        v.torso.r += 3 * dir * e;
        v.torso.x += 1.5 * dir * e;
        v.ojo.x += 4.4 * dir * e;
        v.ojo.sx += -0.15 * e;
        const lejos = dir < 0 ? "manoD" : "manoI";
        const cerca = dir < 0 ? "manoI" : "manoD";
        v[lejos].x += dir * 7 * e;
        v[lejos].s += -0.12 * e;
        if (e > 0.35) v[lejos].z = 1;
        v[cerca].x += dir * 2.5 * e;
        v[cerca].y += -1.2 * e;
        v[cerca].s += 0.05 * e;
        v.antena.r += -dir * 6 * e;
        break;
      }
      case "alrededor": {
        // Mira a un lado, al otro y vuelve.
        const x = tau < 1 ? -3 * suave(tau / 0.3) : tau < 2 ? -3 + 6 * suave((tau - 1) / 0.3) : 3 - 3 * suave((tau - 2) / 0.3);
        v.ojo.x += x;
        v.ojo.y += -0.6 * Math.abs(x) / 3;
        v.torso.r += x * 0.7;
        v.antena.r += -x * 0.8;
        break;
      }
      case "guante": {
        // Se mira el guante derecho y mueve los dedos.
        const e = env(tau, D, 0.45, 0.45);
        const dentro = env(tau, D, 0.6, 0.6);
        v.manoD.x += -13 * e;
        v.manoD.y += -1.5 * e;
        v.manoD.r += 62 * e + Math.sin(tau * Math.PI * 2 * 3) * 6 * dentro;
        v.ojo.x += 2.2 * e;
        v.ojo.y += 3 * e;
        v.torso.r += 2.5 * e;
        break;
      }
      case "senalar": {
        // Señala con el dedo (la tarjeta o el bloque) y da un par de toquecitos. o.apunta: 0 izquierda, + arriba, - abajo.
        const e = env(tau, D, 0.3, 0.35);
        const dentro = env(tau, D, 0.45, 0.45);
        const ap = a.o.apunta ?? 0;
        this.cambiarMano(v, "manoI", "manoSenala", e, -30, 25);
        const tap = bump(((tau - 0.4) % 0.5) / 0.28) * dentro;
        v.manoSenala.x += -1.8 * tap;
        v.manoSenala.y += (ap < 0 ? 1.2 : ap > 0 ? -1 : 0) * tap;
        v.manoSenala.r += ap * e + 4 * tap;
        v.ojo.x += -2.4 * e;
        v.ojo.y += (ap > 0 ? -1.6 : ap < 0 ? 2.2 : 0.3) * e;
        v.torso.r += -3 * e;
        break;
      }
      case "asentir": {
        // Dice que sí con la cabeza.
        const k = Math.sin((tau / D) * Math.PI * 4) * env(tau, D, 0.1, 0.2);
        v.torso.y += 1.8 * Math.max(0, k);
        v.torso.sy += -0.035 * Math.max(0, k);
        v.ojo.y += 1.6 * k;
        v.antena.r += 4 * k;
        break;
      }
      case "negar": {
        // Dice que no con la cabeza (cuando hay algo mejor para su PDF).
        const k = Math.sin((tau / D) * Math.PI * 5) * env(tau, D, 0.1, 0.2);
        v.torso.r += 6 * k;
        v.ojo.x += 2.2 * k;
        v.antena.r += -6 * k;
        break;
      }
      case "aplaudir": {
        // Junta las manos delante y aplaude.
        const e = env(tau, D, 0.3, 0.3);
        const sep = 3 + 6 * Math.abs(Math.sin(tau * Math.PI * 2 * 2.2)) * env(tau, D, 0.35, 0.35);
        v.manoI.x += (10 - sep) * e;
        v.manoD.x += (-10 + sep) * e;
        v.manoI.y += 6 * e;
        v.manoD.y += 6 * e;
        v.manoI.r += -80 * e;
        v.manoD.r += 80 * e;
        v.ojo.sy += -0.2 * e;
        v.ojo.y += -0.9 * e;
        v.torso.y += -1 * e;
        break;
      }
      case "brazos": {
        // Molinillos con los brazos, como quien calienta.
        const e = env(tau, D, 0.35, 0.4);
        const w = tau * Math.PI * 2 * 1.4;
        v.manoI.x += (-4 + Math.cos(w) * 4) * e;
        v.manoI.y += (-16 + Math.sin(w) * 6) * e;
        v.manoI.r += (40 + Math.sin(w) * 22) * e;
        v.manoD.x += (4 - Math.cos(w) * 4) * e;
        v.manoD.y += (-16 + Math.sin(w + Math.PI) * 6) * e;
        v.manoD.r += (-40 - Math.sin(w) * 22) * e;
        v.torso.r += Math.sin(w) * 2.5 * e;
        v.ojo.sy += -0.12 * e;
        break;
      }
      case "estirarse": {
        // Se estira con las dos manos arriba y entorna el ojo, como un bostezo.
        const e = env(tau, D, 0.6, 0.5);
        this.cambiarMano(v, "manoI", "manoArribaI", e, 90, -60);
        this.cambiarMano(v, "manoD", "manoArribaD", e, -90, 60);
        v.torso.sy += 0.06 * e;
        v.torso.sx += -0.03 * e;
        v.torso.y += -2 * e;
        v.ojo.sy += -0.55 * e;
        v.ojo.y += -0.8 * e;
        break;
      }
      case "antena": {
        // Sube la mano derecha (la del lado de la antena), le da un toque y la antena se queda vibrando.
        const e = env(tau, D, 0.42, 0.5);
        const toque = tau > 0.5 ? Math.exp(-(tau - 0.5) * 3.2) * Math.sin((tau - 0.5) * Math.PI * 2 * 4.5) : 0;
        v.manoD.x += 6 * e + 8 * Math.sin(Math.PI * e);
        v.manoD.y += -68 * e;
        v.manoD.r += 40 * e;
        v.antena.r += 20 * toque;
        v.ojo.x += 2.2 * e;
        v.ojo.y += -2.6 * e;
        v.ojo.sy += -0.15 * e;
        v.torso.r += 3 * e;
        break;
      }
      case "pirueta": {
        // Coge impulso (se agacha) y gira sobre sí mismo una vuelta entera con un saltito.
        const prep = 0.15;
        const agacha = bump(Math.min(1, tau / (prep * 1.6)));
        v.torso.y += 2.2 * agacha;
        v.torso.sy += -0.06 * agacha;
        v.torso.sx += 0.04 * agacha;
        const k = suave((tau - prep) / (D - prep));
        v.giro = Math.cos(k * Math.PI * 2);
        v.torso.y += -2.5 * Math.sin(Math.PI * k);
        v.antena.r += -8 * Math.sin(Math.PI * 2 * k);
        break;
      }
      case "pulgar": {
        // ¡Bien! Pulgar arriba con un meneo.
        const e = env(tau, D, 0.3, 0.35);
        this.cambiarMano(v, "manoI", "manoPulgar", e, 40, -25);
        const dentro = env(tau, D, 0.4, 0.4);
        v.manoPulgar.y += Math.sin(tau * Math.PI * 2 * 3) * 1.4 * dentro;
        v.manoPulgar.r += Math.sin(tau * Math.PI * 2 * 3 + 1) * 6 * dentro;
        v.ojo.sy += -0.3 * e;
        v.ojo.y += -1 * e;
        v.torso.r += -2.5 * e;
        break;
      }
      case "ok": {
        // Perfecto: OK con la mano derecha.
        const e = env(tau, D, 0.3, 0.35);
        this.cambiarMano(v, "manoD", "manoOk", e, -40, 25);
        v.manoOk.r += Math.sin(tau * Math.PI * 2 * 2.2) * 5 * env(tau, D, 0.4, 0.4);
        v.ojo.sy += -0.3 * e;
        v.ojo.x += 1.5 * e;
        v.torso.r += 2.5 * e;
        break;
      }
      case "puno": {
        // ¡Sí! Puño arriba dos veces, con saltito.
        const e = env(tau, D, 0.25, 0.35);
        this.cambiarMano(v, "manoI", "manoPuno", e, 70, -40);
        const golpe = Math.max(0, Math.sin(tau * Math.PI * 2 * 2.3)) * env(tau, D, 0.35, 0.4);
        v.manoPuno.y += 3 * golpe;
        v.torso.y += -2 * golpe;
        v.ojo.sy += -0.35 * e;
        v.ojo.y += -1 * e;
        break;
      }
      case "idea": {
        // ¡Idea! Dedo arriba, mira hacia arriba y la antena chispea.
        const e = env(tau, D, 0.3, 0.4);
        this.cambiarMano(v, "manoI", "manoIdea", e, 60, -35);
        const tap = bump(((tau - 0.45) % 0.6) / 0.3) * env(tau, D, 0.5, 0.5);
        v.manoIdea.y += -1.5 * tap;
        v.ojo.y += -2.4 * e;
        v.ojo.x += -1 * e;
        v.torso.y += -1.5 * bump(Math.min(1, tau / 0.5));
        v.antena.r += 6 * Math.sin(tau * Math.PI * 2 * 4) * env(tau, D, 0.3, 0.8);
        break;
      }
      case "pensar": {
        // Hmm… mano en la barbilla, ojo hacia arriba y medio cerrado.
        const e = env(tau, D, 0.4, 0.45);
        this.cambiarMano(v, "manoD", "manoPensar", e, -50, 30);
        v.manoPensar.r += Math.sin(tau * Math.PI * 2 * 1.4) * 4 * env(tau, D, 0.5, 0.5);
        v.ojo.x += -2.2 * e;
        v.ojo.y += -2.2 * e;
        v.ojo.sy += -0.3 * e;
        v.torso.r += -3 * e;
        break;
      }
      case "respingo": {
        // Se despierta de golpe: ojo muy abierto, salto, manos arriba y la antena vibrando.
        const b = bump(tau / D);
        v.ojo.sx += 0.28 * b;
        v.ojo.sy += 0.28 * b;
        v.torso.y += -4 * b;
        v.torso.sy += 0.05 * b;
        v.manoI.y += -7 * b;
        v.manoD.y += -7 * b;
        v.manoI.r += 25 * b;
        v.manoD.r += -25 * b;
        v.antena.r += 14 * Math.sin(tau * Math.PI * 2 * 5) * (1 - tau / D);
        break;
      }
      case "tamborilear": {
        // Impaciente: tamborilea los dedos y se los mira.
        const e = env(tau, D, 0.3, 0.3);
        v.manoD.x += -7 * e;
        v.manoD.y += -5 * e;
        v.manoD.r += (30 + Math.sin(tau * Math.PI * 2 * 6) * 9) * e;
        v.ojo.x += 1.8 * e;
        v.ojo.y += 2 * e;
        v.torso.r += 2 * e;
        break;
      }
      case "volar": {
        // En vuelo, manos y antena se quedan atrás y el ojo mira hacia donde va.
        const dir = a.o.dir || 1;
        const e = env(tau, D, 0.15, 0.25);
        v.manoI.y += 3.5 * e;
        v.manoD.y += 3.5 * e;
        v.manoI.r += -dir * 18 * e;
        v.manoD.r += -dir * 18 * e;
        v.antena.r += -dir * 12 * e;
        v.ojo.x += dir * 3 * e;
        break;
      }
      default:
    }
  }

  aplicar(v, dt = 0) {
    const k = this.t / 100;
    const fijo = this.parado;
    // Muelles: el cuerpo, el ojo, la antena y cada mano (las que no se ven van directas a su sitio).
    for (const c of ["x", "y", "r"]) v.torso[c] = this.muelle("torso" + c, v.torso[c], MUELLE.torso, dt, fijo);
    for (const c of ["x", "y"]) v.ojo[c] = this.muelle("ojo" + c, v.ojo[c], MUELLE.ojo, dt, fijo);
    v.antena.r = this.muelle("antena", v.antena.r, MUELLE.antena, dt, fijo);
    for (const n of MANOS) {
      const m = v[n];
      const saltar = fijo || m.o === 0 || !this.vistaAntes[n];
      for (const c of ["x", "y", "r"]) m[c] = this.muelle(n + c, m[c], MUELLE.mano, dt, saltar);
      this.vistaAntes[n] = m.o !== 0;
    }
    const der = this.parado ? { x: 0, y: 0 } : this.deriva || { x: 0, y: 0 };
    const calma = 1 - 0.7 * (this.sueno || 0);
    const d = { x: der.x * calma, y: der.y * calma + (this.parado ? 0 : this.inercia.y * 0.45) };
    this.rig.style.transform = `translate(${(d.x * k).toFixed(2)}px, ${(d.y * k).toFixed(2)}px)`;
    this.lupa.style.translate = `${(d.x * k).toFixed(2)}px ${(d.y * k).toFixed(2)}px`;
    const tr = (o) => `translate(${(o.x * k).toFixed(2)}px, ${(o.y * k).toFixed(2)}px) rotate(${o.r.toFixed(2)}deg)`;
    const g = v.giro;
    this.el.torso.style.transform = `${tr(v.torso)} scale(${(v.torso.sx * g).toFixed(3)}, ${v.torso.sy.toFixed(3)})`;
    // De espaldas: se oculta la cara y, si existe el dibujo de la espalda, se cambia el cuerpo por él (girado al revés
    // para que, con el cuerpo en espejo, la antena quede donde toca).
    const cara = g < 0 ? "0" : "1";
    if (this.el.pantalla.style.opacity !== cara) {
      this.el.pantalla.style.opacity = cara;
      this.el.brillo.style.opacity = cara;
      if (this.el.espalda) {
        const espalda = g < 0 ? "1" : "0";
        this.el.espalda.style.opacity = espalda;
        for (const n of ["cuerpo", "antena", "chispasAntena"]) this.el[n].style.opacity = cara;
        this.el.espalda.style.transform = "scaleX(-1)";
      }
    }
    // Párpado: lo que antes aplastaba el ojo ahora baja el párpado sobre la pantalla (parpadear, entornar, dormir).
    const cierre = Math.max(0, Math.min(1, 1 - v.ojo.sy));
    this.el.parpado.style.transform = `translateY(${(-101 + cierre * 101).toFixed(1)}%)`;
    const syOjo = v.ojo.sy >= 1 ? v.ojo.sy : 1 - cierre * 0.12;
    this.el.ojo.style.transform = `${tr(v.ojo)} scale(${v.ojo.sx.toFixed(3)}, ${syOjo.toFixed(3)})`;
    const giro = `rotate(${v.antena.r.toFixed(2)}deg)`;
    this.el.antena.style.transform = giro;
    this.el.chispasAntena.style.transform = giro;
    this.el.boca.style.opacity = String(g < 0 ? 0 : v.boca.o);
    for (const n of MANOS) {
      const m = v[n];
      const s = this.el[n].style;
      s.opacity = String(m.o);
      if (m.o === 0) continue;
      if (g !== 1) m.x += (this.piv[n][0] - 50) * (g - 1);   // al girar, las manos pasan al otro lado
      s.transform = `${tr(m)} scale(${(m.s * g).toFixed(3)}, ${m.s.toFixed(3)})`;
      s.zIndex = String(m.z);
    }
  }
}
