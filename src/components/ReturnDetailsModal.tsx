import React, { useState } from 'react';
import { ReturnRequest, ReturnStatus, UserRole, FaultAttribution } from '../types';
import { updateReturnStatus } from '../services/returnService';
import { createRefundForReturn, processAndCompleteRefund } from '../services/refundService';
import { scheduleReversePickup } from '../services/reverseLogisticsService';
import { getReturnStatusLabel, getBengaliStatusDescription } from '../services/returnStateMachine';
import { DisputeModal } from './DisputeModal';
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Box,
  Search,
  DollarSign,
  AlertTriangle,
  X,
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  Eye,
  Video,
} from 'lucide-react';

interface ReturnDetailsModalProps {
  returnReq?: ReturnRequest;
  returnRequest?: ReturnRequest;
  onClose: () => void;
  onUpdate?: (updated: ReturnRequest) => void;
  onReturnUpdated?: (updated: ReturnRequest) => void;
  actor: { id: string; name: string; role: UserRole; email?: string; phone?: string };
}

export const ReturnDetailsModal: React.FC<ReturnDetailsModalProps> = ({
  returnReq,
  returnRequest,
  onClose,
  onUpdate,
  onReturnUpdated,
  actor,
}) => {
  const initialReq = returnReq || returnRequest!;
  const [currentReq, setCurrentReq] = useState<ReturnRequest>(initialReq);
  const notifyUpdate = (updated: ReturnRequest) => {
    if (onUpdate) onUpdate(updated);
    if (onReturnUpdated) onReturnUpdated(updated);
  };
  const [actionNote, setActionNote] = useState('');
  const [courierName, setCourierName] = useState('Steadfast Reverse Logistics');
  const [courierTracking, setCourierTracking] = useState(
    currentReq.courierTracking || currentReq.returnTrackingNumber || `RET-STF-${Date.now().toString().slice(-6)}`
  );
  const [inspectionStatus, setInspectionStatus] = useState<'PASS' | 'FAIL' | 'PARTIAL'>('PASS');
  const [faultAttribution, setFaultAttribution] = useState<FaultAttribution>('SELLER_DEFECT');
  const [inspectionNotes, setInspectionNotes] = useState('');

  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const statusMilestones: { key: string; label: string; desc: string }[] = [
    { key: 'REQUESTED', label: 'Requested', desc: 'Customer submitted claim' },
    { key: 'UNDER_REVIEW', label: 'Reviewing', desc: 'Artisan & Concierge check' },
    { key: 'APPROVED', label: 'Approved', desc: 'Return authorization granted' },
    { key: 'PICKUP_SCHEDULED', label: 'Pickup', desc: 'Courier dispatch assigned' },
    { key: 'PICKED_UP', label: 'Picked Up', desc: 'Collected from patron' },
    { key: 'IN_TRANSIT', label: 'Transit', desc: 'En route to artisan hub' },
    { key: 'RECEIVED', label: 'Received', desc: 'Artisan workshop intake' },
    { key: 'INSPECTION', label: 'Inspected', desc: 'Integrity verified' },
    { key: 'REFUND_PENDING', label: 'Refund Queued', desc: 'Disbursement pending' },
    { key: 'REFUNDED', label: 'Refunded', desc: 'Payment completed' },
  ];

  const getCurrentStepIndex = () => {
    if (currentReq.status === 'REJECTED' || currentReq.status === 'CANCELLED' || currentReq.status === 'DISPUTED') return -1;
    const normalized = currentReq.status === 'RETURN_REQUESTED' ? 'REQUESTED' : currentReq.status === 'RECEIVED_BY_SELLER' ? 'RECEIVED' : currentReq.status === 'COMPLETED' ? 'REFUNDED' : currentReq.status;
    return statusMilestones.findIndex((m) => m.key === normalized);
  };

  const handleStatusChange = async (newStatus: ReturnStatus, defaultNote?: string, extraParams?: any) => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const updated = await updateReturnStatus({
        returnId: currentReq.id,
        newStatus,
        actor: { id: actor.id, name: actor.name, role: actor.role },
        note: actionNote || defaultNote,
        courierTracking: newStatus === 'PICKUP_SCHEDULED' ? courierTracking : undefined,
        courierName: newStatus === 'PICKUP_SCHEDULED' ? courierName : undefined,
        inspectionStatus: extraParams?.inspectionStatus,
        inspectionNotes: extraParams?.inspectionNotes,
        faultAttribution: extraParams?.faultAttribution,
        allowAdminOverride: actor.role === 'admin',
      });

      // If status moved to REFUND_PENDING or APPROVED_FOR_REFUND, initialize refund record automatically
      if (newStatus === 'REFUND_PENDING' || newStatus === 'APPROVED_FOR_REFUND') {
        try {
          await createRefundForReturn(updated, actor);
        } catch (rErr) {
          console.warn('Auto refund creation notice:', rErr);
        }
      }

      setCurrentReq(updated);
      notifyUpdate(updated);
      setActionNote('');
      setSuccessMsg(`Status updated to ${newStatus.replace(/_/g, ' ')} successfully.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update return status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleCourier = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const result = await scheduleReversePickup({
        returnId: currentReq.id,
        courierId: 'steadfast',
        customerAddress: currentReq.pickupAddress || {
          name: currentReq.customerName,
          phone: currentReq.customerPhone,
          street: 'Dhaka',
          district: 'Dhaka',
          division: 'Dhaka',
          country: 'Bangladesh',
        },
        warehouseAddress: {
          name: currentReq.sellerStoreName || 'Artisan Hub',
          phone: '01700000000',
          street: 'Artisan Workshop Hub',
          district: 'Dhaka',
          division: 'Dhaka',
          country: 'Bangladesh',
        },
        packageWeightKg: 1,
        itemDescription: currentReq.productTitle,
        itemValue: currentReq.refundAmount,
        actor,
      });

      if (result.success) {
        setCourierTracking(result.trackingNumber);
        await handleStatusChange('PICKUP_SCHEDULED', `Reverse courier booked via ${result.provider} (Tracking: ${result.trackingNumber})`);
        setSuccessMsg(`Reverse courier pickup scheduled! Consignment ID: ${result.consignmentId || result.trackingNumber}`);
      } else {
        throw new Error(result.error || 'Failed to book reverse courier.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not schedule courier pickup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectRefundCompletion = async () => {
    if (actor.role !== 'admin') return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const updated = await updateReturnStatus({
        returnId: currentReq.id,
        newStatus: 'REFUNDED',
        actor: { id: actor.id, name: actor.name, role: actor.role },
        note: `Refund disbursed by Admin (৳${currentReq.refundAmount})`,
        allowAdminOverride: true,
      });

      setCurrentReq(updated);
      notifyUpdate(updated);
      setSuccessMsg(`Full refund of ৳${currentReq.refundAmount} disbursed and completed.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete refund.');
    } finally {
      setIsLoading(false);
    }
  };

  const isCustomer = actor.role === 'customer';
  const isSeller = actor.role === 'seller';
  const isAdmin = actor.role === 'admin';
  const currentStep = getCurrentStepIndex();

  return (
    <div id="return-details-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div id="return-details-modal-content" className="bg-[#fbf9f8] w-full max-w-3xl rounded-3xl border border-[#c1c9be]/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#c1c9be]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#002c11]">Return Ticket #{currentReq.id.slice(-8)}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1b6d24]/10 text-[#1b6d24]">
                  {getReturnStatusLabel(currentReq.status, 'bn')}
                </span>
              </div>
              <p className="text-xs text-[#717970]">
                Order #{currentReq.orderNumber} • Artisan: {currentReq.sellerStoreName || 'Verified Artisan'}
              </p>
            </div>
          </div>
          <button
            id="close-return-details-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f0eded] text-[#717970] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Bengali & English Status Banner */}
          <div className="p-4 bg-[#f2f8f3] border border-[#a0f399]/40 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#1b6d24] tracking-wider">বর্তমান অবস্থা (Status)</span>
              <h4 className="text-sm font-extrabold text-[#002c11] mt-0.5">
                {getReturnStatusLabel(currentReq.status, 'bn')} ({getReturnStatusLabel(currentReq.status, 'en')})
              </h4>
              <p className="text-[11px] text-[#426b4d] mt-0.5">
                {getBengaliStatusDescription(currentReq.status)}
              </p>
            </div>
            {/* Dispute Trigger Button */}
            {(currentReq.status === 'REJECTED' || currentReq.status === 'DISPUTED' || isCustomer || isSeller) && currentReq.status !== 'REFUNDED' && (
              <button
                type="button"
                onClick={() => setIsDisputeModalOpen(true)}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-colors"
              >
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>{currentReq.status === 'DISPUTED' ? 'View Dispute Details' : 'Open Dispute'}</span>
              </button>
            )}
          </div>

          {/* Stepper Timeline */}
          {currentStep !== -1 && (
            <div className="bg-white p-4 rounded-2xl border border-[#c1c9be]/30">
              <h4 className="text-[11px] font-bold text-[#002c11] uppercase tracking-wider mb-4">
                Return & Refund Progression
              </h4>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 text-center">
                {statusMilestones.map((m, idx) => {
                  const isDone = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div key={m.key} className="flex flex-col items-center group relative">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                          isDone
                            ? 'bg-[#1b6d24] text-white shadow-xs'
                            : 'bg-[#f0eded] text-[#717970]'
                        } ${isCurrent ? 'ring-2 ring-[#a0f399] ring-offset-1' : ''}`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[9px] font-semibold leading-tight line-clamp-1 ${isCurrent ? 'text-[#1b6d24] font-bold' : 'text-[#717970]'}`}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Return Summary & Financial Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Card */}
            <div className="bg-white p-4 rounded-2xl border border-[#c1c9be]/30 space-y-3">
              <h4 className="text-[11px] font-bold text-[#002c11] uppercase tracking-wider">Item Details</h4>
              <div className="flex items-center gap-3">
                <img
                  src={currentReq.productImage || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=200'}
                  alt={currentReq.productTitle}
                  className="w-16 h-16 rounded-xl object-cover border border-[#c1c9be]/30 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h5 className="font-bold text-[#002c11] line-clamp-1">{currentReq.productTitle}</h5>
                  <p className="text-[#717970]">
                    Quantity: <strong>{currentReq.quantity}</strong> • Reason: <span className="font-medium text-[#002c11]">{currentReq.returnReason}</span>
                  </p>
                  <p className="text-[#717970]">
                    Resolution: <strong className="text-[#1b6d24]">{currentReq.requestedResolution || 'REFUND'}</strong>
                  </p>
                </div>
              </div>
              {currentReq.description && (
                <div className="p-2.5 bg-[#fbf9f8] rounded-xl border border-[#c1c9be]/30 text-[11px] text-[#414941]">
                  <strong>Statement: </strong> {currentReq.description}
                </div>
              )}
            </div>

            {/* Refund & Account Card */}
            <div className="bg-white p-4 rounded-2xl border border-[#c1c9be]/30 space-y-3">
              <h4 className="text-[11px] font-bold text-[#002c11] uppercase tracking-wider">Financial Breakdown</h4>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#717970]">Total Refund Value:</span>
                  <strong className="text-sm font-extrabold text-[#1b6d24]">৳{currentReq.refundAmount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#717970]">Channel:</span>
                  <span className="font-bold text-[#002c11] uppercase">{currentReq.refundMethod}</span>
                </div>
                {currentReq.refundAccountDetails?.accountNumber && (
                  <div className="flex justify-between">
                    <span className="text-[#717970]">Account:</span>
                    <span className="font-mono text-[#002c11]">{currentReq.refundAccountDetails.accountNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#717970]">Courier Tracking:</span>
                  <span className="font-mono font-bold text-[#002c11]">
                    {currentReq.courierTracking || currentReq.returnTrackingNumber || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Photos & Videos */}
          {((currentReq.evidencePhotos && currentReq.evidencePhotos.length > 0) || (currentReq.evidenceVideos && currentReq.evidenceVideos.length > 0)) && (
            <div className="bg-white p-4 rounded-2xl border border-[#c1c9be]/30 space-y-2">
              <h4 className="text-[11px] font-bold text-[#002c11] uppercase tracking-wider">Attached Evidence</h4>
              <div className="flex flex-wrap gap-2">
                {currentReq.evidencePhotos?.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block relative w-16 h-16 rounded-xl border border-[#c1c9be]/50 overflow-hidden group">
                    <img src={url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                  </a>
                ))}
                {currentReq.evidenceVideos?.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    <Video className="w-4 h-4" />
                    <span>Watch Unboxing Video</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Seller / Admin Action Controls */}
          <div className="p-4 bg-white rounded-2xl border border-[#c1c9be]/40 space-y-3">
            <h4 className="text-[11px] font-bold text-[#002c11] uppercase tracking-wider">
              {isAdmin ? 'Platform Concierge & Admin Controls' : isSeller ? 'Artisan Workshop Actions' : 'Customer Actions'}
            </h4>

            {/* Note input */}
            <input
              type="text"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Add audit log note / explanation..."
              className="w-full px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs"
            />

            {/* Actions Grid */}
            <div className="flex flex-wrap gap-2 pt-1">
              {/* Customer Cancel */}
              {isCustomer && (currentReq.status === 'REQUESTED' || currentReq.status === 'RETURN_REQUESTED' || currentReq.status === 'UNDER_REVIEW') && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('CANCELLED', 'Cancelled by customer')}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel Return Claim
                </button>
              )}

              {/* Seller: Approve / Reject Claim */}
              {isSeller && (currentReq.status === 'REQUESTED' || currentReq.status === 'RETURN_REQUESTED' || currentReq.status === 'UNDER_REVIEW') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('APPROVED', 'Return approved by artisan workshop')}
                    disabled={isLoading}
                    className="px-4 py-2 bg-[#1b6d24] hover:bg-[#002c11] text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Approve Return Claim
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('REJECTED', 'Return rejected by artisan workshop')}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Reject Claim
                  </button>
                </>
              )}

              {/* Seller / Admin: Reverse Courier Booking */}
              {(isSeller || isAdmin) && currentReq.status === 'APPROVED' && (
                <button
                  type="button"
                  onClick={handleScheduleCourier}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#002c11] text-[#a0f399] text-xs font-bold rounded-xl hover:bg-[#003d18] transition-colors flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Schedule Reverse Courier Pickup (Steadfast)</span>
                </button>
              )}

              {/* Admin: Courier in transit transitions */}
              {isAdmin && currentReq.status === 'PICKUP_SCHEDULED' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('PICKED_UP', 'Picked up from customer doorstep')}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#1b6d24] text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Confirm Courier Pickup
                </button>
              )}

              {isAdmin && currentReq.status === 'PICKED_UP' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('IN_TRANSIT', 'In transit to artisan workshop')}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#1b6d24] text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Mark In Transit
                </button>
              )}

              {/* Seller: Workshop Delivery Intake */}
              {isSeller && (currentReq.status === 'IN_TRANSIT' || currentReq.status === 'PICKED_UP') && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('RECEIVED', 'Parcel received at artisan workshop')}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#002c11] text-[#a0f399] text-xs font-bold rounded-xl transition-colors"
                >
                  Confirm Intake at Workshop
                </button>
              )}

              {/* Seller / Admin: Inspection & Approval */}
              {(isSeller || isAdmin) && (currentReq.status === 'RECEIVED' || currentReq.status === 'RECEIVED_BY_SELLER') && (
                <div className="w-full space-y-2.5 pt-2 border-t border-[#c1c9be]/30">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#002c11] mb-1">Inspection Result</label>
                      <select
                        value={inspectionStatus}
                        onChange={(e) => setInspectionStatus(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-lg text-xs"
                      >
                        <option value="PASS">Pass (Item Condition Valid)</option>
                        <option value="PARTIAL">Partial Issue</option>
                        <option value="FAIL">Fail (Misuse / False Claim)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#002c11] mb-1">Fault Attribution</label>
                      <select
                        value={faultAttribution}
                        onChange={(e) => setFaultAttribution(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-lg text-xs"
                      >
                        <option value="SELLER_DEFECT">Artisan Workshop Defect</option>
                        <option value="TRANSIT_DAMAGE">Courier Transit Damage</option>
                        <option value="CUSTOMER_MISUSE">Customer Misuse / False Claim</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#002c11] mb-1">Inspection Note</label>
                      <input
                        type="text"
                        value={inspectionNotes}
                        onChange={(e) => setInspectionNotes(e.target.value)}
                        placeholder="Craft condition details..."
                        className="w-full px-2 py-1.5 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          'REFUND_PENDING',
                          `Inspected: ${inspectionStatus} (${faultAttribution}). Notes: ${inspectionNotes}`,
                          { inspectionStatus, faultAttribution, inspectionNotes }
                        )
                      }
                      disabled={isLoading}
                      className="px-4 py-2 bg-[#1b6d24] text-white font-bold rounded-xl text-xs"
                    >
                      Complete Inspection &amp; Approve for Refund
                    </button>
                  </div>
                </div>
              )}

              {/* Admin: Complete Financial Disbursement */}
              {isAdmin && (currentReq.status === 'REFUND_PENDING' || currentReq.status === 'APPROVED_FOR_REFUND' || currentReq.status === 'INSPECTION') && (
                <button
                  type="button"
                  onClick={handleDirectRefundCompletion}
                  disabled={isLoading}
                  className="px-5 py-2 bg-[#002c11] text-[#a0f399] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Execute Payment Refund (৳{currentReq.refundAmount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Audit History Log */}
          <div className="bg-white p-4 rounded-2xl border border-[#c1c9be]/30 space-y-3">
            <h4 className="text-[11px] font-bold text-[#002c11] uppercase tracking-wider">
              Audit Event Log ({currentReq.statusHistory?.length || 0} events)
            </h4>
            <div className="space-y-2.5">
              {currentReq.statusHistory?.map((log, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs pb-2 border-b border-[#f0eded] last:border-none">
                  <div className="w-5 h-5 rounded-full bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    ✓
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <strong className="text-[#002c11] font-semibold">{log.title}</strong>
                      <span className="text-[10px] text-[#717970]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[#414941] text-[11px] mt-0.5">{log.note || log.description}</p>
                    <span className="text-[10px] text-[#717970] italic">
                      by {log.actorName} ({log.actorRole})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-[#c1c9be]/30 flex items-center justify-end">
          <button
            id="done-return-details-btn"
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-[#002c11] text-[#a0f399] text-xs font-bold rounded-full hover:bg-[#003d18] transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>

      {/* Embedded Dispute Modal */}
      {isDisputeModalOpen && (
        <DisputeModal
          returnRequest={currentReq}
          onClose={() => setIsDisputeModalOpen(false)}
          onSuccess={(disputeId) => {
            setIsDisputeModalOpen(false);
            setSuccessMsg(`Dispute #${disputeId} submitted to SUNNO Arbitration Committee.`);
            handleStatusChange('DISPUTED', `Customer escalated dispute #${disputeId}`);
          }}
          actor={actor}
        />
      )}
    </div>
  );
};
