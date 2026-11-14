import React, { useState, useEffect } from 'react';
import {
  PlatformGeneralSettings,
  PlatformAnnouncement,
  NotificationTemplate,
  Order,
  Product,
  SellerProfile,
  UserProfile,
} from '../../types';
import {
  fetchPlatformSettings,
  updatePlatformSettingsInDb,
  fetchPlatformAnnouncements,
  createPlatformAnnouncementInDb,
  deletePlatformAnnouncementInDb,
  fetchNotificationTemplates,
  updateNotificationTemplateInDb,
  exportDataToCsv,
} from '../../services/adminService';
import {
  fetchAllOrders,
  fetchAllProducts,
  fetchAllSellers,
  fetchAllUserProfiles,
} from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';
import { AdminProviderStatusDashboard } from './AdminProviderStatusDashboard';
import {
  runDataIntegrityAudit,
  seedEssentialSystemDocs,
  IntegrityAuditReport,
} from '../../services/dataIntegrityService';

export const AdminSettingsReportsTab: React.FC<{
  initialSubView?: 'settings' | 'announcements' | 'notifications' | 'exports' | 'providers' | 'maintenance';
}> = ({ initialSubView = 'settings' }) => {
  const { userProfile: currentAdmin } = useAuth();
  const [subView, setSubView] = useState<
    'settings' | 'announcements' | 'notifications' | 'exports' | 'providers' | 'maintenance'
  >(initialSubView);

  // Maintenance & Audit State
  const [auditReport, setAuditReport] = useState<IntegrityAuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSeedingBaseline, setIsSeedingBaseline] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<PlatformGeneralSettings>({
    platformName: 'SUNNO',
    supportEmail: 'support@sunno.eco',
    supportPhone: '+880 1700-000000',
    defaultCommissionRate: 5.0,
    vatRate: 0,
    ecoVerificationThresholdScore: 85,
    maintenanceMode: false,
    payoutHoldDays: 3,
    minPayoutAmount: 500,
    maxBasicPlanProducts: 20,
    allowGuestCheckout: true,
  });

  // Announcements State
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [isAddAnnouncementOpen, setIsAddAnnouncementOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState<Partial<PlatformAnnouncement>>({
    title: '',
    message: '',
    targetAudience: 'all',
    priority: 'normal',
    active: true,
  });

  // Notification Templates State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);

  // Export Data State
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allSellers, setAllSellers] = useState<SellerProfile[]>([]);
  const [allCustomers, setAllCustomers] = useState<UserProfile[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sett, ann, tmpl, ords, prods, sells, custs] = await Promise.all([
          fetchPlatformSettings(),
          fetchPlatformAnnouncements(),
          fetchNotificationTemplates(),
          fetchAllOrders(),
          fetchAllProducts(),
          fetchAllSellers(),
          fetchAllUserProfiles(),
        ]);
        if (sett) setSettings(sett);
        setAnnouncements(ann);
        setTemplates(tmpl);
        if (tmpl.length > 0) setSelectedTemplate(tmpl[0]);
        setAllOrders(ords);
        setAllProducts(prods);
        setAllSellers(sells);
        setAllCustomers(custs);
      } catch (err) {
        console.error('Error loading settings and reports:', err);
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

  // Settings Handlers
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePlatformSettingsInDb(settings, currentAdmin?.email || 'admin@sunno.eco');
      showToast('Global platform settings updated & active.');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  // Announcement Handlers
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.message) return;
    try {
      const created = await createPlatformAnnouncementInDb(
        {
          title: announcementForm.title,
          message: announcementForm.message,
          targetAudience: announcementForm.targetAudience || 'all',
          priority: announcementForm.priority || 'normal',
          active: true,
        },
        currentAdmin?.email || 'admin@sunno.eco'
      );
      setAnnouncements((prev) => [created, ...prev]);
      setIsAddAnnouncementOpen(false);
      showToast('Platform announcement broadcasted!');
    } catch (err) {
      console.error('Failed to broadcast announcement:', err);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await deletePlatformAnnouncementInDb(id, currentAdmin?.email || 'admin@sunno.eco');
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    showToast('Announcement removed.');
  };

  // Notification Template Handlers
  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      await updateNotificationTemplateInDb(
        selectedTemplate.id,
        selectedTemplate,
        currentAdmin?.email || 'admin@sunno.eco'
      );
      setTemplates((prev) => prev.map((t) => (t.id === selectedTemplate.id ? selectedTemplate : t)));
      showToast(`Template "${selectedTemplate.title}" updated.`);
    } catch (err) {
      console.error('Failed to update template:', err);
    }
  };

  // Export Handlers
  const handleExportOrders = () => {
    const headers = ['Order ID', 'Customer Name', 'Total (৳)', 'Status', 'Payment Method', 'District', 'Date'];
    const rows = allOrders.map((o) => [
      o.id,
      o.shippingAddress?.fullName || 'Customer',
      o.finalTotal || o.total,
      o.status,
      o.paymentMethod || 'COD',
      o.shippingAddress?.district || 'Dhaka',
      o.createdAt || 'N/A',
    ]);
    exportDataToCsv('sunno_orders_master_report', headers, rows);
    showToast('Orders report exported to CSV.');
  };

  const handleExportProducts = () => {
    const headers = ['Product ID', 'Title', 'Seller ID', 'Price (৳)', 'District', 'Eco Status', 'Stock'];
    const rows = allProducts.map((p) => [
      p.id,
      p.title,
      p.sellerId || 'N/A',
      p.price,
      p.district || 'Dhaka',
      p.isEcoVerified ? 'Verified' : 'Pending',
      p.stock || 50,
    ]);
    exportDataToCsv('sunno_products_catalog_report', headers, rows);
    showToast('Products catalog exported to CSV.');
  };

  const handleExportSellers = () => {
    const headers = ['Seller ID', 'Store Name', 'District', 'Status', 'Plan', 'Total Sales (৳)'];
    const rows = allSellers.map((s) => [
      s.id,
      s.shopName || s.storeName || 'Artisan',
      s.district || 'Dhaka',
      s.status,
      s.planId || 'Basic',
      s.totalSales || 0,
    ]);
    exportDataToCsv('sunno_artisan_sellers_report', headers, rows);
    showToast('Artisans report exported to CSV.');
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

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#002c11] font-heading">
            Platform Settings, Broadcasts & Data Export
          </h2>
          <p className="text-xs text-[#717970] mt-0.5">
            Configure system parameters, broadcast network announcements, and generate comprehensive CSV reports.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#f0eded] p-1 rounded-2xl border border-[#c1c9be]/40 overflow-x-auto">
          <button
            onClick={() => setSubView('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subView === 'settings' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            System Settings
          </button>
          <button
            onClick={() => setSubView('announcements')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subView === 'announcements' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Announcements ({announcements.length})
          </button>
          <button
            onClick={() => setSubView('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subView === 'notifications' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Notification Templates ({templates.length})
          </button>
          <button
            onClick={() => setSubView('exports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subView === 'exports' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Data Reports
          </button>
          <button
            onClick={() => setSubView('providers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subView === 'providers' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Gateways & Providers
          </button>
          <button
            onClick={() => setSubView('maintenance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              subView === 'maintenance' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">health_and_safety</span>
            <span>Data Integrity & Maintenance</span>
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: SYSTEM SETTINGS */}
      {subView === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#c1c9be]/60 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#f0eded]">
            <div>
              <h3 className="text-base font-bold text-[#002c11] font-heading">
                Platform Operational Parameters
              </h3>
              <p className="text-xs text-[#717970]">
                Changes apply instantly across all 64-district storefronts and financial calculations.
              </p>
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-[#a0f399] text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save Parameters
            </button>
          </div>

          {/* Maintenance Mode Banner Toggle */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${settings.maintenanceMode ? 'bg-red-50 border-red-300' : 'bg-[#fbf9f8] border-[#c1c9be]/40'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.maintenanceMode ? 'bg-red-200 text-red-800' : 'bg-[#e8f5e9] text-[#1b6d24]'}`}>
                <span className="material-symbols-outlined text-xl">build</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#002c11]">Marketplace Maintenance Mode</h4>
                <p className="text-[11px] text-[#717970]">
                  When active, storefront displays maintenance screen while admin control center remains accessible.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                settings.maintenanceMode ? 'bg-red-700 text-white shadow' : 'bg-[#f0eded] text-[#414941]'
              }`}
            >
              {settings.maintenanceMode ? 'ACTIVE (STORE LOCKED)' : 'Disabled (Normal)'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            <div>
              <label className="block font-bold text-[#717970] mb-1 uppercase">Platform Brand Name</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-[#717970] mb-1 uppercase">Official Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#717970] mb-1 uppercase">Helpline Phone</label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#717970] mb-1 uppercase">Default Commission Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.defaultCommissionRate}
                onChange={(e) => setSettings({ ...settings, defaultCommissionRate: Number(e.target.value) })}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-[#717970] mb-1 uppercase">Treasury Payout Hold (Days)</label>
              <input
                type="number"
                min={0}
                value={settings.payoutHoldDays}
                onChange={(e) => setSettings({ ...settings, payoutHoldDays: Number(e.target.value) })}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-[#717970] mb-1 uppercase">Min Payout Threshold (৳)</label>
              <input
                type="number"
                value={settings.minPayoutAmount}
                onChange={(e) => setSettings({ ...settings, minPayoutAmount: Number(e.target.value) })}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-[#717970] mb-1 uppercase">Eco Compliance Score Threshold (%)</label>
              <input
                type="number"
                value={settings.ecoVerificationThresholdScore}
                onChange={(e) => setSettings({ ...settings, ecoVerificationThresholdScore: Number(e.target.value) })}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-[#717970] mb-1 uppercase">Max Products on Basic Plan</label>
              <input
                type="number"
                value={settings.maxBasicPlanProducts}
                onChange={(e) => setSettings({ ...settings, maxBasicPlanProducts: Number(e.target.value) })}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none font-mono"
              />
            </div>
          </div>
        </form>
      )}

      {/* SUBVIEW 2: ANNOUNCEMENTS */}
      {subView === 'announcements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#717970]">
              Broadcast alerts to customers, artisans, or specific district logistics hubs.
            </span>
            <button
              onClick={() => setIsAddAnnouncementOpen(true)}
              className="px-4 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] text-[#a0f399]">campaign</span>
              New Broadcast Announcement
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-white rounded-3xl p-6 border border-[#c1c9be]/60 shadow-sm space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ann.priority === 'urgent'
                          ? 'bg-red-100 text-red-800'
                          : ann.priority === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ann.priority} Priority • Target: {ann.targetAudience}
                    </span>
                    <h4 className="font-bold text-sm text-[#002c11] mt-2">{ann.title}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>

                <p className="text-xs text-[#414941] leading-relaxed">{ann.message}</p>

                <div className="text-[10px] text-[#717970] pt-2 border-t border-[#f0eded] font-mono">
                  Broadcasted: {new Date(ann.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 3: NOTIFICATION TEMPLATES */}
      {subView === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-5 border border-[#c1c9be]/60 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-[#717970] uppercase tracking-wider mb-2">
              Select Trigger Template
            </h3>
            {templates.map((tmpl) => {
              const legacyTmpl = tmpl as NotificationTemplate & { channel?: string; type?: string };
              const channelsLabel =
                Array.isArray(tmpl.channels) && tmpl.channels.length > 0
                  ? tmpl.channels.join(', ').toUpperCase()
                  : String(legacyTmpl.channel || 'IN_APP').toUpperCase();
              const triggerLabel = tmpl.triggerEvent || legacyTmpl.type || tmpl.category || 'system';
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={`w-full p-3.5 rounded-2xl text-left transition-all flex items-center justify-between ${
                    selectedTemplate?.id === tmpl.id
                      ? 'bg-[#002c11] text-white shadow-md'
                      : 'bg-[#fbf9f8] hover:bg-[#f0eded] text-[#002c11]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{tmpl.title || tmpl.code || 'Untitled Template'}</div>
                    <div className={`text-[10px] uppercase font-mono ${selectedTemplate?.id === tmpl.id ? 'text-[#a0f399]' : 'text-[#717970]'}`}>
                      {channelsLabel} • {triggerLabel}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">
                    {selectedTemplate?.id === tmpl.id ? 'check' : 'chevron_right'}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedTemplate && (() => {
            const legacySelected = selectedTemplate as NotificationTemplate & {
              channel?: string;
              type?: string;
              subject?: string;
              body?: string;
            };
            const selectedChannelsLabel =
              Array.isArray(selectedTemplate.channels) && selectedTemplate.channels.length > 0
                ? selectedTemplate.channels.join(', ').toUpperCase()
                : String(legacySelected.channel || 'IN_APP').toUpperCase();
            const selectedTriggerLabel =
              selectedTemplate.triggerEvent || legacySelected.type || selectedTemplate.category || 'system';
            const supportsEmail =
              (Array.isArray(selectedTemplate.channels) && selectedTemplate.channels.includes('email')) ||
              legacySelected.channel === 'email';
            const bodyValue = selectedTemplate.bodyTemplate ?? legacySelected.body ?? '';
            const variableHints =
              Array.isArray(selectedTemplate.variables) && selectedTemplate.variables.length > 0
                ? selectedTemplate.variables.map((v) => `{{${v}}}`).join(', ')
                : '{{orderId}}, {{amount}}, {{trackingCode}}, {{customerName}}';

            return (
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-[#c1c9be]/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#f0eded]">
                  <div>
                    <h3 className="text-base font-bold text-[#002c11] font-heading">
                      Edit: {selectedTemplate.title || selectedTemplate.code || 'Notification Template'}
                    </h3>
                    <p className="text-xs text-[#717970]">
                      Channel: <strong>{selectedChannelsLabel}</strong> • Trigger: {selectedTriggerLabel}
                    </p>
                  </div>
                  <button
                    onClick={handleSaveTemplate}
                    className="px-5 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-[#a0f399] text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Template
                  </button>
                </div>

                {supportsEmail && (
                  <div>
                    <label className="block text-xs font-bold text-[#717970] mb-1 uppercase">Email Subject Line</label>
                    <input
                      type="text"
                      value={legacySelected.subject || ''}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          ...( { subject: e.target.value } as any ),
                        })
                      }
                      className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 text-xs outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#717970] mb-1 uppercase">
                    Template Body (Variables: {variableHints})
                  </label>
                  <textarea
                    rows={8}
                    value={bodyValue}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, bodyTemplate: e.target.value })}
                    className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-2xl p-4 text-xs font-mono outline-none leading-relaxed"
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SUBVIEW 4: DATA EXPORTS & REPORTS */}
      {subView === 'exports' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-[#c1c9be]/60 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">receipt_long</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#002c11]">Orders & Shipments Master Report</h4>
              <p className="text-xs text-[#717970] mt-1">
                Complete transactional breakdown across all 64 districts including payment gateway logs.
              </p>
            </div>
            <button
              onClick={handleExportOrders}
              className="w-full py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-[#a0f399] text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export Orders CSV
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#c1c9be]/60 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">storefront</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#002c11]">Artisan Sellers & Cooperatives</h4>
              <p className="text-xs text-[#717970] mt-1">
                All registered rural craftsmen, verification statuses, subscription plans, and total GMV.
              </p>
            </div>
            <button
              onClick={handleExportSellers}
              className="w-full py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-[#a0f399] text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export Sellers CSV
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#c1c9be]/60 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">eco</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#002c11]">Eco Products Catalog</h4>
              <p className="text-xs text-[#717970] mt-1">
                Full inventory of bio/recycled crafts, eco accreditation tags, district origins, and stock levels.
              </p>
            </div>
            <button
              onClick={handleExportProducts}
              className="w-full py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-[#a0f399] text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export Catalog CSV
            </button>
          </div>
        </div>
      )}

      {/* SUBVIEW 5: GATEWAYS & PROVIDERS TELEMETRY */}
      {subView === 'providers' && (
        <AdminProviderStatusDashboard />
      )}

      {/* SUBVIEW 6: DATA INTEGRITY & MAINTENANCE */}
      {subView === 'maintenance' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#c1c9be]/60 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0eded]">
            <div>
              <h3 className="text-base font-bold text-[#002c11] font-heading flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1b6d24]">database</span>
                <span>Firestore Source-of-Truth Integrity & Maintenance</span>
              </h3>
              <p className="text-xs text-[#717970] mt-0.5">
                Audit system schema compliance, check multi-vendor relational links, and seed missing baseline documents.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  setIsAuditing(true);
                  try {
                    const rep = await runDataIntegrityAudit();
                    setAuditReport(rep);
                    showToast(rep.healthy ? 'All Firestore collections passed audit!' : 'Audit complete. Discrepancies detected.');
                  } catch (err: any) {
                    showToast('Error during audit: ' + (err.message || 'Failed'));
                  } finally {
                    setIsAuditing(false);
                  }
                }}
                disabled={isAuditing}
                className="px-4 py-2 bg-[#f0eded] hover:bg-[#e2dfdf] text-[#002c11] text-xs font-bold rounded-xl transition-all flex items-center gap-2"
              >
                <span className={`material-symbols-outlined text-[16px] ${isAuditing ? 'animate-spin' : ''}`}>
                  {isAuditing ? 'refresh' : 'search_check'}
                </span>
                <span>{isAuditing ? 'Scanning Firestore...' : 'Run Integrity Scan'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsSeedingBaseline(true);
                  try {
                    const res = await seedEssentialSystemDocs(currentAdmin?.email || 'admin@sunno.eco');
                    showToast(`Baseline checked/seeded: Categories (${res.categoriesSeeded}), Delivery (${res.deliverySettingsSeeded}), Coupons (${res.couponsSeeded})`);
                    const rep = await runDataIntegrityAudit();
                    setAuditReport(rep);
                  } catch (err: any) {
                    showToast('Error seeding baseline: ' + (err.message || 'Failed'));
                  } finally {
                    setIsSeedingBaseline(false);
                  }
                }}
                disabled={isSeedingBaseline}
                className="px-4 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-[#a0f399] text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>{isSeedingBaseline ? 'Seeding Baseline...' : 'Seed Missing Baseline Docs'}</span>
              </button>
            </div>
          </div>

          {/* Audit Report View */}
          {auditReport ? (
            <div className="space-y-6">
              {/* Summary Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  auditReport.healthy
                    ? 'bg-[#edf9ec] border-[#b0e6af] text-[#002c11]'
                    : 'bg-[#fff4f2] border-[#ffdad6] text-[#ba1a1a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[24px]">
                    {auditReport.healthy ? 'check_circle' : 'warning'}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold">
                      {auditReport.healthy ? 'Database Integrity Healthy & Consistent' : 'Integrity Discrepancies Found'}
                    </h4>
                    <p className="text-xs opacity-80 mt-0.5">
                      Scanned at {new Date(auditReport.timestamp).toLocaleTimeString()} • Products checked: {auditReport.totalProductsChecked} • Orders checked: {auditReport.totalOrdersChecked} • Sub-orders checked: {auditReport.totalSubOrdersChecked}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 bg-white/70 rounded-lg">
                  {auditReport.healthy ? 'Passed' : 'Action Needed'}
                </span>
              </div>

              {/* Integrity Checklist Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002c11]">System Collections</span>
                    <span className={`material-symbols-outlined text-[18px] ${auditReport.missingSystemDocs.length === 0 ? 'text-[#1b6d24]' : 'text-amber-600'}`}>
                      {auditReport.missingSystemDocs.length === 0 ? 'check_circle' : 'error'}
                    </span>
                  </div>
                  <p className="text-xs text-[#717970]">
                    {auditReport.missingSystemDocs.length === 0 ? 'All essential system docs exist' : `${auditReport.missingSystemDocs.length} missing system documents`}
                  </p>
                  {auditReport.missingSystemDocs.map((item, idx) => (
                    <p key={idx} className="text-[11px] text-amber-700 font-mono">• {item}</p>
                  ))}
                </div>

                <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002c11]">Orphaned Sub-Orders</span>
                    <span className={`material-symbols-outlined text-[18px] ${auditReport.orphanedSubOrders.length === 0 ? 'text-[#1b6d24]' : 'text-[#ba1a1a]'}`}>
                      {auditReport.orphanedSubOrders.length === 0 ? 'check_circle' : 'error'}
                    </span>
                  </div>
                  <p className="text-xs text-[#717970]">
                    {auditReport.orphanedSubOrders.length === 0 ? 'Zero orphaned sub-orders' : `${auditReport.orphanedSubOrders.length} orphaned sub-orders`}
                  </p>
                </div>

                <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002c11]">Eco Badges & Attributes</span>
                    <span className={`material-symbols-outlined text-[18px] ${auditReport.inconsistentEcoBadges.length === 0 ? 'text-[#1b6d24]' : 'text-amber-600'}`}>
                      {auditReport.inconsistentEcoBadges.length === 0 ? 'check_circle' : 'warning'}
                    </span>
                  </div>
                  <p className="text-xs text-[#717970]">
                    {auditReport.inconsistentEcoBadges.length === 0 ? '100% eco badges compliant' : `${auditReport.inconsistentEcoBadges.length} products need eco badge attribute update`}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#fbf9f8] rounded-2xl border border-dashed border-[#c1c9be] space-y-3">
              <span className="material-symbols-outlined text-[36px] text-[#717970]">query_stats</span>
              <h4 className="text-sm font-bold text-[#002c11]">No Scan Executed Yet</h4>
              <p className="text-xs text-[#717970] max-w-md mx-auto">
                Click "Run Integrity Scan" to verify document consistency across categories, delivery rates, coupons, product eco tags, and multi-vendor sub-orders.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {isAddAnnouncementOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#c1c9be]/60 space-y-4">
            <h3 className="text-lg font-bold text-[#002c11] font-heading">
              New Network Announcement
            </h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#717970] mb-1 uppercase">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eid-ul-Fitr Artisan Dispatch Window"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#717970] mb-1 uppercase">Target Audience</label>
                <select
                  value={announcementForm.targetAudience}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, targetAudience: e.target.value as any })}
                  className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none"
                >
                  <option value="all">Everyone (Marketplace Banner)</option>
                  <option value="sellers">All Artisan Sellers</option>
                  <option value="customers">All Conscious Customers</option>
                  <option value="district_hub">District Logistics Hubs</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#717970] mb-1 uppercase">Priority</label>
                <select
                  value={announcementForm.priority}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value as any })}
                  className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none"
                >
                  <option value="normal">Normal Information</option>
                  <option value="high">High Visibility</option>
                  <option value="urgent">Urgent Operational Alert</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#717970] mb-1 uppercase">Broadcast Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type broadcast announcement text..."
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddAnnouncementOpen(false)}
                  className="px-4 py-2 bg-[#f0eded] font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold rounded-xl shadow-md"
                >
                  Broadcast Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
