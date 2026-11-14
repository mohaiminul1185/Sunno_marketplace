import React, { useState } from 'react';
import { DisputeReason, DisputeResolutionOffer, ReturnRequest, UserRole } from '../types';
import { openDispute } from '../services/disputeService';
import {
  AlertOctagon,
  X,
  Upload,
  Image as ImageIcon,
  Video,
  ShieldAlert,
  CheckCircle,
  FileText,
} from 'lucide-react';

interface DisputeModalProps {
  returnRequest: ReturnRequest;
  onClose: () => void;
  onSuccess: (disputeId: string) => void;
  actor: { id: string; name: string; email?: string; phone?: string; role: UserRole };
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  returnRequest,
  onClose,
  onSuccess,
  actor,
}) => {
  const [reason, setReason] = useState<DisputeReason>('REJECTED_UNFAIRLY');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [desiredOutcome, setDesiredOutcome] = useState<DisputeResolutionOffer>('FULL_REFUND');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [evidenceInput, setEvidenceInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleAddEvidence = () => {
    if (!evidenceInput.trim()) return;
    if (evidenceUrls.length >= 6) {
      setErrorMsg('Maximum 6 evidence attachments permitted.');
      return;
    }
    setEvidenceUrls([...evidenceUrls, evidenceInput.trim()]);
    setEvidenceInput('');
  };

  const handleRemoveEvidence = (idx: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.length < 15) {
      setErrorMsg('Please provide a detailed dispute statement (at least 15 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const dispute = await openDispute({
        returnId: returnRequest.id,
        orderId: returnRequest.orderId,
        orderNumber: returnRequest.orderNumber,
        customerId: returnRequest.customerId,
        customerName: returnRequest.customerName,
        customerEmail: returnRequest.customerEmail,
        customerPhone: returnRequest.customerPhone,
        sellerId: returnRequest.sellerId,
        sellerStoreName: returnRequest.sellerStoreName,
        reason,
        description: description.trim(),
        evidenceUrls,
        openedBy: actor.role === 'customer' ? 'CUSTOMER' : 'SELLER',
        disputedAmount: returnRequest.refundAmount || 0,
        desiredOutcome,
        priority,
        actor,
      });

      onSuccess(dispute.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to open dispute. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="dispute-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div id="dispute-modal-content" className="bg-[#fbf9f8] w-full max-w-xl rounded-3xl border border-[#c1c9be]/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#c1c9be]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002c11]">Open Formal Dispute</h3>
              <p className="text-xs text-[#717970]">
                Return #{returnRequest.id.slice(-8)} • Order #{returnRequest.orderNumber}
              </p>
            </div>
          </div>
          <button
            id="close-dispute-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f0eded] text-[#717970] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-xs text-amber-900 leading-relaxed">
            <strong>SUNNO Fair Dispute Mediation:</strong> Our dispute resolution committee inspects artisan workshop logs, courier timestamps, and photo evidence to deliver an impartial ruling within 48 hours.
          </div>

          <div>
            <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
              Dispute Grounds *
            </label>
            <select
              id="dispute-reason-select"
              value={reason}
              onChange={(e) => setReason(e.target.value as DisputeReason)}
              className="w-full px-3 py-2.5 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
            >
              <option value="REJECTED_UNFAIRLY">Return rejected unfairly by artisan</option>
              <option value="SELLER_UNRESPONSIVE">Artisan unresponsive beyond SLA window</option>
              <option value="INCORRECT_REFUND_AMOUNT">Calculated refund amount is incorrect</option>
              <option value="ITEM_DAMAGED_IN_SHIPPING">Damage occurred in reverse courier transit</option>
              <option value="COUNTERFEIT_OR_MISREPRESENTED">Item is not authentic eco-handicraft</option>
              <option value="OTHER">Other mediation circumstance</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
                Desired Resolution
              </label>
              <select
                id="dispute-outcome-select"
                value={desiredOutcome}
                onChange={(e) => setDesiredOutcome(e.target.value as DisputeResolutionOffer)}
                className="w-full px-3 py-2.5 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
              >
                <option value="FULL_REFUND">Full Financial Refund (৳{returnRequest.refundAmount})</option>
                <option value="PARTIAL_REFUND">Partial Refund Adjustment</option>
                <option value="REPLACEMENT">Fresh Replacement Item</option>
                <option value="RETURN_ACCEPTED">Accept Original Return Claim</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
                Priority Level
              </label>
              <select
                id="dispute-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
              >
                <option value="NORMAL">Normal Priority (24-48 hr)</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent Escalation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
              Statement of Dispute *
            </label>
            <textarea
              id="dispute-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a clear, factual explanation of the disagreement, noting dates and communication..."
              rows={4}
              className="w-full px-3 py-2.5 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24] resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
              Evidence Links (Image / Video URL)
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                id="dispute-evidence-input"
                type="url"
                value={evidenceInput}
                onChange={(e) => setEvidenceInput(e.target.value)}
                placeholder="https://images.unsplash.com/... or cloud link"
                className="flex-1 px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
              />
              <button
                id="add-evidence-btn"
                type="button"
                onClick={handleAddEvidence}
                className="px-3 py-2 bg-[#e8f5e9] text-[#1b6d24] text-xs font-bold rounded-xl hover:bg-[#c8e6c9] transition-colors"
              >
                Attach
              </button>
            </div>

            {evidenceUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {evidenceUrls.map((url, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl border border-[#c1c9be]/50 overflow-hidden group">
                    <img src={url} alt="Evidence" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidence(idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-80 hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#c1c9be]/30 flex items-center justify-between">
            <button
              id="cancel-dispute-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-[#717970] hover:text-[#002c11] transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-dispute-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-amber-700 text-white text-xs font-bold rounded-full hover:bg-amber-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Filing Dispute...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Submit Dispute for Mediation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
