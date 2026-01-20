import React, { useEffect, useRef, useState } from 'react'
import Login from './Login';
import brandLogo from '../../assets/images/brand_logo.webp';

function Header({ onLoginOpen, onScrollToContact }) {
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
    // Reserved for future “adaptive header” behavior.
    // Keeping a light frosted header keeps the UI consistent across sections.
  }, []);


  return (
    <div
      className={`fixed left-0 right-0 top-0 z-50 px-3 sm:px-6 py-3 transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      ref={headerRef}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface)] px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md sm:px-5 sm:py-3">
        <a href="#" className="flex items-center gap-3">
          <img
            src={brandLogo}
            alt="PW IOI Logo"
            className="h-8 w-auto sm:h-9"
          />
          <span className="hidden sm:block text-sm font-semibold tracking-tight text-[var(--pl-text)]">
            Placement Portal
          </span>
        </a>

        <nav className="flex items-center gap-2 sm:gap-3">
          <a
            href="#placements"
            onClick={scrollToPlacements}
            className="hidden md:inline-flex rounded-xl px-3 py-2 text-sm font-medium text-[var(--pl-text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--pl-text)]"
          >
            Placements
          </a>
          <a
            href="#contact-form"
            onClick={scrollToContact}
            className="hidden desk:inline-flex rounded-xl px-3 py-2 text-sm font-medium text-[var(--pl-text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--pl-text)]"
          >
            Contact
          </a>

          <Login
            onClick={openLoginModal}
            className="rounded-xl bg-[var(--pl-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--pl-link-hover)]"
          />
        </nav>
      </div>
    </div>
  )
}

export default Header;