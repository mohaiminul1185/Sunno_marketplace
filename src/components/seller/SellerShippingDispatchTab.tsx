import React, { useState } from 'react';
import { SubOrder, Order, Shipment, Invoice } from '../../types';
import {
  Truck,
  Package,
  Printer,
  FileText,
  Copy,
  Check,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface SellerShippingDispatchTabProps {
  subOrders: SubOrder[];
  orders: Order[];
  subOrderShipments: Record<string, Shipment>;
  onBookShipment: (subOrder: SubOrder) => void;
  onTrackShipment: (shipment: Shipment) => void;
  onPrintLabel: (shipment: Shipment) => void;
  onViewInvoice: (orderId: string) => void;
  onMessageBuyer?: (subOrder: SubOrder) => void;
  onOpenOrder360?: (subOrder: SubOrder) => void;
  onCancelSubOrder?: (subOrder: SubOrder) => void;
}

export const SellerShippingDispatchTab: React.FC<SellerShippingDispatchTabProps> = ({
  subOrders,
  orders,
  subOrderShipments,
  onBookShipment,
  onTrackShipment,
  onPrintLabel,
  onViewInvoice,
  onMessageBuyer,
  onOpenOrder360,
  onCancelSubOrder,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = subOrders.filter((sub) => {
    const shipment = subOrderShipments[sub.id];
    const matchesSearch =
      sub.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.parentOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shipment?.trackingNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'all') return true;
    if (filterStatus === 'ready_to_pack') return !shipment || sub.status === 'processing' || sub.status === 'confirmed';
    if (filterStatus === 'in_transit') return sub.status === 'shipped' || shipment?.status === 'IN_TRANSIT';
    if (filterStatus === 'delivered') return sub.status === 'delivered' || shipment?.status === 'DELIVERED';
    return true;
  });

  const totalShipments = subOrders.length;
  const inTransitCount = subOrders.filter((s) => s.status === 'shipped').length;
  const readyToPackCount = subOrders.filter((s) => s.status === 'confirmed' || s.status === 'processing').length;
  const deliveredCount = subOrders.filter((s) => s.status === 'delivered').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
          Courier Logistics & Consignment Center
        </h1>
        <p className="text-xs text-[#414941] mt-0.5">
          Generate compliant 4x6 zero-plastic shipping labels, book trusted couriers across 64 districts, and supervise verified dispatches.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
          <span className="text-[11px] font-bold text-[#717970] uppercase">Total Consignments</span>
          <div className="text-2xl font-extrabold text-[#002c11] font-mono mt-1">{totalShipments}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase">Ready to Pack</span>
          <div className="text-2xl font-extrabold text-amber-900 font-mono mt-1">{readyToPackCount}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
          <span className="text-[11px] font-bold text-blue-800 uppercase">In Transit</span>
          <div className="text-2xl font-extrabold text-blue-900 font-mono mt-1">{inTransitCount}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase">Delivered</span>
          <div className="text-2xl font-extrabold text-emerald-900 font-mono mt-1">{deliveredCount}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#717970] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Sub-Order, Tracking # or Buyer..."
            className="w-full pl-9 pr-3 py-2 bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl text-xs outline-none focus:border-[#1b6d24]"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Shipments' },
            { id: 'ready_to_pack', label: 'Ready to Pack' },
            { id: 'in_transit', label: 'In Transit' },
            { id: 'delivered', label: 'Delivered' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === tab.id
                  ? 'bg-[#002c11] text-[#a0f399]'
                  : 'bg-[#f0eded] text-[#414941] hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Consignments List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-12 text-center text-xs text-[#717970] space-y-2">
            <Truck className="w-10 h-10 mx-auto text-stone-400" />
            <p className="font-bold text-[#002c11]">No consignments match your filter</p>
            <p className="text-[11px]">Sub-orders ready for fulfillment will appear here automatically.</p>
          </div>
        ) : (
          filtered.map((sub) => {
            const shipment = subOrderShipments[sub.id];
            const parentOrder = orders.find((o) => o.id === sub.parentOrderId);
            const address = parentOrder?.shippingAddress;

            return (
              <div
                key={sub.id}
                className="bg-white rounded-3xl border border-[#c1c9be]/60 p-5 shadow-xs hover:border-[#1b6d24]/50 transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex flex-wrap justify-between items-start gap-3 pb-3 border-b border-[#f0eded]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#002c11]">
                        {sub.id}
                      </span>
                      <span className="text-[10px] text-[#717970] font-mono">
                        (Parent: #{sub.parentOrderId.slice(0, 10)})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sub.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-900'
                            : sub.status === 'shipped'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#717970] mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#1b6d24]" />
                      <span>
                        Destination: <strong>{address?.district || 'Dhaka'}</strong>, {address?.division || 'Bangladesh'} • Buyer: <strong>{sub.customerName || address?.fullName || 'Conscious Buyer'}</strong>
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-[#717970]">Subtotal: </span>
                    <strong className="font-mono text-base text-[#002c11]">৳{sub.total}</strong>
                  </div>
                </div>

                {/* Items in parcel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {sub.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-[#fbf9f8] rounded-xl text-xs">
                      <img
                        src={it.image}
                        alt={it.title}
                        className="w-10 h-10 object-cover rounded-lg border border-[#c1c9be]/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-[#002c11] truncate">{it.title}</p>
                        <p className="text-[10px] text-[#717970]">Qty: {it.quantity} • ৳{it.price}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Controls */}
                <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                  {shipment ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold rounded-lg flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-700" />
                        {shipment.courierName}
                      </span>

                      <div className="flex items-center gap-1 bg-stone-100 px-2 py-1 rounded-lg border border-stone-300 font-mono text-xs font-bold text-stone-900">
                        <span>{shipment.trackingNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(shipment.trackingNumber, sub.id)}
                          className="text-stone-500 hover:text-stone-900 ml-1"
                          title="Copy tracking code"
                        >
                          {copiedId === sub.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        onClick={() => onTrackShipment(shipment)}
                        className="px-3 py-1.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold rounded-xl shadow-xs transition-colors"
                      >
                        Track Live
                      </button>

                      <button
                        onClick={() => onPrintLabel(shipment)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-xl border border-[#c1c9be]/60 transition-colors flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print 4x6 Label</span>
                      </button>

                      <button
                        onClick={() => onViewInvoice(sub.parentOrderId)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-xl border border-[#c1c9be]/60 transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoice</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onBookShipment(sub)}
                        className="px-4 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Pack & Book Courier</span>
                      </button>
                      <span className="text-[11px] text-[#717970] italic">
                        Select Steadfast, Pathao, RedX, Paperfly, or Eco-Dispatch
                      </span>
                      {onCancelSubOrder && (sub.status === 'pending' || sub.status === 'confirmed' || sub.status === 'processing') && (
                        <button
                          type="button"
                          onClick={() => onCancelSubOrder(sub)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                          title="Cancel Sub-Order & Restock Craft Inventory"
                        >
                          <span className="material-symbols-outlined text-[13px]">cancel</span>
                          <span>Cancel Order</span>
                        </button>
                      )}
                    </div>
                  )}

                  {onMessageBuyer && (
                    <button
                      onClick={() => onMessageBuyer(sub)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 text-[#002c11] font-bold text-xs rounded-xl border border-[#c1c9be]/60 transition-colors flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message Buyer</span>
                    </button>
                  )}

                  {onOpenOrder360 && (
                    <button
                      onClick={() => onOpenOrder360(sub)}
                      className="px-3 py-1.5 bg-[#e8f5e9] hover:bg-[#d8edd9] text-[#1b6d24] font-bold text-xs rounded-xl border border-[#a0f399] transition-colors flex items-center gap-1.5"
                      title="Inspect Full SUNNO Order 360"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#1b6d24]" />
                      <span>Order 360</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
