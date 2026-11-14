import React, { useState, useEffect } from 'react';
import { QueueSubmission, Product, ActiveTab, SellerProfile, Order } from '../types';
import { fetchAllSellers, updateSellerStatus, fetchAuditLogs } from '../services/dbService';
import { useAuth } from '../context/AuthContext';

interface AdminQueueViewProps {
  queueItems: QueueSubmission[];
  onUpdateQueueItem: (
    id: string,
    newStatus: 'pending' | 'flagged' | 'under_review' | 'approved' | 'rejected',
    notes?: string
  ) => void;
  onUpdateProductStatus: (
    productId: string,
    status: 'eco_verified' | 'under_review' | 'flagged' | 'rejected'
  ) => void;
  setActiveTab: (tab: ActiveTab) => void;
  allProducts: Product[];
}

export const AdminQueueView: React.FC<AdminQueueViewProps> = ({
  queueItems,
  onUpdateQueueItem,
  onUpdateProductStatus,
  setActiveTab,
  allProducts,
}) => {
  const { role, userProfile } = useAuth();
  const [adminTab, setAdminTab] = useState<'products' | 'sellers' | 'audit_logs'>('products');
  const [selectedId, setSelectedId] = useState<string>(queueItems[0]?.id || 'queue-1');
  const [searchQueue, setSearchQueue] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'flagged' | 'under_review'>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Sellers moderation state
  const [sellersList, setSellersList] = useState<SellerProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingSellers, setIsLoadingSellers] = useState(false);

  const selectedSubmission =
    queueItems.find((q) => q.id === selectedId) || queueItems[0];

  const [currentNotes, setCurrentNotes] = useState<string>(
    selectedSubmission?.internalNotes || ''
  );

  useEffect(() => {
    loadSellersAndLogs();
  }, [adminTab]);

  const loadSellersAndLogs = async () => {
    setIsLoadingSellers(true);
    try {
      const sellers = await fetchAllSellers();
      setSellersList(sellers);
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoadingSellers(false);
    }
  };

  const handleSelectSubmission = (sub: QueueSubmission) => {
    setSelectedId(sub.id);
    setCurrentNotes(sub.internalNotes);
  };

  const handleAction = (
    newStatus: 'pending' | 'flagged' | 'under_review' | 'approved' | 'rejected',
    productStatus: 'eco_verified' | 'under_review' | 'flagged' | 'rejected',
    message: string
  ) => {
    if (!selectedSubmission) return;

    onUpdateQueueItem(selectedSubmission.id, newStatus, currentNotes);
    onUpdateProductStatus(selectedSubmission.product.id, productStatus);

    setActionSuccessMsg(message);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleSellerApproval = async (sellerId: string, status: 'approved' | 'rejected' | 'suspended') => {
    try {
      await updateSellerStatus(sellerId, status, userProfile?.id || 'admin-01');
      setSellersList((prev) =>
        prev.map((s) => (s.id === sellerId ? { ...s, status } : s))
      );
      setActionSuccessMsg(`Seller application updated to ${status.toUpperCase()}`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error updating seller status:', err);
    }
  };

  const filteredQueue = queueItems.filter((item) => {
    const matchesSearch =
      !searchQueue ||
      item.trackingId.toLowerCase().includes(searchQueue.toLowerCase()) ||
      item.product.title.toLowerCase().includes(searchQueue.toLowerCase()) ||
      item.product.sellerName.toLowerCase().includes(searchQueue.toLowerCase());

    const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const pendingSellersCount = sellersList.filter((s) => s.status === 'pending').length;

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-8 min-h-[calc(100vh-80px)]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#c1c9be]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1b6d24] animate-pulse"></span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
              SUNNO Admin & Moderation Panel
            </h1>
            <span className="px-2.5 py-0.5 bg-[#002c11] text-white text-[10px] font-bold rounded-full uppercase">
              Role: {role}
            </span>
          </div>
          <p className="text-sm text-[#414941] mt-1">
            Review and authenticate sustainable product submissions and artisan cooperatives across 64 districts.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#f0eded] p-1 rounded-full border border-[#c1c9be]/60 text-xs">
          <button
            onClick={() => setAdminTab('products')}
            className={`px-4 py-1.5 rounded-full font-bold transition-all ${
              adminTab === 'products'
                ? 'bg-[#002c11] text-white shadow-xs'
                : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Product Eco-Queue ({queueItems.length})
          </button>
          <button
            onClick={() => setAdminTab('sellers')}
            className={`px-4 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 ${
              adminTab === 'sellers'
                ? 'bg-[#1b6d24] text-white shadow-xs'
                : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            <span>Seller Onboarding</span>
            {pendingSellersCount > 0 && (
              <span className="bg-white text-[#1b6d24] text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {pendingSellersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminTab('audit_logs')}
            className={`px-4 py-1.5 rounded-full font-bold transition-all ${
              adminTab === 'audit_logs'
                ? 'bg-[#002c11] text-white shadow-xs'
                : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Security Audit Logs
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-4 bg-[#e8f5e9] border border-[#a0f399] rounded-2xl flex items-center justify-between text-xs font-bold text-[#002c11] shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1b6d24]">check_circle</span>
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)}>
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* 4 Bento Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#c1c9be] shadow-xs">
          <p className="text-xs font-semibold text-[#717970]">Pending Eco Audits</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading mt-1">
            {queueItems.filter((q) => q.status === 'pending' || q.status === 'under_review').length}
          </h3>
          <p className="text-[11px] text-[#1b6d24] font-semibold mt-1">
            Active in queue
          </p>
        </div>

        <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#c1c9be] shadow-xs">
          <p className="text-xs font-semibold text-[#717970]">Registered Sellers</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1b6d24] font-heading mt-1">
            {sellersList.length}
          </h3>
          <p className="text-[11px] text-[#1b6d24] font-semibold mt-1">
            {sellersList.filter((s) => s.status === 'approved').length} Eco-Accredited
          </p>
        </div>

        <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#c1c9be] shadow-xs">
          <p className="text-xs font-semibold text-[#717970]">Total Marketplace Listings</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading mt-1">
            {allProducts.length}
          </h3>
          <p className="text-[11px] text-[#717970] font-semibold mt-1">
            Across 64 districts
          </p>
        </div>

        <div className="bg-[#ffffff] p-5 rounded-2xl border border-red-200 shadow-xs bg-red-50/20">
          <p className="text-xs font-semibold text-red-600">Pending Seller Reviews</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-red-700 font-heading mt-1">
            {pendingSellersCount}
          </h3>
          <p className="text-[11px] text-red-600 font-semibold mt-1">
            Requires verification
          </p>
        </div>
      </div>

      {/* Main Tab 1: Product Verification Queue */}
      {adminTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Submissions Queue Master List */}
          <div className="lg:col-span-5 xl:col-span-4 bg-[#ffffff] rounded-2xl border border-[#c1c9be] p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#c1c9be]/60">
              <h2 className="text-sm font-bold text-[#002c11] uppercase tracking-wider font-heading">
                Queue ({filteredQueue.length})
              </h2>

              <div className="flex gap-1">
                {(['all', 'pending', 'flagged'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                      activeFilter === filter
                        ? 'bg-[#002c11] text-white'
                        : 'bg-[#f0eded] text-[#414941]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredQueue.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSubmission(item)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#002c11] bg-[#f5fbf6] ring-2 ring-[#002c11]/10'
                        : 'border-[#c1c9be]/60 bg-white hover:bg-[#fbf9f8]'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.title}
                          className="w-10 h-10 rounded-lg object-cover bg-[#f5f3f3] border border-[#c1c9be]/60 shrink-0"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-[#1b1c1c] line-clamp-1">
                            {item.product.title}
                          </h4>
                          <p className="text-[10px] text-[#717970]">
                            {item.product.sellerName} • {item.product.district}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] text-[#717970] font-mono shrink-0">
                        {item.submittedAgo}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-[#c1c9be]/30">
                      <span className="text-[10px] font-mono text-[#414941]">
                        ID: #{item.trackingId}
                      </span>

                      {item.status === 'approved' ? (
                        <span className="text-[10px] font-bold text-[#1b6d24] flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                          Verified
                        </span>
                      ) : item.status === 'flagged' ? (
                        <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          Flagged
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#e3a824] flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">pending</span>
                          Pending Review
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submission Detail Inspector */}
          {selectedSubmission ? (
            <div className="lg:col-span-7 xl:col-span-8 bg-[#ffffff] rounded-2xl border border-[#c1c9be] p-6 flex flex-col gap-6 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#c1c9be]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#002c11] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      Made in Bangladesh
                    </span>
                    <span className="text-xs font-mono text-[#717970]">
                      #{selectedSubmission.trackingId}
                    </span>
                    <span className="text-xs text-[#717970]">
                      • Submitted {selectedSubmission.submittedDate}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#002c11] font-heading mt-1">
                    {selectedSubmission.product.title}
                  </h2>
                  <p className="text-xs text-[#414941] mt-0.5">
                    Seller: <strong className="text-[#002c11]">{selectedSubmission.product.sellerName}</strong> ({selectedSubmission.product.district}, {selectedSubmission.product.division})
                  </p>
                </div>

                <div>
                  {selectedSubmission.status === 'approved' ? (
                    <span className="px-3 py-1 bg-[#1b6d24] text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">eco</span>
                      Eco Verified
                    </span>
                  ) : (
                    <span className="px-3 py-1 border border-dashed border-[#717970] text-[#414941] text-xs font-semibold rounded-full bg-[#fbf9f8] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">pending</span>
                      Awaiting Verification
                    </span>
                  )}
                </div>
              </div>

              {/* Images & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1 aspect-square rounded-xl overflow-hidden bg-[#f5f3f3] border border-[#c1c9be]">
                  <img
                    src={selectedSubmission.product.images[0]}
                    alt={selectedSubmission.product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#717970] uppercase tracking-wider mb-1 font-heading">
                      Artisan Statement & Description
                    </h3>
                    <p className="text-xs text-[#1b1c1c] leading-relaxed">
                      {selectedSubmission.product.description}
                    </p>
                  </div>

                  {/* Seller's Eco Claims Checklist */}
                  <div className="mt-3 bg-[#f5fbf6] p-3 rounded-xl border border-[#c1c9be]/60">
                    <h4 className="text-[11px] font-bold text-[#002c11] uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#1b6d24]">verified</span>
                      Seller's Eco Claims
                    </h4>
                    <div className="space-y-1 text-xs">
                      {selectedSubmission.product.claims.map((claim, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[#1b1c1c]">
                          <span className="text-[#1b6d24] font-bold">✓</span>
                          <div>
                            <strong>{claim.title}:</strong> {claim.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#c1c9be] pt-4">
                <div className="bg-[#f5f3f3] p-3.5 rounded-xl border border-[#c1c9be]/60">
                  <p className="text-[11px] font-bold text-[#717970] uppercase">
                    Primary Material Composition
                  </p>
                  <p className="text-xs font-bold text-[#002c11] mt-1">
                    {selectedSubmission.product.materialComposition}
                  </p>
                  <p className="text-[10px] text-[#414941] mt-0.5">
                    End of life: {selectedSubmission.product.endOfLifeInfo}
                  </p>
                </div>

                <div className="bg-[#f5f3f3] p-3.5 rounded-xl border border-[#c1c9be]/60">
                  <p className="text-[11px] font-bold text-[#717970] uppercase">
                    Manufacturing Process
                  </p>
                  <p className="text-xs font-semibold text-[#002c11] mt-1">
                    {selectedSubmission.product.manufacturingProcess}
                  </p>
                </div>

                <div className="bg-[#f5f3f3] p-3.5 rounded-xl border border-[#c1c9be]/60">
                  <p className="text-[11px] font-bold text-[#717970] uppercase">
                    Uploaded Sourcing Certifications
                  </p>
                  {selectedSubmission.product.certifications.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {selectedSubmission.product.certifications.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-[#c1c9be] text-xs"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="material-symbols-outlined text-[#e2136e] text-[16px]">
                              picture_as_pdf
                            </span>
                            <span className="font-mono text-[11px] truncate">
                              {doc.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#717970] shrink-0 font-medium">
                            {doc.size}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      No certificate attached by seller.
                    </p>
                  )}
                </div>

                <div className="bg-[#f5f3f3] p-3.5 rounded-xl border border-[#c1c9be]/60">
                  <p className="text-[11px] font-bold text-[#717970] uppercase">
                    Suggested Verification Badges
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="px-2 py-0.5 bg-[#a0f399] text-[#002204] text-[10px] font-bold rounded-full">
                      100% Biodegradable
                    </span>
                    <span className="px-2 py-0.5 bg-[#eae8e7] text-[#1b1c1c] text-[10px] font-bold rounded-full">
                      Artisan Heritage
                    </span>
                    <span className="px-2 py-0.5 bg-[#eae8e7] text-[#1b1c1c] text-[10px] font-bold rounded-full">
                      Plastic-Free
                    </span>
                  </div>
                </div>
              </div>

              {/* Internal Review Notes */}
              <div>
                <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1 font-heading">
                  Internal Review Notes
                </label>
                <textarea
                  rows={2}
                  value={currentNotes}
                  onChange={(e) => setCurrentNotes(e.target.value)}
                  placeholder="Log internal audit remarks, sample test notes, or seller inquiries..."
                  className="w-full bg-[#f5f3f3] border border-[#c1c9be] rounded-xl p-3 text-xs text-[#1b1c1c] focus:border-[#002c11] outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#c1c9be]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleAction(
                        'rejected',
                        'rejected',
                        `Submission #${selectedSubmission.trackingId} rejected.`
                      )
                    }
                    className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() =>
                      handleAction(
                        'flagged',
                        'flagged',
                        `Seller account flagged for audit inquiry.`
                      )
                    }
                    className="px-4 py-2 border border-[#c1c9be] text-[#414941] hover:bg-[#f0eded] rounded-lg text-xs font-semibold transition-colors"
                  >
                    Flag / Suspend
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      handleAction(
                        'under_review',
                        'under_review',
                        `Review request dispatched to ${selectedSubmission.product.sellerName}.`
                      )
                    }
                    className="px-4 py-2 border border-[#002c11] text-[#002c11] hover:bg-[#f5f3f3] rounded-lg text-xs font-bold transition-colors"
                  >
                    Request Info
                  </button>
                  <button
                    onClick={() =>
                      handleAction(
                        'approved',
                        'eco_verified',
                        `✓ Approved! "${selectedSubmission.product.title}" is now SUNNO Eco Verified and published on 64 Districts.`
                      )
                    }
                    className="px-6 py-2.5 bg-[#1b6d24] hover:bg-[#002c11] text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    Approve (Eco Verified)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-7 xl:col-span-8 bg-[#ffffff] rounded-2xl border border-dashed border-[#c1c9be] p-12 text-center text-[#717970]">
              Select a product from the queue to inspect verification claims.
            </div>
          )}
        </div>
      )}

      {/* Main Tab 2: Seller & Store Onboarding Applications */}
      {adminTab === 'sellers' && (
        <div className="bg-white rounded-3xl border border-[#c1c9be] p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-[#c1c9be]">
            <div>
              <h3 className="text-lg font-bold text-[#002c11] font-heading">
                Artisan Seller & Cooperative Applications
              </h3>
              <p className="text-xs text-[#717970]">
                Accredit artisan stores in 64 districts to unlock product listing capabilities
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#c1c9be] text-[#717970] font-bold uppercase">
                  <th className="pb-3 pl-2">Store / Artisan</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Categories</th>
                  <th className="pb-3">Eco Practice Info</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c1c9be]/40">
                {sellersList.map((seller) => (
                  <tr key={seller.id} className="hover:bg-[#fbf9f8]">
                    <td className="py-3 pl-2">
                      <p className="font-bold text-[#002c11] text-sm">{seller.storeName}</p>
                      <p className="text-[11px] text-[#717970]">
                        {seller.fullName} • {seller.phone} ({seller.email})
                      </p>
                    </td>

                    <td className="py-3">
                      <p className="font-semibold text-[#1b1c1c]">{seller.district}</p>
                      <p className="text-[11px] text-[#717970]">{seller.division} Division</p>
                    </td>

                    <td className="py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {seller.categories.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#f5f3f3] text-[#414941] rounded text-[10px]">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 max-w-xs">
                      <p className="text-[#414941] line-clamp-2">{seller.ecoProductInfo}</p>
                    </td>

                    <td className="py-3">
                      {seller.status === 'approved' ? (
                        <span className="px-2.5 py-0.5 bg-[#e8f5e9] text-[#1b6d24] rounded-full font-bold uppercase text-[10px]">
                          Approved
                        </span>
                      ) : seller.status === 'suspended' ? (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold uppercase text-[10px]">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-bold uppercase text-[10px]">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3 pr-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {seller.status !== 'approved' && (
                          <button
                            onClick={() => handleSellerApproval(seller.id, 'approved')}
                            className="px-3 py-1 bg-[#1b6d24] text-white rounded-lg font-bold text-xs hover:bg-[#002c11]"
                          >
                            Approve
                          </button>
                        )}
                        {seller.status === 'approved' && (
                          <button
                            onClick={() => handleSellerApproval(seller.id, 'suspended')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg font-bold text-xs hover:bg-red-200"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Tab 3: Security Audit Logs */}
      {adminTab === 'audit_logs' && (
        <div className="bg-white rounded-3xl border border-[#c1c9be] p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-[#c1c9be]">
            <div>
              <h3 className="text-lg font-bold text-[#002c11] font-heading">
                Security & Role-Based Operation Audit Trail
              </h3>
              <p className="text-xs text-[#717970]">
                Immutable records of all database writes, status transitions, and eco audits
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-[#717970] py-6 text-center">No audit records logged yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-[#f5f3f3] rounded-xl border border-[#c1c9be]/40 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                >
                  <div>
                    <span className="font-mono font-bold text-[#002c11] bg-white px-2 py-0.5 rounded border border-[#c1c9be]">
                      {log.action}
                    </span>
                    <span className="ml-2 font-semibold text-[#1b1c1c]">
                      Entity: {log.entityType} ({log.entityId})
                    </span>
                    <p className="text-[11px] text-[#717970] mt-0.5">
                      Performed by: <strong>{log.performedBy}</strong>
                    </p>
                  </div>
                  <span className="text-[10px] text-[#717970] font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
};
