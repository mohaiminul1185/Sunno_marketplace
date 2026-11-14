import React, { useState, useEffect } from 'react';
import {
  AdminAlert,
  AdminAlertCategory,
  AdminAlertSeverity,
  AdminAlertStatus,
  AdminNavTab,
} from '../../types';
import {
  fetchAdminAlerts,
  updateAdminAlertStatus,
  createAdminAlert,
} from '../../services/adminAnalyticsService';
import { useAuth } from '../../context/AuthContext';

interface AdminAlertCenterProps {
  onNavigateTab?: (tab: AdminNavTab) => void;
}

export const AdminAlertCenter: React.FC<AdminAlertCenterProps> = ({ onNavigateTab }) => {
  const { userProfile } = useAuth();
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New alert form modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategory, setNewCategory] = useState<AdminAlertCategory>('system');
  const [newSeverity, setNewSeverity] = useState<AdminAlertSeverity>('medium');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminAlerts();
      setAlerts(data);
    } catch (e) {
      console.error('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStatusChange = async (alertId: string, newStatus: AdminAlertStatus) => {
    await updateAdminAlertStatus(alertId, newStatus, userProfile?.id || 'admin-01');
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
    );
    showToast(`Alert status updated to ${newStatus}`);
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = await createAdminAlert({
      category: newCategory,
      severity: newSeverity,
      title: newTitle.trim(),
      description: newDescription.trim(),
    });

    setAlerts((prev) => [created, ...prev]);
    setShowCreateModal(false);
    setNewTitle('');
    setNewDescription('');
    showToast('Platform alert published successfully!');
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'all' || a.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSeverity && matchesStatus && matchesSearch;
  });

  const unreadCount = alerts.filter((a) => a.status === 'NEW').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  const CATEGORY_ICONS: Record<AdminAlertCategory, string> = {
    payment: 'payments',
    order: 'shopping_bag',
    courier: 'local_shipping',
    seller: 'storefront',
    product: 'inventory_2',
    eco_verification: 'verified',
    finance: 'account_balance',
    security: 'security',
    system: 'settings_suggest',
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#002c11] text-[#a0f399] border border-[#a0f399]/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce">
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0e2417] p-6 rounded-3xl border border-[#1b482b]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#143d22] border border-[#256339] flex items-center justify-center text-[#a0f399]">
              <span className="material-symbols-outlined text-[24px]">notifications_active</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-heading">
                Platform Alert & Anomaly Center
              </h2>
              <p className="text-xs text-[#80a48b] mt-0.5">
                Real-time operational alerts for payments, logistics, eco-verification queue, and seller risks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#173824] hover:bg-[#1f4b30] text-[#a0f399] border border-[#2d6842] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">add_alert</span>
            <span>Broadcast Alert</span>
          </button>
          <button
            onClick={loadAlerts}
            className="px-4 py-2 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#143220] flex items-center justify-center text-[#a0f399]">
            <span className="material-symbols-outlined">mark_email_unread</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#7ca087]">New Active Alerts</span>
            <h4 className="text-xl font-bold text-white font-mono">{unreadCount}</h4>
          </div>
        </div>

        <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800 flex items-center justify-center text-red-400">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#7ca087]">Critical / High Severity</span>
            <h4 className="text-xl font-bold text-red-400 font-mono">{criticalCount}</h4>
          </div>
        </div>

        <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#143220] flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined">task_alt</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#7ca087]">Resolved Alerts</span>
            <h4 className="text-xl font-bold text-white font-mono">
              {alerts.filter((a) => a.status === 'RESOLVED').length}
            </h4>
          </div>
        </div>

        <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#143220] flex items-center justify-center text-[#a0f399]">
            <span className="material-symbols-outlined">history</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#7ca087]">Total Monitored Events</span>
            <h4 className="text-xl font-bold text-white font-mono">{alerts.length}</h4>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7ca087] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search alerts by subject, message, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12281a] border border-[#20452d] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#7ca087] outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#12281a] border border-[#20452d] rounded-xl px-3 py-2 text-xs text-white outline-none"
          >
            <option value="all">All Categories</option>
            <option value="payment">Payment Issues</option>
            <option value="order">Order Fulfillment</option>
            <option value="courier">Courier Delays</option>
            <option value="seller">Seller Performance</option>
            <option value="product">Product & Low Stock</option>
            <option value="eco_verification">Eco Verification</option>
            <option value="finance">Finance & Treasury</option>
            <option value="security">Security & Anomaly</option>
            <option value="system">System Status</option>
          </select>

          {/* Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-[#12281a] border border-[#20452d] rounded-xl px-3 py-2 text-xs text-white outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#12281a] border border-[#20452d] rounded-xl px-3 py-2 text-xs text-white outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="NEW">New (Unresolved)</option>
            <option value="READ">Read</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-16 bg-[#0e2115] border border-[#1b4128] rounded-3xl text-xs text-[#7ca087]">
            <span className="material-symbols-outlined text-[36px] text-emerald-500 mb-2 block">verified_user</span>
            No alerts match your current filter parameters. All platform systems operating normally.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical' || alert.severity === 'high';
            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border transition-all ${
                  alert.status === 'NEW'
                    ? isCritical
                      ? 'bg-red-950/20 border-red-700/60 shadow-xs'
                      : 'bg-[#0f2818] border-[#256339] shadow-xs'
                    : 'bg-[#0b1b11] border-[#153420] opacity-80'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCritical
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : alert.severity === 'medium'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-[#143521] text-[#a0f399] border border-[#235836]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {CATEGORY_ICONS[alert.category] || 'info'}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-mono font-bold text-[#a0f399] bg-[#143822] px-2 py-0.5 rounded border border-[#235b37]">
                          {alert.category.replace('_', ' ')}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${
                            alert.severity === 'critical'
                              ? 'bg-red-900 text-white'
                              : alert.severity === 'high'
                              ? 'bg-red-950 text-red-300'
                              : alert.severity === 'medium'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-[#143220] text-[#7ca087]'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-[#7ca087]">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white mt-1.5">{alert.title}</h4>
                      <p className="text-xs text-[#a3c4ad] mt-0.5 leading-relaxed">{alert.description}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {alert.actionUrl && onNavigateTab && (
                      <button
                        onClick={() => {
                          const tab = alert.actionUrl?.replace('#', '') as AdminNavTab;
                          if (tab) onNavigateTab(tab);
                        }}
                        className="px-3 py-1.5 bg-[#143220] hover:bg-[#1e482e] text-[#a0f399] border border-[#235836] rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>Investigate</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    )}

                    {alert.status !== 'RESOLVED' ? (
                      <button
                        onClick={() => handleStatusChange(alert.id, 'RESOLVED')}
                        className="px-3 py-1.5 bg-[#1b6d24] hover:bg-[#23872e] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        ✓ Mark Resolved
                      </button>
                    ) : (
                      <span className="px-3 py-1 bg-[#132c1c] text-emerald-400 border border-emerald-800/40 rounded-xl text-[10px] font-bold">
                        Resolved
                      </span>
                    )}

                    {alert.status === 'NEW' && (
                      <button
                        onClick={() => handleStatusChange(alert.id, 'READ')}
                        className="px-2.5 py-1.5 text-[#7ca087] hover:text-white text-xs"
                        title="Mark as Read"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1e12] text-[#e1e9e3] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#1b482b] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b4329]">
              <h3 className="text-lg font-bold text-white font-heading">
                Publish Administrative Alert
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#7ea289] hover:text-white rounded-full"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#a0f399] uppercase block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as AdminAlertCategory)}
                    className="w-full bg-[#143220] border border-[#235636] rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="payment">Payment</option>
                    <option value="order">Order</option>
                    <option value="courier">Courier</option>
                    <option value="seller">Seller</option>
                    <option value="product">Product</option>
                    <option value="eco_verification">Eco Verification</option>
                    <option value="finance">Finance</option>
                    <option value="security">Security</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#a0f399] uppercase block mb-1">
                    Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as AdminAlertSeverity)}
                    className="w-full bg-[#143220] border border-[#235636] rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="info">Info</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#a0f399] uppercase block mb-1">
                  Alert Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Courier Route Disruption in Sylhet Hub"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#143220] border border-[#235636] rounded-xl px-3 py-2 text-white outline-none focus:border-[#a0f399]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#a0f399] uppercase block mb-1">
                  Detailed Operational Description
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the operational anomaly, affected districts, and required committee action..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-[#143220] border border-[#235636] rounded-xl px-3 py-2 text-white outline-none focus:border-[#a0f399]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#143220] hover:bg-[#1c472d] text-white rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] font-black rounded-xl shadow-md"
                >
                  Publish Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
