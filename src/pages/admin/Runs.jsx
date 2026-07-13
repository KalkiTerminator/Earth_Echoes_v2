import { useEffect, useRef, useState } from "react";
import { adminApi } from "../../lib/adminApi.js";

const card = "rounded-2xl border border-white/[0.08] bg-white/[0.02]";
const badge = (s) => ({
  running: "text-amber-300 border-amber-400/30",
  queued: "text-white/50 border-white/15",
  succeeded: "text-[var(--primary,#5af0b3)] border-[color:var(--primary,#5af0b3)]/30",
  partial: "text-amber-300 border-amber-400/30",
  failed: "text-red-300 border-red-400/30",
}[s] || "text-white/50 border-white/15");

export default function Runs() {
  const [runs, setRuns] = useState([]);
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState(null);
  const timer = useRef(null);

  const load = () => adminApi.listRuns().then(setRuns).catch(() => {});
  useEffect(() => {
    load();
    // Poll while anything is active.
    timer.current = setInterval(() => {
      adminApi.listRuns().then((r) => {
        setRuns(r);
        if (!r.some((x) => x.status === "running" || x.status === "queued")) {
          clearInterval(timer.current);
        }
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(timer.current);
  }, []);

  async function toggle(id) {
    if (open === id) { setOpen(null); setDetail(null); return; }
    setOpen(id); setDetail(null);
    setDetail(await adminApi.getRun(id).catch(() => null));
  }

  return (
    <div className="space-y-3">
      {runs.length === 0 && <div className="text-sm text-white/40">No runs yet. Start one from the Agents tab.</div>}
      {runs.map((r) => {
        const s = r.stats || {};
        return (
          <div key={r.id} className={card}>
            <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => toggle(r.id)}>
              <div className="flex items-center gap-3">
                <span className={`mono text-[10px] uppercase tracking-[0.15em] px-2 py-1 rounded-full border ${badge(r.status)}`}>{r.status}</span>
                <span className="mono text-[11px] text-white/40">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <div className="mono text-[11px] text-white/50">
                {s.candidates ?? 0} staged · {s.approved ?? 0} published · ${((s.costCents ?? 0) / 100).toFixed(3)}
              </div>
            </button>
            {open === r.id && (
              <div className="px-5 pb-5 border-t border-white/[0.06] pt-4">
                {!detail && <div className="text-sm text-white/40">Loading…</div>}
                {detail && (
                  <>
                    {r.error && <div className="text-sm text-red-300 mb-3">{r.error}</div>}
                    {(s.notes || []).length > 0 && (
                      <ul className="mb-3 space-y-1">{s.notes.map((n, i) => <li key={i} className="mono text-[11px] text-white/40">• {n}</li>)}</ul>
                    )}
                    <div className="space-y-1">
                      {(detail.candidates || []).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm">
                          <span className="text-white/80">{c.record?.name} <span className="text-white/30 italic">{c.record?.scientific}</span></span>
                          <span className="mono text-[11px] text-white/40">conf {Number(c.confidence).toFixed(2)} · {c.reviewState}</span>
                        </div>
                      ))}
                      {(detail.candidates || []).length === 0 && <div className="text-sm text-white/40">No candidates.</div>}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
