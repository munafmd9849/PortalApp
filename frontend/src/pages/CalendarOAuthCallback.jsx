/**
 * Calendar OAuth Callback (Frontend)
 * Loaded in the OAuth popup after backend redirects here.
 * Same origin as opener, so window.close() works reliably.
 *
 * Flow:
 * 1. Backend finishes OAuth, redirects popup to /calendar/oauth-callback?status=...
 * 2. This page loads (same origin as opener)
 * 3. We postMessage to opener, then call window.close()
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const CalendarOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const status = searchParams.get('status') || 'FAILED';
    const reason = searchParams.get('reason') || null;
    const calendarEmail = searchParams.get('calendarEmail') || null;
    const error = searchParams.get('error') || null;

    const result = {
      type: 'GOOGLE_CALENDAR_RESULT',
      status,
      reason: reason || undefined,
      calendarEmail: calendarEmail || undefined,
      error: error || undefined,
    };

    // Notify opener (parent window)
    if (window.opener) {
      window.opener.postMessage(result, window.location.origin);
    }

    setDone(true);

    // Close popup - same origin as opener, so this works
    const t = setTimeout(() => {
      window.close();
    }, 800);

    return () => clearTimeout(t);
  }, [searchParams]);

  const status = searchParams.get('status') || 'FAILED';
  const isSuccess = status === 'SUCCESS';

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        margin: 0,
        background: isSuccess ? '#f0f9ff' : '#fef2f2',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '400px',
        }}
      >
        {isSuccess ? (
          <>
            <div style={{ color: '#10b981', fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h2 style={{ color: '#333', margin: '0 0 1rem 0' }}>Google Calendar Connected!</h2>
            <p style={{ color: '#666', margin: '0.5rem 0' }}>This window will close automatically...</p>
          </>
        ) : (
          <>
            <div style={{ color: '#ef4444', fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#333', margin: '0 0 1rem 0' }}>Connection Failed</h2>
            <p style={{ color: '#666', margin: '0.5rem 0' }}>
              {searchParams.get('error') || 'Failed to connect Google Calendar.'}
            </p>
            <p style={{ color: '#666', margin: '0.5rem 0', fontSize: '14px' }}>
              This window will close automatically...
            </p>
          </>
        )}
        {done && (
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#9ca3af' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); window.close(); return false; }} style={{ color: '#3b82f6', textDecoration: 'underline' }}>
              Close this window
            </a>{' '}
            if it doesn&apos;t close automatically
          </p>
        )}
      </div>
    </div>
  );
};

export default CalendarOAuthCallback;
