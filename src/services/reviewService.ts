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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Order,
  Product,
  ProductReview,
  SellerReview,
  ReviewStatus,
  UserRole,
} from '../types';
import { handleFirestoreError, OperationType, createAuditLog, updateProductInDb } from './dbService';
import { createNotification } from './notificationService';

export const REVIEWS_COL = 'reviews';
export const SELLER_REVIEWS_COL = 'seller_reviews';

// ---------------- REVIEW ELIGIBILITY CHECK ----------------

export interface ReviewEligibilityResult {
  isEligible: boolean;
  reason?: string;
  order?: Order;
  existingReview?: ProductReview | null;
}

export async function checkReviewEligibility(
  productId: string,
  customerId: string,
  orders: Order[]
): Promise<ReviewEligibilityResult> {
  if (!customerId) {
    return { isEligible: false, reason: 'You must be signed in to submit a review.' };
  }

  // 1. Check if user owns a delivered order containing this product
  const qualifyingOrder = orders.find((o) => {
    const isOwner = (o.customerId || o.userId) === customerId;
    const isDelivered =
      o.status === 'delivered' ||
      o.status === 'DELIVERED' ||
      o.orderStatus === 'delivered' ||
      o.orderStatus === 'DELIVERED';
    const hasProduct = o.items?.some((it) => it.productId === productId || (it as any).id === productId);
    return isOwner && isDelivered && hasProduct;
  });

  if (!qualifyingOrder) {
    return {
      isEligible: false,
      reason: 'Only verified buyers with a delivered order can submit a review for this craft.',
    };
  }

  // 2. Check if a review already exists
  try {
    const q = query(
      collection(db, REVIEWS_COL),
      where('productId', '==', productId),
      where('customerId', '==', customerId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const existing = { id: snap.docs[0].id, ...snap.docs[0].data() } as ProductReview;
      return {
        isEligible: true,
        order: qualifyingOrder,
        existingReview: existing,
        reason: 'You have already reviewed this product. You can update your existing review.',
      };
    }
  } catch (err) {
    console.warn('Check existing review warning:', err);
  }

  return { isEligible: true, order: qualifyingOrder, existingReview: null };
}

// ---------------- PRODUCT REVIEW CRUD ----------------

export async function submitProductReview(params: {
  productId: string;
  productTitle: string;
  productImage?: string;
  orderId: string;
  orderNumber?: string;
  sellerId: string;
  rating: number;
  title: string;
  comment: string;
  productQualityRating: number;
  packagingRating: number;
  deliveryRating: number;
  photos?: string[];
  actor: { id: string; name: string; email?: string; avatar?: string };
  existingReviewId?: string;
}): Promise<ProductReview> {
  const {
    productId,
    productTitle,
    productImage,
    orderId,
    orderNumber,
    sellerId,
    rating,
    title,
    comment,
    productQualityRating,
    packagingRating,
    deliveryRating,
    photos,
    actor,
    existingReviewId,
  } = params;

  // Fraud prevention: Seller cannot review their own product
  if (actor.id === sellerId) {
    throw new Error('Artisans are not permitted to submit self-reviews on their own craft listings.');
  }

  // Rating range validation
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5 stars.');
  }

  const reviewId = existingReviewId || `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const reviewDoc: ProductReview = {
    id: reviewId,
    productId,
    productTitle,
    productImage: productImage || '',
    orderId,
    orderNumber,
    customerId: actor.id,
    userId: actor.id,
    customerName: actor.name,
    userName: actor.name,
    customerAvatar: actor.avatar,
    sellerId,
    rating,
    title,
    comment,
    productQualityRating: productQualityRating || rating,
    packagingRating: packagingRating || rating,
    deliveryRating: deliveryRating || rating,
    photos: photos || [],
    verifiedPurchase: true,
    helpfulCount: 0,
    status: 'PUBLISHED', // Real published review
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = doc(db, REVIEWS_COL, reviewId);
    await setDoc(ref, reviewDoc, { merge: true });

    // Recalculate product average rating
    await recalculateProductRating(productId);

    // Audit log
    await createAuditLog({
      action: existingReviewId ? 'REVIEW_UPDATED' : 'REVIEW_SUBMITTED',
      actorId: actor.id,
      performedBy: actor.name,
      entityType: 'review',
      entityId: reviewId,
      targetType: 'product',
      targetId: productId,
      details: `Verified customer review (${rating}★) submitted for "${productTitle}".`,
      timestamp: now,
    });

    // Notify seller
    await createNotification({
      userId: sellerId,
      title: `New ${rating}★ Review Received`,
      message: `Customer "${actor.name}" reviewed "${productTitle}".`,
      type: 'review',
      read: false,
      targetTab: 'seller_portal',
      targetSubTab: 'reviews',
      targetId: reviewId,
    });

    return reviewDoc;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${REVIEWS_COL}/${reviewId}`);
    throw err;
  }
}

export async function fetchPublishedReviewsForProduct(productId: string): Promise<ProductReview[]> {
  try {
    const q = query(
      collection(db, REVIEWS_COL),
      where('productId', '==', productId)
    );
    const snap = await getDocs(q);
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ProductReview))
      .filter((r) => r.status === 'PUBLISHED' || !r.status);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, REVIEWS_COL);
    return [];
  }
}

export async function fetchCustomerReviews(customerId: string): Promise<ProductReview[]> {
  try {
    const q = query(
      collection(db, REVIEWS_COL),
      where('customerId', '==', customerId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductReview));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, REVIEWS_COL);
    return [];
  }
}

export async function fetchReviewsForSeller(sellerId: string): Promise<ProductReview[]> {
  try {
    const q = query(
      collection(db, REVIEWS_COL),
      where('sellerId', '==', sellerId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductReview));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, REVIEWS_COL);
    return [];
  }
}

export async function fetchAllReviewsForAdmin(): Promise<ProductReview[]> {
  try {
    const snap = await getDocs(collection(db, REVIEWS_COL));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductReview));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, REVIEWS_COL);
    return [];
  }
}

// ---------------- SELLER OFFICIAL RESPONSE ----------------

export async function addSellerResponse(params: {
  reviewId: string;
  sellerId: string;
  sellerName: string;
  storeName?: string;
  responseText: string;
}): Promise<void> {
  const { reviewId, sellerId, sellerName, storeName, responseText } = params;

  const ref = doc(db, REVIEWS_COL, reviewId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Review not found.');

  const review = snap.data() as ProductReview;
  if (review.sellerId !== sellerId) {
    throw new Error('Unauthorized: You can only respond to reviews of your own products.');
  }

  const now = new Date().toISOString();
  const sellerResponse = {
    text: responseText,
    respondedAt: now,
    respondedBy: sellerName,
    sellerStoreName: storeName || sellerName,
  };

  await updateDoc(ref, { sellerResponse, updatedAt: now });

  await createAuditLog({
    action: 'SELLER_REVIEW_RESPONSE',
    actorId: sellerId,
    performedBy: sellerName,
    entityType: 'review',
    entityId: reviewId,
    targetType: 'product',
    targetId: review.productId,
    details: `Seller responded to review on "${review.productTitle}".`,
    timestamp: now,
  });

  // Notify customer
  await createNotification({
    userId: review.customerId,
    title: 'Artisan Responded to Your Review',
    message: `${sellerName} replied to your review on "${review.productTitle}".`,
    type: 'review',
    read: false,
    targetTab: 'customer_profile',
    targetSubTab: 'orders',
    targetId: review.orderId,
  });
}

// ---------------- ADMIN REVIEW MODERATION ----------------

export async function moderateReview(params: {
  reviewId: string;
  newStatus: ReviewStatus;
  adminId: string;
  adminName: string;
  flagReason?: string;
}): Promise<void> {
  const { reviewId, newStatus, adminId, adminName, flagReason } = params;

  const ref = doc(db, REVIEWS_COL, reviewId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Review not found.');

  const review = snap.data() as ProductReview;
  const now = new Date().toISOString();

  await updateDoc(ref, {
    status: newStatus,
    flagReason: flagReason || review.flagReason || '',
    updatedAt: now,
  });

  // Recalculate product rating
  await recalculateProductRating(review.productId);

  await createAuditLog({
    action: `REVIEW_MODERATED_${newStatus}`,
    actorId: adminId,
    performedBy: adminName,
    actorRole: 'admin',
    entityType: 'review',
    entityId: reviewId,
    targetType: 'product',
    targetId: review.productId,
    details: `Admin changed review status to ${newStatus}.${flagReason ? ` Reason: ${flagReason}` : ''}`,
    timestamp: now,
  });
}

// ---------------- SELLER / STORE REVIEWS ----------------

export async function submitSellerReview(params: {
  sellerId: string;
  storeId?: string;
  storeName?: string;
  orderId: string;
  orderNumber?: string;
  communicationRating: number;
  productQualityRating: number;
  packagingRating: number;
  deliveryRating: number;
  overallRating: number;
  feedback: string;
  actor: { id: string; name: string };
}): Promise<SellerReview> {
  const {
    sellerId,
    storeId,
    storeName,
    orderId,
    orderNumber,
    communicationRating,
    productQualityRating,
    packagingRating,
    deliveryRating,
    overallRating,
    feedback,
    actor,
  } = params;

  if (actor.id === sellerId) {
    throw new Error('Sellers cannot review their own store.');
  }

  const reviewId = `srev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const sellerRevDoc: SellerReview = {
    id: reviewId,
    sellerId,
    storeId,
    storeName: storeName || 'Artisan Cooperative',
    orderId,
    orderNumber,
    customerId: actor.id,
    customerName: actor.name,
    communicationRating,
    productQualityRating,
    packagingRating,
    deliveryRating,
    overallRating,
    feedback,
    verifiedPurchase: true,
    createdAt: now,
  };

  try {
    const ref = doc(db, SELLER_REVIEWS_COL, reviewId);
    await setDoc(ref, sellerRevDoc);

    // Recalculate seller rating in store profile
    await recalculateSellerRating(sellerId);

    return sellerRevDoc;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${SELLER_REVIEWS_COL}/${reviewId}`);
    throw err;
  }
}

export async function fetchSellerReviews(sellerId: string): Promise<SellerReview[]> {
  try {
    const q = query(collection(db, SELLER_REVIEWS_COL), where('sellerId', '==', sellerId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SellerReview));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, SELLER_REVIEWS_COL);
    return [];
  }
}

// ---------------- RATING RECALCULATIONS ----------------

async function recalculateProductRating(productId: string): Promise<void> {
  try {
    const reviews = await fetchPublishedReviewsForProduct(productId);
    if (reviews.length === 0) return;

    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = Number((total / reviews.length).toFixed(1));

    await updateProductInDb(productId, {
      rating: avg,
      reviewsCount: reviews.length,
    } as any);
  } catch (err) {
    console.warn('Recalculate product rating warning:', err);
  }
}

async function recalculateSellerRating(sellerId: string): Promise<void> {
  try {
    const reviews = await fetchSellerReviews(sellerId);
    if (reviews.length === 0) return;

    const total = reviews.reduce((sum, r) => sum + r.overallRating, 0);
    const avg = Number((total / reviews.length).toFixed(1));

    const storeRef = doc(db, 'stores', `store-${sellerId}`);
    await updateDoc(storeRef, {
      rating: avg,
      reviewsCount: reviews.length,
    }).catch(() => {});
  } catch (err) {
    console.warn('Recalculate seller rating warning:', err);
  }
}
