import React, { useState } from 'react';
import { BANGLADESH_DIVISIONS, ALL_64_DISTRICTS } from '../../data/bangladeshDistricts';
import { checkDeliveryAvailability } from '../../services/customerDiscoveryService';
import {
  X,
  Truck,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Package,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

interface DeliveryAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDistrict?: string;
  cartTotal?: number;
}

export const DeliveryAvailabilityModal: React.FC<DeliveryAvailabilityModalProps> = ({
  isOpen,
  onClose,
  initialDistrict = 'Dhaka',
  cartTotal = 0,
}) => {
  const [selectedDivision, setSelectedDivision] = useState<string>('Dhaka');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialDistrict);

  if (!isOpen) return null;

  const divisionDistricts = ALL_64_DISTRICTS.filter(
    (d) => d.division.toLowerCase() === selectedDivision.toLowerCase()
  );

  const availability = checkDeliveryAvailability(selectedDistrict, selectedDivision, cartTotal);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden z-10 border border-[#c1c9be]/60 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-[#c1c9be]/40 bg-[#fbf9f8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eef7ee] border border-[#1b6d24]/20 flex items-center justify-center text-[#1b6d24]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#002c11] font-heading">
                Courier & Delivery Availability
              </h2>
              <p className="text-xs text-[#717970]">
                Check delivery rates and timelines across all 64 Districts of Bangladesh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#e7e8e7] text-[#414941] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Division Selector */}
          <div>
            <label className="block text-xs font-bold text-[#002c11] mb-2 uppercase tracking-wider">
              1. Select Administrative Division
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {BANGLADESH_DIVISIONS.map((div) => (
                <button
                  key={div.id}
                  onClick={() => {
                    setSelectedDivision(div.name);
                    const firstInDiv = ALL_64_DISTRICTS.find((d) => d.division.toLowerCase() === div.name.toLowerCase());
                    if (firstInDiv) setSelectedDistrict(firstInDiv.name);
                  }}
                  className={`p-2 text-xs rounded-xl font-semibold border transition-all text-center ${
                    selectedDivision.toLowerCase() === div.name.toLowerCase()
                      ? 'bg-[#002c11] text-white border-[#002c11] shadow-xs'
                      : 'bg-[#f5f3f3] text-[#414941] border-[#c1c9be]/40 hover:bg-[#e7e8e7]'
                  }`}
                >
                  {div.name}
                </button>
              ))}
            </div>
          </div>

          {/* District Selector */}
          <div>
            <label className="block text-xs font-bold text-[#002c11] mb-2 uppercase tracking-wider">
              2. Select Destination District ({divisionDistricts.length} in {selectedDivision})
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#fbf9f8] border border-[#c1c9be] text-sm font-bold text-[#002c11] focus:ring-2 focus:ring-[#1b6d24] focus:outline-none"
            >
              {divisionDistricts.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>

          {/* Results Box */}
          <div className="bg-[#fbf9f8] rounded-2xl p-4 border border-[#c1c9be]/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1b6d24]" />
                <span className="text-xs font-bold text-[#002c11]">
                  Delivering to: {selectedDistrict}, {selectedDivision}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#1b6d24] bg-[#dbf5dc] px-2.5 py-0.5 rounded-full">
                100% Serviceable
              </span>
            </div>

            {/* Courier Options List */}
            <div className="space-y-2.5">
              {availability.options.map((opt) => (
                <div
                  key={opt.courierId}
                  className="bg-white p-3.5 rounded-xl border border-[#c1c9be]/40 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#002c11]">{opt.courierName}</span>
                      {opt.codAvailable && (
                        <span className="text-[10px] bg-[#f0eded] text-[#414941] px-1.5 py-0.5 rounded font-semibold">
                          COD Available
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#717970] mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#1b6d24]" />
                        {opt.estimatedDays}
                      </span>
                      <span className="flex items-center gap-1 text-[#1b6d24]">
                        <ShieldCheck className="w-3 h-3" />
                        Plastic-Free Box
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-[#002c11]">
                      {opt.deliveryFee === 0 ? (
                        <span className="text-[#1b6d24]">FREE</span>
                      ) : (
                        `৳${opt.deliveryFee}`
                      )}
                    </div>
                    <span className="text-[10px] text-[#717970]">{opt.estimatedDelivery}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Free Delivery Promo Note */}
            <div className="bg-[#eef7ee] p-3 rounded-xl border border-[#1b6d24]/20 flex items-start gap-2 text-xs text-[#1b6d24]">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Free Eco Delivery Guarantee:</span> Orders over ৳1,500 receive 100% free delivery nationwide across all 64 districts.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#c1c9be]/40 bg-[#fbf9f8] text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-[#002c11] text-white font-bold text-xs hover:bg-[#1b6d24] transition-colors"
          >
            Got it, Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
