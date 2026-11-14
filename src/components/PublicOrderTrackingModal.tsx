import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  Copy,
  Check,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Leaf,
} from 'lucide-react';
import { collection, getDocs, query as fsQuery, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PublicOrderTrackingModalProps {
  initialQuery?: string;
  onClose: () => void;
  onViewInvoice?: (orderId: string) => void;
}

export const PublicOrderTrackingModal: React.FC<PublicOrderTrackingModalProps> = ({
  initialQuery = '',
  onClose,
  onViewInvoice,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

    const fetchTracking = async (searchQuery: string) => {
    const clean = searchQuery.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);

    try {
      const upper = clean.toUpperCase();
      let matchedOrder: any = null;

      // 1. Search by orderNumber, trackingNumber, or phone in Firestore 'orders'
      const ordersRef = collection(db, 'orders');
      const snap = await getDocs(ordersRef);

      snap.forEach((docSnap) => {
        if (matchedOrder) return;
        const d = docSnap.data();
        const ordNum = String(d.orderNumber || docSnap.id).toUpperCase();
        const trkNum = String(d.trackingNumber || d.shipment?.trackingNumber || '').toUpperCase();
        const phone = String(d.shippingAddress?.phone || d.customerPhone || '');

        if (
          ordNum === upper ||
          docSnap.id.toUpperCase() === upper ||
          (trkNum && trkNum === upper) ||
          (clean.length >= 10 && phone.includes(clean))
        ) {
          matchedOrder = { id: docSnap.id, ...d };
        }
      });

      // 2. Also check 'sub_orders' if tracking code belongs to a sub-order
      if (!matchedOrder) {
        const subSnap = await getDocs(collection(db, 'sub_orders'));
        subSnap.forEach((docSnap) => {
          if (matchedOrder) return;
          const d = docSnap.data();
          const trkNum = String(d.trackingNumber || '').toUpperCase();
          const subNum = String(d.subOrderNumber || docSnap.id).toUpperCase();
          if (trkNum === upper || subNum === upper) {
            matchedOrder = {
              id: d.parentOrderId || docSnap.id,
              orderNumber: d.subOrderNumber || docSnap.id,
              trackingNumber: d.trackingNumber || upper,
              status: d.status || 'processing',
              courierName: d.courierName || 'Steadfast Eco-Courier',
              paymentStatus: d.paymentStatus || 'pending',
              paymentMethod: d.paymentMethod || 'COD',
              shippingAddress: d.shippingAddress,
              items: d.items || [],
              createdAt: d.createdAt,
            };
          }
        });
      }

      if (matchedOrder) {
        const createdTs =
          matchedOrder.createdAt?.toDate?.()?.toISOString?.() ||
          matchedOrder.createdAt ||
          new Date().toISOString();

        setTrackingData({
          orderId: matchedOrder.id,
          orderNumber: matchedOrder.orderNumber || matchedOrder.id,
          trackingNumber: matchedOrder.trackingNumber || `SUNNO-TRK-${String(matchedOrder.id).slice(0, 6).toUpperCase()}`,
          status: matchedOrder.status || 'confirmed',
          courierName: matchedOrder.courierName || 'Steadfast Eco-Courier',
          paymentStatus: matchedOrder.paymentStatus || 'pending',
          paymentMethod: matchedOrder.paymentMethod || 'COD',
          shippingAddress: matchedOrder.shippingAddress || null,
          items: matchedOrder.items || [],
          timeline: matchedOrder.timeline || [
            {
              stage: 'Order Confirmed & Verified',
              message: 'Eco-order verified and assigned to Bangladeshi artisan workshop.',
              location: 'SUNNO Central Hub, Dhaka',
              timestamp: createdTs,
            },
            {
              stage: 'Zero-Plastic Eco Packaging',
              message: 'Artisan preparing consignment with 100% biodegradable jute & paper wrap.',
              location: matchedOrder.shippingAddress?.district || 'Artisan District Hub',
              timestamp: new Date().toISOString(),
            },
          ],
        });
      } else {
        setError('No active order or shipment found for the provided code.');
        setTrackingData(null);
      }
    } catch (err: any) {
      setError('Unable to fetch tracking details right now. Please try again.');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (initialQuery.trim()) {
      fetchTracking(initialQuery);
    }
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(query);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#c1c9be]/60 my-6">
        {/* Header */}
        <div className="p-6 bg-[#002c11] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#4ade80]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-heading tracking-wider">SUNNO</span>
                <span className="text-[10px] bg-[#1b6d24] text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Live Dispatch Tracking
                </span>
              </div>
              <p className="text-xs text-[#c1c9be]">
                Real-Time Consignment & 64-District Artisan Delivery Status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-white/20 flex items-center justify-center text-[#c1c9be] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 bg-[#fbf9f8] border-b border-[#c1c9be]/40">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717970]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Order # (e.g. SUNNO-ORD-2026-...), Tracking #, or Phone"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#c1c9be] rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-[#1b6d24] font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Track
                </>
              )}
            </button>
          </form>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="block font-bold">Consignment Not Found</strong>
                <span>{error}</span>
                <p className="mt-1 text-[11px] text-amber-700">
                  Please confirm your order number or check your SMS/email notification for the exact tracking code.
                </p>
              </div>
            </div>
          )}

          {!trackingData && !error && !loading && (
            <div className="text-center py-10 space-y-3">
              <div className="w-16 h-16 bg-[#e8f5e9] text-[#1b6d24] rounded-full mx-auto flex items-center justify-center">
                <Package className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-[#002c11] text-base">Track Your Eco-Consignment</h4>
              <p className="text-xs text-[#717970] max-w-sm mx-auto leading-relaxed">
                Enter your order ID (formatted as <code className="font-mono font-bold text-[#002c11]">SUNNO-ORD-2026-XXXXXX</code>) or your courier tracking code to trace your package from the artisan’s rural workshop to your door.
              </p>
            </div>
          )}

          {trackingData && (
            <div className="space-y-6">
              {/* Top Overview Card */}
              <div className="bg-[#fbf9f8] p-5 rounded-2xl border border-[#c1c9be]/50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c1c9be]/40 pb-3">
                  <div>
                    <span className="text-[10px] text-[#717970] uppercase font-bold block">
                      Order Reference
                    </span>
                    <span className="font-mono font-black text-sm text-[#002c11]">
                      {trackingData.orderNumber || trackingData.orderId}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#717970] uppercase font-bold block">
                      Delivery Status
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {trackingData.status || 'Active'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#717970] uppercase font-bold block">Courier Partner</span>
                    <span className="font-bold text-[#002c11]">{trackingData.courierName || 'Steadfast Courier'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#717970] uppercase font-bold block">Tracking ID</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-[#1b6d24] truncate">
                        {trackingData.trackingNumber || 'TRK-BD-PENDING'}
                      </span>
                      {trackingData.trackingNumber && (
                        <button
                          onClick={() => copyToClipboard(trackingData.trackingNumber)}
                          className="text-[#717970] hover:text-[#002c11]"
                          title="Copy"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#717970] uppercase font-bold block">Payment Status</span>
                    <span className="font-bold uppercase text-[#002c11]">
                      {trackingData.paymentStatus} ({trackingData.paymentMethod || 'COD'})
                    </span>
                  </div>
                </div>

                {/* Recipient Destination */}
                {trackingData.shippingAddress && (
                  <div className="pt-2 border-t border-[#c1c9be]/30 flex items-start gap-2 text-xs text-[#414941]">
                    <MapPin className="w-4 h-4 text-[#1b6d24] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#002c11]">Destination: </span>
                      {trackingData.shippingAddress.streetAddress}, {trackingData.shippingAddress.area || ''}, {trackingData.shippingAddress.district} ({trackingData.shippingAddress.division})
                    </div>
                  </div>
                )}
              </div>

              {/* Live Timeline Stages */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#002c11] uppercase tracking-wider block">
                  Consignment Journey Stages
                </span>
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#c1c9be]/40">
                  {trackingData.timeline && trackingData.timeline.length > 0 ? (
                    trackingData.timeline.map((item: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div
                          className={`absolute -left-6 top-0 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                            idx === trackingData.timeline.length - 1
                              ? 'border-[#1b6d24] bg-[#1b6d24]'
                              : 'border-[#1b6d24]'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${idx === trackingData.timeline.length - 1 ? 'bg-white' : 'bg-[#1b6d24]'}`} />
                        </div>
                        <div className="text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#002c11]">{item.stage}</span>
                            <span className="text-[10px] text-[#717970] font-mono">
                              {new Date(item.timestamp).toLocaleString('en-US', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#414941] mt-0.5">{item.message}</p>
                          <span className="text-[10px] text-[#717970] font-medium block">
                            Hub: {item.location}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="relative">
                      <div className="absolute -left-6 top-0 w-4 h-4 rounded-full border-2 border-[#1b6d24] bg-[#1b6d24] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-[#002c11]">Order Received & Queued for Workshop Dispatch</span>
                        <p className="text-[11px] text-[#414941] mt-0.5">
                          Artisan workshop notified. Eco-friendly biodegradable packaging in progress.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items in Package */}
              {trackingData.items && trackingData.items.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#002c11] uppercase tracking-wider block">
                    Handcrafted Items in Shipment ({trackingData.items.length})
                  </span>
                  <div className="divide-y divide-[#c1c9be]/30 border border-[#c1c9be]/40 rounded-2xl overflow-hidden bg-white">
                    {trackingData.items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-[#002c11]">{item.title}</p>
                          <p className="text-[10px] text-[#717970]">
                            Seller: {item.sellerName || 'Artisan Workshop'} • Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-[#002c11]">
                          ৳{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Eco Carbon-Offset Guarantee */}
              <div className="p-4 bg-[#e8f5e9]/60 rounded-2xl border border-[#1b6d24]/20 flex items-center gap-3 text-xs text-[#1b6d24]">
                <Leaf className="w-5 h-5 shrink-0" />
                <span>
                  <strong>100% Carbon-Offset Delivery:</strong> SUNNO partners with rural logistics networks utilizing non-motorized and consolidated EV transit where available. Zero plastic tape or bubble wrap used.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#fbf9f8] border-t border-[#c1c9be]/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#717970] hover:bg-[#e7e8e7] rounded-xl transition-colors"
          >
            Close
          </button>
          {trackingData && onViewInvoice && (
            <button
              onClick={() => {
                onClose();
                onViewInvoice(trackingData.orderId);
              }}
              className="px-5 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              View Official Tax Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
