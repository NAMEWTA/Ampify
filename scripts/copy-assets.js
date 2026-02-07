const fs = require('fs');
const path = require('path');

const files = ['README.md', 'CHANGELOG.md', 'LICENSE', 'icon.png'];
const destDir = path.join(__dirname, '..', 'packages', 'extension');

for (const file of files) {
  const src = path.join(__dirname, '..', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(destDir, file));
  }
}

console.log('Assets copied to packages/extension/');
