// ============================================================
// AR Service — Frontend API Client
// Handles AR asset fetching and telemetry tracking
// ============================================================

// Safe base URL resolution for server vs client.
function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const publicUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicUrl && !publicUrl.includes('localhost') && !publicUrl.includes('127.0.0.1') && publicUrl.startsWith('http')) {
      return publicUrl.replace(/\/$/, '');
    }
    return '';
  }
  return process.env.API_INTERNAL_URL || process.env.API_BASE_URL || 'http://localhost:4000';
}

export interface ArAssetData {
  id: string;
  name: string;
  assetType: string;
  modelUrl: string;
  iosModelUrl?: string | null;
  previewImage?: string | null;
  mimeType: string;
  scale: number;
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
  portionLabel?: string | null;
  status: string;
}

/**
 * Fetch the AR asset for a specific menu item (public endpoint).
 * Returns null if no AR asset is linked.
 */
export async function getArAssetForItem(menuItemId: string): Promise<ArAssetData | null> {
  if (!menuItemId) return null;
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/api/menu/items/${encodeURIComponent(menuItemId)}/ar-asset`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Track an AR/3D visualization event (fire-and-forget).
 */
export function trackArEvent(payload: {
  restaurantId: string;
  menuItemId?: string;
  assetId?: string;
  sessionId?: string;
  eventType: string;
  deviceType?: string;
  arSupported?: boolean;
  metadata?: Record<string, unknown>;
}): void {
  try {
    const base = getApiBase();
    fetch(`${base}/api/admin/ar/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Swallow — telemetry must never break the UI
    });
  } catch {
    // Swallow
  }
}
