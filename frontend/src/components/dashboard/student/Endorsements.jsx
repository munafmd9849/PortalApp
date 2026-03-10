import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api.js';
import { Loader2, Mail, User, Building2, Star, CheckCircle, ExternalLink, Copy } from 'lucide-react';

// Individual Endorsement Card Component
const EndorsementCard = ({ endorsement, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = (e) => {
    e.stopPropagation();
    if (endorsement.endorserEmail) {
      navigator.clipboard.writeText(endorsement.endorserEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get gradient colors based on index for variety
  const gradients = [
    'from-blue-500 via-purple-500 to-pink-500',
    'from-green-500 via-teal-500 to-cyan-500',
    'from-orange-500 via-red-500 to-pink-500',
    'from-indigo-500 via-blue-500 to-purple-500',
    'from-emerald-500 via-green-500 to-teal-500',
  ];
  const gradient = gradients[index % gradients.length];

  // Get initial for avatar
  const initial = endorsement.endorserName?.charAt(0)?.toUpperCase() || 'T';

  return (
    <div
      className="relative bg-gradient-to-br from-white to-gray-50 rounded-xl md:rounded-2xl border border-gray-200 p-4 md:p-6 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group overflow-hidden min-w-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decorative gradient background on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-xl md:rounded-2xl`}></div>
      
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} rounded-t-xl md:rounded-t-2xl`}></div>

      {/* Header Section */}
      <div className="relative mb-3 md:mb-5">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3 md:mb-4">
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            {/* Avatar with gradient */}
            <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
              <span className="text-white font-bold text-lg md:text-2xl">{initial}</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 md:w-6 md:h-6 bg-green-500 rounded-full border-2 md:border-4 border-white flex items-center justify-center">
                <CheckCircle className="w-2 h-2 md:w-3 md:h-3 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-0.5 md:mb-1 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300" title={endorsement.endorserName || 'Teacher'}>
                {endorsement.endorserName || 'Teacher'}
              </h3>
              {endorsement.endorserRole && (
                <p className="text-xs md:text-sm text-gray-600 flex items-center gap-1 md:gap-1.5 min-w-0">
                  <Building2 className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium truncate">{endorsement.endorserRole}</span>
                  {endorsement.organization && (
                    <span className="text-gray-500 truncate">at {endorsement.organization}</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Date badge */}
          {endorsement.submittedAt && (
            <div className="px-2 py-1 md:px-3 md:py-1.5 bg-gray-100 rounded-lg md:rounded-xl border border-gray-200 flex-shrink-0">
              <p className="text-[10px] md:text-xs font-medium text-gray-600 whitespace-nowrap" title={new Date(endorsement.submittedAt).toLocaleDateString()}>
                {new Date(endorsement.submittedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Relationship, Context, and Rating Row - full width on mobile, no fixed ml */}
        <div className="flex items-center justify-start flex-wrap gap-2 md:gap-3 ml-0 md:ml-20">
          {/* Relationship */}
          {endorsement.relationship && (
            <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-purple-50 rounded-md md:rounded-lg border border-purple-100">
              <span className="text-xs md:text-sm text-purple-700 font-medium truncate max-w-[120px] md:max-w-none" title={endorsement.relationship}>{endorsement.relationship}</span>
            </div>
          )}
          
          {/* Context */}
          {endorsement.context && (
            <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-indigo-50 rounded-md md:rounded-lg border border-indigo-100">
              <span className="text-xs md:text-sm text-indigo-700 font-medium truncate max-w-[120px] md:max-w-none" title={endorsement.context}>{endorsement.context}</span>
            </div>
          )}
          
          {/* Rating */}
          {(endorsement.strengthRating || endorsement.overallRating) && (
            <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-yellow-50 rounded-md md:rounded-lg border border-yellow-100">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => {
                  const rating = endorsement.overallRating || endorsement.strengthRating;
                  return (
                    <Star
                      key={i}
                      className={`w-3 h-3 md:w-4 md:h-4 ${
                        i < rating
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-xs md:text-sm font-semibold text-yellow-700">
                {(endorsement.overallRating || endorsement.strengthRating)}/5
              </span>
            </div>
          )}
        </div>
        
        {/* Note: Email is NOT displayed for privacy - only used internally */}
      </div>

      {/* Endorsement Message */}
      <div className="relative mb-3 md:mb-5">
        <div className="relative p-3 md:p-5 bg-gradient-to-br from-gray-50 to-white rounded-lg md:rounded-xl border border-gray-200 shadow-inner group-hover:border-blue-200 group-hover:shadow-md transition-all duration-300 min-w-0">
          <div className="absolute top-2 left-2 md:top-3 md:left-3 text-2xl md:text-4xl text-gray-200 font-serif leading-none opacity-50">"</div>
          {endorsement.message ? (
            <p className="text-sm md:text-base text-gray-700 whitespace-pre-wrap leading-relaxed relative z-10 pl-5 md:pl-6 italic font-medium break-words">
              {endorsement.message}
            </p>
          ) : (
            <p className="text-sm md:text-base text-gray-400 italic text-center py-3 md:py-4 relative z-10">
              No endorsement message provided.
            </p>
          )}
        </div>
      </div>

      {/* Related Skills with Ratings */}
      {(() => {
        // Normalize relatedSkills to ensure it's an array
        const skills = Array.isArray(endorsement.relatedSkills) 
          ? endorsement.relatedSkills.filter(skill => skill && skill.trim())
          : (endorsement.relatedSkills && typeof endorsement.relatedSkills === 'string'
            ? endorsement.relatedSkills.split(',').map(s => s.trim()).filter(s => s)
            : []);
        
        const skillRatings = endorsement.skillRatings || {};
        
        return skills.length > 0 ? (
          <div className="relative pt-3 md:pt-4 border-t border-gray-200">
            <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 md:mb-3">Related Skills</p>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {skills.map((skill, idx) => {
                const rating = skillRatings[skill];
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 md:gap-2 px-2 py-0.5 md:px-4 md:py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs md:text-sm font-medium rounded-full shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 truncate max-w-[100px] md:max-w-none"
                    title={skill}
                  >
                    {skill}
                    {rating && (
                      <span className="bg-white/20 px-1 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold flex-shrink-0">
                        {rating}/5
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
};

const Endorsements = ({ isAdminView = false, studentId = null, profileData = null }) => {
  const { user } = useAuth();
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In admin view, use studentId if provided, otherwise use logged-in user's ID
    const targetUserId = (isAdminView && studentId) ? studentId : user?.id;
    if (!targetUserId) return;

    const loadEndorsements = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // If profileData is provided and has endorsementsData, use it (for admin view)
        if (isAdminView && profileData?.endorsementsData) {
          try {
            const parsedEndorsements = typeof profileData.endorsementsData === 'string'
              ? JSON.parse(profileData.endorsementsData)
              : profileData.endorsementsData;
            
            if (Array.isArray(parsedEndorsements) && parsedEndorsements.length > 0) {
              // Filter only endorsements with consent = true
              const consentedEndorsements = parsedEndorsements.filter(e => e.consent === true);
              
              // Normalize endorsement data
              const normalizedEndorsements = consentedEndorsements.map(endorsement => {
                let relatedSkills = [];
                if (Array.isArray(endorsement.relatedSkills)) {
                  relatedSkills = endorsement.relatedSkills.filter(skill => skill && skill.trim());
                } else if (endorsement.relatedSkills && typeof endorsement.relatedSkills === 'string') {
                  relatedSkills = endorsement.relatedSkills.split(',').map(s => s.trim()).filter(s => s);
                }
                
                // Parse skillRatings if present
                let skillRatings = {};
                if (endorsement.skillRatings) {
                  try {
                    skillRatings = typeof endorsement.skillRatings === 'string' 
                      ? JSON.parse(endorsement.skillRatings) 
                      : endorsement.skillRatings;
                  } catch (e) {
                    console.warn('Failed to parse skillRatings:', e);
                  }
                }
                
                return { 
                  ...endorsement, 
                  relatedSkills,
                  skillRatings,
                };
              });
              
              setEndorsements(normalizedEndorsements);
              setLoading(false);
              return;
            }
          } catch (parseError) {
            console.error('Error parsing endorsementsData from profile:', parseError);
          }
        }
        
        // Otherwise, fetch from API (for student view or if profileData doesn't have endorsements)
        // In admin view, don't call API as it will use admin's ID - use profileData instead
        if (isAdminView) {
          // Admin view: if profileData didn't include endorsementsData, treat as empty.
          setEndorsements([]);
          setLoading(false);
          return;
        }
        
        const response = await api.getStudentEndorsements();
        // Fixed: Use 'received' instead of 'endorsements'
        const realEndorsements = response.received || [];
        
        // Filter only endorsements with consent = true
        const consentedEndorsements = realEndorsements.filter(e => e.consent === true);
        
        // Normalize endorsement data to ensure relatedSkills is always an array
        const normalizedEndorsements = consentedEndorsements.map(endorsement => {
          // Normalize relatedSkills
          let relatedSkills = [];
          if (Array.isArray(endorsement.relatedSkills)) {
            relatedSkills = endorsement.relatedSkills.filter(skill => skill && skill.trim());
          } else if (endorsement.relatedSkills && typeof endorsement.relatedSkills === 'string') {
            relatedSkills = endorsement.relatedSkills.split(',').map(s => s.trim()).filter(s => s);
          }
          
          // Parse skillRatings if present
          let skillRatings = {};
          if (endorsement.skillRatings) {
            try {
              skillRatings = typeof endorsement.skillRatings === 'string' 
                ? JSON.parse(endorsement.skillRatings) 
                : endorsement.skillRatings;
            } catch (e) {
              console.warn('Failed to parse skillRatings:', e);
            }
          }
          
          return {
            ...endorsement,
            relatedSkills,
            skillRatings,
          };
        });
        
        setEndorsements(normalizedEndorsements);
      } catch (err) {
        console.error('Error loading endorsements:', err);
        setError('Failed to load endorsements');
        setEndorsements([]);
      } finally {
        setLoading(false);
      }
    };

    loadEndorsements();
  }, [user?.id]);

  // Determine which endorsements to display
  const displayEndorsements = Array.isArray(endorsements) ? endorsements : [];

  // Show loading state
  if (loading) {
    return (
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-4 px-4 sm:px-6 transition-all duration-200 shadow-lg">
        <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
          Endorsements
        </legend>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </fieldset>
    );
  }

  // Don't render if there's an error and no data to show
  if (error && displayEndorsements.length === 0) {
    return null;
  }

  // Only render if there are endorsements to display
  if (displayEndorsements.length === 0) {
    return null;
  }

  return (
    <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-3 px-3 md:pb-4 md:px-6 transition-all duration-200 shadow-lg min-w-0 overflow-hidden">
      <legend className="text-base md:text-lg md:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
        Endorsements
      </legend>

      <div className="space-y-3 md:space-y-5 py-3 md:py-5">
        {/* Show only the latest 3 endorsements on dashboard */}
        {displayEndorsements
          .sort((a, b) => {
            // Sort by submittedAt date (most recent first)
            const dateA = a.submittedAt ? new Date(a.submittedAt) : new Date(0);
            const dateB = b.submittedAt ? new Date(b.submittedAt) : new Date(0);
            return dateB - dateA;
          })
          .slice(0, 3)
          .map((endorsement, index) => (
            <EndorsementCard key={index} endorsement={endorsement} index={index} />
          ))}
      </div>
    </fieldset>
  );
};

export default Endorsements;

