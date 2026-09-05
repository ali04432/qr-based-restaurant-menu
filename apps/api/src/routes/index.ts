import { Router } from 'express';
import healthRouter from './health.routes';
import authRouter from './auth.routes';
import menuRouter from './menu.routes';
import orderRouter from './order.routes';
import loyaltyRouter from './loyalty.routes';

// Admin Routers (Phase 3 & Phase 4)
import adminDashboardRouter from './admin/dashboard.routes';
import adminOrderRouter from './admin/order.routes';
import adminKitchenRouter from './admin/kitchen.routes';
import adminWaiterRouter from './admin/waiter.routes';
import adminTableRouter from './admin/table.routes';
import adminCategoryRouter from './admin/category.routes';
import adminMenuRouter from './admin/menu.routes';
import adminInventoryRouter from './admin/inventory.routes';
import adminStaffRouter from './admin/staff.routes';
import adminPaymentRouter from './admin/payment.routes';
import adminAnalyticsRouter from './admin/analytics.routes';
import adminReportRouter from './admin/report.routes';
import adminFeedbackRouter from './admin/feedback.routes';
import adminPromotionRouter from './admin/promotion.routes';
import adminNotificationRouter from './admin/notification.routes';
import adminAiRouter from './admin/ai.routes';
import adminSettingsRouter from './admin/settings.routes';
import adminLoyaltyRouter from './admin/loyalty.routes';
import adminRewardRouter from './admin/reward.routes';
import adminIntegrationRouter from './admin/integration.routes';
import adminScheduledReportRouter from './admin/scheduled-report.routes';
import adminJobsRouter from './admin/jobs.routes';
import adminBranchRouter from './admin/branch.routes';

// ============================================================
// API Route Aggregator
// Mount all sub-routers here, prefixed under /api
// ============================================================

const router = Router();

// ── Health check — no auth required
router.use('/health', healthRouter);

// ── Customer facing routes
router.use('/auth', authRouter);           // POST /api/auth/register, /login, GET /api/auth/me
router.use('/menu', menuRouter);           // GET /api/menu/categories, /items, /items/:id
router.use('/orders', orderRouter);        // POST /api/orders, GET /api/orders/:id, PATCH /:id/status
router.use('/feedback', adminFeedbackRouter); // POST /api/feedback (customer feedback)
router.use('/promotions', adminPromotionRouter); // POST /api/promotions/validate (customer discount validation)
router.use('/loyalty', loyaltyRouter);     // GET /api/loyalty/account, POST /register, GET /rewards, POST /redeem

// ── Admin Operating System routes
router.use('/admin/dashboard', adminDashboardRouter);
router.use('/admin/orders', adminOrderRouter);
router.use('/admin/kitchen', adminKitchenRouter);
router.use('/admin/waiter', adminWaiterRouter);
router.use('/admin/tables', adminTableRouter);
router.use('/admin/categories', adminCategoryRouter);
router.use('/admin/menu', adminMenuRouter);
router.use('/admin/inventory', adminInventoryRouter);
router.use('/admin/staff', adminStaffRouter);
router.use('/admin/payments', adminPaymentRouter);
router.use('/admin/analytics', adminAnalyticsRouter);
router.use('/admin/reports', adminReportRouter);
router.use('/admin/feedback', adminFeedbackRouter);
router.use('/admin/promotions', adminPromotionRouter);
router.use('/admin/notifications', adminNotificationRouter);
router.use('/admin/ai', adminAiRouter);
router.use('/admin/settings', adminSettingsRouter);
router.use('/admin/loyalty', adminLoyaltyRouter);
router.use('/admin/rewards', adminRewardRouter);
router.use('/admin/integrations', adminIntegrationRouter);
router.use('/admin/scheduled-reports', adminScheduledReportRouter); // REQ-15: Scheduled report management
router.use('/admin/jobs', adminJobsRouter);                         // REQ-16: Background job queue & monitoring
router.use('/admin/branches', adminBranchRouter);                 // REQ-17: Multi-branch & location management

export default router;
