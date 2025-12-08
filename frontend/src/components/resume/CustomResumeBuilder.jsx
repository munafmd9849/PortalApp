import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Download, Eye, Edit3, Plus, Trash2, Palette, Type, Layout,
  FileText, User, Briefcase, GraduationCap, Award, Code, Languages, Heart,
  Loader, CheckCircle, AlertCircle, ChevronUp, ChevronDown
} from 'lucide-react';
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
  const autoSaveRef = useRef(null);

  useEffect(() => {
    loadResumeData();
  }, [userId]);

  useEffect(() => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }
    autoSaveRef.current = setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [resumeData]);

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

  const handleAutoSave = async () => {
    try {
      await saveResumeData(userId, resumeData);
      setSaveStatus({ type: 'success', message: 'Autosaved successfully' });
    } catch (error) {
      console.error('Error auto-saving resume:', error);
      setSaveStatus({ type: 'error', message: 'Auto-save failed' });
    }
  };

  const handleManualSave = async () => {
    try {
      setSaving(true);
      await saveResumeData(userId, resumeData);
      setSaveStatus({ type: 'success', message: 'Saved successfully' });
    } catch (error) {
      console.error('Error saving resume:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save resume' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const updatePersonalInfo = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
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

  const addSectionItem = (sectionId, item) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId 
          ? { ...section, items: [...section.items, { ...item, id: Date.now().toString() }] } 
          : section
      )
    }));
  };

  const updateSectionItem = (sectionId, itemId, updates) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          items: section.items.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          )
        };
      })
    }));
  };

  const deleteSectionItem = (sectionId, itemId) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          items: section.items.filter(item => item.id !== itemId)
        };
      })
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
    if (window.confirm('Are you sure you want to delete this section?')) {
      setResumeData(prev => ({
        ...prev,
        sections: prev.sections.filter(section => section.id !== sectionId)
      }));
      if (activeSection === sectionId) {
        setActiveSection('personal');
      }
    }
  };

  const moveSection = (sectionId, direction) => {
    const sections = [...resumeData.sections];
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    
    setResumeData(prev => ({
      ...prev,
      sections
    }));
  };

  const handlePreviewToggle = () => {
    setPreviewMode(!previewMode);
  };

  const handleDownload = () => {
    // Implement download functionality
    console.log('Downloading resume...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading your resume...</span>
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
              onClick={handleManualSave}
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

        {saveStatus && (
          <div className={`mb-4 p-3 rounded-md ${
            saveStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {saveStatus.message}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Editor */}
          <div className="lg:w-1/2 space-y-6">
            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex overflow-x-auto">
                <button
                  onClick={() => setActiveSection('personal')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeSection === 'personal'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Personal
                </button>
                <button
                  onClick={() => setActiveSection('summary')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeSection === 'summary'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Summary
                </button>
                {resumeData.sections.map(section => (
                  <div key={section.id} className="flex items-center">
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`px-4 py-3 text-sm font-medium ${
                        activeSection === section.id
                          ? 'border-b-2 border-blue-500 text-blue-600'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {section.title}
                    </button>
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveSection(section.id, 'up')}
                        className="h-3 w-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                        title="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveSection(section.id, 'down')}
                        className="h-3 w-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                        title="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="px-2 text-gray-400 hover:text-red-500"
                      title="Delete section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addCustomSection}
                  className="flex items-center px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Section
                </button>
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
              {resumeData.sections.map(section => (
                activeSection === section.id && (
                  <div key={section.id}>
                    {section.type === SECTION_TYPES.EXPERIENCE && (
                      <ExperienceForm
                        items={section.items}
                        onAddItem={addSectionItem}
                        onUpdateItem={updateSectionItem}
                        onDeleteItem={deleteSectionItem}
                        sectionId={section.id}
                      />
                    )}
                    {section.type === SECTION_TYPES.EDUCATION && (
                      <EducationForm
                        items={section.items}
                        onAddItem={addSectionItem}
                        onUpdateItem={updateSectionItem}
                        onDeleteItem={deleteSectionItem}
                        sectionId={section.id}
                      />
                    )}
                    {(section.type === SECTION_TYPES.SKILLS || 
                      section.type === SECTION_TYPES.PROJECTS || 
                      section.type === SECTION_TYPES.CERTIFICATIONS ||
                      section.type === SECTION_TYPES.LANGUAGES ||
                      section.type === SECTION_TYPES.INTERESTS ||
                      section.type === SECTION_TYPES.CUSTOM) && (
                      <SectionForm
                        section={section}
                        onUpdateSection={updateSection}
                        onAddItem={addSectionItem}
                        onUpdateItem={updateSectionItem}
                        onDeleteItem={deleteSectionItem}
                      />
                    )}
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:w-1/2">
            <div className="sticky top-6">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h2>
                <ResumePreview resumeData={resumeData} />
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              required
            />
          </div>
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
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(123) 456-7890"
            />
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
              placeholder="City, Country"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              value={data.website}
              onChange={(e) => onChange('website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
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
  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
        </div>
        
        <div className="space-y-4">
          {section.items.map((item, index) => (
            <div key={item.id || index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">
                  {item.title || `Item ${index + 1}`}
                </h4>
                <button
                  onClick={() => onDeleteItem(section.id, item.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(item).map(([key, value]) => {
                  if (key === 'id') return null;
                  return (
                    <div key={key} className="flex">
                      <span className="text-sm font-medium text-gray-500 w-24 capitalize">
                        {key}:
                      </span>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => onUpdateItem(section.id, item.id, { [key]: e.target.value })}
                        className="flex-1 text-sm border-b border-dashed border-gray-300 px-1 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          <button
            onClick={() => {
              const newItem = { id: Date.now().toString(), title: '', description: '' };
              onAddItem(section.id, newItem);
            }}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 border-dashed rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {section.title.slice(0, -1)}
          </button>
        </div>
      </div>
    </div>
  );
}
