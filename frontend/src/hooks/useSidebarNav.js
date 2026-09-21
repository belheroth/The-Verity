import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useSidebarNav — provides smooth hover-to-expand and auto-contract behavior
 * for the application's collapsible navigation sidebar.
 * 
 * Behavior:
 * - Contracted by default (compact rail, 80px).
 * - When hovered (mouseEnter), temporarily expands to 280px without clicking.
 * - When mouse leaves (mouseLeave), automatically contracts back to 80px.
 * - Clicking the menu hamburger button toggles "pinned" mode.
 */
export function useSidebarNav() {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    try {
      return localStorage.getItem('verity_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 120);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsPinned(prev => {
      const next = !prev;
      try {
        localStorage.setItem('verity_sidebar_pinned', String(next));
        localStorage.setItem('verity_sidebar_collapsed', String(!next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const sync = (e) => {
      if (e.key === 'verity_sidebar_pinned') {
        setIsPinned(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('storage', sync);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const isExpanded = isPinned || isHovered;
  const collapsed = !isExpanded;

  return {
    collapsed,
    isExpanded,
    isPinned,
    isHovered,
    toggleSidebar,
    sidebarProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    }
  };
}
