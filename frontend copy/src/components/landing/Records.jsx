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

function studentEmailHref(student) {
  const name = String(student?.name || '').toLowerCase().trim().replace(/\s+/g, '.');
  const company = String(student?.company || '').toLowerCase().trim().replace(/\s+/g, '');
  if (!name || !company) return 'mailto:placements@example.com';
  return `mailto:${name}@${company}.com`;
}

// Enhanced Student Card Component
const StudentCardDesktop = ({ student, index }) => {
  const height = "340px";

  return (
    <div
      className="relative w-full"
      style={{
        animationDelay: `${index * 100}ms`,
        animation: "slideInUp 0.6s ease-out forwards",
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

// Mobile/tablet: flat card (no 3D tilt / no hover-only UI)
const StudentCardMobile = ({ student, index }) => {
  const height = "clamp(340px, 78vw, 520px)";

  return (
    <div
      className="relative w-full"
      style={{
        animationDelay: `${index * 90}ms`,
        animation: "slideInUp 0.55s ease-out forwards",
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
              <div className="text-white/90 text-sm font-semibold truncate">{student.company}</div>
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
  const [isRotating, setIsRotating] = useState(true);
  const cardsToShow = 4;
  const mobileScrollRef = useRef(null);
  const sectionRef = useRef(null);
  const [isSectionInView, setIsSectionInView] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);

  useEffect(() => {
    if (!isRotating) return;
    const interval = setInterval(() => {
      setCurrentRow((prev) => (prev + 1) % STUDENT_RECORDS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isRotating]);

  const mobileCards = useMemo(() => STUDENT_RECORDS.flat(), []);

  // Only auto-advance when the section is visible (prevents page "jumping")
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

  // Mobile/tablet auto-advance horizontal carousel
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
    // Center the current card WITHOUT moving the page vertically
    const targetLeft = el.offsetLeft + el.offsetWidth / 2 - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [mobileIndex, isSectionInView]);

  const currentCards = useMemo(() => {
    const row = STUDENT_RECORDS[currentRow] || [];
    return row.slice(0, cardsToShow);
  }, [currentRow]);

  return (
    <>
      <section ref={sectionRef} className="py-16 overflow-hidden relative bg-[var(--pl-bg)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12 flex flex-col justify-center items-center lg:relative">
            <h2 className="text-balance mt-4 text-4xl sm:text-5xl font-bold text-[var(--pl-text)] mb-3 tracking-tight leading-tight">
              Hear How They{" "}
              <span
                className="relative px-1 bg-gradient-to-t from-[var(--pl-accent-orange)] to-[var(--pl-accent-orange)] bg-no-repeat
                [background-size:100%_22%] [background-position:0_92%]
                transition-all duration-300 ease-in-out
                hover:[background-size:100%_100%] hover:[background-position:0_100%]"
              >
                Cracked It
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-[var(--pl-text-secondary)] font-normal">
              Success stories from our placed students
            </p>
          </div>

          <div className="relative">
            {/* Desktop: 4-card grid (unchanged behavior) */}
            <div
              className="hidden desk:grid grid-cols-4 gap-12 transition-all duration-1000 ease-in-out w-full"
              onMouseEnter={() => setIsRotating(false)}
              onMouseLeave={() => setIsRotating(true)}
            >
              {currentCards.map((student, index) => (
                <StudentCardDesktop
                  key={`${currentRow}-${index}`}
                  student={student}
                  index={index}
                />
              ))}
            </div>

            {/* Mobile/Tablet: horizontal snap carousel (1 card + peek next) */}
            <div
              ref={mobileScrollRef}
              className="desk:hidden -mx-6 px-6 flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory scroll-px-6 scrollbar-hide"
              style={{ WebkitOverflowScrolling: "touch" }}
              onPointerEnter={() => setIsRotating(false)}
              onPointerLeave={() => setIsRotating(true)}
              onTouchStart={() => setIsRotating(false)}
              onTouchEnd={() => setIsRotating(true)}
            >
              {mobileCards.map((student, idx) => (
                <div
                  key={`${student.name}-${idx}`}
                  className="snap-center shrink-0 w-[84%] sm:w-[62%]"
                >
                  <StudentCardMobile student={student} index={idx % 6} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}