/**
 * Jitsi embed via iframe — avoids external_api.js which conflicts with
 * Monaco/Vite AMD (window.define) and often never exposes JitsiMeetExternalAPI.
 */

/** Domains that refuse iframe embedding outside their own sites (frame-ancestors CSP). */
const NON_EMBEDDABLE_JITSI_DOMAINS = new Set([
  'meet.ffmuc.net',
  'ffmuc.net',
]);

export function getJitsiDomain() {
  const raw = (import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si').trim();
  const domain = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');

  if (NON_EMBEDDABLE_JITSI_DOMAINS.has(domain)) {
    console.warn(
      `[Jitsi] "${domain}" blocks iframe embedding on localhost/external apps. Using meet.jit.si instead.`
    );
    return 'meet.jit.si';
  }

  return domain || 'meet.jit.si';
}

export function measureContainer(container) {
  const rect = container.getBoundingClientRect();
  return {
    width: Math.max(Math.floor(rect.width), 320),
    height: Math.max(Math.floor(rect.height), 240),
  };
}

export function waitForContainer(containerRef, minHeight = 80, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tick = () => {
      const el = containerRef.current;
      if (el) {
        const { height, width } = measureContainer(el);
        if (height >= minHeight && width >= minHeight) {
          resolve(el);
          return;
        }
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        reject(new Error('Video container not ready'));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export function buildJitsiEmbedUrl(domain, roomName, displayName) {
  const safeName = (displayName || 'Participant').replace(/"/g, "'");
  const hash = [
    // Force English only (disable browser locale detection e.g. Telugu)
    'config.defaultLanguage=en',
    'interfaceConfig.DEFAULT_LANGUAGE=en',
    'interfaceConfig.LANG_DETECTION=false',
    'config.prejoinPageEnabled=false',
    'config.prejoinConfig.enabled=false',
    'config.enableWelcomePage=false',
    'config.startWithVideoMuted=false',
    'config.startWithAudioMuted=false',
    'config.disableDeepLinking=true',
    'config.enableLobby=false',
    'config.requireDisplayName=false',
    'config.hideConferenceSubject=true',
    'interfaceConfig.SHOW_JITSI_WATERMARK=false',
    'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false',
    'interfaceConfig.MOBILE_APP_PROMO=false',
    'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true',
    `userInfo.displayName="${safeName}"`,
  ].join('&');

  const room = encodeURIComponent(roomName);
  return `https://${domain}/${room}?lang=en#${hash}`;
}

/** Mount Jitsi as a plain iframe (no external_api.js). Returns the iframe element. */
export function mountJitsiIframe(container, { domain, roomName, displayName, onLoad, onError }) {
  // Remove broken external_api.js from earlier attempts (conflicts with Monaco AMD)
  document.getElementById('jitsi-external-api')?.remove();

  const { width, height } = measureContainer(container);
  container.innerHTML = '';

  const iframe = document.createElement('iframe');
  iframe.src = buildJitsiEmbedUrl(domain, roomName, displayName);
  iframe.allow = 'camera; microphone; fullscreen; display-capture; autoplay; clipboard-write';
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
  iframe.style.border = '0';
  iframe.title = 'Mock interview video';

  iframe.onload = () => onLoad?.();
  iframe.onerror = () => onError?.(new Error('Video iframe failed to load'));

  container.appendChild(iframe);
  return iframe;
}

export function resizeJitsiIframe(iframe, container) {
  if (!iframe || !container) return;
  const { width, height } = measureContainer(container);
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
}

export function disposeJitsiEmbed(container) {
  if (!container) return;
  container.innerHTML = '';
}
