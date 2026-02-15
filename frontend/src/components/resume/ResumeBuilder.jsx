/**
 * Resume Builder Component - All-in-One
 * Complete interface for entering details, previewing, and exporting resumes
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getStudentProfile, updateStudentProfile } from '../../services/students';
import { 
  addOrUpdateSkillArray, 
  deleteSkillArray,
  addEducationArray,
  updateEducationArray,
  deleteEducationArray,
  addProjectArray,
  updateProjectArray,
  deleteProjectArray,
  generateProjectContent
} from '../../services/students';
import api from '../../services/api';
import { API_BASE_URL } from '../../config/api';
import ResumeTemplate1 from './ResumeTemplate1';
import ResumeTemplate2 from './ResumeTemplate2';
import ResumeTemplate3 from './ResumeTemplate3';
import { 
  FileText, 
  Download, 
  Eye, 
  CheckCircle2,
  Sparkles,
  Layout,
  Loader,
  Info,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  User,
  GraduationCap,
  Briefcase,
  Code,
  FolderKanban,
  Trophy,
  Save,
  RefreshCw,
  Upload,
  BarChart3,
  X,
  FileX,
  Mail,
  Phone,
  Linkedin,
  Github,
  Youtube,
  MapPin,
  Building2,
  Users,
  Award,
  Hash,
  Calendar,
  Globe,
  Type
} from 'lucide-react';
import { validateResumeFile, formatFileSize, checkATSScore } from '../../utils/resumeUtils';
import ResumeAnalyzer from './ResumeAnalyzer';
import CustomDropdown from '../common/CustomDropdown';
import ErrorBoundary from '../common/ErrorBoundary';

/** Build plain-text resume from student data for ATS analysis (no PDF extraction needed) */
function buildResumeTextForAnalysis(student) {
  if (!student) return '';
  const lines = [];
  lines.push(student.fullName || student.name || '');
  if (student.email) lines.push(student.email);
  if (student.phone) lines.push(student.phone);
  if (student.linkedin) lines.push(student.linkedin);
  if (student.githubUrl) lines.push(student.githubUrl);
  if (student.summary) lines.push('\nSummary\n' + student.summary);
  const education = student.education || [];
  if (education.length > 0) {
    lines.push('\nEducation');
    education.forEach(edu => {
      lines.push(`${edu.degree || ''} | ${edu.institution || ''}`);
      if (edu.startYear || edu.endYear) lines.push(`${edu.startYear || ''} - ${edu.endYear || ''}`);
      if (edu.cgpa) lines.push(`CGPA: ${typeof edu.cgpa === 'number' ? edu.cgpa.toFixed(1) : edu.cgpa}`);
    });
  }
  const experiences = student.experiences || [];
  if (experiences.length > 0) {
    lines.push('\nExperience');
    experiences.forEach(exp => {
      lines.push(`${exp.title || ''} | ${exp.company || ''}`);
      if (exp.start || exp.end) lines.push(`${exp.start || ''} - ${exp.end || 'Present'}`);
      if (exp.description) lines.push(exp.description);
    });
  }
  const skills = student.skills || [];
  if (skills.length > 0) {
    lines.push('\nSkills');
    const names = skills.map(s => (typeof s === 'string' ? s : s.skillName || '')).filter(Boolean);
    lines.push(names.join(', '));
  }
  const projects = student.projects || [];
  if (projects.length > 0) {
    lines.push('\nProjects');
    projects.forEach(p => {
      lines.push(p.title || '');
      if (p.technologies) {
        const tech = typeof p.technologies === 'string' ? p.technologies : (Array.isArray(p.technologies) ? p.technologies.join(', ') : '');
        if (tech) lines.push('Technologies: ' + tech);
      }
      if (p.ai_summary) lines.push(p.ai_summary);
      else if (p.description) lines.push(p.description);
    });
  }
  const achievements = student.achievements || [];
  if (achievements.length > 0) {
    lines.push('\nAchievements');
    achievements.forEach(a => lines.push(typeof a === 'string' ? a : (a.title || '')));
  }
  return lines.join('\n').trim();
}

const ResumeBuilder = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('1');
  const [activeMode, setActiveMode] = useState('buildResume'); // 'buildResume', 'uploadResume', 'atsFriendly'
  const [activeSection, setActiveSection] = useState('personal'); // Only for buildResume mode
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generatingAndSaving, setGeneratingAndSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    summary: '',
    linkedin: '',
    githubUrl: ''
  });

  const [editingEducation, setEditingEducation] = useState(null);
  const [newEducation, setNewEducation] = useState({ degree: '', institution: '', startYear: '', endYear: '', cgpa: '' });
  
  const [editingExperience, setEditingExperience] = useState(null);
  const [newExperience, setNewExperience] = useState({ title: '', company: '', start: '', end: '', description: '' });
  
  const [newSkill, setNewSkill] = useState({ skillName: '', rating: 3 });
  
  const [editingProject, setEditingProject] = useState(null);
  const [newProject, setNewProject] = useState({ title: '', description: '', techStack: [], githubUrl: '', liveUrl: '' });
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(null);

  // Resume Upload states - support multiple resumes
  const [resumeFile, setResumeFile] = useState(null);
  const [resumes, setResumes] = useState([]); // Array of resume files
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [showResumesModal, setShowResumesModal] = useState(false);

  // Mobile layout: single column, section dropdown, sticky actions
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Load resumes
  const loadResumes = async () => {
    if (!user?.id) return;
    try {
      const data = await api.getResumes();
      setResumes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading resumes:', err);
      // Don't show error if endpoint doesn't exist yet (backward compatibility)
      if (err.status !== 404) {
        // Silently fail for now to avoid breaking the profile load
      }
    }
  };

  // Load student profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const profile = await getStudentProfile(user.id);
        setStudent(profile);
        
        // Initialize form with existing data
        if (profile) {
          setPersonalInfo({
            fullName: profile.fullName || '',
            email: profile.email || '',
            phone: profile.phone || '',
            summary: profile.summary || '',
            linkedin: profile.linkedin || '',
            githubUrl: profile.githubUrl || ''
          });

          // Load resumes (don't fail profile load if this fails)
          try {
            await loadResumes();
          } catch (resumeErr) {
            console.error('Error loading resumes:', resumeErr);
            // Don't show error - just log it
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  // Auto-generate AI content for projects
  useEffect(() => {
    if (newProject.title && newProject.description && editingProject === null) {
      const timer = setTimeout(async () => {
        try {
          setGeneratingAI(true);
          const generated = await generateProjectContent({
            title: newProject.title,
            description: newProject.description,
            techStack: newProject.techStack || []
          });
          setAiGenerated(generated);
        } catch (err) {
          console.error('AI generation error:', err);
        } finally {
          setGeneratingAI(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [newProject.title, newProject.description, newProject.techStack]);

  // Save personal info
  const handleSavePersonal = async () => {
    try {
      setSaving(true);
      setError('');
      await updateStudentProfile(user.id, personalInfo);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setSuccess('Personal information saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save. Please try again.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Education CRUD
  const handleAddEducation = async () => {
    if (!newEducation.degree || !newEducation.institution) {
      setError('Please fill in qualification/education type and institution.');
      setTimeout(() => setError(''), 4000);
      return;
    }
    try {
      setSaving(true);
      // Convert string inputs to proper types for backend
      const educationData = {
        degree: newEducation.degree.trim(),
        institution: newEducation.institution.trim(),
        startYear: newEducation.startYear ? parseInt(newEducation.startYear, 10) : null,
        endYear: newEducation.endYear ? parseInt(newEducation.endYear, 10) : null,
        // Preserve CGPA as string to avoid floating point rounding
        // Backend will validate and convert to Decimal
        cgpa: newEducation.cgpa ? (() => {
          const cgpaStr = String(newEducation.cgpa).trim();
          // Ensure it has 2 decimal places
          if (cgpaStr.includes('.')) {
            const parts = cgpaStr.split('.');
            return parts[0] + '.' + (parts[1] || '').padEnd(2, '0').substring(0, 2);
          }
          return cgpaStr + '.00';
        })() : null,
      };
      await addEducationArray(user.id, educationData);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setNewEducation({ degree: '', institution: '', startYear: '', endYear: '', cgpa: '' });
      setSuccess('Education added!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Add education error:', err);
      setError(err.message || 'Failed to add education.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEducation = async (eduId) => {
    try {
      setSaving(true);
      // Convert string inputs to proper types for backend
      const educationData = {
        degree: editingEducation.degree.trim(),
        institution: editingEducation.institution.trim(),
        startYear: editingEducation.startYear ? parseInt(editingEducation.startYear, 10) : null,
        endYear: editingEducation.endYear ? parseInt(editingEducation.endYear, 10) : null,
        // Preserve CGPA as string to avoid floating point rounding
        // Backend will validate and convert to Decimal
        cgpa: editingEducation.cgpa ? (() => {
          const cgpaStr = String(editingEducation.cgpa).trim();
          // Ensure it has 2 decimal places
          if (cgpaStr.includes('.')) {
            const parts = cgpaStr.split('.');
            return parts[0] + '.' + (parts[1] || '').padEnd(2, '0').substring(0, 2);
          }
          return cgpaStr + '.00';
        })() : null,
      };
      await updateEducationArray(user.id, eduId, educationData);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setEditingEducation(null);
      setSuccess('Education updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Update education error:', err);
      setError(err.message || 'Failed to update education.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEducation = async (eduId) => {
    if (!window.confirm('Delete this education entry?')) return;
    try {
      setSaving(true);
      await deleteEducationArray(user.id, eduId);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setSuccess('Education deleted!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete education.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Experience CRUD
  const handleAddExperience = async () => {
    if (!newExperience.title || !newExperience.company) {
      setError('Please fill in title and company.');
      setTimeout(() => setError(''), 4000);
      return;
    }
    try {
      setSaving(true);
      // Clean and format experience data
      const experienceData = {
        title: newExperience.title.trim(),
        company: newExperience.company.trim(),
        start: newExperience.start.trim() || null,
        end: newExperience.end.trim() || null,
        description: newExperience.description.trim() || null,
      };
      await api.addExperience(experienceData);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setNewExperience({ title: '', company: '', start: '', end: '', description: '' });
      setSuccess('Experience added!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Add experience error:', err);
      setError(err.message || 'Failed to add experience.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExperience = async (expId) => {
    try {
      setSaving(true);
      // Clean and format experience data
      const experienceData = {
        title: editingExperience.title.trim(),
        company: editingExperience.company.trim(),
        start: editingExperience.start.trim() || null,
        end: editingExperience.end.trim() || null,
        description: editingExperience.description.trim() || null,
      };
      await api.updateExperience(expId, experienceData);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setEditingExperience(null);
      setSuccess('Experience updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Update experience error:', err);
      setError(err.message || 'Failed to update experience.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExperience = async (expId) => {
    if (!window.confirm('Delete this experience?')) return;
    try {
      setSaving(true);
      await api.deleteExperience(expId);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setSuccess('Experience deleted!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete experience error:', err);
      setError(err.message || 'Failed to delete experience.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Skills CRUD
  const handleAddSkill = async () => {
    if (!newSkill.skillName.trim()) {
      setError('Please enter a skill name.');
      setTimeout(() => setError(''), 4000);
      return;
    }
    try {
      setSaving(true);
      await addOrUpdateSkillArray(user.id, newSkill);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setNewSkill({ skillName: '', rating: 3 });
      setSuccess('Skill added!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add skill.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (skillId) => {
    try {
      setSaving(true);
      await deleteSkillArray(user.id, skillId);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setSuccess('Skill deleted!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete skill.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Projects CRUD
  const handleAddProject = async () => {
    if (!newProject.title || !newProject.description) {
      setError('Please fill in title and description.');
      setTimeout(() => setError(''), 4000);
      return;
    }
    try {
      setSaving(true);
      const projectData = {
        title: newProject.title,
        description: newProject.description,
        technologies: JSON.stringify(newProject.techStack || []),
        githubUrl: newProject.githubUrl || '',
        liveUrl: newProject.liveUrl || ''
      };
      
      if (aiGenerated) {
        projectData.ai_summary = aiGenerated.summary;
        projectData.ai_bullets = JSON.stringify(aiGenerated.bullets || []);
        projectData.skills_extracted = JSON.stringify(aiGenerated.skills || []);
      }
      
      await addProjectArray(user.id, projectData);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setNewProject({ title: '', description: '', techStack: [], githubUrl: '', liveUrl: '' });
      setAiGenerated(null);
      setSuccess('Project added with AI content!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add project.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProject = async (projectId) => {
    try {
      setSaving(true);
      const projectData = {
        title: editingProject.title,
        description: editingProject.description,
        technologies: JSON.stringify(editingProject.techStack || []),
        githubUrl: editingProject.githubUrl || '',
        liveUrl: editingProject.liveUrl || ''
      };
      
      if (aiGenerated) {
        projectData.ai_summary = aiGenerated.summary;
        projectData.ai_bullets = JSON.stringify(aiGenerated.bullets || []);
        projectData.skills_extracted = JSON.stringify(aiGenerated.skills || []);
      }
      
      await updateProjectArray(user.id, projectId, projectData);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setEditingProject(null);
      setAiGenerated(null);
      setSuccess('Project updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update project.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      setSaving(true);
      await deleteProjectArray(user.id, projectId);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      setSuccess('Project deleted!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete project.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Refresh profile
  const handleRefresh = async () => {
    try {
      setLoading(true);
      const profile = await getStudentProfile(user.id);
      setStudent(profile);
      
      // Reload resumes (don't fail refresh if this fails)
      try {
        await loadResumes();
      } catch (resumeErr) {
        console.error('Error loading resumes:', resumeErr);
        // Don't show error - just log it
      }
      
      setSuccess('Profile refreshed!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Refresh error:', err);
      setError('Failed to refresh.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileSelect = (file) => {
    if (!file) return;

    const validation = validateResumeFile(file);
    if (!validation.valid) {
      setError(validation.errors[0] || 'Invalid file');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setResumeFile(file);
    setError('');
  };

  const handleFileUpload = async () => {
    if (!resumeFile || !user?.id) {
      setError('Please select a file to upload');
      setTimeout(() => setError(''), 4000);
      return;
    }

    // Validate file before upload
    const validation = validateResumeFile(resumeFile);
    if (!validation.valid) {
      setError(validation.errors[0] || 'Invalid file. Please select a PDF file under 10MB.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      // Pass undefined for title (optional) and progress callback
      const result = await api.uploadResume(resumeFile, undefined, (progress) => {
        setUploadProgress(progress);
      });

      // Reload resumes list
      await loadResumes();

      setSuccess('Resume uploaded successfully!');
      setResumeFile(null);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      let errorMessage = 'Failed to upload resume. Please try again.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 400) {
        errorMessage = 'Bad Request: Please ensure the file is a valid PDF under 5MB.';
      }
      
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteResume = async (resumeId) => {
    try {
      setSaving(true);
      await api.deleteResume(resumeId);
      
      // Reload resumes list
      await loadResumes();
      
      setSuccess('Resume deleted!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete resume.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleViewResume = async (resume) => {
    try {
      const result = await api.getStudentResumeViewUrl(resume.id);
      const path = result?.url ?? result?.data?.url;
      if (path) {
        const base = API_BASE_URL.replace(/\/api\/?$/, '');
        const viewUrl = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
        window.open(viewUrl, '_blank');
      }
    } catch (_) {
      setError('Could not open resume. Try downloading instead.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Save all resume data
  const handleSaveAll = async () => {
    if (!user?.id) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Save personal info
      await updateStudentProfile(user.id, personalInfo);
      
      // Reload profile to get latest data
      const profile = await getStudentProfile(user.id);
      if (profile) {
        setStudent(profile);
      }

      setSuccess('All resume data saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Save all error:', err);
      setError('Failed to save. Please try again.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Generate PDF and auto-upload to resume manager
  // Uses html2pdf so the generated PDF looks exactly like the preview (same layout, colors, spacing)
  const handleGeneratePDFAndSave = async () => {
    if (!user?.id) return;
    try {
      setGeneratingAndSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }

      const html2pdf = (await import('html2pdf.js')).default;
      const previewWrapper = document.getElementById('resume-preview');
      if (!previewWrapper) {
        throw new Error('Resume preview element not found. Please go to Preview section first.');
      }
      // Use the inner template element so PDF captures full-width lines without scale wrapper
      const element = previewWrapper.querySelector('.resume-template-1') || previewWrapper.querySelector('[class*="resume-template"]') || previewWrapper;

      const opt = {
        margin: 0.5,
        filename: `Resume_${student?.fullName || user.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };

      const pdfBlob = await new Promise((resolve, reject) => {
        html2pdf()
          .set(opt)
          .from(element)
          .outputPdf('blob')
          .then((blob) => {
            if (!blob || blob.size === 0) {
              reject(new Error('Generated PDF is empty. Please check your resume content.'));
              return;
            }
            resolve(blob);
          })
          .catch((err) => {
            console.error('PDF generation error:', err);
            reject(new Error('Failed to generate PDF. Please try again.'));
          });
      });
      
      console.log('✅ PDF blob generated:', { size: pdfBlob.size, type: pdfBlob.type });
      
      // Validate blob
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Generated PDF is empty. Please check your resume content.');
      }
      
      // Create a File object from the blob
      const pdfFile = new File(
        [pdfBlob], 
        `Resume_${student?.fullName || user.id}_${Date.now()}.pdf`,
        { type: 'application/pdf' }
      );
      
      console.log('✅ PDF file created:', { name: pdfFile.name, size: pdfFile.size, type: pdfFile.type });

      // Upload to resume manager
      setSuccess('Uploading resume...');
      const resumeTitle = `Resume - ${student?.fullName || 'My Resume'}`;
      
      console.log('📤 Uploading resume:', {
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        fileType: pdfFile.type,
        title: resumeTitle
      });
      
      // Check file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (pdfFile.size > maxSize) {
        throw new Error(`File size (${(pdfFile.size / 1024 / 1024).toFixed(2)}MB) exceeds the 5MB limit. Please reduce the content.`);
      }
      
      await api.uploadResume(pdfFile, resumeTitle, (progress) => {
        console.log('Upload progress:', progress);
      });

      setSuccess('Resume generated and saved successfully! You can now use it when applying to jobs.');
      setTimeout(() => setSuccess(''), 5000);

    } catch (err) {
      console.error('❌ Generate and save PDF error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to generate and save PDF. Please try again.';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setGeneratingAndSaving(false);
    }
  };

  // Export PDF (download only)
  const handleExportPDF = async () => {
    if (!user?.id) return;
    try {
      setExporting(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }

      // Try backend PDF generation first
      try {
        // For PDF generation, we need to handle blob response, so use direct fetch
        // but still use API_BASE_URL from config
        const { API_BASE_URL } = await import('../../config/api');
        const response = await fetch(`${API_BASE_URL}/students/generate-resume-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({ templateId: selectedTemplate })
        });

        // If backend returns PDF successfully
        if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `RESUME_${user.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          setSuccess('Resume exported successfully!');
          setTimeout(() => setSuccess(''), 3000);
          return;
        }

        // If backend returns error with fallback flag, use frontend fallback
        if (response.status === 503) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.fallback === 'frontend') {
            console.log('Backend PDF generation not available, using frontend fallback...');
            // Fall through to frontend fallback
          } else {
            throw new Error(errorData.message || 'Backend PDF generation failed');
          }
        } else if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
      } catch (backendError) {
        console.warn('Backend PDF generation failed, trying frontend fallback:', backendError);
        // Fall through to frontend fallback
      }

      // Frontend fallback using html2pdf so the downloaded PDF matches the preview
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        const previewWrapper = document.getElementById('resume-preview');
        if (!previewWrapper) throw new Error('Resume preview element not found');
        const element = previewWrapper.querySelector('.resume-template-1') || previewWrapper.querySelector('[class*="resume-template"]') || previewWrapper;

        const opt = {
          margin: 0.5,
          filename: `Resume_${student?.fullName || user.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        };
        await html2pdf().set(opt).from(element).save();
        setSuccess('Resume exported successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (frontendError) {
        console.error('Frontend PDF export error:', frontendError);
        throw new Error('Failed to export PDF. Please try again.');
      }
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export PDF. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setExporting(false);
    }
  };

  const templates = [
    { id: '1', name: 'Classic', description: 'Traditional ATS-friendly format', icon: '📄' },
    { id: '2', name: 'Modern', description: 'Clean and professional layout', icon: '✨' },
    { id: '3', name: 'Compact', description: 'Space-efficient design', icon: '📋' }
  ];

  // Sections only for Build Resume mode
  const buildSections = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'skills', label: 'Skills', icon: Code },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'preview', label: 'Preview', icon: Eye }
  ];

  if (loading && !student) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const renderTemplate = () => {
    if (!student) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto mb-2" size={32} />
          <p>Complete your profile to see preview</p>
        </div>
      );
    }
    
    // Ensure student object has all required properties to prevent template errors
    const safeStudent = {
      ...student,
      fullName: student.fullName || '',
      email: student.email || '',
      phone: student.phone || '',
      enrollmentId: student.enrollmentId || '',
      headline: student.headline || student.Headline || '',
      bio: student.bio || '',
      summary: student.summary || '',
      city: student.city || '',
      stateRegion: student.stateRegion || student.state || '',
      linkedin: student.linkedin || '',
      githubUrl: student.githubUrl || student.github || '',
      skills: student.skills || [],
      education: student.education || [],
      experiences: student.experiences || [],
      projects: student.projects || [],
    };
    
    try {
      switch (selectedTemplate) {
        case '1': return <ResumeTemplate1 student={safeStudent} />;
        case '2': return <ResumeTemplate2 student={safeStudent} />;
        case '3': return <ResumeTemplate3 student={safeStudent} />;
        default: return <ResumeTemplate1 student={safeStudent} />;
      }
    } catch (error) {
      console.error('Error rendering resume template:', error);
      return (
        <div className="text-center py-8 text-red-500">
          <AlertTriangle className="mx-auto mb-2" size={24} />
          <p>Error rendering preview. Please try again.</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      );
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6">
      {/* Header - compact on mobile */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-xl font-bold flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
              <div className="bg-white/20 p-1.5 rounded-lg flex-shrink-0">
                <FileText size={isMobile ? 18 : 20} />
              </div>
              Resume Builder
            </h2>
            <p className={`text-blue-100 ml-0 sm:ml-9 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Build, upload, or analyze your resume
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              className="bg-white/20 hover:bg-white/30 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer font-medium shadow-md hover:shadow-lg text-xs sm:text-sm"
            >
              <RefreshCw size={isMobile ? 14 : 16} />
              Refresh
            </button>
            {!isMobile && (
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 shadow-md text-sm">
              <Sparkles size={16} className="animate-pulse" />
              <span className="font-semibold">AI-Powered</span>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle2 className="text-green-600" size={20} />
          <p className="text-green-800">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="text-red-600" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Main Mode Navigation - compact pill segment on mobile, full buttons on desktop */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-2 sm:p-3 shadow-sm">
        <div className="flex flex-wrap gap-1.5 sm:gap-3">
          <button
            onClick={() => {
              setActiveMode('buildResume');
              setActiveSection('personal');
            }}
            className={`flex-1 min-w-0 sm:min-w-[180px] flex items-center justify-center gap-1.5 sm:gap-3 px-2 sm:px-6 py-2.5 sm:py-4 rounded-lg sm:rounded-xl transition-all font-semibold cursor-pointer text-xs sm:text-base ${
              activeMode === 'buildResume'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-gray-200'
            }`}
          >
            <FileText size={isMobile ? 18 : 22} />
            <span>{isMobile ? 'Build' : 'Build Resume'}</span>
          </button>
          <button
            onClick={() => setActiveMode('uploadResume')}
            className={`flex-1 min-w-0 sm:min-w-[180px] flex items-center justify-center gap-1.5 sm:gap-3 px-2 sm:px-6 py-2.5 sm:py-4 rounded-lg sm:rounded-xl transition-all font-semibold cursor-pointer text-xs sm:text-base ${
              activeMode === 'uploadResume'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-gray-200'
            }`}
          >
            <Upload size={isMobile ? 18 : 22} />
            <span>{isMobile ? 'Upload' : 'Upload Resume'}</span>
          </button>
          <button
            onClick={() => setActiveMode('atsFriendly')}
            className={`flex-1 min-w-0 sm:min-w-[180px] flex items-center justify-center gap-1.5 sm:gap-3 px-2 sm:px-6 py-2.5 sm:py-4 rounded-lg sm:rounded-xl transition-all font-semibold cursor-pointer text-xs sm:text-base ${
              activeMode === 'atsFriendly'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-gray-200'
            }`}
          >
            <BarChart3 size={isMobile ? 18 : 22} />
            <span>{isMobile ? 'ATS' : 'ATS Friendly'}</span>
          </button>
        </div>
      </div>

      {/* Build Resume Mode - Section navigation: dropdown on mobile, tabs on desktop */}
      {activeMode === 'buildResume' && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-2 sm:p-3 shadow-sm overflow-x-auto">
          <div className="flex gap-2 items-center min-w-0">
            {/* Mobile: custom section dropdown */}
            {isMobile ? (
              <div className="flex-1 min-w-0">
                <CustomDropdown
                  options={buildSections.map((s) => ({ value: s.id, label: s.label }))}
                  value={activeSection}
                  onChange={(v) => setActiveSection(v)}
                  placeholder="Choose section"
                  icon={Layout}
                  iconColor="text-blue-600"
                />
              </div>
            ) : (
              <div className="flex gap-1.5 sm:gap-2 flex-1 min-w-0 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
                {buildSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg transition-all text-xs sm:text-sm font-medium cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-gray-200'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => {
                loadResumes();
                setShowResumesModal(true);
              }}
              className="flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium shadow-md hover:shadow-lg text-sm"
              title="View Saved Resumes"
            >
              <FileText size={18} />
              <span className="hidden sm:inline">View Saved Resumes</span>
              <span className="sm:hidden">Resumes</span>
              {resumes.length > 0 && (
                <span className="bg-white text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {resumes.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Build Resume Mode Content */}
      {activeMode === 'buildResume' && (
        <>
          {/* Mobile: show only form when editing, or only preview when on Preview section */}
          {/* Desktop: side-by-side form + live preview (or full preview section) */}
          {activeSection !== 'preview' && (
            <div className={`grid gap-4 sm:gap-6 min-w-0 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
              {/* Left Side - Form Section (on mobile this is the only column) */}
              <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-6 lg:p-8 shadow-sm min-w-0 overflow-x-hidden">
        {/* Personal Info */}
        {activeSection === 'personal' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <User size={24} className="text-blue-600" />
                </div>
                Personal Information
              </h3>
              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                <span className="text-red-500">*</span> Required fields
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">💡 Quick Tip:</p>
                  <p>Fill in your basic contact information. This will appear at the top of your resume.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <User size={16} className="text-gray-500" />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={personalInfo.fullName}
                  onChange={(e) => setPersonalInfo({...personalInfo, fullName: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Mail size={16} className="text-gray-500" />
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo({...personalInfo, email: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  placeholder="john.doe@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Phone size={16} className="text-gray-500" />
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Linkedin size={16} className="text-blue-600" />
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={personalInfo.linkedin}
                  onChange={(e) => setPersonalInfo({...personalInfo, linkedin: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Github size={16} className="text-gray-700" />
                  GitHub
                </label>
                <input
                  type="url"
                  value={personalInfo.githubUrl}
                  onChange={(e) => setPersonalInfo({...personalInfo, githubUrl: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  placeholder="https://github.com/yourusername"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-gray-500" />
                Professional Summary
              </label>
              <textarea
                value={personalInfo.summary}
                onChange={(e) => setPersonalInfo({...personalInfo, summary: e.target.value})}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all resize-none cursor-text"
                placeholder="Write a brief professional summary highlighting your key skills and experience (2-3 sentences recommended)"
              />
              <p className="text-xs text-gray-500 mt-1">This summary will appear at the top of your resume</p>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleSavePersonal}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold shadow-md hover:shadow-lg transition-all"
              >
                {saving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
                Save Personal Info
              </button>
            </div>
          </div>
        )}

        {/* Education */}
        {activeSection === 'education' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <GraduationCap size={24} className="text-purple-600" />
                </div>
                Education
              </h3>
              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                {student?.education?.length || 0} entries
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">💡 Quick Tip:</p>
                  <p>Add any type of education: Degree, Diploma, Certificate, High School, Training, Online Course, etc. Include your most recent and relevant qualifications first.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Plus size={20} className="text-blue-600" />
                Add New Education
              </h4>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Qualification/Education Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., B.Tech, Diploma, Certificate"
                    value={newEducation.degree}
                    onChange={(e) => setNewEducation({...newEducation, degree: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Institution <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="University or Institution name"
                    value={newEducation.institution}
                    onChange={(e) => setNewEducation({...newEducation, institution: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Year</label>
                  <input
                    type="number"
                    placeholder="YYYY"
                    value={newEducation.startYear}
                    onChange={(e) => setNewEducation({...newEducation, startYear: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Year</label>
                  <input
                    type="number"
                    placeholder="YYYY (leave empty if ongoing)"
                    value={newEducation.endYear}
                    onChange={(e) => setNewEducation({...newEducation, endYear: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 8.5"
                    value={newEducation.cgpa}
                    onChange={(e) => setNewEducation({...newEducation, cgpa: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleAddEducation}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <Plus size={18} />
                  Add Education
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {student?.education?.map((edu) => (
                editingEducation?.id === edu.id ? (
                  <div key={edu.id} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Qualification/Education Type <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., B.Tech, Diploma, Certificate"
                          value={editingEducation.degree}
                          onChange={(e) => setEditingEducation({...editingEducation, degree: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Institution <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Institution name"
                          value={editingEducation.institution}
                          onChange={(e) => setEditingEducation({...editingEducation, institution: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <input
                        type="number"
                        value={editingEducation.startYear}
                        onChange={(e) => setEditingEducation({...editingEducation, startYear: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg cursor-text"
                      />
                      <input
                        type="number"
                        value={editingEducation.endYear}
                        onChange={(e) => setEditingEducation({...editingEducation, endYear: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg cursor-text"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleUpdateEducation(edu.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 hover:shadow-md transition-all cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingEducation(null)}
                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 hover:shadow-md transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={edu.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{edu.degree} - {edu.institution}</h4>
                      <p className="text-sm text-gray-600">
                        {edu.startYear} - {edu.endYear || 'Present'} {edu.cgpa && `• CGPA: ${!Number.isNaN(parseFloat(String(edu.cgpa))) ? parseFloat(String(edu.cgpa)).toFixed(1) : edu.cgpa}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingEducation(edu)}
                        className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all cursor-pointer"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteEducation(edu.id)}
                        className="text-red-600 hover:text-red-800 hover:scale-110 transition-all cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {activeSection === 'experience' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Briefcase size={24} className="text-indigo-600" />
                </div>
                Work Experience
              </h3>
              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                {student?.experiences?.length || 0} entries
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">💡 Quick Tip:</p>
                  <p>List your work experience in reverse chronological order (most recent first). Include internships, part-time jobs, and relevant volunteer work.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" />
                Add New Experience
              </h4>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Software Engineer, Intern"
                    value={newExperience.title}
                    onChange={(e) => setNewExperience({...newExperience, title: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Company name"
                    value={newExperience.company}
                    onChange={(e) => setNewExperience({...newExperience, company: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                  <input
                    type="text"
                    placeholder="e.g., Jan 2023 or 2023"
                    value={newExperience.start}
                    onChange={(e) => setNewExperience({...newExperience, start: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                  <input
                    type="text"
                    placeholder="e.g., Dec 2024 or leave blank if current"
                    value={newExperience.end}
                    onChange={(e) => setNewExperience({...newExperience, end: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description</label>
                  <textarea
                    placeholder="Describe your responsibilities and achievements. Use bullet points or short paragraphs."
                    value={newExperience.description}
                    onChange={(e) => setNewExperience({...newExperience, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all resize-none cursor-text"
                  />
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleAddExperience}
                    disabled={saving}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus size={18} />
                    Add Experience
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {student?.experiences?.map((exp) => (
                editingExperience?.id === exp.id ? (
                  <div key={exp.id} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={editingExperience.title}
                          onChange={(e) => setEditingExperience({...editingExperience, title: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded-lg cursor-text"
                        />
                        <input
                          type="text"
                          value={editingExperience.company}
                          onChange={(e) => setEditingExperience({...editingExperience, company: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded-lg cursor-text"
                        />
                        <input
                          type="text"
                          value={editingExperience.start}
                          onChange={(e) => setEditingExperience({...editingExperience, start: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded-lg cursor-text"
                        />
                        <input
                          type="text"
                          value={editingExperience.end}
                          onChange={(e) => setEditingExperience({...editingExperience, end: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded-lg cursor-text"
                        />
                      </div>
                      <textarea
                        value={editingExperience.description}
                        onChange={(e) => setEditingExperience({...editingExperience, description: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleUpdateExperience(exp.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 hover:shadow-md transition-all cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingExperience(null)}
                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 hover:shadow-md transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={exp.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{exp.title} at {exp.company}</h4>
                      <p className="text-sm text-gray-600">{exp.start} - {exp.end || 'Present'}</p>
                      {exp.description && <p className="text-sm text-gray-700 mt-1">{exp.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingExperience(exp)}
                        className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all cursor-pointer"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteExperience(exp.id)}
                        className="text-red-600 hover:text-red-800 hover:scale-110 transition-all cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {activeSection === 'skills' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-teal-100 p-2 rounded-lg">
                  <Code size={24} className="text-teal-600" />
                </div>
                Skills
              </h3>
              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                {student?.skills?.length || 0} skills
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">💡 Quick Tip:</p>
                  <p>Add both technical and soft skills. Rate your proficiency level honestly. Include programming languages, frameworks, tools, and soft skills like communication or leadership.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-teal-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Plus size={20} className="text-teal-600" />
                Add New Skill
              </h4>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Skill Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., JavaScript, Python, Communication"
                    value={newSkill.skillName}
                    onChange={(e) => setNewSkill({...newSkill, skillName: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Proficiency</label>
                  <div className="relative">
                    <CustomDropdown
                      label=""
                      options={[
                        { value: 1, label: 'Beginner' },
                        { value: 2, label: 'Basic' },
                        { value: 3, label: 'Intermediate' },
                        { value: 4, label: 'Advanced' },
                        { value: 5, label: 'Expert' }
                      ]}
                      value={newSkill.rating}
                      onChange={(value) => setNewSkill({...newSkill, rating: parseInt(value)})}
                      placeholder="Select proficiency level"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddSkill}
                    disabled={saving}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus size={18} />
                    Add Skill
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {student?.skills?.map((skill) => (
                <div key={skill.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <span className="font-medium">{skill.skillName}</span>
                    <div className="text-xs text-gray-500">Rating: {skill.rating}/5</div>
                  </div>
                  <button
                    onClick={() => handleDeleteSkill(skill.id)}
                    className="text-red-600 hover:text-red-800 hover:scale-110 transition-all cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {activeSection === 'projects' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-pink-100 p-2 rounded-lg">
                  <FolderKanban size={24} className="text-pink-600" />
                </div>
                Projects {generatingAI && <Loader className="animate-spin text-blue-600" size={20} />}
              </h3>
              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                {student?.projects?.length || 0} projects
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">💡 Quick Tip:</p>
                  <p>Showcase your best projects with clear descriptions. Our AI can help enhance your project descriptions to make them more professional and impactful. Include links to GitHub and live demos when available.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-pink-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Plus size={20} className="text-pink-600" />
                Add New Project (AI-Enhanced)
              </h4>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., E-Commerce Platform, Task Management App"
                    value={newProject.title}
                    onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Briefly describe your project. AI will help enhance it with professional content."
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all resize-none cursor-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tech Stack</label>
                  <input
                    type="text"
                    placeholder="e.g., React, Node.js, MongoDB (comma-separated)"
                    value={newProject.techStack.join(', ')}
                    onChange={(e) => {
                      const techStack = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                      setNewProject({...newProject, techStack});
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                  />
                </div>
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">GitHub URL</label>
                    <input
                      type="url"
                      placeholder="https://github.com/username/project"
                      value={newProject.githubUrl}
                      onChange={(e) => setNewProject({...newProject, githubUrl: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Project URL</label>
                    <input
                      type="url"
                      placeholder="https://yourproject.com"
                      value={newProject.liveUrl}
                      onChange={(e) => setNewProject({...newProject, liveUrl: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-text"
                    />
                  </div>
                </div>
                {aiGenerated && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
                      <Sparkles size={18} className="text-green-600" />
                      AI-Generated Content:
                    </div>
                    <div className="text-sm text-gray-700 mb-2"><strong>Summary:</strong> {aiGenerated.summary}</div>
                    {aiGenerated.bullets && aiGenerated.bullets.length > 0 && (
                      <div className="text-sm text-gray-700">
                        <strong>Bullets:</strong>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          {aiGenerated.bullets.map((bullet, idx) => (
                            <li key={idx}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleAddProject}
                    disabled={saving || generatingAI}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus size={18} />
                    Add Project {generatingAI && '(Generating AI...)'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {student?.projects?.map((project) => {
                let techStack = [];
                try {
                  techStack = project.technologies ? (typeof project.technologies === 'string' ? JSON.parse(project.technologies) : project.technologies) : [];
                } catch (e) {}
                return (
                  <div key={project.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{project.title}</h4>
                        {techStack.length > 0 && (
                          <p className="text-sm text-gray-600">Tech: {techStack.join(', ')}</p>
                        )}
                        {project.ai_summary && (
                          <p className="text-sm text-gray-700 mt-1">{project.ai_summary}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingProject(project);
                            setNewProject({
                              title: project.title,
                              description: project.description || '',
                              techStack: techStack,
                              githubUrl: project.githubUrl || '',
                              liveUrl: project.liveUrl || ''
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all cursor-pointer"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-600 hover:text-red-800 hover:scale-110 transition-all cursor-pointer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
              </div>

              {/* Right Side - Live Preview (hidden on mobile: use section dropdown to open "Preview" for full-screen preview) */}
              {!isMobile && (
              <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-6 shadow-sm lg:sticky lg:top-6 lg:h-[95vh] flex flex-col min-h-[320px] lg:min-h-0 min-w-0">
                <div className="flex items-center justify-between mb-3 sm:mb-4 border-b border-gray-200 pb-3">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Eye size={18} className="text-blue-600 sm:w-5 sm:h-5" />
                    Live Preview
                  </h3>
                </div>
                {/* Template Selector for Live Preview */}
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layout size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-gray-700">Template</span>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`flex-1 min-w-0 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedTemplate === template.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                        title={template.description}
                      >
                        <span className="text-base sm:text-lg mb-0.5 sm:mb-1">{template.icon}</span>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-800 truncate w-full text-center">{template.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex-1 min-h-0 flex flex-col">
                  <div id="resume-preview-sidebar" className="bg-white shadow-lg w-full min-w-0 flex-1 overflow-auto">
                    <div className="p-3 sm:p-4 lg:p-6 max-w-full">
                      <ErrorBoundary>
                        {renderTemplate()}
                      </ErrorBoundary>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setActiveSection('preview')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline hover:scale-105 transition-all"
                  >
                    View Full Preview & Export →
                  </button>
                </div>
              </div>
              )}
            </div>
          )}

        {/* Full Preview Section (full-width on mobile with sticky bottom bar) */}
        {activeSection === 'preview' && (
          <div className={`space-y-6 ${isMobile ? 'pb-28' : ''}`}>
            {/* Template Selector - compact on mobile */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Layout size={18} className="text-blue-600 flex-shrink-0" />
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">Choose Template</h3>
              </div>
              <div className={`grid gap-2 sm:gap-4 ${isMobile ? 'grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all cursor-pointer text-center ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-500 hover:shadow-md'
                    }`}
                  >
                    <div className="text-xl sm:text-2xl mb-1 sm:mb-1.5">{template.icon}</div>
                    <div className="font-semibold text-xs sm:text-sm text-gray-800">{template.name}</div>
                    {!isMobile && <div className="text-xs text-gray-600 mt-1">{template.description}</div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-5 shadow-sm min-w-0 overflow-hidden">
              {/* Desktop: title + actions in header. Mobile: title only (actions in sticky bar) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-3 mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                  <div className="bg-green-100 p-1.5 rounded-lg flex-shrink-0">
                    <Eye size={18} className="text-green-600 sm:w-5 sm:h-5" />
                  </div>
                  Resume Preview
                </h3>
                {!isMobile && (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 bg-gray-600 text-white px-3 sm:px-5 py-2 sm:py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold shadow-md hover:shadow-lg transition-all text-sm sm:text-base"
                    title="Save all resume data"
                  >
                    {saving ? (
                      <>
                        <Loader className="animate-spin flex-shrink-0" size={18} />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} className="flex-shrink-0" />
                        <span>Save All</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGeneratePDFAndSave}
                    disabled={generatingAndSaving || exporting}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 bg-green-600 text-white px-3 sm:px-5 py-2 sm:py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold shadow-md hover:shadow-lg transition-all text-sm sm:text-base"
                    title="Generate PDF and save it to your resume manager for job applications"
                  >
                    {generatingAndSaving ? (
                      <>
                        <Loader className="animate-spin flex-shrink-0" size={18} />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={18} className="flex-shrink-0" />
                        <span>Generate & Save</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting || generatingAndSaving}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
                    title="Download PDF to your computer"
                  >
                    {exporting ? (
                      <>
                        <Loader className="animate-spin flex-shrink-0" size={18} />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download size={18} className="flex-shrink-0" />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>
                </div>
                )}
              </div>

              <div className="border-2 border-gray-300 rounded-lg overflow-x-auto overflow-y-hidden bg-gray-50 w-full max-w-full">
                <div id="resume-preview" className="bg-white shadow-2xl" style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }}>
                  <div className="p-4 sm:p-6 lg:p-8">
                    <ErrorBoundary>
                      {renderTemplate()}
                    </ErrorBoundary>
                  </div>
                </div>
              </div>

              {/* Mobile-only: sticky bottom action bar (Save, Generate, Download, Back) */}
              {isMobile && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg p-3 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('personal')}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 bg-gray-50 font-medium text-sm"
                  >
                    <Edit2 size={16} />
                    Back to edit
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                  >
                    {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                    Save
                  </button>
                  <button
                    onClick={handleGeneratePDFAndSave}
                    disabled={generatingAndSaving || exporting}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                  >
                    {generatingAndSaving ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                    Save PDF
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting || generatingAndSaving}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                  >
                    {exporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                    Download
                  </button>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mt-6">
                <div className="flex items-start gap-3">
                  <Info size={22} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-bold text-base mb-2">💡 Pro Tips:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li>All sections are ATS-friendly and optimized for job applications</li>
                      <li>AI-generated project content is automatically included in your resume</li>
                      <li>Update any section and see changes in real-time preview</li>
                      <li>Choose from multiple templates to find the best fit for your industry</li>
                      <li>Download as PDF when ready to apply for jobs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
      )}

      {/* Upload Resume Mode Content */}
      {activeMode === 'uploadResume' && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-5 shadow-sm min-w-0 overflow-x-hidden">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                <div className="bg-blue-100 p-1.5 rounded-lg flex-shrink-0">
                  <Upload size={18} className="text-blue-600 sm:w-5 sm:h-5" />
                </div>
                Upload Resume
              </h3>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">💡 Quick Tip:</p>
                  <p>Upload multiple resumes in PDF format. You can upload different versions of your resume (e.g., technical, non-technical, different industries) and manage them all in one place.</p>
                </div>
              </div>
            </div>
            
            {/* List of uploaded resumes */}
            {resumes.length > 0 && (
              <div className="space-y-3 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  Uploaded Resumes ({resumes.length})
                </h4>
                {resumes.map((resume) => (
                  <div key={resume.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-6 w-6 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{resume.fileName}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            {resume.fileSize && <span>{formatFileSize(resume.fileSize)}</span>}
                            {resume.fileSize && resume.uploadedAt && <span>•</span>}
                            {resume.uploadedAt && (
                              <span>Uploaded: {new Date(resume.uploadedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewResume(resume)}
                          className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all cursor-pointer text-sm font-medium"
                        >
                          <Eye size={16} />
                          View
                        </button>
                        <a
                          href={resume.fileUrl || resume.url}
                          download={resume.fileName || resume.title || 'resume.pdf'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all cursor-pointer text-sm font-medium"
                        >
                          <Download size={16} />
                          Download
                        </a>
                        <button
                          onClick={() => handleDeleteResume(resume.id)}
                          disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium shadow-md hover:shadow-lg transition-all text-sm"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload area - always visible */}
            <div
              className={`border-2 border-dashed rounded-xl p-12 transition-all ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                    : 'border-gray-300 bg-gradient-to-br from-gray-50 to-blue-50 hover:border-blue-500 hover:shadow-lg'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 transition-all ${
                    isDragging ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Upload className={`h-8 w-8 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    {isDragging ? 'Drop your resume here' : 'Upload Your Resume'}
                  </h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Drag and drop a PDF file here, or click to browse. You can upload multiple resumes.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Choose File
                  </button>
                  <p className="text-xs text-gray-500 mt-3">
                    Maximum file size: 10MB • PDF format only
                  </p>
                </div>
              </div>

            {resumeFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{resumeFile.name}</p>
                      <p className="text-sm text-gray-600">{formatFileSize(resumeFile.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setResumeFile(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
                  </div>
                )}
                <button
                  onClick={handleFileUpload}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Upload Resume
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">💡 Tips for Resume Upload:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Upload a PDF format resume for best compatibility</li>
                    <li>Ensure your resume is ATS-friendly (simple formatting, standard fonts)</li>
                    <li>Keep file size under 10MB</li>
                    <li>After uploading, use the ATS Friendly section to analyze your resume</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ATS Friendly Mode Content */}
      {activeMode === 'atsFriendly' && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-sm">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-orange-100 p-1.5 rounded-lg">
                  <BarChart3 size={20} className="text-orange-600" />
                </div>
                ATS Resume Analyzer
              </h3>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Info size={22} className="text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <p className="font-bold text-base mb-2">💡 What is ATS?</p>
                  <p className="mb-2">ATS (Applicant Tracking System) is software used by recruiters to filter resumes. Our analyzer checks your resume for:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Keyword optimization and relevance</li>
                    <li>Format compatibility and structure</li>
                    <li>Overall ATS-friendliness score</li>
                    <li>Suggestions for improvement</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-gray-600">
              Get detailed analysis of your uploaded resume including ATS compatibility, keyword matching, and improvement suggestions.
            </p>
            <ResumeAnalyzer 
              resumeInfo={resumes.length > 0 ? {
                hasResume: true,
                resumeUrl: resumes[0].fileUrl,
                fileName: resumes[0].fileName,
                uploadedAt: resumes[0].uploadedAt,
                resumeId: resumes[0].id
              } : {
                hasResume: false,
                resumeUrl: null,
                fileName: null,
                uploadedAt: null
              }} 
              resumes={resumes}
              userId={user?.id}
              builderResumeText={buildResumeTextForAnalysis(student)}
            />
          </div>
        </div>
      )}

      {/* View Saved Resumes Modal */}
      {showResumesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setShowResumesModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-w-full max-h-[90vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FileText size={24} className="text-blue-600" />
                </div>
                Saved Resumes ({resumes.length})
              </h3>
              <button
                onClick={() => setShowResumesModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              {resumes.length === 0 ? (
                <div className="text-center py-12">
                  <FileX size={64} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 text-lg mb-2">No resumes saved yet</p>
                  <p className="text-gray-500 text-sm mb-6">Upload a resume to get started</p>
                  <button
                    onClick={() => {
                      setShowResumesModal(false);
                      setActiveMode('uploadResume');
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Upload Resume
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-4 sm:p-6">
                  {resumes.map((resume) => (
                    <div key={resume.id} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 sm:p-5 hover:border-blue-300 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="bg-blue-100 p-3 rounded-lg flex-shrink-0">
                            <FileText size={24} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-lg mb-1 truncate">{resume.fileName || 'Resume'}</h4>
                            <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                              {resume.fileSize && (
                                <span className="flex items-center gap-1">
                                  <FileText size={14} />
                                  {formatFileSize(resume.fileSize)}
                                </span>
                              )}
                              {resume.uploadedAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  Uploaded: {new Date(resume.uploadedAt).toLocaleDateString()}
                                </span>
                              )}
                              {resume.isDefault && (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                  Default
                                </span>
                              )}
                            </div>
                            {resume.title && (
                              <p className="text-sm text-gray-700 mt-1">{resume.title}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:ml-4">
                          <button
                            type="button"
                            onClick={() => handleViewResume(resume)}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-md hover:shadow-lg text-sm"
                          >
                            <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />
                            View
                          </button>
                          <a
                            href={resume.fileUrl || resume.url}
                            download={resume.fileName || resume.title || 'resume.pdf'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-all font-medium shadow-md hover:shadow-lg text-sm"
                          >
                            <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                            Download
                          </a>
                          <button
                            onClick={async () => {
                              await handleDeleteResume(resume.id);
                              if (resumes.length === 1) {
                                setShowResumesModal(false);
                              }
                            }}
                            disabled={saving}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md hover:shadow-lg text-sm"
                          >
                            <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ResumeBuilder;
