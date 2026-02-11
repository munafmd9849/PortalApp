import React, { useEffect, useMemo, useRef, useState } from "react";
import { IconBrandLinkedin, IconMail } from "@tabler/icons-react";
import TiltedCard from "./TiltedCard";

import CS1 from "../../assets/images/CS4.png";
import CS2 from "../../assets/images/CS2.webp";
import CS3 from "../../assets/images/CS3.webp";
import CS4 from "../../assets/images/CS1.webp";
import CS5 from "../../assets/images/CS5.png";
import CS6 from "../../assets/images/CS6.png";

const TeamCard = ({ member, cardWidth, variant = "desktop" }) => {
  const isMobile = variant === "mobile";
  const height = isMobile ? "clamp(340px, 78vw, 520px)" : "clamp(240px, 52vw, 340px)";
  const radius = isMobile ? "rounded-[10px]" : "rounded-[18px]";
  const rotate = isMobile ? 4 : 7;
  const scale = isMobile ? 1.02 : 1.04;

  return (
    <div
      className="relative w-full"
      style={cardWidth ? { width: `${cardWidth}px` } : undefined}
    >
      <TiltedCard
        imageSrc={member.image}
        altText={`${member.name} - ${member.position}`}
        captionText={`${member.name} • ${member.position}`}
        containerHeight={height}
        containerWidth="100%"
        imageHeight={height}
        imageWidth="100%"
        rotateAmplitude={rotate}
        scaleOnHover={scale}
        showMobileWarning={false}
        showTooltip={true}
        displayOverlayContent={true}
        imageRadiusClassName={radius}
        overlayContent={
          <div className={`h-full w-full ${radius} overflow-hidden relative`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {/* Hover actions (top) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-100 pointer-events-auto lg:opacity-0 lg:pointer-events-none transition-opacity duration-200 lg:group-hover:opacity-100 lg:group-hover:pointer-events-auto">
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                aria-label={`Open ${member.name} LinkedIn`}
                title="LinkedIn"
              >
                <IconBrandLinkedin size={16} />
              </a>
              <a
                href={`mailto:${member.email}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                aria-label={`Email ${member.name}`}
                title="Email"
              >
                <IconMail size={16} />
              </a>
            </div>
            <div className="absolute left-4 right-4 bottom-4">
              <div className="text-white font-semibold text-lg leading-tight">
                {member.name}
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white/90 text-sm font-semibold truncate">
                    Office of Career Services
                  </div>
                  <div className="text-white/70 text-xs truncate">
                    {member.position}
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default function AdminSlider() {
  const members = [
    {
      name: "Syed Zabi Ulla",
      image: CS1,
      position: "Career Services",
      linkedin: "https://www.linkedin.com/in/syedzaabii/",
      email: "kaiful@example.com",
    },
    {
      name: "Dr. Sapna",
      image: CS2,
      position: "Career Services",
      linkedin: "https://www.linkedin.com/in/saurabhmoharikar/",
      email: "saurabh@example.com",
    },
    {
      name: "Mr. Vikas",
      image: CS3,
      position: "Career Services",
      linkedin: "https://linkedin.com/in/vikas",
      email: "vikas@example.com",
    },
    {
      name: "Mr. Janishar Ali",
      image: CS4,
      position: "Career Services",
      linkedin: "https://linkedin.com/in/arjun",
      email: "arjun@example.com",
    },
    {
      name: "Mr. Saurabh",
      image: CS5,
      position: "Career Services",
      linkedin: "https://linkedin.com/in/priya",
      email: "priya@example.com",
    },
    {
      name: "X",
      image: CS6,
      position: "Career Services",
      linkedin: "https://linkedin.com/in/rahul",
      email: "rahul@example.com",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const cardsToShow = 4;
  const sectionRef = useRef(null);
  const mobileScrollRef = useRef(null);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [mobilePaused, setMobilePaused] = useState(false);
  const [mobileInView, setMobileInView] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      // rotate by 4 (like student section shows a fresh set)
      setCurrentIndex((prev) => (prev + cardsToShow) % members.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isPaused, members.length]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setMobileInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Mobile/tablet auto-advance carousel (1-by-1)
  useEffect(() => {
    if (!mobileInView) return;
    if (mobilePaused) return;
    if (!members.length) return;
    const id = window.setInterval(() => {
      setMobileIndex((p) => (p + 1) % members.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, [mobileInView, mobilePaused, members.length]);

  useEffect(() => {
    if (!mobileInView) return;
    const container = mobileScrollRef.current;
    if (!container) return;
    const el = container.children?.[mobileIndex];
    if (!el) return;
    const targetLeft = el.offsetLeft + el.offsetWidth / 2 - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [mobileIndex, mobileInView]);

  const pageCount = useMemo(() => {
    if (!members.length) return 0;
    return Math.ceil(members.length / cardsToShow);
  }, [members.length, cardsToShow]);

  const activePage = useMemo(() => {
    if (!pageCount) return 0;
    return Math.floor(currentIndex / cardsToShow) % pageCount;
  }, [currentIndex, cardsToShow, pageCount]);

  const visibleMembers = useMemo(() => {
    if (!members.length) return [];
    const out = [];
    for (let i = 0; i < cardsToShow; i += 1) {
      out.push(members[(currentIndex + i) % members.length]);
    }
    return out;
  }, [currentIndex, members]);

  return (
    <section ref={sectionRef} className="relative w-full bg-[var(--pl-bg)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,color-mix(in_oklab,var(--pl-primary)_16%,transparent),transparent_60%)]" />
      <div className="w-full max-w-7xl mx-auto px-6 py-16 relative">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold tracking-widest text-[var(--pl-text-muted)]">THE TEAM</p>
          <h2 className="text-balance mt-4 text-4xl sm:text-5xl font-bold text-[var(--pl-text)] tracking-tight leading-tight">
            Office of{" "}
            <span
              className="relative px-1 rounded-xs bg-gradient-to-t from-yellow-400 to-yellow-400 bg-no-repeat
              [background-size:100%_25%] [background-position:0_100%]
              transition-all duration-300 ease-in-out
              hover:[background-size:100%_100%] hover:[background-position:100%_100%]"
            >
              Career Services
            </span>
          </h2>
        </div>

        {/* Desktop: 4-card grid (unchanged) */}
        <div
          className="relative hidden desk:block"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="grid grid-cols-4 gap-12 transition-all duration-700 ease-in-out w-full">
            {visibleMembers.map((m) => (
              <TeamCard key={m.name} member={m} variant="desktop" />
            ))}
          </div>
        </div>

        {/* Mobile/Tablet: horizontal snap carousel (center + peek next) */}
        <div
          ref={mobileScrollRef}
          className="desk:hidden -mx-6 px-6 flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory scroll-px-6 scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
          onPointerDown={() => setMobilePaused(true)}
          onPointerUp={() => setMobilePaused(false)}
          onTouchStart={() => setMobilePaused(true)}
          onTouchEnd={() => setMobilePaused(false)}
        >
          {members.map((m, idx) => (
            <div key={`${m.name}-${idx}`} className="snap-center shrink-0 w-[84%] sm:w-[62%]">
              <TeamCard member={m} variant="mobile" />
            </div>
          ))}
        </div>

        {/* Carousel dots / pager */}
        {pageCount > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: pageCount }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const targetIndex = (idx * cardsToShow) % members.length;
                  setCurrentIndex(targetIndex);
                  setMobileIndex(targetIndex);
                  setIsPaused(true);
                  setMobilePaused(true);
                }}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                  idx === activePage
                    ? "bg-[var(--pl-primary)] scale-110"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to team slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}