import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Save, Play, Square, Send, Settings, TerminalSquare } from 'lucide-react';

// Strip whitespace so editor auto-indent on paste doesn't cause false mismatches.
const normalize = (text) => (text || "").replace(/\s+/g, '');

export default function StudentView({ socket, username, assignment, classroom, onBack }) {
  // SAFETY NET: If username is empty/broken, force a name so it doesn't crash the socket
  const safeUsername = username || `Student_${Math.floor(Math.random() * 1000)}`;

  const initialCode = `using System;\n\nnamespace UserInputApp\n{\n    class Program\n    {\n        static void Main(string[] args)\n        {\n            Console.Write("Enter your favorite hobby: ");\n            string hobby = Console.ReadLine();\n\n            Console.Write("How many years have you been doing it? ");\n            int years = Convert.ToInt32(Console.ReadLine());\n\n            Console.WriteLine("\\n--- Profile Summary ---");\n            Console.WriteLine($"Your hobby is: {hobby}");\n            Console.WriteLine($"You've been doing it for {years} years.");\n        }\n    }\n}`;
  
  const [code, setCode] = useState(initialCode);
  const [codeHistory, setCodeHistory] = useState([]);
  const [output, setOutput] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  // True once the program is actually running (past compilation) — gates the
  // terminal input box so the cursor doesn't show during "Initializing/Compiling".
  const [programStarted, setProgramStarted] = useState(false);
  // Seed the instruction from the assignment the student opened ("details").
  const [instruction, setInstruction] = useState(assignment?.details || "");
  const terminalEndRef = useRef(null);
  const terminalBodyRef = useRef(null);
  const [proctorLogs, setProctorLogs] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  // Tracks text the student copied/cut from INSIDE the app (editor OR terminal),
  // so pasting that same text back into the editor doesn't get flagged.
  const copiedInternallyRef = useRef(new Set());

  // 1. INSTANTLY ANNOUNCE PRESENCE TO TEACHER ON LOAD
  useEffect(() => {
    setCodeHistory([{ time: Date.now(), code: initialCode }]);

    socket.emit('student_typing', {
      studentId: safeUsername,
      name: safeUsername,
      code: initialCode,
      classroomId: classroom?.id,
      assignmentId: assignment?.id
    });
  }, [socket, safeUsername, initialCode, classroom, assignment]);

  // 2. PROCTORING ALERTS
  const addProctorLog = (message, color) => {
    const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    setProctorLogs(prevLogs => [{ id: Date.now(), message, time: timeString, color }, ...prevLogs]);
    socket.emit('proctor_alert', {
      studentId: safeUsername,
      name: safeUsername,
      action: message,
      time: timeString,
      color: color,
      classroomId: classroom?.id,
      assignmentId: assignment?.id
    });
  };

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.hidden) addProctorLog("Exit tab", "#eab308"); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Receive live instruction updates from the teacher; ignore empty pushes so
  // the assignment's own instruction stays visible if no live one is set.
  useEffect(() => {
    socket.on('instruction_update', (text) => { if (text) setInstruction(text); });
    return () => socket.off('instruction_update');
  }, [socket]);

  // Capture copies/cuts made inside the terminal (output text or the input box)
  // so the student can paste terminal content into the editor without a warning.
  useEffect(() => {
    const el = terminalBodyRef.current;
    if (!el) return;
    const captureTerminalCopy = () => {
      let text = (window.getSelection && window.getSelection().toString()) || "";
      const active = document.activeElement;
      if (active && active.tagName === 'INPUT' && typeof active.selectionStart === 'number') {
        const sel = active.value.substring(active.selectionStart, active.selectionEnd);
        if (sel) text = sel;
      }
      const key = normalize(text);
      if (key) copiedInternallyRef.current.add(key);
    };
    el.addEventListener('copy', captureTerminalCopy);
    el.addEventListener('cut', captureTerminalCopy);
    return () => {
      el.removeEventListener('copy', captureTerminalCopy);
      el.removeEventListener('cut', captureTerminalCopy);
    };
  }, []);

  const handleEditorDidMount = (editor) => {
    // Remember anything the student copies/cuts from within the editor itself
    const captureInternalCopy = () => {
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) return;
      const selectedText = editor.getModel().getValueInRange(selection);
      const key = normalize(selectedText);
      if (key) copiedInternallyRef.current.add(key);
    };
    const editorDom = editor.getDomNode();
    if (editorDom) {
      editorDom.addEventListener('copy', captureInternalCopy);
      editorDom.addEventListener('cut', captureInternalCopy);
    }

    editor.onDidPaste((e) => {
      const pastedText = editor.getModel().getValueInRange(e.range);
      const key = normalize(pastedText);
      // Pasting back something copied from inside the app (editor or terminal) is
      // allowed — only flag content that came from outside.
      if (!key || copiedInternallyRef.current.has(key)) return;
      addProctorLog("Paste a code", "#ef4444");
    });
  };

  // 3. TERMINAL HANDLING (Mirroring to Teacher immediately)
  useEffect(() => {
    socket.on('terminal_output', (dataChunk) => {
      setOutput((prev) => {
        const newOutput = prev + dataChunk;
        // Send to teacher instantly
        socket.emit('student_terminal_update', {
          studentId: safeUsername,
          output: newOutput,
          classroomId: classroom?.id,
          assignmentId: assignment?.id
        });
        return newOutput;
      });
      if (terminalEndRef.current) terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    });

    // Program finished compiling and is now running — reveal the input box.
    socket.on('program_started', () => setProgramStarted(true));

    socket.on('process_exit', () => {
      setIsRunning(false);
      setProgramStarted(false);
    });
    return () => {
      socket.off('terminal_output');
      socket.off('program_started');
      socket.off('process_exit');
    };
  }, [socket, safeUsername, classroom, assignment]);

  const handleRunCode = () => {
    setIsRunning(true);
    setProgramStarted(false); // hide input until compilation finishes
    setOutput("");

    // Tell teacher we cleared the terminal to run
    socket.emit('student_terminal_update', {
      studentId: safeUsername,
      output: "Initializing compiler environment...\n",
      classroomId: classroom?.id,
      assignmentId: assignment?.id
    });
    socket.emit('compile_code', { code: code });
  };

  const handleStopCode = () => {
    socket.emit('stop_code');
    socket.emit('student_terminal_update', {
      studentId: safeUsername,
      output: "[Process stopped by user]\n",
      classroomId: classroom?.id,
      assignmentId: assignment?.id
    });
    setIsRunning(false);
    setProgramStarted(false);
  };

  const handleSubmit = () => {
    if (submitted) return;
    if (!window.confirm("Submit your work? You won't be able to make changes after submitting.")) return;
    setSubmitted(true);
    socket.emit('submit_exam', {
      studentName: safeUsername,
      studentId: safeUsername,
      assignmentId: assignment?.id ?? null,
      finalCode: code,
      logs: proctorLogs,
      codeHistory: codeHistory,
      classroomId: classroom?.id,
      assignmentId: assignment?.id
    });
    // Brief on-screen confirmation before returning to the activity list.
    setTimeout(() => onBack(), 900);
  };

  const handleTerminalInput = (e) => {
    if (e.key === 'Enter') {
      socket.emit('terminal_input', inputValue);
      const newOutput = output + inputValue + '\n';
      setOutput(newOutput);
      socket.emit('student_terminal_update', {
        studentId: safeUsername,
        output: newOutput,
        classroomId: classroom?.id,
        assignmentId: assignment?.id
      });
      setInputValue("");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.leftSidebar}>
        <div style={styles.instructionSection}>
          <h2 style={{ color: 'black', margin: '0 0 20px 0', fontSize: '1.2rem' }}>Instruction</h2>
          {instruction ? (
            <p style={styles.instructionText}>{instruction}</p>
          ) : (
            <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>Waiting for instructions...</p>
          )}

          {assignment?.attachments?.length > 0 && (
            <div style={styles.attachmentList}>
              {assignment.attachments.map((att, i) => {
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
        </div>

        <div style={styles.warningSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span style={{ fontSize: '1.1rem', color: 'white', fontWeight: 'bold' }}>Warning</span>
            <span style={{ fontSize: '1.1rem', color: 'white', fontWeight: 'bold' }}>Time</span>
          </div>
          <div style={styles.logContainer}>
            {proctorLogs.length === 0 ? (
              <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>Monitoring active...</span>
            ) : (
              proctorLogs.map(log => (
                <div key={log.id} style={styles.logRow}>
                  <span style={{ color: log.color, fontWeight: 'bold' }}>{log.message}</span>
                  <span style={{ color: '#e5e7eb' }}>{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={styles.mainArea}>
        <div style={styles.toolbar}>
          <div style={styles.toolGroupLeft}>
            <button onClick={onBack} style={styles.backButton}><ArrowLeft size={18} /> Back</button>
            <button style={styles.iconButton}><Save size={18} /></button>
            <button onClick={handleRunCode} style={styles.runButton}><Play size={16} fill="currentColor" /> Run</button>
            <button onClick={handleStopCode} disabled={!isRunning} style={{ ...styles.stopButton, opacity: isRunning ? 1 : 0.5, cursor: isRunning ? 'pointer' : 'not-allowed' }}><Square size={14} fill="currentColor" /> Stop</button>
          </div>

          <div style={styles.toolGroupRight}>
            <button
              onClick={handleSubmit}
              disabled={submitted}
              style={{ ...styles.submitButton, ...(submitted ? styles.submitButtonDone : {}) }}
            >
              {submitted ? 'Submitted ✓' : <>Submit <Send size={16} style={{ marginLeft: '5px' }} /></>}
            </button>
            <div style={styles.recordingDot}></div>
            <button style={styles.gearIcon}><Settings size={22} /></button>
          </div>
        </div>

        <div style={styles.editorWrapper}>
          <Editor
            height="100%"
            language="csharp"
            theme="vs-dark"
            value={code}
            onChange={(newCode) => {
              setCode(newCode);
              setCodeHistory(prev => [...prev, { time: Date.now(), code: newCode }]);
              socket.emit('student_typing', {
                studentId: safeUsername,
                name: safeUsername,
                code: newCode,
                classroomId: classroom?.id,
                assignmentId: assignment?.id
              });
            }}
            onMount={handleEditorDidMount}
            options={{ fontSize: 16, minimap: { enabled: false } }}
          />
        </div>

        <div style={styles.terminalWrapper}>
          <div style={styles.terminalHeader}>
            <TerminalSquare size={16} style={{ marginRight: '8px' }} />
            <span style={{ fontWeight: 'bold' }}>Terminal Output</span>
          </div>
          <div ref={terminalBodyRef} style={styles.terminalBody}>
            <span style={{ whiteSpace: 'pre-wrap' }}>{output}</span>
            {isRunning && programStarted && (
              <div style={{ display: 'flex', marginTop: '5px' }}>
                <span style={{ marginRight: '8px', color: '#10b981' }}>{'>'}</span>
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleTerminalInput} autoFocus style={styles.terminalInput} />
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100%', display: 'flex', fontFamily: 'sans-serif', backgroundColor: '#e5e7eb' },
  leftSidebar: { width: '300px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #d1d5db' },
  instructionSection: { flex: 1, padding: '30px', backgroundColor: '#f3f4f6' },
  instructionText: { color: '#1f2937', fontSize: '1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 },
  attachmentList: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', alignItems: 'flex-start' },
  attachThumb: { maxWidth: '100%', maxHeight: '120px', borderRadius: '8px', objectFit: 'cover', display: 'block' },
  attachVideo: { maxWidth: '100%', maxHeight: '140px', borderRadius: '8px', backgroundColor: '#000' },
  attachLink: { display: 'inline-flex', alignItems: 'center', color: '#2563eb', textDecoration: 'none', fontSize: '0.9rem', wordBreak: 'break-all' },
  greyPill: { height: '30px', backgroundColor: '#d1d5db', borderRadius: '50px', marginBottom: '15px', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.1)' },
  warningSection: { height: '250px', backgroundColor: '#4b5563', padding: '30px', display: 'flex', flexDirection: 'column' },
  logContainer: { overflowY: 'auto', flex: 1, paddingRight: '5px' },
  logRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem' },
  mainArea: { flex: 1, display: 'flex', flexDirection: 'column' },
  toolbar: { height: '60px', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #d1d5db' },
  toolGroupLeft: { display: 'flex', gap: '10px', alignItems: 'center' },
  backButton: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', color: '#4b5563', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' },
  iconButton: { padding: '8px 12px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  runButton: { padding: '8px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' },
  stopButton: { padding: '8px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' },
  toolGroupRight: { display: 'flex', gap: '15px', alignItems: 'center' },
  submitButton: { padding: '8px 20px', backgroundColor: '#06b6d4', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center' },
  submitButtonDone: { backgroundColor: '#10b981', cursor: 'default' },
  recordingDot: { width: '12px', height: '12px', backgroundColor: '#dc2626', borderRadius: '50%', boxShadow: '0 0 8px rgba(220, 38, 38, 0.8)' },
  gearIcon: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' },
  editorWrapper: { flex: 2, backgroundColor: '#1e1e1e' },
  terminalWrapper: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderTop: '2px solid #d1d5db' },
  terminalHeader: { padding: '8px 15px', backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#4b5563', display: 'flex', alignItems: 'center' },
  terminalBody: { flex: 1, padding: '15px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '1rem', color: 'black', textAlign: 'left' },
  terminalInput: { backgroundColor: 'transparent', border: 'none', color: 'black', outline: 'none', width: '100%', fontFamily: 'monospace', fontSize: '1rem' }
};