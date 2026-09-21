import React, { useState, useRef, useEffect } from 'react';
import {
  User, BookOpen, ShieldCheck, SlidersHorizontal, Bell,
  GraduationCap, Moon, Sun, Camera, Upload, Trash2, CheckCircle2, Sparkles
} from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { useCurrentUser } from '../hooks/useCurrentUser';
import Skeleton from '../components/Skeleton';

const PRESET_AVATARS = [
  {
    id: 'emerald',
    name: 'Emerald Scholar',
    bg: '#10b981',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%23047857"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g1)"/><circle cx="50" cy="40" r="18" fill="%23ffffff" opacity="0.95"/><path d="M22 82 C22 64 34 58 50 58 C66 58 78 64 78 82 Z" fill="%23ffffff" opacity="0.95"/><polygon points="50,16 68,26 50,36 32,26" fill="%23fef08a"/><path d="M68 26 L68 38" stroke="%23fef08a" stroke-width="2"/></svg>`
  },
  {
    id: 'coder',
    name: 'Neon Coder',
    bg: '#06b6d4',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%2306b6d4"/><stop offset="100%" stop-color="%230284c7"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g2)"/><rect x="22" y="24" width="56" height="42" rx="8" fill="%230f172a"/><path d="M34 38 L28 44 L34 50 M44 52 L48 36 M58 38 L64 44 L58 50" stroke="%2338bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="38" y="66" width="24" height="6" rx="2" fill="%23cbd5e1"/><rect x="32" y="72" width="36" height="4" rx="2" fill="%2394a3b8"/></svg>`
  },
  {
    id: 'orbit',
    name: 'Cosmic Orbit',
    bg: '#6366f1',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%236366f1"/><stop offset="100%" stop-color="%234338ca"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g3)"/><ellipse cx="50" cy="50" rx="36" ry="12" fill="none" stroke="%23a5b4fc" stroke-width="3" transform="rotate(-25 50 50)"/><circle cx="50" cy="50" r="18" fill="%23fbbf24"/><circle cx="76" cy="40" r="6" fill="%2338bdf8"/><circle cx="28" cy="62" r="4" fill="%23f43f5e"/></svg>`
  },
  {
    id: 'fox',
    name: 'Amber Fox',
    bg: '#f59e0b',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23f59e0b"/><stop offset="100%" stop-color="%23d97706"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g4)"/><polygon points="26,24 40,46 22,46" fill="%23b45309"/><polygon points="74,24 78,46 60,46" fill="%23b45309"/><polygon points="50,30 24,54 50,84 76,54" fill="%23fed7aa"/><polygon points="50,42 34,58 50,78 66,58" fill="%23ffffff"/><circle cx="40" cy="54" r="3.5" fill="%231e293b"/><circle cx="60" cy="54" r="3.5" fill="%231e293b"/><polygon points="50,68 45,63 55,63" fill="%231e293b"/></svg>`
  },
  {
    id: 'gem',
    name: 'Amethyst Crystal',
    bg: '#a855f7',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23a855f7"/><stop offset="100%" stop-color="%237e22ce"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g5)"/><polygon points="50,20 74,38 64,74 36,74 26,38" fill="%23f3e8ff"/><polygon points="50,20 64,38 36,38" fill="%23e9d5ff"/><polygon points="36,38 26,38 36,74" fill="%23d8b4fe"/><polygon points="64,38 74,38 64,74" fill="%23c084fc"/><polygon points="36,38 50,78 64,38" fill="%23a855f7"/></svg>`
  },
  {
    id: 'innovator',
    name: 'Rose Innovator',
    bg: '#f43f5e',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g6" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23f43f5e"/><stop offset="100%" stop-color="%23be123c"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g6)"/><circle cx="50" cy="42" r="16" fill="%23fff1f2"/><path d="M50 28 L50 22 M36 34 L30 30 M64 34 L70 30" stroke="%23fecdd3" stroke-width="2.5" stroke-linecap="round"/><path d="M26 80 C26 64 36 58 50 58 C64 58 74 64 74 80 Z" fill="%23ffffff" opacity="0.95"/><path d="M46 44 L50 48 L58 40" stroke="%2310b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
  }
];

const APPEARANCE_SECTION = {
  icon: Moon,
  title: 'Appearance & Display',
  blurb: 'Customize the visual theme and interface appearance across your Verity workspace.',
  fields: [
    { label: 'Dark Mode', type: 'dark_toggle' },
  ],
};

const SECTIONS = {
  Student: [
    APPEARANCE_SECTION,
    {
      icon: User,
      title: 'Profile Management',
      blurb: 'Update your profile photo, personal information, and contact details.',
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
    APPEARANCE_SECTION,
    {
      icon: User,
      title: 'Profile Management',
      blurb: 'Update your profile photo, instructor credentials, and contact details.',
      fields: [
        { label: 'Full Name', placeholder: 'Prof. Maria Santos' },
        { label: 'Email Address', placeholder: 'instructor@verity.edu' },
        { label: 'Department / Specialization', placeholder: 'Computer Science & Engineering' },
        { label: 'Office Hours', placeholder: 'Mon/Wed 2:00 PM - 4:00 PM' },
        { label: 'New Password', placeholder: '••••••••', type: 'password' },
      ],
    },
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
    APPEARANCE_SECTION,
    {
      icon: User,
      title: 'Profile Management',
      blurb: 'Update your administrative profile photo and security credentials.',
      fields: [
        { label: 'Full Name', placeholder: 'System Administrator' },
        { label: 'Email Address', placeholder: 'admin@verity.edu' },
        { label: 'Emergency Contact', placeholder: '+63 900 000 0000' },
        { label: 'New Password', placeholder: '••••••••', type: 'password' },
      ],
    },
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

/**
 * Distinctive, interactive Profile Picture Changer component
 */
function ProfilePictureChanger({ isDark }) {
  const { currentUser, updateCurrentUser } = useCurrentUser();
  const fileInputRef = useRef(null);
  const [feedback, setFeedback] = useState(null);
  const [imgError, setImgError] = useState(false);

  const currentAvatar = currentUser?.avatar || currentUser?.profilePicture;
  const name = currentUser?.name || 'User';

  useEffect(() => {
    setImgError(false);
  }, [currentAvatar]);

  const getInitials = (str) => {
    if (!str || str === 'User') return 'V';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const showFeedback = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showFeedback('Please select a valid image file (PNG, JPG, WebP).', true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showFeedback('Image exceeds 5MB. Please choose a smaller photo.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Downscale to 256x256 square with center-crop to guarantee high quality + zero quota issues
          const canvas = document.createElement('canvas');
          const maxDim = 256;
          canvas.width = maxDim;
          canvas.height = maxDim;
          const ctx = canvas.getContext('2d');

          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxDim, maxDim);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          updateCurrentUser({ avatar: dataUrl, profilePicture: dataUrl });
          showFeedback('Profile picture updated successfully!');
        } catch (_) {
          const rawUrl = uploadEvent.target.result;
          updateCurrentUser({ avatar: rawUrl, profilePicture: rawUrl });
          showFeedback('Profile picture updated successfully!');
        }
      };
      img.onerror = () => {
        showFeedback('Failed to read image file.', true);
      };
      img.src = uploadEvent.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectPreset = (preset) => {
    updateCurrentUser({ avatar: preset.svg, profilePicture: preset.svg });
    showFeedback(`Avatar updated to "${preset.name}"!`);
  };

  const handleRemovePhoto = () => {
    updateCurrentUser({ avatar: null, profilePicture: null });
    showFeedback('Photo removed. Restored to default initial badge.');
  };

  const initials = getInitials(name);

  return (
    <div style={{
      gridColumn: '1 / -1',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px',
      borderRadius: '16px',
      backgroundColor: isDark ? '#3A3A3A' : '#f9fafb',
      border: isDark ? '1px solid #4D4D4D' : '1px solid #e2e8f0',
      transition: 'background-color 0.25s ease, border-color 0.25s ease'
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
        {/* Avatar Interactive Circle */}
        <div
          onClick={() => fileInputRef.current?.click()}
          title="Click to change profile picture"
          style={{
            position: 'relative',
            width: '92px',
            height: '92px',
            borderRadius: '50%',
            cursor: 'pointer',
            flexShrink: 0,
            border: isDark ? '2.5px solid #10b981' : '2.5px solid #10b981',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.22)',
            backgroundColor: currentAvatar && !imgError ? 'transparent' : (isDark ? '#3C3C3C' : '#e2e8f0'),
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease'
          }}
          className="btn-anim"
        >
          {currentAvatar && !imgError ? (
            <img
              src={currentAvatar}
              alt={name}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
                display: 'block'
              }}
            />
          ) : initials ? (
            <span style={{
              fontSize: '2rem',
              fontWeight: '900',
              color: isDark ? '#E8EAED' : '#1e293b',
              letterSpacing: '0.02em',
              userSelect: 'none'
            }}>
              {initials}
            </span>
          ) : (
            <User size={42} color={isDark ? '#9AA0A6' : '#64748b'} />
          )}

          {/* Camera hover badge indicator */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '28px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Camera size={14} />
          </div>
        </div>

        {/* Text Details & Primary Actions */}
        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <div style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: isDark ? '#E8EAED' : '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              Profile Picture
              {currentAvatar && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: '#10b981',
                  backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  Active
                </span>
              )}
            </div>
            <div style={{
              fontSize: '0.82rem',
              color: isDark ? '#9AA0A6' : '#64748b',
              marginTop: '2px',
              lineHeight: 1.4
            }}>
              Upload a personalized photo (JPG, PNG, WebP) or select an avatar badge below.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 18px',
                borderRadius: '50px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                transition: 'opacity 0.15s ease'
              }}
              title="Upload photo from computer"
            >
              <Upload size={14} /> Upload Photo
            </button>

            {currentAvatar && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '50px',
                  backgroundColor: isDark ? '#464646' : '#e5e7eb',
                  color: isDark ? '#E8EAED' : '#475569',
                  border: isDark ? '1px solid #5A5A5A' : 'none',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                title="Remove current avatar and reset to initials"
              >
                <Trash2 size={14} color="#ef4444" /> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Avatar Badges Tray */}
      <div style={{
        borderTop: isDark ? '1px solid #4A4A4A' : '1px solid #e5e7eb',
        paddingTop: '18px',
        marginTop: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{
          fontSize: '0.88rem',
          fontWeight: '700',
          color: isDark ? '#E8EAED' : '#374151',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Sparkles size={13} color="#10b981" /> Or Choose An Avatar Badge
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {PRESET_AVATARS.map((preset) => {
            const isSelected = currentAvatar === preset.svg;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                title={preset.name}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  padding: 0,
                  border: isSelected ? '2.5px solid #10b981' : (isDark ? '1.5px solid #525252' : '1.5px solid #d1d5db'),
                  boxShadow: isSelected ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  overflow: 'hidden',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <img
                  src={preset.svg}
                  alt={preset.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '0.85rem',
          fontWeight: '600',
          backgroundColor: feedback.isError ? (isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2') : (isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5'),
          color: feedback.isError ? '#ef4444' : '#10b981',
          border: feedback.isError ? '1px solid #f87171' : '1px solid #34d399'
        }}>
          {!feedback.isError && <CheckCircle2 size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}
    </div>
  );
}

export default function SettingsPanel({ role = 'Student', onBack, loading = false }) {
  const sections = SECTIONS[role] || SECTIONS.Student;
  const STORAGE_KEY = `verity:settings:${role}`;
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { currentUser, updateCurrentUser } = useCurrentUser();

  const [values, setValues] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      const user = currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (user?.name && !parsed['Profile Management:Full Name']) {
        parsed['Profile Management:Full Name'] = user.name;
      }
      if (user?.email && !parsed['Profile Management:Email Address']) {
        parsed['Profile Management:Email Address'] = user.email;
      }
      return parsed;
    } catch {
      return {};
    }
  });

  const [savedSection, setSavedSection] = useState(null);

  const handleSave = (sectionTitle) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      if (sectionTitle === 'Profile Management') {
        const nameVal = values[`${sectionTitle}:Full Name`];
        const emailVal = values[`${sectionTitle}:Email Address`];
        const updates = {};
        if (nameVal && nameVal.trim()) updates.name = nameVal.trim();
        if (emailVal && emailVal.trim()) updates.email = emailVal.trim();
        if (Object.keys(updates).length > 0) {
          updateCurrentUser(updates);
        }
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
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
          <h1 style={{ ...styles.title, ...(isDark ? { color: '#E8EAED' } : {}) }}>Settings</h1>
        </div>
      </div>

      {/* Settings sections */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Skeleton.Settings />
          <Skeleton.Settings />
        </div>
      ) : (
        sections.map((section) => {
          const SectionIcon = section.icon;
          const isAppearance = section.title === 'Appearance & Display';
          const isProfile = section.title === 'Profile Management';

        return (
          <div
            key={section.title}
            style={{
              ...styles.sectionCard,
              ...(isDark ? {
                backgroundColor: '#323232',
                boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                border: '1px solid #4A4A4A'
              } : {})
            }}
          >
            <div style={styles.sectionHead}>
              <div
                style={{
                  ...styles.sectionIconCircle,
                  ...(isDark ? {
                    backgroundColor: '#3C3C3C',
                    boxShadow: 'none',
                    border: '1px solid #4E4E4E'
                  } : {})
                }}
              >
                <SectionIcon size={22} color={isDark ? '#10b981' : '#4b5563'} />
              </div>
              <div>
                <h3 style={{ ...styles.sectionTitle, ...(isDark ? { color: '#E8EAED' } : {}) }}>{section.title}</h3>
                <p style={{ ...styles.sectionBlurb, ...(isDark ? { color: '#9AA0A6' } : {}) }}>{section.blurb}</p>
              </div>
            </div>

            <div style={styles.fields}>
              {/* Profile Picture Changer right at the top of Profile Management */}
              {isProfile && (
                <ProfilePictureChanger isDark={isDark} />
              )}

              {section.fields.map((f) => {
                const key = `${section.title}:${f.label}`;

                if (f.type === 'dark_toggle') {
                  return (
                    <div
                      key={f.label}
                      style={{
                        ...styles.toggleRow,
                        gridColumn: '1 / -1',
                        ...(isDark ? {
                          backgroundColor: '#3A3A3A',
                          borderColor: '#4D4D4D'
                        } : {})
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {isDark ? <Moon size={22} color="#10b981" /> : <Sun size={22} color="#f59e0b" />}
                        <div>
                          <span style={{ ...styles.toggleLabel, display: 'block', ...(isDark ? { color: '#E8EAED' } : {}) }}>
                            {isDark ? 'Dark Mode (Enabled)' : 'Dark Mode (Disabled)'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: isDark ? '#9AA0A6' : '#64748b', display: 'block', marginTop: '2px' }}>
                            {isDark ? 'Workspace and dashboard use a sleek dark theme' : 'Workspace and dashboard use a clean light theme'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isDark}
                        onClick={toggleDarkMode}
                        style={{
                          ...styles.switch,
                          backgroundColor: isDark ? '#10b981' : '#cbd5e1',
                          transition: 'background-color 0.25s ease'
                        }}
                        title="Toggle Dark Mode"
                      >
                        <span
                          style={{
                            ...styles.knob,
                            left: isDark ? '23px' : '3px',
                            transition: 'left 0.25s ease'
                          }}
                        />
                      </button>
                    </div>
                  );
                }

                if (f.type === 'toggle') {
                  const on = key in values ? values[key] : !!f.default;
                  return (
                    <div
                      key={f.label}
                      style={{
                        ...styles.toggleRow,
                        ...(isDark ? {
                          backgroundColor: '#3A3A3A',
                          borderColor: '#4D4D4D'
                        } : {})
                      }}
                    >
                      <span style={{ ...styles.toggleLabel, ...(isDark ? { color: '#E8EAED' } : {}) }}>{f.label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => setValues({ ...values, [key]: !on })}
                        style={{
                          ...styles.switch,
                          backgroundColor: on ? '#10b981' : (isDark ? '#525252' : '#cbd5e1'),
                          transition: 'background-color 0.2s'
                        }}
                        title={on ? 'On' : 'Off'}
                      >
                        <span style={{ ...styles.knob, ...(on ? styles.knobOn : {}) }} />
                      </button>
                    </div>
                  );
                }

                return (
                  <label
                    key={f.label}
                    style={{
                      ...styles.fieldLabel,
                      ...(isDark ? { color: '#E8EAED' } : {})
                    }}
                  >
                    {f.label}
                    <input
                      type={f.type === 'password' ? 'password' : f.type === 'file' ? 'file' : 'text'}
                      placeholder={f.placeholder}
                      value={f.type === 'file' ? undefined : (values[key] || '')}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      style={{
                        ...styles.input,
                        ...(isDark ? {
                          backgroundColor: '#3A3A3A',
                          borderColor: '#4D4D4D',
                          color: '#E8EAED'
                        } : {})
                      }}
                    />
                  </label>
                );
              })}
            </div>

            <div style={styles.actions}>
              {isAppearance ? (
                <span style={{ fontSize: '0.85rem', color: isDark ? '#9AA0A6' : '#64748b', fontStyle: 'italic' }}>
                  ✓ Theme preference is automatically applied and saved
                </span>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        );
      })
      )}
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
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
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
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
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
