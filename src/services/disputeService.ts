import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  DisputeRecord,
  DisputeMessage,
  DisputeStatus,
  DisputePriority,
  UserRole,
} from '../types';
import { handleFirestoreError, OperationType, createAuditLog } from './dbService';
import { updateReturnStatus } from './returnService';
import { createNotification, notifyNewDisputeAlert } from './notificationService';

export const DISPUTES_COL = 'disputes';
export const DISPUTE_MESSAGES_COL = 'dispute_messages';

/**
 * Creates a customer dispute for a contested return or order
 */
export async function createDispute(payload: {
  returnId: string;
  orderId: string;
  orderNumber: string;
  subOrderId?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  sellerId: string;
  sellerName?: string;
  sellerStoreName?: string;
  reason: string;
  description: string;
  evidence?: string[];
  evidenceUrls?: string[];
  openedBy?: string;
  disputedAmount?: number;
  desiredOutcome?: string;
  priority?: DisputePriority;
  actor?: any;
}): Promise<DisputeRecord> {
  const disputeId = `disp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const finalSellerName = payload.sellerName || payload.sellerStoreName || 'Artisan Seller';
  const finalEvidence = payload.evidence || payload.evidenceUrls || [];

  const disputeDoc: DisputeRecord = {
    id: disputeId,
    disputeId,
    returnId: payload.returnId,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    subOrderId: payload.subOrderId,
    customerId: payload.customerId,
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    customerPhone: payload.customerPhone,
    sellerId: payload.sellerId,
    sellerName: finalSellerName,
    reason: payload.reason,
    description: payload.description,
    evidence: finalEvidence,
    status: 'OPEN',
    priority: payload.priority || 'NORMAL',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = doc(db, DISPUTES_COL, disputeId);
    await setDoc(ref, disputeDoc);

    // Initial message from customer
    await sendDisputeMessage({
      disputeId,
      senderId: payload.customerId,
      senderName: payload.customerName,
      senderRole: 'customer',
      message: `Dispute opened: ${payload.reason}. ${payload.description}`,
      attachments: payload.evidence,
    });

    // Update return request status to DISPUTED
    if (payload.returnId) {
      await updateReturnStatus({
        returnId: payload.returnId,
        newStatus: 'DISPUTED',
        actor: { id: payload.customerId, name: payload.customerName, role: 'customer' },
        note: `Dispute #${disputeId} registered: ${payload.reason}`,
      }).catch((err) => console.warn('Dispute return status link error:', err));
    }

    // Audit log
    await createAuditLog({
      action: 'DISPUTE_OPENED',
      actorId: payload.customerId,
      performedBy: payload.customerName,
      actorRole: 'customer',
      entityType: 'dispute',
      entityId: disputeId,
      targetType: 'order',
      targetId: payload.orderId,
      details: `Dispute opened on Return #${payload.returnId} for Order #${payload.orderNumber}: ${payload.reason}`,
      timestamp: now,
    });

    // Multi-channel notify: Admin (New dispute alert) & Seller (Action required)
    await notifyNewDisputeAlert({
      disputeId,
      returnId: payload.returnId,
      orderNumber: payload.orderNumber,
      customerName: payload.customerName,
      sellerId: payload.sellerId,
      disputeReason: payload.reason,
    }).catch((err) => console.warn('New dispute alert error:', err));

    return disputeDoc;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${DISPUTES_COL}/${disputeId}`);
    throw err;
  }
}

/**
 * Fetches disputes for a customer
 */
export async function fetchDisputesByCustomer(customerId: string): Promise<DisputeRecord[]> {
  try {
    const q = query(collection(db, DISPUTES_COL), where('customerId', '==', customerId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DisputeRecord));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, DISPUTES_COL);
    return [];
  }
}

/**
 * Fetches disputes strictly for a specific seller (ensuring Seller A never sees Seller B's disputes)
 */
export async function fetchDisputesBySeller(sellerId: string): Promise<DisputeRecord[]> {
  try {
    const q = query(collection(db, DISPUTES_COL), where('sellerId', '==', sellerId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DisputeRecord));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, DISPUTES_COL);
    return [];
  }
}

/**
 * Fetches all disputes (Admin only)
 */
export async function fetchAllDisputes(): Promise<DisputeRecord[]> {
  try {
    const snap = await getDocs(collection(db, DISPUTES_COL));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DisputeRecord));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, DISPUTES_COL);
    return [];
  }
}

/**
 * Sends a message in a dispute communication thread
 */
export async function sendDisputeMessage(payload: {
  disputeId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'seller' | 'admin' | 'system';
  message: string;
  attachments?: string[];
}): Promise<DisputeMessage> {
  const msgId = `dmsg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const msgDoc: DisputeMessage = {
    id: msgId,
    disputeId: payload.disputeId,
    senderId: payload.senderId,
    senderName: payload.senderName,
    senderRole: payload.senderRole,
    message: payload.message,
    attachments: payload.attachments || [],
    createdAt: now,
  };

  try {
    await setDoc(doc(db, DISPUTE_MESSAGES_COL, msgId), msgDoc);

    // Update dispute status depending on sender
    const disputeRef = doc(db, DISPUTES_COL, payload.disputeId);
    const updateData: Partial<DisputeRecord> = { updatedAt: now };

    if (payload.senderRole === 'customer') {
      updateData.status = 'WAITING_FOR_SELLER';
    } else if (payload.senderRole === 'seller') {
      updateData.status = 'WAITING_FOR_CUSTOMER';
    } else if (payload.senderRole === 'admin') {
      updateData.status = 'UNDER_REVIEW';
    }

    await updateDoc(disputeRef, updateData);
    return msgDoc;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${DISPUTE_MESSAGES_COL}/${msgId}`);
    throw err;
  }
}

/**
 * Subscribes to live messages in a dispute
 */
export function subscribeDisputeMessages(
  disputeId: string,
  callback: (messages: DisputeMessage[]) => void
) {
  const q = query(collection(db, DISPUTE_MESSAGES_COL), where('disputeId', '==', disputeId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DisputeMessage));
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn('Dispute messages subscription error:', err);
    }
  );
}

/**
 * Resolves a dispute with administrative authority
 */
export async function resolveDisputeByAdmin(payload: {
  disputeId: string;
  admin: { id: string; name: string };
  resolution: {
    type: 'APPROVE_REFUND' | 'APPROVE_PARTIAL_REFUND' | 'REJECT_CLAIM' | 'APPROVE_EXCHANGE' | 'MUTUAL_AGREEMENT';
    refundAmount?: number;
    notes: string;
  };
}): Promise<DisputeRecord> {
  const { disputeId, admin, resolution } = payload;
  const disputeRef = doc(db, DISPUTES_COL, disputeId);
  const snap = await getDoc(disputeRef);
  if (!snap.exists()) {
    throw new Error('Dispute document not found.');
  }

  const existing = snap.data() as DisputeRecord;
  const now = new Date().toISOString();

  const updateData: Partial<DisputeRecord> = {
    status: 'RESOLVED',
    assignedAdminId: admin.id,
    assignedAdminName: admin.name,
    resolution: {
      ...resolution,
      resolvedBy: admin.name,
      resolvedAt: now,
    },
    updatedAt: now,
  };

  await updateDoc(disputeRef, updateData);

  // Add system resolution message
  await sendDisputeMessage({
    disputeId,
    senderId: admin.id,
    senderName: `Admin ${admin.name}`,
    senderRole: 'admin',
    message: `Dispute RESOLVED [${resolution.type}]: ${resolution.notes}`,
  });

  // Update linked return request
  if (existing.returnId) {
    const returnNewStatus =
      resolution.type === 'APPROVE_REFUND' || resolution.type === 'APPROVE_PARTIAL_REFUND'
        ? 'APPROVED_FOR_REFUND'
        : resolution.type === 'APPROVE_EXCHANGE'
        ? 'EXCHANGE_PENDING'
        : 'CLOSED';

    await updateReturnStatus({
      returnId: existing.returnId,
      newStatus: returnNewStatus,
      actor: { id: admin.id, name: admin.name, role: 'admin' },
      note: `Dispute #${disputeId} resolved: ${resolution.notes}`,
    }).catch((err) => console.warn('Error syncing return request on dispute resolution:', err));
  }

  // Audit log
  await createAuditLog({
    action: 'DISPUTE_RESOLVED',
    actorId: admin.id,
    performedBy: admin.name,
    actorRole: 'admin',
    entityType: 'dispute',
    entityId: disputeId,
    targetType: 'order',
    targetId: existing.orderId,
    details: `Dispute #${disputeId} resolved via ${resolution.type}. Notes: ${resolution.notes}`,
    timestamp: now,
  });

  return { ...existing, ...updateData };
}

/**
 * Fetches all messages for a dispute
 */
export async function fetchDisputeMessages(disputeId: string): Promise<DisputeMessage[]> {
  try {
    const q = query(collection(db, DISPUTE_MESSAGES_COL), where('disputeId', '==', disputeId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DisputeMessage));
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn('Error fetching dispute messages:', err);
    return [];
  }
}

/**
 * Flexible wrapper for dispute resolution supporting both AdminReturnsDisputesTab and resolveDisputeByAdmin
 */
export async function resolveDispute(payload: {
  disputeId: string;
  decision?: any;
  resolutionDecision?: any;
  faultAttribution?: any;
  refundAmount?: number;
  settlementAmount?: number;
  notes?: string;
  arbitrationNotes?: string;
  actor?: { id: string; name: string; role?: any };
  admin?: { id: string; name: string };
  resolution?: any;
}): Promise<DisputeRecord> {
  const adminInfo = payload.admin || payload.actor || { id: 'admin-01', name: 'Super Admin' };
  const effectiveDecision = payload.resolutionDecision || payload.decision;
  const resType =
    effectiveDecision === 'FULL_REFUND'
      ? 'APPROVE_REFUND'
      : effectiveDecision === 'PARTIAL_REFUND'
      ? 'APPROVE_PARTIAL_REFUND'
      : effectiveDecision === 'REPLACEMENT'
      ? 'APPROVE_EXCHANGE'
      : effectiveDecision === 'REJECT_CLAIM'
      ? 'REJECT_CLAIM'
      : payload.resolution?.type || 'APPROVE_REFUND';

  return resolveDisputeByAdmin({
    disputeId: payload.disputeId,
    admin: adminInfo,
    resolution: {
      type: resType as any,
      refundAmount: payload.settlementAmount ?? payload.refundAmount ?? payload.resolution?.refundAmount,
      notes: payload.arbitrationNotes || payload.notes || payload.resolution?.notes || 'Arbitration decision finalized',
    },
  });
}

// Aliases for seamless interoperability
export const openDispute = createDispute;
export const postDisputeMessage = async (payload: {
  disputeId: string;
  senderId: string;
  senderName: string;
  senderRole: any;
  message: string;
  attachments?: string[];
}) => {
  const normalizedRole =
    payload.senderRole?.toLowerCase() === 'customer'
      ? 'customer'
      : payload.senderRole?.toLowerCase() === 'seller'
      ? 'seller'
      : 'admin';
  return sendDisputeMessage({
    disputeId: payload.disputeId,
    senderId: payload.senderId,
    senderName: payload.senderName,
    senderRole: normalizedRole,
    message: payload.message,
    attachments: payload.attachments,
  });
};

