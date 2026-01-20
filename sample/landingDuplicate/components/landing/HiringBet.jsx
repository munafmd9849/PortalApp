import React, { useMemo } from "react";
import RotatingText from "./RotatingText";

const HiringBet = ({ userSelection = 'SOT' }) => {
  // Define different word sets based on user selection
  const getWordsBySelection = (selection) => {
    switch (selection) {
      case 'SOT': // Software Development
        return ["framework", "tool", "API", "library", "language", "tech-stack"];
      case 'SOM': // Software Management
        return ["case study", "algorithm", "metric"];
      case 'SOH': // Software Healthcare
        return ["EMR", "procedure", "diagnosis", "treatment"];
      default:
        return ["framework", "tool", "API", "languages"];
    }
  };
  const words = useMemo(() => getWordsBySelection(userSelection), [userSelection]);

  return (
    <div className="max-w-4xl mx-auto my-12 text-center text-[var(--pl-text)]">
      <div className="text-balance flex justify-center items-center flex-wrap gap-2 text-4xl leading-tight mb-2">
        <span className="font-semibold relative inline-block">Do we bet they know every</span>

        <RotatingText
          texts={words}
          mainClassName="inline-flex flex-nowrap whitespace-nowrap items-center px-2 sm:px-2 md:px-3 bg-blue-100 text-blue-900 overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
          staggerFrom={"last"}
          initial={{ y: "120%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-120%", opacity: 0 }}
          staggerDuration={0.012}
          splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
          transition={{ type: "spring", damping: 26, stiffness: 240 }}
          rotationInterval={3200}
        />

        <span className="font-bold rotate-1 inline-flex items-center gap-2 ml-1">
          <span className="text-[var(--pl-text)]">?</span>
          <span className="text-[var(--pl-primary)]">NAH !</span>
        </span>
      </div>

      <div className="text-balance flex justify-center items-center flex-wrap gap-2 text-4xl leading-tight">
        <span className="font-bold relative inline-block">But they're</span>
        <span className="font-bold text-[var(--pl-primary)]">lifelong learners.</span>
      </div>
    </div>
  );
};

export default HiringBet; 