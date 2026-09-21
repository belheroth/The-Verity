import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Home, Calendar, ClipboardList, Settings, ArrowLeft, Activity, PlayCircle, Menu, Archive, Code2, X } from 'lucide-react';
import ProfileMenu from './ProfileMenu';
import { apiFetch } from '../utils/api';
import Skeleton from '../components/Skeleton';
import { useDarkMode } from '../hooks/useDarkMode';
import { useSidebarNav } from '../hooks/useSidebarNav';
import { isPhantomClassroom, mergeClassroomsPreservingOrder } from '../utils/classroomUtils';

/**
 * TeacherGrading — the Instructor "Feedback and Grading" view.
 * Opened from a classwork item's "View Activity". Lists the class's students
 * (sortable, with a separate "Graded" group) and lets the instructor pick a
 * grade and leave feedback per student.
 */

export default function TeacherGrading({ classroom, assignment, onBack, onLogout, onStartMonitoring, onOpenPlayback, onEnterClassroom, onNavigateView, socket, currentUser: propCurrentUser }) {
  const { isDark } = useDarkMode();
  const styles = getStyles(isDark);

  const currentUser = propCurrentUser || (() => {
    try { return JSON.parse(localStorage.getItem('verity_user')); } catch { return null; }
  })();

  const isPhantom = isPhantomClassroom;

  const [classrooms, setClassrooms] = useState(() => {
    try {
      const id = currentUser?.email || currentUser?.id || (currentUser?.name ? currentUser.name.toLowerCase().replace(/\s+/g, '_') : null);
      const key = id ? `verity_teacher_classrooms_${id}` : 'verity_teacher_classrooms_anon';
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(c => !isPhantomClassroom(c));
        }
      }
      return [];
    } catch { return []; }
  });

  useEffect(() => {
    apiFetch(`${import.meta.env.VITE_API_URL}/classrooms`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        const serverList = (Array.isArray(data) ? data : (data.classrooms || [])).filter(c => !isPhantomClassroom(c));
        const teacherClasses = serverList.filter(c => 
          (currentUser?.email && c.instructor_email && c.instructor_email.toLowerCase() === currentUser.email.toLowerCase()) || 
          (currentUser?.email && c.instructorEmail && c.instructorEmail.toLowerCase() === currentUser.email.toLowerCase()) || 
          (currentUser?.name && c.instructor && c.instructor.toLowerCase() === currentUser.name.toLowerCase()) ||
          (!c.instructor_email && !c.instructor)
        );
        setClassrooms(teacherClasses);
        try {
          const id = currentUser?.email || currentUser?.id || (currentUser?.name ? currentUser.name.toLowerCase().replace(/\s+/g, '_') : null);
          const key = id ? `verity_teacher_classrooms_${id}` : 'verity_teacher_classrooms_anon';
          localStorage.setItem(key, JSON.stringify(teacherClasses));
        } catch {}
      })
      .catch(() => {});
  }, [currentUser]);
  const { collapsed, toggleSidebar, sidebarProps, isPinned } = useSidebarNav();
  const navRefs = useRef({});
  const enrolledRefs = useRef({});
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

  useLayoutEffect(() => {
    const update = () => {
      let activeRef = null;
      if (typeof classroom !== 'undefined' && classroom) {
        activeRef = enrolledRefs.current['cls_' + classroom.id];
      }
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
  }, [classroom, collapsed, classrooms]);



  const maxPoints = parseInt(assignment?.points, 10) || 100;
  const gradesKey = `verity_grades_${assignment?.id ?? 'default'}`;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [sortBy, setSortBy] = useState('status');
  const [showCodePreview, setShowCodePreview] = useState(false);

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

  // Bulk grading state for all submitted students
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkGrade, setBulkGrade] = useState(String(maxPoints));
  const [bulkFeedback, setBulkFeedback] = useState('Great work!');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  const handleBulkGrade = async () => {
    if (students.length === 0) return;
    const updated = { ...grades };
    const payload = [];
    students.forEach(s => {
      updated[s.id] = { grade: bulkGrade, feedback: bulkFeedback, gradedAt: true };
      payload.push({ studentId: s.id, grade: bulkGrade, feedback: bulkFeedback });
    });
    setGrades(updated);
    localStorage.setItem(gradesKey, JSON.stringify(updated));

    if (assignment?.id) {
      try {
        await apiFetch(`${import.meta.env.VITE_API_URL}/grades/${assignment.id}/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grades: payload })
        });
      } catch {
        payload.forEach(p => {
          apiFetch(`${import.meta.env.VITE_API_URL}/grades/${assignment.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p)
          }).catch(() => {});
        });
      }
    }
    setBulkSuccessMsg(`Successfully graded all ${students.length} submitted student(s)!`);
    setTimeout(() => setBulkSuccessMsg(''), 3500);
    setShowBulkModal(false);
  };

  // Load ONLY students who have submitted this activity
  useEffect(() => {
    let cancelled = false;

    const loadSubmissions = () => {
      if (!assignment?.id) {
        setStudents([]);
        return;
      }

      apiFetch(`${import.meta.env.VITE_API_URL}/submissions/${assignment.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          const subs = Array.isArray(data?.submissions) ? data.submissions : [];

          // Also check localStorage for client-side saved submissions
          const localSubs = [];
          const cId = classroom?.id ?? 'default';
          const aId = assignment.id;
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith(`verity_sub_${cId}_${aId}_`) || key.startsWith(`verity_sub_default_${aId}_`))) {
                const val = JSON.parse(localStorage.getItem(key));
                if (val && (val.studentName || val.studentId)) {
                  localSubs.push(val);
                }
              }
            }
          } catch { }

          const studentMap = {};
          subs.forEach((s) => {
            const sName = s.student_name || s.studentName || 'Unknown';
            studentMap[sName] = {
              id: sName,
              name: sName,
              submittedAt: s.submittedAt || null,
              finalCode: s.finalCode || null,
              history: s.history || []
            };
          });

          localSubs.forEach((s) => {
            const sName = s.studentName || s.studentId || 'Unknown';
            if (!studentMap[sName]) {
              studentMap[sName] = {
                id: sName,
                name: sName,
                submittedAt: s.submittedAt || null,
                finalCode: s.finalCode || null,
                history: s.codeHistory || []
              };
            } else {
              if (s.finalCode && !studentMap[sName].finalCode) {
                studentMap[sName].finalCode = s.finalCode;
              }
              if (Array.isArray(s.codeHistory) && s.codeHistory.length > (studentMap[sName].history?.length || 0)) {
                studentMap[sName].history = s.codeHistory;
              }
            }
          });

          const list = Object.values(studentMap);
          setStudents(list);

          setSelectedId((prev) => {
            if (prev && studentMap[prev]) return prev;
            return list.length > 0 ? list[0].id : null;
          });
        })
        .catch(() => {
          // Fallback to localStorage
          const studentMap = {};
          const cId = classroom?.id ?? 'default';
          const aId = assignment?.id ?? 'default';
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith(`verity_sub_${cId}_${aId}_`) || key.startsWith(`verity_sub_default_${aId}_`))) {
                const val = JSON.parse(localStorage.getItem(key));
                if (val && (val.studentName || val.studentId)) {
                  const sName = val.studentName || val.studentId;
                  const hist = Array.isArray(val.codeHistory) ? val.codeHistory : [];
                  studentMap[sName] = {
                    id: sName,
                    name: sName,
                    submittedAt: val.submittedAt || null,
                    finalCode: val.finalCode || null,
                    history: hist
                  };
                }
              }
            }
          } catch { }

          const list = Object.values(studentMap);
          setStudents(list);
          setSelectedId((prev) => {
            if (prev && studentMap[prev]) return prev;
            return list.length > 0 ? list[0].id : null;
          });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    loadSubmissions();

    if (assignment?.id) {
      apiFetch(`${import.meta.env.VITE_API_URL}/grades/${assignment.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (data?.grades && Object.keys(data.grades).length > 0) {
            setGrades((prev) => ({ ...prev, ...data.grades }));
          }
        })
        .catch(() => {});
    }

    const onStorage = () => loadSubmissions();
    window.addEventListener('storage', onStorage);

    const onNewSubmission = () => loadSubmissions();

    // Instantly remove the student from state when they unsubmit, then re-fetch
    // to confirm. This ensures the Playback button disappears immediately without
    // waiting for a round-trip to the server.
    const onUnsubmit = (data) => {
      if (data?.studentName || data?.studentId) {
        const removedName = (data.studentName || data.studentId || '').toLowerCase();
        setStudents(prev => prev.filter(s => s.name.toLowerCase() !== removedName));
        setSelectedId(prev => {
          if ((prev || '').toLowerCase() === removedName) return null;
          return prev;
        });

        // Reset grade: remove from local state and localStorage
        setGrades(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            if (k.toLowerCase() === removedName) delete next[k];
          });
          return next;
        });

        // Purge their localStorage submission entry so it doesn't come back
        const cId = classroom?.id ?? 'default';
        const aId = assignment?.id ?? 'default';
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(`verity_sub_${cId}_${aId}_`) || key.startsWith(`verity_sub_default_${aId}_`))) {
              const val = JSON.parse(localStorage.getItem(key));
              const valName = (val?.studentName || val?.studentId || '').toLowerCase();
              if (valName === removedName) localStorage.removeItem(key);
            }
          }
        } catch { }

        // Delete grade from backend
        const aId2 = assignment?.id;
        const studentName = data.studentName || data.studentId;
        if (aId2 && studentName) {
          apiFetch(`${import.meta.env.VITE_API_URL}/grades/${aId2}/${encodeURIComponent(studentName)}`, { method: 'DELETE' }).catch(() => {});
        }
      }
      // Still refresh from server after a short delay to stay in sync
      setTimeout(loadSubmissions, 500);
    };

    if (socket) {
      socket.on('teacher_receive_submission', onNewSubmission);
      socket.on('teacher_student_unsubmitted', onUnsubmit);
      socket.on('student_unsubmitted', onUnsubmit);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
      if (socket) {
        socket.off('teacher_receive_submission', onNewSubmission);
        socket.off('teacher_student_unsubmitted', onUnsubmit);
        socket.off('student_unsubmitted', onUnsubmit);
      }
    };
  }, [assignment?.id, classroom?.id, socket]);

  useEffect(() => {
    localStorage.setItem(gradesKey, JSON.stringify(grades));
  }, [grades, gradesKey]);

  // When selected student changes, update grade & feedback form values
  useEffect(() => {
    if (selectedId) {
      const saved = grades[selectedId];
      setGrade(saved?.grade != null ? String(saved.grade) : String(maxPoints));
      setFeedback(saved?.feedback || '');
    } else {
      setGrade(String(maxPoints));
      setFeedback('');
    }
  }, [selectedId, grades, maxPoints]);

  const selectStudent = (id) => {
    setSelectedId(id);
  };

  const handleEvaluate = () => {
    if (!selectedId) return;
    setGrades((prev) => ({
      ...prev,
      [selectedId]: { grade, feedback, gradedAt: true },
    }));

    if (assignment?.id) {
      apiFetch(`${import.meta.env.VITE_API_URL}/grades/${assignment.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedId, grade, feedback })
      }).catch(() => {});
    }
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

  const StudentPill = ({ s }) => {
    const active = selectedId === s.id;
    return (
      <div
        onClick={() => selectStudent(s.id)}
        style={{ ...styles.studentPill, ...(active ? styles.studentPillActive : {}) }}
        title={s.name}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
          <span style={{ 
            fontSize: '0.75rem', 
            color: active ? '#ffffff' : (isGraded(s.id) ? (isDark ? '#34d399' : '#059669') : (isDark ? '#60a5fa' : '#0284c7')), 
            fontWeight: '700', 
            marginLeft: '8px', 
            flexShrink: 0 
          }}>
            {isGraded(s.id) ? `${grades[s.id]?.grade}/${maxPoints}` : 'Turned In'}
          </span>
        </div>
      </div>
    );
  };

  const selectedStudent = students.find((s) => s.id === selectedId);

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
              color: isDark ? '#E8EAED' : '#64748b',
              flexShrink: 0,
              marginRight: '16px'
            }}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
            className="icon-btn-anim"
          >
            <Menu size={24} color={isDark ? '#E8EAED' : '#64748b'} />
          </button>

          <div
            style={{ display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', cursor: 'pointer' }}
            onClick={() => {
              if (onNavigateView) onNavigateView('classrooms');
              else onBack();
            }}
          >
            <span style={{ color: '#10b981' }}>V</span>
            <span style={{ color: isDark ? '#E8EAED' : '#1e293b' }}>erity</span>
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
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '14px',
              boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.35)',
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
              <Home size={20} color={isDark ? '#a3a3a3' : '#475569'} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={styles.sidebarBtnText}>
                  Home
                </span>
              )}
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
              <Calendar size={20} color={isDark ? '#a3a3a3' : '#475569'} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={styles.sidebarBtnText}>
                  Calendar
                </span>
              )}
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
              <Archive size={20} color={isDark ? '#a3a3a3' : '#475569'} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={styles.sidebarBtnText}>
                  Archived
                </span>
              )}
            </button>

            {/* Teaching Section */}
            {classrooms.filter(c => !c.archived).length > 0 && (
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
                    Teaching
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
                      onClick={() => {
                        if (onEnterClassroom) onEnterClassroom(cls);
                        else onBack();
                      }}
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
                        <span style={{ fontSize: '0.85rem', fontWeight: active ? '700' : '600', color: active ? '#10b981' : (isDark ? '#E8EAED' : '#334155'), overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                onClick={() => {
                  if (onNavigateView) onNavigateView('settings');
                  else onBack();
                }}
                style={styles.sidebarBtn(collapsed)}
                title={collapsed ? 'Settings' : ''}
              >
                <Settings size={20} color={isDark ? '#a3a3a3' : '#475569'} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={styles.sidebarBtnText}>
                    Settings
                  </span>
                )}
              </button>
            </div>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <div style={styles.mainContent}>
          {/* Card Container */}
          <div style={styles.whiteCard}>
            {loading ? (
              <Skeleton.Grading />
            ) : (
              <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '0 0 20px 0',
              borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #e5e7eb',
              marginBottom: '20px'
            }}>
              <div>
                <h2 style={styles.classTitle}>{classTitle}</h2>
                {assignment?.title && <div style={styles.activitySub}>{assignment.title}</div>}
              </div>
            </div>

          <div style={styles.gradeLayout}>

            {/* LEFT: student roster */}
            <div style={styles.rosterCol}>
              <div style={styles.rosterHead}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '6px' }}>
                  <h3 style={styles.rosterTitle}>Submitted ({students.length})</h3>
                  {students.length > 0 && (
                    <button
                      onClick={() => setShowBulkModal(true)}
                      style={{
                        padding: '5px 12px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
                      }}
                      title="Grade all students who submitted"
                    >
                      Grade All
                    </button>
                  )}
                </div>
                {bulkSuccessMsg && (
                  <div style={{ padding: '6px 10px', backgroundColor: isDark ? '#064e3b' : '#ecfdf5', color: isDark ? '#34d399' : '#059669', fontSize: '0.75rem', borderRadius: '6px', marginBottom: '8px', fontWeight: '600' }}>
                    {bulkSuccessMsg}
                  </div>
                )}
                {students.length > 1 && (
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={styles.sortSelect}
                  >
                    <option value="status">Sort by Status</option>
                    <option value="name">Sort by Name</option>
                  </select>
                )}
              </div>

              <div style={styles.studentList}>
                {students.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: isDark ? '#a3a3a3' : '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No students have submitted this activity yet.
                  </div>
                ) : (
                  <>
                    {ungraded.length > 0 && ungraded.map((s) => <StudentPill key={s.id} s={s} />)}
                    {ungraded.length === 0 && graded.length > 0 && (
                      <span style={styles.gradedEmpty}>All submitted students evaluated!</span>
                    )}
                  </>
                )}
              </div>

              {students.length > 0 && graded.length > 0 && (
                <>
                  <div style={styles.gradedLabel}>Graded ({graded.length})</div>
                  <div style={styles.studentList}>
                    {graded.map((s) => <StudentPill key={s.id} s={s} />)}
                  </div>
                </>
              )}
            </div>

            {/* Divider */}
            <div style={styles.vDivider} />

            {/* RIGHT: grading controls */}
            <div style={styles.gradeCol}>
              {!selectedStudent && (
                <p style={styles.hint}>
                  {students.length === 0
                    ? "No student submissions yet for this activity."
                    : "Select a student to view their activity and grade."}
                </p>
              )}

              {selectedStudent && (
                <>
                  {/* Selected Student Header Info */}
                  <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: '700', fontSize: '1.2rem', color: isDark ? '#E8EAED' : '#1f2937' }}>
                      {selectedStudent.name}
                    </div>
                    {selectedStudent.submittedAt && (
                      <div style={{ fontSize: '0.85rem', color: isDark ? '#34d399' : '#059669', marginTop: '4px', fontWeight: '500' }}>
                        Turned in on {selectedStudent.submittedAt}
                      </div>
                    )}
                  </div>

                  {/* View Submitted Code */}
                  {selectedStudent.finalCode && (
                    <div style={styles.actionRow}>
                      <span style={styles.actionLabel}>Submitted Code</span>
                      <button
                        style={styles.actionBtn}
                        onClick={() => setShowCodePreview(true)}
                      >
                        <Code2 size={16} /> View Code
                      </button>
                    </div>
                  )}

                  {/* VCR Playback */}
                  <div style={styles.actionRow}>
                    <span style={styles.actionLabel}>Playback</span>
                    <button
                      style={styles.actionBtn}
                      onClick={() => {
                        const handler = onOpenPlayback || onStartMonitoring;
                        if (handler) handler(assignment, selectedStudent);
                      }}
                      title="View VCR playback of student's activity"
                    >
                      <PlayCircle size={16} /> Playback
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
              </>
            )}
        </div>
      </div>
    </div>

      {/* Code Preview Modal */}
      {showCodePreview && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={20} color="#10b981" />
                <h3 style={{ margin: 0, color: isDark ? '#E8EAED' : '#1e293b', fontSize: '1.1rem' }}>
                  {selectedStudent?.name}'s Submitted Code
                </h3>
              </div>
              <button
                onClick={() => setShowCodePreview(false)}
                style={styles.closeModalBtn}
              >
                <X size={20} />
              </button>
            </div>
            <pre style={styles.modalCodeBody}>
              {selectedStudent?.finalCode || "No code found."}
            </pre>
          </div>
        </div>
      )}

      {/* Bulk Grading Modal */}
      {showBulkModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '440px' }}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, color: isDark ? '#E8EAED' : '#1e293b', fontSize: '1.15rem' }}>Bulk Grade All Submitted</h3>
                <p style={{ margin: '4px 0 0 0', color: isDark ? '#a3a3a3' : '#64748b', fontSize: '0.82rem' }}>
                  Assign grades to all {students.length} students who turned in this activity.
                </p>
              </div>
              <button onClick={() => setShowBulkModal(false)} style={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={styles.fieldLabel}>Grade (out of {maxPoints}):</label>
                <select
                  value={bulkGrade}
                  onChange={(e) => setBulkGrade(e.target.value)}
                  style={{ ...styles.gradeSelect, width: '100%', marginTop: '6px' }}
                >
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>{g} / {maxPoints}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.fieldLabel}>Feedback for all submitted:</label>
                <textarea
                  value={bulkFeedback}
                  onChange={(e) => setBulkFeedback(e.target.value)}
                  style={{ ...styles.feedbackBox, height: '80px', marginTop: '6px' }}
                  placeholder="e.g. Great work on this assignment!"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: isDark ? '1px solid #4A4A4A' : '1px solid #cbd5e1', background: isDark ? '#3A3A3A' : 'white', color: isDark ? '#E8EAED' : '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkGrade}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 6px rgba(16,185,129,0.3)' }}
                >
                  Apply to All ({students.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
  </div>
  );
}

const getStyles = (isDark) => ({
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
  sidebarBtnText: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: isDark ? '#E8EAED' : '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
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
  mainContent: {
    flex: 1,
    padding: '14px 24px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden'
  },
  whiteCard: {
    backgroundColor: isDark ? '#323232' : '#ffffff',
    flex: 1,
    borderRadius: '24px',
    padding: 'clamp(20px, 4vw, 40px)',
    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.25)' : '0 10px 25px rgba(0,0,0,0.05)',
    border: isDark ? '1px solid #4A4A4A' : 'none',
    overflowY: 'auto',
    transition: 'background-color 0.25s ease'
  },
  classTitle: {
    color: isDark ? '#E8EAED' : '#1e293b',
    margin: 0,
    fontSize: '1.6rem',
    fontWeight: '700'
  },
  activitySub: {
    color: '#10b981',
    fontSize: '0.95rem',
    marginTop: '4px',
    marginBottom: '10px',
    fontWeight: '600'
  },
  gradeLayout: {
    display: 'flex',
    gap: '30px',
    marginTop: '20px',
    alignItems: 'stretch'
  },
  rosterCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  rosterHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '16px'
  },
  rosterTitle: {
    margin: 0,
    color: isDark ? '#E8EAED' : '#4b5563',
    fontSize: '1.15rem',
    fontWeight: '700'
  },
  sortSelect: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #d1d5db',
    backgroundColor: isDark ? '#383838' : '#f9fafb',
    color: isDark ? '#E8EAED' : '#4b5563',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  studentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  studentPill: {
    backgroundColor: isDark ? '#383838' : '#d1d5db',
    padding: '12px 20px',
    borderRadius: '50px',
    color: isDark ? '#E8EAED' : '#4b5563',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: isDark ? 'inset 1px 1px 3px rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2)' : 'inset 2px 2px 5px rgba(255,255,255,0.6), inset -2px -2px 5px rgba(0,0,0,0.08)',
    border: isDark ? '1px solid #4A4A4A' : 'none',
    userSelect: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease'
  },
  studentPillActive: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: '1px solid #10b981',
    boxShadow: isDark 
      ? '0 0 16px rgba(16, 185, 129, 0.42), 0 2px 6px rgba(0, 0, 0, 0.35)' 
      : '0 4px 12px rgba(16, 185, 129, 0.3), 0 1px 3px rgba(0, 0, 0, 0.04)'
  },
  gradedLabel: {
    color: isDark ? '#E8EAED' : '#6b7280',
    fontWeight: 'bold',
    margin: '22px 0 12px 0'
  },
  gradedEmpty: {
    color: isDark ? '#a3a3a3' : '#94a3af',
    fontSize: '0.85rem',
    fontStyle: 'italic'
  },
  vDivider: {
    width: '1px',
    backgroundColor: isDark ? '#4A4A4A' : '#e5e7eb'
  },
  gradeCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  hint: {
    color: isDark ? '#a3a3a3' : '#9ca3af',
    fontSize: '0.95rem'
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '15px'
  },
  actionLabel: {
    color: isDark ? '#E8EAED' : '#4b5563',
    fontWeight: 'bold',
    fontSize: '1rem'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    backgroundColor: isDark ? '#383838' : '#ffffff',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #d1d5db',
    borderRadius: '50px',
    color: isDark ? '#E8EAED' : '#4b5563',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: isDark 
      ? '0 0 10px rgba(255, 255, 255, 0.04), 0 2px 5px rgba(0,0,0,0.3)' 
      : '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1), filter 0.18s ease'
  },
  fieldLabel: {
    color: isDark ? '#E8EAED' : '#4b5563',
    fontWeight: 'bold',
    fontSize: '1rem',
    marginTop: '8px'
  },
  gradeSelect: {
    width: '120px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #d1d5db',
    backgroundColor: isDark ? '#383838' : '#f9fafb',
    color: isDark ? '#E8EAED' : '#4b5563',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  feedbackBox: {
    width: '100%',
    height: '120px',
    padding: '14px',
    borderRadius: '12px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #d1d5db',
    backgroundColor: isDark ? '#383838' : '#f9fafb',
    color: isDark ? '#E8EAED' : '#4b5563',
    fontSize: '0.95rem',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  evaluateRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '10px'
  },
  evaluateBtn: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: isDark 
      ? '0 0 16px rgba(16, 185, 129, 0.38), 0 2px 6px rgba(0, 0, 0, 0.35)' 
      : '0 2px 8px rgba(16, 185, 129, 0.25), 0 1px 2px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1), filter 0.18s ease'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
    backdropFilter: 'blur(3px)'
  },
  modalCard: {
    backgroundColor: isDark ? '#323232' : 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
    border: isDark ? '1px solid #4A4A4A' : 'none',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0'
  },
  closeModalBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: isDark ? '#a3a3a3' : '#64748b',
    display: 'flex',
    alignItems: 'center'
  },
  modalCodeBody: {
    flex: 1,
    margin: 0,
    padding: '20px',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    overflowY: 'auto',
    whiteSpace: 'pre-wrap'
  }
});
