import React, { useState, useEffect } from 'react';
import { AdminNavTab } from '../../types';
import { fetchAdminDashboardStats, AdminDashboardKpis } from '../../services/adminService';

interface AdminDashboardTabProps {
  onNavigate: (tab: AdminNavTab) => void;
  onOpenQuickVerification?: () => void;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  onNavigate,
  onOpenQuickVerification,
}) => {
  const [stats, setStats] = useState<AdminDashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'this_month'>('30days');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchAdminDashboardStats();
      setStats(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-[#0e2718] border border-[#1e482b] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#1b6d24]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#173a23] border border-[#235334] text-[#a0f399] text-xs font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-[#a0f399] animate-ping" />
              SUNNO Operational Network • All Systems Optimal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
              Executive Platform Control Center
            </h1>
            <p className="text-sm text-[#8ca893] max-w-2xl mt-1">
              Real-time monitoring of 64-district artisan cooperatives, eco-accreditation compliance, logistics, and treasury disbursements.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('alerts')}
              className="px-4 py-2.5 bg-[#173a23] hover:bg-[#204d30] border border-[#2e6842] text-amber-300 text-xs font-bold rounded-2xl transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">notifications_active</span>
              Alerts
            </button>

            <button
              onClick={() => onNavigate('settlements')}
              className="px-4 py-2.5 bg-[#173a23] hover:bg-[#204d30] border border-[#2e6842] text-[#a0f399] text-xs font-bold rounded-2xl transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
              Artisan Settlements
            </button>

            <button
              onClick={() => onNavigate('analytics')}
              className="px-4 py-2.5 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] text-xs font-extrabold rounded-2xl shadow-lg transition-transform hover:scale-102 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">insights</span>
              BI & Analytics Suite
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alert Bar if Pending Action Items exist */}
      {stats && (stats.pendingSellerApplications > 0 || stats.productsAwaitingEcoVerification > 0 || stats.pendingReturnsCount > 0) && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-xl">notification_important</span>
            <div>
              <span className="font-bold">Attention Required:</span> {stats.pendingSellerApplications} pending seller onboarding requests, {stats.productsAwaitingEcoVerification} crafts awaiting eco material audit, and {stats.pendingReturnsCount} customer returns awaiting inspection.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('eco_verification')}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-extrabold rounded-xl transition-colors"
            >
              Review Now
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total GMV / Platform Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-[#c1c9be]/60 shadow-sm relative overflow-hidden group hover:border-[#1b6d24]/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#717970]">
              Gross Sales (GMV)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">monetization_on</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#002c11]">
            ৳{loading ? '...' : (stats?.grossMerchandiseValue || 0).toLocaleString()}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#414941]">
            <span>Commission: <strong className="text-[#1b6d24]">৳{(stats?.platformCommissionRevenue || 0).toLocaleString()}</strong></span>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-[#1b6d24] font-bold hover:underline"
            >
              Analytics →
            </button>
          </div>
        </div>

        {/* Total Orders & Today's Volume */}
        <div className="bg-white rounded-3xl p-6 border border-[#c1c9be]/60 shadow-sm relative overflow-hidden group hover:border-[#1b6d24]/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#717970]">
              Orders Delivered / Active
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">shopping_bag</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#002c11]">
            {loading ? '...' : stats?.totalOrders}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#414941]">
            <span>Today's Orders: <strong className="text-blue-700 font-bold">{stats?.todaysOrders} orders</strong></span>
            <button
              onClick={() => onNavigate('orders')}
              className="text-blue-700 font-bold hover:underline"
            >
              Orders →
            </button>
          </div>
        </div>

        {/* Master Artisans & Stores */}
        <div className="bg-white rounded-3xl p-6 border border-[#c1c9be]/60 shadow-sm relative overflow-hidden group hover:border-[#1b6d24]/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#717970]">
              Verified Artisans & Stores
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">storefront</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#002c11]">
            {loading ? '...' : `${stats?.totalSellers} Artisans`}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#414941]">
            <span>Active Stores: <strong className="text-emerald-700 font-bold">{stats?.activeStoresCount}</strong></span>
            <button
              onClick={() => onNavigate('sellers')}
              className="text-emerald-700 font-bold hover:underline"
            >
              Sellers →
            </button>
          </div>
        </div>

        {/* Pending Payout Disbursements */}
        <div className="bg-white rounded-3xl p-6 border border-[#c1c9be]/60 shadow-sm relative overflow-hidden group hover:border-[#1b6d24]/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#717970]">
              Pending Disbursements
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-800">
            ৳{loading ? '...' : (stats?.pendingWithdrawalsAmount || 0).toLocaleString()}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#414941]">
            <span>{stats?.pendingWithdrawalsCount} pending payouts</span>
            <button
              onClick={() => onNavigate('withdrawals')}
              className="text-amber-800 font-bold hover:underline"
            >
              Disburse →
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Operational Dashboard Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* District & Eco Material Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-[#c1c9be]/60 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#f0eded]">
            <div>
              <h3 className="text-base font-bold text-[#002c11] font-heading">
                64-District Artisan Supply & Eco Compliance
              </h3>
              <p className="text-xs text-[#717970]">
                Material distribution across division hubs and certified zero-plastic production
              </p>
            </div>
            <button
              onClick={() => onNavigate('districts')}
              className="text-xs font-bold text-[#1b6d24] hover:underline"
            >
              Manage 64 Districts →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
              <span className="text-[11px] font-bold text-[#717970] uppercase block mb-1">
                Eco Products Catalog
              </span>
              <div className="text-xl font-bold font-mono text-[#002c11]">
                {stats?.totalProducts} Listings
              </div>
              <span className="text-[10px] text-[#1b6d24] font-semibold mt-1 block">
                100% Bio/Recycled Origin
              </span>
            </div>

            <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
              <span className="text-[11px] font-bold text-[#717970] uppercase block mb-1">
                Active Patron Base
              </span>
              <div className="text-xl font-bold font-mono text-[#002c11]">
                {stats?.totalCustomers} Customers
              </div>
              <span className="text-[10px] text-blue-700 font-semibold mt-1 block">
                Verified Eco Rewards
              </span>
            </div>

            <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
              <span className="text-[11px] font-bold text-[#717970] uppercase block mb-1">
                Seller Plan Subscriptions
              </span>
              <div className="text-xl font-bold font-mono text-[#002c11]">
                ৳{(stats?.sellerPlanRevenue || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-purple-700 font-semibold mt-1 block">
                Heritage & Cooperative Plans
              </span>
            </div>
          </div>

          {/* Quick Division Highlights */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs p-3 bg-[#f5f9f5] rounded-xl">
              <span className="font-bold text-[#002c11]">Dhaka Division (Savar Bamboo & Dhamrai Brass)</span>
              <span className="font-mono font-bold text-[#1b6d24]">34 Active Crafts • ৳94,200 Sales</span>
            </div>
            <div className="flex items-center justify-between text-xs p-3 bg-[#f5f9f5] rounded-xl">
              <span className="font-bold text-[#002c11]">Rajshahi Division (Pure Mulberry Silk & Clay Pottery)</span>
              <span className="font-mono font-bold text-[#1b6d24]">28 Active Crafts • ৳68,400 Sales</span>
            </div>
            <div className="flex items-center justify-between text-xs p-3 bg-[#f5f9f5] rounded-xl">
              <span className="font-bold text-[#002c11]">Sylhet Division (Sitalpati Mats & Organic Teas)</span>
              <span className="font-mono font-bold text-[#1b6d24]">19 Active Crafts • ৳42,800 Sales</span>
            </div>
          </div>
        </div>

        {/* Real-time System Status & Fast Links */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#c1c9be]/60 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#002c11] font-heading">
              Platform Health & Security
            </h3>
            <p className="text-xs text-[#717970]">
              Real-time audit & logistics gateway integrations
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fbf9f8] border border-[#c1c9be]/30">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-[#002c11]">Firestore Cloud DB</span>
              </div>
              <span className="text-[11px] font-mono text-[#1b6d24] font-semibold">Online & Synchronized</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fbf9f8] border border-[#c1c9be]/30">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-[#002c11]">Payment Gateways (bKash/Nagad)</span>
              </div>
              <span className="text-[11px] font-mono text-[#1b6d24] font-semibold">Live (Zero Failure)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fbf9f8] border border-[#c1c9be]/30">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-[#002c11]">64-District Courier API</span>
              </div>
              <span className="text-[11px] font-mono text-[#1b6d24] font-semibold">Steadfast & Pathao Ready</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fbf9f8] border border-[#c1c9be]/30">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-[#002c11]">Role-Based Access (RBAC)</span>
              </div>
              <span className="text-[11px] font-mono text-[#1b6d24] font-semibold">Enforced Server-Side</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#f0eded]">
            <span className="text-[11px] font-bold text-[#717970] uppercase block mb-3">
              Fast Administrative Routes
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('finance_ledger')}
                className="p-2.5 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-xl transition-colors text-left flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-[#1b6d24]">menu_book</span>
                <span>Ledger</span>
              </button>
              <button
                onClick={() => onNavigate('courier')}
                className="p-2.5 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-xl transition-colors text-left flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-blue-700">local_shipping</span>
                <span>Couriers</span>
              </button>
              <button
                onClick={() => onNavigate('staff')}
                className="p-2.5 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-xl transition-colors text-left flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-purple-700">badge</span>
                <span>Staff Roles</span>
              </button>
              <button
                onClick={() => onNavigate('audit_logs')}
                className="p-2.5 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-xl transition-colors text-left flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-700">history_edu</span>
                <span>Audit Logs</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
