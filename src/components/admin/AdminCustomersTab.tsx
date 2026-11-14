import React, { useState, useEffect } from 'react';
import { UserProfile, Order, ReturnRecord, Review, Message } from '../../types';
import {
  fetchAllUserProfiles,
  saveUserProfile,
  fetchAllOrders,
  createAuditLog,
} from '../../services/dbService';
import { exportDataToCsv } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

export const AdminCustomersTab: React.FC = () => {
  const { userProfile: currentAdmin } = useAuth();
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('Suspicious return pattern or policy breach.');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [profiles, orders] = await Promise.all([
          fetchAllUserProfiles(),
          fetchAllOrders(),
        ]);
        const custs = profiles.filter((p) => p.role === 'customer' || !p.role);
        setCustomers(custs);
        setAllOrders(orders);
      } catch (err) {
        console.error('Error loading customers:', err);
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

  const handleToggleSuspend = async (customer: UserProfile, suspend: boolean) => {
    try {
      const updated: UserProfile = {
        ...customer,
        isSuspended: suspend,
        suspensionReason: suspend ? suspendReason : undefined,
      };
      await saveUserProfile(updated);
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? updated : c)));
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(updated);
      }
      await createAuditLog({
        userId: currentAdmin?.id || 'admin-01',
        userEmail: currentAdmin?.email || 'admin@sunno.eco',
        action: suspend ? 'SUSPEND_CUSTOMER' : 'REACTIVATE_CUSTOMER',
        resourceType: 'customers',
        resourceId: customer.id,
        details: `${suspend ? 'Suspended' : 'Reactivated'} customer account "${customer.displayName || customer.email}". Reason: ${suspendReason}`,
      });
      setIsSuspendModalOpen(false);
      showToast(suspend ? 'Customer account suspended.' : 'Customer account reactivated.');
    } catch (err) {
      console.error('Failed to update customer status:', err);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      (c.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phoneNumber || '').includes(searchQuery);
    
    if (statusFilter === 'active') return matchesSearch && !c.isSuspended;
    if (statusFilter === 'suspended') return matchesSearch && !!c.isSuspended;
    return matchesSearch;
  });

  const handleExportCsv = () => {
    const headers = ['Customer ID', 'Name', 'Email', 'Phone', 'District', 'Eco Points', 'Status', 'Created At'];
    const rows = filteredCustomers.map((c) => [
      c.id,
      c.displayName || 'Patron',
      c.email,
      c.phoneNumber || 'N/A',
      c.defaultAddress?.district || 'Dhaka',
      c.ecoPoints || 100,
      c.isSuspended ? 'Suspended' : 'Active',
      c.createdAt || 'N/A',
    ]);
    exportDataToCsv('sunno_customers_directory', headers, rows);
    showToast('Customer directory exported to CSV.');
  };

  // Get customer specific orders
  const customerOrders = selectedCustomer
    ? allOrders.filter((o) => o.userId === selectedCustomer.id || o.shippingAddress?.fullName === selectedCustomer.displayName)
    : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#002c11] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-[#a0f399]/50">
          <span className="material-symbols-outlined text-[18px] text-[#a0f399]">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#002c11] font-heading">
            Customer & Patron Accounts
          </h2>
          <p className="text-xs text-[#717970] mt-0.5">
            Manage conscious consumers, eco rewards points, order histories, and account security.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-2xl transition-colors flex items-center gap-2 border border-[#c1c9be]/40"
          >
            <span className="material-symbols-outlined text-[16px] text-[#1b6d24]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717970] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search customers by name, email, phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#c1c9be]/60 focus:border-[#1b6d24] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#1b1c1c] placeholder-[#717970] outline-none shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-[#c1c9be]/60 rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'all' ? 'bg-[#002c11] text-white' : 'text-[#414941] hover:bg-[#f0eded]'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'active' ? 'bg-emerald-700 text-white' : 'text-[#414941] hover:bg-[#f0eded]'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'suspended' ? 'bg-red-700 text-white' : 'text-[#414941] hover:bg-[#f0eded]'
            }`}
          >
            Suspended
          </button>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-white rounded-3xl border border-[#c1c9be]/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fbf9f8] border-b border-[#f0eded] text-[11px] font-bold uppercase tracking-wider text-[#717970]">
                <th className="py-4 px-6">Customer / Patron</th>
                <th className="py-4 px-4">Contact Info</th>
                <th className="py-4 px-4">District / Area</th>
                <th className="py-4 px-4">Eco Points</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0eded] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#717970]">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#717970]">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-[#f5f9f5] transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#002c11] text-[#a0f399] flex items-center justify-center font-bold text-xs shrink-0">
                          {cust.displayName ? cust.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-[#002c11]">
                            {cust.displayName || 'Conscious Buyer'}
                          </div>
                          <div className="text-[10px] text-[#717970] font-mono">
                            ID: {cust.id.slice(0, 14)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#414941]">
                      <div>{cust.email}</div>
                      <div className="text-[11px] text-[#717970]">{cust.phoneNumber || '+880 17...'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#414941]">
                      {cust.defaultAddress?.district || 'Dhaka'}, {cust.defaultAddress?.division || 'Dhaka'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1b6d24]">
                      🌿 {cust.ecoPoints || 100} pts
                    </td>
                    <td className="py-3.5 px-4">
                      {cust.isSuspended ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active Patron
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="px-3 py-1.5 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        Inspect Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detailed Profile Modal / Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#c1c9be]/60 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0eded]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#002c11] text-[#a0f399] flex items-center justify-center font-bold text-lg">
                  {selectedCustomer.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#002c11] font-heading">
                    {selectedCustomer.displayName || 'Conscious Buyer'}
                  </h3>
                  <p className="text-xs text-[#717970]">{selectedCustomer.email}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 text-[#717970] hover:text-[#002c11] rounded-full hover:bg-[#f0eded]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Status & Points Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
                <span className="text-[10px] font-bold text-[#717970] uppercase block">Account Status</span>
                <span className={`text-xs font-bold mt-1 inline-block ${selectedCustomer.isSuspended ? 'text-red-700' : 'text-emerald-700'}`}>
                  {selectedCustomer.isSuspended ? 'Suspended' : 'Verified Active'}
                </span>
              </div>
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
                <span className="text-[10px] font-bold text-[#717970] uppercase block">Eco Rewards</span>
                <span className="text-xs font-bold text-[#1b6d24] font-mono mt-1 inline-block">
                  🌿 {selectedCustomer.ecoPoints || 100} pts
                </span>
              </div>
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
                <span className="text-[10px] font-bold text-[#717970] uppercase block">Total Orders</span>
                <span className="text-xs font-bold text-[#002c11] font-mono mt-1 inline-block">
                  {customerOrders.length} Orders
                </span>
              </div>
            </div>

            {/* Default Shipping Address */}
            <div className="p-4 bg-[#f5f9f5] rounded-2xl border border-[#1b6d24]/20 space-y-1">
              <span className="text-[10px] font-bold text-[#1b6d24] uppercase tracking-wider block">
                Primary Delivery Address
              </span>
              <div className="text-xs font-bold text-[#002c11]">
                {selectedCustomer.defaultAddress?.fullName || selectedCustomer.displayName} ({selectedCustomer.defaultAddress?.phone || selectedCustomer.phoneNumber || 'N/A'})
              </div>
              <div className="text-xs text-[#414941]">
                {selectedCustomer.defaultAddress?.address || 'House 42, Road 7/A, Dhanmondi'}, {selectedCustomer.defaultAddress?.district || 'Dhaka'}, {selectedCustomer.defaultAddress?.division || 'Dhaka'}
              </div>
            </div>

            {/* Recent Orders History */}
            <div>
              <h4 className="text-xs font-bold text-[#002c11] uppercase tracking-wider mb-2">
                Order Activity ({customerOrders.length})
              </h4>
              {customerOrders.length === 0 ? (
                <div className="text-xs text-[#717970] p-4 bg-[#fbf9f8] rounded-2xl text-center">
                  No orders recorded for this customer yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerOrders.map((ord) => (
                    <div key={ord.id} className="p-3 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/30 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#002c11]">Order #{ord.id.slice(0, 10)}</div>
                        <div className="text-[11px] text-[#717970]">
                          {ord.items?.length || 1} item(s) • {new Date(ord.createdAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-[#002c11]">৳{ord.finalTotal || ord.total}</div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Administrative Action Buttons */}
            <div className="pt-4 border-t border-[#f0eded] flex items-center justify-between gap-3">
              {selectedCustomer.isSuspended ? (
                <button
                  onClick={() => handleToggleSuspend(selectedCustomer, false)}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-2xl transition-colors"
                >
                  Reactivate Customer Account
                </button>
              ) : (
                <button
                  onClick={() => setIsSuspendModalOpen(true)}
                  className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-2xl transition-colors"
                >
                  Suspend Account
                </button>
              )}

              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2.5 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-2xl transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal with Mandatory Reason */}
      {isSuspendModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <h3 className="text-lg font-bold text-[#002c11] font-heading">
              Suspend Customer Account?
            </h3>
            <p className="text-xs text-[#414941] leading-relaxed">
              This will block <strong>{selectedCustomer.displayName}</strong> ({selectedCustomer.email}) from placing new orders or participating in reviews until reinstated.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#717970] mb-1.5 uppercase">
                Mandatory Suspension Reason (Audit Log)
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 focus:border-red-600 rounded-2xl p-3 text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsSuspendModalOpen(false)}
                className="px-4 py-2 bg-[#f0eded] text-[#414941] text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleSuspend(selectedCustomer, true)}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
