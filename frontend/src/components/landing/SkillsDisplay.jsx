import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SkillsDisplay = () => {
  const hardSkillsRef = useRef(null);
  const softSkillsRef = useRef(null);
  const hardSkillItemsRef = useRef([]);
  const softSkillItemsRef = useRef([]);
  const [mobileTab, setMobileTab] = useState("hard");

  const mobileHard = useMemo(
    () => [
      ["4 Years of Immersive Training", "Mentored by industry experts with real-world simulations, not just textbook learning."],
      ["Worked on Real-Time Projects", "From hackathons to live deployments—they've built, failed, and delivered under pressure."],
      ["Business Acumen Included", "Students gain exposure to business strategy, finance, and stakeholder management beyond core skills."],
      ["No-Cost Hiring Policy", "Zero placement fees—because talent should be accessible, not transactional."],
      ["Play-and-Plug Resources", `Trained on industry tools so they're \"productive\" from Day 1, not just \"familiar\".`],
    ],
    []
  );

  const mobileSoft = useMemo(
    () => [
      ["Calm In Chaos", "They are trained to think, speak and resolve crisis calmly 40% faster than industry norm."],
      ["Fluent In Geek And Exec", "Breaks down tech-speak into plain English - because great ideas shouldn't get lost in translation."],
      ["Solution-Oriented Ownership", "Pattern of identifying risks proactively and presenting validated solutions rather than just problems."],
      ["Solutions Over Excuses", "Take accountability - doesn't just report problems. They are used to taking charge, they don't blink when it fires, they extinguish it."],
      ["Learn Fast And Stay Relevant", "Not spoon-fed, they pick up new tech 50% faster than the industry average. Plug them into a new tool and get surprised - we promise, try it!"],
    ],
    []
  );

  useEffect(() => {
    // Set initial states
    gsap.set([hardSkillsRef.current, softSkillsRef.current], {
      opacity: 0,
      y: 50
    });

    gsap.set([...hardSkillItemsRef.current, ...softSkillItemsRef.current], {
      opacity: 0,
      y: 30
    });

    // Animate columns on scroll
    gsap.to([hardSkillsRef.current, softSkillsRef.current], {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: hardSkillsRef.current,
        start: "top 80%",
        toggleActions: "play none none reverse"
      }
    });

    // Animate skill items with stagger
    gsap.to([...hardSkillItemsRef.current, ...softSkillItemsRef.current], {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: hardSkillsRef.current,
        start: "top 70%",
        toggleActions: "play none none reverse"
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const addToHardSkillsRef = (el, index) => {
    if (el && !hardSkillItemsRef.current.includes(el)) {
      hardSkillItemsRef.current[index] = el;
    }
  };

  const addToSoftSkillsRef = (el, index) => {
    if (el && !softSkillItemsRef.current.includes(el)) {
      softSkillItemsRef.current[index] = el;
    }
  };

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden desk:flex gap-16 mt-12 flex-wrap font-sans max-w-6xl mx-auto px-4">
      {/* Hard Skills Column */}
      <div
        ref={hardSkillsRef}
        className="flex-1 min-w-[300px] bg-white/70 shadow-md rounded-xl overflow-hidden"
      >
        <div className="mb-6 h-full">
          {/* Colorful Header */}
          <div className="text-center w-full bg-[#fec89a] mb-8 py-6 px-4 relative overflow-hidden">
            <h3 className="text-2xl font-bold text-blue-900 relative z-10">
              Hard Skills They've Mastered
            </h3>
          </div>

          <div className="space-y-8 text-start text-sm px-6">
            <div
              ref={(el) => addToHardSkillsRef(el, 0)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">4 Years of Immersive Training</h4>
                  <p className="text-gray-700">
                    Mentored by industry experts with real-world simulations, not just textbook learning.
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={(el) => addToHardSkillsRef(el, 1)}
              className="group relative overflow-hidden rounded-lg px-4 hover:pr-3 duration-300 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Worked on Real-Time Projects</h4>
                  <p className="text-gray-700">
                    From hackathons to live deployments—they've built, failed, and delivered under pressure.
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={(el) => addToHardSkillsRef(el, 2)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Business Acumen Included</h4>
                  <p className="text-gray-700">
                    Students gain exposure to business strategy, finance, and stakeholder management beyond core skills.
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={(el) => addToHardSkillsRef(el, 3)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold mb-1">
                    <span className="px-1 bg-gradient-to-t from-[var(--pl-accent-orange)] to-[var(--pl-accent-orange)] bg-no-repeat [background-size:100%_30%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%]">
                      No-Cost Hiring Policy
                    </span>
                  </h4>
                  <p className="text-gray-700">
                    Zero placement fees—because talent should be{" "}
                    <span className="text-gray-800 font-semibold inline-block underline underline-offset-1 decoration-0">
                      accessible, not transactional.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={(el) => addToHardSkillsRef(el, 4)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Play-and-Plug Resources</h4>
                  <p className="text-gray-700">
                    Trained on industry tools so they're "productive" from Day 1, not just "familiar".
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Soft Skills Column */}
      <div
        ref={softSkillsRef}
        className="flex-1 min-w-[300px] bg-white/70 shadow-md rounded-xl overflow-hidden"
      >
        <div className="mb-6 h-full">
          {/* Colorful Header */}
          <div className="text-center w-full bg-[#ffb4a2] mb-8 py-6 px-4 relative overflow-hidden">
            <h3 className="text-2xl font-bold text-blue-900 relative z-10">
              What Employers Really Remember
            </h3>
          </div>

          <div className="space-y-7 text-start text-sm px-6">
            <div
              ref={(el) => addToSoftSkillsRef(el, 0)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Calm In Chaos</h4>
                  <p className="text-gray-700">
                    They are trained to think, speak and resolve crisis calmly 40% faster than industry norm.
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={(el) => addToSoftSkillsRef(el, 1)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Fluent In Geek And Exec</h4>
                  <p className="text-gray-700">
                    Breaks down tech-speak into plain English - because great ideas shouldn't get lost in translation.
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={(el) => addToSoftSkillsRef(el, 2)}
              className="group relative overflow-hidden rounded-lg px-4 hover:pr-3 duration-300 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Solution-Oriented Ownership</h4>
                  <p className="text-gray-700">
                    Pattern of identifying risks proactively and presenting validated solutions rather than just problems.
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={(el) => addToSoftSkillsRef(el, 3)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Solutions Over Excuses</h4>
                  <p className="text-gray-700">
                    Take accountability - doesn't just report problems. They are used to taking charge, they don't blink when it fires, they extinguish it.
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={(el) => addToSoftSkillsRef(el, 4)}
              className="group relative overflow-hidden rounded-lg hover:pr-3 duration-300 px-4 bg-gradient-to-r from-transparent to-gray-50/50 glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Learn Fast And Stay Relevant</h4>
                  <p className="text-gray-700">
                    Not spoon-fed, they pick up new tech 50% faster than the industry average. Plug them into a new tool and get surprised - we promise, try it!
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
              onClick={() => setMobileTab("hard")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                mobileTab === "hard"
                  ? "border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-accent-orange)_26%,white)] text-[var(--pl-text)] shadow-sm"
                  : "border border-transparent bg-[var(--pl-surface)] text-[var(--pl-text-secondary)] hover:border-[var(--pl-border)] hover:bg-[color-mix(in_oklab,var(--pl-accent-orange)_14%,white)]"
              }`}
            >
              Hard Skills
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("soft")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                mobileTab === "soft"
                  ? "border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-accent-purple)_22%,white)] text-[var(--pl-text)] shadow-sm"
                  : "border border-transparent bg-[var(--pl-surface)] text-[var(--pl-text-secondary)] hover:border-[var(--pl-border)] hover:bg-[color-mix(in_oklab,var(--pl-accent-purple)_14%,white)]"
              }`}
            >
              Soft Skills
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {(mobileTab === "hard" ? mobileHard : mobileSoft).map(([t, d]) => (
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

export default SkillsDisplay;