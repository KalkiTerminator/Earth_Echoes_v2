import { useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import SpeciesList from "./SpeciesList.jsx";
import SpeciesEdit from "./SpeciesEdit.jsx";
import Taxonomy from "./Taxonomy.jsx";
import Analytics from "./Analytics.jsx";
import Agents from "./Agents.jsx";
import Runs from "./Runs.jsx";
import ReviewQueue from "./ReviewQueue.jsx";
import AuditLog from "./AuditLog.jsx";
import "../../styles/index.css";

const NAV = [
  { to: "/admin", label: "Species", end: true },
  { to: "/admin/agents", label: "Agents" },
  { to: "/admin/review", label: "Review" },
  { to: "/admin/runs", label: "Runs" },
  { to: "/admin/taxonomy", label: "Habitats & threats" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/audit", label: "Audit" },
];

// Guards the whole admin area: redirects anyone who isn't a signed-in admin
// back to the atlas. Client gating is UX only — every admin API call is
// re-checked server-side.
export default function AdminLayout() {
  const { enabled, user, isAdmin, isPending } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!enabled) { navigate("/", { replace: true }); return; }
    if (!isPending && (!user || !isAdmin)) navigate("/atlas", { replace: true });
  }, [enabled, user, isAdmin, isPending]);

  if (!enabled || isPending || !user || !isAdmin) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#060608" }}>
        <div className="mono text-[10px] uppercase tracking-[0.4em] text-white/30 animate-pulse">
          Checking credentials…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#060608", color: "#f5f5f4" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.3em] text-white/40">Earth's Echoes</div>
            <div className="serif text-3xl">Admin</div>
          </div>
          <Link to="/atlas" className="mono text-[11px] uppercase tracking-[0.2em] px-4 h-9 flex items-center rounded-full border border-white/15 text-white/70 hover:border-white/40 hover:text-white transition">
            ← Back to atlas
          </Link>
        </div>

        <nav className="mt-6 flex gap-2 border-b border-white/[0.08] pb-0">
          {NAV.map((n) => {
            const active = n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={`mono text-[11px] uppercase tracking-[0.18em] px-4 py-2.5 -mb-px border-b-2 transition ${active ? "border-[var(--primary,#5af0b3)] text-white" : "border-transparent text-white/50 hover:text-white/80"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">
          <Routes>
            <Route index element={<SpeciesList />} />
            <Route path="species/new" element={<SpeciesEdit />} />
            <Route path="species/:id" element={<SpeciesEdit />} />
            <Route path="agents" element={<Agents />} />
            <Route path="review" element={<ReviewQueue />} />
            <Route path="runs" element={<Runs />} />
            <Route path="taxonomy" element={<Taxonomy />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="audit" element={<AuditLog />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
