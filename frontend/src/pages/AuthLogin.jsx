import React from 'react';
import LoginForm from '../components/auth/LoginForm';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthLogin() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSuccess = async (loggedInUser) => {
    // Use role from auth context (updated after login)
    // Navigation will be handled by AuthRedirect component
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">Sign in</h1>
        <LoginForm onSuccess={handleSuccess} enableGoogle={false} />
        <div className="mt-4 text-sm flex justify-between">
          <Link className="text-blue-600" to="/register">Create account</Link>
          <Link className="text-blue-600" to="/forgot">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}


