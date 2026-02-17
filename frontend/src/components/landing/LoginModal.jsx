import React, { useState, useRef, useEffect } from 'react'
import { gsap } from 'gsap';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Clock, CheckCircle2, XCircle } from 'lucide-react';
import EmailVerificationModal from '../auth/EmailVerificationModal';
import api from '../../services/api';
import { showError } from '../../utils/toast';

function LoginModal({ isOpen, onClose, defaultRole = 'Student' }) {
  const { login, registerWithEmail, resetPassword, loginWithGoogle, user, emailVerified } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(defaultRole);
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // For reset password confirmation
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Toggle confirm password visibility
  const [isPasswordFocused, setIsPasswordFocused] = useState(false); // Track password field focus
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false); // Track confirm password field focus
  const [error, setError] = useState(''); // kept for setError('') clears; display is via toast only
  const [busy, setBusy] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  // OTP flow states
  const [otpStep, setOtpStep] = useState('email'); // 'email' | 'otp' | 'password'
  const [resetStep, setResetStep] = useState('email'); // 'email' | 'otp' | 'password' - for reset password flow
  const [otp, setOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']); // Individual OTP digits
  const [resetOtpDigits, setResetOtpDigits] = useState(['', '', '', '', '', '']); // OTP digits for reset password
  const otpInputRefs = useRef([]); // Refs for OTP input boxes
  const resetOtpInputRefs = useRef([]); // Refs for reset password OTP input boxes
  const [otpSent, setOtpSent] = useState(false);
  const [otpStatus, setOtpStatus] = useState(null); // OTP status from backend
  const [resetOtpStatus, setResetOtpStatus] = useState(null); // Reset OTP status from backend
  const [otpExpiresAt, setOtpExpiresAt] = useState(null); // OTP expiration timestamp
  const [resetOtpExpiresAt, setResetOtpExpiresAt] = useState(null); // Reset OTP expiration timestamp
  const [timeRemaining, setTimeRemaining] = useState(null); // Time remaining until OTP expires (in seconds)
  const [resetTimeRemaining, setResetTimeRemaining] = useState(null); // Time remaining for reset OTP
  const [verificationToken, setVerificationToken] = useState('');
  const [resetToken, setResetToken] = useState(null); // Reset token after OTP verification
  const [hideOtpStatusCard, setHideOtpStatusCard] = useState(false); // Temporarily hide status card when error shows (signup form)
  const [hideResetOtpStatusCard, setHideResetOtpStatusCard] = useState(false); // Temporarily hide status card when error shows (reset password form)
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [animKey, setAnimKey] = useState('Student');
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [lottieReady, setLottieReady] = useState(false);
  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const formRef = useRef(null);

  // Reset all form state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset all form fields when modal opens
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setBusy(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setIsPasswordFocused(false);
      setIsConfirmPasswordFocused(false);
      setOtpStep('email');
      setResetStep('email');
      setOtp('');
      setOtpDigits(['', '', '', '', '', '']);
      setResetOtpDigits(['', '', '', '', '', '']);
      setOtpSent(false);
      setOtpStatus(null);
      setResetOtpStatus(null);
      setOtpExpiresAt(null);
      setResetOtpExpiresAt(null);
      setTimeRemaining(null);
      setResetTimeRemaining(null);
      setVerificationToken('');
      setResetToken(null);
      setOtpCountdown(0);
      setShowEmailVerification(false);
      setRegisteredEmail('');
      setMode('login'); // Reset to login mode
      setRole(defaultRole); // Set role from defaultRole prop
      setHideOtpStatusCard(false);
      setHideResetOtpStatusCard(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultRole]);

  // Reset form state when role changes (but modal is already open)
  useEffect(() => {
    if (isOpen && role) {
      // Reset form state when role changes
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setOtpStep('email');
      setResetStep('email');
      setOtpDigits(['', '', '', '', '', '']);
      setResetOtpDigits(['', '', '', '', '', '']);
      setOtpStatus(null);
      setResetOtpStatus(null);
      setOtpExpiresAt(null);
      setResetOtpExpiresAt(null);
      setTimeRemaining(null);
      setResetTimeRemaining(null);
      setVerificationToken('');
      setResetToken(null);
      setMode('login'); // Reset to login mode when role changes
      setHideOtpStatusCard(false);
      setHideResetOtpStatusCard(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, isOpen]);

  useEffect(() => {
    if (isOpen && !shouldRender) {
      // Modal is opening - render it first
      setShouldRender(true);
      setIsAnimating(true);
    } else if (!isOpen && shouldRender && !isAnimating) {
      // Modal is closing - start closing animation
      setIsAnimating(true);
    }
  }, [isOpen, shouldRender, isAnimating]);

  // Load and track Lottie web component
  useEffect(() => {
    const loadLottie = async () => {
      if (!document.querySelector('script[src*="dotlottie-wc"]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.2/dist/dotlottie-wc.js';
        script.type = 'module';
        
        script.onload = () => {
          // Wait a bit for the web component to register
          setTimeout(() => {
            setLottieReady(true);
          }, 100);
        };
        
        document.body.appendChild(script);
      } else {
        // Script already exists, check if web component is ready
        if (customElements.get('dotlottie-wc')) {
          setLottieReady(true);
        } else {
          // Wait for it to be defined
          customElements.whenDefined('dotlottie-wc').then(() => {
            setLottieReady(true);
          });
        }
      }
    };
    
    loadLottie();
  }, []);

  useEffect(() => {
    if (shouldRender && modalRef.current && backdropRef.current) {
      if (isOpen) {
        // Opening animation
        gsap.killTweensOf([modalRef.current, backdropRef.current]);
        if (formRef.current) gsap.killTweensOf(formRef.current);
        
        // Set initial state immediately
        gsap.set(backdropRef.current, { opacity: 0 });
        gsap.set(modalRef.current, { opacity: 0, scale: 0.85, y: 60, rotationX: 5 });
        if (formRef.current) {
          gsap.set(formRef.current, { opacity: 0, y: 30 });
        }
        
        // Create timeline for smoother animations
        const tl = gsap.timeline();
        
        // Animate backdrop
        tl.to(backdropRef.current, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out'
        })
        // Animate modal with enhanced easing
        .to(modalRef.current, {
          opacity: 1,
          scale: 1,
          y: 0,
          rotationX: 0,
          duration: 0.7,
          ease: 'back.out(1.2)'
        }, 0.1)
        // Animate form content
        .to(formRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            setIsAnimating(false);
          }
        }, 0.3);
        
      } else {
        // Closing animation
        gsap.killTweensOf([modalRef.current, backdropRef.current]);
        if (formRef.current) gsap.killTweensOf(formRef.current);
        
        const tl = gsap.timeline();
        
        // Animate form out first
        if (formRef.current) {
          tl.to(formRef.current, {
            opacity: 0,
            y: -20,
            duration: 0.3,
            ease: 'power2.in'
          });
        }
        
        // Animate modal out
        tl.to(modalRef.current, {
          opacity: 0,
          scale: 0.85,
          y: 60,
          rotationX: -5,
          duration: 0.4,
          ease: 'power2.in'
        }, 0.1)
        
        // Animate backdrop out
        .to(backdropRef.current, {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
          onComplete: () => {
            setShouldRender(false);
            setIsAnimating(false);
          }
        }, 0.2);
      }
    }
  }, [shouldRender, isOpen]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (shouldRender) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [shouldRender]);

  // Calculate time remaining until OTP expires based on otpExpiresAt timestamp
  useEffect(() => {
    if (!otpExpiresAt || otpStep !== 'otp') {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(otpExpiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000)); // Remaining in seconds
      setTimeRemaining(remaining);
      
      // If expired, update status
      if (remaining === 0 && otpStatus === 'PENDING_VERIFICATION') {
        setOtpStatus('EXPIRED');
      }
    };

    // Update immediately
    updateTimeRemaining();

    // Update every second
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [otpExpiresAt, otpStep, otpStatus]);

  // Calculate time remaining for reset password OTP
  useEffect(() => {
    if (!resetOtpExpiresAt || resetStep !== 'otp') {
      setResetTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(resetOtpExpiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000)); // Remaining in seconds
      setResetTimeRemaining(remaining);
      
      // If expired, update status
      if (remaining === 0 && resetOtpStatus === 'PENDING_VERIFICATION') {
        setResetOtpStatus('EXPIRED');
      }
    };

    // Update immediately
    updateTimeRemaining();

    // Update every second
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [resetOtpExpiresAt, resetStep, resetOtpStatus]);

  // Auto-clear error after 30 seconds in reset password OTP form
  useEffect(() => {
    if (mode === 'forgot' && resetStep === 'otp' && error) {
      const timeout = setTimeout(() => {
        setError('');
        setHideResetOtpStatusCard(false); // Show status card again after error clears
      }, 30000); // 30 seconds

      return () => clearTimeout(timeout);
    }
  }, [error, mode, resetStep]);

  // Auto-clear error after 30 seconds in signup OTP form
  useEffect(() => {
    if (mode === 'register' && otpStep === 'otp' && error) {
      const timeout = setTimeout(() => {
        setError('');
        setHideOtpStatusCard(false); // Show status card again after error clears
      }, 30000); // 30 seconds

      return () => clearTimeout(timeout);
    }
  }, [error, mode, otpStep]);

  // Reset ALL form state when mode changes (comprehensive cleanup)
  useEffect(() => {
    // Clear errors immediately
    setError('');
    
    // Clear all form fields
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    
    // Clear password visibility states
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsPasswordFocused(false);
    setIsConfirmPasswordFocused(false);
    
    // Clear all OTP states (signup form)
    setOtpStep('email');
    setOtpDigits(['', '', '', '', '', '']);
    setOtp('');
    setOtpSent(false);
    setOtpStatus(null);
    setOtpExpiresAt(null);
    setTimeRemaining(null);
    setVerificationToken('');
    setOtpCountdown(0);
    setHideOtpStatusCard(false);
    
    // Clear all OTP states (reset password form)
    setResetStep('email');
    setResetOtpDigits(['', '', '', '', '', '']);
    setResetOtpStatus(null);
    setResetOtpExpiresAt(null);
    setResetTimeRemaining(null);
    setResetToken(null);
    setHideResetOtpStatusCard(false);
    
    // Clear busy state
    setBusy(false);
  }, [mode]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isAnimating) {
      onClose();
    }
  };

  const handleClose = () => {
    if (!isAnimating) {
      onClose();
    }
  };

  // Don't render anything if modal should not be rendered
  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 flex items-center justify-center z-[9999] backdrop-blur-sm" 
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.10)',
        opacity: 0 // Start invisible to prevent flash
      }} 
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-transparent backdrop-blur-lg p-0 rounded-lg shadow-2xl w-full max-w-2xl h-[28rem] relative overflow-hidden flex flex-row items-center border border-gray-300"
        style={{
          background: 'linear-gradient(135deg, #FFDE83 60%, rgba(245,245,245,0.85) 60%, rgba(245,245,245,0.85) 100%)',
          boxShadow: '0 8px 48px 8px rgba(80, 80, 120, 0.25), 0 1.5px 8px 0 rgba(80,80,120,0.10)',
          opacity: 0, // Start invisible to prevent flash
          transform: 'scale(0.8) translateY(50px)' // Start in initial animation state
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Lottie Animation Left Side */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 h-full bg-transparent ">
          {lottieReady && (
            <dotlottie-wc
              src="https://lottie.host/a22e1a8b-a8e9-4fe4-893c-f5ba49c2a4b6/KHjSf9NMKB.lottie"
              speed="1"
              style={{ width: '220px', height: '220px' }}
              mode="forward"
              loop
              autoplay
            ></dotlottie-wc>
          )}
        </div>
        {/* Login Form Right Side */}
        <div className="flex-1 flex flex-col justify-center h-full relative bg-transparent min-w-0">
                <button onClick={handleClose} className="absolute top-4 right-4 bg-black/85 backdrop-blur-md border border-black/90 text-white hover:bg-black/90 hover:border-black/95 hover:scale-110 text-sm font-bold px-4 py-0.5 rounded-lg z-20 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer">✕</button>
          {/* Enhanced glow effect */}
          <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ boxShadow: '0 0 12px 3px rgba(128,0,255,0.2)' }}></div>
          <div ref={formRef} className="relative z-10 px-6 py-4 w-full max-w-full overflow-hidden">
            <h2 className="text-xl font-bold mb-6 text-center text-black uppercase" style={{ fontFamily: '"Josefin Sans", sans-serif' }}>
              {mode === 'login' && 'Sign in'}
              {mode === 'register' && 'Sign up'}
              {mode === 'forgot' && 'Reset password'}
            </h2>
            {/* Role selector: pill container matching modal theme (golden/cream) */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex p-1 rounded-full bg-amber-100/90 border border-amber-200/70 shadow-inner">
                {['Student', 'Recruiter', 'Admin'].map(opt => (
                  <button
                    key={opt}
                    className={`px-4 py-2 rounded-full font-semibold text-sm uppercase border-0 transition-all duration-300 cursor-pointer min-w-[5rem]
                      ${role === opt ? 'bg-black text-white shadow-md' : 'bg-transparent text-black hover:bg-amber-200/70'}`}
                    onClick={() => {
                      setRole(opt);
                      setAnimKey(opt); // Trigger form animation
                      if (mode === 'register') {
                        setOtpStep('email');
                        setOtpSent(false);
                        setOtp('');
                        setOtpDigits(['', '', '', '', '', '']);
                        setOtpStatus(null);
                        setOtpExpiresAt(null);
                        setTimeRemaining(null);
                        setVerificationToken('');
                        setError('');
                      }
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div
              key={animKey}
              className="transition-all duration-500 ease-out opacity-100 scale-100"
              style={{ 
                animation: 'fadeInScale 0.4s ease-out',
                animationFillMode: 'both'
              }}
            >
              {mode !== 'forgot' && (
                <form className="flex flex-col gap-4" onSubmit={async (e)=>{
                  e.preventDefault();
                  setError('');
                  setBusy(true);
                  try {
                    console.log('LoginModal - Starting authentication process...');
                    console.log('LoginModal - Mode:', mode);
                    console.log('LoginModal - OTP Step:', otpStep);
                    console.log('LoginModal - Email:', email);
                    let uid = null;
                    if (mode === 'login') {
                      // Reset OTP flow for login
                      setOtpStep('email');
                      setOtpSent(false);
                      setOtp('');
                      setVerificationToken('');
                      setOtpCountdown(0);
                      // Backend expects uppercase role. Use Admin; Super Admin is via env credentials only.
                      const u = await login(email, password, role.toUpperCase());
                      uid = u?.user?.id || u?.id; // JWT returns id, not uid
                      console.log('LoginModal - Login successful, User ID:', uid);
                      
                      // For existing users logging in, skip email verification
                      // Email verification is only required for new account creation
                      console.log('LoginModal - Existing user login, skipping email verification');
                    } else {
                      // Registration flow with OTP
                      console.log('LoginModal - Registration mode, OTP step:', otpStep);
                      if (otpStep === 'email') {
                        // Step 1: Send OTP
                        try {
                          if (!email) {
                            showError('Please enter your email address');
                            setBusy(false);
                            return;
                          }
                          console.log('LoginModal - Sending OTP to:', email);
                          console.log('LoginModal - API call starting...');
                          
                          // Add timeout to prevent infinite "Please wait..."
                          const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Request timeout - please check your backend server')), 30000); // 30 seconds
                          });
                          
                          const response = await Promise.race([
                            api.sendOTP(email),
                            timeoutPromise
                          ]);
                          
                          console.log('LoginModal - OTP API response:', response);
                          setOtpSent(true);
                          setOtpStep('otp');
                          // Store OTP status and expiration from backend response
                          setOtpStatus(response.otpStatus || 'PENDING_VERIFICATION');
                          setOtpExpiresAt(response.otpExpiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString());
                          setOtpDigits(['', '', '', '', '', '']); // Reset OTP digits
                          setOtp(''); // Reset OTP string
                          setError('');
                          setBusy(false); // Important: Reset busy state
                          // Focus first OTP input after a short delay
                          setTimeout(() => {
                            if (otpInputRefs.current[0]) {
                              otpInputRefs.current[0].focus();
                            }
                          }, 100);
                          console.log('LoginModal - OTP sent successfully, check your email');
                          return; // Don't proceed, wait for OTP
                        } catch (otpError) {
                          console.error('LoginModal - OTP send error:', otpError);
                          console.error('LoginModal - Error details:', {
                            message: otpError.message,
                            stack: otpError.stack,
                            response: otpError.response
                          });
                          const errorMsg = otpError.message || 'Failed to send OTP. Please check your backend server and try again.';
                          showError(errorMsg);
                          setBusy(false);
                          return;
                        }
                      } else if (otpStep === 'otp') {
                        // Step 2: Verify OTP
                        const otpValue = otpDigits.join('');
                        if (!otpValue || otpValue.length !== 6) {
                          // Hide status card and show error
                          setHideOtpStatusCard(true);
                          showError('Please enter a 6-digit OTP');
                          // Auto-clear error after 30 seconds (handled by useEffect)
                          setBusy(false);
                          return;
                        }
                        try {
                          const verifyData = await api.verifyOTP(email, otpValue);
                          setVerificationToken(verifyData.verificationToken);
                          setOtpStep('password');
                          setError('');
                          setBusy(false);
                          return; // Don't proceed, wait for password
                        } catch (verifyError) {
                          // Hide status card and show error
                          setHideOtpStatusCard(true);
                          showError(verifyError.message || 'Invalid OTP');
                          setBusy(false);
                          return;
                        }
                      } else if (otpStep === 'password') {
                        // Step 3: Complete registration with verification token
                        if (!password || password.length < 6) {
                          showError('Password must be at least 6 characters');
                          setBusy(false);
                          return;
                        }
                        // Backend expects uppercase role: STUDENT, RECRUITER, ADMIN
                        const selected = role.toUpperCase();
                        const u = await registerWithEmail({ 
                          email, 
                          password, 
                          role: selected,
                          verificationToken 
                        });
                        uid = u?.id; // JWT returns id, not uid
                        console.log('LoginModal - Registration successful, User ID:', uid);
                        
                        // Registration complete - proceed with navigation
                        setOtpStep('email'); // Reset for next time
                        setOtp('');
                        setOtpSent(false);
                        setVerificationToken('');
                        
                        // Close modal - AuthRedirect will handle navigation based on role
                        onClose();
                        setBusy(false);
                        return; // Exit early after registration
                      }
                    }
                    
                    // Login successful - close modal
                    // AuthRedirect will handle navigation based on role
                    if (mode === 'login' && uid) {
                      console.log('LoginModal - Login successful, closing modal');
                      onClose();
                    }
                  } catch (err) {
                    console.error('Authentication error:', err);
                    
                    // Enhanced error messages based on Firebase error codes
                    let errorMessage = err?.message || 'Authentication failed';
                    
                    if (err?.code) {
                      switch (err.code) {
                        case 'auth/user-not-found':
                          errorMessage = 'No account found with this email address.';
                          break;
                        case 'auth/wrong-password':
                          errorMessage = 'Incorrect password. Please try again.';
                          break;
                        case 'auth/invalid-email':
                          errorMessage = 'Please enter a valid email address.';
                          break;
                        case 'auth/user-disabled':
                          errorMessage = 'This account has been disabled. Contact support.';
                          break;
                        case 'auth/too-many-requests':
                          errorMessage = 'Too many failed attempts. Please try again later.';
                          break;
                        case 'auth/email-already-in-use':
                          errorMessage = 'An account with this email already exists.';
                          break;
                        case 'auth/weak-password':
                          errorMessage = 'Password should be at least 6 characters long.';
                          break;
                        case 'auth/network-request-failed':
                          errorMessage = 'Network error. Please check your connection.';
                          break;
                        default:
                          errorMessage = err.message || 'Authentication failed. Please try again.';
                      }
                    }
                    
                    showError(errorMessage);
                  } finally { setBusy(false); }
              }}>
                {/* Email input - hide during OTP step */}
                {!(mode === 'register' && otpStep === 'otp') && (
                  <input 
                    value={email} 
                    onChange={(e)=>setEmail(e.target.value)} 
                    type="email" 
                    placeholder="Email" 
                    disabled={mode === 'register' && otpStep !== 'email'}
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 cursor-text disabled:opacity-60 disabled:cursor-not-allowed" 
                  />
                )}
                
                {/* Show OTP input only for registration after email step */}
                {mode === 'register' && otpStep === 'otp' && (
                  <>
                    {otpStatus && !hideOtpStatusCard && (
                      <div className="mb-1 flex justify-center w-full">
                        <div className="flex flex-col items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200/60 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm max-w-full">
                          {/* Status Row */}
                          <div className="flex items-center gap-2">
                            {/* Status Icon */}
                            <div className="flex-shrink-0">
                              {timeRemaining !== null && timeRemaining > 0 ? (
                                <Clock className="w-5 h-5 text-blue-600 animate-pulse" strokeWidth={2.5} />
                              ) : timeRemaining === 0 ? (
                                <XCircle className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                              ) : (
                                <CheckCircle2 className="w-5 h-5 text-green-500" strokeWidth={2.5} />
                              )}
                            </div>
                            
                            {/* Status Text */}
                            <div className="text-xs font-bold text-gray-800 uppercase tracking-wider whitespace-nowrap">
                              {otpStatus.replace(/_/g, ' ')}
                            </div>
                          </div>
                          
                          {/* Expires Time - Centered */}
                          {otpExpiresAt && timeRemaining !== null && timeRemaining > 0 && (
                            <div className="text-xs text-gray-600 font-medium flex items-center gap-1 whitespace-nowrap">
                              <span>expires in</span>
                              <span className="font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                          )}
                          {timeRemaining === 0 && (
                            <div className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                              expired
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-center gap-2 mb-1">
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
                            const newDigits = [...otpDigits];
                            // Allow clearing the field (empty string)
                            newDigits[index] = value.slice(-1); // Take only the last character or empty string
                            setOtpDigits(newDigits);
                            setOtp(newDigits.join(''));
                            
                            // Auto-focus next input if value exists
                            if (value && index < 5 && otpInputRefs.current[index + 1]) {
                              otpInputRefs.current[index + 1].focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            // Handle backspace
                            if (e.key === 'Backspace') {
                              if (otpDigits[index]) {
                                // If current field has value, clear it
                                const newDigits = [...otpDigits];
                                newDigits[index] = '';
                                setOtpDigits(newDigits);
                                setOtp(newDigits.join(''));
                              } else if (index > 0) {
                                // If current field is empty, move to previous and clear it
                                otpInputRefs.current[index - 1].focus();
                                const newDigits = [...otpDigits];
                                newDigits[index - 1] = '';
                                setOtpDigits(newDigits);
                                setOtp(newDigits.join(''));
                              }
                            }
                            // Handle paste
                            if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              navigator.clipboard.readText().then((text) => {
                                const digits = text.replace(/\D/g, '').slice(0, 6).split('');
                                const newDigits = [...otpDigits];
                                digits.forEach((digit, i) => {
                                  if (index + i < 6) {
                                    newDigits[index + i] = digit;
                                  }
                                });
                                setOtpDigits(newDigits);
                                setOtp(newDigits.join(''));
                                const nextIndex = Math.min(index + digits.length, 5);
                                if (otpInputRefs.current[nextIndex]) {
                                  otpInputRefs.current[nextIndex].focus();
                                }
                              });
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
                            setOtp(newDigits.join(''));
                            const nextIndex = Math.min(index + digits.length, 5);
                            if (otpInputRefs.current[nextIndex]) {
                              otpInputRefs.current[nextIndex].focus();
                            }
                          }}
                          className="w-10 h-10 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg bg-white bg-opacity-80 text-black focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 cursor-text"
                          placeholder="_"
                        />
                      ))}
                    </div>
                    <button 
                      type="button"
                      onClick={async () => {
                        setError('');
                        setBusy(true);
                        try {
                          const response = await api.sendOTP(email);
                          // Store OTP status and expiration from backend response
                          setOtpStatus(response.otpStatus || 'PENDING_VERIFICATION');
                          setOtpExpiresAt(response.otpExpiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString());
                          setOtpDigits(['', '', '', '', '', '']);
                          setOtp('');
                          setError('');
                          alert('OTP resent!');
                          // Focus first input after resend
                          if (otpInputRefs.current[0]) {
                            otpInputRefs.current[0].focus();
                          }
                        } catch (err) {
                          showError(err.message || 'Failed to resend OTP');
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={busy || (timeRemaining !== null && timeRemaining > 280)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100 active:bg-blue-200 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-blue-600 text-center shadow-sm hover:shadow-md"
                    >
                      Resend OTP
                    </button>
                  </>
                )}
                
                {/* Show password input for login or after OTP verification */}
                {(mode === 'login' || (mode === 'register' && otpStep === 'password')) && (
                  <div className="relative">
                    <input 
                      value={password} 
                      onChange={(e)=>setPassword(e.target.value)} 
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      type={showPassword ? "text" : "password"} 
                      placeholder="Password" 
                      className="border border-gray-300 rounded-lg px-3 py-2 pr-10 w-full bg-white bg-opacity-80 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 cursor-text" 
                    />
                    {(isPasswordFocused || password.length > 0) && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input from losing focus
                          setShowPassword(!showPassword);
                        }}
                        onClick={(e) => {
                          e.preventDefault(); // Prevent form submission if user double-clicks
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200 cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                )}
                
                {/* Submit button - changes text based on step */}
                <button 
                    disabled={busy} 
                    type="submit" 
                    className="bg-black/80 backdrop-blur-md border border-black/85 text-white py-2 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-black/85 hover:border-black/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg cursor-pointer"
                  >
                    {busy ? 'Please wait...' : (
                      mode === 'login' ? 'Sign in' : (
                        otpStep === 'email' ? 'Send OTP' : (
                          otpStep === 'otp' ? 'Verify OTP' : 'Sign up'
                        )
                      )
                    )}
                  </button>
                  
                  {/* Google Login Button - Only show in login/register mode, not during OTP steps */}
                  {(mode === 'login' || (mode === 'register' && otpStep === 'email')) && (
                    <button
                      type="button"
                      onClick={async () => {
                        setError('');
                        setBusy(true);
                        try {
                          // Pass role to Google login (convert to uppercase to match backend)
                          const loggedInUser = await loginWithGoogle(role.toUpperCase());
                          onClose();
                          // Full-page redirect: tokens are already in localStorage; new load will run loadUser and show dashboard (avoids React state timing issues)
                          const userRole = loggedInUser?.role || role.toUpperCase();
                          const dashboardPath = userRole === 'STUDENT' ? '/student' : userRole === 'RECRUITER' ? '/recruiter' : userRole === 'ADMIN' ? '/admin' : '/super-admin';
                          window.location.replace(dashboardPath);
                        } catch (err) {
                          showError(err.message || 'Google sign-in failed. Please try again.');
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={busy}
                      className="w-full bg-white border-2 border-gray-300 text-gray-700 py-2 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {busy ? 'Please wait...' : 'Continue with Google'}
                    </button>
                  )}
                </form>
              )}
              {/* Reset Password Flow - Step 1: Email Input */}
              {mode === 'forgot' && resetStep === 'email' && (
                <form className="flex flex-col gap-4" onSubmit={async (e)=>{
                  e.preventDefault();
                  if (!email) {
                    showError('Please enter your email address');
                    return;
                  }
                  setError('');
                  setBusy(true);
                  try {
                    const response = await api.resetPassword(email);
                    
                    // Backend returns consistent format: { success, message, otpStatus, otpExpiresAt }
                    // Handle both new format (with success/otpStatus) and old format (just message)
                    if (response && (response.success || response.message)) {
                      // Always show OTP step if backend returns success or message
                      // Backend handles both cases (user exists/doesn't exist) and always returns otpStatus/otpExpiresAt
                      const status = response.otpStatus || 'PENDING_VERIFICATION';
                      const expiresAt = response.otpExpiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString();
                      
                      setResetOtpStatus(status);
                      setResetOtpExpiresAt(expiresAt);
                      setResetStep('otp');
                      setError(''); // Clear any errors
                      
                      // Focus first OTP input after a short delay
                      setTimeout(() => {
                        if (resetOtpInputRefs.current[0]) {
                          resetOtpInputRefs.current[0].focus();
                        }
                      }, 100);
                    } else {
                      // Backend returned error
                      showError(response?.message || 'Failed to send reset code. Please try again.');
                    }
                  } catch (err) {
                    console.error('LoginModal - Reset password error:', err);
                    showError(err?.message || 'Failed to send reset code. Please try again.');
                  } finally { 
                    setBusy(false);
                  }
                }}>
                  <input 
                    value={email} 
                    onChange={(e)=>setEmail(e.target.value)} 
                    type="email" 
                    placeholder="Email" 
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" 
                    disabled={busy}
                  />
                  <button 
                    disabled={busy || !email} 
                    type="submit" 
                    className="bg-black/80 backdrop-blur-md border border-black/85 text-white py-2 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-black/85 hover:border-black/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg cursor-pointer"
                  >
                    {busy ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </form>
              )}

              {/* Reset Password Flow - Step 2: OTP Verification */}
              {mode === 'forgot' && resetStep === 'otp' && (
                <div className="flex flex-col gap-4">
                  {resetOtpStatus && !hideResetOtpStatusCard && (
                    <div className="flex justify-center w-full">
                      <div className="flex flex-col items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200/60 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm max-w-full">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0">
                            {resetTimeRemaining !== null && resetTimeRemaining > 0 ? (
                              <Clock className="w-5 h-5 text-blue-600 animate-pulse" strokeWidth={2.5} />
                            ) : resetTimeRemaining === 0 ? (
                              <XCircle className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                            ) : (
                              <CheckCircle2 className="w-5 h-5 text-green-500" strokeWidth={2.5} />
                            )}
                          </div>
                          <div className="text-xs font-bold text-gray-800 uppercase tracking-wider whitespace-nowrap">
                            {resetOtpStatus.replace(/_/g, ' ')}
                          </div>
                        </div>
                        {resetOtpExpiresAt && resetTimeRemaining !== null && resetTimeRemaining > 0 && (
                          <div className="text-xs text-gray-600 font-medium flex items-center gap-1 whitespace-nowrap">
                            <span>expires in</span>
                            <span className="font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                              {Math.floor(resetTimeRemaining / 60)}:{(resetTimeRemaining % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        )}
                        {resetTimeRemaining === 0 && (
                          <div className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                            expired
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        ref={(el) => (resetOtpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={resetOtpDigits[index]}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const newDigits = [...resetOtpDigits];
                          // Allow clearing the field (empty string)
                          newDigits[index] = value.slice(-1); // Take only the last character or empty string
                          setResetOtpDigits(newDigits);
                          
                          // Auto-focus next input if value exists
                          if (value && index < 5 && resetOtpInputRefs.current[index + 1]) {
                            resetOtpInputRefs.current[index + 1].focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          // Handle backspace
                          if (e.key === 'Backspace') {
                            if (resetOtpDigits[index]) {
                              // If current field has value, clear it
                              const newDigits = [...resetOtpDigits];
                              newDigits[index] = '';
                              setResetOtpDigits(newDigits);
                            } else if (index > 0) {
                              // If current field is empty, move to previous and clear it
                              resetOtpInputRefs.current[index - 1].focus();
                              const newDigits = [...resetOtpDigits];
                              newDigits[index - 1] = '';
                              setResetOtpDigits(newDigits);
                            }
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                          const digits = pastedData.split('');
                          const newDigits = [...resetOtpDigits];
                          digits.forEach((digit, i) => {
                            if (index + i < 6) {
                              newDigits[index + i] = digit;
                            }
                          });
                          setResetOtpDigits(newDigits);
                          const nextIndex = Math.min(index + digits.length, 5);
                          if (resetOtpInputRefs.current[nextIndex]) {
                            resetOtpInputRefs.current[nextIndex].focus();
                          }
                        }}
                        className="w-10 h-10 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg bg-white bg-opacity-80 text-black focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                        placeholder="_"
                        disabled={busy}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setError('');
                      setBusy(true);
                      try {
                        const response = await api.resetPassword(email);
                        // Backend always returns consistent format
                        if (response && response.success) {
                          const status = response.otpStatus || 'PENDING_VERIFICATION';
                          const expiresAt = response.otpExpiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString();
                          setResetOtpStatus(status);
                          setResetOtpExpiresAt(expiresAt);
                          setResetOtpDigits(['', '', '', '', '', '']);
                          setError('');
                        } else {
                          // Hide status card and show error if resend fails
                          setHideResetOtpStatusCard(true);
                          showError(response?.message || 'Failed to resend code. Please try again.');
                        }
                        if (resetOtpInputRefs.current[0]) {
                          resetOtpInputRefs.current[0].focus();
                        }
                      } catch (err) {
                        // Hide status card and show error if resend fails
                        setHideResetOtpStatusCard(true);
                        showError(err?.message || 'Failed to resend code');
                      } finally {
                        setBusy(false);
                      }
                    }}
                    disabled={busy || (resetTimeRemaining !== null && resetTimeRemaining > 580)}
                    className="w-full text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100 active:bg-blue-200 px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-blue-600 text-center shadow-sm hover:shadow-md"
                  >
                    Resend OTP
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const otpValue = resetOtpDigits.join('');
                      if (!otpValue || otpValue.length !== 6) {
                        // Hide status card and show error
                        setHideResetOtpStatusCard(true);
                        showError('Please enter the 6-digit code');
                        // Auto-clear error after 30 seconds (handled by useEffect)
                        return;
                      }
                      setError('');
                      setBusy(true);
                      try {
                        const response = await api.verifyResetOTP(email, otpValue);
                        setResetToken(response.resetToken);
                        setResetStep('password');
                        setResetOtpDigits(['', '', '', '', '', '']);
                        setError('');
                      } catch (err) {
                        // Hide status card and show error
                        setHideResetOtpStatusCard(true);
                        showError(err?.message || 'Invalid or expired code');
                        setResetOtpDigits(['', '', '', '', '', '']);
                        if (resetOtpInputRefs.current[0]) {
                          resetOtpInputRefs.current[0].focus();
                        }
                      } finally {
                        setBusy(false);
                      }
                    }}
                    disabled={busy}
                    className="w-full bg-black/90 backdrop-blur-md border border-black/95 text-white py-2 rounded-lg font-semibold disabled:opacity-60 hover:bg-black/95 hover:border-black transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
                  >
                    {busy ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              )}

              {/* Reset Password Flow - Step 3: New Password */}
              {mode === 'forgot' && resetStep === 'password' && (
                <form className="flex flex-col gap-4" onSubmit={async (e)=>{
                  e.preventDefault();
                  if (!password) {
                    showError('Please enter a new password');
                    return;
                  }
                  if (password.length < 6) {
                    showError('Password must be at least 6 characters long');
                    return;
                  }
                  if (password !== confirmPassword) {
                    showError('Passwords do not match');
                    return;
                  }
                  if (!resetToken) {
                    showError('Invalid reset token. Please start over.');
                    return;
                  }
                  setError('');
                  setBusy(true);
                  try {
                    await api.updatePassword(resetToken, password);
                    setError('');
                    alert('Password updated successfully! Redirecting to login...');
                    setMode('login');
                    setResetStep('email');
                    setResetOtpDigits(['', '', '', '', '', '']);
                    setResetOtpStatus(null);
                    setResetOtpExpiresAt(null);
                    setResetToken(null);
                    setPassword('');
                    setConfirmPassword('');
                  } catch (err) {
                    showError(err?.message || 'Failed to update password');
                  } finally {
                    setBusy(false);
                  }
                }}>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={password} 
                      onChange={(e)=>setPassword(e.target.value)} 
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="New Password" 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 pr-10 cursor-text" 
                      disabled={busy}
                    />
                    {(isPasswordFocused || password.length > 0) && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input from losing focus
                          setShowPassword(!showPassword);
                        }}
                        onClick={(e) => {
                          e.preventDefault(); // Prevent form submission if user double-clicks
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200 cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword} 
                      onChange={(e)=>setConfirmPassword(e.target.value)} 
                      onFocus={() => setIsConfirmPasswordFocused(true)}
                      onBlur={() => setIsConfirmPasswordFocused(false)}
                      placeholder="Confirm New Password" 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white bg-opacity-80 text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 pr-10 cursor-text" 
                      disabled={busy}
                    />
                    {(isConfirmPasswordFocused || confirmPassword.length > 0) && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input from losing focus
                          setShowConfirmPassword(!showConfirmPassword);
                        }}
                        onClick={(e) => {
                          e.preventDefault(); // Prevent form submission if user double-clicks
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200 cursor-pointer"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <button 
                    disabled={busy || !password || !confirmPassword} 
                    type="submit" 
                    className="bg-black/80 backdrop-blur-md border border-black/85 text-white py-2 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-black/85 hover:border-black/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg cursor-pointer"
                  >
                    {busy ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
              {mode === 'forgot' && (
                <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
                  <button 
                    onClick={()=>{
                      setMode('login');
                    }} 
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100 active:bg-blue-200 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                  >
                    Sign in
                  </button>
                  <button 
                    onClick={()=>{
                      setMode('register');
                    }} 
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100 active:bg-blue-200 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                  >
                    Sign up
                  </button>
                </div>
              )}
                      <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
                        {mode === 'register' && (
                          <>
                            <button 
                              onClick={()=>{
                                setMode('login');
                              }} 
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100 active:bg-blue-200 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                            >
                              Sign in
                            </button>
                            <button 
                              onClick={()=>setMode('forgot')} 
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100 active:bg-blue-200 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                            >
                              Forgot password
                            </button>
                          </>
                        )}
                        {mode === 'login' && (
                          <>
                            <button 
                              onClick={()=>{
                                setMode('register');
                              }} 
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100 active:bg-blue-200 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                            >
                              Sign up
                            </button>
                            <button 
                              onClick={()=>setMode('forgot')} 
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100 active:bg-blue-200 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                            >
                              Forgot password
                            </button>
                          </>
                        )}
                      </div>
            </div>
          </div>
        </div>
        
        {/* Email Verification Modal */}
        <EmailVerificationModal 
          isOpen={showEmailVerification}
          onClose={(verified) => {
            setShowEmailVerification(false);
            if (verified) {
              // User verified email, proceed with navigation
              onClose();
              // The AuthRedirect component will handle navigation based on role
            }
          }}
          userEmail={registeredEmail}
        />
        
        <style>{`
            @keyframes fadeInScale {
              0% { 
                opacity: 0; 
                transform: scale(0.95) translateY(10px); 
              }
              100% { 
                opacity: 1; 
                transform: scale(1) translateY(0px); 
              }
            }
            
            /* Enhanced focus states for form elements */
            input:focus {
              transform: scale(1.02);
            }
            
            /* Smooth lottie animation entry */
            dotlottie-wc {
              animation: lottieEntry 0.8s ease-out 0.5s both;
            }
            
            @keyframes lottieEntry {
              0% {
                opacity: 0;
                transform: scale(0.8) rotate(-5deg);
              }
              100% {
                opacity: 1;
                transform: scale(1) rotate(0deg);
              }
            }
          `}</style>
      </div>
    </div>
  )
}

export default LoginModal;