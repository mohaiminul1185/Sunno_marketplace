import React from 'react';
import { EcoCollection } from '../../types';
import { Sparkles, ArrowRight, Leaf, ShieldCheck, Heart } from 'lucide-react';

interface EcoCollectionsSectionProps {
  collections: EcoCollection[];
  onSelectCollection: (collection: EcoCollection) => void;
}

export const EcoCollectionsSection: React.FC<EcoCollectionsSectionProps> = ({
  collections,
  onSelectCollection,
}) => {
  if (!collections || collections.length === 0) return null;

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#1b6d24] uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-[#ba8300]" />
            <span>Curated Thematic Living</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
            Curated Eco Collections
          </h2>
          <p className="text-xs sm:text-sm text-[#717970] mt-1 max-w-xl">
            Ethically curated suites for plastic-free kitchens, heritage home decor, zero-waste lifestyle rituals, and organic harvests.
          </p>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((col) => (
          <div
            key={col.id}
            onClick={() => onSelectCollection(col)}
            className="group relative rounded-3xl overflow-hidden border border-[#c1c9be]/60 hover:border-[#1b6d24] bg-white shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            {/* Banner Image */}
            <div className="relative h-48 w-full overflow-hidden bg-[#e7e8e7]">
              <img
                src={col.bannerImage}
                alt={col.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

              {/* Tagline / Badge */}
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#002c11]/85 backdrop-blur-md text-[#b4f0b9] px-3 py-1 rounded-full border border-[#1b6d24]/30 shadow-xs">
                  <Leaf className="w-3 h-3 text-[#30e872]" />
                  {col.tagline || '100% Sustainable'}
                </span>
              </div>

              {/* Title & Overlay */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="text-lg sm:text-xl font-bold font-heading leading-tight mb-1">
                  {col.title}
                </h3>
              </div>
            </div>

            {/* Description & Action */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <p className="text-xs text-[#414941] leading-relaxed line-clamp-2">
                {col.description}
              </p>

              {/* Tags and CTA */}
              <div className="pt-3 border-t border-[#c1c9be]/40 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {(col.tags || []).slice(0, 3).map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-[#f0eded] text-[#414941] px-2 py-0.5 rounded-md font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <span className="text-xs font-bold text-[#1b6d24] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Explore Suite</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
