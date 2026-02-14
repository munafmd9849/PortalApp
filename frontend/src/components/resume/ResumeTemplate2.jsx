/**
 * Resume Template 2 - Modern ATS-Friendly
 * Clean layout with better spacing
 */

import React from 'react';

const ResumeTemplate2 = ({ student }) => {
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

  return (
    <div className="resume-template-2" style={{ 
      fontFamily: 'Georgia, serif',
      fontSize: '11pt',
      lineHeight: '1.5',
      color: '#000',
      width: '100%',
      maxWidth: '8.5in',
      margin: '0 auto',
      padding: '0.6in',
      backgroundColor: '#fff',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '25px', textAlign: 'center', borderBottom: '3px solid #333', paddingBottom: '15px' }}>
        <h1 style={{ 
          fontSize: '28pt', 
          fontWeight: 'bold', 
          margin: '0 0 10px 0',
          letterSpacing: '1px'
        }}>
          {student.fullName || student.name || 'Your Name'}
        </h1>
        <div style={{ fontSize: '10pt', lineHeight: '1.8' }}>
          {student.email && <span>{student.email}</span>}
          {student.phone && <span style={{ margin: '0 10px' }}>|</span>}
          {student.phone && <span>{student.phone}</span>}
          {student.linkedin && <span style={{ margin: '0 10px' }}>|</span>}
          {student.linkedin && <span>{student.linkedin}</span>}
          {student.githubUrl && <span style={{ margin: '0 10px' }}>|</span>}
          {student.githubUrl && <span>{student.githubUrl}</span>}
        </div>
      </div>

      {/* Summary */}
      {student.summary && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '13pt', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Professional Summary
          </h2>
          <p style={{ margin: 0, textAlign: 'justify', paddingLeft: '10px' }}>
            {student.summary}
          </p>
        </div>
      )}

      {/* Experience - ATS order: before Education and Skills */}
      {experiences.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '13pt', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Professional Experience
          </h2>
          {experiences.map((exp, idx) => (
            <div key={idx} style={{ marginBottom: '15px', paddingLeft: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '3px' }}>
                {exp.title}
              </div>
              <div style={{ fontSize: '11pt', marginBottom: '3px' }}>
                {exp.company}
              </div>
              <div style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '8px', color: '#555' }}>
                {exp.start} - {exp.end || 'Present'}
              </div>
              {exp.description && (
                exp.description.includes('\n') ? (
                  <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                    {exp.description.split(/\n+/).filter(Boolean).map((line, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{line.trim()}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: '5px 0 0 0', textAlign: 'justify' }}>
                    {exp.description}
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education - ATS order: after Experience */}
      {education.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '13pt', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Education
          </h2>
          {education.map((edu, idx) => (
            <div key={idx} style={{ marginBottom: '12px', paddingLeft: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>
                {edu.degree}
              </div>
              <div style={{ fontSize: '11pt', marginBottom: '3px' }}>
                {edu.institution}
              </div>
              {edu.startYear && edu.endYear && (
                <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#555' }}>
                  {edu.startYear} - {edu.endYear}
                  {edu.cgpa && ` • CGPA: ${formatCgpa(edu.cgpa)}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills - ATS order: after Education */}
      {skills.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '13pt', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Technical Skills
          </h2>
          <div style={{ paddingLeft: '10px' }}>
            {skills.join(' • ')}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '13pt', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Key Projects
          </h2>
          {projects.map((project, idx) => (
            <div key={idx} style={{ marginBottom: '15px', paddingLeft: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '3px' }}>
                {project.title}
              </div>
              {project.techStack && project.techStack.length > 0 && (
                <div style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '5px', color: '#555' }}>
                  {project.techStack.join(', ')}
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
                    <li key={bIdx} style={{ marginBottom: '4px' }}>
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
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '13pt', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Achievements
          </h2>
          <ul style={{ margin: 0, paddingLeft: '30px' }}>
            {student.achievements.map((ach, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>
                {ach.title || ach}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResumeTemplate2;

