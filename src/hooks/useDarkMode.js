import { useState, useEffect } from 'react';

/**
 * Shared dark-mode hook.
 * Reads/writes `verity_dark_mode` in localStorage and toggles the
 * `dark` class on <html> so any CSS `.dark` rule fires instantly.
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('verity_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Keep the <html> class in sync whenever the state changes.
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('verity_dark_mode', String(next));
      } catch { /* storage unavailable */ }
      return next;
    });
  };

  return { isDark, toggle };
}
