import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

const Landing = lazy(() => import("./pages/Landing.jsx"));
const Atlas = lazy(() => import("./pages/Atlas.jsx"));

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

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/atlas" element={<Atlas />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
