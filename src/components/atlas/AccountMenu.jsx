import { useState } from "react";
import { Link } from "react-router-dom";
import { eeSound } from "../../lib/audio.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { Icons } from "../icons.jsx";
import AuthModal from "./AuthModal.jsx";

// Header account control. Hidden entirely when the account layer is disabled
// (no API configured). Signed-out → "Sign in" button; signed-in → avatar
// initial with a dropdown (Admin link when the user is an admin).
export default function AccountMenu({ onAuthed }) {
  const { enabled, user, isAdmin, signOut } = useAuth();
  const [modal, setModal] = useState(false);
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  if (!user) {
    return (
      <>
        <button onClick={() => { eeSound.click(); setModal(true); }}
          onMouseEnter={() => eeSound.hover()}
          className="glass rounded-full h-9 px-4 hidden sm:flex items-center gap-2 text-xs hover:bg-white/[0.04] transition whitespace-nowrap"
          title="Sign in">
          <Icons.Users size={13} /> Sign in
        </button>
        {modal && <AuthModal onClose={() => setModal(false)} onAuthed={onAuthed} />}
      </>
    );
  }

  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button onClick={() => { eeSound.click(); setOpen((o) => !o); }}
        onMouseEnter={() => eeSound.hover()}
        className="w-9 h-9 rounded-full flex items-center justify-center text-black font-medium text-sm transition hover:scale-105"
        style={{ background: "var(--accent, #34d399)" }}
        title={user.email} aria-label="Account menu">
        {initial}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 glass-solid rounded-xl p-2 z-50 caption-enter">
            <div className="px-3 py-2 border-b border-white/[0.07] mb-1">
              <div className="text-sm truncate">{user.name}</div>
              <div className="mono text-[10px] text-white/40 truncate">{user.email}</div>
            </div>
            {isAdmin && (
              <Link to="/admin" onClick={() => { eeSound.click(); setOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/[0.06] transition">
                <Icons.Settings size={13} /> Admin panel
              </Link>
            )}
            <button onClick={() => { eeSound.click(); setOpen(false); signOut(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/[0.06] transition text-left">
              <Icons.X size={13} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
