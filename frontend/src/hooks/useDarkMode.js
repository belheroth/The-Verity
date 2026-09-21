import { useState, useEffect } from 'react';

const STORAGE_KEY = 'verity_dark_mode';

const getInitialDark = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

let globalIsDark = getInitialDark();
const listeners = new Set();

const applyDomClass = (dark) => {
  if (typeof document !== 'undefined' && document.documentElement) {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};

// Initial DOM sync on module load
applyDomClass(globalIsDark);

const notifyListeners = () => {
  applyDomClass(globalIsDark);
  listeners.forEach((listener) => {
    try {
      listener(globalIsDark);
    } catch (e) {
      console.error('Error notifying dark mode listener:', e);
    }
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      globalIsDark = e.newValue === 'true';
      notifyListeners();
    }
  });
}

/**
 * Shared, reactive dark-mode hook.
 * Synchronizes across all components in the React tree in real-time without page reload.
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(globalIsDark);

  useEffect(() => {
    const handleChange = (newVal) => {
      setIsDark(newVal);
    };

    listeners.add(handleChange);
    // Ensure instance is always in sync with global state
    setIsDark(globalIsDark);

    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const toggle = () => {
    globalIsDark = !globalIsDark;
    try {
      localStorage.setItem(STORAGE_KEY, String(globalIsDark));
    } catch { /* storage unavailable */ }
    notifyListeners();
  };

  const setDark = (val) => {
    globalIsDark = !!val;
    try {
      localStorage.setItem(STORAGE_KEY, String(globalIsDark));
    } catch { /* storage unavailable */ }
    notifyListeners();
  };

  return { isDark, toggle, setDark };
}
