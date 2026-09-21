import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Copy, Check, Trash2, Archive, RotateCcw, Settings } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { getClassroomTheme } from '../utils/classroomUtils';
export const getClassroomCardTheme = (cls) => getClassroomTheme(cls);

export default function ClassroomCard({
  classroom,
  onEnter,
  onOpenGrading,
  onArchive,
  onUnarchive,
  onSettings,
  onDelete,
  isArchived = false,
  role = 'Teacher'
}) {
  const { isDark } = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reactive banner theme: re-reads from localStorage when storage changes
  const [theme, setTheme] = useState(() => getClassroomTheme(classroom));

  useEffect(() => {
    setTheme(getClassroomTheme(classroom));
  }, [classroom?.id, classroom?.code, classroom?.section, classroom?.name, classroom?.theme]);

  useEffect(() => {
    const handleBannerUpdate = (e) => {
      const detail = e.detail;
      if (!detail) return;
      const matches =
        (classroom?.id != null && String(detail.classroomId) === String(classroom.id)) ||
        (classroom?.code && detail.code && String(detail.code).toLowerCase() === String(classroom.code).toLowerCase()) ||
        (classroom?.section && detail.code && String(detail.code).toLowerCase() === String(classroom.section).toLowerCase()) ||
        (classroom?.name && detail.name && String(detail.name).toLowerCase() === String(classroom.name).toLowerCase()) ||
        (detail.keys && detail.keys.includes(`verity_classroom_theme_${classroom?.id}`));

      if (matches && detail.theme) {
        setTheme(detail.theme);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTheme(getClassroomTheme(classroom));
      }
    };

    window.addEventListener('verity:banner-updated', handleBannerUpdate);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('verity:banner-updated', handleBannerUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [classroom?.id, classroom?.code, classroom?.section, classroom?.name, classroom?.theme]);

  const handleCopyCode = (e) => {
    e.stopPropagation();
    const code = classroom.code || classroom.section || (classroom.id ? `vji${classroom.id}ku4` : 'vji3bku4');
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setMenuOpen(false);
    }, 1500);
  };

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.35)' : '0 8px 24px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.2 }}
      style={{
        backgroundColor: isDark ? '#242424' : '#ffffff',
        borderRadius: '16px',
        border: isDark ? '1px solid #383838' : '1px solid #dadce0',
        overflow: 'hidden',
        boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '290px',
        position: 'relative',
        opacity: isArchived ? 0.75 : 1
      }}
      onClick={() => onEnter && onEnter(classroom)}
    >
      {/* ═══ TOP BANNER HEADER ═══ */}
      <div
        style={{
          height: '135px',
          background: theme?.customImageUrl
            ? `url(${theme.customImageUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
          padding: '16px 20px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        {/* SVG Illustration in Top-Right Corner (Matching Google Classroom screenshot) */}
        {!theme?.customImageUrl && (
          <svg
            viewBox="0 0 170 145"
            fill="none"
            style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}
          >
            {/* Dark green background circle accent */}
            <circle cx="145" cy="80" r="70" fill="#0d5d28" opacity="0.6" />

            {/* Open Book tilted */}
            <g transform="translate(106, 28) rotate(-30)">
              {/* Dark Book Cover / Outline */}
              <rect x="-6" y="-6" width="94" height="64" rx="4" fill="#0b4a22" />

              {/* Left Page (mint/off-white) */}
              <rect x="-4" y="-4" width="44" height="60" rx="3" fill="#d8f3e5" />
              {/* Right Page (slightly darker mint) */}
              <rect x="42" y="-4" width="44" height="60" rx="3" fill="#b7e4ce" />

              {/* Center spine */}
              <line x1="41" y1="-5" x2="41" y2="57" stroke="#87bfa5" strokeWidth="1.5" />

              {/* Left Page Ruling Lines */}
              <line x1="4" y1="8" x2="33" y2="8" stroke="#a2d6be" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="4" y1="17" x2="33" y2="17" stroke="#a2d6be" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="4" y1="26" x2="33" y2="26" stroke="#a2d6be" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="4" y1="35" x2="33" y2="35" stroke="#a2d6be" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="4" y1="44" x2="26" y2="44" stroke="#a2d6be" strokeWidth="1.5" strokeLinecap="round" />

              {/* Right Page Ruling Lines */}
              <line x1="49" y1="8" x2="78" y2="8" stroke="#8cbfa9" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="49" y1="17" x2="78" y2="17" stroke="#8cbfa9" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="49" y1="26" x2="78" y2="26" stroke="#8cbfa9" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="49" y1="35" x2="78" y2="35" stroke="#8cbfa9" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="49" y1="44" x2="70" y2="44" stroke="#8cbfa9" strokeWidth="1.5" strokeLinecap="round" />

              {/* Orange Bookmark Ribbon extending down from spine */}
              <path d="M38 16 L38 72 L41 67 L44 72 L44 16 Z" fill="#f26522" />
            </g>
          </svg>
        )}

        {/* Title */}
        <h3
          style={{
            color: '#ffffff',
            fontSize: '1.45rem',
            fontWeight: '700',
            textDecoration: 'none',
            margin: 0,
            lineHeight: 1.2,
            zIndex: 2,
            textShadow: '0 1px 3px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={classroom.name}
        >
          {classroom.name}
        </h3>

        {/* Subtitle / Section */}
        <div
          style={{
            color: 'rgba(255,255,255,0.92)',
            fontSize: '0.95rem',
            fontWeight: '600',
            textDecoration: 'none',
            marginTop: '4px',
            zIndex: 2
          }}
        >
          {classroom.section || classroom.subject || '2'}
        </div>

        {/* Instructor/Subject subtitle if available */}
        {classroom.instructor && role === 'Student' && (
          <div
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.8rem',
              marginTop: 'auto',
              zIndex: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {classroom.instructor}
          </div>
        )}
      </div>

      {/* ═══ MIDDLE WHITE BODY ═══ */}
      <div style={{ flex: 1, backgroundColor: isDark ? '#242424' : '#ffffff', padding: '14px 20px' }}>
        {/* Clean middle area */}
      </div>

      {/* ═══ BOTTOM FOOTER ACTION BAR ═══ */}
      <div
        style={{
          height: '52px',
          borderTop: isDark ? '1px solid #333333' : '1px solid #e2e8f0',
          backgroundColor: isDark ? '#202020' : '#ffffff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '16px',
          flexShrink: 0,
          position: 'relative'
        }}
      >
        {/* MoreVertical Menu */}
        <button
          style={iconButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(prev => !prev);
          }}
          title="More options"
        >
          <MoreVertical size={20} color={isDark ? '#a3a3a3' : '#5f6368'} />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '48px',
              right: '12px',
              backgroundColor: isDark ? '#222222' : '#ffffff',
              borderRadius: '12px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.15)',
              border: isDark ? '1px solid #383838' : '1px solid #e2e8f0',
              zIndex: 60,
              minWidth: '140px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {isArchived ? (
              <div
                style={{ ...dropdownItemStyle, color: isDark ? '#E8EAED' : '#334155' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUnarchive) onUnarchive(e, classroom.id);
                  setMenuOpen(false);
                }}
              >
                <RotateCcw size={15} style={{ marginRight: '8px' }} /> Restore
              </div>
            ) : (
              <>
                <div
                  style={{ ...dropdownItemStyle, color: isDark ? '#E8EAED' : '#334155' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onArchive) onArchive(e, classroom.id);
                    setMenuOpen(false);
                  }}
                >
                  <Archive size={15} style={{ marginRight: '8px' }} /> Archive
                </div>
                {role === 'Teacher' && onSettings && (
                  <div
                    style={{ ...dropdownItemStyle, color: isDark ? '#E8EAED' : '#334155' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSettings(classroom);
                      setMenuOpen(false);
                    }}
                  >
                    <Settings size={15} style={{ marginRight: '8px' }} /> Settings
                  </div>
                )}
                <div
                  style={{ ...dropdownItemStyle, color: isDark ? '#f5f5f5' : '#334155' }}
                  onClick={handleCopyCode}
                >
                  {copied ? <Check size={15} color="#10b981" style={{ marginRight: '8px' }} /> : <Copy size={15} style={{ marginRight: '8px' }} />}
                  {copied ? 'Code Copied!' : 'Copy Code'}
                </div>
              </>
            )}

            {onDelete && (
              <div
                style={{ ...dropdownItemStyle, color: '#ef4444' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(e, classroom.id);
                  setMenuOpen(false);
                }}
              >
                <Trash2 size={15} style={{ marginRight: '8px' }} /> Delete
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const iconButtonStyle = {
  background: 'none',
  border: 'none',
  padding: '6px',
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s'
};

const dropdownItemStyle = {
  padding: '8px 12px',
  color: '#334155',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  borderRadius: '6px',
  transition: 'background-color 0.15s'
};
