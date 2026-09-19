import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertCircle } from 'lucide-react';
import { getSecurityLogs, logSecurityEvent } from '../../utils/securityLogger';

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

  mainCard: { backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', flex: 1 },
  cardTitle: { margin: '0 0 2px', fontSize: '1rem', fontWeight: '800', color: '#1e293b' },
  tableWrap: { overflowX: 'auto' },
  searchPill: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9999px', padding: '8px 16px', flex: 1 },
  searchInput: { border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '0.85rem', color: '#334155', width: '100%' },
  addBlueBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', backgroundColor: '#007bff', border: 'none', borderRadius: '9999px', color: 'white', fontWeight: '700', fontSize: '0.83rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,123,255,0.3)', whiteSpace: 'nowrap' },
};

export default function SecurityAuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const fetched = await getSecurityLogs();
    setLogs(fetched);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const total = logs.length;
  const high = logs.filter(l => l.severity === 'High').length;
  const warnings = logs.filter(l => l.severity === 'Warning').length;
  const adminActions = logs.filter(l => (l.user || '').toLowerCase().includes('admin')).length;

  const filteredLogs = logs.filter(l => {
    const matchesSeverity = filter === 'All' || l.severity === filter;
    const q = query.toLowerCase();
    const matchesQuery = !q
      || (l.user || '').toLowerCase().includes(q)
      || (l.type || '').toLowerCase().includes(q)
      || (l.desc || '').toLowerCase().includes(q);
    return matchesSeverity && matchesQuery;
  });

  const simulateTamper = () => {
    logSecurityEvent({
      user: 'Unknown / 192.168.99.1',
      type: 'Tamper Attempt',
      severity: 'High',
      desc: 'Blocked unauthorized access — possible SQL injection or privilege escalation attempt'
    });
    setTimeout(fetchLogs, 200);
  };

  return (
    <div style={sh.pageWrap}>
      <div style={sh.statsGrid}>
        {[
          ['Total Events', '#0f172a', total],
          ['High Severity', '#ef4444', high],
          ['Warnings', '#f59e0b', warnings],
          ['Admin Actions', '#007bff', adminActions]
        ].map(([label, color, val]) => (
          <div key={label} style={sh.statCard}>
            <div style={sh.statLabel}>{label}</div>
            <div style={{ ...sh.statNum, color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={sh.mainCard}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={sh.cardTitle}>Live Security Audit Log</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Real-time record of system events — auto-refreshes every 3 seconds</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ ...sh.searchPill, maxWidth: '220px' }}>
              <Search size={15} color="#64748b" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search logs..."
                style={sh.searchInput}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={simulateTamper}
              style={{ ...sh.addBlueBtn, backgroundColor: '#ef4444', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}
            >
              <AlertCircle size={15} />
              <span>Simulate Tamper</span>
            </motion.button>
          </div>
        </div>

        {/* Filter + Count Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['All', 'Normal', 'Warning', 'High'].map(f => (
              <motion.button
                key={f}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(f)}
                style={{ padding: '6px 16px', borderRadius: '9999px', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', backgroundColor: filter === f ? '#0f172a' : 'white', color: filter === f ? 'white' : '#334155' }}
              >
                {f}
              </motion.button>
            ))}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
            Showing {filteredLogs.length} of {total} events
          </span>
        </div>

        {/* Table */}
        <div style={sh.tableWrap}>
          <div style={{ backgroundColor: '#a3aeb9', borderRadius: '9999px', padding: '12px 20px', display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 2fr', alignItems: 'center', fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', marginBottom: '8px' }}>
            <div>Timestamp</div><div>Performed By</div><div>Event Type</div><div>Severity</div><div>Description</div>
          </div>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
              {loading ? 'Loading security events...' : 'No events match the current filter.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredLogs.map((log, i) => (
                <div key={log.id || i} style={{ backgroundColor: '#f1f5f9', borderRadius: '9999px', padding: '10px 24px', display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 2fr', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div style={{ color: '#475569' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{log.user || 'System'}</div>
                  <div style={{ color: '#334155' }}>{log.type || 'Event'}</div>
                  <div>
                    <span style={{
                      padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700',
                      backgroundColor: log.severity === 'High' ? '#fee2e2' : log.severity === 'Warning' ? '#fef3c7' : '#e2e8f0',
                      color: log.severity === 'High' ? '#ef4444' : log.severity === 'Warning' ? '#d97706' : '#475569'
                    }}>
                      {log.severity || 'Normal'}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.desc}>
                    {log.desc || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}