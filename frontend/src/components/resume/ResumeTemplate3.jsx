/**
 * Resume Template 3 - Compact ATS-Friendly
 * Space-efficient, single column
 */

import React from 'react';

const ResumeTemplate3 = ({ student }) => {
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
    <div className="resume-template-3" style={{ 
      fontFamily: 'Calibri, Arial, sans-serif',
      fontSize: '10pt',
      lineHeight: '1.3',
      color: '#000',
      width: '100%',
      maxWidth: '8.5in',
      margin: '0 auto',
      padding: '0.4in',
      backgroundColor: '#fff',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '15px' }}>
        <h1 style={{ 
          fontSize: '22pt', 
          fontWeight: 'bold', 
          margin: '0 0 8px 0'
        }}>
          {student.fullName || student.name || 'Your Name'}
        </h1>
        <div style={{ fontSize: '9pt' }}>
          {student.email && <span>{student.email}</span>}
          {student.phone && <span style={{ marginLeft: '12px' }}>{student.phone}</span>}
          {student.linkedin && <span style={{ marginLeft: '12px' }}>{student.linkedin}</span>}
          {student.githubUrl && <span style={{ marginLeft: '12px' }}>{student.githubUrl}</span>}
        </div>
      </div>

      {/* Summary */}
      {student.summary && (
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ 
            fontSize: '12pt', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            textTransform: 'uppercase'
          }}>
            Summary
          </h2>
          <p style={{ margin: 0, fontSize: '10pt' }}>
            {student.summary}
          </p>
        </div>
      )}

      {/* Experience - ATS order: before Education and Skills */}
      {experiences.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ 
            fontSize: '12pt', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            textTransform: 'uppercase'
          }}>
            Experience
          </h2>
          {experiences.map((exp, idx) => (
            <div key={idx} style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>
                {exp.title}, {exp.company}
              </div>
              <div style={{ fontSize: '9pt', fontStyle: 'italic', marginBottom: '3px' }}>
                {exp.start} - {exp.end || 'Present'}
              </div>
              {exp.description && (
                exp.description.includes('\n') ? (
                  <ul style={{ margin: '3px 0 0 0', paddingLeft: '18px', fontSize: '10pt' }}>
                    {exp.description.split(/\n+/).filter(Boolean).map((line, i) => (
                      <li key={i} style={{ marginBottom: '2px' }}>{line.trim()}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: '3px 0 0 0', fontSize: '10pt' }}>
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
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ 
            fontSize: '12pt', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            textTransform: 'uppercase'
          }}>
            Education
          </h2>
          {education.map((edu, idx) => (
            <div key={idx} style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>
                {edu.degree}, {edu.institution}
              </div>
              {edu.startYear && edu.endYear && (
                <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>
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
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ 
            fontSize: '12pt', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            textTransform: 'uppercase'
          }}>
            Skills
          </h2>
          <p style={{ margin: 0, fontSize: '10pt' }}>
            {skills.join(', ')}
          </p>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ 
            fontSize: '12pt', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            textTransform: 'uppercase'
          }}>
            Projects
          </h2>
          {projects.map((project, idx) => (
            <div key={idx} style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>
                {project.title}
                {project.techStack && project.techStack.length > 0 && (
                  <span style={{ fontWeight: 'normal', fontSize: '9pt', fontStyle: 'italic', marginLeft: '8px' }}>
                    ({project.techStack.join(', ')})
                  </span>
                )}
              </div>
              {project.ai_summary && (
                <p style={{ margin: '3px 0', fontSize: '10pt' }}>
                  {project.ai_summary}
                </p>
              )}
              {project.aiBullets && project.aiBullets.length > 0 && (
                <ul style={{ margin: '3px 0', paddingLeft: '18px', fontSize: '10pt' }}>
                  {project.aiBullets.map((bullet, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: '2px' }}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
              {project.description && !project.ai_summary && (
                <p style={{ margin: '3px 0', fontSize: '10pt' }}>
                  {project.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Achievements */}
      {student.achievements && student.achievements.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ 
            fontSize: '12pt', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            textTransform: 'uppercase'
          }}>
            Achievements
          </h2>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '10pt' }}>
            {student.achievements.map((ach, idx) => (
              <li key={idx} style={{ marginBottom: '3px' }}>
                {ach.title || ach}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResumeTemplate3;

