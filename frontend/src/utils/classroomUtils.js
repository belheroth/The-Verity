/**
 * Checks if a classroom object is a phantom/dummy classroom.
 */
export const isPhantomClassroom = (c) => {
  if (!c || !c.name) return true;
  const name = String(c.name).trim();
  const hasDummyName = /^Classroom \d+$/i.test(name);
  const hasNoDetails = (!c.section || !String(c.section).trim()) && (!c.subject || !String(c.subject).trim());
  return hasDummyName && hasNoDetails;
};

/**
 * Merges freshly fetched server classrooms into the existing classroom list while
 * STRICTLY preserving the user's current display order.
 */
export const mergeClassroomsPreservingOrder = (currentList, serverList) => {
  if (!Array.isArray(serverList) || serverList.length === 0) {
    return Array.isArray(currentList) ? currentList.filter(c => !isPhantomClassroom(c)) : [];
  }
  const validServerList = serverList.filter(c => !isPhantomClassroom(c));
  if (!Array.isArray(currentList) || currentList.length === 0) {
    return validServerList;
  }

  const serverMap = new Map();
  validServerList.forEach(c => serverMap.set(String(c.id), c));

  const updated = currentList
    .filter(c => !isPhantomClassroom(c) && serverMap.has(String(c.id)))
    .map(c => ({
      ...c,
      ...serverMap.get(String(c.id))
    }));

  const existingIds = new Set(updated.map(c => String(c.id)));
  const newClasses = validServerList.filter(c => !existingIds.has(String(c.id)));

  return [...updated, ...newClasses];
};

/**
 * Generates a clean, 7-character lowercase alphanumeric class code (e.g. "g4xj7q2")
 * guaranteed to not collide with any code in the provided list/set of classrooms or codes.
 */
export const generateClassCode = (existingListOrCodes = []) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const taken = new Set();

  if (Array.isArray(existingListOrCodes)) {
    existingListOrCodes.forEach(item => {
      if (!item) return;
      if (typeof item === 'string') taken.add(item.trim().toLowerCase());
      else if (item.code) taken.add(String(item.code).trim().toLowerCase());
    });
  } else if (existingListOrCodes instanceof Set) {
    existingListOrCodes.forEach(item => {
      if (item) taken.add(String(item).trim().toLowerCase());
    });
  }

  let code = '';
  let attempts = 0;
  do {
    code = '';
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
  } while (taken.has(code.toLowerCase()) && attempts < 1000);

  return code;
};

/**
 * Banner Themes Configuration (Shared across Teacher, Student & Cards)
 */
export const THEME_PRESETS = [
  {
    id: 'emerald_books',
    name: 'Emerald Books',
    primary: '#137333',
    secondary: '#1e8e3e',
    textColor: '#ffffff',
    description: 'Classic green with notebooks and stationery'
  },
  {
    id: 'ocean_academia',
    name: 'Ocean Academia',
    primary: '#1a73e8',
    secondary: '#0d47a1',
    textColor: '#ffffff',
    description: 'Scholarly blue with geometry and math graphics'
  },
  {
    id: 'royal_violet',
    name: 'Royal Violet',
    primary: '#7c3aed',
    secondary: '#581c87',
    textColor: '#ffffff',
    description: 'Vibrant purple for creative arts and design'
  },
  {
    id: 'warm_amber',
    name: 'Warm Amber',
    primary: '#ea580c',
    secondary: '#9a3412',
    textColor: '#ffffff',
    description: 'Warm harvest tone with literature aesthetics'
  },
  {
    id: 'midnight_slate',
    name: 'Midnight Tech',
    primary: '#0f172a',
    secondary: '#1e293b',
    textColor: '#ffffff',
    description: 'Sleek dark theme for programming and CS'
  }
];

import { apiFetch } from './api';

/**
 * Returns all potential storage keys for a classroom object to guarantee matching
 * between teacher and student views regardless of whether classroom is identified
 * by id, code, section, or name.
 */
export const getThemeStorageKeys = (classroom) => {
  const keys = [];
  if (!classroom) return [];

  if (classroom.id !== undefined && classroom.id !== null) {
    keys.push(`verity_classroom_theme_${classroom.id}`);
  }
  if (classroom.code) {
    keys.push(`verity_classroom_theme_code_${String(classroom.code).trim().toLowerCase()}`);
  }
  if (classroom.section) {
    keys.push(`verity_classroom_theme_code_${String(classroom.section).trim().toLowerCase()}`);
  }
  if (classroom.name) {
    keys.push(`verity_classroom_theme_name_${String(classroom.name).trim().toLowerCase()}`);
  }
  return keys;
};

/**
 * Resolves the active theme for a classroom object.
 */
export const getClassroomTheme = (classroom) => {
  if (classroom?.theme) {
    if (typeof classroom.theme === 'object') return classroom.theme;
    if (typeof classroom.theme === 'string') {
      try {
        const parsed = JSON.parse(classroom.theme);
        if (parsed && (parsed.primary || parsed.customImageUrl || parsed.id)) {
          return parsed;
        }
      } catch {}
    }
  }
  const keys = getThemeStorageKeys(classroom);
  for (const key of keys) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.primary || parsed.customImageUrl || parsed.id)) {
          return parsed;
        }
      }
    } catch {}
  }
  // Default preset based on classroom ID hash
  const idx = Math.abs(Number(classroom?.id) || 0) % THEME_PRESETS.length;
  return THEME_PRESETS[idx] || THEME_PRESETS[0];
};

/**
 * Saves classroom theme across all canonical keys, updates local caches,
 * dispatches local events, emits socket event, and updates server DB via REST API.
 */
export const saveClassroomTheme = (classroom, theme, socket = null) => {
  if (!theme) return;
  const themeJson = JSON.stringify(theme);
  const keys = getThemeStorageKeys(classroom);

  keys.forEach(key => {
    try {
      localStorage.setItem(key, themeJson);
    } catch {}
  });

  // Sync to stored classroom objects in localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('verity_teacher_classrooms') || k.startsWith('verity_student_classrooms') || k === 'verity_classrooms' || k === 'verity_global_classrooms')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              let updatedAny = false;
              const updatedArr = arr.map(c => {
                if (
                  (classroom?.id != null && String(c.id) === String(classroom.id)) ||
                  (classroom?.code && c.code && String(c.code).toLowerCase() === String(classroom.code).toLowerCase()) ||
                  (classroom?.section && c.section && String(c.section).toLowerCase() === String(classroom.section).toLowerCase()) ||
                  (classroom?.name && c.name && String(c.name).toLowerCase() === String(classroom.name).toLowerCase())
                ) {
                  updatedAny = true;
                  return { ...c, theme };
                }
                return c;
              });
              if (updatedAny) {
                localStorage.setItem(k, JSON.stringify(updatedArr));
              }
            }
          }
        } catch {}
      }
    }
  }

  const detailPayload = {
    classroomId: classroom?.id,
    code: classroom?.code || classroom?.section,
    name: classroom?.name,
    theme,
    keys
  };

  // Dispatch custom window event
  window.dispatchEvent(new CustomEvent('verity:banner-updated', { detail: detailPayload }));

  // Emit socket event for real-time server/client propagation
  if (socket) {
    socket.emit('classroom_theme_updated', detailPayload);
  }

  // Persist to backend database via REST API
  if (classroom?.id) {
    apiFetch(`/classrooms/${classroom.id}/theme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    }).catch(err => {
      console.warn('[ClassroomTheme] Failed to save theme via API:', err?.message || err);
    });
  }
};
