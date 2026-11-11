import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../middleware/error.middleware';

const router = Router();

/**
 * GET /api/tables/validate
 * Public endpoint to validate a table when a customer scans a QR code.
 * Accepts: restaurantId (UUID or slug), table (tableNumber, padded/unpadded, UUID, or qrToken), token
 */
router.get('/validate', async (req: Request, res: Response, next: NextFunction) => {
  const { restaurantId, restaurant: restaurantParam, table: tableParam, token: tokenParam } = req.query as {
    restaurantId?: string;
    restaurant?: string;
    table?: string;
    token?: string;
  };

  const rawRest = restaurantId || restaurantParam;

  if (!rawRest && (!tableParam && !tokenParam)) {
    return next(
      new AppError(
        'restaurantId and table identifier (or token) are required',
        400,
        'VALIDATION_ERROR'
      )
    );
  }

  try {
    // 1. Authoritative Restaurant Resolution (supports UUID, slug, or single-tenant default)
    let restaurant = rawRest
      ? await prisma.restaurant.findFirst({
          where: {
            OR: [{ id: rawRest }, { slug: rawRest }],
          },
        })
      : null;

    if (!restaurant) {
      restaurant = await prisma.restaurant.findFirst({
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!restaurant) {
      return next(new AppError('Restaurant not found.', 404, 'RESTAURANT_NOT_FOUND'));
    }

    const resolvedRestaurantId = restaurant.id;

    // 2. Multi-format Table Resolution
    const orConditions: any[] = [];
    if (tableParam) {
      const trimmed = String(tableParam).trim();
      const stripped = trimmed.replace(/^(t-|table-)/i, '');
      const padded = stripped.padStart(2, '0');
      const unpadded = stripped.replace(/^0+/, '') || stripped;

      orConditions.push({ id: trimmed });
      orConditions.push({ tableNumber: trimmed });
      orConditions.push({ tableNumber: stripped });
      orConditions.push({ tableNumber: padded });
      orConditions.push({ tableNumber: unpadded });
      orConditions.push({ qrToken: trimmed });
    }
    if (tokenParam) {
      orConditions.push({ qrToken: String(tokenParam).trim() });
    }

    const table = await prisma.table.findFirst({
      where: {
        restaurantId: resolvedRestaurantId,
        OR: orConditions,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            currency: true,
            isOpen: true,
          },
        },
      },
    });

    if (!table) {
      return next(
        new AppError(
          'This table QR code could not be verified for this restaurant.',
          404,
          'TABLE_NOT_FOUND'
        )
      );
    }

    if (!table.isActive) {
      return next(
        new AppError(
          `Table ${table.tableNumber} is currently not accepting new orders. Please ask a staff member.`,
          400,
          'TABLE_INACTIVE'
        )
      );
    }

    return sendSuccess(res, {
      valid: true,
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: table.status,
        isActive: table.isActive,
        qrToken: table.qrToken,
      },
      restaurant: table.restaurant,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/tables/:id
 * Public table lookup by ID or tableNumber.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { restaurantId } = req.query as { restaurantId?: string };

  try {
    const trimmed = String(id).trim();
    const stripped = trimmed.replace(/^(t-|table-)/i, '');
    const padded = stripped.padStart(2, '0');
    const unpadded = stripped.replace(/^0+/, '') || stripped;

    const whereClause: any = {
      OR: [
        { id: trimmed },
        { tableNumber: trimmed },
        { tableNumber: stripped },
        { tableNumber: padded },
        { tableNumber: unpadded },
        { qrToken: trimmed },
      ],
    };

    if (restaurantId) {
      // Resolve restaurant if passed as slug or id
      const rest = await prisma.restaurant.findFirst({
        where: { OR: [{ id: restaurantId }, { slug: restaurantId }] },
      });
      if (rest) {
        whereClause.restaurantId = rest.id;
      } else {
        whereClause.restaurantId = restaurantId;
      }
    }

    const table = await prisma.table.findFirst({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            currency: true,
            isOpen: true,
          },
        },
      },
    });

    if (!table) {
      return next(new AppError('Table not found', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, {
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status,
      isActive: table.isActive,
      restaurant: table.restaurant,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
