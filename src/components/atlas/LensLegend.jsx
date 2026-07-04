import { THREAT_CLASSES } from "../../data/species.js";

export default function LensLegend({ lens }) {
  if (lens !== "threat") return null;
  return (
    <div className="absolute right-[4.5rem] bottom-48 z-20 glass rounded-xl px-4 py-3 pointer-events-none caption-enter hidden sm:block">
      <div className="mono text-[9px] uppercase tracking-[0.25em] text-white/40 mb-2">Threat lens</div>
      <div className="flex flex-col gap-1.5">
        {Object.entries(THREAT_CLASSES).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: v.color, boxShadow: `0 0 8px ${v.color}88` }}></span>
            <span className="mono text-[9px] uppercase tracking-[0.15em] text-white/60 whitespace-nowrap">{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
