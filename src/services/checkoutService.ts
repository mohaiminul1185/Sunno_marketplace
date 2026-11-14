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
  writeBatch,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import {
  Product,
  CartItem,
  Order,
  SubOrder,
  OrderItem,
  UserAddress,
  Coupon,
  DeliverySetting,
  CartValidationResult,
  CartValidationItem,
  OrderStatus,
} from '../types';
import {
  PRODUCTS_COL,
  ORDERS_COL,
  NOTIFICATIONS_COL,
  createAuditLog,
} from './dbService';
import { INITIAL_COUPONS, DEFAULT_DELIVERY_SETTING } from '../data/mockCoupons';
import { BANGLADESH_60_ECO_PRODUCTS } from '../data/bangladeshEcoProducts';
import { recordDeliveredSubOrderFinance } from './financeService';
import { triggerOrderNotificationEvent } from './notificationService';
import { validateOrderStatusTransition } from './orderStateMachine';
import { isPublicProduct } from './firebase/productService';

export const SUB_ORDERS_COL = 'sub_orders';
export const COUPONS_COL = 'coupons';
export const DELIVERY_SETTINGS_COL = 'delivery_settings';
export const CARTS_COL = 'carts';
export const WISHLISTS_COL = 'wishlists';
export const ADDRESSES_COL = 'addresses';

// ---------------- DELIVERY SETTINGS ----------------

export async function fetchDeliverySettings(): Promise<DeliverySetting> {
  try {
    const ref = doc(db, DELIVERY_SETTINGS_COL, DEFAULT_DELIVERY_SETTING.id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as DeliverySetting;
    }
    await setDoc(ref, DEFAULT_DELIVERY_SETTING).catch(() => {});
    return DEFAULT_DELIVERY_SETTING;
  } catch {
    return DEFAULT_DELIVERY_SETTING;
  }
}

export async function updateDeliverySettingsInDb(
  settings: Partial<DeliverySetting>,
  actorId?: string
): Promise<void> {
  const ref = doc(db, DELIVERY_SETTINGS_COL, DEFAULT_DELIVERY_SETTING.id);
  await setDoc(
    ref,
    {
      ...DEFAULT_DELIVERY_SETTING,
      ...settings,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await createAuditLog({
    action: 'DELIVERY_SETTINGS_UPDATED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'delivery_settings',
    entityId: DEFAULT_DELIVERY_SETTING.id,
    targetType: 'delivery_settings',
    targetId: DEFAULT_DELIVERY_SETTING.id,
    details: `Updated delivery fee settings (Inside Dhaka: ৳${settings.defaultInsideDhaka ?? DEFAULT_DELIVERY_SETTING.defaultInsideDhaka}, Outside: ৳${settings.defaultOutsideDhaka ?? DEFAULT_DELIVERY_SETTING.defaultOutsideDhaka})`,
    timestamp: new Date().toISOString(),
  });
}

// ---------------- COUPONS CRUD & VALIDATION ----------------

export async function fetchCoupons(): Promise<Coupon[]> {
  try {
    const snap = await getDocs(collection(db, COUPONS_COL));
    if (snap.empty) {
      const batch = writeBatch(db);
      for (const c of INITIAL_COUPONS) {
        batch.set(doc(db, COUPONS_COL, c.id), c);
      }
      await batch.commit().catch(() => {});
      return INITIAL_COUPONS;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Coupon));
  } catch (err) {
    console.warn('fetchCoupons fallback to initial coupons:', err);
    return INITIAL_COUPONS;
  }
}

export async function fetchCouponByCode(code: string): Promise<Coupon | null> {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();
  try {
    const q = query(collection(db, COUPONS_COL), where('code', '==', cleanCode));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data() as Coupon;
      return { id: snap.docs[0].id, ...data };
    }
  } catch (err) {
    console.warn('fetchCouponByCode Firestore lookup notice:', err);
  }

  // Fallback to verified initial coupons & auto-sync to Firestore
  const localCoupon = INITIAL_COUPONS.find((c) => c.code.toUpperCase() === cleanCode);
  if (localCoupon) {
    setDoc(doc(db, COUPONS_COL, localCoupon.id), sanitizeForFirestore(localCoupon), { merge: true }).catch(() => {});
    return localCoupon;
  }

  return null;
}

export async function createCouponInDb(
  coupon: Omit<Coupon, 'id'>,
  actorId?: string
): Promise<Coupon> {
  const id = `coupon-${Date.now()}`;
  const newCoupon: Coupon = {
    ...coupon,
    id,
    code: coupon.code.toUpperCase().trim(),
    usedCount: 0,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, COUPONS_COL, id), newCoupon);

  await createAuditLog({
    action: 'COUPON_CREATED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'coupon',
    entityId: id,
    targetType: 'coupon',
    targetId: id,
    details: `Created coupon code ${newCoupon.code} (${newCoupon.discountType === 'percentage' ? `${newCoupon.discountValue}%` : `৳${newCoupon.discountValue}`})`,
    timestamp: new Date().toISOString(),
  });

  return newCoupon;
}

export async function updateCouponInDb(
  couponId: string,
  data: Partial<Coupon>,
  actorId?: string
): Promise<void> {
  const ref = doc(db, COUPONS_COL, couponId);
  await updateDoc(ref, {
    ...data,
    ...(data.code ? { code: data.code.toUpperCase().trim() } : {}),
  });

  await createAuditLog({
    action: 'COUPON_UPDATED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'coupon',
    entityId: couponId,
    targetType: 'coupon',
    targetId: couponId,
    details: `Updated coupon: ${couponId}`,
    timestamp: new Date().toISOString(),
  });
}

export async function deleteCouponInDb(couponId: string, actorId?: string): Promise<void> {
  await deleteDoc(doc(db, COUPONS_COL, couponId));

  await createAuditLog({
    action: 'COUPON_DELETED',
    performedBy: actorId || 'admin',
    actorId: actorId || 'admin',
    entityType: 'coupon',
    entityId: couponId,
    targetType: 'coupon',
    targetId: couponId,
    details: `Deleted coupon: ${couponId}`,
    timestamp: new Date().toISOString(),
  });
}

// ---------------- BACKEND CART VALIDATION ENGINE ----------------
export async function validateCartBackend(
  cartItems: { productId: string; quantity: number }[],
  couponCode?: string,
  deliveryDistrict?: string,
  deliveryMethod?: 'standard' | 'express'
): Promise<CartValidationResult> {
  const errors: string[] = [];
  const validatedItems: CartValidationItem[] = [];
  let calculatedSubtotal = 0;

  if (!cartItems || cartItems.length === 0) {
    return {
      isValid: false,
      errors: ['Shopping cart is empty.'],
      items: [],
      subtotal: 0,
      discountAmount: 0,
      appliedCoupon: null,
      deliveryFee: 0,
      finalTotal: 0,
      isFreeDelivery: false,
      itemsBySeller: {},
    };
  }

  for (const item of cartItems) {
    if (item.quantity <= 0) continue;

    try {
      let product: Product | null = null;
      const prodRef = doc(db, PRODUCTS_COL, item.productId);
      const prodSnap = await getDoc(prodRef);

      if (prodSnap.exists()) {
        product = { id: prodSnap.id, ...prodSnap.data() } as Product;
      } else {
        // Fallback to verified local catalog & sync to Firestore automatically
        const localProd = BANGLADESH_60_ECO_PRODUCTS.find((p) => p.id === item.productId);
        if (localProd) {
          product = { ...localProd } as Product;
          setDoc(prodRef, sanitizeForFirestore({
            ...product,
            updatedAt: new Date().toISOString(),
          }), { merge: true }).catch(() => {});
        }
      }

      if (!product) {
        errors.push(`Product ID "${item.productId}" is no longer available in the catalog.`);
        continue;
      }

      if (!isPublicProduct(product)) {
        errors.push(`"${product.title}" is currently not available for purchase (Status: ${product.status || 'unpublished'}).`);
        continue;
      }

      const availableStock = product.stock ?? 0;
      let itemValid = true;
      let itemError: string | undefined;

      if (availableStock <= 0) {
        itemValid = false;
        itemError = `"${product.title}" is out of stock.`;
        errors.push(itemError);
      } else if (item.quantity > availableStock) {
        itemValid = false;
        itemError = `Only ${availableStock} units available for "${product.title}" (Requested: ${item.quantity}).`;
        errors.push(itemError);
      }

      const unitPrice = Number(product.price) || 0;
      const itemTotal = unitPrice * item.quantity;
      calculatedSubtotal += itemTotal;

      const sellerId = product.sellerId || 'seller-green-harvest-01';
      const sellerName = product.sellerName || 'SUNNO Artisan Partner';
      const storeName = product.sellerName || 'Artisan Workshop';

      validatedItems.push({
        product,
        quantity: item.quantity,
        unitPrice,
        itemTotal,
        sellerId,
        sellerName,
        storeName,
        availableStock,
        isValid: itemValid,
        error: itemError,
      });
    } catch {
      errors.push(`Failed to verify product "${item.productId}". Please retry.`);
    }
  }

  const itemsBySeller: CartValidationResult['itemsBySeller'] = {};
  for (const item of validatedItems) {
    if (!itemsBySeller[item.sellerId]) {
      itemsBySeller[item.sellerId] = {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        storeName: item.storeName,
        items: [],
        subtotal: 0,
      };
    }
    itemsBySeller[item.sellerId].items.push(item);
    itemsBySeller[item.sellerId].subtotal += item.itemTotal;
  }

  let appliedCoupon: Coupon | null = null;
  let discountAmount = 0;

  if (couponCode && couponCode.trim()) {
    const coupon = await fetchCouponByCode(couponCode);
    if (!coupon) {
      errors.push(`Coupon code "${couponCode.toUpperCase().trim()}" is invalid or expired.`);
    } else if (!coupon.active) {
      errors.push(`Coupon code "${coupon.code}" is currently deactivated.`);
    } else if (coupon.minOrderAmount && calculatedSubtotal < coupon.minOrderAmount) {
      errors.push(
        `Coupon "${coupon.code}" requires a minimum order amount of ৳${coupon.minOrderAmount} (Current subtotal: ৳${calculatedSubtotal}).`
      );
    } else if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      errors.push(`Coupon "${coupon.code}" has reached its maximum total usage limit.`);
    } else {
      if (coupon.discountType === 'percentage') {
        const rawDiscount = (calculatedSubtotal * coupon.discountValue) / 100;
        discountAmount = coupon.maxDiscount ? Math.min(rawDiscount, coupon.maxDiscount) : rawDiscount;
      } else {
        discountAmount = Math.min(calculatedSubtotal, coupon.discountValue);
      }
      appliedCoupon = coupon;
    }
  }

  const deliveryConfig = await fetchDeliverySettings();
  const isInsideDhaka =
    !deliveryDistrict ||
    deliveryDistrict.toLowerCase().includes('dhaka') ||
    deliveryDistrict.toLowerCase() === 'dhaka division';

  let baseDeliveryFee = isInsideDhaka
    ? deliveryConfig.defaultInsideDhaka || 60
    : deliveryConfig.defaultOutsideDhaka || 120;

  const isFreeDelivery = calculatedSubtotal >= (deliveryConfig.freeDeliveryThreshold || 2500);
  if (isFreeDelivery) {
    baseDeliveryFee = 0;
  }

  if (deliveryMethod === 'express') {
    baseDeliveryFee += deliveryConfig.expressDeliverySurcharge || 50;
  }

  const finalTotal = Math.max(0, calculatedSubtotal - discountAmount + baseDeliveryFee);
  const isValid = errors.length === 0 && validatedItems.length > 0;

  return {
    isValid,
    errors,
    items: validatedItems,
    subtotal: calculatedSubtotal,
    discountAmount,
    appliedCoupon,
    deliveryFee: baseDeliveryFee,
    finalTotal,
    isFreeDelivery,
    itemsBySeller,
  };
}

// ---------------- MULTI-VENDOR ORDER CREATION ENGINE ----------------

export interface PlaceOrderParams {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: UserAddress;
  deliveryMethod?: 'standard' | 'express';
  courierName?: string;
  deliveryInstructions?: string;
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'cod' | 'bank_transfer' | string;
  couponCode?: string;
  cartItems: CartItem[];
  paymentVerified?: boolean;
  paymentTransactionId?: string;
  idempotencyKey?: string;
}

export async function createMultiVendorOrder(params: PlaceOrderParams): Promise<{
  parentOrder: Order;
  subOrders: SubOrder[];
}> {
  const validation = await validateCartBackend(
    params.cartItems.map((ci) => ({ productId: ci.product.id, quantity: ci.quantity })),
    params.couponCode,
    params.shippingAddress.district || params.shippingAddress.division,
    params.deliveryMethod
  );

  if (!validation.isValid) {
    throw new Error(`Order placement validation failed: ${validation.errors.join(' | ')}`);
  }

  const year = 2026;
  const randomSixDigits = Math.floor(100000 + Math.random() * 900000).toString();
  const parentOrderId = `SUNNO-ORD-${year}-${randomSixDigits}`;
  const orderNumber = parentOrderId;

  const allOrderItems: OrderItem[] = validation.items.map((vi) => ({
    productId: vi.product.id,
    title: vi.product.title,
    productNameSnapshot: vi.product.title,
    price: vi.unitPrice,
    priceSnapshot: vi.unitPrice,
    quantity: vi.quantity,
    image: vi.product.images[0] || '',
    sellerId: vi.sellerId || 'seller-green-harvest-01',
    sellerName: vi.sellerName || 'SUNNO Artisan Partner',
    storeName: vi.storeName || 'Artisan Workshop',
    district: vi.product.district || 'Dhaka',
    sku: vi.product.sku || '',
    sellerSnapshot: {
      sellerId: vi.sellerId || 'seller-green-harvest-01',
      sellerName: vi.sellerName || 'SUNNO Artisan Partner',
      storeName: vi.storeName || 'Artisan Workshop',
      district: vi.product.district || 'Dhaka',
    },
    categorySnapshot: vi.product.category || 'Handmade Crafts',
  }));

  const sellerGroups = Object.values(validation.itemsBySeller);
  const sellerIds = sellerGroups.map((g) => g.sellerId);

  const subOrders: SubOrder[] = [];
  const subOrderSuffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const totalSubtotal = validation.subtotal || 1;

  for (let idx = 0; idx < sellerGroups.length; idx++) {
    const group = sellerGroups[idx];
    const subOrderId = `SUB-${randomSixDigits}-${subOrderSuffixes[idx] || (idx + 1)}`;
    const groupItems: OrderItem[] = group.items.map((vi) => ({
      productId: vi.product.id,
      title: vi.product.title,
      productNameSnapshot: vi.product.title,
      price: vi.unitPrice,
      priceSnapshot: vi.unitPrice,
      quantity: vi.quantity,
      image: vi.product.images[0] || '',
      sellerId: vi.sellerId || 'seller-green-harvest-01',
      sellerName: vi.sellerName || 'SUNNO Artisan Partner',
      storeName: vi.storeName || 'Artisan Workshop',
      district: vi.product.district || 'Dhaka',
      sku: vi.product.sku || '',
      sellerSnapshot: {
        sellerId: vi.sellerId || 'seller-green-harvest-01',
        sellerName: vi.sellerName || 'SUNNO Artisan Partner',
        storeName: vi.storeName || 'Artisan Workshop',
        district: vi.product.district || 'Dhaka',
      },
      categorySnapshot: vi.product.category || 'Handmade Crafts',
    }));

    const groupWeight = group.subtotal / totalSubtotal;
    const groupDiscount = Math.round(validation.discountAmount * groupWeight);
    const groupDelivery = Math.round(validation.deliveryFee * groupWeight);
    const groupTotal = Math.max(0, group.subtotal - groupDiscount + groupDelivery);

    const subOrder: SubOrder = {
      id: subOrderId,
      parentOrderId,
      sellerId: group.sellerId,
      sellerName: group.sellerName,
      storeName: group.storeName || '',
      customerId: params.customerId,
      userId: params.customerId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      items: groupItems,
      subtotal: group.subtotal,
      discount: groupDiscount,
      deliveryFee: groupDelivery,
      total: groupTotal,
      status: 'confirmed',
      shippingAddress: params.shippingAddress,
      trackingCode: `SUNNO-TRK-${year}-${randomSixDigits}-${subOrderSuffixes[idx] || 'A'}`,
      courierNotes: `Zero-plastic eco packaging at ${group.sellerName} artisan workshop`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    subOrders.push(subOrder);
  }

  const isCod = params.paymentMethod === 'cod';
  const isDigitalPaid = Boolean(params.paymentVerified);
  const paymentStatus = isCod ? 'pending' : isDigitalPaid ? 'paid' : 'pending';
  const orderStatus = isCod || isDigitalPaid ? 'confirmed' : 'pending';
  const trackingCode = `SUNNO-TRK-${year}-${randomSixDigits}`;
  const trackingUrl = `https://sunno.app/track/${parentOrderId}`;

  const parentOrder: Order = {
    id: parentOrderId,
    orderNumber,
    userId: params.customerId,
    customerId: params.customerId,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    customerEmail: params.customerEmail || '',
    customerAddress: `${params.shippingAddress.streetAddress}, ${params.shippingAddress.area || ''}, ${params.shippingAddress.upazila || ''}, ${params.shippingAddress.district}`,
    shippingAddress: params.shippingAddress,
    shippingAddressSnapshot: { ...params.shippingAddress },
    items: allOrderItems,
    subOrders,
    subtotal: validation.subtotal,
    discount: validation.discountAmount,
    discountAmount: validation.discountAmount,
    discountCode: validation.appliedCoupon?.code || '',
    couponCode: validation.appliedCoupon?.code || '',
    shippingFee: validation.deliveryFee,
    deliveryFee: validation.deliveryFee,
    deliveryMethod: params.deliveryMethod || 'standard',
    courierName: params.courierName || (params.deliveryMethod === 'express' ? 'Pathao Logistics Express' : 'Steadfast Courier'),
    deliveryInstructions: params.deliveryInstructions || '',
    currency: 'BDT',
    total: validation.finalTotal,
    finalTotal: validation.finalTotal,
    paymentMethod: params.paymentMethod,
    paymentStatus,
    paymentTransactionId: params.paymentTransactionId || '',
    status: orderStatus,
    orderStatus,
    sellerIds,
    trackingCode,
    trackingUrl,
    courierTracking: `${params.courierName || 'Steadfast Courier'} #${randomSixDigits}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const batch = writeBatch(db);
  const parentOrderRef = doc(db, ORDERS_COL, parentOrderId);
  batch.set(parentOrderRef, sanitizeForFirestore(parentOrder));

  for (const subOrder of subOrders) {
    const subOrderRef = doc(db, SUB_ORDERS_COL, subOrder.id);
    batch.set(subOrderRef, sanitizeForFirestore(subOrder));
  }

  await batch.commit();

  for (const vi of validation.items) {
    try {
      const prodRef = doc(db, PRODUCTS_COL, vi.product.id);
      const nextStock = Math.max(0, (vi.product.stock || 0) - vi.quantity);
      await setDoc(prodRef, sanitizeForFirestore({
        ...vi.product,
        stock: nextStock,
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    } catch (stockErr) {
      console.warn(`[Stock deduction notice for ${vi.product.id}]:`, stockErr);
    }
  }

  if (validation.appliedCoupon) {
    try {
      const couponRef = doc(db, COUPONS_COL, validation.appliedCoupon.id);
      await setDoc(couponRef, sanitizeForFirestore({
        ...validation.appliedCoupon,
        usedCount: (validation.appliedCoupon.usedCount || 0) + 1,
      }), { merge: true });
    } catch (couponErr) {
      console.warn('[Coupon increment notice]:', couponErr);
    }
  }

  try {
    await triggerOrderNotificationEvent({
      eventType: 'order.created',
      orderId: parentOrderId,
      orderNumber,
      customerId: params.customerId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      totalAmount: parentOrder.finalTotal,
      currency: 'BDT',
      paymentMethod: params.paymentMethod,
      paymentStatus,
      deliveryMethod: params.deliveryMethod || 'standard',
      estimatedDelivery: params.shippingAddress.district?.toLowerCase().includes('dhaka') ? '24-48 Hours' : '2-4 Days',
      trackingCode,
      trackingUrl,
      courierName: parentOrder.courierName,
      items: allOrderItems,
      subOrders,
      sellerIds,
    });
  } catch (err) {
    console.warn('[Notification event dispatch non-blocking]:', err);
  }

  if (params.customerId) {
    const cartRef = doc(db, CARTS_COL, params.customerId);
    await setDoc(cartRef, { items: [], updatedAt: new Date().toISOString() }).catch(() => {});
  }

  await createAuditLog({
    action: 'ORDER_PLACED_MULTI_VENDOR',
    performedBy: params.customerName,
    actorId: params.customerId,
    entityType: 'order',
    entityId: parentOrderId,
    targetType: 'order',
    targetId: parentOrderId,
    details: `Multi-vendor order placed. Subtotal: ৳${validation.subtotal}, Discount: ৳${validation.discountAmount}, Delivery: ৳${validation.deliveryFee}, Total: ৳${validation.finalTotal}. Sellers: ${sellerIds.join(', ')}`,
    timestamp: new Date().toISOString(),
  }).catch((auditErr) => {
    console.warn('[Order audit log non-blocking notice]:', auditErr);
  });

  return { parentOrder, subOrders };
}

// ---------------- SUB-ORDER & PARENT ORDER QUERIES ----------------

export async function fetchSellerSubOrders(sellerId: string): Promise<SubOrder[]> {
  try {
    const q = query(collection(db, SUB_ORDERS_COL), where('sellerId', '==', sellerId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SubOrder));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export function subscribeSellerSubOrders(
  sellerId: string,
  callback: (subOrders: SubOrder[]) => void
): () => void {
  try {
    const q = query(collection(db, SUB_ORDERS_COL), where('sellerId', '==', sellerId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SubOrder));
        callback(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      },
      (err) => {
        console.warn('SubOrders realtime listener error:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach subOrders listener:', err);
    return () => {};
  }
}

export async function fetchParentOrderById(orderId: string): Promise<Order | null> {
  try {
    const ref = doc(db, ORDERS_COL, orderId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Order;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchSubOrdersForParent(parentOrderId: string): Promise<SubOrder[]> {
  try {
    const q = query(collection(db, SUB_ORDERS_COL), where('parentOrderId', '==', parentOrderId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SubOrder));
  } catch {
    return [];
  }
}

export async function updateSubOrderStatusInDb(
  subOrderId: string,
  newStatus: OrderStatus,
  actorId: string,
  notes?: string
): Promise<void> {
  const ref = doc(db, SUB_ORDERS_COL, subOrderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Sub-order not found');

  const subOrder = snap.data() as SubOrder;
  const validation = validateOrderStatusTransition(subOrder.status, newStatus);
  if (!validation.isValid) {
    throw new Error(validation.error || `Invalid state transition from ${subOrder.status} to ${newStatus}`);
  }

  await updateDoc(ref, {
    status: newStatus,
    ...(notes ? { courierNotes: notes } : {}),
    updatedAt: new Date().toISOString(),
  });

  await setDoc(doc(db, NOTIFICATIONS_COL, `notif-status-${Date.now()}`), {
    id: `notif-status-${Date.now()}`,
    userId: subOrder.customerId,
    title: `Sub-Order Update: ${newStatus.toUpperCase()}`,
    message: `Your package from ${subOrder.sellerName} (Sub-Order #${subOrder.id}) is now marked as ${newStatus.replace('_', ' ')}.`,
    type: 'order',
    read: false,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  if (newStatus === 'delivered') {
    await recordDeliveredSubOrderFinance({ ...subOrder, status: 'delivered' }).catch((err) => {
      console.error('Error logging delivered sub-order finance:', err);
    });
  }

  const allSubOrders = await fetchSubOrdersForParent(subOrder.parentOrderId);
  const allShipped = allSubOrders.every((s) => s.id === subOrderId ? newStatus === 'shipped' : s.status === 'shipped');
  const allDelivered = allSubOrders.every((s) => s.id === subOrderId ? newStatus === 'delivered' : s.status === 'delivered');

  if (allDelivered) {
    await updateDoc(doc(db, ORDERS_COL, subOrder.parentOrderId), {
      status: 'delivered',
      orderStatus: 'delivered',
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  } else if (allShipped) {
    await updateDoc(doc(db, ORDERS_COL, subOrder.parentOrderId), {
      status: 'shipped',
      orderStatus: 'shipped',
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  await createAuditLog({
    action: 'SUB_ORDER_STATUS_UPDATED',
    performedBy: actorId,
    actorId,
    entityType: 'sub_order',
    entityId: subOrderId,
    targetType: 'sub_order',
    targetId: subOrderId,
    details: `Sub-order status changed to ${newStatus}.${notes ? ` Notes: ${notes}` : ''}`,
    timestamp: new Date().toISOString(),
  });
}

// ---------------- CUSTOMER ADDRESSES DB CRUD ----------------

export async function fetchCustomerAddressesFromDb(userId: string): Promise<UserAddress[]> {
  try {
    const q = query(collection(db, ADDRESSES_COL), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserAddress));
  } catch {
    return [];
  }
}

export async function saveCustomerAddressInDb(address: UserAddress): Promise<UserAddress> {
  const id = address.id || `addr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const fullAddress: UserAddress = {
    ...address,
    id,
    createdAt: address.createdAt || new Date().toISOString(),
  };

  if (fullAddress.isDefault && fullAddress.userId) {
    const existing = await fetchCustomerAddressesFromDb(fullAddress.userId);
    const batch = writeBatch(db);
    for (const ea of existing) {
      if (ea.id !== id && ea.isDefault) {
        batch.update(doc(db, ADDRESSES_COL, ea.id), { isDefault: false });
      }
    }
    await batch.commit().catch(() => {});
  }

  await setDoc(doc(db, ADDRESSES_COL, id), sanitizeForFirestore(fullAddress), { merge: true });
  return fullAddress;
}

export async function deleteCustomerAddressFromDb(addressId: string): Promise<void> {
  await deleteDoc(doc(db, ADDRESSES_COL, addressId));
}

// ---------------- CART & WISHLIST PERSISTENCE WITH DB ----------------

export async function saveCartToDb(userId: string, items: CartItem[]): Promise<void> {
  if (!userId) return;
  try {
    const ref = doc(db, CARTS_COL, userId);
    await setDoc(
      ref,
      {
        userId,
        items: items.map((ci) => ({
          productId: ci.product.id,
          quantity: ci.quantity,
        })),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Cart db save error:', err);
  }
}

export async function loadCartFromDb(userId: string, allProducts: Product[]): Promise<CartItem[]> {
  if (!userId) return [];
  try {
    const ref = doc(db, CARTS_COL, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];

    const data = snap.data();
    const storedItems = (data.items || []) as { productId: string; quantity: number }[];
    const result: CartItem[] = [];

    for (const item of storedItems) {
      const prod = allProducts.find((p) => p.id === item.productId);
      if (prod) {
        result.push({
          product: prod,
          quantity: Math.min(item.quantity, prod.stock > 0 ? prod.stock : 1),
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export async function saveWishlistToDb(userId: string, wishlistIds: string[]): Promise<void> {
  if (!userId) return;
  try {
    const ref = doc(db, WISHLISTS_COL, userId);
    await setDoc(
      ref,
      {
        userId,
        productIds: wishlistIds,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Wishlist db save error:', err);
  }
}

export async function loadWishlistFromDb(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const ref = doc(db, WISHLISTS_COL, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data = snap.data();
    return (data.productIds || []) as string[];
  } catch {
    return [];
  }
}
