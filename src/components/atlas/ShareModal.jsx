import { useState } from "react";
import { eeSound } from "../../lib/audio.js";

export default function ShareModal({ species, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!species) return null;
  const url = `${location.origin}${location.pathname}#${species.id}`;
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center"
      style={{ background: "rgba(3,4,8,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose} role="dialog" aria-label="Share species">
      <div className="glass-solid rounded-2xl p-6 sm:p-8 w-[420px] max-w-[92vw] caption-enter" onClick={(e) => e.stopPropagation()}>
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40">Share</div>
        <div className="serif text-3xl mt-1">{species.name}</div>
        <div className="mt-5 flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex-1 mono text-xs truncate text-white/70">{url}</div>
          <button onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); eeSound.click(); }}
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
