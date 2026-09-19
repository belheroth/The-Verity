const fs = require('fs');
let file = 'c:/Users/vicfa/The-Verity/src/pages/ClassroomView.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import ProfileMenu from './ProfileMenu';\r\nimport ProfileMenu from './ProfileMenu';",
  "import ProfileMenu from './ProfileMenu';"
);

content = content.replace(
  "import ProfileMenu from './ProfileMenu';\nimport ProfileMenu from './ProfileMenu';",
  "import ProfileMenu from './ProfileMenu';"
);

content = content.replace(
  `import ProfileMenu from "./ProfileMenu";\r\nimport ProfileMenu from "./ProfileMenu";`,
  `import ProfileMenu from "./ProfileMenu";`
);

content = content.replace(
  `import ProfileMenu from "./ProfileMenu";\nimport ProfileMenu from "./ProfileMenu";`,
  `import ProfileMenu from "./ProfileMenu";`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Removed duplicate ProfileMenu import in ClassroomView.jsx');
