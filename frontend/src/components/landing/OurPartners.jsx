import React, { useState, useEffect, useRef } from 'react';

import MicrosoftLogo from '../../assets/images/Microsoft-Logo.wine.svg';
import GoogleLogo from '../../assets/images/Google-Logo.wine.svg';
import AmazonLogo from '../../assets/images/Amazon_(company)-Logo.wine.svg';
import TeslaLogo from '../../assets/images/Tesla,_Inc.-Logo.wine.svg';
import NetflixLogo from '../../assets/images/Netflix-Logo.wine.svg';
import AdobeLogo from '../../assets/images/Adobe_Inc.-Logo.wine.svg';
import IntelLogo from '../../assets/images/Intel-Logo.wine.svg';
import IBMLogo from '../../assets/images/IBM-Logo.wine.svg';
import OracleLogo from '../../assets/images/Oracle_Corporation-Logo.wine.svg';
import SalesforceLogo from '../../assets/images/Salesforce.com-Logo.wine.svg';

import AMDLogo from '../../assets/images/Advanced_Micro_Devices-Logo.wine.svg';
import AppleLogo from '../../assets/images/Apple_Inc.-Logo.wine.svg';
import LENOVOLogo from '../../assets/images/Lenovo_K6_Power-Logo.wine.svg';
import NvidiaLogo from '../../assets/images/Nvidia-Logo.wine.svg';
import PumaLogo from '../../assets/images/Puma_(brand)-Logo.wine.svg';
import ATnTLogo from '../../assets/images/AT&T-Logo.wine.svg';
import OLALogo from '../../assets/images/Ola_Cabs-Logo.wine.svg';
import SamsungLogo from '../../assets/images/Samsung-Logo.wine.svg';
import SkyscannerLogo from '../../assets/images/Skyscanner-Logo.wine.svg';
import TOYOTALogo from '../../assets/images/Toyota_Canada_Inc.-Logo.wine.svg';




const ORIGINAL_PARTNERS1 = [
  { id: 1, name: 'Microsoft', logo: MicrosoftLogo, studentsPlaced: 142 },
  { id: 2, name: 'Google', logo: GoogleLogo, studentsPlaced: 98 },
  { id: 3, name: 'Amazon', logo: AmazonLogo, studentsPlaced: 156 },
  { id: 4, name: 'Tesla', logo: TeslaLogo, studentsPlaced: 63 },
  { id: 5, name: 'Netflix', logo: NetflixLogo, studentsPlaced: 42 },
  { id: 6, name: 'Adobe', logo: AdobeLogo, studentsPlaced: 87 },
  { id: 7, name: 'Intel', logo: IntelLogo, studentsPlaced: 105 },
  { id: 8, name: 'IBM', logo: IBMLogo, studentsPlaced: 121 },
  { id: 9, name: 'Oracle', logo: OracleLogo, studentsPlaced: 76 },
  { id: 10, name: 'Salesforce', logo: SalesforceLogo, studentsPlaced: 59 },
];

const ORIGINAL_PARTNERS2 = [
  { id: 1, name: 'AMD', logo: AMDLogo, studentsPlaced: 89 },
  { id: 2, name: 'Apple', logo: AppleLogo, studentsPlaced: 134 },
  { id: 3, name: 'LENOVO', logo: LENOVOLogo, studentsPlaced: 67 },
  { id: 4, name: 'Nvidia', logo: NvidiaLogo, studentsPlaced: 112 },
  { id: 5, name: 'Puma', logo: PumaLogo, studentsPlaced: 78 },
  { id: 6, name: 'AT&T', logo: ATnTLogo, studentsPlaced: 95 },
  { id: 7, name: 'OLA', logo: OLALogo, studentsPlaced: 56 },
  { id: 8, name: 'SAMSUNG', logo: SamsungLogo, studentsPlaced: 128 },
  { id: 9, name: 'Skyscanner', logo: SkyscannerLogo, studentsPlaced: 73 },
  { id: 10, name: 'TOYOTA', logo: TOYOTALogo, studentsPlaced: 91 },
];

// Example: Add "Labs" to company names for the 2nd row.
const CHANGE_ROW2_NAMES = (arr) =>
  arr.map((p) => ({ ...p, name: `${p.name} Labs` }));

const CARD_WIDTH = 192; // px (Tailwind w-48)
const GAP_WIDTH = 24;   // px (Tailwind gap-6)
const PARTNERS_PER_SET = ORIGINAL_PARTNERS1.length;
const DUPLICATION = 3;  // Duplicate enough sets for seamless loop

const OurPartners = () => {
  const [pausedRow1, setPausedRow1] = useState(false);
  const [pausedRow2, setPausedRow2] = useState(false);
  const carouselRef1 = useRef(null);
  const carouselRef2 = useRef(null);
  const positionRef1 = useRef(0);
  const positionRef2 = useRef(0);
  const pausedRow1Ref = useRef(false);
  const pausedRow2Ref = useRef(false);
  const animationRef = useRef(null);

  // Duplicated arrays for seamless animation
  const duplicatedRow1 = Array(DUPLICATION).fill(ORIGINAL_PARTNERS1).flat();
  const row2Partners = CHANGE_ROW2_NAMES([...ORIGINAL_PARTNERS2].reverse());
  const duplicatedRow2 = Array(DUPLICATION).fill(row2Partners).flat();

  // Calculate the width of one full set of cards + gaps
  const cardWidthWithGap = CARD_WIDTH + GAP_WIDTH;
  const oneSetWidth = PARTNERS_PER_SET * cardWidthWithGap;

  // Update refs when state changes
  useEffect(() => {
    pausedRow1Ref.current = pausedRow1;
  }, [pausedRow1]);

  useEffect(() => {
    pausedRow2Ref.current = pausedRow2;
  }, [pausedRow2]);

  useEffect(() => {
    const carousel1 = carouselRef1.current;
    const carousel2 = carouselRef2.current;
    const speed = 0.6;

    // Initialize starting positions 
    if (carousel1 && positionRef1.current === 0) {
      positionRef1.current = 0;
    }
    if (carousel2 && positionRef2.current === 0) {
      positionRef2.current = -oneSetWidth; // Start from negative full set width for continuous right->left
    }

    const animate = () => {
      // Row 1 animation - only moves if not paused (using ref to avoid stale closure)
      if (!pausedRow1Ref.current && carousel1) {
        positionRef1.current -= speed;
        if (positionRef1.current <= -oneSetWidth) {
          positionRef1.current += oneSetWidth;
        }
        carousel1.style.transform = `translateX(${positionRef1.current}px)`;
      }
      
      // Row 2 animation - only moves if not paused (using ref to avoid stale closure)
      if (!pausedRow2Ref.current && carousel2) {
        positionRef2.current += speed;
        if (positionRef2.current >= 0) {
          positionRef2.current -= oneSetWidth;
        }
        carousel2.style.transform = `translateX(${positionRef2.current}px)`;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // Run only once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <section className="pt-15 pb-10 overflow-hidden relative">
      {/* Section Heading */}
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          Our <span className="text-blue-900">Partners</span> in Launching Careers
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Leading companies trust us to deliver exceptional talent
        </p>
      </div>
      
      <div className="w-full overflow-hidden relative py-4">
        <div className="space-y-6">
          {/* Row 1 */}
          <div
            ref={carouselRef1}
            className="flex gap-6 w-max will-change-transform"
            onMouseEnter={() => setPausedRow1(true)}
            onMouseLeave={() => setPausedRow1(false)}
          >
            {duplicatedRow1.map((partner, index) => (
              <div
                key={`1-${partner.id}-${index}`}
                className="w-48 h-28 bg-white rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden flex-shrink-0 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl group"
              >
                <div className="w-4/5 h-4/5 flex items-center justify-center transition-all duration-300 ease-out z-10 group-hover:opacity-0">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="max-w-full max-h-full object-contain contrast-75 brightness-90 transition-all duration-300 ease-out"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-400 to-gray-600 flex flex-col items-center justify-center p-6 opacity-0 transition-opacity duration-300 ease-out text-white text-center group-hover:opacity-100">
                  <h3 className="text-lg font-semibold mb-2">
                    {partner.name}
                  </h3>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold leading-none">
                      {partner.studentsPlaced}+
                    </span>
                    <span className="text-sm opacity-90 mt-1">Students Placed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Row 2 */}
          <div
            ref={carouselRef2}
            className="flex gap-6 w-max will-change-transform"
            onMouseEnter={() => setPausedRow2(true)}
            onMouseLeave={() => setPausedRow2(false)}
          >
            {duplicatedRow2.map((partner, index) => (
              <div
                key={`2-${partner.id}-${index}`}
                className="w-48 h-28 bg-white rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden flex-shrink-0 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl group"
              >
                <div className="w-4/5 h-4/5 flex items-center justify-center transition-all duration-300 ease-out z-10 group-hover:opacity-0">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="max-w-full max-h-full object-contain contrast-75 brightness-90 transition-all duration-300 ease-out"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-400 to-gray-600 flex flex-col items-center justify-center p-6 opacity-0 transition-opacity duration-300 ease-out text-white text-center group-hover:opacity-100">
                  <h3 className="text-lg font-semibold mb-2">
                    {partner.name}
                  </h3>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold leading-none">
                      {partner.studentsPlaced}+
                    </span>
                    <span className="text-sm opacity-90 mt-1">Students Placed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurPartners;