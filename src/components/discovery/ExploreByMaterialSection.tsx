import React from 'react';
import { Product } from '../../types';
import { Sparkles, ArrowRight, Layers } from 'lucide-react';

interface MaterialItem {
  id: string;
  name: string;
  bnName: string;
  description: string;
  image: string;
  tag: string;
}

const SUSTAINABLE_MATERIALS: MaterialItem[] = [
  {
    id: 'bamboo',
    name: 'Bamboo Crafts',
    bnName: 'বাঁশের কারুশিল্প',
    description: 'Fast-growing natural bamboo homeware, organizers, bottles, and decorative lamps.',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
    tag: 'Bamboo',
  },
  {
    id: 'jute',
    name: 'Golden Jute',
    bnName: 'সোনালী আঁশ পাট',
    description: '100% biodegradable totes, macrame planters, table runners, and storage baskets.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    tag: 'Jute',
  },
  {
    id: 'clay',
    name: 'Clay & Terracotta',
    bnName: 'পোড়ামাটি ও মৃৎশিল্প',
    description: 'Lead-free unglazed earthenware cooking pots, water jugs, and architectural plaques.',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&auto=format&fit=crop&q=80',
    tag: 'Clay',
  },
  {
    id: 'cane',
    name: 'Cane & Rattan',
    bnName: 'বেত শিল্প',
    description: 'Handwoven natural cane chairs, fruit trays, laundry baskets, and wall mirrors.',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
    tag: 'Cane',
  },
  {
    id: 'khadi',
    name: 'Handloom Khadi',
    bnName: 'খাদি ও হ্যান্ডলুম',
    description: 'Handspun indigenous organic cotton wraps, home textiles, and vegetable-dyed apparel.',
    image: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?w=600&auto=format&fit=crop&q=80',
    tag: 'Khadi',
  },
  {
    id: 'coconut',
    name: 'Coconut Shell & Coir',
    bnName: 'নারিকেল শিল্প',
    description: 'Upcycled polished coconut bowls, natural scrubbing brushes, and garden coir mats.',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80',
    tag: 'Coconut',
  },
  {
    id: 'silk',
    name: 'Rajshahi Silk',
    bnName: 'রেশম শিল্প',
    description: 'Authentic mulberry and endi silk handwoven scarves and luxury sustainable textiles.',
    image: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&auto=format&fit=crop&q=80',
    tag: 'Silk',
  },
  {
    id: 'recycled',
    name: 'Upcycled & Seed Paper',
    bnName: 'রিসাইকেলড ও প্ল্যান্টেবল পেপার',
    description: 'Zero-waste stationery embedded with wild flower seeds and upcycled denim bags.',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80',
    tag: 'Recycled',
  },
];

interface ExploreByMaterialSectionProps {
  products: Product[];
  onSelectMaterial: (materialTag: string) => void;
}

export const ExploreByMaterialSection: React.FC<ExploreByMaterialSectionProps> = ({
  products,
  onSelectMaterial,
}) => {
  const getProductCountForMaterial = (tag: string) => {
    return products.filter((p) => {
      if (p.status === 'archived') return false;
      const matStr = `${p.materialsUsed || ''} ${p.materialsInfo || ''} ${p.materialComposition || ''} ${p.title}`.toLowerCase();
      return matStr.includes(tag.toLowerCase());
    }).length;
  };

  return (
    <section className="bg-white border border-[#c1c9be]/50 rounded-3xl p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#1b6d24] uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Raw Natural Elements</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
            Explore by Sustainable Material
          </h2>
          <p className="text-xs sm:text-sm text-[#717970] mt-1 max-w-xl">
            100% natural, biodegradable, and non-synthetic materials cultivated organically from Bangladesh's fertile delta soil.
          </p>
        </div>
      </div>

      {/* Grid of Materials */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {SUSTAINABLE_MATERIALS.map((mat) => {
          const count = getProductCountForMaterial(mat.tag);
          return (
            <div
              key={mat.id}
              onClick={() => onSelectMaterial(mat.tag)}
              className="group relative rounded-2xl overflow-hidden border border-[#c1c9be]/50 hover:border-[#1b6d24] shadow-xs hover:shadow-md transition-all cursor-pointer bg-[#fbf9f8]"
            >
              {/* Image Container */}
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#e7e8e7]">
                <img
                  src={mat.image}
                  alt={mat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>

              {/* Text Overlay */}
              <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                <span className="text-[10px] text-[#b4f0b9] font-mono font-bold tracking-wider">
                  {mat.bnName}
                </span>
                <h3 className="font-bold text-sm sm:text-base font-heading leading-tight">
                  {mat.name}
                </h3>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#e7e8e7]">
                  <span>{count > 0 ? `${count} listings` : 'Artisan supply'}</span>
                  <span className="text-[#b4f0b9] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
