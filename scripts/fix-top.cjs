const fs = require('fs');
let file = 'c:/Users/vicfa/The-Verity/src/pages/ClassroomView.jsx';
let content = fs.readFileSync(file, 'utf8');

const correctTop = `import React, { useState, useEffect } from 'react';
// IMPORTING PROFESSIONAL SVGS
import { Home, Calendar, ClipboardList, Settings, User, MoreVertical, Play, ArrowLeft, Menu, Archive } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

// Fallback shown only if the teacher hasn't created any classwork for this class yet.
const DEFAULT_ASSIGNMENTS = [
  { id: 1, title: "Activity 1: Hello World & Variables", details: "Write a C# program that declares a string variable for your name, an integer for your age, and prints them to the console.", dueDate: "Oct 15" },
  { id: 2, title: "Activity 2: Loops and Conditions", details: "Create a for-loop that counts from 1 to 50. Use an if-statement to only print the even numbers to the console.", dueDate: "Oct 20" }
];`;

content = content.replace(
  `import React, { useState, useEffect } from 'react';
// IMPORTING PROFESSIONAL SVGS
import { Home, Calendar, ClipboardList, Settings, User, MoreVertical, Play, ArrowLeft, Menu, Archive } from 'lucide-react';
];`,
  correctTop
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed top of ClassroomView.jsx');
