import { useEffect, useState, useMemo } from "react";
import sidebarImg from "../../assets/images/sidebar.jpg";

export default function SidebarCard() {
  // Quotes list
  const quotes = [
    "Ready for the next round? Welcome to the Patience Test!",
    "Great things take time… and so do HR emails.",
    "Rome wasn't built in a day… neither are offer letters."
  ];

  // Generate random 2-digit value (10-99) only once
  const randomValue = useMemo(() => Math.floor(Math.random() * 100), []);
  
  // Determine quote index based on random value
  const selectedQuoteIndex = useMemo(() => {
    if (randomValue < 33) return 0;  // First quote
    else if (randomValue < 66) return 1;  // Second quote
    else return 2;  // Third quote
  }, [randomValue]);

  const [displayText, setDisplayText] = useState("");
  const [charIndex, setCharIndex] = useState(0);

  // Typing effect - shows only the selected quote based on random value
  useEffect(() => {
    if (charIndex < quotes[selectedQuoteIndex].length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + quotes[selectedQuoteIndex][charIndex]);
        setCharIndex((prev) => prev + 1);
      }, 70); // typing speed
      return () => clearTimeout(timeout);
    }
    // Note: Removed cycling logic - quote stays displayed once fully typed
  }, [charIndex, selectedQuoteIndex, quotes]);

  return (
    <div className="hidden lg:block lg:w-[30%] bg-neutral-50 dark:bg-neutral-900">
      <div className="sticky top-0 h-screen p-8 flex flex-col items-center justify-center">
        <div
          className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center justify-center"
          style={{ minHeight: "400px" }}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-2 pb-6 flex flex-col items-center"
            style={{
              border: "8px solid white",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              transform: "rotate(-2deg)",
              maxWidth: "260px",
            }}
          >
            <img
              src={sidebarImg}
              alt="Polaroid"
              className="w-56 h-64 object-cover rounded-md mb-4"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
            />

            {/* Typewriter animated text */}
            <span
              className="text-center w-full block"
              style={{
                fontFamily: "Caveat, cursive",
                fontSize: "1.35rem",
                color: "#1e293b",
                fontWeight: 600,
                letterSpacing: ".02em",
                minHeight: "3.5rem",
              }}
            >
              {displayText}
              <span className="animate-pulse">|</span>
            </span>
          </div>

          {/* Load font */}
          <link
            href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap"
            rel="stylesheet"
          />
        </div>
      </div>
    </div>
  );
}
