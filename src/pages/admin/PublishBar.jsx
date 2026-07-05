import { useState } from "react";
import { adminApi } from "../../lib/adminApi.js";

// Sticky action to push drafts live. Surfaces the validator's specific problem
// on a 409 so the editor knows exactly what to fix.
export default function PublishBar({ note }) {
  const [state, setState] = useState({ status: "idle", msg: "" });

  const publish = async () => {
    setState({ status: "busy", msg: "" });
    try {
      const { version } = await adminApi.publish();
      setState({ status: "ok", msg: `Published live as v${version}.` });
    } catch (e) {
      setState({ status: "err", msg: e.message });
    }
  };

  return (
    <div className="mt-8 glass-solid rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap sticky bottom-4">
      <div className="text-[13px] text-white/60">
        {note || "Edits are drafts until published."}
        {state.status === "ok" && <span className="ml-2 text-emerald-300">{state.msg}</span>}
        {state.status === "err" && <span className="ml-2 text-red-300">Blocked: {state.msg}</span>}
      </div>
      <button onClick={publish} disabled={state.status === "busy"}
        className="h-10 px-6 rounded-full mono text-[10px] uppercase tracking-[0.22em] font-medium text-black transition hover:scale-[1.02] disabled:opacity-50"
        style={{ background: "var(--primary, #5af0b3)" }}>
        {state.status === "busy" ? "Publishing…" : "Publish live"}
      </button>
    </div>
  );
}
