import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import BannerImage1 from '../../assets/images/IndiaMapBlend.png'
import '../../index.css'
import { TypeWriter, ScribbledText } from "./TextStyle";
import r2 from '../../assets/images/r2.png'
// Load Lottie web component
if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.2/dist/dotlottie-wc.js';
  script.type = 'module';
  if (!document.head.querySelector('script[src*="dotlottie-wc"]')) {
    document.head.appendChild(script);
  }
}

const Banner = () => {
  const containerRef = useRef(null);
  const missionRef = useRef(null);
  const solutionsRef = useRef(null);
  const mapRef = useRef(null);
  const factsRef = useRef(null);

  // Function to animate counting numbers
  const startCounting = (elementId, start, end, duration, suffix = '') => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const increment = (end - start) / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        current = end;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current) + suffix;
    }, 16);
  };

  useEffect(() => {
    const container = containerRef.current;
    const missionEl = missionRef.current;
    const solutionsEl = solutionsRef.current;
    const mapEl = mapRef.current;
    const factsEl = factsRef.current;

    // Set initial states - hide everything except main title initially
    gsap.set([solutionsEl], { opacity: 0, y: 30 });
    gsap.set([mapEl, factsEl], { opacity: 0, y: 30 });
    gsap.set(missionEl, { opacity: 1, y: 0 });

    // Entrance animation timeline
    const entranceTl = gsap.timeline();

    // Animate map first
    entranceTl.to(mapEl, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out"
    });



    // Animate facts around the map
    entranceTl.to(factsEl, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out"
    }, "-=0.5");

    // Calculate when TypeWriter will complete:
    // delay: 2s + (5 chars × 0.2s charDelay) + (0.1s charDuration × 5) = 2 + 1 + 0.5 = 3.5s
    // const typewriterCompletionTime = 2.5; // small buffer

    // subtitle after TypeWriter completes


    // Animate solutions section
    entranceTl.to(solutionsEl, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out"
    }, "-=0.3");


    return () => {
      entranceTl.kill();
    };
  }, []);

  const factTimeline = [
    { pct: '70%', label: 'Students lack industry‑relevant skills' },
    { pct: '55%', label: 'Students are unprepared for real interview and hiring processes' },
    { pct: '40%', label: 'Students choose the wrong career path' },
    { pct: '29%', label: 'Young population lacks industry exposure' },
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-6 sm:pb-12 pt-24 sm:pt-28 lg:pt-12 overflow-x-hidden scrollbar-hide"
    >
      {/* Laptop and up: original layout (Map + overlay facts) */}
      <div className="hidden lg:grid max-w-7xl mx-auto grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-center w-full">
        <div className="w-full order-1 pr-2 xl:pr-6 self-start -ml-4 lg:-ml-6" style={{ marginTop: '20px' }}>
          <div ref={mapRef} className="relative pt-10 lg:pt-0 mb-4 w-full h-full flex items-center justify-center">
            <div ref={factsRef} className="w-full h-full flex items-center justify-center">
              <svg viewBox="0 0 800 650" className="w-full h-auto max-w-[120%] lg:max-w-[145%] drop-shadow-2xl mt-4 lg:mt-6">
                <image href={BannerImage1} x="0" y="0" width="800" height="650" preserveAspectRatio="xMidYMid meet" />
              </svg>
            </div>
          </div>
        </div>
        <div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-[25%] order-2 mt-8 w-full h-full pl-2 xl:pl-6">
          <div ref={missionRef} className="text-center lg:text-left relative">
            <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-bold text-gray-900 leading-tight">
              On a mission to change the
              <span className="text-blue-900"> Skilling landscape</span> of <span className="italic px-1 rounded-xs bg-gradient-to-t from-yellow-400 to-yellow-400 bg-no-repeat [background-size:100%_25%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%]"> INDIA</span>
            </h1>
            <div className="absolute w-[70%] right-0 top-[80%] -z-10">
              <img src={r2} alt="" className="opacity-30 brightness-90" loading="lazy" />
            </div>
          </div>
          <div ref={solutionsRef} className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-600">
              With two-simple solutions:
            </h2>
            <div className="flex lg:flex-row flex-col justify-between items-center gap-4 sm:gap-2 px-2">
              {/* Industry‑Relevant Skills card with arrow */}
              <div className="relative rounded-md px-4 sm:px-10 py-1.5 shadow-md bg-white/80 hover:shadow-lg transition-all duration-300">
                <div>
                  <h3 className="text-sm text-gray-600 text-center sm:text-base lg:text-lg font-bold">Industry-Relevant <br /> <span className="text-xl text-black italic"> SKILLS</span></h3>
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute w-[90%] -top-[34%] -left-[21%]" viewBox="0 0 800 800">
                    <g strokeWidth="7" stroke="hsl(0,0%,0%)" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="matrix(0.946,0.326,-0.326,0.946,147,-108)">
                      <path d="M347.5 347.5Q359.5 445.5 452.5 452.5 " markerEnd="url(#BannerArrow5)" />
                    </g>
                    <defs>
                      <marker id="BannerArrow5" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto">
                        <polygon points="0,5 1.67,2.5 0,0 5,2.5" fill="hsl(0,0%,0%)" />
                      </marker>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Passion‑Aligned Opportunities card with arrow */}
              <div className="relative rounded-md px-3 sm:px-10 py-1.5 shadow-md bg-white/90 hover:shadow-lg transition-all duration-300">
                <div>
                  <h3 className="text-sm text-center sm:text-base lg:text-lg font-bold text-gray-600">Passion-Aligned <br /><span className="text-xl text-black italic"> OPPORTUNITIES</span></h3>
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute w-[90%] -top-[35%] -right-[22%]" viewBox="0 0 800 800">
                    <g strokeWidth="7" stroke="hsl(0,0%,0%)" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="matrix(0.326,0.946,-0.946,0.326,659,-108)">
                      <path d="M347.5 347.5Q446.5 365.5 452.5 452.5 " markerEnd="url(#BannerArrow6)" />
                    </g>
                    <defs>
                      <marker id="BannerArrow6" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" viewBox="0 0 5 5" orient="auto">
                        <polygon points="0,5 1.67,2.5 0,0 5,2.5" fill="hsl(0,0%,0%)" />
                      </marker>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-around mt-2 sm:mt-4 lg:mt-6 text-center gap-4 sm:gap-0">
              <div className="flex items-center justify-center">
                <ScribbledText
                  text="We Shape Brilliance"
                  color="#1f2937"
                  lineColor="#3b82f6"
                  lineHeight="0.15rem"
                  lineOffset="0px"
                  duration={0.2}
                  delay={2}
                  stagger={0.1}
                  className="font-bold text-base sm:text-md font-caveat italic cursive mt-3"
                />
              </div>
              <div className="flex items-center justify-center">
                <ScribbledText
                  text="You Spot it"
                  color="#1f2937"
                  lineColor="#3b82f6"
                  lineHeight="0.15rem"
                  lineOffset="0px"
                  duration={0.5}
                  delay={2}
                  stagger={0.15}
                  className="font-bold text-base sm:text-md font-caveat italic mt-3"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile only: contained map + REALITY CHECK facts (below lg) */}
      <div className="lg:hidden w-full max-w-xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            On a mission to change the
            <span className="text-blue-900"> Skilling landscape</span> of <span className="italic px-1 rounded-xs bg-gradient-to-t from-yellow-400 to-yellow-400 bg-no-repeat [background-size:100%_25%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%]"> INDIA</span>
          </h1>
        </div>
        <div className="mt-6 relative -ml-3">
          <div className="relative mx-auto w-full max-w-2xl aspect-square mt-4">
            <img
              src={BannerImage1}
              alt=""
              className="w-full h-full object-contain"
              style={{ transform: 'rotateX(12deg) rotateY(-4deg) rotateZ(4deg)' }}
              loading="lazy"
            />
          </div>
          <div className="mt-6">
            <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white/90 px-4 sm:px-5 py-5 shadow-sm">
              <div className="text-xs font-semibold tracking-widest text-gray-500">REALITY CHECK</div>
              <div className="mt-4 relative">
                <div className="pointer-events-none absolute left-6 top-3 bottom-3 w-px bg-gray-200" />
                <div className="space-y-5">
                  {factTimeline.map((f) => (
                    <div key={f.pct} className="flex items-start gap-3">
                      <div className="relative w-12 shrink-0 flex justify-center">
                        <span className="text-sm font-bold text-gray-700">
                          {f.pct}
                        </span>
                      </div>
                      <div className="min-w-0 pt-[2px] text-sm font-semibold text-gray-600 leading-snug">
                        {f.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 space-y-3">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-xs font-semibold tracking-widest text-gray-600 shadow-sm">
              WITH TWO SIMPLE SOLUTIONS
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl px-5 py-5 shadow-sm border border-gray-200 bg-white/90">
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-10 w-10 rounded-2xl border border-gray-200 bg-blue-50 flex items-center justify-center text-blue-900">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19V5a2 2 0 0 1 2-2h10l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8 11h8M8 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 leading-snug">Industry‑Relevant <span className="italic">Skills</span></div>
                  <div className="mt-1 text-sm text-gray-600 leading-snug">Job-ready learning paths mapped to real roles.</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl px-5 py-5 shadow-sm border border-gray-200 bg-white/90">
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-10 w-10 rounded-2xl border border-gray-200 bg-amber-50 flex items-center justify-center text-amber-700">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M7 7l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M17 7l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M12 22v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M4 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M16 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M8.5 15.5a5 5 0 1 1 7 0l-3.5 3.5-3.5-3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 leading-snug">Passion‑Aligned <span className="italic">Opportunities</span></div>
                  <div className="mt-1 text-sm text-gray-600 leading-snug">Roles that match strengths, interests, and growth.</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <ScribbledText text="We Shape Brilliance" color="#1f2937" lineColor="#3b82f6" lineHeight="0.15rem" lineOffset="0px" duration={0.2} delay={1} stagger={0.08} className="font-bold text-base font-caveat italic mt-3" />
            <span className="text-gray-400">•</span>
            <ScribbledText text="You Spot it" color="#1f2937" lineColor="#3b82f6" lineHeight="0.15rem" lineOffset="0px" duration={0.5} delay={1} stagger={0.08} className="font-bold text-base font-caveat italic mt-3" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;
