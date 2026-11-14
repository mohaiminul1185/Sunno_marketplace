import React, { useRef } from 'react';
import { X, Printer, Package, Leaf, QrCode } from 'lucide-react';
import { Shipment } from '../types';

interface ParcelLabelModalProps {
  shipment: Shipment;
  onClose: () => void;
}

export const ParcelLabelModal: React.FC<ParcelLabelModalProps> = ({ shipment, onClose }) => {
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="parcel-label-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/75 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="parcel-label-container"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between no-print">
          <span className="text-xs font-bold tracking-wider uppercase flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            Standard Courier Shipping Label (4x6)
          </span>
          <div className="flex items-center gap-2">
            <button
              id="print-label-btn"
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Label
            </button>
            <button
              id="close-label-btn"
              onClick={onClose}
              className="p-1 rounded text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4x6 Label Sheet */}
        <div
          ref={labelRef}
          id="shipping-label-sheet"
          className="p-6 bg-white text-stone-900 font-sans space-y-4 max-h-[75vh] overflow-y-auto"
        >
          {/* Label Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-black">
            <div>
              <span className="text-xl font-black tracking-widest text-emerald-950">SUNNO</span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                ECO-LOGISTICS NETWORK
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-black uppercase text-stone-900">
                {shipment.courierName}
              </span>
              <p className="text-[11px] font-bold text-stone-700">SERVICE: {shipment.serviceType.toUpperCase()}</p>
            </div>
          </div>

          {/* Barcode Mock Visual */}
          <div className="py-2 text-center border-b border-black">
            <div className="h-12 w-full flex items-center justify-center gap-0.5 overflow-hidden">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-black h-full"
                  style={{
                    width: i % 3 === 0 ? '3px' : i % 5 === 0 ? '4px' : '1.5px',
                    marginRight: i % 4 === 0 ? '2px' : '1px',
                  }}
                />
              ))}
            </div>
            <span className="font-mono text-sm font-black tracking-widest block mt-1">
              {shipment.trackingNumber}
            </span>
          </div>

          {/* Recipient Address (Large) */}
          <div className="p-3 border-2 border-black rounded space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider block text-stone-500">
              DELIVER TO / RECIPIENT:
            </span>
            <p className="text-sm font-black text-black">{shipment.deliveryAddress.fullName}</p>
            <p className="text-xs font-bold text-stone-900">{shipment.deliveryAddress.streetAddress}</p>
            {shipment.deliveryAddress.area && (
              <p className="text-xs font-semibold text-stone-800">{shipment.deliveryAddress.area}</p>
            )}
            <p className="text-xs font-bold text-stone-900">
              {shipment.deliveryAddress.district.toUpperCase()}, {shipment.deliveryAddress.division.toUpperCase()}
            </p>
            <p className="font-mono text-xs font-black text-black mt-1">
              TEL: {shipment.deliveryAddress.phone}
            </p>
          </div>

          {/* Shipper (Artisan) Info */}
          <div className="text-[11px] border-b border-black pb-2 space-y-0.5">
            <span className="text-[9px] font-black uppercase text-stone-500 block">
              RETURN TO / SHIPPER:
            </span>
            <p className="font-bold">{shipment.pickupAddress.fullName}</p>
            <p className="text-stone-700">{shipment.pickupAddress.streetAddress}</p>
            <p className="text-stone-700">{shipment.pickupAddress.district}, Bangladesh</p>
            <p className="font-mono text-stone-600">TEL: {shipment.pickupAddress.phone}</p>
          </div>

          {/* COD Stamp & Package Info */}
          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <div className="p-2 border-2 border-black rounded text-center">
              <span className="text-[10px] font-bold block">COD CASH TO COLLECT:</span>
              <span className="text-lg font-black font-mono">
                {shipment.codAmount > 0 ? `৳${shipment.codAmount}` : 'PREPAID ৳0'}
              </span>
            </div>

            <div className="text-[11px] space-y-0.5">
              <p><span className="text-stone-500">Weight:</span> <strong>{shipment.packageInfo?.weight || 0.8} kg</strong></p>
              <p><span className="text-stone-500">Order #:</span> <strong className="font-mono">{shipment.orderNumber}</strong></p>
              <div className="flex items-center gap-1 text-emerald-800 font-bold text-[10px] mt-1">
                <Leaf className="w-3.5 h-3.5" />
                <span>100% Eco-Wrap Packaging</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
