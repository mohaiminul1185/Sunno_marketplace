import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product, CartItem } from '../../types';
import { CARTS_COL } from '../dbService';
import { getProductById } from './productService';
import {
  getGuestCart,
  saveGuestCart,
  getGuestSavedForLater,
  saveGuestSavedForLater,
  getGuestCouponCode,
  saveGuestCouponCode,
  clearGuestCart,
  SavedForLaterItem,
  UserCartState,
} from '../cartService';

export interface CloudCartItemSnapshot {
  productId: string;
  quantity: number;
  priceSnapshot: number;
  nameSnapshot: string;
  imageSnapshot: string;
  sellerId: string;
  shopId: string;
  addedAt: string;
  updatedAt: string;
}

export interface CloudCartDocument {
  userId: string;
  items: CloudCartItemSnapshot[];
  savedItems?: { productId: string; savedAt: string }[];
  appliedCouponCode?: string;
  updatedAt: string;
}

/**
 * Load User Cart from Firestore (or fallback to Guest Cart if unauthenticated)
 */
export async function getCart(userId?: string, allProducts: Product[] = []): Promise<UserCartState> {
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

    const data = snap.data() as CloudCartDocument;
    const rawItems = data.items || [];
    const rawSaved = data.savedItems || [];
    const appliedCouponCode = data.appliedCouponCode || '';

    const items: CartItem[] = [];
    for (const raw of rawItems) {
      let prod = allProducts.find((p) => p.id === raw.productId);
      if (!prod) {
        prod = (await getProductById(raw.productId)) || undefined;
      }

      if (prod) {
        items.push({
          product: prod,
          quantity: raw.quantity,
        });
      }
    }

    const savedItems: SavedForLaterItem[] = [];
    for (const raw of rawSaved) {
      let prod = allProducts.find((p) => p.id === raw.productId);
      if (!prod) {
        prod = (await getProductById(raw.productId)) || undefined;
      }
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
    return {
      items: getGuestCart(allProducts),
      savedItems: getGuestSavedForLater(allProducts),
    };
  }
}

/**
 * Update and persist Cart in Firestore with full item snapshots
 */
export async function updateCart(
  userId: string | undefined,
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
    const itemSnapshots: CloudCartItemSnapshot[] = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      priceSnapshot: item.product.price,
      nameSnapshot: item.product.title,
      imageSnapshot: item.product.images?.[0] || '',
      sellerId: item.product.sellerId || '',
      shopId: item.product.storeId || '',
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const savedSnapshots = savedItems.map((item) => ({
      productId: item.product.id,
      savedAt: item.savedAt || new Date().toISOString(),
    }));

    await setDoc(
      cartRef,
      {
        userId,
        items: itemSnapshots,
        savedItems: savedSnapshots,
        appliedCouponCode: appliedCouponCode || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error updating cart in Firestore:', err);
  }
}

/**
 * Revalidate Cart Items against live Firestore before final checkout.
 * Checks current price, live available stock, and product status.
 */
export async function revalidateCartBeforeCheckout(cart: CartItem[]): Promise<{
  isValid: boolean;
  errors: string[];
  revalidatedCart: CartItem[];
  subtotal: number;
}> {
  const errors: string[] = [];
  const revalidatedCart: CartItem[] = [];
  let subtotal = 0;

  for (const item of cart) {
    const liveProduct = await getProductById(item.product.id);
    if (!liveProduct) {
      errors.push(`"${item.product.title}" is no longer available in the catalog.`);
      continue;
    }

    if (liveProduct.status === 'out_of_stock' || liveProduct.stock <= 0) {
      errors.push(`"${liveProduct.title}" is currently out of stock.`);
      continue;
    }

    if (
      liveProduct.status === 'suspended' ||
      liveProduct.status === 'rejected' ||
      liveProduct.status === 'archived'
    ) {
      errors.push(`"${liveProduct.title}" is no longer available for purchase.`);
      continue;
    }

    const availableStock = liveProduct.stock;
    const finalQuantity = Math.min(item.quantity, availableStock);
    if (finalQuantity < item.quantity) {
      errors.push(
        `Quantity for "${liveProduct.title}" was reduced from ${item.quantity} to ${finalQuantity} based on available stock.`
      );
    }

    const itemPrice = liveProduct.price; // authoritative live price
    revalidatedCart.push({
      product: liveProduct,
      quantity: finalQuantity,
    });
    subtotal += itemPrice * finalQuantity;
  }

  return {
    isValid: errors.length === 0,
    errors,
    revalidatedCart,
    subtotal,
  };
}
