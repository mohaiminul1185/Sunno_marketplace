import React, { useState } from 'react';
import { PaymentRecord, Order, SubOrder } from '../types';
import { BRAND_LOGO } from '../data/mockData';
import {
  downloadDigitalReceiptImage,
  printDigitalReceiptDocument,
  DigitalReceiptData,
} from '../services/digitalReceiptService';

interface PaymentReceiptModalProps {
  payment?: PaymentRecord | null;
  order?: Order | null;
  subOrders?: SubOrder[];
  onClose: () => void;
  onTrackOrder?: (orderId: string) => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  payment,
  order,
  subOrders = [],
  onClose,
  onTrackOrder,
}) => {
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!payment && !order) return null;

  const orderNumber = order?.orderNumber || payment?.orderNumber || `SUNNO-ORD-2026-${(order?.id || payment?.orderId || '').slice(-6)}`;
  const orderId = order?.id || payment?.orderId || 'N/A';
  const paymentId = payment?.id || 'PAY-N/A';
  const trxId = payment?.transactionId || order?.paymentTransactionId || 'PENDING';
  const amount = payment?.amount ?? (order?.finalTotal || order?.total || 0);
  const paymentMethod = payment?.paymentMethod || order?.paymentMethod || 'cod';
  const provider = payment?.provider || order?.paymentMethod || 'Direct';
  const dateStr = payment?.completedAt || payment?.createdAt || order?.createdAt || new Date().toISOString();
  const formattedDate = new Date(dateStr).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const isPaid = payment?.status === 'SUCCESS' || payment?.status === 'paid' || order?.paymentStatus === 'paid';
  const isRefunded = payment?.status === 'REFUNDED' || payment?.status === 'refunded';
  const items = order?.items || [];


  // Prepare structured digital receipt payload
  const digitalReceiptData: DigitalReceiptData = {
    orderNumber,
    orderId,
    invoiceNumber: orderNumber,
    invoiceDate: formattedDate,
    customerName: order?.customerName || payment?.customerName || 'Conscious Buyer',
    customerPhone: order?.customerPhone || order?.shippingAddress?.phone,
    customerEmail: order?.customerEmail,
    shippingAddress: order?.shippingAddress,
    paymentMethod,
    paymentProvider: provider,
    paymentStatus: isPaid ? 'SUCCESS' : isRefunded ? 'REFUNDED' : 'PENDING',
    transactionId: trxId,
    trackingNumber: order?.trackingCode || order?.trackingNumber,
    courierName: order?.courierName,
    items: items.map((item) => ({
      name: item.productNameSnapshot || item.title,
      sellerName: item.sellerSnapshot?.sellerName || item.sellerName,
      quantity: item.quantity,
      unitPrice: item.priceSnapshot || item.price,
      totalPrice: (item.priceSnapshot || item.price) * item.quantity,
      sku: item.sku,
    })),
    subtotal: order?.subtotal || amount,
    discount: order?.discount || order?.discountAmount || 0,
    discountCode: order?.discountCode || order?.couponCode,
    shippingFee: order?.shippingFee ?? order?.deliveryFee ?? 0,
    grandTotal: amount,
    isRefunded,
  };

  // Official print and Save as PDF
  const handlePrint = () => {
    setActionFeedback('Opening print preview...');
    try {
      printDigitalReceiptDocument(digitalReceiptData);
      setTimeout(() => setActionFeedback(null), 2500);
    } catch (err) {
      console.warn('Print preview error, using window.print:', err);
      window.print();
      setTimeout(() => setActionFeedback(null), 2500);
    }
  };

  // Direct Digital Receipt Image (PNG) Download - NOT raw HTML
  const handleDownload = async () => {
    setActionFeedback('Rendering digital receipt slip...');
    try {
      await downloadDigitalReceiptImage(digitalReceiptData);
      setActionFeedback('Digital receipt (.png) downloaded successfully!');
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err) {
      console.error('Digital receipt image download error:', err);
      setActionFeedback('Download fallback: Opening print / Save as PDF dialog...');
      printDigitalReceiptDocument(digitalReceiptData);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#c1c9be]/60 print:border-none print:shadow-none my-8">
        
        {/* Modal Header / Tax Invoice Banner with Official SUNNO Brand Logo */}
        <div className="p-6 bg-[#002c11] text-white flex items-center justify-between print:bg-white print:text-black print:border-b print:border-black">
          <div className="flex items-center gap-3.5">
            {/* Official SUNNO Brand Logo */}
            <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-sm border border-white/20 shrink-0">
              <img
                src={BRAND_LOGO}
                alt="SUNNO Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-heading tracking-wider">SUNNO</span>
                <span className="text-[10px] bg-[#1b6d24] text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Tax / Sales Invoice
                </span>
                {payment?.isTestPayment && (
                  <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold uppercase">
                    Sandbox / Test
                  </span>
                )}
              </div>
              <p className="text-xs text-[#c1c9be] print:text-gray-600">
                100% Sustainable Artisanal Bangladesh Marketplace • BIN: 00482910-0102
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-[#c1c9be] hover:text-white transition-colors print:hidden"
            title="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Dynamic Action Notification Toast */}
        {actionFeedback && (
          <div className="bg-[#e8f5e9] text-[#1b6d24] px-4 py-2 text-xs font-semibold flex items-center gap-2 border-b border-[#1b6d24]/20 animate-fade-in print:hidden">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Receipt Body */}
        <div className="p-6 space-y-6 text-xs text-[#1b1c1c]">
          
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl flex items-center justify-between border ${
              isPaid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : isRefunded
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center gap-2.5 font-bold text-sm">
              <span className="material-symbols-outlined text-xl">
                {isPaid ? 'check_circle' : isRefunded ? 'published_with_changes' : 'pending_actions'}
              </span>
              <span>
                {isPaid
                  ? 'Payment Verified & Completed'
                  : isRefunded
                  ? 'Payment Refunded'
                  : 'Payment Pending (Cash on Delivery)'}
              </span>
            </div>
            <span className="font-mono font-black text-base">৳{amount} BDT</span>
          </div>

          {/* Key Identifiers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#fbf9f8] p-4 rounded-2xl border border-[#c1c9be]/50">
            <div>
              <span className="text-[10px] text-[#717970] uppercase font-bold block">Order Number</span>
              <span className="font-mono font-bold text-[#002c11] text-xs select-all">{orderNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#717970] uppercase font-bold block">Invoice Date</span>
              <span className="text-[#414941]">{formattedDate}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#717970] uppercase font-bold block">Payment Method</span>
              <span className="font-bold text-[#002c11] uppercase">{paymentMethod}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#717970] uppercase font-bold block">Transaction ID (TrxID)</span>
              <span className="font-mono font-bold text-[#1b6d24] select-all">{trxId}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#717970] uppercase font-bold block">Courier & Tracking</span>
              <span className="font-mono font-bold text-[#002c11] text-[11px] block truncate">
                {order?.trackingCode || 'TRK-PENDING'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#717970] uppercase font-bold block">Customer Details</span>
              <span className="font-bold text-[#002c11] block truncate">
                {order?.customerName || payment?.customerName || 'Conscious Buyer'}
              </span>
            </div>
          </div>

          {/* Delivery Destination Snapshot */}
          {order?.shippingAddress && (
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                Verified Shipping Destination
              </span>
              <p className="text-[11px] text-gray-800 leading-relaxed font-medium">
                {order.shippingAddress.fullName} • {order.shippingAddress.phone} <br />
                {order.shippingAddress.streetAddress}, {order.shippingAddress.area || ''}, {order.shippingAddress.upazila || ''}, {order.shippingAddress.district} ({order.shippingAddress.division})
              </p>
            </div>
          )}

          {/* Itemized Breakdown Table */}
          {items.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#002c11] uppercase tracking-wider block">
                Purchased Artisan Items ({items.length})
              </span>
              <div className="border border-[#c1c9be]/50 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f4fbf4] text-[#002c11] border-b border-[#c1c9be]/50 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c1c9be]/30 text-[11px]">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#fbf9f8]/60">
                        <td className="p-2.5">
                          <p className="font-bold text-[#002c11]">{item.productNameSnapshot || item.title}</p>
                          <p className="text-[10px] text-[#717970]">
                            Seller: {item.sellerSnapshot?.sellerName || item.sellerName || 'Artisan Workshop'} {item.sku ? `• SKU: ${item.sku}` : ''}
                          </p>
                        </td>
                        <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                        <td className="p-2.5 text-right font-mono">৳{item.priceSnapshot || item.price}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#002c11]">
                          ৳{(item.priceSnapshot || item.price) * item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Orders / Artisan Breakdown */}
          {subOrders.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#002c11] uppercase tracking-wider block">
                Artisan Workshop Breakdown ({subOrders.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subOrders.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-[#c1c9be]/40 bg-white flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-[#002c11] block">{s.sellerName}</span>
                      <span className="text-[10px] text-[#717970] block font-mono">
                        Sub-Order: {s.id}
                      </span>
                    </div>
                    <div className="text-right font-mono font-bold text-[#002c11]">
                      ৳{s.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Summary Table */}
          <div className="border-t border-[#c1c9be]/50 pt-3 space-y-1.5 bg-[#fbf9f8] p-4 rounded-2xl">
            <div className="flex justify-between text-[#717970]">
              <span>Items Subtotal</span>
              <span className="font-mono">৳{order?.subtotal || amount}</span>
            </div>
            {Boolean(order?.discount || order?.discountAmount) && (
              <div className="flex justify-between text-[#1b6d24]">
                <span>Coupon Discount ({order?.discountCode || order?.couponCode || 'PROMO'})</span>
                <span className="font-mono">-৳{order?.discount || order?.discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between text-[#717970]">
              <span>Eco Delivery Charge ({order?.deliveryMethod === 'express' ? 'Express Dispatch' : 'Standard Delivery'})</span>
              <span className="font-mono">
                {order?.shippingFee === 0 || order?.deliveryFee === 0 ? 'FREE' : `৳${order?.shippingFee ?? order?.deliveryFee ?? 60}`}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm text-[#002c11] border-t border-[#c1c9be]/50 pt-2">
              <span>Grand Total Amount</span>
              <span className="font-mono text-[#1b6d24] font-black text-base">৳{amount} BDT</span>
            </div>
          </div>

          {/* Artisan Guarantee Policy & Eco Seal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-[#e8f5e9]/60 rounded-xl border border-[#1b6d24]/20 flex items-start gap-2 text-[10px] text-[#1b6d24]">
              <span className="material-symbols-outlined text-base shrink-0">workspace_premium</span>
              <span>
                <strong>7-Day Artisan Guarantee:</strong> Free returns and artisan inspection guarantee for authentic zero-plastic handcrafted goods.
              </span>
            </div>
            <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#c1c9be]/40 flex items-center justify-between text-[10px] text-[#414941]">
              <div>
                <span className="font-bold block text-[#002c11]">Official SUNNO Eco Seal</span>
                <span>Authentic Fair-Trade Verified</span>
              </div>
              <span className="material-symbols-outlined text-2xl text-[#1b6d24]">verified</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-[#fbf9f8] border-t border-[#c1c9be]/50 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#717970] hover:bg-[#e7e8e7] rounded-xl transition-colors"
          >
            Close Receipt
          </button>
          
          <div className="flex flex-wrap items-center gap-2">
            {onTrackOrder && (
              <button
                onClick={() => onTrackOrder(orderId)}
                className="px-3.5 py-2 bg-white border border-[#002c11] text-[#002c11] hover:bg-[#f4fbf4] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">local_shipping</span>
                Track Order
              </button>
            )}

            {/* Direct Download Digital Receipt (PNG) */}
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#1b6d24] border border-[#1b6d24]/30 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Download high-resolution digital receipt image (PNG)"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Download Digital Receipt (PNG)
            </button>

            {/* Print / Save as PDF Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print official receipt or Save as PDF"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Print / Save as PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


