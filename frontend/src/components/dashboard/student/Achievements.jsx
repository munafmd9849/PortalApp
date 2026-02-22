import React, { useState, useEffect, useRef } from 'react';
import { Award, Eye, Edit2, Plus } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { addAchievementArray, updateAchievementArray, deleteAchievementArray, getStudentProfile } from '../../../services/students';

const Achievements = ({ isAdminView = false }) => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editedAchievement, setEditedAchievement] = useState({
    title: "",
    description: "",
    hasCertificate: false,
    certificateUrl: ""
  });
  const [isAwardAddButtonActive, setIsAwardAddButtonActive] = useState(false);
  const [isCertAddButtonActive, setIsCertAddButtonActive] = useState(false);
  const achievementsLoadedRef = useRef(false);

  // Load achievements data once on mount
  useEffect(() => {
    if (!user?.id) return;
    
    // Prevent repeated calls
    if (achievementsLoadedRef.current) return;

    let isMounted = true;
    achievementsLoadedRef.current = true;

    const loadAchievements = async () => {
      try {
        setLoading(true);
        console.log('🚀 [Achievements] Starting loadAchievements, isMounted:', isMounted);
        const profile = await getStudentProfile(user.id);
        
        // CRITICAL: Log raw API response
        console.log('📥 [Achievements] PROFILE API RESPONSE:', profile);
        console.log('📥 [Achievements] Achievements field:', profile?.achievements);
        console.log('📥 [Achievements] Certifications field:', profile?.certifications);
        console.log('📥 [Achievements] Achievements type:', typeof profile?.achievements);
        console.log('📥 [Achievements] Certifications type:', typeof profile?.certifications);
        console.log('📥 [Achievements] Achievements isArray:', Array.isArray(profile?.achievements));
        console.log('📥 [Achievements] Certifications isArray:', Array.isArray(profile?.certifications));
        console.log('🔍 [Achievements] isMounted check:', isMounted);
        
        // CRITICAL: Always process data, but check isMounted before setState
        // SAFE: Normalize to arrays, never null/undefined
        const achievementsArray = Array.isArray(profile?.achievements) 
          ? profile.achievements 
          : (profile?.achievements ? [profile.achievements] : []);
        const certificationsArray = Array.isArray(profile?.certifications) 
          ? profile.certifications 
          : (profile?.certifications ? [profile.certifications] : []);
        const allItems = [...achievementsArray, ...certificationsArray];
        const hasRealData = allItems.length > 0;
        
        console.log('🔍 [Achievements] Processed data:', {
          achievementsCount: achievementsArray.length,
          certificationsCount: certificationsArray.length,
          totalRealItems: allItems.length,
          hasRealData,
          firstAchievement: achievementsArray[0] || null,
          firstCertification: certificationsArray[0] || null,
          isMounted,
        });
        
        // CRITICAL: Update state regardless of isMounted (React handles cleanup)
        if (hasRealData) {
          console.log('✅ [Achievements] Setting real achievements/certifications:', allItems);
          setAchievements(allItems);
        } else {
          console.log('📭 [Achievements] No achievements/certifications found. Using empty array.');
          setAchievements([]);
        }
      } catch (error) {
        console.error('❌ [Achievements] Error loading achievements:', error);
        setError('Failed to load achievements');
        setAchievements([]);
        // Reset on error to allow retry
        achievementsLoadedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // URL normalization helper
  const normalizeUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  // Handle input changes
  const handleChange = (field, value) => {
    setEditedAchievement(prev => ({ ...prev, [field]: value }));
  };

  // SAFE: Split groups - ensure achievements is always an array
  const achievementsArray = Array.isArray(achievements) ? achievements : [];
  const certificates = achievementsArray.filter(item => item.hasCertificate);
  const awardsAndAchievements = achievementsArray.filter(item => !item.hasCertificate);
  
  // CRITICAL: Log rendering state
  console.log('🎨 [Achievements] Rendering with:', {
    achievementsCount: achievementsArray.length,
    certificatesCount: certificates.length,
    awardsCount: awardsAndAchievements.length,
    loading,
    achievementsArray: achievementsArray,
    isArray: Array.isArray(achievements),
  });

  // Add achievement or certificate
  const addNewAchievement = (isCertificate = false) => {
    const isCurrentlyAdding = editingId === 'new' && editedAchievement.hasCertificate === isCertificate;
    
    if (isCurrentlyAdding) {
      // Cancel adding
      setEditingId(null);
      if (isCertificate) {
        setIsCertAddButtonActive(false);
      } else {
        setIsAwardAddButtonActive(false);
      }
    } else {
      // Start adding
      const newAchievement = {
        title: "",
        description: "",
        hasCertificate: isCertificate,
        certificateUrl: ""
      };
      setEditingId('new');
      setEditedAchievement(newAchievement);
      if (isCertificate) {
        setIsCertAddButtonActive(true);
        setIsAwardAddButtonActive(false);
      } else {
        setIsAwardAddButtonActive(true);
        setIsCertAddButtonActive(false);
      }
    }
  };

  // Start editing
  const startEditing = (achievement) => {
    setEditingId(achievement.id);
    setEditedAchievement({ ...achievement });
  };

  // Save edited achievement
  const saveAchievement = async () => {
    if (!editedAchievement.title.trim() || !editedAchievement.description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const achievementData = {
        title: editedAchievement.title,
        description: editedAchievement.description,
        hasCertificate: editedAchievement.hasCertificate,
        certificateUrl: editedAchievement.certificateUrl ? normalizeUrl(editedAchievement.certificateUrl) : ''
      };

      if (editingId === 'new') {
        // Add new achievement
        await addAchievementArray(user.id, achievementData);
        setSuccess('Achievement added successfully!');
      } else {
        // Update existing achievement
        await updateAchievementArray(user.id, editingId, achievementData);
        setSuccess('Achievement updated successfully!');
      }
      
      // Refresh achievements list after save
      const profile = await getStudentProfile(user.id);
      const achievementsArray = profile?.achievements || [];
      const certificationsArray = profile?.certifications || [];
      setAchievements([...achievementsArray, ...certificationsArray]);
      
      setEditingId(null);
      setIsAwardAddButtonActive(false);
      setIsCertAddButtonActive(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving achievement:', error);
      if (error.code === 'permission-denied') {
        setError('You do not have permission to save achievements. Please contact support.');
      } else {
        setError('Failed to save achievement. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete achievement
  const handleDeleteAchievement = async (id) => {
    if (id === 'new') {
      // Just cancel editing for new items
      setEditingId(null);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this achievement?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await deleteAchievementArray(user.id, id);
      
      // Refresh achievements list after delete
      const profile = await getStudentProfile(user.id);
      const achievementsArray = profile?.achievements || [];
      const certificationsArray = profile?.certifications || [];
      setAchievements([...achievementsArray, ...certificationsArray]);
      
      setSuccess('Achievement deleted successfully!');
      
      if (editingId === id) {
        setEditingId(null);
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting achievement:', error);
      setError('Failed to delete achievement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setIsAwardAddButtonActive(false);
    setIsCertAddButtonActive(false);
  };

  // View certificate url
  const handleViewCertificate = (achievement) => {
    if (achievement.hasCertificate && achievement.certificateUrl) {
      window.open(achievement.certificateUrl, "_blank");
    }
  };

  // Render single item (edit or view)
  const renderItem = (achievement, itemIndex = null) => {
    if (editingId === achievement.id || (editingId === 'new' && achievement.isNew)) {
      return (
        <div
          key={achievement.id}
          className="bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8] rounded-lg p-3 md:p-4"
        >
          <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">{achievement.hasCertificate ? 'Certification Title' : 'Award Title'} <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={editedAchievement.title}
            onChange={e => setEditedAchievement(prev => ({ ...prev, title: e.target.value }))}
            placeholder={achievement.hasCertificate ? "Enter certification title" : "Enter award title"}
            className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
          />
          <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Description <span className="text-red-500">*</span></label>
          <textarea
            value={editedAchievement.description}
            onChange={e => setEditedAchievement(prev => ({ ...prev, description: e.target.value }))}
            placeholder={achievement.hasCertificate ? "Enter certification description" : "Enter award description"}
            rows={2}
            className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded resize-none min-w-0"
          />
          {achievement.hasCertificate && (
            <>
              <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Certificate URL</label>
              <input
                type="url"
                value={editedAchievement.certificateUrl}
                onChange={e => setEditedAchievement(prev => ({ ...prev, certificateUrl: e.target.value }))}
                placeholder="https://example.com/certificate"
                className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
              />
            </>
          )}
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={saveAchievement}
              className="px-2.5 py-1.5 md:px-3 md:py-1 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 touch-manipulation"
              disabled={loading}
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
              onClick={() => handleDeleteAchievement(achievement.id)}
              className="px-2.5 py-1.5 md:px-3 md:py-1 text-sm rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 touch-manipulation"
              disabled={loading}
            >
              Delete
            </button>
          </div>
        </div>
      );
    }

    // Use itemIndex if provided (for proper alternating in filtered arrays), otherwise find index
    const index = itemIndex !== null ? itemIndex : achievements.findIndex(a => a.id === achievement.id);
    const bgStyle = index % 2 === 0 
      ? 'from-[#f0f8fa] to-[#e6f3f8]' 
      : 'from-gray-50 to-gray-100';

    return (
      <div 
        key={achievement.id} 
        className={`flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 md:gap-3 p-3 md:p-5 rounded-lg md:rounded-xl transition-all duration-300 hover:shadow-lg border-2 border-gray-200 hover:border-[#3c80a7] bg-gradient-to-r min-w-0 ${bgStyle}`}
      >
        <div className="flex items-start space-x-2 md:space-x-3 flex-1 min-w-0">
          <Award className="h-5 w-5 md:h-6 md:w-6 text-yellow-500 mt-0.5 md:mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm md:text-base md:text-lg font-bold text-gray-900 mb-1 md:mb-2 break-words line-clamp-2" title={achievement.title}>{achievement.title}</h4>
            <p className="text-xs md:text-sm md:text-base text-gray-700 leading-relaxed break-words line-clamp-3 md:line-clamp-none">{achievement.description}</p>
          </div>
        </div>
        <div className="flex-shrink-0 flex space-x-2 self-end sm:self-auto">
          {achievement.hasCertificate && (
            <button
              onClick={() => handleViewCertificate(achievement)}
              className="flex items-center px-2 py-1 rounded border border-[#3c80a7] bg-blue-300 text-black hover:bg-[#3c80a7] hover:text-white text-xs sm:text-sm touch-manipulation"
            >
              <Eye className="h-4 w-4 mr-0" />
            </button>
          )}
          <button
            onClick={() => startEditing(achievement)}
            disabled={isAdminView}
            className={`text-gray-600 transition touch-manipulation p-1 ${
              isAdminView ? 'cursor-not-allowed' : 'hover:text-blue-600'
            }`}
            title={isAdminView ? 'Admin view - cannot edit achievements' : `Edit ${achievement.hasCertificate ? 'certification' : 'achievement'}`}
          >
            <Edit2 size={15} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Scrollbar styles */}
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

      <div className="w-full relative space-y-4 md:space-y-6 min-w-0">
        {/* Error Message */}
        {error && (
          <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs md:text-sm break-words">
            {error}
          </div>
        )}
        {/* Success Message */}
        {success && (
          <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-xs md:text-sm">
            {success}
          </div>
        )}
        {/* Awards & Achievements */}
        <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-3 md:pb-5 px-3 md:px-6 transition-all duration-200 shadow-lg min-w-0 overflow-hidden">
          <legend className="text-base md:text-lg md:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
            Awards & Achievements
          </legend>

          <div className="flex justify-end mb-2 md:mb-4 mr-0 md:mr-[-1%]">
            <button
              onClick={() => addNewAchievement(false)}
              disabled={isAdminView}
              aria-label="Add new award"
              className={`rounded-full p-1.5 md:p-2 shadow transition touch-manipulation ${
                isAdminView 
                  ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                  : isAwardAddButtonActive 
                  ? 'bg-[#5e9ad6] hover:bg-[#4a7bb8]' 
                  : 'bg-[#8ec5ff] hover:bg-[#5e9ad6]'
              }`}
              title={isAdminView ? 'Admin view - cannot add awards' : 'Add new award'}
            >
              <Plus size={18} className="text-white" />
            </button>
          </div>

          <div className="space-y-2 md:space-y-3 pb-3 md:pb-4 pr-1 md:pr-2 max-h-[min(300px,60vh)] overflow-y-auto custom-scrollbar">
            {/* Add new award form when editing */}
            {editingId === 'new' && !editedAchievement.hasCertificate && (
              <div className="bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8] rounded-lg p-3 md:p-4">
                <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Award Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editedAchievement.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Enter award title"
                  className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                />
                <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Description <span className="text-red-500">*</span></label>
                <textarea
                  value={editedAchievement.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="Enter award description"
                  rows={2}
                  className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded resize-none min-w-0"
                />
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={saveAchievement}
                    className="px-2.5 py-1.5 md:px-3 md:py-1 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 touch-manipulation"
                    disabled={loading}
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
            {/* SAFE: Always render if array exists, even if empty */}
            {Array.isArray(awardsAndAchievements) && awardsAndAchievements.map((achievement, index) => renderItem(achievement, index))}
          </div>
        </fieldset>

        {/* Certifications */}
        <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-3 md:pb-4 px-3 md:px-6 transition-all duration-200 shadow-lg min-w-0 overflow-hidden">
          <legend className="text-base md:text-lg md:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
            Certifications
          </legend>

          <div className="flex justify-end mb-2 md:mb-3 mr-0 md:mr-[-1%]">
            <button
              onClick={() => addNewAchievement(true)}
              disabled={isAdminView}
              aria-label="Add new certificate"
              className={`rounded-full p-1.5 md:p-2 shadow transition touch-manipulation ${
                isAdminView 
                  ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                  : isCertAddButtonActive 
                  ? 'bg-[#5e9ad6] hover:bg-[#4a7bb8]' 
                  : 'bg-[#8ec5ff] hover:bg-[#5e9ad6]'
              }`}
              title={isAdminView ? 'Admin view - cannot add certificates' : 'Add new certificate'}
            >
              <Plus size={18} className="text-white" />
            </button>
          </div>

          <div className="space-y-2 md:space-y-3 pb-3 md:pb-4 pr-1 md:pr-2 max-h-[min(300px,60vh)] overflow-y-auto custom-scrollbar">
            {/* Add new certificate form when editing */}
            {editingId === 'new' && editedAchievement.hasCertificate && (
              <div className="bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8] rounded-lg p-3 md:p-4">
                <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Certification Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editedAchievement.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Enter certification title"
                  className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                />
                <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Description <span className="text-red-500">*</span></label>
                <textarea
                  value={editedAchievement.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="Enter certification description"
                  rows={2}
                  className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded resize-none min-w-0"
                />
                <label className="text-xs md:text-sm font-semibold text-black mb-0.5 md:mb-1 block">Certificate URL</label>
                <input
                  type="url"
                  value={editedAchievement.certificateUrl}
                  onChange={e => handleChange('certificateUrl', e.target.value)}
                  placeholder="https://example.com/certificate"
                  className="w-full mb-1.5 md:mb-2 px-2 py-1.5 md:py-1 text-sm md:text-base border border-gray-300 rounded min-w-0"
                />
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={saveAchievement}
                    className="px-2.5 py-1.5 md:px-3 md:py-1 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 touch-manipulation"
                    disabled={loading}
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
            {/* SAFE: Always render if array exists, even if empty */}
            {Array.isArray(certificates) && certificates.map((certificate, index) => renderItem(certificate, index))}
          </div>
        </fieldset>
      </div>
    </>
  );
};

export default Achievements;
