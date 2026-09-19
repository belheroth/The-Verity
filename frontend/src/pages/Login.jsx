import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { apiFetch } from '../utils/api';

export default function Login({ onLogin, onGoToRegister }) {
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
    <div style={styles.container}>
      <div style={styles.logoContainer}>
        <span style={styles.logoV}>V</span>
        <span style={styles.logoText}>erity</span>
      </div>

      <div style={styles.card}>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.button}>Login</button>
          <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
            <span style={{ padding: '0 10px', color: '#9ca3af', fontSize: '0.9rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
            />
          </div>

          <p style={styles.registerText}>
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
    minHeight: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
    background: 'linear-gradient(to bottom, #f3f4f6 0%, #9ca3af 100%)', fontFamily: 'Arial, Helvetica, sans-serif', position: 'relative', padding: '20px', boxSizing: 'border-box'
  },
  logoContainer: {
    position: 'absolute', top: '30px', left: '40px', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
  },
  logoV: { color: '#10b981' },
  logoText: { color: 'white' },
  card: {
    backgroundColor: 'white', padding: '40px 50px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', boxSizing: 'border-box'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  input: {
    width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#4b5563', fontSize: '1rem', boxSizing: 'border-box', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
  },
  button: {
    width: '100%', padding: '15px', backgroundColor: '#10b981', border: 'none', borderRadius: '15px', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
  },
  registerText: { textAlign: 'center', marginTop: '10px', color: '#9ca3af', fontSize: '0.9rem' },
  registerLink: { color: '#10b981', cursor: 'pointer', fontWeight: 'bold' },
  error: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }
};