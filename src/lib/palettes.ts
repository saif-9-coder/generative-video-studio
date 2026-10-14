export interface Palette {
  id: string;
  name: string;
  stops: string[]; // 5 hex colors
}

export const PALETTES: Palette[] = [
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    stops: ["#0b0b12", "#1d1b4b", "#7c6cf0", "#22d3ee", "#f8f7ff"],
  },
  {
    id: "luxury-gold",
    name: "Luxury Gold",
    stops: ["#0d0a05", "#3a2a12", "#b98a2f", "#f5d576", "#fff8e1"],
  },
  {
    id: "deep-oceanic",
    name: "Deep Oceanic",
    stops: ["#020d18", "#062a44", "#0b5d7a", "#1fb6a6", "#d8fbff"],
  },
  {
    id: "pastel-smoke",
    name: "Pastel Smoke",
    stops: ["#2b2430", "#6b5b7a", "#b392ac", "#f2c6c2", "#fdf6f0"],
  },
  {
    id: "solar-flare",
    name: "Solar Flare",
    stops: ["#120302", "#4a0e04", "#c33d0e", "#ff9a3d", "#fff3d6"],
  },
  {
    id: "mono-ink",
    name: "Mono Ink",
    stops: ["#000000", "#1c1c22", "#4a4a55", "#9a9aa5", "#ffffff"],
  },
];

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** "#7c6cf0" -> [0.486, 0.424, 0.941] (linear 0..1, matches GLSL vec3). */
export function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function isValidHex(v: string): boolean {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v.trim());
}
