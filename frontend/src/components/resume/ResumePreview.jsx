import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Loader, AlertCircle } from 'lucide-react';
import { getResumeData } from '../../services/resumeData.js';

const TEMPLATES = {
  modern: {
    name: 'Modern',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#f1f5f9'
    }
  },
  classic: {
    name: 'Classic',
    colors: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#f9fafb'
    }
  },
  creative: {
    name: 'Creative',
    colors: {
      primary: '#7c3aed',
      secondary: '#a78bfa',
      accent: '#f3f4f6'
    }
  },
  minimal: {
    name: 'Minimal',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#ffffff'
    }
  }
};

export default function ResumePreview({ resumeUrl, resumeData, scale = 1 }) {
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (resumeUrl && resumeUrl.startsWith('firestore://')) {
      setLoading(true);
      setPdfData(null); // Reset previous data
      const resumeId = resumeUrl.replace('firestore://', '');
      getResumeData(resumeId)
        .then(data => {
          if (data) {
            setPdfData(data);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading resume:', err);
          setPdfData(null);
          setLoading(false);
        });
    } else if (resumeUrl) {
      setPdfData(resumeUrl);
    } else {
      setPdfData(null);
      setLoading(false);
    }
  }, [resumeUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading resume...</span>
      </div>
    );
  }

  if (pdfData) {
    return (
      <div className="w-full h-full">
        <iframe
          src={pdfData}
          title="Resume Preview"
          className="w-full h-full border-0"
          onError={() => {
            console.error('PDF iframe failed to load');
            setPdfData(null);
          }}
        />
      </div>
    );
  }

  // If we have resumeData, render the resume preview directly
  if (resumeData) {
    return (
      <div className="bg-white p-8 max-w-4xl mx-auto my-8 shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {resumeData.personal?.fullName || 'Your Name'}
          </h1>
          <div className="flex flex-wrap justify-center gap-4 mt-2 text-gray-600">
            {resumeData.personal?.email && (
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                <span>{resumeData.personal.email}</span>
              </div>
            )}
            {resumeData.personal?.phone && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                <span>{resumeData.personal.phone}</span>
              </div>
            )}
            {resumeData.personal?.location && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{resumeData.personal.location}</span>
              </div>
            )}
            {resumeData.personal?.website && (
              <a 
                href={resumeData.personal.website.startsWith('http') ? resumeData.personal.website : `https://${resumeData.personal.website}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:underline"
              >
                <Globe className="h-4 w-4 mr-1" />
                <span>Website</span>
              </a>
            )}
            {resumeData.personal?.linkedin && (
              <a 
                href={resumeData.personal.linkedin.startsWith('http') ? resumeData.personal.linkedin : `https://${resumeData.personal.linkedin}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:underline"
              >
                <Linkedin className="h-4 w-4 mr-1" />
                <span>LinkedIn</span>
              </a>
            )}
            {resumeData.personal?.github && (
              <a 
                href={resumeData.personal.github.startsWith('http') ? resumeData.personal.github : `https://${resumeData.personal.github}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-gray-700 hover:underline"
              >
                <Github className="h-4 w-4 mr-1" />
                <span>GitHub</span>
              </a>
            )}
          </div>
        </div>

        {/* Summary */}
        {resumeData.summary && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b border-gray-200 pb-1 mb-3">
              Summary
            </h2>
            <p className="text-gray-700">{resumeData.summary}</p>
          </div>
        )}

        {/* Sections */}
        {resumeData.sections?.map((section) => (
          <div key={section.id} className="mb-8">
            <h2 className="text-xl font-semibold border-b border-gray-200 pb-1 mb-3">
              {section.title}
            </h2>
            {section.items?.map((item, index) => (
              <div key={item.id || index} className="mb-4">
                {section.type === 'experience' && (
                  <div className="mb-4">
                    <div className="flex justify-between">
                      <h3 className="font-semibold">{item.position}</h3>
                      <div className="text-gray-600">
                        {item.startDate} - {item.current ? 'Present' : item.endDate}
                      </div>
                    </div>
                    <div className="text-gray-700">
                      {item.company}
                      {item.location && `, ${item.location}`}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-gray-600 whitespace-pre-line">
                        {item.description}
                      </p>
                    )}
                  </div>
                )}
                {section.type === 'education' && (
                  <div className="mb-4">
                    <div className="flex justify-between">
                      <h3 className="font-semibold">{item.degree}</h3>
                      <div className="text-gray-600">
                        {item.startDate} - {item.endDate || 'Present'}
                      </div>
                    </div>
                    <div className="text-gray-700">
                      {item.school}
                      {item.location && `, ${item.location}`}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-gray-600">{item.description}</p>
                    )}
                  </div>
                )}
                {section.type === 'skills' && (
                  <div className="mb-2">
                    <h3 className="font-medium">{item.category || 'Skills'}</h3>
                    <p className="text-gray-700">{item.skills?.join(', ')}</p>
                  </div>
                )}
                {section.type === 'projects' && (
                  <div className="mb-4">
                    <h3 className="font-semibold">{item.name}</h3>
                    <div className="text-sm text-gray-600 mb-1">
                      {item.technologies?.join(' • ')}
                    </div>
                    <p className="text-gray-700">{item.description}</p>
                    {item.url && (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Project
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (resumeUrl && resumeUrl.startsWith('firestore://') && !loading && !pdfData) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <AlertCircle className="h-8 w-8 mr-2" />
        <span>Failed to load resume preview</span>
      </div>
    );
  }

  if (!resumeData && !resumeUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No resume data available
      </div>
    );
  }

  const template = TEMPLATES[resumeData.settings?.template] || TEMPLATES.modern;
  
  const containerStyle = {
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: `${100 / scale}%`,
    height: `${100 / scale}%`
  };

  return (
    <div style={containerStyle} className="bg-white shadow-lg">
      <div className="w-full max-w-4xl mx-auto bg-white" style={{ minHeight: '11in' }}>
        {/* Header Section */}
        <div className="p-8 pb-6" style={{ backgroundColor: template.colors.accent }}>
          <div className="text-center">
            <h1 
              className="text-4xl font-bold mb-2"
              style={{ color: template.colors.primary }}
            >
              {resumeData.personal?.fullName || 'Your Name'}
            </h1>
            
            {/* Contact Information */}
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm" style={{ color: template.colors.secondary }}>
              {resumeData.personal?.email && (
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  {resumeData.personal.email}
                </div>
              )}
              {resumeData.personal?.phone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {resumeData.personal.phone}
                </div>
              )}
              {resumeData.personal?.location && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {resumeData.personal.location}
                </div>
              )}
            </div>
            
            {/* Links */}
            <div className="flex flex-wrap justify-center items-center gap-4 mt-2 text-sm" style={{ color: template.colors.secondary }}>
              {resumeData.personal?.website && (
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-1" />
                  <a href={resumeData.personal.website} className="hover:underline">
                    {resumeData.personal.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {resumeData.personal?.linkedin && (
                <div className="flex items-center">
                  <Linkedin className="h-4 w-4 mr-1" />
                  <a href={resumeData.personal.linkedin} className="hover:underline">
                    LinkedIn
                  </a>
                </div>
              )}
              {resumeData.personal?.github && (
                <div className="flex items-center">
                  <Github className="h-4 w-4 mr-1" />
                  <a href={resumeData.personal.github} className="hover:underline">
                    GitHub
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Professional Summary */}
        {resumeData.summary && (
          <div className="px-8 py-4">
            <h2 
              className="text-xl font-semibold mb-3 pb-1 border-b-2"
              style={{ 
                color: template.colors.primary,
                borderColor: template.colors.primary
              }}
            >
              Professional Summary
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {resumeData.summary}
            </p>
          </div>
        )}

        {/* Dynamic Sections */}
        <div className="px-8 pb-8">
          {resumeData.sections?.map((section) => (
            <div key={section.id} className="mb-6">
              <h2 
                className="text-xl font-semibold mb-4 pb-1 border-b-2"
                style={{ 
                  color: template.colors.primary,
                  borderColor: template.colors.primary
                }}
              >
                {section.title}
              </h2>
              
              {section.type === 'experience' && (
                <ExperienceSection items={section.items} template={template} />
              )}
              
              {section.type === 'education' && (
                <EducationSection items={section.items} template={template} />
              )}
              
              {section.type === 'skills' && (
                <SkillsSection items={section.items} template={template} />
              )}
              
              {section.type === 'projects' && (
                <ProjectsSection items={section.items} template={template} />
              )}
              
              {section.type === 'certifications' && (
                <CertificationsSection items={section.items} template={template} />
              )}
              
              {section.type === 'languages' && (
                <LanguagesSection items={section.items} template={template} />
              )}
              
              {section.type === 'interests' && (
                <InterestsSection items={section.items} template={template} />
              )}
              
              {section.type === 'custom' && (
                <CustomSection items={section.items} template={template} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Experience Section Component
function ExperienceSection({ items, template }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-gray-500 italic text-center py-4">
        No work experience added yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="border-l-2 pl-4" style={{ borderColor: template.colors.accent }}>
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-semibold text-lg" style={{ color: template.colors.primary }}>
              {item.position || 'Position Title'}
            </h3>
            <span className="text-sm" style={{ color: template.colors.secondary }}>
              {item.startDate && item.endDate ? `${item.startDate} - ${item.endDate}` : 'Date Range'}
            </span>
          </div>
          <div className="flex items-center mb-2">
            <span className="font-medium" style={{ color: template.colors.secondary }}>
              {item.company || 'Company Name'}
            </span>
            {item.location && (
              <span className="ml-2 text-sm" style={{ color: template.colors.secondary }}>
                • {item.location}
              </span>
            )}
          </div>
          {item.description && (
            <div className="text-gray-700">
              {item.description.split('\n').map((line, i) => (
                <p key={i} className="mb-1">{line}</p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Education Section Component
function EducationSection({ items, template }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-gray-500 italic text-center py-4">
        No education added yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="border-l-2 pl-4" style={{ borderColor: template.colors.accent }}>
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-semibold text-lg" style={{ color: template.colors.primary }}>
              {item.degree || 'Degree'}
            </h3>
            <span className="text-sm" style={{ color: template.colors.secondary }}>
              {item.graduationDate || 'Graduation Date'}
            </span>
          </div>
          <div className="flex items-center mb-2">
            <span className="font-medium" style={{ color: template.colors.secondary }}>
              {item.institution || 'Institution Name'}
            </span>
            {item.location && (
              <span className="ml-2 text-sm" style={{ color: template.colors.secondary }}>
                • {item.location}
              </span>
            )}
          </div>
          {item.gpa && (
            <p className="text-sm text-gray-600">GPA: {item.gpa}</p>
          )}
          {item.description && (
            <p className="text-gray-700 mt-1">{item.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Skills Section Component
function SkillsSection({ items, template }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-gray-500 italic text-center py-4">
        No skills added yet
      </div>
    );
  }

  // Group skills by category if they have categories
  const groupedSkills = items.reduce((acc, skill) => {
    const category = skill.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(groupedSkills).map(([category, skills]) => (
        <div key={category}>
          {Object.keys(groupedSkills).length > 1 && (
            <h4 className="font-medium mb-2" style={{ color: template.colors.primary }}>
              {category}
            </h4>
          )}
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: template.colors.accent,
                  color: template.colors.primary,
                  border: `1px solid ${template.colors.primary}20`
                }}
              >
                {skill.name || skill.title || 'Skill'}
                {skill.level && (
                  <span className="ml-1 text-xs opacity-75">
                    ({skill.level})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Projects Section Component
function ProjectsSection({ items, template }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-gray-500 italic text-center py-4">
        No projects added yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="border-l-2 pl-4" style={{ borderColor: template.colors.accent }}>
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-semibold text-lg" style={{ color: template.colors.primary }}>
              {item.name || 'Project Name'}
            </h3>
            <span className="text-sm" style={{ color: template.colors.secondary }}>
              {item.date || 'Project Date'}
            </span>
          </div>
          {item.technologies && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.technologies.split(',').map((tech, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs rounded"
                  style={{
                    backgroundColor: template.colors.accent,
                    color: template.colors.secondary
                  }}
                >
                  {tech.trim()}
                </span>
              ))}
            </div>
          )}
          {item.description && (
            <p className="text-gray-700 mb-2">{item.description}</p>
          )}
          {(item.githubUrl || item.liveUrl) && (
            <div className="flex gap-4 text-sm">
              {item.githubUrl && (
                <a 
                  href={item.githubUrl} 
                  className="hover:underline"
                  style={{ color: template.colors.primary }}
                >
                  GitHub
                </a>
              )}
              {item.liveUrl && (
                <a 
                  href={item.liveUrl} 
                  className="hover:underline"
                  style={{ color: template.colors.primary }}
                >
                  Live Demo
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Certifications Section Component
function CertificationsSection({ items, template }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-gray-500 italic text-center py-4">
        No certifications added yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <div>
            <h4 className="font-medium" style={{ color: template.colors.primary }}>
              {item.name || 'Certification Name'}
            </h4>
            <p className="text-sm" style={{ color: template.colors.secondary }}>
              {item.issuer || 'Issuing Organization'}
            </p>
          </div>
          <span className="text-sm" style={{ color: template.colors.secondary }}>
            {item.date || 'Issue Date'}
          </span>
        </div>
      ))}
    </div>
  );
}

// Languages Section Component
function LanguagesSection({ items, template }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-gray-500 italic text-center py-4">
        No languages added yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className="font-medium" style={{ color: template.colors.primary }}>
            {item.language || 'Language'}
          </span>
          <span className="text-sm" style={{ color: template.colors.secondary }}>
            {item.proficiency || 'Proficiency'}
          </span>
        </div>
      ))}
    </div>
  );
}

// Interests Section Component
function InterestsSection({ items, template }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-gray-500 italic text-center py-4">
        No interests added yet
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={index}
          className="px-3 py-1 rounded-full text-sm"
          style={{
            backgroundColor: template.colors.accent,
            color: template.colors.secondary
          }}
        >
          {item.interest || item.name || 'Interest'}
        </span>
      ))}
    </div>
  );
}

// Custom Section Component
function CustomSection({ items, template }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-gray-500 italic text-center py-4">
        No items added yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index}>
          {item.title && (
            <h4 className="font-medium mb-1" style={{ color: template.colors.primary }}>
              {item.title}
            </h4>
          )}
          {item.description && (
            <p className="text-gray-700">{item.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
