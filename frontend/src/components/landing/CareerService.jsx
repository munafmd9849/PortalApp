import React, { useState, useEffect, useRef } from "react";
import { IconChevronLeft, IconChevronRight, IconBrandLinkedin, IconMail } from "@tabler/icons-react";
import CS1 from '../../assets/images/CS4.png';
import CS2 from '../../assets/images/CS2.webp';
import CS3 from '../../assets/images/CS3.webp';
import CS4 from '../../assets/images/CS1.webp';
import CS5 from '../../assets/images/CS5.png';
import CS6 from '../../assets/images/CS6.png';

// Spotlight Card Component focused on image
const SpotlightCard = ({ children, className = "" }) => {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => {
    setOpacity(0.7);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Spotlight effect overlay on the image */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-400 ease-in-out z-10"
        style={{
          opacity,
          background: `radial-gradient(circle 150px at ${position.x}px ${position.y}px, rgba(255,255,255,0.5), rgba(255,255,255,0.1) 40%, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
};

// Admin Card Component with Image Spotlight and Social Links
const AdminCard = ({ admin, cardWidth }) => {
  const [showSocials, setShowSocials] = useState(false);

  return (
    <div className="flex-shrink-0" style={{ width: `${cardWidth}px`, marginRight: '8px', marginLeft: '8px' }}>
      <div 
        className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-400 hover:shadow-xl hover:scale-[1.02] group"
        onMouseEnter={() => setShowSocials(true)}
        onMouseLeave={() => setShowSocials(false)}
      >
        <SpotlightCard className="relative">
          <img
            src={admin.image}
            alt={admin.name}
            className="w-full h-56 object-cover transition-all duration-300"
          />
          {/* Social Links */}
          <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4 transition-all duration-300 z-20 ${
            showSocials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}>
            <a
              href={admin.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-2.5 transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl"
            >
              <IconBrandLinkedin size={18} />
            </a>
            <a
              href={`mailto:${admin.email}`}
              className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-2.5 transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl"
            >
              <IconMail size={18} />
            </a>
          </div>
        </SpotlightCard>
        {/* Name and Position */}
        <div className="p-5 text-center">
          <h3 className="text-lg font-bold text-gray-800 mb-1">{admin.name}</h3>
          <p className="text-gray-600 text-sm">{admin.position}</p>
        </div>
      </div>
    </div>
  );
};

export default function AdminSlider() {
  const admins = [
    { 
      name: "Syed Zabi Ulla", 
      image: CS1,
      position: "Position",
      linkedin: "https://www.linkedin.com/in/syedzaabii/",
      email: "kaiful@example.com"
    },
    { 
      name: "Dr. Sapna ", 
      image: CS2,
      position: "Position",
      linkedin: "https://www.linkedin.com/in/saurabhmoharikar/",
      email: "saurabh@example.com"
    },
    { 
      name: "Mr. Vikas", 
      image: CS3,
      position: "Position",
      linkedin: "https://linkedin.com/in/vikas",
      email: "vikas@example.com"
    },
    { 
      name: "Mr. Janishar Ali", 
      image: CS4,
      position: "Position",
      linkedin: "https://linkedin.com/in/arjun",
      email: "arjun@example.com"
    },
    { 
      name: "Mr.Saurabh", 
      image: CS5,
      position: "Position",
      linkedin: "https://linkedin.com/in/priya",
      email: "priya@example.com"
    },
    { 
      name: "X", 
      image: CS6,
      position: "Position",
      linkedin: "https://linkedin.com/in/rahul",
      email: "rahul@example.com"
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const cardGap = 16;
  // Calculate card width based on 80% viewport width minus gaps
  const cardWidth = containerWidth > 0 ? (containerWidth - (cardsPerPage - 1) * cardGap) / cardsPerPage : 260;
  const maxIndex = admins.length - cardsPerPage;

  // Update container width and cardsPerPage on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      const viewportWidth = window.innerWidth;
      setContainerWidth(viewportWidth * 0.8); // 80% of viewport width
      if (viewportWidth < 768) {
        setCardsPerPage(2);
      } else {
        setCardsPerPage(4);
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [currentIndex, maxIndex]);

  const nextSlide = () => {
    setCurrentIndex(prev => {
      if (prev >= maxIndex) {
        return 0;
      }
      return prev + 1;
    });
  };

  const prevSlide = () => {
    setCurrentIndex(prev => {
      if (prev <= 0) {
        return maxIndex;
      }
      return prev - 1;
    });
  };

  const goToSlide = (index) => {
    setCurrentIndex(Math.min(index, maxIndex));
  };

  return (
    <div 
      className="w-full min-h-screen flex flex-col justify-center items-center"
      style={{ backgroundColor: '#FFEEC3' }}
    >
      <div className="w-full max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12 pt-8">
          <p className="text-3xl font-semibold text-black mb-3 tracking-wide">THE TEAM</p>
          <h2 className="text-5xl font-bold text-blue-900">
            Office of Career Services
          </h2>
        </div>
        <div className="relative">
          <div
            className="overflow-hidden rounded-2xl"
            style={{ width: `${containerWidth + 12}px`, margin: '0 auto' }}
          >
            {/* Cards Container*/}
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (cardWidth + cardGap)}px)`,
                width: `${admins.length * cardWidth + (admins.length - 1) * cardGap}px`
              }}
            >
              {admins.map((admin, index) => (
                <AdminCard key={index} admin={admin} cardWidth={cardWidth} />
              ))}
            </div>
          </div>
          {/* Buttons */}
          <button
            onClick={prevSlide}
            className="absolute top-1/2 -translate-y-1/3 -translate-x-1/2 bg-white/90 hover:bg-white text-amber-800 rounded-full p-3 transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl border border-amber-200"
            style={{ left: `${containerWidth * 0.075}px` }}
          >
            <IconChevronLeft size={18} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute top-1/2 -translate-y-1/3 translate-x-1/2 bg-white/90 hover:bg-white text-amber-800 rounded-full p-3 transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl border border-amber-200"
            style={{ right: `${containerWidth * 0.07}px` }}
          >
            <IconChevronRight size={18} />
          </button>
          {/* Dot Indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentIndex === index
                    ? 'bg-amber-600 scale-125'
                    : 'bg-amber-300 hover:bg-amber-500 hover:scale-110'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}