import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Package,
  Leaf,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  SubOrder,
  Order,
  CourierProviderId,
  CourierServiceType,
  EcoPackagingType,
  DeliveryRateOption,
  Shipment,
} from '../types';
import { calculateCourierRates, createShipmentConsignment } from '../services/courierService';

interface SellerShipmentModalProps {
  subOrder: SubOrder;
  parentOrder?: Order | null;
  sellerName: string;
  sellerDistrict: string;
  onClose: () => void;
  onShipmentCreated: (shipment: Shipment) => void;
}

export const SellerShipmentModal: React.FC<SellerShipmentModalProps> = ({
  subOrder,
  parentOrder,
  sellerName,
  sellerDistrict,
  onClose,
  onShipmentCreated,
}) => {
  const [weightKg, setWeightKg] = useState<number>(0.8);
  const [packageType, setPackageType] = useState<'box' | 'bag' | 'envelope' | 'pallet'>('box');
  const [ecoPackagingType, setEcoPackagingType] = useState<EcoPackagingType>('banana_fiber_wrap');
  const [selectedCourierId, setSelectedCourierId] = useState<CourierProviderId>('sunno_eco');
  const [serviceType, setServiceType] = useState<CourierServiceType>('standard');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [rates, setRates] = useState<DeliveryRateOption[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const customerDistrict = subOrder.shippingAddress?.district || 'Dhaka';
  const codAmount = parentOrder?.paymentMethod === 'cod' ? subOrder.total : 0;

  useEffect(() => {
    let mounted = true;
    async function loadRates() {
      setLoadingRates(true);
      try {
        const calculated = await calculateCourierRates({
          sellerDistrict: sellerDistrict || 'Dhaka',
          customerDistrict,
          weightKg,
          isCod: parentOrder?.paymentMethod === 'cod',
          orderTotal: subOrder.total,
          serviceType,
        });
        if (mounted) {
          setRates(calculated);
          if (calculated.length > 0 && !calculated.find((r) => r.courierId === selectedCourierId)) {
            setSelectedCourierId(calculated[0].courierId);
          }
        }
      } catch (err) {
        console.warn('Error loading rates:', err);
      } finally {
        if (mounted) setLoadingRates(false);
      }
    }
    loadRates();
    return () => {
      mounted = false;
    };
  }, [sellerDistrict, customerDistrict, weightKg, serviceType, subOrder.total, parentOrder?.paymentMethod]);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const pickupAddress = {
        fullName: sellerName || 'Artisan Guild',
        phone: '01700000000',
        division: 'Dhaka',
        district: sellerDistrict || 'Dhaka',
        streetAddress: 'Artisan Workshop Cluster',
      };

      const shipment = await createShipmentConsignment({
        orderId: subOrder.parentOrderId,
        orderNumber: parentOrder?.orderNumber || subOrder.parentOrderId,
        subOrderId: subOrder.id,
        sellerId: subOrder.sellerId,
        sellerName,
        storeName: subOrder.sellerName,
        customerId: subOrder.customerId,
        customerName: subOrder.customerName || subOrder.shippingAddress?.fullName || 'Customer',
        customerPhone: subOrder.customerPhone || subOrder.shippingAddress?.phone || '01712345678',
        customerEmail: parentOrder?.customerEmail,
        courierId: selectedCourierId,
        pickupAddress,
        deliveryAddress: subOrder.shippingAddress || {
          id: 'addr-01',
          fullName: subOrder.customerName || 'Customer',
          phone: subOrder.customerPhone || '01712345678',
          division: 'Dhaka',
          district: 'Dhaka',
          streetAddress: 'Customer Delivery Address',
          isDefault: true,
        },
        packageInfo: {
          weight: weightKg,
          numberOfItems: subOrder.items.reduce((sum, item) => sum + item.quantity, 0),
          packageType,
          ecoPackagingType,
          specialInstructions,
        },
        serviceType,
        codAmount,
        deliveryInstructions: specialInstructions,
      });

      onShipmentCreated(shipment);
    } catch (err: any) {
      console.error('Shipment creation error:', err);
      setErrorMsg(err.message || 'Failed to generate shipment consignment. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="seller-shipment-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="seller-shipment-modal-container"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 text-white p-6 relative">
          <button
            id="close-seller-shipment-modal-btn"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-700 rounded-xl text-white">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Pack & Dispatch Consignment</h2>
              <p className="text-stone-300 text-xs mt-0.5">
                Sub-Order #{subOrder.id} • {subOrder.items.length} artisan items • Destination: {customerDistrict}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateShipment} className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sub-Order Products Preview */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider block">
              Items to Pack & Ship
            </span>
            <div className="divide-y divide-stone-200 text-xs">
              {subOrder.items.map((item, idx) => (
                <div key={idx} className="py-1.5 flex justify-between items-center">
                  <span className="font-medium text-stone-800">
                    {item.quantity}x {item.title}
                  </span>
                  <span className="font-mono text-stone-600">৳{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Sustainable Packaging & Weight */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-emerald-700" />
              1. Eco-Packaging & Weight Verification
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Eco-Material Seal <span className="text-emerald-700 font-bold">*</span>
                </label>
                <select
                  id="eco-packaging-select"
                  value={ecoPackagingType}
                  onChange={(e) => setEcoPackagingType(e.target.value as EcoPackagingType)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:ring-2 focus:ring-emerald-700"
                >
                  <option value="banana_fiber_wrap">Banana Fiber Protective Wrap</option>
                  <option value="jute_sack">Handwoven Jute Sack / Bag</option>
                  <option value="recycled_kraft_box">100% Recycled Kraft Craft Box</option>
                  <option value="hemp_twine_bundle">Hemp Twine & Leaf Bundle</option>
                  <option value="compostable_pouch">Compostable Plant Starch Pouch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Estimated Weight (kg) <span className="text-emerald-700 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    id="package-weight-input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0.5)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:ring-2 focus:ring-emerald-700"
                  />
                  <span className="absolute right-3 top-2 text-xs text-stone-400 font-mono">KG</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Select Courier Provider with Rates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-700" />
                2. Select Courier Partner & Rate Matrix
              </h4>
              {loadingRates && <span className="text-[11px] text-emerald-700 animate-pulse">Calculating rates...</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rates.map((rate) => (
                <div
                  key={rate.courierId}
                  id={`select-courier-${rate.courierId}`}
                  onClick={() => setSelectedCourierId(rate.courierId)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedCourierId === rate.courierId
                      ? 'border-emerald-700 bg-emerald-50/50 ring-2 ring-emerald-200'
                      : 'border-stone-200 bg-white hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">{rate.courierName}</span>
                    <span className="font-mono text-xs font-bold text-emerald-900">
                      {rate.isFreeDelivery ? 'FREE' : `৳${rate.totalWithCod}`}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 mt-1">Transit: {rate.estimatedDeliveryDays}</p>

                  {rate.isEcoPreferred && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                      Zero-Carbon Preferred
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Special Delivery Instructions */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Pickup & Courier Handling Instructions (Optional)
            </label>
            <input
              id="courier-instructions-input"
              type="text"
              placeholder="e.g. Fragile ceramic craft, please handle with care..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs"
            />
          </div>

          {/* COD Notice */}
          {codAmount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
              <span>Cash on Delivery Collection by Courier:</span>
              <strong className="font-mono text-sm">৳{codAmount}</strong>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              id="cancel-shipment-modal-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              id="confirm-dispatch-shipment-btn"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
            >
              <Truck className="w-4 h-4" />
              {isSubmitting ? 'Booking Consignment...' : 'Confirm Dispatch & Generate Consignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
