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
    <div style={{ height: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'inherit' }}>
      {children}
    </div>
  );
}