import React, { useState, useEffect } from 'react';
import { ActiveTab, Category } from '../types';
import { fetchActiveCategories, subscribeCategories } from '../services/dbService';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (categoryName: string, categoryObj?: Category) => void;
  setActiveTab: (tab: ActiveTab) => void;
  categories?: Category[];
}

export const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  setActiveTab,
  categories: initialCategories,
}) => {
  const [dbCategories, setDbCategories] = useState<Category[]>(initialCategories || []);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setDbCategories(initialCategories);
      return;
    }
    const unsub = subscribeCategories((cats) => {
      const active = cats.filter((c) => c.status === 'ACTIVE' || c.status === 'active' || !c.status);
      setDbCategories(active);
    });
    return () => unsub();
  }, [initialCategories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-[#c1c9be]/60 shadow-2xl max-w-3xl w-full p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#f0eded] text-[#414941] transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="mb-6">
          <span className="text-xs font-bold text-[#1b6d24] uppercase tracking-wider">
            Curated Sustainable Categories
          </span>
          <h2 className="text-2xl font-extrabold text-[#002c11] font-heading mt-1">
            Explore SUNNO Categories & Taxonomy
          </h2>
          <p className="text-xs text-[#717970] mt-1">
            Browse verified eco-friendly Bangladeshi crafts by material lineage, conscious origin, and tradition.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {dbCategories.map((cat) => {
            const activeSubs = (cat.subcategories || []).filter(
              (s) => s.status === 'ACTIVE' || !s.status
            );

            return (
              <div
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.name, cat);
                  onClose();
                }}
                className="bg-[#fbf9f8] border border-[#c1c9be]/50 hover:border-[#1b6d24] rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md group flex items-start gap-3.5"
              >
                <div className="w-12 h-12 rounded-xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">{cat.icon || 'spa'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#002c11] group-hover:text-[#1b6d24] transition-colors">
                      {cat.name}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-[#1b6d24] bg-emerald-50 px-2 py-0.5 rounded-full">
                      Order #{cat.displayOrder || 1}
                    </span>
                  </div>
                  <p className="text-xs text-[#414941] mt-1 line-clamp-2">
                    {cat.description || 'Verified sustainable artisan goods from Bangladesh.'}
                  </p>
                  {activeSubs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {activeSubs.slice(0, 3).map((sub) => (
                        <span
                          key={sub.id}
                          className="text-[10px] bg-white border border-[#c1c9be]/60 px-2 py-0.5 rounded-lg text-[#002c11] font-medium"
                        >
                          {sub.name}
                        </span>
                      ))}
                      {activeSubs.length > 3 && (
                        <span className="text-[10px] text-[#717970] font-mono self-center">
                          +{activeSubs.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
