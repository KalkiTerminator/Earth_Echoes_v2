import { useEffect, useRef, useState } from "react";
import { HABITATS } from "../../data/species.js";
import { eeSound } from "../../lib/audio.js";
import { fmtYear, MIN_YEAR, MAX_YEAR } from "../../lib/format.js";
import { Icons } from "../icons.jsx";

const TICKS = [
  { y: -10000, label: "10,000 BCE" },
  { y: -5000, label: "5,000 BCE" },
  { y: 1600, label: "1600s" },
  { y: 1900, label: "1900s" },
  { y: 1950, label: "1950s" },
  { y: 2026, label: "Present" },
];

export default function TimeMachine({ year, setYear, accent, species = [], onQuiz }) {
  const [playing, setPlaying] = useState(false);
  const raf = useRef();

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const loop = (t) => {
      const dt = t - last;
      last = t;
      setYear((y) => {
        const step = Math.max(1, Math.round(dt * 0.05 * (y < 0 ? 30 : 2))); // faster through BCE
        const next = y + step;
        if (next >= MAX_YEAR) { setPlaying(false); return MAX_YEAR; }
        return next;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, setYear]);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 z-30 pointer-events-auto w-[calc(100vw-2rem)] sm:w-[min(820px,70vw)]">
      <div className="glass rounded-2xl px-4 sm:px-6 pt-4 pb-5">
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <Icons.History size={14} className="text-white/60 shrink-0" />
            <div className="mono text-[11px] uppercase tracking-[0.22em] text-white/50 whitespace-nowrap">Time Machine</div>
            {onQuiz && (
              <button onClick={() => { eeSound.click(); onQuiz(); }}
                onMouseEnter={() => eeSound.hover()}
                className="mono text-[9px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full border border-white/10 text-white/45 hover:text-white hover:border-white/30 transition hidden sm:block whitespace-nowrap">
                Play: guess the year
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="serif text-2xl sm:text-3xl tabular-nums whitespace-nowrap" style={{ color: accent || "#f5f5f4" }}>
              {fmtYear(year)}
            </div>
            <button
              onClick={() => { eeSound.click(); setPlaying(!playing); }}
              onMouseEnter={() => eeSound.hover()}
              aria-label={playing ? "Pause time" : "Play through time"}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-white/15 hover:bg-white/10 transition shrink-0">
              {playing ? <Icons.Pause size={13} /> : <Icons.Play size={13} />}
            </button>
          </div>
        </div>
        <div className="mt-4 relative">
          <input
            type="range" className="ee-range"
            min={MIN_YEAR} max={MAX_YEAR} step="1" value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            style={{ "--accent": accent || "#34d399" }}
            aria-label="Timeline year"
          />
          {/* Extinction event markers */}
          {species
            .filter((s) => s.yearExtinct !== null && s.yearExtinct >= MIN_YEAR && s.yearExtinct <= MAX_YEAR)
            .map((s) => {
              const pct = ((s.yearExtinct - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
              const h = HABITATS[s.habitat];
              const lost = year > s.yearExtinct;
              return (
                <div key={s.id} title={`${s.name} · ${fmtYear(s.yearExtinct)}`}
                  className="absolute -translate-x-1/2 rounded-full pointer-events-auto cursor-help transition-all duration-500"
                  style={{
                    left: `${pct}%`, top: "7px", width: 4, height: 4,
                    background: lost ? "rgba(255,255,255,0.25)" : h.color,
                    boxShadow: lost ? "none" : `0 0 8px ${h.color}`,
                  }} />
              );
            })}
          <div className="mt-3 flex justify-between mono text-[9px] sm:text-[10px] text-white/40">
            {TICKS.map((t, i) => (
              <button key={t.y} onClick={() => setYear(t.y)}
                onMouseEnter={() => eeSound.hover()}
                className={`hover:text-white/80 transition ${i > 0 && i < TICKS.length - 1 ? "hidden sm:block" : ""}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
