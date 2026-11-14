import React, { useState } from 'react';
import { SupportTicketCategory, SupportTicketPriority, UserRole, Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { createSupportTicket } from '../services/messagingService';
import { LifeBuoy, AlertTriangle, CheckCircle, X, Send, Paperclip } from 'lucide-react';

export interface SupportTicketModalProps {
  order?: Order | null;
  prefilledOrder?: Order | null;
  relatedOrderId?: string;
  relatedOrderNumber?: string;
  onClose: () => void;
  onSuccess?: (ticketNumber: string) => void;
  onTicketCreated?: (ticket: any) => void;
  actor?: { id: string; name: string; email?: string; phone?: string; role: UserRole };
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  order,
  prefilledOrder,
  relatedOrderId,
  relatedOrderNumber,
  onClose,
  onSuccess,
  onTicketCreated,
  actor,
}) => {
  const { user, userProfile } = useAuth();
  const effectiveOrder = order || prefilledOrder;
  const effectiveOrderId = effectiveOrder?.id || relatedOrderId;
  const effectiveOrderNumber =
    effectiveOrder?.orderNumber ||
    relatedOrderNumber ||
    (effectiveOrder ? effectiveOrder.id.slice(-8).toUpperCase() : undefined);

  const resolvedActor = actor || {
    id: userProfile?.id || user?.uid || 'patron-id',
    name: userProfile?.displayName || user?.displayName || 'Conscious Patron',
    email: userProfile?.email || user?.email || '',
    phone: userProfile?.phone || '',
    role: (userProfile?.role as UserRole) || 'customer',
  };

  const [category, setCategory] = useState<SupportTicketCategory>(
    effectiveOrder || effectiveOrderId ? 'Order Problem' : 'Other'
  );
  const [priority, setPriority] = useState<SupportTicketPriority>('MEDIUM');
  const [subject, setSubject] = useState(
    effectiveOrderNumber
      ? `Inquiry regarding Order #${effectiveOrderNumber}`
      : effectiveOrderId
      ? `Inquiry regarding Order #${effectiveOrderId}`
      : ''
  );
  const [message, setMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddAttachment = () => {
    if (!attachmentUrl.trim()) return;
    setAttachments([...attachments, attachmentUrl.trim()]);
    setAttachmentUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setErrorMsg('Please enter a ticket subject.');
      return;
    }
    if (!message.trim() || message.length < 10) {
      setErrorMsg('Please write a detailed message (minimum 10 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const ticket = await createSupportTicket({
        creatorId: resolvedActor.id,
        creatorName: resolvedActor.name,
        creatorEmail: resolvedActor.email,
        creatorPhone: resolvedActor.phone,
        creatorRole: resolvedActor.role,
        subject: subject.trim(),
        category,
        priority,
        orderId: effectiveOrderId,
        orderNumber: effectiveOrderNumber,
        sellerId: effectiveOrder?.sellerIds?.[0],
        initialMessage: message.trim(),
        attachments,
      });

      if (onSuccess) onSuccess(ticket.ticketNumber);
      if (onTicketCreated) onTicketCreated(ticket);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to open support ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="support-ticket-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div id="support-ticket-modal-content" className="bg-[#fbf9f8] w-full max-w-xl rounded-3xl border border-[#c1c9be]/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#c1c9be]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center font-bold">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002c11]">Open Support Ticket</h3>
              <p className="text-xs text-[#717970]">
                SUNNO Concierge • Direct resolution within 24 hours
              </p>
            </div>
          </div>
          <button
            id="close-ticket-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f0eded] text-[#717970] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                id="ticket-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
              >
                <option value="Order Problem">Order Problem</option>
                <option value="Payment Problem">Payment / bKash Verification</option>
                <option value="Delivery Problem">Delivery / Courier Delay</option>
                <option value="Return/Refund">Return & Refund Escalation</option>
                <option value="Product Problem">Craft Quality Inquiry</option>
                <option value="Seller Problem">Artisan Workshop Communication</option>
                <option value="Account Problem">Account & Security</option>
                <option value="Eco Verification">Eco Verification Inquiry</option>
                <option value="Other">Other Query</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1">
                Urgency Priority
              </label>
              <select
                id="ticket-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
              >
                <option value="LOW">Low - General Question</option>
                <option value="MEDIUM">Medium - Standard Request</option>
                <option value="HIGH">High - Order Action Required</option>
                <option value="URGENT">Urgent - Payment/Security Emergency</option>
              </select>
            </div>
          </div>

          {/* Order reference if provided */}
          {order && (
            <div className="p-2.5 bg-white rounded-xl border border-[#c1c9be]/40 text-xs text-[#002c11] flex items-center justify-between">
              <span>Linked Order: #{order.orderNumber || order.id.slice(-8).toUpperCase()}</span>
              <span className="font-semibold text-[#1b6d24]">Total: ৳{order.total}</span>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1">
              Ticket Subject *
            </label>
            <input
              id="ticket-subject-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your question or issue..."
              className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
              required
            />
          </div>

          {/* Detailed Message */}
          <div>
            <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1">
              Detailed Description *
            </label>
            <textarea
              id="ticket-message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please provide full details so our concierge team can resolve your inquiry promptly..."
              rows={4}
              className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24] resize-none"
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1">
              Attachment URLs (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="Paste screenshot / document URL..."
                className="flex-1 px-3 py-1.5 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11]"
              />
              <button
                type="button"
                onClick={handleAddAttachment}
                className="px-3 py-1.5 bg-[#e8f5e9] text-[#1b6d24] text-xs font-bold rounded-xl hover:bg-[#c8e6c9]"
              >
                Add
              </button>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <span key={i} className="px-2.5 py-1 bg-white border border-[#c1c9be]/40 text-xs rounded-lg text-[#002c11] flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-[#717970]" />
                    <span className="truncate max-w-[150px]">{a}</span>
                    <button type="button" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}>
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#c1c9be]/30 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#717970] hover:text-[#002c11]"
            >
              Cancel
            </button>
            <button
              id="submit-ticket-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#002c11] text-[#a0f399] text-xs font-bold rounded-full hover:bg-[#003d18] transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-[#a0f399] border-t-transparent rounded-full animate-spin" />
                  <span>Creating Ticket...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
