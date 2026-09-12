import React, { useState, useEffect, useRef } from 'react';
// IMPORTING PROFESSIONAL SVGS
import { Home, Calendar, ClipboardList, Settings, MoreVertical, Plus, LogOut, User, X, Menu, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SettingsPanel from './SettingsPanel';
import ProfileMenu from './ProfileMenu';
import StudentCalendar from './StudentCalendar';
import ClassroomSettings from './ClassroomSettings';
import UITransitionsShowcase from '../components/UITransitionsShowcase';

const STORAGE_KEY = 'verity_student_classrooms';

const DEFAULT_CLASSROOMS = [
  { id: 1, code: "CS101", name: "C# Programming", instructor: "Prof. Garcia" },
  { id: 2, code: "IT202", name: "Data Structures", instructor: "Prof. Santos" },
  { id: 3, code: "CS303", name: "Web Development", instructor: "Prof. Reyes" }
];

export default function StudentDashboard({ onLogout, onEnterClassroom }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('verity_sidebar_collapsed') === 'true');
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('verity_sidebar_collapsed', next);
  };

  const navRef_classrooms = useRef(null);
  const navRef_calendar = useRef(null);
  const navRef_archived = useRef(null);
  const navRef_settings = useRef(null);
  const enrolledRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });
  const [enrolledIndicator, setEnrolledIndicator] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });

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

  useEffect(() => {
    const timer = setTimeout(() => {
      let activeRef = null;
      if (typeof activeView !== 'undefined') {
        activeRef = activeView === 'calendar' ? navRef_calendar : (activeView === 'archived' ? navRef_archived : (activeView === 'settings' ? navRef_settings : navRef_classrooms));
      } else {
        activeRef = navRef_classrooms;
      }
      if (activeRef && activeRef.current) {
        const el = activeRef.current;
        setIndicatorStyle(prev => {
          if (prev.top === el.offsetTop && prev.height === el.offsetHeight && prev.opacity === 1) return prev;
          sessionStorage.setItem('verity_nav_top', el.offsetTop); return { top: el.offsetTop, height: el.offsetHeight, opacity: 1 };
        });
      }

      let activeBotRef = null;
      // The dashboard doesn't have an "active" classroom state stored in a variable, but let's just clear it or handle it if we want it to highlight.
      // Usually clicking a class navigates away, so we don't strictly need it to stay active, but we should render the indicator div.
      setEnrolledIndicator(prev => {
        if (prev.opacity === 0) return prev;
        return { ...prev, opacity: 0 };
      });

    }, 10);
    return () => clearTimeout(timer);
  });

  // Load the student's joined classrooms (persists across refresh/logout).
  const [classrooms, setClassrooms] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CLASSROOMS;
    } catch {
      return DEFAULT_CLASSROOMS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classrooms));
  }, [classrooms]);



  // "Input Class Code" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    setJoinError('');
    const code = classCode.trim();
    if (!code) return;

    // Already joined?
    if (classrooms.some(c => (c.code || '').toLowerCase() === code.toLowerCase())) {
      setJoinError('You have already joined this class.');
      return;
    }

    // Look up the code against the teacher's created classrooms.
    let teacherClasses;
    try {
      teacherClasses = JSON.parse(localStorage.getItem('verity_classrooms')) || [];
    } catch {
      teacherClasses = [];
    }

    const match = teacherClasses.find(c =>
      (c.code && c.code.toLowerCase() === code.toLowerCase()) ||
      (c.section && c.section.toLowerCase() === code.toLowerCase())
    );

    if (!match) {
      setJoinError('No class found with that code. Please check the code and try again.');
      return;
    }

    const joined = {
      id: match.id || Date.now(),
      code: match.section || code,
      name: match.name,
      instructor: match.subject || 'Instructor'
    };

    setClassrooms([joined, ...classrooms]);
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
    container: { minHeight: '100vh', width: '100%', display: 'flex', background: 'linear-gradient(to bottom, #f3f4f6 0%, #cbd5e1 100%)', fontFamily: 'sans-serif', position: 'relative' },
    sidebar: { width: '250px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '40px', zIndex: 10, position: 'relative', transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' },
    logoContainer: { fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' },
    logoV: { color: '#10b981' },
    logoText: { color: 'white' },
    navGroup: { display: 'flex', flexDirection: 'column', gap: '15px' },
    navItem: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '12px 20px', color: '#6b7280', fontWeight: '600', cursor: 'pointer', transition: 'color 0.15s', borderRadius: '10px', background: 'transparent', boxShadow: 'none', whiteSpace: 'nowrap' },
    activeNavItem: { color: '#10b981', fontWeight: '700', backgroundColor: 'transparent', boxShadow: 'none' },
    settingsIcon: { color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' },
    mainContent: { flex: 1, padding: 'clamp(20px, 4vw, 30px) clamp(15px, 5vw, 50px)', display: 'flex', flexDirection: 'column' },
    topBar: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginBottom: '20px' },
    logoutButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    profileCircle: { width: '50px', height: '50px', backgroundColor: '#d1d5db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' },
    whiteCard: { backgroundColor: 'white', flex: 1, borderRadius: '24px', padding: 'clamp(20px, 4vw, 40px)', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflowY: 'auto' },
    addButton: { display: 'flex', alignItems: 'center', padding: '10px 20px', backgroundColor: '#d1d5db', border: 'none', borderRadius: '50px', color: '#4b5563', fontWeight: 'bold', cursor: 'pointer', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: '30px' },
    cardContainer: { display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' },
    cardPill: { backgroundColor: '#d1d5db', height: '30px', borderRadius: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '0.85rem', fontWeight: 'bold' },
    cardBody: { backgroundColor: '#d1d5db', height: '180px', borderRadius: '20px', padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', transition: 'transform 0.2s' },
    dots: { position: 'absolute', bottom: '15px', right: '15px', width: '30px', height: '30px', backgroundColor: '#e5e7eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', cursor: 'pointer' },
    dropdownMenu: { position: 'absolute', bottom: '50px', right: '10px', backgroundColor: '#9ca3af', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 10 },
    dropdownItem: { padding: '5px 15px', color: 'black', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' },

    // Modal
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modalCard: { backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '550px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
    closeModalBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #9ca3af', backgroundColor: 'white', color: '#4b5563', fontSize: '1rem', boxSizing: 'border-box' },
    joinButton: { padding: '12px 50px', backgroundColor: '#10b981', border: 'none', borderRadius: '50px', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16,185,129,0.2)' },
    errorText: { color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px 15px', borderRadius: '10px', margin: 0, fontSize: '0.9rem', textAlign: 'center' }
  };

  return (
    <div style={styles.container}>

      {/* LEFT SIDEBAR */}
      <div style={{ ...styles.sidebar, width: collapsed ? '110px' : '250px', padding: '30px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '15px',
          whiteSpace: 'nowrap',
          width: 'max-content',
          transform: collapsed ? 'translateX(13px)' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <Menu size={24} color="#10b981" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={toggleSidebar} />
          <div style={styles.logoContainer}>
            <span style={styles.logoV}>V</span>
            <span style={styles.logoText}>erity</span>
          </div>
        </div>

        {/* Liquid sliding indicator for top nav */}
        <div className={indicatorStyle.opacity === 1 ? 'glass-active' : ''} style={{
          position: 'absolute',
          left: '20px',
          right: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '14px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          top: indicatorStyle.top,
          height: indicatorStyle.height,
          opacity: indicatorStyle.opacity,
          pointerEvents: 'none',
          zIndex: 0,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.3)'
        }} />

        <div style={styles.navGroup}>
          <div
            ref={navRef_classrooms}
            style={{ ...styles.navItem, ...(activeView === 'classrooms' ? { ...styles.activeNavItem, color: '#10b981', fontWeight: '700' } : {}), position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start' }}
            onClick={() => handleSetView('classrooms')}
          >
            <Home size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Home</span>}
          </div>
          <div
            ref={navRef_calendar}
            style={{ ...styles.navItem, ...(activeView === 'calendar' ? { ...styles.activeNavItem, color: '#10b981', fontWeight: '700' } : {}), position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start' }}
            onClick={() => handleSetView('calendar')}
          >
            <Calendar size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Calendar</span>}
          </div>
          <div
            ref={navRef_archived}
            style={{ ...styles.navItem, ...(activeView === 'archived' ? { ...styles.activeNavItem, color: '#10b981', fontWeight: '700' } : {}), position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start' }}
            onClick={() => handleSetView('archived')}
          >
            <Archive size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Archived</span>}
          </div>
        </div>

        {classrooms.length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {!collapsed && (
              <div style={{
                padding: '0 20px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '5px'
              }}>
                Enrolled
              </div>
            )}
            {classrooms.filter(c => !c.archived).map((cls) => {
              // Generate a deterministic color based on the index or ID
              const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
              const color = colors[cls.id % colors.length];

              return (
                <div
                  key={cls.id} ref={el => enrolledRefs.current['cls_' + cls.id] = el}
                  style={{ ...styles.navItem, position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start' }}
                  onClick={() => onEnterClassroom(cls)}
                  title={cls.name}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {cls.name.charAt(0).toUpperCase()}
                  </div>
                  {!collapsed && <span style={{ marginLeft: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.name}</span>}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1 }}></div>

        <div
          ref={navRef_settings}
          style={{ ...styles.navItem, ...(activeView === 'settings' ? { ...styles.activeNavItem, color: '#10b981', fontWeight: '700' } : {}), position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start' }}
          onClick={() => handleSetView('settings')}
          title="Settings"
        >
          <Settings size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Settings</span>}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={styles.mainContent}>

        {/* Top Bar */}
        <div style={styles.topBar}>
          <ProfileMenu onLogout={onLogout} />
        </div>

        {/* The Main White Card */}
        <div style={styles.whiteCard}>
          {/* Consistent View Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 0 20px 0',
            borderBottom: '1px solid #e5e7eb',
            marginBottom: '20px'
          }}>
            <h2 style={{
              color: '#4b5563',
              fontWeight: '600',
              fontSize: '1.5rem',
              margin: 0
            }}>
              {getViewTitle(activeView)}
            </h2>
            {/* Optional: Add view-specific actions here if needed */}
          </div>

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
                    <div key={cls.id} style={{ ...styles.cardContainer, opacity: 0.7 }} onClick={() => onEnterClassroom(cls)}>
                      <div style={styles.cardPill}>{cls.code}</div>

                      <div style={styles.cardBody}>
                        <h3 style={{ color: '#4b5563', margin: '0 0 10px 0' }}>{cls.name}</h3>
                        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>{cls.instructor}</p>

                        <motion.div
                          style={styles.dots}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => toggleMenu(e, cls.id)}
                        >
                          <MoreVertical size={18} />
                        </motion.div>

                        {activeMenu === cls.id && (
                          <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              style={styles.dropdownItem}
                              onClick={(e) => handleUnarchiveClass(e, cls.id)}
                            >
                              Restore
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              style={{ ...styles.dropdownItem, color: '#ef4444' }}
                              onClick={(e) => { e.stopPropagation(); handleDelete(e, cls.id); setActiveMenu(null); }}
                            >
                              Delete
                            </motion.div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'classrooms' && (
            <>
              <UITransitionsShowcase />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                {classrooms.filter(c => !c.archived).map(cls => (
                  <div key={cls.id} style={styles.cardContainer} onClick={() => onEnterClassroom(cls)}>
                    <div style={styles.cardPill}>{cls.code}</div>

                    <div style={styles.cardBody}>
                      <h3 style={{ color: '#4b5563', margin: '0 0 10px 0' }}>{cls.name}</h3>
                      <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>{cls.instructor}</p>

                      <motion.div
                        style={styles.dots}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => toggleMenu(e, cls.id)}
                      >
                        <MoreVertical size={18} />
                      </motion.div>

                      {activeMenu === cls.id && (
                        <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={styles.dropdownItem}
                            onClick={(e) => handleArchiveClass(e, cls.id)}
                          >
                            Archive
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={styles.dropdownItem}
                            onClick={(e) => { e.stopPropagation(); setSettingsClassroom(cls); handleSetView('classroomSettings'); setActiveMenu(null); }}
                          >
                            Settings
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{ ...styles.dropdownItem, color: '#ef4444' }}
                            onClick={(e) => { e.stopPropagation(); handleDelete(e, cls.id); setActiveMenu(null); }}
                          >
                            Delete
                          </motion.div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* INPUT CLASS CODE MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>Input Class Code</h2>
              <button onClick={() => { setIsModalOpen(false); setJoinError(''); }} style={styles.closeModalBtn}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleJoin} style={styles.form}>
              <motion.input
                placeholder="e.g. CS101"
                value={classCode}
                onChange={(e) => { setClassCode(e.target.value); if (joinError) setJoinError(''); }}
                style={{
                  width: inputFocused ? '100%' : '80%',
                  padding: '12px',
                  borderRadius: '9999px',
                  border: inputFocused ? '2px solid #007bff' : '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  fontSize: '0.875rem',
                  transition: 'width 0.3s, border-color 0.3s'
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />
              {joinError && <p style={styles.errorText}>{joinError}</p>}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  style={styles.joinButton}
                >
                  Join
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

