import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Filter, Edit3, Eye, Shield, User, Mail, Check, AlertCircle, Copy, Clock, Key } from 'lucide-react';
import PendingInstructorApproval from '../../components/PendingInstructorApproval';
import { apiFetch } from '../../utils/api';
import Skeleton from '../../components/Skeleton';
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
  searchPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: isDark ? '#1e1e1e' : '#f1f5f9',
    borderRadius: '9999px',
    padding: '8px 18px',
    flex: '1 1 180px',
    maxWidth: '360px',
    minWidth: 0,
    border: isDark ? '1.5px solid #404040' : '1.5px solid #cbd5e1',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.875rem',
    color: isDark ? '#f8fafc' : '#1e293b',
    width: '100%',
    minWidth: 0,
    boxShadow: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
  },
  mainCard: { backgroundColor: isDark ? '#2c2c2c' : 'white', borderRadius: '24px', padding: '24px', boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', minWidth: 0, border: isDark ? '1px solid #3a3a3a' : 'none' },
  cardTitle: { margin: '0', fontSize: '1.1rem', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' },
  tableWrap: { overflowX: 'auto', width: '100%', MsOverflowStyle: 'none', scrollbarWidth: 'none' },
  statusGreenPill: { padding: '4px 16px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', display: 'inline-block', whiteSpace: 'nowrap' },
  statusRedPill: { padding: '4px 16px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', display: 'inline-block', whiteSpace: 'nowrap' },
  rolePill: { backgroundColor: isDark ? '#374151' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#334155', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '600' },
  actionTextLink: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '700',
    color: isDark ? '#93c5fd' : '#1e293b',
    padding: '2px 6px',
    textDecoration: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
  },
  filterChip: { padding: '6px 16px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: isDark ? '#1e3a5f' : '#dbeafe', color: isDark ? '#93c5fd' : '#1d4ed8', transition: 'all 0.15s ease', whiteSpace: 'nowrap' },
  filterChipActive: { padding: '6px 16px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', boxShadow: '0 2px 8px rgba(37,99,235,0.3)', whiteSpace: 'nowrap' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, backdropFilter: 'blur(4px)', padding: '20px' },
  modalCard: {
    backgroundColor: isDark ? '#1e1e1e' : 'white',
    padding: '28px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
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
  sidePanelCard: { backgroundColor: isDark ? '#2c2c2c' : 'white', borderRadius: '20px', padding: '20px', boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.04)', border: isDark ? '1px solid #3a3a3a' : 'none' },
  sidePanelTitle: { margin: '0 0 14px', fontSize: '0.88rem', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' },
  secPillBtn: { display: 'block', width: '100%', padding: '9px 14px', border: isDark ? '1px solid #4a5568' : '1px solid #cbd5e1', borderRadius: '9999px', backgroundColor: isDark ? '#2a2a2a' : 'white', color: isDark ? '#e2e8f0' : '#334155', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', textAlign: 'center', marginBottom: '8px' },
});

export default function UserManagementTab({ users = [], loading = false, onDeleteUser, onUpdateUser, onShowSelectUsersPopup }) {
  const { isDark } = useDarkMode();
  const sh = getStyles(isDark);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'Student' });
  const [modalAction, setModalAction] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [localMsg, setLocalMsg] = useState(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [addOrigin, setAddOrigin] = useState({ x: '50%', y: '50%' });

  // View & Edit user modals
  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleOpenEdit = (u) => {
    const parts = (u.name || '').trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    setEditingUser({
      originalEmail: u.email,
      firstName,
      lastName,
      email: u.email,
      role: u.role || 'Student',
      status: u.status || 'Active',
      password: '',
    });
    setEditError(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setEditError(null);

    const fullName = `${editingUser.firstName} ${editingUser.lastName}`.trim();
    if (!fullName) {
      setEditError('Name cannot be empty');
      setEditLoading(false);
      return;
    }
    if (!editingUser.email) {
      setEditError('Email cannot be empty');
      setEditLoading(false);
      return;
    }

    const payload = {
      name: fullName,
      email: editingUser.email.trim(),
      role: editingUser.role,
      status: editingUser.status,
    };
    if (editingUser.password && editingUser.password.trim()) {
      payload.password = editingUser.password.trim();
    }

    try {
      if (onUpdateUser) {
        const res = await onUpdateUser(editingUser.originalEmail, payload);
        if (res && res.success === false) {
          setEditError(res.message || 'Failed to update user');
          setEditLoading(false);
          return;
        }
      } else {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/users/${encodeURIComponent(editingUser.originalEmail)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          setEditError(data.message || 'Failed to update user');
          setEditLoading(false);
          return;
        }
      }

      setLocalMsg({ type: 'success', text: `User "${fullName}" updated successfully.` });
      setTimeout(() => setLocalMsg(null), 3500);
      if (viewingUser && viewingUser.email === editingUser.originalEmail) {
        setViewingUser(prev => ({
          ...prev,
          name: fullName,
          email: editingUser.email.trim(),
          role: editingUser.role,
          status: editingUser.status,
        }));
      }
      setEditingUser(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCopyEmail = (email) => {
    navigator.clipboard?.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const filtered = users.filter(u => u.role !== 'Admin').filter(u => {
    const q = query.toLowerCase();
    return ((u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      && (roleFilter === 'All' || u.role === roleFilter)
      && (statusFilter === 'All' || u.status === statusFilter);
  });
  const fmt = iso => { if (!iso) return 'Never'; try { return new Date(iso).toLocaleString(); } catch { return iso; } };
  const toggleSel = email => setSelected(p => p.includes(email) ? p.filter(e => e !== email) : [...p, email]);
  const toggleAll = () => setSelected(selected.length === filtered.length && filtered.length > 0 ? [] : filtered.map(u => u.email));

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(tick);
  }, []);
  const isOnline = (lastLogin) => {
    if (!lastLogin) return false;
    try { return (now - new Date(lastLogin).getTime()) < 30 * 60 * 1000; } catch { return false; }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const payload = { name: `${newUser.firstName} ${newUser.lastName}`.trim(), email: newUser.email, password: newUser.password, role: newUser.role };
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setLocalMsg({ type: 'error', text: data.message || 'Could not add user' }); return; }
      setIsAddOpen(false);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'Student' });
      setLocalMsg({ type: 'success', text: 'User added successfully.' });
      setTimeout(() => setLocalMsg(null), 3000);
    } catch { setLocalMsg({ type: 'error', text: 'Cannot connect to server.' }); }
  };

  const handleBulkActionClick = (action) => {
    if (selected.length === 0) {
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
      return;
    }
    setModalAction(action);
  };

  const confirmBulkAction = () => {
    if (modalAction === 'suspend') {
      selected.forEach(email => onUpdateUser(email, { status: 'Inactive' }));
      setLocalMsg({ type: 'success', text: `Suspended ${selected.length} accounts.` });
    } else if (modalAction === 'delete') {
      selected.forEach(email => onDeleteUser(email));
      setSelected([]);
      setLocalMsg({ type: 'success', text: `Deleted ${selected.length} accounts.` });
    } else if (modalAction === 'reset') {
      setLocalMsg({ type: 'success', text: `Password reset for ${selected.length} users.` });
      setNewPassword('');
    }
    setModalAction(null);
    setTimeout(() => setLocalMsg(null), 3000);
  };

  const dropdownStyle = {
    position: 'absolute', top: 'calc(100% + 8px)', left: 0,
    backgroundColor: isDark ? '#1e1e1e' : 'white',
    borderRadius: '16px',
    boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
    padding: '14px 16px',
    zIndex: 100, minWidth: '180px',
    border: isDark ? '1px solid #3a3a3a' : '1px solid #e2e8f0',
  };

  return (
    <div style={sh.pageWrap}>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '320px' }}>
          <div style={sh.mainCard}>
            <h2 style={{ ...sh.cardTitle, marginBottom: '14px' }}>User List Dashboard</h2>
            {localMsg && <div style={{ padding: '8px 16px', borderRadius: '9999px', marginBottom: '12px', fontSize: '0.85rem', backgroundColor: localMsg.type === 'success' ? '#dcfce7' : '#fee2e2', color: localMsg.type === 'success' ? '#15803d' : '#b91c1c' }}>{localMsg.text}</div>}

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div
                style={{
                  ...sh.searchPill,
                  border: searchFocused ? '1.5px solid #007bff' : (isDark ? '1.5px solid #4a5568' : '1.5px solid #cbd5e1'),
                  boxShadow: searchFocused ? (isDark ? '0 0 0 3px rgba(0, 123, 255, 0.25)' : '0 0 0 3px rgba(0, 123, 255, 0.15)') : 'none',
                }}
              >
                <Search size={15} color={searchFocused ? '#007bff' : (isDark ? '#94a3b8' : '#64748b')} style={{ flexShrink: 0 }} />
                <motion.input
                  className="search-clean-input"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search..."
                  style={{
                    ...sh.searchInput,
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </div>

              {/* Role Filter */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setRoleOpen(p => !p); setStatusOpen(false); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '9999px', minWidth: '150px',
                    border: roleFilter !== 'All' ? '1.5px solid #2563eb' : `1px solid ${isDark ? '#4a5568' : '#cbd5e1'}`,
                    backgroundColor: roleFilter !== 'All' ? (isDark ? '#1e3a5f' : '#eff6ff') : (isDark ? '#2a2a2a' : 'white'),
                    color: roleFilter !== 'All' ? '#2563eb' : (isDark ? '#e2e8f0' : '#334155'),
                    fontSize: '0.83rem', fontWeight: '600', cursor: 'pointer', outline: 'none',
                  }}
                >
                  <Filter size={13} style={{ flexShrink: 0 }} />
                  <span style={{ width: '100px', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {roleFilter === 'All' ? 'Filter by Roles' : roleFilter}
                  </span>
                </motion.button>
                <AnimatePresence>
                  {roleOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      style={dropdownStyle}
                    >
                      <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['All', 'Student', 'Teacher'].map(role => (
                          <motion.button
                            key={role}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setRoleFilter(role); setRoleOpen(false); }}
                            style={roleFilter === role ? sh.filterChipActive : sh.filterChip}
                          >
                            {role === 'All' ? 'All Roles' : role}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status Filter */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setStatusOpen(p => !p); setRoleOpen(false); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '9999px', minWidth: '150px',
                    border: statusFilter !== 'All' ? '1.5px solid #2563eb' : `1px solid ${isDark ? '#4a5568' : '#cbd5e1'}`,
                    backgroundColor: statusFilter !== 'All' ? (isDark ? '#1e3a5f' : '#eff6ff') : (isDark ? '#2a2a2a' : 'white'),
                    color: statusFilter !== 'All' ? '#2563eb' : (isDark ? '#e2e8f0' : '#334155'),
                    fontSize: '0.83rem', fontWeight: '600', cursor: 'pointer', outline: 'none',
                  }}
                >
                  <Filter size={13} style={{ flexShrink: 0 }} />
                  <span style={{ width: '100px', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {statusFilter === 'All' ? 'Filter by Status' : statusFilter}
                  </span>
                </motion.button>
                <AnimatePresence>
                  {statusOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      style={dropdownStyle}
                    >
                      <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['All', 'Active', 'Inactive'].map(status => (
                          <motion.button
                            key={status}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setStatusFilter(status); setStatusOpen(false); }}
                            style={statusFilter === status ? sh.filterChipActive : sh.filterChip}
                          >
                            {status === 'All' ? 'All Status' : status}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setAddOrigin({ x: `${rect.left + rect.width / 2}px`, y: `${rect.top + rect.height / 2}px` });
                  setIsAddOpen(true);
                }}
                style={sh.addBlueBtn}
                className="btn-anim"
              >
                <Plus size={15} /><span>Add Single User</span>
              </motion.button>
            </div>

            {/* Table */}
            <div style={sh.tableWrap}>
              <div style={{ backgroundColor: isDark ? '#374151' : '#a3aeb9', borderRadius: '9999px', padding: '12px 20px', display: 'grid', gridTemplateColumns: '40px 1.5fr 1.5fr 1fr 1fr 1.2fr 1fr', alignItems: 'center', fontWeight: '700', color: isDark ? '#f1f5f9' : '#0f172a', fontSize: '0.85rem', marginBottom: '8px' }}>
                <div><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></div>
                <div>Name</div><div>Email</div><div>Role</div><div>Status</div><div>Last Login</div><div style={{ textAlign: 'right' }}>Actions</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton.Row key={i} />)
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: isDark ? '#64748b' : '#94a3b8' }}>No users found</div>
                ) : (
                  filtered.map(u => (
                    <div key={u.email} className="table-row-pill" style={{ padding: '10px 20px', display: 'grid', gridTemplateColumns: '40px 1.5fr 1.5fr 1fr 1fr 1.2fr 1fr', alignItems: 'center', fontSize: '0.85rem' }}>
                      <div><input type="checkbox" checked={selected.includes(u.email)} onChange={() => toggleSel(u.email)} /></div>
                      <div style={{ fontWeight: '600', color: isDark ? '#f1f5f9' : '#1e293b' }}>{u.name}</div>
                      <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                      <div><span style={sh.rolePill}>{u.role}</span></div>
                      <div><span style={isOnline(u.lastLogin) ? sh.statusGreenPill : sh.statusRedPill}>{isOnline(u.lastLogin) ? 'Active' : 'Inactive'}</span></div>
                      <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>{fmt(u.lastLogin)}</div>
                      <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <motion.button
                          whileHover={{ opacity: 0.7, scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleOpenEdit(u)}
                          style={sh.actionTextLink}
                        >
                          Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ opacity: 0.7, scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setViewingUser(u)}
                          style={{ ...sh.actionTextLink, color: isDark ? '#a78bfa' : '#6366f1' }}
                        >
                          View
                        </motion.button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <PendingInstructorApproval users={users} onUpdateUser={onUpdateUser} />

          <div style={sh.sidePanelCard}>
            <h3 style={sh.sidePanelTitle}>Security Permission Control</h3>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleBulkActionClick('reset')} style={sh.secPillBtn} className="btn-anim">Force Reset Password for Selected</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleBulkActionClick('suspend')} style={sh.secPillBtn} className="btn-anim">Suspend Selected Account</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleBulkActionClick('delete')} style={{ ...sh.secPillBtn, borderColor: '#fca5a5', color: '#b91c1c', marginBottom: 0 }} className="btn-anim">Deactivate / Delete Account</motion.button>
          </div>
        </div>
      </div>

      {/* Bulk Action Modal */}
      <AnimatePresence>
        {modalAction && (
          <motion.div style={sh.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={{ ...sh.modalCard, maxWidth: '400px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <h2 style={{ margin: '0 0 16px', color: isDark ? '#f1f5f9' : '#1e293b' }}>
                {modalAction === 'reset' ? 'Reset Password' : modalAction === 'suspend' ? 'Suspend Account' : 'Delete Account'}
              </h2>
              <div style={{ marginBottom: '20px', color: isDark ? '#cbd5e1' : '#334155', fontSize: '0.9rem' }}>
                {modalAction === 'reset' ? (
                  <>
                    <p>Enter a new password for the selected user(s):</p>
                    <p style={{ fontWeight: '700', color: '#007bff', marginBottom: '12px' }}>
                      {selected.map(e => users.find(u => u.email === e)?.name || e).join(', ')}
                    </p>
                    <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={sh.inputPill} />
                  </>
                ) : (
                  <>
                    <p>Are you sure you want to {modalAction === 'suspend' ? 'suspend' : 'delete'} this account?</p>
                    <p style={{ fontWeight: '700', color: modalAction === 'delete' ? '#ef4444' : '#f59e0b', marginTop: '8px' }}>
                      {selected.map(e => users.find(u => u.email === e)?.name || e).join(', ')}
                    </p>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setModalAction(null)} style={{ ...sh.submitBlueBtn, backgroundColor: isDark ? '#374151' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#475569', flex: 1, boxShadow: 'none' }}>Cancel</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={confirmBulkAction} style={{ ...sh.submitBlueBtn, flex: 1, backgroundColor: modalAction === 'delete' ? '#ef4444' : '#007bff' }}>Confirm</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <motion.div style={{ ...sh.modalOverlay }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <motion.div
              style={{ ...sh.modalCard, transformOrigin: `${addOrigin.x} ${addOrigin.y}` }}
              initial={{ opacity: 0, scale: 0.55, y: 32, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.6, y: 24, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.9, filter: { duration: 0.2 } }}
            >
              <div style={sh.modalHeader}>
                <h2 style={{ margin: 0, color: isDark ? '#f1f5f9' : '#1e293b' }}>Add New User</h2>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsAddOpen(false)} style={sh.closeBtn}>
                  <X size={20} />
                </motion.button>
              </div>
              <form onSubmit={handleAdd} style={sh.form}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="First Name" required value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} style={{ ...sh.inputPill, flex: 1 }} />
                  <input type="text" placeholder="Last Name" required value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} style={{ ...sh.inputPill, flex: 1 }} />
                </div>
                <input type="email" placeholder="Email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} style={sh.inputPill} />
                <input type="password" placeholder="Password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={sh.inputPill} />
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={sh.inputPill}>
                  <option>Student</option><option>Teacher</option><option>Admin</option>
                </select>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" style={sh.submitBlueBtn}>Add User</motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View User Modal */}
      <AnimatePresence>
        {viewingUser && (
          <motion.div style={sh.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingUser(null)}>
            <motion.div
              style={{ ...sh.modalCard, maxWidth: '440px' }}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={sh.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={20} color={isDark ? '#60a5fa' : '#2563eb'} />
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>User Profile</h2>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setViewingUser(null)} style={sh.closeBtn}>
                  <X size={20} />
                </motion.button>
              </div>

              {/* User Identity Banner */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '12px 0 20px',
                borderBottom: isDark ? '1px solid #333333' : '1px solid #f1f5f9',
                marginBottom: '18px'
              }}>
                <div style={{
                  position: 'relative',
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  boxShadow: '0 6px 18px rgba(37,99,235,0.3)',
                  marginBottom: '12px'
                }}>
                  {(viewingUser.name || 'U').charAt(0).toUpperCase()}
                  <span style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: isOnline(viewingUser.lastLogin) ? '#22c55e' : '#94a3b8',
                    border: `2px solid ${isDark ? '#1e1e1e' : '#ffffff'}`
                  }} title={isOnline(viewingUser.lastLogin) ? 'Online' : 'Offline'} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {viewingUser.name}
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={sh.rolePill}>{viewingUser.role}</span>
                  <span style={viewingUser.status === 'Active' ? sh.statusGreenPill : sh.statusRedPill}>
                    {viewingUser.status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Detail Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? '#262626' : '#f8fafc',
                  border: isDark ? '1px solid #383838' : '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <Mail size={16} color={isDark ? '#94a3b8' : '#64748b'} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.86rem', color: isDark ? '#e2e8f0' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {viewingUser.email}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyEmail(viewingUser.email)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: copiedEmail ? '#22c55e' : (isDark ? '#94a3b8' : '#64748b'),
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? '#262626' : '#f8fafc',
                  border: isDark ? '1px solid #383838' : '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                    <span style={{ fontSize: '0.84rem', color: isDark ? '#94a3b8' : '#64748b' }}>Last Login:</span>
                  </div>
                  <span style={{ fontSize: '0.84rem', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}>
                    {fmt(viewingUser.lastLogin)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? '#262626' : '#f8fafc',
                  border: isDark ? '1px solid #383838' : '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                    <span style={{ fontSize: '0.84rem', color: isDark ? '#94a3b8' : '#64748b' }}>Account Status:</span>
                  </div>
                  <span style={{
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    color: isOnline(viewingUser.lastLogin) ? '#22c55e' : (isDark ? '#94a3b8' : '#64748b')
                  }}>
                    {isOnline(viewingUser.lastLogin) ? '● Active Session' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const u = viewingUser;
                    setViewingUser(null);
                    handleOpenEdit(u);
                  }}
                  style={{ ...sh.submitBlueBtn, flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Edit3 size={15} />
                  <span>Edit Account</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    const nextStatus = viewingUser.status === 'Active' ? 'Inactive' : 'Active';
                    if (onUpdateUser) {
                      await onUpdateUser(viewingUser.email, { status: nextStatus });
                    }
                    setViewingUser(prev => prev ? { ...prev, status: nextStatus } : null);
                    setLocalMsg({ type: 'success', text: `Status changed to ${nextStatus}` });
                    setTimeout(() => setLocalMsg(null), 3000);
                  }}
                  style={{
                    ...sh.submitBlueBtn,
                    flex: 1,
                    backgroundColor: viewingUser.status === 'Active' ? (isDark ? '#3f2525' : '#fee2e2') : (isDark ? '#1b3b2b' : '#dcfce7'),
                    color: viewingUser.status === 'Active' ? '#ef4444' : '#15803d',
                    boxShadow: 'none',
                    border: viewingUser.status === 'Active' ? '1px solid #f87171' : '1px solid #86efac'
                  }}
                >
                  {viewingUser.status === 'Active' ? 'Deactivate' : 'Activate'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div style={sh.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingUser(null)}>
            <motion.div
              style={{ ...sh.modalCard, maxWidth: '460px' }}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={sh.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={20} color={isDark ? '#60a5fa' : '#2563eb'} />
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>Edit User</h2>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditingUser(null)} style={sh.closeBtn}>
                  <X size={20} />
                </motion.button>
              </div>

              {editError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? '#3f1d1d' : '#fee2e2',
                  color: isDark ? '#fca5a5' : '#b91c1c',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px'
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} style={sh.form}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: isDark ? '#cbd5e1' : '#475569' }}>
                    Full Name
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="First Name"
                      required
                      value={editingUser.firstName}
                      onChange={e => setEditingUser({ ...editingUser, firstName: e.target.value })}
                      style={{ ...sh.inputPill, flex: 1 }}
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={editingUser.lastName}
                      onChange={e => setEditingUser({ ...editingUser, lastName: e.target.value })}
                      style={{ ...sh.inputPill, flex: 1 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: isDark ? '#cbd5e1' : '#475569' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    value={editingUser.email}
                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                    style={sh.inputPill}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: isDark ? '#cbd5e1' : '#475569' }}>
                      Role
                    </label>
                    <select
                      value={editingUser.role}
                      onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                      style={sh.inputPill}
                    >
                      <option>Student</option>
                      <option>Teacher</option>
                      <option>Admin</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: isDark ? '#cbd5e1' : '#475569' }}>
                      Status
                    </label>
                    <select
                      value={editingUser.status}
                      onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
                      style={sh.inputPill}
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>Pending</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: isDark ? '#cbd5e1' : '#475569' }}>
                    New Password <span style={{ fontWeight: '400', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>(Leave blank to keep current password)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={editingUser.password}
                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                    style={sh.inputPill}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setEditingUser(null)}
                    style={{ ...sh.submitBlueBtn, backgroundColor: isDark ? '#374151' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#475569', flex: 1, boxShadow: 'none' }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={editLoading}
                    style={{ ...sh.submitBlueBtn, flex: 1, opacity: editLoading ? 0.7 : 1 }}
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {toastVisible && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          backgroundColor: isDark ? '#292218' : '#fff3cd',
          border: isDark ? '1px solid #7a5f20' : '1px solid #ffeaa7',
          borderRadius: '8px', padding: '12px 16px',
          color: isDark ? '#fbbf24' : '#856404',
          fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000
        }}>
          <span>Please select at least one user to perform this action.</span>
        </div>
      )}
    </div>
  );
}