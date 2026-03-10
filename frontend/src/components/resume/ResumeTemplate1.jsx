/**
 * Resume Template 1 - Classic ATS-Friendly
 * Clean, simple, no tables, no icons
 */

import React from 'react';

const ResumeTemplate1 = ({ student }) => {
  // Parse project data
  const projects = (student.projects || []).map(project => {
    let techStack = [];
    let aiBullets = [];
    let skillsExtracted = [];
    
    try {
      techStack = project.technologies ? (typeof project.technologies === 'string' ? JSON.parse(project.technologies) : project.technologies) : [];
      aiBullets = project.ai_bullets ? (typeof project.ai_bullets === 'string' ? JSON.parse(project.ai_bullets) : project.ai_bullets) : [];
      skillsExtracted = project.skills_extracted ? (typeof project.skills_extracted === 'string' ? JSON.parse(project.skills_extracted) : project.skills_extracted) : [];
    } catch (e) {
      // Keep empty arrays on parse error
    }
    
    return {
      ...project,
      techStack,
      aiBullets,
      skillsExtracted
    };
  });

  // Parse skills
  const skills = (student.skills || []).map(s => s.skillName || s);

  // Parse experience
  const experiences = student.experiences || [];

  // Parse education
  const education = student.education || [];

  const formatCgpa = (v) => {
    if (v == null || v === '') return '';
    const n = parseFloat(String(v).trim().replace(/,/g, ''));
    return Number.isNaN(n) ? String(v) : n.toFixed(1);
  };

  const renderExperienceDescription = (text) => {
    if (!text || !text.trim()) return null;
    if (text.includes('\n')) {
      const lines = text.split(/\n+/).filter(Boolean);
      return (
        <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
          {lines.map((line, i) => (
            <li key={i} style={{ marginBottom: '3px' }}>{line.trim()}</li>
          ))}
        </ul>
      );
    }
    return <p style={{ margin: '5px 0 0 0', textAlign: 'justify' }}>{text}</p>;
  };

  const sectionHeadingStyle = {
    fontSize: '14pt',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
    textTransform: 'uppercase',
  };
  const sectionLineStyle = {
    width: '100%',
    minWidth: '100%',
    borderBottom: '1px solid #000',
    marginBottom: '8px',
    boxSizing: 'border-box',
  };

  return (
    <div className="resume-template-1" style={{ 
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11pt',
      lineHeight: '1.4',
      color: '#000',
      width: '100%',
      maxWidth: '8.5in',
      margin: '0 auto',
      padding: '0.5in',
      backgroundColor: '#fff',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', width: '100%' }}>
        <div style={{ width: '100%', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
        <h1 style={{ 
          fontSize: '24pt', 
          fontWeight: 'bold', 
          margin: '0 0 5px 0',
          textTransform: 'uppercase'
        }}>
          {student.fullName || student.name || 'Your Name'}
        </h1>
        <div style={{ fontSize: '10pt' }}>
          {student.email && <span>{student.email}</span>}
          {student.phone && <span style={{ marginLeft: '15px' }}>{student.phone}</span>}
          {student.linkedin && <span style={{ marginLeft: '15px' }}>{student.linkedin}</span>}
          {student.githubUrl && <span style={{ marginLeft: '15px' }}>{student.githubUrl}</span>}
        </div>
        </div>
      </div>

      {/* Summary */}
      {student.summary && (
        <div style={{ marginBottom: '15px', width: '100%' }}>
          <h2 style={sectionHeadingStyle}>Summary</h2>
          <div style={sectionLineStyle} />
          <p style={{ margin: 0, textAlign: 'justify' }}>
            {student.summary}
          </p>
        </div>
      )}

      {/* Experience - ATS order: before Education and Skills */}
      {experiences.length > 0 && (
        <div style={{ marginBottom: '15px', width: '100%' }}>
          <h2 style={sectionHeadingStyle}>Experience</h2>
          <div style={sectionLineStyle} />
          {experiences.map((exp, idx) => (
            <div key={idx} style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>
                {exp.title} | {exp.company}
              </div>
              <div style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '5px' }}>
                {exp.start} - {exp.end || 'Present'}
              </div>
              {renderExperienceDescription(exp.description)}
            </div>
          ))}
        </div>
      )}

      {/* Education - ATS order: after Experience */}
      {education.length > 0 && (
        <div style={{ marginBottom: '15px', width: '100%' }}>
          <h2 style={sectionHeadingStyle}>Education</h2>
          <div style={sectionLineStyle} />
          {education.map((edu, idx) => (
            <div key={idx} style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>
                {edu.degree} | {edu.institution}
              </div>
              {edu.startYear && edu.endYear && (
                <div style={{ fontSize: '10pt', fontStyle: 'italic' }}>
                  {edu.startYear} - {edu.endYear}
                </div>
              )}
              {edu.cgpa && (
                <div style={{ fontSize: '10pt' }}>
                  CGPA: {formatCgpa(edu.cgpa)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills - ATS order: after Education; clear list for keyword matching */}
      {skills.length > 0 && (
        <div style={{ marginBottom: '15px', width: '100%' }}>
          <h2 style={sectionHeadingStyle}>Skills</h2>
          <div style={sectionLineStyle} />
          <p style={{ margin: 0 }}>
            {skills.join(', ')}
          </p>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div style={{ marginBottom: '15px', width: '100%' }}>
          <h2 style={sectionHeadingStyle}>Projects</h2>
          <div style={sectionLineStyle} />
          {projects.map((project, idx) => (
            <div key={idx} style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>
                {project.title}
              </div>
              {project.techStack && project.techStack.length > 0 && (
                <div style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '5px' }}>
                  Technologies: {project.techStack.join(', ')}
                </div>
              )}
              {project.ai_summary && (
                <p style={{ margin: '5px 0', textAlign: 'justify' }}>
                  {project.ai_summary}
                </p>
              )}
              {project.aiBullets && project.aiBullets.length > 0 && (
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {project.aiBullets.map((bullet, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: '3px' }}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
              {project.description && !project.ai_summary && (
                <p style={{ margin: '5px 0', textAlign: 'justify' }}>
                  {project.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Achievements */}
      {student.achievements && student.achievements.length > 0 && (
        <div style={{ marginBottom: '15px', width: '100%' }}>
          <h2 style={sectionHeadingStyle}>Achievements</h2>
          <div style={sectionLineStyle} />
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {student.achievements.map((ach, idx) => (
              <li key={idx} style={{ marginBottom: '5px' }}>
                {ach.title || ach}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResumeTemplate1;

