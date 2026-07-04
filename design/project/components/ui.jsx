// Header, Timeline (Time Machine), Stats Dashboard, Share modal, Waveform, Sound toggle

const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM } = React;

// ---- Formatting helpers ----
function fmtYear(y) {
  if (y < 0) return `${Math.abs(y).toLocaleString()} BCE`;
  if (y >= 2026) return "Present";
  return `${y} CE`;
}

// ---- Header ----
function Header({ filter, setFilter, onStartTour, soundOn, setSoundOn, theme, onOpenStats, onOpenTweaks, onOpenPalette, onOpenCompare }) {
  const tabs = [
    { id: "all",    label: "All" },
    { id: "ocean",  label: "Ocean" },
    { id: "forest", label: "Forest" },
    { id: "tundra", label: "Tundra" },
    { id: "other",  label: "Other" },
  ];
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 pt-5 pointer-events-none gap-4">
      <div className="pointer-events-auto min-w-0">
        <div className="flex items-baseline gap-3">
          <div className="serif text-3xl tracking-tight leading-none whitespace-nowrap">Earth's Echoes</div>
        </div>
        <div className="mt-1 text-xs text-white/50 font-light hidden xl:block whitespace-nowrap">A living atlas of what we've lost, and what remains.</div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto min-w-0 flex-wrap justify-end">
        <button onClick={onOpenStats}
          onMouseEnter={() => window.eeSound?.hover()}
          className="glass rounded-full px-3 h-9 flex items-center gap-2 text-xs hover:bg-white/[0.04] transition whitespace-nowrap"
          title="Extinction Ledger">
          <Icons.Skull size={13} />
          <span className="hidden lg:inline">Ledger</span>
        </button>

        <div className="glass rounded-full p-1 flex items-center">
          {tabs.map((t) => {
            const active = filter === t.id;
            const color = t.id === "all" ? "#f5f5f4" : window.HABITATS[t.id]?.color;
            return (
              <button key={t.id}
                onClick={() => { window.eeSound?.click(); setFilter(t.id); }}
                onMouseEnter={() => window.eeSound?.hover()}
                className={`relative h-7 px-3 rounded-full text-xs transition ${active ? "text-black" : "text-white/70 hover:text-white"}`}
                style={active ? { background: color, boxShadow: `0 0 16px ${color}66` } : {}}>
                {t.label}
              </button>
            );
          })}
        </div>

        <button onClick={() => { window.eeSound?.click(); onOpenPalette(); }}
          onMouseEnter={() => window.eeSound?.hover()}
          className="glass rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/[0.04] transition"
          title="Search (⌘K)">
          <Icons.Search size={14} />
        </button>

        <button onClick={() => { window.eeSound?.click(); onOpenCompare(); }}
          onMouseEnter={() => window.eeSound?.hover()}
          className="glass rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/[0.04] transition"
          title="Compare two species">
          <Icons.Layers size={14} />
        </button>

        <SoundToggle soundOn={soundOn} setSoundOn={setSoundOn} />

        <button onClick={onOpenTweaks}
          onMouseEnter={() => window.eeSound?.hover()}
          className="glass rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/[0.04] transition"
          title="Tweaks">
          <Icons.Settings size={14} />
        </button>

        <button onClick={onStartTour}
          onMouseEnter={() => window.eeSound?.hover()}
          className="rounded-full h-9 pl-3 pr-4 flex items-center gap-2 text-xs font-medium text-white transition hover:scale-[1.02] whitespace-nowrap"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}>
          <Icons.Film size={13} />
          Museum Tour
        </button>
      </div>
    </div>
  );
}

// ---- Sound Toggle with waveform ----
function SoundToggle({ soundOn, setSoundOn }) {
  const [bars, setBars] = uS(() => new Array(5).fill(2));
  uE(() => {
    window.__eeWave = (duration, peak) => {
      const n = bars.length;
      const next = new Array(n).fill(0).map(() => Math.max(2, 4 + Math.random() * (peak * 200)));
      setBars(next);
      setTimeout(() => setBars(new Array(n).fill(2)), duration * 900);
    };
    return () => { window.__eeWave = null; };
  }, []);
  return (
    <button
      onClick={() => { const v = !soundOn; setSoundOn(v); window.eeSound?.setEnabled(v); if (v) window.eeSound?.click(); }}
      onMouseEnter={() => soundOn && window.eeSound?.hover()}
      className="glass rounded-full h-10 px-3 flex items-center gap-2 hover:bg-white/[0.04] transition"
      title={soundOn ? "Sound on" : "Sound off"}>
      {soundOn ? <Icons.Volume size={14} /> : <Icons.VolumeOff size={14} />}
      <div className="wave-bars" style={{"--accent": soundOn ? "var(--accent, #34d399)" : "#555"}}>
        {bars.map((h, i) => <span key={i} style={{height: `${h}px`}} />)}
      </div>
    </button>
  );
}

// ---- Time Machine ----
function TimeMachine({ year, setYear, minYear = -10000, maxYear = 2026, accent, species = [], onQuiz }) {
  const [playing, setPlaying] = uS(false);
  const raf = uR();
  uE(() => {
    if (!playing) return;
    let last = performance.now();
    const loop = (t) => {
      const dt = t - last; last = t;
      setYear((y) => {
        const step = Math.max(1, Math.round(dt * 0.05 * (y < 0 ? 30 : 2))); // faster through BCE
        const next = y + step;
        if (next >= maxYear) { setPlaying(false); return maxYear; }
        return next;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, maxYear, setYear]);

  const ticks = [
    { y: -10000, label: "10,000 BCE" },
    { y: -5000,  label: "5,000 BCE" },
    { y: 1600,   label: "1600s" },
    { y: 1900,   label: "1900s" },
    { y: 1950,   label: "1950s" },
    { y: 2026,   label: "Present" },
  ];

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-30 pointer-events-auto"
         style={{ width: "min(820px, 70vw)" }}>
      <div className="glass rounded-2xl px-6 pt-4 pb-5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Icons.History size={14} className="text-white/60" />
            <div className="mono text-[11px] uppercase tracking-[0.22em] text-white/50">Time Machine</div>
            {onQuiz && (
              <button onClick={() => { window.eeSound?.click(); onQuiz(); }}
                onMouseEnter={() => window.eeSound?.hover()}
                className="mono text-[9px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full border border-white/10 text-white/45 hover:text-white hover:border-white/30 transition">
                Play: guess the year
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="serif text-3xl tabular-nums" style={{ color: accent || "#f5f5f4" }}>{fmtYear(year)}</div>
            <button
              onClick={() => { window.eeSound?.click(); setPlaying(!playing); }}
              onMouseEnter={() => window.eeSound?.hover()}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-white/15 hover:bg-white/10 transition">
              {playing ? <Icons.Pause size={13} /> : <Icons.Play size={13} />}
            </button>
          </div>
        </div>
        <div className="mt-4 relative">
          <input
            type="range" className="ee-range"
            min={minYear} max={maxYear} step="1" value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            style={{ "--accent": accent || "#34d399" }}
          />
          {/* Extinction event markers */}
          {species.filter((s) => s.yearExtinct !== null && s.yearExtinct >= minYear && s.yearExtinct <= maxYear).map((s) => {
            const pct = ((s.yearExtinct - minYear) / (maxYear - minYear)) * 100;
            const h = window.HABITATS[s.habitat];
            const lost = year > s.yearExtinct;
            return (
              <div key={s.id} title={`${s.name} \u00b7 ${fmtYear(s.yearExtinct)}`}
                className="absolute -translate-x-1/2 rounded-full pointer-events-auto cursor-help transition-all duration-500"
                style={{
                  left: `${pct}%`, top: "7px", width: 4, height: 4,
                  background: lost ? "rgba(255,255,255,0.25)" : h.color,
                  boxShadow: lost ? "none" : `0 0 8px ${h.color}`,
                }} />
            );
          })}
          <div className="mt-3 flex justify-between mono text-[10px] text-white/40">
            {ticks.map((t) => (
              <button key={t.y} onClick={() => setYear(t.y)}
                onMouseEnter={() => window.eeSound?.hover()}
                className="hover:text-white/80 transition">
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Globe zoom controls ----
function GlobeControls({ globeRef, onSpotlight }) {
  const zoom = (dir) => {
    const g = globeRef.current; if (!g) return;
    const pov = g.pointOfView();
    g.pointOfView({ ...pov, altitude: Math.min(4, Math.max(1.1, pov.altitude * (dir > 0 ? 0.82 : 1.22))) }, 500);
  };
  const home = () => {
    const g = globeRef.current; if (!g) return;
    g.pointOfView({ lat: 20, lng: -30, altitude: 2.3 }, 800);
  };
  const [rotating, setRotating] = uS(true);
  const toggleRotate = () => {
    const g = globeRef.current; if (!g) return;
    const c = g.controls();
    c.autoRotate = !c.autoRotate;
    setRotating(c.autoRotate);
  };
  const Btn = ({ children, onClick, title }) => (
    <button onClick={() => { window.eeSound?.click(); onClick(); }}
      onMouseEnter={() => window.eeSound?.hover()}
      title={title}
      className="w-10 h-10 rounded-lg glass flex items-center justify-center hover:bg-white/[0.06] transition">
      {children}
    </button>
  );
  return (
    <div className="absolute right-6 bottom-40 z-30 flex flex-col gap-2 pointer-events-auto">
      <Btn onClick={() => zoom(1)} title="Zoom in"><Icons.Plus size={14} /></Btn>
      <Btn onClick={home} title="Reset view"><Icons.Home size={13} /></Btn>
      <Btn onClick={() => zoom(-1)} title="Zoom out"><Icons.Minus size={14} /></Btn>
      <Btn onClick={toggleRotate} title={rotating ? "Pause rotation" : "Resume rotation"}>
        {rotating ? <Icons.Pause size={13} /> : <Icons.Play size={13} />}
      </Btn>
      <Btn onClick={onSpotlight} title="Surprise me — random species"><Icons.Sparkles size={14} /></Btn>
    </div>
  );
}

// ---- Stats Dashboard overlay ----
function StatsOverlay({ open, onClose, species, birthYear, setBirthYear }) {
  if (!open) return null;
  const extinct = species.filter((s) => s.status === "Extinct" || s.status === "Functionally Extinct");
  const lostSinceBirth = extinct.filter((s) => s.yearExtinct && s.yearExtinct >= birthYear);
  const critical = species.filter((s) => s.status === "Critically Endangered");
  const vuln = species.filter((s) => s.status === "Vulnerable" || s.status === "Near Threatened");

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
         style={{ background: "rgba(3,4,8,0.75)", backdropFilter: "blur(6px)" }}
         onClick={onClose}>
      <div className="glass-solid rounded-3xl p-10 max-w-3xl w-[90%] relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { window.eeSound?.click(); onClose(); }}
          className="absolute top-5 right-5 w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center">
          <Icons.X size={16} />
        </button>
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40">Extinction Ledger</div>
        <div className="serif text-5xl mt-2">A quiet accounting.</div>
        <div className="hr-line my-6" />

        <div className="grid grid-cols-3 gap-6">
          <Stat n={extinct.length} label="Cataloged extinct" sub="on this atlas" color="#ef4444" />
          <Stat n={critical.length} label="Critically endangered" sub="one misstep away" color="#f59e0b" />
          <Stat n={vuln.length} label="Vulnerable" sub="trajectory uncertain" color="#eab308" />
        </div>

        <div className="mt-8 glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Icons.Heart size={14} /> Lost since you were born
          </div>
          <div className="mt-3 flex items-baseline gap-4">
            <div className="serif text-6xl" style={{ color: "#ef4444" }}>{lostSinceBirth.length}</div>
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

function Stat({ n, label, sub, color }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="serif text-6xl leading-none" style={{ color }}>{n}</div>
      <div className="mt-3 text-sm">{label}</div>
      <div className="text-white/40 text-xs mt-0.5">{sub}</div>
    </div>
  );
}

// ---- Hover tag that follows a pin (simpler: just a corner hint) ----
function HoverHint({ species }) {
  if (!species) return null;
  const h = window.HABITATS[species.habitat];
  return (
    <div className="absolute bottom-6 left-6 z-20 pointer-events-none caption-enter" key={species.id}>
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

Object.assign(window, { Header, TimeMachine, GlobeControls, StatsOverlay, HoverHint, fmtYear });
