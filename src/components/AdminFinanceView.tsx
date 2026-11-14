import React, { useState, useEffect } from 'react';
import {
  SellerPlan,
  CommissionSetting,
  SellerWithdrawalRequest,
  FinancialLedgerEntry,
  SellerPerformance,
  SellerWarning,
  SellerRestriction,
  SellerPromotionCampaign,
  Coupon,
  FeaturedSpotlight,
  WithdrawalStatus,
  SellerProfile,
  Category,
  UserRole,
  SellerSettlementRecord,
  SellerSettlementStatus,
} from '../types';
import {
  fetchAllWithdrawals,
  fetchAllLedgerEntries,
  updateWithdrawalStatusByAdmin,
  fetchAllWarnings,
  fetchAllRestrictions,
  issueSellerWarning,
  imposeSellerRestriction,
  liftSellerRestriction,
  fetchAllCoupons,
  createCouponInDb,
  updateCouponInDb,
  deleteCouponInDb,
  fetchSellerPromotions,
  updatePromotionStatus,
  fetchFeaturedSpotlights,
  setFeaturedSpotlight,
  removeFeaturedSpotlight,
  recordManualAdjustment,
  fetchAllSettlements,
  createSellerSettlement,
  updateSettlementStatusByAdmin as updateSettlementStatus,
} from '../services/financeService';
import {
  fetchSellerPlans,
  createSellerPlanInDb,
  updateSellerPlanInDb,
  fetchCommissionSettings,
  updateCommissionSettingsInDb,
  fetchAllSellers,
  fetchCategories,
} from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Percent,
  Layers,
  Award,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Lock,
  Unlock,
  ShieldCheck,
  Send,
  Download,
  X,
  CreditCard,
} from 'lucide-react';

export const AdminFinanceView: React.FC = () => {
  const { userProfile, role, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'withdrawals' | 'settlements' | 'ledger' | 'plans' | 'commission' | 'performance' | 'coupons' | 'spotlights'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core Data States
  const [withdrawals, setWithdrawals] = useState<SellerWithdrawalRequest[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<FinancialLedgerEntry[]>([]);
  const [settlements, setSettlements] = useState<SellerSettlementRecord[]>([]);
  const [plans, setPlans] = useState<SellerPlan[]>([]);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting | null>(null);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warnings, setWarnings] = useState<SellerWarning[]>([]);
  const [restrictions, setRestrictions] = useState<SellerRestriction[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [promotions, setPromotions] = useState<SellerPromotionCampaign[]>([]);
  const [spotlights, setSpotlights] = useState<FeaturedSpotlight[]>([]);

  // Filters
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('ALL');
  const [ledgerFilter, setLedgerFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<SellerWithdrawalRequest | null>(null);
  const [trxRefInput, setTrxRefInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [isDisbursingViaGateway, setIsDisbursingViaGateway] = useState(false);

  // Settlements Modals & States
  const [selectedSettlement, setSelectedSettlement] = useState<SellerSettlementRecord | null>(null);
  const [showCreateSettlementModal, setShowCreateSettlementModal] = useState(false);
  const [newSettlementSellerId, setNewSettlementSellerId] = useState('');
  const [newSettlementPeriodStart, setNewSettlementPeriodStart] = useState(
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [newSettlementPeriodEnd, setNewSettlementPeriodEnd] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isCreatingSettlement, setIsCreatingSettlement] = useState(false);

  // Manual Adjustment States
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjSellerId, setAdjSellerId] = useState('');
  const [adjType, setAdjType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjAmount, setAdjAmount] = useState('500');
  const [adjCategory, setAdjCategory] = useState<'bonus' | 'penalty' | 'fee_waiver' | 'damage_claim' | 'dispute_settlement' | 'other'>('bonus');
  const [adjReason, setAdjReason] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  // Plan Edit / Create Modal
  const [editingPlan, setEditingPlan] = useState<SellerPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Warning / Restriction Modal
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [targetSellerId, setTargetSellerId] = useState('');
  const [warningTitle, setWarningTitle] = useState('');
  const [warningReason, setWarningReason] = useState('');
  const [warningSeverity, setWarningSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [restrictionType, setRestrictionType] = useState<any>('store_suspended');
  const [restrictionReason, setRestrictionReason] = useState('');

  // Coupon Modal
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState('15');
  const [couponMinOrder, setCouponMinOrder] = useState('1000');
  const [couponMaxDiscount, setCouponMaxDiscount] = useState('500');
  const [couponUsageLimit, setCouponUsageLimit] = useState('100');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        w,
        l,
        stlmts,
        p,
        cs,
        s,
        cats,
        warns,
        restrs,
        coups,
        proms,
        spots,
      ] = await Promise.all([
        fetchAllWithdrawals(),
        fetchAllLedgerEntries(),
        fetchAllSettlements(),
        fetchSellerPlans(),
        fetchCommissionSettings(),
        fetchAllSellers(),
        fetchCategories(),
        fetchAllWarnings(),
        fetchAllRestrictions(),
        fetchAllCoupons(),
        fetchSellerPromotions(),
        fetchFeaturedSpotlights(),
      ]);

      setWithdrawals(w);
      setLedgerEntries(l);
      setSettlements(stlmts);
      setPlans(p);
      setCommissionSettings(cs);
      setSellers(s);
      setCategories(cats);
      setWarnings(warns);
      setRestrictions(restrs);
      setCoupons(coups);
      setPromotions(proms);
      setSpotlights(spots);
    } catch (err) {
      console.error('Error loading admin finance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Disburse via Automated Gateway (Direct Payout Registry)
  const handleDisburseViaGateway = async () => {
    if (!selectedWithdrawal) return;
    try {
      setIsDisbursingViaGateway(true);
      const res = await fetch('/api/finance/payout/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.id,
          sellerId: selectedWithdrawal.sellerId,
          sellerName: selectedWithdrawal.sellerName,
          storeName: selectedWithdrawal.storeName,
          amount: selectedWithdrawal.amount,
          currency: 'BDT',
          method: selectedWithdrawal.withdrawalMethod,
          accountDetails: selectedWithdrawal.accountDetails,
          notes: adminNotesInput.trim() || 'Automated payout gateway disbursement',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Payout gateway disbursement failed');
      }
      const gatewayRef = data.providerReference || data.transactionRef || `GW-${Date.now()}`;

      await updateWithdrawalStatusByAdmin(
        selectedWithdrawal.id,
        {
          id: currentUser?.uid || userProfile?.id || 'admin-root',
          name: userProfile?.fullName || userProfile?.displayName || 'Admin Auditor',
          role: 'admin',
        },
        'PAID',
        {
          transactionRef: gatewayRef,
          adminNotes: `Disbursed via ${data.providerId || selectedWithdrawal.withdrawalMethod} (${data.mode || 'LIVE/SANDBOX'}) - ${data.message || ''}`,
        }
      );
      setSelectedWithdrawal(null);
      setTrxRefInput('');
      setAdminNotesInput('');
      showToast(`Disbursed ৳${selectedWithdrawal.amount.toLocaleString()} via ${selectedWithdrawal.withdrawalMethod.toUpperCase()}: ${gatewayRef}`);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Payout disbursement failed');
    } finally {
      setIsDisbursingViaGateway(false);
    }
  };

  // Record Manual Adjustment (Credits / Debits)
  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjSellerId) {
      showToast('Please select a seller.');
      return;
    }
    const numAmount = parseFloat(adjAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid positive adjustment amount.');
      return;
    }
    if (!adjReason.trim()) {
      showToast('Please enter a clear reason for this financial adjustment.');
      return;
    }
    try {
      setIsSubmittingAdj(true);
      const selectedSeller = sellers.find((s) => s.id === adjSellerId);
      await recordManualAdjustment({
        sellerId: adjSellerId,
        sellerName: selectedSeller?.fullName || selectedSeller?.storeName || 'Artisan Seller',
        amount: numAmount,
        type: adjType.toLowerCase() as 'credit' | 'debit',
        reason: `[${adjCategory.toUpperCase()}] ${adjReason.trim()}`,
        adminId: currentUser?.uid || userProfile?.id || 'admin-root',
        adminName: userProfile?.fullName || userProfile?.displayName || 'Admin Auditor',
      });
      setShowAdjustmentModal(false);
      setAdjReason('');
      showToast(`Successfully recorded ${adjType} of ৳${numAmount.toLocaleString()} to seller balance & ledger.`);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to record manual adjustment.');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  // Create Settlement Cycle
  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSettlementSellerId) {
      showToast('Please select a seller.');
      return;
    }
    try {
      setIsCreatingSettlement(true);
      const selectedSeller = sellers.find((s) => s.id === newSettlementSellerId);
      const rec = await createSellerSettlement({
        sellerId: newSettlementSellerId,
        sellerName: selectedSeller?.fullName || 'Artisan Seller',
        storeName: selectedSeller?.storeName || 'Artisan Store',
        periodStart: new Date(newSettlementPeriodStart).toISOString(),
        periodEnd: new Date(newSettlementPeriodEnd + 'T23:59:59.999Z').toISOString(),
        actor: {
          id: currentUser?.uid || userProfile?.id || 'admin-root',
          name: userProfile?.fullName || userProfile?.displayName || 'Admin Auditor',
        },
      });
      setShowCreateSettlementModal(false);
      showToast(`Generated settlement sheet #${rec.settlementNumber || rec.id} with Net ৳${rec.netPayable.toLocaleString()}`);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create settlement sheet.');
    } finally {
      setIsCreatingSettlement(false);
    }
  };

  // Update Settlement Status
  const handleUpdateSettlementStatus = async (settlementId: string, status: SellerSettlementStatus) => {
    try {
      await updateSettlementStatus(
        settlementId,
        status,
        {
          actor: {
            id: currentUser?.uid || userProfile?.id || 'admin-root',
            name: userProfile?.fullName || userProfile?.displayName || 'Admin Auditor',
          },
          notes: `Status changed to ${status} by admin audit.`,
        }
      );
      showToast(`Settlement marked as ${status}`);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update settlement status.');
    }
  };

  // Process Withdrawal Action
  const handleProcessWithdrawal = async (newStatus: WithdrawalStatus) => {
    if (!selectedWithdrawal) return;
    try {
      await updateWithdrawalStatusByAdmin(
        selectedWithdrawal.id,
        {
          id: currentUser?.uid || userProfile?.id || 'admin-root',
          name: userProfile?.fullName || userProfile?.displayName || 'Admin Auditor',
          role: 'admin',
        },
        newStatus,
        {
          transactionRef: trxRefInput.trim(),
          adminNotes: adminNotesInput.trim(),
          rejectionReason: rejectionReasonInput.trim(),
        }
      );

      setSelectedWithdrawal(null);
      setTrxRefInput('');
      setAdminNotesInput('');
      setRejectionReasonInput('');
      showToast(`Withdrawal #${selectedWithdrawal.id} marked as ${newStatus}`);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update withdrawal.');
    }
  };

  // Save Plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      if (editingPlan.id) {
        await updateSellerPlanInDb(editingPlan.id, editingPlan, currentUser?.uid || 'admin');
      } else {
        await createSellerPlanInDb(editingPlan, currentUser?.uid || 'admin');
      }
      setShowPlanModal(false);
      setEditingPlan(null);
      showToast(`Seller Plan "${editingPlan.name}" saved successfully.`);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save seller plan');
    }
  };

  // Save Commission Matrix
  const handleSaveCommissionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commissionSettings) return;
    try {
      await updateCommissionSettingsInDb(commissionSettings, currentUser?.uid || 'admin');
      showToast('Global Commission & Settlement Rules saved.');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save commission rules');
    }
  };

  // Issue Warning
  const handleIssueWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSellerId || !warningTitle || !warningReason) return;
    try {
      const targetSeller = sellers.find((s) => s.id === targetSellerId);
      await issueSellerWarning({
        sellerId: targetSellerId,
        sellerName: targetSeller?.fullName || targetSeller?.storeName || 'Seller',
        storeName: targetSeller?.storeName,
        type: 'policy_violation',
        title: warningTitle,
        reason: warningReason,
        severity: warningSeverity,
        issuedBy: userProfile?.fullName || 'SUNNO Admin',
      });
      setShowWarningModal(false);
      setWarningTitle('');
      setWarningReason('');
      showToast('Seller warning issued and logged.');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to issue warning');
    }
  };

  // Impose Restriction
  const handleImposeRestriction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSellerId || !restrictionReason) return;
    try {
      const targetSeller = sellers.find((s) => s.id === targetSellerId);
      await imposeSellerRestriction({
        sellerId: targetSellerId,
        sellerName: targetSeller?.fullName || targetSeller?.storeName || 'Seller',
        type: restrictionType,
        reason: restrictionReason,
        imposedBy: userProfile?.fullName || 'SUNNO Admin',
      });
      setShowRestrictionModal(false);
      setRestrictionReason('');
      showToast(`Restriction applied to seller.`);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to impose restriction');
    }
  };

  // Lift Restriction
  const handleLiftRestriction = async (rId: string) => {
    try {
      await liftSellerRestriction(rId, {
        id: currentUser?.uid || 'admin',
        name: userProfile?.fullName || 'Admin',
      });
      showToast('Restriction lifted successfully.');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to lift restriction');
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    try {
      await createCouponInDb(
        {
          code: couponCode,
          discountType: couponType,
          discountValue: parseFloat(couponValue) || 10,
          minOrderAmount: parseFloat(couponMinOrder) || 0,
          maxDiscount: parseFloat(couponMaxDiscount) || undefined,
          usageLimit: parseInt(couponUsageLimit) || undefined,
          active: true,
        },
        currentUser?.uid || 'admin'
      );
      setShowCouponModal(false);
      setCouponCode('');
      showToast('Coupon created successfully.');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create coupon');
    }
  };

  // Total Metric Calculations
  let totalGMV = 0;
  let totalCommissionEarned = 0;
  let totalDisbursed = 0;
  let totalPendingWithdrawals = 0;

  ledgerEntries.forEach((le) => {
    if (le.type === 'SALE') totalGMV += le.amount;
    else if (le.type === 'COMMISSION') totalCommissionEarned += Math.abs(le.amount);
  });

  withdrawals.forEach((w) => {
    if (w.status === 'PAID') totalDisbursed += w.amount;
    else if (
      w.status === 'REQUESTED' ||
      w.status === 'UNDER_REVIEW' ||
      w.status === 'PROCESSING' ||
      w.status === 'APPROVED'
    ) {
      totalPendingWithdrawals += w.amount;
    }
  });

  const pendingWithdrawalCount = withdrawals.filter(
    (w) => w.status === 'REQUESTED' || w.status === 'UNDER_REVIEW'
  ).length;

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter === 'ALL') return true;
    return w.status === withdrawalFilter;
  });

  const filteredLedger = ledgerEntries.filter((le) => {
    if (ledgerFilter !== 'ALL' && le.type !== ledgerFilter) return false;
    if (searchTerm) {
      const match =
        le.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        le.sellerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (le.reference && le.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (le.description && le.description.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div id="admin-finance-suite" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#002c11] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#347434] animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#a0f399]" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e0dede]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#002c11] text-[#a0f399] text-xs font-bold rounded-full">
              SUNNO Master Ledger & Finance
            </span>
            <span className="text-xs text-[#717970]">• Phase 8 Executive Suite</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#002c11] font-heading mt-1">
            Financial Clearing, Commission & Seller Plans
          </h2>
          <p className="text-xs text-[#414941] mt-0.5">
            Audit-grade double-entry ledger, deterministic commission calculation, and MFS disbursement gateway.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdjustmentModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-[#f0eded] text-[#002c11] border border-[#c1c9be] rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-xs transition-all"
          >
            <Percent className="w-4 h-4 text-purple-700" />
            <span>Manual Adjustment</span>
          </button>
          <button
            onClick={() => setShowCreateSettlementModal(true)}
            className="px-3.5 py-2 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-xs transition-all"
          >
            <CreditCard className="w-4 h-4 text-[#a0f399]" />
            <span>New Settlement</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 bg-white hover:bg-[#f0eded] text-[#002c11] border border-[#c1c9be] rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-xs transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#1b6d24]' : ''}`} />
            <span>Sync Engine</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Executive Financials', icon: DollarSign },
          {
            id: 'withdrawals',
            label: `Payout Requests (${pendingWithdrawalCount} Pending)`,
            icon: Wallet,
          },
          {
            id: 'settlements',
            label: `Settlements & Payouts (${settlements.length})`,
            icon: CreditCard,
          },
          { id: 'ledger', label: 'Master Financial Ledger', icon: FileText },
          { id: 'plans', label: 'Seller Plans & Quotas', icon: Layers },
          { id: 'commission', label: 'Commission Matrix', icon: Percent },
          { id: 'performance', label: 'Compliance & Warnings', icon: ShieldCheck },
          { id: 'coupons', label: 'Coupons & Campaigns', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#002c11] text-white shadow-sm'
                  : 'bg-white text-[#414941] border border-[#c1c9be]/60 hover:bg-[#f0eded]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#a0f399]' : 'text-[#717970]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE FINANCIAL OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Gross Merchandise Value */}
            <div className="p-5 bg-gradient-to-br from-[#002c11] to-[#0d4421] text-white rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 bg-white/20 text-[#a0f399] text-[11px] font-bold rounded-full">
                  Total Platform GMV
                </span>
                <DollarSign className="w-5 h-5 text-[#a0f399]" />
              </div>
              <div>
                <p className="text-3xl font-extrabold font-heading text-white">
                  ৳{totalGMV.toLocaleString()}
                </p>
                <p className="text-xs text-emerald-200 mt-1">
                  100% Genuine Bangladeshi Artisan Sales
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-emerald-200">
                <span>Total Transactions: {ledgerEntries.length}</span>
                <span className="text-[#a0f399] font-bold">100% Reconciled</span>
              </div>
            </div>

            {/* Platform Commission Earned */}
            <div className="p-5 bg-white border border-[#c1c9be] rounded-3xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 bg-[#e8f5e9] text-[#1b6d24] text-[11px] font-bold rounded-full border border-[#a0f399]">
                  Platform Commission
                </span>
                <Percent className="w-5 h-5 text-[#1b6d24]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#002c11] font-heading">
                  ৳{totalCommissionEarned.toLocaleString()}
                </p>
                <p className="text-xs text-[#717970] mt-1">
                  Net SUNNO marketplace revenue
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#e0dede] flex items-center justify-between text-xs text-[#717970]">
                <span>Avg Rate: ~8-10%</span>
                <span className="text-[#1b6d24] font-bold">Auto Deducted</span>
              </div>
            </div>

            {/* Pending Payout Requests */}
            <div className="p-5 bg-white border border-[#c1c9be] rounded-3xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-full border border-amber-200">
                  Pending Disbursements
                </span>
                <Wallet className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#002c11] font-heading">
                  ৳{totalPendingWithdrawals.toLocaleString()}
                </p>
                <p className="text-xs text-[#717970] mt-1">
                  {pendingWithdrawalCount} requests awaiting audit approval
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#e0dede] flex items-center justify-between text-xs text-[#717970]">
                <button
                  onClick={() => setActiveTab('withdrawals')}
                  className="text-amber-800 font-bold hover:underline"
                >
                  Review Queue →
                </button>
                <span className="text-amber-700 font-semibold">Action Required</span>
              </div>
            </div>

            {/* Total Paid Out */}
            <div className="p-5 bg-white border border-[#c1c9be] rounded-3xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 text-[11px] font-bold rounded-full border border-blue-200">
                  Total Disbursed
                </span>
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#002c11] font-heading">
                  ৳{totalDisbursed.toLocaleString()}
                </p>
                <p className="text-xs text-[#717970] mt-1">
                  Transferred via bKash, Nagad, BEFTN / NPSB
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#e0dede] flex items-center justify-between text-xs text-[#717970]">
                <span>Disbursement Fee: 0%</span>
                <span className="font-semibold text-blue-700">Protected</span>
              </div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('withdrawals')}
              className="p-5 bg-white border border-[#c1c9be] hover:border-[#002c11] rounded-3xl shadow-xs cursor-pointer transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#002c11]">Process Seller Withdrawals</h4>
              <p className="text-xs text-[#717970] mt-1">
                Approve, reject, or mark payouts as paid with bank/MFS transaction numbers.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('commission')}
              className="p-5 bg-white border border-[#c1c9be] hover:border-[#002c11] rounded-3xl shadow-xs cursor-pointer transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mb-3">
                <Percent className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#002c11]">Configure Commission Matrix</h4>
              <p className="text-xs text-[#717970] mt-1">
                Set category-level rates (Bamboo 8%, Terracotta 6%) and special artisan overrides.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('plans')}
              className="p-5 bg-white border border-[#c1c9be] hover:border-[#002c11] rounded-3xl shadow-xs cursor-pointer transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#002c11]">Manage Seller Tiers & Plans</h4>
              <p className="text-xs text-[#717970] mt-1">
                Create new subscription tiers, product limits, and registration fees.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WITHDRAWAL REQUESTS PROCESSING */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#002c11] font-heading">
                Seller Withdrawal Disbursement Queue
              </h3>
              <p className="text-xs text-[#717970]">
                Review artisan payout requests. Approving or marking as paid updates the master financial ledger.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={withdrawalFilter}
                onChange={(e) => setWithdrawalFilter(e.target.value)}
                className="bg-[#f0eded] border border-[#c1c9be] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#002c11] outline-none"
              >
                <option value="ALL">All Statuses ({withdrawals.length})</option>
                <option value="REQUESTED">Requested ({withdrawals.filter((w) => w.status === 'REQUESTED').length})</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PROCESSING">Processing</option>
                <option value="PAID">Paid ({withdrawals.filter((w) => w.status === 'PAID').length})</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div className="py-12 text-center text-[#717970]">
              <Wallet className="w-8 h-8 mx-auto text-[#c1c9be] mb-2" />
              <p className="text-xs font-bold">No withdrawal requests found for this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e0dede] text-[#717970] font-semibold">
                    <th className="pb-3">Request ID</th>
                    <th className="pb-3">Seller / Store</th>
                    <th className="pb-3">Method & Account</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Requested At</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eded]">
                  {filteredWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-[#fbf9f8] transition-colors">
                      <td className="py-3 font-mono font-bold text-[#002c11]">{w.id}</td>
                      <td className="py-3">
                        <span className="font-bold text-[#002c11] block">{w.storeName || w.sellerName}</span>
                        <span className="text-[11px] text-[#717970]">ID: {w.sellerId}</span>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-[#002c11] uppercase">{w.withdrawalMethod}</span>
                        <span className="text-[11px] text-[#717970] block">
                          {w.accountDetails.maskedAccount || w.accountDetails.accountNumber}
                          {w.accountDetails.bankName ? ` (${w.accountDetails.bankName})` : ''}
                        </span>
                      </td>
                      <td className="py-3 text-right font-extrabold text-[#002c11]">
                        ৳{w.amount.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                            w.status === 'PAID'
                              ? 'bg-[#e8f5e9] text-[#1b6d24] border border-[#a0f399]'
                              : w.status === 'REJECTED' || w.status === 'FAILED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 text-[#717970]">{w.requestedAt.slice(0, 16).replace('T', ' ')}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(w);
                            setTrxRefInput(w.transactionRef || '');
                            setAdminNotesInput(w.adminNotes || '');
                            setRejectionReasonInput(w.rejectionReason || '');
                          }}
                          className="px-3 py-1.5 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-lg font-bold text-xs shadow-xs"
                        >
                          Review & Action
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: SETTLEMENTS & DISBURSEMENTS */}
      {activeTab === 'settlements' && (
        <div className="space-y-6">
          {/* Executive Settlement Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-[#c1c9be] rounded-3xl shadow-xs">
              <span className="text-[11px] font-bold text-[#717970] uppercase block">Total Cycles</span>
              <span className="text-2xl font-black text-[#002c11] mt-1 block">{settlements.length}</span>
              <span className="text-xs text-[#717970]">Settlement sheets generated</span>
            </div>
            <div className="p-5 bg-white border border-[#c1c9be] rounded-3xl shadow-xs">
              <span className="text-[11px] font-bold text-[#717970] uppercase block">Gross Settled Volume</span>
              <span className="text-2xl font-black text-[#002c11] mt-1 block">
                ৳{settlements.reduce((acc, s) => acc + (s.grossSales || 0), 0).toLocaleString()}
              </span>
              <span className="text-xs text-emerald-700 font-semibold">Delivered & Return Cleared</span>
            </div>
            <div className="p-5 bg-white border border-[#c1c9be] rounded-3xl shadow-xs">
              <span className="text-[11px] font-bold text-[#717970] uppercase block">Commission Retained</span>
              <span className="text-2xl font-black text-purple-700 mt-1 block">
                ৳{settlements.reduce((acc, s) => acc + (s.commission || s.platformCommission || 0), 0).toLocaleString()}
              </span>
              <span className="text-xs text-[#717970]">Fair-share platform fee</span>
            </div>
            <div className="p-5 bg-emerald-50/70 border border-[#a0f399] rounded-3xl shadow-xs">
              <span className="text-[11px] font-bold text-[#1b6d24] uppercase block">Net Disbursed</span>
              <span className="text-2xl font-black text-[#002c11] mt-1 block">
                ৳{settlements
                  .filter((s) => s.status === 'PAID')
                  .reduce((acc, s) => acc + (s.netPayable || 0), 0)
                  .toLocaleString()}
              </span>
              <span className="text-xs text-[#1b6d24] font-semibold">Paid to seller accounts</span>
            </div>
          </div>

          {/* Settlements Table Container */}
          <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#002c11] font-heading">
                  Artisan Settlement Sheets
                </h3>
                <p className="text-xs text-[#717970]">
                  Periodic accounting runs reconciling orders, commission deductions, courier charges, and net payables.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateSettlementModal(true)}
                  className="px-3.5 py-2 bg-[#002c11] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-[#0d4421] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate Cycle</span>
                </button>
              </div>
            </div>

            {settlements.length === 0 ? (
              <div className="py-12 text-center text-[#717970] space-y-2">
                <CreditCard className="w-8 h-8 mx-auto text-[#c1c9be]" />
                <p className="text-xs font-bold text-[#002c11]">No settlements recorded in the treasury.</p>
                <p className="text-[11px]">
                  Click "Generate Cycle" above to calculate and record periodic settlements for an artisan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e0dede] text-[#717970] font-semibold">
                      <th className="pb-3">Sheet #</th>
                      <th className="pb-3">Artisan Store</th>
                      <th className="pb-3">Period</th>
                      <th className="pb-3 text-right">Gross Sales</th>
                      <th className="pb-3 text-right">Commission</th>
                      <th className="pb-3 text-right">Courier/Refunds</th>
                      <th className="pb-3 text-right">Net Payable</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Audit & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0eded]">
                    {settlements.map((s) => {
                      let statusBadge = (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full font-bold text-[10px] border border-amber-200">
                          {s.status}
                        </span>
                      );
                      if (s.status === 'PAID') {
                        statusBadge = (
                          <span className="px-2 py-0.5 bg-[#e8f5e9] text-[#1b6d24] rounded-full font-bold text-[10px] border border-[#a0f399]">
                            PAID
                          </span>
                        );
                      } else if (s.status === 'PROCESSING' || s.status === 'READY') {
                        statusBadge = (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px] border border-blue-200">
                            {s.status}
                          </span>
                        );
                      } else if (s.status === 'ON_HOLD') {
                        statusBadge = (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full font-bold text-[10px] border border-red-200">
                            ON HOLD
                          </span>
                        );
                      }

                      return (
                        <tr key={s.id} className="hover:bg-[#fbf9f8] transition-colors">
                          <td className="py-3 font-mono font-bold text-[#002c11]">{s.settlementNumber || s.id}</td>
                          <td className="py-3">
                            <span className="font-bold text-[#002c11] block">{s.storeName || s.sellerName || s.sellerId}</span>
                            <span className="text-[10px] text-[#717970] font-mono">{s.sellerId}</span>
                          </td>
                          <td className="py-3 text-[#717970]">
                            {s.period || `${s.periodStart?.slice(0, 10)} to ${s.periodEnd?.slice(0, 10)}`}
                          </td>
                          <td className="py-3 text-right font-bold text-[#002c11]">
                            ৳{s.grossSales.toLocaleString()}
                          </td>
                          <td className="py-3 text-right font-mono text-purple-700">
                            -৳{(s.commission || s.platformCommission || 0).toLocaleString()}
                          </td>
                          <td className="py-3 text-right font-mono text-[#717970]">
                            -৳{((s.courierFees || 0) + (s.refunds || s.refundAdjustments || 0)).toLocaleString()}
                          </td>
                          <td className="py-3 text-right font-black text-[#1b6d24]">
                            ৳{s.netPayable.toLocaleString()}
                          </td>
                          <td className="py-3">{statusBadge}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {s.status !== 'PAID' && (
                                <button
                                  onClick={() => handleUpdateSettlementStatus(s.id, 'PAID')}
                                  className="px-2 py-1 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-lg text-[10px] font-bold"
                                  title="Mark as Paid"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {s.status !== 'ON_HOLD' && s.status !== 'PAID' && (
                                <button
                                  onClick={() => handleUpdateSettlementStatus(s.id, 'ON_HOLD')}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-bold border border-red-200"
                                  title="Put On Hold"
                                >
                                  Hold
                                </button>
                              )}
                              {s.status === 'ON_HOLD' && (
                                <button
                                  onClick={() => handleUpdateSettlementStatus(s.id, 'READY')}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200"
                                  title="Lift Hold"
                                >
                                  Release
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedSettlement(s)}
                                className="px-2.5 py-1 bg-[#f0eded] hover:bg-[#e0dede] text-[#002c11] rounded-lg text-[10px] font-bold transition-all"
                              >
                                Audit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MASTER FINANCIAL LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#002c11] font-heading">Global Platform Financial Ledger</h3>
              <p className="text-xs text-[#717970]">
                Immutable double-entry log of all platform financial movements across all artisans.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#717970] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Ledger ID, Seller, Ref..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#f0eded] border border-[#c1c9be] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#002c11] outline-none"
                />
              </div>

              <select
                value={ledgerFilter}
                onChange={(e) => setLedgerFilter(e.target.value)}
                className="bg-[#f0eded] border border-[#c1c9be] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#002c11] outline-none"
              >
                <option value="ALL">All Types ({ledgerEntries.length})</option>
                <option value="SALE">Sales (Credits)</option>
                <option value="COMMISSION">Commission Cuts</option>
                <option value="WITHDRAWAL">Withdrawals</option>
                <option value="WITHDRAWAL_REVERSAL">Withdrawal Reversals</option>
                <option value="SELLER_PLAN_PAYMENT">Plan Payments</option>
                <option value="REFUND_DEDUCTION">Refunds</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e0dede] text-[#717970] font-semibold">
                  <th className="pb-3">Ledger ID</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Seller</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Description & Reference</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eded]">
                {filteredLedger.map((le) => {
                  const isCredit = le.amount > 0;
                  return (
                    <tr key={le.id} className="hover:bg-[#fbf9f8] transition-colors">
                      <td className="py-3 font-mono font-bold text-[#002c11]">{le.id}</td>
                      <td className="py-3 text-[#717970]">{le.createdAt.slice(0, 16).replace('T', ' ')}</td>
                      <td className="py-3 font-semibold text-[#002c11]">
                        {le.sellerName || le.sellerId}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            isCredit
                              ? 'bg-[#e8f5e9] text-[#1b6d24]'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {le.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-[#414941]">
                        <span>{le.description}</span>
                        {le.reference && (
                          <span className="text-[10px] text-[#717970] block font-mono">
                            Ref: {le.reference}
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3 text-right font-bold ${
                          isCredit ? 'text-[#1b6d24]' : 'text-red-700'
                        }`}
                      >
                        {isCredit ? '+' : ''}৳{Math.abs(le.amount).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-[10px] font-bold rounded-md uppercase">
                          {le.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SELLER PLANS MANAGEMENT */}
      {activeTab === 'plans' && (
        <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#002c11] font-heading">Seller Subscription Plans</h3>
              <p className="text-xs text-[#717970]">
                Configure artisan tier pricing, product limits, storage quotas, and commission brackets.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingPlan({
                  id: `plan-${Date.now()}`,
                  name: 'New Artisan Tier',
                  price: 1000,
                  registrationFee: 0,
                  subscriptionFee: 1000,
                  duration: 'yearly',
                  productLimit: 25,
                  maxImagesPerProduct: 5,
                  commissionRate: 8,
                  featuredStoreEligible: true,
                  analyticsAccess: 'basic',
                  promotionalTools: true,
                  features: ['Product Catalog', 'Direct MFS Payouts'],
                  active: true,
                });
                setShowPlanModal(true);
              }}
              className="px-4 py-2 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#a0f399]" />
              <span>Create New Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-3xl border border-[#c1c9be] bg-[#fbf9f8] flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-base text-[#002c11]">{p.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.active ? 'bg-[#e8f5e9] text-[#1b6d24]' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-2xl font-extrabold text-[#002c11] mt-2">
                    ৳{p.price} <span className="text-xs text-[#717970] font-normal">/ {p.duration}</span>
                  </p>
                  <p className="text-xs font-bold text-[#1b6d24] mt-0.5">
                    {p.commissionRate}% Commission Rate
                  </p>

                  <ul className="mt-4 space-y-1 text-xs text-[#414941] border-t border-[#e0dede] pt-3">
                    <li>• Product Limit: <strong>{p.productLimit}</strong> items</li>
                    <li>• Max Images: <strong>{p.maxImagesPerProduct || 5}</strong> per product</li>
                    <li>• Storage Quota: <strong>{p.maxStorageMb || 500} MB</strong></li>
                    <li>• Featured Store: <strong>{p.featuredStoreEligible ? 'Eligible' : 'No'}</strong></li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#e0dede]">
                  <button
                    onClick={() => {
                      setEditingPlan(p);
                      setShowPlanModal(true);
                    }}
                    className="px-3 py-1.5 bg-white border border-[#c1c9be] hover:bg-[#f0eded] text-[#002c11] rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Plan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: COMMISSION MATRIX CONFIGURATION */}
      {activeTab === 'commission' && (
        <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#002c11] font-heading">
              Deterministic Commission Matrix & Payout Rules
            </h3>
            <p className="text-xs text-[#717970]">
              SUNNO evaluates commission strictly in order of: (1) Seller Override → (2) Category Rate → (3) Plan Rate → (4) Global Default.
            </p>
          </div>

          {commissionSettings && (
            <form onSubmit={handleSaveCommissionSettings} className="space-y-6 text-xs">
              {/* Global Settings */}
              <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be] space-y-4">
                <h4 className="font-bold text-[#002c11] text-sm">1. Global Default Rate & Settlements</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1">
                      Default Global Commission % *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      required
                      value={commissionSettings.defaultCommissionRate}
                      onChange={(e) =>
                        setCommissionSettings({
                          ...commissionSettings,
                          defaultCommissionRate: parseFloat(e.target.value) || 10,
                        })
                      }
                      className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1">
                      Min Withdrawal Payout (BDT) *
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      required
                      value={commissionSettings.minPayoutThreshold}
                      onChange={(e) =>
                        setCommissionSettings({
                          ...commissionSettings,
                          minPayoutThreshold: parseFloat(e.target.value) || 500,
                        })
                      }
                      className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1">
                      Return Window Hold (Days) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      required
                      value={commissionSettings.earningReleaseDays || 7}
                      onChange={(e) =>
                        setCommissionSettings({
                          ...commissionSettings,
                          earningReleaseDays: parseInt(e.target.value) || 7,
                        })
                      }
                      className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Category Rates */}
              <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be] space-y-4">
                <h4 className="font-bold text-[#002c11] text-sm">2. Category-Specific Commission Rates</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((cat) => {
                    const currentRate =
                      commissionSettings.categoryRates?.[cat.name] ??
                      commissionSettings.defaultCommissionRate;
                    return (
                      <div key={cat.id} className="p-3 bg-white rounded-xl border border-[#c1c9be] flex items-center justify-between">
                        <span className="font-bold text-[#002c11]">{cat.name}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={currentRate}
                            onChange={(e) => {
                              const newRates = {
                                ...(commissionSettings.categoryRates || {}),
                                [cat.name]: parseFloat(e.target.value) || 10,
                              };
                              setCommissionSettings({
                                ...commissionSettings,
                                categoryRates: newRates,
                              });
                            }}
                            className="w-16 bg-[#f0eded] border border-[#c1c9be] rounded-lg px-2 py-1 text-center font-bold text-xs"
                          />
                          <span className="font-bold text-[#717970]">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#a0f399]" />
                  <span>Save Commission Matrix</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 6: COMPLIANCE, WARNINGS & RESTRICTIONS */}
      {activeTab === 'performance' && (
        <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#002c11] font-heading">
                Seller Health & Compliance Enforcement
              </h3>
              <p className="text-xs text-[#717970]">
                Issue formal quality warnings, suspend stores, or lock withdrawals for fraudulent or eco-violating behavior.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (sellers.length > 0) setTargetSellerId(sellers[0].id);
                  setShowWarningModal(true);
                }}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Issue Warning</span>
              </button>

              <button
                onClick={() => {
                  if (sellers.length > 0) setTargetSellerId(sellers[0].id);
                  setShowRestrictionModal(true);
                }}
                className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Lock className="w-4 h-4" />
                <span>Impose Restriction</span>
              </button>
            </div>
          </div>

          {/* Active Restrictions Table */}
          <div>
            <h4 className="text-xs font-bold text-[#002c11] mb-2 uppercase tracking-wider">
              Active Seller Restrictions ({restrictions.filter((r) => r.active).length})
            </h4>
            {restrictions.filter((r) => r.active).length === 0 ? (
              <p className="text-xs text-[#717970] p-4 bg-[#fbf9f8] rounded-xl">
                No active restrictions. All artisan stores are in good standing.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e0dede] text-[#717970] font-semibold">
                      <th className="pb-2">Seller</th>
                      <th className="pb-2">Restriction</th>
                      <th className="pb-2">Reason</th>
                      <th className="pb-2">Imposed By</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0eded]">
                    {restrictions
                      .filter((r) => r.active)
                      .map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 font-bold text-[#002c11]">{r.sellerName || r.sellerId}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-md font-bold text-[10px] uppercase">
                              {r.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 text-[#414941]">{r.reason}</td>
                          <td className="py-2.5 text-[#717970]">{r.imposedBy}</td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleLiftRestriction(r.id)}
                              className="px-3 py-1 bg-white border border-[#c1c9be] hover:bg-[#e8f5e9] text-[#1b6d24] rounded-lg font-bold text-xs"
                            >
                              Lift Restriction
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Warnings Log */}
          <div>
            <h4 className="text-xs font-bold text-[#002c11] mb-2 uppercase tracking-wider">
              Issued Warnings Log ({warnings.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e0dede] text-[#717970] font-semibold">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Seller</th>
                    <th className="pb-2">Severity</th>
                    <th className="pb-2">Warning Title</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eded]">
                  {warnings.map((w) => (
                    <tr key={w.id}>
                      <td className="py-2 text-[#717970]">{w.issuedAt.slice(0, 10)}</td>
                      <td className="py-2 font-bold text-[#002c11]">{w.sellerName || w.sellerId}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px] uppercase">
                          {w.severity}
                        </span>
                      </td>
                      <td className="py-2 text-[#414941]">{w.title}</td>
                      <td className="py-2 font-bold text-[#002c11]">{w.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: COUPONS & CAMPAIGNS */}
      {activeTab === 'coupons' && (
        <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#002c11] font-heading">
                Sitewide Coupons & Artisan Campaigns
              </h3>
              <p className="text-xs text-[#717970]">
                Manage promotional coupon codes, percentage discounts, and minimum order requirements.
              </p>
            </div>

            <button
              onClick={() => setShowCouponModal(true)}
              className="px-4 py-2 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#a0f399]" />
              <span>Create Coupon</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e0dede] text-[#717970] font-semibold">
                  <th className="pb-3">Coupon Code</th>
                  <th className="pb-3">Discount</th>
                  <th className="pb-3">Min Order</th>
                  <th className="pb-3">Usage Count</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eded]">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fbf9f8] transition-colors">
                    <td className="py-3 font-mono font-bold text-[#002c11] text-sm">{c.code}</td>
                    <td className="py-3 font-bold text-[#1b6d24]">
                      {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `৳${c.discountValue} OFF`}
                    </td>
                    <td className="py-3 text-[#414941]">৳{(c.minOrderAmount || 0).toLocaleString()}</td>
                    <td className="py-3 text-[#717970]">
                      {c.usedCount || 0} {c.usageLimit ? `/ ${c.usageLimit}` : 'times'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          c.active ? 'bg-[#e8f5e9] text-[#1b6d24]' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => deleteCouponInDb(c.id, currentUser?.uid || 'admin').then(loadAllData)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Deactivate Coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WITHDRAWAL REVIEW MODAL */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedWithdrawal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941] hover:bg-[#e0dede]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-extrabold text-[#002c11] font-heading">
              Review Payout Request #{selectedWithdrawal.id}
            </h3>

            <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#717970]">Artisan Store:</span>
                <span className="font-bold text-[#002c11]">{selectedWithdrawal.storeName || selectedWithdrawal.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717970]">Payout Method:</span>
                <span className="font-bold text-[#002c11] uppercase">{selectedWithdrawal.withdrawalMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717970]">Account Details:</span>
                <span className="font-mono font-bold text-[#002c11]">
                  {selectedWithdrawal.accountDetails.accountNumber}
                  {selectedWithdrawal.accountDetails.bankName ? ` (${selectedWithdrawal.accountDetails.bankName})` : ''}
                </span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#002c11] pt-2 border-t border-[#e0dede]">
                <span>Requested Amount:</span>
                <span className="text-[#1b6d24]">৳{selectedWithdrawal.amount.toLocaleString()} BDT</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">
                  Bank / MFS Transaction Reference ID (TRX ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BKASH-TX-99821873 or BEFTN-09281"
                  value={trxRefInput}
                  onChange={(e) => setTrxRefInput(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Admin Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Verified artisan bank account details with branch manager"
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">
                  Rejection Reason (Mandatory if rejecting)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Account number does not match registered trade license name"
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none text-red-700"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-[#e0dede]">
              <button
                type="button"
                onClick={() => handleProcessWithdrawal('REJECTED')}
                className="w-full sm:w-auto px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs border border-red-200"
              >
                Reject & Reverse
              </button>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleProcessWithdrawal('PROCESSING')}
                  className="px-3.5 py-2 bg-[#f0eded] hover:bg-[#e0dede] text-[#002c11] rounded-xl font-bold text-xs"
                >
                  Mark Processing
                </button>
                <button
                  type="button"
                  onClick={handleDisburseViaGateway}
                  disabled={isDisbursingViaGateway}
                  className="px-4 py-2 bg-[#1b6d24] hover:bg-[#002c11] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Send className={`w-3.5 h-3.5 ${isDisbursingViaGateway ? 'animate-spin' : ''}`} />
                  <span>{isDisbursingViaGateway ? 'Disbursing...' : 'Disburse via Gateway'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessWithdrawal('PAID')}
                  className="px-4 py-2 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl font-bold text-xs shadow-md"
                >
                  Mark as Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAN CREATE / EDIT MODAL */}
      {showPlanModal && editingPlan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowPlanModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941] hover:bg-[#e0dede]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-extrabold text-[#002c11] font-heading">
              Configure Seller Subscription Plan
            </h3>

            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Price / Fee (BDT) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingPlan.price}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Duration *</label>
                  <select
                    value={editingPlan.duration}
                    onChange={(e: any) => setEditingPlan({ ...editingPlan, duration: e.target.value })}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none font-bold"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Product Limit *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingPlan.productLimit}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, productLimit: parseInt(e.target.value) || 10 })
                    }
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Commission Rate (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={editingPlan.commissionRate}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        commissionRate: parseFloat(e.target.value) || 10,
                      })
                    }
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.featuredStoreEligible}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, featuredStoreEligible: e.target.checked })
                    }
                    className="rounded accent-[#002c11]"
                  />
                  <span className="font-bold text-[#002c11]">Featured Store Badge</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.active}
                    onChange={(e) => setEditingPlan({ ...editingPlan, active: e.target.checked })}
                    className="rounded accent-[#002c11]"
                  />
                  <span className="font-bold text-[#002c11]">Active Plan</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#e0dede]">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 bg-[#f0eded] text-[#414941] rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#002c11] text-white rounded-xl font-bold shadow-md"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WARNING MODAL */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowWarningModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-extrabold text-[#002c11] font-heading">
              Issue Formal Seller Warning
            </h3>

            <form onSubmit={handleIssueWarning} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Target Seller *</label>
                <select
                  value={targetSellerId}
                  onChange={(e) => setTargetSellerId(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none font-bold"
                >
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.storeName || s.fullName} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Severity</label>
                <select
                  value={warningSeverity}
                  onChange={(e: any) => setWarningSeverity(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none font-bold"
                >
                  <option value="low">Low (Notice)</option>
                  <option value="medium">Medium (Correction Required)</option>
                  <option value="high">High (Action Required)</option>
                  <option value="critical">Critical (Final Notice)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Warning Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Order Cancellation Rate Exceeded 10%"
                  value={warningTitle}
                  onChange={(e) => setWarningTitle(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Detailed Explanation *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the defect, cancellation pattern, or policy violation..."
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0dede]">
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  className="px-4 py-2 bg-[#f0eded] text-[#414941] rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md"
                >
                  Issue Warning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTRICTION MODAL */}
      {showRestrictionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowRestrictionModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-extrabold text-[#002c11] font-heading">
              Impose Seller Restriction
            </h3>

            <form onSubmit={handleImposeRestriction} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Target Seller *</label>
                <select
                  value={targetSellerId}
                  onChange={(e) => setTargetSellerId(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none font-bold"
                >
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.storeName || s.fullName} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Restriction Type *</label>
                <select
                  value={restrictionType}
                  onChange={(e: any) => setRestrictionType(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none font-bold"
                >
                  <option value="store_suspended">Store Suspended (Full Lock)</option>
                  <option value="withdrawal_review_required">Withdrawal Review Required</option>
                  <option value="product_upload_restricted">Product Uploads Restricted</option>
                  <option value="new_orders_restricted">New Orders Restricted</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Enforcement Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this restriction is being imposed..."
                  value={restrictionReason}
                  onChange={(e) => setRestrictionReason(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0dede]">
                <button
                  type="button"
                  onClick={() => setShowRestrictionModal(false)}
                  className="px-4 py-2 bg-[#f0eded] text-[#414941] rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold shadow-md"
                >
                  Apply Restriction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COUPON MODAL */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowCouponModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-extrabold text-[#002c11] font-heading">
              Create Promotional Coupon
            </h3>

            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOISHAKHI20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 font-mono font-bold text-sm outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Discount Type</label>
                  <select
                    value={couponType}
                    onChange={(e: any) => setCouponType(e.target.value)}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none font-bold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Taka (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Discount Value *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value)}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Min Order (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={couponMinOrder}
                    onChange={(e) => setCouponMinOrder(e.target.value)}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={couponUsageLimit}
                    onChange={(e) => setCouponUsageLimit(e.target.value)}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0dede]">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 bg-[#f0eded] text-[#414941] rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#002c11] text-white rounded-xl font-bold shadow-md"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLEMENT AUDIT MODAL */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedSettlement(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941] hover:bg-[#e0dede]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#e8f5e9] text-[#1b6d24] font-bold text-[10px] rounded-full">
                Treasury Audit
              </span>
              <span className="text-xs font-mono text-[#717970]">{selectedSettlement.id}</span>
            </div>

            <h3 className="text-xl font-extrabold text-[#002c11] font-heading">
              Settlement #{selectedSettlement.settlementNumber || selectedSettlement.id}
            </h3>

            <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be] text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-[#717970]">Artisan Store:</span>
                <span className="font-bold text-[#002c11]">
                  {selectedSettlement.storeName || selectedSettlement.sellerName || selectedSettlement.sellerId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717970]">Settlement Period:</span>
                <span className="font-mono font-bold text-[#002c11]">
                  {selectedSettlement.period || `${selectedSettlement.periodStart?.slice(0, 10)} to ${selectedSettlement.periodEnd?.slice(0, 10)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717970]">Delivered Orders Count:</span>
                <span className="font-bold text-[#002c11]">{selectedSettlement.totalOrders || selectedSettlement.orderIds?.length || 0}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#e0dede]">
                <span className="text-[#717970]">Gross Product Volume:</span>
                <strong className="text-[#002c11]">৳{selectedSettlement.grossSales.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-purple-700">
                <span>Platform Commission:</span>
                <strong>-৳{(selectedSettlement.commission || selectedSettlement.platformCommission || 0).toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-[#717970]">
                <span>Courier / Logistics Deductions:</span>
                <strong>-৳{(selectedSettlement.courierFees || 0).toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Customer Return Deductions:</span>
                <strong>-৳{(selectedSettlement.refunds || selectedSettlement.refundAdjustments || 0).toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#002c11] pt-2 border-t border-[#c1c9be]">
                <span>Net Payable Balance:</span>
                <span className="text-[#1b6d24]">৳{selectedSettlement.netPayable.toLocaleString()} BDT</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#f0eded]">
                <span className="text-[#717970]">Current Settlement Status:</span>
                <span className="font-bold text-[#002c11]">{selectedSettlement.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0eded]">
                <span className="text-[#717970]">Disbursement Channel:</span>
                <span className="font-semibold text-[#002c11]">{selectedSettlement.payoutMethod || 'Direct MFS / Bank Escrow'}</span>
              </div>
              {selectedSettlement.transactionRef && (
                <div className="flex justify-between py-1 border-b border-[#f0eded]">
                  <span className="text-[#717970]">Transaction Reference:</span>
                  <span className="font-mono font-bold text-[#002c11]">{selectedSettlement.transactionRef}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#e0dede]">
              {selectedSettlement.status !== 'PAID' ? (
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateSettlementStatus(selectedSettlement.id, 'PAID');
                    setSelectedSettlement(null);
                  }}
                  className="px-4 py-2 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Mark as Paid & Disbursed
                </button>
              ) : (
                <span className="text-xs font-bold text-[#1b6d24] flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Settlement Fully Paid
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedSettlement(null)}
                className="px-4 py-2 bg-[#f0eded] text-[#414941] rounded-xl font-bold text-xs"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SETTLEMENT SHEET MODAL */}
      {showCreateSettlementModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-scale-in">
            <button
              onClick={() => setShowCreateSettlementModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941] hover:bg-[#e0dede]"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="px-2.5 py-0.5 bg-[#e8f5e9] text-[#1b6d24] font-bold text-[10px] rounded-full">
                Periodic Treasury Run
              </span>
              <h3 className="text-xl font-extrabold text-[#002c11] font-heading mt-1">
                Generate Settlement Sheet
              </h3>
              <p className="text-xs text-[#717970] mt-1">
                Aggregates delivered orders within the timeframe and calculates net payouts after commission and shipping fees.
              </p>
            </div>

            <form onSubmit={handleCreateSettlement} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Select Artisan Store</label>
                <select
                  value={newSettlementSellerId}
                  onChange={(e) => setNewSettlementSellerId(e.target.value)}
                  required
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none font-semibold text-[#002c11]"
                >
                  <option value="">-- Choose Artisan --</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.storeName || s.fullName} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Period Start</label>
                  <input
                    type="date"
                    required
                    value={newSettlementPeriodStart}
                    onChange={(e) => setNewSettlementPeriodStart(e.target.value)}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Period End</label>
                  <input
                    type="date"
                    required
                    value={newSettlementPeriodEnd}
                    onChange={(e) => setNewSettlementPeriodEnd(e.target.value)}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <span className="font-bold block">Protection Enforcement</span>
                <span>
                  Only orders marked DELIVERED prior to the start of the 7-day customer return warranty period will be cleared into available settlement funds.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0dede]">
                <button
                  type="button"
                  onClick={() => setShowCreateSettlementModal(false)}
                  className="px-4 py-2 bg-[#f0eded] text-[#414941] rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSettlement}
                  className="px-6 py-2 bg-[#002c11] disabled:opacity-50 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCreatingSettlement ? 'animate-spin' : ''}`} />
                  <span>{isCreatingSettlement ? 'Calculating...' : 'Generate Sheet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL FINANCIAL ADJUSTMENT MODAL */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-scale-in">
            <button
              onClick={() => setShowAdjustmentModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941] hover:bg-[#e0dede]"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="px-2.5 py-0.5 bg-purple-50 text-purple-800 font-bold text-[10px] rounded-full border border-purple-200">
                Audited Accounting
              </span>
              <h3 className="text-xl font-extrabold text-[#002c11] font-heading mt-1">
                Record Manual Adjustment
              </h3>
              <p className="text-xs text-[#717970] mt-1">
                Atomic credit or debit directly updating the seller wallet balance with an immutable ledger entry.
              </p>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Artisan Store</label>
                <select
                  value={adjSellerId}
                  onChange={(e) => setAdjSellerId(e.target.value)}
                  required
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none font-semibold text-[#002c11]"
                >
                  <option value="">-- Choose Artisan Store --</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.storeName || s.fullName} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Adjustment Type</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className={`w-full border rounded-xl px-3.5 py-2 outline-none font-bold ${
                      adjType === 'CREDIT'
                        ? 'bg-emerald-50 text-[#1b6d24] border-[#a0f399]'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    <option value="CREDIT">CREDIT (+ Add Funds)</option>
                    <option value="DEBIT">DEBIT (- Deduct Funds)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Amount (BDT)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none font-extrabold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Adjustment Category</label>
                <select
                  value={adjCategory}
                  onChange={(e) => setAdjCategory(e.target.value as any)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none"
                >
                  <option value="bonus">Bonus / Artisan Incentive</option>
                  <option value="penalty">Penalty / Late Dispatch Fee</option>
                  <option value="fee_waiver">Fee Waiver / Promotion Subsidy</option>
                  <option value="damage_claim">Damage Claim Settlement</option>
                  <option value="dispute_settlement">Dispute Resolution Credit</option>
                  <option value="other">Other Administrative Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Audit Justification & Reason</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Compensating artisan for courier return handling fee under ticket #88921"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0dede]">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 bg-[#f0eded] text-[#414941] rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="px-6 py-2 bg-[#002c11] disabled:opacity-50 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#a0f399]" />
                  <span>{isSubmittingAdj ? 'Recording...' : 'Commit Adjustment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
