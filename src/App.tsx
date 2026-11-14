/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ActiveTab,
  Product,
  CartItem,
  QueueSubmission,
  CustomerProfileTab,
  SellerPortalTab,
  Store,
  Category,
  EcoCollection,
  PriceChangeAlert,
  Order,
  SubOrder,
} from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { DistrictsView } from './components/DistrictsView';
import { ProductDetailView } from './components/ProductDetailView';
import { CategoryPageView } from './components/CategoryPageView';
import { AllProductsView } from './components/AllProductsView';
import { SellerPortalView } from './components/SellerPortalView';
import { AdminPanelView } from './components/AdminPanelView';
import { AdminLoginView } from './components/AdminLoginView';
import { ForbiddenView } from './components/ForbiddenView';
import { EcoEducationView } from './components/EcoEducationView';
import { CustomerProfileView } from './components/CustomerProfileView';
import { StoreView } from './components/StoreView';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CategoriesModal } from './components/CategoriesModal';
import { BecomeSellerModal } from './components/BecomeSellerModal';
import { CheckoutModal } from './components/CheckoutModal';
import { SearchResultsView } from './components/discovery/SearchResultsView';
import { ProductQuickViewModal } from './components/discovery/ProductQuickViewModal';
import { ProductCompareModal } from './components/discovery/ProductCompareModal';
import { DeliveryAvailabilityModal } from './components/discovery/DeliveryAvailabilityModal';
import { AuthModal } from './components/AuthModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { NotFoundView } from './components/NotFoundView';
import { PublicOrderTrackingModal } from './components/PublicOrderTrackingModal';
import { PaymentReceiptModal } from './components/PaymentReceiptModal';
import {
  updatePageSeo,
  buildProductJsonLd,
  buildCategoryJsonLd,
  buildDistrictsJsonLd,
} from './services/seoService';
import {
  fetchProductsFromDb,
  subscribeProducts,
  fetchQueueSubmissions,
  updateProductEcoStatusInDb,
  updateQueueSubmissionInDb,
  subscribeCategories,
  INITIAL_CATEGORIES,
} from './services/dbService';
import {
  SavedForLaterItem,
  validateProductForCart,
  getGuestCart,
  getGuestSavedForLater,
  saveGuestCart,
  saveGuestSavedForLater,
  mergeGuestCartOnLogin,
  saveUserCartToCloud,
} from './services/cartService';
import {
  addToWishlist,
  removeFromWishlist,
  getGuestWishlist,
  syncGuestWishlistOnLogin,
} from './services/firebase/wishlistService';
import {
  fetchCouponByCode,
  fetchParentOrderById,
  fetchSubOrdersForParent,
} from './services/checkoutService';
import { getShopBySellerId, getShopById } from './services/firebase/shopService';
import {
  trackRecentlyViewedProduct,
  getRecentlyViewedProductIds,
  recordWishlistPrice,
  detectPriceChangeAlerts,
} from './services/customerDiscoveryService';
import { BANGLADESH_60_ECO_PRODUCTS } from './data/bangladeshEcoProducts';
import { Layers, CheckCircle2, AlertTriangle, ArrowRight, X } from 'lucide-react';
import {
  setRedirectAfterAuth,
  getRedirectAfterAuth,
  clearRedirectAfterAuth,
} from './services/authService';

const DEFAULT_STORE: Store = {
  id: 'store-savar-01',
  sellerId: 'seller-01',
  name: 'Savar Bamboo & Cane Cooperative',
  slug: 'savar-bamboo-cooperative',
  logo: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=200&auto=format&fit=crop&q=80',
  banner: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&auto=format&fit=crop&q=80',
  district: 'Dhaka',
  division: 'Dhaka',
  description:
    'Empowering 85 rural master bamboo weavers across Savar and Dhamrai with living wages, zero chemical treatments, and authentic heritage craftsmanship since 2012.',
  rating: 4.9,
  reviewsCount: 148,
  ecoVerified: true,
  totalSales: 890,
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
};

function MainMarketplaceApp() {
  const {
    currentUser,
    userProfile,
    isLoading: isAuthLoading,
    isEmailVerified,
    isAdmin,
    sendVerificationEmail,
    openAuthModal,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [customerSubTab, setCustomerSubTab] = useState<CustomerProfileTab>('overview');
  const [sellerSubTab, setSellerSubTab] = useState<SellerPortalTab>('dashboard');

  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  const handleResendVerificationEmail = async () => {
    setIsResendingVerification(true);
    try {
      await sendVerificationEmail();
      setVerificationNotice('Verification link sent! Please check your inbox and spam folder.');
      setTimeout(() => setVerificationNotice(null), 7000);
    } catch (err: any) {
      setVerificationNotice('Could not send verification email: ' + (err.message || 'Please try again.'));
    } finally {
      setIsResendingVerification(false);
    }
  };

  const [navHistory, setNavHistory] = useState<ActiveTab[]>(['home']);
  const [navHistoryIndex, setNavHistoryIndex] = useState<number>(0);
  const isInternalNavigatingRef = useRef<boolean>(false);

  useEffect(() => {
    if (isInternalNavigatingRef.current) {
      isInternalNavigatingRef.current = false;
      return;
    }
    setNavHistory((prev) => {
      const trimmed = prev.slice(0, navHistoryIndex + 1);
      if (trimmed[trimmed.length - 1] === activeTab) return prev;
      return [...trimmed, activeTab];
    });
    setNavHistoryIndex((prev) => {
      const trimmed = navHistory.slice(0, prev + 1);
      if (trimmed[trimmed.length - 1] === activeTab) return prev;
      return trimmed.length;
    });
  }, [activeTab]);

  const handleGoBack = () => {
    if (navHistoryIndex > 0) {
      const targetIndex = navHistoryIndex - 1;
      isInternalNavigatingRef.current = true;
      setNavHistoryIndex(targetIndex);
      setActiveTab(navHistory[targetIndex]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    try {
      window.history.back();
    } catch {}
  };

  const handleGoForward = () => {
    if (navHistoryIndex < navHistory.length - 1) {
      const targetIndex = navHistoryIndex + 1;
      isInternalNavigatingRef.current = true;
      setNavHistoryIndex(targetIndex);
      setActiveTab(navHistory[targetIndex]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    try {
      window.history.forward();
    } catch {}
  };

  const [products, setProducts] = useState<Product[]>(BANGLADESH_60_ECO_PRODUCTS);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(false);
  const [productsError, setProductsError] = useState<boolean>(false);
  const [queueItems, setQueueItems] = useState<QueueSubmission[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('sun-bam-01');
  const [selectedProductObj, setSelectedProductObj] = useState<Product | null>(null);

  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isBecomeSellerOpen, setIsBecomeSellerOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [comparedProductIds, setComparedProductIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [deliveryModalProduct, setDeliveryModalProduct] = useState<Product | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  const [isPublicTrackingOpen, setIsPublicTrackingOpen] = useState(false);
  const [publicTrackingQuery, setPublicTrackingQuery] = useState('');
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activeInvoiceSubOrders, setActiveInvoiceSubOrders] = useState<SubOrder[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const handleOpenInvoiceFromTracking = async (orderId: string) => {
    try {
      const ord = await fetchParentOrderById(orderId);
      if (ord) {
        setActiveInvoiceOrder(ord);
        const subs = await fetchSubOrdersForParent(ord.id);
        setActiveInvoiceSubOrders(subs);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Error opening invoice:', err);
    }
  };

  const [activeCollection, setActiveCollection] = useState<EcoCollection | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<string | null>(null);
  const [dismissedPriceAlerts, setDismissedPriceAlerts] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedForLater, setSavedForLater] = useState<SavedForLaterItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [wishlist, setWishlist] = useState<string[]>(() => getGuestWishlist());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<Category>(INITIAL_CATEGORIES[0]);
  const [selectedStore, setSelectedStore] = useState<Store>(DEFAULT_STORE);

  const isCartInitialized = useRef(false);

  const recentlyViewedIds = useMemo(
    () => getRecentlyViewedProductIds(),
    [selectedProductId, quickViewProduct]
  );

  const priceAlerts: PriceChangeAlert[] = useMemo(() => {
    if (dismissedPriceAlerts) return [];
    return detectPriceChangeAlerts(wishlist, products);

  }, [products, wishlist, dismissedPriceAlerts]);

  const comparedProducts = useMemo(
    () => products.filter((p) => comparedProductIds.includes(p.id)),
    [products, comparedProductIds]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const handleHashChange = () => {
      if (isAuthLoading) return;

      const hash = window.location.hash.toLowerCase();

      if (hash.startsWith('#admin/login')) {
        setActiveTab('admin_login');
        return;
      }

      if (hash.startsWith('#admin')) {
        if (!currentUser) {
          setActiveTab('admin_login');
        } else if (isAdmin || (userProfile?.permissions && userProfile.permissions.length > 0)) {
          setActiveTab('admin');
        } else {
          setActiveTab('forbidden');
        }
        return;
      }

      if (hash.startsWith('#forbidden') || hash.startsWith('#403')) {
        setActiveTab('forbidden');
        return;
      }

      if (hash.startsWith('#customer') || hash.startsWith('#account')) {
        if (!currentUser) {
          setRedirectAfterAuth('#customer');
          window.location.hash = '#home';
          openAuthModal('login', 'Please sign in to access your customer profile, orders, and wallet.');
          return;
        }
        setActiveTab('customer_profile');
        return;
      }

      if (
        hash.startsWith('#seller') ||
        hash.startsWith('#become-a-seller') ||
        hash.startsWith('#become_seller')
      ) {
        if (!currentUser) {
          setRedirectAfterAuth('#seller');
          window.location.hash = '#home';
          openAuthModal('signup', 'Create an account or sign in to open your artisan shop on SUNNO.');
          return;
        }
        if (
          hash.includes('onboarding') ||
          hash.startsWith('#become-a-seller') ||
          hash.startsWith('#become_seller')
        ) {
          setSellerSubTab('onboarding');
        }
        setActiveTab('seller_portal');
        return;
      }

      if (
        hash === '#products' ||
        hash === '#all-products' ||
        hash === '#all_products' ||
        hash === '#shop' ||
        hash === '#marketplace'
      ) {
        setActiveTab('products');
      } else if (hash.startsWith('#search') || hash.startsWith('#results')) {
        setActiveTab('search_results');
      } else if (hash.startsWith('#cart')) {
        setIsCartOpen(true);
      } else if (hash.startsWith('#wishlist')) {
        setIsWishlistOpen(true);
      } else if (hash.startsWith('#compare')) {
        setIsCompareModalOpen(true);
      } else if (hash.startsWith('#product/') || hash.startsWith('#products/')) {
        if (skipHashLookupRef.current) {
  skipHashLookupRef.current = false;
  setActiveTab('product_detail');
  return;
}

        const rawParam = hash.startsWith('#product/')
          ? hash.replace('#product/', '').trim()
          : hash.replace('#products/', '').trim();
        const cleanParam = decodeURIComponent(rawParam);
        if (cleanParam) {
          const found = products.find(
            (p) =>
              p.id.toLowerCase() === cleanParam.toLowerCase() ||
              p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanParam.toLowerCase()
          );
                 const keyword = cleanParam.replace(/-/g, ' ');
       const smartMatch =
  found ||
  products.find(
    (p) =>
      p.title.toLowerCase().includes(keyword) ||
      p.category.toLowerCase().includes(keyword)
  ) ||
  (selectedProductObj && selectedProductObj.id.toLowerCase() === cleanParam.toLowerCase()
    ? selectedProductObj
    : null) ||
  products[0];


       if (smartMatch) {
         setSelectedProductId(smartMatch.id);
         setActiveTab('product_detail');
       } else {
         setActiveTab('products');
       }

        } else {
          setActiveTab('products');
        }
      } else if (hash.startsWith('#category/')) {
        const catSlug = hash.replace('#category/', '').trim();
        const found = categories.find((c) => c.slug === catSlug || c.id === catSlug);
        if (found) {
          setSelectedCategory(found);
          setActiveTab('category_page');
        } else {
          setActiveTab('not_found');
        }
      } else if (hash.startsWith('#districts/')) {
        const distName = decodeURIComponent(hash.replace('#districts/', '').trim());
        setSelectedDistrict(distName || 'All');
        setActiveTab('districts');
      } else if (hash.startsWith('#districts') || hash.startsWith('#explore')) {
        setActiveTab('districts');
      } else if (hash.startsWith('#eco-education')) {
        setActiveTab('eco_education');
      } else if (hash.startsWith('#store/')) {
        const storeSlugOrId = decodeURIComponent(hash.replace('#store/', '').trim());
        if (storeSlugOrId) {
          handleOpenStore(storeSlugOrId);
        } else {
          setActiveTab('store');
        }
      } else if (hash.startsWith('#store')) {
        setActiveTab('store');
      } else if (hash.startsWith('#not_found') || hash.startsWith('#404')) {
        setActiveTab('not_found');
      } else if (hash.startsWith('#home') || hash === '' || hash === '#') {
        setActiveTab('home');
      } else {
        setActiveTab('not_found');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAdmin, userProfile, categories, products, currentUser, isAuthLoading, openAuthModal]);

  useEffect(() => {
    if (currentUser && !isAuthLoading) {
      const redirectUrl = getRedirectAfterAuth();
      if (redirectUrl && redirectUrl !== '#home' && redirectUrl !== '#' && redirectUrl !== '') {
        clearRedirectAfterAuth();
        window.location.hash = redirectUrl;
      }
    }
  }, [currentUser, isAuthLoading]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://sunno.eco';
    const canonicalUrl = `${currentOrigin}${window.location.pathname}${window.location.hash || '#home'}`;

    let pageTitle = 'SUNNO Marketplace - Empowering Sustainable Bangladesh';
    let metaDescription =
      'Discover authentic eco-friendly handicrafts, organic goods, and heritage artisan creations across all 64 districts of Bangladesh.';
    let imageUrl =
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80';
    let jsonLd: Record<string, any> | undefined;

    if (activeTab === 'product_detail') {
      const prod = products.find((p) => p.id === selectedProductId);
      if (prod) {
        pageTitle = `${prod.title} (৳${prod.price.toLocaleString('en-BD')}) | SUNNO Bangladesh`;
        metaDescription = prod.description?.slice(0, 160) || metaDescription;
        imageUrl = prod.images?.[0] || imageUrl;
        jsonLd = buildProductJsonLd(prod, canonicalUrl);
      }
    } else if (activeTab === 'category_page' && selectedCategory) {
      pageTitle = `${selectedCategory.name} | Verified Eco Products - SUNNO`;
      metaDescription = selectedCategory.description || metaDescription;
      imageUrl = selectedCategory.image || imageUrl;
      jsonLd = buildCategoryJsonLd(selectedCategory, canonicalUrl);
    } else if (activeTab === 'districts') {
      pageTitle =
        selectedDistrict === 'All'
          ? '64 Districts of Bangladesh Artisan Directory | SUNNO'
          : `${selectedDistrict} District Eco Crafts & Heritage | SUNNO`;
      jsonLd = buildDistrictsJsonLd(selectedDistrict, canonicalUrl);
    }

    updatePageSeo({
      title: pageTitle,
      description: metaDescription,
      canonicalUrl,
      imageUrl,
      type: activeTab === 'product_detail' ? 'product' : 'website',
      jsonLd,
    });
  }, [activeTab, selectedDistrict, selectedCategory, selectedProductId, products, searchQuery]);

  useEffect(() => {
    const unsubCats = subscribeCategories((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
        setSelectedCategory((prev) => cats.find((c) => c.id === prev.id || c.slug === prev.slug) || cats[0]);
      }
    });
  const unsubProds = subscribeProducts((dbProducts) => {
  if (dbProducts && dbProducts.length > 0) {
    const mergedMap = new Map<string, Product>();
    BANGLADESH_60_ECO_PRODUCTS.forEach((p) => mergedMap.set(p.id, p));
    dbProducts.forEach((p) => mergedMap.set(p.id, p));
    setProducts(Array.from(mergedMap.values()));
  }
  setIsProductsLoading(false);
});

    return () => {
      unsubCats();
      unsubProds();
    };
  }, []);

  const loadData = async () => {
    setProductsError(false);
    try {
      if (products.length === 0) {
        const dbProducts = await fetchProductsFromDb();
        setProducts(dbProducts && dbProducts.length > 0 ? dbProducts : BANGLADESH_60_ECO_PRODUCTS);
      }
      if (isAdmin) {
        const dbQueue = await fetchQueueSubmissions();
        setQueueItems(dbQueue || []);
      }
    } catch (err) {
      console.error('Error loading marketplace data:', err);
      if (products.length === 0) setProducts(BANGLADESH_60_ECO_PRODUCTS);
    } finally {
      setIsProductsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  useEffect(() => {
    async function initCart() {
      const userId = currentUser?.uid || userProfile?.id;
      if (userId) {
        const cloudState = await mergeGuestCartOnLogin(userId, products);
        if (cloudState.items.length > 0 || !isCartInitialized.current) {
          setCart(cloudState.items);
          setSavedForLater(cloudState.savedItems);
          if (cloudState.appliedCouponCode) setAppliedCoupon(cloudState.appliedCouponCode);
        }
        try {
          const userWishlist = await syncGuestWishlistOnLogin(userId, getGuestWishlist());
          setWishlist(userWishlist);
        } catch (wErr) {
          console.warn('Error syncing cloud wishlist:', wErr);
        }
      } else {
        setCart(getGuestCart(products));
        setSavedForLater(getGuestSavedForLater(products));
        setWishlist(getGuestWishlist());
      }
      isCartInitialized.current = true;
    }
    initCart();
  }, [currentUser, userProfile]);

  useEffect(() => {
    if (!isCartInitialized.current) return;
    const userId = currentUser?.uid || userProfile?.id;
    if (userId) {
      saveUserCartToCloud(userId, cart, savedForLater, appliedCoupon).catch((err) =>
        console.error('Error syncing cloud cart:', err)
      );
    } else {
      saveGuestCart(cart);
      saveGuestSavedForLater(savedForLater);
    }
  }, [cart, savedForLater, appliedCoupon, currentUser, userProfile]);

  useEffect(() => {
    async function evaluateCoupon() {
      if (!appliedCoupon) {
        setCouponDiscount(0);
        return;
      }
      const validCoupon = await fetchCouponByCode(appliedCoupon);
      if (validCoupon) {
        const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
        setCouponDiscount(
          validCoupon.discountType === 'percentage'
            ? Math.round((subtotal * validCoupon.discountValue) / 100)
            : Math.min(subtotal, validCoupon.discountValue)
        );
      } else {
        setCouponDiscount(0);
      }
    }
    evaluateCoupon();
  }, [appliedCoupon, cart]);

  const handleAddToCart = (product: Product, e?: React.MouseEvent, quantity: number = 1) => {
    if (e) e.stopPropagation();

    const validation = validateProductForCart(product, quantity);
    if (!validation.isValid) {
      showToast(validation.error || 'Cannot add product to bag.');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (typeof product.stock === 'number' && newQty > product.stock) {
          showToast(`Maximum available stock reached (${product.stock} units).`);
          return prev.map((item) =>
            item.product.id === product.id ? { ...item, quantity: product.stock! } : item
          );
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity }];
    });

    showToast(`Added ${quantity} × ${product.title} to bag!`);
  };

  const handleUpdateQuantity = (productId: string, deltaOrQuantity: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const targetQuantity =
      deltaOrQuantity === 1 || deltaOrQuantity === -1
        ? item.quantity + deltaOrQuantity
        : deltaOrQuantity;

    if (targetQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    const availableStock = typeof item.product.stock === 'number' ? item.product.stock : 999;
    if (targetQuantity > availableStock) {
      showToast(`Only ${availableStock} units available in stock.`);
      return;
    }

    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: targetQuantity } : i))
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleSaveForLater = (itemOrId: CartItem | string) => {
    const productId = typeof itemOrId === 'string' ? itemOrId : itemOrId.product.id;
    const cartItem = cart.find((i) => i.product.id === productId);
    const prod = cartItem?.product || products.find((p) => p.id === productId);
    if (!prod) return;

    setCart((prev) => prev.filter((i) => i.product.id !== productId));
    setSavedForLater((prev) => {
      if (prev.some((s) => s.product.id === productId)) return prev;
      return [...prev, { product: prod, savedAt: new Date().toISOString() }];
    });
    showToast(`Saved ${prod.title} for later.`);
  };

  const handleMoveToCartFromSaved = (productId: string) => {
    const saved = savedForLater.find((s) => s.product.id === productId);
    if (!saved) return;

    const matchedProduct =
      products.find((p) => p.id === productId) || saved.product;
    if (matchedProduct) {
      const validation = validateProductForCart(matchedProduct, 1);
      if (!validation.isValid) {
        showToast(validation.error || 'Cannot move item to cart.');
        return;
      }
      setCart((prev) =>
        prev.some((i) => i.product.id === productId)
          ? prev
          : [...prev, { product: matchedProduct, quantity: 1 }]
      );
      setSavedForLater((prev) => prev.filter((s) => s.product.id !== productId));
      showToast(`Moved ${matchedProduct.title} to your bag.`);
    }
  };

  const handleRemoveSavedItem = (productId: string) => {
    setSavedForLater((prev) => prev.filter((s) => s.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setAppliedCoupon('');
    setCouponDiscount(0);
  };

  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    const validCoupon = await fetchCouponByCode(code);
    if (!validCoupon) {
      showToast('Invalid or expired coupon code.');
      return false;
    }
    const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    if (subtotal < validCoupon.minOrderAmount) {
      showToast(`Minimum order amount of ৳${validCoupon.minOrderAmount} required for this coupon.`);
      return false;
    }
    const discountAmount =
      validCoupon.discountType === 'percentage'
        ? Math.round((subtotal * validCoupon.discountValue) / 100)
        : Math.min(subtotal, validCoupon.discountValue);

    setAppliedCoupon(code);
    setCouponDiscount(discountAmount);
    showToast(`Coupon "${code}" applied successfully!`);
    return true;
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setCouponDiscount(0);
    showToast('Coupon removed.');
  };

  const handleProceedToCheckout = () => {
    if (!currentUser) {
      setIsCartOpen(false);
      setRedirectAfterAuth('#cart');
      openAuthModal('login', 'Please sign in or create an account to complete your order checkout.');
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleBuyNow = (product: Product, quantity: number) => {
    const validation = validateProductForCart(product, quantity);
    if (!validation.isValid) {
      showToast(validation.error || 'Cannot buy product.');
      return;
    }
    setCart([{ product, quantity }]);

    if (!currentUser) {
      setRedirectAfterAuth(`#product/${product.id}`);
      openAuthModal('login', 'Please sign in or create an account to proceed with instant checkout.');
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleToggleWishlist = (productId: string) => {
    if (!currentUser) {
      setRedirectAfterAuth(window.location.hash || '#products');
      openAuthModal('login', 'Please sign in to save items to your personal eco-wishlist.');
      return;
    }

    const userId = currentUser.uid;
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        removeFromWishlist(userId, productId).catch(console.warn);
        showToast('Removed from your saved items.');
        return prev.filter((id) => id !== productId);
      } else {
        const prod = products.find((p) => p.id === productId);
        if (prod) recordWishlistPrice(prod.id, prod.price);
        addToWishlist(userId, productId).catch(console.warn);
        showToast('Added to your saved items! We will alert you on price drops.');
        return [...prev, productId];
      }
    });
  };

  const handleToggleCompare = (productId: string) => {
    setComparedProductIds((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId);
      if (prev.length >= 4) {
        showToast('You can compare a maximum of 4 products at a time.');
        return prev;
      }
      showToast('Added to comparison matrix.');
      return [...prev, productId];
    });
  };

const skipHashLookupRef = useRef(false);

const handleSelectProduct = (product: Product) => {
  skipHashLookupRef.current = true;
  setSelectedProductId(product.id);
  setSelectedProductObj(product);
  trackRecentlyViewedProduct(product.id, userProfile?.id);
  window.location.hash = `#product/${product.id}`;
  setActiveTab('product_detail');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};


  const handleSelectProductById = (id: string) => {
    setSelectedProductId(id);
    trackRecentlyViewedProduct(id, userProfile?.id);
    window.location.hash = `#product/${id}`;
    setActiveTab('product_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDistrict = (district: string | null) => {
    const dName = district || 'All';
    setSelectedDistrict(dName);
    window.location.hash = `#districts/${encodeURIComponent(dName)}`;
    setActiveTab('districts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenStore = async (storeOrSeller?: Store | string) => {
    if (typeof storeOrSeller === 'object' && storeOrSeller !== null) {
      setSelectedStore(storeOrSeller);
    } else if (typeof storeOrSeller === 'string' && storeOrSeller.trim()) {
      const cleanId = storeOrSeller.trim();
      const liveShop = (await getShopBySellerId(cleanId)) || (await getShopById(cleanId));
      if (liveShop) {
        setSelectedStore(liveShop);
      } else {
        const prod = products.find((p) => p.sellerId === cleanId || p.storeId === cleanId);
        if (prod) {
          setSelectedStore({
            id: `store-${prod.sellerId || cleanId}`,
            sellerId: prod.sellerId || cleanId,
            name: prod.sellerName || 'SUNNO Artisan Partner',
            slug: (prod.sellerName || cleanId).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            logo: prod.images?.[0] || DEFAULT_STORE.logo,
            banner: prod.images?.[0] || DEFAULT_STORE.banner,
            district: prod.district || 'Dhaka',
            division: prod.division || 'Dhaka',
            description: `Authentic sustainable crafts by ${prod.sellerName || 'artisan partner'} from ${prod.district || 'Bangladesh'}.`,
            rating: prod.rating || 5.0,
            reviewsCount: prod.reviewsCount || 1,
            ecoVerified: true,
            totalSales: 1,
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    window.location.hash = '#store';
    setActiveTab('store');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCollection = (col: EcoCollection) => {
    setActiveCollection(col);
    window.location.hash = '#search';
    setActiveTab('search_results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMaterial = (material: string) => {
    setActiveMaterial(material);
    window.location.hash = '#search';
    setActiveTab('search_results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
    if (newProduct.status !== 'draft') {
      const newSubmission: QueueSubmission = {
        id: `queue-${Date.now()}`,
        trackingId: `ENV-${Math.floor(1000 + Math.random() * 9000)}`,
        productId: newProduct.id,
        product: newProduct,
        submittedAgo: 'Just now',
        submittedDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: 'pending',
        internalNotes: 'Newly submitted product by seller. Awaiting initial verification review.',
      };
      setQueueItems((prev) => [newSubmission, ...prev]);
      showToast('Product submitted for 24-hour Eco-Verification!');
    }
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    showToast('Product updated successfully!');
  };

  const handleUpdateQueueItem = async (
    id: string,
    newStatus: 'pending' | 'flagged' | 'under_review' | 'approved' | 'rejected',
    notes?: string
  ) => {
    try {
      await updateQueueSubmissionInDb(id, newStatus, notes, userProfile?.id || 'admin');
    } catch (err) {
      console.error('Error updating queue item:', err);
    }
    setQueueItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: newStatus,
              internalNotes: notes !== undefined ? notes : item.internalNotes,
            }
          : item
      )
    );
  };

  const handleUpdateProductStatus = async (
    productId: string,
    status: 'eco_verified' | 'under_review' | 'flagged' | 'rejected'
  ) => {
    try {
      await updateProductEcoStatusInDb(productId, status, userProfile?.id || 'admin');
    } catch (err) {
      console.error('Error updating product status:', err);
    }
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, status } : p)));
  };

 const selectedProduct =
  products.find((p) => p.id === selectedProductId) ||
  (selectedProductObj && selectedProductObj.id === selectedProductId ? selectedProductObj : null) ||
  products[0];


  if (activeTab === 'admin') {
    if (!currentUser && !userProfile) {
      return <AdminLoginView setActiveTab={setActiveTab} />;
    }
    if (!isAdmin && !(userProfile?.permissions && userProfile.permissions.length > 0)) {
      return (
        <ForbiddenView
          attemptedPath="/admin"
          setActiveTab={setActiveTab}
          onOpenAdminLogin={() => {
            window.location.hash = '#admin/login';
            setActiveTab('admin_login');
          }}
        />
      );
    }
    return (
      <AdminPanelView
        queueItems={queueItems}
        allProducts={products}
        onUpdateQueueItem={handleUpdateQueueItem}
        onUpdateProductStatus={handleUpdateProductStatus}
        setActiveTab={setActiveTab}
      />
    );
  }

  if (activeTab === 'admin_login') {
    return <AdminLoginView setActiveTab={setActiveTab} />;
  }

  if (activeTab === 'forbidden') {
    return (
      <ForbiddenView
        attemptedPath="/admin"
        setActiveTab={setActiveTab}
        onOpenAdminLogin={() => {
          window.location.hash = '#admin/login';
          setActiveTab('admin_login');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full flex flex-col bg-transparent text-[#1b1c1c] overflow-x-hidden selection:bg-[#a0f399] selection:text-[#002c11]">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#002c11] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-[#a0f399]/40">
          <CheckCircle2 className="w-4 h-4 text-[#30e872]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {!verificationBannerDismissed && currentUser && !isEmailVerified && currentUser.email && (
        <aside className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between z-40">
          <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">
              Your email (<span className="font-bold">{currentUser.email}</span>) is unverified.
            </span>
            {verificationNotice ? (
              <span className="ml-2 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {verificationNotice}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendVerificationEmail}
                disabled={isResendingVerification}
                className="ml-2 underline font-bold hover:text-amber-950 disabled:opacity-50 cursor-pointer text-amber-800 shrink-0"
              >
                {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setVerificationBannerDismissed(true)}
            className="p-1 text-amber-600 hover:text-amber-900 rounded-lg shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cart={cart}
        setIsCartOpen={setIsCartOpen}
        searchQuery={searchQuery}
        setSearchQuery={(query) => {
          setSearchQuery(query);
          if (query.trim()) {
            window.location.hash = '#search';
            setActiveTab('search_results');
          }
        }}
        onSelectProductById={handleSelectProductById}
        onOpenBecomeSeller={() => {
          if (!currentUser) {
            setRedirectAfterAuth('#become-a-seller');
            openAuthModal('signup', 'Please sign in or register to onboard your artisan workshop.');
            return;
          }
          setIsBecomeSellerOpen(true);
        }}
        wishlistCount={wishlist.length}
        onOpenWishlist={() => {
          if (!currentUser) {
            setRedirectAfterAuth('#wishlist');
            openAuthModal('login', 'Please sign in to view your saved eco-crafts.');
            return;
          }
          setIsWishlistOpen(true);
        }}
        onOpenCategories={() => setIsCategoriesModalOpen(true)}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          window.location.hash = `#category/${cat.slug || cat.id}`;
          setActiveTab('category_page');
        }}
        onSelectCustomerTab={(tab) => setCustomerSubTab(tab)}
        onSelectSellerTab={(tab) => setSellerSubTab(tab)}
        categories={categories}
        products={products}
        onOpenTrackOrder={() => {
          setPublicTrackingQuery('');
          setIsPublicTrackingOpen(true);
        }}
        canGoBack={navHistoryIndex > 0}
        canGoForward={navHistoryIndex < navHistory.length - 1}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
      />

      <div className="flex-1 w-full max-w-full overflow-x-hidden">
        {activeTab === 'home' && (
          <HomeView
            products={products}
            setActiveTab={setActiveTab}
            onSelectProduct={handleSelectProduct}
            onSelectDistrict={handleSelectDistrict}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onOpenQuickView={(p) => setQuickViewProduct(p)}
            comparedProductIds={comparedProductIds}
            onToggleCompare={handleToggleCompare}
            onSelectCollection={handleSelectCollection}
            onSelectMaterial={handleSelectMaterial}
            priceChangeAlerts={priceAlerts}
            onDismissPriceAlert={() => setDismissedPriceAlerts(true)}
            recentlyViewedIds={recentlyViewedIds}
            cartProductIds={cart.map((i) => i.product.id)}
            onOpenCategories={() => setIsCategoriesModalOpen(true)}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              window.location.hash = `#category/${cat.slug || cat.id}`;
              setActiveTab('category_page');
            }}
            categories={categories}
          />
        )}

        {(activeTab === 'products' || activeTab === 'all_products') && (
          <AllProductsView
            products={products}
            categories={categories}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onOpenQuickView={(p) => setQuickViewProduct(p)}
            comparedProductIds={comparedProductIds}
            onToggleCompare={handleToggleCompare}
            setActiveTab={setActiveTab}
            isLoading={isProductsLoading}
            isError={productsError}
            onRetry={loadData}
            initialSearchQuery={searchQuery}
          />
        )}

        {activeTab === 'search_results' && (
          <SearchResultsView
            products={products}
            initialQuery={searchQuery}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onOpenQuickView={(p) => setQuickViewProduct(p)}
            comparedProductIds={comparedProductIds}
            onToggleCompare={handleToggleCompare}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'districts' && (
          <DistrictsView
            products={products}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            searchQuery={searchQuery}
            wishlistIds={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onOpenQuickView={(p) => setQuickViewProduct(p)}
            comparedProductIds={comparedProductIds}
            onToggleCompare={handleToggleCompare}
            onOpenStore={(store) => handleOpenStore(store)}
            setActiveTab={setActiveTab}
            onOpenBecomeSeller={() => {
              if (!currentUser) {
                openAuthModal('signup', 'Sign in or register to open your artisan store.');
                return;
              }
              setIsBecomeSellerOpen(true);
            }}
          />
        )}

        {activeTab === 'category_page' && (
          <CategoryPageView
            category={selectedCategory}
            allCategories={categories}
            allProducts={products}
            setActiveTab={setActiveTab}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              window.location.hash = `#category/${cat.slug || cat.id}`;
              setActiveTab('category_page');
            }}
          />
        )}

        {activeTab === 'product_detail' && selectedProduct && (
          <ProductDetailView
            product={selectedProduct}
            setActiveTab={setActiveTab}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onSelectProduct={handleSelectProduct}
            allProducts={products}
            isWishlisted={wishlist.includes(selectedProduct.id)}
            onToggleWishlist={handleToggleWishlist}
            onSelectStore={(storeOrSellerId) =>
              handleOpenStore(storeOrSellerId || selectedProduct.sellerId)
            }
            comparedProductIds={comparedProductIds}
            onToggleCompare={handleToggleCompare}
          />
        )}

        {activeTab === 'seller_portal' && (
          <SellerPortalView
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            setActiveTab={setActiveTab}
            onSelectProduct={handleSelectProduct}
            initialSubTab={sellerSubTab}
          />
        )}

        {activeTab === 'eco_education' && (
          <EcoEducationView
            setActiveTab={setActiveTab}
            onSelectDistrict={handleSelectDistrict}
          />
        )}

        {activeTab === 'customer_profile' && (
          <CustomerProfileView
            setActiveTab={setActiveTab}
            onSelectProduct={handleSelectProduct}
            products={products}
            wishlistIds={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            initialSubTab={customerSubTab}
          />
        )}

        {activeTab === 'store' && (
          <StoreView
            store={selectedStore}
            products={products}
            setActiveTab={setActiveTab}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
          />
        )}

        {activeTab === 'not_found' && (
          <NotFoundView
            onGoHome={() => {
              window.location.hash = '#home';
              setActiveTab('home');
            }}
            onBrowseProducts={() => {
              window.location.hash = '#products';
              setActiveTab('products');
            }}
            onOpenSearch={() => {
              window.location.hash = '#search';
              setActiveTab('search_results');
            }}
            onSelectDistrict={(dist) => handleSelectDistrict(dist)}
          />
        )}
      </div>

      {comparedProductIds.length > 0 && (
        <div className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#002c11] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-[#a0f399]/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#a0f399]" />
            <span className="text-xs font-bold font-mono">
              {comparedProductIds.length} item(s) selected
            </span>
          </div>
          <button
            onClick={() => setIsCompareModalOpen(true)}
            className="px-4 py-1.5 bg-[#1b6d24] hover:bg-[#258d31] text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Compare Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setComparedProductIds([])}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear comparison list"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        savedForLater={savedForLater}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onSaveForLater={handleSaveForLater}
        onMoveToCartFromSaved={handleMoveToCartFromSaved}
        onRemoveSavedItem={handleRemoveSavedItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={handleProceedToCheckout}
        onSelectProduct={handleSelectProduct}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        couponDiscount={couponDiscount}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        allProducts={products}
        onOrderSuccess={(order) => {
          handleClearCart();
          showToast(`Order #${order.orderNumber} placed successfully!`);
          if (activeTab === 'customer_profile') setCustomerSubTab('orders');
        }}
        onNavigateToOrders={() => {
          setIsCheckoutOpen(false);
          setActiveTab('customer_profile');
          setCustomerSubTab('orders');
        }}
      />

      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistIds={wishlist}
        allProducts={products}
        onRemoveFromWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        onSelectProduct={handleSelectProduct}
      />

      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        onSelectCategory={(catName, catObj) => {
          if (catObj) {
            setSelectedCategory(catObj);
            window.location.hash = `#category/${catObj.slug || catObj.id}`;
            setActiveTab('category_page');
          } else {
            const found = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
            if (found) {
              setSelectedCategory(found);
              window.location.hash = `#category/${found.slug || found.id}`;
              setActiveTab('category_page');
            } else {
              setSearchQuery(catName);
              window.location.hash = '#search';
              setActiveTab('search_results');
            }
          }
        }}
        setActiveTab={setActiveTab}
      />

      <BecomeSellerModal
        isOpen={isBecomeSellerOpen}
        onClose={() => setIsBecomeSellerOpen(false)}
        onSuccess={() => {
          setIsBecomeSellerOpen(false);
          setActiveTab('seller_portal');
        }}
      />

      <ProductQuickViewModal
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        product={quickViewProduct}
        onAddToCart={(p) => handleAddToCart(p)}
        onSelectProduct={(p) => {
          setQuickViewProduct(null);
          handleSelectProduct(p);
        }}
        isWishlisted={quickViewProduct ? wishlist.includes(quickViewProduct.id) : false}
        onToggleWishlist={(pid) => handleToggleWishlist(pid)}
      />

      <ProductCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        products={comparedProducts}
        onRemoveProduct={(pid) => handleToggleCompare(pid)}
        onClearAll={() => setComparedProductIds([])}
        onAddToCart={(p) => handleAddToCart(p)}
        onSelectProduct={(p) => {
          setIsCompareModalOpen(false);
          handleSelectProduct(p);
        }}
      />

      <DeliveryAvailabilityModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        initialDistrict={selectedDistrict === 'All' ? 'Dhaka' : selectedDistrict}
      />

      <AuthModal />
      <ChangePasswordModal />

      <Footer
        setActiveTab={setActiveTab}
        onSelectDistrictByName={handleSelectDistrict}
        onSelectSellerTab={(tab) => setSellerSubTab(tab)}
        onOpenTrackOrder={() => {
          setPublicTrackingQuery('');
          setIsPublicTrackingOpen(true);
        }}
      />

      {isPublicTrackingOpen && (
        <PublicOrderTrackingModal
          initialQuery={publicTrackingQuery}
          onClose={() => {
            setIsPublicTrackingOpen(false);
            setPublicTrackingQuery('');
          }}
          onViewInvoice={handleOpenInvoiceFromTracking}
        />
      )}

      {isReceiptModalOpen && activeInvoiceOrder && (
        <PaymentReceiptModal
          order={activeInvoiceOrder}
          subOrders={activeInvoiceSubOrders}
          onClose={() => setIsReceiptModalOpen(false)}
          onTrackOrder={(orderId) => {
            setIsReceiptModalOpen(false);
            setPublicTrackingQuery(orderId);
            setIsPublicTrackingOpen(true);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainMarketplaceApp />
    </AuthProvider>
  );
}
