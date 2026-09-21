import { useState, useEffect } from 'react';

const STORAGE_KEY = 'currentUser';

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

let globalUser = getStoredUser();
const listeners = new Set();

export const notifyUserListeners = (updatedUser) => {
  globalUser = updatedUser;
  listeners.forEach((listener) => {
    try {
      listener(globalUser);
    } catch (e) {
      console.error('Error notifying user listener:', e);
    }
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      try {
        globalUser = e.newValue ? JSON.parse(e.newValue) : null;
        notifyUserListeners(globalUser);
      } catch {}
    }
  });

  window.addEventListener('verity:user-updated', (e) => {
    if (e.detail) {
      globalUser = e.detail;
      notifyUserListeners(globalUser);
    }
  });
}

/**
 * Update the stored currentUser and notify all listeners reactively.
 */
export function updateCurrentUser(updates) {
  const current = getStoredUser() || {};
  const updated = { ...current, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save currentUser to localStorage:', err);
  }
  globalUser = updated;
  notifyUserListeners(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('verity:user-updated', { detail: updated }));
  }

  // Also sync to backend API so all classrooms & People tabs see real account updates
  try {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: updated.name,
          email: updated.email,
          avatar: updated.avatar
        })
      }).catch(() => {});
    }
  } catch {}

  return updated;
}

/**
 * Reactive hook for accessing and modifying the signed-in user's profile.
 */
export function useCurrentUser() {
  const [user, setUser] = useState(globalUser);

  useEffect(() => {
    const handleChange = (newUser) => {
      setUser(newUser);
    };
    listeners.add(handleChange);
    setUser(globalUser);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  return { currentUser: user, updateCurrentUser };
}
