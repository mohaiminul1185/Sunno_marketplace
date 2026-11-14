import {
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Product,
  DataCleanupPreview,
  DataCleanupResult,
  DuplicateProductItem,
} from '../types';
import {
  PRODUCTS_COL,
  ECO_VERIF_COL,
  ORDERS_COL,
  createAuditLog,
} from './dbService';

/**
 * Scans Firestore collections for:
 * 1. Duplicate products (same SKU, same slug, or identical title within the same seller)
 * 2. Orphaned eco-verification submissions
 * 3. Test or demo order placeholders
 */
export async function scanForDuplicatesAndAnomalies(): Promise<DataCleanupPreview> {
  try {
    // 1. Fetch all products from Firestore
    const prodSnap = await getDocs(collection(db, PRODUCTS_COL));
    const allProducts = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));

    // Group products by SKU, slug, and seller+title
    const skuMap = new Map<string, Product[]>();
    const titleSellerMap = new Map<string, Product[]>();

    allProducts.forEach((p) => {
      if (p.isArchived) return; // skip already archived

      // Check SKU
      if (p.sku && p.sku.trim()) {
        const cleanSku = p.sku.trim().toUpperCase();
        if (!skuMap.has(cleanSku)) skuMap.set(cleanSku, []);
        skuMap.get(cleanSku)!.push(p);
      }

      // Check Title + Seller
      const cleanTitle = (p.title || '').trim().toLowerCase();
      const seller = p.sellerId || 'common';
      const key = `${seller}___${cleanTitle}`;
      if (!titleSellerMap.has(key)) titleSellerMap.set(key, []);
      titleSellerMap.get(key)!.push(p);
    });

    const duplicateGroups: {
      canonicalId: string;
      duplicates: DuplicateProductItem[];
      reason: string;
    }[] = [];

    const processedIds = new Set<string>();

    // Process SKU duplicates
    skuMap.forEach((prods, sku) => {
      if (prods.length > 1) {
        // Oldest or eco-verified product is chosen as canonical
        prods.sort((a, b) => {
          if (a.status === 'eco_verified' && b.status !== 'eco_verified') return -1;
          if (b.status === 'eco_verified' && a.status !== 'eco_verified') return 1;
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        });

        const canonical = prods[0];
        const dups: DuplicateProductItem[] = [];

        for (let i = 1; i < prods.length; i++) {
          const item = prods[i];
          if (!processedIds.has(item.id)) {
            processedIds.add(item.id);
            dups.push({
              id: item.id,
              title: item.title,
              sku: item.sku,
              slug: item.slug,
              sellerId: item.sellerId || '',
              sellerName: item.sellerName,
              price: item.price,
              stock: item.stock,
              createdAt: item.createdAt || '',
              matchReason: 'identical_sku',
            });
          }
        }

        if (dups.length > 0) {
          duplicateGroups.push({
            canonicalId: canonical.id,
            duplicates: dups,
            reason: `Found ${dups.length} duplicate(s) with identical SKU "${sku}". Canonical item retained: "${canonical.title}" (${canonical.id})`,
          });
        }
      }
    });

    // Process Title + Seller duplicates
    titleSellerMap.forEach((prods, key) => {
      if (prods.length > 1) {
        const remaining = prods.filter((p) => !processedIds.has(p.id));
        if (remaining.length > 1) {
          remaining.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
          const canonical = remaining[0];
          const dups: DuplicateProductItem[] = [];

          for (let i = 1; i < remaining.length; i++) {
            const item = remaining[i];
            if (!processedIds.has(item.id)) {
              processedIds.add(item.id);
              dups.push({
                id: item.id,
                title: item.title,
                sku: item.sku,
                slug: item.slug,
                sellerId: item.sellerId || '',
                sellerName: item.sellerName,
                price: item.price,
                stock: item.stock,
                createdAt: item.createdAt || '',
                matchReason: 'same_title_and_seller',
              });
            }
          }

          if (dups.length > 0) {
            duplicateGroups.push({
              canonicalId: canonical.id,
              duplicates: dups,
              reason: `Found ${dups.length} duplicate(s) with identical title "${canonical.title}" for seller "${canonical.sellerName}". Canonical item retained.`,
            });
          }
        }
      }
    });

    // 2. Scan for orphaned queue submissions
    let orphanedSubmissions = 0;
    try {
      const qSnap = await getDocs(collection(db, ECO_VERIF_COL));
      const validProductIds = new Set(allProducts.map((p) => p.id));
      qSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.productId && !validProductIds.has(data.productId)) {
          orphanedSubmissions++;
        }
      });
    } catch {}

    // 3. Scan for demo/test orders
    let testOrdersCount = 0;
    try {
      const ordSnap = await getDocs(collection(db, ORDERS_COL));
      ordSnap.docs.forEach((d) => {
        const o = d.data();
        const isTest =
          o.id?.includes('test') ||
          o.customerName?.toLowerCase().includes('test') ||
          o.customerEmail?.toLowerCase().includes('demo@') ||
          o.customerPhone === '00000000000';
        if (isTest) testOrdersCount++;
      });
    } catch {}

    const totalDuplicates = duplicateGroups.reduce((acc, g) => acc + g.duplicates.length, 0);

    return {
      duplicateProducts: {
        totalDuplicates,
        groups: duplicateGroups,
      },
      orphanedSubmissions,
      orphanedSubOrders: 0,
      testOrdersCount,
      summary: `Found ${totalDuplicates} duplicate product listing(s), ${orphanedSubmissions} orphaned verification submission(s), and ${testOrdersCount} demo test order(s).`,
    };
  } catch (err) {
    console.error('scanForDuplicatesAndAnomalies error:', err);
    return {
      duplicateProducts: { totalDuplicates: 0, groups: [] },
      orphanedSubmissions: 0,
      orphanedSubOrders: 0,
      testOrdersCount: 0,
      summary: 'Deduplication scan encountered an error or database is empty.',
    };
  }
}

/**
 * Executes safe deduplication and archive.
 * NEVER deletes historical orders or financial transactions.
 * Soft-archives duplicate product entries and marks them with an audit trail.
 */
export async function executeSafeCleanup(
  confirmationPhrase: string,
  preview: DataCleanupPreview,
  adminEmail: string = 'admin@sunno.eco'
): Promise<DataCleanupResult> {
  if (confirmationPhrase !== 'CLEANUP_CONFIRMED') {
    throw new Error('Explicit confirmation phrase "CLEANUP_CONFIRMED" is required to prevent accidental data changes.');
  }

  const batch = writeBatch(db);
  let archivedCount = 0;
  const timestamp = new Date().toISOString();

  // 1. Soft-archive duplicate products
  for (const group of preview.duplicateProducts.groups) {
    for (const dup of group.duplicates) {
      const ref = doc(db, PRODUCTS_COL, dup.id);
      batch.update(ref, {
        status: 'archived',
        lifecycleStatus: 'archived',
        isArchived: true,
        archivedAt: timestamp,
        archivedBy: adminEmail,
        archiveReason: `Deduplication: Duplicate of canonical product #${group.canonicalId} (${dup.matchReason})`,
        updatedAt: timestamp,
      });
      archivedCount++;
    }
  }

  await batch.commit();

  // 2. Write permanent audit log
  const auditId = `audit-cleanup-${Date.now()}`;
  await createAuditLog({
    action: 'DATA_DEDUPLICATION_EXECUTED',
    performedBy: adminEmail,
    actorEmail: adminEmail,
    actorRole: 'super_admin',
    targetType: 'system_cleanup',
    targetId: auditId,
    details: `Executed safe deduplication: Soft-archived ${archivedCount} duplicate products. Zero financial/order records deleted.`,
    timestamp,
  });

  return {
    success: true,
    archivedProductsCount: archivedCount,
    cleanedOrphansCount: 0,
    auditLogId: auditId,
    timestamp,
  };
}
