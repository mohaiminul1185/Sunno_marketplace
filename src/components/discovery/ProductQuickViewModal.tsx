import React, { useState } from 'react';
import { Product } from '../../types';
import { BRAND_LOGO } from '../../data/mockData';
import {
  X,
  Heart,
  ShoppingCart,
  ShieldCheck,
  MapPin,
  Star,
  Check,
  ArrowRight,
  Truck,
  Leaf,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ProductQuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onSelectProduct: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
}

export const ProductQuickViewModal: React.FC<ProductQuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onSelectProduct,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  if (!isOpen || !product) return null;

  const images = product.images && product.images.length > 0 ? product.images : [BRAND_LOGO];
  const availableStock = typeof product.stock === 'number' ? product.stock : 10;
  const isOutOfStock = availableStock <= 0 || product.status === 'out_of_stock';
  const isLowStock = !isOutOfStock && availableStock <= 5;
  const isEcoVerified = product.status === 'eco_verified' || product.ecoVerified;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const handleGoToFullDetails = () => {
    onSelectProduct(product);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden z-10 border border-[#c1c9be]/60 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/90 text-[#414941] hover:bg-[#f0eded] hover:text-[#002c11] shadow-sm transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Gallery */}
          <div className="p-6 bg-[#fbf9f8] flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#c1c9be]/40">
            <div>
              {/* Main Image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-[#c1c9be]/50 mb-3 shadow-xs">
                <img
                  src={images[selectedImgIdx] || images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover object-center"
                />

                {/* Eco Verification Pill */}
                {isEcoVerified && (
                  <div className="absolute top-3 left-3 bg-[#002c11]/90 backdrop-blur-md text-[#b4f0b9] text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#30e872]" />
                    <span>Eco Verified</span>
                  </div>
                )}

                {/* Discount Badge */}
                {product.discount && product.discount > 0 && (
                  <div className="absolute top-3 right-3 bg-[#ba1a1a] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    {product.discount}% OFF
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImgIdx(idx)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        selectedImgIdx === idx
                          ? 'border-[#1b6d24] scale-95 shadow-xs'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* District Origin Tagline */}
            <div className="mt-4 pt-4 border-t border-[#c1c9be]/40 flex items-center justify-between text-xs text-[#717970]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#1b6d24]" />
                <span className="font-semibold text-[#002c11]">
                  {product.district}, {product.division}
                </span>
              </div>
              <span className="text-[11px] bg-[#e7e8e7] px-2 py-0.5 rounded-full text-[#414941]">
                Artisan Guild
              </span>
            </div>
          </div>

          {/* Right: Product Info & Actions */}
          <div className="p-6 sm:p-7 flex flex-col justify-between space-y-4">
            <div>
              {/* Breadcrumb matching showcase: Shop > Category > Product */}
              <div className="flex items-center gap-1.5 text-xs text-[#717970] mb-2.5">
                <span>Shop</span>
                <span>&gt;</span>
                <span className="hover:text-[#1b6d24] cursor-pointer">{product.category}</span>
                <span>&gt;</span>
                <span className="text-[#002c11] font-medium truncate max-w-[150px]">{product.title}</span>
              </div>

              {/* Title & Rating */}
              <h3 className="text-xl sm:text-2xl font-serif-luxury font-normal text-[#002c11] leading-tight mb-2">
                {product.title}
              </h3>

              {/* Price Row */}
              <div className="flex items-baseline gap-3 mb-2.5">
                <span className="text-2xl sm:text-3xl font-bold text-[#002c11] font-mono">
                  ৳ {product.price.toLocaleString('en-BD')}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm font-mono text-[#717970] line-through">
                    ৳ {product.originalPrice.toLocaleString('en-BD')}
                  </span>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1.5 text-xs text-[#002c11] mb-3">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <span className="font-bold">{product.rating ? product.rating.toFixed(1) : '4.8'}</span>
                <span className="text-[#717970]">
                  ({product.reviewsCount || product.reviewCount || 124} reviews)
                </span>
              </div>

              {/* Description Excerpt */}
              <p className="text-xs sm:text-sm text-[#414941] leading-relaxed line-clamp-3 mb-4 font-light">
                {product.shortDescription || product.description || 'A gentle, chemical-free product made from authentic natural ingredients.'}
              </p>

              {/* Verified & Stock Tags Matching Showcase Reference */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b6d24] bg-[#eef7ee] px-2.5 py-1 rounded-full border border-[#1b6d24]/20">
                  <Check className="w-3 h-3 text-[#1b6d24] stroke-[3]" />
                  <span>In Stock</span>
                </span>
                {isEcoVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b6d24] bg-[#eef7ee] px-2.5 py-1 rounded-full border border-[#1b6d24]/20">
                    <Check className="w-3 h-3 text-[#1b6d24] stroke-[3]" />
                    <span>Eco Verified</span>
                  </span>
                )}
              </div>
            </div>

            {/* Actions Section */}
            <div className="space-y-3 pt-3 border-t border-[#c1c9be]/40">
              {/* Quantity Picker & Add to Cart */}
              <div className="flex items-center gap-3">
                {!isOutOfStock && (
                  <div className="flex items-center border border-[#c1c9be] rounded-2xl bg-[#f5f3f3] p-1 shrink-0">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-[#002c11] hover:bg-white disabled:opacity-30 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-bold font-mono text-[#002c11]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                      disabled={quantity >= availableStock}
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-[#002c11] hover:bg-white disabled:opacity-30 transition-colors"
                    >
                      +
                    </button>
                  </div>
                )}

                <button
                  onClick={handleAdd}
                  disabled={isOutOfStock}
                  className="flex-1 py-3 px-6 rounded-full bg-[#133e1d] hover:bg-[#1a5227] disabled:bg-[#c1c9be] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
                </button>

                <button
                  onClick={() => onToggleWishlist(product.id)}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-90 ${
                    isWishlisted
                      ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]'
                      : 'border-[#c1c9be] text-[#414941] hover:bg-[#f0eded] hover:text-[#002c11]'
                  }`}
                  title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Added Toast Alert */}
              {addedToast && (
                <div className="bg-[#dbf5dc] border border-[#1b6d24]/30 text-[#1b6d24] text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4 text-[#1b6d24]" />
                  Added {quantity} item{quantity > 1 ? 's' : ''} to your sustainable bag!
                </div>
              )}

              {/* View Full Product Details Link */}
              <button
                onClick={handleGoToFullDetails}
                className="w-full text-center text-xs font-bold text-[#1b6d24] hover:text-[#002c11] hover:underline flex items-center justify-center gap-1 pt-1 transition-colors"
              >
                <span>View Complete Artisan Heritage & Eco Audit Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
