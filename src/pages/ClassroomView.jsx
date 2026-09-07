import React, { useState, useEffect, useRef } from 'react';
// IMPORTING PROFESSIONAL SVGS
import { Home, Calendar, ClipboardList, Settings, User, MoreVertical, Play, ArrowLeft, Menu, Archive } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

// Fallback shown only if the teacher hasn't created any classwork for this class yet.
const DEFAULT_ASSIGNMENTS = [
  { id: 1, title: "Activity 1: Hello World & Variables", details: "Write a C# program that declares a string variable for your name, an integer for your age, and prints them to the console.", dueDate: "Oct 15" },
  { id: 2, title: "Activity 2: Loops and Conditions", details: "Create a for-loop that counts from 1 to 50. Use an if-statement to only print the even numbers to the console.", dueDate: "Oct 20" }
];

export default function ClassroomView({ classroom, onBack, onOpenAssignment, socket, onEnterClassroom, onLogout }) {
  const [classrooms, setClassrooms] = useState(() => {
    try {
      const saved = localStorage.getItem('verity_student_classrooms');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('verity_sidebar_collapsed') === 'true');
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('verity_sidebar_collapsed', next);
  };

  const navRef_classrooms = useRef(null);
  const navRef_calendar = useRef(null);
  const navRef_archived = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });
  const [enrolledIndicator, setEnrolledIndicator] = useState({ top: Number(sessionStorage.getItem('verity_nav_top')) || 0, height: 40, opacity: 0 });
  const enrolledRefs = useRef({});

  useEffect(() => {
    const timer = setTimeout(() => {
        let activeBotRef = null;
        if (typeof classroom !== 'undefined' && classroom) {
            activeBotRef = enrolledRefs.current['cls_' + classroom.id];
        }
        
        if (activeBotRef) {
            const el = activeBotRef;
            setEnrolledIndicator(prev => {
                if (prev.top === el.offsetTop && prev.height === el.offsetHeight && prev.opacity === 1) return prev;
                sessionStorage.setItem('verity_nav_top', el.offsetTop); return { top: el.offsetTop, height: el.offsetHeight, opacity: 1 };
            });
        } else {
            setEnrolledIndicator(prev => {
                if (prev.opacity === 0) return prev;
                return { ...prev, opacity: 0 };
            });
        }

        setIndicatorStyle(prev => {
            if (prev.opacity === 0) return prev;
            return { ...prev, opacity: 0 };
        });
    }, 10);
    return () => clearTimeout(timer);
  });

  const [expandedId, setExpandedId] = useState(null);
  const [assignments, setAssignments] = useState([]);

  // Load the classwork the teacher created for THIS classroom. We prefer the
  // backend (so it syncs across machines) and fall back to this browser's
  // localStorage copy if the server can't be reached. The teacher saves under
  // the same classroom id, so the keys line up.
  useEffect(() => {
    const classroomId = classroom?.id ?? 'default';
    const storageKey = `verity_classwork_${classroomId}`;

    // `active` items only — students shouldn't see archived classwork.
    const applyList = (list) => {
      if (Array.isArray(list) && list.length > 0) {
        setAssignments(list.filter(item => !item.archived));
      } else {
        setAssignments(DEFAULT_ASSIGNMENTS);
      }
    };

    const loadFromLocal = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        applyList(saved ? JSON.parse(saved) : null);
      } catch {
        setAssignments(DEFAULT_ASSIGNMENTS);
      }
    };

// 1. Try the backend first.
     let cancelled = false;
     fetch(`${import.meta.env.VITE_API_URL}/classwork/${classroomId}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data.classwork) && data.classwork.length > 0) {
          applyList(data.classwork);
        } else {
          loadFromLocal();
        }
      })
      .catch(() => { if (!cancelled) loadFromLocal(); });

    // 2. Live updates: when the teacher saves, refresh instantly.
    const onClassworkChanged = (payload) => {
      if (String(payload.classroomId) === String(classroomId)) {
        applyList(payload.classwork);
      }
    };
    if (socket) socket.on('classwork_changed', onClassworkChanged);

    // 3. Same-browser updates from another tab.
    const onStorage = (e) => { if (e.key === storageKey) loadFromLocal(); };
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      if (socket) socket.off('classwork_changed', onClassworkChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [classroom, socket]);

  const toggleActivity = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div style={styles.container}>
      
      {/* LEFT SIDEBAR */}
      <div style={{ ...styles.sidebar, width: collapsed ? '110px' : '250px', padding: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', whiteSpace: 'nowrap', width: 'max-content', transform: collapsed ? 'translateX(13px)' : 'none', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <Menu size={24} color="#10b981" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={toggleSidebar} />
          <div style={styles.logoContainer}>
          <span style={styles.logoV}>V</span>
          <span style={styles.logoText}>erity</span>
        </div>
        </div>

        {/* Liquid sliding indicator for top nav */}
        <div style={{
          position: 'absolute',
          left: '30px',
          right: '30px',
          top: indicatorStyle.top,
          height: indicatorStyle.height,
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.35)',
          transition: 'top 0.6s cubic-bezier(0.5, 1.6, 0.2, 1), height 0.3s ease, opacity 0.2s ease',
          opacity: indicatorStyle.opacity,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        {/* Liquid sliding indicator for classrooms */}
        <div style={{
          position: 'absolute',
          left: '30px',
          right: '30px',
          top: enrolledIndicator.top,
          height: enrolledIndicator.height,
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.35)',
          transition: 'top 0.6s cubic-bezier(0.5, 1.6, 0.2, 1), height 0.3s ease, opacity 0.2s ease',
          opacity: enrolledIndicator.opacity,
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={styles.navGroup}>
          <div ref={navRef_classrooms} style={{...styles.navItem, position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_student_view', 'classrooms'); onBack(); }}>
            <Home size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Home</span>}
          </div>
          <div ref={navRef_calendar} style={{...styles.navItem, position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_student_view', 'calendar'); onBack(); }}>
            <Calendar size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Calendar</span>}
          </div>
          <div ref={navRef_archived} style={{...styles.navItem, position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_student_view', 'archived'); onBack(); }}>
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
            {classrooms.map((cls) => {
              const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
              const color = colors[cls.id % colors.length];
              
              return (
                <div 
                  key={cls.id} ref={el => enrolledRefs.current['cls_' + cls.id] = el}
                  style={{...styles.navItem, ...(classroom?.id === cls.id ? styles.activeNavItem : {}), padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}}
                  onClick={() => {
                     if (onEnterClassroom) onEnterClassroom(cls);
                  }}
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

        <div style={{...styles.navItem}} >
          <Settings size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Settings</span>}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={styles.mainContent}>
        
        {/* Top Bar */}
        <div style={styles.topBar}>
          <div style={styles.profileCircle}>
            <User size={24} color="#6b7280" />
          </div>
        </div>

        {/* The Main White Card */}
        <div style={styles.whiteCard}>
          <h2 style={{ color: '#4b5563', marginBottom: '20px', paddingLeft: '10px' }}>
            {classroom ? classroom.name : "Classroom Activities"}
          </h2>

          {/* List of Assignments */}
          <div style={styles.assignmentList}>
            {assignments.length === 0 && (
              <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>
                No activities yet. Check back once your instructor adds one.
              </p>
            )}
            {assignments.map((task) => {
              const isExpanded = expandedId === task.id;
              return (
                <div key={task.id} style={styles.assignmentWrapper}>

                  <div style={styles.assignmentHeader}>
                    <div style={styles.titlePill} onClick={() => toggleActivity(task.id)}>{task.title}</div>
                    <div style={styles.threeDots}><MoreVertical size={20} /></div>
                  </div>

                  {/* The "Details" Box — only shown when the activity is expanded */}
                  {isExpanded && (
                    <div style={styles.detailsBox}>
                      <p style={{ margin: 0, color: '#4b5563', lineHeight: '1.5' }}>{task.details}</p>

                      {task.attachments?.length > 0 && (
                        <div style={styles.cardAttachments}>
                          {task.attachments.map((att, i) => {
                            if (att.type === 'image') {
                              return <a key={i} href={att.url} target="_blank" rel="noreferrer"><img src={att.url} alt={att.name} style={styles.attachThumb} /></a>;
                            }
                            if (att.type === 'video') {
                              return <video key={i} src={att.url} controls style={styles.attachVideo} />;
                            }
                            return (
                              <a key={i} href={att.url} target="_blank" rel="noreferrer" style={styles.attachLink}>🔗 {att.name}</a>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 'bold' }}>{task.dueDate ? `Due: ${task.dueDate}` : 'No Due Date'}</span>
                        <button style={styles.startButton} onClick={() => onOpenAssignment(task)}>
                          Start Coding <Play size={14} fill="currentColor" style={{ marginLeft: '6px' }} />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

// STYLES matching prototype
const styles = {
  container: { height: '100%', display: 'flex', background: 'linear-gradient(to bottom, #f3f4f6 0%, #cbd5e1 100%)', fontFamily: 'sans-serif' },
  sidebar: { width: '250px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '40px' , zIndex: 10, transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)'},
  logoContainer: { fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' },
  logoV: { color: '#10b981' },
  logoText: { color: 'white' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '15px' },
  navItem: { display: 'flex', alignItems: 'center', padding: '12px 20px', color: '#6b7280', fontWeight: '600', cursor: 'pointer', transition: 'color 0.15s', borderRadius: '10px', background: 'transparent', boxShadow: 'none' , whiteSpace: 'nowrap' },
  activeNavItem: { color: '#10b981', fontWeight: '700', backgroundColor: 'transparent', boxShadow: 'none' },
  settingsIcon: { color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  mainContent: { flex: 1, padding: 'clamp(20px, 4vw, 30px) clamp(15px, 5vw, 50px)', display: 'flex', flexDirection: 'column' },
  topBar: { display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' },
  profileCircle: { width: '50px', height: '50px', backgroundColor: '#d1d5db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' },
  whiteCard: { backgroundColor: 'white', flex: 1, borderRadius: '24px', padding: 'clamp(20px, 4vw, 40px)', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflowY: 'auto' },
  assignmentList: { display: 'flex', flexDirection: 'column', gap: '30px' },
  assignmentWrapper: { display: 'flex', flexDirection: 'column', gap: '10px' },
  assignmentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titlePill: { backgroundColor: '#d1d5db', padding: '8px 20px', borderRadius: '50px', color: '#4b5563', fontWeight: 'bold', display: 'inline-block', cursor: 'pointer', userSelect: 'none' },
  threeDots: { color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  detailsBox: { backgroundColor: '#d1d5db', padding: '25px', borderRadius: '20px' },
  cardAttachments: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '15px', alignItems: 'flex-start' },
  attachThumb: { maxWidth: '140px', maxHeight: '100px', borderRadius: '8px', objectFit: 'cover', display: 'block' },
  attachVideo: { maxWidth: '220px', maxHeight: '140px', borderRadius: '8px', backgroundColor: '#000' },
  attachLink: { display: 'inline-flex', alignItems: 'center', color: '#2563eb', textDecoration: 'none', fontSize: '0.9rem', wordBreak: 'break-all' },
  startButton: { display: 'flex', alignItems: 'center', padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};