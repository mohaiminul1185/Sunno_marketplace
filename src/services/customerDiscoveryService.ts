import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Product,
  Category,
  EcoType,
  DiscoverySortOption,
  DiscoveryFilterCriteria,
  EcoCollection,
  SearchSuggestion,
  RecentlyViewedEntry,
  PriceChangeAlert,
  DeliveryAvailabilityResult,
  CourierDeliveryOption,
} from '../types';
import { BANGLADESH_DIVISIONS, ALL_64_DISTRICTS } from '../data/bangladeshDistricts';
import { handleFirestoreError, OperationType } from './dbService';

export const COLLECTIONS_COL = 'eco_collections';
export const RECENTLY_VIEWED_STORAGE_KEY = 'sunno_recently_viewed_guest';
export const WISHLIST_PRICES_STORAGE_KEY = 'sunno_wishlist_prices';

// ----------------------------------------------------
// CURATED ECO COLLECTIONS (DATABASE-DRIVEN WITH SEED)
// ----------------------------------------------------

export const INITIAL_ECO_COLLECTIONS: EcoCollection[] = [
  {
    id: 'col-plastic-free',
    title: 'Plastic-Free Living',
    slug: 'plastic-free-living',
    description: '100% plastic-free daily essentials, zero-synthetic kitchen tools, and organic coconut & bamboo ware crafted for sustainable households.',
    tagline: 'Zero Synthetics • 100% Biodegradable',
    bannerImage: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&auto=format&fit=crop&q=80',
    icon: 'eco',
    color: '#1b6d24',
    filterEcoType: 'Plastic-Free',
    tags: ['Plastic-Free', 'Kitchen', 'Bamboo', 'Zero Waste'],
    displayOrder: 1,
    status: 'active',
    isFeatured: true,
  },
  {
    id: 'col-heritage-crafts',
    title: 'Bangladesh Heritage Crafts',
    slug: 'bangladesh-heritage-crafts',
    description: 'Centuries-old Jamdani weaves, Tangail khadi cotton, Bogura terracotta, and master artisan cane work from indigenous rural guilds.',
    tagline: '64 Districts • Ancient Handloom Traditions',
    bannerImage: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?w=1200&auto=format&fit=crop&q=80',
    icon: 'palette',
    color: '#9e6200',
    filterMaterial: 'Handmade Khadi & Cane',
    tags: ['Heritage', 'Handloom', 'Jamdani', 'Terracotta', 'Khadi'],
    displayOrder: 2,
    status: 'active',
    isFeatured: true,
  },
  {
    id: 'col-zero-waste',
    title: 'Zero-Waste Essentials',
    slug: 'zero-waste-essentials',
    description: 'Reusable jute shopping totes, natural loofah sponges, seed paper stationery, and compostable bamboo lifestyle accessories.',
    tagline: 'Circular Design • Reusable • Minimalist',
    bannerImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&auto=format&fit=crop&q=80',
    icon: 'recycling',
    color: '#006c48',
    filterEcoType: 'Reusable',
    tags: ['Zero Waste', 'Jute', 'Reusable', 'Compostable'],
    displayOrder: 3,
    status: 'active',
    isFeatured: true,
  },
  {
    id: 'col-natural-home',
    title: 'Natural Home & Terracotta',
    slug: 'natural-home-terracotta',
    description: 'Authentic clay cookware, water pots, cane lampshades, and jute floor runners providing non-toxic tranquility to modern eco homes.',
    tagline: 'Non-Toxic Earthware • Artisanal Ceramics',
    bannerImage: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=1200&auto=format&fit=crop&q=80',
    icon: 'cottage',
    color: '#a04d00',
    filterMaterial: 'Clay & Terracotta',
    tags: ['Terracotta', 'Clay', 'Home Decor', 'Handmade'],
    displayOrder: 4,
    status: 'active',
    isFeatured: true,
  },
  {
    id: 'col-sustainable-fashion',
    title: 'Sustainable Handloom Fashion',
    slug: 'sustainable-fashion',
    description: 'Vegetable-dyed scarves, organic cotton wraps, handwoven khadi shirts, and naturally tanned eco leather accessories.',
    tagline: 'Natural Dyes • Fair Trade • Handwoven',
    bannerImage: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=1200&auto=format&fit=crop&q=80',
    icon: 'checkroom',
    color: '#345e3d',
    filterCategory: 'Sustainable Fashion',
    tags: ['Fashion', 'Handloom', 'Silk', 'Khadi', 'Organic'],
    displayOrder: 5,
    status: 'active',
    isFeatured: true,
  },
  {
    id: 'col-organic-pantry',
    title: 'Sundarbans & Hill Tracts Pantry',
    slug: 'organic-pantry-harvest',
    description: 'Wild raw honey from the mangrove forests, high-altitude organic Sylhet green tea, and pure cold-pressed mustard oil.',
    tagline: 'Pesticide-Free • Forest Harvest • 100% Pure',
    bannerImage: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&auto=format&fit=crop&q=80',
    icon: 'nutrition',
    color: '#805600',
    filterEcoType: 'Organic',
    tags: ['Organic', 'Honey', 'Tea', 'Sundarbans', 'Pure Food'],
    displayOrder: 6,
    status: 'active',
    isFeatured: true,
  },
];

// ----------------------------------------------------
// 1. ADVANCED GLOBAL SEARCH & FILTER ENGINE
// ----------------------------------------------------

/**
 * Computes Levenshtein Distance for typo-tolerant fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Checks if token matches target with exact prefix, substring, or typo tolerance
 */
function matchToken(token: string, target: string): { matched: boolean; score: number } {
  if (!token || !target) return { matched: false, score: 0 };
  const t = token.toLowerCase();
  const tgt = target.toLowerCase();

  // Exact match
  if (tgt === t) return { matched: true, score: 100 };
  // Target starts with token (prefix)
  if (tgt.startsWith(t)) return { matched: true, score: 80 };
  // Target contains token (substring)
  if (tgt.includes(t)) return { matched: true, score: 60 };

  // Typo tolerance for words with length >= 4
  if (t.length >= 4 && tgt.length >= 4) {
    const dist = levenshteinDistance(t, tgt);
    if (dist === 1) return { matched: true, score: 40 };
    if (dist === 2 && t.length >= 6) return { matched: true, score: 25 };
  }

  return { matched: false, score: 0 };
}

/**
 * Calculates search relevance score for a product given search tokens
 */
function calculateProductSearchScore(product: Product, searchTokens: string[]): number {
  if (searchTokens.length === 0) return 0;
  let totalScore = 0;
  let matchedAll = true;

  for (const token of searchTokens) {
    let tokenMaxScore = 0;

    // Field 1: Title (Weight 10)
    const titleWords = (product.title || '').toLowerCase().split(/[\s,.-]+/);
    for (const w of titleWords) {
      const res = matchToken(token, w);
      if (res.matched) tokenMaxScore = Math.max(tokenMaxScore, res.score * 10);
    }
    if ((product.title || '').toLowerCase().includes(token)) {
      tokenMaxScore = Math.max(tokenMaxScore, 700);
    }

    // Field 2: Category & Subcategory (Weight 8)
    const catWords = `${product.category || ''} ${product.subcategory || ''}`.toLowerCase().split(/[\s,.-]+/);
    for (const w of catWords) {
      const res = matchToken(token, w);
      if (res.matched) tokenMaxScore = Math.max(tokenMaxScore, res.score * 8);
    }

    // Field 3: Eco Types & Tags (Weight 7)
    const tagsAndTypes = [...(product.ecoTypes || []), ...(product.tags || [])];
    for (const t of tagsAndTypes) {
      const res = matchToken(token, t);
      if (res.matched) tokenMaxScore = Math.max(tokenMaxScore, res.score * 7);
    }

    // Field 4: Materials (Weight 7)
    const materialsStr = `${product.materialsUsed || ''} ${product.materialsInfo || ''} ${product.materialComposition || ''}`;
    for (const w of materialsStr.toLowerCase().split(/[\s,.-]+/)) {
      const res = matchToken(token, w);
      if (res.matched) tokenMaxScore = Math.max(tokenMaxScore, res.score * 7);
    }

    // Field 5: District & Division (Weight 6)
    const locStr = `${product.district || ''} ${product.division || ''} ${product.originInfo || ''}`;
    for (const w of locStr.toLowerCase().split(/[\s,.-]+/)) {
      const res = matchToken(token, w);
      if (res.matched) tokenMaxScore = Math.max(tokenMaxScore, res.score * 6);
    }

    // Field 6: Seller / Store (Weight 6)
    const sellerWords = (product.sellerName || '').toLowerCase().split(/[\s,.-]+/);
    for (const w of sellerWords) {
      const res = matchToken(token, w);
      if (res.matched) tokenMaxScore = Math.max(tokenMaxScore, res.score * 6);
    }

    // Field 7: SKU & Description (Weight 3)
    if (product.sku && product.sku.toLowerCase().includes(token)) {
      tokenMaxScore = Math.max(tokenMaxScore, 300);
    }
    if (product.description && product.description.toLowerCase().includes(token)) {
      tokenMaxScore = Math.max(tokenMaxScore, 150);
    }

    if (tokenMaxScore === 0) {
      matchedAll = false;
    }
    totalScore += tokenMaxScore;
  }

  // Bonus for matching all tokens
  if (matchedAll && searchTokens.length > 1) {
    totalScore += 200;
  }

  return totalScore;
}

/**
 * Searches, filters, and ranks products based on all dynamic criteria
 */
export function searchAndFilterProducts(
  products: Product[],
  criteria: DiscoveryFilterCriteria,
  sortBy: DiscoverySortOption = 'recommended',
  userAffinity?: {
    preferredCategories?: string[];
    preferredDistricts?: string[];
    preferredMaterials?: string[];
  }
): { products: Product[]; totalCount: number; searchScoreMap: Record<string, number> } {
  const searchScoreMap: Record<string, number> = {};
  const queryStr = (criteria.query || '').trim().toLowerCase();
  const searchTokens = queryStr.split(/\s+/).filter(Boolean);

  // 1. Apply Filtering
  const filtered = products.filter((p) => {
    // Basic status guard: ignore deleted/archived
    if (p.status === 'archived' || p.status === 'suspended') return false;

    // Search query match
    if (searchTokens.length > 0) {
      const score = calculateProductSearchScore(p, searchTokens);
      if (score <= 0) return false;
      searchScoreMap[p.id] = score;
    }

    // Category Filter
    if (criteria.category && criteria.category !== 'All' && criteria.category !== 'all') {
      const catMatch =
        p.category?.toLowerCase() === criteria.category.toLowerCase() ||
        p.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') === criteria.category.toLowerCase();
      if (!catMatch) return false;
    }

    // Subcategory Filter
    if (criteria.subcategory && criteria.subcategory !== 'all' && criteria.subcategory !== 'All') {
      const subMatch =
        p.subcategory?.toLowerCase() === criteria.subcategory.toLowerCase() ||
        p.title.toLowerCase().includes(criteria.subcategory.toLowerCase()) ||
        p.materialsInfo?.toLowerCase().includes(criteria.subcategory.toLowerCase());
      if (!subMatch) return false;
    }

    // Division Filter
    if (criteria.division && criteria.division !== 'All' && criteria.division !== 'all') {
      if (p.division?.toLowerCase() !== criteria.division.toLowerCase()) {
        return false;
      }
    }

    // District Filter
    if (criteria.district && criteria.district !== 'All' && criteria.district !== 'all') {
      if (p.district?.toLowerCase() !== criteria.district.toLowerCase()) {
        return false;
      }
    }

    // Seller Filter
    if (criteria.sellerId) {
      if (p.sellerId !== criteria.sellerId) return false;
    }
    if (criteria.sellerName && criteria.sellerName !== 'All') {
      if (p.sellerName?.toLowerCase() !== criteria.sellerName.toLowerCase()) return false;
    }

    // Price Range Filter
    if (typeof criteria.minPrice === 'number' && p.price < criteria.minPrice) {
      return false;
    }
    if (typeof criteria.maxPrice === 'number' && p.price > criteria.maxPrice) {
      return false;
    }

    // Eco Verified Filter
    if (criteria.ecoVerifiedOnly) {
      const isVerif = p.status === 'eco_verified' || p.ecoVerified === true;
      if (!isVerif) return false;
    }

    // Eco Types Filter (OR condition within types: e.g. Plastic-Free OR Reusable)
    if (criteria.ecoTypes && criteria.ecoTypes.length > 0) {
      const matchesEco = criteria.ecoTypes.some((reqType) => {
        if (p.ecoTypes && p.ecoTypes.includes(reqType)) return true;
        if (reqType === 'Plastic-Free' && (p.isPlasticFree || p.plasticPercentage === 0)) return true;
        if (reqType === 'Reusable' && p.isReusable) return true;
        if (reqType === 'Biodegradable' && p.isBiodegradable) return true;
        if (reqType === 'Handmade' && p.isHandmade) return true;
        if (reqType === 'Recycled' && p.isRecyclable) return true;
        return false;
      });
      if (!matchesEco) return false;
    }

    // Materials Filter
    if (criteria.materials && criteria.materials.length > 0) {
      const pMat = `${p.materialsUsed || ''} ${p.materialsInfo || ''} ${p.materialComposition || ''} ${p.title} ${(p.tags || []).join(' ')}`.toLowerCase();
      const matchesMat = criteria.materials.some((mat) => pMat.includes(mat.toLowerCase()));
      if (!matchesMat) return false;
    }

    // Stock Availability Filter
    const stockQty = typeof p.stock === 'number' ? p.stock : 10;
    if (criteria.stockAvailability === 'in_stock') {
      if (stockQty <= 0 || p.status === 'out_of_stock') return false;
    } else if (criteria.stockAvailability === 'low_stock') {
      if (stockQty <= 0 || stockQty > 5) return false;
    }

    // Rating Filter
    if (typeof criteria.minRating === 'number' && (p.rating || 0) < criteria.minRating) {
      return false;
    }

    // Discount Filter
    if (typeof criteria.minDiscount === 'number' && (p.discount || 0) < criteria.minDiscount) {
      return false;
    }

    // Featured Filter
    if (criteria.featuredOnly && !p.featured && !p.bentoFeatured) {
      return false;
    }

    return true;
  });

  // 2. Apply Sorting
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();

      case 'price_asc':
        return a.price - b.price;

      case 'price_desc':
        return b.price - a.price;

      case 'rating':
        return (b.rating || 0) - (a.rating || 0);

      case 'popular': {
        const scoreA = (a.rating || 4) * Math.log2(Math.max(2, (a.reviewsCount || 1) + 2));
        const scoreB = (b.rating || 4) * Math.log2(Math.max(2, (b.reviewsCount || 1) + 2));
        return scoreB - scoreA;
      }

      case 'best_selling': {
        const scoreA = (a.reviewsCount || 0) * 3 + (a.stock ? 5 : 0);
        const scoreB = (b.reviewsCount || 0) * 3 + (b.stock ? 5 : 0);
        return scoreB - scoreA;
      }

      case 'discount':
        return (b.discount || 0) - (a.discount || 0);

      case 'recommended':
      default: {
        // Transparent composite scoring formula
        let scoreA = 0;
        let scoreB = 0;

        // Search text relevance if active
        if (searchTokens.length > 0) {
          scoreA += (searchScoreMap[a.id] || 0) * 2;
          scoreB += (searchScoreMap[b.id] || 0) * 2;
        }

        // Eco Verification signal
        if (a.status === 'eco_verified' || a.ecoVerified) scoreA += 40;
        if (b.status === 'eco_verified' || b.ecoVerified) scoreB += 40;

        // Rating & Review volume signal
        scoreA += (a.rating || 4) * 8 + Math.min(30, (a.reviewsCount || 0) * 1.5);
        scoreB += (b.rating || 4) * 8 + Math.min(30, (b.reviewsCount || 0) * 1.5);

        // In-Stock availability signal
        if ((a.stock || 0) > 0) scoreA += 20;
        if ((b.stock || 0) > 0) scoreB += 20;

        // Admin featured bonus
        if (a.featured || a.bentoFeatured) scoreA += 15;
        if (b.featured || b.bentoFeatured) scoreB += 15;

        // User personalization affinity bonus (if real signals present)
        if (userAffinity) {
          if (userAffinity.preferredCategories?.includes(a.category)) scoreA += 25;
          if (userAffinity.preferredCategories?.includes(b.category)) scoreB += 25;

          if (userAffinity.preferredDistricts?.includes(a.district)) scoreA += 15;
          if (userAffinity.preferredDistricts?.includes(b.district)) scoreB += 15;
        }

        return scoreB - scoreA;
      }
    }
  });

  return {
    products: sorted,
    totalCount: sorted.length,
    searchScoreMap,
  };
}

// ----------------------------------------------------
// 2. SEARCH AUTOCOMPLETE SUGGESTIONS ENGINE
// ----------------------------------------------------

export function getSearchSuggestions(
  products: Product[],
  categories: Category[],
  queryText: string,
  limit: number = 6
): SearchSuggestion[] {
  const q = queryText.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const suggestions: SearchSuggestion[] = [];
  const seenTitles = new Set<string>();

  // 1. Matched Categories
  categories.forEach((c) => {
    if (c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)) {
      if (!seenTitles.has(c.name)) {
        seenTitles.add(c.name);
        suggestions.push({
          type: 'category',
          title: c.name,
          subtitle: 'Marketplace Category',
          id: c.id,
          category: c.name,
          score: 90,
        });
      }
    }
  });

  // 2. Matched Districts & Specialties
  ALL_64_DISTRICTS.forEach((d) => {
    if (d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q)) {
      if (!seenTitles.has(d.name)) {
        seenTitles.add(d.name);
        suggestions.push({
          type: 'district',
          title: `${d.name} District`,
          subtitle: d.specialty,
          district: d.name,
          score: 85,
        });
      }
    }
  });

  // 3. Matched Materials
  const CORE_MATERIALS = [
    'Bamboo',
    'Jute',
    'Terracotta & Clay',
    'Cane & Rattan',
    'Tangail Khadi & Cotton',
    'Coconut Shell & Coir',
    'Recycled Paper',
    'Rajshahi Silk',
  ];
  CORE_MATERIALS.forEach((mat) => {
    if (mat.toLowerCase().includes(q)) {
      if (!seenTitles.has(mat)) {
        seenTitles.add(mat);
        suggestions.push({
          type: 'material',
          title: `${mat} Crafts`,
          subtitle: 'Explore by Material',
          score: 80,
        });
      }
    }
  });

  // 4. Matched Products
  products.forEach((p) => {
    if (p.status === 'archived') return;
    if (p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) {
      if (!seenTitles.has(p.title)) {
        seenTitles.add(p.title);
        suggestions.push({
          type: 'product',
          title: p.title,
          subtitle: `৳${p.price} • ${p.district} • ${p.category}`,
          id: p.id,
          category: p.category,
          district: p.district,
          image: p.images?.[0],
          score: 75,
        });
      }
    }
  });

  // Sort by score and limit
  return suggestions.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);
}

// ----------------------------------------------------
// 3. DYNAMIC FACET CALCULATOR
// ----------------------------------------------------

export interface AvailableFacets {
  categories: { name: string; count: number }[];
  subcategories: { name: string; count: number }[];
  divisions: { name: string; count: number }[];
  districts: { name: string; count: number; division: string }[];
  materials: { name: string; count: number }[];
  sellers: { id: string; name: string; district: string; count: number }[];
  ecoTypes: { type: EcoType; count: number }[];
  minPrice: number;
  maxPrice: number;
  totalProducts: number;
  verifiedCount: number;
  inStockCount: number;
  discountedCount: number;
}

export function getAvailableFilterFacets(products: Product[]): AvailableFacets {
  const categoryCountMap: Record<string, number> = {};
  const subcategoryCountMap: Record<string, number> = {};
  const divisionCountMap: Record<string, number> = {};
  const districtCountMap: Record<string, { count: number; division: string }> = {};
  const materialCountMap: Record<string, number> = {};
  const sellerMap: Record<string, { id: string; name: string; district: string; count: number }> = {};
  const ecoTypeCountMap: Record<string, number> = {};

  let minPrice = Infinity;
  let maxPrice = 0;
  let verifiedCount = 0;
  let inStockCount = 0;
  let discountedCount = 0;

  const KNOWN_MATERIALS = [
    'Bamboo',
    'Jute',
    'Clay',
    'Terracotta',
    'Cane',
    'Khadi',
    'Cotton',
    'Coconut Fiber',
    'Silk',
    'Recycled Paper',
    'Natural Wood',
    'Brass',
  ];

  products.forEach((p) => {
    if (p.status === 'archived') return;

    // Price range
    if (p.price < minPrice) minPrice = p.price;
    if (p.price > maxPrice) maxPrice = p.price;

    // Category
    if (p.category) {
      categoryCountMap[p.category] = (categoryCountMap[p.category] || 0) + 1;
    }
    if (p.subcategory) {
      subcategoryCountMap[p.subcategory] = (subcategoryCountMap[p.subcategory] || 0) + 1;
    }

    // Division & District
    if (p.division) {
      divisionCountMap[p.division] = (divisionCountMap[p.division] || 0) + 1;
    }
    if (p.district) {
      if (!districtCountMap[p.district]) {
        districtCountMap[p.district] = { count: 0, division: p.division || 'Dhaka' };
      }
      districtCountMap[p.district].count += 1;
    }

    // Sellers
    if (p.sellerName) {
      const sKey = p.sellerId || p.sellerName;
      if (!sellerMap[sKey]) {
        sellerMap[sKey] = {
          id: p.sellerId || 'seller-artisan',
          name: p.sellerName,
          district: p.district || 'Dhaka',
          count: 0,
        };
      }
      sellerMap[sKey].count += 1;
    }

    // Eco Types
    (p.ecoTypes || []).forEach((et) => {
      ecoTypeCountMap[et] = (ecoTypeCountMap[et] || 0) + 1;
    });

    // Materials detection
    const fullMatString = `${p.materialsUsed || ''} ${p.materialsInfo || ''} ${p.materialComposition || ''} ${p.title}`.toLowerCase();
    KNOWN_MATERIALS.forEach((mat) => {
      if (fullMatString.includes(mat.toLowerCase())) {
        materialCountMap[mat] = (materialCountMap[mat] || 0) + 1;
      }
    });

    // Badges & Status counts
    if (p.status === 'eco_verified' || p.ecoVerified) verifiedCount++;
    if ((p.stock || 0) > 0) inStockCount++;
    if ((p.discount || 0) > 0) discountedCount++;
  });

  return {
    categories: Object.entries(categoryCountMap).map(([name, count]) => ({ name, count })),
    subcategories: Object.entries(subcategoryCountMap).map(([name, count]) => ({ name, count })),
    divisions: Object.entries(divisionCountMap).map(([name, count]) => ({ name, count })),
    districts: Object.entries(districtCountMap).map(([name, val]) => ({
      name,
      count: val.count,
      division: val.division,
    })),
    materials: Object.entries(materialCountMap).map(([name, count]) => ({ name, count })),
    sellers: Object.values(sellerMap).sort((a, b) => b.count - a.count),
    ecoTypes: Object.entries(ecoTypeCountMap).map(([type, count]) => ({
      type: type as EcoType,
      count,
    })),
    minPrice: minPrice === Infinity ? 0 : minPrice,
    maxPrice: maxPrice || 5000,
    totalProducts: products.length,
    verifiedCount,
    inStockCount,
    discountedCount,
  };
}

// ----------------------------------------------------
// 4. REAL-SIGNAL PERSONALIZED RECOMMENDATIONS ENGINE
// ----------------------------------------------------

/**
 * Generates personalized product recommendations based ONLY on available real interaction data.
 * If insufficient data exists (<2 interactions), gracefully falls back to top verified/popular products.
 */
export function getPersonalizedRecommendations(
  allProducts: Product[],
  params: {
    recentlyViewedIds?: string[];
    wishlistIds?: string[];
    cartProductIds?: string[];
    purchasedCategories?: string[];
    currentProductId?: string;
    limit?: number;
  }
): {
  recommendations: Product[];
  isPersonalized: boolean;
  explanation: string;
} {
  const limit = params.limit || 8;
  const activeProducts = allProducts.filter(
    (p) => p.status !== 'archived' && p.status !== 'suspended' && p.id !== params.currentProductId
  );

  const viewedIds = params.recentlyViewedIds || [];
  const wishlist = params.wishlistIds || [];
  const cartIds = params.cartProductIds || [];
  const purchasedCats = params.purchasedCategories || [];

  const totalSignals = viewedIds.length + wishlist.length + cartIds.length + purchasedCats.length;

  // Cold start fallback if < 2 user interaction signals
  if (totalSignals < 2) {
    const generalPopular = [...activeProducts]
      .sort((a, b) => {
        const scoreA = (a.status === 'eco_verified' ? 30 : 0) + (a.rating || 4.5) * 10 + (a.reviewsCount || 0) * 2;
        const scoreB = (b.status === 'eco_verified' ? 30 : 0) + (b.rating || 4.5) * 10 + (b.reviewsCount || 0) * 2;
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return {
      recommendations: generalPopular,
      isPersonalized: false,
      explanation: 'Featuring Bangladesh’s highest rated eco-verified craftworks (Based on artisan verification & patron ratings).',
    };
  }

  // Calculate Category, Material & District Affinity Maps from real signals
  const categoryAffinity: Record<string, number> = {};
  const districtAffinity: Record<string, number> = {};
  const materialAffinity: Record<string, number> = {};

  const registerAffinityFromProduct = (prodId: string, weight: number) => {
    const prod = allProducts.find((p) => p.id === prodId);
    if (!prod) return;
    if (prod.category) {
      categoryAffinity[prod.category] = (categoryAffinity[prod.category] || 0) + weight;
    }
    if (prod.district) {
      districtAffinity[prod.district] = (districtAffinity[prod.district] || 0) + weight;
    }
    const matStr = `${prod.materialsUsed || ''} ${prod.materialsInfo || ''}`.toLowerCase();
    ['bamboo', 'jute', 'clay', 'cane', 'cotton', 'silk', 'honey'].forEach((m) => {
      if (matStr.includes(m)) {
        materialAffinity[m] = (materialAffinity[m] || 0) + weight;
      }
    });
  };

  // Weightings: Cart (5), Wishlist (4), Past Purchase (4), Viewed (2)
  cartIds.forEach((id) => registerAffinityFromProduct(id, 5));
  wishlist.forEach((id) => registerAffinityFromProduct(id, 4));
  viewedIds.forEach((id) => registerAffinityFromProduct(id, 2));
  purchasedCats.forEach((cat) => {
    categoryAffinity[cat] = (categoryAffinity[cat] || 0) + 4;
  });

  // Score remaining products
  const scoredList = activeProducts.map((p) => {
    let score = 0;

    // Direct affinity match
    if (p.category && categoryAffinity[p.category]) {
      score += categoryAffinity[p.category] * 15;
    }
    if (p.district && districtAffinity[p.district]) {
      score += districtAffinity[p.district] * 8;
    }

    const pMat = `${p.materialsUsed || ''} ${p.materialsInfo || ''}`.toLowerCase();
    Object.entries(materialAffinity).forEach(([mat, affWeight]) => {
      if (pMat.includes(mat)) score += affWeight * 6;
    });

    // Eco Verified & Rating Bonus
    if (p.status === 'eco_verified' || p.ecoVerified) score += 20;
    score += (p.rating || 4) * 4;

    // Penalize already added to cart
    if (cartIds.includes(p.id)) score -= 10;

    return { product: p, score };
  });

  scoredList.sort((a, b) => b.score - a.score);

  return {
    recommendations: scoredList.slice(0, limit).map((s) => s.product),
    isPersonalized: true,
    explanation: 'Curated based on your recent activity, saved artisan crafts, and sustainability interests.',
  };
}

// ----------------------------------------------------
// 5. RECENTLY VIEWED STORAGE & PRIVACY MANAGER
// ----------------------------------------------------

export function recordRecentlyViewedProduct(userId: string | null, product: Product): void {
  try {
    const entry: RecentlyViewedEntry = {
      productId: product.id,
      productTitle: product.title,
      category: product.category,
      price: product.price,
      image: product.images?.[0] || '',
      district: product.district,
      viewedAt: new Date().toISOString(),
    };

    // 1. Session / LocalStorage update
    const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    let items: RecentlyViewedEntry[] = raw ? JSON.parse(raw) : [];
    items = items.filter((i) => i.productId !== product.id);
    items.unshift(entry);
    items = items.slice(0, 20); // Keep max 20
    localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items));

    // 2. Cloud Firestore sync for authenticated customer
    if (userId) {
      const ref = doc(db, 'users', userId, 'discovery', 'recently_viewed');
      setDoc(ref, { items, updatedAt: new Date().toISOString() }, { merge: true }).catch((err) => {
        console.warn('Recently viewed cloud write notice:', err);
      });
    }
  } catch (err) {
    console.warn('Could not record recently viewed:', err);
  }
}

export async function fetchRecentlyViewedProducts(
  userId: string | null,
  allProducts: Product[]
): Promise<Product[]> {
  try {
    let itemIds: string[] = [];

    // Try cloud for logged-in user
    if (userId) {
      try {
        const ref = doc(db, 'users', userId, 'discovery', 'recently_viewed');
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().items) {
          itemIds = (snap.data().items as RecentlyViewedEntry[]).map((i) => i.productId);
        }
      } catch {
        // Fallback to local
      }
    }

    if (itemIds.length === 0) {
      const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
      if (raw) {
        const items: RecentlyViewedEntry[] = JSON.parse(raw);
        itemIds = items.map((i) => i.productId);
      }
    }

    if (itemIds.length === 0) return [];

    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const result: Product[] = [];
    itemIds.forEach((id) => {
      const p = productMap.get(id);
      if (p) result.push(p);
    });

    return result;
  } catch {
    return [];
  }
}

export function clearRecentlyViewed(userId: string | null): void {
  localStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
  if (userId) {
    const ref = doc(db, 'users', userId, 'discovery', 'recently_viewed');
    setDoc(ref, { items: [], updatedAt: new Date().toISOString() }).catch(() => {});
  }
}

export function getRecentlyViewedProductIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    if (!raw) return [];
    const items: RecentlyViewedEntry[] = JSON.parse(raw);
    return items.map((i) => i.productId);
  } catch {
    return [];
  }
}

export function trackRecentlyViewedProduct(productId: string, userId?: string | null): void {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    let items: RecentlyViewedEntry[] = raw ? JSON.parse(raw) : [];
    items = items.filter((i) => i.productId !== productId);
    items.unshift({
      productId,
      productTitle: '',
      category: '',
      price: 0,
      image: '',
      district: '',
      viewedAt: new Date().toISOString(),
    });
    items = items.slice(0, 20);
    localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items));
    if (userId) {
      const ref = doc(db, 'users', userId, 'discovery', 'recently_viewed');
      setDoc(ref, { items, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    }
  } catch {}
}


// ----------------------------------------------------
// 6. PRICE CHANGE AWARENESS TRACKER
// ----------------------------------------------------

export function recordWishlistPrice(productId: string, currentPrice: number): void {
  try {
    const raw = localStorage.getItem(WISHLIST_PRICES_STORAGE_KEY);
    const map: Record<string, { price: number; recordedAt: string }> = raw ? JSON.parse(raw) : {};
    if (!map[productId]) {
      map[productId] = { price: currentPrice, recordedAt: new Date().toISOString() };
      localStorage.setItem(WISHLIST_PRICES_STORAGE_KEY, JSON.stringify(map));
    }
  } catch (err) {
    console.warn('Wishlist price record error:', err);
  }
}

export function checkWishlistPriceAlerts(
  wishlistIds: string[],
  allProducts: Product[]
): PriceChangeAlert[] {
  try {
    const raw = localStorage.getItem(WISHLIST_PRICES_STORAGE_KEY);
    const map: Record<string, { price: number; recordedAt: string }> = raw ? JSON.parse(raw) : {};
    const alerts: PriceChangeAlert[] = [];

    const prodMap = new Map(allProducts.map((p) => [p.id, p]));

    wishlistIds.forEach((id) => {
      const prod = prodMap.get(id);
      const saved = map[id];
      if (prod && saved && saved.price !== prod.price) {
        const diff = prod.price - saved.price;
        const pct = Math.round((Math.abs(diff) / saved.price) * 100);
        alerts.push({
          productId: id,
          productTitle: prod.title,
          oldPrice: saved.price,
          currentPrice: prod.price,
          difference: diff,
          percentageChange: pct,
          direction: diff < 0 ? 'dropped' : 'increased',
          timestamp: new Date().toISOString(),
        });
      }
    });

    return alerts;
  } catch {
    return [];
  }
}

// ----------------------------------------------------
// 7. ECO COLLECTIONS DATABASE SYNC
// ----------------------------------------------------

export async function fetchEcoCollections(): Promise<EcoCollection[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS_COL));
    if (snap.empty) {
      // Seed default collections if none in Firestore
      await seedEcoCollections();
      return INITIAL_ECO_COLLECTIONS;
    }
    const cols = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EcoCollection));
    return cols.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS_COL);
    return INITIAL_ECO_COLLECTIONS;
  }
}

export async function seedEcoCollections(): Promise<void> {
  try {
    for (const col of INITIAL_ECO_COLLECTIONS) {
      const ref = doc(db, COLLECTIONS_COL, col.id);
      await setDoc(ref, col, { merge: true });
    }
  } catch (err) {
    console.warn('Seed eco collections notice:', err);
  }
}

export async function saveEcoCollection(collectionData: EcoCollection): Promise<void> {
  try {
    const ref = doc(db, COLLECTIONS_COL, collectionData.id);
    await setDoc(ref, { ...collectionData, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS_COL}/${collectionData.id}`);
    throw err;
  }
}

export async function deleteEcoCollection(collectionId: string): Promise<void> {
  try {
    const ref = doc(db, COLLECTIONS_COL, collectionId);
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS_COL}/${collectionId}`);
    throw err;
  }
}

// ----------------------------------------------------
// 8. COURIER DELIVERY AVAILABILITY CHECKER
// ----------------------------------------------------

export function checkDeliveryAvailability(
  destinationDistrict: string,
  destinationDivision: string = 'Dhaka',
  cartTotal: number = 0
): DeliveryAvailabilityResult {
  const isInsideDhaka = destinationDistrict.toLowerCase() === 'dhaka';
  const isFreeEligible = cartTotal >= 1500;

  const baseRate = isInsideDhaka ? 60 : 120;
  const finalFee = isFreeEligible ? 0 : baseRate;

  const options: CourierDeliveryOption[] = [
    {
      courierId: 'steadfast',
      courierName: 'Steadfast Courier',
      estimatedDays: isInsideDhaka ? '24 - 48 Hours' : '48 - 72 Hours',
      estimatedDelivery: isInsideDhaka ? 'Next Day Express' : '2-3 Business Days',
      deliveryFee: finalFee,
      isFreeDeliveryEligible: isFreeEligible,
      codAvailable: true,
      ecoPackagingProvided: true,
    },
    {
      courierId: 'pathao',
      courierName: 'Pathao Logistics Express',
      estimatedDays: isInsideDhaka ? 'Same Day / 24h' : '48 Hours',
      estimatedDelivery: isInsideDhaka ? 'Within 24 Hours' : '2 Days',
      deliveryFee: finalFee + (isInsideDhaka ? 20 : 30),
      isFreeDeliveryEligible: isFreeEligible,
      codAvailable: true,
      ecoPackagingProvided: true,
    },
    {
      courierId: 'redx',
      courierName: 'RedX Nationwide Delivery',
      estimatedDays: isInsideDhaka ? '24 - 48 Hours' : '3 - 4 Days',
      estimatedDelivery: isInsideDhaka ? '1-2 Days' : 'Nationwide 3-4 Days',
      deliveryFee: finalFee,
      isFreeDeliveryEligible: isFreeEligible,
      codAvailable: true,
      ecoPackagingProvided: true,
    },
  ];

  return {
    isAvailable: true,
    destinationDistrict,
    destinationDivision,
    options,
    notes: isFreeEligible
      ? '🎉 Congratulations! Your order qualifies for 100% Free Eco Delivery across Bangladesh (Over ৳1,500).'
      : `Delivery standard rate is ৳${baseRate} BDT with 100% zero-plastic biodegradable kraft packaging.`,
  };
}

// Convenient Aliases and Exports for UI Components
export const calculateDeliveryAvailability = (
  destinationDistrict: string,
  cartTotal: number = 0,
  destinationDivision: string = 'Dhaka'
) => {
  const isInsideDhaka = destinationDistrict.toLowerCase() === 'dhaka';
  const isFree = cartTotal >= 1500;
  const baseRate = isInsideDhaka ? 60 : 120;
  return {
    isAvailable: true,
    isFreeDelivery: isFree,
    estimatedTimeline: isInsideDhaka ? '24-48 Hours' : '48-72 Hours',
    courierOptions: [
      {
        courierId: 'steadfast',
        name: 'Steadfast Courier',
        estimatedDays: isInsideDhaka ? '24 - 48 Hours' : '48 - 72 Hours',
        baseFee: isFree ? 0 : baseRate,
        recommended: true,
      },
      {
        courierId: 'pathao',
        name: 'Pathao Logistics Express',
        estimatedDays: isInsideDhaka ? 'Same Day / 24h' : '48 Hours',
        baseFee: isFree ? 0 : baseRate + 20,
        recommended: false,
      },
      {
        courierId: 'redx',
        name: 'RedX Nationwide Delivery',
        estimatedDays: isInsideDhaka ? '24 - 48 Hours' : '3 - 4 Days',
        baseFee: isFree ? 0 : baseRate,
        recommended: false,
      },
    ],
  };
};

export const detectPriceChangeAlerts = checkWishlistPriceAlerts;
export { INITIAL_ECO_COLLECTIONS as CURATED_ECO_COLLECTIONS };

