import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Home, Maximize2, Play, Pause } from 'lucide-react';

export default function TeacherView({ socket, assignment, classroom, onLogout }) {
  const [students, setStudents] = useState({});
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [evalOutput, setEvalOutput] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const playTimerRef = useRef(null);

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
    // Ask the server for the current roster for THIS classroom/assignment
    // so students who joined BEFORE this view opened show up immediately.
    socket.emit('teacher_join', {
      classroomId: classroom?.id,
      assignmentId: assignment?.id
    });

    // Helper to auto-select a student if they are the first one to connect
    const checkSelection = (id) => {
      setSelectedStudentId(prev => prev ? prev : id);
    };

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
    });

    socket.on('teacher_terminal_update', (data) => {
      setStudents(prev => {
        const existing = prev[data.studentId] || { id: data.studentId, name: data.studentId, code: "", logs: [], status: "Live" };
        return { ...prev, [data.studentId]: { ...existing, terminal: data.output } };
      });
      checkSelection(data.studentId);
    });

    socket.on('teacher_receive_submission', (data) => {
      setStudents(prev => {
        const existing = prev[data.studentName];
        if (!existing) return prev;
        return {
          ...prev,
          [data.studentName]: { ...existing, status: "Submitted", code: data.finalCode, codeHistory: data.codeHistory }
        };
      });
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

    return () => {
      socket.off('teacher_update_code');
      socket.off('teacher_receive_alert');
      socket.off('teacher_terminal_update');
      socket.off('teacher_receive_submission');
      socket.off('teacher_student_left');
    };
  }, [socket]);

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

  const history = activeStudent.codeHistory;
  const hasPlayback = activeStudent.status === 'Submitted' && Array.isArray(history) && history.length > 0;

  let displayCode = activeStudent.code;
  if (hasPlayback && playbackIndex >= 0) {
      displayCode = history[playbackIndex].code;
  }

  // VCR playback — advance through the keystroke timeline using the REAL time
  // gaps the student took (clamped so long idle pauses don't stall the replay).
  useEffect(() => {
    if (!isPlaying) return;
    if (!hasPlayback || history.length < 2) { setIsPlaying(false); return; }

    let i = (playbackIndex < 0 || playbackIndex >= history.length - 1) ? 0 : playbackIndex;
    setPlaybackIndex(i);

    const step = (idx) => {
      if (idx >= history.length - 1) { setIsPlaying(false); return; }
      const gap = (history[idx + 1].time || 0) - (history[idx].time || 0);
      const delay = Math.min(Math.max(gap, 50), 1500); // clamp 50ms..1.5s
      playTimerRef.current = setTimeout(() => {
        setPlaybackIndex(idx + 1);
        step(idx + 1);
      }, delay);
    };
    step(i);

    return () => { if (playTimerRef.current) clearTimeout(playTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(p => !p);

  const handleEvaluate = () => {
    if (evaluating) return;
    setEvalOutput("");
    setEvaluating(true);
    socket.emit('compile_code', { code: activeStudent.code });
  };

  return (
    <div style={styles.container}>
      <div style={styles.leftSidebar}>
        <div style={styles.rosterSection}>
          <button onClick={onLogout} style={styles.homeButton} title="Back to Dashboard">
            <Home size={24} color="#1f2937" />
          </button>
          
          <h2 style={styles.heading}>Live Roster</h2>
          
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
            {activeStudent.logs.length === 0 ? (
              <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>No warnings...</span>
            ) : (
              activeStudent.logs.map(log => (
                <div key={log.id} style={styles.logRow}>
                  <span style={{ color: log.color }}>{log.action}</span>
                  <span style={{ color: '#e5e7eb' }}>{log.time}</span>
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
            <div style={styles.recordingDot} title="Live Monitoring Active"></div>
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
              .vcr-scrubber { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 4px; background: #c4c9d0; outline: none; }
              .vcr-scrubber::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #ef4444; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
              .vcr-scrubber::-moz-range-thumb { width: 20px; height: 20px; border: none; border-radius: 50%; background: #ef4444; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
            `}</style>
            <input
              type="range"
              className="vcr-scrubber"
              min="0"
              max={history.length - 1}
              value={playbackIndex < 0 ? history.length - 1 : playbackIndex}
              onChange={(e) => { setIsPlaying(false); setPlaybackIndex(parseInt(e.target.value)); }}
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
  container: { height: '100%', width: '100%', display: 'flex', fontFamily: 'sans-serif', backgroundColor: '#e5e7eb' },
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
  terminalBody: { flex: 1, padding: '15px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '1rem', color: 'black', textAlign: 'left' }
};