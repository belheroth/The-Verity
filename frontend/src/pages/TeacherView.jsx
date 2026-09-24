import React, { useState, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Home, ArrowLeft, Maximize2, Play, Pause } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeacherView({ socket, assignment, classroom, initialStudent, onBack, onLogout, mode = 'live' }) {
  const [students, setStudents] = useState(() => {
    if (initialStudent && (initialStudent.id || initialStudent.name)) {
      const sId = initialStudent.id || initialStudent.name;
      const hist = Array.isArray(initialStudent.history) && initialStudent.history.length > 0
        ? initialStudent.history
        : (Array.isArray(initialStudent.codeHistory) && initialStudent.codeHistory.length > 0
          ? initialStudent.codeHistory
          : (initialStudent.finalCode ? [{ time: Date.now(), code: initialStudent.finalCode }] : []));
      return {
        [sId]: {
          id: sId,
          name: initialStudent.name || sId,
          status: 'Submitted',
          code: initialStudent.finalCode || initialStudent.code || (hist.length > 0 ? hist[hist.length - 1]?.code : '') || '',
          codeHistory: hist,
          logs: initialStudent.logs || []
        }
      };
    }
    return {};
  });

  const [selectedStudentId, setSelectedStudentId] = useState(() => {
    return initialStudent?.id || initialStudent?.name || null;
  });
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [evalOutput, setEvalOutput] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0); // smooth float 0..(history.length-1)
  const playTimerRef = useRef(null);
  const animFrameRef = useRef(null);
  // Records { fromIndex, toIndex, startAt, endAt } for smooth rAF interpolation between steps
  const stepTimingRef = useRef(null);

  const [notifSettings, setNotifSettings] = useState({
    soundAlerts: true,
    notifyOnSubmission: true,
    showToastWarnings: true,
  });
  const notifSettingsRef = useRef(notifSettings);
  useEffect(() => { notifSettingsRef.current = notifSettings; }, [notifSettings]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let isMounted = true;
    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/system-settings`)
      .then(res => res.ok ? res.json() : {})
      .then(d => {
        if (!isMounted) return;
        if (d.settings?.notifications) {
          setNotifSettings(d.settings.notifications);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Load submissions from backend and localStorage so submitted students and their VCR history are ready
  useEffect(() => {
    if (!assignment?.id) return;

    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/submissions/${assignment.id}`)
      .then((res) => res.json())
      .then((data) => {
        const subs = Array.isArray(data?.submissions) ? data.submissions : [];
        setStudents((prev) => {
          const next = { ...prev };
          subs.forEach((s) => {
            const sName = s.student_name || s.studentName || 'Unknown';
            const hist = Array.isArray(s.history) ? s.history : [];
            const finalCode = s.finalCode || (hist.length > 0 ? hist[hist.length - 1]?.code : '') || '';
            const existing = next[sName] || {};
            const combinedHist = hist.length > 0 ? hist : (existing.codeHistory || [{ time: Date.now(), code: finalCode }]);
            next[sName] = {
              ...existing,
              id: sName,
              name: sName,
              status: 'Submitted',
              code: finalCode || existing.code || '',
              codeHistory: combinedHist,
              logs: existing.logs || []
            };
          });
          return next;
        });
      })
      .catch(() => { });

    try {
      const cId = classroom?.id ?? 'default';
      const aId = assignment.id;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(`verity_sub_${cId}_${aId}_`) || key.startsWith(`verity_sub_default_${aId}_`))) {
          const val = JSON.parse(localStorage.getItem(key));
          if (val && (val.studentName || val.studentId)) {
            const sName = val.studentName || val.studentId;
            const hist = Array.isArray(val.codeHistory) && val.codeHistory.length > 0 ? val.codeHistory : [{ time: Date.now(), code: val.finalCode || '' }];
            setStudents((prev) => {
              const existing = prev[sName] || {};
              const longerHist = (val.codeHistory && val.codeHistory.length > (existing.codeHistory?.length || 0))
                ? val.codeHistory
                : (existing.codeHistory || hist);
              return {
                ...prev,
                [sName]: {
                  ...existing,
                  id: sName,
                  name: sName,
                  status: 'Submitted',
                  code: val.finalCode || existing.code || (longerHist.length > 0 ? longerHist[longerHist.length - 1]?.code : ''),
                  codeHistory: longerHist,
                  logs: existing.logs || []
                }
              };
            });
          }
        }
      }
    } catch { }
  }, [assignment?.id, classroom?.id]);

  // Sync initialStudent prop
  useEffect(() => {
    if (initialStudent && (initialStudent.id || initialStudent.name)) {
      const sId = initialStudent.id || initialStudent.name;
      setSelectedStudentId(sId);
      const hist = Array.isArray(initialStudent.history) && initialStudent.history.length > 0
        ? initialStudent.history
        : (Array.isArray(initialStudent.codeHistory) && initialStudent.codeHistory.length > 0
          ? initialStudent.codeHistory
          : (initialStudent.finalCode ? [{ time: Date.now(), code: initialStudent.finalCode }] : []));
      setStudents((prev) => ({
        ...prev,
        [sId]: {
          ...(prev[sId] || {}),
          id: sId,
          name: initialStudent.name || sId,
          status: 'Submitted',
          code: initialStudent.finalCode || initialStudent.code || (hist.length > 0 ? hist[hist.length - 1]?.code : '') || '',
          codeHistory: hist.length > 0 ? hist : (prev[sId]?.codeHistory || [{ time: Date.now(), code: initialStudent.finalCode || '' }]),
          logs: initialStudent.logs || prev[sId]?.logs || []
        }
      }));
    }
  }, [initialStudent]);

  useEffect(() => {
    if (!selectedStudentId && Object.keys(students).length > 0) {
      setSelectedStudentId(Object.keys(students)[0]);
    }
  }, [students, selectedStudentId]);

  // The instruction comes from the assignment the teacher created (its "details").
  const assignmentInstruction = assignment?.details || "";

  useEffect(() => {
    setPlaybackIndex(-1);
    setIsPlaying(false);
    setEvalOutput("");
  }, [selectedStudentId]);

  // Push the assignment's instruction to students automatically when monitoring starts.
  useEffect(() => {
    if (assignmentInstruction) {
      socket.emit('set_instruction', assignmentInstruction);
    }
  }, [socket, assignmentInstruction]);

  useEffect(() => {
    if (mode === 'live') {
      // Ask the server for the current roster for THIS classroom/assignment
      // so students who joined BEFORE this view opened show up immediately.
      socket.emit('teacher_join', {
        classroomId: classroom?.id,
        assignmentId: assignment?.id
      });
    }

    // Helper to auto-select a student if they are the first one to connect
    const checkSelection = (id) => {
      setSelectedStudentId(prev => prev ? prev : id);
    };

    if (mode === 'live') {
      socket.on('teacher_update_code', (data) => {
        setStudents(prev => {
          const existing = prev[data.studentId] || { id: data.studentId, name: data.name, code: "", logs: [], status: "Live" };
          return { ...prev, [data.studentId]: { ...existing, code: data.code } };
        });
        checkSelection(data.studentId);
      });

      socket.on('teacher_receive_alert', (data) => {
        setStudents(prev => {
          const existing = prev[data.studentId] || { id: data.studentId, name: data.name || data.studentId, code: "", logs: [], status: "Live" };
          const newLog = { id: Date.now(), action: data.action, time: data.time, color: data.color };
          return { ...prev, [data.studentId]: { ...existing, logs: [newLog, ...existing.logs] } };
        });
        checkSelection(data.studentId);
        
        // Notifications & Alerts Logic
        if (notifSettingsRef.current.soundAlerts) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch (e) {}
        }
        
        if (notifSettingsRef.current.showToastWarnings) {
          setToast({ message: `Warning: ${data.name || data.studentId} - ${data.action}`, type: 'warning' });
          setTimeout(() => setToast(null), 3500);
        }
      });

      socket.on('teacher_terminal_update', (data) => {
        setStudents(prev => {
          const existing = prev[data.studentId] || { id: data.studentId, name: data.studentId, code: "", logs: [], status: "Live" };
          return { ...prev, [data.studentId]: { ...existing, terminal: data.output } };
        });
        checkSelection(data.studentId);
      });

      // A student disconnected — remove them from the roster.
      socket.on('teacher_student_left', ({ studentId }) => {
        setStudents(prev => {
          if (!prev[studentId]) return prev;
          const next = { ...prev };
          delete next[studentId];
          return next;
        });
        setSelectedStudentId(prev => (prev === studentId ? null : prev));
      });
    }

    // Always listen for submissions
    socket.on('teacher_receive_submission', (data) => {
      setStudents(prev => {
        if (mode === 'live') {
          const next = { ...prev };
          if (data.studentName) delete next[data.studentName];
          if (data.studentId) delete next[data.studentId];
          return next;
        }
        const existing = prev[data.studentName] || prev[data.studentId];
        if (!existing) return prev;
        return {
          ...prev,
          [data.studentName]: { ...existing, status: "Submitted", code: data.finalCode || data.code, codeHistory: data.codeHistory }
        };
      });
      if (mode === 'live') {
        setSelectedStudentId(prev => (prev === data.studentName || prev === data.studentId ? null : prev));
      }
      
      if (notifSettingsRef.current.notifyOnSubmission) {
        setToast({ message: `${data.studentName || data.studentId || 'A student'} submitted their exam.`, type: 'success' });
        setTimeout(() => setToast(null), 3500);
      }
    });

    return () => {
      if (mode === 'live') {
        socket.off('teacher_update_code');
        socket.off('teacher_receive_alert');
        socket.off('teacher_terminal_update');
        socket.off('teacher_student_left');
      }
      socket.off('teacher_receive_submission');
    };
  }, [socket, mode, classroom?.id, assignment?.id]);

  // Output from "Evaluate" (running the submitted code) comes back on this socket.
  useEffect(() => {
    const onOut = (chunk) => setEvalOutput(prev => prev + chunk);
    const onExit = () => setEvaluating(false);
    socket.on('terminal_output', onOut);
    socket.on('process_exit', onExit);
    return () => {
      socket.off('terminal_output', onOut);
      socket.off('process_exit', onExit);
    };
  }, [socket]);

  const activeStudent = students[selectedStudentId] || { name: "Waiting for students...", code: "// No student selected", logs: [] };

  const allLogs = useMemo(() => {
    const logs = [];
    Object.values(students).forEach(student => {
      if (Array.isArray(student.logs)) {
        student.logs.forEach(log => {
          logs.push({ ...log, studentName: student.name });
        });
      }
    });
    // Sort descending by ID (which is a timestamp)
    return logs.sort((a, b) => b.id - a.id);
  }, [students]);

  const history = activeStudent.codeHistory || activeStudent.history || [];
  const hasPlayback = mode === 'playback' && (activeStudent.status === 'Submitted' || history.length > 0) && Array.isArray(history) && history.length > 0;

  let displayCode = activeStudent.code || "";
  if (hasPlayback) {
    if (playbackIndex >= 0 && history[playbackIndex]) {
      displayCode = history[playbackIndex].code;
    } else if (!displayCode && history.length > 0) {
      displayCode = history[history.length - 1]?.code || "";
    }
  }

  // VCR playback — advance through the keystroke timeline using the REAL time
  // gaps the student took (clamped so long idle pauses don't stall the replay).
  // The visual progress bar (displayProgress) moves at a constant linear rate over
  // the total estimated duration so it always feels smooth and uniform.
  useEffect(() => {
    if (!isPlaying) return;
    if (!hasPlayback || history.length < 2) { setIsPlaying(false); return; }

    const startI = (playbackIndex < 0 || playbackIndex >= history.length - 1) ? 0 : playbackIndex;
    setPlaybackIndex(startI);
    setDisplayProgress(startI);

    // ── 1. Calculate total estimated playback duration from startI to end ──
    let totalDuration = 0;
    const delays = [];
    for (let k = startI; k < history.length - 1; k++) {
      const gap = (history[k + 1].time || 0) - (history[k].time || 0);
      const d = Math.min(Math.max(gap, 50), 1500);
      delays.push(d);
      totalDuration += d;
    }
    if (totalDuration === 0) totalDuration = (history.length - 1 - startI) * 200;

    // ── 2. Advance code display step-by-step via setTimeout (unchanged) ──
    const step = (idx) => {
      if (idx >= history.length - 1) {
        setDisplayProgress(history.length - 1);
        setIsPlaying(false);
        return;
      }
      const delay = delays[idx - startI] ?? 200;
      playTimerRef.current = setTimeout(() => {
        setPlaybackIndex(idx + 1);
        step(idx + 1);
      }, delay);
    };
    step(startI);

    // ── 3. Animate displayProgress LINEARLY over totalDuration via rAF ──
    const rafStart = performance.now();
    const totalSteps = history.length - 1 - startI;

    const tick = () => {
      const elapsed = performance.now() - rafStart;
      const fraction = Math.min(elapsed / totalDuration, 1);
      setDisplayProgress(startI + fraction * totalSteps);
      if (fraction < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const togglePlay = () => {
    if (!isPlaying) {
      if (playbackIndex >= history.length - 1) {
        setPlaybackIndex(0);
        setDisplayProgress(0);
        stepTimingRef.current = null;
      }
      setIsPlaying(true);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(false);
    }
  };

  const handleEvaluate = () => {
    if (evaluating) return;
    setEvalOutput("");
    setEvaluating(true);
    socket.emit('compile_code', { code: activeStudent.code });
  };

  return (
    <div style={styles.container}>
      
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '30px',
              right: '30px',
              backgroundColor: toast.type === 'warning' ? '#fef3c7' : '#dcfce7',
              border: `2px solid ${toast.type === 'warning' ? '#f59e0b' : '#22c55e'}`,
              color: toast.type === 'warning' ? '#b45309' : '#15803d',
              padding: '12px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              fontWeight: 'bold',
              zIndex: 9999
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      <div style={styles.leftSidebar}>
        <div style={styles.rosterSection}>
          <button
              onClick={onBack || onLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: '20px' }}
              title={onBack ? "Back" : "Back to Dashboard"}
            >
              <ArrowLeft size={18} color="#1f2937" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#4b5563', lineHeight: 1 }}>Back</span>
            </button>

          <h2 style={styles.heading}>{mode === 'playback' ? 'Submitted Students' : 'Student Roster'}</h2>

          <div style={styles.pillContainer}>
            {Object.values(students).length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Waiting for students...</p>
            ) : (
              Object.values(students).map(student => {
                const isActive = student.id === selectedStudentId;
                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    style={{
                      ...styles.studentPill,
                      border: isActive ? '2px solid #22c55e' : '2px solid transparent',
                      backgroundColor: isActive ? '#e5e7eb' : '#d1d5db'
                    }}
                  >
                    {student.name}
                    <span style={{ fontSize: '0.7rem', marginLeft: 'auto', color: student.status === 'Submitted' ? '#10b981' : '#6b7280' }}>
                      {student.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>

        </div>

        <div style={styles.warningSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span style={{ fontSize: '1.1rem', color: 'white' }}>Warning</span>
            <span style={{ fontSize: '1.1rem', color: 'white' }}>Time</span>
          </div>
          <div style={styles.logContainer}>
            {allLogs.length === 0 ? (
              <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>No warnings...</span>
            ) : (
              allLogs.map(log => (
                <div key={`${log.id}-${log.studentName}`} style={styles.logRow}>
                  <span style={{ color: log.color, paddingRight: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>{log.studentName}</span> ({log.action})
                  </span>
                  <span style={{ color: '#e5e7eb', flexShrink: 0 }}>{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={styles.mainArea}>
        <div style={styles.toolbar}>
          {activeStudent.status === 'Submitted' ? (
            <button onClick={handleEvaluate} disabled={evaluating} style={{ ...styles.evaluateButton, opacity: evaluating ? 0.6 : 1 }}>
              {evaluating ? 'Evaluating…' : 'Evaluate'}
            </button>
          ) : (
            <div className="recording-dot-blink" style={styles.recordingDot} title="Live Monitoring Active"></div>
          )}
        </div>

        <div style={styles.editorWrapper}>
          <Editor
            height="100%"
            language="csharp"
            theme="vs-dark"
            value={displayCode}
            options={{ fontSize: 18, minimap: { enabled: false }, readOnly: true }}
          />
        </div>

        {hasPlayback && (
          <div style={styles.scrubberBar}>
            <style>{`
              .vcr-scrubber {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 8px;
                border-radius: 4px;
                background: linear-gradient(
                  to right,
                  #ef4444 var(--progress, 0%),
                  #d1d5db var(--progress, 0%)
                );
                outline: none;
                cursor: pointer;
              }
              .vcr-scrubber::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 0px;
                height: 0px;
                opacity: 0;
              }
              .vcr-scrubber::-moz-range-thumb {
                width: 0px;
                height: 0px;
                border: none;
                opacity: 0;
                background: transparent;
              }
            `}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isPlaying ? '#ef4444' : '#16a34a', display: 'inline-block' }}></span>
                VCR PLAYBACK {isPlaying ? '• PLAYING' : ''}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#4b5563', fontWeight: '600' }}>
                Keystroke {(playbackIndex < 0 ? history.length : playbackIndex + 1)} of {history.length}
              </span>
            </div>
            <input
              type="range"
              className="vcr-scrubber"
              min="0"
              max={history.length - 1}
              value={isPlaying ? displayProgress : (playbackIndex < 0 ? history.length - 1 : playbackIndex)}
              onChange={(e) => {
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                setIsPlaying(false);
                const v = parseInt(e.target.value);
                setPlaybackIndex(v);
                setDisplayProgress(v);
              }}
              style={{
                '--progress': `${((isPlaying ? displayProgress : (playbackIndex < 0 ? history.length - 1 : playbackIndex)) / Math.max(history.length - 1, 1)) * 100}%`
              }}
            />
            <div style={styles.vcrControls}>
              <button onClick={togglePlay} style={styles.playButton} title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying
                  ? <Pause size={30} fill="#16a34a" color="#16a34a" />
                  : <Play size={30} fill="#16a34a" color="#16a34a" />}
              </button>
            </div>
          </div>
        )}

        <div style={styles.terminalWrapper}>
          <div style={styles.terminalHeader}>
            <span style={{ fontWeight: 'bold', marginRight: '10px' }}>V</span>
            <Maximize2 size={14} color="#000" style={{ cursor: 'pointer' }} />
          </div>
          <div style={styles.terminalBody}>
            <span style={{ whiteSpace: 'pre-wrap', color: 'black' }}>
              {evalOutput
                ? evalOutput
                : (activeStudent.status === 'Submitted'
                  ? "Exam completed. Click Evaluate to run the submitted code."
                  : (activeStudent.terminal || "Monitoring terminal in real-time..."))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100%', width: '100%', display: 'flex', fontFamily: 'Arial, Helvetica, sans-serif', backgroundColor: '#e5e7eb' },
  leftSidebar: { width: '300px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #d1d5db', backgroundColor: '#f3f4f6' },
  rosterSection: { flex: 1, padding: '30px' },
  homeButton: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '20px' },
  heading: { color: 'black', margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 'normal' },
  pillContainer: { display: 'flex', flexDirection: 'column', gap: '15px' },
  studentPill: { height: '35px', borderRadius: '50px', display: 'flex', alignItems: 'center', padding: '0 15px', color: '#4b5563', fontWeight: 'bold', cursor: 'pointer', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.1)' },
  warningSection: { height: '250px', backgroundColor: '#4b5563', padding: '30px', display: 'flex', flexDirection: 'column' },
  logContainer: { overflowY: 'auto', flex: 1, paddingRight: '5px' },
  logRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '1rem' },
  mainArea: { flex: 1, display: 'flex', flexDirection: 'column' },
  toolbar: { height: '56px', backgroundColor: '#f3f4f6', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0 20px' },
  recordingDot: { width: '12px', height: '12px', backgroundColor: '#dc2626', borderRadius: '50%', boxShadow: '0 0 8px rgba(220, 38, 38, 0.8)' },
  evaluateButton: { padding: '10px 28px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 8px rgba(34,197,94,0.3)' },
  editorWrapper: { flex: 2, backgroundColor: '#1e1e1e' },
  scrubberBar: { backgroundColor: '#e5e7eb', padding: '15px 30px 5px 30px', borderTop: '2px solid #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' },
  vcrControls: { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' },
  playButton: { background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' },
  terminalWrapper: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderTop: '2px solid #d1d5db' },
  terminalHeader: { padding: '5px 15px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', color: 'black' },
  terminalBody: { flex: 1, padding: '15px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '1rem', color: 'black', textAlign: 'left' },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontWeight: '600', fontSize: '0.85rem' }
};