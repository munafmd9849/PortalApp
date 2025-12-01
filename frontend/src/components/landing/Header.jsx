import React, { useState, useEffect, useRef } from 'react'
import Login from './Login';
import brandLogo from '../../assets/images/brand_logo.webp';
import { TypeWriter } from './TextStyle';
import { useNavigate } from 'react-router-dom';

function Header({ onLoginOpen, onScrollToContact }) {
  const navigate = useNavigate();
  const openLoginModal = () => {
    if (onLoginOpen) onLoginOpen();
  };

  const scrollToContact = (e) => {
    e.preventDefault();
    if (onScrollToContact) {
      onScrollToContact();
    } else {
      // Fallback if function not provided
      const contactSection = document.getElementById('contact-form');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const scrollToPlacements = (e) => {
    e.preventDefault();

  
    let ourPartnersSection = document.getElementById('our-partners');

    if (!ourPartnersSection) {
      ourPartnersSection = document.querySelector('.bg-[#DBD7F9]');
    }

    
    if (!ourPartnersSection) {
      const sections = document.querySelectorAll('div');
      for (let section of sections) {
        if (section.classList.contains('bg-[#DBD7F9]') && section.children.length > 0) {
          ourPartnersSection = section;
          break;
        }
      }
    }

    if (ourPartnersSection) {
      ourPartnersSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    } else {
      
      const scrollPosition = window.innerHeight * 2; 
      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  };


  const [isBgBlack, setIsBgBlack] = useState(false);
  const headerRef = useRef(null);

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      }
      
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    function detectBgColor() {
      const header = headerRef.current;
      if (!header) return;

   
      const rect = header.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.bottom + 5; 

      const el = document.elementFromPoint(x, y);
      if (!el) return;

      let sectionElement = el;
      while (sectionElement && sectionElement !== document.body) {
        
        if (sectionElement.classList.contains('py-20') ||
          sectionElement.tagName === 'SECTION' ||
          sectionElement.classList.contains('bg-gradient-to-br') ||
          sectionElement.classList.contains('bg-black') ||
          sectionElement.classList.contains('bg-[#DBD7F9]') ||
          sectionElement.classList.contains('bg-white')) {
          break;
        }
        sectionElement = sectionElement.parentElement;
      }

      const targetElement = sectionElement || el;
      const style = window.getComputedStyle(targetElement);
      const bg = style.backgroundColor;

      let isWhite = false;

      if (bg === 'rgb(255, 255, 255)' || bg === 'rgba(255, 255, 255, 1)' || bg === '#ffffff' || bg === 'white') {
        isWhite = true;
      } else if (bg.startsWith('rgb')) {
    
        const rgb = bg.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          const r = parseInt(rgb[0]);
          const g = parseInt(rgb[1]);
          const b = parseInt(rgb[2]);
          isWhite = (r > 240 && g > 240 && b > 240);
        }
      }

      const backgroundImage = style.backgroundImage;
      if (backgroundImage && backgroundImage !== 'none') {
        if (backgroundImage.includes('#DBD7F9') || backgroundImage.includes('rgb(219, 215, 249)')) {
          isWhite = true;
        }
      }
      if (targetElement.classList.contains('bg-[#DBD7F9]') ||
        targetElement.classList.contains('bg-white') ||
        (targetElement.classList.contains('bg-gradient-to-br') &&
          targetElement.classList.contains('from-gray-50'))) {
        isWhite = true;
      }

      const bannerElement = document.querySelector('[class*="h-screen"]');
      if (bannerElement && bannerElement.contains(targetElement)) {
        isWhite = true;
      }

      // Set the state
      setIsBgBlack(!isWhite);
    }

    
    detectBgColor();

    
    window.addEventListener('scroll', detectBgColor);
    window.addEventListener('resize', detectBgColor);

    return () => {
      window.removeEventListener('scroll', detectBgColor);
      window.removeEventListener('resize', detectBgColor);
    };
  }, []);


  return (
    <div
      className={`w-full fixed top-1 z-50 transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      ref={headerRef}
    >
      <div className='backdrop-blur-xs flex justify-between items-center px-3 sm:px-6 lg:px-12 py-2 mx-2 sm:mx-3 rounded-xl bg-transparent border border-white/20 shadow-sm'>
        <div className='flex items-center gap-3 sm:gap-5'>
          <a href="#">
            <img
              src={brandLogo}
              alt="PW IOI Logo"
              className="w-30 md:w-35 lg:w-40"
            />
          </a>
        </div>

        
        <nav className="flex items-center space-x-3 sm:space-x-6 lg:space-x-12">
          <a
            href="#placements"
            onClick={scrollToPlacements}
            className="text-sm lg:text-base hidden md:flex font-medium transition-all duration-300 hover:scale-105 relative group text-black hover:text-gray-700"
          >
            Placements
            <div className="absolute hidden md:flex bottom-0 left-0 w-0 h-0.5 bg-current transition-all duration-300 ease-out group-hover:w-full"></div>
          </a>
          <a
            href="#contact-form"
            onClick={scrollToContact}
            className="text-sm lg:text-base hidden lg:flex text-nowrap font-medium transition-all duration-300 hover:scale-105 relative group text-black hover:text-gray-700"
          >
            Contact Us
            <div className="absolute hidden lg:flex bottom-0 left-0 w-0 h-0.5 bg-current transition-all duration-300 ease-out group-hover:w-full"></div>
          </a>

          <Login
            onClick={openLoginModal}
            className="px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 hover:scale-105 bg-black text-white hover:bg-gray-800 shadow-lg"
          />
        </nav>
      </div>
    </div>
  )
}

export default Header;