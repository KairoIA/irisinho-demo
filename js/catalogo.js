// Catálogo de opciones de iriscopyshop.app (copia del objeto `st` de su web, 23-oct-2026).
// Lo usan la página de la demo y la API (lib/comun.js) para no tener dos copias.

export const CATALOGO = {
  paperSize: [
    { name: "A3", code: "A3", description: "29.7cm x 42cm" },
    { name: "A4", code: "A4", description: "21cm x 29.7cm", default: true },
  ],
  paperType: [
    { name: "Estándar", code: "normal", description: "80 gr", default: true },
    { name: "Premium", code: "premium", description: "90 gr" },
    { name: "Cartulina", code: "cartulina", description: "180 gr (Blanca)" },
    { name: "Fotográfico", code: "fotografico", description: "250 gr (Brillo)" },
  ],
  printType: [
    { name: "B/N", code: "blanco-negro", description: "Escala de grises", default: true },
    { name: "Color Lowcost", code: "color-envio", description: "Tarifa especial para envíos" },
    { name: "Color CMYK", code: "color", description: "Color CMYK" },
    { name: "Color PRO", code: "color-pro", description: "Full color" },
  ],
  printForm: [
    { name: "Una cara", code: "una-cara", description: "Por una cara del papel", factor: 1, default: true },
    { name: "Doble cara", code: "doble-cara", description: "Por ambas caras del papel", factor: 0.5 },
  ],
  pagesPerSide: [
    { name: "1 página", code: "1_vertical", description: "Por cara", factor: 1, default: true },
    { name: "1 página", code: "1_horizontal", description: "Por cara", factor: 1 },
    { name: "2 páginas", code: "2_horizontal", description: "Por cara", factor: 0.5 },
    { name: "2 páginas", code: "2_vertical", description: "Por cara", factor: 0.5 },
    { name: "4 páginas", code: "4_horizontal", description: "Por cara", factor: 0.25 },
  ],
  orientation: [
    { name: "Vertical. Derecha-Izquierda", code: "vertical-derecha-izquierda", default: true },
    { name: "Vertical. Abajo-Arriba", code: "vertical-abajo-arriba" },
    { name: "Horizontal. Abajo-Arriba", code: "horizontal-abajo-arriba" },
    { name: "Horizontal. Derecha-Izquierda", code: "horizontal-derecha-izquierda" },
  ],
  finishType: [
    { name: "Sin acabado", code: "sin-acabado", description: "Folios sueltos", default: true },
    { name: "Grapado", code: "grapado", description: "En esquina" },
    { name: "Dos Taladros", code: "dos-taladros" },
    { name: "Plastificado", code: "plastificado" },
    { name: "Encuadernado", code: "encuadernado", description: "En espiral" },
    { name: "Cuatro Taladros", code: "cuatro-taladros" },
  ],
  boundTypes: [
    { name: "Individualmente", code: "individual", description: "Por separado", default: true },
    { name: "Agrupados", code: "agrupados", description: "Todos en uno" },
  ],
  boundPages: [
    { name: "No", code: "no", default: true },
    { name: "Por delante", code: "delante" },
    { name: "Por detrás", code: "detras" },
    { name: "Ambos", code: "ambos" },
  ],
};

// Imágenes de orientación y páginas por cara (las mismas de su web).
export const IMAGENES = {
  "vertical-derecha-izquierda": "o_vdi", "vertical-abajo-arriba": "o_vaa",
  "horizontal-abajo-arriba": "o_haa", "horizontal-derecha-izquierda": "o_hdi",
  "1_vertical": "ppc_v_1", "2_vertical": "ppc_v_2", "1_horizontal": "ppc_h_1", "2_horizontal": "ppc_h_2", "4_horizontal": "ppc_h_4",
};

export const INFO_GRAPADO = "Nuestras máquinas grapan hasta 50 folios, para archivos más grandes esta opción no está disponible";

export const COLORES_FOLIO = [
  { name: "Blanco", code: "white", color: "#ffffff", priceLabel: "+0.03€" },
  { name: "Azul pastel", code: "blue", color: "#9fd8e6", priceLabel: "+0.05€" },
  { name: "Verde pastel", code: "green", color: "#b6ecda", priceLabel: "+0.05€" },
  { name: "Amarillo pastel", code: "yellow", color: "#fdfd96", priceLabel: "+0.05€" },
  { name: "Rosa pastel", code: "red", color: "#ffe5ec", priceLabel: "+0.05€" },
];
