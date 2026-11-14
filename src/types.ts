export type UserRole = 'customer' | 'seller' | 'admin' | 'moderator' | 'super_admin';

export type AdminPermission =
  | 'FULL_ACCESS'
  | 'PRODUCT_MANAGEMENT'
  | 'ORDER_MANAGEMENT'
  | 'SELLER_MANAGEMENT'
  | 'ECO_VERIFICATION'
  | 'CUSTOMER_SUPPORT'
  | 'COURIER_MANAGEMENT'
  | 'REVIEW_MODERATION'
  | 'FINANCE_MANAGEMENT'
  | 'CONTENT_MANAGEMENT'
  | 'SECURITY_MANAGEMENT'
  | 'view_users'
  | 'manage_users'
  | 'view_sellers'
  | 'approve_sellers'
  | 'suspend_sellers'
  | 'view_products'
  | 'manage_products'
  | 'approve_products'
  | 'manage_eco_verification'
  | 'view_orders'
  | 'manage_orders'
  | 'manage_returns'
  | 'manage_refunds'
  | 'view_payments'
  | 'manage_payments'
  | 'view_finance'
  | 'manage_settlements'
  | 'manage_couriers'
  | 'manage_categories'
  | 'manage_districts'
  | 'manage_settings'
  | 'view_analytics'
  | 'manage_admins'
  | 'view_audit_logs';

export type EcoStatus = 
  | 'eco_verified' 
  | 'under_review' 
  | 'eco_verification'
  | 'pending_review'
  | 'pending' 
  | 'draft' 
  | 'approved'
  | 'published'
  | 'unpublished'
  | 'changes_required'
  | 'active'
  | 'inactive'
  | 'flagged' 
  | 'rejected' 
  | 'suspended' 
  | 'out_of_stock' 
  | 'archived';

export type ProductLifecycleStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'unpublished'
  | 'suspended'
  | 'archived';

export type EcoType = 'Handmade' | 'Organic' | 'Recycled' | 'Biodegradable' | 'Upcycled' | 'Plastic-Free' | 'Reusable';

export type SellerStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'banned';

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'packed'
  | 'ready_for_shipment' 
  | 'shipped' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'cancel_requested'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'refund_pending'
  | 'refunded'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_SHIPMENT'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface SubOrder {
  id: string;
  parentOrderId: string;
  sellerId: string;
  sellerName: string;
  storeId?: string;
  storeName?: string;
  customerId: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  deliveryCharge?: number;
  shippingFee?: number;
  total: number;
  totalAmount?: number;
  status: OrderStatus;
  shippingAddress: UserAddress;
  trackingCode?: string;
  courierNotes?: string;
  cancellationReason?: string;
  cancellationNotes?: string;
  cancelledBy?: string;
  cancelledByRole?: 'customer' | 'seller' | 'admin' | 'system';
  cancelledAt?: string;
  previousOrderStatus?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // e.g. 10 for 10% or 150 for ৳150
  minOrderAmount: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  applicableCategories?: string[];
  applicableSellers?: string[];
  active: boolean;
  description?: string;
  createdAt?: string;
}

export interface DeliverySetting {
  id: string;
  defaultCourierId?: CourierProviderId;
  defaultInsideDhaka: number;
  defaultOutsideDhaka: number;
  freeDeliveryThreshold: number;
  insideDhakaBaseRate?: number;
  outsideDhakaBaseRate?: number;
  interDistrictBaseRate?: number;
  weightRatePerKg?: number;
  expressDeliverySurcharge: number;
  ecoPackagingDiscount?: number;
  estimatedDaysInsideDhaka?: string;
  estimatedDaysOutsideDhaka?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CartValidationItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  sellerId: string;
  sellerName: string;
  storeName: string;
  availableStock: number;
  isValid: boolean;
  error?: string;
}

export interface CartValidationResult {
  isValid: boolean;
  errors: string[];
  items: CartValidationItem[];
  subtotal: number;
  discountAmount: number;
  appliedCoupon?: Coupon | null;
  deliveryFee: number;
  finalTotal: number;
  isFreeDelivery: boolean;
  itemsBySeller: Record<string, {
    sellerId: string;
    sellerName: string;
    storeName: string;
    items: CartValidationItem[];
    subtotal: number;
  }>;
}

export interface SellerPlan {
  id: string;
  name: string;
  description?: string;
  registrationFee?: number;
  subscriptionFee?: number;
  price: number; // base / initial fee
  duration: 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
  billingPeriod?: string;
  productLimit: number;
  maxProducts?: number;
  maxStorageMb?: number;
  maxImagesPerProduct: number;
  commissionRate: number; // percentage (e.g. 10 for 10%)
  featuredStoreEligible?: boolean;
  analyticsAccess?: 'basic' | 'advanced' | 'enterprise' | boolean;
  promotionalTools?: boolean;
  prioritySupport?: boolean;
  requiresRenewal?: boolean;
  features: string[];
  isPopular?: boolean;
  active: boolean;
  status?: 'active' | 'inactive' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface CommissionSetting {
  id: string;
  defaultCommissionRate: number;
  categoryRates?: Record<string, number>;
  sellerOverrides?: Record<string, number>;
  minPayoutThreshold: number;
  payoutCycleDays: number;
  earningReleaseDays?: number; // e.g. 7 days post delivery
  instantReleaseForVerified?: boolean;
  vatRate?: number;
  platformServiceFee?: number;
  codFeeRate?: number;
  courierFeeDeduction?: number;
  updatedAt: string;
  updatedBy?: string;
}

export type StoreStatus =
  | 'active'
  | 'vacation'
  | 'temporarily_closed'
  | 'maintenance'
  | 'suspended'
  | 'pending'
  | 'closed'
  | 'inactive';

export interface StorePolicy {
  shipping?: string;
  returns?: string;
  sustainability?: string;
  shippingPolicy?: string;
  returnPolicy?: string;
  privacyPolicy?: string;
  privacy?: string;
  sustainabilityStatement?: string;
  ecoPackagingCommitment?: string;
}

export interface StoreSocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
}

export interface StoreEcoVerification {
  status: 'verified' | 'pending' | 'unverified';
  category?: string;
  verifiedDate?: string;
  certificationNumber?: string;
  issuingAuthority?: string;
}

export interface Store {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  description: string;
  tagline?: string;
  category?: string;
  ownerName?: string;
  logo: string;
  banner: string;
  logoUrl?: string;
  bannerUrl?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  district: string;
  division: string;
  businessAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  rating: number;
  reviewsCount: number;
  ecoVerified: boolean;
  ecoVerification?: StoreEcoVerification;
  totalSales?: number;
  productCount?: number;
  followersCount?: number;
  businessHours?: string;
  policies?: StorePolicy;
  socialLinks?: StoreSocialLinks;
  status: StoreStatus;
  statusMessage?: string;
  allowOrdersWhileUnavailable?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  options: string[];
  priceAdjustments?: Record<string, number>;
}

export interface Product {
  id: string;
  title: string;
  shortDescription?: string;
  sku: string;
  price: number;
  discount?: number; // discount percentage (e.g. 10 for 10% off)
  category: string;
  subcategory?: string;
  division: string;
  district: string;
  status: EcoStatus;
  lifecycleStatus?: ProductLifecycleStatus;
  ecoTypes: EcoType[];
  sellerId?: string;
  storeId?: string;
  sellerName: string;
  sellerVerified: boolean;
  sellerRating?: number;
  ecoVerified?: boolean;
  rating: number;
  reviewsCount: number;
  reviews?: ProductReview[];
  description: string;
  images: string[];
  videoThumbnail?: string;
  videoUrl?: string;
  
  // Eco Information & Production
  isHandmade?: boolean;
  isReusable?: boolean;
  isRecyclable?: boolean;
  isBiodegradable?: boolean;
  isPlasticFree?: boolean;
  materialsUsed?: string;
  packagingType?: string;
  plasticPercentage?: number;
  productionMethod?: string;
  ecoDescription?: string;

  // Heritage & Origin Details
  originInfo: string;
  materialsInfo: string;
  endOfLifeInfo: string;
  manufacturingProcess: string;
  materialComposition: string;
  claims: EcoClaim[];
  certifications: CertificationDoc[];

  // Inventory & Logistics
  stock: number;
  reservedStock?: number;
  availableStock?: number;
  lowStockThreshold?: number;
  weight?: string; // e.g. "450g" or "1.2kg"
  dimensions?: string; // e.g. "30 x 20 x 15 cm"
  tags?: string[];
  variants?: ProductVariant[];
  featured?: boolean;
  isFeatured?: boolean;
  bentoFeatured?: boolean;
  slug?: string;
  categoryId?: string;
  districtId?: string;
  ecoScore?: number;
  compareAtPrice?: number;
  salesCount?: number;
  viewCount?: number;
  rejectionReason?: string;
  reviewerNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  scheduledPublishAt?: string;
  scheduledUnpublishAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ActiveTab = 
  | 'home' 
  | 'products'
  | 'all_products'
  | 'districts' 
  | 'search_results'
  | 'product_detail' 
  | 'category_page'
  | 'seller_portal' 
  | 'admin'
  | 'admin_login'
  | 'forbidden'
  | 'eco_education' 
  | 'new_arrivals'
  | 'categories'
  | 'featured'
  | 'store'
  | 'store_view'
  | 'become_seller'
  | 'customer_profile'
  | 'not_found';

export type CustomerProfileTab = 
  | 'overview' 
  | 'orders' 
  | 'returns'
  | 'wishlist' 
  | 'addresses' 
  | 'reviews'
  | 'messages' 
  | 'support'
  | 'notifications' 
  | 'rewards' 
  | 'settings';

export type SellerPortalTab = 
  | 'overview' 
  | 'dashboard'
  | 'onboarding'
  | 'products' 
  | 'orders' 
  | 'shipping'
  | 'tracking'
  | 'returns'
  | 'refunds'
  | 'inventory' 
  | 'eco_verification' 
  | 'messages' 
  | 'reviews' 
  | 'support'
  | 'earnings' 
  | 'settlements'
  | 'withdrawals'
  | 'notifications'
  | 'ledger'
  | 'subscription'
  | 'plans'
  | 'performance'
  | 'promotions'
  | 'analytics' 
  | 'settings'
  | 'profile';

export type AdminNavTab =
  | 'dashboard'
  | 'analytics'
  | 'alerts'
  | 'users'
  | 'customers'
  | 'sellers'
  | 'seller_verification'
  | 'seller_plans'
  | 'commission'
  | 'settlements'
  | 'withdrawals'
  | 'finance_ledger'
  | 'seller_performance'
  | 'stores'
  | 'products'
  | 'eco_verification'
  | 'orders'
  | 'payments'
  | 'courier'
  | 'returns'
  | 'refunds'
  | 'disputes'
  | 'reviews'
  | 'messages'
  | 'support'
  | 'categories'
  | 'districts'
  | 'coupons'
  | 'promotions'
  | 'homepage'
  | 'cms'
  | 'notifications'
  | 'announcements'
  | 'staff'
  | 'reports'
  | 'security'
  | 'audit_logs'
  | 'deduplication'
  | 'settings';

export interface UserAddress {
  id: string;
  userId?: string;
  fullName: string;
  phone: string;
  division: string;
  district: string;
  upazila?: string;
  area?: string;
  streetAddress?: string;
  postalCode?: string;
  additionalInstructions?: string;
  label?: 'Home' | 'Work' | 'Other' | string;
  isDefault?: boolean;
  address?: string; // fallback legacy string
  street?: string; // fallback
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  displayName?: string;
  role: UserRole;
  phone?: string;
  phoneNumber?: string;
  photoURL?: string;
  ecoPoints?: number;
  addresses?: UserAddress[];
  defaultAddress?: UserAddress;
  wishlist?: string[];
  sellerProfile?: SellerProfile;
  customerProfile?: Record<string, any>;

  permissions?: AdminPermission[];
  isSuspended?: boolean;
  suspensionReason?: string;
  isBanned?: boolean;
  status?: 'active' | 'suspended' | 'banned' | 'pending';
  totalOrdersCount?: number;
  totalSpent?: number;
  division?: string;
  district?: string;
  upazila?: string;
  streetAddress?: string;
  postalCode?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  deletionRequested?: boolean;
  deletionRequestedAt?: string;
  deletionReason?: string;
  lastLoginAt?: string;
  updatedAt?: string;
  createdAt: string;
}

export interface SellerProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  storeName: string;
  shopName?: string;
  storeDescription: string;
  division: string;
  district: string;
  businessAddress: string;
  categories: string[];
  ecoProductInfo: string;
  businessInfo?: string;
  nidOrTradeLicense?: string;
  documents?: { name: string; url: string; type: string }[];
  planId?: string;
  commissionRate?: number;
  settlementInfo?: {
    method: 'bank_transfer' | 'bkash' | 'nagad';
    bankName?: string;
    branchName?: string;
    routingNumber?: string;
    accountHolderName?: string;
    accountNumber: string;
  };
  deliveryInfo?: {
    pickupAddress: string;
    pickupDivision: string;
    pickupDistrict: string;
    preferredCourier?: string;
    dispatchTimeframe?: string;
  };
  termsAgreed?: boolean;
  termsAgreedAt?: string;
  businessHours?: string;
  badges?: string[];
  status: SellerStatus;
  rejectionReason?: string;
  rating?: number;
  createdAt: string;
  updatedAt?: string;
}

export type SellerApplication = SellerProfile;

export interface EcoClaim {
  title: string;
  description: string;
  verified?: boolean;
}

export interface CertificationDoc {
  name: string;
  size: string;
  type?: string;
  url?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'active' | 'inactive';
}

export type CategoryStatus = 'ACTIVE' | 'INACTIVE' | 'active' | 'inactive';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  banner?: string;
  status: CategoryStatus;
  displayOrder: number;
  subcategories?: (SubCategory | string)[];
  productCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DistrictInfo {
  id: string;
  name: string;
  bnName?: string;
  division: string;
  specialty: string;
  heroImage: string;
  description: string;
  artisanCount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  title: string;
  productNameSnapshot?: string;
  price: number;
  priceSnapshot?: number;
  quantity: number;
  image: string;
  sellerId?: string;
  sellerName?: string;
  storeId?: string;
  storeName?: string;
  sellerSnapshot?: {
    sellerId: string;
    sellerName: string;
    storeName?: string;
    district?: string;
  };
  categorySnapshot?: string;
  district?: string;
  sku?: string;
  ecoTypes?: EcoType[];
}

export interface Order {
  id: string;
  orderNumber?: string;
  userId?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  shippingAddress: UserAddress;
  shippingAddressSnapshot?: UserAddress;
  items: OrderItem[];
  subOrders?: SubOrder[];
  subtotal: number;
  discount?: number;
  discountAmount?: number;
  discountCode?: string;
  couponCode?: string;
  couponDiscount?: number;
  shippingFee: number;
  deliveryFee?: number;
  deliveryMethod?: 'standard' | 'express';
  deliveryInstructions?: string;
  currency?: string;
  total: number;
  totalAmount?: number;
  finalTotal: number;
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'cod' | 'bank_transfer' | 'card' | any;
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string;
  status: OrderStatus;
  orderStatus: OrderStatus;
  deliveryStatus?: string;
  courierName?: string;
  trackingNumber?: string;
  trackingCode?: string;
  trackingUrl?: string;
  courierTracking?: string;
  sellerIds: string[];
  district?: string;
  division?: string;
  cancellationReason?: string;
  cancellationNotes?: string;
  cancelledBy?: string;
  cancelledByRole?: string;
  cancelledAt?: string;
  previousOrderStatus?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentStatus = 
  | 'INITIATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'paid'
  | 'pending'
  | 'failed'
  | 'refunded';

export type PaymentMethod = 
  | 'bkash' 
  | 'nagad' 
  | 'rocket' 
  | 'upay'
  | 'card' 
  | 'bank_transfer' 
  | 'cod';

export type PaymentProviderType = 
  | 'bkash_direct'
  | 'nagad_direct'
  | 'rocket_direct'
  | 'upay_direct'
  | 'sslcommerz'
  | 'aamarpay'
  | 'shurjopay'
  | 'cod_native';

export interface PaymentProviderConfig {
  id: string; // 'bkash' | 'nagad' | 'rocket' | 'sslcommerz' | 'cod'
  name: string;
  providerType: PaymentProviderType;
  enabled: boolean;
  testMode: boolean;
  merchantNumber?: string;
  merchantName?: string;
  supportedMethods: PaymentMethod[];
  minOrderAmount: number;
  maxOrderAmount: number;
  instructions?: string;
  hasCredentials?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SellerOrderEarningsBreakdown {
  sellerId: string;
  sellerName: string;
  subOrderId: string;
  grossAmount: number;
  discount: number;
  platformCommission: number;
  commissionRate: number;
  netEarnings: number;
}

export interface WebhookLogEntry {
  id: string;
  provider: string;
  event: string;
  transactionId?: string;
  signatureVerified: boolean;
  status: 'received' | 'processed' | 'rejected' | 'duplicate' | 'PENDING' | 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REQUESTED' | 'REFUNDED' | string;
  rawPayloadSummary?: string;
  errorMessage?: string;
  timestamp: string;
}

export interface PaymentRecord {
  id: string; // Payment ID
  orderId: string;
  orderNumber?: string;
  customerId: string;
  userId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  provider: string; // 'bkash' | 'nagad' | 'rocket' | 'sslcommerz' | 'cod'
  paymentMethod: PaymentMethod;
  transactionId?: string;
  amount: number;
  currency: 'BDT';
  status: PaymentStatus;
  gatewayReference?: string;
  gatewayRedirectUrl?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failureReason?: string;
  isTestPayment?: boolean;
  commissionTotal?: number;
  sellerBreakdowns?: SellerOrderEarningsBreakdown[];
  webhookLogs?: WebhookLogEntry[];
}

export type Payment = PaymentRecord;

export interface CodSetting {
  id: string;
  enabled: boolean;
  codFee: number; // e.g. ৳0 or ৳20
  minOrderAmount: number;
  maxOrderAmount: number;
  allowedDistricts: string[]; // empty array = all 64 districts
  allowedCategories: string[]; // empty array = all categories
  allowedSellers: string[]; // empty array = all sellers
  riskThreshold: number; // e.g. 50 (any score >= 50 is blocked from COD)
  updatedAt?: string;
}

export interface CodRiskRecord {
  id?: string;
  userId: string;
  userPhone: string;
  userEmail?: string;
  totalOrders: number;
  codOrdersCount: number;
  codCancellationsCount: number;
  failedDeliveriesCount: number;
  returnToOriginCount: number;
  riskScore: number; // 0 to 100
  flaggedByAdmin: boolean;
  flagReason?: string;
  updatedAt: string;
}

export type RefundStatus = 
  | 'REQUESTED'
  | 'APPROVED'
  | 'PROCESSING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FAILED'
  | 'REJECTED'
  | 'COMPLETED';

export type RefundMethodType =
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'card'
  | 'bank'
  | 'wallet'
  | 'cod_refund'
  | 'original_gateway'
  | 'store_credit';

export interface RefundRecord {
  id: string;
  orderId: string;
  orderNumber?: string;
  orderItemId?: string;
  returnRequestId?: string;
  paymentId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  sellerId?: string;
  sellerName?: string;
  amount: number;
  currency: 'BDT';
  refundMethod: RefundMethodType;
  accountDetails?: {
    channel: string;
    accountNumber?: string;
    bankName?: string;
    branchName?: string;
    accountHolder?: string;
  };
  reason: string;
  status: RefundStatus;
  provider: string; // 'bkash' | 'nagad' | 'rocket' | 'sslcommerz' | 'cod' | 'wallet' | 'card'
  transactionId?: string;
  gatewayRefundRef?: string;
  providerReference?: string;
  adminNotes?: string;
  requestedBy: string;
  processedBy?: string;
  completedBy?: string;
  createdAt: string;
  createdDate?: string;
  processedAt?: string;
  processedDate?: string;
  completedAt?: string;
  failureReason?: string;
  verified?: boolean;
}

export interface RefundLog {
  id: string;
  refundId: string;
  orderId: string;
  orderNumber?: string;
  returnRequestId?: string;
  customerId: string;
  sellerId?: string;
  amount: number;
  currency: 'BDT';
  method: string;
  previousStatus?: string;
  newStatus: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  transactionId?: string;
  gatewayRefundRef?: string;
  notes?: string;
  verified: boolean;
  timestamp: string;
}

export interface ReturnShipment {
  id: string;
  returnRequestId: string;
  orderId: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  sellerId: string;
  sellerName?: string;
  courier: 'pathao' | 'redx' | 'steadfast' | 'paperfly' | 'ecourier' | 'sunno_eco';
  courierName: string;
  trackingNumber: string;
  consignmentId?: string;
  status: 'PICKUP_REQUESTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'RECEIVED' | 'FAILED' | 'RETURNED_TO_CUSTOMER';
  pickupScheduledDate: string;
  pickupAddress?: any;
  destinationAddress?: any;
  packageWeightKg?: number;
  pickupScaleWeightKg?: number;
  weightDiscrepancy?: boolean;
  timeline: Array<{
    status: string;
    title: string;
    description: string;
    timestamp: string;
    location?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export type ReturnEligibilityStatus = 'Eligible' | 'Not Eligible' | 'Return Window Expired';

// ---------------- RETURN SYSTEM (PHASE 7 & PHASE 17) ----------------

export type ReturnStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKUP_REQUESTED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'INSPECTION'
  | 'REFUND_PROCESSING'
  | 'APPROVED_FOR_REFUND'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'EXCHANGE_PENDING'
  | 'EXCHANGED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'CLOSED'
  // Backwards compatibility aliases
  | 'RETURN_REQUESTED'
  | 'RECEIVED_BY_SELLER'
  | 'COMPLETED';

export type ReturnReason =
  | 'Damaged item'
  | 'Wrong item'
  | 'Missing item'
  | 'Defective item'
  | 'Product not as described'
  | 'Quality issue'
  | 'Size/variation issue'
  | 'Customer remorse'
  | 'Other'
  // Backwards compatibility aliases
  | 'Damaged Product'
  | 'Wrong Product'
  | 'Defective Product';

export type ReturnResolutionType = 'REFUND' | 'EXCHANGE';
export type ReturnType = 'FULL' | 'PARTIAL_ITEM';
export type FaultAttribution =
  | 'CUSTOMER_FAULT'
  | 'SELLER_FAULT'
  | 'COURIER_FAULT'
  | 'PRODUCT_DEFECT'
  | 'UNDETERMINED'
  | 'CUSTOMER_MISUSE'
  | 'TRANSIT_DAMAGE';
export type ReturnShippingResponsibility = 'SELLER' | 'CUSTOMER' | 'PLATFORM';

export interface ReturnStatusLog {
  id?: string;
  returnId?: string;
  status: ReturnStatus;
  previousStatus?: ReturnStatus;
  newStatus?: ReturnStatus;
  title: string;
  note?: string;
  description?: string;
  location?: string;
  timestamp: string;
  actorId?: string;
  actorRole: UserRole | 'system';
  actorName: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  subOrderId?: string;
  productId: string;
  productTitle: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  refundAmount: number;
  sellerId: string;
  sellerName: string;
  storeName?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnReason: ReturnReason | string;
  description: string;
  evidencePhotos: string[];
  evidenceVideos?: string[];
  requestedResolution?: ReturnResolutionType;
  returnType?: ReturnType;
  customerComments?: string;
  requestedDate: string;
  status: ReturnStatus;
  statusHistory: ReturnStatusLog[];
  sellerNotes?: string;
  adminNotes?: string;
  courierTracking?: string;
  courierName?: string;
  pickupScheduledDate?: string;
  refundId?: string;
  paymentMethod?: string;
  refundMethod?: string;
  refundAccountDetails?: {
    channel: 'original_gateway' | 'bkash' | 'nagad' | 'rocket' | 'bank';
    accountNumber?: string;
    bankName?: string;
    branchName?: string;
    accountHolder?: string;
  };
  pickupAddress?: UserAddress;
  returnPickupAddress?: UserAddress;
  returnShippingFee?: number;
  returnShippingPayer?: ReturnShippingResponsibility;
  reverseCourier?: string;
  reverseCourierTracking?: string;
  reverseCourierStatus?: string;
  inspectionStatus?: 'PENDING' | 'PASSED' | 'FAILED_CUSTOMER_DAMAGE' | 'WRONG_ITEM_RETURNED' | 'ACCEPTABLE_CONDITION';
  inspectionNotes?: string;
  inspectedAt?: string;
  inspectedBy?: string;
  faultAttribution?: FaultAttribution;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnPolicySetting {
  id: string;
  returnWindowDays: number; // e.g. 7 days
  eligibleCategories: string[];
  excludedCategories: string[];
  returnReasons: string[];
  sellerReturnPolicy: string;
  customerConditions: string[];
  returnShippingRules: string;
  autoApproveDamaged: boolean;
  requireInspectionBeforeRefund: boolean;
  nonReturnableProductIds?: string[];
  damagedProductRules?: string;
  wrongProductRules?: string;
  missingItemRules?: string;
  defectiveProductRules?: string;
  remorseRules?: string;
  returnShippingResponsibility?: ReturnShippingResponsibility;
  categoryRules?: Record<string, { returnWindowDays: number; isReturnable: boolean; notes?: string }>;
  sellerRules?: Record<string, { returnWindowDays: number; isReturnable: boolean; autoApprove?: boolean }>;
  refundEligibilityRules?: string;
  exchangeEligibilityRules?: string;
  partialRefundRules?: string;
  updatedAt: string;
  updatedBy?: string;
}

// ---------------- DISPUTES (PHASE 17) ----------------

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'WAITING_FOR_CUSTOMER'
  | 'WAITING_FOR_SELLER'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export type DisputePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type DisputeReason =
  | 'SELLER_UNRESPONSIVE'
  | 'REJECTED_UNFAIRLY'
  | 'REFUND_DELAYED'
  | 'ITEM_DIFFERENT_THAN_RETURNED'
  | 'DAMAGED_IN_TRANSIT'
  | 'OTHER';

export type DisputeResolutionOffer =
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND'
  | 'REPLACEMENT'
  | 'REJECT_CLAIM'
  | 'MUTUAL_AGREEMENT';

export type DisputeResolutionDecision = DisputeResolutionOffer;

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'seller' | 'admin' | 'system';
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface DisputeRecord {
  id: string;
  disputeId?: string;
  returnId: string;
  orderId: string;
  orderNumber: string;
  subOrderId?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  sellerId: string;
  sellerName: string;
  reason: string;
  description: string;
  evidence: string[];
  disputedAmount?: number;
  status: DisputeStatus;
  priority: DisputePriority;
  assignedAdminId?: string;
  assignedAdminName?: string;
  resolution?: {
    type: 'APPROVE_REFUND' | 'APPROVE_PARTIAL_REFUND' | 'REJECT_CLAIM' | 'APPROVE_EXCHANGE' | 'MUTUAL_AGREEMENT';
    refundAmount?: number;
    notes: string;
    resolvedBy: string;
    resolvedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type Dispute = DisputeRecord;

// ---------------- CUSTOMER & SELLER PROTECTION (PHASE 17) ----------------

export interface CustomerRiskProfile {
  userId: string;
  customerName: string;
  customerEmail?: string;
  riskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH' | 'RESTRICTED';
  totalOrders: number;
  totalReturns: number;
  totalDisputes: number;
  totalRefundAmount: number;
  returnRate: number; // percentage
  codRejectionRate?: number;
  disputeRate?: number;
  suspiciousFlags: string[];
  adminNotes?: string;
  manualReviewRequired: boolean;
  updatedAt: string;
}

export interface SellerProtectionRecord {
  id: string;
  returnId: string;
  orderId: string;
  sellerId: string;
  sellerName: string;
  sellerStoreName?: string;
  customerId: string;
  faultAttribution: FaultAttribution;
  claimStatus: 'SUBMITTED' | 'UNDER_INVESTIGATION' | 'APPROVED_COMPENSATION' | 'APPROVED' | 'REJECTED';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  compensationAmount?: number;
  claimedAmount?: number;
  approvedAmount?: number;
  claimReason?: string;
  inspectionEvidence: string[];
  evidencePhotos?: string[];
  explanation?: string;
  adminDecisionNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

// ---------------- REVIEWS & RATINGS (PHASE 7) ----------------

export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'FLAGGED' | 'REMOVED';

export interface ProductReview {
  id: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  orderId: string;
  orderNumber?: string;
  customerId: string;
  userId?: string;
  customerName: string;
  userName?: string;
  customerAvatar?: string;
  sellerId: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  productQualityRating: number; // 1-5
  packagingRating: number; // 1-5
  deliveryRating: number; // 1-5
  photos: string[];
  verifiedPurchase: boolean;
  isVerifiedPurchase?: boolean;
  helpfulCount: number;
  status: ReviewStatus;
  flagged?: boolean;
  isModerated?: boolean;
  flagReason?: string;
  sellerResponse?: {
    text: string;
    respondedAt: string;
    respondedBy: string;
    sellerStoreName?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export type Review = ProductReview;
export type ReturnRecord = ReturnRequest;

export interface SellerReview {
  id: string;
  sellerId: string;
  storeId?: string;
  storeName?: string;
  orderId: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  communicationRating: number; // 1-5
  productQualityRating: number; // 1-5
  packagingRating: number; // 1-5
  deliveryRating: number; // 1-5
  overallRating: number; // 1-5
  feedback: string;
  verifiedPurchase: boolean;
  createdAt: string;
  sellerResponse?: {
    text: string;
    respondedAt: string;
    respondedBy: string;
  };
}

// ---------------- MESSAGING & CONVERSATIONS (PHASE 7) ----------------

export interface Conversation {
  id: string;
  participants: string[]; // [customerId, sellerId]
  customerId: string;
  customerName: string;
  sellerId: string;
  sellerName: string;
  storeName?: string;
  productId?: string;
  productTitle?: string;
  productImage?: string;
  orderId?: string;
  orderNumber?: string;
  lastMessageText: string;
  lastMessageTime: string;
  unreadCountCustomer: number;
  unreadCountSeller: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  text: string;
  attachments?: { url: string; name: string; type: string }[];
  productRef?: { id: string; title: string; price: number; image: string };
  orderRef?: { id: string; orderNumber: string; total: number; status: string };
  isRead: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole | string;
  recipientId?: string;
  recipientName?: string;
  receiverId?: string;
  receiverName?: string;
  subject?: string;
  storeId?: string;
  productId?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  text: string;
  isRead?: boolean;
  read?: boolean;
  timestamp: string;
  createdAt?: string;
}

// ---------------- SUPPORT TICKETS (PHASE 7) ----------------

export type SupportTicketCategory =
  | 'Order Problem'
  | 'Payment Problem'
  | 'Delivery Problem'
  | 'Return/Refund'
  | 'Product Problem'
  | 'Seller Problem'
  | 'Account Problem'
  | 'Eco Verification'
  | 'Courier Issues'
  | 'Other';

export type SupportTicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'WAITING_FOR_SELLER'
  | 'RESOLVED'
  | 'CLOSED';

export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportTicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  attachments?: string[];
  isInternalNote?: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string; // e.g. SUN-TKT-1089
  creatorId: string;
  creatorName: string;
  creatorEmail?: string;
  creatorPhone?: string;
  creatorRole: UserRole;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  orderId?: string;
  orderNumber?: string;
  sellerId?: string;
  assignedAdminId?: string;
  assignedAdminName?: string;
  initialMessage: string;
  attachments?: string[];
  messages: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// ---------------- NOTIFICATIONS (PHASE 7) ----------------

export type NotificationType =
  | 'order'
  | 'payment'
  | 'delivery'
  | 'return'
  | 'refund'
  | 'dispute'
  | 'finance'
  | 'withdrawal'
  | 'review'
  | 'message'
  | 'seller'
  | 'eco_verif'
  | 'account'
  | 'promotion'
  | 'support'
  | 'seller_status'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  targetTab?: ActiveTab;
  targetSubTab?: string;
  targetId?: string;
  link?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  createdAt?: string;
}

export type AppNotification = Notification;

export interface AuditLog {
  id?: string;
  action: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: UserRole;
  userName?: string;
  userId?: string;
  userEmail?: string;
  adminEmail?: string;
  ipAddress?: string;
  targetType?: 'seller' | 'product' | 'order' | 'user' | 'store' | string;
  targetId?: string;
  resourceType?: string;
  resourceId?: string;
  details?: string;
  performedBy?: string;
  entityType?: string;
  entityId?: string;
  timestamp?: string;
  createdAt?: string;
}

// ---------------- COURIER & DELIVERY TYPES (PHASE 6) ----------------

export type CourierProviderId = 
  | 'pathao'
  | 'steadfast'
  | 'redx'
  | 'paperfly'
  | 'ecourier'
  | 'sunno_eco';

export type CourierServiceType = 'standard' | 'express' | 'same_day';

export type EcoPackagingType = 
  | 'jute_sack'
  | 'banana_fiber_wrap'
  | 'recycled_kraft_box'
  | 'hemp_twine_bundle'
  | 'compostable_pouch'
  | 'JUTE_BAG'
  | 'KRAFT_BOX'
  | 'BANANA_FIBER'
  | 'BIODEGRADABLE_POUCH'
  | string;

export interface PackageInfo {
  weight: number; // in kg (e.g. 0.5)
  length?: number; // in cm
  width?: number; // in cm
  height?: number; // in cm
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  numberOfItems?: number;
  itemCount?: number;
  packageType?: 'box' | 'bag' | 'envelope' | 'pallet' | string;
  ecoPackagingType: EcoPackagingType;
  isFragile?: boolean;
  specialInstructions?: string;
}

export type ShipmentStatus = 
  | 'PENDING'
  | 'READY_FOR_SHIPMENT'
  | 'PICKUP_REQUESTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'RTO_REQUESTED'
  | 'RTO_IN_TRANSIT'
  | 'RTO_DELIVERED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_IN_TRANSIT'
  | 'RETURNED'
  | 'CANCELLED';

export interface ShipmentLog {
  id?: string;
  status: ShipmentStatus;
  title: string;
  description: string;
  location?: string;
  timestamp: string;
  updatedBy?: string;
  note?: string;
}

export interface Shipment {
  id: string; // e.g. SHIP-89210
  orderId: string;
  orderNumber: string;
  subOrderId: string;
  sellerId: string;
  sellerName: string;
  storeName?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  courierId: CourierProviderId;
  courierName: string;
  consignmentId?: string;
  trackingNumber: string; // e.g. TRK-STF-90218
  trackingUrl?: string;
  serviceType: CourierServiceType;
  packageInfo: PackageInfo;
  status: ShipmentStatus;
  statusLogs: ShipmentLog[];
  codAmount: number;
  collectedAmount?: number;
  collectionStatus: 'pending' | 'collected' | 'remitted' | 'failed';
  deliveryFee: number;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  pickupAddress: UserAddress | {
    fullName: string;
    phone: string;
    division: string;
    district: string;
    upazila?: string;
    streetAddress: string;
  };
  deliveryAddress: UserAddress;
  deliveryInstructions?: string;
  failureReason?: string;
  returnReason?: string;
  rawCourierResponse?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CourierProviderConfig {
  id: CourierProviderId;
  name: string;
  slug: string;
  logoUrl: string;
  enabled: boolean;
  testMode: boolean;
  hasCredentials: boolean;
  supportedZones: string[]; // ['inside_dhaka', 'outside_dhaka', 'all_64_districts']
  supportedServiceTypes: CourierServiceType[];
  codSupported: boolean;
  trackingSupported: boolean;
  returnSupported: boolean;
  baseRateInside: number; // e.g. 60
  baseRateOutside: number; // e.g. 120
  weightRatePerKg: number; // e.g. 20
  codFeePercent: number; // e.g. 1%
  estimatedDaysInside: string; // e.g. '1-2 Days'
  estimatedDaysOutside: string; // e.g. '3-5 Days'
  apiDocsUrl?: string;
  instructions?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DeliveryRateOption {
  courierId: CourierProviderId;
  courierName: string;
  logoUrl?: string;
  serviceType: CourierServiceType;
  charge: number;
  estimatedDeliveryDays: string;
  isFreeDelivery: boolean;
  freeDeliveryReason?: string;
  codFee: number;
  totalWithCod: number;
  isEcoPreferred?: boolean;
}

export interface DeliveryCalculationParams {
  sellerDistrict: string;
  customerDistrict: string;
  weightKg?: number;
  isCod?: boolean;
  orderTotal?: number;
  serviceType?: CourierServiceType;
  preferredCourierId?: CourierProviderId;
}

export interface InvoiceItem {
  productId: string;
  title: string;
  sku?: string;
  sellerName: string;
  districtOrigin?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ecoTypes?: EcoType[];
}

export interface Invoice {
  invoiceNumber: string; // e.g. INV-2026-00892
  orderId: string;
  orderNumber: string;
  orderDate: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: UserAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  discountCode?: string;
  deliveryFee: number;
  codFee?: number;
  grandTotal: number;
  courierName?: string;
  trackingNumber?: string;
  shipmentStatus?: ShipmentStatus;
  qrPayload: string;
  notes?: string;
}

export interface QueueSubmission {
  id: string;
  trackingId?: string;
  productId: string;
  product?: Product;
  productTitle?: string;
  sellerId?: string;
  sellerName?: string;
  submittedAgo?: string;
  submittedDate?: string;
  submissionDate?: string;
  createdAt?: string;
  status: 'pending' | 'flagged' | 'under_review' | 'approved' | 'rejected';
  flags?: string[];
  reviewerNotes?: string;
  internalNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface SellerEarningsRecord {
  id: string;
  sellerId: string;
  sellerName?: string;
  storeName?: string;
  orderId?: string;
  subOrderId?: string;
  paymentId?: string;
  period?: string;
  totalOrders?: number;
  grossSales?: number;
  grossProductAmount?: number;
  discount?: number;
  totalDiscounts?: number;
  platformCommission?: number;
  commissionRate?: number;
  courierDeductions?: number;
  refundDeductions?: number;
  applicableFees?: number;
  netEarnings?: number;
  netPayout?: number;
  status: 'pending' | 'processing' | 'paid' | 'on_hold' | 'available' | 'withdrawn';
  payoutMethod?: string;
  payoutAccount?: string;
  transactionRef?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentLog {
  id: string;
  action?: string;
  paymentId?: string;
  orderId?: string;
  provider?: string;
  paymentMethod?: string;
  amount?: number;
  status?: string;
  details?: string;
  event?: string;
  transactionId?: string;
  signatureVerified?: boolean;
  signatureValid?: boolean;
  rawPayloadSummary?: string;
  errorMessage?: string;
  timestamp: string;
}

// ---------------- PHASE 8 & 18 FINANCIAL MANAGEMENT TYPES ----------------

export type LedgerTransactionType =
  | 'ORDER_EARNING'
  | 'COMMISSION'
  | 'COURIER_FEE'
  | 'REFUND'
  | 'REFUND_ADJUSTMENT'
  | 'MANUAL_ADJUSTMENT'
  | 'SETTLEMENT'
  | 'WITHDRAWAL'
  | 'WITHDRAWAL_REVERSAL'
  | 'SALE'
  | 'REFUND_DEDUCTION'
  | 'SELLER_PLAN_PAYMENT'
  | 'DELIVERY_FEE'
  | 'ADJUSTMENT'
  | 'TAX_VAT_DEDUCTION';

export interface FinancialLedgerEntry {
  id: string;
  sellerId: string;
  sellerName?: string;
  orderId?: string;
  orderNumber?: string;
  orderItemId?: string;
  subOrderId?: string;
  paymentId?: string;
  withdrawalId?: string;
  refundId?: string;
  settlementId?: string;
  type: LedgerTransactionType;
  direction?: 'CREDIT' | 'DEBIT'; // credit = positive inflow to seller balance, debit = deduction
  amount: number; // positive for credits, negative for debits
  balanceBefore: number;
  balanceAfter: number;
  previousBalance?: number;
  newBalance?: number;
  reference?: string;
  description?: string;
  status: 'completed' | 'pending' | 'reversed' | 'failed';
  holdUntil?: string; // earnings hold / return window release date
  releasedAt?: string;
  actorId?: string;
  actorRole?: string;
  createdBy?: string;
  auditInfo?: Record<string, any>;
  createdAt: string;
}

export type WithdrawalStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PAID'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERSED'
  | 'pending'
  | 'PENDING'
  | 'approved'
  | 'rejected'
  | 'paid';

export type WithdrawalMethod = 'bank_transfer' | 'bkash' | 'nagad' | 'rocket';

export interface WithdrawalAccountDetails {
  accountType?: 'personal' | 'merchant' | 'savings' | 'current';
  accountNumber: string;
  maskedAccount: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  accountHolderName?: string;
}

export interface WithdrawalTimelineEvent {
  status: WithdrawalStatus;
  timestamp: string;
  actor: string;
  actorRole?: string;
  note?: string;
  transactionRef?: string;
}

export interface SellerWithdrawalRequest {
  id: string;
  sellerId: string;
  sellerName: string;
  storeName?: string;
  amount: number;
  withdrawalFee: number;
  netAmount: number;
  withdrawalMethod: WithdrawalMethod;
  accountDetails: WithdrawalAccountDetails;
  status: WithdrawalStatus;
  idempotencyKey?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  transactionRef?: string;
  adminNotes?: string;
  rejectionReason?: string;
  failureReason?: string;
  riskFlags?: string[];
  payoutProvider?: string;
  payoutMode?: 'DISABLED' | 'SANDBOX' | 'LIVE' | 'CONFIGURATION REQUIRED';
  timeline?: WithdrawalTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface SellerSubscription {
  id: string;
  sellerId: string;
  sellerName?: string;
  storeName?: string;
  planId: string;
  planName: string;
  startDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
  paymentId?: string;
  amount: number;
  requiresRenewal?: boolean;
  autoRenew?: boolean;
  renewalInfo?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SellerBalanceSummary {
  sellerId: string;
  sellerName?: string;
  storeName?: string;
  // Separate Core Balances (Phase 18 Requirement)
  pendingBalance: number;       // Pending earnings held in return escrow window
  availableBalance: number;     // Unlocked and available for withdrawal
  processingBalance: number;    // Locked in active withdrawal requests
  withdrawnAmount: number;      // Total successfully paid out
  refundedAmount: number;       // Total refunds deducted
  commission: number;           // Total marketplace commission
  courierFees: number;          // Total courier and logistics fees
  adjustments: number;          // Net manual adjustments (+ or -)
  netPayable: number;           // Net payable available balance
  // Legacy / Calculated aggregates for compatibility
  grossSales: number;
  platformCommission: number;
  deliveryFees: number;
  refundDeductions: number;
  planFees: number;
  netEarnings: number;
  pendingEarnings: number;
  pendingWithdrawals: number;
  lockedBalance: number;
  totalOrders: number;
  currency: 'BDT';
  lastCalculatedAt: string;
}

export interface HistoricalCommissionSnapshot {
  orderId: string;
  orderItemId: string;
  sellerId: string;
  productPrice: number;
  quantity: number;
  grossProductAmount: number;
  appliedRule: 'seller' | 'category' | 'plan' | 'global';
  commissionRate: number;
  commissionAmount: number;
  sellerGross: number;
  sellerNet: number;
  deliveryFeePortion?: number;
  taxVatAmount?: number;
  calculatedAt: string;
}

export interface SellerPerformance {
  sellerId: string;
  orderCompletionRate: number; // e.g. 98%
  cancellationRate: number; // e.g. 2%
  returnRate: number; // e.g. 1.5%
  rating: number; // e.g. 4.9
  responseRate: number; // e.g. 95%
  deliveryPerformance: number; // e.g. 96%
  ecoComplianceScore: number; // e.g. 99%
  overallScore: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  calculatedAt: string;
}

export type SellerWarningType =
  | 'cancellation'
  | 'product_rejection'
  | 'eco_violation'
  | 'low_rating'
  | 'high_returns'
  | 'late_fulfillment'
  | 'suspicious_activity'
  | 'policy_violation';

export interface SellerWarning {
  id: string;
  sellerId: string;
  sellerName?: string;
  storeName?: string;
  type: SellerWarningType;
  title: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  issuedBy: string;
  issuedAt: string;
  acknowledgedAt?: string;
}

export type SellerRestrictionType =
  | 'product_upload_restricted'
  | 'store_visibility_restricted'
  | 'new_orders_restricted'
  | 'messaging_restricted'
  | 'withdrawal_review_required'
  | 'store_suspended';

export interface SellerRestriction {
  id: string;
  sellerId: string;
  sellerName?: string;
  type: SellerRestrictionType;
  reason: string;
  imposedBy: string;
  imposedAt: string;
  expiresAt?: string;
  active: boolean;
}

export interface SellerPromotionCampaign {
  id: string;
  sellerId: string;
  sellerName: string;
  campaignName: string;
  discountPercentage: number;
  productIds: string[];
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'active' | 'rejected' | 'expired';
  adminNotes?: string;
  createdAt: string;
}

export interface FeaturedSpotlight {
  id: string;
  type: 'featured_store' | 'featured_product' | 'district_spotlight' | 'eco_spotlight';
  targetId: string;
  targetTitle: string;
  bannerUrl?: string;
  district?: string;
  priority: number;
  active: boolean;
  startDate?: string;
  endDate?: string;
  updatedBy?: string;
  updatedAt: string;
}

export type StaffRole =
  | 'super_admin'
  | 'moderator'
  | 'eco_officer'
  | 'support_agent'
  | 'finance_officer'
  | 'logistics_manager'
  | 'content_manager';

export interface StaffMember {
  id: string;
  userId?: string;
  email: string;
  fullName: string;
  phone?: string;
  role: StaffRole;
  permissions: AdminPermission[];
  status: 'active' | 'suspended' | 'invited';
  department?: string;
  lastLogin?: string;
  avatarUrl?: string;
  createdAt: string;
  createdBy?: string;
  accessPassword?: string;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'customers' | 'sellers' | 'district' | 'category' | 'specific_user';
  targetValue?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  active: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  createdBy?: string;
}

export interface NotificationTemplate {
  id: string;
  code: string;
  title: string;
  category: 'order' | 'payment' | 'courier' | 'return' | 'refund' | 'seller' | 'eco_verification' | 'support' | 'promotion';
  bodyTemplate: string;
  channels: ('in_app' | 'email' | 'sms')[];
  triggerEvent: string;
  active: boolean;
  variables: string[];
  updatedAt: string;
}

export interface CMSPageContent {
  id: string;
  slug: string;
  title: string;
  category: 'policy' | 'company' | 'guide' | 'legal';
  subtitle?: string;
  content: string;
  lastUpdated: string;
  updatedBy: string;
  isPublished: boolean;
}

export interface AdminSecuritySession {
  id: string;
  adminEmail: string;
  ipAddress: string;
  userAgent: string;
  device: string;
  location: string;
  loginAt: string;
  lastActiveAt: string;
  status: 'active' | 'revoked' | 'expired';
  isCurrent?: boolean;
}

export interface AdminSecurityAlert {
  id: string;
  type: 'failed_login' | 'unauthorized_access' | 'role_escalation_attempt' | 'suspicious_payout' | 'mass_export';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  actorEmail?: string;
  ipAddress?: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
}

export interface PlatformGeneralSettings {
  siteName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  contactAddress: string;
  defaultCurrency: string;
  vatRate: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  ecoVerificationAutoFlagScore: number;
  enable2FAForAdmins: boolean;
  enableSmsAlerts: boolean;
  orderHoldDaysBeforePayout: number;
  minArtisanPayoutThreshold: number;
  allowGuestCheckout: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface FinancialStatement {
  statementNumber: string;
  sellerId: string;
  sellerName: string;
  storeName: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  openingBalance: number;
  grossSales: number;
  platformCommission: number;
  refundDeductions: number;
  withdrawals: number;
  adjustments: number;
  closingBalance: number;
  currency: 'BDT';
  transactions: FinancialLedgerEntry[];
}

// ---------------- PHASE 12: ADVANCED ANALYTICS & BI TYPES ----------------

export type AnalyticsDateRange = 
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface DateFilterRange {
  type: AnalyticsDateRange;
  startDate?: string;
  endDate?: string;
  label: string;
}

export interface AdminExecutiveKPIs {
  totalRevenue: number;
  netRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  refundedAmount: number;
  totalCustomers: number;
  activeCustomers: number;
  totalSellers: number;
  activeSellers: number;
  totalProducts: number;
  activeProducts: number;
  ecoVerifiedProducts: number;
  pendingEcoReviews: number;
  averageOrderValue: number;
  platformCommissionRevenue: number;
  totalSettlementsPending: number;
  totalWithdrawn: number;
  growthRatePercent: number;
  isRealDbData: boolean;
  calculatedAt: string;
}

export interface SalesTimeSeriesPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  aov: number;
  completed: number;
  cancelled: number;
  commission: number;
}

export interface ProductAnalyticsItem {
  productId: string;
  productTitle: string;
  sku: string;
  sellerId: string;
  sellerName: string;
  category: string;
  district: string;
  division: string;
  price: number;
  stock: number;
  unitsSold: number;
  totalRevenue: number;
  viewsCount: number;
  cartAddsCount: number;
  wishlistCount: number;
  returnCount: number;
  returnRate: number;
  status: EcoStatus;
  isEcoVerified: boolean;
  costPrice?: number; // only if cost data configured
  estimatedProfit?: number; // only if cost data configured
}

export interface CategoryAnalyticsItem {
  category: string;
  icon: string;
  productsCount: number;
  ordersCount: number;
  unitsSold: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  ecoVerifiedCount: number;
}

export interface DistrictAnalyticsItem {
  district: string;
  division: string;
  specialty?: string;
  totalSales: number;
  ordersCount: number;
  customersCount: number;
  sellersCount: number;
  productsCount: number;
  ecoProductsCount: number;
  avgOrderValue: number;
}

export interface SellerAnalyticsItem {
  sellerId: string;
  sellerName: string;
  storeName: string;
  district: string;
  division: string;
  category: string;
  status: SellerStatus;
  totalRevenue: number;
  totalOrders: number;
  unitsSold: number;
  averageOrderValue: number;
  commissionGenerated: number;
  refundsAmount: number;
  currentBalance: number;
  pendingSettlementAmount: number;
  withdrawnAmount: number;
  rating: number;
  riskScore: number;
  riskFlag?: 'High Cancellation' | 'High Return' | 'Policy Review' | 'Normal';
  ecoVerifiedCount: number;
}

export interface CustomerAnalyticsSummary {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  avgOrdersPerCustomer: number;
  averageCustomerLifetimeValue: number;
  totalWishlistEvents: number;
  totalCartEvents: number;
  retentionRatePercent: number;
}

export interface CartAnalyticsSummary {
  cartAdditions: number;
  cartRemovals: number;
  checkoutStarted: number;
  checkoutCompleted: number;
  abandonedCarts: number;
  cartToCheckoutRate: number;
  checkoutToPurchaseRate: number;
  overallFunnelConversion: number;
}

export interface EcoImpactAnalytics {
  ecoVerifiedProductsCount: number;
  plasticFreePackagingProductsCount: number;
  reusableProductsCount: number;
  biodegradableProductsCount: number;
  localDistrictProductsCount: number;
  ecoProductSalesVolume: number;
  ecoProductRevenue: number;
  ecoShareOfTotalSalesPercent: number;
  verificationApprovalRate: number;
  verificationRejectionRate: number;
  avgVerificationTimeHours: number;
  pendingVerifications: number;
  approvedVerifications: number;
  rejectedVerifications: number;
  changesRequiredVerifications: number;
}

export interface PaymentMethodAnalyticsItem {
  method: string;
  label: string;
  transactionsCount: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  refundedCount: number;
  successRate: number;
  totalRevenue: number;
}

export interface CourierAnalyticsItem {
  courierId: string;
  courierName: string;
  shipmentsCount: number;
  deliveredCount: number;
  inTransitCount: number;
  failedCount: number;
  returnedCount: number;
  successRate: number;
  failureRate: number;
  rtoRate: number;
  avgDeliveryDays: number;
}

export interface ReturnRefundAnalytics {
  totalReturnRequests: number;
  approvedReturns: number;
  rejectedReturns: number;
  completedReturns: number;
  totalRefundedAmount: number;
  pendingRefundsAmount: number;
  returnRatePercent: number;
  refundRatePercent: number;
  breakdownByCategory: Record<string, { returns: number; refunds: number }>;
  breakdownByDistrict: Record<string, { returns: number; refunds: number }>;
}

export type SellerSettlementStatus = 'PENDING' | 'READY' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REVERSED' | 'ON_HOLD';

export interface SellerSettlementRecord {
  id: string;
  settlementNumber: string;
  sellerId: string;
  sellerName: string;
  storeName: string;
  periodStart?: string;
  periodEnd?: string;
  period: string;
  grossSales: number;
  commission?: number;
  platformCommission?: number;
  courierFees: number;
  refunds?: number;
  refundAdjustments?: number;
  adjustments?: number;
  otherFees?: number;
  netPayable: number;
  alreadyPaid?: number;
  pendingAmount?: number;
  status: SellerSettlementStatus;
  payoutMethod?: string;
  payoutReference?: string;
  transactionRef?: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

export type AdminAlertCategory = 
  | 'payment' 
  | 'order' 
  | 'courier' 
  | 'seller' 
  | 'product' 
  | 'eco_verification' 
  | 'finance' 
  | 'security' 
  | 'system';

export type AdminAlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type AdminAlertStatus = 'NEW' | 'READ' | 'RESOLVED';

export interface AdminAlert {
  id: string;
  category: AdminAlertCategory;
  title: string;
  description: string;
  severity: AdminAlertSeverity;
  status: AdminAlertStatus;
  relatedRecordType?: string;
  relatedRecordId?: string;
  actionUrl?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type ReportType =
  | 'sales'
  | 'orders'
  | 'sellers'
  | 'customers'
  | 'products'
  | 'categories'
  | 'districts'
  | 'payments'
  | 'couriers'
  | 'returns'
  | 'refunds'
  | 'commissions'
  | 'settlements';

export interface AdminReportConfig {
  reportType: ReportType;
  dateRange: AnalyticsDateRange;
  startDate?: string;
  endDate?: string;
  divisionFilter?: string;
  districtFilter?: string;
  categoryFilter?: string;
  sellerFilter?: string;
  orderStatusFilter?: string;
  paymentMethodFilter?: string;
}

// ==========================================
// PHASE 13: CUSTOMER DISCOVERY & PERSONALIZATION TYPES
// ==========================================

export type DiscoverySortOption =
  | 'recommended'
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'popular'
  | 'best_selling'
  | 'discount';

export interface DiscoveryFilterCriteria {
  query?: string;
  category?: string;
  subcategory?: string;
  division?: string;
  district?: string;
  sellerId?: string;
  sellerName?: string;
  minPrice?: number;
  maxPrice?: number;
  ecoVerifiedOnly?: boolean;
  ecoTypes?: EcoType[];
  materials?: string[];
  stockAvailability?: 'all' | 'in_stock' | 'low_stock';
  minRating?: number;
  minDiscount?: number;
  deliveryDistrict?: string;
  collectionId?: string;
  featuredOnly?: boolean;
}

export interface EcoCollection {
  id: string;
  title: string;
  slug: string;
  description: string;
  tagline?: string;
  bannerImage: string;
  icon?: string;
  color?: string;
  featuredProductIds?: string[];
  filterCategory?: string;
  filterEcoType?: EcoType;
  filterMaterial?: string;
  tags?: string[];
  itemCount?: number;
  isFeatured?: boolean;
  displayOrder?: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchSuggestion {
  type: 'product' | 'category' | 'district' | 'material' | 'seller';
  title: string;
  subtitle?: string;
  id?: string;
  category?: string;
  district?: string;
  score?: number;
  image?: string;
}

export interface RecentlyViewedEntry {
  productId: string;
  productTitle: string;
  category: string;
  price: number;
  image: string;
  district: string;
  viewedAt: string;
}

export interface PriceChangeAlert {
  productId: string;
  productTitle: string;
  oldPrice: number;
  currentPrice: number;
  difference: number;
  percentageChange: number;
  direction: 'dropped' | 'increased';
  timestamp: string;
}

export interface CourierDeliveryOption {
  courierId: string;
  courierName: string;
  estimatedDays: string;
  estimatedDelivery: string;
  deliveryFee: number;
  isFreeDeliveryEligible?: boolean;
  codAvailable: boolean;
  ecoPackagingProvided: boolean;
}

export interface DeliveryAvailabilityResult {
  isAvailable: boolean;
  destinationDistrict: string;
  destinationDivision: string;
  options: CourierDeliveryOption[];
  notes?: string;
}

// ==========================================
// PHASE 23: CMS, MEDIA, CANCELLATION & DEDUPLICATION TYPES
// ==========================================

export interface SiteBrandingSettings {
  id: string;
  siteName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  contactEmail: string;
  contactPhone: string;
  supportHours: string;
  announcementText?: string;
  announcementLink?: string;
  announcementActive?: boolean;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  copyrightText?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CMSHeroBanner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  videoUrl?: string;
  active: boolean;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
  badgeText?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type CMSSectionType =
  | 'hero_banner'
  | 'featured_products'
  | 'featured_categories'
  | 'district_highlights'
  | 'artisan_stories'
  | 'promotional_banner'
  | 'flash_deals'
  | 'eco_charter';

export interface CMSSection {
  id: string;
  type: CMSSectionType;
  title: string;
  subtitle?: string;
  content?: string;
  active: boolean;
  displayOrder: number;
  itemIds?: string[];
  bannerUrl?: string;
  mobileBannerUrl?: string;
  videoUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  metadata?: Record<string, any>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CMSVersionEntry {
  id: string;
  entityType: 'site_settings' | 'cms_sections' | 'hero_banners' | 'cms_pages';
  entityId: string;
  changeDescription: string;
  previousValue: any;
  newValue: any;
  changedBy: string;
  changedByEmail: string;
  timestamp: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  storagePath: string;
  fileName: string;
  fileType: 'image' | 'video' | 'document';
  mimeType: string;
  sizeBytes: number;
  dimensions?: {
    width: number;
    height: number;
  };
  durationSeconds?: number;
  uploadedBy: string;
  uploadedByRole?: string;
  category: 'product' | 'banner' | 'logo' | 'story' | 'document' | 'general';
  altText?: string;
  tags?: string[];
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MediaFilterCriteria {
  fileType?: 'image' | 'video' | 'document' | 'all';
  category?: string;
  searchQuery?: string;
  isArchived?: boolean;
}

export interface OrderCancellationRequest {
  orderId: string;
  subOrderId?: string;
  reason: string;
  customerNotes?: string;
  cancelledBy: string;
  cancelledById?: string;
  cancelledByRole: 'customer' | 'seller' | 'admin' | 'system';
  restockInventory?: boolean;
}

export interface OrderCancellationResult {
  success: boolean;
  orderId: string;
  subOrderId?: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  restockedItemsCount: number;
  refundInitiated: boolean;
  refundAmount?: number;
  message: string;
}

export interface DuplicateProductItem {
  id: string;
  title: string;
  sku: string;
  slug?: string;
  sellerId: string;
  sellerName?: string;
  price: number;
  stock: number;
  createdAt: string;
  matchReason: 'identical_sku' | 'identical_slug' | 'same_title_and_seller';
}

export interface DataCleanupPreview {
  duplicateProducts: {
    totalDuplicates: number;
    groups: {
      canonicalId: string;
      duplicates: DuplicateProductItem[];
      reason: string;
    }[];
  };
  orphanedSubmissions: number;
  orphanedSubOrders: number;
  testOrdersCount: number;
  summary: string;
}

export interface DataCleanupResult {
  success: boolean;
  archivedProductsCount: number;
  cleanedOrphansCount: number;
  auditLogId: string;
  timestamp: string;
}
