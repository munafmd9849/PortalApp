import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HealthcareSkills = () => {
  const clinicalSkillsRef = useRef(null);
  const besideExcellenceRef = useRef(null);
  const clinicalSkillItemsRef = useRef([]);
  const besideExcellenceItemsRef = useRef([]);
  const [mobileTab, setMobileTab] = useState("clinical");

  const mobileClinical = useMemo(
    () => [
      ["4 Years of Immersive Medical Training", "Trained by practicing physicians and nurses through high-fidelity simulations and clinical rotations."],
      ["Real Patient Care Experience", "From emergency drills to actual clinical placements—delivered care under supervision with 95% patient satisfaction scores."],
      ["Healthcare Systems Fluency", "Proficient in EHR systems (Epic, Cerner), medical coding, and healthcare administration protocols."],
      ["Zero-Cost Clinical Talent", "Hospitals access pre-credentialed graduates without recruitment fees or temp agency markups."],
      ["Clinical Readiness", "Certified in BLS, ACLS, and facility-specific EMR systems before first shift."],
    ],
    []
  );

  const mobileExcellence = useMemo(
    () => [
      ["CRISIS POISE IN EMERGENCIES", "40% faster response times during code blues and rapid responses compared to average new hires."],
      ["PATIENT-CENTERED COMMUNICATION", "Certified in health literacy best practices and interpreter collaboration for diverse populations."],
      ["CLINICAL JUDGMENT", "30% fewer safety incidents due to proactive risk identification and mitigation."],
      ["INTERPROFESSIONAL COLLABORATION", "Demonstrated ability to work effectively in care teams across nursing, medicine, and allied health."],
      ["EVIDENCE-BASED ADAPTABILITY", "50% faster protocol adoption when implementing new clinical guidelines or technology."],
    ],
    []
  );

  useEffect(() => {
    // Set initial states
    gsap.set([clinicalSkillsRef.current, besideExcellenceRef.current], {
      opacity: 0,
      y: 50
    });

    gsap.set([...clinicalSkillItemsRef.current, ...besideExcellenceItemsRef.current], {
      opacity: 0,
      y: 30
    });

    // Animate columns on scroll
    gsap.to([clinicalSkillsRef.current, besideExcellenceRef.current], {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: clinicalSkillsRef.current,
        start: "top 80%",
        toggleActions: "play none none reverse"
      }
    });

   
    gsap.to([...clinicalSkillItemsRef.current, ...besideExcellenceItemsRef.current], {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: clinicalSkillsRef.current,
        start: "top 70%",
        toggleActions: "play none none reverse"
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const addToClinicalSkillsRef = (el, index) => {
    if (el && !clinicalSkillItemsRef.current.includes(el)) {
      clinicalSkillItemsRef.current[index] = el;
    }
  };

  const addToBesideExcellenceRef = (el, index) => {
    if (el && !besideExcellenceItemsRef.current.includes(el)) {
      besideExcellenceItemsRef.current[index] = el;
    }
  };

  return (
    <>
      {/* Desktop layout (unchanged) */}
      <div className="hidden desk:flex gap-16 mt-12 flex-wrap font-sans max-w-6xl mx-auto px-4">
      {/* Clinical Competencies Column */}
      <div
        ref={clinicalSkillsRef}
        className="flex-1 min-w-[300px] bg-[var(--pl-surface)] border border-[var(--pl-border)] shadow-sm rounded-xl overflow-hidden"
      >
        <div className="mb-6 h-full">
          {/*Header */}
          <div className="text-center w-full bg-[color-mix(in_oklab,var(--pl-accent-orange)_30%,white)] mb-8 py-6 px-4 relative overflow-hidden">
            <h3 className="text-2xl font-bold text-[var(--pl-primary)] relative z-10">
              Clinical & Technical Mastery
            </h3>
          </div>
          <div className="space-y-8 text-start text-sm px-6">
            <div
              ref={(el) => addToClinicalSkillsRef(el, 0)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">4 Years of Immersive Medical Training</h4>
                  <p className="text-[var(--pl-text-secondary)]">Trained by practicing physicians and nurses through high-fidelity simulations and clinical rotations.</p>
                </div>
              </div>
            </div>
            <div
              ref={(el) => addToClinicalSkillsRef(el, 1)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">Real Patient Care Experience</h4>
                  <p className="text-[var(--pl-text-secondary)]">From emergency drills to actual clinical placements—delivered care under supervision with 95% patient satisfaction scores.</p>
                </div>
              </div>
            </div>
            <div
              ref={(el) => addToClinicalSkillsRef(el, 2)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">Healthcare Systems Fluency</h4>
                  <p className="text-[var(--pl-text-secondary)]">Proficient in EHR systems (Epic, Cerner), medical coding, and healthcare administration protocols.</p>
                </div>
              </div>
            </div>
            <div
              ref={(el) => addToClinicalSkillsRef(el, 3)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold mb-1">
                    <span className="px-1 bg-gradient-to-t from-[var(--pl-accent-orange)] to-[var(--pl-accent-orange)] bg-no-repeat [background-size:100%_30%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%]">
                      Zero-Cost Clinical Talent
                    </span>
                  </h4>
                  <p className="text-[var(--pl-text-secondary)]">Hospitals access pre-credentialed graduates without recruitment fees or temp agency markups.</p>
                </div>
              </div>
            </div>
            <div
              ref={(el) => addToClinicalSkillsRef(el, 4)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">Clinical Readiness</h4>
                  <p className="text-[var(--pl-text-secondary)]">Certified in BLS, ACLS, and facility-specific EMR systems before first shift.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Beside Excellence Column */}
      <div
        ref={besideExcellenceRef}
        className="flex-1 min-w-[300px] bg-[var(--pl-surface)] border border-[var(--pl-border)] shadow-sm rounded-xl overflow-hidden"
      >
        <div className="mb-6 h-full">
          {/* Header */}
          <div className="text-center w-full bg-[color-mix(in_oklab,var(--pl-accent-purple)_22%,white)] mb-8 py-6 px-4 relative overflow-hidden">
            <h3 className="text-2xl font-bold text-[var(--pl-primary)] relative z-10">
              Beside Excellence
            </h3>
          </div>
          <div className="space-y-7 text-start text-sm px-6">
            <div
              ref={(el) => addToBesideExcellenceRef(el, 0)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">CRISIS POISE IN EMERGENCIES</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    <span className="underline decoration-[var(--pl-primary)] font-semibold px-2 py-1 rounded">
                      40% faster response times
                    </span>{" "}
                    during code blues and rapid responses compared to average new hires.
                  </p>
                </div>
              </div>
            </div>
            <div
              ref={(el) => addToBesideExcellenceRef(el, 1)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">PATIENT-CENTERED COMMUNICATION</h4>
                  <p className="text-[var(--pl-text-secondary)]">Certified in health literacy best practices and interpreter collaboration for diverse populations.</p>
                </div>
              </div>
            </div>
            <div
              ref={(el) => addToBesideExcellenceRef(el, 2)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">CLINICAL JUDGMENT</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    <span className="underline decoration-[var(--pl-primary)] font-semibold px-2 py-1 rounded">
                      30% fewer safety incidents
                    </span>{" "}
                    due to proactive risk identification and mitigation.
                  </p>
                </div>
              </div>
            </div>
            <div
              ref={(el) => addToBesideExcellenceRef(el, 3)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">INTERPROFESSIONAL COLLABORATION</h4>
                  <p className="text-[var(--pl-text-secondary)]">Demonstrated ability to work effectively in care teams across nursing, medicine, and allied health.</p>
                </div>
              </div>
            </div>
            <div
              ref={(el) => addToBesideExcellenceRef(el, 4)}
              className="group relative overflow-hidden rounded-lg px-4 bg-gradient-to-r from-transparent to-[color-mix(in_oklab,var(--pl-primary)_8%,white)] glare-effect"
            >
              <div className="flex items-start">
                <div className='hover:pl-2 duration-300'>
                  <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-1">EVIDENCE-BASED ADAPTABILITY</h4>
                  <p className="text-[var(--pl-text-secondary)]">
                    <span className="underline decoration-[var(--pl-primary)] font-semibold px-2 py-1 rounded">
                      50% faster protocol adoption
                    </span>{" "}
                    when implementing new clinical guidelines or technology.
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
              onClick={() => setMobileTab("clinical")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                mobileTab === "clinical"
                  ? "border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-accent-orange)_26%,white)] text-[var(--pl-text)] shadow-sm"
                  : "border border-transparent bg-[var(--pl-surface)] text-[var(--pl-text-secondary)] hover:border-[var(--pl-border)] hover:bg-[color-mix(in_oklab,var(--pl-accent-orange)_14%,white)]"
              }`}
            >
              Clinical
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("excellence")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                mobileTab === "excellence"
                  ? "border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-accent-purple)_22%,white)] text-[var(--pl-text)] shadow-sm"
                  : "border border-transparent bg-[var(--pl-surface)] text-[var(--pl-text-secondary)] hover:border-[var(--pl-border)] hover:bg-[color-mix(in_oklab,var(--pl-accent-purple)_14%,white)]"
              }`}
            >
              Excellence
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {(mobileTab === "clinical" ? mobileClinical : mobileExcellence).map(([t, d]) => (
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

export default HealthcareSkills;