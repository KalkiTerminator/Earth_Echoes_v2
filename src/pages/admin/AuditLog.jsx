import { useEffect, useState } from "react";
import { adminApi } from "../../lib/adminApi.js";

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  useEffect(() => { adminApi.listAudit().then(setRows).catch(() => {}); }, []);

  if (rows.length === 0) return <div className="text-sm text-white/40">No audit entries yet.</div>;

  return (
    <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="mono text-[10px] uppercase tracking-[0.2em] text-white/40 text-left">
            <th className="px-4 py-3 font-normal">When</th>
            <th className="px-4 py-3 font-normal">Actor</th>
            <th className="px-4 py-3 font-normal">Action</th>
            <th className="px-4 py-3 font-normal">Entity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-white/[0.05] text-white/70">
              <td className="px-4 py-2.5 mono text-[11px] text-white/40 whitespace-nowrap">{new Date(r.ts).toLocaleString()}</td>
              <td className="px-4 py-2.5 mono text-[11px]">{r.actor}</td>
              <td className="px-4 py-2.5">{r.action}</td>
              <td className="px-4 py-2.5 text-white/50">{r.entity ? `${r.entity}${r.entityId ? ` · ${r.entityId}` : ""}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
