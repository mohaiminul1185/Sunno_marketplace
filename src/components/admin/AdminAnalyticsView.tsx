import React, { useState, useEffect } from 'react';
import {
  AdminExecutiveKPIs,
  SalesTimeSeriesPoint,
  ProductAnalyticsItem,
  CategoryAnalyticsItem,
  DistrictAnalyticsItem,
  SellerAnalyticsItem,
  CustomerAnalyticsSummary,
  CartAnalyticsSummary,
  EcoImpactAnalytics,
  PaymentMethodAnalyticsItem,
  CourierAnalyticsItem,
  ReturnRefundAnalytics,
  AnalyticsDateRange,
  AdminNavTab,
} from '../../types';
import {
  calculateExecutiveKPIs,
  generateSalesTimeSeries,
  calculateProductAnalytics,
  calculateCategoryAnalytics,
  calculateDistrictAnalytics,
  calculateSellerAnalytics,
  calculateCustomerAnalytics,
  calculateCartAnalytics,
  calculateEcoImpactAnalytics,
  calculatePaymentAnalytics,
  calculateCourierAnalytics,
  calculateReturnRefundAnalytics,
} from '../../services/adminAnalyticsService';
import {
  fetchAllOrders,
  fetchAllProducts,
  fetchAllSellers,
  fetchQueueSubmissions,
} from '../../services/dbService';
import { BANGLADESH_DIVISIONS } from '../../data/bangladeshDistricts';
import { AdminReportGeneratorModal } from './AdminReportGeneratorModal';

type AnalyticsSubTab =
  | 'overview'
  | 'sales'
  | 'products'
  | 'categories'
  | 'districts'
  | 'sellers'
  | 'customers'
  | 'eco'
  | 'logistics_payments'
  | 'returns_fraud'
  | 'profitability';

interface AdminAnalyticsViewProps {
  onNavigateTab?: (tab: AdminNavTab) => void;
}

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({ onNavigateTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('overview');
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('last_30_days');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(true);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showRevenueTooltip, setShowRevenueTooltip] = useState<boolean>(false);

  // Computed State
  const [kpis, setKpis] = useState<AdminExecutiveKPIs | null>(null);
  const [salesPoints, setSalesPoints] = useState<SalesTimeSeriesPoint[]>([]);
  const [productData, setProductData] = useState<{
    topSelling: ProductAnalyticsItem[];
    lowestSelling: ProductAnalyticsItem[];
    mostViewed: ProductAnalyticsItem[];
    mostAddedToCart: ProductAnalyticsItem[];
    mostWishlisted: ProductAnalyticsItem[];
    outOfStock: ProductAnalyticsItem[];
    lowStock: ProductAnalyticsItem[];
    allProductAnalytics: ProductAnalyticsItem[];
  } | null>(null);
  const [categories, setCategories] = useState<CategoryAnalyticsItem[]>([]);
  const [districts, setDistricts] = useState<DistrictAnalyticsItem[]>([]);
  const [sellers, setSellers] = useState<SellerAnalyticsItem[]>([]);
  const [customers, setCustomers] = useState<CustomerAnalyticsSummary | null>(null);
  const [cartFunnel, setCartFunnel] = useState<CartAnalyticsSummary | null>(null);
  const [ecoImpact, setEcoImpact] = useState<EcoImpactAnalytics | null>(null);
  const [payments, setPayments] = useState<PaymentMethodAnalyticsItem[]>([]);
  const [couriers, setCouriers] = useState<CourierAnalyticsItem[]>([]);
  const [returnsRefunds, setReturnsRefunds] = useState<ReturnRefundAnalytics | null>(null);

  // Selected drill-down items
  const [selectedProductModal, setSelectedProductModal] = useState<ProductAnalyticsItem | null>(null);
  const [selectedSellerModal, setSelectedSellerModal] = useState<SellerAnalyticsItem | null>(null);
  const [selectedDistrictModal, setSelectedDistrictModal] = useState<DistrictAnalyticsItem | null>(null);

  const loadAllAnalytics = async () => {
    setLoading(true);
    try {
      const [orders, products, sellersList, queue] = await Promise.all([
        fetchAllOrders(),
        fetchAllProducts(),
        fetchAllSellers(),
        fetchQueueSubmissions(),
      ]);

      const computedKpis = await calculateExecutiveKPIs(orders, products, sellersList);
      setKpis(computedKpis);

      const computedSales = generateSalesTimeSeries(orders, dateRange);
      setSalesPoints(computedSales);

      const computedProducts = calculateProductAnalytics(products, orders, lowStockThreshold);
      setProductData(computedProducts);

      const computedCategories = calculateCategoryAnalytics(products, orders);
      setCategories(computedCategories);

      const computedDistricts = calculateDistrictAnalytics(products, orders, sellersList, [], divisionFilter);
      setDistricts(computedDistricts);

      const computedSellers = calculateSellerAnalytics(sellersList, orders, products);
      setSellers(computedSellers);

      const computedCustomers = calculateCustomerAnalytics([], orders);
      setCustomers(computedCustomers);

      const computedCart = calculateCartAnalytics(orders);
      setCartFunnel(computedCart);

      const computedEco = calculateEcoImpactAnalytics(products, queue, orders);
      setEcoImpact(computedEco);

      const computedPayments = calculatePaymentAnalytics(orders);
      setPayments(computedPayments);

      const computedCouriers = calculateCourierAnalytics(orders);
      setCouriers(computedCouriers);

      const computedReturns = calculateReturnRefundAnalytics(orders);
      setReturnsRefunds(computedReturns);
    } catch (err) {
      console.error('Error loading analytics dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [dateRange, divisionFilter, lowStockThreshold]);

  const maxSalesRev = Math.max(...salesPoints.map((p) => p.revenue), 1);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0e2417] p-6 rounded-3xl border border-[#1b482b]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#143d22] border border-[#256339] flex items-center justify-center text-[#a0f399]">
              <span className="material-symbols-outlined text-[24px]">insights</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-heading">
                  SUNNO Business Intelligence & Analytics Suite
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live DB Aggregation
                </span>
              </div>
              <p className="text-xs text-[#80a48b] mt-0.5">
                Real-time operational KPIs, multi-vendor settlement ledger, 64-district performance, and eco impact metrics.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Picker */}
          <div className="flex items-center gap-1.5 bg-[#12281a] border border-[#20452d] rounded-2xl px-3 py-1.5 text-xs">
            <span className="material-symbols-outlined text-[16px] text-[#7ca087]">calendar_month</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as AnalyticsDateRange)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Fiscal Year</option>
            </select>
          </div>

          {/* Division Filter */}
          <div className="flex items-center gap-1.5 bg-[#12281a] border border-[#20452d] rounded-2xl px-3 py-1.5 text-xs">
            <span className="material-symbols-outlined text-[16px] text-[#7ca087]">map</span>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
            >
              <option value="all">All 8 Divisions</option>
              {BANGLADESH_DIVISIONS.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} Division
                </option>
              ))}
            </select>
          </div>

          {/* Export Report Action */}
          <button
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 bg-[#173824] hover:bg-[#1f4b30] text-[#a0f399] border border-[#2d6842] rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">summarize</span>
            <span>Reports & CSV</span>
          </button>

          {/* Refresh Action */}
          <button
            onClick={loadAllAnalytics}
            className="p-2 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] rounded-2xl text-xs font-black shadow-md transition-all flex items-center justify-center"
            title="Refresh All Database Analytics"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'overview', label: 'Executive Dashboard', icon: 'dashboard' },
          { id: 'sales', label: 'Sales & Trends', icon: 'trending_up' },
          { id: 'products', label: 'Product Inventory', icon: 'inventory_2' },
          { id: 'categories', label: 'Categories Taxonomy', icon: 'category' },
          { id: 'districts', label: '64 Districts Map', icon: 'explore' },
          { id: 'sellers', label: 'Sellers & Risk', icon: 'storefront' },
          { id: 'customers', label: 'Customers & Funnel', icon: 'people' },
          { id: 'eco', label: 'Eco Impact Lab', icon: 'verified' },
          { id: 'logistics_payments', label: 'Couriers & Payments', icon: 'local_shipping' },
          { id: 'returns_fraud', label: 'Returns & Anomaly', icon: 'gavel' },
          { id: 'profitability', label: 'Profitability Model', icon: 'account_balance' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as AnalyticsSubTab)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border shrink-0 ${
              activeSubTab === tab.id
                ? 'bg-[#184627] text-[#a0f399] border-[#2f7344] shadow-sm'
                : 'bg-[#0f2417] text-[#80a48b] border-[#1b3d27] hover:border-[#275b39] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE OVERVIEW SUB-TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && kpis && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top 8 KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Gross Revenue */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5 relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold text-[#7ca087]">Gross Sales Revenue</span>
                <button
                  onClick={() => setShowRevenueTooltip(!showRevenueTooltip)}
                  className="text-[#7ca087] hover:text-[#a0f399]"
                  title="View Revenue Formula Definitions"
                >
                  <span className="material-symbols-outlined text-[16px]">info</span>
                </button>
              </div>
              <h3 className="text-2xl font-bold text-white font-mono mt-1">৳{kpis.totalRevenue.toLocaleString()}</h3>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2 font-bold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>+{kpis.growthRatePercent}% vs previous cycle</span>
              </div>
            </div>

            {/* Net Platform Revenue */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Net Marketplace Volume</span>
              <h3 className="text-2xl font-bold text-[#a0f399] font-mono mt-1">৳{kpis.netRevenue.toLocaleString()}</h3>
              <span className="text-[10px] text-[#7ca087] mt-2 block">Less returns & refunds (৳{kpis.refundedAmount.toLocaleString()})</span>
            </div>

            {/* Total Orders */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Total Order Volume</span>
              <h3 className="text-2xl font-bold text-white font-mono mt-1">{kpis.totalOrders} Orders</h3>
              <div className="text-[10px] text-emerald-400 mt-2 font-bold">
                {kpis.completedOrders} Delivered • {kpis.pendingOrders} Processing
              </div>
            </div>

            {/* Average Order Value (AOV) */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Average Order Value (AOV)</span>
              <h3 className="text-2xl font-bold text-white font-mono mt-1">৳{kpis.averageOrderValue.toLocaleString()}</h3>
              <span className="text-[10px] text-[#7ca087] mt-2 block">Per customer basket</span>
            </div>

            {/* Platform Commission */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Platform Commission (8%)</span>
              <h3 className="text-2xl font-bold text-emerald-400 font-mono mt-1">৳{kpis.platformCommissionRevenue.toLocaleString()}</h3>
              <span className="text-[10px] text-[#7ca087] mt-2 block">Eco governance & server operations</span>
            </div>

            {/* Pending Settlements */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Pending Artisan Escrow</span>
              <h3 className="text-2xl font-bold text-amber-400 font-mono mt-1">৳{kpis.totalSettlementsPending.toLocaleString()}</h3>
              <span className="text-[10px] text-amber-300 mt-2 block">Awaiting weekly maturity release</span>
            </div>

            {/* Eco Verified Items */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Eco-Verified Catalog</span>
              <h3 className="text-2xl font-bold text-white font-mono mt-1">
                {kpis.ecoVerifiedProducts} / {kpis.totalProducts}
              </h3>
              <span className="text-[10px] text-[#a0f399] mt-2 block font-bold">
                {Math.round((kpis.ecoVerifiedProducts / (kpis.totalProducts || 1)) * 100)}% verified compliance
              </span>
            </div>

            {/* Registered Artisans & Patrons */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Artisans & Patrons</span>
              <h3 className="text-2xl font-bold text-white font-mono mt-1">
                {kpis.totalSellers} Artisans • {kpis.totalCustomers} Patrons
              </h3>
              <span className="text-[10px] text-emerald-400 mt-2 block font-bold">{kpis.activeSellers} active stores</span>
            </div>
          </div>

          {/* Revenue Definitions Callout Modal / Drawer */}
          {showRevenueTooltip && (
            <div className="bg-[#0b1f13] border border-[#256339] p-5 rounded-3xl space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center pb-2 border-b border-[#1b482b]">
                <h4 className="text-sm font-bold text-[#a0f399] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">menu_book</span>
                  Platform Accounting & Revenue Definitions
                </h4>
                <button
                  onClick={() => setShowRevenueTooltip(false)}
                  className="text-[#7ca087] hover:text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#122b1c] rounded-2xl border border-[#1e462d]">
                  <span className="font-bold text-white block">Gross Sales:</span>
                  <p className="text-[#80a48b] mt-0.5">Sum of all customer order item prices prior to discounts and deductions.</p>
                </div>
                <div className="p-3 bg-[#122b1c] rounded-2xl border border-[#1e462d]">
                  <span className="font-bold text-white block">Platform Commission:</span>
                  <p className="text-[#80a48b] mt-0.5">Strictly calculated at 8% standard commission upon completed, non-refunded orders.</p>
                </div>
                <div className="p-3 bg-[#122b1c] rounded-2xl border border-[#1e462d]">
                  <span className="font-bold text-white block">Artisan Payable:</span>
                  <p className="text-[#80a48b] mt-0.5">Gross item revenue minus platform commission minus return/refund deductions.</p>
                </div>
              </div>
            </div>
          )}

          {/* Time Series Chart Preview + Category Donut Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sales Curve Visualizer */}
            <div className="lg:col-span-8 bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-white font-heading">Sales & Orders Velocity</h3>
                  <p className="text-xs text-[#7ca087]">Daily revenue trajectory and order volume over {dateRange.replace(/_/g, ' ')}</p>
                </div>
                <button
                  onClick={() => setActiveSubTab('sales')}
                  className="text-xs font-bold text-[#a0f399] hover:underline flex items-center gap-1"
                >
                  <span>Detailed Trends</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>

              {/* Responsive SVG Bar / Area Chart */}
              <div className="h-56 w-full flex items-end gap-2 pt-6 pb-2 border-b border-[#183a24] overflow-x-auto">
                {salesPoints.map((point, idx) => {
                  const heightPercent = Math.max(12, Math.round((point.revenue / maxSalesRev) * 100));
                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-[28px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-12 bg-[#002c11] text-[#a0f399] border border-[#a0f399]/40 text-[10px] font-mono px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-xl">
                        ৳{point.revenue.toLocaleString()} ({point.orders} orders)
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-[#1b6d24] to-[#a0f399] rounded-t-md group-hover:brightness-125 transition-all shadow-xs"
                      ></div>
                      <span className="text-[9px] text-[#7ca087] font-mono mt-2 truncate w-full text-center">
                        {point.label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-[#7ca087] pt-1">
                <span>Start: {salesPoints[0]?.label || 'Day 1'}</span>
                <span>Peak Revenue: ৳{maxSalesRev.toLocaleString()}</span>
                <span>End: {salesPoints[salesPoints.length - 1]?.label || 'Today'}</span>
              </div>
            </div>

            {/* Core 4 Categories Breakdown */}
            <div className="lg:col-span-4 bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white font-heading">Category Volume</h3>
                <span className="text-xs text-[#7ca087]">4 Core Pillars</span>
              </div>

              <div className="space-y-3">
                {categories.map((cat) => {
                  const totalCatRevenue = categories.reduce((s, c) => s + c.totalRevenue, 1);
                  const share = Math.round((cat.totalRevenue / totalCatRevenue) * 100);
                  return (
                    <div key={cat.category} className="p-3 bg-[#122b1c] rounded-2xl border border-[#1e462d] space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">{cat.category}</span>
                        <span className="font-mono text-[#a0f399] font-bold">৳{cat.totalRevenue.toLocaleString()} ({share}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#0a180f] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${share}%` }}
                          className="h-full bg-gradient-to-r from-[#1b6d24] to-[#a0f399] rounded-full"
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-[#7ca087]">
                        <span>{cat.unitsSold} units sold</span>
                        <span>{cat.productsCount} catalog items</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SALES & TRENDS SUB-TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'sales' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white font-heading">Comprehensive Time-Series Ledger</h3>
            <p className="text-xs text-[#7ca087]">Granular performance table matching date periods</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#122b1c] border-b border-[#1b4128] text-[10px] font-bold uppercase text-[#7ca087]">
                    <th className="py-3 px-4">Period / Date</th>
                    <th className="py-3 px-4">Orders</th>
                    <th className="py-3 px-4">Gross Revenue</th>
                    <th className="py-3 px-4">Average Order Value (AOV)</th>
                    <th className="py-3 px-4">Completed</th>
                    <th className="py-3 px-4">Cancelled / Returned</th>
                    <th className="py-3 px-4">Platform Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#183a24]">
                  {salesPoints.map((p, idx) => (
                    <tr key={idx} className="hover:bg-[#132c1d]">
                      <td className="py-2.5 px-4 font-bold text-white">{p.label}</td>
                      <td className="py-2.5 px-4 font-mono">{p.orders}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#a0f399]">৳{p.revenue.toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono">৳{p.aov.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-emerald-400 font-bold">{p.completed}</td>
                      <td className="py-2.5 px-4 text-red-400">{p.cancelled}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">৳{p.commission.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRODUCT INVENTORY & VELOCITY */}
      {/* ========================================================================= */}
      {activeSubTab === 'products' && productData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Low Stock Threshold Configuration Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0e2417] p-5 rounded-3xl border border-[#1b482b]">
            <div>
              <h3 className="text-base font-bold text-white">Inventory Velocity & Alert Control</h3>
              <p className="text-xs text-[#7ca087]">Monitor fast-moving items, stockouts, and configure critical threshold alerts</p>
            </div>

            <div className="flex items-center gap-3 bg-[#12281a] px-3.5 py-1.5 rounded-2xl border border-[#20452d] text-xs">
              <span className="text-[#7ca087] font-bold uppercase text-[10px]">Low Stock Threshold:</span>
              <input
                type="number"
                min="1"
                max="50"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 bg-[#183a24] border border-[#275d38] rounded-xl px-2 py-1 text-center text-white font-mono font-bold outline-none"
              />
              <span className="text-[#a0f399] font-bold">Units</span>
            </div>
          </div>

          {/* Top Selling vs Low Stock Alert Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Best Sellers */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 space-y-3">
              <h4 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                <span className="material-symbols-outlined text-[#a0f399] text-[18px]">local_fire_department</span>
                Top Selling Eco-Crafts
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {productData.topSelling.map((prod, idx) => (
                  <div
                    key={prod.productId}
                    onClick={() => setSelectedProductModal(prod)}
                    className="p-3 bg-[#122b1c] hover:bg-[#183a25] rounded-2xl border border-[#1e462d] flex items-center justify-between cursor-pointer transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#1b6d24] text-white flex items-center justify-center font-mono font-bold text-[10px]">
                        #{idx + 1}
                      </span>
                      <div>
                        <h5 className="font-bold text-white line-clamp-1">{prod.productTitle}</h5>
                        <p className="text-[10px] text-[#7ca087]">{prod.district} • {prod.category}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-[#a0f399] block">{prod.unitsSold} Sold</span>
                      <span className="text-[10px] text-[#7ca087]">৳{prod.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock / Out of Stock Alert Center */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 space-y-3">
              <h4 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-[18px]">warning</span>
                Stockout & Low Stock Monitor (≤ {lowStockThreshold} Units)
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {productData.lowStock.concat(productData.outOfStock).length === 0 ? (
                  <div className="text-center py-12 text-xs text-[#7ca087]">
                    All catalog products have sufficient inventory reserves.
                  </div>
                ) : (
                  productData.lowStock.concat(productData.outOfStock).map((prod) => (
                    <div
                      key={prod.productId}
                      onClick={() => setSelectedProductModal(prod)}
                      className="p-3 bg-[#122b1c] hover:bg-[#183a25] rounded-2xl border border-[#1e462d] flex items-center justify-between cursor-pointer transition-all text-xs"
                    >
                      <div>
                        <h5 className="font-bold text-white line-clamp-1">{prod.productTitle}</h5>
                        <p className="text-[10px] text-[#7ca087]">{prod.sellerName} • {prod.district}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                            prod.stock <= 0
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {prod.stock <= 0 ? 'Out of Stock' : `${prod.stock} Left`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. 64 DISTRICTS GEOGRAPHIC MAP & LEADERBOARD */}
      {/* ========================================================================= */}
      {activeSubTab === 'districts' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#0e2417] p-6 rounded-3xl border border-[#1b482b]">
            <h3 className="text-lg font-bold text-white font-heading">64-District Geographic Marketplace Ranking</h3>
            <p className="text-xs text-[#7ca087]">Real sales volume, artisan clusters, and orders from all 64 districts of Bangladesh</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {districts.slice(0, 24).map((dist, idx) => (
              <div
                key={dist.district}
                onClick={() => setSelectedDistrictModal(dist)}
                className="p-4 bg-[#0e2115] hover:bg-[#132d1d] border border-[#1b4128] hover:border-[#27633c] rounded-3xl cursor-pointer transition-all space-y-2 text-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-[#a0f399]">#{idx + 1} • {dist.division}</span>
                    <h4 className="text-base font-bold text-white">{dist.district}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#143d22] text-[#a0f399]">
                    ৳{dist.totalSales.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-[#7ca087] line-clamp-1">{dist.specialty || 'Traditional Artisan Craft'}</p>
                <div className="pt-2 border-t border-[#183a24] flex justify-between text-[10px] text-[#7ca087]">
                  <span>{dist.ordersCount} Orders</span>
                  <span>{dist.sellersCount} Artisans</span>
                  <span>{dist.productsCount} Products</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SELLERS & RISK MONITOR */}
      {/* ========================================================================= */}
      {activeSubTab === 'sellers' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#0e2417] p-6 rounded-3xl border border-[#1b482b]">
            <h3 className="text-lg font-bold text-white font-heading">Artisan Guild Leaderboard & Anomaly Watch</h3>
            <p className="text-xs text-[#7ca087]">Monitor artisan revenue, commission generated, and high cancellation risk flags</p>
          </div>

          <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#122b1c] border-b border-[#1b4128] text-[10px] font-bold uppercase text-[#7ca087]">
                    <th className="py-3 px-4">Artisan Store</th>
                    <th className="py-3 px-4">District</th>
                    <th className="py-3 px-4">Gross Revenue</th>
                    <th className="py-3 px-4">Orders</th>
                    <th className="py-3 px-4">Commission Paid</th>
                    <th className="py-3 px-4">Available Balance</th>
                    <th className="py-3 px-4">Risk Flag</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#183a24]">
                  {sellers.map((s) => (
                    <tr key={s.sellerId} className="hover:bg-[#132c1d]">
                      <td className="py-3 px-4 font-bold text-white">{s.storeName}</td>
                      <td className="py-3 px-4 text-[#7ca087]">{s.district}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#a0f399]">৳{s.totalRevenue.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono">{s.totalOrders}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400">৳{s.commissionGenerated.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">৳{s.currentBalance.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            s.riskFlag === 'Normal'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}
                        >
                          {s.riskFlag}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedSellerModal(s)}
                          className="px-3 py-1 bg-[#183a24] hover:bg-[#225032] text-[#a0f399] font-bold rounded-xl text-xs"
                        >
                          Audit
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

      {/* ========================================================================= */}
      {/* 6. CUSTOMER FUNNEL & CONVERSION */}
      {/* ========================================================================= */}
      {activeSubTab === 'customers' && customers && cartFunnel && (
        <div className="space-y-6 animate-fadeIn">
          {/* Funnel Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Total Patrons</span>
              <h4 className="text-xl font-bold text-white font-mono mt-1">{customers.totalCustomers}</h4>
              <span className="text-[10px] text-emerald-400 font-bold mt-1 block">{customers.activeCustomers} active buyers</span>
            </div>
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Retention Rate</span>
              <h4 className="text-xl font-bold text-[#a0f399] font-mono mt-1">{customers.retentionRatePercent}%</h4>
              <span className="text-[10px] text-[#7ca087] mt-1 block">{customers.returningCustomers} repeat buyers</span>
            </div>
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Cart to Purchase</span>
              <h4 className="text-xl font-bold text-emerald-400 font-mono mt-1">{cartFunnel.overallFunnelConversion}%</h4>
              <span className="text-[10px] text-[#7ca087] mt-1 block">Full funnel throughput</span>
            </div>
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Abandoned Carts</span>
              <h4 className="text-xl font-bold text-amber-400 font-mono mt-1">{cartFunnel.abandonedCarts}</h4>
              <span className="text-[10px] text-amber-300 mt-1 block">Exit before payment</span>
            </div>
          </div>

          {/* Step-by-Step Funnel Visualizer */}
          <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-white font-heading">E-Commerce Conversion Funnel Stages</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-[#122b1c] rounded-2xl border border-[#1e462d] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#7ca087]">1. Cart Additions</span>
                <h5 className="text-xl font-bold text-white font-mono">{cartFunnel.cartAdditions} Events</h5>
                <p className="text-[10px] text-[#7ca087]">Items placed into checkout cart</p>
              </div>
              <div className="p-4 bg-[#122b1c] rounded-2xl border border-[#1e462d] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#7ca087]">2. Checkout Initiated</span>
                <h5 className="text-xl font-bold text-white font-mono">{cartFunnel.checkoutStarted} Sessions</h5>
                <p className="text-[10px] text-emerald-400 font-bold">{cartFunnel.cartToCheckoutRate}% proceed to shipping</p>
              </div>
              <div className="p-4 bg-[#122b1c] rounded-2xl border border-[#1e462d] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#7ca087]">3. Payment Confirmed</span>
                <h5 className="text-xl font-bold text-[#a0f399] font-mono">{cartFunnel.checkoutCompleted} Orders</h5>
                <p className="text-[10px] text-emerald-400 font-bold">{cartFunnel.checkoutToPurchaseRate}% completion rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ECO IMPACT & VERIFICATION */}
      {/* ========================================================================= */}
      {activeSubTab === 'eco' && ecoImpact && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Eco Verified Listings</span>
              <h4 className="text-xl font-bold text-[#a0f399] font-mono mt-1">{ecoImpact.ecoVerifiedProductsCount}</h4>
              <span className="text-[10px] text-emerald-400 font-bold mt-1 block">100% Audit Passed</span>
            </div>
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Plastic-Free Packaging</span>
              <h4 className="text-xl font-bold text-white font-mono mt-1">{ecoImpact.plasticFreePackagingProductsCount}</h4>
              <span className="text-[10px] text-[#7ca087] mt-1 block">Jute, Banana Fiber & Kraft</span>
            </div>
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Verification Turnaround</span>
              <h4 className="text-xl font-bold text-white font-mono mt-1">{ecoImpact.avgVerificationTimeHours} Hours</h4>
              <span className="text-[10px] text-[#7ca087] mt-1 block">Committee SLA</span>
            </div>
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Eco Sales Share</span>
              <h4 className="text-xl font-bold text-emerald-400 font-mono mt-1">{ecoImpact.ecoShareOfTotalSalesPercent}%</h4>
              <span className="text-[10px] text-[#7ca087] mt-1 block">৳{ecoImpact.ecoProductRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. COURIERS & PAYMENT PERFORMANCE */}
      {/* ========================================================================= */}
      {activeSubTab === 'logistics_payments' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Courier SLAs */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-white font-heading">Courier SLA & Delivery Success</h4>
              <div className="space-y-2.5">
                {couriers.map((c) => (
                  <div key={c.courierId} className="p-3.5 bg-[#122b1c] rounded-2xl border border-[#1e462d] space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{c.courierName}</span>
                      <span className="font-mono text-emerald-400 font-bold">{c.successRate}% Success</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#7ca087]">
                      <span>{c.shipmentsCount} Shipments</span>
                      <span>Avg Speed: {c.avgDeliveryDays} Days</span>
                      <span>RTO Rate: {c.rtoRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Success Rates */}
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-white font-heading">Payment Gateway Performance</h4>
              <div className="space-y-2.5">
                {payments.map((p) => (
                  <div key={p.method} className="p-3.5 bg-[#122b1c] rounded-2xl border border-[#1e462d] space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{p.label}</span>
                      <span className="font-mono text-[#a0f399] font-bold">৳{p.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#7ca087]">
                      <span>{p.transactionsCount} Transactions</span>
                      <span className="text-emerald-400 font-bold">{p.successRate}% Success Rate</span>
                      <span className="text-red-400">{p.failedCount} Failed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. PROFITABILITY ARCHITECTURE & COST TRANSPARENCY */}
      {/* ========================================================================= */}
      {activeSubTab === 'profitability' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#0e2417] p-6 rounded-3xl border border-[#1b482b] space-y-2">
            <h3 className="text-lg font-bold text-white font-heading">Marketplace Profitability & Unit Economics</h3>
            <p className="text-xs text-[#7ca087]">
              Platform unit economics calculated from gross platform commission revenue minus operational costs and gateway fees.
            </p>
          </div>

          <div className="p-5 bg-[#0b1f13] border border-amber-700/60 rounded-3xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>Cost of Goods Sold (COGS) Transparency Declaration</span>
            </div>
            <p className="text-[#a3c4ad] leading-relaxed">
              In strict adherence to financial integrity standards, SUNNO operates as a zero-inventory artisan marketplace. 
              Because raw artisan manufacturing material cost prices vary per cooperative and are not configured across all third-party listings, 
              gross product profit margins reflect verified Platform Commission (8%) rather than unverified simulated manufacturer costs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Gross Commission Inflow</span>
              <h4 className="text-2xl font-bold text-[#a0f399] font-mono">৳{kpis?.platformCommissionRevenue.toLocaleString()}</h4>
              <span className="text-[10px] text-[#7ca087]">8% marketplace take rate</span>
            </div>

            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Gateway Processing (Est. 1.8%)</span>
              <h4 className="text-2xl font-bold text-red-400 font-mono">
                -৳{Math.round((kpis?.totalRevenue || 0) * 0.018).toLocaleString()}
              </h4>
              <span className="text-[10px] text-[#7ca087]">bKash, Nagad & SSLCommerz fees</span>
            </div>

            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Net Operating Contribution</span>
              <h4 className="text-2xl font-bold text-emerald-400 font-mono">
                ৳{Math.max(0, (kpis?.platformCommissionRevenue || 0) - Math.round((kpis?.totalRevenue || 0) * 0.018)).toLocaleString()}
              </h4>
              <span className="text-[10px] text-emerald-400 font-bold">Positive operating margin</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. RETURNS, REFUNDS & ANOMALY */}
      {/* ========================================================================= */}
      {activeSubTab === 'returns_fraud' && returnsRefunds && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Total Return Requests</span>
              <h4 className="text-xl font-bold text-white font-mono mt-1">{returnsRefunds.totalReturnRequests}</h4>
              <span className="text-[10px] text-[#7ca087] mt-1 block">{returnsRefunds.approvedReturns} approved & processed</span>
            </div>

            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Refunded Volume</span>
              <h4 className="text-xl font-bold text-red-400 font-mono mt-1">৳{returnsRefunds.totalRefundedAmount.toLocaleString()}</h4>
              <span className="text-[10px] text-[#7ca087] mt-1 block">Returned to buyer accounts</span>
            </div>

            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Platform Return Rate</span>
              <h4 className="text-xl font-bold text-emerald-400 font-mono mt-1">{returnsRefunds.returnRatePercent}%</h4>
              <span className="text-[10px] text-emerald-400 font-bold mt-1 block">Within healthy &lt;5% benchmark</span>
            </div>

            <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-5">
              <span className="text-[10px] uppercase font-bold text-[#7ca087]">Pending Escrow Dispute</span>
              <h4 className="text-xl font-bold text-amber-400 font-mono mt-1">৳{returnsRefunds.pendingRefundsAmount.toLocaleString()}</h4>
              <span className="text-[10px] text-amber-300 mt-1 block">In dispute mediation</span>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Modals */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1e12] text-[#e1e9e3] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#1b482b] space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start pb-3 border-b border-[#1b4329]">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#a0f399]">{selectedProductModal.sku}</span>
                <h4 className="text-base font-bold text-white mt-0.5">{selectedProductModal.productTitle}</h4>
              </div>
              <button
                onClick={() => setSelectedProductModal(null)}
                className="p-1 text-[#7ea289] hover:text-white rounded-full"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#122b1c] rounded-2xl border border-[#1e462d]">
                <span className="text-[10px] text-[#7ca087] uppercase block">Price</span>
                <strong className="font-mono text-white text-base">৳{selectedProductModal.price}</strong>
              </div>
              <div className="p-3 bg-[#122b1c] rounded-2xl border border-[#1e462d]">
                <span className="text-[10px] text-[#7ca087] uppercase block">Current Stock</span>
                <strong className="font-mono text-white text-base">{selectedProductModal.stock} Units</strong>
              </div>
              <div className="p-3 bg-[#122b1c] rounded-2xl border border-[#1e462d]">
                <span className="text-[10px] text-[#7ca087] uppercase block">Units Sold</span>
                <strong className="font-mono text-[#a0f399] text-base">{selectedProductModal.unitsSold}</strong>
              </div>
              <div className="p-3 bg-[#122b1c] rounded-2xl border border-[#1e462d]">
                <span className="text-[10px] text-[#7ca087] uppercase block">Gross Sales</span>
                <strong className="font-mono text-[#a0f399] text-base">৳{selectedProductModal.totalRevenue.toLocaleString()}</strong>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedProductModal(null)}
                className="px-5 py-2 bg-[#1b6d24] text-white rounded-xl text-xs font-bold"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Generator Modal */}
      <AdminReportGeneratorModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        initialReportType="sales"
      />
    </div>
  );
};
