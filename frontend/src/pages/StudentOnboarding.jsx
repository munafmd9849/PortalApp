import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { showError, showSuccess } from '../utils/toast';
import CustomDropdown from '../components/common/CustomDropdown';
import { FaGraduationCap, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

export default function StudentOnboarding() {
    const { user, profileCompleted } = useAuth();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [enrollmentId, setEnrollmentId] = useState('');
    const [school, setSchool] = useState('');
    const [center, setCenter] = useState('');
    const [batch, setBatch] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [loadingInitial, setLoadingInitial] = useState(true);

    // If profile is already completed, redirect to dashboard
    useEffect(() => {
        if (profileCompleted) {
            navigate('/student', { replace: true });
        }
    }, [profileCompleted, navigate]);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;
        setEmail(user.email || '');

        const loadProfile = async () => {
            try {
                const profile = await api.getStudentProfile();
                if (cancelled || !profile) return;

                const emailVal = profile.email || user.email || '';
                setEmail(emailVal);

                const nameVal = (profile.fullName || '').trim();
                const isEmailAsName = !nameVal || nameVal === emailVal || nameVal.includes('@');
                setFullName(isEmailAsName ? '' : nameVal);

                setPhone(profile.phone || '');
                setEnrollmentId(profile.enrollmentId || '');
                setSchool(profile.school || '');
                setCenter(profile.center || '');
                setBatch(profile.batch || '');
            } catch (e) {
                console.error('Failed to load profile for onboarding', e);
            } finally {
                setLoadingInitial(false);
            }
        };

        loadProfile();

        return () => {
            cancelled = true;
        };
    }, [user]);

    const validate = () => {
        const fieldErrors = {};
        if (!phone.trim()) {
            fieldErrors.phone = 'Phone is required';
        } else if (!/^[6-9]\d{9}$/.test(phone.trim())) {
            fieldErrors.phone = 'Phone must be exactly 10 digits starting with 6, 7, 8, or 9';
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
        /^[6-9]\d{9}$/.test(phone.trim()) &&
        enrollmentId.trim().length > 0 &&
        !!school &&
        !!center &&
        !!batch;

    const handleSave = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSaving(true);
        try {
            await api.updateStudentProfile({
                fullName: fullName || user?.displayName || user?.email?.split('@')[0],
                email,
                phone,
                enrollmentId,
                school,
                center,
                batch,
            });

            if (user?.id) {
                window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { userId: user.id } }));
            }

            showSuccess('Profile completed successfully! Welcome aboard.');
            navigate('/student', { replace: true });
        } catch (error) {
            const backend = error?.response?.data;
            if (backend?.field === 'enrollmentId') {
                setErrors((prev) => ({
                    ...prev,
                    enrollmentId: 'This enrollment ID is already used by another student.',
                }));
                showError('Enrollment ID already exists. Please use a different one.');
            } else {
                const message = backend?.error || error?.message || 'Failed to update profile. Please try again.';
                showError(message);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loadingInitial) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-100">
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-5 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 min-h-[600px]">

                {/* Left Side: Branding & Info */}
                <div className="hidden md:flex flex-col justify-between col-span-2 bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-500 p-10 text-white relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-[0.1] blur-[2px]"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-300 opacity-[0.2] blur-[40px]"></div>

                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome!</h1>
                        <p className="text-blue-50 text-sm leading-relaxed mb-8">
                            Let's get your profile set up so you can access personalized job opportunities and resources.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-start space-x-3">
                                <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-semibold">Personalized Jobs</h3>
                                    <p className="text-xs text-blue-50/90 mt-1">Get curatated job matches based on your academic profile.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-semibold">Seamless Applications</h3>
                                    <p className="text-xs text-blue-50/90 mt-1">Apply to opportunities with just one click.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-semibold">Career Tracking</h3>
                                    <p className="text-xs text-blue-50/90 mt-1">Monitor your application progress in real-time.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-12 bg-white/20 rounded-xl p-4 backdrop-blur-md border border-white/20">
                        <p className="text-xs text-white font-medium">
                            "Completing your profile authentically helps recruiters discover your unique potential."
                        </p>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="col-span-3 p-8 sm:p-10 lg:p-16 flex flex-col justify-center">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Complete your profile</h2>
                        <p className="text-sm text-gray-500 mt-1">Fill in your academic details to continue.</p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300"
                                        placeholder="E.g. John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed select-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                        Phone <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setPhone(val);
                                            if (val.length > 0 && !/^[6-9]/.test(val)) {
                                                setErrors(prev => ({ ...prev, phone: 'Number must start with 6, 7, 8, or 9' }));
                                            } else if (val.length > 0 && val.length < 10) {
                                                setErrors(prev => ({ ...prev, phone: 'Number must be exactly 10 digits' }));
                                            } else {
                                                setErrors(prev => ({ ...prev, phone: null }));
                                            }
                                        }}
                                        className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.phone ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-blue-500 hover:border-gray-300'
                                            }`}
                                        placeholder="10 digit number"
                                        maxLength="10"
                                    />
                                    {errors.phone && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.phone}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                        Enrollment ID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={enrollmentId}
                                        onChange={(e) => setEnrollmentId(e.target.value)}
                                        className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.enrollmentId ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-blue-500 hover:border-gray-300'
                                            }`}
                                        placeholder="Your unique ID"
                                    />
                                    {errors.enrollmentId && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.enrollmentId}</p>}
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="h-px w-full bg-gray-100 mb-6"></div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Academic Details</h3>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <CustomDropdown
                                            label={<span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">School <span className="text-red-500">*</span></span>}
                                            icon={FaGraduationCap}
                                            iconColor="text-blue-600"
                                            options={[
                                                { value: '', label: 'Select' },
                                                { value: 'SOT', label: 'School of Technology' },
                                                { value: 'SOM', label: 'School of Management' },
                                                { value: 'SOH', label: 'School of HealthCare' }
                                            ]}
                                            value={school}
                                            onChange={(value) => setSchool(value)}
                                        />
                                        {errors.school && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.school}</p>}
                                    </div>

                                    <div>
                                        <CustomDropdown
                                            label={<span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Center <span className="text-red-500">*</span></span>}
                                            icon={FaMapMarkerAlt}
                                            iconColor="text-indigo-600"
                                            options={[
                                                { value: '', label: 'Select' },
                                                { value: 'BANGALORE', label: 'Bangalore' },
                                                { value: 'NOIDA', label: 'Noida' },
                                                { value: 'LUCKNOW', label: 'Lucknow' },
                                                { value: 'PUNE', label: 'Pune' },
                                                { value: 'PATNA', label: 'Patna' },
                                                { value: 'INDORE', label: 'Indore' }
                                            ]}
                                            value={center}
                                            onChange={(value) => setCenter(value)}
                                        />
                                        {errors.center && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.center}</p>}
                                    </div>

                                    <div>
                                        <CustomDropdown
                                            label={<span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Batch <span className="text-red-500">*</span></span>}
                                            icon={FaUsers}
                                            iconColor="text-purple-600"
                                            options={[
                                                { value: '', label: 'Select' },
                                                { value: '25-29', label: '25-29' },
                                                { value: '24-28', label: '24-28' },
                                                { value: '23-27', label: '23-27' }
                                            ]}
                                            value={batch}
                                            onChange={(value) => setBatch(value)}
                                        />
                                        {errors.batch && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.batch}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 mt-6 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={saving || !hasAllRequired}
                                className={`w-full sm:w-auto sm:ml-auto flex items-center justify-center space-x-2 px-8 py-3 rounded-xl text-sm font-semibold text-white shadow-sm transition-all duration-200 ${saving || !hasAllRequired
                                    ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none'
                                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:transform active:scale-95'
                                    }`}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Continue to Dashboard</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
