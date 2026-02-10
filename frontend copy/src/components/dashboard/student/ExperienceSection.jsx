/**
 * Experience Section Component
 * User-friendly interface for managing work experience
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { getStudentProfile } from '../../../services/students';

const ExperienceSection = () => {
  const { user } = useAuth();
  const [experiences, setExperiences] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isAddButtonActive, setIsAddButtonActive] = useState(false);
  const [editedExperience, setEditedExperience] = useState({
    title: '',
    company: '',
    start: '',
    end: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const experiencesLoadedRef = useRef(false);

  // Load experiences data once on mount
  useEffect(() => {
    if (!user?.id) return;
    
    if (experiencesLoadedRef.current) return;

    let isMounted = true;
    experiencesLoadedRef.current = true;

    const loadExperiences = async () => {
      try {
        setLoading(true);
        const profile = await getStudentProfile(user.id);
        if (isMounted) {
          const realExperiences = profile?.experiences || [];
          setExperiences(Array.isArray(realExperiences) ? realExperiences : []);
        }
      } catch (error) {
        console.error('Error loading experiences:', error);
        if (isMounted) {
          setError('Failed to load experiences. Please try again.');
          setExperiences([]);
          experiencesLoadedRef.current = false;
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadExperiences();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const startEditing = (index) => {
    setEditingIndex(index);
    const exp = experiences[index];
    setEditedExperience({
      title: exp.title || '',
      company: exp.company || '',
      start: exp.start || '',
      end: exp.end || '',
      description: exp.description || ''
    });
  };

  const handleChange = (field, value) => {
    setEditedExperience((prev) => ({ ...prev, [field]: value }));
  };

  const saveExperience = async () => {
    if (!editedExperience.title.trim() || !editedExperience.company.trim()) {
      setError('Please fill in title and company.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const experienceData = {
        title: editedExperience.title.trim(),
        company: editedExperience.company.trim(),
        start: editedExperience.start.trim(),
        end: editedExperience.end.trim() || null,
        description: editedExperience.description.trim() || null
      };

      if (editingIndex !== null && editingIndex < experiences.length) {
        // Update existing experience
        const existingExp = experiences[editingIndex];
        await api.updateExperience(existingExp.id, experienceData);
        setSuccess('Experience updated successfully!');
      } else {
        // Add new experience
        await api.addExperience(experienceData);
        setSuccess('Experience added successfully!');
      }

      // Refresh experiences list after save
      const profile = await getStudentProfile(user.id);
      setExperiences(profile?.experiences || []);

      setEditingIndex(null);
      setIsAddButtonActive(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving experience:', error);
      setError('Failed to save experience. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExperience = async (index) => {
    const exp = experiences[index];
    if (!window.confirm(`Are you sure you want to delete "${exp.title} at ${exp.company}"?`)) return;

    try {
      setLoading(true);
      await api.deleteExperience(exp.id);
      
      // Refresh experiences list after delete
      const profile = await getStudentProfile(user.id);
      setExperiences(profile?.experiences || []);
      
      setSuccess('Experience deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);

      if (editingIndex === index) {
        setEditingIndex(null);
      }
    } catch (error) {
      console.error('Error deleting experience:', error);
      setError('Failed to delete experience. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addNewExperience = () => {
    const isCurrentlyAdding = editingIndex === experiences.length;
    if (isCurrentlyAdding) {
      setEditingIndex(null);
      setIsAddButtonActive(false);
    } else {
      setEditingIndex(experiences.length);
      setEditedExperience({ title: '', company: '', start: '', end: '', description: '' });
      setIsAddButtonActive(true);
    }
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setIsAddButtonActive(false);
    setError('');
  };

  return (
    <div className="w-full relative">
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-4 px-6 transition-all duration-200 shadow-lg">
        <legend className="text-xl font-bold bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text px-2 flex items-center gap-2">
          <Briefcase size={20} />
          Work Experience
        </legend>

        <div className="flex justify-end mb-3 mr-[-1%]">
          <button
            onClick={addNewExperience}
            aria-label="Add new experience"
            className={`rounded-full p-2 shadow transition disabled:opacity-50 ${
              isAddButtonActive 
                ? 'bg-[#5e9ad6] hover:bg-[#4a7bb8]' 
                : 'bg-[#8ec5ff] hover:bg-[#5e9ad6]'
            }`}
            disabled={loading}
          >
            <Plus size={18} className="text-white" />
          </button>
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

        <div className="my-2">
          <div className="space-y-2 pr-2 custom-scrollbar" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {/* Add new experience form */}
            {editingIndex === experiences.length && (
              <div className="rounded-lg px-4 py-3 bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8]">
                <input
                  type="text"
                  value={editedExperience.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Job Title *"
                  className="w-full mb-2 px-2 py-1 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={editedExperience.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder="Company Name *"
                  className="w-full mb-2 px-2 py-1 border border-gray-300 rounded"
                />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={editedExperience.start}
                    onChange={(e) => handleChange('start', e.target.value)}
                    placeholder="Start Date (e.g., Jan 2023)"
                    className="px-2 py-1 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    value={editedExperience.end}
                    onChange={(e) => handleChange('end', e.target.value)}
                    placeholder="End Date (or leave blank for current)"
                    className="px-2 py-1 border border-gray-300 rounded"
                  />
                </div>
                <textarea
                  value={editedExperience.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Job Description (optional)"
                  rows={3}
                  className="w-full mb-2 px-2 py-1 border border-gray-300 rounded resize-none"
                />
                <div className="flex space-x-2 justify-end">
                  <button
                    onClick={saveExperience}
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

            {experiences.map((exp, index) => (
              editingIndex === index ? (
                <div
                  key={index}
                  className="rounded-lg px-4 py-3 bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8]"
                >
                  <input
                    type="text"
                    value={editedExperience.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Job Title *"
                    className="w-full mb-2 px-2 py-1 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    value={editedExperience.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="Company Name *"
                    className="w-full mb-2 px-2 py-1 border border-gray-300 rounded"
                  />
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={editedExperience.start}
                      onChange={(e) => handleChange('start', e.target.value)}
                      placeholder="Start Date"
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                    <input
                      type="text"
                      value={editedExperience.end}
                      onChange={(e) => handleChange('end', e.target.value)}
                      placeholder="End Date"
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>
                  <textarea
                    value={editedExperience.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Job Description"
                    rows={3}
                    className="w-full mb-2 px-2 py-1 border border-gray-300 rounded resize-none"
                  />
                  <div className="flex space-x-2 justify-end">
                    <button
                      onClick={saveExperience}
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
                      onClick={() => handleDeleteExperience(index)}
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
                  className={`rounded-lg px-4 py-3 transition-all duration-200 hover:shadow-md bg-gradient-to-r ${
                    index % 2 !== 0 ? 'from-gray-50 to-gray-100' : 'from-[#f0f8fa] to-[#e6f3f8]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h4 className="text-xl font-bold text-black">{exp.title}</h4>
                      <p className="text-md text-gray-700 font-semibold">{exp.company}</p>
                      <p className="text-sm text-gray-600 italic">
                        {exp.start} - {exp.end || 'Present'}
                      </p>
                    </div>
                    <button
                      onClick={() => startEditing(index)}
                      aria-label={`Edit experience ${exp.title}`}
                      className="text-gray-600 hover:text-blue-600 transition disabled:opacity-50"
                      disabled={loading}
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>
                  
                  {exp.description && (
                    <p className="text-md text-gray-700 pl-3 mt-2">
                      {exp.description}
                    </p>
                  )}
                </div>
              )
            ))}

            {experiences.length === 0 && editingIndex !== 0 && (
              <div className="text-center py-8 text-gray-500">
                <Briefcase size={48} className="mx-auto mb-2 opacity-50" />
                <p>No work experience added yet. Click the + button to add your first experience.</p>
              </div>
            )}
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default ExperienceSection;

