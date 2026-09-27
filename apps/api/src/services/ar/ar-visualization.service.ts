import { prisma } from '../../config/database';
import { emitToRestaurant } from '../../socket/socket.server';
import { SOCKET_EVENTS } from '../../socket/events';

// ============================================================
// AR Visualization Service
// Centralized engine for asset management, validation,
// analytics telemetry and real-time AR event broadcasts.
// ============================================================

export interface ArAssetPayload {
  menuItemId?: string;
  name: string;
  assetType?: string;
  modelUrl: string;
  iosModelUrl?: string;
  previewImage?: string;
  mimeType?: string;
  fileSize?: number;
  scale?: number;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  portionLabel?: string;
  status?: string;
  metadata?: string;
}

/**
 * Get all AR assets for a restaurant.
 */
export async function listArAssets(restaurantId: string) {
  return prisma.arAsset.findMany({
    where: { restaurantId },
    include: {
      menuItem: {
        select: { id: true, name: true, price: true, image: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get the single AR asset linked to a menu item.
 * Returns null if none assigned — callers must handle this gracefully.
 */
export async function getArAssetByMenuItem(menuItemId: string) {
  return prisma.arAsset.findUnique({
    where: { menuItemId },
  });
}

/**
 * Get an AR asset by its own ID.
 */
export async function getArAssetById(id: string, restaurantId: string) {
  return prisma.arAsset.findFirst({
    where: { id, restaurantId },
    include: {
      menuItem: {
        select: { id: true, name: true, price: true, image: true },
      },
    },
  });
}

/**
 * Create a new AR asset for a restaurant / menu item.
 * Safe: throws if menuItemId already has an asset (1:1 constraint).
 */
export async function createArAsset(restaurantId: string, data: ArAssetPayload) {
  return prisma.arAsset.create({
    data: {
      restaurantId,
      menuItemId: data.menuItemId ?? null,
      name: data.name,
      assetType: data.assetType ?? 'MODEL_3D',
      modelUrl: data.modelUrl,
      iosModelUrl: data.iosModelUrl ?? null,
      previewImage: data.previewImage ?? null,
      mimeType: data.mimeType ?? 'model/gltf-binary',
      fileSize: data.fileSize ?? null,
      scale: data.scale ?? 1.0,
      widthCm: data.widthCm ?? null,
      heightCm: data.heightCm ?? null,
      depthCm: data.depthCm ?? null,
      portionLabel: data.portionLabel ?? null,
      status: data.status ?? 'ACTIVE',
      metadata: data.metadata ?? null,
    },
    include: {
      menuItem: {
        select: { id: true, name: true, price: true, image: true },
      },
    },
  });
}

/**
 * Update an existing AR asset.
 */
export async function updateArAsset(
  id: string,
  restaurantId: string,
  data: Partial<ArAssetPayload>
) {
  // Verify ownership
  const existing = await prisma.arAsset.findFirst({ where: { id, restaurantId } });
  if (!existing) return null;

  return prisma.arAsset.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.assetType !== undefined && { assetType: data.assetType }),
      ...(data.modelUrl !== undefined && { modelUrl: data.modelUrl }),
      ...(data.iosModelUrl !== undefined && { iosModelUrl: data.iosModelUrl }),
      ...(data.previewImage !== undefined && { previewImage: data.previewImage }),
      ...(data.mimeType !== undefined && { mimeType: data.mimeType }),
      ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
      ...(data.scale !== undefined && { scale: data.scale }),
      ...(data.widthCm !== undefined && { widthCm: data.widthCm }),
      ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
      ...(data.depthCm !== undefined && { depthCm: data.depthCm }),
      ...(data.portionLabel !== undefined && { portionLabel: data.portionLabel }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
    },
    include: {
      menuItem: {
        select: { id: true, name: true, price: true, image: true },
      },
    },
  });
}

/**
 * Delete an AR asset (soft-verifies ownership).
 */
export async function deleteArAsset(id: string, restaurantId: string) {
  const existing = await prisma.arAsset.findFirst({ where: { id, restaurantId } });
  if (!existing) return null;
  return prisma.arAsset.delete({ where: { id } });
}

// ── Telemetry ─────────────────────────────────────────────────

export interface TrackEventPayload {
  menuItemId?: string;
  assetId?: string;
  sessionId?: string;
  eventType: string;
  deviceType?: string;
  arSupported?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Record a visualization telemetry event and broadcast via Socket.io.
 * Non-blocking: failures are swallowed so AR analytics never break the UI.
 */
export async function trackVisualizationEvent(
  restaurantId: string,
  payload: TrackEventPayload
): Promise<void> {
  try {
    await prisma.visualizationEvent.create({
      data: {
        restaurantId,
        menuItemId: payload.menuItemId ?? null,
        assetId: payload.assetId ?? null,
        sessionId: payload.sessionId ?? null,
        eventType: payload.eventType,
        deviceType: payload.deviceType ?? null,
        arSupported: payload.arSupported ?? false,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      },
    });

    // Real-time broadcast to the restaurant room
    try {
      emitToRestaurant(restaurantId, SOCKET_EVENTS.MENU_ITEM_VISUALIZED, {
        eventType: payload.eventType,
        menuItemId: payload.menuItemId,
        assetId: payload.assetId,
        deviceType: payload.deviceType,
        arSupported: payload.arSupported,
        sessionId: payload.sessionId,
        timestamp: new Date().toISOString(),
      });
    } catch (_socketErr) {
      // Socket.io not available — silently skip broadcast
    }
  } catch (err) {
    console.warn('[AR] Failed to track visualization event:', err);
  }
}

/**
 * Get visualization analytics for a restaurant.
 */
export async function getVisualizationAnalytics(restaurantId: string, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.visualizationEvent.findMany({
    where: { restaurantId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });

  const byType = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.eventType] = (acc[e.eventType] || 0) + 1;
    return acc;
  }, {});

  const arSessions = events.filter((e) => e.eventType === 'ar.session.started').length;
  const arSuccessful = events.filter((e) => e.eventType === 'ar.model.loaded').length;
  const viewer3d = events.filter((e) => e.eventType === 'view3d.opened').length;

  return {
    totalEvents: events.length,
    arSessions,
    arSuccessful,
    viewer3d,
    byType,
    events: events.slice(0, 50),
  };
}
