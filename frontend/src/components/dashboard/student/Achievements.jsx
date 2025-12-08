import React, { useState, useEffect, useRef } from 'react';
import { Award, Eye, Edit2, Plus } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { addAchievementArray, updateAchievementArray, deleteAchievementArray, getStudentProfile } from '../../../services/students';

const Achievements = () => {
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
        const profile = await getStudentProfile(user.id);
        if (isMounted) {
          const achievementsArray = profile?.achievements || [];
          const certificationsArray = profile?.certifications || [];
          setAchievements([...achievementsArray, ...certificationsArray]);
        }
      } catch (error) {
        console.error('Error loading achievements:', error);
        if (isMounted) {
          setError('Failed to load achievements');
          setAchievements([]);
          // Reset on error to allow retry
          achievementsLoadedRef.current = false;
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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

  // Split groups
  const certificates = achievements.filter(item => item.hasCertificate);
  const awardsAndAchievements = achievements.filter(item => !item.hasCertificate);

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
          className="bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8] rounded-lg p-4"
        >
          <input
            type="text"
            value={editedAchievement.title}
            onChange={e => setEditedAchievement(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Title"
            className="w-full mb-2 px-2 py-1 border border-gray-300 rounded"
          />
          <textarea
            value={editedAchievement.description}
            onChange={e => setEditedAchievement(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
            rows={3}
            className="w-full mb-2 px-2 py-1 border border-gray-300 rounded resize-none"
          />
          {achievement.hasCertificate && (
            <input
              type="url"
              value={editedAchievement.certificateUrl}
              onChange={e => setEditedAchievement(prev => ({ ...prev, certificateUrl: e.target.value }))}
              placeholder="Certificate URL"
              className="w-full mb-2 px-2 py-1 border border-gray-300 rounded"
            />
          )}
          <div className="flex space-x-2 justify-end">
            <button
              onClick={saveAchievement}
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={cancelEditing}
              className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteAchievement(achievement.id)}
              className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
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
        className={`flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 p-3 sm:p-4 rounded-lg transition-all duration-200 hover:shadow-md bg-gradient-to-r ${bgStyle}`}
      >
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <Award className="h-5 w-5 text-yellow-400 mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-base sm:text-lg font-bold text-black mb-1 break-words">{achievement.title}</h4>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words">{achievement.description}</p>
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
            className="text-gray-600 hover:text-blue-600 transition touch-manipulation p-1"
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

      <div className="w-full relative space-y-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
            {success}
          </div>
        )}
        {/* Awards & Achievements */}
        <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-5 px-4 sm:px-6 transition-all duration-200 shadow-lg">
          <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
            Awards & Achievements
          </legend>

          <div className="flex justify-end mb-4 mr-[-1%]">
            <button
              onClick={() => addNewAchievement(false)}
              aria-label="Add new award"
              className={`rounded-full p-2 shadow transition ${
                isAwardAddButtonActive 
                  ? 'bg-[#5e9ad6] hover:bg-[#4a7bb8]' 
                  : 'bg-[#8ec5ff] hover:bg-[#5e9ad6]'
              }`}
            >
              <Plus size={18} className="text-white" />
            </button>
          </div>

          <div
            className={`space-y-3 pb-4 ${
              awardsAndAchievements.length > 0
                ? "max-h-[300px] overflow-y-auto custom-scrollbar pr-2"
                : ""
            }`}
          >
            {/* Add new award form when editing */}
            {editingId === 'new' && !editedAchievement.hasCertificate && (
              <div className="bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8] rounded-lg p-4">
                <input
                  type="text"
                  value={editedAchievement.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Award Title *"
                  className="w-full mb-2 px-2 py-1 border border-gray-300 rounded"
                />
                <textarea
                  value={editedAchievement.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="Award Description *"
                  rows={3}
                  className="w-full mb-2 px-2 py-1 border border-gray-300 rounded resize-none"
                />
                <div className="flex space-x-2 justify-end">
                  <button
                    onClick={saveAchievement}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {awardsAndAchievements.map((achievement, index) => renderItem(achievement, index))}
          </div>
        </fieldset>

        {/* Certifications */}
        <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-4 px-4 sm:px-6 transition-all duration-200 shadow-lg">
          <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
            Certifications
          </legend>

          <div className="flex justify-end mb-3 mr-[-1%]">
            <button
              onClick={() => addNewAchievement(true)}
              aria-label="Add new certificate"
              className={`rounded-full p-2 shadow transition ${
                isCertAddButtonActive 
                  ? 'bg-[#5e9ad6] hover:bg-[#4a7bb8]' 
                  : 'bg-[#8ec5ff] hover:bg-[#5e9ad6]'
              }`}
            >
              <Plus size={18} className="text-white" />
            </button>
          </div>

          <div
            className={`space-y-3 pb-4 ${
              certificates.length > 0
                ? "max-h-[300px] overflow-y-auto custom-scrollbar pr-2"
                : ""
            }`}
          >
            {/* Add new certificate form when editing */}
            {editingId === 'new' && editedAchievement.hasCertificate && (
              <div className="bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8] rounded-lg p-4">
                <input
                  type="text"
                  value={editedAchievement.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Title *"
                  className="w-full mb-2 px-2 py-1 border border-gray-300 rounded"
                />
                <textarea
                  value={editedAchievement.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="Description *"
                  rows={3}
                  className="w-full mb-2 px-2 py-1 border border-gray-300 rounded resize-none"
                />
                <input
                  type="url"
                  value={editedAchievement.certificateUrl}
                  onChange={e => handleChange('certificateUrl', e.target.value)}
                  placeholder="Certificate URL"
                  className="w-full mb-2 px-2 py-1 border border-gray-300 rounded"
                />
                <div className="flex space-x-2 justify-end">
                  <button
                    onClick={saveAchievement}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {certificates.map((certificate, index) => renderItem(certificate, index))}
          </div>
        </fieldset>
      </div>
    </>
  );
};

export default Achievements;
