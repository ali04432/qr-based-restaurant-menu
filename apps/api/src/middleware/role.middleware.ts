import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@qr-menu/shared';
import { errors } from './error.middleware';

// ============================================================
// Role-Based Access Control Middleware
// Must be used AFTER authMiddleware (requires req.user).
// ============================================================

/**
 * Creates middleware that restricts access to users with one of the specified roles.
 *
 * @example
 * router.delete('/restaurant/:id', authMiddleware, requireRole(UserRole.SUPER_ADMIN), handler)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(errors.unauthorized());
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return next(
        errors.forbidden(
          `This action requires one of the following roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

/**
 * Middleware that verifies the authenticated user belongs to the specified restaurant.
 * SUPER_ADMINs bypass this check and can access any restaurant's data.
 */
export function requireRestaurantAccess(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(errors.unauthorized());
  }

  // SUPER_ADMIN has cross-tenant access
  if (req.user.role === UserRole.SUPER_ADMIN) {
    return next();
  }

  const restaurantId = req.params.restaurantId ?? req.body?.restaurantId;

  if (restaurantId && req.user.restaurantId !== restaurantId) {
    return next(errors.forbidden('You do not have access to this restaurant'));
  }

  next();
}
