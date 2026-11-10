const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'data', 'mockMenuData.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// Remove top-level iosModelUrl that is directly on MenuItem (outside arAsset)
content = content.replace(/\r?\n\s+iosModelUrl: '\/models\/[^']+',(?=\r?\n\s+arAsset:)/g, '');

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Cleaned top-level iosModelUrl from mockMenuData.ts');

