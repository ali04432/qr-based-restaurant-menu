import { Router, Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/auth/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { loginSchema, createUserSchema } from '@qr-menu/shared';
import { sendSuccess, sendCreated } from '../utils/api-response';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { logAuditEvent } from '../utils/audit';

// ============================================================
// Authentication Routes
// POST /api/auth/register — create a new staff user
// POST /api/auth/login    — authenticate and get JWT
// GET  /api/auth/me       — get current authenticated user
// ============================================================

const router = Router();

/**
 * POST /api/auth/register
 * Register a new staff user account.
 * Body: { restaurantId?, name, email, password, role }
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
  }

  try {
    const user = await registerUser(parsed.data);
    return sendCreated(res, user, 'User registered successfully');
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email + password. Returns user + JWT access token.
 * Body: { email, password }
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
  }

  const clientIp = ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '')
    .split(',')[0]
    .trim() || null;

  try {
    const result = await loginUser(parsed.data);

    await logAuditEvent({
      restaurantId: result.user.restaurantId,
      userId: result.user.id,
      userEmail: result.user.email,
      userRole: result.user.role,
      action: 'LOGIN_SUCCESS',
      entity: 'AUTH',
      entityId: result.user.id,
      details: `User ${result.user.name} (${result.user.role}) authenticated successfully`,
      ipAddress: clientIp,
    });

    return sendSuccess(res, result, { message: 'Login successful' });
  } catch (err) {
    await logAuditEvent({
      userEmail: parsed.data.email,
      action: 'LOGIN_FAILED',
      entity: 'AUTH',
      details: `Failed authentication attempt for email: ${parsed.data.email}`,
      ipAddress: clientIp,
    });

    return next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Requires: Authorization: Bearer <token>
 */
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        restaurantId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, user);
  } catch (err) {
    return next(err);
  }
});

export default router;
