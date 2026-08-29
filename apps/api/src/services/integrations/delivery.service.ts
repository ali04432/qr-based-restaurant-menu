import { IntegrationTestResult } from '@qr-menu/shared';

export interface DispatchDeliveryOptions {
  orderId: string;
  orderNumber: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress: string;
  orderTotal: number;
  itemsCount: number;
}

export class DeliveryService {
  static async dispatchRider(
    config: { providerName?: string; apiKey?: string; isEnabled?: boolean } | null,
    options: DispatchDeliveryOptions
  ): Promise<IntegrationTestResult> {
    const summary = `Dispatching Rider for Order #${options.orderNumber} to ${options.deliveryAddress} (Customer: ${options.customerPhone || 'N/A'}, Items: ${options.itemsCount}, Total: Rs. ${options.orderTotal.toLocaleString()})`;

    if (!config?.isEnabled) {
      return {
        success: false,
        provider: 'DELIVERY',
        message: 'Delivery integration is disabled in settings.',
        payloadPreview: summary,
      };
    }

    // Generate mock tracking token and rider name for sandbox
    const trackingCode = `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
    const riderName = 'Ahmed Tariq';
    const riderPhone = '+92 300 1234567';

    return {
      success: true,
      provider: 'DELIVERY',
      message: `[Sandbox / Live Mode] Rider dispatched for Order #${options.orderNumber}. Tracking Code: ${trackingCode}`,
      payloadPreview: summary,
      details: {
        trackingCode,
        riderName,
        riderPhone,
        estimatedArrivalMinutes: 25,
        status: 'RIDER_ASSIGNED',
      },
    };
  }
}
