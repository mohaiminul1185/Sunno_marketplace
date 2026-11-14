import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const WISHLISTS_COL = 'wishlists';
export const GUEST_WISHLIST_KEY = 'sunno_guest_wishlist_v1';

export function getGuestWishlist(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestWishlist(wishlist: string[]): void {
  try {
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(wishlist));
  } catch (err) {
    console.warn('saveGuestWishlist error:', err);
  }
}

/**
 * Fetch wishlist for a user from Firestore (or guest local storage)
 */
export async function getWishlist(userId?: string): Promise<string[]> {
  if (!userId) {
    return getGuestWishlist();
  }

  try {
    const ref = doc(db, WISHLISTS_COL, userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const ids: string[] = Array.isArray(data.productIds)
        ? data.productIds
        : (Array.isArray(data.items) ? data.items.map((i: any) => i.productId || i) : []);
      return ids;
    }
    return [];
  } catch (err) {
    console.warn('getWishlist notice:', err);
    return getGuestWishlist();
  }
}

/**
 * Add a product to the user's wishlist
 */
export async function addToWishlist(userId: string | undefined, productId: string): Promise<string[]> {
  if (!userId) {
    const current = getGuestWishlist();
    if (!current.includes(productId)) {
      const updated = [...current, productId];
      saveGuestWishlist(updated);
      return updated;
    }
    return current;
  }

  try {
    const ref = doc(db, WISHLISTS_COL, userId);
    const current = await getWishlist(userId);
    if (current.includes(productId)) return current;

    const updated = [...current, productId];
    await setDoc(
      ref,
      {
        userId,
        productIds: updated,
        items: updated.map((id) => ({
          productId: id,
          addedAt: new Date().toISOString(),
        })),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return updated;
  } catch (err) {
    console.warn('addToWishlist error:', err);
    return [productId];
  }
}

/**
 * Remove a product from the user's wishlist
 */
export async function removeFromWishlist(userId: string | undefined, productId: string): Promise<string[]> {
  if (!userId) {
    const current = getGuestWishlist();
    const updated = current.filter((id) => id !== productId);
    saveGuestWishlist(updated);
    return updated;
  }

  try {
    const ref = doc(db, WISHLISTS_COL, userId);
    const current = await getWishlist(userId);
    const updated = current.filter((id) => id !== productId);

    await setDoc(
      ref,
      {
        userId,
        productIds: updated,
        items: updated.map((id) => ({
          productId: id,
          addedAt: new Date().toISOString(),
        })),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return updated;
  } catch (err) {
    console.warn('removeFromWishlist error:', err);
    return [];
  }
}

/**
 * Toggle product in wishlist
 */
export async function toggleWishlist(
  userId: string | undefined,
  productId: string
): Promise<{ wishlist: string[]; added: boolean }> {
  const current = await getWishlist(userId);
  const exists = current.includes(productId);

  if (exists) {
    const updated = await removeFromWishlist(userId, productId);
    return { wishlist: updated, added: false };
  } else {
    const updated = await addToWishlist(userId, productId);
    return { wishlist: updated, added: true };
  }
}

/**
 * Merge guest wishlist into user's authenticated cloud wishlist on login
 */
export async function syncGuestWishlistOnLogin(userId: string, guestWishlist: string[]): Promise<string[]> {
  if (!userId) return guestWishlist;

  try {
    const cloudWishlist = await getWishlist(userId);
    const merged = Array.from(new Set([...cloudWishlist, ...guestWishlist]));

    const ref = doc(db, WISHLISTS_COL, userId);
    await setDoc(
      ref,
      {
        userId,
        productIds: merged,
        items: merged.map((id) => ({
          productId: id,
          addedAt: new Date().toISOString(),
        })),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Clear guest storage after successful merge
    localStorage.removeItem(GUEST_WISHLIST_KEY);
    return merged;
  } catch (err) {
    console.warn('syncGuestWishlistOnLogin error:', err);
    return guestWishlist;
  }
}
