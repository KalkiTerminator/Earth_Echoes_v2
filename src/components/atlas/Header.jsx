import { HABITATS } from "../../data/species.js";
import { eeSound } from "../../lib/audio.js";
import { Icons } from "../icons.jsx";
import SoundToggle from "./SoundToggle.jsx";

const TABS = [
  { id: "all", label: "All" },
  { id: "ocean", label: "Ocean" },
  { id: "forest", label: "Forest" },
  { id: "tundra", label: "Tundra" },
  { id: "other", label: "Other" },
];

export default function Header({
  filter, setFilter, onStartTour, soundOn, setSoundOn,
  onOpenStats, onOpenTweaks, onOpenPalette, onOpenCompare,
}) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pointer-events-none gap-3">
      <div className="pointer-events-auto min-w-0">
        <div className="serif text-2xl sm:text-3xl tracking-tight leading-none whitespace-nowrap">Earth's Echoes</div>
        <div className="mt-1 text-xs text-white/50 font-light hidden xl:block whitespace-nowrap">
          A living atlas of what we've lost, and what remains.
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto min-w-0 flex-wrap justify-end">
        <button onClick={onOpenStats}
          onMouseEnter={() => eeSound.hover()}
          className="glass rounded-full px-3 h-9 flex items-center gap-2 text-xs hover:bg-white/[0.04] transition whitespace-nowrap"
          title="Extinction Ledger">
          <Icons.Skull size={13} />
          <span className="hidden lg:inline">Ledger</span>
        </button>

        <div className="glass rounded-full p-1 hidden md:flex items-center">
          {TABS.map((t) => {
            const active = filter === t.id;
            const color = t.id === "all" ? "#f5f5f4" : HABITATS[t.id]?.color;
            return (
              <button key={t.id}
                onClick={() => { eeSound.click(); setFilter(t.id); }}
                onMouseEnter={() => eeSound.hover()}
                className={`relative h-7 px-3 rounded-full text-xs transition ${active ? "text-black" : "text-white/70 hover:text-white"}`}
                style={active ? { background: color, boxShadow: `0 0 16px ${color}66` } : {}}>
                {t.label}
              </button>
            );
          })}
        </div>

        <button onClick={() => { eeSound.click(); onOpenPalette(); }}
          onMouseEnter={() => eeSound.hover()}
          className="glass rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/[0.04] transition"
          title="Search (⌘K)" aria-label="Search species">
          <Icons.Search size={14} />
        </button>

        <button onClick={() => { eeSound.click(); onOpenCompare(); }}
          onMouseEnter={() => eeSound.hover()}
          className="glass rounded-full w-9 h-9 hidden sm:flex items-center justify-center hover:bg-white/[0.04] transition"
          title="Compare two species" aria-label="Compare two species">
          <Icons.Layers size={14} />
        </button>

        <SoundToggle soundOn={soundOn} setSoundOn={setSoundOn} />

        <button onClick={onOpenTweaks}
          onMouseEnter={() => eeSound.hover()}
          className="glass rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/[0.04] transition"
          title="Tweaks" aria-label="Open tweaks panel">
          <Icons.Settings size={14} />
        </button>

        <button onClick={onStartTour}
          onMouseEnter={() => eeSound.hover()}
          className="rounded-full h-9 pl-3 pr-4 flex items-center gap-2 text-xs font-medium text-white transition hover:scale-[1.02] whitespace-nowrap"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}>
          <Icons.Film size={13} />
          <span className="hidden sm:inline">Museum Tour</span>
          <span className="sm:hidden">Tour</span>
        </button>
      </div>
    </div>
  );
}
