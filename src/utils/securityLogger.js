const STORAGE_KEY = 'verity_audit_logs';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Log a security event — writes to localStorage immediately and syncs to backend.
 * @param {{ user?: string, type?: string, severity?: string, desc?: string }} event
 */
export const logSecurityEvent = ({ user = 'System', type = 'System Event', severity = 'Normal', desc = '' }) => {
  const newLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    user,
    type,
    severity,
    desc
  };

  // Persist locally immediately (no await)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newLog, ...existing].slice(0, 300)));
  } catch (e) { /* storage unavailable */ }

  // Fire-and-forget sync to backend
  fetch(`${API_BASE}/audit-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: newLog.user, type: newLog.type, severity: newLog.severity, desc: newLog.desc })
  }).catch(() => { /* offline OK — local copy still holds */ });

  return newLog;
};

/**
 * Retrieve logs — merges localStorage cache with server records.
 */
export const getSecurityLogs = async () => {
  let localLogs = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localLogs = JSON.parse(raw);
  } catch (e) { /* ignore */ }

  try {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (res.ok) {
      const data = await res.json();
      const serverLogs = Array.isArray(data.logs) ? data.logs : [];
      if (serverLogs.length > 0) {
        // De-duplicate: prefer local copy (fresher) then fill in server items
        const seen = new Set(localLogs.map(l => `${l.timestamp}|${l.desc}`));
        const merged = [
          ...localLogs,
          ...serverLogs.filter(l => !seen.has(`${l.timestamp}|${l.desc}`))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 300);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) { }
        return merged;
      }
    }
  } catch (e) { /* offline — return local */ }

  return localLogs;
};
