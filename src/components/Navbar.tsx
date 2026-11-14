import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Home,
  LayoutGrid,
  MapPin,
  ArrowLeft,
  ArrowRight,
  LogOut,
  Package,
  Store,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Truck,
  Menu,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  CartItem,
  Category,
  Product,
  CustomerProfileTab,
  SellerPortalTab,
} from '../types';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  cart: CartItem[];
  setIsCartOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectProductById?: (id: string) => void;
  onOpenBecomeSeller?: () => void;
  wishlistCount?: number;
  onOpenWishlist?: () => void;
  onOpenCategories?: () => void;
  onSelectCategory?: (cat: Category) => void;
  onSelectCustomerTab?: (tab: CustomerProfileTab) => void;
  onSelectSellerTab?: (tab: SellerPortalTab) => void;
  categories?: Category[];
  products?: Product[];
  onOpenTrackOrder?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cart,
  setIsCartOpen,
  searchQuery,
  setSearchQuery,
  onOpenBecomeSeller,
  wishlistCount = 0,
  onOpenWishlist,
  onOpenCategories,
  onSelectCategory,
  onSelectCustomerTab,
  onSelectSellerTab,
  categories = [],
  onOpenTrackOrder,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
}) => {
  const { currentUser, userProfile, isAdmin, isSeller, openAuthModal, logout } = useAuth();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    window.location.hash = '#search';
    setActiveTab('search_results');
  };

  const handleNavCategoryClick = (catName: string) => {
    const matched = categories.find(
      (c) => c.name.toLowerCase() === catName.toLowerCase()
    );
    if (matched && onSelectCategory) {
      onSelectCategory(matched);
    } else {
      setSearchQuery(catName);
      window.location.hash = '#search';
      setActiveTab('search_results');
    }
    setIsMobileMenuOpen(false);
  };

  const navCategories = [
    'Organic Food',
    'Handmade Crafts',
    'Sustainable Fashion',
    'Eco-Home',
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-stone-200 shadow-xs">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-stone-700 hover:bg-stone-100 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.hash = '#home';
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img
              src="/sunno-logo.png"
              alt="SUNNO"
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#002c11] group-hover:text-[#1b6d24] transition-colors">
              SUNNO
            </span>
          </button>
        </div>

        {/* Center Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden sm:flex flex-1 max-w-xl items-center relative"
        >
          <div className="relative w-full flex items-center">
            <Search className="w-4 h-4 text-stone-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search for eco-friendly products, districts, artisans..."
              className="w-full pl-11 pr-12 py-2.5 bg-stone-50 border border-stone-200 rounded-full text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#1b6d24] transition-all"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-1.5 w-8 h-8 rounded-full bg-[#002c11] hover:bg-[#1b6d24] text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Right Actions: Track Order, Wishlist, Cart, Account */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {onOpenTrackOrder && (
            <button
              type="button"
              onClick={onOpenTrackOrder}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-stone-600 hover:text-[#002c11] hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-[#1b6d24]" />
              <span>Track Order</span>
            </button>
          )}

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={() => onOpenWishlist && onOpenWishlist()}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-stone-700 hover:text-red-600 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Saved Wishlist"
            aria-label="Wishlist"
          >
            <Heart
              className={`w-5 h-5 ${
                wishlistCount > 0 ? 'text-red-500 fill-red-500' : ''
              }`}
            />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Shopping Cart Button (Always Opens Drawer Without Forced Login) */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-stone-700 hover:text-[#002c11] hover:bg-stone-100 transition-colors cursor-pointer"
            title={`Shopping Bag (${totalCartCount} items)`}
            aria-label="Shopping Bag"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalCartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#1b6d24] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* Account Menu / Sign In */}
          <div className="relative" ref={dropdownRef}>
            {!currentUser ? (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-[#f3faf4] border border-[#1b6d24]/25 hover:border-[#1b6d24] text-[#002c11] transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#002c11] text-[#a0f399] flex items-center justify-center text-xs font-black uppercase">
                  {(userProfile?.displayName || currentUser.email || 'U').charAt(0)}
                </div>
                <span className="hidden md:inline text-xs font-bold max-w-[100px] truncate">
                  {userProfile?.displayName || 'Account'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
              </button>
            )}

            {/* Authenticated Account Dropdown */}
            {currentUser && isAccountMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50">
                <div className="px-4 py-2.5 border-b border-stone-100">
                  <p className="text-xs font-bold text-stone-900 truncate">
                    {userProfile?.displayName || 'SUNNO Member'}
                  </p>
                  <p className="text-[11px] text-stone-500 truncate">
                    {currentUser.email}
                  </p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onSelectCustomerTab && onSelectCustomerTab('overview');
                      window.location.hash = '#customer';
                      setActiveTab('customer_profile');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#1b6d24]" />
                    <span>My Profile & Wallet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onSelectCustomerTab && onSelectCustomerTab('orders');
                      window.location.hash = '#customer';
                      setActiveTab('customer_profile');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-[#1b6d24]" />
                    <span>My Orders</span>
                  </button>

                  {isSeller ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onSelectSellerTab && onSelectSellerTab('dashboard');
                        window.location.hash = '#seller';
                        setActiveTab('seller_portal');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Store className="w-4 h-4 text-[#1b6d24]" />
                      <span>Seller Dashboard</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onOpenBecomeSeller && onOpenBecomeSeller();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-[#1b6d24] hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Become an Artisan Seller</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        window.location.hash = '#admin';
                        setActiveTab('admin');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Admin Control Panel</span>
                    </button>
                  )}
                </div>

                <div className="border-t border-stone-100 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsAccountMenuOpen(false);
                      await logout();
                      window.location.hash = '#home';
                      setActiveTab('home');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Dark Green Navigation Bar (100% Public Browsing - No Login Required) */}
      <nav className="bg-[#002c11] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            {/* Back / Forward Arrows */}
            <div className="hidden sm:flex items-center gap-1 mr-2 text-white/60">
              <button
                type="button"
                onClick={onGoBack}
                disabled={!canGoBack}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onGoForward}
                disabled={!canGoForward}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                title="Forward"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Home */}
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#home';
                setActiveTab('home');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors shrink-0 cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-[#a0f399] text-[#002c11]'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            {/* All Products */}
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#products';
                setActiveTab('products');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
                activeTab === 'products' || activeTab === 'all_products'
                  ? 'bg-[#a0f399] text-[#002c11] font-bold'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Products</span>
            </button>

            {/* 64 Districts */}
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#districts';
                setActiveTab('districts');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
                activeTab === 'districts'
                  ? 'bg-[#a0f399] text-[#002c11] font-bold'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>64 Districts</span>
            </button>

            {/* Category Quick Links */}
            {navCategories.map((catName) => (
              <button
                key={catName}
                type="button"
                onClick={() => handleNavCategoryClick(catName)}
                className="px-3 py-1.5 rounded-lg font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                {catName}
              </button>
            ))}

            {onOpenCategories && (
              <button
                type="button"
                onClick={onOpenCategories}
                className="px-2.5 py-1.5 rounded-lg font-semibold text-[#a0f399] hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                All Categories
              </button>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#eco-education';
                setActiveTab('eco_education');
              }}
              className="text-[11px] font-semibold text-[#a0f399] hover:underline cursor-pointer"
            >
              Eco Standards
            </button>
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/80">
              MADE IN BANGLADESH
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-stone-200 px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search eco products..."
              className="w-full pl-4 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
            <button
              type="submit"
              className="absolute right-2 text-[#002c11]"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#home';
                setActiveTab('home');
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-stone-50 text-left text-stone-800"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#products';
                setActiveTab('products');
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-stone-50 text-left text-stone-800"
            >
              All Products
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#districts';
                setActiveTab('districts');
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-stone-50 text-left text-stone-800"
            >
              64 Districts
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#eco-education';
                setActiveTab('eco_education');
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-stone-50 text-left text-stone-800"
            >
              Eco Standards
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
