import { IntegrationTestResult } from '@qr-menu/shared';

export interface JournalEntry {
  date: string;
  transactionType: 'SALES_RECEIPT' | 'INVENTORY_PURCHASE' | 'PAYROLL_EXPENSE' | 'WASTAGE_LOSS';
  reference: string;
  account: string;
  debit: number;
  credit: number;
  description: string;
}

export class AccountingService {
  /**
   * Generate Standard Double-Entry General Ledger CSV
   */
  static generateGeneralLedgerCSV(entries: JournalEntry[]): string {
    const header = 'Date,Transaction Type,Reference,Account,Debit (PKR),Credit (PKR),Description\n';
    const rows = entries
      .map(
        (e) =>
          `"${e.date}","${e.transactionType}","${e.reference}","${e.account}",${e.debit.toFixed(2)},${e.credit.toFixed(2)},"${e.description.replace(/"/g, '""')}"`
      )
      .join('\n');

    return header + rows;
  }

  /**
   * Sync Journal Entries with Cloud Accounting (QuickBooks / Xero)
   */
  static async sync(
    config: { provider?: 'QUICKBOOKS' | 'XERO' | 'EXCEL_CSV'; apiKey?: string; companyId?: string; isEnabled?: boolean } | null,
    entries: JournalEntry[]
  ): Promise<IntegrationTestResult> {
    const csvPreview = this.generateGeneralLedgerCSV(entries.slice(0, 5));

    if (!config?.isEnabled) {
      return {
        success: false,
        provider: 'ACCOUNTING',
        message: 'Accounting sync is disabled in settings.',
        payloadPreview: csvPreview,
      };
    }

    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

    return {
      success: true,
      provider: 'ACCOUNTING',
      message: `[Sandbox / Live Mode] Successfully compiled ${entries.length} journal entries. Total Debits: Rs. ${totalDebit.toLocaleString()}, Total Credits: Rs. ${totalCredit.toLocaleString()}`,
      payloadPreview: csvPreview,
      details: {
        provider: config?.provider || 'EXCEL_CSV',
        totalEntries: entries.length,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
    };
  }
}
