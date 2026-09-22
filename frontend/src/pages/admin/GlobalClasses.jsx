import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, UserPlus, Check, Users, User, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import Skeleton from '../../components/Skeleton';
import { generateClassCode } from '../../utils/classroomUtils';
import { useDarkMode } from '../../hooks/useDarkMode';

const getStyles = (isDark) => ({
  pageWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    overflowY: 'auto',
    minWidth: 0,
    MsOverflowStyle: 'none',
    scrollbarWidth: 'none',
  },
  addBlueBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' },
  actionBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)' },
  searchPill: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: isDark ? '#2a2a2a' : '#EEF0F3', borderRadius: '9999px', padding: '8px 18px', flex: '1 1 180px', maxWidth: '360px', minWidth: 0 },
  searchInput: { border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '0.875rem', color: isDark ? '#e2e8f0' : '#334155', width: '100%', minWidth: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', flexShrink: 0 },
  statCard: { backgroundColor: isDark ? '#2c2c2c' : 'white', borderRadius: '20px', padding: '20px 24px', boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '110px', border: isDark ? '1px solid #3a3a3a' : 'none' },
  statLabel: { fontSize: '0.85rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '6px', fontWeight: '500' },
  statNum: { fontSize: '2.2rem', fontWeight: '800', color: isDark ? '#f1f5f9' : '#0f172a', lineHeight: 1.1 },
  mainCard: { backgroundColor: isDark ? '#2c2c2c' : 'white', borderRadius: '24px', padding: '24px', boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', minWidth: 0, border: isDark ? '1px solid #3a3a3a' : 'none' },
  cardTitle: { margin: '0', fontSize: '1.1rem', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' },
  tableWrap: { overflowX: 'auto', width: '100%', MsOverflowStyle: 'none', scrollbarWidth: 'none' },
  statusGreenPill: { padding: '4px 16px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', display: 'inline-block', whiteSpace: 'nowrap' },
  statusRedPill: { padding: '4px 16px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', display: 'inline-block', whiteSpace: 'nowrap' },
  actionTextLink: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', color: isDark ? '#93c5fd' : '#1e293b', padding: '2px 6px', textDecoration: 'none' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, backdropFilter: 'blur(4px)', padding: '20px' },
  modalCard: {
    backgroundColor: isDark ? '#1e1e1e' : 'white',
    padding: '28px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: isDark ? '1px solid #3a3a3a' : 'none',
    MsOverflowStyle: 'none',
    scrollbarWidth: 'none',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '50%' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputPill: { width: '100%', padding: '10px 18px', borderRadius: '9999px', border: isDark ? '1px solid #4a5568' : '1px solid #cbd5e1', fontSize: '0.88rem', color: isDark ? '#e2e8f0' : '#334155', boxSizing: 'border-box', outline: 'none', backgroundColor: isDark ? '#2a2a2a' : '#f8fafc' },
  submitBlueBtn: { padding: '11px', backgroundColor: '#007bff', border: 'none', borderRadius: '9999px', color: 'white', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' },
  studentPickerBox: {
    border: isDark ? '1px solid #3f3f46' : '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '12px',
    backgroundColor: isDark ? '#262626' : '#f8fafc',
    maxHeight: '160px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  studentItem: (selected) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '10px',
    backgroundColor: selected
      ? (isDark ? '#312e81' : '#e0e7ff')
      : (isDark ? '#2e2e2e' : 'white'),
    border: selected
      ? (isDark ? '1px solid #6366f1' : '1px solid #818cf8')
      : (isDark ? '1px solid #3f3f46' : '1px solid #e2e8f0'),
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),
});

const STORAGE_KEY = 'verity_teacher_classrooms';
const GLOBAL_STORAGE_KEY = 'verity_global_classrooms';

export default function GlobalClassesTab() {
  const { isDark } = useDarkMode();
  const sh = getStyles(isDark);

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [viewClass, setViewClass] = useState(null);
  const [viewStudents, setViewStudents] = useState([]);
  const [viewLoadingStudents, setViewLoadingStudents] = useState(false);
  const [viewStudentQuery, setViewStudentQuery] = useState('');
  const [showAddStudentsInView, setShowAddStudentsInView] = useState(false);
  const [selectedAddStudentIds, setSelectedAddStudentIds] = useState(new Set());
  const [addStudentQuery, setAddStudentQuery] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', section: '', subject: '', instructor: '', code: '' });
  const [selectedCreateStudentIds, setSelectedCreateStudentIds] = useState(new Set());
  const [createStudentQuery, setCreateStudentQuery] = useState('');

  const [allRegisteredStudents, setAllRegisteredStudents] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([
    'Dr. Alan Turing', 'Prof. Katherine Johnson', 'Dr. Grace Hopper', 'Tim Berners-Lee', 'Edgar F. Codd'
  ]);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleOpenCreateModal = () => {
    setNewClass({
      name: '',
      section: '',
      subject: '',
      instructor: teacherOptions[0] || '',
      code: ''
    });
    setSelectedCreateStudentIds(new Set());
    setCreateStudentQuery('');
    setShowCreateModal(true);
  };

  const loadAllUsers = () => {
    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/users`)
      .then(r => r.json())
      .then(data => {
        const uList = Array.isArray(data) ? data : (data.users || []);
        
        // Extract 1 instructor options (Teachers only)
        const teachers = uList.filter(u => u.role === 'Teacher' || u.role === 'Instructor' || u.isTeacher)
          .map(u => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim())
          .filter(Boolean);
        if (teachers.length > 0) setTeacherOptions(teachers);

        // Extract registered students
        const students = uList.filter(u => u.role === 'Student' || !u.role || u.role === 'User')
          .map(u => ({
            id: u.id,
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Student',
            email: u.email || '',
            avatar: u.avatar || null,
            status: u.status || 'Active'
          }))
          .filter(u => u.email);
        setAllRegisteredStudents(students);
      })
      .catch(() => { });
  };

  useEffect(() => {
    let savedLocal = [];
    try {
      const rawG = localStorage.getItem(GLOBAL_STORAGE_KEY);
      const rawT = localStorage.getItem(STORAGE_KEY);
      if (rawG) savedLocal = JSON.parse(rawG);
      else if (rawT) savedLocal = JSON.parse(rawT);
    } catch (e) { }

    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classrooms`)
      .then(r => r.json())
      .then(d => {
        const serverList = Array.isArray(d) ? d : (d.classrooms || []);
        const mergedMap = new Map();
        [...savedLocal, ...serverList].forEach(c => {
          const key = (c.id || c.name || c.className || '').toString();
          if (key && !mergedMap.has(key)) mergedMap.set(key, c);
        });
        const finalClasses = Array.from(mergedMap.values());
        if (finalClasses.length > 0) setClasses(finalClasses);
        else if (savedLocal.length > 0) setClasses(savedLocal);
      })
      .catch(() => { if (savedLocal.length > 0) setClasses(savedLocal); })
      .finally(() => setLoading(false));

    loadAllUsers();
  }, []);

  // Fetch live student list when opening a class in view modal
  useEffect(() => {
    if (!viewClass || !viewClass.id) {
      setViewStudents([]);
      setShowAddStudentsInView(false);
      setSelectedAddStudentIds(new Set());
      return;
    }

    setViewLoadingStudents(true);
    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classroom-students/${viewClass.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.students)) {
          setViewStudents(data.students);
        } else if (Array.isArray(viewClass.students)) {
          setViewStudents(viewClass.students);
        } else {
          setViewStudents([]);
        }
      })
      .catch(() => {
        setViewStudents(Array.isArray(viewClass.students) ? viewClass.students : []);
      })
      .finally(() => setViewLoadingStudents(false));
  }, [viewClass]);

  // Handle creating a new class (with 1 fixed instructor and student enrollment)
  const handleCreateClass = async (e) => {
    e.preventDefault();
    const nameTrim = newClass.name.trim();
    if (!nameTrim) return;

    // Single fixed instructor
    const selectedInstructor = newClass.instructor || teacherOptions[0] || 'Unassigned';
    const termLabel = newClass.subject ? `${newClass.subject}${newClass.section ? ' (' + newClass.section + ')' : ''}` : 'Fall 2026';

    const selectedStudentsList = allRegisteredStudents.filter(st => selectedCreateStudentIds.has(st.id || st.email));

    const classroomId = Date.now();
    const generatedCode = generateClassCode(classes);

    const created = {
      id: classroomId,
      code: generatedCode,
      name: nameTrim,
      className: nameTrim,
      section: newClass.section || 'N/A',
      subject: newClass.subject || 'General',
      instructor: selectedInstructor,
      instructorName: selectedInstructor,
      term: termLabel,
      status: 'Active',
      isActive: true,
      students: selectedStudentsList
    };

    const updatedClasses = [created, ...classes];
    setClasses(updatedClasses);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClasses));
      localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(updatedClasses));
    } catch (e) { }

    // Save classroom to database
    try {
      await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classrooms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classrooms: updatedClasses })
      });
    } catch (e) { }

    // Enroll selected students to database
    if (selectedStudentsList.length > 0) {
      try {
        await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classrooms/${classroomId}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students: selectedStudentsList })
        });
      } catch (e) { }
    }

    setNewClass({ name: '', section: '', subject: '', instructor: '', code: '' });
    setSelectedCreateStudentIds(new Set());
    setShowCreateModal(false);
  };

  // Add students from inside View Modal
  const handleEnrollStudentsInView = async () => {
    if (!viewClass || selectedAddStudentIds.size === 0) return;

    const studentsToEnroll = allRegisteredStudents.filter(st => selectedAddStudentIds.has(st.id || st.email));
    if (studentsToEnroll.length === 0) return;

    try {
      await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classrooms/${viewClass.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsToEnroll })
      });

      // Update current view modal state
      const mergedStudentsMap = new Map();
      [...viewStudents, ...studentsToEnroll].forEach(s => {
        const key = (s.email || s.name || '').toLowerCase();
        if (key && !mergedStudentsMap.has(key)) mergedStudentsMap.set(key, s);
      });
      const updatedRoster = Array.from(mergedStudentsMap.values());
      setViewStudents(updatedRoster);

      // Update parent classroom state
      setClasses(prev => prev.map(c => c.id === viewClass.id ? { ...c, students: updatedRoster } : c));
      setSelectedAddStudentIds(new Set());
      setShowAddStudentsInView(false);
    } catch (err) {
      console.error('Failed to enroll students:', err);
    }
  };

  const totalActive = classes.filter(c => c.status === 'Active' || c.isActive).length;
  const filtered = classes.filter(c => {
    const q = query.toLowerCase();
    return (c.name || c.className || '').toLowerCase().includes(q)
      || (c.instructor || c.instructorName || '').toLowerCase().includes(q)
      || (c.section || '').toLowerCase().includes(q)
      || (c.subject || '').toLowerCase().includes(q);
  });

  const headerBg = isDark ? '#374151' : '#a3aeb9';
  const headerColor = isDark ? '#f1f5f9' : '#0f172a';
  const rowBg = isDark ? '#333' : '#f1f5f9';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const tagBg = isDark ? '#374151' : '#EEF0F3';

  // Filtered available students for the View Modal picker (excluding already enrolled)
  const alreadyEnrolledEmails = new Set(viewStudents.map(s => (s.email || '').toLowerCase()));
  const availableStudentsForView = allRegisteredStudents.filter(st => {
    if (alreadyEnrolledEmails.has((st.email || '').toLowerCase())) return false;
    const q = addStudentQuery.toLowerCase();
    return !q || st.name.toLowerCase().includes(q) || st.email.toLowerCase().includes(q);
  });

  // Filtered students for Create Class Modal
  const availableStudentsForCreate = allRegisteredStudents.filter(st => {
    const q = createStudentQuery.toLowerCase();
    return !q || st.name.toLowerCase().includes(q) || st.email.toLowerCase().includes(q);
  });

  return (
    <div style={sh.pageWrap}>
      {/* 4 Stat Cards */}
      <div style={sh.statsGrid}>
        <div style={sh.statCard}>
          <div style={sh.statLabel}>Total Class</div>
          <div style={sh.statNum}>{classes.length || 0}</div>
        </div>
        <div style={sh.statCard}>
          <div style={sh.statLabel}>Active Classrooms</div>
          <div style={sh.statNum}>{totalActive || 0}</div>
        </div>
        <div style={sh.statCard}>
          <div style={sh.statLabel}>Registered Students</div>
          <div style={sh.statNum}>{allRegisteredStudents.length || 0}</div>
        </div>
        <div style={sh.statCard}>
          <div style={sh.statLabel}>Instructors</div>
          <div style={sh.statNum}>{teacherOptions.length || 0}</div>
        </div>
      </div>

      {/* Classroom Directory Management */}
      <div style={sh.mainCard}>
        <h2 style={{ ...sh.cardTitle, marginBottom: '16px' }}>Classroom Directory Management</h2>

        {/* Search & Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div
            style={{
              ...sh.searchPill,
              maxWidth: '600px',
              flex: 1,
              border: searchFocused ? '1.5px solid #007bff' : (isDark ? '1px solid #3a3a3a' : '1px solid #e2e8f0'),
              boxShadow: searchFocused ? (isDark ? '0 0 0 3px rgba(0, 123, 255, 0.25)' : '0 0 0 3px rgba(0, 123, 255, 0.15)') : 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
          >
            <Search size={16} color={searchFocused ? '#007bff' : muted} style={{ flexShrink: 0 }} />
            <motion.input
              className="search-clean-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by class name, instructor, or subject..."
              style={{
                ...sh.searchInput,
                border: 'none',
                outline: 'none',
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleOpenCreateModal} style={sh.addBlueBtn} className="btn-anim">
            <Plus size={16} /><span>Create New Class</span>
          </motion.button>
        </div>

        {/* Table */}
        <div style={sh.tableWrap}>
          <div style={{ backgroundColor: headerBg, borderRadius: '9999px', padding: '12px 24px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', alignItems: 'center', fontWeight: '700', color: headerColor, fontSize: '0.88rem', marginBottom: '10px' }}>
            <div>Class Name</div><div>Instructor</div><div>Term / Subject</div><div>Status</div><div style={{ textAlign: 'right' }}>Action</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton.Row key={i} />)
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: muted }}>No classrooms found</div>
            ) : (
              filtered.map((c, i) => {
                const active = c.status === 'Active' || c.isActive || true;
                return (
                  <div key={i} style={{ backgroundColor: rowBg, borderRadius: '9999px', padding: '10px 24px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', alignItems: 'center', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: '600', color: isDark ? '#f1f5f9' : '#1e293b' }}>{c.name || c.className || 'Unnamed'}</div>
                    <div style={{ color: isDark ? '#cbd5e1' : '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="#818cf8" />
                      <span>{c.instructor || c.instructorName || 'Instructor'}</span>
                    </div>
                    <div style={{ color: muted }}>{c.term || (c.subject ? `${c.subject}` : 'General')}</div>
                    <div><span style={active ? sh.statusGreenPill : sh.statusRedPill}>{active ? 'Active' : 'Archived'}</span></div>
                    <div style={{ textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setViewClass(c)} style={sh.actionTextLink}>View</motion.button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create Class Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div style={sh.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={{ ...sh.modalCard, maxWidth: '520px' }} initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <div style={sh.modalHeader}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>Create New Class</h2>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCreateModal(false)} style={sh.closeBtn}>
                  <X size={20} />
                </motion.button>
              </div>

              <form onSubmit={handleCreateClass} style={sh.form}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: isDark ? '#94a3b8' : '#475569', marginBottom: '6px' }}>Class Name *</label>
                  <input required value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })} placeholder="e.g. Computer Science 101" style={sh.inputPill} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: isDark ? '#94a3b8' : '#475569', marginBottom: '6px' }}>Section</label>
                    <input value={newClass.section} onChange={e => setNewClass({ ...newClass, section: e.target.value })} placeholder="e.g. Section A" style={sh.inputPill} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: isDark ? '#94a3b8' : '#475569', marginBottom: '6px' }}>Subject</label>
                    <input value={newClass.subject} onChange={e => setNewClass({ ...newClass, subject: e.target.value })} placeholder="e.g. Programming" style={sh.inputPill} />
                  </div>
                </div>

                {/* Single Instructor Only */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', color: isDark ? '#94a3b8' : '#475569', marginBottom: '6px' }}>
                    <span>Instructor (1 Assigned) *</span>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>Fixed</span>
                  </label>
                  <select
                    required
                    value={newClass.instructor}
                    onChange={e => setNewClass({ ...newClass, instructor: e.target.value })}
                    style={{ ...sh.inputPill, cursor: 'pointer', appearance: 'auto' }}
                  >
                    <option value="">Select Instructor...</option>
                    {teacherOptions.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Add Students Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: isDark ? '#94a3b8' : '#475569' }}>
                      Add Students (Optional)
                    </label>
                    <span style={{ fontSize: '0.78rem', color: '#007bff', fontWeight: '600' }}>
                      {selectedCreateStudentIds.size} selected
                    </span>
                  </div>

                  {/* Student Search */}
                  <div style={{ ...sh.searchPill, maxWidth: '100%', marginBottom: '8px', padding: '6px 14px' }}>
                    <Search size={14} color={muted} />
                    <input
                      value={createStudentQuery}
                      onChange={e => setCreateStudentQuery(e.target.value)}
                      placeholder="Filter registered students..."
                      style={{ ...sh.searchInput, fontSize: '0.82rem' }}
                    />
                  </div>

                  {/* Student Checklist */}
                  <div style={sh.studentPickerBox}>
                    {availableStudentsForCreate.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: muted, fontSize: '0.8rem' }}>
                        No registered students found
                      </div>
                    ) : (
                      availableStudentsForCreate.map((st) => {
                        const isSelected = selectedCreateStudentIds.has(st.id || st.email);
                        return (
                          <div
                            key={st.id || st.email}
                            style={sh.studentItem(isSelected)}
                            onClick={() => {
                              const key = st.id || st.email;
                              setSelectedCreateStudentIds(prev => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              });
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: '600', color: isDark ? '#f4f4f5' : '#1e293b' }}>
                                {st.name}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: isDark ? '#a1a1aa' : '#64748b' }}>
                                {st.email}
                              </div>
                            </div>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              backgroundColor: isSelected ? '#007bff' : 'transparent',
                              border: isSelected ? '1px solid #007bff' : (isDark ? '1px solid #52525b' : '1px solid #cbd5e1'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {isSelected && <Check size={13} color="white" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" style={{ ...sh.submitBlueBtn, marginTop: '8px' }}>
                  Create Classroom
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Class Details Modal (With Add Students capability) */}
      <AnimatePresence>
        {viewClass && (
          <motion.div style={sh.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={{ ...sh.modalCard, maxWidth: '640px' }} initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <div style={sh.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>
                    {viewClass.name || viewClass.className || 'Class Details'}
                  </h2>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#15803d' }}>
                    Active
                  </span>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setViewClass(null)} style={sh.closeBtn}>
                  <X size={20} />
                </motion.button>
              </div>

              {/* Class Info Pills */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#475569' }}>
                  Instructor: <strong style={{ backgroundColor: tagBg, borderRadius: '9999px', padding: '3px 12px', color: isDark ? '#f1f5f9' : '#1e293b' }}>{viewClass.instructor || viewClass.instructorName || 'Fixed Instructor'}</strong>
                </span>
                <span style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#475569' }}>
                  Subject: <strong style={{ backgroundColor: tagBg, borderRadius: '9999px', padding: '3px 12px', color: isDark ? '#f1f5f9' : '#1e293b' }}>{viewClass.subject || viewClass.term || 'General'}</strong>
                </span>
                <span style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#475569' }}>
                  Code: <strong style={{ backgroundColor: '#dcfce7', borderRadius: '9999px', padding: '3px 12px', color: '#15803d', fontFamily: 'monospace', fontWeight: '800' }}>{viewClass.code || 'N/A'}</strong>
                </span>
                <span style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#475569' }}>
                  Enrolled Students: <strong style={{ backgroundColor: '#e0e7ff', borderRadius: '9999px', padding: '3px 12px', color: '#4338ca', fontWeight: '800' }}>{viewStudents.length}</strong>
                </span>
              </div>

              {/* Action Bar inside View Modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div style={{ ...sh.searchPill, maxWidth: '320px', flex: 1, padding: '6px 14px' }}>
                  <Search size={14} color={muted} />
                  <input
                    className="search-clean-input"
                    value={viewStudentQuery}
                    onChange={e => setViewStudentQuery(e.target.value)}
                    placeholder="Search enrolled students..."
                    style={{ ...sh.searchInput, fontSize: '0.82rem', border: 'none', outline: 'none' }}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowAddStudentsInView(o => !o)}
                  style={sh.actionBtn}
                  className="btn-anim"
                >
                  <UserPlus size={15} />
                  <span>{showAddStudentsInView ? 'Close Picker' : 'Add Students'}</span>
                </motion.button>
              </div>

              {/* Add Students Drawer/Section */}
              <AnimatePresence>
                {showAddStudentsInView && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      backgroundColor: isDark ? '#262626' : '#f1f5f9',
                      borderRadius: '16px',
                      padding: '14px',
                      marginBottom: '16px',
                      border: isDark ? '1px solid #3f3f46' : '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: isDark ? '#f4f4f5' : '#1e293b' }}>
                        Enroll Registered Students
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700' }}>
                        {selectedAddStudentIds.size} selected
                      </span>
                    </div>

                    <div style={{ ...sh.searchPill, maxWidth: '100%', padding: '6px 12px', backgroundColor: isDark ? '#1e1e1e' : 'white' }}>
                      <Search size={13} color={muted} />
                      <input
                        className="search-clean-input"
                        value={addStudentQuery}
                        onChange={e => setAddStudentQuery(e.target.value)}
                        placeholder="Search available students..."
                        style={{ ...sh.searchInput, fontSize: '0.8rem', border: 'none', outline: 'none' }}
                      />
                    </div>

                    <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {availableStudentsForView.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '12px', color: muted, fontSize: '0.8rem' }}>
                          No additional students available to enroll
                        </div>
                      ) : (
                        availableStudentsForView.map(st => {
                          const isSelected = selectedAddStudentIds.has(st.id || st.email);
                          return (
                            <div
                              key={st.id || st.email}
                              style={sh.studentItem(isSelected)}
                              onClick={() => {
                                const key = st.id || st.email;
                                setSelectedAddStudentIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(key)) next.delete(key);
                                  else next.add(key);
                                  return next;
                                });
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: '600', color: isDark ? '#f4f4f5' : '#1e293b' }}>
                                  {st.name}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: isDark ? '#a1a1aa' : '#64748b' }}>
                                  {st.email}
                                </div>
                              </div>
                              <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '5px',
                                backgroundColor: isSelected ? '#10b981' : 'transparent',
                                border: isSelected ? '1px solid #10b981' : (isDark ? '1px solid #52525b' : '1px solid #cbd5e1'),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {isSelected && <Check size={12} color="white" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleEnrollStudentsInView}
                      disabled={selectedAddStudentIds.size === 0}
                      style={{
                        ...sh.submitBlueBtn,
                        padding: '9px',
                        fontSize: '0.85rem',
                        backgroundColor: selectedAddStudentIds.size > 0 ? '#10b981' : (isDark ? '#3f3f46' : '#cbd5e1'),
                        cursor: selectedAddStudentIds.size > 0 ? 'pointer' : 'not-allowed',
                        boxShadow: selectedAddStudentIds.size > 0 ? '0 4px 10px rgba(16, 185, 129, 0.3)' : 'none'
                      }}
                    >
                      Enroll {selectedAddStudentIds.size} Student{selectedAddStudentIds.size === 1 ? '' : 's'}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enrolled Students Table */}
              <div style={sh.tableWrap}>
                <div style={{ backgroundColor: headerBg, borderRadius: '9999px', padding: '10px 20px', display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr', alignItems: 'center', fontWeight: '700', color: headerColor, fontSize: '0.85rem', marginBottom: '8px' }}>
                  <div>Student Name</div><div>Email Address</div><div>Enrollment</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {viewLoadingStudents ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: muted }}>Loading student roster...</div>
                  ) : viewStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: muted }}>No students currently enrolled</div>
                  ) : (
                    viewStudents
                      .filter(st => {
                        const q = viewStudentQuery.toLowerCase();
                        return !q || (st.name || '').toLowerCase().includes(q) || (st.email || '').toLowerCase().includes(q);
                      })
                      .map((st, i) => (
                        <div key={i} style={{ backgroundColor: rowBg, borderRadius: '9999px', padding: '8px 20px', display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr', alignItems: 'center', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: '600', color: isDark ? '#f1f5f9' : '#1e293b' }}>{st.name}</div>
                          <div style={{ color: muted }}>{st.email}</div>
                          <div><span style={sh.statusGreenPill}>Enrolled</span></div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}