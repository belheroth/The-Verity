import React, { useState, useEffect, useRef } from 'react';
import { Home, Calendar, ClipboardList, Settings, ArrowLeft, Activity, PlayCircle, Menu, Archive } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

/**
 * TeacherGrading — the Instructor "Feedback and Grading" view.
 * Opened from a classwork item's "View Activity". Lists the class's students
 * (sortable, with a separate "Graded" group) and lets the instructor pick a
 * grade and leave feedback per student.
 *
 * Still early development: "View Activity" / "View Replay" hand off to the live
 * monitoring flow when available; grades/feedback are saved locally only.
 */

const PLACEHOLDER_STUDENTS = [
  { id: 's1', name: 'Student One' },
  { id: 's2', name: 'Student Two' },
  { id: 's3', name: 'Student Three' },
  { id: 's4', name: 'Student Four' },
  { id: 's5', name: 'Student Five' },
];

export default function TeacherGrading({ classroom, assignment, onBack, onLogout, onStartMonitoring, onEnterClassroom }) {
  const [classrooms, setClassrooms] = useState(() => {
    try {
      const saved = localStorage.getItem('verity_teacher_classrooms');
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
        let activeRef = null;
        if (activeRef && activeRef.current) {
              const el = activeRef.current;
              setIndicatorStyle(prev => {
                  if (prev.top === el.offsetTop && prev.height === el.offsetHeight && prev.opacity === 1) return prev;
                  sessionStorage.setItem('verity_nav_top', el.offsetTop); return { top: el.offsetTop, height: el.offsetHeight, opacity: 1 };
              });
          } else {
              setIndicatorStyle(prev => {
                  if (prev.opacity === 0) return prev;
                  return { ...prev, opacity: 0 };
              });
          }
        
        let activeBotRef = null;
        if (typeof classroom !== 'undefined' && classroom) {
            activeBotRef = enrolledRefs.current['cls_' + classroom.id];
        } else if (typeof activeView !== 'undefined' && Number(localStorage.getItem('verity_active_classroom_id'))) {
            // Optional: If they want it in Dashboards too, we can track it based on localStorage, but Dashboards don't have an "active" classroom in UI.
            // But we can let it highlight if we want. Let's just track it if it matches.
            // Wait, we removed the localStorage highlight in Dashboard earlier. Let's just keep it null in Dashboard.
            activeBotRef = null; 
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
    }, 10);
    return () => clearTimeout(timer);
  });



  const maxPoints = parseInt(assignment?.points, 10) || 100;
  const gradesKey = `verity_grades_${assignment?.id ?? 'default'}`;

  const [students, setStudents] = useState(PLACEHOLDER_STUDENTS);
  const [selectedId, setSelectedId] = useState(null);
  const [sortBy, setSortBy] = useState('status');

  // Per-student grade + feedback, persisted locally.
  const [grades, setGrades] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(gradesKey)) || {};
    } catch {
      return {};
    }
  });

  const [grade, setGrade] = useState(String(maxPoints));
  const [feedback, setFeedback] = useState('');

// Load the real student roster from the backend; fall back to placeholders.
   useEffect(() => {
     let cancelled = false;
     fetch(`${import.meta.env.VITE_API_URL}/users`)
       .then((res) => res.json())
       .then((data) => {
         if (cancelled) return;
         const list = (data.users || [])
           .filter((u) => (u.role || '').toLowerCase() === 'student')
           .map((u) => ({ id: u.email || u.name, name: u.name || u.email }));
         if (list.length > 0) setStudents(list);
       })
       .catch(() => { /* offline — keep placeholders */ });
     return () => { cancelled = true; };
   }, []);

  useEffect(() => {
    localStorage.setItem(gradesKey, JSON.stringify(grades));
  }, [grades, gradesKey]);

  // When the selected student changes, load their saved grade/feedback.
  const selectStudent = (id) => {
    setSelectedId(id);
    const saved = grades[id];
    setGrade(saved?.grade != null ? String(saved.grade) : String(maxPoints));
    setFeedback(saved?.feedback || '');
  };

  const handleEvaluate = () => {
    if (!selectedId) return;
    setGrades((prev) => ({
      ...prev,
      [selectedId]: { grade, feedback, gradedAt: true },
    }));
  };

  const isGraded = (id) => !!grades[id]?.gradedAt;

  // Split into ungraded / graded, with optional name sort.
  const sorted = [...students].sort((a, b) =>
    sortBy === 'name' ? a.name.localeCompare(b.name) : 0
  );
  const ungraded = sorted.filter((s) => !isGraded(s.id));
  const graded = sorted.filter((s) => isGraded(s.id));

  const classTitle = classroom
    ? `${classroom.section ? classroom.section + ' ' : ''}${classroom.name || ''}`.trim()
    : 'Class';

  const gradeOptions = [];
  for (let g = maxPoints; g >= 0; g -= 5) gradeOptions.push(g);

  const StudentPill = ({ s }) => (
    <div
      onClick={() => selectStudent(s.id)}
      style={{ ...styles.studentPill, ...(selectedId === s.id ? styles.studentPillActive : {}) }}
      title={s.name}
    >
      {s.name}
    </div>
  );

  return (
    <div style={styles.container}>

      {/* LEFT SIDEBAR */}
      <div style={{ ...styles.sidebar, width: collapsed ? '110px' : '250px', padding: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', whiteSpace: 'nowrap', width: 'max-content', transform: collapsed ? 'translateX(13px)' : 'none', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <Menu size={24} color="#10b981" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={toggleSidebar} />
          <div style={styles.logoContainer}>
          <span style={styles.logoV}>V</span>
            <span style={styles.logoText}>erity</span>
          {!collapsed && <span style={styles.badge}>Instructor</span>}
        </div>
        </div>

        

        
          

                {/* Liquid sliding indicator */}
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
          
          
          <div ref={navRef_classrooms} style={{...styles.navItem, position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_teacher_view', 'classrooms'); onBack(); }}>
            <Home size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Home</span>}
          </div>
          <div ref={navRef_calendar} style={{...styles.navItem, position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_teacher_view', 'calendar'); onBack(); }}>
            <Calendar size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Calendar</span>}
          </div>
          <div ref={navRef_archived} style={{...styles.navItem, position: 'relative', zIndex: 1, padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_teacher_view', 'archived'); onBack(); }}>
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
                Teaching
              </div>
            )}
            {classrooms.filter(c => !c.archived).map((cls) => {
              const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
              const color = colors[cls.id % colors.length];
              
              return (
                <div 
                  key={cls.id} ref={el => enrolledRefs.current['cls_' + cls.id] = el}
                  style={{...styles.navItem, ...(classroom?.id === cls.id ? styles.activeNavItem : {}), justifyContent: collapsed ? 'center' : 'flex-start'}} 
                  onClick={() => { if (onEnterClassroom) onEnterClassroom(cls); }}
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
        
        

        <div style={{...styles.navItem, position: 'relative', zIndex: 1, marginTop: 'auto', padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={() => { localStorage.setItem('verity_teacher_view', 'settings'); onBack(); }}>
          <Settings size={24} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ marginLeft: '10px' }}>Settings</span>}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.mainContent}>

        {/* Top Bar */}
        <div style={styles.topBar}>
          <ProfileMenu onLogout={onLogout} />
        </div>

        {/* White card */}
        <div style={styles.whiteCard}>
          <h2 style={styles.classTitle}>{classTitle}</h2>
          {assignment?.title && <div style={styles.activitySub}>{assignment.title}</div>}

          <div style={styles.gradeLayout}>

            {/* LEFT: student roster */}
            <div style={styles.rosterCol}>
              <div style={styles.rosterHead}>
                <h3 style={styles.rosterTitle}>Students</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={styles.sortSelect}
                >
                  <option value="status">Sort by Status</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>

              <div style={styles.studentList}>
                {ungraded.map((s) => <StudentPill key={s.id} s={s} />)}
              </div>

              <div style={styles.gradedLabel}>Graded</div>
              <div style={styles.studentList}>
                {graded.length === 0 && (
                  <span style={styles.gradedEmpty}>No graded students yet.</span>
                )}
                {graded.map((s) => <StudentPill key={s.id} s={s} />)}
              </div>
            </div>

            {/* Divider */}
            <div style={styles.vDivider} />

            {/* RIGHT: grading controls */}
            <div style={styles.gradeCol}>
              {!selectedId && (
                <p style={styles.hint}>Select a student to view their activity and grade.</p>
              )}

              {selectedId && (
                <>
                  {/* View Activity */}
                  <div style={styles.actionRow}>
                    <span style={styles.actionLabel}>View Activity</span>
                    <button
                      style={styles.actionBtn}
                      onClick={() => onStartMonitoring && onStartMonitoring(assignment)}
                    >
                      <Activity size={16} /> Open
                    </button>
                  </div>

                  {/* View Replay */}
                  <div style={styles.actionRow}>
                    <span style={styles.actionLabel}>View Replay</span>
                    <button
                      style={styles.actionBtn}
                      onClick={() => onStartMonitoring && onStartMonitoring(assignment)}
                    >
                      <PlayCircle size={16} /> Open
                    </button>
                  </div>

                  {/* Grade */}
                  <label style={styles.fieldLabel}>Grade:</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    style={styles.gradeSelect}
                  >
                    {gradeOptions.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>

                  {/* Feedback */}
                  <label style={styles.fieldLabel}>Feedback:</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    style={styles.feedbackBox}
                    placeholder="Write feedback for this student…"
                  />

                  <div style={styles.evaluateRow}>
                    <button style={styles.evaluateBtn} onClick={handleEvaluate}>
                      Evaluate
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100%', width: '100%', display: 'flex', background: 'linear-gradient(to bottom, #f3f4f6 0%, #cbd5e1 100%)', fontFamily: 'sans-serif', position: 'relative' },

  // Sidebar (mirrors TeacherClasswork)
  sidebar: { width: '250px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 10, height: '100%', boxSizing: 'border-box', overflowX: 'hidden', position: 'relative', transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)'},
  logoContainer: { display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: 900, fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' },
  logoV: { color: '#10b981' },
  logoText: { color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)' },
  badge: {  fontSize: '0.7rem', backgroundColor: '#4b5563', color: 'white', padding: '3px 8px', borderRadius: '10px', marginLeft: '6px', fontStyle: 'normal', transform: 'translateY(-5px)' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '15px' },
  navItem: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '12px 20px', color: '#6b7280', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', borderRadius: '14px' , whiteSpace: 'nowrap' },
  activeNavItem: { color: '#10b981', fontWeight: '700' },
  settingsIcon: { color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' },

  // Main
  mainContent: { flex: 1, padding: 'clamp(20px, 4vw, 30px) clamp(15px, 5vw, 50px)', display: 'flex', flexDirection: 'column', zIndex: 1 },
  topBar: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' },
  whiteCard: { backgroundColor: 'white', flex: 1, borderRadius: '24px', padding: 'clamp(20px, 4vw, 40px)', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflowY: 'auto' },
  classTitle: { color: '#374151', margin: 0, fontSize: '1.6rem' },
  activitySub: { color: '#9ca3af', fontSize: '0.95rem', marginTop: '4px', marginBottom: '10px' },

  gradeLayout: { display: 'flex', gap: '30px', marginTop: '20px', alignItems: 'stretch' },

  // Roster
  rosterCol: { flex: 1, display: 'flex', flexDirection: 'column' },
  rosterHead: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '16px' },
  rosterTitle: { margin: 0, color: '#4b5563', fontSize: '1.15rem' },
  sortSelect: { padding: '6px 12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', color: '#4b5563', fontSize: '0.85rem', cursor: 'pointer' },
  studentList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  studentPill: { backgroundColor: '#d1d5db', padding: '12px 20px', borderRadius: '50px', color: '#4b5563', fontWeight: 'bold', cursor: 'pointer', boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.6), inset -2px -2px 5px rgba(0,0,0,0.08)', userSelect: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  studentPillActive: { backgroundColor: '#10b981', color: 'white', boxShadow: '0 4px 8px rgba(16,185,129,0.3)' },
  gradedLabel: { color: '#6b7280', fontWeight: 'bold', margin: '22px 0 12px 0' },
  gradedEmpty: { color: '#9ca3af', fontSize: '0.85rem' },

  // Divider
  vDivider: { width: '1px', backgroundColor: '#e5e7eb' },

  // Grade column
  gradeCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' },
  hint: { color: '#9ca3af', fontSize: '0.95rem' },
  actionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' },
  actionLabel: { color: '#4b5563', fontWeight: 'bold', fontSize: '1rem' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '50px', color: '#4b5563', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' },
  fieldLabel: { color: '#4b5563', fontWeight: 'bold', fontSize: '1rem', marginTop: '8px' },
  gradeSelect: { width: '120px', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', color: '#4b5563', fontSize: '1rem', cursor: 'pointer' },
  feedbackBox: { width: '100%', height: '120px', padding: '14px', borderRadius: '12px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', color: '#4b5563', fontSize: '0.95rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  evaluateRow: { display: 'flex', justifyContent: 'flex-end', marginTop: '10px' },
  evaluateBtn: { padding: '12px 40px', backgroundColor: '#10b981', border: 'none', borderRadius: '50px', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16,185,129,0.2)' },
};
