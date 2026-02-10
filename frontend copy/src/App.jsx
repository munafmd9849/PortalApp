import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import LandingPageDuplicate from '../LandingPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import DevTeam from './components/landing/DevTeam'
import ProtectedRoute from './components/ProtectedRoute'
import StudentDashboard from './pages/dashboard/StudentDashboard'
import RecruiterDashboard from './pages/dashboard/RecruiterDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import InterviewSessionPage from './pages/InterviewSessionPage'
import InterviewSessionToken from './pages/InterviewSessionToken'
import InterviewerDashboard from './pages/interview/InterviewerDashboard'
import InterviewerRoundEvaluation from './pages/interview/InterviewerRoundEvaluation'
import Assessment from './pages/Assessment'
import RecruiterScreening from './pages/recruiter/RecruiterScreening'
import JobDescriptionPage from './pages/JobDescriptionPage'
import Unsubscribe from './pages/Unsubscribe'
import ResetPassword from './pages/ResetPassword'
import Endorsement from './pages/Endorsement'
import PublicProfile from './pages/PublicProfile'
import { useAuth } from './hooks/useAuth'
import { AuthProvider } from './context/AuthContextJWT'
import AuthRedirect from './components/AuthRedirect'
import { ToastProvider } from './components/ui/Toast'

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <AuthRedirect />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPageDuplicate />} />
        <Route path="/login" element={<AuthPage defaultMode="login" />} />
        <Route path="/signup" element={<AuthPage defaultMode="register" />} />
        <Route path="/forgot" element={<AuthPage defaultMode="forgot" />} />
        <Route path="/dev-team" element={<DevTeam />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile/:publicProfileId" element={<PublicProfile />} />
        <Route path="/endorse/:token" element={<Endorsement />} />
        <Route path="/endorsement/:token" element={<Endorsement />} /> {/* Legacy route support */}
        <Route path="/interview/:token" element={<InterviewSessionToken />} /> {/* Legacy token-based interview session */}
        <Route path="/interview/session/:sessionId" element={<InterviewerDashboard />} /> {/* New interviewer dashboard */}
        <Route path="/interview/round/:roundId" element={<InterviewerRoundEvaluation />} /> {/* Interviewer round evaluation */}
        <Route path="/recruiter/screening" element={<RecruiterScreening />} /> {/* Token-based recruiter screening (no login) */}
        <Route path="/job/:jobId" element={<JobDescriptionPage />} /> {/* Job Description Page */}

        {/* Protected routes */}
        <Route element={<ProtectedRoute allowRoles={['student']} />}>
          <Route path="/student" element={<StudentDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowRoles={['recruiter']} />}>
          <Route path="/recruiter" element={<RecruiterDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowRoles={['admin']} />}>
          <Route path="/admin/interview-session/:interviewId" element={<InterviewSessionPage />} />
          <Route path="/admin/assessment/:interviewId/:roundName" element={<Assessment />} />
          <Route path="/admin/job/:jobId" element={<AdminDashboard />} />
          <Route path="/admin/jobs/:jobId/applications" element={<AdminDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Interviewer routes (token-based, no auth required) */}
        <Route path="/interview/session/:sessionId" element={<InterviewerDashboard />} />
        <Route path="/interview/round/:roundId" element={<InterviewerRoundEvaluation />} />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  )
}

export default App;
