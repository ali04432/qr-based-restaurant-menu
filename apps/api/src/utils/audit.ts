import { prisma } from '../config/database';

export interface AuditEventPayload {
  restaurantId?: string | null;
  branchId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}

/**
 * Enterprise Audit Event Logger.
 * Writes immutable security and operational audit trails to AuditLog table.
 * Fails gracefully so logging errors never disrupt user transactions.
 */
export async function logAuditEvent(payload: AuditEventPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        restaurantId: payload.restaurantId || null,
        branchId: payload.branchId || null,
        userId: payload.userId || null,
        userEmail: payload.userEmail || null,
        userRole: payload.userRole || null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId || null,
        details: payload.details || null,
        ipAddress: payload.ipAddress || null,
      },
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to persist audit event:', err);
  }
}

/**
 * Utility to log staff actions to the auditable StaffActionLog table.
 * Mirrors to central AuditLog table as well.
 * Fails gracefully if logging cannot be completed.
 */
export async function logStaffAction(
  restaurantId: string,
  userId: string,
  action: string,
  details?: string
): Promise<void> {
  try {
    if (!restaurantId || !userId) return;

    await Promise.allSettled([
      prisma.staffActionLog.create({
        data: {
          restaurantId,
          userId,
          action,
          details: details || null,
        },
      }),
      logAuditEvent({
        restaurantId,
        userId,
        action,
        entity: 'STAFF_ACTION',
        details: details || null,
      }),
    ]);
  } catch (err) {
    console.warn('[AuditLog] Could not log staff action to DB:', err);
  }
}

