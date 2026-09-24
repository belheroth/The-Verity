import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Mail, User, Loader2, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { apiFetch } from '../utils/api';

/**
 * AddStudentModal
 * A modern pop-up modal for instructors to manually enroll a student into a classroom.
 */
export default function AddStudentModal({
  isOpen,
  onClose,
  classroomId,
  classCode,
  onSuccess,
  isDark = false
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setName('');
      setError('');
      setSuccessMsg('');
      setLoading(false);
      setTimeout(() => emailInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter a valid student email address.');
      emailInputRef.current?.focus();
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g., student@school.edu).');
      emailInputRef.current?.focus();
      return;
    }

    const trimmedName = name.trim() || trimmedEmail.split('@')[0];

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classrooms/${classroomId}/enroll`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentEmail: trimmedEmail,
            studentName: trimmedName
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to add student to classroom.');
      }

      // Also persist to local storage enrollment key for instant peer detection
      try {
        const localKey = `verity_classroom_enrollments_${classroomId}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        const alreadyExists = existing.some(
          (s) => s.email?.toLowerCase() === trimmedEmail.toLowerCase()
        );
        if (!alreadyExists) {
          existing.push({
            name: trimmedName,
            email: trimmedEmail,
            avatar: null
          });
          localStorage.setItem(localKey, JSON.stringify(existing));
        }
      } catch {}

      setSuccessMsg(`Successfully added ${trimmedName}!`);

      setTimeout(() => {
        if (onSuccess) {
          onSuccess({ email: trimmedEmail, name: trimmedName, data });
        }
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'An error occurred while adding the student.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const colors = {
    overlayBg: 'rgba(0, 0, 0, 0.65)',
    cardBg: isDark ? '#262626' : '#FFFFFF',
    border: isDark ? '#404040' : '#E5E7EB',
    title: isDark ? '#F3F4F6' : '#111827',
    subText: isDark ? '#9CA3AF' : '#6B7280',
    inputBg: isDark ? '#333333' : '#F9FAFB',
    inputBorder: isDark ? '#4B5563' : '#D1D5DB',
    inputText: isDark ? '#F9FAFB' : '#111827',
    infoBg: isDark ? '#1a2e22' : '#ecfdf5',
    infoBorder: isDark ? '#065f46' : '#a7f3d0',
    infoText: isDark ? '#6ee7b7' : '#047857'
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.overlayBg,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '16px'
        }}
        onClick={() => {
          if (!loading) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 20px 45px rgba(0,0,0,0.35)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${colors.border}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? '#133527' : '#ECFDF5',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <UserPlus size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: '700', color: colors.title }}>
                  Add Student
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: colors.subText, marginTop: '2px' }}>
                  Enroll a student directly into this classroom
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: colors.subText,
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.5 : 1
              }}
              title="Close (Esc)"
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Feedback Banners */}
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? '#3d1616' : '#fef2f2',
                  border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
                  color: isDark ? '#fca5a5' : '#b91c1c',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: colors.infoBg,
                  border: `1px solid ${colors.infoBorder}`,
                  color: colors.infoText,
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: colors.title, marginBottom: '6px' }}>
                Student Email <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  ref={emailInputRef}
                  type="email"
                  required
                  placeholder="student@school.edu"
                  value={email}
                  disabled={loading}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: '10px',
                    border: `1px solid ${error ? '#EF4444' : colors.inputBorder}`,
                    backgroundColor: colors.inputBg,
                    color: colors.inputText,
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: colors.subText,
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </div>

            {/* Name Field (Optional) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: '600', color: colors.title }}>
                  Student Name <span style={{ fontSize: '0.75rem', fontWeight: '400', color: colors.subText }}>(optional)</span>
                </label>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  disabled={loading}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.inputBorder}`,
                    backgroundColor: colors.inputBg,
                    color: colors.inputText,
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: colors.subText,
                    pointerEvents: 'none'
                  }}
                />
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: colors.subText }}>
                Leave empty to automatically derive the name from the email address.
              </p>
            </div>

            {/* Class Code Info Box */}
            {classCode && (
              <div
                style={{
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                  color: isDark ? '#CBD5E1' : '#475569'
                }}
              >
                <span>Alternatively, students can join with code:</span>
                <strong style={{ color: '#10B981', letterSpacing: '1px', fontSize: '0.9rem' }}>
                  {classCode}
                </strong>
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '10px',
                marginTop: '8px'
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.title,
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Cancel
              </button>

              <motion.button
                type="submit"
                disabled={loading || Boolean(successMsg)}
                whileHover={loading ? {} : { scale: 1.02 }}
                whileTap={loading ? {} : { scale: 0.98 }}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: loading || successMsg ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                  opacity: loading || successMsg ? 0.8 : 1
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : successMsg ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Add Student</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
