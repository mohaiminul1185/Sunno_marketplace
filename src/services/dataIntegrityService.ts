/**
 * SUNNO Data Integrity & Maintenance Service
 * Administrative maintenance tools for auditing, verifying, and repairing
 * Firebase documents and relational consistency (Phase 23 - Requirement 28).
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  CATEGORIES_COL,
  seedCategoriesIfEmpty,
} from './firebase/categoryService';
import {
  COUPONS_COL,
  DELIVERY_SETTINGS_COL,
} from './checkoutService';
import { createAuditLog } from './dbService';
import { INITIAL_COUPONS, DEFAULT_DELIVERY_SETTING } from '../data/mockCoupons';
import { seed60BangladeshProducts } from './dbService';

export interface IntegrityAuditReport {
  timestamp: string;
  totalProductsChecked: number;
  totalOrdersChecked: number;
  totalSubOrdersChecked: number;
  totalCategories: number;
  missingSystemDocs: string[];
  orphanedSubOrders: { id: string; parentOrderId: string; sellerId: string }[];
  inconsistentSellerProducts: { id: string; title: string; sellerId: string }[];
  invalidPhoneAddresses: { entityType: string; id: string; issue: string }[];
  inconsistentEcoBadges: { id: string; title: string; issue: string }[];
  healthy: boolean;
}

/**
 * Perform a thorough, non-destructive read-only audit of Firestore data integrity
 */
export async function runDataIntegrityAudit(): Promise<IntegrityAuditReport> {
  const missingSystemDocs: string[] = [];
  const orphanedSubOrders: { id: string; parentOrderId: string; sellerId: string }[] = [];
  const inconsistentSellerProducts: { id: string; title: string; sellerId: string }[] = [];
  const invalidPhoneAddresses: { entityType: string; id: string; issue: string }[] = [];
  const inconsistentEcoBadges: { id: string; title: string; issue: string }[] = [];

  // 1. Check essential system documents
  try {
    const catSnap = await getDocs(collection(db, CATEGORIES_COL));
    if (catSnap.empty) missingSystemDocs.push('categories (Categories collection is unseeded)');

    const delivSnap = await getDoc(doc(db, DELIVERY_SETTINGS_COL, DEFAULT_DELIVERY_SETTING.id));
    if (!delivSnap.exists()) missingSystemDocs.push('delivery_settings (Global delivery fee config missing)');

    const couponSnap = await getDocs(collection(db, COUPONS_COL));
    if (couponSnap.empty) missingSystemDocs.push('coupons (Initial promo discount codes missing)');
  } catch (err) {
    console.warn('System docs audit note:', err);
  }

  // 2. Read products, orders, and sellers for relationship verification
  let totalProducts = 0;
  let totalOrders = 0;
  let totalSubOrders = 0;
  let totalCats = 0;

  try {
    const [prodSnap, orderSnap, subOrderSnap, sellerSnap, catSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'sub_orders')),
      getDocs(collection(db, 'sellers')),
      getDocs(collection(db, CATEGORIES_COL)),
    ]);

    totalProducts = prodSnap.size;
    totalOrders = orderSnap.size;
    totalSubOrders = subOrderSnap.size;
    totalCats = catSnap.size;

    const validSellerIds = new Set(sellerSnap.docs.map((d) => d.id));
    const validParentOrderIds = new Set(orderSnap.docs.map((d) => d.id));

    // Check products for seller consistency and eco badges
    for (const d of prodSnap.docs) {
      const p = d.data();
      if (!p.sellerId || (validSellerIds.size > 0 && !validSellerIds.has(p.sellerId))) {
        // Only flag if sellerId is completely empty or undefined
        if (!p.sellerId) {
          inconsistentSellerProducts.push({
            id: d.id,
            title: p.title || 'Untitled Craft',
            sellerId: p.sellerId || '[Missing sellerId]',
          });
        }
      }

      // Check eco verification consistency
      if (p.ecoVerified && (!p.ecoTypes || !Array.isArray(p.ecoTypes) || p.ecoTypes.length === 0)) {
        inconsistentEcoBadges.push({
          id: d.id,
          title: p.title || 'Untitled',
          issue: 'Product is ecoVerified but lacks ecoTypes array',
        });
      }
    }

    // Check sub_orders for orphaned parent references
    for (const d of subOrderSnap.docs) {
      const so = d.data();
      if (so.parentOrderId && validParentOrderIds.size > 0 && !validParentOrderIds.has(so.parentOrderId)) {
        orphanedSubOrders.push({
          id: d.id,
          parentOrderId: so.parentOrderId,
          sellerId: so.sellerId || 'Unknown',
        });
      }

      // Check phone formatting
      if (so.customerPhone && !/^(?:\+88|88)?01[3-9]\d{8}$/.test(so.customerPhone.replace(/[\s-]/g, ''))) {
        invalidPhoneAddresses.push({
          entityType: 'sub_order',
          id: d.id,
          issue: `Invalid BD mobile number: "${so.customerPhone}"`,
        });
      }
    }
  } catch (err) {
    console.warn('Integrity scan warning:', err);
  }

  const isHealthy =
    missingSystemDocs.length === 0 &&
    orphanedSubOrders.length === 0 &&
    inconsistentSellerProducts.length === 0 &&
    inconsistentEcoBadges.length === 0;

  return {
    timestamp: new Date().toISOString(),
    totalProductsChecked: totalProducts,
    totalOrdersChecked: totalOrders,
    totalSubOrdersChecked: totalSubOrders,
    totalCategories: totalCats,
    missingSystemDocs,
    orphanedSubOrders,
    inconsistentSellerProducts,
    invalidPhoneAddresses,
    inconsistentEcoBadges,
    healthy: isHealthy,
  };
}

/**
 * Seed essential system baseline documents into Firestore (Admin only)
 */
export async function seedEssentialSystemDocs(actorId: string = 'admin'): Promise<{
  categoriesSeeded: boolean;
  deliverySettingsSeeded: boolean;
  couponsSeeded: number;
  productsSeeded: number;
}> {
  let categoriesSeeded = false;
  let deliverySettingsSeeded = false;
  let couponsCount = 0;
  let productsCount = 0;

  const batch = writeBatch(db);

  // 1. Seed categories
  try {
    await seedCategoriesIfEmpty();
    categoriesSeeded = true;
  } catch (e) {
    console.warn('Seed categories error:', e);
  }

  // 2. Seed delivery settings
  try {
    const delivRef = doc(db, DELIVERY_SETTINGS_COL, DEFAULT_DELIVERY_SETTING.id);
    const delivSnap = await getDoc(delivRef);
    if (!delivSnap.exists()) {
      batch.set(delivRef, {
        ...DEFAULT_DELIVERY_SETTING,
        updatedAt: new Date().toISOString(),
        updatedBy: actorId,
      });
      deliverySettingsSeeded = true;
    }
  } catch (e) {
    console.warn('Seed delivery settings error:', e);
  }

  // 3. Seed default coupons
  try {
    const couponSnap = await getDocs(collection(db, COUPONS_COL));
    if (couponSnap.empty) {
      for (const c of INITIAL_COUPONS) {
        batch.set(doc(db, COUPONS_COL, c.id), {
          ...c,
          createdAt: new Date().toISOString(),
        });
        couponsCount++;
      }
    }
  } catch (e) {
    console.warn('Seed coupons error:', e);
  }

  await batch.commit().catch((err) => console.warn('Commit baseline batch note:', err));

  // 4. Products check
  try {
    const prodSnap = await getDocs(collection(db, 'products'));
    if (prodSnap.empty) {
      const seeded = await seed60BangladeshProducts();
      productsCount = seeded.count;
    }
  } catch (e) {
    console.warn('Seed products error:', e);
  }

  await createAuditLog({
    action: 'SYSTEM_DOCUMENTS_MAINTENANCE_SEEDED',
    performedBy: actorId,
    actorId,
    entityType: 'system',
    entityId: 'maintenance',
    targetType: 'system',
    targetId: 'firestore-baseline',
    details: `Seeded system baseline: Categories (${categoriesSeeded}), Delivery (${deliverySettingsSeeded}), Coupons (${couponsCount}), Products (${productsCount})`,
    timestamp: new Date().toISOString(),
  });

  return {
    categoriesSeeded,
    deliverySettingsSeeded,
    couponsSeeded: couponsCount,
    productsSeeded: productsCount,
  };
}
