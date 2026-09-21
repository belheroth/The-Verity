import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// IMPORT ALL PAGES
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import ClassroomView from './pages/ClassroomView';
import StudentActivityDetail from './pages/StudentActivityDetail';
import StudentView from './pages/StudentView';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherClasswork from './pages/TeacherClasswork';
import TeacherGrading from './pages/TeacherGrading';
import TeacherView from './pages/TeacherView';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';
import syncService from './services/syncService';
import { subscribeConnectionStatus, getConnectionStatus, getCloudUrl } from './utils/api';
import { saveClassroomTheme } from './utils/classroomUtils';

// Connect to Backend (Cloud-first with local offline fallback)
const CLOUD_SOCKET = (import.meta.env.VITE_SOCKET_URL || '').replace(/\/$/, '');
const LOCAL_SOCKET = 'http://localhost:3001';

const socket = io(CLOUD_SOCKET || LOCAL_SOCKET, {
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  timeout: 5000,
  auth: (cb) => {
    const token = localStorage.getItem('verity_token') || localStorage.getItem('token');
    cb({ token });
  }
});

if (CLOUD_SOCKET && CLOUD_SOCKET !== LOCAL_SOCKET) {
  socket.on('connect_error', () => {
    if (socket.io.uri !== LOCAL_SOCKET) {
      console.warn('[Socket.IO] Cloud socket unreachable. Switching to local offline socket...');
      socket.io.uri = LOCAL_SOCKET;
      socket.connect();
    }
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (socket.io.uri !== CLOUD_SOCKET) {
        console.log('[Socket.IO] Internet restored. Switching back to cloud socket...');
        socket.io.uri = CLOUD_SOCKET;
        socket.connect();
      }
    });
  }
}

export default function App() {

  // 1. INITIALIZE STATE FROM LOCAL STORAGE
  // Instead of starting at 'login', it checks if a screen was saved previously.
  const [currentScreen, setCurrentScreen] = useState(() => {
    return localStorage.getItem('currentScreen') || 'login';
  });

  const [currentUser, setCurrentUser] = useState(() => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        return savedUser ? JSON.parse(savedUser) : null;
      } catch (e) {
        console.warn('Failed to parse currentUser from localStorage', e);
        return null;
      }
    });

    const [activeClassroom, setActiveClassroom] = useState(() => {
      try {
        const savedClass = localStorage.getItem('activeClassroom');
        return savedClass ? JSON.parse(savedClass) : null;
      } catch (e) {
        console.warn('Failed to parse activeClassroom from localStorage', e);
        return null;
      }
    });

    // The assignment the teacher is currently monitoring (carries its instruction).
    const [activeAssignment, setActiveAssignment] = useState(() => {
      try {
        const saved = localStorage.getItem('activeAssignment');
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        console.warn('Failed to parse activeAssignment from localStorage', e);
        return null;
      }
    });

  const [selectedStudentForPlayback, setSelectedStudentForPlayback] = useState(() => {
    try {
      const saved = sessionStorage.getItem('verity_playback_student');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [proctoringReturnScreen, setProctoringReturnScreen] = useState(() => {
    return sessionStorage.getItem('verity_proctoring_return') || 'teacher_classwork';
  });

  const [workspaceReturnScreen, setWorkspaceReturnScreen] = useState(() => {
    return sessionStorage.getItem('verity_workspace_return') || 'classroom_view';
  });

  useEffect(() => {
    if (selectedStudentForPlayback) {
      sessionStorage.setItem('verity_playback_student', JSON.stringify(selectedStudentForPlayback));
    } else {
      sessionStorage.removeItem('verity_playback_student');
    }
  }, [selectedStudentForPlayback]);

  useEffect(() => {
    if (proctoringReturnScreen) {
      sessionStorage.setItem('verity_proctoring_return', proctoringReturnScreen);
    }
  }, [proctoringReturnScreen]);

  useEffect(() => {
    if (workspaceReturnScreen) {
      sessionStorage.setItem('verity_workspace_return', workspaceReturnScreen);
    }
  }, [workspaceReturnScreen]);

  const [connStatus, setConnStatus] = useState(() => getConnectionStatus());

  useEffect(() => {
    const unsub = subscribeConnectionStatus(setConnStatus);
    return () => unsub();
  }, []);

  // Setup offline sync queue handler
  useEffect(() => {
    syncService.initAutoSync(() => localStorage.getItem('verity_token') || localStorage.getItem('token'));
    const token = localStorage.getItem('verity_token') || localStorage.getItem('token');
    if (token) {
      syncService.syncOfflineQueue(token);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('currentScreen', currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    const handleUserUpdate = (e) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      }
    };
    window.addEventListener('verity:user-updated', handleUserUpdate);
    return () => window.removeEventListener('verity:user-updated', handleUserUpdate);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      const token = localStorage.getItem('verity_token') || localStorage.getItem('token');
      socket.auth = { token };
      socket.emit('authenticate', { token, user: currentUser });
    } else {
      localStorage.removeItem('currentUser');
      socket.auth = {};
    }
  }, [currentUser]);

  useEffect(() => {
    const handleConnect = () => {
      const token = localStorage.getItem('verity_token') || localStorage.getItem('token');
      if (token || currentUser) {
        socket.emit('authenticate', { token, user: currentUser });
      }
    };
    socket.on('connect', handleConnect);
    if (socket.connected) handleConnect();
    return () => socket.off('connect', handleConnect);
  }, [currentUser]);

  useEffect(() => {
    if (activeClassroom) {
      localStorage.setItem('activeClassroom', JSON.stringify(activeClassroom));
    } else {
      localStorage.removeItem('activeClassroom');
    }
  }, [activeClassroom]);

  useEffect(() => {
    if (activeAssignment) {
      localStorage.setItem('activeAssignment', JSON.stringify(activeAssignment));
    } else {
      localStorage.removeItem('activeAssignment');
    }
  }, [activeAssignment]);

  // Keep activeAssignment in sync if instructor modifies it in real time
  useEffect(() => {
    if (!socket) return;
    const handleClassworkChanged = (payload) => {
      if (Array.isArray(payload?.classwork)) {
        setActiveAssignment(prev => {
          if (!prev) return prev;
          const match = payload.classwork.find(cw => String(cw.id) === String(prev.id));
          return match ? { ...prev, ...match } : prev;
        });
      }
    };
    socket.on('classwork_changed', handleClassworkChanged);
    return () => socket.off('classwork_changed', handleClassworkChanged);
  }, [socket]);

  // Keep classroom themes in sync in real-time across all views, tabs, and student sessions
  useEffect(() => {
    if (!socket) return;
    const handleThemeChanged = (data) => {
      if (!data || !data.theme) return;

      const targetClassroom = {
        id: data.classroomId,
        code: data.code,
        name: data.name,
        section: data.code || data.section
      };

      // Save locally to localStorage, update stored classroom lists, and dispatch verity:banner-updated
      saveClassroomTheme(targetClassroom, data.theme, null);

      // Keep activeClassroom in sync if it's currently open
      setActiveClassroom(prev => {
        if (!prev) return prev;
        const matches =
          (data.classroomId != null && String(prev.id) === String(data.classroomId)) ||
          (data.code && prev.code && String(prev.code).toLowerCase() === String(data.code).toLowerCase()) ||
          (data.code && prev.section && String(prev.section).toLowerCase() === String(data.code).toLowerCase()) ||
          (data.name && prev.name && String(prev.name).toLowerCase() === String(data.name).toLowerCase());

        if (matches) {
          const updated = { ...prev, theme: data.theme };
          localStorage.setItem('activeClassroom', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    };

    socket.on('classroom_theme_changed', handleThemeChanged);
    return () => socket.off('classroom_theme_changed', handleThemeChanged);
  }, [socket]);


  // Lockdown helpers — no-op outside Electron (e.g. browser dev).
  const lockDown = () => window.electronAPI?.enableLockdown?.();
  const releaseLockdown = () => window.electronAPI?.disableLockdown?.();

  // Re-assert lockdown on app reload if a student session was restored from
  // localStorage (otherwise a refresh would drop them out of kiosk mode).
  useEffect(() => {
    if (currentUser?.role === 'Student' && currentScreen !== 'login') {
      lockDown();
    }
  }, []);

  // 3. SECURE LOGOUT (Wipes the memory)
  const handleLogout = () => {
    releaseLockdown();
    setCurrentUser(null);
    setActiveClassroom(null);
    setCurrentScreen('login');
    // Clear only the session keys — keep saved classrooms/classwork so they
    // persist across logout. (Previously localStorage.clear() wiped everything.)
    localStorage.removeItem('currentScreen');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('activeClassroom');
    localStorage.removeItem('activeAssignment');
    localStorage.removeItem('verity_token');
    sessionStorage.removeItem('verity_workspace_return');
  };

// ==========================
//      ROUTING LOGIC
// ==========================

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {/* --- AUTH ROUTES --- */}
          {currentScreen === 'login' && (
            <Login
              onLogin={(user, token) => {
                setCurrentUser(user);
                if (token) localStorage.setItem('verity_token', token);
                if (user.role === 'Admin') {
                  setCurrentScreen('admin_dashboard');
                } else if (user.role === 'Teacher') {
                  setCurrentScreen('teacher_dashboard');
                } else {
                  lockDown(); // students only
                  setCurrentScreen('student_dashboard');
                }
              }}
              onGoToRegister={() => setCurrentScreen('register')}
            />
          )}

      {currentScreen === 'register' && (
        <Register onBackToLogin={() => setCurrentScreen('login')} />
      )}

      {/* --- STUDENT ROUTES (Protected) --- */}
      {currentScreen === 'student_dashboard' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <StudentDashboard
            socket={socket}
            currentUser={currentUser}
            onLogout={handleLogout}
            onEnterClassroom={(classroom) => {
              setActiveClassroom(classroom);
              setCurrentScreen('classroom_view');
            }}
          />
        </ProtectedRoute>
      )}

      {currentScreen === 'classroom_view' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <ClassroomView
            onEnterClassroom={(classroom) => {
              setActiveClassroom(classroom);
              setCurrentScreen('classroom_view');
            }}
            socket={socket}
            currentUser={currentUser}
            classroom={activeClassroom}
            onLogout={handleLogout}
            onBack={() => setCurrentScreen('student_dashboard')}
            onNavigateView={(view) => {
              localStorage.setItem('verity_student_view', view);
              setCurrentScreen('student_dashboard');
            }}
            onOpenAssignment={(task) => {
              setActiveAssignment(task);
              setCurrentScreen('student_activity_detail');
            }}
            onStartAssignment={(task) => {
              setActiveAssignment(task);
              setWorkspaceReturnScreen('classroom_view');
              setCurrentScreen('student_workspace');
            }}
          />
        </ProtectedRoute>
      )}

      {currentScreen === 'student_activity_detail' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <StudentActivityDetail
            socket={socket}
            currentUser={currentUser}
            classroom={activeClassroom}
            assignment={activeAssignment}
            onBack={() => setCurrentScreen('classroom_view')}
            onNavigateView={(view) => {
              localStorage.setItem('verity_student_view', view);
              setCurrentScreen('student_dashboard');
            }}
            onStartCoding={() => {
              setWorkspaceReturnScreen('student_activity_detail');
              setCurrentScreen('student_workspace');
            }}
            onEnterClassroom={(classroom) => {
              setActiveClassroom(classroom);
              setCurrentScreen('classroom_view');
            }}
            onLogout={handleLogout}
          />
        </ProtectedRoute>
      )}

      {currentScreen === 'student_workspace' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <StudentView
            socket={socket}
            currentUser={currentUser}
            username={currentUser?.name}
            assignment={activeAssignment}
            classroom={activeClassroom}
            onBack={() => setCurrentScreen(workspaceReturnScreen || 'classroom_view')}
          />
        </ProtectedRoute>
      )}

      {/* --- ADMIN ROUTES (Protected) --- */}
      {currentScreen === 'admin_dashboard' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <AdminDashboard onLogout={handleLogout} />
        </ProtectedRoute>
      )}

      {/* --- TEACHER ROUTES (Protected) --- */}
      {currentScreen === 'teacher_dashboard' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <TeacherDashboard
            currentUser={currentUser}
            onLogout={handleLogout}
            onEnterClassroom={(classroom) => {
              setActiveClassroom(classroom);
              setCurrentScreen('teacher_classwork');
            }}
          />
        </ProtectedRoute>
      )}

      {currentScreen === 'teacher_classwork' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <TeacherClasswork
            onEnterClassroom={(classroom) => {
              setActiveClassroom(classroom);
              setCurrentScreen('teacher_classwork');
            }}
            socket={socket}
            classroom={activeClassroom}
            onLogout={handleLogout}
            onBack={() => setCurrentScreen('teacher_dashboard')}
            onNavigateView={(view) => {
              localStorage.setItem('verity_teacher_view', view);
              setCurrentScreen('teacher_dashboard');
            }}
            onStartMonitoring={(assignment) => {
              setActiveAssignment(assignment);
              setSelectedStudentForPlayback(null);
              setProctoringReturnScreen('teacher_classwork');
              setCurrentScreen('teacher_proctoring');
            }}
            onOpenGrading={(assignment) => {
              setActiveAssignment(assignment);
              setCurrentScreen('teacher_grading');
            }}
            currentUser={currentUser}
            onOpenPlayback={(assignment, student) => {
              setActiveAssignment(assignment);
              setSelectedStudentForPlayback(student);
              setProctoringReturnScreen('teacher_classwork');
              setCurrentScreen('teacher_proctoring');
            }}
          />
        </ProtectedRoute>
      )}

      {currentScreen === 'teacher_grading' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <TeacherGrading
            socket={socket}
            classroom={activeClassroom}
            assignment={activeAssignment}
            onLogout={handleLogout}
            onBack={() => setCurrentScreen('teacher_classwork')}
            onEnterClassroom={(classroom) => {
              setActiveClassroom(classroom);
              setCurrentScreen('teacher_classwork');
            }}
            onNavigateView={(view) => {
              localStorage.setItem('verity_teacher_view', view);
              setCurrentScreen('teacher_dashboard');
            }}
            onOpenPlayback={(assignment, student) => {
              setActiveAssignment(assignment);
              setSelectedStudentForPlayback(student);
              setProctoringReturnScreen('teacher_grading');
              setCurrentScreen('teacher_proctoring');
            }}
            onStartMonitoring={(assignment, student) => {
              setActiveAssignment(assignment);
              setSelectedStudentForPlayback(student || null);
              setProctoringReturnScreen('teacher_grading');
              setCurrentScreen('teacher_proctoring');
            }}
            currentUser={currentUser}
          />
        </ProtectedRoute>
      )}

      {currentScreen === 'teacher_proctoring' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <TeacherView
            socket={socket}
            assignment={activeAssignment}
            classroom={activeClassroom}
            initialStudent={selectedStudentForPlayback}
            mode={proctoringReturnScreen === 'teacher_grading' ? 'playback' : 'live'}
            onBack={() => setCurrentScreen(proctoringReturnScreen || 'teacher_grading')}
            onLogout={() => setCurrentScreen(proctoringReturnScreen || 'teacher_classwork')}
          />
        </ProtectedRoute>
      )}

      {/* Fallback for unknown screens */}
      {currentUser && !['student_dashboard', 'classroom_view', 'student_activity_detail', 'student_workspace', 'admin_dashboard', 'teacher_dashboard', 'teacher_classwork', 'teacher_grading', 'teacher_proctoring'].includes(currentScreen) && (
        <NotFound />
      )}

      {/* Final fallback - if nothing matches, show login screen to prevent white screen */}
      {!currentUser && !['login', 'register'].includes(currentScreen) && (
        <Login
          onLogin={(user, token) => {
            setCurrentUser(user);
            if (token) localStorage.setItem('verity_token', token);
            if (user.role === 'Admin') {
              setCurrentScreen('admin_dashboard');
            } else if (user.role === 'Teacher') {
              setCurrentScreen('teacher_dashboard');
            } else {
              lockDown(); // students only
              setCurrentScreen('student_dashboard');
            }
          }}
          onGoToRegister={() => setCurrentScreen('register')}
        />
      )}

      {/* --- OFFLINE LOCAL FALLBACK BANNER --- */}
      {connStatus?.activeMode === 'local' && Boolean(getCloudUrl()) && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '8px 18px',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.12)',
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: '#f59e0b',
            boxShadow: '0 0 8px #f59e0b',
            display: 'inline-block'
          }}></span>
          <span>Offline Mode &bull; Working locally &bull; Changes will sync when reconnected</span>
        </div>
      )}
    </div>
  );
}