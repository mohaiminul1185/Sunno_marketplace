import React from 'react';
import { Home, ShoppingBag, Search, MapPin, Compass, ArrowRight, Sparkles } from 'lucide-react';
import { ALL_64_DISTRICTS } from '../data/bangladeshDistricts';

interface NotFoundViewProps {
  onGoHome: () => void;
  onBrowseProducts: () => void;
  onOpenSearch: () => void;
  onSelectDistrict?: (districtName: string) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onGoHome,
  onBrowseProducts,
  onOpenSearch,
  onSelectDistrict,
}) => {
  const popularDistricts = ['Dhaka', 'Khulna', 'Sylhet', 'Bogura', 'Tangail', 'Chattogram'];

  return (
    <main
      id="not-found-page"
      role="main"
      className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-16 text-center bg-[#fdfbf7]"
    >
      <div className="max-w-2xl mx-auto w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1b6d24]/10 text-[#1b6d24] text-xs font-bold uppercase tracking-wider mb-6 border border-[#1b6d24]/20">
          <Compass className="w-3.5 h-3.5" />
          <span>404 — Path Not Found</span>
        </div>

        {/* Big Code & Title */}
        <h1 className="text-6xl sm:text-7xl font-black text-[#1b1c1c] tracking-tight mb-4 font-serif">
          4<span className="text-[#1b6d24]">0</span>4
        </h1>

        <h2 className="text-xl sm:text-2xl font-bold text-[#2d3b2f] mb-3">
          This Artisan Craft or Directory Page Cannot Be Found
        </h2>

        <p className="text-sm sm:text-base text-[#526350] max-w-lg mx-auto mb-8 leading-relaxed">
          The artisan collection, verified eco listing, or district route you are looking for
          may have been updated, relocated, or is momentarily resting.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <button
            type="button"
            id="notfound-btn-home"
            onClick={onGoHome}
            className="min-h-[44px] px-6 py-2.5 bg-[#1b6d24] hover:bg-[#14551c] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
            aria-label="Return to SUNNO Marketplace Homepage"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </button>

          <button
            type="button"
            id="notfound-btn-browse"
            onClick={onBrowseProducts}
            className="min-h-[44px] px-6 py-2.5 bg-white border border-[#c1c9be] hover:border-[#1b6d24] text-[#1b1c1c] hover:text-[#1b6d24] rounded-xl font-bold text-sm shadow-xs hover:shadow-md transition-all flex items-center gap-2 active:scale-95"
            aria-label="Browse All Eco-Verified Bangladesh Products"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse Products</span>
          </button>

          <button
            type="button"
            id="notfound-btn-search"
            onClick={onOpenSearch}
            className="min-h-[44px] px-6 py-2.5 bg-[#f0f4ee] hover:bg-[#e2eade] text-[#1b6d24] rounded-xl font-bold text-sm transition-all flex items-center gap-2 active:scale-95 border border-[#1b6d24]/20"
            aria-label="Search Products and Artisans"
          >
            <Search className="w-4 h-4" />
            <span>Search Catalog</span>
          </button>
        </div>

        {/* Popular Districts Fallback Directory */}
        <div className="pt-8 border-t border-[#e2e8df] text-left max-w-lg mx-auto">
          <p className="text-xs font-bold text-[#717970] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#1b6d24]" />
            <span>Explore 64 Districts Artisan Directory:</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {popularDistricts.map((district) => (
              <button
                key={district}
                type="button"
                id={`notfound-dist-${district.toLowerCase()}`}
                onClick={() => {
                  if (onSelectDistrict) {
                    onSelectDistrict(district);
                  } else {
                    window.location.hash = `#districts/${encodeURIComponent(district)}`;
                  }
                }}
                className="min-h-[36px] px-3.5 py-1.5 bg-white border border-[#c1c9be]/70 hover:border-[#1b6d24] hover:bg-[#f2f8f3] text-[#2d3b2f] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <span>{district}</span>
                <ArrowRight className="w-3 h-3 text-[#1b6d24] opacity-70" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};
