import React, { useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SkillsDisplay from './SkillsDisplay';
import ManagementSkills from './ManagementSkills';
import HealthcareSkills from './HealthcareSkills';
import HiringBet from './HiringBet';

gsap.registerPlugin(ScrollTrigger);

const WhyPw = () => {
  const [activeTab, setActiveTab] = useState('SOT'); // Default to SOT

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
    <section className="py-6 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6 max-w-6xl mx-auto text-center font-sans rounded-lg">
      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mb-6 sm:mb-8 lg:mb-12 relative z-2 inline-block after:block after:content-[''] after:absolute after:bottom-[-10px] sm:after:bottom-[-15px] after:left-1/2 after:-translate-x-1/2 after:w-16 sm:after:w-20 lg:after:w-24 after:h-0.5 sm:after:h-1 after:bg-primary">
        Why Do Recruiters Keep Coming Back to Us ?
      </h2>

      {/* Skills Section */}
      <div className="transition-all duration-1000 z-2 ease-out opacity-100 translate-y-0">
        {/* Minimal Navbar */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="bg-black/10 backdrop-blur-sm border-1 border-gray-700 rounded-lg p-1 flex gap-1 sm:gap-2 lg:gap-3 w-full sm:w-auto max-w-sm sm:max-w-none">
            {['SOT', 'SOM', 'SOH'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-5 lg:px-8 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-700 flex-1 sm:flex-initial ${
                  activeTab === tab
                    ? 'bg-white/80 text-black font-bold'
                    : 'text-black bg-black/10 hover:bg-black/30 hover:text-black'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
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