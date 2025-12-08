import React from "react";
import { FaLinkedin, FaHome } from "react-icons/fa";

// Placeholder image for now
const placeholderImg = "https://via.placeholder.com/224x224.png?text=Mentor+Image";
import User from "../../assets/images/CS4.png";
import dev from "../../assets/images/dev1.png";
import dev2 from "../../assets/images/dev2.png";
import dev3 from "../../assets/images/dev3.png";
import dev4 from "../../assets/images/dev4.png";
import prof from "../../assets/images/prof1.png";

const devs = [
  {
    name: "Niraj",
    linkedin: "https://linkedin.com/in/niraj",
    img: dev,
    role:
      "The brain behind the scenes. Manages the logic, data flow, and functionality that make the portal run like clockwork.",
  },
  {
    name: "Pratik",
    linkedin: "https://linkedin.com/in/pratik",
    img: dev3,
    role:
      "The backbone of reliability. Works on databases, server-side processes, and making sure the system stays stable no matter what.",
  },
  {
    name: "Roshan",
    linkedin: "https://linkedin.com/in/roshan",
    img: dev2,
    role:
      "Turns ideas into sleek, responsive designs and ensures every click feels smooth. Balances creativity with functionality to make the first impression count.",
  },
  {
    name: "Esha",
    linkedin: "https://linkedin.com/in/roshan",
    img: dev4,
    role:
      "Turns ideas into sleek, responsive designs and ensures every click feels smooth. Balances creativity with functionality to make the first impression count.",
  },
];

// Mentors data with descriptions
const mentors = [
  {
    name: "Prof. Shubham",
    linkedin: "#",
    img: prof,
    description:
      "A visionary leader who guides the team with insight and experience, always pushing boundaries to achieve excellence.",
  },
  {
    name: "Prof. Syed Zabi Ulla",
    linkedin: "https://linkedin.com/in/syedzabiulla",
    img: User,
    description:
      "Industry expert and master strategist. Quietly gives his time, energy, and comfort while envisioning beyond what we imagine.",
  },
];

const MentorHoverCard = ({ src, name, linkedin, description }) => (
  <div className="relative group w-56 mx-auto flex flex-col items-center">
    <div className="relative w-56 h-56 rounded-2xl overflow-hidden border-4 border-[#f6e1a1] shadow-lg bg-[#FFEEC3]">
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {/* Description overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
        <p className="text-[#FFEEC3] font-caveat text-center text-lg italic select-none">
          {description}
        </p>
      </div>
      {/* LinkedIn icon */}
      <a
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`LinkedIn profile of ${name}`}
        className="absolute bottom-3 right-3 text-white bg-[#0A66C2] p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-[#084a9e]"
      >
        <FaLinkedin size={24} />
      </a>
    </div>
    {/* Name */}
    <span className="mt-3 text-gray-900 font-semibold font-inter text-center select-none">
      {name}
    </span>
  </div>
);

const DevHoverCard = ({ src, name, linkedin }) => (
  <div className="relative group w-28 h-28 mx-auto bg-[#FFEEC3] rounded-full flex items-center justify-center shadow-lg border-4 border-[#f6e1a1] overflow-hidden">
    
    <img
      src={src}
      alt={name}
      className="block max-w-none w-auto h-full object-cover scale-150 group-hover:scale-160 transition-transform duration-300"
      style={{ objectPosition: "center center" }}
    />
    {/* Overlay */}
    <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
      <span className="text-base font-medium mb-2 text-white drop-shadow font-inter select-none">
        {name}
      </span>
      <a
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#0A66C2] p-2 rounded-full text-white shadow-md hover:scale-110 transition cursor-pointer"
      >
        <FaLinkedin size={20} />
      </a>
    </div>
  </div>
);

const MeetDevTeamPage = () => {
  return (
    <div className="min-h-screen bg-[#FFEEC3] font-inter px-5 py-8">
      {/* Back to Home */}
      <button
        onClick={() => (window.location.href = "/")}
        className="fixed top-7 left-7 z-40 flex items-center justify-center w-12 h-12 rounded-full border border-gray-300 bg-white/90 shadow-lg text-gray-800 font-inter backdrop-blur-md transition-all duration-300 hover:bg-[#FFEEC3] hover:text-[#0A66C2] hover:shadow-xl hover:border-[#f6e1a1] focus:outline-none active:scale-95 cursor-pointer"
        aria-label="Back to Home"
      >
        <FaHome className="text-2xl transition-transform duration-300" />
      </button>

      <div className="max-w-6xl mx-auto py-10">
        {/* Mentor Section */}
        <h1 className="text-4xl font-bold text-gray-900 font-inter mb-8 text-center">
          Mentors - The Brain
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 mb-12">
          {mentors.map((mentor) => (
            <MentorHoverCard
              key={mentor.name}
              src={mentor.img}
              name={mentor.name}
              linkedin={mentor.linkedin}
              description={mentor.description}
            />
          ))}
        </div>

        {/* Dev Team Section */}
        <h2 className="text-3xl font-bold text-gray-900 font-inter mb-6 text-center">
          Dev Team
        </h2>
        <div className="grid md:grid-cols-4 gap-10">
          {devs.map((dev) => (
            <div
              key={dev.name}
              className="flex flex-col items-center text-center max-w-xs mx-auto"
            >
              <DevHoverCard src={dev.img} name={dev.name} linkedin={dev.linkedin} />
              <p className="mt-4 text-gray-700 font-inter text-base leading-relaxed line-clamp-4">
                {dev.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MeetDevTeamPage;
