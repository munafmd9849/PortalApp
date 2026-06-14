import React, { useState, useEffect } from "react";
import { FaLinkedin, FaHome, FaArrowRight } from "react-icons/fa";

import User from "../../assets/images/CS4.png";
import dev1Img from "../../assets/images/dev1.png";
import dev2Img from "../../assets/images/dev2.png";
import dev3Img from "../../assets/images/dev3.png";
import dev4Img from "../../assets/images/dev4.png";
import sai1Img from "../../assets/images/sai1.png";
import munaf1Img from "../../assets/images/munaf1.png";
import IrfanImg from "../../assets/images/Irfan.png";
import profImg from "../../assets/images/prof1.png";

const mentors = [
  {
    name: "Prof. Shubham",
    role: "Faculty Mentor",
    linkedin: "#",
    img: profImg,
    description: "A visionary leader who guides the team with insight and experience, always pushing boundaries to achieve excellence.",
  },
  {
    name: "Prof. Syed Zabi Ulla",
    role: "Faculty Mentor",
    linkedin: "https://linkedin.com/in/syedzabiulla",
    img: User,
    description: "Industry expert and master strategist. Quietly gives his time, energy, and comfort while envisioning beyond what we imagine.",
  },
];

// Row 1: Niraj, Pratik, Roshan, Esha  |  Row 2: Munaf, Irfan, Sai Charan
const devs = [
  { name: "Niraj",      linkedin: "https://www.linkedin.com/in/nirajroy01/",                      img: dev1Img   },
  { name: "Pratik",     linkedin: "https://linkedin.com/in/pratik",                               img: dev3Img   },
  { name: "Roshan",     linkedin: "https://www.linkedin.com/in/roshankumar101/",                  img: dev2Img   },
  { name: "Esha",       linkedin: "https://www.linkedin.com/in/esha-bajaj/",                      img: dev4Img   },
  { name: "Munaf",      linkedin: "https://www.linkedin.com/in/munafmohammad/",                   img: munaf1Img },
  { name: "Irfan",      linkedin: "https://www.linkedin.com/in/mohammad-irfan-638a2b308/",        img: IrfanImg  },
  { name: "Sai Charan", linkedin: "https://www.linkedin.com/in/sai-charan-761842266",             img: sai1Img   },
];

// Rotations and Y-offsets for the scattered feel
const mentorLayout = [
  { rotate: "-6deg", translateY: "0px"  },
  { rotate:  "4deg", translateY: "40px" },
];

// Row 1: -5, +4, -2, +5  |  Row 2: -3, +4, -5
const devLayout = [
  { rotate: "-5deg", translateY: "0px"   },
  { rotate:  "4deg", translateY: "20px"  },
  { rotate: "-2deg", translateY: "8px"   },
  { rotate:  "5deg", translateY: "28px"  },
  { rotate: "-3deg", translateY: "0px"   },
  { rotate:  "4deg", translateY: "24px"  },
  { rotate: "-5deg", translateY: "12px"  },
];

/* ── Big polaroid for mentors — text always visible below ─────────── */
const MentorCard = ({ src, name, role, linkedin, description, number, rotate, translateY }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex-shrink-0 transition-all duration-300 cursor-pointer"
      style={{
        transform: `rotate(${rotate}) translateY(${translateY})`,
        zIndex: hovered ? 50 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="bg-white shadow-2xl transition-transform duration-300 hover:scale-[1.03]"
        style={{ padding: "10px 10px 20px 10px", width: "260px" }}
      >
        {/* Number badge */}
        <span className="absolute top-3 left-3 font-mono text-[11px] text-gray-400 select-none z-10">
          {number}
        </span>

        {/* Photo */}
        <div className="w-full overflow-hidden relative" style={{ height: "300px" }}>
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover object-top transition-all duration-500"
            style={{ filter: hovered ? "none" : "grayscale(100%)" }}
          />
          {/* LinkedIn hover overlay — only on photo */}
          <div
            className={`absolute inset-0 flex items-end justify-end p-3 transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-0"}`}
          >
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0A66C2] p-2 rounded-full text-white shadow-lg hover:bg-[#084a9e] transition"
            >
              <FaLinkedin size={18} />
            </a>
          </div>
        </div>

        {/* Text — always visible */}
        <div className="mt-3 px-1">
          <p className="text-gray-900 font-bold text-base leading-tight">{name}</p>
          <p className="text-[#C9471A] text-xs font-semibold uppercase tracking-widest mt-0.5">{role}</p>
          <p className="text-gray-500 text-xs leading-relaxed mt-2">{description}</p>
        </div>
      </div>
    </div>
  );
};

/* ── Smaller polaroid for dev team ───────────────────────────────── */
const DevCard = ({ src, name, linkedin, number, rotate, translateY }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex-shrink-0 transition-all duration-300 cursor-pointer"
      style={{
        transform: `rotate(${rotate}) translateY(${translateY})`,
        zIndex: hovered ? 50 : 1,
        filter: hovered ? "none" : "grayscale(100%)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="bg-white shadow-xl transition-transform duration-300 hover:scale-105"
        style={{ padding: "8px 8px 32px 8px" }}
      >
        {/* Number */}
        <span className="absolute top-2 left-2 font-mono text-[10px] text-gray-400 select-none z-10">
          {number}
        </span>

        {/* Photo — square */}
        <div className="w-40 h-40 overflow-hidden relative">
          <img src={src} alt={name} className="w-full h-full object-cover object-top" />
          {/* Hover overlay */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40 transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-0"}`}
          >
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0A66C2] p-1.5 rounded-full text-white shadow hover:bg-[#084a9e] transition"
            >
              <FaLinkedin size={15} />
            </a>
          </div>
        </div>

        {/* Name */}
        <p className="text-center text-[11px] text-gray-700 mt-1 font-semibold select-none tracking-wide">
          {name}
        </p>
      </div>
    </div>
  );
};

/* ── Section layout ──────────────────────────────────────────────── */
const Section = ({ tag, title, subtitle, description, items, layout, isMentor }) => (
  <section className="flex flex-col lg:flex-row items-center px-8 lg:px-24 py-20 gap-16 border-b border-[#e0d8cc]">

    {/* Left — text panel */}
    <div className={`flex flex-col gap-6 shrink-0 ${isMentor ? "lg:w-[38%]" : "lg:w-[28%]"}`}>
      <span className="text-xs tracking-[0.25em] uppercase text-[#C9471A] font-semibold">
        {tag}
      </span>
      <div className="leading-none">
        <p
          className="text-5xl lg:text-7xl text-[#C9471A] leading-tight"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 400 }}
        >
          {subtitle}
        </p>
        <p className="text-5xl lg:text-7xl font-black uppercase tracking-tighter text-gray-900 leading-none">
          {title}
        </p>
      </div>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mt-2">
        {description}
      </p>
      <div className="mt-4 grid grid-cols-5 gap-1.5 w-fit opacity-30">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full bg-gray-500" />
        ))}
      </div>
    </div>

    {/* Right — photos (desktop) */}
    <div
      className={`hidden lg:grid flex-1 pt-8 ${isMentor ? "gap-8 grid-cols-2" : "gap-5 grid-cols-4"}`}
    >
      {items.map((item, i) =>
        isMentor ? (
          <MentorCard
            key={item.name}
            src={item.img}
            name={item.name}
            role={item.role}
            linkedin={item.linkedin}
            description={item.description}
            number={String(i + 1).padStart(2, "0")}
            rotate={layout[i]?.rotate || "0deg"}
            translateY={layout[i]?.translateY || "0px"}
          />
        ) : (
          <DevCard
            key={item.name}
            src={item.img}
            name={item.name}
            linkedin={item.linkedin}
            number={String(i + 1).padStart(2, "0")}
            rotate={layout[i]?.rotate || "0deg"}
            translateY={layout[i]?.translateY || "0px"}
          />
        )
      )}
    </div>

    {/* Mobile — simple grid */}
    <div className="lg:hidden grid grid-cols-2 gap-6 w-full">
      {items.map((item, i) =>
        isMentor ? (
          <MentorCard
            key={item.name}
            src={item.img}
            name={item.name}
            role={item.role}
            linkedin={item.linkedin}
            description={item.description}
            number={String(i + 1).padStart(2, "0")}
            rotate="0deg"
            translateY="0px"
          />
        ) : (
          <DevCard
            key={item.name}
            src={item.img}
            name={item.name}
            linkedin={item.linkedin}
            number={String(i + 1).padStart(2, "0")}
            rotate="0deg"
            translateY="0px"
          />
        )
      )}
    </div>
  </section>
);

/* ── Page ─────────────────────────────────────────────────────────── */
const MeetDevTeamPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
  <div className="min-h-screen font-inter" style={{ background: "#F5F0E8" }}>

    {/* Back to home */}
    <button
      onClick={() => (window.location.href = "/")}
      className="fixed top-6 left-6 z-50 flex items-center justify-center w-11 h-11 rounded-full border border-gray-300 bg-white/90 shadow text-gray-700 backdrop-blur-sm hover:bg-white hover:shadow-md transition cursor-pointer"
      aria-label="Back to Home"
    >
      <FaHome size={18} />
    </button>

    {/* Header band */}
    <div className="flex items-center justify-between px-8 lg:px-24 py-5 border-b border-[#e0d8cc]">
      <span className="text-xs tracking-[0.3em] uppercase text-gray-400 font-semibold">
        PWIOI Portal
      </span>
      <span className="text-xs tracking-[0.3em] uppercase text-gray-400 font-semibold">
        Our People
      </span>
    </div>

    {/* Mentors section */}
    <Section
      tag="The Brain"
      subtitle="Meet the"
      title="MENTORS"
      description="The visionaries behind the platform. They guide with experience, challenge with questions, and inspire with their journey."
      items={mentors}
      layout={mentorLayout}
      isMentor={true}
    />

    {/* Dev Team section */}
    <Section
      tag="The Builders"
      subtitle="Meet the"
      title="TEAM"
      description="A collision of different minds on a single mission — to build tools that make every student's placement journey smoother."
      items={devs}
      layout={devLayout}
      isMentor={false}
    />

    {/* Footer band */}
    <div className="flex items-center justify-between px-8 lg:px-24 py-6">
      <p className="text-xs text-gray-400 tracking-widest uppercase">
        © PWIOI {new Date().getFullYear()}
      </p>
      <button
        onClick={() => (window.location.href = "/")}
        className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-gray-700 font-semibold hover:text-[#C9471A] transition group cursor-pointer"
      >
        Back to Portal <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  </div>
  );
};

export default MeetDevTeamPage;
