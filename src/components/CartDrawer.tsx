import React, { useState } from 'react';
import { CartItem, Product } from '../types';
import { BRAND_LOGO } from '../data/mockData';
import { SavedForLaterItem } from '../services/cartService';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  savedForLater?: SavedForLaterItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onSaveForLater?: (productId: string) => void;
  onMoveToCartFromSaved?: (productId: string) => void;
  onRemoveSavedItem?: (productId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onSelectProduct?: (product: Product) => void;
  appliedCoupon?: string;
  onApplyCoupon?: (code: string) => Promise<boolean>;
  onRemoveCoupon?: () => void;
  couponDiscount?: number;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  savedForLater = [],
  onUpdateQuantity,
  onRemoveItem,
  onSaveForLater,
  onMoveToCartFromSaved,
  onRemoveSavedItem,
  onClearCart,
  onProceedToCheckout,
  onSelectProduct,
  appliedCoupon = '',
  onApplyCoupon,
  onRemoveCoupon,
  couponDiscount = 0,
}) => {
  const [couponCodeInput, setCouponCodeInput] = useState(appliedCoupon);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<'dhaka' | 'outside'>('dhaka');
  const [activeTab, setActiveTab] = useState<'cart' | 'saved'>('cart');

  if (!isOpen) return null;

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const freeDeliveryThreshold = 2500;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const baseDeliveryFee = deliveryLocation === 'dhaka' ? 60 : 120;
  const estimatedDelivery = isFreeDelivery ? 0 : baseDeliveryFee;
  const discountAmount = Math.min(subtotal, Math.max(0, couponDiscount));
  const estimatedTotal = Math.max(0, subtotal - discountAmount + estimatedDelivery);
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

  // Group items by Seller/Store
  const itemsBySeller = cart.reduce((acc, item) => {
    const seller = item.product.sellerName || 'Artisan Cooperative';
    if (!acc[seller]) {
      acc[seller] = [];
    }
    acc[seller].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  const sellerCount = Object.keys(itemsBySeller).length;
  const hasOutOfStockItems = cart.some((item) => (item.product.stock || 0) <= 0);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim() || !onApplyCoupon) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const success = await onApplyCoupon(couponCodeInput.trim());
      if (!success) {
        setCouponError('Invalid or expired coupon code.');
      }
    } catch {
      setCouponError('Could not validate coupon.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-md bg-[#fbf9f8] shadow-2xl flex flex-col justify-between border-l border-[#c1c9be]">
          {/* Header */}
          <div className="p-5 border-b border-[#c1c9be]/60 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#002c11] text-[#a0f399] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#002c11] font-heading flex items-center gap-2">
                  <span>Shopping Cart</span>
                  {totalItemCount > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-[#e8f5e9] text-[#1b6d24] rounded-full">
                      {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-[#717970]">
                  Authentic Bangladeshi Artisan Heritage
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941] hover:bg-[#e0dede] transition-colors"
              title="Close Cart"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Cart vs Saved For Later Tabs */}
          <div className="flex border-b border-[#c1c9be]/40 bg-white px-5 pt-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('cart')}
              className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'cart'
                  ? 'border-[#002c11] text-[#002c11]'
                  : 'border-transparent text-[#717970] hover:text-[#1b1c1c]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
              <span>Cart ({totalItemCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'border-[#002c11] text-[#002c11]'
                  : 'border-transparent text-[#717970] hover:text-[#1b1c1c]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">bookmark</span>
              <span>Saved for Later ({savedForLater.length})</span>
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          {cart.length > 0 && activeTab === 'cart' && (
            <div className="bg-[#e8f5e9]/70 border-b border-[#a0f399]/60 px-5 py-2.5 text-xs text-[#002c11]">
              <div className="flex justify-between items-center mb-1 font-semibold">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#1b6d24]">local_shipping</span>
                  {isFreeDelivery ? (
                    <span className="text-[#1b6d24] font-bold">You qualify for FREE Eco-Delivery!</span>
                  ) : (
                    <span>
                      Add <strong>৳{amountToFreeDelivery.toLocaleString()}</strong> for Free Delivery
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-[#717970] font-mono">
                  {Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100))}%
                </span>
              </div>
              <div className="w-full bg-[#c1c9be]/40 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#1b6d24] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
            {activeTab === 'saved' ? (
              /* SAVED FOR LATER TAB */
              <div className="space-y-3">
                {savedForLater.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-[#717970]/50">bookmark_border</span>
                    <p className="text-xs font-bold text-[#002c11]">No saved items</p>
                    <p className="text-[11px] text-[#717970]">
                      Items you save from your cart will appear here so you can purchase them anytime.
                    </p>
                  </div>
                ) : (
                  savedForLater.map((saved) => (
                    <div
                      key={saved.product.id}
                      className="bg-white rounded-2xl p-3 border border-[#c1c9be]/60 flex gap-3 items-center shadow-xs"
                    >
                      <img
                        src={saved.product.images[0] || BRAND_LOGO}
                        alt={saved.product.title}
                        className="w-14 h-14 rounded-xl object-cover border border-[#c1c9be]/40 shrink-0 cursor-pointer"
                        onClick={() => {
                          if (onSelectProduct) {
                            onSelectProduct(saved.product);
                            onClose();
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4
                          onClick={() => {
                            if (onSelectProduct) {
                              onSelectProduct(saved.product);
                              onClose();
                            }
                          }}
                          className="text-xs font-bold text-[#002c11] truncate cursor-pointer hover:text-[#1b6d24]"
                        >
                          {saved.product.title}
                        </h4>
                        <p className="text-[11px] text-[#717970]">{saved.product.district}</p>
                        <div className="text-xs font-bold text-[#002c11] mt-0.5">
                          ৳{saved.product.price.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          onClick={() => onMoveToCartFromSaved && onMoveToCartFromSaved(saved.product.id)}
                          className="px-2.5 py-1 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-lg text-[11px] font-bold transition-colors shadow-xs"
                        >
                          Move to Cart
                        </button>
                        <button
                          onClick={() => onRemoveSavedItem && onRemoveSavedItem(saved.product.id)}
                          className="text-[10px] text-[#717970] hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* CART ITEMS TAB */
              <>
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-[#e8f5e9] flex items-center justify-center text-[#1b6d24]">
                      <span className="material-symbols-outlined text-[32px]">remove_shopping_cart</span>
                    </div>
                    <h3 className="text-base font-bold text-[#002c11] font-heading">Your cart is empty</h3>
                    <p className="text-xs text-[#717970] max-w-xs leading-relaxed">
                      Explore authentic bamboo, handloom khadi, terracotta planters, and raw honey crafted across 64 Bangladesh districts.
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-2 px-5 py-2.5 bg-[#002c11] text-white text-xs font-bold rounded-full hover:bg-[#0d4421] transition-colors"
                    >
                      Explore Eco Marketplace
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Out of Stock Notice */}
                    {hasOutOfStockItems && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-red-600 shrink-0">warning</span>
                        <span>Some items are out of stock. Please remove them before checkout.</span>
                      </div>
                    )}

                    {/* Grouped by Seller */}
                    {(Object.entries(itemsBySeller) as [string, CartItem[]][]).map(([sellerName, items]) => (
                      <div
                        key={sellerName}
                        className="bg-white rounded-2xl p-3.5 border border-[#c1c9be]/60 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-[#c1c9be]/30 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#002c11]">
                            <span className="material-symbols-outlined text-[16px] text-[#1b6d24]">
                              storefront
                            </span>
                            <span>{sellerName}</span>
                          </div>
                          <span className="text-[11px] text-[#717970]">
                            {items.length} {items.length > 1 ? 'items' : 'item'}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {items.map((item) => {
                            const availableStock = typeof item.product.stock === 'number' ? item.product.stock : 10;
                            const isOutOfStock = availableStock <= 0;
                            const isLowStock = !isOutOfStock && availableStock <= 5;
                            const isMaxReached = item.quantity >= availableStock;

                            return (
                              <div
                                key={item.product.id}
                                className={`flex gap-3 items-start ${isOutOfStock ? 'opacity-60' : ''}`}
                              >
                                <img
                                  src={item.product.images[0] || BRAND_LOGO}
                                  alt={item.product.title}
                                  onClick={() => {
                                    if (onSelectProduct) {
                                      onSelectProduct(item.product);
                                      onClose();
                                    }
                                  }}
                                  className="w-16 h-16 rounded-xl object-cover border border-[#c1c9be]/40 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4
                                    onClick={() => {
                                      if (onSelectProduct) {
                                        onSelectProduct(item.product);
                                        onClose();
                                      }
                                    }}
                                    className="text-xs font-bold text-[#002c11] truncate cursor-pointer hover:text-[#1b6d24]"
                                  >
                                    {item.product.title}
                                  </h4>
                                  <div className="flex items-center gap-1.5 text-[10px] text-[#717970] mt-0.5">
                                    <span className="bg-[#f0eded] px-1.5 py-0.2 rounded font-medium text-[#414941]">
                                      {item.product.district}
                                    </span>
                                    {item.product.ecoVerified && (
                                      <span className="text-[#1b6d24] font-bold flex items-center">
                                        <span className="material-symbols-outlined text-[12px] mr-0.5">eco</span>
                                        Eco Verified
                                      </span>
                                    )}
                                  </div>

                                  {/* Stock Status */}
                                  <div className="mt-1">
                                    {isOutOfStock ? (
                                      <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                                        Out of Stock
                                      </span>
                                    ) : isLowStock ? (
                                      <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                                        Only {availableStock} left
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-[#1b6d24] font-medium bg-[#e8f5e9] px-1.5 py-0.5 rounded">
                                        In Stock ({availableStock})
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs font-bold text-[#002c11] mt-1.5">
                                    ৳{item.product.price.toLocaleString()} × {item.quantity} ={' '}
                                    <span className="text-[#1b6d24] font-mono">
                                      ৳{(item.product.price * item.quantity).toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Action Links */}
                                  <div className="flex items-center gap-3 mt-2 text-[11px]">
                                    {onSaveForLater && (
                                      <button
                                        onClick={() => onSaveForLater(item.product.id)}
                                        className="text-[#717970] hover:text-[#002c11] transition-colors flex items-center gap-0.5"
                                        title="Save for Later"
                                      >
                                        <span className="material-symbols-outlined text-[13px]">bookmark_border</span>
                                        Save for later
                                      </button>
                                    )}
                                    <button
                                      onClick={() => onRemoveItem(item.product.id)}
                                      className="text-[#717970] hover:text-red-600 transition-colors flex items-center gap-0.5"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">delete</span>
                                      Remove
                                    </button>
                                  </div>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <div className="flex items-center border border-[#c1c9be] rounded-lg bg-[#fbf9f8] overflow-hidden">
                                    <button
                                      onClick={() => onUpdateQuantity(item.product.id, -1)}
                                      className="w-7 h-7 flex items-center justify-center text-xs hover:bg-[#e7e8e7] transition-colors font-bold text-[#414941]"
                                      title="Decrease quantity"
                                    >
                                      -
                                    </button>
                                    <span className="px-2 text-xs font-mono font-bold text-[#002c11]">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() => onUpdateQuantity(item.product.id, 1)}
                                      disabled={isOutOfStock || isMaxReached}
                                      className="w-7 h-7 flex items-center justify-center text-xs hover:bg-[#e7e8e7] transition-colors font-bold text-[#414941] disabled:opacity-30 disabled:cursor-not-allowed"
                                      title={isMaxReached ? 'Max stock reached' : 'Increase quantity'}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Clear Cart and Vendor Count */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-[#717970]">
                        Sourced from <strong className="text-[#002c11]">{sellerCount}</strong> {sellerCount === 1 ? 'artisan co-op' : 'artisan co-ops'}
                      </span>
                      {cart.length > 1 && (
                        <button
                          onClick={onClearCart}
                          className="text-[#717970] hover:text-red-600 font-medium hover:underline transition-colors"
                        >
                          Clear All Items
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer / Calculations and Checkout */}
          {cart.length > 0 && activeTab === 'cart' && (
            <div className="p-4 sm:p-5 border-t border-[#c1c9be]/60 bg-white space-y-3.5">
              {/* Coupon input */}
              {onApplyCoupon && (
                <form onSubmit={handleApplyCoupon} className="space-y-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Coupon Code (e.g. ECOGREEN10)"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 h-9 px-3 text-xs uppercase font-mono tracking-wider rounded-xl border border-[#c1c9be] bg-[#fbf9f8] focus:border-[#002c11] focus:ring-1 focus:ring-[#002c11] outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponCodeInput.trim()}
                      className="px-3 h-9 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
                    >
                      {isApplyingCoupon ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-[10px] text-red-600 font-medium">{couponError}</p>}
                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-[11px] text-[#1b6d24] bg-[#e8f5e9] px-2.5 py-1 rounded-lg">
                      <span>
                        ✓ Coupon <strong>{appliedCoupon}</strong> active
                      </span>
                      {onRemoveCoupon && (
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveCoupon();
                            setCouponCodeInput('');
                          }}
                          className="text-red-600 hover:underline text-[10px] font-bold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </form>
              )}

              {/* Delivery District Toggle */}
              <div className="flex items-center justify-between text-[11px] bg-[#f5f3f3] p-2 rounded-xl border border-[#c1c9be]/50">
                <span className="text-[#414941] font-medium">Delivery Destination:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDeliveryLocation('dhaka')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                      deliveryLocation === 'dhaka'
                        ? 'bg-[#002c11] text-white'
                        : 'bg-white text-[#717970] hover:text-[#002c11]'
                    }`}
                  >
                    Inside Dhaka (৳60)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryLocation('outside')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                      deliveryLocation === 'outside'
                        ? 'bg-[#002c11] text-white'
                        : 'bg-white text-[#717970] hover:text-[#002c11]'
                    }`}
                  >
                    Outside Dhaka (৳120)
                  </button>
                </div>
              </div>

              {/* Summary line items */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#717970]">
                  <span>Items Subtotal ({totalItemCount}):</span>
                  <span className="font-mono font-bold text-[#1b1c1c]">৳{subtotal.toLocaleString()}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#1b6d24] font-medium">
                    <span>Coupon Savings:</span>
                    <span className="font-mono font-bold">-৳{discountAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-[#717970]">
                  <span>Eco Courier Delivery:</span>
                  <span className="font-mono font-bold text-[#1b1c1c]">
                    {estimatedDelivery === 0 ? (
                      <span className="text-[#1b6d24]">FREE (Eco Order &gt; ৳2.5k)</span>
                    ) : (
                      `৳${estimatedDelivery}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-extrabold text-[#002c11] pt-2 border-t border-[#c1c9be]/40">
                  <span>Estimated Total:</span>
                  <span className="font-mono text-base text-[#1b6d24]">
                    ৳{estimatedTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Proceed Button */}
              <button
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                disabled={hasOutOfStockItems}
                className="w-full py-3.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                <span>Proceed to Eco-Checkout</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>

              <p className="text-[10px] text-center text-[#717970]">
                🌿 Multi-vendor delivery • 100% Biodegradable packaging • Direct artisan support
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
