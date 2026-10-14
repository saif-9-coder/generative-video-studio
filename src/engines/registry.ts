import { fluidEngine } from "./fluid";
import { flowfieldEngine } from "./flowfield";
import { neonwavesEngine } from "./neonwaves";
import { nebulaEngine } from "./nebula";
import { fireEngine } from "./fire";
import { inkwaterEngine } from "./inkwater";
import { marbleEngine } from "./marble";
import { iridescentEngine } from "./iridescent";
import { topoEngine } from "./topo";
import { lissajousEngine } from "./lissajous";
import { spirographEngine } from "./spirograph";
import { waveformEngine } from "./waveform";
import { hudEngine } from "./hud";
import { plexusEngine } from "./plexus";
import { matrixEngine } from "./matrix";
import { synthwaveEngine } from "./synthwave";
import { circuitEngine } from "./circuit";
import { bokehEngine } from "./bokeh";
import { vortexEngine } from "./vortex";
import { kaleidoscopeEngine } from "./kaleidoscope";
import { lightleakEngine } from "./lightleak";
import { glitchEngine } from "./glitch";
import { fractaltunnelEngine } from "./fractaltunnel";
import { crystalsEngine } from "./crystals";
import { morphsolidsEngine } from "./morphsolids";
import { metaballsEngine } from "./metaballs";

export type EngineCategory = "fluid" | "lines" | "tech" | "fx" | "geo3d";

export interface CategoryInfo {
  id: EngineCategory;
  label: string;
  /** lucide-react icon name (resolved by the UI). */
  icon: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "fluid", label: "Fluid & Smoke", icon: "Droplets" },
  { id: "lines", label: "Lines & Flow", icon: "Spline" },
  { id: "tech", label: "Cyber & Tech", icon: "Cpu" },
  { id: "fx", label: "Particles & FX", icon: "Sparkles" },
  { id: "geo3d", label: "3D Geometry", icon: "Box" },
];

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
  category: EngineCategory;
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

function withCategory(
  engine: Omit<EngineDefinition, "category">,
  category: EngineCategory
): EngineDefinition {
  return { ...engine, category };
}

export const ENGINES: EngineDefinition[] = [
  // Fluid & Smoke
  withCategory(fluidEngine, "fluid"),
  withCategory(nebulaEngine, "fluid"),
  withCategory(fireEngine, "fluid"),
  withCategory(inkwaterEngine, "fluid"),
  withCategory(marbleEngine, "fluid"),
  withCategory(iridescentEngine, "fluid"),
  // Lines & Flow
  withCategory(flowfieldEngine, "lines"),
  withCategory(topoEngine, "lines"),
  withCategory(lissajousEngine, "lines"),
  withCategory(spirographEngine, "lines"),
  withCategory(waveformEngine, "lines"),
  // Cyber & Tech
  withCategory(neonwavesEngine, "tech"),
  withCategory(hudEngine, "tech"),
  withCategory(plexusEngine, "tech"),
  withCategory(matrixEngine, "tech"),
  withCategory(synthwaveEngine, "tech"),
  withCategory(circuitEngine, "tech"),
  // Particles & FX
  withCategory(bokehEngine, "fx"),
  withCategory(vortexEngine, "fx"),
  withCategory(kaleidoscopeEngine, "fx"),
  withCategory(lightleakEngine, "fx"),
  withCategory(glitchEngine, "fx"),
  // 3D Geometry
  withCategory(fractaltunnelEngine, "geo3d"),
  withCategory(crystalsEngine, "geo3d"),
  withCategory(morphsolidsEngine, "geo3d"),
  withCategory(metaballsEngine, "geo3d"),
];

export function getEngine(id: string): EngineDefinition {
  const e = ENGINES.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown engine: ${id}`);
  return e;
}

export function enginesByCategory(category: EngineCategory): EngineDefinition[] {
  return ENGINES.filter((e) => e.category === category);
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
