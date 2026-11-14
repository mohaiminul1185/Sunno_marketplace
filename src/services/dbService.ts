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
import { db, auth } from '../lib/firebase';
import {
  Product,
  SellerProfile,
  Store,
  Order,
  QueueSubmission,
  Review,
  AuditLog,
  UserProfile,
  DistrictInfo,
  Category,
  Message,
  Notification,
  UserAddress,
  UserRole,
  SellerPlan,
  CommissionSetting,
} from '../types';
import { BANGLADESH_60_ECO_PRODUCTS } from '../data/bangladeshEcoProducts';
import { INITIAL_PRODUCTS, SELLER_AVATAR, BURIGANGA_DHAKA_HERO } from '../data/mockData';
import { ALL_64_DISTRICTS, BANGLADESH_DIVISIONS } from '../data/bangladeshDistricts';
import {
  notifyEcoSubmissionReceived,
  notifyEcoSubmissionApproved,
  notifyEcoSubmissionRejected,
  notifyEcoSubmissionChangesRequested,
} from './notificationService';
import { recordTelemetryEvent } from './monitoringService';

// Collection Constants
export const USERS_COL = 'users';
export const USER_PROFILES_COL = 'user_profiles';
export const SELLER_PROFILES_COL = 'seller_profiles';
export const SELLERS_COL = 'sellers';
export const STORES_COL = 'stores';
export const PRODUCTS_COL = 'products';
export const ECO_VERIF_COL = 'eco_verifications';
export const ORDERS_COL = 'orders';
export const REVIEWS_COL = 'reviews';
export const WISHLISTS_COL = 'wishlists';
export const ADDRESSES_COL = 'addresses';
export const MESSAGES_COL = 'messages';
export const NOTIFICATIONS_COL = 'notifications';
export const AUDIT_LOGS_COL = 'audit_logs';
export const DISTRICTS_COL = 'districts';
export const DIVISIONS_COL = 'divisions';
export const CATEGORIES_COL = 'categories';
export const SELLER_PLANS_COL = 'seller_plans';
export const COMMISSION_SETTINGS_COL = 'commission_settings';
export const SELLER_FOLLOWERS_COL = 'seller_followers';
export const CARTS_COL = 'carts';
export const COUPONS_COL = 'coupons';

export const INITIAL_SELLER_PLANS: SellerPlan[] = [
  {
    id: 'plan-basic',
    name: 'Artisan Starter',
    price: 0,
    duration: 'lifetime',
    productLimit: 10,
    maxImagesPerProduct: 3,
    commissionRate: 12,
    features: [
      'Up to 10 Eco Products',
      '3 Images per Listing',
      'Standard 24-48h Verification',
      'Public Store Page',
      'Standard 12% Platform Commission',
      'Community Artisan Support',
    ],
    active: true,
  },
  {
    id: 'plan-pro',
    name: 'Heritage Professional',
    price: 1500,
    duration: 'yearly',
    productLimit: 50,
    maxImagesPerProduct: 6,
    commissionRate: 8,
    features: [
      'Up to 50 Eco Products',
      '6 Images per Listing + Custom Banner',
      'Priority 12h Verification Queue',
      'Custom Storefront & Social Links',
      'Reduced 8% Platform Commission',
      'District Hero Spotlight Feature',
      'Detailed Eco Impact Analytics',
    ],
    isPopular: true,
    active: true,
  },
  {
    id: 'plan-premium',
    name: 'Master Artisan Cooperative',
    price: 3500,
    duration: 'yearly',
    productLimit: 500,
    maxImagesPerProduct: 10,
    commissionRate: 5,
    features: [
      'Unlimited Eco Listings',
      '10 High-Res Images & Video Links',
      'Expedited 4h Verification',
      'Dedicated Account Manager',
      'Lowest 5% Platform Commission',
      'SUNNO Verified Master Badge',
      'Custom Cooperative Sub-Domains',
      'Direct Buyer B2B Inquiries',
    ],
    active: true,
  },
];

export const DEFAULT_COMMISSION_SETTINGS: CommissionSetting = {
  id: 'global-commission-settings',
  defaultCommissionRate: 8.0,
  categoryRates: {
    'Bamboo & Cane': 7.0,
    'Jute & Natural Fiber': 7.0,
    'Handloom & Heritage Textiles': 8.0,
    'Clay & Terracotta Pottery': 8.0,
    'Organic Pantry & Teas': 10.0,
  },
  minPayoutThreshold: 500,
  payoutCycleDays: 7,
  updatedAt: new Date().toISOString(),
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  try {
    recordTelemetryEvent(
      errInfo.error.toLowerCase().includes('permission') ? 'FIRESTORE_PERMISSION_ERROR' : 'APP_ERROR',
      `Firestore ${operationType} on ${path || 'unknown'}: ${errInfo.error}`,
      errInfo.error.toLowerCase().includes('permission') ? 'error' : 'warn',
      { operationType, path, userId: errInfo.authInfo.userId }
    );
  } catch (_e) {}
  return errInfo;
}

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-organic-food',
    name: 'Organic Food',
    slug: 'organic-food',
    icon: 'spa',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOUaSv0uQId-keiipRAaGriIt8riRRmyx8Gs0IBKNs_o6X8CTN8LecVgOe5NueShCJKUAXF6ghmyAPQIOUW1BgcYE73mouneQdFb7q-YxBsYg0rpWZbwp-LU5BN1HVFZ83JwUtNHkhqtu2SnoqUD4H18hszcpcbJx2-DYqqr7gpdT156mprWC1zXwCbsiatUNyKB0R8NGMhXVwBeIjiAKd9RvWEATTLX3vl5oT1abVp6hgFxXDEaiv',
    description: 'Pure wildflower honey from Sundarbans, certified organic single-estate teas from Sylhet, heirloom rice, and heritage spices.',
    status: 'ACTIVE',
    displayOrder: 1,
    subcategories: [
      { id: 'sub-raw-honey', name: 'Raw Honey & Sweeteners', slug: 'raw-honey', status: 'ACTIVE', displayOrder: 1 },
      { id: 'sub-organic-tea', name: 'Organic Teas & Infusions', slug: 'organic-tea', status: 'ACTIVE', displayOrder: 2 },
      { id: 'sub-grains-rice', name: 'Heirloom Rice & Grains', slug: 'heirloom-grains', status: 'ACTIVE', displayOrder: 3 },
      { id: 'sub-spices-herbs', name: 'Spices & Botanical Herbs', slug: 'spices-herbs', status: 'ACTIVE', displayOrder: 4 },
      { id: 'sub-cold-pressed-oils', name: 'Cold-Pressed Oils & Ghee', slug: 'cold-pressed-oils', status: 'ACTIVE', displayOrder: 5 }
    ],
    productCount: 42,
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z'
  },
  {
    id: 'cat-handmade-crafts',
    name: 'Handmade Crafts',
    slug: 'handmade-crafts',
    icon: 'palette',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjvU0VgVohoFtrjLPvOMRCEflt-VTOTs2z0cTpzv9AE0o_sBKArEO7CvmhCXAapyzN1tsq1Tpffn4h0AsFVzC631OcVT9GOQnDh7eDnl9iKtTJgNt0ZMgU7W1n8Cto-h8kUJJVPGOajHj6O91BaFwcxP-FfiRjdi5czQ9CEztZRq2PYzdScfQ6NWTLrezi_RuFw65l4sArwxHCk05igv6sbYGvHQ-hh5QdDKhP2djGD8MPKdYG13pI',
    description: 'Artisan hand-woven bamboo baskets from Savar, golden jute rugs from Faridpur, and terracotta ceramics from Bogura.',
    status: 'ACTIVE',
    displayOrder: 2,
    subcategories: [
      { id: 'sub-bamboo-cane', name: 'Bamboo & River Cane', slug: 'bamboo-cane', status: 'ACTIVE', displayOrder: 1 },
      { id: 'sub-golden-jute', name: 'Jute Crafts & Braided Rugs', slug: 'jute-crafts', status: 'ACTIVE', displayOrder: 2 },
      { id: 'sub-clay-terracotta', name: 'Clay & Terracotta Pottery', slug: 'clay-pottery', status: 'ACTIVE', displayOrder: 3 },
      { id: 'sub-nakshi-kantha', name: 'Nakshi Kantha & Tapestry', slug: 'nakshi-kantha', status: 'ACTIVE', displayOrder: 4 },
      { id: 'sub-woodcraft', name: 'Reclaimed Woodcraft & Carvings', slug: 'reclaimed-woodcraft', status: 'ACTIVE', displayOrder: 5 }
    ],
    productCount: 68,
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z'
  },
  {
    id: 'cat-sustainable-fashion',
    name: 'Sustainable Fashion',
    slug: 'sustainable-fashion',
    icon: 'styler',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOq3sNPjw9EATJ1LP6zIKM1svb3j6ZGK1wiF_wKus2Flx5eUp6s9ON415h77YgV_6HWvZYYSXYKH3MjOEu5Flei1ndbL1HxolL_nANqEq6gIZe_Y6fdObCRLDQ4qb5RlH9RnRZY0sQp3u6dquWGiaUPtuAw8jXDSVUiKcZIgcRHPpdfkPGFSmJ5nGssvywo7svZQGs2MUSsCfVLM1_rtSsHD1EdH8kvbXGjS7vNs_yMosYXp-IlJqh',
    description: 'Handloom Khadi cotton, cruelty-free peace silk from Rajshahi, botanical dye apparel, and durable jute totes.',
    status: 'ACTIVE',
    displayOrder: 3,
    subcategories: [
      { id: 'sub-handloom-khadi', name: 'Tangail Handloom & Khadi', slug: 'handloom-khadi', status: 'ACTIVE', displayOrder: 1 },
      { id: 'sub-peace-silk', name: 'Rajshahi Peace Silk & Scarves', slug: 'peace-silk', status: 'ACTIVE', displayOrder: 2 },
      { id: 'sub-natural-dye', name: 'Natural Plant Dye Apparel', slug: 'natural-dye-apparel', status: 'ACTIVE', displayOrder: 3 },
      { id: 'sub-jute-totes', name: 'Jute Bags & Eco Totes', slug: 'jute-bags-totes', status: 'ACTIVE', displayOrder: 4 },
      { id: 'sub-indigenous-weaves', name: 'Hill Tracts Indigenous Weaves', slug: 'indigenous-weaves', status: 'ACTIVE', displayOrder: 5 }
    ],
    productCount: 54,
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z'
  },
  {
    id: 'cat-eco-home',
    name: 'Eco-Home',
    slug: 'eco-home',
    icon: 'home',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoi-xQ1P_UOMQoJoRsKywfmPbT2ouOuMHY9ZSKLFtiHy2Rpd3m8skUkjWqAHFxNPaF7g40OnaOitfaxQ3cAQYT9PpV7THkRpbSrfR7mH0reVCdirQnGqHp6YMSIr_D7x0idbdxfI4HCWt74qNIF8Tqz4L1fJ5mwmBLMo2frhDmzib4xv1o8ggMRO3rrFrE7zROUbHYwtnkeOVUaBt0SJFuQtxX7_cQdo3VjBOj7jFJ20RkQIiYXwW-',
    description: 'Zero-plastic kitchenware, unglazed ceramic dinnerware, natural fiber planters, organic bedding, and cold-pressed soaps.',
    status: 'ACTIVE',
    displayOrder: 4,
    subcategories: [
      { id: 'sub-bamboo-cutlery', name: 'Kitchenware & Bamboo Cutlery', slug: 'kitchen-bamboo-cutlery', status: 'ACTIVE', displayOrder: 1 },
      { id: 'sub-natural-planters', name: 'Terracotta & Fiber Planters', slug: 'natural-planters', status: 'ACTIVE', displayOrder: 2 },
      { id: 'sub-natural-soaps', name: 'Neem Soaps & Natural Cleaners', slug: 'natural-soaps-cleaners', status: 'ACTIVE', displayOrder: 3 },
      { id: 'sub-storage-decor', name: 'Natural Storage & Decor', slug: 'natural-storage-decor', status: 'ACTIVE', displayOrder: 4 }
    ],
    productCount: 38,
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z'
  }
];

/**
 * Seed initial database if empty
 */
export async function seedDatabaseIfEmpty() {
  try {
    const productsSnap = await getDocs(collection(db, PRODUCTS_COL));
    if (!productsSnap.empty) {
      return;
    }

    const batch = writeBatch(db);

    // 1. Seed Divisions
    for (const div of BANGLADESH_DIVISIONS) {
      const divRef = doc(db, DIVISIONS_COL, div.id);
      batch.set(divRef, div);
    }

    // 2. Seed Districts (first 64)
    for (const dist of ALL_64_DISTRICTS) {
      const distRef = doc(db, DISTRICTS_COL, dist.id);
      batch.set(distRef, dist);
    }

    // 3. Seed Categories
    for (const cat of INITIAL_CATEGORIES) {
      const catRef = doc(db, CATEGORIES_COL, cat.id);
      batch.set(catRef, cat);
    }

    // 4. Seed Verified Seller & Store
    const sampleSellerId = 'seller-green-harvest-01';
    const sellerRef = doc(db, SELLERS_COL, sampleSellerId);
    batch.set(sellerRef, {
      id: sampleSellerId,
      userId: 'user-seller-01',
      fullName: 'Anisur Rahman',
      phone: '01711223344',
      email: 'seller@sunno.eco',
      storeName: 'Green Harvest Co-op',
      storeDescription: 'Certified sustainable bamboo, cane, and handloom crafts crafted by 40+ rural artisan families in Sylhet and Dhaka.',
      division: 'Dhaka',
      district: 'Dhaka',
      businessAddress: 'Artisan Village, Savar, Dhaka',
      categories: ['Bamboo & Cane', 'Jute & Natural Fiber', 'Handloom & Heritage Textiles'],
      ecoProductInfo: 'All items use 100% natural, locally harvested river reeds and sustainably farmed bamboo treated with organic neem oil.',
      status: 'approved',
      rating: 4.9,
      createdAt: new Date().toISOString(),
    });

    const storeRef = doc(db, STORES_COL, 'store-green-harvest');
    batch.set(storeRef, {
      id: 'store-green-harvest',
      sellerId: 'user-seller-01',
      name: 'Green Harvest Co-op',
      description: 'Empowering 85 rural master bamboo and jute artisans across Savar, Sylhet and Tangail since 2018.',
      logo: SELLER_AVATAR,
      banner: BURIGANGA_DHAKA_HERO,
      district: 'Dhaka',
      division: 'Dhaka',
      rating: 4.9,
      reviewsCount: 128,
      ecoVerified: true,
      totalSales: 450,
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    // 5. Seed Initial Products
    for (const p of INITIAL_PRODUCTS) {
      const prodRef = doc(db, PRODUCTS_COL, p.id);
      batch.set(prodRef, {
        ...p,
        sellerId: 'user-seller-01',
        storeId: 'store-green-harvest',
      });
    }

    // 6. Seed Initial Audit Log
    const auditRef = doc(db, AUDIT_LOGS_COL, 'log-seed-01');
    batch.set(auditRef, {
      id: 'log-seed-01',
      action: 'SYSTEM_BOOTSTRAP',
      actorId: 'system',
      actorEmail: 'admin@sunno.eco',
      actorRole: 'admin',
      targetType: 'system',
      targetId: 'sunno-marketplace',
      details: 'SUNNO Marketplace database initialized with 8 divisions, 64 districts, categories, and verified artisan products.',
      performedBy: 'System Bootstrapper',
      entityType: 'system',
      entityId: 'sunno-core',
      timestamp: new Date().toISOString(),
    });

    await batch.commit();
  } catch (err) {
    console.warn('Database seeding note:', err);
  }
}

/**
 * Seed or refresh all 60 verified Bangladesh products in Firestore
 */
export async function seed60BangladeshProducts(): Promise<{ count: number; success: boolean }> {
  try {
    const batch = writeBatch(db);
    let writeCount = 0;

    for (const p of BANGLADESH_60_ECO_PRODUCTS) {
      const prodRef = doc(db, PRODUCTS_COL, p.id);
      batch.set(prodRef, {
        ...p,
        sellerId: p.sellerId || 'seller-green-harvest-01',
        storeId: p.storeId || 'store-green-harvest',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      writeCount++;
    }

    if (writeCount > 0) {
      await batch.commit();
    }
    return { count: writeCount, success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, PRODUCTS_COL);
    return { count: 0, success: false };
  }
}

// ---------------- PRODUCTS ----------------

export async function fetchAllProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, PRODUCTS_COL));
    const snap = await getDocs(q);
    if (snap.empty) {
      return BANGLADESH_60_ECO_PRODUCTS;
    }
    const list = snap.docs.map((d) => {
      const prod = { id: d.id, ...d.data() } as Product;
      const verified = BANGLADESH_60_ECO_PRODUCTS.find((p) => p.id === d.id);
      if (verified) {
        const primary = (prod.images && prod.images[0]) || '';
        const needsSync =
          !primary ||
          !Array.isArray(prod.images) ||
          prod.images.length !== verified.images.length ||
          prod.images[0] !== verified.images[0] ||
          prod.images.some((img) =>
            img.includes('photo-1544816155-12df9643f363') || // old tote bag fallback
            img.includes('photo-1536511135899-7006d91bb3ee') ||
            img.includes('photo-1578749556568-bc2c40e68b61') ||
            img.includes('photo-1606744824163-985d376605aa') ||
            img.includes('photo-1597983073493-88cd35cf93b0')
          );
        if (needsSync) {
          prod.images = [...verified.images];
        }
      }
      return prod;
    });
    return list.length > 0 ? list : BANGLADESH_60_ECO_PRODUCTS;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, PRODUCTS_COL);
    return BANGLADESH_60_ECO_PRODUCTS;
  }
}

export const fetchProductsFromDb = fetchAllProducts;

export async function fetchProductsBySeller(sellerId: string): Promise<Product[]> {
  try {
    const q = query(collection(db, PRODUCTS_COL), where('sellerId', '==', sellerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, PRODUCTS_COL);
    return [];
  }
}

export function subscribeProducts(onUpdate: (products: Product[]) => void) {
  try {
    const q = query(collection(db, PRODUCTS_COL));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
          onUpdate(list);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, PRODUCTS_COL);
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveProduct(product: Product): Promise<void> {
  try {
    const ref = doc(db, PRODUCTS_COL, product.id);
    await setDoc(ref, {
      ...product,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${PRODUCTS_COL}/${product.id}`);
    throw err;
  }
}

export async function createProductInDb(product: Omit<Product, 'id'>, sellerId?: string): Promise<Product> {
  const authUser = auth.currentUser;
  const authoritativeSellerId = authUser?.uid || sellerId;
  if (!authoritativeSellerId) {
    throw new Error('Authentication required: A verified seller must be signed in to create product listings.');
  }

  // Price validation: required, numeric, positive
  const parsedPrice = typeof product.price === 'number' ? product.price : parseFloat(String(product.price));
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    throw new Error('Price must be a valid positive amount in BDT.');
  }

  // Stock validation: non-negative integer
  const parsedStock = typeof product.stock === 'number' ? Math.floor(product.stock) : parseInt(String(product.stock || 0), 10);
  if (isNaN(parsedStock) || parsedStock < 0) {
    throw new Error('Stock must be a non-negative integer.');
  }

  // Low stock alert validation
  const parsedLowStock = product.lowStockThreshold !== undefined
    ? Math.max(0, Math.floor(product.lowStockThreshold))
    : 5;

  const id = `sun-prod-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const title = (product.title || '').trim() || 'Artisan Handcrafted Eco Good';
  const sku = (product.sku || '').trim().toUpperCase() || `SUN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  // Strict eco-verification status rule: Newly created products CANNOT be automatically eco_verified
  const isDraft = product.status === 'draft' || product.lifecycleStatus === 'draft';
  const assignedStatus: Product['status'] = isDraft ? 'draft' : 'under_review';
  const assignedLifecycle = isDraft ? 'draft' : 'pending_review';

  const fullProduct: Product = {
    ...product,
    id,
    title,
    sku,
    price: Math.round(parsedPrice * 100) / 100,
    stock: parsedStock,
    availableStock: parsedStock,
    lowStockThreshold: parsedLowStock,
    sellerId: authoritativeSellerId,
    status: assignedStatus,
    lifecycleStatus: assignedLifecycle,
    ecoVerified: false,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
  };

  await saveProduct(fullProduct);

  // If not draft, submit to Eco-Verification Committee Queue and notify seller
  if (!isDraft) {
    const queueSub: QueueSubmission = {
      id: `queue-${Date.now()}`,
      trackingId: `ENV-${Math.floor(1000 + Math.random() * 9000)}`,
      productId: id,
      sellerId: authoritativeSellerId,
      product: fullProduct,
      submittedAgo: 'Just now',
      submittedDate: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: 'pending',
      internalNotes: 'Awaiting 24h eco verification committee review.',
    };
    await saveEcoSubmission(queueSub);

    // Send confirmation notification to seller
    notifyEcoSubmissionReceived(authoritativeSellerId, title, queueSub.trackingId).catch((err) =>
      console.warn('Failed to dispatch submission notification:', err)
    );
  }

  return fullProduct;
}

export async function updateProductInDb(productId: string, product: Partial<Product>, actorId?: string): Promise<void> {
  try {
    const ref = doc(db, PRODUCTS_COL, productId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error(`Product ${productId} not found.`);
    }

    const existing = snap.data() as Product;
    const authUser = auth.currentUser;
    const currentUid = authUser?.uid || actorId;

    // Seller ownership check: Seller A cannot update Seller B's product
    const isPrivileged =
      currentUid === 'admin' ||
      currentUid === 'admin-01' ||
      authUser?.email === 'himel1176cse.uits@gmail.com' ||
      authUser?.email === 'admin@sunno.eco' ||
      authUser?.email === 'mohaiminul1185@gmail.com' ||
      authUser?.email === 'mdshantogazi2005@gmail.com';

    if (!isPrivileged && existing.sellerId && currentUid && existing.sellerId !== currentUid) {
      throw new Error('Unauthorized: You are not authorized to modify another seller’s craft listing.');
    }

    // Sanitize updates: unprivileged sellers cannot mark their own unverified items as eco_verified
    const sanitized: Partial<Product> = { ...product };
    if (!isPrivileged) {
      delete (sanitized as any).verifiedBy;
      delete (sanitized as any).verifiedAt;
      if (existing.status !== 'eco_verified' && sanitized.status === 'eco_verified') {
        sanitized.status = 'under_review';
        sanitized.ecoVerified = false;
      }
    }

    if (sanitized.price !== undefined) {
      const p = typeof sanitized.price === 'number' ? sanitized.price : parseFloat(String(sanitized.price));
      if (isNaN(p) || p <= 0) {
        throw new Error('Price must be greater than 0 BDT.');
      }
      sanitized.price = Math.round(p * 100) / 100;
    }

    if (sanitized.stock !== undefined) {
      sanitized.stock = Math.max(0, Math.floor(sanitized.stock));
      const reserved = typeof existing.reservedStock === 'number' ? existing.reservedStock : 0;
      sanitized.availableStock = Math.max(0, sanitized.stock - reserved);
    }

    await updateDoc(ref, {
      ...sanitized,
      updatedAt: new Date().toISOString(),
    });

    await createAuditLog({
      action: 'PRODUCT_UPDATED',
      performedBy: currentUid || 'system',
      actorId: currentUid || 'system',
      entityType: 'product',
      entityId: productId,
      targetType: 'product',
      targetId: productId,
      details: `Product "${sanitized.title || existing.title || productId}" was updated.`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${PRODUCTS_COL}/${productId}`);
    throw err;
  }
}

export async function updateProductStatus(productId: string, status: Product['status']): Promise<void> {
  try {
    const ref = doc(db, PRODUCTS_COL, productId);
    await updateDoc(ref, { status, updatedAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${PRODUCTS_COL}/${productId}`);
  }
}

export async function updateProductEcoStatusInDb(productId: string, status: Product['status'], actorId?: string): Promise<void> {
  await updateProductStatus(productId, status);
  await createAuditLog({
    action: `PRODUCT_STATUS_${status.toUpperCase()}`,
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'product',
    entityId: productId,
    targetType: 'product',
    targetId: productId,
    details: `Product status changed to ${status}`,
    timestamp: new Date().toISOString(),
  });
}

export async function deleteProduct(productId: string, actorId?: string): Promise<void> {
  try {
    const ref = doc(db, PRODUCTS_COL, productId);
    await deleteDoc(ref);
    await createAuditLog({
      action: 'PRODUCT_DELETED',
      performedBy: actorId || 'seller',
      actorId: actorId || 'seller',
      entityType: 'product',
      entityId: productId,
      targetType: 'product',
      targetId: productId,
      details: `Product ${productId} deleted from catalog`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${PRODUCTS_COL}/${productId}`);
    throw err;
  }
}

export const deleteProductInDb = deleteProduct;

// ---------------- ECO VERIFICATIONS ----------------

export async function fetchEcoVerifications(): Promise<QueueSubmission[]> {
  try {
    const snap = await getDocs(collection(db, ECO_VERIF_COL));
    if (snap.empty) return [];
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as QueueSubmission));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ECO_VERIF_COL);
    return [];
  }
}

export const fetchQueueSubmissions = fetchEcoVerifications;

export function subscribeEcoVerifications(onUpdate: (items: QueueSubmission[]) => void) {
  try {
    const q = query(collection(db, ECO_VERIF_COL));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QueueSubmission));
          onUpdate(list);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, ECO_VERIF_COL);
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveEcoSubmission(submission: QueueSubmission): Promise<void> {
  try {
    const ref = doc(db, ECO_VERIF_COL, submission.id);
    await setDoc(ref, submission, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${ECO_VERIF_COL}/${submission.id}`);
  }
}

export async function updateEcoSubmission(
  id: string,
  status: QueueSubmission['status'],
  internalNotes?: string,
  reviewedBy?: string
): Promise<void> {
  try {
    const ref = doc(db, ECO_VERIF_COL, id);
    const data: Record<string, any> = {
      status,
      reviewedAt: new Date().toISOString(),
    };
    if (internalNotes !== undefined) data.internalNotes = internalNotes;
    if (reviewedBy) data.reviewedBy = reviewedBy;
    await updateDoc(ref, data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ECO_VERIF_COL}/${id}`);
  }
}

export async function updateQueueSubmissionInDb(
  id: string,
  status: QueueSubmission['status'],
  internalNotes?: string,
  reviewedBy?: string
): Promise<void> {
  await updateEcoSubmission(id, status, internalNotes, reviewedBy);
  await createAuditLog({
    action: `QUEUE_${status.toUpperCase()}`,
    performedBy: reviewedBy || 'admin',
    actorId: reviewedBy || 'admin',
    entityType: 'eco_verification',
    entityId: id,
    targetType: 'eco_verification',
    targetId: id,
    details: `Submission updated to ${status}. Notes: ${internalNotes || 'None'}`,
    timestamp: new Date().toISOString(),
  });
}

// ---------------- SELLERS & SELLER APPLICATIONS ----------------

export async function fetchSellerByUserId(userId: string): Promise<SellerProfile | null> {
  try {
    const q = query(collection(db, SELLERS_COL), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as SellerProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, SELLERS_COL);
    return null;
  }
}

export async function fetchAllSellers(): Promise<SellerProfile[]> {
  try {
    const snap = await getDocs(collection(db, SELLERS_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SellerProfile));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, SELLERS_COL);
    return [];
  }
}

export const fetchSellerApplications = fetchAllSellers;

export function subscribeSellers(onUpdate: (sellers: SellerProfile[]) => void) {
  try {
    return onSnapshot(
      collection(db, SELLERS_COL),
      (snap) => {
        onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SellerProfile)));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, SELLERS_COL);
      }
    );
  } catch {
    return () => {};
  }
}

export async function registerSeller(profile: SellerProfile): Promise<void> {
  try {
    const ref = doc(db, SELLERS_COL, profile.id);
    await setDoc(ref, profile);

    await createAuditLog({
      action: 'SELLER_APPLICATION_SUBMITTED',
      performedBy: profile.fullName,
      actorId: profile.userId,
      actorEmail: profile.email,
      actorRole: 'customer',
      entityType: 'seller',
      entityId: profile.id,
      targetType: 'seller',
      targetId: profile.id,
      details: `New seller application for "${profile.storeName}" (${profile.district}, ${profile.division}). Status: PENDING review.`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${SELLERS_COL}/${profile.id}`);
    throw err;
  }
}

export async function updateSellerStatus(
  sellerId: string,
  status: SellerProfile['status'],
  actorId?: string,
  reason?: string
): Promise<void> {
  try {
    const ref = doc(db, SELLERS_COL, sellerId);
    await updateDoc(ref, {
      status,
      rejectionReason: reason || '',
      updatedAt: new Date().toISOString(),
    });

    if (status === 'approved') {
      const sellerSnap = await getDoc(ref);
      if (sellerSnap.exists()) {
        const sellerData = sellerSnap.data() as SellerProfile;
        const storeId = `store-${sellerData.userId}`;
        const storeRef = doc(db, STORES_COL, storeId);
        await setDoc(
          storeRef,
          {
            id: storeId,
            sellerId: sellerData.userId,
            name: sellerData.storeName,
            description: sellerData.storeDescription,
            logo: SELLER_AVATAR,
            banner: BURIGANGA_DHAKA_HERO,
            district: sellerData.district,
            division: sellerData.division,
            rating: 5.0,
            reviewsCount: 0,
            ecoVerified: true,
            totalSales: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );

        const userRef = doc(db, USERS_COL, sellerData.userId);
        await updateDoc(userRef, { role: 'seller' }).catch(() => {});
      }
    }

    await createAuditLog({
      action: `SELLER_STATUS_${status.toUpperCase()}`,
      performedBy: actorId || 'admin',
      actorId: actorId || 'admin',
      entityType: 'seller',
      entityId: sellerId,
      targetType: 'seller',
      targetId: sellerId,
      details: `Seller status updated to ${status}.${reason ? ` Reason: ${reason}` : ''}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${SELLERS_COL}/${sellerId}`);
    throw err;
  }
}

// ---------------- STORES ----------------

export async function fetchStores(): Promise<Store[]> {
  try {
    const snap = await getDocs(collection(db, STORES_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Store));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, STORES_COL);
    return [];
  }
}

export async function fetchStoreBySellerId(sellerId: string): Promise<Store | null> {
  try {
    const q = query(collection(db, STORES_COL), where('sellerId', '==', sellerId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Store;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, STORES_COL);
    return null;
  }
}

// ---------------- ORDERS ----------------

export async function createOrder(order: Order): Promise<void> {
  try {
    const ref = doc(db, ORDERS_COL, order.id);
    await setDoc(ref, order);

    await createAuditLog({
      action: 'ORDER_PLACED',
      performedBy: order.customerName,
      actorId: order.userId || order.customerId || 'customer',
      entityType: 'order',
      entityId: order.id,
      targetType: 'order',
      targetId: order.id,
      details: `Order placed for ৳${order.finalTotal || order.total} with ${order.items.length} items. Payment: ${order.paymentMethod.toUpperCase()}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${ORDERS_COL}/${order.id}`);
    throw err;
  }
}

export async function createOrderInDb(orderData: Partial<Order>): Promise<Order> {
  const currentUid = auth.currentUser?.uid;
  const effectiveUserId = orderData.userId || orderData.customerId || currentUid || 'guest-customer';
  const effectiveCustomerId = orderData.customerId || orderData.userId || currentUid || 'guest-customer';

  const id = `SUNNO-ORD-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const order: Order = {
    id,
    orderNumber: id,
    userId: effectiveUserId,
    customerId: effectiveCustomerId,
    customerName: orderData.customerName || 'Conscious Buyer',
    customerPhone: orderData.customerPhone || '',
    shippingAddress: orderData.shippingAddress,
    customerAddress: orderData.shippingAddress?.address || orderData.customerAddress || '',
    items: orderData.items || [],
    subtotal: orderData.subtotal || 0,
    discountAmount: orderData.discount || orderData.discountAmount || 0,
    discount: orderData.discount || 0,
    shippingFee: orderData.shippingFee || 60,
    total: orderData.total || 0,
    finalTotal: orderData.finalTotal || orderData.total || 0,
    paymentMethod: orderData.paymentMethod || 'cod',
    paymentStatus: orderData.paymentStatus || 'pending',
    orderStatus: orderData.status || orderData.orderStatus || 'pending',
    status: orderData.status || orderData.orderStatus || 'pending',
    sellerIds: Array.from(new Set((orderData.items || []).map((i) => i.sellerId).filter(Boolean) as string[])),
    trackingCode: orderData.trackingCode || `SUNNO-TRK-2026-${Math.floor(100000 + Math.random() * 900000)}`,
    courierTracking: orderData.courierTracking || '',
    createdAt: new Date().toISOString(),
  };

  await createOrder(order);
  return order;
}

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, ORDERS_COL), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ORDERS_COL);
    return [];
  }
}

export async function fetchSellerOrders(sellerId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, ORDERS_COL), where('sellerIds', 'array-contains', sellerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ORDERS_COL);
    return [];
  }
}

export async function fetchAllOrders(): Promise<Order[]> {
  try {
    const snap = await getDocs(collection(db, ORDERS_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ORDERS_COL);
    return [];
  }
}

export function subscribeUserOrders(
  userId: string,
  callback: (orders: Order[]) => void
): () => void {
  try {
    const q = query(collection(db, ORDERS_COL), where('userId', '==', userId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (err) => {
        console.warn('subscribeUserOrders error:', err);
        fetchUserOrders(userId).then(callback);
      }
    );
  } catch (err) {
    fetchUserOrders(userId).then(callback);
    return () => {};
  }
}

export function subscribeAllOrders(
  callback: (orders: Order[]) => void
): () => void {
  try {
    const colRef = collection(db, ORDERS_COL);
    return onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (err) => {
        console.warn('subscribeAllOrders error:', err);
        fetchAllOrders().then(callback);
      }
    );
  } catch (err) {
    fetchAllOrders().then(callback);
    return () => {};
  }
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  try {
    const ref = doc(db, ORDERS_COL, orderId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Order;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${ORDERS_COL}/${orderId}`);
    return null;
  }
}

export function subscribeSellerOrders(
  sellerId: string,
  callback: (orders: Order[]) => void
): () => void {
  try {
    const q = query(collection(db, ORDERS_COL), where('sellerIds', 'array-contains', sellerId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (err) => {
        console.warn('subscribeSellerOrders error:', err);
        fetchSellerOrders(sellerId).then(callback);
      }
    );
  } catch (err) {
    fetchSellerOrders(sellerId).then(callback);
    return () => {};
  }
}

export async function updateOrderStatus(orderId: string, status: Order['orderStatus']): Promise<void> {
  try {
    const ref = doc(db, ORDERS_COL, orderId);
    await updateDoc(ref, { orderStatus: status, status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ORDERS_COL}/${orderId}`);
  }
}

export async function updateOrderAdminNotes(
  orderId: string,
  note: string,
  adminUser: { id: string; name: string }
): Promise<string[]> {
  try {
    const ref = doc(db, ORDERS_COL, orderId);
    const snap = await getDoc(ref);
    const existingNotes = (snap.data()?.internalNotes as string[]) || [];
    const noteEntry = `[${new Date().toLocaleString('en-GB')}] ${adminUser.name}: ${note.trim()}`;
    const updatedNotes = [...existingNotes, noteEntry];
    await updateDoc(ref, { internalNotes: updatedNotes });
    await createAuditLog({
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'ADMIN_ORDER_NOTE_ADDED',
      entityType: 'ORDER',
      entityId: orderId,
      details: `Added authorized note to order #${orderId}: "${note.trim()}"`,
    });
    return updatedNotes;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ORDERS_COL}/${orderId}`);
    return [];
  }
}

// ---------------- AUDIT LOGS ----------------

export async function createAuditLog(log: AuditLog): Promise<void> {
  try {
    const logId = log.id || `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const ref = doc(db, AUDIT_LOGS_COL, logId);
    await setDoc(ref, {
      ...log,
      id: logId,
      timestamp: log.timestamp || new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Audit log write note:', err);
  }
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const snap = await getDocs(collection(db, AUDIT_LOGS_COL));
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, AUDIT_LOGS_COL);
    return [];
  }
}

export async function fetchAuditLogsForEntity(entityId: string): Promise<AuditLog[]> {
  try {
    const q = query(
      collection(db, AUDIT_LOGS_COL),
      where('entityId', '==', entityId)
    );
    const snap = await getDocs(q);
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.warn('Audit logs for entity fetch warning:', err);
    return [];
  }
}

// ---------------- REVIEWS ----------------

export async function fetchProductReviews(productId: string): Promise<Review[]> {
  try {
    const q = query(collection(db, REVIEWS_COL), where('productId', '==', productId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, REVIEWS_COL);
    return [];
  }
}

export async function addProductReview(review: Review): Promise<void> {
  try {
    const ref = doc(db, REVIEWS_COL, review.id);
    await setDoc(ref, review);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${REVIEWS_COL}/${review.id}`);
  }
}

// ---------------- USER PROFILES & USERS ----------------

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COL, userId);
    const userSnap = await getDoc(userRef);

    const profileRef = doc(db, USER_PROFILES_COL, userId);
    const profileSnap = await getDoc(profileRef);

    if (!userSnap.exists() && !profileSnap.exists()) {
      return null;
    }

    const userData = userSnap.exists() ? userSnap.data() : {};
    const profileData = profileSnap.exists() ? profileSnap.data() : {};

    return {
      id: userId,
      email: userData.email || profileData.email || '',
      displayName: userData.displayName || profileData.fullName || profileData.displayName || '',
      fullName: profileData.fullName || userData.displayName || '',
      role: userData.role || 'customer',
      phoneNumber: userData.phoneNumber || profileData.phone || profileData.phoneNumber || '',
      phone: profileData.phone || userData.phoneNumber || '',
      photoURL: userData.photoURL || profileData.photoURL || undefined,
      ecoPoints: typeof profileData.ecoPoints === 'number' ? profileData.ecoPoints : 50,
      addresses: Array.isArray(profileData.addresses) ? profileData.addresses : [],
      defaultAddress: profileData.defaultAddress || null,
      division: profileData.division || userData.division || '',
      district: profileData.district || userData.district || '',
      upazila: profileData.upazila || userData.upazila || '',
      streetAddress: profileData.streetAddress || userData.streetAddress || '',
      postalCode: profileData.postalCode || userData.postalCode || '',
      emailVerified: typeof userData.emailVerified === 'boolean' ? userData.emailVerified : (typeof profileData.emailVerified === 'boolean' ? profileData.emailVerified : false),
      phoneVerified: typeof userData.phoneVerified === 'boolean' ? userData.phoneVerified : (typeof profileData.phoneVerified === 'boolean' ? profileData.phoneVerified : false),
      deletionRequested: Boolean(profileData.deletionRequested || userData.deletionRequested),
      deletionRequestedAt: profileData.deletionRequestedAt || userData.deletionRequestedAt || undefined,
      deletionReason: profileData.deletionReason || userData.deletionReason || undefined,
      createdAt: userData.createdAt || profileData.createdAt || new Date().toISOString(),
      updatedAt: userData.updatedAt || profileData.updatedAt || new Date().toISOString(),
    } as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${USERS_COL}/${userId}`);
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const now = new Date().toISOString();
    // 1. Sync users/{uid}
    const userRef = doc(db, USERS_COL, profile.id);
    await setDoc(userRef, {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName || profile.fullName || '',
      phoneNumber: profile.phoneNumber || profile.phone || null,
      photoURL: profile.photoURL || null,
      division: profile.division || '',
      district: profile.district || '',
      upazila: profile.upazila || '',
      streetAddress: profile.streetAddress || '',
      postalCode: profile.postalCode || '',
      ...(profile.deletionRequested !== undefined ? {
        deletionRequested: profile.deletionRequested,
        deletionRequestedAt: profile.deletionRequestedAt || null,
        deletionReason: profile.deletionReason || null,
      } : {}),
      updatedAt: now,
      ...(profile.createdAt ? { createdAt: profile.createdAt } : {}),
    }, { merge: true });

    // 2. Sync user_profiles/{uid}
    const profileRef = doc(db, USER_PROFILES_COL, profile.id);
    await setDoc(profileRef, {
      userId: profile.id,
      email: profile.email,
      fullName: profile.displayName || profile.fullName || '',
      phone: profile.phone || profile.phoneNumber || '',
      photoURL: profile.photoURL || '',
      division: profile.division || '',
      district: profile.district || '',
      upazila: profile.upazila || '',
      streetAddress: profile.streetAddress || '',
      postalCode: profile.postalCode || '',
      ...(profile.deletionRequested !== undefined ? {
        deletionRequested: profile.deletionRequested,
        deletionRequestedAt: profile.deletionRequestedAt || null,
        deletionReason: profile.deletionReason || null,
      } : {}),
      addresses: profile.addresses || [],
      defaultAddress: profile.defaultAddress || null,
      updatedAt: now,
      ...(profile.createdAt ? { createdAt: profile.createdAt } : {}),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${USERS_COL}/${profile.id}`);
  }
}

export async function getSellerProfile(userId: string): Promise<SellerProfile | null> {
  try {
    const ref = doc(db, SELLER_PROFILES_COL, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as SellerProfile;
    }
    // Fallback check in sellers/{userId}
    const legacyRef = doc(db, SELLERS_COL, userId);
    const legacySnap = await getDoc(legacyRef);
    if (legacySnap.exists()) {
      return { id: legacySnap.id, ...legacySnap.data() } as SellerProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${SELLER_PROFILES_COL}/${userId}`);
    return null;
  }
}

export async function saveSellerProfile(sellerProfile: SellerProfile): Promise<void> {
  try {
    const now = new Date().toISOString();
    const docId = sellerProfile.userId || sellerProfile.id;
    const ref = doc(db, SELLER_PROFILES_COL, docId);
    const payload = {
      ...sellerProfile,
      userId: docId,
      updatedAt: now,
      createdAt: sellerProfile.createdAt || now,
    };
    await setDoc(ref, payload, { merge: true });

    // Also update legacy sellers/{docId} so existing queries continue working seamlessly
    const legacyRef = doc(db, SELLERS_COL, docId);
    await setDoc(legacyRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SELLER_PROFILES_COL}/${sellerProfile.userId}`);
  }
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, USERS_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, USERS_COL);
    return [];
  }
}

export async function updateUserRoleInDb(userId: string, role: UserRole, adminId?: string): Promise<void> {
  try {
    const ref = doc(db, USERS_COL, userId);
    await updateDoc(ref, { role, updatedAt: new Date().toISOString() });

    await createAuditLog({
      action: 'USER_ROLE_CHANGED',
      performedBy: adminId || 'admin',
      actorId: adminId || 'admin',
      entityType: 'user',
      entityId: userId,
      targetType: 'user',
      targetId: userId,
      details: `User ${userId} role changed to ${role.toUpperCase()}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COL}/${userId}`);
    throw err;
  }
}

// ---------------- CATEGORIES & DISTRICTS & DIVISIONS ----------------

export async function fetchCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(db, CATEGORIES_COL));
    if (snap.empty) {
      // Seed default categories
      const batch = writeBatch(db);
      for (const cat of INITIAL_CATEGORIES) {
        batch.set(doc(db, CATEGORIES_COL, cat.id), cat);
      }
      await batch.commit();
      return INITIAL_CATEGORIES;
    }
    const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
    return cats.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, CATEGORIES_COL);
    return INITIAL_CATEGORIES;
  }
}

export async function fetchActiveCategories(): Promise<Category[]> {
  const all = await fetchCategories();
  return all
    .filter((c) => c.status === 'ACTIVE' || c.status === 'active' || !c.status)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

export function subscribeCategories(onUpdate: (cats: Category[]) => void) {
  try {
    const q = query(collection(db, CATEGORIES_COL));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Category))
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          onUpdate(list);
        } else {
          onUpdate(INITIAL_CATEGORIES);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, CATEGORIES_COL);
        onUpdate(INITIAL_CATEGORIES);
      }
    );
  } catch {
    return () => {};
  }
}

export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const cats = await fetchCategories();
    return cats.find((c) => c.slug === slug || c.id === slug || c.name.toLowerCase() === slug.toLowerCase()) || null;
  } catch {
    return null;
  }
}

export async function checkCategoryHasActiveProducts(categoryNameOrSlug: string): Promise<{ count: number; products: Product[] }> {
  try {
    const allProds = await fetchAllProducts();
    const matching = allProds.filter(
      (p) =>
        p.status !== 'archived' &&
        (p.category?.toLowerCase() === categoryNameOrSlug.toLowerCase() ||
         p.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') === categoryNameOrSlug.toLowerCase())
    );
    return { count: matching.length, products: matching };
  } catch {
    return { count: 0, products: [] };
  }
}

export async function toggleCategoryStatusInDb(
  catId: string,
  newStatus: 'ACTIVE' | 'INACTIVE',
  actorId?: string
): Promise<void> {
  const ref = doc(db, CATEGORIES_COL, catId);
  await updateDoc(ref, {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });

  await createAuditLog({
    action: newStatus === 'ACTIVE' ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'category',
    entityId: catId,
    targetType: 'category',
    targetId: catId,
    details: `Category ${catId} status changed to ${newStatus}`,
    timestamp: new Date().toISOString(),
  });
}

export async function reorderCategoriesInDb(
  orderedItems: { id: string; displayOrder: number }[],
  actorId?: string
): Promise<void> {
  const batch = writeBatch(db);
  for (const item of orderedItems) {
    batch.update(doc(db, CATEGORIES_COL, item.id), {
      displayOrder: item.displayOrder,
      updatedAt: new Date().toISOString(),
    });
  }
  await batch.commit();

  await createAuditLog({
    action: 'CATEGORIES_REORDERED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'category',
    entityId: 'multiple',
    targetType: 'category',
    targetId: 'multiple',
    details: `Reordered ${orderedItems.length} categories`,
    timestamp: new Date().toISOString(),
  });
}

export async function fetchDistricts(): Promise<DistrictInfo[]> {
  try {
    const snap = await getDocs(collection(db, DISTRICTS_COL));
    if (snap.empty) return ALL_64_DISTRICTS;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DistrictInfo));
  } catch {
    return ALL_64_DISTRICTS;
  }
}

// ---------------- MESSAGES & NOTIFICATIONS ----------------

export async function fetchUserMessages(userId: string): Promise<Message[]> {
  try {
    const q = query(collection(db, MESSAGES_COL), where('recipientId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
  } catch {
    return [];
  }
}

export async function sendMessageInDb(msg: Omit<Message, 'id'>): Promise<Message> {
  const id = `msg-${Date.now()}`;
  const fullMsg: Message = { id, ...msg };
  const ref = doc(db, MESSAGES_COL, id);
  await setDoc(ref, fullMsg);
  return fullMsg;
}

export async function fetchUserNotifications(userId: string): Promise<Notification[]> {
  try {
    const q = query(collection(db, NOTIFICATIONS_COL), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
  } catch {
    return [];
  }
}

export async function createNotificationInDb(notif: Omit<Notification, 'id'>): Promise<Notification> {
  const id = `notif-${Date.now()}`;
  const fullNotif: Notification = { id, ...notif };
  const ref = doc(db, NOTIFICATIONS_COL, id);
  await setDoc(ref, fullNotif);
  return fullNotif;
}

// ---------------- SELLER PLANS & TIERS ----------------

export async function fetchSellerPlans(): Promise<SellerPlan[]> {
  try {
    const snap = await getDocs(collection(db, SELLER_PLANS_COL));
    if (snap.empty) {
      // Seed default plans if empty
      const batch = writeBatch(db);
      for (const p of INITIAL_SELLER_PLANS) {
        batch.set(doc(db, SELLER_PLANS_COL, p.id), p);
      }
      await batch.commit();
      return INITIAL_SELLER_PLANS;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SellerPlan));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, SELLER_PLANS_COL);
    return INITIAL_SELLER_PLANS;
  }
}

export async function createSellerPlanInDb(plan: Omit<SellerPlan, 'id'>, actorId?: string): Promise<SellerPlan> {
  const id = `plan-${Date.now()}`;
  const fullPlan: SellerPlan = {
    ...plan,
    id,
    createdAt: new Date().toISOString(),
  };
  const ref = doc(db, SELLER_PLANS_COL, id);
  await setDoc(ref, fullPlan);

  await createAuditLog({
    action: 'SELLER_PLAN_CREATED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'seller_plan',
    entityId: id,
    targetType: 'seller_plan',
    targetId: id,
    details: `Created new seller tier plan: "${plan.name}" with product limit ${plan.productLimit} and ${plan.commissionRate}% commission.`,
    timestamp: new Date().toISOString(),
  });

  return fullPlan;
}

export async function updateSellerPlanInDb(planId: string, data: Partial<SellerPlan>, actorId?: string): Promise<void> {
  const ref = doc(db, SELLER_PLANS_COL, planId);
  await updateDoc(ref, data);

  await createAuditLog({
    action: 'SELLER_PLAN_UPDATED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'seller_plan',
    entityId: planId,
    targetType: 'seller_plan',
    targetId: planId,
    details: `Updated seller tier plan: ${planId}`,
    timestamp: new Date().toISOString(),
  });
}

export async function deleteSellerPlanInDb(planId: string, actorId?: string): Promise<void> {
  const ref = doc(db, SELLER_PLANS_COL, planId);
  await deleteDoc(ref);

  await createAuditLog({
    action: 'SELLER_PLAN_DELETED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'seller_plan',
    entityId: planId,
    targetType: 'seller_plan',
    targetId: planId,
    details: `Deleted seller plan: ${planId}`,
    timestamp: new Date().toISOString(),
  });
}

// ---------------- COMMISSION SETTINGS ----------------

export async function fetchCommissionSettings(): Promise<CommissionSetting> {
  try {
    const ref = doc(db, COMMISSION_SETTINGS_COL, DEFAULT_COMMISSION_SETTINGS.id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as CommissionSetting;
    }
    await setDoc(ref, DEFAULT_COMMISSION_SETTINGS);
    return DEFAULT_COMMISSION_SETTINGS;
  } catch {
    return DEFAULT_COMMISSION_SETTINGS;
  }
}

export async function updateCommissionSettingsInDb(settings: Partial<CommissionSetting>, actorId?: string): Promise<void> {
  const ref = doc(db, COMMISSION_SETTINGS_COL, DEFAULT_COMMISSION_SETTINGS.id);
  await setDoc(ref, {
    ...DEFAULT_COMMISSION_SETTINGS,
    ...settings,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await createAuditLog({
    action: 'COMMISSION_SETTINGS_UPDATED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'commission_settings',
    entityId: DEFAULT_COMMISSION_SETTINGS.id,
    targetType: 'commission_settings',
    targetId: DEFAULT_COMMISSION_SETTINGS.id,
    details: `Platform commission settings updated. Default rate: ${settings.defaultCommissionRate ?? DEFAULT_COMMISSION_SETTINGS.defaultCommissionRate}%`,
    timestamp: new Date().toISOString(),
  });
}

// ---------------- STORE HELPERS & FOLLOWERS ----------------

export async function fetchStoreById(storeId: string): Promise<Store | null> {
  try {
    const ref = doc(db, STORES_COL, storeId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Store;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchStoreBySlug(slug: string): Promise<Store | null> {
  try {
    const q = query(collection(db, STORES_COL), where('slug', '==', slug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Store;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchAllStores(): Promise<Store[]> {
  try {
    const snap = await getDocs(collection(db, STORES_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Store));
  } catch {
    return [];
  }
}

export async function updateStoreInDb(storeId: string, data: Partial<Store>, actorId?: string): Promise<void> {
  try {
    const storeRef = doc(db, STORES_COL, storeId);
    await setDoc(
      storeRef,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await createAuditLog({
      action: 'STORE_UPDATED',
      performedBy: actorId || 'admin',
      actorId: actorId || 'admin',
      entityType: 'store',
      entityId: storeId,
      targetType: 'store',
      targetId: storeId,
      details: `Store ${storeId} updated with ${Object.keys(data).join(', ')}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${STORES_COL}/${storeId}`);
    throw err;
  }
}

export async function toggleStoreFollow(storeId: string, userId: string): Promise<{ following: boolean; count: number }> {
  try {
    const followDocId = `${storeId}_${userId}`;
    const followRef = doc(db, SELLER_FOLLOWERS_COL, followDocId);
    const followSnap = await getDoc(followRef);

    const storeRef = doc(db, STORES_COL, storeId);
    const storeSnap = await getDoc(storeRef);
    let currentCount = storeSnap.exists() ? (typeof storeSnap.data().followersCount === 'number' ? storeSnap.data().followersCount : 0) : 0;

    if (followSnap.exists()) {
      await deleteDoc(followRef);
      currentCount = Math.max(0, currentCount - 1);
      await setDoc(storeRef, { followersCount: currentCount }, { merge: true }).catch(() => {});
      return { following: false, count: currentCount };
    } else {
      await setDoc(followRef, {
        id: followDocId,
        storeId,
        userId,
        createdAt: new Date().toISOString(),
      });
      currentCount += 1;
      await setDoc(storeRef, { followersCount: currentCount }, { merge: true }).catch(() => {});
      return { following: true, count: currentCount };
    }
  } catch {
    return { following: false, count: 0 };
  }
}

export async function isUserFollowingStore(storeId: string, userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const followDocId = `${storeId}_${userId}`;
    const followRef = doc(db, SELLER_FOLLOWERS_COL, followDocId);
    const snap = await getDoc(followRef);
    return snap.exists();
  } catch {
    return false;
  }
}

// ---------------- PRODUCT DUPLICATION & ENHANCED CRUD ----------------

export async function duplicateProductInDb(productId: string, sellerId?: string): Promise<Product> {
  const origRef = doc(db, PRODUCTS_COL, productId);
  const origSnap = await getDoc(origRef);
  if (!origSnap.exists()) {
    throw new Error('Product not found for duplication');
  }

  const origData = origSnap.data() as Product;
  const newId = `sun-prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const clonedProduct: Product = {
    ...origData,
    id: newId,
    title: `${origData.title} (Copy)`,
    sku: `${origData.sku || 'SKU'}-COPY-${Math.floor(100 + Math.random() * 900)}`,
    status: 'draft',
    sellerId: sellerId || origData.sellerId || (auth.currentUser ? auth.currentUser.uid : ''),
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
  };

  await saveProduct(clonedProduct);
  return clonedProduct;
}

// ---------------- ECO COMMITTEE WORKFLOW ----------------

export async function approveProductEcoVerification(
  productId: string,
  reviewerId: string,
  notes?: string
): Promise<void> {
  const prodRef = doc(db, PRODUCTS_COL, productId);
  const snap = await getDoc(prodRef);
  const prodData = snap.exists() ? (snap.data() as Product) : null;

  await updateDoc(prodRef, {
    status: 'eco_verified',
    lifecycleStatus: 'published',
    ecoVerified: true,
    verifiedBy: reviewerId,
    verifiedAt: new Date().toISOString(),
    reviewerNotes: notes || 'Verified compliant with SUNNO 100% sustainable standards.',
    updatedAt: new Date().toISOString(),
  });

  // Also update queue item
  const qSnap = await getDocs(query(collection(db, ECO_VERIF_COL), where('productId', '==', productId)));
  if (!qSnap.empty) {
    await updateDoc(doc(db, ECO_VERIF_COL, qSnap.docs[0].id), {
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
      internalNotes: notes || 'Approved by committee.',
    });
  }

  // Notify seller of approval
  if (prodData?.sellerId) {
    notifyEcoSubmissionApproved(prodData.sellerId, prodData.title || 'Your Craft', notes).catch((err) =>
      console.warn('Could not dispatch approval notification:', err)
    );
  }

  await createAuditLog({
    action: 'PRODUCT_ECO_VERIFIED',
    performedBy: reviewerId,
    actorId: reviewerId,
    entityType: 'product',
    entityId: productId,
    targetType: 'product',
    targetId: productId,
    details: `Product approved for SUNNO ECO-VERIFIED badge. Notes: ${notes || 'Standard approval'}`,
    timestamp: new Date().toISOString(),
  });
}

export async function rejectProductEcoVerification(
  productId: string,
  reason: string,
  reviewerId: string
): Promise<void> {
  const prodRef = doc(db, PRODUCTS_COL, productId);
  const snap = await getDoc(prodRef);
  const prodData = snap.exists() ? (snap.data() as Product) : null;

  await updateDoc(prodRef, {
    status: 'rejected',
    lifecycleStatus: 'unpublished',
    ecoVerified: false,
    rejectionReason: reason,
    reviewerNotes: reason,
    verifiedBy: reviewerId,
    updatedAt: new Date().toISOString(),
  });

  const qSnap = await getDocs(query(collection(db, ECO_VERIF_COL), where('productId', '==', productId)));
  if (!qSnap.empty) {
    await updateDoc(doc(db, ECO_VERIF_COL, qSnap.docs[0].id), {
      status: 'rejected',
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
      internalNotes: `Rejected: ${reason}`,
    });
  }

  // Notify seller of rejection
  if (prodData?.sellerId) {
    notifyEcoSubmissionRejected(prodData.sellerId, prodData.title || 'Your Craft', reason).catch((err) =>
      console.warn('Could not dispatch rejection notification:', err)
    );
  }

  await createAuditLog({
    action: 'PRODUCT_ECO_REJECTED',
    performedBy: reviewerId,
    actorId: reviewerId,
    entityType: 'product',
    entityId: productId,
    targetType: 'product',
    targetId: productId,
    details: `Product rejected for Eco badge. Reason: ${reason}`,
    timestamp: new Date().toISOString(),
  });
}

export async function requestChangesProductEcoVerification(
  productId: string,
  feedback: string,
  reviewerId: string
): Promise<void> {
  const prodRef = doc(db, PRODUCTS_COL, productId);
  const snap = await getDoc(prodRef);
  const prodData = snap.exists() ? (snap.data() as Product) : null;

  await updateDoc(prodRef, {
    status: 'changes_required',
    lifecycleStatus: 'draft',
    ecoVerified: false,
    reviewerNotes: feedback,
    verifiedBy: reviewerId,
    updatedAt: new Date().toISOString(),
  });

  const qSnap = await getDocs(query(collection(db, ECO_VERIF_COL), where('productId', '==', productId)));
  if (!qSnap.empty) {
    await updateDoc(doc(db, ECO_VERIF_COL, qSnap.docs[0].id), {
      status: 'changes_requested',
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
      internalNotes: `Changes requested: ${feedback}`,
    });
  }

  // Notify seller that changes are required
  if (prodData?.sellerId) {
    notifyEcoSubmissionChangesRequested(prodData.sellerId, prodData.title || 'Your Craft', feedback).catch((err) =>
      console.warn('Could not dispatch changes requested notification:', err)
    );
  }

  await createAuditLog({
    action: 'PRODUCT_ECO_CHANGES_REQUESTED',
    performedBy: reviewerId,
    actorId: reviewerId,
    entityType: 'product',
    entityId: productId,
    targetType: 'product',
    targetId: productId,
    details: `Product returned to seller for required changes: ${feedback}`,
    timestamp: new Date().toISOString(),
  });
}

// ---------------- DYNAMIC CATEGORIES CRUD ----------------

export async function createCategoryInDb(cat: Omit<Category, 'id'>, actorId?: string): Promise<Category> {
  const id = `cat-${Date.now()}`;
  const slug = (cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-+|-+$/g, '');
  
  // Check for duplicate name or slug
  const allCats = await fetchCategories();
  const duplicate = allCats.find(
    (c) => c.name.toLowerCase().trim() === cat.name.toLowerCase().trim() || c.slug === slug
  );
  if (duplicate) {
    throw new Error(`A category with name "${cat.name}" or slug "${slug}" already exists.`);
  }

  const newCat: Category = {
    ...cat,
    id,
    name: cat.name.trim(),
    slug,
    icon: cat.icon || 'eco',
    description: cat.description || '',
    status: cat.status || 'ACTIVE',
    displayOrder: cat.displayOrder !== undefined ? Number(cat.displayOrder) : allCats.length + 1,
    subcategories: cat.subcategories || [],
    productCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, CATEGORIES_COL, id), newCat);

  await createAuditLog({
    action: 'CATEGORY_CREATED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'category',
    entityId: id,
    targetType: 'category',
    targetId: id,
    details: `Created new product category: "${cat.name}" (Slug: ${slug}, Status: ${newCat.status}, Display Order: ${newCat.displayOrder})`,
    timestamp: new Date().toISOString(),
  });

  return newCat;
}

export async function updateCategoryInDb(catId: string, data: Partial<Category>, actorId?: string): Promise<void> {
  if (data.name || data.slug) {
    const allCats = await fetchCategories();
    const cleanSlug = data.slug ? data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : undefined;
    const duplicate = allCats.find(
      (c) =>
        c.id !== catId &&
        ((data.name && c.name.toLowerCase().trim() === data.name.toLowerCase().trim()) ||
          (cleanSlug && c.slug === cleanSlug))
    );
    if (duplicate) {
      throw new Error(`Another category with that name or slug already exists.`);
    }
  }

  const updatePayload: Record<string, any> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  if (data.displayOrder !== undefined) {
    updatePayload.displayOrder = Number(data.displayOrder);
  }

  await updateDoc(doc(db, CATEGORIES_COL, catId), updatePayload);

  await createAuditLog({
    action: 'CATEGORY_UPDATED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'category',
    entityId: catId,
    targetType: 'category',
    targetId: catId,
    details: `Updated category: ${data.name || catId}`,
    timestamp: new Date().toISOString(),
  });
}

export async function archiveCategoryInDb(catId: string, actorId?: string): Promise<void> {
  await updateDoc(doc(db, CATEGORIES_COL, catId), {
    status: 'INACTIVE',
    updatedAt: new Date().toISOString(),
  });

  await createAuditLog({
    action: 'CATEGORY_ARCHIVED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'category',
    entityId: catId,
    targetType: 'category',
    targetId: catId,
    details: `Archived category ${catId} (marked INACTIVE to preserve historical data).`,
    timestamp: new Date().toISOString(),
  });
}

export async function deleteCategoryInDb(catId: string, actorId?: string): Promise<{ success: boolean; message: string }> {
  // Check if any products reference this category
  const allCats = await fetchCategories();
  const targetCat = allCats.find((c) => c.id === catId);
  if (targetCat) {
    const { count } = await checkCategoryHasActiveProducts(targetCat.name);
    if (count > 0) {
      // Deactivate/archive instead of hard deleting
      await archiveCategoryInDb(catId, actorId);
      return {
        success: true,
        message: `Category contains ${count} products. It has been deactivated & archived to protect product history.`,
      };
    }
  }

  await deleteDoc(doc(db, CATEGORIES_COL, catId));

  await createAuditLog({
    action: 'CATEGORY_DELETED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'category',
    entityId: catId,
    targetType: 'category',
    targetId: catId,
    details: `Safely deleted empty category: ${catId}`,
    timestamp: new Date().toISOString(),
  });

  return { success: true, message: `Category safely removed.` };
}

// ---------------- FINANCIAL CALCULATOR ----------------

export function calculateSellerFinancials(
  sellerId: string,
  products: Product[],
  orders: Order[],
  plan?: SellerPlan | null
) {
  const commissionRate = plan?.commissionRate || 8.0; // default 8%

  let grossRevenue = 0;
  let totalUnitsSold = 0;
  let pendingOrdersCount = 0;
  let deliveredOrdersCount = 0;

  for (const order of orders) {
    const sellerItems = (order.items || []).filter((item) => item.sellerId === sellerId);
    if (sellerItems.length === 0) continue;

    const orderSellerTotal = sellerItems.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0);
    
    if (order.status === 'delivered' || order.orderStatus === 'delivered') {
      grossRevenue += orderSellerTotal;
      totalUnitsSold += sellerItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
      deliveredOrdersCount += 1;
    } else if (order.status !== 'cancelled' && order.orderStatus !== 'cancelled') {
      pendingOrdersCount += 1;
    }
  }

  const platformCommissionDeduction = (grossRevenue * commissionRate) / 100;
  const netEarnings = grossRevenue - platformCommissionDeduction;

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === 'eco_verified').length;
  const underReviewProducts = products.filter((p) => p.status === 'under_review' || p.status === 'pending').length;
  const draftProducts = products.filter((p) => p.status === 'draft').length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)).length;
  const outOfStockProducts = products.filter((p) => p.stock === 0 || p.status === 'out_of_stock').length;

  return {
    grossRevenue,
    commissionRate,
    platformCommissionDeduction,
    netEarnings,
    totalUnitsSold,
    deliveredOrdersCount,
    pendingOrdersCount,
    totalProducts,
    activeProducts,
    underReviewProducts,
    draftProducts,
    lowStockProducts,
    outOfStockProducts,
    productLimit: plan?.productLimit || 10,
    isQuotaReached: totalProducts >= (plan?.productLimit || 10),
  };
}

// ---------------- RE-EXPORTS FOR ADMIN CONTROL CENTER ----------------
export {
  fetchAllUserProfiles,
  fetchFeaturedSpotlights,
  createFeaturedSpotlight,
  updateFeaturedSpotlight,
  deleteFeaturedSpotlight,
  fetchSellerPromotionCampaigns,
  updateSellerPromotionCampaign,
  createSellerWarning,
  imposeSellerRestriction,
  fetchAllMessages,
  sendMessage,
  fetchAllReviews,
  updateReviewInDb,
  deleteReviewFromDb,
} from './adminService';

// Wishlist Cloud & Guest Services
export {
  getWishlist as fetchUserWishlistFromDb,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  syncGuestWishlistOnLogin,
  getGuestWishlist,
  saveGuestWishlist,
} from './firebase/wishlistService';
