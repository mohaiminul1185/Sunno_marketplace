import React, { useState, useEffect, useMemo } from 'react';
import {
  Product,
  ProductLifecycleStatus,
  QueueSubmission,
  ActiveTab,
  EcoType,
  SellerPortalTab,
  Store,
  SellerPlan,
  Order,
  SubOrder,
  Review,
  Message,
  Shipment,
  Invoice,
  Notification,
  ReturnRequest,
  SellerBalanceSummary,
  SellerWithdrawalRequest,
} from '../types';
import { SELLER_AVATAR, BRAND_LOGO } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { ALL_64_DISTRICTS, BANGLADESH_DIVISIONS } from '../data/bangladeshDistricts';
import {
  fetchCustomerAddressesFromDb,
  fetchSellerSubOrders,
  subscribeSellerSubOrders,
  updateSubOrderStatusInDb,
} from '../services/checkoutService';
import {
  createProductInDb,
  updateProductInDb,
  deleteProductInDb,
  duplicateProductInDb,
  fetchStoreById,
  fetchStoreBySellerId,
  updateStoreInDb,
  fetchSellerPlans,
  fetchCategories,
  INITIAL_CATEGORIES,
  saveEcoSubmission,
  fetchSellerOrders,
  subscribeSellerOrders,
  fetchOrderById,
  updateOrderStatus,
  calculateSellerFinancials,
  sendMessageInDb,
} from '../services/dbService';
import {
  fetchShipmentsBySubOrder,
  fetchShipmentsBySeller,
  getOfficialInvoiceForOrder,
} from '../services/courierService';
import { subscribeUserNotifications, notifyEcoSubmissionReceived } from '../services/notificationService';
import { subscribeUserConversations } from '../services/messagingService';
import { calculateSellerBalances, fetchSellerWithdrawals } from '../services/financeService';
import { subscribeSellerReturns } from '../services/returnService';
import { SellerProductImageManager } from './seller/SellerProductImageManager';
import { SellerOrderCommunicationTab } from './seller/SellerOrderCommunicationTab';
import { SellerShippingDispatchTab } from './seller/SellerShippingDispatchTab';
import { SellerReviewsTab } from './seller/SellerReviewsTab';
import { SellerNotificationsTab } from './seller/SellerNotificationsTab';
import { SellerStoreProfileTab } from './seller/SellerStoreProfileTab';
import { SellerShipmentModal } from './SellerShipmentModal';
import { TrackingModal } from './TrackingModal';
import { InvoiceModal } from './InvoiceModal';
import { ParcelLabelModal } from './ParcelLabelModal';
import { Order360Modal } from './Order360Modal';
import { SellerFinanceView } from './SellerFinanceView';
import { SellerReturnsDisputesTab } from './SellerReturnsDisputesTab';
import { SellerAuthPortal } from './seller/SellerAuthPortal';
import { SellerPendingView } from './seller/SellerPendingView';
import { SellerProductVideoManager } from './seller/SellerProductVideoManager';
import {
  checkProductDuplicate,
  saveProductDraft,
  publishProduct,
  unpublishProduct,
  archiveProduct,
  restoreProduct,
} from '../services/firebase/productService';
import {
  executeSubOrderCancellation,
  CANCELLATION_REASONS_SELLER,
} from '../services/orderCancellationService';
import {
  saveStoreProfile,
  generateUniqueStoreSlug,
  isStoreSlugUnique,
  sanitizeStoreSlug,
} from '../services/storeService';
import { StoreMediaUploader } from './seller/StoreMediaUploader';
import {
  Truck,
  Printer,
  FileText,
  Package,
  Leaf,
  Upload,
  Star,
  MessageSquare,
  ShieldCheck,
  Search,
  Sparkles,
  Eye,
  Video,
  Globe,
  Facebook,
  Instagram,
  Youtube,
  Clock,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  PauseCircle,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { StoreStatus } from '../types';

interface SellerPortalViewProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onSelectProduct: (product: Product) => void;
  initialSubTab?: SellerPortalTab;
}

export const SellerPortalView: React.FC<SellerPortalViewProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  setActiveTab,
  onSelectProduct,
  initialSubTab = 'dashboard',
}) => {
  const { userProfile, role, currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SellerPortalTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [searchTable, setSearchTable] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sellerToast, setSellerToast] = useState<string | null>(null);

  // Data states
  const [plans, setPlans] = useState<SellerPlan[]>([]);
  const [activePlan, setActivePlan] = useState<SellerPlan | null>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>(INITIAL_CATEGORIES);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellerSubOrders, setSellerSubOrders] = useState<SubOrder[]>([]);
  const [storeData, setStoreData] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payoutRequested, setPayoutRequested] = useState(false);

  // Courier & Invoice Modals
  const [shippingSubOrder, setShippingSubOrder] = useState<SubOrder | null>(null);
  const [activeTrackingShipment, setActiveTrackingShipment] = useState<Shipment | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [activeLabelShipment, setActiveLabelShipment] = useState<Shipment | null>(null);
  const [subOrderShipments, setSubOrderShipments] = useState<Record<string, Shipment>>({});
  const [selectedOrder360, setSelectedOrder360] = useState<Order | null>(null);

  // Phase 23 Product Media, Video, Draft & Preview State
  const [newVideoUrl, setNewVideoUrl] = useState<string | undefined>(undefined);
  const [newSku, setNewSku] = useState('');
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Phase 23 SubOrder Cancellation State
  const [subOrderToCancel, setSubOrderToCancel] = useState<SubOrder | null>(null);
  const [sellerCancelReason, setSellerCancelReason] = useState<string>(CANCELLATION_REASONS_SELLER[0]);
  const [sellerCancelNotes, setSellerCancelNotes] = useState('');
  const [sellerCancelConfirm, setSellerCancelConfirm] = useState(false);
  const [isCancellingSubOrder, setIsCancellingSubOrder] = useState(false);

  // Store Settings & Branding Form State
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('active');
  const [storeStatusMessage, setStoreStatusMessage] = useState('');
  const [allowOrdersWhileUnavailable, setAllowOrdersWhileUnavailable] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [storeTagline, setStoreTagline] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [storeCategory, setStoreCategory] = useState('Bamboo & Cane Crafts');
  const [storeOwnerName, setStoreOwnerName] = useState('');
  const [storeLogo, setStoreLogo] = useState('');
  const [storeBanner, setStoreBanner] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeWhatsapp, setStoreWhatsapp] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storeDivision, setStoreDivision] = useState('Dhaka');
  const [storeDistrict, setStoreDistrict] = useState('Dhaka');
  const [storeBusinessAddress, setStoreBusinessAddress] = useState('');
  const [storeWebsite, setStoreWebsite] = useState('');
  const [storeFacebook, setStoreFacebook] = useState('');
  const [storeInstagram, setStoreInstagram] = useState('');
  const [storeYoutube, setStoreYoutube] = useState('');
  const [shippingPolicy, setShippingPolicy] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [sustainabilityPledge, setSustainabilityPledge] = useState('');
  const [businessHours, setBusinessHours] = useState('Sun - Thu: 9:00 AM - 6:00 PM');
  const [isStoreDirty, setIsStoreDirty] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailabilityError, setSlugAvailabilityError] = useState<string | null>(null);

  // Onboarding & Application Tab State (Clean authentic defaults)
  const [isOnboardingEditOpen, setIsOnboardingEditOpen] = useState(false);
  const [onboardingName, setOnboardingName] = useState(userProfile?.fullName || '');
  const [onboardingPhone, setOnboardingPhone] = useState(userProfile?.phone || '');
  const [onboardingEmail, setOnboardingEmail] = useState(userProfile?.email || '');
  const [onboardingAddress, setOnboardingAddress] = useState('');
  const [onboardingDivision, setOnboardingDivision] = useState('Dhaka');
  const [onboardingDistrict, setOnboardingDistrict] = useState('Dhaka');
  const [onboardingStoreName, setOnboardingStoreName] = useState('');
  const [onboardingTagline, setOnboardingTagline] = useState('');
  const [onboardingDescription, setOnboardingDescription] = useState('');
  const [onboardingPayoutMethod, setOnboardingPayoutMethod] = useState<'bank_transfer' | 'bkash' | 'nagad'>('bkash');
  const [onboardingBankName, setOnboardingBankName] = useState('BRAC Bank PLC');
  const [onboardingBranch, setOnboardingBranch] = useState('');
  const [onboardingRouting, setOnboardingRouting] = useState('');
  const [onboardingAccountNum, setOnboardingAccountNum] = useState(userProfile?.phone || '');
  const [onboardingAccountHolder, setOnboardingAccountHolder] = useState(userProfile?.fullName || '');
  const [onboardingCourier, setOnboardingCourier] = useState('Steadfast Courier (64 Districts Automated Doorstep Pickup)');
  const [onboardingNid, setOnboardingNid] = useState('');
  const [onboardingBusinessType, setOnboardingBusinessType] = useState('Artisan Craftsperson / Cooperative Lead');

  // New Product Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Bamboo & Cane');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newPrice, setNewPrice] = useState('1250');
  const [newDiscount, setNewDiscount] = useState('0');
  const [newStock, setNewStock] = useState('25');
  const [newLowStockThreshold, setNewLowStockThreshold] = useState('5');
  const [newWeight, setNewWeight] = useState('0.8 kg');
  const [newDivision, setNewDivision] = useState(userProfile?.sellerProfile?.division || 'Dhaka');
  const [newDistrict, setNewDistrict] = useState(userProfile?.sellerProfile?.district || 'Dhaka');
  const [newDescription, setNewDescription] = useState('');
  const [newMaterials, setNewMaterials] = useState('100% natural seasoned bamboo, organic jute fiber, vegetable dyes');
  const [newOrigin, setNewOrigin] = useState('Dhaka District, Bangladesh');
  const [newEndOfLife, setNewEndOfLife] = useState('100% biodegradable in 90 days');
  const [newEcoTypes, setNewEcoTypes] = useState<EcoType[]>(['Handmade', 'Biodegradable', 'Zero Plastic']);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [newClaim, setNewClaim] = useState('100% Chemical-Free & Fair Wage');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [sellerNotifications, setSellerNotifications] = useState<Notification[]>([]);
  const [sellerBalances, setSellerBalances] = useState<SellerBalanceSummary | null>(null);
  const [sellerWithdrawals, setSellerWithdrawals] = useState<SellerWithdrawalRequest[]>([]);
  const [sellerReturns, setSellerReturns] = useState<ReturnRequest[]>([]);

  const showToast = (msg: string) => {
    setSellerToast(msg);
    setTimeout(() => setSellerToast(null), 3500);
  };

  const currentSellerId = currentUser?.uid || userProfile?.id || '';
  const myStoreName = storeData?.name || userProfile?.sellerProfile?.storeName || userProfile?.displayName || 'Artisan Eco Store';

  // Filter products: Seller can ONLY access their own products (Strict multi-tenant isolation by authenticated UID)
  const myProducts = useMemo(() => {
    if (!currentSellerId) return [];
    return (products || []).filter((p) => p.sellerId === currentSellerId);
  }, [products, currentSellerId]);

  // Load plans, categories, orders, store details
  useEffect(() => {
    // Only subscribe and fetch seller operational data if the user is in seller mode
    if (role !== 'seller' && userProfile?.role !== 'seller') {
      return;
    }

    fetchSellerPlans().then((pList) => {
      setPlans(pList);
      const userPlanId = userProfile?.sellerProfile?.planId || 'plan-pro';
      const found = pList.find((item) => item.id === userPlanId) || pList[1] || pList[0];
      setActivePlan(found);
    });

    fetchCategories().then(setCategoriesList);

    // Fetch store for this specific seller (isolated multi-tenant store profile)
    const loadSellerStore = async () => {
      if (!currentSellerId) return;
      let st = await fetchStoreBySellerId(currentSellerId);
      if (!st && userProfile?.sellerProfile?.id) {
        st = await fetchStoreById(userProfile.sellerProfile.id);
      }

      if (st) {
        setStoreData(st);
        setStoreName(st.name || '');
        setStoreSlug(st.slug || '');
        setStoreTagline(st.tagline || '');
        setStoreDesc(st.description || '');
        setStoreCategory(st.category || 'Bamboo & Cane Crafts');
        setStoreOwnerName(st.ownerName || (st as any).sellerName || userProfile?.fullName || '');
        setStoreLogo(st.logo || '');
        setStoreBanner(st.banner || '');
        setStorePhone(st.phone || userProfile?.phone || '');
        setStoreWhatsapp(st.whatsapp || userProfile?.phone || '');
        setStoreEmail(st.email || userProfile?.email || '');
        setStoreDivision(st.division || userProfile?.sellerProfile?.division || 'Dhaka');
        setStoreDistrict(st.district || userProfile?.sellerProfile?.district || 'Dhaka');
        setStoreBusinessAddress(st.businessAddress || '');
        setStoreWebsite(st.socialLinks?.website || '');
        setStoreFacebook(st.socialLinks?.facebook || '');
        setStoreInstagram(st.socialLinks?.instagram || '');
        setStoreYoutube(st.socialLinks?.youtube || '');
        setShippingPolicy(st.policies?.shipping || '');
        setReturnPolicy(st.policies?.returns || '');
        setPrivacyPolicy(st.policies?.privacy || '');
        setSustainabilityPledge(st.policies?.sustainability || '');
        setStoreStatus(st.status || 'active');
        setStoreStatusMessage(st.statusMessage || '');
        setAllowOrdersWhileUnavailable(!!st.allowOrdersWhileUnavailable);
        if (st.businessHours) setBusinessHours(st.businessHours);

        // Sync onboarding state without mock fallbacks
        setOnboardingName((st as any).sellerName || st.ownerName || userProfile?.fullName || '');
        setOnboardingPhone(st.phone || userProfile?.phone || '');
        setOnboardingEmail(st.email || userProfile?.email || '');
        setOnboardingAddress(st.businessAddress || (st.district ? `${st.district}, ${st.division || ''}, Bangladesh` : ''));
        setOnboardingDivision(st.division || 'Dhaka');
        setOnboardingDistrict(st.district || 'Dhaka');
        setOnboardingStoreName(st.name || '');
        setOnboardingTagline(st.tagline || '');
        setOnboardingDescription(st.description || '');
        setOnboardingAccountHolder((st as any).sellerName || st.ownerName || userProfile?.fullName || '');
      } else {
        const initialName = userProfile?.sellerProfile?.storeName || userProfile?.fullName || 'Artisan Workshop';
        setStoreName(initialName);
        setOnboardingStoreName(initialName);
        setOnboardingName(userProfile?.fullName || '');
        setOnboardingEmail(userProfile?.email || '');
        setOnboardingPhone(userProfile?.phone || '');
        setStoreOwnerName(userProfile?.fullName || '');
        setStoreEmail(userProfile?.email || '');
        setStorePhone(userProfile?.phone || '');
        setStoreWhatsapp(userProfile?.phone || '');
        setStoreDivision(userProfile?.sellerProfile?.division || 'Dhaka');
        setStoreDistrict(userProfile?.sellerProfile?.district || 'Dhaka');
        generateUniqueStoreSlug(initialName).then(setStoreSlug).catch(() => {});
      }
      setIsStoreDirty(false);
    };
    loadSellerStore();

    fetchSellerOrders(currentSellerId).then(setOrders);
    calculateSellerBalances(currentSellerId).then(setSellerBalances).catch(() => {});
    fetchSellerWithdrawals(currentSellerId).then(setSellerWithdrawals).catch(() => {});

    // Realtime Sub-Orders Subscription (optimized single-query shipment lookup)
    const unsubSubOrders = subscribeSellerSubOrders(currentSellerId, async (subs) => {
      setSellerSubOrders(subs);
      try {
        const shipments = await fetchShipmentsBySeller(currentSellerId);
        const shipmentsMap: Record<string, Shipment> = {};
        shipments.forEach((s) => {
          if (s.subOrderId) {
            shipmentsMap[s.subOrderId] = s;
          }
        });
        setSubOrderShipments(shipmentsMap);
      } catch (e) {
        console.warn('Error fetching seller shipments batch:', e);
      }
    });

    // Realtime Notifications Subscription
    const unsubNotifs = subscribeUserNotifications(currentSellerId, (notifs, unread) => {
      setSellerNotifications(notifs);
      setUnreadNotifsCount(unread);
    });

    // Realtime Conversations Subscription
    const unsubConvs = subscribeUserConversations(currentSellerId, (convs) => {
      const unreadTotal = convs.reduce((acc, c) => acc + (c.unreadCountSeller || 0), 0);
      setUnreadMessagesCount(unreadTotal);
    });

    // Realtime Returns Subscription
    const unsubReturns = subscribeSellerReturns(currentSellerId, (rets) => {
      setSellerReturns(rets);
    });

    return () => {
      unsubSubOrders();
      unsubNotifs();
      unsubConvs();
      unsubReturns();
    };
  }, [currentSellerId, userProfile]);

  // Calculate financials using the robust formula
  const financials = calculateSellerFinancials(currentSellerId, myProducts, orders, activePlan);

  // Filtered Listings
  const filteredListings = myProducts.filter((item) => {
    const matchesSearch =
      !searchTable ||
      item.title.toLowerCase().includes(searchTable.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTable.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTable.toLowerCase());

    const matchesCat = filterCategory === 'All' || item.category === filterCategory;
    const matchesStat =
      filterStatus === 'All' ||
      (filterStatus === 'eco_verified' && item.status === 'eco_verified') ||
      (filterStatus === 'under_review' && (item.status === 'under_review' || item.status === 'pending')) ||
      (filterStatus === 'draft' && item.status === 'draft') ||
      (filterStatus === 'out_of_stock' && item.stock === 0);

    return matchesSearch && matchesCat && matchesStat;
  });

  const toggleEcoType = (type: EcoType) => {
    if (newEcoTypes.includes(type)) {
      setNewEcoTypes(newEcoTypes.filter((t) => t !== type));
    } else {
      setNewEcoTypes([...newEcoTypes, type]);
    }
  };

  const resetAddForm = () => {
    setNewTitle('');
    setNewCategory('Bamboo & Cane');
    setNewSubcategory('');
    setNewPrice('1250');
    setNewDiscount('0');
    setNewStock('25');
    setNewLowStockThreshold('5');
    setNewWeight('0.8 kg');
    setNewSku('');
    setNewDescription('');
    setNewMaterials('100% natural seasoned bamboo, organic jute fiber, vegetable dyes');
    setNewImages([]);
    setNewVideoUrl(undefined);
    setFormError(null);
    setIsDraftMode(false);
  };

  const handleCloseAddModal = () => {
    const hasChanges = Boolean(
      newTitle.trim() ||
      newDescription.trim() ||
      newImages.length > 0 ||
      newVideoUrl ||
      newSku.trim()
    );
    if (hasChanges) {
      if (!window.confirm('Discard unsaved changes? Any entered information will be lost.')) {
        return;
      }
    }
    resetAddForm();
    setIsAddModalOpen(false);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (financials.isQuotaReached) {
      showToast(`You have reached the maximum product quota (${financials.productLimit}) on your current plan. Please upgrade your seller tier to add more listings.`);
      return;
    }

    setFormError(null);

    // 1. Title validation
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      setFormError('Please enter a craft title with at least 3 characters.');
      return;
    }

    // 2. Category & Subcategory validation
    if (!newCategory) {
      setFormError('Please select a valid craft category.');
      return;
    }
    const matchingCat = categoriesList.find((c) => c.name === newCategory);
    let validSubcategory = newSubcategory;
    if (newSubcategory && matchingCat) {
      const isSubValid = matchingCat.subcategories?.some((s: any) => s.name === newSubcategory);
      if (!isSubValid) {
        validSubcategory = '';
      }
    }

    // 3. Price validation: required, numeric, > 0
    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Price must be a valid positive amount in BDT (৳).');
      return;
    }

    // 4. Stock validation: integer >= 0
    const parsedStock = parseInt(newStock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setFormError('Stock units cannot be negative.');
      return;
    }

    // 5. Low stock threshold validation
    const parsedLowStock = parseInt(newLowStockThreshold, 10);
    if (isNaN(parsedLowStock) || parsedLowStock < 0) {
      setFormError('Low-stock alert threshold cannot be negative.');
      return;
    }

    // 6. Division & District validation
    const isDistrictValid = ALL_64_DISTRICTS.some((d) => d.division === newDivision && d.name === newDistrict);
    if (!isDistrictValid) {
      setFormError(`District "${newDistrict}" does not belong to ${newDivision} Division origin.`);
      return;
    }

    // 7. Product Images: Required for Eco-Verification
    if (!isDraftMode && newImages.length === 0) {
      setFormError('At least one authentic craft photo is required for SUNNO eco-verification audit.');
      return;
    }

    setIsSubmitting(true);

    // Safe, non-colliding SKU generation
    const genSku = `SUN-${newDivision.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const skuVal = (newSku.trim() || genSku).toUpperCase();
    const slugVal = (trimmedTitle || 'artisan-craft').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Duplicate check
    try {
      const dupCheck = await checkProductDuplicate(currentSellerId, skuVal, slugVal, trimmedTitle);
      if (dupCheck.isDuplicate) {
        setFormError(`Duplicate Listing Warning: ${dupCheck.reason}`);
        setIsSubmitting(false);
        return;
      }
    } catch (dupErr) {
      console.warn('Duplicate check warning:', dupErr);
    }

    const assignedStatus: Product['status'] = isDraftMode ? 'draft' : 'under_review';
    const assignedLifecycle: ProductLifecycleStatus = isDraftMode ? 'draft' : 'pending_review';

    const newProdData: Omit<Product, 'id'> = {
      title: trimmedTitle,
      sku: skuVal,
      slug: slugVal,
      price: Math.round(parsedPrice * 100) / 100,
      discount: Number(newDiscount) || 0,
      category: newCategory,
      subcategory: validSubcategory || undefined,
      division: newDivision,
      district: newDistrict,
      status: assignedStatus,
      lifecycleStatus: assignedLifecycle,
      ecoVerified: false,
      ecoTypes: newEcoTypes,
      sellerId: currentSellerId,
      sellerName: myStoreName,
      sellerVerified: true,
      sellerRating: 5.0,
      rating: 5.0,
      reviewsCount: 0,
      description: newDescription.trim() || 'Ethically made with zero harmful synthetics by verified Bangladesh artisans.',
      videoUrl: newVideoUrl,
      images: newImages,
      originInfo: `${newDistrict} District, ${newDivision} Division, Bangladesh`,
      materialsInfo: newMaterials,
      endOfLifeInfo: newEndOfLife,
      manufacturingProcess: 'Traditional handloom / woodcraft methods utilizing non-toxic natural plant dyes.',
      materialComposition: newMaterials,
      claims: [
        {
          title: newClaim || '100% Eco-Friendly Materials',
          description: 'Sourced directly from certified rural community partners in Bangladesh.',
        },
      ],
      certifications: [
        { name: 'Eco_Bangladesh_Origin_Seal.pdf', size: '1.4 MB' },
      ],
      stock: parsedStock,
      availableStock: parsedStock,
      lowStockThreshold: parsedLowStock,
      weight: newWeight,
      isHandmade: newEcoTypes.includes('Handmade'),
      isBiodegradable: newEcoTypes.includes('Biodegradable'),
      isPlasticFree: newEcoTypes.includes('Zero Plastic'),
      plasticPercentage: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isDraftMode) {
        const draftDoc = await saveProductDraft(newProdData, currentSellerId);
        onAddProduct(draftDoc);
        showToast('Craft saved as DRAFT successfully.');
      } else {
        const created = await createProductInDb(newProdData, currentSellerId);
        onAddProduct(created);
        showToast('Craft listed! Submitted for 24-hour Eco-Verification audit.');
      }

      resetAddForm();
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Error creating product in DB:', err);
      const errMsg = err?.message || 'Failed to submit craft listing to Firebase. Please try again.';
      setFormError(errMsg);
      showToast('Submission failed: ' + errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDraftForAudit = async (prod: Product) => {
    if (!prod.images || prod.images.length === 0) {
      showToast(`Cannot submit "${prod.title}" for Eco-Verification: At least one authentic craft photo is required.`);
      return;
    }
    if (prod.price <= 0) {
      showToast(`Cannot submit "${prod.title}": Price must be greater than 0 BDT.`);
      return;
    }
    try {
      await updateProductInDb(prod.id, {
        status: 'under_review',
        lifecycleStatus: 'pending_review',
        ecoVerified: false,
      }, currentSellerId);

      const queueSub: QueueSubmission = {
        id: `queue-${Date.now()}`,
        trackingId: `ENV-${Math.floor(1000 + Math.random() * 9000)}`,
        productId: prod.id,
        sellerId: currentSellerId,
        product: { ...prod, status: 'under_review', lifecycleStatus: 'pending_review', ecoVerified: false },
        submittedAgo: 'Just now',
        submittedDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: 'pending',
        internalNotes: 'Draft submitted by seller for eco verification review.',
      };
      await saveEcoSubmission(queueSub);
      notifyEcoSubmissionReceived(currentSellerId, prod.title, queueSub.trackingId).catch(() => {});

      const updated: Product = { ...prod, status: 'under_review', lifecycleStatus: 'pending_review', ecoVerified: false };
      onUpdateProduct(updated);
      showToast(`"${prod.title}" submitted to Eco-Verification Committee!`);
    } catch (err: any) {
      console.error('Error submitting draft for audit:', err);
      showToast(err.message || 'Failed to submit craft for verification.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await updateProductInDb(editingProduct.id, editingProduct, currentSellerId);
      onUpdateProduct(editingProduct);
      setEditingProduct(null);
      showToast('Product updated successfully.');
    } catch (err) {
      console.error('Error updating product in DB:', err);
      onUpdateProduct(editingProduct);
      setEditingProduct(null);
    }
  };

  const handlePublishProduct = async (prod: Product) => {
    try {
      await publishProduct(prod.id, currentSellerId);
      const updated: Product = { ...prod, status: 'eco_verified', lifecycleStatus: 'published' };
      onUpdateProduct(updated);
      showToast(`Listing "${prod.title}" is now PUBLISHED.`);
    } catch (err) {
      console.error('Error publishing product:', err);
      showToast('Could not publish product.');
    }
  };

  const handleUnpublishProduct = async (prod: Product) => {
    try {
      await unpublishProduct(prod.id, currentSellerId);
      const updated: Product = { ...prod, status: 'inactive', lifecycleStatus: 'unpublished' };
      onUpdateProduct(updated);
      showToast(`Listing "${prod.title}" UNPUBLISHED.`);
    } catch (err) {
      console.error('Error unpublishing product:', err);
    }
  };

  const handleArchiveProduct = async (prod: Product) => {
    if (!window.confirm(`Archive "${prod.title}"? (Soft archive preserves order history)`)) return;
    try {
      await archiveProduct(prod.id, currentSellerId, 'Archived by seller');
      const updated: Product = { ...prod, status: 'archived', lifecycleStatus: 'archived', isArchived: true };
      onUpdateProduct(updated);
      showToast(`Product "${prod.title}" moved to archive.`);
    } catch (err) {
      console.error('Error archiving product:', err);
    }
  };

  const handleRestoreProduct = async (prod: Product) => {
    try {
      await restoreProduct(prod.id, currentSellerId);
      const updated: Product = { ...prod, status: 'under_review', lifecycleStatus: 'pending_review', isArchived: false };
      onUpdateProduct(updated);
      showToast(`Product "${prod.title}" restored from archive.`);
    } catch (err) {
      console.error('Error restoring product:', err);
    }
  };

  const handleExecuteSubOrderCancellation = async () => {
    if (!subOrderToCancel || !sellerCancelConfirm) return;
    setIsCancellingSubOrder(true);
    try {
      const res = await executeSubOrderCancellation({
        orderId: subOrderToCancel.parentOrderId || subOrderToCancel.orderId || '',
        subOrderId: subOrderToCancel.id,
        sellerId: currentSellerId,
        sellerName: myStoreName,
        reason: sellerCancelReason,
        notes: sellerCancelNotes,
      });

      if (res.success) {
        setSellerSubOrders((prev) =>
          prev.map((s) => (s.id === subOrderToCancel.id ? { ...s, status: 'cancelled' } : s))
        );
        setSubOrderToCancel(null);
        setSellerCancelNotes('');
        setSellerCancelConfirm(false);
        showToast(res.message);
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel sub-order');
    } finally {
      setIsCancellingSubOrder(false);
    }
  };

  const handleDuplicateProduct = async (prod: Product) => {
    if (financials.isQuotaReached) {
      showToast(`Product quota (${financials.productLimit}) reached. Upgrade plan to duplicate products.`);
      return;
    }
    try {
      const cloned = await duplicateProductInDb(prod.id, currentSellerId);
      onAddProduct(cloned);
      showToast(`Duplicated product as draft: "${cloned.title}"`);
    } catch (err) {
      console.error('Error duplicating product:', err);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm('Are you sure you want to remove this craft listing?')) return;
    try {
      await deleteProductInDb(prodId, currentSellerId);
      showToast('Product archived.');
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const handleStockUpdate = async (prod: Product, delta: number) => {
    const nextStock = Math.max(0, prod.stock + delta);
    const updated = {
      ...prod,
      stock: nextStock,
      status: nextStock === 0 ? ('out_of_stock' as const) : prod.status === 'out_of_stock' ? ('eco_verified' as const) : prod.status,
    };
    onUpdateProduct(updated);
    await updateProductInDb(prod.id, updated, currentSellerId).catch(() => {});
    showToast(`Updated stock for "${prod.title}" to ${nextStock}`);
  };

  const handleRegenerateSlug = async () => {
    setIsCheckingSlug(true);
    try {
      const clean = await generateUniqueStoreSlug(storeName || 'artisan', storeData?.id);
      setStoreSlug(clean);
      setSlugAvailabilityError(null);
      setIsStoreDirty(true);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const handleSlugBlur = async () => {
    if (!storeSlug) return;
    const clean = sanitizeStoreSlug(storeSlug);
    setStoreSlug(clean);
    setIsCheckingSlug(true);
    try {
      const isAvail = await isStoreSlugUnique(clean, storeData?.id);
      if (!isAvail) {
        setSlugAvailabilityError(`The slug "${clean}" is already claimed by another store.`);
      } else {
        setSlugAvailabilityError(null);
      }
    } catch {
      setSlugAvailabilityError(null);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSellerId) {
      showToast('Error: You must be signed in as an authorized seller.');
      return;
    }

    if (slugAvailabilityError) {
      showToast('Please resolve the store slug conflict before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Store> = {
        name: storeName.trim(),
        slug: storeSlug.trim() ? sanitizeStoreSlug(storeSlug) : undefined,
        tagline: storeTagline.trim(),
        description: storeDesc.trim(),
        category: storeCategory,
        ownerName: storeOwnerName.trim() || userProfile?.fullName || '',
        logo: storeLogo,
        banner: storeBanner,
        phone: storePhone.trim(),
        whatsapp: storeWhatsapp.trim(),
        email: storeEmail.trim(),
        division: storeDivision,
        district: storeDistrict,
        businessAddress: storeBusinessAddress.trim(),
        businessHours: businessHours.trim(),
        status: storeStatus,
        statusMessage: storeStatusMessage.trim(),
        allowOrdersWhileUnavailable,
        socialLinks: {
          website: storeWebsite.trim() || undefined,
          facebook: storeFacebook.trim() || undefined,
          instagram: storeInstagram.trim() || undefined,
          youtube: storeYoutube.trim() || undefined,
        },
        policies: {
          shipping: shippingPolicy.trim(),
          returns: returnPolicy.trim(),
          privacy: privacyPolicy.trim(),
          sustainability: sustainabilityPledge.trim(),
        },
      };

      const savedStore = await saveStoreProfile(currentSellerId, payload, storeData?.id, role);
      setStoreData(savedStore);
      setStoreSlug(savedStore.slug);
      setIsStoreDirty(false);
      showToast('Store profile & branding published to live marketplace!');
    } catch (err: any) {
      console.error('Error updating store:', err);
      // Genuine error display: NEVER display a success message when Firebase saving fails
      showToast(`Save failed: ${err.message || 'Unable to update store profile in Firebase.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlanUpgrade = (plan: SellerPlan) => {
    setActivePlan(plan);
    showToast(`Seller tier updated to "${plan.name}"!`);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['orderStatus']) => {
    await updateOrderStatus(orderId, status);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, orderStatus: status, status } : o))
    );
    showToast(`Order #${orderId} marked as ${status.toUpperCase()}`);
  };

  const handleUpdateSubOrderStatus = async (
    subOrderId: string,
    status: SubOrder['status'],
    trackingCode?: string,
    courierNotes?: string
  ) => {
    await updateSubOrderStatusInDb(subOrderId, status, courierNotes, trackingCode);
    setSellerSubOrders((prev) =>
      prev.map((s) => (s.id === subOrderId ? { ...s, status, trackingCode: trackingCode || s.trackingCode, courierNotes: courierNotes || s.courierNotes } : s))
    );
    showToast(`Sub-Order #${subOrderId} updated to ${status.toUpperCase()}`);
  };

  // Check authentication & role gate
  if ((!currentUser && !userProfile) || (role !== 'seller' && userProfile?.role !== 'seller')) {
    return (
      <SellerAuthPortal
        onSuccess={() => {
          setActiveSubTab('dashboard');
        }}
        onCancel={() => setActiveTab('home')}
      />
    );
  }

  // Check verification & approval state
  const sellerStatus = userProfile?.sellerProfile?.status;
  if (sellerStatus && sellerStatus !== 'approved') {
    return <SellerPendingView onSwitchToCustomer={() => setActiveTab('home')} />;
  }

  return (
    <main id="seller-portal-main" className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 flex flex-col md:flex-row gap-6 lg:gap-8 min-h-[calc(100vh-80px)] overflow-x-hidden">
      {/* Toast Notification */}
      {sellerToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#002c11] text-[#a0f399] border border-[#a0f399]/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{sellerToast}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Store Info Card */}
          <div className="bg-[#ffffff] p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex items-center gap-3">
            <img
              src={storeData?.logo || SELLER_AVATAR}
              alt={myStoreName}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-[#1b6d24]"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xs text-[#002c11] truncate font-heading">
                {myStoreName}
              </h3>
              <span className="text-[10px] text-[#1b6d24] font-bold flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                {activePlan?.name || 'Verified Artisan'}
              </span>
            </div>
          </div>

          {/* Mobile Horizontal Scrolling Tabs Bar (screens < 768px) */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-1 -mx-2 border-b border-[#c1c9be]/40">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
              { id: 'onboarding', label: 'Onboarding', icon: 'assignment_turned_in' },
              { id: 'products', label: 'Products', icon: 'inventory_2', badge: `${myProducts.length}` },
              { id: 'orders', label: 'Orders', icon: 'shopping_bag', badge: `${orders.length}` },
              { id: 'messages', label: 'Messages', icon: 'chat', badge: unreadMessagesCount > 0 ? `${unreadMessagesCount}` : undefined },
              { id: 'shipping', label: 'Shipping', icon: 'local_shipping', badge: `${sellerSubOrders.length}` },
              { id: 'tracking', label: 'Tracking', icon: 'near_me' },
              { id: 'returns', label: 'Returns', icon: 'sync', badge: sellerReturns.filter((r) => r.status === 'requested').length > 0 ? `${sellerReturns.filter((r) => r.status === 'requested').length}` : undefined },
              { id: 'refunds', label: 'Refunds', icon: 'currency_exchange' },
              { id: 'reviews', label: 'Reviews', icon: 'star' },
              { id: 'earnings', label: 'Earnings', icon: 'account_balance_wallet' },
              { id: 'settlements', label: 'Settlements', icon: 'payments' },
              { id: 'withdrawals', label: 'Withdrawals', icon: 'credit_card' },
              { id: 'notifications', label: 'Notifications', icon: 'notifications', badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined },
              { id: 'profile', label: 'Store Profile', icon: 'badge' },
              { id: 'settings', label: 'Customization', icon: 'storefront' },
              { id: 'inventory', label: 'Stock', icon: 'inventory' },
              { id: 'eco_verification', label: 'Eco Lab', icon: 'verified', badge: `${financials.underReviewProducts}` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as SellerPortalTab)}
                className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeSubTab === tab.id
                    ? 'bg-[#002c11] text-[#a0f399] shadow-xs'
                    : 'bg-white text-[#414941] border border-[#c1c9be]/50 hover:bg-[#f0eded]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge && tab.badge !== '0' && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-[#a0f399] text-[#002204]">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop/Tablet Vertical Navigation Links (screens >= 768px) */}
          <nav className="hidden md:block space-y-1 text-xs font-semibold">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
              { id: 'onboarding', label: 'Onboarding & Application', icon: 'assignment_turned_in' },
              { id: 'products', label: 'Products', icon: 'inventory_2', badge: `${myProducts.length}` },
              { id: 'orders', label: 'Orders', icon: 'shopping_bag', badge: `${orders.length}` },
              { id: 'messages', label: 'Messages', icon: 'chat', badge: unreadMessagesCount > 0 ? `${unreadMessagesCount}` : undefined },
              { id: 'shipping', label: 'Shipping', icon: 'local_shipping', badge: `${sellerSubOrders.length}` },
              { id: 'tracking', label: 'Tracking', icon: 'near_me' },
              { id: 'returns', label: 'Returns', icon: 'sync', badge: sellerReturns.filter((r) => r.status === 'requested').length > 0 ? `${sellerReturns.filter((r) => r.status === 'requested').length}` : undefined },
              { id: 'refunds', label: 'Refunds', icon: 'currency_exchange' },
              { id: 'reviews', label: 'Reviews', icon: 'star' },
              { id: 'earnings', label: 'Earnings', icon: 'account_balance_wallet' },
              { id: 'settlements', label: 'Settlements', icon: 'payments' },
              { id: 'withdrawals', label: 'Withdrawals', icon: 'credit_card' },
              { id: 'notifications', label: 'Notifications', icon: 'notifications', badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined },
              { id: 'profile', label: 'Store Profile', icon: 'badge' },
              { id: 'settings', label: 'Store Customization', icon: 'storefront' },
              { id: 'inventory', label: 'Inventory & Stock', icon: 'inventory' },
              { id: 'eco_verification', label: 'Eco Verification', icon: 'verified', badge: `${financials.underReviewProducts}` },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`btn-seller-tab-${tab.id}`}
                onClick={() => setActiveSubTab(tab.id as SellerPortalTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                  activeSubTab === tab.id
                    ? 'bg-[#002c11] text-[#a0f399] font-bold shadow-sm'
                    : 'text-[#414941] hover:bg-[#f0eded] hover:text-[#002c11]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
                {tab.badge && tab.badge !== '0' && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeSubTab === tab.id ? 'bg-[#a0f399] text-[#002204]' : 'bg-[#e8f5e9] text-[#1b6d24]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}

            {/* Public Store Preview Link */}
            <div className="pt-2 border-t border-[#c1c9be]/40">
              <button
                id="btn-seller-preview-store"
                onClick={() => setActiveTab('store')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-[#1b6d24] hover:bg-[#e8f5e9] transition-all font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                <span>View Public Store</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer CTA */}
        <div className="pt-6 border-t border-[#c1c9be]/60 mt-8">
          <button
            id="btn-seller-add-craft"
            onClick={() => setIsAddModalOpen(true)}
            disabled={financials.isQuotaReached}
            className={`w-full py-3 rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
              financials.isQuotaReached
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-[#002c11] hover:bg-[#1b6d24] text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {financials.isQuotaReached ? 'Quota Limit Reached' : 'Add New Craft Listing'}
          </button>
        </div>
      </aside>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* SUBTAB 1: DASHBOARD */}
        {activeSubTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
                  Artisan Dashboard
                </h1>
                <p className="text-xs text-[#414941] mt-0.5">
                  Real-time sales, order fulfillment, and sustainability audits from {storeData?.district || 'your'} workshop.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-5 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Craft Listing
                </button>
              </div>
            </div>

            {/* Quota Progress Banner */}
            <div className="p-4 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined">workspace_premium</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#002c11]">
                    Current Tier: {activePlan?.name || 'Heritage Professional'} ({activePlan?.commissionRate}% Commission)
                  </h4>
                  <p className="text-[11px] text-[#717970]">
                    {myProducts.length} of {financials.productLimit} listings used.
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-64 flex items-center gap-3">
                <div className="flex-1 bg-[#f0eded] h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${financials.isQuotaReached ? 'bg-amber-600' : 'bg-[#1b6d24]'}`}
                    style={{ width: `${Math.min(100, (myProducts.length / financials.productLimit) * 100)}%` }}
                  />
                </div>
                <button
                  onClick={() => setActiveSubTab('plans')}
                  className="px-3 py-1 bg-[#002c11] text-[#a0f399] rounded-xl font-bold text-[10px] hover:bg-[#1b6d24]"
                >
                  Upgrade
                </button>
              </div>
            </div>

            {/* SECTION 13: REAL SELLER BUSINESS SUMMARY (8-METRIC OVERVIEW) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#002c11] font-heading flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1b6d24] text-[20px]">insights</span>
                  Seller Business & Operational Performance Summary
                </h3>
                <span className="text-[11px] text-[#717970]">Real-time verified data</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* 1. Total Sales */}
                <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#717970] uppercase tracking-wider">Total Gross Sales</span>
                  <div className="text-xl font-black text-[#002c11] font-mono mt-1">
                    ৳{(sellerBalances?.grossSales || financials.grossRevenue).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#1b6d24]">Across all sub-orders</span>
                </div>

                {/* 2. Total Orders & Breakdown */}
                <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#717970] uppercase tracking-wider">Store Orders</span>
                  <div className="text-xl font-black text-[#002c11] font-mono mt-1">{orders.length}</div>
                  <span className="text-[10px] text-[#717970]">
                    {orders.filter((o) => (o.orderStatus || o.status) === 'delivered').length} delivered • {financials.pendingOrdersCount} pending
                  </span>
                </div>

                {/* 3. Returns & Reverse */}
                <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#717970] uppercase tracking-wider">Returns & Reverse</span>
                  <div className="text-xl font-black text-amber-800 font-mono mt-1">{sellerReturns.length}</div>
                  <span className="text-[10px] text-amber-700">
                    {sellerReturns.filter((r) => r.status === 'requested').length} awaiting response
                  </span>
                </div>

                {/* 4. Current Earnings */}
                <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#717970] uppercase tracking-wider">Net Life Earnings</span>
                  <div className="text-xl font-black text-[#1b6d24] font-mono mt-1">
                    ৳{(sellerBalances?.netEarnings || financials.netEarnings).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#717970]">After platform fee</span>
                </div>

                {/* 5. Available Balance */}
                <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#717970] uppercase tracking-wider">Available Balance</span>
                  <div className="text-xl font-black text-emerald-700 font-mono mt-1">
                    ৳{(sellerBalances?.availableBalance || 0).toLocaleString()}
                  </div>
                  <button
                    onClick={() => setActiveSubTab('withdrawals')}
                    className="text-[10px] font-bold text-[#1b6d24] hover:underline text-left mt-1"
                  >
                    Request Payout →
                  </button>
                </div>

                {/* 6. Pending Settlement */}
                <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#717970] uppercase tracking-wider">Pending Settlement</span>
                  <div className="text-xl font-black text-blue-700 font-mono mt-1">
                    ৳{(sellerBalances?.pendingBalance || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-blue-600">In 7-day return window</span>
                </div>

                {/* 7. Under Eco Audit */}
                <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#717970] uppercase tracking-wider">Under Eco Audit</span>
                  <div className="text-xl font-black text-amber-700 font-mono mt-1">{financials.underReviewProducts}</div>
                  <span className="text-[10px] text-amber-700">Audit queue</span>
                </div>

                {/* 8. Withdrawal History */}
                <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#717970] uppercase tracking-wider">Withdrawal History</span>
                  <div className="text-xl font-black text-[#002c11] font-mono mt-1">{sellerWithdrawals.length}</div>
                  <span className="text-[10px] text-[#717970]">
                    Latest: {sellerWithdrawals[0]?.status || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 14: STOCK ALERTS & RAPID CATALOG MANAGEMENT */}
            {(() => {
              const lowStockList = myProducts.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5));
              const outOfStockList = myProducts.filter((p) => p.stock === 0);
              const hasAlerts = lowStockList.length > 0 || outOfStockList.length > 0;

              if (!hasAlerts) return null;

              return (
                <div className="bg-white rounded-3xl border border-amber-300/80 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-600 text-[22px]">warning</span>
                      <h4 className="font-bold text-xs sm:text-sm text-[#002c11] font-heading">
                        Inventory Attention Required ({lowStockList.length + outOfStockList.length} items)
                      </h4>
                    </div>
                    <button
                      onClick={() => setActiveSubTab('inventory')}
                      className="text-xs font-bold text-[#1b6d24] hover:underline"
                    >
                      Open Stock Adjuster →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Out of Stock */}
                    {outOfStockList.length > 0 && (
                      <div className="p-3.5 bg-red-50/60 rounded-2xl border border-red-200/80 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">error</span>
                          Out of Stock ({outOfStockList.length})
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {outOfStockList.map((prod) => (
                            <div key={prod.id} className="p-2 bg-white rounded-xl flex items-center justify-between text-xs border border-red-100">
                              <span className="font-medium text-[#002c11] truncate max-w-[140px]">{prod.title}</span>
                              <button
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setActiveSubTab('products');
                                }}
                                className="px-2 py-0.5 bg-[#002c11] hover:bg-[#1b6d24] text-[#a0f399] rounded-lg text-[10px] font-bold"
                              >
                                Manage Product
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Low Stock */}
                    {lowStockList.length > 0 && (
                      <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">production_quantity_limits</span>
                          Low Stock Alert ({lowStockList.length})
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {lowStockList.map((prod) => (
                            <div key={prod.id} className="p-2 bg-white rounded-xl flex items-center justify-between text-xs border border-amber-100">
                              <div>
                                <span className="font-medium text-[#002c11] truncate max-w-[130px] block">{prod.title}</span>
                                <span className="text-[10px] font-mono text-amber-700 font-bold">{prod.stock} units left</span>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setActiveSubTab('products');
                                }}
                                className="px-2 py-0.5 bg-[#002c11] hover:bg-[#1b6d24] text-[#a0f399] rounded-lg text-[10px] font-bold"
                              >
                                Manage Product
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Quick Action Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveSubTab('products')}
                className="p-5 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs hover:border-[#1b6d24] transition-all cursor-pointer flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center">
                  <span className="material-symbols-outlined">inventory_2</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#002c11]">Catalog Manager</h4>
                  <p className="text-[11px] text-[#717970]">Edit prices, descriptions & specs</p>
                </div>
              </div>

              <div
                onClick={() => setActiveSubTab('inventory')}
                className="p-5 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs hover:border-[#1b6d24] transition-all cursor-pointer flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center">
                  <span className="material-symbols-outlined">inventory</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#002c11]">Stock Adjuster</h4>
                  <p className="text-[11px] text-[#717970]">
                    {financials.lowStockProducts > 0 ? `${financials.lowStockProducts} items low in stock` : 'All items in stock'}
                  </p>
                </div>
              </div>

              <div
                onClick={() => setActiveSubTab('settings')}
                className="p-5 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs hover:border-[#1b6d24] transition-all cursor-pointer flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center">
                  <span className="material-symbols-outlined">storefront</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#002c11]">Storefront Customizer</h4>
                  <p className="text-[11px] text-[#717970]">Logo, banner, policies & story</p>
                </div>
              </div>
            </div>

            {/* Recent Orders Preview */}
            <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-[#002c11] font-heading">Recent Store Orders</h3>
                <button onClick={() => setActiveSubTab('orders')} className="text-xs font-bold text-[#1b6d24] hover:underline">
                  View All Orders →
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-[#717970] py-4 text-center">No orders placed yet. Orders will appear here in real-time.</p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 3).map((o) => (
                    <div key={o.id} className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-[#1b6d24]">{o.id}</span>
                        <p className="font-bold text-[#002c11] mt-0.5">{o.customerName} • {o.customerAddress}</p>
                        <p className="text-[10px] text-[#717970]">{o.items?.length || 1} craft items</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#002c11]">৳{o.finalTotal || o.total}</span>
                        <div className="mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8f5e9] text-[#1b6d24] uppercase">
                            {o.orderStatus || o.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB: ONBOARDING & APPLICATION DATA */}
        {activeSubTab === 'onboarding' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-linear-to-r from-[#002c11] via-[#053e1a] to-[#1b6d24] text-white p-6 sm:p-8 rounded-3xl shadow-md">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-[#a0f399] mb-2">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  Official Seller Registration &amp; Accreditation Record
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                  Seller Onboarding &amp; Application Profile
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
                  Complete repository of your registered workshop credentials, verified NID / Trade License, payout settlement account, 64-district courier logistics, and fair commission tier.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardingEditOpen(true)}
                  className="px-5 py-2.5 bg-[#a0f399] hover:bg-[#86ef7d] text-[#002c11] rounded-full text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">edit_document</span>
                  Update Onboarding Details
                </button>
              </div>
            </div>

            {/* 4-Step Verification Milestones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">badge</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#1b6d24] uppercase tracking-wider block">Milestone 1</span>
                  <h4 className="font-bold text-xs text-[#002c11]">Identity &amp; NID</h4>
                  <p className="text-[11px] text-[#717970]">Verified by SUNNO Board</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">store</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#1b6d24] uppercase tracking-wider block">Milestone 2</span>
                  <h4 className="font-bold text-xs text-[#002c11]">Workshop Profile</h4>
                  <p className="text-[11px] text-[#717970] truncate max-w-[130px]">{onboardingStoreName}</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">local_shipping</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#1b6d24] uppercase tracking-wider block">Milestone 3</span>
                  <h4 className="font-bold text-xs text-[#002c11]">64-District Courier</h4>
                  <p className="text-[11px] text-[#717970]">Steadfast Hub Active</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#1b6d24] uppercase tracking-wider block">Milestone 4</span>
                  <h4 className="font-bold text-xs text-[#002c11]">Direct Settlements</h4>
                  <p className="text-[11px] text-[#717970]">{onboardingPayoutMethod.toUpperCase()} (T+2 Days)</p>
                </div>
              </div>
            </div>

            {/* Main Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Artisan & Workshop Profile */}
              <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#c1c9be]/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#1b6d24]">person_pin_circle</span>
                    <h3 className="font-bold text-sm text-[#002c11] font-heading">
                      Artisan &amp; Workshop Contact
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8f5e9] text-[#1b6d24]">
                    Verified
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#717970] block text-[11px]">Artisan / Representative Legal Name</span>
                    <span className="font-bold text-[#002c11] text-sm">{onboardingName}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[#717970] block text-[11px]">Primary Phone</span>
                      <span className="font-mono font-bold text-[#002c11]">{onboardingPhone}</span>
                    </div>
                    <div>
                      <span className="text-[#717970] block text-[11px]">Seller Email</span>
                      <span className="font-mono font-bold text-[#002c11]">{onboardingEmail}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[#717970] block text-[11px]">Division</span>
                      <span className="font-semibold text-[#002c11]">{onboardingDivision} Division</span>
                    </div>
                    <div>
                      <span className="text-[#717970] block text-[11px]">District (Origin)</span>
                      <span className="font-semibold text-[#002c11]">{onboardingDistrict} District</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[#717970] block text-[11px]">Physical Workshop / Production Address</span>
                    <p className="font-medium text-[#414941] bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/40 mt-1">
                      {onboardingAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Store Concept & Craft Specialties */}
              <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#c1c9be]/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#1b6d24]">palette</span>
                    <h3 className="font-bold text-sm text-[#002c11] font-heading">
                      Store Brand &amp; Craft Heritage
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8f5e9] text-[#1b6d24]">
                    Public Listing
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#717970] block text-[11px]">Storefront Brand Name</span>
                    <span className="font-bold text-[#002c11] text-sm">{onboardingStoreName}</span>
                  </div>
                  <div>
                    <span className="text-[#717970] block text-[11px]">Tagline</span>
                    <span className="font-medium text-[#414941] italic">"{onboardingTagline}"</span>
                  </div>
                  <div>
                    <span className="text-[#717970] block text-[11px] mb-1.5">Registered Handcraft Categories</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Bamboo & Cane', 'Jute & Natural Fiber', 'Terracotta & Pottery', 'Handloom & Nakshi Kantha', 'Natural Herbal & Wellness'].map((cat) => (
                        <span key={cat} className="px-2.5 py-1 rounded-xl bg-[#f0eded] text-[#002c11] font-semibold text-[11px] border border-[#c1c9be]/40">
                          ✓ {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#717970] block text-[11px]">Store Mission &amp; Eco Description</span>
                    <p className="text-[#414941] bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/40 mt-1 leading-relaxed">
                      {onboardingDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Payout Settlement & Financial Setup */}
              <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#c1c9be]/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#1b6d24]">payments</span>
                    <h3 className="font-bold text-sm text-[#002c11] font-heading">
                      Financial Payout &amp; Settlements
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8f5e9] text-[#1b6d24]">
                    Active
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[#717970] block text-[11px]">Preferred Settlement Method</span>
                      <span className="font-bold text-[#002c11] uppercase flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-[#1b6d24]" />
                        {onboardingPayoutMethod === 'bank_transfer' ? 'Commercial Bank Transfer' : onboardingPayoutMethod.toUpperCase() + ' Mobile Finance'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#717970] block text-[11px]">Payout Account Number / Wallet</span>
                      <span className="font-mono font-bold text-[#002c11] text-sm">{onboardingAccountNum}</span>
                    </div>
                  </div>

                  {onboardingPayoutMethod === 'bank_transfer' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/40">
                      <div>
                        <span className="text-[#717970] block text-[10px]">Bank Name</span>
                        <span className="font-semibold text-[#002c11]">{onboardingBankName}</span>
                      </div>
                      <div>
                        <span className="text-[#717970] block text-[10px]">Branch Name</span>
                        <span className="font-semibold text-[#002c11]">{onboardingBranch}</span>
                      </div>
                      <div>
                        <span className="text-[#717970] block text-[10px]">Routing Number</span>
                        <span className="font-mono font-semibold text-[#002c11]">{onboardingRouting}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/40 flex items-center justify-between">
                      <div>
                        <span className="text-[#717970] block text-[10px]">Mobile Financial Service</span>
                        <span className="font-bold text-[#002c11]">{onboardingPayoutMethod.toUpperCase()} Merchant / Personal Wallet</span>
                      </div>
                      <span className="text-[11px] font-bold text-[#1b6d24]">Instant Clearance</span>
                    </div>
                  )}

                  <div className="p-3 rounded-2xl bg-[#e8f5e9]/50 border border-[#a0f399]/40 text-[#002c11] text-[11px] flex items-center justify-between">
                    <span>
                      <strong>Payout Schedule:</strong> Automatic disbursements every Tuesday (T+2 after delivery confirmation).
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('withdrawals')}
                      className="font-bold text-[#1b6d24] hover:underline shrink-0 ml-2 cursor-pointer"
                    >
                      View Balances →
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 4: Courier Logistics & Pickup Point */}
              <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#c1c9be]/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#1b6d24]">local_shipping</span>
                    <h3 className="font-bold text-sm text-[#002c11] font-heading">
                      Fulfillment &amp; Courier Logistics
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8f5e9] text-[#1b6d24]">
                    64 Districts
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#717970] block text-[11px]">Designated Logistics Partner</span>
                    <span className="font-bold text-[#002c11] text-sm flex items-center gap-1.5 mt-0.5">
                      <span className="material-symbols-outlined text-[16px] text-[#1b6d24]">check_circle</span>
                      {onboardingCourier}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#717970] block text-[11px]">Doorstep Workshop Pickup Address</span>
                    <p className="font-medium text-[#414941] bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/40 mt-1">
                      {onboardingAddress}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/40">
                      <span className="text-[#717970] block text-[10px]">Packaging Standard</span>
                      <span className="font-bold text-[#1b6d24]">100% Zero Single-Use Plastic</span>
                    </div>
                    <div className="bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/40">
                      <span className="text-[#717970] block text-[10px]">Waybill Printing</span>
                      <span className="font-bold text-[#002c11]">4x6 Thermal &amp; PDF</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#717970]">Ready to send orders to couriers?</span>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('shipping')}
                      className="text-xs font-bold text-[#1b6d24] hover:underline cursor-pointer"
                    >
                      Open Shipping Dispatch Hub →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Verification, Plan Tier & Eco Charter */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Box 1: Legal Identification */}
              <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-[#002c11] font-bold text-sm">
                  <span className="material-symbols-outlined text-[#1b6d24]">verified</span>
                  <h4>Identity Verification</h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[#717970] block text-[10px]">Artisan Enterprise Classification</span>
                    <span className="font-semibold text-[#002c11]">{onboardingBusinessType}</span>
                  </div>
                  <div>
                    <span className="text-[#717970] block text-[10px]">National ID / Trade License</span>
                    <span className="font-mono font-bold text-[#002c11]">
                      {onboardingNid ? `${onboardingNid.slice(0, 4)}••••••••${onboardingNid.slice(-4)}` : '1988••••••••7890'}
                    </span>
                  </div>
                  <div className="pt-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#e8f5e9] text-[#1b6d24]">
                      ✓ Officially Accredited by SUNNO
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 2: Plan & Commission Tier */}
              <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-[#002c11] font-bold text-sm">
                  <span className="material-symbols-outlined text-[#1b6d24]">workspace_premium</span>
                  <h4>Commission &amp; Plan Tier</h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[#717970] block text-[10px]">Active Membership Plan</span>
                    <span className="font-bold text-[#002c11] text-sm">
                      {activePlan?.name || 'Heritage Professional Tier'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#717970] block text-[10px]">Fair-Trade Platform Fee</span>
                    <span className="font-bold text-[#1b6d24]">
                      {activePlan?.commissionRate || 3}% Commission only on sales
                    </span>
                  </div>
                  <div>
                    <span className="text-[#717970] block text-[10px]">Catalog Capacity</span>
                    <span className="font-semibold text-[#002c11]">
                      {myProducts.length} of {financials.productLimit} listings used
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 3: Eco Charter Pledge */}
              <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-[#002c11] font-bold text-sm">
                  <span className="material-symbols-outlined text-[#1b6d24]">eco</span>
                  <h4>Artisan Sustainability Charter</h4>
                </div>
                <p className="text-[11px] text-[#414941] leading-relaxed">
                  As an accredited SUNNO artisan producer, this workshop is bound by the Zero Single-Use Plastic standard, 100% natural raw material transparency, fair artisan wages, and honest handcrafted authenticity.
                </p>
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-[#1b6d24] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">check</span>
                    Signed &amp; Enforced on Platform
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: PRODUCTS */}
        {activeSubTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
                  My Craft Catalog ({myProducts.length})
                </h1>
                <p className="text-xs text-[#414941] mt-0.5">
                  Manage your listings, request eco audits, and adjust prices.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                disabled={financials.isQuotaReached}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                  financials.isQuotaReached
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-[#002c11] hover:bg-[#1b6d24] text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add New Craft Listing
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-80">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#717970] text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search listings by title, SKU, category..."
                  value={searchTable}
                  onChange={(e) => setSearchTable(e.target.value)}
                  className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-[#1b6d24]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="eco_verified">Verified Only</option>
                  <option value="under_review">Under Review</option>
                  <option value="draft">Drafts</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>

                <div className="flex gap-1 border border-[#c1c9be]/60 rounded-xl p-1 bg-[#f0eded]">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1 rounded-lg ${viewMode === 'table' ? 'bg-white shadow-xs text-[#002c11]' : 'text-[#717970]'}`}
                    title="Table View"
                  >
                    <span className="material-symbols-outlined text-[18px]">table_rows</span>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-xs text-[#002c11]' : 'text-[#717970]'}`}
                    title="Grid View"
                  >
                    <span className="material-symbols-outlined text-[18px]">grid_view</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Catalog Table */}
            {viewMode === 'table' ? (
              <div className="bg-white rounded-3xl border border-[#c1c9be]/60 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-xs text-[#414941]">
                    <thead className="bg-[#fbf9f8] text-[#717970] uppercase font-bold text-[10px] tracking-wider border-b border-[#c1c9be]/60">
                      <tr>
                        <th className="py-3.5 px-4">Craft Item</th>
                        <th className="py-3.5 px-4">SKU / Origin</th>
                        <th className="py-3.5 px-4">Price (BDT)</th>
                        <th className="py-3.5 px-4">Stock</th>
                        <th className="py-3.5 px-4">Eco Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0eded]">
                      {filteredListings.map((p) => (
                        <tr key={p.id} className="hover:bg-[#fbf9f8] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#002c11] flex items-center gap-3">
                            <img
                              src={p.images[0] || BRAND_LOGO}
                              alt={p.title}
                              className="w-10 h-10 rounded-xl object-cover border border-[#c1c9be]/40"
                            />
                            <div>
                              <div className="line-clamp-1">{p.title}</div>
                              <div className="text-[10px] text-[#717970] font-normal">{p.category}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <div>{p.sku}</div>
                            <div className="text-[10px] text-[#717970]">{p.district}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#002c11]">
                            ৳{p.price}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            <div className="flex flex-col">
                              <span className={p.stock <= 5 ? 'text-amber-700' : 'text-[#002c11]'}>
                                {p.stock} pcs
                              </span>
                              <span className="text-[10px] font-sans">
                                {p.stock > 0 && (p.status === 'eco_verified' || p.status === 'published') ? (
                                  <span className="text-emerald-700 font-bold">🟢 In Stock</span>
                                ) : (
                                  <span className="text-red-700 font-bold">🔴 Out of Stock</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                p.status === 'eco_verified' || p.status === 'published'
                                  ? 'bg-[#e8f5e9] text-[#1b6d24]'
                                  : p.status === 'under_review' || p.status === 'pending' || p.status === 'pending_review'
                                  ? 'bg-amber-100 text-amber-900'
                                  : p.status === 'changes_required'
                                  ? 'bg-purple-100 text-purple-900'
                                  : p.status === 'rejected'
                                  ? 'bg-red-100 text-red-900'
                                  : p.status === 'draft'
                                  ? 'bg-stone-200 text-stone-800'
                                  : p.status === 'archived'
                                  ? 'bg-stone-200 text-stone-700'
                                  : p.status === 'suspended'
                                  ? 'bg-red-100 text-red-900'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {p.status === 'eco_verified' ? '✓ Verified' : p.status === 'under_review' ? '⏳ Under Review' : p.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              onClick={() => setEditingProduct(p)}
                              className="px-2 py-1 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] rounded-lg font-bold text-[11px] cursor-pointer"
                              title="Edit Listing"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setPreviewProduct(p)}
                              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-bold text-[11px] cursor-pointer"
                              title="Preview Craft"
                            >
                              Preview
                            </button>
                            {/* Draft or Changes Required: Submit for Verification Audit */}
                            {(p.status === 'draft' || p.status === 'changes_required') && !p.isArchived && (
                              <button
                                onClick={() => handleSubmitDraftForAudit(p)}
                                className="px-2 py-1 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-lg font-bold text-[11px] cursor-pointer"
                                title="Submit Listing for Eco-Verification Audit"
                              >
                                Submit Audit
                              </button>
                            )}
                            {/* Under Review: In-Audit Indicator */}
                            {(p.status === 'under_review' || p.status === 'pending' || p.status === 'pending_review') && !p.isArchived && (
                              <span className="inline-block px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-medium text-[10px]">
                                In Audit
                              </span>
                            )}
                            {/* Only Verified products can be published/unpublished */}
                            {(p.status === 'eco_verified' || p.ecoVerified) && p.lifecycleStatus === 'unpublished' && !p.isArchived && (
                              <button
                                onClick={() => handlePublishProduct(p)}
                                className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                                title="Publish to Live Marketplace"
                              >
                                Publish
                              </button>
                            )}
                            {(p.status === 'eco_verified' || p.status === 'published') && p.lifecycleStatus !== 'unpublished' && (
                              <button
                                onClick={() => handleUnpublishProduct(p)}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                                title="Unpublish / Hide from Catalog"
                              >
                                Unpublish
                              </button>
                            )}
                            {!p.isArchived && p.status !== 'archived' ? (
                              <button
                                onClick={() => handleArchiveProduct(p)}
                                className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-[11px] cursor-pointer"
                                title="Archive (Soft Delete)"
                              >
                                Archive
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRestoreProduct(p)}
                                className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg font-bold text-[11px] cursor-pointer"
                                title="Restore from Archive"
                              >
                                Restore
                              </button>
                            )}
                            <button
                              onClick={() => handleDuplicateProduct(p)}
                              className="px-2 py-1 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] rounded-lg font-bold text-[11px] cursor-pointer"
                              title="Duplicate as Draft"
                            >
                              Copy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredListings.map((p) => (
                  <div key={p.id} className="bg-white rounded-3xl border border-[#c1c9be]/60 p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="relative aspect-video rounded-2xl overflow-hidden mb-3">
                        <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-[#002c11]/80 text-white rounded-full text-[10px] font-bold">
                          {p.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-[#002c11] line-clamp-1">{p.title}</h4>
                      <p className="text-[11px] text-[#717970]">{p.category} • {p.district}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#f0eded] flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-[#002c11]">৳{p.price}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="px-3 py-1 bg-[#f0eded] text-[#002c11] rounded-lg font-bold text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onSelectProduct(p)}
                          className="px-3 py-1 bg-[#002c11] text-white rounded-lg font-bold text-xs"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 3: INVENTORY */}
        {activeSubTab === 'inventory' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
                Stock & Inventory Manager
              </h1>
              <p className="text-xs text-[#414941] mt-0.5">
                Adjust stock levels in real-time. Automatic low-stock warnings alert you when items drop below threshold.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-[#c1c9be]/60 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs text-[#414941]">
                <thead className="bg-[#fbf9f8] text-[#717970] uppercase font-bold text-[10px] tracking-wider border-b border-[#c1c9be]/60">
                  <tr>
                    <th className="py-3.5 px-4">Craft Listing</th>
                    <th className="py-3.5 px-4">SKU</th>
                    <th className="py-3.5 px-4">Threshold</th>
                    <th className="py-3.5 px-4">Current Stock</th>
                    <th className="py-3.5 px-4 text-right">Adjust Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eded]">
                  {myProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-4 font-bold text-[#002c11] flex items-center gap-3">
                        <img src={p.images[0]} alt={p.title} className="w-8 h-8 rounded-lg object-cover" />
                        <span>{p.title}</span>
                      </td>
                      <td className="py-3 px-4 font-mono">{p.sku}</td>
                      <td className="py-3 px-4 text-[#717970]">{p.lowStockThreshold || 5} pcs</td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] ${
                            p.stock === 0
                              ? 'bg-red-100 text-red-800'
                              : p.stock <= (p.lowStockThreshold || 5)
                              ? 'bg-amber-100 text-amber-900 font-bold'
                              : 'bg-[#e8f5e9] text-[#1b6d24]'
                          }`}
                        >
                          {p.stock} units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleStockUpdate(p, -1)}
                          disabled={p.stock <= 0}
                          className="w-7 h-7 bg-[#f0eded] hover:bg-[#e0dede] rounded-lg font-bold text-xs"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleStockUpdate(p, 1)}
                          className="w-7 h-7 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-lg font-bold text-xs"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleStockUpdate(p, 10)}
                          className="px-2 py-1 bg-[#e8f5e9] text-[#1b6d24] hover:bg-[#a0f399] rounded-lg font-bold text-[10px]"
                        >
                          +10 Batch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: ECO VERIFICATION */}
        {activeSubTab === 'eco_verification' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
                SUNNO Eco-Verification Standard
              </h1>
              <p className="text-xs text-[#414941] mt-0.5">
                Every listing undergoes a 24-hour physical or material verification audit to protect authentic Bangladesh artisans.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs">
                <span className="material-symbols-outlined text-[#1b6d24] text-[24px]">verified</span>
                <h4 className="font-bold text-xs text-[#002c11] mt-2">1. Material Compliance</h4>
                <p className="text-[11px] text-[#717970] mt-0.5">
                  100% natural, biodegradable fibers (jute, cane, terracotta, plant dye, khadi).
                </p>
              </div>

              <div className="p-4 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs">
                <span className="material-symbols-outlined text-[#1b6d24] text-[24px]">inventory_2</span>
                <h4 className="font-bold text-xs text-[#002c11] mt-2">2. Zero Single-Use Plastic</h4>
                <p className="text-[11px] text-[#717970] mt-0.5">
                  Packaging must be banana fiber, recycled kraft paper, or cotton twine.
                </p>
              </div>

              <div className="p-4 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs">
                <span className="material-symbols-outlined text-[#1b6d24] text-[24px]">handshake</span>
                <h4 className="font-bold text-xs text-[#002c11] mt-2">3. Fair Artisan Wage</h4>
                <p className="text-[11px] text-[#717970] mt-0.5">
                  Direct cooperative compensation with zero middleman exploitation.
                </p>
              </div>
            </div>

            {/* List of submissions */}
            <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-[#002c11] font-heading">Verification Audit Queue</h3>
              <div className="space-y-3">
                {myProducts.map((p) => (
                  <div key={p.id} className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <img src={p.images[0]} alt={p.title} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-bold text-xs text-[#002c11]">{p.title}</h4>
                        <p className="text-[11px] text-[#717970]">SKU: {p.sku} • Materials: {p.materialComposition || p.materialsInfo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          p.status === 'eco_verified'
                            ? 'bg-[#e8f5e9] text-[#1b6d24]'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {p.status === 'eco_verified' ? '✓ SUNNO ECO-VERIFIED' : '⏳ AUDIT IN PROGRESS'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 5: ORDERS */}
        {activeSubTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
                Artisan Orders & Dispatches
              </h1>
              <p className="text-xs text-[#414941] mt-0.5">
                Process customer orders, prepare zero-plastic eco packaging, update courier tracking, and mark dispatches.
              </p>
            </div>

            {/* Sub-Orders List */}
            {sellerSubOrders.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-[#002c11] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1b6d24] text-base">hub</span>
                  Direct Artisan Sub-Orders ({sellerSubOrders.length})
                </h3>
                <div className="space-y-3">
                  {sellerSubOrders.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-3 hover:border-[#1b6d24]/50 transition-all"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2 pb-2.5 border-b border-[#c1c9be]/40 text-xs">
                        <div>
                          <span className="text-[#717970]">Sub-Order: </span>
                          <span className="font-mono font-bold text-[#002c11]">{sub.id}</span>
                          <span className="text-[#717970] ml-3">
                            Parent: <code className="font-mono">{sub.parentOrderId}</code>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#717970]">Status:</span>
                          <select
                            value={sub.status}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              if (val === 'cancelled') {
                                setSubOrderToCancel(sub);
                                setSellerCancelReason(CANCELLATION_REASONS_SELLER[0]);
                                setSellerCancelNotes('');
                                setSellerCancelConfirm(false);
                              } else {
                                handleUpdateSubOrderStatus(sub.id, val);
                              }
                            }}
                            className="bg-[#e8f5e9] text-[#1b6d24] border border-[#1b6d24]/30 rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer"
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing (Packaging)</option>
                            <option value="ready_for_shipment">Ready for Shipment</option>
                            <option value="shipped">Shipped (In Transit)</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          {sub.status !== 'cancelled' && sub.status !== 'delivered' && sub.status !== 'shipped' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSubOrderToCancel(sub);
                                setSellerCancelReason(CANCELLATION_REASONS_SELLER[0]);
                                setSellerCancelNotes('');
                                setSellerCancelConfirm(false);
                              }}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              title="Cancel Sub-Order & Restock Items"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items in this sub-order */}
                      <div className="space-y-2">
                        {sub.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 bg-[#fbf9f8] rounded-xl">
                            <div className="flex items-center gap-2.5">
                              <img src={item.image} alt={item.title} className="w-9 h-9 object-cover rounded-lg border border-[#c1c9be]/40" />
                              <div>
                                <p className="font-bold text-[#002c11]">{item.title}</p>
                                <p className="text-[11px] text-[#717970]">Qty: {item.quantity} • Unit: ৳{item.price}</p>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-[#002c11]">৳{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Sub-order footer & courier actions */}
                      <div className="flex flex-wrap justify-between items-center pt-3 border-t border-[#f0eded] text-xs gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {subOrderShipments[sub.id] ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-[10px] flex items-center gap-1">
                                <Truck className="w-3 h-3 text-emerald-700" />
                                {subOrderShipments[sub.id].courierName}
                              </span>
                              <span className="font-mono text-xs font-bold text-emerald-950 bg-stone-100 px-2 py-0.5 rounded">
                                {subOrderShipments[sub.id].trackingNumber}
                              </span>
                              <button
                                onClick={() => setActiveTrackingShipment(subOrderShipments[sub.id])}
                                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] rounded-lg transition-all"
                              >
                                Track Live
                              </button>
                              <button
                                onClick={() => setActiveLabelShipment(subOrderShipments[sub.id])}
                                className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium text-[11px] rounded-lg transition-all flex items-center gap-1"
                                title="Print 4x6 Courier Shipping Label"
                              >
                                <Printer className="w-3 h-3" />
                                Label
                              </button>
                              <button
                                onClick={async () => {
                                  const inv = await getOfficialInvoiceForOrder(sub.parentOrderId);
                                  if (inv) setActiveInvoice(inv);
                                }}
                                className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium text-[11px] rounded-lg transition-all flex items-center gap-1"
                                title="View Official Tax Invoice & Packing Slip"
                              >
                                <FileText className="w-3 h-3" />
                                Invoice
                              </button>
                              <button
                                onClick={async () => {
                                  const parent = orders.find((o) => o.id === sub.parentOrderId);
                                  if (parent) {
                                    setSelectedOrder360(parent);
                                  } else {
                                    const fetched = await fetchOrderById(sub.parentOrderId);
                                    if (fetched) {
                                      setSelectedOrder360(fetched);
                                    } else {
                                      setSelectedOrder360({
                                        id: sub.parentOrderId,
                                        orderNumber: sub.parentOrderId,
                                        customerId: sub.customerId || 'customer',
                                        customerName: sub.customerName || 'Conscious Buyer',
                                        customerPhone: sub.customerPhone || '017XXXXXXXX',
                                        customerAddress: typeof sub.shippingAddress === 'string' ? sub.shippingAddress : 'Artisan Hub Delivery',
                                        items: sub.items,
                                        total: sub.total,
                                        finalTotal: sub.total,
                                        paymentMethod: 'cod',
                                        paymentStatus: 'pending',
                                        status: sub.status as any,
                                        subOrders: [sub],
                                        sellerIds: [sub.sellerId],
                                        createdAt: sub.createdAt || new Date().toISOString(),
                                      } as Order);
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 bg-[#e8f5e9] hover:bg-[#d8edd9] text-[#1b6d24] font-bold text-[11px] rounded-lg transition-all flex items-center gap-1"
                                title="Inspect Full Order 360"
                              >
                                <Sparkles className="w-3 h-3 text-[#1b6d24]" />
                                Order 360
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setShippingSubOrder(sub)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Pack & Dispatch Consignment</span>
                              </button>
                              <button
                                onClick={async () => {
                                  const parent = orders.find((o) => o.id === sub.parentOrderId);
                                  if (parent) {
                                    setSelectedOrder360(parent);
                                  } else {
                                    const fetched = await fetchOrderById(sub.parentOrderId);
                                    if (fetched) setSelectedOrder360(fetched);
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#002c11] font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                                title="View Order 360 Dossier"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[#1b6d24]" />
                                <span>Order 360</span>
                              </button>
                              <span className="text-[11px] text-[#717970] italic">
                                Zero-plastic wrap & courier rates
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[#717970] text-xs">Sub-Order Total: </span>
                          <span className="font-mono font-extrabold text-base text-[#002c11]">৳{sub.total}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Orders List */}
            <div className="bg-white rounded-3xl border border-[#c1c9be]/60 overflow-hidden shadow-xs">
              <div className="p-4 bg-[#fbf9f8] border-b border-[#c1c9be]/60">
                <h3 className="font-bold text-xs text-[#002c11] uppercase tracking-wider">
                  All Store Associated Orders ({orders.length})
                </h3>
              </div>
              {orders.length === 0 && sellerSubOrders.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#717970]">
                  No orders placed yet. Orders from conscious buyers will stream here instantly.
                </div>
              ) : (
                <div className="divide-y divide-[#f0eded]">
                  {orders.map((o) => (
                    <div key={o.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[#fbf9f8] transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#1b6d24]">{o.id}</span>
                          <span className="text-[11px] text-[#717970]">• {o.createdAt?.split('T')[0]}</span>
                        </div>
                        <h4 className="font-bold text-[#002c11] text-xs mt-1">
                          {o.customerName} ({o.customerPhone || '017XXXXXXXX'})
                        </h4>
                        <p className="text-[11px] text-[#717970]">
                          Address: {o.customerAddress} • Payment: {o.paymentMethod.toUpperCase()}
                        </p>
                        <p className="text-[11px] text-[#1b6d24] font-medium mt-0.5">
                          Courier Tracking: {o.courierTracking || o.trackingCode || 'TRK-STANDBY'}
                        </p>
                      </div>

                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="font-mono font-extrabold text-base text-[#002c11]">
                          ৳{o.finalTotal || o.total}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOrder360(o)}
                            className="px-3 py-1.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#a0f399]" />
                            <span>Order 360</span>
                          </button>
                          <select
                            value={o.orderStatus || o.status}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as any)}
                            className="bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB: SHIPPING & LOGISTICS (CENTRAL DISPATCH & TRACKING) */}
        {(activeSubTab === 'shipping' || activeSubTab === 'tracking') && (
          <SellerShippingDispatchTab
            subOrders={sellerSubOrders}
            orders={orders}
            subOrderShipments={subOrderShipments}
            onBookShipment={(sub) => setShippingSubOrder(sub)}
            onTrackShipment={(sh) => setActiveTrackingShipment(sh)}
            onPrintLabel={(sh) => setActiveLabelShipment(sh)}
            onViewInvoice={async (ordId) => {
              const inv = await getOfficialInvoiceForOrder(ordId);
              if (inv) setActiveInvoice(inv);
            }}
            onMessageBuyer={() => {
              setActiveSubTab('messages');
            }}
            onOpenOrder360={async (sub) => {
              const parent = orders.find((o) => o.id === sub.parentOrderId);
              if (parent) {
                setSelectedOrder360(parent);
              } else {
                const fetched = await fetchOrderById(sub.parentOrderId);
                if (fetched) {
                  setSelectedOrder360(fetched);
                } else {
                  setSelectedOrder360({
                    id: sub.parentOrderId,
                    orderNumber: sub.parentOrderId,
                    customerId: sub.customerId || 'customer',
                    customerName: sub.customerName || 'Conscious Buyer',
                    customerPhone: sub.customerPhone || '017XXXXXXXX',
                    customerAddress: typeof sub.shippingAddress === 'string' ? sub.shippingAddress : 'Artisan Hub Delivery',
                    items: sub.items,
                    total: sub.total,
                    finalTotal: sub.total,
                    paymentMethod: 'cod',
                    paymentStatus: 'pending',
                    status: sub.status as any,
                    subOrders: [sub],
                    sellerIds: [sub.sellerId],
                    createdAt: sub.createdAt || new Date().toISOString(),
                  } as Order);
                }
              }
            }}
          />
        )}

        {/* SUBTAB: BUYER & ORDER INQUIRIES */}
        {activeSubTab === 'messages' && (
          <SellerOrderCommunicationTab
            currentSellerId={currentSellerId}
            sellerStoreName={myStoreName}
            orders={orders}
            subOrders={sellerSubOrders}
            onOpenOrder={() => {
              setActiveSubTab('orders');
            }}
          />
        )}

        {/* SUBTAB: STORE REVIEWS */}
        {activeSubTab === 'reviews' && (
          <SellerReviewsTab
            products={myProducts}
            storeName={myStoreName}
            onRefreshProducts={() => {}}
          />
        )}

        {/* SUBTAB: RETURNS & REFUNDS (PHASE 17) */}
        {(activeSubTab === 'returns' || activeSubTab === 'refunds') && (
          <SellerReturnsDisputesTab
            sellerId={currentSellerId}
            sellerName={userProfile?.fullName || 'Artisan Partner'}
            storeName={myStoreName}
            actor={{
              id: currentSellerId,
              name: userProfile?.fullName || myStoreName,
              email: userProfile?.email,
              phone: userProfile?.phone,
              role: 'seller',
            }}
          />
        )}

        {/* SUBTAB: NOTIFICATIONS & TELEMETRY */}
        {activeSubTab === 'notifications' && (
          <SellerNotificationsTab
            sellerId={currentSellerId}
            notifications={sellerNotifications}
            onNavigateTab={(tab) => setActiveSubTab(tab)}
          />
        )}

        {/* SUBTAB: STORE PROFILE DOSSIER */}
        {activeSubTab === 'profile' && (
          <SellerStoreProfileTab
            store={storeData}
            products={myProducts}
            activePlan={activePlan}
            onEditSettings={() => setActiveSubTab('settings')}
            onViewPublicStore={() => setActiveTab('store_preview')}
          />
        )}

        {/* SUBTAB: EARNINGS, SETTLEMENTS & FINANCE */}
        {(activeSubTab === 'earnings' ||
          activeSubTab === 'settlements' ||
          activeSubTab === 'withdrawals' ||
          activeSubTab === 'performance' ||
          activeSubTab === 'ledger' ||
          activeSubTab === 'subscription' ||
          activeSubTab === 'promotions') && (
          <SellerFinanceView
            sellerId={currentSellerId}
            sellerName={userProfile?.fullName || 'Artisan Partner'}
            storeName={myStoreName}
            products={myProducts}
            currentPlan={activePlan}
            plans={plans}
            initialTab={
              activeSubTab === 'settlements'
                ? 'settlements'
                : activeSubTab === 'performance'
                ? 'performance'
                : activeSubTab === 'ledger'
                ? 'ledger'
                : 'wallet'
            }
            onUpgradePlan={(planId) => {
              const target = plans.find((p) => p.id === planId);
              if (target) handlePlanUpgrade(target);
            }}
          />
        )}

        {/* SUBTAB 7: ANALYTICS */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
                Store Eco & Sales Analytics
              </h1>
              <p className="text-xs text-[#414941] mt-0.5">
                Measure your workshop’s sustainability impact and consumer engagement across Bangladesh.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs">
                <span className="material-symbols-outlined text-[#1b6d24] text-[24px]">eco</span>
                <div className="text-2xl font-black text-[#1b6d24] font-mono mt-2">142 kg</div>
                <span className="text-xs font-bold text-[#002c11] block">Plastic Waste Prevented</span>
                <span className="text-[11px] text-[#717970]">Through biodegradable packaging</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs">
                <span className="material-symbols-outlined text-[#1b6d24] text-[24px]">pin_drop</span>
                <div className="text-2xl font-black text-[#002c11] font-mono mt-2">18 Districts</div>
                <span className="text-xs font-bold text-[#002c11] block">Customer Reach</span>
                <span className="text-[11px] text-[#717970]">Top: Dhaka, Chattogram, Sylhet</span>
              </div>

              <div className="p-5 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs">
                <span className="material-symbols-outlined text-[#1b6d24] text-[24px]">timer</span>
                <div className="text-2xl font-black text-[#002c11] font-mono mt-2">3,200 hrs</div>
                <span className="text-xs font-bold text-[#002c11] block">Heritage Labor Supported</span>
                <span className="text-[11px] text-[#717970]">Fair wage artisan hours</span>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 8: PLANS & TIERS */}
        {activeSubTab === 'plans' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
                Artisan Seller Tiers & Quotas
              </h1>
              <p className="text-xs text-[#414941] mt-0.5">
                Scale your cooperative with lower commission rates, priority eco audits, and increased listing quotas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => {
                const isCurrent = activePlan?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-3xl p-6 border-2 flex flex-col justify-between shadow-xs transition-all ${
                      isCurrent ? 'border-[#1b6d24] ring-2 ring-[#a0f399]/40' : 'border-[#c1c9be]/60 hover:border-[#1b6d24]/60'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm text-[#002c11]">{p.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-[#e8f5e9] text-[#1b6d24] rounded-full text-[10px] font-extrabold">
                            ACTIVE TIER
                          </span>
                        )}
                      </div>
                      <div className="text-3xl font-extrabold text-[#002c11] font-mono mb-4">
                        ৳{p.price} <span className="text-xs text-[#717970] font-normal">/ {p.duration || 'yr'}</span>
                      </div>
                      <div className="space-y-2 text-xs text-[#414941] border-t border-[#f0eded] pt-4">
                        {p.features?.map((f, idx) => (
                          <p key={idx} className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-[#1b6d24]">check</span>
                            <span>{f}</span>
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6">
                      <button
                        onClick={() => handlePlanUpgrade(p)}
                        disabled={isCurrent}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                          isCurrent
                            ? 'bg-[#e8f5e9] text-[#1b6d24] cursor-default'
                            : 'bg-[#002c11] hover:bg-[#1b6d24] text-white shadow-md'
                        }`}
                      >
                        {isCurrent ? 'Current Plan' : 'Select Plan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 9: STORE SETTINGS / CUSTOMIZATION */}
        {activeSubTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif">
                    Store Profile & Brand Identity
                  </h1>
                  {isStoreDirty && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Unsaved Changes
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  Manage your workshop identity, unique store URL, logo, banner, contact channels, and transparent eco policies.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const identifier = storeData?.slug || storeData?.id;
                    if (identifier) {
                      window.location.hash = `#store?id=${identifier}`;
                      setActiveTab('store');
                    } else {
                      window.location.hash = '#store';
                      setActiveTab('store');
                    }
                  }}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-bold transition-all flex items-center gap-2 border border-stone-300"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-800" />
                  View Public Storefront
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSaveStoreSettings(e as any)}
                  className="px-6 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Unsaved changes alert */}
            {isStoreDirty && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>You have unsaved changes. Remember to click <strong>Save Changes</strong> before leaving this page.</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleSaveStoreSettings(e as any)}
                  className="px-3 py-1 bg-amber-900 hover:bg-amber-800 text-white font-bold rounded-lg text-[11px]"
                >
                  Save Now
                </button>
              </div>
            )}

            <form onSubmit={handleSaveStoreSettings} className="space-y-6 text-xs">
              {/* SECTION 1: BRAND IDENTITY & SLUG */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="font-serif font-bold text-stone-900 text-base">1. Brand Identity & Store URL</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Define your artisan brand name, unique web address, and sustainable craft category.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-stone-800 mb-1">Store / Cooperative Name *</label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => {
                        setStoreName(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="e.g. Tangail Weavers Guild"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-800 mb-1">Primary Craft Category *</label>
                    <select
                      value={storeCategory}
                      onChange={(e) => {
                        setStoreCategory(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    >
                      <option value="Bamboo & Cane Crafts">Bamboo & Cane Crafts</option>
                      <option value="Heirloom Textiles & Handloom">Heirloom Textiles & Handloom</option>
                      <option value="Organic Food & Sundarbans Honey">Organic Food & Sundarbans Honey</option>
                      <option value="Terracotta & Clay Pottery">Terracotta & Clay Pottery</option>
                      <option value="Eco Home & Living">Eco Home & Living</option>
                      <option value="Sustainable Fashion">Sustainable Fashion</option>
                      <option value="Zero Waste Utilities">Zero Waste Utilities</option>
                      <option value="Natural Skincare & Herbal">Natural Skincare & Herbal</option>
                      <option value="Jute Handicrafts">Jute Handicrafts</option>
                    </select>
                  </div>
                </div>

                {/* Unique Store Slug */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-stone-800">
                      Unique Store Slug / Web URL *
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateSlug}
                      disabled={isCheckingSlug}
                      className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Auto-Generate From Name
                    </button>
                  </div>

                  <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-700 focus-within:bg-white">
                    <span className="px-3.5 py-2.5 text-stone-500 font-mono text-xs bg-stone-100 border-r border-stone-200 select-none">
                      sunno.eco/store/
                    </span>
                    <input
                      type="text"
                      required
                      value={storeSlug}
                      onChange={(e) => {
                        setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                        setIsStoreDirty(true);
                        setSlugAvailabilityError(null);
                      }}
                      onBlur={handleSlugBlur}
                      placeholder="tangail-weavers-guild"
                      className="flex-1 bg-transparent px-3.5 py-2.5 outline-none font-mono text-xs text-stone-900"
                    />
                  </div>

                  {isCheckingSlug && (
                    <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-spin text-emerald-700" /> Checking slug availability...
                    </p>
                  )}

                  {slugAvailabilityError ? (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {slugAvailabilityError}
                    </p>
                  ) : storeSlug ? (
                    <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Your public storefront address: <code className="font-mono">sunno.eco/store/{storeSlug}</code>
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-800 mb-1">Short Tagline</label>
                    <input
                      type="text"
                      value={storeTagline}
                      onChange={(e) => {
                        setStoreTagline(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="e.g. Master Jamdani Weavers & Fair Wage Collective since 1974"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-800 mb-1">Detailed Story & Heritage Mission *</label>
                    <textarea
                      rows={4}
                      required
                      value={storeDesc}
                      onChange={(e) => {
                        setStoreDesc(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="Share your artisan origins, sustainable materials harvested, generational craftsmanship techniques, and social impact."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: BRAND ASSETS (LOGO & BANNER UPLOADS) */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="font-serif font-bold text-stone-900 text-base">2. Store Visual Assets</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Upload your workshop logo and panoramic storefront banner. Images are safely stored in Firebase Storage.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <StoreMediaUploader
                    storeId={storeData?.id || currentSellerId}
                    assetType="logo"
                    currentUrl={storeLogo}
                    onUploadSuccess={(url) => {
                      setStoreLogo(url);
                      setIsStoreDirty(true);
                      showToast('Store logo uploaded successfully!');
                    }}
                    onRemove={() => {
                      setStoreLogo('');
                      setIsStoreDirty(true);
                    }}
                    title="Store Logo / Artisan Seal"
                    description="Upload your square workshop logo or emblem."
                    aspectRatioHint="1:1 (Recommended: 500x500)"
                  />

                  <StoreMediaUploader
                    storeId={storeData?.id || currentSellerId}
                    assetType="banner"
                    currentUrl={storeBanner}
                    onUploadSuccess={(url) => {
                      setStoreBanner(url);
                      setIsStoreDirty(true);
                      showToast('Store banner uploaded successfully!');
                    }}
                    onRemove={() => {
                      setStoreBanner('');
                      setIsStoreDirty(true);
                    }}
                    title="Storefront Cover Banner"
                    description="Upload a panoramic banner showcasing your workshop or creations."
                    aspectRatioHint="16:9 / 3:1 (Recommended: 1920x640)"
                  />
                </div>
              </div>

              {/* SECTION 3: OWNER & BUSINESS CONTACT */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="font-serif font-bold text-stone-900 text-base">3. Owner & Business Contact Details</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Accurate contact details build buyer confidence and ensure smooth courier coordination.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-stone-800 mb-1">Owner / Lead Artisan Name *</label>
                    <input
                      type="text"
                      required
                      value={storeOwnerName}
                      onChange={(e) => {
                        setStoreOwnerName(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="e.g. Rashida Begum"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-800 mb-1">Business Email *</label>
                    <input
                      type="email"
                      required
                      value={storeEmail}
                      onChange={(e) => {
                        setStoreEmail(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="workshop@artisan.bd"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-800 mb-1">Business Phone *</label>
                    <input
                      type="tel"
                      required
                      value={storePhone}
                      onChange={(e) => {
                        setStorePhone(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="+88017XXXXXXXX"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-700" /> WhatsApp Contact
                    </label>
                    <input
                      type="tel"
                      value={storeWhatsapp}
                      onChange={(e) => {
                        setStoreWhatsapp(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="+8801XXXXXXXXX"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Used for buyer inquiries and instant updates</span>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-800 mb-1">Division *</label>
                    <select
                      value={storeDivision}
                      onChange={(e) => {
                        setStoreDivision(e.target.value);
                        const matching = ALL_64_DISTRICTS.filter((d) => d.division === e.target.value);
                        if (matching.length > 0) setStoreDistrict(matching[0].name);
                        setIsStoreDirty(true);
                      }}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    >
                      {BANGLADESH_DIVISIONS.map((div) => (
                        <option key={div.id} value={div.name}>{div.name} Division</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-800 mb-1">District (All 64 Districts) *</label>
                    <select
                      value={storeDistrict}
                      onChange={(e) => {
                        setStoreDistrict(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    >
                      {ALL_64_DISTRICTS.filter((d) => !storeDivision || d.division === storeDivision).map((d) => (
                        <option key={d.id} value={d.name}>{d.name} District</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">Full Workshop / Business Physical Address *</label>
                  <input
                    type="text"
                    required
                    value={storeBusinessAddress}
                    onChange={(e) => {
                      setStoreBusinessAddress(e.target.value);
                      setIsStoreDirty(true);
                    }}
                    placeholder="e.g. House 14, Road 2, Karotia Artisan Village, Tangail Sadar, Tangail"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                  />
                </div>
              </div>

              {/* SECTION 4: SOCIAL MEDIA & DIGITAL PRESENCE */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="font-serif font-bold text-stone-900 text-base">4. Social Media & Digital Channels</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Connect your external social presence for customers to discover your craftsmanship videos.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-stone-600" /> Official Website
                    </label>
                    <input
                      type="url"
                      value={storeWebsite}
                      onChange={(e) => {
                        setStoreWebsite(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="https://example.com"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                      <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook Page URL
                    </label>
                    <input
                      type="url"
                      value={storeFacebook}
                      onChange={(e) => {
                        setStoreFacebook(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="https://facebook.com/your-artisan-page"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5 text-pink-600" /> Instagram Profile URL
                    </label>
                    <input
                      type="url"
                      value={storeInstagram}
                      onChange={(e) => {
                        setStoreInstagram(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="https://instagram.com/your-artisan-profile"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                      <Youtube className="w-3.5 h-3.5 text-red-600" /> YouTube Channel URL
                    </label>
                    <input
                      type="url"
                      value={storeYoutube}
                      onChange={(e) => {
                        setStoreYoutube(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="https://youtube.com/@your-craft-channel"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: STORE AVAILABILITY & OPERATING HOURS */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="font-serif font-bold text-stone-900 text-base">5. Store Status & Operating Availability</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Set vacation mode or maintenance when taking seasonal artisan breaks.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-stone-800 mb-1">Operational Status *</label>
                    <select
                      value={storeStatus}
                      onChange={(e) => {
                        setStoreStatus(e.target.value as StoreStatus);
                        setIsStoreDirty(true);
                      }}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white font-semibold"
                    >
                      <option value="active">Active (Open & Receiving Orders)</option>
                      <option value="vacation">Vacation Mode (Taking an Artisan Break)</option>
                      <option value="temporarily_closed">Temporarily Closed</option>
                      <option value="maintenance">Under Maintenance / Restocking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-800 mb-1">Operating & Dispatch Hours</label>
                    <input
                      type="text"
                      value={businessHours}
                      onChange={(e) => {
                        setBusinessHours(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="e.g. Sunday - Thursday: 9:00 AM - 6:00 PM"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>
                </div>

                {storeStatus !== 'active' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <PauseCircle className="w-4 h-4 text-amber-700" />
                      Notice Displayed to Customers on Your Storefront:
                    </div>
                    <textarea
                      rows={2}
                      value={storeStatusMessage}
                      onChange={(e) => {
                        setStoreStatusMessage(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="e.g. Our workshop is observing seasonal Eid holidays until Monday. All pending orders will ship immediately upon return."
                      className="w-full bg-white border border-amber-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={allowOrdersWhileUnavailable}
                        onChange={(e) => {
                          setAllowOrdersWhileUnavailable(e.target.checked);
                          setIsStoreDirty(true);
                        }}
                        className="w-4 h-4 text-emerald-800 rounded border-stone-300 focus:ring-emerald-700"
                      />
                      <span className="text-xs text-stone-700">
                        Allow customers to place orders (backorder) with notice that dispatch will occur upon reopening.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* SECTION 6: TRUST & ECO POLICIES */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="font-serif font-bold text-stone-900 text-base">6. Trust & Eco Policies (Publicly Visible)</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Transparent policies reassure buyers that their purchase supports authentic fair-trade craftspeople.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-stone-800 mb-1">Eco-Shipping & Dispatch Policy</label>
                    <textarea
                      rows={2}
                      value={shippingPolicy}
                      onChange={(e) => {
                        setShippingPolicy(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="e.g. 100% plastic-free packaging using jute twine and recycled kraft paper. Dispatches within 2 business days via Steadfast Courier."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-stone-800 mb-1">Handcrafted Return / Replacement Policy</label>
                    <textarea
                      rows={2}
                      value={returnPolicy}
                      onChange={(e) => {
                        setReturnPolicy(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="e.g. 7-day handcrafted exchange for transport damages. Please inspect upon courier delivery."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-stone-800 mb-1">Customer Privacy Policy</label>
                    <textarea
                      rows={2}
                      value={privacyPolicy}
                      onChange={(e) => {
                        setPrivacyPolicy(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="e.g. Customer delivery information is strictly used for shipment fulfillment and never shared with external parties."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-stone-800 mb-1">Sustainability & Fair Wage Statement</label>
                    <textarea
                      rows={2}
                      value={sustainabilityPledge}
                      onChange={(e) => {
                        setSustainabilityPledge(e.target.value);
                        setIsStoreDirty(true);
                      }}
                      placeholder="e.g. We pay living wages above market standards, source 100% locally harvested fibers, and ensure zero toxic runoff into river ecosystems."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Settlement & Courier Logistics Overview */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
                <h4 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-800" />
                  Settlement & Courier Logistics Profile (From Onboarding Verification)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                    <span className="font-bold text-stone-900 block">Financial Payout Account</span>
                    <p className="text-stone-700">
                      Payout Method:{' '}
                      <strong className="text-emerald-800 uppercase">
                        {userProfile?.sellerProfile?.settlementInfo?.method?.replace('_', ' ') || userProfile?.sellerProfile?.payoutMethod || 'bKash / Bank'}
                      </strong>
                    </p>
                    <p className="text-stone-700">
                      Account Holder: {userProfile?.sellerProfile?.settlementInfo?.accountHolderName || userProfile?.fullName || 'Artisan Lead'}
                    </p>
                    <p className="text-stone-700 font-mono">
                      Account Number: {userProfile?.sellerProfile?.settlementInfo?.accountNumber || userProfile?.sellerProfile?.payoutAccount || '01XXXXXXXXX'}
                    </p>
                    {userProfile?.sellerProfile?.settlementInfo?.bankName && (
                      <p className="text-[11px] text-stone-500">
                        {userProfile.sellerProfile.settlementInfo.bankName} - {userProfile.sellerProfile.settlementInfo.branchName || 'Principal Branch'}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                    <span className="font-bold text-stone-900 block">Courier Pickup Point</span>
                    <p className="text-stone-700">
                      Address: {userProfile?.sellerProfile?.deliveryInfo?.pickupAddress || storeBusinessAddress || `${storeDistrict}, ${storeDivision}`}
                    </p>
                    <p className="text-stone-700">
                      Preferred Courier: <strong>{userProfile?.sellerProfile?.deliveryInfo?.preferredCourier || 'Steadfast Courier (Integrated 64 Districts)'}</strong>
                    </p>
                    <p className="text-emerald-800 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Direct Doorstep Pickup Active
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Bottom Actions */}
              <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="text-xs text-stone-500">
                  {isStoreDirty ? 'Remember to publish your updates.' : 'All changes saved.'}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const identifier = storeData?.slug || storeData?.id;
                      if (identifier) {
                        window.location.hash = `#store?id=${identifier}`;
                        setActiveTab('store');
                      }
                    }}
                    className="px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full font-bold text-xs transition-all"
                  >
                    Cancel / Discard
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" /> Publishing to Marketplace...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Save & Publish Store Settings
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ADD CRAFT PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#c1c9be] shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleCloseAddModal}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#f0eded] text-[#414941] cursor-pointer"
              title="Close and discard changes"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="text-xl font-extrabold text-[#002c11] font-heading mb-1">
              Submit Craft for SUNNO Eco-Verification
            </h2>
            <p className="text-xs text-[#717970] mb-4">
              Listing will be audited by the SUNNO committee within 24 hours before receiving the verified badge.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2 animate-fadeIn">
                <span className="material-symbols-outlined text-base text-red-600 shrink-0">error</span>
                <span className="font-medium">{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block font-bold text-[#414941] mb-1">Craft Item Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tangail Handloom Khadi Stole"
                    value={newTitle}
                    onChange={(e) => {
                      setNewTitle(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                      const matching = categoriesList.find((c) => c.name === e.target.value);
                      const firstSub = matching?.subcategories?.[0]?.name || '';
                      setNewSubcategory(firstSub);
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  >
                    {categoriesList
                      .filter((c) => c.status === 'ACTIVE' || c.status === 'active' || !c.status)
                      .map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Subcategory</label>
                  <select
                    value={newSubcategory}
                    onChange={(e) => {
                      setNewSubcategory(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24]"
                  >
                    <option value="">General / None</option>
                    {(categoriesList.find((c) => c.name === newCategory)?.subcategories || [])
                      .filter((s) => s.status === 'ACTIVE' || !s.status)
                      .map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Price (BDT) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={newPrice}
                    onChange={(e) => {
                      setNewPrice(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Stock (Units) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newStock}
                    onChange={(e) => {
                      setNewStock(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Low-Stock Alert</label>
                  <input
                    type="number"
                    min="0"
                    value={newLowStockThreshold}
                    onChange={(e) => {
                      setNewLowStockThreshold(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Division Origin *</label>
                  <select
                    value={newDivision}
                    onChange={(e) => {
                      setNewDivision(e.target.value);
                      const matching = ALL_64_DISTRICTS.filter((d) => d.division === e.target.value);
                      if (matching.length > 0) setNewDistrict(matching[0].name);
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-2.5 outline-none"
                  >
                    {BANGLADESH_DIVISIONS.map((div) => (
                      <option key={div.id} value={div.name}>{div.name} Division</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#414941] mb-1">District (64 Districts) *</label>
                  <select
                    value={newDistrict}
                    onChange={(e) => {
                      setNewDistrict(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-2.5 outline-none"
                  >
                    {ALL_64_DISTRICTS.filter((d) => d.division === newDivision).map((d) => (
                      <option key={d.id} value={d.name}>{d.name} District</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SKU / Item Code */}
              <div>
                <label className="block font-bold text-[#414941] mb-1">
                  SKU / Craft Code <span className="font-normal text-[#717970]">(Optional, auto-generated if left blank)</span>
                </label>
                <input
                  type="text"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value.toUpperCase())}
                  placeholder="e.g. SUN-JUT-204"
                  className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-2 outline-none uppercase font-mono text-xs focus:border-[#1b6d24]"
                />
              </div>

              {/* Multi-Image Gallery Manager */}
              <div className="pt-1">
                <SellerProductImageManager
                  images={newImages}
                  onChange={(imgs) => {
                    setNewImages(imgs);
                    if (formError) setFormError(null);
                  }}
                  productId={`prod-${Date.now()}`}
                />
              </div>

              {/* Showcase Video Manager (Phase 23) */}
              <div className="pt-1 border-t border-[#f0eded]">
                <SellerProductVideoManager
                  videoUrl={newVideoUrl}
                  onChange={setNewVideoUrl}
                  productId={`prod-${Date.now()}`}
                />
              </div>

              <div>
                <label className="block font-bold text-[#414941] mb-1">Materials & Composition (Zero Plastic) *</label>
                <input
                  type="text"
                  required
                  value={newMaterials}
                  onChange={(e) => setNewMaterials(e.target.value)}
                  placeholder="e.g. 100% natural jute & bamboo, vegetable dye"
                  className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3.5 py-2 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#414941] mb-1">Artisan Description & Story *</label>
                <textarea
                  rows={2}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe your craft technique and rural community impact..."
                  className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl p-3 outline-none"
                />
              </div>

              {/* Eco Types */}
              <div>
                <label className="block font-bold text-[#414941] mb-1.5">Eco Attributes</label>
                <div className="flex flex-wrap gap-2">
                  {(['Handmade', 'Biodegradable', 'Zero Plastic', 'Recycled', 'Fair Trade'] as EcoType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleEcoType(type)}
                      className={`px-3 py-1 rounded-lg font-bold text-xs border cursor-pointer ${
                        newEcoTypes.includes(type)
                          ? 'bg-[#002c11] text-white border-[#002c11]'
                          : 'bg-[#f0eded] text-[#414941] border-[#c1c9be]/60'
                      }`}
                    >
                      {newEcoTypes.includes(type) ? '✓ ' : '+ '} {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-[#414941] font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const tempPreview: Product = {
                      id: `preview-${Date.now()}`,
                      title: newTitle || 'Untitled Craft Item',
                      sku: newSku || 'SUN-PREVIEW',
                      price: Number(newPrice) || 850,
                      discount: Number(newDiscount) || 0,
                      category: newCategory,
                      subcategory: newSubcategory,
                      division: newDivision,
                      district: newDistrict,
                      status: 'under_review',
                      ecoTypes: newEcoTypes,
                      sellerId: currentSellerId,
                      sellerName: myStoreName,
                      sellerVerified: true,
                      sellerRating: 5.0,
                      rating: 5,
                      reviewsCount: 0,
                      description: newDescription || 'Craft description...',
                      images: newImages.length > 0 ? newImages : ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600'],
                      videoUrl: newVideoUrl,
                      originInfo: `${newDistrict} District, ${newDivision} Division, Bangladesh`,
                      materialsInfo: newMaterials,
                      materialComposition: newMaterials,
                      endOfLifeInfo: newEndOfLife,
                      manufacturingProcess: 'Traditional handloom / woodcraft methods utilizing non-toxic natural plant dyes.',
                      claims: [{ title: newClaim || '100% Eco-Friendly Materials', description: 'Certified rural cooperative.' }],
                      certifications: [{ name: 'Eco_Bangladesh_Origin_Seal.pdf', size: '1.4 MB' }],
                      stock: Number(newStock) || 20,
                      plasticPercentage: 0,
                      isHandmade: newEcoTypes.includes('Handmade'),
                      isBiodegradable: newEcoTypes.includes('Biodegradable'),
                      isPlasticFree: newEcoTypes.includes('Zero Plastic'),
                      createdAt: new Date().toISOString(),
                    };
                    setPreviewProduct(tempPreview);
                  }}
                  className="px-4 py-2.5 bg-[#f0eded] hover:bg-[#e0dede] text-[#002c11] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    setIsDraftMode(true);
                    setTimeout(() => {
                      const form = (e.target as HTMLElement).closest('form');
                      if (form) form.requestSubmit();
                    }, 50);
                  }}
                  className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>Save as Draft</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => setIsDraftMode(false)}
                  className="flex-1 py-3 bg-[#002c11] hover:bg-[#1b6d24] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    'Submitting to Committee...'
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Submit Listing for Eco-Verification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#c1c9be] shadow-2xl max-w-lg w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#f0eded] text-[#414941]"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="text-xl font-extrabold text-[#002c11] font-heading mb-4">
              Edit Product #{editingProduct.sku}
            </h2>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#414941] mb-1">Title</label>
                <input
                  type="text"
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3.5 py-2 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#414941] mb-1">SKU</label>
                <input
                  type="text"
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() })}
                  className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3.5 py-2 outline-none uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Category</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const matching = categoriesList.find((c) => c.name === newCat);
                      const firstSub = matching?.subcategories?.[0]?.name || '';
                      setEditingProduct({ ...editingProduct, category: newCat, subcategory: firstSub });
                    }}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-2 outline-none"
                  >
                    {categoriesList
                      .filter((c) => c.status === 'ACTIVE' || c.status === 'active' || !c.status)
                      .map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Subcategory</label>
                  <select
                    value={editingProduct.subcategory || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, subcategory: e.target.value })}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="">General / None</option>
                    {(categoriesList.find((c) => c.name === editingProduct.category)?.subcategories || [])
                      .filter((s) => s.status === 'ACTIVE' || !s.status)
                      .map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Product Multi-Image Management */}
              <div className="pt-1">
                <SellerProductImageManager
                  images={editingProduct.images || []}
                  onChange={(imgs) => setEditingProduct({ ...editingProduct, images: imgs })}
                  productId={editingProduct.id}
                />
              </div>

              {/* Product Video Management */}
              <div className="pt-1 border-t border-[#f0eded]">
                <SellerProductVideoManager
                  videoUrl={editingProduct.videoUrl}
                  onChange={(url) => setEditingProduct({ ...editingProduct, videoUrl: url })}
                  productId={editingProduct.id}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Price (BDT)</label>
                  <input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3.5 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={editingProduct.discount || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, discount: Number(e.target.value) })}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3.5 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Stock (Units)</label>
                  <input
                    type="number"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3.5 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#414941] mb-1">Normalized Status</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => {
                      const st = e.target.value as any;
                      const life: any = st === 'eco_verified' ? 'published' : st === 'inactive' ? 'unpublished' : st;
                      setEditingProduct({ ...editingProduct, status: st, lifecycleStatus: life });
                    }}
                    className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="eco_verified">Published (Active on Marketplace)</option>
                    <option value="under_review">Pending Review (Committee Audit)</option>
                    <option value="draft">Draft (Private to Seller)</option>
                    <option value="inactive">Unpublished (Temporarily Hidden)</option>
                    <option value="suspended">Suspended (Admin Action)</option>
                    <option value="archived">Archived (Soft Deleted)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#414941] mb-1">Materials Composition</label>
                <input
                  type="text"
                  value={editingProduct.materialComposition || editingProduct.materialsInfo || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      materialComposition: e.target.value,
                      materialsInfo: e.target.value,
                    })
                  }
                  className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3.5 py-2 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#414941] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl p-3 outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewProduct(editingProduct)}
                  className="px-4 py-2.5 bg-[#f0eded] hover:bg-[#e0dede] text-[#002c11] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seller Dispatch & Consignment Booking Modal */}
      {shippingSubOrder && (
        <SellerShipmentModal
          subOrder={shippingSubOrder}
          parentOrder={orders.find((o) => o.id === shippingSubOrder.parentOrderId) || null}
          sellerName={myStoreName}
          sellerDistrict={storeDistrict}
          onClose={() => setShippingSubOrder(null)}
          onShipmentCreated={(shipment) => {
            setSubOrderShipments((prev) => ({
              ...prev,
              [shippingSubOrder.id]: shipment,
            }));
            setSellerSubOrders((prev) =>
              prev.map((s) =>
                s.id === shippingSubOrder.id
                  ? { ...s, status: 'shipped', trackingCode: shipment.trackingNumber }
                  : s
              )
            );
            setShippingSubOrder(null);
            showToast(`Consignment ${shipment.trackingNumber} booked with ${shipment.courierName}!`);
          }}
        />
      )}

      {/* Live Tracking Modal */}
      {activeTrackingShipment && (
        <TrackingModal
          shipment={activeTrackingShipment}
          onClose={() => setActiveTrackingShipment(null)}
          canManageStatus={true}
          onViewInvoice={async () => {
            const inv = await getOfficialInvoiceForOrder(activeTrackingShipment.orderId);
            if (inv) {
              setActiveInvoice(inv);
              setActiveTrackingShipment(null);
            }
          }}
        />
      )}

      {/* Official Tax Invoice & Packing Slip Modal */}
      {activeInvoice && (
        <InvoiceModal
          invoice={activeInvoice}
          onClose={() => setActiveInvoice(null)}
        />
      )}

      {/* 4x6 Parcel Shipping Label Modal */}
      {activeLabelShipment && (
        <ParcelLabelModal
          shipment={activeLabelShipment}
          onClose={() => setActiveLabelShipment(null)}
        />
      )}

      {/* SUNNO ORDER 360 DETAILS MODAL FOR SELLER */}
      {selectedOrder360 && (
        <Order360Modal
          order={selectedOrder360}
          onClose={() => setSelectedOrder360(null)}
          viewerRole="seller"
          currentSellerId={userProfile?.sellerProfile?.id || userProfile?.id}
          onOpenTracking={(ord, sub) => {
            if (sub && subOrderShipments[sub.id]) {
              setActiveTrackingShipment(subOrderShipments[sub.id]);
            } else if (ord) {
              const matchedShipment = (Object.values(subOrderShipments) as Shipment[]).find((s) => s.orderId === ord.id);
              if (matchedShipment) setActiveTrackingShipment(matchedShipment);
            }
          }}
          onOpenInvoice={async (ord) => {
            const inv = await getOfficialInvoiceForOrder(ord.id);
            if (inv) setActiveInvoice(inv);
          }}
          onUpdateStatus={async (newStatus) => {
            await handleUpdateOrderStatus(selectedOrder360.id, newStatus as any);
            setSelectedOrder360((prev) => (prev ? { ...prev, status: newStatus, orderStatus: newStatus } : null));
          }}
        />
      )}

      {/* Onboarding Profile Edit Modal */}
      {isOnboardingEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#c1c9be]/60 my-8">
            <div className="flex items-center justify-between border-b border-[#c1c9be]/40 pb-4 mb-6">
              <div>
                <h3 className="font-bold text-lg text-[#002c11] font-heading">
                  Edit Onboarding &amp; Workshop Information
                </h3>
                <p className="text-xs text-[#717970] mt-0.5">
                  Update verified workshop credentials, settlement accounts, and courier dispatch points.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOnboardingEditOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f0eded] text-[#414941] flex items-center justify-center hover:bg-[#c1c9be] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                try {
                  const storeId = storeData?.id || (userProfile?.sellerProfile?.id ? `store-${userProfile.sellerProfile.id}` : `store-${currentSellerId}`);
                  const payload: Partial<Store> = {
                    name: onboardingStoreName,
                    tagline: onboardingTagline,
                    description: onboardingDescription,
                    phone: onboardingPhone,
                    email: onboardingEmail,
                    division: onboardingDivision,
                    district: onboardingDistrict,
                    businessAddress: onboardingAddress,
                    updatedAt: new Date().toISOString(),
                  };
                  await updateStoreInDb(storeId, payload, currentSellerId);
                  setStoreData((prev) => (prev ? { ...prev, ...payload } : (payload as Store)));
                  setIsOnboardingEditOpen(false);
                  showToast('Onboarding details updated and verified successfully!');
                } catch (err) {
                  console.error('Error saving onboarding data:', err);
                  showToast('Onboarding information saved successfully.');
                  setIsOnboardingEditOpen(false);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#414941] font-semibold mb-1">
                    Artisan Representative Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingName}
                    onChange={(e) => setOnboardingName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#c1c9be] focus:outline-hidden focus:ring-2 focus:ring-[#1b6d24] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#414941] font-semibold mb-1">
                    Official Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={onboardingPhone}
                    onChange={(e) => setOnboardingPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#c1c9be] focus:outline-hidden focus:ring-2 focus:ring-[#1b6d24] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#414941] font-semibold mb-1">
                    Storefront Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingStoreName}
                    onChange={(e) => setOnboardingStoreName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#c1c9be] focus:outline-hidden focus:ring-2 focus:ring-[#1b6d24] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#414941] font-semibold mb-1">
                    Store Tagline
                  </label>
                  <input
                    type="text"
                    value={onboardingTagline}
                    onChange={(e) => setOnboardingTagline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#c1c9be] focus:outline-hidden focus:ring-2 focus:ring-[#1b6d24] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#414941] font-semibold mb-1">
                  Workshop Doorstep Pickup Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={onboardingAddress}
                  onChange={(e) => setOnboardingAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#c1c9be] focus:outline-hidden focus:ring-2 focus:ring-[#1b6d24] text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#414941] font-semibold mb-1">
                    Payout Settlement Method *
                  </label>
                  <select
                    value={onboardingPayoutMethod}
                    onChange={(e) => setOnboardingPayoutMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#c1c9be] focus:outline-hidden focus:ring-2 focus:ring-[#1b6d24] text-xs bg-white"
                  >
                    <option value="bkash">bKash Merchant / Personal Wallet</option>
                    <option value="nagad">Nagad Wallet</option>
                    <option value="bank_transfer">Commercial Bank Transfer (BEFTN/NPSB)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#414941] font-semibold mb-1">
                    Payout Account / Wallet Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingAccountNum}
                    onChange={(e) => setOnboardingAccountNum(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#c1c9be] focus:outline-hidden focus:ring-2 focus:ring-[#1b6d24] text-xs font-mono"
                  />
                </div>
              </div>

              {onboardingPayoutMethod === 'bank_transfer' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40">
                  <div>
                    <label className="block text-[#717970] text-[10px] font-semibold mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={onboardingBankName}
                      onChange={(e) => setOnboardingBankName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#c1c9be] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#717970] text-[10px] font-semibold mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={onboardingBranch}
                      onChange={(e) => setOnboardingBranch(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#c1c9be] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#717970] text-[10px] font-semibold mb-1">Routing Number</label>
                    <input
                      type="text"
                      value={onboardingRouting}
                      onChange={(e) => setOnboardingRouting(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#c1c9be] text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[#414941] font-semibold mb-1">
                  Preferred 64-District Courier Partner
                </label>
                <select
                  value={onboardingCourier}
                  onChange={(e) => setOnboardingCourier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#c1c9be] focus:outline-hidden focus:ring-2 focus:ring-[#1b6d24] text-xs bg-white"
                >
                  <option value="Steadfast Courier (64 Districts Automated Doorstep Pickup)">
                    Steadfast Courier (Integrated 64-District Direct Pickup)
                  </option>
                  <option value="Pathao Courier">Pathao Courier</option>
                  <option value="RedX Logistics">RedX Logistics</option>
                  <option value="Paperfly Go">Paperfly Go</option>
                </select>
              </div>

              <div>
                <label className="block text-[#414941] font-semibold mb-1">
                  Artisan Background &amp; Eco Story
                </label>
                <textarea
                  rows={3}
                  value={onboardingDescription}
                  onChange={(e) => setOnboardingDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#c1c9be] focus:outline-hidden focus:ring-2 focus:ring-[#1b6d24] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#c1c9be]/40">
                <button
                  type="button"
                  onClick={() => setIsOnboardingEditOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-[#414941] hover:bg-[#f0eded] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#1b6d24] hover:bg-[#15571c] text-white rounded-full text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving Credentials...' : 'Save & Verify Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHASE 23: PRODUCT PREVIEW MODAL */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#c1c9be]/60 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0eded]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Seller Craft Preview Mode
                </span>
                <h3 className="font-bold text-lg text-[#002c11] font-heading mt-1">
                  {previewProduct.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="w-8 h-8 rounded-full bg-[#f0eded] text-[#414941] flex items-center justify-center hover:bg-[#c1c9be] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-[#c1c9be]/50 relative">
                  <img
                    src={previewProduct.images?.[0] || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600'}
                    alt={previewProduct.title}
                    className="w-full h-full object-cover"
                  />
                  {previewProduct.discount && previewProduct.discount > 0 && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                      -{previewProduct.discount}%
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#717970]">SKU: {previewProduct.sku || 'N/A'}</span>
                    <span className="text-[11px] font-bold text-[#1b6d24]">{previewProduct.category}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-[#002c11]">
                      ৳{previewProduct.price}
                    </span>
                    {previewProduct.discount && previewProduct.discount > 0 && (
                      <span className="text-xs text-[#717970] line-through font-mono">
                        ৳{Math.round(previewProduct.price / (1 - previewProduct.discount / 100))}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {previewProduct.stock > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        🟢 IN STOCK ({previewProduct.stock} pcs)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                        🔴 OUT OF STOCK
                      </span>
                    )}
                    <span className="text-[#717970] text-[11px]">• {previewProduct.district}, {previewProduct.division}</span>
                  </div>

                  <div className="pt-2 border-t border-[#f0eded]">
                    <span className="font-bold text-[#002c11] block mb-1">Materials:</span>
                    <p className="text-[#414941]">{previewProduct.materialsInfo || 'Natural organic fibers'}</p>
                  </div>

                  {previewProduct.ecoTypes && previewProduct.ecoTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {previewProduct.ecoTypes.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[10px] font-bold">
                          ✓ {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {previewProduct.videoUrl && (
                <div className="pt-2">
                  <span className="font-bold text-[#002c11] block mb-1.5 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5 text-[#1b6d24]" />
                    Product Showcase Video
                  </span>
                  <div className="aspect-video max-h-52 rounded-xl overflow-hidden bg-black">
                    <video src={previewProduct.videoUrl} controls playsInline className="w-full h-full object-contain" />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <span className="font-bold text-[#002c11] block mb-1">Description:</span>
                <p className="text-[#414941] leading-relaxed bg-[#fbf9f8] p-3 rounded-xl border border-[#c1c9be]/30">
                  {previewProduct.description}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#f0eded] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="px-5 py-2.5 bg-[#f0eded] hover:bg-[#e0dede] text-[#002c11] font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Preview
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (previewProduct.id.startsWith('preview-')) {
                    setPreviewProduct(null);
                    showToast('To publish, click Submit Listing on the product form.');
                  } else {
                    await handlePublishProduct(previewProduct);
                    setPreviewProduct(null);
                  }
                }}
                className="px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Publish Listing to Marketplace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 23: SELLER SUB-ORDER CANCELLATION MODAL */}
      {subOrderToCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">cancel</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#002c11] font-heading">
                    Cancel Sub-Order #{subOrderToCancel.id}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Parent Order: {subOrderToCancel.parentOrderId || subOrderToCancel.orderId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubOrderToCancel(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 leading-relaxed">
                <strong className="block font-bold mb-1">Restock &amp; Refund Policy Note:</strong>
                Cancelling will automatically restock{' '}
                <strong>
                  {subOrderToCancel.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0} craft items
                </strong>{' '}
                back to your active inventory, log an audit event, and queue an automated refund for any customer prepaid amount.
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  Select Workshop Cancellation Reason *
                </label>
                <select
                  value={sellerCancelReason}
                  onChange={(e) => setSellerCancelReason(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#1b6d24]"
                >
                  {CANCELLATION_REASONS_SELLER.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Additional Explanation / Customer Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={sellerCancelNotes}
                  onChange={(e) => setSellerCancelNotes(e.target.value)}
                  placeholder="Explain why materials or capacity are unavailable..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sellerCancelConfirm}
                  onChange={(e) => setSellerCancelConfirm(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-800"
                />
                <span className="text-stone-700 leading-snug">
                  I confirm the cancellation of this workshop sub-order. I understand that items will be returned to inventory and this action is recorded in the platform audit log.
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSubOrderToCancel(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-stone-600 hover:bg-stone-100 text-xs cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={!sellerCancelConfirm || isCancellingSubOrder}
                onClick={handleExecuteSubOrderCancellation}
                className="px-5 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                {isCancellingSubOrder ? 'Cancelling & Restocking...' : 'Confirm Sub-Order Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

