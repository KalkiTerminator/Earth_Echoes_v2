import { useState } from "react";
import { eeSound } from "../../lib/audio.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { Icons } from "../icons.jsx";

// Email/password sign-in & sign-up, styled to the atlas glass UI. Rendered
// only when the account layer is enabled (an API is configured).
export default function AuthModal({ onClose, onAuthed }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    eeSound.click();
    try {
      const res =
        mode === "signup"
          ? await signUp(email, password, name || email.split("@")[0])
          : await signIn(email, password);
      if (res?.error) {
        setErr(res.error.message || "Something went wrong. Try again.");
        setBusy(false);
        return;
      }
      eeSound.panelOpen();
      onAuthed?.();
      onClose();
    } catch {
      setErr("Could not reach the server. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center"
      style={{ background: "rgba(3,4,8,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose} role="dialog" aria-label="Account">
      <div className="glass-solid rounded-2xl p-6 sm:p-8 w-[420px] max-w-[92vw] caption-enter"
        onClick={(e) => e.stopPropagation()}>
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40">
          {mode === "signup" ? "Create account" : "Welcome back"}
        </div>
        <div className="serif text-3xl mt-1">
          {mode === "signup" ? "Join the record" : "Sign in"}
        </div>
        <div className="text-[13px] text-white/50 mt-2 leading-relaxed">
          Sync your bookmarks, quiz scores, and settings across devices.
        </div>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          {mode === "signup" && (
            <input
              type="text" placeholder="Name" value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 h-11 text-sm outline-none focus:border-white/30"
            />
          )}
          <input
            type="email" placeholder="Email" value={email} required
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 h-11 text-sm outline-none focus:border-white/30"
          />
          <input
            type="password" placeholder="Password (min 8 characters)" value={password} required minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 h-11 text-sm outline-none focus:border-white/30"
          />
          {err && <div className="text-[12px] text-red-300/90">{err}</div>}
          <button type="submit" disabled={busy}
            className="h-11 rounded-lg mono text-[11px] uppercase tracking-[0.2em] font-medium text-black transition hover:scale-[1.01] disabled:opacity-50"
            style={{ background: "var(--accent, #34d399)" }}>
            {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-[12px] text-white/45">
          <button onClick={() => { setErr(""); setMode(mode === "signup" ? "signin" : "signup"); eeSound.hover(); }}
            className="hover:text-white/80 transition">
            {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
          <button onClick={onClose} className="hover:text-white/80 transition" aria-label="Close">
            <Icons.X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
