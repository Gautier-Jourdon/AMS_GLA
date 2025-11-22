import fetch from "node-fetch";

export async function fetchJSON(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`[FETCHER] Erreur HTTP ${res.status} sur ${url}`);
  }

  return res.json();
}