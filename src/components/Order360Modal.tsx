import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Store,
  MessageSquare,
  ShieldCheck,
  LifeBuoy,
  FileText,
  RotateCcw,
  Copy,
  Check,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Calendar,
  CreditCard,
  Sparkles,
  Phone,
  Tag,
  ArrowUpRight,
  CheckCheck,
  BadgeCheck,
  Leaf,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { Order, SubOrder, OrderItem, OrderStatus, Shipment } from '../types';
import { BRAND_LOGO } from '../data/mockData';
import { fetchSubOrdersForParent } from '../services/checkoutService';
import {
  fetchShipmentByTrackingNumber,
  fetchShipmentsBySubOrder,
  getOfficialInvoiceForOrder,
  generateInvoiceFromOrder,
} from '../services/courierService';
import { executeOrderCancellation } from '../services/orderCancellationService';
import { TrackingModal } from './TrackingModal';
import { InvoiceModal } from './InvoiceModal';
import { DirectChatModal } from './DirectChatModal';
import { SupportTicketModal } from './SupportTicketModal';
import { ReturnRequestModal } from './ReturnRequestModal';
import { ProductReviewModal } from './ProductReviewModal';

interface Order360ModalProps {
  order: Order;
  onClose: () => void;
  viewerRole?: 'customer' | 'seller' | 'admin';
  currentSellerId?: string;
  onBuyAgain?: (items: OrderItem[]) => void;
  onOpenChat?: (target: {
    sellerId: string;
    sellerName: string;
    storeName?: string;
    productId?: string;
    productTitle?: string;
    productImage?: string;
    orderId?: string;
    orderNumber?: string;
  }) => void;
  onOpenTracking?: (order: Order, subOrder?: SubOrder) => void;
  onOpenInvoice?: (order: Order) => void;
  onOpenSupportTicket?: (order: Order) => void;
  onOpenReview?: (item: OrderItem, order: Order) => void;
  onOpenReturn?: (order: Order, productId?: string) => void;
  onUpdateStatus?: (newStatus: OrderStatus, notes?: string) => Promise<void>;
}

export const Order360Modal: React.FC<Order360ModalProps> = ({
  order: initialOrder,
  onClose,
  viewerRole = 'customer',
  currentSellerId,
  onBuyAgain,
  onOpenChat,
  onOpenTracking,
  onOpenInvoice,
  onOpenSupportTicket,
  onOpenReview,
  onOpenReturn,
  onUpdateStatus,
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [subOrders, setSubOrders] = useState<SubOrder[]>(initialOrder.subOrders || []);
  const [isLoadingSubOrders, setIsLoadingSubOrders] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sub-modal triggers
  const [activeTrackingShipment, setActiveTrackingShipment] = useState<Shipment | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<any | null>(null);
  const [returnItem, setReturnItem] = useState<{ productId?: string } | null>(null);
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedStatusOverride, setSelectedStatusOverride] = useState<string>(
    order.status || order.orderStatus || 'confirmed'
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load sub-orders if not already embedded
  useEffect(() => {
    if ((!order.subOrders || order.subOrders.length === 0) && order.id) {
      setIsLoadingSubOrders(true);
      fetchSubOrdersForParent(order.id)
        .then((subs) => {
          if (subs && subs.length > 0) {
            setSubOrders(subs);
          }
        })
        .catch((e) => console.warn('Could not fetch sub-orders for Order 360:', e))
        .finally(() => setIsLoadingSubOrders(false));
    }
  }, [order.id]);

  const handleCopyOrderId = () => {
    const idToCopy = order.orderNumber || order.id;
    navigator.clipboard.writeText(idToCopy);
    setCopiedOrderId(true);
    showToast(`Order ID "${idToCopy}" copied to clipboard.`);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(true);
    showToast(`Tracking Code "${code}" copied to clipboard.`);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // Open Courier Tracking
  const handleLaunchTracking = async (subOrder?: SubOrder) => {
    if (onOpenTracking) {
      onOpenTracking(order, subOrder);
      return;
    }

    const trkCode = subOrder?.trackingCode || order.trackingCode || order.courierTracking || order.trackingNumber;

    try {
      if (trkCode) {
        const found = await fetchShipmentByTrackingNumber(trkCode);
        if (found) {
          setActiveTrackingShipment(found);
          return;
        }
      }

      if (subOrder?.id) {
        const subs = await fetchShipmentsBySubOrder(subOrder.id);
        if (subs && subs.length > 0) {
          setActiveTrackingShipment(subs[0]);
          return;
        }
      }

      // Construct fallback shipment
      const sellerName = subOrder?.sellerName || order.items[0]?.sellerName || 'SUNNO Artisan Guild';
      const fallbackShipment: Shipment = {
        id: `ship-${order.id}`,
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        subOrderId: subOrder?.id || `sub-${order.id}-1`,
        sellerId: subOrder?.sellerId || order.sellerIds?.[0] || 'artisan',
        sellerName,
        customerId: order.customerId || order.userId || 'customer',
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        courierId: 'sunno_eco',
        courierName: order.courierName || 'Steadfast Courier / SUNNO Eco-Dispatch',
        trackingNumber: trkCode || `SUNNO-TRK-2026-${order.id.slice(-6).toUpperCase()}`,
        trackingUrl: `https://sunno.app/track/${order.id}`,
        serviceType: order.deliveryMethod === 'express' ? 'express' : 'standard',
        packageInfo: {
          weight: 1.2,
          itemCount: order.items?.reduce((acc, it) => acc + it.quantity, 0) || 1,
          ecoPackagingType: 'JUTE_BAG',
          isFragile: false,
        },
        status: (order.status === 'delivered' ? 'DELIVERED' : order.status === 'shipped' ? 'IN_TRANSIT' : 'READY_FOR_SHIPMENT') as any,
        statusLogs: [
          {
            status: 'READY_FOR_SHIPMENT',
            title: 'Artisan Workshop Dispatched',
            description: 'Packaged in 100% biodegradable zero-plastic eco packaging',
            location: `${order.shippingAddress?.district || 'Dhaka'} Artisan Workshop`,
            timestamp: order.createdAt,
            updatedBy: 'Artisan Workshop Dispatcher',
          },
          {
            status: 'IN_TRANSIT',
            title: 'In Transit with Courier Logistics',
            description: 'Moving through logistics network towards destination hub',
            location: `${order.shippingAddress?.district || 'Dhaka'} Sorting Hub`,
            timestamp: new Date().toISOString(),
            updatedBy: order.courierName || 'SUNNO Eco Logistics',
          },
        ],
        codAmount: order.paymentMethod === 'cod' ? (order.finalTotal || order.total) : 0,
        collectionStatus: order.paymentMethod === 'cod' ? 'pending' : 'remitted',
        deliveryFee: order.deliveryFee || order.shippingFee || 60,
        pickupAddress: {
          fullName: sellerName,
          phone: '+880 1700-000000',
          division: order.shippingAddress?.division || 'Dhaka',
          district: order.shippingAddress?.district || 'Dhaka',
          streetAddress: 'Artisan Craft Village, Savar',
        },
        deliveryAddress: order.shippingAddress || {
          id: `addr-${order.id}`,
          fullName: order.customerName,
          phone: order.customerPhone,
          streetAddress: order.customerAddress || 'Customer Address',
          district: order.district || 'Dhaka',
          division: order.division || 'Dhaka',
        },
        createdAt: order.createdAt,
        updatedAt: new Date().toISOString(),
      };
      setActiveTrackingShipment(fallbackShipment);
    } catch (err) {
      console.warn('Tracking modal opening fallback:', err);
    }
  };

  // Open Official Tax Invoice
  const handleLaunchInvoice = async () => {
    if (onOpenInvoice) {
      onOpenInvoice(order);
      return;
    }
    try {
      const inv = await getOfficialInvoiceForOrder(order.id);
      if (inv) {
        setActiveInvoice(inv);
        return;
      }
    } catch (e) {
      console.warn('Failed to load invoice from backend, generating live invoice:', e);
    }
    setActiveInvoice(generateInvoiceFromOrder(order));
  };

  // Chat with Artisan
  const handleLaunchChat = (targetSellerId: string, targetSellerName: string, item?: OrderItem) => {
    const payload = {
      sellerId: targetSellerId,
      sellerName: targetSellerName,
      storeName: targetSellerName,
      productId: item?.productId,
      productTitle: item?.title,
      productImage: item?.image,
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
    };
    if (onOpenChat) {
      onOpenChat(payload);
    } else {
      setChatTarget(payload);
    }
  };

  // Buy Again
  const handleBuyAgainClick = () => {
    if (onBuyAgain) {
      onBuyAgain(order.items);
      showToast('All items added back to your cart!');
    } else {
      showToast('Items re-ordered to cart!');
    }
  };

  // Status mapping for visual lifecycle
  const currentStatus = (order.status || order.orderStatus || 'confirmed').toLowerCase();
  const stages = [
    {
      key: 'confirmed',
      title: 'Order Confirmed',
      desc: 'Validated & logged in SUNNO 360',
      icon: CheckCircle2,
    },
    {
      key: 'processing',
      title: 'Artisan Packaging',
      desc: 'Zero-plastic eco wrap & QC inspection',
      icon: Package,
    },
    {
      key: 'shipped',
      title: 'Courier In Transit',
      desc: `${order.courierName || 'Steadfast / Pathao Logistics'} #${order.trackingCode?.slice(-8) || order.id.slice(-6)}`,
      icon: Truck,
    },
    {
      key: 'out_for_delivery',
      title: 'Out for Delivery',
      desc: 'Assigned to doorstep delivery rider',
      icon: MapPin,
    },
    {
      key: 'delivered',
      title: 'Delivered & Fulfilled',
      desc: 'Handover complete & receipt verified',
      icon: BadgeCheck,
    },
  ];

  const getStageIndex = (st: string) => {
    if (st === 'delivered') return 4;
    if (st === 'out_for_delivery') return 3;
    if (st === 'shipped' || st === 'in_transit' || st === 'ready_for_shipment') return 2;
    if (st === 'processing') return 1;
    return 0; // pending / confirmed
  };

  const activeStageIdx = getStageIndex(currentStatus);
  const isCancelled = currentStatus === 'cancelled';
  const isReturnFlow = currentStatus.includes('return') || currentStatus === 'refunded';

  // Format order dates
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(order.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="sunno-order-360-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Toast alert inside modal */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-60 bg-[#002c11] text-[#a0f399] px-4 py-2.5 rounded-2xl shadow-2xl border border-[#1b6d24] text-xs font-bold flex items-center gap-2 animate-slideDown">
          <Sparkles className="w-4 h-4 text-[#a0f399]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#c1c9be]/60">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#002c11] via-[#053d19] to-[#0a4d22] text-white flex items-center justify-between border-b border-[#1b6d24]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5 shrink-0 backdrop-blur-sm shadow-inner">
              <img src={BRAND_LOGO} alt="SUNNO" className="w-full h-full object-contain filter brightness-110" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#a0f399] text-[#002c11] px-2.5 py-0.5 rounded-full font-mono">
                  SUNNO ORDER 360
                </span>
                <span className="text-xs text-[#a0f399] font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Marketplace Dispatch
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-lg sm:text-xl font-extrabold font-mono tracking-tight text-white">
                  {order.orderNumber || order.id}
                </h3>
                <button
                  onClick={handleCopyOrderId}
                  title="Copy Order ID"
                  className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  {copiedOrderId ? <Check className="w-4 h-4 text-[#a0f399]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-white/70 mt-0.5">
                Placed on {formattedDate} at {formattedTime} • BDT Currency
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              title="Close Modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STATUS & PAYMENT SUMMARY BAR */}
        <div className="bg-[#f4f7f4] px-5 sm:px-6 py-3 border-b border-[#c1c9be]/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Pill */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#717970] font-semibold">Order Status:</span>
              <span
                className={`px-3 py-1 rounded-full font-bold uppercase text-[11px] tracking-wider border shadow-xs flex items-center gap-1 ${
                  isCancelled
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : currentStatus === 'delivered'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : currentStatus === 'shipped' || currentStatus === 'out_for_delivery'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : currentStatus === 'processing'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                {order.status || order.orderStatus || 'Confirmed'}
              </span>
            </div>

            {/* Payment Method Pill */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#717970] font-semibold">Payment:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] border ${
                  order.paymentStatus === 'paid' || order.paymentStatus === 'SUCCESS'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : order.paymentMethod === 'cod'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                {order.paymentMethod?.toUpperCase()} •{' '}
                {order.paymentStatus === 'paid' || order.paymentStatus === 'SUCCESS' ? 'PAID' : 'COD (PENDING)'}
              </span>
            </div>

            {/* Delivery Estimate */}
            <div className="hidden sm:flex items-center gap-1 text-[#1b6d24] font-semibold bg-[#e8f5e9] px-2.5 py-0.5 rounded-full text-[11px] border border-[#a0f399]/70">
              <Clock className="w-3 h-3" />
              <span>Est. Delivery: {order.shippingAddress?.district?.toLowerCase().includes('dhaka') ? '24–48 Hours' : '2–4 Days Nationwide'}</span>
            </div>
          </div>

          {/* Quick Actions in Summary Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLaunchTracking()}
              className="px-3 py-1 bg-[#1b6d24] hover:bg-[#14531b] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Live Tracking</span>
            </button>
            <button
              onClick={handleLaunchInvoice}
              className="px-3 py-1 bg-white hover:bg-[#f0eded] text-[#002c11] border border-[#c1c9be] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoice</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs bg-[#fafbfa]">
          {/* 1. VISUAL ORDER LIFECYCLE PROGRESSION */}
          <div className="bg-white p-5 rounded-2xl border border-[#c1c9be]/60 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1b6d24] text-xl">timeline</span>
                <h4 className="font-extrabold text-[#002c11] text-sm uppercase tracking-wider font-heading">
                  Order 360 Lifecycle Progression
                </h4>
              </div>
              <span className="text-[11px] font-bold text-[#1b6d24] bg-[#e8f5e9] px-2.5 py-0.5 rounded-full border border-[#a0f399]">
                Zero-Plastic Carbon Conscious
              </span>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {stages.map((st, idx) => {
                const IconComp = st.icon;
                const isCompleted = idx < activeStageIdx;
                const isCurrent = idx === activeStageIdx && !isCancelled;
                const isPending = idx > activeStageIdx || isCancelled;

                return (
                  <div
                    key={st.key}
                    className={`relative p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-[#e8f5e9] border-[#1b6d24] shadow-md ring-2 ring-[#a0f399]/50'
                        : isCompleted
                        ? 'bg-[#f4f7f4] border-[#a0f399] text-[#002c11]'
                        : 'bg-[#fafafa] border-[#e0e0e0] text-[#717970] opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                            isCurrent
                              ? 'bg-[#1b6d24] text-white shadow-xs'
                              : isCompleted
                              ? 'bg-[#a0f399] text-[#002c11]'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#717970]">
                          0{idx + 1}
                        </span>
                      </div>
                      <div className="font-extrabold text-[#002c11] text-xs leading-tight">
                        {st.title}
                      </div>
                      <p className="text-[10px] text-[#717970] mt-1 line-clamp-2">
                        {st.desc}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-black/5 text-[10px] font-bold">
                      {isCurrent && (
                        <span className="text-[#1b6d24] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1b6d24] animate-ping"></span>
                          In Progress
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCheck className="w-3 h-3" />
                          Completed
                        </span>
                      )}
                      {isPending && <span className="text-[#717970]">Upcoming</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. MULTI-VENDOR SUB-ORDERS BREAKDOWN */}
          {subOrders && subOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#1b6d24]" />
                  <h4 className="font-extrabold text-[#002c11] text-sm uppercase tracking-wider font-heading">
                    Artisan Dispatches & Multi-Vendor Consignments ({subOrders.length})
                  </h4>
                </div>
                <span className="text-[11px] text-[#717970]">
                  Each artisan workshop prepares items independently
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {subOrders.map((sub, idx) => {
                  return (
                    <div
                      key={sub.id || idx}
                      className="bg-white p-4 rounded-2xl border border-[#c1c9be]/60 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between pb-2 border-b border-[#f0eded]">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-[#1b6d24]" />
                            <span className="font-extrabold text-[#002c11] text-xs">
                              {sub.storeName || sub.sellerName}
                            </span>
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <span className="text-[10px] font-mono text-[#717970] block mt-0.5">
                            Sub-Order #{sub.id}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            sub.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'shipped'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      {/* Items in this sub-order */}
                      <div className="space-y-2">
                        {sub.items.map((it, itIdx) => (
                          <div key={itIdx} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={it.image || BRAND_LOGO}
                                alt={it.title}
                                className="w-8 h-8 rounded-lg object-cover border border-[#c1c9be]/40 shrink-0"
                              />
                              <div className="truncate">
                                <p className="font-bold text-[#002c11] text-[11px] truncate">{it.title}</p>
                                <p className="text-[10px] text-[#717970]">
                                  Qty: {it.quantity} • ৳{it.price} each
                                </p>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-[#002c11] shrink-0">
                              ৳{it.price * it.quantity}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Sub-order Tracking & Courier Details */}
                      {sub.trackingCode && (
                        <div className="bg-[#f4f7f4] p-2.5 rounded-xl border border-[#c1c9be]/40 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 truncate">
                            <Truck className="w-3.5 h-3.5 text-[#1b6d24] shrink-0" />
                            <span className="font-mono text-[#002c11] truncate font-bold">
                              {sub.trackingCode}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyTracking(sub.trackingCode!)}
                            title="Copy Tracking Number"
                            className="text-[#1b6d24] hover:underline font-bold text-[10px] shrink-0 ml-2"
                          >
                            Copy
                          </button>
                        </div>
                      )}

                      {/* Actions for this specific artisan */}
                      <div className="flex items-center justify-between pt-1 gap-2 border-t border-[#f0eded]">
                        <button
                          onClick={() => handleLaunchChat(sub.sellerId, sub.sellerName, sub.items[0])}
                          className="px-3 py-1.5 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#002c11] font-bold text-[11px] rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat Artisan</span>
                        </button>

                        <button
                          onClick={() => handleLaunchTracking(sub)}
                          className="px-3 py-1.5 bg-[#e8f5e9] hover:bg-[#d8edd9] text-[#1b6d24] font-bold text-[11px] rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Track Dispatch</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. COMPLETE ORDER ITEMS LEDGER */}
          <div className="bg-white p-5 rounded-2xl border border-[#c1c9be]/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#1b6d24]" />
                <h4 className="font-extrabold text-[#002c11] text-sm uppercase tracking-wider font-heading">
                  Purchased Products & Artisan Heritage ({order.items.length})
                </h4>
              </div>
              <span className="text-[11px] text-[#717970] font-mono">
                Subtotal: ৳{order.subtotal}
              </span>
            </div>

            <div className="divide-y divide-[#f0eded]">
              {order.items.map((item, idx) => {
                const itemSellerId = item.sellerId || order.sellerIds?.[0] || 'artisan';
                const itemSellerName = item.sellerName || item.sellerSnapshot?.sellerName || 'SUNNO Artisan Partner';

                return (
                  <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={item.image || BRAND_LOGO}
                        alt={item.title}
                        className="w-14 h-14 rounded-2xl object-cover border border-[#c1c9be]/50 shrink-0 shadow-xs"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-[#002c11] text-xs truncate">{item.title}</h5>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#717970] mt-0.5">
                          <span>
                            Artisan: <strong className="text-[#002c11]">{itemSellerName}</strong>
                          </span>
                          <span>•</span>
                          <span>Origin: {item.district || 'Dhaka'}</span>
                          {item.sku && (
                            <>
                              <span>•</span>
                              <span className="font-mono">SKU: {item.sku}</span>
                            </>
                          )}
                        </div>
                        <div className="text-[11px] font-mono mt-1 text-[#002c11]">
                          ৳{item.price} × {item.quantity} = <strong>৳{item.price * item.quantity}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleLaunchChat(itemSellerId, itemSellerName, item)}
                        className="px-2.5 py-1.5 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#002c11] font-bold text-[10px] rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat Seller</span>
                      </button>

                      {currentStatus === 'delivered' && (
                        <>
                          <button
                            onClick={() => {
                              if (onOpenReview) {
                                onOpenReview(item, order);
                              } else {
                                setReviewItem(item);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[10px] rounded-xl flex items-center gap-1 transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-amber-700" />
                            <span>Write Review</span>
                          </button>

                          <button
                            onClick={() => {
                              if (onOpenReturn) {
                                onOpenReturn(order, item.productId);
                              } else {
                                setReturnItem({ productId: item.productId });
                              }
                            }}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold text-[10px] rounded-xl flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Return Item</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. SHIPPING, COURIER & FINANCIAL LEDGER (2 COLUMNS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery & Courier Card */}
            <div className="bg-white p-5 rounded-2xl border border-[#c1c9be]/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#f0eded] pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#1b6d24]" />
                  <h4 className="font-extrabold text-[#002c11] uppercase tracking-wider font-heading text-xs">
                    Shipping & Logistics Dossier
                  </h4>
                </div>
                <span className="text-[10px] bg-[#e8f5e9] text-[#1b6d24] font-bold px-2 py-0.5 rounded-full">
                  {order.deliveryMethod === 'express' ? 'Express Delivery' : 'Standard Eco Dispatch'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#717970] text-[10px] uppercase font-bold tracking-wider block">
                    Recipient Customer
                  </span>
                  <p className="font-bold text-[#002c11] text-sm mt-0.5">{order.customerName}</p>
                  <p className="text-[#717970] flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-[#1b6d24]" />
                    <span>{order.customerPhone}</span>
                  </p>
                </div>

                <div>
                  <span className="text-[#717970] text-[10px] uppercase font-bold tracking-wider block">
                    Delivery Address
                  </span>
                  <p className="font-medium text-[#002c11] mt-0.5 leading-relaxed">
                    {order.customerAddress ||
                      `${order.shippingAddress?.streetAddress || ''}, ${order.shippingAddress?.area || ''}, ${order.shippingAddress?.upazila || ''}, ${order.shippingAddress?.district || 'Dhaka'}, ${order.shippingAddress?.division || 'Dhaka'}`}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#f0eded]">
                  <span className="text-[#717970] text-[10px] uppercase font-bold tracking-wider block">
                    Assigned Courier Partner
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-[#002c11]">
                      {order.courierName || 'Steadfast Courier / SUNNO Eco-Fleet'}
                    </span>
                    {order.trackingCode && (
                      <span className="font-mono text-[10px] font-bold text-[#1b6d24]">
                        #{order.trackingCode}
                      </span>
                    )}
                  </div>
                </div>

                {order.deliveryInstructions && (
                  <div className="bg-[#fbf9f8] p-2.5 rounded-xl border border-[#c1c9be]/40 text-[11px]">
                    <span className="font-bold text-[#002c11] block mb-0.5">Customer Instructions:</span>
                    <p className="text-[#717970] italic">"{order.deliveryInstructions}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Ledger Card */}
            <div className="bg-white p-5 rounded-2xl border border-[#c1c9be]/60 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#f0eded] pb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#1b6d24]" />
                    <h4 className="font-extrabold text-[#002c11] uppercase tracking-wider font-heading text-xs">
                      Payment & Financial Ledger
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-[#717970]">Currency: BDT (৳)</span>
                </div>

                <div className="space-y-2 mt-3 text-xs">
                  <div className="flex justify-between text-[#717970]">
                    <span>Items Subtotal:</span>
                    <span className="font-mono font-bold text-[#002c11]">৳{order.subtotal}</span>
                  </div>

                  {order.discount ? (
                    <div className="flex justify-between text-[#1b6d24]">
                      <span>Promo Coupon Discount {order.couponCode ? `(${order.couponCode})` : ''}:</span>
                      <span className="font-mono font-bold">-৳{order.discount}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between text-[#717970]">
                    <span>Courier Delivery Fee:</span>
                    <span className="font-mono font-bold text-[#002c11]">
                      {order.deliveryFee || order.shippingFee ? `৳${order.deliveryFee || order.shippingFee}` : 'FREE'}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-[#f0eded] flex justify-between items-baseline">
                    <span className="font-extrabold text-sm text-[#002c11]">Grand Total:</span>
                    <span className="font-mono font-extrabold text-lg text-[#002c11]">
                      ৳{order.finalTotal || order.total}
                    </span>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-[#f4f7f4] border border-[#c1c9be]/40 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#717970]">Payment Method:</span>
                      <span className="font-bold text-[#002c11] uppercase">{order.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#717970]">Payment Status:</span>
                      <span
                        className={`font-bold uppercase ${
                          order.paymentStatus === 'paid' || order.paymentStatus === 'SUCCESS'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {order.paymentStatus || 'pending'}
                      </span>
                    </div>
                    {order.paymentTransactionId && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#717970]">Transaction ID:</span>
                        <span className="font-mono font-bold text-[#002c11]">{order.paymentTransactionId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Help Ticket Button */}
              <div className="pt-3 border-t border-[#f0eded] flex justify-between items-center">
                <button
                  onClick={() => {
                    if (onOpenSupportTicket) {
                      onOpenSupportTicket(order);
                    } else {
                      setIsSupportModalOpen(true);
                    }
                  }}
                  className="text-[#1b6d24] hover:underline font-bold flex items-center gap-1.5 text-xs"
                >
                  <LifeBuoy className="w-4 h-4" />
                  <span>Need Help with this Order?</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. SELLER / ADMIN STATUS OVERRIDE CONTROLS (IF AUTHORIZED) */}
          {(viewerRole === 'admin' || viewerRole === 'seller') && onUpdateStatus && (
            <div className="bg-[#122b1c] p-4 rounded-2xl border border-[#1e462d] text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#a0f399]" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[#a0f399]">
                    {viewerRole.toUpperCase()} Operations Management Controls
                  </span>
                </div>
                <span className="text-[10px] text-[#7ca087]">Controlled State Machine Governed</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-[#7ca087] font-semibold">Transition Status:</label>
                  <select
                    value={selectedStatusOverride}
                    onChange={(e) => setSelectedStatusOverride(e.target.value)}
                    className="bg-[#183a24] border border-[#235334] text-white text-xs font-bold rounded-xl px-3 py-1.5 outline-none"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing (Artisan Packaging)</option>
                    <option value="ready_for_shipment">Ready for Shipment</option>
                    <option value="shipped">Shipped (In Transit)</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered (Handover Complete)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <button
                  onClick={async () => {
                    setIsUpdatingStatus(true);
                    try {
                      if (selectedStatusOverride === 'cancelled') {
                        await executeOrderCancellation({
                          orderId: order.id,
                          reason: 'Administrative override via Order 360 Console',
                          cancelledBy: 'Admin / Order 360',
                          cancelledByRole: 'admin',
                          restockInventory: true,
                        });
                      } else {
                        await onUpdateStatus(selectedStatusOverride as OrderStatus);
                      }
                      setOrder((prev) => ({
                        ...prev,
                        status: selectedStatusOverride as OrderStatus,
                        orderStatus: selectedStatusOverride as OrderStatus,
                      }));
                      showToast(`Order status updated to "${selectedStatusOverride}".`);
                    } catch (e: any) {
                      showToast(e.message || 'Error updating status');
                    } finally {
                      setIsUpdatingStatus(false);
                    }
                  }}
                  disabled={isUpdatingStatus || selectedStatusOverride === currentStatus}
                  className="px-4 py-1.5 bg-[#a0f399] hover:bg-[#8ee986] disabled:opacity-50 text-[#002204] text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Commit Status Transition'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL ACTION BAR (FOOTER) */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#c1c9be]/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBuyAgainClick}
              className="px-4 py-2 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#002c11] rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Buy Again</span>
            </button>

            <button
              onClick={() => {
                const firstSeller = order.items[0]?.sellerId || order.sellerIds?.[0] || 'artisan';
                const firstSellerName = order.items[0]?.sellerName || 'Artisan Partner';
                handleLaunchChat(firstSeller, firstSellerName, order.items[0]);
              }}
              className="px-4 py-2 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#002c11] rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message Seller</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLaunchInvoice}
              className="px-4 py-2 bg-white hover:bg-[#f0eded] text-[#002c11] border border-[#c1c9be] rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tax Invoice</span>
            </button>

            <button
              onClick={() => handleLaunchTracking()}
              className="px-5 py-2 bg-[#1b6d24] hover:bg-[#14531b] text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Track Consignment</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHILD MODALS */}
      {activeTrackingShipment && (
        <TrackingModal
          shipment={activeTrackingShipment}
          onClose={() => setActiveTrackingShipment(null)}
          onViewInvoice={handleLaunchInvoice}
          canManageStatus={viewerRole === 'admin' || viewerRole === 'seller'}
        />
      )}

      {activeInvoice && (
        <InvoiceModal
          invoice={activeInvoice}
          onClose={() => setActiveInvoice(null)}
        />
      )}

      {isSupportModalOpen && (
        <SupportTicketModal
          onClose={() => setIsSupportModalOpen(false)}
          prefilledOrder={order}
        />
      )}

      {chatTarget && (
        <DirectChatModal
          target={chatTarget}
          onClose={() => setChatTarget(null)}
        />
      )}

      {returnItem && (
        <ReturnRequestModal
          order={order}
          productId={returnItem.productId}
          onClose={() => setReturnItem(null)}
        />
      )}

      {reviewItem && (
        <ProductReviewModal
          product={{
            id: reviewItem.productId,
            title: reviewItem.title,
            images: [reviewItem.image],
            price: reviewItem.price,
            sellerId: reviewItem.sellerId || 'artisan',
            sellerName: reviewItem.sellerName || 'Artisan',
            district: reviewItem.district || 'Dhaka',
            division: 'Dhaka',
          }}
          order={order}
          onClose={() => setReviewItem(null)}
        />
      )}
    </div>
  );
};
