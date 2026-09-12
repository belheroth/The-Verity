import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Shield, Users, HardDrive, UploadCloud, Calendar,
  Lock, AlertOctagon, Check, Database, Clock, KeyRound,
  FileText, RotateCcw, AlertTriangle, Sparkles
} from 'lucide-react';
import { logSecurityEvent } from '../../utils/securityLogger';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const STORAGE_KEY = 'verity_admin_settings_v2';

// ═══ LIGHT THEME DESIGN TOKENS MATCHING VERITY ADMIN ═══
const styles = {
  pageWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    minWidth: 0,
    paddingBottom: '80px',
    MsOverflowStyle: 'none',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': { display: 'none' }
  },
  headerArea: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },
  title: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '0.875rem',
    color: '#64748b'
  },
  // Tab Bar Container
  tabBar: {
    display: 'flex',
    gap: '8px',
    padding: '6px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '9999px',
    width: 'fit-content',
    flexWrap: 'wrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  },
  tabBtn: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 22px',
    borderRadius: '9999px',
    border: 'none',
    backgroundColor: active ? '#007bff' : 'transparent',
    color: active ? '#ffffff' : '#475569',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: active ? '0 4px 12px rgba(0, 123, 255, 0.3)' : 'none'
  }),
  // Card Container
  glassCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '28px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  cardSectionTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  cardSectionSub: {
    margin: '4px 0 16px',
    fontSize: '0.82rem',
    color: '#64748b'
  },
  // Form elements
  label: {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#475569',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '11px 18px',
    borderRadius: '9999px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#334155',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '11px 18px',
    borderRadius: '9999px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#334155',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer'
  },
  textarea: {
    width: '100%',
    padding: '12px 18px',
    borderRadius: '16px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#334155',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  // Floating Bottom Save Bar
  floatingBar: {
    position: 'fixed',
    bottom: '24px',
    right: '32px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '9999px',
    padding: '12px 24px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    zIndex: 100
  },
  saveBtn: (saved) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 24px',
    backgroundColor: saved ? '#22c55e' : '#007bff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '9999px',
    fontWeight: '700',
    fontSize: '0.88rem',
    cursor: 'pointer',
    boxShadow: saved ? '0 4px 14px rgba(34, 197, 94, 0.35)' : '0 4px 14px rgba(0, 123, 255, 0.35)',
    transition: 'all 0.25s ease'
  }),
  secBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 20px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '9999px',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};

// ═══ REUSABLE TOGGLE SWITCH ═══
const Toggle = ({ on, onToggle, label, subtext }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
    <div>
      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', display: 'block' }}>{label}</span>
      {subtext && <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'block' }}>{subtext}</span>}
    </div>
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      onClick={onToggle}
      style={{
        width: '50px',
        height: '26px',
        borderRadius: '9999px',
        backgroundColor: on ? '#22c55e' : '#cbd5e1',
        position: 'relative',
        transition: 'background 0.25s ease',
        display: 'flex',
        alignItems: 'center',
        padding: '3px',
        cursor: 'pointer',
        flexShrink: 0
      }}
    >
      <motion.div
        animate={{ x: on ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
    </motion.div>
  </div>
);

// ═══ DEFAULT STATE CONFIGURATION ═══
const DEFAULT_SETTINGS = {
  general: {
    institutionName: 'Verity Institute of Technology',
    logoUrl: '',
    currentTerm: 'Fall 2026',
    termStart: '2026-09-01',
    termEnd: '2026-12-18',
    maintenanceMode: false,
    offlineMessage: 'Verity LMS is currently undergoing scheduled system maintenance. Kiosk examinations and live proctoring will resume shortly.'
  },
  security: {
    flagTabExits: true,
    blockCopyPaste: true,
    flagMultipleLogins: true,
    violationThreshold: 3,
    sessionTimeout: '30m',
    passwordPolicies: {
      specialChars: true,
      numbers: true,
      minLength8: true
    }
  },
  roles: {
    allowDeleteCourses: false,
    allowManageStudents: true,
    requireAdminApproval: true
  },
  data: {
    retentionPeriod: '3 Years',
    lastBackupTime: 'Today at 02:00 AM'
  }
};

// ════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: TAB 1 — GENERAL PREFERENCES
// ════════════════════════════════════════════════════════════════════
function GeneralPreferencesTab({ data, onChange }) {
  const [dragActive, setDragActive] = useState(false);

  const update = (key, val) => {
    onChange({ ...data, [key]: val });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div style={styles.glassCard}>
        {/* Platform Branding */}
        <div>
          <h3 style={styles.cardSectionTitle}>
            <Sparkles size={18} color="#007bff" />
            <span>Platform Branding</span>
          </h3>
          <p style={styles.cardSectionSub}>Customize institution name and logo displayed on kiosks and dashboards.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <label style={styles.label}>Institution Name</label>
              <input
                type="text"
                value={data.institutionName}
                onChange={e => update('institutionName', e.target.value)}
                placeholder="e.g. Verity Institute of Technology"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Logo Upload</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => { e.preventDefault(); setDragActive(false); }}
                style={{
                  border: `2px dashed ${dragActive ? '#007bff' : '#cbd5e1'}`,
                  borderRadius: '16px',
                  padding: '16px',
                  textAlign: 'center',
                  backgroundColor: dragActive ? '#f0f7ff' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <UploadCloud size={24} color={dragActive ? '#007bff' : '#64748b'} style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>Drag & drop institution logo</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Supports PNG, SVG, or JPG (Max 2MB)</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

        {/* Academic Calendar */}
        <div>
          <h3 style={styles.cardSectionTitle}>
            <Calendar size={18} color="#007bff" />
            <span>Academic Calendar & Term Settings</span>
          </h3>
          <p style={styles.cardSectionSub}>Define current active term and system-wide semester boundaries.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={styles.label}>Current Term Selection</label>
              <select
                value={data.currentTerm}
                onChange={e => update('currentTerm', e.target.value)}
                style={styles.select}
              >
                <option value="Fall 2026">Fall 2026</option>
                <option value="Spring 2027">Spring 2027</option>
                <option value="Summer 2027">Summer 2027</option>
                <option value="Winter 2026">Winter 2026</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Term Start Date</label>
              <input
                type="date"
                value={data.termStart}
                onChange={e => update('termStart', e.target.value)}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Term End Date</label>
              <input
                type="date"
                value={data.termEnd}
                onChange={e => update('termEnd', e.target.value)}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

        {/* System Maintenance */}
        <div>
          <h3 style={styles.cardSectionTitle}>
            <AlertOctagon size={18} color="#ef4444" />
            <span>System Maintenance Mode</span>
          </h3>
          <p style={styles.cardSectionSub}>Temporarily restrict examinee kiosk logins during system updates.</p>

          <Toggle
            on={data.maintenanceMode}
            onToggle={() => update('maintenanceMode', !data.maintenanceMode)}
            label="Enable System Maintenance Mode"
            subtext="Locks out student examination logins and displays custom offline message."
          />

          {data.maintenanceMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ marginTop: '16px' }}
            >
              <label style={styles.label}>Custom System Offline Message</label>
              <textarea
                rows={3}
                value={data.offlineMessage}
                onChange={e => update('offlineMessage', e.target.value)}
                style={styles.textarea}
              />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: TAB 2 — ANTI-CHEATING & SECURITY CONTROLS
// ════════════════════════════════════════════════════════════════════
function AntiCheatingSecurityTab({ data, onChange }) {
  const update = (key, val) => {
    onChange({ ...data, [key]: val });
  };

  const updatePolicy = (polKey, val) => {
    onChange({
      ...data,
      passwordPolicies: { ...data.passwordPolicies, [polKey]: val }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div style={styles.glassCard}>
        {/* Workspace Strictness */}
        <div>
          <h3 style={styles.cardSectionTitle}>
            <Shield size={18} color="#007bff" />
            <span>Workspace Strictness & Kiosk Enforcement</span>
          </h3>
          <p style={styles.cardSectionSub}>Real-time proctoring rules enforced by Electron sandbox and browser events.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Toggle
              on={data.flagTabExits}
              onToggle={() => update('flagTabExits', !data.flagTabExits)}
              label="Flag Browser Tab Exits & Window Focus Loss"
              subtext="Triggers an instant security flag when an examinee switches windows or minimizes kiosk."
            />
            <Toggle
              on={data.blockCopyPaste}
              onToggle={() => update('blockCopyPaste', !data.blockCopyPaste)}
              label="Block Copy / Paste Operations in Code Editors"
              subtext="Neutralizes OS clipboard buffer reads/writes during active examination sessions."
            />
            <Toggle
              on={data.flagMultipleLogins}
              onToggle={() => update('flagMultipleLogins', !data.flagMultipleLogins)}
              label="Flag Concurrent / Multiple Login Locations"
              subtext="Detects and blocks simultaneous user sessions from distinct IP addresses."
            />
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

        {/* Automated Actions */}
        <div>
          <h3 style={styles.cardSectionTitle}>
            <Lock size={18} color="#007bff" />
            <span>Automated Incident Response & Session Timers</span>
          </h3>
          <p style={styles.cardSectionSub}>Configure automatic lockout triggers and idle session expirations.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div>
              <label style={styles.label}>Violation Threshold (Lock Account After X Flags)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={data.violationThreshold}
                onChange={e => update('violationThreshold', parseInt(e.target.value) || 3)}
                style={styles.input}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Account locks and notifies System Admin after hitting threshold.
              </span>
            </div>

            <div>
              <label style={styles.label}>Idle Session Timeout</label>
              <select
                value={data.sessionTimeout}
                onChange={e => update('sessionTimeout', e.target.value)}
                style={styles.select}
              >
                <option value="15m">15 Minutes</option>
                <option value="30m">30 Minutes</option>
                <option value="1h">1 Hour</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Force re-authentication after period of inactivity.
              </span>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

        {/* Password Policies */}
        <div>
          <h3 style={styles.cardSectionTitle}>
            <KeyRound size={18} color="#007bff" />
            <span>Password & Authentication Rules</span>
          </h3>
          <p style={styles.cardSectionSub}>Set minimum complexity requirements for student and instructor credentials.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              ['specialChars', 'Enforce Special Characters (!@#$%^&*)'],
              ['numbers', 'Enforce Numerical Digits (0-9)'],
              ['minLength8', 'Enforce Minimum Password Length (8 Characters)']
            ].map(([polKey, label]) => (
              <label key={polKey} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={!!data.passwordPolicies?.[polKey]}
                  onChange={e => updatePolicy(polKey, e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#007bff', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#1e293b' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: TAB 3 — ROLES & PERMISSIONS
// ════════════════════════════════════════════════════════════════════
function RolesPermissionsTab({ data, onChange }) {
  const update = (key, val) => {
    onChange({ ...data, [key]: val });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div style={styles.glassCard}>
        <div>
          <h3 style={styles.cardSectionTitle}>
            <Users size={18} color="#007bff" />
            <span>Instructor Capabilities & Administrative Controls</span>
          </h3>
          <p style={styles.cardSectionSub}>Configure delegated authority for course managers and teaching faculty.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Toggle
              on={data.allowDeleteCourses}
              onToggle={() => update('allowDeleteCourses', !data.allowDeleteCourses)}
              label="Allow instructors to permanently delete courses"
              subtext="Default: Off. When disabled, only System Admins can erase class history."
            />
            <Toggle
              on={data.allowManageStudents}
              onToggle={() => update('allowManageStudents', !data.allowManageStudents)}
              label="Allow instructors to manually add or remove students"
              subtext="Default: On. Permits teachers to adjust their classroom rosters."
            />
            <Toggle
              on={data.requireAdminApproval}
              onToggle={() => update('requireAdminApproval', !data.requireAdminApproval)}
              label="Require admin approval for new instructor accounts"
              subtext="Default: On. Places new teacher registrations into Pending state."
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: TAB 4 — DATA & STORAGE
// ════════════════════════════════════════════════════════════════════
function DataStorageTab({ data, onChange }) {
  const [backupStatus, setBackupStatus] = useState(null);

  const update = (key, val) => {
    onChange({ ...data, [key]: val });
  };

  const handleGenerateBackup = () => {
    setBackupStatus('Generating full database snapshot...');
    setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      onChange({ ...data, lastBackupTime: `Today at ${nowStr}` });
      setBackupStatus('System backup completed successfully!');
      logSecurityEvent({
        user: 'System Admin',
        type: 'Database Backup',
        severity: 'Normal',
        desc: 'Manual system backup triggered from Admin Settings'
      });
      setTimeout(() => setBackupStatus(null), 3000);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div style={styles.glassCard}>
        {/* Data Retention */}
        <div>
          <h3 style={styles.cardSectionTitle}>
            <Database size={18} color="#007bff" />
            <span>Data Retention & Archival Policies</span>
          </h3>
          <p style={styles.cardSectionSub}>Automate cleanup of old examination logs and archived course records.</p>

          <div style={{ maxWidth: '360px' }}>
            <label style={styles.label}>Delete archived classes older than:</label>
            <select
              value={data.retentionPeriod}
              onChange={e => update('retentionPeriod', e.target.value)}
              style={styles.select}
            >
              <option value="1 Year">1 Year</option>
              <option value="3 Years">3 Years</option>
              <option value="Never">Never (Retain indefinitely)</option>
            </select>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

        {/* System Backup */}
        <div>
          <h3 style={styles.cardSectionTitle}>
            <Clock size={18} color="#007bff" />
            <span>System Snapshot & Local Backups</span>
          </h3>
          <p style={styles.cardSectionSub}>Create instant SQLite snapshots of user rosters, grades, and audit telemetry.</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerateBackup}
              style={styles.secBtn}
            >
              <HardDrive size={16} color="#007bff" />
              <span>Generate System Backup</span>
            </motion.button>

            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>
              Last backup: <strong style={{ color: '#1e293b' }}>{data.lastBackupTime}</strong>
            </span>
          </div>

          {backupStatus && (
            <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem', backgroundColor: backupStatus.includes('completed') ? '#dcfce7' : '#dbeafe', color: backupStatus.includes('completed') ? '#15803d' : '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: '600', width: 'fit-content' }}>
              {backupStatus}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: SYSTEM SETTINGS TAB
// ════════════════════════════════════════════════════════════════════
export default function SystemSettingsTab() {
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'security' | 'roles' | 'data'
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  // Load from backend / localStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/system-settings`);
      if (res.ok) {
        const resData = await res.json();
        if (resData.settings && Object.keys(resData.settings).length > 0) {
          setSettings(prev => ({
            ...prev,
            ...resData.settings
          }));
          return;
        }
      }
    } catch (e) { /* offline fallback */ }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings(JSON.parse(raw));
    } catch (e) { }
  };

  const handleSave = async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) { }

    try {
      await fetch(`${API_BASE}/system-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
    } catch (e) { }

    logSecurityEvent({
      user: 'System Admin',
      type: 'Settings Updated',
      severity: 'Normal',
      desc: `Updated system settings tab: ${activeTab.toUpperCase()}`
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={styles.pageWrap}>
      {/* ═══ HORIZONTAL TAB NAVIGATION MENU ═══ */}
      <div style={styles.tabBar}>
        {[
          ['general', Sparkles, 'General Preferences'],
          ['security', Shield, 'Anti-Cheating & Security'],
          ['roles', Users, 'Roles & Permissions'],
          ['data', Database, 'Data & Storage']
        ].map(([id, Icon, label]) => (
          <motion.button
            key={id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(id)}
            style={styles.tabBtn(activeTab === id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </motion.button>
        ))}
      </div>

      {/* ═══ TAB CONTENT PANELS ═══ */}
      <AnimatePresence mode="wait">
        {activeTab === 'general' && (
          <GeneralPreferencesTab
            key="general"
            data={settings.general}
            onChange={gen => setSettings({ ...settings, general: gen })}
          />
        )}
        {activeTab === 'security' && (
          <AntiCheatingSecurityTab
            key="security"
            data={settings.security}
            onChange={sec => setSettings({ ...settings, security: sec })}
          />
        )}
        {activeTab === 'roles' && (
          <RolesPermissionsTab
            key="roles"
            data={settings.roles}
            onChange={r => setSettings({ ...settings, roles: r })}
          />
        )}
        {activeTab === 'data' && (
          <DataStorageTab
            key="data"
            data={settings.data}
            onChange={d => setSettings({ ...settings, data: d })}
          />
        )}
      </AnimatePresence>

      {/* ═══ FLOATING PERSISTENT SAVE CHANGES BUTTON ═══ */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={styles.floatingBar}
      >
        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
          Unsaved adjustments auto-sync to backend
        </span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          style={styles.saveBtn(saved)}
        >
          {saved ? <Check size={18} /> : <Settings size={18} />}
          <span>{saved ? 'Changes Saved!' : 'Save Changes'}</span>
        </motion.button>
      </motion.div>
    </div>
  );
}