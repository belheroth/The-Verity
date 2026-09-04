import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut } from 'lucide-react';

/**
 * ProfileMenu — the clickable profile avatar shown in the top-right of every
 * dashboard. Clicking it opens a dropdown with the signed-in user's identity
 * and a Logout action. Reads the current user from localStorage so it works
 * for any role without extra props.
 */
export default function ProfileMenu({ onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Pull the signed-in user saved by App.jsx at login.
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();

  // Close the dropdown when clicking anywhere outside it.
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const name = user.name || 'User';
  const role = user.role || '';
  const email = user.email || '';

  return (
    <div ref={ref} style={styles.wrapper}>
      <div
        style={styles.profileCircle}
        onClick={() => setOpen((o) => !o)}
        title="Account"
      >
        <User size={24} color="#6b7280" />
      </div>

      {open && (
        <div style={styles.menu}>
          <div style={styles.identity}>
            <div style={styles.avatar}>
              <User size={22} color="#6b7280" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={styles.name}>{name}</div>
              <div style={styles.sub}>{email || role}</div>
              {email && role && <div style={styles.role}>{role}</div>}
            </div>
          </div>

          <div style={styles.divider} />

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
    width: '50px', height: '50px', backgroundColor: '#d1d5db', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
  },
  menu: {
    position: 'absolute', top: '62px', right: 0, zIndex: 200,
    width: '240px', backgroundColor: 'white', borderRadius: '16px',
    padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'sans-serif',
  },
  identity: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: {
    width: '44px', height: '44px', flexShrink: 0, borderRadius: '50%',
    backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.7), inset -2px -2px 5px rgba(0,0,0,0.1)',
  },
  name: { color: '#1f2937', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sub: { color: '#6b7280', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  role: { color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '2px' },
  divider: { height: '1px', backgroundColor: '#e5e7eb' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    width: '100%', padding: '10px', backgroundColor: '#fee2e2', color: '#ef4444',
    border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer',
  },
};
