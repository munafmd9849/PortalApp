import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import BannerImage1 from "../../assets/images/IndiaMapBlend.png";
import r2 from "../../assets/images/r2.png";
import "../../index.css";
import { TypeWriter, ScribbledText } from "./TextStyle";

// Load Lottie web component
if (typeof window !== "undefined") {
  const script = document.createElement("script");
  script.src =
    "https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.2/dist/dotlottie-wc.js";
  script.type = "module";
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

  const facts = [
    "70% Students lack industry‑relevant skills",
    "55% Students are unprepared for real interview and hiring processes",
    "40% Students choose the wrong career path",
    "29% Young population lacks industry exposure",
  ];
  const factTimeline = [
    { pct: "70%", label: "Students lack industry‑relevant skills" },
    { pct: "55%", label: "Students are unprepared for real interview and hiring processes" },
    { pct: "40%", label: "Students choose the wrong career path" },
    { pct: "29%", label: "Young population lacks industry exposure" },
  ];

  useEffect(() => {
    const missionEl = missionRef.current;
    const solutionsEl = solutionsRef.current;
    const mapEl = mapRef.current;
    const factsEl = factsRef.current;

    // Set initial states
    gsap.set([solutionsEl], { opacity: 0, y: 30 });
    gsap.set([mapEl, factsEl], { opacity: 0, y: 30 });
    gsap.set(missionEl, { opacity: 1, y: 0 });

    const entranceTl = gsap.timeline();

    entranceTl.to(mapEl, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out",
    });

    entranceTl.to(
      factsEl,
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
      },
      "-=0.5"
    );

    entranceTl.to(
      solutionsEl,
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
      },
      "-=0.3"
    );

    return () => {
      entranceTl.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen flex items-center justify-center px-4 sm:px-6 desk:px-8 pb-6 sm:pb-12 pt-24 sm:pt-28 desk:pt-12"
    >
      {/* Desktop layout (unchanged) */}
      <div className="hidden desk:grid max-w-7xl mx-auto grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-center">
        {/* India Map with Facts */}
        <div className="w-full h-full order-1 pr-2 xl:pr-6">
          <div ref={mapRef} className="relative pt-10 lg:pt-0 mb-4 w-full h-full">
            <img
              className="absolute -left-[6%] w-[75%] lg:w-[85%]"
              style={{
                transform: "rotateX(20deg) rotateY(-5deg) rotateZ(5deg)",
              }}
              src={BannerImage1}
              alt=""
            />

            {/* India Facts */}
            <div ref={factsRef} className="absolute w-full h-full">
              <div className="relative w-full h-full">
                <div className="absolute right-[5%] top-[12%] flex items-center gap-2 text-sm font-semibold text-[var(--pl-text-secondary)]">
                  <span className="shrink-0 inline-flex items-center rounded-full border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] px-2 py-0.5 text-[11px] font-bold text-[var(--pl-primary)]">
                    70%
                  </span>
                  <span>Students lack industry‑relevant skills</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute right-[18%] -top-[22%]"
                  version="1.1"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 800 800"
                >
                  <g
                    strokeWidth="2"
                    stroke="hsl(0, 0%, 0%)"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="3 6"
                    transform="rotate(273, 400, 400)"
                  >
                    <path
                      d="M350.5 350.5Q410.5 384.5 449.5 449.5 "
                      markerEnd="url(#SvgjsMarker1820)"
                    ></path>
                  </g>
                  <defs>
                    <marker
                      markerWidth="5"
                      markerHeight="5"
                      refX="2.5"
                      refY="2.5"
                      viewBox="0 0 5 5"
                      orient="auto"
                      id="SvgjsMarker1820"
                    >
                      <polygon
                        points="0,5 1.6666666666666667,2.5 0,0 5,2.5"
                        fill="hsl(0, 0%, 0%)"
                      ></polygon>
                    </marker>
                  </defs>
                </svg>

                <div className="absolute right-[2%] top-[21%] w-1/2 flex items-start gap-2 text-sm font-semibold text-[var(--pl-text-secondary)]">
                  <span className="mt-0.5 shrink-0 inline-flex items-center rounded-full border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] px-2 py-0.5 text-[11px] font-bold text-[var(--pl-primary)]">
                    40%
                  </span>
                  <span>Students choose the wrong career path</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute right-[25%] -top-[30%]"
                  version="1.1"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 800 800"
                >
                  <g
                    strokeWidth="2"
                    stroke="hsl(0, 0%, 0%)"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="3 6"
                    transform="rotate(284, 400, 400)"
                  >
                    <path
                      d="M350.5 350.5Q410.5 384.5 449.5 449.5 "
                      markerEnd="url(#SvgjsMarker1829)"
                    ></path>
                  </g>
                  <defs>
                    <marker
                      markerWidth="5"
                      markerHeight="5"
                      refX="2.5"
                      refY="2.5"
                      viewBox="0 0 5 5"
                      orient="auto"
                      id="SvgjsMarker1829"
                    >
                      <polygon
                        points="0,5 1.6666666666666667,2.5 0,0 5,2.5"
                        fill="hsl(0, 0%, 0%)"
                      ></polygon>
                    </marker>
                  </defs>
                </svg>

                <div className="absolute right-[2%] bottom-[12%] w-1/2 flex items-start gap-2 text-sm font-semibold text-[var(--pl-text-secondary)]">
                  <span className="mt-0.5 shrink-0 inline-flex items-center rounded-full border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] px-2 py-0.5 text-[11px] font-bold text-[var(--pl-primary)]">
                    29%
                  </span>
                  <span>Young population lacks industry exposure</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute right-[17%] top-[16%]"
                  version="1.1"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 800 800"
                >
                  <g
                    strokeWidth="2"
                    stroke="hsl(0, 0%, 0%)"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="3 6"
                    transform="rotate(351, 400, 400)"
                  >
                    <path
                      d="M350.5 350.5Q447.5 370.5 449.5 449.5 "
                      markerEnd="url(#SvgjsMarker2041)"
                    ></path>
                  </g>
                  <defs>
                    <marker
                      markerWidth="5"
                      markerHeight="5"
                      refX="2.5"
                      refY="2.5"
                      viewBox="0 0 5 5"
                      orient="auto"
                      id="SvgjsMarker2041"
                    >
                      <polygon
                        points="0,5 1.6666666666666667,2.5 0,0 5,2.5"
                        fill="hsl(0, 0%, 0%)"
                      ></polygon>
                    </marker>
                  </defs>
                </svg>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute right-[30%] top-[56%]"
                  version="1.1"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 800 800"
                >
                  <g
                    strokeWidth="2"
                    stroke="hsl(0, 0%, 0%)"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="3 6"
                    transform="rotate(330, 400, 400)"
                  >
                    <path
                      d="M350.5 350.5Q362.5 419.5 449.5 449.5 "
                      markerEnd="url(#SvgjsMarker2158)"
                    ></path>
                  </g>
                  <defs>
                    <marker
                      markerWidth="5"
                      markerHeight="5"
                      refX="2.5"
                      refY="2.5"
                      viewBox="0 0 5 5"
                      orient="auto"
                      id="SvgjsMarker2158"
                    >
                      <polygon
                        points="0,5 1.6666666666666667,2.5 0,0 5,2.5"
                        fill="hsl(0, 0%, 0%)"
                      ></polygon>
                    </marker>
                  </defs>
                </svg>

                <div className="absolute right-[3%] -bottom-[7%] w-[60%] flex items-start gap-2 text-sm font-semibold text-[var(--pl-text-secondary)]">
                  <span className="mt-0.5 shrink-0 inline-flex items-center rounded-full border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] px-2 py-0.5 text-[11px] font-bold text-[var(--pl-primary)]">
                    55%
                  </span>
                  <span>Students are unprepared for real interview and hiring processes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-[25%] order-2 mt-8 w-full h-full pl-2 xl:pl-6">
          <div ref={missionRef} className="text-center lg:text-left relative">
            <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-bold text-[var(--pl-text)] leading-tight">
              On a mission to change the
              <span className="text-[var(--pl-primary)]"> Skilling landscape</span> of{" "}
              <span className="px-1 rounded-xs bg-gradient-to-t from-[var(--pl-accent-orange)] to-[var(--pl-accent-orange)] bg-no-repeat [background-size:100%_25%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%]">
                INDIA
              </span>
            </h1>
            <div className="pointer-events-none absolute w-[70%] right-0 top-[80%] -z-10">
              <img
                src={r2}
                alt=""
                className="opacity-30 brightness-90 select-none"
                loading="lazy"
              />
            </div>
          </div>

          {/* Solutions */}
          <div ref={solutionsRef} className="space-y-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--pl-text-secondary)]">
                With two-simple solutions:
              </h2>
            </div>

            <div className="flex lg:flex-row flex-col justify-between items-center gap-4 sm:gap-2 px-2">
              {/* Industry Relevant Skills */}
              <div className="relative rounded-md px-4 sm:px-10 py-1.5 shadow-md bg-[var(--pl-surface)] border border-[var(--pl-border)] hover:shadow-lg transition-all duration-300">
                <div>
                  <h3 className="text-sm text-[var(--pl-text-secondary)] text-center sm:text-base lg:text-lg font-bold">
                    Industry-Relevant <br />{" "}
                    <span className="text-xl text-[var(--pl-text)] italic"> SKILLS</span>
                  </h3>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute w-[90%] -top-[34%] -left-[21%]"
                    version="1.1"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 800 800"
                  >
                    <g
                      strokeWidth="7"
                      stroke="hsl(0, 0%, 0%)"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      transform="matrix(0.9455185755993168,0.32556815445715664,-0.32556815445715664,0.9455185755993168,147.0198315431359,-108.43469202258939)"
                    >
                      <path
                        d="M347.5 347.5Q359.5 445.5 452.5 452.5 "
                        markerEnd="url(#SvgjsMarker2436)"
                      ></path>
                    </g>
                    <defs>
                      <marker
                        markerWidth="5"
                        markerHeight="5"
                        refX="2.5"
                        refY="2.5"
                        viewBox="0 0 5 5"
                        orient="auto"
                        id="SvgjsMarker2436"
                      >
                        <polygon
                          points="0,5 1.6666666666666667,2.5 0,0 5,2.5"
                          fill="hsl(0, 0%, 0%)"
                        ></polygon>
                      </marker>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Passion Aligned Opportunities */}
              <div className="relative rounded-md px-3 sm:px-10 py-1.5 shadow-md bg-[var(--pl-surface)] border border-[var(--pl-border)] hover:shadow-lg transition-all duration-300">
                <div>
                  <h3 className="text-sm text-center sm:text-base lg:text-lg font-bold text-[var(--pl-text-secondary)]">
                    Passion-Aligned <br />
                    <span className="text-xl text-[var(--pl-text)] italic">
                      {" "}
                      OPPORTUNITIES
                    </span>
                  </h3>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute w-[90%] -top-[35%] -right-[22%]"
                    version="1.1"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 800 800"
                  >
                    <g
                      strokeWidth="7"
                      stroke="hsl(0, 0%, 0%)"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      transform="matrix(0.32556815445715676,0.9455185755993167,-0.9455185755993167,0.32556815445715676,658.980168456864,-108.43469202258939)"
                    >
                      <path
                        d="M347.5 347.5Q446.5 365.5 452.5 452.5 "
                        markerEnd="url(#SvgjsMarker2056)"
                      ></path>
                    </g>
                    <defs>
                      <marker
                        markerWidth="5"
                        markerHeight="5"
                        refX="2.5"
                        refY="2.5"
                        viewBox="0 0 5 5"
                        orient="auto"
                        id="SvgjsMarker2056"
                      >
                        <polygon
                          points="0,5 1.6666666666666667,2.5 0,0 5,2.5"
                          fill="hsl(0, 0%, 0%)"
                        ></polygon>
                      </marker>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="flex flex-col sm:flex-row justify-around mt-2 sm:mt-4 lg:mt-6 text-center gap-4 sm:gap-0">
              <div className="flex items-center justify-center">
                <ScribbledText
                  text="We Shape Brilliance"
                  color="var(--pl-text)"
                  lineColor="var(--pl-primary)"
                  lineHeight="0.15rem"
                  lineOffset="0px"
                  duration={0.2}
                  delay={2}
                  stagger={0.1}
                  className="font-bold text-base sm:text-md font-caveat italic cursive"
                />
              </div>
              <div className="flex items-center justify-center">
                <ScribbledText
                  text="You Spot it"
                  color="var(--pl-text)"
                  lineColor="var(--pl-primary)"
                  lineHeight="0.15rem"
                  lineOffset="0px"
                  duration={0.5}
                  delay={2}
                  stagger={0.15}
                  className="font-bold text-base sm:text-md font-caveat italic"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet layout */}
      <div className="desk:hidden w-full max-w-xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--pl-text)] leading-tight">
            On a mission to change the
            <span className="text-[var(--pl-primary)]"> Skilling landscape</span> of{" "}
            <span className="px-1 rounded-xs bg-gradient-to-t from-[var(--pl-accent-orange)] to-[var(--pl-accent-orange)] bg-no-repeat [background-size:100%_25%] [background-position:0_100%]">
              INDIA
            </span>
          </h1>
        </div>

        <div className="mt-6 relative">
          <div className="relative mx-auto w-full max-w-sm aspect-square">
            <img
              src={BannerImage1}
              alt=""
              className="w-full h-full object-contain"
              style={{ transform: "rotateX(12deg) rotateY(-4deg) rotateZ(4deg)" }}
            />
          </div>

          {/* Mini vertical timeline (Problem evidence) */}
          <div className="mt-6">
            <div className="mx-auto max-w-md rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface)] px-5 py-5 shadow-sm">
              <div className="text-xs font-semibold tracking-widest text-[var(--pl-text-muted)]">
                REALITY CHECK
              </div>
              <div className="mt-4 relative">
                {/* Single continuous connector aligned to pill center */}
                <div className="pointer-events-none absolute left-6 top-3 bottom-3 w-px bg-[var(--pl-border)]" />
                <div className="space-y-5">
                  {factTimeline.map((f) => (
                    <div key={f.pct} className="flex items-start gap-3">
                      <div className="relative w-12 shrink-0 flex justify-center">
                        <span className="relative inline-flex h-6 items-center justify-center rounded-full border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] px-2.5 text-[11px] font-bold text-[var(--pl-primary)]">
                          {f.pct}
                        </span>
                      </div>
                      <div className="min-w-0 pt-[2px] text-sm font-semibold text-[var(--pl-text-secondary)] leading-snug">
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
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--pl-border)] bg-[var(--pl-surface)] px-3 py-1 text-xs font-semibold tracking-widest text-[var(--pl-text-secondary)] shadow-sm">
              WITH TWO SIMPLE SOLUTIONS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative overflow-hidden rounded-2xl px-5 py-5 shadow-sm border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-surface)_70%,transparent)] backdrop-blur">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_70%_at_20%_10%,color-mix(in_oklab,var(--pl-primary)_18%,transparent),transparent_60%)]" />
              <div className="relative flex items-start gap-3">
                <div className="shrink-0 h-10 w-10 rounded-2xl border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] flex items-center justify-center text-[var(--pl-primary)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 19V5a2 2 0 0 1 2-2h10l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M8 11h8M8 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--pl-text)] leading-snug">
                    Industry‑Relevant <span className="italic">Skills</span>
                  </div>
                  <div className="mt-1 text-sm text-[var(--pl-text-secondary)] leading-snug">
                    Job-ready learning paths mapped to real roles.
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl px-5 py-5 shadow-sm border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-surface)_70%,transparent)] backdrop-blur">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_70%_at_20%_10%,color-mix(in_oklab,var(--pl-accent-orange)_18%,transparent),transparent_60%)]" />
              <div className="relative flex items-start gap-3">
                <div className="shrink-0 h-10 w-10 rounded-2xl border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-accent-orange)_14%,white)] flex items-center justify-center text-[var(--pl-link-hover)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M7 7l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M17 7l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 22v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M4 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M16 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M8.5 15.5a5 5 0 1 1 7 0l-3.5 3.5-3.5-3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--pl-text)] leading-snug">
                    Passion‑Aligned <span className="italic">Opportunities</span>
                  </div>
                  <div className="mt-1 text-sm text-[var(--pl-text-secondary)] leading-snug">
                    Roles that match strengths, interests, and growth.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <ScribbledText
              text="We Shape Brilliance"
              color="var(--pl-text)"
              lineColor="var(--pl-primary)"
              lineHeight="0.15rem"
              lineOffset="0px"
              duration={0.2}
              delay={1}
              stagger={0.08}
              className="font-bold text-base font-caveat italic"
            />
            <span className="text-[var(--pl-text-muted)]">•</span>
            <ScribbledText
              text="You Spot it"
              color="var(--pl-text)"
              lineColor="var(--pl-primary)"
              lineHeight="0.15rem"
              lineOffset="0px"
              duration={0.5}
              delay={1}
              stagger={0.08}
              className="font-bold text-base font-caveat italic"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;