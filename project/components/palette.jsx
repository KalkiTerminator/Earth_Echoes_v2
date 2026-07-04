// Command palette — ⌘K search & actions
const { useState: paS, useEffect: paE, useRef: paR } = React;

function Palette({ open, onClose, species, actions, onPick }) {
  const [q, setQ] = paS("");
  const [hi, setHi] = paS(0);
  const inputRef = paR(null);

  paE(() => {
    if (open) { setQ(""); setHi(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  if (!open) return null;

  const ql = q.trim().toLowerCase();
  const speciesItems = species
    .filter((s) => !ql || s.name.toLowerCase().includes(ql) || s.scientific.toLowerCase().includes(ql) || s.habitat.includes(ql) || s.status.toLowerCase().includes(ql))
    .map((s) => ({
      kind: "species",
      label: s.name,
      sub: `${s.scientific} · ${s.status}`,
      color: window.HABITATS[s.habitat].color,
      run: () => onPick(s),
    }));
  const actionItems = actions
    .filter((a) => !ql || a.label.toLowerCase().includes(ql) || (a.sub || "").toLowerCase().includes(ql))
    .map((a) => ({ kind: "action", ...a }));
  const items = ql ? [...speciesItems, ...actionItems] : [...actionItems, ...speciesItems];
  const cur = Math.min(hi, Math.max(0, items.length - 1));

  const runItem = (it) => { window.eeSound?.click(); it.run(); onClose(); };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(Math.min(cur + 1, items.length - 1)); window.eeSound?.hover(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(Math.max(cur - 1, 0)); window.eeSound?.hover(); }
    else if (e.key === "Enter" && items[cur]) { runItem(items[cur]); }
    else if (e.key === "Escape") { onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[80]" data-screen-label="command palette"
         style={{ background: "rgba(3,4,8,0.6)", backdropFilter: "blur(6px)" }}
         onClick={onClose}>
      <div className="w-[560px] max-w-[92vw] mx-auto mt-[12vh] glass-solid rounded-2xl overflow-hidden"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 h-14 border-b border-white/[0.07]">
          <Icons.Search size={15} className="text-white/40" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setHi(0); }}
            onKeyDown={onKey}
            placeholder="Search species, or type a command…"
            className="flex-1 bg-transparent outline-none text-sm placeholder-white/30"
          />
          <span className="mono text-[9px] uppercase tracking-[0.2em] text-white/25 border border-white/10 rounded px-1.5 py-0.5">esc</span>
        </div>
        <div className="max-h-[46vh] overflow-y-auto ee-scroll py-2">
          {items.length === 0 && (
            <div className="px-5 py-6 text-sm text-white/35">Nothing echoes back. Try another name.</div>
          )}
          {items.map((it, i) => (
            <button key={it.kind + it.label}
              onClick={() => runItem(it)}
              onMouseEnter={() => setHi(i)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition ${i === cur ? "bg-white/[0.07]" : ""}`}>
              {it.kind === "species"
                ? <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: it.color, boxShadow: `0 0 8px ${it.color}88` }}></span>
                : <span className="text-white/40 shrink-0"><Icons.Sparkles size={12} /></span>}
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-white/90">{it.label}</span>
                {it.sub && <span className="block text-[11px] text-white/35 truncate">{it.sub}</span>}
              </span>
              <span className="mono text-[8px] uppercase tracking-[0.2em] text-white/20">{it.kind}</span>
            </button>
          ))}
        </div>
        <div className="px-5 py-2.5 border-t border-white/[0.07] mono text-[9px] uppercase tracking-[0.2em] text-white/25 flex gap-4">
          <span>↑↓ navigate</span><span>↵ select</span><span>⌘K toggle</span>
        </div>
      </div>
    </div>
  );
}

window.Palette = Palette;
