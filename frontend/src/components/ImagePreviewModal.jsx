import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, X, Download } from 'lucide-react';

/**
 * ImagePreviewModal
 * A full-featured lightbox modal with smooth zoom in / zoom out,
 * wheel zoom, click-drag panning, double-click toggle, and keyboard shortcuts.
 */
export default function ImagePreviewModal({ src, alt, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const containerRef = useRef(null);

  // Reset zoom & pan
  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Zoom In
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(Number((prev + 0.25).toFixed(2)), 5));
  }, []);

  // Zoom Out
  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Double click toggles between 1x and 2x
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2);
    }
  };

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale(prev => {
      const next = Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.5), 5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Pointer drag panning
  const handlePointerDown = (e) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy
    });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleZoomIn, handleZoomOut, handleReset]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Download helper
  const handleDownload = (e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = src;
    a.download = alt || 'image';
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
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Top Header Bar */}
        <div style={modalStyles.headerBar} onClick={(e) => e.stopPropagation()}>
          <div style={modalStyles.headerTitle} title={alt || 'Image Preview'}>
            {alt || 'Image Preview'}
          </div>
          <div style={modalStyles.headerActions}>
            <button
              style={modalStyles.iconBtn}
              onClick={handleDownload}
              title="Download image"
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

        {/* Center Image Container */}
        <div
          ref={containerRef}
          style={{
            ...modalStyles.imageViewport,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
          }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={src}
            alt={alt || 'Preview'}
            draggable={false}
            style={{
              ...modalStyles.image,
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
            }}
          />
        </div>

        {/* Floating Bottom Toolbar */}
        <div style={modalStyles.floatingToolbar} onClick={(e) => e.stopPropagation()}>
          <button
            style={modalStyles.toolBtn}
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            title="Zoom Out (-)"
            type="button"
          >
            <ZoomOut size={18} />
          </button>

          <button
            style={modalStyles.zoomLabelBtn}
            onClick={handleReset}
            title="Click to reset (0)"
            type="button"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            style={modalStyles.toolBtn}
            onClick={handleZoomIn}
            disabled={scale >= 5}
            title="Zoom In (+)"
            type="button"
          >
            <ZoomIn size={18} />
          </button>

          <div style={modalStyles.divider} />

          <button
            style={modalStyles.toolBtn}
            onClick={handleReset}
            title="Reset Zoom & Pan"
            type="button"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Instructions pill */}
        <div style={modalStyles.hintPill} onClick={(e) => e.stopPropagation()}>
          Scroll or click buttons to zoom • Drag to pan • Double-click to toggle
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
    backgroundColor: 'rgba(10, 12, 16, 0.88)',
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
    color: '#F3F4F6',
    fontSize: '0.95rem',
    fontWeight: '500',
    maxWidth: '60vw',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)'
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
  imageViewport: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative'
  },
  image: {
    maxWidth: '85vw',
    maxHeight: '80vh',
    objectFit: 'contain',
    borderRadius: '6px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    pointerEvents: 'auto',
    userSelect: 'none'
  },
  floatingToolbar: {
    position: 'absolute',
    bottom: '48px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(24, 26, 32, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '30px',
    padding: '6px 14px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
    zIndex: 10
  },
  toolBtn: {
    background: 'transparent',
    border: 'none',
    color: '#E5E7EB',
    padding: '6px 8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  zoomLabelBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '14px',
    color: '#F9FAFB',
    fontSize: '0.82rem',
    fontWeight: '600',
    padding: '4px 10px',
    minWidth: '55px',
    textAlign: 'center',
    cursor: 'pointer'
  },
  divider: {
    width: '1px',
    height: '18px',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    margin: '0 4px'
  },
  hintPill: {
    position: 'absolute',
    bottom: '16px',
    fontSize: '0.72rem',
    color: 'rgba(255, 255, 255, 0.5)',
    pointerEvents: 'none',
    letterSpacing: '0.02em',
    zIndex: 10
  }
};
