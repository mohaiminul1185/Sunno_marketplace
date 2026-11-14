import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Archive,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  X,
  Layers,
  MapPin,
  Tag,
  DollarSign,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import { Product, EcoStatus } from '../../types';
import {
  auditProductCatalogConsistency,
  checkProductOrderReferences,
  safeDeleteOrArchiveProduct,
  updateProductLifecycleStatus,
  syncCorrectedCatalogToFirestore,
  CatalogAuditReport,
  OrderReferenceCheck,
} from '../../services/productCatalogService';
import { SellerProductImageManager } from '../seller/SellerProductImageManager';
import { DEFAULT_PRODUCT_PLACEHOLDER } from '../../services/firebase/productService';
import { BANGLADESH_DIVISIONS, ALL_64_DISTRICTS } from '../../data/bangladeshDistricts';
import { BANGLADESH_60_ECO_PRODUCTS } from '../../data/bangladeshEcoProducts';
import { doc, setDoc } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { PRODUCTS_COL } from '../../services/dbService';

interface AdminProductsTabProps {
  products: Product[];
  onRefresh: () => Promise<void> | void;
  currentUserEmail?: string;
}

export const AdminProductsTab: React.FC<AdminProductsTabProps> = ({
  products,
  onRefresh,
  currentUserEmail = 'admin@sunno.eco',
}) => {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState<boolean>(false);

  // Audit state
  const [auditReport, setAuditReport] = useState<CatalogAuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [auditFeedback, setAuditFeedback] = useState<string | null>(null);
  const [showAuditBanner, setShowAuditBanner] = useState<boolean>(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deletionCheck, setDeletionCheck] = useState<OrderReferenceCheck | null>(null);
  const [isCheckingOrders, setIsCheckingOrders] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<Product>>({
    title: '',
    shortDescription: '',
    description: '',
    category: 'Handmade Crafts',
    subcategory: 'Bamboo & River Cane',
    price: 500,
    discount: 0,
    stock: 20,
    division: 'Dhaka Division',
    district: 'Dhaka',
    status: 'eco_verified',
    images: [],
    materialsUsed: '100% Biodegradable Artisan Materials',
    packagingType: 'Recycled brown kraft paper',
    weight: '500g',
    dimensions: '20 x 20 x 15 cm',
    sku: '',
  });

  // Run audit on products
  const runAudit = () => {
    setIsAuditing(true);
    try {
      const activeCatalog = products && products.length > 0 ? products : BANGLADESH_60_ECO_PRODUCTS;
      const report = auditProductCatalogConsistency(activeCatalog);
      setAuditReport(report);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, [products]);

  // Handle Syncing corrected images directly to Firestore
  const handleSyncCorrectedCatalog = async () => {
    setIsSyncing(true);
    setAuditFeedback(null);
    try {
      const result = await syncCorrectedCatalogToFirestore();
      setAuditFeedback(`Successfully updated ${result.count} verified products in live Firestore with 0 mismatches.`);
      if (onRefresh) await onRefresh();
      runAudit();
    } catch (err: any) {
      setAuditFeedback(`Failed to sync catalog: ${err.message || 'Check connection'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    const list = products && products.length > 0 ? products : BANGLADESH_60_ECO_PRODUCTS;
    const flaggedIds = new Set(auditReport?.items.map((i) => i.productId) || []);

    return list.filter((p) => {
      if (showFlaggedOnly && !flaggedIds.has(p.id)) {
        return false;
      }
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== 'all' && (p.status || 'published') !== selectedStatus) {
        return false;
      }
      if (selectedDivision !== 'all' && p.division !== selectedDivision) {
        return false;
      }
      if (selectedDistrict !== 'all' && p.district !== selectedDistrict) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesSku = (p.sku || '').toLowerCase().includes(query);
        const matchesDistrict = (p.district || '').toLowerCase().includes(query);
        const matchesCategory = (p.category || '').toLowerCase().includes(query);
        return matchesTitle || matchesSku || matchesDistrict || matchesCategory;
      }
      return true;
    });
  }, [
    products,
    showFlaggedOnly,
    auditReport,
    selectedCategory,
    selectedStatus,
    selectedDivision,
    selectedDistrict,
    searchQuery,
  ]);

  // Open Edit Modal
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      images: Array.isArray(product.images) && product.images.length > 0 ? [...product.images] : [],
    });
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    const generatedId = `sun-prod-${Date.now().toString().slice(-6)}`;
    setEditingProduct(null);
    setFormData({
      id: generatedId,
      sku: `SUN-NEW-${Math.floor(100 + Math.random() * 900)}`,
      title: '',
      shortDescription: '',
      description: '',
      category: 'Handmade Crafts',
      subcategory: 'Bamboo & River Cane',
      price: 650,
      discount: 0,
      stock: 25,
      division: 'Dhaka Division',
      district: 'Dhaka',
      status: 'approved',
      images: [],
      materialsUsed: '100% Biodegradable Artisan Materials',
      packagingType: 'Recycled kraft paper',
      weight: '450g',
      dimensions: '25 x 20 x 10 cm',
      sellerId: 'seller-green-harvest-01',
      sellerName: 'SUNNO Heritage Goods',
      isHandmade: true,
      isBiodegradable: true,
      isPlasticFree: true,
    });
    setIsAddModalOpen(true);
  };

  // Handle Save (Add / Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      setActionFeedback({ message: 'Product title is required.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const prodId = editingProduct ? editingProduct.id : formData.id || `sun-prod-${Date.now()}`;
      const finalImages =
        Array.isArray(formData.images) && formData.images.length > 0
          ? formData.images
          : [DEFAULT_PRODUCT_PLACEHOLDER];

      const productPayload: Product = {
        ...(editingProduct || {}),
        ...formData,
        id: prodId,
        title: formData.title.trim(),
        price: Number(formData.price) || 0,
        discount: Number(formData.discount) || 0,
        stock: Number(formData.stock) || 0,
        images: finalImages,
        updatedAt: new Date().toISOString(),
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
      } as Product;

      const prodRef = doc(db, PRODUCTS_COL, prodId);
      await setDoc(prodRef, sanitizeForFirestore(productPayload), { merge: true });

      setActionFeedback({
        message: editingProduct
          ? `Product "${formData.title}" updated successfully.`
          : `New product "${formData.title}" created successfully.`,
        type: 'success',
      });

      setIsAddModalOpen(false);
      setEditingProduct(null);
      if (onRefresh) await onRefresh();
      runAudit();
    } catch (err: any) {
      setActionFeedback({ message: err.message || 'Failed to save product in database', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete / Archive Modal
  const handleInitiateDelete = async (product: Product) => {
    setDeletingProduct(product);
    setDeleteReason('');
    setIsCheckingOrders(true);
    try {
      const check = await checkProductOrderReferences(product.id);
      setDeletionCheck(check);
    } catch {
      setDeletionCheck({ hasOrders: false, orderCount: 0, recentOrderNumbers: [] });
    } finally {
      setIsCheckingOrders(false);
    }
  };

  // Confirm Delete / Archive
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsSubmitting(true);
    try {
      const res = await safeDeleteOrArchiveProduct(deletingProduct.id, currentUserEmail, {
        reason: deleteReason,
      });

      setActionFeedback({ message: res.message, type: 'success' });
      setDeletingProduct(null);
      setDeletionCheck(null);
      if (onRefresh) await onRefresh();
      runAudit();
    } catch (err: any) {
      setActionFeedback({ message: err.message || 'Failed to complete deletion/archival', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Toggle
  const handleQuickStatusChange = async (productId: string, newStatus: EcoStatus) => {
    try {
      await updateProductLifecycleStatus(productId, newStatus, currentUserEmail);
      setActionFeedback({ message: `Status updated to ${newStatus}`, type: 'success' });
      if (onRefresh) await onRefresh();
      runAudit();
    } catch (err: any) {
      setActionFeedback({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  // Available districts based on division
  const availableDistricts = useMemo(() => {
    if (selectedDivision === 'all') {
      return ALL_64_DISTRICTS.map((d) => d.name);
    }
    const cleanDiv = selectedDivision.toLowerCase().replace(' division', '').trim();
    return ALL_64_DISTRICTS.filter(
      (d) => d.division.toLowerCase() === cleanDiv || d.division.toLowerCase() === selectedDivision.toLowerCase()
    ).map((d) => d.name);
  }, [selectedDivision]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-stone-400 hover:text-stone-700 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Catalog Image Integrity & Mismatch Audit Banner */}
      {showAuditBanner && auditReport && (
        <div className="bg-gradient-to-br from-[#f8faf7] via-white to-[#edf5ec] border border-[#c1c9be]/60 rounded-3xl p-5 shadow-xs transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c1c9be]/30 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#002c11] text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#002c11] font-heading flex items-center gap-2">
                  Catalog Integrity & Image Verification System
                  {auditReport.flaggedCount === 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      100% Clean
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                      {auditReport.flaggedCount} Mismatches Found
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-[#717970]">
                  Verifies that all product images match their artisan lineage, material specs, and district craft origins.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncCorrectedCatalog}
                disabled={isSyncing}
                className="px-4 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing Catalog...' : 'Sync & Fix Mismatches in Firestore'}
              </button>
              <button
                type="button"
                onClick={() => setShowAuditBanner(false)}
                className="p-2 text-[#717970] hover:text-[#002c11] rounded-xl hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Audit Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
            <div className="bg-white p-3 rounded-2xl border border-[#c1c9be]/40">
              <span className="text-[#717970] text-[10px] uppercase font-bold block">Total Audited</span>
              <span className="text-lg font-mono font-extrabold text-[#002c11]">{auditReport.totalAudited} Products</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-emerald-200">
              <span className="text-emerald-700 text-[10px] uppercase font-bold block">Healthy & Verified</span>
              <span className="text-lg font-mono font-extrabold text-emerald-700">{auditReport.healthyCount}</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-amber-200">
              <span className="text-amber-800 text-[10px] uppercase font-bold block">Duplicate Images</span>
              <span className="text-lg font-mono font-extrabold text-amber-800">{auditReport.duplicateImagesCount}</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-rose-200">
              <span className="text-rose-800 text-[10px] uppercase font-bold block">Missing Primary Image</span>
              <span className="text-lg font-mono font-extrabold text-rose-800">{auditReport.missingImagesCount}</span>
            </div>
          </div>

          {/* Feedback message */}
          {auditFeedback && (
            <div className="p-3 bg-white rounded-xl border border-emerald-300 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{auditFeedback}</span>
            </div>
          )}

          {/* Quick toggle if mismatches present */}
          {auditReport.flaggedCount > 0 && (
            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-[#717970]">
                {auditReport.flaggedCount} item(s) require review (e.g. reused image URLs or generic placeholders).
              </span>
              <button
                type="button"
                onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors ${
                  showFlaggedOnly
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
              >
                {showFlaggedOnly ? 'Show All Products' : 'Filter Flagged Items Only'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Control Bar: Search, Filters, and Add Product */}
      <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/50 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[#717970] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product title, SKU, or district..."
              className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#002c11] outline-none focus:ring-2 focus:ring-[#1b6d24]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={runAudit}
              disabled={isAuditing}
              className="px-3.5 py-2.5 bg-[#fbf9f8] hover:bg-[#edf5ec] text-[#002c11] border border-[#c1c9be]/60 text-xs font-bold rounded-2xl transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              Audit Catalog
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#c1c9be]/20 text-xs">
          <div className="flex items-center gap-1 text-[#717970] text-[11px] font-bold mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#fbf9f8] border border-[#c1c9be]/60 text-[#002c11] text-[11px] rounded-xl px-2.5 py-1.5 outline-none font-medium"
          >
            <option value="all">All Categories (4)</option>
            <option value="Organic Food">Organic Food</option>
            <option value="Handmade Crafts">Handmade Crafts</option>
            <option value="Sustainable Fashion">Sustainable Fashion</option>
            <option value="Eco-Home">Eco-Home</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#fbf9f8] border border-[#c1c9be]/60 text-[#002c11] text-[11px] rounded-xl px-2.5 py-1.5 outline-none font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="eco_verified">Eco-Verified</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending Review</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>

          {/* Division Dropdown */}
          <select
            value={selectedDivision}
            onChange={(e) => {
              setSelectedDivision(e.target.value);
              setSelectedDistrict('all');
            }}
            className="bg-[#fbf9f8] border border-[#c1c9be]/60 text-[#002c11] text-[11px] rounded-xl px-2.5 py-1.5 outline-none font-medium"
          >
            <option value="all">All 8 Divisions</option>
            {BANGLADESH_DIVISIONS.map((div) => (
              <option key={div.id} value={div.name}>
                {div.name} Division
              </option>
            ))}
          </select>

          {/* District Dropdown */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-[#fbf9f8] border border-[#c1c9be]/60 text-[#002c11] text-[11px] rounded-xl px-2.5 py-1.5 outline-none font-medium"
          >
            <option value="all">All 64 Districts</option>
            {availableDistricts.map((dst) => (
              <option key={dst} value={dst}>
                {dst}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {(selectedCategory !== 'all' ||
            selectedStatus !== 'all' ||
            selectedDivision !== 'all' ||
            selectedDistrict !== 'all' ||
            searchQuery ||
            showFlaggedOnly) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedStatus('all');
                setSelectedDivision('all');
                setSelectedDistrict('all');
                setSearchQuery('');
                setShowFlaggedOnly(false);
              }}
              className="text-[#1b6d24] hover:underline text-[11px] font-bold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Product Catalog Count */}
      <div className="flex items-center justify-between text-xs text-[#717970] px-1">
        <span>
          Showing <strong>{filteredProducts.length}</strong> of{' '}
          {products?.length || BANGLADESH_60_ECO_PRODUCTS.length} total products
        </span>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-[#c1c9be]/50 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#fbf9f8] border-b border-[#c1c9be]/40 text-[#717970] text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Product</th>
                <th className="py-3.5 px-4 font-bold">Category & Origin</th>
                <th className="py-3.5 px-4 font-bold text-right">Price</th>
                <th className="py-3.5 px-4 font-bold text-center">Stock</th>
                <th className="py-3.5 px-4 font-bold text-center">Status</th>
                <th className="py-3.5 px-4 font-bold text-center">Eco Badge</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c1c9be]/20">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#717970]">
                    <Package className="w-8 h-8 text-[#c1c9be] mx-auto mb-2" />
                    <p className="font-bold text-stone-700">No products match your filter criteria.</p>
                    <p className="text-[11px]">Try adjusting your search keywords or resetting filters.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const primaryImg = p.images?.[0] || DEFAULT_PRODUCT_PLACEHOLDER;
                  const isFlagged = auditReport?.items.some((i) => i.productId === p.id);
                  const isArchived = p.status === 'archived' || p.isArchived;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#fbf9f8] transition-colors ${
                        isArchived ? 'opacity-60 bg-stone-50/70' : ''
                      }`}
                    >
                      {/* Product Thumbnail & Title */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl border border-[#c1c9be]/60 overflow-hidden shrink-0 bg-[#f4efe6] relative">
                            <img
                              src={primaryImg}
                              alt={p.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = DEFAULT_PRODUCT_PLACEHOLDER;
                              }}
                            />
                            {isFlagged && (
                              <div
                                title="Image flagged for mismatch"
                                className="absolute top-0 right-0 w-3.5 h-3.5 bg-amber-500 rounded-bl-md flex items-center justify-center text-white text-[8px]"
                              >
                                !
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-[#002c11] block truncate" title={p.title}>
                              {p.title}
                            </span>
                            <span className="text-[11px] text-[#717970] font-mono block">
                              {p.sku || p.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category & Origin */}
                      <td className="py-3.5 px-4">
                        <span className="text-stone-800 font-semibold block">{p.category}</span>
                        <span className="text-[11px] text-[#717970] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#1b6d24] shrink-0" />
                          {p.district || 'Dhaka'}, {p.division || 'Bangladesh'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-[#002c11] block">
                          ৳{p.price}
                        </span>
                        {p.discount ? (
                          <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 rounded-md">
                            -{p.discount}%
                          </span>
                        ) : null}
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full inline-block ${
                            (p.stock ?? 0) <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : (p.stock ?? 0) <= 5
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {p.stock ?? 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            p.status === 'eco_verified' || p.status === 'approved' || p.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'draft'
                              ? 'bg-stone-200 text-stone-700'
                              : p.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : p.status === 'archived'
                              ? 'bg-stone-300 text-stone-800 line-through'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status || 'published'}
                        </span>
                      </td>

                      {/* Eco Verification */}
                      <td className="py-3.5 px-4 text-center">
                        {p.status === 'eco_verified' || p.ecoVerified ? (
                          <span
                            title="100% Eco-Verified Artisan Craft"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#717970] italic">Standard</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product Details & Images"
                            className="p-1.5 text-stone-600 hover:text-[#002c11] hover:bg-stone-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Quick Toggle Status */}
                          {p.status === 'approved' || p.status === 'eco_verified' ? (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(p.id, 'draft')}
                              title="Unpublish to Draft"
                              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold rounded-lg transition-colors"
                            >
                              Unpublish
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(p.id, 'eco_verified')}
                              title="Approve & Publish to Storefront"
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg transition-colors"
                            >
                              Publish
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleInitiateDelete(p)}
                            title="Safe Delete or Archive"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PRODUCT */}
      {/* ========================================================================= */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fbf9f8] border border-stone-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingProduct(null);
              }}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1b6d24] block">
                {editingProduct ? 'Edit Catalog Item' : 'New Artisan Product'}
              </span>
              <h2 className="text-xl font-extrabold text-[#002c11] font-heading">
                {editingProduct ? `Edit: ${editingProduct.title}` : 'Add New Artisan Product'}
              </h2>
              <p className="text-xs text-[#717970] mt-1">
                Upload genuine product imagery and define sustainable material specifications.
              </p>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5 text-xs text-stone-900">
              {/* Product Title */}
              <div>
                <label className="block font-bold text-stone-900 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Rajshahi Terracotta Flower Vase"
                  className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                />
              </div>

              {/* Category, Subcategory, Division, District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-900 mb-1">Category *</label>
                  <select
                    value={formData.category || 'Handmade Crafts'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white text-stone-900 font-medium border border-stone-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  >
                    <option value="Organic Food">Organic Food</option>
                    <option value="Handmade Crafts">Handmade Crafts</option>
                    <option value="Sustainable Fashion">Sustainable Fashion</option>
                    <option value="Eco-Home">Eco-Home</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-900 mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={formData.subcategory || ''}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    placeholder="e.g. Bamboo & River Cane"
                    className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-900 mb-1">Division *</label>
                  <select
                    value={formData.division || 'Dhaka Division'}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                    className="w-full bg-white text-stone-900 font-medium border border-stone-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  >
                    {BANGLADESH_DIVISIONS.map((div) => (
                      <option key={div.id} value={`${div.name} Division`}>
                        {div.name} Division
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-900 mb-1">District *</label>
                  <input
                    type="text"
                    value={formData.district || ''}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="e.g. Rajshahi, Tangail, Bogura"
                    className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  />
                </div>
              </div>

              {/* Price, Discount, Stock, SKU */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-stone-900 mb-1">Price (৳) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.price ?? 500}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-900 mb-1">Discount %</label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={formData.discount ?? 0}
                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                    className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-900 mb-1">Available Stock *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.stock ?? 20}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-900 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SUN-CRF-001"
                    className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-mono font-medium border border-stone-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  />
                </div>
              </div>

              {/* Status & Verification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-900 mb-1">Publication Status</label>
                  <select
                    value={formData.status || 'eco_verified'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as EcoStatus })}
                    className="w-full bg-white text-stone-900 font-medium border border-stone-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  >
                    <option value="eco_verified">Eco-Verified (Published)</option>
                    <option value="approved">Approved</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="pending">Pending Review</option>
                    <option value="rejected">Rejected</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-900 mb-1">Seller / Workshop</label>
                  <input
                    type="text"
                    value={formData.sellerName || 'SUNNO Heritage Goods'}
                    onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                    className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  />
                </div>
              </div>

              {/* Image Manager: Real Upload & Reorder */}
              <div className="border border-stone-300 rounded-2xl p-4 bg-white space-y-2">
                <span className="font-bold text-stone-900 block">
                  Product Images & Gallery (First image is Primary)
                </span>
                <p className="text-[11px] text-[#717970]">
                  Upload real photo files or paste verified image URLs. Ensure 1:1 square aspect ratio for optimal marketplace presentation.
                </p>
                <SellerProductImageManager
                  images={Array.isArray(formData.images) ? formData.images : []}
                  onChange={(imgs) => setFormData({ ...formData, images: imgs })}
                  productId={formData.id || `prod-${Date.now()}`}
                />
              </div>

              {/* Short & Full Descriptions */}
              <div>
                <label className="block font-bold text-stone-900 mb-1">Short Description</label>
                <input
                  type="text"
                  value={formData.shortDescription || ''}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="One sentence summary for product cards and search results..."
                  className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-900 mb-1">Full Artisan Description</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Full background on heritage craftsmanship, curing process, and community impact..."
                  className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                />
              </div>

              {/* Material & Eco Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-900 mb-1">Materials Used</label>
                  <input
                    type="text"
                    value={formData.materialsUsed || ''}
                    onChange={(e) => setFormData({ ...formData, materialsUsed: e.target.value })}
                    placeholder="e.g. 100% Seasoned Padma River Clay"
                    className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-900 mb-1">Packaging Type</label>
                  <input
                    type="text"
                    value={formData.packagingType || ''}
                    onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                    placeholder="e.g. Recycled corrugated box with shredded kraft"
                    className="w-full bg-white text-stone-900 placeholder:text-stone-400 font-medium border border-stone-300 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-[#1b6d24] focus:border-[#1b6d24]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving Product...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {editingProduct ? 'Save Changes' : 'Create Product'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAFE DELETE / ARCHIVE CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-[#002c11] font-heading">
              Remove Product: {deletingProduct.title}
            </h3>
            <p className="text-xs text-[#717970] mt-1">
              Product ID: <code className="font-mono">{deletingProduct.id}</code>
            </p>

            {isCheckingOrders ? (
              <div className="py-6 text-center text-xs text-[#717970]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1b6d24]" />
                Verifying order history and invoice references...
              </div>
            ) : deletionCheck?.hasOrders ? (
              <div className="my-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
                <span className="font-bold text-amber-900 block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  Referenced in {deletionCheck.orderCount} Order(s)
                </span>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  To protect accounting audit integrity and customer purchase snapshots, this product will be{' '}
                  <strong>Archived (Soft Deleted)</strong> instead of permanently destroyed. It will disappear from the public store catalog while preserving existing orders.
                </p>
                {deletionCheck.recentOrderNumbers.length > 0 && (
                  <div className="text-[10px] text-amber-900 pt-1">
                    Recent orders: {deletionCheck.recentOrderNumbers.join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="my-4 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-600">
                This product is not referenced in any existing orders and can be safely deleted or archived.
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Reason for Removal / Archival
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Discontinued harvest, seasonal out-of-stock..."
                className="w-full bg-[#fbf9f8] text-stone-900 placeholder:text-stone-400 font-medium border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingProduct(null);
                  setDeletionCheck(null);
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting || isCheckingOrders}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  'Processing...'
                ) : deletionCheck?.hasOrders ? (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    Archive Safely
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
