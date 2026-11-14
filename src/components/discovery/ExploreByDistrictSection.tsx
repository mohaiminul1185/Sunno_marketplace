import React, { useState } from 'react';
import { BANGLADESH_DIVISIONS, ALL_64_DISTRICTS } from '../../data/bangladeshDistricts';
import { Product } from '../../types';
import { MapPin, ArrowRight, Sparkles, Users, Search } from 'lucide-react';

interface ExploreByDistrictSectionProps {
  products: Product[];
  onSelectDistrict: (districtName: string) => void;
}

export const ExploreByDistrictSection: React.FC<ExploreByDistrictSectionProps> = ({
  products,
  onSelectDistrict,
}) => {
  const [selectedDivision, setSelectedDivision] = useState<string>('Dhaka');
  const [searchDistrict, setSearchDistrict] = useState<string>('');

  // Group districts by selected division or search query
  const filteredDistricts = ALL_64_DISTRICTS.filter((d) => {
    const matchesSearch =
      !searchDistrict ||
      d.name.toLowerCase().includes(searchDistrict.toLowerCase()) ||
      d.specialty.toLowerCase().includes(searchDistrict.toLowerCase()) ||
      d.division.toLowerCase().includes(searchDistrict.toLowerCase());

    if (searchDistrict) return matchesSearch;
    return d.division.toLowerCase() === selectedDivision.toLowerCase();
  });

  // Calculate live product count for each district
  const getProductCountForDistrict = (districtName: string) => {
    return products.filter(
      (p) => p.district?.toLowerCase() === districtName.toLowerCase() && p.status !== 'archived'
    ).length;
  };

  return (
    <section className="bg-[#fbf9f8] border border-[#c1c9be]/50 rounded-3xl p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#1b6d24] uppercase tracking-wider mb-1">
            <MapPin className="w-4 h-4" />
            <span>Artisan Lineage Across 64 Districts</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
            Explore by Bangladesh District
          </h2>
          <p className="text-xs sm:text-sm text-[#717970] mt-1 max-w-xl">
            Discover geographically authentic eco-crafts, indigenous weaving guilds, and master pottery traditions from all 8 administrative divisions.
          </p>
        </div>

        {/* District Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#717970] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchDistrict}
            onChange={(e) => setSearchDistrict(e.target.value)}
            placeholder="Search district or craft specialty..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#c1c9be] rounded-2xl text-xs text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none placeholder-[#717970]"
          />
        </div>
      </div>

      {/* Division Tabs (Hidden if searching) */}
      {!searchDistrict && (
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[#c1c9be]/40">
          {BANGLADESH_DIVISIONS.map((div) => {
            const isActive = selectedDivision.toLowerCase() === div.name.toLowerCase();
            return (
              <button
                key={div.id}
                onClick={() => setSelectedDivision(div.name)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#002c11] text-white shadow-sm'
                    : 'bg-white text-[#414941] border border-[#c1c9be]/50 hover:bg-[#f0eded]'
                }`}
              >
                <span>{div.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-[#1b6d24] text-white' : 'bg-[#e7e8e7] text-[#717970]'
                  }`}
                >
                  {div.districtCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Districts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredDistricts.map((district) => {
          const prodCount = getProductCountForDistrict(district.name);
          return (
            <div
              key={district.id}
              onClick={() => onSelectDistrict(district.name)}
              className="group bg-white rounded-2xl p-4 border border-[#c1c9be]/50 hover:border-[#1b6d24] shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* District Image / Thumbnail */}
                <div className="relative h-28 rounded-xl overflow-hidden mb-3 bg-[#f0eded]">
                  <img
                    src={district.heroImage}
                    alt={district.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white">
                    <span className="font-bold text-sm font-heading">{district.name}</span>
                    <span className="text-[10px] bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/20">
                      {district.division}
                    </span>
                  </div>
                </div>

                {/* Specialty */}
                <p className="text-xs font-semibold text-[#002c11] line-clamp-2 mb-2">
                  {district.specialty}
                </p>
              </div>

              <div className="pt-2 border-t border-[#c1c9be]/30 flex items-center justify-between text-[11px] text-[#717970]">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#1b6d24]" />
                  {district.artisanCount}+ Artisans
                </span>
                <span className="font-bold text-[#1b6d24] group-hover:underline flex items-center gap-1">
                  <span>{prodCount > 0 ? `${prodCount} Products` : 'Explore'}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
