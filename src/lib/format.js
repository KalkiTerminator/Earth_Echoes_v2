export const MIN_YEAR = -10000;
export const MAX_YEAR = 2026;

export function fmtYear(y) {
  if (y < 0) return `${Math.abs(y).toLocaleString()} BCE`;
  if (y >= MAX_YEAR) return "Present";
  return `${y} CE`;
}

export function statusColor(status) {
  if (status === "Extinct" || status === "Functionally Extinct") return "#ef4444";
  if (status.toLowerCase().includes("critically")) return "#f97316";
  if (status === "Vulnerable") return "#eab308";
  return "#22c55e";
}

export function hexToRgbStr(hex) {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return "52 211 153";
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

// Resolve a root-absolute asset path ("/images/…") against the deploy base,
// so self-hosted assets keep working when the app is served from a subpath
// (e.g. GitHub Pages serves it from /<repo>/). No-op when base is "/".
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export function withBase(path) {
  if (!BASE || typeof path !== "string") return path;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith(BASE + "/")) return path;
  return BASE + path;
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
