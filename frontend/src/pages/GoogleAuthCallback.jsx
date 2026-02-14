import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Google Auth Callback Page
 * Handles the redirect from Google OAuth and sends tokens to parent window
 */
export default function GoogleAuthCallback() {
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('accessToken');
  const refreshToken = searchParams.get('refreshToken');
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  useEffect(() => {
    const origin = window.location.origin;

    if (window.opener) {
      // Popup with opener: send tokens to parent, then close this popup (try several times – some browsers need it)
      if (accessToken && refreshToken) {
        const payload = {
          type: 'GOOGLE_LOGIN_SUCCESS',
          accessToken,
          refreshToken,
        };
        window.opener.postMessage(payload, origin);
        window.opener.postMessage(payload, origin);
        const tryClose = () => { try { window.close(); } catch (_) {} };
        tryClose();
        setTimeout(tryClose, 50);
        setTimeout(tryClose, 150);
        setTimeout(tryClose, 300);
        setTimeout(() => { window.opener?.postMessage(payload, origin); tryClose(); }, 100);
      } else if (error) {
        window.opener.postMessage({
          type: 'GOOGLE_LOGIN_ERROR',
          error: message || error,
        }, origin);
        setTimeout(() => { try { window.close(); } catch (_) {} }, 300);
      }
    } else if (accessToken && refreshToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      // Popup that lost opener (we open with name 'Google Login'): close so opener finds tokens in localStorage. Try multiple times.
      if (window.name === 'Google Login') {
        const tryClose = () => { try { window.close(); } catch (_) {} };
        tryClose();
        setTimeout(tryClose, 100);
        setTimeout(tryClose, 300);
      } else {
        window.location.replace('/');
      }
    } else if (error) {
      window.location.replace(`/?error=${encodeURIComponent(message || error || 'Google login failed')}`);
    } else {
      window.location.replace(`/?error=${encodeURIComponent(message || error || 'Google login failed')}`);
    }
  }, [accessToken, refreshToken, error, message]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {accessToken && refreshToken ? (
          <>
            <div className="text-green-600 text-xl font-semibold mb-2">Login successful!</div>
            <div className="text-gray-600">Redirecting...</div>
          </>
        ) : error ? (
          <>
            <div className="text-red-600 text-xl font-semibold mb-2">Login failed</div>
            <div className="text-gray-600">{message || error}</div>
          </>
        ) : (
          <div className="text-gray-600">Processing...</div>
        )}
      </div>
    </div>
  );
}
