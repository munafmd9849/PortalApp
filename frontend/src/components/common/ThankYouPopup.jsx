import React, { useEffect, useState } from 'react';

/**
 * Thank You Popup Component
 * Appears when a recruiter ends the last interview round / interview session.
 * Slides out from bottom, stays 4–5s, then slides back in.
 * Compact two-tone purple bar with exact message as per design.
 */
const ThankYouPopup = ({ isOpen, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const addVisible = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById('thank-you-popup-inner')?.classList.add('thank-you-visible');
        });
      });
    };
    addVisible();

    const slideOutAt = setTimeout(() => {
      document.getElementById('thank-you-popup-inner')?.classList.remove('thank-you-visible');
    }, 4500);

    const closeAt = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 4500 + 500);

    return () => {
      clearTimeout(slideOutAt);
      clearTimeout(closeAt);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !visible) return null;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center px-4 pb-4 pointer-events-none"
        aria-live="polite"
        role="status"
      >
        <div
          id="thank-you-popup-inner"
          className="thank-you-popup w-full max-w-2xl overflow-hidden rounded-t-2xl shadow-2xl"
        >
          {/* Darker purple header */}
          <div
            className="px-6 py-4 text-center"
            style={{ backgroundColor: '#4E3A99' }}
          >
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: 'cursive, "Comic Sans MS", "Brush Script MT", serif' }}
            >
              Thankyou!
            </h2>
          </div>
          {/* Lighter purple body */}
          <div
            className="px-6 py-4 text-center"
            style={{ backgroundColor: '#7A6FD1' }}
          >
            <p className="text-base md:text-lg text-white leading-relaxed">
              For using our portal for conducting the placements, a copy of candidates will be sent on your mail .
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .thank-you-popup {
          transform: translateY(calc(100% + 1rem));
          transition: transform 0.5s ease-out;
        }
        .thank-you-popup.thank-you-visible {
          transform: translateY(0);
        }
      `}</style>
    </>
  );
};

export default ThankYouPopup;
