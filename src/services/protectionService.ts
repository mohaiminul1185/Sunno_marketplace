import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CustomerRiskProfile, SellerProtectionRecord, FaultAttribution } from '../types';
import { createAuditLog } from './dbService';

export const CUSTOMER_RISK_COL = 'customer_risk_profiles';
export const SELLER_PROTECTION_COL = 'seller_protection_records';

/**
 * Calculates and evaluates customer risk based on return history and disputes
 */
export async function evaluateCustomerRisk(userId: string, customerName: string): Promise<CustomerRiskProfile> {
  const ref = doc(db, CUSTOMER_RISK_COL, userId);
  let existingProfile: CustomerRiskProfile | null = null;

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      existingProfile = snap.data() as CustomerRiskProfile;
    }
  } catch (err) {
    console.warn('Error fetching risk profile:', err);
  }

  // Count returns and disputes for this customer
  let totalReturns = 0;
  let totalRefundAmount = 0;
  let totalDisputes = 0;

  try {
    const retSnap = await getDocs(query(collection(db, 'returns'), where('customerId', '==', userId)));
    totalReturns = retSnap.size;
    retSnap.forEach((d) => {
      totalRefundAmount += d.data().refundAmount || 0;
    });

    const dispSnap = await getDocs(query(collection(db, 'disputes'), where('customerId', '==', userId)));
    totalDisputes = dispSnap.size;
  } catch (err) {
    console.warn('Risk evaluation query error:', err);
  }

  const totalOrders = Math.max(1, existingProfile?.totalOrders || (totalReturns > 0 ? totalReturns + 2 : 5));
  const returnRate = Math.round((totalReturns / totalOrders) * 100);

  const flags: string[] = [];
  let score = 10;

  if (returnRate > 50 && totalReturns >= 3) {
    flags.push('HIGH_RETURN_RATIO');
    score += 35;
  } else if (returnRate > 30) {
    score += 15;
  }

  if (totalDisputes >= 2) {
    flags.push('FREQUENT_DISPUTES');
    score += 30;
  }

  if (totalRefundAmount > 15000) {
    flags.push('HIGH_REFUND_VOLUME');
    score += 20;
  }

  const riskScore = Math.min(100, score);
  const riskLevel: CustomerRiskProfile['riskLevel'] =
    riskScore >= 85 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 35 ? 'MEDIUM' : 'LOW';

  const riskTier: CustomerRiskProfile['riskTier'] =
    riskLevel === 'CRITICAL' ? 'RESTRICTED' : riskLevel === 'HIGH' ? 'HIGH' : riskLevel === 'MEDIUM' ? 'MEDIUM' : 'LOW';

  const profile: CustomerRiskProfile = {
    userId,
    customerName,
    riskScore,
    riskLevel,
    riskTier,
    totalOrders,
    totalReturns,
    totalDisputes,
    totalRefundAmount,
    returnRate,
    codRejectionRate: existingProfile?.codRejectionRate || 0,
    disputeRate: Math.round((totalDisputes / totalOrders) * 100),
    suspiciousFlags: flags,
    manualReviewRequired: riskScore >= 60,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(ref, profile, { merge: true });
  return profile;
}

/**
 * Fetches all customer risk profiles for admin surveillance
 */
export async function fetchAllRiskProfiles(): Promise<CustomerRiskProfile[]> {
  try {
    const snap = await getDocs(collection(db, CUSTOMER_RISK_COL));
    return snap.docs.map((d) => ({ ...d.data() } as CustomerRiskProfile));
  } catch (err) {
    console.warn('Error fetching all risk profiles:', err);
    return [];
  }
}

/**
 * Updates a customer's risk tier and saves an audit log
 */
export async function updateCustomerRiskTier(
  userId: string,
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'RESTRICTED',
  adminName: string
): Promise<void> {
  const ref = doc(db, CUSTOMER_RISK_COL, userId);
  await updateDoc(ref, {
    riskTier,
    updatedAt: new Date().toISOString(),
    manualReviewRequired: riskTier === 'HIGH' || riskTier === 'RESTRICTED',
  });

  await createAuditLog({
    action: 'CUSTOMER_RISK_TIER_UPDATED',
    actorId: 'admin',
    performedBy: adminName,
    actorRole: 'admin',
    entityType: 'customer',
    entityId: userId,
    targetType: 'customer',
    targetId: userId,
    details: `Customer ${userId} adjusted to risk tier ${riskTier}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Submits a seller protection claim when item returned was damaged by customer or courier
 */
export async function submitSellerProtectionClaim(payload: {
  returnId: string;
  orderId?: string;
  sellerId: string;
  sellerName?: string;
  sellerStoreName?: string;
  customerId?: string;
  faultAttribution?: FaultAttribution;
  claimReason?: any;
  compensationAmount?: number;
  claimedAmount?: number;
  inspectionEvidence?: string[];
  evidencePhotos?: string[];
  notes?: string;
  explanation?: string;
}): Promise<SellerProtectionRecord> {
  const claimId = `claim-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const record: SellerProtectionRecord = {
    id: claimId,
    returnId: payload.returnId,
    orderId: payload.orderId || 'ORD-UNKNOWN',
    sellerId: payload.sellerId,
    sellerName: payload.sellerName || payload.sellerStoreName || 'Artisan Workshop',
    sellerStoreName: payload.sellerStoreName || payload.sellerName || 'Artisan Workshop',
    customerId: payload.customerId || 'customer-anonymous',
    faultAttribution: payload.faultAttribution || (payload.claimReason === 'TRANSIT_DAMAGE' ? 'TRANSIT_DAMAGE' : 'CUSTOMER_MISUSE'),
    claimReason: payload.claimReason || 'TRANSIT_DAMAGE',
    claimStatus: 'SUBMITTED',
    status: 'PENDING',
    compensationAmount: payload.compensationAmount || payload.claimedAmount || 0,
    claimedAmount: payload.claimedAmount || payload.compensationAmount || 0,
    inspectionEvidence: payload.inspectionEvidence || payload.evidencePhotos || [],
    evidencePhotos: payload.evidencePhotos || payload.inspectionEvidence || [],
    adminDecisionNotes: payload.notes || payload.explanation || '',
    explanation: payload.explanation || payload.notes || '',
    createdAt: now,
  };

  const ref = doc(db, SELLER_PROTECTION_COL, claimId);
  await setDoc(ref, record);

  await createAuditLog({
    action: 'SELLER_PROTECTION_CLAIM_SUBMITTED',
    actorId: payload.sellerId,
    performedBy: record.sellerName,
    actorRole: 'seller',
    entityType: 'seller_protection',
    entityId: claimId,
    targetType: 'order',
    targetId: record.orderId,
    details: `Seller Protection Claim filed for Return #${payload.returnId}. Claim amount: ৳${record.claimedAmount}`,
    timestamp: now,
  });

  return record;
}

export const createSellerProtectionClaim = submitSellerProtectionClaim;

/**
 * Fetches protection claims for a seller or all if no sellerId is given
 */
export async function fetchSellerProtectionRecords(sellerId?: string): Promise<SellerProtectionRecord[]> {
  try {
    let q = query(collection(db, SELLER_PROTECTION_COL));
    if (sellerId) {
      q = query(collection(db, SELLER_PROTECTION_COL), where('sellerId', '==', sellerId));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SellerProtectionRecord));
  } catch (err) {
    console.warn('Fetch seller protection error:', err);
    return [];
  }
}

/**
 * Reviews and adjudicates a seller protection claim by Admin
 */
export async function reviewSellerProtectionClaim(payload: {
  recordId: string;
  status: 'APPROVED' | 'REJECTED';
  approvedAmount?: number;
  reviewedBy: string;
}): Promise<SellerProtectionRecord> {
  const ref = doc(db, SELLER_PROTECTION_COL, payload.recordId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Seller protection claim not found.');
  }

  const existing = snap.data() as SellerProtectionRecord;
  const updateData: Partial<SellerProtectionRecord> = {
    status: payload.status,
    claimStatus: payload.status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
    approvedAmount: payload.status === 'APPROVED' ? payload.approvedAmount || existing.claimedAmount : 0,
    reviewedBy: payload.reviewedBy,
    reviewedAt: new Date().toISOString(),
  };

  await updateDoc(ref, updateData);

  await createAuditLog({
    action: 'SELLER_PROTECTION_CLAIM_REVIEWED',
    actorId: 'admin',
    performedBy: payload.reviewedBy,
    actorRole: 'admin',
    entityType: 'seller_protection',
    entityId: payload.recordId,
    targetType: 'order',
    targetId: existing.orderId,
    details: `Claim #${payload.recordId} reviewed: ${payload.status}. Amount: ৳${updateData.approvedAmount}`,
    timestamp: new Date().toISOString(),
  });

  return { ...existing, ...updateData };
}
