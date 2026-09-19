const fs = require('fs');

const files = [
  'c:/Users/vicfa/The-Verity/src/pages/TeacherDashboard.jsx',
  'c:/Users/vicfa/The-Verity/src/pages/StudentDashboard.jsx',
  'c:/Users/vicfa/The-Verity/src/pages/ClassroomView.jsx',
  'c:/Users/vicfa/The-Verity/src/pages/TeacherClasswork.jsx',
  'c:/Users/vicfa/The-Verity/src/pages/TeacherGrading.jsx'
];

const oldTransition = "transition: 'top 0.35s cubic-bezier(0.34,1.56,0.64,1), height 0.25s ease, opacity 0.2s ease',";
const newTransition = "transition: 'top 0.6s cubic-bezier(0.5, 2.5, 0.2, 1), height 0.3s ease, opacity 0.2s ease',";

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split(oldTransition).join(newTransition);
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Updated transitions!');
