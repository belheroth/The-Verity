import React, { useState, useEffect, useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Moon, Sun, Eye, EyeOff, Mail, ArrowLeft, RefreshCw, KeyRound, CheckCircle2, ShieldCheck, Loader2, AlertCircle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../utils/api';
import { useDarkMode } from '../hooks/useDarkMode';
import PasswordRequirements from '../components/PasswordRequirements';

export default function Register({ onBackToLogin }) {
  const { isDark, toggle } = useDarkMode();
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Student'
  });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [message, setMessage] = useState(null); // { type: 'error' | 'success' | 'info', text }
  const [policies, setPolicies] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/kiosk-settings`)
      .then(res => res.json())
      .then(data => {
        if (data && data.settings && data.settings.passwordPolicies) {
          setPolicies(data.settings.passwordPolicies);
        }
      })
      .catch(() => {});
  }, []);

  // Cooldown countdown effect
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-dismiss popup messages after 5 seconds (unless redirecting on success)
  useEffect(() => {
    if (message && message.type !== 'success') {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Auto-focus first OTP input when step changes
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    }
  }, [step]);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential, role: formData.role })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Google Registration successful! Redirecting...' });
        setTimeout(() => onBackToLogin(), 1200);
      } else {
        setMessage({ type: 'error', text: data.message || 'Google registration failed on server' });
      }
    } catch (_) {
      setMessage({ type: 'error', text: 'Could not connect to server.' });
    }
  };

  const handleGoogleError = () => {
    setMessage({ type: 'error', text: 'Google Registration failed' });
  };

  // Step 1: Submit Details & Request Email OTP
  const handleInitiateOtp = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match. Please try again.' });
      return;
    }

    const payload = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role
    };

    setLoading(true);

    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setStep('otp');
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(30);
        setMessage({
          type: 'info',
          text: `A 6-digit verification code has been sent to ${payload.email}.`
        });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to send verification code.' });
      }
    } catch (_) {
      setMessage({ type: 'error', text: 'Could not connect to server. Make sure server is running.' });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Individual Box Handlers
  const handleOtpChange = (index, value) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    if (clean.length > 1) {
      handleOtpPasteDirect(clean, index);
      return;
    }

    const char = clean.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    if (message && message.type === 'error') setMessage(null);

    // Auto-advance focus to next input box
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      handleVerifyOtp(null, fullCode);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const newDigits = [...otpDigits];
      if (!newDigits[index] && index > 0) {
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else {
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handleOtpPasteDirect = (pastedText, startIndex = 0) => {
    const clean = (pastedText || '').replace(/\D/g, '').slice(0, 6);
    if (!clean) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < clean.length; i++) {
      const targetIndex = (startIndex + i < 6) ? startIndex + i : i;
      newDigits[targetIndex] = clean[i];
    }
    setOtpDigits(newDigits);
    if (message && message.type === 'error') setMessage(null);

    const nextFocus = Math.min(5, startIndex + clean.length);
    inputRefs.current[nextFocus]?.focus();

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      handleVerifyOtp(null, fullCode);
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData?.getData('text');
    if (paste) {
      handleOtpPasteDirect(paste, 0);
      e.preventDefault();
    }
  };

  // Step 2: Submit OTP & Complete Registration
  const handleVerifyOtp = async (e, codeOverride = null) => {
    if (e) e.preventDefault();
    const cleanOtp = (codeOverride || otpDigits.join('')).trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setMessage({ type: 'error', text: 'Please enter all 6 digits of the verification code.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          otp: cleanOtp
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.pendingApproval) {
          setMessage({
            type: 'success',
            text: 'Account created! Your instructor account is pending administrator approval. Redirecting to login...'
          });
        } else {
          setMessage({
            type: 'success',
            text: 'Account verified and created successfully! Redirecting to login...'
          });
        }
        setTimeout(() => onBackToLogin(), 2000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Verification failed. Please check your code.' });
      }
    } catch (_) {
      setMessage({ type: 'error', text: 'Could not connect to server.' });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setMessage(null);

    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(45);
        setMessage({ type: 'info', text: 'A new 6-digit verification code was sent to your email.' });
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to resend code.' });
      }
    } catch (_) {
      setMessage({ type: 'error', text: 'Could not connect to server.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className="auth-container"
      style={{
        ...styles.container,
        background: isDark
          ? 'linear-gradient(180deg, #323232 0%, #262626 45%, #1a1a1a 100%)'
          : 'linear-gradient(to bottom, #f3f4f6 0%, #9ca3af 100%)',
      }}
    >
      {/* Top Left Logo */}
      <div style={styles.logoContainer}>
        <span style={styles.logoV}>V</span>
        <span style={{ ...styles.logoText, color: isDark ? '#f4f4f5' : 'white' }}>erity</span>
      </div>

      {/* Top Right Dark Mode Switch */}
      <button
        onClick={toggle}
        type="button"
        style={{
          position: 'absolute',
          top: '30px',
          right: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: isDark ? '#262626' : 'white',
          border: isDark ? '1px solid #3f3f46' : '1px solid #e2e8f0',
          color: isDark ? '#f4f4f5' : '#374151',
          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        className="btn-anim"
        title="Toggle dark/light mode"
      >
        {isDark ? <Sun size={19} color="#f59e0b" /> : <Moon size={19} color="#6366f1" />}
      </button>

      {/* FLOATING POP-UP TOAST / NOTIFICATION (Zero layout shift, perfectly centered) */}
      <AnimatePresence>
        {message && (
          <div
            style={{
              position: 'fixed',
              top: '28px',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 99999,
              padding: '0 16px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                borderRadius: '14px',
                backgroundColor: message.type === 'error'
                  ? (isDark ? '#3b1212' : '#fef2f2')
                  : message.type === 'success'
                  ? (isDark ? '#0f291e' : '#ecfdf5')
                  : (isDark ? '#1a2233' : '#eff6ff'),
                border: `1px solid ${
                  message.type === 'error'
                    ? (isDark ? '#7f1d1d' : '#fca5a5')
                    : message.type === 'success'
                    ? (isDark ? '#065f46' : '#6ee7b7')
                    : (isDark ? '#1e3a8a' : '#93c5fd')
                }`,
                color: message.type === 'error'
                  ? (isDark ? '#fca5a5' : '#b91c1c')
                  : message.type === 'success'
                  ? (isDark ? '#6ee7b7' : '#047857')
                  : (isDark ? '#93c5fd' : '#1d4ed8'),
                boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                maxWidth: '480px',
                width: 'auto',
                fontSize: '0.92rem',
                fontWeight: '500',
                textAlign: 'left'
              }}
            >
              {message.type === 'error' && <AlertCircle size={18} style={{ flexShrink: 0 }} />}
              {message.type === 'success' && <CheckCircle2 size={18} style={{ flexShrink: 0 }} />}
              {message.type === 'info' && <Info size={18} style={{ flexShrink: 0 }} />}

              <span style={{ lineHeight: 1.4, flex: 1 }}>{message.text}</span>

              <button
                type="button"
                onClick={() => setMessage(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'currentColor',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.75,
                  marginLeft: '6px',
                  flexShrink: 0
                }}
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Registration Card */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          ...styles.card,
          backgroundColor: isDark ? '#262626' : 'white',
          border: isDark ? '1px solid #3f3f46' : 'none',
          boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.15)',
        }}
      >
        {step === 'form' ? (
          /* STEP 1: REGISTRATION FORM */
          <form onSubmit={handleInitiateOtp} style={styles.form}>
            {/* Name Fields */}
            <div style={styles.flexRow}>
              <input
                type="text"
                placeholder="First Name"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{
                  ...styles.input,
                  flex: 1,
                  backgroundColor: isDark ? '#333338' : '#f9fafb',
                  borderColor: isDark ? '#4a4a52' : '#e5e7eb',
                  color: isDark ? '#f4f4f5' : '#4b5563',
                }}
              />
              <input
                type="text"
                placeholder="Last Name"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={{
                  ...styles.input,
                  flex: 1,
                  backgroundColor: isDark ? '#333338' : '#f9fafb',
                  borderColor: isDark ? '#4a4a52' : '#e5e7eb',
                  color: isDark ? '#f4f4f5' : '#4b5563',
                }}
              />
            </div>

            <input
              type="email"
              placeholder="Email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                ...styles.input,
                backgroundColor: isDark ? '#333338' : '#f9fafb',
                borderColor: isDark ? '#4a4a52' : '#e5e7eb',
                color: isDark ? '#f4f4f5' : '#4b5563',
              }}
            />

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{
                  ...styles.input,
                  backgroundColor: isDark ? '#333338' : '#f9fafb',
                  borderColor: isDark ? '#4a4a52' : '#e5e7eb',
                  color: isDark ? '#f4f4f5' : '#4b5563',
                  paddingRight: '40px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: isDark ? '#9ca3af' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <PasswordRequirements password={formData.password} policies={policies} />

            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Retype Password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                style={{
                  ...styles.input,
                  backgroundColor: isDark ? '#333338' : '#f9fafb',
                  borderColor: isDark ? '#4a4a52' : '#e5e7eb',
                  color: isDark ? '#f4f4f5' : '#4b5563',
                  paddingRight: '40px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: isDark ? '#9ca3af' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Role Checkboxes */}
            <div style={styles.checkboxContainer}>
              <label style={{ ...styles.checkboxLabel, color: isDark ? '#d4d4d8' : '#6b7280' }}>
                <input
                  type="checkbox"
                  checked={formData.role === 'Student'}
                  onChange={() => setFormData({ ...formData, role: 'Student' })}
                  style={styles.checkbox}
                /> Student
              </label>
              <label style={{ ...styles.checkboxLabel, color: isDark ? '#d4d4d8' : '#6b7280' }}>
                <input
                  type="checkbox"
                  checked={formData.role === 'Teacher'}
                  onChange={() => setFormData({ ...formData, role: 'Teacher' })}
                  style={styles.checkbox}
                /> Teacher
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: loading ? 0.75 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <span>Continue & Verify Email</span>
              )}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }}></div>
              <span style={{ padding: '0 10px', color: isDark ? '#71717a' : '#9ca3af', fontSize: '0.9rem' }}>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }}></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="signup_with"
                theme="filled_blue"
                useOneTap
              />
            </div>

            {/* Back to login link */}
            <p style={{ ...styles.loginText, color: isDark ? '#a1a1aa' : '#9ca3af' }}>
              Already have an account? <span onClick={onBackToLogin} style={styles.loginLink}>Login</span>
            </p>
          </form>
        ) : (
          /* STEP 2: OTP VERIFICATION */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Back to Edit Details */}
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setMessage(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: isDark ? '#a1a1aa' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
                padding: 0,
                alignSelf: 'flex-start'
              }}
            >
              <ArrowLeft size={16} /> Edit details
            </button>

            {/* Icon & Heading */}
            <div style={{ textAlign: 'center', margin: '6px 0 10px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: isDark ? '#133527' : '#ECFDF5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}
              >
                <ShieldCheck size={32} />
              </div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: '700', color: isDark ? '#f4f4f5' : '#1e293b' }}>
                Verify your email
              </h2>
              <p style={{ margin: 0, fontSize: '0.88rem', color: isDark ? '#a1a1aa' : '#64748b', lineHeight: 1.4 }}>
                Enter the 6-digit code sent to<br />
                <strong style={{ color: isDark ? '#e4e4e7' : '#1e293b' }}>{formData.email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 6 Individual Digit Boxes */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  margin: '8px 0 4px 0'
                }}
                onPaste={handleOtpPaste}
              >
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    onFocus={e => e.target.select()}
                    style={{
                      width: '50px',
                      height: '58px',
                      borderRadius: '14px',
                      border: digit
                        ? '2px solid #10b981'
                        : isDark
                        ? '1.5px solid #4a4a52'
                        : '1.5px solid #cbd5e1',
                      backgroundColor: isDark ? '#1f1f23' : '#f8fafc',
                      color: isDark ? '#f4f4f5' : '#111827',
                      fontSize: '1.6rem',
                      fontWeight: '700',
                      textAlign: 'center',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                      boxShadow: digit ? '0 0 0 3px rgba(16, 185, 129, 0.18)' : 'none'
                    }}
                  />
                ))}
              </div>

              <p style={{ margin: '0 0 4px 0', textAlign: 'center', fontSize: '0.78rem', color: isDark ? '#71717a' : '#94a3b8' }}>
                This code is valid for 15 minutes.
              </p>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || otpDigits.join('').length < 6}
                style={{
                  ...styles.button,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: loading || otpDigits.join('').length < 6 ? 0.65 : 1,
                  cursor: loading || otpDigits.join('').length < 6 ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={18} />
                    <span>Verify & Create Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Resend Code Section */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <span style={{ color: isDark ? '#a1a1aa' : '#64748b' }}>Didn't receive the code?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || resending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? (isDark ? '#71717a' : '#9ca3af') : '#10b981',
                  fontWeight: '700',
                  cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  padding: 0,
                  fontSize: '0.85rem'
                }}
              >
                {resending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>

            {/* Back to Login */}
            <p style={{ ...styles.loginText, marginTop: '8px', color: isDark ? '#a1a1aa' : '#9ca3af' }}>
              Already have an account? <span onClick={onBackToLogin} style={styles.loginLink}>Login</span>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// STYLES 
const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Arial, Helvetica, sans-serif',
    position: 'relative',
    padding: '20px',
    boxSizing: 'border-box',
    transition: 'background 0.3s ease',
  },
  logoContainer: {
    position: 'absolute',
    top: '30px',
    left: '40px',
    fontSize: '2.5rem',
    fontWeight: '900',
    fontStyle: 'italic',
    textShadow: '2px 2px 4px rgba(0,0,0,0.15)'
  },
  logoV: { color: '#10b981' },
  logoText: { color: 'white' },
  card: {
    backgroundColor: 'white',
    padding: '40px 44px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    boxSizing: 'border-box',
    transition: 'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  flexRow: {
    display: 'flex',
    gap: '10px',
    width: '100%'
  },
  input: {
    width: '100%',
    padding: '15px',
    borderRadius: '15px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#4b5563',
    fontSize: '1rem',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
    outline: 'none',
    transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
  },
  checkboxContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    margin: '10px 0'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '1rem'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  button: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '15px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.05rem',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
  },
  loginText: {
    textAlign: 'center',
    marginTop: '16px',
    color: '#9ca3af',
    fontSize: '0.9rem'
  },
  loginLink: {
    color: '#10b981',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  error: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.4 },
  success: { backgroundColor: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.4 },
  info: { padding: '12px 16px', borderRadius: '12px', marginBottom: '12px', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.4 }
};