import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, CartItem, CartValidationResult, Coupon, DeliverySetting } from '../types';
import { CARTS_COL, PRODUCTS_COL } from './dbService';
import { validateCartBackend, fetchDeliverySettings, fetchCouponByCode } from './checkoutService';

export interface SavedForLaterItem {
  product: Product;
  savedAt: string;
}

export interface UserCartState {
  items: CartItem[];
  savedItems: SavedForLaterItem[];
  appliedCouponCode?: string;
}

const GUEST_CART_KEY = 'sunno_guest_cart_v1';
const GUEST_SAVED_KEY = 'sunno_guest_saved_v1';
const GUEST_COUPON_KEY = 'sunno_guest_coupon_v1';

/**
 * Validate whether a product can be added to the cart
 */
export function validateProductForCart(
  product: Product,
  requestedQuantity: number = 1,
  currentQuantityInCart: number = 0
): {
  isValid: boolean;
  error?: string;
  maxAvailable: number;
} {
  if (!product || !product.id) {
    return { isValid: false, error: 'Invalid product selected.', maxAvailable: 0 };
  }

  // Check product status
  if (product.status === 'out_of_stock') {
    return { isValid: false, error: `"${product.title}" is currently out of stock.`, maxAvailable: 0 };
  }

  if (product.status === 'suspended' || product.status === 'rejected' || product.status === 'archived') {
    return { isValid: false, error: `"${product.title}" is no longer available for purchase.`, maxAvailable: 0 };
  }

  const availableStock = typeof product.stock === 'number' ? product.stock : 0;
  if (availableStock <= 0) {
    return { isValid: false, error: `"${product.title}" is out of stock.`, maxAvailable: 0 };
  }

  const totalRequested = currentQuantityInCart + requestedQuantity;
  if (totalRequested > availableStock) {
    const remainingToAdd = Math.max(0, availableStock - currentQuantityInCart);
    if (remainingToAdd === 0) {
      return {
        isValid: false,
        error: `You already have the maximum available stock (${availableStock}) in your cart.`,
        maxAvailable: availableStock,
      };
    }
    return {
      isValid: false,
      error: `Only ${availableStock} units in stock. You can add at most ${remainingToAdd} more.`,
      maxAvailable: availableStock,
    };
  }

  return { isValid: true, maxAvailable: availableStock };
}

// ---------------- GUEST CART (LOCAL STORAGE) ----------------

export function getGuestCart(allProducts: Product[]): CartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { productId: string; quantity: number }[];
    const items: CartItem[] = [];

    for (const item of parsed) {
      const prod = allProducts.find((p) => p.id === item.productId);
      if (prod && prod.status !== 'archived' && prod.status !== 'rejected') {
        const availableStock = prod.stock || 0;
        if (availableStock > 0) {
          items.push({
            product: prod,
            quantity: Math.min(item.quantity, availableStock),
          });
        }
      }
    }
    return items;
  } catch (err) {
    console.warn('Error reading guest cart:', err);
    return [];
  }
}

export function saveGuestCart(cart: CartItem[]): void {
  try {
    const serialized = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(serialized));
  } catch (err) {
    console.warn('Error saving guest cart:', err);
  }
}

export function getGuestSavedForLater(allProducts: Product[]): SavedForLaterItem[] {
  try {
    const raw = localStorage.getItem(GUEST_SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { productId: string; savedAt: string }[];
    const saved: SavedForLaterItem[] = [];

    for (const item of parsed) {
      const prod = allProducts.find((p) => p.id === item.productId);
      if (prod) {
        saved.push({
          product: prod,
          savedAt: item.savedAt || new Date().toISOString(),
        });
      }
    }
    return saved;
  } catch {
    return [];
  }
}

export function saveGuestSavedForLater(saved: SavedForLaterItem[]): void {
  try {
    const serialized = saved.map((item) => ({
      productId: item.product.id,
      savedAt: item.savedAt,
    }));
    localStorage.setItem(GUEST_SAVED_KEY, JSON.stringify(serialized));
  } catch (err) {
    console.warn('Error saving guest saved-for-later items:', err);
  }
}

export function getGuestCouponCode(): string {
  try {
    return localStorage.getItem(GUEST_COUPON_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGuestCouponCode(code: string): void {
  try {
    if (code) {
      localStorage.setItem(GUEST_COUPON_KEY, code.toUpperCase().trim());
    } else {
      localStorage.removeItem(GUEST_COUPON_KEY);
    }
  } catch {}
}

export function clearGuestCart(): void {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
    localStorage.removeItem(GUEST_COUPON_KEY);
  } catch {}
}

// ---------------- CLOUD CART (FIRESTORE) ----------------

export async function loadUserCartFromCloud(
  userId: string,
  allProducts: Product[]
): Promise<UserCartState> {
  if (!userId) {
    return {
      items: getGuestCart(allProducts),
      savedItems: getGuestSavedForLater(allProducts),
      appliedCouponCode: getGuestCouponCode(),
    };
  }

  try {
    const cartRef = doc(db, CARTS_COL, userId);
    const snap = await getDoc(cartRef);

    if (!snap.exists()) {
      return { items: [], savedItems: [] };
    }

    const data = snap.data();
    const rawItems = (data.items || []) as { productId: string; quantity: number }[];
    const rawSaved = (data.savedItems || []) as { productId: string; savedAt: string }[];
    const appliedCouponCode = data.appliedCouponCode || '';

    const items: CartItem[] = [];
    for (const raw of rawItems) {
      const prod = allProducts.find((p) => p.id === raw.productId);
      if (prod) {
        const availableStock = prod.stock ?? 0;
        if (availableStock > 0) {
          items.push({
            product: prod,
            quantity: Math.min(raw.quantity, availableStock),
          });
        }
      }
    }

    const savedItems: SavedForLaterItem[] = [];
    for (const raw of rawSaved) {
      const prod = allProducts.find((p) => p.id === raw.productId);
      if (prod) {
        savedItems.push({
          product: prod,
          savedAt: raw.savedAt || new Date().toISOString(),
        });
      }
    }

    return { items, savedItems, appliedCouponCode };
  } catch (err) {
    console.warn('Error loading cart from Firestore:', err);
    return { items: [], savedItems: [] };
  }
}

export async function saveUserCartToCloud(
  userId: string,
  cart: CartItem[],
  savedItems: SavedForLaterItem[] = [],
  appliedCouponCode?: string
): Promise<void> {
  if (!userId) {
    saveGuestCart(cart);
    saveGuestSavedForLater(savedItems);
    if (appliedCouponCode !== undefined) saveGuestCouponCode(appliedCouponCode);
    return;
  }

  try {
    const cartRef = doc(db, CARTS_COL, userId);
    await setDoc(
      cartRef,
      {
        userId,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        savedItems: savedItems.map((item) => ({
          productId: item.product.id,
          savedAt: item.savedAt || new Date().toISOString(),
        })),
        appliedCouponCode: appliedCouponCode || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error syncing cart to Firestore:', err);
  }
}

/**
 * Merge Guest Cart into User's Authenticated Cloud Cart on login
 */
export async function mergeGuestCartOnLogin(
  userId: string,
  allProducts: Product[]
): Promise<UserCartState> {
  const guestCart = getGuestCart(allProducts);
  const guestSaved = getGuestSavedForLater(allProducts);
  const guestCoupon = getGuestCouponCode();

  const cloudState = await loadUserCartFromCloud(userId, allProducts);

  // Merge items
  const mergedItemsMap = new Map<string, CartItem>();

  // Add existing cloud items
  for (const item of cloudState.items) {
    mergedItemsMap.set(item.product.id, { ...item });
  }

  // Merge guest items
  for (const guestItem of guestCart) {
    if (mergedItemsMap.has(guestItem.product.id)) {
      const existing = mergedItemsMap.get(guestItem.product.id)!;
      const combinedQty = existing.quantity + guestItem.quantity;
      const maxStock = guestItem.product.stock || combinedQty;
      existing.quantity = Math.min(combinedQty, maxStock);
    } else {
      mergedItemsMap.set(guestItem.product.id, { ...guestItem });
    }
  }

  // Merge saved for later
  const mergedSavedMap = new Map<string, SavedForLaterItem>();
  for (const saved of cloudState.savedItems) {
    mergedSavedMap.set(saved.product.id, saved);
  }
  for (const guestSavedItem of guestSaved) {
    if (!mergedSavedMap.has(guestSavedItem.product.id) && !mergedItemsMap.has(guestSavedItem.product.id)) {
      mergedSavedMap.set(guestSavedItem.product.id, guestSavedItem);
    }
  }

  const mergedItems = Array.from(mergedItemsMap.values());
  const mergedSaved = Array.from(mergedSavedMap.values());
  const finalCoupon = cloudState.appliedCouponCode || guestCoupon || '';

  // Save back to cloud
  await saveUserCartToCloud(userId, mergedItems, mergedSaved, finalCoupon);

  // Clear local guest cache
  clearGuestCart();

  return {
    items: mergedItems,
    savedItems: mergedSaved,
    appliedCouponCode: finalCoupon,
  };
}

/**
 * Perform full cart validation via backend service
 */
export async function executeCartValidation(
  cartItems: CartItem[],
  couponCode?: string,
  deliveryDistrict?: string,
  deliveryMethod?: 'standard' | 'express'
): Promise<CartValidationResult> {
  return validateCartBackend(
    cartItems.map((c) => ({ productId: c.product.id, quantity: c.quantity })),
    couponCode,
    deliveryDistrict,
    deliveryMethod
  );
}
