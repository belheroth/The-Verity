const fs = require('fs');
let file = 'c:/Users/vicfa/The-Verity/src/pages/ClassroomView.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { Home, Calendar, ClipboardList, Settings, User, MoreVertical, Play, ArrowLeft, Menu, Archive } from 'lucide-react';",
  "import { Home, Calendar, ClipboardList, Settings, User, MoreVertical, Play, ArrowLeft, Menu, Archive } from 'lucide-react';\nimport ProfileMenu from './ProfileMenu';"
);

content = content.replace(
  "export default function ClassroomView({ classroom, onBack, onOpenAssignment, socket, onEnterClassroom }) {",
  "export default function ClassroomView({ classroom, onBack, onOpenAssignment, socket, onEnterClassroom, onLogout }) {"
);

content = content.replace(
  `<div style={styles.topBar}>\n          <div style={styles.profileCircle}>\n            <User size={24} color="#6b7280" />\n          </div>\n        </div>`,
  `<div style={styles.topBar}>\n          <ProfileMenu onLogout={onLogout} />\n        </div>`
);

content = content.replace(
  "container: { height: '100%', display: 'flex', background: 'linear-gradient(to bottom, #f3f4f6 0%, #cbd5e1 100%)', fontFamily: 'sans-serif' },",
  "container: { height: '100%', width: '100%', display: 'flex', background: 'linear-gradient(to bottom, #f3f4f6 0%, #cbd5e1 100%)', fontFamily: 'sans-serif', position: 'relative' },"
);

content = content.replace(
  "logoContainer: { fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' },",
  "logoContainer: { display: 'flex', alignItems: 'baseline', fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' },"
);

content = content.replace(
  "mainContent: { flex: 1, padding: 'clamp(20px, 4vw, 30px) clamp(15px, 5vw, 50px)', display: 'flex', flexDirection: 'column' },",
  "mainContent: { flex: 1, padding: 'clamp(20px, 4vw, 30px) clamp(15px, 5vw, 50px)', display: 'flex', flexDirection: 'column', zIndex: 1 },"
);

content = content.replace(
  "topBar: { display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' },",
  "topBar: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginBottom: '20px' },"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed ClassroomView.jsx');
