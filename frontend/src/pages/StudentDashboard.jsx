import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
// IMPORTING PROFESSIONAL SVGS
import { Home, Calendar, ClipboardList, Settings, MoreVertical, Plus, LogOut, User, X, Menu, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SettingsPanel from './SettingsPanel';
import ProfileMenu from './ProfileMenu';
import StudentCalendar from './StudentCalendar';
import ClassroomSettings from './ClassroomSettings';
import { apiFetch } from '../utils/api';
import Skeleton from '../components/Skeleton';
import ClassroomCard from '../components/ClassroomCard';
import { useDarkMode } from '../hooks/useDarkMode';
import { getThemeStorageKeys } from '../utils/classroomUtils';

// We now generate the storage key dynamically based on the current user
const getStorageKey = (user) => {
  const identifier = user?.email || user?.id || user?.name || 'default';
  return `verity_student_classrooms_${identifier}`;
};

const DEFAULT_CLASSROOMS = [
  { id: 1, code: "CS101", name: "C# Programming", instructor: "kim fabie", instructorEmail: "kimfabie@gmail.com" },
  { id: 2, code: "IT202", name: "Data Structures", instructor: "kim fabie", instructorEmail: "kimfabie@gmail.com" }
];

export default function StudentDashboard({ currentUser, onLogout, onEnterClassroom, socket }) {
  const { isDark } = useDarkMode();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('verity_sidebar_collapsed') === 'true');
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('verity_sidebar_collapsed', next);
  };

  const navRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState(() => {
    try {
      const savedTop = sessionStorage.getItem('verity_nav_indicator_top');
      const savedHeight = sessionStorage.getItem('verity_nav_indicator_height');
      if (savedTop !== null && !isNaN(Number(savedTop))) {
        return {
          top: Number(savedTop),
          height: savedHeight ? Number(savedHeight) : 42,
          opacity: 1,
          transition: true
        };
      }
    } catch { /* ignore */ }
    return { top: 0, height: 42, opacity: 0, transition: false };
  });

  const navItems = [
    { id: 'classrooms', Icon: Home, label: 'Home' },
    { id: 'calendar', Icon: Calendar, label: 'Calendar' },
    { id: 'archived', Icon: Archive, label: 'Archived' },
  ];

  const getViewTitle = (view) => {
    switch (view) {
      case 'classrooms':
        return 'My Classrooms';
      case 'calendar':
        return 'Calendar';
      case 'archived':
        return 'Archived Classrooms';
      case 'settings':
        return 'Settings';
      case 'classroomSettings':
        return 'Classroom Settings';
      default:
        return 'Classrooms';
    }
  };

  const [activeMenu, setActiveMenu] = useState(null);
  const [settingsClassroom, setSettingsClassroom] = useState(null);
  const [activeView, setActiveView] = useState(() => localStorage.getItem('verity_student_view') || 'classrooms');
  const handleSetView = (view) => {
    setActiveView(view);
    localStorage.setItem('verity_student_view', view);
  };

  useLayoutEffect(() => {
    const update = () => {
      const activeRef = navRefs.current[activeView];
      if (activeRef) {
        try {
          sessionStorage.setItem('verity_nav_indicator_top', String(activeRef.offsetTop));
          sessionStorage.setItem('verity_nav_indicator_height', String(activeRef.offsetHeight));
        } catch { /* ignore */ }

        setIndicatorStyle(prev => {
          const distance = Math.abs(activeRef.offsetTop - prev.top);
          const bounceOvershoot = distance > 0 ? Math.min(0.42, Math.max(0.03, 16 / distance)) : 0;
          const bounceRatio = (1 + bounceOvershoot).toFixed(3);
          const duration = distance > 150 ? '0.46s' : '0.38s';
          const transitionStr = `top ${duration} cubic-bezier(0.34, ${bounceRatio}, 0.64, 1), height 0.25s ease, opacity 0.2s ease`;

          if (prev.top === activeRef.offsetTop && prev.height === activeRef.offsetHeight && prev.opacity === 1 && prev.transition === transitionStr) return prev;
          return { top: activeRef.offsetTop, height: activeRef.offsetHeight, opacity: 1, transition: transitionStr };
        });
      } else {
        setIndicatorStyle(prev => prev.opacity === 0 ? prev : { ...prev, opacity: 0 });
      }
    };

    update();
    const timer = setTimeout(update, 20);
    return () => clearTimeout(timer);
  }, [activeView, collapsed]);

  // Load the student's joined classrooms (persists across refresh/logout).
  const [classrooms, setClassrooms] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(currentUser));
      // Start fresh for new accounts (don't force DEFAULT_CLASSROOMS unless it's a completely fresh browser)
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Show skeleton only when there are no cached classrooms yet (first-time user).
  const [loadingClassrooms, setLoadingClassrooms] = useState(
    () => !localStorage.getItem(getStorageKey(currentUser))
  );

  // Once mounted, briefly check the server — then reveal whatever we have.
  useEffect(() => {
    if (!loadingClassrooms) return;
    const timer = setTimeout(() => setLoadingClassrooms(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(classrooms));

    // Sync student enrollment to server & local storage for each joined classroom
    if (currentUser?.email && classrooms.length > 0) {
      classrooms.forEach(c => {
        apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classrooms/${c.id}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: currentUser.name,
            studentEmail: currentUser.email
          })
        }).catch(() => {});

        try {
          const localEnrollKey = `verity_classroom_enrollments_${c.id}`;
          const existing = JSON.parse(localStorage.getItem(localEnrollKey) || '[]');
          if (!existing.some(s => s.email === currentUser.email || s.name === currentUser.name)) {
            existing.push({ name: currentUser.name, email: currentUser.email });
            localStorage.setItem(localEnrollKey, JSON.stringify(existing));
          }
        } catch {}
      });
    }
  }, [classrooms, currentUser]);

  // Refresh joined classrooms with latest server instructor info and theme
  useEffect(() => {
    const refreshInstructors = async () => {
      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classrooms`);
        if (res.ok) {
          const data = await res.json();
          const serverList = Array.isArray(data) ? data : (data.classrooms || []);
          if (serverList.length > 0) {
            setClassrooms(prev => prev.map(c => {
              const matched = serverList.find(s => s.id === c.id || (s.section && s.section === c.code));
              if (matched) {
                if (matched.theme) {
                  const keys = getThemeStorageKeys(matched);
                  keys.forEach(k => {
                    try { localStorage.setItem(k, JSON.stringify(matched.theme)); } catch {}
                  });
                }
                return {
                  ...c,
                  ...matched,
                  instructor: matched.instructor || c.instructor,
                  instructorEmail: matched.instructorEmail || matched.instructor_email || c.instructorEmail || '',
                  theme: matched.theme !== undefined ? matched.theme : c.theme
                };
              }
              return c;
            }));
          }
        }
      } catch {}
    };
    refreshInstructors();
  }, []);

  // Real-time banner updates listener (socket + window event)
  useEffect(() => {
    const handleBannerUpdate = (e) => {
      const detail = e.detail;
      if (!detail || !detail.theme) return;

      setClassrooms(prev => prev.map(c => {
        const matches =
          (c.id != null && String(detail.classroomId) === String(c.id)) ||
          (c.code && detail.code && String(detail.code).toLowerCase() === String(c.code).toLowerCase()) ||
          (c.section && detail.code && String(detail.code).toLowerCase() === String(c.section).toLowerCase()) ||
          (c.name && detail.name && String(detail.name).toLowerCase() === String(c.name).toLowerCase()) ||
          (detail.keys && detail.keys.includes(`verity_classroom_theme_${c.id}`));

        if (matches) {
          return { ...c, theme: detail.theme };
        }
        return c;
      }));
    };

    window.addEventListener('verity:banner-updated', handleBannerUpdate);
    if (socket) {
      socket.on('classroom_theme_changed', (data) => handleBannerUpdate({ detail: data }));
    }
    return () => {
      window.removeEventListener('verity:banner-updated', handleBannerUpdate);
      if (socket) {
        socket.off('classroom_theme_changed');
      }
    };
  }, [socket]);



  // "Input Class Code" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  const handleJoin = async (e) => {
    if (e) e.preventDefault();
    setJoinError('');
    const code = classCode.trim();
    if (!code) {
      setJoinError('Please enter a class code.');
      return;
    }

    // Already joined?
    const alreadyJoined = classrooms.some(c =>
      (c.code && c.code.toLowerCase() === code.toLowerCase()) ||
      (c.section && c.section.toLowerCase() === code.toLowerCase()) ||
      (c.name && c.name.toLowerCase() === code.toLowerCase()) ||
      String(c.id).toLowerCase() === code.toLowerCase()
    );

    if (alreadyJoined) {
      setJoinError('You have already joined this class.');
      return;
    }

    setIsJoining(true);

    // Look up the code against all potential sources:
    // 1. Server classrooms
    let serverClasses = [];
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classrooms`);
      if (res.ok) {
        const data = await res.json();
        serverClasses = Array.isArray(data) ? data : (data.classrooms || []);
      }
    } catch { /* offline fallback */ }

    // 2. Local teacher classrooms
    let teacherClasses = [];
    try {
      const raw = localStorage.getItem('verity_teacher_classrooms') || localStorage.getItem('verity_classrooms');
      if (raw) teacherClasses = JSON.parse(raw);
    } catch { }

    // 3. Local global/admin classrooms
    let globalClasses = [];
    try {
      const raw = localStorage.getItem('verity_global_classrooms');
      if (raw) globalClasses = JSON.parse(raw);
    } catch { }

    // 4. Default teacher fallback classes
    const fallbackClasses = [
      { id: 1, section: "CS101", code: "CS101", name: "C# Programming", subject: "Computer Science" },
      { id: 2, section: "IT202", code: "IT202", name: "Data Structures", subject: "Information Tech" }
    ];

    const allCandidates = [
      ...serverClasses,
      ...teacherClasses,
      ...globalClasses,
      ...fallbackClasses
    ];

    const match = allCandidates.find(c =>
      (c.section && c.section.trim().toLowerCase() === code.toLowerCase()) ||
      (c.code && c.code.trim().toLowerCase() === code.toLowerCase()) ||
      (c.name && c.name.trim().toLowerCase() === code.toLowerCase()) ||
      (String(c.id).toLowerCase() === code.toLowerCase())
    );

    if (!match) {
      setIsJoining(false);
      setJoinError('No class found with that code. Please check the code and try again.');
      return;
    }

    const joined = {
      id: match.id || Date.now(),
      code: match.section || match.code || code.toUpperCase(),
      name: match.name || code,
      instructor: match.instructor || 'Instructor',
      instructorEmail: match.instructorEmail || match.instructor_email || '',
      theme: match.theme || null
    };

    if (match.theme) {
      const keys = getThemeStorageKeys(joined);
      keys.forEach(k => {
        try { localStorage.setItem(k, JSON.stringify(match.theme)); } catch {}
      });
    }

    // Enroll on server
    try {
      apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classrooms/${joined.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: currentUser?.name,
          studentEmail: currentUser?.email
        })
      }).catch(() => {});
    } catch {}

    // Persist in local enrollment key for instant sync
    try {
      const localEnrollKey = `verity_classroom_enrollments_${joined.id}`;
      const existing = JSON.parse(localStorage.getItem(localEnrollKey) || '[]');
      if (!existing.some(s => s.email === currentUser?.email || s.name === currentUser?.name)) {
        existing.push({ name: currentUser?.name, email: currentUser?.email });
        localStorage.setItem(localEnrollKey, JSON.stringify(existing));
      }
    } catch {}

    const updated = [joined, ...classrooms.filter(c => c.id !== joined.id)];
    setClassrooms(updated);
    try {
      localStorage.setItem(getStorageKey(currentUser), JSON.stringify(updated));
    } catch { }

    setIsJoining(false);
    setIsModalOpen(false);
    setClassCode('');
  };

  const handleArchiveClass = (e, id) => {
    e.stopPropagation();
    setClassrooms(classrooms.map(c => c.id === id ? { ...c, archived: true } : c));
    setActiveMenu(null);
  };

  const handleUnarchiveClass = (e, id) => {
    e.stopPropagation();
    setClassrooms(classrooms.map(c => c.id === id ? { ...c, archived: false } : c));
    setActiveMenu(null);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    setClassrooms(classrooms.filter(c => c.id !== id));
    setActiveMenu(null);
  };
  const handleDeleteClass = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this classroom?")) {
      setClassrooms(classrooms.filter(c => c.id !== id));
    }
    setActiveMenu(null);
  };
  // STYLES
  const styles = {
    container: {
      height: '100vh',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isDark ? '#3C3C3C' : '#EEF0F3',
      fontFamily: 'Arial, Helvetica, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background-color 0.25s ease'
    },
    header: {
      height: '72px',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      backgroundColor: isDark ? '#3C3C3C' : '#EEF0F3',
      borderBottom: 'none',
      zIndex: 50,
      transition: 'background-color 0.25s ease'
    },
    badge: { 
      fontSize: '0.7rem', 
      backgroundColor: isDark ? '#4A4A4A' : '#EEF0F3', 
      color: isDark ? '#E8EAED' : '#475569', 
      padding: '3px 8px', 
      borderRadius: '10px', 
      marginLeft: '6px', 
      fontStyle: 'normal', 
      transform: 'translateY(-5px)', 
      border: isDark ? '1px solid #5A5A5A' : '1px solid #cbd5e1' 
    },
    sidebar: (collapsed) => ({
      width: collapsed ? '84px' : '240px',
      minWidth: collapsed ? '84px' : '240px',
      padding: '20px 14px 20px',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      background: 'transparent',
      overflowY: 'auto'
    }),
    sidebarBtn: (collapsed) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '16px',
      padding: '10px 18px',
      width: '100%',
      height: '42px',
      borderRadius: '14px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      position: 'relative',
      zIndex: 1
    }),
    logoContainer: { fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' },
    logoV: { color: '#10b981' },
    logoText: { color: 'white' },
    navGroup: { display: 'flex', flexDirection: 'column', gap: '15px' },
    navItem: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '12px 20px', color: '#6b7280', fontWeight: '600', cursor: 'pointer', transition: 'color 0.15s', borderRadius: '10px', background: 'transparent', boxShadow: 'none', whiteSpace: 'nowrap' },
    activeNavItem: { color: '#10b981', fontWeight: '700', backgroundColor: 'transparent', boxShadow: 'none' },
    settingsIcon: { color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' },
    mainContent: { flex: 1, padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
    whiteCard: {
      backgroundColor: isDark ? '#323232' : 'white',
      flex: 1,
      borderRadius: '24px',
      padding: 'clamp(20px, 4vw, 40px)',
      boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.25)' : '0 10px 25px rgba(0,0,0,0.05)',
      overflowY: 'auto',
      border: isDark ? '1px solid #4A4A4A' : 'none',
      color: isDark ? '#E8EAED' : 'inherit',
      transition: 'background-color 0.25s ease, border-color 0.25s ease'
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 20px',
      backgroundColor: isDark ? '#3A3A3A' : '#d1d5db',
      border: isDark ? '1px solid #505050' : 'none',
      borderRadius: '50px',
      color: isDark ? '#E8EAED' : '#4b5563',
      fontWeight: 'bold',
      cursor: 'pointer',
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '2px 2px 5px rgba(0,0,0,0.1)'
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' },
    cardContainer: { display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' },
    cardPill: { backgroundColor: '#d1d5db', height: '30px', borderRadius: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '0.85rem', fontWeight: 'bold' },
    cardBody: { backgroundColor: '#d1d5db', height: '180px', borderRadius: '20px', padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', transition: 'transform 0.2s' },
    dots: { position: 'absolute', bottom: '15px', right: '15px', width: '30px', height: '30px', backgroundColor: '#e5e7eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', cursor: 'pointer' },
    dropdownMenu: { position: 'absolute', bottom: '50px', right: '10px', backgroundColor: '#9ca3af', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 10 },
    dropdownItem: { padding: '5px 15px', color: 'black', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' },

    // Modal
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalCard: {
      backgroundColor: isDark ? '#323232' : 'white',
      padding: '36px',
      borderRadius: '24px',
      width: '100%',
      maxWidth: '460px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
      position: 'relative',
      border: isDark ? '1px solid #4A4A4A' : 'none',
      color: isDark ? '#E8EAED' : 'inherit'
    },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' },
    closeModalBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: isDark ? '#a3a3a3' : '#94a3af', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '8px' },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },
    input: {
      width: '100%',
      padding: '14px 18px',
      borderRadius: '12px',
      border: isDark ? '1.5px solid #4A4A4A' : '1.5px solid #cbd5e1',
      backgroundColor: isDark ? '#282828' : 'white',
      color: isDark ? '#E8EAED' : '#0f172a',
      fontSize: '1rem',
      boxSizing: 'border-box'
    },
    joinButton: { padding: '11px 32px', backgroundColor: '#10b981', border: 'none', borderRadius: '50px', color: 'white', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' },
    errorText: { color: '#ef4444', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 15px', borderRadius: '10px', margin: 0, fontSize: '0.875rem', textAlign: 'center' }
  };

  return (
    <div style={styles.container}>

      {/* ═══ GLOBAL TOP HEADER (Admin Pattern) ═══ */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={toggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#ffffff' : '#64748b',
              flexShrink: 0,
              marginRight: '16px'
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="icon-btn-anim"
          >
            <Menu size={24} color={isDark ? '#ffffff' : '#64748b'} />
          </button>

          <div
            style={{ display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', cursor: 'pointer' }}
            onClick={() => handleSetView('classrooms')}
          >
            <span style={{ color: '#10b981' }}>V</span>
            <span style={{ color: isDark ? '#E8EAED' : '#1e293b' }}>erity</span>
            <span style={styles.badge}>Student</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ProfileMenu onLogout={onLogout} />
        </div>
      </header>

      {/* ═══ MAIN LAYOUT WITH SIDEBAR ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ═══ SIDEBAR NAVIGATION ═══ */}
        <aside style={styles.sidebar(collapsed)}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, position: 'relative' }}>
            {/* Liquid sliding indicator */}
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: indicatorStyle.top,
              height: indicatorStyle.height,
              background: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '14px',
              boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' : '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.35)',
              transition: indicatorStyle.transition || 'none',
              opacity: indicatorStyle.opacity,
              pointerEvents: 'none',
              zIndex: 0,
            }} />

            {navItems.map(({ id, Icon, label }) => {
              const active = activeView === id;
              return (
                <button
                  key={id}
                  ref={el => navRefs.current[id] = el}
                  onClick={() => handleSetView(id)}
                  style={styles.sidebarBtn(collapsed)}
                  title={collapsed ? label : ''}
                >
                  <Icon size={20} color={active ? '#10b981' : (isDark ? '#E8EAED' : '#475569')} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{ fontSize: '0.85rem', fontWeight: active ? '700' : '600', color: active ? '#10b981' : (isDark ? '#E8EAED' : '#334155'), overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Enrolled Section */}
            {classrooms.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!collapsed && (
                  <div style={{
                    padding: '0 18px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: isDark ? '#10b981' : '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '4px'
                  }}>
                    Enrolled
                  </div>
                )}
                {classrooms.filter(c => !c.archived).map((cls) => {
                  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                  const color = colors[cls.id % colors.length];

                  return (
                    <button
                      key={cls.id}
                      onClick={() => onEnterClassroom(cls)}
                      style={styles.sidebarBtn(collapsed)}
                      title={cls.name}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        backgroundColor: color,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        {cls.name.charAt(0).toUpperCase()}
                      </div>
                      {!collapsed && (
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: isDark ? '#E8EAED' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cls.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Settings at Bottom */}
            <div style={{ marginTop: 'auto' }}>
              <button
                ref={el => navRefs.current['settings'] = el}
                onClick={() => handleSetView('settings')}
                style={styles.sidebarBtn(collapsed)}
                title={collapsed ? 'Settings' : ''}
              >
                <Settings size={20} color={activeView === 'settings' ? '#10b981' : (isDark ? '#a3a3a3' : '#475569')} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ fontSize: '0.85rem', fontWeight: activeView === 'settings' ? '700' : '600', color: activeView === 'settings' ? '#10b981' : (isDark ? '#E8EAED' : '#334155'), overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Settings
                  </span>
                )}
              </button>
            </div>
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div style={styles.mainContent}>
          {/* The Main White Card */}
        <div style={styles.whiteCard}>


          {activeView === 'settings' && <SettingsPanel role="Student" />}

          {activeView === 'calendar' && (
            <StudentCalendar classrooms={classrooms} />
          )}

          {activeView === 'classroomSettings' && settingsClassroom && (
            <ClassroomSettings
              role="student"
              classroom={settingsClassroom}
              onClose={() => { setSettingsClassroom(null); handleSetView('classrooms'); }}
            />
          )}

          {activeView === 'archived' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {classrooms.filter(c => c.archived).length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <h3 style={{ margin: 0 }}>No Archived Classrooms</h3>
                  <p style={{ marginTop: '10px' }}>Classrooms you archive will appear here.</p>
                </div>
              ) : (
                <div style={styles.grid}>
                  {classrooms.filter(c => c.archived).map(cls => (
                    <ClassroomCard
                      key={cls.id}
                      classroom={cls}
                      onEnter={onEnterClassroom}
                      onUnarchive={handleUnarchiveClass}
                      onDelete={handleDeleteClass}
                      isArchived={true}
                      role="Student"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'classrooms' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setJoinError(''); setClassCode(''); setIsModalOpen(true); }}
                  style={styles.addButton}
                >
                  <Plus size={18} style={{ marginRight: '5px' }} /> Add
                </motion.button>
              </div>

              {/* Classroom Grid */}
              <div style={styles.grid}>
                {loadingClassrooms
                  ? Array.from({ length: 4 }).map((_, i) => <Skeleton.Card key={i} />)
                  : classrooms.filter(c => !c.archived).map(cls => (
                    <ClassroomCard
                      key={cls.id}
                      classroom={cls}
                      onEnter={onEnterClassroom}
                      onArchive={handleArchiveClass}
                      onSettings={(c) => {
                        setSettingsClassroom(c);
                        handleSetView('classroomSettings');
                      }}
                      onDelete={handleDeleteClass}
                      role="Student"
                    />
                  ))
                }
              </div>
            </>
          )}
        </div>
      </div>
    </div>

      {/* INPUT CLASS CODE MODAL */}
      {isModalOpen && (
        <div
          style={styles.modalOverlay}
          onClick={() => { setIsModalOpen(false); setJoinError(''); setClassCode(''); }}
        >
          <div
            style={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, color: isDark ? '#f5f5f5' : '#0f172a', fontSize: '1.35rem', fontWeight: '700' }}>
                Join a Class
              </h2>
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setJoinError(''); setClassCode(''); }}
                style={styles.closeModalBtn}
                title="Close"
              >
                <X size={22} color={isDark ? '#a3a3a3' : '#94a3af'} />
              </button>
            </div>

            <form onSubmit={handleJoin} style={styles.form}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: isDark ? '#d4d4d4' : '#475569' }}>
                  Class Code
                </label>
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  placeholder="e.g. CS101 or NICE"
                  value={classCode}
                  onChange={(e) => {
                    setClassCode(e.target.value);
                    if (joinError) setJoinError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: inputFocused ? '2px solid #10b981' : (isDark ? '1.5px solid #4D4D4D' : '1.5px solid #cbd5e1'),
                    outline: 'none',
                    backgroundColor: isDark ? '#3A3A3A' : 'white',
                    color: isDark ? '#f5f5f5' : '#0f172a',
                    fontSize: '1rem',
                    fontWeight: '500',
                    boxSizing: 'border-box',
                    boxShadow: inputFocused ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : (isDark ? 'none' : 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'),
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                />
                <span style={{ fontSize: '0.78rem', color: isDark ? '#737373' : '#94a3b8' }}>
                  Ask your teacher for the class code or section name.
                </span>
              </div>

              {joinError && <p style={styles.errorText}>{joinError}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setJoinError(''); setClassCode(''); }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '50px',
                    border: isDark ? '1px solid #444444' : '1px solid #cbd5e1',
                    backgroundColor: isDark ? '#262626' : 'transparent',
                    color: isDark ? '#d4d4d4' : '#64748b',
                    fontWeight: '600',
                    fontSize: '0.92rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isJoining}
                  style={{
                    ...styles.joinButton,
                    opacity: isJoining ? 0.7 : 1,
                    cursor: isJoining ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isJoining ? 'Joining...' : 'Join Class'}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

