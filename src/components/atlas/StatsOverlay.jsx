import { eeSound } from "../../lib/audio.js";
import { fmtYear } from "../../lib/format.js";
import { Icons } from "../icons.jsx";

function Stat({ n, label, sub, color }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="serif text-5xl sm:text-6xl leading-none" style={{ color }}>{n}</div>
      <div className="mt-3 text-sm">{label}</div>
      <div className="text-white/40 text-xs mt-0.5">{sub}</div>
    </div>
  );
}

export default function StatsOverlay({ open, onClose, species, birthYear, setBirthYear }) {
  if (!open) return null;
  const extinct = species.filter((s) => s.status === "Extinct" || s.status === "Functionally Extinct");
  const lostSinceBirth = extinct.filter((s) => s.yearExtinct && s.yearExtinct >= birthYear);
  const critical = species.filter((s) => s.status === "Critically Endangered");
  const vuln = species.filter((s) => s.status === "Vulnerable" || s.status === "Near Threatened");

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
      style={{ background: "rgba(3,4,8,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose} role="dialog" aria-label="Extinction Ledger">
      <div className="glass-solid rounded-3xl p-6 sm:p-10 max-w-3xl w-[92%] max-h-[88vh] overflow-y-auto ee-scroll relative caption-enter"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { eeSound.click(); onClose(); }}
          className="absolute top-5 right-5 w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center" aria-label="Close">
          <Icons.X size={16} />
        </button>
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40">Extinction Ledger</div>
        <div className="serif text-4xl sm:text-5xl mt-2">A quiet accounting.</div>
        <div className="hr-line my-6" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Stat n={extinct.length} label="Cataloged extinct" sub="on this atlas" color="#ef4444" />
          <Stat n={critical.length} label="Critically endangered" sub="one misstep away" color="#f59e0b" />
          <Stat n={vuln.length} label="Vulnerable" sub="trajectory uncertain" color="#eab308" />
        </div>

        <div className="mt-8 glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Icons.Heart size={14} /> Lost since you were born
          </div>
          <div className="mt-3 flex items-baseline gap-4">
            <div className="serif text-5xl sm:text-6xl" style={{ color: "#ef4444" }}>{lostSinceBirth.length}</div>
            <div className="text-white/50 text-sm">species on this atlas, extinct in your lifetime</div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="mono text-[11px] text-white/50">Your birth year</div>
            <input type="number" min="1900" max="2026" value={birthYear}
              onChange={(e) => setBirthYear(parseInt(e.target.value, 10) || 2000)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 w-24 mono text-sm" />
          </div>
          {lostSinceBirth.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {lostSinceBirth.map((s) => (
                <div key={s.id} className="text-xs px-3 py-1.5 rounded-full border border-white/15 bg-white/5">
                  {s.name} <span className="text-white/40">· {fmtYear(s.yearExtinct)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
