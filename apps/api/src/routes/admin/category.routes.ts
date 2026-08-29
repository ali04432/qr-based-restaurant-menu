import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { createCategorySchema, updateCategorySchema } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';

const router = Router();

/**
 * GET /api/admin/categories
 * List all categories with item count and active status.
 */
router.get(
  '/',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
    UserRole.CASHIER
  ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const categories = await prisma.menuCategory.findMany({
        where: { restaurantId },
        include: {
          _count: { select: { menuItems: true } },
        },
        orderBy: { order: 'asc' },
      });

      const formatted = categories.map((c) => ({
        id: c.id,
        restaurantId: c.restaurantId,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        order: c.order,
        isActive: c.isActive,
        itemCount: c._count.menuItems,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }));

      return sendSuccess(res, formatted);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/categories
 * Create a new menu category.
 */
router.post(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }

      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? parsed.data.restaurantId || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const slug =
        parsed.data.slug ||
        parsed.data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      // Check duplicate slug in restaurant
      const existing = await prisma.menuCategory.findFirst({
        where: { restaurantId, slug },
      });

      if (existing) {
        return next(new AppError(`Category slug "${slug}" already exists`, 409, 'CONFLICT'));
      }

      const category = await prisma.menuCategory.create({
        data: {
          restaurantId,
          name: parsed.data.name,
          slug,
          description: parsed.data.description || null,
          image: parsed.data.image || null,
          order: parsed.data.order,
          isActive: parsed.data.isActive,
        },
      });

      if (req.user?.id) {
        await logStaffAction(restaurantId, req.user.id, 'CATEGORY_CREATED', `Category "${category.name}" created`);
      }

      return sendCreated(res, category, 'Category created successfully');
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/categories/reorder
 * Bulk reorder categories.
 */
router.patch(
  '/reorder',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { items } = req.body as { items: Array<{ id: string; order: number }> };
      if (!Array.isArray(items)) {
        return next(new AppError('Items array is required', 400, 'VALIDATION_ERROR'));
      }

      await prisma.$transaction(
        items.map((item) =>
          prisma.menuCategory.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );

      return sendSuccess(res, { success: true }, { message: 'Categories reordered successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/categories/:id
 * Update category details.
 */
router.patch(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parsed = updateCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }

      const category = await prisma.menuCategory.findUnique({ where: { id } });
      if (!category) {
        return next(new AppError('Category not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && category.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      const updated = await prisma.menuCategory.update({
        where: { id },
        data: parsed.data,
      });

      if (req.user?.id) {
        await logStaffAction(category.restaurantId, req.user.id, 'CATEGORY_UPDATED', `Category "${updated.name}" updated`);
      }

      return sendSuccess(res, updated, { message: 'Category updated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/admin/categories/:id
 * Safe delete category if no menu items are linked.
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const category = await prisma.menuCategory.findUnique({
        where: { id },
        include: { _count: { select: { menuItems: true } } },
      });

      if (!category) {
        return next(new AppError('Category not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && category.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      if (category._count.menuItems > 0) {
        return next(
          new AppError(
            `Cannot delete category "${category.name}" because it contains ${category._count.menuItems} menu item(s). Please move or delete those items first.`,
            400,
            'DEPENDENCY_EXISTS'
          )
        );
      }

      await prisma.menuCategory.delete({ where: { id } });

      if (req.user?.id) {
        await logStaffAction(category.restaurantId, req.user.id, 'CATEGORY_DELETED', `Category "${category.name}" deleted`);
      }

      return sendSuccess(res, { id }, { message: `Category "${category.name}" deleted successfully` });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
