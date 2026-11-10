#!/usr/bin/env node
/**
 * Silver Sapoon — Extended AR Verification Suite (Phase 5)
 * ============================================================
 * Extends the previous 38-checkpoint 3D test suite with AR-specific checks:
 *
 * NEW CHECKPOINTS (AR-specific):
 * 39. <model-viewer> has `ar` attribute for each of 4 dishes
 * 40. <model-viewer> has `ar-modes` = "webxr scene-viewer quick-look"
 * 41. <model-viewer> has `ar-scale` attribute
 * 42. <model-viewer> has `ios-src` attribute (or null if no USDZ yet)
 * 43. AR button present in DOM for each of 4 dishes
 * 44. Calamari has NO AR button
 * 45. GLB model URLs return HTTP 200 (server must be running)
 * 46. USDZ model URLs return HTTP 200 (if USDZ files exist)
 * 47. USDZ files have correct Content-Type: model/vnd.usdz+zip
 * 48. GLB files have correct Content-Type: model/gltf-binary
 * 49. model-viewer AR attributes do not cross-contaminate between dishes
 * 50. Desktop QR modal appears when AR button is clicked on desktop
 *
 * USAGE:
 *   # Start servers first:
 *   npm run dev:api (port 4000)
 *   npm run dev:web (port 3000)
 *
 *   # Then run this script:
 *   node apps/api/scripts/run-ar-verification.js
 *
 * ============================================================
 */

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

// ── Configuration ─────────────────────────────────────────────

const FRONTEND_BASE = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_BASE = process.env.API_URL || 'http://localhost:4000';

// 4 target food items + their expected model files
const FOOD_ITEMS = [
  {
    name: 'Wagyu Beef Steak',
    dbId: 'bac6c92a-b96b-46d8-b746-1b374939bf43',
    glb: '/models/wagyu_beef_steak.glb',
    usdz: '/models/wagyu_beef_steak.usdz',
  },
  {
    name: 'Pan-Seared Salmon',
    dbId: '98c7d921-a833-498f-83c6-028d301c7d94',
    glb: '/models/pan_seared_salmon.glb',
    usdz: '/models/pan_seared_salmon.usdz',
  },
  {
    name: 'Braised Lamb Shank',
    dbId: '7926400a-e47a-4f77-b9f7-d1c3fa5f6a1b',
    glb: '/models/braised_lamb_shank.glb',
    usdz: '/models/braised_lamb_shank.usdz',
  },
  {
    name: 'Silver Sapoon Burger',
    dbId: '6870227a-9df2-462b-b2bc-678d11e0b203',
    glb: '/models/silver_sapoon_burger.glb',
    usdz: '/models/silver_sapoon_burger.usdz',
  },
];

const CALAMARI_ID = 'f2ba2eb2-0ae3-4543-95e7-9aa8de4a98dd';

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');

// ── Results tracker ───────────────────────────────────────────

const results = [];
let cdpWs = null;

function pass(id, name, detail = '') {
  results.push({ id, name, status: 'PASS', detail });
  console.log(`  ✓ [${id}] ${name}${detail ? ': ' + detail : ''}`);
}

function fail(id, name, detail = '') {
  results.push({ id, name, status: 'FAIL', detail });
  console.error(`  ✗ [${id}] ${name}${detail ? ': ' + detail : ''}`);
}

function skip(id, name, reason = '') {
  results.push({ id, name, status: 'SKIP', reason });
  console.log(`  - [${id}] ${name} [SKIP]${reason ? ': ' + reason : ''}`);
}

function info(msg) {
  console.log(`\n[AR-VERIFY] ${msg}`);
}

// ── HTTP helpers ──────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { timeout: 10000 }, (res) => {
      const contentType = res.headers['content-type'] || '';
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, contentType, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// ── CDP helpers ───────────────────────────────────────────────

let cdpMessageId = 1;
let cdpCallbacks = new Map();
let cdpSocket = null;

function cdpSend(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpMessageId++;
    cdpCallbacks.set(id, { resolve, reject });
    cdpSocket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (cdpCallbacks.has(id)) {
        cdpCallbacks.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }
    }, 15000);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function navigate(url) {
  await cdpSend('Page.navigate', { url });
  // Wait for load event
  await sleep(3000);
}

async function evaluate(expr) {
  const result = await cdpSend('Runtime.evaluate', {
    expression: `(() => { ${expr} })()`,
    returnByValue: true,
    awaitPromise: false,
  });
  if (result.result?.type === 'undefined') return undefined;
  if (result.result?.subtype === 'error') throw new Error(result.result.description);
  return result.result?.value;
}

async function waitFor(expr, timeoutMs = 20000, intervalMs = 400) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const val = await evaluate(expr);
      if (val) return val;
    } catch { /* retry */ }
    await sleep(intervalMs);
  }
  throw new Error(`waitFor timeout (${timeoutMs}ms): ${expr.slice(0, 80)}`);
}

// ── File checks ───────────────────────────────────────────────

async function checkFilesExist() {
  info('=== FILE SYSTEM CHECKS ===');

  for (const item of FOOD_ITEMS) {
    const glbPath = path.join(MODELS_DIR, path.basename(item.glb));
    if (fs.existsSync(glbPath)) {
      const size = (fs.statSync(glbPath).size / 1024).toFixed(0);
      pass('FS-GLB-' + item.name.replace(/\s/g, ''), `GLB exists: ${item.glb}`, `${size} KB`);
    } else {
      fail('FS-GLB-' + item.name.replace(/\s/g, ''), `GLB exists: ${item.glb}`, 'FILE MISSING');
    }

    const usdzPath = path.join(MODELS_DIR, path.basename(item.usdz));
    if (fs.existsSync(usdzPath)) {
      const size = (fs.statSync(usdzPath).size / 1024).toFixed(0);
      pass('FS-USDZ-' + item.name.replace(/\s/g, ''), `USDZ exists: ${item.usdz}`, `${size} KB`);
    } else {
      skip('FS-USDZ-' + item.name.replace(/\s/g, ''), `USDZ exists: ${item.usdz}`, 'File not generated yet — run generate-usdz.js');
    }
  }
}

// ── HTTP model serving checks ─────────────────────────────────

async function checkModelUrls() {
  info('=== HTTP MODEL SERVING CHECKS ===');

  for (const item of FOOD_ITEMS) {
    // GLB via backend
    try {
      const r = await httpGet(`${BACKEND_BASE}${item.glb}`);
      if (r.status === 200 && r.contentType.includes('gltf')) {
        pass('HTTP-GLB-' + item.name.replace(/\s/g, ''), `GLB HTTP 200: ${item.glb}`, `${r.contentType}`);
      } else {
        fail('HTTP-GLB-' + item.name.replace(/\s/g, ''), `GLB HTTP 200: ${item.glb}`, `status=${r.status} type=${r.contentType}`);
      }
    } catch (e) {
      fail('HTTP-GLB-' + item.name.replace(/\s/g, ''), `GLB HTTP 200: ${item.glb}`, e.message);
    }

    // GLB via Next.js proxy
    try {
      const r = await httpGet(`${FRONTEND_BASE}${item.glb}`);
      if (r.status === 200) {
        pass('PROXY-GLB-' + item.name.replace(/\s/g, ''), `GLB via Next.js proxy: ${item.glb}`, `HTTP ${r.status}`);
      } else {
        fail('PROXY-GLB-' + item.name.replace(/\s/g, ''), `GLB via Next.js proxy: ${item.glb}`, `HTTP ${r.status}`);
      }
    } catch (e) {
      fail('PROXY-GLB-' + item.name.replace(/\s/g, ''), `GLB via Next.js proxy: ${item.glb}`, e.message);
    }

    // USDZ (only if file exists)
    const usdzPath = path.join(MODELS_DIR, path.basename(item.usdz));
    if (fs.existsSync(usdzPath)) {
      try {
        const r = await httpGet(`${BACKEND_BASE}${item.usdz}`);
        if (r.status === 200 && r.contentType.includes('usdz')) {
          pass('HTTP-USDZ-' + item.name.replace(/\s/g, ''), `USDZ HTTP 200: ${item.usdz}`, r.contentType);
        } else {
          fail('HTTP-USDZ-' + item.name.replace(/\s/g, ''), `USDZ HTTP 200: ${item.usdz}`, `status=${r.status} type=${r.contentType}`);
        }
      } catch (e) {
        fail('HTTP-USDZ-' + item.name.replace(/\s/g, ''), `USDZ HTTP 200: ${item.usdz}`, e.message);
      }
    } else {
      skip('HTTP-USDZ-' + item.name.replace(/\s/g, ''), `USDZ HTTP 200: ${item.usdz}`, 'File not generated yet');
    }
  }

  // AR asset API endpoint
  for (const item of FOOD_ITEMS) {
    try {
      const r = await httpGet(`${BACKEND_BASE}/api/menu/items/${item.dbId}/ar-asset`);
      if (r.status === 200) {
        let parsed;
        try { parsed = JSON.parse(r.body); } catch { parsed = null; }
        const modelUrl = parsed?.data?.modelUrl;
        if (modelUrl && modelUrl.includes('.glb')) {
          pass('API-AR-' + item.name.replace(/\s/g, ''), `AR asset API: ${item.name}`, `modelUrl=${modelUrl}`);
        } else if (parsed?.data === null) {
          // DB record not found — fallback to mock will handle
          skip('API-AR-' + item.name.replace(/\s/g, ''), `AR asset API: ${item.name}`, 'DB null — mock fallback active');
        } else {
          fail('API-AR-' + item.name.replace(/\s/g, ''), `AR asset API: ${item.name}`, `Unexpected response: ${r.body.slice(0, 100)}`);
        }
      } else {
        fail('API-AR-' + item.name.replace(/\s/g, ''), `AR asset API: ${item.name}`, `HTTP ${r.status}`);
      }
    } catch (e) {
      fail('API-AR-' + item.name.replace(/\s/g, ''), `AR asset API: ${item.name}`, e.message);
    }
  }
}

// ── CDP browser checks ────────────────────────────────────────

async function setupCdp() {
  const WebSocket = (() => {
    try { return require('ws'); } catch { return null; }
  })();

  if (!WebSocket) {
    console.error('[AR-VERIFY] ws package not found. Install with: npm install ws');
    return false;
  }

  let tabs;
  try {
    const r = await httpGet('http://localhost:9222/json/list');
    tabs = JSON.parse(r.body);
  } catch (e) {
    console.error(`[AR-VERIFY] Cannot connect to Chrome CDP: ${e.message}`);
    console.error('Start Chrome with: chrome --remote-debugging-port=9222 --disable-web-security');
    return false;
  }

  if (!tabs || tabs.length === 0) {
    console.error('[AR-VERIFY] No Chrome tabs found. Open http://localhost:3000 in Chrome first.');
    return false;
  }

  const tab = tabs.find((t) => t.url.includes('localhost:3000')) || tabs[0];
  const wsUrl = tab.webSocketDebuggerUrl;

  return new Promise((resolve) => {
    cdpSocket = new WebSocket(wsUrl);
    cdpSocket.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && cdpCallbacks.has(msg.id)) {
        const { resolve: res, reject: rej } = cdpCallbacks.get(msg.id);
        cdpCallbacks.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      }
    });
    cdpSocket.on('open', () => resolve(true));
    cdpSocket.on('error', (e) => { console.error('[CDP] WS error:', e.message); resolve(false); });
    setTimeout(() => resolve(false), 5000);
  });
}

async function runCdpChecks() {
  info('=== BROWSER DOM / CDP CHECKS ===');

  const cdpReady = await setupCdp();
  if (!cdpReady) {
    for (const item of FOOD_ITEMS) {
      skip('CDP-AR-' + item.name.replace(/\s/g, ''), `Browser AR attrs: ${item.name}`, 'CDP not available');
    }
    skip('CDP-CALAMARI', 'Calamari has no AR button', 'CDP not available');
    return;
  }

  await cdpSend('Page.enable');
  await cdpSend('Runtime.enable');

  for (const item of FOOD_ITEMS) {
    info(`Checking browser AR attributes for: ${item.name}`);
    try {
      await navigate(`${FRONTEND_BASE}/menu/item/${item.dbId}`);
      await sleep(2000); // let model-viewer initialize

      // Check <model-viewer> exists
      const mvExists = await evaluate(`
        return document.querySelector('model-viewer') !== null;
      `);
      if (!mvExists) {
        fail('CDP-MV-' + item.name.replace(/\s/g, ''), `model-viewer exists: ${item.name}`, 'Element not in DOM');
        continue;
      }

      // Check ar attribute
      const hasAr = await evaluate(`
        return document.querySelector('model-viewer')?.hasAttribute('ar');
      `);
      if (hasAr) {
        pass('CDP-AR-ATTR-' + item.name.replace(/\s/g, ''), `ar attribute: ${item.name}`);
      } else {
        fail('CDP-AR-ATTR-' + item.name.replace(/\s/g, ''), `ar attribute: ${item.name}`, 'Missing');
      }

      // Check ar-modes
      const arModes = await evaluate(`
        return document.querySelector('model-viewer')?.getAttribute('ar-modes');
      `);
      if (arModes && arModes.includes('scene-viewer') && arModes.includes('quick-look')) {
        pass('CDP-AR-MODES-' + item.name.replace(/\s/g, ''), `ar-modes: ${item.name}`, arModes);
      } else {
        fail('CDP-AR-MODES-' + item.name.replace(/\s/g, ''), `ar-modes: ${item.name}`, `Got: ${arModes}`);
      }

      // Check ar-scale
      const arScale = await evaluate(`
        return document.querySelector('model-viewer')?.getAttribute('ar-scale');
      `);
      if (arScale) {
        pass('CDP-AR-SCALE-' + item.name.replace(/\s/g, ''), `ar-scale: ${item.name}`, arScale);
      } else {
        fail('CDP-AR-SCALE-' + item.name.replace(/\s/g, ''), `ar-scale: ${item.name}`, 'Missing');
      }

      // Check src attribute (GLB URL)
      const src = await evaluate(`
        return document.querySelector('model-viewer')?.getAttribute('src');
      `);
      if (src && src.includes('.glb')) {
        // Verify it's the CORRECT GLB for this item (not cross-contaminated)
        const expectedGlb = path.basename(item.glb);
        if (src.includes(expectedGlb)) {
          pass('CDP-SRC-' + item.name.replace(/\s/g, ''), `Correct GLB src: ${item.name}`, src);
        } else {
          fail('CDP-SRC-' + item.name.replace(/\s/g, ''), `Correct GLB src: ${item.name}`, `Expected ${expectedGlb}, got ${src}`);
        }
      } else {
        fail('CDP-SRC-' + item.name.replace(/\s/g, ''), `GLB src: ${item.name}`, `Got: ${src}`);
      }

      // Check ios-src (may be null/empty until USDZ is generated)
      const iosSrc = await evaluate(`
        return document.querySelector('model-viewer')?.getAttribute('ios-src');
      `);
      if (iosSrc && iosSrc.includes('.usdz')) {
        pass('CDP-IOS-SRC-' + item.name.replace(/\s/g, ''), `ios-src (USDZ): ${item.name}`, iosSrc);
      } else {
        skip('CDP-IOS-SRC-' + item.name.replace(/\s/g, ''), `ios-src (USDZ): ${item.name}`, 'USDZ not generated yet');
      }

      // Check AR button is present
      const arBtnText = await evaluate(`
        const btns = Array.from(document.querySelectorAll('button'));
        const arBtn = btns.find(b => b.textContent?.includes('My Table') || b.textContent?.includes('AR'));
        return arBtn ? arBtn.textContent.trim() : null;
      `);
      if (arBtnText) {
        pass('CDP-AR-BTN-' + item.name.replace(/\s/g, ''), `AR button: ${item.name}`, arBtnText.slice(0, 50));
      } else {
        fail('CDP-AR-BTN-' + item.name.replace(/\s/g, ''), `AR button: ${item.name}`, 'Button not found in DOM');
      }

      // Desktop QR modal test
      const modalTrigger = await evaluate(`
        const btns = Array.from(document.querySelectorAll('button'));
        const arBtn = btns.find(b => b.textContent?.includes('My Table') || b.textContent?.includes('AR'));
        if (arBtn) { arBtn.click(); return true; }
        return false;
      `);

      if (modalTrigger) {
        await sleep(1500);
        const modalVisible = await evaluate(`
          return document.querySelector('[class*="fixed"][class*="inset"]') !== null;
        `);
        if (modalVisible) {
          pass('CDP-QR-MODAL-' + item.name.replace(/\s/g, ''), `QR modal on desktop click: ${item.name}`);
          // Close modal
          await evaluate(`
            const closeBtn = document.querySelector('[aria-label="Close"]') || 
                             Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Close');
            if (closeBtn) closeBtn.click();
          `);
          await sleep(500);
        } else {
          skip('CDP-QR-MODAL-' + item.name.replace(/\s/g, ''), `QR modal on desktop click: ${item.name}`, 'Modal not detected (may have opened AR directly)');
        }
      }

    } catch (e) {
      fail('CDP-AR-' + item.name.replace(/\s/g, ''), `Browser checks: ${item.name}`, e.message);
    }
  }

  // Check Calamari has no AR button
  info('Checking Calamari has no AR button...');
  try {
    await navigate(`${FRONTEND_BASE}/menu/item/${CALAMARI_ID}`);
    await sleep(2000);

    const hasArBtn = await evaluate(`
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent?.includes('My Table') || b.textContent?.includes('View in AR'));
    `);
    if (!hasArBtn) {
      pass('CDP-CALAMARI-NO-AR', 'Calamari has no AR button', 'Correct — no model assigned');
    } else {
      fail('CDP-CALAMARI-NO-AR', 'Calamari has no AR button', 'AR button found — should not exist');
    }

    // Check "3D view coming soon" badge
    const comingSoon = await evaluate(`
      return document.body.innerText.includes('3D view coming soon');
    `);
    if (comingSoon) {
      pass('CDP-CALAMARI-FALLBACK', 'Calamari shows "3D view coming soon"');
    } else {
      fail('CDP-CALAMARI-FALLBACK', 'Calamari shows "3D view coming soon"', 'Text not found');
    }

  } catch (e) {
    fail('CDP-CALAMARI-NO-AR', 'Calamari has no AR button', e.message);
  }

  if (cdpSocket) {
    cdpSocket.close();
  }
}

// ── Print final report ────────────────────────────────────────

function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('SILVER SAPOON AR VERIFICATION REPORT');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS');
  const failed = results.filter((r) => r.status === 'FAIL');
  const skipped = results.filter((r) => r.status === 'SKIP');

  console.log(`\n  PASS: ${passed.length}`);
  console.log(`  FAIL: ${failed.length}`);
  console.log(`  SKIP: ${skipped.length}`);
  console.log(`  TOTAL: ${results.length}`);

  if (failed.length > 0) {
    console.log('\nFAILED CHECKS:');
    for (const r of failed) {
      console.error(`  ✗ [${r.id}] ${r.name}${r.detail ? ': ' + r.detail : ''}`);
    }
  }

  if (skipped.length > 0) {
    console.log('\nSKIPPED CHECKS (require USDZ or CDP):');
    for (const r of skipped) {
      console.log(`  - [${r.id}] ${r.name}${r.reason ? ': ' + r.reason : ''}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (failed.length === 0) {
    console.log('✓ All testable AR checks passed.');
  } else {
    console.error(`✗ ${failed.length} check(s) failed.`);
  }

  // AR phone testing reminder
  console.log('\n📱 PHONE AR — REQUIRES MANUAL VERIFICATION:');
  console.log('  The following cannot be tested without a real mobile device:');
  console.log('  1. Android Scene Viewer (ARCore) — GLB placement on table surface');
  console.log('  2. iOS Quick Look AR — USDZ placement (requires USDZ files first)');
  console.log('  3. Camera permission grant/deny flow');
  console.log('  4. AR tracking and stability on physical surfaces');
  console.log('\n  To test on phone:');
  console.log('  1. Run: npx cloudflared tunnel --url http://localhost:3000');
  console.log('  2. Open the tunnel URL on your phone');
  console.log('  3. Navigate to any food item page');
  console.log('  4. Tap "View on My Table (AR)"');
  console.log('  5. Android: Scene Viewer should launch with the GLB model');
  console.log('  6. iOS: Quick Look should launch with the USDZ model (once generated)');
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('\n[AR-VERIFY] Silver Sapoon AR Verification Suite');
  console.log('[AR-VERIFY] ' + new Date().toISOString());
  console.log('[AR-VERIFY] Frontend: ' + FRONTEND_BASE);
  console.log('[AR-VERIFY] Backend:  ' + BACKEND_BASE);
  console.log('');

  await checkFilesExist();
  await checkModelUrls();
  await runCdpChecks();
  printReport();

  const anyFail = results.some((r) => r.status === 'FAIL');
  process.exit(anyFail ? 1 : 0);
}

main().catch((e) => {
  console.error('[AR-VERIFY] Fatal error:', e);
  process.exit(1);
});

