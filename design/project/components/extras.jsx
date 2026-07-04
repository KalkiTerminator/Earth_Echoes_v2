// Extinction clock + threat lens legend
const { useState: exS, useEffect: exE, useRef: exR } = React;

// Upper-bound estimate: ~150 species lost per day across all taxa → one every ~9.6 minutes.
const EXTINCTION_PERIOD_S = 576;

function ExtinctionClock() {
  const [now, setNow] = exS(Date.now());
  const arrival = exR(Date.now());
  const lostRef = exR(0);

  exE(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = (now - arrival.current) / 1000;
  const lost = Math.floor(elapsed / EXTINCTION_PERIOD_S);
  const rem = EXTINCTION_PERIOD_S - (elapsed % EXTINCTION_PERIOD_S);
  const mm = String(Math.floor(rem / 60)).padStart(2, "0");
  const ss = String(Math.floor(rem % 60)).padStart(2, "0");

  exE(() => {
    if (lost > lostRef.current) {
      lostRef.current = lost;
      window.eeSound?.tourTick();
    }
  }, [lost]);

  return (
    <div
      title="Upper-bound estimate: ~150 species lost per day across all taxa (UNEP) — one every ~9.6 minutes."
      className="absolute right-6 top-[4.6rem] z-20 glass rounded-full pl-3 pr-4 h-8 flex items-center gap-2.5 pointer-events-auto cursor-help">
      <span className="w-[6px] h-[6px] rounded-full bg-red-400 animate-pulse" style={{ boxShadow: "0 0 10px #f87171" }}></span>
      <span className="mono text-[9px] uppercase tracking-[0.18em] text-white/50 whitespace-nowrap">
        Next species lost in <span className="text-white/85 tabular-nums">{mm}:{ss}</span>
        {lost > 0 && <span className="text-red-300/90"> · {lost} since you arrived</span>}
      </span>
    </div>
  );
}

function LensLegend({ lens }) {
  if (lens !== "threat") return null;
  return (
    <div className="absolute right-[4.5rem] bottom-48 z-20 glass rounded-xl px-4 py-3 pointer-events-none caption-enter">
      <div className="mono text-[9px] uppercase tracking-[0.25em] text-white/40 mb-2">Threat lens</div>
      <div className="flex flex-col gap-1.5">
        {Object.entries(window.THREAT_CLASSES).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: v.color, boxShadow: `0 0 8px ${v.color}88` }}></span>
            <span className="mono text-[9px] uppercase tracking-[0.15em] text-white/60 whitespace-nowrap">{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ExtinctionClock, LensLegend });
