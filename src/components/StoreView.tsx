import React, { useState, useEffect } from 'react';
import { Product, Store, ActiveTab, Review } from '../types';
import { isPublicProduct } from '../services/firebase/productService';
import { useAuth } from '../context/AuthContext';
import { ProductCard } from './ProductCard';
import {
  toggleStoreFollow,
  isUserFollowingStore,
  sendMessageInDb,
  createNotificationInDb,
} from '../services/dbService';
import { fetchRealStoreReviews } from '../services/storeService';
import {
  MapPin,
  Star,
  Users,
  Share2,
  Phone,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  PauseCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  Heart,
  Globe,
  Facebook,
  Instagram,
  Youtube,
  Package,
  Check,
} from 'lucide-react';

interface StoreViewProps {
  store: Store;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  setActiveTab: (tab: ActiveTab) => void;
  wishlistIds?: string[];
  onToggleWishlist?: (productId: string) => void;
  onOpenQuickView?: (product: Product) => void;
}

export const StoreView: React.FC<StoreViewProps> = ({
  store,
  products,
  onSelectProduct,
  onAddToCart,
  setActiveTab,
  wishlistIds = [],
  onToggleWishlist,
  onOpenQuickView,
}) => {
  const { userProfile, role, currentUser, setIsAuthModalOpen } = useAuth();
  const [activeTab, setActiveStoreTab] = useState<'catalog' | 'story' | 'policies' | 'reviews'>('catalog');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(store.followersCount || 0);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgSent, setMsgSent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [storeReviews, setStoreReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [storeToast, setStoreToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStoreToast(msg);
    setTimeout(() => setStoreToast(null), 3500);
  };

  // Check if current user is the owner of this store
  const isOwner =
    role === 'seller' &&
    (currentUser?.uid === store.sellerId ||
      userProfile?.id === store.sellerId ||
      userProfile?.sellerProfile?.storeName === store.name);

  // Load real reviews from Firestore
  useEffect(() => {
    let isMounted = true;
    setReviewsLoading(true);
    fetchRealStoreReviews(store.id, store.sellerId)
      .then((revs) => {
        if (isMounted) {
          setStoreReviews(revs);
          setReviewsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error fetching store reviews:', err);
        if (isMounted) setReviewsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [store.id, store.sellerId]);

  // Load follow state
  useEffect(() => {
    if (currentUser?.uid && store.id) {
      isUserFollowingStore(store.id, currentUser.uid).then(setIsFollowing);
    }
  }, [store.id, currentUser]);

  const storeProducts = (products || []).filter(
    (p) =>
      p.sellerId === store.sellerId ||
      p.storeId === store.id ||
      p.sellerName?.toLowerCase() === store.name?.toLowerCase()
  );

  const activePublicProducts = storeProducts.filter(isPublicProduct);

  const filteredProducts = activePublicProducts.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const availableCategories = ['All', ...Array.from(new Set(activePublicProducts.map((p) => p.category)))];

  // Calculate real average rating
  const averageRating = React.useMemo(() => {
    if (storeReviews.length > 0) {
      const sum = storeReviews.reduce((acc, r) => acc + (r.rating || 5), 0);
      return (sum / storeReviews.length).toFixed(1);
    }
    return store.rating ? store.rating.toFixed(1) : null;
  }, [storeReviews, store.rating]);

  const totalReviewsCount = storeReviews.length > 0 ? storeReviews.length : store.reviewsCount || 0;

  const isStoreUnavailable = store.status && store.status !== 'active';
  const ordersBlocked = isStoreUnavailable && !store.allowOrdersWhileUnavailable;

  const handleAddToCartProtected = (product: Product) => {
    if (ordersBlocked) {
      showToast(
        `This workshop is currently ${
          store.status === 'vacation'
            ? 'on vacation mode'
            : store.status === 'temporarily_closed'
            ? 'temporarily closed'
            : 'under maintenance'
        } and not accepting orders.`
      );
      return;
    }
    onAddToCart(product);
  };

  const handleToggleFollow = async () => {
    if (!currentUser && !userProfile) {
      setIsAuthModalOpen(true);
      return;
    }
    const uid = currentUser?.uid || userProfile?.id;
    if (!uid) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const res = await toggleStoreFollow(store.id, uid);
      setIsFollowing(res.following);
      setFollowersCount(res.count);
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  const handleShareStore = () => {
    const storeUrl = `${window.location.origin}${window.location.pathname}#store?id=${store.slug || store.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(storeUrl).then(() => {
        setCopiedLink(true);
        showToast('Storefront link copied to clipboard!');
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser && !userProfile) {
      setIsAuthModalOpen(true);
      return;
    }
    const senderId = currentUser?.uid || userProfile?.id;
    if (!senderId) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const senderName = userProfile?.fullName || userProfile?.displayName || currentUser?.displayName || 'Conscious Buyer';

      await sendMessageInDb({
        senderId,
        senderName,
        senderRole: userProfile?.role || 'customer',
        recipientId: store.sellerId || '',
        recipientName: store.name,
        subject: msgSubject,
        text: msgContent,
        isRead: false,
        timestamp: new Date().toISOString(),
      });

      if (store.sellerId) {
        await createNotificationInDb({
          userId: store.sellerId,
          type: 'message',
          title: `New Inquiry: ${msgSubject}`,
          message: `${senderName} sent an inquiry to ${store.name}.`,
          read: false,
          timestamp: new Date().toISOString(),
        });
      }

      setMsgSent(true);
      setTimeout(() => {
        setMsgSent(false);
        setIsContactOpen(false);
        setMsgSubject('');
        setMsgContent('');
      }, 2000);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <main id="store-view-main" className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 flex flex-col gap-8 overflow-x-hidden">
      {/* Toast Alert */}
      {storeToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{storeToast}</span>
        </div>
      )}

      {/* AVAILABILITY ALERT BANNER */}
      {isStoreUnavailable && (
        <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          store.status === 'vacation'
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-2xl shrink-0 ${
              store.status === 'vacation' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {store.status === 'vacation' ? <PauseCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-sm sm:text-base">
                  {store.status === 'vacation'
                    ? 'Artisan Workshop on Vacation'
                    : store.status === 'temporarily_closed'
                    ? 'Workshop Temporarily Closed'
                    : 'Workshop Under Maintenance'}
                </h3>
                {ordersBlocked ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                    Orders Paused
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Backorders Accepted
                  </span>
                )}
              </div>
              <p className="text-xs mt-1 text-stone-700 leading-relaxed">
                {store.statusMessage ||
                  (store.status === 'vacation'
                    ? 'This artisan cooperative is observing seasonal workshop leave. Inquiries remain open.'
                    : 'This workshop is temporarily resting production lines.')}
              </p>
            </div>
          </div>

          <div className="text-xs text-stone-600 shrink-0">
            {store.businessHours && <span>Hours: {store.businessHours}</span>}
          </div>
        </div>
      )}

      {/* Store Hero Banner & Header */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="h-52 sm:h-72 w-full relative bg-stone-900">
          {store.banner ? (
            <img
              src={store.banner}
              alt={store.name}
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-950 flex items-center justify-center">
              <span className="text-white/40 font-serif italic text-sm">SUNNO Artisan Cooperative Partner</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-22 sm:h-22 rounded-2xl bg-white p-1 border-2 border-white shadow-lg shrink-0 overflow-hidden">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-stone-100 text-stone-400 flex items-center justify-center rounded-xl font-serif font-black text-xl">
                    {store.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-white">
                    {store.name}
                  </h1>
                  {store.ecoVerified && (
                    <span className="px-2.5 py-0.5 bg-emerald-400 text-emerald-950 text-[10px] font-extrabold rounded-full flex items-center gap-1 shadow-xs">
                      <ShieldCheck className="w-3 h-3" />
                      SUNNO ECO-VERIFIED
                    </span>
                  )}
                  {store.category && (
                    <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-xs text-white text-[10px] font-medium rounded-full">
                      {store.category}
                    </span>
                  )}
                </div>

                {store.tagline && (
                  <p className="text-xs text-emerald-300 font-medium mt-0.5">{store.tagline}</p>
                )}

                <p className="text-xs text-stone-300 mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {store.district}{store.division ? `, ${store.division}` : ''}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    {averageRating ? (
                      <>
                        <strong className="text-white">{averageRating}</strong> ({totalReviewsCount} reviews)
                      </>
                    ) : (
                      <span>No reviews yet</span>
                    )}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span>{followersCount} followers</span>
                  </span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {isOwner && (
                <button
                  id="btn-store-manage"
                  onClick={() => {
                    window.location.hash = '#seller/dashboard';
                    setActiveTab('seller_portal');
                  }}
                  className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 rounded-full font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Manage Store
                </button>
              )}

              <button
                id="btn-store-share"
                onClick={handleShareStore}
                className="px-3.5 py-2 bg-white/90 hover:bg-white text-stone-900 rounded-full font-bold text-xs shadow-md transition-all flex items-center gap-1.5 backdrop-blur-xs"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Share2 className="w-3.5 h-3.5" />}
                {copiedLink ? 'Link Copied' : 'Share'}
              </button>

              <button
                id="btn-store-follow"
                onClick={handleToggleFollow}
                className={`px-4 py-2 rounded-full font-bold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                  isFollowing
                    ? 'bg-emerald-700 text-white border border-emerald-400'
                    : 'bg-white/90 hover:bg-white text-stone-900'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-white' : ''}`} />
                {isFollowing ? 'Following' : 'Follow Store'}
              </button>

              {store.whatsapp && (
                <a
                  href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              )}

              <button
                id="btn-store-contact"
                onClick={() => setIsContactOpen(true)}
                className="px-4 py-2 bg-white/90 hover:bg-white text-stone-900 rounded-full font-bold text-xs shadow-md transition-all flex items-center gap-1.5 backdrop-blur-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                Message Artisan
              </button>
            </div>
          </div>
        </div>

        {/* Store Tabs Navigation */}
        <div className="flex border-b border-stone-200 px-4 sm:px-6 bg-stone-50 overflow-x-auto no-scrollbar">
          {[
            { id: 'catalog', label: `Craft Catalog (${activePublicProducts.length})`, icon: Package },
            { id: 'story', label: 'Artisan Story & Heritage', icon: Sparkles },
            { id: 'policies', label: 'Eco Shipping & Policies', icon: ShieldCheck },
            { id: 'reviews', label: `Customer Reviews (${totalReviewsCount})`, icon: Star },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveStoreTab(tab.id as any)}
                className={`py-3.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === tab.id
                    ? 'border-emerald-800 text-emerald-950 bg-white'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search within this workshop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-100 border border-stone-200 rounded-xl pl-4 pr-3 py-2 text-xs text-stone-900 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-stone-200 p-8">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-stone-900">No craft listings matched your search or category filter.</p>
              <p className="text-xs text-stone-500 mt-1">Try resetting the category filter or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onSelectProduct={onSelectProduct}
                  onAddToCart={handleAddToCartProtected}
                  isWishlisted={wishlistIds.includes(p.id)}
                  onToggleWishlist={onToggleWishlist}
                  onOpenQuickView={onOpenQuickView}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STORY */}
      {activeTab === 'story' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-stone-900 font-serif mb-2">
              The Artisan Heritage & Workshop Mission
            </h3>
            <p className="text-sm text-stone-700 leading-relaxed max-w-3xl whitespace-pre-line">
              {store.description ||
                `${store.name} represents multi-generational artisan cooperative families rooted in ${store.district}, ${store.division} Division. Every piece is handmade utilizing pure heritage materials with zero toxic chemical runoff.`}
            </p>
          </div>

          {store.sustainabilityStatement && (
            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1.5">
              <h4 className="font-serif font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Sustainability & Fair Wage Commitment
              </h4>
              <p className="text-xs text-emerald-900 leading-relaxed">
                {store.sustainabilityStatement}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-stone-200">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
              <h4 className="font-bold text-xs text-stone-900 mt-2">100% Authentic Labor</h4>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Fair wages certified under the Bangladesh Rural Artisan Collective Standards.
              </p>
            </div>
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <Package className="w-6 h-6 text-emerald-700" />
              <h4 className="font-bold text-xs text-stone-900 mt-2">Plastic-Free Lifecycle</h4>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Packaged strictly in banana-fiber boxes, recycled newsprint, or cotton bags.
              </p>
            </div>
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <MapPin className="w-6 h-6 text-emerald-700" />
              <h4 className="font-bold text-xs text-stone-900 mt-2">District Traceability</h4>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Origin verified in {store.district} District under the SUNNO 64 Districts Registry.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POLICIES */}
      {activeTab === 'policies' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold text-stone-900 font-serif">
            Store Policies & Sustainability Standards
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-700" />
                Eco-Friendly Shipping Policy
              </h4>
              <p className="text-stone-700 leading-relaxed">
                {store.policies?.shipping ||
                  'Orders are packed within 2 business days using 100% biodegradable corrugated cardboard and jute string. Delivered across all 64 districts via carbon-conscious local courier networks.'}
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Handcrafted Exchange & Return Policy
              </h4>
              <p className="text-stone-700 leading-relaxed">
                {store.policies?.returns ||
                  'If an item arrives damaged, we offer a replacement handcrafted directly by our workshop or a full refund within 7 days of delivery.'}
              </p>
            </div>

            {store.policies?.privacy && (
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Customer Privacy Policy
                </h4>
                <p className="text-stone-700 leading-relaxed">
                  {store.policies.privacy}
                </p>
              </div>
            )}

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                Environmental & Fair Wage Guarantee
              </h4>
              <p className="text-stone-700 leading-relaxed">
                {store.policies?.sustainability ||
                  'Zero hazardous dyes or synthetic chemical adhesives are permitted in this workshop. 100% of material components are biodegradable or sustainably harvested.'}
              </p>
            </div>

            {store.businessHours && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1.5 md:col-span-2">
                <h4 className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  Workshop Operating & Dispatch Hours
                </h4>
                <p className="text-emerald-900 leading-relaxed">
                  {store.businessHours} • Workshop courier dispatch takes place Sunday through Thursday.
                </p>
              </div>
            )}
          </div>

          {/* Social Links Card if available */}
          {store.socialLinks && (store.socialLinks.website || store.socialLinks.facebook || store.socialLinks.instagram || store.socialLinks.youtube) && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-bold text-stone-800">Connect with Workshop:</span>
              <div className="flex items-center gap-3">
                {store.socialLinks.website && (
                  <a
                    href={store.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white rounded-xl border border-stone-200 text-stone-700 hover:text-emerald-700 text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Globe className="w-3.5 h-3.5" /> Website
                  </a>
                )}
                {store.socialLinks.facebook && (
                  <a
                    href={store.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white rounded-xl border border-stone-200 text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Facebook className="w-3.5 h-3.5" /> Facebook
                  </a>
                )}
                {store.socialLinks.instagram && (
                  <a
                    href={store.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white rounded-xl border border-stone-200 text-pink-600 hover:text-pink-700 text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Instagram className="w-3.5 h-3.5" /> Instagram
                  </a>
                )}
                {store.socialLinks.youtube && (
                  <a
                    href={store.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white rounded-xl border border-stone-200 text-red-600 hover:text-red-700 text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Youtube className="w-3.5 h-3.5" /> YouTube
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-serif">
                Customer Reviews ({totalReviewsCount})
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Verified feedback from buyers across Bangladesh.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-stone-900 font-mono">
                {averageRating ? `${averageRating} / 5.0` : 'No reviews'}
              </div>
              {averageRating && (
                <div className="flex items-center gap-0.5 text-amber-500 justify-end">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.round(Number(averageRating))
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {reviewsLoading ? (
            <div className="py-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-700" /> Loading verified reviews...
            </div>
          ) : storeReviews.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-stone-200 p-6 space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-xs font-bold text-stone-800">No reviews yet for this artisan workshop.</p>
              <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                Be the first to review this workshop when you place an order. Genuine feedback empowers sustainable local artisans across Bangladesh.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storeReviews.map((rev) => (
                <div key={rev.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold">
                        {(rev.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-900 block">{rev.userName || 'Verified Buyer'}</span>
                        {rev.createdAt && (
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < (rev.rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contact Artisan Modal */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsContactOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-stone-500"
            >
              ✕
            </button>

            {msgSent ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-stone-900">Inquiry Sent to Artisan</h4>
                <p className="text-xs text-stone-600">
                  The artisan cooperative in {store.district} will reply directly to your SUNNO inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <h3 className="text-base font-bold text-stone-900 font-serif">
                  Message {store.name}
                </h3>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="Custom order / sizing query..."
                    value={msgSubject}
                    onChange={(e) => setMsgSubject(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write your note to the artisan cooperative..."
                    value={msgContent}
                    onChange={(e) => setMsgContent(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                >
                  Send Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
