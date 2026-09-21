import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Home, Calendar, ClipboardList, Settings, Menu, Archive, ArrowLeft, CheckCircle2, Code2, ExternalLink, X, Link2 } from 'lucide-react';
import ProfileMenu from './ProfileMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../utils/api';
import { useDarkMode } from '../hooks/useDarkMode';
import { useSidebarNav } from '../hooks/useSidebarNav';
import Skeleton from '../components/Skeleton';
import ImagePreviewModal from '../components/ImagePreviewModal';
import VideoPreviewModal from '../components/VideoPreviewModal';
import VideoAttachment from '../components/VideoAttachment';
import AttachmentCard from '../components/AttachmentCard';

const getStorageKey = (user) => {
  const identifier = user?.email || user?.id || user?.name || 'default';
  return `verity_student_classrooms_${identifier}`;
};

export default function StudentActivityDetail({
  classroom,
  assignment,
  currentUser,
  socket,
  onBack,
  onNavigateView,
  onStartCoding,
  onEnterClassroom,
  onLogout
}) {
  const { isDark } = useDarkMode();
  const styles = getStyles(isDark);
  const safeUsername = currentUser?.name || currentUser?.email || 'Student';
  const studentId = currentUser?.email || currentUser?.name || 'student';
  const assignmentId = assignment?.id ?? 'default';
  const classroomId = classroom?.id ?? 'default';
  const [loading, setLoading] = useState(!assignment);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);

  useEffect(() => {
    if (!assignment) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [assignment]);

  // Local storage keys
  const submissionKey = `verity_sub_${classroomId}_${assignmentId}_${studentId}`;
  const gradesKey = `verity_grades_${assignmentId}`;
  const draftCodeKey = `verity_code_${assignmentId}_${studentId}`;

  // Submission state
  const [submission, setSubmission] = useState(() => {
    try {
      const saved = localStorage.getItem(submissionKey) ||
        (currentUser?.name ? localStorage.getItem(`verity_sub_${classroomId}_${assignmentId}_${currentUser.name}`) : null) ||
        (currentUser?.email ? localStorage.getItem(`verity_sub_${classroomId}_${assignmentId}_${currentUser.email}`) : null);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isSubmitted = !!submission;

  // Grade & Instructor Feedback state
  const [gradeData, setGradeData] = useState(() => {
    try {
      const saved = localStorage.getItem(gradesKey);
      const allGrades = saved ? JSON.parse(saved) : {};
      return allGrades[studentId] || allGrades[safeUsername] || null;
    } catch {
      return null;
    }
  });

  // Modal to preview submitted code
  const [showCodePreview, setShowCodePreview] = useState(false);

  // Sidebar & Layout state - only load the current student's enrolled classrooms
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

  const { collapsed, toggleSidebar, sidebarProps, isPinned } = useSidebarNav();

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

  // Sync submission & grade from backend
  useEffect(() => {
    let cancelled = false;

    const allKeys = [
      submissionKey,
      `verity_sub_${classroomId}_${assignmentId}_${studentId}`,
      `verity_sub_${classroomId}_${assignmentId}_${safeUsername}`,
      currentUser?.name ? `verity_sub_${classroomId}_${assignmentId}_${currentUser.name}` : null,
      currentUser?.email ? `verity_sub_${classroomId}_${assignmentId}_${currentUser.email}` : null
    ].filter(Boolean);

    // 1. Fetch submissions for this assignment to check if currently submitted
    apiFetch(`${import.meta.env.VITE_API_URL}/submissions/${assignmentId}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data?.submissions)) {
          const mySub = data.submissions.find(s => {
            const sName = (s.student_name || s.studentName || '').toLowerCase();
            const sId = (s.student_id || s.studentId || '').toLowerCase();
            const targetName = safeUsername.toLowerCase();
            const targetId = studentId.toLowerCase();
            return sName === targetName || sName === targetId || (sId && (sId === targetName || sId === targetId));
          });
          if (mySub) {
            setSubmission(mySub);
            localStorage.setItem(submissionKey, JSON.stringify(mySub));
          } else {
            setSubmission(null);
            allKeys.forEach(k => {
              try { localStorage.removeItem(k); } catch { }
            });
          }
        }
      })
      .catch(() => {});

    // 2. Fetch grades from backend
    apiFetch(`${import.meta.env.VITE_API_URL}/grades/${assignmentId}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data?.grades) {
          const myGrade = data.grades[studentId] || data.grades[safeUsername];
          if (myGrade) {
            setGradeData(myGrade);
          }
        }
      })
      .catch(() => {});

    // 3. Listen to live grading or submission updates
    const onStorageUpdate = () => {
      try {
        const saved = localStorage.getItem(submissionKey) ||
          (currentUser?.name ? localStorage.getItem(`verity_sub_${classroomId}_${assignmentId}_${currentUser.name}`) : null) ||
          (currentUser?.email ? localStorage.getItem(`verity_sub_${classroomId}_${assignmentId}_${currentUser.email}`) : null);
        setSubmission(saved ? JSON.parse(saved) : null);
      } catch { }

      try {
        const savedGrades = localStorage.getItem(gradesKey);
        const allGrades = savedGrades ? JSON.parse(savedGrades) : {};
        const myGrade = allGrades[studentId] || allGrades[safeUsername];
        if (myGrade) setGradeData(myGrade);
      } catch { /* ignore */ }
    };

    window.addEventListener('storage', onStorageUpdate);

    let handleSocketUnsub = null;
    if (socket) {
      handleSocketUnsub = (data) => {
        if (!data) return;
        const targetName = (safeUsername || '').toLowerCase();
        const targetId = (studentId || '').toLowerCase();
        const eventName = (data.studentName || '').toLowerCase();
        const eventId = (data.studentId || '').toLowerCase();

        if (eventName === targetName || eventName === targetId || eventId === targetName || eventId === targetId) {
          setSubmission(null);
          allKeys.forEach(k => {
            try { localStorage.removeItem(k); } catch { }
          });
        }
      };
      socket.on('student_unsubmitted', handleSocketUnsub);
      socket.on('teacher_student_unsubmitted', handleSocketUnsub);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorageUpdate);
      if (socket && handleSocketUnsub) {
        socket.off('student_unsubmitted', handleSocketUnsub);
        socket.off('teacher_student_unsubmitted', handleSocketUnsub);
      }
    };
  }, [assignmentId, classroomId, studentId, safeUsername, submissionKey, gradesKey, socket, currentUser]);

  // Handle Submit action
  const handleSubmit = () => {
    let currentCode = "";
    try {
      currentCode = localStorage.getItem(draftCodeKey) || "";
    } catch { /* ignore */ }

    if (!currentCode) {
      currentCode = assignment?.starterCode || "";
    }

    const subData = {
      studentName: safeUsername,
      studentId: studentId,
      assignmentId: assignmentId,
      classroomId: classroomId,
      finalCode: currentCode,
      submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const allKeys = [
      submissionKey,
      `verity_sub_${classroomId}_${assignmentId}_${studentId}`,
      `verity_sub_${classroomId}_${assignmentId}_${safeUsername}`,
      currentUser?.name ? `verity_sub_${classroomId}_${assignmentId}_${currentUser.name}` : null,
      currentUser?.email ? `verity_sub_${classroomId}_${assignmentId}_${currentUser.email}` : null
    ].filter(Boolean);
    allKeys.forEach(k => {
      try { localStorage.setItem(k, JSON.stringify(subData)); } catch { }
    });
    setSubmission(subData);

    if (socket) {
      socket.emit('submit_exam', {
        studentName: safeUsername,
        studentId: studentId,
        assignmentId: assignmentId,
        finalCode: currentCode,
        classroomId: classroomId,
        codeHistory: [{ time: Date.now(), code: currentCode }]
      });
    }
  };

  // Handle Unsubmit action
  const handleUnsubmit = () => {
    if (!window.confirm("Are you sure you want to unsubmit? You will be able to edit and re-submit your code.")) return;

    const keysToRemove = [
      submissionKey,
      `verity_sub_${classroomId}_${assignmentId}_${studentId}`,
      `verity_sub_${classroomId}_${assignmentId}_${safeUsername}`,
      currentUser?.name ? `verity_sub_${classroomId}_${assignmentId}_${currentUser.name}` : null,
      currentUser?.email ? `verity_sub_${classroomId}_${assignmentId}_${currentUser.email}` : null
    ].filter(Boolean);

    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch { }
    });
    setSubmission(null);

    // Call backend endpoint & socket
    apiFetch(`${import.meta.env.VITE_API_URL}/submissions/${assignmentId}/${encodeURIComponent(safeUsername)}`, {
      method: 'DELETE'
    }).catch(() => {});
    if (studentId && studentId !== safeUsername) {
      apiFetch(`${import.meta.env.VITE_API_URL}/submissions/${assignmentId}/${encodeURIComponent(studentId)}`, {
        method: 'DELETE'
      }).catch(() => {});
    }

    if (socket) {
      socket.emit('unsubmit_exam', {
        studentName: safeUsername,
        studentId: studentId,
        assignmentId: assignmentId,
        classroomId: classroomId
      });
    }
  };

  const pointsText = assignment?.points ? `${assignment.points} points` : '100 points';
  const dueDateText = assignment?.dueDate ? `Due : ${assignment.dueDate}` : 'No due date';
  const title = assignment?.title || "Activity Details";
  const details = assignment?.details || assignment?.description || "No instructions provided for this activity.";
  const displayScore = gradeData?.grade != null ? gradeData.grade : null;
  const feedbackText = gradeData?.feedback || (gradeData?.grade != null ? "No written feedback provided." : "No feedback yet. Your submission is pending instructor review.");

  return (
    <div style={styles.container}>
      {/* ═══ GLOBAL TOP HEADER ═══ */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={toggleSidebar}
            style={styles.menuButton}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            <Menu size={24} color={isDark ? "#a3a3a3" : "#64748b"} />
          </button>

          <div
            style={{ display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', cursor: 'pointer' }}
            onClick={() => {
              if (onNavigateView) onNavigateView('classrooms');
              else onBack();
            }}
          >
            <span style={{ color: '#10b981' }}>V</span>
            <span style={{ color: isDark ? '#f5f5f5' : '#1e293b' }}>erity</span>
            <span style={styles.badge}>Student</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ProfileMenu onLogout={onLogout} />
        </div>
      </header>

      {/* ═══ MAIN LAYOUT ═══ */}
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
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.35)',
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
              style={styles.navButton(collapsed)}
              title={collapsed ? 'Home' : ''}
            >
              <Home size={20} color={isDark ? "#a3a3a3" : "#475569"} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={styles.navLabel}>Home</span>
              )}
            </button>

            <button
              ref={el => navRefs.current['calendar'] = el}
              onClick={() => {
                if (onNavigateView) onNavigateView('calendar');
                else onBack();
              }}
              style={styles.navButton(collapsed)}
              title={collapsed ? 'Calendar' : ''}
            >
              <Calendar size={20} color={isDark ? "#a3a3a3" : "#475569"} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={styles.navLabel}>Calendar</span>
              )}
            </button>

            <button
              ref={el => navRefs.current['archived'] = el}
              onClick={() => {
                if (onNavigateView) onNavigateView('archived');
                else onBack();
              }}
              style={styles.navButton(collapsed)}
              title={collapsed ? 'Archived' : ''}
            >
              <Archive size={20} color={isDark ? "#a3a3a3" : "#475569"} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={styles.navLabel}>Archived</span>
              )}
            </button>

            {/* Enrolled Section */}
            {classrooms.filter(c => !c.archived).length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!collapsed && (
                  <div style={styles.enrolledHeading}>
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
                      onClick={() => {
                        if (onEnterClassroom) onEnterClassroom(cls);
                      }}
                      style={styles.navButton(collapsed)}
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
                style={styles.navButton(collapsed)}
                title={collapsed ? 'Settings' : ''}
              >
                <Settings size={20} color={isDark ? "#a3a3a3" : "#475569"} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={styles.navLabel}>Settings</span>
                )}
              </button>
            </div>
          </nav>
        </aside>

        {/* ═══ MAIN CONTENT AREA (PHOTO 1 / PHOTO 2) ═══ */}
        <div style={styles.mainContent}>
          <div style={styles.whiteCard}>
            {loading || !assignment ? (
              <Skeleton.ActivityDetail />
            ) : (
              <>
                {/* Top Back Navigation Row */}
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={onBack}
                    style={styles.backBtn}
                  >
                    <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back to Activities
                  </button>
                </div>

            {/* Activity Title Pill (matching wireframe grey pill) */}
            <div style={styles.titlePill}>
              {title}
            </div>

            {/* First Divider */}
            <div style={styles.divider} />

            {/* Points & Due Date (with Score in Photo 2) */}
            <div style={styles.metaRow}>
              <div>
                <div style={styles.pointsText}>{pointsText}</div>
                <div style={styles.dueText}>{dueDateText}</div>
              </div>

              {/* In Submitted State (Photo 2), show Score right-aligned */}
              {isSubmitted && (
                <div style={styles.scoreText}>
                  Score: {displayScore !== null ? displayScore : 'Pending'}
                </div>
              )}
            </div>

            {/* Second Divider */}
            <div style={styles.divider} />

            {/* ═══ STATE A: UNSUBMITTED (PHOTO 1) ═══ */}
            {!isSubmitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Large Rounded Grey Container for Activity Details */}
                <div style={styles.detailsBox}>
                  <p style={styles.instructionText}>
                    {details}
                  </p>

                  {/* Attachments if any */}
                  {assignment?.attachments?.length > 0 && (
                    <div style={styles.cardAttachments}>
                      {assignment.attachments.map((att, i) => (
                        <AttachmentCard
                          key={i}
                          att={att}
                          isDark={isDark}
                          onClick={(clickedAtt) => {
                            if (clickedAtt.type === 'image') setPreviewImage(clickedAtt);
                            else if (clickedAtt.type === 'video') setPreviewVideo(clickedAtt);
                            else if (clickedAtt.type === 'link' && clickedAtt.url) {
                              const targetUrl = clickedAtt.url.startsWith('http://') || clickedAtt.url.startsWith('https://')
                                ? clickedAtt.url
                                : `https://${clickedAtt.url}`;
                              window.open(targetUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons: Submit & Start (Photo 1) */}
                <div style={styles.buttonRow}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubmit}
                    style={styles.submitBtn}
                  >
                    Submit
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onStartCoding}
                    style={styles.startBtn}
                  >
                    Start
                  </motion.button>
                </div>
              </div>
            ) : (
              /* ═══ STATE B: SUBMITTED (PHOTO 2) ═══ */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Submission Container Pill / Rounded Box */}
                <div style={styles.submissionBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 size={22} color="#15803d" />
                    <div>
                      <span style={{ fontWeight: '700', color: isDark ? '#E8EAED' : '#1e293b', fontSize: '0.95rem' }}>
                        Main.cs • Code Submitted
                      </span>
                      <span style={{ fontSize: '0.8rem', color: isDark ? '#9AA0A6' : '#64748b', marginLeft: '10px' }}>
                        {submission?.submittedAt ? `Turned in on ${submission.submittedAt}` : 'Turned in'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCodePreview(true)}
                    style={styles.viewCodeBtn}
                  >
                    <Code2 size={15} style={{ marginRight: '5px' }} /> View Code
                  </button>
                </div>

                {/* Instructor Feedback Header */}
                <div style={styles.feedbackHeading}>
                  Instructor Feedback
                </div>

                {/* Instructor Feedback Container Box */}
                <div style={styles.feedbackBox}>
                  <p style={{ margin: 0, color: isDark ? '#E8EAED' : '#334155', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    {feedbackText}
                  </p>
                </div>

                {/* Bottom Action Button: Unsubmit (Photo 2) */}
                <div style={styles.buttonRow}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleUnsubmit}
                    style={styles.unsubmitBtn}
                  >
                    Unsubmit
                  </motion.button>
                </div>
              </div>
            )}
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
                <h3 style={{ margin: 0, color: isDark ? '#E8EAED' : '#1e293b', fontSize: '1.1rem' }}>Submitted C# Code</h3>
              </div>
              <button
                onClick={() => setShowCodePreview(false)}
                style={styles.closeModalBtn}
              >
                <X size={20} />
              </button>
            </div>
            <pre style={styles.modalCodeBody}>
              {submission?.finalCode || "No code found."}
            </pre>
          </div>
        </div>
      )}

      {previewImage && (
        <ImagePreviewModal
          src={previewImage.url}
          alt={previewImage.name}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {previewVideo && (
        <VideoPreviewModal
          src={previewVideo.url}
          name={previewVideo.name}
          onClose={() => setPreviewVideo(null)}
        />
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
    color: isDark ? '#E8EAED' : 'inherit',
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
    backgroundColor: isDark ? '#3C3C3C' : '#EEF0F3',
    borderBottom: 'none',
    zIndex: 50
  },
  menuButton: {
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
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'baseline',
    fontSize: '2.5rem',
    fontWeight: '900',
    fontStyle: 'italic',
    cursor: 'pointer'
  },
  badge: { 
    fontSize: '0.7rem', 
    backgroundColor: isDark ? '#2c2f38' : '#EEF0F3', 
    color: isDark ? '#E8EAED' : '#475569', 
    padding: '3px 8px', 
    borderRadius: '10px', 
    marginLeft: '6px', 
    fontStyle: 'normal', 
    transform: 'translateY(-5px)', 
    border: isDark ? '1px solid #3d424f' : '1px solid #cbd5e1' 
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
  navButton: (collapsed) => ({
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
  navLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: isDark ? '#E8EAED' : '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  enrolledHeading: {
    padding: '0 18px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: isDark ? '#10b981' : '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px'
  },
  mainContent: {
    flex: 1,
    padding: '16px 28px 24px',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflowY: 'auto'
  },
  whiteCard: {
    backgroundColor: isDark ? '#323232' : 'white',
    flex: 1,
    borderRadius: '28px',
    padding: '32px 48px 40px',
    boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.25)' : '0 10px 30px rgba(0, 0, 0, 0.04)',
    border: isDark ? '1px solid #4A4A4A' : 'none',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: isDark ? '#E8EAED' : '#64748b',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px 0',
    transition: 'color 0.15s'
  },
  titlePill: {
    backgroundColor: isDark ? '#3E3E3E' : '#bcbfc5',
    color: isDark ? '#E8EAED' : '#334155',
    border: isDark ? '1px solid #4E4E4E' : 'none',
    fontWeight: '700',
    fontSize: '1rem',
    padding: '10px 28px',
    borderRadius: '50px',
    display: 'inline-block',
    alignSelf: 'flex-start',
    letterSpacing: '0.01em',
    maxWidth: '85%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  divider: {
    height: '1px',
    backgroundColor: isDark ? '#4A4A4A' : '#cbd5e1',
    margin: '18px 0',
    width: '100%'
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px'
  },
  pointsText: {
    fontSize: '0.92rem',
    color: isDark ? '#E8EAED' : '#1e293b',
    fontWeight: '700'
  },
  dueText: {
    fontSize: '0.88rem',
    color: isDark ? '#9AA0A6' : '#475569',
    fontWeight: '500'
  },
  scoreText: {
    fontSize: '0.95rem',
    color: isDark ? '#E8EAED' : '#1e293b',
    fontWeight: '700',
    letterSpacing: '0.01em'
  },
  detailsBox: {
    backgroundColor: isDark ? '#282828' : '#c4c8cd',
    border: isDark ? '1px solid #3E3E3E' : 'none',
    borderRadius: '24px',
    padding: '28px 32px',
    minHeight: '220px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start'
  },
  instructionText: {
    margin: 0,
    color: isDark ? '#E8EAED' : '#1f2937',
    fontSize: '1rem',
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap'
  },
  cardAttachments: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '12px',
    marginTop: '20px',
    width: '100%'
  },
  attachThumb: {
    maxWidth: '240px',
    maxHeight: '160px',
    borderRadius: '8px',
    objectFit: 'cover',
    display: 'block',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0'
  },
  attachVideo: {
    maxWidth: '380px',
    maxHeight: '220px',
    width: '100%',
    borderRadius: '8px',
    backgroundColor: '#000'
  },
  attachLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: isDark ? '#34d399' : '#059669',
    backgroundColor: isDark ? '#3A3A3A' : '#f8fafc',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 14px',
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: '500',
    maxWidth: '100%',
    wordBreak: 'break-all',
    boxSizing: 'border-box'
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '24px',
    marginTop: '36px'
  },
  submitBtn: {
    backgroundColor: isDark ? '#2a2d36' : '#374151',
    color: '#ffffff',
    border: isDark ? '1px solid #3c404d' : 'none',
    borderRadius: '50px',
    padding: '12px 46px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: isDark 
      ? '0 0 12px rgba(255, 255, 255, 0.06), 0 2px 6px rgba(0, 0, 0, 0.35)' 
      : '0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.04)',
    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease'
  },
  startBtn: {
    backgroundColor: '#15803d',
    color: '#ffffff',
    border: 'none',
    borderRadius: '50px',
    padding: '12px 46px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: isDark 
      ? '0 0 18px rgba(21, 128, 61, 0.45), 0 2px 6px rgba(0, 0, 0, 0.35)' 
      : '0 4px 12px rgba(21, 128, 61, 0.28), 0 1px 2px rgba(0, 0, 0, 0.06)',
    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease'
  },
  submissionBox: {
    backgroundColor: isDark ? '#15171c' : '#c4c8cd',
    border: isDark ? '1px solid #262932' : 'none',
    borderRadius: '24px',
    padding: '18px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: '48px'
  },
  viewCodeBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: isDark ? '#262932' : 'rgba(255,255,255,0.9)',
    color: isDark ? '#E8EAED' : '#1e293b',
    border: isDark ? '1px solid #3c404d' : '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: isDark 
      ? '0 0 10px rgba(255, 255, 255, 0.04), 0 1px 4px rgba(0, 0, 0, 0.3)' 
      : '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.03)',
    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  feedbackHeading: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: isDark ? '#E8EAED' : '#1e293b',
    marginTop: '22px',
    marginBottom: '10px',
    paddingLeft: '4px'
  },
  feedbackBox: {
    backgroundColor: isDark ? '#282828' : '#c4c8cd',
    border: isDark ? '1px solid #3E3E3E' : 'none',
    borderRadius: '24px',
    padding: '22px 28px',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center'
  },
  unsubmitBtn: {
    backgroundColor: isDark ? '#4A4A4A' : '#374151',
    color: '#ffffff',
    border: isDark ? '1px solid #5A5A5A' : 'none',
    borderRadius: '50px',
    padding: '12px 52px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: isDark 
      ? '0 0 12px rgba(255, 255, 255, 0.06), 0 2px 6px rgba(0, 0, 0, 0.35)' 
      : '0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.04)',
    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  modalCard: {
    backgroundColor: isDark ? '#323232' : '#ffffff',
    border: isDark ? '1px solid #4A4A4A' : 'none',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '750px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px rgba(0,0,0,0.2)',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    margin: 0,
    padding: '20px',
    backgroundColor: isDark ? '#141414' : '#1e1e1e',
    color: '#d4d4d4',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    overflowY: 'auto',
    flex: 1
  }
});
