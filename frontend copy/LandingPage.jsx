import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Header from './components/landing/Header';
import Banner from './components/landing/Banner';
import WhyPw from './components/landing/WhyPw';
import MasonryStats from './components/landing/stats';
import Preloader from './components/landing/PreLoader';
import OurPartners from './components/landing/OurPartners';
import PWIOIFooter from './components/landing/Footer';
import PlacementTimeline from './components/landing/PlacementTimeline';
import AdminSlider from './components/landing/CareerService';
import PlacementFAQ from './components/landing/FAQs';
import RecruitersSection from './components/landing/founder';
import Records from './components/landing/Records';
import NotificationModal from './components/Notification';
import ClickSpark from './components/landing/ClickSpark';

export default function LandingPageDuplicate() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [timelineAutoplay, setTimelineAutoplay] = useState(false);

  const triggerTimelineAnimation = () => {
    setTimelineAutoplay(true);
    // Reset after animation completes
    setTimeout(() => setTimelineAutoplay(false), 3500);
  };

  const openModal = (type = 'Student') => {
    triggerTimelineAnimation();
    navigate('/login', { state: { role: type } });
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
    window.open(
      'https://docs.google.com/document/d/1yEH5gMSux0cCf8UmS1d4p1GpZvL-nRzQHLutu8MrZoY/edit?usp=sharing',
      '_blank',
    );
  };

  return (
    <>
      {isLoading ? (
        <Preloader onComplete={() => setIsLoading(false)} />
      ) : (
        <ClickSpark
          sparkColor="#ffffff"
          sparkSize={10}
          sparkRadius={15}
          sparkCount={8}
          duration={400}
        >
          <main className="w-full min-h-screen bg-[var(--pl-bg)] text-[var(--pl-text)] overflow-x-hidden">
            <NotificationModal />

            <Header onLoginOpen={openModal} onScrollToContact={scrollToContact} />

          {/* Banner - Odd component #F2F0EA */}
          <div className="bg-[var(--pl-bg)]">
            <Banner />
          </div>

          {/* WhyPw - Even component #A8D5E3 */}
          <div className="bg-[var(--pl-bg)]">
            <WhyPw />
          </div>

          {/* Stats - comes under WhyPw, before OurPartners */}
          <div className="bg-[var(--pl-bg)]">
            <MasonryStats />
          </div>

          {/* OurPartners - Odd component #F2F0EA */}
          <div id="our-partners" className="bg-[var(--pl-bg)]">
            <OurPartners />
          </div>

          {/* Records - Even component #A8D5E3 */}
          <div className="bg-[var(--pl-bg)]">
            <Records onLoginOpen={openModal} />
          </div>

          {/* PlacementTimeline - #A8D5E3 background */}
          <div className="bg-[var(--pl-bg)]">
            <PlacementTimeline autoplay={timelineAutoplay} />
          </div>

          <div id="career-services" className="bg-[var(--pl-bg)] py-10">
            <AdminSlider />
          </div>

          {/* FoundersSection - Even component #A8D5E3 */}
          <div className="bg-[var(--pl-bg)]">
            <RecruitersSection />
            {/* Section break before FAQ */}
            <div className="max-w-7xl mx-auto px-6">
              <div className="h-px bg-[var(--pl-border)]" />
            </div>
            <div className="h-6 lg:h-12" />
          </div>

          <div className="bg-[var(--pl-bg)]">
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
        </ClickSpark>
      )}
    </>
  );
}

