import React, { useState, useEffect } from 'react';
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
import LoginModal from './components/landing/LoginModal'
import NotificationModal from './components/Notification'
import DevTeam from './components/landing/DevTeam'
// Placement Policy PDF path
// TODO: Add PlacementPolicy.pdf to frontend/public/ folder
// For now, using a placeholder path - will work once file is added to public/
const placementPolicy = '/PlacementPolicy.pdf' // Served from public/ folder
import ProtectedRoute from './components/ProtectedRoute'
import StudentDashboard from './pages/dashboard/StudentDashboard'
import RecruiterDashboard from './pages/dashboard/RecruiterDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import Login from './pages/Login'
import Unsubscribe from './pages/Unsubscribe'
import ResetPassword from './pages/ResetPassword'
import { useAuth } from './hooks/useAuth'
import { AuthProvider } from './context/AuthContextJWT'
import AuthRedirect from './components/AuthRedirect'
import { ToastProvider } from './components/ui/Toast'

function LandingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true)
  const [timelineAutoplay, setTimelineAutoplay] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loginType, setLoginType] = useState('Student')

  const triggerTimelineAnimation = () => {
    setTimelineAutoplay(true);
    // Reset after animation completes
    setTimeout(() => setTimelineAutoplay(false), 3500);
  };

  const openModal = (type = 'Student') => {
    setLoginType(type);
    setIsModalOpen(true);
    triggerTimelineAnimation();
  };

  const closeModal = () => {
    setIsModalOpen(false);
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
    // Open placement policy PDF (if file exists)
    // TODO: Add PlacementPolicy.pdf to frontend/src/assets/docs/
    const policyUrl = placementPolicy.startsWith('/') 
      ? placementPolicy 
      : placementPolicy;
    
    // Try to open the file, if it fails show a message
    const link = document.createElement('a');
    link.href = policyUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  return (
    <>
      {isLoading ? (
        <Preloader onComplete={() => setIsLoading(false)} />
      ) : (
        <main className='w-full min-h-screen'>
          <NotificationModal />

          <Header onLoginOpen={openModal} onScrollToContact={scrollToContact} />

          {/* Banner - Odd component #F2F0EA */}
          <div className='bg-gradient-to-b from-gray-50 to-[#FFEECE]'>
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
            <Records onLoginOpen={openModal} />
          </div>

          {/* PlacementTimeline - #A8D5E3 background */}
          <div className='bg-[#FFEECE]'>
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
              onLoginOpen={openModal} 
              onContactTeam={handleContactTeam}
              onMeetDevTeam={handleMeetDevTeam}
              onPlacementPolicy={handlePlacementPolicy}
            />
          </div>
        </main>
      )}

      {/* LoginModal rendered at app level for proper centering */}
      <LoginModal isOpen={isModalOpen} onClose={closeModal} defaultRole={loginType} />
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
        <Route path="/dev-team" element={<DevTeam />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute allowRoles={['student']} />}>
          <Route path="/student" element={<StudentDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowRoles={['recruiter']} />}>
          <Route path="/recruiter" element={<RecruiterDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

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
