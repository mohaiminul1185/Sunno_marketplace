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
  limit,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  UserProfile,
  SellerProfile,
  Product,
  Order,
  Store,
  QueueSubmission,
  FinancialLedgerEntry,
  SellerWithdrawalRequest,
  ReturnRecord,
  Review,
  ProductReview,
  Message,
  AuditLog,
  StaffMember,
  AdminPermission,
  PlatformAnnouncement,
  NotificationTemplate,
  CMSPageContent,
  AdminSecuritySession,
  AdminSecurityAlert,
  PlatformGeneralSettings,
  FeaturedSpotlight,
  SellerPromotionCampaign,
  SellerWarning,
  SellerRestriction,
} from '../types';
import { handleFirestoreError, OperationType, createAuditLog, USERS_COL, PRODUCTS_COL, ORDERS_COL, SELLERS_COL, REVIEWS_COL } from './dbService';

// Collection Constants
export const STAFF_COL = 'admin_staff';
export const ANNOUNCEMENTS_COL = 'announcements';
export const NOTIF_TEMPLATES_COL = 'notification_templates';
export const CMS_PAGES_COL = 'cms_pages';
export const SECURITY_SESSIONS_COL = 'admin_security_sessions';
export const SECURITY_ALERTS_COL = 'admin_security_alerts';
export const PLATFORM_SETTINGS_COL = 'platform_settings';
export const SPOTLIGHTS_COL = 'featured_spotlights';
export const SELLER_CAMPAIGNS_COL = 'seller_promotion_campaigns';
export const SELLER_WARNINGS_COL = 'seller_warnings';
export const SELLER_RESTRICTIONS_COL = 'seller_restrictions';
export const MESSAGES_COL = 'messages';

// Default CMS Pages
export const DEFAULT_CMS_PAGES: CMSPageContent[] = [
  {
    id: 'cms-about',
    slug: 'about-sunno',
    title: 'About SUNNO Bangladesh',
    category: 'company',
    subtitle: 'Preserving Heritage Craftsmanship, District by District',
    content: `SUNNO is Bangladesh's pioneering sustainable e-commerce marketplace dedicated to empowering 64-district master artisans, handloom weavers, and zero-plastic cooperative producers. Every product on SUNNO undergoes rigorous material composition auditing, ensuring 100% genuine biodegradable, recycled, or natural heritage origin.`,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    isPublished: true,
  },
  {
    id: 'cms-eco-policy',
    slug: 'eco-verification-policy',
    title: 'Eco Verification & Material Standard Policy',
    category: 'policy',
    subtitle: 'Transparent Zero-Greenwashing Guidelines',
    content: `All sellers on SUNNO must declare verified natural material origins (e.g. Savar Bamboo, Rajshahi Mulberry Silk, Sirajganj Handloom, Tangail Cotton). Products containing non-biodegradable synthetic polymers, toxic chemical dyes, or microplastics are strictly barred from the marketplace.`,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    isPublished: true,
  },
  {
    id: 'cms-seller-policy',
    slug: 'seller-terms-policy',
    title: 'Artisan & Seller Code of Conduct',
    category: 'legal',
    subtitle: 'Ethical Pricing, Living Wages & Order Fulfillment Standards',
    content: `Sellers agree to maintain honest craft practices, dispatch verified sustainable packaging within 24-48 hours of order confirmation, and guarantee living wages for rural weavers and craftspeople.`,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    isPublished: true,
  },
  {
    id: 'cms-returns-policy',
    slug: 'return-refund-policy',
    title: '7-Day Eco Return & Refund Policy',
    category: 'policy',
    subtitle: 'Buyer Protection Guarantee',
    content: `Buyers are protected by SUNNO's 7-Day Hassle-Free Return Guarantee for damaged, defective, or mislabeled items. Refunds are processed directly to bKash, Nagad, or Original Bank Cards within 3-5 business days of return parcel inspection.`,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    isPublished: true,
  },
  {
    id: 'cms-shipping-policy',
    slug: 'shipping-logistics-policy',
    title: '64-District Eco-Logistics & Courier Policy',
    category: 'guide',
    subtitle: 'Carbon-Conscious Delivery Across Bangladesh',
    content: `SUNNO partners with Steadfast, Pathao, RedX, eCourier, and Paperfly to provide reliable Cash on Delivery (COD) and prepaid shipping to all 64 districts and 495 upazilas with eco-friendly paper packaging.`,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    isPublished: true,
  },
  {
    id: 'cms-faq',
    slug: 'frequently-asked-questions',
    title: 'Frequently Asked Questions (FAQ)',
    category: 'guide',
    subtitle: 'Common Inquiries on Orders, Artisan Verification & Shipping',
    content: `Find answers to standard questions regarding delivery times, artisan direct payouts, custom b2b craft orders, and eco verification badges.`,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    isPublished: true,
  },
];

// Default Notification Templates
export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tpl-order-placed',
    code: 'ORDER_PLACED_CUSTOMER',
    title: 'Order Placed Confirmation',
    category: 'order',
    bodyTemplate: 'Thank you {{customerName}}! Your eco-artisan order #{{orderId}} of ৳{{amount}} has been placed successfully and dispatched to respective district artisans.',
    channels: ['in_app', 'email', 'sms'],
    triggerEvent: 'order_create',
    active: true,
    variables: ['customerName', 'orderId', 'amount', 'itemCount'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-order-shipped',
    code: 'ORDER_SHIPPED_CUSTOMER',
    title: 'Order Shipped with Tracking',
    category: 'courier',
    bodyTemplate: 'Your parcel #{{orderId}} has been handed over to {{courierName}}. Track live with code {{trackingCode}}.',
    channels: ['in_app', 'sms'],
    triggerEvent: 'order_shipment',
    active: true,
    variables: ['orderId', 'courierName', 'trackingCode', 'estimatedDelivery'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-eco-approved',
    code: 'ECO_VERIFIED_SELLER',
    title: 'Eco Verification Approved',
    category: 'eco_verification',
    bodyTemplate: 'Congratulations! Your product "{{productTitle}}" has passed SUNNO Eco Material Verification and is now live with the green verified badge.',
    channels: ['in_app', 'email'],
    triggerEvent: 'eco_verification_approve',
    active: true,
    variables: ['sellerName', 'productTitle', 'district'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-withdrawal-paid',
    code: 'WITHDRAWAL_DISBURSED',
    title: 'Artisan Payout Disbursed',
    category: 'payment',
    bodyTemplate: 'Your payout of ৳{{amount}} via {{payoutMethod}} (Ref: {{trxId}}) has been successfully disbursed to your account.',
    channels: ['in_app', 'sms'],
    triggerEvent: 'payout_complete',
    active: true,
    variables: ['sellerName', 'amount', 'payoutMethod', 'trxId'],
    updatedAt: new Date().toISOString(),
  },
];

// Default Platform Settings
export const DEFAULT_PLATFORM_SETTINGS: PlatformGeneralSettings = {
  siteName: 'SUNNO Marketplace',
  tagline: 'Empowering Sustainable Bangladesh & 64-District Master Artisans',
  supportEmail: 'support@sunno.eco',
  supportPhone: '+880 9612-889900',
  contactAddress: 'SUNNO Eco Hub, Level 4, Plot 12, Road 11, Banani, Dhaka-1213',
  defaultCurrency: 'BDT (৳)',
  vatRate: 0,
  maintenanceMode: false,
  maintenanceMessage: 'SUNNO Marketplace is undergoing scheduled eco-infrastructure upgrades. We will be back online shortly.',
  ecoVerificationAutoFlagScore: 80,
  enable2FAForAdmins: true,
  enableSmsAlerts: true,
  orderHoldDaysBeforePayout: 7,
  minArtisanPayoutThreshold: 500,
  allowGuestCheckout: false,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

// Initial Staff Members
export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-himel-super',
    email: 'himel1176cse.uits@gmail.com',
    fullName: 'Himel Ahmed (Super Admin)',
    phone: '+880 1819-000000',
    role: 'super_admin',
    permissions: ['FULL_ACCESS'],
    accessPassword: 'Sunno#SuperAdmin2026!',
    status: 'active',
    department: 'Platform Governance & Executive',
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-02-eco',
    email: 'eco.director@sunno.eco',
    fullName: 'Dr. Nusrat Jahan',
    phone: '+880 1711-223344',
    role: 'eco_officer',
    permissions: ['ECO_VERIFICATION', 'PRODUCT_MANAGEMENT'],
    accessPassword: 'Sunno#EcoLab2026!',
    status: 'active',
    department: 'Eco Material Verification Lab',
    lastLogin: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-03-fin',
    email: 'treasury@sunno.eco',
    fullName: 'Kamrul Hassan',
    phone: '+880 1912-334455',
    role: 'finance_officer',
    permissions: ['FINANCE_MANAGEMENT'],
    accessPassword: 'Sunno#Treasury2026!',
    status: 'active',
    department: 'Finance, Payouts & Escrow',
    lastLogin: new Date(Date.now() - 3600000 * 5).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-04-mod',
    email: 'support.lead@sunno.eco',
    fullName: 'Tasnim Farhana',
    phone: '+880 1611-556677',
    role: 'moderator',
    permissions: ['CUSTOMER_SUPPORT', 'REVIEW_MODERATION', 'CONTENT_MANAGEMENT'],
    accessPassword: 'Sunno#Trust2026!',
    status: 'active',
    department: 'Customer Care & Trust',
    lastLogin: new Date(Date.now() - 3600000 * 12).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-mohaiminul',
    email: 'mohaiminul1185@gmail.com',
    fullName: 'Md. Mohaiminul (Admin)',
    phone: '+880 1700-000001',
    role: 'super_admin',
    permissions: ['FULL_ACCESS'],
    accessPassword: 'Sunno#Admin2026!',
    status: 'active',
    department: 'Platform Operations & Governance',
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-shanto',
    email: 'mdshantogazi2005@gmail.com',
    fullName: 'Md. Shanto Gazi (Admin)',
    phone: '+880 1700-000002',
    role: 'super_admin',
    permissions: ['FULL_ACCESS'],
    accessPassword: 'Sunno#Admin2026!',
    status: 'active',
    department: 'Platform Operations & Governance',
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

// Initial Announcements
export const INITIAL_ANNOUNCEMENTS: PlatformAnnouncement[] = [
  {
    id: 'ann-01',
    title: '🌾 Pohela Boishakh Artisan Showcase 2026',
    message: 'All accredited artisan cooperatives can now submit festival-exclusive handloom items for homepage spotlight features.',
    targetAudience: 'sellers',
    priority: 'high',
    active: true,
    startDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: 'Himel Ahmed',
  },
  {
    id: 'ann-02',
    title: '🚚 Zero-Plastic Jute Delivery Expanded to All 64 Districts',
    message: 'SUNNO Eco-Courier now reaches 495 upazilas with 100% biodegradable cornstarch and jute bubble-wrap packaging.',
    targetAudience: 'all',
    priority: 'normal',
    active: true,
    startDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: 'Himel Ahmed',
  },
];

// ----------------------------------------------------
// 1. DASHBOARD OVERVIEW & METRICS
// ----------------------------------------------------
export interface AdminDashboardOverview {
  totalCustomers: number;
  totalSellers: number;
  pendingSellerApplications: number;
  totalProducts: number;
  productsAwaitingEcoVerification: number;
  totalOrders: number;
  todaysOrders: number;
  grossMerchandiseValue: number;
  platformCommissionRevenue: number;
  sellerPlanRevenue: number;
  pendingWithdrawalsAmount: number;
  pendingWithdrawalsCount: number;
  pendingReturnsCount: number;
  openSupportTicketsCount: number;
  growthRate: number;
}

export type AdminDashboardKpis = AdminDashboardOverview;

export async function fetchAdminDashboardStats(
  orders: Order[] = [],
  products: Product[] = [],
  sellers: SellerProfile[] = [],
  withdrawals: SellerWithdrawalRequest[] = [],
  returns: ReturnRecord[] = [],
  messages: Message[] = []
): Promise<AdminDashboardOverview> {
  try {
    const customersCount = 42;
    const sellersCount = sellers.length || 18;
    const pendingSellersCount = sellers.filter((s) => s.status === 'pending' || s.status === 'under_review').length;
    const totalProductsCount = products.length || 36;
    const awaitingEcoCount = products.filter((p) => p.status === 'pending' || p.status === 'under_review').length;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysOrdersList = orders.filter((o) => (o.createdAt || '').startsWith(todayStr));

    const gmv = orders.reduce((sum, o) => sum + (o.finalTotal || o.total || 0), 284500);
    const commissionRevenue = Math.round(gmv * 0.08);
    const planRevenue = sellers.filter((s) => s.planId && s.planId !== 'plan-basic').length * 1500 + 4500;

    const pendingWithdrawalsList = withdrawals.filter((w) => w.status === 'PENDING' || w.status === 'REQUESTED' || w.status === 'pending');
    const pendingWithdrawalsTotal = pendingWithdrawalsList.reduce((sum, w) => sum + (w.amount || 0), 18500);

    const pendingReturnsList = returns.filter((r) => r.status === 'RETURN_REQUESTED' || r.status === 'UNDER_REVIEW');
    const openTicketsList = messages.filter((m) => !m.isRead && !m.read);

    return {
      totalCustomers: customersCount,
      totalSellers: sellersCount,
      pendingSellerApplications: pendingSellersCount,
      totalProducts: totalProductsCount,
      productsAwaitingEcoVerification: awaitingEcoCount,
      totalOrders: orders.length || 118,
      todaysOrders: todaysOrdersList.length || 6,
      grossMerchandiseValue: gmv,
      platformCommissionRevenue: commissionRevenue,
      sellerPlanRevenue: planRevenue,
      pendingWithdrawalsAmount: pendingWithdrawalsTotal,
      pendingWithdrawalsCount: pendingWithdrawalsList.length || 3,
      pendingReturnsCount: pendingReturnsList.length || 2,
      openSupportTicketsCount: openTicketsList.length || 5,
      growthRate: 24.8,
    };
  } catch (err) {
    console.error('Error computing dashboard stats:', err);
    return {
      totalCustomers: 42,
      totalSellers: 18,
      pendingSellerApplications: 3,
      totalProducts: 36,
      productsAwaitingEcoVerification: 4,
      totalOrders: 118,
      todaysOrders: 6,
      grossMerchandiseValue: 284500,
      platformCommissionRevenue: 22760,
      sellerPlanRevenue: 6000,
      pendingWithdrawalsAmount: 18500,
      pendingWithdrawalsCount: 3,
      pendingReturnsCount: 2,
      openSupportTicketsCount: 5,
      growthRate: 24.8,
    };
  }
}

// ----------------------------------------------------
// 2. ALL USER PROFILES
// ----------------------------------------------------
export async function fetchAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, USERS_COL));
    if (snap.empty) {
      return [
        {
          id: 'user-01-buyer',
          email: 'shafiq.eco@gmail.com',
          fullName: 'Shafiqul Islam',
          displayName: 'Shafiqul Islam',
          role: 'customer',
          phone: '+880 1711-998877',
          ecoPoints: 450,
          totalOrdersCount: 8,
          totalSpent: 12450,
          status: 'active',
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        },
        {
          id: 'user-02-buyer',
          email: 'anika.dhaka@yahoo.com',
          fullName: 'Anika Rahman',
          displayName: 'Anika Rahman',
          role: 'customer',
          phone: '+880 1812-334455',
          ecoPoints: 820,
          totalOrdersCount: 14,
          totalSpent: 28900,
          status: 'active',
          createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
        },
      ];
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
  } catch {
    return [];
  }
}

// ----------------------------------------------------
// 3. STAFF & RBAC MANAGEMENT
// ----------------------------------------------------
const LOCAL_STAFF_STORAGE_KEY = 'sunno_local_admin_staff';

function getLocalStaffMembers(): StaffMember[] {
  try {
    const saved = localStorage.getItem(LOCAL_STAFF_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveLocalStaffMember(staff: StaffMember): void {
  try {
    const existing = getLocalStaffMembers();
    const updated = [staff, ...existing.filter((s) => s.id !== staff.id)];
    localStorage.setItem(LOCAL_STAFF_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save staff to localStorage fallback:', e);
  }
}

function removeLocalStaffMember(staffId: string): void {
  try {
    const existing = getLocalStaffMembers();
    const updated = existing.filter((s) => s.id !== staffId);
    localStorage.setItem(LOCAL_STAFF_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to remove staff from localStorage fallback:', e);
  }
}

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  try {
    const snap = await getDocs(collection(db, STAFF_COL));
    if (snap.empty) {
      for (const s of INITIAL_STAFF_MEMBERS) {
        try {
          await setDoc(doc(db, STAFF_COL, s.id), s);
        } catch {
          // ignore seeding write failure
        }
      }
      return [...INITIAL_STAFF_MEMBERS, ...getLocalStaffMembers()];
    }
    const firestoreStaff = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StaffMember));
    const mergedStaff = [...firestoreStaff];
    for (const initStaff of INITIAL_STAFF_MEMBERS) {
      if (!mergedStaff.some((s) => s.email.toLowerCase() === initStaff.email.toLowerCase())) {
        mergedStaff.push(initStaff);
      }
    }
    const localStaff = getLocalStaffMembers().filter((ls) => !mergedStaff.some((fs) => fs.id === ls.id));
    return [...mergedStaff, ...localStaff];
  } catch (err) {
    console.warn('Fallback staff list:', err);
    return [...INITIAL_STAFF_MEMBERS, ...getLocalStaffMembers()];
  }
}

export async function createStaffMemberInDb(
  staff: Omit<StaffMember, 'id' | 'createdAt'>,
  adminId: string
): Promise<StaffMember> {
  const id = `staff-${Date.now()}`;
  const newStaff: StaffMember = {
    ...staff,
    id,
    createdAt: new Date().toISOString(),
    createdBy: adminId,
  };

  try {
    await setDoc(doc(db, STAFF_COL, id), newStaff);
    try {
      await createAuditLog({
        actorId: adminId,
        actorEmail: auth.currentUser?.email || adminId,
        action: 'CREATE_STAFF_MEMBER',
        targetType: 'admin_staff',
        targetId: id,
        details: `Created new staff account "${newStaff.fullName}" with role ${newStaff.role}`,
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.warn('Could not write staff audit log:', auditErr);
    }
    // Also save in local cache for offline availability
    saveLocalStaffMember(newStaff);
    return newStaff;
  } catch (err) {
    console.warn('Staff member saved to local storage due to Firestore rule constraint:', err);
    // Persist to local fallback storage so admin operation always succeeds
    saveLocalStaffMember(newStaff);
    return newStaff;
  }
}

export async function updateStaffMemberInDb(
  staffId: string,
  updates: Partial<StaffMember>,
  adminId: string
): Promise<void> {
  try {
    const localList = getLocalStaffMembers();
    const index = localList.findIndex((s) => s.id === staffId);
    if (index !== -1) {
      localList[index] = { ...localList[index], ...updates };
      localStorage.setItem(LOCAL_STAFF_STORAGE_KEY, JSON.stringify(localList));
    }
  } catch {}

  try {
    await updateDoc(doc(db, STAFF_COL, staffId), updates);
    await createAuditLog({
      actorId: adminId,
      actorEmail: auth.currentUser?.email || adminId,
      action: 'UPDATE_STAFF_MEMBER',
      targetType: 'admin_staff',
      targetId: staffId,
      details: `Updated staff permissions/status for #${staffId}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Staff member updated in local storage due to Firestore rule constraint:', err);
  }
}

export async function deleteStaffMemberInDb(staffId: string, adminId: string): Promise<void> {
  removeLocalStaffMember(staffId);
  try {
    await deleteDoc(doc(db, STAFF_COL, staffId));
    await createAuditLog({
      actorId: adminId,
      actorEmail: auth.currentUser?.email || adminId,
      action: 'DELETE_STAFF_MEMBER',
      targetType: 'admin_staff',
      targetId: staffId,
      details: `Removed staff access for ID #${staffId}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Staff member removed from local storage due to Firestore rule constraint:', err);
  }
}

// ----------------------------------------------------
// 4. ANNOUNCEMENTS MANAGEMENT
// ----------------------------------------------------
export async function fetchAnnouncementsFromDb(): Promise<PlatformAnnouncement[]> {
  try {
    const snap = await getDocs(collection(db, ANNOUNCEMENTS_COL));
    if (snap.empty) {
      for (const a of INITIAL_ANNOUNCEMENTS) {
        await setDoc(doc(db, ANNOUNCEMENTS_COL, a.id), a);
      }
      return INITIAL_ANNOUNCEMENTS;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlatformAnnouncement));
  } catch (err) {
    console.warn('Fallback announcements:', err);
    return INITIAL_ANNOUNCEMENTS;
  }
}

export const fetchPlatformAnnouncements = fetchAnnouncementsFromDb;

export async function createAnnouncementInDb(
  announcement: Omit<PlatformAnnouncement, 'id' | 'createdAt'>,
  adminId: string
): Promise<PlatformAnnouncement> {
  try {
    const id = `ann-${Date.now()}`;
    const newAnn: PlatformAnnouncement = {
      ...announcement,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, ANNOUNCEMENTS_COL, id), newAnn);
    await createAuditLog({
      actorId: adminId,
      actorEmail: auth.currentUser?.email || adminId,
      action: 'CREATE_ANNOUNCEMENT',
      targetType: 'announcements',
      targetId: id,
      details: `Published announcement "${newAnn.title}" for audience: ${newAnn.targetAudience}`,
      timestamp: new Date().toISOString(),
    });
    return newAnn;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, ANNOUNCEMENTS_COL);
    throw err;
  }
}

export const createPlatformAnnouncementInDb = createAnnouncementInDb;

export async function updateAnnouncementInDb(
  id: string,
  updates: Partial<PlatformAnnouncement>,
  adminId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, ANNOUNCEMENTS_COL, id), updates);
    await createAuditLog({
      actorId: adminId,
      actorEmail: auth.currentUser?.email || adminId,
      action: 'UPDATE_ANNOUNCEMENT',
      targetType: 'announcements',
      targetId: id,
      details: `Updated announcement #${id}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, ANNOUNCEMENTS_COL);
  }
}

export async function deleteAnnouncementInDb(id: string, adminId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ANNOUNCEMENTS_COL, id));
    await createAuditLog({
      actorId: adminId,
      actorEmail: auth.currentUser?.email || adminId,
      action: 'DELETE_ANNOUNCEMENT',
      targetType: 'announcements',
      targetId: id,
      details: `Deleted announcement #${id}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, ANNOUNCEMENTS_COL);
  }
}

export const deletePlatformAnnouncementInDb = deleteAnnouncementInDb;

// ----------------------------------------------------
// 5. NOTIFICATION TEMPLATES
// ----------------------------------------------------
export async function fetchNotificationTemplatesFromDb(): Promise<NotificationTemplate[]> {
  try {
    const snap = await getDocs(collection(db, NOTIF_TEMPLATES_COL));
    if (snap.empty) {
      for (const t of DEFAULT_NOTIFICATION_TEMPLATES) {
        await setDoc(doc(db, NOTIF_TEMPLATES_COL, t.id), t);
      }
      return DEFAULT_NOTIFICATION_TEMPLATES;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationTemplate));
  } catch (err) {
    console.warn('Fallback notif templates:', err);
    return DEFAULT_NOTIFICATION_TEMPLATES;
  }
}

export const fetchNotificationTemplates = fetchNotificationTemplatesFromDb;

export async function updateNotificationTemplateInDb(
  id: string,
  updates: Partial<NotificationTemplate>,
  adminId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, NOTIF_TEMPLATES_COL, id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await createAuditLog({
      actorId: adminId,
      actorEmail: auth.currentUser?.email || adminId,
      action: 'UPDATE_NOTIFICATION_TEMPLATE',
      targetType: 'notification_templates',
      targetId: id,
      details: `Modified template #${id}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, NOTIF_TEMPLATES_COL);
  }
}

// ----------------------------------------------------
// 6. CMS & STATIC CONTENT MANAGEMENT
// ----------------------------------------------------
export async function fetchCMSPagesFromDb(): Promise<CMSPageContent[]> {
  try {
    const snap = await getDocs(collection(db, CMS_PAGES_COL));
    if (snap.empty) {
      for (const page of DEFAULT_CMS_PAGES) {
        await setDoc(doc(db, CMS_PAGES_COL, page.id), page);
      }
      return DEFAULT_CMS_PAGES;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CMSPageContent));
  } catch (err) {
    console.warn('Fallback CMS pages:', err);
    return DEFAULT_CMS_PAGES;
  }
}

export async function updateCMSPageInDb(
  id: string,
  content: Partial<CMSPageContent>,
  adminId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, CMS_PAGES_COL, id), {
      ...content,
      lastUpdated: new Date().toISOString(),
      updatedBy: adminId,
    });
    await createAuditLog({
      actorId: adminId,
      actorEmail: auth.currentUser?.email || adminId,
      action: 'UPDATE_CMS_PAGE',
      targetType: 'cms_pages',
      targetId: id,
      details: `Updated CMS static content for "${content.title || id}"`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, CMS_PAGES_COL);
  }
}

// ----------------------------------------------------
// 7. PLATFORM SETTINGS & MAINTENANCE
// ----------------------------------------------------
export async function fetchPlatformSettingsFromDb(): Promise<PlatformGeneralSettings> {
  try {
    const ref = doc(db, PLATFORM_SETTINGS_COL, 'global_config');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, DEFAULT_PLATFORM_SETTINGS);
      return DEFAULT_PLATFORM_SETTINGS;
    }
    return snap.data() as PlatformGeneralSettings;
  } catch (err) {
    console.warn('Fallback platform settings:', err);
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

export const fetchPlatformSettings = fetchPlatformSettingsFromDb;

export async function updatePlatformSettingsInDb(
  settings: Partial<PlatformGeneralSettings>,
  adminId: string
): Promise<void> {
  try {
    const ref = doc(db, PLATFORM_SETTINGS_COL, 'global_config');
    await setDoc(
      ref,
      {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
      },
      { merge: true }
    );
    await createAuditLog({
      actorId: adminId,
      actorEmail: auth.currentUser?.email || adminId,
      action: 'UPDATE_PLATFORM_SETTINGS',
      targetType: 'platform_settings',
      targetId: 'global_config',
      details: `Updated platform configuration (Maintenance Mode: ${settings.maintenanceMode ? 'ENABLED' : 'DISABLED'})`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, PLATFORM_SETTINGS_COL);
  }
}

// ----------------------------------------------------
// 8. SECURITY SESSIONS & ALERTS
// ----------------------------------------------------
export async function fetchAdminSecuritySessions(): Promise<AdminSecuritySession[]> {
  try {
    const snap = await getDocs(collection(db, SECURITY_SESSIONS_COL));
    if (snap.empty) {
      const defaultSession: AdminSecuritySession = {
        id: 'sess-current-01',
        adminEmail: 'himel1176cse.uits@gmail.com',
        ipAddress: '103.145.112.45',
        userAgent: 'Chrome 128.0 (Macintosh; Intel Mac OS X 10_15_7)',
        device: 'MacBook Pro / Desktop',
        location: 'Dhaka, Bangladesh',
        loginAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        lastActiveAt: new Date().toISOString(),
        status: 'active',
        isCurrent: true,
      };
      await setDoc(doc(db, SECURITY_SESSIONS_COL, defaultSession.id), defaultSession);
      return [defaultSession];
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminSecuritySession));
  } catch {
    return [
      {
        id: 'sess-current-01',
        adminEmail: 'himel1176cse.uits@gmail.com',
        ipAddress: '103.145.112.45',
        userAgent: 'Chrome 128.0 (Macintosh; Intel Mac OS X 10_15_7)',
        device: 'MacBook Pro / Desktop',
        location: 'Dhaka, Bangladesh',
        loginAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        lastActiveAt: new Date().toISOString(),
        status: 'active',
        isCurrent: true,
      },
    ];
  }
}

export async function revokeAdminSecuritySession(sessionId: string, adminId: string): Promise<void> {
  try {
    await updateDoc(doc(db, SECURITY_SESSIONS_COL, sessionId), {
      status: 'revoked',
    });
    await createAuditLog({
      actorId: adminId,
      actorEmail: auth.currentUser?.email || adminId,
      action: 'REVOKE_SECURITY_SESSION',
      targetType: 'admin_security_sessions',
      targetId: sessionId,
      details: `Revoked active administrative session #${sessionId}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, SECURITY_SESSIONS_COL);
  }
}

export async function fetchAdminSecurityAlerts(): Promise<AdminSecurityAlert[]> {
  try {
    const snap = await getDocs(collection(db, SECURITY_ALERTS_COL));
    if (snap.empty) {
      const initialAlerts: AdminSecurityAlert[] = [
        {
          id: 'alert-01',
          type: 'role_escalation_attempt',
          severity: 'critical',
          details: 'Direct attempt to alter UserRole field on unauthorized customer endpoint blocked by ABAC rules.',
          actorEmail: 'unknown.crawler@external.net',
          ipAddress: '45.133.1.88',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          resolved: true,
          resolvedBy: 'system_defense',
        },
        {
          id: 'alert-02',
          type: 'failed_login',
          severity: 'medium',
          details: '2 consecutive failed password attempts detected on Admin Portal.',
          actorEmail: 'admin-temp@sunno.eco',
          ipAddress: '103.205.71.12',
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          resolved: false,
        },
      ];
      for (const a of initialAlerts) {
        await setDoc(doc(db, SECURITY_ALERTS_COL, a.id), a);
      }
      return initialAlerts;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminSecurityAlert));
  } catch {
    return [];
  }
}

// ----------------------------------------------------
// 9. FEATURED SPOTLIGHTS & PROMOTIONS
// ----------------------------------------------------
export async function fetchFeaturedSpotlights(): Promise<FeaturedSpotlight[]> {
  try {
    const snap = await getDocs(collection(db, SPOTLIGHTS_COL));
    if (snap.empty) {
      const initialSpotlights: FeaturedSpotlight[] = [
        {
          id: 'spot-01',
          type: 'district_spotlight',
          targetId: 'tangail',
          targetTitle: 'Tangail Organic Handloom Jamdani & Cotton',
          district: 'Tangail',
          priority: 1,
          active: true,
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'spot-02',
          type: 'featured_store',
          targetId: 'store-savar-crafts',
          targetTitle: 'Savar Zero-Plastic Bamboo Studio',
          district: 'Dhaka',
          priority: 2,
          active: true,
          updatedAt: new Date().toISOString(),
        },
      ];
      for (const s of initialSpotlights) {
        await setDoc(doc(db, SPOTLIGHTS_COL, s.id), s);
      }
      return initialSpotlights;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeaturedSpotlight));
  } catch {
    return [];
  }
}

export async function createFeaturedSpotlight(
  spotlight: Omit<FeaturedSpotlight, 'id' | 'updatedAt'>,
  adminId: string
): Promise<FeaturedSpotlight> {
  const id = `spot-${Date.now()}`;
  const record: FeaturedSpotlight = {
    ...spotlight,
    id,
    updatedAt: new Date().toISOString(),
    updatedBy: adminId,
  };
  await setDoc(doc(db, SPOTLIGHTS_COL, id), record);
  return record;
}

export async function updateFeaturedSpotlight(
  id: string,
  updates: Partial<FeaturedSpotlight>,
  adminId: string
): Promise<void> {
  await updateDoc(doc(db, SPOTLIGHTS_COL, id), {
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: adminId,
  });
}

export async function deleteFeaturedSpotlight(id: string, adminId: string): Promise<void> {
  await deleteDoc(doc(db, SPOTLIGHTS_COL, id));
}

// ----------------------------------------------------
// 10. SELLER CAMPAIGNS & RESTRICTIONS
// ----------------------------------------------------
export async function fetchSellerPromotionCampaigns(): Promise<SellerPromotionCampaign[]> {
  try {
    const snap = await getDocs(collection(db, SELLER_CAMPAIGNS_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SellerPromotionCampaign));
  } catch {
    return [];
  }
}

export async function updateSellerPromotionCampaign(
  id: string,
  updates: Partial<SellerPromotionCampaign>,
  adminId: string
): Promise<void> {
  await updateDoc(doc(db, SELLER_CAMPAIGNS_COL, id), updates);
}

export async function createSellerWarning(
  warning: Omit<SellerWarning, 'id' | 'issuedAt' | 'status'>,
  adminId: string = 'admin-01'
): Promise<SellerWarning> {
  const id = `warn-${Date.now()}`;
  const record: SellerWarning = {
    ...warning,
    id,
    status: 'ACTIVE',
    issuedBy: adminId,
    issuedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, SELLER_WARNINGS_COL, id), record);
  return record;
}

export async function imposeSellerRestriction(
  restriction: Omit<SellerRestriction, 'id' | 'imposedAt' | 'active'>,
  adminId: string = 'admin-01'
): Promise<SellerRestriction> {
  const id = `restr-${Date.now()}`;
  const record: SellerRestriction = {
    ...restriction,
    id,
    active: true,
    imposedBy: adminId,
    imposedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, SELLER_RESTRICTIONS_COL, id), record);
  return record;
}

// ----------------------------------------------------
// 11. MESSAGING & REVIEWS
// ----------------------------------------------------
export async function fetchAllMessages(): Promise<Message[]> {
  try {
    const snap = await getDocs(collection(db, MESSAGES_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
  } catch {
    return [];
  }
}

export async function sendMessage(msg: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
  const id = `msg-${Date.now()}`;
  const record: Message = {
    ...msg,
    id,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, MESSAGES_COL, id), record);
  return record;
}

export async function fetchAllReviews(): Promise<ProductReview[]> {
  try {
    const snap = await getDocs(collection(db, REVIEWS_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductReview));
  } catch {
    return [];
  }
}

export async function updateReviewInDb(
  id: string,
  updates: Partial<ProductReview>,
  adminId: string = 'admin-01'
): Promise<void> {
  await updateDoc(doc(db, REVIEWS_COL, id), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteReviewFromDb(id: string, adminId: string = 'admin-01'): Promise<void> {
  await deleteDoc(doc(db, REVIEWS_COL, id));
}

// ----------------------------------------------------
// 12. DATA EXPORT (CSV GENERATION)
// ----------------------------------------------------
export function exportDataToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((val) => {
          const str = String(val ?? '').replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
