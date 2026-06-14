/**
 * Calendar OAuth Callback — runs inside the Google OAuth popup only.
 * Must NOT load the full portal here; parent tab picks up the result via localStorage.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  broadcastCalendarOAuthResult,
  getCalendarOAuthReturnPath,
  isCalendarOAuthPopup,
} from '../utils/calendarOAuth';

const CalendarOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);
  const [inPopup] = useState(() => isCalendarOAuthPopup());

  useEffect(() => {
    const status = searchParams.get('status') || 'FAILED';
    const reason = searchParams.get('reason') || null;
    const calendarEmail = searchParams.get('calendarEmail') || null;
    const error = searchParams.get('error') || null;

    broadcastCalendarOAuthResult({
      status,
      reason: reason || undefined,
      calendarEmail: calendarEmail || undefined,
      error: error || undefined,
    });

    setDone(true);

    const tryClose = () => {
      try {
        window.close();
      } catch {
        /* ignore */
      }
    };

    tryClose();
    const closeTimer = setTimeout(tryClose, 400);
    const closeTimer2 = setTimeout(tryClose, 1200);

    // Only redirect when this page was opened in the main tab (not the OAuth popup).
    if (!inPopup) {
      const returnTo = getCalendarOAuthReturnPath();
      const redirectTimer = setTimeout(() => {
        window.location.replace(returnTo);
      }, 1500);
      return () => {
        clearTimeout(closeTimer);
        clearTimeout(closeTimer2);
        clearTimeout(redirectTimer);
      };
    }

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(closeTimer2);
    };
  }, [searchParams, inPopup]);

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
        padding: 24,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '420px',
        }}
      >
        {isSuccess ? (
          <>
            <div style={{ color: '#10b981', fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h2 style={{ color: '#333', margin: '0 0 1rem 0' }}>Google Calendar Connected!</h2>
            <p style={{ color: '#666', margin: '0.5rem 0', lineHeight: 1.5 }}>
              {inPopup
                ? 'Close this window and return to the Calendar tab in your main portal window.'
                : 'Redirecting you back to the portal…'}
            </p>
          </>
        ) : (
          <>
            <div style={{ color: '#ef4444', fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#333', margin: '0 0 1rem 0' }}>Connection Failed</h2>
            <p style={{ color: '#666', margin: '0.5rem 0', lineHeight: 1.5 }}>
              {searchParams.get('error') || 'Failed to connect Google Calendar.'}
            </p>
            {inPopup && (
              <p style={{ color: '#666', margin: '0.5rem 0', fontSize: '14px' }}>
                Close this window and try again from the portal Calendar page.
              </p>
            )}
          </>
        )}
        {done && inPopup && (
          <button
            type="button"
            onClick={() => window.close()}
            style={{
              marginTop: 20,
              padding: '10px 20px',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Close this window
          </button>
        )}
      </div>
    </div>
  );
};

export default CalendarOAuthCallback;
