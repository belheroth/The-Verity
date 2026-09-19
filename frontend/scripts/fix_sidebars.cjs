const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/ClassroomView.jsx',
  'src/pages/StudentDashboard.jsx',
  'src/pages/TeacherDashboard.jsx',
  'src/pages/TeacherClasswork.jsx',
  'src/pages/TeacherGrading.jsx'
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix logo wrapper
  content = content.replace(
    /width:\s*'max-content'\s*}}/g,
    `width: 'max-content', transform: collapsed ? 'translateX(13px)' : 'none', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}`
  );

  // Fix nav items padding
  content = content.replace(
    /\.\.\.styles\.navItem,([^}]*)justifyContent:\s*collapsed\s*\?\s*'center'\s*:\s*'flex-start'/g,
    `...styles.navItem,$1padding: collapsed ? '12px 0' : '12px 20px', justifyContent: collapsed ? 'center' : 'flex-start'`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
