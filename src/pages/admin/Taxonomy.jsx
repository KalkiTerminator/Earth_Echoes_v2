import { useEffect, useState } from "react";
import { adminApi } from "../../lib/adminApi.js";
import PublishBar from "./PublishBar.jsx";

const inputCls = "bg-white/5 border border-white/10 rounded-lg px-3 h-9 text-sm outline-none focus:border-white/30";

export default function Taxonomy() {
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState("");
  const [hab, setHab] = useState({ id: "", label: "", color: "#34d399", rgb: "52 211 153", atmos: "" });
  const [threat, setThreat] = useState({ id: "", label: "", color: "#f87171" });

  const load = () => adminApi.getAtlas().then(setDoc).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const addHabitat = async () => {
    try { await adminApi.saveHabitat(hab); setHab({ id: "", label: "", color: "#34d399", rgb: "52 211 153", atmos: "" }); load(); }
    catch (e) { setErr(e.message); }
  };
  const addThreat = async () => {
    try { await adminApi.saveThreat(threat); setThreat({ id: "", label: "", color: "#f87171" }); load(); }
    catch (e) { setErr(e.message); }
  };

  if (!doc) return <div className="mono text-[11px] text-white/40 uppercase tracking-[0.2em]">Loading…</div>;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {err && <div className="text-red-300 text-sm md:col-span-2">{err}</div>}

      <div>
        <div className="serif text-xl mb-4">Habitats</div>
        <div className="grid gap-2 mb-5">
          {Object.entries(doc.habitats).map(([id, h]) => (
            <div key={id} className="glass rounded-lg px-3 py-2 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: h.color }} />
              <div className="flex-1 text-sm">{h.label} <span className="mono text-[10px] text-white/40">{id}</span></div>
              <button onClick={() => adminApi.deleteHabitat(id).then(load).catch((e) => setErr(e.message))}
                className="mono text-[10px] uppercase tracking-[0.2em] text-red-300/70 hover:text-red-300">Delete</button>
            </div>
          ))}
        </div>
        <div className="glass rounded-xl p-4 grid gap-2">
          <input className={inputCls} placeholder="id (slug)" value={hab.id} onChange={(e) => setHab({ ...hab, id: e.target.value })} />
          <input className={inputCls} placeholder="Label" value={hab.label} onChange={(e) => setHab({ ...hab, label: e.target.value })} />
          <div className="flex gap-2">
            <input className={inputCls + " flex-1"} placeholder="#hex color" value={hab.color} onChange={(e) => setHab({ ...hab, color: e.target.value })} />
            <input className={inputCls + " flex-1"} placeholder="rgb e.g. 52 211 153" value={hab.rgb} onChange={(e) => setHab({ ...hab, rgb: e.target.value })} />
          </div>
          <input className={inputCls} placeholder="atmosphere color (optional)" value={hab.atmos} onChange={(e) => setHab({ ...hab, atmos: e.target.value })} />
          <button onClick={addHabitat} className="h-9 rounded-lg mono text-[10px] uppercase tracking-[0.2em] text-black font-medium mt-1" style={{ background: "var(--primary,#5af0b3)" }}>Add / update habitat</button>
        </div>
      </div>

      <div>
        <div className="serif text-xl mb-4">Threat classes</div>
        <div className="grid gap-2 mb-5">
          {Object.entries(doc.threatClasses || {}).map(([id, t]) => (
            <div key={id} className="glass rounded-lg px-3 py-2 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
              <div className="flex-1 text-sm">{t.label} <span className="mono text-[10px] text-white/40">{id}</span></div>
              <button onClick={() => adminApi.deleteThreat(id).then(load).catch((e) => setErr(e.message))}
                className="mono text-[10px] uppercase tracking-[0.2em] text-red-300/70 hover:text-red-300">Delete</button>
            </div>
          ))}
        </div>
        <div className="glass rounded-xl p-4 grid gap-2">
          <input className={inputCls} placeholder="id (slug)" value={threat.id} onChange={(e) => setThreat({ ...threat, id: e.target.value })} />
          <input className={inputCls} placeholder="Label" value={threat.label} onChange={(e) => setThreat({ ...threat, label: e.target.value })} />
          <input className={inputCls} placeholder="#hex color" value={threat.color} onChange={(e) => setThreat({ ...threat, color: e.target.value })} />
          <button onClick={addThreat} className="h-9 rounded-lg mono text-[10px] uppercase tracking-[0.2em] text-black font-medium mt-1" style={{ background: "var(--primary,#5af0b3)" }}>Add / update threat</button>
        </div>
      </div>

      <div className="md:col-span-2"><PublishBar note="Publish to apply taxonomy changes to the live atlas." /></div>
    </div>
  );
}
