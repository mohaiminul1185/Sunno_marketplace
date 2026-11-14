import React, { useState, useEffect, useMemo } from 'react';
import { Product, ActiveTab, Review } from '../types';
import { isPublicProduct } from '../services/firebase/productService';
import { fetchProductReviews, addProductReview } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { recordWishlistPrice } from '../services/customerDiscoveryService';
import {
  ShieldCheck,
  MapPin,
  Star,
  Layers,
  Heart,
  ShoppingCart,
  Zap,
  PlayCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Leaf,
  Sparkles,
  Award,
  Clock,
  ArrowRight,
  Filter,
  Truck,
  RotateCcw,
  PackageCheck,
} from 'lucide-react';
import { getOptimizedImageUrl, DETAIL_IMAGE_SIZES } from '../utils/imageOptimizer';

interface ProductDetailViewProps {
  product: Product;
  setActiveTab: (tab: ActiveTab) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent, quantity?: number) => void;
  onBuyNow?: (product: Product, quantity: number) => void;
  onSelectProduct: (product: Product) => void;
  allProducts: Product[];
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  onSelectStore?: (storeId: string) => void;
  comparedProductIds?: string[];
  onToggleCompare?: (productId: string) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  setActiveTab,
  onAddToCart,
  onBuyNow,
  onSelectProduct,
  allProducts,
  isWishlisted,
  onToggleWishlist,
  onSelectStore,
  comparedProductIds = [],
  onToggleCompare,
}) => {
  const { userProfile } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const availableStock = typeof product.stock === 'number' ? product.stock : 0;
  const isOutOfStock = availableStock <= 0 || product.status === 'out_of_stock';
  const isLowStock = !isOutOfStock && availableStock <= 5;
  const [quantity, setQuantity] = useState(isOutOfStock ? 0 : 1);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [addedToast, setAddedToast] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | 'all'>('all');
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const images =
    product.images && product.images.length > 0
      ? product.images
      : ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80'];

  useEffect(() => {
    loadReviews();
  }, [product.id]);

  const loadReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const list = await fetchProductReviews(product.id);
      setReviews(list);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      setValidationError('This product is currently out of stock.');
      return;
    }
    if (quantity <= 0) {
      setValidationError('Please select a valid quantity.');
      return;
    }
    if (quantity > availableStock) {
      setValidationError(`Only ${availableStock} units available in stock.`);
      return;
    }

    setValidationError(null);
    onAddToCart(product, undefined, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) {
      setValidationError('This product is currently out of stock.');
      return;
    }
    if (quantity <= 0) {
      setValidationError('Please select a valid quantity.');
      return;
    }
    setValidationError(null);
    if (onBuyNow) {
      onBuyNow(product, quantity);
    } else {
      onAddToCart(product, undefined, quantity);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      const rev: Review = {
        id: `rev-${Date.now()}`,
        productId: product.id,
        productTitle: product.title,
        orderId: 'direct-review',
        customerId: userProfile?.id || 'anon-user',
        userId: userProfile?.id || 'anon-user',
        customerName: userProfile?.displayName || userProfile?.fullName || 'Eco Patron',
        userName: userProfile?.displayName || userProfile?.fullName || 'Eco Patron',
        sellerId: product.sellerId || 'artisan',
        rating: newRating,
        title: 'Customer Review',
        comment: newComment,
        productQualityRating: newRating,
        packagingRating: 5,
        deliveryRating: 5,
        photos: [],
        verifiedPurchase: true,
        helpfulCount: 0,
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
      };
      await addProductReview(rev);
      setReviews([rev, ...reviews]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Rating counts breakdown
  const ratingBreakdown = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const score = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      counts[score] = (counts[score] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (selectedRatingFilter === 'all') return reviews;
    return reviews.filter((r) => Math.round(r.rating) === selectedRatingFilter);
  }, [reviews, selectedRatingFilter]);

  // Related District crafts & category items
  const relatedDistrictProducts = allProducts
    .filter((p) => p.id !== product.id && isPublicProduct(p) && p.district?.toLowerCase() === product.district?.toLowerCase())
    .slice(0, 4);

  const relatedCategoryProducts = allProducts
    .filter((p) => p.id !== product.id && isPublicProduct(p) && p.category?.toLowerCase() === product.category?.toLowerCase())
    .slice(0, 4);

  const isCompared = comparedProductIds.includes(product.id);

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-[#717970] overflow-x-auto pb-1">
        <button
          onClick={() => {
            window.location.hash = '#home';
            setActiveTab('home');
          }}
          className="hover:text-[#002c11] transition-colors whitespace-nowrap"
        >
          Home
        </button>
        <span>/</span>
        <button
          onClick={() => {
            window.location.hash = '#districts';
            setActiveTab('districts');
          }}
          className="hover:text-[#002c11] transition-colors whitespace-nowrap"
        >
          {product.division || 'Bangladesh'}
        </button>
        <span>/</span>
        <button
          onClick={() => {
            window.location.hash = '#districts';
            setActiveTab('districts');
          }}
          className="hover:text-[#002c11] transition-colors whitespace-nowrap"
        >
          {product.district}
        </button>
        <span>/</span>
        <span className="text-[#002c11] font-bold truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Product Hero Section (Gallery + Info) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-4">
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-[#f5f3f3] border border-[#c1c9be]/60 shadow-md group">
            <img
              src={getOptimizedImageUrl(images[selectedImageIndex] || images[0], 'detail')}
              sizes={DETAIL_IMAGE_SIZES}
              alt={`${product.title} - ${product.category} handcrafted in ${product.district}, Bangladesh`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="eager"
              decoding="async"
            />
            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              <span className="bg-[#002c11]/90 backdrop-blur-xs text-[#b4f0b9] text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 border border-[#1b6d24]/30">
                <ShieldCheck className="w-4 h-4 text-[#30e872]" />
                Eco Verified
              </span>
              <span className="bg-[#f5f5dc] text-[#8b5a2b] text-xs font-bold px-3 py-1 rounded-full shadow-xs w-fit uppercase tracking-wider">
                {product.ecoTypes?.[0] || 'Handmade'}
              </span>
            </div>

            {/* Video preview button */}
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(true)}
              className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md text-[#002c11] text-xs font-bold px-3.5 py-2 rounded-full shadow-lg flex items-center gap-1.5 hover:bg-white transition-all hover:scale-105"
              aria-label={`Watch Artisan Story Video for ${product.title}`}
            >
              <PlayCircle className="w-4 h-4 text-[#1b6d24]" />
              Artisan Story Video
            </button>
          </div>

          {/* Thumbnails row */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 bg-[#f5f3f3] transition-all min-h-[44px] ${
                    selectedImageIndex === idx
                      ? 'border-[#002c11] ring-2 ring-[#002c11]/20 scale-95'
                      : 'border-[#c1c9be]/50 opacity-75 hover:opacity-100'
                  }`}
                  aria-label={`View photo ${idx + 1} of ${images.length} for ${product.title}`}
                >
                  <img
                    src={getOptimizedImageUrl(imgUrl, 'thumb')}
                    alt={`${product.title} gallery thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Details & Purchase Actions */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-6">
          {/* Top Pill: SUNNO ECO VERIFIED */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b6d24] text-white text-xs font-bold shadow-xs uppercase tracking-wider">
                <Leaf className="w-3.5 h-3.5" />
                SUNNO ECO VERIFIED
              </span>
              <span className="text-xs text-[#717970] font-mono">SKU: {product.sku}</span>
            </div>

            {/* Compare Button */}
            {onToggleCompare && (
              <button
                onClick={() => onToggleCompare(product.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isCompared
                    ? 'bg-[#dbf5dc] border-[#1b6d24] text-[#1b6d24]'
                    : 'bg-white border-[#c1c9be] text-[#414941] hover:bg-[#f0eded]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isCompared ? 'Compared ✓' : 'Add to Compare'}</span>
              </button>
            )}
          </div>

          {/* Product Title */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#002c11] font-heading tracking-tight">
              {product.title}
            </h1>
            {/* Rating and Artisan coop */}
            <div className="flex items-center gap-4 mt-2 text-sm text-[#414941] flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-[#ba8300] text-[#ba8300]" />
                <span className="font-bold text-[#1b1c1c]">{product.rating || '4.9'}</span>
                <span className="text-[#717970]">
                  ({reviews.length || product.reviewsCount || 12} reviews)
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#717970]">Guild:</span>
                <button
                  type="button"
                  onClick={() => onSelectStore && onSelectStore(product.sellerId)}
                  className="text-[#002c11] font-bold hover:text-[#1b6d24] hover:underline"
                >
                  {product.sellerName || 'Artisan Guild'}
                </button>
                {product.sellerVerified && (
                  <ShieldCheck className="w-4 h-4 text-[#1b6d24]" title="Accredited Artisan" />
                )}
              </div>
              <span>•</span>
              <span className="text-xs text-[#717970] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#1b6d24]" />
                {product.district}, {product.division}
              </span>
            </div>
          </div>

          {/* Price & Stock Status */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-[#002c11] font-mono">
                ৳{product.price.toLocaleString('en-BD')}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm font-mono text-[#717970] line-through">
                  ৳{product.originalPrice}
                </span>
              )}
              <span className="text-xs text-[#717970]">
                Direct fair living wage to Bangladeshi artisans
              </span>
            </div>

            {/* Dynamic Stock Indicator */}
            <div className="flex items-center gap-2 flex-wrap">
              {isOutOfStock ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  <span>Out of Stock</span>
                </div>
              ) : isLowStock ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Low Stock: Only {availableStock} units remaining!</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e8f5e9] border border-[#a0f399] text-[#002c11] text-xs font-bold rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-[#1b6d24]" />
                  <span>In Stock ({availableStock} units ready for courier dispatch)</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm md:text-base text-[#414941] leading-relaxed">
            {product.description}
          </p>

          {/* Validation Error Alert */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-red-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Quantity, Add to Cart & Buy Now row */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Quantity Selector */}
              <div className="flex items-center border border-[#c1c9be] rounded-2xl px-3 py-1.5 bg-[#f5f3f3] w-fit">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={isOutOfStock || quantity <= 1}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[#414941] hover:text-[#002c11] hover:bg-white font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="w-12 text-center font-bold text-sm text-[#1b1c1c] font-mono">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                  disabled={isOutOfStock || quantity >= availableStock}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[#414941] hover:text-[#002c11] hover:bg-white font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 px-6 py-3.5 bg-[#002c11] text-white rounded-2xl hover:bg-[#1b6d24] transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>
                  Add to Bag • ৳{(product.price * Math.max(1, quantity)).toLocaleString('en-BD')}
                </span>
              </button>

              {/* Buy Now Direct Button */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="px-6 py-3.5 bg-[#1b6d24] text-white rounded-2xl hover:bg-[#13541b] transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                <span>Buy Now</span>
              </button>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={() => {
                  onToggleWishlist(product.id);
                  recordWishlistPrice(product.id, product.price);
                }}
                className={`w-12 h-12 rounded-2xl border border-[#c1c9be] flex items-center justify-center transition-colors shrink-0 ${
                  isWishlisted ? 'bg-red-50 text-red-500 border-red-200' : 'text-[#414941] hover:bg-[#f5f3f3]'
                }`}
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Toast feedback */}
          {addedToast && (
            <div className="p-3 bg-[#e8f5e9] border border-[#a0f399] rounded-2xl flex items-center gap-2 text-xs font-semibold text-[#002c11] animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-[#1b6d24]" />
              Added {quantity} item(s) to your bag! Packaged 100% plastic-free.
            </div>
          )}

          {/* Eco-Information Cards */}
          <div className="border-t border-[#c1c9be]/40 pt-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-[#002c11] uppercase tracking-wider font-heading">
              Artisan & Eco Verification Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Origin */}
              <div className="bg-[#f5f3f3] p-4 rounded-2xl border border-[#c1c9be]/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#002c11] mb-1">
                  <MapPin className="w-4 h-4 text-[#1b6d24]" />
                  Origin
                </div>
                <p className="text-xs text-[#414941] leading-relaxed">
                  {product.originInfo || `${product.district}, Bangladesh`}
                </p>
              </div>

              {/* Materials */}
              <div className="bg-[#f5f3f3] p-4 rounded-2xl border border-[#c1c9be]/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#002c11] mb-1">
                  <Leaf className="w-4 h-4 text-[#1b6d24]" />
                  Materials
                </div>
                <p className="text-xs text-[#414941] leading-relaxed">
                  {product.materialsInfo || product.materialsUsed || '100% Organic Raw Materials'}
                </p>
              </div>

              {/* End-of-Life */}
              <div className="bg-[#f5f3f3] p-4 rounded-2xl border border-[#c1c9be]/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#002c11] mb-1">
                  <Sparkles className="w-4 h-4 text-[#1b6d24]" />
                  End-of-Life
                </div>
                <p className="text-xs text-[#414941] leading-relaxed">
                  {product.endOfLifeInfo || '100% Biodegradable & Compostable in soil'}
                </p>
              </div>
            </div>

            {/* Nationwide Delivery & 7-Day Return Guarantee Cards */}
            <div className="mt-4 pt-4 border-t border-[#c1c9be]/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Shipping Information */}
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-4 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#1b6d24] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <h4 className="text-xs font-bold text-[#002c11]">Nationwide Eco Delivery</h4>
                  <div className="text-[11px] text-[#2e5b37] space-y-0.5">
                    <p><span className="font-semibold text-[#002c11]">Inside Dhaka:</span> ৳60 (Standard 24–48 hrs)</p>
                    <p><span className="font-semibold text-[#002c11]">Outside Dhaka:</span> ৳120 (Nationwide 48–72 hrs)</p>
                  </div>
                  <p className="text-[10px] text-[#414941] font-medium pt-0.5">
                    Shipped with 100% plastic-free biodegradable packaging via verified couriers.
                  </p>
                </div>
              </div>

              {/* 7-Day Return Guarantee */}
              <div className="bg-[#fdfbf7] border border-[#fef08a]/70 p-4 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#ca8a04] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <h4 className="text-xs font-bold text-[#002c11]">7-Day Hassle-Free Returns</h4>
                  <p className="text-[11px] text-[#713f12]">
                    100% Money-Back & Replacement Guarantee if the handcrafted item is damaged in transit or defective.
                  </p>
                  <p className="text-[10px] text-[#414941] font-medium pt-0.5">
                    Full payment directly supports the artisan cooperative upon safe delivery confirmation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews & Feedback Section */}
      <section className="border-t border-[#c1c9be]/40 pt-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-[#002c11] font-heading">
              Customer Reviews ({reviews.length})
            </h3>
            <p className="text-xs text-[#717970] mt-0.5">
              Verified feedback from conscious patrons across Bangladesh.
            </p>
          </div>

          {/* Rating filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedRatingFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold ${
                selectedRatingFilter === 'all'
                  ? 'bg-[#002c11] text-white'
                  : 'bg-[#f0eded] text-[#414941] hover:bg-[#e7e8e7]'
              }`}
            >
              All ({reviews.length})
            </button>
            {[5, 4, 3, 2, 1].map((stars) => (
              <button
                key={stars}
                onClick={() => setSelectedRatingFilter(stars)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${
                  selectedRatingFilter === stars
                    ? 'bg-[#002c11] text-white'
                    : 'bg-[#f0eded] text-[#414941] hover:bg-[#e7e8e7]'
                }`}
              >
                <span>{stars}★</span>
                <span className="text-[10px] opacity-75">({ratingBreakdown[stars] || 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Review Form */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#c1c9be]/60 mb-8 shadow-xs">
          <h4 className="text-sm font-bold text-[#002c11] mb-2 font-heading">
            Share Your Experience with this Artisan Craft
          </h4>
          <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="font-bold text-[#414941]">Rating:</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="text-[#ba8300]"
                  >
                    <Star
                      className={`w-5 h-5 ${star <= newRating ? 'fill-[#ba8300]' : 'text-[#c1c9be]'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <textarea
                rows={2}
                required
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="How is the texture, natural scent, finish, or artisan packaging?"
                className="w-full bg-[#fbf9f8] border border-[#c1c9be] rounded-2xl px-3.5 py-2 outline-none focus:border-[#002c11] text-xs text-[#002c11]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingReview}
              className="px-5 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-2xl font-bold text-xs shadow-xs transition-all"
            >
              {isSubmittingReview ? 'Submitting...' : 'Post Review'}
            </button>
          </form>
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <p className="text-xs text-[#717970]">
            No reviews match this star filter. Be the first to share your experience!
          </p>
        ) : (
          <div className="space-y-3">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-[#c1c9be]/60 text-xs space-y-1.5 shadow-2xs"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#002c11]">{rev.userName}</span>
                    {rev.verifiedPurchase && (
                      <span className="text-[10px] bg-[#dbf5dc] text-[#1b6d24] px-2 py-0.5 rounded-full font-bold">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="flex text-[#ba8300]">
                    {Array.from({ length: Math.round(rev.rating) }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#ba8300]" />
                    ))}
                  </div>
                </div>
                <p className="text-[#414941] leading-relaxed">{rev.comment}</p>
                <p className="text-[10px] text-[#717970]">
                  {new Date(rev.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 relative">
            <button
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#1b1c1c] hover:bg-[#e7e8e7]"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="w-5 h-5 text-[#1b6d24]" />
              <h3 className="text-lg font-bold text-[#002c11] font-heading">
                Artisan Story: {product.sellerName}
              </h3>
            </div>
            <div className="relative aspect-video bg-[#002c11] rounded-2xl overflow-hidden flex items-center justify-center text-white">
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[#a0f399] text-[#002c11] flex items-center justify-center mb-2 shadow-lg">
                  <PlayCircle className="w-8 h-8 fill-current" />
                </div>
                <p className="text-sm font-bold text-white font-heading">
                  Documentary: Preserving {product.district} Artisan Heritage
                </p>
                <p className="text-xs text-white/80 mt-1 max-w-sm">
                  Direct cooperative impact empowering sustainable local weavers and craftsmen.
                </p>
              </div>
            </div>
            <p className="text-xs text-[#414941] mt-4 leading-relaxed">
              Every purchase through SUNNO guarantees ethical living wages above regional averages,
              preserving traditional techniques passed down through generations.
            </p>
          </div>
        </div>
      )}

      {/* Related District Crafts */}
      {relatedDistrictProducts.length > 0 && (
        <section className="border-t border-[#c1c9be]/40 pt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-[#002c11] font-heading">
                More Sustainable Crafts from {product.district}
              </h3>
              <p className="text-xs text-[#717970]">
                Handmade by regional master guilds in {product.district} district.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {relatedDistrictProducts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectProduct(rel)}
                className="bg-white rounded-3xl border border-[#c1c9be]/50 overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-[#f5f3f3] overflow-hidden">
                    <img
                      src={rel.images[0]}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-4">
                    <span className="text-[10px] font-bold text-[#1b6d24] uppercase">
                      {rel.category}
                    </span>
                    <h4 className="text-xs font-bold text-[#1b1c1c] group-hover:text-[#1b6d24] transition-colors line-clamp-1 mt-0.5 font-heading">
                      {rel.title}
                    </h4>
                  </div>
                </div>
                <div className="p-4 pt-0 flex justify-between items-center border-t border-[#c1c9be]/30 pt-2">
                  <span className="text-xs font-mono font-bold text-[#002c11]">
                    ৳{rel.price.toLocaleString('en-BD')}
                  </span>
                  <span className="text-[11px] font-bold text-[#1b6d24] group-hover:underline flex items-center gap-0.5">
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Category Crafts */}
      {relatedCategoryProducts.length > 0 && (
        <section className="border-t border-[#c1c9be]/40 pt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-[#002c11] font-heading">
                You May Also Like ({product.category})
              </h3>
              <p className="text-xs text-[#717970]">
                Similar eco-friendly products curated from other districts.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {relatedCategoryProducts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectProduct(rel)}
                className="bg-white rounded-3xl border border-[#c1c9be]/50 overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-[#f5f3f3] overflow-hidden">
                    <img
                      src={rel.images[0]}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-4">
                    <span className="text-[10px] font-bold text-[#1b6d24] uppercase">
                      {rel.district}
                    </span>
                    <h4 className="text-xs font-bold text-[#1b1c1c] group-hover:text-[#1b6d24] transition-colors line-clamp-1 mt-0.5 font-heading">
                      {rel.title}
                    </h4>
                  </div>
                </div>
                <div className="p-4 pt-0 flex justify-between items-center border-t border-[#c1c9be]/30 pt-2">
                  <span className="text-xs font-mono font-bold text-[#002c11]">
                    ৳{rel.price.toLocaleString('en-BD')}
                  </span>
                  <span className="text-[11px] font-bold text-[#1b6d24] group-hover:underline flex items-center gap-0.5">
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};
