import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import CustomDropdown from '../common/CustomDropdown';
import { FaUser } from 'react-icons/fa';

export default function RegisterForm({ onSuccess }) {
  const { registerWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await registerWithEmail({ email, password, role });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input className="w-full border px-3 py-2 rounded cursor-text" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input className="w-full border px-3 py-2 rounded cursor-text" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      <CustomDropdown
        label="Role"
        icon={FaUser}
        iconColor="text-blue-600"
        options={[
          { value: 'student', label: 'Student' },
          { value: 'recruiter', label: 'Recruiter' }
        ]}
        value={role}
        onChange={(value) => setRole(value)}
        placeholder="Select Role"
      />
      <button disabled={loading} className={`w-full bg-black text-white py-2 rounded ${loading ? 'cursor-not-allowed disabled:opacity-60' : 'cursor-pointer'}`}>{loading ? 'Creating account...' : 'Create account'}</button>
    </form>
  );
}


