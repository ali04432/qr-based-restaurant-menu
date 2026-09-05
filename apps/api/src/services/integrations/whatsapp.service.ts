import { IntegrationTestResult } from '@qr-menu/shared';

export interface WhatsAppPayload {
  to: string;
  templateName: 'ORDER_CONFIRMATION' | 'ORDER_READY' | 'LOYALTY_UPDATE' | 'BILL_RECEIPT';
  parameters: Record<string, string | number>;
}

export class WhatsAppService {
  /**
   * Render template preview for customer notification
   */
  static renderTemplate(templateName: string, params: Record<string, string | number>): string {
    switch (templateName) {
      case 'ORDER_CONFIRMATION':
        return `🍽️ *Silver Sapoon — Order #${params.orderNumber} Confirmed!*\n\n` +
          `Table: *${params.tableNumber}*\n` +
          `Items: ${params.itemsSummary}\n` +
          `Total: *Rs. ${Number(params.total).toLocaleString()}*\n\n` +
          `Track live preparation status here: ${params.trackingUrl}\n\n` +
          `Thank you for dining with us!`;

      case 'ORDER_READY':
        return `🔔 *Your order #${params.orderNumber} is READY!* 🍲\n\n` +
          `Our staff is delivering it to Table *${params.tableNumber}* right now. Enjoy your meal!`;

      case 'LOYALTY_UPDATE':
        return `🎉 *Loyalty Points Update!*\n\n` +
          `You just earned *${params.pointsEarned} points*! Your current balance is *${params.newBalance} points* (${params.tier} Tier).\n` +
          `Redeem for exclusive discounts on your next visit.`;

      case 'BILL_RECEIPT':
        return `🧾 *Silver Sapoon Official Receipt — Order #${params.orderNumber}*\n\n` +
          `Total Paid: *Rs. ${Number(params.total).toLocaleString()}* via ${params.paymentMethod}\n` +
          `View Itemized Digital Receipt: ${params.receiptUrl}`;

      default:
        return `Notification from Silver Sapoon: ${JSON.stringify(params)}`;
    }
  }

  /**
   * Send WhatsApp message via configured credentials or simulate in sandbox mode
   */
  static async send(
    config: { apiKey?: string; phoneNumberId?: string; isEnabled?: boolean } | null,
    payload: WhatsAppPayload
  ): Promise<IntegrationTestResult> {
    const formattedMessage = this.renderTemplate(payload.templateName, payload.parameters);

    if (!config?.isEnabled) {
      return {
        success: false,
        provider: 'WHATSAPP',
        message: 'WhatsApp integration is currently disabled in settings.',
        payloadPreview: formattedMessage,
      };
    }

    if (!config.apiKey || config.apiKey === 'DEMO_KEY' || !config.phoneNumberId) {
      // Sandbox simulated dispatch
      return {
        success: true,
        provider: 'WHATSAPP',
        message: `[Sandbox Mode] WhatsApp message dispatched to ${payload.to}`,
        payloadPreview: formattedMessage,
        details: {
          recipient: payload.to,
          mode: 'SANDBOX_EMULATION',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Live Meta Cloud API call
    try {
      const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: payload.to.replace(/\D/g, ''),
          type: 'text',
          text: { body: formattedMessage },
        }),
      });

      const data: any = await response.json();
      if (!response.ok) {
        return {
          success: false,
          provider: 'WHATSAPP',
          message: data?.error?.message || 'Failed to dispatch WhatsApp message via Meta Cloud API',
          payloadPreview: formattedMessage,
          details: data,
        };
      }

      return {
        success: true,
        provider: 'WHATSAPP',
        message: `WhatsApp message successfully dispatched to ${payload.to}`,
        payloadPreview: formattedMessage,
        details: data,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'WHATSAPP',
        message: err.message || 'WhatsApp network error',
        payloadPreview: formattedMessage,
      };
    }
  }
}
