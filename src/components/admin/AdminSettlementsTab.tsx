import React, { useState, useEffect } from 'react';
import {
  SellerSettlementRecord,
  SellerSettlementStatus,
} from '../../types';
import {
  fetchAllSellerSettlements,
  updateSellerSettlementStatus,
} from '../../services/adminAnalyticsService';
import { useAuth } from '../../context/AuthContext';

export const AdminSettlementsTab: React.FC = () => {
  const { userProfile } = useAuth();
  const [settlements, setSettlements] = useState<SellerSettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSettlement, setSelectedSettlement] = useState<SellerSettlementRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settlement Processing Modal
  const [activeModal, setActiveModal] = useState<'process' | 'hold' | 'details' | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const loadSettlements = async () => {
    setLoading(true);
    try {
      const data = await fetchAllSellerSettlements();
      setSettlements(data);
    } catch (e) {
      console.error('Error loading settlements:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettlements();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateStatus = async (
    newStatus: SellerSettlementStatus,
    overrideNotes?: string,
    overrideRef?: string
  ) => {
    if (!selectedSettlement) return;

    await updateSellerSettlementStatus(
      selectedSettlement.id,
      newStatus,
      overrideNotes || adminNotes,
      overrideRef || transactionRef,
      userProfile?.id || 'admin-01'
    );

    setSettlements((prev) =>
      prev.map((s) =>
        s.id === selectedSettlement.id
          ? {
              ...s,
              status: newStatus,
              transactionRef: overrideRef || transactionRef || s.transactionRef,
              notes: overrideNotes || adminNotes || s.notes,
              alreadyPaid: newStatus === 'PAID' ? s.netPayable : s.alreadyPaid,
              pendingAmount: newStatus === 'PAID' ? 0 : s.pendingAmount,
            }
          : s
      )
    );

    showToast(`Settlement #${selectedSettlement.settlementNumber} updated to ${newStatus}`);
    setActiveModal(null);
    setSelectedSettlement(null);
    setTransactionRef('');
    setAdminNotes('');
  };

  const filteredSettlements = settlements.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSearch =
      s.settlementNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.storeName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalGross = settlements.reduce((sum, s) => sum + s.grossSales, 0);
  const totalCommission = settlements.reduce((sum, s) => sum + s.platformCommission, 0);
  const totalPaid = settlements.reduce((sum, s) => sum + s.alreadyPaid, 0);
  const totalPending = settlements.reduce((sum, s) => sum + s.pendingAmount, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#002c11] text-[#a0f399] border border-[#a0f399]/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0e2417] p-6 rounded-3xl border border-[#1b482b]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#143d22] border border-[#256339] flex items-center justify-center text-[#a0f399]">
              <span className="material-symbols-outlined text-[24px]">account_balance</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-heading">
                Artisan Settlements & Escrow Treasury
              </h2>
              <p className="text-xs text-[#80a48b] mt-0.5">
                Supervise periodic disbursement batches, escrow releases, commission audits, and payout receipts.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadSettlements}
          className="px-4 py-2 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-[#7ca087]">Gross Artisan Sales</span>
          <h4 className="text-xl font-bold text-white font-mono mt-1">৳{totalGross.toLocaleString()}</h4>
          <span className="text-[10px] text-[#7ca087]">Across all cycles</span>
        </div>

        <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-[#7ca087]">Platform Commission</span>
          <h4 className="text-xl font-bold text-[#a0f399] font-mono mt-1">৳{totalCommission.toLocaleString()}</h4>
          <span className="text-[10px] text-emerald-400 font-bold">8% Standard Fee</span>
        </div>

        <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-[#7ca087]">Disbursed Payouts</span>
          <h4 className="text-xl font-bold text-emerald-400 font-mono mt-1">৳{totalPaid.toLocaleString()}</h4>
          <span className="text-[10px] text-[#7ca087]">Paid to artisans</span>
        </div>

        <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-[#7ca087]">Pending Escrow Maturity</span>
          <h4 className="text-xl font-bold text-amber-400 font-mono mt-1">৳{totalPending.toLocaleString()}</h4>
          <span className="text-[10px] text-amber-300">Queued for release</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7ca087] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search settlement #, seller name, or store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12281a] border border-[#20452d] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#7ca087] outline-none"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['all', 'PENDING', 'PROCESSING', 'PAID', 'ON_HOLD'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-[#184627] text-[#a0f399] border border-[#2f7344]'
                  : 'bg-[#12281a] text-[#7ca087] hover:text-white border border-[#20452d]'
              }`}
            >
              {st === 'all' ? 'All' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#122b1c] border-b border-[#1b4128] text-[10px] font-bold uppercase text-[#7ca087]">
                <th className="py-3.5 px-6">Settlement ID</th>
                <th className="py-3.5 px-4">Artisan / Cooperative</th>
                <th className="py-3.5 px-4">Cycle Period</th>
                <th className="py-3.5 px-4">Gross Sales</th>
                <th className="py-3.5 px-4">Commission (8%)</th>
                <th className="py-3.5 px-4">Net Payable</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#183a24]">
              {filteredSettlements.map((item) => (
                <tr key={item.id} className="hover:bg-[#132c1d]">
                  <td className="py-3.5 px-6 font-mono font-bold text-[#a0f399]">
                    {item.settlementNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white">{item.storeName}</div>
                    <div className="text-[10px] text-[#7ca087]">{item.sellerName}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#80a48b]">{item.period}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white">৳{item.grossSales.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">-৳{item.platformCommission.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#a0f399]">৳{item.netPayable.toLocaleString()}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        item.status === 'PAID'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : item.status === 'PROCESSING'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : item.status === 'ON_HOLD'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right space-x-2">
                    <button
                      onClick={() => {
                        setSelectedSettlement(item);
                        setActiveModal('details');
                      }}
                      className="px-3 py-1 bg-[#143220] hover:bg-[#1e482e] text-[#a0f399] font-bold rounded-xl text-xs"
                    >
                      Audit
                    </button>
                    {item.status !== 'PAID' && (
                      <button
                        onClick={() => {
                          setSelectedSettlement(item);
                          setActiveModal('process');
                        }}
                        className="px-3 py-1 bg-[#1b6d24] hover:bg-[#23872e] text-white font-bold rounded-xl text-xs shadow-xs"
                      >
                        Disburse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disburse Modal */}
      {activeModal === 'process' && selectedSettlement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1e12] text-[#e1e9e3] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#1b482b] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b4329]">
              <div>
                <h3 className="text-lg font-bold text-white font-heading">
                  Disburse Settlement #{selectedSettlement.settlementNumber}
                </h3>
                <p className="text-xs text-[#7ca087]">{selectedSettlement.storeName}</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-[#7ea289] hover:text-white rounded-full"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-[#0e2417] p-4 rounded-2xl border border-[#1b4329] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#7ca087]">Net Payable Amount:</span>
                <strong className="font-mono text-base text-[#a0f399]">৳{selectedSettlement.netPayable.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7ca087]">Target Method:</span>
                <span className="text-white font-bold">{selectedSettlement.payoutMethod || 'Direct Bank Escrow'}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#a0f399] uppercase block mb-1">
                  Bank / MFS Transaction Reference ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRX-BEFTN-20260814-9901"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full bg-[#143220] border border-[#235636] rounded-xl px-3 py-2 text-white outline-none focus:border-[#a0f399]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#a0f399] uppercase block mb-1">
                  Disbursement Remarks
                </label>
                <input
                  type="text"
                  placeholder="Approved by Treasury Officer"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full bg-[#143220] border border-[#235636] rounded-xl px-3 py-2 text-white outline-none focus:border-[#a0f399]"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#1b4329]">
              <button
                onClick={() => handleUpdateStatus('ON_HOLD', 'Hold placed by admin')}
                className="px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 rounded-xl text-xs font-bold"
              >
                Place On Hold
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-[#143220] text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus('PAID')}
                  disabled={!transactionRef.trim()}
                  className="px-5 py-2 bg-[#a0f399] hover:bg-[#8ee986] disabled:opacity-40 text-[#002204] rounded-xl text-xs font-black shadow-md"
                >
                  Confirm & Mark Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details / Audit Modal */}
      {activeModal === 'details' && selectedSettlement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1e12] text-[#e1e9e3] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#1b482b] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b4329]">
              <div>
                <h3 className="text-lg font-bold text-white font-heading">
                  Settlement Breakdown Audit
                </h3>
                <span className="font-mono text-xs text-[#a0f399]">
                  {selectedSettlement.settlementNumber}
                </span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-[#7ea289] hover:text-white rounded-full"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-[#0e2417] rounded-2xl border border-[#1b4329] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#7ca087]">Artisan / Guild:</span>
                  <span className="text-white font-bold">{selectedSettlement.sellerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7ca087]">Store Name:</span>
                  <span className="text-white">{selectedSettlement.storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7ca087]">Settlement Cycle:</span>
                  <span className="text-white">{selectedSettlement.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7ca087]">Payout Method:</span>
                  <span className="text-white">{selectedSettlement.payoutMethod || 'BEFTN / bKash Direct'}</span>
                </div>
              </div>

              <div className="p-4 bg-[#0e2417] rounded-2xl border border-[#1b4329] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#7ca087]">Gross Product Sales:</span>
                  <span className="text-white font-mono font-bold">৳{selectedSettlement.grossSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Less: Platform Commission (8%):</span>
                  <span className="font-mono">-৳{selectedSettlement.platformCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Less: Refund Adjustments:</span>
                  <span className="font-mono">-৳{selectedSettlement.refundAdjustments.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Less: Courier Deductions:</span>
                  <span className="font-mono">-৳{selectedSettlement.courierFees.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-[#1b4329] flex justify-between text-sm font-bold text-[#a0f399]">
                  <span>Net Artisan Remittance:</span>
                  <span className="font-mono">৳{selectedSettlement.netPayable.toLocaleString()}</span>
                </div>
              </div>

              {selectedSettlement.transactionRef && (
                <div className="p-3 bg-[#133020] rounded-xl border border-[#215433] text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#7ca087] block">Transaction Reference</span>
                  <span className="font-mono text-white">{selectedSettlement.transactionRef}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 bg-[#1b6d24] hover:bg-[#22832c] text-white rounded-xl text-xs font-bold"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
