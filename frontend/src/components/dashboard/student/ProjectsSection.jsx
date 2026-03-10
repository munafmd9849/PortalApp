import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Edit2, Plus } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  addProjectArray,
  deleteProjectArray,
  updateProjectArray,
  getStudentProfile,
  generateProjectContent
} from '../../../services/students';

const ProjectsSection = ({ studentId, isAdminView = false }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isAddButtonActive, setIsAddButtonActive] = useState(false);
  const formRef = useRef(null);
  const [editedProject, setEditedProject] = useState({
    title: '',
    description: '',
    techStack: [],
    liveUrl: '',
    githubUrl: ''
  });
  const [techStackInput, setTechStackInput] = useState(''); // Raw input for tech stack
  const [aiGenerated, setAiGenerated] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const projectsLoadedRef = useRef(false);

  // Load projects data once on mount
  useEffect(() => {
    if (!user?.id) return;
    
    // Prevent repeated calls
    if (projectsLoadedRef.current) return;

    let isMounted = true;
    projectsLoadedRef.current = true;

    const loadProjects = async () => {
      try {
        setLoading(true);
        console.log('🚀 [ProjectsSection] Starting loadProjects, isMounted:', isMounted);
        const profile = await getStudentProfile(user.id);
        
        // CRITICAL: Log raw API response
        console.log('📥 [ProjectsSection] PROFILE API RESPONSE:', profile);
        console.log('📥 [ProjectsSection] Projects field:', profile?.projects);
        console.log('📥 [ProjectsSection] Projects type:', typeof profile?.projects);
        console.log('📥 [ProjectsSection] Projects isArray:', Array.isArray(profile?.projects));
        console.log('🔍 [ProjectsSection] isMounted check:', isMounted);
        
        // CRITICAL: Always process data, but check isMounted before setState
        // SAFE: Normalize to array, never null/undefined
        const realProjects = Array.isArray(profile?.projects) 
          ? profile.projects 
          : (profile?.projects ? [profile.projects] : []);
        const hasRealProjects = realProjects.length > 0;
        
        console.log('🔍 [ProjectsSection] Processed data:', {
          realProjectsCount: realProjects.length,
          hasRealProjects,
          firstProject: realProjects[0] || null,
          isMounted,
        });
        
        // CRITICAL: Update state regardless of isMounted (React handles cleanup)
        if (hasRealProjects) {
          console.log('✅ [ProjectsSection] Setting real projects:', realProjects);
          setProjects(realProjects);
        } else {
          console.log('📭 [ProjectsSection] No projects found. Using empty array.');
          setProjects([]);
        }
      } catch (error) {
        console.error('❌ [ProjectsSection] Error loading projects:', error);
        setError('Failed to load projects. Please try again.');
        setProjects([]);
        // Reset on error to allow retry
        projectsLoadedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Normalize URL helper
  const normalizeUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const startEditing = (index) => {
    setEditingIndex(index);
    const project = projects[index];
    // Parse techStack from JSON string if it exists
    let techStack = [];
    if (project.technologies) {
      try {
        techStack = typeof project.technologies === 'string' 
          ? JSON.parse(project.technologies) 
          : project.technologies;
      } catch (e) {
        techStack = [];
      }
    }
    setEditedProject({
      title: project.title,
      description: project.description || '',
      techStack: techStack,
      liveUrl: project.liveUrl || '',
      githubUrl: project.githubUrl || ''
    });
    setTechStackInput(techStack.join(', ')); // Set raw input for editing
    // Load AI-generated content if available
    if (project.ai_summary || project.ai_bullets) {
      setAiGenerated({
        summary: project.ai_summary,
        bullets: project.ai_bullets ? (typeof project.ai_bullets === 'string' ? JSON.parse(project.ai_bullets) : project.ai_bullets) : [],
        skills: project.skills_extracted ? (typeof project.skills_extracted === 'string' ? JSON.parse(project.skills_extracted) : project.skills_extracted) : []
      });
    } else {
      setAiGenerated(null);
    }
  };

  const handleChange = (field, value) => {
    setEditedProject((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-generate AI content when project data changes
  const triggerAIGeneration = async () => {
    if (!editedProject.title.trim() || !editedProject.description.trim()) {
      return;
    }

    try {
      setGenerating(true);
      const techStackArray = techStackInput.split(',').map(t => t.trim()).filter(t => t);
      const generated = await generateProjectContent({
        title: editedProject.title,
        description: editedProject.description,
        techStack: techStackArray
      });
      setAiGenerated(generated);
    } catch (error) {
      console.error('AI generation error:', error);
      // Don't show error to user, just log it
    } finally {
      setGenerating(false);
    }
  };

  const saveProject = async () => {
    if (!editedProject.title.trim() || !editedProject.description.trim() || !editedProject.liveUrl.trim()) {
      setError('Please fill in all required fields (Title, Description, and Project URL).');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Process tech stack from raw input
      const techStackArray = techStackInput.split(',').map(t => t.trim()).filter(t => t);
      
      // Prepare project data with AI-generated content
      const projectData = {
        title: editedProject.title,
        description: editedProject.description,
        technologies: JSON.stringify(techStackArray),
        liveUrl: editedProject.liveUrl ? normalizeUrl(editedProject.liveUrl) : '',
        githubUrl: editedProject.githubUrl ? normalizeUrl(editedProject.githubUrl) : ''
      };

      // Include AI-generated fields if available
      if (aiGenerated) {
        projectData.ai_summary = aiGenerated.summary;
        projectData.ai_bullets = JSON.stringify(aiGenerated.bullets || []);
        projectData.skills_extracted = JSON.stringify(aiGenerated.skills || []);
      }

      if (editingIndex !== null && editingIndex < projects.length) {
        // Update existing project
        const existingProject = projects[editingIndex];
        await updateProjectArray(user.id, existingProject.id, projectData);
        setSuccess('Project updated successfully!');
      } else {
        // Add new project
        await addProjectArray(user.id, projectData);
        setSuccess('Project added successfully!');
      }

      // Refresh projects list after save
      const profile = await getStudentProfile(user.id);
      const refreshedProjects = Array.isArray(profile?.projects) ? profile.projects : [];
      console.log('🔄 [ProjectsSection] Refreshed after save:', {
        profileProjects: profile?.projects,
        refreshedCount: refreshedProjects.length,
      });
      setProjects(refreshedProjects);

      setEditingIndex(null);
      setIsAddButtonActive(false);
      setAiGenerated(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving project:', error);
      if (error.code === 'permission-denied') {
        setError('You do not have permission to save projects. Please contact support.');
      } else {
        setError('Failed to save project. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (index) => {
    const project = projects[index];
    if (!window.confirm(`Are you sure you want to delete "${project.title}"?`)) return;

    try {
      setLoading(true);
      await deleteProjectArray(user.id, project.id);
      
      // Refresh projects list after delete
      const profile = await getStudentProfile(user.id);
      const refreshedProjects = Array.isArray(profile?.projects) ? profile.projects : [];
      console.log('🔄 [ProjectsSection] Refreshed after delete:', {
        profileProjects: profile?.projects,
        refreshedCount: refreshedProjects.length,
      });
      setProjects(refreshedProjects);
      
      setSuccess('Project deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);

      if (editingIndex === index) {
        setEditingIndex(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addNewProject = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    const isCurrentlyAdding = editingIndex === projects.length;
    if (isCurrentlyAdding) {
      // Cancel adding
      setEditingIndex(null);
      setIsAddButtonActive(false);
      setAiGenerated(null);
      setEditedProject({ title: '', description: '', techStack: [], liveUrl: '', githubUrl: '' });
      setTechStackInput('');
      setError('');
    } else {
      // Start adding
      setEditingIndex(projects.length);
      setEditedProject({ title: '', description: '', techStack: [], liveUrl: '', githubUrl: '' });
      setTechStackInput('');
      setAiGenerated(null);
      setIsAddButtonActive(true);
      setError('');
      
      // Scroll to form after a brief delay to ensure it's rendered
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setIsAddButtonActive(false);
    setAiGenerated(null);
    setError('');
  };

  // Auto-trigger AI generation when title or description changes
  useEffect(() => {
    if (editingIndex !== null && editedProject.title.trim() && editedProject.description.trim()) {
      const timer = setTimeout(() => {
        triggerAIGeneration();
      }, 1000); // Debounce 1 second
      return () => clearTimeout(timer);
    }
  }, [editedProject.title, editedProject.description, techStackInput]);

  return (
    <div className="w-full relative min-w-0">
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-3 px-3 md:pb-4 md:px-6 transition-all duration-200 shadow-lg min-w-0 overflow-hidden">
        <legend className="text-base md:text-lg md:text-xl font-bold bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text px-2">
          Projects
        </legend>

        <div className="flex justify-end mb-2 md:mb-3 mr-0 md:mr-[-1%]">
          <button
            onClick={addNewProject}
            disabled={loading || isAdminView}
            aria-label="Add new project"
            className={`rounded-full p-1.5 md:p-2 shadow transition touch-manipulation ${
              isAdminView 
                ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                : isAddButtonActive 
                ? 'bg-[#5e9ad6] hover:bg-[#4a7bb8]' 
                : 'bg-[#8ec5ff] hover:bg-[#5e9ad6]'
            }`}
            title={isAdminView ? 'Admin view - cannot add projects' : 'Add new project'}
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs md:text-sm break-words">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-xs md:text-sm">
            {success}
          </div>
        )}

        <div className="my-1 md:my-2">
          {/* CRITICAL: Log rendering state */}
          {console.log('🎨 [ProjectsSection] Rendering with:', {
            projectsCount: projects.length,
            loading,
            projectsArray: projects,
            isArray: Array.isArray(projects),
          })}
          
          <div className="space-y-2 pr-1 md:pr-2 custom-scrollbar overflow-y-auto" style={{ maxHeight: 'min(350px, 60vh)' }}>
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #f3f4f6;
                border-radius: 4px;
                margin: 4px 0;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #3c80a7;
                border-radius: 4px;
                transition: background 0.3s ease;
                border: 2px solid transparent;
                background-clip: content-box;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #2f6786;
              }
              .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: #3c80a7 #f3f4f6;
                padding-right: 4px;
              }
            `}</style>
            {/* Add new project form when editingIndex equals projects.length */}
            {editingIndex === projects.length && (
              <div ref={formRef} className="rounded-lg px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8]">
                <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Project Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editedProject.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Enter project title"
                  required
                  className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                />
                <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Project Description <span className="text-red-500">*</span></label>
                <textarea
                  value={editedProject.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Enter project description"
                  required
                  rows={2}
                  className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded resize-none min-w-0"
                />
                <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Project URL <span className="text-red-500">*</span></label>
                <input
                  type="url"
                  value={editedProject.liveUrl}
                  onChange={(e) => handleChange('liveUrl', e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                />
                <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Tech Stack</label>
                <input
                  type="text"
                  value={techStackInput}
                  onChange={(e) => setTechStackInput(e.target.value)}
                  onBlur={() => {
                    const techStack = techStackInput.split(',').map(t => t.trim()).filter(t => t);
                    handleChange('techStack', techStack);
                  }}
                  placeholder="React, Node.js, MongoDB"
                  className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                />
                <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">GitHub URL</label>
                <input
                  type="url"
                  value={editedProject.githubUrl}
                  onChange={(e) => handleChange('githubUrl', e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                />
                
                {/* AI Generated Content */}
                {generating && (
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                    🤖 Generating AI content...
                  </div>
                )}
                {aiGenerated && !generating && (
                  <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="text-sm font-semibold text-green-800 mb-2">✨ AI-Generated Content:</div>
                    <div className="text-sm text-gray-700 mb-2">
                      <strong>Summary:</strong> {aiGenerated.summary}
                    </div>
                    {aiGenerated.bullets && aiGenerated.bullets.length > 0 && (
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>Bullet Points:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {aiGenerated.bullets.map((bullet, idx) => (
                            <li key={idx}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiGenerated.skills && aiGenerated.skills.length > 0 && (
                      <div className="text-sm text-gray-700">
                        <strong>Extracted Skills:</strong> {aiGenerated.skills.join(', ')}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={saveProject}
                    className="px-2.5 py-1.5 md:px-3 md:py-1 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 touch-manipulation"
                    disabled={loading || generating}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-2.5 py-1.5 md:px-3 md:py-1 text-sm rounded bg-gray-300 hover:bg-gray-400 text-gray-800 touch-manipulation"
                  >
                    Cancel
                  </button>
                 </div>
              </div>
            )}

            {/* SAFE: Always render if projects is an array, even if empty */}
            {Array.isArray(projects) && projects.map((project, index) => (
              editingIndex === index ? (
                <div
                  key={index}
                  className="rounded-lg px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8]"
                >
                  <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Project Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editedProject.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Enter project title"
                    required
                    className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                  />
                  <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Project Description <span className="text-red-500">*</span></label>
                  <textarea
                    value={editedProject.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Enter project description"
                    required
                    rows={2}
                    className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded resize-none min-w-0"
                  />
                  <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Project URL <span className="text-red-500">*</span></label>
                  <input
                    type="url"
                    value={editedProject.liveUrl}
                    onChange={(e) => handleChange('liveUrl', e.target.value)}
                    placeholder="https://example.com"
                    required
                    className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                  />
                  <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Tech Stack</label>
                  <input
                    type="text"
                    value={techStackInput}
                    onChange={(e) => setTechStackInput(e.target.value)}
                    onBlur={() => {
                      const techStack = techStackInput.split(',').map(t => t.trim()).filter(t => t);
                      handleChange('techStack', techStack);
                    }}
                    placeholder="React, Node.js, MongoDB"
                    className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                  />
                  <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">GitHub URL</label>
                  <input
                    type="url"
                    value={editedProject.githubUrl}
                    onChange={(e) => handleChange('githubUrl', e.target.value)}
                    placeholder="https://github.com/username/repo"
                    className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                  />
                  
                  {/* AI Generated Content */}
                  {generating && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                      🤖 Generating AI content...
                    </div>
                  )}
                  {aiGenerated && !generating && (
                    <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded">
                      <div className="text-sm font-semibold text-green-800 mb-2">✨ AI-Generated Content:</div>
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>Summary:</strong> {aiGenerated.summary}
                      </div>
                      {aiGenerated.bullets && aiGenerated.bullets.length > 0 && (
                        <div className="text-sm text-gray-700 mb-2">
                          <strong>Bullet Points:</strong>
                          <ul className="list-disc list-inside ml-2">
                            {aiGenerated.bullets.map((bullet, idx) => (
                              <li key={idx}>{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiGenerated.skills && aiGenerated.skills.length > 0 && (
                        <div className="text-sm text-gray-700">
                          <strong>Extracted Skills:</strong> {aiGenerated.skills.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={saveProject}
                      className="px-2.5 py-1.5 md:px-3 md:py-1 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 touch-manipulation"
                      disabled={loading || generating}
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-2.5 py-1.5 md:px-3 md:py-1 text-sm rounded bg-gray-300 hover:bg-gray-400 text-gray-800 touch-manipulation"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteProject(index)}
                      className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={index}
                  className={`group/proj-row rounded-lg md:rounded-xl px-3 py-3 md:px-5 md:py-4 transition-all duration-300 hover:shadow-lg border-2 border-gray-200 hover:border-[#3c80a7] bg-gradient-to-r min-w-0 ${
                    index % 2 !== 0 ? 'from-gray-50 to-gray-100' : 'from-[#f0f8fa] to-[#e6f3f8]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5 md:mb-2 gap-2">
                    <h4 className="text-sm md:text-base md:text-xl font-bold text-gray-900 flex-1 min-w-0 break-words truncate" title={project.title}>{project.title}</h4>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEditing(index)}
                        aria-label={`Edit project ${project.title}`}
                        className={`text-gray-600 transition touch-manipulation p-1 ${
                          isAdminView ? 'cursor-not-allowed' : 'hover:text-blue-600'
                        } ${loading ? 'opacity-50' : ''}`}
                        disabled={loading || isAdminView}
                        title={isAdminView ? 'Admin view - cannot edit projects' : `Edit project ${project.title}`}
                      >
                        <Edit2 size={15} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm sm:text-base text-gray-700 pl-0 sm:pl-3">
                    <span className="font-semibold text-black text-sm sm:text-base">Description: </span>
                    <span className="break-words">{project.description}</span>
                  </p>
                  
                  {project.liveUrl && (
                    <div className="mt-2 text-sm sm:text-base text-gray-700 flex flex-wrap items-center gap-1 pl-0 sm:pl-3">
                      <span className="font-semibold text-black text-xs sm:text-sm">Project URL:</span>
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center break-all touch-manipulation"
                      >
                        <ExternalLink size={14} className="mr-1 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">View Project</span>
                      </a>
                    </div>
                  )}
                  
                  {/* Tech Stack and GitHub URL - Hidden by default, shown on hover */}
                  <div className="overflow-hidden max-h-0 group-hover/proj-row:max-h-20 transition-all duration-300 ease-in-out mt-2 pl-0 sm:pl-3">
                    {project.technologies && (() => {
                      let techStack = [];
                      try {
                        techStack = typeof project.technologies === 'string' 
                          ? JSON.parse(project.technologies) 
                          : project.technologies;
                      } catch (e) {
                        techStack = [];
                      }
                      return techStack.length > 0 ? (
                        <div className="text-sm text-gray-700 mb-1">
                          <span className="font-semibold text-black text-xs sm:text-sm">Tech Stack: </span>
                          <span className="text-xs sm:text-sm">{techStack.join(', ')}</span>
                        </div>
                      ) : null;
                    })()}
                    {project.githubUrl && (
                      <div className="text-sm text-gray-700 flex flex-wrap items-center gap-1">
                        <span className="font-semibold text-black text-xs sm:text-sm">GitHub URL:</span>
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center break-all touch-manipulation"
                        >
                          <ExternalLink size={12} className="mr-1 flex-shrink-0" />
                          <span className="text-xs sm:text-sm">View Repository</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default ProjectsSection;