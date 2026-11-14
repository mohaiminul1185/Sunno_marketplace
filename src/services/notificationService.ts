import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Notification, NotificationType, ActiveTab } from '../types';
import { handleFirestoreError, OperationType } from './dbService';

export const NOTIFICATIONS_COL = 'notifications';

export async function fetchUserNotifications(userId: string): Promise<Notification[]> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COL),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
    return notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, NOTIFICATIONS_COL);
    return [];
  }
}

export function subscribeUserNotifications(
  userId: string,
  onUpdate: (notifications: Notification[], unreadCount: number) => void
) {
  if (!userId) return () => {};
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COL),
      where('userId', '==', userId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
        const sorted = notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const unreadCount = sorted.filter((n) => !n.read).length;
        onUpdate(sorted, unreadCount);
      },
      (error) => {
        console.warn('Notifications snapshot error:', error);
      }
    );
  } catch {
    return () => {};
  }
}

export async function createNotification(
  notifData: Omit<Notification, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): Promise<Notification> {
  const id = notifData.id || `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const notification: Notification = {
    ...notifData,
    id,
    timestamp: notifData.timestamp || now,
    createdAt: now,
    read: false,
  };

  try {
    const ref = doc(db, NOTIFICATIONS_COL, id);
    await setDoc(ref, notification);
    return notification;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${NOTIFICATIONS_COL}/${id}`);
    return notification;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const ref = doc(db, NOTIFICATIONS_COL, notificationId);
    await updateDoc(ref, { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${NOTIFICATIONS_COL}/${notificationId}`);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COL),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(doc(db, NOTIFICATIONS_COL, d.id), { read: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, NOTIFICATIONS_COL);
  }
}

export async function deleteNotificationInDb(notificationId: string): Promise<void> {
  try {
    const ref = doc(db, NOTIFICATIONS_COL, notificationId);
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${NOTIFICATIONS_COL}/${notificationId}`);
  }
}

// ---------------- TRIGGER / EVENT HELPERS ----------------

export async function notifyOrderPlaced(
  customerId: string,
  orderId: string,
  orderNumber: string,
  total: number,
  sellerIds: string[],
  extraPayload?: Partial<OrderNotificationEventPayload>
) {
  const items = extraPayload?.items || [];
  const subOrders = extraPayload?.subOrders || [];
  const paymentMethod = (extraPayload?.paymentMethod || 'COD').toUpperCase();
  const paymentStatus = (extraPayload?.paymentStatus || 'pending').toUpperCase();
  const courier = extraPayload?.courierName || 'Eco-Express';
  const trackingCode = extraPayload?.trackingCode || 'Pending';
  const itemsSummary = items.map((i: any) => `${i.quantity}x ${i.title || i.productNameSnapshot || 'Eco Craft'}`).slice(0, 3).join(', ');

  // 1. Notify Customer with complete breakdown
  await createNotification({
    id: `notif-order-cust-${orderId}`,
    userId: customerId,
    title: `Order Confirmed #${orderNumber} 🌿`,
    message: `Your eco order #${orderNumber} for ৳${total} (${itemsSummary}) is confirmed. Payment: ${paymentStatus} (${paymentMethod}). Courier: ${courier}. Tracking: ${trackingCode}.`,
    type: 'order',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'orders',
    targetId: orderId,
  });

  // 2. Notify Sellers with their specific items and amounts
  for (const sellerId of sellerIds) {
    // Find sub-order for this seller if available
    const sellerSubOrder = subOrders.find((s: any) => s.sellerId === sellerId);
    const sellerItems = sellerSubOrder?.items || items.filter((i: any) => i.sellerId === sellerId);
    const sellerAmount = sellerSubOrder?.total || (sellerItems.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0));
    const sellerItemsText = sellerItems.map((i: any) => `${i.quantity}x ${i.title || i.productNameSnapshot}`).join(', ') || 'Eco Craft';
    const totalQty = sellerItems.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);

    await createNotification({
      id: `notif-order-seller-${orderId}-${sellerId}`,
      userId: sellerId,
      title: `NEW ORDER RECEIVED #${orderNumber}`,
      message: `Order #${orderNumber} • Product: ${sellerItemsText} • Quantity: ${totalQty} • Amount: ৳${sellerAmount} • Payment: ${paymentMethod === 'COD' ? 'COD' : 'Paid'}`,
      type: 'order',
      read: false,
      targetTab: 'seller_portal',
      targetSubTab: 'orders',
      targetId: sellerSubOrder?.id || orderId,
    });
  }

  // 3. Notify Admin
  await createNotification({
    id: `notif-order-admin-${orderId}`,
    userId: 'admin',
    title: `Platform Order Placed #${orderNumber}`,
    message: `Order #${orderNumber} placed for ৳${total} across ${sellerIds.length} artisan(s). Payment: ${paymentStatus}.`,
    type: 'order',
    read: false,
    targetTab: 'admin',
    targetSubTab: 'orders',
    targetId: orderId,
  });
}

export async function notifyOrderDelivered(
  customerId: string,
  orderId: string,
  orderNumber: string,
  productTitles: string[]
) {
  // 1. Delivery notification
  await createNotification({
    userId: customerId,
    title: 'Order Delivered! 🌿',
    message: `Your consignment for order #${orderNumber} has been delivered successfully. Thank you for supporting sustainable artisans!`,
    type: 'delivery',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'orders',
    targetId: orderId,
  });

  // 2. Review Reminder notification
  await createNotification({
    userId: customerId,
    title: 'How was your SUNNO purchase? ⭐',
    message: `Please share your verified review for ${productTitles.slice(0, 2).join(', ')}${productTitles.length > 2 ? ' and more' : ''} to inspire mindful buyers.`,
    type: 'review',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'orders',
    targetId: orderId,
  });
}

export async function notifyReturnRequested(
  customerId: string,
  sellerId: string,
  returnId: string,
  orderNumber: string,
  productTitle: string
) {
  // Notify Customer
  await createNotification({
    userId: customerId,
    title: 'Return Request Submitted',
    message: `Your return request for "${productTitle}" on order #${orderNumber} is under review by SUNNO & the artisan.`,
    type: 'return',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'returns',
    targetId: returnId,
  });

  // Notify Seller
  await createNotification({
    userId: sellerId,
    title: 'Return Requested',
    message: `Customer requested a return for "${productTitle}" (Order #${orderNumber}). Please inspect the submitted claim.`,
    type: 'return',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'returns',
    targetId: returnId,
  });

  // Notify Admin
  await createNotification({
    userId: 'admin',
    title: 'Return Request Escalation',
    message: `New return request on Order #${orderNumber} for "${productTitle}".`,
    type: 'return',
    read: false,
    targetTab: 'admin',
    targetSubTab: 'returns',
    targetId: returnId,
  });
}

export async function notifyReturnStatusChanged(
  customerId: string,
  sellerId: string,
  returnId: string,
  orderNumber: string,
  status: string,
  note?: string
) {
  await createNotification({
    userId: customerId,
    title: `Return Status: ${status.replace(/_/g, ' ')}`,
    message: `Return for order #${orderNumber} has been updated to ${status.replace(/_/g, ' ')}.${note ? ` Note: ${note}` : ''}`,
    type: 'return',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'returns',
    targetId: returnId,
  });

  await createNotification({
    userId: sellerId,
    title: `Return Status: ${status.replace(/_/g, ' ')}`,
    message: `Return for order #${orderNumber} updated to ${status.replace(/_/g, ' ')}.`,
    type: 'return',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'returns',
    targetId: returnId,
  });
}

// ---------------- PHASE 17 MULTI-CHANNEL RETURN & DISPUTE NOTIFICATIONS ----------------

export async function notifyReturnSubmittedMultiChannel(payload: {
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  sellerId: string;
  sellerEmail?: string;
  sellerPhone?: string;
  returnId: string;
  orderNumber: string;
  productTitle: string;
  refundAmount: number;
}) {
  // 1. In-app notification to Customer (Return submitted)
  await createNotification({
    userId: payload.customerId,
    title: 'Return Request Submitted',
    message: `Your return request for "${payload.productTitle}" (Order #${payload.orderNumber}) has been submitted successfully.`,
    type: 'return',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'returns',
    targetId: payload.returnId,
  });

  // 2. In-app notification to Seller (Return received - Action required)
  await createNotification({
    userId: payload.sellerId,
    title: 'Return Received: Action Required',
    message: `A return request for "${payload.productTitle}" on Order #${payload.orderNumber} has been received. Please review and respond within 48 hours.`,
    type: 'return',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'returns',
    targetId: payload.returnId,
  });

  // 3. Dispatch Email & SMS payload to backend gateway
  try {
    await fetch('/api/notifications/send-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'return.submitted',
        orderNumber: payload.orderNumber,
        customerId: payload.customerId,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        productTitle: payload.productTitle,
        refundAmount: payload.refundAmount,
        returnId: payload.returnId,
        sellerId: payload.sellerId,
      }),
    });
  } catch (e) {
    console.warn('External notification endpoint dispatch skipped:', e);
  }
}

export async function notifyReturnApprovedMultiChannel(payload: {
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  returnId: string;
  orderNumber: string;
  productTitle: string;
}) {
  // Customer: Return approved
  await createNotification({
    userId: payload.customerId,
    title: 'Return Approved',
    message: `Your return request for "${payload.productTitle}" (Order #${payload.orderNumber}) was approved. A courier reverse pickup will be scheduled.`,
    type: 'return',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'returns',
    targetId: payload.returnId,
  });

  try {
    await fetch('/api/notifications/send-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'return.approved',
        orderNumber: payload.orderNumber,
        customerId: payload.customerId,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        returnId: payload.returnId,
      }),
    });
  } catch (e) {
    console.warn('External notification endpoint dispatch skipped:', e);
  }
}

export async function notifyPickupScheduledMultiChannel(payload: {
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  returnId: string;
  orderNumber: string;
  courierName: string;
  trackingNumber: string;
  scheduledDate: string;
}) {
  // Customer: Pickup scheduled
  await createNotification({
    userId: payload.customerId,
    title: 'Courier Pickup Scheduled',
    message: `Return pickup for order #${payload.orderNumber} scheduled with ${payload.courierName} on ${payload.scheduledDate}. Tracking code: ${payload.trackingNumber}.`,
    type: 'return',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'returns',
    targetId: payload.returnId,
  });

  try {
    await fetch('/api/notifications/send-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'return.pickup_scheduled',
        orderNumber: payload.orderNumber,
        customerId: payload.customerId,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        courierName: payload.courierName,
        trackingNumber: payload.trackingNumber,
        scheduledDate: payload.scheduledDate,
      }),
    });
  } catch (e) {
    console.warn('External notification endpoint dispatch skipped:', e);
  }
}

export async function notifyRefundCompletedMultiChannel(payload: {
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  refundId: string;
  orderNumber: string;
  amount: number;
  method: string;
  transactionId?: string;
}) {
  // Customer: Refund completed
  await createNotification({
    userId: payload.customerId,
    title: `Refund Completed: ৳${payload.amount}`,
    message: `Your refund of ৳${payload.amount} for Order #${payload.orderNumber} has been completed via ${payload.method.toUpperCase()}.${payload.transactionId ? ` TxID: ${payload.transactionId}` : ''}`,
    type: 'refund',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'returns',
    targetId: payload.refundId,
  });

  try {
    await fetch('/api/notifications/send-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'refund.completed',
        orderNumber: payload.orderNumber,
        customerId: payload.customerId,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        amount: payload.amount,
        method: payload.method,
        transactionId: payload.transactionId,
      }),
    });
  } catch (e) {
    console.warn('External notification endpoint dispatch skipped:', e);
  }
}

export async function notifyNewDisputeAlert(payload: {
  disputeId: string;
  returnId: string;
  orderNumber: string;
  customerName: string;
  sellerId: string;
  disputeReason: string;
}) {
  // Admin: New dispute alert
  await createNotification({
    userId: 'admin',
    title: 'New Dispute Alert ⚠️',
    message: `Dispute filed by ${payload.customerName} on Return #${payload.returnId.slice(-8)} (Order #${payload.orderNumber}): ${payload.disputeReason}`,
    type: 'dispute',
    read: false,
    targetTab: 'admin',
    targetSubTab: 'disputes',
    targetId: payload.disputeId,
  });

  // Seller: Action required
  await createNotification({
    userId: payload.sellerId,
    title: 'Dispute Notice: Action Required',
    message: `A dispute has been escalated for Return #${payload.returnId.slice(-8)}. Please review evidence in the mediation center.`,
    type: 'dispute',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'disputes',
    targetId: payload.disputeId,
  });

  try {
    await fetch('/api/notifications/send-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'dispute.opened',
        disputeId: payload.disputeId,
        orderNumber: payload.orderNumber,
        disputeReason: payload.disputeReason,
      }),
    });
  } catch (e) {
    console.warn('External notification endpoint dispatch skipped:', e);
  }
}

export async function notifyRefundCompleted(
  customerId: string,
  refundId: string,
  orderNumber: string,
  amount: number,
  method: string
) {
  await createNotification({
    userId: customerId,
    title: 'Refund Completed ৳' + amount,
    message: `Your refund of ৳${amount} for order #${orderNumber} has been successfully processed via ${method.toUpperCase()}.`,
    type: 'refund',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'returns',
    targetId: refundId,
  });
}

export async function notifyChatMessage(
  recipientId: string,
  senderName: string,
  snippet: string,
  conversationId: string,
  isSellerRecipient: boolean
) {
  await createNotification({
    userId: recipientId,
    title: `New Message from ${senderName}`,
    message: snippet.length > 80 ? snippet.slice(0, 80) + '...' : snippet,
    type: 'message',
    read: false,
    targetTab: isSellerRecipient ? 'seller_portal' : 'customer_profile',
    targetSubTab: 'messages',
    targetId: conversationId,
  });
}

export async function notifySupportTicketUpdate(
  userId: string,
  ticketNumber: string,
  subject: string,
  status: string,
  isStaff: boolean
) {
  await createNotification({
    userId,
    title: `Support Ticket #${ticketNumber} ${status}`,
    message: `Update on "${subject}". Our concierge support team responded.`,
    type: 'support',
    read: false,
    targetTab: isStaff ? 'admin' : 'customer_profile',
    targetSubTab: 'support',
    targetId: ticketNumber,
  });
}

// ---------------- PHASE 15 TRANSACTIONAL NOTIFICATION EVENT SYSTEM ----------------

export interface OrderNotificationEventPayload {
  eventType:
    | 'order.created'
    | 'payment.confirmed'
    | 'payment.failed'
    | 'order.processing'
    | 'order.shipped'
    | 'shipment.out_for_delivery'
    | 'order.delivered'
    | 'order.cancelled'
    | 'refund.created'
    | 'refund.completed';
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  totalAmount: number;
  currency?: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryMethod?: 'standard' | 'express';
  estimatedDelivery?: string;
  trackingCode?: string;
  trackingUrl?: string;
  courierName?: string;
  items?: any[];
  subOrders?: any[];
  sellerIds?: string[];
}

export interface NotificationEventResult {
  success: boolean;
  email: {
    sent: boolean;
    reason: string;
    provider?: string;
  };
  sms: {
    sent: boolean;
    reason: string;
    provider?: string;
  };
  smsTemplateSnippet?: string;
}

export async function triggerOrderNotificationEvent(
  payload: OrderNotificationEventPayload
): Promise<NotificationEventResult> {
  // 1. Always dispatch in-app notification first
  try {
    if (payload.eventType === 'order.created') {
      await notifyOrderPlaced(
        payload.customerId,
        payload.orderId,
        payload.orderNumber,
        payload.totalAmount,
        payload.sellerIds || [],
        payload
      );
    } else if (payload.eventType === 'order.delivered') {
      await notifyOrderDelivered(
        payload.customerId,
        payload.orderId,
        payload.orderNumber,
        (payload.items || []).map((i) => i.title || 'Artisan Craft')
      );
    } else if (payload.eventType === 'payment.failed') {
      await createNotification({
        userId: payload.customerId,
        title: 'Payment Incomplete',
        message: `Payment for order #${payload.orderNumber} could not be verified. Your items remain saved in your cart.`,
        type: 'order',
        read: false,
        targetTab: 'customer_profile',
        targetSubTab: 'orders',
        targetId: payload.orderId,
      });
    } else if (payload.eventType === 'order.shipped') {
      await createNotification({
        userId: payload.customerId,
        title: 'Order Dispatched 🚚',
        message: `Your eco parcel #${payload.orderNumber} is on the way via ${payload.courierName || 'Eco Logistics'}. Track code: ${payload.trackingCode || 'N/A'}.`,
        type: 'delivery',
        read: false,
        targetTab: 'customer_profile',
        targetSubTab: 'orders',
        targetId: payload.orderId,
      });
    }
  } catch (err) {
    console.warn('[In-app notification error]:', err);
  }

  // 2. Call authoritative backend notification gateway (/api/notifications/send-event)
  try {
    const res = await fetch('/api/notifications/send-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        email: data.email,
        sms: data.sms,
        smsTemplateSnippet: data.smsTemplateSnippet,
      };
    }
  } catch (err) {
    console.warn('[External notification gateway call exception]:', err);
  }

  // Default transparent feedback when server endpoint or gateways are unconfigured
  return {
    success: false,
    email: {
      sent: false,
      reason: 'Notification provider is not configured. (Requires EMAIL_PROVIDER_API_KEY)',
    },
    sms: {
      sent: false,
      reason: 'SMS provider is not configured. (Requires SMS_PROVIDER_API_KEY)',
    },
  };
}

// ---------------- PHASE 18 FINANCIAL NOTIFICATIONS ----------------

export async function notifySellerEarningsReleased(
  sellerId: string,
  amount: number,
  orderNumber?: string
) {
  return createNotification({
    userId: sellerId,
    title: `Earnings Released: ৳${amount.toLocaleString()}`,
    message: `Funds from order ${orderNumber ? '#' + orderNumber : ''} have cleared the customer protection window and are now available for withdrawal.`,
    type: 'finance',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'finance',
  });
}

export async function notifyWithdrawalStatusUpdate(
  sellerId: string,
  withdrawalId: string,
  status: string,
  amount: number,
  method: string,
  ref?: string,
  reason?: string
) {
  let title = `Withdrawal ${status}: ৳${amount.toLocaleString()}`;
  let message = `Your withdrawal request #${withdrawalId} for ৳${amount.toLocaleString()} via ${method.toUpperCase()} has been updated to ${status}.`;

  if (status === 'COMPLETED' || status === 'PAID') {
    title = `Payout Disbursed: ৳${amount.toLocaleString()} 💸`;
    message = `৳${amount.toLocaleString()} has been sent to your ${method.toUpperCase()} account.${ref ? ` Transaction Ref: ${ref}.` : ''}`;
  } else if (status === 'REJECTED' || status === 'FAILED') {
    title = `Withdrawal ${status}: Funds Reversed`;
    message = `Withdrawal #${withdrawalId} could not be processed.${reason ? ` Reason: ${reason}.` : ''} ৳${amount.toLocaleString()} has been safely returned to your available balance.`;
  } else if (status === 'PROCESSING') {
    title = `Payout in Processing: ৳${amount.toLocaleString()}`;
    message = `Your withdrawal of ৳${amount.toLocaleString()} is currently being processed by our payment gateway.`;
  }

  return createNotification({
    userId: sellerId,
    title,
    message,
    type: 'withdrawal',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'finance',
    targetId: withdrawalId,
  });
}

export async function notifyRefundAdjustmentApplied(
  sellerId: string,
  amount: number,
  orderNumber?: string
) {
  return createNotification({
    userId: sellerId,
    title: `Refund Adjustment: -৳${amount.toLocaleString()}`,
    message: `A refund adjustment of ৳${amount.toLocaleString()} was applied to your seller account for order ${orderNumber ? '#' + orderNumber : ''}.`,
    type: 'finance',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'finance',
  });
}

export async function notifyManualAdjustmentApplied(
  sellerId: string,
  amount: number,
  type: 'credit' | 'debit',
  reason?: string
) {
  const isCredit = type === 'credit';
  return createNotification({
    userId: sellerId,
    title: `Account Adjustment: ${isCredit ? '+' : '-'}৳${amount.toLocaleString()}`,
    message: `Admin applied a ${type} adjustment of ৳${amount.toLocaleString()} to your wallet.${reason ? ` Reason: ${reason}` : ''}`,
    type: 'finance',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'finance',
  });
}

// ---------------- ECO-VERIFICATION NOTIFICATION HELPERS ----------------

export async function notifyEcoSubmissionReceived(
  sellerId: string,
  productTitle: string,
  trackingId?: string
) {
  return createNotification({
    userId: sellerId,
    title: 'Eco-Verification: Submission Under Review',
    message: `Your craft listing "${productTitle}" has been queued for committee review.${trackingId ? ` Tracking ID: ${trackingId}.` : ''} Results within 24 hours.`,
    type: 'system',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'eco_verification',
  });
}

export async function notifyEcoSubmissionApproved(
  sellerId: string,
  productTitle: string,
  notes?: string
) {
  return createNotification({
    userId: sellerId,
    title: 'Eco-Verification: APPROVED ✓',
    message: `Congratulations! "${productTitle}" has been certified with the official SUNNO Eco-Verified Badge.${notes ? ` Committee remarks: "${notes}".` : ''}`,
    type: 'system',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'eco_verification',
  });
}

export async function notifyEcoSubmissionRejected(
  sellerId: string,
  productTitle: string,
  reason: string
) {
  return createNotification({
    userId: sellerId,
    title: 'Eco-Verification: Audit Rejected',
    message: `Your submission for "${productTitle}" was rejected by the eco compliance board. Reason: ${reason}`,
    type: 'system',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'eco_verification',
  });
}

export async function notifyEcoSubmissionChangesRequested(
  sellerId: string,
  productTitle: string,
  feedback: string
) {
  return createNotification({
    userId: sellerId,
    title: 'Eco-Verification: Changes Requested',
    message: `Committee requested adjustments for "${productTitle}": ${feedback}. Please update the listing and resubmit.`,
    type: 'system',
    read: false,
    targetTab: 'seller_portal',
    targetSubTab: 'eco_verification',
  });
}



