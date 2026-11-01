const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Silver Spoon 3D Food Viewer Integration Test Suite');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

// ── Test 1: Verify all 5 GLB models individually
const models = [
  { name: 'avocado.glb', expectedMinSize: 8000000 },
  { name: 'braised_lamb_shank.glb', expectedMinSize: 300000 },
  { name: 'pan_seared_salmon.glb', expectedMinSize: 1000000 },
  { name: 'silver_sapoon_burger.glb', expectedMinSize: 800000 },
  { name: 'wagyu_beef_steak.glb', expectedMinSize: 800000 },
];

models.forEach((m) => {
  test(`GLB model "${m.name}" exists and is valid glTF 2.0 binary`, () => {
    const apiPath = path.join('apps', 'api', 'public', 'models', m.name);
    const webPath = path.join('apps', 'web', 'public', 'models', m.name);
    assert(fs.existsSync(apiPath), `File must exist in api: ${apiPath}`);
    assert(fs.existsSync(webPath), `File must exist in web: ${webPath}`);

    const buf = fs.readFileSync(apiPath);
    assert(buf.length >= m.expectedMinSize, `File size too small: ${buf.length}`);
    const magic = buf.toString('utf8', 0, 4);
    const ver = buf.readUInt32LE(4);
    const declaredLen = buf.readUInt32LE(8);
    assert.strictEqual(magic, 'glTF', `Invalid magic header: ${magic}`);
    assert.strictEqual(ver, 2, `Invalid version: ${ver}`);
    assert.strictEqual(declaredLen, buf.length, `Length mismatch: declared ${declaredLen} vs actual ${buf.length}`);
  });
});

// ── Test 2: Verify Express static model serving configuration
test('Express app configures static model serving with correct headers and dual routes', () => {
  const appSrc = fs.readFileSync('apps/api/src/app.ts', 'utf8');
  assert(appSrc.includes("app.use('/models', express.static"), 'Must mount /models');
  assert(appSrc.includes("app.use('/api/models', express.static"), 'Must mount /api/models');
  assert(appSrc.includes('model/gltf-binary'), 'Must set glb MIME type');
  assert(appSrc.includes('Access-Control-Allow-Origin'), 'Must set CORS header');
  assert(appSrc.includes('Cross-Origin-Resource-Policy'), 'Must set CORP header');
});

// ── Test 3: Verify Next.js rewrites proxy /models/* to backend
test('Next.js config contains rewrite proxy for /models/:path*', () => {
  const nextConfigSrc = fs.readFileSync('apps/web/next.config.js', 'utf8');
  assert(nextConfigSrc.includes("source: '/models/:path*'"), 'Must rewrite /models/:path*');
  assert(nextConfigSrc.includes("destination: `${apiInternal}/models/:path*`"), 'Must point to API internal models');
});

// ── Test 4: Verify Model3DViewer features & controls
const viewerSrc = fs.readFileSync('apps/web/src/components/customer/Model3DViewer.tsx', 'utf8');

test('Model3DViewer configures slow automatic turntable rotation', () => {
  assert(viewerSrc.includes('auto-rotate'), 'Must have auto-rotate attribute');
  assert(viewerSrc.includes('rotation-per-second="25deg"'), 'Must specify slow majestic 25deg/s rotation');
  assert(viewerSrc.includes('auto-rotate-delay="0"'), 'Must start rotation immediately on load');
});

test('Model3DViewer supports mouse drag & mobile touch rotation', () => {
  assert(viewerSrc.includes('camera-controls'), 'Must enable camera controls');
  assert(viewerSrc.includes('touch-action="pan-y"'), 'Must configure touch-action for mobile scrolling and touch rotation');
  assert(viewerSrc.includes('interpolation-decay="150"'), 'Must configure smooth inertial damping');
});

test('Model3DViewer implements smooth zoom in / zoom out controls', () => {
  assert(viewerSrc.includes('handleZoomIn'), 'Must implement handleZoomIn');
  assert(viewerSrc.includes('handleZoomOut'), 'Must implement handleZoomOut');
  assert(viewerSrc.includes('mv.zoom(1)'), 'Must call mv.zoom(1) for zoom in');
  assert(viewerSrc.includes('mv.zoom(-1)'), 'Must call mv.zoom(-1) for zoom out');
  assert(viewerSrc.includes('min-camera-orbit="auto auto 50%"'), 'Must guard min camera distance');
  assert(viewerSrc.includes('max-camera-orbit="auto auto 220%"'), 'Must guard max camera distance');
});

test('Model3DViewer provides a reset camera/view control', () => {
  assert(viewerSrc.includes('handleResetView'), 'Must implement handleResetView');
  assert(viewerSrc.includes('mv.cameraOrbit = \'0deg 75deg 105%\''), 'Must reset cameraOrbit to default');
  assert(viewerSrc.includes('jumpCameraToGoal'), 'Must jump camera to default goal');
  assert(viewerSrc.includes('RotateCcw'), 'Must display RotateCcw icon in control bar');
});

test('Model3DViewer configures appropriate lighting, shadows, and color tone-mapping', () => {
  assert(viewerSrc.includes('environment-image="neutral"'), 'Must use neutral studio lighting');
  assert(viewerSrc.includes('shadow-intensity="1.5"'), 'Must configure grounding shadows');
  assert(viewerSrc.includes('shadow-softness="0.75"'), 'Must configure soft shadow edges');
  assert(viewerSrc.includes('exposure="1.05"'), 'Must configure balanced exposure');
  assert(viewerSrc.includes('tone-mapping="commerce"'), 'Must use commerce tone-mapping for realistic food colors');
});

test('Model3DViewer provides loading indicator and graceful error recovery', () => {
  assert(viewerSrc.includes('animate-spin rounded-full border-3 border-amber-500'), 'Must show golden spinner');
  assert(viewerSrc.includes('Loading 3D Food Model…'), 'Must show loading label');
  assert(viewerSrc.includes('Failed to load 3D model'), 'Must show error message');
  assert(viewerSrc.includes('Retry Loading'), 'Must have retry button');
  assert(viewerSrc.includes('retry=${retryKey}'), 'Must cache-bust modelUrl on retry');
  assert(viewerSrc.includes('Model load timed out after 15s'), 'Must have 15s timeout to eliminate infinite spinner');
});

test('Model3DViewer preserves sample disclaimer for avocado.glb and not real dishes', () => {
  assert(viewerSrc.includes('modelUrl?.includes(\'avocado.glb\')'), 'Must detect avocado.glb as sample');
  assert(viewerSrc.includes('Sample model – not the actual dish'), 'Must show sample badge');
});

// ── Test 5: Verify multi-item isolation and website integration
const pageSrc = fs.readFileSync('apps/web/src/app/menu/item/[id]/page.tsx', 'utf8');

test('FoodDetailsPage isolates AR assets between dish selections (no model leakage)', () => {
  assert(pageSrc.includes('setArAsset(null)'), 'Must reset arAsset state when loading or switching dishes');
  assert(pageSrc.includes('defaultMode="3d"'), 'Must open directly in interactive 3D mode when model exists');
  assert(pageSrc.includes('3D view coming soon'), 'Must show coming soon fallback for items without 3D models');
});

test('FoodDetailsPage preserves Add to Cart, quantity, and ordering flow', () => {
  assert(pageSrc.includes('handleAddToCart'), 'Must preserve handleAddToCart');
  assert(pageSrc.includes('increaseQuantity'), 'Must preserve quantity increment');
  assert(pageSrc.includes('decreaseQuantity'), 'Must preserve quantity decrement');
  assert(pageSrc.includes('special-instructions'), 'Must preserve customer special instructions');
});

// ── Test 6: Verify mock menu data fallback
const mockSrc = fs.readFileSync('apps/web/src/data/mockMenuData.ts', 'utf8');

test('mockMenuData has distinct models for all 4 target dishes', () => {
  assert(mockSrc.includes('/models/wagyu_beef_steak.glb'), 'Must have wagyu model in mock');
  assert(mockSrc.includes('/models/pan_seared_salmon.glb'), 'Must have salmon model in mock');
  assert(mockSrc.includes('/models/braised_lamb_shank.glb'), 'Must have lamb shank model in mock');
  assert(mockSrc.includes('/models/silver_sapoon_burger.glb'), 'Must have burger model in mock');
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Results: ${passedTests}/${totalTests} tests passed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (passedTests !== totalTests) {
  process.exit(1);
}

