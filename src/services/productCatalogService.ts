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
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { Product, EcoStatus, Order, SubOrder } from '../types';
import { PRODUCTS_COL, ORDERS_COL, createAuditLog } from './dbService';
import { SUB_ORDERS_COL } from './checkoutService';
import { BANGLADESH_60_ECO_PRODUCTS } from '../data/bangladeshEcoProducts';
import { DEFAULT_PRODUCT_PLACEHOLDER } from './firebase/productService';

export interface CatalogAuditItem {
  productId: string;
  title: string;
  category: string;
  district: string;
  primaryImage: string;
  hasBrokenImage: boolean;
  isDuplicateImage: boolean;
  duplicateCount?: number;
  duplicateWith?: string[];
  mismatchReason?: string;
  status: EcoStatus | string;
}

export interface CatalogAuditReport {
  totalAudited: number;
  healthyCount: number;
  flaggedCount: number;
  duplicateImagesCount: number;
  missingImagesCount: number;
  items: CatalogAuditItem[];
  timestamp: string;
}

export interface OrderReferenceCheck {
  hasOrders: boolean;
  orderCount: number;
  recentOrderNumbers: string[];
}

/**
 * Audits a set of products for image duplicates, missing media, and catalog inconsistencies.
 */
export function auditProductCatalogConsistency(products: Product[]): CatalogAuditReport {
  const imageMap = new Map<string, string[]>();
  const items: CatalogAuditItem[] = [];

  // Group by primary image URL
  for (const p of products) {
    const primaryImg = p.images?.[0] || '';
    if (primaryImg && !primaryImg.startsWith('data:image/svg+xml')) {
      const existing = imageMap.get(primaryImg) || [];
      existing.push(p.id);
      imageMap.set(primaryImg, existing);
    }
  }

  let missingImagesCount = 0;
  let duplicateImagesCount = 0;

  for (const p of products) {
    const primaryImg = p.images?.[0] || '';
    const hasBrokenImage = !primaryImg || primaryImg === DEFAULT_PRODUCT_PLACEHOLDER;
    const dupes = primaryImg ? imageMap.get(primaryImg) || [] : [];
    const isDuplicateImage = dupes.length > 1;

    let mismatchReason: string | undefined;

    if (hasBrokenImage) {
      missingImagesCount++;
      mismatchReason = 'Product does not have a verified primary image';
    } else if (isDuplicateImage) {
      duplicateImagesCount++;
      mismatchReason = `Shared image with ${dupes.length - 1} other product(s)`;
    }

    // Specific category/keyword heuristics
    const lowerTitle = p.title.toLowerCase();
    const lowerCat = (p.category || '').toLowerCase();
    if (lowerTitle.includes('vase') && primaryImg.includes('578749556568')) {
      mismatchReason = 'Vase product displaying tableware plates';
    } else if (lowerTitle.includes('tray') && primaryImg.includes('1544816155')) {
      mismatchReason = 'Tray product displaying a tote bag';
    } else if (lowerTitle.includes('kantha') && primaryImg.includes('1606744824')) {
      mismatchReason = 'Nakshi Kantha displaying room furniture';
    } else if (lowerTitle.includes('guava') && primaryImg.includes('1553279768')) {
      mismatchReason = 'Guava displaying mango image';
    }

    if (hasBrokenImage || isDuplicateImage || mismatchReason) {
      items.push({
        productId: p.id,
        title: p.title,
        category: p.category,
        district: p.district || 'Bangladesh',
        primaryImage: primaryImg || DEFAULT_PRODUCT_PLACEHOLDER,
        hasBrokenImage,
        isDuplicateImage,
        duplicateCount: dupes.length,
        duplicateWith: dupes.filter((id) => id !== p.id),
        mismatchReason,
        status: p.status,
      });
    }
  }

  return {
    totalAudited: products.length,
    healthyCount: products.length - items.length,
    flaggedCount: items.length,
    duplicateImagesCount,
    missingImagesCount,
    items,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Checks whether a product document ID is referenced in historical orders or sub-orders.
 * Preserves audit and order invoice integrity.
 */
export async function checkProductOrderReferences(productId: string): Promise<OrderReferenceCheck> {
  const recentOrderNumbers: string[] = [];
  let orderCount = 0;

  try {
    // 1. Check parent orders
    const ordersSnap = await getDocs(collection(db, ORDERS_COL));
    for (const docSnap of ordersSnap.docs) {
      const orderData = docSnap.data() as Order;
      const hasItem = Array.isArray(orderData.items) && orderData.items.some((i) => i.productId === productId);
      if (hasItem) {
        orderCount++;
        if (recentOrderNumbers.length < 5) {
          recentOrderNumbers.push(orderData.orderNumber || docSnap.id);
        }
      }
    }

    // 2. Check sub-orders
    const subOrdersSnap = await getDocs(collection(db, SUB_ORDERS_COL));
    for (const docSnap of subOrdersSnap.docs) {
      const subData = docSnap.data() as SubOrder;
      const hasItem = Array.isArray(subData.items) && subData.items.some((i) => i.productId === productId);
      if (hasItem) {
        if (!recentOrderNumbers.includes(subData.id) && recentOrderNumbers.length < 5) {
          recentOrderNumbers.push(subData.id);
        }
      }
    }

    return {
      hasOrders: orderCount > 0,
      orderCount,
      recentOrderNumbers,
    };
  } catch (err) {
    console.warn('Error checking product order references:', err);
    return {
      hasOrders: false,
      orderCount: 0,
      recentOrderNumbers: [],
    };
  }
}

/**
 * Safely soft-deletes / archives or hard deletes a product.
 * If the product is referenced by existing orders, enforces ARCHIVAL to protect historical snapshots.
 */
export async function safeDeleteOrArchiveProduct(
  productId: string,
  actorId: string,
  options?: {
    forceHardDelete?: boolean;
    reason?: string;
  }
): Promise<{ success: boolean; action: 'archived' | 'deleted'; message: string }> {
  const refCheck = await checkProductOrderReferences(productId);

  const prodRef = doc(db, PRODUCTS_COL, productId);
  const prodSnap = await getDoc(prodRef);
  const prodData = prodSnap.exists() ? (prodSnap.data() as Product) : null;
  const prodTitle = prodData?.title || productId;

  if (refCheck.hasOrders && !options?.forceHardDelete) {
    // Soft delete / archive to protect invoice records
    await updateDoc(prodRef, {
      status: 'archived',
      isArchived: true,
      archivedAt: new Date().toISOString(),
      archivedBy: actorId,
      archiveReason: options?.reason || `Soft-deleted by Admin (Referenced in ${refCheck.orderCount} orders)`,
      updatedAt: new Date().toISOString(),
    });

    await createAuditLog({
      action: 'PRODUCT_ARCHIVED',
      performedBy: actorId,
      actorId,
      entityType: 'product',
      entityId: productId,
      targetType: 'product',
      targetId: productId,
      details: `Safely archived "${prodTitle}" (Product ID: ${productId}) to preserve ${refCheck.orderCount} historical order snapshots.`,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      action: 'archived',
      message: `Product "${prodTitle}" is referenced by ${refCheck.orderCount} orders. It has been safely archived to preserve customer receipts and historical accounting snapshots.`,
    };
  }

  // Hard delete if not referenced or forced
  await deleteDoc(prodRef);

  await createAuditLog({
    action: 'PRODUCT_DELETED',
    performedBy: actorId,
    actorId,
    entityType: 'product',
    entityId: productId,
    targetType: 'product',
    targetId: productId,
    details: `Permanently removed product "${prodTitle}" (Product ID: ${productId}) from catalog.`,
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    action: 'deleted',
    message: `Product "${prodTitle}" has been permanently removed from the catalog.`,
  };
}

/**
 * Updates a product's lifecycle status (e.g. approved, rejected, published, unpublished, draft).
 */
export async function updateProductLifecycleStatus(
  productId: string,
  newStatus: EcoStatus | string,
  actorId: string,
  rejectionReason?: string
): Promise<void> {
  const prodRef = doc(db, PRODUCTS_COL, productId);

  const updatePayload: Record<string, any> = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  if (newStatus === 'rejected') {
    updatePayload.rejectionReason = rejectionReason || 'Product submission does not meet marketplace eco-guidelines';
  } else if (newStatus === 'approved' || newStatus === 'eco_verified' || newStatus === 'published') {
    updatePayload.approvedAt = new Date().toISOString();
    updatePayload.approvedBy = actorId;
    updatePayload.rejectionReason = null;
  }

  await updateDoc(prodRef, updatePayload);

  await createAuditLog({
    action: 'PRODUCT_STATUS_CHANGED',
    performedBy: actorId,
    actorId,
    entityType: 'product',
    entityId: productId,
    targetType: 'product',
    targetId: productId,
    details: `Updated product status to "${newStatus}"${rejectionReason ? ` (Reason: ${rejectionReason})` : ''}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Re-seeds / synchronizes the verified 60 Bangladesh products with corrected image URLs into Firestore.
 */
export async function syncCorrectedCatalogToFirestore(): Promise<{ count: number; success: boolean }> {
  const batch = writeBatch(db);
  let count = 0;

  for (const p of BANGLADESH_60_ECO_PRODUCTS) {
    const prodRef = doc(db, PRODUCTS_COL, p.id);
    batch.set(
      prodRef,
      sanitizeForFirestore({
        ...p,
        sellerId: p.sellerId || 'seller-green-harvest-01',
        storeId: p.storeId || 'store-green-harvest',
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
    count++;
  }

  if (count > 0) {
    await batch.commit();
  }

  return { count, success: true };
}
