import { useEffect, useState } from "react";
import { adminApi } from "../../lib/adminApi.js";

const card = "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5";
const label = "mono text-[10px] uppercase tracking-[0.25em] text-white/40";
const btn = "mono text-[11px] uppercase tracking-[0.18em] px-4 h-9 flex items-center rounded-full border transition disabled:opacity-40";

export default function ReviewQueue() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null); // { id, text }

  const load = () => adminApi.listCandidates("pending").then(setItems).catch(() => {});
  useEffect(load, []);

  async function act(id, fn) {
    setErr(""); setBusy(id);
    try { await fn(); load(); } catch (e) { setErr(e.message); }
    finally { setBusy(""); }
  }
  async function saveEdit() {
    let record;
    try { record = JSON.parse(editing.text); } catch { setErr("Invalid JSON"); return; }
    await act(editing.id, async () => { await adminApi.editCandidate(editing.id, record); setEditing(null); });
  }

  if (items.length === 0) return <div className="text-sm text-white/40">Nothing awaiting review. Run an agent to stage candidates.</div>;

  return (
    <div className="space-y-4">
      {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{err}</div>}
      {items.map((c) => {
        const rec = c.record || {};
        const v = c.validation || {};
        const passed = v.pass;
        return (
          <div key={c.id} className={card}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="serif text-xl">{rec.name} <span className="italic text-white/40 text-base">{rec.scientific}</span></div>
                <div className="mono text-[11px] text-white/40 mt-1">
                  {rec.status || "—"} · {rec.habitat} · {rec.lat}, {rec.lng} · {rec.yearExtinct != null ? `†${rec.yearExtinct}` : "extant"}
                </div>
              </div>
              <div className="text-right">
                <div className={`mono text-[10px] uppercase tracking-[0.15em] px-2 py-1 rounded-full border ${passed ? "text-[var(--primary,#5af0b3)] border-[color:var(--primary,#5af0b3)]/30" : "text-amber-300 border-amber-400/30"}`}>
                  {passed ? "validated" : "flagged"} · {Number(c.confidence).toFixed(2)}
                </div>
              </div>
            </div>

            {/* validator flags */}
            {(v.flags || []).length > 0 && (
              <div className="mt-3">
                <div className={label}>Validator flags</div>
                <ul className="mt-1 space-y-1">{v.flags.map((f, i) => <li key={i} className="text-sm text-amber-300/90">⚠ {f}</li>)}</ul>
              </div>
            )}

            <details className="mt-3">
              <summary className={label + " cursor-pointer"}>Synthesized record</summary>
              <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm text-white/70">
                <div className="sm:col-span-2"><span className="text-white/40">description: </span>{rec.description}</div>
                <div><span className="text-white/40">population: </span>{rec.population || "—"}</div>
                <div><span className="text-white/40">threats: </span>{(rec.threats || []).join(", ") || "—"}</div>
                {rec.imageRemote && <div className="sm:col-span-2"><span className="text-white/40">image: </span><a className="text-[var(--primary,#5af0b3)] hover:underline" href={rec.imageRemote} target="_blank" rel="noreferrer">{rec.imageRemote.slice(0, 60)}…</a></div>}
              </div>
            </details>

            <details className="mt-2">
              <summary className={label + " cursor-pointer"}>Per-field verdicts & sources</summary>
              <div className="mt-2 space-y-1">
                {(v.fieldVerdicts || []).map((fv, i) => (
                  <div key={i} className="mono text-[11px] flex items-center gap-2">
                    <span className={fv.supported ? "text-[var(--primary,#5af0b3)]" : "text-red-300"}>{fv.supported ? "✓" : "✗"}</span>
                    <span className="text-white/70">{fv.field}</span>
                    <span className="text-white/30">{fv.note || ""}</span>
                  </div>
                ))}
                <div className="mt-2 mono text-[10px] text-white/30">sources: {(c.rawSources || []).filter((s) => s.ok).map((s) => s.provider).join(", ")}</div>
              </div>
            </details>

            {editing?.id === c.id ? (
              <div className="mt-4">
                <textarea className="w-full h-56 bg-black/40 border border-white/10 rounded-lg p-3 mono text-[11px] text-white/80" value={editing.text}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
                <div className="mt-2 flex gap-2">
                  <button className={btn + " border-[color:var(--primary,#5af0b3)]/40 text-[var(--primary,#5af0b3)]"} onClick={saveEdit}>Save edit</button>
                  <button className={btn + " border-white/15 text-white/70"} onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button disabled={busy === c.id} className={btn + " border-[color:var(--primary,#5af0b3)]/40 text-[var(--primary,#5af0b3)] hover:border-[color:var(--primary,#5af0b3)]"} onClick={() => act(c.id, () => adminApi.approveCandidate(c.id))}>Approve & publish</button>
                <button disabled={busy === c.id} className={btn + " border-white/15 text-white/70 hover:border-white/40"} onClick={() => setEditing({ id: c.id, text: JSON.stringify(rec, null, 2) })}>Edit</button>
                <button disabled={busy === c.id} className={btn + " border-red-400/30 text-red-300 hover:border-red-400/60"} onClick={() => act(c.id, () => adminApi.rejectCandidate(c.id))}>Reject</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
