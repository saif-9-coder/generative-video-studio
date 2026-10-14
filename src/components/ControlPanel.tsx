"use client";

import { useMemo, useState } from "react";
import { Dices, Save, FolderOpen, Trash2, SlidersHorizontal, Palette as PaletteIcon } from "lucide-react";
import { getEngine, type StudioSettings } from "../engines/registry";
import { PALETTES, isValidHex } from "../lib/palettes";
import { loadPresets, savePreset, deletePreset, type ExportFormat } from "../lib/presets";
import { randomizeSettings } from "../lib/randomizer";

interface ControlPanelProps {
  settings: StudioSettings;
  format: ExportFormat;
  onSettingsChange: (patch: Partial<StudioSettings>) => void;
  onFormatChange: (f: ExportFormat) => void;
}

const DURATIONS = [10, 15, 20, 30];
const FPS_OPTIONS = [30, 60];

export default function ControlPanel({ settings, format, onSettingsChange, onFormatChange }: ControlPanelProps) {
  const engine = getEngine(settings.engineId);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState(loadPresets);
  const [showPresets, setShowPresets] = useState(false);

  const setParam = (key: string, value: number) => {
    onSettingsChange({ params: { ...settings.params, [key]: value } });
  };

  const setPaletteStop = (index: number, hex: string) => {
    const next = [...settings.palette];
    next[index] = hex;
    onSettingsChange({ palette: next });
  };

  const handleRandomize = () => {
    const next = randomizeSettings({
      engineId: settings.engineId,
      durationSec: settings.durationSec,
      fps: settings.fps,
    });
    onSettingsChange(next);
  };

  const handleSavePreset = () => {
    savePreset(presetName, settings, format);
    setPresetName("");
    setPresets(loadPresets());
  };

  const sliderFill = (v: number, min: number, max: number) =>
    ({ "--fill": `${((v - min) / (max - min)) * 100}%` }) as React.CSSProperties;

  const activePaletteId = useMemo(
    () => PALETTES.find((p) => p.stops.every((s, i) => s.toLowerCase() === settings.palette[i]?.toLowerCase()))?.id,
    [settings.palette]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Engine params */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
          <SlidersHorizontal size={14} className="text-studio-accent" />
          {engine.name} Parameters
        </h3>
        <div className="flex flex-col gap-4">
          {engine.paramSchema.map((entry) => {
            if (entry.type !== "slider") return null;
            const min = entry.min ?? 0;
            const max = entry.max ?? 1;
            const value = settings.params[entry.key] ?? Number(entry.default);
            return (
              <label key={entry.key} className="block">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400">{entry.label}</span>
                  <span className="font-mono text-zinc-200">{value}</span>
                </div>
                <input
                  type="range"
                  className="studio-slider w-full"
                  style={sliderFill(value, min, max)}
                  min={min}
                  max={max}
                  step={entry.step ?? 0.05}
                  value={value}
                  onChange={(e) => setParam(entry.key, Number(e.target.value))}
                />
              </label>
            );
          })}
        </div>
        <p className="text-[11px] text-zinc-600 mt-3 leading-relaxed">{engine.description}</p>
      </section>

      {/* Palette */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
          <PaletteIcon size={14} className="text-studio-accent" />
          Palette
        </h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              title={p.name}
              onClick={() => onSettingsChange({ palette: [...p.stops] })}
              className={`rounded-lg border p-1.5 transition-all ${
                activePaletteId === p.id ? "border-studio-accent shadow-[0_0_12px_rgba(124,108,240,0.4)]" : "border-studio-border hover:border-zinc-600"
              }`}
            >
              <div className="flex h-6 rounded overflow-hidden">
                {p.stops.map((s) => (
                  <div key={s} className="flex-1" style={{ background: s }} />
                ))}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 truncate">{p.name}</div>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {settings.palette.map((hex, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                className="studio-color w-9 h-9 shrink-0"
                value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#000000"}
                onChange={(e) => setPaletteStop(i, e.target.value)}
              />
              <input
                type="text"
                value={hex}
                spellCheck={false}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isValidHex(v) || v === "#" || /^#[0-9a-fA-F]{0,6}$/.test(v)) setPaletteStop(i, v);
                }}
                className="flex-1 bg-studio-panel2 border border-studio-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-300 focus:border-studio-accent focus:outline-none"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Animation */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Animation</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-zinc-400">Loop duration</span>
            <select
              value={settings.durationSec}
              onChange={(e) => onSettingsChange({ durationSec: Number(e.target.value) })}
              className="mt-1 w-full bg-studio-panel2 border border-studio-border rounded-lg px-2.5 py-2 text-sm text-zinc-200 focus:border-studio-accent focus:outline-none"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d}s seamless loop</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400">Frame rate</span>
            <select
              value={settings.fps}
              onChange={(e) => onSettingsChange({ fps: Number(e.target.value) })}
              className="mt-1 w-full bg-studio-panel2 border border-studio-border rounded-lg px-2.5 py-2 text-sm text-zinc-200 focus:border-studio-accent focus:outline-none"
            >
              {FPS_OPTIONS.map((f) => (
                <option key={f} value={f}>{f} fps</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block mt-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-zinc-400">Seed</span>
            <span className="font-mono text-zinc-200">{settings.seed}</span>
          </div>
          <input
            type="range"
            className="studio-slider w-full"
            style={sliderFill(settings.seed, 1, 999999999)}
            min={1}
            max={999999999}
            step={1}
            value={settings.seed}
            onChange={(e) => onSettingsChange({ seed: Number(e.target.value) })}
          />
        </label>
      </section>

      {/* Randomizer */}
      <button
        onClick={handleRandomize}
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-studio-accent to-studio-accent2 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        <Dices size={16} />
        Randomize — new unique artwork
      </button>

      {/* Presets */}
      <section>
        <button
          onClick={() => setShowPresets((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-2"
        >
          <FolderOpen size={14} className="text-studio-accent" />
          Presets {showPresets ? "▾" : "▸"}
        </button>
        {showPresets && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Preset name…"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="flex-1 bg-studio-panel2 border border-studio-border rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:border-studio-accent focus:outline-none"
              />
              <button
                onClick={handleSavePreset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-studio-panel2 border border-studio-border text-xs text-zinc-300 hover:border-studio-accent transition-colors"
              >
                <Save size={13} /> Save
              </button>
            </div>
            <div className="max-h-44 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 bg-studio-panel2 border border-studio-border rounded-lg px-2.5 py-2"
                >
                  <button
                    onClick={() => {
                      onSettingsChange(p.settings);
                      onFormatChange(p.format);
                    }}
                    className="flex-1 text-left text-xs text-zinc-300 hover:text-white truncate"
                    title={`Load "${p.name}" (${p.settings.engineId}, ${p.format})`}
                  >
                    {p.name}
                    <span className="text-zinc-600 ml-1.5">{p.builtin ? "built-in" : "custom"}</span>
                  </button>
                  {!p.builtin && (
                    <button
                      onClick={() => {
                        deletePreset(p.id);
                        setPresets(loadPresets());
                      }}
                      className="text-zinc-600 hover:text-red-400"
                      title="Delete preset"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
