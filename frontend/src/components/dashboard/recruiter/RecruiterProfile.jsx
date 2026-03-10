import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { User, Camera, Image as ImageIcon, Mail, XCircle, Building2, Phone, MapPin, Globe, FileText, Edit, Save, X } from 'lucide-react';

export default function RecruiterProfile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [showFloatingAlert, setShowFloatingAlert] = useState(false);
  
  // Company Registration Details
  const [companyDetails, setCompanyDetails] = useState({
    companyName: '',
    registrationNumber: '',
    email: '',
    phone: '',
    address: '',
    website: ''
  });
  const [companyId, setCompanyId] = useState(null);
  const [editingCompanyDetails, setEditingCompanyDetails] = useState(false);
  const [savingCompanyDetails, setSavingCompanyDetails] = useState(false);

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
    loadCompanyDetails();
  }, [loadProfile]);

  // Load company details
  const loadCompanyDetails = useCallback(async () => {
    if (!user?.id) return;

    try {
      const userData = await api.getCurrentUser();
      const recruiter = userData.user?.recruiter;
      const company = recruiter?.company;
      
      setCompanyId(company?.id || null);
      
      // Parse additional info from description if it's JSON
      let additionalInfo = {};
      if (company?.description) {
        try {
          additionalInfo = JSON.parse(company.description);
        } catch (e) {
          // Description is not JSON, ignore
        }
      }
      
      setCompanyDetails({
        companyName: company?.name || recruiter?.companyName || '',
        registrationNumber: additionalInfo.registrationNumber || '',
        email: additionalInfo.email || userData.user?.email || '',
        phone: additionalInfo.phone || '',
        address: company?.location || recruiter?.location || '',
        website: company?.website || ''
      });
    } catch (error) {
      console.error('Error loading company details:', error);
    }
  }, [user?.id]);

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
    return await api.put('/auth/profile', data);
  };

  // Handle save company details
  const handleSaveCompanyDetails = async () => {
    if (!companyDetails.companyName.trim()) {
      setAlertMessage('Company name is required');
      setAlertType('error');
      setShowFloatingAlert(true);
      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
      }, 4000);
      return;
    }

    try {
      setSavingCompanyDetails(true);
      
      // Update company details via API
      const updateData = {
        companyName: companyDetails.companyName.trim(),
        website: companyDetails.website.trim() || null,
        address: companyDetails.address.trim() || null,
        registrationNumber: companyDetails.registrationNumber.trim() || null,
        phone: companyDetails.phone.trim() || null,
        email: companyDetails.email.trim() || null,
      };

      await api.put('/auth/company-details', updateData);
      
      setAlertMessage('Company details updated successfully');
      setAlertType('success');
      setEditingCompanyDetails(false);
      setShowFloatingAlert(true);
      
      await loadCompanyDetails();
      
      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
      }, 4000);
    } catch (error) {
      console.error('Error saving company details:', error);
      setAlertMessage(error.message || 'Failed to update company details. Please try again.');
      setAlertType('error');
      setShowFloatingAlert(true);
      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
      }, 4000);
    } finally {
      setSavingCompanyDetails(false);
    }
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
                {profilePhoto && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to remove your profile photo? It will revert to the default photo.')) {
                        return;
                      }

                      try {
                        await updateProfile({ profilePhoto: null });
                        setProfilePhoto('');
                        setAlertMessage('Profile photo removed successfully!');
                        setAlertType('success');
                        setShowFloatingAlert(true);
                        
                        // Dispatch event to update navbar
                        window.dispatchEvent(new CustomEvent('profileUpdated', {
                          detail: { userId: user.id }
                        }));
                        
                        // Reload profile
                        await loadProfile();
                        
                        setTimeout(() => {
                          setShowFloatingAlert(false);
                          setAlertMessage(null);
                        }, 4000);
                      } catch (err) {
                        console.error('Error deleting profile image:', err);
                        let errorMessage = 'Failed to remove profile photo';
                        if (err.message) {
                          errorMessage = err.message;
                        }
                        setAlertMessage(errorMessage);
                        setAlertType('error');
                        setShowFloatingAlert(true);
                        setTimeout(() => {
                          setShowFloatingAlert(false);
                          setAlertMessage(null);
                        }, 4000);
                      }
                    }}
                    className="absolute top-2.5 right-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10 -translate-x-1/2"
                    title="Remove profile photo"
                  >
                    <XCircle size={14} className="text-white" />
                  </button>
                )}
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

      {/* Company Registration Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} />
            Company Registration Details
          </h2>
          {!editingCompanyDetails ? (
            <button
              onClick={() => setEditingCompanyDetails(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit size={16} />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveCompanyDetails}
                disabled={savingCompanyDetails}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {savingCompanyDetails ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingCompanyDetails(false);
                  loadCompanyDetails(); // Reload original data
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            {editingCompanyDetails ? (
              <input
                type="text"
                value={companyDetails.companyName}
                onChange={(e) => setCompanyDetails({ ...companyDetails, companyName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            ) : (
              <p className="text-gray-900">{companyDetails.companyName || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
            {editingCompanyDetails ? (
              <input
                type="text"
                value={companyDetails.registrationNumber}
                onChange={(e) => setCompanyDetails({ ...companyDetails, registrationNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter registration number"
              />
            ) : (
              <p className="text-gray-900">{companyDetails.registrationNumber || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail size={16} />
              Email
            </label>
            {editingCompanyDetails ? (
              <input
                type="email"
                value={companyDetails.email}
                onChange={(e) => setCompanyDetails({ ...companyDetails, email: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Company email"
              />
            ) : (
              <p className="text-gray-900">{companyDetails.email || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone size={16} />
              Phone
            </label>
            {editingCompanyDetails ? (
              <input
                type="tel"
                value={companyDetails.phone}
                onChange={(e) => setCompanyDetails({ ...companyDetails, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Company phone number"
              />
            ) : (
              <p className="text-gray-900">{companyDetails.phone || 'Not set'}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Address
            </label>
            {editingCompanyDetails ? (
              <textarea
                value={companyDetails.address}
                onChange={(e) => setCompanyDetails({ ...companyDetails, address: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Company address"
              />
            ) : (
              <p className="text-gray-900">{companyDetails.address || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Globe size={16} />
              Website
            </label>
            {editingCompanyDetails ? (
              <input
                type="url"
                value={companyDetails.website}
                onChange={(e) => setCompanyDetails({ ...companyDetails, website: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            ) : (
              <p className="text-gray-900">
                {companyDetails.website ? (
                  <a href={companyDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {companyDetails.website}
                  </a>
                ) : (
                  'Not set'
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

