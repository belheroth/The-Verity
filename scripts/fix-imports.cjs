const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassroomView.jsx', 'utf8');

const target = "import { Home, Calendar, ClipboardList, Settings, User, MoreVertical, Play, ArrowLeft, Menu, Archive } from 'lucide-react';";
const replacement = `import { Home, Calendar, ClipboardList, Settings, User, MoreVertical, Play, ArrowLeft, Menu, Archive } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

// Fallback shown only if the teacher hasn't created any classwork for this class yet.
const DEFAULT_ASSIGNMENTS = [
  { id: 1, title: "Activity 1: Hello World & Variables", details: "Write a C# program that declares a string variable for your name, an integer for your age, and prints them to the console.", dueDate: "Oct 15" },
  { id: 2, title: "Activity 2: Loops and Conditions", details: "Create a for-loop that counts from 1 to 50. Use an if-statement to only print the even numbers to the console.", dueDate: "Oct 20" }
];`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/ClassroomView.jsx', content);
