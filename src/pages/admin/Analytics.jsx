import { useEffect, useState } from "react";
import { adminApi } from "../../lib/adminApi.js";

function StatCard({ label, value, sub }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="serif text-4xl sm:text-5xl leading-none" style={{ color: "var(--primary,#5af0b3)" }}>{value}</div>
      <div className="mt-2 text-sm">{label}</div>
      {sub && <div className="text-white/40 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

// Minimal inline bar chart (no chart lib — keeps the admin chunk tiny).
function Bars({ data, xKey, yKey, height = 120 }) {
  const max = Math.max(1, ...data.map((d) => Number(d[yKey])));
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 rounded-t transition-all"
          title={`${d[xKey]}: ${d[yKey]}`}
          style={{ height: `${(Number(d[yKey]) / max) * 100}%`, minHeight: 2, background: "var(--primary,#5af0b3)", opacity: 0.35 + 0.65 * (Number(d[yKey]) / max) }} />
      ))}
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [dau, setDau] = useState([]);
  const [signups, setSignups] = useState([]);
  const [top, setTop] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([
      adminApi.analytics("/summary").then(setSummary),
      adminApi.analytics("/timeseries?metric=dau&days=30").then(setDau),
      adminApi.analytics("/timeseries?metric=signups&days=30").then(setSignups),
      adminApi.analytics("/top-species").then(setTop),
      adminApi.analytics("/quiz").then(setQuiz),
      adminApi.analytics("/users").then(setUsers),
    ]).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="text-red-300 text-sm">{err}</div>;
  if (!summary) return <div className="mono text-[11px] text-white/40 uppercase tracking-[0.2em]">Loading…</div>;

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total users" value={summary.users} />
        <StatCard label="New (7 days)" value={summary.newSignups7d} />
        <StatCard label="Active today" value={summary.dau} sub="unique visitors, 24h" />
        <StatCard label="Events today" value={summary.events24h} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3">Daily active users · 30d</div>
          <Bars data={dau} xKey="day" yKey="value" />
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3">Signups · 30d</div>
          <Bars data={signups} xKey="day" yKey="value" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3">Most-viewed species · 30d</div>
          <div className="grid gap-1.5">
            {top.length === 0 && <div className="text-white/40 text-sm">No views recorded yet.</div>}
            {top.map((t) => (
              <div key={t.species} className="flex items-center justify-between text-sm">
                <span>{t.species}</span>
                <span className="mono text-white/50">{t.views}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3">Quiz</div>
          {quiz && (
            <div className="grid grid-cols-3 gap-3">
              <div><div className="serif text-3xl">{quiz.plays}</div><div className="text-xs text-white/50">plays</div></div>
              <div><div className="serif text-3xl">{quiz.avg}</div><div className="text-xs text-white/50">avg score</div></div>
              <div><div className="serif text-3xl">{quiz.best}</div><div className="text-xs text-white/50">best</div></div>
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3">Recent users</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-left mono text-[10px] uppercase tracking-[0.15em]">
                <th className="py-1.5 pr-4">Name</th><th className="py-1.5 pr-4">Email</th>
                <th className="py-1.5 pr-4">Role</th><th className="py-1.5">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-white/[0.06]">
                  <td className="py-1.5 pr-4">{u.name}</td>
                  <td className="py-1.5 pr-4 text-white/60">{u.email}</td>
                  <td className="py-1.5 pr-4">{u.role}</td>
                  <td className="py-1.5 text-white/50 mono text-[11px]">{(u.created_at || "").slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
