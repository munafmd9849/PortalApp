import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const HiringBet = ({ userSelection = 'SOT' }) => {
  const techWordRef = useRef(null);
  const underlineRef = useRef(null);
  const nahRef = useRef(null);
  const techLineRef = useRef(null);

  // Define different word sets based on user selection
  const getWordsBySelection = (selection) => {
    switch (selection) {
      case 'SOT': // Software Development
        return ["framework","tool", "API", "library"," language","tech-stack"];
      case 'SOM': // Software Management
        return ["case study", "algorithm", "metric"];
      case 'SOH': // Software Healthcare
        return ["EMR", "procedure", "diagnosis", "treatment"];
      default:
        return ["framework","tool", "API", "languages"];
    }
  };

  useEffect(() => {
    const techWords = getWordsBySelection(userSelection);
    const techWordElement = techWordRef.current;
    const underline = underlineRef.current;
    const nahElement = nahRef.current;
    const techLine = techLineRef.current;

    // Animation timeline
    const tl = gsap.timeline({ 
      repeat: -1,
      defaults: { duration: 0.8, ease: "power2.inOut" }
    });
    
    // Word cycling animation with smoother transitions
    techWords.forEach((word) => {
      tl.to(techWordElement, { 
        duration: 0.4,
        opacity: 0,
        y: -10,
        ease: "power2.in",
        onComplete: () => techWordElement.textContent = word
      })
      .to(techWordElement, { 
        opacity: 1, 
        y: 0,
        duration: 0.4,
        ease: "power2.out"
      })
      .to(underline, { 
        scaleX: 1, 
        duration: 0.3,
        ease: "power2.out"
      }, "-=0.2")
      .to(underline, { 
        scaleX: 0, 
        duration: 0.3,
        ease: "power2.in"
      }, "+=1.5");
    });
    
    // Hover effect for underline
    const handleMouseEnter = () => {
      gsap.to(underline, { 
        scaleX: 1,
        height: "100%",
        opacity: 0.4,
        duration: 0.3
      });
      gsap.to(nahElement, {
        scale: 1.1,
        duration: 0.2
      });
    };
    
    const handleMouseLeave = () => {
      gsap.to(underline, { 
        scaleX: 0,
        height: 3,
        opacity: 1,
        duration: 0.3
      });
      gsap.to(nahElement, {
        scale: 1,
        duration: 0.2
      });
    };
    
    techLine.addEventListener('mouseenter', handleMouseEnter);
    techLine.addEventListener('mouseleave', handleMouseLeave);
    
    // Continuous slight rotation animation for "NAH!"
    gsap.to(nahElement, {
      rotation: "+=0",
      duration: 2,
      yoyo: true,
      ease: "sine.inOut"
    });

    return () => {
      techLine.removeEventListener('mouseenter', handleMouseEnter);
      techLine.removeEventListener('mouseleave', handleMouseLeave);
      tl.kill();
    };
  }, [userSelection]); 

  return (
    <div className="max-w-4xl mx-auto my-12 text-center text-black">
      <div className="flex justify-center items-center flex-wrap gap-2 text-4xl leading-tight mb-2">
        <span className="font-semibold relative inline-block">Do we bet they know every</span>
        <div ref={techLineRef} className="flex items-center">
          <div className="font-bold -rotate-1 px-1 relative inline-block w-fit text-center">
            <span ref={techWordRef}>
              {getWordsBySelection(userSelection)[0]}
            </span>
            <div 
              ref={underlineRef}
              className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 origin-left scale-x-0"
            />
          </div>
          <span ref={nahRef} className="font-bold rotate-1 inline-block ml-1 space-x-3">
            <span className="text-black">?</span>
            <span className="text-blue-800">&nbsp;NAH !</span>
          </span>
        </div>
      </div>
      
      <div className="flex justify-center items-center flex-wrap gap-2 text-4xl leading-tight">
        <span className="font-bold relative inline-block">But they're</span>
        <span className="font-bold text-4xl text-blue-900 bg-clip-text">
          lifelong learners.
        </span>
      </div>
    </div>
  );
};

export default HiringBet; 