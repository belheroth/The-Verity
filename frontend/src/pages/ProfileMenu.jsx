import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { useCurrentUser } from '../hooks/useCurrentUser';

/**
 * ProfileMenu — the clickable profile avatar shown in the top-right of every
 * dashboard. Clicking it opens a dropdown with the signed-in user's identity
 * and a Logout action. Reads and reactively synchronizes the current user
 * so profile picture changes reflect immediately without requiring a page reload.
 */
export default function ProfileMenu({ onLogout }) {
  const { isDark } = useDarkMode();
  const { currentUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const ref = useRef(null);

  const name = currentUser?.name || 'User';
  const role = currentUser?.role || '';
  const email = currentUser?.email || '';
  const avatarUrl = currentUser?.avatar || currentUser?.profilePicture;

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  // Close the dropdown when clicking anywhere outside it.
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Compute initials fallback (e.g. "Juan Dela Cruz" -> "JD", "Alex" -> "AL")
  const getInitials = (str) => {
    if (!str || str === 'User') return '';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <div ref={ref} style={styles.wrapper}>
      <div
        style={{
          ...styles.profileCircle,
          backgroundColor: avatarUrl && !imgError ? 'transparent' : (isDark ? '#262626' : '#d1d5db'),
          border: isDark ? '1.5px solid #404040' : '1.5px solid #cbd5e1',
          overflow: 'hidden',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onClick={() => setOpen((o) => !o)}
        title={name}
        className="btn-anim"
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={name}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : initials ? (
          <span style={{ fontSize: '1rem', fontWeight: '800', color: isDark ? '#E8EAED' : '#1f2937', letterSpacing: '0.02em' }}>
            {initials}
          </span>
        ) : (
          <User size={24} color={isDark ? '#d4d4d4' : '#6b7280'} />
        )}
      </div>

      {open && (
        <div style={{
          ...styles.menu,
          backgroundColor: isDark ? '#323232' : 'white',
          border: isDark ? '1px solid #4A4A4A' : 'none',
          boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.15)',
        }}>
          <div style={styles.identity}>
            <div style={{
              ...styles.avatar,
              backgroundColor: avatarUrl && !imgError ? 'transparent' : (isDark ? '#3C3C3C' : '#e5e7eb'),
              border: isDark ? '1.5px solid #4A4A4A' : '1.5px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: isDark ? 'none' : 'inset 2px 2px 5px rgba(255,255,255,0.7), inset -2px -2px 5px rgba(0,0,0,0.1)'
            }}>
              {avatarUrl && !imgError ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  onError={() => setImgError(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              ) : initials ? (
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: isDark ? '#E8EAED' : '#1f2937' }}>
                  {initials}
                </span>
              ) : (
                <User size={22} color={isDark ? '#d4d4d4' : '#6b7280'} />
              )}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ ...styles.name, color: isDark ? '#E8EAED' : '#1f2937' }}>{name}</div>
              <div style={{ ...styles.sub, color: isDark ? '#9AA0A6' : '#6b7280' }}>{email || role}</div>
              {email && role && <div style={styles.role}>{role}</div>}
            </div>
          </div>

          <div style={{ ...styles.divider, backgroundColor: isDark ? '#383838' : '#e5e7eb' }} />

          <button onClick={onLogout} style={styles.logoutBtn}>
            <LogOut size={18} /> <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { position: 'relative' },
  profileCircle: {
    width: '46px',
    height: '46px',
    backgroundColor: '#d1d5db',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    flexShrink: 0
  },
  menu: {
    position: 'absolute',
    top: '58px',
    right: 0,
    zIndex: 200,
    width: '240px',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  identity: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: {
    width: '44px',
    height: '44px',
    flexShrink: 0,
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.7), inset -2px -2px 5px rgba(0,0,0,0.1)',
  },
  name: { color: '#1f2937', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub: { color: '#6b7280', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  role: { color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '2px' },
  divider: { height: '1px', backgroundColor: '#e5e7eb' },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    backgroundColor: '#fee2e2',
    color: '#ef4444',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
};
