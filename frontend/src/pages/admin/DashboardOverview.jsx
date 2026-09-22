import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Users, Home, Shield, Settings, Search, Bell, Plus, X, Trash2, User, Menu, X as XIcon, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import UITransitionsShowcase from '../../components/UITransitionsShowcase';
import PendingInstructorApproval from '../../components/PendingInstructorApproval';
import { apiFetch } from '../../utils/api';
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
  sectionTitle: { margin: '0 0 4px', fontSize: '1.25rem', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' },
  topActions: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  addBlueBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' },
  searchPill: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: isDark ? '#2a2a2a' : '#e2e8f0', borderRadius: '9999px', padding: '8px 18px', flex: '1 1 180px', maxWidth: '360px', minWidth: 0 },
  searchInput: { border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '0.875rem', color: isDark ? '#e2e8f0' : '#334155', width: '100%', minWidth: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', flexShrink: 0 },
  statCard: { backgroundColor: isDark ? '#2c2c2c' : 'white', borderRadius: '20px', padding: '20px 24px', boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '110px', border: isDark ? '1px solid #3a3a3a' : 'none' },
  statLabel: { fontSize: '0.85rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '6px', fontWeight: '500' },
  statNum: { fontSize: '2.2rem', fontWeight: '800', color: isDark ? '#f1f5f9' : '#0f172a', lineHeight: 1.1 },
  mainCard: { backgroundColor: isDark ? '#2c2c2c' : 'white', borderRadius: '24px', padding: '24px', boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', minWidth: 0, border: isDark ? '1px solid #3a3a3a' : 'none' },
  cardTitle: { margin: '0', fontSize: '1.1rem', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' },
  cardDivider: { height: '1px', backgroundColor: isDark ? '#3a3a3a' : '#f1f5f9', margin: '12px 0 16px' },
  tableWrap: { overflowX: 'auto', width: '100%', MsOverflowStyle: 'none', scrollbarWidth: 'none' },
  tableCapsuleHeader: { backgroundColor: isDark ? '#374151' : '#a3aeb9', borderRadius: '9999px', padding: '12px 24px', color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: '700', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  trRowPill: { backgroundColor: isDark ? '#333' : '#f1f5f9', borderRadius: '9999px' },
  tdCell: { padding: '12px 18px', fontSize: '0.875rem', color: isDark ? '#cbd5e1' : '#334155', verticalAlign: 'middle' },
  statusGreenPill: { padding: '4px 16px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', display: 'inline-block', whiteSpace: 'nowrap' },
  statusRedPill: { padding: '4px 16px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', display: 'inline-block', whiteSpace: 'nowrap' },
  rolePill: { backgroundColor: isDark ? '#374151' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#334155', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '600' },
  actionTextLink: { background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', color: isDark ? '#93c5fd' : '#1e293b', padding: '2px 6px', textDecoration: 'none', WebkitAppearance: 'none', appearance: 'none' },
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
  submitBlueBtn: { padding: '11px', backgroundColor: '#007bff', border: 'none', borderRadius: '9999px', color: 'white', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' },
});

export default function DashboardOverview({ stats, users, query, setQuery, onDeleteUser, msg }) {
  const { isDark } = useDarkMode();
  const sh = getStyles(isDark);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [viewOrigin, setViewOrigin] = useState({ x: '50%', y: '50%' });
  const [serverOnline, setServerOnline] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/health`, { signal: AbortSignal.timeout(4000) });
        setServerOnline(res.ok);
      } catch {
        setServerOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    const goOnline = () => checkHealth();
    const goOffline = () => setServerOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const runDiagnostic = async () => {
    setShowDiagnostic(true);
    setDiagnosticData(null);
    const start = Date.now();
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/health`);
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

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(tick);
  }, []);

  const isOnline = (lastLogin) => {
    if (!lastLogin) return false;
    try { return (now - new Date(lastLogin).getTime()) < 30 * 60 * 1000; } catch { return false; }
  };

  return (
    <div style={sh.pageWrap}>
      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '600', backgroundColor: msg.type === 'success' ? '#dcfce7' : '#fee2e2', color: msg.type === 'success' ? '#15803d' : '#b91c1c' }}>
          {msg.text}
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: isDark ? '#3C3C3C' : '#EEF0F3',
        zIndex: 10,
        padding: '0 0 16px 0'
      }}>
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
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: serverOnline === false ? '#ef4444' : '#22c55e', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '10px', height: '10px',
                backgroundColor: serverOnline === false ? '#ef4444' : serverOnline === null ? '#f59e0b' : '#22c55e',
                borderRadius: '50%',
                boxShadow: serverOnline === false ? '0 0 10px #ef4444' : serverOnline === null ? '0 0 10px #f59e0b' : '0 0 10px #22c55e',
                flexShrink: 0,
              }} />
              {serverOnline === null ? 'Checking...' : serverOnline ? 'Online' : 'Offline'}
            </div>
            <div style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: '500' }}>
              {serverOnline === false ? 'Server unreachable' : serverOnline === null ? 'Connecting...' : '100% Uptime'}
              {' • '}
              <span style={{ cursor: 'pointer', color: '#007bff' }} onClick={runDiagnostic}>Run Diagnostic</span>
            </div>
          </div>
        </div>
      </div>

      <UITransitionsShowcase />

      {/* Main Content Table Container */}
      <div style={sh.mainCard}>
        <h2 style={{ ...sh.cardTitle, marginBottom: '16px' }}>User Management</h2>

        <div style={sh.tableWrap}>
          {/* Capsule Table Header */}
          <div style={{ backgroundColor: isDark ? '#374151' : '#a3aeb9', borderRadius: '9999px', padding: '12px 24px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 0.8fr', alignItems: 'center', fontWeight: '700', color: isDark ? '#f1f5f9' : '#0f172a', fontSize: '0.88rem', marginBottom: '10px' }}>
            <div>Name</div>
            <div>Role</div>
            <div>Status</div>
            <div>Last Login</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {/* Table Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.9rem' }}>No users found</div>
            ) : (
              filtered.map(u => (
                <div key={u.email} className="table-row-pill" style={{ padding: '10px 24px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 0.8fr', alignItems: 'center', fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: '600', color: isDark ? '#f1f5f9' : '#1e293b' }}>{u.name}</div>
                  <div><span style={sh.rolePill}>{u.role}</span></div>
                  <div>
                    <span style={isOnline(u.lastLogin) ? sh.statusGreenPill : sh.statusRedPill}>
                      {isOnline(u.lastLogin) ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b' }}>{fmt(u.lastLogin)}</div>
                  <div style={{ textAlign: 'right' }}>
                     <motion.button
                       whileHover={{ scale: 1.05 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={(e) => {
                         const rect = e.currentTarget.getBoundingClientRect();
                         setViewOrigin({
                           x: `${rect.left + rect.width / 2}px`,
                           y: `${rect.top + rect.height / 2}px`,
                         });
                         setViewUser(u);
                       }}
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

      <AnimatePresence>
        {showDiagnostic && (
          <motion.div style={sh.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={{ ...sh.modalCard, maxWidth: '400px', textAlign: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <h2 style={{ margin: '0 0 16px', color: isDark ? '#f1f5f9' : '#1e293b' }}>System Diagnostic</h2>

              {!diagnosticData ? (
                <div style={{ padding: '24px', backgroundColor: isDark ? '#2a2a2a' : '#f8fafc', borderRadius: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', border: '4px solid #cbd5e1', borderTopColor: '#007bff', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                  <strong style={{ fontSize: '1.1rem', color: isDark ? '#cbd5e1' : '#334155' }}>Running diagnostic checks...</strong>
                </div>
              ) : diagnosticData.status === 'operational' ? (
                <div style={{ padding: '24px', backgroundColor: isDark ? '#2a2a2a' : '#f8fafc', borderRadius: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <CheckCircle size={48} color="#22c55e" style={{ marginBottom: '12px' }} />
                  <strong style={{ fontSize: '1.1rem', color: '#22c55e' }}>All systems operational!</strong>
                  <p style={{ fontSize: '0.85rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: '8px' }}>
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

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDiagnostic(false)}
                style={sh.submitBlueBtn}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User View Modal */}
      <AnimatePresence>
        {viewUser && (
          <motion.div
            style={{ ...sh.modalOverlay, transformOrigin: `${viewOrigin.x} ${viewOrigin.y}` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.div
              style={{ ...sh.modalCard, maxWidth: '480px', transformOrigin: `${viewOrigin.x} ${viewOrigin.y}` }}
              initial={{ opacity: 0, scale: 0.55, y: 32, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.6, y: 24, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.9, filter: { duration: 0.2 } }}
            >
              <div style={sh.modalHeader}>
                <h2 style={{ margin: 0, color: isDark ? '#f1f5f9' : '#1e293b' }}>User Details</h2>
                <button onClick={() => setViewUser(null)} style={sh.closeBtn}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: isDark ? '#374151' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={32} color={isDark ? '#94a3b8' : '#475569'} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: isDark ? '#f1f5f9' : '#0f172a' }}>{viewUser.name}</h3>
                  <p style={{ margin: '4px 0 0', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.85rem' }}>{viewUser.email}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={viewUser.status === 'Active' ? sh.statusGreenPill : sh.statusRedPill}>{viewUser.status === 'Active' ? 'Active' : 'Inactive'}</span>
                </div>
              </div>

              <div style={{ backgroundColor: isDark ? '#2a2a2a' : '#f8fafc', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: isDark ? '1px solid #3a3a3a' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${isDark ? '#3a3a3a' : '#e2e8f0'}`, paddingBottom: '8px' }}>
                  <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Role</span>
                  <span style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: '700', fontSize: '0.9rem' }}>{viewUser.role}</span>
                </div>
                {viewUser.role === 'Student' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${isDark ? '#3a3a3a' : '#e2e8f0'}`, paddingBottom: '8px' }}>
                    <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.85rem', fontWeight: '500', flexShrink: 0, marginRight: '16px' }}>Enrolled Classes</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                      <span style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: '600', fontSize: '0.85rem', backgroundColor: isDark ? '#374151' : '#f1f5f9', padding: '4px 10px', borderRadius: '9999px' }}>CS101 - Introduction to Programming</span>
                      <span style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: '600', fontSize: '0.85rem', backgroundColor: isDark ? '#374151' : '#f1f5f9', padding: '4px 10px', borderRadius: '9999px' }}>MATH202 - Calculus II</span>
                      <span style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: '600', fontSize: '0.85rem', backgroundColor: isDark ? '#374151' : '#f1f5f9', padding: '4px 10px', borderRadius: '9999px' }}>ENG105 - Academic Writing</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Last Login</span>
                  <span style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: '700', fontSize: '0.9rem' }}>{fmt(viewUser.lastLogin)}</span>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', backgroundColor: isDark ? '#374151' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#475569', border: 'none', borderRadius: '9999px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', boxShadow: 'none' }}
                >
                  Edit User
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewUser(null)}
                  style={sh.submitBlueBtn}
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}