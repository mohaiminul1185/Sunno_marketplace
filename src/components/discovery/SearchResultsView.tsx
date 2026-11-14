import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, DiscoverySortOption } from '../../types';
import { isPublicProduct } from '../../services/firebase/productService';
import { BRAND_LOGO } from '../../data/mockData';
import { ProductCard } from '../ProductCard';
import {
  ArrowUpDown,
  Package,
  ChevronDown,
} from 'lucide-react';

interface SearchResultsViewProps {
  products: Product[];
  categories?: Category[];
  initialQuery?: string;
  initialDistrict?: string;
  initialCollection?: string;
  initialMaterial?: string;
  initialSort?: DiscoverySortOption;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent, quantity?: number) => void;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onOpenQuickView?: (product: Product) => void;
  comparedProductIds?: string[];
  onToggleCompare?: (productId: string) => void;
  onOpenCompare?: () => void;
  setActiveTab?: (tab: any) => void;
  onSelectDistrict?: (district: string | null) => void;
  isAllProductsPage?: boolean;
}

const ITEMS_PER_PAGE = 24;

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  products,
  initialQuery = '',
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  onOpenQuickView,
  comparedProductIds = [],
  onToggleCompare,
  setActiveTab,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [sortBy, setSortBy] = useState<DiscoverySortOption>('recommended');
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_PAGE);

  // Sync when initialQuery changes from navbar or external props
  useEffect(() => {
    setSearchQuery(initialQuery || '');
  }, [initialQuery]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, sortBy]);

  // Customer visible products (strictly active public products)
  const activeProducts = useMemo(() => {
    return products.filter(isPublicProduct);
  }, [products]);

  // Split query into tokens
  const searchTokens = useMemo(() => {
    return searchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }, [searchQuery]);

  // Strict relevance search scoring
  const scoredProducts = useMemo(() => {
    if (searchTokens.length === 0) {
      return activeProducts.map((p) => ({ product: p, score: 0 }));
    }

    const queryLower = searchQuery.trim().toLowerCase();
    const results: { product: Product; score: number }[] = [];

    activeProducts.forEach((product) => {
      let score = 0;
      let matchedTokenCount = 0;

      const title = (product.title || '').toLowerCase();
      const category = (product.category || '').toLowerCase();
      const subcategory = (product.subcategory || '').toLowerCase();
      const district = (product.district || '').toLowerCase();
      const division = (product.division || '').toLowerCase();
      const seller = (product.sellerName || '').toLowerCase();
      const materials = ((product.materialsInfo || '') + ' ' + (product.materialsUsed || '') + ' ' + (product.materialComposition || '')).toLowerCase();
      const desc = ((product.shortDescription || '') + ' ' + (product.description || '')).toLowerCase();
      const tags = (product.tags || []).map((t) => t.toLowerCase());
      const ecoTypes = (product.ecoTypes || []).map((e) => e.toLowerCase());

      // STRICT RELEVANCE RULE: A product is ONLY relevant if its core product attributes
      // (title, category, subcategory, materials, or tags) match the search tokens.
      const matchesCoreIdentity = searchTokens.every((token) => {
        return (
          title.includes(token) ||
          category.includes(token) ||
          subcategory.includes(token) ||
          materials.includes(token) ||
          tags.some((t) => t.includes(token))
        );
      });

      if (!matchesCoreIdentity) {
        return; // Strictly exclude unrelated products
      }

      // Exact full query match in title gets highest priority
      if (title.includes(queryLower)) {
        score += 150;
      }

      // Calculate precision score among matching products
      searchTokens.forEach((token) => {
        if (title.includes(token)) {
          score += 60;
          matchedTokenCount++;
        }
        if (subcategory.includes(token)) {
          score += 40;
          matchedTokenCount++;
        } else if (category.includes(token)) {
          score += 30;
          matchedTokenCount++;
        }
        if (materials.includes(token)) {
          score += 35;
          matchedTokenCount++;
        }
        if (tags.some((t) => t.includes(token))) {
          score += 35;
          matchedTokenCount++;
        }
      });

      // Multi-word bonus: if full query matches exactly
      if (title === queryLower) {
        score += 100;
      }

      // Eco-verified bonus applied ONLY to verified matching products
      if (product.status === 'eco_verified' || product.ecoVerified) {
        score += 10;
      }

      results.push({ product, score });
    });

    return results;
  }, [activeProducts, searchTokens, searchQuery]);

  // Sort matching products
  const sortedProducts = useMemo(() => {
    if (searchTokens.length === 0) {
      const list = [...activeProducts];
      switch (sortBy) {
        case 'price_asc':
          return list.sort((a, b) => a.price - b.price);
        case 'price_desc':
          return list.sort((a, b) => b.price - a.price);
        case 'rating':
          return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        case 'bestselling':
          return list.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
        case 'newest':
          return list.sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        case 'recommended':
        default:
          return list.sort((a, b) => {
            const aScore = (a.status === 'eco_verified' ? 10 : 0) + (a.rating || 0) * 2;
            const bScore = (b.status === 'eco_verified' ? 10 : 0) + (b.rating || 0) * 2;
            return bScore - aScore;
          });
      }
    }

    const list = [...scoredProducts];

    switch (sortBy) {
      case 'price_asc':
        return list.sort((a, b) => a.product.price - b.product.price).map((item) => item.product);
      case 'price_desc':
        return list.sort((a, b) => b.product.price - a.product.price).map((item) => item.product);
      case 'rating':
        return list.sort((a, b) => (b.product.rating || 0) - (a.product.rating || 0)).map((item) => item.product);
      case 'bestselling':
        return list.sort((a, b) => (b.product.reviewsCount || 0) - (a.product.reviewsCount || 0)).map((item) => item.product);
      case 'newest':
        return list
          .sort(
            (a, b) =>
              new Date(b.product.createdAt || 0).getTime() - new Date(a.product.createdAt || 0).getTime()
          )
          .map((item) => item.product);
      case 'recommended':
      default:
        // Sort primarily by matching score, secondarily by rating
        return list
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (b.product.rating || 0) - (a.product.rating || 0);
          })
          .map((item) => item.product);
    }
  }, [scoredProducts, activeProducts, searchTokens, sortBy]);

  const displayedProducts = sortedProducts.slice(0, visibleCount);

  return (
    <main className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 min-h-[calc(100vh-140px)] overflow-x-hidden">
      {/* 1. Clean Title & Sort Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#c1c9be]/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002c11] font-heading">
            {searchQuery ? (
              <span>
                Search Results for <span className="text-[#1b6d24]">"{searchQuery}"</span>
              </span>
            ) : (
              <span>All Products</span>
            )}
          </h1>
          <p className="text-xs text-[#717970] mt-1 font-medium">
            Found {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span className="text-xs font-bold text-[#717970] hidden sm:inline flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="py-2 px-3 bg-white border border-[#c1c9be] rounded-2xl text-xs font-bold text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none shadow-2xs"
          >
            <option value="recommended">Recommended</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="bestselling">Best Selling</option>
            <option value="newest">Newest Arrivals</option>
          </select>
        </div>
      </div>

      {/* 2. Full Width Product Grid */}
      <section className="w-full">
        {displayedProducts.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-dashed border-[#c1c9be] rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-2xs my-6">
            <div className="w-16 h-16 rounded-full bg-[#f0eded] flex items-center justify-center text-[#717970]">
              <Package className="w-8 h-8 text-[#1b6d24]" />
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-extrabold text-[#002c11] font-heading">
                No matching products found for "{searchQuery}"
              </h3>
              <p className="text-xs text-[#414941] mt-1.5 leading-relaxed">
                Try searching with another product keyword like "Honey", "Bamboo", "Jute", "Cotton", or "Terracotta".
              </p>
            </div>

            {setActiveTab && (
              <button
                onClick={() => {
                  window.location.hash = '#products';
                  setActiveTab('products');
                }}
                className="mt-2 px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-2xl text-xs font-bold shadow-xs transition-colors"
              >
                Explore All Products
              </button>
            )}
          </div>
        ) : (
          /* Product Grid */
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
