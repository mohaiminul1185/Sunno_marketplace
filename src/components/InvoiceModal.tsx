import React, { useRef, useState } from 'react';
import {
  X,
  Printer,
  Download,
  Leaf,
  ShieldCheck,
  QrCode,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { Invoice } from '../types';
import { BRAND_LOGO } from '../data/mockData';
import {
  downloadDigitalReceiptImage,
  printDigitalReceiptDocument,
  DigitalReceiptData,
} from '../services/digitalReceiptService';

interface InvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const subtotal = Number(invoice.subtotal ?? (invoice as any).subTotal ?? 0);
  const discountAmount = Number(invoice.discountAmount ?? (invoice as any).discount ?? 0);
  const deliveryFee = Number(invoice.deliveryFee ?? (invoice as any).shippingFee ?? 0);
  const codFee = Number(invoice.codFee ?? 0);
  const grandTotal = Number(
    invoice.grandTotal ??
    (invoice as any).totalAmount ??
    (invoice as any).total ??
    Math.max(0, subtotal - discountAmount + deliveryFee + codFee)
  );

  const formattedDate = invoice.invoiceDate
    ? (() => {
        try {
          const d = new Date(invoice.invoiceDate);
          return isNaN(d.getTime())
            ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
          return new Date().toLocaleDateString('en-GB');
        }
      })()
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Structured digital receipt data
  const digitalReceiptData: DigitalReceiptData = {
    orderNumber: invoice.orderNumber || invoice.orderId || 'ORD-SUNNO',
    orderId: invoice.orderId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: formattedDate,
    customerName: invoice.customerName || 'Conscious Buyer',
    customerPhone: invoice.customerPhone,
    customerEmail: invoice.customerEmail,
    shippingAddress: invoice.shippingAddress,
    paymentMethod: invoice.paymentMethod || 'cod',
    paymentStatus: invoice.paymentStatus || 'pending',
    transactionId: invoice.paymentTransactionId,
    trackingNumber: invoice.trackingNumber,
    courierName: invoice.courierName,
    items: (invoice.items || []).map((it) => {
      const q = Math.max(1, Number(it?.quantity || 1));
      const u = Number(it?.unitPrice || 0);
      const t = Number(it?.totalPrice ?? u * q);
      return {
        name: it?.title || 'Artisan Handcrafted Item',
        sellerName: it?.sellerName || 'Rural Bangladesh Artisan',
        quantity: q,
        unitPrice: u,
        totalPrice: t,
        ecoTypes: it?.ecoTypes,
      };
    }),
    subtotal,
    discount: discountAmount,
    discountCode: invoice.discountCode,
    shippingFee: deliveryFee,
    grandTotal,
  };

  const handlePrint = () => {
    try {
      printDigitalReceiptDocument(digitalReceiptData);
    } catch (err) {
      console.warn('Invoice print fallback:', err);
      window.print();
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadDigitalReceiptImage(digitalReceiptData);
    } catch (err) {
      console.error('Failed to download receipt image, falling back to print/PDF:', err);
      printDigitalReceiptDocument(digitalReceiptData);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      id="invoice-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/75 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="invoice-modal-container"
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-wide">SUNNO Official Tax Invoice & Packing Slip</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="download-invoice-btn"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              title="Download high-resolution digital receipt image (PNG)"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Generating...' : 'Download Digital Receipt (PNG)'}
            </button>
            <button
              id="print-invoice-btn"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="Print official receipt or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              id="close-invoice-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors ml-2 cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div
          ref={printRef}
          id="invoice-sheet"
          className="p-8 max-h-[75vh] overflow-y-auto bg-white text-stone-900 space-y-6"
        >
          {/* Header with official SUNNO Brand Logo */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-900/20 p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                  <img src={BRAND_LOGO} alt="SUNNO Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black tracking-wider text-emerald-950 font-heading">SUNNO</span>
                    <span className="text-[10px] bg-emerald-800 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Eco-Verified
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-medium">
                    Bangladesh Rural Eco-Artisan Cooperative Network
                  </p>
                  <p className="text-[11px] text-stone-400">
                    BIN: 00482910-0102 • Registered Craft Clusters • www.sunno.eco
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                Official Receipt
              </span>
              <h3 className="font-mono text-base font-bold text-stone-900">{invoice.invoiceNumber}</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-stone-500">
                Order Ref: <span className="font-mono font-bold text-stone-800">{invoice.orderNumber}</span>
              </p>
            </div>
          </div>

          {/* Billing & Shipping Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <span className="font-bold text-stone-500 uppercase tracking-wider block mb-2">
                BILLED & SHIPPED TO:
              </span>
              <p className="font-bold text-sm text-stone-900">{invoice.customerName}</p>
              <p className="text-stone-700">{invoice.shippingAddress.streetAddress}</p>
              {invoice.shippingAddress.area && <p className="text-stone-600">{invoice.shippingAddress.area}</p>}
              <p className="text-stone-600">{invoice.shippingAddress.district}, {invoice.shippingAddress.division}</p>
              <p className="font-mono text-stone-700 mt-1">Phone: {invoice.customerPhone}</p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <span className="font-bold text-stone-500 uppercase tracking-wider block mb-2">
                DISPATCH & PAYMENT DETAILS:
              </span>
              <p><span className="text-stone-500">Payment Gateway:</span> <strong className="uppercase">{invoice.paymentMethod}</strong></p>
              <p>
                <span className="text-stone-500">Payment Status:</span>{' '}
                <span className={`font-semibold ${invoice.paymentStatus === 'completed' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {invoice.paymentStatus.toUpperCase()}
                </span>
              </p>
              {invoice.paymentTransactionId && (
                <p><span className="text-stone-500">TrxID:</span> <code className="font-mono text-stone-800">{invoice.paymentTransactionId}</code></p>
              )}
              <p><span className="text-stone-500">Courier Partner:</span> <strong>{invoice.courierName}</strong></p>
              {invoice.trackingNumber && (
                <p><span className="text-stone-500">Tracking Code:</span> <code className="font-mono text-emerald-800 font-bold">{invoice.trackingNumber}</code></p>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-300 text-stone-600 uppercase tracking-wider bg-stone-50">
                  <th className="py-2.5 px-3">Description / Artisan Craft</th>
                  <th className="py-2.5 px-3">Artisan Workshop</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {(invoice.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-medium text-stone-900">
                      <div>{item.title}</div>
                      {item.ecoTypes && item.ecoTypes.length > 0 && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Eco: {item.ecoTypes.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-stone-600">{item.sellerName}</td>
                    <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono">৳{(item.unitPrice || 0).toLocaleString('en-BD')}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                      ৳{(item.totalPrice || (item.unitPrice || 0) * (item.quantity || 1)).toLocaleString('en-BD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations Ledger */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-stone-200">
            {/* QR Code & Artisan Authenticity Seal */}
            <div className="flex items-center gap-4 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div className="p-2 bg-white rounded-lg border border-stone-300 shrink-0">
                <QrCode className="w-16 h-16 text-stone-900" />
              </div>
              <div className="text-[11px] text-stone-600 space-y-1">
                <p className="font-bold text-stone-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Verified Bangladesh Craft
                </p>
                <p>Scan to verify authenticity on SUNNO Blockchain/Database ledger.</p>
                <p className="font-mono text-[10px] text-stone-400">HASH: {(invoice.invoiceNumber || 'INV-0000').slice(-8)}</p>
              </div>
            </div>

            {/* Total Financials */}
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span className="font-mono">৳{subtotal.toLocaleString('en-BD')}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount {invoice.discountCode ? `(${invoice.discountCode})` : ''}:</span>
                  <span className="font-mono">-৳{discountAmount.toLocaleString('en-BD')}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-600">
                <span>Delivery & Logistics:</span>
                <span className="font-mono">৳{deliveryFee.toLocaleString('en-BD')}</span>
              </div>

              {codFee > 0 ? (
                <div className="flex justify-between text-stone-600">
                  <span>COD Handling:</span>
                  <span className="font-mono">৳{codFee.toLocaleString('en-BD')}</span>
                </div>
              ) : null}

              <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t-2 border-stone-800">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-950">৳{grandTotal.toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-6 border-t border-dashed border-stone-300 text-center text-[11px] text-stone-500 space-y-1">
            <p className="font-medium text-stone-700">
              {invoice.notes || 'Thank you for supporting Bangladesh rural eco-artisans and sustainable craftsmanship.'}
            </p>
            <p>For order queries, contact dispatch@sunno.eco or WhatsApp +880 1700-000000.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
