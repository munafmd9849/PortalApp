import { useState, useEffect, useRef } from 'react';
import logo from '../../assets/images/brand_logo.webp';

const LOTTIE_ROCKET_URL = 'https://lottie.host/54e303b1-e0ab-433e-ba67-dc24e3f6ae13/YWLc5KQuUk.lottie';
const DOTLOTTIE_SCRIPT = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.7.1/dist/dotlottie-wc.js';

const Preloader = ({ onComplete }) => {
  const [showPreloader, setShowPreloader] = useState(true);
  const [isHiding, setIsHiding] = useState(false);
  const lottieContainerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHiding(true);
      setTimeout(() => {
        setShowPreloader(false);
        if (onComplete) onComplete();
      }, 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  useEffect(() => {
    if (showPreloader) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showPreloader]);

  // Load dotlottie-wc script and inject rocket animation
  useEffect(() => {
    if (!showPreloader || !lottieContainerRef.current) return;

    const loadAndInject = async () => {
      let script = document.querySelector('script[src*="dotlottie-wc"]');
      if (!script) {
        script = document.createElement('script');
        script.src = DOTLOTTIE_SCRIPT;
        script.type = 'module';
        document.body.appendChild(script);
      }
      await customElements.whenDefined('dotlottie-wc');

      const container = lottieContainerRef.current;
      if (container && !container.querySelector('dotlottie-wc')) {
        const dotlottie = document.createElement('dotlottie-wc');
        dotlottie.setAttribute('src', LOTTIE_ROCKET_URL);
        dotlottie.setAttribute('speed', '1');
        dotlottie.setAttribute('mode', 'forward');
        dotlottie.setAttribute('loop', '');
        dotlottie.setAttribute('autoplay', '');
        dotlottie.style.width = '260px';
        dotlottie.style.height = '260px';
        container.appendChild(dotlottie);
      }
    };
    loadAndInject();
  }, [showPreloader]);

  return (
    showPreloader && (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-500 ease-in-out ${
        isHiding ? 'animate-fadeOut' : 'animate-fadeIn'
      }`}>
        <div className="flex items-center justify-center gap-8 px-15">
          <div ref={lottieContainerRef} className="w-[260px] h-[260px] flex items-center justify-center" />
          <img
            src={logo}
            alt="Brand Logo"
            className="w-32 h-32 md:w-38 md:h-38 animate-fadeUp"
            style={{ maxWidth: '152px', height: 'auto' }}
          />
        </div>
      </div>
    )
  );
};

export default Preloader;