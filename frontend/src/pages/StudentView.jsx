import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Save, Play, Square, Settings, TerminalSquare, Check, AlertTriangle, Trash2, Moon, Sun, X, Link2 } from 'lucide-react';
import { apiFetch } from '../utils/api';
import localStore from '../services/localStore';
import { useDarkMode } from '../hooks/useDarkMode';
import ImagePreviewModal from '../components/ImagePreviewModal';
import VideoPreviewModal from '../components/VideoPreviewModal';
import VideoAttachment from '../components/VideoAttachment';
import AttachmentCard from '../components/AttachmentCard';

// Strip whitespace so editor auto-indent on paste doesn't cause false mismatches.
const normalize = (text) => (text || "").replace(/\s+/g, '');

export default function StudentView({ socket, currentUser, username, assignment, classroom, onBack }) {
  // SAFETY NET: If username is empty/broken, force a name so it doesn't crash the socket
  const safeUsername = currentUser?.name || username || currentUser?.email || `Student_${Math.floor(Math.random() * 1000)}`;
  const studentId = currentUser?.email || currentUser?.name || username || safeUsername;
  const assignmentId = assignment?.id ?? 'default';
  const classroomId = classroom?.id ?? 'default';

  const getSubKeys = () => [
    `verity_sub_${classroomId}_${assignmentId}_${studentId}`,
    `verity_sub_${classroomId}_${assignmentId}_${safeUsername}`,
    currentUser?.name ? `verity_sub_${classroomId}_${assignmentId}_${currentUser.name}` : null,
    currentUser?.email ? `verity_sub_${classroomId}_${assignmentId}_${currentUser.email}` : null,
    `verity_sub_${classroomId}_${assignmentId}`
  ].filter(Boolean);

  const draftKey = `verity_code_${assignmentId}_${studentId}`;

  const initialCode = `using System;\n\nnamespace HelloWorld\n{\n    class Program\n    {\n        static void Main(string[] args)\n        {\n            Console.WriteLine("Hello, World!");\n        }\n    }\n}`;

  const [code, setCode] = useState(() => {
    try {
      const savedCode = localStorage.getItem(draftKey);
      if (savedCode && !savedCode.includes("UserInputApp")) return savedCode;
    } catch { /* ignore */ }
    return assignment?.starterCode || initialCode;
  });

  const [codeHistory, setCodeHistory] = useState([]);
  const [output, setOutput] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  // True once the program is actually running (past compilation) — gates the
  // terminal input box so the cursor doesn't show during "Initializing/Compiling".
  const [programStarted, setProgramStarted] = useState(false);
  // Seed the instruction from the assignment the student opened ("details").
  const [instruction, setInstruction] = useState(assignment?.details || "");
  const [strictCompiler, setStrictCompiler] = useState(false);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [editorFontSize, setEditorFontSize] = useState(() => {
    try {
      return Number(localStorage.getItem('verity_editor_font_size')) || 16;
    } catch {
      return 16;
    }
  });

  const [kioskRules, setKioskRules] = useState({
    flagTabExits: true,
    strictClipboardBlocking: true,
    flagMultipleLogins: true,
    violationThreshold: 3,
    sessionTimeout: '30m',
    cognitivePauseThreshold: 45,
    enforceSingleMonitor: false,
    disableWindowsKeyAltTab: true
  });
  const kioskRulesRef = useRef(kioskRules);
  useEffect(() => { kioskRulesRef.current = kioskRules; }, [kioskRules]);

  const [multiMonitorDetected, setMultiMonitorDetected] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const cognitivePauseTimerRef = useRef(null);
  const hasLoggedPauseRef = useRef(false);

  // Synchronize compiler strictness & kiosk rules from Admin Settings
  useEffect(() => {
    let isMounted = true;
    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/system-settings`)
      .then(res => res.ok ? res.json() : {})
      .then(d => {
        if (!isMounted) return;
        const treatWarnings = !!d.settings?.examDefaults?.treatWarningsAsErrors;
        setStrictCompiler(treatWarnings);
        if (d.settings?.global_config?.security) {
          setKioskRules(prev => ({ ...prev, ...d.settings.global_config.security }));
        } else if (d.settings?.security) {
          setKioskRules(prev => ({ ...prev, ...d.settings.security }));
        }
      })
      .catch(() => {});

    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/kiosk-settings`)
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        if (isMounted && data?.settings) {
          setKioskRules(prev => ({ ...prev, ...data.settings }));
        }
      })
      .catch(() => {});

    if (socket) {
      const sendAuth = () => {
        const token = localStorage.getItem('verity_token') || localStorage.getItem('token');
        socket.emit('authenticate', { token, user: currentUser });
      };

      sendAuth();
      socket.on('connect', sendAuth);

      const handleSettingsUpdate = (data) => {
        if (data?.settings?.examDefaults?.treatWarningsAsErrors !== undefined) {
          setStrictCompiler(!!data.settings.examDefaults.treatWarningsAsErrors);
        }
        if (data?.settings?.global_config?.security) {
          setKioskRules(prev => ({ ...prev, ...data.settings.global_config.security }));
        }
      };
      const handleKioskSettings = (newSettings) => {
        if (newSettings) {
          setKioskRules(prev => ({ ...prev, ...newSettings }));
        }
      };

      socket.on('system_settings_updated', handleSettingsUpdate);
      socket.on('kiosk_settings', handleKioskSettings);
      return () => {
        isMounted = false;
        socket.off('connect', sendAuth);
        socket.off('system_settings_updated', handleSettingsUpdate);
        socket.off('kiosk_settings', handleKioskSettings);
      };
    }
    return () => { isMounted = false; };
  }, [socket, currentUser]);

  // Activate Electron lockdown with option to disable Windows key / Alt+Tab hook
  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.enableLockdown === 'function') {
      window.electronAPI.enableLockdown({ disableWindowsKeyAltTab: kioskRules.disableWindowsKeyAltTab });
    }
  }, [kioskRules.disableWindowsKeyAltTab]);



  // Monitor count enforcement
  useEffect(() => {
    if (!kioskRules.enforceSingleMonitor) {
      setMultiMonitorDetected(false);
      return;
    }

    const checkMonitors = async () => {
      if (window.electronAPI && typeof window.electronAPI.getDisplayCount === 'function') {
        try {
          const count = await window.electronAPI.getDisplayCount();
          setMultiMonitorDetected(count > 1);
        } catch (_) {}
      }
    };

    checkMonitors();
    const interval = setInterval(checkMonitors, 3000);
    return () => clearInterval(interval);
  }, [kioskRules.enforceSingleMonitor]);

  // Idle session timeout enforcement
  useEffect(() => {
    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    const parseTimeoutMs = (str) => {
      if (!str) return 30 * 60 * 1000;
      const match = String(str).match(/^(\d+)\s*([smh])?$/i);
      if (!match) return 30 * 60 * 1000;
      const val = parseInt(match[1], 10);
      const unit = (match[2] || 'm').toLowerCase();
      if (unit === 's') return val * 1000;
      if (unit === 'h') return val * 3600 * 1000;
      return val * 60 * 1000;
    };

    const timeoutMs = parseTimeoutMs(kioskRules.sessionTimeout);
    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= timeoutMs - 60000) {
        setIdleWarning(true);
      } else {
        setIdleWarning(false);
      }
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      clearInterval(interval);
    };
  }, [kioskRules.sessionTimeout]);

  useEffect(() => {
    if (assignment?.details !== undefined) {
      setInstruction(assignment.details);
    }
  }, [assignment?.details]);

  // Load draft from local SQLite storage if available
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const draft = await localStore.getDraft(assignmentId, studentId);
        if (isMounted && draft && draft.code && !draft.code.includes("UserInputApp")) {
          setCode(draft.code);
          codeRef.current = draft.code;
          if (Array.isArray(draft.history) && draft.history.length > 0) {
            setCodeHistory(draft.history);
          }
        }
      } catch { /* ignore */ }
    })();
    return () => { isMounted = false; };
  }, [assignmentId, studentId]);
  const terminalEndRef = useRef(null);
  const terminalBodyRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const diagnosticsRef = useRef([]);
  const [proctorLogs, setProctorLogs] = useState([]);

  // High-Speed Local Compiler Socket (instant execution in Electron / local machine)
  const [useLocalCompiler, setUseLocalCompiler] = useState(false);
  const localSocketRef = useRef(null);

  useEffect(() => {
    let isSubscribed = true;
    const token = localStorage.getItem('verity_token') || localStorage.getItem('token');

    try {
      const local = io('http://localhost:3001', {
        timeout: 2500,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        auth: { token }
      });

      local.on('connect', () => {
        if (isSubscribed) setUseLocalCompiler(true);
        local.emit('authenticate', { token, user: currentUser });
      });

      local.on('connect_error', () => {
        if (isSubscribed) setUseLocalCompiler(false);
      });

      localSocketRef.current = local;
    } catch (_) {}

    return () => {
      isSubscribed = false;
      if (localSocketRef.current) {
        try { localSocketRef.current.disconnect(); } catch (_) {}
      }
    };
  }, [currentUser]);

  const getCompilerSocket = () => {
    if (useLocalCompiler && localSocketRef.current && localSocketRef.current.connected) {
      return localSocketRef.current;
    }
    return socket;
  };

  // Terminal resizable height & drag state
  const [terminalHeight, setTerminalHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('verity_terminal_height');
      if (saved) return Math.max(100, Math.min(parseInt(saved, 10), window.innerHeight * 0.75));
    } catch {}
    return 240;
  });
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(240);

  const handleDividerMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = terminalHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = startYRef.current - moveEvent.clientY;
      const newHeight = Math.max(100, Math.min(startHeightRef.current + deltaY, window.innerHeight * 0.75));
      setTerminalHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setTerminalHeight((finalHeight) => {
        try { localStorage.setItem('verity_terminal_height', String(finalHeight)); } catch {}
        return finalHeight;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const codeRef = useRef(code);
  codeRef.current = code;
  const [saveStatus, setSaveStatus] = useState(false);
  const saveTimeoutRef = useRef(null);

  const handleSaveCode = () => {
    const currentCode = codeRef.current;
    try {
      localStorage.setItem(draftKey, currentCode);
      localStore.saveDraft(assignmentId, studentId, currentCode, codeHistory);
      if (studentId !== safeUsername) {
        localStorage.setItem(`verity_code_${assignmentId}_${safeUsername}`, currentCode);
        localStore.saveDraft(assignmentId, safeUsername, currentCode, codeHistory);
      }
    } catch { /* ignore */ }

    if (socket) {
      socket.emit('student_typing', {
        studentId: safeUsername,
        name: safeUsername,
        code: currentCode,
        classroomId: classroom?.id,
        assignmentId: assignment?.id
      });
    }

    setSaveStatus(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus(false);
    }, 2000);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveCode();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [draftKey, safeUsername, studentId, assignmentId, classroom?.id, socket]);

  const checkLocalSubmitted = () => {
    const keys = getSubKeys();
    for (const k of keys) {
      try {
        if (localStorage.getItem(k)) return true;
      } catch { /* ignore */ }
    }
    return false;
  };

  const [submitted, setSubmitted] = useState(() => checkLocalSubmitted());

  // Tell the server we left the workspace if we click back or navigate away
  useEffect(() => {
    return () => {
      if (socket) {
        socket.emit('student_leave_workspace');
      }
    };
  }, [socket]);

  // Tracks text the student copied/cut from INSIDE the app (editor OR terminal),
  // so pasting that same text back into the editor doesn't get flagged.
  const copiedInternallyRef = useRef(new Set());

  // 1. INSTANTLY ANNOUNCE PRESENCE TO TEACHER ON LOAD
  useEffect(() => {
    setCodeHistory([{ time: Date.now(), code: code }]);

    socket.emit('student_typing', {
      studentId: safeUsername,
      name: safeUsername,
      code: code,
      classroomId: classroom?.id,
      assignmentId: assignment?.id
    });
  }, [socket, safeUsername, classroom, assignment]);

  // 2. PROCTORING ALERTS
  const lastTabExitLogRef = useRef(0);

  const addProctorLog = (message, color) => {
    const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    setProctorLogs(prevLogs => [{ id: Date.now(), message, time: timeString, color }, ...prevLogs]);
    const payload = {
      studentId: studentId || safeUsername,
      name: currentUser?.name || safeUsername,
      email: currentUser?.email || '',
      action: message,
      time: timeString,
      color: color,
      classroomId: classroom?.id,
      assignmentId: assignment?.id
    };
    if (socket && typeof socket.emit === 'function') {
      socket.emit('proctor_alert', payload);
    }
    const actionStr = (message || '').toLowerCase();
    const isCopyPaste = actionStr.includes('paste') || actionStr.includes('clipboard') || actionStr.includes('copy');
    
    // Also post directly to /audit-logs for guaranteed persistence & instant admin dashboard update
    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: currentUser?.name || currentUser?.email || safeUsername,
        type: isCopyPaste ? 'Copy/Paste Violation' : 'Exit Tab Violation',
        severity: isCopyPaste ? 'High' : 'Warning',
        desc: `${message} in classroom ${classroom?.id || 'workspace'}`
      })
    }).catch(() => {});
  };

  useEffect(() => {
    const handleTabExit = (actionLabel = "Exit tab") => {
      if (kioskRulesRef.current?.flagTabExits === false) return;
      const now = Date.now();
      // Debounce so blur and visibilitychange don't double fire within 1.5 seconds
      if (now - lastTabExitLogRef.current < 1500) return;
      lastTabExitLogRef.current = now;
      addProctorLog(actionLabel, "#eab308");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabExit("Exit tab (Alt+Tab)");
      }
    };

    const handleWindowBlur = () => {
      handleTabExit("Exit tab (Window blur / Alt+Tab)");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  const resetCognitivePauseTimer = useCallback(() => {
    if (cognitivePauseTimerRef.current) {
      clearTimeout(cognitivePauseTimerRef.current);
    }
    hasLoggedPauseRef.current = false;
    const thresholdSec = Number(kioskRulesRef.current.cognitivePauseThreshold) || 45;
    if (thresholdSec <= 0) return;

    cognitivePauseTimerRef.current = setTimeout(() => {
      if (!hasLoggedPauseRef.current) {
        hasLoggedPauseRef.current = true;
        addProctorLog(`Cognitive Pause (${thresholdSec}s inactivity)`, "#f59e0b");
      }
    }, thresholdSec * 1000);
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

  const updateEditorMarkers = (diagnostics = []) => {
    diagnosticsRef.current = diagnostics;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    if (!Array.isArray(diagnostics) || diagnostics.length === 0) {
      monaco.editor.setModelMarkers(model, 'csharp-compiler', []);
      return;
    }

    const markers = diagnostics.map(d => {
      const startLine = Math.max(1, Math.min(d.startLineNumber || 1, model.getLineCount()));
      const lineContent = model.getLineContent(startLine) || '';
      const startCol = Math.max(1, Math.min(d.startColumn || 1, lineContent.length + 1));

      let endCol = d.endColumn;
      if (!endCol || endCol <= startCol) {
        const remaining = lineContent.substring(startCol - 1);
        const wordMatch = remaining.match(/^[a-zA-Z0-9_]+/);
        if (wordMatch && wordMatch[0].length > 0) {
          endCol = startCol + wordMatch[0].length;
        } else {
          endCol = Math.max(startCol + 1, lineContent.length + 1);
        }
      }

      const endLine = Math.max(startLine, Math.min(d.endLineNumber || startLine, model.getLineCount()));

      return {
        severity: d.severity === 'warning'
          ? monaco.MarkerSeverity.Warning
          : monaco.MarkerSeverity.Error,
        message: d.message,
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol
      };
    });

    monaco.editor.setModelMarkers(model, 'csharp-compiler', markers);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (monaco) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        handleSaveCode();
      });
    }

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
      // Pasting back something copied from inside the app (editor or terminal) is allowed
      if (!key || copiedInternallyRef.current.has(key)) return;

      if (kioskRulesRef.current.strictClipboardBlocking) {
        editor.trigger('keyboard', 'undo', null);
        addProctorLog("Strict Clipboard: External Paste Blocked", "#ef4444");
      } else {
        addProctorLog("Paste a code", "#ef4444");
      }
    });
  };

  // 3. TERMINAL HANDLING & COMPILER DIAGNOSTICS (Mirroring to Teacher immediately)
  useEffect(() => {
    const handleOutput = (dataChunk) => {
      setOutput((prev) => {
        const newOutput = prev + dataChunk;
        // Broadcast to teacher via cloud socket
        if (socket && socket.connected) {
          socket.emit('student_terminal_update', {
            studentId: safeUsername,
            output: newOutput,
            classroomId: classroom?.id,
            assignmentId: assignment?.id
          });
        }
        return newOutput;
      });
      if (terminalEndRef.current) terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    };

    const handleStarted = () => setProgramStarted(true);
    const handleExit = () => {
      setIsRunning(false);
      setProgramStarted(false);
    };
    const handleDiagnostics = (diagnostics) => {
      updateEditorMarkers(diagnostics);
    };

    socket.on('terminal_output', handleOutput);
    socket.on('program_started', handleStarted);
    socket.on('process_exit', handleExit);
    socket.on('compiler_diagnostics', handleDiagnostics);

    const local = localSocketRef.current;
    if (local) {
      local.on('terminal_output', handleOutput);
      local.on('program_started', handleStarted);
      local.on('process_exit', handleExit);
      local.on('compiler_diagnostics', handleDiagnostics);
    }

    return () => {
      socket.off('terminal_output', handleOutput);
      socket.off('program_started', handleStarted);
      socket.off('process_exit', handleExit);
      socket.off('compiler_diagnostics', handleDiagnostics);
      if (local) {
        local.off('terminal_output', handleOutput);
        local.off('program_started', handleStarted);
        local.off('process_exit', handleExit);
        local.off('compiler_diagnostics', handleDiagnostics);
      }
    };
  }, [socket, useLocalCompiler, safeUsername, classroom, assignment]);

  // Verify submission status with backend and keep in sync
  useEffect(() => {
    if (!assignment?.id) return;
    const aId = assignment.id;
    let cancelled = false;

    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/submissions/${aId}`)
      .then(res => res.ok ? res.json() : { submissions: [] })
      .then(data => {
        if (cancelled) return;
        const subs = data?.submissions || [];
        const isSub = subs.some(s => {
          const sName = (s.student_name || s.studentName || '').toLowerCase();
          const sId = (s.student_id || s.studentId || '').toLowerCase();
          const targetName = safeUsername.toLowerCase();
          const targetId = studentId.toLowerCase();
          return sName === targetName || sName === targetId || (sId && (sId === targetName || sId === targetId));
        });

        if (!isSub) {
          // Definitely not submitted on server! Clear local storage submission keys
          setSubmitted(false);
          getSubKeys().forEach(k => {
            try { localStorage.removeItem(k); } catch { }
          });
        } else {
          setSubmitted(true);
        }
      })
      .catch(() => {
        // Fallback to local check if backend is unreachable
        setSubmitted(checkLocalSubmitted());
      });

    return () => { cancelled = true; };
  }, [assignment?.id, safeUsername, studentId, classroomId]);

  // Sync on window storage event (e.g. unsubmitted in another tab or parent screen)
  useEffect(() => {
    const handleStorage = () => {
      setSubmitted(checkLocalSubmitted());
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [classroomId, assignmentId, studentId, safeUsername]);

  // Real-time unsubmit via socket
  useEffect(() => {
    if (!socket) return;
    const handleSocketUnsubmit = (data) => {
      if (!data) return;
      const targetName = (safeUsername || '').toLowerCase();
      const targetId = (studentId || '').toLowerCase();
      const eventName = (data.studentName || '').toLowerCase();
      const eventId = (data.studentId || '').toLowerCase();

      if (eventName === targetName || eventName === targetId || eventId === targetName || eventId === targetId) {
        setSubmitted(false);
        getSubKeys().forEach(k => {
          try { localStorage.removeItem(k); } catch { }
        });
      }
    };

    socket.on('student_unsubmitted', handleSocketUnsubmit);
    socket.on('teacher_student_unsubmitted', handleSocketUnsubmit);
    return () => {
      socket.off('student_unsubmitted', handleSocketUnsubmit);
      socket.off('teacher_student_unsubmitted', handleSocketUnsubmit);
    };
  }, [socket, safeUsername, studentId, classroomId, assignmentId]);

  const handleRunCode = () => {
    updateEditorMarkers([]);
    setIsRunning(true);
    setProgramStarted(false); // hide input until compilation finishes
    setOutput("");

    const targetSocket = getCompilerSocket();

    // Tell teacher we started running
    if (socket && socket.connected) {
      socket.emit('student_terminal_update', {
        studentId: safeUsername,
        output: "Compiling...\n",
        classroomId: classroom?.id,
        assignmentId: assignment?.id
      });
    }

    const token = localStorage.getItem('verity_token') || localStorage.getItem('token');
    targetSocket.emit('compile_code', {
      code: code,
      token: token,
      user: currentUser
    });
  };

  const handleStopCode = () => {
    const targetSocket = getCompilerSocket();
    targetSocket.emit('stop_code');
    if (socket && socket.connected) {
      socket.emit('student_terminal_update', {
        studentId: safeUsername,
        output: "[Process stopped by user]\n",
        classroomId: classroom?.id,
        assignmentId: assignment?.id
      });
    }
    setIsRunning(false);
    setProgramStarted(false);
  };

  const handleSubmit = () => {
    if (submitted) return;
    if (strictCompiler && diagnosticsRef.current?.length > 0) {
      const msg = "Notice: Strict compiler mode is active and your code currently has compiler errors/warnings. Are you sure you want to submit anyway?";
      if (!window.confirm(msg)) return;
    } else {
      if (!window.confirm("Submit your work? You won't be able to make changes after submitting.")) return;
    }
    setSubmitted(true);
    const aId = assignment?.id ?? 'default';
    const subRecord = {
      studentName: safeUsername,
      studentId: studentId,
      assignmentId: assignment?.id ?? null,
      classroomId: classroom?.id ?? null,
      finalCode: code,
      codeHistory: codeHistory,
      submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    getSubKeys().forEach(k => {
      try { localStorage.setItem(k, JSON.stringify(subRecord)); } catch { }
    });

    // Save to backend database
    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/submissions/${aId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: safeUsername,
        studentId: studentId,
        finalCode: code,
        codeHistory: codeHistory,
        classroomId: classroom?.id ?? null
      })
    }).catch(() => {});

    // Broadcast to live teacher monitoring via socket
    socket.emit('submit_exam', {
      studentName: safeUsername,
      studentId: studentId,
      assignmentId: assignment?.id ?? null,
      finalCode: code,
      logs: proctorLogs,
      codeHistory: codeHistory,
      classroomId: classroom?.id,
    });
  };

  const handleUnsubmit = () => {
    if (!window.confirm("Are you sure you want to unsubmit? You will be able to edit and re-submit your code.")) return;

    setSubmitted(false);
    getSubKeys().forEach(k => {
      try { localStorage.removeItem(k); } catch { }
    });

    const aId = assignment?.id ?? 'default';
    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/submissions/${aId}/${encodeURIComponent(safeUsername)}`, {
      method: 'DELETE'
    }).catch(() => {});
    if (studentId && studentId !== safeUsername) {
      apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/submissions/${aId}/${encodeURIComponent(studentId)}`, {
        method: 'DELETE'
      }).catch(() => {});
    }

    if (socket) {
      socket.emit('unsubmit_exam', {
        studentName: safeUsername,
        studentId: studentId,
        assignmentId: aId,
        classroomId: classroom?.id ?? 'default'
      });
    }
  };

  const handleTerminalInput = (e) => {
    if (e.key === 'Enter') {
      const targetSocket = getCompilerSocket();
      targetSocket.emit('terminal_input', inputValue);
      const newOutput = output + inputValue + '\n';
      setOutput(newOutput);
      if (socket && socket.connected) {
        socket.emit('student_terminal_update', {
          studentId: safeUsername,
          output: newOutput,
          classroomId: classroom?.id,
          assignmentId: assignment?.id
        });
      }
      setInputValue("");
    }
  };

  const handleClearTerminal = () => {
    setOutput("");
    if (socket) {
      socket.emit('student_terminal_update', {
        studentId: safeUsername,
        output: "",
        classroomId: classroom?.id,
        assignmentId: assignment?.id
      });
    }
  };

  const renderFormattedOutput = (rawText) => {
    if (!rawText) return null;
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      let color = isDark ? '#E8EAED' : '#1f2937';
      let fontWeight = 'normal';
      let fontStyle = 'normal';

      if (/error CS\d+/i.test(line) || /The build failed/i.test(line) || /\[Process terminated/i.test(line)) {
        color = isDark ? '#f87171' : '#dc2626'; // bright red
        fontWeight = '600';
      } else if (/warning CS\d+/i.test(line)) {
        color = isDark ? '#fbbf24' : '#d97706'; // bright amber
        fontWeight = '600';
      } else if (/Initializing compiler environment/i.test(line) || /Compiling and running/i.test(line)) {
        color = isDark ? '#38bdf8' : '#0284c7'; // bright sky blue
      } else if (/\[Process exited with code 0\]/i.test(line)) {
        color = isDark ? '#34d399' : '#059669'; // bright emerald
        fontWeight = '600';
      } else if (/\[Process exited with code/i.test(line)) {
        color = isDark ? '#f87171' : '#dc2626'; // bright red
        fontWeight = '600';
      } else if (/\[Process stopped by user\]/i.test(line)) {
        color = isDark ? '#9ca3af' : '#6b7280'; // soft gray
        fontStyle = 'italic';
      }

      return (
        <div key={idx} style={{ color, fontWeight, fontStyle, minHeight: '1.25em', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {line || ' '}
        </div>
      );
    });
  };

  return (
    <div style={{
      ...styles.container,
      ...(isDark ? { backgroundColor: '#1e1e1e' } : {})
    }}>
      <div style={{
        ...styles.leftSidebar,
        ...(isDark ? { backgroundColor: '#282828', borderRight: '1px solid #3c3c3c' } : {})
      }}>
        <div style={{
          ...styles.instructionSection,
          ...(isDark ? { backgroundColor: '#282828' } : {})
        }}>
          <h2 style={{ color: isDark ? '#E8EAED' : 'black', margin: '0 0 20px 0', fontSize: '1.2rem' }}>Instruction</h2>
          {instruction ? (
            <p style={{
              ...styles.instructionText,
              ...(isDark ? { color: '#d1d5db' } : {})
            }}>{instruction}</p>
          ) : (
            <p style={{ color: isDark ? '#888888' : '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>Waiting for instructions...</p>
          )}

          {/* In the workspace, link attachments are hidden to maintain proctoring/focus, keeping only images and videos */}
          {assignment?.attachments?.filter((att) => att.type !== 'link').length > 0 && (
            <div style={styles.attachmentList}>
              {assignment.attachments
                .filter((att) => att.type !== 'link')
                .map((att, i) => (
                  <AttachmentCard
                    key={i}
                    att={att}
                    isDark={isDark}
                    onClick={(clickedAtt) => {
                      if (clickedAtt.type === 'image') setPreviewImage(clickedAtt);
                      else if (clickedAtt.type === 'video') setPreviewVideo(clickedAtt);
                    }}
                  />
                ))}
            </div>
          )}
        </div>

        <div style={{
          ...styles.warningSection,
          ...(isDark ? { backgroundColor: '#222222', borderTop: '1px solid #3c3c3c' } : {})
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span style={{ fontSize: '1.1rem', color: isDark ? '#E8EAED' : 'white', fontWeight: 'bold' }}>Warning</span>
            <span style={{ fontSize: '1.1rem', color: isDark ? '#E8EAED' : 'white', fontWeight: 'bold' }}>Time</span>
          </div>
          <div style={styles.logContainer}>
            {proctorLogs.length === 0 ? (
              <span style={{ color: isDark ? '#888888' : '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>Monitoring active...</span>
            ) : (
              proctorLogs.map(log => (
                <div key={log.id} style={styles.logRow}>
                  <span style={{ color: log.color, fontWeight: 'bold' }}>{log.message}</span>
                  <span style={{ color: isDark ? '#a3a3a3' : '#e5e7eb' }}>{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={styles.mainArea}>
        <div style={{
          ...styles.toolbar,
          ...(isDark ? { backgroundColor: '#262626', borderBottom: '1px solid #3c3c3c' } : {})
        }}>
          <div style={styles.toolGroupLeft}>
            <button
              onClick={onBack}
              style={{
                ...styles.backButton,
                ...(isDark ? { backgroundColor: '#333333', borderColor: '#484848', color: '#E8EAED' } : {})
              }}
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button
              onClick={handleSaveCode}
              style={{
                ...styles.iconButton,
                ...(isDark ? { backgroundColor: '#333333', borderColor: '#484848', color: '#E8EAED' } : {}),
                ...(saveStatus ? styles.iconButtonSaved : {})
              }}
              title="Save draft (Ctrl+S)"
            >
              {saveStatus ? (
                <>
                  <Check size={18} color="#059669" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#059669', marginLeft: '4px' }}>Saved</span>
                </>
              ) : (
                <Save size={18} />
              )}
            </button>
            <button onClick={handleRunCode} style={styles.runButton}><Play size={16} fill="currentColor" /> Run</button>
            <button onClick={handleStopCode} disabled={!isRunning} style={{ ...styles.stopButton, opacity: isRunning ? 1 : 0.5, cursor: isRunning ? 'pointer' : 'not-allowed' }}><Square size={14} fill="currentColor" /> Stop</button>
            {strictCompiler && (
              <div
                style={{
                  ...styles.strictBadge,
                  ...(isDark ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' } : {})
                }}
                title="Strict Compiler Mode: Compiler warnings are treated as errors and will block execution."
              >
                <AlertTriangle size={13} style={{ marginRight: '5px', flexShrink: 0 }} />
                <span>Strict: Warnings = Errors</span>
              </div>
            )}
          </div>

          <div style={styles.toolGroupRight}>
            {submitted ? (
              <button
                onClick={handleUnsubmit}
                style={{
                  ...styles.unsubmitBtn,
                  ...(isDark ? { backgroundColor: '#333333', borderColor: '#484848', color: '#E8EAED' } : {})
                }}
                title="Unsubmit to edit and re-submit your code"
              >
                Unsubmit
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                style={styles.submitButton}
              >
                Submit
              </button>
            )}
            <div
              className="recording-dot-blink"
              style={styles.recordingDot}
              title="Recording active: Your workspace activity is being recorded and proctored"
            />
            <button
              onClick={() => setShowSettingsModal(true)}
              style={styles.gearIcon}
              title="Settings"
            >
              <Settings size={22} color={isDark ? '#d4d4d4' : '#6b7280'} />
            </button>
          </div>
        </div>

        <div style={styles.editorWrapper}>
          <Editor
            height="100%"
            language="csharp"
            theme={isDark ? "vs-dark" : "light"}
            value={code}
            onChange={(newCode) => {
              if (submitted) return;
              resetCognitivePauseTimer();
              if (diagnosticsRef.current?.length > 0) {
                updateEditorMarkers([]);
              }
              setCode(newCode);
              codeRef.current = newCode;
              try { 
                localStorage.setItem(draftKey, newCode);
                localStore.saveDraft(assignmentId, studentId, newCode);
              } catch { /* ignore */ }
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
            options={{
              fontSize: editorFontSize,
              minimap: { enabled: false },
              readOnly: submitted,
              readOnlyMessage: { value: 'Unsubmit your work before editing' }
            }}
          />
        </div>

        <div
          style={{
            ...styles.resizeHandle,
            ...(isDark ? { backgroundColor: '#262626', borderTop: '1px solid #3c3c3c', borderBottom: '1px solid #262626' } : {})
          }}
          onMouseDown={handleDividerMouseDown}
          title="Drag up or down to resize terminal height"
        >
          <div style={{
            ...styles.resizeHandleGrip,
            ...(isDark ? { backgroundColor: '#555555' } : {})
          }} />
        </div>

        <div style={{
          ...styles.terminalWrapper,
          height: `${terminalHeight}px`,
          ...(isDark ? { backgroundColor: '#1e1e1e', borderTop: '1px solid #3c3c3c' } : {})
        }}>
          <div style={{
            ...styles.terminalHeader,
            ...(isDark ? { backgroundColor: '#262626', borderBottom: '1px solid #3c3c3c' } : {})
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TerminalSquare size={15} color={isDark ? '#10b981' : '#4b5563'} />
              <span style={{ fontWeight: '600', fontSize: '0.82rem', color: isDark ? '#E8EAED' : '#1f2937', letterSpacing: '0.04em' }}>TERMINAL</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleClearTerminal}
                style={{
                  ...styles.terminalActionBtn,
                  ...(isDark ? { backgroundColor: '#333333', borderColor: '#484848', color: '#E8EAED' } : {})
                }}
                title="Clear Terminal Output"
              >
                <Trash2 size={13} style={{ marginRight: '4px' }} />
                <span>Clear</span>
              </button>
            </div>
          </div>
          <div ref={terminalBodyRef} style={{
            ...styles.terminalBody,
            ...(isDark ? { backgroundColor: '#1e1e1e', color: '#E8EAED' } : {})
          }}>
            {renderFormattedOutput(output)}
            {isRunning && programStarted && (
              <div style={{
                ...styles.terminalInputRow,
                ...(isDark ? { backgroundColor: '#252525', borderColor: '#3c3c3c' } : {})
              }}>
                <span style={{ marginRight: '8px', color: '#10b981', fontWeight: 'bold' }}>{'>'}</span>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleTerminalInput}
                  autoFocus
                  style={{
                    ...styles.terminalInput,
                    ...(isDark ? { color: '#E8EAED' } : {})
                  }}
                  placeholder="Type input here and press Enter..."
                />
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            style={{
              backgroundColor: isDark ? '#2c2c2c' : '#ffffff',
              color: isDark ? '#E8EAED' : '#1e293b',
              borderRadius: '20px',
              padding: '28px',
              width: '90%',
              maxWidth: '460px',
              boxShadow: '0 20px 45px rgba(0,0,0,0.35)',
              border: isDark ? '1px solid #484848' : '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={22} color={isDark ? '#10b981' : '#0284c7'} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Workspace Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDark ? '#a3a3a3' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderRadius: '14px',
                backgroundColor: isDark ? '#222222' : '#f8fafc',
                border: isDark ? '1px solid #3c3c3c' : '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isDark ? <Moon size={22} color="#10b981" /> : <Sun size={22} color="#f59e0b" />}
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: isDark ? '#a3a3a3' : '#64748b', marginTop: '2px' }}>
                    {isDark ? 'Dark theme active' : 'Light theme active'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                onClick={toggleDarkMode}
                style={{
                  position: 'relative',
                  width: '50px',
                  height: '28px',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isDark ? '#10b981' : '#cbd5e1',
                  transition: 'background-color 0.25s ease',
                  padding: 0,
                  flexShrink: 0,
                }}
                title="Toggle Dark Mode"
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: isDark ? '25px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'left 0.25s ease',
                  }}
                />
              </button>
            </div>

            {/* Font Size Selector */}
            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                backgroundColor: isDark ? '#222222' : '#f8fafc',
                border: isDark ? '1px solid #3c3c3c' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Editor Font Size</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#10b981' }}>{editorFontSize}px</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[13, 14, 16, 18, 20].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      setEditorFontSize(sz);
                      try { localStorage.setItem('verity_editor_font_size', String(sz)); } catch {}
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: '8px',
                      border: `1px solid ${editorFontSize === sz ? '#10b981' : (isDark ? '#484848' : '#cbd5e1')}`,
                      backgroundColor: editorFontSize === sz ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? '#333333' : '#ffffff'),
                      color: editorFontSize === sz ? '#10b981' : (isDark ? '#E8EAED' : '#475569'),
                      fontWeight: editorFontSize === sz ? '700' : '500',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sz}px
                  </button>
                ))}
              </div>
            </div>

            {/* Done Button */}
            <button
              onClick={() => setShowSettingsModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
            >
              Done
            </button>
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

      {/* MULTIPLE MONITORS MODAL */}
      {multiMonitorDetected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99998, backgroundColor: 'rgba(15, 23, 42, 0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ffffff', padding: '30px', textAlign: 'center' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '36px' }}>🖥️</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '12px', color: '#fbbf24' }}>Multiple Displays Detected</h2>
          <p style={{ fontSize: '1rem', maxWidth: '480px', color: '#cbd5e1', lineHeight: 1.5 }}>
            Verity Kiosk Enforcement policy requires a single active monitor during exams. Please disconnect secondary monitors to continue.
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { height: '100vh', width: '100%', display: 'flex', fontFamily: 'Arial, Helvetica, sans-serif', backgroundColor: '#e5e7eb', overflow: 'hidden' },
  leftSidebar: { width: '300px', height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #d1d5db', backgroundColor: '#f3f4f6', flexShrink: 0 },
  instructionSection: { flex: 1, padding: '30px', backgroundColor: '#f3f4f6', overflowY: 'auto' },
  instructionText: { color: '#1f2937', fontSize: '1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 },
  attachmentList: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', width: '100%' },
  attachThumb: { maxWidth: '100%', maxHeight: '120px', borderRadius: '8px', objectFit: 'cover', display: 'block' },
  attachVideo: { maxWidth: '100%', maxHeight: '140px', borderRadius: '8px', backgroundColor: '#000' },
  attachLink: { 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '8px',
    color: '#059669', 
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '8px 14px',
    textDecoration: 'none', 
    fontSize: '0.88rem', 
    fontWeight: '500',
    maxWidth: '100%',
    wordBreak: 'break-all',
    boxSizing: 'border-box'
  },
  greyPill: { height: '30px', backgroundColor: '#d1d5db', borderRadius: '50px', marginBottom: '15px', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.1)' },
  warningSection: { height: '250px', minHeight: '250px', backgroundColor: '#4b5563', padding: '30px', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  logContainer: { overflowY: 'auto', flex: 1, paddingRight: '5px' },
  logRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem' },
  mainArea: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  toolbar: { height: '60px', minHeight: '60px', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #d1d5db', flexShrink: 0 },
  toolGroupLeft: { display: 'flex', gap: '10px', alignItems: 'center' },
  backButton: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', color: '#4b5563', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' },
  iconButton: { padding: '8px 12px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' },
  iconButtonSaved: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#059669' },
  runButton: { padding: '8px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' },
  stopButton: { padding: '8px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' },
  strictBadge: { display: 'inline-flex', alignItems: 'center', padding: '6px 11px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '5px', color: '#b45309', fontSize: '0.78rem', fontWeight: 'bold', userSelect: 'none' },
  toolGroupRight: { display: 'flex', gap: '15px', alignItems: 'center' },
  submitButton: { padding: '8px 20px', backgroundColor: '#06b6d4', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center' },
  unsubmitBtn: { padding: '8px 20px', backgroundColor: 'white', color: '#475569', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' },
  recordingDot: { width: '12px', height: '12px', backgroundColor: '#dc2626', borderRadius: '50%', boxShadow: '0 0 8px rgba(220, 38, 38, 0.8)' },
  gearIcon: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' },
  editorWrapper: { flex: 1, minHeight: 0, backgroundColor: '#1e1e1e', position: 'relative' },
  resizeHandle: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    cursor: 'row-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background-color 0.15s ease',
    borderTop: '1px solid #d1d5db',
    borderBottom: '1px solid #e5e7eb',
    userSelect: 'none',
  },
  resizeHandleGrip: {
    width: '36px',
    height: '2px',
    backgroundColor: '#9ca3af',
    borderRadius: '2px',
  },
  terminalWrapper: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #d1d5db',
    flexShrink: 0,
    minHeight: '100px',
    maxHeight: '75vh',
    overflow: 'hidden',
  },
  terminalHeader: {
    height: '36px',
    minHeight: '36px',
    padding: '0 14px',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  terminalActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    color: '#4b5563',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  statusBadgeRunning: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '2px 8px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '12px',
    color: '#059669',
    fontSize: '0.72rem',
    fontWeight: '600',
  },
  statusBadgeIdle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '2px 8px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    color: '#6b7280',
    fontSize: '0.72rem',
    fontWeight: '500',
  },
  statusDotRunning: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 4px #10b981',
  },
  statusDotIdle: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#9ca3af',
  },
  terminalBody: {
    flex: 1,
    padding: '12px 16px',
    overflowY: 'auto',
    fontFamily: "Consolas, 'Cascadia Code', 'Courier New', monospace",
    fontSize: '0.92rem',
    lineHeight: 1.5,
    color: '#111827',
    backgroundColor: '#ffffff',
    textAlign: 'left',
  },
  terminalInputRow: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '6px',
    backgroundColor: '#f9fafb',
    padding: '4px 10px',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  terminalInput: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#111827',
    outline: 'none',
    width: '100%',
    fontFamily: "Consolas, 'Cascadia Code', 'Courier New', monospace",
    fontSize: '0.92rem',
  }
};