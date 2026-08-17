import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';
import { errors } from './error.middleware';

// ============================================================
// JWT Authentication Middleware
// Extracts the Bearer token from the Authorization header,
// verifies it, and attaches the decoded payload to req.user.
// ============================================================

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(errors.unauthorized('Missing or malformed Authorization header'));
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  const payload = verifyToken(token);
  if (!payload) {
    return next(errors.unauthorized('Invalid or expired token'));
  }

  // Attach the decoded user context to the request
  req.user = {
    id: payload.sub,
    restaurantId: payload.restaurantId,
    name: '',           // Not stored in JWT — fetch from DB when name is needed
    email: payload.email,
    role: payload.role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  next();
}
