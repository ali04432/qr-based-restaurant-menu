import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../middleware/error.middleware';

const router = Router();

/**
 * GET /api/tables/validate
 * Public endpoint to validate a table when a customer scans a QR code.
 * Accepts: restaurantId, table (can be tableNumber, UUID, or qrToken)
 */
router.get('/validate', async (req: Request, res: Response, next: NextFunction) => {
  const { restaurantId, table: tableParam, token: tokenParam } = req.query as {
    restaurantId?: string;
    table?: string;
    token?: string;
  };

  if (!restaurantId || (!tableParam && !tokenParam)) {
    return next(
      new AppError(
        'restaurantId and table identifier (or token) are required',
        400,
        'VALIDATION_ERROR'
      )
    );
  }

  try {
    const orConditions: any[] = [];
    if (tableParam) {
      orConditions.push({ id: tableParam });
      orConditions.push({ tableNumber: tableParam });
      orConditions.push({ qrToken: tableParam });
      orConditions.push({ tableNumber: tableParam.replace(/^t-/, '') });
    }
    if (tokenParam) {
      orConditions.push({ qrToken: tokenParam });
    }

    const table = await prisma.table.findFirst({
      where: {
        restaurantId,
        OR: orConditions,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
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
    const whereClause: any = {
      OR: [
        { id },
        { tableNumber: id },
        { qrToken: id },
        { tableNumber: id.replace(/^t-/, '') },
      ],
    };

    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }

    const table = await prisma.table.findFirst({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
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
