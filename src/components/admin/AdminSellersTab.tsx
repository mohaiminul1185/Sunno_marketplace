import React, { useState, useEffect } from 'react';
import { SellerProfile, Store, Product, SellerWarning, SellerRestriction } from '../../types';
import {
  fetchAllSellers,
  updateSellerStatus,
  fetchAllStores,
  fetchAllProducts,
  createAuditLog,
  createSellerWarning,
  imposeSellerRestriction,
} from '../../services/dbService';
import { exportDataToCsv } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

interface AdminSellersTabProps {
  initialSubTab?: 'all' | 'applications';
}

export const AdminSellersTab: React.FC<AdminSellersTabProps> = ({
  initialSubTab = 'all',
}) => {
  const { userProfile: currentAdmin } = useAuth();
  const [subTab, setSubTab] = useState<'all' | 'applications'>(initialSubTab);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modals & Drawers
  const [selectedSeller, setSelectedSeller] = useState<SellerProfile | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  // Form Inputs
  const [rejectionReason, setRejectionReason] = useState('Incomplete artisan lineage verification or missing trade/craft documentation.');
  const [banReason, setBanReason] = useState('Critical violation of SUNNO zero-plastic craft policies.');
  const [warningTitle, setWarningTitle] = useState('Dispatch Delay Warning');
  const [warningReason, setWarningReason] = useState('Order fulfillment exceeded the 48-hour artisan standard.');
  const [warningSeverity, setWarningSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sellersList, storesList, productsList] = await Promise.all([
          fetchAllSellers(),
          fetchAllStores(),
          fetchAllProducts(),
        ]);
        setSellers(sellersList);
        setStores(storesList);
        setProducts(productsList);
      } catch (err) {
        console.error('Error loading sellers:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateStatus = async (
    seller: SellerProfile,
    newStatus: 'approved' | 'rejected' | 'suspended' | 'banned' | 'under_review',
    reason?: string
  ) => {
    try {
      await updateSellerStatus(seller.id, newStatus, reason, currentAdmin?.id || 'admin-01');
      setSellers((prev) =>
        prev.map((s) => (s.id === seller.id ? { ...s, status: newStatus, rejectionReason: reason } : s))
      );
      if (selectedSeller?.id === seller.id) {
        setSelectedSeller({ ...selectedSeller, status: newStatus, rejectionReason: reason });
      }
      setIsApproveModalOpen(false);
      setIsRejectModalOpen(false);
      setIsBanModalOpen(false);
      showToast(`Seller status updated to "${newStatus.toUpperCase()}".`);
    } catch (err) {
      console.error('Failed to update seller status:', err);
    }
  };

  const handleIssueWarning = async () => {
    if (!selectedSeller) return;
    try {
      await createSellerWarning(
        {
          sellerId: selectedSeller.id,
          sellerName: selectedSeller.shopName || selectedSeller.storeName,
          storeName: selectedSeller.shopName || selectedSeller.storeName,
          type: 'policy_violation',
          title: warningTitle,
          reason: warningReason,
          severity: warningSeverity,
          issuedBy: currentAdmin?.id || 'admin-01',
        },
        currentAdmin?.id || 'admin-01'
      );
      setIsWarningModalOpen(false);
      showToast('Formal compliance warning issued to seller.');
    } catch (err) {
      console.error('Failed to issue warning:', err);
    }
  };

  const applicationsList = sellers.filter((s) => s.status === 'pending' || s.status === 'under_review');
  const allSellersList = sellers;

  const currentList = subTab === 'applications' ? applicationsList : allSellersList;

  const filteredSellers = currentList.filter((s) => {
    const matchesSearch =
      (s.shopName || s.storeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.storeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.district || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && s.status === statusFilter;
  });

  const handleExportCsv = () => {
    const headers = ['Seller ID', 'Store Name', 'District', 'Craft Heritage', 'Status', 'Plan ID', 'Total Sales (৳)', 'Created At'];
    const rows = filteredSellers.map((s) => [
      s.id,
      s.shopName || s.storeName || 'Artisan Co-op',
      s.district || 'Dhaka',
      s.ecoCategory || s.craftSpecialty || 'Heritage Craft',
      s.status,
      s.planId || 'plan-basic',
      s.totalSales || 0,
      s.createdAt || 'N/A',
    ]);
    exportDataToCsv('sunno_sellers_directory', headers, rows);
    showToast('Artisans & Sellers directory exported to CSV.');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#002c11] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-[#a0f399]/50">
          <span className="material-symbols-outlined text-[18px] text-[#a0f399]">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#002c11] font-heading">
            64-District Artisan & Seller Management
          </h2>
          <p className="text-xs text-[#717970] mt-0.5">
            Audit seller onboarding applications, enforce zero-plastic standards, and govern cooperative storefronts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-[#f0eded] p-1 rounded-2xl border border-[#c1c9be]/40">
            <button
              onClick={() => {
                setSubTab('all');
                setStatusFilter('all');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                subTab === 'all'
                  ? 'bg-[#002c11] text-white shadow-sm'
                  : 'text-[#414941] hover:text-[#002c11]'
              }`}
            >
              All Sellers ({sellers.length})
            </button>
            <button
              onClick={() => {
                setSubTab('applications');
                setStatusFilter('all');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                subTab === 'applications'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-[#414941] hover:text-[#002c11]'
              }`}
            >
              <span>Onboarding Queue</span>
              {applicationsList.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-amber-900">
                  {applicationsList.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-2xl transition-colors flex items-center gap-2 border border-[#c1c9be]/40 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-[#1b6d24]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717970] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by store name, district, craft type, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#c1c9be]/60 focus:border-[#1b6d24] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#1b1c1c] placeholder-[#717970] outline-none shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-[#c1c9be]/60 rounded-2xl p-1 shadow-sm overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'all' ? 'bg-[#002c11] text-white' : 'text-[#414941] hover:bg-[#f0eded]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'approved' ? 'bg-emerald-700 text-white' : 'text-[#414941] hover:bg-[#f0eded]'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'text-[#414941] hover:bg-[#f0eded]'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'suspended' ? 'bg-orange-700 text-white' : 'text-[#414941] hover:bg-[#f0eded]'
            }`}
          >
            Suspended
          </button>
          <button
            onClick={() => setStatusFilter('banned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'banned' ? 'bg-red-700 text-white' : 'text-[#414941] hover:bg-[#f0eded]'
            }`}
          >
            Banned
          </button>
        </div>
      </div>

      {/* Main Sellers Table */}
      <div className="bg-white rounded-3xl border border-[#c1c9be]/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fbf9f8] border-b border-[#f0eded] text-[11px] font-bold uppercase tracking-wider text-[#717970]">
                <th className="py-4 px-6">Artisan Store</th>
                <th className="py-4 px-4">District / Division</th>
                <th className="py-4 px-4">Craft Specialty</th>
                <th className="py-4 px-4">Plan & Sales</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0eded] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#717970]">
                    Loading artisan sellers...
                  </td>
                </tr>
              ) : filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#717970]">
                    No sellers found matching the active criteria.
                  </td>
                </tr>
              ) : (
                filteredSellers.map((seller) => {
                  const sellerProds = products.filter((p) => p.sellerId === seller.id);
                  return (
                    <tr key={seller.id} className="hover:bg-[#f5f9f5] transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#002c11] text-[#a0f399] flex items-center justify-center font-bold text-xs shrink-0">
                            {(seller.shopName || seller.storeName || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#002c11] flex items-center gap-1.5">
                              <span>{seller.shopName || seller.storeName || 'Artisan Cooperative'}</span>
                              {seller.isEcoCertified && (
                                <span className="material-symbols-outlined text-[15px] text-[#1b6d24]" title="Eco Certified">
                                  verified
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#717970] font-mono">
                              {seller.email || 'seller@sunno.eco'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#414941]">
                        <span className="font-semibold text-[#002c11]">{seller.district || 'Dhaka'}</span>, {seller.division || 'Dhaka'}
                      </td>
                      <td className="py-3.5 px-4 text-[#414941]">
                        <span className="inline-block px-2 py-0.5 bg-[#f0eded] rounded-lg text-[11px] font-medium text-[#002c11]">
                          {seller.ecoCategory || seller.craftSpecialty || 'Bamboo & Handloom'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-[#002c11]">৳{(seller.totalSales || 24500).toLocaleString()}</div>
                        <div className="text-[10px] text-[#717970] capitalize">
                          {seller.planId?.replace('plan-', '') || 'Basic'} • {sellerProds.length} items
                        </div>
                      </td>
                      <td className="py-3.5 px-4 space-y-1">
                        <div>
                          {seller.status === 'approved' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ✓ Approved
                            </span>
                          )}
                          {seller.status === 'pending' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              ⏳ Pending Audit
                            </span>
                          )}
                          {seller.status === 'under_review' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              🔍 Under Review
                            </span>
                          )}
                          {seller.status === 'suspended' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                              ⚠️ Suspended
                            </span>
                          )}
                          {seller.status === 'banned' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              🚫 Banned
                            </span>
                          )}
                        </div>
                        <div>
                          {seller.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              🟠 ACTIVE / AVAILABLE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-stone-100 text-stone-700 border border-stone-300">
                              🟤 INACTIVE / UNAVAILABLE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedSeller(seller)}
                          className="px-3 py-1.5 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                          Audit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seller Inspection & Action Drawer */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#c1c9be]/60 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0eded]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#002c11] text-[#a0f399] flex items-center justify-center font-bold text-lg">
                  {(selectedSeller.shopName || selectedSeller.storeName || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#002c11] font-heading">
                    {selectedSeller.shopName || selectedSeller.storeName || 'Artisan Cooperative'}
                  </h3>
                  <p className="text-xs text-[#717970]">
                    {selectedSeller.district}, {selectedSeller.division} • Lineage: {selectedSeller.craftSpecialty || 'Heritage Craft'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSeller(null)}
                className="p-2 text-[#717970] hover:text-[#002c11] rounded-full hover:bg-[#f0eded]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
                <span className="text-[10px] font-bold text-[#717970] uppercase block">Current Status</span>
                <span className="text-xs font-bold text-[#002c11] uppercase mt-1 inline-block">
                  {selectedSeller.status}
                </span>
              </div>
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
                <span className="text-[10px] font-bold text-[#717970] uppercase block">Assigned Plan</span>
                <span className="text-xs font-bold text-[#1b6d24] mt-1 inline-block capitalize">
                  {selectedSeller.planId?.replace('plan-', '') || 'Basic Starter'}
                </span>
              </div>
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
                <span className="text-[10px] font-bold text-[#717970] uppercase block">Active Listings</span>
                <span className="text-xs font-bold text-[#002c11] font-mono mt-1 inline-block">
                  {products.filter((p) => p.sellerId === selectedSeller.id).length} Products
                </span>
              </div>
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
                <span className="text-[10px] font-bold text-[#717970] uppercase block">Gross Sales</span>
                <span className="text-xs font-bold text-[#002c11] font-mono mt-1 inline-block">
                  ৳{(selectedSeller.totalSales || 24500).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Verification Documents & Eco Declaration */}
            <div className="space-y-4 p-5 bg-[#f5f9f5] rounded-3xl border border-[#1b6d24]/20 text-xs">
              <div>
                <h4 className="font-bold text-[#002c11] text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#1b6d24]">eco</span>
                  Artisan Lineage & Eco Material Declaration
                </h4>
                <p className="text-[#414941] leading-relaxed">
                  {selectedSeller.ecoProductInfo || selectedSeller.storeDescription || selectedSeller.bio || 'Cooperative of rural artisan families utilizing 100% natural, locally harvested raw materials with zero synthetic chemicals.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1b6d24]/10 text-[11px]">
                <div className="p-3 bg-white rounded-xl border border-[#c1c9be]/50 space-y-1">
                  <p className="font-bold text-[#002c11] text-xs">Representative & Workshop Location</p>
                  <p><span className="text-[#717970]">Representative:</span> <strong>{selectedSeller.fullName || selectedSeller.contactPerson || 'Artisan Lead'}</strong></p>
                  <p><span className="text-[#717970]">Phone:</span> {selectedSeller.phone || 'N/A'}</p>
                  <p><span className="text-[#717970]">Email:</span> {selectedSeller.email || 'N/A'}</p>
                  <p><span className="text-[#717970]">Address:</span> {selectedSeller.businessAddress || selectedSeller.address || `${selectedSeller.district}, ${selectedSeller.division}`}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#c1c9be]/50 space-y-1">
                  <p className="font-bold text-[#002c11] text-xs">Financial Settlement Details</p>
                  <p>
                    <span className="text-[#717970]">Payout Channel:</span>{' '}
                    <span className="font-bold uppercase text-[#1b6d24]">
                      {selectedSeller.settlementInfo?.method?.replace('_', ' ') || selectedSeller.payoutMethod || 'Bank Transfer'}
                    </span>
                  </p>
                  <p>
                    <span className="text-[#717970]">Account Holder:</span>{' '}
                    {selectedSeller.settlementInfo?.accountHolderName || selectedSeller.fullName || 'Artisan Lead'}
                  </p>
                  <p>
                    <span className="text-[#717970]">Account / Wallet:</span>{' '}
                    <strong className="font-mono">{selectedSeller.settlementInfo?.accountNumber || selectedSeller.payoutAccount || 'N/A'}</strong>
                  </p>
                  {selectedSeller.settlementInfo?.bankName && (
                    <p className="text-[10px] text-[#717970]">
                      Bank: {selectedSeller.settlementInfo.bankName} {selectedSeller.settlementInfo.branchName ? `(${selectedSeller.settlementInfo.branchName})` : ''} {selectedSeller.settlementInfo.routingNumber ? `| Routing: ${selectedSeller.settlementInfo.routingNumber}` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 bg-white rounded-xl border border-[#c1c9be]/50 space-y-1">
                  <p className="font-bold text-[#002c11] text-xs">Courier & Dispatch Logistics</p>
                  <p>
                    <span className="text-[#717970]">Pickup Address:</span>{' '}
                    {selectedSeller.deliveryInfo?.pickupAddress || selectedSeller.businessAddress || selectedSeller.district}
                  </p>
                  <p>
                    <span className="text-[#717970]">Preferred Courier:</span>{' '}
                    <span className="font-bold text-[#002c11]">{selectedSeller.deliveryInfo?.preferredCourier || 'Steadfast Courier (64 Districts)'}</span>
                  </p>
                  <p>
                    <span className="text-[#717970]">NID / Trade Registration:</span>{' '}
                    <span className="font-mono font-bold text-[#002c11]">{selectedSeller.nidOrTradeLicense || selectedSeller.nidNumber || 'TL-2024-Verified'}</span>
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#c1c9be]/50 space-y-1">
                  <p className="font-bold text-[#002c11] text-xs">Eco Agreement & Credentials</p>
                  <p className="flex items-center gap-1.5 text-[#1b6d24] font-bold">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    {selectedSeller.termsAgreed !== false ? 'Signed SUNNO Artisan Agreement' : 'Agreement Pending'}
                  </p>
                  {selectedSeller.termsAgreedAt && (
                    <p className="text-[10px] text-[#717970]">Signed on {new Date(selectedSeller.termsAgreedAt).toLocaleDateString()}</p>
                  )}
                  {selectedSeller.categories && selectedSeller.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSeller.categories.map((c) => (
                        <span key={c} className="px-2 py-0.5 bg-[#f0eded] text-[#002c11] text-[10px] font-semibold rounded-md">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#f0eded] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {selectedSeller.status !== 'approved' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedSeller, 'approved')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                  >
                    ✓ Approve Seller Onboarding
                  </button>
                )}

                {selectedSeller.status === 'approved' && (
                  <button
                    onClick={() => setIsWarningModalOpen(true)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Issue Warning
                  </button>
                )}

                {selectedSeller.status !== 'suspended' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedSeller, 'suspended', 'Administrative hold for policy inspection')}
                    className="px-3.5 py-2 bg-orange-700 hover:bg-orange-800 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Suspend Store
                  </button>
                )}

                {selectedSeller.status !== 'banned' && (
                  <button
                    onClick={() => setIsBanModalOpen(true)}
                    className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Ban Permanently
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedSeller(null)}
                className="px-4 py-2 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-xl transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {isWarningModalOpen && selectedSeller && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4">
            <h3 className="text-lg font-bold text-[#002c11] font-heading">
              Issue Policy Warning
            </h3>
            <div>
              <label className="block text-xs font-bold text-[#717970] mb-1 uppercase">Warning Title</label>
              <input
                type="text"
                value={warningTitle}
                onChange={(e) => setWarningTitle(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#717970] mb-1 uppercase">Severity</label>
              <select
                value={warningSeverity}
                onChange={(e) => setWarningSeverity(e.target.value as any)}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 text-xs outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#717970] mb-1 uppercase">Warning Details</label>
              <textarea
                rows={3}
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 text-xs outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsWarningModalOpen(false)}
                className="px-4 py-2 bg-[#f0eded] text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueWarning}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl"
              >
                Issue Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {isBanModalOpen && selectedSeller && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <h3 className="text-lg font-bold text-red-700 font-heading">
              Permanently Ban Seller Store?
            </h3>
            <p className="text-xs text-[#414941]">
              This will permanently revoke all access for <strong>{selectedSeller.shopName || selectedSeller.storeName}</strong>, delist their products, and lock their treasury balance.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#717970] mb-1 uppercase">Mandatory Reason (Audit Log)</label>
              <textarea
                rows={3}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 text-xs outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBanModalOpen(false)}
                className="px-4 py-2 bg-[#f0eded] text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedSeller, 'banned', banReason)}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
