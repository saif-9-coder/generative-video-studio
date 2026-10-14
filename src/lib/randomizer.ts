import { ENGINES, getEngine, type StudioSettings } from "../engines/registry";
import { PALETTES } from "./palettes";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function roundTo(v: number, step: number): number {
  const r = Math.round(v / step) * step;
  // avoid float dust like 0.30000000000000004
  const decimals = (String(step).split(".")[1] || "").length;
  return Number(r.toFixed(decimals));
}

/**
 * Produce a completely unique configuration: random engine, seed,
 * palette and every parameter jittered inside its schema range.
 */
export function randomizeSettings(base?: Partial<StudioSettings>): StudioSettings {
  const engine = getEngine(base?.engineId ?? pick(ENGINES).id);
  const params: Record<string, number> = {};
  for (const entry of engine.paramSchema) {
    if (entry.type !== "slider" || entry.min === undefined || entry.max === undefined) {
      params[entry.key] = Number(entry.default);
      continue;
    }
    // Bias toward the middle 70% so results stay attractive, not extreme.
    const lo = entry.min + (entry.max - entry.min) * 0.15;
    const hi = entry.max - (entry.max - entry.min) * 0.15;
    params[entry.key] = roundTo(rand(lo, hi), entry.step ?? 0.05);
  }
  return {
    engineId: engine.id,
    seed: Math.floor(rand(1, 999_999_999)),
    params,
    palette: [...pick(PALETTES).stops],
    durationSec: base?.durationSec ?? pick([10, 15, 20, 30] as const),
    fps: base?.fps ?? pick([30, 60] as const),
  };
}
