/**
 * SUNNO Marketplace - Professional Store Service
 * Handles Store Profile CRUD, unique slug generation, availability state management,
 * and multi-tenant security enforcement.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Store, StoreStatus, Review, UserRole } from '../types';
import { normalizeShop, STORES_COL, SHOPS_COL } from './firebase/shopService';
import { createAuditLog } from './dbService';

export { STORES_COL, SHOPS_COL };

/**
 * Validates and sanitizes a store slug
 */
export function sanitizeStoreSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Checks if a store slug is available across both stores and shops collections
 */
export async function isStoreSlugUnique(slug: string, currentStoreId?: string): Promise<boolean> {
  const clean = sanitizeStoreSlug(slug);
  if (!clean) return false;

  try {
    // Check stores collection
    const qStores = query(collection(db, STORES_COL), where('slug', '==', clean));
    const snapStores = await getDocs(qStores);
    for (const d of snapStores.docs) {
      if (d.id !== currentStoreId) {
        return false;
      }
    }

    // Check shops collection for legacy compatibility
    const qShops = query(collection(db, SHOPS_COL), where('slug', '==', clean));
    const snapShops = await getDocs(qShops);
    for (const d of snapShops.docs) {
      if (d.id !== currentStoreId) {
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn('isStoreSlugUnique check notice:', err);
    return true;
  }
}

/**
 * Generates an available unique slug based on the store name
 */
export async function generateUniqueStoreSlug(storeName: string, currentStoreId?: string): Promise<string> {
  const base = sanitizeStoreSlug(storeName) || 'artisan-store';
  let candidate = base;
  let counter = 1;

  while (!(await isStoreSlugUnique(candidate, currentStoreId))) {
    candidate = `${base}-${counter}`;
    counter++;
    if (counter > 20) {
      candidate = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }

  return candidate;
}

/**
 * Fetch a store by seller ID (the authenticated seller UID)
 */
export async function fetchStoreBySellerId(sellerId: string): Promise<Store | null> {
  if (!sellerId) return null;
  try {
    const q = query(collection(db, STORES_COL), where('sellerId', '==', sellerId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return normalizeShop(snap.docs[0].id, snap.docs[0].data());
    }

    // Fallback check legacy shops
    const qLegacy = query(collection(db, SHOPS_COL), where('sellerId', '==', sellerId));
    const snapLegacy = await getDocs(qLegacy);
    if (!snapLegacy.empty) {
      return normalizeShop(snapLegacy.docs[0].id, snapLegacy.docs[0].data());
    }

    // Check direct doc ID match
    const docRef = doc(db, STORES_COL, `store-${sellerId}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return normalizeShop(docSnap.id, docSnap.data());
    }

    return null;
  } catch (err) {
    console.warn('fetchStoreBySellerId notice:', err);
    return null;
  }
}

/**
 * Fetch a store by unique slug
 */
export async function fetchStoreBySlug(slug: string): Promise<Store | null> {
  const clean = sanitizeStoreSlug(slug);
  if (!clean) return null;

  try {
    const q = query(collection(db, STORES_COL), where('slug', '==', clean));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return normalizeShop(snap.docs[0].id, snap.docs[0].data());
    }

    // Legacy fallback
    const qLegacy = query(collection(db, SHOPS_COL), where('slug', '==', clean));
    const snapLegacy = await getDocs(qLegacy);
    if (!snapLegacy.empty) {
      return normalizeShop(snapLegacy.docs[0].id, snapLegacy.docs[0].data());
    }

    return null;
  } catch (err) {
    console.warn('fetchStoreBySlug notice:', err);
    return null;
  }
}

/**
 * Fetch a store by its doc ID
 */
export async function fetchStoreById(storeId: string): Promise<Store | null> {
  if (!storeId) return null;
  try {
    const storeRef = doc(db, STORES_COL, storeId);
    const storeSnap = await getDoc(storeRef);
    if (storeSnap.exists()) {
      return normalizeShop(storeSnap.id, storeSnap.data());
    }

    const shopRef = doc(db, SHOPS_COL, storeId);
    const shopSnap = await getDoc(shopRef);
    if (shopSnap.exists()) {
      return normalizeShop(shopSnap.id, shopSnap.data());
    }

    return null;
  } catch (err) {
    console.warn('fetchStoreById notice:', err);
    return null;
  }
}

/**
 * Validates store URL strings
 */
function isValidOptionalUrl(url?: string): boolean {
  if (!url || !url.trim()) return true;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Saves or updates a seller's store profile in Firestore
 * Enforces authenticated ownership, prevents duplicate stores, validates inputs
 */
export async function saveStoreProfile(
  sellerId: string,
  payload: Partial<Store>,
  existingStoreId?: string,
  actorRole: UserRole = 'seller'
): Promise<Store> {
  if (!sellerId) {
    throw new Error('Authentication required: sellerId is missing.');
  }

  // 1. Validate required fields
  if (!payload.name || !payload.name.trim()) {
    throw new Error('Store name is required.');
  }
  if (!payload.description || !payload.description.trim()) {
    throw new Error('Store description is required.');
  }
  if (!payload.district || !payload.district.trim()) {
    throw new Error('District selection is required.');
  }
  if (!payload.division || !payload.division.trim()) {
    throw new Error('Division selection is required.');
  }

  // 2. Validate URLs if provided
  if (!isValidOptionalUrl(payload.socialLinks?.website)) {
    throw new Error('Invalid Website URL format (must start with http:// or https://)');
  }
  if (!isValidOptionalUrl(payload.socialLinks?.facebook)) {
    throw new Error('Invalid Facebook URL format');
  }
  if (!isValidOptionalUrl(payload.socialLinks?.instagram)) {
    throw new Error('Invalid Instagram URL format');
  }
  if (!isValidOptionalUrl(payload.socialLinks?.youtube)) {
    throw new Error('Invalid YouTube URL format');
  }

  // 3. Resolve target store ID and check for existing store to avoid duplicates
  let targetStoreId = existingStoreId;
  const existingStore = await fetchStoreBySellerId(sellerId);
  if (existingStore) {
    targetStoreId = existingStore.id;
  } else if (!targetStoreId) {
    targetStoreId = `store-${sellerId}`;
  }

  // 4. Generate & Validate Unique Slug
  const candidateSlug = sanitizeStoreSlug(payload.slug || payload.name);
  let finalSlug = candidateSlug;
  const isAvailable = await isStoreSlugUnique(candidateSlug, targetStoreId);
  if (!isAvailable) {
    if (payload.slug && payload.slug.trim() && payload.slug !== existingStore?.slug) {
      throw new Error(`The store URL slug "${payload.slug}" is already taken by another artisan. Please choose a different slug.`);
    }
    finalSlug = await generateUniqueStoreSlug(payload.name, targetStoreId);
  }

  // 5. Protect Eco-Verification status from self-approval
  let ecoVerified = existingStore?.ecoVerified ?? false;
  let ecoVerification = existingStore?.ecoVerification ?? {
    status: 'unverified',
  };

  if (actorRole === 'admin' || actorRole === 'super_admin') {
    if (payload.ecoVerified !== undefined) ecoVerified = payload.ecoVerified;
    if (payload.ecoVerification) ecoVerification = payload.ecoVerification;
  }

  // 6. Build final cleaned store record
  const now = new Date().toISOString();
  const storeDoc: Store = {
    id: targetStoreId,
    sellerId,
    name: payload.name.trim(),
    slug: finalSlug,
    tagline: payload.tagline?.trim() || '',
    description: payload.description.trim(),
    category: payload.category?.trim() || existingStore?.category || 'Handmade & Eco Living',
    ownerName: payload.ownerName?.trim() || existingStore?.ownerName || '',
    logo: payload.logo || payload.logoUrl || existingStore?.logo || '',
    banner: payload.banner || payload.bannerUrl || existingStore?.banner || '',
    logoUrl: payload.logoUrl || payload.logo || existingStore?.logoUrl || '',
    bannerUrl: payload.bannerUrl || payload.banner || existingStore?.bannerUrl || '',
    phone: payload.phone?.trim() || existingStore?.phone || '',
    email: payload.email?.trim() || existingStore?.email || '',
    whatsapp: payload.whatsapp?.trim() || existingStore?.whatsapp || '',
    businessAddress: payload.businessAddress?.trim() || existingStore?.businessAddress || '',
    division: payload.division.trim(),
    district: payload.district.trim(),
    businessHours: payload.businessHours?.trim() || existingStore?.businessHours || '',
    policies: {
      shippingPolicy: payload.policies?.shippingPolicy || payload.policies?.shipping || existingStore?.policies?.shippingPolicy || '',
      returnPolicy: payload.policies?.returnPolicy || payload.policies?.returns || existingStore?.policies?.returnPolicy || '',
      privacyPolicy: payload.policies?.privacyPolicy || existingStore?.policies?.privacyPolicy || '',
      sustainabilityStatement: payload.policies?.sustainabilityStatement || payload.policies?.sustainability || existingStore?.policies?.sustainabilityStatement || '',
      // Backward compatibility aliases
      shipping: payload.policies?.shippingPolicy || payload.policies?.shipping || existingStore?.policies?.shipping || '',
      returns: payload.policies?.returnPolicy || payload.policies?.returns || existingStore?.policies?.returns || '',
      sustainability: payload.policies?.sustainabilityStatement || payload.policies?.sustainability || existingStore?.policies?.sustainability || '',
    },
    socialLinks: {
      facebook: payload.socialLinks?.facebook?.trim() || existingStore?.socialLinks?.facebook || '',
      instagram: payload.socialLinks?.instagram?.trim() || existingStore?.socialLinks?.instagram || '',
      youtube: payload.socialLinks?.youtube?.trim() || existingStore?.socialLinks?.youtube || '',
      website: payload.socialLinks?.website?.trim() || existingStore?.socialLinks?.website || '',
    },
    status: (payload.status as StoreStatus) || existingStore?.status || 'active',
    statusMessage: payload.statusMessage?.trim() || existingStore?.statusMessage || '',
    allowOrdersWhileUnavailable: payload.allowOrdersWhileUnavailable ?? existingStore?.allowOrdersWhileUnavailable ?? false,
    rating: existingStore?.rating ?? 0,
    reviewsCount: existingStore?.reviewsCount ?? 0,
    followersCount: existingStore?.followersCount ?? 0,
    productCount: existingStore?.productCount ?? 0,
    ecoVerified,
    ecoVerification,
    createdAt: existingStore?.createdAt || now,
    updatedAt: now,
  };

  // 7. Persist to Firestore
  const storeRef = doc(db, STORES_COL, targetStoreId);
  await setDoc(storeRef, storeDoc, { merge: true });

  // 8. Audit log
  await createAuditLog({
    action: existingStore ? 'STORE_PROFILE_UPDATED' : 'STORE_PROFILE_CREATED',
    performedBy: sellerId,
    actorId: sellerId,
    actorRole,
    entityType: 'store',
    entityId: targetStoreId,
    targetType: 'store',
    targetId: targetStoreId,
    details: `Seller ${sellerId} saved store profile "${storeDoc.name}" (${storeDoc.slug}) with status ${storeDoc.status}`,
    timestamp: now,
  });

  return storeDoc;
}

/**
 * Updates store status (Active, Vacation, Temporarily Closed, Maintenance)
 */
export async function updateStoreAvailability(
  storeId: string,
  sellerId: string,
  status: StoreStatus,
  statusMessage?: string,
  allowOrders?: boolean
): Promise<void> {
  const store = await fetchStoreById(storeId);
  if (!store) {
    throw new Error('Store not found.');
  }
  if (store.sellerId !== sellerId) {
    throw new Error('Unauthorized: You can only update availability for your own store.');
  }

  const storeRef = doc(db, STORES_COL, storeId);
  const updateData: Partial<Store> = {
    status,
    statusMessage: statusMessage?.trim() || '',
    allowOrdersWhileUnavailable: Boolean(allowOrders),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(storeRef, updateData, { merge: true });

  await createAuditLog({
    action: 'STORE_STATUS_UPDATED',
    performedBy: sellerId,
    actorId: sellerId,
    entityType: 'store',
    entityId: storeId,
    targetType: 'store',
    targetId: storeId,
    details: `Store status changed to ${status}${statusMessage ? `: ${statusMessage}` : ''}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Fetches verified customer reviews for this specific store
 */
export async function fetchRealStoreReviews(storeId: string, sellerId?: string): Promise<Review[]> {
  try {
    const reviewsRef = collection(db, 'reviews');
    // Query by storeId or sellerId
    let q = query(reviewsRef, where('storeId', '==', storeId), orderBy('createdAt', 'desc'), limit(50));
    let snap = await getDocs(q);

    if (snap.empty && sellerId) {
      q = query(reviewsRef, where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'), limit(50));
      snap = await getDocs(q);
    }

    if (snap.empty) {
      return [];
    }

    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as Review));
  } catch (err) {
    console.warn('fetchRealStoreReviews notice:', err);
    return [];
  }
}
