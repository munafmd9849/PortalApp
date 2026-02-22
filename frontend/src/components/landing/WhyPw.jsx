import React, { useMemo, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SkillsDisplay from './SkillsDisplay';
import ManagementSkills from './ManagementSkills';
import HealthcareSkills from './HealthcareSkills';
import HiringBet from './HiringBet';
import PillNav from './PillNav';

gsap.registerPlugin(ScrollTrigger);

const WhyPw = () => {
  const [activeTab, setActiveTab] = useState('SOT'); // Default to SOT

  const pillItems = useMemo(
    () => [
      { label: 'SOT', href: '#SOT', onClick: () => setActiveTab('SOT') },
      { label: 'SOM', href: '#SOM', onClick: () => setActiveTab('SOM') },
      { label: 'SOH', href: '#SOH', onClick: () => setActiveTab('SOH') },
    ],
    []
  );

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'SOT':
        return <SkillsDisplay />;
      case 'SOM':
        return <ManagementSkills />;
      case 'SOH':
        return <HealthcareSkills />;
      default:
        return <SkillsDisplay />;
    }
  };

  return (
    <section className="py-16 px-4 max-w-6xl mx-auto text-center font-sans">
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--pl-text)] mb-8 tracking-tight">
        Why Do <span className="text-blue-900">Recruiters</span> Keep Coming Back to Us ?
      </h2>

      {/* Skills Section */}
      <div className="transition-all duration-1000 z-2 ease-out opacity-100 translate-y-0">
        <div className="flex justify-center mb-6 sm:mb-8 max-w-full overflow-x-auto">
          <PillNav
            showLogo={false}
            enableMobileMenu={false}
            items={pillItems}
            activeHref={`#${activeTab}`}
            className="w-max"
            ease="power2.easeOut"
            baseColor="#111827"
            navBg="#ffffff"
            pillColor="#fff3c4"
            hoveredPillTextColor="#FFF7E6"
            hoveredPillBgColor="#2D2D2D"
            pillTextColor="#111827"
            pillGap="18px"
            glass={true}
          />
        </div>

        {/* Render Active Component */}
        {renderActiveComponent()}

        {/* Hiring Bet Component */}
        <HiringBet userSelection={activeTab}/>
      </div>
    </section>
  );
};

export default WhyPw;
