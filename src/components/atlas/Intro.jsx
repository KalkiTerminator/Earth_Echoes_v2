import { useEffect, useRef, useState } from "react";
import { SPECIES } from "../../data/species.js";
import { eeSound } from "../../lib/audio.js";

const INTRO_ACCENT = "#8fd4c9";

function IntroWord({ text, italic, color, baseDelay }) {
  return (
    <span className="inline-block whitespace-nowrap">
      {text.split("").map((ch, i) => (
        <span key={i}
          className={`intro-ch ${italic ? "italic" : ""}`}
          style={{ animationDelay: `${baseDelay + i * 0.05}s`, color }}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

function IntroYearCount() {
  const [label, setLabel] = useState("10,000 BCE");
  useEffect(() => {
    const t0 = performance.now();
    const DUR = 2600;
    let raf;
    const loop = (t) => {
      const p = Math.min(1, (t - t0) / DUR);
      const eased = 1 - Math.pow(1 - p, 3);
      const y = Math.round(-10000 + eased * 12026);
      if (p >= 1) { setLabel("PRESENT DAY"); return; }
      setLabel(y < 0 ? `${Math.abs(y).toLocaleString()} BCE` : `${y} CE`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="mono text-[10px] uppercase tracking-[0.4em] text-white/30 tabular-nums">{label}</div>
  );
}

function MemorialColumn({ side }) {
  const items = side === "left"
    ? SPECIES.filter((s) => s.yearExtinct !== null)
    : SPECIES.filter((s) => s.yearExtinct === null);
  const list = [...items, ...items, ...items];
  return (
    <div className={`absolute top-0 bottom-0 ${side === "left" ? "left-8" : "right-8"} w-44 overflow-hidden pointer-events-none hidden md:block`}
      style={{
        maskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
      }}>
      <div className="mem-scroll flex flex-col" style={side === "right" ? { animationDirection: "reverse" } : {}}>
        {list.map((s, i) => (
          <div key={i} className={`py-4 ${side === "right" ? "text-right" : ""}`}>
            <div className="mono text-[9px] uppercase tracking-[0.25em] text-white/[0.16]">{s.name}</div>
            <div className="mono text-[8px] uppercase tracking-[0.2em] text-white/[0.09] mt-0.5">
              {s.yearExtinct !== null
                ? (s.yearExtinct < 0 ? `${Math.abs(s.yearExtinct).toLocaleString()} BCE` : s.yearExtinct)
                : s.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Intro({ onEnter }) {
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const titleRef = useRef(null);
  const ringsRef = useRef(null);

  const enter = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    eeSound.panelOpen();
    setLeaving(true);
    setTimeout(onEnter, 1050);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Enter" || e.key === " ") enter(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onMove = (e) => {
    if (leavingRef.current) return;
    const cx = e.clientX / window.innerWidth - 0.5;
    const cy = e.clientY / window.innerHeight - 0.5;
    if (titleRef.current) titleRef.current.style.transform = `translate3d(${cx * 10}px, ${cy * 8}px, 0)`;
    if (ringsRef.current) ringsRef.current.style.transform = `translate3d(${cx * -18}px, ${cy * -14}px, 0)`;
  };

  return (
    <div
      onClick={enter}
      onMouseMove={onMove}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 120%, rgba(34,80,120,0.22), transparent 60%), #05050a",
        opacity: leaving ? 0 : 1,
        transition: "opacity 1.05s cubic-bezier(.4,0,.2,1)",
        pointerEvents: leaving ? "none" : "auto",
      }}>

      <style>{`
        .intro-ch {
          display: inline-block; opacity: 0;
          transform: translateY(0.6em);
          filter: blur(12px);
          animation: introCh 1.1s cubic-bezier(.16,1,.3,1) forwards;
        }
        @keyframes introCh { to { opacity: 1; transform: translateY(0); filter: blur(0); } }

        .intro-fade { opacity: 0; animation: introFade 1.2s ease-out forwards; }
        @keyframes introFade { to { opacity: 1; } }
        .intro-line { animation: introLine 1.4s cubic-bezier(.16,1,.3,1) 0.2s forwards; }
        @keyframes introLine { to { width: min(560px, 60vw); } }

        .intro-ring {
          position: absolute; inset: 0; border-radius: 9999px;
          border: 1px solid rgba(143,212,201,0.35);
          opacity: 0; transform: scale(0.25);
          animation: introRing 7s cubic-bezier(.16,1,.3,1) infinite;
        }
        @keyframes introRing {
          0% { transform: scale(0.22); opacity: 0; }
          14% { opacity: 0.32; }
          100% { transform: scale(1.45); opacity: 0; }
        }

        .mem-scroll { animation: memScroll 80s linear infinite; }
        @keyframes memScroll { from { transform: translateY(0); } to { transform: translateY(-33.34%); } }

        .btn-sheen {
          position: absolute; inset: 0; border-radius: 9999px; pointer-events: none;
          background: linear-gradient(110deg, transparent 42%, rgba(255,255,255,0.13) 50%, transparent 58%);
          background-size: 250% 100%;
          animation: introSheen 3.4s ease-in-out 2.4s infinite;
        }
        @keyframes introSheen { 0% { background-position: 120% 0; } 55% { background-position: -60% 0; } 100% { background-position: -60% 0; } }

        .intro-exit-group {
          transition: opacity 1s cubic-bezier(.4,0,.2,1), transform 1s cubic-bezier(.4,0,.2,1), filter 1s cubic-bezier(.4,0,.2,1);
        }
        .intro-exit-group.leaving { opacity: 0; transform: scale(1.07) !important; filter: blur(14px); }
        .intro-rings-wrap { transition: opacity .9s ease, transform .9s cubic-bezier(.16,1,.3,1); }
        .intro-rings-wrap.leaving { opacity: 0; transform: scale(1.6) !important; }

        @media (prefers-reduced-motion: reduce) {
          .intro-ch, .intro-fade, .intro-line, .intro-ring, .mem-scroll, .btn-sheen {
            animation: none !important; opacity: 1 !important; transform: none !important; filter: none !important;
          }
          .intro-ring { opacity: 0.15 !important; }
        }
      `}</style>

      <div className="starfield" style={{ opacity: 0.45 }}></div>

      {/* Memorial columns — the lost (left), the fading (right) */}
      <MemorialColumn side="left" />
      <MemorialColumn side="right" />

      {/* Echo rings */}
      <div ref={ringsRef} className={`intro-rings-wrap absolute pointer-events-none ${leaving ? "leaving" : ""}`}
        style={{ width: "72vmin", height: "72vmin" }}>
        <div className="intro-ring"></div>
        <div className="intro-ring" style={{ animationDelay: "2.3s" }}></div>
        <div className="intro-ring" style={{ animationDelay: "4.6s" }}></div>
        <div className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(143,212,201,0.05), transparent 55%)" }}></div>
      </div>

      {/* Hairlines */}
      <div className="absolute top-[11vh] left-1/2 -translate-x-1/2 w-0 hr-line intro-line" style={{ height: 1 }}></div>
      <div className="absolute bottom-[11vh] left-1/2 -translate-x-1/2 w-0 hr-line intro-line" style={{ height: 1, animationDelay: ".3s" }}></div>

      {/* Title group (parallax target) */}
      <div ref={titleRef} className={`intro-exit-group relative flex flex-col items-center will-change-transform px-6 ${leaving ? "leaving" : ""}`}>
        <div className="mono text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-white/40 intro-fade text-center" style={{ animationDelay: ".5s" }}>
          A living atlas of vanished &amp; vanishing life
        </div>

        <h1 className="serif text-center leading-[0.95] mt-8 mb-10" style={{ fontSize: "clamp(56px, 12vw, 160px)" }}>
          <IntroWord text="Earth's" baseDelay={0.7} />{" "}
          <IntroWord text="Echoes" italic color={INTRO_ACCENT} baseDelay={1.1} />
        </h1>

        <div className="flex items-center gap-3 sm:gap-6 mono text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-white/35 intro-fade" style={{ animationDelay: "1.9s" }}>
          <span>16 species</span>
          <span className="w-1 h-1 rounded-full bg-white/25"></span>
          <span>10,000 BCE — present</span>
          <span className="w-1 h-1 rounded-full bg-white/25"></span>
          <span className="hidden sm:inline">One planet</span>
        </div>

        <button
          className="intro-fade relative overflow-hidden mt-14 h-12 px-10 rounded-full mono text-[11px] uppercase tracking-[0.35em] text-white/90 transition-all duration-300 hover:tracking-[0.45em] hover:border-white/40"
          style={{
            animationDelay: "2.3s",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.16)",
            backdropFilter: "blur(8px)",
          }}
          onMouseEnter={() => eeSound.hover()}>
          Enter the atlas
          <span className="btn-sheen"></span>
        </button>
      </div>

      {/* Year count-up */}
      <div className="absolute bottom-[14vh] intro-fade" style={{ animationDelay: "1.4s" }}>
        <IntroYearCount />
      </div>

      <div className="absolute bottom-[6vh] mono text-[9px] uppercase tracking-[0.3em] text-white/20 intro-fade text-center px-4" style={{ animationDelay: "2.8s" }}>
        Sound on recommended · click anywhere to begin
      </div>
    </div>
  );
}
