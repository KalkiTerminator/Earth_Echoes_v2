import { useEffect, useRef, useState } from "react";
import { eeSound } from "../../lib/audio.js";

// Upper-bound estimate: ~150 species lost per day across all taxa → one every ~9.6 minutes.
const EXTINCTION_PERIOD_S = 576;

export default function ExtinctionClock() {
  const [now, setNow] = useState(Date.now());
  const arrival = useRef(Date.now());
  const lostRef = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = (now - arrival.current) / 1000;
  const lost = Math.floor(elapsed / EXTINCTION_PERIOD_S);
  const rem = EXTINCTION_PERIOD_S - (elapsed % EXTINCTION_PERIOD_S);
  const mm = String(Math.floor(rem / 60)).padStart(2, "0");
  const ss = String(Math.floor(rem % 60)).padStart(2, "0");

  useEffect(() => {
    if (lost > lostRef.current) {
      lostRef.current = lost;
      eeSound.tourTick();
    }
  }, [lost]);

  return (
    <div
      title="Upper-bound estimate: ~150 species lost per day across all taxa (UNEP) — one every ~9.6 minutes."
      className="absolute right-4 sm:right-6 top-[4.6rem] z-20 glass rounded-full pl-3 pr-4 h-8 hidden md:flex items-center gap-2.5 pointer-events-auto cursor-help">
      <span className="w-[6px] h-[6px] rounded-full bg-red-400 animate-pulse" style={{ boxShadow: "0 0 10px #f87171" }}></span>
      <span className="mono text-[9px] uppercase tracking-[0.18em] text-white/50 whitespace-nowrap">
        Next species lost in <span className="text-white/85 tabular-nums">{mm}:{ss}</span>
        {lost > 0 && <span className="text-red-300/90"> · {lost} since you arrived</span>}
      </span>
    </div>
  );
}
