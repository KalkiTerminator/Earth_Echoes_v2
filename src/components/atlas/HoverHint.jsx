import { HABITATS } from "../../data/species.js";

export default function HoverHint({ species }) {
  if (!species) return null;
  const h = HABITATS[species.habitat];
  return (
    <div className="absolute bottom-28 sm:bottom-6 left-4 sm:left-6 z-20 pointer-events-none caption-enter" key={species.id}>
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full" style={{ background: h.color, boxShadow: `0 0 10px ${h.color}` }} />
        <div>
          <div className="serif text-xl leading-none">{species.name}</div>
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-white/50 mt-1">
            {h.label} · {species.status}
          </div>
        </div>
      </div>
    </div>
  );
}
