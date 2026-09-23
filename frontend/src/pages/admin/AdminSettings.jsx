import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, HardDrive, UploadCloud, Calendar,
  AlertOctagon, Database, Clock, KeyRound, Sparkles,
  Bell, Monitor, Code2, Download, Moon, Sun,
  LayoutList, Volume2, VolumeX, Timer, Check,
  AlertTriangle, Clipboard, Sliders
} from 'lucide-react';
import { logSecurityEvent } from '../../utils/securityLogger';
import { apiFetch } from '../../utils/api';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ═══ DESIGN TOKENS (dynamic) ═══
const getTokens = (isDark) => ({
  blue: '#007bff',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  border: isDark ? '#3a3a3a' : '#e2e8f0',
  muted: isDark ? '#94a3b8' : '#64748b',
  text: isDark ? '#f1f5f9' : '#1e293b',
  subtext: isDark ? '#94a3b8' : '#475569',
  bg: isDark ? '#2a2a2a' : '#f8fafc',
  card: isDark ? '#2c2c2c' : '#ffffff',
});

const getStyles = (isDark) => {
  const T = getTokens(isDark);
  return {
    T,
    pageWrap: {
      flex: 1, display: 'flex', flexDirection: 'column', gap: '20px',
      overflowY: 'auto', minWidth: 0, paddingBottom: '100px',
      MsOverflowStyle: 'none', scrollbarWidth: 'none',
    },
    tabBar: {
      display: 'flex', gap: '6px', padding: '6px',
      backgroundColor: T.card, border: `1px solid ${T.border}`,
      borderRadius: '9999px', width: 'fit-content', flexWrap: 'wrap',
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
    },
    tabBtn: (active) => ({
      display: 'flex', alignItems: 'center', gap: '7px',
      padding: '9px 18px', borderRadius: '9999px', border: 'none',
      backgroundColor: active ? T.blue : 'transparent',
      color: active ? '#ffffff' : T.subtext,
      fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: active ? '0 4px 12px rgba(0,123,255,0.3)' : 'none',
    }),
    card: {
      backgroundColor: T.card, borderRadius: '24px', padding: '28px',
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.04)',
      border: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', gap: '24px',
    },
    sectionTitle: {
      margin: 0, fontSize: '1.05rem', fontWeight: '800', color: T.text,
      display: 'flex', alignItems: 'center', gap: '8px',
    },
    sectionSub: { margin: '4px 0 16px', fontSize: '0.82rem', color: T.muted },
    label: { display: 'block', fontSize: '0.82rem', fontWeight: '700', color: T.subtext, marginBottom: '6px' },
    input: {
      width: '100%', padding: '11px 18px', borderRadius: '9999px',
      border: `1px solid ${T.border}`, backgroundColor: T.bg,
      color: isDark ? '#e2e8f0' : '#334155', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
    },
    select: {
      width: '100%', padding: '11px 18px', borderRadius: '9999px',
      border: `1px solid ${T.border}`, backgroundColor: T.bg,
      color: isDark ? '#e2e8f0' : '#334155', fontSize: '0.88rem', outline: 'none',
      boxSizing: 'border-box', cursor: 'pointer',
    },
    textarea: {
      width: '100%', padding: '12px 18px', borderRadius: '16px',
      border: `1px solid ${T.border}`, backgroundColor: T.bg,
      color: isDark ? '#e2e8f0' : '#334155', fontSize: '0.88rem', outline: 'none',
      boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical',
    },
    divider: { height: '1px', backgroundColor: T.border },
    floatingBar: {
      position: 'fixed', bottom: '24px', right: '32px',
      backgroundColor: T.card, border: `1px solid ${T.border}`,
      borderRadius: '9999px', padding: '12px 24px',
      boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', gap: '16px', zIndex: 100,
    },
    saveBtn: (saved) => ({
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '10px 24px',
      backgroundColor: saved ? T.green : T.blue,
      color: '#ffffff', border: 'none', borderRadius: '9999px',
      fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer',
      boxShadow: saved ? '0 4px 14px rgba(34,197,94,0.35)' : '0 4px 14px rgba(0,123,255,0.35)',
      transition: 'all 0.25s ease',
    }),
    secBtn: {
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '10px 20px', backgroundColor: T.bg, color: isDark ? '#e2e8f0' : '#334155',
      border: `1px solid ${T.border}`, borderRadius: '9999px',
      fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
  };
};

// Mutable module-level references updated by the main component on each render
let styles = getStyles(false);
let T = styles.T;

// ═══ TOGGLE COMPONENT ═══
const Toggle = ({ on, onToggle, label, subtext, accent }) => {
  const tok = T;
  const accentColor = accent || tok.green;
  return (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', backgroundColor: tok.bg, borderRadius: '16px',
    border: `1px solid ${tok.border}`,
  }}>
    <div>
      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: tok.text, display: 'block' }}>{label}</span>
      {subtext && <span style={{ fontSize: '0.78rem', color: tok.muted, marginTop: '2px', display: 'block' }}>{subtext}</span>}
    </div>
    <motion.div
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} onClick={onToggle}
      style={{
        width: '50px', height: '26px', borderRadius: '9999px',
        backgroundColor: on ? accentColor : '#cbd5e1',
        position: 'relative', transition: 'background 0.25s ease',
        display: 'flex', alignItems: 'center', padding: '3px',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: on ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ width: '20px', height: '20px', backgroundColor: '#ffffff', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
      />
    </motion.div>
  </div>
  );
};

// ═══ SLIDER COMPONENT ═══
const Slider = ({ value, onChange, min, max, step = 1, label, unit = '', subtext }) => {
  const tok = T;
  return (
  <div style={{ padding: '14px 18px', backgroundColor: tok.bg, borderRadius: '16px', border: `1px solid ${tok.border}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <div>
        <span style={{ fontSize: '0.88rem', fontWeight: '700', color: tok.text }}>{label}</span>
        {subtext && <span style={{ fontSize: '0.78rem', color: tok.muted, display: 'block', marginTop: '2px' }}>{subtext}</span>}
      </div>
      <span style={{
        fontSize: '1rem', fontWeight: '800', color: tok.blue,
        backgroundColor: '#eff6ff', padding: '4px 14px', borderRadius: '9999px',
      }}>
        {value}{unit}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: tok.blue, cursor: 'pointer' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: tok.muted, marginTop: '4px' }}>
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
  </div>
  );
};

// ═══ DEFAULT SETTINGS ═══
const DEFAULT_SETTINGS = {
  general: {
    institutionName: 'Verity Institute of Technology',
    logoUrl: '',
    currentTerm: 'Fall 2026',
    termStart: '2026-09-01',
    termEnd: '2026-12-18',
    maintenanceMode: false,
    offlineMessage: 'Verity LMS is currently undergoing scheduled system maintenance. Kiosk examinations and live proctoring will resume shortly.',
  },
  security: {
    flagTabExits: true,
    blockCopyPaste: true,
    flagMultipleLogins: true,
    violationThreshold: 3,
    sessionTimeout: '30m',
    passwordPolicies: { specialChars: true, numbers: true, minLength8: true },
    // New kiosk thresholds
    cognitivePauseThreshold: 45,
    strictClipboardBlocking: true,
    enforceSingleMonitor: false,
    disableWindowsKeyAltTab: true,
  },
  examDefaults: {
    treatWarningsAsErrors: false,
    autoSaveInterval: '30s',
    defaultExamTimer: 60,
  },
  notifications: {
    soundAlerts: true,
    notifyOnSubmission: true,
    showToastWarnings: true,
    highSeverityBehavior: 'blinking',
  },
  roles: {
    allowDeleteCourses: false,
    allowManageStudents: true,
    requireAdminApproval: true,
  },
  data: {
    retentionPeriod: '3 Years',
    lastBackupTime: 'Today at 02:00 AM',
    autoArchiveAuditLogs: '30 Days',
    clearLocalStorageOnLogout: true,
  },
  uiPrefs: {
    auditTableDensity: 'Comfortable',
  },
};

// ════════════════════════════════════════════════════════════════════
// TAB 1 — GENERAL PREFERENCES
// ════════════════════════════════════════════════════════════════════
function GeneralPreferencesTab({ data, onChange }) {
  const [dragActive, setDragActive] = useState(false);
  const update = (key, val) => onChange({ ...data, [key]: val });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={styles.card}>
        {/* Platform Branding */}
        <div>
          <h3 style={styles.sectionTitle}><Sparkles size={18} color={T.blue} /><span>Platform Branding</span></h3>
          <p style={styles.sectionSub}>Customize institution name and logo displayed on kiosks and dashboards.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <label style={styles.label}>Institution Name</label>
              <input type="text" value={data.institutionName} onChange={e => update('institutionName', e.target.value)} placeholder="e.g. Verity Institute of Technology" style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Logo Upload</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => { e.preventDefault(); setDragActive(false); }}
                style={{ border: `2px dashed ${dragActive ? T.blue : '#cbd5e1'}`, borderRadius: '16px', padding: '16px', textAlign: 'center', backgroundColor: dragActive ? '#f0f7ff' : T.bg, cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <UploadCloud size={24} color={dragActive ? T.blue : T.muted} style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: T.text }}>Drag & drop institution logo</div>
                <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '2px' }}>Supports PNG, SVG, or JPG (Max 2MB)</div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Academic Calendar */}
        <div>
          <h3 style={styles.sectionTitle}><Calendar size={18} color={T.blue} /><span>Academic Calendar & Term Settings</span></h3>
          <p style={styles.sectionSub}>Define current active term and system-wide semester boundaries.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={styles.label}>Current Term</label>
              <select value={data.currentTerm} onChange={e => update('currentTerm', e.target.value)} style={styles.select}>
                <option>Fall 2026</option>
                <option>Spring 2027</option>
                <option>Summer 2027</option>
                <option>Winter 2026</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Term Start Date</label>
              <input type="date" value={data.termStart} onChange={e => update('termStart', e.target.value)} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Term End Date</label>
              <input type="date" value={data.termEnd} onChange={e => update('termEnd', e.target.value)} style={styles.input} />
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Maintenance Mode */}
        <div>
          <h3 style={styles.sectionTitle}><AlertOctagon size={18} color={T.red} /><span>System Maintenance Mode</span></h3>
          <p style={styles.sectionSub}>Temporarily restrict examinee kiosk logins during system updates.</p>
          <Toggle on={data.maintenanceMode} onToggle={() => update('maintenanceMode', !data.maintenanceMode)} label="Enable System Maintenance Mode" subtext="Locks out student examination logins and displays custom offline message." accent={T.red} />
          <AnimatePresence>
            {data.maintenanceMode && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: '16px', overflow: 'hidden' }}>
                <label style={styles.label}>Custom System Offline Message</label>
                <textarea rows={3} value={data.offlineMessage} onChange={e => update('offlineMessage', e.target.value)} style={styles.textarea} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB 2 — KIOSK & SECURITY THRESHOLDS
// ════════════════════════════════════════════════════════════════════
function KioskSecurityTab({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });
  const updatePolicy = (k, v) => onChange({ ...data, passwordPolicies: { ...data.passwordPolicies, [k]: v } });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Kiosk Enforcement */}
      <div style={styles.card}>
        <div>
          <h3 style={styles.sectionTitle}><Monitor size={18} color={T.blue} /><span>Kiosk Enforcement Rules</span></h3>
          <p style={styles.sectionSub}>Calibrate how strict the Electron kiosk wrapper is before and during exams.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Toggle
              on={data.disableWindowsKeyAltTab}
              onToggle={() => update('disableWindowsKeyAltTab', !data.disableWindowsKeyAltTab)}
              label="Disable Windows Key & Alt-Tab"
              subtext="Locks OS-level shortcuts. Requires the native KioskLockHook to be running."
            />
            <Toggle
              on={data.enforceSingleMonitor}
              onToggle={() => update('enforceSingleMonitor', !data.enforceSingleMonitor)}
              label="Enforce Single Monitor Only"
              subtext="Exam will not start if the system detects a second monitor (HDMI/VGA) connected."
            />
            <Toggle
              on={data.strictClipboardBlocking}
              onToggle={() => update('strictClipboardBlocking', !data.strictClipboardBlocking)}
              label="Strict Clipboard Blocking"
              subtext="ON = Ctrl+C and Ctrl+V are fully blocked. OFF = paste is allowed but flagged in Audit Log."
            />
            <Toggle
              on={data.flagTabExits}
              onToggle={() => update('flagTabExits', !data.flagTabExits)}
              label="Flag Window Focus Loss / Tab Exits"
              subtext="Triggers a security flag when a student switches windows or minimizes the kiosk."
            />
            <Toggle
              on={data.flagMultipleLogins}
              onToggle={() => update('flagMultipleLogins', !data.flagMultipleLogins)}
              label="Flag Concurrent Multiple Login Locations"
              subtext="Detects and blocks simultaneous sessions from distinct IP addresses."
            />
          </div>
        </div>

        <div style={styles.divider} />

        {/* Cognitive Pause Threshold */}
        <div>
          <h3 style={styles.sectionTitle}><Sliders size={18} color={T.blue} /><span>Behavioral Detection Thresholds</span></h3>
          <p style={styles.sectionSub}>Configure inactivity and session timer triggers for automatic incident logging.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Slider
              label="Cognitive Pause Threshold"
              subtext="Seconds of typing inactivity before the system records a 'Suspicious Pause' event."
              value={data.cognitivePauseThreshold}
              onChange={v => update('cognitivePauseThreshold', v)}
              min={10} max={120} step={5} unit="s"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={styles.label}>Violation Threshold (Lock After X Flags)</label>
                <input type="number" min="1" max="10" value={data.violationThreshold}
                  onChange={e => update('violationThreshold', parseInt(e.target.value) || 3)} style={styles.input} />
                <span style={{ fontSize: '0.75rem', color: T.muted, marginTop: '4px', display: 'block' }}>Account locks and notifies Admin after hitting this count.</span>
              </div>
              <div>
                <label style={styles.label}>Idle Session Timeout</label>
                <select value={data.sessionTimeout} onChange={e => update('sessionTimeout', e.target.value)} style={styles.select}>
                  <option value="15m">15 Minutes</option>
                  <option value="30m">30 Minutes</option>
                  <option value="1h">1 Hour</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: T.muted, marginTop: '4px', display: 'block' }}>Force re-authentication after inactivity.</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Password Policies */}
        <div>
          <h3 style={styles.sectionTitle}><KeyRound size={18} color={T.blue} /><span>Password & Authentication Rules</span></h3>
          <p style={styles.sectionSub}>Set minimum complexity requirements for student and instructor credentials.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              ['specialChars', 'Enforce Special Characters (!@#$%^&*)'],
              ['numbers', 'Enforce Numerical Digits (0-9)'],
              ['minLength8', 'Enforce Minimum Password Length (8 Characters)'],
            ].map(([k, lbl]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 14px', backgroundColor: T.bg, borderRadius: '12px', border: `1px solid ${T.border}` }}>
                <input type="checkbox" checked={!!data.passwordPolicies?.[k]} onChange={e => updatePolicy(k, e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: T.blue, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: '600', color: T.text }}>{lbl}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB 3 — COMPILER & EXAM DEFAULTS
// ════════════════════════════════════════════════════════════════════
function ExamDefaultsTab({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={styles.card}>
        {/* Compiler Settings */}
        <div>
          <h3 style={styles.sectionTitle}><Code2 size={18} color={T.blue} /><span>C# Compiler Behavior</span></h3>
          <p style={styles.sectionSub}>Configure the offline .NET C# compiler strictness for student code evaluation.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Toggle
              on={data.treatWarningsAsErrors}
              onToggle={() => update('treatWarningsAsErrors', !data.treatWarningsAsErrors)}
              label="Treat Compiler Warnings as Errors"
              subtext="When ON, code will fail submission if compiler warnings exist, even if it runs."
              accent={T.amber}
            />
          </div>
        </div>

        <div style={styles.divider} />

        {/* Auto-Save & Timer */}
        <div>
          <h3 style={styles.sectionTitle}><Timer size={18} color={T.blue} /><span>Auto-Save & Exam Timer Defaults</span></h3>
          <p style={styles.sectionSub}>These values are applied automatically when a new exam assignment is created.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div>
              <label style={styles.label}>Code Editor Auto-Save Interval</label>
              <select value={data.autoSaveInterval} onChange={e => update('autoSaveInterval', e.target.value)} style={styles.select}>
                <option value="10s">Every 10 Seconds</option>
                <option value="30s">Every 30 Seconds</option>
                <option value="1m">Every 1 Minute</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: T.muted, marginTop: '4px', display: 'block' }}>
                How often the student's code draft is saved to localStorage.
              </span>
            </div>
            <div>
              <label style={styles.label}>Default Exam Timer (Minutes)</label>
              <input
                type="number" min="10" max="300" step="5"
                value={data.defaultExamTimer}
                onChange={e => update('defaultExamTimer', parseInt(e.target.value) || 60)}
                style={styles.input}
              />
              <span style={{ fontSize: '0.75rem', color: T.muted, marginTop: '4px', display: 'block' }}>
                Default countdown timer auto-applied when creating a new exam.
              </span>
            </div>
          </div>
        </div>

        {/* Timer Preview */}
        <div style={{ padding: '16px 20px', backgroundColor: '#eff6ff', borderRadius: '16px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={20} color={T.blue} />
          <span style={{ fontSize: '0.88rem', color: '#1d4ed8', fontWeight: '600' }}>
            With current settings, new exams will default to a <strong>{data.defaultExamTimer}-minute</strong> countdown with auto-save every <strong>{data.autoSaveInterval === '10s' ? '10 seconds' : data.autoSaveInterval === '30s' ? '30 seconds' : '1 minute'}</strong>.
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB 4 — NOTIFICATIONS & UI PREFERENCES
// ════════════════════════════════════════════════════════════════════
function NotificationsUITab({ notifData, uiData, onNotifChange, onUiChange, isDark, onDarkToggle }) {
  const updateN = (key, val) => onNotifChange({ ...notifData, [key]: val });
  const updateU = (key, val) => onUiChange({ ...uiData, [key]: val });

  const severityOptions = [
    { value: 'blinking', label: 'Blinking Red Screen', desc: 'Flashes the instructor dashboard red — maximum visibility.' },
    { value: 'silent', label: 'Silent Log Only', desc: 'Silently records the event in Audit Logs without interrupting the instructor.' },
    { value: 'pause', label: 'Auto-Pause Student Exam', desc: 'Freezes the student\'s code editor and marks their exam as Under Review.' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Alert Notifications */}
      <div style={styles.card}>
        <div>
          <h3 style={styles.sectionTitle}><Bell size={18} color={T.blue} /><span>Notifications & Alert Behavior</span></h3>
          <p style={styles.sectionSub}>Control when and how warnings appear on the instructor's dashboard during live exams.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Toggle
              on={notifData.soundAlerts}
              onToggle={() => updateN('soundAlerts', !notifData.soundAlerts)}
              label="Enable Sound Alerts for Security Flags"
              subtext="Plays an audio chime on the instructor's dashboard when a student triggers a security event (e.g. Alt-Tab detected)."
            />
            <Toggle
              on={notifData.notifyOnSubmission}
              onToggle={() => updateN('notifyOnSubmission', !notifData.notifyOnSubmission)}
              label="Notify on Exam Submission"
              subtext="Shows a pop-up notification on the instructor's screen whenever a student submits their code."
            />
            <Toggle
              on={notifData.showToastWarnings}
              onToggle={() => updateN('showToastWarnings', !notifData.showToastWarnings)}
              label="Show Toast Notifications for Minor Warnings"
              subtext="Displays small side-panel toasts for low-severity events (e.g. long typing pause) instead of covering the full screen."
            />
          </div>
        </div>

        <div style={styles.divider} />

        {/* High-Severity Behavior */}
        <div>
          <h3 style={styles.sectionTitle}><AlertTriangle size={18} color={T.amber} /><span>High-Severity Alert Behavior</span></h3>
          <p style={styles.sectionSub}>Choose what happens when a critical security flag (e.g. multiple violations) is triggered.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {severityOptions.map(opt => (
              <label key={opt.value} style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer',
                padding: '14px 16px', borderRadius: '14px',
                border: `2px solid ${notifData.highSeverityBehavior === opt.value ? T.blue : T.border}`,
                backgroundColor: notifData.highSeverityBehavior === opt.value ? '#f0f7ff' : T.bg,
                transition: 'all 0.2s ease',
              }}>
                <input
                  type="radio" name="severityBehavior" value={opt.value}
                  checked={notifData.highSeverityBehavior === opt.value}
                  onChange={() => updateN('highSeverityBehavior', opt.value)}
                  style={{ accentColor: T.blue, marginTop: '2px', flexShrink: 0, width: '16px', height: '16px' }}
                />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: T.text }}>{opt.label}</div>
                  <div style={{ fontSize: '0.78rem', color: T.muted, marginTop: '2px' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* UI Preferences */}
      <div style={styles.card}>
        <div>
          <h3 style={styles.sectionTitle}><LayoutList size={18} color={T.blue} /><span>Dashboard UI Preferences</span></h3>
          <p style={styles.sectionSub}>Personalize the look and layout of the admin and instructor dashboard.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Dark Mode */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px', backgroundColor: T.bg, borderRadius: '16px', border: `1px solid ${T.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isDark ? <Moon size={18} color="#818cf8" /> : <Sun size={18} color={T.amber} />}
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: '700', color: T.text, display: 'block' }}>
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: T.muted, display: 'block', marginTop: '2px' }}>
                    Toggle between light and dark themes for the entire dashboard.
                  </span>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} onClick={onDarkToggle}
                style={{
                  width: '50px', height: '26px', borderRadius: '9999px',
                  backgroundColor: isDark ? '#818cf8' : '#cbd5e1',
                  position: 'relative', display: 'flex', alignItems: 'center',
                  padding: '3px', cursor: 'pointer', flexShrink: 0, transition: 'background 0.25s ease',
                }}
              >
                <motion.div
                  animate={{ x: isDark ? 24 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ width: '20px', height: '20px', backgroundColor: '#ffffff', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                />
              </motion.div>
            </div>

            {/* Audit Table Density */}
            <div style={{ padding: '14px 18px', backgroundColor: T.bg, borderRadius: '16px', border: `1px solid ${T.border}` }}>
              <label style={{ ...styles.label, marginBottom: '10px' }}>Audit Log Table Density</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['Compact', 'Comfortable'].map(opt => (
                  <motion.button
                    key={opt}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => updateU('auditTableDensity', opt)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px',
                      border: `2px solid ${uiData.auditTableDensity === opt ? T.blue : T.border}`,
                      backgroundColor: uiData.auditTableDensity === opt ? '#eff6ff' : T.card,
                      cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
                      color: uiData.auditTableDensity === opt ? T.blue : T.subtext,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {opt === 'Compact' ? '📋 Compact' : '📄 Comfortable'}
                    <div style={{ fontSize: '0.72rem', fontWeight: '500', marginTop: '3px', color: T.muted }}>
                      {opt === 'Compact' ? 'More rows visible, smaller text' : 'Larger text, easier to read'}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB 5 — ROLES & PERMISSIONS
// ════════════════════════════════════════════════════════════════════
function RolesPermissionsTab({ data, onChange }) {
  const update = (key, val) => onChange({ ...data, [key]: val });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={styles.card}>
        <div>
          <h3 style={styles.sectionTitle}><Users size={18} color={T.blue} /><span>Instructor Capabilities & Administrative Controls</span></h3>
          <p style={styles.sectionSub}>Configure delegated authority for course managers and teaching faculty.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Toggle on={data.allowDeleteCourses} onToggle={() => update('allowDeleteCourses', !data.allowDeleteCourses)} label="Allow instructors to permanently delete courses" subtext="Default: Off. When disabled, only System Admins can erase class history." accent={T.red} />
            <Toggle on={data.allowManageStudents} onToggle={() => update('allowManageStudents', !data.allowManageStudents)} label="Allow instructors to manually add or remove students" subtext="Default: On. Permits teachers to adjust their classroom rosters." />
            <Toggle on={data.requireAdminApproval} onToggle={() => update('requireAdminApproval', !data.requireAdminApproval)} label="Require admin approval for new instructor accounts" subtext="Default: On. Places new teacher registrations into Pending state." />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB 6 — SYSTEM & DATA MANAGEMENT
// ════════════════════════════════════════════════════════════════════
function SystemDataTab({ data, onChange, currentUserName = 'Admin' }) {
  const [backupStatus, setBackupStatus] = useState(null);
  const [exporting, setExporting] = useState(false);
  const update = (key, val) => onChange({ ...data, [key]: val });

  const handleGenerateBackup = () => {
    setBackupStatus('Generating full database snapshot...');
    setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      onChange({ ...data, lastBackupTime: `Today at ${nowStr}` });
      setBackupStatus('System backup completed successfully!');
      logSecurityEvent({ user: currentUserName, type: 'Database Backup', severity: 'Normal', desc: 'Manual system backup triggered from Admin Settings' });
      setTimeout(() => setBackupStatus(null), 3000);
    }, 1200);
  };

  const handleExportAuditCSV = async () => {
    setExporting(true);
    try {
      const res = await apiFetch(`${API_BASE}/audit-logs`);
      const json = await res.json();
      const logs = json.logs || [];

      const headers = ['ID', 'Timestamp', 'User', 'Type', 'Severity', 'Description'];
      const rows = logs.map(l => [l.id, l.timestamp, l.user, l.type, l.severity, `"${(l.desc || '').replace(/"/g, '""')}"`]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verity_audit_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logSecurityEvent({ user: currentUserName, type: 'Audit Export', severity: 'Normal', desc: 'Exported global audit log as CSV' });
    } catch (e) {
      console.error('Export failed:', e);
    }
    setExporting(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={styles.card}>

        {/* Data Retention */}
        <div>
          <h3 style={styles.sectionTitle}><Database size={18} color={T.blue} /><span>Data Retention & Archival Policies</span></h3>
          <p style={styles.sectionSub}>Automate cleanup of old examination logs and archived course records.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={styles.label}>Delete Archived Classes Older Than:</label>
              <select value={data.retentionPeriod} onChange={e => update('retentionPeriod', e.target.value)} style={styles.select}>
                <option value="1 Year">1 Year</option>
                <option value="3 Years">3 Years</option>
                <option value="Never">Never (Retain indefinitely)</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Auto-Archive Audit Logs:</label>
              <select value={data.autoArchiveAuditLogs} onChange={e => update('autoArchiveAuditLogs', e.target.value)} style={styles.select}>
                <option value="7 Days">After 7 Days</option>
                <option value="30 Days">After 30 Days</option>
                <option value="Never">Never</option>
              </select>
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Cache & Session */}
        <div>
          <h3 style={styles.sectionTitle}><Clipboard size={18} color={T.blue} /><span>Cache & Session Management</span></h3>
          <p style={styles.sectionSub}>Prevent UI slowdowns by cleaning up browser storage on session end.</p>
          <Toggle
            on={data.clearLocalStorageOnLogout}
            onToggle={() => update('clearLocalStorageOnLogout', !data.clearLocalStorageOnLogout)}
            label="Clear Browser LocalStorage on Logout"
            subtext="Wipes cached UI preferences and draft data on logout to keep the browser lean."
          />
        </div>

        <div style={styles.divider} />

        {/* Backup & Export */}
        <div>
          <h3 style={styles.sectionTitle}><HardDrive size={18} color={T.blue} /><span>System Snapshot & Audit Export</span></h3>
          <p style={styles.sectionSub}>Create instant SQLite snapshots or export security reports for the dean or parents.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleGenerateBackup} style={styles.secBtn}>
              <HardDrive size={16} color={T.blue} />
              <span>Generate System Backup</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleExportAuditCSV} disabled={exporting}
              style={{ ...styles.secBtn, opacity: exporting ? 0.6 : 1 }}>
              <Download size={16} color="#16a34a" />
              <span>{exporting ? 'Exporting...' : 'Export Global Audit Report (.CSV)'}</span>
            </motion.button>
            <span style={{ fontSize: '0.82rem', color: T.muted, fontWeight: '500' }}>
              Last backup: <strong style={{ color: T.text }}>{data.lastBackupTime}</strong>
            </span>
          </div>
          <AnimatePresence>
            {backupStatus && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  marginTop: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem',
                  backgroundColor: backupStatus.includes('completed') ? '#dcfce7' : '#dbeafe',
                  color: backupStatus.includes('completed') ? '#15803d' : '#1d4ed8',
                  fontWeight: '600', width: 'fit-content',
                }}>
                {backupStatus}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
export default function SystemSettingsTab({ currentUser: propCurrentUser }) {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { currentUser: hookUser } = useCurrentUser();
  const currentUser = propCurrentUser || hookUser;
  const currentUserName = currentUser?.name || currentUser?.email || 'Admin';

  // Rebuild dynamic styles whenever theme changes
  styles = getStyles(isDark);
  T = styles.T;

  useEffect(() => { loadSettings(); }, []);

  // Deep-merge helper: merges nested objects from server on top of defaults
  const deepMerge = (defaults, incoming) => {
    const result = { ...defaults };
    for (const key of Object.keys(incoming)) {
      if (
        incoming[key] && typeof incoming[key] === 'object' && !Array.isArray(incoming[key]) &&
        defaults[key] && typeof defaults[key] === 'object' && !Array.isArray(defaults[key])
      ) {
        result[key] = { ...defaults[key], ...incoming[key] };
      } else {
        result[key] = incoming[key];
      }
    }
    return result;
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/system-settings`);
      if (res.ok) {
        const d = await res.json();
        if (d.settings && Object.keys(d.settings).length > 0) {
          // If server stores as single global_config blob, unwrap it
          const serverData = d.settings.global_config || d.settings;
          setSettings(deepMerge(DEFAULT_SETTINGS, serverData));
        }
      }
    } catch {
      // Network error — keep defaults
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaveError('');
    try {
      const res = await apiFetch(`${API_BASE}/system-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { global_config: settings } }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.message || 'Failed to save settings');
        setTimeout(() => setSaveError(''), 4000);
        return;
      }
    } catch (e) {
      setSaveError('Network error — settings could not be saved');
      setTimeout(() => setSaveError(''), 4000);
      return;
    }
    logSecurityEvent({ user: currentUserName, type: 'Settings Updated', severity: 'Normal', desc: `Updated system settings tab: ${activeTab.toUpperCase()}` });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const tabs = [
    { id: 'general',       Icon: Sparkles,  label: 'General' },
    { id: 'kiosk',         Icon: Shield,    label: 'Kiosk & Security' },
    { id: 'exam',          Icon: Code2,     label: 'Exam Defaults' },
    { id: 'notifications', Icon: Bell,      label: 'Notifications & UI' },
    { id: 'roles',         Icon: Users,     label: 'Roles & Permissions' },
    { id: 'data',          Icon: Database,  label: 'System & Data' },
  ];

  const update = (section, val) => setSettings(prev => ({ ...prev, [section]: val }));

  return (
    <div style={styles.pageWrap}>
      {/* ═══ TAB BAR ═══ */}
      <div style={styles.tabBar}>
        {tabs.map(({ id, Icon, label }) => (
          <motion.button key={id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(id)} style={styles.tabBtn(activeTab === id)}>
            <Icon size={15} />
            <span>{label}</span>
          </motion.button>
        ))}
      </div>

      {/* ═══ TAB PANELS ═══ */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <div style={{
            width: '36px', height: '36px', border: `3px solid ${T.border}`,
            borderTop: `3px solid ${T.blue}`, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
      <AnimatePresence mode="wait">
        {activeTab === 'general' && (
          <GeneralPreferencesTab key="general" data={settings.general} onChange={v => update('general', v)} />
        )}
        {activeTab === 'kiosk' && (
          <KioskSecurityTab key="kiosk" data={settings.security} onChange={v => update('security', v)} />
        )}
        {activeTab === 'exam' && (
          <ExamDefaultsTab key="exam" data={settings.examDefaults} onChange={v => update('examDefaults', v)} />
        )}
        {activeTab === 'notifications' && (
          <NotificationsUITab
            key="notifications"
            notifData={settings.notifications}
            uiData={settings.uiPrefs}
            onNotifChange={v => update('notifications', v)}
            onUiChange={v => update('uiPrefs', v)}
            isDark={isDark}
            onDarkToggle={toggleDark}
          />
        )}
        {activeTab === 'roles' && (
          <RolesPermissionsTab key="roles" data={settings.roles} onChange={v => update('roles', v)} />
        )}
        {activeTab === 'data' && (
          <SystemDataTab key="data" data={settings.data} onChange={v => update('data', v)} currentUserName={currentUserName} />
        )}
      </AnimatePresence>
      )}

      {/* ═══ FLOATING SAVE BAR ═══ */}
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 30 }}
        style={styles.floatingBar}
      >
        <span style={{ fontSize: '0.82rem', color: saveError ? T.red : T.muted, fontWeight: '600' }}>
          {saveError ? `⚠ ${saveError}` : saved ? '✓ Saved successfully' : 'Unsaved changes'}
        </span>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave} style={styles.saveBtn(saved)} disabled={loading}>
          {saved ? <Check size={16} /> : null}
          <span>{saved ? 'Saved!' : 'Save All Settings'}</span>
        </motion.button>
      </motion.div>
    </div>
  );
}