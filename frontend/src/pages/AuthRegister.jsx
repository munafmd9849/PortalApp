import React from 'react';
import RegisterForm from '../components/auth/RegisterForm';
import { useNavigate } from 'react-router-dom';

export default function AuthRegister() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">Create an account</h1>
        <RegisterForm onSuccess={() => navigate('/')} />
      </div>
    </div>
  );
}


