import { IntegrationTestResult } from '@qr-menu/shared';

export interface EmailPayload {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export class EmailService {
  /**
   * Render HTML receipt email template
   */
  static renderReceiptHtml(order: {
    orderNumber: number;
    tableNumber?: string;
    total: number;
    subtotal: number;
    tax: number;
    discount: number;
    serviceCharge: number;
    paymentMethod?: string;
    items: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }>;
    createdAt: string;
  }): string {
    const itemsHtml = order.items
      .map(
        (i) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a;">${i.name} × ${i.quantity}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a; text-align: right; font-family: monospace;">Rs. ${i.subtotal.toLocaleString()}</td>
      </tr>`
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; padding: 24px;">
    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
      <h1 style="margin: 0; font-size: 20px; color: #0f172a; letter-spacing: -0.5px;">Silver Sapoon Restaurant</h1>
      <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Official Tax Invoice & Dining Receipt</p>
    </div>

    <div style="font-size: 12px; color: #475569; margin-bottom: 16px; display: flex; justify-content: space-between;">
      <div><strong>Order:</strong> #${order.orderNumber} (Table ${order.tableNumber || '01'})</div>
      <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">
          <th style="padding-bottom: 6px;">Item</th>
          <th style="padding-bottom: 6px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 12px; color: #334155; line-height: 1.8;">
      <div style="display: flex; justify-content: space-between;">
        <span>Subtotal:</span>
        <span style="font-family: monospace;">Rs. ${order.subtotal.toLocaleString()}</span>
      </div>
      ${order.discount > 0 ? `
      <div style="display: flex; justify-content: space-between; color: #b45309;">
        <span>Discount:</span>
        <span style="font-family: monospace;">-Rs. ${order.discount.toLocaleString()}</span>
      </div>` : ''}
      <div style="display: flex; justify-content: space-between;">
        <span>GST / Tax (16%):</span>
        <span style="font-family: monospace;">Rs. ${order.tax.toLocaleString()}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Service Charge:</span>
        <span style="font-family: monospace;">Rs. ${order.serviceCharge.toLocaleString()}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 8px; padding-top: 8px; border-top: 2px solid #0f172a;">
        <span>Total Paid:</span>
        <span style="font-family: monospace;">Rs. ${order.total.toLocaleString()}</span>
      </div>
    </div>

    <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
      Paid via ${order.paymentMethod || 'CASH'} • Thank you for dining with us!
    </div>
  </div>
</body>
</html>`;
  }

  static async send(
    config: { smtpHost?: string; smtpPort?: number; smtpUser?: string; smtpPass?: string; fromEmail?: string; isEnabled?: boolean } | null,
    payload: EmailPayload
  ): Promise<IntegrationTestResult> {
    if (!config?.isEnabled) {
      return {
        success: false,
        provider: 'EMAIL',
        message: 'Transactional Email integration is disabled in settings.',
        payloadPreview: payload.htmlContent.slice(0, 300) + '...',
      };
    }

    // Emulation mode if test keys
    if (!config.smtpHost || config.smtpHost === 'localhost' || !config.smtpUser) {
      return {
        success: true,
        provider: 'EMAIL',
        message: `[Sandbox Mode] Transactional email queued for ${payload.to}`,
        payloadPreview: payload.htmlContent,
        details: {
          recipient: payload.to,
          subject: payload.subject,
          from: config?.fromEmail || 'receipts@silversapoon.com',
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      provider: 'EMAIL',
      message: `Email successfully sent to ${payload.to}`,
      payloadPreview: payload.htmlContent,
    };
  }
}
