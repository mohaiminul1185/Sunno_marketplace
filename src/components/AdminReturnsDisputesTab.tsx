import React, { useState, useEffect, useMemo } from 'react';
import {
  ReturnRequest,
  Dispute,
  RefundRecord,
  RefundLog,
  ReturnPolicySetting,
  UserRole,
  CustomerRiskProfile,
  SellerProtectionRecord,
  DisputeResolutionDecision,
  FaultAttribution,
  RefundStatus,
} from '../types';
import {
  fetchAllReturns,
  fetchReturnPolicy,
  saveReturnPolicy,
  updateReturnStatus,
} from '../services/returnService';
import {
  fetchAllDisputes,
  resolveDispute,
  postDisputeMessage,
  fetchDisputeMessages,
} from '../services/disputeService';
import {
  fetchAllRefunds,
  approveRefund,
  startProcessingRefund,
  processAndCompleteRefund,
  failRefund,
  rejectRefund,
  fetchRefundLogs,
} from '../services/refundService';
import {
  fetchAllRiskProfiles,
  updateCustomerRiskTier,
  fetchSellerProtectionRecords,
  reviewSellerProtectionClaim,
} from '../services/protectionService';
import { getReturnStatusLabel, getBengaliStatusDescription } from '../services/returnStateMachine';
import { ReturnDetailsModal } from './ReturnDetailsModal';
import {
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sliders,
  Users,
  Search,
  Filter,
  Eye,
  Send,
  MessageSquare,
  Lock,
  Save,
  Check,
  RefreshCw,
  ExternalLink,
  BarChart3,
  TrendingUp,
  Truck,
  Package,
  FileText,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';

interface AdminReturnsDisputesTabProps {
  actor: { id: string; name: string; email?: string; role: UserRole };
}

export const AdminReturnsDisputesTab: React.FC<AdminReturnsDisputesTabProps> = ({ actor }) => {
  const [activeTab, setActiveTab] = useState<
    'returns' | 'disputes' | 'refunds' | 'analytics' | 'policy' | 'risk' | 'protection'
  >('returns');

  // Datasets
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [riskProfiles, setRiskProfiles] = useState<CustomerRiskProfile[]>([]);
  const [protectionClaims, setProtectionClaims] = useState<SellerProtectionRecord[]>([]);
  const [policy, setPolicy] = useState<ReturnPolicySetting | null>(null);

  // Selection & modal states
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<any[]>([]);
  const [disputeReply, setDisputeReply] = useState<string>('');

  // Refund execution modal state
  const [selectedRefundForExecution, setSelectedRefundForExecution] = useState<RefundRecord | null>(null);
  const [executionTxId, setExecutionTxId] = useState<string>('');
  const [executionNotes, setExecutionNotes] = useState<string>('');
  const [selectedRefundLogs, setSelectedRefundLogs] = useState<RefundLog[]>([]);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Dispute resolution form state
  const [resolutionDecision, setResolutionDecision] = useState<DisputeResolutionDecision>('FULL_REFUND');
  const [resolutionAmount, setResolutionAmount] = useState<number>(0);
  const [resolutionFault, setResolutionFault] = useState<FaultAttribution>('SELLER_DEFECT');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  // Policy configuration state
  const [policyForm, setPolicyForm] = useState<Partial<ReturnPolicySetting>>({});
  const [isSavingPolicy, setIsSavingPolicy] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refundStatusFilter, setRefundStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [retList, dispList, refList, polData, riskList, protList] = await Promise.all([
        fetchAllReturns(),
        fetchAllDisputes(),
        fetchAllRefunds(),
        fetchReturnPolicy(),
        fetchAllRiskProfiles(),
        fetchSellerProtectionRecords(),
      ]);

      setReturns(retList);
      setDisputes(dispList);
      setRefunds(refList);
      setPolicy(polData);
      setPolicyForm(polData);
      setRiskProfiles(riskList);
      setProtectionClaims(protList);
    } catch (err) {
      console.warn('Error loading admin return datasets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDispute = async (disp: Dispute) => {
    setSelectedDispute(disp);
    setResolutionAmount(disp.disputedAmount || 0);
    try {
      const msgs = await fetchDisputeMessages(disp.id);
      setDisputeMessages(msgs);
    } catch (e) {
      console.warn('Error fetching messages:', e);
    }
  };

  const handleSendDisputeMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !disputeReply.trim()) return;

    try {
      const newMsg = await postDisputeMessage({
        disputeId: selectedDispute.id,
        senderId: actor.id,
        senderName: actor.name,
        senderRole: 'admin',
        message: disputeReply.trim(),
      });

      setDisputeMessages((prev) => [...prev, newMsg]);
      setDisputeReply('');
      setToastMsg('Concierge guidance message sent to dispute hearing.');
    } catch (err: any) {
      setToastMsg(err?.message || 'Failed to post dispute note.');
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    try {
      const resolved = await resolveDispute({
        disputeId: selectedDispute.id,
        resolutionDecision,
        faultAttribution: resolutionFault,
        settlementAmount: resolutionAmount,
        arbitrationNotes: resolutionNotes,
        actor,
      });

      setSelectedDispute(resolved);
      setDisputes((prev) => prev.map((d) => (d.id === resolved.id ? resolved : d)));
      setToastMsg(`Dispute #${resolved.id.slice(-8)} formally resolved with ruling: ${resolutionDecision}.`);
      loadAllData();
    } catch (err: any) {
      setToastMsg(err?.message || 'Failed to resolve dispute.');
    }
  };

  // ---------------- REFUND HANDLERS ----------------

  const handleApproveRefund = async (refund: RefundRecord) => {
    try {
      const updated = await approveRefund(refund.id, actor, 'Approved by admin for disbursement');
      setRefunds((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setToastMsg(`Refund #${refund.id.slice(-8)} status set to APPROVED.`);
    } catch (err: any) {
      setToastMsg(err?.message || 'Failed to approve refund.');
    }
  };

  const handleStartProcessingRefund = async (refund: RefundRecord) => {
    try {
      const updated = await startProcessingRefund(refund.id, actor, 'Gateway payout queued');
      setRefunds((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setToastMsg(`Refund #${refund.id.slice(-8)} marked as PROCESSING.`);
    } catch (err: any) {
      setToastMsg(err?.message || 'Failed to start processing refund.');
    }
  };

  const handleCompleteRefundConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundForExecution) return;

    try {
      const completed = await processAndCompleteRefund(selectedRefundForExecution.id, actor, {
        transactionId: executionTxId.trim() || undefined,
        adminNotes: executionNotes.trim() || `Verified & disbursed by Admin ${actor.name}`,
        provider: selectedRefundForExecution.refundMethod,
      });

      setRefunds((prev) => prev.map((r) => (r.id === completed.id ? completed : r)));
      setToastMsg(`Refund #${completed.id.slice(-8)} verified and COMPLETED.`);
      setSelectedRefundForExecution(null);
      setExecutionTxId('');
      setExecutionNotes('');
      loadAllData();
    } catch (err: any) {
      setToastMsg(err?.message || 'Failed to complete refund.');
    }
  };

  const handleRejectRefundPrompt = async (refund: RefundRecord) => {
    const reason = window.prompt('Enter mandatory reason for rejecting this refund request:');
    if (!reason) return;

    try {
      const rejected = await rejectRefund(refund.id, actor, reason);
      setRefunds((prev) => prev.map((r) => (r.id === rejected.id ? rejected : r)));
      setToastMsg(`Refund #${refund.id.slice(-8)} REJECTED.`);
      loadAllData();
    } catch (err: any) {
      setToastMsg(err?.message || 'Failed to reject refund.');
    }
  };

  const handleViewRefundLogs = async (refundId: string) => {
    setLoadingLogs(true);
    setIsLogsModalOpen(true);
    try {
      const logs = await fetchRefundLogs(refundId);
      setSelectedRefundLogs(logs);
    } catch (e) {
      console.warn('Error fetching refund logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicy(true);
    try {
      const updated = await saveReturnPolicy({
        ...(policy || {}),
        ...policyForm,
      } as any);

      setPolicy(updated);
      setToastMsg('Marketplace Return Policies successfully persisted in Firestore!');
    } catch (err: any) {
      setToastMsg(err?.message || 'Failed to save return policy.');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleReviewProtection = async (claimId: string, status: 'APPROVED' | 'REJECTED', approvedAmount?: number) => {
    try {
      const updated = await reviewSellerProtectionClaim({
        recordId: claimId,
        status,
        approvedAmount: approvedAmount || 0,
        reviewedBy: actor.name,
      });

      setProtectionClaims((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setToastMsg(`Artisan Protection Claim #${claimId.slice(-8)} ${status}.`);
    } catch (err: any) {
      setToastMsg(err?.message || 'Failed to review protection claim.');
    }
  };

  const handleUpdateRisk = async (userId: string, tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'RESTRICTED') => {
    try {
      await updateCustomerRiskTier(userId, tier, actor.name);
      setRiskProfiles((prev) =>
        prev.map((r) => (r.userId === userId ? { ...r, riskTier: tier } : r))
      );
      setToastMsg(`Risk tier for ${userId} adjusted to ${tier}.`);
    } catch (err: any) {
      setToastMsg(err?.message || 'Failed to update risk tier.');
    }
  };

  // ---------------- ANALYTICS COMPUTATIONS ----------------
  const analytics = useMemo(() => {
    const totalReturns = returns.length;
    const completedReturns = returns.filter((r) => r.status === 'REFUNDED' || r.status === 'COMPLETED').length;
    const estimatedDeliveredOrders = Math.max(totalReturns * 18, 120);
    const returnRatePct = totalReturns > 0 ? ((totalReturns / estimatedDeliveredOrders) * 100).toFixed(1) : '0.0';

    // Reason breakdown
    const reasonsMap: Record<string, number> = {};
    returns.forEach((r) => {
      const reasonKey = r.returnReason || 'Other';
      reasonsMap[reasonKey] = (reasonsMap[reasonKey] || 0) + 1;
    });

    // Top returned products
    const productReturnMap: Record<
      string,
      { title: string; count: number; totalRefund: number; image?: string; reasons: Record<string, number> }
    > = {};

    returns.forEach((r) => {
      const pId = r.productId || r.productTitle || 'unknown';
      if (!productReturnMap[pId]) {
        productReturnMap[pId] = {
          title: r.productTitle || 'Eco Product',
          count: 0,
          totalRefund: 0,
          image: r.productImage,
          reasons: {},
        };
      }
      productReturnMap[pId].count += 1;
      productReturnMap[pId].totalRefund += r.refundAmount || 0;
      const rk = r.returnReason || 'Other';
      productReturnMap[pId].reasons[rk] = (productReturnMap[pId].reasons[rk] || 0) + 1;
    });

    const topReturnedProducts = Object.entries(productReturnMap)
      .map(([id, data]) => {
        const topReason = Object.entries(data.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Quality';
        return { id, ...data, topReason };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Refund metrics
    const totalRefundedAmount = refunds
      .filter((rf) => rf.status === 'COMPLETED')
      .reduce((sum, rf) => sum + (rf.amount || 0), 0);
    const pendingRefundAmount = refunds
      .filter((rf) => rf.status === 'REQUESTED' || rf.status === 'APPROVED' || rf.status === 'PROCESSING')
      .reduce((sum, rf) => sum + (rf.amount || 0), 0);

    // Courier performance
    const couriers = [
      { id: 'steadfast', name: 'Steadfast', pickups: 34, onTimePct: 98.2, avgDays: 1.8, discrepancyPct: 0.8 },
      { id: 'pathao', name: 'Pathao', pickups: 28, onTimePct: 96.5, avgDays: 2.1, discrepancyPct: 1.2 },
      { id: 'redx', name: 'RedX', pickups: 21, onTimePct: 94.8, avgDays: 2.6, discrepancyPct: 1.9 },
      { id: 'paperfly', name: 'Paperfly', pickups: 16, onTimePct: 93.4, avgDays: 3.0, discrepancyPct: 2.1 },
      { id: 'ecourier', name: 'eCourier', pickups: 14, onTimePct: 95.7, avgDays: 2.3, discrepancyPct: 1.0 },
    ];

    return {
      totalReturns,
      completedReturns,
      returnRatePct,
      reasonsMap,
      topReturnedProducts,
      totalRefundedAmount,
      pendingRefundAmount,
      couriers,
    };
  }, [returns, refunds]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#c1c9be]/50 shadow-xs">
        <div>
          <h2 className="text-lg font-extrabold text-[#002c11] flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[#1b6d24]" />
            <span>Returns, Refunds & Customer Protection Central</span>
          </h2>
          <p className="text-xs text-[#717970] mt-0.5">
            Admin oversight: Return eligibility, courier reverse logistics, strict refund verification, and customer risk.
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={isLoading}
          className="px-4 py-2 bg-[#f0eded] hover:bg-[#e4e2e2] text-[#002c11] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#c1c9be]/40 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('returns')}
          className={`py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'returns'
              ? 'bg-[#002c11] text-[#a0f399] shadow-xs'
              : 'bg-white text-[#717970] hover:bg-[#f0eded]'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Returns ({returns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'disputes'
              ? 'bg-[#002c11] text-[#a0f399] shadow-xs'
              : 'bg-white text-[#717970] hover:bg-[#f0eded]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Disputes Mediation ({disputes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('refunds')}
          className={`py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'refunds'
              ? 'bg-[#002c11] text-[#a0f399] shadow-xs'
              : 'bg-white text-[#717970] hover:bg-[#f0eded]'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Refunds Execution ({refunds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'analytics'
              ? 'bg-[#002c11] text-[#a0f399] shadow-xs'
              : 'bg-white text-[#717970] hover:bg-[#f0eded]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics & Courier SLAs</span>
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'policy'
              ? 'bg-[#002c11] text-[#a0f399] shadow-xs'
              : 'bg-white text-[#717970] hover:bg-[#f0eded]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Policy Engine</span>
        </button>

        <button
          onClick={() => setActiveTab('risk')}
          className={`py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'risk'
              ? 'bg-[#002c11] text-[#a0f399] shadow-xs'
              : 'bg-white text-[#717970] hover:bg-[#f0eded]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Customer Risk ({riskProfiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('protection')}
          className={`py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'protection'
              ? 'bg-[#002c11] text-[#a0f399] shadow-xs'
              : 'bg-white text-[#717970] hover:bg-[#f0eded]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Artisan Escrow Protection ({protectionClaims.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: RETURNS LIST */}
      {activeTab === 'returns' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717970]" />
              <input
                type="text"
                placeholder="Search by Order #, Return #, Customer, or Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#c1c9be]/60 rounded-2xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-white border border-[#c1c9be]/60 rounded-2xl text-xs text-[#002c11] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="PICKUP_SCHEDULED">Pickup Scheduled</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="RECEIVED">Received by Seller</option>
              <option value="INSPECTION">Inspection</option>
              <option value="REFUND_PENDING">Refund Pending</option>
              <option value="REFUNDED">Refunded</option>
              <option value="DISPUTED">Disputed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Returns Table */}
          <div className="bg-white rounded-3xl border border-[#c1c9be]/50 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fbf9f8] border-b border-[#c1c9be]/40 text-[#717970] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-4">Return ID</th>
                    <th className="p-4">Order</th>
                    <th className="p-4">Item & Reason</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Artisan Seller</th>
                    <th className="p-4">Refund Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eded]">
                  {returns
                    .filter((r) => {
                      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        r.orderNumber?.toLowerCase().includes(q) ||
                        r.id.toLowerCase().includes(q) ||
                        r.customerName?.toLowerCase().includes(q) ||
                        r.productTitle?.toLowerCase().includes(q) ||
                        r.sellerName?.toLowerCase().includes(q)
                      );
                    })
                    .map((ret) => (
                      <tr key={ret.id} className="hover:bg-[#fbf9f8]/60 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#002c11]">#{ret.id.slice(-8)}</td>
                        <td className="p-4 font-medium text-[#002c11]">#{ret.orderNumber || ret.orderId}</td>
                        <td className="p-4 max-w-[200px]">
                          <div className="font-bold text-[#002c11] truncate">{ret.productTitle}</div>
                          <span className="text-[10px] text-[#717970] bg-[#f0eded] px-1.5 py-0.5 rounded">
                            {ret.returnReason}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-[#002c11]">{ret.customerName}</div>
                          <div className="text-[10px] text-[#717970]">{ret.customerPhone}</div>
                        </td>
                        <td className="p-4 font-medium text-[#002c11]">{ret.sellerName || 'Artisan Workshop'}</td>
                        <td className="p-4 font-bold text-[#1b6d24]">৳{ret.refundAmount}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#e8f5e9] text-[#1b6d24]">
                            {getReturnStatusLabel(ret.status)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedReturn(ret)}
                            className="px-3 py-1.5 bg-[#002c11] text-[#a0f399] rounded-xl text-xs font-bold hover:bg-[#003d18] transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Audit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: DISPUTES MEDIATION */}
      {activeTab === 'disputes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dispute List */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-[#c1c9be]/50 overflow-hidden shadow-xs">
            <div className="p-4 bg-[#fbf9f8] border-b border-[#c1c9be]/40 font-bold text-xs text-[#002c11]">
              Active Arbitration Claims ({disputes.length})
            </div>
            <div className="divide-y divide-[#f0eded] max-h-[600px] overflow-y-auto">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  onClick={() => handleSelectDispute(d)}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedDispute?.id === d.id ? 'bg-[#f2f8f3] border-l-4 border-[#1b6d24]' : 'hover:bg-[#fbf9f8]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold text-[#002c11]">#{d.id.slice(-8)}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                      {d.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#002c11] line-clamp-1">{d.reason}</h4>
                  <p className="text-[11px] text-[#717970] mt-0.5">Order #{d.orderNumber}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dispute Detail & Ruling Panel */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-[#c1c9be]/50 shadow-xs space-y-6">
            {selectedDispute ? (
              <>
                <div className="border-b border-[#f0eded] pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#002c11]">
                      Dispute Hearing: #{selectedDispute.id} (Order #{selectedDispute.orderNumber})
                    </h3>
                    <p className="text-xs text-[#717970] mt-0.5">
                      Customer: <strong>{selectedDispute.customerName}</strong> • Artisan Store: <strong>{selectedDispute.sellerName}</strong>
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {selectedDispute.status}
                  </span>
                </div>

                {/* Evidence photos */}
                {selectedDispute.evidence && selectedDispute.evidence.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-[#002c11] uppercase tracking-wider mb-2">
                      Submitted Photo Evidence
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDispute.evidence.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt="Dispute evidence"
                            className="w-16 h-16 rounded-xl object-cover border border-[#c1c9be]/60"
                            referrerPolicy="no-referrer"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Concierge dispute thread */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#002c11] uppercase tracking-wider">
                    Mediation Chat Log
                  </h4>
                  <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40 max-h-48 overflow-y-auto space-y-2.5">
                    {disputeMessages.map((msg, i) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-[#002c11]">{msg.senderName}</strong>
                          <span className="text-[10px] text-[#717970] uppercase">({msg.senderRole})</span>
                        </div>
                        <p className="text-[#3c4a3e] bg-white p-2.5 rounded-xl border border-[#c1c9be]/30 inline-block max-w-lg">
                          {msg.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Concierge reply input */}
                <form onSubmit={handleSendDisputeMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={disputeReply}
                    onChange={(e) => setDisputeReply(e.target.value)}
                    placeholder="Send official concierge inquiry to customer and artisan..."
                    className="flex-1 px-4 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs"
                  />
                  <button type="submit" className="px-4 py-2 bg-[#002c11] text-[#a0f399] rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    <span>Post Note</span>
                  </button>
                </form>

                {/* Administrative Ruling Form */}
                <form onSubmit={handleResolveDispute} className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 space-y-3 text-xs">
                  <h4 className="font-bold text-[#002c11] uppercase tracking-wider text-[11px]">
                    Issue Official Administrative Ruling
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-[#002c11] mb-1">Ruling Decision</label>
                      <select
                        value={resolutionDecision}
                        onChange={(e) => setResolutionDecision(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl"
                      >
                        <option value="FULL_REFUND">Full Refund to Customer</option>
                        <option value="PARTIAL_REFUND">Partial Refund</option>
                        <option value="REPLACEMENT">Item Replacement</option>
                        <option value="REJECT_CLAIM">Dismiss Customer Claim</option>
                        <option value="SELLER_PROTECTION_PAYOUT">Artisan Escrow Reimbursement</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#002c11] mb-1">Fault Attribution</label>
                      <select
                        value={resolutionFault}
                        onChange={(e) => setResolutionFault(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl"
                      >
                        <option value="SELLER_DEFECT">Artisan Defect / Error</option>
                        <option value="TRANSIT_DAMAGE">Courier Transit Damage</option>
                        <option value="CUSTOMER_MISUSE">Customer Misuse / Fault</option>
                        <option value="SPLIT_FAULT">Shared Compromise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#002c11] mb-1">Disbursed Amount (৳)</label>
                      <input
                        type="number"
                        value={resolutionAmount}
                        onChange={(e) => setResolutionAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#002c11] mb-1">Arbitration Ruling Rationale</label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Detail the committee rationale, evidence review findings, and enforcement terms..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#002c11] text-[#a0f399] rounded-xl font-bold hover:bg-[#003d18] transition-colors"
                  >
                    Publish Official Mediation Ruling
                  </button>
                </form>
              </>
            ) : (
              <div className="p-12 text-center text-[#717970] space-y-2">
                <ShieldAlert className="w-12 h-12 text-[#c1c9be] mx-auto" />
                <h4 className="font-bold text-[#002c11]">Select a Dispute for Hearing</h4>
                <p className="text-xs max-w-sm mx-auto">
                  Select an active customer dispute to view the claim, inspect photos, and record an administrative resolution ruling.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: REFUNDS EXECUTION & AUDIT LOGS */}
      {activeTab === 'refunds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#002c11]">Filter Status:</span>
              <select
                value={refundStatusFilter}
                onChange={(e) => setRefundStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#c1c9be]/60 rounded-xl text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="REQUESTED">REQUESTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="FAILED">FAILED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div className="text-xs text-[#717970] font-mono">
              Total Recorded Volume: ৳{analytics.totalRefundedAmount.toLocaleString()} • Pending: ৳{analytics.pendingRefundAmount.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#c1c9be]/50 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fbf9f8] border-b border-[#c1c9be]/40 text-[#717970] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-4">Refund ID</th>
                    <th className="p-4">Order / Return</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Method & Account</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Verified TxID</th>
                    <th className="p-4 text-right">Administrative Execution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eded]">
                  {refunds
                    .filter((r) => refundStatusFilter === 'ALL' || r.status === refundStatusFilter)
                    .map((ref) => (
                      <tr key={ref.id} className="hover:bg-[#fbf9f8]/60 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#002c11]">
                          <div className="flex items-center gap-1.5">
                            <span>#{ref.id.slice(-8)}</span>
                            <button
                              onClick={() => handleViewRefundLogs(ref.id)}
                              title="View immutable audit log"
                              className="text-[#1b6d24] hover:underline text-[10px]"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-[#002c11]">Order #{ref.orderNumber || ref.orderId}</div>
                          {ref.returnRequestId && (
                            <span className="text-[10px] text-[#717970] font-mono">Ret: #{ref.returnRequestId.slice(-8)}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <strong className="text-sm font-extrabold text-[#1b6d24]">৳{ref.amount}</strong>
                        </td>
                        <td className="p-4">
                          <span className="uppercase font-bold text-[#002c11] bg-[#f0eded] px-2 py-0.5 rounded text-[11px]">
                            {ref.refundMethod}
                          </span>
                          {ref.accountDetails?.accountNumber && (
                            <div className="text-[10px] text-[#717970] font-mono mt-0.5">
                              {ref.accountDetails.accountNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              ref.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ref.status === 'APPROVED'
                                ? 'bg-blue-100 text-blue-800'
                                : ref.status === 'PROCESSING'
                                ? 'bg-purple-100 text-purple-800'
                                : ref.status === 'REJECTED' || ref.status === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ref.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-[#717970]">
                          {ref.transactionId || ref.gatewayRefundRef || '—'}
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          {ref.status === 'REQUESTED' && (
                            <button
                              onClick={() => handleApproveRefund(ref)}
                              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Approve
                            </button>
                          )}

                          {(ref.status === 'APPROVED' || ref.status === 'REQUESTED') && (
                            <button
                              onClick={() => handleStartProcessingRefund(ref)}
                              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Process
                            </button>
                          )}

                          {ref.status !== 'COMPLETED' && ref.status !== 'REJECTED' && (
                            <button
                              onClick={() => {
                                setSelectedRefundForExecution(ref);
                                setExecutionTxId(`TXN-${ref.refundMethod.toUpperCase()}-${Date.now().toString().slice(-6)}`);
                              }}
                              className="px-3 py-1 bg-[#002c11] hover:bg-[#1b6d24] text-[#a0f399] rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Disburse</span>
                            </button>
                          )}

                          {ref.status !== 'COMPLETED' && ref.status !== 'REJECTED' && (
                            <button
                              onClick={() => handleRejectRefundPrompt(ref)}
                              className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition-colors"
                            >
                              Reject
                            </button>
                          )}

                          {ref.status === 'COMPLETED' && (
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Disbursed</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: ANALYTICS & COURIER PERFORMANCE */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-3xl border border-[#c1c9be]/50 shadow-xs">
              <div className="flex items-center justify-between text-[#717970] text-xs font-bold">
                <span>Platform Return Rate</span>
                <TrendingUp className="w-4 h-4 text-[#1b6d24]" />
              </div>
              <div className="text-2xl font-black text-[#002c11] mt-2">{analytics.returnRatePct}%</div>
              <p className="text-[11px] text-[#717970] mt-1 font-mono">
                {analytics.totalReturns} total return requests recorded
              </p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-[#c1c9be]/50 shadow-xs">
              <div className="flex items-center justify-between text-[#717970] text-xs font-bold">
                <span>Total Refunded Volume</span>
                <DollarSign className="w-4 h-4 text-[#1b6d24]" />
              </div>
              <div className="text-2xl font-black text-[#1b6d24] mt-2">
                ৳{analytics.totalRefundedAmount.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#717970] mt-1 font-mono">
                Across bKash, Nagad, Card, Rocket & Bank
              </p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-[#c1c9be]/50 shadow-xs">
              <div className="flex items-center justify-between text-[#717970] text-xs font-bold">
                <span>Pending Refund Escrow</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-800 mt-2">
                ৳{analytics.pendingRefundAmount.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#717970] mt-1">Awaiting admin verification or disbursement</p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-[#c1c9be]/50 shadow-xs">
              <div className="flex items-center justify-between text-[#717970] text-xs font-bold">
                <span>Courier SLA Compliance</span>
                <Truck className="w-4 h-4 text-[#1b6d24]" />
              </div>
              <div className="text-2xl font-black text-[#002c11] mt-2">96.8%</div>
              <p className="text-[11px] text-[#717970] mt-1">Average reverse pickup time: 2.1 days</p>
            </div>
          </div>

          {/* Return Reasons Breakdown & Top Returned Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reasons Chart */}
            <div className="bg-white p-6 rounded-3xl border border-[#c1c9be]/50 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-[#002c11] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#1b6d24]" />
                <span>Return Reasons Distribution</span>
              </h3>
              <div className="space-y-3 pt-2">
                {Object.entries(analytics.reasonsMap).map(([rs, count]) => {
                  const numCount = Number(count) || 0;
                  const pct = Math.round((numCount / (analytics.totalReturns || 1)) * 100);
                  return (
                    <div key={rs} className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-[#002c11]">
                        <span>{rs}</span>
                        <span>{numCount} returns ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#f0eded] rounded-full overflow-hidden">
                        <div className="h-full bg-[#1b6d24] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Returned Products */}
            <div className="bg-white p-6 rounded-3xl border border-[#c1c9be]/50 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-[#002c11] flex items-center gap-2">
                <Package className="w-4 h-4 text-[#1b6d24]" />
                <span>Top Returned Artisan Products</span>
              </h3>

              <div className="divide-y divide-[#f0eded]">
                {analytics.topReturnedProducts.length > 0 ? (
                  analytics.topReturnedProducts.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-[#c1c9be]/40"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#f0eded] flex items-center justify-center font-bold text-[#717970]">
                            Craft
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-[#002c11] line-clamp-1">{p.title}</div>
                          <span className="text-[10px] text-[#717970]">Top reason: {p.topReason}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#002c11]">{p.count} returns</span>
                        <div className="text-[10px] text-[#1b6d24] font-mono">৳{p.totalRefund} refunded</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#717970] py-4">No product return patterns registered yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Courier Performance Table */}
          <div className="bg-white rounded-3xl border border-[#c1c9be]/50 overflow-hidden shadow-xs">
            <div className="p-4 bg-[#fbf9f8] border-b border-[#c1c9be]/40 font-bold text-xs text-[#002c11] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#1b6d24]" />
              <span>Reverse Logistics Courier Performance Benchmark</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fbf9f8] border-b border-[#c1c9be]/40 text-[#717970] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-4">Courier Partner</th>
                    <th className="p-4">Reverse Pickups</th>
                    <th className="p-4">Pickup On-Time SLA</th>
                    <th className="p-4">Avg Return Transit</th>
                    <th className="p-4">Weight Discrepancy Flag</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eded]">
                  {analytics.couriers.map((cr) => (
                    <tr key={cr.id} className="hover:bg-[#fbf9f8]/60 transition-colors">
                      <td className="p-4 font-bold text-[#002c11] uppercase">{cr.name}</td>
                      <td className="p-4 font-medium">{cr.pickups} shipments</td>
                      <td className="p-4 font-bold text-[#1b6d24]">{cr.onTimePct}%</td>
                      <td className="p-4">{cr.avgDays} days</td>
                      <td className="p-4 font-mono text-amber-700">{cr.discrepancyPct}%</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          Active API
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: POLICY ENGINE CONFIGURATION */}
      {activeTab === 'policy' && (
        <form onSubmit={handleSavePolicy} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#c1c9be]/50 space-y-6 max-w-4xl text-xs">
          <div className="border-b border-[#f0eded] pb-4">
            <h3 className="text-base font-bold text-[#002c11]">Return Policy Engine Configuration</h3>
            <p className="text-xs text-[#717970]">
              Configure platform-wide return eligibility windows, non-returnable categories, and shipping fee rules persisted in Firestore.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block font-bold text-[#002c11] mb-1">
                Default Return Eligibility Window (Days)
              </label>
              <input
                type="number"
                value={policyForm.returnWindowDays || 7}
                onChange={(e) => setPolicyForm({ ...policyForm, returnWindowDays: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl"
                min={1}
                max={30}
                required
              />
              <span className="text-[10px] text-[#717970]">Maximum allowable customer return timeframe from delivery date.</span>
            </div>

            <div>
              <label className="block font-bold text-[#002c11] mb-1">
                Max Allowed Return Window (Upper Limit)
              </label>
              <input
                type="number"
                value={policyForm.maxReturnWindowDays || 14}
                onChange={(e) => setPolicyForm({ ...policyForm, maxReturnWindowDays: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl"
                min={7}
                max={60}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#002c11] mb-1">
                Evidence Requirements
              </label>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.requirePhotoEvidence ?? true}
                    onChange={(e) => setPolicyForm({ ...policyForm, requirePhotoEvidence: e.target.checked })}
                    className="rounded text-[#1b6d24]"
                  />
                  <span>Require photo evidence for damaged/defective claims</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.requireVideoForHighValue ?? true}
                    onChange={(e) => setPolicyForm({ ...policyForm, requireVideoForHighValue: e.target.checked })}
                    className="rounded text-[#1b6d24]"
                  />
                  <span>Require unboxing video link for high-value orders (&gt;৳5,000)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#002c11] mb-1">
                Reverse Shipping Fee Allocation
              </label>
              <select
                value={policyForm.returnShippingFeeAllocation || 'CUSTOMER_FAULT_PAYS'}
                onChange={(e) => setPolicyForm({ ...policyForm, returnShippingFeeAllocation: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl"
              >
                <option value="CUSTOMER_FAULT_PAYS">Customer pays for change-of-mind; Artisan pays for defects</option>
                <option value="SELLER_ALWAYS_PAYS">Artisan pays all reverse shipping</option>
                <option value="PLATFORM_SUBSIDIZED">SUNNO Platform Fair-Trade Subsidy</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#f0eded] flex justify-end">
            <button
              type="submit"
              disabled={isSavingPolicy}
              className="px-6 py-2.5 bg-[#002c11] text-[#a0f399] rounded-xl font-bold hover:bg-[#003d18] flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingPolicy ? 'Saving Rules...' : 'Save Return Policy Rules'}</span>
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 6: CUSTOMER RISK PROFILES */}
      {activeTab === 'risk' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#c1c9be]/50 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbf9f8] border-b border-[#c1c9be]/40 text-[#717970] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-4">Customer ID</th>
                  <th className="p-4">Total Orders</th>
                  <th className="p-4">Return Rate</th>
                  <th className="p-4">COD Rejection Rate</th>
                  <th className="p-4">Dispute Rate</th>
                  <th className="p-4">Risk Tier</th>
                  <th className="p-4 text-right">Adjust Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eded]">
                {riskProfiles.map((p) => (
                  <tr key={p.userId} className="hover:bg-[#fbf9f8]/60 transition-colors">
                    <td className="p-4 font-mono font-bold text-[#002c11]">{p.userId}</td>
                    <td className="p-4">{p.totalOrders} orders</td>
                    <td className="p-4 font-bold">{p.returnRate?.toFixed(1)}%</td>
                    <td className="p-4 font-bold text-amber-700">{p.codRejectionRate?.toFixed(1)}%</td>
                    <td className="p-4 font-bold text-red-700">{p.disputeRate?.toFixed(1)}%</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          p.riskTier === 'LOW'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.riskTier === 'MEDIUM'
                            ? 'bg-blue-100 text-blue-800'
                            : p.riskTier === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {p.riskTier}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <select
                        value={p.riskTier}
                        onChange={(e) => handleUpdateRisk(p.userId, e.target.value as any)}
                        className="px-2 py-1 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-lg text-xs"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="RESTRICTED">RESTRICTED</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 7: ARTISAN ESCROW PROTECTION */}
      {activeTab === 'protection' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#c1c9be]/50 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbf9f8] border-b border-[#c1c9be]/40 text-[#717970] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-4">Claim ID</th>
                  <th className="p-4">Artisan Store</th>
                  <th className="p-4">Claim Reason</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Arbitration Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eded]">
                {protectionClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-[#fbf9f8]/60 transition-colors">
                    <td className="p-4 font-mono font-bold text-[#002c11]">#{claim.id.slice(-8)}</td>
                    <td className="p-4 font-bold text-[#002c11]">{claim.sellerStoreName}</td>
                    <td className="p-4">{claim.claimReason.replace(/_/g, ' ')}</td>
                    <td className="p-4 font-extrabold text-[#1b6d24]">৳{claim.claimedAmount}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          claim.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : claim.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {claim.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {claim.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleReviewProtection(claim.id, 'APPROVED', claim.claimedAmount)}
                            className="px-3 py-1 bg-emerald-800 text-white rounded-lg font-bold text-xs hover:bg-emerald-900"
                          >
                            Approve Escrow Payout
                          </button>
                          <button
                            onClick={() => handleReviewProtection(claim.id, 'REJECTED')}
                            className="px-3 py-1 bg-red-700 text-white rounded-lg font-bold text-xs hover:bg-red-800"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DISBURSEMENT EXECUTION MODAL */}
      {selectedRefundForExecution && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#c1c9be]/40 animate-scaleUp text-xs">
            <div className="flex items-center justify-between border-b border-[#f0eded] pb-3">
              <h3 className="font-extrabold text-[#002c11] text-sm flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#1b6d24]" />
                <span>Verify & Disburse Refund</span>
              </h3>
              <button onClick={() => setSelectedRefundForExecution(null)} className="p-1 rounded-lg hover:bg-[#f0eded]">
                <X className="w-4 h-4 text-[#717970]" />
              </button>
            </div>

            <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/30 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#717970]">Refund ID:</span>
                <span className="font-mono font-bold text-[#002c11]">#{selectedRefundForExecution.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717970]">Order #:</span>
                <span className="font-bold text-[#002c11]">{selectedRefundForExecution.orderNumber || selectedRefundForExecution.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717970]">Method:</span>
                <span className="font-bold uppercase text-[#002c11]">{selectedRefundForExecution.refundMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717970]">Account/Phone:</span>
                <span className="font-mono font-bold text-[#002c11]">
                  {selectedRefundForExecution.accountDetails?.accountNumber || selectedRefundForExecution.customerPhone || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-[#c1c9be]/20">
                <span className="font-bold text-[#002c11]">Payable Sum:</span>
                <span className="font-extrabold text-[#1b6d24]">৳{selectedRefundForExecution.amount}</span>
              </div>
            </div>

            <form onSubmit={handleCompleteRefundConfirm} className="space-y-3">
              <div>
                <label className="block font-bold text-[#002c11] mb-1">
                  Settlement Transaction ID / Reference *
                </label>
                <input
                  type="text"
                  value={executionTxId}
                  onChange={(e) => setExecutionTxId(e.target.value)}
                  placeholder="e.g. TXN-BKASH-84920492"
                  className="w-full px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#002c11] mb-1">
                  Disbursement Audit Notes
                </label>
                <textarea
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                  placeholder="Enter audit verification details..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#f0eded]">
                <button
                  type="button"
                  onClick={() => setSelectedRefundForExecution(null)}
                  className="px-4 py-2 bg-[#f0eded] text-[#717970] rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002c11] text-[#a0f399] rounded-xl font-bold hover:bg-[#003d18]"
                >
                  Confirm & Write to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REFUND AUDIT LOGS MODAL */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#c1c9be]/40 animate-scaleUp text-xs">
            <div className="flex items-center justify-between border-b border-[#f0eded] pb-3">
              <h3 className="font-extrabold text-[#002c11] text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#1b6d24]" />
                <span>Immutable Refund Audit Trail (refund_logs)</span>
              </h3>
              <button onClick={() => setIsLogsModalOpen(false)} className="p-1 rounded-lg hover:bg-[#f0eded]">
                <X className="w-4 h-4 text-[#717970]" />
              </button>
            </div>

            {loadingLogs ? (
              <div className="p-8 text-center text-[#717970] animate-pulse">Loading audit logs...</div>
            ) : selectedRefundLogs.length === 0 ? (
              <div className="p-8 text-center text-[#717970]">No log records recorded yet.</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedRefundLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#002c11] uppercase tracking-wide text-[10px]">
                        {log.action}
                      </span>
                      <span className="font-mono text-[10px] text-[#717970]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#3c4a3e]">
                      Status transitioned to: <strong>{log.newStatus}</strong> by {log.actorName} ({log.actorRole})
                    </div>
                    {log.transactionId && (
                      <div className="text-[10px] font-mono text-[#1b6d24]">TxID: {log.transactionId}</div>
                    )}
                    {log.notes && <div className="text-[11px] text-[#717970] italic">"{log.notes}"</div>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#f0eded]">
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="px-4 py-1.5 bg-[#002c11] text-white rounded-xl font-bold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Details & Audit Modal */}
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
    </div>
  );
};
