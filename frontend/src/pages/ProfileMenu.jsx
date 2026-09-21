import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { useCurrentUser } from '../hooks/useCurrentUser';

/**
 * ProfileMenu — the clickable profile avatar shown in the top-right of every
 * dashboard. Clicking it opens a dropdown with the signed-in user's identity
 * and account details (name, email, role badge, status) plus a dark mode switch and Logout.
 * Dynamically resolves user from props, reactive hook, or localStorage.
 */
export default function ProfileMenu({ onLogout, currentUser: propUser }) {
  const { isDark, toggle } = useDarkMode();
  const { currentUser: hookUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const ref = useRef(null);

  // Dynamic user resolution with fallback chain
  const currentUser = propUser || hookUser || (() => {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const name = currentUser?.name || currentUser?.username || 'User';
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
  const getInitials = (str, emailStr) => {
    if (str && str !== 'User') {
      const parts = str.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return str.slice(0, 2).toUpperCase();
    }
    if (emailStr) {
      const prefix = emailStr.split('@')[0];
      return prefix.slice(0, 2).toUpperCase();
    }
    return '';
  };

  const initials = getInitials(name, email);

  // Role badge color scheme
  const getRoleBadgeStyle = (roleStr) => {
    const r = (roleStr || '').toLowerCase();
    if (r === 'admin') {
      return {
        bg: isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
        text: isDark ? '#a5b4fc' : '#4338ca',
        border: isDark ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid #c7d2fe'
      };
    }
    if (r === 'teacher' || r === 'instructor') {
      return {
        bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
        text: isDark ? '#6ee7b7' : '#065f46',
        border: isDark ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #a7f3d0'
      };
    }
    return {
      bg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
      text: isDark ? '#93c5fd' : '#1e40af',
      border: isDark ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #bfdbfe'
    };
  };

  const roleBadge = getRoleBadgeStyle(role);

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
          backgroundColor: isDark ? '#262626' : 'white',
          border: isDark ? '1px solid #3f3f46' : '1px solid #e2e8f0',
          boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.12)',
        }}>
          {/* Identity Section */}
          <div style={styles.identity}>
            <div style={{
              ...styles.avatar,
              backgroundColor: avatarUrl && !imgError ? 'transparent' : (isDark ? '#333338' : '#e5e7eb'),
              border: isDark ? '1.5px solid #52525b' : '1.5px solid #e2e8f0',
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
            <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <div style={{ ...styles.name, color: isDark ? '#f4f4f5' : '#18181b' }} title={name}>{name}</div>
              {email && (
                <div style={{ ...styles.sub, color: isDark ? '#a1a1aa' : '#71717a' }} title={email}>{email}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                {role && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: roleBadge.bg,
                    color: roleBadge.text,
                    border: roleBadge.border,
                    letterSpacing: '0.02em',
                    lineHeight: '1.2'
                  }}>
                    {role}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ ...styles.divider, backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }} />

          {/* Dark Mode Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isDark
                ? <Moon size={16} color="#818cf8" />
                : <Sun size={16} color="#f59e0b" />}
              <span style={{ fontSize: '0.88rem', fontWeight: '600', color: isDark ? '#f4f4f5' : '#27272a' }}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            {/* Animated pill toggle */}
            <div
              onClick={toggle}
              title="Toggle dark mode"
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '9999px',
                backgroundColor: isDark ? '#818cf8' : '#cbd5e1',
                position: 'relative',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background-color 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                transform: isDark ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }} />
            </div>
          </div>

          <div style={{ ...styles.divider, backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }} />

          <button onClick={onLogout} style={styles.logoutBtn}>
            <LogOut size={17} /> <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { position: 'relative' },
  profileCircle: {
    width: '44px',
    height: '44px',
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
    top: '54px',
    right: 0,
    zIndex: 250,
    width: '260px',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
  name: { color: '#18181b', fontWeight: '700', fontSize: '0.98rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub: { color: '#71717a', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' },
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
    fontWeight: '700',
    fontSize: '0.92rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
};
