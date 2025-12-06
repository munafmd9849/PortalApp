import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginForm({ onSuccess, enableGoogle = false, defaultRole = 'student' }) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, role);
      
      // Handle admin pending approval
      if (result.status === 'pending' && result.role === 'admin') {
        setError('Your admin access is pending approval from the Super Admin.');
        return;
      }
      
      if (result.status === 'rejected') {
        setError('Admin access denied.');
        return;
      }
      
      onSuccess?.(result.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await loginWithGoogle();
      onSuccess?.(loggedInUser);
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const getDomainHint = (selectedRole) => {
    switch (selectedRole) {
      case 'student':
        return 'Use your @pwioi.com email address';
      case 'admin':
        return 'Use your @pwioi.live email address';
      case 'recruiter':
        return 'Any valid email address';
      default:
        return '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      
      {/* Role Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Login as:</label>
        <select 
          className="w-full border px-3 py-2 rounded cursor-pointer" 
          value={role} 
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="student">Student</option>
          <option value="recruiter">Recruiter</option>
          <option value="admin">Admin</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">{getDomainHint(role)}</p>
      </div>
      
      {/* Email Input */}
      <input 
        className="w-full border px-3 py-2 rounded cursor-text" 
        placeholder={role === 'student' ? 'yourname@pwioi.com' : role === 'admin' ? 'yourname@pwioi.live' : 'your.email@company.com'}
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        required
      />
      
      {/* Password Input */}
      <input 
        className="w-full border px-3 py-2 rounded cursor-text" 
        placeholder="Password" 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        required
      />
      
      {/* Submit Button */}
      <button 
        disabled={loading} 
        className={`w-full bg-black text-white py-2 rounded ${loading ? 'cursor-not-allowed disabled:opacity-60' : 'cursor-pointer'}`}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
      
      {/* Google Login (if enabled) */}
      {enableGoogle && (
        <button 
          type="button" 
          onClick={handleGoogle} 
          disabled={loading} 
          className={`w-full bg-white border mt-2 py-2 rounded ${loading ? 'cursor-not-allowed disabled:opacity-60' : 'cursor-pointer'}`}
        >
          {loading ? 'Please wait...' : 'Continue with Google'}
        </button>
      )}
    </form>
  );
}


