import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const redirect = params.get('redirect') || '/';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      // Use role from auth context
      const { role } = useAuth();
      if (role === 'student') navigate('/student', { replace: true });
      else if (role === 'recruiter') navigate('/recruiter', { replace: true });
      else if (role === 'admin') navigate('/admin', { replace: true });
      else navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">Login</h1>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <input className="w-full border px-3 py-2 rounded mb-2" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full border px-3 py-2 rounded mb-4" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full bg-black text-white py-2 rounded">Sign in</button>
      </form>
    </div>
  );
}


