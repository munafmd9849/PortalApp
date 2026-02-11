import React, { useState, useRef, useEffect } from 'react'
import { gsap } from 'gsap';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Clock, CheckCircle2, XCircle, Home } from 'lucide-react';
import EmailVerificationModal from '../auth/EmailVerificationModal';
import api from '../../services/api';
import Stepper, { Step } from "./Stepper";

function LoginModal({ isOpen, onClose, defaultRole = 'Student', defaultMode = 'login', asPage = false }) {
  const { login, registerWithEmail, resetPassword, user, emailVerified } = useAuth();
  const navigate = useNavigate();
  const effectiveOpen = asPage ? true : isOpen;
  const [role, setRole] = useState(defaultRole);
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // For reset password confirmation
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Toggle confirm password visibility
  const [isPasswordFocused, setIsPasswordFocused] = useState(false); // Track password field focus
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false); // Track confirm password field focus
  const [error, setError] = useState('');
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
  const [loginStep, setLoginStep] = useState(1);
  const [registerStep, setRegisterStep] = useState(1);
  const [forgotStep, setForgotStep] = useState(1);
  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const formRef = useRef(null);

  // Reset all form state when modal opens
  useEffect(() => {
    if (effectiveOpen) {
      // Reset all form fields when modal opens
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
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
      setMode(defaultMode); // Reset to requested mode
      setRole(defaultRole); // Set role from defaultRole prop
      setLoginStep(1);
      setRegisterStep(1);
      setForgotStep(1);
      setHideOtpStatusCard(false);
      setHideResetOtpStatusCard(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOpen, defaultRole, defaultMode]);

  // Reset form state when role changes (but modal is already open)
  useEffect(() => {
    if (effectiveOpen && role) {
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
      setMode(defaultMode); // Keep requested mode when role changes
      setLoginStep(1);
      setRegisterStep(1);
      setForgotStep(1);
      setHideOtpStatusCard(false);
      setHideResetOtpStatusCard(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, effectiveOpen, defaultMode]);

  useEffect(() => {
    if (asPage) return;
    if (isOpen && !shouldRender) {
      // Modal is opening - render it first
      setShouldRender(true);
      setIsAnimating(true);
    } else if (!isOpen && shouldRender && !isAnimating) {
      // Modal is closing - start closing animation
      setIsAnimating(true);
    }
  }, [asPage, isOpen, shouldRender, isAnimating]);

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
    if (asPage) return;
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
    if (asPage) return;
    if (shouldRender) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [asPage, shouldRender]);

  // Page entrance animation (when rendered as a full page)
  useEffect(() => {
    if (!asPage) return;
    if (!modalRef.current) return;
    gsap.killTweensOf(modalRef.current);
    if (formRef.current) gsap.killTweensOf(formRef.current);

    gsap.set(modalRef.current, { opacity: 0, scale: 0.92, y: 24, rotationX: 4 });
    if (formRef.current) gsap.set(formRef.current, { opacity: 0, y: 16 });

    const tl = gsap.timeline();
    tl.to(modalRef.current, {
      opacity: 1,
      scale: 1,
      y: 0,
      rotationX: 0,
      duration: 0.7,
      ease: "back.out(1.1)",
    }).to(
      formRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: "power2.out",
      },
      0.18
    );

    return () => tl.kill();
  }, [asPage]);

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
    setLoginStep(1);
  }, [mode]);

  const emailOk = /^\S+@\S+\.\S+$/.test(String(email || "").trim());
  const canProceedLogin =
    (loginStep === 1 && Boolean(role)) ||
    (loginStep === 2 && emailOk) ||
    (loginStep === 3 && String(password || "").length >= 1) ||
    loginStep >= 4;

  const canProceedRegister =
    (registerStep === 1 && Boolean(role)) ||
    (registerStep === 2 && emailOk) ||
    (registerStep === 3 && otpDigits.join("").length === 6) ||
    (registerStep === 4 && String(password || "").length >= 6);

  const canProceedForgot =
    (forgotStep === 1 && emailOk) ||
    (forgotStep === 2 && resetOtpDigits.join("").length === 6) ||
    (forgotStep === 3 &&
      String(password || "").length >= 6 &&
      String(password) === String(confirmPassword) &&
      Boolean(resetToken));

  const submitLogin = async () => {
    setError("");
    setBusy(true);
    try {
      // Reset OTP flow for login
      setOtpStep("email");
      setOtpSent(false);
      setOtp("");
      setVerificationToken("");
      setOtpCountdown(0);
      const u = await login(email, password, role.toUpperCase());
      const uid = u?.user?.id || u?.id;
      if (uid) onClose();
    } catch (err) {
      let errorMessage = err?.message || "Authentication failed";
      if (err?.code) {
        switch (err.code) {
          case "auth/user-not-found":
            errorMessage = "No account found with this email address.";
            break;
          case "auth/wrong-password":
            errorMessage = "Incorrect password. Please try again.";
            break;
          case "auth/invalid-email":
            errorMessage = "Please enter a valid email address.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
          default:
            errorMessage = err.message || "Authentication failed. Please try again.";
        }
      }
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  const sendRegisterOtp = async () => {
    setError("");
    setBusy(true);
    try {
      if (!emailOk) throw new Error("Please enter a valid email address");
      const response = await api.sendOTP(email);
      setOtpSent(true);
      setOtpStep("otp");
      setHideOtpStatusCard(false);
      setOtpStatus(response?.otpStatus || "PENDING_VERIFICATION");
      setOtpExpiresAt(response?.otpExpiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString());
      setOtpDigits(["", "", "", "", "", ""]);
      setOtp("");
      setVerificationToken("");
      setTimeout(() => otpInputRefs.current?.[0]?.focus?.(), 100);
      return true;
    } catch (e) {
      setError(e?.message || "Failed to send OTP");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const verifyRegisterOtp = async () => {
    setError("");
    setBusy(true);
    try {
      const otpValue = otpDigits.join("");
      if (!otpValue || otpValue.length !== 6) throw new Error("Please enter a 6-digit OTP");
      const verifyData = await api.verifyOTP(email, otpValue);
      setVerificationToken(verifyData?.verificationToken || "");
      setOtpStep("password");
      return true;
    } catch (e) {
      setHideOtpStatusCard(true);
      setError(e?.message || "Invalid OTP");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const completeRegister = async () => {
    setError("");
    setBusy(true);
    try {
      if (String(password || "").length < 6) throw new Error("Password must be at least 6 characters");
      if (!verificationToken) throw new Error("Please verify OTP first");
      const selected = String(role || "STUDENT").toUpperCase();
      const u = await registerWithEmail({
        email,
        password,
        role: selected,
        verificationToken,
      });
      const uid = u?.id;
      if (uid) {
        setOtpStep("email");
        setOtp("");
        setOtpSent(false);
        setVerificationToken("");
        onClose();
      }
      return true;
    } catch (e) {
      setError(e?.message || "Registration failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const sendResetCode = async () => {
    setError("");
    setBusy(true);
    try {
      if (!emailOk) throw new Error("Please enter a valid email address");
      const response = await api.resetPassword(email);
      const status = response?.otpStatus || "PENDING_VERIFICATION";
      const expiresAt = response?.otpExpiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString();
      setResetOtpStatus(status);
      setResetOtpExpiresAt(expiresAt);
      setResetOtpDigits(["", "", "", "", "", ""]);
      setResetStep("otp");
      setHideResetOtpStatusCard(false);
      setTimeout(() => resetOtpInputRefs.current?.[0]?.focus?.(), 100);
      return true;
    } catch (e) {
      setError(e?.message || "Failed to send reset code");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const verifyResetCode = async () => {
    setError("");
    setBusy(true);
    try {
      const otpValue = resetOtpDigits.join("");
      if (!otpValue || otpValue.length !== 6) throw new Error("Please enter the 6-digit code");
      const response = await api.verifyResetOTP(email, otpValue);
      setResetToken(response?.resetToken);
      setResetStep("password");
      setResetOtpDigits(["", "", "", "", "", ""]);
      return true;
    } catch (e) {
      setHideResetOtpStatusCard(true);
      setError(e?.message || "Invalid or expired code");
      setResetOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => resetOtpInputRefs.current?.[0]?.focus?.(), 100);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const completeResetPassword = async () => {
    setError("");
    setBusy(true);
    try {
      if (!resetToken) throw new Error("Invalid reset token. Please start over.");
      if (!password) throw new Error("Please enter a new password");
      if (String(password).length < 6) throw new Error("Password must be at least 6 characters long");
      if (String(password) !== String(confirmPassword)) throw new Error("Passwords do not match");
      await api.updatePassword(resetToken, password);
      setMode("login");
      setResetStep("email");
      setResetOtpDigits(["", "", "", "", "", ""]);
      setResetOtpStatus(null);
      setResetOtpExpiresAt(null);
      setResetToken(null);
      setPassword("");
      setConfirmPassword("");
      if (asPage) navigate("/login");
      return true;
    } catch (e) {
      setError(e?.message || "Failed to update password");
      return false;
    } finally {
      setBusy(false);
    }
  };

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

  // Ensure we render when used as a full page
  useEffect(() => {
    if (asPage) setShouldRender(true);
  }, [asPage]);

  // Don't render anything if modal should not be rendered
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={backdropRef}
      className={
        asPage
          ? "min-h-screen w-full bg-[#FFF7E6]"
          : "fixed inset-0 flex items-center justify-center z-[9999] backdrop-blur-sm"
      }
      style={
        asPage
          ? undefined
          : {
              backgroundColor: "rgba(0,0,0,0.10)",
              opacity: 0, // Start invisible to prevent flash
            }
      }
      onClick={asPage ? undefined : handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className={
          asPage
            ? "w-full min-h-screen grid md:grid-cols-2 gap-0"
            : "bg-transparent backdrop-blur-lg p-0 rounded-lg shadow-2xl w-full max-w-2xl h-[28rem] relative overflow-hidden flex flex-row items-center border border-[var(--pl-border)]"
        }
        style={{
          ...(asPage
            ? undefined
            : {
                background:
                  "linear-gradient(135deg, #FFDE83 60%, rgba(245,245,245,0.85) 60%, rgba(245,245,245,0.85) 100%)",
                boxShadow:
                  "0 8px 48px 8px rgba(80, 80, 120, 0.25), 0 1.5px 8px 0 rgba(80,80,120,0.10)",
              }),
          ...(asPage ? {} : { opacity: 0, transform: 'scale(0.8) translateY(50px)' }) // Start in initial animation state (modal only)
        }}
        onClick={asPage ? undefined : (e) => e.stopPropagation()}
      >
        {/* Left side (page) / Lottie (modal) */}
        <div
          className={
            asPage
              ? "hidden md:flex items-center justify-center relative overflow-hidden bg-[radial-gradient(90%_80%_at_30%_20%,rgba(232,212,184,0.4),transparent_65%),linear-gradient(180deg,#FFF7E6,#FFFBF5)]"
              : "hidden md:flex flex-col items-center justify-center w-1/2 h-full bg-transparent "
          }
        >
          {asPage && (
            <>
              <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[rgba(232,212,184,0.5)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[rgba(224,183,103,0.4)] blur-3xl" />
            </>
          )}
          {lottieReady && (
            <dotlottie-wc
              src="https://lottie.host/a22e1a8b-a8e9-4fe4-893c-f5ba49c2a4b6/KHjSf9NMKB.lottie"
              speed="1"
              style={{ width: "380px", height: "380px" }}
              mode="forward"
              loop
              autoplay
            ></dotlottie-wc>
          )}
        </div>

        {/* Right side (form) */}
        <div
          className={
            asPage
              ? "relative min-w-0 px-4 sm:px-8 lg:px-12 py-10 flex items-center"
              : "flex-1 flex flex-col justify-center h-full relative bg-transparent min-w-0"
          }
        >
          {!asPage && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 bg-black/85 backdrop-blur-md border border-black/90 text-white hover:bg-black/90 hover:border-black/95 hover:scale-110 text-sm font-bold px-4 py-0.5 rounded-lg z-20 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
              type="button"
            >
              ✕
            </button>
          )}

          {/* Enhanced glow effect (modal only) */}
          {!asPage && (
            <div
              className="absolute inset-0 pointer-events-none rounded-lg"
              style={{ boxShadow: "0 0 12px 3px rgba(128,0,255,0.2)" }}
            ></div>
          )}

          <div
            ref={formRef}
            className={
              asPage
                ? "relative z-10 w-full max-w-2xl mx-auto mt-4 sm:mt-6 rounded-3xl border border-[#F0E0B8] bg-[#FFFBF5] shadow-sm px-5 sm:px-8 py-7 sm:py-8"
                : "relative z-10 px-6 py-4 w-full max-w-full overflow-hidden"
            }
          >
            {asPage && (
              <div className="mb-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Go to home"
                  title="Home"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#F0E0B8] bg-[#FFFBF5] shadow-sm hover:bg-black/5 transition"
                >
                  <Home size={18} className="text-[#1F2933]" />
                </button>
                <div />
              </div>
            )}

            <h2 className="text-xl font-bold mb-6 text-center text-[#1F2933] uppercase" style={{ fontFamily: '"Josefin Sans", sans-serif' }}>
              {mode === 'login' && 'Sign in'}
              {mode === 'register' && 'Sign up'}
              {mode === 'forgot' && 'Reset password'}
            </h2>
            <div
              key={animKey}
              className="transition-all duration-500 ease-out opacity-100 scale-100"
              style={{ 
                animation: 'fadeInScale 0.4s ease-out',
                animationFillMode: 'both'
              }}
            >
              {error && (
                <div className="mb-4 p-4 rounded-xl flex items-start space-x-3 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 shadow-sm">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle className="text-red-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-relaxed text-red-800">
                      {error}
                    </p>
                    {error.includes('user-not-found') && (
                      <p className="text-xs text-red-600 mt-2">
                        This email address is not registered. Please create an account first.
                      </p>
                    )}
                    {error.includes('wrong-password') && (
                      <p className="text-xs text-red-600 mt-2">
                        Please check your password and try again.
                      </p>
                    )}
                    {error.includes('invalid-email') && (
                      <p className="text-xs text-red-600 mt-2">
                        Please enter a valid email address.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {mode === "login" && (
                <div className="flex flex-col gap-4">
                  <Stepper
                    initialStep={1}
                    onStepChange={(step) => setLoginStep(step)}
                    onFinalStepCompleted={submitLogin}
                    backButtonText="Previous"
                    nextButtonText="Next"
                    finalButtonText="Sign in"
                    nextButtonProps={{ disabled: busy || !canProceedLogin }}
                    stepCircleContainerClassName="max-w-none w-full"
                    contentClassName="px-0"
                    footerClassName="px-0"
                    contentInnerClassName="mx-auto w-full max-w-sm"
                    footerInnerClassName="mx-auto w-full max-w-sm"
                    disableStepIndicators={true}
                  >
                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Select account type</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">Choose your portal access to continue.</p>

                      <div className="mt-6 w-full grid grid-cols-3 gap-2">
                        {["Student", "Recruiter", "Admin"].map((opt) => {
                          const active = role === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setRole(opt)}
                              className={`w-full px-2.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-all duration-200 cursor-pointer ${
                                active
                                  ? "bg-[var(--pl-primary)] text-white border-[var(--pl-primary)] shadow-md"
                                  : "bg-[var(--pl-surface-strong)] text-[var(--pl-text)] border-[var(--pl-border)] hover:bg-black/5 hover:border-[var(--pl-border)]"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </Step>
                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Email</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">Enter your registered email.</p>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="Email"
                        className="mt-4 w-full rounded-xl border border-[var(--pl-border)] bg-[var(--pl-surface)] px-3 py-2 text-[var(--pl-text)] placeholder-[var(--pl-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-transparent transition-all duration-200"
                      />
                    </Step>
                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Password</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">Enter your password.</p>
                      <div className="relative mt-4 w-full">
                        <input
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setIsPasswordFocused(true)}
                          onBlur={() => setIsPasswordFocused(false)}
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          className="border border-[var(--pl-border)] rounded-lg px-3 py-2 pr-10 w-full bg-[var(--pl-surface)] text-[var(--pl-text)] placeholder-[var(--pl-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-transparent transition-all duration-200 cursor-text"
                        />
                        {(isPasswordFocused || password.length > 0) && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowPassword(!showPassword);
                            }}
                            onClick={(e) => e.preventDefault()}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--pl-text-muted)] hover:text-[var(--pl-text)] focus:outline-none transition-colors duration-200 cursor-pointer"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </Step>
                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Ready</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">
                        Click <span className="font-semibold">Sign in</span> to continue.
                      </p>
                    </Step>
                  </Stepper>

                  <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
                    <button
                      onClick={() => (asPage ? navigate("/signup") : setMode("register"))}
                      className="text-sm font-semibold text-[var(--pl-link)] hover:text-[var(--pl-link-hover)] hover:bg-black/5 active:bg-black/10 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                      type="button"
                    >
                      Sign up
                    </button>
                    <button
                      onClick={() => (asPage ? navigate("/forgot") : setMode("forgot"))}
                      className="text-sm font-semibold text-[var(--pl-link)] hover:text-[var(--pl-link-hover)] hover:bg-black/5 active:bg-black/10 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                      type="button"
                    >
                      Forgot password
                    </button>
                  </div>
                </div>
              )}

              {mode === "register" && (
                <div className="flex flex-col gap-4">
                  <Stepper
                    initialStep={1}
                    onStepChange={(step) => setRegisterStep(step)}
                    backButtonText="Previous"
                    nextButtonText={
                      registerStep === 2 ? "Send OTP" : registerStep === 3 ? "Verify OTP" : "Next"
                    }
                    finalButtonText="Sign up"
                    nextButtonProps={{ disabled: busy || !canProceedRegister }}
                    stepCircleContainerClassName="max-w-none w-full"
                    contentClassName="px-0"
                    footerClassName="px-0"
                    contentInnerClassName="mx-auto w-full max-w-sm"
                    footerInnerClassName="mx-auto w-full max-w-sm"
                    disableStepIndicators={true}
                    onNext={async ({ currentStep, next, complete }) => {
                      if (currentStep === 1) return next();
                      if (currentStep === 2) {
                        const ok = await sendRegisterOtp();
                        if (ok) next();
                        return;
                      }
                      if (currentStep === 3) {
                        const ok = await verifyRegisterOtp();
                        if (ok) next();
                        return;
                      }
                      if (currentStep === 4) {
                        const ok = await completeRegister();
                        if (ok) complete();
                      }
                    }}
                  >
                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Select account type</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">Choose your portal access to continue.</p>

                      <div className="mt-6 w-full grid grid-cols-3 gap-2">
                        {["Student", "Recruiter", "Admin"].map((opt) => {
                          const active = role === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setRole(opt);
                                setAnimKey(opt);
                                setOtpStep("email");
                                setOtpSent(false);
                                setOtp("");
                                setOtpDigits(["", "", "", "", "", ""]);
                                setOtpStatus(null);
                                setOtpExpiresAt(null);
                                setTimeRemaining(null);
                                setVerificationToken("");
                                setHideOtpStatusCard(false);
                                setError("");
                              }}
                              className={`w-full px-2.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-all duration-200 cursor-pointer ${
                                active
                                  ? "bg-[var(--pl-primary)] text-white border-[var(--pl-primary)] shadow-md"
                                  : "bg-[var(--pl-surface-strong)] text-[var(--pl-text)] border-[var(--pl-border)] hover:bg-black/5 hover:border-[var(--pl-border)]"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </Step>

                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Email</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">We’ll send a 6-digit OTP to verify your email.</p>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="Email"
                        className="mt-4 w-full rounded-xl border border-[var(--pl-border)] bg-[var(--pl-surface)] px-3 py-2 text-[var(--pl-text)] placeholder-[var(--pl-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-transparent transition-all duration-200"
                      />
                    </Step>

                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Verify OTP</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">Enter the 6-digit code sent to your email.</p>

                      {otpStatus && !hideOtpStatusCard && (
                        <div className="mt-4 mb-2 w-full">
                          <div className="flex flex-col items-center gap-2 px-4 py-2.5 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--pl-primary)_10%,white),white)] border-2 border-[color-mix(in_oklab,var(--pl-primary)_22%,white)] rounded-xl shadow-md w-full">
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0">
                                {timeRemaining !== null && timeRemaining > 0 ? (
                                  <Clock className="w-5 h-5 text-[var(--pl-primary)] animate-pulse" strokeWidth={2.5} />
                                ) : timeRemaining === 0 ? (
                                  <XCircle className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                                ) : (
                                  <CheckCircle2 className="w-5 h-5 text-green-500" strokeWidth={2.5} />
                                )}
                              </div>
                              <div className="text-xs font-bold text-[var(--pl-text)] uppercase tracking-wider whitespace-nowrap">
                                {String(otpStatus).replace(/_/g, " ")}
                              </div>
                            </div>
                            {otpExpiresAt && timeRemaining !== null && timeRemaining > 0 && (
                              <div className="text-xs text-[var(--pl-text-secondary)] font-medium flex items-center gap-1 whitespace-nowrap">
                                <span>expires in</span>
                                <span className="font-bold text-[var(--pl-primary)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] px-2 py-0.5 rounded-md">
                                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
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

                      <div className="mt-3 flex justify-center gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <input
                            key={index}
                            ref={(el) => (otpInputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otpDigits[index]}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              const newDigits = [...otpDigits];
                              newDigits[index] = value.slice(-1);
                              setOtpDigits(newDigits);
                              setOtp(newDigits.join(""));
                              if (value && index < 5 && otpInputRefs.current[index + 1]) {
                                otpInputRefs.current[index + 1].focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                if (otpDigits[index]) {
                                  const newDigits = [...otpDigits];
                                  newDigits[index] = "";
                                  setOtpDigits(newDigits);
                                  setOtp(newDigits.join(""));
                                } else if (index > 0) {
                                  otpInputRefs.current[index - 1]?.focus?.();
                                  const newDigits = [...otpDigits];
                                  newDigits[index - 1] = "";
                                  setOtpDigits(newDigits);
                                  setOtp(newDigits.join(""));
                                }
                              }
                            }}
                            className="w-10 h-10 text-center text-lg font-semibold border-2 border-[var(--pl-border)] rounded-lg bg-[var(--pl-surface)] text-[var(--pl-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-[var(--pl-primary)] transition-all duration-200"
                            placeholder="_"
                            disabled={busy}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          setError("");
                          setBusy(true);
                          try {
                            const response = await api.sendOTP(email);
                            setOtpStatus(response?.otpStatus || "PENDING_VERIFICATION");
                            setOtpExpiresAt(response?.otpExpiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString());
                            setOtpDigits(["", "", "", "", "", ""]);
                            setOtp("");
                            setHideOtpStatusCard(false);
                            setTimeout(() => otpInputRefs.current?.[0]?.focus?.(), 100);
                          } catch (e) {
                            setError(e?.message || "Failed to resend OTP");
                          } finally {
                            setBusy(false);
                          }
                        }}
                        disabled={busy || (timeRemaining !== null && timeRemaining > 280)}
                        className="mt-4 w-full text-sm font-semibold text-[var(--pl-link)] hover:text-[var(--pl-link-hover)] hover:bg-black/5 active:bg-black/10 px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-center shadow-sm hover:shadow-md"
                      >
                        Resend OTP
                      </button>
                    </Step>

                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Create password</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">Minimum 6 characters.</p>
                      <div className="relative mt-4 w-full">
                        <input
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setIsPasswordFocused(true)}
                          onBlur={() => setIsPasswordFocused(false)}
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          className="border border-[var(--pl-border)] rounded-lg px-3 py-2 pr-10 w-full bg-[var(--pl-surface)] text-[var(--pl-text)] placeholder-[var(--pl-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-transparent transition-all duration-200"
                        />
                        {(isPasswordFocused || password.length > 0) && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowPassword(!showPassword);
                            }}
                            onClick={(e) => e.preventDefault()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pl-text-muted)] hover:text-[var(--pl-text)] transition-colors duration-200"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </Step>
                  </Stepper>

                  <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
                    <button
                      type="button"
                      onClick={() => (asPage ? navigate("/login") : setMode("login"))}
                      className="text-sm font-semibold text-[var(--pl-link)] hover:text-[var(--pl-link-hover)] hover:bg-black/5 active:bg-black/10 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => (asPage ? navigate("/forgot") : setMode("forgot"))}
                      className="text-sm font-semibold text-[var(--pl-link)] hover:text-[var(--pl-link-hover)] hover:bg-black/5 active:bg-black/10 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                    >
                      Forgot password
                    </button>
                  </div>
                </div>
              )}

              {mode === "forgot" && (
                <div className="flex flex-col gap-4">
                  <Stepper
                    initialStep={1}
                    onStepChange={(step) => setForgotStep(step)}
                    backButtonText="Previous"
                    nextButtonText={forgotStep === 1 ? "Send code" : forgotStep === 2 ? "Verify code" : "Next"}
                    finalButtonText="Update password"
                    nextButtonProps={{ disabled: busy || !canProceedForgot }}
                    stepCircleContainerClassName="max-w-none w-full"
                    contentClassName="px-0"
                    footerClassName="px-0"
                    contentInnerClassName="mx-auto w-full max-w-sm"
                    footerInnerClassName="mx-auto w-full max-w-sm"
                    disableStepIndicators={true}
                    onNext={async ({ currentStep, next, complete }) => {
                      if (currentStep === 1) {
                        const ok = await sendResetCode();
                        if (ok) next();
                        return;
                      }
                      if (currentStep === 2) {
                        const ok = await verifyResetCode();
                        if (ok) next();
                        return;
                      }
                      if (currentStep === 3) {
                        const ok = await completeResetPassword();
                        if (ok) complete();
                      }
                    }}
                  >
                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Email</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">We’ll send a reset code to your email.</p>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="Email"
                        className="mt-4 w-full rounded-xl border border-[var(--pl-border)] bg-[var(--pl-surface)] px-3 py-2 text-[var(--pl-text)] placeholder-[var(--pl-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-transparent transition-all duration-200"
                        disabled={busy}
                      />
                    </Step>

                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Verify code</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">Enter the 6-digit code sent to your email.</p>

                      {resetOtpStatus && !hideResetOtpStatusCard && (
                        <div className="mt-4 mb-2 w-full">
                          <div className="flex flex-col items-center gap-2 px-4 py-2.5 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--pl-primary)_10%,white),white)] border-2 border-[color-mix(in_oklab,var(--pl-primary)_22%,white)] rounded-xl shadow-md w-full">
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0">
                                {resetTimeRemaining !== null && resetTimeRemaining > 0 ? (
                                  <Clock className="w-5 h-5 text-[var(--pl-primary)] animate-pulse" strokeWidth={2.5} />
                                ) : resetTimeRemaining === 0 ? (
                                  <XCircle className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                                ) : (
                                  <CheckCircle2 className="w-5 h-5 text-green-500" strokeWidth={2.5} />
                                )}
                              </div>
                              <div className="text-xs font-bold text-[var(--pl-text)] uppercase tracking-wider whitespace-nowrap">
                                {String(resetOtpStatus).replace(/_/g, " ")}
                              </div>
                            </div>
                            {resetOtpExpiresAt && resetTimeRemaining !== null && resetTimeRemaining > 0 && (
                              <div className="text-xs text-[var(--pl-text-secondary)] font-medium flex items-center gap-1 whitespace-nowrap">
                                <span>expires in</span>
                                <span className="font-bold text-[var(--pl-primary)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] px-2 py-0.5 rounded-md">
                                  {Math.floor(resetTimeRemaining / 60)}:{(resetTimeRemaining % 60).toString().padStart(2, "0")}
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

                      <div className="mt-3 flex justify-center gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <input
                            key={index}
                            ref={(el) => (resetOtpInputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={resetOtpDigits[index]}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              const newDigits = [...resetOtpDigits];
                              newDigits[index] = value.slice(-1);
                              setResetOtpDigits(newDigits);
                              if (value && index < 5 && resetOtpInputRefs.current[index + 1]) {
                                resetOtpInputRefs.current[index + 1].focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                if (resetOtpDigits[index]) {
                                  const newDigits = [...resetOtpDigits];
                                  newDigits[index] = "";
                                  setResetOtpDigits(newDigits);
                                } else if (index > 0) {
                                  resetOtpInputRefs.current[index - 1]?.focus?.();
                                  const newDigits = [...resetOtpDigits];
                                  newDigits[index - 1] = "";
                                  setResetOtpDigits(newDigits);
                                }
                              }
                            }}
                            className="w-10 h-10 text-center text-lg font-semibold border-2 border-[var(--pl-border)] rounded-lg bg-[var(--pl-surface)] text-[var(--pl-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-[var(--pl-primary)] transition-all duration-200"
                            placeholder="_"
                            disabled={busy}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          setError("");
                          setBusy(true);
                          try {
                            const response = await api.resetPassword(email);
                            if (response && response.success) {
                              const status = response?.otpStatus || "PENDING_VERIFICATION";
                              const expiresAt = response?.otpExpiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString();
                              setResetOtpStatus(status);
                              setResetOtpExpiresAt(expiresAt);
                              setResetOtpDigits(["", "", "", "", "", ""]);
                              setHideResetOtpStatusCard(false);
                              setTimeout(() => resetOtpInputRefs.current?.[0]?.focus?.(), 100);
                            } else {
                              setHideResetOtpStatusCard(true);
                              setError(response?.message || "Failed to resend code. Please try again.");
                            }
                          } catch (e) {
                            setHideResetOtpStatusCard(true);
                            setError(e?.message || "Failed to resend code");
                          } finally {
                            setBusy(false);
                          }
                        }}
                        disabled={busy || (resetTimeRemaining !== null && resetTimeRemaining > 580)}
                        className="mt-4 w-full text-sm font-semibold text-[var(--pl-link)] hover:text-[var(--pl-link-hover)] hover:bg-black/5 active:bg-black/10 px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-center shadow-sm hover:shadow-md"
                      >
                        Resend code
                      </button>
                    </Step>

                    <Step>
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">New password</h3>
                      <p className="text-sm text-[var(--pl-text-secondary)]">Choose a new password.</p>

                      <div className="relative mt-4 w-full">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setIsPasswordFocused(true)}
                          onBlur={() => setIsPasswordFocused(false)}
                          placeholder="New Password"
                          className="w-full border border-[var(--pl-border)] rounded-lg px-3 py-2 bg-[var(--pl-surface)] text-[var(--pl-text)] placeholder-[var(--pl-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-transparent transition-all duration-200 pr-10"
                          disabled={busy}
                        />
                        {(isPasswordFocused || password.length > 0) && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowPassword(!showPassword);
                            }}
                            onClick={(e) => e.preventDefault()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pl-text-muted)] hover:text-[var(--pl-text)] transition-colors duration-200"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      <div className="relative mt-3 w-full">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setIsConfirmPasswordFocused(true)}
                          onBlur={() => setIsConfirmPasswordFocused(false)}
                          placeholder="Confirm New Password"
                          className="w-full border border-[var(--pl-border)] rounded-lg px-3 py-2 bg-[var(--pl-surface)] text-[var(--pl-text)] placeholder-[var(--pl-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-transparent transition-all duration-200 pr-10"
                          disabled={busy}
                        />
                        {(isConfirmPasswordFocused || confirmPassword.length > 0) && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowConfirmPassword(!showConfirmPassword);
                            }}
                            onClick={(e) => e.preventDefault()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pl-text-muted)] hover:text-[var(--pl-text)] transition-colors duration-200"
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </Step>
                  </Stepper>

                  <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
                    <button
                      type="button"
                      onClick={() => (asPage ? navigate("/login") : setMode("login"))}
                      className="text-sm font-semibold text-[var(--pl-link)] hover:text-[var(--pl-link-hover)] hover:bg-black/5 active:bg-black/10 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => (asPage ? navigate("/signup") : setMode("register"))}
                      className="text-sm font-semibold text-[var(--pl-link)] hover:text-[var(--pl-link-hover)] hover:bg-black/5 active:bg-black/10 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                    >
                      Sign up
                    </button>
                  </div>
                </div>
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
  );
}

export default LoginModal;