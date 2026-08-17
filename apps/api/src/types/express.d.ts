import { Request } from 'express';
import { SafeUser } from '@qr-menu/shared';

// ============================================================
// Express Request Type Augmentation
// Attaches the authenticated user to the request object
// after JWT verification in authMiddleware.
// ============================================================

declare global {
  namespace Express {
    interface Request {
      /** Populated by authMiddleware after JWT verification */
      user?: SafeUser;
    }
  }
}

export {};
