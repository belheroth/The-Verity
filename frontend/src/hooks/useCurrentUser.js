import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

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
    const fresh = e.detail !== undefined ? e.detail : getStoredUser();
    globalUser = fresh;
    notifyUserListeners(globalUser);
  });
}

/**
 * Update the stored currentUser and notify all listeners reactively.
 * Also permanently persists changes to the database so avatars and profiles are visible to everyone.
 */
export async function updateCurrentUser(updates) {
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

  // Persist to backend database via PUT /users/profile using real auth token
  try {
    const token = localStorage.getItem('verity_token') || localStorage.getItem('token');
    if (token) {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: updated.name,
          email: updated.email,
          avatar: updated.avatar !== undefined ? updated.avatar : (updated.profilePicture || null)
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const synced = { ...updated, ...data.user };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
          globalUser = synced;
          notifyUserListeners(synced);
          return synced;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to sync profile to backend:', err);
  }

  return updated;
}

/**
 * Reactive hook for accessing and modifying the signed-in user's profile.
 */
export function useCurrentUser() {
  const [user, setUser] = useState(() => getStoredUser() || globalUser);

  useEffect(() => {
    const fresh = getStoredUser();
    if (JSON.stringify(fresh) !== JSON.stringify(user)) {
      globalUser = fresh;
      setUser(fresh);
    }

    const handleChange = (newUser) => {
      setUser(newUser);
    };
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  return { currentUser: user, updateCurrentUser };
}
