import React, { useState } from 'react';
import { Notification, SellerPortalTab } from '../../types';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../../services/notificationService';

interface SellerNotificationsTabProps {
  sellerId: string;
  notifications: Notification[];
  onNavigateTab: (tab: SellerPortalTab, targetId?: string) => void;
}

export const SellerNotificationsTab: React.FC<SellerNotificationsTabProps> = ({
  sellerId,
  notifications,
  onNavigateTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'order' | 'return' | 'system'>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'order') return n.type === 'order' || n.type === 'delivery' || n.type === 'payment';
    if (filter === 'return') return n.type === 'return' || n.type === 'refund' || n.type === 'dispute';
    if (filter === 'system') return n.type === 'system' || n.type === 'eco_verif' || n.type === 'seller_status';
    return true;
  });

  const handleMarkRead = async (notifId: string) => {
    try {
      await markNotificationAsRead(notifId);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead(sellerId);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await handleMarkRead(notif.id);
    }

    if (notif.targetSubTab) {
      onNavigateTab(notif.targetSubTab as SellerPortalTab, notif.targetId);
    } else if (notif.type === 'order') {
      onNavigateTab('orders', notif.targetId);
    } else if (notif.type === 'return') {
      onNavigateTab('returns', notif.targetId);
    } else if (notif.type === 'refund') {
      onNavigateTab('refunds', notif.targetId);
    } else if (notif.type === 'delivery') {
      onNavigateTab('shipping', notif.targetId);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#002c11] font-heading flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1b6d24] text-[28px]">notifications_active</span>
            Store Operational Alerts & Notifications
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                {unreadCount} new
              </span>
            )}
          </h2>
          <p className="text-xs text-[#717970] mt-1">
            Real-time telemetry on new customer orders, shipping dispatches, returns, and eco-verification updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="px-4 py-2 bg-[#e8f5e9] hover:bg-[#d5ecd8] text-[#1b6d24] rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            {isMarkingAll ? 'Marking...' : 'Mark All as Read'}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'order', label: 'Orders & Shipments' },
            { id: 'return', label: 'Returns & Refunds' },
            { id: 'system', label: 'System & Eco Audit' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              filter === tab.id
                ? 'bg-[#002c11] text-[#a0f399]'
                : 'bg-white text-[#414941] border border-[#c1c9be]/60 hover:bg-[#f0eded]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-[48px] text-[#8ba690]">notifications_off</span>
            <h3 className="font-bold text-sm text-[#002c11]">No notifications in this view</h3>
            <p className="text-xs text-[#717970] max-w-sm mx-auto">
              You are up to date! Incoming customer orders, courier status updates, and audit approvals will appear here instantly.
            </p>
          </div>
        ) : (
          filteredNotifs.map((notif) => {
            const isUnread = !notif.read;
            const timeAgo = notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Just now';

            let icon = 'notifications';
            let iconBg = 'bg-blue-50 text-blue-700';

            if (notif.type === 'order') {
              icon = 'shopping_bag';
              iconBg = 'bg-emerald-50 text-emerald-700';
            } else if (notif.type === 'return' || notif.type === 'refund' || notif.type === 'dispute') {
              icon = 'sync';
              iconBg = 'bg-amber-50 text-amber-700';
            } else if (notif.type === 'delivery') {
              icon = 'local_shipping';
              iconBg = 'bg-purple-50 text-purple-700';
            } else if (notif.type === 'eco_verif') {
              icon = 'verified';
              iconBg = 'bg-teal-50 text-teal-700';
            }

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-start gap-4 ${
                  isUnread
                    ? 'bg-[#f4faf4] border-[#1b6d24]/50 shadow-xs hover:border-[#1b6d24]'
                    : 'bg-white border-[#c1c9be]/60 hover:bg-[#fafaf9]'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-heading truncate ${isUnread ? 'font-black text-[#002c11]' : 'font-bold text-[#414941]'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-[#717970] shrink-0">{timeAgo}</span>
                  </div>
                  <p className="text-xs text-[#525b51] mt-1 leading-relaxed">{notif.message}</p>

                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[11px] font-bold text-[#1b6d24] flex items-center gap-1 hover:underline">
                      View details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>

                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(notif.id);
                        }}
                        className="text-[10px] font-semibold text-[#717970] hover:text-[#002c11] underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>

                {isUnread && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1b6d24] shrink-0 mt-2" title="Unread" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
