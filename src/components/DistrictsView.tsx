import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, EcoType, Store } from '../types';
import { isPublicProduct } from '../services/firebase/productService';
import { BANGLADESH_DIVISIONS, ALL_64_DISTRICTS, DistrictDetail } from '../data/bangladeshDistricts';
import { HERO_ARTISAN_IMG } from '../data/imageAssets';
import { ProductCard } from './ProductCard';
import {
  MapPin,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Store as StoreIcon,
  CheckCircle2,
  Building2,
  Users,
  Compass,
  RotateCcw,
} from 'lucide-react';

interface DistrictsViewProps {
  products: Product[];
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  searchQuery?: string;
  wishlistIds?: string[];
  onToggleWishlist?: (productId: string) => void;
  onOpenQuickView?: (product: Product) => void;
  comparedProductIds?: string[];
  onToggleCompare?: (productId: string) => void;
  onOpenStore?: (store?: Store) => void;
  setActiveTab?: (tab: any) => void;
  onOpenBecomeSeller?: () => void;
}

const DISTRICT_ALIASES: Record<string, string[]> = {
  bagerhat: ['bagerhat', 'bagerhat (sundarbans)', 'sundarbans'],
  barishal: ['barishal', 'barisal'],
  bogura: ['bogura', 'bogra'],
  chattogram: ['chattogram', 'chittagong'],
  cumilla: ['cumilla', 'comilla'],
  jashore: ['jashore', 'jessore'],
  coxs_bazar: ["cox's bazar", 'coxs bazar', 'coxs_bazar'],
};

const ALL_ECO_TYPES: EcoType[] = [
  'Handmade',
  'Organic',
  'Biodegradable',
  'Plastic-Free',
  'Reusable',
  'Recycled',
  'Upcycled',
];

function doesProductMatchDistrict(productDistrict: string | undefined, district: DistrictDetail): boolean {
  if (!productDistrict) return false;
  const normProd = productDistrict.trim().toLowerCase();
  const normName = district.name.trim().toLowerCase();
  const normId = district.id.trim().toLowerCase();
  if (normProd === normName || normProd === normId) return true;
  const aliases = DISTRICT_ALIASES[normId];
  if (aliases && aliases.includes(normProd)) return true;
  return false;
}

export const DistrictsView: React.FC<DistrictsViewProps> = ({
  products,
  selectedDistrict,
  setSelectedDistrict,
  onSelectProduct,
  onAddToCart,
  searchQuery = '',
  wishlistIds = [],
  onToggleWishlist,
  onOpenQuickView,
  comparedProductIds = [],
  onToggleCompare,
  setActiveTab,
  onOpenBecomeSeller,
}) => {
  // Find current district info or default to Dhaka
  const currentDistrictInfo: DistrictDetail = useMemo(() => {
    if (!selectedDistrict || selectedDistrict.toLowerCase() === 'all') {
      return ALL_64_DISTRICTS[0];
    }
    const q = selectedDistrict.trim().toLowerCase();
    const found = ALL_64_DISTRICTS.find(
      (d) =>
        d.name.toLowerCase() === q ||
        d.id.toLowerCase() === q ||
        (DISTRICT_ALIASES[d.id]?.includes(q) ?? false)
    );
    return found || ALL_64_DISTRICTS[0];
  }, [selectedDistrict]);

  const [activeDivision, setActiveDivision] = useState<string>(() => {
    return currentDistrictInfo.division || 'Dhaka';
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedEcoTypes, setSelectedEcoTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');
  const [maxPrice] = useState<number>(15000);
  const [showOnlyVerified, setShowOnlyVerified] = useState<boolean>(false);
  const [inStockOnly] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [isDistrictSearchOpen, setIsDistrictSearchOpen] = useState<boolean>(false);
  const [districtQuery, setDistrictQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveDivision(currentDistrictInfo.division || 'Dhaka');
    setSelectedCategory('All');
    setSelectedEcoTypes([]);
    setVisibleCount(12);
  }, [currentDistrictInfo.id, currentDistrictInfo.division]);

  useEffect(() => {
    if (!isDistrictSearchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDistrictSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDistrictSearchOpen]);

  const handleDivisionChange = (divName: string) => {
    setActiveDivision(divName);
    const districtsInDiv = ALL_64_DISTRICTS.filter(
      (d) => d.division.toLowerCase() === divName.toLowerCase()
    );
    if (districtsInDiv.length > 0) {
      const isCurrentInDiv = districtsInDiv.some(
        (d) => d.name.toLowerCase() === currentDistrictInfo.name.toLowerCase()
      );
      if (!isCurrentInDiv) {
        const firstDist = districtsInDiv[0];
        setSelectedDistrict(firstDist.name);
        window.location.hash = `#districts/${encodeURIComponent(firstDist.name)}`;
      }
    }
  };

  const handleDistrictSelect = (district: DistrictDetail) => {
    setActiveDivision(district.division);
    setSelectedDistrict(district.name);
    window.location.hash = `#districts/${encodeURIComponent(district.name)}`;
    const showcaseElem = document.getElementById('district-showcase-section');
    if (showcaseElem) {
      showcaseElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const districtsInActiveDivision = useMemo(() => {
    return ALL_64_DISTRICTS.filter(
      (d) => d.division.toLowerCase() === activeDivision.toLowerCase()
    );
  }, [activeDivision]);

  const searchedDistricts = useMemo(() => {
    if (!districtQuery.trim()) return ALL_64_DISTRICTS;
    const q = districtQuery.toLowerCase();
    return ALL_64_DISTRICTS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.division.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q)
    );
  }, [districtQuery]);

  const districtCategories = useMemo(() => {
    const prods = products.filter(
      (p) => isPublicProduct(p) && doesProductMatchDistrict(p.district, currentDistrictInfo)
    );
    const cats = Array.from(new Set(prods.map((p) => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [products, currentDistrictInfo]);

  const toggleEcoType = (type: string) => {
    setSelectedEcoTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const districtFilteredProducts = useMemo(() => {
    return products.filter((item) => {
      if (!isPublicProduct(item)) return false;
      if (!doesProductMatchDistrict(item.district, currentDistrictInfo)) return false;
      if (selectedCategory !== 'All' && (item.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (
        selectedEcoTypes.length > 0 &&
        !(item.ecoTypes || []).some((et) => selectedEcoTypes.includes(et))
      ) {
        return false;
      }
      if (item.price > maxPrice) return false;
      if (showOnlyVerified && item.status !== 'eco_verified') return false;
      if (inStockOnly && typeof item.stock === 'number' && item.stock <= 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchMat = ((item as any).materials || []).some((m: string) =>
          m.toLowerCase().includes(q)
        );
        if (!matchTitle && !matchDesc && !matchMat) return false;
      }

      return true;
    });
  }, [
    products,
    currentDistrictInfo,
    selectedCategory,
    selectedEcoTypes,
    maxPrice,
    showOnlyVerified,
    inStockOnly,
    searchQuery,
  ]);

  const sortedDistrictProducts = useMemo(() => {
    return [...districtFilteredProducts].sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [districtFilteredProducts, sortBy]);

  const displayedProducts = sortedDistrictProducts.slice(0, visibleCount);

  const totalProductsInThisDistrict = useMemo(() => {
    return products.filter(
      (p) => isPublicProduct(p) && doesProductMatchDistrict(p.district, currentDistrictInfo)
    ).length;
  }, [products, currentDistrictInfo]);

  return (
    <main className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 min-h-[calc(100vh-80px)] space-y-10 overflow-x-hidden">
      {/* 1. Header & Page Context */}
      <div className="bg-gradient-to-r from-[#002c11] via-[#05401b] to-[#002c11] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-[#a0f399]/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#a0f399]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-[#a0f399] text-xs font-bold uppercase tracking-wider mb-2">
            <Compass className="w-4 h-4 text-[#30e872]" />
            <span>Geographic Artisan Heritage Directory</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-tight leading-tight">
            64 Districts of Bangladesh
          </h1>
          <p className="text-sm sm:text-base text-white/85 mt-2 leading-relaxed font-body">
            Select an administrative division, choose a district, and discover authentic local crafts,
            natural materials, and master artisan cooperatives rooted in Bangladesh's rich regional heritage.
          </p>
        </div>

        {/* Quick District Search Bar */}
        <div className="mt-6 pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/80 font-medium">Currently viewing:</span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#a0f399] text-[#002c11] rounded-full text-xs font-extrabold shadow-xs">
              <MapPin className="w-3.5 h-3.5" />
              {currentDistrictInfo.name} ({currentDistrictInfo.division} Division)
            </span>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDistrictSearchOpen(!isDistrictSearchOpen)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/20 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#a0f399]" />
              <span>Jump to any of 64 Districts</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            {isDistrictSearchOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-xl text-[#1b1c1c] rounded-2xl shadow-2xl border border-[#c1c9be] p-4 z-50">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#c1c9be]/40">
                  <span className="text-xs font-bold text-[#002c11]">Search 64 Districts</span>
                  <button
                    type="button"
                    onClick={() => setIsDistrictSearchOpen(false)}
                    className="text-xs text-[#717970] hover:text-[#ba1a1a] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Type district name (e.g. Sylhet, Tangail, Khulna)..."
                  value={districtQuery}
                  onChange={(e) => setDistrictQuery(e.target.value)}
                  autoFocus
                  className="w-full p-2.5 bg-[#fbf9f8] border border-[#c1c9be] rounded-xl text-xs text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none mb-3"
                />
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {searchedDistricts.length === 0 ? (
                    <p className="text-xs text-[#717970] text-center py-4">
                      No district found matching &ldquo;{districtQuery}&rdquo;
                    </p>
                  ) : (
                    searchedDistricts.map((d) => {
                      const dCount = products.filter(
                        (p) => isPublicProduct(p) && doesProductMatchDistrict(p.district, d)
                      ).length;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            handleDistrictSelect(d);
                            setIsDistrictSearchOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            d.name.toLowerCase() === currentDistrictInfo.name.toLowerCase()
                              ? 'bg-[#002c11] text-white font-bold'
                              : 'hover:bg-[#f0eded] text-[#414941]'
                          }`}
                        >
                          <div>
                            <span className="font-semibold block">{d.name}</span>
                            <span className="text-[10px] opacity-75">{d.division} Division</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono opacity-80 block">{d.artisanCount} artisans</span>
                            {dCount > 0 && (
                              <span className="text-[10px] font-bold text-[#1b6d24] bg-[#e8f5e9] px-1.5 py-0.5 rounded">
                                {dCount} items
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Step 1: 8 Divisions Luxury Frosted Glass Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#002c11] text-[#a0f399] text-xs font-extrabold flex items-center justify-center shadow-sm">
              1
            </span>
            <h2 className="text-lg font-extrabold text-[#002c11] font-heading">
              Select an Administrative Division (8 Divisions)
            </h2>
          </div>
          <span className="text-xs text-[#717970] font-medium hidden sm:inline">
            Hover &amp; click a division card to explore its districts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {BANGLADESH_DIVISIONS.map((div) => {
            const isActive = div.name.toLowerCase() === activeDivision.toLowerCase();
            return (
              <button
                key={div.id}
                type="button"
                onClick={() => handleDivisionChange(div.name)}
                className={`group relative overflow-hidden p-5 sm:p-6 rounded-3xl text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer flex flex-col justify-between min-h-[132px] ${
                  isActive
                    ? 'bg-gradient-to-br from-[#002c11] via-[#084620] to-[#116430] text-white border border-[#a0f399]/70 shadow-[0_20px_42px_-12px_rgba(0,44,17,0.55)] -translate-y-1'
                    : 'bg-white/55 backdrop-blur-2xl text-[#1b1c1c] border border-[#c1c9be]/60 shadow-[0_8px_30px_rgba(0,44,17,0.05)] hover:bg-gradient-to-br hover:from-[#f0faf1] hover:via-white hover:to-[#e2f5e5] hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_22px_45px_-12px_rgba(27,109,36,0.28)] hover:border-[#1b6d24]'
                }`}
              >
                {/* Diagonal Glass Light Sweep on Hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />

                {/* Decorative Ambient Glass Glow */}
                <div
                  className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-2xl transition-opacity duration-300 pointer-events-none ${
                    isActive
                      ? 'bg-[#30e872]/25 opacity-100'
                      : 'bg-[#1b6d24]/20 opacity-0 group-hover:opacity-100'
                  }`}
                />

                <div className="relative z-10 flex items-start justify-between w-full gap-2">
                  <div>
                    <span
                      className={`text-base sm:text-lg font-extrabold tracking-tight block transition-colors ${
                        isActive ? 'text-white' : 'text-[#002c11] group-hover:text-[#1b6d24]'
                      }`}
                    >
                      {div.name}
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-medium mt-0.5 block transition-colors ${
                        isActive ? 'text-[#a0f399]' : 'text-[#717970] group-hover:text-[#3d4d3e]'
                      }`}
                    >
                      {div.bnName} বিভাগ
                    </span>
                  </div>

                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-full shrink-0 transition-all duration-300 group-hover:scale-105 ${
                      isActive
                        ? 'bg-[#a0f399] text-[#002c11] shadow-xs'
                        : 'bg-[#eef6ef] text-[#1b6d24] border border-[#1b6d24]/15 group-hover:bg-[#1b6d24] group-hover:text-white'
                    }`}
                  >
                    {div.districtCount} Districts
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-between pt-4 mt-2 border-t border-current/10 text-[11px] font-semibold">
                  <span
                    className={
                      isActive
                        ? 'text-white/85'
                        : 'text-[#717970] group-hover:text-[#1b6d24] transition-colors'
                    }
                  >
                    {isActive ? 'Currently Selected' : 'Explore Regional Crafts'}
                  </span>
                  <ArrowRight
                    className={`w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5 ${
                      isActive ? 'text-[#a0f399]' : 'text-[#1b6d24]'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Step 2: Districts Luxury Frosted Glass Cards under Selected Division */}
      <div className="bg-gradient-to-br from-[#f2f7f3]/90 via-white/80 to-[#eef5ef]/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-[#c1c9be]/60 shadow-[0_12px_40px_rgba(0,44,17,0.05)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#c1c9be]/40">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#1b6d24] text-white text-xs font-extrabold flex items-center justify-center shadow-sm">
              2
            </span>
            <h3 className="text-lg font-extrabold text-[#002c11] font-heading">
              Select District in {activeDivision} Division ({districtsInActiveDivision.length} Districts)
            </h3>
          </div>
          <span className="text-xs text-[#717970] bg-white/90 px-3.5 py-1.5 rounded-full border border-[#c1c9be]/50 shadow-2xs">
            Active: <strong className="text-[#1b6d24]">{currentDistrictInfo.name} District</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {districtsInActiveDivision.map((district) => {
            const isSelected =
              currentDistrictInfo.name.toLowerCase() === district.name.toLowerCase();
            const pCount = products.filter(
              (p) => isPublicProduct(p) && doesProductMatchDistrict(p.district, district)
            ).length;

            return (
              <button
                key={district.id}
                type="button"
                onClick={() => handleDistrictSelect(district)}
                className={`group relative overflow-hidden p-5 rounded-3xl text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer flex flex-col justify-between min-h-[144px] ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#dff5e3] via-[#f1fbf3] to-white border-2 border-[#1b6d24] text-[#002c11] shadow-[0_18px_36px_-10px_rgba(27,109,36,0.32)] -translate-y-1'
                    : 'bg-white/65 backdrop-blur-2xl border border-[#c1c9be]/60 text-[#1b1c1c] shadow-[0_8px_28px_rgba(0,44,17,0.04)] hover:bg-gradient-to-br hover:from-[#eef9f0] hover:via-white hover:to-[#e0f4e4] hover:-translate-y-2 hover:scale-[1.015] hover:shadow-[0_20px_42px_-12px_rgba(27,109,36,0.26)] hover:border-[#1b6d24]'
                }`}
              >
                {/* Diagonal Glass Light Sweep on Hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/75 to-transparent pointer-events-none" />

                {/* Hover Radial Glass Shine */}
                <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#30e872]/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="relative z-10 flex items-start justify-between w-full gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <MapPin
                        className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                          isSelected
                            ? 'text-[#1b6d24]'
                            : 'text-[#717970] group-hover:text-[#1b6d24]'
                        }`}
                      />
                      <span className="text-base font-extrabold text-[#002c11] group-hover:text-[#1b6d24] transition-colors">
                        {district.name}
                      </span>
                    </div>
                    <p className="text-xs text-[#5d655c] line-clamp-1 mt-1.5 font-medium">
                      {district.specialty}
                    </p>
                  </div>

                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-[#1b6d24] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div className="relative z-10 flex items-center justify-between pt-3.5 mt-3 border-t border-[#c1c9be]/35 text-xs">
                  <span className="inline-flex items-center gap-1 text-[#5d655c] font-semibold">
                    <Users className="w-3.5 h-3.5 text-[#1b6d24]" />
                    {district.artisanCount} artisans
                  </span>

                  {pCount > 0 ? (
                    <span className="font-extrabold text-[#1b6d24] bg-[#dcf4df] group-hover:bg-[#1b6d24] group-hover:text-white px-2.5 py-0.5 rounded-full border border-[#1b6d24]/20 transition-colors">
                      {pCount} {pCount === 1 ? 'item' : 'items'}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-[#8a9289] group-hover:text-[#1b6d24] group-hover:translate-x-0.5 transition-all">
                      View crafts →
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. District Heritage Hero & Info Showcase */}
      <div
        id="district-showcase-section"
        className="rounded-3xl overflow-hidden border border-[#c1c9be]/60 bg-white shadow-md grid grid-cols-1 lg:grid-cols-12 gap-0"
      >
        <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full overflow-hidden group">
          <img
            src={currentDistrictInfo.heroImage}
            alt={currentDistrictInfo.name}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== HERO_ARTISAN_IMG) {
                target.src = HERO_ARTISAN_IMG;
              }
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002c11]/85 via-[#002c11]/30 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="inline-block px-3 py-1 bg-[#a0f399] text-[#002c11] rounded-full text-xs font-extrabold w-fit mb-2">
              {currentDistrictInfo.division} Division
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
              {currentDistrictInfo.name} District
            </h2>
            <p className="text-xs text-white/85 mt-1 line-clamp-2">
              {currentDistrictInfo.specialty}
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#1b6d24] bg-[#dbf5dc] px-3 py-1 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Regional Origin
              </span>
              <span className="text-xs font-bold text-[#414941] bg-[#f0eded] px-3 py-1 rounded-full flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#1b6d24]" />
                {currentDistrictInfo.artisanCount} Registered Artisans
              </span>
              <span className="text-xs font-mono font-bold text-[#717970] bg-[#fbf9f8] border border-[#c1c9be]/50 px-2.5 py-1 rounded-full">
                {totalProductsInThisDistrict} Available Products
              </span>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-[#002c11] font-heading">
                Artisan Heritage of {currentDistrictInfo.name}
              </h3>
              <p className="text-xs sm:text-sm text-[#414941] mt-1.5 leading-relaxed">
                {currentDistrictInfo.description}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f8faf8] border border-[#c1c9be]/40">
              <span className="text-xs font-bold text-[#002c11] block mb-1">
                Regional Specialty &amp; Crafts:
              </span>
              <p className="text-xs text-[#1b6d24] font-semibold">
                {currentDistrictInfo.specialty}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#c1c9be]/40 text-xs text-[#717970]">
            <div className="flex items-center gap-4">
              <span>🌱 100% Biodegradable / Organic materials</span>
              <span>🚚 Express Delivery across 64 Districts</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Filter Bar & Products from ONLY this District */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#c1c9be]/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#002c11] font-heading">
                Eco Products from {currentDistrictInfo.name}
              </h2>
              <span className="text-xs font-mono font-bold bg-[#dbf5dc] text-[#1b6d24] px-3 py-1 rounded-full">
                {sortedDistrictProducts.length} Items
              </span>
            </div>
            <p className="text-xs text-[#717970] mt-0.5">
              Strictly showing verified artisan products with confirmed origin in {currentDistrictInfo.name}, {currentDistrictInfo.division} Division.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs font-bold text-[#002c11] cursor-pointer bg-white px-3 py-2 rounded-2xl border border-[#c1c9be]/60 shadow-xs hover:border-[#1b6d24]">
              <input
                type="checkbox"
                checked={showOnlyVerified}
                onChange={(e) => setShowOnlyVerified(e.target.checked)}
                className="accent-[#1b6d24] rounded w-3.5 h-3.5"
              />
              <span>Eco Verified Only</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#717970] hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="p-2 sm:py-2 sm:px-3 bg-white border border-[#c1c9be] rounded-2xl text-xs font-bold text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none shadow-xs"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Customer Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category & Eco Type Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#717970] mr-1">Category:</span>
          {districtCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#002c11] text-white shadow-xs'
                    : 'bg-white border border-[#c1c9be]/50 text-[#414941] hover:bg-[#e8f5e9] hover:text-[#002c11]'
                }`}
              >
                {cat}
              </button>
            );
          })}

          <div className="h-4 w-px bg-[#c1c9be]/60 mx-1 hidden sm:block"></div>

          <span className="text-xs font-bold text-[#717970] mr-1">Eco Type:</span>
          {ALL_ECO_TYPES.map((type) => {
            const isSelected = selectedEcoTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleEcoType(type)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1b6d24] text-white shadow-xs'
                    : 'bg-white border border-[#c1c9be]/50 text-[#414941] hover:border-[#1b6d24]'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Product Grid strictly for this District */}
        {displayedProducts.length === 0 ? (
          <div className="bg-white border border-dashed border-[#c1c9be] rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#f0eded] flex items-center justify-center text-[#717970]">
              <Building2 className="w-8 h-8 text-[#1b6d24]" />
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-extrabold text-[#002c11] font-heading">
                No artisan eco-products currently registered from this district. Become the first artisan seller!
              </h3>
              <p className="text-xs text-[#414941] mt-1.5 leading-relaxed">
                SUNNO empowers indigenous producers in <strong>{currentDistrictInfo.name} ({currentDistrictInfo.division} Division)</strong> with direct marketplace access and fair trade.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenBecomeSeller) {
                    onOpenBecomeSeller();
                  } else {
                    window.location.hash = '#become-a-seller';
                    if (setActiveTab) setActiveTab('seller_portal');
                  }
                }}
                className="px-5 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
              >
                <StoreIcon className="w-4 h-4 text-[#30e872]" />
                Register as Seller
              </button>

              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedEcoTypes([]);
                  setShowOnlyVerified(false);
                }}
                className="px-4 py-2 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#002c11] rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>

              {setActiveTab && (
                <button
                  onClick={() => {
                    window.location.hash = '#products';
                    setActiveTab('products');
                  }}
                  className="px-4 py-2 bg-[#dbf5dc] text-[#1b6d24] hover:bg-[#c3eec6] rounded-2xl text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <span>Browse All Eco Products</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
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
        )}

        {/* Load More Button */}
        {displayedProducts.length < sortedDistrictProducts.length && (
          <div className="mt-6 flex justify-center pb-8">
            <button
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="text-xs font-bold text-[#414941] border-b-2 border-[#414941] hover:text-[#002c11] hover:border-[#002c11] transition-colors pb-0.5 cursor-pointer"
            >
              Load More Products from {currentDistrictInfo.name} ({sortedDistrictProducts.length - displayedProducts.length} remaining)
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
