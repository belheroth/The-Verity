const fs = require('fs');
let file = 'c:/Users/vicfa/The-Verity/src/pages/TeacherGrading.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `      <div className="content-padding" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom, #f3f4f6 0%, #cbd5e1 100%)' }}>`,
  `      <div style={styles.mainContent}>`
);

content = content.replace(
  "container: { height: '100%', display: 'flex', background: 'linear-gradient(to bottom, #f3f4f6 0%, #cbd5e1 100%)', fontFamily: 'sans-serif', position: 'relative' },",
  "container: { height: '100%', width: '100%', display: 'flex', background: 'linear-gradient(to bottom, #f3f4f6 0%, #cbd5e1 100%)', fontFamily: 'sans-serif', position: 'relative' },"
);

// also fix mainContent zIndex
content = content.replace(
  "mainContent: { flex: 1, padding: 'clamp(20px, 4vw, 30px) clamp(15px, 5vw, 50px)', display: 'flex', flexDirection: 'column' },",
  "mainContent: { flex: 1, padding: 'clamp(20px, 4vw, 30px) clamp(15px, 5vw, 50px)', display: 'flex', flexDirection: 'column', zIndex: 1 },"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed TeacherGrading.jsx');
