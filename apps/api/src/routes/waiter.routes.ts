import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated } from '../utils/api-response';
import { AppError } from '../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { emitToRestaurant } from '../socket/socket.server';
import { SOCKET_EVENTS } from '../socket/events';
import { logStaffAction } from '../utils/audit';
import {
  walkInOrderSchema,
  addItemsToOrderSchema,
  transferTableSchema,
  customerRequestSchema,
  resolveCustomerRequestSchema,
  operationalAiQuerySchema,
} from '@qr-menu/shared';

// ============================================================
// Phase 5: Waiter Operations API Router
// Role-enforced: WAITER, MANAGER, ADMIN, SUPER_ADMIN
// ============================================================

const router = Router();

// Apply auth & role checks across all waiter routes
router.use(
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.WAITER
  )
);

/** Helper to extract effective restaurantId */
function getRestaurantId(req: AuthenticatedRequest): string {
  const restId =
    req.user?.role === UserRole.SUPER_ADMIN
      ? (req.query.restaurantId as string) || req.user?.restaurantId
      : req.user?.restaurantId;

  if (!restId) {
    throw new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR');
  }
  return restId;
}

/**
 * GET /api/waiter/summary
 * Live operational KPIs for Waiter Dashboard
 */
router.get('/summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayOrders, tables] = await Promise.all([
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: todayStart },
        },
        select: {
          id: true,
          status: true,
          total: true,
          paymentStatus: true,
        },
      }),
      prisma.table.findMany({
        where: { restaurantId, isActive: true },
        select: { id: true, status: true },
      }),
    ]);

    const totalOrders = todayOrders.length;
    const servedOrders = todayOrders.filter((o) => ['SERVED', 'COMPLETED'].includes(o.status)).length;
    const pendingOrders = todayOrders.filter((o) =>
      ['PENDING', 'RECEIVED', 'PREPARING', 'COOKING', 'IN_KITCHEN', 'READY'].includes(o.status)
    ).length;
    const todaySales = todayOrders
      .filter((o) => o.paymentStatus === 'COMPLETED')
      .reduce((sum, o) => sum + o.total, 0);

    const activeTables = tables.filter((t) => t.status === 'OCCUPIED').length;

    return sendSuccess(res, {
      totalOrders,
      servedOrders,
      pendingOrders,
      todaySales: parseFloat(todaySales.toFixed(2)),
      activeTables,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/waiter/tables
 * List all dining tables with active orders and computed operational status
 */
router.get('/tables', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);

    const [tables, activeOrders] = await Promise.all([
      prisma.table.findMany({
        where: { restaurantId, isActive: true },
        orderBy: { tableNumber: 'asc' },
      }),
      prisma.order.findMany({
        where: {
          restaurantId,
          status: { in: ['PENDING', 'RECEIVED', 'PREPARING', 'COOKING', 'IN_KITCHEN', 'READY', 'SERVED'] },
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedTables = tables.map((t) => {
      const tableOrders = activeOrders.filter((o) => o.tableId === t.id);
      const hasReady = tableOrders.some((o) => o.status === 'READY');
      const hasPreparing = tableOrders.some((o) =>
        ['PREPARING', 'COOKING', 'IN_KITCHEN'].includes(o.status)
      );

      let computedStatus = t.status as string;
      if (hasReady) computedStatus = 'READY_TO_SERVE';
      else if (hasPreparing) computedStatus = 'PREPARING';
      else if (tableOrders.length > 0 && t.status === 'AVAILABLE') computedStatus = 'OCCUPIED';

      const oldestOrder = tableOrders[tableOrders.length - 1];
      const elapsedMinutes = oldestOrder
        ? Math.max(0, Math.floor((Date.now() - new Date(oldestOrder.createdAt).getTime()) / 60000))
        : 0;

      const totalAmount = tableOrders.reduce((sum, o) => sum + o.total, 0);

      return {
        id: t.id,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        status: computedStatus,
        activeOrdersCount: tableOrders.length,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        elapsedMinutes,
        openedAt: oldestOrder?.createdAt.toISOString(),
        activeOrders: tableOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          total: o.total,
          itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
          createdAt: o.createdAt.toISOString(),
          items: o.items.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
            specialInstructions: i.specialInstructions,
          })),
        })),
      };
    });

    return sendSuccess(res, formattedTables);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/waiter/tables/:id
 * Detailed table view with current active orders and history
 */
router.get('/tables/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const table = await prisma.table.findFirst({
      where: { id, restaurantId },
      include: {
        orders: {
          where: {
            status: { notIn: ['CANCELLED'] },
          },
          include: { items: true, payments: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        customerRequests: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!table) {
      return next(new AppError('Table not found', 404, 'NOT_FOUND'));
    }

    const activeOrders = table.orders.filter((o) =>
      ['PENDING', 'RECEIVED', 'PREPARING', 'COOKING', 'IN_KITCHEN', 'READY', 'SERVED'].includes(o.status)
    );

    return sendSuccess(res, {
      ...table,
      activeOrders,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/waiter/tables/:id/open
 * Mark table as OCCUPIED
 */
router.post('/tables/:id/open', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const table = await prisma.table.findFirst({ where: { id, restaurantId } });
    if (!table) return next(new AppError('Table not found', 404, 'NOT_FOUND'));

    const updated = await prisma.table.update({
      where: { id },
      data: { status: 'OCCUPIED' },
    });

    await logStaffAction(
      restaurantId,
      req.user!.id,
      'TABLE_OCCUPIED',
      `Table ${table.tableNumber} opened/seated by waiter ${req.user!.name}`
    );

    emitToRestaurant(restaurantId, SOCKET_EVENTS.TABLE_UPDATED, updated);

    return sendSuccess(res, updated, { message: `Table ${table.tableNumber} is now occupied` });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/waiter/tables/:id/close
 * Mark table as AVAILABLE after guests depart
 */
router.post('/tables/:id/close', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const table = await prisma.table.findFirst({ where: { id, restaurantId } });
    if (!table) return next(new AppError('Table not found', 404, 'NOT_FOUND'));

    const updated = await prisma.table.update({
      where: { id },
      data: { status: 'AVAILABLE' },
    });

    await logStaffAction(
      restaurantId,
      req.user!.id,
      'TABLE_CLOSED',
      `Table ${table.tableNumber} closed/cleared by waiter ${req.user!.name}`
    );

    emitToRestaurant(restaurantId, SOCKET_EVENTS.TABLE_UPDATED, updated);

    return sendSuccess(res, updated, { message: `Table ${table.tableNumber} is now available` });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/waiter/tables/:id/transfer
 * Transfer all active orders from one table to another
 */
router.post('/tables/:id/transfer', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const sourceTableId = req.params.id;

    const parsed = transferTableSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
    }

    const { targetTableId } = parsed.data;

    const [sourceTable, targetTable] = await Promise.all([
      prisma.table.findFirst({ where: { id: sourceTableId, restaurantId } }),
      prisma.table.findFirst({ where: { id: targetTableId, restaurantId } }),
    ]);

    if (!sourceTable || !targetTable) {
      return next(new AppError('One or both tables could not be found', 404, 'NOT_FOUND'));
    }

    // Move orders in atomic transaction
    await prisma.$transaction([
      prisma.order.updateMany({
        where: {
          tableId: sourceTableId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        data: { tableId: targetTableId },
      }),
      prisma.table.update({
        where: { id: sourceTableId },
        data: { status: 'AVAILABLE' },
      }),
      prisma.table.update({
        where: { id: targetTableId },
        data: { status: 'OCCUPIED' },
      }),
    ]);

    await logStaffAction(
      restaurantId,
      req.user!.id,
      'TABLE_TRANSFERRED',
      `Orders transferred from Table ${sourceTable.tableNumber} to Table ${targetTable.tableNumber}`
    );

    emitToRestaurant(restaurantId, SOCKET_EVENTS.TABLE_UPDATED, {
      sourceTableId,
      targetTableId,
    });

    return sendSuccess(res, { sourceTableId, targetTableId }, {
      message: `Orders transferred to Table ${targetTable.tableNumber}`,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/waiter/tables/:id/request-bill
 * Waiter requests the bill for a table on behalf of guest
 */
router.post('/tables/:id/request-bill', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const table = await prisma.table.findFirst({ where: { id, restaurantId } });
    if (!table) return next(new AppError('Table not found', 404, 'NOT_FOUND'));

    // Create a customer request for bill
    const request = await prisma.customerRequest.create({
      data: {
        restaurantId,
        tableId: id,
        type: 'BILL_REQUEST',
        message: `Bill requested for Table ${table.tableNumber}`,
        status: 'PENDING',
      },
    });

    emitToRestaurant(restaurantId, SOCKET_EVENTS.TABLE_REQUESTED_BILL, {
      tableId: id,
      tableNumber: table.tableNumber,
      requestId: request.id,
    });

    await logStaffAction(
      restaurantId,
      req.user!.id,
      'BILL_REQUESTED',
      `Bill requested for Table ${table.tableNumber}`
    );

    return sendSuccess(res, request, { message: `Bill request sent for Table ${table.tableNumber}` });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/waiter/orders/walk-in
 * Create a new walk-in order directly from the waiter panel
 */
router.post('/orders/walk-in', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const parsed = walkInOrderSchema.safeParse({ ...req.body, restaurantId });

    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
    }

    const { tableId, customerName, customerPhone, items, notes } = parsed.data;

    const table = await prisma.table.findFirst({ where: { id: tableId, restaurantId } });
    if (!table) return next(new AppError('Table not found', 404, 'NOT_FOUND'));

    const menuItemIds = items.map((i) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId },
    });

    const itemMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    for (const reqItem of items) {
      const dbItem = itemMap.get(reqItem.menuItemId);
      if (!dbItem) {
        return next(new AppError(`Menu item ${reqItem.menuItemId} not found`, 404, 'NOT_FOUND'));
      }
      if (!dbItem.isAvailable) {
        return next(new AppError(`"${dbItem.name}" is currently unavailable`, 400, 'ITEM_UNAVAILABLE'));
      }
      if (dbItem.stockCount !== null && dbItem.stockCount < reqItem.quantity) {
        return next(
          new AppError(`Insufficient stock for "${dbItem.name}". Only ${dbItem.stockCount} left`, 400, 'INSUFFICIENT_STOCK')
        );
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItemsData = items.map((reqItem) => {
      const dbItem = itemMap.get(reqItem.menuItemId)!;
      const itemSubtotal = dbItem.price * reqItem.quantity;
      subtotal += itemSubtotal;
      return {
        menuItemId: dbItem.id,
        name: dbItem.name,
        quantity: reqItem.quantity,
        unitPrice: dbItem.price,
        costPriceAtOrder: dbItem.costPrice ?? 0,
        subtotal: itemSubtotal,
        specialInstructions: reqItem.specialInstructions ?? null,
      };
    });

    const TAX_RATE = 0.08;
    const SERVICE_CHARGE = 5.0;
    const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
    const total = parseFloat((subtotal + tax + SERVICE_CHARGE).toFixed(2));

    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          restaurantId,
          tableId,
          orderNumber,
          status: 'RECEIVED',
          subtotal,
          tax,
          serviceCharge: SERVICE_CHARGE,
          total,
          customerNote: notes ? `${customerName ? `[${customerName}] ` : ''}${notes}` : customerName || null,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true, table: true },
      });

      // Decrement inventory
      for (const item of items) {
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: {
            stockCount: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Mark table occupied
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });

      return order;
    });

    await logStaffAction(
      restaurantId,
      req.user!.id,
      'ORDER_CREATED',
      `Walk-in Order #${newOrder.orderNumber} placed for Table ${table.tableNumber} (Total: Rs. ${newOrder.total})`
    );

    emitToRestaurant(restaurantId, SOCKET_EVENTS.ORDER_CREATED, newOrder);

    return sendCreated(res, newOrder, `Order #${newOrder.orderNumber} created successfully`);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/waiter/orders/:id/add-items
 * Add extra dishes to an existing order
 */
router.post('/orders/:id/add-items', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const parsed = addItemsToOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
    }

    const { items } = parsed.data;

    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
      include: { table: true },
    });

    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    const menuItemIds = items.map((i) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId },
    });

    const itemMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    let addedSubtotal = 0;
    const itemsToCreate = items.map((reqItem) => {
      const dbItem = itemMap.get(reqItem.menuItemId)!;
      const itemSubtotal = dbItem.price * reqItem.quantity;
      addedSubtotal += itemSubtotal;
      return {
        orderId: id,
        menuItemId: dbItem.id,
        name: dbItem.name,
        quantity: reqItem.quantity,
        unitPrice: dbItem.price,
        costPriceAtOrder: dbItem.costPrice ?? 0,
        subtotal: itemSubtotal,
        specialInstructions: reqItem.specialInstructions ?? null,
      };
    });

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.orderItem.createMany({ data: itemsToCreate });

      const newSubtotal = order.subtotal + addedSubtotal;
      const newTax = parseFloat((newSubtotal * 0.08).toFixed(2));
      const newTotal = parseFloat((newSubtotal + newTax + order.serviceCharge - order.discount).toFixed(2));

      // Decrement stock
      for (const item of items) {
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stockCount: { decrement: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          subtotal: newSubtotal,
          tax: newTax,
          total: newTotal,
        },
        include: { items: true, table: true },
      });
    });

    await logStaffAction(
      restaurantId,
      req.user!.id,
      'ORDER_UPDATED',
      `Added ${items.length} items to Order #${order.orderNumber}`
    );

    emitToRestaurant(restaurantId, SOCKET_EVENTS.ORDER_UPDATED, updatedOrder);

    return sendSuccess(res, updatedOrder, { message: 'Items added to order' });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/waiter/orders
 * Filterable orders list for Waiter Orders page
 */
router.get('/orders', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { status, tableId, search, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {
      restaurantId,
      ...(status && status !== 'ALL' && { status: status as any }),
      ...(tableId && { tableId }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { table: { tableNumber: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: { items: true, table: { select: { tableNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    const formatted = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      tableId: o.tableId,
      tableNumber: o.table?.tableNumber || '01',
      status: o.status,
      total: o.total,
      paymentStatus: o.paymentStatus,
      customerNote: o.customerNote,
      itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
      items: o.items,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));

    return sendSuccess(res, formatted);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/waiter/orders/:id
 * Full single order timeline and details
 */
router.get('/orders/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
      include: {
        items: true,
        table: true,
        payments: true,
      },
    });

    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    return sendSuccess(res, order);
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/waiter/orders/:id/status
 * Update status with state validation
 */
router.patch('/orders/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'VALIDATION_ERROR'));
    }

    const order = await prisma.order.findFirst({ where: { id, restaurantId }, include: { table: true } });
    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    const updated = await prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: { items: true, table: true },
    });

    await logStaffAction(
      restaurantId,
      req.user!.id,
      `ORDER_${status}`,
      `Order #${order.orderNumber} status changed to ${status}`
    );

    emitToRestaurant(restaurantId, SOCKET_EVENTS.ORDER_STATUS_CHANGED, updated);

    return sendSuccess(res, updated, { message: `Order #${order.orderNumber} status updated to ${status}` });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/waiter/orders/:id/serve
 * Fast action: Waiter marks order as SERVED
 */
router.patch('/orders/:id/serve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const order = await prisma.order.findFirst({ where: { id, restaurantId }, include: { table: true } });
    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'SERVED' as any },
      include: { items: true, table: true },
    });

    await logStaffAction(
      restaurantId,
      req.user!.id,
      'ORDER_SERVED',
      `Order #${order.orderNumber} served to Table ${order.table?.tableNumber || order.tableId}`
    );

    emitToRestaurant(restaurantId, SOCKET_EVENTS.ORDER_STATUS_CHANGED, updated);

    return sendSuccess(res, updated, { message: `Order #${order.orderNumber} served` });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/waiter/requests
 * Live list of customer requests (Water, Extra Plates, Call Waiter, etc.)
 */
router.get('/requests', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);

    const requests = await prisma.customerRequest.findMany({
      where: {
        restaurantId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        table: { select: { tableNumber: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = requests.map((r) => ({
      id: r.id,
      restaurantId: r.restaurantId,
      tableId: r.tableId,
      tableNumber: r.table.tableNumber,
      type: r.type,
      message: r.message,
      status: r.status,
      assignedToName: r.assignedTo?.name || null,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() || null,
    }));

    return sendSuccess(res, formatted);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/waiter/requests
 * Create a customer assistance request
 */
router.post('/requests', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const parsed = customerRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
    }

    const { tableId, type, message } = parsed.data;

    const table = await prisma.table.findFirst({ where: { id: tableId, restaurantId } });
    if (!table) return next(new AppError('Table not found', 404, 'NOT_FOUND'));

    const created = await prisma.customerRequest.create({
      data: {
        restaurantId,
        tableId,
        type,
        message,
        status: 'PENDING',
      },
      include: { table: true },
    });

    emitToRestaurant(restaurantId, SOCKET_EVENTS.CUSTOMER_REQUEST_CREATED, {
      ...created,
      tableNumber: table.tableNumber,
    });

    return sendCreated(res, created, `Request logged for Table ${table.tableNumber}`);
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/waiter/requests/:id/resolve
 * Mark a customer request as resolved or accepted
 */
router.patch('/requests/:id/resolve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const parsed = resolveCustomerRequestSchema.safeParse(req.body);
    const status = parsed.success ? parsed.data.status : 'RESOLVED';

    const request = await prisma.customerRequest.findFirst({
      where: { id, restaurantId },
      include: { table: true },
    });

    if (!request) return next(new AppError('Request not found', 404, 'NOT_FOUND'));

    const updated = await prisma.customerRequest.update({
      where: { id },
      data: {
        status: status as any,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
        assignedToId: req.user!.id,
      },
      include: { table: true },
    });

    await logStaffAction(
      restaurantId,
      req.user!.id,
      'CUSTOMER_REQUEST_RESOLVED',
      `Request (${request.type}) for Table ${request.table.tableNumber} marked as ${status}`
    );

    emitToRestaurant(restaurantId, SOCKET_EVENTS.CUSTOMER_REQUEST_RESOLVED, updated);

    return sendSuccess(res, updated, { message: 'Customer request resolved' });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/waiter/ai/query
 * Operational AI assistant using live restaurant database state
 */
router.post('/ai/query', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const parsed = operationalAiQuerySchema.safeParse({ ...req.body, role: 'WAITER' });

    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
    }

    const { query } = parsed.data;
    const lower = query.toLowerCase();

    // Fetch live operational snapshot
    const [tables, readyOrders, pendingRequests] = await Promise.all([
      prisma.table.findMany({
        where: { restaurantId, isActive: true },
        include: {
          orders: {
            where: { status: { in: ['PENDING', 'PREPARING', 'READY'] } },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.order.findMany({
        where: { restaurantId, status: 'READY' as any },
        include: { table: true, items: true },
      }),
      prisma.customerRequest.findMany({
        where: { restaurantId, status: 'PENDING' },
        include: { table: true },
      }),
    ]);

    let answer = '';
    let suggestions: string[] = [
      'Which tables are waiting longest?',
      'Which orders are ready?',
      'Show pending customer requests',
      'How many tables are available?',
    ];

    if (lower.includes('waiting') || lower.includes('longest') || lower.includes('wait time')) {
      const occupiedTables = tables
        .filter((t) => t.orders.length > 0)
        .map((t) => {
          const waitMin = Math.floor((Date.now() - new Date(t.orders[0].createdAt).getTime()) / 60000);
          return { tableNumber: t.tableNumber, waitMin, orderNumber: t.orders[0].orderNumber };
        })
        .sort((a, b) => b.waitMin - a.waitMin);

      if (occupiedTables.length === 0) {
        answer = 'No guests are currently waiting for orders. All seated tables have been served.';
      } else {
        const top = occupiedTables[0];
        answer = `Table ${top.tableNumber} has been waiting the longest (${top.waitMin} minutes) for Order #${top.orderNumber}.`;
        if (occupiedTables.length > 1) {
          answer += ` Followed by Table ${occupiedTables[1].tableNumber} (${occupiedTables[1].waitMin} min).`;
        }
      }
    } else if (lower.includes('ready') || lower.includes('deliver') || lower.includes('serve')) {
      if (readyOrders.length === 0) {
        answer = 'There are currently no orders waiting in the pass. All ready orders have been delivered to tables.';
      } else {
        answer = `There are ${readyOrders.length} order(s) ready to serve: ${readyOrders
          .map((o) => `Order #${o.orderNumber} for Table ${o.table?.tableNumber || o.tableId}`)
          .join(', ')}.`;
      }
    } else if (lower.includes('request') || lower.includes('call') || lower.includes('assistance') || lower.includes('water')) {
      if (pendingRequests.length === 0) {
        answer = 'All customer assistance calls and requests are currently resolved.';
      } else {
        answer = `There are ${pendingRequests.length} pending request(s): ${pendingRequests
          .map((r) => `Table ${r.table.tableNumber} (${r.type})`)
          .join(', ')}.`;
      }
    } else if (lower.includes('table') || lower.includes('available') || lower.includes('capacity')) {
      const available = tables.filter((t) => t.status === 'AVAILABLE').length;
      const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
      answer = `You currently have ${available} available table(s) and ${occupied} occupied table(s) out of ${tables.length} total tables.`;
    } else {
      answer = `Currently you have ${readyOrders.length} order(s) ready to serve, ${pendingRequests.length} customer request(s) waiting, and ${tables.filter((t) => t.status === 'OCCUPIED').length} active tables.`;
    }

    return sendSuccess(res, {
      question: query,
      answer,
      suggestions,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
