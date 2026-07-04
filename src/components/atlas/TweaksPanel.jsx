import { eeSound } from "../../lib/audio.js";
import { Icons } from "../icons.jsx";

const ACCENTS = [
  { id: "habitat", color: "#888", label: "Habitat" },
  { id: "#34d399", color: "#34d399", label: "Emerald" },
  { id: "#22d3ee", color: "#22d3ee", label: "Cyan" },
  { id: "#cbd5e1", color: "#cbd5e1", label: "Ice" },
  { id: "#f59e0b", color: "#f59e0b", label: "Amber" },
  { id: "#a78bfa", color: "#a78bfa", label: "Violet" },
  { id: "#fb7185", color: "#fb7185", label: "Rose" },
];

function Row({ label, children }) {
  return (
    <div className="mb-5">
      <div className="mono text-[10px] uppercase tracking-[0.22em] text-white/50 mb-2">{label}</div>
      {children}
    </div>
  );
}

function Choice({ value, current, onClick, children }) {
  return (
    <button onClick={() => { eeSound.click(); onClick(value); }}
      onMouseEnter={() => eeSound.hover()}
      className={`flex-1 h-9 rounded-lg text-xs transition border ${current === value ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"}`}>
      {children}
    </button>
  );
}

export default function TweaksPanel({ open, onClose, config, setConfig }) {
  if (!open) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[55] w-[340px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] overflow-y-auto ee-scroll glass-solid rounded-2xl p-5 pointer-events-auto"
      style={{ animation: "tweaksIn .3s ease-out both" }}>
      <style>{`@keyframes tweaksIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <div className="serif text-2xl">Tweaks</div>
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-white/40">Live</div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center" aria-label="Close tweaks">
          <Icons.X size={14} />
        </button>
      </div>
      <div className="hr-line mb-5" />

      <Row label="Theme">
        <div className="flex gap-2">
          <Choice value="cinematic" current={config.theme} onClick={(v) => setConfig({ ...config, theme: v })}>Cinematic</Choice>
          <Choice value="editorial" current={config.theme} onClick={(v) => setConfig({ ...config, theme: v })}>Editorial</Choice>
          <Choice value="hud" current={config.theme} onClick={(v) => setConfig({ ...config, theme: v })}>HUD</Choice>
        </div>
      </Row>

      <Row label="Globe style">
        <div className="flex gap-2">
          <Choice value="photoreal" current={config.globeStyle} onClick={(v) => setConfig({ ...config, globeStyle: v })}>Photoreal</Choice>
          <Choice value="stylized" current={config.globeStyle} onClick={(v) => setConfig({ ...config, globeStyle: v })}>Stylized</Choice>
          <Choice value="wireframe" current={config.globeStyle} onClick={(v) => setConfig({ ...config, globeStyle: v })}>Wireframe</Choice>
        </div>
      </Row>

      <Row label="Pin style">
        <div className="flex gap-2">
          <Choice value="portrait" current={config.pinStyle} onClick={(v) => setConfig({ ...config, pinStyle: v })}>Portrait</Choice>
          <Choice value="dot" current={config.pinStyle} onClick={(v) => setConfig({ ...config, pinStyle: v })}>Minimal dot</Choice>
          <Choice value="card" current={config.pinStyle} onClick={(v) => setConfig({ ...config, pinStyle: v })}>Labeled card</Choice>
        </div>
      </Row>

      <Row label="Density">
        <div className="flex gap-2">
          <Choice value="all" current={config.density} onClick={(v) => setConfig({ ...config, density: v })}>Show all pins</Choice>
          <Choice value="filtered" current={config.density} onClick={(v) => setConfig({ ...config, density: v })}>Current habitat only</Choice>
        </div>
      </Row>

      <Row label="Pin lens">
        <div className="flex gap-2">
          <Choice value="habitat" current={config.lens || "habitat"} onClick={(v) => setConfig({ ...config, lens: v })}>Habitat</Choice>
          <Choice value="threat" current={config.lens || "habitat"} onClick={(v) => setConfig({ ...config, lens: v })}>Threat</Choice>
        </div>
      </Row>

      <Row label="Ambient soundscape">
        <div className="flex gap-2">
          <Choice value="on" current={config.ambience === false ? "off" : "on"} onClick={() => setConfig({ ...config, ambience: true })}>On</Choice>
          <Choice value="off" current={config.ambience === false ? "off" : "on"} onClick={() => setConfig({ ...config, ambience: false })}>Off</Choice>
        </div>
      </Row>

      <Row label="Accent override">
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button key={a.id}
              onClick={() => { eeSound.click(); setConfig({ ...config, accent: a.id }); }}
              onMouseEnter={() => eeSound.hover()}
              title={a.label} aria-label={`Accent: ${a.label}`}
              className={`w-8 h-8 rounded-full transition ${config.accent === a.id ? "ring-2 ring-white ring-offset-2 ring-offset-black" : "hover:scale-110"}`}
              style={a.id === "habitat" ? {
                background: "conic-gradient(from 0deg, #22d3ee, #34d399, #cbd5e1, #f59e0b, #22d3ee)",
              } : { background: a.color, boxShadow: `0 0 12px ${a.color}66` }}
            />
          ))}
        </div>
      </Row>

      <div className="hr-line my-5" />
      <div className="mono text-[10px] text-white/40 leading-relaxed">
        Changes persist on this device. All tweaks preview live on the globe.
      </div>
    </div>
  );
}
