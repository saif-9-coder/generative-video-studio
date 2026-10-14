import * as THREE from "three";
import { VERTEX_SHADER } from "../engines/shaders";
import { getEngine, type StudioSettings } from "../engines/registry";
import { hexToVec3 } from "../lib/palettes";

/**
 * Framework-free Three.js wrapper.
 *
 * - `renderFrame(loopAngle)` renders ONE deterministic frame for a given
 *   loop angle a in [0, 2PI). Export pipelines call this per frame index,
 *   so there is zero frame-drop by construction (offline, not realtime).
 * - `startPreview()` runs a realtime loop mapping wall-clock time onto the
 *   same loop angle for smooth editing.
 * - `setRenderSize(w, h)` switches between preview resolution and true 4K.
 */
export class StudioRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial | null = null;
  private mesh: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform> = {};
  private rafId = 0;
  private previewing = false;
  private previewStartMs = 0;
  private durationSec = 10;
  private engineId = "";
  private width = 0;
  private height = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // deterministic + fast; MSAA unnecessary for 4K export
      preserveDrawingBuffer: true, // required for toBlob() / screenshots
      powerPreference: "high-performance",
    });
    const geo = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geo, undefined as unknown as THREE.Material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /** (Re)build the shader program for an engine. Uniform values persist. */
  setEngine(engineId: string): void {
    if (engineId === this.engineId && this.material) return;
    const engine = getEngine(engineId);

    const uniforms: Record<string, THREE.IUniform> = {
      u_time: { value: 0 },
      u_res: { value: new THREE.Vector2(this.width || 2, this.height || 2) },
      u_seed: { value: 0 },
      u_palette: { value: [0, 1, 2, 3, 4].map(() => new THREE.Vector3(0, 0, 0)) },
    };
    for (const [key, v] of Object.entries(engine.defaultParams)) {
      uniforms[`u_p_${key}`] = { value: v };
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: engine.fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    if (this.material) this.material.dispose();
    this.material = material;
    this.mesh.material = material;
    this.uniforms = uniforms;
    this.engineId = engineId;
  }

  /** Push full settings (seed, params, palette, duration) into uniforms. */
  setParams(settings: StudioSettings): void {
    this.setEngine(settings.engineId);
    this.durationSec = settings.durationSec;
    const u = this.uniforms;
    if (u.u_seed) u.u_seed.value = settings.seed % 100000;
    if (u.u_palette) {
      const vecs = (u.u_palette.value as THREE.Vector3[]).slice(0, 5);
      settings.palette.slice(0, 5).forEach((hex, i) => {
        const [r, g, b] = hexToVec3(hex);
        if (vecs[i]) vecs[i].set(r, g, b);
      });
    }
    for (const [key, v] of Object.entries(settings.params)) {
      const uni = u[`u_p_${key}`];
      if (uni) uni.value = v;
    }
  }

  /**
   * Resize the drawing buffer. When `updateStyle` is true the canvas CSS
   * size follows (used by the headless page so screenshots are exact).
   */
  setRenderSize(w: number, h: number, updateStyle = false): void {
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, updateStyle);
    const res = this.uniforms.u_res?.value as THREE.Vector2 | undefined;
    if (res) res.set(w, h);
  }

  /** Render a single deterministic frame for loop angle `a` (radians). */
  renderFrame(loopAngle: number): void {
    if (!this.material) throw new Error("StudioRenderer: call setEngine() before renderFrame()");
    (this.uniforms.u_time as THREE.IUniform).value = loopAngle;
    this.renderer.render(this.scene, this.camera);
  }

  /** Realtime preview loop: wall-clock time -> loop angle. */
  startPreview(): void {
    if (this.previewing) return;
    this.previewing = true;
    this.previewStartMs = performance.now();
    const tick = (now: number) => {
      if (!this.previewing) return;
      const elapsed = (now - this.previewStartMs) / 1000;
      const a = ((elapsed % this.durationSec) / this.durationSec) * Math.PI * 2;
      this.renderFrame(a);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stopPreview(): void {
    this.previewing = false;
    cancelAnimationFrame(this.rafId);
  }

  get isPreviewing(): boolean {
    return this.previewing;
  }

  dispose(): void {
    this.stopPreview();
    this.mesh.geometry.dispose();
    this.material?.dispose();
    this.renderer.dispose();
  }
}
