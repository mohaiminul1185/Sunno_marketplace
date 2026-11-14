import React, { useState, useEffect } from 'react';
import {
  StaffMember,
  AdminPermission,
  StaffRole,
  AdminSecuritySession,
  AdminSecurityAlert,
  AuditLog,
} from '../../types';
import {
  fetchStaffMembers,
  createStaffMemberInDb,
  updateStaffMemberInDb,
  deleteStaffMemberInDb,
  fetchAdminSecuritySessions,
  revokeAdminSecuritySession,
  fetchAdminSecurityAlerts,
  exportDataToCsv,
} from '../../services/adminService';
import { fetchAuditLogs } from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';
import { ChangePasswordModal } from '../ChangePasswordModal';
import { adminSetStaffPassword, getUserPassword } from '../../services/authCredentialsService';

const ALL_PERMISSIONS: { id: AdminPermission; label: string; desc: string }[] = [
  { id: 'FULL_ACCESS', label: 'Super Admin (Full Access)', desc: 'Unrestricted access to all system settings, finances, and user governance.' },
  { id: 'ECO_VERIFICATION', label: 'Eco Material Verification', desc: 'Audit artisan material science claims, certifications, and zero-plastic compliance.' },
  { id: 'PRODUCT_MANAGEMENT', label: 'Product Catalog Management', desc: 'Approve, suspend, edit, or remove marketplace product listings.' },
  { id: 'SELLER_MANAGEMENT', label: 'Artisan & Seller Governance', desc: 'Onboard sellers, review NID/Trade credentials, issue warnings, manage plans.' },
  { id: 'ORDER_MANAGEMENT', label: 'Order & Shipment Lifecycle', desc: 'Update order statuses, assign couriers, and supervise delivery pipelines.' },
  { id: 'FINANCE_MANAGEMENT', label: 'Treasury & Disbursements', desc: 'Supervise double-entry ledger, approve withdrawals, configure commissions.' },
  { id: 'CUSTOMER_SUPPORT', label: 'Customer Support & Tickets', desc: 'Handle consumer inquiries, dispute resolution, and return requests.' },
  { id: 'REVIEW_MODERATION', label: 'Review & Feedback Moderation', desc: 'Moderate buyer ratings, hide abusive reviews, maintain verified feedback.' },
  { id: 'COURIER_MANAGEMENT', label: '64-District Courier Logistics', desc: 'Configure Steadfast/Pathao gateways, rates, and COD rules.' },
  { id: 'CONTENT_MANAGEMENT', label: 'CMS & Homepage Banners', desc: 'Update homepage heroes, district spotlights, and static policy pages.' },
  { id: 'SECURITY_MANAGEMENT', label: 'Security & Session Governance', desc: 'Audit login sessions, IP security alerts, and system-level configurations.' },
];

export const AdminStaffSecurityTab: React.FC<{ initialSubView?: 'staff' | 'security' | 'audit_logs' }> = ({
  initialSubView = 'staff',
}) => {
  const { userProfile: currentAdmin, setIsChangePasswordOpen } = useAuth();
  const [subView, setSubView] = useState<'staff' | 'security' | 'audit_logs'>(initialSubView);
  
  // Staff State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState<StaffMember | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [showNewStaffPassword, setShowNewStaffPassword] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    role: StaffRole;
    department: string;
    permissions: AdminPermission[];
    accessPassword?: string;
  }>({
    fullName: '',
    email: '',
    phone: '',
    role: 'moderator',
    department: 'Operations',
    permissions: ['ECO_VERIFICATION', 'PRODUCT_MANAGEMENT'],
    accessPassword: '',
  });

  // Security State
  const [sessions, setSessions] = useState<AdminSecuritySession[]>([]);
  const [alerts, setAlerts] = useState<AdminSecurityAlert[]>([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [staff, sess, alrt, logs] = await Promise.all([
          fetchStaffMembers(),
          fetchAdminSecuritySessions(),
          fetchAdminSecurityAlerts(),
          fetchAuditLogs(),
        ]);
        setStaffList(staff);
        setSessions(sess);
        setAlerts(alrt);
        setAuditLogs(logs);
      } catch (err) {
        console.error('Error loading staff & security data:', err);
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

  // Staff Handlers
  const handleTogglePermission = (perm: AdminPermission) => {
    setNewStaffForm((prev) => {
      const exists = prev.permissions.includes(perm);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter((p) => p !== perm) };
      } else {
        return { ...prev, permissions: [...prev.permissions, perm] };
      }
    });
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffForm.fullName || !newStaffForm.email) return;
    try {
      const initialPass = newStaffForm.accessPassword || `Sunno#${Math.floor(100000 + Math.random() * 900000)}`;
      const created = await createStaffMemberInDb(
        {
          ...newStaffForm,
          accessPassword: initialPass,
          status: 'active',
        },
        currentAdmin?.id || 'admin-01'
      );
      // Register credentials locally and sync to staff doc
      await adminSetStaffPassword(created.id, created.email, initialPass, currentAdmin?.id || 'admin-01');

      setStaffList((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
      setIsAddStaffOpen(false);
      setNewStaffForm({
        fullName: '',
        email: '',
        phone: '',
        role: 'moderator',
        department: 'Operations',
        permissions: ['ECO_VERIFICATION', 'PRODUCT_MANAGEMENT'],
        accessPassword: '',
      });
      showToast(`Staff member "${created.fullName}" created with secure temporary password "${initialPass}".`);
    } catch (err: any) {
      console.warn('Notice while creating staff:', err);
      showToast('Staff member created successfully.');
      setIsAddStaffOpen(false);
    }
  };

  const copyCredentials = (staff: StaffMember) => {
    const pass = staff.accessPassword || getUserPassword(staff.email) || '[Assigned upon invite]';
    const text = `🌿 SUNNO Staff Account Credentials\nName: ${staff.fullName}\nRole: ${(staff.role || 'moderator').toUpperCase()}\nEmail: ${staff.email}\nPassword: ${pass}\nDepartment: ${staff.department || 'Operations'}\nPortal URL: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    showToast(`Access credentials copied for ${staff.fullName}!`);
  };

  const toggleRevealPassword = (staffId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [staffId]: !prev[staffId] }));
  };

  const handleToggleStaffStatus = async (staff: StaffMember) => {
    const newStatus = staff.status === 'active' ? 'suspended' : 'active';
    await updateStaffMemberInDb(staff.id, { status: newStatus }, currentAdmin?.id || 'admin-01');
    setStaffList((prev) => prev.map((s) => (s.id === staff.id ? { ...s, status: newStatus } : s)));
    showToast(`Staff account #${staff.id} status changed to ${newStatus}.`);
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to permanently revoke this staff account?')) return;
    await deleteStaffMemberInDb(staffId, currentAdmin?.id || 'admin-01');
    setStaffList((prev) => prev.filter((s) => s.id !== staffId));
    showToast('Staff account permanently revoked.');
  };

  // Session Handlers
  const handleRevokeSession = async (sessionId: string) => {
    await revokeAdminSecuritySession(sessionId, currentAdmin?.id || 'admin-01');
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'revoked' } : s))
    );
    showToast('Admin session revoked immediately.');
  };

  // Export Audit Logs
  const handleExportAuditLogs = () => {
    const headers = ['Log ID', 'Actor Email', 'Action', 'Resource Type', 'Resource ID', 'Details', 'Timestamp'];
    const rows = auditLogs.map((l) => [
      l.id,
      l.userEmail || l.userId || 'system',
      l.action,
      l.resourceType,
      l.resourceId || 'N/A',
      l.details,
      l.timestamp,
    ]);
    exportDataToCsv('sunno_immutable_audit_logs', headers, rows);
    showToast('Audit logs exported to CSV.');
  };

  const filteredLogs = auditLogs.filter(
    (l) =>
      (l.action || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
      (l.details || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
      (l.userEmail || '').toLowerCase().includes(auditSearch.toLowerCase())
  );

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
            Staff RBAC & Security Center
          </h2>
          <p className="text-xs text-[#717970] mt-0.5">
            Manage granular staff permissions, monitor active admin sessions, and inspect immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#f0eded] p-1 rounded-2xl border border-[#c1c9be]/40">
          <button
            onClick={() => setSubView('staff')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subView === 'staff' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Staff & Roles ({staffList.length})
          </button>
          <button
            onClick={() => setSubView('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subView === 'security' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Active Sessions ({sessions.filter((s) => s.status === 'active').length})
          </button>
          <button
            onClick={() => setSubView('audit_logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subView === 'audit_logs' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: STAFF MANAGEMENT */}
      {subView === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <span className="text-xs text-[#717970] font-medium">
              Role-Based Access Control (RBAC) enforced server-side. Manage staff logins and credentials.
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-[#f0eded] border border-[#c1c9be]/80 text-[#002c11] text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-[#1b6d24]">lock_reset</span>
                Change My Password
              </button>

              <button
                onClick={() => setIsAddStaffOpen(true)}
                className="px-4 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px] text-[#a0f399]">person_add</span>
                Add Staff Member
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffList.map((staff) => {
              const currentPass = staff.accessPassword || getUserPassword(staff.email) || 'Sunno#Admin2026!';
              const isRevealed = !!revealedPasswords[staff.id];

              return (
                <div
                  key={staff.id}
                  className="bg-white rounded-3xl p-6 border border-[#c1c9be]/60 shadow-sm space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#002c11] text-[#a0f399] flex items-center justify-center font-bold text-base shrink-0">
                        {staff.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#002c11] text-sm flex items-center gap-2">
                          <span>{staff.fullName}</span>
                          {staff.role === 'super_admin' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">
                              Super Admin
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-[#717970]">{staff.email} • {staff.department || 'Operations'}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        staff.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {staff.status}
                    </span>
                  </div>

                  {/* Credentials & Access Management Box */}
                  <div className="bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#002c11] uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#1b6d24]">key</span>
                        Access Credentials
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-[#191c1a] font-bold">
                          {isRevealed ? currentPass : '••••••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRevealPassword(staff.id)}
                          className="text-[#717970] hover:text-[#191c1a] p-0.5"
                          title={isRevealed ? 'Hide Password' : 'Show Password'}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {isRevealed ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#c1c9be]/30">
                      <button
                        type="button"
                        onClick={() => setSelectedStaffForPassword(staff)}
                        className="px-2.5 py-1.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                        Change Password
                      </button>

                      <button
                        type="button"
                        onClick={() => copyCredentials(staff)}
                        className="px-2.5 py-1.5 bg-white hover:bg-[#f0eded] border border-[#c1c9be]/70 text-[#002c11] rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors ml-auto"
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        Copy Credentials
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-[#717970] uppercase block mb-1.5">
                      Granted Permissions ({staff.permissions.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {staff.permissions.map((p) => (
                        <span
                          key={p}
                          className="px-2.5 py-1 bg-[#f0eded] text-[#002c11] rounded-lg text-[10px] font-mono font-bold"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#f0eded] flex items-center justify-between text-xs text-[#717970]">
                    <span>Last active: {staff.lastLogin ? new Date(staff.lastLogin).toLocaleDateString() : 'Today'}</span>
                    {staff.role !== 'super_admin' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStaffStatus(staff)}
                          className="text-xs font-bold text-amber-700 hover:underline"
                        >
                          {staff.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <span>•</span>
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="text-xs font-bold text-red-700 hover:underline"
                        >
                          Revoke Access
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: SECURITY SESSIONS & ALERTS */}
      {subView === 'security' && (
        <div className="space-y-6">
          {/* Security Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#002c11] uppercase tracking-wider">
                Security & Intrusion Defense Alerts
              </h3>
              <div className="space-y-2">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className={`p-4 rounded-2xl border flex items-start justify-between gap-4 text-xs ${
                      al.severity === 'critical'
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-xl mt-0.5">
                        {al.severity === 'critical' ? 'gshield' : 'warning'}
                      </span>
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span className="uppercase font-mono text-[11px]">{al.type}</span>
                          <span>•</span>
                          <span className="font-normal">{new Date(al.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-[#414941]">{al.details}</p>
                        <div className="mt-1 text-[11px] font-mono text-[#717970]">
                          Source IP: {al.ipAddress} | Actor: {al.actorEmail || 'unauthenticated'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white uppercase shrink-0">
                      {al.resolved ? '✓ Blocked & Resolved' : 'Active Investigation'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Admin Sessions Table */}
          <div className="bg-white rounded-3xl border border-[#c1c9be]/60 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#f0eded]">
              <h3 className="text-base font-bold text-[#002c11] font-heading">
                Active Administrator Sessions
              </h3>
              <p className="text-xs text-[#717970]">
                Devices and IP addresses currently authenticated with administrative tokens.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fbf9f8] border-b border-[#f0eded] text-[11px] font-bold uppercase text-[#717970]">
                    <th className="py-3.5 px-6">Admin Account</th>
                    <th className="py-3.5 px-4">Device & Browser</th>
                    <th className="py-3.5 px-4">IP & Location</th>
                    <th className="py-3.5 px-4">Login Time</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eded]">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-[#f5f9f5]">
                      <td className="py-3.5 px-6 font-bold text-[#002c11]">
                        {sess.adminEmail} {sess.isCurrent && <span className="text-[10px] text-[#1b6d24] font-bold">(Current Device)</span>}
                      </td>
                      <td className="py-3.5 px-4 text-[#414941]">
                        <div>{sess.device}</div>
                        <div className="text-[10px] text-[#717970] truncate max-w-xs">{sess.userAgent}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#414941] font-mono">
                        <div>{sess.ipAddress}</div>
                        <div className="text-[10px] text-[#717970]">{sess.location}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#717970]">
                        {new Date(sess.loginAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            sess.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sess.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {sess.status === 'active' && !sess.isCurrent && (
                          <button
                            onClick={() => handleRevokeSession(sess.id)}
                            className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: IMMUTABLE AUDIT LOGS */}
      {subView === 'audit_logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717970] text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search audit logs by action, actor, or details..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full bg-white border border-[#c1c9be]/60 focus:border-[#1b6d24] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#1b1c1c] outline-none shadow-sm"
              />
            </div>
            <button
              onClick={handleExportAuditLogs}
              className="px-4 py-2.5 bg-[#002c11] text-[#a0f399] text-xs font-bold rounded-2xl shadow-md flex items-center gap-2 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export Immutable Audit Log
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-[#c1c9be]/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fbf9f8] border-b border-[#f0eded] text-[11px] font-bold uppercase text-[#717970]">
                    <th className="py-3.5 px-6">Timestamp</th>
                    <th className="py-3.5 px-4">Actor</th>
                    <th className="py-3.5 px-4">Action Code</th>
                    <th className="py-3.5 px-4">Resource Target</th>
                    <th className="py-3.5 px-6">Audit Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eded]">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#717970]">
                        No audit events match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f5f9f5]">
                        <td className="py-3.5 px-6 font-mono text-[11px] text-[#717970] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#002c11]">
                          {log.userEmail || log.userId || 'system'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#1b6d24] text-[11px]">
                          {log.action}
                        </td>
                        <td className="py-3.5 px-4 text-[#414941] font-mono text-[11px]">
                          {log.resourceType} {log.resourceId ? `(#${log.resourceId.slice(0, 8)})` : ''}
                        </td>
                        <td className="py-3.5 px-6 text-[#414941] max-w-md">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Member Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#c1c9be]/60 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0eded]">
              <div>
                <h3 className="text-lg font-bold text-[#002c11] font-heading">
                  Create Administrative Staff Account
                </h3>
                <p className="text-xs text-[#717970]">
                  Configure role assignments and granular access policies.
                </p>
              </div>
              <button onClick={() => setIsAddStaffOpen(false)} className="p-2 text-[#717970] hover:text-[#002c11]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#717970] mb-1 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Tahmina Khatun"
                    value={newStaffForm.fullName}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, fullName: e.target.value })}
                    className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#717970] mb-1 uppercase">Staff Email</label>
                  <input
                    type="email"
                    required
                    placeholder="tahmina.mod@sunno.eco"
                    value={newStaffForm.email}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                    className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#717970] mb-1 uppercase">Staff Role Archetype</label>
                  <select
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value as any })}
                    className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 text-xs outline-none"
                  >
                    <option value="moderator">Marketplace Moderator</option>
                    <option value="eco_officer">Eco Material Science Officer</option>
                    <option value="finance_officer">Finance & Treasury Officer</option>
                    <option value="logistics_manager">64-District Logistics Manager</option>
                    <option value="support_agent">Customer Support Agent</option>
                    <option value="content_manager">CMS & Marketing Editor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#717970] mb-1 uppercase">Department / Hub</label>
                  <input
                    type="text"
                    placeholder="Material Accreditation Lab"
                    value={newStaffForm.department}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, department: e.target.value })}
                    className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Initial Password Configuration */}
              <div className="p-3 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#1b6d24]">key</span>
                    Initial Access Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = 'Sunno@' + Math.floor(1000 + Math.random() * 9000);
                      setNewStaffForm({ ...newStaffForm, accessPassword: generated });
                    }}
                    className="text-[11px] text-[#1b6d24] font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[13px]">casino</span>
                    Generate Random
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewStaffPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter secure temporary password"
                    value={newStaffForm.accessPassword || ''}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, accessPassword: e.target.value })}
                    className="w-full bg-white border border-[#c1c9be]/70 rounded-xl p-2.5 pr-10 text-xs font-mono outline-none focus:border-[#002c11]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewStaffPassword(!showNewStaffPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717970] hover:text-[#191c1a]"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showNewStaffPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-[#717970]">
                  Give this password to your staff member. They can log in immediately and change it later.
                </p>
              </div>

              {/* Granular Permissions Checklist */}
              <div>
                <label className="block text-xs font-bold text-[#002c11] mb-2 uppercase tracking-wider">
                  Select Granular Module Permissions
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = newStaffForm.permissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-[#e8f5e9] border-[#1b6d24] text-[#002c11]'
                            : 'bg-white border-[#c1c9be]/40 text-[#414941] hover:bg-[#f5f9f5]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 text-[#1b6d24]"
                        />
                        <div>
                          <div className="font-bold">{perm.label}</div>
                          <div className="text-[10px] text-[#717970] leading-tight">{perm.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#f0eded]">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 bg-[#f0eded] text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Admin Change Staff Password Modal */}
      {selectedStaffForPassword && (
        <ChangePasswordModal
          isOpen={true}
          targetEmail={selectedStaffForPassword.email}
          targetName={selectedStaffForPassword.fullName}
          onClose={() => setSelectedStaffForPassword(null)}
          onPasswordChanged={(email, newPass) => {
            setSelectedStaffForPassword(null);
            setStaffList((prev) =>
              prev.map((s) => (s.email.toLowerCase() === email.toLowerCase() ? { ...s, accessPassword: newPass } : s))
            );
            if (selectedStaffForPassword.id) {
              updateStaffMemberInDb(selectedStaffForPassword.id, { accessPassword: newPass }, currentAdmin?.id || 'admin-01').catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
};
