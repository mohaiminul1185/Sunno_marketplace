import React, { useState, useEffect } from 'react';
import {
  SellerPlan,
  SellerBalanceSummary,
  SellerWithdrawalRequest,
  FinancialLedgerEntry,
  SellerSubscription,
  SellerPerformance,
  SellerWarning,
  SellerRestriction,
  SellerPromotionCampaign,
  FinancialStatement,
  WithdrawalMethod,
  WithdrawalAccountDetails,
  Product,
  SellerSettlementRecord,
} from '../types';
import {
  calculateSellerBalances,
  fetchSellerWithdrawals,
  requestSellerWithdrawal,
  fetchSellerLedger,
  fetchSellerSubscription,
  calculateSellerPerformance,
  fetchSellerWarnings,
  acknowledgeSellerWarning,
  fetchSellerRestrictions,
  createSellerPromotion,
  fetchSellerPromotions,
  generateFinancialStatement,
  fetchSellerSettlements,
  releasePendingDeliveredEarnings,
} from '../services/financeService';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  Award,
  Sparkles,
  Download,
  Printer,
  ChevronRight,
  Lock,
  RefreshCw,
  Percent,
  Layers,
  X,
} from 'lucide-react';

interface SellerFinanceViewProps {
  sellerId: string;
  sellerName: string;
  storeName: string;
  products: Product[];
  currentPlan?: SellerPlan | null;
  plans: SellerPlan[];
  onUpgradePlan?: (planId: string) => void;
  initialTab?: 'wallet' | 'ledger' | 'settlements' | 'plan' | 'performance' | 'promotions';
}

export const SellerFinanceView: React.FC<SellerFinanceViewProps> = ({
  sellerId,
  sellerName,
  storeName,
  products,
  currentPlan,
  plans,
  onUpgradePlan,
  initialTab = 'wallet',
}) => {
  const { userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'wallet' | 'ledger' | 'settlements' | 'plan' | 'performance' | 'promotions'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isReleasingEscrow, setIsReleasingEscrow] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Financial Data States
  const [balances, setBalances] = useState<SellerBalanceSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<SellerWithdrawalRequest[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<FinancialLedgerEntry[]>([]);
  const [settlements, setSettlements] = useState<SellerSettlementRecord[]>([]);
  const [selectedSettlement, setSelectedSettlement] = useState<SellerSettlementRecord | null>(null);
  const [subscription, setSubscription] = useState<SellerSubscription | null>(null);
  const [performance, setPerformance] = useState<SellerPerformance | null>(null);
  const [warnings, setWarnings] = useState<SellerWarning[]>([]);
  const [restrictions, setRestrictions] = useState<SellerRestriction[]>([]);
  const [promotions, setPromotions] = useState<SellerPromotionCampaign[]>([]);

  // Modals
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [activeStatement, setActiveStatement] = useState<FinancialStatement | null>(null);

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('1000');
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawalMethod>('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(sellerName || '');
  const [bankName, setBankName] = useState('Islami Bank Bangladesh Ltd');
  const [branchName, setBranchName] = useState('Dhaka Main Branch');
  const [routingNumber, setRoutingNumber] = useState('125271829');
  const [accountType, setAccountType] = useState<'personal' | 'merchant' | 'savings' | 'current'>('personal');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  // Promotion Form State
  const [promoName, setPromoName] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('15');
  const [promoStart, setPromoStart] = useState(new Date().toISOString().slice(0, 10));
  const [promoEnd, setPromoEnd] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [selectedPromoProducts, setSelectedPromoProducts] = useState<string[]>([]);
  const [isSubmittingPromo, setIsSubmittingPromo] = useState(false);

  // Ledger Filter
  const [ledgerFilter, setLedgerFilter] = useState<string>('ALL');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllFinancialData = async () => {
    try {
      setLoading(true);
      const [
        b,
        w,
        l,
        stlmts,
        sub,
        perf,
        warns,
        restrs,
        promos,
      ] = await Promise.all([
        calculateSellerBalances(sellerId),
        fetchSellerWithdrawals(sellerId),
        fetchSellerLedger(sellerId),
        fetchSellerSettlements(sellerId),
        fetchSellerSubscription(sellerId),
        calculateSellerPerformance(sellerId),
        fetchSellerWarnings(sellerId),
        fetchSellerRestrictions(sellerId),
        fetchSellerPromotions(sellerId),
      ]);

      setBalances(b);
      setWithdrawals(w);
      setLedgerEntries(l);
      setSettlements(stlmts);
      setSubscription(sub);
      setPerformance(perf);
      setWarnings(warns);
      setRestrictions(restrs);
      setPromotions(promos);
    } catch (err) {
      console.error('Error loading seller financial data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReleaseEscrow = async () => {
    try {
      setIsReleasingEscrow(true);
      const res = await releasePendingDeliveredEarnings(sellerId);
      if (res.releasedCount > 0) {
        showToast(`Released ৳${res.releasedAmount.toLocaleString()} from ${res.releasedCount} delivered orders to Available Balance.`);
      } else {
        showToast('No pending orders have surpassed the 7-day return guarantee window yet.');
      }
      loadAllFinancialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to release pending escrow.');
    } finally {
      setIsReleasingEscrow(false);
    }
  };

  useEffect(() => {
    if (sellerId) {
      loadAllFinancialData();
    }
  }, [sellerId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllFinancialData();
  };

  // Submit Withdrawal Request
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingWithdrawal) return;
    setWithdrawError('');
    const amt = parseFloat(withdrawAmount);

    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Please enter a valid amount.');
      return;
    }
    if (amt < 500) {
      setWithdrawError('Minimum withdrawal amount is ৳500 BDT.');
      return;
    }
    if (balances && amt > balances.availableBalance) {
      setWithdrawError(`Exceeds available balance (৳${balances.availableBalance.toLocaleString()}).`);
      return;
    }
    if (!accountNumber.trim()) {
      setWithdrawError('Account / Mobile number is required.');
      return;
    }

    try {
      setIsSubmittingWithdrawal(true);
      const accDetails: WithdrawalAccountDetails = {
        accountNumber: accountNumber.trim(),
        maskedAccount: '',
        accountType,
        accountHolderName: accountHolderName.trim(),
        bankName: withdrawMethod === 'bank_transfer' ? bankName : undefined,
        branchName: withdrawMethod === 'bank_transfer' ? branchName : undefined,
        routingNumber: withdrawMethod === 'bank_transfer' ? routingNumber : undefined,
      };

      await requestSellerWithdrawal({
        sellerId,
        sellerName,
        storeName,
        amount: amt,
        method: withdrawMethod,
        accountDetails: accDetails,
      });

      setShowWithdrawModal(false);
      showToast(`Payout request of ৳${amt.toLocaleString()} submitted successfully.`);
      loadAllFinancialData();
    } catch (err: any) {
      setWithdrawError(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  // Submit Promotion Campaign
  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName.trim()) return;
    try {
      setIsSubmittingPromo(true);
      await createSellerPromotion({
        sellerId,
        sellerName,
        campaignName: promoName.trim(),
        discountPercentage: parseFloat(promoDiscount) || 10,
        productIds: selectedPromoProducts.length > 0 ? selectedPromoProducts : products.map((p) => p.id),
        startDate: promoStart,
        endDate: promoEnd,
      });
      setShowPromoModal(false);
      showToast('Promotion campaign submitted for SUNNO admin approval.');
      loadAllFinancialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create promotion campaign');
    } finally {
      setIsSubmittingPromo(false);
    }
  };

  // Generate Statement
  const handleGenerateStatement = async (days: number = 30) => {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const stmt = await generateFinancialStatement(sellerId, sellerName, storeName, start, end);
    setActiveStatement(stmt);
    setShowStatementModal(true);
  };

  // Acknowledge Warning
  const handleAcknowledgeWarning = async (warningId: string) => {
    await acknowledgeSellerWarning(warningId);
    showToast('Warning acknowledged.');
    loadAllFinancialData();
  };

  const isSuspended = restrictions.some((r) => r.type === 'store_suspended' && r.active);
  const activeWarningsCount = warnings.filter((w) => w.status === 'ACTIVE').length;

  const filteredLedger = ledgerEntries.filter((item) => {
    if (ledgerFilter === 'ALL') return true;
    return item.type === ledgerFilter;
  });

  return (
    <div id="seller-finance-hub" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#002c11] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#347434] animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#a0f399]" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Restrictions / Warnings Alert Banner */}
      {restrictions.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-900">Active Account Restrictions</h4>
            {restrictions.map((r) => (
              <p key={r.id} className="text-xs text-red-700 mt-1">
                • <strong>{r.type.replace(/_/g, ' ').toUpperCase()}:</strong> {r.reason} (Imposed by {r.imposedBy})
              </p>
            ))}
          </div>
        </div>
      )}

      {activeWarningsCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900">
              You have {activeWarningsCount} active warning{activeWarningsCount > 1 ? 's' : ''}
            </h4>
            <div className="space-y-2 mt-2">
              {warnings
                .filter((w) => w.status === 'ACTIVE')
                .map((w) => (
                  <div key={w.id} className="flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-amber-200">
                    <div>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md uppercase mr-2">
                        {w.severity}
                      </span>
                      <strong className="text-xs text-amber-900">{w.title}: </strong>
                      <span className="text-xs text-amber-800">{w.reason}</span>
                    </div>
                    <button
                      onClick={() => handleAcknowledgeWarning(w.id)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Acknowledge
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e0dede]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#e8f5e9] text-[#1b6d24] text-xs font-bold rounded-full border border-[#a0f399]">
              SUNNO Finance & Ledger
            </span>
            <span className="text-xs text-[#717970]">• Verified Artisan Store</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#002c11] font-heading mt-1">
            Seller Wallet & Financial Management
          </h2>
          <p className="text-xs text-[#414941] mt-0.5">
            Transparent commission accounting, immutable ledger history, and verified MFS / Bank payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 bg-white hover:bg-[#f0eded] text-[#002c11] border border-[#c1c9be] rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#1b6d24]' : ''}`} />
            <span>Sync Balances</span>
          </button>

          <button
            onClick={() => handleGenerateStatement(30)}
            className="px-3.5 py-2.5 bg-[#f0eded] hover:bg-[#e0dede] text-[#002c11] rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs"
          >
            <FileText className="w-4 h-4 text-[#1b6d24]" />
            <span>Statement</span>
          </button>

          <button
            onClick={() => {
              setWithdrawError('');
              setShowWithdrawModal(true);
            }}
            disabled={isSuspended || (balances?.availableBalance || 0) < 500}
            className="px-4 py-2.5 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-4 h-4 text-[#a0f399]" />
            <span>Request Payout</span>
          </button>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'wallet', label: 'Wallet & Payouts', icon: Wallet },
          { id: 'settlements', label: 'Settlement Sheets', icon: CreditCard },
          { id: 'ledger', label: 'Financial Ledger', icon: FileText },
          { id: 'subscription', label: 'Plan & Quotas', icon: Layers },
          { id: 'performance', label: 'Artisan Scorecard', icon: Award },
          { id: 'promotions', label: 'Promotions & Discounts', icon: Percent },
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

      {/* TAB 1: WALLET & BALANCE OVERVIEW */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {/* Key Balance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Available Balance */}
            <div className="p-5 bg-gradient-to-br from-[#002c11] to-[#0a4820] text-white rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 bg-white/20 text-[#a0f399] text-[11px] font-bold rounded-full">
                  Available for Payout
                </span>
                <Wallet className="w-5 h-5 text-[#a0f399]" />
              </div>
              <div>
                <p className="text-3xl font-extrabold font-heading text-white">
                  ৳{(balances?.availableBalance || 0).toLocaleString()}
                </p>
                <p className="text-xs text-emerald-200 mt-1">
                  Ready to withdraw via bKash, Nagad, Bank
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-emerald-200">
                <span>Min: ৳500</span>
                <span className="text-[#a0f399] font-bold">7-Day Guarantee Cleared</span>
              </div>
            </div>

            {/* Pending Return Window Earnings */}
            <div className="p-5 bg-white border border-[#c1c9be] rounded-3xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-full border border-amber-200">
                  Pending Clearance
                </span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#002c11] font-heading">
                  ৳{(balances?.pendingBalance || balances?.pendingEarnings || 0).toLocaleString()}
                </p>
                <p className="text-xs text-[#717970] mt-1">
                  Escrow hold during 7-day customer return window
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#e0dede]">
                <button
                  onClick={handleReleaseEscrow}
                  disabled={isReleasingEscrow || ((balances?.pendingBalance || balances?.pendingEarnings || 0) === 0)}
                  className="w-full py-1.5 px-3 bg-amber-100 hover:bg-amber-200 disabled:opacity-40 text-amber-900 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${isReleasingEscrow ? 'animate-spin' : ''}`} />
                  <span>{isReleasingEscrow ? 'Releasing...' : 'Claim Matured Escrow'}</span>
                </button>
              </div>
            </div>

            {/* Total Gross Sales */}
            <div className="p-5 bg-white border border-[#c1c9be] rounded-3xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 bg-[#e8f5e9] text-[#1b6d24] text-[11px] font-bold rounded-full border border-[#a0f399]">
                  Gross Sales
                </span>
                <TrendingUp className="w-5 h-5 text-[#1b6d24]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#002c11] font-heading">
                  ৳{(balances?.grossSales || 0).toLocaleString()}
                </p>
                <p className="text-xs text-[#717970] mt-1">
                  Across {balances?.totalOrders || 0} completed & active orders
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#e0dede] flex items-center justify-between text-xs text-[#717970]">
                <span>Net: ৳{(balances?.netPayable || balances?.netEarnings || 0).toLocaleString()}</span>
                <span className="text-[#1b6d24] font-bold">Commission: ~10%</span>
              </div>
            </div>

            {/* Total Withdrawn & Locked */}
            <div className="p-5 bg-white border border-[#c1c9be] rounded-3xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 text-[11px] font-bold rounded-full border border-blue-200">
                  Total Paid Out
                </span>
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#002c11] font-heading">
                  ৳{(balances?.withdrawnAmount || 0).toLocaleString()}
                </p>
                <p className="text-xs text-[#717970] mt-1">
                  Transferred directly to your account
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#e0dede] flex items-center justify-between text-xs text-[#717970]">
                <span>In Review: ৳{(balances?.processingBalance || balances?.pendingWithdrawals || 0).toLocaleString()}</span>
                <span className="font-semibold text-blue-700">0% Payout Fee</span>
              </div>
            </div>
          </div>

          {/* Phase 18 Dedicated 8-Bucket Financial Ledger Summary */}
          <div className="bg-[#fcfbf9] border border-[#d8dcd5] rounded-3xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-sm font-extrabold text-[#002c11]">
                  Accounting Balance Buckets (Server-Authoritative)
                </h4>
                <p className="text-[11px] text-[#556054]">
                  Audited double-entry breakdown governing your current store net equity.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-[#1b6d24] font-bold text-[10px] rounded-full border border-[#a0f399]">
                Zero-Negative Balance Guarantee Active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-center">
              <div className="p-3 bg-white rounded-2xl border border-[#e1e5de]">
                <span className="text-[10px] font-bold text-[#556054] uppercase block">Available</span>
                <span className="text-sm font-black text-[#1b6d24] mt-0.5 block">
                  ৳{(balances?.availableBalance || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-[#e1e5de]">
                <span className="text-[10px] font-bold text-[#556054] uppercase block">Pending Escrow</span>
                <span className="text-sm font-black text-amber-700 mt-0.5 block">
                  ৳{(balances?.pendingBalance || balances?.pendingEarnings || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-[#e1e5de]">
                <span className="text-[10px] font-bold text-[#556054] uppercase block">Processing</span>
                <span className="text-sm font-black text-blue-700 mt-0.5 block">
                  ৳{(balances?.processingBalance || balances?.pendingWithdrawals || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-[#e1e5de]">
                <span className="text-[10px] font-bold text-[#556054] uppercase block">Withdrawn</span>
                <span className="text-sm font-black text-[#002c11] mt-0.5 block">
                  ৳{(balances?.withdrawnAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-[#e1e5de]">
                <span className="text-[10px] font-bold text-[#556054] uppercase block">Refunds</span>
                <span className="text-sm font-black text-red-600 mt-0.5 block">
                  -৳{(balances?.refundedAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-[#e1e5de]">
                <span className="text-[10px] font-bold text-[#556054] uppercase block">Commission</span>
                <span className="text-sm font-black text-purple-700 mt-0.5 block">
                  -৳{(balances?.commission || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-[#e1e5de]">
                <span className="text-[10px] font-bold text-[#556054] uppercase block">Courier Fees</span>
                <span className="text-sm font-black text-gray-700 mt-0.5 block">
                  -৳{(balances?.courierFees || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-black text-[#1b6d24] uppercase block">Net Payable</span>
                <span className="text-sm font-black text-[#002c11] mt-0.5 block">
                  ৳{(balances?.netPayable || balances?.netEarnings || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Payout Requests */}
          <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#002c11] font-heading">Payout & Withdrawal Requests</h3>
                <p className="text-xs text-[#717970]">Track MFS and Bank disbursement status in real time</p>
              </div>
              <button
                onClick={() => {
                  setWithdrawError('');
                  setShowWithdrawModal(true);
                }}
                disabled={isSuspended || (balances?.availableBalance || 0) < 500}
                className="px-3.5 py-2 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 disabled:opacity-50"
              >
                <ArrowUpRight className="w-4 h-4 text-[#a0f399]" />
                <span>New Request</span>
              </button>
            </div>

            {withdrawals.length === 0 ? (
              <div className="py-12 text-center text-[#717970] space-y-2">
                <Wallet className="w-8 h-8 mx-auto text-[#c1c9be]" />
                <p className="text-xs font-semibold">No withdrawal requests yet.</p>
                <p className="text-[11px]">When your available balance reaches ৳500, request a payout anytime.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e0dede] text-[#717970] font-semibold">
                      <th className="pb-3">Request ID</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Method & Account</th>
                      <th className="pb-3 text-right">Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Transaction Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0eded]">
                    {withdrawals.map((w) => {
                      let statusBadge = (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full font-bold text-[10px] border border-amber-200">
                          {w.status}
                        </span>
                      );
                      if (w.status === 'PAID') {
                        statusBadge = (
                          <span className="px-2.5 py-1 bg-[#e8f5e9] text-[#1b6d24] rounded-full font-bold text-[10px] border border-[#a0f399]">
                            PAID
                          </span>
                        );
                      } else if (w.status === 'REJECTED' || w.status === 'FAILED') {
                        statusBadge = (
                          <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full font-bold text-[10px] border border-red-200">
                            {w.status}
                          </span>
                        );
                      } else if (w.status === 'APPROVED' || w.status === 'PROCESSING') {
                        statusBadge = (
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px] border border-blue-200">
                            {w.status}
                          </span>
                        );
                      }

                      return (
                        <tr key={w.id} className="hover:bg-[#fbf9f8] transition-colors">
                          <td className="py-3 font-mono font-bold text-[#002c11]">{w.id}</td>
                          <td className="py-3 text-[#717970]">{w.requestedAt.slice(0, 10)}</td>
                          <td className="py-3">
                            <span className="font-bold text-[#002c11] uppercase">{w.withdrawalMethod}</span>
                            <span className="text-[11px] text-[#717970] block">
                              {w.accountDetails.maskedAccount || w.accountDetails.accountNumber}
                            </span>
                          </td>
                          <td className="py-3 text-right font-extrabold text-[#002c11]">
                            ৳{w.amount.toLocaleString()}
                          </td>
                          <td className="py-3">{statusBadge}</td>
                          <td className="py-3 text-[#717970] font-mono text-[11px]">
                            {w.transactionRef || w.adminNotes || w.rejectionReason || '—'}
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

      {/* TAB: SETTLEMENTS & PAYOUT SHEETS */}
      {activeTab === 'settlements' && (
        <div className="space-y-6">
          {/* Summary metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#c1c9be] rounded-2xl">
              <span className="text-[11px] font-bold text-[#717970] uppercase block">Total Cycles</span>
              <span className="text-2xl font-black text-[#002c11] mt-1 block">{settlements.length}</span>
              <span className="text-[11px] text-[#717970]">Periodic disbursement sheets</span>
            </div>
            <div className="p-4 bg-white border border-[#c1c9be] rounded-2xl">
              <span className="text-[11px] font-bold text-[#717970] uppercase block">Gross Settled Sales</span>
              <span className="text-2xl font-black text-[#002c11] mt-1 block">
                ৳{settlements.reduce((acc, s) => acc + (s.grossSales || 0), 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">100% Eco-market orders</span>
            </div>
            <div className="p-4 bg-white border border-[#c1c9be] rounded-2xl">
              <span className="text-[11px] font-bold text-[#717970] uppercase block">Platform Commission</span>
              <span className="text-2xl font-black text-purple-700 mt-1 block">
                ৳{settlements.reduce((acc, s) => acc + (s.commission || s.platformCommission || 0), 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-[#717970]">Fair-share platform support</span>
            </div>
            <div className="p-4 bg-emerald-50/70 border border-[#a0f399] rounded-2xl">
              <span className="text-[11px] font-bold text-[#1b6d24] uppercase block">Net Disbursed</span>
              <span className="text-2xl font-black text-[#002c11] mt-1 block">
                ৳{settlements
                  .filter((s) => s.status === 'PAID')
                  .reduce((acc, s) => acc + (s.netPayable || 0), 0)
                  .toLocaleString()}
              </span>
              <span className="text-[11px] text-[#1b6d24] font-semibold">Paid directly to MFS / Bank</span>
            </div>
          </div>

          {/* Settlements Table */}
          <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#002c11] font-heading">Settlement Sheets & Cycles</h3>
                <p className="text-xs text-[#717970]">
                  Periodic accounting cycles generated by the treasury engine after completed return windows.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateStatement(60)}
                  className="px-3.5 py-1.5 bg-[#f0eded] hover:bg-[#e0dede] text-[#002c11] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-[#1b6d24]" />
                  <span>Consolidated Report</span>
                </button>
              </div>
            </div>

            {settlements.length === 0 ? (
              <div className="py-12 text-center text-[#717970] space-y-2">
                <CreditCard className="w-8 h-8 mx-auto text-[#c1c9be]" />
                <p className="text-xs font-bold text-[#002c11]">No settlement cycles generated yet.</p>
                <p className="text-[11px]">
                  Settlement statements are generated at the end of each payout cycle once orders pass escrow clearance.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e0dede] text-[#717970] font-semibold">
                      <th className="pb-3">Cycle / Sheet #</th>
                      <th className="pb-3">Period</th>
                      <th className="pb-3 text-right">Gross Sales</th>
                      <th className="pb-3 text-right">Commission</th>
                      <th className="pb-3 text-right">Courier/Refunds</th>
                      <th className="pb-3 text-right">Net Payable</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0eded]">
                    {settlements.map((s) => {
                      let badge = (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full font-bold text-[10px] border border-amber-200">
                          {s.status}
                        </span>
                      );
                      if (s.status === 'PAID') {
                        badge = (
                          <span className="px-2 py-0.5 bg-[#e8f5e9] text-[#1b6d24] rounded-full font-bold text-[10px] border border-[#a0f399]">
                            PAID
                          </span>
                        );
                      } else if (s.status === 'PROCESSING' || s.status === 'READY') {
                        badge = (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px] border border-blue-200">
                            {s.status}
                          </span>
                        );
                      } else if (s.status === 'ON_HOLD') {
                        badge = (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full font-bold text-[10px] border border-red-200">
                            ON HOLD
                          </span>
                        );
                      }

                      return (
                        <tr key={s.id} className="hover:bg-[#fbf9f8] transition-colors">
                          <td className="py-3 font-mono font-bold text-[#002c11]">{s.settlementNumber || s.id}</td>
                          <td className="py-3 text-[#717970]">{s.period || `${s.periodStart?.slice(0, 10)} to ${s.periodEnd?.slice(0, 10)}`}</td>
                          <td className="py-3 text-right font-bold text-[#002c11]">৳{s.grossSales.toLocaleString()}</td>
                          <td className="py-3 text-right font-mono text-purple-700">-৳{(s.commission || s.platformCommission || 0).toLocaleString()}</td>
                          <td className="py-3 text-right font-mono text-[#717970]">
                            -৳{((s.courierFees || 0) + (s.refunds || s.refundAdjustments || 0)).toLocaleString()}
                          </td>
                          <td className="py-3 text-right font-black text-[#1b6d24]">৳{s.netPayable.toLocaleString()}</td>
                          <td className="py-3">{badge}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => setSelectedSettlement(s)}
                              className="px-2.5 py-1 bg-[#f0eded] hover:bg-[#002c11] hover:text-white text-[#002c11] rounded-lg text-[11px] font-bold transition-all"
                            >
                              Audit Breakdown
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Settlement Details / Audit Modal */}
          {selectedSettlement && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#c1c9be] space-y-4 animate-scale-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#e0dede]">
                  <div>
                    <span className="px-2 py-0.5 bg-[#e8f5e9] text-[#1b6d24] font-bold text-[10px] rounded-full">
                      Audit Sheet
                    </span>
                    <h3 className="text-lg font-bold text-[#002c11] font-heading mt-1">
                      Settlement #{selectedSettlement.settlementNumber || selectedSettlement.id}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedSettlement(null)}
                    className="p-1.5 text-[#717970] hover:text-[#002c11] hover:bg-[#f0eded] rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-[#fcfbf9] p-4 rounded-2xl border border-[#e1e5de] space-y-2.5 text-xs">
                  <div className="flex justify-between text-[#717970]">
                    <span>Accounting Period:</span>
                    <strong className="text-[#002c11] font-mono">
                      {selectedSettlement.period || `${selectedSettlement.periodStart?.slice(0, 10)} to ${selectedSettlement.periodEnd?.slice(0, 10)}`}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[#717970]">
                    <span>Gross Product Sales:</span>
                    <strong className="text-[#002c11]">৳{selectedSettlement.grossSales.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-purple-700">
                    <span>Platform Commission:</span>
                    <strong>-৳{(selectedSettlement.commission || selectedSettlement.platformCommission || 0).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-[#717970]">
                    <span>Courier & Logistics Deductions:</span>
                    <strong>-৳{(selectedSettlement.courierFees || 0).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Customer Return Deductions:</span>
                    <strong>-৳{(selectedSettlement.refunds || selectedSettlement.refundAdjustments || 0).toLocaleString()}</strong>
                  </div>
                  {selectedSettlement.adjustments ? (
                    <div className="flex justify-between text-blue-700">
                      <span>Manual Adjustments / Bonuses:</span>
                      <strong>{selectedSettlement.adjustments > 0 ? `+৳${selectedSettlement.adjustments}` : `-৳${Math.abs(selectedSettlement.adjustments)}`}</strong>
                    </div>
                  ) : null}
                  <div className="pt-2 border-t border-[#e1e5de] flex justify-between items-center text-sm">
                    <span className="font-extrabold text-[#002c11]">Net Payout Amount:</span>
                    <strong className="font-black text-base text-[#1b6d24]">
                      ৳{selectedSettlement.netPayable.toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#f0eded]">
                    <span className="text-[#717970]">Settlement Status:</span>
                    <span className="font-bold text-[#002c11]">{selectedSettlement.status}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#f0eded]">
                    <span className="text-[#717970]">Disbursement Channel:</span>
                    <span className="font-semibold text-[#002c11]">{selectedSettlement.payoutMethod || 'Direct MFS / Bank Escrow'}</span>
                  </div>
                  {selectedSettlement.transactionRef && (
                    <div className="flex justify-between py-1 border-b border-[#f0eded]">
                      <span className="text-[#717970]">Disbursement Reference:</span>
                      <span className="font-mono font-bold text-[#002c11]">{selectedSettlement.transactionRef}</span>
                    </div>
                  )}
                  {selectedSettlement.notes && (
                    <div className="py-1">
                      <span className="text-[#717970] block">Treasury Notes:</span>
                      <p className="text-[#002c11] italic mt-0.5 bg-[#f0eded] p-2 rounded-xl text-[11px]">
                        "{selectedSettlement.notes}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-[#e0dede]">
                  <button
                    onClick={() => setSelectedSettlement(null)}
                    className="px-4 py-2 bg-[#002c11] text-white rounded-xl text-xs font-bold"
                  >
                    Close Audit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FINANCIAL LEDGER (IMMUTABLE) */}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#002c11] font-heading">Immutable Financial Ledger</h3>
              <p className="text-xs text-[#717970]">
                Every single order, commission cut, delivery deduction, refund, and payout recorded permanently.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={ledgerFilter}
                onChange={(e) => setLedgerFilter(e.target.value)}
                className="bg-[#f0eded] border border-[#c1c9be] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#002c11] outline-none"
              >
                <option value="ALL">All Transactions ({ledgerEntries.length})</option>
                <option value="SALE">Sales (Credits)</option>
                <option value="COMMISSION">Commission Deductions</option>
                <option value="REFUND_DEDUCTION">Refund Deductions</option>
                <option value="WITHDRAWAL">Withdrawals</option>
                <option value="SELLER_PLAN_PAYMENT">Plan Subscriptions</option>
                <option value="ADJUSTMENT">Adjustments</option>
              </select>

              <button
                onClick={() => handleGenerateStatement(30)}
                className="px-3 py-1.5 bg-[#002c11] text-white rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {filteredLedger.length === 0 ? (
            <div className="py-12 text-center text-[#717970]">
              <FileText className="w-8 h-8 mx-auto text-[#c1c9be] mb-2" />
              <p className="text-xs font-bold">No ledger transactions found for this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e0dede] text-[#717970] font-semibold">
                    <th className="pb-3">Ledger ID</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Description / Reference</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3 text-right">Balance After</th>
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
                          <span className="font-semibold">{le.description || 'Transaction record'}</span>
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
                        <td className="py-3 text-right font-mono font-semibold text-[#002c11]">
                          ৳{le.balanceAfter.toLocaleString()}
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
          )}
        </div>
      )}

      {/* TAB 3: PLAN & QUOTAS */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <div className="p-6 bg-white border border-[#c1c9be] rounded-3xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="px-3 py-1 bg-[#e8f5e9] text-[#1b6d24] text-xs font-bold rounded-full border border-[#a0f399]">
                  Active Subscription Tier
                </span>
                <h3 className="text-xl font-extrabold text-[#002c11] font-heading mt-2">
                  {currentPlan?.name || subscription?.planName || 'Artisan Starter Plan'}
                </h3>
                <p className="text-xs text-[#717970] mt-0.5">
                  Commission Rate: <strong>{currentPlan?.commissionRate || 10}%</strong> | Valid until{' '}
                  {subscription?.expiryDate?.slice(0, 10) || 'Lifetime'}
                </p>
              </div>

              {onUpgradePlan && (
                <button
                  onClick={() => onUpgradePlan(plans.find((p) => p.id !== currentPlan?.id)?.id || 'plan-pro')}
                  className="px-4 py-2.5 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-[#a0f399]" />
                  <span>Upgrade Plan Tier</span>
                </button>
              )}
            </div>

            {/* Quota Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#e0dede]">
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-[#002c11]">Active Products Quota</span>
                  <span className="text-[#1b6d24]">
                    {products.length} / {currentPlan?.productLimit || 10} Products
                  </span>
                </div>
                <div className="w-full bg-[#f0eded] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1b6d24] h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (products.length / (currentPlan?.productLimit || 10)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-[#002c11]">High-Res Media Storage</span>
                  <span className="text-[#1b6d24]">
                    {Math.min(250, products.length * 8)} MB / {currentPlan?.maxStorageMb || 500} MB
                  </span>
                </div>
                <div className="w-full bg-[#f0eded] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((products.length * 8) / (currentPlan?.maxStorageMb || 500)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Available Upgrade Plans Grid */}
          <div>
            <h4 className="text-sm font-bold text-[#002c11] mb-3">Compare SUNNO Seller Subscription Plans</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(plans.length > 0 ? plans : [
                { id: 'plan-basic', name: 'Artisan Starter', price: 0, commissionRate: 12, productLimit: 10, features: ['Standard Catalog', 'Basic Analytics', 'Standard Support'] },
                { id: 'plan-pro', name: 'Heritage Professional', price: 1500, commissionRate: 8, productLimit: 50, features: ['Featured Store Badge', 'Advanced Analytics', 'Priority Verification'] },
                { id: 'plan-premium', name: 'Master Cooperative', price: 3500, commissionRate: 5, productLimit: 500, features: ['Lowest 5% Commission', 'Dedicated Account Manager', 'Custom Promotion Tools'] },
              ]).map((p: any) => {
                const isCurrent = (currentPlan?.id === p.id) || (!currentPlan && p.price === 0);
                return (
                  <div
                    key={p.id}
                    className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'border-[#1b6d24] bg-[#e8f5e9]/40 shadow-sm'
                        : 'border-[#c1c9be]/50 bg-white hover:border-[#1b6d24]/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-[#002c11]">{p.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-[#1b6d24] text-white text-[10px] font-bold rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-extrabold text-[#002c11]">
                        ৳{p.price}{' '}
                        <span className="text-xs text-[#717970] font-normal">
                          / {p.duration || 'yr'}
                        </span>
                      </p>
                      <p className="text-xs text-[#1b6d24] font-bold mt-1">
                        {p.commissionRate}% Platform Commission
                      </p>

                      <ul className="mt-4 space-y-1.5 text-xs text-[#414941] border-t border-[#e0dede] pt-3">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#1b6d24]" />
                          <span>Up to {p.productLimit} Products</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#1b6d24]" />
                          <span>{p.commissionRate}% commission rate</span>
                        </li>
                        {p.features?.map((f: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#1b6d24]" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {!isCurrent && onUpgradePlan && (
                      <button
                        onClick={() => onUpgradePlan(p.id)}
                        className="mt-5 w-full py-2 bg-[#002c11] hover:bg-[#0d4421] text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                      >
                        Upgrade to {p.name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PERFORMANCE & COMPLIANCE SCORECARD */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="p-6 bg-white border border-[#c1c9be] rounded-3xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 bg-[#e8f5e9] text-[#1b6d24] text-xs font-bold rounded-full border border-[#a0f399]">
                  SUNNO Artisan Quality Audit
                </span>
                <h3 className="text-xl font-extrabold text-[#002c11] font-heading mt-2">
                  Seller Health & Eco Compliance Score
                </h3>
                <p className="text-xs text-[#717970] mt-0.5">
                  High-scoring sellers receive Featured Store badges, lower commission incentives, and boosted search rankings.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-[#e8f5e9] p-3 rounded-2xl border border-[#a0f399]">
                <div className="text-right">
                  <p className="text-[11px] text-[#717970] font-semibold">Artisan Grade</p>
                  <p className="text-2xl font-extrabold text-[#002c11] leading-none">
                    {performance?.grade || 'A+'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#1b6d24] text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                  {performance?.overallScore || 98}%
                </div>
              </div>
            </div>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#e0dede]">
              <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#e0dede]">
                <p className="text-xs text-[#717970]">Order Completion Rate</p>
                <p className="text-xl font-extrabold text-[#002c11] mt-1">
                  {performance?.orderCompletionRate || 98}%
                </p>
                <p className="text-[10px] text-[#1b6d24] font-semibold mt-0.5">Top 5% of sellers</p>
              </div>

              <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#e0dede]">
                <p className="text-xs text-[#717970]">Cancellation Rate</p>
                <p className="text-xl font-extrabold text-[#002c11] mt-1">
                  {performance?.cancellationRate || 2}%
                </p>
                <p className="text-[10px] text-[#1b6d24] font-semibold mt-0.5">Well below 5% threshold</p>
              </div>

              <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#e0dede]">
                <p className="text-xs text-[#717970]">Return / Defect Rate</p>
                <p className="text-xl font-extrabold text-[#002c11] mt-1">
                  {performance?.returnRate || 1.2}%
                </p>
                <p className="text-[10px] text-[#1b6d24] font-semibold mt-0.5">High craftsmanship satisfaction</p>
              </div>

              <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#e0dede]">
                <p className="text-xs text-[#717970]">Artisan Customer Rating</p>
                <p className="text-xl font-extrabold text-[#002c11] mt-1">
                  ⭐ {performance?.rating || 4.9} / 5.0
                </p>
                <p className="text-[10px] text-[#717970] mt-0.5">From verified buyer reviews</p>
              </div>

              <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#e0dede]">
                <p className="text-xs text-[#717970]">Eco Packaging Compliance</p>
                <p className="text-xl font-extrabold text-[#1b6d24] mt-1">
                  {performance?.ecoComplianceScore || 99}%
                </p>
                <p className="text-[10px] text-[#1b6d24] font-semibold mt-0.5">Zero single-use plastic badge</p>
              </div>

              <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#e0dede]">
                <p className="text-xs text-[#717970]">Customer Response Rate</p>
                <p className="text-xl font-extrabold text-[#002c11] mt-1">
                  {performance?.responseRate || 96}%
                </p>
                <p className="text-[10px] text-[#717970] mt-0.5">Avg response under 1 hour</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PROMOTIONS & CAMPAIGNS */}
      {activeTab === 'promotions' && (
        <div className="bg-white border border-[#c1c9be] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#002c11] font-heading">Seller Promotions & Special Offers</h3>
              <p className="text-xs text-[#717970]">
                Submit store discounts for SUNNO seasonal campaigns (Boishakhi, Eid, Autumn Craft Fairs).
              </p>
            </div>

            <button
              onClick={() => setShowPromoModal(true)}
              className="px-4 py-2 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-[#a0f399]" />
              <span>Create Campaign</span>
            </button>
          </div>

          {promotions.length === 0 ? (
            <div className="py-12 text-center text-[#717970]">
              <Percent className="w-8 h-8 mx-auto text-[#c1c9be] mb-2" />
              <p className="text-xs font-bold">No active promotional campaigns yet.</p>
              <p className="text-[11px]">Boost your sales by launching a limited-time percentage discount.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e0dede] text-[#717970] font-semibold">
                    <th className="pb-3">Campaign Name</th>
                    <th className="pb-3">Discount</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Products Included</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eded]">
                  {promotions.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fbf9f8] transition-colors">
                      <td className="py-3 font-bold text-[#002c11]">{p.campaignName}</td>
                      <td className="py-3 font-bold text-[#1b6d24]">{p.discountPercentage}% OFF</td>
                      <td className="py-3 text-[#717970]">
                        {p.startDate} to {p.endDate}
                      </td>
                      <td className="py-3 text-[#414941]">
                        {p.productIds.length} Products
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                            p.status === 'approved' || p.status === 'active'
                              ? 'bg-[#e8f5e9] text-[#1b6d24] border border-[#a0f399]'
                              : p.status === 'rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* WITHDRAWAL MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941] hover:bg-[#e0dede]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#e8f5e9] text-[#1b6d24] text-xs font-bold rounded-full">
                Payout Disbursement
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-[#002c11] font-heading">
              Request Balance Withdrawal
            </h3>
            <p className="text-xs text-[#717970]">
              Transfer your cleared artisan earnings directly to your Bangladesh bank account or MFS wallet.
            </p>

            {withdrawError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">
                  Withdrawal Amount (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-[#717970]">৳</span>
                  <input
                    type="number"
                    min="500"
                    max={balances?.availableBalance || 0}
                    step="100"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl pl-8 pr-3.5 py-2.5 font-bold text-base text-[#002c11] outline-none focus:border-[#002c11]"
                  />
                </div>
                <p className="text-[11px] text-[#717970] mt-1">
                  Available: <strong>৳{(balances?.availableBalance || 0).toLocaleString()}</strong> (Min: ৳500)
                </p>
              </div>

              {/* Method Selector */}
              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1.5">
                  Payout Method *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['bkash', 'nagad', 'rocket', 'bank_transfer'] as WithdrawalMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWithdrawMethod(m)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs capitalize transition-all ${
                        withdrawMethod === m
                          ? 'border-[#1b6d24] bg-[#e8f5e9] text-[#002c11] shadow-xs'
                          : 'border-[#c1c9be]/60 bg-white text-[#414941] hover:bg-[#f5f3f3]'
                      }`}
                    >
                      {m === 'bank_transfer' ? 'Bank Transfer' : m}
                    </button>
                  ))}
                </div>
              </div>

              {withdrawMethod !== 'bank_transfer' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1">
                      {withdrawMethod.toUpperCase()} Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="017XXXXXXXX"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1">Account Type</label>
                    <select
                      value={accountType}
                      onChange={(e: any) => setAccountType(e.target.value)}
                      className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2.5 outline-none focus:border-[#002c11]"
                    >
                      <option value="personal">Personal Account</option>
                      <option value="merchant">Merchant Account</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Bank Name *</label>
                      <input
                        type="text"
                        required
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Branch Name *</label>
                      <input
                        type="text"
                        required
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Account Number *</label>
                      <input
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. 2050123456789"
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Account Holder Name *</label>
                      <input
                        type="text"
                        required
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#f0eded] rounded-xl text-[11px] text-[#414941] space-y-1">
                <div className="flex justify-between">
                  <span>Gross Withdrawal:</span>
                  <span className="font-bold">৳{parseFloat(withdrawAmount || '0').toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#1b6d24]">
                  <span>Disbursement Fee:</span>
                  <span className="font-bold">৳0 (Free on SUNNO)</span>
                </div>
                <div className="flex justify-between font-bold text-[#002c11] pt-1 border-t border-[#c1c9be]/40">
                  <span>Net Expected Payout:</span>
                  <span>৳{parseFloat(withdrawAmount || '0').toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0dede]">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 bg-[#f0eded] hover:bg-[#e0dede] text-[#414941] rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdrawal}
                  className="px-6 py-2.5 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1"
                >
                  {isSubmittingWithdrawal ? 'Submitting...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL FINANCIAL STATEMENT MODAL */}
      {showStatementModal && activeStatement && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none print:border-none">
            <div className="flex items-center justify-between print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#002c11] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4 text-[#a0f399]" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={() => setShowStatementModal(false)}
                className="w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941] hover:bg-[#e0dede]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Statement Document */}
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-[#002c11] pb-4">
                <div>
                  <h1 className="text-2xl font-black font-heading text-[#002c11] tracking-tight">SUNNO</h1>
                  <p className="text-[11px] text-[#717970]">Authentic Bangladeshi Eco Marketplace</p>
                  <p className="text-[11px] text-[#717970]">Gulshan, Dhaka-1212, Bangladesh</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-[#e8f5e9] text-[#1b6d24] text-xs font-bold rounded-full border border-[#a0f399]">
                    OFFICIAL FINANCIAL STATEMENT
                  </span>
                  <p className="text-xs font-mono font-bold text-[#002c11] mt-2">
                    {activeStatement.statementNumber}
                  </p>
                  <p className="text-[11px] text-[#717970]">
                    Generated: {activeStatement.generatedAt.slice(0, 10)}
                  </p>
                </div>
              </div>

              {/* Seller Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[#717970]">Artisan Store:</p>
                  <p className="font-bold text-[#002c11] text-sm">{activeStatement.storeName}</p>
                  <p className="text-[#414941]">Proprietor: {activeStatement.sellerName}</p>
                  <p className="text-[#717970] font-mono text-[10px]">Seller ID: {activeStatement.sellerId}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#717970]">Accounting Period:</p>
                  <p className="font-bold text-[#002c11]">
                    {activeStatement.periodStart.slice(0, 10)} to {activeStatement.periodEnd.slice(0, 10)}
                  </p>
                  <p className="text-[#717970]">Currency: BDT (Bangladeshi Taka)</p>
                </div>
              </div>

              {/* Summary Statement Table */}
              <div className="bg-[#fbf9f8] p-4 rounded-2xl border border-[#c1c9be] text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-[#e0dede]">
                  <span className="text-[#414941]">Gross Product Sales:</span>
                  <span className="font-bold text-[#002c11]">৳{activeStatement.grossSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#e0dede] text-red-700">
                  <span>Platform Commission Deductions:</span>
                  <span className="font-bold">-৳{activeStatement.platformCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#e0dede] text-red-700">
                  <span>Refund & Return Deductions:</span>
                  <span className="font-bold">-৳{activeStatement.refundDeductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#e0dede] text-blue-800">
                  <span>Completed Withdrawals / Payouts:</span>
                  <span className="font-bold">-৳{activeStatement.withdrawals.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-extrabold text-[#002c11] border-t-2 border-[#002c11]">
                  <span>Closing Balance:</span>
                  <span>৳{activeStatement.closingBalance.toLocaleString()} BDT</span>
                </div>
              </div>

              {/* Transactions Log */}
              <div>
                <h4 className="text-xs font-bold text-[#002c11] mb-2 uppercase tracking-wider">
                  Itemized Transaction Log ({activeStatement.transactions.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#c1c9be] font-bold text-[#002c11]">
                        <th className="pb-1">Date</th>
                        <th className="pb-1">Type</th>
                        <th className="pb-1">Reference</th>
                        <th className="pb-1 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0eded]">
                      {activeStatement.transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="py-1.5 text-[#717970]">{tx.createdAt.slice(0, 10)}</td>
                          <td className="py-1.5 font-semibold text-[#002c11]">{tx.type}</td>
                          <td className="py-1.5 font-mono text-[10px] text-[#717970]">{tx.reference || tx.id}</td>
                          <td
                            className={`py-1.5 text-right font-bold ${
                              tx.amount > 0 ? 'text-[#1b6d24]' : 'text-red-700'
                            }`}
                          >
                            {tx.amount > 0 ? '+' : ''}৳{Math.abs(tx.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="pt-6 border-t border-[#e0dede] flex justify-between items-center text-[10px] text-[#717970]">
                <div>
                  <p>Certified Automated Electronic Document</p>
                  <p>SUNNO Financial Clearing & Settlements</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#002c11]">AUTHENTICATED ARTISAN RECORD</p>
                  <p>www.sunnobd.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROMOTION CAMPAIGN MODAL */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c1c9be] rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowPromoModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941] hover:bg-[#e0dede]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-extrabold text-[#002c11] font-heading">
              Launch Promotional Campaign
            </h3>
            <p className="text-xs text-[#717970]">
              Offer limited-time discounts on your products to drive customer orders.
            </p>

            <form onSubmit={handlePromoSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1b1c1c] mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Boishakhi Artisan Flash Sale"
                  value={promoName}
                  onChange={(e) => setPromoName(e.target.value)}
                  className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Discount % *</label>
                  <input
                    type="number"
                    min="5"
                    max="70"
                    required
                    value={promoDiscount}
                    onChange={(e) => setPromoDiscount(e.target.value)}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1b1c1c] mb-1">Duration Days</label>
                  <select
                    onChange={(e) => {
                      const days = parseInt(e.target.value);
                      setPromoEnd(new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
                    }}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2.5 outline-none focus:border-[#002c11]"
                  >
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0dede]">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-4 py-2 bg-[#f0eded] hover:bg-[#e0dede] text-[#414941] rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPromo}
                  className="px-6 py-2.5 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-xl font-bold text-xs shadow-md transition-all"
                >
                  {isSubmittingPromo ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
