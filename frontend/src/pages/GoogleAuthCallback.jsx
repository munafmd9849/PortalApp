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
    // Check if we're in a popup window
    if (window.opener) {
      // We're in a popup - send message to parent
      if (accessToken && refreshToken) {
        window.opener.postMessage({
          type: 'GOOGLE_LOGIN_SUCCESS',
          accessToken,
          refreshToken,
        }, window.location.origin);
        // Close popup after a short delay
        setTimeout(() => {
          window.close();
        }, 100);
      } else if (error) {
        window.opener.postMessage({
          type: 'GOOGLE_LOGIN_ERROR',
          error: message || error,
        }, window.location.origin);
        // Close popup after a short delay
        setTimeout(() => {
          window.close();
        }, 100);
      }
    } else {
      // Not in a popup - redirect to home with error/success
      if (accessToken && refreshToken) {
        // Store tokens and reload
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        window.location.href = '/';
      } else {
        // Redirect to home with error
        const errorMsg = message || error || 'Google login failed';
        window.location.href = `/?error=${encodeURIComponent(errorMsg)}`;
      }
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
