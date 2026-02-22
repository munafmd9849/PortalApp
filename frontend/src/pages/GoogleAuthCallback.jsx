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
    // If we have successful tokens from Google
    if (accessToken && refreshToken) {
      // Store the tokens directly in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      try {
        // Decode the JWT payload to check role and status
        const payload = JSON.parse(atob(accessToken.split('.')[1]));

        if (payload.role === 'ADMIN' && payload.status === 'PENDING') {
          // Redirect back to home with a specific message for pending admins
          window.location.replace('/?error=' + encodeURIComponent('Your admin access is pending approval from the Super Admin.'));
          return;
        }
      } catch (e) {
        console.error('Failed to parse token in GoogleAuthCallback', e);
      }

      // Redirect back to the main app where AuthContext will load the user
      window.location.replace('/');
    } else if (error || message) {
      // If there was an error, redirect back to home with the error message
      window.location.replace(`/?error=${encodeURIComponent(message || error || 'Google login failed')}`);
    } else {
      // Fallback redirect
      window.location.replace('/');
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
