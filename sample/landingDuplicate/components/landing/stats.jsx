import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaMoneyBillWave, FaCalendarAlt, FaChartLine, FaHandshake, FaUserTie, FaMoneyCheckAlt } from "react-icons/fa";
import { MdAttachMoney } from "react-icons/md";
import GlareHover from "./GlareHover";

const stats = [
  {
    label: "Highest CTC Offered",
    value: "₹45 LPA",
    icon: <FaMoneyBillWave className="text-xl" />,
  },
  {
    label: "Placement Drives",
    value: "85",
    icon: <FaCalendarAlt className="text-xl" />,
  },
  {
    label: "Average CTC",
    value: "₹12.5 LPA",
    icon: <MdAttachMoney className="text-xl" />,
  },
  {
    label: "Placement Percentage",
    value: "92%",
    icon: <FaChartLine className="text-xl" />,
  },
  {
    label: "Global Internships",
    value: "42+",
    icon: <FaMoneyCheckAlt className="text-xl" />,
  },
  {
    label: "Ventures Launched",
    value: "7",
    icon: <FaHandshake className="text-xl" />,
  },
  {
    label: "Exclusive Recruiters",
    value: "12",
    icon: <FaUserTie className="text-xl" />,
  },
  {
    label: "Average Stipend",
    value: "₹35K",
    icon: <FaMoneyCheckAlt className="text-xl" />,
  },
];

const PlacementStats = () => {
  const sectionRef = useRef(null);
  const mobileScrollRef = useRef(null);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [mobilePaused, setMobilePaused] = useState(false);
  const [inView, setInView] = useState(false);

  const mobileCards = useMemo(() => stats, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Mobile/tablet auto-advance carousel
  useEffect(() => {
    if (!inView) return;
    if (mobilePaused) return;
    if (!mobileCards.length) return;
    const id = window.setInterval(() => {
      setMobileIndex((p) => (p + 1) % mobileCards.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, [inView, mobilePaused, mobileCards.length]);

  useEffect(() => {
    if (!inView) return;
    const container = mobileScrollRef.current;
    if (!container) return;
    const el = container.children?.[mobileIndex];
    if (!el) return;
    const targetLeft = el.offsetLeft + el.offsetWidth / 2 - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [mobileIndex, inView]);

  return (
    <section ref={sectionRef} className="relative py-16 overflow-hidden bg-[var(--pl-bg)]">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,color-mix(in_oklab,var(--pl-primary)_18%,transparent),transparent_60%)]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--pl-border)] bg-[var(--pl-surface)] px-3 py-1 text-xs font-semibold tracking-widest text-[var(--pl-text-secondary)] shadow-sm backdrop-blur">
            PLACEMENT IMPACT
          </p>
          <h2 className="text-balance mt-4 text-3xl sm:text-4xl font-bold text-[var(--pl-text)] text-center tracking-tight leading-tight">
            Heard the WHY —{" "}
            <span
              className="relative px-1 bg-gradient-to-t from-[var(--pl-accent-orange)] to-[var(--pl-accent-orange)] bg-no-repeat
              [background-size:100%_22%] [background-position:0_92%]
              transition-all duration-300 ease-in-out
              hover:[background-size:100%_100%] hover:[background-position:0_100%]"
            >
              Here's the WoW!
              {/* Sparkle animations (subtle) */}
              <span
                className="absolute -top-3 -right-6 sm:-right-8 animate-sparkle"
                style={{ animationDelay: "0s" }}
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M14 3L16.5 11.5L25 14L16.5 16.5L14 25L11.5 16.5L3 14L11.5 11.5L14 3Z"
                    fill="var(--pl-accent-orange)"
                  />
                </svg>
              </span>
              <span
                className="absolute -top-2 -left-3 sm:-top-3 sm:-left-5 animate-sparkle"
                style={{ animationDelay: "1s" }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8 2L9.2 6.2L14 8L9.2 9.2L8 14L6.8 9.2L2 8L6.8 6.2L8 2Z"
                    fill="var(--pl-accent-orange)"
                  />
                </svg>
              </span>
            </span>
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[var(--pl-text-secondary)]">
            A quick snapshot of outcomes we’re proud of.
          </p>
        </div>

        {/* Desktop: grid (unchanged) */}
        <div className="hidden desk:grid mt-10 grid-cols-4 gap-7">
          {stats.map((stat, index) => (
            <GlareHover
              key={index}
              width="100%"
              height="100%"
              background="var(--pl-surface-strong)"
              borderRadius="16px"
              borderColor="var(--pl-border)"
              glareColor="#1E3A8A"
              glareOpacity={0.14}
              glareAngle={-30}
              glareSize={320}
              transitionDuration={800}
              playOnce={false}
              className="shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              style={{ borderWidth: 1 }}
            >
              <div className="w-full p-5 h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-wide text-[var(--pl-text-muted)] uppercase">
                      {stat.label}
                    </div>
                  </div>
                  <div className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)]">
                    {stat.icon}
                  </div>
                </div>
                <div className="mt-4 text-3xl font-bold tracking-tight text-[var(--pl-text)]">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-[var(--pl-text-secondary)]">
                  Verified placement metrics
                </div>
              </div>
            </GlareHover>
          ))}
        </div>

        {/* Mobile/Tablet: horizontal snap carousel (center + peek next) */}
        <div
          ref={mobileScrollRef}
          className="desk:hidden mt-10 -mx-6 px-6 flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory scroll-px-6 scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
          onPointerDown={() => setMobilePaused(true)}
          onPointerUp={() => setMobilePaused(false)}
          onTouchStart={() => setMobilePaused(true)}
          onTouchEnd={() => setMobilePaused(false)}
        >
          {mobileCards.map((stat, idx) => (
            <div key={`${stat.label}-${idx}`} className="snap-center shrink-0 w-[84%] sm:w-[62%]">
              <GlareHover
                width="100%"
                height="100%"
                background="var(--pl-surface-strong)"
                borderRadius="16px"
                borderColor="var(--pl-border)"
                glareColor="#1E3A8A"
                glareOpacity={0.12}
                glareAngle={-30}
                glareSize={320}
                transitionDuration={800}
                playOnce={false}
                className="shadow-sm"
                style={{ borderWidth: 1 }}
              >
                <div className="w-full p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-wide text-[var(--pl-text-muted)] uppercase">
                        {stat.label}
                      </div>
                    </div>
                    <div className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)]">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="mt-4 text-3xl font-bold tracking-tight text-[var(--pl-text)]">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm text-[var(--pl-text-secondary)]">
                    Verified placement metrics
                  </div>
                </div>
              </GlareHover>
            </div>
          ))}
        </div>
      </div>

      {/* Sparkle Animation & Separator Styles */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8) rotate(-10deg); }
          10% { opacity: 1; transform: scale(1.4) rotate(10deg); }
          20% { opacity: 0.7; transform: scale(1.1) rotate(-5deg); }
          80% { opacity: 0.2; transform: scale(0.8) rotate(-10deg); }
        }
        .animate-sparkle {
          animation: sparkle 2.5s infinite;
          pointer-events: none;
        }
        /* layout is now handled by Tailwind grid/cards */
      `}</style>
    </section>
  );
};

export default PlacementStats;