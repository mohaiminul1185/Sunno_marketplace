import React, { useState, useEffect } from 'react';
import { Category, SubCategory, CategoryStatus, Product } from '../types';
import {
  fetchCategories,
  subscribeCategories,
  createCategoryInDb,
  updateCategoryInDb,
  deleteCategoryInDb,
  archiveCategoryInDb,
  toggleCategoryStatusInDb,
  reorderCategoriesInDb,
  checkCategoryHasActiveProducts,
} from '../services/dbService';
import { useAuth } from '../context/AuthContext';

interface AdminCategoryManagerProps {
  allProducts: Product[];
  onShowToast: (msg: string) => void;
}

const POPULAR_ICONS = [
  { name: 'spa', label: 'Spa / Leaves' },
  { name: 'palette', label: 'Palette / Art' },
  { name: 'styler', label: 'Fashion / Textile' },
  { name: 'home', label: 'Home / Living' },
  { name: 'park', label: 'Tree / Nature' },
  { name: 'grass', label: 'Grass / Fiber' },
  { name: 'shopping_bag', label: 'Bags & Totes' },
  { name: 'local_cafe', label: 'Pottery / Mug' },
  { name: 'recycling', label: 'Recycled' },
  { name: 'clean_hands', label: 'Handmade' },
  { name: 'potted_plant', label: 'Plant & Clay' },
  { name: 'kitchen', label: 'Kitchen & Dining' },
  { name: 'eco', label: 'Eco Leaf' },
];

export const AdminCategoryManager: React.FC<AdminCategoryManagerProps> = ({
  allProducts,
  onShowToast,
}) => {
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('spa');
  const [formImage, setFormImage] = useState('');
  const [formStatus, setFormStatus] = useState<CategoryStatus>('ACTIVE');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(1);
  const [formSubcategories, setFormSubcategories] = useState<SubCategory[]>([]);
  const [newSubcatName, setNewSubcatName] = useState('');

  // Delete/Archive Warning Modal
  const [deleteWarningCategory, setDeleteWarningCategory] = useState<Category | null>(null);
  const [deleteWarningProductCount, setDeleteWarningProductCount] = useState<number>(0);

  // Subscribe to real-time categories
  useEffect(() => {
    const unsub = subscribeCategories((cats) => {
      setCategories(cats);
    });
    return () => unsub();
  }, []);

  // Compute live product counts per category
  const getProductCountForCategory = (cat: Category) => {
    const matching = allProducts.filter(
      (p) =>
        p.status !== 'archived' &&
        (p.category?.toLowerCase().trim() === cat.name.toLowerCase().trim() ||
         p.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cat.slug.toLowerCase())
    );
    return matching.length;
  };

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormIcon('spa');
    setFormImage('');
    setFormStatus('ACTIVE');
    setFormDisplayOrder(categories.length + 1);
    setFormSubcategories([]);
    setNewSubcatName('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description || '');
    setFormIcon(cat.icon || 'spa');
    setFormImage(cat.image || '');
    setFormStatus(cat.status || 'ACTIVE');
    setFormDisplayOrder(cat.displayOrder || 1);
    setFormSubcategories(cat.subcategories ? [...cat.subcategories] : []);
    setNewSubcatName('');
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCategory) {
      // Auto-generate slug for new category
      const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setFormSlug(autoSlug);
    }
  };

  const handleAddSubcategory = () => {
    if (!newSubcatName.trim()) return;
    const subSlug = newSubcatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const newSub: SubCategory = {
      id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: newSubcatName.trim(),
      slug: subSlug,
      status: 'ACTIVE',
      displayOrder: formSubcategories.length + 1,
    };
    setFormSubcategories([...formSubcategories, newSub]);
    setNewSubcatName('');
  };

  const handleRemoveSubcategory = (index: number) => {
    setFormSubcategories(formSubcategories.filter((_, i) => i !== index));
  };

  const handleToggleSubcategoryStatus = (index: number) => {
    setFormSubcategories(
      formSubcategories.map((sub, i) =>
        i === index
          ? { ...sub, status: sub.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
          : sub
      )
    );
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onShowToast('Category Name is required.');
      return;
    }

    setIsLoading(true);
    try {
      const slug = (formSlug || formName.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-+|-+$/g, '');
      const actorId = userProfile?.id || 'admin-01';

      if (editingCategory) {
        await updateCategoryInDb(
          editingCategory.id,
          {
            name: formName.trim(),
            slug,
            description: formDescription.trim(),
            icon: formIcon,
            image: formImage.trim(),
            status: formStatus,
            displayOrder: Number(formDisplayOrder),
            subcategories: formSubcategories,
          },
          actorId
        );
        onShowToast(`Category "${formName}" updated successfully.`);
      } else {
        await createCategoryInDb(
          {
            name: formName.trim(),
            slug,
            description: formDescription.trim(),
            icon: formIcon,
            image: formImage.trim(),
            status: formStatus,
            displayOrder: Number(formDisplayOrder),
            subcategories: formSubcategories,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          actorId
        );
        onShowToast(`Category "${formName}" created successfully.`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to save category.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    const newStatus: CategoryStatus = cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await toggleCategoryStatusInDb(cat.id, newStatus, userProfile?.id || 'admin-01');
      onShowToast(`Category "${cat.name}" is now ${newStatus}.`);
    } catch (err: any) {
      onShowToast('Failed to toggle status.');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'UP' | 'DOWN') => {
    if (
      (direction === 'UP' && index === 0) ||
      (direction === 'DOWN' && index === categories.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const reordered = [...categories];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const payload = reordered.map((item, idx) => ({
      id: item.id,
      displayOrder: idx + 1,
    }));

    try {
      await reorderCategoriesInDb(payload, userProfile?.id || 'admin-01');
      onShowToast('Categories reordered successfully.');
    } catch (err) {
      onShowToast('Failed to update category order.');
    }
  };

  const initiateDelete = async (cat: Category) => {
    const { count } = await checkCategoryHasActiveProducts(cat.name);
    setDeleteWarningCategory(cat);
    setDeleteWarningProductCount(count);
  };

  const confirmDeleteOrArchive = async () => {
    if (!deleteWarningCategory) return;
    try {
      const res = await deleteCategoryInDb(deleteWarningCategory.id, userProfile?.id || 'admin-01');
      onShowToast(res.message);
      setDeleteWarningCategory(null);
    } catch (err: any) {
      onShowToast(err.message || 'Error executing delete.');
    }
  };

  // Filter categories
  const filteredCategories = categories.filter((cat) => {
    const matchesSearch =
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? cat.status === 'ACTIVE' || cat.status === 'active' || !cat.status
        : cat.status === 'INACTIVE' || cat.status === 'inactive';
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0e2417] p-6 rounded-3xl border border-[#1b482b]">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#a0f399] text-2xl">category</span>
            <h2 className="text-xl font-bold text-white font-heading">
              Categories & Taxonomy Management
            </h2>
          </div>
          <p className="text-xs text-[#80a48b] mt-1">
            Dynamic database-driven category tree. Admin has full control over activation, sorting, and subcategories.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] text-xs font-bold rounded-2xl shadow-md transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Add Main Category
        </button>
      </div>

      {/* Control Bar: Search & Status Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7ca087] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search categories by name, slug, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#12281a] border border-[#20452d] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#7ca087] outline-none focus:border-[#a0f399]"
          />
        </div>
        <div className="flex gap-1.5 bg-[#12281a] p-1 rounded-2xl border border-[#20452d] shrink-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL' ? 'bg-[#1b6d24] text-white' : 'text-[#8ca893] hover:text-white'
            }`}
          >
            All ({categories.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ACTIVE' ? 'bg-emerald-700 text-white' : 'text-[#8ca893] hover:text-white'
            }`}
          >
            Active ({categories.filter((c) => c.status === 'ACTIVE' || c.status === 'active' || !c.status).length})
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'INACTIVE' ? 'bg-amber-700 text-white' : 'text-[#8ca893] hover:text-white'
            }`}
          >
            Inactive ({categories.filter((c) => c.status === 'INACTIVE' || c.status === 'inactive').length})
          </button>
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCategories.map((cat, index) => {
          const prodCount = getProductCountForCategory(cat);
          const isActive = cat.status === 'ACTIVE' || cat.status === 'active' || !cat.status;

          return (
            <div
              key={cat.id}
              className={`bg-[#0e2115] border rounded-3xl p-5 space-y-4 transition-all hover:border-[#a0f399]/40 ${
                isActive ? 'border-[#1b4128]' : 'border-amber-900/40 opacity-80'
              }`}
            >
              {/* Top Row: Icon, Title, Status & Actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#173824] text-[#a0f399] flex items-center justify-center shrink-0 border border-[#235637]">
                    <span className="material-symbols-outlined text-2xl">{cat.icon || 'spa'}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base font-heading">{cat.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#7ca087] font-mono mt-0.5">
                      <span>slug: /{cat.slug}</span>
                      <span>•</span>
                      <span>Order: #{cat.displayOrder || index + 1}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Reorder & Edit Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveOrder(index, 'UP')}
                    disabled={index === 0}
                    title="Move Order Up"
                    className="p-1 text-[#80a48b] hover:text-white hover:bg-[#183a24] rounded-lg disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  </button>
                  <button
                    onClick={() => handleMoveOrder(index, 'DOWN')}
                    disabled={index === categories.length - 1}
                    title="Move Order Down"
                    className="p-1 text-[#80a48b] hover:text-white hover:bg-[#183a24] rounded-lg disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(cat)}
                    title="Edit Category"
                    className="p-1 text-[#a0f399] hover:bg-[#183a24] rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => initiateDelete(cat)}
                    title="Delete or Archive Category"
                    className="p-1 text-red-400 hover:bg-red-950/60 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-[#a3c4ad] leading-relaxed">
                {cat.description || 'Traditional eco-friendly artisan craft category.'}
              </p>

              {/* Subcategories Pills */}
              <div className="space-y-1.5 pt-2 border-t border-[#183a24]">
                <div className="flex items-center justify-between text-[11px] text-[#7ca087]">
                  <span className="font-bold uppercase tracking-wider">Subcategories ({cat.subcategories?.length || 0})</span>
                  <span className="font-mono text-[#a0f399]">{prodCount} live products</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cat.subcategories && cat.subcategories.length > 0 ? (
                    cat.subcategories.map((sub) => (
                      <span
                        key={sub.id}
                        className={`text-[11px] px-2.5 py-1 rounded-xl border ${
                          sub.status === 'ACTIVE' || !sub.status
                            ? 'bg-[#142e1d] text-[#c2eccb] border-[#224b30]'
                            : 'bg-stone-900 text-stone-500 border-stone-800 line-through'
                        }`}
                      >
                        {sub.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#5e816a] italic">No subcategories defined</span>
                  )}
                </div>
              </div>

              {/* Bottom Quick Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-[#183a24] text-xs">
                <span className="text-[#80a48b] text-[11px]">
                  Created: {new Date(cat.createdAt || Date.now()).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleToggleStatus(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-amber-950/80 text-amber-300 hover:bg-amber-900'
                      : 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900'
                  }`}
                >
                  {isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e2417] text-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#1b482b] max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b482b]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#a0f399] text-2xl">
                  {editingCategory ? 'edit_note' : 'add_box'}
                </span>
                <h3 className="text-lg font-bold font-heading">
                  {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#80a48b] hover:text-white rounded-full"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              {/* Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#80a48b] mb-1 uppercase">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Food"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-[#122b1c] border border-[#20452d] rounded-xl p-2.5 outline-none text-white focus:border-[#a0f399]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#80a48b] mb-1 uppercase">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. organic-food"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full bg-[#122b1c] border border-[#20452d] rounded-xl p-2.5 outline-none text-white focus:border-[#a0f399]"
                  />
                </div>
              </div>

              {/* Status & Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#80a48b] mb-1 uppercase">
                    Category Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as CategoryStatus)}
                    className="w-full bg-[#122b1c] border border-[#20452d] rounded-xl p-2.5 outline-none text-white"
                  >
                    <option value="ACTIVE">ACTIVE (Visible in Storefront & Seller Portal)</option>
                    <option value="INACTIVE">INACTIVE (Hidden from Customers & Sellers)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#80a48b] mb-1 uppercase">
                    Display Order (1-99)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#122b1c] border border-[#20452d] rounded-xl p-2.5 outline-none text-white"
                  />
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block font-bold text-[#80a48b] mb-1.5 uppercase">
                  Category Icon: <span className="text-[#a0f399] font-mono">{formIcon}</span>
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-7 gap-2 bg-[#122b1c] p-2.5 rounded-2xl border border-[#20452d]">
                  {POPULAR_ICONS.map((ic) => (
                    <button
                      key={ic.name}
                      type="button"
                      onClick={() => setFormIcon(ic.name)}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                        formIcon === ic.name
                          ? 'bg-[#1b6d24] text-white ring-2 ring-[#a0f399]'
                          : 'text-[#80a48b] hover:bg-[#183a24] hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">{ic.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block font-bold text-[#80a48b] mb-1 uppercase">
                  Header / Banner Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full bg-[#122b1c] border border-[#20452d] rounded-xl p-2.5 outline-none text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-[#80a48b] mb-1 uppercase">
                  Category Description & Eco Standards
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the materials, districts, and sustainable requirements for this craft category..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#122b1c] border border-[#20452d] rounded-xl p-2.5 outline-none text-white"
                />
              </div>

              {/* Subcategories Builder */}
              <div className="space-y-2 pt-2 border-t border-[#1b482b]">
                <label className="block font-bold text-[#a0f399] uppercase">
                  Subcategories Management ({formSubcategories.length})
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New subcategory name (e.g. Raw Honey & Sweeteners)"
                    value={newSubcatName}
                    onChange={(e) => setNewSubcatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategory();
                      }
                    }}
                    className="flex-1 bg-[#122b1c] border border-[#20452d] rounded-xl p-2 text-xs outline-none text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcategory}
                    className="px-4 py-2 bg-[#1b6d24] hover:bg-[#238a2f] text-white rounded-xl font-bold shrink-0"
                  >
                    + Add Sub
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {formSubcategories.map((sub, idx) => (
                    <div
                      key={sub.id || idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#122b1c] border border-[#1b4128]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#7ca087] font-mono">#{idx + 1}</span>
                        <span className="font-bold text-white">{sub.name}</span>
                        <span className="text-[10px] text-[#7ca087] font-mono">({sub.slug})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSubcategoryStatus(idx)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            sub.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-amber-950 text-amber-300'
                          }`}
                        >
                          {sub.status || 'ACTIVE'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategory(idx)}
                          className="text-red-400 hover:text-red-300 p-0.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#1b482b]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-[#122b1c] text-[#80a48b] hover:text-white rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-[#a0f399] hover:bg-[#8ee986] text-[#002204] font-extrabold rounded-xl shadow-md transition-all"
                >
                  {isLoading ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Warning Modal */}
      {deleteWarningCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e2417] text-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-900/60 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-950 text-red-400 flex items-center justify-center border border-red-800">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-heading">
                Delete Category: {deleteWarningCategory.name}
              </h3>
              <p className="text-xs text-[#a3c4ad] mt-1">
                {deleteWarningProductCount > 0
                  ? `Notice: This category currently has ${deleteWarningProductCount} associated products in the marketplace. To protect customer orders and inventory history, this category will be DEACTIVATED / ARCHIVED rather than permanently deleted.`
                  : 'This category has 0 active products and can be safely removed permanently.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1b482b]">
              <button
                type="button"
                onClick={() => setDeleteWarningCategory(null)}
                className="px-4 py-2 bg-[#122b1c] text-[#80a48b] hover:text-white rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteOrArchive}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
              >
                {deleteWarningProductCount > 0 ? 'Archive Category' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
