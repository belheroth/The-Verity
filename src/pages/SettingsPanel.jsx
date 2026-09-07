import React, { useState } from 'react';
import { User, BookOpen, ShieldCheck, SlidersHorizontal, Bell, GraduationCap } from 'lucide-react';

const SECTIONS = {
  Student: [
    {
      icon: User,
      title: 'Profile Management',
      blurb: 'Update personal information, change your password, and manage contact or parent / guardian details.',
      fields: [
        { label: 'Full Name', placeholder: 'Juan Dela Cruz' },
        { label: 'Email Address', placeholder: 'student@verity.edu' },
        { label: 'Contact Number', placeholder: '+63 900 000 0000' },
        { label: 'Parent / Guardian Name', placeholder: 'Maria Dela Cruz' },
        { label: 'Parent / Guardian Contact', placeholder: '+63 900 000 0000' },
        { label: 'New Password', placeholder: '••••••••', type: 'password' },
      ],
    },
    {
      icon: Bell,
      title: 'Notifications',
      blurb: 'Manage preferences for receiving alerts regarding upcoming deadlines, grades, or instructor announcements.',
      fields: [
        { label: 'Upcoming Deadline Alerts', type: 'toggle', default: true },
        { label: 'Grade Notifications', type: 'toggle', default: true },
        { label: 'Instructor Announcements', type: 'toggle', default: false },
        { label: 'Reminder Lead Time', placeholder: 'e.g. 24 hours before' },
      ],
    },
  ],
  Instructor: [
    {
      icon: BookOpen,
      title: 'Course & Content Management',
      blurb: 'Define course structures, upload reusable content templates, and configure grading scales or rubrics.',
      fields: [
        { label: 'Default Course Structure', placeholder: 'e.g. Lectures → Labs → Exams' },
        { label: 'Reusable Content Template', placeholder: 'Upload a template (.docx, .pdf)', type: 'file' },
        { label: 'Grading Scale', placeholder: 'e.g. 1.00 – 5.00 / A – F' },
        { label: 'Rubric Name', placeholder: 'e.g. Programming Project Rubric' },
      ],
    },
    {
      icon: GraduationCap,
      title: 'Classroom Management',
      blurb: 'Manage enrollment requests, set assignment deadlines, and configure visibility / release schedules for materials.',
      fields: [
        { label: 'Enrollment Requests', placeholder: 'e.g. Require approval' },
        { label: 'Default Assignment Deadline', placeholder: 'e.g. 7 days after release' },
        { label: 'Material Visibility', placeholder: 'e.g. Visible / Hidden' },
        { label: 'Release Schedule', placeholder: 'e.g. Release on Mondays 8:00 AM' },
      ],
    },
  ],
  Administrator: [
    {
      icon: ShieldCheck,
      title: 'User & Role Management',
      blurb: 'Provision new accounts, define role-based access control (RBAC) permissions, and handle bulk user imports.',
      fields: [
        { label: 'New Account Email', placeholder: 'newuser@verity.edu' },
        { label: 'Assign Role', placeholder: 'Student / Instructor / Administrator' },
        { label: 'RBAC Permission Set', placeholder: 'e.g. read:classrooms, write:grades' },
        { label: 'Bulk User Import', placeholder: 'Upload a .csv of users', type: 'file' },
      ],
    },
    {
      icon: SlidersHorizontal,
      title: 'System Configuration',
      blurb: 'Customize branding (logos, colors) and define academic calendars (terms, holidays).',
      fields: [
        { label: 'Institution Logo', placeholder: 'Upload a logo (.png, .svg)', type: 'file' },
        { label: 'Primary Brand Color', placeholder: '#10b981' },
        { label: 'Academic Term', placeholder: 'e.g. 1st Semester 2026–2027' },
        { label: 'Holidays / Non-working Days', placeholder: 'e.g. Dec 25, Jan 1' },
      ],
    },
  ],
};

export default function SettingsPanel({ role = 'Student', onBack }) {
  const sections = SECTIONS[role] || SECTIONS.Student;
  const STORAGE_KEY = `verity:settings:${role}`;
  const [values, setValues] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [savedSection, setSavedSection] = useState(null);

  const handleSave = (sectionTitle) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
    }
    setSavedSection(sectionTitle);
    setTimeout(() => {
      setSavedSection((current) => (current === sectionTitle ? null : current));
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', padding: '0 clamp(15px, 5vw, 50px)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <h1 style={styles.title}>Settings</h1>
        </div>
      </div>

      {/* Settings sections */}
      {sections.map((section) => {
        const SectionIcon = section.icon;
        return (
          <div key={section.title} style={styles.sectionCard}>
            <div style={styles.sectionHead}>
              <div style={styles.sectionIconCircle}>
                <SectionIcon size={22} color="#4b5563" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>{section.title}</h3>
                <p style={styles.sectionBlurb}>{section.blurb}</p>
              </div>
            </div>

            <div style={styles.fields}>
              {section.fields.map((f) => {
                const key = `${section.title}:${f.label}`;

                if (f.type === 'toggle') {
                  const on = key in values ? values[key] : !!f.default;
                  return (
                    <div key={f.label} style={styles.toggleRow}>
                      <span style={styles.toggleLabel}>{f.label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => setValues({ ...values, [key]: !on })}
                        style={{ ...styles.switch, ...(on ? styles.switchOn : {}) }}
                        title={on ? 'On' : 'Off'}
                      >
                        <span style={{ ...styles.knob, ...(on ? styles.knobOn : {}) }} />
                      </button>
                    </div>
                  );
                }

                return (
                  <label key={f.label} style={styles.fieldLabel}>
                    {f.label}
                    <input
                      type={f.type === 'password' ? 'password' : f.type === 'file' ? 'file' : 'text'}
                      placeholder={f.placeholder}
                      value={f.type === 'file' ? undefined : (values[key] || '')}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      style={styles.input}
                    />
                  </label>
                );
              })}
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                style={styles.saveBtn}
                onClick={() => handleSave(section.title)}
                title="Save Changes"
              >
                Save Changes
              </button>
              {savedSection === section.title && (
                <span style={styles.savedNote}>✓ Saved</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { display: 'flex', alignItems: 'center', gap: '14px' },
  title: { margin: 0, color: '#4b5563', fontSize: '2rem' },

  sectionCard: {
    backgroundColor: 'white', borderRadius: '24px', padding: '36px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)', maxWidth: '720px',
    display: 'flex', flexDirection: 'column', gap: '24px',
  },
  sectionHead: { display: 'flex', alignItems: 'flex-start', gap: '15px' },
  sectionIconCircle: {
    width: '48px', height: '48px', flexShrink: 0, borderRadius: '50%',
    backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.7), inset -2px -2px 5px rgba(0,0,0,0.1)',
  },
  sectionTitle: { margin: '0 0 4px 0', color: '#1f2937', fontSize: '1.3rem' },
  sectionBlurb: { margin: 0, color: '#6b7280', fontSize: '0.88rem', lineHeight: 1.5 },

  fields: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' },
  fieldLabel: {
    display: 'flex', flexDirection: 'column', gap: '6px',
    color: '#4b5563', fontSize: '0.85rem', fontWeight: 'bold',
  },
  input: {
    width: '100%', padding: '13px 15px', borderRadius: '12px',
    border: '1px solid #d1d5db', backgroundColor: '#f9fafb',
    color: '#4b5563', fontSize: '0.95rem', fontWeight: 'normal', boxSizing: 'border-box',
  },

  // Toggle switch (on/off preference)
  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
    padding: '13px 16px', borderRadius: '12px',
    border: '1px solid #d1d5db', backgroundColor: '#f9fafb',
  },
  toggleLabel: { color: '#4b5563', fontSize: '0.85rem', fontWeight: 'bold' },
  switch: {
    position: 'relative', width: '46px', height: '26px', flexShrink: 0,
    borderRadius: '50px', border: 'none', cursor: 'pointer', padding: 0,
    backgroundColor: '#cbd5e1', transition: 'background-color 0.2s',
    boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.15)',
  },
  switchOn: { backgroundColor: '#10b981' },
  knob: {
    position: 'absolute', top: '3px', left: '3px', width: '20px', height: '20px',
    borderRadius: '50%', backgroundColor: 'white',
    boxShadow: '1px 1px 3px rgba(0,0,0,0.25)', transition: 'left 0.2s',
  },
  knobOn: { left: '23px' },

  actions: { display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' },
  saveBtn: {
    padding: '12px 36px', backgroundColor: '#10b981', border: 'none',
    borderRadius: '50px', color: 'white', fontWeight: 'bold', fontSize: '1rem',
    cursor: 'pointer',
  },
  savedNote: { color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' },
};
