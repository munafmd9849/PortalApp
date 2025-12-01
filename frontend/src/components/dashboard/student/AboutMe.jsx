import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { getStudentProfile } from '../../../services/students';

const AboutMe = () => {
  const { user } = useAuth();
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileLoadedRef = useRef(null);

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

  // Load profile data once on mount
  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      setProfileData(null);
      profileLoadedRef.current = null;
      return;
    }

    // Prevent repeated calls for the same user
    if (profileLoadedRef.current === userId) return;

    let isMounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const profile = await getStudentProfile(user.id);
        if (isMounted) {
          setProfileData(profile);
          profileLoadedRef.current = userId;
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        if (isMounted) {
          setProfileData(null);
          // Reset on error to allow retry
          profileLoadedRef.current = null;
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const aboutMeText = profileData?.bio || 'No bio available. Please update your profile to add a bio.';

  const { truncated, needsReadMore, fullText } = truncateText(aboutMeText);

  const locationLabel = (profileData?.city && profileData?.stateRegion)
    ? `${profileData.city}, ${profileData.stateRegion}`
    : 'Location not set';
  const phoneLabel = profileData?.phone || 'Phone not set';
  const emailLabel = profileData?.email || user?.email || 'Email not set';
  const linkedInUrl = profileData?.linkedin || '#';
  const hasLinkedIn = Boolean(profileData?.linkedin);

  return (
    <div className="w-full">
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-2 pb-4 px-4 sm:px-6 transition-all duration-200 shadow-lg">

        <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
          About Me
        </legend>

        {/* About Me Content */}
        <div className="my-3 space-y-4">
          <div className="leading-relaxed text-xs sm:text-sm bg-gradient-to-r from-black to-black text-transparent bg-clip-text">
            <span>{isTextExpanded ? fullText : truncated}</span>
            {needsReadMore && (
              <button
                onClick={() => setIsTextExpanded(!isTextExpanded)}
                className="ml-2 font-medium underline text-blue-800 hover:text-blue-700 transition-colors duration-300 touch-manipulation"
              >
                {isTextExpanded ? 'Read less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Contact Information */}
          <div className="pt-4 border-t border-[#3c80a7]/40">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3 text-gray-600">
              <span className="mr-1 text-black">•</span>
              <span className="text-sm font-medium bg-gradient-to-r from-black to-black text-transparent bg-clip-text">
                {loading ? 'Loading...' : locationLabel}
              </span>

              <span className="ml-4 mr-1 text-black">•</span>
              <span className="text-sm font-medium bg-gradient-to-r from-black to-black text-transparent bg-clip-text">
                {loading ? 'Loading...' : phoneLabel}
              </span>

              <span className="ml-4 mr-1 text-black">•</span>
              <span className="text-sm font-medium bg-gradient-to-r from-black to-black text-transparent bg-clip-text sm:max-w-[220px] truncate">
                {loading ? 'Loading...' : emailLabel}
              </span>

              <div className="flex items-center gap-1 sm:ml-4">
                <span className="text-black">•</span>
                <span className="text-xs sm:text-sm font-medium text-black">Innovation</span>
                <a
                  href={linkedInUrl}
                  target={hasLinkedIn ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  aria-label="LinkedIn profile"
                  className={`transition-colors duration-300 touch-manipulation ${
                    hasLinkedIn ? 'text-[#0A66C2] hover:text-[#1d7dde]' : 'text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={(e) => !hasLinkedIn && e.preventDefault()}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <span className="text-xs sm:text-sm font-medium text-black">&nbsp;every step</span>
              </div>
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default AboutMe;
