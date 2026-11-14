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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Order,
  Product,
  ReturnRequest,
  ReturnStatus,
  ReturnReason,
  ReturnPolicySetting,
  ReturnStatusLog,
  UserRole,
  ReturnResolutionType,
  ReturnType,
  FaultAttribution,
  UserAddress,
  ReturnEligibilityStatus,
} from '../types';
import { handleFirestoreError, OperationType, createAuditLog } from './dbService';
import {
  notifyReturnRequested,
  notifyReturnStatusChanged,
  notifyReturnSubmittedMultiChannel,
  notifyReturnApprovedMultiChannel,
  notifyPickupScheduledMultiChannel,
} from './notificationService';
import { validateReturnStatusTransition, normalizeReturnStatus } from './returnStateMachine';
import { calculateItemRefund } from './refundCalculator';

export const RETURNS_COL = 'returns';
export const RETURN_POLICIES_COL = 'return_policies';
export const RETURN_STATUS_LOGS_COL = 'return_status_logs';

export const DEFAULT_RETURN_POLICY: ReturnPolicySetting = {
  id: 'global-return-policy',
  returnWindowDays: 7,
  eligibleCategories: [
    'Handloom & Heritage Textiles',
    'Jute & Natural Fiber',
    'Bamboo & Cane',
    'Clay & Terracotta Pottery',
    'Recycled Metal & Brassware',
    'Coconut Shell & Wood Craft',
    'Eco Stationery & Paper',
  ],
  excludedCategories: [
    'Organic Pantry & Teas',
    'Custom Personalized Engravings',
    'Perishable Botanical Goods',
  ],
  nonReturnableProductIds: [],
  returnReasons: [
    'Damaged item',
    'Wrong item',
    'Missing item',
    'Defective item',
    'Product not as described',
    'Quality issue',
    'Size/variation issue',
    'Customer remorse',
    'Other',
  ],
  damagedProductRules: 'Full refund including reverse shipping covered by seller/cooperative upon photo proof.',
  wrongProductRules: 'Full refund or express exchange dispatch within 48 hours.',
  missingItemRules: 'Immediate partial refund or supplementary shipment arranged.',
  defectiveProductRules: 'Eligible for refund or exchange upon return verification.',
  remorseRules: 'Allowed for non-perishable crafts within 7 days. Customer standard reverse shipping ৳60 applied.',
  returnShippingResponsibility: 'SELLER',
  sellerReturnPolicy:
    'Artisans agree to replace defective handmade items or accept returned goods packaged in original eco materials.',
  customerConditions: [
    'Item must be unused, unwashed, and in its original artisan packaging.',
    'Proof of damage (photos/videos) required for transit breakages.',
    'Return must be initiated within the configured return window.',
  ],
  returnShippingRules:
    'Free pickup for damaged/wrong items. Customer standard return shipping ৳60 applied for preference-based returns.',
  autoApproveDamaged: false,
  requireInspectionBeforeRefund: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

// ---------------- RETURN POLICIES ----------------

export async function fetchReturnPolicy(): Promise<ReturnPolicySetting> {
  try {
    const ref = doc(db, RETURN_POLICIES_COL, 'global-return-policy');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ReturnPolicySetting;
    }
    // Seed default policy if not present
    await setDoc(ref, DEFAULT_RETURN_POLICY);
    return DEFAULT_RETURN_POLICY;
  } catch (err) {
    console.warn('Fetch return policy fallback:', err);
    return DEFAULT_RETURN_POLICY;
  }
}

export async function updateReturnPolicy(
  policy: Partial<ReturnPolicySetting>,
  actorId?: string
): Promise<ReturnPolicySetting> {
  const current = await fetchReturnPolicy();
  const updated: ReturnPolicySetting = {
    ...current,
    ...policy,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId || 'admin',
  };

  const ref = doc(db, RETURN_POLICIES_COL, 'global-return-policy');
  await setDoc(ref, updated, { merge: true });

  await createAuditLog({
    action: 'RETURN_POLICY_UPDATED',
    actorId: actorId || 'admin',
    performedBy: actorId || 'admin',
    entityType: 'return_policy',
    entityId: 'global-return-policy',
    targetType: 'policy',
    targetId: 'global-return-policy',
    details: `Updated return policy window to ${updated.returnWindowDays} days.`,
    timestamp: new Date().toISOString(),
  });

  return updated;
}

export const saveReturnPolicy = updateReturnPolicy;


// ---------------- ELIGIBILITY VERIFICATION ----------------

export interface ReturnEligibilityCheck {
  isEligible: boolean;
  eligibilityStatus: ReturnEligibilityStatus; // 'Eligible' | 'Not Eligible' | 'Return Window Expired'
  reason?: string;
  maxQuantity: number;
  unitPrice: number;
  orderItem?: Order['items'][0];
  daysRemaining?: number;
  ecoRuleApplied?: string;
}

export async function verifyReturnEligibility(
  order: Order,
  productId: string,
  customerId: string
): Promise<ReturnEligibilityCheck> {
  // 1. Order ownership check
  const orderOwner = order.customerId || order.userId;
  if (orderOwner && customerId && orderOwner !== customerId) {
    return {
      isEligible: false,
      eligibilityStatus: 'Not Eligible',
      reason: 'Unauthorized: Order does not belong to this customer.',
      maxQuantity: 0,
      unitPrice: 0,
    };
  }

  // 2. Order status check (Must be delivered)
  const isDelivered =
    order.status === 'delivered' ||
    order.status === 'DELIVERED' ||
    order.orderStatus === 'delivered' ||
    order.orderStatus === 'DELIVERED';

  if (!isDelivered) {
    return {
      isEligible: false,
      eligibilityStatus: 'Not Eligible',
      reason: 'Returns are only permitted for delivered consignments.',
      maxQuantity: 0,
      unitPrice: 0,
    };
  }

  // 3. Product in order check
  const orderItem = order.items?.find((item) => item.productId === productId || (item as any).id === productId);
  if (!orderItem) {
    return {
      isEligible: false,
      eligibilityStatus: 'Not Eligible',
      reason: 'This craft item was not part of this order consignment.',
      maxQuantity: 0,
      unitPrice: 0,
    };
  }

  // Per-product non-returnable flag check from item catalog
  if ((orderItem as any).isReturnable === false || (orderItem as any).nonReturnable === true) {
    return {
      isEligible: false,
      eligibilityStatus: 'Not Eligible',
      reason: 'This specific artisan craft item is marked as non-returnable in the catalog.',
      maxQuantity: 0,
      unitPrice: orderItem.price,
    };
  }

  // 4. Return Window validation and category/product exclusions
  const policy = await fetchReturnPolicy();

  // Policy-defined Product exclusion check
  if (policy.nonReturnableProductIds?.includes(productId)) {
    return {
      isEligible: false,
      eligibilityStatus: 'Not Eligible',
      reason: 'This artisan craft item is marked as non-returnable in platform policy.',
      maxQuantity: 0,
      unitPrice: orderItem.price,
    };
  }

  // Category exclusion check
  const itemCategory = (orderItem as any).category || '';
  if (itemCategory && policy.excludedCategories?.includes(itemCategory)) {
    return {
      isEligible: false,
      eligibilityStatus: 'Not Eligible',
      reason: `Items in category "${itemCategory}" are not eligible for return.`,
      maxQuantity: 0,
      unitPrice: orderItem.price,
    };
  }

  // Eco-product special rules (perishable botanical crafts, custom personalized wood/jute engravings)
  const itemTitle = ((orderItem as any).title || (orderItem as any).name || '').toLowerCase();
  const lowerCat = itemCategory.toLowerCase();
  if (
    lowerCat.includes('pantry') ||
    lowerCat.includes('tea') ||
    lowerCat.includes('perishable') ||
    itemTitle.includes('live plant') ||
    itemTitle.includes('fresh seed')
  ) {
    return {
      isEligible: false,
      eligibilityStatus: 'Not Eligible',
      reason: 'Eco Special Policy: Perishable botanical goods & organic teas are strictly non-returnable for health & biosecurity.',
      maxQuantity: 0,
      unitPrice: orderItem.price,
      ecoRuleApplied: 'Botanical Perishable Zero-Return Protection',
    };
  }

  if (itemTitle.includes('custom engraving') || itemTitle.includes('personalized') || itemTitle.includes('bespoke monogram')) {
    return {
      isEligible: false,
      eligibilityStatus: 'Not Eligible',
      reason: 'Eco Special Policy: Custom engraved handmade items are non-returnable unless damaged in transit.',
      maxQuantity: 0,
      unitPrice: orderItem.price,
      ecoRuleApplied: 'Artisan Bespoke Engraving Protection',
    };
  }

  const categoryWindow = policy.categoryRules?.[itemCategory]?.returnWindowDays;
  const sellerWindow = policy.sellerRules?.[orderItem.sellerId || '']?.returnWindowDays;
  const effectiveWindowDays = sellerWindow || categoryWindow || policy.returnWindowDays || 7;

  const deliveryDateStr = order.updatedAt || order.createdAt;
  const deliveryTime = new Date(deliveryDateStr).getTime();
  const now = Date.now();
  const windowMs = effectiveWindowDays * 24 * 60 * 60 * 1000;
  const elapsedMs = now - deliveryTime;

  if (elapsedMs > windowMs) {
    const daysOver = Math.ceil((elapsedMs - windowMs) / (24 * 60 * 60 * 1000));
    return {
      isEligible: false,
      eligibilityStatus: 'Return Window Expired',
      reason: `Return window expired (${effectiveWindowDays} days limit exceeded by ${daysOver} days).`,
      maxQuantity: 0,
      unitPrice: orderItem.price,
    };
  }

  // 5. Existing return check
  try {
    const q = query(
      collection(db, RETURNS_COL),
      where('orderId', '==', order.id),
      where('productId', '==', productId)
    );
    const snap = await getDocs(q);
    const activeReturns = snap.docs.filter((d) => {
      const st = d.data().status;
      return st !== 'CANCELLED' && st !== 'REJECTED';
    });

    if (activeReturns.length > 0) {
      return {
        isEligible: false,
        eligibilityStatus: 'Not Eligible',
        reason: 'A return request is already active or processed for this item in this order.',
        maxQuantity: 0,
        unitPrice: orderItem.price,
      };
    }
  } catch (err) {
    console.warn('Check existing return warning:', err);
  }

  const daysRemaining = Math.max(0, Math.ceil((windowMs - elapsedMs) / (24 * 60 * 60 * 1000)));

  return {
    isEligible: true,
    eligibilityStatus: 'Eligible',
    maxQuantity: orderItem.quantity || 1,
    unitPrice: orderItem.price || 0,
    orderItem,
    daysRemaining,
  };
}

// ---------------- RETURN REQUEST CRUD ----------------

export async function createReturnRequest(payload: {
  order: Order;
  productId: string;
  quantity: number;
  returnReason: ReturnReason | string;
  description: string;
  evidencePhotos: string[];
  evidenceVideos?: string[];
  requestedResolution?: ReturnResolutionType;
  returnType?: ReturnType;
  customerComments?: string;
  refundMethod?: string;
  refundAccountDetails?: ReturnRequest['refundAccountDetails'];
  pickupAddress?: UserAddress;
  actor: { id: string; name: string; email?: string; phone?: string; role: UserRole };
}): Promise<ReturnRequest> {
  const {
    order,
    productId,
    quantity,
    returnReason,
    description,
    evidencePhotos,
    evidenceVideos = [],
    requestedResolution = 'REFUND',
    returnType = 'PARTIAL_ITEM',
    customerComments,
    refundMethod,
    refundAccountDetails,
    pickupAddress,
    actor,
  } = payload;

  // Verify eligibility on backend
  const eligibility = await verifyReturnEligibility(order, productId, actor.id);
  if (!eligibility.isEligible) {
    throw new Error(eligibility.reason || 'Item is not eligible for return.');
  }

  if (quantity <= 0 || quantity > eligibility.maxQuantity) {
    throw new Error(`Requested return quantity (${quantity}) exceeds purchased quantity (${eligibility.maxQuantity}).`);
  }

  const orderItem = eligibility.orderItem!;
  const unitPrice = orderItem.price || 0;

  // Run centralized refund calculation
  const refundCalc = calculateItemRefund({
    order,
    productId,
    quantity,
    returnReason,
    isFullOrderReturn: returnType === 'FULL' || quantity === order.items?.reduce((sum, i) => sum + i.quantity, 0),
  });

  const refundAmount = refundCalc.netRefundAmount;
  const returnId = `ret-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const sellerId = orderItem.sellerId || order.sellerIds?.[0] || '';
  const sellerName = orderItem.sellerName || 'SUNNO Artisan Partner';

  const initialLog: ReturnStatusLog = {
    id: `log-${Date.now()}`,
    returnId,
    status: 'REQUESTED',
    newStatus: 'REQUESTED',
    title: 'Return Request Submitted',
    note: `Reason: ${returnReason}. Customer note: "${description.slice(0, 100)}${description.length > 100 ? '...' : ''}"`,
    timestamp: now,
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    location: `${order.shippingAddress?.district || order.district || 'Dhaka'}`,
  };

  const returnDoc: ReturnRequest = {
    id: returnId,
    orderId: order.id,
    orderNumber: order.orderNumber || order.id.slice(-8).toUpperCase(),
    subOrderId: order.subOrders?.[0]?.id,
    productId: orderItem.productId || (orderItem as any).id,
    productTitle: orderItem.title || (orderItem as any).name || 'Artisan Product',
    productImage: orderItem.image || (orderItem as any).images?.[0] || '',
    unitPrice,
    quantity,
    refundAmount,
    sellerId,
    sellerName,
    customerId: actor.id,
    customerName: actor.name,
    customerPhone: actor.phone || order.customerPhone || '01712345678',
    customerEmail: actor.email || order.customerEmail || '',
    returnReason,
    description,
    evidencePhotos: evidencePhotos || [],
    evidenceVideos: evidenceVideos || [],
    requestedResolution,
    returnType,
    customerComments: customerComments || '',
    requestedDate: now,
    status: 'REQUESTED',
    statusHistory: [initialLog],
    paymentMethod: order.paymentMethod,
    refundMethod: refundMethod || (order.paymentMethod === 'cod' ? 'bkash' : 'original_gateway'),
    refundAccountDetails,
    pickupAddress: pickupAddress || order.shippingAddress,
    returnPickupAddress: pickupAddress || order.shippingAddress,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = doc(db, RETURNS_COL, returnId);
    await setDoc(ref, returnDoc);

    // Save to return_status_logs top-level collection for audit
    const statusLogRef = doc(db, RETURN_STATUS_LOGS_COL, `${returnId}_initial`);
    await setDoc(statusLogRef, {
      returnId,
      previousStatus: 'NONE',
      newStatus: 'REQUESTED',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      timestamp: now,
      reason: returnReason,
      notes: description,
    }).catch((e) => console.warn('Status log write warning:', e));

    // Audit log
    await createAuditLog({
      action: 'RETURN_REQUESTED',
      actorId: actor.id,
      performedBy: actor.name,
      entityType: 'return',
      entityId: returnId,
      targetType: 'order',
      targetId: order.id,
      details: `Return requested for "${returnDoc.productTitle}" x${quantity} (Refund: ৳${refundAmount}). Reason: ${returnReason}`,
      timestamp: now,
    });

    // Notify parties
    await notifyReturnRequested(
      actor.id,
      sellerId,
      returnId,
      returnDoc.orderNumber,
      returnDoc.productTitle
    );

    await notifyReturnSubmittedMultiChannel({
      customerId: actor.id,
      customerName: actor.name,
      customerEmail: returnDoc.customerEmail,
      customerPhone: returnDoc.customerPhone,
      sellerId,
      returnId,
      orderNumber: returnDoc.orderNumber,
      productTitle: returnDoc.productTitle,
      refundAmount,
    }).catch((e) => console.warn('Multi-channel return notification skipped:', e));

    return returnDoc;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${RETURNS_COL}/${returnId}`);
    throw err;
  }
}

export async function fetchCustomerReturns(customerId: string): Promise<ReturnRequest[]> {
  try {
    const q = query(collection(db, RETURNS_COL), where('customerId', '==', customerId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReturnRequest));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, RETURNS_COL);
    return [];
  }
}

export function subscribeCustomerReturns(customerId: string, callback: (returns: ReturnRequest[]) => void) {
  const q = query(collection(db, RETURNS_COL), where('customerId', '==', customerId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReturnRequest));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    console.error('Error subscribing to customer returns:', err);
  });
}

export function subscribeSellerReturns(sellerId: string, callback: (returns: ReturnRequest[]) => void) {
  try {
    const q = query(collection(db, RETURNS_COL), where('sellerId', '==', sellerId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReturnRequest));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (err) => {
        if (err?.message?.includes('permission') || (err as any)?.code === 'permission-denied') {
          console.warn('Realtime seller returns permission notice:', err.message);
          callback([]);
        } else {
          console.error('Error subscribing to seller returns:', err);
        }
      }
    );
  } catch (err: any) {
    console.warn('Could not initialize seller returns listener:', err?.message || err);
    return () => {};
  }
}

export async function fetchSellerReturns(sellerId: string): Promise<ReturnRequest[]> {
  try {
    const q = query(collection(db, RETURNS_COL), where('sellerId', '==', sellerId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReturnRequest));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, RETURNS_COL);
    return [];
  }
}

export async function fetchAllReturns(): Promise<ReturnRequest[]> {
  try {
    const snap = await getDocs(collection(db, RETURNS_COL));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReturnRequest));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, RETURNS_COL);
    return [];
  }
}

export async function fetchReturnById(returnId: string): Promise<ReturnRequest | null> {
  try {
    const ref = doc(db, RETURNS_COL, returnId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ReturnRequest;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${RETURNS_COL}/${returnId}`);
    return null;
  }
}

// ---------------- STATUS UPDATE & WORKFLOW ----------------

export async function updateReturnStatus(params: {
  returnId: string;
  newStatus: ReturnStatus;
  actor: { id: string; name: string; role: UserRole };
  note?: string;
  adminNotes?: string;
  sellerNotes?: string;
  courierTracking?: string;
  courierName?: string;
  pickupScheduledDate?: string;
  inspectionStatus?: ReturnRequest['inspectionStatus'];
  inspectionNotes?: string;
  faultAttribution?: FaultAttribution;
  reverseCourier?: string;
  reverseCourierTracking?: string;
  allowAdminOverride?: boolean;
}): Promise<ReturnRequest> {
  const {
    returnId,
    newStatus,
    actor,
    note,
    adminNotes,
    sellerNotes,
    courierTracking,
    courierName,
    pickupScheduledDate,
    inspectionStatus,
    inspectionNotes,
    faultAttribution,
    reverseCourier,
    reverseCourierTracking,
    allowAdminOverride = false,
  } = params;

  const existing = await fetchReturnById(returnId);
  if (!existing) {
    throw new Error('Return request record not found.');
  }

  // Security check: Customers cannot approve/reject/refund returns
  if (actor.role === 'customer' && newStatus !== 'CANCELLED') {
    throw new Error('Customers can only cancel their pending return request.');
  }

  // Security check: Sellers can only update returns for their own store
  if (actor.role === 'seller' && existing.sellerId !== actor.id) {
    throw new Error('Artisans can only manage return requests for their own products.');
  }

  // State machine transition validation
  if (actor.role !== 'admin' || !allowAdminOverride) {
    const check = validateReturnStatusTransition(existing.status, newStatus);
    if (!check.isValid) {
      throw new Error(check.error || 'Invalid return status transition.');
    }
  }

  const now = new Date().toISOString();
  const statusTitles: Record<string, string> = {
    REQUESTED: 'Return Request Submitted',
    RETURN_REQUESTED: 'Return Request Submitted',
    UNDER_REVIEW: 'Under Review by Team',
    APPROVED: 'Return Request Approved',
    REJECTED: 'Return Request Rejected',
    PICKUP_SCHEDULED: 'Courier Pickup Scheduled',
    PICKED_UP: 'Parcel Picked Up by Courier',
    IN_TRANSIT: 'In Transit to Artisan Workshop',
    RECEIVED: 'Package Received by Artisan',
    RECEIVED_BY_SELLER: 'Package Received by Artisan',
    INSPECTION: 'Product Inspection in Progress',
    APPROVED_FOR_REFUND: 'Approved for Refund',
    REFUND_PENDING: 'Refund Processing Pending',
    REFUNDED: 'Refund Disbursed & Completed',
    COMPLETED: 'Return & Refund Completed',
    EXCHANGE_PENDING: 'Exchange Order Processing',
    EXCHANGED: 'Replacement Item Dispatched',
    DISPUTED: 'Formal Dispute Filed',
    CANCELLED: 'Return Request Cancelled',
    CLOSED: 'Return Ticket Closed',
  };

  const newLog: ReturnStatusLog = {
    id: `log-${Date.now()}`,
    returnId,
    status: newStatus,
    previousStatus: existing.status,
    newStatus,
    title: statusTitles[newStatus] || newStatus,
    note: note || adminNotes || sellerNotes || `Status updated to ${newStatus}`,
    timestamp: now,
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    location: `${existing.pickupAddress?.district || 'SUNNO Hub'}`,
  };

  const updatedHistory = [...(existing.statusHistory || []), newLog];

  const updateData: Partial<ReturnRequest> = {
    status: newStatus,
    statusHistory: updatedHistory,
    updatedAt: now,
  };

  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
  if (sellerNotes !== undefined) updateData.sellerNotes = sellerNotes;
  if (courierTracking) updateData.courierTracking = courierTracking;
  if (courierName) updateData.courierName = courierName;
  if (pickupScheduledDate) updateData.pickupScheduledDate = pickupScheduledDate;
  if (inspectionStatus) {
    updateData.inspectionStatus = inspectionStatus;
    updateData.inspectedAt = now;
    updateData.inspectedBy = actor.name;
  }
  if (inspectionNotes !== undefined) updateData.inspectionNotes = inspectionNotes;
  if (faultAttribution) updateData.faultAttribution = faultAttribution;
  if (reverseCourier) updateData.reverseCourier = reverseCourier;
  if (reverseCourierTracking) updateData.reverseCourierTracking = reverseCourierTracking;

  try {
    const ref = doc(db, RETURNS_COL, returnId);
    await updateDoc(ref, updateData);

    // Write dedicated status history log in return_status_logs
    const logDocRef = doc(db, RETURN_STATUS_LOGS_COL, `${returnId}_${Date.now()}`);
    await setDoc(logDocRef, {
      returnId,
      previousStatus: existing.status,
      newStatus,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      timestamp: now,
      reason: note || '',
      notes: adminNotes || sellerNotes || '',
    }).catch((e) => console.warn('Status log write warning:', e));

    const updatedReturn = { ...existing, ...updateData };

    // Audit log
    await createAuditLog({
      action: `RETURN_STATUS_${newStatus}`,
      actorId: actor.id,
      performedBy: actor.name,
      actorRole: actor.role,
      entityType: 'return',
      entityId: returnId,
      targetType: 'order',
      targetId: existing.orderId,
      details: `Return #${returnId} status transitioned from ${existing.status} to ${newStatus}.${note ? ` Note: ${note}` : ''}`,
      timestamp: now,
    });

    // Notify parties
    await notifyReturnStatusChanged(
      existing.customerId,
      existing.sellerId,
      returnId,
      existing.orderNumber,
      newStatus,
      note
    );

    if (newStatus === 'APPROVED') {
      await notifyReturnApprovedMultiChannel({
        customerId: existing.customerId,
        customerEmail: existing.customerEmail,
        customerPhone: existing.customerPhone,
        returnId,
        orderNumber: existing.orderNumber,
        productTitle: existing.productTitle,
      }).catch((e) => console.warn('Notify return approved multi channel skipped:', e));
    } else if (newStatus === 'PICKUP_SCHEDULED') {
      await notifyPickupScheduledMultiChannel({
        customerId: existing.customerId,
        customerEmail: existing.customerEmail,
        customerPhone: existing.customerPhone,
        returnId,
        orderNumber: existing.orderNumber,
        courierName: courierName || existing.courierName || 'Eco Courier',
        trackingNumber: courierTracking || existing.courierTracking || 'PENDING',
        scheduledDate: pickupScheduledDate || existing.pickupScheduledDate || new Date().toISOString().split('T')[0],
      }).catch((e) => console.warn('Notify pickup scheduled multi channel skipped:', e));
    }

    return updatedReturn as ReturnRequest;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${RETURNS_COL}/${returnId}`);
    throw err;
  }
}
