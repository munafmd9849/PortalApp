import React from 'react';
import ResetPasswordForm from '../components/auth/ResetPasswordForm';
import { useNavigate } from 'react-router-dom';

export default function AuthForgot() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">Reset password</h1>
        <ResetPasswordForm onSuccess={() => {}} />
        <button className="mt-3 text-sm text-blue-600" onClick={() => navigate('/login')}>Back to login</button>
      </div>
    </div>
  );
}


