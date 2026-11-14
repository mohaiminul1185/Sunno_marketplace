import React from 'react';
import { Product } from '../types';
import {
  ShieldCheck,
  MapPin,
  Heart,
  Eye,
  ShoppingBag,
  Star,
  Layers,
  Leaf,
} from 'lucide-react';
import {
  getOptimizedImageUrl,
  getOptimizedSrcSet,
  CARD_IMAGE_SIZES,
  DEFAULT_PRODUCT_FALLBACK,
} from '../utils/imageOptimizer';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
  onOpenQuickView?: (product: Product) => void;
  comparedProductIds?: string[];
  onToggleCompare?: (productId: string) => void;
  priorityImage?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onAddToCart,
  isWishlisted = false,
  onToggleWishlist,
  onOpenQuickView,
  comparedProductIds = [],
  onToggleCompare,
  priorityImage = false,
}) => {
  const isCompared = comparedProductIds.includes(product.id);

  const hasDiscount = Boolean(product.discount && product.discount > 0);
  const discountPct = product.discount || 0;
  const originalPrice = hasDiscount
    ? Math.round(product.price / (1 - discountPct / 100))
    : undefined;

  const isEcoVerified =
    product.status === 'eco_verified' || Boolean(product.ecoVerified);

  const isOutOfStock =
    product.status === 'out_of_stock' ||
    (typeof product.stock === 'number' && product.stock <= 0);

  const isLowStock =
    !isOutOfStock &&
    typeof product.stock === 'number' &&
    product.stock > 0 &&
    product.stock <= (product.lowStockThreshold || 5);

  const rawImageUrl =
    product.images && product.images.length > 0
      ? product.images[0]
      : DEFAULT_PRODUCT_FALLBACK;
  const imageUrl = getOptimizedImageUrl(rawImageUrl, 'card');
  const imageSrcSet = getOptimizedSrcSet(rawImageUrl);

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      className="bg-white rounded-2xl border border-[#c1c9be]/50 overflow-hidden hover:shadow-[0_14px_36px_rgba(0,44,17,0.10)] hover:border-[#1b6d24]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer group relative w-full h-full select-none"
    >
      {/* Top Image Container */}
      <div className="relative aspect-[4/3] bg-[#f5f3f3] overflow-hidden">
        <img
          src={imageUrl}
          srcSet={imageSrcSet}
          sizes={CARD_IMAGE_SIZES}
          alt={`${product.title} - ${product.category || 'Eco Craft'} from ${product.district || 'Bangladesh'}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading={priorityImage ? 'eager' : 'lazy'}
          decoding="async"
        />

        {/* Top Left Badges: Eco Type & Discount */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
          {product.ecoTypes && product.ecoTypes.length > 0 ? (
            <span className="bg-[#f5f5dc]/95 backdrop-blur-xs text-[#8b5a2b] text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs uppercase tracking-wider">
              {product.ecoTypes[0]}
            </span>
          ) : isEcoVerified ? (
            <span className="bg-white/95 backdrop-blur-xs text-[#1b6d24] text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs border border-[#1b6d24]/20 uppercase tracking-wider">
              <Leaf className="w-2.5 h-2.5 text-[#1b6d24]" />
              ECO-VERIFIED
            </span>
          ) : null}

          {hasDiscount && (
            <span className="bg-[#ba1a1a] text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-2xs w-fit">
              -{discountPct}% OFF
            </span>
          )}
        </div>

        {/* Bottom Image Info: Origin District & Eco Verification */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] pointer-events-none gap-1">
          {product.district ? (
            <span className="bg-black/65 backdrop-blur-xs text-white px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold truncate max-w-[65%]">
              <MapPin className="w-3 h-3 text-[#30e872] shrink-0" />
              <span className="truncate">{product.district}</span>
            </span>
          ) : (
            <span></span>
          )}

          {isEcoVerified ? (
            <span className="bg-[#1b6d24] text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 font-bold shadow-2xs text-[9px] whitespace-nowrap shrink-0">
              <ShieldCheck className="w-3 h-3 text-[#a0f399]" />
              <span>VERIFIED</span>
            </span>
          ) : product.status === 'under_review' || product.status === 'pending' ? (
            <span className="bg-[#f0eded] text-[#717970] px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap shrink-0">
              Under Review
            </span>
          ) : null}
        </div>

        {/* Top Right Floating Actions */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-20">
          {onToggleWishlist && (
            <button
              type="button"
              id={`wishlist-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist(product.id);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${
                isWishlisted
                  ? 'bg-red-50 text-red-500'
                  : 'bg-white/90 text-[#414941] hover:text-red-500'
              }`}
              title={isWishlisted ? 'Remove from Saved' : 'Save for Later'}
              aria-label={isWishlisted ? `Remove ${product.title} from Saved` : `Save ${product.title} for Later`}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isWishlisted ? 'fill-current text-red-500' : ''
                }`}
              />
            </button>
          )}

          {onOpenQuickView && (
            <button
              type="button"
              id={`quickview-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenQuickView(product);
              }}
              className="w-8 h-8 rounded-full bg-white/90 text-[#414941] hover:text-[#002c11] flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
              title="Quick View"
              aria-label={`Quick View for ${product.title}`}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {onToggleCompare && (
            <button
              type="button"
              id={`compare-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(product.id);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 hidden sm:flex ${
                isCompared
                  ? 'bg-[#1b6d24] text-white opacity-100'
                  : 'bg-white/90 text-[#414941] hover:text-[#1b6d24]'
              }`}
              title={isCompared ? 'Remove from Compare' : 'Add to Compare'}
              aria-label={isCompared ? `Remove ${product.title} from Compare` : `Add ${product.title} to Compare`}
            >
              <Layers className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Product Content */}
      <div className="p-3 sm:p-3.5 md:p-4 flex-1 flex flex-col justify-between gap-2">
        <div className="space-y-1">
          {/* Category & Seller */}
          <div className="flex items-center justify-between text-[11px] text-[#717970] gap-2">
            <span className="font-semibold text-[#1b6d24] truncate">
              {product.category || 'Eco Craft'}
            </span>
            <span className="truncate max-w-[110px] text-right" title={product.sellerName}>
              {product.sellerName || 'Artisan Workshop'}
            </span>
          </div>

          {/* Product Title (2-line clamped with minimum height for row uniformity) */}
          <h3 className="text-xs sm:text-sm font-bold text-[#1b1c1c] group-hover:text-[#1b6d24] transition-colors line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem] leading-snug">
            {product.title}
          </h3>

          {/* Ratings & Stock Status */}
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <div className="flex items-center gap-1 text-[#e28700] font-bold">
              <Star className="w-3.5 h-3.5 fill-current text-[#e28700]" />
              <span>{product.rating ? product.rating.toFixed(1) : '5.0'}</span>
              <span className="text-[#717970] font-normal text-[10px]">
                ({product.reviewsCount || 12})
              </span>
            </div>

            {/* Stock Indicator */}
            {isOutOfStock ? (
              <span className="text-[10px] font-bold text-[#ba1a1a] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span>
                Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="text-[10px] font-bold text-[#e28700] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e28700]"></span>
                {product.stock} left
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-[#1b6d24] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1b6d24]"></span>
                In Stock
              </span>
            )}
          </div>
        </div>

        {/* Price & Add to Cart Button */}
        <div className="flex items-center justify-between pt-2 border-t border-[#c1c9be]/30 mt-1">
          <div className="min-w-0 pr-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-extrabold text-[#002c11] whitespace-nowrap tabular-nums font-mono">
                ৳{product.price.toLocaleString('en-BD')}
              </span>
              {originalPrice && (
                <span className="text-[10px] text-[#717970] line-through whitespace-nowrap tabular-nums font-mono">
                  ৳{originalPrice.toLocaleString('en-BD')}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            id={`add-to-cart-${product.id}`}
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              if (!isOutOfStock) onAddToCart(product, e);
            }}
            className={`min-h-[36px] sm:min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-95 shrink-0 ${
              isOutOfStock
                ? 'bg-[#f0eded] text-[#717970] cursor-not-allowed'
                : 'bg-[#002c11] hover:bg-[#1b6d24] text-white'
            }`}
            title={isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
            aria-label={isOutOfStock ? `${product.title} is Out of Stock` : `Add ${product.title} to Shopping Bag`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden min-[380px]:inline font-medium">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
