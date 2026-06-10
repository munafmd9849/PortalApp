/**
 * Proxy Metered TURN credentials so the secret key never reaches the browser.
 */

const DEFAULT_DOMAIN = 'portalpw.metered.live';

export async function getTurnIceServers(req, res) {
  try {
    const domain = process.env.METERED_DOMAIN?.trim() || DEFAULT_DOMAIN;
    const apiKey = process.env.METERED_TURN_API_KEY?.trim();

    if (!apiKey) {
      return res.status(503).json({
        error: 'TURN not configured',
        message:
          'Set METERED_TURN_API_KEY in backend/.env (Credential API Key from Metered dashboard → TURN → Show API Key).',
      });
    }

    const url = `https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('[webrtc] Metered TURN fetch failed:', response.status, body);
      return res.status(502).json({
        error: 'Failed to fetch TURN credentials',
        message:
          'Check METERED_DOMAIN and METERED_TURN_API_KEY in backend/.env. Use the Credential API Key, not the Secret Key.',
      });
    }

    const iceServers = await response.json();
    if (!Array.isArray(iceServers)) {
      return res.status(502).json({ error: 'Invalid TURN response from Metered' });
    }

    res.json({ iceServers });
  } catch (error) {
    console.error('[webrtc] getTurnIceServers:', error);
    res.status(500).json({ error: 'Failed to load TURN configuration' });
  }
}
