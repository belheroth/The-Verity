import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

export default function Register({ onBackToLogin }) {
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
         const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
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
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      password: formData.password,
      role: formData.role
    };

try {
         const response = await fetch(`${import.meta.env.VITE_API_URL}/register`, {
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
    <div style={styles.container}>
      
      {/* Top Left Logo */}
      <div style={styles.logoContainer}>
        <span style={styles.logoV}>V</span>
            <span style={styles.logoText}>erity</span>
      </div>

      {/* Main Registration Card */}
      <div style={styles.card}>
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
              onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
              style={{ ...styles.input, flex: 1 }} // flex: 1 forces it to share space equally
            />
            <input 
              type="text" 
              placeholder="Last Name" 
              required 
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
              style={{ ...styles.input, flex: 1 }} // flex: 1 forces it to share space equally
            />
          </div>

          <input 
            type="email" 
            placeholder="Email" 
            required 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})} 
            style={styles.input} 
          />
          
          <input 
            type="password" 
            placeholder="Password" 
            required 
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
            style={styles.input} 
          />

          <input 
            type="password" 
            placeholder="Retype Password" 
            required 
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
            style={styles.input} 
          />

          {/* Role Checkboxes */}
          <div style={styles.checkboxContainer}>
            <label style={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={formData.role === 'Student'} 
                onChange={() => setFormData({...formData, role: 'Student'})} 
                style={styles.checkbox}
              /> Student
            </label>
            <label style={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={formData.role === 'Teacher'} 
                onChange={() => setFormData({...formData, role: 'Teacher'})} 
                style={styles.checkbox}
              /> Teacher
            </label>
          </div>

          {/* Submit Button */}
          <button type="submit" style={styles.button}>Register</button>
          <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
            <span style={{ padding: '0 10px', color: '#9ca3af', fontSize: '0.9rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
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
          <p style={styles.loginText}>
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
    height: '100%', 
    width: '100%', // FIXED: Changed from 100vw to 100%
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    background: 'linear-gradient(to bottom, #f3f4f6 0%, #9ca3af 100%)', 
    fontFamily: 'sans-serif',
    position: 'relative',
    padding: '20px', 
    boxSizing: 'border-box'
  },
  logoContainer: { 
    position: 'absolute',
    top: '30px',
    left: '40px',
    fontSize: '2.5rem', 
    fontWeight: '900', 
    fontStyle: 'italic', 
    textShadow: '2px 2px 4px rgba(0,0,0,0.1)' 
  },
  logoV: { color: '#10b981' },
  logoText: { color: 'white' },
  card: { 
    backgroundColor: 'white', 
    padding: '40px 50px', 
    borderRadius: '24px', 
    width: '100%',           // Make the width flexible
    maxWidth: '450px',       // Prevent it from getting too wide on large screens
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)', 
    boxSizing: 'border-box'
  },
  form: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '15px' 
  },
  flexRow: {
    display: 'flex',
    gap: '10px',
    width: '100%'            // Ensures the row spans the whole form
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
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' 
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