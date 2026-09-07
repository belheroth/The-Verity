const fs = require('fs');
let content = fs.readFileSync('c:/Users/vicfa/The-Verity/src/pages/StudentDashboard.jsx', 'utf8');

const correctHeader = `import React, { useState, useEffect, useRef } from 'react';
// IMPORTING PROFESSIONAL SVGS
import { Home, Calendar, ClipboardList, Settings, MoreVertical, Plus, LogOut, User, X, Menu, Archive } from 'lucide-react';
import SettingsPanel from './SettingsPanel';
import ProfileMenu from './ProfileMenu';
import StudentCalendar from './StudentCalendar';
import ClassroomSettings from './ClassroomSettings';

const STORAGE_KEY = 'verity_student_classrooms';

const DEFAULT_CLASSROOMS`;

const index = content.indexOf('const DEFAULT_CLASSROOMS');
if (index !== -1) {
  content = correctHeader + content.substring(index + 'const DEFAULT_CLASSROOMS'.length);
  fs.writeFileSync('c:/Users/vicfa/The-Verity/src/pages/StudentDashboard.jsx', content, 'utf8');
  console.log('Fixed imports in StudentDashboard.jsx');
}
