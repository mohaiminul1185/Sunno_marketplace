import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  AdminNavTab,
  Product,
  QueueSubmission,
  SellerProfile,
  Order,
  AuditLog,
  Category,
  Store,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { BRAND_LOGO } from '../data/mockData';
import { ALL_64_DISTRICTS, BANGLADESH_DIVISIONS } from '../data/bangladeshDistricts';
import {
  fetchAllProducts,
  fetchAllSellers,
  fetchAllOrders,
  fetchCategories,
  createCategoryInDb,
  updateCategoryInDb,
  deleteCategoryInDb,
  fetchAllStores,
  updateStoreInDb,
  approveProductEcoVerification,
  rejectProductEcoVerification,
  requestChangesProductEcoVerification,
  updateQueueSubmissionInDb,
  updateOrderStatus,
  updateOrderAdminNotes,
  fetchAuditLogsForEntity,
  seed60BangladeshProducts,
} from '../services/dbService';

// Admin Sub-Components
import { AdminDashboardTab } from './admin/AdminDashboardTab';
import { AdminCustomersTab } from './admin/AdminCustomersTab';
import { AdminSellersTab } from './admin/AdminSellersTab';
import { AdminStaffSecurityTab } from './admin/AdminStaffSecurityTab';
import { AdminCMSMarketingTab } from './admin/AdminCMSMarketingTab';
import { AdminSupportReviewsTab } from './admin/AdminSupportReviewsTab';
import { AdminSettingsReportsTab } from './admin/AdminSettingsReportsTab';
import { AdminFinanceView } from './AdminFinanceView';
import { AdminCourierManagement } from './AdminCourierManagement';
import { AdminCategoryManager } from './AdminCategoryManager';
import { AdminAnalyticsView } from './admin/AdminAnalyticsView';
import { AdminAlertCenter } from './admin/AdminAlertCenter';
import { AdminReturnsDisputesTab } from './AdminReturnsDisputesTab';
import { AdminSettlementsTab } from './admin/AdminSettlementsTab';
import { AdminProviderStatusDashboard } from './admin/AdminProviderStatusDashboard';
import { AdminDataDeduplicationView } from './admin/AdminDataDeduplicationView';
import { AdminProductsTab } from './admin/AdminProductsTab';
import { Order360Modal } from './Order360Modal';

interface AdminPanelViewProps {
  queueItems: QueueSubmission[];
  allProducts: Product[];
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
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  queueItems,
  allProducts,
  onUpdateQueueItem,
  onUpdateProductStatus,
  setActiveTab,
}) => {
  const { currentUser, userProfile, role, logout, hasAdminPermission } = useAuth();
  const [currentNav, setCurrentNav] = useState<AdminNavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Data State
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueSubmission | null>(
    queueItems[0] || null
  );
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [storesList, setStoresList] = useState<Store[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all');
  const [orderCourierFilter, setOrderCourierFilter] = useState('all');
  const [orderDistrictFilter, setOrderDistrictFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [order360Target, setOrder360Target] = useState<Order | null>(null);
  const [newAdminNote, setNewAdminNote] = useState('');
  const [orderAuditLogs, setOrderAuditLogs] = useState<AuditLog[]>([]);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Dhaka');
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);

  // Eco Verification Notes
  const [committeeNotes, setCommitteeNotes] = useState(
    'Approved by Senior Eco Committee. 100% verified material compliance.'
  );
  const [rejectionReason, setRejectionReason] = useState(
    'Synthetic resin or unverified origin detected.'
  );

  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  // Initial data loading for orders, stores, and categories
  useEffect(() => {
    fetchAllOrders().then(setOrdersList).catch((err) => console.error('Error fetching admin orders:', err));
    fetchAllStores().then(setStoresList).catch((err) => console.error('Error fetching admin stores:', err));
    fetchCategories().then(setCategoriesList).catch((err) => console.error('Error fetching admin categories:', err));
  }, []);

  // Fetch audit trail when order is selected for dossier inspection
  useEffect(() => {
    if (selectedOrder?.id) {
      fetchAuditLogsForEntity(selectedOrder.id).then(setOrderAuditLogs);
    } else {
      setOrderAuditLogs([]);
    }
  }, [selectedOrder?.id]);

  const handleAddAdminNote = async () => {
    if (!selectedOrder || !newAdminNote.trim()) return;
    setIsSavingNote(true);
    try {
      const updatedNotes = await updateOrderAdminNotes(
        selectedOrder.id,
        newAdminNote,
        { id: userProfile?.id || 'admin-01', name: userProfile?.displayName || 'Operations Admin' }
      );
      setSelectedOrder((prev) => (prev ? { ...prev, internalNotes: updatedNotes } : null));
      setNewAdminNote('');
      const logs = await fetchAuditLogsForEntity(selectedOrder.id);
      setOrderAuditLogs(logs);
      showToast('Authorized internal note appended and audit log recorded.');
    } catch (err) {
      console.error('Failed to add admin note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Eco Verification Handlers
  const handleApproveSubmission = async (sub: QueueSubmission) => {
    const prodId = sub.productId || sub.product.id;
    await approveProductEcoVerification(prodId, userProfile?.id || 'admin-01', committeeNotes);
    onUpdateQueueItem(sub.id, 'approved', committeeNotes);
    onUpdateProductStatus(prodId, 'eco_verified');
    showToast(`Approved "${sub.product.title}" as SUNNO Eco-Verified!`);
  };

  const handleFlagSubmission = async (sub: QueueSubmission) => {
    const prodId = sub.productId || sub.product.id;
    await updateQueueSubmissionInDb(sub.id, 'flagged', committeeNotes, userProfile?.id || 'admin-01');
    onUpdateQueueItem(sub.id, 'flagged', committeeNotes);
    onUpdateProductStatus(prodId, 'flagged');
    showToast(`Flagged "${sub.product.title}" for additional material audit.`);
  };

  const handleRejectSubmission = async (sub: QueueSubmission) => {
    const prodId = sub.productId || sub.product.id;
    await rejectProductEcoVerification(prodId, rejectionReason || 'Failed sustainable compliance criteria', userProfile?.id || 'admin-01');
    onUpdateQueueItem(sub.id, 'rejected', rejectionReason);
    onUpdateProductStatus(prodId, 'rejected');
    showToast(`Rejected "${sub.product.title}" compliance application.`);
  };

  const handleRequestChangesSubmission = async (sub: QueueSubmission) => {
    const prodId = sub.productId || sub.product.id;
    const feedback = committeeNotes || rejectionReason || 'Please clarify sustainable materials breakdown.';
    await requestChangesProductEcoVerification(prodId, feedback, userProfile?.id || 'admin-01');
    onUpdateQueueItem(sub.id, 'flagged', feedback);
    onUpdateProductStatus(prodId, 'changes_required' as any);
    showToast(`Returned "${sub.product.title}" to artisan with change requests.`);
  };

  // Order Status Handler
  const handleUpdateOrderStatus = async (orderId: string, status: any) => {
    await updateOrderStatus(orderId, status);
    setOrdersList((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status, orderStatus: status } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status, orderStatus: status });
    }
    showToast(`Order #${orderId.slice(-6)} marked as ${status.toUpperCase()}`);
  };

  const pendingEcoCount = queueItems.filter(
    (q) => q.status === 'pending' || q.status === 'under_review'
  ).length;

  // Filtered Products Catalog
  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.district || '').toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sellerName || '').toLowerCase().includes(productSearch.toLowerCase());
    
    const matchesCategory =
      productCategoryFilter === 'all' ||
      p.category.toLowerCase().includes(productCategoryFilter.toLowerCase()) ||
      (productCategoryFilter === 'Organic Food' && (p.category === 'Organic Food' || p.category === 'Food & Pantry')) ||
      (productCategoryFilter === 'Handmade Crafts' && (p.category === 'Handmade Crafts' || p.category === 'Home Decor' || p.category === 'Crafts')) ||
      (productCategoryFilter === 'Sustainable Fashion' && (p.category === 'Sustainable Fashion' || p.category === 'Fashion & Bags')) ||
      (productCategoryFilter === 'Eco-Home' && (p.category === 'Eco-Home' || p.category === 'Kitchen & Dining' || p.category === 'Garden'));

    if (!matchesCategory) return false;
    if (productFilter === 'eco_verified') return matchesSearch && p.status === 'eco_verified';
    if (productFilter === 'pending') return matchesSearch && (p.status === 'pending' || p.status === 'under_review');
    if (productFilter === 'flagged') return matchesSearch && p.status === 'flagged';
    return matchesSearch;
  });

  const userEmail = (userProfile?.email || currentUser?.email || '').toLowerCase();
  const isAuthorized =
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'moderator' ||
    userProfile?.role === 'admin' ||
    userProfile?.role === 'super_admin' ||
    userProfile?.role === 'moderator' ||
    userEmail === 'himel1176cse.uits@gmail.com' ||
    userEmail === 'admin@sunno.eco' ||
    userEmail === 'mohaiminul1185@gmail.com' ||
    userEmail === 'mdshantogazi2005@gmail.com' ||
    (userProfile?.permissions && userProfile.permissions.length > 0);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#07130a] text-[#e1e9e3] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-500/40 flex items-center justify-center text-red-400 mb-4">
          <span className="material-symbols-outlined text-3xl">lock</span>
        </div>
        <h2 className="text-2xl font-black mb-2 text-white">403 — Unauthorized Admin Access</h2>
        <p className="text-sm text-gray-400 max-w-md mb-6">
          Access to the SUNNO Platform Administration Control Panel is restricted to authorized personnel.
        </p>
        <button
          onClick={() => setActiveTab('storefront')}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07130a] text-[#e1e9e3] flex flex-col font-sans">
      {/* Toast */}
      {notificationToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#002c11] text-[#a0f399] border border-[#a0f399]/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Admin Top Header Bar */}
      <header className="h-16 bg-[#0c2013] border-b border-[#183a24] px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="lg:hidden p-2 text-[#96b8a0] hover:text-white rounded-lg hover:bg-[#153320] transition-colors"
            title="Toggle Admin Navigation"
            aria-label="Toggle Admin Navigation"
          >
            <span className="material-symbols-outlined text-[22px]">{isMobileSidebarOpen ? 'close' : 'menu'}</span>
          </button>
          <div className="flex items-center gap-2.5">
            <img src={BRAND_LOGO} alt="SUNNO Logo" className="w-8 h-8 object-contain" />
            <div className="leading-none">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white font-heading">
                  SUNNO Admin Console
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#053018] text-[#34d399] border border-[#10b981]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  LIVE BD PRODUCTION
                </span>
              </div>
              <p className="text-[10px] text-[#789d82] hidden sm:block mt-0.5">
                Authorized Personnel Only • Multi-District Artisan Platform & Eco Governance
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Public Store, Role Badge, Admin Name & Logout */}
        <div className="flex items-center gap-3">
          {/* Quick Return to Public Store */}
          <button
            onClick={() => {
              window.location.hash = '#home';
              setActiveTab('home');
            }}
            className="px-3 py-1.5 bg-[#173824] hover:bg-[#1f4b30] text-[#a0f399] border border-[#2d6842] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            title="Switch to public customer marketplace view"
          >
            <span className="material-symbols-outlined text-[16px]">storefront</span>
            <span className="hidden sm:inline">Return to Public Store</span>
          </button>

          {/* Real Role Badge */}
          <div className="hidden sm:flex items-center">
            {role === 'super_admin' ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
                SUPER ADMIN
              </span>
            ) : role === 'admin' ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                ADMIN
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-400/20 text-purple-300 border border-purple-400/40">
                MODERATOR
              </span>
            )}
          </div>

          {/* Admin User Profile Pill */}
          <div className="flex items-center gap-2 bg-[#142d1d] border border-[#20452d] rounded-xl px-2.5 py-1 text-xs">
            <div className="w-6 h-6 rounded-full bg-[#1b6d24] flex items-center justify-center text-white font-bold text-[10px]">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : userProfile?.fullName ? userProfile.fullName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-white font-semibold text-xs leading-none">
                {userProfile?.fullName || userProfile?.displayName || userProfile?.email?.split('@')[0] || 'Administrator'}
              </span>
              <span className="text-[10px] text-[#71967c] leading-none mt-0.5">
                {userProfile?.email || 'admin@sunno.eco'}
              </span>
            </div>
            <button
              onClick={() => {
                logout();
                window.location.hash = '#home';
                setActiveTab('home');
              }}
              title="Logout from Admin Console"
              className="text-[#88a992] hover:text-red-400 ml-1.5 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Left Sidebar + Dynamic Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Left Navigation Sidebar */}
        <aside
          className={`
            fixed inset-y-16 left-0 z-50 w-64 bg-[#0a180f] border-r border-[#153320] flex flex-col shrink-0 overflow-y-auto custom-scrollbar transition-transform duration-300
            lg:static lg:inset-auto lg:translate-x-0
            ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Group 1: Operations Core */}
          <div className="p-3 text-[10px] font-bold text-[#5c8067] uppercase tracking-wider">
            Platform Core
          </div>
          <nav className="space-y-0.5 px-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', badge: '' },
              { id: 'eco_verification', label: 'Eco Lab Audit', icon: 'verified', badge: pendingEcoCount > 0 ? `${pendingEcoCount}` : '' },
              { id: 'customers', label: 'Customers & Patrons', icon: 'group', badge: '' },
              { id: 'sellers', label: 'Artisans & Sellers', icon: 'storefront', badge: '' },
              { id: 'seller_verification', label: 'Onboarding Queue', icon: 'how_to_reg', badge: 'Review' },
              { id: 'products', label: 'Products Catalog', icon: 'inventory_2', badge: '' },
              { id: 'orders', label: 'Orders & Fulfillment', icon: 'shopping_bag', badge: '' },
              { id: 'returns', label: 'Returns & Disputes', icon: 'sync_problem', badge: '' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentNav(item.id as AdminNavTab);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentNav === item.id
                    ? 'bg-[#183f27] text-[#a0f399] font-bold shadow-xs'
                    : 'text-[#96b8a0] hover:bg-[#12281b] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.2 bg-[#a0f399] text-[#002204] text-[10px] font-extrabold rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Group 2: Financial & Courier Treasury */}
          <div className="p-3 pt-4 text-[10px] font-bold text-[#5c8067] uppercase tracking-wider">
            Analytics & Treasury
          </div>
          <nav className="space-y-0.5 px-2">
            {[
              { id: 'analytics', label: 'BI & Analytics Suite', icon: 'insights' },
              { id: 'alerts', label: 'Platform Alerts & Anomaly', icon: 'notifications_active' },
              { id: 'settlements', label: 'Artisan Settlements', icon: 'account_balance' },
              { id: 'withdrawals', label: 'Disbursements & Payouts', icon: 'payments' },
              { id: 'finance_ledger', label: 'Financial Ledger', icon: 'menu_book' },
              { id: 'seller_plans', label: 'Seller Plans & Rates', icon: 'receipt_long' },
              { id: 'courier', label: '64-District Logistics', icon: 'local_shipping' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentNav(item.id as AdminNavTab);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentNav === item.id
                    ? 'bg-[#183f27] text-[#a0f399] font-bold shadow-xs'
                    : 'text-[#96b8a0] hover:bg-[#12281b] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Group 3: CMS, Marketing & Support */}
          <div className="p-3 pt-4 text-[10px] font-bold text-[#5c8067] uppercase tracking-wider">
            Marketing & Support
          </div>
          <nav className="space-y-0.5 px-2">
            {[
              { id: 'cms', label: 'CMS & Policy Pages', icon: 'article' },
              { id: 'homepage', label: 'Homepage Banners', icon: 'add_photo_alternate' },
              { id: 'coupons', label: 'Promotions & Coupons', icon: 'loyalty' },
              { id: 'support', label: 'Support & Disputes', icon: 'support_agent' },
              { id: 'reviews', label: 'Review Moderation', icon: 'rate_review' },
              { id: 'categories', label: 'Categories Taxonomy', icon: 'category' },
              { id: 'districts', label: '64 Districts Map', icon: 'map' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentNav(item.id as AdminNavTab);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentNav === item.id
                    ? 'bg-[#183f27] text-[#a0f399] font-bold shadow-xs'
                    : 'text-[#96b8a0] hover:bg-[#12281b] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Group 4: Staff, Security & Platform Governance */}
          <div className="p-3 pt-4 text-[10px] font-bold text-[#5c8067] uppercase tracking-wider">
            Governance & Security
          </div>
          <nav className="space-y-0.5 px-2 pb-8">
            {[
              { id: 'staff', label: 'Staff Roles & RBAC', icon: 'badge' },
              { id: 'security', label: 'Active Sessions & IP', icon: 'security' },
              { id: 'audit_logs', label: 'Immutable Audit Logs', icon: 'history_edu' },
              { id: 'deduplication', label: 'Data Deduplication', icon: 'fingerprint' },
              { id: 'announcements', label: 'Broadcast Alerts', icon: 'campaign' },
              { id: 'notifications', label: 'Notification Templates', icon: 'notifications_active' },
              { id: 'reports', label: 'Reports & CSV Export', icon: 'summarize' },
              { id: 'settings', label: 'System Settings', icon: 'settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentNav(item.id as AdminNavTab);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentNav === item.id
                    ? 'bg-[#183f27] text-[#a0f399] font-bold shadow-xs'
                    : 'text-[#96b8a0] hover:bg-[#12281b] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Right Dynamic Content Workspace */}
        <main className="flex-1 overflow-y-auto bg-[#07130a] p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* VIEW 1: EXECUTIVE DASHBOARD */}
            {currentNav === 'dashboard' && (
              <AdminDashboardTab onNavigate={(tab) => setCurrentNav(tab)} />
            )}

            {/* VIEW 2: CUSTOMERS & PATRONS */}
            {(currentNav === 'customers' || currentNav === 'users') && (
              <AdminCustomersTab />
            )}

            {/* VIEW 3: SELLERS & ARTISANS */}
            {currentNav === 'sellers' && (
              <AdminSellersTab initialSubTab="all" />
            )}

            {/* VIEW 4: SELLER VERIFICATION QUEUE */}
            {currentNav === 'seller_verification' && (
              <AdminSellersTab initialSubTab="applications" />
            )}

            {/* VIEW 5: ECO VERIFICATION LAB AUDIT CENTER */}
            {currentNav === 'eco_verification' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0e2417] p-6 rounded-3xl border border-[#1b482b]">
                  <div>
                    <h2 className="text-xl font-bold text-white font-heading">
                      Eco-Verification Committee Lab
                    </h2>
                    <p className="text-xs text-[#80a48b] mt-0.5">
                      Verify chemical-free manufacturing, biodegradable raw fiber origin, and plastic-free packaging.
                    </p>
                  </div>
                  <span className="px-3 py-1.5 bg-[#143d22] text-[#a0f399] text-xs font-bold rounded-2xl border border-[#256339]">
                    {queueItems.length} Submissions In Queue
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left List */}
                  <div className="lg:col-span-5 space-y-3">
                    {queueItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedQueueItem(item)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          selectedQueueItem?.id === item.id
                            ? 'bg-[#153421] border-[#a0f399] shadow-md'
                            : 'bg-[#0f2417] border-[#1b4329] hover:border-[#2d6e44]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={item.product.images[0] || BRAND_LOGO}
                            alt={item.product.title}
                            className="w-14 h-14 rounded-xl object-cover border border-[#275635] shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-[#a0f399]">
                                {item.trackingId}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  item.status === 'approved'
                                    ? 'bg-[#184628] text-[#a0f399]'
                                    : item.status === 'flagged'
                                    ? 'bg-amber-950 text-amber-300'
                                    : item.status === 'rejected'
                                    ? 'bg-red-950 text-red-300'
                                    : 'bg-[#1a3825] text-[#8cb097]'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white truncate mt-1">
                              {item.product.title}
                            </h4>
                            <p className="text-[11px] text-[#7ea289] truncate">
                              {item.product.sellerName} • {item.product.district}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right Audit Detail */}
                  <div className="lg:col-span-7 bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 space-y-5">
                    {selectedQueueItem ? (
                      <>
                        <div className="flex items-start justify-between pb-4 border-b border-[#1a3f27]">
                          <div>
                            <span className="font-mono text-xs font-bold text-[#a0f399]">
                              AUDIT #{selectedQueueItem.trackingId}
                            </span>
                            <h3 className="text-lg font-bold text-white mt-1">
                              {selectedQueueItem.product.title}
                            </h3>
                            <p className="text-xs text-[#7ea289]">
                              Submitted by {selectedQueueItem.product.sellerName} from{' '}
                              {selectedQueueItem.product.district}, {selectedQueueItem.product.division}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-white">৳{selectedQueueItem.product.price}</span>
                            <p className="text-[10px] text-[#7ea289]">SKU: {selectedQueueItem.product.sku || 'SUN-ECO-100'}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#143d22] text-[#a0f399]">
                              {selectedQueueItem.product.category}
                            </span>
                          </div>
                        </div>

                        {/* Media Inspection: Gallery & Video */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider block">
                            Submitted Product Media ({selectedQueueItem.product.images?.length || 0} Photos)
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {(selectedQueueItem.product.images || []).map((imgUrl, idx) => (
                              <div key={idx} className="relative rounded-xl overflow-hidden aspect-square border border-[#1b4329] bg-[#122b1c]">
                                <img
                                  src={imgUrl}
                                  alt={`Audit view ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                {idx === 0 && (
                                  <span className="absolute top-1 left-1 bg-[#002c11] text-[#a0f399] text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow">
                                    Primary
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {selectedQueueItem.product.videoUrl && (
                            <div className="mt-2 bg-[#122b1c] p-3 rounded-2xl border border-[#1e462d]">
                              <span className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider block mb-1.5">
                                Product Showcase Video
                              </span>
                              <div className="aspect-video max-h-48 rounded-xl overflow-hidden bg-black">
                                <video
                                  src={selectedQueueItem.product.videoUrl}
                                  controls
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Eco Attributes */}
                        {selectedQueueItem.product.ecoTypes && selectedQueueItem.product.ecoTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedQueueItem.product.ecoTypes.map((et) => (
                              <span key={et} className="px-2.5 py-1 rounded-lg bg-[#143d22] text-[#a0f399] border border-[#256339] text-[10px] font-bold">
                                ✓ {et}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Materials Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="bg-[#122b1c] p-3.5 rounded-2xl border border-[#1e462d]">
                            <span className="text-[10px] font-bold text-[#7ca087] uppercase tracking-wider block mb-1">
                              Material Composition
                            </span>
                            <p className="text-white font-medium">
                              {selectedQueueItem.product.materialComposition || selectedQueueItem.product.materialsInfo || '100% Organic Bamboo & Plant Resin'}
                            </p>
                          </div>
                          <div className="bg-[#122b1c] p-3.5 rounded-2xl border border-[#1e462d]">
                            <span className="text-[10px] font-bold text-[#7ca087] uppercase tracking-wider block mb-1">
                              Origin & Artisan Proof
                            </span>
                            <p className="text-white font-medium">
                              {selectedQueueItem.product.originInfo || `${selectedQueueItem.product.district} District, ${selectedQueueItem.product.division} Division, Bangladesh`}
                            </p>
                          </div>
                        </div>

                        {/* Manufacturing Process */}
                        <div className="bg-[#122b1c] p-3.5 rounded-2xl border border-[#1e462d] text-xs">
                          <span className="text-[10px] font-bold text-[#7ca087] uppercase tracking-wider block mb-1">
                            Chemical-Free Manufacturing Declaration
                          </span>
                          <p className="text-white leading-relaxed">
                            {selectedQueueItem.product.manufacturingProcess || 'Hand-carved and naturally cured in sun-dried riverbeds with zero toxic adhesives.'}
                          </p>
                        </div>

                        {/* Review Inputs */}
                        <div className="space-y-3 bg-[#122b1c] p-4 rounded-2xl border border-[#1e462d]">
                          <div>
                            <label className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider block mb-1">
                              Inspection Approval Notes
                            </label>
                            <input
                              type="text"
                              value={committeeNotes}
                              onChange={(e) => setCommitteeNotes(e.target.value)}
                              placeholder="e.g. Certified organic handloom khadi origin confirmed."
                              className="w-full bg-[#183a24] border border-[#235334] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#a0f399]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                              Rejection / Changes Requested Reason
                            </label>
                            <input
                              type="text"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="e.g. Contains undisclosed synthetic binding agent."
                              className="w-full bg-[#183a24] border border-[#235334] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-400"
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                          <button
                            onClick={() => handleRejectSubmission(selectedQueueItem)}
                            className="px-4 py-2 bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Reject Application
                          </button>
                          <button
                            onClick={() => handleRequestChangesSubmission(selectedQueueItem)}
                            className="px-4 py-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Request Changes
                          </button>
                          <button
                            onClick={() => handleFlagSubmission(selectedQueueItem)}
                            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Flag for Lab Re-Test
                          </button>
                          <button
                            onClick={() => handleApproveSubmission(selectedQueueItem)}
                            className="px-5 py-2 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] text-xs font-extrabold rounded-xl shadow-lg transition-all cursor-pointer"
                          >
                            ✓ Approve Eco-Verified
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-xs text-[#7ea289]">
                        Select a submission from the queue on the left to review material audit specs.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 6: PRODUCTS CATALOG & MANAGEMENT */}
            {currentNav === 'products' && (
              <AdminProductsTab
                products={allProducts}
                currentUserEmail={userProfile?.email || currentUser?.email || 'admin@sunno.eco'}
                onRefresh={async () => {
                  try {
                    const fresh = await fetchAllProducts();
                    if (onUpdateProductStatus && fresh.length > 0) {
                      // refresh state
                    }
                  } catch (e) {
                    console.warn('Refresh products error:', e);
                  }
                }}
              />
            )}


            {/* VIEW 7: ORDERS & FULFILLMENT */}
            {currentNav === 'orders' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-[#0e2417] p-6 rounded-3xl border border-[#1b482b] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white font-heading">
                      Orders & Shipments Management
                    </h2>
                    <p className="text-xs text-[#80a48b] mt-0.5">
                      Supervise multi-artisan orders, 64-district delivery tracking, and payment statuses across Bangladesh.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      fetchAllOrders().then((ords) => {
                        setOrdersList(ords);
                        showToast('Orders refreshed from database.');
                      });
                    }}
                    className="px-4 py-2 bg-[#1b482b] hover:bg-[#25613a] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start md:self-auto transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    Refresh Data
                  </button>
                </div>

                {/* Orders KPI Cards */}
                {(() => {
                  const totalCount = ordersList.length;
                  const pendingCount = ordersList.filter((o) => (o.status || o.orderStatus) === 'pending').length;
                  const processingCount = ordersList.filter((o) => (o.status || o.orderStatus) === 'processing').length;
                  const shippedCount = ordersList.filter((o) => (o.status || o.orderStatus) === 'shipped').length;
                  const deliveredCount = ordersList.filter((o) => (o.status || o.orderStatus) === 'delivered').length;
                  const totalRevenue = ordersList.reduce((acc, o) => acc + (o.finalTotal || o.total || 0), 0);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4">
                        <span className="text-[11px] font-bold text-[#80a48b] uppercase tracking-wider">Total Orders</span>
                        <div className="text-2xl font-extrabold text-white font-mono mt-1">{totalCount}</div>
                        <span className="text-[10px] text-[#558064]">৳{totalRevenue.toLocaleString()} volume</span>
                      </div>
                      <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pending</span>
                        <div className="text-2xl font-extrabold text-amber-300 font-mono mt-1">{pendingCount}</div>
                        <span className="text-[10px] text-[#558064]">Awaiting verification</span>
                      </div>
                      <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4">
                        <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Processing</span>
                        <div className="text-2xl font-extrabold text-blue-300 font-mono mt-1">{processingCount}</div>
                        <span className="text-[10px] text-[#558064]">Packing & preparing</span>
                      </div>
                      <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4">
                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">In Transit</span>
                        <div className="text-2xl font-extrabold text-indigo-300 font-mono mt-1">{shippedCount}</div>
                        <span className="text-[10px] text-[#558064]">Courier dispatched</span>
                      </div>
                      <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Delivered</span>
                        <div className="text-2xl font-extrabold text-[#a0f399] font-mono mt-1">{deliveredCount}</div>
                        <span className="text-[10px] text-[#558064]">Fulfilled successfully</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Filters & Search Toolbar */}
                <div className="bg-[#0e2115] p-4 rounded-2xl border border-[#1b4128] flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-96">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#80a48b] text-[18px]">search</span>
                      <input
                        type="text"
                        placeholder="Search order #, customer, phone, seller, product, district, tracking..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="w-full bg-[#132c1d] border border-[#1b482b] text-white rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-[#a0f399]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="bg-[#132c1d] border border-[#1b482b] text-white rounded-xl px-3 py-2 text-xs outline-none font-bold"
                      >
                        <option value="all">All Order Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <select
                        value={orderPaymentFilter}
                        onChange={(e) => setOrderPaymentFilter(e.target.value)}
                        className="bg-[#132c1d] border border-[#1b482b] text-white rounded-xl px-3 py-2 text-xs outline-none font-bold"
                      >
                        <option value="all">All Payments</option>
                        <option value="paid">Paid</option>
                        <option value="pending_cod">Pending COD</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="refunded">Refunded</option>
                      </select>

                      <select
                        value={orderCourierFilter}
                        onChange={(e) => setOrderCourierFilter(e.target.value)}
                        className="bg-[#132c1d] border border-[#1b482b] text-white rounded-xl px-3 py-2 text-xs outline-none font-bold"
                      >
                        <option value="all">All Couriers</option>
                        <option value="steadfast">Steadfast</option>
                        <option value="redx">RedX</option>
                        <option value="pathao">Pathao</option>
                        <option value="ecourier">eCourier</option>
                        <option value="eco-express">Eco-Express</option>
                      </select>

                      <select
                        value={orderDistrictFilter}
                        onChange={(e) => setOrderDistrictFilter(e.target.value)}
                        className="bg-[#132c1d] border border-[#1b482b] text-white rounded-xl px-3 py-2 text-xs outline-none font-bold max-w-[160px]"
                      >
                        <option value="all">All Districts</option>
                        {ALL_64_DISTRICTS.map((d) => (
                          <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Filtered Orders Table */}
                {(() => {
                  const filtered = ordersList.filter((ord) => {
                    const status = (ord.status || ord.orderStatus || 'pending').toLowerCase();
                    const payStatus = (ord.paymentStatus || 'pending_cod').toLowerCase();
                    const courier = (ord.courierName || '').toLowerCase();
                    const district = (ord.shippingAddress?.district || '').toLowerCase();
                    const q = orderSearch.toLowerCase().trim();

                    const matchesStatus = orderStatusFilter === 'all' || status === orderStatusFilter;
                    const matchesPayment = orderPaymentFilter === 'all' || payStatus === orderPaymentFilter;
                    const matchesCourier = orderCourierFilter === 'all' || courier.includes(orderCourierFilter.toLowerCase());
                    const matchesDistrict = orderDistrictFilter === 'all' || district === orderDistrictFilter.toLowerCase();
                    const matchesSearch =
                      !q ||
                      ord.id.toLowerCase().includes(q) ||
                      (ord.shippingAddress?.fullName || '').toLowerCase().includes(q) ||
                      (ord.shippingAddress?.phone || '').includes(q) ||
                      (ord.shippingAddress?.district || '').toLowerCase().includes(q) ||
                      (ord.courierTrackingNumber || '').toLowerCase().includes(q) ||
                      (ord.items || []).some((it: any) =>
                        (it.title || '').toLowerCase().includes(q) ||
                        (it.sellerName || '').toLowerCase().includes(q) ||
                        (it.sellerId || '').toLowerCase().includes(q)
                      );

                    return matchesStatus && matchesPayment && matchesCourier && matchesDistrict && matchesSearch;
                  });

                  return (
                    <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#122b1c] border-b border-[#1b4128] text-[11px] font-bold uppercase text-[#7ca087]">
                              <th className="py-3.5 px-6">Order ID & Date</th>
                              <th className="py-3.5 px-4">Recipient</th>
                              <th className="py-3.5 px-4">District / Area</th>
                              <th className="py-3.5 px-4">Items</th>
                              <th className="py-3.5 px-4">Payment</th>
                              <th className="py-3.5 px-4">Courier & Tracking</th>
                              <th className="py-3.5 px-4">Total</th>
                              <th className="py-3.5 px-4">Status</th>
                              <th className="py-3.5 px-6 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#183a24]">
                            {filtered.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-10 text-center text-[#80a48b]">
                                  No orders matching the specified filter criteria.
                                </td>
                              </tr>
                            ) : (
                              filtered.map((ord) => {
                                const status = ord.status || ord.orderStatus || 'pending';
                                const payStatus = ord.paymentStatus || (ord.paymentMethod === 'cod' ? 'pending_cod' : 'paid');

                                return (
                                  <tr key={ord.id} className="hover:bg-[#132c1d] transition-colors">
                                    <td className="py-3.5 px-6">
                                      <div className="font-mono font-bold text-[#a0f399]">
                                        #{ord.id.slice(0, 10)}
                                      </div>
                                      <div className="text-[10px] text-[#80a48b]">
                                        {new Date(ord.createdAt || Date.now()).toLocaleDateString('en-GB')}
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <div className="text-white font-semibold">
                                        {ord.shippingAddress?.fullName || 'Conscious Buyer'}
                                      </div>
                                      <div className="text-[10px] text-[#80a48b]">
                                        {ord.shippingAddress?.phone || 'No phone'}
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-[#7ca087]">
                                      <div className="font-medium text-white/90">{ord.shippingAddress?.district || 'Dhaka'}</div>
                                      <div className="text-[10px] text-[#80a48b]">{ord.shippingAddress?.division || 'Bangladesh'}</div>
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-[#a0f399]">
                                      {ord.items?.length || 1} {ord.items?.length === 1 ? 'item' : 'items'}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                          payStatus === 'paid'
                                            ? 'bg-emerald-950 text-[#a0f399] border-emerald-800'
                                            : payStatus === 'pending_cod'
                                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                                            : 'bg-red-950 text-red-300 border-red-800'
                                        }`}
                                      >
                                        {payStatus.replace('_', ' ')}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      {ord.courierTrackingNumber ? (
                                        <div>
                                          <span className="font-mono text-xs text-[#a0f399] font-bold">
                                            {ord.courierTrackingNumber}
                                          </span>
                                          <div className="text-[10px] text-[#80a48b]">{ord.courierName || 'Partner Courier'}</div>
                                        </div>
                                      ) : (
                                        <span className="text-[11px] text-[#80a48b] italic">Unassigned</span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                                      ৳{(ord.finalTotal || ord.total || 0).toLocaleString()}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                          status === 'delivered'
                                            ? 'bg-emerald-950 text-[#a0f399] border-emerald-800'
                                            : status === 'shipped'
                                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                                            : status === 'processing'
                                            ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                            : status === 'cancelled'
                                            ? 'bg-red-950 text-red-300 border-red-800'
                                            : 'bg-amber-950 text-amber-300 border-amber-800'
                                        }`}
                                      >
                                        {status}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-6 text-right space-x-2">
                                      <button
                                        onClick={() => setSelectedOrder(ord)}
                                        className="px-3 py-1.5 bg-[#183a24] hover:bg-[#225032] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                                      >
                                        Inspect
                                      </button>
                                      <button
                                        onClick={() => setOrder360Target(ord)}
                                        className="px-3 py-1.5 bg-[#a0f399] hover:bg-[#86e27e] text-[#002c11] font-bold rounded-xl text-xs transition-all shadow-sm inline-flex items-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-[13px]">visibility</span>
                                        <span>Order 360</span>
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
                  );
                })()}
              </div>
            )}

            {/* VIEW 8: BI & ANALYTICS SUITE */}
            {currentNav === 'analytics' && (
              <AdminAnalyticsView onNavigateTab={(tab) => setCurrentNav(tab)} />
            )}

            {/* VIEW 8.1: PLATFORM ALERTS & ANOMALY CENTER */}
            {currentNav === 'alerts' && (
              <AdminAlertCenter onNavigateTab={(tab) => setCurrentNav(tab)} />
            )}

            {/* VIEW 8.2: ARTISAN SETTLEMENTS & ESCROW */}
            {currentNav === 'settlements' && (
              <AdminSettlementsTab />
            )}

            {/* VIEW 8.3: FINANCE, WITHDRAWALS & LEDGER */}
            {(currentNav === 'withdrawals' ||
              currentNav === 'finance_ledger' ||
              currentNav === 'seller_plans') && (
              <AdminFinanceView />
            )}

            {/* VIEW 9: 64-DISTRICT LOGISTICS & COURIER */}
            {currentNav === 'courier' && <AdminCourierManagement />}

            {/* VIEW 9.5: PAYMENT GATEWAYS & PROVIDER STATUS */}
            {currentNav === 'payments' && <AdminProviderStatusDashboard />}

            {/* VIEW 9.7: RETURNS, REFUNDS & DISPUTES (PHASE 17) */}
            {(currentNav === 'returns' || currentNav === 'refunds' || currentNav === 'disputes') && (
              <AdminReturnsDisputesTab
                actor={{
                  id: userProfile?.id || 'admin-01',
                  name: userProfile?.fullName || 'SUNNO Super Admin',
                  email: userProfile?.email || 'admin@sunno.eco',
                  role: 'admin',
                }}
              />
            )}

            {/* VIEW 10: CMS PAGES, HOMEPAGE BANNERS & COUPONS */}
            {(currentNav === 'cms' || currentNav === 'homepage' || currentNav === 'coupons') && (
              <AdminCMSMarketingTab initialSubView={currentNav === 'cms' ? 'cms' : currentNav === 'homepage' ? 'banners' : 'coupons'} />
            )}

            {/* VIEW 11: SUPPORT & REVIEWS */}
            {(currentNav === 'support' || currentNav === 'messages' || currentNav === 'reviews') && (
              <AdminSupportReviewsTab initialSubView={currentNav === 'reviews' ? 'reviews' : 'support'} />
            )}

            {/* VIEW 12: STAFF, SECURITY & AUDIT LOGS */}
            {(currentNav === 'staff' || currentNav === 'security' || currentNav === 'audit_logs') && (
              <AdminStaffSecurityTab initialSubView={currentNav === 'staff' ? 'staff' : currentNav === 'security' ? 'security' : 'audit_logs'} />
            )}

            {/* VIEW 13: SETTINGS, ANNOUNCEMENTS, NOTIFICATIONS & REPORTS */}
            {(currentNav === 'settings' ||
              currentNav === 'announcements' ||
              currentNav === 'notifications' ||
              currentNav === 'reports') && (
              <AdminSettingsReportsTab initialSubView={currentNav === 'settings' ? 'settings' : currentNav === 'announcements' ? 'announcements' : currentNav === 'notifications' ? 'notifications' : 'exports'} />
            )}

            {/* VIEW 14: CATEGORIES TAXONOMY */}
            {currentNav === 'categories' && (
              <AdminCategoryManager
                allProducts={allProducts}
                onShowToast={showToast}
              />
            )}

            {/* VIEW 14.5: DATA DEDUPLICATION & INTEGRITY */}
            {currentNav === 'deduplication' && <AdminDataDeduplicationView />}

            {/* VIEW 15: 64 DISTRICTS HERITAGE MAP */}
            {currentNav === 'districts' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-[#0e2417] p-6 rounded-3xl border border-[#1b482b]">
                  <h2 className="text-xl font-bold text-white font-heading">
                    64-District Artisan Heritage Network
                  </h2>
                  <p className="text-xs text-[#80a48b] mt-0.5">
                    Bangladesh division hubs, specialized material lineages, and regional logistics nodes.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {BANGLADESH_DIVISIONS.map((div) => {
                    const divDistricts = ALL_64_DISTRICTS.filter((d) => d.division.toLowerCase() === div.name.toLowerCase());
                    return (
                      <div
                        key={div.id}
                        className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-white font-heading">{div.name} Division</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#143d22] text-[#a0f399]">
                            {divDistricts.length} Districts
                          </span>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                          {divDistricts.map((d) => (
                            <div
                              key={d.id}
                              className="text-xs p-2 rounded-xl bg-[#122b1c] flex items-center justify-between text-[#80a48b]"
                            >
                              <span>{d.name}</span>
                              <span className="text-[10px] text-[#a0f399] font-mono font-bold">
                                {d.specialty}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Comprehensive Order Detail Dossier Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e2417] text-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#1b482b] max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b482b]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold font-heading text-white">
                    Order Dossier #{selectedOrder.id.slice(0, 12)}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      (selectedOrder.status || selectedOrder.orderStatus) === 'delivered'
                        ? 'bg-emerald-950 text-[#a0f399] border-emerald-800'
                        : 'bg-blue-950 text-blue-300 border-blue-800'
                    }`}
                  >
                    {selectedOrder.status || selectedOrder.orderStatus || 'PENDING'}
                  </span>
                </div>
                <p className="text-xs text-[#80a48b] mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-[#80a48b] hover:text-white rounded-full hover:bg-[#132c1d] transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Customer & Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#132c1d] p-4 rounded-2xl border border-[#1b482b] text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider block mb-1">
                  Recipient Information
                </span>
                <p className="font-bold text-white">{selectedOrder.shippingAddress?.fullName || 'Conscious Buyer'}</p>
                <p className="text-[#80a48b]">{selectedOrder.shippingAddress?.phone || 'No phone'}</p>
                <p className="text-[#80a48b]">{selectedOrder.shippingAddress?.email || 'customer@sunno.eco'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider block mb-1">
                  Delivery Destination
                </span>
                <p className="text-white">{selectedOrder.shippingAddress?.address || 'Street address'}</p>
                <p className="text-[#80a48b]">
                  {selectedOrder.shippingAddress?.district || 'District'}, {selectedOrder.shippingAddress?.division || 'Division'}
                </p>
                <p className="text-[#80a48b]">Postal Code: {selectedOrder.shippingAddress?.postalCode || '1200'}</p>
              </div>
            </div>

            {/* Payment & Courier Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#132c1d] rounded-xl border border-[#1b482b]">
                <span className="text-[10px] text-[#80a48b] block font-bold uppercase">Payment Method</span>
                <span className="font-bold text-white uppercase">{selectedOrder.paymentMethod || 'COD'}</span>
              </div>
              <div className="p-3 bg-[#132c1d] rounded-xl border border-[#1b482b]">
                <span className="text-[10px] text-[#80a48b] block font-bold uppercase">Payment Status</span>
                <span className="font-bold text-[#a0f399] uppercase">
                  {(selectedOrder.paymentStatus || (selectedOrder.paymentMethod === 'cod' ? 'pending_cod' : 'paid')).replace('_', ' ')}
                </span>
              </div>
              <div className="p-3 bg-[#132c1d] rounded-xl border border-[#1b482b]">
                <span className="text-[10px] text-[#80a48b] block font-bold uppercase">Courier Service</span>
                <span className="font-bold text-white">{selectedOrder.courierName || 'RedX / Steadfast'}</span>
              </div>
              <div className="p-3 bg-[#132c1d] rounded-xl border border-[#1b482b]">
                <span className="text-[10px] text-[#80a48b] block font-bold uppercase">Tracking Code</span>
                <span className="font-mono font-bold text-[#a0f399]">
                  {selectedOrder.courierTrackingNumber || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Order Timeline (Full 9-Stage Trace) */}
            <div className="bg-[#132c1d] p-4 rounded-2xl border border-[#1b482b] space-y-3">
              <span className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider block">
                Order Operational Lifecycle Timeline
              </span>
              {(() => {
                const currentStatus = (selectedOrder.status || selectedOrder.orderStatus || 'pending').toLowerCase();
                const payStatus = (selectedOrder.paymentStatus || (selectedOrder.paymentMethod === 'cod' ? 'pending_cod' : 'paid')).toLowerCase();

                const isPlaced = true;
                const isPaid = payStatus === 'paid' || payStatus === 'pending_cod';
                const isSellerNotified = true;
                const isProcessing = ['processing', 'shipped', 'delivered'].includes(currentStatus);
                const isPacked = ['processing', 'shipped', 'delivered'].includes(currentStatus);
                const isPickedUp = ['shipped', 'delivered'].includes(currentStatus);
                const isInTransit = ['shipped', 'delivered'].includes(currentStatus);
                const isOutForDelivery = currentStatus === 'delivered';
                const isDelivered = currentStatus === 'delivered';

                const timelineSteps = [
                  { label: 'Order Placed', active: isPlaced, note: new Date(selectedOrder.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                  { label: 'Payment Confirmed', active: isPaid, note: payStatus.replace('_', ' ') },
                  { label: 'Artisan Notified', active: isSellerNotified, note: 'Dispatch dispatched' },
                  { label: 'Processing', active: isProcessing, note: 'Eco prep' },
                  { label: 'Packed', active: isPacked, note: 'Plastic-free' },
                  { label: 'Courier Picked Up', active: isPickedUp, note: selectedOrder.courierName || 'Logistics' },
                  { label: 'In Transit', active: isInTransit, note: selectedOrder.courierTrackingNumber ? `Tracking #${selectedOrder.courierTrackingNumber.slice(0, 8)}` : 'On Route' },
                  { label: 'Out for Delivery', active: isOutForDelivery, note: 'Rider assigned' },
                  { label: 'Delivered', active: isDelivered, note: isDelivered ? 'Fulfilled' : 'Pending' },
                ];

                return (
                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 text-center">
                    {timelineSteps.map((step, sIdx) => (
                      <div
                        key={sIdx}
                        className={`p-2 rounded-xl text-[10px] border flex flex-col items-center justify-between ${
                          step.active
                            ? 'bg-[#183d26] border-[#226339] text-white'
                            : 'bg-[#102418] border-[#163321] text-[#567460]'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[14px] mb-1 ${step.active ? 'text-[#a0f399]' : 'text-[#415a49]'}`}>
                          {step.active ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <div className="font-bold leading-tight line-clamp-1">{step.label}</div>
                        <div className="text-[9px] opacity-75 mt-0.5 font-mono">{step.note}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#a0f399] uppercase tracking-wider block">
                Order Items & Artisan Attribution ({selectedOrder.items?.length || 0})
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedOrder.items?.map((it, idx) => (
                  <div key={idx} className="p-3 bg-[#122b1c] rounded-2xl flex items-center justify-between text-xs border border-[#1b482b]">
                    <div className="flex items-center gap-3">
                      {it.image && (
                        <img
                          src={it.image}
                          alt={it.title}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-cover rounded-xl border border-[#1b482b]"
                        />
                      )}
                      <div>
                        <div className="font-bold text-white">{it.title}</div>
                        <div className="text-[10px] text-[#80a48b]">
                          Qty: {it.quantity} • Unit: ৳{it.price} • Artisan: {it.sellerName || 'Verified Artisan'} (ID: {it.sellerId || 'artisan'})
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-white">৳{(it.price * it.quantity).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Authorized Admin Internal Notes */}
            <div className="bg-[#132c1d] p-4 rounded-2xl border border-[#1b482b] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider">
                  Authorized Internal Admin Notes ({selectedOrder.internalNotes?.length || 0})
                </span>
                <span className="text-[9px] text-[#80a48b]">Confidential • Staff Only</span>
              </div>

              {selectedOrder.internalNotes && selectedOrder.internalNotes.length > 0 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {selectedOrder.internalNotes.map((note, nIdx) => (
                    <div key={nIdx} className="p-2 bg-[#0e2417] rounded-xl border border-[#1b482b]/60 text-[#a0f399] font-mono text-[10px]">
                      {note}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-[#80a48b] italic">No internal administrative notes recorded for this order dossier.</p>
              )}

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Append internal administrative note..."
                  value={newAdminNote}
                  onChange={(e) => setNewAdminNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddAdminNote(); }}
                  className="flex-1 bg-[#0e2417] border border-[#1b482b] text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#a0f399]"
                />
                <button
                  onClick={handleAddAdminNote}
                  disabled={isSavingNote || !newAdminNote.trim()}
                  className="px-3 py-1.5 bg-[#1b6d24] hover:bg-[#22832c] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all"
                >
                  {isSavingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </div>

            {/* Order Audit History Trail */}
            {orderAuditLogs.length > 0 && (
              <div className="bg-[#132c1d] p-4 rounded-2xl border border-[#1b482b] space-y-2 text-xs">
                <span className="text-[10px] font-bold text-[#a0f399] uppercase tracking-wider block">
                  Immutable Audit History Trail ({orderAuditLogs.length})
                </span>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 text-[10px] font-mono">
                  {orderAuditLogs.map((log) => (
                    <div key={log.id} className="p-2 bg-[#0e2417] rounded-xl border border-[#1b482b]/60 flex items-center justify-between text-[#80a48b]">
                      <div>
                        <span className="text-white font-bold">{log.action}</span> by <span className="text-[#a0f399]">{log.userName || log.userId}</span>: {log.details}
                      </div>
                      <div className="text-[9px] text-[#558064] shrink-0 ml-2">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Change Buttons & Totals */}
            <div className="pt-4 border-t border-[#1b482b] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'processing')}
                  className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Mark Processing
                </button>
                <button
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'shipped')}
                  className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Mark Shipped
                </button>
                <button
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'delivered')}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Mark Delivered
                </button>
                <button
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'cancelled')}
                  className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Cancel Order
                </button>
                <button
                  onClick={() => {
                    setOrder360Target(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  className="px-3.5 py-1.5 bg-[#a0f399] hover:bg-[#86e27e] text-[#002c11] text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">stars</span>
                  <span>Launch Order 360</span>
                </button>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#80a48b] block">Total Order Value</span>
                <strong className="text-xl font-mono text-[#a0f399]">
                  ৳{(selectedOrder.finalTotal || selectedOrder.total || 0).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUNNO ORDER 360 MODAL (ADMIN VIEW) */}
      {order360Target && (
        <Order360Modal
          order={order360Target}
          onClose={() => setOrder360Target(null)}
          viewerRole="admin"
          onUpdateStatus={async (newStatus) => {
            await handleUpdateOrderStatus(order360Target.id, newStatus as any);
            setOrder360Target((prev) => (prev ? { ...prev, status: newStatus, orderStatus: newStatus } : null));
          }}
        />
      )}
    </div>
  );
};
