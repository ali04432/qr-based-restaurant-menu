import { Router } from 'express';
import healthRouter from './health.routes';
import authRouter from './auth.routes';
import menuRouter from './menu.routes';
import orderRouter from './order.routes';

// ============================================================
// API Route Aggregator
// Mount all sub-routers here, prefixed under /api
// ============================================================

const router = Router();

// ── Health check — no auth required
router.use('/health', healthRouter);

// ── Phase 2 routes
router.use('/auth', authRouter);   // POST /api/auth/register, /login, GET /api/auth/me
router.use('/menu', menuRouter);   // GET /api/menu/categories, /items, /items/:id
router.use('/orders', orderRouter); // POST /api/orders, GET /api/orders/:id, PATCH /:id/status

// ── Phase 3+ routes (stubs — uncomment as phases are implemented)
// router.use('/restaurants', restaurantRouter);
// router.use('/tables', tableRouter);
// router.use('/staff', staffRouter);

export default router;
