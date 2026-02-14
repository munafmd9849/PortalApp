import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ProfileCard from './ProfileCard.jsx';
import './Records.css';

gsap.registerPlugin(ScrollTrigger);

const STUDENT_RECORDS = [
  [
    { name: "Priya Sharma", company: "Microsoft", role: "Software Engineer", package: "18 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/priya-sharma" },
    { name: "Rahul Kumar", company: "Google", role: "Data Scientist", package: "22 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/rahul-kumar" },
    { name: "Anjali Patel", company: "Amazon", role: "Product Manager", package: "20 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/anjali-patel" },
    { name: "Vikram Singh", company: "Tesla", role: "ML Engineer", package: "25 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/vikram-singh" },
    { name: "Meera Reddy", company: "Netflix", role: "Frontend Developer", package: "19 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/meera-reddy" },
    { name: "Arjun Mehta", company: "Adobe", role: "UX Designer", package: "16 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/arjun-mehta" },
    { name: "Zara Khan", company: "Intel", role: "Hardware Engineer", package: "17 LPA", batch: "2023-2027", profileImg: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/zara-khan" }
  ],
  [
    { name: "Aditya Verma", company: "IBM", role: "Cloud Architect", package: "21 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/aditya-verma" },
    { name: "Kavya Iyer", company: "Oracle", role: "Database Admin", package: "18 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/kavya-iyer" },
    { name: "Rohan Desai", company: "Salesforce", role: "Business Analyst", package: "16 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/rohan-desai" },
    { name: "Ishita Gupta", company: "Microsoft", role: "DevOps Engineer", package: "19 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/ishita-gupta" },
    { name: "Shaurya Malhotra", company: "Google", role: "Backend Developer", package: "23 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/shaurya-malhotra" },
    { name: "Aisha Rahman", company: "Amazon", role: "QA Engineer", package: "17 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/aisha-rahman" },
    { name: "Dhruv Joshi", company: "Tesla", role: "Robotics Engineer", package: "24 LPA", batch: "2024-2028", profileImg: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/dhruv-joshi" }
  ],
  [
    { name: "Neha Agarwal", company: "Netflix", role: "Content Strategist", package: "18 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/neha-agarwal" },
    { name: "Kartik Nair", company: "Adobe", role: "Creative Director", package: "20 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/kartik-nair" },
    { name: "Tanvi Kapoor", company: "Intel", role: "Research Scientist", package: "22 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/tanvi-kapoor" },
    { name: "Aryan Bhatt", company: "IBM", role: "AI Engineer", package: "25 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/aryan-bhatt" },
    { name: "Sanya Mehra", company: "Oracle", role: "Security Engineer", package: "19 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/sanya-mehra" },
    { name: "Vedant Rao", company: "Salesforce", role: "Solution Architect", package: "21 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/vedant-rao" },
    { name: "Mira Shah", company: "Microsoft", role: "Full Stack Developer", package: "20 LPA", batch: "2025-2029", profileImg: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face", linkedin: "https://linkedin.com/in/mira-shah" }
  ]
];

const BATCHES = [
  { id: '2023-2027', name: '2023-2027', students: 156 },
  { id: '2024-2028', name: '2024-2028', students: 142 },
  { id: '2025-2029', name: '2025-2029', students: 98 },
];

// Grateful 2–3 line testimonials about the experience (used on hover)
const TESTIMONIALS = [
  `Without their support, I would not have been able to handle the competitive market with such confidence. Grateful for every mock interview and feedback.`,
  `The placement cell didn't just help me land the offer — they prepared me for the real challenges ahead. Forever thankful for this journey.`,
  `From resume reviews to interview prep, every step was guided with care. I'm here today because someone believed in me before I did.`,
  `The workshops and one-on-one mentoring made all the difference. More than the offer, I'm grateful for the growth I experienced here.`,
  `I walked into the process nervous and came out with clarity. Thank you for making placement feel less like a race and more like a journey.`,
  `The support I received here went beyond placement — it shaped how I approach problems and present myself. Truly life-changing.`,
  `Mock interviews, resume tips, and constant encouragement — I had it all. Grateful to have cracked it with such a strong team behind me.`,
  `Every doubt I had was met with patience and guidance. This experience didn't just get me a job; it gave me confidence for life.`,
];

export default function PlacementRecords({ onLoginOpen }) {
  const [currentRow, setCurrentRow] = useState(0);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [isSectionInView, setIsSectionInView] = useState(false);
  const cardsToShow = 5;
  const sectionRef = useRef(null);
  const headingCrackRef = useRef(null);
  const crackWordRef = useRef(null);
  const mobileScrollRef = useRef(null);

  const mobileCards = useMemo(() => STUDENT_RECORDS.flat(), []);

  useEffect(() => {
    if (!isRotating) return;
    const interval = setInterval(() => {
      setCurrentRow((prev) => (prev + 1) % STUDENT_RECORDS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isRotating]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsSectionInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // GSAP ScrollTrigger: crack open the word "Cracked" on scroll into view, join again on scroll up
  useEffect(() => {
    const headingEl = headingCrackRef.current;
    const wordEl = crackWordRef.current;
    const sectionEl = sectionRef.current;
    if (!headingEl || !wordEl || !sectionEl) return;

    const letters = wordEl.querySelectorAll('.crack-letter');
    if (letters.length < 7) return;

    const theyEl = headingEl.querySelector('.crack-they');
    const itEl = headingEl.querySelector('.crack-it');
    if (!theyEl || !itEl) return;

    const lettersLeft = [letters[0], letters[1], letters[2]];
    const lettersRight = [letters[3], letters[4], letters[5], letters[6]];

    gsap.set(letters, { x: 0, rotation: 0 });
    gsap.set(theyEl, { x: 0, y: 0 });
    gsap.set(itEl, { x: 0, y: 0, rotation: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionEl,
        start: 'top 82%',
        end: 'top 28%',
        scrub: 1.2,
      },
    });

    tl.to(lettersLeft, { x: -12, rotation: -8, duration: 1, ease: 'power2.out' }, 0);
    tl.to(lettersRight, { x: 12, rotation: 8, duration: 1, ease: 'power2.out' }, 0);
    tl.to(theyEl, { x: -6, duration: 1, ease: 'power2.out' }, 0);
    tl.to(itEl, { y: 6, rotation: -12, duration: 1, ease: 'power2.out' }, 0);

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.trigger === sectionEl && t.kill());
    };
  }, []);

  useEffect(() => {
    if (!isRotating) return;
    if (!isSectionInView) return;
    if (!mobileCards.length) return;
    const id = window.setInterval(() => {
      setMobileIndex((prev) => (prev + 1) % mobileCards.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [isRotating, isSectionInView, mobileCards.length]);

  useEffect(() => {
    const container = mobileScrollRef.current;
    if (!isSectionInView) return;
    if (!container) return;
    const el = container.children?.[mobileIndex];
    if (!el) return;
    const targetLeft = el.offsetLeft + el.offsetWidth / 2 - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [mobileIndex, isSectionInView]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBatchDropdown && !event.target.closest('.dropdown-container')) {
        setShowBatchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBatchDropdown]);

  const currentCards = useMemo(() => {
    const row = STUDENT_RECORDS[currentRow] || [];
    return row.slice(0, cardsToShow);
  }, [currentRow]);

  return (
    <>
      <section ref={sectionRef} className="py-12 sm:py-16 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 flex flex-col justify-center items-center lg:relative">
            <h2
              ref={headingCrackRef}
              className="text-4xl font-bold text-blue-900 mb-4 tracking-tight crack-heading"
            >
              Hear How <span className="crack-they">They</span>{' '}
              <span className="crack-word" ref={crackWordRef}>
                <span className="crack-letter">C</span>
                <span className="crack-letter">r</span>
                <span className="crack-letter">a</span>
                <span className="crack-letter">c</span>
                <span className="crack-letter">k</span>
                <span className="crack-letter">e</span>
                <span className="crack-letter">d</span>
              </span>{' '}
              <span className="crack-it">It</span>
            </h2>
            <p className="text-lg sm:text-xl text-[var(--pl-text-secondary)] font-normal">
              Success stories from our placed students
            </p>

            <div className="lg:absolute lg:top-1/4 lg:right-0 dropdown-container mt-5 lg:mt-0">
              <button
                onClick={() => setShowBatchDropdown(!showBatchDropdown)}
                className="bg-white text-blue-900 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-100 font-medium py-2 px-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2 text-sm"
              >
                <span>Show All</span>
                <svg className={`w-4 h-4 transition-transform duration-300 ${showBatchDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showBatchDropdown && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  {BATCHES.map((batch) => (
                    <button
                      key={batch.id}
                      onClick={() => {
                        setShowBatchDropdown(false);
                        onLoginOpen();
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-[#1565C0]/5 hover:border-l-4 hover:border-l-[#1565C0] transition-all duration-100 group"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-gray-800 group-hover:text-[#1565C0]">
                            Batch {batch.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {batch.students} students placed
                          </p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-[#1565C0] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            {/* Laptop and up: 5-card grid using ProfileCard */}
            <div
              className="hidden lg:grid grid-cols-5 gap-8 xl:gap-10 transition-all duration-1000 ease-in-out max-w-7xl mx-auto justify-items-center w-full"
              onMouseEnter={() => setIsRotating(false)}
              onMouseLeave={() => setIsRotating(true)}
            >
              {currentCards.map((student, index) => (
                <div
                  key={`${currentRow}-${index}`}
                  className="w-full max-w-[230px] xl:max-w-[250px]"
                  style={{
                    animationDelay: `${index * 80}ms`,
                    animation: 'slideInUp 0.6s ease-out forwards'
                  }}
                >
                  <ProfileCard
                    name={student.name}
                    title={`${student.company} • ${student.role}`}
                    batch={student.batch}
                    handle={String(student.name || '')
                      .toLowerCase()
                      .replace(/\s+/g, '')}
                    status={student.package}
                    contactText="View Profile"
                    avatarUrl={student.profileImg}
                    showUserInfo={false}
                    enableTilt={true}
                    enableMobileTilt={false}
                    showBehindGlow
                    behindGlowColor="rgba(148,163,184,0.4)"
                    customInnerGradient="linear-gradient(145deg,#334155cc 0%,#64748b66 100%)"
                    testimonial={TESTIMONIALS[(currentRow * cardsToShow + index) % TESTIMONIALS.length]}
                    linkedinUrl={student.linkedin}
                    emailHref={`mailto:${String(student.name || '')
                      .toLowerCase()
                      .trim()
                      .replace(/\s+/g, '.')}@${String(student.company || '')
                      .toLowerCase()
                      .trim()
                      .replace(/\s+/g, '')}.com`}
                  />
                </div>
              ))}
            </div>
            <div className="hidden lg:flex justify-center mt-8 gap-2">
              {STUDENT_RECORDS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentRow(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentRow === index
                      ? 'bg-[#1565C0] scale-125'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            {/* Mobile only: ProfileCard carousel — 1 full card + 1/4 of next */}
            <div
              ref={mobileScrollRef}
              className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' }}
              onPointerEnter={() => setIsRotating(false)}
              onPointerLeave={() => setIsRotating(true)}
            >
              {mobileCards.map((student, idx) => (
                <div
                  key={`${student.name}-${idx}`}
                  className="snap-center shrink-0 flex justify-center"
                  style={{ width: '80%', minWidth: '80%' }}
                >
                  <div className="w-full max-w-[240px]">
                    <ProfileCard
                      name={student.name}
                      title={`${student.company} • ${student.role}`}
                      batch={student.batch}
                      handle={String(student.name || '').toLowerCase().replace(/\s+/g, '')}
                      status={student.package}
                      contactText="View Profile"
                      avatarUrl={student.profileImg}
                      showUserInfo={false}
                      enableTilt={false}
                      enableMobileTilt={false}
                      showBehindGlow
                      behindGlowColor="rgba(148,163,184,0.4)"
                      customInnerGradient="linear-gradient(145deg,#334155cc 0%,#64748b66 100%)"
                      testimonial={TESTIMONIALS[idx % TESTIMONIALS.length]}
                      linkedinUrl={student.linkedin}
                      emailHref={`mailto:${String(student.name || '').toLowerCase().trim().replace(/\s+/g, '.')}@${String(student.company || '').toLowerCase().trim().replace(/\s+/g, '')}.com`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
