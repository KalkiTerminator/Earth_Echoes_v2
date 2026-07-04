import { HABITATS } from "../../data/species.js";
import { eeSound } from "../../lib/audio.js";

export default function SpeciesRail({ species, year, bookmarks, onSelect, filter }) {
  return (
    <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col gap-[6px] pointer-events-auto max-h-[68vh] overflow-y-auto no-scrollbar pr-2">
      <div className="mono text-[9px] uppercase tracking-[0.3em] text-white/30 mb-2">Index</div>
      {species.map((s, i) => {
        const h = HABITATS[s.habitat];
        const gone = s.yearExtinct !== null && year > s.yearExtinct;
        const dimmed = filter !== "all" && s.habitat !== filter;
        return (
          <button
            key={s.id}
            onClick={() => { eeSound.click(); onSelect(s); }}
            onMouseEnter={() => eeSound.hover()}
            className="group flex items-center gap-2.5 text-left transition-opacity duration-300"
            style={{ opacity: dimmed ? 0.25 : 1 }}>
            <span className="mono text-[9px] text-white/25 w-4 tabular-nums group-hover:text-white/60 transition">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="w-[5px] h-[5px] rounded-full shrink-0 transition-transform group-hover:scale-150"
              style={{ background: h.color, boxShadow: gone ? "none" : `0 0 8px ${h.color}88`, opacity: gone ? 0.35 : 1 }}></span>
            <span className={`mono text-[10px] uppercase tracking-[0.14em] whitespace-nowrap transition ${gone ? "line-through text-white/25 group-hover:text-white/50" : "text-white/55 group-hover:text-white"}`}>
              {s.name}
            </span>
            {bookmarks.includes(s.id) && (
              <span className="text-[8px]" style={{ color: h.color }}>◆</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
