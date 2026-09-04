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

// Connect to Backend
const socket = io('http://localhost:3001');

export default function App() {
  
  // 1. INITIALIZE STATE FROM LOCAL STORAGE
  // Instead of starting at 'login', it checks if a screen was saved previously.
  const [currentScreen, setCurrentScreen] = useState(() => {
    return localStorage.getItem('currentScreen') || 'login';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [activeClassroom, setActiveClassroom] = useState(() => {
    const savedClass = localStorage.getItem('activeClassroom');
    return savedClass ? JSON.parse(savedClass) : null;
  });

  // The assignment the teacher is currently monitoring (carries its instruction).
  const [activeAssignment, setActiveAssignment] = useState(() => {
    const saved = localStorage.getItem('activeAssignment');
    return saved ? JSON.parse(saved) : null;
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

  // --- AUTH ROUTES ---
  if (currentScreen === 'login') {
    return (
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
    );
  }

  if (currentScreen === 'register') {
    return <Register onBackToLogin={() => setCurrentScreen('login')} />;
  }

  // --- STUDENT ROUTES ---
  if (currentScreen === 'student_dashboard') {
    return (
      <StudentDashboard 
        onLogout={handleLogout} 
        onEnterClassroom={(classroom) => {
          setActiveClassroom(classroom);
          setCurrentScreen('classroom_view');
        }} 
      />
    );
  }

  if (currentScreen === 'classroom_view') {
    return (
      <ClassroomView
        socket={socket}
        classroom={activeClassroom}
        onBack={() => setCurrentScreen('student_dashboard')}
        onEnterClassroom={(classroom) => setActiveClassroom(classroom)}
        onOpenAssignment={(task) => {
          setActiveAssignment(task);
          setCurrentScreen('student_workspace');
        }}
      />
    );
  }

  if (currentScreen === 'student_workspace') {
    return (
      <StudentView
        socket={socket}
        username={currentUser?.name}
        assignment={activeAssignment}
        classroom={activeClassroom}
        onBack={() => setCurrentScreen('classroom_view')}
      />
    );
  }

  // --- ADMIN ROUTES ---
  if (currentScreen === 'admin_dashboard') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  // --- TEACHER ROUTES ---
  if (currentScreen === 'teacher_dashboard') {
    return (
      <TeacherDashboard
        onLogout={handleLogout}
        onEnterClassroom={(classroom) => {
          setActiveClassroom(classroom);
          setCurrentScreen('teacher_classwork');
        }}
      />
    );
  }

  if (currentScreen === 'teacher_classwork') {
    return (
      <TeacherClasswork
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
    );
  }

  if (currentScreen === 'teacher_grading') {
    return (
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
    );
  }

  if (currentScreen === 'teacher_proctoring') {
    return (
      <TeacherView
        socket={socket}
        assignment={activeAssignment}
        classroom={activeClassroom}
        onLogout={() => setCurrentScreen('teacher_classwork')}
      />
    );
  }

  // Fallback
  return <div>Unknown Screen</div>;
}