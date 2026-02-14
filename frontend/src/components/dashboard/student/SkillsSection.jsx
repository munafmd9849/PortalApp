import React, { useState, useEffect } from 'react';
import { Star, Plus } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faJava, faPython, faJs, faReact, faNodeJs, faCss3Alt, faGithub,
  faBootstrap, faNpm, faHtml5, faAngular, faVuejs, faDocker,
  faAws, faLinux,
} from '@fortawesome/free-brands-svg-icons';
import { faDatabase, faTrash, faPenToSquare, faCode, faLaptopCode, faChartLine, faServer, faNetworkWired, faDesktop, faChartBar, faBrain, faMicrochip, faProjectDiagram, faTools, faCodeBranch, faSyncAlt, faCloud, faCog } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../hooks/useAuth';
import {
  addOrUpdateSkillArray,
  deleteSkillArray,
  getStudentSkills
} from '../../../services/students';

function getPointOnQuadraticBezier(t, p0, p1, p2) {
  const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
  const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
  return { x, y };
}

const iconsMap = {
  Java: faJava,
  Python: faPython,
  JavaScript: faJs,
  React: faReact,
  'Node.js': faNodeJs,
  SQL: faDatabase,
  CSS: faCss3Alt,
  Git: faGithub,
  GitHub: faGithub, // GitHub uses same icon as Git
  DSA: faLaptopCode, // Data Structures and Algorithms
  'Data Structures': faLaptopCode,
  Algorithms: faCode,
  'Data Structures and Algorithms': faLaptopCode,
  // Brand icons (original where available)
  HTML: faHtml5, // HTML5 brand icon
  'C++': faCode, // C++ - use code icon (no specific brand icon in FontAwesome)
  C: faCode, // C - use code icon (no specific brand icon in FontAwesome)
  'C#': faCode, // C# - use code icon (no specific brand icon in FontAwesome)
  TypeScript: faJs, // TypeScript - use JavaScript icon (no specific brand icon in FontAwesome free-brands)
  Angular: faAngular, // Angular brand icon
  'Vue.js': faVuejs, // Vue.js brand icon
  'Express.js': faNodeJs, // Express.js uses Node.js icon (related framework)
  MongoDB: faDatabase, // MongoDB - use database icon (no specific brand icon in FontAwesome)
  MySQL: faDatabase, // MySQL - use database icon (no specific brand icon in FontAwesome)
  PostgreSQL: faDatabase, // PostgreSQL - use database icon (no specific brand icon in FontAwesome)
  Redis: faDatabase, // Redis - use database icon (no specific brand icon in FontAwesome)
  Docker: faDocker, // Docker brand icon
  Kubernetes: faDocker, // Kubernetes - use Docker icon (similar container tech)
  AWS: faAws, // AWS brand icon
  Azure: faCloud, // Azure - use cloud icon (Microsoft brand icon not available in free-brands)
  GCP: faCloud, // Google Cloud Platform - use cloud icon (Google brand icon not available in free-brands)
  Linux: faLinux, // Linux brand icon
  'Shell Scripting': faCode, // Shell Scripting - use code icon
  'System Design': faProjectDiagram, // System Design - architecture diagram icon
  AI: faBrain, // AI - brain icon
  'Machine Learning': faBrain, // Machine Learning - brain icon
  ML: faBrain, // ML (abbreviation) - brain icon
  'Deep Learning': faMicrochip, // Deep Learning - microchip/neural network icon
  DL: faMicrochip, // DL (abbreviation) - microchip icon
  'REST API': faServer, // REST API - server icon
  'Rest API': faServer, // Alternative spelling - server icon
  GraphQL: faCode, // GraphQL - use code icon (no specific brand icon in FontAwesome)
  Microservices: faProjectDiagram, // Microservices - architecture diagram icon
  DevOps: faTools, // DevOps - tools icon
  'CI/CD': faCodeBranch, // CI/CD - code branch/sync icon
  'Tailwind CSS': faCss3Alt, // Tailwind CSS - CSS framework, use CSS icon
  // Other skills with appropriate icons
  Numpy: faChartBar, // Data/statistics icon for NumPy
  Pandas: faChartBar, // Data analysis icon for Pandas
  Matplotlib: faChartLine, // Chart/plotting icon for Matplotlib
  Seaborn: faChartLine, // Statistical visualization icon for Seaborn
  NestJS: faCode, // Node.js framework, use code icon
  Bootstrap: faBootstrap, // Bootstrap brand icon
  Spring: faCode, // Java framework, use code icon
  Maven: faNpm, // Build tool, use npm icon as similar
  Gradle: faNpm, // Build tool, use npm icon as similar
  'Operating System': faDesktop, // OS icon
  'OS': faDesktop, // Operating System abbreviation
  'Computer Networks': faNetworkWired, // Network icon
  'CN': faNetworkWired, // Computer Networks abbreviation
};

// Common/suggested skills list for quick selection
const suggestedSkills = [
  'Java', 'Python', 'JavaScript', 'React', 'Node.js', 'DSA',
  'CSS', 'Git', 'HTML', 'C++', 'C', 'C#',
  'TypeScript', 'Angular', 'Vue.js', 'Express.js', 'MongoDB',
  'MySQL', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes',
  'AWS', 'Azure', 'GCP', 'Linux', 'Shell Scripting',
  'System Design', 'ML', 'DL', 'AI', 'REST API',
  'GraphQL', 'Microservices', 'DevOps', 'CI/CD',
  'Numpy', 'Pandas', 'Matplotlib', 'Seaborn', 'GitHub',
  'NestJS', 'Bootstrap', 'Tailwind CSS', 'Spring', 'Maven', 'Gradle',
  'OS', 'CN'
];

// Helper function for case-insensitive icon lookup
const getSkillIcon = (skillName) => {
  if (!skillName) return faCode; // Default to code icon (</>) for empty
  
  // First try exact match
  if (iconsMap[skillName]) return iconsMap[skillName];
  
  // Then try case-insensitive match
  const lowerSkillName = skillName.toLowerCase();
  const matchedKey = Object.keys(iconsMap).find(key => key.toLowerCase() === lowerSkillName);
  
  // Return matched icon or default to code icon (</>) for custom skills
  return matchedKey ? iconsMap[matchedKey] : faCode;
};

const SkillsSection = ({ isAdminView = false, initialSkills = null }) => {
  const { user } = useAuth();
  const [skills, setSkills] = useState(initialSkills || []);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [isAddButtonActive, setIsAddButtonActive] = useState(false);
  const [currentSkill, setCurrentSkill] = useState({ skillName: '', rating: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSkillsToAdd, setSelectedSkillsToAdd] = useState([]); // For bulk add
  const [selectedSkillsToDelete, setSelectedSkillsToDelete] = useState([]); // For bulk delete
  const [skillsInForm, setSkillsInForm] = useState([]); // Skills being added/edited in form { skillName, rating }
  const [newSkillName, setNewSkillName] = useState(''); // Custom skill name input

  // OPTIMIZED: Only load skills if not provided as props (avoids redundant API call)
  useEffect(() => {
    // If initialSkills are provided, use them and skip API call
    if (initialSkills !== null) {
      setSkills(Array.isArray(initialSkills) ? initialSkills : []);
      return;
    }

    // Fallback: Load skills only if not provided as props (for admin view or other cases)
    if (!user?.id) return;

    let isMounted = true;

    const loadSkills = async () => {
      try {
        setLoading(true);
        const skillsData = await getStudentSkills(user.id);
        if (isMounted) {
          const realSkills = Array.isArray(skillsData) ? skillsData : (skillsData ? [skillsData] : []);
          setSkills(realSkills);
        }
      } catch (error) {
        console.error('Error loading skills:', error);
        if (isMounted) {
          setError('Failed to load skills. Please try again.');
          setSkills([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSkills();

    return () => {
      isMounted = false;
    };
  }, [user?.id, initialSkills]);

  // Sync skills when initialSkills prop changes (for when skills are updated from parent)
  useEffect(() => {
    if (initialSkills !== null && Array.isArray(initialSkills)) {
      setSkills(initialSkills);
    }
  }, [initialSkills]);

  const handleAddClick = () => {
    // If form is already open, close it
    if (showForm) {
      setShowForm(false);
      setIsAddButtonActive(false);
      setEditMode(false);
      setSelectedSkillsToAdd([]); // Reset selection
      setSkillsInForm([]); // Reset form
      setNewSkillName(''); // Reset custom skill name
      setSelectedSkillsToDelete([]);
      setEditingIndex(null);
      return;
    }
    
    // Always populate existing skills in the form for management (add/edit/remove)
    // If 8 skills reached, open in edit-only mode
    // If less than 8, open in add/edit mode (can add more or edit existing)
    const existingSkillsInForm = skills.map(s => ({ skillName: s.skillName, rating: s.rating, id: s.id }));
    setSkillsInForm(existingSkillsInForm);
    setEditMode(skills.length >= 8);
    setCurrentSkill({ skillName: '', rating: 1 });
    setEditingIndex(null);
    setSelectedSkillsToAdd([]); // Reset selection
    setNewSkillName(''); // Reset custom skill name
    setSelectedSkillsToDelete([]);
    setShowForm(true);
    setIsAddButtonActive(true);
  };

  const toggleEditMode = () => {
    const newEditMode = !editMode;
    setEditMode(newEditMode);
    
    if (newEditMode) {
      // When entering edit mode, populate skillsInForm with existing skills
      setSkillsInForm(skills.map(s => ({ skillName: s.skillName, rating: s.rating, id: s.id })));
      setShowForm(true); // Show form in edit mode
    } else {
      // When exiting edit mode, reset
      setShowForm(false);
      setSkillsInForm([]);
      setSelectedSkillsToDelete([]);
    }
    
    setEditingIndex(null);
    setIsAddButtonActive(false);
    setSelectedSkillsToAdd([]);
    setNewSkillName('');
  };

  const handleEditClick = (index) => {
    const skill = skills[index];
    setCurrentSkill({ 
      skillName: skill.skillName, 
      rating: skill.rating
    });
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleDeleteClick = async (index) => {
    const skill = skills[index];
    if (!window.confirm(`Are you sure you want to delete ${skill.skillName}?`)) return;
    
    try {
      setLoading(true);
      await deleteSkillArray(user.id, skill.id);
      
      // Refresh skills list after delete
      const skillsData = await getStudentSkills(user.id);
      setSkills(skillsData || []);
      
      setSuccess('Skill deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      if (editingIndex === index) {
        setShowForm(false);
        setEditingIndex(null);
      }
    } catch (error) {
      console.error('Error deleting skill:', error);
      setError('Failed to delete skill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCurrentSkill((prev) => ({ ...prev, [field]: value }));
  };

  const handleRatingChange = (rating) => {
    setCurrentSkill((prev) => ({ ...prev, rating }));
  };

  const saveSkill = async () => {
    if (!currentSkill.skillName.trim()) {
      setError('Skill name cannot be empty');
      return;
    }
    
    // Check if adding a new skill (not editing) and limit is reached
    if (editingIndex === null && skills.length >= 8) {
      setError('Maximum limit reached. You can only add up to 8 skills. Please delete a skill before adding a new one.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const skillData = {
        skillName: currentSkill.skillName,
        rating: currentSkill.rating
      };
      
      await addOrUpdateSkillArray(user.id, skillData);
      
      // Refresh skills list after save
      const skillsData = await getStudentSkills(user.id);
      setSkills(skillsData || []);
      
      setShowForm(false);
      setEditingIndex(null);
      setCurrentSkill({ skillName: '', rating: 1 });
      setIsAddButtonActive(false);
      
      setSuccess('Skill saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving skill:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.code === 'permission-denied') {
        setError('You do not have permission to save skills. Please contact support.');
      } else {
        setError('Failed to save skill. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingIndex(null);
    setIsAddButtonActive(false);
    setSelectedSkillsToAdd([]);
    setSkillsInForm([]);
    setNewSkillName('');
    setCurrentSkill({ skillName: '', rating: 1 });
  };

  // Toggle skill selection - adds to skillsInForm
  const toggleSkillSelection = (skillName) => {
    // Check if already in form
    const existingIndex = skillsInForm.findIndex(s => s.skillName.toLowerCase() === skillName.toLowerCase());
    
    if (existingIndex >= 0) {
      // Remove from form
      setSkillsInForm(prev => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      // Check limit - skillsInForm will have this new skill added, so check if length would exceed 8
      if (skillsInForm.length >= 8) {
        setError(`Maximum limit is 8 skills. Please remove a skill first to add another.`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      // Add to form with default rating
      setSkillsInForm(prev => [...prev, { skillName, rating: 1 }]);
    }
  };

  // Remove skill from form
  const removeSkillFromForm = (index) => {
    setSkillsInForm(prev => prev.filter((_, idx) => idx !== index));
  };

  // Update skill rating in form
  const updateSkillRatingInForm = (index, rating) => {
    setSkillsInForm(prev => prev.map((skill, idx) => 
      idx === index ? { ...skill, rating } : skill
    ));
  };

  // Normalize skill name for comparison (lowercase, trim, normalize spaces)
  const normalizeSkillName = (skillName) => {
    return skillName.toLowerCase().replace(/\s+/g, ' ').trim();
  };

  // Add custom skill to form
  const addCustomSkillToForm = () => {
    const trimmedSkill = newSkillName.trim();
    if (!trimmedSkill) {
      setError('Please enter a skill name.');
      return;
    }

    // Normalize the skill name for comparison
    const normalizedInput = normalizeSkillName(trimmedSkill);
    
    // Check if already in form (case-insensitive, ignoring extra spaces)
    const existsInForm = skillsInForm.some(s => {
      const normalizedExisting = normalizeSkillName(s.skillName);
      return normalizedExisting === normalizedInput;
    });

    if (existsInForm) {
      setError('This skill has already been added. Please select a different skill.');
      setNewSkillName(''); // Clear input field
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Check if it matches any suggested skill (case-insensitive, ignoring extra spaces)
    const matchingSuggestedSkill = suggestedSkills.find(skill => {
      const normalizedSkill = normalizeSkillName(skill);
      return normalizedSkill === normalizedInput;
    });

    if (matchingSuggestedSkill) {
      setError(`Please select "${matchingSuggestedSkill}" from the suggested skills list below.`);
      setNewSkillName(''); // Clear input field
      setTimeout(() => setError(''), 4000);
      return;
    }

    // Check if already exists in saved skills
    const existsInSaved = skills.some(s => {
      const normalizedSaved = normalizeSkillName(s.skillName);
      return normalizedSaved === normalizedInput;
    });

    if (existsInSaved) {
      setError('This skill is already in your skills list.');
      setNewSkillName(''); // Clear input field
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Check limit - skillsInForm will have this new skill added, so check if length would exceed 8
    if (skillsInForm.length >= 8) {
      setError(`Maximum limit is 8 skills. Please remove a skill first to add another.`);
      setNewSkillName(''); // Clear input field
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Add custom skill with default rating (will use default logo via getSkillIcon)
    setSkillsInForm(prev => [...prev, { skillName: trimmedSkill, rating: 1 }]);
    setNewSkillName(''); // Clear input
  };

  // Save all skills in form (for both add and edit mode)
  const handleBulkAdd = async () => {
    if (skillsInForm.length === 0) {
      setError('Please add at least one skill.');
      return;
    }

    // Check limit
    if (editMode) {
      // In edit mode, check total skills won't exceed limit
      if (skillsInForm.length > 8) {
        setError(`Maximum limit is 8 skills. You have ${skillsInForm.length} skills selected.`);
        return;
      }
    } else {
      // In add mode, check if adding would exceed limit
      // Count only NEW skills (not already saved)
      const newSkillsCount = skillsInForm.filter(s => 
        !skills.some(saved => saved.skillName.toLowerCase() === s.skillName.toLowerCase())
      ).length;
      
      if (newSkillsCount + skills.length > 8) {
        setError(`Maximum limit is 8 skills. You have ${skillsInForm.length} skill(s) selected, which exceeds the limit. Please remove some skills.`);
        return;
      }
    }

    try {
      setLoading(true);
      setError('');
      
      if (editMode) {
        // In edit mode, update all skills
        // First, find which skills need to be updated vs created vs deleted
        const existingSkillNames = skills.map(s => s.skillName.toLowerCase());
        const formSkillNames = skillsInForm.map(s => s.skillName.toLowerCase());
        
        // Delete skills that are no longer in form
        const skillsToDelete = skills.filter(s => !formSkillNames.includes(s.skillName.toLowerCase()));
        for (const skill of skillsToDelete) {
          await deleteSkillArray(user.id, skill.id);
        }
        
        // Update/create skills in form
        for (const skillForm of skillsInForm) {
          const skillData = {
            skillName: skillForm.skillName,
            rating: skillForm.rating
          };
          await addOrUpdateSkillArray(user.id, skillData);
        }
      } else {
        // In add mode, create all new skills
        for (const skillForm of skillsInForm) {
          const skillData = {
            skillName: skillForm.skillName,
            rating: skillForm.rating
          };
          await addOrUpdateSkillArray(user.id, skillData);
        }
      }
      
      // Refresh skills list after save
      const skillsData = await getStudentSkills(user.id);
      setSkills(skillsData || []);
      
      setSkillsInForm([]);
      setNewSkillName('');
      setShowForm(false);
      setIsAddButtonActive(false);
      if (editMode) {
        setEditMode(false);
      }
      setSuccess(`${skillsInForm.length} skill(s) ${editMode ? 'updated' : 'added'} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving skills:', error);
      setError('Failed to save skills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle skill selection for bulk delete
  const toggleSkillDeleteSelection = (skillId) => {
    setSelectedSkillsToDelete(prev => {
      if (prev.includes(skillId)) {
        return prev.filter(id => id !== skillId);
      } else {
        return [...prev, skillId];
      }
    });
  };

  // Bulk delete selected skills
  const handleBulkDelete = async () => {
    if (selectedSkillsToDelete.length === 0) {
      setError('Please select at least one skill to delete.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedSkillsToDelete.length} skill(s)?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Delete all selected skills
      for (const skillId of selectedSkillsToDelete) {
        await deleteSkillArray(user.id, skillId);
      }
      
      // Refresh skills list after bulk delete
      const skillsData = await getStudentSkills(user.id);
      setSkills(skillsData || []);
      
      setSelectedSkillsToDelete([]);
      setSuccess(`${selectedSkillsToDelete.length} skill(s) deleted successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error bulk deleting skills:', error);
      setError('Failed to delete skills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .skill-badge {
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        .skill-badge:hover {
          transform: scale(1.05);
        }
        .skill-badge::before {
          content: "";
          position: absolute;
          top: -150%;
          left: -75%;
          width: 50%;
          height: 300%;
          background: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.3) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(25deg);
          transition: all 0.7s ease;
          pointer-events: none;
          filter: blur(30px);
          z-index: 10;
        }
        .skill-badge:hover::before {
          left: 150%;
        }
        .skill-badge-name {
          font-size: 0.45rem !important;
          line-height: 1.15 !important;
          word-break: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          max-height: 1.2rem;
          max-width: 85%;
          width: 85%;
          margin: 0 auto;
          white-space: normal;
        }
        @media (min-width: 640px) {
          .skill-badge-name {
            font-size: 0.55rem !important;
            max-height: 1.5rem;
            line-height: 1.2 !important;
          }
        }
      `}</style>
      
      <div className="w-full">
        <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-4 px-3 sm:px-6 transition-all duration-200 shadow-lg">

          <legend className="text-base sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text select-none">
            Skills {skills.length > 0 && <span className="text-sm text-gray-500">({Math.min(skills.length, 8)}/8)</span>}
          </legend>

          <div className="flex items-center justify-end mb-1 mr-[-1%]">
            <div className="flex gap-2">
              <button
                onClick={handleAddClick}
                disabled={isAdminView}
                aria-label={skills.length >= 8 ? 'Edit skills' : (showForm ? 'Close form' : 'Add/Edit skills')}
                className={`rounded-full w-10 h-10 flex items-center justify-center shadow transition ${
                  isAdminView
                    ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                    : isAddButtonActive || editMode
                    ? 'bg-[#5e9ad6] hover:bg-[#4a7bb8]' 
                    : 'bg-[#8ec5ff] hover:bg-[#5e9ad6]'
                }`}
                title={
                  isAdminView 
                    ? 'Admin view - cannot manage skills' 
                    : skills.length >= 8
                    ? showForm ? 'Close edit mode' : 'Edit skills (8/8)'
                    : showForm ? 'Close add form' : 'Add new skill'
                }
              >
                {skills.length >= 8 && !showForm ? (
                  <FontAwesomeIcon icon={faPenToSquare} className="text-white" size="sm" />
                ) : (
                  <Plus size={18} className="text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              {success}
            </div>
          )}

          {showForm && (
            <div className="mb-4 p-4 border border-gray-300 rounded bg-gray-50">
              {/* Skills Chips Field - Shows all selected skills with ratings */}
              <div className="mb-3 min-h-[120px] p-3 bg-white rounded border border-gray-300">
                {skillsInForm.length === 0 ? (
                  <p className="text-gray-400 text-sm py-8 text-center">
                    {editMode ? 'No skills to edit. Click suggested skills below to add.' : 'Select skills from below or add custom skill'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {skillsInForm.map((skillForm, index) => (
                      <div key={index} className="flex flex-col items-center justify-between w-32 sm:w-36 p-3 bg-blue-50 rounded-lg border border-blue-200 relative">
                        <button
                          type="button"
                          onClick={() => removeSkillFromForm(index)}
                          className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                          title="Remove skill"
                        >
                          <span className="text-xl font-bold">×</span>
                        </button>
                        <div className="flex flex-col items-center gap-2 w-full pt-2 max-w-full">
                          <FontAwesomeIcon 
                            icon={getSkillIcon(skillForm.skillName)} 
                            className="text-blue-600 text-2xl"
                          />
                          <span className="font-medium text-gray-800 text-sm text-center break-words max-w-full px-1 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }} title={skillForm.skillName}>
                            {skillForm.skillName}
                          </span>
                        </div>
                        <div className="flex items-center justify-center space-x-1 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={16}
                              className={star <= skillForm.rating ? 'text-yellow-400 cursor-pointer' : 'text-gray-300 cursor-pointer'}
                              onClick={() => updateSkillRatingInForm(index, star)}
                              title={`Rate ${skillForm.skillName} as ${star} star${star > 1 ? 's' : ''}`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Skill Input with + Button - Show when form is open and can add skills */}
              {(
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Add custom skill (not in list)"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSkillToForm();
                      }
                    }}
                    className="flex-1 border border-gray-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkillToForm}
                    disabled={loading || !newSkillName.trim()}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add custom skill"
                  >
                    +
                  </button>
                </div>
              )}
              
              {/* Suggested Skills - Show when form is open */}
              {(
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Suggested Skills:</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white rounded border border-gray-200">
                    {suggestedSkills
                      .filter(skill => 
                        !skills.some(s => s.skillName.toLowerCase() === skill.toLowerCase()) &&
                        !skillsInForm.some(s => s.skillName.toLowerCase() === skill.toLowerCase())
                      )
                      .map((skill) => {
                        const isInForm = skillsInForm.some(s => s.skillName.toLowerCase() === skill.toLowerCase());
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSkillSelection(skill);
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              isInForm 
                                ? 'border-blue-500 bg-blue-100 hover:bg-blue-200' 
                                : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 bg-white'
                            }`}
                            title={isInForm ? `Click to remove ${skill}` : `Click to add ${skill}`}
                          >
                            <FontAwesomeIcon 
                              icon={getSkillIcon(skill)} 
                              className="text-blue-600 text-base"
                            />
                            <span className="text-gray-700">{skill}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2 justify-end">
                <button
                  onClick={() => {
                    cancelEdit();
                    if (editMode) {
                      setEditMode(false);
                    }
                  }}
                  className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAdd}
                  disabled={loading || skillsInForm.length === 0}
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : editMode ? 'Save Changes' : `Save ${skillsInForm.length} Skill${skillsInForm.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {/* Mobile: 2×4 grid (2 rows, 4 per row). Desktop: flex wrap. */}
          <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-4 sm:justify-center">
            {skills.slice(0, 8).map((skill, index) => {
              return (
              <div
                key={index}
                className="skill-badge relative w-full h-28 sm:w-28 sm:h-36 md:w-32 md:h-40 transition-transform transform group touch-manipulation"
                title={skill.skillName}
              >
                <svg viewBox="0 0 512 512" className="absolute inset-0 w-full h-full z-0">
                  {/* Shield */}
                  <path
                    d="M256 55 L430 100 L385 362 L256 452 L127 362 L82 100 Z"
                    fill="url(#purpleGradient)"
                    stroke="#d4af37"
                    strokeWidth="7"
                  />
                  {/* Ribbon band */}
                  <path
                    d="
                      M75 235
                      Q 255 285 435 235
                      L 385 315
                      Q 255 355 125 315 Z
                    "
                    fill="url(#goldGradient)"
                    stroke="#b8860b"
                    strokeWidth="7"
                    className="ribbon-band"
                  />
                  {/* Ribbon left tail */}
                  <path
                    d="M75 235 L30 265 L125 315 L75 235"
                    fill="#d4af37"
                    stroke="#b8860b"
                    strokeWidth="4"
                  />
                  {/* Ribbon right tail */}
                  <path
                    d="M435 235 L480 265 L385 315 L435 235"
                    fill="#d4af37"
                    stroke="#b8860b"
                    strokeWidth="4"
                  />
                  {/* Shield glare */}
                  <path
                    d="M135 110 Q255 70 377 110 Q335 160 257 120 Q175 145 135 110 Z"
                    fill="white"
                    fillOpacity="0.12"
                    className="shield-glare"
                    style={{ transition: 'fill-opacity 0.4s' }}
                  />
                  {/* Ribbon glare */}
                  <path
                    d="
                      M110 260
                      Q255 280 400 260
                      L385 315
                      Q 255 340 125 315 Z
                    "
                    fill="white"
                    fillOpacity="0.07"
                    className="ribbon-glare"
                    style={{ transition: 'fill-opacity 0.4s' }}
                  />
                  {/* Curved stars */}
                  {[...Array(5)].map((_, i) => {
                    const ptA = { x: 110, y: 263 };
                    const ptB = { x: 256, y: 310 };
                    const ptC = { x: 400, y: 263 };
                    const t = 0.07 + (0.8 * i) / 4;
                    const { x, y } = getPointOnQuadraticBezier(t, ptA, ptB, ptC);
                    const isFilled = i < skill.rating;
                    return (
                      <g key={i} transform={`translate(${x - 13},${y - 8})`}>
                        <Star
                          size={40}
                          className={isFilled ? 'text-black fill-black' : 'text-black-400'}
                        />
                      </g>
                    );
                  })}
                  {/* Gradients */}
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#e96518ff" />
                      <stop offset="60%" stopColor="#1b33b8ff" />
                      <stop offset="100%" stopColor="#6122c7ff" />
                    </linearGradient>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ffe066" />
                      <stop offset="100%" stopColor="#b8860b" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center gap-0.5 sm:gap-1 justify-start z-10 top-[8%]">
                  <FontAwesomeIcon
                    icon={getSkillIcon(skill.skillName)}
                    className="text-xl sm:text-3xl mb-0.5 sm:mb-1 text-yellow-300 drop-shadow"
                  />
                  <div className="absolute left-1/2 transform -translate-x-1/2 text-center z-20 top-[30%] w-[85%] max-w-[85%] flex items-center justify-center">
                    <span 
                      className="skill-badge-name font-bold text-white tracking-wide drop-shadow block" 
                      title={skill.skillName}
                    >
                      {skill.skillName}
                    </span>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </fieldset>
      </div>
    </>
  );
};

export default SkillsSection;