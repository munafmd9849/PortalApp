import { API_BASE_URL } from '../config/api.js';

const GOOGLE_STUN = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let cachedIceServers = null;
let fetchPromise = null;

function buildFromEnv() {
  const turnUrl = import.meta.env.VITE_TURN_URL?.trim();
  if (!turnUrl) return null;

  const urls = turnUrl.includes(',')
    ? turnUrl.split(',').map((s) => s.trim()).filter(Boolean)
    : turnUrl;

  const stunUrl = import.meta.env.VITE_TURN_STUN_URL?.trim();
  const servers = stunUrl
    ? [{ urls: stunUrl }, ...GOOGLE_STUN]
    : [...GOOGLE_STUN];

  servers.push({
    urls,
    username: import.meta.env.VITE_TURN_USERNAME?.trim() || '',
    credential: import.meta.env.VITE_TURN_CREDENTIAL?.trim() || '',
  });

  return servers;
}

async function fetchFromBackend() {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${API_BASE_URL}/webrtc/turn-ice-servers`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || `TURN fetch failed (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data.iceServers) || !data.iceServers.length) {
    throw new Error('Empty TURN configuration');
  }
  return data.iceServers;
}

/**
 * ICE servers for RTCPeerConnection: backend Metered proxy → static .env fallback → STUN only.
 */
export async function resolveIceServers() {
  if (cachedIceServers) return cachedIceServers;

  if (!fetchPromise) {
    fetchPromise = (async () => {
      try {
        const fromBackend = await fetchFromBackend();
        cachedIceServers = fromBackend;
        return fromBackend;
      } catch (e) {
        console.warn('[ICE] Backend TURN unavailable:', e?.message);
        const fromEnv = buildFromEnv();
        if (fromEnv) {
          cachedIceServers = fromEnv;
          return fromEnv;
        }
        cachedIceServers = GOOGLE_STUN;
        return GOOGLE_STUN;
      } finally {
        fetchPromise = null;
      }
    })();
  }

  return fetchPromise;
}

export function clearIceServerCache() {
  cachedIceServers = null;
  fetchPromise = null;
}
