"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import gsap from "gsap";
import BoldTextAnimation from "./gsap";
import ScrollFloat from "./ScrollFloat";

export default function TimelineWithSidebar() {
  const data = [
    {
      title: "Step 1",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-[var(--pl-text)]">
            Profile Registration & Setup
          </h4>
          <p className="mb-8 text-base md:text-lg font-normal text-[var(--pl-text-secondary)]">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Create your account with academic credentials, personal information, and career preferences.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: "Step 2",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-[var(--pl-text)]">
            Resume Upload & Documentation
          </h4>
          <p className="mb-4 text-base md:text-lg font-normal text-[var(--pl-text-secondary)]">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Upload your resume and supporting documents including academics , certificates, and project portfolios.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: "Step 3",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-[var(--pl-text)]">
            Job Opportunity Discovery
          </h4>
          <p className="mb-8 text-base md:text-lg font-normal text-[var(--pl-text-secondary)]">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Browse and analyze available job descriptions posted by recruiters and companies.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: "Step 4",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-[var(--pl-text)]">
            Application Submission Process
          </h4>
          <p className="mb-4 text-base md:text-lg font-normal text-[var(--pl-text-secondary)]">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Submit targeted applications for selected positions through the portal.
            </motion.span>
          </p>
          <div className="text-xs md:text-sm text-[var(--pl-text-muted)]"></div>
        </div>
      ),
    },
    {
      title: "Step 5",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-[var(--pl-text)]">
            Application Status Tracking
          </h4>
          <p className="mb-8 text-base md:text-lg font-normal text-[var(--pl-text-secondary)]">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Monitor your application progress through the placement dashboard.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: "Step 6",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-[var(--pl-text)]">
            Administrative Coordination & Notifications
          </h4>
          <p className="mb-4 text-base md:text-lg font-normal text-[var(--pl-text-secondary)]">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              Receive automated notifications updates regarding interview schedules.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: "Step 7",
      content: (
        <div>
          <h4 className="mb-4 text-base font-semibold text-[var(--pl-text)]">
            Interview Process & Final Selection
          </h4>
          <p className="mb-4 text-base md:text-lg font-normal text-[var(--pl-text-secondary)]">
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ display: "inline-block" }}
            >
              The interview rounds navigate through multiple selection stages while maintaining professional communication with recruiters.
            </motion.span>
          </p>
        </div>
      ),
    },
    {
      title: (
        <span>
          It's Time To Give Back To The '
          <span className="px-1 bg-gradient-to-t from-[var(--pl-accent-orange)] to-[var(--pl-accent-orange)] bg-no-repeat [background-size:100%_25%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%]">
            SOCIETY
          </span>
          '
        </span>
      ),
    },
  ];

  const [showSecond, setShowSecond] = useState(false);
  const firstRef = useRef(null);
  const secondRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // Animate first text out
  useEffect(() => {
    if (!showSecond && firstRef.current) {
      const chars = firstRef.current.textContent.split("");
      firstRef.current.innerHTML = chars
        .map((c, i) => <span data-idx="${i}">${c === " " ? "&nbsp;" : c}</span>)
        .join("");

      const spans = firstRef.current.querySelectorAll("span");
      gsap.to(spans, {
        duration: 0.8,
        x: () => gsap.utils.random(-80, 80),
        y: () => gsap.utils.random(-40, 40),
        rotation: () => gsap.utils.random(-70, 70),
        opacity: 0,
        ease: "power3.in",
        stagger: 0.04,
        delay: 1.7,
        onComplete: () => setShowSecond(true),
      });
    }
  }, [showSecond]);

  // Glare effect on second text
  useEffect(() => {
    if (showSecond && secondRef.current) {
      gsap.fromTo(
        secondRef.current,
        { backgroundPosition: "-200% 0" },
        {
          backgroundPosition: "200% 0",
          duration: 8,
          repeat: -1,
          ease: "linear",
        }
      );
    }
  }, [showSecond]);

  const containerRef = useRef(null);
  const steps = data.slice(0, 7);
  const closing = data[7];
  const mobileSteps = [
    {
      step: "Step 1",
      title: "Profile Registration & Setup",
      description:
        "Create your account with academic credentials, personal information, and career preferences.",
    },
    {
      step: "Step 2",
      title: "Resume Upload & Documentation",
      description:
        "Upload your resume and supporting documents including academics , certificates, and project portfolios.",
    },
    {
      step: "Step 3",
      title: "Job Opportunity Discovery",
      description:
        "Browse and analyze available job descriptions posted by recruiters and companies.",
    },
    {
      step: "Step 4",
      title: "Application Submission Process",
      description: "Submit targeted applications for selected positions through the portal.",
    },
    {
      step: "Step 5",
      title: "Application Status Tracking",
      description: "Monitor your application progress through the placement dashboard.",
    },
    {
      step: "Step 6",
      title: "Administrative Coordination & Notifications",
      description: "Receive automated notifications updates regarding interview schedules.",
    },
    {
      step: "Step 7",
      title: "Interview Process & Final Selection",
      description:
        "The interview rounds navigate through multiple selection stages while maintaining professional communication with recruiters.",
    },
  ];

  // Mobile snap-scroll auto-advance (step-by-step)
  const sectionRef = useRef(null);
  const mobileScrollRef = useRef(null);
  const [mobileIdx, setMobileIdx] = useState(0);
  const [mobilePaused, setMobilePaused] = useState(false);
  const [inView, setInView] = useState(false);
  const resumeTimerRef = useRef(null);
  const setByAutoRef = useRef(false);
  const STEP_HEIGHT = 420;

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

  useEffect(() => {
    if (!inView) return;
    if (mobilePaused) return;
    if (!mobileSteps.length) return;
    const id = window.setInterval(() => {
      setByAutoRef.current = true;
      setMobileIdx((p) => (p + 1) % mobileSteps.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [inView, mobilePaused, mobileSteps.length]);

  useEffect(() => {
    if (!inView) return;
    if (mobilePaused) return;
    const container = mobileScrollRef.current;
    if (!container) return;
    const target = container.children?.[mobileIdx];
    if (!target) return;
    container.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  }, [mobileIdx, inView]);

  // Sync current step when user scrolls manually (prevents snapping back to Step 1)
  useEffect(() => {
    const container = mobileScrollRef.current;
    if (!container) return;

    const onScroll = () => {
      setByAutoRef.current = false;
      setMobilePaused(true);
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = window.setTimeout(() => {
        setMobilePaused(false);
      }, 2500);

      // Determine which step is currently in view
      const idx = Math.round(container.scrollTop / STEP_HEIGHT);
      const clamped = Math.max(0, Math.min(mobileSteps.length - 1, idx));
      setMobileIdx((prev) => (prev === clamped ? prev : clamped));
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    };
  }, [mobileSteps.length]);

  return (
    <section ref={sectionRef} className="relative w-full overflow-clip bg-[var(--pl-bg)]">
      {/* subtle background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,color-mix(in_oklab,var(--pl-primary)_18%,transparent),transparent_60%)]" />
      {/* Desktop layout (unchanged) */}
      <div className="hidden md:flex">
        {/* Timeline Section  */}
        <div className="relative w-full lg:w-[70%] font-inter md:px-10" ref={containerRef}>
          <div className="max-w-5xl mx-auto py-16 px-4 md:px-8 lg:px-10">
            <ScrollFloat
              animationDuration={1}
              ease="back.inOut(2)"
              scrollStart="center bottom+=50%"
              scrollEnd="bottom bottom-=40%"
              stagger={0.03}
              containerClassName="my-0"
              textClassName="font-semibold tracking-tight text-[var(--pl-text)]"
            >
              Walk Through Of Placement Process
            </ScrollFloat>
            <p className="text-[var(--pl-text-secondary)] text-sm md:text-base max-w-lg">
              Navigate through the placement process from profile creation to final selection.
            </p>
          </div>

          {/* Inner scroll timeline */}
          <div className="max-w-5xl mx-auto px-4 md:px-8 lg:px-10 pb-20">
            <div
              ref={scrollAreaRef}
              className="relative h-[440px] overflow-y-auto overflow-x-hidden pr-2 md:pr-4 rounded-3xl border border-[var(--pl-border)] bg-[var(--pl-surface)] backdrop-blur scrollbar-hide snap-y snap-mandatory"
            >
              <div className="relative">
                {steps.map((item, index) => (
                  <motion.section
                    key={index}
                    className="snap-start h-[440px] flex items-center px-4 md:px-10"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.6, root: scrollAreaRef }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    <div className="w-full">
                      {typeof item.title === "string" ? (
                        <ScrollFloat
                          scrollContainerRef={scrollAreaRef}
                          animationDuration={1}
                          ease="back.inOut(2)"
                          scrollStart="center bottom+=50%"
                          scrollEnd="bottom bottom-=40%"
                          stagger={0.03}
                          containerClassName="my-0"
                          textClassName="font-bold text-[var(--pl-text)] tracking-tight"
                        >
                          {item.title}
                        </ScrollFloat>
                      ) : (
                        <h3 className="text-2xl md:text-5xl font-bold text-[var(--pl-text)] tracking-tight">
                          {item.title}
                        </h3>
                      )}

                      <div className="mt-6 rounded-3xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] p-6 md:p-8 shadow-sm">
                        {item.content}
                      </div>
                    </div>
                  </motion.section>
                ))}
              </div>
            </div>

            {/* Closing line (outside inner scroll) */}
            {closing?.title && (
              <div className="pt-10">
                <div className="mx-auto max-w-5xl overflow-x-auto scrollbar-hide">
                  <div className="whitespace-nowrap text-center font-bold text-[var(--pl-text)] text-[clamp(1.1rem,2.4vw,2.2rem)]">
                    {closing.title}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar*/}
        <BoldTextAnimation />
      </div>

      {/* Mobile layout: vertical snap scroll + auto-advance */}
      <div className="md:hidden relative z-10 w-full">
        <div className="mx-auto max-w-xl px-4 py-12">
          <h2 className="text-balance text-2xl font-bold text-[var(--pl-text)] tracking-tight leading-tight">
            Walk Through Of Placement Process
          </h2>
          <p className="mt-2 text-sm text-[var(--pl-text-secondary)]">
            Navigate through the placement process from profile creation to final selection.
          </p>

          <div
            ref={mobileScrollRef}
            className="mt-6 relative h-[420px] overflow-y-auto overflow-x-hidden pr-2 scrollbar-hide snap-y snap-mandatory"
            onTouchStart={() => setMobilePaused(true)}
            onTouchEnd={() => {
              if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
              resumeTimerRef.current = window.setTimeout(() => setMobilePaused(false), 2500);
            }}
            onPointerDown={() => setMobilePaused(true)}
            onPointerUp={() => {
              if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
              resumeTimerRef.current = window.setTimeout(() => setMobilePaused(false), 2500);
            }}
          >
            <div className="relative">
              {mobileSteps.map((s) => (
                <div key={s.step} className="snap-start h-[420px] flex items-center px-4">
                  <div className="w-full py-2">
                    <div className="text-xs font-semibold tracking-wide text-[var(--pl-text-muted)] uppercase">
                      {s.step}
                    </div>
                    <div className="mt-2 text-xl font-bold text-[var(--pl-text)] leading-snug">
                      {s.title}
                    </div>
                    <p className="mt-3 text-sm text-[var(--pl-text-secondary)] leading-relaxed">
                      {s.description}
                    </p>
                    <div className="mt-6 h-px w-full bg-[var(--pl-border)]" />
                    <div className="mt-4 text-xs text-[var(--pl-text-muted)]">
                      Swipe up/down to see next step.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {closing?.title && (
            <div className="pt-10">
              <div className="mx-auto max-w-xl overflow-x-auto scrollbar-hide">
                <div className="whitespace-nowrap text-center font-bold text-[var(--pl-text)] text-[clamp(1.05rem,4.6vw,1.7rem)]">
                  {closing.title}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}