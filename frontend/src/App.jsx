import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css'
import Header from './components/landing/Header'
import Banner from './components/landing/Banner'
import WhyPw from './components/landing/WhyPw'
import MasonryStats from './components/landing/stats'
import Preloader from './components/landing/PreLoader'
import OurPartners from './components/landing/OurPartners'
import PWIOIFooter from './components/landing/Footer'
import PlacementTimeline from './components/landing/PlacementTimeline'
import AdminSlider from './components/landing/CareerService'
import PlacementFAQ from './components/landing/FAQs'
import RecruitersSection from './components/landing/founder'
import Records from './components/landing/Records'
import NotificationModal from './components/Notification'
import DevTeam from './components/landing/DevTeam'
import LoginModal from './components/landing/LoginModal'
import ProtectedRoute from './components/ProtectedRoute'
import StudentDashboard from './pages/dashboard/StudentDashboard'
import RecruiterDashboard from './pages/dashboard/RecruiterDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard'
import InterviewSessionPage from './pages/InterviewSessionPage'
import InterviewSessionToken from './pages/InterviewSessionToken'
import InterviewerDashboard from './pages/interview/InterviewerDashboard'
import InterviewerRoundEvaluation from './pages/interview/InterviewerRoundEvaluation'
import Assessment from './pages/Assessment'
import RecruiterScreening from './pages/recruiter/RecruiterScreening'
import JobDescriptionPage from './pages/JobDescriptionPage'
import AuthPage from './pages/AuthPage'
import Unsubscribe from './pages/Unsubscribe'
import ResetPassword from './pages/ResetPassword'
import Endorsement from './pages/Endorsement'
import PublicProfile from './pages/PublicProfile'
import GoogleAuthCallback from './pages/GoogleAuthCallback'
import { useAuth } from './hooks/useAuth'
import { AuthProvider } from './context/AuthContextJWT'
import AuthRedirect from './components/AuthRedirect'
import { ToastProvider } from './components/ui/Toast'

const LANDING_PRELOADER_KEY = 'landingPreloaderSeen';

function LandingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(() => sessionStorage.getItem(LANDING_PRELOADER_KEY) === '1');
  const [timelineAutoplay, setTimelineAutoplay] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginRole, setLoginRole] = useState('Student');

  const triggerTimelineAnimation = () => {
    setTimelineAutoplay(true);
    setTimeout(() => setTimelineAutoplay(false), 3500);
  };

  // Open login/signup as modal on landing page
  const openLoginModal = (type = 'Student') => {
    triggerTimelineAnimation();
    setLoginRole(type);
    setIsLoginOpen(true);
  };

  const handleCloseLoginModal = () => {
    setIsLoginOpen(false);
  };

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-form');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
      // Focus on company name input after scroll
      setTimeout(() => {
        const companyInput = document.querySelector('input[name="name"]');
        if (companyInput) {
          companyInput.focus();
        }
      }, 1000); // Wait for scroll to complete
    }
  };

  const handleMeetDevTeam = () => {
    // Navigate to DevTeam component
    navigate('/dev-team');
  };

  const handleContactTeam = () => {
    // Navigate to founders component
    const foundersSection = document.querySelector('#founders-section');
    if (foundersSection) {
      foundersSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePlacementPolicy = () => {
    // Open placement policy Google Doc
    window.open('https://docs.google.com/document/d/1yEH5gMSux0cCf8UmS1d4p1GpZvL-nRzQHLutu8MrZoY/edit?usp=sharing', '_blank');
  };

  return (
    <>
      {isLoading ? (
        <Preloader onComplete={() => { sessionStorage.setItem(LANDING_PRELOADER_KEY, '1'); setIsLoading(false); }} />
      ) : (
        <main className='w-full min-h-screen'>
          <NotificationModal />

          {/* Global login modal mounted on landing page */}
          <LoginModal
            isOpen={isLoginOpen}
            onClose={handleCloseLoginModal}
            defaultRole={loginRole}
          />

          <Header onLoginOpen={openLoginModal} onScrollToContact={scrollToContact} />

          {/* Banner - Odd component #F2F0EA */}
          <div className='bg-gradient-to-b from-gray-50 to-[#FFEECE] overflow-hidden'>
            <Banner />
          </div>

          {/* WhyPw - Even component #A8D5E3 */}
          <div className='bg-[#FFEECE]'>
            <WhyPw />
          </div>

          {/* Stats - comes under WhyPw, before OurPartners */}
          <div className='bg-[#FFEECE]'>
            <MasonryStats />
          </div>

          {/* OurPartners - Odd component #F2F0EA */}
          <div id="our-partners" className='bg-[#FFEECE]'>
            <OurPartners />
          </div>

          {/* Records - Even component #A8D5E3 */}
          <div className='bg-[#FFEECE]'>
            <Records onLoginOpen={openLoginModal} />
          </div>

          {/* PlacementTimeline - #A8D5E3 background (overflow-x-clip only so sticky image works) */}
          <div className='bg-[#FFEECE] overflow-x-clip'>
            <PlacementTimeline autoplay={timelineAutoplay} />
          </div>

          <div className='bg-[#FFEECE] py-10'>
            <AdminSlider />
          </div>

          {/* FoundersSection - Even component #A8D5E3 */}
          <div className='bg-[#FFEECE]'>
            <RecruitersSection />
          </div>

          <div className='bg-[#FFEECE]'>
            <PlacementFAQ />
          </div>

          {/* Footer - Odd component #F2F0EA */}
          <div>
            <PWIOIFooter 
              onLoginOpen={openLoginModal} 
              onContactTeam={handleContactTeam}
              onMeetDevTeam={handleMeetDevTeam}
              onPlacementPolicy={handlePlacementPolicy}
            />
          </div>
        </main>
      )}

    </>
  )
}

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
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage defaultMode="login" />} />
        <Route path="/signup" element={<AuthPage defaultMode="register" />} />
        <Route path="/forgot" element={<AuthPage defaultMode="forgot" />} />
        <Route path="/dev-team" element={<DevTeam />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/google-callback" element={<GoogleAuthCallback />} />
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

        {/* Admin routes - ADMIN and RECRUITER can access */}
        <Route element={<ProtectedRoute allowRoles={['admin', 'recruiter']} />}>
          <Route path="/admin/interview-session/:interviewId" element={<InterviewSessionPage />} />
          <Route path="/admin/assessment/:interviewId/:roundName" element={<Assessment />} />
          <Route path="/admin/job/:jobId" element={<AdminDashboard />} />
          <Route path="/admin/jobs/:jobId/applications" element={<AdminDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Super Admin routes - SUPER_ADMIN only */}
        <Route element={<ProtectedRoute allowRoles={['super_admin']} />}>
          <Route path="/super-admin/interview-session/:interviewId" element={<InterviewSessionPage />} />
          <Route path="/super-admin/assessment/:interviewId/:roundName" element={<Assessment />} />
          <Route path="/super-admin/job/:jobId" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/jobs/:jobId/applications" element={<SuperAdminDashboard />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
        </Route>
        
        {/* Admin-only routes - Only ADMIN can access */}
        <Route element={<ProtectedRoute allowRoles={['admin']} />}>
          {/* Add admin-only routes here if needed */}
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
