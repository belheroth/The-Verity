import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// IMPORT ALL PAGES
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import ClassroomView from './pages/ClassroomView';
import StudentView from './pages/StudentView';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherClasswork from './pages/TeacherClasswork';
import TeacherGrading from './pages/TeacherGrading';
import TeacherView from './pages/TeacherView';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';

// Connect to Backend
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');

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

  // 2. AUTO-SAVE TO LOCAL STORAGE WHENEVER STATE CHANGES
  useEffect(() => {
    localStorage.setItem('currentScreen', currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
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
  };

// ==========================
//      ROUTING LOGIC
// ==========================

  return (
    <>
      {/* --- AUTH ROUTES --- */}
      {currentScreen === 'login' && (
        <Login
          onLogin={(user) => {
            setCurrentUser(user);
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
            classroom={activeClassroom}
            onBack={() => setCurrentScreen('student_dashboard')}
            onOpenAssignment={(task) => {
              setActiveAssignment(task);
              setCurrentScreen('student_workspace');
            }}
          />
        </ProtectedRoute>
      )}

      {currentScreen === 'student_workspace' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <StudentView
            socket={socket}
            username={currentUser?.name}
            assignment={activeAssignment}
            classroom={activeClassroom}
            onBack={() => setCurrentScreen('classroom_view')}
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
            }}
            socket={socket}
            classroom={activeClassroom}
            onLogout={handleLogout}
            onBack={() => setCurrentScreen('teacher_dashboard')}
            onStartMonitoring={(assignment) => {
              setActiveAssignment(assignment);
              setCurrentScreen('teacher_proctoring');
            }}
            onOpenGrading={(assignment) => {
              setActiveAssignment(assignment);
              setCurrentScreen('teacher_grading');
            }}
          />
        </ProtectedRoute>
      )}

      {currentScreen === 'teacher_grading' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <TeacherGrading
            classroom={activeClassroom}
            assignment={activeAssignment}
            onLogout={handleLogout}
            onBack={() => setCurrentScreen('teacher_classwork')}
            onStartMonitoring={(assignment) => {
              setActiveAssignment(assignment);
              setCurrentScreen('teacher_proctoring');
            }}
          />
        </ProtectedRoute>
      )}

      {currentScreen === 'teacher_proctoring' && (
        <ProtectedRoute currentUser={currentUser} setCurrentScreen={setCurrentScreen}>
          <TeacherView
            socket={socket}
            assignment={activeAssignment}
            classroom={activeClassroom}
            onLogout={() => setCurrentScreen('teacher_classwork')}
          />
        </ProtectedRoute>
      )}

      {/* Fallback for unknown screens */}
      {currentUser && !['student_dashboard', 'classroom_view', 'student_workspace', 'admin_dashboard', 'teacher_dashboard', 'teacher_classwork', 'teacher_grading', 'teacher_proctoring'].includes(currentScreen) && (
        <NotFound />
      )}

      {/* Final fallback - if nothing matches, show login screen to prevent white screen */}
      {!currentUser && !['login', 'register'].includes(currentScreen) && (
        <Login
          onLogin={(user) => {
            setCurrentUser(user);
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
    </>
  );
}