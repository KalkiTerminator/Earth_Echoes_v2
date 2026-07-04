// Full-screen immersive species takeover

// ---- Postcard export (canvas → PNG download) ----
function pcWrapText(x, text, left, top, maxW, lh) {
  const words = String(text).split(" ");
  let line = "", y = top;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (x.measureText(test).width > maxW && line) {
      x.fillText(line, left, y);
      line = w; y += lh;
    } else line = test;
  }
  if (line) x.fillText(line, left, y);
  return y + lh;
}

async function makePostcard(species, accent) {
  try { await document.fonts.ready; } catch (e) {}
  const W = 1200, H = 630;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d");
  x.fillStyle = "#07070c"; x.fillRect(0, 0, W, H);

  let imgOk = false;
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.crossOrigin = "anonymous";
      i.onload = () => res(i); i.onerror = rej;
      i.src = species.imageUrl;
    });
    const tw = 560, th = H;
    const sc = Math.max(tw / img.width, th / img.height);
    const sw = tw / sc, sh = th / sc;
    x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, tw, th);
    imgOk = true;
  } catch (e) {}
  if (!imgOk) {
    const g = x.createLinearGradient(0, 0, 560, H);
    g.addColorStop(0, accent + "44"); g.addColorStop(1, "#07070c");
    x.fillStyle = g; x.fillRect(0, 0, 560, H);
  }
  const fade = x.createLinearGradient(340, 0, 560, 0);
  fade.addColorStop(0, "rgba(7,7,12,0)"); fade.addColorStop(1, "rgba(7,7,12,1)");
  x.fillStyle = fade; x.fillRect(340, 0, 220, H);

  const L = 600;
  x.fillStyle = accent; x.font = '600 15px "IBM Plex Mono", monospace';
  try { x.letterSpacing = "5px"; } catch (e) {}
  x.fillText((species.status || "").toUpperCase(), L, 110);
  try { x.letterSpacing = "0px"; } catch (e) {}

  x.fillStyle = "#f5f5f4"; x.font = '62px "Instrument Serif", serif';
  let yPos = pcWrapText(x, species.name, L, 185, 540, 64);
  x.font = 'italic 26px "Instrument Serif", serif';
  x.fillStyle = "rgba(245,245,244,0.55)";
  x.fillText(species.scientific, L, yPos + 4);
  yPos += 46;

  x.font = '15px "IBM Plex Mono", monospace';
  x.fillStyle = "rgba(245,245,244,0.5)";
  x.fillText(species.yearExtinct !== null ? `Lost ${fmtYear(species.yearExtinct)}` : String(species.population), L, yPos + 16);
  yPos += 56;

  x.font = '20px "IBM Plex Sans", sans-serif';
  x.fillStyle = "rgba(245,245,244,0.72)";
  const desc = species.description.length > 260 ? species.description.slice(0, 257) + "…" : species.description;
  pcWrapText(x, desc, L, yPos, 520, 31);

  x.strokeStyle = "rgba(255,255,255,0.14)";
  x.beginPath(); x.moveTo(L, H - 84); x.lineTo(W - 60, H - 84); x.stroke();
  x.font = '600 12px "IBM Plex Mono", monospace';
  x.fillStyle = "rgba(245,245,244,0.38)";
  try { x.letterSpacing = "4px"; } catch (e) {}
  x.fillText("EARTH'S ECHOES — A LIVING ATLAS", L, H - 52);
  try { x.letterSpacing = "0px"; } catch (e) {}

  cv.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `${species.id}-postcard.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
}

const { useState: tS, useEffect: tE, useRef: tR } = React;

function Takeover({ species, onClose, onPrev, onNext, onShare, bookmarked, onBookmark, accent, accentRgb }) {
  tE(() => {
    if (species) window.eeSound?.panelOpen();
  }, [species?.id]);

  tE(() => {
    if (!species) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [species, onClose, onNext, onPrev]);

  const [playing, setPlaying] = tS(false);
  tE(() => { setPlaying(false); }, [species?.id]);

  if (!species) return null;
  const h = window.HABITATS[species.habitat];
  const isExtinct = species.status === "Extinct" || species.status === "Functionally Extinct";
  const statusColor = isExtinct ? "#ef4444"
    : species.status.toLowerCase().includes("critically") ? "#f97316"
    : species.status === "Vulnerable" ? "#eab308"
    : "#22c55e";

  return (
    <div className="fixed inset-0 z-[70]"
         style={{ animation: "fadeIn .4s ease-out both" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } } @keyframes dotIn { from { opacity: 0; transform: scale(0) } to { opacity: 1; transform: scale(1) } }`}</style>

      {/* Backdrop — fully opaque to block globe + any leftover UI */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at 70% 40%, rgba(${accentRgb}, 0.14), rgba(3,4,8,1) 55%), linear-gradient(180deg, rgba(6,6,8,1) 0%, rgba(3,4,8,1) 100%)`,
      }} />

      {/* Close and nav */}
      <button onClick={() => { window.eeSound?.click(); onClose(); }}
        className="absolute top-6 right-8 z-50 w-11 h-11 rounded-full glass flex items-center justify-center hover:bg-white/10">
        <Icons.X size={16} />
      </button>
      <div className="absolute top-6 left-8 z-50 flex items-center gap-2">
        <button onClick={() => { window.eeSound?.click(); onPrev(); }}
          className="w-11 h-11 rounded-full glass flex items-center justify-center hover:bg-white/10">
          <Icons.ChevronL size={16} />
        </button>
        <button onClick={() => { window.eeSound?.click(); onNext(); }}
          className="w-11 h-11 rounded-full glass flex items-center justify-center hover:bg-white/10">
          <Icons.ChevronR size={16} />
        </button>
        <div className="mono text-[11px] uppercase tracking-[0.22em] text-white/50 ml-3">
          Species Profile
        </div>
      </div>

      {/* Content grid */}
      <div key={species.id} data-screen-label={`species: ${species.name}`} className="absolute inset-0 grid grid-cols-[1.2fr_1fr] gap-10 px-16 pt-28 pb-10 overflow-hidden">
        {/* LEFT — hero image and name */}
        <div className="relative flex flex-col rise">
          <div className="relative flex-1 overflow-hidden rounded-2xl">
            <div className="absolute inset-0 border border-white/10 rounded-2xl" />
            <img src={species.imageUrl} alt={species.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.style.background = `linear-gradient(135deg, rgba(${accentRgb}, 0.3), rgba(0,0,0,0.6))`;
              }} />
            <div className="absolute inset-0" style={{
              background: `linear-gradient(180deg, transparent 40%, rgba(3,4,8,0.85) 100%)`,
            }} />
            {/* Status pill */}
            <div className="absolute top-5 left-5 flex items-center gap-2">
              <div className="glass-solid rounded-full px-3 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{background: statusColor, boxShadow: `0 0 12px ${statusColor}`}} />
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
            <div className="absolute bottom-8 left-8 right-8">
              <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1">
                {species.yearExtinct ? `Lost ${fmtYear(species.yearExtinct)}` : "Still with us"}
              </div>
              <div className="serif text-[84px] leading-[0.95] tracking-tight" style={{color: "#fff"}}>
                {species.name}
              </div>
              <div className="serif italic text-2xl text-white/60 mt-2">{species.scientific}</div>
            </div>
          </div>

          {/* Action row */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => { setPlaying(!playing); window.eeSound?.click(); if (!playing) setTimeout(() => window.eeSound?.panelOpen(), 200); }}
              onMouseEnter={() => window.eeSound?.hover()}
              className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-medium transition hover:scale-[1.01]"
              style={{
                background: playing ? accent : "rgba(255,255,255,0.06)",
                color: playing ? "#000" : "#fff",
                border: `1px solid ${playing ? accent : "rgba(255,255,255,0.12)"}`,
              }}>
              {playing ? <Icons.Pause size={14} /> : <Icons.Volume size={14} />}
              <span className="mono text-xs uppercase tracking-[0.18em]">
                {playing ? "Playing — Ambient Simulation" : "Listen to Ambient Simulation"}
              </span>
            </button>
            <button onClick={() => { window.eeSound?.click(); onBookmark(species.id); }}
              onMouseEnter={() => window.eeSound?.hover()}
              className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-white/10"
              style={bookmarked ? { color: accent, borderColor: accent } : {}}>
              {bookmarked ? <Icons.BookmarkFill size={16} /> : <Icons.Bookmark size={16} />}
            </button>
            <button onClick={() => { window.eeSound?.click(); onShare(species); }}
              onMouseEnter={() => window.eeSound?.hover()}
              className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-white/10">
              <Icons.Share size={16} />
            </button>
            <button onClick={() => { window.eeSound?.click(); makePostcard(species, accent); }}
              onMouseEnter={() => window.eeSound?.hover()}
              title="Download postcard"
              className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-white/10">
              <Icons.Download size={16} />
            </button>
          </div>
          {playing && (
            <div className="mt-3 text-[11px] text-white/40 mono flex items-center gap-2">
              <div className="wave-bars">
                {Array.from({length: 18}).map((_, i) => (
                  <span key={i} style={{
                    height: `${4 + Math.abs(Math.sin(Date.now()/200 + i)) * 10}px`,
                    background: accent, width: "2px"
                  }} />
                ))}
              </div>
              Note: a synthesized tone stands in for species audio.
            </div>
          )}
        </div>

        {/* RIGHT — details column (scrollable) */}
        <div className="relative overflow-y-auto ee-scroll pr-2">
          {species.yearExtinct !== null && (
            <div className="serif absolute -top-4 right-0 pointer-events-none select-none leading-none text-white/[0.05]"
              style={{ fontSize: "clamp(120px, 14vw, 220px)" }}>
              {Math.abs(species.yearExtinct)}
            </div>
          )}
          <div className="rise mono text-[10px] uppercase tracking-[0.25em]" style={{ animationDelay: ".15s", color: accent }}>Field Notes</div>

          <p className="rise serif text-[28px] leading-[1.25] mt-4 text-white/90" style={{ animationDelay: ".25s", textWrap: "pretty" }}>
            {species.description}
          </p>

          <div className="hr-line my-8" />

          <div className="rise grid grid-cols-2 gap-5" style={{ animationDelay: ".35s" }}>
            <Detail label="Population" value={species.population} />
            <Detail label="Habitat" value={species.habitatLabel} />
            <Detail label="Status" value={species.status} color={statusColor} />
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
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="mt-6 text-[11px] text-white/40 mono uppercase tracking-[0.2em]">
            ← → navigate species · Esc to close
          </div>
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, color }) {
  return (
    <div>
      <div className="mono text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="mt-1.5 text-[15px]" style={color ? { color } : {}}>{value}</div>
    </div>
  );
}

// ---- Share modal ----
function ShareModal({ species, onClose }) {
  const [copied, setCopied] = tS(false);
  if (!species) return null;
  const url = `${location.origin}${location.pathname}#${species.id}`;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center"
         style={{ background: "rgba(3,4,8,0.75)", backdropFilter: "blur(8px)" }}
         onClick={onClose}>
      <div className="glass-solid rounded-2xl p-8 w-[420px]" onClick={(e) => e.stopPropagation()}>
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40">Share</div>
        <div className="serif text-3xl mt-1">{species.name}</div>
        <div className="mt-5 flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex-1 mono text-xs truncate text-white/70">{url}</div>
          <button onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); window.eeSound?.click(); }}
            className="text-xs px-3 py-1.5 rounded-md bg-white text-black hover:bg-white/90">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button onClick={onClose}
          className="mt-4 w-full text-xs py-2 text-white/50 hover:text-white/80 mono uppercase tracking-[0.2em]">
          Close
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { Takeover, ShareModal });
