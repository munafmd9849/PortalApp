import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { API_BASE_URL } from '../../../config/api';
import { User, Camera, Image as ImageIcon, Mail } from 'lucide-react';

export default function RecruiterProfile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [showFloatingAlert, setShowFloatingAlert] = useState(false);

  // Load current user profile
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const userData = await api.getCurrentUser();
      setDisplayName(userData.user?.displayName || '');
      setProfilePhoto(userData.user?.profilePhoto || '');
    } catch (error) {
      console.error('Error loading recruiter profile:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Handle save profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setAlertMessage('Display name is required');
      setAlertType('error');
      setShowFloatingAlert(true);
      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
      }, 4000);
      return;
    }

    try {
      setSaving(true);

      // Update user profile via API
      const updateData = {
        displayName: displayName.trim(),
        profilePhoto: profilePhoto.trim() || null,
      };

      // Call API to update user
      const response = await updateProfile(updateData);

      // Show success message
      setAlertMessage('Profile updated successfully');
      setAlertType('success');
      setShowFloatingAlert(true);

      // Update local state immediately for instant feedback
      if (response?.user) {
        setDisplayName(response.user.displayName || '');
        setProfilePhoto(response.user.profilePhoto || '');
      }

      // Dispatch event immediately to update navbar and AuthContext
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: { userId: user.id }
      }));

      // Reload profile to ensure we have latest data
      await loadProfile();

      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
      }, 4000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setAlertMessage(error.message || 'Failed to update profile');
      setAlertType('error');
      setShowFloatingAlert(true);
      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
      }, 4000);
    } finally {
      setSaving(false);
    }
  };

  // Use api service directly
  const updateProfile = async (data) => {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update profile' }));
      throw new Error(error.error || error.message || 'Failed to update profile');
    }

    return response.json();
  };

  return (
    <div className="space-y-6">
      {/* Floating Alert */}
      {showFloatingAlert && (
        <div
          className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300 ${
            alertType === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          <span>{alertMessage}</span>
          <button
            onClick={() => {
              setShowFloatingAlert(false);
              setAlertMessage(null);
            }}
            className="text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
          <div className="text-sm text-gray-500">
            Fields marked with <span className="text-red-500">*</span> are required
          </div>
        </div>

        <form className="space-y-8" onSubmit={handleSaveProfile}>
          {/* Profile Photo Section */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
            <div className="flex items-start gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ImageIcon size={16} className="text-blue-600" />
                  Profile Photo
                </label>
              </div>
              <div className="relative group flex-shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg bg-gray-100 flex items-center justify-center">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-gray-400" />
                  )}
                </div>
                <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <Camera size={24} className="text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => setProfilePhoto(e.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <User size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User size={16} className="text-gray-500" />
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail size={16} className="text-gray-500" />
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 cursor-not-allowed"
                  value={user?.email || ''}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                loadProfile();
              }}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

