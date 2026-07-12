import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/adminApi.js";

const card = "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5";
const label = "mono text-[10px] uppercase tracking-[0.25em] text-white/40";
const input = "w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 focus:border-white/40 outline-none";
const btn = "mono text-[11px] uppercase tracking-[0.18em] px-4 h-9 flex items-center rounded-full border border-white/15 text-white/80 hover:border-white/40 hover:text-white transition disabled:opacity-40";

const BLANK_JOB = { name: "", domain: "species", schedule: "", enabled: true,
  params: { count: 5, taxon: "", names: "", autoPublish: false, confidenceThreshold: 0.8 } };

export default function Agents() {
  const [usage, setUsage] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [quick, setQuick] = useState({ count: 5, taxon: "", names: "", autoPublish: false, confidenceThreshold: 0.8 });
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [draft, setDraft] = useState(null); // job being created/edited
  const [err, setErr] = useState("");

  const load = () => {
    adminApi.usage().then(setUsage).catch(() => {});
    adminApi.listAgents().then(setJobs).catch(() => {});
  };
  useEffect(load, []);

  const paramsFrom = (p) => ({
    count: Number(p.count) || 5,
    autoPublish: !!p.autoPublish,
    confidenceThreshold: Number(p.confidenceThreshold) || 0.8,
    ...(p.names?.trim() ? { names: p.names.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) } : {}),
    ...(p.taxon?.trim() ? { taxon: p.taxon.trim() } : {}),
  });

  async function runNow() {
    setErr(""); setRunning(true); setLastRun(null);
    try {
      const { runId } = await adminApi.runAdhoc(paramsFrom(quick));
      setLastRun(runId);
    } catch (e) { setErr(e.message); }
    finally { setRunning(false); }
  }

  async function saveJob() {
    setErr("");
    try {
      const isNew = !draft.id;
      const payload = { name: draft.name, domain: draft.domain,
        schedule: draft.schedule?.trim() || null, enabled: draft.enabled,
        params: paramsFrom(draft.params) };
      if (!isNew) payload.id = draft.id;
      await adminApi.saveAgent(payload, isNew);
      setDraft(null); load();
    } catch (e) { setErr(e.message); }
  }

  const pct = usage ? Math.min(100, Math.round((usage.monthCents / usage.monthlyCapCents) * 100)) : 0;

  return (
    <div className="space-y-6">
      {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{err}</div>}

      {/* Cost meter */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <div className={label}>This month's ingestion spend</div>
          <div className="mono text-xs text-white/50">${((usage?.monthCents ?? 0) / 100).toFixed(2)} / ${((usage?.monthlyCapCents ?? 0) / 100).toFixed(2)} cap</div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 85 ? "#f87171" : "var(--primary,#5af0b3)" }} />
        </div>
      </div>

      {/* Quick run */}
      <div className={card}>
        <div className="serif text-xl mb-1">Run agent</div>
        <p className="text-sm text-white/50 mb-4">Acquire species from GBIF · IUCN · Wikimedia · iNaturalist · Wikidata, synthesize with Claude, cross-validate with Gemini, and stage them for review.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className={label}>How many</div>
            <input className={input} type="number" min="1" max="25" value={quick.count}
              onChange={(e) => setQuick({ ...quick, count: e.target.value })} />
          </div>
          <div>
            <div className={label}>Confidence to auto-publish</div>
            <input className={input} type="number" min="0" max="1" step="0.05" value={quick.confidenceThreshold}
              onChange={(e) => setQuick({ ...quick, confidenceThreshold: e.target.value })} />
          </div>
          <div>
            <div className={label}>Higher taxon (discovery)</div>
            <input className={input} placeholder="e.g. Aves, Mammalia" value={quick.taxon}
              onChange={(e) => setQuick({ ...quick, taxon: e.target.value })} />
          </div>
          <div>
            <div className={label}>…or explicit species (comma / newline)</div>
            <input className={input} placeholder="Vaquita, Kakapo, Axolotl" value={quick.names}
              onChange={(e) => setQuick({ ...quick, names: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 mt-4 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" checked={quick.autoPublish}
            onChange={(e) => setQuick({ ...quick, autoPublish: e.target.checked })} />
          Auto-publish above confidence (otherwise everything waits in Review)
        </label>
        <div className="mt-4 flex items-center gap-3">
          <button className={btn} onClick={runNow} disabled={running}>{running ? "Starting…" : "▶ Run now"}</button>
          {lastRun && <Link to="/admin/runs" className="text-sm text-[var(--primary,#5af0b3)] hover:underline">Run started — view progress →</Link>}
        </div>
      </div>

      {/* Saved automations */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <div className="serif text-xl">Saved automations</div>
          <button className={btn} onClick={() => setDraft({ ...BLANK_JOB })}>+ New</button>
        </div>
        {jobs.length === 0 && <div className="text-sm text-white/40">No saved automations yet.</div>}
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] px-4 py-3">
              <div>
                <div className="text-sm text-white/90">{j.name} <span className="text-white/30 mono text-[10px] uppercase">· {j.domain}</span></div>
                <div className="mono text-[11px] text-white/40">{j.schedule ? `cron: ${j.schedule}` : "manual"} · {j.enabled ? "enabled" : "disabled"}</div>
              </div>
              <div className="flex gap-2">
                <button className={btn} onClick={() => adminApi.runAgent(j.id).catch((e) => setErr(e.message))}>Run</button>
                <button className={btn} onClick={() => setDraft({ ...j, params: { ...j.params, names: (j.params?.names || []).join(", ") } })}>Edit</button>
                <button className={btn} onClick={() => adminApi.deleteAgent(j.id).then(load)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Job editor */}
      {draft && (
        <div className={card}>
          <div className="serif text-lg mb-4">{draft.id ? "Edit automation" : "New automation"}</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><div className={label}>Name</div><input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div>
              <div className={label}>Domain</div>
              <select className={input} value={draft.domain} onChange={(e) => setDraft({ ...draft, domain: e.target.value })}>
                <option value="species">species (add new)</option>
                <option value="refresh">refresh (update existing)</option>
              </select>
            </div>
            <div><div className={label}>Count</div><input className={input} type="number" value={draft.params.count} onChange={(e) => setDraft({ ...draft, params: { ...draft.params, count: e.target.value } })} /></div>
            <div><div className={label}>Schedule (cron, blank = manual)</div><input className={input} placeholder="0 6 * * *" value={draft.schedule || ""} onChange={(e) => setDraft({ ...draft, schedule: e.target.value })} /></div>
            <div><div className={label}>Higher taxon</div><input className={input} value={draft.params.taxon || ""} onChange={(e) => setDraft({ ...draft, params: { ...draft.params, taxon: e.target.value } })} /></div>
            <div><div className={label}>Explicit species</div><input className={input} value={draft.params.names || ""} onChange={(e) => setDraft({ ...draft, params: { ...draft.params, names: e.target.value } })} /></div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={draft.params.autoPublish} onChange={(e) => setDraft({ ...draft, params: { ...draft.params, autoPublish: e.target.checked } })} /> auto-publish</label>
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /> enabled</label>
          </div>
          <div className="mt-4 flex gap-2">
            <button className={btn} onClick={saveJob}>Save</button>
            <button className={btn} onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
