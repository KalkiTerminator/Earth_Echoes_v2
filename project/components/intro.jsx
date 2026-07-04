// Intro title sequence + Species index rail
const { useState: inS, useEffect: inE, useRef: inR } = React;

const INTRO_ACCENT = "#8fd4c9";

function IntroWord({ text, italic, color, baseDelay }) {
  return (
    <span className="inline-block whitespace-nowrap">
      {text.split("").map((ch, i) => (
        <span key={i}
          className={`intro-ch ${italic ? "italic" : ""}`}
          style={{ animationDelay: `${baseDelay + i * 0.05}s`, color }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

function IntroYearCount() {
  const [label, setLabel] = inS("10,000 BCE");
  inE(() => {
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
  const species = window.SPECIES || [];
  const items = side === "left"
    ? species.filter((s) => s.yearExtinct !== null)
    : species.filter((s) => s.yearExtinct === null);
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

function Intro({ onEnter }) {
  const [leaving, setLeaving] = inS(false);
  const titleRef = inR(null);
  const ringsRef = inR(null);

  const enter = () => {
    if (leaving) return;
    window.eeSound?.panelOpen();
    setLeaving(true);
    setTimeout(onEnter, 1050);
  };

  inE(() => {
    const onKey = (e) => { if (e.key === "Enter" || e.key === " ") enter(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leaving]);

  const onMove = (e) => {
    if (leaving) return;
    const cx = e.clientX / window.innerWidth - 0.5;
    const cy = e.clientY / window.innerHeight - 0.5;
    if (titleRef.current) titleRef.current.style.transform = `translate3d(${cx * 10}px, ${cy * 8}px, 0)`;
    if (ringsRef.current) ringsRef.current.style.transform = `translate3d(${cx * -18}px, ${cy * -14}px, 0)`;
  };

  return (
    <div
      data-screen-label="intro"
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
      <div ref={titleRef} className={`intro-exit-group relative flex flex-col items-center will-change-transform ${leaving ? "leaving" : ""}`}>
        <div className="mono text-[10px] uppercase tracking-[0.5em] text-white/40 intro-fade" style={{ animationDelay: ".5s" }}>
          A living atlas of vanished &amp; vanishing life
        </div>

        <h1 className="serif text-center leading-[0.95] mt-8 mb-10" style={{ fontSize: "clamp(64px, 12vw, 160px)" }}>
          <IntroWord text="Earth's" baseDelay={0.7} />{" "}
          <IntroWord text="Echoes" italic color={INTRO_ACCENT} baseDelay={1.1} />
        </h1>

        <div className="flex items-center gap-6 mono text-[10px] uppercase tracking-[0.3em] text-white/35 intro-fade" style={{ animationDelay: "1.9s" }}>
          <span>16 species</span>
          <span className="w-1 h-1 rounded-full bg-white/25"></span>
          <span>10,000 BCE — present</span>
          <span className="w-1 h-1 rounded-full bg-white/25"></span>
          <span>One planet</span>
        </div>

        <button
          className="intro-fade relative overflow-hidden mt-14 h-12 px-10 rounded-full mono text-[11px] uppercase tracking-[0.35em] text-white/90 transition-all duration-300 hover:tracking-[0.45em] hover:border-white/40"
          style={{
            animationDelay: "2.3s",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.16)",
            backdropFilter: "blur(8px)",
          }}
          onMouseEnter={() => window.eeSound?.hover()}>
          Enter the atlas
          <span className="btn-sheen"></span>
        </button>
      </div>

      {/* Year count-up */}
      <div className="absolute bottom-[14vh] intro-fade" style={{ animationDelay: "1.4s" }}>
        <IntroYearCount />
      </div>

      <div className="absolute bottom-[6vh] mono text-[9px] uppercase tracking-[0.3em] text-white/20 intro-fade" style={{ animationDelay: "2.8s" }}>
        Sound on recommended · click anywhere to begin
      </div>
    </div>
  );
}

// ---- Species index rail (left edge) ----
function SpeciesRail({ species, year, bookmarks, onSelect, filter }) {
  return (
    <div
      data-screen-label="species index"
      className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-[6px] pointer-events-auto max-h-[68vh] overflow-y-auto no-scrollbar pr-2">
      <div className="mono text-[9px] uppercase tracking-[0.3em] text-white/30 mb-2">Index</div>
      {species.map((s, i) => {
        const h = window.HABITATS[s.habitat];
        const gone = s.yearExtinct !== null && year > s.yearExtinct;
        const dimmed = filter !== "all" && s.habitat !== filter;
        return (
          <button
            key={s.id}
            onClick={() => { window.eeSound?.click(); onSelect(s); }}
            onMouseEnter={() => window.eeSound?.hover()}
            className="group flex items-center gap-2.5 text-left transition-opacity duration-300"
            style={{ opacity: dimmed ? 0.25 : 1 }}>
            <span className="mono text-[9px] text-white/25 w-4 tabular-nums group-hover:text-white/60 transition">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="w-[5px] h-[5px] rounded-full shrink-0 transition-transform group-hover:scale-150"
              style={{ background: h.color, boxShadow: gone ? "none" : `0 0 8px ${h.color}88`, opacity: gone ? 0.35 : 1 }}></span>
            <span
              className={`mono text-[10px] uppercase tracking-[0.14em] whitespace-nowrap transition ${gone ? "line-through text-white/25 group-hover:text-white/50" : "text-white/55 group-hover:text-white"}`}>
              {s.name}
            </span>
            {bookmarks.includes(s.id) && (
              <span className="text-[8px]" style={{ color: h.color }}>◆</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { Intro, SpeciesRail });
