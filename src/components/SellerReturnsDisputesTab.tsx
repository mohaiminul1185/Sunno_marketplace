import React, { useState, useEffect } from 'react';
import { ReturnRequest, Dispute, ReturnStatus, UserRole, SellerProtectionRecord } from '../types';
import { subscribeSellerReturns, updateReturnStatus } from '../services/returnService';
import { fetchDisputesBySeller, postDisputeMessage, fetchDisputeMessages, resolveDispute } from '../services/disputeService';
import { scheduleReversePickup } from '../services/reverseLogisticsService';
import { createSellerProtectionClaim, fetchSellerProtectionRecords } from '../services/protectionService';
import { getReturnStatusLabel, getBengaliStatusDescription } from '../services/returnStateMachine';
import { ReturnDetailsModal } from './ReturnDetailsModal';
import {
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Truck,
  Package,
  Eye,
  Filter,
  Search,
  MessageSquare,
  DollarSign,
  Send,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

interface SellerReturnsDisputesTabProps {
  sellerId: string;
  sellerName: string;
  storeName: string;
  actor: { id: string; name: string; email?: string; phone?: string; role: UserRole };
}

export const SellerReturnsDisputesTab: React.FC<SellerReturnsDisputesTabProps> = ({
  sellerId,
  sellerName,
  storeName,
  actor,
}) => {
  const [activeSubSection, setActiveSubSection] = useState<'returns' | 'disputes' | 'protection'>('returns');
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [protectionRecords, setProtectionRecords] = useState<SellerProtectionRecord[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dispute chat state
  const [disputeMessages, setDisputeMessages] = useState<any[]>([]);
  const [chatReplyText, setChatReplyText] = useState<string>('');
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  // Protection claim modal state
  const [isProtectionModalOpen, setIsProtectionModalOpen] = useState<boolean>(false);
  const [protectionReturnId, setProtectionReturnId] = useState<string>('');
  const [protectionClaimReason, setProtectionClaimReason] = useState<string>('TRANSIT_DAMAGE');
  const [protectionClaimAmount, setProtectionClaimAmount] = useState<number>(0);
  const [protectionEvidenceUrl, setProtectionEvidenceUrl] = useState<string>('');
  const [protectionNotes, setProtectionNotes] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    // Subscribe to seller's real-time return requests
    const unsubscribe = subscribeSellerReturns(sellerId, (list) => {
      setReturns(list);
      setIsLoading(false);
    });

    // Fetch disputes and protection records
    loadDisputesAndProtection();

    return () => unsubscribe();
  }, [sellerId]);

  const loadDisputesAndProtection = async () => {
    try {
      const [disputeList, protList] = await Promise.all([
        fetchDisputesBySeller(sellerId),
        fetchSellerProtectionRecords(sellerId),
      ]);
      setDisputes(disputeList);
      setProtectionRecords(protList);
    } catch (e) {
      console.warn('Error loading disputes or protection records:', e);
    }
  };

  const handleSelectDispute = async (dispute: Dispute) => {
    setSelectedDispute(dispute);
    try {
      const msgs = await fetchDisputeMessages(dispute.id);
      setDisputeMessages(msgs);
    } catch (e) {
      console.warn('Error loading dispute messages:', e);
    }
  };

  const handleSendDisputeReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !chatReplyText.trim()) return;

    setIsSendingReply(true);
    try {
      const msg = await postDisputeMessage({
        disputeId: selectedDispute.id,
        senderId: actor.id,
        senderName: storeName || actor.name,
        senderRole: 'SELLER',
        message: chatReplyText.trim(),
      });

      setDisputeMessages((prev) => [...prev, msg]);
      setChatReplyText('');
      setToastMessage('Artisan response submitted to dispute thread.');
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to post message.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleCreateProtectionClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protectionReturnId || protectionClaimAmount <= 0) {
      setToastMessage('Please select a return and enter a valid reimbursement claim amount.');
      return;
    }

    try {
      const rec = await createSellerProtectionClaim({
        returnId: protectionReturnId,
        orderId: 'ORD-' + protectionReturnId,
        sellerId,
        sellerStoreName: storeName || sellerName,
        claimReason: protectionClaimReason as any,
        claimedAmount: protectionClaimAmount,
        evidencePhotos: protectionEvidenceUrl ? [protectionEvidenceUrl] : [],
        explanation: protectionNotes,
      });

      setProtectionRecords((prev) => [rec, ...prev]);
      setIsProtectionModalOpen(false);
      setToastMessage('Seller Protection Claim submitted to SUNNO Trust Fund.');
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to submit claim.');
    }
  };

  const filteredReturns = returns.filter((r) => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchQuery =
      !searchQuery ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.productTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchQuery;
  });

  const pendingReturnsCount = returns.filter(
    (r) => r.status === 'REQUESTED' || r.status === 'RETURN_REQUESTED' || r.status === 'UNDER_REVIEW'
  ).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 font-bold text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-linear-to-r from-[#002c11] to-[#0d5225] text-white p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-[#a0f399] font-bold">
              Artisan Fair-Trade Guarantee &amp; Protection
            </span>
            <h2 className="text-2xl font-bold font-heading mt-1">Returns, Reverse Logistics &amp; Disputes</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProtectionModalOpen(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-[#a0f399] rounded-full text-xs font-bold transition-colors border border-[#a0f399]/30 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Claim Seller Protection</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-[#c1c9be] max-w-3xl leading-relaxed">
          Manage return authorizations, doorstep reverse couriers, workshop intake inspections, and customer disputes under the SUNNO Artisan Protection Framework. If a return is damaged by courier transit or customer abuse, you are covered by our artisan reimbursement escrow.
        </p>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          {[
            { id: 'returns', label: `Return Requests (${returns.length})`, count: pendingReturnsCount },
            { id: 'disputes', label: `Active Disputes (${disputes.length})`, count: disputes.filter((d) => d.status === 'OPEN').length },
            { id: 'protection', label: `Seller Protection Claims (${protectionRecords.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubSection(tab.id as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubSection === tab.id
                  ? 'bg-white text-[#002c11] shadow-xs'
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-extrabold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: RETURNS MANAGEMENT */}
      {activeSubSection === 'returns' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#c1c9be]/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="font-bold text-[#002c11]">Filter:</span>
              {[
                { id: 'ALL', label: 'All Returns' },
                { id: 'REQUESTED', label: 'Pending Claim' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'PICKUP_SCHEDULED', label: 'Pickup Booked' },
                { id: 'IN_TRANSIT', label: 'In Transit' },
                { id: 'RECEIVED', label: 'Workshop Intake' },
                { id: 'REFUND_PENDING', label: 'Refund Pending' },
                { id: 'REFUNDED', label: 'Refunded' },
                { id: 'DISPUTED', label: 'Disputed' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
                    statusFilter === st.id
                      ? 'bg-[#002c11] text-white'
                      : 'bg-[#f0eded] text-[#414941] hover:bg-[#e7e8e7]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#717970] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, order, craft..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Returns Cards List */}
          {filteredReturns.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#c1c9be]/50 text-center space-y-3">
              <RotateCcw className="w-12 h-12 text-[#c1c9be] mx-auto" />
              <h3 className="text-base font-bold text-[#002c11]">No Return Claims Found</h3>
              <p className="text-xs text-[#717970] max-w-sm mx-auto">
                No customer return requests match your current filters. Outstanding returns for your workshop will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReturns.map((ret) => (
                <div
                  key={ret.id}
                  className="bg-white p-5 rounded-3xl border border-[#c1c9be]/50 shadow-xs hover:border-[#1b6d24]/40 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#f0eded] text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#002c11]">Return #{ret.id.slice(-8)}</span>
                      <span className="text-[#717970]">•</span>
                      <span className="text-[#717970]">Order #{ret.orderNumber}</span>
                      <span className="text-[#717970]">•</span>
                      <span className="text-[#717970]">{ret.customerName} ({ret.customerPhone})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#1b6d24]/10 text-[#1b6d24]">
                        {getReturnStatusLabel(ret.status, 'bn')} ({getReturnStatusLabel(ret.status, 'en')})
                      </span>
                      <button
                        onClick={() => setSelectedReturn(ret)}
                        className="px-3.5 py-1 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage &amp; Inspect</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={ret.productImage || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=200'}
                        alt={ret.productTitle}
                        className="w-14 h-14 object-cover rounded-2xl border border-[#c1c9be]/40 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-bold text-[#002c11] line-clamp-1">{ret.productTitle}</h4>
                        <p className="text-[#717970] text-[11px]">
                          Reason: <strong className="text-[#002c11]">{ret.returnReason}</strong> • Qty: {ret.quantity} • Resolution: <strong className="text-[#1b6d24]">{ret.requestedResolution || 'REFUND'}</strong>
                        </p>
                        <p className="text-[#1b6d24] font-mono font-bold mt-0.5">
                          Refund Value: ৳{ret.refundAmount} via {ret.refundMethod?.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/40 text-[11px] w-full sm:w-auto space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-[#717970]">Reverse Tracking:</span>
                        <span className="font-mono font-bold text-[#002c11]">
                          {ret.courierTracking || ret.returnTrackingNumber || 'Pending Pickup'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#717970]">Pickup District:</span>
                        <span className="font-semibold text-[#002c11]">{ret.pickupAddress?.district || 'Dhaka'}</span>
                      </div>
                    </div>
                  </div>

                  {ret.description && (
                    <p className="text-[11px] text-[#414941] bg-[#fbf9f8] p-2.5 rounded-xl border border-[#c1c9be]/30">
                      <strong className="text-[#002c11]">Customer Explanation: </strong>
                      {ret.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: DISPUTES MEDIATION */}
      {activeSubSection === 'disputes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Dispute List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-[#002c11] uppercase tracking-wider">
              Dispute Tickets ({disputes.length})
            </h3>
            {disputes.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-[#c1c9be]/50 text-center text-xs text-[#717970]">
                No active disputes filed against your workshop.
              </div>
            ) : (
              disputes.map((d) => (
                <div
                  key={d.id}
                  onClick={() => handleSelectDispute(d)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                    selectedDispute?.id === d.id
                      ? 'bg-white border-[#1b6d24] shadow-xs ring-2 ring-[#1b6d24]/10'
                      : 'bg-white/80 border-[#c1c9be]/50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#002c11]">#{d.id.slice(-8)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      d.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#002c11] line-clamp-1">{d.reason.replace(/_/g, ' ')}</h4>
                  <p className="text-[11px] text-[#717970] line-clamp-1">{d.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-[#717970] pt-1">
                    <span>Amount: ৳{d.disputedAmount}</span>
                    <span>Order #{d.orderNumber}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Dispute Conversation & Mediation Thread */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-[#c1c9be]/50 p-6 flex flex-col min-h-[480px]">
            {selectedDispute ? (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Dispute Header */}
                <div className="pb-3 border-b border-[#f0eded] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#002c11]">
                      Dispute #{selectedDispute.id.slice(-8)} • {selectedDispute.reason.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-xs text-[#717970]">
                      Customer: {selectedDispute.customerName} • Desired: {selectedDispute.desiredOutcome} • Priority: {selectedDispute.priority}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
                    ৳{selectedDispute.disputedAmount} Under Mediation
                  </span>
                </div>

                {/* Evidence Links */}
                {selectedDispute.evidenceUrls?.length > 0 && (
                  <div className="p-3 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40 text-xs">
                    <strong className="block mb-1 text-[#002c11]">Filed Evidence Attachments:</strong>
                    <div className="flex flex-wrap gap-2">
                      {selectedDispute.evidenceUrls.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-white rounded-lg border border-[#c1c9be]/50 text-blue-700 hover:underline">
                          Attachment {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages Thread */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
                  {/* Initial claim */}
                  <div className="p-3.5 rounded-2xl bg-[#f0eded]/60 border border-[#c1c9be]/30 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-[#002c11]">
                      <span>Initial Statement by {selectedDispute.customerName}</span>
                      <span className="text-[10px] text-[#717970]">{new Date(selectedDispute.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-[#414941]">{selectedDispute.description}</p>
                  </div>

                  {disputeMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl text-xs space-y-1 max-w-[85%] ${
                        m.senderRole === 'SELLER'
                          ? 'ml-auto bg-[#e8f5e9] text-[#002c11] border border-[#a0f399]/40'
                          : m.senderRole === 'ADMIN'
                          ? 'mx-auto bg-purple-50 text-purple-950 border border-purple-200'
                          : 'bg-[#fbf9f8] border border-[#c1c9be]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span>{m.senderName} ({m.senderRole})</span>
                        <span className="text-[#717970]">{new Date(m.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p>{m.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendDisputeReply} className="pt-2 border-t border-[#f0eded] flex items-center gap-2">
                  <input
                    type="text"
                    value={chatReplyText}
                    onChange={(e) => setChatReplyText(e.target.value)}
                    placeholder="Type artisan explanation or proposal to customer/committee..."
                    className="flex-1 px-4 py-2.5 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs"
                    disabled={isSendingReply}
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !chatReplyText.trim()}
                    className="px-5 py-2.5 bg-[#002c11] text-[#a0f399] rounded-xl text-xs font-bold hover:bg-[#003d18] disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#717970] space-y-2">
                <MessageSquare className="w-10 h-10 text-[#c1c9be]" />
                <h4 className="font-bold text-[#002c11] text-sm">Select a Dispute Ticket</h4>
                <p className="text-xs max-w-sm">
                  Click on any dispute from the left panel to review the case details, inspect customer evidence, and post a mediation reply.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: SELLER PROTECTION ESCROW */}
      {activeSubSection === 'protection' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Artisan Escrow Protection Policy</h4>
                <p className="text-[11px] text-emerald-800">
                  You are protected against courier transit damages, fake claims, and missing parts. Claims are funded by the SUNNO Artisan Escrow Reserve.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsProtectionModalOpen(true)}
              className="px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition-colors shadow-xs"
            >
              New Claim
            </button>
          </div>

          {protectionRecords.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-[#c1c9be]/50 text-center text-xs text-[#717970] space-y-2">
              <FileCheck className="w-10 h-10 text-[#c1c9be] mx-auto" />
              <h4 className="font-bold text-[#002c11] text-sm">No Protection Claims Filed</h4>
              <p>You haven't filed any claims yet. If an item is returned damaged, file a claim for full reimbursement.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {protectionRecords.map((p) => (
                <div key={p.id} className="p-4 bg-white rounded-2xl border border-[#c1c9be]/50 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="font-mono text-[#002c11]">#{p.id.slice(-8)}</strong>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : p.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#717970] mt-0.5">
                      Return Ticket #{p.returnId.slice(-8)} • Reason: {p.claimReason.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-[#414941] mt-1">{p.explanation}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#717970] block">Claimed Reimbursement:</span>
                    <strong className="text-sm font-extrabold text-[#1b6d24]">৳{p.claimedAmount}</strong>
                    {p.approvedAmount && (
                      <span className="text-[10px] text-emerald-700 block font-bold">
                        Approved: ৳{p.approvedAmount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Return Details & Inspection Modal */}
      {selectedReturn && (
        <ReturnDetailsModal
          returnReq={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onUpdate={(updated) => {
            setSelectedReturn(updated);
            setReturns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          }}
          actor={actor}
        />
      )}

      {/* Seller Protection Claim Modal */}
      {isProtectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#fbf9f8] w-full max-w-lg rounded-3xl border border-[#c1c9be]/50 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#c1c9be]/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-[#002c11] text-sm sm:text-base">Claim Artisan Escrow Protection</h3>
              </div>
              <button onClick={() => setIsProtectionModalOpen(false)} className="text-[#717970] hover:text-[#002c11]">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProtectionClaim} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#002c11] mb-1">Select Disputed / Damaged Return</label>
                <select
                  value={protectionReturnId}
                  onChange={(e) => {
                    setProtectionReturnId(e.target.value);
                    const sel = returns.find((r) => r.id === e.target.value);
                    if (sel) setProtectionClaimAmount(sel.refundAmount || 0);
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl"
                  required
                >
                  <option value="">-- Choose Return --</option>
                  {returns.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.id.slice(-8)}: {r.productTitle} (৳{r.refundAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Claim Grounds</label>
                  <select
                    value={protectionClaimReason}
                    onChange={(e) => setProtectionClaimReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl"
                  >
                    <option value="TRANSIT_DAMAGE">Courier Transit Damage</option>
                    <option value="CUSTOMER_FRAUD">Customer Misuse / Counterfeit Claim</option>
                    <option value="WRONG_ITEM_RETURNED">Wrong Item Sent Back</option>
                    <option value="MISSING_PARTS">Missing Accessories / Incomplete Return</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Reimbursement Amount (৳)</label>
                  <input
                    type="number"
                    value={protectionClaimAmount}
                    onChange={(e) => setProtectionClaimAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#002c11] mb-1">Photo Evidence Link (Image URL)</label>
                <input
                  type="url"
                  value={protectionEvidenceUrl}
                  onChange={(e) => setProtectionEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-[#002c11] mb-1">Explanation of Damage / Defect</label>
                <textarea
                  value={protectionNotes}
                  onChange={(e) => setProtectionNotes(e.target.value)}
                  placeholder="Describe package condition upon courier arrival, unpackaging evidence, and loss calculation..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#c1c9be]/30">
                <button
                  type="button"
                  onClick={() => setIsProtectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#717970]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002c11] text-[#a0f399] rounded-xl text-xs font-bold hover:bg-[#003d18]"
                >
                  Submit Protection Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
