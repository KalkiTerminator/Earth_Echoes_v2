// Bridges localStorage per-user state with the server when signed in.
// Anonymous users are untouched — localStorage remains the source of truth.
// On login we merge (bookmarks unioned, other fields server-wins-if-set),
// then debounced-push subsequent changes. All failures are silent.
import { apiFetch, API_URL } from "./apiBase.js";

export async function loadRemoteState() {
  const res = await apiFetch("/api/me/state");
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Called once when a session becomes available. Pushes the local snapshot up
// with ?merge=1 so the server reconciles, then returns the merged result the
// UI should adopt. `local` = { bookmarks, birthYear, config, soundOn }.
export async function mergeOnLogin(local) {
  const res = await apiFetch("/api/me/state?merge=1", {
    method: "PUT",
    body: JSON.stringify(local),
  });
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

let timer = null;
let pending = {};

// Debounced partial push. Coalesces rapid changes (e.g. dragging tweaks).
export function pushState(partial) {
  if (!API_URL) return;
  pending = { ...pending, ...partial };
  clearTimeout(timer);
  timer = setTimeout(() => {
    const body = pending;
    pending = {};
    apiFetch("/api/me/state", { method: "PUT", body: JSON.stringify(body) });
  }, 1500);
}

export async function saveQuizScore(total, rounds) {
  await apiFetch("/api/me/quiz-scores", {
    method: "POST",
    body: JSON.stringify({ total, rounds }),
  });
}
