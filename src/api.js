const K = 'ap_token';
export const setTok = t => (t ? localStorage.setItem(K, t) : localStorage.removeItem(K));
export async function api(path, body) {
  const t = localStorage.getItem(K);
  const r = await fetch('/api' + path, { method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: body && JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong.');
  return j;
}
