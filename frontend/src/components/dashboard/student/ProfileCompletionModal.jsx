import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { showError, showSuccess } from '../../../utils/toast';
import CustomDropdown from '../../common/CustomDropdown';
import { FaGraduationCap, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';

export default function ProfileCompletionModal({ isOpen, onSaved }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [school, setSchool] = useState('');
  const [center, setCenter] = useState('');
  const [batch, setBatch] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen || !user) return;

    let cancelled = false;

    // Prefill email instantly from auth context so it doesn't wait for API
    setEmail(user.email || '');

    const load = async () => {
      try {
        const profile = await api.getStudentProfile();
        if (cancelled || !profile) return;
        const emailVal = profile.email || user.email || '';
        setEmail(emailVal);
        // Don't prefill name with email — if fullName is missing or is the email, leave name empty
        const nameVal = (profile.fullName || '').trim();
        const isEmailAsName = !nameVal || nameVal === emailVal || nameVal.includes('@');
        setFullName(isEmailAsName ? '' : nameVal);
        setPhone(profile.phone || '');
        setEnrollmentId(profile.enrollmentId || '');
        setSchool(profile.school || '');
        setCenter(profile.center || '');
        setBatch(profile.batch || '');
      } catch (e) {
        // Non-fatal, fields remain empty
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const validate = () => {
    const fieldErrors = {};
    if (!phone.trim()) {
      fieldErrors.phone = 'Phone is required';
    } else if (!/^\d{7,15}$/.test(phone.trim())) {
      fieldErrors.phone = 'Phone must be numeric';
    }
    if (!enrollmentId.trim()) fieldErrors.enrollmentId = 'Enrollment ID is required';
    if (!school.trim()) fieldErrors.school = 'School is required';
    if (!center.trim()) fieldErrors.center = 'Center is required';
    if (!batch.trim()) fieldErrors.batch = 'Batch is required';
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const hasAllRequired =
    phone.trim().length > 0 &&
    /^\d{7,15}$/.test(phone.trim()) &&
    enrollmentId.trim().length > 0 &&
    !!school &&
    !!center &&
    !!batch;

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.updateStudentProfile({
        fullName: fullName || user?.displayName || user?.email,
        email,
        phone,
        enrollmentId,
        school,
        center,
        batch,
      });

      // Let AuthContext know user profile changed so /auth/me is re-fetched
      if (user?.id) {
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { userId: user.id } }));
      }

      showSuccess('Profile completed successfully.');
      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      const backend = error?.response?.data;

      // Handle unique enrollmentId error explicitly
      if (backend?.field === 'enrollmentId') {
        setErrors((prev) => ({
          ...prev,
          enrollmentId: 'This enrollment ID is already used by another student.',
        }));
        showError('Enrollment ID already exists. Please use a different one.');
      } else {
        const message =
          backend?.error ||
          error?.message ||
          'Failed to update profile. Please try again.';
        showError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 md:bg-white md:backdrop-blur-0 md:items-start md:pt-8"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-xl rounded-2xl bg-gradient-to-br from-white via-[#f5f7ff] to-[#eef7ff] shadow-2xl p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-blue-100 bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#3b82f6]">
          <p className="text-xs font-medium tracking-wide text-blue-100 uppercase mb-1">
            First-time setup
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Complete your profile to continue
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-blue-100/90">
            This takes less than a minute and unlocks personalized job opportunities for you.
          </p>
        </div>

        {/* Form / Content */}
        <div className="px-6 sm:px-8 pb-6 pt-4 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Personal info */}
          <div className="space-y-3 rounded-xl bg-white/80 border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Personal information
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="10–15 digit phone number"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Enrollment ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={enrollmentId}
                  onChange={(e) => setEnrollmentId(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.enrollmentId ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="Your enrollment ID"
                />
                {errors.enrollmentId && (
                  <p className="mt-1 text-xs text-red-600">{errors.enrollmentId}</p>
                )}
              </div>
            </div>
          </div>

          {/* Academic info */}
          <div className="space-y-3 rounded-xl bg-white/80 border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Academic information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <CustomDropdown
                  label={
                    <>
                      School <span className="text-red-500">*</span>
                    </>
                  }
                  icon={FaGraduationCap}
                  iconColor="text-purple-600"
                  options={[
                    { value: '', label: 'Select School' },
                    { value: 'SOT', label: 'School of Technology' },
                    { value: 'SOM', label: 'School of Management' },
                    { value: 'SOH', label: 'School of HealthCare' }
                  ]}
                  value={school}
                  onChange={(value) => setSchool(value)}
                  placeholder="Select School"
                />
                {errors.school && (
                  <p className="mt-1 text-xs text-red-600">{errors.school}</p>
                )}
              </div>

              <div>
                <CustomDropdown
                  label={
                    <>
                      Center <span className="text-red-500">*</span>
                    </>
                  }
                  icon={FaMapMarkerAlt}
                  iconColor="text-blue-600"
                  options={[
                    { value: '', label: 'Select Center' },
                    { value: 'BANGALORE', label: 'Bangalore' },
                    { value: 'NOIDA', label: 'Noida' },
                    { value: 'LUCKNOW', label: 'Lucknow' },
                    { value: 'PUNE', label: 'Pune' },
                    { value: 'PATNA', label: 'Patna' },
                    { value: 'INDORE', label: 'Indore' }
                  ]}
                  value={center}
                  onChange={(value) => setCenter(value)}
                  placeholder="Select Center"
                />
                {errors.center && (
                  <p className="mt-1 text-xs text-red-600">{errors.center}</p>
                )}
              </div>

              <div>
                <CustomDropdown
                  label={
                    <>
                      Batch <span className="text-red-500">*</span>
                    </>
                  }
                  icon={FaUsers}
                  iconColor="text-indigo-600"
                  options={[
                    { value: '', label: 'Select Batch' },
                    { value: '25-29', label: '25-29' },
                    { value: '24-28', label: '24-28' },
                    { value: '23-27', label: '23-27' }
                  ]}
                  value={batch}
                  onChange={(value) => setBatch(value)}
                  placeholder="Select Batch"
                />
                {errors.batch && (
                  <p className="mt-1 text-xs text-red-600">{errors.batch}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer (sticky on mobile) */}
        <div className="px-6 sm:px-8 pb-5 pt-2 flex justify-end border-t border-gray-100 bg-white/80">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasAllRequired}
            className={`inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors ${
              saving || !hasAllRequired
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-900 hover:bg-blue-800'
            }`}
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>

      </div>
    </div>
  );
}

