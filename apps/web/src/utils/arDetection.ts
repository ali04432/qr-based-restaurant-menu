/**
 * Cross-Platform AR Capability Detection System
 * Evaluates hardware, OS, browser, WebGL, WebRTC, and AR features
 * dynamically without relying purely on User-Agent sniffing.
 */

export type OperatingSystem = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'other';
export type BrowserName = 'safari' | 'chrome' | 'firefox' | 'samsung' | 'edge' | 'other';
export type ArMode = 'scene-viewer' | 'quick-look' | 'marker-webar' | '3d-fallback';

export interface PlatformDetails {
  os: OperatingSystem;
  browser: BrowserName;
  isMobile: boolean;
  isTablet: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  userAgent: string;
}

export interface ArCapabilities {
  webgl: boolean;
  webgl2: boolean;
  webrtc: boolean;
  cameraAvailable: boolean;
  cameraPermission: 'prompt' | 'granted' | 'denied' | 'unsupported';
  quickLook: boolean;
  sceneViewer: boolean;
  webxrAr: boolean;
  markerAr: boolean;
}

export interface ArResolution {
  platform: PlatformDetails;
  capabilities: ArCapabilities;
  recommendedMode: ArMode;
  availableModes: ArMode[];
  reason: string;
}

/**
 * Detect platform and browser details safely (SSR-compatible).
 */
export function getPlatformDetails(): PlatformDetails {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      os: 'other',
      browser: 'other',
      isMobile: false,
      isTablet: false,
      isIOS: false,
      isAndroid: false,
      isDesktop: true,
      userAgent: '',
    };
  }

  const ua = navigator.userAgent || '';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

  // iPad on iOS 13+ reports 'MacIntel' with touch points > 1
  const isIPad =
    /iPad/.test(ua) ||
    (platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1);

  const isIPhone = /iPhone|iPod/.test(ua);
  const isIOS = isIPhone || isIPad;
  const isAndroid = /Android/.test(ua);
  const isMobile = isIPhone || (isAndroid && /Mobile/.test(ua));
  const isTablet = isIPad || (isAndroid && !/Mobile/.test(ua));
  const isDesktop = !isMobile && !isTablet;

  let os: OperatingSystem = 'other';
  if (isIOS) os = 'ios';
  else if (isAndroid) os = 'android';
  else if (/Mac/.test(platform) || /Macintosh/.test(ua)) os = 'macos';
  else if (/Win/.test(platform) || /Windows/.test(ua)) os = 'windows';
  else if (/Linux/.test(platform) || /Linux/.test(ua)) os = 'linux';

  let browser: BrowserName = 'other';
  if (/SamsungBrowser/i.test(ua)) browser = 'samsung';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'firefox';
  else if (/Edg/i.test(ua)) browser = 'edge';
  else if (/CriOS|Chrome/i.test(ua) && !/Edge|Edg|OPR/i.test(ua)) browser = 'chrome';
  else if (/Safari/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)) browser = 'safari';

  return {
    os,
    browser,
    isMobile,
    isTablet,
    isIOS,
    isAndroid,
    isDesktop,
    userAgent: ua,
  };
}

/**
 * Test WebGL and WebGL2 hardware context creation.
 */
export function checkWebGLSupport(): { webgl: boolean; webgl2: boolean } {
  if (typeof window === 'undefined') return { webgl: false, webgl2: false };
  try {
    const canvas = document.createElement('canvas');
    const gl2 = !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
    const gl1 = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
    return { webgl: gl1 || gl2, webgl2: gl2 };
  } catch {
    return { webgl: false, webgl2: false };
  }
}

/**
 * Check if WebRTC getUserMedia is available in the current browser context.
 */
export function checkWebRtcSupport(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

/**
 * Check Apple Quick Look native AR support.
 * Checks both the official WebKit 'ar' relList test and iOS environment.
 */
export function checkQuickLookSupport(isIOS: boolean): boolean {
  if (typeof document === 'undefined') return false;
  if (!isIOS) return false;

  try {
    const anchor = document.createElement('a');
    if (anchor.relList && typeof anchor.relList.supports === 'function') {
      return anchor.relList.supports('ar');
    }
    // Safari on iOS 12+ supports Quick Look by default
    return isIOS;
  } catch {
    return isIOS;
  }
}

/**
 * Asynchronously query camera permission without prompting the user.
 */
export async function queryCameraPermission(): Promise<'prompt' | 'granted' | 'denied' | 'unsupported'> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.permissions ||
    typeof navigator.permissions.query !== 'function'
  ) {
    return 'unsupported';
  }

  try {
    const status = await navigator.permissions.query({ name: 'camera' as any });
    return status.state;
  } catch {
    return 'unsupported';
  }
}

/**
 * Check if video input devices exist on the system.
 */
export async function checkCameraAvailability(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return false;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((d) => d.kind === 'videoinput');
  } catch {
    return false;
  }
}

/**
 * Check WebXR immersive-ar session support.
 */
export async function checkWebXrArSupport(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !('xr' in navigator) ||
    typeof (navigator as any).xr?.isSessionSupported !== 'function'
  ) {
    return false;
  }

  try {
    return await (navigator as any).xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

/**
 * Comprehensive cross-platform AR evaluation.
 * Inspects all hardware and software layers to determine the best AR experience.
 */
export async function detectArCapabilities(options?: {
  modelUrl?: string;
  iosModelUrl?: string | null;
}): Promise<ArResolution> {
  const platform = getPlatformDetails();
  const { webgl, webgl2 } = checkWebGLSupport();
  const webrtc = checkWebRtcSupport();
  const quickLookSupported = checkQuickLookSupport(platform.isIOS);
  const cameraPermission = await queryCameraPermission();
  const cameraAvailable = await checkCameraAvailability();
  const webxrAr = await checkWebXrArSupport();

  // Scene Viewer is available on Android with Google Chrome / Google Play Services
  const sceneViewer = platform.isAndroid && Boolean(options?.modelUrl);

  // Marker AR requires WebGL and Camera (WebRTC)
  const markerAr = webgl && webrtc && (cameraAvailable || platform.isMobile);

  const availableModes: ArMode[] = [];

  if (platform.isAndroid && (sceneViewer || webxrAr)) {
    availableModes.push('scene-viewer');
  }

  if (platform.isIOS && quickLookSupported && options?.iosModelUrl) {
    availableModes.push('quick-look');
  }

  if (markerAr) {
    availableModes.push('marker-webar');
  }

  // Always have 3D interactive viewer as baseline fallback
  if (webgl) {
    availableModes.push('3d-fallback');
  }

  // Priority selection:
  // 1. Android Scene Viewer (if Android and supported)
  // 2. Apple Quick Look (if iOS and USDZ available)
  // 3. Marker-based WebAR (if camera + WebGL available)
  // 4. 3D interactive viewer fallback
  let recommendedMode: ArMode = '3d-fallback';
  let reason = '';

  if (platform.isAndroid && (sceneViewer || webxrAr)) {
    recommendedMode = 'scene-viewer';
    reason = 'Android device detected with native Scene Viewer / WebXR support.';
  } else if (platform.isIOS && quickLookSupported && options?.iosModelUrl) {
    recommendedMode = 'quick-look';
    reason = 'iOS device detected with native Apple Quick Look (USDZ) support.';
  } else if (markerAr) {
    recommendedMode = 'marker-webar';
    reason = 'Device supports in-browser camera and WebGL for Marker-based WebAR.';
  } else {
    recommendedMode = '3d-fallback';
    reason = 'Native AR and camera access are unavailable; falling back to 360° 3D viewer.';
  }

  const capabilities: ArCapabilities = {
    webgl,
    webgl2,
    webrtc,
    cameraAvailable,
    cameraPermission,
    quickLook: quickLookSupported && Boolean(options?.iosModelUrl),
    sceneViewer,
    webxrAr,
    markerAr,
  };

  return {
    platform,
    capabilities,
    recommendedMode,
    availableModes,
    reason,
  };
}

