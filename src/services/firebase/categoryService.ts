import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Category } from '../../types';
import { INITIAL_CATEGORIES } from '../dbService';

export const CATEGORIES_COL = 'categories';

export interface FirestoreCategoryDoc {
  categoryId?: string;
  id?: string;
  name: string;
  nameBn?: string;
  slug: string;
  description: string;
  image?: string;
  icon?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'active' | 'inactive';
  sortOrder?: number;
  displayOrder?: number;
  subcategories?: any[];
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Normalizes a category document from Firestore into the UI Category model.
 */
export function normalizeCategory(docId: string, data: any): Category {
  return {
    id: docId,
    name: data.name || 'Artisan Category',
    slug: data.slug || docId.replace('cat-', ''),
    description: data.description || '',
    icon: data.icon || 'eco',
    image: data.image || data.banner || '',
    status: (data.status || 'ACTIVE').toUpperCase() as any,
    displayOrder: typeof data.sortOrder === 'number' ? data.sortOrder : (data.displayOrder || 1),
    subcategories: data.subcategories || [],
    productCount: data.productCount || 0,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Fetch all active categories from Firestore.
 */
export async function getActiveCategories(): Promise<Category[]> {
  try {
    const q = query(
      collection(db, CATEGORIES_COL),
      orderBy('sortOrder', 'asc')
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Fallback query without orderBy in case sortOrder field is not indexed yet
      const fallbackSnap = await getDocs(collection(db, CATEGORIES_COL));
      if (fallbackSnap.empty) {
        await seedCategoriesIfEmpty();
        return INITIAL_CATEGORIES;
      }
      return fallbackSnap.docs
        .map((d) => normalizeCategory(d.id, d.data()))
        .filter((c) => c.status === 'ACTIVE' || (c as any).status === 'active')
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }

    const categories = snap.docs
      .map((d) => normalizeCategory(d.id, d.data()))
      .filter((c) => c.status === 'ACTIVE' || (c as any).status === 'active');

    return categories.length > 0 ? categories : INITIAL_CATEGORIES;
  } catch (err) {
    console.warn('getActiveCategories notice, attempting simple query:', err);
    try {
      const snap = await getDocs(collection(db, CATEGORIES_COL));
      if (!snap.empty) {
        return snap.docs
          .map((d) => normalizeCategory(d.id, d.data()))
          .filter((c) => c.status === 'ACTIVE' || (c as any).status === 'active')
          .sort((a, b) => a.displayOrder - b.displayOrder);
      }
    } catch {
      // Fallback
    }
    return INITIAL_CATEGORIES;
  }
}

/**
 * Get category by slug or id from Firestore
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const cleanSlug = slug.toLowerCase().trim();
    // 1. Try direct doc lookup if doc ID is known
    const docRef = doc(db, CATEGORIES_COL, cleanSlug);
    const directSnap = await getDoc(docRef);
    if (directSnap.exists()) {
      return normalizeCategory(directSnap.id, directSnap.data());
    }

    // 2. Query by slug
    const q = query(collection(db, CATEGORIES_COL), where('slug', '==', cleanSlug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return normalizeCategory(snap.docs[0].id, snap.docs[0].data());
    }

    // 3. Fallback to active categories in-memory match
    const all = await getActiveCategories();
    return all.find((c) => c.slug.toLowerCase() === cleanSlug || c.id.toLowerCase() === cleanSlug) || null;
  } catch (err) {
    console.warn('getCategoryBySlug error:', err);
    return INITIAL_CATEGORIES.find((c) => c.slug.toLowerCase() === slug.toLowerCase()) || null;
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const docRef = doc(db, CATEGORIES_COL, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return normalizeCategory(snap.id, snap.data());
    }
    return null;
  } catch (err) {
    console.warn('getCategoryById error:', err);
    return null;
  }
}

/**
 * Real-time listener for active categories
 */
export function subscribeCategories(callback: (categories: Category[]) => void) {
  try {
    const colRef = collection(db, CATEGORIES_COL);
    return onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => normalizeCategory(d.id, d.data()))
            .filter((c) => c.status === 'ACTIVE' || (c as any).status === 'active')
            .sort((a, b) => a.displayOrder - b.displayOrder);
          callback(list.length > 0 ? list : INITIAL_CATEGORIES);
        } else {
          callback(INITIAL_CATEGORIES);
        }
      },
      (err) => {
        console.warn('Categories subscription notice:', err);
        callback(INITIAL_CATEGORIES);
      }
    );
  } catch {
    callback(INITIAL_CATEGORIES);
    return () => {};
  }
}

/**
 * Safely seed categories if Firestore categories collection is empty.
 * Uses deterministic IDs to prevent duplicate inserts on reload.
 */
export async function seedCategoriesIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, CATEGORIES_COL));
    if (!snap.empty) {
      return; // Already populated
    }

    const batch = writeBatch(db);
    for (const cat of INITIAL_CATEGORIES) {
      const catRef = doc(db, CATEGORIES_COL, cat.id);
      const payload: FirestoreCategoryDoc = {
        categoryId: cat.id,
        id: cat.id,
        name: cat.name,
        nameBn: cat.name === 'Organic Food' ? 'জৈব খাদ্য' :
                cat.name === 'Handmade Crafts' ? 'হস্তশিল্প' :
                cat.name === 'Sustainable Fashion' ? 'টেকসই ফ্যাশন' : 'পরিবেশবান্ধব গৃহসামগ্রী',
        slug: cat.slug,
        description: cat.description,
        image: cat.image || '',
        icon: cat.icon || 'spa',
        status: 'ACTIVE',
        sortOrder: cat.displayOrder,
        displayOrder: cat.displayOrder,
        subcategories: cat.subcategories || [],
        productCount: cat.productCount || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(catRef, payload, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn('seedCategoriesIfEmpty notice:', err);
  }
}
