import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LandingPageDuplicate from '../LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPageDuplicate />} />
      <Route path="/login" element={<AuthPage defaultMode="login" />} />
      <Route path="/signup" element={<AuthPage defaultMode="register" />} />
      <Route path="/forgot" element={<AuthPage defaultMode="forgot" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

