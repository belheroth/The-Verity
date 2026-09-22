import { useState, useEffect, useRef } from 'react';
import { BarChart3, Users, Home, Shield, Settings } from 'lucide-react';
import AdminLayout from './admin/AdminLayout';
import DashboardOverview from './admin/DashboardOverview';
import UserManagement from './admin/UserManagement';
import GlobalClasses from './admin/GlobalClasses';
import SecurityLogs from './admin/SecurityLogs';
import AdminSettings from './admin/AdminSettings';
import { apiFetch } from '../utils/api';

// Shared styles for modals and global elements (moved from original file)
const sh = {
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
  addBlueBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' },
};

export default function AdminDashboard({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('verity_sidebar_collapsed');
    return saved ? saved === 'true' : false;
  });
  const navRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ top: Number(sessionStorage.getItem('verity_admin_nav_top')) || 0, height: 42, opacity: 0 });
  const [query, setQuery] = useState('');
  const [dashboardSearchFocused, setDashboardSearchFocused] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ activeUsers: 0, activeClassrooms: 0, securityFlagsToday: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSelectUsersPopup, setShowSelectUsersPopup] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    const cleared = localStorage.getItem('verity_notifications_cleared');
    if (cleared === 'true') return [];
    return [
      { id: 1, title: 'System Update', text: 'A new version of Verity is available.' },
      { id: 2, title: 'New Registration', text: '3 new instructors are awaiting approval.' }
    ];
  });

  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'Student' });

  const handleUpdateUser = async (email, updates) => {
    try {
      const endpoint = (Object.keys(updates).length === 1 && updates.status)
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/users/${encodeURIComponent(email)}/status`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/users/${encodeURIComponent(email)}`;
      const res = await apiFetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Failed to update user' };
      }
      setUsers(prev => prev.map(u => u.email === email ? { ...u, ...updates, ...(data.user || {}) } : u));
      loadStats();
      return { success: true, user: data.user };
    } catch (err) {
      console.error("Failed to update user", err);
      return { success: false, message: 'Server connection error' };
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try { const r = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/users`); const d = await r.json(); setUsers(d.users || []); }
    catch { setUsers([]); } finally { setLoading(false); }
  };
  const loadStats = async () => {
    try {
      const r = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/stats`); const d = await r.json();
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
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
    try { const r = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/users/${encodeURIComponent(email)}`, { method: 'DELETE' }); if (r.ok) { loadUsers(); loadStats(); } }
    catch { setMsg({ type: 'error', text: 'Could not connect to server.' }); }
  };

  // Nav menu items mapping
  const navItems = [
    { id: 'dashboard', Icon: BarChart3, label: 'Dashboard Overview' },
    { id: 'users', Icon: Users, label: 'User Management' },
    { id: 'classes', Icon: Home, label: 'Global Classes' },
    { id: 'security', Icon: Shield, label: 'Security & Audit Logs' },
    { id: 'settings', Icon: Settings, label: 'Settings' },
  ];

  const getHeaderTitle = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'users': return 'User Management';
      case 'classes': return 'Global Classes';
      case 'security': return 'Security & Audit Logs';
      case 'settings': return 'Settings';
      default: return 'Admin Panel';
    }
  };

  return (
    <AdminLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      query={query}
      setQuery={setQuery}
      dashboardSearchFocused={dashboardSearchFocused}
      setDashboardSearchFocused={setDashboardSearchFocused}
      notifications={notifications}
      setNotifications={setNotifications}
      showNotifications={showNotifications}
      setShowNotifications={setShowNotifications}
      isModalOpen={isModalOpen}
      setIsModalOpen={setIsModalOpen}
      newUser={newUser}
      setNewUser={setNewUser}
      handleAddUser={handleAddUser}
      currentUser={currentUser}
      onLogout={onLogout}
      showSelectUsersPopup={showSelectUsersPopup}
      setShowSelectUsersPopup={setShowSelectUsersPopup}
    >
      {activeTab === 'dashboard' && (
        <DashboardOverview
          stats={stats}
          users={users}
          query={query}
          setQuery={setQuery}
          onDeleteUser={handleDeleteUser}
          msg={msg}
        />
      )}
      {activeTab === 'users' && (
        <UserManagement
          users={users}
          loading={loading}
          onDeleteUser={handleDeleteUser}
          onUpdateUser={handleUpdateUser}
          onShowSelectUsersPopup={setShowSelectUsersPopup}
        />
      )}
      {activeTab === 'classes' && <GlobalClasses />}
      {activeTab === 'security' && <SecurityLogs />}
      {activeTab === 'settings' && <AdminSettings currentUser={currentUser} />}
    </AdminLayout>
  );
}