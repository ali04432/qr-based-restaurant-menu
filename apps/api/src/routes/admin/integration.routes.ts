import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { requireEntitlement } from '../../middleware/entitlement.middleware';
import { UserRole, ProviderType } from '@qr-menu/shared';
import { WhatsAppService } from '../../services/integrations/whatsapp.service';
import { SMSService } from '../../services/integrations/sms.service';
import { EmailService } from '../../services/integrations/email.service';
import { ThermalPrinterService } from '../../services/integrations/printer.service';
import { AccountingService, JournalEntry } from '../../services/integrations/accounting.service';
import { DeliveryService } from '../../services/integrations/delivery.service';
import { logStaffAction } from '../../utils/audit';

const router = Router();

/**
 * GET /api/admin/integrations
 * Retrieve all integration configs for restaurant.
 */
router.get(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const configs = await prisma.integrationConfig.findMany({
        where: { restaurantId },
        orderBy: { providerType: 'asc' },
      });

      return sendSuccess(res, configs);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/integrations
 * Upsert integration configuration.
 */
router.post(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  requireEntitlement('INTEGRATIONS'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.body.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const { providerType, providerName, isEnabled, configJson } = req.body;

      if (!providerType || !providerName) {
        return next(new AppError('providerType and providerName are required', 400, 'VALIDATION_ERROR'));
      }

      const upserted = await prisma.integrationConfig.upsert({
        where: {
          restaurantId_providerType: {
            restaurantId,
            providerType: providerType as any,
          },
        },
        create: {
          restaurantId,
          providerType: providerType as any,
          providerName,
          isEnabled: isEnabled ?? true,
          configJson: typeof configJson === 'string' ? configJson : JSON.stringify(configJson || {}),
        },
        update: {
          providerName,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
          configJson: typeof configJson === 'string' ? configJson : JSON.stringify(configJson || {}),
        },
      });

      if (req.user?.id) {
        await logStaffAction(
          restaurantId,
          req.user.id,
          'INTEGRATION_SAVED',
          `Configured integration provider ${providerType} (${providerName})`
        );
      }

      return sendSuccess(res, upserted, { message: 'Integration configuration saved successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/integrations/test
 * Test provider connection or dispatch sandbox simulation payload.
 */
router.post(
  '/test',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.body.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const { providerType, recipient } = req.body as { providerType: ProviderType; recipient?: string };

      if (!providerType) {
        return next(new AppError('providerType is required', 400, 'VALIDATION_ERROR'));
      }

      // Fetch config from DB
      const configRecord = await prisma.integrationConfig.findUnique({
        where: {
          restaurantId_providerType: {
            restaurantId,
            providerType: providerType as any,
          },
        },
      });

      let parsedConfig = { isEnabled: true };
      if (configRecord?.configJson) {
        try {
          parsedConfig = { ...JSON.parse(configRecord.configJson), isEnabled: configRecord.isEnabled };
        } catch {
          // fallback
        }
      }

      let testResult: any;

      switch (providerType as string) {
        case 'WHATSAPP': {
          testResult = await WhatsAppService.send(parsedConfig as any, {
            to: recipient || '+923001234567',
            templateName: 'ORDER_CONFIRMATION',
            parameters: {
              orderNumber: 1042,
              tableNumber: '07',
              itemsSummary: 'Chicken Karahi (Full) × 1, Garlic Naan × 3',
              total: 2450,
              trackingUrl: 'https://silversapoon.com/orders/track?orderId=demo',
            },
          });
          break;
        }

        case 'SMS': {
          testResult = await SMSService.send(parsedConfig as any, {
            to: recipient || '+923001234567',
            message: 'Silver Sapoon: Your order #1042 is being prepared by our chefs! Expected in 15 mins.',
          });
          break;
        }

        case 'EMAIL': {
          const sampleHtml = EmailService.renderReceiptHtml({
            orderNumber: 1042,
            tableNumber: '07',
            subtotal: 2112,
            discount: 0,
            tax: 338,
            serviceCharge: 0,
            total: 2450,
            paymentMethod: 'CARD',
            items: [
              { name: 'Special Chicken Karahi (Full)', quantity: 1, unitPrice: 1850, subtotal: 1850 },
              { name: 'Fresh Garlic Naan', quantity: 3, unitPrice: 87, subtotal: 262 },
            ],
            createdAt: new Date().toISOString(),
          });

          testResult = await EmailService.send(parsedConfig as any, {
            to: recipient || 'guest@example.com',
            subject: 'Silver Sapoon Dining Receipt - Order #1042',
            htmlContent: sampleHtml,
          });
          break;
        }

        case 'THERMAL_PRINTER': {
          testResult = await ThermalPrinterService.sendPrintJob(parsedConfig as any, {
            paperWidth: (parsedConfig as any)?.paperWidth || '80mm',
            printType: 'CUSTOMER_BILL',
            orderNumber: 1042,
            tableNumber: '07',
            subtotal: 2112,
            tax: 338,
            discount: 0,
            total: 2450,
            paymentMethod: 'CASH',
            createdAt: new Date().toISOString(),
            items: [
              { name: 'Chicken Karahi (Full)', quantity: 1, unitPrice: 1850, subtotal: 1850 },
              { name: 'Garlic Naan', quantity: 3, unitPrice: 87, subtotal: 262 },
            ],
          });
          break;
        }

        case 'ACCOUNTING': {
          const sampleEntries: JournalEntry[] = [
            {
              date: new Date().toISOString().split('T')[0],
              transactionType: 'SALES_RECEIPT',
              reference: 'INV-1042',
              account: '1010 - Cash & Bank',
              debit: 2450,
              credit: 0,
              description: 'Customer Dine-In Payment Order #1042',
            },
            {
              date: new Date().toISOString().split('T')[0],
              transactionType: 'SALES_RECEIPT',
              reference: 'INV-1042',
              account: '4010 - Food & Beverage Revenue',
              debit: 0,
              credit: 2112,
              description: 'Food Sales Order #1042',
            },
            {
              date: new Date().toISOString().split('T')[0],
              transactionType: 'SALES_RECEIPT',
              reference: 'INV-1042',
              account: '2020 - Sales Tax Payable (GST 16%)',
              debit: 0,
              credit: 338,
              description: 'Sales Tax Order #1042',
            },
          ];

          testResult = await AccountingService.sync(parsedConfig as any, sampleEntries);
          break;
        }

        case 'DELIVERY': {
          testResult = await DeliveryService.dispatchRider(parsedConfig as any, {
            orderId: 'demo-order-1042',
            orderNumber: 1042,
            customerName: 'Usman Ali',
            customerPhone: recipient || '+923001234567',
            deliveryAddress: 'House 42, Street 7, F-7/2, Islamabad',
            orderTotal: 2450,
            itemsCount: 4,
          });
          break;
        }

        default:
          return next(new AppError(`Unsupported provider type: ${providerType}`, 400, 'VALIDATION_ERROR'));
      }

      // Update last tested status in DB
      if (configRecord) {
        await prisma.integrationConfig.update({
          where: { id: configRecord.id },
          data: {
            lastTestedAt: new Date(),
            lastStatus: testResult.success ? 'SUCCESS' : 'FAILED',
          },
        });
      }

      return sendSuccess(res, testResult);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/integrations/print-receipt/:orderId
 * Generate ESC/POS thermal printer receipt text for a real order.
 */
router.post(
  '/print-receipt/:orderId',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF, UserRole.WAITER, UserRole.CASHIER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const { printType = 'CUSTOMER_BILL', paperWidth = '80mm' } = req.body;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, table: true, restaurant: true },
      });

      if (!order) {
        return next(new AppError('Order not found', 404, 'NOT_FOUND'));
      }

      const receiptText = ThermalPrinterService.renderReceiptText({
        paperWidth: paperWidth as any,
        printType: printType as any,
        restaurantName: order.restaurant?.name || 'SILVER SAPOON',
        orderNumber: Number(order.orderNumber),
        tableNumber: order.table?.tableNumber || order.tableId.replace(/^t-/, '') || '01',
        items: order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
          specialInstructions: i.specialInstructions || undefined,
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt.toISOString(),
      });

      return sendSuccess(res, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        receiptText,
        paperWidth,
        printType,
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/integrations/accounting/export
 * Export General Ledger CSV file for recent completed orders.
 */
router.get(
  '/accounting/export',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: 'COMPLETED' as any,
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      const entries: JournalEntry[] = [];

      orders.forEach((order) => {
        const dateStr = order.createdAt.toISOString().split('T')[0];
        const ref = `INV-${order.orderNumber}`;

        // Debit: Cash / Bank
        entries.push({
          date: dateStr,
          transactionType: 'SALES_RECEIPT',
          reference: ref,
          account: order.paymentMethod === 'CARD' ? '1020 - Card Clearing' : '1010 - Cash Drawer',
          debit: order.total,
          credit: 0,
          description: `Order #${order.orderNumber} Total Payment`,
        });

        // Credit: F&B Revenue
        entries.push({
          date: dateStr,
          transactionType: 'SALES_RECEIPT',
          reference: ref,
          account: '4010 - Food & Beverage Revenue',
          debit: 0,
          credit: order.subtotal - order.discount,
          description: `Order #${order.orderNumber} Food Sales`,
        });

        // Credit: Sales Tax (GST)
        if (order.tax > 0) {
          entries.push({
            date: dateStr,
            transactionType: 'SALES_RECEIPT',
            reference: ref,
            account: '2020 - Sales Tax Payable (GST)',
            debit: 0,
            credit: order.tax,
            description: `Order #${order.orderNumber} Sales Tax`,
          });
        }
      });

      const csvContent = AccountingService.generateGeneralLedgerCSV(entries);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=general-ledger-${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csvContent);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
