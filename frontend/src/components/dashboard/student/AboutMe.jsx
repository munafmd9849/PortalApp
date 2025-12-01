import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

const AboutMe = ({ profileData = null }) => {
  const { user } = useAuth();
  const [isTextExpanded, setIsTextExpanded] = useState(false);

  const truncateText = (text, wordLimit = 40) => {
    const words = text.split(' ');
    if (words.length <= wordLimit) {
      return { truncated: text, needsReadMore: false };
    }
    return {
      truncated: words.slice(0, wordLimit).join(' ') + '...', 
      needsReadMore: true,
      fullText: text
    };
  };

  // Use profileData from props, or fallback to empty values
  const aboutMeText = profileData?.bio || 'No bio available. Please update your profile to add a bio.';

  const { truncated, needsReadMore, fullText } = truncateText(aboutMeText);

  return (
    <div className="w-full">
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-2 pb-4 px-6 transition-all duration-200 shadow-lg">

        <legend className="text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
          About Me
        </legend>

        {/* About Me Content */}
        <div className="my-3 space-y-4">
          <div className="leading-relaxed text-sm bg-gradient-to-r from-black to-black text-transparent bg-clip-text">
            <span>{isTextExpanded ? fullText : truncated}</span>
            {needsReadMore && (
              <button
                onClick={() => setIsTextExpanded(!isTextExpanded)}
                className="ml-2 font-medium underline text-blue-800 hover:text-blue-700 transition-colors duration-300"
              >
                {isTextExpanded ? 'Read less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Contact Information */}
          <div className="pt-4 border-t border-[#3c80a7]/40">
            <div className="flex items-center justify-start text-gray-600 flex-wrap">
              {/* City, State */}
              <span className="ml-1 mr-1 text-black">•</span>
              <span className="text-sm font-medium bg-gradient-to-r from-black to-black text-transparent bg-clip-text">
                {(profileData?.city && profileData?.stateRegion) ? 
                 `${profileData.city}, ${profileData.stateRegion}` : 
                 'Location not set'}
              </span>

              {/* Phone Number */}
              <span className="ml-4 mr-1 text-black">•</span>
              <span className="text-sm font-medium bg-gradient-to-r from-black to-black text-transparent bg-clip-text">
                {profileData?.phone || 'Phone not set'}
              </span>

              {/* Email */}
              <span className="ml-4 mr-1 text-black">•</span>
              <span className="text-sm font-medium bg-gradient-to-r from-black to-black text-transparent bg-clip-text">
                {profileData?.email || user?.email || 'Email not set'}
              </span>

              {/* LinkedIn Link */}
              <span className="ml-4 mr-1 text-black">•</span>
              <span className='text-black font-medium'>Innovation &nbsp;</span>
              
              <button>
                <a
                  href={profileData?.linkedin || '#'}
                  target={profileData?.linkedin ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className={`transition-colors duration-300 ${
                    profileData?.linkedin ? 
                    'text-[#0A66C2] hover:text-[#1d7dde]' : 
                    'text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={!profileData?.linkedin ? (e) => e.preventDefault() : undefined}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </button>
              
              <span className='text-black font-medium'>&nbsp; every step</span>
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default AboutMe;
