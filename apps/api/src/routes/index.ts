import { Router } from 'express';
import healthRouter from './health.routes';

// ============================================================
// API Route Aggregator
// Mount all sub-routers here, prefixed under /api
// ============================================================

const router = Router();

// Health check — no auth required
router.use('/health', healthRouter);

// ── Phase 2+ routes (stubs — uncomment as phases are implemented)
// router.use('/auth', authRouter);
// router.use('/restaurants', restaurantRouter);
// router.use('/tables', tableRouter);
// router.use('/menu', menuRouter);
// router.use('/orders', orderRouter);
// router.use('/staff', staffRouter);

export default router;
