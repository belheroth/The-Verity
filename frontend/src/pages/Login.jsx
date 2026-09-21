import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Moon, Sun } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useDarkMode } from '../hooks/useDarkMode';

export default function Login({ onLogin, onGoToRegister }) {
  const { isDark, toggle } = useDarkMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });
      const data = await response.json();
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.message || 'Invalid login credentials');
      }
    } catch (_) {
      setError('Could not connect to server. Is server.js running?');
    }
  };

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

          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              ...styles.input,
              backgroundColor: isDark ? '#333338' : '#f9fafb',
              borderColor: isDark ? '#4a4a52' : '#e5e7eb',
              color: isDark ? '#f4f4f5' : '#4b5563',
            }}
          />

          <button type="submit" style={styles.button}>Login</button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }}></div>
            <span style={{ padding: '0 10px', color: isDark ? '#71717a' : '#9ca3af', fontSize: '0.9rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
            />
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