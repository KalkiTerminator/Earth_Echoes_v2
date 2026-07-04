import { useEffect, useState } from "react";
import { eeSound } from "../../lib/audio.js";
import { Icons } from "../icons.jsx";

const BAR_COUNT = 5;

export default function SoundToggle({ soundOn, setSoundOn }) {
  const [bars, setBars] = useState(() => new Array(BAR_COUNT).fill(2));

  useEffect(() => {
    let timer;
    const off = eeSound.onWave((duration, peak) => {
      setBars(new Array(BAR_COUNT).fill(0).map(() => Math.max(2, 4 + Math.random() * (peak * 200))));
      clearTimeout(timer);
      timer = setTimeout(() => setBars(new Array(BAR_COUNT).fill(2)), duration * 900);
    });
    return () => { off(); clearTimeout(timer); };
  }, []);

  return (
    <button
      onClick={() => { const v = !soundOn; setSoundOn(v); eeSound.setEnabled(v); if (v) eeSound.click(); }}
      onMouseEnter={() => soundOn && eeSound.hover()}
      className="glass rounded-full h-9 px-3 hidden sm:flex items-center gap-2 hover:bg-white/[0.04] transition"
      title={soundOn ? "Sound on" : "Sound off"} aria-label="Toggle sound">
      {soundOn ? <Icons.Volume size={14} /> : <Icons.VolumeOff size={14} />}
      <div className="wave-bars" style={{ "--accent": soundOn ? "var(--accent, #34d399)" : "#555" }}>
        {bars.map((h, i) => <span key={i} style={{ height: `${h}px` }} />)}
      </div>
    </button>
  );
}
