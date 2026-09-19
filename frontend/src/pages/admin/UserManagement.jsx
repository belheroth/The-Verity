import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Users, Home, Shield, Settings, Search, Bell, Plus, X, Trash2, User, Menu, X as XIcon, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import PendingInstructorApproval from '../../components/PendingInstructorApproval';
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
  searchPill: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#e2e8f0', borderRadius: '9999px', padding: '8px 18px', flex: '1 1 180px', maxWidth: '360px', minWidth: 0 },
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
  rolePill: { backgroundColor: '#e2e8f0', color: '#334155', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '600' },
  actionTextLink: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', padding: '2px 6px', textDecoration: 'none' },
  filterPillSelect: { padding: '8px 16px', borderRadius: '9999px', border: '1px solid #cbd5e1', fontSize: '0.83rem', color: '#334155', backgroundColor: 'white', cursor: 'pointer', outline: 'none' },
  sidePanelCard: { backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' },
  sidePanelTitle: { margin: '0 0 14px', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' },
  approvalRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' },
  secPillBtn: { display: 'block', width: '100%', padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: '9999px', backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', textAlign: 'center', marginBottom: '8px' },
  filterChip: { padding: '6px 16px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: '#dbeafe', color: '#1d4ed8', transition: 'all 0.15s ease', whiteSpace: 'nowrap' },
  filterChipActive: { padding: '6px 16px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', boxShadow: '0 2px 8px rgba(37,99,235,0.3)', whiteSpace: 'nowrap' },
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

export default function UserManagementTab({ users = [], loading = false, onDeleteUser, onUpdateUser, onShowSelectUsersPopup }) {
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


  const filtered = users.filter(u => u.role !== 'Admin').filter(u => {
    const q = query.toLowerCase();
    return ((u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      && (roleFilter === 'All' || u.role === roleFilter)
      && (statusFilter === 'All' || u.status === statusFilter);
  });
  const pending = users.filter(u => u.role === 'Teacher' && u.status !== 'Active');
  const fmt = iso => { if (!iso) return 'Never'; try { return new Date(iso).toLocaleString(); } catch { return iso; } };
  const toggleSel = email => setSelected(p => p.includes(email) ? p.filter(e => e !== email) : [...p, email]);
  const toggleAll = () => setSelected(selected.length === filtered.length && filtered.length > 0 ? [] : filtered.map(u => u.email));

  // Tick every 60s so status pills re-evaluate automatically
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(tick);
  }, []);
  // Active = logged in within the last 30 minutes
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
      // Show toast notification instead of popup
      setToastVisible(true);
      // Hide toast after 3 seconds
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

  return (
    <div style={sh.pageWrap}>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '320px' }}>
          {/* User List Dashboard Card */}
          <div style={sh.mainCard}>
            <h2 style={{ ...sh.cardTitle, marginBottom: '14px' }}>User List Dashboard</h2>
            {localMsg && <div style={{ padding: '8px 16px', borderRadius: '9999px', marginBottom: '12px', fontSize: '0.85rem', backgroundColor: localMsg.type === 'success' ? '#dcfce7' : '#fee2e2', color: localMsg.type === 'success' ? '#15803d' : '#b91c1c' }}>{localMsg.text}</div>}

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={sh.searchPill}>
                <Search size={15} color="#64748b" />
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

              {/* Role Filter Popup */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setRoleOpen(p => !p); setStatusOpen(false); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '9999px', minWidth: '150px',
                    border: roleFilter !== 'All' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: roleFilter !== 'All' ? '#eff6ff' : 'white',
                    color: roleFilter !== 'All' ? '#2563eb' : '#334155',
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
                      style={{
                        position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                        backgroundColor: 'white', borderRadius: '16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '14px 16px',
                        zIndex: 100, minWidth: '180px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</p>
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

              {/* Status Filter Popup */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setStatusOpen(p => !p); setRoleOpen(false); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '9999px', minWidth: '150px',
                    border: statusFilter !== 'All' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: statusFilter !== 'All' ? '#eff6ff' : 'white',
                    color: statusFilter !== 'All' ? '#2563eb' : '#334155',
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
                      style={{
                        position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                        backgroundColor: 'white', borderRadius: '16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '14px 16px',
                        zIndex: 100, minWidth: '180px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</p>
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
                  setAddOrigin({
                    x: `${rect.left + rect.width / 2}px`,
                    y: `${rect.top + rect.height / 2}px`,
                  });
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
              <div style={{ backgroundColor: '#a3aeb9', borderRadius: '9999px', padding: '12px 20px', display: 'grid', gridTemplateColumns: '40px 1.5fr 1.5fr 1fr 1fr 1.2fr 1fr', alignItems: 'center', fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', marginBottom: '8px' }}>
                <div><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></div>
                <div>Name</div><div>Email</div><div>Role</div><div>Status</div><div>Last Login</div><div style={{ textAlign: 'right' }}>Actions</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton.Row key={i} />)
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No users found</div>
                ) : (
                  filtered.map(u => (
                    <div key={u.email} className="table-row-pill" style={{ padding: '10px 20px', display: 'grid', gridTemplateColumns: '40px 1.5fr 1.5fr 1fr 1fr 1.2fr 1fr', alignItems: 'center', fontSize: '0.85rem' }}>
                      <div><input type="checkbox" checked={selected.includes(u.email)} onChange={() => toggleSel(u.email)} /></div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{u.name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                      <div><span style={sh.rolePill}>{u.role}</span></div>
                      <div><span style={isOnline(u.lastLogin) ? sh.statusGreenPill : sh.statusRedPill}>{isOnline(u.lastLogin) ? 'Active' : 'Inactive'}</span></div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{fmt(u.lastLogin)}</div>
                      <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={sh.actionTextLink}
                          className="btn-anim"
                        >
                          Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={sh.actionTextLink}
                          className="btn-anim"
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

        {/* Right Column Side Panels */}
        <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <PendingInstructorApproval
            users={users}
            onUpdateUser={onUpdateUser}
          />

          <div style={sh.sidePanelCard}>
            <h3 style={sh.sidePanelTitle}>Security Permission Control</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleBulkActionClick('reset')}
              style={sh.secPillBtn}
              className="btn-anim"
            >
              Force Reset Password for Selected
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleBulkActionClick('suspend')}
              style={sh.secPillBtn}
              className="btn-anim"
            >
              Suspend Selected Account
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleBulkActionClick('delete')}
              style={{ ...sh.secPillBtn, borderColor: '#fca5a5', color: '#b91c1c', marginBottom: 0 }}
              className="btn-anim"
            >
              Deactivate / Delete Account
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modalAction && (
          <motion.div style={sh.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={{ ...sh.modalCard, maxWidth: '400px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <h2 style={{ margin: '0 0 16px', color: '#1e293b' }}>
                {modalAction === 'reset' ? 'Reset Password' : modalAction === 'suspend' ? 'Suspend Account' : 'Delete Account'}
              </h2>
              <div style={{ marginBottom: '20px', color: '#334155', fontSize: '0.9rem' }}>
                {modalAction === 'reset' ? (
                  <>
                    <p>Enter a new password for the selected user(s):</p>
                    <p style={{ fontWeight: '700', color: '#007bff', marginBottom: '12px' }}>
                      {selected.map(e => users.find(u => u.email === e)?.name || e).join(', ')}
                    </p>
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={sh.inputPill}
                    />
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setModalAction(null)}
                  style={{ ...sh.submitBlueBtn, backgroundColor: '#e2e8f0', color: '#475569', flex: 1, boxShadow: 'none' }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={confirmBulkAction}
                  style={{ ...sh.submitBlueBtn, flex: 1, backgroundColor: modalAction === 'delete' ? '#ef4444' : '#007bff' }}
                >
                  Confirm
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddOpen && (
          <motion.div
            style={{ ...sh.modalOverlay }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.div
              style={{ ...sh.modalCard, transformOrigin: `${addOrigin.x} ${addOrigin.y}` }}
              initial={{ opacity: 0, scale: 0.55, y: 32, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.6, y: 24, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.9, filter: { duration: 0.2 } }}
            >
              <div style={sh.modalHeader}>
                <h2 style={{ margin: 0, color: '#1e293b' }}>Add New User</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAddOpen(false)}
                  style={sh.closeBtn}
                >
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  style={sh.submitBlueBtn}
                >
                  Add User
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      {toastVisible && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#856404',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          <span>Please select at least one user to perform this action.</span>
        </div>
      )}
    </div>
  );
}