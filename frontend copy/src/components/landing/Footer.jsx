import React, { useEffect, useMemo, useRef, useState } from "react";
import brandLogo from '../../assets/images/brand_logo.webp';
import { AnimatePresence, motion } from "motion/react";
import { Home, Users, Mail, Building2, User, FileText, X } from "lucide-react";
import Dock from "./Dock";

const PWIOIFooter = ({ onLoginOpen, onContactTeam, onMeetDevTeam }) => {
  const footerRef = useRef(null);
  const [showDock, setShowDock] = useState(false);
  const linkedinLink = "https://www.linkedin.com/school/pw-ioi/";
  const instagramLink = "https://www.instagram.com/pw_ioi/";
  const youtubeLink = "https://www.youtube.com/@PW-IOI";

  // Open Google Docs placement policy in new tab
  const openPlacementPolicy = () => {
    window.open('https://docs.google.com/document/d/1yEH5gMSux0cCf8UmS1d4p1GpZvL-nRzQHLutu8MrZoY/edit?usp=sharing', '_blank');
  };

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const [sheet, setSheet] = useState(null); // 'contact' | 'links' | 'legal' | null

  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  const dockItems = useMemo(
    () => [
      {
        icon: <Home size={18} className="text-[var(--pl-text)]" />,
        label: "Home",
        onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      },
      {
        icon: <Building2 size={18} className="text-[var(--pl-text)]" />,
        label: "Partners",
        onClick: () => scrollToId("our-partners"),
      },
      {
        icon: <Users size={18} className="text-[var(--pl-text)]" />,
        label: "Team",
        onClick: () => scrollToId("career-services"),
      },
      {
        icon: <Mail size={18} className="text-[var(--pl-text)]" />,
        label: "Contact",
        onClick: () => setSheet("contact"),
      },
      {
        icon: <FileText size={18} className="text-[var(--pl-text)]" />,
        label: "Legal",
        onClick: () => setSheet("legal"),
      },
      {
        icon: <User size={18} className="text-[var(--pl-text)]" />,
        label: "Auth",
        onClick: () => onLoginOpen && onLoginOpen("Student"),
      },
    ],
    [onLoginOpen]
  );

  // Show dock only when footer is in view (mobile/tablet)
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowDock(Boolean(entry?.isIntersecting)),
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="relative overflow-hidden mt-2 bg-[var(--pl-bg)] text-[var(--pl-text)] desk:mt-10 desk:bg-[#0B1220] desk:text-white"
    >
      {/* Desktop footer (keep as-is) */}
      <div className="hidden desk:grid mx-auto max-w-6xl px-6 py-14 grid-cols-3 gap-10">

        {/* Brand Section */}
        <div className="flex flex-col mt-6 items-start">
          <img
            src={brandLogo}
            alt="PW IOI Logo"
            className="w-40 mb-5 filter brightness-0 invert"
          />
          <p className="text-gray-300 leading-relaxed">
            Empowering students with career opportunities and industry connections.
          </p>
        </div>

        {/* Quick Links Section */}
        <div className="flex flex-col mt-4">
          <h3 className="text-lg text-gray-100 font-semibold mb-5">
            Quick Links
          </h3>
          <button
            onClick={() => onLoginOpen && onLoginOpen('Recruiter')}
            className="text-gray-300 no-underline mb-3 inline-flex text-left cursor-pointer transition-colors hover:text-white"
          >
            Recruiter Login
          </button>
          <button
            onClick={() => onLoginOpen && onLoginOpen('Student')}
            className="text-gray-300 no-underline mb-3 inline-flex text-left cursor-pointer transition-colors hover:text-white"
          >
            Student Login
          </button>
          <button
            onClick={openPlacementPolicy}
            className="text-gray-300 no-underline mb-3 inline-flex text-left cursor-pointer transition-colors hover:text-white"
          >
            Placement Policy
          </button>
          <button
            onClick={() => onContactTeam && onContactTeam()}
            className="text-gray-300 no-underline mb-3 inline-flex text-left cursor-pointer transition-colors hover:text-white"
          >
            Contact Team
          </button>
          <button
            onClick={() => onMeetDevTeam && onMeetDevTeam()}
            className="text-gray-300 no-underline mb-3 inline-flex text-left cursor-pointer transition-colors hover:text-white"
          >
            Meet the Dev Team
          </button>
        </div>

        {/* Contact Info Section */}
        <div className="flex flex-col mt-4">
          <h3 className="text-lg text-gray-100 font-semibold mb-5">
            Contact Info
          </h3>
          <div className="space-y-3 mb-6">
            <a
              href="mailto:placement@pwioi.edu.in"
              className="flex items-center gap-3 text-gray-400 group hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 group-hover:text-gray-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              <span>placement@pwioi.edu.in</span>
            </a>
            <a
              href="tel:+918012345678"
              className="flex items-center gap-3 text-gray-400 group hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 group-hover:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              <span>+91 80 1234 5678</span>
            </a>
            <a
              href="https://maps.google.com?q=PW+IOI+Bangalore+Campus"
              target="_blank"
              rel="noopener noreferrer"
              className="flex group items-center gap-3 text-gray-300 transition-all duration-300 hover:text-white"
            >
              <svg className="w-6 h-6 text-gray-300 group-hover:text-red-500 duration-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span className='leading-5'>
                PW IOI Main Campus<br />
                Bangalore, Karnataka
              </span>
            </a>
          </div>

          {/* Social Media Icons */}
          <div className="flex gap-12 ml-1">
            <a
              href={linkedinLink}
              target='_blank'
              rel="noopener noreferrer"
              className="text-[#0A66C2] transition-colors duration-200 hover:text-[#1d7dde]"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href={instagramLink}
              target='_blank'
              rel="noopener noreferrer"
              className="text-pink-600 transition-colors duration-300 hover:text-[#da3b78]"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href={youtubeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FF0000] transition-colors duration-200 text-[#b80000]"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Copyright removed as requested */}

      {/* Mobile/Tablet Dock footer (premium) */}
      <div className="desk:hidden">
        <AnimatePresence>
          {showDock && !sheet && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.2 }}
            >
              <Dock items={dockItems} panelHeight={68} baseItemSize={50} magnification={70} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile/Tablet bottom sheet panels */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              key="footer-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/30"
              onClick={() => setSheet(null)}
            />
            <motion.div
              key="footer-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-x-0 bottom-0 z-[80] h-[62vh] rounded-t-3xl border-t border-[var(--pl-border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--pl-primary)_18%,white),var(--pl-bg))] shadow-[0_-20px_60px_rgba(0,0,0,0.18)] overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <div className="mx-auto max-w-xl h-full px-5 pt-4 pb-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 rounded-full bg-[var(--pl-border)] mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                    <div className="text-base font-semibold text-[var(--pl-text)]">
                      {sheet === "contact" ? "Contact" : "Legal & Links"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSheet(null)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] text-[var(--pl-text)] hover:bg-black/5"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-4 h-full overflow-y-auto pr-1">
                  {sheet === "contact" && (
                    <div className="space-y-3">
                      <a
                        href="mailto:placement@pwioi.edu.in"
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-4 text-[var(--pl-text)] hover:bg-black/5 transition"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold tracking-widest text-[var(--pl-text-muted)]">EMAIL</div>
                          <div className="mt-1 text-sm font-medium text-[var(--pl-text)] truncate">
                            placement@pwioi.edu.in
                          </div>
                        </div>
                        <Mail size={18} className="text-[var(--pl-text-secondary)]" />
                      </a>

                      <a
                        href="tel:+918012345678"
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-4 text-[var(--pl-text)] hover:bg-black/5 transition"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold tracking-widest text-[var(--pl-text-muted)]">PHONE</div>
                          <div className="mt-1 text-sm font-medium text-[var(--pl-text)] truncate">
                            +91 80 1234 5678
                          </div>
                        </div>
                        <span className="text-[var(--pl-link)] text-sm font-semibold">Call</span>
                      </a>

                      <a
                        href="https://maps.google.com?q=PW+IOI+Bangalore+Campus"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-4 text-[var(--pl-text)] hover:bg-black/5 transition"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold tracking-widest text-[var(--pl-text-muted)]">CAMPUS</div>
                          <div className="mt-1 text-sm font-medium text-[var(--pl-text)]">
                            PW IOI Main Campus, Bangalore
                          </div>
                        </div>
                        <span className="text-[var(--pl-link)] text-sm font-semibold">Map</span>
                      </a>

                      <div className="pt-2">
                        <div className="text-xs font-semibold tracking-widest text-white/70 mb-2">
                          SOCIAL
                        </div>
                        <div className="flex gap-3">
                          <a
                            href={linkedinLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-3 text-[var(--pl-text)] hover:bg-black/5 transition"
                          >
                            LinkedIn
                          </a>
                          <a
                            href={instagramLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-3 text-[var(--pl-text)] hover:bg-black/5 transition"
                          >
                            Instagram
                          </a>
                          <a
                            href={youtubeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-3 text-[var(--pl-text)] hover:bg-black/5 transition"
                          >
                            YouTube
                          </a>
                        </div>
                      </div>

                      <div className="pt-2 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSheet(null);
                            onContactTeam?.();
                          }}
                          className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-3 text-[var(--pl-text)] hover:bg-black/5 transition"
                        >
                          Contact Team
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSheet(null);
                            onMeetDevTeam?.();
                          }}
                          className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-3 text-[var(--pl-text)] hover:bg-black/5 transition"
                        >
                          Meet Dev Team
                        </button>
                      </div>
                    </div>
                  )}

                  {sheet === "legal" && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSheet(null);
                          openPlacementPolicy();
                        }}
                        className="w-full text-left rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-4 text-[var(--pl-text)] hover:bg-black/5 transition"
                      >
                        <div className="text-xs font-semibold tracking-widest text-[var(--pl-text-muted)]">LEGAL</div>
                        <div className="mt-1 text-sm font-semibold">Placement Policy</div>
                        <div className="mt-1 text-sm text-[var(--pl-text-secondary)]">
                          View the institute policy document.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSheet(null);
                          onLoginOpen?.("Recruiter");
                        }}
                        className="w-full text-left rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-4 text-[var(--pl-text)] hover:bg-black/5 transition"
                      >
                        <div className="text-xs font-semibold tracking-widest text-[var(--pl-text-muted)]">QUICK LINKS</div>
                        <div className="mt-1 text-sm font-semibold">Recruiter Login</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSheet(null);
                          onLoginOpen?.("Student");
                        }}
                        className="w-full text-left rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] px-4 py-4 text-[var(--pl-text)] hover:bg-black/5 transition"
                      >
                        <div className="text-xs font-semibold tracking-widest text-[var(--pl-text-muted)]">QUICK LINKS</div>
                        <div className="mt-1 text-sm font-semibold">Student Login</div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </footer>
  );
};

export default PWIOIFooter;
