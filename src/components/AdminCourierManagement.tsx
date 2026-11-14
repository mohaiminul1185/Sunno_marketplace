import React, { useState, useEffect } from 'react';
import {
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Printer,
  ExternalLink,
  Settings,
  DollarSign,
  Package,
  Clock,
  MapPin,
  Leaf,
  Plus,
} from 'lucide-react';
import {
  CourierProviderConfig,
  DeliverySetting,
  Shipment,
  ShipmentStatus,
  Invoice,
} from '../types';
import {
  fetchCourierProviders,
  updateCourierProviderConfig,
  fetchDeliverySettings,
  updateDeliverySettings,
  fetchAllShipments,
  getOfficialInvoiceForOrder,
} from '../services/courierService';
import { TrackingModal } from './TrackingModal';
import { InvoiceModal } from './InvoiceModal';
import { ParcelLabelModal } from './ParcelLabelModal';

export const AdminCourierManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'providers' | 'rates' | 'shipments' | 'returns'>('providers');
  const [providers, setProviders] = useState<CourierProviderConfig[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySetting | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedCourierFilter, setSelectedCourierFilter] = useState<string>('ALL');

  // Modals
  const [activeTrackingShipment, setActiveTrackingShipment] = useState<Shipment | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [activeLabelShipment, setActiveLabelShipment] = useState<Shipment | null>(null);

  // Selected Provider for Editing
  const [editingProvider, setEditingProvider] = useState<CourierProviderConfig | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [provs, settings, allShipments] = await Promise.all([
        fetchCourierProviders(),
        fetchDeliverySettings(),
        fetchAllShipments(),
      ]);
      setProviders(provs);
      setDeliverySettings(settings);
      setShipments(allShipments);
    } catch (err) {
      console.error('Failed to load courier admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleProvider = async (provider: CourierProviderConfig) => {
    try {
      const updated = await updateCourierProviderConfig(provider.id, {
        enabled: !provider.enabled,
      });
      setProviders((prev) => prev.map((p) => (p.id === provider.id ? updated : p)));
      showToast(`${provider.name} is now ${!provider.enabled ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      console.error(err);
      showToast('Error toggling courier provider.');
    }
  };

  const handleToggleTestMode = async (provider: CourierProviderConfig) => {
    try {
      const updated = await updateCourierProviderConfig(provider.id, {
        testMode: !provider.testMode,
      });
      setProviders((prev) => prev.map((p) => (p.id === provider.id ? updated : p)));
      showToast(`${provider.name} mode switched to ${!provider.testMode ? 'Sandbox' : 'Production Live'}`);
    } catch (err) {
      console.error(err);
      showToast('Error updating courier mode.');
    }
  };

  const handleSaveProviderConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;
    try {
      const updated = await updateCourierProviderConfig(editingProvider.id, editingProvider);
      setProviders((prev) => prev.map((p) => (p.id === editingProvider.id ? updated : p)));
      setEditingProvider(null);
      showToast(`Updated settings for ${editingProvider.name}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to save courier configuration.');
    }
  };

  const handleSaveDeliveryRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverySettings) return;
    try {
      const updated = await updateDeliverySettings(deliverySettings);
      setDeliverySettings(updated);
      showToast('Delivery rate matrix and free-shipping threshold saved.');
    } catch (err) {
      console.error(err);
      showToast('Failed to save delivery rates.');
    }
  };

  const handleOpenInvoice = async (shipment: Shipment) => {
    try {
      const inv = await getOfficialInvoiceForOrder(shipment.orderId);
      if (inv) {
        setActiveInvoice(inv);
      } else {
        showToast('Generating draft invoice for this consignment...');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered shipments
  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.consignmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatusFilter === 'ALL' || s.status === selectedStatusFilter;

    const matchesCourier =
      selectedCourierFilter === 'ALL' || s.courierId === selectedCourierFilter;

    return matchesSearch && matchesStatus && matchesCourier;
  });

  const returnShipments = shipments.filter(
    (s) =>
      s.status.startsWith('RTO') ||
      s.status.startsWith('RETURN') ||
      s.status === 'DELIVERY_FAILED'
  );

  return (
    <div id="admin-courier-management-view" className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Navigation Pills */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-[#a0f399]" />
            Courier & Delivery Management
          </h2>
          <p className="text-xs text-[#80a48b] mt-1">
            Configure courier APIs, 64-district delivery rates, consignment tracking, and return workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-courier-admin-btn"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#173824] hover:bg-[#1f4b30] text-[#a0f399] border border-[#2d6842] rounded-xl text-xs font-semibold transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-[#184628] border border-[#a0f399] rounded-xl text-[#a0f399] text-xs font-bold shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex border-b border-[#1b4128] gap-2 overflow-x-auto pb-1">
        {[
          { id: 'providers', label: 'Courier Providers (6)', icon: 'local_shipping' },
          { id: 'rates', label: 'Delivery Rate Matrix', icon: 'payments' },
          { id: 'shipments', label: `Active Consignments (${shipments.length})`, icon: 'inventory' },
          { id: 'returns', label: `Returns & RTO (${returnShipments.length})`, icon: 'assignment_return' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === tab.id
                ? 'bg-[#183f27] text-[#a0f399] border border-[#2d6842]'
                : 'text-[#88a992] hover:bg-[#12281b] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: COURIER PROVIDERS */}
      {activeSubTab === 'providers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((p) => (
              <div
                key={p.id}
                className={`bg-[#0e2115] border rounded-3xl p-6 relative flex flex-col justify-between transition-all ${
                  p.enabled ? 'border-[#235032]' : 'border-[#1b3322] opacity-75'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-[#14301e] border border-[#224d31] flex items-center justify-center text-white font-bold">
                        <Truck className="w-5 h-5 text-[#a0f399]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{p.name}</h3>
                        <p className="text-[10px] text-[#7ca087] font-mono">ID: {p.id}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.enabled ? 'bg-[#184628] text-[#a0f399]' : 'bg-red-950 text-red-300'
                      }`}
                    >
                      {p.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {/* Mode & Env Credentials */}
                  <div className="mt-3 py-3 border-y border-[#183923] space-y-2 text-xs text-[#c1d9c7]">
                    <div className="flex justify-between">
                      <span className="text-[#7ca087]">Environment:</span>
                      <span
                        className={`font-bold font-mono text-[11px] ${
                          p.testMode ? 'text-amber-400' : 'text-[#a0f399]'
                        }`}
                      >
                        {p.testMode ? 'Sandbox (Test)' : 'Production (Live)'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#7ca087]">Inside Dhaka Rate:</span>
                      <span className="font-bold text-white font-mono">৳{p.baseRateInsideDhaka}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#7ca087]">Outside Dhaka Rate:</span>
                      <span className="font-bold text-white font-mono">৳{p.baseRateOutsideDhaka}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#7ca087]">COD Charge:</span>
                      <span className="font-bold text-[#a0f399] font-mono">{p.codPercentage}%</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#7ca087]">API Config:</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          p.hasCredentials ? 'bg-[#1b4e2b] text-[#a0f399]' : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {p.hasCredentials ? '✓ Ready / Env Set' : 'Custom / Unset'}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-[#88a992] leading-relaxed">
                    {p.instructions || 'Official courier gateway integration.'}
                  </p>
                </div>

                {/* Card Controls */}
                <div className="mt-6 pt-4 border-t border-[#183923] flex flex-wrap gap-2">
                  <button
                    onClick={() => handleToggleProvider(p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      p.enabled
                        ? 'bg-red-950/60 hover:bg-red-900 text-red-300'
                        : 'bg-[#1b4d2b] hover:bg-[#25683b] text-[#a0f399]'
                    }`}
                  >
                    {p.enabled ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    onClick={() => handleToggleTestMode(p)}
                    className="px-3 py-2 bg-[#142d1d] hover:bg-[#1d432b] text-[#c1d9c7] text-xs font-medium rounded-xl transition-all border border-[#20472d]"
                  >
                    {p.testMode ? 'Set Live' : 'Set Sandbox'}
                  </button>

                  <button
                    onClick={() => setEditingProvider(p)}
                    className="p-2 bg-[#173824] hover:bg-[#1e4a30] text-[#a0f399] rounded-xl transition-all"
                    title="Edit API keys and rates"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Provider Modal */}
          {editingProvider && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
                <div className="flex justify-between items-center pb-3 border-b border-[#1b4128]">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Configure {editingProvider.name}
                    </h3>
                    <p className="text-[11px] text-[#7ca087]">
                      Credentials stored safely in backend / environment variables.
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingProvider(null)}
                    className="text-[#7ca087] hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveProviderConfig} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white font-bold mb-1">Base Inside Dhaka (৳)</label>
                      <input
                        type="number"
                        value={editingProvider.baseRateInsideDhaka}
                        onChange={(e) =>
                          setEditingProvider({
                            ...editingProvider,
                            baseRateInsideDhaka: Number(e.target.value),
                          })
                        }
                        className="w-full bg-[#132c1c] border border-[#1f482d] rounded-xl px-3 py-2 text-white outline-none focus:border-[#a0f399]"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-bold mb-1">Base Outside Dhaka (৳)</label>
                      <input
                        type="number"
                        value={editingProvider.baseRateOutsideDhaka}
                        onChange={(e) =>
                          setEditingProvider({
                            ...editingProvider,
                            baseRateOutsideDhaka: Number(e.target.value),
                          })
                        }
                        className="w-full bg-[#132c1c] border border-[#1f482d] rounded-xl px-3 py-2 text-white outline-none focus:border-[#a0f399]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white font-bold mb-1">COD Fee (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingProvider.codPercentage}
                        onChange={(e) =>
                          setEditingProvider({
                            ...editingProvider,
                            codPercentage: Number(e.target.value),
                          })
                        }
                        className="w-full bg-[#132c1c] border border-[#1f482d] rounded-xl px-3 py-2 text-white outline-none focus:border-[#a0f399]"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-bold mb-1">Additional Per Kg (৳)</label>
                      <input
                        type="number"
                        value={editingProvider.perKgExtraRate || 20}
                        onChange={(e) =>
                          setEditingProvider({
                            ...editingProvider,
                            perKgExtraRate: Number(e.target.value),
                          })
                        }
                        className="w-full bg-[#132c1c] border border-[#1f482d] rounded-xl px-3 py-2 text-white outline-none focus:border-[#a0f399]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-bold mb-1">API Key / Token (Masked)</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={editingProvider.apiKey || ''}
                      onChange={(e) =>
                        setEditingProvider({
                          ...editingProvider,
                          apiKey: e.target.value,
                        })
                      }
                      className="w-full bg-[#132c1c] border border-[#1f482d] rounded-xl px-3 py-2 text-white outline-none focus:border-[#a0f399]"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-bold mb-1">Webhook Secret</label>
                    <input
                      type="password"
                      placeholder="Optional webhook verification secret"
                      value={editingProvider.webhookSecret || ''}
                      onChange={(e) =>
                        setEditingProvider({
                          ...editingProvider,
                          webhookSecret: e.target.value,
                        })
                      }
                      className="w-full bg-[#132c1c] border border-[#1f482d] rounded-xl px-3 py-2 text-white outline-none focus:border-[#a0f399]"
                    />
                  </div>

                  <div className="pt-3 border-t border-[#183923] flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProvider(null)}
                      className="px-4 py-2 bg-[#173824] text-[#a0f399] font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#a0f399] text-[#002204] font-extrabold rounded-xl"
                    >
                      Save Configuration
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: DELIVERY RATE MATRIX */}
      {activeSubTab === 'rates' && deliverySettings && (
        <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 sm:p-8 max-w-2xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Default Bangladesh Delivery Matrix</h3>
            <p className="text-xs text-[#80a48b] mt-1">
              Applied automatically across customer cart checkout & seller dispatch calculations.
            </p>
          </div>

          <form onSubmit={handleSaveDeliveryRates} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-bold mb-1">Inside Dhaka Default Fee (৳)</label>
                <input
                  type="number"
                  value={deliverySettings.defaultInsideDhaka}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      defaultInsideDhaka: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#132c1c] border border-[#1f482d] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-white font-bold mb-1">Outside Dhaka Default Fee (৳)</label>
                <input
                  type="number"
                  value={deliverySettings.defaultOutsideDhaka}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      defaultOutsideDhaka: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#132c1c] border border-[#1f482d] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-bold mb-1">Free Delivery Threshold (৳)</label>
                <input
                  type="number"
                  value={deliverySettings.freeDeliveryThreshold}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      freeDeliveryThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#132c1c] border border-[#1f482d] rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-[#7ca087]">Cart orders above this get free standard shipping.</span>
              </div>

              <div>
                <label className="block text-white font-bold mb-1">Express Delivery Surcharge (৳)</label>
                <input
                  type="number"
                  value={deliverySettings.expressDeliverySurcharge}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      expressDeliverySurcharge: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#132c1c] border border-[#1f482d] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#183923] flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] font-extrabold text-xs rounded-xl shadow-md transition-all"
              >
                Save Delivery Rules
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: ACTIVE CONSIGNMENTS & SHIPMENTS */}
      {activeSubTab === 'shipments' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0e2115] border border-[#1b4128] rounded-2xl p-4">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[#7ca087]" />
              <input
                type="text"
                placeholder="Search tracking code, consignment, customer or order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-[#5c8067] outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCourierFilter}
                onChange={(e) => setSelectedCourierFilter(e.target.value)}
                className="bg-[#132c1c] border border-[#1f482d] text-white text-xs rounded-xl px-3 py-1.5 outline-none"
              >
                <option value="ALL">All Couriers</option>
                <option value="pathao">Pathao</option>
                <option value="steadfast">Steadfast</option>
                <option value="redx">RedX</option>
                <option value="paperfly">Paperfly</option>
                <option value="ecourier">eCourier</option>
                <option value="sunno_eco">SUNNO Eco</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-[#132c1c] border border-[#1f482d] text-white text-xs rounded-xl px-3 py-1.5 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="READY_FOR_SHIPMENT">READY_FOR_SHIPMENT</option>
                <option value="PICKED_UP">PICKED_UP</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="DELIVERY_FAILED">DELIVERY_FAILED</option>
                <option value="RTO_IN_TRANSIT">RTO_IN_TRANSIT</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-[#c1d9c7]">
              <thead className="bg-[#122c1c] text-[#7ca087] uppercase font-bold text-[10px] tracking-wider border-b border-[#1b4128]">
                <tr>
                  <th className="py-3.5 px-4">Tracking & Consignment</th>
                  <th className="py-3.5 px-4">Courier Partner</th>
                  <th className="py-3.5 px-4">Recipient & District</th>
                  <th className="py-3.5 px-4">Artisan Origin</th>
                  <th className="py-3.5 px-4">COD Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#183923]">
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#7ca087]">
                      No consignment records matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-[#132c1c]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-[#a0f399]">
                          {shipment.trackingNumber}
                        </div>
                        <div className="text-[10px] text-[#7ca087] font-mono">
                          Order: #{shipment.orderNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white">{shipment.courierName}</span>
                        <div className="text-[10px] text-[#7ca087] capitalize">{shipment.serviceType}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{shipment.customerName}</div>
                        <div className="text-[10px] text-[#7ca087]">
                          {shipment.deliveryAddress.district}, {shipment.deliveryAddress.division}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-stone-300">{shipment.sellerName}</div>
                        <div className="text-[10px] text-[#7ca087]">{shipment.pickupAddress.district}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {shipment.codAmount > 0 ? `৳${shipment.codAmount}` : '৳0 (Prepaid)'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            shipment.status === 'DELIVERED'
                              ? 'bg-[#184628] text-[#a0f399]'
                              : shipment.status === 'OUT_FOR_DELIVERY' || shipment.status === 'IN_TRANSIT'
                              ? 'bg-blue-950 text-blue-300'
                              : shipment.status.startsWith('RTO') || shipment.status === 'DELIVERY_FAILED'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-[#1c3624] text-[#8cb296]'
                          }`}
                        >
                          {shipment.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setActiveTrackingShipment(shipment)}
                          className="px-2.5 py-1 bg-[#173824] hover:bg-[#1e4a30] text-[#a0f399] text-[10px] font-bold rounded-lg transition-all"
                        >
                          Track
                        </button>
                        <button
                          onClick={() => setActiveLabelShipment(shipment)}
                          className="px-2.5 py-1 bg-[#142d1d] hover:bg-[#1c3d28] text-white text-[10px] font-bold rounded-lg transition-all border border-[#20452d]"
                          title="Print 4x6 shipping label"
                        >
                          Label
                        </button>
                        <button
                          onClick={() => handleOpenInvoice(shipment)}
                          className="px-2.5 py-1 bg-[#142d1d] hover:bg-[#1c3d28] text-white text-[10px] font-bold rounded-lg transition-all border border-[#20452d]"
                          title="View Tax Invoice"
                        >
                          Invoice
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: RETURNS & RTO WORKFLOW */}
      {activeSubTab === 'returns' && (
        <div className="bg-[#0e2115] border border-[#1b4128] rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Return to Origin (RTO) & Failed Delivery Ledger</h3>
            <p className="text-xs text-[#80a48b] mt-1">
              Parcels refused, undelivered, or undergoing reverse logistics back to the artisan workshop cluster.
            </p>
          </div>

          <div className="divide-y divide-[#183923] text-xs">
            {returnShipments.length === 0 ? (
              <div className="py-8 text-center text-[#7ca087]">
                Zero active return/RTO parcels. All shipments moving smoothly!
              </div>
            ) : (
              returnShipments.map((r) => (
                <div key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{r.trackingNumber}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold text-[10px]">
                        {r.status}
                      </span>
                    </div>
                    <p className="text-stone-300 text-xs mt-1">
                      Customer: {r.customerName} ({r.deliveryAddress.district}) • Return To: {r.sellerName} ({r.pickupAddress.district})
                    </p>
                    <p className="text-[11px] text-amber-200 mt-0.5">
                      Reason: {r.returnReason || r.failureReason || 'Customer unreachable / refused delivery'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTrackingShipment(r)}
                      className="px-3 py-1.5 bg-[#173824] hover:bg-[#1e4a30] text-[#a0f399] font-bold text-xs rounded-xl"
                    >
                      Track Reverse Transit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {activeTrackingShipment && (
        <TrackingModal
          shipment={activeTrackingShipment}
          onClose={() => setActiveTrackingShipment(null)}
          canManageStatus={true}
          onViewInvoice={() => {
            handleOpenInvoice(activeTrackingShipment);
            setActiveTrackingShipment(null);
          }}
        />
      )}

      {activeInvoice && (
        <InvoiceModal
          invoice={activeInvoice}
          onClose={() => setActiveInvoice(null)}
        />
      )}

      {activeLabelShipment && (
        <ParcelLabelModal
          shipment={activeLabelShipment}
          onClose={() => setActiveLabelShipment(null)}
        />
      )}
    </div>
  );
};
