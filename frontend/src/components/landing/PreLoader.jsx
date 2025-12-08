import { useState, useEffect } from 'react';
import logo from '../../assets/images/brand_logo.webp'; 

const Preloader = ({ onComplete }) => {
  const [showPreloader, setShowPreloader] = useState(true);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHiding(true);
      // Hide the preloader after fade-out animation completes
      setTimeout(() => {
        setShowPreloader(false);
        // Call the onComplete callback when preloader is done
        if (onComplete) {
          onComplete();
        }
      }, 500); // Match the fadeOut animation duration
    }, 2500); // Show for 2.5 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Dynamically load the Lottie web component script if not already present
  useEffect(() => {
    if (!document.querySelector('script[src*="dotlottie-wc"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.2/dist/dotlottie-wc.js';
      script.type = 'module';
      document.body.appendChild(script);
    }
  }, []);

  // Prevent background scroll when preloader is open
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

  return (
    showPreloader && (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-500 ease-in-out ${
        isHiding ? 'animate-fadeOut' : 'animate-fadeIn'
      }`}>
        <div className="flex items-center justify-center gap-8 px-15">
          {/* Lottie Animation on the left - reduced by 20% */}
          <div className="flex items-center justify-center">
            <dotlottie-wc 
              src="https://lottie.host/6e821172-1003-4523-bf2d-96a5759519f9/SHkrOc6Yzm.lottie" 
              speed="1" 
              style={{ width: '240px', height: '240px' }} 
              mode="forward" 
              loop 
              autoplay
            />
          </div>
          
          {/* Logo on the right - reduced by 20% */}
          <img
            src={logo}
            alt="Brand Logo"
            className="w-38 animate-fadeUp"
          />
        </div>
      </div>
    )
  );
};

export default Preloader;