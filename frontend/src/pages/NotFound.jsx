import React from 'react';

const NotFound = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>404 - Page Not Found</h1>
        <p style={{ color: '#6c757d', marginBottom: '30px', fontSize: '1.1rem' }}>
          The page you are looking for does not exist or has been removed.
        </p>
        <a href="/" style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#0d6efd',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
          fontWeight: '500',
          transition: 'background-color 0.2s'
        }}>
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;