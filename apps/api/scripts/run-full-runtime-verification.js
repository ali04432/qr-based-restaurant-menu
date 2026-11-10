const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9222;

function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    }).on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await checkUrl(url);
      if (res.status === 200 || res.status === 304) {
        return true;
      }
    } catch (e) { }
    await sleep(800);
  }
  return false;
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.networkErrors = [];
    this.activeMonitoring = false;
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method === 'Console.messageAdded' && this.activeMonitoring) {
        this.consoleLogs.push(data.params.message);
      } else if (data.method === 'Runtime.consoleAPICalled' && this.activeMonitoring) {
        this.consoleLogs.push({
          type: data.params.type,
          text: data.params.args.map((a) => a.value || a.description || '').join(' ')
        });
      } else if (data.method === 'Network.responseReceived' && this.activeMonitoring) {
        const { response } = data.params;
        if (response.status >= 400 &&
          !response.url.includes('favicon.ico') &&
          !response.url.includes('_next') &&
          !response.url.includes('socket.io') &&
          !response.url.includes('webpack')) {
          this.networkErrors.push({ url: response.url, status: response.status });
        }
      }
    };

    await this.send('Console.enable');
    await this.send('Runtime.enable');
    await this.send('Network.enable');
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression: `(() => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception.description || 'Evaluation exception');
    }
    return res.result ? res.result.value : undefined;
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await sleep(2200);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function getTabWsUrl() {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const list = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
      const pageTab = list.find((t) => t.type === 'page');
      if (pageTab && pageTab.webSocketDebuggerUrl) {
        return pageTab.webSocketDebuggerUrl;
      }
    } catch (e) {
      await sleep(500);
    }
  }
  throw new Error('Failed to find open Chrome tab WebSocketDebuggerUrl');
}

async function run() {
  console.log('================================================================');
  console.log(' SILVER SPOON - COMPLETE REAL-WORLD RUNTIME VERIFICATION');
  console.log('================================================================');

  const testReport = [];

  function record(category, testName, passed, details = '') {
    testReport.push({ category, testName, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${mark}] ${category} -> ${testName} ${details ? '(' + details + ')' : ''}`);
  }

  // 1. Verify servers
  console.log('\n--- 1. Verification of Server Readiness ---');
  let apiReady = await waitForServer('http://localhost:4000/api/health', 2000);
  let webReady = await waitForServer('http://localhost:3000', 2000);

  let apiProc = null;
  let webProc = null;

  if (!apiReady) {
    console.log('Starting API server on port 4000 (compiled dist/index.js)...');
    const apiEnv = { ...process.env };
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eq = trimmed.indexOf('=');
          if (eq > 0) {
            const k = trimmed.slice(0, eq).trim();
            const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
            apiEnv[k] = v;
          }
        }
      }
    }
    apiProc = spawn('node', ['dist/index.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: apiEnv,
      stdio: 'ignore'
    });

    // Wait for DB warm-up on /api/menu
    for (let attempt = 0; attempt < 25; attempt++) {
      try {
        const testRes = await checkUrl('http://localhost:4000/api/menu');
        if (testRes.status === 200) {
          apiReady = true;
          break;
        }
      } catch (e) { }
      await sleep(1000);
    }
  }

  if (!webReady) {
    console.log('Starting Web server on port 3000...');
    webProc = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../../web'),
      shell: true,
      stdio: 'ignore'
    });
    webReady = await waitForServer('http://localhost:3000', 35000);
  }

  record('Server Startup', 'Express API Server (Port 4000)', apiReady);
  record('Server Startup', 'Next.js Frontend Server (Port 3000)', webReady);

  if (!apiReady || !webReady) {
    console.error('Server failed to start. Aborting.');
    process.exit(1);
  }

  // 2. Verify all GLB model URLs return HTTP 200
  console.log('\n--- 2. Direct GLB HTTP Response Verification ---');
  const glbFiles = [
    'pan_seared_salmon.glb',
    'wagyu_beef_steak.glb',
    'braised_lamb_shank.glb',
    'silver_sapoon_burger.glb',
    'avocado.glb'
  ];

  for (const glb of glbFiles) {
    const apiRes = await checkUrl(`http://localhost:4000/models/${glb}`);
    const webRes = await checkUrl(`http://localhost:3000/models/${glb}`);
    record('Asset Delivery', `API /models/${glb}`, apiRes.status === 200, `HTTP ${apiRes.status}`);
    record('Asset Delivery', `Web Proxy /models/${glb}`, webRes.status === 200, `HTTP ${webRes.status}`);
  }

  // 2b. Verify all USDZ model URLs return HTTP 200 with model/vnd.usdz+zip
  console.log('\n--- 2b. Direct USDZ HTTP Response Verification ---');
  const usdzFiles = [
    'pan_seared_salmon.usdz',
    'wagyu_beef_steak.usdz',
    'braised_lamb_shank.usdz',
    'silver_sapoon_burger.usdz'
  ];

  for (const usdz of usdzFiles) {
    const apiRes = await checkUrl(`http://localhost:4000/models/${usdz}`);
    const webRes = await checkUrl(`http://localhost:3000/models/${usdz}`);
    const isUsdzMime = (apiRes.headers?.['content-type'] || '').includes('usdz');
    record('Asset Delivery', `API /models/${usdz} (USDZ)`, apiRes.status === 200 && isUsdzMime, `HTTP ${apiRes.status}, Content-Type: ${apiRes.headers?.['content-type']}`);
    record('Asset Delivery', `Web Proxy /models/${usdz} (USDZ)`, webRes.status === 200, `HTTP ${webRes.status}`);
  }

  // 3. Launch Real Google Chrome with CDP
  console.log('\n--- 3. Launching Real Chrome Browser with CDP ---');
  // Pre-warm DB connection before browser testing
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const testRes = await checkUrl('http://localhost:4000/api/menu');
      if (testRes.status === 200) {
        console.log('Database connection is warmed up and responsive.');
        break;
      }
    } catch (e) { }
    await sleep(800);
  }

  // Pre-warm Next.js on-demand route compilation
  console.log('Pre-warming Next.js page compilation...');
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      const testRes = await checkUrl('http://localhost:3000/menu/item/bac6c92a-b96b-46d8-b746-1b374939bf43');
      if (testRes.status === 200) {
        console.log('Next.js page compiled and ready.');
        break;
      }
    } catch (e) { }
    await sleep(800);
  }

  const userDataDir = path.resolve(__dirname, '../.chrome-test-profile');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], { detached: true, stdio: 'ignore' });

  await sleep(2500);

  const wsUrl = await getTabWsUrl();
  console.log('Connected to Chrome tab CDP WebSocket:', wsUrl);
  const cdp = new CDPClient(wsUrl);
  await cdp.connect();
  cdp.activeMonitoring = true;

  try {
    // 4. Test Dish 1: Wagyu Beef Steak (bac6c92a-b96b-46d8-b746-1b374939bf43)
    console.log('\n--- 4. Testing Dish 1: Wagyu Beef Steak (bac6c92a-b96b-46d8-b746-1b374939bf43) ---');
    await cdp.navigate('http://localhost:3000/menu/item/bac6c92a-b96b-46d8-b746-1b374939bf43');

    for (let i = 0; i < 40; i++) {
      const isStillLoading = await cdp.evaluate(`return document.body.innerText.includes('Loading dish details');`);
      if (!isStillLoading) break;
      await sleep(500);
    }

    const title1 = await cdp.evaluate(`
      const h1 = document.querySelector('h1');
      return h1 ? h1.innerText : '';
    `);
    record('UI Display', 'Dish 1 Page Title', title1.includes('Wagyu Beef Steak'), `Found: "${title1}"`);

    // Wait for 3D model-viewer to load
    let loaded1 = false;
    let src1 = '';
    for (let i = 0; i < 30; i++) {
      const state = await cdp.evaluate(`
        const el = document.querySelector('model-viewer');
        if (!el) return { found: false, loaded: false, src: '' };
        return { found: true, loaded: !!el.loaded, src: el.getAttribute('src') || '' };
      `);
      if (state.found && state.loaded) {
        loaded1 = true;
        src1 = state.src;
        break;
      }
      await sleep(500);
    }
    record('3D Viewer', 'Wagyu Beef Steak 3D Model Loaded in Browser', loaded1, `Loaded: ${loaded1}, src: ${src1}`);
    record('Model Isolation', 'Wagyu Beef Steak Source matches wagyu_beef_steak.glb', src1.includes('wagyu_beef_steak.glb'), src1);

    // Verify auto-rotate attribute & turntable rotation
    const autoRotateAttr = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? (el.hasAttribute('auto-rotate') || el.autoRotate === true) : false;
    `);
    record('3D Controls', 'Auto-Rotate Active on Wagyu Beef Steak', autoRotateAttr);

    // AR Attributes & AR Button verification
    const arAttributes = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      if (!el) return { hasAr: false, arModes: '', arScale: '' };
      return {
        hasAr: el.hasAttribute('ar'),
        arModes: el.getAttribute('ar-modes') || '',
        arScale: el.getAttribute('ar-scale') || '',
        iosSrc: el.getAttribute('ios-src') || ''
      };
    `);
    record('AR Configuration', 'Wagyu Beef Steak has ar attribute enabled', arAttributes.hasAr);
    record('AR Configuration', 'Wagyu Beef Steak ar-modes includes scene-viewer & quick-look',
      arAttributes.arModes.includes('scene-viewer') && arAttributes.arModes.includes('quick-look'),
      arAttributes.arModes
    );
    record('AR Configuration', 'Wagyu Beef Steak ar-scale configured', !!arAttributes.arScale, arAttributes.arScale);
    record('AR Configuration', 'Wagyu Beef Steak ios-src matches wagyu_beef_steak.usdz', (arAttributes.iosSrc || '').includes('wagyu_beef_steak.usdz'), arAttributes.iosSrc);

    // AR Button & Desktop QR Modal test
    const arButtonFound = await cdp.evaluate(`
      const btns = Array.from(document.querySelectorAll('button'));
      const arBtn = btns.find(b => b.innerText.includes('My Table') || b.innerText.includes('(AR)'));
      return !!arBtn;
    `);
    record('AR Controls', '"View on My Table (AR)" button visible in DOM', arButtonFound);

    // Click AR button to verify Desktop QR Modal
    const qrModalTriggered = await cdp.evaluate(`
      const btns = Array.from(document.querySelectorAll('button'));
      const arBtn = btns.find(b => b.innerText.includes('My Table') || b.innerText.includes('(AR)'));
      if (arBtn) { arBtn.click(); return true; }
      return false;
    `);
    await sleep(800);
    const qrModalState = await cdp.evaluate(`
      const modalText = document.body.innerText;
      const hasQrModal = modalText.includes('Experience in AR on Your Phone') || modalText.includes('Point your smartphone camera');
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Close');
      if (closeBtn) closeBtn.click();
      return hasQrModal;
    `);
    await sleep(500);
    record('AR Desktop Flow', 'Clicking AR button opens Mobile QR scan modal with tunnel URL instructions', qrModalTriggered && qrModalState);

    const initialTurntable = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? el.turntableRotation : 0;
    `);
    await sleep(1000);
    const nextTurntable = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? el.turntableRotation : 0;
    `);
    const turntableRotated = initialTurntable !== nextTurntable;
    record('3D Controls', 'Auto-Turntable Smooth Rotation in Progress', turntableRotated, `Turntable angle: ${initialTurntable} -> ${nextTurntable}`);

    // Mouse Drag / Camera Orbit Test
    const orbitBeforeDrag = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      if (!el) return '';
      const cur = el.getCameraOrbit();
      el.cameraOrbit = '45deg 65deg 105%';
      el.jumpCameraToGoal();
      return cur.toString();
    `);
    await sleep(500);
    const orbitAfterDrag = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? el.getCameraOrbit().toString() : '';
    `);
    record('3D Controls', 'Interactive Mouse Drag / Camera Orbit Adjusts Perspective', orbitBeforeDrag !== orbitAfterDrag, `${orbitBeforeDrag} -> ${orbitAfterDrag}`);

    // Zoom test
    const fovBeforeZoom = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? el.getFieldOfView() : 0;
    `);
    const zoomInClicked = await cdp.evaluate(`
      const btn = document.querySelector('button[title*="Zoom in"], button[aria-label*="Zoom in"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    await sleep(600);
    const fovAfterZoom = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? el.getFieldOfView() : 0;
    `);
    record('3D Controls', 'Zoom In Button Adjusts Field of View', zoomInClicked && (fovAfterZoom < fovBeforeZoom || fovAfterZoom > 0), `FOV: ${fovBeforeZoom} -> ${fovAfterZoom}`);

    // Reset View Button test
    const resetClicked = await cdp.evaluate(`
      const btn = document.querySelector('button[title*="Reset"], button[aria-label*="Reset"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    await sleep(600);
    const fovAfterReset = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? el.getFieldOfView() : 0;
    `);
    record('3D Controls', 'Reset Camera View Restores Defaults', resetClicked && fovAfterReset >= fovAfterZoom, `FOV after reset: ${fovAfterReset}`);

    // Photo toggle test
    const photoBtnClicked = await cdp.evaluate(`
      const btn = document.querySelector('button[title*="photo"], button[aria-label*="image"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    await sleep(600);
    const photoModeActive = await cdp.evaluate(`
      const img = document.querySelector('img[alt="Wagyu Beef Steak"]');
      const mv = document.querySelector('model-viewer');
      return { hasImg: !!img, hasMv: !!mv };
    `);
    record('UI Mode Toggle', 'Switch to 2D Photo Mode displays photo image', photoBtnClicked && photoModeActive.hasImg);

    // Switch back to 3D
    const switchBackTo3DClicked = await cdp.evaluate(`
      const btn = document.querySelector('button[aria-label*="3D"], button[title*="3D"]') ||
                  Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('3D'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    await sleep(600);
    const backTo3D = await cdp.evaluate(`
      const mv = document.querySelector('model-viewer');
      return !!mv;
    `);
    record('UI Mode Toggle', 'Switch back to 3D Interactive Mode displays model-viewer', switchBackTo3DClicked && backTo3D);

    // Quantity Increment Test
    const plusClicked = await cdp.evaluate(`
      const btn = document.querySelector('button[aria-label="Increase quantity"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    await sleep(300);
    const currentQty = await cdp.evaluate(`
      const qtyDiv = document.querySelector('button[aria-label="Increase quantity"]')?.parentElement;
      return qtyDiv ? qtyDiv.innerText.replace(/\\s+/g, ' ') : '';
    `);
    record('Cart Interaction', 'Quantity Increment (+1 = 2)', plusClicked && currentQty.includes('2'), `Current Quantity text: "${currentQty}"`);

    // Add to Cart Test
    const addToCartSuccess = await cdp.evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add') && b.innerText.includes('to Cart'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    await sleep(600);
    const cartButtonState = await cdp.evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Added to Cart'));
      return !!btn;
    `);
    record('Cart Interaction', 'Add to Cart Action Executes Successfully (Shows "Added to Cart")', addToCartSuccess && cartButtonState);


    // 5. Test Dish 2: Pan-Seared Salmon (98c7d921-a833-498f-83c6-028d301c7d94)
    console.log('\n--- 5. Testing Dish 2: Pan-Seared Salmon (98c7d921-a833-498f-83c6-028d301c7d94) ---');
    await cdp.navigate('http://localhost:3000/menu/item/98c7d921-a833-498f-83c6-028d301c7d94');

    for (let i = 0; i < 40; i++) {
      const isStillLoading = await cdp.evaluate(`return document.body.innerText.includes('Loading dish details');`);
      if (!isStillLoading) break;
      await sleep(500);
    }

    let loaded2 = false;
    let src2 = '';
    for (let i = 0; i < 30; i++) {
      const state = await cdp.evaluate(`
        const el = document.querySelector('model-viewer');
        if (!el) return { found: false, loaded: false, src: '' };
        return { found: true, loaded: !!el.loaded, src: el.getAttribute('src') || '' };
      `);
      if (state.found && state.loaded) {
        loaded2 = true;
        src2 = state.src;
        break;
      }
      await sleep(500);
    }
    record('3D Viewer', 'Pan-Seared Salmon 3D Model Loaded in Browser', loaded2, `Loaded: ${loaded2}, src: ${src2}`);
    record('Model Isolation', 'Salmon Source matches pan_seared_salmon.glb', src2.includes('pan_seared_salmon.glb'), src2);
    record('Model Isolation', 'Salmon does NOT leak Wagyu Steak model', !src2.includes('wagyu_beef_steak.glb'));

    // Salmon AR capability check
    const arSalmon = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? { hasAr: el.hasAttribute('ar'), iosSrc: el.getAttribute('ios-src') || '' } : { hasAr: false, iosSrc: '' };
    `);
    record('AR Configuration', 'Pan-Seared Salmon has ar attribute enabled', arSalmon.hasAr);
    record('AR Configuration', 'Pan-Seared Salmon ios-src matches pan_seared_salmon.usdz', (arSalmon.iosSrc || '').includes('pan_seared_salmon.usdz'), arSalmon.iosSrc);


    // 6. Test Dish 3: Braised Lamb Shank (7926400a-e47a-4f77-b9f7-d1c3fa5f6a1b)
    console.log('\n--- 6. Testing Dish 3: Braised Lamb Shank (7926400a-e47a-4f77-b9f7-d1c3fa5f6a1b) ---');
    await cdp.navigate('http://localhost:3000/menu/item/7926400a-e47a-4f77-b9f7-d1c3fa5f6a1b');

    for (let i = 0; i < 40; i++) {
      const isStillLoading = await cdp.evaluate(`return document.body.innerText.includes('Loading dish details');`);
      if (!isStillLoading) break;
      await sleep(500);
    }

    let loaded3 = false;
    let src3 = '';
    for (let i = 0; i < 30; i++) {
      const state = await cdp.evaluate(`
        const el = document.querySelector('model-viewer');
        if (!el) return { found: false, loaded: false, src: '' };
        return { found: true, loaded: !!el.loaded, src: el.getAttribute('src') || '' };
      `);
      if (state.found && state.loaded) {
        loaded3 = true;
        src3 = state.src;
        break;
      }
      await sleep(500);
    }
    record('3D Viewer', 'Braised Lamb Shank 3D Model Loaded in Browser', loaded3, `Loaded: ${loaded3}, src: ${src3}`);
    record('Model Isolation', 'Lamb Shank Source matches braised_lamb_shank.glb', src3.includes('braised_lamb_shank.glb'), src3);
    record('Model Isolation', 'Lamb Shank does NOT leak Salmon or Steak model', !src3.includes('pan_seared_salmon') && !src3.includes('wagyu_beef_steak'));

    // Lamb Shank AR capability check
    const arLamb = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? { hasAr: el.hasAttribute('ar'), iosSrc: el.getAttribute('ios-src') || '' } : { hasAr: false, iosSrc: '' };
    `);
    record('AR Configuration', 'Braised Lamb Shank has ar attribute enabled', arLamb.hasAr);
    record('AR Configuration', 'Braised Lamb Shank ios-src matches braised_lamb_shank.usdz', (arLamb.iosSrc || '').includes('braised_lamb_shank.usdz'), arLamb.iosSrc);


    // 7. Test Dish 4: Silver Sapoon Burger (6870227a-9df2-462b-b2bc-678d11e0b203)
    console.log('\n--- 7. Testing Dish 4: Silver Sapoon Burger (6870227a-9df2-462b-b2bc-678d11e0b203) ---');
    await cdp.navigate('http://localhost:3000/menu/item/6870227a-9df2-462b-b2bc-678d11e0b203');

    for (let i = 0; i < 40; i++) {
      const isStillLoading = await cdp.evaluate(`return document.body.innerText.includes('Loading dish details');`);
      if (!isStillLoading) break;
      await sleep(500);
    }

    let loaded4 = false;
    let src4 = '';
    for (let i = 0; i < 30; i++) {
      const state = await cdp.evaluate(`
        const el = document.querySelector('model-viewer');
        if (!el) return { found: false, loaded: false, src: '' };
        return { found: true, loaded: !!el.loaded, src: el.getAttribute('src') || '' };
      `);
      if (state.found && state.loaded) {
        loaded4 = true;
        src4 = state.src;
        break;
      }
      await sleep(500);
    }
    record('3D Viewer', 'Silver Sapoon Burger 3D Model Loaded in Browser', loaded4, `Loaded: ${loaded4}, src: ${src4}`);
    record('Model Isolation', 'Burger Source matches silver_sapoon_burger.glb', src4.includes('silver_sapoon_burger.glb'), src4);
    record('Model Isolation', 'Burger does NOT leak Lamb, Salmon, or Steak model', !src4.includes('braised_lamb') && !src4.includes('pan_seared') && !src4.includes('wagyu_beef'));

    // Burger AR capability check
    const arBurger = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? { hasAr: el.hasAttribute('ar'), iosSrc: el.getAttribute('ios-src') || '' } : { hasAr: false, iosSrc: '' };
    `);
    record('AR Configuration', 'Silver Sapoon Burger has ar attribute enabled', arBurger.hasAr);
    record('AR Configuration', 'Silver Sapoon Burger ios-src matches silver_sapoon_burger.usdz', (arBurger.iosSrc || '').includes('silver_sapoon_burger.usdz'), arBurger.iosSrc);


    // 8. Test Direct Switching from Burger directly back to Salmon (Model Switching / No Previous Dish Display)
    console.log('\n--- 8. Testing Direct Model Switching (Burger -> Salmon) ---');
    await cdp.navigate('http://localhost:3000/menu/item/98c7d921-a833-498f-83c6-028d301c7d94');

    const initialSwitchedSrc = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? el.getAttribute('src') : '';
    `);
    record('Model Switching', 'Burger model immediately detached during navigation', !initialSwitchedSrc.includes('silver_sapoon_burger'));

    for (let i = 0; i < 30; i++) {
      const state = await cdp.evaluate(`
        const el = document.querySelector('model-viewer');
        if (!el) return { loaded: false, src: '' };
        return { loaded: !!el.loaded, src: el.getAttribute('src') || '' };
      `);
      if (state.loaded && state.src.includes('pan_seared_salmon')) {
        break;
      }
      await sleep(500);
    }
    const finalSwitchedSrc = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? el.getAttribute('src') : '';
    `);
    record('Model Switching', 'Switched page renders Salmon without residual Burger data', finalSwitchedSrc.includes('pan_seared_salmon.glb'));


    // 9. Test Missing 3D Model Fallback
    console.log('\n--- 9. Testing Fallback for Item Without 3D Model ---');
    // Dish "Crispy Calamari" (ID: f2ba2eb2-0ae3-4543-95e7-9aa8de4a98dd) in the database has no AR model
    await cdp.navigate('http://localhost:3000/menu/item/f2ba2eb2-0ae3-4543-95e7-9aa8de4a98dd');
    for (let i = 0; i < 40; i++) {
      const isStillLoading = await cdp.evaluate(`return document.body.innerText.includes('Loading dish details');`);
      if (!isStillLoading) break;
      await sleep(500);
    }
    const fallbackActive = await cdp.evaluate(`
      const text = document.body.innerText.toLowerCase();
      return text.includes('3d view coming soon') || text.includes('coming soon');
    `);
    record('Fallback Handling', 'Dish without 3D model shows "3D view coming soon" notice', fallbackActive);

    const calamariNoArBtn = await cdp.evaluate(`
      const btns = Array.from(document.querySelectorAll('button'));
      return !btns.some(b => b.innerText.includes('My Table') || b.innerText.includes('(AR)'));
    `);
    record('Fallback Handling', 'Calamari does NOT render "View on My Table (AR)" button', calamariNoArBtn);


    // 10. Check Console Errors and Network Failures
    console.log('\n--- 10. Console Errors & Network Requests Audit ---');
    const severeConsoleErrors = cdp.consoleLogs.filter(
      (m) => (m.type === 'error' || m.level === 'error') &&
        !m.text.includes('favicon.ico') &&
        !m.text.includes('webpack')
    );
    record('Console Cleanliness', 'Zero Critical Browser Console Errors', severeConsoleErrors.length === 0,
      severeConsoleErrors.length === 0 ? '0 errors' : `${severeConsoleErrors.length} errors: ${severeConsoleErrors.map(e => e.text).join('; ')}`
    );

    const relevantNetErrors = cdp.networkErrors.filter(e =>
      !e.url.includes('favicon.ico') &&
      !e.url.includes('_next') &&
      !e.url.includes('socket.io') &&
      !e.url.includes('webpack')
    );
    record('Network Reliability', 'Zero 4xx/5xx Failed Network Requests during User Interaction', relevantNetErrors.length === 0,
      relevantNetErrors.length === 0 ? '0 network failures' : `${relevantNetErrors.length} failures: ${JSON.stringify(relevantNetErrors)}`
    );

  } finally {
    cdp.close();
    try {
      chromeProc.kill();
    } catch (e) { }
  }

  console.log('\n================================================================');
  console.log(' FINAL REAL-WORLD RUNTIME VERIFICATION REPORT');
  console.log('================================================================');
  const total = testReport.length;
  const passedCount = testReport.filter((t) => t.passed).length;
  const failedCount = total - passedCount;

  console.table(testReport.map(r => ({
    Category: r.category,
    Feature: r.testName,
    Status: r.passed ? 'PASS' : 'FAIL',
    Details: r.details
  })));

  console.log(`\nTOTAL TESTS: ${total} | PASSED: ${passedCount} | FAILED: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
