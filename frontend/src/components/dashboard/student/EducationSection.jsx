import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import CustomDropdown from '../../common/CustomDropdown';
import { FaChartLine } from 'react-icons/fa';
import {
  addEducationArray,
  updateEducationArray,
  deleteEducationArray,
  getStudentProfile
} from '../../../services/students';

const EducationSection = ({ isAdminView = false }) => {
  const { user } = useAuth();
  const [educationEntries, setEducationEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [isAddButtonActive, setIsAddButtonActive] = useState(false);
  const [currentEdu, setCurrentEdu] = useState({
    institute: '',
    city: '',
    state: '',
    branch: '',
    yop: '',
    scoreType: 'CGPA',
    score: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const educationLoadedRef = useRef(false);

  // Load education data once on mount
  useEffect(() => {
    if (!user?.id) return;
    
    // Prevent repeated calls
    if (educationLoadedRef.current) return;

    let isMounted = true;
    educationLoadedRef.current = true;

    const loadEducation = async () => {
      try {
        setLoading(true);
        console.log('🚀 [EducationSection] Starting loadEducation, isMounted:', isMounted);
        const profile = await getStudentProfile(user.id);
        
        // CRITICAL: Log raw API response
        console.log('📥 [EducationSection] PROFILE API RESPONSE:', profile);
        console.log('📥 [EducationSection] Education field:', profile?.education);
        console.log('📥 [EducationSection] Education type:', typeof profile?.education);
        console.log('📥 [EducationSection] Education isArray:', Array.isArray(profile?.education));
        console.log('🔍 [EducationSection] isMounted check:', isMounted);
        
        // CRITICAL: Always process data, React handles cleanup
        const rawEducation = Array.isArray(profile?.education) 
          ? profile.education 
          : (profile?.education ? [profile.education] : []);
        
        // Map backend fields to frontend fields
        // Backend: institution, degree, endYear, cgpa, description (may contain city/state as JSON)
        // Frontend: institute, branch, yop, scoreType, score, city, state
        const mappedEducation = rawEducation.map(edu => {
          // Try to parse city/state from description (stored as JSON)
          let city = '';
          let state = '';
          if (edu.description) {
            try {
              const descData = JSON.parse(edu.description);
              if (descData.city) city = descData.city;
              if (descData.state) state = descData.state;
            } catch (e) {
              // Not JSON, ignore
            }
          }
          
          // Determine scoreType from description (where we store it)
          // If description has scoreType, use it; otherwise default to CGPA if cgpa exists
          let scoreType = 'CGPA';
          let score = '';
          
          // Check description first for scoreType
          if (edu.description) {
            try {
              const descData = JSON.parse(edu.description);
              if (descData.scoreType) {
                scoreType = descData.scoreType;
                // If percentage, use originalScore; otherwise use cgpa
                if (descData.scoreType === 'Percentage' && descData.originalScore) {
                  score = String(descData.originalScore);
                } else if (edu.cgpa) {
                  score = String(edu.cgpa);
                }
              } else if (edu.cgpa) {
                // No scoreType in description but cgpa exists - default to CGPA
                score = String(edu.cgpa);
              }
            } catch (e) {
              // Not JSON, fallback to cgpa if exists
              if (edu.cgpa) {
                score = String(edu.cgpa);
              }
            }
          } else if (edu.cgpa) {
            // No description, use cgpa as CGPA
            score = String(edu.cgpa);
          }
          
          return {
            ...edu,
            institute: edu.institution || edu.institute || '',
            branch: edu.degree || edu.branch || '',
            yop: edu.endYear ? String(edu.endYear) : edu.yop || '',
            scoreType: scoreType,
            score: score,
            city: city,
            state: state,
            // Preserve original fields for compatibility
            institution: edu.institution,
            degree: edu.degree,
            endYear: edu.endYear,
            cgpa: edu.cgpa,
          };
        });
        
        const hasRealEducation = mappedEducation.length > 0;
        
        console.log('🔍 [EducationSection] Processed data:', {
          rawCount: rawEducation.length,
          mappedCount: mappedEducation.length,
          hasRealEducation,
          firstEducation: mappedEducation[0] || null,
          isMounted,
        });
        
        // CRITICAL: Update state regardless of isMounted (React handles cleanup)
        if (hasRealEducation) {
          console.log('✅ [EducationSection] Setting real education:', mappedEducation);
          setEducationEntries(mappedEducation);
        } else {
          console.log('📭 [EducationSection] No education found. Using empty array.');
          setEducationEntries([]);
        }
      } catch (error) {
        console.error('❌ [EducationSection] Error loading education:', error);
        setError('Failed to load education data. Please try again.');
        setEducationEntries([]);
        // Reset on error to allow retry
        educationLoadedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadEducation();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleAddClick = () => {
    if (showForm && !editingId) {
      // Cancel adding
      setShowForm(false);
      setIsAddButtonActive(false);
    } else {
      // Start adding
      setCurrentEdu({
        institute: '',
        city: '',
        state: '',
        branch: '',
        yop: '',
        scoreType: 'CGPA',
        score: ''
      });
      setEditingId(null);
      setShowForm(true);
      setIsAddButtonActive(true);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    setShowForm(false);
    setEditingId(null);
    setIsAddButtonActive(false);
  };

  const handleEditClick = (education) => {
    // Use mapped education object which already has city/state/scoreType/score
    setCurrentEdu({
      institute: education.institution || education.institute || '',
      city: education.city || '',
      state: education.state || '',
      branch: education.degree || education.branch || '',
      yop: education.endYear ? String(education.endYear) : (education.yop || ''),
      scoreType: education.scoreType || 'CGPA',
      score: education.score || ''
    });
    setEditingId(education.id);
    setShowForm(true);
  };

  const handleDeleteClick = async (education) => {
    console.log('Delete clicked for education:', education);
    
    const instituteName = education.institute || 'this education record';
    if (!window.confirm(`Are you sure you want to delete ${instituteName}?`)) return;
    
    try {
      setLoading(true);
      console.log('Deleting education with ID:', education.id);
      await deleteEducationArray(user.id, education.id);
      console.log('Delete operation completed for ID:', education.id);
      
      // Refresh education list after delete - need to map backend data to frontend format
      const profile = await getStudentProfile(user.id);
      const rawEducation = Array.isArray(profile?.education) ? profile.education : [];
      
      // Map backend fields to frontend fields (same logic as in loadEducation)
      const mappedEducation = rawEducation.map(edu => {
        // Parse city/state from description (stored as JSON)
        let city = '';
        let state = '';
        if (edu.description) {
          try {
            const descData = JSON.parse(edu.description);
            if (descData.city) city = descData.city;
            if (descData.state) state = descData.state;
          } catch (e) {
            // Not JSON, ignore
          }
        }
        
        // Determine scoreType from description (where we store it)
        let scoreType = 'CGPA';
        let score = '';
        
        // Check description first for scoreType
        if (edu.description) {
          try {
            const descData = JSON.parse(edu.description);
            if (descData.scoreType) {
              scoreType = descData.scoreType;
              // If percentage, use originalScore; otherwise use cgpa
              if (descData.scoreType === 'Percentage' && descData.originalScore) {
                score = String(descData.originalScore);
              } else if (edu.cgpa) {
                score = String(edu.cgpa);
              }
            } else if (edu.cgpa) {
              // No scoreType in description but cgpa exists - default to CGPA
              score = String(edu.cgpa);
            }
          } catch (e) {
            // Not JSON, fallback to cgpa if exists
            if (edu.cgpa) {
              score = String(edu.cgpa);
            }
          }
        } else if (edu.cgpa) {
          // No description, use cgpa as CGPA
          score = String(edu.cgpa);
        }
        
        return {
          ...edu,
          institute: edu.institution || edu.institute || '',
          branch: edu.degree || edu.branch || '',
          yop: edu.endYear ? String(edu.endYear) : edu.yop || '',
          scoreType: scoreType,
          score: score,
          city: city,
          state: state,
          institution: edu.institution,
          degree: edu.degree,
          endYear: edu.endYear,
          cgpa: edu.cgpa,
        };
      });
      
      console.log('🔄 [EducationSection] Refreshed after delete:', {
        rawCount: rawEducation.length,
        mappedCount: mappedEducation.length,
        mappedEducation,
      });
      setEducationEntries(mappedEducation);
      
      setSuccess('Education record deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      if (editingId === education.id) {
        setShowForm(false);
        setEditingId(null);
      }
    } catch (error) {
      console.error('Error deleting education:', error);
      setError('Failed to delete education record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCurrentEdu((prev) => ({ ...prev, [field]: value }));
  };

  const saveEducation = async () => {
    // Validate all required fields
    if (!currentEdu.institute.trim()) {
      setError('Institute name is required');
      return;
    }
    if (!currentEdu.city.trim()) {
      setError('City is required');
      return;
    }
    if (!currentEdu.state.trim()) {
      setError('State is required');
      return;
    }
    if (!currentEdu.branch.trim()) {
      setError('Qualification/Branch is required');
      return;
    }
    if (!currentEdu.yop.trim()) {
      setError('Year of Passing is required');
      return;
    }
    if (!currentEdu.scoreType) {
      setError('Score Type is required');
      return;
    }
    if (!currentEdu.score || !currentEdu.score.trim()) {
      setError(`${currentEdu.scoreType} is required`);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Map frontend fields to backend schema
      // Backend expects: institution, degree, endYear, cgpa, description
      // Frontend uses: institute, branch, yop, scoreType/score, city, state
      // Store city/state and scoreType in description as JSON
      const descriptionData = {
        city: currentEdu.city || '',
        state: currentEdu.state || '',
        scoreType: currentEdu.scoreType,
        originalScore: currentEdu.score || '',
      };
      
      // For CGPA: use exact value; for Percentage: store in description only
      // Backend cgpa field is used for CGPA (0-10 range), percentage stored in description
      let cgpaValue = null;
      if (currentEdu.score && currentEdu.scoreType === 'CGPA') {
        const cgpaStr = String(currentEdu.score).trim();
        // Ensure it has 2 decimal places
        if (cgpaStr.includes('.')) {
          const parts = cgpaStr.split('.');
          cgpaValue = parts[0] + '.' + (parts[1] || '').padEnd(2, '0').substring(0, 2);
        } else {
          cgpaValue = cgpaStr + '.00';
        }
      } else if (currentEdu.score && currentEdu.scoreType === 'Percentage') {
        // Don't store percentage in cgpa field - store null, original value in description
        cgpaValue = null;
      }
      
      const eduData = {
        institution: currentEdu.institute, // Map institute -> institution
        degree: currentEdu.branch || currentEdu.institute, // Map branch -> degree (fallback to institute)
        endYear: currentEdu.yop ? parseInt(currentEdu.yop) : null, // Map yop -> endYear (convert to int)
        cgpa: cgpaValue,
        description: JSON.stringify(descriptionData), // Store city/state and scoreType as JSON
      };
      
      console.log('💾 [EducationSection] Saving education data:', {
        original: currentEdu,
        mapped: eduData,
      });
      
      if (editingId) {
        // Update existing education
        await updateEducationArray(user.id, editingId, eduData);
        setSuccess('Education updated successfully!');
      } else {
        // Add new education
        await addEducationArray(user.id, eduData);
        setSuccess('Education added successfully!');
      }
      
      // Refresh education list after save - need to map backend data to frontend format
      const profile = await getStudentProfile(user.id);
      const rawEducation = Array.isArray(profile?.education) ? profile.education : [];
      
      // Map backend fields to frontend fields (same logic as in loadEducation)
      const mappedEducation = rawEducation.map(edu => {
        // Parse city/state from description (stored as JSON)
        let city = '';
        let state = '';
        if (edu.description) {
          try {
            const descData = JSON.parse(edu.description);
            if (descData.city) city = descData.city;
            if (descData.state) state = descData.state;
          } catch (e) {
            // Not JSON, ignore
          }
        }
        
        // Determine scoreType from description (where we store it)
        // If description has scoreType, use it; otherwise default to CGPA if cgpa exists
        let scoreType = 'CGPA';
        let score = '';
        
        // Check description first for scoreType
        if (edu.description) {
          try {
            const descData = JSON.parse(edu.description);
            if (descData.scoreType) {
              scoreType = descData.scoreType;
              // If percentage, use originalScore; otherwise use cgpa
              if (descData.scoreType === 'Percentage' && descData.originalScore) {
                score = String(descData.originalScore);
              } else if (edu.cgpa) {
                score = String(edu.cgpa);
              }
            } else if (edu.cgpa) {
              // No scoreType in description but cgpa exists - default to CGPA
              score = String(edu.cgpa);
            }
          } catch (e) {
            // Not JSON, fallback to cgpa if exists
            if (edu.cgpa) {
              score = String(edu.cgpa);
            }
          }
        } else if (edu.cgpa) {
          // No description, use cgpa as CGPA
          score = String(edu.cgpa);
        }
        
        return {
          ...edu,
          institute: edu.institution || edu.institute || '',
          branch: edu.degree || edu.branch || '',
          yop: edu.endYear ? String(edu.endYear) : edu.yop || '',
          scoreType: scoreType,
          score: score,
          city: city,
          state: state,
          institution: edu.institution,
          degree: edu.degree,
          endYear: edu.endYear,
          cgpa: edu.cgpa,
        };
      });
      
      console.log('🔄 [EducationSection] Refreshed after save:', {
        rawCount: rawEducation.length,
        mappedCount: mappedEducation.length,
        mappedEducation,
      });
      setEducationEntries(mappedEducation);
      
      // Reset form
      setShowForm(false);
      setEditingId(null);
      setIsAddButtonActive(false);
      setCurrentEdu({
        institute: '',
        city: '',
        state: '',
        branch: '',
        yop: '',
        scoreType: 'CGPA',
        score: ''
      });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('❌ [EducationSection] Error saving education:', error);
      console.error('❌ [EducationSection] Error details:', {
        message: error.message,
        status: error.status,
        response: error.response,
        code: error.code,
        stack: error.stack,
      });
      
      // Extract detailed error message
      let errorMessage = 'Failed to save education. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.code === 'permission-denied') {
        setError('You do not have permission to save education data. Please contact support.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setIsAddButtonActive(false);
  };

  return (
    <div className="w-full">
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-4 px-3 sm:px-6 transition-all duration-200 shadow-lg">

        <legend className="text-base sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text select-none">
          Education
        </legend>

        <div className="flex items-center justify-end mr-[-1%]">
          <div className="flex gap-2">
            <button
              onClick={handleAddClick}
              disabled={educationEntries.length >= 4 || isAdminView}
              aria-label="Add new education"
              className={`rounded-full p-2 shadow transition ${
                isAdminView || educationEntries.length >= 4
                  ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                  : isAddButtonActive 
                  ? 'bg-[#5e9ad6] hover:bg-[#4a7bb8]' 
                  : 'bg-[#8ec5ff] hover:bg-[#5e9ad6]'
              }`}
              title={isAdminView ? 'Admin view - cannot add education' : educationEntries.length >= 4 ? 'Maximum 4 education entries allowed' : 'Add new education'}
            >
              <Plus size={18} className="text-white" />
            </button>
            <button
              onClick={toggleEditMode}
              disabled={isAdminView}
              aria-label={editMode ? 'Exit edit mode' : 'Edit education'}
              className={`bg-[#8ec5ff] rounded-full p-2 shadow transition flex items-center justify-center ${
                editMode ? 'bg-[#5e9ad6]' : ''
              } ${isAdminView ? 'cursor-not-allowed' : 'hover:bg-[#5e9ad6]'}`}
              title={isAdminView ? 'Admin view - cannot edit education' : (editMode ? 'Exit edit mode' : 'Edit education')}
            >
              <Edit3 size={17} className="text-white" />
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

        {/* Education Table Format */}
        {educationEntries.length > 0 && (
          <div className="mb-3">
            <div className="space-y-3 sm:space-y-2">
              {/* Column Headers - Hidden on mobile */}
              <div className="hidden md:grid grid-cols-4 gap-4 mb-0 p-4">
                <div className="text-black font-bold text-sm lg:text-lg">Institute</div>
                <div className="text-black font-bold text-sm lg:text-lg">Qualification/Branch</div>
                <div className="text-black font-bold text-sm lg:text-lg">Year of Passing</div>
                <div className="text-black font-bold text-sm lg:text-lg">CGPA/Percentage</div>
              </div>

            {/* Education Rows */}
            {educationEntries.map((education, index) => (
              <div
                key={education.id}
                className={`group/edu-row flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 p-2.5 sm:p-4 rounded-xl relative
                  bg-gradient-to-r 
                  ${index % 2 !== 0 ? 'from-gray-50 to-gray-100' : 'from-[#f0f8fa] to-[#e6f3f8]'}
                  hover:shadow-md transition ${
                    editMode ? 'cursor-pointer' : ''
                  }`}
                onClick={editMode ? () => handleEditClick(education) : undefined}
              >
                {/* Mobile Layout - compact text and padding */}
                <div className="md:hidden space-y-1.5 min-w-0">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-black block truncate" title={education.institute}>
                      {education.institute}
                    </span>
                    {[education.city, education.state].filter(Boolean).length > 0 && (
                      <span className="text-xs italic text-gray-600 truncate block">
                        {[education.city, education.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs min-w-0">
                    <div className="min-w-0">
                      <span className="text-gray-500">Qualification:</span>
                      <span className="ml-1 text-black font-medium truncate block">{education.branch || 'N/A'}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-gray-500">YOP:</span>
                      <span className="ml-1 text-black font-medium truncate block">{education.yop || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="text-xs min-w-0 flex items-baseline gap-1">
                    <span className="text-gray-500 flex-shrink-0">Score:</span>
                    <span className="truncate text-black font-medium" title={education.score && education.scoreType ? `${education.score} ${education.scoreType === 'CGPA' ? 'CGPA' : '%'}` : ''}>
                      {education.score && education.scoreType ? `${education.score} ${education.scoreType === 'CGPA' ? 'CGPA' : '%'}` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Desktop Layout */}
                <>
                  <div className="hidden md:flex flex-col min-w-0 overflow-hidden">
                    <span className="text-sm lg:text-base font-bold text-gray-900 truncate" title={education.institute}>
                      {education.institute}
                    </span>
                    {[education.city, education.state].filter(Boolean).length > 0 && (
                      <div className="overflow-hidden max-h-0 group-hover/edu-row:max-h-6 transition-all duration-300 ease-in-out">
                        <span className="text-xs lg:text-sm italic text-gray-600 block truncate">
                          {[education.city, education.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="hidden md:flex items-center text-sm lg:text-base font-semibold text-gray-800 min-w-0 overflow-hidden">
                    <span className="truncate" title={education.branch}>{education.branch}</span>
                  </div>
                  <div className="hidden md:flex items-center text-sm lg:text-base font-semibold text-gray-800 min-w-0 overflow-hidden">
                    <span className="truncate" title={education.yop}>{education.yop}</span>
                  </div>
                  <div className="hidden md:flex items-center text-sm lg:text-base font-bold text-gray-900 min-w-0 overflow-hidden">
                    <span className="truncate" title={education.score && education.scoreType ? `${education.score} ${education.scoreType === 'CGPA' ? 'CGPA' : '%'}` : ''}>
                      {education.score && education.scoreType ? `${education.score} ${education.scoreType === 'CGPA' ? 'CGPA' : '%'}` : 'N/A'}
                    </span>
                  </div>
                </>
                
                {/* Edit and Delete buttons - only visible in edit mode */}
                {editMode && (
                  <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 flex gap-1 z-10">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 touch-manipulation"
                      title="Edit"
                      aria-label={`Edit education ${index + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(education);
                      }}
                      disabled={loading}
                    >
                      <Edit3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 touch-manipulation"
                      title="Delete"
                      aria-label={`Delete education ${index + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(education);
                      }}
                      disabled={loading}
                    >
                      <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}

        {showForm && (
          <div className="mb-4 p-3 md:p-4 border border-gray-300 rounded bg-gray-50">
            {/* Row 1: Institute (wider), City, State */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="lg:col-span-2">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  Institute Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter institute name"
                  value={currentEdu.institute}
                  onChange={(e) => handleInputChange('institute', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                  value={currentEdu.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="State"
                  value={currentEdu.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Branch, YOP, ScoreType dropdown, Score */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  Qualification/Branch <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CSE, 12th, 10th"
                  value={currentEdu.branch}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  Year of Passing <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  inputMode="numeric"
                  min="1900"
                  max="2099"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="YYYY"
                  value={currentEdu.yop}
                  onChange={(e) => handleInputChange('yop', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  Score Type <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  label="Score Type"
                  icon={FaChartLine}
                  iconColor="text-blue-600"
                  options={[
                    { value: 'CGPA', label: 'CGPA' },
                    { value: 'Percentage', label: 'Percentage' }
                  ]}
                  value={currentEdu.scoreType}
                  onChange={(value) => handleInputChange('scoreType', value)}
                  placeholder="Select Score Type"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  {currentEdu.scoreType} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step={currentEdu.scoreType === 'CGPA' ? '0.01' : '0.1'}
                  min={currentEdu.scoreType === 'CGPA' ? '0' : '0'}
                  max={currentEdu.scoreType === 'CGPA' ? '10' : '100'}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={currentEdu.scoreType === 'CGPA' ? 'e.g., 8.4' : 'e.g., 80.4'}
                  value={currentEdu.score}
                  onChange={(e) => handleInputChange('score', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-gray-600">Entry {educationEntries.length + (editingId ? 0 : 1)} of 4</p>
              <div className="flex space-x-2">
                <button
                  onClick={saveEducation}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-md hover:bg-blue-700 text-xs md:text-sm disabled:opacity-50 touch-manipulation"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Education'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1.5 md:px-4 md:py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs md:text-base touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {educationEntries.length >= 4 && !showForm && (
          <p className="text-sm text-gray-600">You have added the maximum of 4 education records.</p>
        )}

        {educationEntries.length === 0 && !loading && !showForm && (
          <div className="mb-3 mt-1">
            <div className="space-y-2">
              {/* Column Headers */}
              <div className="grid grid-cols-4 gap-4 mb-0 p-4">
                <div className="text-black font-bold text-lg">Institute</div>
                <div className="text-black font-bold text-lg">Qualification/Branch</div>
                <div className="text-black font-bold text-lg">Year of Passing</div>
                <div className="text-black font-bold text-lg">CGPA/Percentage</div>
              </div>
              <div className="text-center py-8 text-gray-500">
                <p>No education records added yet.</p>
                <p className="text-sm">Click the + button to add your education records.</p>
              </div>
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
};

export default EducationSection;
