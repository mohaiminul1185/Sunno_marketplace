import React, { useState, useEffect, useMemo } from 'react';
import { Order, ReturnReason, ReturnPolicySetting, UserRole, ReturnResolutionType, ReturnType, UserAddress } from '../types';
import { createReturnRequest, fetchReturnPolicy, verifyReturnEligibility } from '../services/returnService';
import { calculateItemRefund } from '../services/refundCalculator';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Image as ImageIcon,
  Video,
  Info,
  X,
  ShieldCheck,
  RefreshCw,
  MapPin,
  FileText,
  Calculator,
} from 'lucide-react';

interface ReturnRequestModalProps {
  order: Order;
  selectedProductId?: string;
  onClose: () => void;
  onSuccess: (returnId: string) => void;
  actor: { id: string; name: string; email?: string; phone?: string; role: UserRole };
}

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  order,
  selectedProductId,
  onClose,
  onSuccess,
  actor,
}) => {
  const [productId, setProductId] = useState<string>(
    selectedProductId || order.items?.[0]?.productId || order.items?.[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<ReturnReason>('Damaged item');
  const [requestedResolution, setRequestedResolution] = useState<ReturnResolutionType>('REFUND');
  const [returnType, setReturnType] = useState<ReturnType>('PARTIAL_ITEM');
  const [description, setDescription] = useState<string>('');
  const [customerComments, setCustomerComments] = useState<string>('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoInputUrl, setPhotoInputUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');

  // Pickup address state
  const [pickupAddress, setPickupAddress] = useState<UserAddress>(
    order.shippingAddress || {
      name: actor.name,
      phone: order.customerPhone || '01700000000',
      street: 'Road 12, House 45',
      district: order.district || 'Dhaka',
      division: 'Dhaka',
      country: 'Bangladesh',
    }
  );

  const [refundMethod, setRefundMethod] = useState<'original_gateway' | 'bkash' | 'nagad' | 'rocket' | 'bank'>(
    order.paymentMethod === 'cod' ? 'bkash' : 'original_gateway'
  );
  const [accountNumber, setAccountNumber] = useState<string>(order.customerPhone || '');
  const [bankName, setBankName] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>(actor.name || '');

  const [policy, setPolicy] = useState<ReturnPolicySetting | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [eligibility, setEligibility] = useState<{
    isEligible: boolean;
    reason?: string;
    maxQuantity: number;
    unitPrice: number;
    daysRemaining?: number;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    async function loadPolicyAndCheck() {
      setIsVerifying(true);
      setErrorMsg('');
      try {
        const pol = await fetchReturnPolicy();
        setPolicy(pol);

        if (productId) {
          const res = await verifyReturnEligibility(order, productId, actor.id);
          setEligibility(res);
          if (res.maxQuantity > 0 && quantity > res.maxQuantity) {
            setQuantity(res.maxQuantity);
          }
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to verify return eligibility.');
      } finally {
        setIsVerifying(false);
      }
    }
    loadPolicyAndCheck();
  }, [order, productId, actor.id]);

  const selectedItem = order.items?.find((it) => it.productId === productId || it.id === productId);

  // Centralized Live Refund Calculation
  const refundCalculation = useMemo(() => {
    return calculateItemRefund({
      order,
      productId,
      quantity,
      returnReason: reason,
      isFullOrderReturn: returnType === 'FULL' || quantity === order.items?.reduce((s, i) => s + i.quantity, 0),
    });
  }, [order, productId, quantity, reason, returnType]);

  const handleAddPhoto = () => {
    if (!photoInputUrl.trim()) return;
    if (photoUrls.length >= 6) {
      setErrorMsg('Maximum 6 photos permitted.');
      return;
    }
    setPhotoUrls([...photoUrls, photoInputUrl.trim()]);
    setPhotoInputUrl('');
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibility?.isEligible) {
      setErrorMsg(eligibility?.reason || 'Item is not eligible for return.');
      return;
    }

    if (!description.trim() || description.length < 10) {
      setErrorMsg('Please provide a detailed description (at least 10 characters).');
      return;
    }

    if (requestedResolution === 'REFUND' && refundMethod !== 'original_gateway' && !accountNumber.trim()) {
      setErrorMsg('Please provide your mobile wallet or bank account number for COD refund disbursement.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const created = await createReturnRequest({
        order,
        productId,
        quantity,
        returnReason: reason,
        description: description.trim(),
        evidencePhotos: photoUrls,
        evidenceVideos: videoUrl.trim() ? [videoUrl.trim()] : [],
        requestedResolution,
        returnType,
        customerComments: customerComments.trim(),
        refundMethod,
        refundAccountDetails: {
          channel: refundMethod,
          accountNumber: accountNumber.trim(),
          bankName: bankName.trim(),
          branchName: branchName.trim(),
          accountHolder: accountHolder.trim(),
        },
        pickupAddress,
        actor,
      });

      onSuccess(created.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit return request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="return-request-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div id="return-request-modal-content" className="bg-[#fbf9f8] w-full max-w-2xl rounded-3xl border border-[#c1c9be]/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-[#c1c9be]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#002c11]">Return & Replacement Request</h3>
              <p className="text-[11px] text-[#717970]">
                Order #{order.orderNumber || order.id.slice(-8).toUpperCase()} • Phase 17 Return Engine
              </p>
            </div>
          </div>
          <button
            id="close-return-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f0eded] text-[#717970] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Selection */}
          <div>
            <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-2">
              1. Select Item to Return
            </label>
            <div className="space-y-2">
              {order.items?.map((item) => {
                const isSelected = (item.productId || item.id) === productId;
                return (
                  <div
                    key={item.productId || item.id}
                    onClick={() => setProductId(item.productId || item.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-white border-[#1b6d24] shadow-sm ring-2 ring-[#1b6d24]/10'
                        : 'bg-white/60 border-[#c1c9be]/40 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image || item.images?.[0] || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=200'}
                        alt={item.title}
                        className="w-12 h-12 rounded-xl object-cover border border-[#c1c9be]/30"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-[#002c11] line-clamp-1">{item.title || item.name}</h4>
                        <p className="text-[11px] text-[#717970]">
                          ৳{item.price} • Purchased Qty: {item.quantity} • Artisan: {item.sellerName || 'SUNNO Cooperative'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#1b6d24] text-white flex items-center justify-center">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Eligibility status */}
          {isVerifying ? (
            <div className="p-3 bg-[#f0eded] rounded-2xl text-xs text-[#717970] animate-pulse flex items-center gap-2">
              <Info className="w-4 h-4 text-[#1b6d24]" />
              <span>Verifying return eligibility and artisan policy...</span>
            </div>
          ) : eligibility && !eligibility.isEligible ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="block font-bold">Return Not Permitted</strong>
                <span>{eligibility.reason}</span>
              </div>
            </div>
          ) : null}

          {/* Form Fields only if eligible */}
          {eligibility?.isEligible && (
            <>
              {/* Return Policy Notice */}
              <div className="p-3.5 bg-[#e8f5e9]/70 border border-[#c1c9be]/30 rounded-2xl text-[11px] text-[#002c11] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#1b6d24]" />
                  <span>
                    SUNNO Fair-Trade Guarantee: <strong>{policy?.returnWindowDays || 7} Days</strong> Window ({eligibility.daysRemaining ?? 7} days remaining)
                  </span>
                </div>
                <span className="font-semibold text-[#1b6d24]">
                  Unit Price: ৳{selectedItem?.price || eligibility.unitPrice}
                </span>
              </div>

              {/* Resolution Type & Return Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
                    2. Requested Resolution *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRequestedResolution('REFUND')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        requestedResolution === 'REFUND'
                          ? 'bg-[#1b6d24] text-white border-[#1b6d24] shadow-xs'
                          : 'bg-white text-[#717970] border-[#c1c9be]/60 hover:bg-[#f0eded]'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Refund Money</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestedResolution('EXCHANGE')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        requestedResolution === 'EXCHANGE'
                          ? 'bg-[#1b6d24] text-white border-[#1b6d24] shadow-xs'
                          : 'bg-white text-[#717970] border-[#c1c9be]/60 hover:bg-[#f0eded]'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Exchange Item</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
                    Return Scope
                  </label>
                  <select
                    id="return-type-select"
                    value={returnType}
                    onChange={(e) => setReturnType(e.target.value as ReturnType)}
                    className="w-full px-3 py-2.5 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
                  >
                    <option value="PARTIAL_ITEM">Return Specific Item Only</option>
                    <option value="FULL">Return Entire Consignment</option>
                  </select>
                </div>
              </div>

              {/* Quantity and Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
                    Return Quantity
                  </label>
                  <select
                    id="return-quantity-select"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
                  >
                    {Array.from({ length: eligibility.maxQuantity }, (_, i) => i + 1).map((q) => (
                      <option key={q} value={q}>
                        {q} {q === 1 ? 'unit' : 'units'} (Gross: ৳{(selectedItem?.price || eligibility.unitPrice) * q})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
                    Return Reason *
                  </label>
                  <select
                    id="return-reason-select"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReturnReason)}
                    className="w-full px-3 py-2.5 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
                  >
                    <option value="Damaged item">Damaged item (Cracked / Broken in Transit)</option>
                    <option value="Wrong item">Wrong item (Received different craft)</option>
                    <option value="Missing item">Missing item / Incomplete parts</option>
                    <option value="Defective item">Defective item (Functional or weave flaw)</option>
                    <option value="Product not as described">Product not as described on page</option>
                    <option value="Quality issue">Quality issue / Material defect</option>
                    <option value="Size/variation issue">Size or color variation issue</option>
                    <option value="Customer remorse">Customer remorse / Changed mind</option>
                    <option value="Other">Other reason</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Live Refund Breakdown */}
              <div className="p-3.5 bg-[#f2f8f3] border border-[#a0f399]/40 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-[#002c11] mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-[#1b6d24]" />
                    <span>Calculated Refund Breakdown:</span>
                  </div>
                  <span className="text-sm font-extrabold text-[#1b6d24]">৳{refundCalculation.netRefundAmount}</span>
                </div>
                <p className="text-[11px] text-[#426b4d] font-mono leading-relaxed">
                  {refundCalculation.breakdownSummary}
                </p>
                {refundCalculation.shippingRefund > 0 && (
                  <p className="text-[10px] text-[#1b6d24] mt-1 font-medium">
                    ✓ Full reverse shipping (৳{refundCalculation.shippingRefund}) covered by Artisan/Platform policy for defect/damage claim.
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
                  Detailed Description *
                </label>
                <textarea
                  id="return-description-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what is wrong with the delivered item to guide our inspection team..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24] resize-none"
                  required
                />
              </div>

              {/* Photo Evidence */}
              <div>
                <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
                  Photo Evidence (Optional, Recommended for Damage)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    id="return-photo-url-input"
                    type="url"
                    value={photoInputUrl}
                    onChange={(e) => setPhotoInputUrl(e.target.value)}
                    placeholder="Paste image URL (https://...)"
                    className="flex-1 px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
                  />
                  <button
                    id="add-photo-btn"
                    type="button"
                    onClick={handleAddPhoto}
                    className="px-3 py-2 bg-[#e8f5e9] text-[#1b6d24] text-xs font-bold rounded-xl hover:bg-[#c8e6c9] transition-colors"
                  >
                    Add Photo
                  </button>
                </div>

                {photoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {photoUrls.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl border border-[#c1c9be]/50 overflow-hidden group">
                        <img src={url} alt="Proof" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-80 hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video Evidence URL */}
              <div>
                <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
                  Video Unboxing / Demonstration (Optional)
                </label>
                <div className="relative">
                  <Video className="w-4 h-4 text-[#717970] absolute left-3 top-2.5" />
                  <input
                    id="return-video-url-input"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Video Link (Drive, Dropbox, Loom, YouTube)"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
                  />
                </div>
              </div>

              {/* Pickup Address */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#c1c9be]/40 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#002c11]">
                  <MapPin className="w-3.5 h-3.5 text-[#1b6d24]" />
                  <span>Reverse Courier Pickup Address</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={pickupAddress.street}
                    onChange={(e) => setPickupAddress({ ...pickupAddress, street: e.target.value })}
                    placeholder="Street Address"
                    className="px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs"
                    required
                  />
                  <input
                    type="text"
                    value={pickupAddress.district}
                    onChange={(e) => setPickupAddress({ ...pickupAddress, district: e.target.value })}
                    placeholder="District"
                    className="px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              {/* Refund Method & Account Details (if refund requested) */}
              {requestedResolution === 'REFUND' && (
                <div className="p-4 bg-white rounded-2xl border border-[#c1c9be]/40 space-y-3">
                  <h4 className="text-xs font-bold text-[#002c11]">Refund Disbursement Account</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#717970] mb-1 font-medium">Refund Method</label>
                      <select
                        id="refund-method-select"
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
                      >
                        <option value="original_gateway">Original Payment Gateway</option>
                        <option value="bkash">bKash Mobile Wallet</option>
                        <option value="nagad">Nagad Mobile Wallet</option>
                        <option value="rocket">Rocket Mobile Wallet</option>
                        <option value="bank">Direct Bank Transfer</option>
                      </select>
                    </div>

                    {refundMethod !== 'original_gateway' && (
                      <div>
                        <label className="block text-[11px] text-[#717970] mb-1 font-medium">
                          {refundMethod === 'bank' ? 'Account Number' : `${refundMethod.toUpperCase()} Number`} *
                        </label>
                        <input
                          id="refund-account-number"
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {refundMethod === 'bank' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Bank Name (e.g. Dutch Bangla Bank)"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11]"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Branch Name (e.g. Dhanmondi)"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        className="px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11]"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Account Holder Name"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11]"
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-[#c1c9be]/30 flex items-center justify-between">
            <button
              id="cancel-return-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-[#717970] hover:text-[#002c11] transition-colors"
            >
              Cancel
            </button>

            {eligibility?.isEligible && (
              <button
                id="submit-return-request-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#002c11] text-[#a0f399] text-xs font-bold rounded-full hover:bg-[#003d18] transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-[#a0f399] border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      {requestedResolution === 'EXCHANGE'
                        ? 'Request Exchange Dispatch'
                        : `Confirm Return (৳${refundCalculation.netRefundAmount})`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
