import React, { useState, useEffect } from 'react';
import { Star, Plus } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faJava, faPython, faJs, faReact, faNodeJs, faCss3Alt, faGithub,
} from '@fortawesome/free-brands-svg-icons';
import { faDatabase, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
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
};

// Helper function for case-insensitive icon lookup
const getSkillIcon = (skillName) => {
  if (!skillName) return faJs;
  
  // First try exact match
  if (iconsMap[skillName]) return iconsMap[skillName];
  
  // Then try case-insensitive match
  const lowerSkillName = skillName.toLowerCase();
  const matchedKey = Object.keys(iconsMap).find(key => key.toLowerCase() === lowerSkillName);
  
  return matchedKey ? iconsMap[matchedKey] : faJs;
};

const SkillsSection = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [isAddButtonActive, setIsAddButtonActive] = useState(false);
  const [currentSkill, setCurrentSkill] = useState({ skillName: '', rating: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load skills data once on mount
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const loadSkills = async () => {
      try {
        setLoading(true);
        const skillsData = await getStudentSkills(user.id);
        if (isMounted) {
          setSkills(skillsData || []);
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
  }, [user?.id]);

  const handleAddClick = () => {
    if (showForm && editingIndex === null) {
      // Cancel adding
      setShowForm(false);
      setIsAddButtonActive(false);
    } else {
      // Start adding
      setCurrentSkill({ skillName: '', rating: 1 });
      setEditingIndex(null);
      setShowForm(true);
      setIsAddButtonActive(true);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    setShowForm(false);
    setEditingIndex(null);
    setIsAddButtonActive(false);
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
      if (error.code === 'permission-denied') {
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
      `}</style>
      
      <div className="w-full">
        <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-4 px-4 sm:px-6 transition-all duration-200 shadow-lg">

          <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text select-none">
            Skills
          </legend>

          <div className="flex items-center justify-end mb-1 mr-[-1%]">
            <div className="flex gap-2">
              <button
                onClick={handleAddClick}
                aria-label="Add new skill"
                className={`rounded-full p-2 shadow transition ${
                  isAddButtonActive 
                    ? 'bg-[#5e9ad6] hover:bg-[#4a7bb8]' 
                    : 'bg-[#8ec5ff] hover:bg-[#5e9ad6]'
                }`}
              >
                <Plus size={18} className="text-white" />
              </button>
              <button
                onClick={toggleEditMode}
                aria-label={editMode ? 'Exit edit mode' : 'Edit skills'}
                className={`bg-[#8ec5ff] rounded-full p-2 shadow hover:bg-[#5e9ad6] transition flex items-center justify-center ${
                  editMode ? 'bg-[#5e9ad6]' : ''
                }`}
              >
                <FontAwesomeIcon icon={faPenToSquare} className="text-white" />
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
              <input
                type="text"
                placeholder="Skill Name"
                value={currentSkill.skillName}
                onChange={(e) => handleInputChange('skillName', e.target.value)}
                className="border border-gray-400 rounded px-2 py-1 mb-2 w-full"
              />
              <div className="flex items-center mb-2 space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={star <= currentSkill.rating ? 'text-yellow-400 cursor-pointer' : 'text-gray-300 cursor-pointer'}
                    onClick={() => handleRatingChange(star)}
                  />
                ))}
              </div>
              <div className="flex space-x-2 justify-end">
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSkill}
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 sm:gap-x-4 justify-center">
            {skills.map((skill, index) => (
              <div
                key={index}
                className="skill-badge relative w-28 h-36 sm:w-33 sm:h-40 cursor-pointer transition-transform transform group touch-manipulation"
                onClick={() => handleEditClick(index)}
                title={`Click to edit ${skill.skillName}`}
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
                <div className="absolute inset-0 flex flex-col items-center gap-1 justify-start z-10 top-[8%]">
                  <FontAwesomeIcon
                    icon={getSkillIcon(skill.skillName)}
                    className="text-3xl mb-2 text-yellow-300 drop-shadow"
                  />
                  <div className="inset-x-0 text-center z-20">
                    <span className="font-bold text-white text-sm tracking-wide drop-shadow">
                      {skill.skillName}
                    </span>
                  </div>
                  {editMode && (
                    <button
                      aria-label={`Delete skill ${skill.skillName}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(index);
                      }}
                      className="absolute top-1 right-1 text-red-500 hover:text-red-700 disabled:opacity-50"
                      disabled={loading}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      </div>
    </>
  );
};

export default SkillsSection;