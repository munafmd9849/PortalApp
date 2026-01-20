import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ManagementSkills = () => {
  const businessFocusRef = useRef(null);
  const leadershipFocusRef = useRef(null);
  const businessSkillsItemsRef = useRef([]);
  const leadershipSkillsItemsRef = useRef([]);
  const [mobileTab, setMobileTab] = useState("business");

  const mobileBusiness = useMemo(
    () => [
      ["4 Years of Immersive Business Training", "Mentored by C-suite executives with live corporate simulations and case challenges, not theoretical classroom learning."],
      ["Real-World Business Projects", "From startup incubators to Fortune 500 consulting projects—developed market-ready solutions under real deadlines."],
      ["Executive-Level Business Acumen", "Mastery of financial modeling, competitive analysis, and stakeholder management at par with MBA graduates."],
      ["Zero-Cost Talent Pipeline", "Our corporate partners access pre-vetted business talent without recruitment fees or hidden costs."],
      ["Boardroom-Ready Graduates", "Trained on Bloomberg Terminals, Salesforce, and Tableau with certified proficiency in enterprise platforms."],
    ],
    []
  );

  const mobileLeadership = useMemo(
    () => [
      ["CRISIS LEADERSHIP", "83% of graduates successfully lead teams through high-pressure scenarios - from investor negotiations to operational disruptions."],
      ["C-SUITE COMMUNICATION", "Proven ability to distill complex data into executive briefings that drive decision-making at the highest levels."],
      ["ENTREPRENEURIAL MINDSET", "42% reduce time-to-market by identifying opportunities and mobilizing resources ahead of competitors."],
      ["CULTURAL ARCHITECT", "Certified in organizational design with demonstrated ability to transform team dynamics and engagement metrics."],
      ["ADAPTIVE INTELLIGENCE", "67% faster promotion trajectory due to rapid mastery of emerging business technologies and methodologies."],
    ],
    []
  );

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
    <>
      {/* Desktop layout (unchanged) */}
      <div className="hidden desk:flex gap-16 mt-12 flex-wrap font-sans max-w-6xl mx-auto px-4">
      {/* Hard Skills Column */}
      <div
        ref={businessFocusRef}
        className="flex-1 min-w-[300px] bg-[var(--pl-surface)] border border-[var(--pl-border)] shadow-sm rounded-xl overflow-hidden"
      >
        <div className="mb-6 h-full">
          {/* Header */}
          <div className="text-center w-full bg-[color-mix(in_oklab,var(--pl-accent-orange)_30%,white)] mb-8 py-6 px-4 relative overflow-hidden">
            <h3 className="text-2xl font-bold text-[var(--pl-primary)] relative z-10">
              Strategic Business Competencies
            </h3>
          </div>
          
          <div className="space-y-8 text-start text-sm px-6">
            <div 
              ref={(el) => addToBusinessSkillsRef(el, 0)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">4 Years of Immersive Business Training</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    Mentored by C-suite executives with live corporate simulations and case challenges, not theoretical classroom learning.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToBusinessSkillsRef(el, 1)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">Real-World Business Projects</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    From startup incubators to Fortune 500 consulting projects—developed market-ready solutions under real deadlines.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToBusinessSkillsRef(el, 2)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">Executive-Level Business Acumen</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    Mastery of financial modeling, competitive analysis, and stakeholder management at par with MBA graduates.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToBusinessSkillsRef(el, 3)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold mb-1">
                    <span className="px-1 bg-gradient-to-t from-[var(--pl-accent-orange)] to-[var(--pl-accent-orange)] bg-no-repeat [background-size:100%_30%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%]">
                      Zero-Cost Talent Pipeline
                    </span>
                  </h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    Our corporate partners access pre-vetted business talent without recruitment fees or hidden costs.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToBusinessSkillsRef(el, 4)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">Boardroom-Ready Graduates</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    Trained on Bloomberg Terminals, Salesforce, and Tableau with certified proficiency in enterprise platforms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Soft Skills Column - Leadership Focus */}
      <div
        ref={leadershipFocusRef}
        className="flex-1 min-w-[300px] bg-[var(--pl-surface)] border border-[var(--pl-border)] shadow-sm rounded-xl overflow-hidden"
      >
        <div className="mb-6 h-full">
          {/* Header */}
          <div className="text-center w-full bg-[color-mix(in_oklab,var(--pl-accent-purple)_22%,white)] mb-8 py-6 px-4 relative overflow-hidden">
            <h3 className="text-2xl font-bold text-[var(--pl-primary)] relative z-10">
              Leadership Differentiators
            </h3>
          </div>
          
          <div className="space-y-7 text-start text-sm px-6">
            <div 
              ref={(el) => addToLeadershipSkillsRef(el, 0)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">CRISIS LEADERSHIP</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    <em className="text-[var(--pl-text-muted)]">83% of graduates successfully lead teams through high-pressure scenarios</em> - from investor negotiations to operational disruptions.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToLeadershipSkillsRef(el, 1)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">C-SUITE COMMUNICATION</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    Proven ability to distill complex data into executive briefings that drive decision-making at the highest levels.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToLeadershipSkillsRef(el, 2)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">ENTREPRENEURIAL MINDSET</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    <em className="text-[var(--pl-text-muted)]">42% reduce time-to-market</em> by identifying opportunities and mobilizing resources ahead of competitors.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToLeadershipSkillsRef(el, 3)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">CULTURAL ARCHITECT</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    Certified in organizational design with demonstrated ability to transform team dynamics and engagement metrics.
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref={(el) => addToLeadershipSkillsRef(el, 4)}
                className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                  <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">ADAPTIVE INTELLIGENCE</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    <em className="text-[var(--pl-text-muted)]">67% faster promotion trajectory</em> due to rapid mastery of emerging business technologies and methodologies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      {/* Mobile/Tablet layout */}
      <div className="desk:hidden mt-8 max-w-xl mx-auto px-4">
        <div className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface)] shadow-sm p-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMobileTab("business")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                mobileTab === "business"
                  ? "border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-accent-orange)_22%,white)] text-[var(--pl-text)] shadow-sm"
                  : "border border-transparent bg-[var(--pl-surface)] text-[var(--pl-text-secondary)] hover:border-[var(--pl-border)] hover:bg-[color-mix(in_oklab,var(--pl-accent-orange)_12%,white)]"
              }`}
            >
              Business
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("leadership")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                mobileTab === "leadership"
                  ? "border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-accent-purple)_20%,white)] text-[var(--pl-text)] shadow-sm"
                  : "border border-transparent bg-[var(--pl-surface)] text-[var(--pl-text-secondary)] hover:border-[var(--pl-border)] hover:bg-[color-mix(in_oklab,var(--pl-accent-purple)_12%,white)]"
              }`}
            >
              Leadership
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {(mobileTab === "business" ? mobileBusiness : mobileLeadership).map(([t, d]) => (
            <div
              key={t}
              className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-4 shadow-sm"
            >
              <div className="text-sm font-semibold text-[var(--pl-text)] leading-snug">{t}</div>
              <div className="mt-1.5 text-sm text-[var(--pl-text-secondary)] leading-relaxed">
                {d}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ManagementSkills;
