import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Home, Calendar, ClipboardList, Settings, ArrowLeft, Activity, PlayCircle, Menu, Archive, Code2, X } from 'lucide-react';
import ProfileMenu from './ProfileMenu';
import { apiFetch } from '../utils/api';

/**
 * TeacherGrading — the Instructor "Feedback and Grading" view.
 * Opened from a classwork item's "View Activity". Lists the class's students
 * (sortable, with a separate "Graded" group) and lets the instructor pick a
 * grade and leave feedback per student.
 *
 * Still early development: "View Activity" / "View Replay" hand off to the live
 * monitoring flow when available; grades/feedback are saved locally only.
 */

export default function TeacherGrading({ classroom, assignment, onBack, onLogout, onStartMonitoring, onOpenPlayback, onEnterClassroom, onNavigateView, socket }) {
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
  }, [classroom, collapsed]);



  const maxPoints = parseInt(assignment?.points, 10) || 100;
  const gradesKey = `verity_grades_${assignment?.id ?? 'default'}`;

  const [students, setStudents] = useState([]);
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

  const StudentPill = ({ s }) => (
    <div
      onClick={() => selectStudent(s.id)}
      style={{ ...styles.studentPill, ...(selectedId === s.id ? styles.studentPillActive : {}) }}
      title={s.name}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
        <span style={{ fontSize: '0.75rem', color: isGraded(s.id) ? '#059669' : '#0284c7', fontWeight: '600', marginLeft: '8px', flexShrink: 0 }}>
          {isGraded(s.id) ? `${grades[s.id]?.grade}/${maxPoints}` : 'Turned In'}
        </span>
      </div>
    </div>
  );

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
            <span style={styles.badge}>Instructor</span>
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
              style={{
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
              }}
              title={collapsed ? 'Home' : ''}
            >
              <Home size={20} color="#475569" style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
              style={{
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
              }}
              title={collapsed ? 'Calendar' : ''}
            >
              <Calendar size={20} color="#475569" style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
              style={{
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
              }}
              title={collapsed ? 'Archived' : ''}
            >
              <Archive size={20} color="#475569" style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Archived
                </span>
              )}
            </button>

            {/* Teaching Section */}
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
                      style={{
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
                      }}
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

            {/* Settings at Bottom */}
            <div style={{ marginTop: 'auto' }}>
              <button
                ref={el => navRefs.current['settings'] = el}
                onClick={() => {
                  if (onNavigateView) onNavigateView('settings');
                  else onBack();
                }}
                style={{
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
                }}
                title={collapsed ? 'Settings' : ''}
              >
                <Settings size={20} color="#475569" style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Settings
                  </span>
                )}
              </button>
            </div>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <div style={styles.mainContent}>
          {/* White card */}
          <div style={styles.whiteCard}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '0 0 20px 0',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '20px'
            }}>
              <div>
                <h2 style={{
                  color: '#4b5563',
                  fontWeight: '600',
                  fontSize: '1.5rem',
                  margin: 0
                }}>{classTitle}</h2>
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
                  <div style={{ padding: '6px 10px', backgroundColor: '#ecfdf5', color: '#059669', fontSize: '0.75rem', borderRadius: '6px', marginBottom: '8px', fontWeight: '600' }}>
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
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>
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
                  <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: '700', fontSize: '1.2rem', color: '#1f2937' }}>
                      {selectedStudent.name}
                    </div>
                    {selectedStudent.submittedAt && (
                      <div style={{ fontSize: '0.85rem', color: '#059669', marginTop: '4px', fontWeight: '500' }}>
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
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>
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
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.15rem' }}>Bulk Grade All Submitted</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
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
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
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

const styles = {
  container: { height: '100vh', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#EEF0F3', fontFamily: 'Arial, Helvetica, sans-serif', position: 'relative', overflow: 'hidden' },
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
  logoContainer: { fontSize: '2.5rem', fontWeight: 900, fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' },
  logoV: { color: '#10b981' },
  logoText: { color: 'white' },
  badge: { fontSize: '0.7rem', backgroundColor: '#EEF0F3', color: '#475569', padding: '3px 8px', borderRadius: '10px', marginLeft: '6px', fontStyle: 'normal', transform: 'translateY(-5px)', border: '1px solid #cbd5e1' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '15px' },
  navItem: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '12px 20px', color: '#6b7280', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', borderRadius: '14px', whiteSpace: 'nowrap' },
  activeNavItem: { color: '#10b981', fontWeight: '700' },
  settingsIcon: { color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  mainContent: { flex: 1, padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
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
  evaluateBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.15s ease' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' },
  modalCard: { backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' },
  closeModalBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' },
  modalCodeBody: { flex: 1, margin: 0, padding: '20px', backgroundColor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.5, overflowY: 'auto', whiteSpace: 'pre-wrap' }
};
