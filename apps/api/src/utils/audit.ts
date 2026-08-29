import { prisma } from '../config/database';

/**
 * Utility to log staff actions to the auditable StaffActionLog table.
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
    await prisma.staffActionLog.create({
      data: {
        restaurantId,
        userId,
        action,
        details: details || null,
      },
    });
  } catch (err) {
    console.warn('[AuditLog] Could not log staff action to DB:', err);
  }
}
