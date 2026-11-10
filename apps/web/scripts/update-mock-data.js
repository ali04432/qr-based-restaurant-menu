const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'data', 'mockMenuData.ts');
let content = fs.readFileSync(targetPath, 'utf8');

content = content.replace(
  /(\s+id: 'mock-ar-1',[\s\S]*?modelUrl: '\/models\/wagyu_beef_steak\.glb',)(\r?\n\s*)(mimeType:)/,
  `$1$2iosModelUrl: '/models/wagyu_beef_steak.usdz',$2$3`
);

content = content.replace(
  /(\s+id: 'mock-ar-7',[\s\S]*?modelUrl: '\/models\/pan_seared_salmon\.glb',)(\r?\n\s*)(mimeType:)/,
  `$1$2iosModelUrl: '/models/pan_seared_salmon.usdz',$2$3`
);

content = content.replace(
  /(\s+id: 'mock-ar-13',[\s\S]*?modelUrl: '\/models\/braised_lamb_shank\.glb',)(\r?\n\s*)(mimeType:)/,
  `$1$2iosModelUrl: '/models/braised_lamb_shank.usdz',$2$3`
);

content = content.replace(
  /(\s+id: 'mock-ar-4',[\s\S]*?modelUrl: '\/models\/silver_sapoon_burger\.glb',)(\r?\n\s*)(mimeType:)/,
  `$1$2iosModelUrl: '/models/silver_sapoon_burger.usdz',$2$3`
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('arAsset entries updated with iosModelUrl successfully.');
