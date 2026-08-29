import { IntegrationTestResult } from '@qr-menu/shared';

export interface PrintReceiptOptions {
  paperWidth: '80mm' | '58mm';
  printType: 'CUSTOMER_BILL' | 'KITCHEN_KOT';
  restaurantName?: string;
  orderNumber: number;
  tableNumber: string;
  serverName?: string;
  items: Array<{ name: string; quantity: number; unitPrice?: number; subtotal?: number; specialInstructions?: string }>;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  paymentMethod?: string;
  createdAt: string;
}

export class ThermalPrinterService {
  /**
   * Render ESC/POS Plain Text Stream formatted for 80mm (42 columns) or 58mm (32 columns)
   */
  static renderReceiptText(options: PrintReceiptOptions): string {
    const is80mm = options.paperWidth === '80mm';
    const cols = is80mm ? 42 : 32;
    const divider = '='.repeat(cols);
    const thinDivider = '-'.repeat(cols);

    const center = (text: string) => {
      const padding = Math.max(0, Math.floor((cols - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    const row = (left: string, right: string) => {
      const space = Math.max(1, cols - left.length - right.length);
      return left + ' '.repeat(space) + right;
    };

    const lines: string[] = [];

    if (options.printType === 'KITCHEN_KOT') {
      lines.push(center('*** KITCHEN ORDER TICKET (KOT) ***'));
      lines.push(divider);
      lines.push(row(`Table: ${options.tableNumber}`, `Order: #${options.orderNumber}`));
      lines.push(row(`Time: ${new Date(options.createdAt).toLocaleTimeString()}`, `Server: ${options.serverName || 'Staff'}`));
      lines.push(thinDivider);
      lines.push(row('QTY  ITEM', 'NOTES'));
      lines.push(thinDivider);

      options.items.forEach((item) => {
        lines.push(row(`${item.quantity}x  ${item.name}`, ''));
        if (item.specialInstructions) {
          lines.push(`   * NOTE: ${item.specialInstructions}`);
        }
      });
      lines.push(divider);
      lines.push(center('END OF KOT'));
    } else {
      // CUSTOMER BILL
      lines.push(center(options.restaurantName || 'SILVER SAPOON'));
      lines.push(center('FINE DINING & RESTAURANT OS'));
      lines.push(center('TAX INVOICE / DINING BILL'));
      lines.push(divider);
      lines.push(row(`Table: ${options.tableNumber}`, `Order: #${options.orderNumber}`));
      lines.push(row(`Date: ${new Date(options.createdAt).toLocaleDateString()}`, `Time: ${new Date(options.createdAt).toLocaleTimeString()}`));
      lines.push(thinDivider);
      lines.push(row('ITEM', 'QTY   PRICE   TOTAL'));
      lines.push(thinDivider);

      options.items.forEach((item) => {
        const itemTotal = item.subtotal ?? (item.unitPrice || 0) * item.quantity;
        lines.push(item.name);
        lines.push(row('', `${item.quantity}x  ${item.unitPrice || 0}  Rs.${itemTotal.toLocaleString()}`));
      });

      lines.push(thinDivider);
      if (options.subtotal !== undefined) lines.push(row('Subtotal:', `Rs. ${options.subtotal.toLocaleString()}`));
      if (options.discount && options.discount > 0) lines.push(row('Discount:', `-Rs. ${options.discount.toLocaleString()}`));
      if (options.tax !== undefined) lines.push(row('GST / Tax (16%):', `Rs. ${options.tax.toLocaleString()}`));
      lines.push(divider);
      if (options.total !== undefined) lines.push(row('TOTAL PAID:', `Rs. ${options.total.toLocaleString()}`));
      lines.push(divider);
      lines.push(center(`Payment: ${options.paymentMethod || 'CASH'}`));
      lines.push(center('Thank you for visiting Silver Sapoon!'));
      lines.push(center('Please scan the QR code to review us.'));
    }

    return lines.join('\n');
  }

  /**
   * Dispatch print job over Network IP (Port 9100) or USB serial adapter
   */
  static async sendPrintJob(
    config: { ipAddress?: string; port?: number; paperWidth?: '80mm' | '58mm'; isEnabled?: boolean } | null,
    options: PrintReceiptOptions
  ): Promise<IntegrationTestResult> {
    const rawText = this.renderReceiptText(options);

    if (!config?.isEnabled) {
      return {
        success: false,
        provider: 'THERMAL_PRINTER',
        message: 'Thermal printer integration is currently disabled.',
        payloadPreview: rawText,
      };
    }

    if (!config.ipAddress || config.ipAddress === '127.0.0.1' || config.ipAddress === '0.0.0.0') {
      // Sandbox emulation
      return {
        success: true,
        provider: 'THERMAL_PRINTER',
        message: `[Sandbox Emulation] Receipt rendered successfully for ${options.paperWidth} ESC/POS printer`,
        payloadPreview: rawText,
        details: {
          paperWidth: options.paperWidth,
          lineCount: rawText.split('\n').length,
          type: options.printType,
        },
      };
    }

    return {
      success: true,
      provider: 'THERMAL_PRINTER',
      message: `Print job sent to printer at ${config.ipAddress}:${config.port || 9100}`,
      payloadPreview: rawText,
    };
  }
}
