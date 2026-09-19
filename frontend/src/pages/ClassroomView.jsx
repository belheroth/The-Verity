import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import ProfileMenu from './ProfileMenu';
import { 
  Calendar, ClipboardList, Settings, MoreVertical, ArrowLeft, X, Link2, 
  Menu, Home, Archive, Info, Users, BookOpen, ChevronRight, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../utils/api';
import Skeleton from '../components/Skeleton';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatShortDate = (value) => {
  if (!value) return '';
  let d;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(value);
  }
  if (isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

const isLegacyHardcoded = (item) => (item?.id === 1 || item?.id === 2) && (item?.title?.startsWith('Activity 1:') || item?.title?.startsWith('Activity 2:'));

const getStorageKey = (user) => {
  const identifier = user?.email || user?.id || user?.name || 'default';
  return `verity_student_classrooms_${identifier}`;
};

// Banner Themes Configuration (Shared with Instructor view)
const THEME_PRESETS = [
  {
    id: 'emerald_books',
    name: 'Emerald Books',
    primary: '#137333',
    secondary: '#1e8e3e',
    textColor: '#ffffff'
  },
  {
    id: 'ocean_academia',
    name: 'Ocean Academia',
    primary: '#1a73e8',
    secondary: '#0d47a1',
    textColor: '#ffffff'
  },
  {
    id: 'royal_violet',
    name: 'Royal Violet',
    primary: '#7c3aed',
    secondary: '#581c87',
    textColor: '#ffffff'
  },
  {
    id: 'warm_amber',
    name: 'Warm Amber',
    primary: '#ea580c',
    secondary: '#9a3412',
    textColor: '#ffffff'
  },
  {
    id: 'midnight_slate',
    name: 'Midnight Tech',
    primary: '#0f172a',
    secondary: '#1e293b',
    textColor: '#ffffff'
  }
];

export default function ClassroomView({
  classroom,
  currentUser,
  onBack,
  onOpenAssignment,
  onStartAssignment,
  socket,
  onEnterClassroom,
  onNavigateView,
  onLogout
}) {
  const [classrooms, setClassrooms] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(currentUser));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    const key = getStorageKey(currentUser);
    const sync = () => {
      try {
        const saved = localStorage.getItem(key);
        setClassrooms(saved ? JSON.parse(saved) : []);
      } catch {
        setClassrooms([]);
      }
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [currentUser]);

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('verity_sidebar_collapsed') === 'true');
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('verity_sidebar_collapsed', next);
  };

  const navRefs = useRef({});
  const enrolledRefs = useRef({});
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

  useLayoutEffect(() => {
    const update = () => {
      let activeRef = null;
      if (classroom) {
        activeRef = enrolledRefs.current['cls_' + classroom.id];
      }
      if (!activeRef) {
        activeRef = navRefs.current['classrooms'];
      }

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
  }, [classroom, collapsed]);

  // Active Tab: strictly 'stream' | 'classwork' | 'people' (no 'grades' for students)
  const [activeTab, setActiveTab] = useState('stream');

  // Banner Theme synced with instructor setting
  const themeStorageKey = `verity_classroom_theme_${classroom?.id ?? 'default'}`;
  const [bannerTheme, setBannerTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(themeStorageKey);
      if (saved) return JSON.parse(saved);
      if (classroom?.theme) return classroom.theme;
    } catch {}
    return THEME_PRESETS[0];
  });

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === themeStorageKey && e.newValue) {
        try {
          setBannerTheme(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [themeStorageKey]);

  // Modal for class details
  const [isClassInfoModalOpen, setIsClassInfoModalOpen] = useState(false);

  // Classwork & Assignments state
  const [expandedId, setExpandedId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    const classroomId = classroom?.id ?? 'default';
    const storageKey = `verity_classwork_${classroomId}`;

    const applyList = (list) => {
      if (Array.isArray(list)) {
        setAssignments(list.filter(item => !item.archived && !isLegacyHardcoded(item)));
      } else {
        setAssignments([]);
      }
    };

    const loadFromLocal = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        applyList(saved ? JSON.parse(saved) : []);
      } catch {
        setAssignments([]);
      }
    };

    let cancelled = false;
    apiFetch(`${import.meta.env.VITE_API_URL}/classwork/${classroomId}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data.classwork) && data.classwork.length > 0) {
          applyList(data.classwork);
        } else {
          loadFromLocal();
        }
      })
      .catch(() => { if (!cancelled) loadFromLocal(); })
      .finally(() => { if (!cancelled) setLoadingAssignments(false); });

    const onClassworkChanged = (payload) => {
      if (String(payload?.classroomId) === String(classroomId) && Array.isArray(payload?.classwork)) {
        applyList(payload.classwork);
        try {
          localStorage.setItem(storageKey, JSON.stringify(payload.classwork));
        } catch (e) { }
      }
    };
    if (socket) socket.on('classwork_changed', onClassworkChanged);

    const onStorage = (e) => { if (e.key === storageKey) loadFromLocal(); };
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      if (socket) socket.off('classwork_changed', onClassworkChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [classroom, socket]);

  // Track submission status for all assignments
  const [submittedTasks, setSubmittedTasks] = useState({});

  useEffect(() => {
    const safeUsername = currentUser?.name || currentUser?.email || 'Student';
    const studentId = currentUser?.email || currentUser?.name || 'student';
    const classroomId = classroom?.id ?? 'default';

    const checkAllSubs = () => {
      const map = {};
      assignments.forEach(task => {
        const keys = [
          `verity_sub_${classroomId}_${task.id}_${studentId}`,
          `verity_sub_${classroomId}_${task.id}_${safeUsername}`,
          currentUser?.name ? `verity_sub_${classroomId}_${task.id}_${currentUser.name}` : null,
          currentUser?.email ? `verity_sub_${classroomId}_${task.id}_${currentUser.email}` : null
        ].filter(Boolean);

        if (keys.some(k => { try { return !!localStorage.getItem(k); } catch { return false; } })) {
          map[task.id] = true;
        }
      });
      setSubmittedTasks(map);
    };

    checkAllSubs();

    assignments.forEach(task => {
      apiFetch(`${import.meta.env.VITE_API_URL}/submissions/${task.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data?.submissions)) {
            const hasSub = data.submissions.some(s => {
              const sName = (s.student_name || s.studentName || '').toLowerCase();
              const sId = (s.student_id || s.studentId || '').toLowerCase();
              const targetName = safeUsername.toLowerCase();
              const targetId = studentId.toLowerCase();
              return sName === targetName || sName === targetId || (sId && (sId === targetName || sId === targetId));
            });
            if (hasSub) {
              setSubmittedTasks(prev => ({ ...prev, [task.id]: true }));
            }
          }
        })
        .catch(() => {});
    });

    const onStorage = () => checkAllSubs();
    window.addEventListener('storage', onStorage);

    const onSubChange = () => checkAllSubs();
    if (socket) {
      socket.on('student_unsubmitted', onSubChange);
      socket.on('teacher_receive_submission', onSubChange);
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      if (socket) {
        socket.off('student_unsubmitted', onSubChange);
        socket.off('teacher_receive_submission', onSubChange);
      }
    };
  }, [assignments, classroom?.id, currentUser, socket]);

  // Read-only Instructor announcements in Stream
  const announcementKey = `verity_announcements_${classroom?.id ?? 'default'}`;
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const saved = localStorage.getItem(announcementKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === announcementKey) {
        try {
          setAnnouncements(e.newValue ? JSON.parse(e.newValue) : []);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [announcementKey]);

  // People Tab: Enrolled students
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!classroom?.id) return;
    setLoadingStudents(true);

    const loadStudents = async () => {
      const studentsMap = {};

      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('verity_student_classrooms_')) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const match = list.some(c => 
                  c.id === classroom.id || 
                  (c.section && c.section.toLowerCase() === (classroom.section || '').toLowerCase())
                );
                if (match) {
                  const studentName = k.replace('verity_student_classrooms_', '');
                  studentsMap[studentName] = { 
                    name: studentName, 
                    email: `${studentName.toLowerCase().replace(/\s+/g, '.')}@student.verity.edu` 
                  };
                }
              }
            }
          }
        }
      } catch {}

      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL}/classroom-students/${classroom.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.students)) {
            data.students.forEach(s => {
              if (s.name) {
                studentsMap[s.name] = { 
                  name: s.name, 
                  email: s.email || `${s.name.toLowerCase().replace(/\s+/g, '.')}@student.verity.edu` 
                };
              }
            });
          }
        }
      } catch {}

      if (Object.keys(studentsMap).length === 0) {
        studentsMap['Alex Johnson'] = { name: 'Alex Johnson', email: 'alex.johnson@student.verity.edu' };
        studentsMap['Beatriz Santos'] = { name: 'Beatriz Santos', email: 'beatriz.santos@student.verity.edu' };
        studentsMap['Carlos Rivera'] = { name: 'Carlos Rivera', email: 'carlos.rivera@student.verity.edu' };
      }

      setEnrolledStudents(Object.values(studentsMap));
      setLoadingStudents(false);
    };

    loadStudents();
  }, [classroom?.id, classroom?.section]);

  // Upcoming items for left column in Stream
  const upcomingItems = assignments
    .filter(item => item.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);

  // SVG Illustration for Google Classroom Banner
  const renderBannerIllustration = () => {
    if (bannerTheme.id === 'ocean_academia') {
      return (
        <svg viewBox="0 0 400 240" fill="none" style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
          <circle cx="280" cy="120" r="140" fill="#0d47a1" opacity="0.4" />
          <path d="M220 180 L280 60 L340 180" stroke="#60a5fa" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="280" cy="60" r="12" fill="#93c5fd" />
          <path d="M235 150 L325 150" stroke="#93c5fd" strokeWidth="4" />
          <rect x="180" y="80" width="80" height="90" rx="8" fill="#1e3a8a" transform="rotate(-15 180 80)" />
          <line x1="190" y1="100" x2="245" y2="90" stroke="#60a5fa" strokeWidth="3" />
          <line x1="195" y1="120" x2="250" y2="110" stroke="#60a5fa" strokeWidth="3" />
        </svg>
      );
    }

    if (bannerTheme.id === 'royal_violet') {
      return (
        <svg viewBox="0 0 400 240" fill="none" style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
          <circle cx="300" cy="120" r="150" fill="#581c87" opacity="0.4" />
          <path d="M230 160 C210 100, 350 70, 340 170 C330 200, 250 200, 230 160 Z" fill="#9333ea" />
          <circle cx="260" cy="140" r="8" fill="#f43f5e" />
          <circle cx="280" cy="115" r="8" fill="#38bdf8" />
          <circle cx="310" cy="130" r="8" fill="#facc15" />
          <rect x="200" y="50" width="16" height="130" rx="6" fill="#c084fc" transform="rotate(35 200 50)" />
        </svg>
      );
    }

    if (bannerTheme.id === 'warm_amber') {
      return (
        <svg viewBox="0 0 400 240" fill="none" style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
          <circle cx="300" cy="120" r="140" fill="#9a3412" opacity="0.4" />
          <rect x="220" y="70" width="100" height="120" rx="10" fill="#f97316" transform="rotate(-12 220 70)" />
          <rect x="240" y="90" width="95" height="115" rx="10" fill="#fed7aa" transform="rotate(15 240 90)" />
          <path d="M220 180 Q270 120 330 70" stroke="#ffedd5" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    }

    if (bannerTheme.id === 'midnight_slate') {
      return (
        <svg viewBox="0 0 400 240" fill="none" style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
          <circle cx="290" cy="120" r="140" fill="#1e293b" opacity="0.6" />
          <rect x="210" y="60" width="150" height="100" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="3" />
          <circle cx="225" cy="74" r="3" fill="#ef4444" />
          <circle cx="235" cy="74" r="3" fill="#eab308" />
          <circle cx="245" cy="74" r="3" fill="#22c55e" />
          <path d="M235 110 L250 125 L235 140" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="260" y1="140" x2="280" y2="140" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    }

    // Default: Emerald Books
    return (
      <svg viewBox="0 0 420 240" fill="none" style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
        <circle cx="310" cy="120" r="150" fill="#0d5d28" opacity="0.45" />

        <g transform="translate(230, 40) rotate(-28)">
          <rect x="-10" y="-10" width="130" height="150" rx="10" fill="#0f5132" />
          <rect x="0" y="0" width="115" height="135" rx="6" fill="#c6f6d5" />
          <line x1="15" y1="25" x2="100" y2="25" stroke="#9ae6b4" strokeWidth="2.5" />
          <line x1="15" y1="45" x2="100" y2="45" stroke="#9ae6b4" strokeWidth="2.5" />
          <line x1="15" y1="65" x2="100" y2="65" stroke="#9ae6b4" strokeWidth="2.5" />
          <line x1="15" y1="85" x2="100" y2="85" stroke="#9ae6b4" strokeWidth="2.5" />
          <line x1="15" y1="105" x2="100" y2="105" stroke="#9ae6b4" strokeWidth="2.5" />
          <path d="M55 0 L55 90 L62 82 L70 90 L70 0 Z" fill="#fb923c" />
        </g>

        <g transform="translate(270, 75) rotate(14)">
          <rect x="-8" y="-8" width="140" height="145" rx="10" fill="#1e293b" />
          <rect x="0" y="0" width="128" height="132" rx="6" fill="#f8fafc" />
          <line x1="15" y1="25" x2="110" y2="25" stroke="#e2e8f0" strokeWidth="2.5" />
          <line x1="15" y1="45" x2="110" y2="45" stroke="#e2e8f0" strokeWidth="2.5" />
          <line x1="15" y1="65" x2="110" y2="65" stroke="#e2e8f0" strokeWidth="2.5" />
          <line x1="15" y1="85" x2="110" y2="85" stroke="#e2e8f0" strokeWidth="2.5" />
          <line x1="15" y1="105" x2="110" y2="105" stroke="#e2e8f0" strokeWidth="2.5" />

          <path d="M90 0 L90 75 L98 68 L106 75 L106 0 Z" fill="#ef4444" />

          <g transform="translate(-15, 30) rotate(-42)">
            <rect x="0" y="0" width="140" height="24" rx="4" fill="#f43f5e" />
            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130].map(x => (
              <line key={x} x1={x} y1="0" x2={x} y2={x % 20 === 0 ? "10" : "6"} stroke="white" strokeWidth="1.5" />
            ))}
          </g>
        </g>
      </svg>
    );
  };

  return (
    <div style={styles.container}>

      {/* ═══ GLOBAL TOP HEADER (Consistent with Application Design) ═══ */}
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
              color: '#64748b',
              flexShrink: 0,
              marginRight: '16px'
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="icon-btn-anim"
          >
            <Menu size={24} color="#64748b" />
          </button>

          <div
            style={{ display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', cursor: 'pointer' }}
            onClick={() => {
              if (onNavigateView) onNavigateView('classrooms');
              else onBack();
            }}
          >
            <span style={{ color: '#10b981' }}>V</span>
            <span style={{ color: '#1e293b' }}>erity</span>
            <span style={styles.badge}>Student</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ProfileMenu onLogout={onLogout} />
        </div>
      </header>

      {/* ═══ MAIN LAYOUT WITH SIDEBAR ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR NAVIGATION */}
        <aside style={styles.sidebar(collapsed)}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: indicatorStyle.top,
              height: indicatorStyle.height,
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.35)',
              transition: indicatorStyle.transition || 'none',
              opacity: indicatorStyle.opacity,
              pointerEvents: 'none',
              zIndex: 0,
            }} />

            <button
              ref={el => navRefs.current['classrooms'] = el}
              onClick={() => {
                if (onNavigateView) onNavigateView('classrooms');
                else onBack();
              }}
              style={styles.sidebarBtn(collapsed)}
              title={collapsed ? 'Home' : ''}
            >
              <Home size={20} color="#475569" style={{ flexShrink: 0 }} />
              {!collapsed && <span style={styles.sidebarBtnText}>Home</span>}
            </button>

            <button
              ref={el => navRefs.current['calendar'] = el}
              onClick={() => {
                if (onNavigateView) onNavigateView('calendar');
                else onBack();
              }}
              style={styles.sidebarBtn(collapsed)}
              title={collapsed ? 'Calendar' : ''}
            >
              <Calendar size={20} color="#475569" style={{ flexShrink: 0 }} />
              {!collapsed && <span style={styles.sidebarBtnText}>Calendar</span>}
            </button>

            <button
              ref={el => navRefs.current['archived'] = el}
              onClick={() => {
                if (onNavigateView) onNavigateView('archived');
                else onBack();
              }}
              style={styles.sidebarBtn(collapsed)}
              title={collapsed ? 'Archived' : ''}
            >
              <Archive size={20} color="#475569" style={{ flexShrink: 0 }} />
              {!collapsed && <span style={styles.sidebarBtnText}>Archived</span>}
            </button>

            {classrooms.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!collapsed && (
                  <div style={{
                    padding: '0 18px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: '#9ca3af',
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
                  const active = classroom?.id === cls.id;

                  return (
                    <button
                      key={cls.id}
                      ref={el => enrolledRefs.current['cls_' + cls.id] = el}
                      onClick={() => { if (onEnterClassroom) onEnterClassroom(cls); }}
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
                        <span style={{ fontSize: '0.85rem', fontWeight: active ? '700' : '600', color: active ? '#10b981' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cls.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 'auto' }}>
              <button
                ref={el => navRefs.current['settings'] = el}
                onClick={() => {
                  if (onNavigateView) onNavigateView('settings');
                  else onBack();
                }}
                style={styles.sidebarBtn(collapsed)}
                title={collapsed ? 'Settings' : ''}
              >
                <Settings size={20} color="#475569" style={{ flexShrink: 0 }} />
                {!collapsed && <span style={styles.sidebarBtnText}>Settings</span>}
              </button>
            </div>
          </nav>
        </aside>

        {/* ═══ MAIN CONTENT AREA ═══ */}
        <div style={styles.mainContent}>

          {/* ═══ BIG BOX CONTAINER ═══ */}
          <div style={styles.bigBoxContainer}>

            {/* CLASSROOM TOP NAV TABS (Stream, Classwork, People - strictly NO Grades, NO Settings) */}
            <div style={styles.classroomNavHeader}>
              <div style={styles.classroomTabsGroup}>
                <button
                  onClick={() => setActiveTab('stream')}
                  style={{
                    ...styles.classroomTabBtn,
                    color: activeTab === 'stream' ? '#1a73e8' : '#5f6368',
                    borderBottom: activeTab === 'stream' ? '3px solid #1a73e8' : '3px solid transparent'
                  }}
                >
                  Stream
                </button>
                <button
                  onClick={() => setActiveTab('classwork')}
                  style={{
                    ...styles.classroomTabBtn,
                    color: activeTab === 'classwork' ? '#1a73e8' : '#5f6368',
                    borderBottom: activeTab === 'classwork' ? '3px solid #1a73e8' : '3px solid transparent'
                  }}
                >
                  Classwork
                </button>
                <button
                  onClick={() => setActiveTab('people')}
                  style={{
                    ...styles.classroomTabBtn,
                    color: activeTab === 'people' ? '#1a73e8' : '#5f6368',
                    borderBottom: activeTab === 'people' ? '3px solid #1a73e8' : '3px solid transparent'
                  }}
                >
                  People
                </button>
              </div>
            </div>

            {/* SCROLLABLE INNER BODY OF THE BIG BOX */}
            <div style={styles.bigBoxInnerScroll}>

              {/* ═══ TAB 1: STREAM ═══ */}
              {activeTab === 'stream' && (
                <div style={styles.streamContainer}>

                  {/* HERO BANNER (NO Customize button for student!) */}
                  <div style={{
                    ...styles.bannerCard,
                    background: bannerTheme.customImageUrl 
                      ? `url(${bannerTheme.customImageUrl}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${bannerTheme.primary}, ${bannerTheme.secondary})`,
                  }}>
                    {/* Vector Illustration Overlay */}
                    {!bannerTheme.customImageUrl && renderBannerIllustration()}

                    {/* Banner Content (Class Title & Subtitle) */}
                    <div style={styles.bannerInfo}>
                      <h1 style={styles.bannerTitle}>
                        {classroom?.name || "Classroom"}
                      </h1>
                      <div style={styles.bannerSubtitle}>
                        {classroom?.section || classroom?.subject || "Section 1"}
                      </div>
                    </div>

                    {/* Bottom-Right "(i)" Info Button */}
                    <button
                      onClick={() => setIsClassInfoModalOpen(true)}
                      style={styles.infoBtn}
                      title="Class details"
                    >
                      <Info size={20} color="#ffffff" />
                    </button>
                  </div>

                  {/* TWO-COLUMN STREAM BODY */}
                  <div style={styles.streamBodyGrid}>

                    {/* LEFT COLUMN: Strictly NO Class Code card, ONLY Upcoming Card */}
                    <div style={styles.streamLeftCol}>
                      {/* Upcoming Card */}
                      <div style={styles.streamSideCard}>
                        <span style={styles.sideCardLabel}>Upcoming</span>
                        <div style={{ marginTop: '12px' }}>
                          {upcomingItems.length === 0 ? (
                            <div style={styles.noWorkText}>Woohoo, no work due soon!</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {upcomingItems.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => {
                                    setActiveTab('classwork');
                                    setExpandedId(item.id);
                                  }}
                                  style={styles.upcomingItemRow}
                                >
                                  <span style={styles.upcomingItemDate}>Due {formatShortDate(item.dueDate)}</span>
                                  <span style={styles.upcomingItemTitle}>{item.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: '16px', textAlign: 'right' }}>
                          <span
                            onClick={() => setActiveTab('classwork')}
                            style={styles.viewAllLink}
                          >
                            View all
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Strictly NO Announcement Composer Box, Feed of Teacher's Posts & Assignments */}
                    <div style={styles.streamRightCol}>

                      {/* Feed of Announcements & Assignments */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Instructor Announcements (Read-only for student) */}
                        {announcements.map((post) => (
                          <div key={post.id} style={styles.streamFeedCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={styles.teacherAvatarSmall}>
                                {post.author ? post.author.charAt(0).toUpperCase() : 'I'}
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.92rem' }}>
                                  {post.author}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                  {formatShortDate(post.date)}
                                </div>
                              </div>
                            </div>
                            <p style={styles.announcementBodyText}>
                              {post.text}
                            </p>
                          </div>
                        ))}

                        {/* Posted Assignment Feed Items */}
                        {assignments.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setActiveTab('classwork');
                              setExpandedId(item.id);
                            }}
                            style={styles.assignmentStreamCard}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={styles.assignmentIconBadge}>
                                <ClipboardList size={22} color="#137333" />
                              </div>
                              <div>
                                <div style={styles.assignmentStreamTitle}>
                                  {classroom?.instructor || 'Instructor'} posted a new assignment: {item.title}
                                </div>
                                <div style={styles.assignmentStreamDate}>
                                  {formatShortDate(item.posted || item.id)}
                                </div>
                              </div>
                            </div>
                            {submittedTasks[item.id] && (
                              <span style={styles.turnedInBadge}>
                                <CheckCircle2 size={13} style={{ marginRight: '4px' }} />
                                Turned in
                              </span>
                            )}
                          </div>
                        ))}

                        {announcements.length === 0 && assignments.length === 0 && (
                          <div style={styles.emptyFeedBox}>
                            <p style={{ margin: 0, color: '#64748b' }}>
                              This is where you'll see announcements and classwork posted by your instructor.
                            </p>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* ═══ TAB 2: CLASSWORK ═══ */}
              {activeTab === 'classwork' && (
                <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                  <div style={styles.headerRow}>
                    <div>
                      <h2 style={{ color: '#1e293b', fontWeight: '700', fontSize: '1.4rem', margin: 0 }}>
                        {classroom ? classroom.name : "Classwork"}
                      </h2>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                        Access assignments, instructions, and learning activities for this class.
                      </p>
                    </div>
                  </div>

                  {/* List of Classwork */}
                  <div style={styles.list}>
                    {loadingAssignments ? (
                      Array.from({ length: 3 }).map((_, i) => <Skeleton.AssignmentRow key={i} />)
                    ) : assignments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                        <BookOpen size={48} color="#cbd5e1" style={{ margin: '0 auto 12px auto', display: 'block' }} />
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>No classwork assigned yet</p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>Check back later once your instructor assigns new activities.</p>
                      </div>
                    ) : (
                      assignments.map((item) => {
                        const isOpen = expandedId === item.id;
                        const due = formatShortDate(item.dueDate);
                        const posted = formatShortDate(item.posted || (typeof item.id === 'number' && item.id > 1e12 ? item.id : null));
                        const isSubmitted = submittedTasks[item.id];

                        return (
                          <div key={item.id} style={styles.itemWrapper}>
                            {/* Collapsed Pill */}
                            <div style={styles.itemHeader}>
                              <div
                                style={{
                                  ...styles.titlePill,
                                  backgroundColor: isOpen ? '#f1f5f9' : '#f8fafc',
                                  border: isOpen ? '1px solid #cbd5e1' : '1px solid #e2e8f0'
                                }}
                                onClick={() => setExpandedId(prev => (prev === item.id ? null : item.id))}
                              >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <ClipboardList size={18} color="#10b981" style={{ marginRight: '12px', flexShrink: 0 }} />
                                  <span>{item.title}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {isSubmitted && (
                                    <span style={styles.turnedInPill}>
                                      Turned in
                                    </span>
                                  )}
                                  {due && <span style={styles.itemDuePill}>Due {due}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Expanded Detail View */}
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  key="detail"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.22, ease: 'easeOut' }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <div style={styles.detailCard}>
                                    <div style={styles.detailHeaderBar}>
                                      <ClipboardList size={30} color="#475569" />
                                      <div>
                                        <div style={styles.detailTitle}>{item.title}</div>
                                        <div style={styles.detailDue}>
                                          {due ? `Due ${due}` : 'No Due Date'} • {item.points || 100} points
                                        </div>
                                      </div>
                                    </div>

                                    <div style={styles.detailBody}>
                                      <div style={styles.detailLeft}>
                                        {posted && <div style={styles.postedText}>Posted {posted}</div>}
                                        <p style={styles.detailInstruction}>{item.details || 'No instructions provided.'}</p>

                                        {item.attachments?.length > 0 && (
                                          <div style={styles.cardAttachments}>
                                            {item.attachments.map((att, i) => {
                                              if (att.type === 'image') {
                                                return (
                                                  <a key={i} href={att.url} target="_blank" rel="noreferrer">
                                                    <img src={att.url} alt={att.name} style={styles.attachThumb} />
                                                  </a>
                                                );
                                              }
                                              if (att.type === 'video') {
                                                return <video key={i} src={att.url} controls style={styles.attachVideo} />;
                                              }
                                              return (
                                                <a key={i} href={att.url} target="_blank" rel="noreferrer" style={styles.attachLink}>
                                                  <Link2 size={14} style={{ marginRight: '6px' }} /> {att.name}
                                                </a>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>

                                      {/* Status display for student */}
                                      <div style={styles.detailStudentStatusBox}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                                          Your Work
                                        </span>
                                        <span style={{
                                          fontSize: '0.95rem',
                                          fontWeight: '800',
                                          color: isSubmitted ? '#059669' : '#2563eb',
                                          marginTop: '4px'
                                        }}>
                                          {isSubmitted ? 'Turned in' : 'Assigned'}
                                        </span>
                                      </div>
                                    </div>

                                    <div style={styles.detailDivider} />

                                    {/* Student-only Footer actions (NO instructor grading, monitoring, modify or delete) */}
                                    <div style={styles.detailFooter}>
                                      <span
                                        style={styles.viewActivityLink}
                                        onClick={() => onOpenAssignment(item)}
                                      >
                                        View Activity Details
                                      </span>
                                      <button
                                        style={styles.startBtn}
                                        onClick={() => {
                                          if (onStartAssignment) {
                                            onStartAssignment(item);
                                          } else {
                                            onOpenAssignment(item);
                                          }
                                        }}
                                      >
                                        {isSubmitted ? 'View Work' : 'Start'}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ═══ TAB 3: PEOPLE ═══ */}
              {activeTab === 'people' && (
                <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%' }}>
                  {/* Teachers Section */}
                  <div style={{ marginBottom: '40px' }}>
                    <div style={styles.peopleSectionHeader}>
                      <h2 style={styles.peopleSectionTitle}>Teachers</h2>
                      <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>1 instructor</span>
                    </div>
                    <div style={styles.peopleList}>
                      <div style={styles.peopleRow}>
                        <div style={styles.peopleAvatarGreen}>
                          {(classroom?.instructor || 'I').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>
                            {classroom?.instructor || 'Instructor'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {classroom?.instructorEmail || 'instructor@verity.edu'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Classmates Section */}
                  <div>
                    <div style={styles.peopleSectionHeader}>
                      <h2 style={styles.peopleSectionTitle}>Classmates</h2>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                        {enrolledStudents.length} student{enrolledStudents.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div style={styles.peopleList}>
                      {loadingStudents ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading classmates…</div>
                      ) : enrolledStudents.length === 0 ? (
                        <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b' }}>
                          <Users size={40} color="#cbd5e1" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                          <p style={{ fontWeight: '600', margin: 0 }}>No classmates found</p>
                        </div>
                      ) : (
                        enrolledStudents.map((student, idx) => (
                          <div key={idx} style={styles.peopleRow}>
                            <div style={styles.peopleAvatarBlue}>
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.95rem' }}>
                                {student.name}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {student.email}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ═══ MODAL: CLASS INFO MODAL ═══ */}
      {isClassInfoModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsClassInfoModalOpen(false)}>
          <div style={styles.infoModalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
                Class Details
              </h3>
              <button
                onClick={() => setIsClassInfoModalOpen(false)}
                style={styles.closeBtn}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={styles.infoFieldLabel}>Subject / Course</label>
                <div style={styles.infoFieldValue}>{classroom?.subject || classroom?.name || 'General Studies'}</div>
              </div>
              <div>
                <label style={styles.infoFieldLabel}>Section</label>
                <div style={styles.infoFieldValue}>{classroom?.section || 'Section 1'}</div>
              </div>
              <div>
                <label style={styles.infoFieldLabel}>Instructor</label>
                <div style={styles.infoFieldValue}>{classroom?.instructor || 'Instructor'}</div>
              </div>
              <div>
                <label style={styles.infoFieldLabel}>Room / Campus</label>
                <div style={styles.infoFieldValue}>{classroom?.room || 'Online Virtual Lab'}</div>
              </div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsClassInfoModalOpen(false)}
                style={styles.infoCloseActionBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// STYLES matching TeacherClasswork design system
const styles = {
  container: { 
    height: '100vh', 
    minHeight: '100vh', 
    width: '100%', 
    display: 'flex', 
    flexDirection: 'column', 
    backgroundColor: '#EEF0F3', 
    fontFamily: 'Arial, Helvetica, sans-serif', 
    position: 'relative', 
    overflow: 'hidden' 
  },
  header: {
    height: '72px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    backgroundColor: '#EEF0F3',
    zIndex: 50
  },
  badge: { 
    fontSize: '0.7rem', 
    backgroundColor: '#EEF0F3', 
    color: '#475569', 
    padding: '3px 8px', 
    borderRadius: '10px', 
    marginLeft: '6px', 
    fontStyle: 'normal', 
    transform: 'translateY(-5px)', 
    border: '1px solid #cbd5e1' 
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
  sidebarBtnText: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  mainContent: {
    flex: 1,
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden'
  },
  bigBoxContainer: {
    backgroundColor: '#ffffff',
    flex: 1,
    borderRadius: '24px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0
  },
  classroomNavHeader: {
    height: '56px',
    padding: '0 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
    zIndex: 10
  },
  classroomTabsGroup: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    gap: '8px'
  },
  classroomTabBtn: {
    background: 'none',
    border: 'none',
    height: '100%',
    padding: '0 18px',
    fontSize: '0.94rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease, border-bottom 0.2s ease'
  },
  bigBoxInnerScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 28px 32px 28px'
  },
  streamContainer: {
    maxWidth: '960px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  bannerCard: {
    height: '240px',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '24px 28px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
  },
  bannerInfo: {
    position: 'relative',
    zIndex: 5
  },
  bannerTitle: {
    margin: 0,
    color: '#ffffff',
    fontSize: '2.4rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  bannerSubtitle: {
    margin: '4px 0 0 0',
    color: 'rgba(255,255,255,0.92)',
    fontSize: '1.25rem',
    fontWeight: '600',
    textShadow: '0 1px 3px rgba(0,0,0,0.2)'
  },
  infoBtn: {
    position: 'absolute',
    bottom: '18px',
    right: '20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    zIndex: 10,
    opacity: 0.85,
    transition: 'opacity 0.2s'
  },
  streamBodyGrid: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start'
  },
  streamLeftCol: {
    width: '210px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  streamRightCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  streamSideCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  sideCardLabel: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  noWorkText: {
    fontSize: '0.82rem',
    color: '#64748b'
  },
  upcomingItemRow: {
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer'
  },
  upcomingItemDate: {
    fontSize: '0.72rem',
    color: '#10b981',
    fontWeight: '700'
  },
  upcomingItemTitle: {
    fontSize: '0.82rem',
    color: '#1e293b',
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  viewAllLink: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#1a73e8',
    cursor: 'pointer'
  },
  streamFeedCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  teacherAvatarSmall: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    fontWeight: '800',
    flexShrink: 0
  },
  announcementBodyText: {
    margin: '12px 0 0 0',
    color: '#334155',
    fontSize: '0.92rem',
    lineHeight: 1.5
  },
  assignmentStreamCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  assignmentIconBadge: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#e6f4ea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  assignmentStreamTitle: {
    fontSize: '0.92rem',
    fontWeight: '700',
    color: '#1f2937'
  },
  assignmentStreamDate: {
    fontSize: '0.78rem',
    color: '#64748b',
    marginTop: '3px'
  },
  turnedInBadge: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '20px'
  },
  emptyFeedBox: {
    padding: '32px 20px',
    borderRadius: '12px',
    border: '1px dashed #cbd5e1',
    textAlign: 'center'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 0 20px 0',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '24px'
  },
  list: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '16px' 
  },
  itemWrapper: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '8px' 
  },
  itemHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  titlePill: { 
    width: '100%',
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: '12px 20px', 
    borderRadius: '12px', 
    color: '#1e293b', 
    fontWeight: '700', 
    cursor: 'pointer', 
    userSelect: 'none', 
    transition: 'all 0.15s' 
  },
  turnedInPill: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '6px'
  },
  itemDuePill: { 
    fontSize: '0.75rem', 
    color: '#64748b', 
    fontWeight: '600' 
  },
  detailCard: { 
    backgroundColor: 'white', 
    borderRadius: '16px', 
    padding: '0', 
    border: '1px solid #e2e8f0', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.04)', 
    overflow: 'hidden' 
  },
  detailHeaderBar: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '18px', 
    backgroundColor: '#f8fafc', 
    padding: '18px 24px', 
    borderRadius: '12px', 
    margin: '12px', 
    border: '1px solid #e2e8f0' 
  },
  detailTitle: { 
    fontSize: '1.25rem', 
    fontWeight: 'bold', 
    color: '#1e293b' 
  },
  detailDue: { 
    fontSize: '0.85rem', 
    color: '#64748b', 
    marginTop: '2px' 
  },
  detailBody: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    gap: '20px', 
    padding: '5px 28px 20px 28px' 
  },
  detailLeft: { 
    flex: 1 
  },
  postedText: { 
    fontSize: '0.8rem', 
    color: '#94a3b8', 
    marginBottom: '8px' 
  },
  detailInstruction: { 
    margin: 0, 
    color: '#334155', 
    fontSize: '0.98rem', 
    lineHeight: 1.5 
  },
  cardAttachments: { 
    display: 'flex', 
    flexWrap: 'wrap', 
    gap: '12px', 
    marginTop: '15px', 
    alignItems: 'flex-start' 
  },
  attachThumb: { 
    maxWidth: '140px', 
    maxHeight: '100px', 
    borderRadius: '8px', 
    objectFit: 'cover', 
    display: 'block' 
  },
  attachVideo: { 
    maxWidth: '220px', 
    maxHeight: '140px', 
    borderRadius: '8px', 
    backgroundColor: '#000' 
  },
  attachLink: { 
    display: 'inline-flex', 
    alignItems: 'center', 
    color: '#2563eb', 
    textDecoration: 'none', 
    fontSize: '0.88rem', 
    fontWeight: '600',
    wordBreak: 'break-all' 
  },
  detailStudentStatusBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px 18px',
    minWidth: '100px'
  },
  detailDivider: { 
    height: '1px', 
    backgroundColor: '#e2e8f0', 
    margin: '0 28px' 
  },
  detailFooter: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '16px 28px' 
  },
  viewActivityLink: { 
    color: '#1a73e8', 
    fontSize: '0.92rem', 
    cursor: 'pointer', 
    fontWeight: '700' 
  },
  startBtn: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px', 
    padding: '9px 28px', 
    backgroundColor: '#10b981', 
    border: 'none', 
    borderRadius: '50px', 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: '0.9rem', 
    cursor: 'pointer', 
    boxShadow: '0 4px 6px rgba(16,185,129,0.2)' 
  },
  peopleSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '2px solid #10b981',
    marginBottom: '16px'
  },
  peopleSectionTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#1e293b'
  },
  peopleList: {
    display: 'flex',
    flexDirection: 'column'
  },
  peopleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 14px',
    borderBottom: '1px solid #f1f5f9'
  },
  peopleAvatarGreen: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    fontWeight: '800'
  },
  peopleAvatarBlue: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    fontWeight: '800'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(3px)'
  },
  infoModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    width: '90%',
    maxWidth: '440px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
  },
  infoFieldLabel: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  infoFieldValue: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginTop: '3px'
  },
  infoCloseActionBtn: {
    padding: '8px 22px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    cursor: 'pointer'
  }
};