import React, { useState, useMemo, useEffect } from 'react';
import { Product, ActiveTab, SiteBrandingSettings, CMSSection } from '../types';
import { isPublicProduct } from '../services/firebase/productService';
import {
  fetchSiteSettings,
  fetchCMSSections,
  DEFAULT_SITE_SETTINGS,
} from '../services/cmsService';
import {
  HERO_ARTISAN_IMG,
  SYLHET_TEA_IMG,
  RANGAMATI_HANDLOOM_IMG,
  SUNDARBANS_HONEY_IMG,
  JUTE_TOTE_MAIN,
  NEEM_SOAP_IMG,
  BAMBOO_CUTLERY_IMG,
} from '../data/mockData';
import { ProductCard } from './ProductCard';
import {
  Star,
  ShoppingBag,
  ArrowRight,
  Leaf,
  Sparkles,
  ShieldCheck,
  MapPin,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface HeroSlide {
  id: string;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  highlightWord: string;
  subtitle: string;
  image: string;
  districtTarget: string | null;
  ctaPrimary: string;
}

interface HomeViewProps {
  products: Product[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectProduct: (product: Product) => void;
  onSelectDistrict: (district: string | null) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  wishlistIds?: string[];
  onToggleWishlist?: (productId: string) => void;
  onOpenQuickView?: (product: Product) => void;
  comparedProductIds?: string[];
  onToggleCompare?: (productId: string) => void;
  onSelectCollection?: (collection: any) => void;
  onSelectMaterial?: (material: string) => void;
  priceChangeAlerts?: any[];
  onDismissPriceAlert?: () => void;
  recentlyViewedIds?: string[];
  cartProductIds?: string[];
  onOpenCategories?: () => void;
  onSelectCategory?: (category: any) => void;
  categories?: any[];
}

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  setActiveTab,
  onSelectProduct,
  onSelectDistrict,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  onOpenQuickView,
  comparedProductIds = [],
  onToggleCompare,
  onOpenCategories,
}) => {
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [, setSiteSettings] = useState<SiteBrandingSettings>(DEFAULT_SITE_SETTINGS);
  const [cmsSections, setCmsSections] = useState<CMSSection[]>([]);

  useEffect(() => {
    fetchSiteSettings().then(setSiteSettings).catch(() => {});
    fetchCMSSections().then(setCmsSections).catch(() => {});
  }, []);

  const heroSection = useMemo(() => {
    return cmsSections.find((s) => s.type === 'hero_banner' && s.active) || null;
  }, [cmsSections]);

  const heroSlides: HeroSlide[] = useMemo(
    () => [
      {
        id: 'slide-1',
        eyebrow: 'SUSTAINABLE LIVING',
        titleLine1: 'Eco-Friendly',
        titleLine2: 'Products from',
        highlightWord: 'Bangladesh',
        subtitle:
          'Discover authentic, locally made, and sustainable products from verified artisans across all 64 districts.',
        image: heroSection?.bannerUrl || HERO_ARTISAN_IMG,
        districtTarget: null,
        ctaPrimary: 'Shop Now',
      },
      {
        id: 'slide-2',
        eyebrow: 'RANGAMATI & TANGAIL HERITAGE',
        titleLine1: 'Handwoven',
        titleLine2: 'Indigenous',
        highlightWord: 'Handlooms',
        subtitle:
          'Zero-electricity traditional pit-loom Jamdani, Khadi, and hill-tract textiles dyed with pure botanical extracts.',
        image: RANGAMATI_HANDLOOM_IMG,
        districtTarget: 'Tangail',
        ctaPrimary: 'Explore Handlooms',
      },
      {
        id: 'slide-3',
        eyebrow: 'SYLHET ORGANIC ESTATES',
        titleLine1: 'Single-Origin',
        titleLine2: 'Highland',
        highlightWord: 'Organic Tea',
        subtitle:
          'Hand-plucked whole green tea leaves cultivated without synthetic pesticides in the misty hills of Sreemangal.',
        image: SYLHET_TEA_IMG,
        districtTarget: 'Sylhet',
        ctaPrimary: 'Shop Sylhet Teas',
      },
      {
        id: 'slide-4',
        eyebrow: 'SUNDARBANS MANGROVE HARVEST',
        titleLine1: 'Pure Wildflower',
        titleLine2: 'Unfiltered',
        highlightWord: 'Raw Honey',
        subtitle:
          'Sustainably harvested by traditional Mowali honey collectors in Khulna and packed in reusable glass jars.',
        image: SUNDARBANS_HONEY_IMG,
        districtTarget: 'Khulna',
        ctaPrimary: 'Discover Organic Food',
      },
    ],
    [heroSection]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 4);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const dynamicSections = useMemo(() => {
    const now = new Date();
    return cmsSections
      .filter((s: any) => {
        if (!s.active || s.type === 'hero_banner' || s.type === 'artisan_stories') return false;
        if (s.schedule?.startDate && new Date(s.schedule.startDate) > now) return false;
        if (s.schedule?.endDate && new Date(s.schedule.endDate) < now) return false;
        return true;
      })
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  }, [cmsSections]);

  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 12, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 4, minutes: 12, seconds: 45 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Flash Sale items strictly mapped by exact Product ID
  const flashSaleItems = useMemo(() => {
    return [
      {
        productId: 'sun-org-01',
        title: 'Sundarbans Wildflower Raw Multiflora Honey (500g)',
        price: 680,
        originalPrice: 820,
        discount: 17,
        image: SUNDARBANS_HONEY_IMG,
        district: 'Khulna',
      },
      {
        productId: 'sun-fsh-01',
        title: 'Authentic Tangail Handloom Unbleached Cotton Jamdani Saree',
        price: 4250,
        originalPrice: 5100,
        discount: 17,
        image: RANGAMATI_HANDLOOM_IMG,
        district: 'Tangail',
      },
      {
        productId: 'sun-org-02',
        title: 'Sylhet Single-Estate Organic Whole Green Tea Leaves (250g)',
        price: 420,
        originalPrice: 520,
        discount: 19,
        image: SYLHET_TEA_IMG,
        district: 'Sylhet',
      },
    ];
  }, []);

  // Featured Products strictly mapped by exact Product ID (No fuzzy category fallback!)
  const showcaseFeaturedProducts = useMemo(
    () => [
      {
        id: 'sun-fsh-04',
        title: 'Unbleached Organic Cotton & Golden Jute Everyday Shopping Tote',
        price: 550,
        originalPrice: 690,
        rating: 4.9,
        reviewsCount: 230,
        image: JUTE_TOTE_MAIN,
        category: 'Sustainable Fashion',
        district: 'Narayanganj',
      },
      {
        id: 'sun-hom-04',
        title: 'Handmade Neem, Tulsi & Cold-Pressed Coconut Herbal Bath Soap',
        price: 350,
        originalPrice: 420,
        rating: 4.8,
        reviewsCount: 168,
        image: NEEM_SOAP_IMG,
        category: 'Eco-Home',
        district: 'Mymensingh',
      },
      {
        id: 'sun-org-01',
        title: 'Sundarbans Wildflower Raw Multiflora Honey (500g)',
        price: 680,
        originalPrice: 820,
        rating: 4.9,
        reviewsCount: 184,
        image: SUNDARBANS_HONEY_IMG,
        category: 'Organic Food',
        district: 'Khulna',
      },
      {
        id: 'sun-hom-01',
        title: 'Reusable Neem Wood & Bamboo Travel Cutlery Set with Jute Pouch',
        price: 320,
        originalPrice: 390,
        rating: 4.8,
        reviewsCount: 156,
        image: BAMBOO_CUTLERY_IMG,
        category: 'Eco-Home',
        district: 'Gazipur',
      },
    ],
    []
  );

  const sortedProducts = useMemo(() => {
    const list = [...products].filter(isPublicProduct);
    if (sortBy === 'price_asc') return list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price_desc') return list.sort((a, b) => b.price - a.price);
    if (sortBy === 'rating') return list.sort((a, b) => (b.rating || 5) - (a.rating || 5));
    return list.sort(
      (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );
  }, [products, sortBy]);

  const productsPerPage = 8;
  const displayedProducts = sortedProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / productsPerPage));

  const handleDistrictNavigate = (districtName: string) => {
    onSelectDistrict(districtName);
  };

  const handleShopNewArrivals = () => {
    const el = document.getElementById('all-products-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="flex-grow flex flex-col items-center w-full bg-[#fbf9f8]">
      {/* 1. Hardware-Accelerated GPU Sliding Track Hero Carousel */}
      <section className="w-full relative min-h-[470px] sm:min-h-[550px] md:min-h-[600px] overflow-hidden bg-[#06150c] flex items-center group">
        <div
          className="absolute inset-0 flex w-full h-full will-change-transform"
          style={{
            transform: `translate3d(-${currentSlide * 100}%, 0, 0)`,
            transition: 'transform 750ms cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {heroSlides.map((slide, idx) => (
            <div key={slide.id} className="relative w-full h-full shrink-0 overflow-hidden">
              <img
                src={slide.image}
                alt={slide.highlightWord}
                className="w-full h-full object-cover object-center transition-transform duration-[4000ms] ease-out"
                style={{
                  transform: currentSlide === idx ? 'scale(1.06)' : 'scale(1)',
                  opacity: 0.86,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#001708]/95 via-[#001708]/68 to-black/25 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001708]/95 via-transparent to-transparent pointer-events-none" />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handlePrevSlide}
          aria-label="Previous slide"
          className="hidden sm:flex absolute left-4 lg:left-8 z-20 w-11 h-11 rounded-full bg-black/35 hover:bg-[#1b6d24] text-white/90 hover:text-white border border-white/20 backdrop-blur-md items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleNextSlide}
          aria-label="Next slide"
          className="hidden sm:flex absolute right-4 lg:right-8 z-20 w-11 h-11 rounded-full bg-black/35 hover:bg-[#1b6d24] text-white/90 hover:text-white border border-white/20 backdrop-blur-md items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-8 md:px-14 lg:px-20 py-12 sm:py-16 md:py-20 flex flex-col justify-center">
          <div className="relative max-w-2xl min-h-[290px] sm:min-h-[330px] flex items-center">
            {heroSlides.map((slide, idx) => {
              const isActive = currentSlide === idx;
              return (
                <div
                  key={slide.id}
                  className={`w-full text-white transition-all duration-700 ease-out ${
                    isActive
                      ? 'opacity-100 translate-x-0 pointer-events-auto relative'
                      : 'opacity-0 translate-x-8 pointer-events-none absolute inset-0'
                  }`}
                >
                  <span className="text-xs sm:text-[13px] font-bold tracking-[0.22em] text-[#a0f399] uppercase mb-4 block">
                    {slide.eyebrow}
                  </span>

                  <h1 className="font-serif-luxury text-3xl sm:text-5xl md:text-6xl lg:text-[64px] text-white font-normal leading-[1.08] tracking-tight mb-4 text-balance">
                    {slide.titleLine1}
                    <br />
                    {slide.titleLine2}
                    <br />
                    <span className="relative inline-block text-white">
                      {slide.highlightWord}
                      <svg
                        className="absolute left-0 -bottom-1.5 w-full h-3 text-[#38b000] pointer-events-none"
                        viewBox="0 0 250 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 7.5C45 3.5 110 2 248 6.5C180 11 75 10.5 4 10"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          opacity="0.9"
                        />
                      </svg>
                    </span>
                  </h1>

                  <p className="text-sm sm:text-base text-[#e2ded9] leading-relaxed mb-8 max-w-xl font-light">
                    {slide.subtitle}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (slide.districtTarget) {
                          onSelectDistrict(slide.districtTarget);
                        } else {
                          handleShopNewArrivals();
                        }
                      }}
                      className="px-7 py-3.5 rounded-full bg-[#1b6d24] hover:bg-[#23882e] text-white font-bold text-xs sm:text-sm tracking-wide transition-all flex items-center gap-2 shadow-[0_8px_24px_rgba(27,109,36,0.45)] active:scale-95 cursor-pointer"
                    >
                      <span>{slide.ctaPrimary}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenCategories) onOpenCategories();
                        else {
                          window.location.hash = '#products';
                          setActiveTab('products');
                        }
                      }}
                      className="px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm tracking-wide transition-all backdrop-blur-md border border-white/35 active:scale-95 cursor-pointer"
                    >
                      Explore Categories
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-6 md:gap-8 pt-6 border-t border-white/15 text-xs text-white/90">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-[#30e872] shrink-0" />
              <span className="font-medium tracking-wide">Eco-Friendly Products</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#30e872] shrink-0" />
              <span className="font-medium tracking-wide">Verified Sellers</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#30e872] shrink-0" />
              <span className="font-medium tracking-wide">Bangladesh Made</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#30e872] shrink-0" />
              <span className="font-medium tracking-wide">Safe &amp; Reliable Delivery</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 pt-7">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentSlide === index
                    ? 'w-8 bg-[#a0f399] shadow-xs'
                    : 'w-2.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Mobile 2x2 Trust Badges Grid */}
      <div className="sm:hidden w-full px-4 pt-4 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#f4eee6] p-3.5 rounded-2xl border border-[#e5dfd4] flex flex-col items-center text-center">
            <Leaf className="w-5 h-5 text-[#1b6d24] mb-1.5" />
            <span className="text-xs font-bold text-[#002c11] leading-tight">Eco-Friendly Products</span>
          </div>
          <div className="bg-[#f4eee6] p-3.5 rounded-2xl border border-[#e5dfd4] flex flex-col items-center text-center">
            <ShieldCheck className="w-5 h-5 text-[#1b6d24] mb-1.5" />
            <span className="text-xs font-bold text-[#002c11] leading-tight">Verified Sellers</span>
          </div>
          <div className="bg-[#f4eee6] p-3.5 rounded-2xl border border-[#e5dfd4] flex flex-col items-center text-center">
            <MapPin className="w-5 h-5 text-[#1b6d24] mb-1.5" />
            <span className="text-xs font-bold text-[#002c11] leading-tight">Bangladesh Made</span>
          </div>
          <div className="bg-[#f4eee6] p-3.5 rounded-2xl border border-[#e5dfd4] flex flex-col items-center text-center">
            <Package className="w-5 h-5 text-[#1b6d24] mb-1.5" />
            <span className="text-xs font-bold text-[#002c11] leading-tight">Safe &amp; Reliable Delivery</span>
          </div>
        </div>
      </div>

      {/* 3. FEATURED PRODUCTS — Handpicked for a Greener Lifestyle */}
      <section className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 mb-8 mt-4">
        <div className="mb-6">
          <span className="text-[11px] font-bold text-[#1b6d24] tracking-widest uppercase mb-1 block">
            FEATURED PRODUCTS
          </span>
          <h2 className="font-serif-luxury text-2xl sm:text-3xl md:text-4xl text-[#002c11] font-normal leading-tight">
            Handpicked for a Greener Lifestyle
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {showcaseFeaturedProducts.map((item) => {
            // Exact ID match ONLY so clicking Bag opens Bag, Soap opens Soap, Honey opens Honey
           const foundById = products.find((p) => p.id === item.id);
const targetProduct =
  foundById ||
  ({
    id: item.id,
    sku: 'SUNNO-' + item.id.toUpperCase(),
    title: item.title,
    price: item.price,
    compareAtPrice: item.originalPrice,
    rating: item.rating,
    reviewsCount: item.reviewsCount,
    images: [item.image],
    category: item.category,
    district: item.district,
    division: 'Dhaka',
    stock: 25,
    status: 'eco_verified',
    sellerId: 'artisan-verified',
    sellerName: 'Verified SUNNO Artisan',
    description: 'Locally crafted authentic sustainable product from Bangladesh.',
    createdAt: new Date().toISOString(),
  } as unknown as Product);

const displayImage = item.image;
const displayTitle = item.title;
const displayPrice = item.price;
const displayComparePrice = item.originalPrice;


            return (
              <div
                key={item.id}
                onClick={() => onSelectProduct(targetProduct)}
                className="bg-white rounded-2xl sm:rounded-3xl p-4 border border-[#e5dfd4] shadow-xs hover:shadow-[0_12px_28px_rgba(0,44,17,0.08)] hover:border-[#1b6d24]/30 transition-all duration-300 group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#f4ede4] mb-3.5">
                    <img
                      src={displayImage}
                      alt={displayTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <span className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-xs text-[#002c11] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{foundById?.rating || item.rating}</span>

                    </span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-[#002c11] group-hover:text-[#1b6d24] transition-colors line-clamp-1 mb-1">
                    {displayTitle}
                  </h3>
                  <span className="text-xs text-[#717970] block mb-2">
                    {foundById?.category || item.category}

                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#f0eded]">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-base sm:text-lg text-[#002c11] tabular-nums font-mono">
                      ৳ {displayPrice}
                    </span>
                    {displayComparePrice && (
                      <span className="text-xs text-[#717970] line-through tabular-nums font-mono">
                        ৳ {displayComparePrice}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(targetProduct, e);
                    }}
                    className="w-9 h-9 rounded-full bg-[#002c11] hover:bg-[#1b6d24] text-white flex items-center justify-center transition-all shadow-xs active:scale-90 cursor-pointer"
                    title="Add to Cart"
                  >
                    <ShoppingBag className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Flash Sale Section */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-3 mb-10">
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#c1c9be]/40 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#f0eded]">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-extrabold text-base sm:text-xl text-[#002c11] font-heading">
                Limited Flash Offers
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-[#717970]">
                <span>Ends In:</span>
                <span className="bg-[#002c11] text-[#a0f399] font-bold px-2 py-0.5 rounded-lg text-xs tabular-nums font-mono">
                  {String(timeLeft.hours).padStart(2, '0')}h
                </span>
                <span className="font-bold text-[#002c11]">:</span>
                <span className="bg-[#002c11] text-[#a0f399] font-bold px-2 py-0.5 rounded-lg text-xs tabular-nums font-mono">
                  {String(timeLeft.minutes).padStart(2, '0')}m
                </span>
                <span className="font-bold text-[#002c11]">:</span>
                <span className="bg-[#002c11] text-[#a0f399] font-bold px-2 py-0.5 rounded-lg text-xs tabular-nums font-mono">
                  {String(timeLeft.seconds).padStart(2, '0')}s
                </span>
              </div>
            </div>

            <button
              onClick={handleShopNewArrivals}
              className="text-xs font-bold text-[#1b6d24] hover:text-[#002c11] flex items-center gap-1 cursor-pointer"
            >
              <span>View All Deals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {flashSaleItems.map((item) => {
              const matchedProduct = products.find((p) => p.id === item.productId);
              return (
                <div
                  key={item.productId}
                  onClick={() => {
                    if (matchedProduct) {
  onSelectProduct(matchedProduct);
} else {
  onSelectProduct({
    id: item.productId,
    title: item.title,
    price: item.price,
    compareAtPrice: item.originalPrice,
    images: [item.image],
    district: item.district,
    category: 'Eco-Friendly',
    stock: 20,
    status: 'eco_verified',
  } as unknown as Product);
}

                  }}
                  className="group cursor-pointer flex flex-col p-3 rounded-2xl border border-transparent hover:border-[#c1c9be]/40 hover:bg-[#fbf9f8] transition-all"
                >
                  <div className="relative aspect-[16/11] rounded-2xl overflow-hidden bg-[#f3f4f6] mb-3">
                    <img
                      src={matchedProduct?.images?.[0] || item.image}
                      alt={matchedProduct?.title || item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-[#ba1a1a] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-xs">
                      -{item.discount}%
                    </span>
                    <span className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {matchedProduct?.district || item.district}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#1b1c1c] line-clamp-1 group-hover:text-[#1b6d24] transition-colors">
                    {matchedProduct?.title || item.title}
                  </h4>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="font-extrabold text-sm sm:text-base text-[#002c11] tabular-nums font-mono">
                      ৳{matchedProduct?.price || item.price}
                    </span>
                    <span className="text-xs text-[#717970] line-through tabular-nums font-mono">
                      ৳{matchedProduct?.compareAtPrice || item.originalPrice}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Discover 64 Districts Bento Section */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-4 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
          <div>
            <span className="text-[11px] font-bold text-[#1b6d24] tracking-widest uppercase mb-1 block">
              Indigenous Craft Map
            </span>
            <h2 className="font-serif-luxury text-2xl sm:text-3xl md:text-4xl text-[#002c11] font-normal leading-tight">
              Discover Bangladesh's 64 Districts
            </h2>
            <p className="text-xs sm:text-sm text-[#717970] mt-1.5 max-w-xl">
              Journey through the unique craftsmanship and organic produce of every corner of Bangladesh, curated for the conscious consumer.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelectDistrict(null)}
            className="text-xs font-bold text-[#002c11] hover:text-[#1b6d24] flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>View Full Directory</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div
            onClick={() => handleDistrictNavigate('Sylhet')}
            className="lg:col-span-7 relative min-h-[340px] sm:min-h-[420px] rounded-3xl overflow-hidden group cursor-pointer shadow-xs border border-[#c1c9be]/30"
          >
            <img
              src={SYLHET_TEA_IMG}
              alt="Sylhet Organic Tea Gardens"
              className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"></div>

            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#a0f399] mb-2 block">
                SYLHET · SUSTAINABLE ESTATE TEAS
              </span>
              <h3 className="font-serif-luxury text-2xl sm:text-3xl font-normal mb-2 leading-tight">
                Organic High-Elevation Tea Gardens
              </h3>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-lg font-light">
                Experience the finest hand-picked organic teas, cultivated with traditional sustainable methods passed down through generations.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-5">
            <div
              onClick={() => handleDistrictNavigate('Rangamati')}
              className="relative min-h-[165px] sm:min-h-[200px] rounded-3xl overflow-hidden group cursor-pointer shadow-xs border border-[#c1c9be]/30 flex-1"
            >
              <img
                src={RANGAMATI_HANDLOOM_IMG}
                alt="Heritage Handloom"
                className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#a0f399] mb-1 block">
                  RANGAMATI · INDIGENOUS HANDLOOM
                </span>
                <h3 className="font-serif-luxury text-lg sm:text-xl font-normal leading-tight">
                  Hand-Spun Hill Tract Scarves
                </h3>
              </div>
            </div>

            <div
              onClick={() => handleDistrictNavigate('Khulna')}
              className="relative min-h-[165px] sm:min-h-[200px] rounded-3xl overflow-hidden group cursor-pointer shadow-xs border border-[#c1c9be]/30 flex-1"
            >
              <img
                src={SUNDARBANS_HONEY_IMG}
                alt="Wild Forest Honey"
                className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#a0f399] mb-1 block">
                  SUNDARBANS · RAW HARVEST
                </span>
                <h3 className="font-serif-luxury text-lg sm:text-xl font-normal leading-tight">
                  Wild Mangrove Forest Honey
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic CMS Sections Configured via Admin CMS */}
      {dynamicSections.length > 0 && (
        <section className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 space-y-8 mb-8">
          {dynamicSections.map((sec: any) => {
            if (sec.type === 'promotional_banner') {
              return (
                <div
                  key={sec.id}
                  className="relative rounded-3xl overflow-hidden shadow-sm bg-linear-to-r from-[#072413] to-[#124225] border border-[#1b482b] text-white p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6"
                >
                  {sec.bannerUrl && (
                    <img
                      src={sec.bannerUrl}
                      alt={sec.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                    />
                  )}
                  <div className="relative z-10 max-w-xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-emerald-300 text-[10px] font-bold rounded-full mb-3 uppercase tracking-wider border border-white/10">
                      <Sparkles className="w-3 h-3" />
                      Featured Campaign
                    </span>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading mb-2 leading-tight">
                      {sec.title}
                    </h3>
                    {sec.subtitle && (
                      <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed mb-4">
                        {sec.subtitle}
                      </p>
                    )}
                  </div>
                  {sec.ctaText && (
                    <div className="relative z-10 shrink-0">
                      <button
                        onClick={() => {
                          if (sec.ctaLink?.startsWith('#')) {
                            const target = sec.ctaLink.replace('#', '') as ActiveTab;
                            window.location.hash = sec.ctaLink;
                            setActiveTab(target);
                          } else {
                            handleShopNewArrivals();
                          }
                        }}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs sm:text-sm rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <span>{sec.ctaText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </section>
      )}

      {/* 5. All Eco-Friendly Products Section */}
      <section id="all-products-section" className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-6">
          <div>
            <span className="text-[11px] font-bold text-[#1b6d24] tracking-widest uppercase mb-1 block">
              Curated Catalog
            </span>
            <h2 className="font-serif-luxury text-2xl sm:text-3xl md:text-4xl text-[#002c11] font-normal leading-tight">
              All Eco-Friendly Products
            </h2>
            <p className="text-xs sm:text-sm text-[#717970] mt-1.5 font-light max-w-xl">
              Support local artisans and discover the authentic heritage of Bangladesh through our curated sustainable collection.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#717970] font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="text-xs font-semibold text-[#002c11] bg-white border border-[#c1c9be]/60 rounded-xl px-3 py-2 outline-none focus:border-[#1b6d24] shadow-2xs cursor-pointer transition-colors"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
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

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#717970] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold cursor-pointer border border-[#c1c9be]/30 active:scale-95"
            >
              &lt;
            </button>

            {[...Array(totalPages)].map((_, idx) => {
              const page = idx + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-full font-bold text-xs transition-all cursor-pointer tabular-nums font-mono active:scale-95 ${
                    currentPage === page
                      ? 'bg-[#002c11] text-white shadow-xs'
                      : 'text-[#414941] bg-white/70 hover:bg-white border border-[#c1c9be]/30'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#717970] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold cursor-pointer border border-[#c1c9be]/30 active:scale-95"
            >
              &gt;
            </button>
          </div>
        )}
      </section>
    </main>
  );
};
