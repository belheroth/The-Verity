import React, { useState } from 'react';
import { Shield, Lock, Moon, Sun, KeyRound, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useDarkMode } from '../../hooks/useDarkMode';

export default function AdminLogin({ onLogin }) {
  const { isDark, toggle } = useDarkMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.message || 'Invalid admin credentials');
      }
    } catch (_) {
      setError('Could not connect to Verity Admin Security Service. Make sure server.js is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-container"
      style={{
        ...styles.container,
        background: isDark
          ? 'linear-gradient(180deg, #1e1e24 0%, #111115 100%)'
          : 'linear-gradient(180deg, #334155 0%, #0f172a 100%)',
      }}
    >
      {/* Top Left Admin Badge Logo */}
      <div style={styles.logoContainer}>
        <div style={styles.shieldBadge}>
          <Shield size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '1.8rem', fontWeight: '900', fontStyle: 'italic' }}>
            <span style={{ color: '#10b981' }}>V</span>
            <span style={{ color: 'white' }}>erity</span>
          </div>
          <div style={styles.adminPortalTag}>SECURE ADMIN PORTAL</div>
        </div>
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
          backgroundColor: isDark ? '#262626' : 'rgba(255,255,255,0.15)',
          border: isDark ? '1px solid #3f3f46' : '1px solid rgba(255,255,255,0.3)',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(8px)',
        }}
        className="btn-anim"
        title="Toggle dark/light mode"
      >
        {isDark ? <Sun size={19} color="#f59e0b" /> : <Moon size={19} color="#818cf8" />}
      </button>

      {/* Admin Login Card */}
      <div
        style={{
          ...styles.card,
          backgroundColor: isDark ? '#262626' : 'white',
          border: isDark ? '1px solid #3f3f46' : '1px solid rgba(255,255,255,0.2)',
          boxShadow: isDark ? '0 20px 50px rgba(0,0,0,0.7)' : '0 20px 50px rgba(0,0,0,0.35)',
        }}
      >
        <div style={styles.cardHeader}>
          <div style={styles.headerIconBox}>
            <KeyRound size={24} color="#007bff" />
          </div>
          <h1 style={{ ...styles.title, color: isDark ? '#f4f4f5' : '#0f172a' }}>System Administration</h1>
          <p style={{ ...styles.subtitle, color: isDark ? '#a1a1aa' : '#64748b' }}>
            Isolated administrative access for Verity system controllers.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin} style={styles.form}>
          <div>
            <label style={{ ...styles.label, color: isDark ? '#d4d4d8' : '#475569' }}>Admin Identifier / Email</label>
            <input
              type="email"
              placeholder="admin@verity.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                ...styles.input,
                backgroundColor: isDark ? '#333338' : '#f8fafc',
                borderColor: isDark ? '#4a4a52' : '#cbd5e1',
                color: isDark ? '#f4f4f5' : '#0f172a',
              }}
            />
          </div>

          <div>
            <label style={{ ...styles.label, color: isDark ? '#d4d4d8' : '#475569' }}>Access Credential</label>
            <input
              type="password"
              placeholder="••••••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                ...styles.input,
                backgroundColor: isDark ? '#333338' : '#f8fafc',
                borderColor: isDark ? '#4a4a52' : '#cbd5e1',
                color: isDark ? '#f4f4f5' : '#0f172a',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Authenticating Admin...' : 'Authenticate & Access Control Center'}
          </button>
        </form>

        <div style={{ ...styles.footerNotice, color: isDark ? '#71717a' : '#94a3b8' }}>
          <Lock size={12} style={{ display: 'inline', marginRight: '4px' }} />
          Protected by IP Whitelisting, Stricter Rate Limiting & Audit Logging.
        </div>
      </div>
    </div>
  );
}

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
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  shieldBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#007bff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.4)',
  },
  adminPortalTag: {
    fontSize: '0.68rem',
    fontWeight: '800',
    color: '#60a5fa',
    letterSpacing: '0.08em',
    marginTop: '-2px',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px 44px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '440px',
    boxSizing: 'border-box',
    transition: 'all 0.25s ease',
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  headerIconBox: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },
  title: {
    margin: '0 0 6px',
    fontSize: '1.4rem',
    fontWeight: '800',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.85rem',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  label: {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: '700',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '14px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 4px 14px rgba(0, 123, 255, 0.35)',
    transition: 'transform 0.15s ease, background-color 0.15s ease',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '18px',
    fontSize: '0.85rem',
    lineHeight: '1.4',
    border: '1px solid #fca5a5',
  },
  footerNotice: {
    textAlign: 'center',
    marginTop: '22px',
    fontSize: '0.74rem',
    fontWeight: '500',
    lineHeight: '1.4',
  }
};
