import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Users, Home, Shield, Settings, Search, Bell, Plus, X, Trash2, User, Menu, X as XIcon, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import Skeleton from '../../components/Skeleton';

// Shared inner-card style tokens matching mockup specs
const sh = {
  pageWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    overflowY: 'auto',
    minWidth: 0,
    // Hide scrollbars but preserve scrolling
    MsOverflowStyle: 'none', /* IE and Edge */
    scrollbarWidth: 'none', /* Firefox */
    '&::-webkit-scrollbar': {
      display: 'none' /* Safari and Chrome */
    }
  },
  sectionTitle: { margin: '0 0 4px', fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' },
  topActions: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  addBlueBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' },
  searchPill: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#EEF0F3', borderRadius: '9999px', padding: '8px 18px', flex: '1 1 180px', maxWidth: '360px', minWidth: 0 },
  searchInput: { border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '0.875rem', color: '#334155', width: '100%', minWidth: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', flexShrink: 0 },
  statCard: { backgroundColor: 'white', borderRadius: '20px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '110px' },
  statLabel: { fontSize: '0.85rem', color: '#64748b', marginBottom: '6px', fontWeight: '500' },
  statNum: { fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 },
  mainCard: { backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', minWidth: 0 },
  cardTitle: { margin: '0', fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' },
  cardDivider: { height: '1px', backgroundColor: '#f1f5f9', margin: '12px 0 16px' },
  tableWrap: {
    overflowX: 'auto',
    width: '100%',
    // Hide scrollbars but preserve scrolling
    MsOverflowStyle: 'none', /* IE and Edge */
    scrollbarWidth: 'none', /* Firefox */
    '&::-webkit-scrollbar': {
      display: 'none' /* Safari and Chrome */
    }
  },
  tableCapsuleHeader: { backgroundColor: '#a3aeb9', borderRadius: '9999px', padding: '12px 24px', color: '#0f172a', fontWeight: '700', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: '500px' },
  thCell: { padding: '12px 18px', textAlign: 'left', fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' },
  trRowPill: { backgroundColor: '#f1f5f9', borderRadius: '9999px' },
  tdCell: { padding: '12px 18px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle' },
  statusGreenPill: { padding: '4px 16px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', display: 'inline-block', whiteSpace: 'nowrap' },
  statusRedPill: { padding: '4px 16px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', display: 'inline-block', whiteSpace: 'nowrap' },
  rolePill: { backgroundColor: '#EEF0F3', color: '#334155', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '600' },
  actionTextLink: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', padding: '2px 6px', textDecoration: 'none' },
  filterPillSelect: { padding: '8px 16px', borderRadius: '9999px', border: '1px solid #cbd5e1', fontSize: '0.83rem', color: '#334155', backgroundColor: 'white', cursor: 'pointer', outline: 'none' },
  sidePanelCard: { backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' },
  sidePanelTitle: { margin: '0 0 14px', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' },
  approvalRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' },
  secPillBtn: { display: 'block', width: '100%', padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: '9999px', backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', textAlign: 'center', marginBottom: '8px' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, backdropFilter: 'blur(4px)', padding: '20px' },
  modalCard: {
    backgroundColor: 'white',
    padding: '28px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
    maxHeight: '90vh',
    overflowY: 'auto',
    // Hide scrollbars but preserve scrolling
    MsOverflowStyle: 'none', /* IE and Edge */
    scrollbarWidth: 'none', /* Firefox */
    '&::-webkit-scrollbar': {
      display: 'none' /* Safari and Chrome */
    }
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '50%' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputPill: { width: '100%', padding: '10px 18px', borderRadius: '9999px', border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#334155', boxSizing: 'border-box', outline: 'none', backgroundColor: '#f8fafc' },
  submitBlueBtn: { padding: '11px', backgroundColor: '#007bff', border: 'none', borderRadius: '9999px', color: 'white', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' },
};

const STORAGE_KEY = 'verity_teacher_classrooms';
const GLOBAL_STORAGE_KEY = 'verity_global_classrooms';

export default function GlobalClassesTab() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [viewClass, setViewClass] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', section: '', subject: '', instructor: '' });
  const [teacherOptions, setTeacherOptions] = useState([
    'Dr. Alan Turing',
    'Prof. Katherine Johnson',
    'Dr. Grace Hopper',
    'Tim Berners-Lee',
    'Edgar F. Codd'
  ]);
  const [searchFocused, setSearchFocused] = useState(false);

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
          if (key && !mergedMap.has(key)) {
            mergedMap.set(key, c);
          }
        });
        const finalClasses = Array.from(mergedMap.values());
        if (finalClasses.length > 0) {
          setClasses(finalClasses);
        } else if (savedLocal.length > 0) {
          setClasses(savedLocal);
        }
      })
      .catch(() => {
        if (savedLocal.length > 0) setClasses(savedLocal);
      })
      .finally(() => {
        setLoading(false);
      });

    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/users`)
      .then(r => r.json())
      .then(data => {
        const uList = Array.isArray(data) ? data : (data.users || []);
        const teachers = uList.filter(u => u.role === 'Teacher' || u.role === 'Instructor' || u.isTeacher)
          .map(u => u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim())
          .filter(Boolean);
        if (teachers.length > 0) setTeacherOptions(teachers);
      })
      .catch(() => { });
  }, []);

  const handleCreateClass = (e) => {
    e.preventDefault();
    const nameTrim = newClass.name.trim();
    if (!nameTrim) return;

    const selectedInstructor = newClass.instructor || teacherOptions[0] || 'Unassigned';
    const termLabel = newClass.subject ? `${newClass.subject}${newClass.section ? ' (' + newClass.section + ')' : ''}` : 'Fall 2026';

    const existingIndex = classes.findIndex(c =>
      (c.name || c.className || '').toLowerCase() === nameTrim.toLowerCase()
    );

    let updatedClasses;
    if (existingIndex !== -1) {
      // If existing classroom, update properties & set active
      updatedClasses = classes.map((c, idx) => idx === existingIndex ? {
        ...c,
        name: nameTrim,
        className: nameTrim,
        section: newClass.section || c.section || 'N/A',
        subject: newClass.subject || c.subject || 'General',
        instructor: selectedInstructor,
        instructorName: selectedInstructor,
        term: termLabel,
        status: 'Active',
        isActive: true
      } : c);
    } else {
      // Create new classroom
      const created = {
        id: Date.now(),
        name: nameTrim,
        className: nameTrim,
        section: newClass.section || 'N/A',
        subject: newClass.subject || 'General',
        instructor: selectedInstructor,
        instructorName: selectedInstructor,
        term: termLabel,
        status: 'Active',
        isActive: true,
        students: []
      };
      updatedClasses = [created, ...classes];
    }

    setClasses(updatedClasses);

    // Save to local storage for persistence across refreshes & components
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClasses));
      localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(updatedClasses));
    } catch (e) { }

    // Sync backend
    apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/classrooms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classrooms: updatedClasses })
    }).catch(() => { });

    setNewClass({ name: '', section: '', subject: '', instructor: '' });
    setShowCreateModal(false);
  };

  const totalActive = classes.filter(c => c.status === 'Active' || c.isActive).length;
  const filtered = classes.filter(c => {
    const q = query.toLowerCase();
    return (c.name || c.className || '').toLowerCase().includes(q)
      || (c.instructor || c.instructorName || '').toLowerCase().includes(q)
      || (c.section || '').toLowerCase().includes(q)
      || (c.subject || '').toLowerCase().includes(q);
  });

  return (
    <div style={sh.pageWrap}>
      {/* 4 Stat Cards */}
      <div style={sh.statsGrid}>
        <div style={sh.statCard}>
          <div style={sh.statLabel}>Total Class</div>
          <div style={sh.statNum}>{classes.length || 23}</div>
        </div>
        <div style={sh.statCard}>
          <div style={sh.statLabel}>Active Classrooms</div>
          <div style={sh.statNum}>{totalActive || 15}</div>
        </div>
        <div style={sh.statCard}>
          <div style={{ height: '50px' }} />
        </div>
        <div style={sh.statCard}>
          <div style={{ height: '50px' }} />
        </div>
      </div>

      {/* Classroom Directory Management Main Card */}
      <div style={sh.mainCard}>
        <h2 style={{ ...sh.cardTitle, marginBottom: '16px' }}>Classroom Directory Management</h2>

        {/* Search & Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ ...sh.searchPill, maxWidth: '600px', flex: 1 }}>
            <Search size={16} color="#64748b" />
            <motion.input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              style={{
                ...sh.searchInput,
                width: searchFocused ? '100%' : '80%',
                border: searchFocused ? '2px solid #007bff' : '1px solid #e2e8f0',
                transition: 'width 0.3s, border-color 0.3s'
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            style={sh.addBlueBtn}
            className="btn-anim"
          >
            <Plus size={16} /><span>Create New Class</span>
          </motion.button>
        </div>

        {/* Table */}
        <div style={sh.tableWrap}>
          <div style={{ backgroundColor: '#a3aeb9', borderRadius: '9999px', padding: '12px 24px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', alignItems: 'center', fontWeight: '700', color: '#0f172a', fontSize: '0.88rem', marginBottom: '10px' }}>
            <div>Class Name</div>
            <div>Instructor</div>
            <div>Term / Subject</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Action</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton.Row key={i} />)
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>No classrooms found</div>
            ) : (
              filtered.map((c, i) => {
                const active = c.status === 'Active' || c.isActive || i % 2 === 0;
                return (
                  <div key={i} style={{ backgroundColor: '#f1f5f9', borderRadius: '9999px', padding: '10px 24px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', alignItems: 'center', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{c.name || c.className || 'Unnamed'}</div>
                    <div style={{ color: '#475569' }}>{c.instructor || c.instructorName || 'Instructor Name'}</div>
                    <div style={{ color: '#64748b' }}>{c.term || (c.subject ? `${c.subject}` : 'Fall 2026')}</div>
                    <div>
                      <span style={active ? sh.statusGreenPill : sh.statusRedPill}>
                        {active ? 'Active' : 'Archived'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setViewClass(c)}
                        style={sh.actionTextLink}
                      >
                        View
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{ ...sh.actionTextLink, color: '#475569' }}
                      >
                        Archive
                      </motion.button>
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
            <motion.div style={sh.modalCard} initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <div style={sh.modalHeader}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Create New Class</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateModal(false)}
                  style={sh.closeBtn}
                >
                  <X size={20} />
                </motion.button>
              </div>

              <form onSubmit={handleCreateClass} style={sh.form}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Class Name</label>
                  <input
                    required
                    value={newClass.name}
                    onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                    placeholder="e.g. Computer Science 101"
                    style={sh.inputPill}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Section</label>
                  <input
                    value={newClass.section}
                    onChange={e => setNewClass({ ...newClass, section: e.target.value })}
                    placeholder="e.g. Section A / Period 1"
                    style={sh.inputPill}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Subject</label>
                  <input
                    value={newClass.subject}
                    onChange={e => setNewClass({ ...newClass, subject: e.target.value })}
                    placeholder="e.g. Computer Science"
                    style={sh.inputPill}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Instructor</label>
                  <select
                    value={newClass.instructor}
                    onChange={e => setNewClass({ ...newClass, instructor: e.target.value })}
                    style={{ ...sh.inputPill, cursor: 'pointer', appearance: 'auto' }}
                  >
                    <option value="">Select Instructor...</option>
                    {teacherOptions.map((t, idx) => (
                      <option key={idx} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  style={{ ...sh.submitBlueBtn, marginTop: '10px' }}
                >
                  Create Classroom
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Class Details Modal */}
      <AnimatePresence>
        {viewClass && (
          <motion.div style={sh.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={{ ...sh.modalCard, maxWidth: '580px' }} initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <div style={sh.modalHeader}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Class Details</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewClass(null)}
                  style={sh.closeBtn}
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>Instructor : <span style={{ backgroundColor: '#EEF0F3', borderRadius: '9999px', padding: '2px 10px', fontWeight: '600' }}>{viewClass.instructor || 'Name'}</span></span>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>Academic Term : <span style={{ backgroundColor: '#EEF0F3', borderRadius: '9999px', padding: '2px 10px', fontWeight: '600' }}>{viewClass.term || 'Term'}</span></span>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>Total Student : <span style={{ backgroundColor: '#EEF0F3', borderRadius: '9999px', padding: '2px 10px', fontWeight: '600' }}>{viewClass.students?.length || 0}</span></span>
              </div>

              <div style={{ ...sh.searchPill, maxWidth: '100%', marginBottom: '14px' }}>
                <Search size={15} color="#64748b" />
                <input placeholder="Search students..." style={sh.searchInput} />
              </div>

              <div style={sh.tableWrap}>
                <div style={{ backgroundColor: '#a3aeb9', borderRadius: '9999px', padding: '10px 20px', display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr', alignItems: 'center', fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <div>Name</div><div>Email</div><div>Status</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(!viewClass.students || viewClass.students.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No students enrolled</div>
                  ) : (
                    viewClass.students.map((st, i) => (
                      <div key={i} style={{ backgroundColor: '#f1f5f9', borderRadius: '9999px', padding: '8px 20px', display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr', alignItems: 'center', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: '600' }}>{st.name}</div>
                        <div style={{ color: '#64748b' }}>{st.email}</div>
                        <div><span style={sh.statusGreenPill}>Active</span></div>
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