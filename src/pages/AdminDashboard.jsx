import { useState, useEffect, useRef } from 'react';
import { BarChart3, Users, Home, Shield, Settings, Search, Bell, Plus, X, Trash2, User, Menu } from 'lucide-react';

const API = 'http://localhost:3001';

// ── Shared inner-card style tokens ─────────────────────────────────────────
// All tab content lives inside a white outer card, so inner elements use
// a very light gray (#f4f6f8) so they stay visually distinct.
const sh = {
  pageWrap:       { flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 24px 24px', overflowY: 'auto', minWidth: 0 },
  sectionTitle:   { margin: '0 0 16px', fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' },
  topActions:     { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  addBtn:         { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  searchWrap:     { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#edf0f4', borderRadius: '50px', padding: '7px 14px', flex: '1 1 140px', maxWidth: '300px', minWidth: 0 },
  searchInput:    { border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '0.875rem', color: '#374151', width: '100%', minWidth: 0 },
  statsGrid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', flexShrink: 0 },
  statCard:       { backgroundColor: '#f4f6f8', borderRadius: '14px', padding: '18px 20px' },
  statLabel:      { fontSize: '0.82rem', color: '#6b7280', marginBottom: '4px', fontWeight: '500' },
  statNum:        { fontSize: '2rem', fontWeight: '800', color: '#111827', lineHeight: 1.1 },
  card:           { backgroundColor: '#f4f6f8', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', minWidth: 0 },
  cardTitle:      { margin: '0', fontSize: '1rem', fontWeight: '700', color: '#1f2937' },
  cardDivider:    { height: '1px', backgroundColor: '#e5e7eb', margin: '10px 0 14px' },
  tableWrap:      { overflowX: 'auto' },
  table:          { width: '100%', borderCollapse: 'collapse', minWidth: '480px' },
  tHead:          { backgroundColor: '#edf0f4' },
  th:             { padding: '10px 14px', textAlign: 'left', fontSize: '0.78rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' },
  tRow:           { borderBottom: '1px solid #edf0f4' },
  td:             { padding: '10px 14px', fontSize: '0.875rem', color: '#374151', verticalAlign: 'middle' },
  statusPill:     { padding: '3px 10px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: '700', display: 'inline-block', whiteSpace: 'nowrap' },
  rolePill:       { backgroundColor: '#e5e7eb', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '600' },
  actionBtn:      { padding: '4px 11px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' },
  deleteBtn:      { background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex', alignItems: 'center', padding: '4px', borderRadius: '6px' },
  msgBar:         { padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '500', flexShrink: 0, marginBottom: '10px' },
  filterSelect:   { padding: '7px 11px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.83rem', color: '#374151', backgroundColor: 'white', cursor: 'pointer', outline: 'none' },
  sidePanel:      { backgroundColor: '#f4f6f8', borderRadius: '14px', padding: '16px' },
  sidePanelTitle: { margin: '0 0 10px', fontSize: '0.83rem', fontWeight: '700', color: '#1f2937' },
  approvalRow:    { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' },
  approveBtn:     { padding: '3px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.73rem', fontWeight: '700', whiteSpace: 'nowrap' },
  secBtn:         { display: 'block', width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontSize: '0.76rem', fontWeight: '500', textAlign: 'left', marginBottom: '6px' },
  modalOverlay:   { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, backdropFilter: 'blur(4px)', padding: '20px' },
  modalCard:      { backgroundColor: 'white', padding: '28px', borderRadius: '18px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' },
  closeBtn:       { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '8px' },
  form:           { display: 'flex', flexDirection: 'column', gap: '14px' },
  input:          { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '0.9rem', color: '#374151', boxSizing: 'border-box', outline: 'none', backgroundColor: 'white' },
  submitBtn:      { padding: '12px', backgroundColor: '#2563eb', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', width: '100%' },
};

// ── TAB 1: Dashboard Overview ─────────────────────────────────────────────
function DashboardOverview({ stats, users, query, setQuery, onAddUser, onDeleteUser, msg }) {
  const filtered = users.filter(u => {
    const q = query.toLowerCase();
    return (u.name || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q)
        || (u.role || '').toLowerCase().includes(q);
  });
  const fmt = iso => { if (!iso) return 'Never'; try { return new Date(iso).toLocaleString(); } catch { return iso; } };

  return (
    <div style={sh.pageWrap}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={sh.sectionTitle}>Dashboard Overview</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {msg && (
            <div style={{ ...sh.msgBar, margin: 0, backgroundColor: msg.type === 'success' ? '#d1fae5' : '#fee2e2', color: msg.type === 'success' ? '#065f46' : '#991b1b' }}>
              {msg.text}
            </div>
          )}
          <div style={sh.searchWrap}>
            <Search size={14} color="#9ca3af" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users..." style={sh.searchInput} />
          </div>
          <button onClick={onAddUser} style={sh.addBtn} className="btn-anim">
            <Plus size={15} /><span>Add new user</span>
          </button>
        </div>
      </div>

      <div style={sh.statsGrid}>
        <div style={sh.statCard} className="card-hover animate-fade-in-up">
          <div style={sh.statLabel}>Total Active Users</div>
          <div style={sh.statNum}>{stats.activeUsers}</div>
        </div>
        <div style={sh.statCard} className="card-hover animate-fade-in-up delay-1">
          <div style={sh.statLabel}>Active Classrooms</div>
          <div style={sh.statNum}>{stats.activeClassrooms}</div>
        </div>
        <div style={sh.statCard} className="card-hover animate-fade-in-up delay-2">
          <div style={sh.statLabel}>Security Flags Today</div>
          <div style={{ ...sh.statNum, color: '#ef4444' }}>{stats.securityFlagsToday}</div>
        </div>
        <div style={sh.statCard} className="card-hover animate-fade-in-up delay-3">
          <div style={sh.statLabel}>System Status</div>
          <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>Online</div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>100% Uptime</div>
        </div>
      </div>

      <div style={sh.card} className="animate-fade-in-up delay-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={sh.cardTitle}>User Management</h2>
          <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{filtered.length} users</span>
        </div>
        <div style={sh.cardDivider} />
        <div style={sh.tableWrap}>
          <table style={sh.table}>
            <thead>
              <tr style={sh.tHead}>
                <th style={sh.th}>Name</th>
                <th style={sh.th}>Role</th>
                <th style={sh.th}>Status</th>
                <th style={sh.th}>Last Login</th>
                <th style={sh.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#9ca3af' }}>No users found</td></tr>
                : filtered.map(u => (
                  <tr key={u.email} style={sh.tRow}>
                    <td style={{ ...sh.td, fontWeight: '600' }}>{u.name}</td>
                    <td style={sh.td}><span style={sh.rolePill}>{u.role}</span></td>
                    <td style={sh.td}>
                      <span style={{ ...sh.statusPill, backgroundColor: u.status === 'Active' ? '#dcfce7' : '#fef2f2', color: u.status === 'Active' ? '#16a34a' : '#dc2626' }}>
                        {u.status === 'Active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ ...sh.td, fontSize: '0.8rem', color: '#6b7280' }}>{fmt(u.lastLogin)}</td>
                    <td style={sh.td}>
                      <button onClick={() => onDeleteUser(u.email)} style={sh.deleteBtn} className="icon-btn-anim" title="Delete user">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── TAB 2: User Management ────────────────────────────────────────────────
function UserManagementTab({ users }) {
  const [query, setQuery]               = useState('');
  const [roleFilter, setRoleFilter]     = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected]         = useState([]);
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [newUser, setNewUser]           = useState({ firstName: '', lastName: '', email: '', password: '', role: 'Student' });
  const [localMsg, setLocalMsg]         = useState(null);

  const filtered = users.filter(u => {
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

  return (
    <div style={sh.pageWrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ ...sh.sectionTitle, margin: 0 }}>User Management</h1>
      </div>

      <div style={{ display: 'flex', gap: '14px', flex: 1, minHeight: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '300px' }}>
          <div style={sh.card}>
            <h2 style={sh.cardTitle}>User List Dashboard</h2>
            <div style={sh.cardDivider} />
            {localMsg && <div style={{ ...sh.msgBar, backgroundColor: localMsg.type === 'success' ? '#d1fae5' : '#fee2e2', color: localMsg.type === 'success' ? '#065f46' : '#991b1b' }}>{localMsg.text}</div>}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ ...sh.searchWrap, flex: '1 1 120px', maxWidth: 'none' }}>
                <Search size={13} color="#9ca3af" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." style={sh.searchInput} />
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={sh.filterSelect}>
                <option value="All">Filter by Roles</option>
                <option>Student</option><option>Teacher</option><option>Admin</option>
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={sh.filterSelect}>
                <option value="All">Filter by Status</option>
                <option value="Active">Active</option><option value="Inactive">Inactive</option>
              </select>
              <button onClick={() => setIsAddOpen(true)} style={sh.addBtn} className="btn-anim">
                <Plus size={13} /><span>Add Single User</span>
              </button>
            </div>
            <div style={sh.tableWrap}>
              <table style={sh.table}>
                <thead>
                  <tr style={sh.tHead}>
                    <th style={{ ...sh.th, width: '32px' }}><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                    <th style={sh.th}>Name</th><th style={sh.th}>Email</th><th style={sh.th}>Role</th>
                    <th style={sh.th}>Status</th><th style={sh.th}>Last Login</th><th style={sh.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#9ca3af' }}>No users found</td></tr>
                    : filtered.map(u => (
                      <tr key={u.email} style={sh.tRow}>
                        <td style={sh.td}><input type="checkbox" checked={selected.includes(u.email)} onChange={() => toggleSel(u.email)} /></td>
                        <td style={{ ...sh.td, fontWeight: '600' }}>{u.name}</td>
                        <td style={{ ...sh.td, color: '#6b7280', fontSize: '0.8rem' }}>{u.email}</td>
                        <td style={sh.td}><span style={sh.rolePill}>{u.role}</span></td>
                        <td style={sh.td}><span style={{ ...sh.statusPill, backgroundColor: u.status === 'Active' ? '#dcfce7' : '#fef2f2', color: u.status === 'Active' ? '#16a34a' : '#dc2626' }}>{u.status === 'Active' ? 'Active' : 'Inactive'}</span></td>
                        <td style={{ ...sh.td, fontSize: '0.76rem', color: '#6b7280' }}>{fmt(u.lastLogin)}</td>
                        <td style={sh.td}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button style={{ ...sh.actionBtn, backgroundColor: '#2563eb', color: 'white' }}>Edit</button>
                            <button style={{ ...sh.actionBtn, backgroundColor: '#e5e7eb', color: '#374151' }}>View</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={sh.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={sh.cardTitle}>Security &amp; Audit Logs</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#9ca3af' }}>User Management Action History</p>
              </div>
              <button style={{ ...sh.actionBtn, backgroundColor: '#e5e7eb', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Search size={11} /> Filter logs
              </button>
            </div>
            <div style={sh.cardDivider} />
            <div style={sh.tableWrap}>
              <table style={sh.table}>
                <thead>
                  <tr style={sh.tHead}>
                    <th style={sh.th}>Performed By</th><th style={sh.th}>Action Type</th>
                    <th style={sh.th}>Action Description</th><th style={sh.th}>Affected User</th><th style={sh.th}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '28px', color: '#9ca3af' }}>No action history recorded yet.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={sh.sidePanel}>
            <h3 style={sh.sidePanelTitle}>Pending Instructor Approval</h3>
            {pending.length === 0
              ? <p style={{ fontSize: '0.76rem', color: '#9ca3af', margin: 0 }}>No pending approvals.</p>
              : pending.slice(0, 4).map(u => (
                <div key={u.email} style={sh.approvalRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: '700', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  <button style={{ ...sh.approveBtn, backgroundColor: '#dcfce7', color: '#16a34a' }}>Yes</button>
                  <button style={{ ...sh.approveBtn, backgroundColor: '#fee2e2', color: '#dc2626' }}>No</button>
                </div>
              ))}
          </div>
          <div style={sh.sidePanel}>
            <h3 style={sh.sidePanelTitle}>Security Permission Control</h3>
            <button style={sh.secBtn}>Force Reset Password for Selected</button>
            <button style={sh.secBtn}>Suspend Selected Account</button>
            <button style={{ ...sh.secBtn, backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5', marginBottom: 0 }}>Deactivate / Delete Account</button>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div style={sh.modalOverlay}>
          <div style={sh.modalCard} className="animate-scale-in">
            <div style={sh.modalHeader}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>Add New User</h2>
              <button onClick={() => setIsAddOpen(false)} style={sh.closeBtn}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} style={sh.form}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="First Name" required value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} style={{ ...sh.input, flex: 1 }} />
                <input type="text" placeholder="Last Name"  required value={newUser.lastName}  onChange={e => setNewUser({ ...newUser, lastName:  e.target.value })} style={{ ...sh.input, flex: 1 }} />
              </div>
              <input type="email"    placeholder="Email"    required value={newUser.email}    onChange={e => setNewUser({ ...newUser, email:    e.target.value })} style={sh.input} />
              <input type="password" placeholder="Password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={sh.input} />
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={sh.input}>
                <option>Student</option><option>Teacher</option><option>Admin</option>
              </select>
              <button type="submit" style={sh.submitBtn}>Add User</button>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ ...sh.sectionTitle, margin: 0 }}>Global Classes</h1>
        <button style={sh.addBtn} className="btn-anim"><Plus size={13} /><span>Create New Class</span></button>
      </div>

      <div style={sh.statsGrid}>
        {[
          ['Total Class',       classes.length,               '#111827'],
          ['Active Classrooms', totalActive,                  '#10b981'],
          ['Archived',          classes.length - totalActive, '#6b7280'],
          ['Orphaned Classes',  0,                            '#f59e0b'],
        ].map(([label, val, color]) => (
          <div key={label} style={sh.statCard} className="card-hover animate-fade-in-up">
            <div style={sh.statLabel}>{label}</div>
            <div style={{ ...sh.statNum, color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={sh.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={sh.cardTitle}>Classroom Directory Management</h2>
          <div style={{ ...sh.searchWrap, maxWidth: '240px' }}>
            <Search size={13} color="#9ca3af" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search classes..." style={sh.searchInput} />
          </div>
        </div>
        <div style={sh.cardDivider} />
        <div style={sh.tableWrap}>
          <table style={sh.table}>
            <thead>
              <tr style={sh.tHead}>
                <th style={sh.th}>Class Name</th><th style={sh.th}>Instructor</th>
                <th style={sh.th}>Term</th><th style={sh.th}>Status</th><th style={sh.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>No classrooms found</td></tr>
                : filtered.map((c, i) => {
                  const active = c.status === 'Active' || c.isActive;
                  return (
                    <tr key={i} style={sh.tRow}>
                      <td style={{ ...sh.td, fontWeight: '600' }}>{c.name || c.className || 'Unnamed'}</td>
                      <td style={sh.td}>{c.instructor || c.instructorName || '\u2014'}</td>
                      <td style={sh.td}>{c.term || '\u2014'}</td>
                      <td style={sh.td}><span style={{ ...sh.statusPill, backgroundColor: active ? '#dcfce7' : '#fef2f2', color: active ? '#16a34a' : '#dc2626' }}>{active ? 'Active' : 'Archived'}</span></td>
                      <td style={sh.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => setViewClass(c)} style={{ ...sh.actionBtn, backgroundColor: '#e5e7eb', color: '#374151' }}>View</button>
                          <button style={{ ...sh.actionBtn, backgroundColor: '#fee2e2', color: '#dc2626' }}>Archive</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {viewClass && (
        <div style={sh.modalOverlay}>
          <div style={{ ...sh.modalCard, maxWidth: '560px' }} className="animate-scale-in">
            <div style={sh.modalHeader}>
              <h2 style={{ margin: 0 }}>Class Details</h2>
              <button onClick={() => setViewClass(null)} style={sh.closeBtn}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem' }}><span style={{ color: '#6b7280' }}>Instructor: </span><b>{viewClass.instructor || viewClass.instructorName || '\u2014'}</b></span>
              <span style={{ fontSize: '0.85rem' }}><span style={{ color: '#6b7280' }}>Academic Term: </span><b>{viewClass.term || '\u2014'}</b></span>
              <span style={{ fontSize: '0.85rem' }}><span style={{ color: '#6b7280' }}>Total Student: </span><b>{viewClass.students?.length || 0}</b></span>
            </div>
            <div style={{ ...sh.searchWrap, maxWidth: '100%', marginBottom: '12px', backgroundColor: '#f4f6f8' }}>
              <Search size={13} color="#9ca3af" />
              <input placeholder="Search students..." style={sh.searchInput} />
            </div>
            <div style={sh.tableWrap}>
              <table style={{ ...sh.table, minWidth: '300px' }}>
                <thead><tr style={sh.tHead}><th style={sh.th}>Name</th><th style={sh.th}>Email</th><th style={sh.th}>Status</th></tr></thead>
                <tbody>
                  {(!viewClass.students || viewClass.students.length === 0)
                    ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>No students enrolled</td></tr>
                    : viewClass.students.map((st, i) => (
                      <tr key={i} style={sh.tRow}>
                        <td style={{ ...sh.td, fontWeight: '600' }}>{st.name}</td>
                        <td style={{ ...sh.td, color: '#6b7280', fontSize: '0.82rem' }}>{st.email}</td>
                        <td style={sh.td}><span style={{ ...sh.statusPill, backgroundColor: '#dcfce7', color: '#16a34a' }}>Active</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
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
      <h1 style={sh.sectionTitle}>Security &amp; Audit Logs</h1>

      <div style={sh.statsGrid}>
        {[['Total Events','#111827',0],['High Severity','#ef4444',0],['Warnings Today','#f59e0b',0],['Admin Actions','#2563eb',0]].map(([label, color, val]) => (
          <div key={label} style={sh.statCard} className="card-hover animate-fade-in-up">
            <div style={sh.statLabel}>{label}</div>
            <div style={{ ...sh.statNum, color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={sh.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={sh.cardTitle}>Immutable Event Log</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#9ca3af' }}>Chronological, read-only record of all system events</p>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['All', 'Normal', 'Warning', 'High'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: '20px', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '0.76rem', fontWeight: '700', backgroundColor: filter === f ? '#1f2937' : 'white', color: filter === f ? 'white' : '#374151' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div style={sh.cardDivider} />
        <div style={sh.tableWrap}>
          <table style={sh.table}>
            <thead>
              <tr style={sh.tHead}>
                <th style={sh.th}>Timestamp</th><th style={sh.th}>Performed By</th>
                <th style={sh.th}>Event Type</th><th style={sh.th}>Severity</th><th style={sh.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No security events recorded yet.</td></tr>
            </tbody>
          </table>
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
    <button onClick={onToggle} style={{ width: '46px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', backgroundColor: on ? '#10b981' : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: '3px', left: on ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );

  return (
    <div style={sh.pageWrap}>
      <h1 style={sh.sectionTitle}>Settings</h1>
      <div style={{ ...sh.card, maxWidth: '560px' }}>
        <h2 style={{ ...sh.cardTitle, marginBottom: '2px' }}>Role Based Access Control</h2>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '4px 0 0' }}>Define what each role is allowed to do.</p>
        <div style={sh.cardDivider} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {Object.entries(labels).map(([k, label]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>{label}</span>
              <Toggle on={perms[k]} onToggle={() => toggle(k)} />
            </div>
          ))}
        </div>
        <button onClick={save} style={{ ...sh.submitBtn, marginTop: '22px', width: 'auto', padding: '11px 32px', backgroundColor: saved ? '#10b981' : '#2563eb' }} className="btn-anim">
          {saved ? '\u2713 Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Main AdminDashboard shell ─────────────────────────────────────────────
export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [users, setUsers]                 = useState([]);
  const [query, setQuery]                 = useState('');
  const [msg, setMsg]                     = useState(null);
  const [loading, setLoading]             = useState(false);
  const [stats, setStats]                 = useState({ activeUsers: 0, activeClassrooms: 0, securityFlagsToday: 0 });
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
  const [newUser, setNewUser]             = useState({ firstName: '', lastName: '', email: '', password: '', role: 'Student' });
  const profileRef                        = useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  // Main nav (Settings is placed separately at bottom of sidebar)
  const navItems = [
    { id: 'dashboard', Icon: BarChart3, label: 'Dashboard Overview'   },
    { id: 'users',     Icon: Users,     label: 'User Management'       },
    { id: 'classes',   Icon: Home,      label: 'Global Classes'        },
    { id: 'security',  Icon: Shield,    label: 'Security & Audit Logs' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', minHeight: '100vh', background: 'linear-gradient(135deg, #d4dfe8 0%, #c8d8e5 100%)', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{ width: '175px', minWidth: '175px', padding: '22px 16px 24px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Hamburger */}
        <div style={{ marginBottom: '16px', cursor: 'pointer', color: '#374151' }}>
          <Menu size={22} color="#374151" />
        </div>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '36px' }}>
          <span style={{ color: '#10b981', fontStyle: 'italic', fontWeight: 900, fontSize: '1.9rem', lineHeight: 1 }}>V</span>
          <span style={{ color: '#374151', fontStyle: 'italic', fontWeight: 900, fontSize: '1.9rem', lineHeight: 1 }}>erity</span>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {navItems.map(({ id, Icon, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', background: 'none', border: 'none',
                  borderRadius: '10px', cursor: 'pointer', width: '100%',
                  color: active ? '#10b981' : '#6b7280',
                  fontWeight: active ? '600' : '400',
                  fontSize: '0.88rem', textAlign: 'left',
                  transition: 'color 0.2s',
                }}
              >
                <Icon size={18} color={active ? '#10b981' : '#9ca3af'} style={{ flexShrink: 0 }} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Settings gear at bottom */}
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 12px', background: 'none', border: 'none',
            cursor: 'pointer', borderRadius: '10px', width: '100%',
            color: activeTab === 'settings' ? '#10b981' : '#9ca3af',
            fontWeight: activeTab === 'settings' ? '600' : '400',
            fontSize: '0.88rem', textAlign: 'left', transition: 'color 0.2s',
          }}
        >
          <Settings size={20} color={activeTab === 'settings' ? '#10b981' : '#9ca3af'} />
          {activeTab === 'settings' && 'Settings'}
        </button>
      </aside>

      {/* ═══ MAIN RIGHT AREA ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px 20px 0', minWidth: 0 }}>

        {/* Top-right profile button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => setShowProfile(p => !p)}
            style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#b0bfcc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.6)', cursor: 'pointer', flexShrink: 0, backdropFilter: 'blur(4px)' }}
          >
            <User size={20} color="#fff" />
          </button>

          {/* Profile dropdown */}
          {showProfile && (
            <div className="animate-slide-down" style={{ position: 'absolute', top: '50px', right: 0, backgroundColor: 'white', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', padding: '8px', minWidth: '160px', zIndex: 100 }}>
              <div style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '700', color: '#1f2937', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                System Admin
              </div>
              <button
                onClick={onLogout}
                style={{ display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#dc2626', fontWeight: '600', borderRadius: '8px' }}
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* ── White content card ── */}
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '20px', overflow: 'auto', minHeight: 0, minWidth: 0, position: 'relative' }}>
          {loading && activeTab === 'dashboard' && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '20px' }}>
              <div style={{ width: '36px', height: '36px', border: '4px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {activeTab === 'dashboard' && <DashboardOverview stats={stats} users={users} query={query} setQuery={setQuery} onAddUser={() => setIsModalOpen(true)} onDeleteUser={handleDeleteUser} msg={msg} />}
          {activeTab === 'users'     && <UserManagementTab users={users} onDeleteUser={handleDeleteUser} />}
          {activeTab === 'classes'   && <GlobalClassesTab />}
          {activeTab === 'security'  && <SecurityAuditLogsTab />}
          {activeTab === 'settings'  && <SystemSettingsTab />}
        </div>
      </div>

      {/* ── Global Add-User Modal ── */}
      {isModalOpen && (
        <div style={sh.modalOverlay} className="modal-overlay-anim">
          <div style={sh.modalCard} className="animate-scale-in">
            <div style={sh.modalHeader}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>Add New User</h2>
              <button onClick={() => setIsModalOpen(false)} style={sh.closeBtn}><X size={22} /></button>
            </div>
            <form onSubmit={handleAddUser} style={sh.form}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="First Name" required value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} style={{ ...sh.input, flex: 1 }} />
                <input type="text" placeholder="Last Name"  required value={newUser.lastName}  onChange={e => setNewUser({ ...newUser, lastName:  e.target.value })} style={{ ...sh.input, flex: 1 }} />
              </div>
              <input type="email"    placeholder="Email"    required value={newUser.email}    onChange={e => setNewUser({ ...newUser, email:    e.target.value })} style={sh.input} />
              <input type="password" placeholder="Password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={sh.input} />
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={sh.input}>
                <option>Student</option><option>Teacher</option><option>Admin</option>
              </select>
              <button type="submit" style={sh.submitBtn}>Add User</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}