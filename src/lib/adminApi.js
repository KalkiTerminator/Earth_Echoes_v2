// Thin admin API helpers over apiFetch. Each returns parsed JSON or throws
// with the server's error message so forms can surface it.
import { apiFetch, API_URL } from "./apiBase.js";

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.problem || body.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.issues = body.issues;
    throw err;
  }
  return body;
}

export const adminApi = {
  async getAtlas() {
    return json(await apiFetch("/api/admin/atlas"));
  },
  async saveSpecies(sp, isNew) {
    const path = isNew ? "/api/admin/species" : `/api/admin/species/${sp.id}`;
    return json(await apiFetch(path, { method: isNew ? "POST" : "PUT", body: JSON.stringify(sp) }));
  },
  async deleteSpecies(id) {
    return json(await apiFetch(`/api/admin/species/${id}`, { method: "DELETE" }));
  },
  async saveHabitat(h) {
    return json(await apiFetch("/api/admin/habitats", { method: "POST", body: JSON.stringify(h) }));
  },
  async deleteHabitat(id) {
    return json(await apiFetch(`/api/admin/habitats/${id}`, { method: "DELETE" }));
  },
  async saveThreat(t) {
    return json(await apiFetch("/api/admin/threat-classes", { method: "POST", body: JSON.stringify(t) }));
  },
  async deleteThreat(id) {
    return json(await apiFetch(`/api/admin/threat-classes/${id}`, { method: "DELETE" }));
  },
  async publish() {
    return json(await apiFetch("/api/admin/publish", { method: "POST" }));
  },
  async upload(file) {
    // Multipart — bypass apiFetch's JSON header.
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(API_URL + "/api/admin/uploads", {
      method: "POST", credentials: "include", body: fd,
    });
    return json(res);
  },
  async analytics(path) {
    return json(await apiFetch(`/api/admin/analytics${path}`));
  },
};
