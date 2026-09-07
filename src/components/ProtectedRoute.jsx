import { useEffect } from 'react';

export default function ProtectedRoute({ children, currentUser, setCurrentScreen }) {
  useEffect(() => {
    if (!currentUser) {
      setCurrentScreen('login');
    }
  }, [currentUser, setCurrentScreen]);

  if (!currentUser) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'inherit' }}>
      {children}
    </div>
  );
}