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

const ResumeBuilder = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('1');
  const [activeMode, setActiveMode] = useState('buildResume'); // 'buildResume', 'uploadResume', 'atsFriendly'
  const [activeSection, setActiveSection] = useState('personal'); // Only for buildResume mode
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  // Resume Upload states
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeInfo, setResumeInfo] = useState({
    fileName: null,
    fileSize: null,
    uploadedAt: null,
    hasResume: false,
    resumeUrl: null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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

          // Load resume info if exists
          if (profile.resumeUrl || profile.resumeFileName) {
            setResumeInfo({
              fileName: profile.resumeFileName || null,
              fileSize: null,
              uploadedAt: profile.resumeUploadedAt || null,
              hasResume: true,
              resumeUrl: profile.resumeUrl || null
            });
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
        cgpa: newEducation.cgpa ? parseFloat(newEducation.cgpa) : null,
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
        cgpa: editingEducation.cgpa ? parseFloat(editingEducation.cgpa) : null,
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
      
      // Reload resume info
      if (profile.resumeUrl || profile.resumeFileName) {
        setResumeInfo({
          fileName: profile.resumeFileName || null,
          fileSize: null,
          uploadedAt: profile.resumeUploadedAt || null,
          hasResume: true,
          resumeUrl: profile.resumeUrl || null
        });
      }
      
      setSuccess('Profile refreshed!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
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

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const result = await api.uploadResume(resumeFile, (progress) => {
        setUploadProgress(progress);
      });

      // Update resume info
      setResumeInfo({
        fileName: result.fileName || resumeFile.name,
        fileSize: resumeFile.size,
        uploadedAt: result.uploadedAt || new Date().toISOString(),
        hasResume: true,
        resumeUrl: result.resumeUrl || null
      });

      // Reload profile to get updated resume info
      const profile = await getStudentProfile(user.id);
      setStudent(profile);

      setSuccess('Resume uploaded successfully!');
      setResumeFile(null);
      setUploadProgress(0);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload resume. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to delete your uploaded resume?')) return;
    
    try {
      setSaving(true);
      // TODO: Implement delete resume API call
      // await api.deleteResume();
      
      setResumeInfo({
        fileName: null,
        fileSize: null,
        uploadedAt: null,
        hasResume: false,
        resumeUrl: null
      });
      
      setResumeFile(null);
      setSuccess('Resume deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete resume.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
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

  // Export PDF
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
        const response = await fetch(`${API_BASE_URL}/students/generate-resume-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
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

      // Frontend fallback using html2pdf.js
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        const element = document.getElementById('resume-preview');
        
        if (!element) {
          throw new Error('Resume preview element not found');
        }

        const opt = {
          margin: 0.5,
          filename: `RESUME_${user.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(element).save();
        setSuccess('Resume exported successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (frontendError) {
        console.error('Frontend PDF export error:', frontendError);
        throw new Error('Failed to export PDF. Please ensure html2pdf.js is installed.');
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
    if (!student) return <div className="text-center py-8 text-gray-500">Complete your profile to see preview</div>;
    switch (selectedTemplate) {
      case '1': return <ResumeTemplate1 student={student} />;
      case '2': return <ResumeTemplate2 student={student} />;
      case '3': return <ResumeTemplate3 student={student} />;
      default: return <ResumeTemplate1 student={student} />;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText size={28} />
              Resume Builder
            </h2>
            <p className="text-blue-100 mt-1">
              Build, upload, or analyze your professional resume
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 flex items-center gap-2 transition"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <Sparkles size={20} />
              <span className="font-semibold">AI-Powered</span>
            </div>
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

      {/* Main Mode Navigation - Top 3 Options */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveMode('buildResume');
              setActiveSection('personal');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all font-medium ${
              activeMode === 'buildResume'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText size={20} />
            <span>Build Resume</span>
          </button>
          <button
            onClick={() => setActiveMode('uploadResume')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all font-medium ${
              activeMode === 'uploadResume'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Upload size={20} />
            <span>Upload Resume</span>
          </button>
          <button
            onClick={() => setActiveMode('atsFriendly')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all font-medium ${
              activeMode === 'atsFriendly'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 size={20} />
            <span>ATS Friendly</span>
          </button>
        </div>
      </div>

      {/* Build Resume Mode - Section Tabs */}
      {activeMode === 'buildResume' && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-2">
          <div className="flex flex-wrap gap-2">
            {buildSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Build Resume Mode Content */}
      {activeMode === 'buildResume' && (
        <>
          {/* Template Selector (shown in preview) */}
          {activeSection === 'preview' && (
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Layout size={20} className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-800">Choose Template</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-3xl mb-2">{template.icon}</div>
                    <div className="font-semibold text-gray-800">{template.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content Sections */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        {/* Personal Info */}
        {activeSection === 'personal' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <User size={24} />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <User size={16} className="text-gray-500" />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={personalInfo.fullName}
                  onChange={(e) => setPersonalInfo({...personalInfo, fullName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Mail size={16} className="text-gray-500" />
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo({...personalInfo, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Phone size={16} className="text-gray-500" />
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Linkedin size={16} className="text-blue-600" />
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={personalInfo.linkedin}
                  onChange={(e) => setPersonalInfo({...personalInfo, linkedin: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Github size={16} className="text-gray-700" />
                  GitHub
                </label>
                <input
                  type="url"
                  value={personalInfo.githubUrl}
                  onChange={(e) => setPersonalInfo({...personalInfo, githubUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://github.com/yourusername"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <FileText size={16} className="text-gray-500" />
                Professional Summary
              </label>
              <textarea
                value={personalInfo.summary}
                onChange={(e) => setPersonalInfo({...personalInfo, summary: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Write a brief professional summary (2-3 sentences)"
              />
            </div>
            <button
              onClick={handleSavePersonal}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
              Save Personal Info
            </button>
          </div>
        )}

        {/* Education */}
        {activeSection === 'education' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <GraduationCap size={24} />
              Education
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
              <h4 className="font-semibold mb-3">Add New Education</h4>
              <div className="mb-2 text-xs text-gray-600">
                Add any type of education: Degree, Diploma, Certificate, High School, Training, Online Course, etc.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualification/Education Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., B.Tech, Diploma, Certificate"
                    value={newEducation.degree}
                    onChange={(e) => setNewEducation({...newEducation, degree: e.target.value})}
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
                    value={newEducation.institution}
                    onChange={(e) => setNewEducation({...newEducation, institution: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Start Year"
                  value={newEducation.startYear}
                  onChange={(e) => setNewEducation({...newEducation, startYear: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="End Year"
                  value={newEducation.endYear}
                  onChange={(e) => setNewEducation({...newEducation, endYear: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="CGPA"
                  value={newEducation.cgpa}
                  onChange={(e) => setNewEducation({...newEducation, cgpa: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                onClick={handleAddEducation}
                disabled={saving}
                className="mt-3 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Plus size={18} />
                Add Education
              </button>
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
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        value={editingEducation.endYear}
                        onChange={(e) => setEditingEducation({...editingEducation, endYear: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleUpdateEducation(edu.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingEducation(null)}
                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400"
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
                        {edu.startYear} - {edu.endYear || 'Present'} {edu.cgpa && `• CGPA: ${edu.cgpa}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingEducation(edu)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteEducation(edu.id)}
                        className="text-red-600 hover:text-red-800"
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
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Briefcase size={24} />
              Work Experience
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
              <h4 className="font-semibold mb-3">Add New Experience</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Job Title"
                      value={newExperience.title}
                      onChange={(e) => setNewExperience({...newExperience, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Company name"
                      value={newExperience.company}
                      onChange={(e) => setNewExperience({...newExperience, company: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Start Date (e.g., Jan 2023)"
                    value={newExperience.start}
                    onChange={(e) => setNewExperience({...newExperience, start: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="End Date (leave blank if current)"
                    value={newExperience.end}
                    onChange={(e) => setNewExperience({...newExperience, end: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <textarea
                  placeholder="Job Description"
                  value={newExperience.description}
                  onChange={(e) => setNewExperience({...newExperience, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleAddExperience}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Plus size={18} />
                  Add Experience
                </button>
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
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={editingExperience.company}
                          onChange={(e) => setEditingExperience({...editingExperience, company: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={editingExperience.start}
                          onChange={(e) => setEditingExperience({...editingExperience, start: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={editingExperience.end}
                          onChange={(e) => setEditingExperience({...editingExperience, end: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
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
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingExperience(null)}
                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400"
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
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteExperience(exp.id)}
                        className="text-red-600 hover:text-red-800"
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
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Code size={24} />
              Skills
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
              <h4 className="font-semibold mb-3">Add New Skill</h4>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skill Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Skill Name"
                    value={newSkill.skillName}
                    onChange={(e) => setNewSkill({...newSkill, skillName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <select
                  value={newSkill.rating}
                  onChange={(e) => setNewSkill({...newSkill, rating: parseInt(e.target.value)})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={1}>Beginner</option>
                  <option value={2}>Basic</option>
                  <option value={3}>Intermediate</option>
                  <option value={4}>Advanced</option>
                  <option value={5}>Expert</option>
                </select>
                <button
                  onClick={handleAddSkill}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Plus size={18} />
                  Add
                </button>
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
                    className="text-red-600 hover:text-red-800"
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
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FolderKanban size={24} />
              Projects {generatingAI && <Loader className="animate-spin text-blue-600" size={20} />}
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
              <h4 className="font-semibold mb-3">Add New Project (AI-Enhanced)</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Project Title"
                    value={newProject.title}
                    onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Project Description (AI will generate professional content)"
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Tech Stack (comma-separated, e.g., React, Node.js, MongoDB)"
                  value={newProject.techStack.join(', ')}
                  onChange={(e) => {
                    const techStack = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                    setNewProject({...newProject, techStack});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="url"
                    placeholder="GitHub URL"
                    value={newProject.githubUrl}
                    onChange={(e) => setNewProject({...newProject, githubUrl: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="url"
                    placeholder="Live Demo URL"
                    value={newProject.liveUrl}
                    onChange={(e) => setNewProject({...newProject, liveUrl: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                {aiGenerated && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm font-semibold text-green-800 mb-2">✨ AI-Generated Content:</div>
                    <div className="text-sm text-gray-700 mb-2"><strong>Summary:</strong> {aiGenerated.summary}</div>
                    {aiGenerated.bullets && aiGenerated.bullets.length > 0 && (
                      <div className="text-sm text-gray-700">
                        <strong>Bullets:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {aiGenerated.bullets.map((bullet, idx) => (
                            <li key={idx}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={handleAddProject}
                  disabled={saving || generatingAI}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Plus size={18} />
                  Add Project {generatingAI && '(Generating AI...)'}
                </button>
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
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-600 hover:text-red-800"
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

        {/* Preview */}
        {activeSection === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Eye size={24} />
                Resume Preview
              </h3>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md"
              >
                {exporting ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Export as PDF</span>
                  </>
                )}
              </button>
            </div>

            <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
              <div id="resume-preview" className="bg-white shadow-2xl" style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }}>
                <div className="p-8">
                  {renderTemplate()}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">💡 Tips:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>All sections are ATS-friendly and ready for job applications</li>
                    <li>AI-generated project content is automatically included</li>
                    <li>Update any section above and refresh to see changes in preview</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </>
      )}

      {/* Upload Resume Mode Content */}
      {activeMode === 'uploadResume' && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Upload size={24} />
              Upload Resume
            </h3>
            
            {resumeInfo.hasResume ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Resume Uploaded</h4>
                      <p className="text-sm text-gray-600">
                        {resumeInfo.fileName}
                        {resumeInfo.fileSize && ` • ${formatFileSize(resumeInfo.fileSize)}`}
                      </p>
                      {resumeInfo.uploadedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded: {new Date(resumeInfo.uploadedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteResume}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
                {resumeInfo.resumeUrl && (
                  <a
                    href={resumeInfo.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <FileText size={18} />
                    View Uploaded Resume
                  </a>
                )}
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {isDragging ? 'Drop your resume here' : 'Upload Your Resume'}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Drag and drop a PDF file here, or click to browse
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
            )}

            {resumeFile && !resumeInfo.hasResume && (
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
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 size={24} />
              ATS Analysis
            </h3>
            <p className="text-gray-600">
              Get detailed analysis of your uploaded resume including ATS compatibility, keyword matching, and improvement suggestions.
            </p>
            <ResumeAnalyzer resumeInfo={resumeInfo} userId={user?.id} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeBuilder;
