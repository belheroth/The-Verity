import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Moon, Sun } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useDarkMode } from '../hooks/useDarkMode';

export default function Register({ onBackToLogin }) {
  const { isDark, toggle } = useDarkMode();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Student'
  });
  const [message, setMessage] = useState(null); // { type: 'error' | 'success', text }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential, role: formData.role })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Google Registration successful! Redirecting...' });
        setTimeout(() => onBackToLogin(), 1200);
      } else {
        setMessage({ type: 'error', text: data.message || 'Google registration failed on server' });
      }
    } catch (_) {
      setMessage({ type: 'error', text: 'Could not connect to server.' });
    }
  };

  const handleGoogleError = () => {
    setMessage({ type: 'error', text: 'Google Registration failed' });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match. Please try again.' });
      return;
    }

    const userToSave = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      password: formData.password,
      role: formData.role
    };

    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userToSave)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Account created successfully! Redirecting...' });
        setTimeout(() => onBackToLogin(), 1200);
      } else {
        setMessage({ type: 'error', text: data.message || 'Registration failed' });
      }
    } catch (_) {
      setMessage({ type: 'error', text: 'Could not connect to server. Make sure server.js is running.' });
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

      {/* Main Registration Card */}
      <div
        style={{
          ...styles.card,
          backgroundColor: isDark ? '#262626' : 'white',
          border: isDark ? '1px solid #3f3f46' : 'none',
          boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.15)',
        }}
      >
        {message && (
          <div style={message.type === 'success' ? styles.success : styles.error}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleRegister} style={styles.form}>

          {/* Name Fields (Flexible Row) */}
          <div style={styles.flexRow}>
            <input
              type="text"
              placeholder="First Name"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              style={{
                ...styles.input,
                flex: 1,
                backgroundColor: isDark ? '#333338' : '#f9fafb',
                borderColor: isDark ? '#4a4a52' : '#e5e7eb',
                color: isDark ? '#f4f4f5' : '#4b5563',
              }}
            />
            <input
              type="text"
              placeholder="Last Name"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              style={{
                ...styles.input,
                flex: 1,
                backgroundColor: isDark ? '#333338' : '#f9fafb',
                borderColor: isDark ? '#4a4a52' : '#e5e7eb',
                color: isDark ? '#f4f4f5' : '#4b5563',
              }}
            />
          </div>

          <input
            type="email"
            placeholder="Email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            style={{
              ...styles.input,
              backgroundColor: isDark ? '#333338' : '#f9fafb',
              borderColor: isDark ? '#4a4a52' : '#e5e7eb',
              color: isDark ? '#f4f4f5' : '#4b5563',
            }}
          />

          <input
            type="password"
            placeholder="Retype Password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            style={{
              ...styles.input,
              backgroundColor: isDark ? '#333338' : '#f9fafb',
              borderColor: isDark ? '#4a4a52' : '#e5e7eb',
              color: isDark ? '#f4f4f5' : '#4b5563',
            }}
          />

          {/* Role Checkboxes */}
          <div style={styles.checkboxContainer}>
            <label style={{ ...styles.checkboxLabel, color: isDark ? '#d4d4d8' : '#6b7280' }}>
              <input
                type="checkbox"
                checked={formData.role === 'Student'}
                onChange={() => setFormData({ ...formData, role: 'Student' })}
                style={styles.checkbox}
              /> Student
            </label>
            <label style={{ ...styles.checkboxLabel, color: isDark ? '#d4d4d8' : '#6b7280' }}>
              <input
                type="checkbox"
                checked={formData.role === 'Teacher'}
                onChange={() => setFormData({ ...formData, role: 'Teacher' })}
                style={styles.checkbox}
              /> Teacher
            </label>
          </div>

          {/* Submit Button */}
          <button type="submit" style={styles.button}>Register</button>
          <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }}></div>
            <span style={{ padding: '0 10px', color: isDark ? '#71717a' : '#9ca3af', fontSize: '0.9rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signup_with"
              useOneTap
            />
          </div>

          {/* Back to login link */}
          <p style={{ ...styles.loginText, color: isDark ? '#a1a1aa' : '#9ca3af' }}>
            Already have an account? <span onClick={onBackToLogin} style={styles.loginLink}>Login</span>
          </p>
        </form>
      </div>
    </div>
  );
}

// STYLES 
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
    textShadow: '2px 2px 4px rgba(0,0,0,0.15)'
  },
  logoV: { color: '#10b981' },
  logoText: { color: 'white' },
  card: {
    backgroundColor: 'white',
    padding: '40px 50px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    boxSizing: 'border-box',
    transition: 'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  flexRow: {
    display: 'flex',
    gap: '10px',
    width: '100%'
  },
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
  checkboxContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    margin: '10px 0'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '1rem'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
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
    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
  },
  loginText: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#9ca3af',
    fontSize: '0.9rem'
  },
  loginLink: {
    color: '#10b981',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  error: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.9rem', textAlign: 'center' },
  success: { backgroundColor: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.9rem', textAlign: 'center' }
};