import { useEffect, useState } from "react";
import { HABITATS } from "../../data/species.js";
import { eeSound } from "../../lib/audio.js";
import { fmtYear, statusColor } from "../../lib/format.js";
import { makePostcard } from "../../lib/postcard.js";
import { Icons } from "../icons.jsx";

function Detail({ label, value, color }) {
  return (
    <div>
      <div className="mono text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="mt-1.5 text-[15px]" style={color ? { color } : {}}>{value}</div>
    </div>
  );
}

export default function Takeover({ species, onClose, onPrev, onNext, onShare, bookmarked, onBookmark, accent, accentRgb }) {
  useEffect(() => {
    if (species) eeSound.panelOpen();
  }, [species?.id]);

  useEffect(() => {
    if (!species) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [species, onClose, onNext, onPrev]);

  const [playing, setPlaying] = useState(false);
  useEffect(() => { setPlaying(false); }, [species?.id]);

  if (!species) return null;
  const h = HABITATS[species.habitat];
  const sColor = statusColor(species.status);

  return (
    <div className="fixed inset-0 z-[70]" style={{ animation: "fadeIn .4s ease-out both" }} role="dialog" aria-label={`${species.name} profile`}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dotIn { from { opacity: 0; transform: scale(0) } to { opacity: 1; transform: scale(1) } }
      `}</style>

      {/* Backdrop — fully opaque to block globe + any leftover UI */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at 70% 40%, rgb(${accentRgb} / 0.14), rgb(3 4 8) 55%), linear-gradient(180deg, rgb(6 6 8) 0%, rgb(3 4 8) 100%)`,
      }} />

      {/* Close and nav */}
      <button onClick={() => { eeSound.click(); onClose(); }}
        className="absolute top-4 sm:top-6 right-4 sm:right-8 z-50 w-11 h-11 rounded-full glass flex items-center justify-center hover:bg-white/10" aria-label="Close profile">
        <Icons.X size={16} />
      </button>
      <div className="absolute top-4 sm:top-6 left-4 sm:left-8 z-50 flex items-center gap-2">
        <button onClick={() => { eeSound.click(); onPrev(); }}
          className="w-11 h-11 rounded-full glass flex items-center justify-center hover:bg-white/10" aria-label="Previous species">
          <Icons.ChevronL size={16} />
        </button>
        <button onClick={() => { eeSound.click(); onNext(); }}
          className="w-11 h-11 rounded-full glass flex items-center justify-center hover:bg-white/10" aria-label="Next species">
          <Icons.ChevronR size={16} />
        </button>
        <div className="mono text-[11px] uppercase tracking-[0.22em] text-white/50 ml-3 hidden sm:block">
          Species Profile
        </div>
      </div>

      {/* Content — two columns on desktop, single scrolling column on mobile */}
      <div key={species.id}
        className="absolute inset-0 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-10 px-5 sm:px-10 lg:px-16 pt-20 sm:pt-28 pb-6 lg:pb-10 overflow-y-auto lg:overflow-hidden ee-scroll">
        {/* LEFT — hero image and name */}
        <div className="relative flex flex-col rise shrink-0">
          <div className="relative flex-1 min-h-[320px] sm:min-h-[420px] overflow-hidden rounded-2xl">
            <div className="absolute inset-0 border border-white/10 rounded-2xl z-10 pointer-events-none" />
            <img src={species.imageUrl} alt={species.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                if (!e.target.dataset.retried && species.imageRemote) {
                  e.target.dataset.retried = "1";
                  e.target.src = species.imageRemote;
                  return;
                }
                e.target.style.display = "none";
                e.target.parentElement.style.background = `linear-gradient(135deg, rgb(${accentRgb} / 0.3), rgb(0 0 0 / 0.6))`;
              }} />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(180deg, transparent 40%, rgba(3,4,8,0.85) 100%)",
            }} />
            {/* Status pill */}
            <div className="absolute top-5 left-5 flex items-center gap-2">
              <div className="glass-solid rounded-full px-3 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: sColor, boxShadow: `0 0 12px ${sColor}` }} />
                <div className="mono text-[10px] uppercase tracking-[0.2em]">{species.status}</div>
              </div>
            </div>
            {/* Habitat pill */}
            <div className="absolute top-5 right-5">
              <div className="glass-solid rounded-full px-3 py-1.5 mono text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>
                {h.label}
              </div>
            </div>

            {/* Name overlay */}
            <div className="absolute bottom-6 sm:bottom-8 left-5 sm:left-8 right-5 sm:right-8">
              <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1">
                {species.yearExtinct ? `Lost ${fmtYear(species.yearExtinct)}` : "Still with us"}
              </div>
              <div className="serif leading-[0.95] tracking-tight text-white" style={{ fontSize: "clamp(44px, 6vw, 84px)" }}>
                {species.name}
              </div>
              <div className="serif italic text-xl sm:text-2xl text-white/60 mt-2">{species.scientific}</div>
            </div>
          </div>

          {/* Action row */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => { setPlaying(!playing); eeSound.click(); if (!playing) setTimeout(() => eeSound.panelOpen(), 200); }}
              onMouseEnter={() => eeSound.hover()}
              className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-medium transition hover:scale-[1.01]"
              style={{
                background: playing ? accent : "rgba(255,255,255,0.06)",
                color: playing ? "#000" : "#fff",
                border: `1px solid ${playing ? accent : "rgba(255,255,255,0.12)"}`,
              }}>
              {playing ? <Icons.Pause size={14} /> : <Icons.Volume size={14} />}
              <span className="mono text-[10px] sm:text-xs uppercase tracking-[0.18em]">
                {playing ? "Playing — Ambient Simulation" : "Listen to Ambient Simulation"}
              </span>
            </button>
            <button onClick={() => { eeSound.click(); onBookmark(species.id); }}
              onMouseEnter={() => eeSound.hover()}
              className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-white/10 shrink-0"
              style={bookmarked ? { color: accent, borderColor: accent } : {}}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark species"}>
              {bookmarked ? <Icons.BookmarkFill size={16} /> : <Icons.Bookmark size={16} />}
            </button>
            <button onClick={() => { eeSound.click(); onShare(species); }}
              onMouseEnter={() => eeSound.hover()}
              className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-white/10 shrink-0" aria-label="Share">
              <Icons.Share size={16} />
            </button>
            <button onClick={() => { eeSound.click(); makePostcard(species, accent); }}
              onMouseEnter={() => eeSound.hover()}
              title="Download postcard"
              className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-white/10 shrink-0" aria-label="Download postcard">
              <Icons.Download size={16} />
            </button>
          </div>
          {playing && (
            <div className="mt-3 text-[11px] text-white/40 mono flex items-center gap-2">
              <div className="wave-bars">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span key={i} style={{
                    height: `${4 + Math.abs(Math.sin(Date.now() / 200 + i)) * 10}px`,
                    background: accent, width: "2px",
                  }} />
                ))}
              </div>
              Note: a synthesized tone stands in for species audio.
            </div>
          )}
        </div>

        {/* RIGHT — details column */}
        <div className="relative lg:overflow-y-auto ee-scroll lg:pr-2 pb-4">
          {species.yearExtinct !== null && (
            <div className="serif absolute -top-4 right-0 pointer-events-none select-none leading-none text-white/[0.05]"
              style={{ fontSize: "clamp(120px, 14vw, 220px)" }}>
              {Math.abs(species.yearExtinct)}
            </div>
          )}
          <div className="rise mono text-[10px] uppercase tracking-[0.25em]" style={{ animationDelay: ".15s", color: accent }}>Field Notes</div>

          <p className="rise serif text-[22px] sm:text-[28px] leading-[1.25] mt-4 text-white/90" style={{ animationDelay: ".25s", textWrap: "pretty" }}>
            {species.description}
          </p>

          <div className="hr-line my-8" />

          <div className="rise grid grid-cols-1 sm:grid-cols-2 gap-5" style={{ animationDelay: ".35s" }}>
            <Detail label="Population" value={species.population} />
            <Detail label="Habitat" value={species.habitatLabel} />
            <Detail label="Status" value={species.status} color={sColor} />
            <Detail label={species.yearExtinct ? "Year extinct" : "Discovered"} value={species.yearExtinct ? fmtYear(species.yearExtinct) : "—"} />
          </div>

          {species.popCount && species.popCount <= 300 ? (
            <div className="rise mt-8" style={{ animationDelay: ".4s" }}>
              <div className="mono text-[10px] uppercase tracking-[0.2em] text-white/40">Every dot, a living individual</div>
              <div className="mt-3 flex flex-wrap gap-[5px] max-w-[420px]">
                {Array.from({ length: species.popCount }).map((_, i) => (
                  <span key={i} className="rounded-full" style={{
                    width: 6, height: 6, background: accent, opacity: 0.9,
                    boxShadow: `0 0 4px ${accent}66`,
                    animation: `dotIn .5s cubic-bezier(.16,1,.3,1) ${i * 12}ms both`,
                  }}></span>
                ))}
              </div>
              <div className="mono text-[11px] text-white/40 mt-2.5">≈ {species.popCount} known individuals remain</div>
            </div>
          ) : null}

          <div className="rise mt-6" style={{ animationDelay: ".45s" }}>
            <div className="mono text-[10px] uppercase tracking-[0.2em] text-white/40">Principal threats</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {species.threats.map((t) => (
                <div key={t} className="px-3 py-1.5 rounded-full text-xs border border-white/15 bg-white/[0.03]">{t}</div>
              ))}
            </div>
          </div>

          {species.help && (
            <div className="rise mt-8" style={{ animationDelay: ".5s" }}>
              <div className="mono text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>How to help</div>
              <div className="mt-3 flex flex-col gap-2.5">
                {species.help.map((hh) => (
                  <div key={hh} className="flex items-start gap-3 text-[14px] leading-relaxed text-white/75">
                    <span className="mt-[2px]" style={{ color: accent }}>→</span>
                    <span>{hh}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="hr-line my-8" />

          <div className="mono text-[10px] uppercase tracking-[0.2em] text-white/40">Archive footage</div>
          <div className="mt-3 relative rounded-2xl overflow-hidden aspect-video border border-white/10 bg-black">
            <iframe
              src={species.youtube}
              title={species.name}
              className="absolute inset-0 w-full h-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="mt-6 text-[11px] text-white/40 mono uppercase tracking-[0.2em] hidden lg:block">
            ← → navigate species · Esc to close
          </div>
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
