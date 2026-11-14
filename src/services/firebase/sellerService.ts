import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { SellerProfile } from '../../types';

export const SELLERS_COL = 'sellers';
export const SELLER_PROFILES_COL = 'seller_profiles';

export interface PublicSellerInfo {
  sellerId: string;
  storeName: string;
  businessDescription?: string;
  division?: string;
  district?: string;
  ecoVerificationStatus?: string;
  rating?: number;
  badges?: string[];
  createdAt?: string;
}

export function sanitizePublicSellerProfile(docId: string, data: any): PublicSellerInfo {
  return {
    sellerId: docId,
    storeName: data.storeName || data.businessName || 'Artisan Seller',
    businessDescription: data.storeDescription || data.businessDescription || '',
    division: data.division || '',
    district: data.district || '',
    ecoVerificationStatus: data.ecoVerificationStatus || (data.status === 'approved' ? 'verified' : data.status),
    rating: typeof data.rating === 'number' ? data.rating : 5.0,
    badges: data.badges || ['Verified Artisan'],
    createdAt: data.createdAt,
    // Note: NEVER include settlementInfo, routingNumber, accountNumber, documents, rejectionReason, or internal notes
  };
}

/**
 * Fetch public profile for a seller by sellerId
 */
export async function getPublicSellerProfile(sellerId: string): Promise<PublicSellerInfo | null> {
  try {
    const docRef = doc(db, SELLERS_COL, sellerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      // Only return if seller is approved/active
      if (data.status === 'approved' || data.status === 'active') {
        return sanitizePublicSellerProfile(snap.id, data);
      }
    }

    // Try query by userId
    const q = query(
      collection(db, SELLERS_COL),
      where('userId', '==', sellerId)
    );
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const d = querySnap.docs[0];
      const data = d.data();
      if (data.status === 'approved' || data.status === 'active') {
        return sanitizePublicSellerProfile(d.id, data);
      }
    }

    return null;
  } catch (err) {
    console.warn('getPublicSellerProfile notice:', err);
    return null;
  }
}

/**
 * Fetch private seller profile from seller_profiles collection (for authenticated seller or admin)
 */
export async function getPrivateSellerProfile(userId: string): Promise<SellerProfile | null> {
  try {
    const ref = doc(db, SELLER_PROFILES_COL, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as SellerProfile;
    }
    return null;
  } catch (err) {
    console.warn('getPrivateSellerProfile notice:', err);
    return null;
  }
}

/**
 * Fetch full seller document for authorized seller or admin
 */
export async function getSellerById(sellerId: string): Promise<SellerProfile | null> {
  try {
    // Check seller_profiles first
    const profileRef = doc(db, SELLER_PROFILES_COL, sellerId);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      return { id: profileSnap.id, ...profileSnap.data() } as SellerProfile;
    }

    const docRef = doc(db, SELLERS_COL, sellerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as SellerProfile;
    }

    const q = query(collection(db, SELLERS_COL), where('userId', '==', sellerId));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return { id: querySnap.docs[0].id, ...querySnap.docs[0].data() } as SellerProfile;
    }

    return null;
  } catch (err) {
    console.warn('getSellerById notice:', err);
    return null;
  }
}

/**
 * Save seller profile to seller_profiles and mirror to sellers
 */
export async function saveSellerProfileData(sellerProfile: SellerProfile): Promise<void> {
  try {
    const now = new Date().toISOString();
    const docId = sellerProfile.userId || sellerProfile.id;
    const payload = {
      ...sellerProfile,
      userId: docId,
      updatedAt: now,
      createdAt: sellerProfile.createdAt || now,
    };
    
    // Write to private seller_profiles/{userId}
    const profileRef = doc(db, SELLER_PROFILES_COL, docId);
    await setDoc(profileRef, payload, { merge: true });

    // Only mirror to public sellers/{userId} if approved
    if (payload.status === 'approved') {
      const sellersRef = doc(db, SELLERS_COL, docId);
      await setDoc(sellersRef, payload, { merge: true });
    }
  } catch (err) {
    console.warn('saveSellerProfileData notice:', err);
    throw err;
  }
}

/**
 * Get all active/approved sellers for public directories
 */
export async function getAllActiveSellers(): Promise<PublicSellerInfo[]> {
  try {
    const q = query(collection(db, SELLERS_COL), where('status', 'in', ['approved', 'active']));
    const snap = await getDocs(q);
    return snap.docs.map((d) => sanitizePublicSellerProfile(d.id, d.data()));
  } catch (err) {
    console.warn('getAllActiveSellers notice:', err);
    return [];
  }
}
