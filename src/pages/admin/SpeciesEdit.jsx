import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminApi } from "../../lib/adminApi.js";

const BLANK = {
  id: "", name: "", scientific: "", status: "", habitat: "", habitatLabel: "",
  lat: 0, lng: 0, yearExtinct: null, population: "", threats: [], iconicAction: "",
  description: "", imageUrl: "", imageRemote: "", youtube: "", threatClass: "",
  popCount: null, help: [], audioUrl: "", published: true,
};

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mono text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 h-10 text-sm outline-none focus:border-white/30";

function UploadButton({ label, kind, onUploaded }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={`mono text-[10px] uppercase tracking-[0.18em] px-3 h-9 inline-flex items-center rounded-lg border border-white/15 cursor-pointer hover:border-white/40 transition ${busy ? "opacity-50" : ""}`}>
      {busy ? "Uploading…" : label}
      <input type="file" hidden accept={kind === "audio" ? "audio/*" : "image/*"}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try { const { url } = await adminApi.upload(f); onUploaded(url); }
          catch (err) { alert(err.message); }
          setBusy(false);
        }} />
    </label>
  );
}

export default function SpeciesEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [sp, setSp] = useState(BLANK);
  const [habitats, setHabitats] = useState({});
  const [threats, setThreats] = useState({});
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getAtlas().then((doc) => {
      setHabitats(doc.habitats);
      setThreats(doc.threatClasses || {});
      if (!isNew) {
        const found = doc.species.find((s) => s.id === id);
        if (found) setSp({ ...BLANK, ...found });
        else setErr("Species not found.");
      }
    }).catch((e) => setErr(e.message));
  }, [id]);

  const set = (k, v) => setSp((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setErr("");
    setSaving(true);
    try {
      const payload = {
        ...sp,
        lat: Number(sp.lat), lng: Number(sp.lng),
        yearExtinct: sp.yearExtinct === "" || sp.yearExtinct === null ? null : Number(sp.yearExtinct),
        popCount: sp.popCount === "" || sp.popCount === null ? null : Number(sp.popCount),
        threats: Array.isArray(sp.threats) ? sp.threats : String(sp.threats).split("\n").map((t) => t.trim()).filter(Boolean),
        help: Array.isArray(sp.help) ? sp.help : String(sp.help).split("\n").map((t) => t.trim()).filter(Boolean),
      };
      await adminApi.saveSpecies(payload, isNew);
      navigate("/admin");
    } catch (e) {
      setErr(e.issues ? `${e.message}: ${e.issues.map((i) => i.message).join(", ")}` : e.message);
      setSaving(false);
    }
  };

  const asLines = (v) => (Array.isArray(v) ? v.join("\n") : v || "");

  return (
    <div className="max-w-2xl">
      <div className="serif text-2xl mb-6">{isNew ? "New species" : `Edit — ${sp.name || id}`}</div>
      {err && <div className="text-red-300 text-sm mb-4">{err}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="ID (slug)">
          <input className={inputCls} value={sp.id} disabled={!isNew}
            onChange={(e) => set("id", e.target.value)} placeholder="lowercase-slug" />
        </Field>
        <Field label="Name">
          <input className={inputCls} value={sp.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Scientific name">
          <input className={inputCls} value={sp.scientific || ""} onChange={(e) => set("scientific", e.target.value)} />
        </Field>
        <Field label="Status">
          <input className={inputCls} value={sp.status || ""} onChange={(e) => set("status", e.target.value)} placeholder="Critically Endangered" />
        </Field>
        <Field label="Habitat">
          <select className={inputCls} value={sp.habitat} onChange={(e) => set("habitat", e.target.value)}>
            <option value="">Select…</option>
            {Object.keys(habitats).map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </Field>
        <Field label="Habitat label">
          <input className={inputCls} value={sp.habitatLabel || ""} onChange={(e) => set("habitatLabel", e.target.value)} />
        </Field>
        <Field label="Latitude">
          <input className={inputCls} type="number" step="any" value={sp.lat} onChange={(e) => set("lat", e.target.value)} />
        </Field>
        <Field label="Longitude">
          <input className={inputCls} type="number" step="any" value={sp.lng} onChange={(e) => set("lng", e.target.value)} />
        </Field>
        <Field label="Year extinct (blank = extant, negative = BCE)">
          <input className={inputCls} type="number" value={sp.yearExtinct ?? ""} onChange={(e) => set("yearExtinct", e.target.value)} />
        </Field>
        <Field label="Population (text)">
          <input className={inputCls} value={sp.population || ""} onChange={(e) => set("population", e.target.value)} />
        </Field>
        <Field label="Population count (number, optional)">
          <input className={inputCls} type="number" value={sp.popCount ?? ""} onChange={(e) => set("popCount", e.target.value)} />
        </Field>
        <Field label="Threat class">
          <select className={inputCls} value={sp.threatClass || ""} onChange={(e) => set("threatClass", e.target.value)}>
            <option value="">None</option>
            {Object.keys(threats).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 mt-4">
        <Field label="Description">
          <textarea className={inputCls + " h-28 py-2"} value={sp.description || ""} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Iconic action">
          <input className={inputCls} value={sp.iconicAction || ""} onChange={(e) => set("iconicAction", e.target.value)} />
        </Field>
        <Field label="Threats (one per line)">
          <textarea className={inputCls + " h-20 py-2"} value={asLines(sp.threats)} onChange={(e) => set("threats", e.target.value)} />
        </Field>
        <Field label="How to help (one per line)">
          <textarea className={inputCls + " h-20 py-2"} value={asLines(sp.help)} onChange={(e) => set("help", e.target.value)} />
        </Field>
        <Field label="Image URL">
          <div className="flex gap-2">
            <input className={inputCls} value={sp.imageUrl || ""} onChange={(e) => set("imageUrl", e.target.value)} />
            <UploadButton label="Upload" kind="image" onUploaded={(url) => set("imageUrl", url)} />
          </div>
        </Field>
        {sp.imageUrl && <img src={sp.imageUrl} alt="" className="h-32 w-auto rounded-lg object-cover" />}
        <Field label="Remote image fallback URL">
          <input className={inputCls} value={sp.imageRemote || ""} onChange={(e) => set("imageRemote", e.target.value)} />
        </Field>
        <Field label="Audio URL (optional)">
          <div className="flex gap-2">
            <input className={inputCls} value={sp.audioUrl || ""} onChange={(e) => set("audioUrl", e.target.value)} />
            <UploadButton label="Upload" kind="audio" onUploaded={(url) => set("audioUrl", url)} />
          </div>
        </Field>
        <Field label="YouTube embed URL">
          <input className={inputCls} value={sp.youtube || ""} onChange={(e) => set("youtube", e.target.value)} placeholder="https://www.youtube.com/embed/…" />
        </Field>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="h-10 px-6 rounded-full mono text-[10px] uppercase tracking-[0.22em] font-medium text-black disabled:opacity-50"
          style={{ background: "var(--primary, #5af0b3)" }}>
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button onClick={() => navigate("/admin")}
          className="h-10 px-6 rounded-full mono text-[10px] uppercase tracking-[0.22em] border border-white/15 text-white/70 hover:text-white transition">
          Cancel
        </button>
        <span className="text-[12px] text-white/40">Save, then Publish from the species list to go live.</span>
      </div>
    </div>
  );
}
