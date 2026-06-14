import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api.js';
import { Loader2, Star, Award, CheckCircle } from 'lucide-react';

const parseRelatedSkills = (endorsement) => {
  if (Array.isArray(endorsement.relatedSkills)) {
    return endorsement.relatedSkills.filter((skill) => skill && skill.trim());
  }
  if (endorsement.relatedSkills && typeof endorsement.relatedSkills === 'string') {
    return endorsement.relatedSkills.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

export const EndorsementCardStyles = () => (
  <style>{`
    .endorse-expand {
      transition: grid-template-rows 650ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .endorse-expand-inner {
      opacity: 0;
      transform: translateY(-6px);
      transition: opacity 550ms ease 80ms, transform 650ms cubic-bezier(0.22, 1, 0.36, 1) 80ms;
    }
    .endorse-card:hover .endorse-expand-inner,
    .endorse-card:focus-within .endorse-expand-inner {
      opacity: 1;
      transform: translateY(0);
    }
    .endorse-hint {
      transition: opacity 400ms ease, max-height 400ms ease, margin 400ms ease;
      max-height: 1.25rem;
    }
    .endorse-card:hover .endorse-hint,
    .endorse-card:focus-within .endorse-hint {
      opacity: 0;
      max-height: 0;
      margin-top: 0;
      overflow: hidden;
    }
  `}</style>
);

// Individual Endorsement Card — formal achievement style with smooth hover expand
export const EndorsementCard = ({ endorsement, index = 0 }) => {
  const rating = endorsement.overallRating || endorsement.strengthRating;
  const skills = parseRelatedSkills(endorsement);
  const skillRatings = endorsement.skillRatings || {};
  const hasExpandedContent =
    Boolean(endorsement.relationship) ||
    Boolean(endorsement.context) ||
    skills.length > 0 ||
    Boolean(endorsement.submittedAt);

  const bgStyle =
    index % 2 === 0
      ? 'from-stone-50 via-amber-50/25 to-stone-100/80'
      : 'from-slate-50 via-stone-50 to-slate-100/60';

  return (
    <div
      tabIndex={0}
      className={`endorse-card group/endorse relative overflow-hidden rounded-lg md:rounded-xl px-3 py-3.5 md:px-5 md:py-4 min-w-0 outline-none border border-stone-200/90 bg-gradient-to-br transition-[box-shadow,border-color,transform] duration-500 ease-out hover:shadow-[0_10px_28px_rgba(92,74,42,0.09)] hover:border-amber-800/30 focus-within:border-amber-800/30 focus-within:shadow-[0_10px_28px_rgba(92,74,42,0.09)] ${bgStyle}`}
    >
      {/* Gold accent — deepens on hover */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-800/15 transition-colors duration-500 group-hover/endorse:bg-amber-700/45 group-focus-within/endorse:bg-amber-700/45"
        aria-hidden
      />

      {/* Always visible: name, designation, rating */}
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="flex items-start gap-2.5 md:gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-md bg-gradient-to-br from-amber-100/90 to-stone-200/80 border border-amber-200/70 flex items-center justify-center shadow-sm">
              <Award className="h-4 w-4 md:h-[18px] md:w-[18px] text-amber-900/85" strokeWidth={1.75} />
            </div>
            <CheckCircle
              className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-emerald-700 bg-stone-50 rounded-full"
              strokeWidth={2.5}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm md:text-base font-semibold text-slate-900 tracking-tight truncate"
              title={endorsement.endorserName || 'Endorser'}
            >
              {endorsement.endorserName || 'Endorser'}
            </h3>
            {endorsement.endorserRole && (
              <p className="text-xs md:text-sm text-stone-600 mt-0.5 truncate" title={endorsement.endorserRole}>
                {endorsement.endorserRole}
                {endorsement.organization ? (
                  <span className="text-stone-500"> · {endorsement.organization}</span>
                ) : null}
              </p>
            )}
          </div>
        </div>

        {rating ? (
          <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 ${
                    i < rating ? 'text-[#B8956B] fill-[#B8956B]' : 'text-stone-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs md:text-sm font-medium text-stone-700 ml-0.5 tabular-nums">{rating}/5</span>
          </div>
        ) : null}
      </div>

      {/* Always visible: endorsement message */}
      <div className="mt-3 md:mt-3.5 pl-1 sm:pl-11 md:pl-12 min-w-0">
        {endorsement.message ? (
          <p className="text-sm md:text-[15px] text-stone-700 leading-relaxed italic break-words whitespace-pre-wrap">
            <span className="text-amber-900/25 not-italic font-serif text-lg mr-0.5">"</span>
            {endorsement.message}
            <span className="text-amber-900/25 not-italic font-serif text-lg ml-0.5">"</span>
          </p>
        ) : (
          <p className="text-sm text-stone-400 italic">No endorsement message provided.</p>
        )}
      </div>

      {/* Smooth expand: CSS grid rows (avoids max-height jank) */}
      {hasExpandedContent ? (
        <div className="endorse-expand grid grid-rows-[0fr] group-hover/endorse:grid-rows-[1fr] group-focus-within/endorse:grid-rows-[1fr]">
          <div className="overflow-hidden min-h-0">
            <div className="endorse-expand-inner pt-3 mt-3 ml-1 sm:ml-11 md:ml-12 border-t border-amber-900/10 space-y-2.5">
              {(endorsement.relationship || endorsement.context) && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1.5">
                  {endorsement.relationship && (
                    <p className="text-xs md:text-sm text-stone-700">
                      <span className="font-semibold text-slate-800 tracking-wide">Role · </span>
                      {endorsement.relationship}
                    </p>
                  )}
                  {endorsement.context && (
                    <p className="text-xs md:text-sm text-stone-700">
                      <span className="font-semibold text-slate-800 tracking-wide">Context · </span>
                      {endorsement.context}
                    </p>
                  )}
                </div>
              )}

              {skills.length > 0 && (
                <div>
                  <p className="text-[10px] md:text-xs font-semibold text-amber-900/55 uppercase tracking-[0.14em] mb-1.5">
                    Related Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill, idx) => {
                      const skillRating = skillRatings[skill];
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-stone-100/90 text-slate-700 text-xs md:text-sm font-medium rounded border border-stone-300/70"
                          title={skill}
                        >
                          {skill}
                          {skillRating ? (
                            <span className="text-[10px] md:text-xs font-semibold text-stone-500 tabular-nums">
                              {skillRating}/5
                            </span>
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {endorsement.submittedAt && (
                <p className="text-[10px] md:text-xs text-stone-500 tracking-wide">
                  Endorsed{' '}
                  {new Date(endorsement.submittedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {hasExpandedContent ? (
        <p className="endorse-hint mt-2.5 text-[10px] text-stone-400/90 tracking-wide uppercase pl-1 sm:pl-11 md:pl-12">
          Hover for details
        </p>
      ) : null}
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
    <>
      <EndorsementCardStyles />
    <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-3 px-3 md:pb-4 md:px-6 transition-all duration-200 shadow-lg min-w-0 overflow-hidden">
      <legend className="text-base md:text-lg md:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
        Endorsements
      </legend>

      <div className="space-y-2 md:space-y-3 py-3 md:py-4">
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
    </>
  );
};

export default Endorsements;

