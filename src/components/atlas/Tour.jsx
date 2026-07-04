import { useEffect, useRef, useState } from "react";
import { HABITATS } from "../../data/species.js";
import { eeSound } from "../../lib/audio.js";
import { fmtYear } from "../../lib/format.js";
import { Icons } from "../icons.jsx";

const DWELL_MS = 10500;

export default function Tour({ active, species, globeRef, onExit, setHabitatTheme }) {
  const [idx, setIdx] = useState(0);
  const [captionVisible, setCaptionVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (active) setIdx(0);
  }, [active]);

  useEffect(() => {
    if (!active || !species[idx]) return;
    const s = species[idx];
    const g = globeRef.current;
    if (g) {
      g.controls().autoRotate = false;
      g.pointOfView({ lat: s.lat, lng: s.lng, altitude: 1.6 }, 3000);
    }
    setHabitatTheme(s.habitat);
    eeSound.tourTick();
    setCaptionVisible(false);
    const t1 = setTimeout(() => setCaptionVisible(true), 200);
    timerRef.current = setTimeout(() => {
      setIdx((i) => (i + 1) % species.length);
    }, DWELL_MS);
    return () => { clearTimeout(timerRef.current); clearTimeout(t1); };
  }, [active, idx, species]);

  if (!active) return null;
  const s = species[idx];
  if (!s) return null;
  const h = HABITATS[s.habitat];

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Cinematic letterbox */}
      <div className="absolute top-0 left-0 right-0 h-[12vh]" style={{ background: "linear-gradient(180deg, #000 10%, transparent)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-[26vh]" style={{ background: "linear-gradient(0deg, #000 30%, transparent)" }} />

      {/* Top bar */}
      <div className="absolute top-4 sm:top-6 left-0 right-0 flex items-center justify-between px-4 sm:px-8 pointer-events-auto">
        <div className="flex items-center gap-3 mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-white/70">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: h.color, boxShadow: `0 0 12px ${h.color}` }} />
          <span className="hidden sm:inline">Museum Tour ·</span> {String(idx + 1).padStart(2, "0")} / {String(species.length).padStart(2, "0")}
        </div>
        <button onClick={() => { eeSound.click(); onExit(); }}
          className="glass rounded-full h-9 px-4 flex items-center gap-2 text-xs pointer-events-auto hover:bg-white/10">
          <Icons.X size={13} /> End tour
        </button>
      </div>

      {/* Caption */}
      <div key={s.id} className={`absolute left-0 right-0 bottom-[10vh] flex justify-center px-6 sm:px-12 ${captionVisible ? "caption-enter" : "opacity-0"}`}>
        <div className="max-w-[900px] text-center">
          <div className="mono text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: h.color }}>
            {h.label} · {fmtYear(s.yearExtinct || 2026)}
          </div>
          <div className="serif leading-[1.05] tracking-tight" style={{ fontSize: "clamp(36px, 6vw, 60px)" }}>
            "{s.name}"
          </div>
          <div className="serif italic text-white/50 text-lg sm:text-xl mt-2">{s.scientific}</div>
          <div className="serif text-lg sm:text-2xl text-white/80 leading-[1.35] mt-4 sm:mt-6 hidden sm:block" style={{ textWrap: "balance" }}>
            {s.description}
          </div>
        </div>
      </div>

      {/* Progress ticks */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-auto">
        {species.map((_, i) => (
          <button key={i} onClick={() => { eeSound.click(); setIdx(i); }}
            className="h-1 rounded-full transition-all" aria-label={`Go to stop ${i + 1}`}
            style={{
              width: i === idx ? 32 : 8,
              background: i === idx ? h.color : "rgba(255,255,255,0.25)",
            }} />
        ))}
      </div>
    </div>
  );
}
