// Privacy-conscious analytics beacon. Honors Do-Not-Track / Global Privacy
// Control, stores only an anonymous UUID (no PII), batches events, and flushes
// via sendBeacon on a size/time threshold and on pagehide. No-ops when no API
// is configured or the user has opted out.
import { API_URL } from "./apiBase.js";

const OPTED_OUT =
  typeof navigator !== "undefined" &&
  (navigator.doNotTrack === "1" ||
    navigator.globalPrivacyControl === true ||
    window.doNotTrack === "1");

const ENABLED = !!API_URL && !OPTED_OUT;

function anonId() {
  try {
    let id = localStorage.getItem("ee_aid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ee_aid", id);
    }
    return id;
  } catch {
    return "00000000-0000-4000-8000-000000000000";
  }
}

// One random id per tab/session, for sessionization in analytics.
const sessionKey = (() => {
  try {
    return crypto.randomUUID().slice(0, 16);
  } catch {
    return "sess";
  }
})();

let queue = [];
let flushTimer = null;

function flush() {
  if (!ENABLED || queue.length === 0) return;
  const batch = queue.slice(0, 20);
  queue = queue.slice(20);
  const payload = JSON.stringify({ events: batch });
  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon) navigator.sendBeacon(API_URL + "/api/events", blob);
    else fetch(API_URL + "/api/events", { method: "POST", body: payload, keepalive: true });
  } catch {
    /* best-effort */
  }
}

export function track(name, props) {
  if (!ENABLED) return;
  queue.push({ anonId: anonId(), sessionKey, name, props: props || {} });
  if (queue.length >= 5) {
    flush();
  } else {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 10_000);
  }
}

if (ENABLED && typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
