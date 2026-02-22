/**
 * Public Profile Page
 * Read-only, shareable student profile
 * NO authentication required
 * Modern, clean, LinkedIn-style design
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { showError } from '../utils/toast';
import {
  Loader,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Youtube,
  ExternalLink,
  Award,
  GraduationCap,
  Code,
  Briefcase,
  FileText,
  Star,
  Calendar,
  Building2,
  Globe,
  Trophy,
  Sparkles,
  User,
  AlertCircle,
  FolderGit2
} from 'lucide-react';

export default function PublicProfile() {
  const { publicProfileId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!publicProfileId) {
        setError('Invalid profile link');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await api.getPublicProfile(publicProfileId);
        setProfile(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load public profile:', err);
        const errorMessage = err.message || err.error || 'Failed to load profile';
        setError(errorMessage);
        showError(errorMessage === 'Profile not found' ? 'Profile not found or has been disabled.' : 'Failed to load profile. Please check the link and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [publicProfileId]);

  // Conditional rendering helper - return null if no data
  const renderSection = (data, renderFn) => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }
    return renderFn();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Loader className="h-16 w-16 text-indigo-600 animate-spin mx-auto mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-600 text-lg font-medium mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-xl shadow-sm p-10 border border-gray-200">
            <div className="text-red-500 text-5xl mb-6">
              <AlertCircle className="w-16 h-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">Profile Not Found</h1>
            <p className="text-gray-600 text-base">
              {error === 'Profile not found' || error?.includes('not found')
                ? 'This profile link is invalid or has been disabled.'
                : 'Unable to load this profile. Please check the link and try again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-blue-100">
      {/* Sleek Minimal Header */}
      <div className="bg-zinc-900 text-white relative border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-16 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">

            {/* Profile Photo */}
            {profile.profilePhoto ? (
              <div className="flex-shrink-0 relative">
                <img
                  src={profile.profilePhoto}
                  alt={profile.fullName}
                  className="w-36 h-36 rounded-2xl object-cover border-4 border-zinc-800 shadow-xl"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-36 h-36 rounded-2xl bg-zinc-800 border-4 border-zinc-700 shadow-xl flex items-center justify-center">
                <User className="w-16 h-16 text-zinc-500" />
              </div>
            )}

            {/* User Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">{profile.fullName}</h1>
              {profile.headline && (
                <p className="text-lg md:text-xl text-zinc-400 font-normal mb-6 leading-relaxed">{profile.headline}</p>
              )}

              {/* Contact & Location */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
                {profile.location && (
                  <div className="flex items-center text-zinc-300 text-sm bg-zinc-800/80 px-4 py-2 rounded-md border border-zinc-700/50">
                    <MapPin className="w-4 h-4 mr-2" />
                    {profile.location}
                  </div>
                )}
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="flex items-center text-zinc-300 text-sm bg-zinc-800/80 px-4 py-2 rounded-md border border-zinc-700/50 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {profile.email}
                  </a>
                )}
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="flex items-center text-zinc-300 text-sm bg-zinc-800/80 px-4 py-2 rounded-md border border-zinc-700/50 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {profile.phone}
                  </a>
                )}
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50" title="LinkedIn">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {profile.githubUrl && (
                  <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50" title="GitHub">
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {profile.youtubeUrl && (
                  <a href={profile.youtubeUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50" title="YouTube">
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {profile.leetcode && (
                  <a href={profile.leetcode} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50 text-sm font-medium">
                    <Code className="w-4 h-4 mr-2" /> LeetCode
                  </a>
                )}
                {profile.codeforces && (
                  <a href={profile.codeforces} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50 text-sm font-medium">
                    <Code className="w-4 h-4 mr-2" /> Codeforces
                  </a>
                )}
                {profile.gfg && (
                  <a href={profile.gfg} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50 text-sm font-medium">
                    <Code className="w-4 h-4 mr-2" /> GeeksforGeeks
                  </a>
                )}
                {profile.hackerrank && (
                  <a href={profile.hackerrank} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/50 text-sm font-medium">
                    <Code className="w-4 h-4 mr-2" /> HackerRank
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 space-y-12">

        {/* About Me */}
        {renderSection(profile.bio, () => (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-semibold text-slate-800 uppercase tracking-wider mb-6 pb-4 border-b border-slate-100">About</h2>
            <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          </section>
        ))}

        {/* Experience / Projects Layout Box */}
        {renderSection(profile.projects, () => (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-semibold text-slate-800 uppercase tracking-wider mb-8 pb-4 border-b border-slate-100 flex items-center">
              <Briefcase className="w-5 h-5 mr-3 text-slate-400" /> Projects
            </h2>
            <div className="space-y-8">
              {profile.projects.map((project, idx) => (
                <div key={idx} className="group relative">
                  {idx !== profile.projects.length - 1 && (
                    <div className="absolute left-4 top-14 bottom-[-32px] w-px bg-slate-200"></div>
                  )}
                  <div className="flex items-start gap-6">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-1 z-10 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                      <FolderGit2 className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
                        <h3 className="text-xl font-semibold text-slate-900">{project.title}</h3>
                        <div className="flex gap-3">
                          {project.githubUrl && (
                            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-slate-900 flex items-center transition-colors">
                              <Github className="w-4 h-4 mr-1" /> Repository
                            </a>
                          )}
                          {project.liveUrl && (
                            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 flex items-center transition-colors">
                              <Globe className="w-4 h-4 mr-1" /> Live Demo
                            </a>
                          )}
                        </div>
                      </div>

                      {project.description && (
                        <p className="text-slate-600 text-base leading-relaxed mb-4">{project.description}</p>
                      )}

                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {project.technologies.map((tech, techIdx) => (
                            <span key={techIdx} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Two Column Section for Education & Skills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Education */}
          {renderSection(profile.education, () => (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 h-full">
              <h2 className="text-lg font-semibold text-slate-800 uppercase tracking-wider mb-6 pb-4 border-b border-slate-100 flex items-center">
                <GraduationCap className="w-5 h-5 mr-3 text-slate-400" /> Education
              </h2>
              <div className="space-y-6">
                {profile.education.map((edu, idx) => {
                  let city = '', state = '', displayScore = '';
                  if (edu.description) {
                    try {
                      const descData = JSON.parse(edu.description);
                      if (descData.city) city = descData.city;
                      if (descData.state) state = descData.state;
                      if (descData.scoreType === 'Percentage' && descData.originalScore) displayScore = `${descData.originalScore}%`;
                      else if (descData.originalScore) displayScore = `${descData.originalScore} CGPA`;
                      else if (edu.cgpa) displayScore = `${edu.cgpa} CGPA`;
                    } catch (e) {
                      if (edu.cgpa) displayScore = `${edu.cgpa} CGPA`;
                    }
                  } else if (edu.cgpa) {
                    displayScore = `${edu.cgpa} CGPA`;
                  }

                  return (
                    <div key={idx} className="relative">
                      <h3 className="text-lg font-semibold text-slate-900">{edu.degree}</h3>
                      <p className="text-slate-700 font-medium mb-1">{edu.institution}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mb-2">
                        {edu.startYear && edu.endYear && (
                          <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {edu.startYear} - {edu.endYear}</span>
                        )}
                        {city && state && (
                          <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {city}, {state}</span>
                        )}
                        {displayScore && (
                          <span className="flex items-center font-medium text-slate-700"><Trophy className="w-3.5 h-3.5 mr-1" /> {displayScore}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Skills */}
          {renderSection(profile.skills, () => (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 h-full">
              <h2 className="text-lg font-semibold text-slate-800 uppercase tracking-wider mb-6 pb-4 border-b border-slate-100 flex items-center">
                <Code className="w-5 h-5 mr-3 text-slate-400" /> Technical Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => (
                  <div key={idx} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium flex items-center gap-2">
                    {skill.skillName}
                    {skill.rating && (
                      <div className="flex items-center gap-0.5 ml-2 border-l border-slate-300 pl-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < skill.rating ? 'bg-slate-700' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Certifications & Achievements */}
        {(profile.certifications?.length > 0 || profile.achievements?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Certifications */}
            {renderSection(profile.certifications, () => (
              <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 h-full">
                <h2 className="text-lg font-semibold text-slate-800 uppercase tracking-wider mb-6 pb-4 border-b border-slate-100 flex items-center">
                  <FileText className="w-5 h-5 mr-3 text-slate-400" /> Certifications
                </h2>
                <div className="space-y-6">
                  {profile.certifications.map((cert, idx) => (
                    <div key={idx} className="flex items-start justify-between group">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{cert.title}</h3>
                        {cert.issuer && <p className="text-slate-600 text-sm mb-1">{cert.issuer}</p>}
                        <div className="text-xs text-slate-400 flex items-center gap-3 mb-2">
                          {cert.issuedDate && <span>Issued: {new Date(cert.issuedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>}
                          {cert.expiryDate && <span>Expires: {new Date(cert.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>}
                        </div>
                        {cert.certificateUrl && (
                          <a href={cert.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center transition-colors">
                            View Credential <ExternalLink className="w-3.5 h-3.5 ml-1" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Achievements */}
            {renderSection(profile.achievements, () => (
              <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 h-full">
                <h2 className="text-lg font-semibold text-slate-800 uppercase tracking-wider mb-6 pb-4 border-b border-slate-100 flex items-center">
                  <Trophy className="w-5 h-5 mr-3 text-slate-400" /> Achievements
                </h2>
                <div className="space-y-6">
                  {profile.achievements.map((achievement, idx) => (
                    <div key={idx}>
                      <h3 className="text-base font-semibold text-slate-900">{achievement.title}</h3>
                      {achievement.date && (
                        <p className="text-xs text-slate-400 mb-2">{new Date(achievement.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</p>
                      )}
                      {achievement.description && (
                        <p className="text-sm text-slate-600 leading-relaxed">{achievement.description}</p>
                      )}
                      {achievement.certificateUrl && (
                        <a href={achievement.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center mt-2 transition-colors">
                          View Proof <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Endorsements (Testimonials) */}
        {renderSection(profile.endorsements, () => (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-semibold text-slate-800 uppercase tracking-wider mb-8 pb-4 border-b border-slate-100 flex items-center">
              <Star className="w-5 h-5 mr-3 text-slate-400" /> Endorsements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.endorsements.map((endorsement, idx) => (
                <div key={idx} className="bg-slate-50 p-6 rounded-xl border border-slate-100 relative">
                  <div className="absolute top-6 right-6 text-slate-200">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" /></svg>
                  </div>
                  <p className="text-slate-700 italic leading-relaxed mb-6 block relative z-10">"{endorsement.message}"</p>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">{endorsement.endorserName}</span>
                    <span className="text-sm text-slate-500">{endorsement.endorserRole}{endorsement.organization && ` • ${endorsement.organization}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

      </div>

      {/* Footer Spacing */}
      <div className="h-20"></div>
    </div>
  );
}
