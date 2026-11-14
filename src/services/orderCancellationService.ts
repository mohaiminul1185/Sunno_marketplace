import {
  doc,
  getDoc,
  updateDoc,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Order,
  SubOrder,
  OrderStatus,
  OrderCancellationRequest,
  OrderCancellationResult,
} from '../types';
import {
  ORDERS_COL,
  PRODUCTS_COL,
  createAuditLog,
} from './dbService';
import { createRefundRecord } from './refundService';

export const CANCELLATION_REASONS_CUSTOMER = [
  'Changed mind / no longer needed',
  'Ordered by mistake / duplicate order',
  'Found better price or alternative',
  'Delivery time is too long',
  'Need to change shipping address or phone',
  'Other reason',
];

export const CANCELLATION_REASONS_SELLER = [
  'Craft material out of stock / unavailable',
  'Artisan unable to fulfill in specified timeframe',
  'Damaged raw materials during craft preparation',
  'Courier service unavailable for customer location',
  'Price or listing error on marketplace',
  'Customer requested cancellation directly',
];

export const CANCELLATION_REASONS_ADMIN = [
  'Fraud prevention or suspicious activity',
  'Payment verification failure',
  'Dispute resolution override',
  'Artisan cooperative closed for seasonal harvest',
  'Customer mutual agreement override',
];

/**
 * Check whether an order can be cancelled by the specified actor
 */
export function checkOrderCancellationEligibility(
  order: Order,
  actorRole: 'customer' | 'seller' | 'admin',
  actorId?: string
): { eligible: boolean; reason?: string } {
  const status = (order.status || order.orderStatus || 'pending').toLowerCase();

  // Admin can override and cancel anytime as long as not already refunded/cancelled
  if (actorRole === 'admin') {
    if (status === 'cancelled') {
      return { eligible: false, reason: 'Order is already cancelled.' };
    }
    return { eligible: true };
  }

  // Customer eligibility
  if (actorRole === 'customer') {
    if (actorId) {
      const cleanActor = actorId.toLowerCase().trim();
      const isOwner =
        (order.customerId && order.customerId === actorId) ||
        (order.userId && order.userId === actorId) ||
        (order.customerEmail && order.customerEmail.toLowerCase().trim() === cleanActor);

      if (!isOwner) {
        return { eligible: false, reason: 'You are not authorized to cancel this order.' };
      }
    }
    const nonCancellableStates = ['shipped', 'out_for_delivery', 'delivered', 'returned', 'refunded', 'cancelled'];
    if (nonCancellableStates.includes(status)) {
      if (status === 'shipped' || status === 'out_for_delivery') {
        return {
          eligible: false,
          reason: 'Order has already been dispatched with courier. You can request a 7-day return upon parcel delivery.',
        };
      }
      if (status === 'delivered') {
        return {
          eligible: false,
          reason: 'Order has been delivered. Please use "Request Return / Refund" for eligible items.',
        };
      }
      return { eligible: false, reason: `Order cannot be cancelled in "${status}" status.` };
    }
    return { eligible: true };
  }

  // Seller sub-order eligibility
  if (actorRole === 'seller') {
    const nonCancellableStates = ['shipped', 'out_for_delivery', 'delivered', 'returned', 'refunded', 'cancelled'];
    if (nonCancellableStates.includes(status)) {
      return {
        eligible: false,
        reason: `Sub-order has already reached "${status}". Cancellation not allowed post-dispatch.`,
      };
    }
    return { eligible: true };
  }

  return { eligible: false, reason: 'Unauthorized cancellation role.' };
}

/**
 * Executes a full or partial order cancellation with:
 * 1. Status transition & audit fields
 * 2. Automatic inventory restocking back to canonical products collection
 * 3. Audit logging in audit_logs
 * 4. Refund record creation if order was prepaid
 */
export async function executeOrderCancellation(
  request: OrderCancellationRequest
): Promise<OrderCancellationResult> {
  try {
    const orderRef = doc(db, ORDERS_COL, request.orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      throw new Error(`Order #${request.orderId} does not exist.`);
    }

    const order = { id: orderSnap.id, ...orderSnap.data() } as Order;
    const currentStatus = order.status || order.orderStatus || 'pending';

    // Verify eligibility
    const actorRole = request.cancelledByRole === 'system' ? 'admin' : request.cancelledByRole;
    const actorId = request.cancelledById || request.cancelledBy;
    const eligibility = checkOrderCancellationEligibility(order, actorRole, actorId);
    if (!eligibility.eligible && actorRole !== 'admin') {
      throw new Error(eligibility.reason || 'Order is not eligible for cancellation.');
    }

    const batch = writeBatch(db);
    let restockedCount = 0;

    // 1. Restock Inventory back to Products collection
    if (request.restockInventory !== false && Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.productId && item.quantity > 0) {
          try {
            const prodRef = doc(db, PRODUCTS_COL, item.productId);
            batch.update(prodRef, {
              stock: increment(item.quantity),
              availableStock: increment(item.quantity),
              reservedStock: increment(-item.quantity),
              updatedAt: new Date().toISOString(),
            });
            restockedCount += item.quantity;
          } catch (stockErr) {
            console.warn('Stock restock error for product:', item.productId, stockErr);
          }
        }
      }
    }

    // 2. Update Order Status & Cancellation Audit Fields
    const cancellationTimestamp = new Date().toISOString();
    const updatePayload: Partial<Order> = {
      status: 'cancelled',
      orderStatus: 'cancelled',
      cancellationReason: request.reason,
      cancellationNotes: request.customerNotes || '',
      cancelledBy: request.cancelledBy,
      cancelledByRole: request.cancelledByRole,
      cancelledAt: cancellationTimestamp,
      previousOrderStatus: currentStatus,
      updatedAt: cancellationTimestamp,
    };

    // If order was prepaid, flag for refund
    let refundInitiated = false;
    let refundAmount = 0;
    const isPaid = order.paymentStatus === 'paid' || order.paymentStatus === 'SUCCESS';
    if (isPaid && order.total > 0) {
      updatePayload.paymentStatus = 'REFUND_PENDING';
      refundInitiated = true;
      refundAmount = order.finalTotal || order.total;
    }

    batch.update(orderRef, updatePayload);
    await batch.commit();

    // 3. Create Audit Log
    await createAuditLog({
      action: 'ORDER_CANCELLED',
      performedBy: request.cancelledBy,
      actorEmail: request.cancelledBy,
      actorRole: actorRole as any,
      targetType: 'order',
      targetId: request.orderId,
      details: `Order #${request.orderId} cancelled by ${request.cancelledByRole}. Reason: "${request.reason}". ${restockedCount} items restocked.`,
      timestamp: cancellationTimestamp,
    });

    // 4. If prepaid, register official refund record
    if (refundInitiated && refundAmount > 0) {
      try {
        await createRefundRecord({
          orderId: order.id,
          customerId: order.customerId || order.userId || request.cancelledBy,
          customerName: order.customerName || 'Customer',
          customerPhone: order.customerPhone || '',
          amount: refundAmount,
          reason: `Order cancelled by ${request.cancelledByRole}: ${request.reason}`,
          paymentMethod: order.paymentMethod || 'bkash',
          refundMethod: (order.paymentMethod as any) || 'bkash',
          targetAccount: order.customerPhone || '',
        });
      } catch (refErr) {
        console.warn('Refund initiation record note:', refErr);
      }
    }

    return {
      success: true,
      orderId: request.orderId,
      subOrderId: request.subOrderId,
      previousStatus: currentStatus,
      newStatus: 'cancelled',
      restockedItemsCount: restockedCount,
      refundInitiated,
      refundAmount,
      message: `Order #${request.orderId} was successfully cancelled and ${restockedCount} items were returned to inventory.`,
    };
  } catch (err: any) {
    console.error('executeOrderCancellation error:', err);
    return {
      success: false,
      orderId: request.orderId,
      subOrderId: request.subOrderId,
      previousStatus: 'pending',
      newStatus: 'pending',
      restockedItemsCount: 0,
      refundInitiated: false,
      message: err.message || 'Failed to cancel order.',
    };
  }
}

/**
 * Seller-initiated cancellation of a sub-order
 */
export async function executeSubOrderCancellation(params: {
  orderId: string;
  subOrderId: string;
  sellerId: string;
  sellerName: string;
  reason: string;
  notes?: string;
}): Promise<OrderCancellationResult> {
  return executeOrderCancellation({
    orderId: params.orderId,
    subOrderId: params.subOrderId,
    reason: params.reason,
    customerNotes: params.notes,
    cancelledBy: params.sellerName || params.sellerId,
    cancelledByRole: 'seller',
    restockInventory: true,
  });
}
