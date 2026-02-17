import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  Download, 
  Eye, 
  Edit3, 
  Plus, 
  Trash2, 
  Move, 
  Palette, 
  Type, 
  Layout,
  FileText,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  Languages,
  Heart,
  Loader,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
// Removed drag-and-drop dependency to prevent cascade errors
import ResumePreview from './ResumePreview';
import { saveResumeData, getResumeData } from '../../services/resumeData';
import { ExperienceForm, EducationForm } from './SectionForms';

const SECTION_TYPES = {
  PERSONAL: 'personal',
  SUMMARY: 'summary',
  EXPERIENCE: 'experience',
  EDUCATION: 'education',
  SKILLS: 'skills',
  PROJECTS: 'projects',
  CERTIFICATIONS: 'certifications',
  LANGUAGES: 'languages',
  INTERESTS: 'interests',
  CUSTOM: 'custom'
};

const SECTION_ICONS = {
  [SECTION_TYPES.PERSONAL]: User,
  [SECTION_TYPES.SUMMARY]: FileText,
  [SECTION_TYPES.EXPERIENCE]: Briefcase,
  [SECTION_TYPES.EDUCATION]: GraduationCap,
  [SECTION_TYPES.SKILLS]: Code,
  [SECTION_TYPES.PROJECTS]: Layout,
  [SECTION_TYPES.CERTIFICATIONS]: Award,
  [SECTION_TYPES.LANGUAGES]: Languages,
  [SECTION_TYPES.INTERESTS]: Heart,
  [SECTION_TYPES.CUSTOM]: Plus
};

const DEFAULT_RESUME_DATA = {
  personal: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: ''
  },
  summary: '',
  sections: [
    { id: 'experience', type: SECTION_TYPES.EXPERIENCE, title: 'Work Experience', items: [] },
    { id: 'education', type: SECTION_TYPES.EDUCATION, title: 'Education', items: [] },
    { id: 'skills', type: SECTION_TYPES.SKILLS, title: 'Skills', items: [] },
    { id: 'projects', type: SECTION_TYPES.PROJECTS, title: 'Projects', items: [] }
  ],
  settings: {
    template: 'modern',
    fontSize: 'medium',
    color: '#2563eb',
    spacing: 'normal'
  }
};

export default function CustomResumeBuilder({ userId }) {
  const [resumeData, setResumeData] = useState(DEFAULT_RESUME_DATA);
  const [activeSection, setActiveSection] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const autoSaveRef = useRef(null);
  
  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    loadResumeData();
  }, [userId]);

  useEffect(() => {
    // Auto-save after 2 seconds of inactivity
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [resumeData, handleAutoSave]);

  const loadResumeData = async () => {
    try {
      setLoading(true);
      const data = await getResumeData(userId);
      if (data) {
        setResumeData({ ...DEFAULT_RESUME_DATA, ...data });
      }
    } catch (error) {
      console.error('Error loading resume data:', error);
      setSaveStatus({ type: 'error', message: 'Failed to load resume data' });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSave = useCallback(async () => {
    if (loading) return;
    
    try {
      await saveResumeData(userId, resumeData);
      setSaveStatus({ type: 'success', message: 'Auto-saved' });
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus({ type: 'error', message: 'Auto-save failed' });
    }
  }, [userId, resumeData, loading]);

  const handleManualSave = async () => {
    try {
      setSaving(true);
      await saveResumeData(userId, resumeData);
      setSaveStatus({ type: 'success', message: 'Resume saved successfully!' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save resume' });
    } finally {
      setSaving(false);
    }
  };

  const updatePersonalInfo = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      personal: {
        ...prev.personal,
        [field]: value
      }
    }));
  };

  const updateSummary = (value) => {
    setResumeData(prev => ({
      ...prev,
      summary: value
    }));
  };

  const updateSection = (sectionId, updates) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const updateSectionItem = (sectionId, itemId, updates) => {
    setResumeData(prev => {
      const updatedSections = prev.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            items: section.items.map(item => 
              item.id === itemId ? { ...item, ...updates } : item
            )
          };
        }
        return section;
      });
      
      return {
        ...prev,
        sections: updatedSections
      };
    });
  };

  const addSectionItem = (sectionId, item) => {
    setResumeData(prev => {
      const updatedSections = prev.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            items: [...section.items, { ...item, id: Date.now().toString() }]
          };
        }
        return section;
      });
      
      return {
        ...prev,
        sections: updatedSections
      };
    });
  };

  const deleteSectionItem = (sectionId, itemId) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: section.items.filter(item => item.id !== itemId) }
          : section
      )
    }));
  };

  const addCustomSection = () => {
    const newSection = {
      id: `custom-${Date.now()}`,
      type: SECTION_TYPES.CUSTOM,
      title: 'New Section',
      items: []
    };
    setResumeData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setActiveSection(newSection.id);
  };

  const deleteSection = (sectionId) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
    if (activeSection === sectionId) {
      setActiveSection('personal');
    }
  };

  const moveSectionUp = (sectionId) => {
    const sectionIndex = resumeData.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex <= 0) return;

    const newSections = [...resumeData.sections];
    [newSections[sectionIndex - 1], newSections[sectionIndex]] = 
    [newSections[sectionIndex], newSections[sectionIndex - 1]];

    setResumeData(prev => ({
      ...prev,
      sections: newSections
    }));
  };

  const moveSectionDown = (sectionId) => {
    const sectionIndex = resumeData.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex >= resumeData.sections.length - 1) return;

    const newSections = [...resumeData.sections];
    [newSections[sectionIndex], newSections[sectionIndex + 1]] = 
    [newSections[sectionIndex + 1], newSections[sectionIndex]];

    setResumeData(prev => ({
      ...prev,
      sections: newSections
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading resume builder...</span>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Resume Preview</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Edit3 className="h-4 w-4 mr-2 inline" />
              Edit
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2 inline" />
              Download PDF
            </button>
          </div>
        </div>
        <ResumePreview resumeData={resumeData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with actions */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1>
          <div className="flex space-x-2">
            <button
              onClick={handlePreviewToggle}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {previewMode ? (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Mode
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Mode
                </>
              )}
            </button>
            <button
              onClick={handleSaveResume}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Editor */}
          <div className="lg:w-1/2">
            {/* Add Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Add Section</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SECTION_TYPES).map(([key, value]) => {
                  if (value === 'personal' || value === 'summary') return null;
                  const Icon = SECTION_ICONS[value];
                  return (
                    <button
                      key={value}
                      onClick={() => handleAddSection(value)}
                      className="flex items-center px-3 py-2 bg-gray-100 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Editor */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {activeSection === 'personal' && (
                <PersonalInfoForm
                  data={resumeData.personal}
                  onChange={updatePersonalInfo}
                />
              )}
              {activeSection === 'summary' && (
                <SummaryForm
                  data={resumeData.summary}
                  onChange={updateSummary}
                />
              )}
              {resumeData.sections.map((section) => {
                if (activeSection === section.id) {
                  if (section.type === SECTION_TYPES.EXPERIENCE) {
                    return (
                      <div key={section.id}>
                        <ExperienceForm
                          items={section.items || []}
                          onAddItem={(item) => addSectionItem(section.id, item)}
                          onUpdateItem={(itemId, updates) => updateSectionItem(section.id, itemId, updates)}
                          onDeleteItem={(itemId) => deleteSectionItem(section.id, itemId)}
                          sectionId={section.id}
                        />
                      </div>
                    );
                  } else if (section.type === SECTION_TYPES.EDUCATION) {
                    return (
                      <div key={section.id}>
                        <EducationForm
                          items={section.items || []}
                          onAddItem={(item) => addSectionItem(section.id, item)}
                          onUpdateItem={(itemId, updates) => updateSectionItem(section.id, itemId, updates)}
                          onDeleteItem={(itemId) => deleteSectionItem(section.id, itemId)}
                          sectionId={section.id}
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div key={section.id}>
                        <SectionForm
                          section={section}
                          onUpdateSection={updateSection}
                          onAddItem={addSectionItem}
                          onUpdateItem={updateSectionItem}
                          onDeleteItem={deleteSectionItem}
                        />
                      </div>
                    );
                  }
                }
                return null;
              })}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:w-1/2">
            <div className="sticky top-6 max-h-[calc(100vh-2rem)] flex">
              {/* Expand/Collapse Button */}
              <button 
                onClick={() => setPreviewExpanded(!previewExpanded)}
                className="hidden lg:flex items-center justify-center w-6 h-12 mt-6 -mr-6 z-10 bg-white border border-gray-200 rounded-l-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={previewExpanded ? 'Collapse preview' : 'Expand preview'}
              >
                <svg 
                  className={`w-4 h-4 text-gray-500 transform transition-transform ${previewExpanded ? '' : 'rotate-180'}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* Preview Container */}
              <div className={`bg-white rounded-lg shadow-lg p-6 transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${previewExpanded ? 'w-full' : 'w-0 opacity-0 p-0'}`}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <h2 className="text-lg font-medium text-gray-900">Live Preview</h2>
                  <button 
                    onClick={() => setPreviewExpanded(false)}
                    className="lg:hidden text-gray-500 hover:text-gray-700"
                    aria-label="Close preview"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                  <ResumePreview resumeData={resumeData} />
                </div>
              </div>
              
              {/* Preview Toggle Button (Mobile) */}
              <button 
                onClick={() => setPreviewExpanded(!previewExpanded)}
                className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Toggle preview"
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Personal Info Form Component
function PersonalInfoForm({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={data.fullName}
              onChange={(e) => onChange('fullName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => onChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={data.location}
              onChange={(e) => onChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="City, State, Country"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={data.website}
                onChange={(e) => onChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://yourwebsite.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn
              </label>
              <input
                type="url"
                value={data.linkedin}
                onChange={(e) => onChange('linkedin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub
              </label>
              <input
                type="url"
                value={data.github}
                onChange={(e) => onChange('github', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/username"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Summary Form Component
function SummaryForm({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Summary</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Summary
          </label>
          <textarea
            value={data}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write a compelling professional summary that highlights your key skills, experience, and career objectives..."
          />
          <p className="text-xs text-gray-500 mt-1">
            2-3 sentences that summarize your professional background and key strengths.
          </p>
        </div>
      </div>
    </div>
  );
}

// Section Form Component
function SectionForm({ section, onUpdateSection, onAddItem, onUpdateItem, onDeleteItem }) {
  const [isAdding, setIsAdding] = useState(false);
  const [currentItem, setCurrentItem] = useState({ 
    id: '', 
    title: '', 
    description: '',
    skills: []
  });
  const [skillInput, setSkillInput] = useState('');
  const [editingId, setEditingId] = useState(null);

  const handleAddSkill = (e) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === ' ') && skillInput.trim()) {
      e.preventDefault();
      const newSkill = skillInput.trim().replace(/[,\s]+$/, '');
      if (newSkill && !currentItem.skills.includes(newSkill)) {
        setCurrentItem({
          ...currentItem,
          skills: [...currentItem.skills, newSkill]
        });
      }
      setSkillInput('');
    } else if (e.key === 'Backspace' && !skillInput && currentItem.skills.length > 0) {
      // Remove last skill on backspace when input is empty
      e.preventDefault();
      const newSkills = [...currentItem.skills];
      newSkills.pop();
      setCurrentItem({
        ...currentItem,
        skills: newSkills
      });
    }
  };

  const handleSkillInputChange = (e) => {
    const value = e.target.value;
    // Check if the input ends with space, comma, or enter
    if (value.endsWith(' ') || value.endsWith(',')) {
      const newSkill = value.slice(0, -1).trim();
      if (newSkill && !currentItem.skills.includes(newSkill)) {
        setCurrentItem({
          ...currentItem,
          skills: [...currentItem.skills, newSkill]
        });
        setSkillInput('');
      } else {
        setSkillInput('');
      }
    } else {
      setSkillInput(value);
    }
  };

  const removeSkill = (skillToRemove) => {
    setCurrentItem({
      ...currentItem,
      skills: currentItem.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleAdd = () => {
    const newItem = { 
      id: Date.now().toString(),
      title: currentItem.title,
      description: currentItem.description,
      skills: currentItem.skills
    };
    onAddItem(section.id, newItem);
    setCurrentItem({ id: '', title: '', description: '', skills: [] });
    setSkillInput('');
    setIsAdding(false);
  };

  const handleUpdate = () => {
    onUpdateItem(section.id, editingId, {
      title: currentItem.title,
      description: currentItem.description,
      skills: currentItem.skills
    });
    setCurrentItem({ id: '', title: '', description: '', skills: [] });
    setSkillInput('');
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (item) => {
    setCurrentItem({ 
      id: item.id, 
      title: item.title || '', 
      description: item.description || '',
      skills: item.skills || []
    });
    setEditingId(item.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
        <button
          onClick={() => {
            setCurrentItem({ id: '', title: '', description: '' });
            setEditingId(null);
            setIsAdding(!isAdding);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          {isAdding ? 'Cancel' : `Add ${section.title.slice(0, -1)}`}
        </button>
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {section.type === 'skills' ? 'Category *' : 'Title *'}
              </label>
              <input
                type="text"
                value={currentItem.title}
                onChange={(e) => setCurrentItem({...currentItem, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={section.type === 'skills' ? 'e.g., Programming, Design, Tools' : `Enter ${section.title.slice(0, -1).toLowerCase()} title`}
              />
            </div>
            {section.type === 'skills' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills (Press Enter or comma to add)
                </label>
                <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[42px]">
                  {currentItem.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {skill}
                      <button
                        type="button"
                        className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-600 hover:bg-blue-200"
                        onClick={() => removeSkill(skill)}
                      >
                        <span className="sr-only">Remove skill</span>
                        <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                          <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  <div className="flex-1 flex flex-wrap items-center gap-1">
                    {skillInput && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 opacity-50">
                        {skillInput}
                      </span>
                    )}
                    <input
                      type="text"
                      value={skillInput}
                      onChange={handleSkillInputChange}
                      onKeyDown={handleAddSkill}
                      onBlur={(e) => {
                        if (skillInput.trim()) {
                          handleAddSkill({ ...e, key: 'Enter' });
                        }
                      }}
                      className="flex-1 min-w-[80px] border-0 bg-transparent focus:ring-0 focus:outline-none"
                      placeholder={currentItem.skills.length === 0 ? 'Type and press space/comma...' : ''}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={currentItem.description}
                  onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter ${section.title.slice(0, -1).toLowerCase()} description`}
                />
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentItem({ id: '', title: '', description: '' });
                  setEditingId(null);
                  setIsAdding(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={editingId ? handleUpdate : handleAdd}
                disabled={!currentItem.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {section.items && section.items.length > 0 ? (
        <div className="space-y-4">
          {section.items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  {section.type === 'skills' && item.skills && item.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.skills.map((skill, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.description && section.type !== 'skills' && (
                    <p className="text-gray-600 mt-1">{item.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteItem(section.id, item.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          No {section.title.toLowerCase()} added yet.
        </div>
      )}
    </div>
  );
}
