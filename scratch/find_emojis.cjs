const fs = require('fs');
const path = require('path');

// Regex to detect emojis
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F3FB}-\u{1F3FF}\u{200D}\u{2300}-\u{23FF}\u{2900}-\u{29FF}\u{2B00}-\u{2DFF}]/u;

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        checkDir(fullPath);
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (emojiRegex.test(line)) {
          const match = line.match(emojiRegex);
          console.log(`[EMOJI] File: ${fullPath} | Line ${index + 1}: "${line.trim()}" | Found: ${match[0]}`);
        }
      });
    }
  }
}

console.log("Searching for emojis in crm_conversacional/src...");
checkDir('src');
