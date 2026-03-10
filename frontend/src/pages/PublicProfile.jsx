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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-10 border border-gray-100">
            <div className="text-red-500 text-7xl mb-6">⚠️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Profile Not Found</h1>
            <p className="text-gray-600 text-lg">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-[95%] 2xl:max-w-[1400px] mx-auto px-6 md:px-10 py-12 relative z-10">
          <div className="flex flex-row items-center gap-8">
            {/* Profile Photo with Modern Border - Always Rounded */}
            {profile.profilePhoto ? (
              <div className="flex-shrink-0 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <img
                  src={profile.profilePhoto}
                  alt={profile.fullName}
                  className="relative w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl transform group-hover:scale-105 transition-transform"
                  style={{ borderRadius: '50%' }}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 relative">
                <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 shadow-2xl flex items-center justify-center" style={{ borderRadius: '50%' }}>
                  <User className="w-16 h-16 text-white/80" />
                </div>
              </div>
            )}
            
            {/* Name and Info - Horizontal Layout */}
            <div className="flex-1 text-white min-w-0">
              {/* Name and Headline in same line */}
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg whitespace-nowrap">{profile.fullName}</h1>
                {profile.headline && (
                  <p className="text-lg md:text-xl text-white/90 font-light whitespace-nowrap">{profile.headline}</p>
                )}
              </div>
              
              {/* Location, Email, LinkedIn - All in same line */}
              <div className="flex items-center gap-4 flex-wrap">
                {profile.location && (
                  <div className="flex items-center text-white/95 bg-white/15 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20 whitespace-nowrap">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="font-medium">{profile.location}</span>
                  </div>
                )}
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="flex items-center text-white/95 bg-white/15 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20 hover:bg-white/25 transition-all whitespace-nowrap"
                  >
                    <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="font-medium">{profile.email}</span>
                  </a>
                )}
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="flex items-center text-white/95 bg-white/15 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20 hover:bg-white/25 transition-all whitespace-nowrap"
                  >
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="font-medium">{profile.phone}</span>
                  </a>
                )}
                {profile.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-full transition-all shadow-lg hover:shadow-xl border border-white/20 hover:scale-105 whitespace-nowrap"
                  >
                    <Linkedin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="font-medium">LinkedIn</span>
                  </a>
                )}
              </div>
              
              {/* Other Social Links - Second Row */}
              {(profile.githubUrl || profile.youtubeUrl || profile.leetcode || profile.codeforces || profile.gfg || profile.hackerrank) && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {profile.githubUrl && (
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-full transition-all shadow-lg hover:shadow-xl border border-white/20 hover:scale-105"
                    >
                      <Github className="w-4 h-4 mr-2" />
                      <span className="font-medium">GitHub</span>
                    </a>
                  )}
                  {profile.youtubeUrl && (
                    <a
                      href={profile.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-full transition-all shadow-lg hover:shadow-xl border border-white/20 hover:scale-105"
                    >
                      <Youtube className="w-4 h-4 mr-2" />
                      <span className="font-medium">YouTube</span>
                    </a>
                  )}
                  {profile.leetcode && (
                    <a
                      href={profile.leetcode}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-full transition-all shadow-lg hover:shadow-xl border border-white/20 hover:scale-105"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      <span className="font-medium">LeetCode</span>
                    </a>
                  )}
                  {profile.codeforces && (
                    <a
                      href={profile.codeforces}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-full transition-all shadow-lg hover:shadow-xl border border-white/20 hover:scale-105"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      <span className="font-medium">Codeforces</span>
                    </a>
                  )}
                  {profile.gfg && (
                    <a
                      href={profile.gfg}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-full transition-all shadow-lg hover:shadow-xl border border-white/20 hover:scale-105"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      <span className="font-medium">GeeksforGeeks</span>
                    </a>
                  )}
                  {profile.hackerrank && (
                    <a
                      href={profile.hackerrank}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-full transition-all shadow-lg hover:shadow-xl border border-white/20 hover:scale-105"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      <span className="font-medium">HackerRank</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content - Modern Card Layout */}
      <div className="max-w-[95%] 2xl:max-w-[1400px] mx-auto px-6 md:px-10 py-10 space-y-6">
        {/* About Me */}
        {renderSection(profile.bio, () => (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl mr-4">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">About Me</h2>
            </div>
            <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          </div>
        ))}

        {/* Education */}
        {renderSection(profile.education, () => (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl mr-4">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Education</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {profile.education.map((edu, idx) => {
                // Parse description field (may contain JSON with city, state, scoreType, originalScore)
                let city = '';
                let state = '';
                let scoreType = 'CGPA';
                let displayScore = '';
                
                if (edu.description) {
                  try {
                    const descData = JSON.parse(edu.description);
                    if (descData.city) city = descData.city;
                    if (descData.state) state = descData.state;
                    if (descData.scoreType) {
                      scoreType = descData.scoreType;
                      // Use originalScore for percentage, cgpa for CGPA
                      if (descData.scoreType === 'Percentage' && descData.originalScore) {
                        displayScore = `${descData.originalScore}%`;
                      } else if (descData.originalScore) {
                        displayScore = `${descData.originalScore} CGPA`;
                      } else if (edu.cgpa) {
                        displayScore = `${edu.cgpa} CGPA`;
                      }
                    } else if (edu.cgpa) {
                      displayScore = `${edu.cgpa} CGPA`;
                    }
                  } catch (e) {
                    // Not JSON, use cgpa if available
                    if (edu.cgpa) {
                      displayScore = `${edu.cgpa} CGPA`;
                    }
                  }
                } else if (edu.cgpa) {
                  displayScore = `${edu.cgpa} CGPA`;
                }
                
                return (
                  <div 
                    key={idx} 
                    className="relative pl-6 border-l-4 border-gradient-to-b from-indigo-400 to-purple-400 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-r-xl p-6 hover:shadow-lg transition-all"
                    style={{ borderLeftColor: '#6366f1' }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{edu.degree}</h3>
                        <p className="text-lg text-gray-700 font-medium">{edu.institution}</p>
                        {city && state && (
                          <p className="text-sm text-gray-600 mt-1 italic">{city}, {state}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2 md:mt-0">
                        {edu.startYear && edu.endYear && (
                          <div className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm">
                            <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
                            <span className="font-medium">{edu.startYear} - {edu.endYear}</span>
                          </div>
                        )}
                        {displayScore && (
                          <div className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm">
                            <Trophy className="w-4 h-4 mr-2 text-yellow-600" />
                            <span className="font-medium">{displayScore}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Skills */}
        {renderSection(profile.skills, () => (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl mr-4">
                <Code className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {profile.skills.map((skill, idx) => (
                <div
                  key={idx}
                  className="group relative bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 px-5 py-3 rounded-xl flex items-center gap-3 border border-indigo-100 hover:border-indigo-300 hover:shadow-lg transition-all cursor-default"
                >
                  <span className="font-semibold text-base">{skill.skillName}</span>
                  {skill.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < skill.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Projects */}
        {renderSection(profile.projects, () => (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl mr-4">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Projects</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {profile.projects.map((project, idx) => (
                <div 
                  key={idx} 
                  className="group border-2 border-gray-100 rounded-xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{project.title}</h3>
                  </div>
                  {project.description && (
                    <p className="text-gray-700 text-base leading-relaxed mb-4">{project.description}</p>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.technologies.map((tech, techIdx) => (
                        <span
                          key={techIdx}
                          className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-medium border border-gray-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4">
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        <Github className="w-4 h-4 mr-2" />
                        <span>View Code</span>
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    )}
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        <span>View Project</span>
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Certifications */}
        {renderSection(profile.certifications, () => (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl mr-4">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Certifications</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.certifications.map((cert, idx) => (
                <div 
                  key={idx} 
                  className="border-2 border-gray-100 rounded-xl p-6 hover:border-yellow-300 hover:shadow-lg transition-all bg-gradient-to-br from-white to-yellow-50/30"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{cert.title}</h3>
                      {cert.issuer && (
                        <p className="text-gray-600 font-medium flex items-center mb-3">
                          <Building2 className="w-4 h-4 mr-2 text-indigo-600" />
                          {cert.issuer}
                        </p>
                      )}
                    </div>
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Award className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                    {cert.issuedDate && (
                      <div className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm">
                        <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
                        <span className="font-medium">Issued: {new Date(cert.issuedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}
                    {cert.expiryDate && (
                      <div className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm">
                        <Calendar className="w-4 h-4 mr-2 text-red-600" />
                        <span className="font-medium">Expires: {new Date(cert.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                  {cert.description && (
                    <p className="text-gray-700 mb-4 leading-relaxed">{cert.description}</p>
                  )}
                  {cert.certificateUrl && (
                    <a
                      href={cert.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      <span>View Certificate</span>
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Achievements */}
        {renderSection(profile.achievements, () => (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl mr-4">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Achievements</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.achievements.map((achievement, idx) => (
                <div 
                  key={idx} 
                  className="border-2 border-gray-100 rounded-xl p-6 hover:border-rose-300 hover:shadow-lg transition-all bg-gradient-to-br from-white to-rose-50/30"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{achievement.title}</h3>
                      {achievement.date && (
                        <div className="flex items-center text-gray-600 mb-3">
                          <Calendar className="w-4 h-4 mr-2 text-rose-600" />
                          <span className="font-medium">{new Date(achievement.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-rose-100 rounded-lg">
                      <Trophy className="w-6 h-6 text-rose-600" />
                    </div>
                  </div>
                  {achievement.description && (
                    <p className="text-gray-700 mb-4 leading-relaxed">{achievement.description}</p>
                  )}
                  {achievement.certificateUrl && (
                    <a
                      href={achievement.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      <span>View Certificate</span>
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Endorsements */}
        {renderSection(profile.endorsements, () => (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl mr-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Endorsements</h2>
            </div>
            <div className="space-y-6">
              {profile.endorsements.map((endorsement, idx) => (
                <div 
                  key={idx} 
                  className="border-2 border-gray-100 rounded-xl p-6 hover:border-violet-300 hover:shadow-lg transition-all bg-gradient-to-br from-white to-violet-50/30"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{endorsement.endorserName}</h3>
                      <p className="text-gray-600 font-medium flex items-center">
                        <Building2 className="w-4 h-4 mr-2 text-violet-600" />
                        {endorsement.endorserRole}
                        {endorsement.organization && ` at ${endorsement.organization}`}
                      </p>
                    </div>
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <Star className="w-6 h-6 text-violet-600 fill-violet-600" />
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed text-base">{endorsement.message}</p>
                  {endorsement.relatedSkills && endorsement.relatedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {endorsement.relatedSkills.map((skill, skillIdx) => (
                        <span
                          key={skillIdx}
                          className="bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-violet-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Spacing */}
      <div className="h-20"></div>
    </div>
  );
}
