import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category } from '../types';
import { isPublicProduct } from '../services/firebase/productService';
import { BANGLADESH_DIVISIONS, ALL_64_DISTRICTS } from '../data/bangladeshDistricts';
import { ProductCard } from './ProductCard';
import {
  ShoppingBag,
  Sparkles,
  ChevronDown,
  ArrowUpDown,
  Package,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  SlidersHorizontal,
  X,
} from 'lucide-react';

interface AllProductsViewProps {
  products: Product[];
  categories?: Category[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  wishlistIds?: string[];
  onToggleWishlist?: (productId: string) => void;
  onOpenQuickView?: (product: Product) => void;
  comparedProductIds?: string[];
  onToggleCompare?: (productId: string) => void;
  setActiveTab?: (tab: any) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  initialCategory?: string;
  initialSearchQuery?: string;
}

const ITEMS_PER_PAGE = 24;

export const AllProductsView: React.FC<AllProductsViewProps> = ({
  products,
  categories = [],
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  onOpenQuickView,
  comparedProductIds = [],
  onToggleCompare,
  setActiveTab,
  isLoading = false,
  isError = false,
  onRetry,
  initialCategory,
  initialSearchQuery = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [selectedEcoTag, setSelectedEcoTag] = useState<string>('all');
  const [showFiltersBar, setShowFiltersBar] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<
    'recommended' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'bestselling'
  >('recommended');
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_PAGE);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [selectedCategory, searchQuery, selectedDivision, selectedDistrict, priceRange, selectedEcoTag, sortBy]);

  // Strictly filter customer-visible active products using public visibility guard
  const visibleProducts = useMemo(() => {
    return products.filter(isPublicProduct);
  }, [products]);


  // Available districts based on division selection
  const availableDistricts = useMemo(() => {
    if (selectedDivision === 'All') return ALL_64_DISTRICTS;
    return ALL_64_DISTRICTS.filter(
      (d) => d.division.toLowerCase() === selectedDivision.toLowerCase()
    );
  }, [selectedDivision]);

  // Reset district if division changes
  const handleDivisionChange = (div: string) => {
    setSelectedDivision(div);
    setSelectedDistrict('All');
  };

  // Filter products by all active criteria
  const filteredProducts = useMemo(() => {
    return visibleProducts.filter((product) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const matchCat =
          product.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          product.subcategory?.toLowerCase() === selectedCategory.toLowerCase();
        if (!matchCat) return false;
      }

      // Division filter
      if (selectedDivision !== 'All') {
        if ((product.division || '').toLowerCase() !== selectedDivision.toLowerCase()) {
          return false;
        }
      }

      // District filter
      if (selectedDistrict !== 'All') {
        if ((product.district || '').toLowerCase() !== selectedDistrict.toLowerCase()) {
          return false;
        }
      }

      // Price Range
      if (priceRange === 'under_500' && product.price >= 500) return false;
      if (priceRange === '500_1500' && (product.price < 500 || product.price > 1500)) return false;
      if (priceRange === '1500_3000' && (product.price < 1500 || product.price > 3000)) return false;
      if (priceRange === 'above_3000' && product.price <= 3000) return false;

      // Eco Tag / Eco Score
      if (selectedEcoTag !== 'all') {
        if (selectedEcoTag === 'eco_score_90') {
          if ((product.ecoScore || 0) < 90) return false;
        } else {
          const tag = selectedEcoTag.toLowerCase();
          const matchTag =
            product.ecoTypes?.some((t) => t.toLowerCase() === tag) ||
            product.materialsInfo?.toLowerCase().includes(tag) ||
            product.materialComposition?.toLowerCase().includes(tag);
          if (!matchTag) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          product.title.toLowerCase().includes(q) ||
          product.description?.toLowerCase().includes(q) ||
          product.category?.toLowerCase().includes(q) ||
          product.district?.toLowerCase().includes(q) ||
          product.division?.toLowerCase().includes(q) ||
          product.sellerName?.toLowerCase().includes(q) ||
          product.materialsInfo?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    visibleProducts,
    selectedCategory,
    selectedDivision,
    selectedDistrict,
    priceRange,
    selectedEcoTag,
    searchQuery,
  ]);

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedDivision !== 'All' ||
    selectedDistrict !== 'All' ||
    priceRange !== 'all' ||
    selectedEcoTag !== 'all' ||
    Boolean(searchQuery.trim());

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedDivision('All');
    setSelectedDistrict('All');
    setPriceRange('all');
    setSelectedEcoTag('all');
    setSearchQuery('');
  };

  // Sort products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case 'newest':
        return list.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      case 'price_asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return list.sort((a, b) => b.price - a.price);
      case 'rating':
        return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'bestselling':
        return list.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
      case 'recommended':
      default:
        return list.sort((a, b) => {
          const aScore = (a.status === 'eco_verified' ? 10 : 0) + (a.rating || 0) * 2;
          const bScore = (b.status === 'eco_verified' ? 10 : 0) + (b.rating || 0) * 2;
          return bScore - aScore;
        });
    }
  }, [filteredProducts, sortBy]);

  const displayedProducts = sortedProducts.slice(0, visibleCount);
  const totalCount = visibleProducts.length;

  return (
    <main className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 min-h-[calc(100vh-140px)] overflow-x-hidden">
      {/* 1. Header Section */}
      <div className="mb-6 bg-gradient-to-r from-[#002c11] via-[#043d17] to-[#002c11] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden border border-[#a0f399]/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#a0f399]/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-[#a0f399] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-[#30e872]" />
            <span>National Sustainable Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-tight leading-tight">
            All Eco Products
          </h1>
          <p className="text-sm sm:text-base text-white/85 mt-2 leading-relaxed font-body">
            Explore authentic, verified sustainable goods handcrafted by artisans and eco-cooperatives across all 64 districts of Bangladesh.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="bg-white/15 backdrop-blur-xs text-white px-3 py-1 rounded-full font-bold border border-white/20">
              Showing {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'}
            </span>
            <span className="text-white/70 hidden sm:inline">•</span>
            <span className="text-white/80 hidden sm:inline">
              100% Verified Delta Origin • Plastic-Free Packaging
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Controls & Sort Bar */}
      <div className="mb-4 flex items-center justify-between gap-4 pb-4 border-b border-[#c1c9be]/40">
        <div className="flex items-center gap-2">
          {selectedCategory !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#dbf5dc] text-[#002c11] text-xs font-bold rounded-full border border-[#a0f399]/40">
              Filtered by: {selectedCategory}
              <button
                onClick={() => setSelectedCategory('All')}
                className="hover:text-black ml-1 text-xs cursor-pointer font-bold"
                title="Clear category filter"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {/* Search, Filter Toggle & Sort */}
        <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowFiltersBar((prev) => !prev)}
            className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              showFiltersBar || hasActiveFilters
                ? 'bg-[#002c11] text-white border-[#002c11]'
                : 'bg-white text-[#002c11] border-[#c1c9be] hover:border-[#1b6d24]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#30e872]"></span>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#717970] hidden sm:inline flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="p-2 sm:py-2 sm:px-3 bg-white border border-[#c1c9be] rounded-2xl text-xs font-bold text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none shadow-2xs cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="bestselling">Best Selling</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2b. Expandable Advanced Filter & Search Drawer */}
      {(showFiltersBar || hasActiveFilters) && (
        <div className="mb-6 p-4 sm:p-5 bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Live Search */}
            <div className="relative">
              <label className="text-[11px] font-bold text-[#717970] block mb-1">Search Products</label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#717970] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Keywords, materials, artisan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-[#f8faf8] border border-[#c1c9be] rounded-xl text-xs text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717970] hover:text-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Division Filter */}
            <div>
              <label className="text-[11px] font-bold text-[#717970] block mb-1">Division</label>
              <select
                value={selectedDivision}
                onChange={(e) => handleDivisionChange(e.target.value)}
                className="w-full p-2 bg-[#f8faf8] border border-[#c1c9be] rounded-xl text-xs font-semibold text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none"
              >
                <option value="All">All Divisions (Bangladesh)</option>
                {BANGLADESH_DIVISIONS.map((div) => (
                  <option key={div.id} value={div.name}>
                    {div.name} ({div.bnName})
                  </option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div>
              <label className="text-[11px] font-bold text-[#717970] block mb-1">District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full p-2 bg-[#f8faf8] border border-[#c1c9be] rounded-xl text-xs font-semibold text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none"
              >
                <option value="All">All Districts</option>
                {availableDistricts.map((dist) => (
                  <option key={dist.id} value={dist.name}>
                    {dist.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="text-[11px] font-bold text-[#717970] block mb-1">Price Range</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full p-2 bg-[#f8faf8] border border-[#c1c9be] rounded-xl text-xs font-semibold text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none"
              >
                <option value="all">Any Price</option>
                <option value="under_500">Under ৳500</option>
                <option value="500_1500">৳500 - ৳1,500</option>
                <option value="1500_3000">৳1,500 - ৳3,000</option>
                <option value="above_3000">Above ৳3,000</option>
              </select>
            </div>

            {/* Eco Tag / Eco Score */}
            <div>
              <label className="text-[11px] font-bold text-[#717970] block mb-1">Eco Attribute</label>
              <select
                value={selectedEcoTag}
                onChange={(e) => setSelectedEcoTag(e.target.value)}
                className="w-full p-2 bg-[#f8faf8] border border-[#c1c9be] rounded-xl text-xs font-semibold text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none"
              >
                <option value="all">All Eco Attributes</option>
                <option value="Handmade">Handmade</option>
                <option value="Organic">Organic</option>
                <option value="Plastic-Free">Plastic-Free</option>
                <option value="Reusable">Reusable</option>
                <option value="Biodegradable">Biodegradable</option>
                <option value="eco_score_90">Eco Score 90+ (High Impact)</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips & Reset */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-[#c1c9be]/30 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#717970] font-bold text-[11px]">Active Filters:</span>
                {selectedCategory !== 'All' && (
                  <span className="bg-[#dbf5dc] text-[#002c11] px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory('All')}>×</button>
                  </span>
                )}
                {selectedDivision !== 'All' && (
                  <span className="bg-[#dbf5dc] text-[#002c11] px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                    {selectedDivision} Division
                    <button onClick={() => setSelectedDivision('All')}>×</button>
                  </span>
                )}
                {selectedDistrict !== 'All' && (
                  <span className="bg-[#dbf5dc] text-[#002c11] px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                    {selectedDistrict}
                    <button onClick={() => setSelectedDistrict('All')}>×</button>
                  </span>
                )}
                {priceRange !== 'all' && (
                  <span className="bg-[#dbf5dc] text-[#002c11] px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                    Price Filter
                    <button onClick={() => setPriceRange('all')}>×</button>
                  </span>
                )}
                {selectedEcoTag !== 'all' && (
                  <span className="bg-[#dbf5dc] text-[#002c11] px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                    {selectedEcoTag}
                    <button onClick={() => setSelectedEcoTag('all')}>×</button>
                  </span>
                )}
                {searchQuery && (
                  <span className="bg-[#dbf5dc] text-[#002c11] px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery('')}>×</button>
                  </span>
                )}
              </div>
              <button
                onClick={handleResetFilters}
                className="text-[#ba1a1a] hover:underline font-bold text-xs flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Full-Width Product Grid */}
      <section className="w-full space-y-6">
        {/* Error State */}
        {isError ? (
          <div className="bg-white border border-[#ba1a1a]/30 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-[#ba1a1a]">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-extrabold text-[#002c11] font-heading">
                Unable to load products right now.
              </h3>
              <p className="text-xs text-[#717970] mt-1">
                We encountered a connection issue while loading the product catalog. Please try again.
              </p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-5 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>
        ) : isLoading ? (
          /* Loading Skeleton Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#c1c9be]/50 overflow-hidden shadow-2xs animate-pulse flex flex-col"
              >
                <div className="aspect-[4/3] bg-[#e7e8e7]"></div>
                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-[#e7e8e7] rounded w-3/4"></div>
                    <div className="h-3 bg-[#f0eded] rounded w-1/2"></div>
                    <div className="h-3 bg-[#f0eded] rounded w-5/6"></div>
                  </div>
                  <div className="pt-3 border-t border-[#c1c9be]/30 flex items-center justify-between">
                    <div className="h-4 bg-[#e7e8e7] rounded w-1/3"></div>
                    <div className="h-7 bg-[#e7e8e7] rounded-xl w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-dashed border-[#c1c9be] rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-[#f0eded] flex items-center justify-center text-[#717970]">
              <Package className="w-8 h-8 text-[#1b6d24]" />
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-extrabold text-[#002c11] font-heading">
                {totalCount === 0 ? 'No eco products available yet.' : 'No matching products in this category.'}
              </h3>
              <p className="text-xs text-[#414941] mt-1.5 leading-relaxed">
                {totalCount === 0
                  ? 'Products from verified Bangladeshi sellers will appear here.'
                  : 'Try selecting "All" or exploring another category.'}
              </p>
            </div>

            {selectedCategory !== 'All' && (
              <button
                onClick={() => setSelectedCategory('All')}
                className="px-5 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors mt-2"
              >
                View All Categories
              </button>
            )}
          </div>
        ) : (
          /* Full Width Product Grid */
          <>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelectProduct={onSelectProduct}
                  onAddToCart={onAddToCart}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onToggleWishlist={onToggleWishlist}
                  onOpenQuickView={onOpenQuickView}
                  comparedProductIds={comparedProductIds}
                  onToggleCompare={onToggleCompare}
                />
              ))}
            </div>

            {/* Load More Button */}
            {displayedProducts.length < sortedProducts.length && (
              <div className="pt-8 pb-4 flex flex-col items-center justify-center gap-2">
                <button
                  onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                  className="px-6 py-3 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 hover:scale-[1.02]"
                >
                  <span>Load More Products</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#717970]">
                  Showing {displayedProducts.length} of {sortedProducts.length} products
                </span>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};
