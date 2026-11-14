import React from 'react';
import { Store, Product, SellerPlan } from '../../types';
import {
  Store as StoreIcon,
  MapPin,
  Star,
  Package,
  ExternalLink,
  Edit3,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  AlertTriangle,
  PauseCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface SellerStoreProfileTabProps {
  store: Store | null;
  products: Product[];
  activePlan: SellerPlan | null;
  onEditSettings: () => void;
  onViewPublicStore: (storeId: string) => void;
}

export const SellerStoreProfileTab: React.FC<SellerStoreProfileTabProps> = ({
  store,
  products,
  activePlan,
  onEditSettings,
  onViewPublicStore,
}) => {
  const storeId = store?.id || '';
  const storeName = store?.name || 'Artisan Workshop';
  const logo = store?.logo;
  const banner = store?.banner;
  const description = store?.description;
  const tagline = store?.tagline;
  const district = store?.district || 'Bangladesh';
  const division = store?.division || '';
  const rating = store?.rating;
  const reviewsCount = store?.reviewsCount || 0;
  const status = store?.status || 'active';
  const statusMessage = store?.statusMessage;
  const category = store?.category;
  const activeProducts = products.filter((p) => p.status === 'eco_verified' || p.status === 'active');

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active & Accepting Orders
          </span>
        );
      case 'vacation':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
            <PauseCircle className="w-3.5 h-3.5" />
            Vacation Mode
          </span>
        );
      case 'temporarily_closed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Temporarily Closed
          </span>
        );
      case 'maintenance':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Under Maintenance
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* If store has no description or logo, show a helpful onboarding prompt */}
      {(!store || !store.description) && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-900 rounded-2xl shrink-0">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-stone-900 text-sm">Complete Your Artisan Brand Profile</h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Add your workshop story, district origin, logo, banner, and eco-dispatch policies to stand out to conscious buyers.
              </p>
            </div>
          </div>
          <button
            onClick={onEditSettings}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shrink-0"
          >
            Customize Profile
          </button>
        </div>
      )}

      {/* Store Cover Banner & Avatar Header */}
      <div className="relative bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        <div
          className="h-48 sm:h-64 w-full bg-cover bg-center relative bg-stone-100"
          style={{ backgroundImage: banner ? `url(${banner})` : undefined }}
        >
          {!banner && (
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900 to-stone-800 flex items-center justify-center">
              <p className="text-white/60 text-xs font-serif italic">Workshop Banner Not Uploaded</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {storeId && (
              <button
                onClick={() => onViewPublicStore(store?.slug || storeId)}
                className="px-4 py-2 bg-white/90 hover:bg-white text-stone-900 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 backdrop-blur-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Public Storefront
              </button>
            )}
            <button
              onClick={onEditSettings}
              className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Store Profile
            </button>
          </div>
        </div>

        {/* Store Identity Row */}
        <div className="p-6 sm:p-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5 -mt-16 sm:-mt-20 mb-6">
            {logo ? (
              <img
                src={logo}
                alt={storeName}
                referrerPolicy="no-referrer"
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white shadow-lg bg-white shrink-0"
              />
            ) : (
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-4 border-white shadow-lg bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                <StoreIcon className="w-10 h-10" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-stone-900 font-serif">{storeName}</h1>
                {store?.ecoVerified && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Artisan Workshop
                  </span>
                )}
                {category && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                    {category}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900">
                  {activePlan?.name || 'Professional Artisan'}
                </span>
              </div>

              {tagline && <p className="text-sm font-semibold text-emerald-800 mt-1">{tagline}</p>}

              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  {district}{division ? `, ${division}` : ''}, Bangladesh
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {rating && rating > 0 ? (
                    <>
                      <strong className="text-stone-900">{rating.toFixed(1)}</strong> ({reviewsCount} reviews)
                    </>
                  ) : (
                    <span className="text-stone-500">No reviews yet</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4 text-emerald-700" />
                  <strong className="text-stone-900">{products.length}</strong> Products Listed
                </span>
              </div>
            </div>
          </div>

          {/* Status Message Alert if Not Active */}
          {status !== 'active' && statusMessage && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <strong>Notice to buyers:</strong> {statusMessage}
            </div>
          )}

          {description ? (
            <p className="text-xs sm:text-sm text-stone-700 max-w-3xl leading-relaxed whitespace-pre-line">{description}</p>
          ) : (
            <p className="text-xs text-stone-400 italic">No store description added yet. Add one in store settings.</p>
          )}
        </div>
      </div>

      {/* Store Badges & Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Store Status</span>
          <div className="mt-1.5">{getStatusBadge()}</div>
          <span className="text-[10px] text-stone-500 block mt-1">
            {status === 'active' ? 'Visible across Bangladesh' : 'Custom status active'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Eco Audit Status</span>
          <div className="text-sm font-bold text-stone-900 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            {store?.ecoVerified ? 'Eco-Verified Certified' : 'Verification Under Review'}
          </div>
          <span className="text-[10px] text-emerald-800">
            {store?.ecoVerificationDate ? `Audited: ${store.ecoVerificationDate}` : 'Zero single-use plastic'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Dispatch Guarantee</span>
          <div className="text-sm font-bold text-stone-900 mt-1 font-mono">
            {store?.policies?.shipping ? 'Custom Eco Policy' : '24-48 Hours'}
          </div>
          <span className="text-[10px] text-stone-500 line-clamp-1">
            {store?.policies?.shipping || 'Plastic-Free Packaging'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Return Policy</span>
          <div className="text-sm font-bold text-stone-900 mt-1">
            {store?.policies?.returns ? 'Custom Terms' : '7 Days Easy Return'}
          </div>
          <span className="text-[10px] text-stone-500 line-clamp-1">
            {store?.policies?.returns || 'Steadfast & RedX Reverse'}
          </span>
        </div>
      </div>

      {/* Active Products In Storefront */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-stone-900 font-serif">
              Active Store Catalog ({activeProducts.length})
            </h3>
            <p className="text-xs text-stone-500">Catering to conscious buyers nationwide.</p>
          </div>
          <button
            onClick={() => onEditSettings()}
            className="text-xs font-bold text-emerald-800 hover:underline"
          >
            Customize Layout & Policies →
          </button>
        </div>

        {activeProducts.length === 0 ? (
          <p className="text-xs text-stone-500 py-6 text-center">No active eco-verified crafts yet in this store catalog.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeProducts.map((prod) => (
              <div
                key={prod.id}
                className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-2 hover:border-emerald-700 transition-all"
              >
                {prod.images && prod.images[0] && (
                  <img
                    src={prod.images[0]}
                    alt={prod.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-32 object-cover rounded-xl border border-stone-200"
                  />
                )}
                <div>
                  <h4 className="text-xs font-bold text-stone-900 line-clamp-1">{prod.title}</h4>
                  <p className="text-[10px] text-stone-500">{prod.district || district} • {prod.category}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                  <span className="font-mono font-bold text-xs text-emerald-800">৳{prod.price}</span>
                  <span className="text-[10px] text-stone-500 font-mono">Stock: {prod.stock}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
