import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Home, Calendar, ClipboardList, Settings, MoreVertical, Plus, LogOut, User, X, Menu, Archive, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SettingsPanel from './SettingsPanel';
import ProfileMenu from './ProfileMenu';
import TeacherCalendar from './TeacherCalendar';
import ClassroomSettings from './ClassroomSettings';
import ClassroomCard from '../components/ClassroomCard';
import { apiFetch } from '../utils/api';
import Skeleton from '../components/Skeleton';
import { useDarkMode } from '../hooks/useDarkMode';
import { useSidebarNav } from '../hooks/useSidebarNav';

const getStorageKey = (user) => {
  const identifier = user?.email || user?.id || (user?.name ? user.name.toLowerCase().replace(/\s+/g, '_') : null);
  return identifier ? `verity_teacher_classrooms_${identifier}` : 'verity_teacher_classrooms_anon';
};

import { isPhantomClassroom, mergeClassroomsPreservingOrder, generateClassCode } from '../utils/classroomUtils';
export { isPhantomClassroom, mergeClassroomsPreservingOrder, generateClassCode };

export default function TeacherDashboard({ currentUser, onLogout, onEnterClassroom }) {
  const { isDark } = useDarkMode();
  const { collapsed, toggleSidebar, sidebarProps, isPinned } = useSidebarNav();
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
    sidebar: (collapsed) => ({
      width: collapsed ? '84px' : '240px',
      minWidth: collapsed ? '84px' : '240px',
      padding: '20px 14px 20px',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      background: 'transparent',
      overflowY: 'auto',
      overflowX: 'hidden'
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
    navGroup: { display: 'flex', flexDirection: 'column', gap: '15px' },
    navItem: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '12px 20px', color: '#6b7280', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', borderRadius: '14px', background: 'transparent', boxShadow: 'none', whiteSpace: 'nowrap' },
    activeNavItem: { color: '#10b981', fontWeight: '700' },
    settingsIcon: { color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' },
    mainContent: { flex: 1, padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
    topBar: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginBottom: '20px' },
    logoutButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    profileCircle: { width: '50px', height: '50px', backgroundColor: '#d1d5db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' },
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

    // The Green Create Button
    createButton: { 
      display: 'flex', 
      alignItems: 'center', 
      padding: '10px 30px', 
      backgroundColor: '#10b981', 
      border: 'none', 
      borderRadius: '50px', 
      color: 'white', 
      fontWeight: 'bold', 
      fontSize: '1rem', 
      cursor: 'pointer', 
      boxShadow: isDark 
        ? '0 0 16px rgba(16, 185, 129, 0.35), 0 2px 6px rgba(0, 0, 0, 0.35)' 
        : '0 2px 6px rgba(16, 185, 129, 0.24), 0 1px 2px rgba(0, 0, 0, 0.05)',
      transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease'
    },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' },

    // Modal Styles
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, backdropFilter: 'blur(5px)' },
    modalCard: {
      backgroundColor: isDark ? '#323232' : 'white',
      padding: '40px',
      borderRadius: '24px',
      width: '90%',
      maxWidth: '500px',
      boxShadow: isDark ? '0 0 24px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.05)',
      border: isDark ? '1px solid #4A4A4A' : 'none',
      color: isDark ? '#E8EAED' : 'inherit'
    },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
    closeModalBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: isDark ? '#a3a3a3' : '#9ca3af', padding: '6px', borderRadius: '50%' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: {
      width: '100%',
      padding: '15px',
      borderRadius: '12px',
      border: isDark ? '1px solid #4A4A4A' : '1px solid #e5e7eb',
      backgroundColor: isDark ? '#282828' : 'white',
      color: isDark ? '#E8EAED' : '#4b5563',
      fontSize: '1rem',
      boxSizing: 'border-box',
      boxShadow: isDark ? '0 0 8px rgba(0,0,0,0.2) inset' : 'inset 0 2px 4px rgba(0,0,0,0.02)'
    },
    submitModalBtn: { 
      padding: '10px 40px', 
      backgroundColor: '#10b981', 
      border: 'none', 
      borderRadius: '50px', 
      color: 'white', 
      fontWeight: 'bold', 
      fontSize: '1rem', 
      cursor: 'pointer',
      boxShadow: isDark 
        ? '0 0 16px rgba(16, 185, 129, 0.35), 0 2px 6px rgba(0, 0, 0, 0.35)' 
        : '0 2px 6px rgba(16, 185, 129, 0.24), 0 1px 2px rgba(0, 0, 0, 0.05)',
      transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease'
    }
  };

  const navRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState(() => {
    try {
      const savedTop = sessionStorage.getItem('verity_teacher_nav_indicator_top');
      const savedHeight = sessionStorage.getItem('verity_teacher_nav_indicator_height');
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

// Load saved classrooms from localStorage so they survive a refresh.
  const [classrooms, setClassrooms] = useState(() => {
    try {
      const key = getStorageKey(currentUser);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(c => !isPhantomClassroom(c));
          const taken = new Set();
          return valid.map(c => {
            let code = (c.code || '').toString().trim().toLowerCase();
            if (!code || taken.has(code)) {
              code = generateClassCode(taken);
            }
            taken.add(code);
            return { ...c, code };
          });
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Show skeleton only when there's no cached data yet.
  const [loadingClassrooms, setLoadingClassrooms] = useState(
    () => !localStorage.getItem(getStorageKey(currentUser))
  );

  const [allowDelete, setAllowDelete] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/system-settings`)
      .then(res => res.json())
      .then(d => {
        if (!active) return;
        const config = d.settings?.global_config || d.settings || {};
        if (config.roles && typeof config.roles.allowDeleteCourses !== 'undefined') {
          setAllowDelete(config.roles.allowDeleteCourses);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Fetch real classrooms from backend server strictly for this teacher
  useEffect(() => {
    let active = true;
    const fetchClassrooms = async () => {
      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL}/classrooms`);
        if (res.ok && active) {
          const data = await res.json();
          const serverList = (Array.isArray(data) ? data : (data.classrooms || [])).filter(c => !isPhantomClassroom(c));
          // Filter strictly for this teacher
          const teacherClasses = serverList.filter(c => 
            (currentUser?.email && c.instructor_email && c.instructor_email.toLowerCase() === currentUser.email.toLowerCase()) || 
            (currentUser?.email && c.instructorEmail && c.instructorEmail.toLowerCase() === currentUser.email.toLowerCase()) || 
            (currentUser?.name && c.instructor && c.instructor.toLowerCase() === currentUser.name.toLowerCase()) ||
            (!c.instructor_email && !c.instructor)
          );
          setClassrooms(teacherClasses);
          try {
            localStorage.setItem(getStorageKey(currentUser), JSON.stringify(teacherClasses));
          } catch {}
        }
      } catch {} finally {
        if (active) setLoadingClassrooms(false);
      }
    };
    fetchClassrooms();
    return () => { active = false; };
  }, [currentUser]);

  // Real-time banner updates listener
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
    return () => window.removeEventListener('verity:banner-updated', handleBannerUpdate);
  }, []);

  // Persist classrooms whenever they change — locally (survives refresh) and to
  // the backend (so the Admin dashboard can count them server-wide).
  useEffect(() => {
    const key = getStorageKey(currentUser);
    localStorage.setItem(key, JSON.stringify(classrooms));
    const withInstructor = classrooms.map(c => ({
      ...c,
      instructor: c.instructor || currentUser?.name || 'Instructor',
      instructorEmail: c.instructorEmail || c.instructor_email || currentUser?.email || ''
    }));
    apiFetch(`${import.meta.env.VITE_API_URL}/classrooms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classrooms: withInstructor })
    }).catch(() => { /* offline — localStorage copy still holds */ });
  }, [classrooms, currentUser]);

  const [activeMenu, setActiveMenu] = useState(null);
  const [settingsClassroom, setSettingsClassroom] = useState(null);
  const [activeView, setActiveView] = useState(() => localStorage.getItem('verity_teacher_view') || 'classrooms');
  const handleSetView = (view) => {
    setActiveView(view);
    localStorage.setItem('verity_teacher_view', view);
  };
  useLayoutEffect(() => {
    const update = () => {
      const activeRef = navRefs.current[activeView];
      if (activeRef) {
        try {
          sessionStorage.setItem('verity_teacher_nav_indicator_top', String(activeRef.offsetTop));
          sessionStorage.setItem('verity_teacher_nav_indicator_height', String(activeRef.offsetHeight));
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

  const getViewTitle = (view) => {
    switch (view) {
      case 'calendar': return 'Calendar';
      case 'archived': return 'Archived';
      case 'settings': return 'Settings';
      case 'classroomSettings': return settingsClassroom ? `${settingsClassroom.name} Settings` : 'Classroom Settings';
      default: return 'Home';
    }
  };

  const navItems = [
    { id: 'classrooms', Icon: Home, label: 'Home' },
    { id: 'calendar', Icon: Calendar, label: 'Calendar' },
    { id: 'archived', Icon: Archive, label: 'Archived' },
  ];


  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState(null);
  const [newClass, setNewClass] = useState({ name: '', section: '', subject: '', code: '' });
  const [nameFocused, setNameFocused] = useState(false);
  const [sectionFocused, setSectionFocused] = useState(false);
  const [subjectFocused, setSubjectFocused] = useState(false);

  const handleOpenCreateModal = () => {
    setNewClass({
      name: '',
      section: '',
      subject: '',
      code: ''
    });
    setIsModalOpen(true);
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };
  const handleArchiveClass = (e, id) => {
    if (e) e.stopPropagation();
    setClassrooms(classrooms.map(c => c.id === id ? { ...c, archived: true } : c));
    setActiveMenu(null);
  };
  const handleUnarchiveClass = (e, id) => {
    if (e) e.stopPropagation();
    setClassrooms(classrooms.map(c => c.id === id ? { ...c, archived: false } : c));
    setActiveMenu(null);
  };
  const handleDeleteClass = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this classroom?")) {
      setClassrooms(classrooms.filter(c => c.id !== id));
      apiFetch(`${import.meta.env.VITE_API_URL}/classrooms/${id}`, {
        method: 'DELETE'
      }).catch(() => {});
    }
    setActiveMenu(null);
  };

  const handleCreateClass = (e) => {
    e.preventDefault();
    const finalCode = newClass.code || generateClassCode(classrooms);
    // Add the new class to the grid
    const newClassroom = {
      id: Date.now(),
      code: finalCode,
      section: newClass.section || "N/A",
      name: newClass.name,
      subject: newClass.subject,
      instructor: currentUser?.name || 'Instructor',
      instructorEmail: currentUser?.email || ''
    };

    setClassrooms([newClassroom, ...classrooms]);
    setIsModalOpen(false); // Close the modal
    setNewClass({ name: '', section: '', subject: '', code: '' }); // Reset form
  };



  return (
    <div style={styles.container}>

      {/* ═══ GLOBAL TOP HEADER (Instructor Pattern) ═══ */}
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
              color: isDark ? '#d4d4d4' : '#64748b',
              flexShrink: 0,
              marginRight: '16px'
            }}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
            className="icon-btn-anim"
          >
            <Menu size={24} color={isDark ? '#d4d4d4' : '#64748b'} />
          </button>

          <div
            style={{ display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', cursor: 'pointer' }}
            onClick={() => handleSetView('classrooms')}
          >
            <span style={{ color: '#10b981' }}>V</span>
            <span style={{ color: isDark ? '#f5f5f5' : '#1e293b' }}>erity</span>
            <span style={styles.badge}>Instructor</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ProfileMenu currentUser={currentUser} onLogout={onLogout} />
        </div>
      </header>

      {/* ═══ MAIN LAYOUT WITH SIDEBAR ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ═══ SIDEBAR NAVIGATION ═══ */}
        <aside {...sidebarProps} style={styles.sidebar(collapsed)}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, position: 'relative' }}>
            {/* Liquid sliding indicator */}
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: indicatorStyle.top,
              height: indicatorStyle.height,
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '14px',
              boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' : '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.35)',
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
                  <Icon size={20} color={active ? '#10b981' : (isDark ? '#a3a3a3' : '#475569')} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{ fontSize: '0.85rem', fontWeight: active ? '700' : '600', color: active ? '#10b981' : (isDark ? '#e5e5e5' : '#334155'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Teaching Section */}
            {classrooms.filter(c => !c.archived).length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!collapsed && (
                  <div style={{
                    padding: '0 18px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: isDark ? '#737373' : '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '4px'
                  }}>
                    Teaching
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
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: isDark ? '#E8EAED' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  <span style={{ fontSize: '0.85rem', fontWeight: activeView === 'settings' ? '700' : '600', color: activeView === 'settings' ? '#10b981' : (isDark ? '#E8EAED' : '#334155'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}
            >

              {activeView === 'calendar' && (
                <TeacherCalendar classrooms={classrooms} />
              )}

              {activeView === 'archived' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 10px' }}>
                    <h2 style={{ color: isDark ? '#E8EAED' : '#4b5563', margin: 0 }}>Archived Classrooms</h2>
                  </div>

                  {classrooms.filter(c => c.archived).length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isDark ? '#6b7280' : '#9ca3af' }}>
                      <h3 style={{ margin: 0, color: isDark ? '#a3a3a3' : '#6b7280' }}>No Archived Classrooms</h3>
                      <p style={{ marginTop: '10px', color: isDark ? '#6b7280' : '#9ca3af' }}>Classrooms you archive will appear here.</p>
                    </div>
                  ) : (
                    <div style={styles.grid}>
                      {classrooms.filter(c => c.archived).map(cls => (
                        <ClassroomCard
                          key={cls.id}
                          classroom={cls}
                          onEnter={onEnterClassroom}
                          onUnarchive={handleUnarchiveClass}
                          onDelete={(allowDelete || currentUser?.role === 'Admin') ? handleDeleteClass : undefined}
                          isArchived={true}
                          role="Teacher"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeView === 'settings' && <SettingsPanel role="Instructor" />}
              {activeView === 'classroomSettings' && settingsClassroom && (
                <ClassroomSettings
                  classroom={settingsClassroom}
                  onClose={() => { setSettingsClassroom(null); handleSetView('classrooms'); }}
                  onUpdate={(updated) => {
                    setClassrooms(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
                    setSettingsClassroom(updated);
                  }}
                />
              )}

              {activeView === 'classrooms' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 10px' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleOpenCreateModal}
                      style={styles.createButton}
                    >
                      Create
                    </motion.button>
                  </div>

                  {/* Classroom Grid */}
                  <div style={styles.grid}>
                    {loadingClassrooms
                      ? Array.from({ length: 4 }).map((_, i) => <Skeleton.Card key={i} />)
                      : classrooms.filter(c => !c.archived).length === 0 ? (
                        <div style={{
                          gridColumn: '1 / -1',
                          padding: '50px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                          borderRadius: '20px',
                          border: isDark ? '1.5px dashed #404040' : '1.5px dashed #cbd5e1'
                        }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            backgroundColor: isDark ? '#262626' : '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '14px'
                          }}>
                            <Home size={28} color="#10b981" />
                          </div>
                          <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: '700', color: isDark ? '#f5f5f5' : '#1e293b' }}>
                            No Classrooms Yet
                          </h3>
                          <p style={{ margin: '0 0 16px', maxWidth: '380px', fontSize: '0.88rem', color: isDark ? '#a3a3a3' : '#64748b' }}>
                            Click <strong>Create</strong> above to create your first classroom and share the class code with your students.
                          </p>
                        </div>
                      ) : classrooms.filter(c => !c.archived).map(cls => (
                      <ClassroomCard
                        key={cls.id}
                        classroom={cls}
                        onEnter={onEnterClassroom}
                        onArchive={handleArchiveClass}
                        onSettings={(c) => {
                          setSettingsClassroom(c);
                          handleSetView('classroomSettings');
                        }}
                        onDelete={(allowDelete || currentUser?.role === 'Admin') ? handleDeleteClass : undefined}
                        role="Teacher"
                      />
                    ))
                    }
                  </div>
                </>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>

      {/* CREATE CLASSROOM MODAL (Overlay) */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>

            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, color: isDark ? '#f8fafc' : '#1f2937' }}>Create Class</h2>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeModalBtn}>
                <X size={24} color={isDark ? '#cbd5e1' : '#475569'} />
              </button>
            </div>

            <form onSubmit={handleCreateClass} style={styles.form}>
              <motion.input
                type="text"
                placeholder="Class name (Required)"
                required
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '12px',
                  border: nameFocused ? '2px solid #007bff' : (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                  backgroundColor: isDark ? '#0f172a' : 'white',
                  color: isDark ? '#f8fafc' : '#4b5563',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  boxShadow: isDark ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'border-color 0.3s'
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
              <motion.input
                type="text"
                placeholder="Section"
                value={newClass.section}
                onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '12px',
                  border: sectionFocused ? '2px solid #007bff' : (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                  backgroundColor: isDark ? '#0f172a' : 'white',
                  color: isDark ? '#f8fafc' : '#4b5563',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  boxShadow: isDark ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'border-color 0.3s'
                }}
                onFocus={() => setSectionFocused(true)}
                onBlur={() => setSectionFocused(false)}
              />
              <motion.input
                type="text"
                placeholder="Subject"
                value={newClass.subject}
                onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '12px',
                  border: subjectFocused ? '2px solid #007bff' : (isDark ? '1px solid #334155' : '1px solid #e5e7eb'),
                  backgroundColor: isDark ? '#0f172a' : 'white',
                  color: isDark ? '#f8fafc' : '#4b5563',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  boxShadow: isDark ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'border-color 0.3s'
                }}
                onFocus={() => setSubjectFocused(true)}
                onBlur={() => setSubjectFocused(false)}
              />



              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                <button type="submit" style={styles.submitModalBtn}>Create</button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

