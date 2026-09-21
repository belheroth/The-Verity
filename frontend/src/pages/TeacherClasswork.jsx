import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import ProfileMenu from './ProfileMenu';
import { 
  Calendar, ClipboardList, Settings, User, MoreVertical, ArrowLeft, X, Link2, 
  Image, Video, Monitor, Menu, Home, Archive, Edit3, Maximize2, Copy, Check, 
  Info, Users, BookOpen, Sparkles, Plus, Send, ChevronRight, CheckCircle2, 
  MessageSquare, PlayCircle, Eye, RefreshCw, Palette, ExternalLink
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import Skeleton from '../components/Skeleton';
import { useDarkMode } from '../hooks/useDarkMode';
import { useSidebarNav } from '../hooks/useSidebarNav';
import { isPhantomClassroom, mergeClassroomsPreservingOrder, THEME_PRESETS, getClassroomTheme, saveClassroomTheme } from '../utils/classroomUtils';
import ImagePreviewModal from '../components/ImagePreviewModal';
import AddLinkModal from '../components/AddLinkModal';
import VideoPreviewModal from '../components/VideoPreviewModal';
import VideoAttachment from '../components/VideoAttachment';
import AttachmentCard from '../components/AttachmentCard';

const EMPTY_FORM = { title: '', noDueDate: true, dueDate: '', instruction: '', points: '100', grading: 'On', attachments: [] };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatShortDate = (value) => {
  if (!value) return '';
  let d;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(value);
  }
  if (isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

const isLegacyHardcoded = (item) => (item?.id === 1 || item?.id === 2) && (item?.title?.startsWith('Activity 1:') || item?.title?.startsWith('Activity 2:'));



export default function TeacherClasswork({ 
  classroom, 
  onBack, 
  onLogout, 
  onStartMonitoring, 
  onOpenGrading, 
  onOpenPlayback,
  socket, 
  onEnterClassroom, 
  onNavigateView,
  currentUser 
}) {
  const { isDark } = useDarkMode();
  const styles = getStyles(isDark);
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

  // Active classroom tab
  const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'classwork' | 'people' | 'grades'

  // Persist classwork per classroom
  const storageKey = `verity_classwork_${classroom?.id ?? 'default'}`;
  const classroomId = classroom?.id ?? 'default';

  const [classwork, setClasswork] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(item => !isLegacyHardcoded(item)) : [];
    } catch {
      return [];
    }
  });

  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${import.meta.env.VITE_API_URL}/classwork/${classroomId}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data.classwork)) {
          setClasswork(data.classwork.filter(item => !isLegacyHardcoded(item)));
        }
      })
      .catch(() => { /* offline — fall back to localStorage copy */ })
      .finally(() => { if (!cancelled) setLoadingClasswork(false); hydrated.current = true; });
    return () => { cancelled = true; };
  }, [classroomId]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(classwork));
    if (hydrated.current) {
      if (socket) {
        socket.emit('classwork_updated', { classroomId, classwork });
      }
      apiFetch(`${import.meta.env.VITE_API_URL}/classwork/${classroomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classwork })
      }).catch(err => console.warn('Classwork REST sync warning:', err));
    }
  }, [classwork, storageKey, classroomId, socket]);

  const [activeMenu, setActiveMenu] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [submissionData, setSubmissionData] = useState({ counts: {}, studentCount: 0 });
  const [loadingClasswork, setLoadingClasswork] = useState(true);

  const toggleExpand = (id) => setExpandedId(prev => (prev === id ? null : id));

  useEffect(() => {
    const load = () => {
      apiFetch(`${import.meta.env.VITE_API_URL}/submission-counts`)
        .then(res => res.json())
        .then(data => setSubmissionData({ counts: data.counts || {}, studentCount: data.studentCount || 0 }))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  // Class code & theme
  const classCode = classroom?.code || classroom?.section || (classroom?.id ? `vji${classroom.id}ku4` : 'vji3bku4');
  const [bannerTheme, setBannerTheme] = useState(() => getClassroomTheme(classroom));

  // Reset banner theme when classroom changes
  useEffect(() => {
    setBannerTheme(getClassroomTheme(classroom));
  }, [classroom?.id, classroom?.code, classroom?.section, classroom?.name, classroom?.theme]);

  // Real-time socket & window theme updates listener
  useEffect(() => {
    const handleUpdate = (e) => {
      const detail = e.detail;
      if (!detail) return;
      const matches =
        (classroom?.id != null && String(detail.classroomId) === String(classroom.id)) ||
        (classroom?.code && detail.code && String(detail.code).toLowerCase() === String(classroom.code).toLowerCase()) ||
        (classroom?.section && detail.code && String(detail.code).toLowerCase() === String(classroom.section).toLowerCase()) ||
        (classroom?.name && detail.name && String(detail.name).toLowerCase() === String(classroom.name).toLowerCase()) ||
        (detail.keys && detail.keys.includes(`verity_classroom_theme_${classroom?.id}`));

      if (matches && detail.theme) {
        setBannerTheme(detail.theme);
      }
    };

    window.addEventListener('verity:banner-updated', handleUpdate);
    if (socket) {
      socket.on('classroom_theme_changed', (data) => handleUpdate({ detail: data }));
    }
    return () => {
      window.removeEventListener('verity:banner-updated', handleUpdate);
      if (socket) {
        socket.off('classroom_theme_changed');
      }
    };
  }, [classroom?.id, classroom?.code, classroom?.section, classroom?.name, classroom?.theme, socket]);

  // Modal dialog states
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isClassCodeModalOpen, setIsClassCodeModalOpen] = useState(false);
  const [isClassInfoModalOpen, setIsClassInfoModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [originalBannerTheme, setOriginalBannerTheme] = useState(null);



  // Enrolled students and Instructor Info for People tab
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [instructorInfo, setInstructorInfo] = useState({
    name: classroom?.instructor || (currentUser?.role === 'Teacher' ? currentUser.name : ''),
    email: classroom?.instructorEmail || classroom?.instructor_email || (currentUser?.role === 'Teacher' ? currentUser.email : ''),
    avatar: (currentUser?.role === 'Teacher' && currentUser?.avatar) ? currentUser.avatar : null
  });

  useEffect(() => {
    if (!classroom?.id) return;
    setLoadingStudents(true);

    const loadStudents = async () => {
      const studentsMap = {};

      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('verity_student_classrooms_')) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const match = list.some(c => 
                  c.id === classroom.id || 
                  (c.code && c.code.toLowerCase() === classCode.toLowerCase()) ||
                  (c.section && c.section.toLowerCase() === (classroom.section || '').toLowerCase())
                );
                if (match) {
                  const studentName = k.replace('verity_student_classrooms_', '');
                  studentsMap[studentName.toLowerCase()] = { 
                    name: studentName, 
                    email: `${studentName.toLowerCase().replace(/\s+/g, '.')}@student.verity.edu`,
                    avatar: null
                  };
                }
              }
            }
          }
        }
      } catch {}

      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL}/classroom-students/${classroom.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.instructor && data.instructor.name) {
            setInstructorInfo({
              name: data.instructor.name,
              email: data.instructor.email || '',
              avatar: data.instructor.avatar || (currentUser?.role === 'Teacher' && currentUser?.avatar ? currentUser.avatar : null)
            });
          }
          if (Array.isArray(data.students)) {
            data.students.forEach(s => {
              if (s && s.name) {
                studentsMap[s.name.toLowerCase()] = { 
                  name: s.name, 
                  email: s.email || `${s.name.toLowerCase().replace(/\s+/g, '.')}@student.verity.edu`,
                  avatar: s.avatar || null
                };
              }
            });
          }
        }
      } catch {}

      // Check explicit local enrollments
      try {
        const localKey = `verity_classroom_enrollments_${classroom.id}`;
        const rawLocal = localStorage.getItem(localKey);
        if (rawLocal) {
          const arr = JSON.parse(rawLocal);
          if (Array.isArray(arr)) {
            arr.forEach(s => {
              if (s && s.name) {
                studentsMap[s.name.toLowerCase()] = {
                  name: s.name,
                  email: s.email || `${s.name.toLowerCase().replace(/\s+/g, '.')}@student.verity.edu`,
                  avatar: s.avatar || studentsMap[s.name.toLowerCase()]?.avatar || null
                };
              }
            });
          }
        }
      } catch {}

      setEnrolledStudents(Object.values(studentsMap));
      setLoadingStudents(false);
    };

    loadStudents();

    const handleAvatarBroadcast = (data) => {
      if (!data) return;
      setInstructorInfo(prev => {
        if (prev && (
          (data.email && prev.email && data.email.toLowerCase() === prev.email.toLowerCase()) ||
          (data.name && prev.name && data.name.toLowerCase() === prev.name.toLowerCase())
        )) {
          return { ...prev, avatar: data.avatar };
        }
        return prev;
      });

      setEnrolledStudents(prev => prev.map(s => {
        if (
          (data.email && s.email && data.email.toLowerCase() === data.email.toLowerCase()) ||
          (data.name && s.name && data.name.toLowerCase() === data.name.toLowerCase())
        ) {
          return { ...s, avatar: data.avatar };
        }
        return s;
      }));
    };

    if (socket) {
      socket.on('user_avatar_updated', handleAvatarBroadcast);
    }

    return () => {
      if (socket) {
        socket.off('user_avatar_updated', handleAvatarBroadcast);
      }
    };
  }, [classroom?.id, classCode, classroom?.section, socket, currentUser]);

  // GRADES TAB STATE (Scoped to this classroom only)
  const visibleClasswork = classwork.filter(item => !item.archived);
  const [selectedGradingActivityId, setSelectedGradingActivityId] = useState(null);

  useEffect(() => {
    if (visibleClasswork.length > 0 && !selectedGradingActivityId) {
      setSelectedGradingActivityId(visibleClasswork[0].id);
    }
  }, [visibleClasswork, selectedGradingActivityId]);

  const activeGradingActivity = visibleClasswork.find(a => a.id === selectedGradingActivityId) || visibleClasswork[0];
  const gradesKey = `verity_grades_${activeGradingActivity?.id ?? 'default'}`;
  const maxPoints = parseInt(activeGradingActivity?.points, 10) || 100;

  const [gradingStudents, setGradingStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [gradingGrades, setGradingGrades] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(gradesKey)) || {};
    } catch { return {}; }
  });
  const [studentGradeInput, setStudentGradeInput] = useState(String(maxPoints));
  const [studentFeedbackInput, setStudentFeedbackInput] = useState('');
  const [showBulkGradeModal, setShowBulkGradeModal] = useState(false);
  const [bulkGradeVal, setBulkGradeVal] = useState(String(maxPoints));
  const [bulkFeedbackVal, setBulkFeedbackVal] = useState('Great work!');
  const [bulkToastMsg, setBulkToastMsg] = useState('');

  // Load ONLY students who have submitted this activity for this classroom
  useEffect(() => {
    if (!activeGradingActivity?.id) {
      setGradingStudents([]);
      return;
    }

    const loadActivitySubs = () => {
      const aId = activeGradingActivity.id;
      apiFetch(`${import.meta.env.VITE_API_URL}/submissions/${aId}`)
        .then(res => res.json())
        .then(data => {
          const subs = Array.isArray(data?.submissions) ? data.submissions : [];
          const localSubs = [];
          const cId = classroom?.id ?? 'default';

          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith(`verity_sub_${cId}_${aId}_`) || k.startsWith(`verity_sub_default_${aId}_`))) {
                const val = JSON.parse(localStorage.getItem(k));
                if (val && (val.studentName || val.studentId)) localSubs.push(val);
              }
            }
          } catch {}

          const map = {};
          subs.forEach(s => {
            const sName = s.student_name || s.studentName || 'Unknown';
            map[sName] = { id: sName, name: sName, submittedAt: s.submittedAt, finalCode: s.finalCode, history: s.history || [] };
          });
          localSubs.forEach(s => {
            const sName = s.studentName || s.studentId || 'Unknown';
            if (!map[sName]) {
              map[sName] = { id: sName, name: sName, submittedAt: s.submittedAt, finalCode: s.finalCode, history: s.codeHistory || [] };
            }
          });

          const list = Object.values(map);
          setGradingStudents(list);
          setSelectedStudentId(prev => (prev && map[prev] ? prev : (list[0]?.id || null)));
        })
        .catch(() => {});
    };

    loadActivitySubs();

    apiFetch(`${import.meta.env.VITE_API_URL}/grades/${activeGradingActivity.id}`)
      .then(res => res.json())
      .then(data => {
        if (data?.grades) setGradingGrades(prev => ({ ...prev, ...data.grades }));
      })
      .catch(() => {});
  }, [activeGradingActivity?.id, classroom?.id]);

  useEffect(() => {
    localStorage.setItem(gradesKey, JSON.stringify(gradingGrades));
  }, [gradingGrades, gradesKey]);

  useEffect(() => {
    if (selectedStudentId) {
      const saved = gradingGrades[selectedStudentId];
      setStudentGradeInput(saved?.grade != null ? String(saved.grade) : String(maxPoints));
      setStudentFeedbackInput(saved?.feedback || '');
    }
  }, [selectedStudentId, gradingGrades, maxPoints]);

  const handleSaveIndividualGrade = () => {
    if (!selectedStudentId || !activeGradingActivity) return;
    const updated = {
      ...gradingGrades,
      [selectedStudentId]: { grade: studentGradeInput, feedback: studentFeedbackInput, gradedAt: true }
    };
    setGradingGrades(updated);
    localStorage.setItem(gradesKey, JSON.stringify(updated));

    apiFetch(`${import.meta.env.VITE_API_URL}/grades/${activeGradingActivity.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: selectedStudentId, grade: studentGradeInput, feedback: studentFeedbackInput })
    }).catch(() => {});
  };

  // BULK GRADING: Grades ONLY the students who have submitted!
  const handleApplyBulkGrade = async () => {
    if (!activeGradingActivity || gradingStudents.length === 0) return;

    const updated = { ...gradingGrades };
    const payload = [];

    gradingStudents.forEach(s => {
      updated[s.id] = { grade: bulkGradeVal, feedback: bulkFeedbackVal, gradedAt: true };
      payload.push({ studentId: s.id, grade: bulkGradeVal, feedback: bulkFeedbackVal });
    });

    setGradingGrades(updated);
    localStorage.setItem(gradesKey, JSON.stringify(updated));

    try {
      await apiFetch(`${import.meta.env.VITE_API_URL}/grades/${activeGradingActivity.id}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: payload })
      });
    } catch {
      payload.forEach(p => {
        apiFetch(`${import.meta.env.VITE_API_URL}/grades/${activeGradingActivity.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p)
        }).catch(() => {});
      });
    }

    setBulkToastMsg(`Successfully graded all ${gradingStudents.length} submitted student(s)!`);
    setTimeout(() => setBulkToastMsg(''), 3500);
    setShowBulkGradeModal(false);
  };

  // Classwork modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const uploadFile = async (file, type) => {
    const filename = file.name;
    const cleanFilename = encodeURIComponent(filename);

    // 1. Direct binary streaming upload (fast, supports 100MB+ MP4/WebM/MOV)
    try {
      const token = localStorage.getItem('verity_token') || localStorage.getItem('token');
      const headers = { 'X-Filename': filename };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/upload-raw?filename=${cleanFilename}`, {
        method: 'POST',
        headers,
        body: file
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          return { type, name: filename, url: data.url };
        }
      }
    } catch (rawErr) {
      console.warn('Direct stream upload failed, trying base64...', rawErr);
    }

    // 2. Base64 fallback to /upload (for smaller images/clips)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, dataUrl })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          return { type, name: filename, url: data.url };
        }
      }
    } catch (b64Err) {
      console.warn('Base64 fallback failed:', b64Err);
    }

    // 3. Object URL fallback so the video is immediately playable in current session
    return { type, name: filename, url: URL.createObjectURL(file) };
  };

  const handleFilePicked = async (e, type) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const attachment = await uploadFile(file, type);
    setForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), attachment] }));
    setUploading(false);
  };

  const handleAddLink = () => {
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = (linkAttachment) => {
    setForm(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), linkAttachment]
    }));
  };

  // Keyboard shortcut (Ctrl+K / Cmd+K) to open Link modal when assignment modal is open
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsLinkModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const removeAttachment = (index) => {
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  const handleDeleteClasswork = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this classwork?")) {
      setClasswork(classwork.filter(c => c.id !== id));
    }
    setActiveMenu(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openModify = (e, item) => {
    e.stopPropagation();
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      noDueDate: item.dueDate ? false : true,
      dueDate: item.dueDate || '',
      instruction: item.details || '',
      points: item.points || '100',
      grading: item.grading || 'On',
      attachments: item.attachments || []
    });
    setActiveMenu(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      title: form.title,
      details: form.instruction,
      dueDate: form.noDueDate ? '' : form.dueDate,
      points: form.points,
      grading: form.grading,
      attachments: form.attachments || []
    };

    if (editingId) {
      setClasswork(classwork.map(item => item.id === editingId ? { ...item, ...data } : item));
    } else {
      setClasswork([{ id: Date.now(), archived: false, posted: new Date().toISOString(), ...data }, ...classwork]);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleArchive = (e, id) => {
    e.stopPropagation();
    setClasswork(classwork.map(item => item.id === id ? { ...item, archived: true } : item));
    setActiveMenu(null);
  };

  const handleCopy = (e, item) => {
    e.stopPropagation();
    const copy = { ...item, id: Date.now(), title: `${item.title} (Copy)` };
    setClasswork([copy, ...classwork]);
    setActiveMenu(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Upcoming items
  const upcomingItems = visibleClasswork
    .filter(item => item.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3);

  // SVG Illustration for Google Classroom Banner
  const renderBannerIllustration = () => {
    if (bannerTheme.id === 'ocean_academia') {
      return (
        <svg viewBox="0 0 400 240" fill="none" style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
          <circle cx="280" cy="120" r="140" fill="#0d47a1" opacity="0.4" />
          <path d="M220 180 L280 60 L340 180" stroke="#60a5fa" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="280" cy="60" r="12" fill="#93c5fd" />
          <path d="M235 150 L325 150" stroke="#93c5fd" strokeWidth="4" />
          <rect x="180" y="80" width="80" height="90" rx="8" fill="#1e3a8a" transform="rotate(-15 180 80)" />
          <line x1="190" y1="100" x2="245" y2="90" stroke="#60a5fa" strokeWidth="3" />
          <line x1="195" y1="120" x2="250" y2="110" stroke="#60a5fa" strokeWidth="3" />
        </svg>
      );
    }

    if (bannerTheme.id === 'royal_violet') {
      return (
        <svg viewBox="0 0 400 240" fill="none" style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
          <circle cx="300" cy="120" r="150" fill="#581c87" opacity="0.4" />
          <path d="M230 160 C210 100, 350 70, 340 170 C330 200, 250 200, 230 160 Z" fill="#9333ea" />
          <circle cx="260" cy="140" r="8" fill="#f43f5e" />
          <circle cx="280" cy="115" r="8" fill="#38bdf8" />
          <circle cx="310" cy="130" r="8" fill="#facc15" />
          <rect x="200" y="50" width="16" height="130" rx="6" fill="#c084fc" transform="rotate(35 200 50)" />
        </svg>
      );
    }

    if (bannerTheme.id === 'warm_amber') {
      return (
        <svg viewBox="0 0 400 240" fill="none" style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
          <circle cx="300" cy="120" r="140" fill="#9a3412" opacity="0.4" />
          <rect x="220" y="70" width="100" height="120" rx="10" fill="#f97316" transform="rotate(-12 220 70)" />
          <rect x="240" y="90" width="95" height="115" rx="10" fill="#fed7aa" transform="rotate(15 240 90)" />
          <path d="M220 180 Q270 120 330 70" stroke="#ffedd5" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    }

    if (bannerTheme.id === 'midnight_slate') {
      return (
        <svg viewBox="0 0 400 240" fill="none" style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
          <circle cx="290" cy="120" r="140" fill="#1e293b" opacity="0.6" />
          <rect x="210" y="60" width="150" height="100" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="3" />
          <circle cx="225" cy="74" r="3" fill="#ef4444" />
          <circle cx="235" cy="74" r="3" fill="#eab308" />
          <circle cx="245" cy="74" r="3" fill="#22c55e" />
          <path d="M235 110 L250 125 L235 140" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="260" y1="140" x2="280" y2="140" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    }

    // Default: Emerald Books (Matching user screenshot!)
    return (
      <svg viewBox="0 0 420 240" fill="none" style={{ position: 'absolute', right: 0, top: 0, height: '100%', pointerEvents: 'none' }}>
        <circle cx="310" cy="120" r="150" fill="#0d5d28" opacity="0.45" />

        <g transform="translate(230, 40) rotate(-28)">
          <rect x="-10" y="-10" width="130" height="150" rx="10" fill="#0f5132" />
          <rect x="0" y="0" width="115" height="135" rx="6" fill="#c6f6d5" />
          <line x1="15" y1="25" x2="100" y2="25" stroke="#9ae6b4" strokeWidth="2.5" />
          <line x1="15" y1="45" x2="100" y2="45" stroke="#9ae6b4" strokeWidth="2.5" />
          <line x1="15" y1="65" x2="100" y2="65" stroke="#9ae6b4" strokeWidth="2.5" />
          <line x1="15" y1="85" x2="100" y2="85" stroke="#9ae6b4" strokeWidth="2.5" />
          <line x1="15" y1="105" x2="100" y2="105" stroke="#9ae6b4" strokeWidth="2.5" />
          <path d="M55 0 L55 90 L62 82 L70 90 L70 0 Z" fill="#fb923c" />
        </g>

        <g transform="translate(270, 75) rotate(14)">
          <rect x="-8" y="-8" width="140" height="145" rx="10" fill="#1e293b" />
          <rect x="0" y="0" width="128" height="132" rx="6" fill="#f8fafc" />
          <line x1="15" y1="25" x2="110" y2="25" stroke="#e2e8f0" strokeWidth="2.5" />
          <line x1="15" y1="45" x2="110" y2="45" stroke="#e2e8f0" strokeWidth="2.5" />
          <line x1="15" y1="65" x2="110" y2="65" stroke="#e2e8f0" strokeWidth="2.5" />
          <line x1="15" y1="85" x2="110" y2="85" stroke="#e2e8f0" strokeWidth="2.5" />
          <line x1="15" y1="105" x2="110" y2="105" stroke="#e2e8f0" strokeWidth="2.5" />

          <path d="M90 0 L90 75 L98 68 L106 75 L106 0 Z" fill="#ef4444" />

          <g transform="translate(-15, 30) rotate(-42)">
            <rect x="0" y="0" width="140" height="24" rx="4" fill="#f43f5e" />
            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130].map(x => (
              <line key={x} x1={x} y1="0" x2={x} y2={x % 20 === 0 ? "10" : "6"} stroke="white" strokeWidth="1.5" />
            ))}
          </g>
        </g>
      </svg>
    );
  };

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
            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
            className="icon-btn-anim"
          >
            <Menu size={24} color={isDark ? '#d4d4d4' : '#64748b'} />
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
            <span style={styles.badge}>Instructor</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ProfileMenu currentUser={currentUser} onLogout={onLogout} />
        </div>
      </header>

      {/* ═══ MAIN LAYOUT WITH SIDEBAR ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR NAVIGATION (UNTOUCHED) */}
        <aside {...sidebarProps} style={styles.sidebar(collapsed)}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: indicatorStyle.top,
              height: indicatorStyle.height,
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '14px',
              boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' : '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
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
              {!collapsed && <span style={styles.sidebarBtnText}>Home</span>}
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
              {!collapsed && <span style={styles.sidebarBtnText}>Calendar</span>}
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
              {!collapsed && <span style={styles.sidebarBtnText}>Archived</span>}
            </button>

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
                      onClick={() => { if (onEnterClassroom) onEnterClassroom(cls); }}
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
                {!collapsed && <span style={styles.sidebarBtnText}>Settings</span>}
              </button>
            </div>
          </nav>
        </aside>

        {/* ═══ MAIN CONTENT AREA (Padded area containing the Big Box) ═══ */}
        <div style={styles.mainContent}>

          {/* ═══ THE BIG BOX CONTAINING THE TABS & CLASSROOM VIEWS (Static box - no fade on container) ═══ */}
          <div style={styles.bigBoxContainer}>

            {/* CLASSROOM TOP NAV TABS INSIDE THE BIG BOX */}
            <div style={styles.classroomNavHeader}>
              <div style={styles.classroomTabsGroup}>
                <button
                  onClick={() => setActiveTab('stream')}
                  style={{
                    ...styles.classroomTabBtn,
                    color: activeTab === 'stream' ? '#10b981' : (isDark ? '#a3a3a3' : '#5f6368'),
                    borderBottom: activeTab === 'stream' ? '3px solid #10b981' : '3px solid transparent'
                  }}
                >
                  Stream
                </button>
                <button
                  onClick={() => setActiveTab('classwork')}
                  style={{
                    ...styles.classroomTabBtn,
                    color: activeTab === 'classwork' ? '#10b981' : (isDark ? '#a3a3a3' : '#5f6368'),
                    borderBottom: activeTab === 'classwork' ? '3px solid #10b981' : '3px solid transparent'
                  }}
                >
                  Classwork
                </button>
                <button
                  onClick={() => setActiveTab('people')}
                  style={{
                    ...styles.classroomTabBtn,
                    color: activeTab === 'people' ? '#10b981' : (isDark ? '#a3a3a3' : '#5f6368'),
                    borderBottom: activeTab === 'people' ? '3px solid #10b981' : '3px solid transparent'
                  }}
                >
                  People
                </button>
                <button
                  onClick={() => setActiveTab('grades')}
                  style={{
                    ...styles.classroomTabBtn,
                    color: activeTab === 'grades' ? '#10b981' : (isDark ? '#a3a3a3' : '#5f6368'),
                    borderBottom: activeTab === 'grades' ? '3px solid #10b981' : '3px solid transparent'
                  }}
                >
                  Grades
                </button>
              </div>

              {/* Right-side Classroom Settings Gear Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  style={styles.iconActionBtn}
                  title="Classroom settings"
                >
                  <Settings size={22} color={isDark ? '#a3a3a3' : '#5f6368'} />
                </button>
              </div>
            </div>

            {/* SCROLLABLE INNER BODY OF THE BIG BOX */}
            <div style={styles.bigBoxInnerScroll}>
              <motion.div
                key={`${classroom?.id || 'cls'}_${activeTab}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
              >

              {/* ═══ TAB 1: STREAM ═══ */}
              {activeTab === 'stream' && (
                <div style={styles.streamContainer}>

                  {/* HERO BANNER (CUSTOMIZABLE) */}
                  <div style={{
                    ...styles.bannerCard,
                    background: bannerTheme.customImageUrl 
                      ? `url(${bannerTheme.customImageUrl}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${bannerTheme.primary}, ${bannerTheme.secondary})`,
                  }}>
                    {/* Vector Illustration Overlay */}
                    {!bannerTheme.customImageUrl && renderBannerIllustration()}

                    {/* Banner Content (Class Title & Subtitle) */}
                    <div style={styles.bannerInfo}>
                      <h1 style={styles.bannerTitle}>
                        {classroom?.name || "Verity"}
                      </h1>
                      <div style={styles.bannerSubtitle}>
                        {classroom?.section || classroom?.subject || "2"}
                      </div>
                    </div>

                    {/* Top-Right "Customize" Button */}
                    <button
                      onClick={() => {
                        setOriginalBannerTheme(bannerTheme);
                        setIsCustomizeOpen(true);
                      }}
                      style={styles.customizeBtn}
                      title="Customize class theme and background"
                    >
                      <Edit3 size={16} color={isDark ? '#E8EAED' : '#1e293b'} />
                      <span>Customize</span>
                    </button>

                    {/* Bottom-Right "(i)" Info Button */}
                    <button
                      onClick={() => setIsClassInfoModalOpen(true)}
                      style={styles.infoBtn}
                      title="Class details"
                    >
                      <Info size={20} color="#ffffff" />
                    </button>
                  </div>

                  {/* TWO-COLUMN STREAM BODY */}
                  <div style={styles.streamBodyGrid}>

                    {/* LEFT COLUMN: Class Code & Upcoming Cards */}
                    <div style={styles.streamLeftCol}>
                      {/* Class Code Card */}
                      <div style={styles.streamSideCard}>
                        <div style={styles.sideCardHeaderRow}>
                          <span style={styles.sideCardLabel}>Class code</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => copyToClipboard(classCode)}
                              style={styles.cardTinyActionBtn}
                              title="Copy class code"
                            >
                              {codeCopied ? <Check size={16} color="#10b981" /> : <Copy size={16} color={isDark ? '#a3a3a3' : '#64748b'} />}
                            </button>
                            <button
                              onClick={() => setIsClassCodeModalOpen(true)}
                              style={styles.cardTinyActionBtn}
                              title="Display large class code"
                            >
                              <Maximize2 size={16} color="#10b981" />
                            </button>
                          </div>
                        </div>
                        <div
                          style={styles.classCodeDisplay}
                          onClick={() => setIsClassCodeModalOpen(true)}
                          title="Click to enlarge"
                        >
                          {classCode}
                        </div>
                      </div>

                      {/* Upcoming Card */}
                      <div style={styles.streamSideCard}>
                        <span style={styles.sideCardLabel}>Upcoming</span>
                        <div style={{ marginTop: '12px' }}>
                          {upcomingItems.length === 0 ? (
                            <div style={styles.noWorkText}>No work due soon</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {upcomingItems.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => {
                                    setActiveTab('classwork');
                                    setExpandedId(item.id);
                                  }}
                                  style={styles.upcomingItemRow}
                                >
                                  <span style={styles.upcomingItemDate}>Due {formatShortDate(item.dueDate)}</span>
                                  <span style={styles.upcomingItemTitle}>{item.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: '16px', textAlign: 'right' }}>
                          <span
                            onClick={() => setActiveTab('classwork')}
                            style={styles.viewAllLink}
                          >
                            View all
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Activity Feed */}
                    <div style={styles.streamRightCol}>
                      {/* Feed of Assignments */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {loadingClasswork ? (
                          <>
                            <Skeleton.StreamCard />
                            <Skeleton.StreamCard />
                            <Skeleton.StreamCard />
                          </>
                        ) : visibleClasswork.length === 0 ? (
                          <div style={styles.emptyFeedBox}>
                            <p style={{ margin: 0, color: isDark ? '#a3a3a3' : '#64748b' }}>
                              This is where you'll see classwork posted for your students.
                            </p>
                          </div>
                        ) : (
                          visibleClasswork.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setActiveTab('classwork');
                                setExpandedId(item.id);
                              }}
                              style={styles.assignmentStreamCard}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={styles.assignmentIconBadge}>
                                  <ClipboardList size={22} color="#10b981" />
                                </div>
                                <div>
                                  <div style={styles.assignmentStreamTitle}>
                                    {(currentUser?.name || classroom?.instructor || 'Instructor')} posted a new assignment: {item.title}
                                  </div>
                                  <div style={styles.assignmentStreamDate}>
                                    {formatShortDate(item.posted || item.id)}
                                  </div>
                                </div>
                              </div>
                              <div style={styles.streamCardDots}>
                                <MoreVertical size={20} color={isDark ? '#a3a3a3' : '#64748b'} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* ═══ TAB 2: CLASSWORK ═══ */}
              {activeTab === 'classwork' && (
                <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                  <div style={styles.headerRow}>
                    <div>
                      <h2 style={{ color: isDark ? '#E8EAED' : '#1e293b', fontWeight: '700', fontSize: '1.4rem', margin: 0 }}>
                        {classroom ? classroom.name : "Classwork"}
                      </h2>
                      <p style={{ margin: '4px 0 0 0', color: isDark ? '#a3a3a3' : '#64748b', fontSize: '0.85rem' }}>
                        Create and organize assignments, questions, and learning activities for this class.
                      </p>
                    </div>
                    <button onClick={openCreate} style={styles.addButton} className="btn-anim">
                      <Plus size={18} style={{ marginRight: '6px' }} /> Create
                    </button>
                  </div>

                  {/* List of Classwork */}
                  <div style={styles.list}>
                    {loadingClasswork ? (
                      Array.from({ length: 3 }).map((_, i) => <Skeleton.AssignmentRow key={i} />)
                    ) : visibleClasswork.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: isDark ? '#a3a3a3' : '#94a3b8' }}>
                        <BookOpen size={48} color={isDark ? '#4A4A4A' : '#cbd5e1'} style={{ margin: '0 auto 12px auto', display: 'block' }} />
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>No classwork yet</p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>Click "Create" to assign new work to your students.</p>
                      </div>
                    ) : (
                      visibleClasswork.map((item) => {
                        const isOpen = expandedId === item.id;
                        const due = formatShortDate(item.dueDate);
                        const posted = formatShortDate(item.posted || (typeof item.id === 'number' && item.id > 1e12 ? item.id : null));
                        return (
                          <div key={item.id} style={styles.itemWrapper}>
                            <div style={styles.itemHeader}>
                              <div style={styles.titlePill} onClick={() => toggleExpand(item.id)}>
                                <ClipboardList size={18} color="#10b981" style={{ marginRight: '10px', flexShrink: 0 }} />
                                <span>{item.title}</span>
                                {due && <span style={styles.itemDuePill}>Due {due}</span>}
                              </div>
                              <div style={styles.threeDots} onClick={(e) => toggleMenu(e, item.id)}>
                                <MoreVertical size={20} color={isDark ? '#a3a3a3' : '#9ca3af'} />
                                {activeMenu === item.id && (
                                  <div style={styles.dropdownMenu}>
                                    <div style={styles.dropdownItem} onClick={(e) => openModify(e, item)}>Modify</div>
                                    <div style={styles.dropdownItem} onClick={(e) => handleArchive(e, item.id)}>Archive</div>
                                    <div style={styles.dropdownItem} onClick={(e) => handleCopy(e, item)}>Copy</div>
                                    <div style={{ ...styles.dropdownItem, color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDeleteClasswork(e, item.id); }}>Delete</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {isOpen && (
                              <div style={styles.detailCard}>
                                <div style={styles.detailHeaderBar}>
                                  <ClipboardList size={30} color={isDark ? '#10b981' : '#4b5563'} />
                                  <div>
                                    <div style={styles.detailTitle}>{item.title}</div>
                                    <div style={styles.detailDue}>{due ? `Due ${due}` : 'No Due Date'} • {item.points || 100} points</div>
                                  </div>
                                </div>

                                <div style={styles.detailBody}>
                                  <div style={styles.detailLeft}>
                                    {posted && <div style={styles.postedText}>Posted {posted}</div>}
                                    <p style={styles.detailInstruction}>{item.details || 'No instructions provided.'}</p>

                                    {item.attachments?.length > 0 && (
                                      <div style={styles.cardAttachments}>
                                        {item.attachments.map((att, i) => (
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

                                  <div style={styles.detailStats}>
                                    <div style={styles.statCol}>
                                      <span style={styles.statNum}>{submissionData.counts[item.id] || 0}</span>
                                      <span style={styles.statLabel}>Turned in</span>
                                    </div>
                                    <div style={styles.statColDivider} />
                                    <div style={styles.statCol}>
                                      <span style={styles.statNum}>{submissionData.studentCount}</span>
                                      <span style={styles.statLabel}>Assigned</span>
                                    </div>
                                  </div>
                                </div>

                                <div style={styles.detailDivider} />

                                <div style={styles.detailFooter}>
                                  <span
                                    style={styles.viewActivityLink}
                                    onClick={() => {
                                      if (onOpenGrading) onOpenGrading(item);
                                      else {
                                        setSelectedGradingActivityId(item.id);
                                        setActiveTab('grades');
                                      }
                                    }}
                                  >
                                    View Activity & Grading
                                  </span>
                                  <button
                                    style={styles.liveMonitorBtn}
                                    onClick={(e) => { e.stopPropagation(); onStartMonitoring && onStartMonitoring(item); }}
                                    title="Open live proctoring & monitoring"
                                  >
                                    <Monitor size={16} /> Live Monitoring
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ═══ TAB 3: PEOPLE ═══ */}
              {activeTab === 'people' && (
                <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%' }}>
                  <div style={{ marginBottom: '40px' }}>
                    <div style={styles.peopleSectionHeader}>
                      <h2 style={styles.peopleSectionTitle}>Teachers</h2>
                      <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>1 instructor</span>
                    </div>
                    <div style={styles.peopleList}>
                      <div style={styles.peopleRow}>
                        {instructorInfo?.avatar ? (
                          <img
                            src={instructorInfo.avatar}
                            alt={instructorInfo?.name || 'Instructor'}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                            }}
                          />
                        ) : (
                          <div style={styles.peopleAvatarGreen}>
                            {(instructorInfo?.name || classroom?.instructor || currentUser?.name || 'I').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: '700', color: isDark ? '#E8EAED' : '#1e293b', fontSize: '0.95rem' }}>
                            {instructorInfo?.name || classroom?.instructor || currentUser?.name || 'Instructor'}
                          </div>
                          {(instructorInfo?.email || classroom?.instructorEmail || (currentUser?.role === 'Teacher' ? currentUser?.email : '')) && (
                            <div style={{ fontSize: '0.8rem', color: isDark ? '#a3a3a3' : '#64748b' }}>
                              {instructorInfo?.email || classroom?.instructorEmail || (currentUser?.role === 'Teacher' ? currentUser?.email : '')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={styles.peopleSectionHeader}>
                      <h2 style={styles.peopleSectionTitle}>Students</h2>
                      <span style={{ fontSize: '0.85rem', color: isDark ? '#a3a3a3' : '#64748b', fontWeight: '600' }}>
                        {enrolledStudents.length} student{enrolledStudents.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div style={styles.peopleList}>
                      {loadingStudents ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Skeleton.Row />
                          <Skeleton.Row />
                          <Skeleton.Row />
                          <Skeleton.Row />
                        </div>
                      ) : enrolledStudents.length === 0 ? (
                        <div style={{ padding: '30px 10px', textAlign: 'center', color: isDark ? '#a3a3a3' : '#64748b' }}>
                          <Users size={40} color={isDark ? '#4A4A4A' : '#cbd5e1'} style={{ margin: '0 auto 10px auto', display: 'block' }} />
                          <p style={{ fontWeight: '600', margin: 0, color: isDark ? '#E8EAED' : '#1e293b' }}>No students enrolled yet</p>
                          <p style={{ fontSize: '0.85rem', color: isDark ? '#a3a3a3' : '#94a3b8', margin: '4px 0 0 0' }}>
                            Give students the class code <strong style={{ color: '#10b981' }}>{classCode}</strong> to join.
                          </p>
                        </div>
                      ) : (
                        enrolledStudents.map((student, idx) => (
                          <div key={idx} style={styles.peopleRow}>
                            {student.avatar ? (
                              <img
                                src={student.avatar}
                                alt={student.name}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                }}
                              />
                            ) : (
                              <div style={styles.peopleAvatarBlue}>
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: '600', color: isDark ? '#E8EAED' : '#1e293b', fontSize: '0.95rem' }}>
                                {student.name}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: isDark ? '#a3a3a3' : '#64748b' }}>
                                {student.email}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ TAB 4: GRADES ═══ */}
              {activeTab === 'grades' && (
                <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0', paddingBottom: '18px', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ margin: 0, color: isDark ? '#E8EAED' : '#1e293b', fontWeight: '700', fontSize: '1.4rem' }}>
                        Classroom Grades
                      </h2>
                      <p style={{ margin: '4px 0 0 0', color: isDark ? '#a3a3a3' : '#64748b', fontSize: '0.85rem' }}>
                        Review and evaluate submissions for {classroom?.name || 'this class'}.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {bulkToastMsg && (
                        <span style={{ padding: '6px 12px', backgroundColor: isDark ? '#133527' : '#ecfdf5', color: isDark ? '#34d399' : '#059669', fontSize: '0.8rem', borderRadius: '8px', fontWeight: '700' }}>
                          {bulkToastMsg}
                        </span>
                      )}
                      {gradingStudents.length > 0 && (
                        <button
                          onClick={() => setShowBulkGradeModal(true)}
                          style={styles.bulkGradeActionBtn}
                          title="Grade all students who submitted this activity at once"
                        >
                          <CheckCircle2 size={16} />
                          Grade All Submitted ({gradingStudents.length})
                        </button>
                      )}
                    </div>
                  </div>

                  {visibleClasswork.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: isDark ? '#a3a3a3' : '#94a3b8' }}>
                      No assignments created yet in this classroom.
                    </div>
                  ) : (
                    <>
                      <div style={styles.activitySelectionRow}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isDark ? '#E8EAED' : '#475569', marginRight: '8px' }}>
                          Activity:
                        </span>
                        {visibleClasswork.map(act => (
                          <button
                            key={act.id}
                            onClick={() => setSelectedGradingActivityId(act.id)}
                            style={{
                              ...styles.activityChipBtn,
                              backgroundColor: selectedGradingActivityId === act.id ? '#10b981' : (isDark ? '#3A3A3A' : '#f1f5f9'),
                              color: selectedGradingActivityId === act.id ? 'white' : (isDark ? '#E8EAED' : '#475569'),
                              fontWeight: selectedGradingActivityId === act.id ? '700' : '600'
                            }}
                          >
                            {act.title}
                          </button>
                        ))}
                      </div>

                      <div style={styles.gradingColumnsLayout}>
                        <div style={styles.gradingRosterCol}>
                          <div style={styles.rosterHeaderBox}>
                            <h4 style={{ margin: 0, fontSize: '0.92rem', color: isDark ? '#E8EAED' : '#1e293b', fontWeight: '700' }}>
                              Turned In ({gradingStudents.length})
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: isDark ? '#a3a3a3' : '#64748b' }}>
                              Max: {maxPoints} pts
                            </span>
                          </div>

                          <div style={styles.gradingStudentList}>
                            {gradingStudents.length === 0 ? (
                              <div style={{ padding: '30px 12px', textAlign: 'center', color: isDark ? '#a3a3a3' : '#94a3b8', fontStyle: 'italic', fontSize: '0.88rem' }}>
                                No students have submitted this activity yet.
                              </div>
                            ) : (
                              gradingStudents.map(s => {
                                const isEvaluated = !!gradingGrades[s.id]?.gradedAt;
                                const isSelected = selectedStudentId === s.id;
                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => setSelectedStudentId(s.id)}
                                    style={{
                                      ...styles.gradingStudentRow,
                                      backgroundColor: isSelected ? (isDark ? '#193326' : '#ecfdf5') : (isDark ? '#383838' : '#ffffff'),
                                      borderColor: isSelected ? '#10b981' : (isDark ? '#4A4A4A' : '#e2e8f0'),
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                      <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        backgroundColor: isEvaluated ? '#10b981' : '#3b82f6',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        flexShrink: 0
                                      }}>
                                        {s.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span style={{ fontWeight: '600', color: isDark ? '#E8EAED' : '#1e293b', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {s.name}
                                      </span>
                                    </div>

                                    <div style={{ flexShrink: 0 }}>
                                      {isEvaluated ? (
                                        <span style={styles.gradeBadgeGraded}>
                                          {gradingGrades[s.id]?.grade}/{maxPoints}
                                        </span>
                                      ) : (
                                        <span style={styles.gradeBadgeTurnedIn}>
                                          Turned In
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div style={styles.gradingEvalCol}>
                          {selectedStudentId && gradingStudents.some(s => s.id === selectedStudentId) ? (
                            (() => {
                              const curStudent = gradingStudents.find(s => s.id === selectedStudentId);
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #f1f5f9', paddingBottom: '14px' }}>
                                    <div>
                                      <h3 style={{ margin: 0, color: isDark ? '#E8EAED' : '#1e293b', fontSize: '1.2rem', fontWeight: '700' }}>
                                        {curStudent.name}
                                      </h3>
                                      <div style={{ fontSize: '0.8rem', color: isDark ? '#a3a3a3' : '#64748b', marginTop: '4px' }}>
                                        Submitted {formatShortDate(curStudent.submittedAt) || 'recently'}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        onClick={() => onOpenPlayback && onOpenPlayback(activeGradingActivity, curStudent)}
                                        style={styles.playbackActionBtn}
                                        title="Open recording playback"
                                      >
                                        <PlayCircle size={15} /> Playback
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <label style={styles.fieldLabel}>Submitted Code:</label>
                                    <pre style={styles.codePreviewPre}>
                                      {curStudent.finalCode || '// No code submitted or recorded.'}
                                    </pre>
                                  </div>

                                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                    <div style={{ width: '130px' }}>
                                      <label style={styles.fieldLabel}>Grade ({maxPoints} max):</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max={maxPoints}
                                        value={studentGradeInput}
                                        onChange={(e) => setStudentGradeInput(e.target.value)}
                                        style={styles.input}
                                      />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <label style={styles.fieldLabel}>Private Feedback:</label>
                                      <textarea
                                        rows={2}
                                        value={studentFeedbackInput}
                                        onChange={(e) => setStudentFeedbackInput(e.target.value)}
                                        placeholder="Add feedback for this student…"
                                        style={{ ...styles.input, resize: 'vertical' }}
                                      />
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                                    <button
                                      onClick={handleSaveIndividualGrade}
                                      style={styles.saveGradeBtn}
                                    >
                                      Save Grade
                                    </button>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                              Select a student from the left roster to evaluate their submission.
                            </div>
                          )}
                        </div>

                      </div>
                    </>
                  )}
                </div>
              )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MODAL: BANNER CUSTOMIZATION ═══ */}
      {isCustomizeOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsCustomizeOpen(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={{ margin: 0, color: isDark ? '#E8EAED' : '#1e293b', fontSize: '1.3rem' }}>Customize Appearance</h2>
                <p style={{ margin: '4px 0 0 0', color: isDark ? '#a3a3a3' : '#64748b', fontSize: '0.85rem' }}>
                  Choose a theme color, background graphic, or image for this class banner.
                </p>
              </div>
              <button onClick={() => setIsCustomizeOpen(false)} style={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <label style={styles.fieldLabel}>Select Theme Preset:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '12px' }}>
                {THEME_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => setBannerTheme(preset)}
                    style={{
                      borderRadius: '12px',
                      padding: '10px',
                      border: bannerTheme.id === preset.id ? '2px solid #10b981' : (isDark ? '2px solid #4A4A4A' : '2px solid #e2e8f0'),
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      backgroundColor: bannerTheme.id === preset.id ? (isDark ? '#193326' : '#f0fdf4') : (isDark ? '#383838' : 'white'),
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      height: '42px',
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      {bannerTheme.id === preset.id && <Check size={18} />}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isDark ? '#E8EAED' : '#1e293b' }}>
                      {preset.name}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={styles.fieldLabel}>Or use Custom Header Image (URL):</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={bannerTheme.customImageUrl || ''}
                    onChange={(e) => setBannerTheme({ ...bannerTheme, customImageUrl: e.target.value })}
                    style={styles.input}
                  />
                  {bannerTheme.customImageUrl && (
                    <button
                      onClick={() => setBannerTheme({ ...bannerTheme, customImageUrl: '' })}
                      style={{ padding: '0 12px', border: isDark ? '1px solid #4A4A4A' : '1px solid #cbd5e1', borderRadius: '8px', background: isDark ? '#3A3A3A' : 'white', color: isDark ? '#a3a3a3' : '#64748b', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
                <button
                  onClick={() => {
                    setBannerTheme(originalBannerTheme || bannerTheme);
                    setIsCustomizeOpen(false);
                  }}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    saveClassroomTheme(classroom, bannerTheme, socket);
                    setIsCustomizeOpen(false);
                  }}
                  style={styles.saveGradeBtn}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: DISPLAY LARGE CLASS CODE ═══ */}
      {isClassCodeModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsClassCodeModalOpen(false)}>
          <div style={{ ...styles.modalCard, maxWidth: '440px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: isDark ? '#E8EAED' : '#1e293b' }}>Class code</span>
              <button onClick={() => setIsClassCodeModalOpen(false)} style={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              fontSize: '3.5rem',
              fontWeight: '900',
              letterSpacing: '0.08em',
              color: '#10b981',
              padding: '24px 0',
              fontFamily: 'monospace',
              userSelect: 'all'
            }}>
              {classCode}
            </div>

            <p style={{ color: isDark ? '#a3a3a3' : '#64748b', fontSize: '0.9rem', margin: '0 0 24px 0' }}>
              Share this code with your students so they can join this class from their student dashboard.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => copyToClipboard(classCode)}
                style={{
                  ...styles.addButton,
                  backgroundColor: codeCopied ? '#059669' : '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {codeCopied ? <Check size={18} /> : <Copy size={18} />}
                {codeCopied ? 'Copied Code!' : 'Copy Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: CLASS INFO (i) ═══ */}
      {isClassInfoModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsClassInfoModalOpen(false)}>
          <div style={{ ...styles.modalCard, maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: isDark ? '#E8EAED' : '#1e293b', fontSize: '1.2rem' }}>About Class</h3>
              <button onClick={() => setIsClassInfoModalOpen(false)} style={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div style={styles.infoFieldRow}>
                <span style={styles.infoFieldLabel}>Class Name</span>
                <span style={styles.infoFieldValue}>{classroom?.name || 'Verity'}</span>
              </div>
              <div style={styles.infoFieldRow}>
                <span style={styles.infoFieldLabel}>Section</span>
                <span style={styles.infoFieldValue}>{classroom?.section || '2'}</span>
              </div>
              <div style={styles.infoFieldRow}>
                <span style={styles.infoFieldLabel}>Subject</span>
                <span style={styles.infoFieldValue}>{classroom?.subject || 'Computer Science'}</span>
              </div>
              <div style={styles.infoFieldRow}>
                <span style={styles.infoFieldLabel}>Class Code</span>
                <span style={{ ...styles.infoFieldValue, color: '#10b981', fontWeight: '700' }}>{classCode}</span>
              </div>
              <div style={styles.infoFieldRow}>
                <span style={styles.infoFieldLabel}>Instructor</span>
                <span style={styles.infoFieldValue}>{classroom?.instructor || currentUser?.name || 'Instructor'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setIsClassInfoModalOpen(false)} style={styles.saveGradeBtn}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: CLASSROOM SETTINGS (Gear Icon) ═══ */}
      {isSettingsModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsSettingsModalOpen(false)}>
          <div style={{ ...styles.modalCard, maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={22} color="#10b981" />
                <h3 style={{ margin: 0, color: isDark ? '#E8EAED' : '#1e293b', fontSize: '1.2rem' }}>Classroom Settings</h3>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} style={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={styles.fieldLabel}>Class details</label>
                <div style={{ padding: '12px', backgroundColor: isDark ? '#383838' : '#f8fafc', borderRadius: '10px', border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0', marginTop: '6px' }}>
                  <div style={{ fontWeight: '700', color: isDark ? '#E8EAED' : '#1e293b' }}>{classroom?.name || 'Classroom'}</div>
                  <div style={{ fontSize: '0.85rem', color: isDark ? '#a3a3a3' : '#64748b' }}>Section: {classroom?.section || 'None'} • Subject: {classroom?.subject || 'General'}</div>
                </div>
              </div>

              <div>
                <label style={styles.fieldLabel}>Invite code</label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: isDark ? '#383838' : '#f8fafc', borderRadius: '10px', border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0', marginTop: '6px' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: isDark ? '#a3a3a3' : '#64748b', display: 'block' }}>Class code</span>
                    <strong style={{ fontSize: '1.1rem', color: '#10b981', letterSpacing: '0.05em' }}>{classCode}</strong>
                  </div>
                  <button
                    onClick={() => copyToClipboard(classCode)}
                    style={{ padding: '6px 12px', backgroundColor: isDark ? '#323232' : 'white', border: isDark ? '1px solid #4A4A4A' : '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: isDark ? '#E8EAED' : '#1e293b' }}
                  >
                    {codeCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {codeCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setIsSettingsModalOpen(false)} style={styles.saveGradeBtn}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: BULK GRADING FOR SUBMITTED STUDENTS ═══ */}
      {showBulkGradeModal && (
        <div style={styles.modalOverlay} onClick={() => setShowBulkGradeModal(false)}>
          <div style={{ ...styles.modalCard, maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, color: isDark ? '#E8EAED' : '#1e293b', fontSize: '1.2rem' }}>Bulk Grade All Submitted</h3>
                <p style={{ margin: '4px 0 0 0', color: isDark ? '#a3a3a3' : '#64748b', fontSize: '0.85rem' }}>
                  Assign grades to all {gradingStudents.length} student(s) who turned in this activity.
                </p>
              </div>
              <button onClick={() => setShowBulkGradeModal(false)} style={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={styles.fieldLabel}>Grade (out of {maxPoints}):</label>
                <input
                  type="number"
                  min="0"
                  max={maxPoints}
                  value={bulkGradeVal}
                  onChange={(e) => setBulkGradeVal(e.target.value)}
                  style={{ ...styles.input, marginTop: '6px' }}
                />
              </div>

              <div>
                <label style={styles.fieldLabel}>Feedback for all submitted:</label>
                <textarea
                  value={bulkFeedbackVal}
                  onChange={(e) => setBulkFeedbackVal(e.target.value)}
                  style={{ ...styles.input, height: '80px', marginTop: '6px', resize: 'vertical' }}
                  placeholder="e.g. Great job on this activity!"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkGradeModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkGrade}
                  style={styles.saveGradeBtn}
                >
                  Apply to All ({gradingStudents.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: CREATE / MODIFY ASSIGNMENT ═══ */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, color: isDark ? '#E8EAED' : '#1f2937' }}>{editingId ? 'Modify Assignment' : 'Create Assignment'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeModalBtn}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.fieldLabel}>Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={styles.input}
              />

              <div style={styles.labelRow}>
                <label style={styles.fieldLabel}>Due Date</label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.noDueDate}
                    onChange={(e) => setForm({ ...form, noDueDate: e.target.checked })}
                  />
                  No Due Date
                </label>
              </div>
              <input
                type="date"
                disabled={form.noDueDate}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                style={{ ...styles.input, opacity: form.noDueDate ? 0.5 : 1 }}
              />

              <div style={styles.labelRow}>
                <label style={styles.fieldLabel}>Instruction</label>
                <div style={styles.attachIcons}>
                  <Link2 size={18} style={styles.attachIcon} title="Add link (Ctrl+K)" onClick={handleAddLink} />
                  <Image size={18} style={styles.attachIcon} title="Upload image" onClick={() => imageInputRef.current?.click()} />
                  <Video size={18} style={styles.attachIcon} title="Upload video" onClick={() => videoInputRef.current?.click()} />
                </div>
              </div>
              <textarea
                value={form.instruction}
                onChange={(e) => setForm({ ...form, instruction: e.target.value })}
                style={{ ...styles.input, height: '90px', resize: 'vertical', fontFamily: 'inherit' }}
              />

              <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFilePicked(e, 'image')} />
              <input ref={videoInputRef} type="file" accept="video/*,.mp4,.webm,.mov,.m4v,.mkv" style={{ display: 'none' }} onChange={(e) => handleFilePicked(e, 'video')} />

              {uploading && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Uploading…</span>}

              {form.attachments?.length > 0 && (
                <div style={styles.attachmentList}>
                  {form.attachments.map((att, i) => (
                    <AttachmentCard
                      key={i}
                      att={att}
                      isDark={isDark}
                      onRemove={() => removeAttachment(i)}
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

              <label style={styles.fieldLabel}>Points</label>
              <select
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                style={{ ...styles.input, width: '120px' }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>

              <div style={styles.bottomRow}>
                <div style={styles.gradingGroup}>
                  <span style={styles.fieldLabel}>Grading:</span>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="grading"
                      checked={form.grading === 'On'}
                      onChange={() => setForm({ ...form, grading: 'On' })}
                    />
                    On
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="grading"
                      checked={form.grading === 'Off'}
                      onChange={() => setForm({ ...form, grading: 'Off' })}
                    />
                    Off
                  </label>
                </div>
                <button type="submit" style={styles.assignBtn}>{editingId ? 'Save' : 'Assign'}</button>
              </div>
            </form>
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

      <AddLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onAdd={handleSaveLink}
        isDark={isDark}
      />

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

// STYLES
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
  
  // MAIN CONTENT & BIG BOX CONTAINER
  mainContent: {
    flex: 1,
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden'
  },
  bigBoxContainer: {
    backgroundColor: isDark ? '#323232' : '#ffffff',
    flex: 1,
    borderRadius: '24px',
    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.25)' : '0 10px 25px rgba(0,0,0,0.05)',
    border: isDark ? '1px solid #4A4A4A' : 'none',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    transition: 'background-color 0.25s ease'
  },

  // TOP NAVIGATION BAR INSIDE THE BIG BOX
  classroomNavHeader: {
    height: '56px',
    padding: '0 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#323232' : '#ffffff',
    borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0',
    flexShrink: 0,
    zIndex: 10,
    transition: 'background-color 0.25s ease'
  },
  classroomTabsGroup: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    gap: '8px'
  },
  classroomTabBtn: {
    background: 'none',
    border: 'none',
    height: '100%',
    padding: '0 18px',
    fontSize: '0.94rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease, border-bottom 0.2s ease'
  },
  iconActionBtn: {
    background: 'none',
    border: 'none',
    padding: '8px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease'
  },

  // INNER SCROLL AREA INSIDE THE BIG BOX
  bigBoxInnerScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 28px 32px 28px'
  },

  // STREAM LAYOUT
  streamContainer: {
    maxWidth: '960px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  bannerCard: {
    height: '240px',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '24px 28px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
  },
  bannerInfo: {
    position: 'relative',
    zIndex: 5
  },
  bannerTitle: {
    margin: 0,
    color: '#ffffff',
    fontSize: '2.4rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  bannerSubtitle: {
    margin: '4px 0 0 0',
    color: 'rgba(255,255,255,0.92)',
    fontSize: '1.25rem',
    fontWeight: '600',
    textShadow: '0 1px 3px rgba(0,0,0,0.2)'
  },
  customizeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: isDark ? '#3A3A3A' : '#ffffff',
    border: isDark ? '1px solid #4A4A4A' : 'none',
    borderRadius: '50px',
    padding: '8px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: isDark ? '#E8EAED' : '#1e293b',
    cursor: 'pointer',
    boxShadow: isDark 
      ? '0 0 14px rgba(255, 255, 255, 0.08), 0 2px 8px rgba(0,0,0,0.45)' 
      : '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    zIndex: 10,
    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1), filter 0.18s ease'
  },
  infoBtn: {
    position: 'absolute',
    bottom: '18px',
    right: '20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    zIndex: 10,
    opacity: 0.85,
    transition: 'opacity 0.2s'
  },

  streamBodyGrid: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start'
  },
  streamLeftCol: {
    width: '210px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  streamRightCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  streamSideCard: {
    backgroundColor: isDark ? '#383838' : '#ffffff',
    borderRadius: '12px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0',
    padding: '16px',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.02)'
  },
  sideCardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sideCardLabel: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: isDark ? '#E8EAED' : '#1e293b'
  },
  cardTinyActionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '3px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center'
  },
  classCodeDisplay: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#10b981',
    marginTop: '10px',
    letterSpacing: '0.04em',
    cursor: 'pointer'
  },
  noWorkText: {
    fontSize: '0.82rem',
    color: isDark ? '#a3a3a3' : '#64748b'
  },
  upcomingItemRow: {
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer'
  },
  upcomingItemDate: {
    fontSize: '0.72rem',
    color: '#10b981',
    fontWeight: '700'
  },
  upcomingItemTitle: {
    fontSize: '0.82rem',
    color: isDark ? '#E8EAED' : '#1e293b',
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  viewAllLink: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#10b981',
    cursor: 'pointer'
  },

  announceCard: {
    backgroundColor: isDark ? '#383838' : '#ffffff',
    borderRadius: '12px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0',
    padding: '16px',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.02)'
  },
  announceCollapsed: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer'
  },
  teacherAvatarSmall: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    fontWeight: '800',
    flexShrink: 0
  },
  announcePlaceholder: {
    fontSize: '0.9rem',
    color: isDark ? '#a3a3a3' : '#64748b',
    fontWeight: '500'
  },
  announceTextarea: {
    width: '100%',
    borderRadius: '8px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #cbd5e1',
    backgroundColor: isDark ? '#323232' : '#ffffff',
    color: isDark ? '#E8EAED' : '#1e293b',
    padding: '10px',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box'
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: isDark ? '#464646' : '#f1f5f9',
    color: isDark ? '#E8EAED' : '#475569',
    fontWeight: '700',
    cursor: 'pointer'
  },
  postBtn: {
    padding: '8px 22px',
    borderRadius: '8px',
    border: 'none',
    background: '#10b981',
    color: 'white',
    fontWeight: '700',
    cursor: 'pointer'
  },

  streamFeedCard: {
    backgroundColor: isDark ? '#383838' : '#ffffff',
    borderRadius: '12px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0',
    padding: '18px 20px',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.02)'
  },
  announcementBodyText: {
    margin: '12px 0 0 0',
    color: isDark ? '#E8EAED' : '#334155',
    fontSize: '0.92rem',
    lineHeight: 1.5
  },

  assignmentStreamCard: {
    backgroundColor: isDark ? '#383838' : '#ffffff',
    borderRadius: '12px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.02)'
  },
  assignmentIconBadge: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: isDark ? '#1c2d24' : '#e6f4ea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  assignmentStreamTitle: {
    fontSize: '0.92rem',
    fontWeight: '700',
    color: isDark ? '#E8EAED' : '#1f2937'
  },
  assignmentStreamDate: {
    fontSize: '0.78rem',
    color: isDark ? '#a3a3a3' : '#64748b',
    marginTop: '3px'
  },
  streamCardDots: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px'
  },
  emptyFeedBox: {
    padding: '32px 20px',
    borderRadius: '12px',
    border: isDark ? '1px dashed #4A4A4A' : '1px dashed #cbd5e1',
    textAlign: 'center'
  },

  // Classwork Layout
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 0 20px 0',
    borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0',
    marginBottom: '24px'
  },
  addButton: { 
    display: 'flex', 
    alignItems: 'center', 
    padding: '10px 24px', 
    backgroundColor: '#10b981', 
    border: 'none', 
    borderRadius: '50px', 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: '0.95rem', 
    cursor: 'pointer', 
    boxShadow: isDark 
      ? '0 0 16px rgba(16, 185, 129, 0.35), 0 2px 6px rgba(0, 0, 0, 0.35)' 
      : '0 2px 6px rgba(16, 185, 129, 0.24), 0 1px 2px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease'
  },
  list: { display: 'flex', flexDirection: 'column', gap: '20px' },
  itemWrapper: { display: 'flex', flexDirection: 'column', gap: '10px' },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titlePill: { display: 'flex', alignItems: 'center', backgroundColor: isDark ? '#383838' : '#f1f5f9', padding: '10px 20px', borderRadius: '50px', color: isDark ? '#E8EAED' : '#1e293b', fontWeight: '700', cursor: 'pointer', userSelect: 'none', transition: 'background 0.15s', border: isDark ? '1px solid #4A4A4A' : 'none' },
  itemDuePill: { marginLeft: '12px', fontSize: '0.75rem', color: isDark ? '#a3a3a3' : '#64748b', fontWeight: '600' },
  threeDots: { color: isDark ? '#a3a3a3' : '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' },
  dropdownMenu: { position: 'absolute', top: '28px', right: '0', backgroundColor: isDark ? '#323232' : '#ffffff', border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0', borderRadius: '12px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)', zIndex: 30, minWidth: '130px' },
  dropdownItem: { padding: '8px 14px', color: isDark ? '#E8EAED' : '#1e293b', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', textAlign: 'left', borderRadius: '6px' },

  detailCard: { backgroundColor: isDark ? '#323232' : 'white', borderRadius: '16px', padding: '0', border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0', boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden' },
  detailHeaderBar: { display: 'flex', alignItems: 'center', gap: '18px', backgroundColor: isDark ? '#383838' : '#f8fafc', padding: '18px 24px', borderRadius: '12px', margin: '12px', border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0' },
  detailTitle: { fontSize: '1.25rem', fontWeight: 'bold', color: isDark ? '#E8EAED' : '#1e293b' },
  detailDue: { fontSize: '0.85rem', color: isDark ? '#a3a3a3' : '#64748b', marginTop: '2px' },
  detailBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', padding: '5px 28px 20px 28px' },
  detailLeft: { flex: 1 },
  postedText: { fontSize: '0.8rem', color: isDark ? '#a3a3a3' : '#94a3b8', marginBottom: '8px' },
  detailInstruction: { margin: 0, color: isDark ? '#E8EAED' : '#334155', fontSize: '0.98rem', lineHeight: 1.5 },
  detailStats: { display: 'flex', alignItems: 'stretch', gap: '0', paddingLeft: '20px' },
  statCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px', minWidth: '70px' },
  statColDivider: { width: '1px', backgroundColor: isDark ? '#4A4A4A' : '#e2e8f0', alignSelf: 'stretch' },
  statNum: { fontSize: '1.4rem', fontWeight: 'bold', color: isDark ? '#E8EAED' : '#1e293b' },
  statLabel: { fontSize: '0.85rem', color: isDark ? '#a3a3a3' : '#64748b', marginTop: '4px' },
  detailDivider: { height: '1px', backgroundColor: isDark ? '#4A4A4A' : '#e2e8f0', margin: '0 28px' },
  detailFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px' },
  viewActivityLink: { color: '#10b981', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '700' },
  liveMonitorBtn: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px', 
    padding: '8px 20px', 
    backgroundColor: '#10b981', 
    border: 'none', 
    borderRadius: '50px', 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: '0.88rem', 
    cursor: 'pointer', 
    boxShadow: isDark 
      ? '0 0 14px rgba(16, 185, 129, 0.32), 0 2px 6px rgba(0, 0, 0, 0.3)' 
      : '0 2px 6px rgba(16, 185, 129, 0.22), 0 1px 2px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease'
  },

  // People Tab
  peopleSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '2px solid #10b981',
    marginBottom: '16px'
  },
  peopleSectionTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '800',
    color: isDark ? '#E8EAED' : '#1e293b'
  },
  peopleList: {
    display: 'flex',
    flexDirection: 'column'
  },
  peopleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 14px',
    borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #f1f5f9'
  },
  peopleAvatarGreen: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    fontWeight: '800'
  },
  peopleAvatarBlue: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    fontWeight: '800'
  },

  // Grades Tab
  activitySelectionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '14px',
    marginBottom: '16px'
  },
  activityChipBtn: {
    padding: '6px 14px',
    borderRadius: '50px',
    border: 'none',
    fontSize: '0.82rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s'
  },
  bulkGradeActionBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#10b981',
    color: 'white',
    fontWeight: '700',
    fontSize: '0.82rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 6px rgba(16,185,129,0.25)'
  },
  gradingColumnsLayout: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start'
  },
  gradingRosterCol: {
    width: '280px',
    flexShrink: 0,
    borderRadius: '12px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0',
    overflow: 'hidden',
    backgroundColor: isDark ? '#383838' : '#f8fafc'
  },
  rosterHeaderBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0',
    backgroundColor: isDark ? '#323232' : '#ffffff'
  },
  gradingStudentList: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '480px',
    overflowY: 'auto'
  },
  gradingStudentRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #f1f5f9',
    cursor: 'pointer',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    transition: 'all 0.15s'
  },
  gradeBadgeGraded: {
    fontSize: '0.75rem',
    color: isDark ? '#34d399' : '#059669',
    fontWeight: '700',
    backgroundColor: isDark ? '#133527' : '#ecfdf5',
    padding: '3px 8px',
    borderRadius: '6px'
  },
  gradeBadgeTurnedIn: {
    fontSize: '0.72rem',
    color: isDark ? '#60a5fa' : '#2563eb',
    fontWeight: '700',
    backgroundColor: isDark ? '#1e2d42' : '#eff6ff',
    padding: '3px 8px',
    borderRadius: '6px'
  },
  gradingEvalCol: {
    flex: 1,
    minWidth: 0,
    borderRadius: '12px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #e2e8f0',
    padding: '24px',
    backgroundColor: isDark ? '#323232' : '#ffffff'
  },
  codePreviewPre: {
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    padding: '16px',
    borderRadius: '10px',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '0.85rem',
    maxHeight: '220px',
    overflow: 'auto',
    margin: '6px 0 0 0'
  },
  playbackActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '6px',
    border: isDark ? '1px solid #4A4A4A' : '1px solid #cbd5e1',
    background: isDark ? '#3A3A3A' : 'white',
    color: isDark ? '#E8EAED' : '#334155',
    fontWeight: '700',
    fontSize: '0.8rem',
    cursor: 'pointer'
  },
  saveGradeBtn: {
    padding: '9px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
  },

  // Modal Common Styles
  modalOverlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.55)', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 100, 
    backdropFilter: 'blur(4px)',
    padding: '24px 16px',
    boxSizing: 'border-box'
  },
  modalCard: { 
    backgroundColor: isDark ? '#323232' : 'white', 
    padding: '28px 32px', 
    borderRadius: '20px', 
    width: '90%', 
    maxWidth: '540px', 
    maxHeight: '88vh',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(0,0,0,0.2)', 
    border: isDark ? '1px solid #4A4A4A' : 'none' 
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  closeModalBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: isDark ? '#a3a3a3' : '#9ca3af', padding: '4px' },
  form: { display: 'flex', flexDirection: 'column', gap: '8px' },
  input: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: isDark ? '1px solid #4A4A4A' : '1px solid #d1d5db', backgroundColor: isDark ? '#3A3A3A' : 'white', color: isDark ? '#E8EAED' : '#1e293b', fontSize: '0.95rem', boxSizing: 'border-box' },
  fieldLabel: { fontSize: '0.85rem', fontWeight: 'bold', color: isDark ? '#E8EAED' : '#475569', marginTop: '6px' },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: isDark ? '#E8EAED' : '#4b5563', cursor: 'pointer' },
  attachIcons: { display: 'flex', gap: '12px', color: isDark ? '#a3a3a3' : '#6b7280' },
  attachIcon: { cursor: 'pointer' },
  attachmentList: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', 
    gap: '10px', 
    marginTop: '6px',
    width: '100%'
  },
  cardAttachments: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
    gap: '12px', 
    marginTop: '15px', 
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
  bottomRow: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: '20px',
    paddingBottom: '4px'
  },
  gradingGroup: { display: 'flex', alignItems: 'center', gap: '15px' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', color: isDark ? '#E8EAED' : '#4b5563', cursor: 'pointer' },
  assignBtn: { padding: '10px 32px', backgroundColor: '#10b981', border: 'none', borderRadius: '50px', color: 'white', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16,185,129,0.2)' },
  infoFieldRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: isDark ? '1px solid #4A4A4A' : '1px solid #f1f5f9' },
  infoFieldLabel: { fontSize: '0.85rem', color: isDark ? '#a3a3a3' : '#64748b' },
  infoFieldValue: { fontSize: '0.92rem', color: isDark ? '#E8EAED' : '#1e293b', fontWeight: '600' }
});
