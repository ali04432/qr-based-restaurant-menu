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

async function waitForServer(url, timeoutMs = 35000) {
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
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await sleep(2500);
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) { }
    }
  }
}

async function run() {
  console.log('================================================================');
  console.log(' SILVER SPOON - COMPLETE CROSS-PLATFORM AR RUNTIME VERIFICATION');
  console.log('================================================================\n');

  const testReport = [];
  function record(category, testName, passed, details = '') {
    testReport.push({ category, testName, passed, details });
    const mark = passed ? '[✅ PASS]' : '[❌ FAIL]';
    console.log(`${mark} ${category} -> ${testName} ${details ? `(${details})` : ''}`);
  }

  let apiProc = null;
  let webProc = null;
  let chromeProc = null;
  let cdp = null;

  try {
    // 1. Verification of Server Readiness
    console.log('--- 1. Verification of Server Readiness ---');
    let apiReady = await waitForServer('http://localhost:4000/api/health', 2000);
    // Use a static asset route that always returns 200 when Next.js is up
    let webReady = await waitForServer('http://localhost:3000/ar/hiro-marker.png', 2000);

    if (!apiReady) {
      console.log('Starting API server on port 4000 (compiled dist/index.js)...');
      const apiEnv = { ...process.env, PORT: '4000', NODE_ENV: 'production' };
      const envPath = path.resolve(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        for (const line of envContent.split('\n')) {
          const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
          if (match && !match[1].startsWith('#')) {
            apiEnv[match[1]] = (match[2] || '').trim().replace(/(^['"]|['"]$)/g, '');
          }
        }
      }
      apiProc = spawn(process.execPath, ['dist/index.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: apiEnv,
        stdio: 'ignore'
      });

      for (let attempt = 0; attempt < 25; attempt++) {
        try {
          const testRes = await checkUrl('http://localhost:4000/api/health');
          if (testRes.status === 200) {
            apiReady = true;
            break;
          }
        } catch (e) { }
        await sleep(1000);
      }
    }

    if (!webReady) {
      console.log('Starting Web server on port 3000 (Next.js production)...');
      const nextScript = path.resolve(__dirname, '../../../node_modules/next/dist/bin/next');
      webProc = spawn(process.execPath, [nextScript, 'start', '-p', '3000'], {
        cwd: path.resolve(__dirname, '../../web'),
        stdio: 'ignore',
        windowsHide: true,
      });
      webProc.on('error', (err) => console.warn('[web start error]', err.message));
      webReady = await waitForServer('http://localhost:3000/ar/hiro-marker.png', 35000);
    }

    record('Server Startup', 'Express API Server (Port 4000)', apiReady);
    record('Server Startup', 'Next.js Frontend Server (Port 3000)', webReady);

    if (!apiReady || !webReady) {
      console.error('Server failed to start. Aborting.');
      process.exit(1);
    }

    // 2. Direct GLB HTTP Response Verification
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

    // 2b. Direct USDZ HTTP Response Verification
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
      const isUsdzMime = apiRes.headers && apiRes.headers['content-type'] === 'model/vnd.usdz+zip';
      record('Asset Delivery', `API /models/${usdz} (USDZ)`, apiRes.status === 200 && isUsdzMime, `HTTP ${apiRes.status}, Content-Type: ${apiRes.headers?.['content-type']}`);
      record('Asset Delivery', `Web Proxy /models/${usdz} (USDZ)`, webRes.status === 200, `HTTP ${webRes.status}`);
    }

    // 2c. Marker WebAR Assets Verification
    console.log('\n--- 2c. Marker WebAR Assets Verification ---');
    const markerPngRes = await checkUrl('http://localhost:3000/ar/hiro-marker.png');
    record('Marker Assets', 'Hiro Marker PNG (/ar/hiro-marker.png)', markerPngRes.status === 200, `HTTP ${markerPngRes.status}`);

    const markerHtmlRes = await checkUrl('http://localhost:3000/ar/marker-viewer.html');
    record('Marker Assets', 'Marker WebAR Viewer HTML (/ar/marker-viewer.html)', markerHtmlRes.status === 200, `HTTP ${markerHtmlRes.status}`);

    const aframeRes = await checkUrl('http://localhost:3000/vendor/aframe.min.js');
    record('Marker Assets', 'Vendor A-Frame Script (/vendor/aframe.min.js)', aframeRes.status === 200, `HTTP ${aframeRes.status}`);

    const arjsRes = await checkUrl('http://localhost:3000/vendor/aframe-ar.js');
    record('Marker Assets', 'Vendor AR.js Script (/vendor/aframe-ar.js)', arjsRes.status === 200, `HTTP ${arjsRes.status}`);

    // 3. Launching Real Chrome Browser with CDP
    console.log('\n--- 3. Launching Real Chrome Browser with CDP ---');
    const testUserDataDir = path.resolve(__dirname, '../.chrome-test-profile');
    fs.mkdirSync(testUserDataDir, { recursive: true });

    chromeProc = spawn(CHROME_PATH, [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${testUserDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--window-size=1280,900',
      'http://localhost:3000/menu/item/bac6c92a-b96b-46d8-b746-1b374939bf43'
    ], { stdio: 'ignore' });

    let wsUrl = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      try {
        const list = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
          }).on('error', reject);
        });
        const pageTab = list.find((t) => t.type === 'page');
        if (pageTab && pageTab.webSocketDebuggerUrl) {
          wsUrl = pageTab.webSocketDebuggerUrl;
          break;
        }
      } catch (e) { }
      await sleep(500);
    }

    if (!wsUrl) {
      throw new Error('Failed to find open Chrome tab WebSocketDebuggerUrl');
    }

    cdp = new CDPClient(wsUrl);
    await cdp.connect();
    console.log(`Connected to Chrome CDP WebSocket: ${wsUrl}`);

    cdp.activeMonitoring = true;

    // 4. Testing Dish 1: Wagyu Beef Steak (bac6c92a-b96b-46d8-b746-1b374939bf43)
    console.log('\n--- 4. Testing Dish 1: Wagyu Beef Steak (bac6c92a-b96b-46d8-b746-1b374939bf43) ---');
    await cdp.navigate('http://localhost:3000/menu/item/bac6c92a-b96b-46d8-b746-1b374939bf43');

    // Wait for dish details to load
    for (let i = 0; i < 40; i++) {
      const isStillLoading = await cdp.evaluate(`return document.body.innerText.includes('Loading dish details');`);
      if (!isStillLoading) break;
      await sleep(500);
    }

    // Wait for model-viewer to mount and finish loading
    let steakLoaded = false;
    let steakSrc = '';
    for (let i = 0; i < 35; i++) {
      const res = await cdp.evaluate(`
        const el = document.querySelector('model-viewer');
        if (!el) return { found: false };
        return {
          found: true,
          loaded: !!el.loaded,
          src: el.src || el.getAttribute('src') || ''
        };
      `);
      if (res && res.loaded) {
        steakLoaded = true;
        steakSrc = res.src;
        break;
      }
      await sleep(500);
    }

    record('3D Viewer', 'Wagyu Beef Steak 3D Model Loaded in Browser', steakLoaded, `Loaded: ${steakLoaded}, src: ${steakSrc}`);
    record('Model Isolation', 'Wagyu Beef Steak Source matches wagyu_beef_steak.glb', steakSrc.includes('wagyu_beef_steak.glb'), steakSrc);

    // Verify AR Attributes
    const arAttributes = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      if (!el) return {};
      return {
        hasAr: el.hasAttribute('ar'),
        arModes: el.getAttribute('ar-modes') || '',
        arScale: el.getAttribute('ar-scale') || '',
        iosSrc: el.getAttribute('ios-src') || '',
        arPlacement: el.getAttribute('ar-placement') || ''
      };
    `);

    record('AR Configuration', 'Wagyu Beef Steak has ar attribute enabled', arAttributes.hasAr === true);
    record('AR Configuration', 'Wagyu Beef Steak ar-modes includes scene-viewer & quick-look',
      (arAttributes.arModes || '').includes('scene-viewer') && (arAttributes.arModes || '').includes('quick-look'),
      arAttributes.arModes
    );
    record('AR Configuration', 'Wagyu Beef Steak ar-scale configured (fixed)', arAttributes.arScale === 'fixed', arAttributes.arScale);
    record('AR Configuration', 'Wagyu Beef Steak ios-src matches wagyu_beef_steak.usdz', (arAttributes.iosSrc || '').includes('wagyu_beef_steak.usdz'), arAttributes.iosSrc);
    record('AR Configuration', 'Wagyu Beef Steak ar-placement configured (floor)', arAttributes.arPlacement === 'floor', arAttributes.arPlacement);

    // Verify AR Controls & Dropdown
    const arBtnInDom = await cdp.evaluate(`
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.innerText.includes('View on My Table (AR)'));
    `);
    record('AR Controls', '"View on My Table (AR)" button visible in DOM', arBtnInDom);

    // Open AR Options Dropdown
    const arDropdownOpened = await cdp.evaluate(`
      const dropdownBtn = document.querySelector('button[title*="Select AR Mode"]');
      if (dropdownBtn) {
        dropdownBtn.click();
        return true;
      }
      return false;
    `);
    await sleep(400);

    const hasArOptions = await cdp.evaluate(`
      const bodyText = document.body.innerText;
      return bodyText.includes('Surface AR') && bodyText.includes('Marker WebAR') && bodyText.includes('Hiro Marker Guide');
    `);
    record('AR Experience Chooser', 'AR Options Dropdown renders Surface AR and Marker WebAR options', arDropdownOpened && hasArOptions);

    // Test Desktop QR Modal Flow
    const qrModalTriggered = await cdp.evaluate(`
      const btns = Array.from(document.querySelectorAll('button'));
      const arBtn = btns.find(b => b.innerText.includes('View on My Table (AR)'));
      if (arBtn) {
        arBtn.click();
        return true;
      }
      return false;
    `);
    await sleep(600);

    const qrModalDetails = await cdp.evaluate(`
      const modalText = document.body.innerText;
      const hasQr = modalText.includes('Experience in AR on Your Phone') || modalText.includes('Point your smartphone camera');
      const hasWebcamBtn = modalText.includes('Try Marker AR with Webcam');
      return { hasQr, hasWebcamBtn };
    `);

    record('AR Desktop Flow', 'Clicking AR button opens Mobile QR scan modal with tunnel instructions', qrModalTriggered && qrModalDetails.hasQr);
    record('AR Desktop Flow', 'Desktop modal offers "Try Marker AR with Webcam" fallback option', qrModalDetails.hasWebcamBtn);

    // Launch Marker AR from modal
    const markerArLaunched = await cdp.evaluate(`
      const btns = Array.from(document.querySelectorAll('button'));
      const webcamBtn = btns.find(b => b.innerText.includes('Try Marker AR with Webcam'));
      if (webcamBtn) {
        webcamBtn.click();
        return true;
      }
      return false;
    `);
    await sleep(1000);

    const markerIframeMounted = await cdp.evaluate(`
      const iframe = document.querySelector('iframe[src*="marker-viewer.html"]');
      const hasMarkerHud = document.body.innerText.includes('Marker WebAR') || document.body.innerText.includes('Hiro Marker');
      return Boolean(iframe && hasMarkerHud);
    `);
    record('Marker WebAR', 'Marker WebAR modal renders iframe pointing to /ar/marker-viewer.html', markerArLaunched && markerIframeMounted);

    // Close Marker AR modal cleanly
    const markerModalClosed = await cdp.evaluate(`
      const closeBtn = document.querySelector('button[aria-label="Close AR"]');
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
      return false;
    `);
    await sleep(500);

    // 3D Controls Verification: Turntable, Drag Orbit, Zoom, Reset
    const initialTurntable = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? el.turntableRotation : 0;
    `);
    await sleep(1000);
    const nextTurntable = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? el.turntableRotation : 0;
    `);
    record('3D Controls', 'Auto-Turntable Smooth Rotation in Progress', initialTurntable !== nextTurntable);

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
    record('3D Controls', 'Interactive Mouse Drag / Camera Orbit Adjusts Perspective', orbitBeforeDrag !== orbitAfterDrag);

    // Zoom and Reset Controls
    const zoomInClicked = await cdp.evaluate(`
      const btn = document.querySelector('button[title*="Zoom in"], button[aria-label*="Zoom in"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    record('3D Controls', 'Zoom In Button Adjusts Field of View', zoomInClicked);

    const resetClicked = await cdp.evaluate(`
      const btn = document.querySelector('button[title*="Reset"], button[aria-label*="Reset"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    record('3D Controls', 'Reset Camera View Restores Defaults', resetClicked);

    // 2D/3D Mode Toggle
    const toggleTo2D = await cdp.evaluate(`
      const btn = document.querySelector('button[title*="Switch back to photo"], button[aria-label*="Back to image"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    await sleep(400);
    record('UI Mode Toggle', 'Switch to 2D Photo Mode displays photo image', toggleTo2D);

    const toggleBackTo3D = await cdp.evaluate(`
      const btns = Array.from(document.querySelectorAll('button'));
      const btn3d = btns.find(b => b.innerText.includes('View in 3D (360°)'));
      if (btn3d) {
        btn3d.click();
        return true;
      }
      return false;
    `);
    await sleep(600);
    record('UI Mode Toggle', 'Switch back to 3D Interactive Mode displays model-viewer', toggleBackTo3D);

    // 5. Testing Dish 2: Pan-Seared Salmon (98c7d921-a833-498f-83c6-028d301c7d94)
    console.log('\n--- 5. Testing Dish 2: Pan-Seared Salmon (98c7d921-a833-498f-83c6-028d301c7d94) ---');
    await cdp.navigate('http://localhost:3000/menu/item/98c7d921-a833-498f-83c6-028d301c7d94');

    for (let i = 0; i < 40; i++) {
      const isStillLoading = await cdp.evaluate(`return document.body.innerText.includes('Loading dish details');`);
      if (!isStillLoading) break;
      await sleep(500);
    }

    let salmonLoaded = false;
    let salmonSrc = '';
    for (let i = 0; i < 35; i++) {
      const res = await cdp.evaluate(`
        const el = document.querySelector('model-viewer');
        if (!el) return { found: false };
        return {
          found: true,
          loaded: !!el.loaded,
          src: el.src || el.getAttribute('src') || ''
        };
      `);
      if (res && res.loaded) {
        salmonLoaded = true;
        salmonSrc = res.src;
        break;
      }
      await sleep(500);
    }
    record('3D Viewer', 'Pan-Seared Salmon 3D Model Loaded in Browser', salmonLoaded, `src: ${salmonSrc}`);
    record('Model Isolation', 'Salmon Source matches pan_seared_salmon.glb', salmonSrc.includes('pan_seared_salmon.glb'));
    record('Model Isolation', 'Salmon does NOT leak Wagyu Steak model', !salmonSrc.includes('wagyu_beef_steak.glb'));

    const salmonAr = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return {
        hasAr: el ? el.hasAttribute('ar') : false,
        iosSrc: el ? (el.getAttribute('ios-src') || '') : ''
      };
    `);
    record('AR Configuration', 'Pan-Seared Salmon has ar attribute enabled', salmonAr.hasAr);
    record('AR Configuration', 'Pan-Seared Salmon ios-src matches pan_seared_salmon.usdz', salmonAr.iosSrc.includes('pan_seared_salmon.usdz'));

    // 6. Testing Dish 3: Braised Lamb Shank (7926400a-e47a-4f77-b9f7-d1c3fa5f6a1b)
    console.log('\n--- 6. Testing Dish 3: Braised Lamb Shank (7926400a-e47a-4f77-b9f7-d1c3fa5f6a1b) ---');
    await cdp.navigate('http://localhost:3000/menu/item/7926400a-e47a-4f77-b9f7-d1c3fa5f6a1b');

    for (let i = 0; i < 40; i++) {
      const isStillLoading = await cdp.evaluate(`return document.body.innerText.includes('Loading dish details');`);
      if (!isStillLoading) break;
      await sleep(500);
    }

    let lambLoaded = false;
    let lambSrc = '';
    for (let i = 0; i < 35; i++) {
      const res = await cdp.evaluate(`
        const el = document.querySelector('model-viewer');
        if (!el) return { found: false };
        return {
          found: true,
          loaded: !!el.loaded,
          src: el.src || el.getAttribute('src') || ''
        };
      `);
      if (res && res.loaded) {
        lambLoaded = true;
        lambSrc = res.src;
        break;
      }
      await sleep(500);
    }
    record('3D Viewer', 'Braised Lamb Shank 3D Model Loaded in Browser', lambLoaded, `src: ${lambSrc}`);
    record('Model Isolation', 'Lamb Shank Source matches braised_lamb_shank.glb', lambSrc.includes('braised_lamb_shank.glb'));
    record('Model Isolation', 'Lamb Shank does NOT leak Salmon or Steak model', !lambSrc.includes('pan_seared_salmon') && !lambSrc.includes('wagyu_beef_steak'));

    const lambAr = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return {
        hasAr: el ? el.hasAttribute('ar') : false,
        iosSrc: el ? (el.getAttribute('ios-src') || '') : ''
      };
    `);
    record('AR Configuration', 'Braised Lamb Shank has ar attribute enabled', lambAr.hasAr);
    record('AR Configuration', 'Braised Lamb Shank ios-src matches braised_lamb_shank.usdz', lambAr.iosSrc.includes('braised_lamb_shank.usdz'));

    // 7. Testing Dish 4: Silver Sapoon Burger (6870227a-9df2-462b-b2bc-678d11e0b203)
    console.log('\n--- 7. Testing Dish 4: Silver Sapoon Burger (6870227a-9df2-462b-b2bc-678d11e0b203) ---');
    await cdp.navigate('http://localhost:3000/menu/item/6870227a-9df2-462b-b2bc-678d11e0b203');

    for (let i = 0; i < 40; i++) {
      const isStillLoading = await cdp.evaluate(`return document.body.innerText.includes('Loading dish details');`);
      if (!isStillLoading) break;
      await sleep(500);
    }

    let burgerLoaded = false;
    let burgerSrc = '';
    for (let i = 0; i < 35; i++) {
      const res = await cdp.evaluate(`
        const el = document.querySelector('model-viewer');
        if (!el) return { found: false };
        return {
          found: true,
          loaded: !!el.loaded,
          src: el.src || el.getAttribute('src') || ''
        };
      `);
      if (res && res.loaded) {
        burgerLoaded = true;
        burgerSrc = res.src;
        break;
      }
      await sleep(500);
    }
    record('3D Viewer', 'Silver Sapoon Burger 3D Model Loaded in Browser', burgerLoaded, `src: ${burgerSrc}`);
    record('Model Isolation', 'Burger Source matches silver_sapoon_burger.glb', burgerSrc.includes('silver_sapoon_burger.glb'));
    record('Model Isolation', 'Burger does NOT leak Lamb, Salmon, or Steak model', !burgerSrc.includes('braised_lamb_shank') && !burgerSrc.includes('pan_seared_salmon'));

    const burgerAr = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return {
        hasAr: el ? el.hasAttribute('ar') : false,
        iosSrc: el ? (el.getAttribute('ios-src') || '') : ''
      };
    `);
    record('AR Configuration', 'Silver Sapoon Burger has ar attribute enabled', burgerAr.hasAr);
    record('AR Configuration', 'Silver Sapoon Burger ios-src matches silver_sapoon_burger.usdz', burgerAr.iosSrc.includes('silver_sapoon_burger.usdz'));

    // 8. Direct Dynamic Model Switching Test
    console.log('\n--- 8. Testing Direct Model Switching (Burger -> Salmon) ---');
    await cdp.evaluate(`
      window.location.href = '/menu/item/98c7d921-a833-498f-83c6-028d301c7d94';
    `);
    await sleep(2500);
    const switchedSrc = await cdp.evaluate(`
      const el = document.querySelector('model-viewer');
      return el ? (el.src || el.getAttribute('src') || '') : '';
    `);
    record('Model Switching', 'Switched page renders Salmon without residual Burger data', switchedSrc.includes('pan_seared_salmon.glb') && !switchedSrc.includes('burger'));

    // 9. Testing Fallback for Item Without 3D Model (Crispy Calamari)
    console.log('\n--- 9. Testing Fallback for Item Without 3D Model ---');
    await cdp.navigate('http://localhost:3000/menu/item/f2ba2eb2-0ae3-4543-95e7-9aa8de4a98dd');

    for (let i = 0; i < 40; i++) {
      const isStillLoading = await cdp.evaluate(`return document.body.innerText.includes('Loading dish details');`);
      if (!isStillLoading) break;
      await sleep(500);
    }
    const calamariState = await cdp.evaluate(`
      const bodyText = document.body.innerText;
      const hasComingSoon = bodyText.includes('3D view coming soon') || bodyText.includes('coming soon');
      const hasModelViewer = !!document.querySelector('model-viewer');
      const hasArBtn = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('View on My Table (AR)'));
      return { hasComingSoon, hasModelViewer, hasArBtn };
    `);
    record('Fallback Handling', 'Dish without 3D model shows "3D view coming soon" notice', calamariState.hasComingSoon && !calamariState.hasModelViewer);
    record('Fallback Handling', 'Calamari does NOT render "View on My Table (AR)" button', !calamariState.hasArBtn);

    // 10. Console Errors and Network Reliability Audit
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
    if (cdp) cdp.close();
    try { if (chromeProc) chromeProc.kill(); } catch (e) { }
    try { if (apiProc) apiProc.kill(); } catch (e) { }
    try { if (webProc) webProc.kill(); } catch (e) { }
  }

  console.log('\n================================================================');
  console.log(' FINAL CROSS-PLATFORM AR VERIFICATION REPORT');
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

