import React from "react";
import { FaMoneyBillWave, FaCalendarAlt, FaChartLine, FaHandshake, FaUserTie, FaLightbulb, FaMoneyCheckAlt } from "react-icons/fa";
import { MdAttachMoney } from "react-icons/md";

const stats = [
  {
    label: "Highest CTC Offered",
    value: "₹45 LPA",
    icon: <FaMoneyBillWave className="inline-block mr-2 text-black text-xl" />,
  },
  {
    label: "Placement Drives",
    value: "85",
    icon: <FaCalendarAlt className="inline-block mr-2 text-black text-xl" />,
  },
  {
    label: "Average CTC",
    value: "₹12.5 LPA",
    icon: <MdAttachMoney className="inline-block mr-2 text-black text-xl" />,
  },
  {
    label: "Placement Percentage",
    value: "92%",
    icon: <FaChartLine className="inline-block mr-2 text-black text-xl" />,
  },
  {
    label: "Global Internships",
    value: "42+",
    icon: <FaMoneyCheckAlt className="inline-block mr-2 text-black text-xl" />,
  },
  {
    label: "Ventures Launched",
    value: "7",
    icon: <FaHandshake className="inline-block mr-2 text-black text-xl" />,
  },
  {
    label: "Exclusive Recruiters",
    value: "12",
    icon: <FaUserTie className="inline-block mr-2 text-black text-xl" />,
  },
  {
    label: "Average Stipend",
    value: "₹35K",
    icon: <FaMoneyCheckAlt className="inline-block mr-2 text-black text-xl" />,
  },
];

const PlacementStats = () => {
  return (
    <section className="relative py-8 px-4 flex flex-col items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#f5e5ca]"></div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl w-full">
        {/* Heading with sparkle effect */}
        <h2 className="text-4xl font-bold mb-8 text-gray-900 text-center">
          Heard the WHY —{" "}
          <span
            className="relative px-1 bg-gradient-to-t from-yellow-400 to-yellow-400 bg-no-repeat
            [background-size:100%_25%] [background-position:0_100%]
            transition-all duration-300 ease-in-out
            hover:[background-size:100%_100%] hover:[background-position:0_100%]"
          >
            Here's the WoW!
            {/* Sparkle animations */}
            <span
              className="absolute -top-3 -right-6 sm:-right-8 animate-sparkle"
              style={{ animationDelay: "0s" }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14 3L16.5 11.5L25 14L16.5 16.5L14 25L11.5 16.5L3 14L11.5 11.5L14 3Z"
                  fill="#FFD700"
                />
              </svg>
            </span>
            <span
              className="absolute -top-2 -left-3 sm:-top-3 sm:-left-5 animate-sparkle"
              style={{ animationDelay: "1s" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 2L9.2 6.2L14 8L9.2 9.2L8 14L6.8 9.2L2 8L6.8 6.2L8 2Z"
                  fill="#FFD700"
                />
              </svg>
            </span>
            <span
              className="absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-4 animate-sparkle"
              style={{ animationDelay: "1.7s" }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 1.5L7 4.5L10.5 6L7 7.5L6 10.5L5 7.5L1.5 6L5 4.5L6 1.5Z"
                  fill="#FFD700"
                />
              </svg>
            </span>
          </span>
        </h2>

        {/* Stats Grid with separators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 placement-stats-grid bg-[#FFDE83]/80 rounded-t-xl">
          {stats.slice(0, 4).map((stat, index) => (
            <div key={index} className="stat-card rounded-xl py-4 text-center flex flex-col items-center">
              <div className="text-5xl font-extrabold text-black mt-4">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {stat.icon}{stat.label}
              </div>
            </div>
          ))}
        </div>
        
        {/* Second row with 4 stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 placement-stats-grid bg-[#FFDE83]/80 rounded-b-xl">
          {stats.slice(4, 8).map((stat, index) => (
            <div key={index + 4} className="stat-card rounded-xl py-4 text-center flex flex-col items-center">
              <div className="text-5xl font-extrabold text-black mt-4">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {stat.icon}{stat.label}
              </div>
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
        .placement-stats-grid {
          position: relative;
        }
        @media (min-width: 1024px) {
          .placement-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            row-gap: 0px; /* Further reduced gap between rows */
          }
          .stat-card {
            position: relative;
            min-height: 140px;
          }
          /* Vertical separator line - hide on 4th, 8th card */
          .stat-card:nth-child(1)::after,
          .stat-card:nth-child(2)::after,
          .stat-card:nth-child(3)::after,
          .stat-card:nth-child(5)::after,
          .stat-card:nth-child(6)::after,
          .stat-card:nth-child(7)::after {
            content: "";
            position: absolute;
            top: 20%;
            right: 0px;
            width: 2px;
            height: 60%;
            background: #a77029;
            border-radius: 999px;
            opacity: 0.7;
            z-index: 1;
          }
        }
      `}</style>
    </section>
  );
};

export default PlacementStats;