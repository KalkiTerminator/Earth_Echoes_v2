import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/adminApi.js";
import PublishBar from "./PublishBar.jsx";

export default function SpeciesList() {
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState("");

  const load = () => adminApi.getAtlas().then(setDoc).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm(`Delete "${id}"? This is a draft change until you publish.`)) return;
    await adminApi.deleteSpecies(id);
    load();
  };

  if (err) return <div className="text-red-300 text-sm">{err}</div>;
  if (!doc) return <div className="mono text-[11px] text-white/40 uppercase tracking-[0.2em]">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="text-white/60 text-sm">{doc.species.length} species</div>
        <Link to="/admin/species/new"
          className="mono text-[11px] uppercase tracking-[0.2em] px-4 h-9 flex items-center rounded-full text-black font-medium"
          style={{ background: "var(--primary, #5af0b3)" }}>
          + New species
        </Link>
      </div>

      <div className="grid gap-2">
        {doc.species.map((s) => (
          <div key={s.id} className="glass rounded-xl px-4 py-3 flex items-center gap-4">
            <span className="w-2 h-2 rounded-full shrink-0"
              style={{ background: doc.habitats[s.habitat]?.color || "#888" }} />
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{s.name}</div>
              <div className="mono text-[10px] text-white/40 truncate">
                {s.id} · {s.status || "—"} · {s.habitat}
              </div>
            </div>
            <Link to={`/admin/species/${s.id}`}
              className="mono text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white transition">
              Edit
            </Link>
            <button onClick={() => remove(s.id)}
              className="mono text-[10px] uppercase tracking-[0.2em] text-red-300/70 hover:text-red-300 transition">
              Delete
            </button>
          </div>
        ))}
      </div>

      <PublishBar note={`${doc.species.length} species in the draft.`} />
    </div>
  );
}
