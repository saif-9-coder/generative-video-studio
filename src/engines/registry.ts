import { fluidEngine } from "./fluid";
import { flowfieldEngine } from "./flowfield";
import { neonwavesEngine } from "./neonwaves";
import { nebulaEngine } from "./nebula";

export interface ParamSchemaEntry {
  key: string;
  label: string;
  type: "slider" | "color";
  min?: number;
  max?: number;
  step?: number;
  default: number | string;
}

export interface EngineDefinition {
  id: string;
  name: string;
  description: string;
  /** Complete fragment shader source (COMMON_GLSL already prepended). */
  fragmentShader: string;
  defaultParams: Record<string, number>;
  paramSchema: ParamSchemaEntry[];
}

/** Full render configuration shared by preview, client export and headless CLI. */
export interface StudioSettings {
  engineId: string;
  seed: number;
  params: Record<string, number>;
  /** Exactly 5 hex color stops, e.g. ["#0b0b12", ...]. */
  palette: string[];
  durationSec: number;
  fps: number;
}

export const ENGINES: EngineDefinition[] = [
  fluidEngine,
  flowfieldEngine,
  neonwavesEngine,
  nebulaEngine,
];

export function getEngine(id: string): EngineDefinition {
  const e = ENGINES.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown engine: ${id}`);
  return e;
}

export function defaultSettings(engineId = "fluid"): StudioSettings {
  const engine = getEngine(engineId);
  return {
    engineId,
    seed: 123456,
    params: { ...engine.defaultParams },
    palette: ["#0b0b12", "#1d1b4b", "#7c6cf0", "#22d3ee", "#f8f7ff"],
    durationSec: 10,
    fps: 30,
  };
}
