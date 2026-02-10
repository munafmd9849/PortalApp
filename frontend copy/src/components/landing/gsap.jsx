import { useEffect, useState, useMemo } from "react";
import sidebarImg from "../../assets/images/sidebar.jpg";

export default function SidebarCard() {
  // Single fixed quote (as requested)
  const quote = useMemo(() => "Great things take time… and so do HR emails.", []);

  const [displayText, setDisplayText] = useState("");
  const [charIndex, setCharIndex] = useState(0);

  // Typing effect
  useEffect(() => {
    if (charIndex < quote.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + quote[charIndex]);
        setCharIndex((prev) => prev + 1);
      }, 70); // typing speed
      return () => clearTimeout(timeout);
    }
  }, [charIndex, quote]);

  return (
    <div className="hidden desk:block desk:w-[30%]">
      {/* Align this card with the inner-scroll timeline on the left */}
      <div className="sticky top-[100%] -translate-y-1/2 px-8 flex flex-col items-center justify-start">
        <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 flex flex-col items-center justify-center">
          <div
            className="bg-white rounded-lg shadow-xl p-2 pb-6 flex flex-col items-center"
            style={{
              border: "8px solid white",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              transform: "rotate(-2deg)",
              maxWidth: "260px",
            }}
          >
            <div
              className="w-full text-center mb-2"
              style={{
                fontFamily: "Caveat, cursive",
                fontSize: "1.1rem",
                color: "#334155",
                fontWeight: 600,
                letterSpacing: ".02em",
              }}
            >
              Polaroid
            </div>
            <img
              src={sidebarImg}
              alt=""
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
