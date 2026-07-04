import { useEffect, useState } from "react";
import { HABITATS } from "../../data/species.js";
import { eeSound } from "../../lib/audio.js";
import { fmtYear, statusColor } from "../../lib/format.js";
import { Icons } from "../icons.jsx";

function CompareColumn({ sel, setSel, other, species }) {
  if (!sel) {
    return (
      <div className="flex flex-col min-h-0">
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3">Choose a species</div>
        <div className="grid grid-cols-2 gap-1.5 overflow-y-auto ee-scroll pr-1">
          {species.map((s) => {
            const h = HABITATS[s.habitat];
            const taken = other && other.id === s.id;
            return (
              <button key={s.id} disabled={taken}
                onClick={() => { eeSound.click(); setSel(s); }}
                onMouseEnter={() => eeSound.hover()}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition ${taken ? "opacity-25 border-white/5" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08]"}`}>
                <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: h.color }}></span>
                <span className="truncate">{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const h = HABITATS[sel.habitat];
  const sColor = statusColor(sel.status);

  return (
    <div className="flex flex-col min-h-0 overflow-y-auto ee-scroll pr-1">
      <div className="relative h-40 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/[0.03]">
        <img src={sel.imageUrl} alt={sel.name} className="w-full h-full object-cover"
          onError={(e) => {
            if (!e.target.dataset.retried && sel.imageRemote) {
              e.target.dataset.retried = "1";
              e.target.src = sel.imageRemote;
              return;
            }
            e.target.style.display = "none";
          }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 50%, rgba(3,4,8,0.8))" }}></div>
        <button onClick={() => { eeSound.click(); setSel(null); }}
          className="absolute top-2 right-2 mono text-[9px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-black/60 border border-white/15 text-white/70 hover:text-white">
          Change
        </button>
      </div>
      <div className="serif text-2xl sm:text-3xl mt-4 leading-none">{sel.name}</div>
      <div className="serif italic text-white/50 text-sm mt-1">{sel.scientific}</div>

      <div className="mt-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: sColor, boxShadow: `0 0 10px ${sColor}` }}></span>
        <span className="mono text-[10px] uppercase tracking-[0.2em]" style={{ color: sColor }}>{sel.status}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <div className="flex justify-between gap-4 text-[13px]"><span className="text-white/40">Habitat</span><span className="text-right" style={{ color: h.color }}>{sel.habitatLabel}</span></div>
        <div className="flex justify-between gap-4 text-[13px]"><span className="text-white/40">{sel.yearExtinct !== null ? "Lost" : "Status"}</span><span className="text-right">{sel.yearExtinct !== null ? fmtYear(sel.yearExtinct) : "Still with us"}</span></div>
        <div className="flex justify-between gap-4 text-[13px]"><span className="text-white/40 shrink-0">Population</span><span className="text-right">{sel.population}</span></div>
      </div>

      <div className="mt-4">
        <div className="mono text-[9px] uppercase tracking-[0.2em] text-white/40">Threats</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sel.threats.map((t) => (
            <span key={t} className="px-2.5 py-1 rounded-full text-[11px] border border-white/[0.12] bg-white/[0.03]">{t}</span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>{sel.description}</p>
    </div>
  );
}

export default function Compare({ open, onClose, species }) {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);

  useEffect(() => { if (open) { setA(null); setB(null); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center"
      style={{ background: "rgba(3,4,8,0.8)", backdropFilter: "blur(10px)" }}
      onClick={onClose} role="dialog" aria-label="Compare species">
      <div className="glass-solid rounded-3xl p-5 sm:p-8 w-[min(1000px,94vw)] h-[min(640px,88vh)] relative flex flex-col caption-enter"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { eeSound.click(); onClose(); }}
          className="absolute top-5 right-5 w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center z-10" aria-label="Close compare">
          <Icons.X size={15} />
        </button>
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40">Compare</div>
        <div className="serif text-2xl sm:text-3xl mt-1 mb-6">Two lives, side by side.</div>

        <div className="grid grid-cols-[1fr_1px_1fr] gap-4 sm:gap-8 flex-1 min-h-0 relative">
          <CompareColumn sel={a} setSel={setA} other={b} species={species} />
          <div className="bg-white/10 relative">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mono text-[9px] uppercase tracking-[0.2em] text-white/30 bg-[#0a0a10] px-1.5 py-3 rounded-full border border-white/10">vs</span>
          </div>
          <CompareColumn sel={b} setSel={setB} other={a} species={species} />
        </div>
      </div>
    </div>
  );
}
