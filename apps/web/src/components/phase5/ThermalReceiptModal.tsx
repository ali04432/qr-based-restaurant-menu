'use client';

import React, { useRef } from 'react';
import { Printer, X, Check, Copy } from 'lucide-react';
import { ThermalReceiptPayload } from '@qr-menu/shared';

interface ThermalReceiptModalProps {
  receipt: ThermalReceiptPayload | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ThermalReceiptModal({ receipt, isOpen, onClose }: ThermalReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    if (!receipt) return;
    const text = `
================================
     ${receipt.restaurantName}
 ${receipt.address || 'Lahore, Pakistan'}
  Tel: ${receipt.phone || '+92 42 111 727'}
================================
Order #: ${receipt.orderNumber}
Table  : ${receipt.tableNumber}
Date   : ${receipt.date} ${receipt.time}
Cashier: ${receipt.cashierName}
--------------------------------
${receipt.items.map((i) => `${i.name.padEnd(20, ' ')} x${i.quantity}  PKR ${i.subtotal}`).join('\n')}
--------------------------------
Subtotal:       PKR ${receipt.subtotal.toLocaleString()}
Tax (8%):       PKR ${receipt.tax.toLocaleString()}
Service (flat): PKR ${receipt.serviceCharge.toLocaleString()}
${receipt.discount > 0 ? `Discount:      -PKR ${receipt.discount.toLocaleString()}\n` : ''}--------------------------------
GRAND TOTAL:    PKR ${receipt.total.toLocaleString()}
Payment Method: ${receipt.paymentMethod}
${receipt.amountReceived ? `Received:       PKR ${receipt.amountReceived.toLocaleString()}\n` : ''}${receipt.change ? `Change:         PKR ${receipt.change.toLocaleString()}\n` : ''}================================
    THANK YOU FOR DINING WITH US!
    Please visit us again soon.
================================
    `;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-auto print:max-w-none print:bg-white text-slate-100 print:text-black">
        {/* Header — hidden during print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 print:hidden bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-white tracking-wide">POS Thermal Receipt</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area (80mm Thermal Paper Simulation) */}
        <div className="p-6 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible">
          <div
            ref={receiptRef}
            className="mx-auto w-[300px] bg-white text-neutral-900 p-5 rounded-lg shadow-inner font-mono text-xs leading-tight print:w-[76mm] print:p-0 print:shadow-none"
          >
            {/* Restaurant Header */}
            <div className="text-center border-b border-dashed border-neutral-400 pb-3 mb-3">
              <h1 className="text-base font-bold tracking-wider uppercase text-neutral-950">
                {receipt.restaurantName}
              </h1>
              <p className="text-[10px] text-neutral-600 mt-0.5">{receipt.address || 'Gulberg III, Lahore'}</p>
              <p className="text-[10px] text-neutral-600">Tel: {receipt.phone || '+92 42 111 727 666'}</p>
              <div className="mt-2 text-[10px] font-semibold bg-neutral-100 inline-block px-2 py-0.5 rounded">
                CUSTOMER COPY
              </div>
            </div>

            {/* Meta Info */}
            <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-neutral-600">Order ID:</span>
                <span className="font-bold text-neutral-900">{receipt.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Table:</span>
                <span className="font-bold text-neutral-900">Table {receipt.tableNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Date & Time:</span>
                <span>{receipt.date} {receipt.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Cashier:</span>
                <span>{receipt.cashierName}</span>
              </div>
              {receipt.transactionRef && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Txn Ref:</span>
                  <span className="text-[10px]">{receipt.transactionRef}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="border-b border-dashed border-neutral-400 pb-2 mb-2">
              <div className="grid grid-cols-12 font-bold text-[10px] text-neutral-600 uppercase mb-1">
                <span className="col-span-7">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-3 text-right">Amt</span>
              </div>
              <div className="space-y-1 text-[11px]">
                {receipt.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-baseline">
                    <span className="col-span-7 font-medium truncate pr-1 text-neutral-900">{item.name}</span>
                    <span className="col-span-2 text-center text-neutral-600">x{item.quantity}</span>
                    <span className="col-span-3 text-right font-semibold text-neutral-900">
                      Rs. {item.subtotal.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span>Rs. {receipt.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">GST Tax (8%)</span>
                <span>Rs. {receipt.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Service Charge</span>
                <span>Rs. {receipt.serviceCharge.toLocaleString()}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount</span>
                  <span>-Rs. {receipt.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-neutral-300 font-bold text-sm text-neutral-950">
                <span>GRAND TOTAL</span>
                <span>PKR {receipt.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="border-b border-dashed border-neutral-400 pb-2 mb-3 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-neutral-600">Payment Method:</span>
                <span className="font-bold text-neutral-900">{receipt.paymentMethod}</span>
              </div>
              {receipt.amountReceived !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Amount Received:</span>
                  <span>Rs. {receipt.amountReceived.toLocaleString()}</span>
                </div>
              )}
              {receipt.change !== undefined && (
                <div className="flex justify-between font-semibold">
                  <span className="text-neutral-600">Change Due:</span>
                  <span>Rs. {receipt.change.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Barcode representation */}
            <div className="text-center pt-1 pb-2">
              <div className="tracking-[4px] font-bold text-neutral-400 text-sm select-none">
                ||| | |||| | || ||| || |||
              </div>
              <p className="text-[9px] text-neutral-500 mt-1">{receipt.orderNumber}</p>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-neutral-600 pt-1">
              <p className="font-semibold text-neutral-800">Thank you for dining with Silver Sapoon!</p>
              <p>For feedback: support@silversapoon.com</p>
            </div>
          </div>
        </div>

        {/* Action Buttons — hidden in print */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-950/80 border-t border-slate-800 print:hidden">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Receipt' : 'Copy Text'}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Print Thermal Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
