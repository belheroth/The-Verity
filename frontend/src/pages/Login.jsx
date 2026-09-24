import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Moon, Sun, Loader2, Construction, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useDarkMode } from '../hooks/useDarkMode';

export default function Login({ onLogin, onGoToRegister }) {
  const { isDark, toggle } = useDarkMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' });

  // Check maintenance status on mount
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/maintenance-status`);
        if (res.ok) {
          const data = await res.json();
          if (data.enabled) {
            setMaintenance({ enabled: true, message: data.message });
          }
        }
      } catch (_) {}
    };
    checkMaintenance();
    // Re-check every 30 seconds in case admin toggles it off
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenResponse.credential, access_token: tokenResponse.access_token })
      });
      const data = await response.json();
      if (data.maintenance) {
        setMaintenance({ enabled: true, message: data.message });
        return;
      }
      if (response.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.message || 'Google login failed on server');
      }
    } catch (_) {
      setError('Could not connect to server.');
    }
  };

  const handleGoogleError = () => {
    setError('Google Login failed');
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
    flow: 'implicit',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.maintenance) {
        setMaintenance({ enabled: true, message: data.message });
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.message || 'Invalid login credentials');
        setIsLoading(false);
      }
    } catch (_) {
      setError('Could not connect to server. Is server.js running?');
      setIsLoading(false);
    }
  };

  // ═══ MAINTENANCE MODE OVERLAY ═══
  if (maintenance.enabled) {
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
            position: 'absolute', top: '30px', right: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '42px', height: '42px', borderRadius: '50%',
            backgroundColor: isDark ? '#262626' : 'white',
            border: isDark ? '1px solid #3f3f46' : '1px solid #e2e8f0',
            color: isDark ? '#f4f4f5' : '#374151',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
          title="Toggle dark/light mode"
        >
          {isDark ? <Sun size={19} color="#f59e0b" /> : <Moon size={19} color="#6366f1" />}
        </button>

        {/* Maintenance Card */}
        <div
          style={{
            ...styles.card,
            backgroundColor: isDark ? '#262626' : 'white',
            border: isDark ? '1px solid #3f3f46' : 'none',
            boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.15)',
            textAlign: 'center',
            padding: '48px 40px',
          }}
        >
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            backgroundColor: isDark ? '#3f2a0a' : '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Construction size={36} color="#f59e0b" />
          </div>

          <h2 style={{
            margin: '0 0 8px', fontSize: '1.35rem', fontWeight: '800',
            color: isDark ? '#f4f4f5' : '#1e293b',
          }}>
            System Maintenance
          </h2>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            justifyContent: 'center', marginBottom: '16px',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b',
              display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#f59e0b' }}>
              Maintenance in Progress
            </span>
          </div>

          <p style={{
            margin: '0 0 24px', fontSize: '0.92rem', lineHeight: '1.6',
            color: isDark ? '#a1a1aa' : '#64748b',
          }}>
            {maintenance.message}
          </p>

          <div style={{
            padding: '12px 16px', borderRadius: '12px',
            backgroundColor: isDark ? '#1c1c1c' : '#f8fafc',
            border: `1px solid ${isDark ? '#3f3f46' : '#e2e8f0'}`,
            fontSize: '0.8rem', color: isDark ? '#71717a' : '#94a3b8',
          }}>
            <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Student and instructor logins are temporarily disabled.
            Administrators can still access the system via the admin portal.
          </div>

          <style>{`
            @keyframes pulse-dot {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(0.8); }
            }
          `}</style>
        </div>
      </div>
    );
  }

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

      {/* Login Card */}
      <div
        style={{
          ...styles.card,
          backgroundColor: isDark ? '#262626' : 'white',
          border: isDark ? '1px solid #3f3f46' : 'none',
          boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.15)',
        }}
      >
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <button 
            type="submit" 
            style={{
              ...styles.button,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 size={20} className="animate-spin" />
                Authenticating...
              </span>
            ) : 'Login'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }}></div>
            <span style={{ padding: '0 10px', color: isDark ? '#71717a' : '#9ca3af', fontSize: '0.9rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => googleLogin()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: isDark ? '1px solid #3f3f46' : '1px solid #d1d5db',
                backgroundColor: isDark ? '#1e1e2e' : '#ffffff',
                color: isDark ? '#e4e4e7' : '#374151',
                fontSize: '0.95rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s',
                width: '100%',
                justifyContent: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#2a2a3e' : '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = isDark ? '#1e1e2e' : '#ffffff'}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          <p style={{ ...styles.registerText, color: isDark ? '#a1a1aa' : '#9ca3af' }}>
            Don't have an account? <span onClick={onGoToRegister} style={styles.registerLink}>Register</span>
          </p>
        </form>
      </div>
    </div>
  );
}

// STYLES matching the prototype
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
    textShadow: '2px 2px 4px rgba(0,0,0,0.15)',
  },
  logoV: { color: '#10b981' },
  logoText: { color: 'white' },
  card: {
    backgroundColor: 'white',
    padding: '40px 50px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    boxSizing: 'border-box',
    transition: 'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
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
  button: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '15px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
  },
  registerText: { textAlign: 'center', marginTop: '10px', color: '#9ca3af', fontSize: '0.9rem' },
  registerLink: { color: '#10b981', cursor: 'pointer', fontWeight: 'bold' },
  error: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }
};