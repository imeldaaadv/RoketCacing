export const API = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:3000');
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API;

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ERROR');
  return data;
}