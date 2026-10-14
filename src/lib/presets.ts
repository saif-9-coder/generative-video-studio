import type { StudioSettings } from "../engines/registry";
import { getPalette } from "./palettes";

export type ExportFormat = "mp4" | "prores";

export interface Preset {
  id: string;
  name: string;
  builtin?: boolean;
  settings: StudioSettings;
  format: ExportFormat;
}

const CUSTOM_KEY = "gvs.customPresets.v1";

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: "builtin-abyss",
    name: "Abyssal Drift",
    builtin: true,
    format: "mp4",
    settings: {
      engineId: "fluid",
      seed: 90210,
      params: { scale: 2.6, warp: 1.6, turb: 2.4, speed: 0.7, contrast: 1.2 },
      palette: getPalette("deep-oceanic").stops,
      durationSec: 15,
      fps: 30,
    },
  },
  {
    id: "builtin-neon-grid",
    name: "Neon Gridline",
    builtin: true,
    format: "mp4",
    settings: {
      engineId: "neonwaves",
      seed: 424242,
      params: { layers: 6, freq: 3.6, amp: 0.3, speed: 1.4, glow: 1.2 },
      palette: getPalette("cyberpunk").stops,
      durationSec: 10,
      fps: 60,
    },
  },
  {
    id: "builtin-gold-sil",
    name: "Molten Gold Silk",
    builtin: true,
    format: "prores",
    settings: {
      engineId: "flowfield",
      seed: 777,
      params: { scale: 2.4, lines: 1.1, thick: 0.5, speed: 0.8, twist: 2.2 },
      palette: getPalette("luxury-gold").stops,
      durationSec: 20,
      fps: 30,
    },
  },
  {
    id: "builtin-solar-storm",
    name: "Solar Storm",
    builtin: true,
    format: "mp4",
    settings: {
      engineId: "nebula",
      seed: 314159,
      params: { scale: 1.6, density: 0.62, speed: 0.9, stars: 0.8 },
      palette: getPalette("solar-flare").stops,
      durationSec: 30,
      fps: 30,
    },
  },
  {
    id: "builtin-pastel-veil",
    name: "Pastel Veil",
    builtin: true,
    format: "mp4",
    settings: {
      engineId: "fluid",
      seed: 20240,
      params: { scale: 1.8, warp: 0.9, turb: 1.6, speed: 0.5, contrast: 1.0 },
      palette: getPalette("pastel-smoke").stops,
      durationSec: 10,
      fps: 30,
    },
  },
  {
    id: "builtin-ink-current",
    name: "Ink Current",
    builtin: true,
    format: "prores",
    settings: {
      engineId: "flowfield",
      seed: 60606,
      params: { scale: 4.2, lines: 2.2, thick: 0.4, speed: 1.3, twist: 1.2 },
      palette: getPalette("mono-ink").stops,
      durationSec: 15,
      fps: 60,
    },
  },
];

function readCustom(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as Preset[]) : [];
  } catch {
    return [];
  }
}

export function loadPresets(): Preset[] {
  return [...BUILTIN_PRESETS, ...readCustom()];
}

export function savePreset(name: string, settings: StudioSettings, format: ExportFormat): Preset {
  const preset: Preset = {
    id: `custom-${Date.now()}`,
    name: name.trim() || `Preset ${new Date().toLocaleString()}`,
    settings: JSON.parse(JSON.stringify(settings)),
    format,
  };
  const all = [...readCustom(), preset];
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(all));
  return preset;
}

export function deletePreset(id: string): void {
  const all = readCustom().filter((p) => p.id !== id);
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(all));
}
