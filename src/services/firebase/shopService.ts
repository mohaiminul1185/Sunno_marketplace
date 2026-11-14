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
import { Store } from '../../types';

export const SHOPS_COL = 'shops';
export const STORES_COL = 'stores';

export interface ShopData extends Store {
  shopId?: string;
  shopName?: string;
  ratingAverage?: number;
  reviewCount?: number;
}

export function normalizeShop(docId: string, data: any): Store {
  const name = data.shopName || data.name || 'Artisan Workshop';
  const slug = data.slug || docId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: docId,
    sellerId: data.sellerId || '',
    name,
    slug,
    description: data.description || '',
    tagline: data.tagline || '',
    logo: data.logo || data.logoUrl || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=200&auto=format&fit=crop&q=80',
    banner: data.banner || data.bannerUrl || 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?w=1200&auto=format&fit=crop&q=80',
    logoUrl: data.logoUrl || data.logo,
    bannerUrl: data.bannerUrl || data.banner,
    district: data.district || data.districtId || 'Dhaka',
    division: data.division || data.divisionId || 'Dhaka',
    rating: typeof data.ratingAverage === 'number' ? data.ratingAverage : (typeof data.rating === 'number' ? data.rating : 0),
    reviewsCount: typeof data.reviewCount === 'number' ? data.reviewCount : (typeof data.reviewsCount === 'number' ? data.reviewsCount : 0),
    ecoVerified: Boolean(data.ecoVerified),
    ecoVerification: data.ecoVerification || (data.ecoVerified ? { status: 'verified', category: 'Handmade Eco' } : { status: 'unverified' }),
    category: data.category || '',
    ownerName: data.ownerName || data.sellerName || '',
    phone: data.phone || data.contactPhone || '',
    email: data.email || data.contactEmail || '',
    whatsapp: data.whatsapp || '',
    businessAddress: data.businessAddress || '',
    businessHours: data.businessHours || '',
    policies: data.policies || {},
    socialLinks: data.socialLinks || {},
    totalSales: data.totalSales || 0,
    productCount: data.productCount || 0,
    followersCount: data.followersCount || 0,
    status: data.status || 'active',
    statusMessage: data.statusMessage || '',
    allowOrdersWhileUnavailable: Boolean(data.allowOrdersWhileUnavailable),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Fetch a shop/store by its ID
 */
export async function getShopById(shopId: string): Promise<Store | null> {
  try {
    // 1. Try 'stores' collection first
    const storeRef = doc(db, STORES_COL, shopId);
    const storeSnap = await getDoc(storeRef);
    if (storeSnap.exists()) {
      return normalizeShop(storeSnap.id, storeSnap.data());
    }

    // 2. Try 'shops' collection
    const shopRef = doc(db, SHOPS_COL, shopId);
    const shopSnap = await getDoc(shopRef);
    if (shopSnap.exists()) {
      return normalizeShop(shopSnap.id, shopSnap.data());
    }

    // 3. Try query by slug or sellerId
    const qStores = query(collection(db, STORES_COL), where('slug', '==', shopId.toLowerCase()));
    const qSnap = await getDocs(qStores);
    if (!qSnap.empty) {
      return normalizeShop(qSnap.docs[0].id, qSnap.docs[0].data());
    }

    return null;
  } catch (err) {
    console.warn('getShopById notice:', err);
    return null;
  }
}

/**
 * Fetch a shop/store by its slug
 */
export async function getShopBySlug(slug: string): Promise<Store | null> {
  try {
    const cleanSlug = slug.toLowerCase().trim();
    // Check stores
    const qStores = query(collection(db, STORES_COL), where('slug', '==', cleanSlug));
    const snapStores = await getDocs(qStores);
    if (!snapStores.empty) {
      return normalizeShop(snapStores.docs[0].id, snapStores.docs[0].data());
    }

    // Check shops
    const qShops = query(collection(db, SHOPS_COL), where('slug', '==', cleanSlug));
    const snapShops = await getDocs(qShops);
    if (!snapShops.empty) {
      return normalizeShop(snapShops.docs[0].id, snapShops.docs[0].data());
    }

    // Fallback direct doc lookup
    return await getShopById(cleanSlug);
  } catch (err) {
    console.warn('getShopBySlug notice:', err);
    return null;
  }
}

/**
 * Fetch shop by sellerId
 */
export async function getShopBySellerId(sellerId: string): Promise<Store | null> {
  try {
    const q = query(collection(db, STORES_COL), where('sellerId', '==', sellerId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return normalizeShop(snap.docs[0].id, snap.docs[0].data());
    }

    const qShops = query(collection(db, SHOPS_COL), where('sellerId', '==', sellerId));
    const snapShops = await getDocs(qShops);
    if (!snapShops.empty) {
      return normalizeShop(snapShops.docs[0].id, snapShops.docs[0].data());
    }

    return null;
  } catch (err) {
    console.warn('getShopBySellerId notice:', err);
    return null;
  }
}

/**
 * Fetch all active shops
 */
export async function getAllActiveShops(): Promise<Store[]> {
  try {
    const q = query(collection(db, STORES_COL), where('status', '==', 'active'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => normalizeShop(d.id, d.data()));
    }

    // Fallback to all stores
    const allSnap = await getDocs(collection(db, STORES_COL));
    return allSnap.docs
      .map((d) => normalizeShop(d.id, d.data()))
      .filter((s) => s.status === 'active');
  } catch (err) {
    console.warn('getAllActiveShops notice:', err);
    return [];
  }
}
