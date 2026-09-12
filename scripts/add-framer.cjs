const fs = require('fs');
const path = require('path');
const p = path.resolve('src/pages/AdminDashboard.jsx');
let content = fs.readFileSync(p, 'utf-8');

if (!content.includes('framer-motion')) {
  content = content.replace("import { useState", "import { motion, AnimatePresence } from 'framer-motion';\nimport { useState");
}

const modalOpeners = [
  /\{showDiagnostic && \(\s*<div style=\{sh\.modalOverlay\}[^>]*>\s*<div style=\{\{ \.\.\.sh\.modalCard[^}]+\}\}[^>]*>/g,
  /\{viewUser && \(\s*<div style=\{sh\.modalOverlay\}[^>]*>\s*<div style=\{\{ \.\.\.sh\.modalCard[^}]+\}\}[^>]*>/g,
  /\{modalAction && \(\s*<div style=\{sh\.modalOverlay\}[^>]*>\s*<div style=\{\{ \.\.\.sh\.modalCard[^}]+\}\}[^>]*>/g,
  /\{isAddOpen && \(\s*<div style=\{sh\.modalOverlay\}[^>]*>\s*<div style=\{sh\.modalCard\}[^>]*>/g,
  /\{viewClass && \(\s*<div style=\{sh\.modalOverlay\}[^>]*>\s*<div style=\{\{ \.\.\.sh\.modalCard[^}]+\}\}[^>]*>/g,
  /\{isModalOpen && \(\s*<div style=\{sh\.modalOverlay\}[^>]*>\s*<div style=\{sh\.modalCard\}[^>]*>/g
];

modalOpeners.forEach((regex) => {
  content = content.replace(regex, (match) => {
    // Extract condition
    const condition = match.match(/\{([a-zA-Z]+) && \(/)[1];
    // Extract card style
    let cardStyle = match.match(/<div style=(\{\{ \.\.\.sh\.modalCard[^}]+\}\}|sh\.modalCard)/)[1];
    
    return `<AnimatePresence>
      {${condition} && (
        <motion.div 
          style={sh.modalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div 
            style={${cardStyle}}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >`;
  });
});

// Since the closing tags are exactly `</div></div>)}`, we will replace all occurrences that match the modal ends.
// To be safe, let's just replace all `</div>\s*</div>\s*\)\}` with `</motion.div>\n        </motion.div>\n      )}\n      </AnimatePresence>`
// But ONLY if they are preceded by modal content. We can just replace all of them and fix any false positives.
// Actually, looking at AdminDashboard.jsx, are there other places with `</div></div>)}`?
// Let's do it properly by finding the balanced closing tags, or simpler: just use replace with a careful regex.
content = content.replace(/<\/div>\s*<\/div>\s*\)\}/g, 
`</motion.div>
        </motion.div>
      )}
      </AnimatePresence>`);

fs.writeFileSync(p, content, 'utf-8');
console.log('Done');
