import { Coupon, DeliverySetting } from '../types';

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'coupon-eco-first',
    code: 'ECOFIRST',
    discountType: 'percentage',
    discountValue: 10, // 10% off
    minOrderAmount: 1000,
    maxDiscount: 300,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    usageLimit: 1000,
    usedCount: 42,
    perUserLimit: 1,
    active: true,
    description: '10% discount on your first sustainable artisan order above ৳1,000 (Max ৳300 off)',
  },
  {
    id: 'coupon-sunno-green',
    code: 'SUNNO100',
    discountType: 'fixed',
    discountValue: 100, // ৳100 flat off
    minOrderAmount: 1500,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    usageLimit: 500,
    usedCount: 19,
    active: true,
    description: '৳100 flat discount on orders over ৳1,500 supporting rural artisans',
  },
  {
    id: 'coupon-heritage-save',
    code: 'HERITAGE20',
    discountType: 'percentage',
    discountValue: 20, // 20% off
    minOrderAmount: 3000,
    maxDiscount: 800,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    usageLimit: 200,
    usedCount: 8,
    active: true,
    description: '20% off on heritage orders above ৳3,000 (Max ৳800)',
  },
];

export const DEFAULT_DELIVERY_SETTING: DeliverySetting = {
  id: 'global-delivery-settings',
  defaultInsideDhaka: 60,
  defaultOutsideDhaka: 120,
  freeDeliveryThreshold: 2500,
  expressDeliverySurcharge: 50,
  updatedAt: new Date().toISOString(),
};
