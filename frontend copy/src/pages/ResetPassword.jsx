import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Mail, Lock, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api from '../services/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';

  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'password'
  const [email, setEmail] = useState(emailFromUrl);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const [otpStatus, setOtpStatus] = useState(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const otpInputRefs = useRef([]);

  // Calculate time remaining from otpExpiresAt
  useEffect(() => {
    if (!otpExpiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date();
      const expires = new Date(otpExpiresAt);
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeRemaining(diff > 0 ? diff : 0);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [otpExpiresAt]);

  // Handle OTP input changes
  useEffect(() => {
    const otpValue = otpDigits.join('');
    setOtp(otpValue);
  }, [otpDigits]);

  const handleSendOTP = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const response = await api.resetPassword(email);
      setOtpStatus(response.otpStatus || 'PENDING_VERIFICATION');
      setOtpExpiresAt(response.otpExpiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString());
      setStep('otp');
      setSuccess('Password reset code sent to your email!');
      
      // Focus first OTP input
      setTimeout(() => {
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
      }, 100);
    } catch (err) {
      setError(err?.message || 'Failed to send reset code');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otpDigits.join('');
    if (!otpValue || otpValue.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const response = await api.verifyResetOTP(email, otpValue);
      setResetToken(response.resetToken);
      setStep('password');
      setSuccess('Code verified! Please enter your new password.');
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setError(err?.message || 'Invalid or expired code');
      setOtpDigits(['', '', '', '', '', '']);
      if (otpInputRefs.current[0]) {
        otpInputRefs.current[0].focus();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password) {
      setError('Please enter a new password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!resetToken) {
      setError('Invalid reset token. Please start over.');
      return;
    }

    setError('');
    setSuccess('');
    setBusy(true);

    try {
      await api.updatePassword(resetToken, password);
      setSuccess('Password updated successfully! Redirecting to login...');
      
      // Redirect to home page after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err?.message || 'Failed to update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-8">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
            RESET PASSWORD
          </h1>
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center bg-black/85 text-white rounded-lg hover:bg-black/90 transition-colors border border-black/90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-800 flex-1">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-green-800 flex-1">{success}</p>
          </div>
        )}

        {/* Step 1: Email Input */}
        {step === 'email' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={busy}
                />
              </div>
            </div>

            <button
              onClick={handleSendOTP}
              disabled={busy || !email}
              className="w-full bg-black/80 text-white py-3 rounded-lg font-semibold hover:bg-black/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-black/85"
            >
              {busy ? 'Sending...' : 'Send Reset Code'}
            </button>

            <div className="text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Reset Code
              </label>
              <p className="text-sm text-gray-600 mb-4">
                We sent a code to <span className="font-semibold">{email}</span>
              </p>

              {/* OTP Status */}
              {otpStatus && (
                <div className="mb-4 flex justify-center">
                  <div className="flex flex-col items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200/60 rounded-xl shadow-md w-full max-w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0">
                        {timeRemaining !== null && timeRemaining > 0 ? (
                          <Clock className="w-4 h-4 text-blue-600 animate-pulse" strokeWidth={2.5} />
                        ) : timeRemaining === 0 ? (
                          <XCircle className="w-4 h-4 text-red-500" strokeWidth={2.5} />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500" strokeWidth={2.5} />
                        )}
                      </div>
                      <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        {otpStatus.replace(/_/g, ' ')}
                      </div>
                    </div>
                    {otpExpiresAt && timeRemaining !== null && timeRemaining > 0 && (
                      <div className="text-xs text-gray-600 font-medium flex items-center gap-1">
                        <span>expires in</span>
                        <span className="font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                          {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                    {timeRemaining === 0 && (
                      <div className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-md">
                        expired
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OTP Input Fields */}
              <div className="flex justify-center gap-2 mb-4">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpDigits[index]}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value) {
                        const newDigits = [...otpDigits];
                        newDigits[index] = value;
                        setOtpDigits(newDigits);
                        
                        if (index < 5 && otpInputRefs.current[index + 1]) {
                          otpInputRefs.current[index + 1].focus();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
                        otpInputRefs.current[index - 1].focus();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      const digits = pastedData.split('');
                      const newDigits = [...otpDigits];
                      digits.forEach((digit, i) => {
                        if (index + i < 6) {
                          newDigits[index + i] = digit;
                        }
                      });
                      setOtpDigits(newDigits);
                      const nextIndex = Math.min(index + digits.length, 5);
                      if (otpInputRefs.current[nextIndex]) {
                        otpInputRefs.current[nextIndex].focus();
                      }
                    }}
                    className="w-10 h-10 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                    placeholder="_"
                    disabled={busy}
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={busy || otp.length !== 6}
                className="w-full bg-black/80 text-white py-3 rounded-lg font-semibold hover:bg-black/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-black/85"
              >
                {busy ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={handleSendOTP}
                  disabled={busy || (timeRemaining !== null && timeRemaining > 580)}
                  className="text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resend Code
                </button>
                <button
                  onClick={() => setStep('email')}
                  className="text-gray-600 hover:text-gray-700 hover:underline"
                >
                  Change Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button
              onClick={handleUpdatePassword}
              disabled={busy || !password || !confirmPassword}
              className="w-full bg-black/80 text-white py-3 rounded-lg font-semibold hover:bg-black/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-black/85"
            >
              {busy ? 'Updating...' : 'Update Password'}
            </button>

            <div className="text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-gray-600 hover:text-gray-700 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

