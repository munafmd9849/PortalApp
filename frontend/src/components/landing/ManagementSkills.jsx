import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ManagementSkills = () => {
  const businessFocusRef = useRef(null);
  const leadershipFocusRef = useRef(null);
  const businessSkillsItemsRef = useRef([]);
  const leadershipSkillsItemsRef = useRef([]);

  useEffect(() => {

    gsap.set([businessFocusRef.current, leadershipFocusRef.current], {
      opacity: 0,
      y: 50
    });
    
    gsap.set([...businessSkillsItemsRef.current, ...leadershipSkillsItemsRef.current], {
      opacity: 0,
      y: 30
    });


    gsap.to([businessFocusRef.current, leadershipFocusRef.current], {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: businessFocusRef.current,
        start: "top 80%",
        toggleActions: "play none none reverse"
      }
    });

    gsap.to([...businessSkillsItemsRef.current, ...leadershipSkillsItemsRef.current], {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: businessFocusRef.current,
        start: "top 70%",
        toggleActions: "play none none reverse"
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const addToBusinessSkillsRef = (el, index) => {
    if (el && !businessSkillsItemsRef.current.includes(el)) {
      businessSkillsItemsRef.current[index] = el;
    }
  };

  const addToLeadershipSkillsRef = (el, index) => {
    if (el && !leadershipSkillsItemsRef.current.includes(el)) {
      leadershipSkillsItemsRef.current[index] = el;
    }
  };

  return (
    <div className="flex gap-16 mt-12 flex-wrap font-sans max-w-6xl mx-auto px-4">
      {/* Hard Skills Column */}
      <div ref={businessFocusRef} className="flex-1 min-w-[300px] bg-white/70 shadow-md rounded-xl overflow-hidden">
        <div className="mb-6 h-full">
          {/* Header */}
          <div className="text-center w-full bg-[#fec89a] mb-8 py-6 px-4 relative overflow-hidden">
            <h3 className="text-2xl font-bold text-blue-900 relative z-10">
              Strategic Business Competencies
            </h3>
          </div>
          
          <div className="space-y-8 text-start text-sm px-6">
            <div 
              ref={(el) => addToBusinessSkillsRef(el, 0)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">4 Years of Immersive Business Training</h4>
                  <p className="text-gray-700">
                    Mentored by C-suite executives with live corporate simulations and case challenges, not theoretical classroom learning.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToBusinessSkillsRef(el, 1)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Real-World Business Projects</h4>
                  <p className="text-gray-700">
                    From startup incubators to Fortune 500 consulting projects—developed market-ready solutions under real deadlines.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToBusinessSkillsRef(el, 2)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Executive-Level Business Acumen</h4>
                  <p className="text-gray-700">
                    Mastery of financial modeling, competitive analysis, and stakeholder management at par with MBA graduates.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToBusinessSkillsRef(el, 3)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold mb-1">
                    <span className="px-1 bg-gradient-to-t from-yellow-400 to-yellow-400 bg-no-repeat [background-size:100%_30%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%]">Zero-Cost Talent Pipeline</span>
                  </h4>
                  <p className="text-gray-700">
                    Our corporate partners access pre-vetted business talent without recruitment fees or hidden costs.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToBusinessSkillsRef(el, 4)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Boardroom-Ready Graduates</h4>
                  <p className="text-gray-700">
                    Trained on Bloomberg Terminals, Salesforce, and Tableau with certified proficiency in enterprise platforms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Soft Skills Column - Leadership Focus */}
      <div ref={leadershipFocusRef} className="flex-1 min-w-[300px] bg-white/70 shadow-md rounded-xl overflow-hidden">
        <div className="mb-6 h-full">
          {/* Header */}
          <div className="text-center w-full bg-[#ffb4a2] mb-8 py-6 px-4 relative overflow-hidden">
            <h3 className="text-2xl font-bold text-blue-900 relative z-10">
              Leadership Differentiators
            </h3>
          </div>
          
          <div className="space-y-7 text-start text-sm px-6">
            <div 
              ref={(el) => addToLeadershipSkillsRef(el, 0)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">CRISIS LEADERSHIP</h4>
                  <p className="text-gray-700">
                    <em className="text-gray-600">83% of graduates successfully lead teams through high-pressure scenarios</em> - from investor negotiations to operational disruptions.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToLeadershipSkillsRef(el, 1)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">C-SUITE COMMUNICATION</h4>
                  <p className="text-gray-700">
                    Proven ability to distill complex data into executive briefings that drive decision-making at the highest levels.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToLeadershipSkillsRef(el, 2)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">ENTREPRENEURIAL MINDSET</h4>
                  <p className="text-gray-700">
                    <em className="text-gray-600">42% reduce time-to-market</em> by identifying opportunities and mobilizing resources ahead of competitors.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToLeadershipSkillsRef(el, 3)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">CULTURAL ARCHITECT</h4>
                  <p className="text-gray-700">
                    Certified in organizational design with demonstrated ability to transform team dynamics and engagement metrics.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToLeadershipSkillsRef(el, 4)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">ADAPTIVE INTELLIGENCE</h4>
                  <p className="text-gray-700">
                    <em className="text-gray-600">67% faster promotion trajectory</em> due to rapid mastery of emerging business technologies and methodologies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementSkills;
