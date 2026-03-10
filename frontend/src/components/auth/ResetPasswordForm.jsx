import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { showError, showSuccess } from '../../utils/toast';

export default function ResetPasswordForm({ onSuccess }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      showSuccess('Check your inbox for a reset link.');
      onSuccess?.();
    } catch (err) {
      showError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input className="w-full border px-3 py-2 rounded" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <button disabled={loading} className="w-full bg-black text-white py-2 rounded disabled:opacity-60">{loading ? 'Sending...' : 'Send reset link'}</button>
    </form>
  );
}


