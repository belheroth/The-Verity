import { useState, useEffect, useRef } from 'react';
import { BarChart3, Users, Home, Shield, Settings, Search, Bell, Plus, X, Trash2, User, Menu, X as XIcon, Filter, CheckCircle, AlertCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Shared inner-card style tokens matching mockup specs ───────────────────
const sh = {
  pageWrap:       { flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', minWidth: 0 },
  sectionTitle:   { margin: '0 0 4px', fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' },
  topActions:     { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  addBlueBtn:     { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' },
  searchPill:     { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#e2e8f0', borderRadius: '9999px', padding: '8px 18px', flex: '1 1 180px', maxWidth: '360px', minWidth: 0 },
  searchInput:    { border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '0.875rem', color: '#334155', width: '100%', minWidth: 0 },
  statsGrid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', flexShrink: 0 },
  statCard:       { backgroundColor: 'white', borderRadius: '20px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  statLabel:      { fontSize: '0.85rem', color: '#64748b', marginBottom: '6px', fontWeight: '500' },
  statNum:        { fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 },
  mainCard:       { backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', minWidth: 0 },
  cardTitle:      { margin: '0', fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' },
  cardDivider:    { height: '1px', backgroundColor: '#f1f5f9', margin: '12px 0 16px' },
  tableWrap:      { overflowX: 'auto', width: '100%' },
  tableCapsuleHeader: { backgroundColor: '#a3aeb9', borderRadius: '9999px', padding: '12px 24px', color: '#0f172a', fontWeight: '700', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  table:          { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: '500px' },
  thCell:         { padding: '12px 18px', textAlign: 'left', fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' },
  trRowPill:      { backgroundColor: '#f1f5f9', borderRadius: '9999px' },
  tdCell:         { padding: '12px 18px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle' },
  statusGreenPill: { padding: '4px 16px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', display: 'inline-block', whiteSpace: 'nowrap' },
  statusRedPill:   { padding: '4px 16px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', display: 'inline-block', whiteSpace: 'nowrap' },
  rolePill:       { backgroundColor: '#e2e8f0', color: '#334155', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '600' },
  actionTextLink: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', padding: '2px 6px', textDecoration: 'none' },
  filterPillSelect: { padding: '8px 16px', borderRadius: '9999px', border: '1px solid #cbd5e1', fontSize: '0.83rem', color: '#334155', backgroundColor: 'white', cursor: 'pointer', outline: 'none' },
  sidePanelCard:  { backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' },
  sidePanelTitle: { margin: '0 0 14px', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' },
  approvalRow:    { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' },
  approvePillBtn: { padding: '4px 12px', borderRadius: '9999px', border: '1px solid #86efac', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d' },
  rejectPillBtn:  { padding: '4px 12px', borderRadius: '9999px', border: '1px solid #fca5a5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c' },
  secPillBtn:     { display: 'block', width: '100%', padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: '9999px', backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', textAlign: 'center', marginBottom: '8px' },
  modalOverlay:   { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, backdropFilter: 'blur(4px)', padding: '20px' },
  modalCard:      { backgroundColor: 'white', padding: '28px', borderRadius: '24px', width: '100%', maxWidth: '460px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn:       { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '50%' },
  form:           { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputPill:      { width: '100%', padding: '10px 18px', borderRadius: '9999px', border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#334155', boxSizing: 'border-box', outline: 'none', backgroundColor: '#f8fafc' },
  submitBlueBtn:  { padding: '11px', backgroundColor: '#007bff', border: 'none', borderRadius: '9999px', color: 'white', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' },
};

// ── TAB 1: Dashboard Overview ─────────────────────────────────────────────
function DashboardOverview({ stats, users, query, onDeleteUser, msg }) {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [viewUser, setViewUser] = useState(null);

  const runDiagnostic = async () => {
    setShowDiagnostic(true);
    setDiagnosticData(null);
    const start = Date.now();
    try {
      const res = await fetch(`${API}/health`);
      const data = await res.json();
      setDiagnosticData({ ...data, latency: Date.now() - start });
    } catch (err) {
      setDiagnosticData({ status: 'error', error: 'Server unreachable', latency: Date.now() - start });
    }
  };

  const filtered = users.filter(u => u.role !== 'Admin').filter(u => {
    const q = query.toLowerCase();
    return (u.name || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q)
        || (u.role || '').toLowerCase().includes(q);
  });
  const fmt = iso => { if (!iso) return 'Never'; try { return new Date(iso).toLocaleString(); } catch { return iso; } };

  return (
    <div style={sh.pageWrap}>
      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: msg.type === 'success' ? '#dcfce7' : '#fee2e2', color: msg.type === 'success' ? '#15803d' : '#b91c1c' }}>
          {msg.text}
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div style={sh.statsGrid}>
        <div style={sh.statCard}>
          <div style={sh.statLabel}>Total Active users</div>
          <div style={sh.statNum}>{stats.activeUsers || 25}</div>
        </div>
        <div style={sh.statCard}>
          <div style={sh.statLabel}>Active Classrooms</div>
          <div style={sh.statNum}>{stats.activeClassrooms || 15}</div>
        </div>
        <div style={sh.statCard}>
          <div style={sh.statLabel}>Security Flags Today</div>
          <div style={{ ...sh.statNum, color: '#ef4444' }}>{stats.securityFlagsToday || 0}</div>
        </div>
        <div style={sh.statCard}>
          <div style={sh.statLabel}>System Status</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#22c55e', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #22c55e' }}></span>
            Online
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>100% Uptime • <span style={{ cursor: 'pointer', color: '#007bff' }} onClick={runDiagnostic}>Run Diagnostic</span></div>
        </div>
      </div>

      {/* Main Content Table Container */}
      <div style={sh.mainCard}>
        <h2 style={{ ...sh.cardTitle, marginBottom: '16px' }}>User Management</h2>
        
        <div style={sh.tableWrap}>
          {/* Capsule Table Header */}
          <div style={{ backgroundColor: '#a3aeb9', borderRadius: '9999px', padding: '12px 24px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 0.8fr', alignItems: 'center', fontWeight: '700', color: '#0f172a', fontSize: '0.88rem', marginBottom: '10px' }}>
            <div>Name</div>
            <div>Role</div>
            <div>Status</div>
            <div>Last Login</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {/* Table Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: '0.9rem' }}>No users found</div>
            ) : (
              filtered.map(u => (
                <div key={u.email} className="table-row-pill" style={{ padding: '10px 24px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 0.8fr', alignItems: 'center', fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{u.name}</div>
                  <div><span style={sh.rolePill}>{u.role}</span></div>
                  <div>
                    <span style={u.status === 'Active' ? sh.statusGreenPill : sh.statusRedPill}>
                      {u.status === 'Active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{fmt(u.lastLogin)}</div>
                  <div style={{ textAlign: 'right' }}>
                    <button onClick={() => setViewUser(u)} style={sh.actionTextLink} className="btn-anim">View</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showDiagnostic && (
        <div style={sh.modalOverlay} className="modal-overlay-anim">
          <div style={{ ...sh.modalCard, maxWidth: '400px', textAlign: 'center' }} className="animate-scale-in">
            <h2 style={{ margin: '0 0 16px', color: '#1e293b' }}>System Diagnostic</h2>
            
            {!diagnosticData ? (
              <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '36px', height: '36px', border: '4px solid #cbd5e1', borderTopColor: '#007bff', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                <strong style={{ fontSize: '1.1rem', color: '#334155' }}>Running diagnostic checks...</strong>
              </div>
            ) : diagnosticData.status === 'operational' ? (
              <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CheckCircle size={48} color="#22c55e" style={{ marginBottom: '12px' }} />
                <strong style={{ fontSize: '1.1rem', color: '#22c55e' }}>All systems operational!</strong>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px' }}>
                  Latency: {diagnosticData.latency}ms • Server Uptime: {Math.floor(diagnosticData.uptime / 60)}m {Math.floor(diagnosticData.uptime % 60)}s
                  <br />Database: {diagnosticData.db === 'connected' ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            ) : (
              <div style={{ padding: '24px', backgroundColor: '#fee2e2', borderRadius: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <AlertCircle size={48} color="#b91c1c" style={{ marginBottom: '12px' }} />
                <strong style={{ fontSize: '1.1rem', color: '#b91c1c' }}>System Error Detected</strong>
                <p style={{ fontSize: '0.85rem', color: '#b91c1c', marginTop: '8px' }}>
                  {diagnosticData.error}
                  <br />Latency: {diagnosticData.latency}ms
                </p>
              </div>
            )}
            
            <button onClick={() => setShowDiagnostic(false)} style={sh.submitBlueBtn}>Close</button>
          </div>
        </div>
      )}

      {/* User View Modal */}
      {viewUser && (
        <div style={sh.modalOverlay} className="modal-overlay-anim">
          <div style={{ ...sh.modalCard, maxWidth: '480px' }} className="animate-scale-in">
            <div style={sh.modalHeader}>
              <h2 style={{ margin: 0, color: '#1e293b' }}>User Details</h2>
              <button onClick={() => setViewUser(null)} style={sh.closeBtn}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={32} color="#475569" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{viewUser.name}</h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>{viewUser.email}</p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={viewUser.status === 'Active' ? sh.statusGreenPill : sh.statusRedPill}>{viewUser.status === 'Active' ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Role</span>
                <span style={{ color: '#1e293b', fontWeight: '700', fontSize: '0.9rem' }}>{viewUser.role}</span>
              </div>
              {viewUser.role === 'Student' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Current Class</span>
                    <span style={{ color: '#1e293b', fontWeight: '700', fontSize: '0.9rem' }}>CS101 - Introduction to Programming</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Current Grade</span>
                    <span style={{ color: '#1e293b', fontWeight: '700', fontSize: '0.9rem', color: '#15803d' }}>A- (92%)</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Last Login</span>
                <span style={{ color: '#1e293b', fontWeight: '700', fontSize: '0.9rem' }}>{fmt(viewUser.lastLogin)}</span>
              </div>
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button style={{ ...sh.addBlueBtn, backgroundColor: '#e2e8f0', color: '#475569', boxShadow: 'none' }}>Edit User</button>
              <button onClick={() => setViewUser(null)} style={sh.submitBlueBtn}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB 2: User Management ────────────────────────────────────────────────
function UserManagementTab({ users, onDeleteUser, onUpdateUser }) {
  const [query, setQuery]               = useState('');
  const [roleFilter, setRoleFilter]     = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected]         = useState([]);
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [newUser, setNewUser]           = useState({ firstName: '', lastName: '', email: '', password: '', role: 'Student' });
  const [localMsg, setLocalMsg]         = useState(null);
  const [modalAction, setModalAction]   = useState(null);
  const [newPassword, setNewPassword]   = useState('');

  const filtered = users.filter(u => u.role !== 'Admin').filter(u => {
    const q = query.toLowerCase();
    return ((u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
        && (roleFilter   === 'All' || u.role   === roleFilter)
        && (statusFilter === 'All' || u.status === statusFilter);
  });
  const pending   = users.filter(u => u.role === 'Teacher' && u.status !== 'Active');
  const fmt       = iso => { if (!iso) return 'Never'; try { return new Date(iso).toLocaleString(); } catch { return iso; } };
  const toggleSel = email => setSelected(p => p.includes(email) ? p.filter(e => e !== email) : [...p, email]);
  const toggleAll = ()    => setSelected(selected.length === filtered.length && filtered.length > 0 ? [] : filtered.map(u => u.email));

  const handleAdd = async (e) => {
    e.preventDefault();
    const payload = { name: `${newUser.firstName} ${newUser.lastName}`.trim(), email: newUser.email, password: newUser.password, role: newUser.role };
    try {
      const res  = await fetch(`${API}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
      setLocalMsg({ type: 'error', text: 'Select at least one user first.' });
      setTimeout(() => setLocalMsg(null), 3000);
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
    <div style={sh.pageWrap} className="animate-fade-in">
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '320px' }}>
          {/* User List Dashboard Card */}
          <div style={sh.mainCard} className="card-anim">
            <h2 style={{ ...sh.cardTitle, marginBottom: '14px' }}>User List Dashboard</h2>
            {localMsg && <div style={{ padding: '8px 16px', borderRadius: '9999px', marginBottom: '12px', fontSize: '0.85rem', backgroundColor: localMsg.type === 'success' ? '#dcfce7' : '#fee2e2', color: localMsg.type === 'success' ? '#15803d' : '#b91c1c' }}>{localMsg.text}</div>}
            
            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={sh.searchPill}>
                <Search size={15} color="#64748b" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." style={sh.searchInput} />
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={sh.filterPillSelect}>
                <option value="All">Filter by Roles</option>
                <option>Student</option><option>Teacher</option><option>Admin</option>
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={sh.filterPillSelect}>
                <option value="All">Filter by Status</option>
                <option value="Active">Active</option><option value="Inactive">Inactive</option>
              </select>
              <button onClick={() => setIsAddOpen(true)} style={sh.addBlueBtn} className="btn-anim">
                <Plus size={15} /><span>Add Single User</span>
              </button>
            </div>

            {/* Table */}
            <div style={sh.tableWrap}>
              <div style={{ backgroundColor: '#a3aeb9', borderRadius: '9999px', padding: '12px 20px', display: 'grid', gridTemplateColumns: '40px 1.5fr 1.5fr 1fr 1fr 1.2fr 1fr', alignItems: 'center', fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', marginBottom: '8px' }}>
                <div><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></div>
                <div>Name</div><div>Email</div><div>Role</div><div>Status</div><div>Last Login</div><div style={{ textAlign: 'right' }}>Actions</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No users found</div>
                ) : (
                  filtered.map(u => (
                    <div key={u.email} className="table-row-pill" style={{ padding: '10px 20px', display: 'grid', gridTemplateColumns: '40px 1.5fr 1.5fr 1fr 1fr 1.2fr 1fr', alignItems: 'center', fontSize: '0.85rem' }}>
                      <div><input type="checkbox" checked={selected.includes(u.email)} onChange={() => toggleSel(u.email)} /></div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{u.name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                      <div><span style={sh.rolePill}>{u.role}</span></div>
                      <div><span style={u.status === 'Active' ? sh.statusGreenPill : sh.statusRedPill}>{u.status === 'Active' ? 'Active' : 'Inactive'}</span></div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{fmt(u.lastLogin)}</div>
                      <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button style={sh.actionTextLink} className="btn-anim">Edit</button>
                        <button style={sh.actionTextLink} className="btn-anim">View</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


        </div>

        {/* Right Column Side Panels */}
        <div style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={sh.sidePanelCard} className="card-anim">
            <h3 style={sh.sidePanelTitle}>Pending Instructor Approval</h3>
            {pending.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                No pending approvals
              </div>
            ) : (
              pending.slice(0, 4).map(u => (
                <div key={u.email} style={sh.approvalRow} className="table-row-pill">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Instructor</div>
                  </div>
                  <button onClick={() => onUpdateUser(u.email, { status: 'Active' })} style={sh.approvePillBtn} className="btn-anim">Approve</button>
                  <button onClick={() => onUpdateUser(u.email, { status: 'Rejected' })} style={sh.rejectPillBtn} className="btn-anim">Reject</button>
                </div>
              ))
            )}
          </div>

          <div style={sh.sidePanelCard} className="card-anim">
            <h3 style={sh.sidePanelTitle}>Security Permission Control</h3>
            <button onClick={() => handleBulkActionClick('reset')} style={sh.secPillBtn} className="btn-anim">Force Reset Password for Selected</button>
            <button onClick={() => handleBulkActionClick('suspend')} style={sh.secPillBtn} className="btn-anim">Suspend Selected Account</button>
            <button onClick={() => handleBulkActionClick('delete')} style={{ ...sh.secPillBtn, borderColor: '#fca5a5', color: '#b91c1c', marginBottom: 0 }} className="btn-anim">Deactivate / Delete Account</button>
          </div>
        </div>
      </div>

      {/* Security Action Modal */}
      {modalAction && (
        <div style={sh.modalOverlay} className="modal-overlay-anim">
          <div style={{ ...sh.modalCard, maxWidth: '400px' }} className="animate-scale-in">
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
              <button onClick={() => setModalAction(null)} style={{ ...sh.submitBlueBtn, backgroundColor: '#e2e8f0', color: '#475569', flex: 1, boxShadow: 'none' }}>Cancel</button>
              <button onClick={confirmBulkAction} style={{ ...sh.submitBlueBtn, flex: 1, backgroundColor: modalAction === 'delete' ? '#ef4444' : '#007bff' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && (
        <div style={sh.modalOverlay}>
          <div style={sh.modalCard} className="animate-scale-in">
            <div style={sh.modalHeader}>
              <h2 style={{ margin: 0, color: '#1e293b' }}>Add New User</h2>
              <button onClick={() => setIsAddOpen(false)} style={sh.closeBtn}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} style={sh.form}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="First Name" required value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} style={{ ...sh.inputPill, flex: 1 }} />
                <input type="text" placeholder="Last Name"  required value={newUser.lastName}  onChange={e => setNewUser({ ...newUser, lastName:  e.target.value })} style={{ ...sh.inputPill, flex: 1 }} />
              </div>
              <input type="email"    placeholder="Email"    required value={newUser.email}    onChange={e => setNewUser({ ...newUser, email:    e.target.value })} style={sh.inputPill} />
              <input type="password" placeholder="Password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={sh.inputPill} />
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={sh.inputPill}>
                <option>Student</option><option>Teacher</option><option>Admin</option>
              </select>
              <button type="submit" style={sh.submitBlueBtn}>Add User</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB 3: Global Classes ─────────────────────────────────────────────────
function GlobalClassesTab() {
  const [classes, setClasses]     = useState([]);
  const [query, setQuery]         = useState('');
  const [viewClass, setViewClass] = useState(null);

  useEffect(() => {
    fetch(`${API}/classrooms`)
      .then(r => r.json())
      .then(d => setClasses(d.classrooms || d || []))
      .catch(() => setClasses([]));
  }, []);

  const totalActive = classes.filter(c => c.status === 'Active' || c.isActive).length;
  const filtered    = classes.filter(c => {
    const q = query.toLowerCase();
    return (c.name || c.className || '').toLowerCase().includes(q)
        || (c.instructor || c.instructorName || '').toLowerCase().includes(q);
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
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." style={sh.searchInput} />
          </div>
          <button style={sh.addBlueBtn} className="btn-anim">
            <Plus size={16} /><span>Create New Class</span>
          </button>
        </div>

        {/* Table */}
        <div style={sh.tableWrap}>
          <div style={{ backgroundColor: '#a3aeb9', borderRadius: '9999px', padding: '12px 24px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', alignItems: 'center', fontWeight: '700', color: '#0f172a', fontSize: '0.88rem', marginBottom: '10px' }}>
            <div>Class Name</div>
            <div>Instructor</div>
            <div>Term</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Action</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>No classrooms found</div>
            ) : (
              filtered.map((c, i) => {
                const active = c.status === 'Active' || c.isActive || i % 2 === 0;
                return (
                  <div key={i} style={{ backgroundColor: '#f1f5f9', borderRadius: '9999px', padding: '10px 24px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', alignItems: 'center', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{c.name || c.className || 'Unnamed'}</div>
                    <div style={{ color: '#475569' }}>{c.instructor || c.instructorName || 'Instructor Name'}</div>
                    <div style={{ color: '#64748b' }}>{c.term || 'Fall 2026'}</div>
                    <div>
                      <span style={active ? sh.statusGreenPill : sh.statusRedPill}>
                        {active ? 'Active' : 'Archived'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setViewClass(c)} style={sh.actionTextLink}>View</button>
                      <button style={{ ...sh.actionTextLink, color: '#475569' }}>Archive</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Class Details Modal */}
      {viewClass && (
        <div style={sh.modalOverlay}>
          <div style={{ ...sh.modalCard, maxWidth: '580px' }} className="animate-scale-in">
            <div style={sh.modalHeader}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Class Details</h2>
              <button onClick={() => setViewClass(null)} style={sh.closeBtn}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>Instructor : <span style={{ backgroundColor: '#e2e8f0', borderRadius: '9999px', padding: '2px 10px', fontWeight: '600' }}>{viewClass.instructor || 'Name'}</span></span>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>Academic Term : <span style={{ backgroundColor: '#e2e8f0', borderRadius: '9999px', padding: '2px 10px', fontWeight: '600' }}>{viewClass.term || 'Term'}</span></span>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>Total Student : <span style={{ backgroundColor: '#e2e8f0', borderRadius: '9999px', padding: '2px 10px', fontWeight: '600' }}>{viewClass.students?.length || 0}</span></span>
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
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB 4: Security & Audit Logs ──────────────────────────────────────────
function SecurityAuditLogsTab() {
  const [filter, setFilter] = useState('All');

  return (
    <div style={sh.pageWrap}>
      <div style={sh.statsGrid}>
        {[['Total Events','#0f172a',0],['High Severity','#ef4444',0],['Warnings Today','#f59e0b',0],['Admin Actions','#007bff',0]].map(([label, color, val]) => (
          <div key={label} style={sh.statCard}>
            <div style={sh.statLabel}>{label}</div>
            <div style={{ ...sh.statNum, color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={sh.mainCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h2 style={sh.cardTitle}>Immutable Event Log</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Chronological, read-only record of all system events</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['All', 'Normal', 'Warning', 'High'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 16px', borderRadius: '9999px', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', backgroundColor: filter === f ? '#0f172a' : 'white', color: filter === f ? 'white' : '#334155' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={sh.tableWrap}>
          <div style={{ backgroundColor: '#a3aeb9', borderRadius: '9999px', padding: '12px 20px', display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 2fr', alignItems: 'center', fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', marginBottom: '8px' }}>
            <div>Timestamp</div><div>Performed By</div><div>Event Type</div><div>Severity</div><div>Description</div>
          </div>
          <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>No security events recorded yet.</div>
        </div>
      </div>
    </div>
  );
}

// ── TAB 5: System Settings ────────────────────────────────────────────────
function SystemSettingsTab() {
  const [perms, setPerms] = useState({ studentViewGrades: true, teacherCreateClass: true, adminDeleteUsers: true });
  const [saved, setSaved] = useState(false);

  const labels = {
    studentViewGrades:  'Students can view their own grades',
    teacherCreateClass: 'Teachers can create new classrooms',
    adminDeleteUsers:   'Admins can delete user accounts',
  };
  const toggle = k => setPerms(p => ({ ...p, [k]: !p[k] }));
  const save   = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const Toggle = ({ on, onToggle }) => (
    <button onClick={onToggle} style={{ width: '46px', height: '24px', borderRadius: '9999px', border: 'none', cursor: 'pointer', backgroundColor: on ? '#22c55e' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: '3px', left: on ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );

  return (
    <div style={sh.pageWrap}>
      <div style={{ ...sh.mainCard, maxWidth: '640px' }}>
        <h2 style={{ ...sh.cardTitle, marginBottom: '4px' }}>Role Based Access Control</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px' }}>Define permissions for each user role.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {Object.entries(labels).map(([k, label]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500' }}>{label}</span>
              <Toggle on={perms[k]} onToggle={() => toggle(k)} />
            </div>
          ))}
        </div>

        <button onClick={save} style={{ ...sh.addBlueBtn, marginTop: '24px', alignSelf: 'flex-start', backgroundColor: saved ? '#22c55e' : '#007bff' }} className="btn-anim">
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Main AdminDashboard shell ─────────────────────────────────────────────
export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [users, setUsers]                 = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('verity_sidebar_collapsed');
    return saved ? saved === 'true' : false;
  });
  const navRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ top: Number(sessionStorage.getItem('verity_admin_nav_top')) || 0, height: 42, opacity: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeRef = navRefs.current[activeTab];
      if (activeRef) {
        setIndicatorStyle(prev => {
          if (prev.top === activeRef.offsetTop && prev.height === activeRef.offsetHeight && prev.opacity === 1) return prev;
          sessionStorage.setItem('verity_admin_nav_top', activeRef.offsetTop);
          return { top: activeRef.offsetTop, height: activeRef.offsetHeight, opacity: 1 };
        });
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [activeTab, sidebarCollapsed]);
  const [query, setQuery]                 = useState('');
  const [msg, setMsg]                     = useState(null);
  const [loading, setLoading]             = useState(false);
  const [stats, setStats]                 = useState({ activeUsers: 0, activeClassrooms: 0, securityFlagsToday: 0 });
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [newUser, setNewUser]             = useState({ firstName: '', lastName: '', email: '', password: '', role: 'Student' });

  const handleUpdateUser = (email, updates) => {
    setUsers(prev => prev.map(u => u.email === email ? { ...u, ...updates } : u));
  };

  const loadUsers = async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/users`); const d = await r.json(); setUsers(d.users || []); }
    catch { setUsers([]); } finally { setLoading(false); }
  };
  const loadStats = async () => {
    try {
      const r = await fetch(`${API}/stats`); const d = await r.json();
      setStats({ activeUsers: d.activeUsers || 0, activeClassrooms: d.activeClassrooms || 0, securityFlagsToday: d.securityFlagsToday || 0 });
    } catch { /* keep previous */ }
  };
  useEffect(() => { loadUsers(); loadStats(); const iv = setInterval(loadStats, 10000); return () => clearInterval(iv); }, []);
  useEffect(() => {
    localStorage.setItem('verity_sidebar_collapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    const payload = { name: `${newUser.firstName} ${newUser.lastName}`.trim(), email: newUser.email, password: newUser.password, role: newUser.role };
    try {
      const res  = await fetch(`${API}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: data.message || 'Could not add user' }); return; }
      setIsModalOpen(false);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'Student' });
      setMsg({ type: 'success', text: 'User added successfully.' });
      setTimeout(() => setMsg(null), 3000);
      loadUsers(); loadStats();
    } catch { setMsg({ type: 'error', text: 'Could not connect to server.' }); }
  };

  const handleDeleteUser = async (email) => {
    if (!window.confirm(`Delete user ${email}?`)) return;
    try { const r = await fetch(`${API}/users/${encodeURIComponent(email)}`, { method: 'DELETE' }); if (r.ok) { loadUsers(); loadStats(); } }
    catch { setMsg({ type: 'error', text: 'Could not connect to server.' }); }
  };

  // Nav menu items mapping
  const navItems = [
    { id: 'dashboard', Icon: BarChart3, label: 'Dashboard Overview' },
    { id: 'users',     Icon: Users,     label: 'User Management' },
    { id: 'classes',   Icon: Home,      label: 'Global Classes' },
    { id: 'security',  Icon: Shield,    label: 'Security & Audit Logs' },
    { id: 'settings',  Icon: Settings,  label: 'Settings' },
  ];

  const getHeaderTitle = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'users':     return 'User Management';
      case 'classes':   return 'Global Classes';
      case 'security':  return 'Security & Audit Logs';
      case 'settings':  return 'Settings';
      default:          return 'Admin Panel';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', minHeight: '100vh', background: 'linear-gradient(180deg, #e4e9ed 0%, #cbd5e1 100%)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* ═══ SIDEBAR NAVIGATION ═══ */}
      <aside
        style={{
          width: sidebarCollapsed ? '88px' : '240px',
          minWidth: sidebarCollapsed ? '88px' : '240px',
          padding: sidebarCollapsed ? '20px 8px 20px' : '20px 14px 20px',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          background: 'linear-gradient(180deg, #dce3ea 0%, #c5d0db 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.4)',
          overflowY: 'auto'
        }}
      >
        {/* Sidebar Header: Burger Menu + Logo immediately to the right */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: sidebarCollapsed ? '10px' : '12px',
          whiteSpace: 'nowrap',
          width: '100%',
          marginBottom: '28px',
          justifyContent: 'flex-start',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          paddingLeft: sidebarCollapsed ? '6px' : '0'
        }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0,
              transition: 'all 0.2s ease'
            }}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="btn-anim"
          >
            <Menu 
              size={24} 
              color="#10b981" 
              style={{ 
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', 
                transform: sidebarCollapsed ? 'rotate(180deg) scale(0.9)' : 'rotate(0deg) scale(1)' 
              }} 
            />
          </button>

          {/* Logo on the right side of the burger menu */}
          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', overflow: 'visible' }} onClick={() => setActiveTab('dashboard')}>
            <span style={{ color: '#10b981', display: 'inline-block' }}>V</span>
            {!sidebarCollapsed && (
              <>
                <span style={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>erity</span>
                <span style={{ fontSize: '0.7rem', backgroundColor: '#4b5563', color: 'white', padding: '3px 8px', borderRadius: '10px', marginLeft: '6px', fontStyle: 'normal', transform: 'translateY(-5px)' }}>Admin</span>
              </>
            )}
          </div>
        </div>

        {/* Navigation Items with Glass Highlight */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, position: 'relative' }}>
          {/* Liquid sliding indicator */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            background: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.35)',
            transition: 'top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.3s ease, opacity 0.2s ease',
            opacity: indicatorStyle.opacity,
            pointerEvents: 'none',
            zIndex: 0,
          }} />

          {navItems.map(({ id, Icon, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                ref={el => navRefs.current[id] = el}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  gap: '10px',
                  padding: sidebarCollapsed ? '10px' : '10px 18px',
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
                }}
                title={sidebarCollapsed ? label : ''}
              >
                <Icon size={20} color={active ? '#10b981' : '#475569'} style={{ flexShrink: 0 }} />
                {!sidebarCollapsed && (
                  <span style={{ fontSize: '0.85rem', fontWeight: active ? '700' : '600', color: active ? '#10b981' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile & Logout Pill */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #b0bac5', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
              <User size={20} color="#475569" />
            </div>
            {!sidebarCollapsed && (
              <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' }}>System Admin</span>
            )}
          </div>
          <button
            onClick={onLogout}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '9999px',
              padding: sidebarCollapsed ? '8px' : '8px 24px',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              alignSelf: sidebarCollapsed ? 'center' : 'flex-start',
              marginLeft: sidebarCollapsed ? 0 : '48px',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
              whiteSpace: 'nowrap'
            }}
            className="btn-anim"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT AREA ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px 24px', minWidth: 0, overflow: 'hidden' }}>

        {/* Floating Top Header Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          marginBottom: '20px',
          gap: '16px',
          flexWrap: 'wrap',
          flexShrink: 0
        }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
            {getHeaderTitle(activeTab)}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#e2e8f0', borderRadius: '9999px', padding: '8px 18px', width: '260px' }}>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search..."
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: '#334155' }}
                />
                <Search size={16} color="#64748b" />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifications(!showNotifications)} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }} title="Notifications">
                <Bell size={18} color="#475569" />
                <span style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '1px solid white' }} />
              </button>
              {showNotifications && (
                <div style={{ position: 'absolute', top: '48px', right: 0, width: '320px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, padding: '16px', border: '1px solid #e2e8f0' }} className="animate-scale-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>Notifications</h3>
                    <span onClick={() => setShowNotifications(false)} style={{ fontSize: '0.75rem', color: '#007bff', cursor: 'pointer', fontWeight: '600' }}>Mark all as read</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.8rem', color: '#334155' }}>
                      <strong style={{ color: '#1e293b' }}>System Update</strong><br/><span style={{ color: '#64748b' }}>A new version of Verity is available.</span>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.8rem', color: '#334155' }}>
                      <strong style={{ color: '#1e293b' }}>New Registration</strong><br/><span style={{ color: '#64748b' }}>3 new instructors are awaiting approval.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'dashboard' && (
              <button onClick={() => setIsModalOpen(true)} style={sh.addBlueBtn} className="btn-anim">
                <Plus size={16} />
                <span>Add new user</span>
              </button>
            )}

            {activeTab === 'classes' && (
              <button style={sh.addBlueBtn} className="btn-anim">
                <Plus size={16} />
                <span>Create New Class</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
          {loading && activeTab === 'dashboard' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
              <div style={{ width: '36px', height: '36px', border: '4px solid #cbd5e1', borderTopColor: '#007bff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {activeTab === 'dashboard' && <DashboardOverview stats={stats} users={users} query={query} setQuery={setQuery} onDeleteUser={handleDeleteUser} msg={msg} />}
          {activeTab === 'users'     && <UserManagementTab users={users} onDeleteUser={handleDeleteUser} onUpdateUser={handleUpdateUser} />}
          {activeTab === 'classes'   && <GlobalClassesTab />}
          {activeTab === 'security'  && <SecurityAuditLogsTab />}
          {activeTab === 'settings'  && <SystemSettingsTab />}
        </div>
      </div>

      {/* Global Add User Modal */}
      {isModalOpen && (
        <div style={sh.modalOverlay} className="modal-overlay-anim">
          <div style={sh.modalCard} className="animate-scale-in">
            <div style={sh.modalHeader}>
              <h2 style={{ margin: 0, color: '#1e293b' }}>Add New User</h2>
              <button onClick={() => setIsModalOpen(false)} style={sh.closeBtn}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddUser} style={sh.form}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="First Name" required value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} style={{ ...sh.inputPill, flex: 1 }} />
                <input type="text" placeholder="Last Name"  required value={newUser.lastName}  onChange={e => setNewUser({ ...newUser, lastName:  e.target.value })} style={{ ...sh.inputPill, flex: 1 }} />
              </div>
              <input type="email"    placeholder="Email"    required value={newUser.email}    onChange={e => setNewUser({ ...newUser, email:    e.target.value })} style={sh.inputPill} />
              <input type="password" placeholder="Password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={sh.inputPill} />
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={sh.inputPill}>
                <option>Student</option><option>Teacher</option><option>Admin</option>
              </select>
              <button type="submit" style={sh.submitBlueBtn}>Add User</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}