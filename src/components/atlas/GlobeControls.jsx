import { useState } from "react";
import { eeSound } from "../../lib/audio.js";
import { Icons } from "../icons.jsx";

function Btn({ children, onClick, title }) {
  return (
    <button onClick={() => { eeSound.click(); onClick(); }}
      onMouseEnter={() => eeSound.hover()}
      title={title} aria-label={title}
      className="w-10 h-10 rounded-lg glass flex items-center justify-center hover:bg-white/[0.06] transition">
      {children}
    </button>
  );
}

export default function GlobeControls({ globeRef, onSpotlight }) {
  const [rotating, setRotating] = useState(true);

  const zoom = (dir) => {
    const g = globeRef.current;
    if (!g) return;
    const pov = g.pointOfView();
    g.pointOfView({ ...pov, altitude: Math.min(4, Math.max(1.1, pov.altitude * (dir > 0 ? 0.82 : 1.22))) }, 500);
  };
  const home = () => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView({ lat: 20, lng: -30, altitude: 2.3 }, 800);
  };
  const toggleRotate = () => {
    const g = globeRef.current;
    if (!g) return;
    const c = g.controls();
    c.autoRotate = !c.autoRotate;
    setRotating(c.autoRotate);
  };

  return (
    <div className="absolute right-4 sm:right-6 bottom-44 sm:bottom-40 z-30 hidden sm:flex flex-col gap-2 pointer-events-auto">
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
