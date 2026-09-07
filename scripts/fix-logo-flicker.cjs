const fs = require('fs');

const files = [
  'src/pages/StudentDashboard.jsx',
  'src/pages/TeacherDashboard.jsx',
  'src/pages/TeacherClasswork.jsx',
  'src/pages/TeacherGrading.jsx',
  'src/pages/ClassroomView.jsx',
  'src/pages/AdminDashboard.jsx',
  'src/pages/AdminDatabase.jsx',
  'src/pages/StudentCalendar.jsx',
  'src/pages/TeacherCalendar.jsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(
      /style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'row',\s*alignItems:\s*'center',\s*gap:\s*'15px',\s*whiteSpace:\s*'nowrap'\s*\}\}/g,
      "style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', whiteSpace: 'nowrap', minWidth: 'max-content' }}"
    );
    fs.writeFileSync(f, c);
  }
});
