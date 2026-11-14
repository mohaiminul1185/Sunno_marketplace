import React from 'react';
import { Product } from '../../types';
import { BRAND_LOGO } from '../../data/mockData';
import {
  X,
  ShieldCheck,
  MapPin,
  Star,
  ShoppingCart,
  ArrowRight,
  Trash2,
  Leaf,
  Layers,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ProductCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRemoveProduct: (productId: string) => void;
  onClearAll: () => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductCompareModal: React.FC<ProductCompareModalProps> = ({
  isOpen,
  onClose,
  products,
  onRemoveProduct,
  onClearAll,
  onAddToCart,
  onSelectProduct,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden z-10 border border-[#c1c9be]/60 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-[#c1c9be]/40 bg-[#fbf9f8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eef7ee] border border-[#1b6d24]/20 flex items-center justify-center text-[#1b6d24]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#002c11] font-heading">
                Compare Sustainable Crafts
              </h2>
              <p className="text-xs text-[#717970]">
                Side-by-side artisan lineage, material audit, and ecological impact comparison ({products.length}/4)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {products.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-[#ba1a1a] hover:underline font-bold"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#e7e8e7] text-[#414941] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-auto p-6">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#f0eded] mx-auto flex items-center justify-center text-[#717970] mb-4">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#002c11]">No products selected for comparison</h3>
              <p className="text-xs text-[#717970] mt-1 max-w-sm mx-auto">
                Click the "Compare" checkbox or button on any product card across SUNNO to compare materials, origins, and sustainability ratings.
              </p>
            </div>
          ) : (
            <div className="min-w-[600px] overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#c1c9be]/40">
                    <th className="w-44 text-left p-3 text-xs font-bold text-[#717970] uppercase tracking-wider bg-[#fbf9f8]">
                      Product & Action
                    </th>
                    {products.map((p) => (
                      <th key={p.id} className="p-3 text-left w-64 align-top">
                        <div className="relative group bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/40">
                          <button
                            onClick={() => onRemoveProduct(p.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 text-[#717970] hover:text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors"
                            title="Remove from comparison"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <img
                            src={p.images?.[0] || BRAND_LOGO}
                            alt={p.title}
                            className="w-full h-32 object-cover rounded-xl mb-2 cursor-pointer"
                            onClick={() => {
                              onSelectProduct(p);
                              onClose();
                            }}
                          />
                          <h4
                            className="text-xs font-bold text-[#002c11] line-clamp-2 cursor-pointer hover:underline"
                            onClick={() => {
                              onSelectProduct(p);
                              onClose();
                            }}
                          >
                            {p.title}
                          </h4>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-mono font-bold text-[#002c11]">
                              ৳{p.price}
                            </span>
                            <button
                              onClick={() => onAddToCart(p)}
                              className="text-[11px] font-bold bg-[#002c11] text-white px-2.5 py-1 rounded-xl hover:bg-[#1b6d24] flex items-center gap-1 transition-colors"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c1c9be]/30 text-xs">
                  {/* Category */}
                  <tr>
                    <td className="p-3 font-bold text-[#002c11] bg-[#fbf9f8]">Category</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-3 text-[#414941]">
                        {p.category}
                      </td>
                    ))}
                  </tr>

                  {/* Eco Verification */}
                  <tr>
                    <td className="p-3 font-bold text-[#002c11] bg-[#fbf9f8]">Verification Status</td>
                    {products.map((p) => {
                      const isVerif = p.status === 'eco_verified' || p.ecoVerified;
                      return (
                        <td key={p.id} className="p-3">
                          {isVerif ? (
                            <span className="inline-flex items-center gap-1 text-[#1b6d24] font-bold bg-[#dbf5dc] px-2 py-0.5 rounded-full text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Eco Verified 100%
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#717970] font-medium bg-[#f0eded] px-2 py-0.5 rounded-full text-[11px]">
                              Standard Artisan Craft
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Eco Types & Attributes */}
                  <tr>
                    <td className="p-3 font-bold text-[#002c11] bg-[#fbf9f8]">Eco Attributes</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.ecoTypes || []).map((et, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-[#eef7ee] text-[#1b6d24] px-2 py-0.5 rounded-md font-semibold"
                            >
                              {et}
                            </span>
                          ))}
                          {(!p.ecoTypes || p.ecoTypes.length === 0) && (
                            <span className="text-[11px] text-[#717970]">Handcrafted Natural</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Materials Used */}
                  <tr>
                    <td className="p-3 font-bold text-[#002c11] bg-[#fbf9f8]">Materials Used</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-3 text-[#414941]">
                        {p.materialsUsed || p.materialComposition || p.materialsInfo || 'Natural Sustainable Raw Materials'}
                      </td>
                    ))}
                  </tr>

                  {/* District & Division */}
                  <tr>
                    <td className="p-3 font-bold text-[#002c11] bg-[#fbf9f8]">District Origin</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-3 text-[#002c11] font-medium">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#1b6d24]" />
                          <span>{p.district}, {p.division}</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Artisan / Store */}
                  <tr>
                    <td className="p-3 font-bold text-[#002c11] bg-[#fbf9f8]">Artisan Store</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-3 text-[#414941] font-semibold">
                        {p.sellerName || 'Local Artisan Workshop'}
                      </td>
                    ))}
                  </tr>

                  {/* Rating & Reviews */}
                  <tr>
                    <td className="p-3 font-bold text-[#002c11] bg-[#fbf9f8]">Patron Rating</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-[#ba8300] text-[#ba8300]" />
                          <span className="font-bold text-[#002c11]">
                            {p.rating ? p.rating.toFixed(1) : '4.8'}
                          </span>
                          <span className="text-[#717970] text-[10px]">
                            ({p.reviewsCount || 8} reviews)
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Stock Status */}
                  <tr>
                    <td className="p-3 font-bold text-[#002c11] bg-[#fbf9f8]">Stock Availability</td>
                    {products.map((p) => {
                      const qty = typeof p.stock === 'number' ? p.stock : 10;
                      return (
                        <td key={p.id} className="p-3">
                          {qty > 0 ? (
                            <span className="text-[#1b6d24] font-bold">
                              In Stock ({qty} available)
                            </span>
                          ) : (
                            <span className="text-[#ba1a1a] font-bold">Out of Stock</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Delivery Timeline */}
                  <tr>
                    <td className="p-3 font-bold text-[#002c11] bg-[#fbf9f8]">Courier Delivery</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-3 text-[#717970]">
                        <div className="flex items-center gap-1 text-[#002c11]">
                          <Truck className="w-3.5 h-3.5 text-[#1b6d24]" />
                          <span>Dhaka: 24-48h | Nationwide: 2-3 Days</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* 7-Day Guarantee */}
                  <tr>
                    <td className="p-3 font-bold text-[#002c11] bg-[#fbf9f8]">Guarantee & Returns</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-3 text-[#1b6d24] font-medium">
                        <div className="flex items-center gap-1">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>7-Day Green Guarantee & Hassle-Free Courier Pickup</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
