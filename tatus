import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconBrandLinkedin, IconMail } from '@tabler/icons-react';
import TiltedCard from './TiltedCard';

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

function studentEmailHref(student) {
  const name = String(student?.name || '').toLowerCase().trim().replace(/\s+/g, '.');
  const company = String(student?.company || '').toLowerCase().trim().replace(/\s+/g, '');
  if (!name || !company) return 'mailto:placements@example.com';
  return `mailto:${name}@${company}.com`;
}

// Desktop student card, cloned from frontend copy Records for matching top/hover content
const StudentCardDesktop = ({ student, index }) => {
  const height = '340px';

  return (
    <div
      className="relative w-full"
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.6s ease-out forwards',
      }}
    >
      <TiltedCard
        imageSrc={student.profileImg}
        altText={`${student.name} - ${student.company}`}
        captionText={`${student.name} • ${student.company}`}
        containerHeight={height}
        containerWidth="100%"
        imageHeight={height}
        imageWidth="100%"
        rotateAmplitude={7}
        scaleOnHover={1.04}
        showMobileWarning={false}
        showTooltip={true}
        displayOverlayContent={true}
        imageRadiusClassName="rounded-[10px]"
        overlayContent={
          <div className="h-full w-full rounded-[10px] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {/* Hover actions (top) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto">
              <a
                href={student.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                aria-label={`Open ${student.name} LinkedIn`}
                title="LinkedIn"
              >
                <IconBrandLinkedin size={16} />
              </a>
              <a
                href={studentEmailHref(student)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                aria-label={`Email ${student.name}`}
                title="Email"
              >
                <IconMail size={16} />
              </a>
            </div>
            <div className="absolute left-4 right-4 bottom-4">
              <div className="text-white font-semibold text-lg leading-tight">
                {student.name}
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white/90 text-sm font-semibold truncate">
                    {student.company}
                  </div>
                  <div className="text-white/70 text-xs truncate">{student.role}</div>
                </div>
                <div className="shrink-0 rounded-xl bg-white/15 border border-white/25 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                  {student.package}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-white/70">Batch {student.batch}</div>
            </div>
          </div>
        }
      />
    </div>
  );
};

// Mobile/tablet flat card (no 3D tilt), cloned from frontend copy
const StudentCardMobile = ({ student, index }) => {
  const height = 'clamp(340px, 78vw, 520px)';

  return (
    <div
      className="relative w-full"
      style={{
        animationDelay: `${index * 90}ms`,
        animation: 'slideInUp 0.55s ease-out forwards',
      }}
    >
      <div
        className="relative w-full overflow-hidden rounded-[10px] border border-[var(--pl-border)] shadow-sm"
        style={{ height }}
      >
        <img
          src={student.profileImg}
          alt={`${student.name} - ${student.company}`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        {/* Actions: always visible on mobile */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <a
            href={student.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur transition active:scale-[0.98]"
            aria-label={`Open ${student.name} LinkedIn`}
            title="LinkedIn"
          >
            <IconBrandLinkedin size={18} />
          </a>
          <a
            href={studentEmailHref(student)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur transition active:scale-[0.98]"
            aria-label={`Email ${student.name}`}
            title="Email"
          >
            <IconMail size={18} />
          </a>
        </div>

        <div className="absolute left-4 right-4 bottom-4">
          <div className="text-white font-semibold text-xl leading-tight">{student.name}</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-white/90 text-sm font-semibold truncate">
                {student.company}
              </div>
              <div className="text-white/70 text-xs truncate">{student.role}</div>
            </div>
            <div className="shrink-0 rounded-xl bg-white/15 border border-white/25 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
              {student.package}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-white/70">Batch {student.batch}</div>
        </div>
      </div>
    </div>
  );
};

export default function PlacementRecords({ onLoginOpen }) {
  const [currentRow, setCurrentRow] = useState(0);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [isSectionInView, setIsSectionInView] = useState(false);
  const cardsToShow = 5;
  const sectionRef = useRef(null);
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

  // Primary (first) card and its testimonial for middle column
  const primaryCard = currentCards[0];
  const primaryTestimonialIndex = useMemo(
    () => (currentRow * cardsToShow) % TESTIMONIALS.length,
    [currentRow]
  );
  const primaryTestimonial = TESTIMONIALS[primaryTestimonialIndex];

  return (
    <>
      <section
        ref={sectionRef}
        className="py-12 sm:py-16 overflow-hidden relative"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12 flex flex-col justify-center items-center lg:relative">
            <h2 className="text-balance mt-4 text-4xl sm:text-5xl font-bold text-[var(--pl-text)] mb-3 tracking-tight leading-tight flex flex-wrap items-center justify-center gap-x-2">
              Hear How They{" "}
              <span className="inline-block h-[0.95em] w-[4em] sm:w-[5em] overflow-hidden align-middle -ml-1.5">
                <img
                  src="/Untitled_Artwork_4.gif"
                  alt="Cracked It"
                  className="w-full h-full object-contain object-center"
                />
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-[var(--pl-text-secondary)] font-normal">
              Success stories from our placed students
            </p>

            {/* Show All button */}
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
            {/* Desktop: horizontal connector line between left card and testimonial */}
            <div
              className="hidden lg:block absolute left-[27%] w-[6%] top-1/2 -translate-y-1/2 h-1 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(to right, rgba(30, 58, 95, 0.4), rgba(25, 55, 95, 0.85), rgba(30, 58, 95, 0.4))',
              }}
              aria-hidden
            />
            {/* Desktop: middle column shows testimonial of the first (left) card */}
            {primaryCard && primaryTestimonial && (
              <div
                className="hidden lg:flex absolute top-[10%] left-[46%] -translate-x-1/2 min-w-[260px] max-w-[320px] w-[20vw] min-h-[260px] p-6 rounded-xl bg-white shadow-xl border border-slate-900/[0.05] flex-col gap-3 z-[15]"
              >
                <p className="m-0 text-[0.9rem] leading-relaxed text-gray-600">
                  {primaryTestimonial}
                </p>
                <div className="flex flex-col gap-0.5 text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{primaryCard.name}</span>
                  <span className="text-[0.78rem]">
                    {primaryCard.company} • {primaryCard.role}
                  </span>
                </div>
              </div>
            )}
            {/* Laptop and up: 5-card layout (absolute positions) */}
            <div
              className="hidden lg:block relative min-h-[280px] w-full max-w-7xl mx-auto transition-all duration-1000 ease-in-out"
              onMouseEnter={() => setIsRotating(false)}
              onMouseLeave={() => setIsRotating(true)}
            >
              {currentCards.map((student, index) => (
                <div
                  key={`${currentRow}-${index}`}
                  className={`absolute top-0 min-w-[260px] max-w-[320px] w-[20vw] ${
                    index === 0
                      ? 'left-[2%] z-[5]'
                      : index === 1
                        ? 'right-[10%] z-[4]'
                        : index === 2
                          ? 'right-[6%] z-[3]'
                          : index === 3
                            ? 'right-[2%] z-[2]'
                            : 'right-[-2%] z-[1]'
                  }`}
                  style={{
                    animationDelay: `${index * 80}ms`,
                    animation: 'slideInUp 0.6s ease-out forwards',
                  }}
                >
                  <StudentCardDesktop student={student} index={index} />
                </div>
              ))}
            </div>
            {/* Desktop controls: previous / next arrows for left card row */}
            <div className="hidden lg:flex justify-center mt-8 gap-4">
              <button
                type="button"
                onClick={() =>
                  setCurrentRow((prev) =>
                    (prev - 1 + STUDENT_RECORDS.length) % STUDENT_RECORDS.length
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 shadow-sm transition"
                aria-label="Previous stories"
              >
                <span className="text-lg">&larr;</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentRow((prev) =>
                    (prev + 1) % STUDENT_RECORDS.length
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 shadow-sm transition"
                aria-label="Next stories"
              >
                <span className="text-lg">&rarr;</span>
              </button>
            </div>

            {/* Mobile only: StudentCardMobile carousel — 1 full card + 1/4 of next */}
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
                    <StudentCardMobile student={student} index={idx} />
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