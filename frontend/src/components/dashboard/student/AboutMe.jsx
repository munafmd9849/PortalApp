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
      <fieldset className="bg-white rounded-xl border-2 border-[#8ec5ff] pt-2 pb-4 px-4 md:px-6 transition-all duration-200 shadow-lg hover:shadow-xl">

        <legend className="text-base md:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
          About Me
        </legend>

        {/* About Me Content */}
        <div className="my-3 space-y-3 md:space-y-4">
          <div className="leading-relaxed text-sm md:text-base text-gray-800">
            <span>{isTextExpanded ? fullText : truncated}</span>
            {needsReadMore && (
              <button
                onClick={() => setIsTextExpanded(!isTextExpanded)}
                className="ml-2 font-semibold text-indigo-600 hover:text-indigo-700 transition-colors duration-200 underline text-sm md:text-base"
              >
                {isTextExpanded ? 'Read less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Contact Information: stacked on mobile, inline on desktop */}
          <div className="pt-3 md:pt-4 border-t border-[#3c80a7]/40">
            {/* Mobile: vertical list with bullet dots, one item per row */}
            <div className="flex flex-col gap-2 md:hidden space-y-1.5">
              {(profileData?.city && profileData?.stateRegion) && (
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  <span>{`${profileData.city}, ${profileData.stateRegion}`}</span>
                </div>
              )}
              {profileData?.phone && (
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  <a href={`tel:${profileData.phone}`} className="text-gray-800 hover:text-blue-600">{profileData.phone}</a>
                </div>
              )}
              {(profileData?.email || user?.email) && (
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800 break-all">
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  <a href={`mailto:${profileData?.email || user?.email}`} className="text-gray-800 hover:text-blue-600">{profileData?.email || user?.email}</a>
                </div>
              )}
              {profileData?.linkedin && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">Innovation</span>
                    <a
                      href={profileData.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A66C2] hover:text-[#1d7dde] transition-colors duration-300 inline-flex items-center shrink-0"
                      aria-label="LinkedIn"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </a>
                    <span className="text-sm font-medium text-gray-800">every step</span>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop: original inline with bullets */}
            <div className="hidden md:flex items-center justify-start text-gray-700 flex-wrap gap-x-4 gap-y-2">
              {(profileData?.city && profileData?.stateRegion) && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm font-medium text-gray-800">
                    {`${profileData.city}, ${profileData.stateRegion}`}
                  </span>
                </>
              )}
              {profileData?.phone && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm font-medium text-gray-800">
                    {profileData.phone}
                  </span>
                </>
              )}
              {(profileData?.email || user?.email) && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm font-medium text-gray-800">
                    {profileData?.email || user?.email}
                  </span>
                </>
              )}
              {profileData?.linkedin && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-black font-medium">Innovation</span>
                    <a
                      href={profileData.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A66C2] hover:text-[#1d7dde] transition-colors duration-300 inline-flex items-center shrink-0"
                      aria-label="LinkedIn"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </a>
                    <span className="text-black font-medium">every step</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default AboutMe;
