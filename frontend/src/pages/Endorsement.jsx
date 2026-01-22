/**
 * Public Endorsement Page
 * Magic Link Based - No login required for teachers
 * Route: /endorse/:token
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Star,
  Send,
  AlertCircle,
  User,
  Mail,
  Building2,
  GraduationCap,
  Briefcase,
  Award,
  FileText
} from 'lucide-react';
import CustomDropdown from '../components/common/CustomDropdown';

const EndorsementPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [endorsementData, setEndorsementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    endorserName: '',
    endorserRole: '',
    organization: '',
    relationship: '',
    context: '',
    endorsementMessage: '',
    relatedSkills: [],
    skillRatings: {}, // Object mapping skill -> rating (1-5)
    strengthRating: null, // Overall rating (1-5)
    consent: false,
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [skillInput, setSkillInput] = useState('');
  
  // Relationship options
  const relationshipOptions = [
    { value: 'Professor', label: 'Professor' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Mentor', label: 'Mentor' },
    { value: 'Guide', label: 'Guide' },
    { value: 'Supervisor', label: 'Supervisor' },
    { value: 'Colleague', label: 'Colleague' }
  ];

  // Organization options (PW-IOI Campuses)
  const organizationOptions = [
    { value: 'PW-IOI - Bangalore', label: 'PW-IOI - Bangalore' },
    { value: 'PW-IOI - Pune', label: 'PW-IOI - Pune' },
    { value: 'PW-IOI - Noida', label: 'PW-IOI - Noida' },
    { value: 'PW-IOI - Lucknow', label: 'PW-IOI - Lucknow' },
    { value: 'PW-IOI - Indore', label: 'PW-IOI - Indore' },
    { value: 'PW-IOI - Delhi', label: 'PW-IOI - Delhi' }
  ];

  // Available skills (can be enhanced later)
  const commonSkills = [
    'Problem Solving', 'Communication', 'Leadership', 'Teamwork',
    'Technical Skills', 'Analytical Thinking', 'Creativity', 'Time Management',
    'Adaptability', 'Critical Thinking', 'Project Management', 'Research',
  ];

  // Load endorsement request data
  useEffect(() => {
    const fetchEndorsement = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await api.getEndorsementByToken(token);
        setEndorsementData(data);
      } catch (err) {
        console.error('Error fetching endorsement:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchEndorsement();
    }
  }, [token]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle skill input
  const handleSkillInput = (e) => {
    setSkillInput(e.target.value);
  };

  // Add skill
  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !formData.relatedSkills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        relatedSkills: [...prev.relatedSkills, skill],
      }));
      setSkillInput('');
    }
  };

  // Remove skill
  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      relatedSkills: prev.relatedSkills.filter(s => s !== skillToRemove),
    }));
  };

  // Handle skill selection from common skills
  const toggleCommonSkill = (skill) => {
    if (formData.relatedSkills.includes(skill)) {
      removeSkill(skill);
    } else {
      setFormData(prev => ({
        ...prev,
        relatedSkills: [...prev.relatedSkills, skill],
      }));
    }
  };

  // Handle strength rating
  const handleRatingClick = (rating) => {
    setFormData(prev => ({
      ...prev,
      strengthRating: prev.strengthRating === rating ? null : rating,
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Required: Endorser Name
    if (!formData.endorserName.trim()) {
      errors.endorserName = 'Your name is required';
    } else if (formData.endorserName.trim().length < 2) {
      errors.endorserName = 'Name must be at least 2 characters';
    }

    // Required: Endorser Role
    if (!formData.endorserRole.trim()) {
      errors.endorserRole = 'Your role/designation is required';
    } else if (formData.endorserRole.trim().length < 2) {
      errors.endorserRole = 'Role must be at least 2 characters';
    }

    // Required: Organization
    if (!formData.organization.trim()) {
      errors.organization = 'Organization is required';
    } else if (formData.organization.trim().length < 2) {
      errors.organization = 'Organization must be at least 2 characters';
    }

    // Required: Relationship
    if (!formData.relationship) {
      errors.relationship = 'Relationship with student is required';
    }

    // Required: Endorsement Message
    if (!formData.endorsementMessage.trim()) {
      errors.endorsementMessage = 'Endorsement message is required';
    } else if (formData.endorsementMessage.trim().length < 10) {
      errors.endorsementMessage = 'Endorsement message must be at least 10 characters';
    } else if (formData.endorsementMessage.trim().length > 2000) {
      errors.endorsementMessage = 'Endorsement message must not exceed 2000 characters';
    }

    // Required: Consent
    if (!formData.consent) {
      errors.consent = 'You must consent to submit this endorsement';
    }

    // Optional: Context (if provided, must be valid)
    const trimmedContext = formData.context?.trim() || '';
    if (trimmedContext.length > 0 && trimmedContext.length < 2) {
      errors.context = 'Context must be at least 2 characters if provided';
    }
    if (trimmedContext.length > 200) {
      errors.context = 'Context must not exceed 200 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.submitEndorsement(token, {
        endorserName: formData.endorserName.trim(),
        endorserRole: formData.endorserRole.trim(),
        organization: formData.organization.trim(),
        relationship: formData.relationship,
        context: formData.context?.trim() || null,
        endorsementMessage: formData.endorsementMessage.trim(),
        relatedSkills: formData.relatedSkills,
          skillRatings: Object.keys(formData.skillRatings).length > 0 ? formData.skillRatings : null,
          strengthRating: formData.strengthRating,
          consent: Boolean(formData.consent), // Ensure boolean type
        });

      setSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      console.error('Error submitting endorsement:', err);
      setError(err.message || 'Failed to submit endorsement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading endorsement request...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !endorsementData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border border-gray-200">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-200">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Invalid Endorsement Link</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border border-gray-200">
          <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-200">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Thank You!</h2>
          <p className="text-gray-600 mb-2">
            Your endorsement has been submitted successfully. The student will be notified.
          </p>
          <p className="text-sm text-gray-500 mb-6">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 mb-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Endorsement Request</h1>
              <p className="text-blue-100 text-lg">
                Help shape a student's future by providing a meaningful endorsement
              </p>
            </div>
          </div>
        </div>

        {/* Student Info Card */}
        {endorsementData && (
          <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-100 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Student Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Name</p>
                <p className="text-lg font-bold text-gray-900">{endorsementData.studentName}</p>
              </div>
              {endorsementData.studentEnrollmentId && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Enrollment ID</p>
                  <p className="text-lg font-bold text-gray-900">{endorsementData.studentEnrollmentId}</p>
                </div>
              )}
              {endorsementData.studentSchool && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">School</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-600" />
                    <p className="text-lg font-bold text-gray-900">{endorsementData.studentSchool}</p>
                    {endorsementData.studentCenter && (
                      <span className="text-sm text-gray-600">• {endorsementData.studentCenter}</span>
                    )}
                  </div>
                </div>
              )}
              {endorsementData.studentBatch && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Batch</p>
                  <p className="text-lg font-bold text-gray-900">{endorsementData.studentBatch}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Endorsement Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 p-8 space-y-8">
          {/* Endorser Information Section */}
          <div className="border-b-2 border-gray-200 pb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Your Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Endorser Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="endorserName"
                  value={formData.endorserName}
                  onChange={handleInputChange}
                  className={`w-full px-5 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    formErrors.endorserName 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500'
                  }`}
                  placeholder="Enter your full name"
                  required
                />
                {formErrors.endorserName && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.endorserName}
                  </p>
                )}
              </div>

              {/* Endorser Role */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Your Role/Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="endorserRole"
                  value={formData.endorserRole}
                  onChange={handleInputChange}
                  className={`w-full px-5 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    formErrors.endorserRole 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500'
                  }`}
                  placeholder="e.g., Professor, Manager, Mentor"
                  required
                />
                {formErrors.endorserRole && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.endorserRole}
                  </p>
                )}
              </div>

              {/* Organization - Custom Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Organization <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  options={organizationOptions}
                  value={formData.organization}
                  onChange={(value) => setFormData(prev => ({ ...prev, organization: value }))}
                  placeholder="Select your campus"
                />
                {formErrors.organization && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.organization}
                  </p>
                )}
              </div>

              {/* Relationship - Custom Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Relationship with Student <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  options={relationshipOptions}
                  value={formData.relationship}
                  onChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}
                  placeholder="Select relationship"
                />
                {formErrors.relationship && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.relationship}
                  </p>
                )}
              </div>

              {/* Context (Optional) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Context (Optional)
                </label>
                <input
                  type="text"
                  name="context"
                  value={formData.context}
                  onChange={handleInputChange}
                  className={`w-full px-5 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    formErrors.context 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500'
                  }`}
                  placeholder="e.g., CS101 Course, Final Year Project, Summer Internship"
                />
                {formErrors.context && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.context}
                  </p>
                )}
                <p className="text-gray-500 text-sm mt-2 italic">Where/how did you work with this student?</p>
              </div>

              {/* Email (Read-only) */}
              {endorsementData && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    Email (from invitation)
                  </label>
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl">
                    <Mail className="w-5 h-5 text-indigo-600" />
                    <span className="text-gray-800 font-medium">{endorsementData.teacherEmail}</span>
                    <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-200">Read-only</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Endorsement Message */}
          <div className="border-b-2 border-gray-200 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <label className="block text-lg font-bold text-gray-800">
                Endorsement Message <span className="text-red-500">*</span>
              </label>
            </div>
            <textarea
              name="endorsementMessage"
              value={formData.endorsementMessage}
              onChange={handleInputChange}
              rows={8}
              className={`w-full px-5 py-4 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${
                formErrors.endorsementMessage 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-300 hover:border-blue-400 focus:border-blue-500'
              }`}
              placeholder="Write a meaningful endorsement message that highlights the student's strengths, achievements, and character. This will appear on their placement portfolio..."
              required
            />
            {formErrors.endorsementMessage && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {formErrors.endorsementMessage}
              </p>
            )}
            <div className="flex items-center justify-between mt-3">
              <p className="text-gray-500 text-sm">
                <span className={`font-semibold ${formData.endorsementMessage.length > 1900 ? 'text-orange-600' : 'text-gray-600'}`}>
                  {formData.endorsementMessage.length}
                </span>
                <span className="text-gray-400"> / 2000 characters</span>
              </p>
              {formData.endorsementMessage.length >= 10 && (
                <p className="text-green-600 text-sm flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Minimum length met
                </p>
              )}
            </div>
          </div>

          {/* Related Skills */}
          <div className="border-b-2 border-gray-200 pb-8">
            <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Skills You're Endorsing <span className="text-gray-400 font-normal text-sm">(Optional)</span>
            </label>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={skillInput}
                onChange={handleSkillInput}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill and press Enter"
                className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                Add
              </button>
            </div>
            
            {/* Common Skills */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-600 mb-3">Quick Select Common Skills:</p>
              <div className="flex flex-wrap gap-2">
                {commonSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleCommonSkill(skill)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      formData.relatedSkills.includes(skill)
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105 border-2 border-gray-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Skills */}
            {formData.relatedSkills.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-3">Selected Skills ({formData.relatedSkills.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {formData.relatedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-medium shadow-md"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        title="Remove skill"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Strength Rating */}
          <div className="border-b-2 border-gray-200 pb-8">
            <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              Overall Strength Rating <span className="text-gray-400 font-normal text-sm">(Optional)</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleRatingClick(rating)}
                    className={`p-3 rounded-xl transition-all duration-200 transform hover:scale-110 ${
                      formData.strengthRating === rating
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg scale-110'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        formData.strengthRating === rating ? 'fill-current' : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
              {formData.strengthRating && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl">
                  <span className="text-lg font-bold text-yellow-700">{formData.strengthRating}</span>
                  <span className="text-gray-600">out of 5</span>
                </div>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-3 italic">Rate the student's overall performance and potential</p>
          </div>

          {/* Consent Checkbox */}
          <div className={`bg-gradient-to-r ${formData.consent ? 'from-green-50 to-emerald-50 border-green-300' : 'from-blue-50 to-indigo-50 border-blue-200'} border-2 rounded-2xl p-6 transition-all duration-300`}>
            <label className="flex items-start gap-4 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={(e) => setFormData(prev => ({ ...prev, consent: e.target.checked }))}
                  className="w-6 h-6 text-blue-600 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                  required
                />
                {formData.consent && (
                  <CheckCircle className="w-6 h-6 text-green-600 absolute -top-0.5 -left-0.5 pointer-events-none" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base font-bold text-gray-800">
                    I consent to submit this endorsement
                  </span>
                  <span className="text-red-500 text-lg">*</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  By checking this box, I confirm that the information provided is accurate and I consent to this endorsement being displayed on the student's profile and used in their placement portfolio.
                </p>
                {formErrors.consent && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.consent}
                  </p>
                )}
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-5 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-xl flex items-center gap-3 shadow-lg">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="space-y-4">
            <button
              type="submit"
              disabled={submitting || !formData.consent}
              className={`w-full px-8 py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 transform ${
                submitting || !formData.consent
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Submitting Endorsement...</span>
                </>
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  <span>Submit Endorsement</span>
                </>
              )}
            </button>

            {/* Expiry Notice */}
            {endorsementData && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-orange-800">
                  ⏰ This link expires on{' '}
                  <span className="font-bold">
                    {new Date(endorsementData.expiresAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EndorsementPage;
