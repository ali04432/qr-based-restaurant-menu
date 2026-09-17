// ============================================================
// AR Service — Frontend API Client
// Handles AR asset fetching and telemetry tracking
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface ArAssetData {
  id: string;
  name: string;
  assetType: string;
  modelUrl: string;
  iosModelUrl?: string | null;
  previewImage?: string | null;
  mimeType: string;
  scale: number;
  status: string;
}

/**
 * Fetch the AR asset for a specific menu item (public endpoint).
 * Returns null if no AR asset is linked.
 */
export async function getArAssetForItem(menuItemId: string): Promise<ArAssetData | null> {
  try {
    const res = await fetch(`${API_BASE}/menu/items/${menuItemId}/ar-asset`);
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
    fetch(`${API_BASE}/admin/ar/track`, {
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
