import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, X, Clipboard, ExternalLink, Globe } from 'lucide-react';

/**
 * AddLinkModal
 * A modern pop-up modal for pasting and configuring a link attachment.
 */
export default function AddLinkModal({ isOpen, onClose, onAdd, isDark = false }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [clipboardAvailable, setClipboardAvailable] = useState(false);
  const inputRef = useRef(null);

  // Check clipboard API availability & auto-read if valid URL
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setTitle('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 80);

      if (navigator.clipboard && navigator.clipboard.readText) {
        setClipboardAvailable(true);
        navigator.clipboard.readText()
          .then((clipText) => {
            const trimmed = (clipText || '').trim();
            if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
              setUrl(trimmed);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen]);

  // Keyboard navigation: Escape to close, Enter to submit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setError('');
      }
    } catch {
      // Clipboard permission denied or unavailable
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Please paste or enter a URL');
      inputRef.current?.focus();
      return;
    }

    // Auto-prefix protocol if missing
    let normalizedUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Validate URL format
    try {
      new URL(normalizedUrl);
    } catch {
      setError('Please enter a valid URL (e.g. https://example.com)');
      return;
    }

    const displayName = title.trim() || trimmedUrl;
    onAdd({
      type: 'link',
      name: displayName,
      url: normalizedUrl
    });
    onClose();
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
    previewBg: isDark ? '#1F2937' : '#F0FDF4',
    previewBorder: isDark ? '#374151' : '#BBF7D0',
    previewText: isDark ? '#34D399' : '#15803D'
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
        onClick={onClose}
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
            maxWidth: '480px',
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
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? '#133527' : '#ECFDF5',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Link2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: '700', color: colors.title }}>
                  Paste a Link
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: colors.subText, marginTop: '2px' }}>
                  Attach an external URL or resource
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: colors.subText,
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close (Esc)"
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* URL Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: '600', color: colors.title }}>
                  Link URL <span style={{ color: '#EF4444' }}>*</span>
                </label>
                {clipboardAvailable && (
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#10B981',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <Clipboard size={12} /> Paste from Clipboard
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="https://example.com/document"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 36px',
                    borderRadius: '10px',
                    border: `1px solid ${error ? '#EF4444' : colors.inputBorder}`,
                    backgroundColor: colors.inputBg,
                    color: colors.inputText,
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Globe
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: colors.subText,
                    pointerEvents: 'none'
                  }}
                />
              </div>

              {error && (
                <div style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '6px' }}>
                  {error}
                </div>
              )}
            </div>

            {/* Title / Name Input (Optional) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: '600', color: colors.title }}>
                  Display Text <span style={{ fontSize: '0.75rem', fontWeight: '400', color: colors.subText }}>(optional)</span>
                </label>
              </div>
              <input
                type="text"
                placeholder="e.g. Reference Guide or Project Docs"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.inputBorder}`,
                  backgroundColor: colors.inputBg,
                  color: colors.inputText,
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Live Preview if URL entered */}
            {url.trim() && (
              <div
                style={{
                  backgroundColor: colors.previewBg,
                  border: `1px solid ${colors.previewBorder}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  color: colors.previewText
                }}
              >
                <ExternalLink size={14} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: '600', flexShrink: 0 }}>Preview:</span>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {title.trim() || url.trim()}
                </span>
              </div>
            )}

            {/* Footer Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                marginTop: '10px'
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.title,
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  padding: '9px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)'
                }}
              >
                Add Link
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
