import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { loadAtlas } from "./data/atlas.js";

// Pages render synchronously from the atlas dataset, so data loading is
// gated here alongside the code-split import — one Suspense covers both.
const withAtlas = (importer) => lazy(() => Promise.all([importer(), loadAtlas()]).then(([m]) => m));
const Landing = withAtlas(() => import("./pages/Landing.jsx"));
const Atlas = withAtlas(() => import("./pages/Atlas.jsx"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#060608" }}>
      <div className="mono text-[10px] uppercase tracking-[0.4em] text-white/30 animate-pulse">
        Retrieving the record…
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[EarthsEchoes]", error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center" style={{ background: "#060608" }}>
        <div className="serif text-4xl">The record skipped.</div>
        <div className="mono text-[11px] uppercase tracking-[0.25em] text-white/40 max-w-md leading-relaxed">
          Something went wrong rendering the atlas. Reloading usually brings it back.
        </div>
        <button
          onClick={() => location.reload()}
          className="mono text-[11px] uppercase tracking-[0.3em] px-8 h-11 rounded-full border border-white/20 text-white/80 hover:border-white/50 hover:text-white transition">
          Reload
        </button>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <ScrollToTop />
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/atlas" element={<Atlas />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
