import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react';

function EmailVerificationModal({ isOpen, onClose, userEmail }) {
  const { resendEmailVerification, checkEmailVerification, user } = useAuth();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info', 'success', 'error'

  // Cooldown timer for resend button
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-check verification status every 5 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(async () => {
      try {
        const isVerified = await checkEmailVerification();
        if (isVerified) {
          setMessage('Email verified successfully! Redirecting to dashboard...');
          setMessageType('success');
          
          // Use role from auth context (updated after verification)
          setTimeout(() => {
            onClose(true);
            // Navigation will be handled by AuthRedirect component
          }, 1500);
        }
      } catch (error) {
        console.error('Error checking email verification:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, checkEmailVerification, onClose]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    try {
      setIsResending(true);
      await resendEmailVerification();
      setMessage('Verification email sent successfully! Please check your inbox.');
      setMessageType('success');
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      console.error('Error resending verification email:', error);
      setMessage('Failed to resend verification email. Please try again.');
      setMessageType('error');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      setIsChecking(true);
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        setMessage('Email verified successfully! Redirecting to dashboard...');
        setMessageType('success');
        
        // Use role from auth context (updated after verification)
        setTimeout(() => {
          onClose(true);
          // Navigation will be handled by AuthRedirect component
        }, 1500);
      } else {
        setMessage('Email not yet verified. Please check your inbox and click the verification link.');
        setMessageType('info');
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
      setMessage('Error checking verification status. Please try again.');
      setMessageType('error');
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Mail className="mr-2 text-blue-600" size={24} />
            Verify Your Email
          </h2>
          <button
            onClick={() => onClose(false)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-blue-600" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Check Your Email
            </h3>
            <p className="text-gray-600 text-sm">
              We've sent a verification link to:
            </p>
            <p className="text-blue-600 font-medium mt-1">{userEmail}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>Important:</strong> You must verify your email before accessing your dashboard. 
              Please check your inbox (and spam folder) for the verification email.
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-4 rounded-xl flex items-start space-x-3 ${
              messageType === 'success' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 shadow-sm' :
              messageType === 'error' ? 'bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 shadow-sm' :
              'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 shadow-sm'
            }`}>
              <div className="flex-shrink-0 mt-0.5">
                {messageType === 'success' && <CheckCircle className="text-green-600" size={20} />}
                {messageType === 'error' && <AlertCircle className="text-red-600" size={20} />}
                {messageType === 'info' && <AlertCircle className="text-blue-600" size={20} />}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium leading-relaxed ${
                  messageType === 'success' ? 'text-green-800' :
                  messageType === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {message}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCheckVerification}
              disabled={isChecking}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="animate-spin mr-2" size={16} />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2" size={16} />
                  I've Verified My Email
                </>
              )}
            </button>

            <button
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isResending ? (
                <>
                  <RefreshCw className="animate-spin mr-2" size={16} />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend Email (${resendCooldown}s)`
              ) : (
                <>
                  <Mail className="mr-2" size={16} />
                  Resend Verification Email
                </>
              )}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailVerificationModal;
