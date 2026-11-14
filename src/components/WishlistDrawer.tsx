import React from 'react';
import { Product } from '../types';
import { BRAND_LOGO } from '../data/mockData';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistIds: string[];
  allProducts: Product[];
  onRemoveFromWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlistIds,
  allProducts,
  onRemoveFromWishlist,
  onAddToCart,
  onSelectProduct,
}) => {
  if (!isOpen) return null;

  const wishlistProducts = allProducts.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-6 border-b border-[#c1c9be]/50 flex items-center justify-between bg-[#fbf9f8]">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#1b6d24] text-2xl">favorite</span>
              <div>
                <h2 className="text-lg font-extrabold text-[#002c11] font-heading">
                  My Eco Wishlist
                </h2>
                <p className="text-xs text-[#717970]">
                  {wishlistProducts.length} saved sustainable craft items
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#e7e8e7] text-[#414941] transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {wishlistProducts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-[#f0eded] mx-auto flex items-center justify-center text-[#717970] mb-4">
                  <span className="material-symbols-outlined text-3xl">favorite_border</span>
                </div>
                <h3 className="text-base font-bold text-[#1b1c1c]">Your wishlist is empty</h3>
                <p className="text-xs text-[#717970] mt-1 max-w-xs mx-auto">
                  Save handcrafted Bangladesh artisan treasures to your wishlist while exploring.
                </p>
              </div>
            ) : (
              wishlistProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-2xl p-3.5 flex gap-3 items-center group hover:border-[#1b6d24] transition-all"
                >
                  <img
                    src={product.images[0] || BRAND_LOGO}
                    alt={product.title}
                    className="w-16 h-16 rounded-xl object-cover border border-[#c1c9be]/40 shrink-0 cursor-pointer"
                    onClick={() => {
                      onSelectProduct(product);
                      onClose();
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4
                      className="text-xs font-bold text-[#002c11] truncate cursor-pointer hover:underline"
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                    >
                      {product.title}
                    </h4>
                    <p className="text-[11px] text-[#717970] truncate">
                      {product.sellerName} • {product.district}
                    </p>
                    <div className="text-xs font-mono font-bold text-[#002c11] mt-1">
                      ৳{product.price}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        if ((product.stock || 0) > 0) {
                          onAddToCart(product);
                          onRemoveFromWishlist(product.id);
                        }
                      }}
                      disabled={(product.stock || 0) <= 0}
                      className="p-2 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={(product.stock || 0) <= 0 ? "Out of Stock" : "Move to Cart"}
                    >
                      <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                    </button>
                    <button
                      onClick={() => onRemoveFromWishlist(product.id)}
                      className="p-2 hover:bg-red-50 text-[#717970] hover:text-red-600 rounded-xl transition-colors"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
