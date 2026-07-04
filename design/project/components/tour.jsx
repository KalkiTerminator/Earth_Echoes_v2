// Museum Tour — auto-flying camera with cinematic captions, no panel
const { useState: mtS, useEffect: mtE, useRef: mtR } = React;

function Tour({ active, species, globeRef, onExit, setHabitatTheme }) {
  const [idx, setIdx] = mtS(0);
  const [captionVisible, setCaptionVisible] = mtS(true);
  const timerRef = mtR(null);

  mtE(() => {
    if (!active) return;
    setIdx(0);
  }, [active]);

  mtE(() => {
    if (!active || !species[idx]) return;
    const s = species[idx];
    const g = globeRef.current;
    if (g) {
      const c = g.controls();
      c.autoRotate = false;
      g.pointOfView({ lat: s.lat, lng: s.lng, altitude: 1.6 }, 3000);
    }
    setHabitatTheme(s.habitat);
    window.eeSound?.tourTick();
    setCaptionVisible(false);
    const t1 = setTimeout(() => setCaptionVisible(true), 200);
    timerRef.current = setTimeout(() => {
      setIdx((i) => (i + 1) % species.length);
    }, 10500);
    return () => { clearTimeout(timerRef.current); clearTimeout(t1); };
  }, [active, idx, species]);

  if (!active) return null;
  const s = species[idx];
  if (!s) return null;
  const h = window.HABITATS[s.habitat];

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Cinematic letterbox */}
      <div className="absolute top-0 left-0 right-0 h-[12vh]" style={{background: "linear-gradient(180deg, #000 10%, transparent)"}} />
      <div className="absolute bottom-0 left-0 right-0 h-[22vh]" style={{background: "linear-gradient(0deg, #000 30%, transparent)"}} />

      {/* Top bar */}
      <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-8 pointer-events-auto">
        <div className="flex items-center gap-3 mono text-[11px] uppercase tracking-[0.25em] text-white/70">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{background: h.color, boxShadow: `0 0 12px ${h.color}`}}/>
          Museum Tour · {String(idx+1).padStart(2,"0")} / {String(species.length).padStart(2,"0")}
        </div>
        <button onClick={() => { window.eeSound?.click(); onExit(); }}
          className="glass rounded-full h-9 px-4 flex items-center gap-2 text-xs pointer-events-auto hover:bg-white/10">
          <Icons.X size={13} /> End tour
        </button>
      </div>

      {/* Caption */}
      <div key={s.id} className={`absolute left-0 right-0 bottom-[10vh] flex justify-center px-12 ${captionVisible ? "caption-enter" : "opacity-0"}`}>
        <div className="max-w-[900px] text-center">
          <div className="mono text-[10px] uppercase tracking-[0.3em] mb-3" style={{color: h.color}}>
            {h.label} · {fmtYear(s.yearExtinct || 2026)}
          </div>
          <div className="serif text-6xl leading-[1.05] tracking-tight">
            "{s.name}"
          </div>
          <div className="serif italic text-white/50 text-xl mt-2">{s.scientific}</div>
          <div className="serif text-2xl text-white/80 leading-[1.35] mt-6" style={{textWrap: "balance"}}>
            {s.description}
          </div>
        </div>
      </div>

      {/* Progress ticks */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-auto">
        {species.map((_, i) => (
          <button key={i} onClick={() => { window.eeSound?.click(); setIdx(i); }}
            className="h-1 rounded-full transition-all"
            style={{
              width: i === idx ? 32 : 8,
              background: i === idx ? h.color : "rgba(255,255,255,0.25)",
            }} />
        ))}
      </div>
    </div>
  );
}

window.Tour = Tour;
