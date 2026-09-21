import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, AlertCircle, Video } from 'lucide-react';

/**
 * Helper to determine the best MIME type for a video URL or name
 */
export const getVideoType = (url = '', name = '') => {
  const target = (url + ' ' + name).toLowerCase();
  if (target.includes('.webm')) return 'video/webm';
  if (target.includes('.mov') || target.includes('.quicktime')) return 'video/quicktime';
  if (target.includes('.ogg') || target.includes('.ogv')) return 'video/ogg';
  return 'video/mp4';
};

/**
 * VideoPreviewModal
 * Fullscreen pop-up lightbox for playing uploaded MP4, WebM, and MOV videos.
 */
export default function VideoPreviewModal({ src, name, onClose }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Keyboard navigation (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleDownload = (e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = src;
    a.download = name || 'video';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!src) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={modalStyles.overlay}
        onClick={onClose}
      >
        {/* Top Header Bar */}
        <div style={modalStyles.headerBar} onClick={(e) => e.stopPropagation()}>
          <div style={modalStyles.headerTitle} title={name || 'Video Preview'}>
            <Video size={18} style={{ marginRight: '8px', color: '#10B981' }} />
            <span>{name || 'Video Preview'}</span>
          </div>
          <div style={modalStyles.headerActions}>
            <button
              style={modalStyles.iconBtn}
              onClick={handleDownload}
              title="Download video"
              type="button"
            >
              <Download size={18} />
            </button>
            <button
              style={modalStyles.closeBtn}
              onClick={onClose}
              title="Close (Esc)"
              type="button"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Center Video Container */}
        <div style={modalStyles.viewport} onClick={(e) => e.stopPropagation()}>
          {!hasError ? (
            <video
              src={src}
              controls
              autoPlay
              playsInline
              preload="metadata"
              style={modalStyles.video}
              onError={() => setHasError(true)}
            >
              Your browser does not support playing this video.
            </video>
          ) : (
            <div style={modalStyles.errorBox}>
              <AlertCircle size={42} color="#F59E0B" />
              <h4 style={{ margin: '12px 0 6px', color: '#F3F4F6' }}>Video Format Notice</h4>
              <p style={{ margin: '0 0 16px', color: '#9CA3AF', fontSize: '0.88rem', textAlign: 'center', maxWidth: '360px' }}>
                This video (such as QuickTime .mov with HEVC or Apple ProRes codec) cannot be decoded natively by this browser.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                style={modalStyles.downloadActionBtn}
              >
                <Download size={16} style={{ marginRight: '6px' }} /> Download / Play in Native Player
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 12, 16, 0.9)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 999999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    overflow: 'hidden'
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
    zIndex: 10
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    color: '#F3F4F6',
    fontSize: '0.95rem',
    fontWeight: '500',
    maxWidth: '60vw',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '8px',
    color: '#FFFFFF',
    padding: '7px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  closeBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '8px',
    color: '#FF6B6B',
    padding: '7px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  viewport: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px 24px',
    boxSizing: 'border-box'
  },
  video: {
    maxWidth: '85vw',
    maxHeight: '80vh',
    borderRadius: '10px',
    backgroundColor: '#000000',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
  },
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px',
    backgroundColor: '#1F2937',
    borderRadius: '16px',
    border: '1px solid #374151'
  },
  downloadActionBtn: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '0.88rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  }
};
