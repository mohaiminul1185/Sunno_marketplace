import React, { useState, useMemo } from 'react';
import { Category, Product, ActiveTab } from '../types';
import { isPublicProduct } from '../services/firebase/productService';
import { ALL_64_DISTRICTS } from '../data/bangladeshDistricts';
import { BRAND_LOGO } from '../data/mockData';
import { ProductCard } from './ProductCard';

interface CategoryPageViewProps {
  category: Category;
  allCategories: Category[];
  allProducts: Product[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onSelectCategory: (category: Category) => void;
  wishlistIds?: string[];
  onToggleWishlist?: (productId: string) => void;
  onOpenQuickView?: (product: Product) => void;
}

export const CategoryPageView: React.FC<CategoryPageViewProps> = ({
  category,
  allCategories,
  allProducts,
  setActiveTab,
  onSelectProduct,
  onAddToCart,
  onSelectCategory,
  wishlistIds = [],
  onToggleWishlist,
  onOpenQuickView,
}) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [priceSort, setPriceSort] = useState<'featured' | 'low_to_high' | 'high_to_low' | 'eco_score'>('featured');
  const [ecoFilter, setEcoFilter] = useState<string>('all');

  // Filter products for this category
  const categoryProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (!isPublicProduct(p)) return false;
      const catNameMatch = p.category?.toLowerCase().trim() === category.name.toLowerCase().trim();
      const catSlugMatch = p.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') === category.slug.toLowerCase();
      const subcatMatch = category.subcategories?.some((s) => s.name.toLowerCase() === p.category?.toLowerCase() || s.name.toLowerCase() === p.subcategory?.toLowerCase());
      return catNameMatch || catSlugMatch || subcatMatch;
    });
  }, [allProducts, category]);

  // Apply subcategory, district, and eco filter
  const filteredProducts = useMemo(() => {
    let list = categoryProducts.filter((p) => {
      // Subcategory check
      if (selectedSubcategory !== 'all') {
        const matchSub =
          p.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase() ||
          p.title.toLowerCase().includes(selectedSubcategory.toLowerCase()) ||
          p.materialsInfo?.toLowerCase().includes(selectedSubcategory.toLowerCase());
        if (!matchSub) return false;
      }

      // District check
      if (selectedDistrict !== 'all' && p.district !== selectedDistrict) {
        return false;
      }

      // Eco Tag check
      if (ecoFilter !== 'all') {
        const hasTag = p.ecoTypes?.includes(ecoFilter as any) || p.materialComposition?.toLowerCase().includes(ecoFilter.toLowerCase());
        if (!hasTag) return false;
      }

      return true;
    });

    // Sorting
    if (priceSort === 'low_to_high') {
      list.sort((a, b) => a.price - b.price);
    } else if (priceSort === 'high_to_low') {
      list.sort((a, b) => b.price - a.price);
    } else if (priceSort === 'eco_score') {
      list.sort((a, b) => (b.ecoScore || 90) - (a.ecoScore || 90));
    }

    return list;
  }, [categoryProducts, selectedSubcategory, selectedDistrict, ecoFilter, priceSort]);

  const activeSubcategories = (category.subcategories || []).filter(
    (s) => s.status === 'ACTIVE' || !s.status
  );

  return (
    <main className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[#717970]">
        <button
          onClick={() => setActiveTab('home')}
          className="hover:text-[#1b6d24] transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <span className="text-[#002c11] font-bold truncate">{category.name}</span>
      </nav>

      {/* Hero Category Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-[#002c11] text-white p-5 sm:p-8 md:p-10 border border-[#1b482b] shadow-sm">
        {category.image && (
          <div className="absolute inset-0 z-0 opacity-25">
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="relative z-10 max-w-3xl space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b6d24]/60 backdrop-blur-xs border border-[#a0f399]/40 text-[#a0f399] text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">{category.icon || 'spa'}</span>
            <span>Verified 100% Sustainable</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-heading tracking-tight">
            {category.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#b7f0bf] leading-relaxed">
            {category.description ||
              'Authentic Bangladeshi eco-conscious crafts made by master rural artisan cooperatives.'}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 sm:pt-2 text-xs text-[#c2eccb]">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="material-symbols-outlined text-[16px] text-[#a0f399]">inventory_2</span>
              {categoryProducts.length} Artisan Products Available
            </span>
            <span className="hidden min-[480px]:inline text-white/50">•</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#a0f399]">verified</span>
              Zero-Plastic Guarantee
            </span>
          </div>
        </div>
      </div>

      {/* Active Subcategories Navigation Tabs */}
      {activeSubcategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          <button
            onClick={() => setSelectedSubcategory('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              selectedSubcategory === 'all'
                ? 'bg-[#002c11] text-white shadow-md'
                : 'bg-white text-[#414941] border border-[#c1c9be]/60 hover:border-[#1b6d24]'
            }`}
          >
            All {category.name} ({categoryProducts.length})
          </button>
          {activeSubcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubcategory(sub.name)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                selectedSubcategory === sub.name
                  ? 'bg-[#1b6d24] text-white shadow-md'
                  : 'bg-white text-[#414941] border border-[#c1c9be]/60 hover:border-[#1b6d24]'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter and Sort Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#c1c9be]/50 shadow-xs text-xs space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full md:w-auto">
          {/* District Filter */}
          <div className="flex items-center gap-2 w-full min-w-0">
            <span className="text-[#717970] font-bold uppercase tracking-wider text-[11px] shrink-0">District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full min-w-0 max-w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl px-2.5 py-2 text-xs font-medium text-[#002c11] outline-none truncate focus:ring-1 focus:ring-[#1b6d24]"
            >
              <option value="all">All 64 Districts</option>
              {ALL_64_DISTRICTS.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} {d.specialty ? `• ${d.specialty}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Eco Standard Filter */}
          <div className="flex items-center gap-2 w-full min-w-0">
            <span className="text-[#717970] font-bold uppercase tracking-wider text-[11px] shrink-0">Eco Feature:</span>
            <select
              value={ecoFilter}
              onChange={(e) => setEcoFilter(e.target.value)}
              className="w-full min-w-0 max-w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl px-2.5 py-2 text-xs font-medium text-[#002c11] outline-none truncate focus:ring-1 focus:ring-[#1b6d24]"
            >
              <option value="all">All Eco Standards</option>
              <option value="Zero Plastic">Zero Plastic</option>
              <option value="100% Biodegradable">100% Biodegradable</option>
              <option value="Handmade">Handmade</option>
              <option value="Fair Wage Certified">Fair Wage</option>
              <option value="Organic">Organic Certified</option>
            </select>
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full md:w-auto pt-2.5 md:pt-0 border-t md:border-t-0 border-[#f0eded]">
          <span className="text-[#717970] font-bold uppercase tracking-wider text-[11px] shrink-0">Sort by:</span>
          <select
            value={priceSort}
            onChange={(e) => setPriceSort(e.target.value as any)}
            className="flex-1 sm:flex-initial min-w-0 max-w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl px-2.5 py-2 text-xs font-bold text-[#002c11] outline-none truncate focus:ring-1 focus:ring-[#1b6d24]"
          >
            <option value="featured">Featured Artisans</option>
            <option value="low_to_high">Price: Low to High</option>
            <option value="high_to_low">Price: High to Low</option>
            <option value="eco_score">Highest Eco-Rating</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
          {filteredProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onSelectProduct={onSelectProduct}
              onAddToCart={onAddToCart}
              isWishlisted={wishlistIds.includes(prod.id)}
              onToggleWishlist={onToggleWishlist}
              onOpenQuickView={onOpenQuickView}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#c1c9be]/50 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">filter_vintage</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#002c11] font-heading">
              No products found in this selection
            </h3>
            <p className="text-xs text-[#717970] mt-1 max-w-md mx-auto">
              Try resetting your subcategory or district filters to view more artisan crafts in {category.name}.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedSubcategory('all');
              setSelectedDistrict('all');
              setEcoFilter('all');
            }}
            className="px-5 py-2.5 bg-[#002c11] text-white rounded-2xl text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Other Categories Explorer */}
      <div className="pt-8 border-t border-[#c1c9be]/40 space-y-4">
        <h2 className="text-lg font-bold text-[#002c11] font-heading">
          Explore Other Sustainable Categories
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {allCategories
            .filter((c) => c.id !== category.id && (c.status === 'ACTIVE' || !c.status))
            .map((other) => (
              <div
                key={other.id}
                onClick={() => onSelectCategory(other)}
                className="bg-white p-4 rounded-2xl border border-[#c1c9be]/50 hover:border-[#1b6d24] cursor-pointer transition-all hover:shadow-md flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">{other.icon || 'spa'}</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#002c11]">{other.name}</h4>
                  <p className="text-[11px] text-[#717970] line-clamp-1">{other.description}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
};
