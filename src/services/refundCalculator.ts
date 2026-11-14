import { Order, SubOrder, ReturnReason, FaultAttribution } from '../types';

export interface RefundCalculationInput {
  order: Order;
  subOrder?: SubOrder;
  productId: string;
  quantity: number;
  returnReason: ReturnReason | string;
  faultAttribution?: FaultAttribution;
  isFullOrderReturn?: boolean;
  overrideShippingRefund?: boolean;
  nonRefundableFee?: number;
  existingRefundsTotal?: number;
}

export interface RefundCalculationResult {
  grossItemAmount: number;
  unitPrice: number;
  quantity: number;
  discountAllocation: number;
  couponAllocation: number;
  shippingRefund: number;
  nonRefundableFees: number;
  netRefundAmount: number;
  maxAllowableRefund: number;
  existingRefundsDeducted: number;
  breakdownSummary: string;
}

/**
 * Calculates item-level, sub-order, or full order refund according to Phase 17 rules.
 * Formula:
 * Original item price
 * - Proportional discount allocation
 * - Proportional coupon allocation
 * + Eligible shipping refund
 * - Non-refundable fees
 * = Refund amount (capped at order/suborder payment ceiling)
 */
export function calculateItemRefund(input: RefundCalculationInput): RefundCalculationResult {
  const {
    order,
    subOrder,
    productId,
    quantity,
    returnReason,
    faultAttribution,
    isFullOrderReturn = false,
    overrideShippingRefund,
    nonRefundableFee = 0,
    existingRefundsTotal = 0,
  } = input;

  // Find targeted item
  const item = order.items?.find((i) => i.productId === productId || (i as any).id === productId);
  const unitPrice = item ? item.price : 0;
  const itemQuantity = Math.max(1, quantity);
  const grossItemAmount = unitPrice * itemQuantity;

  // Multi-seller sub-order or primary order base
  const orderSubtotal = (subOrder ? subOrder.subtotal : order.subtotal) || (order.totalAmount || 1);
  const ratio = orderSubtotal > 0 ? Math.min(1, grossItemAmount / orderSubtotal) : 0;

  // Proportional discounts
  const totalDiscount = (subOrder ? (subOrder as any).discountAmount : order.discountAmount) || 0;
  const discountAllocation = Math.round(totalDiscount * ratio);

  // Proportional coupons
  const totalCoupon = (subOrder ? (subOrder as any).couponDiscount : order.couponDiscount) || 0;
  const couponAllocation = Math.round(totalCoupon * ratio);

  // Eligible shipping refund calculation
  // Phase 17 Spec: Shipping refunded if it is seller/courier fault, damaged item, or full return
  const isEligibleFault =
    faultAttribution === 'SELLER_FAULT' ||
    faultAttribution === 'COURIER_FAULT' ||
    faultAttribution === 'PRODUCT_DEFECT' ||
    returnReason === 'Damaged item' ||
    returnReason === 'Wrong item' ||
    returnReason === 'Missing item' ||
    returnReason === 'Defective item';

  const orderShipping = (subOrder ? subOrder.shippingFee : order.shippingFee) || 0;
  let shippingRefund = 0;

  if (overrideShippingRefund !== undefined) {
    shippingRefund = overrideShippingRefund ? orderShipping : 0;
  } else if (isFullOrderReturn || isEligibleFault) {
    shippingRefund = isFullOrderReturn ? orderShipping : Math.round(orderShipping * ratio);
  }

  // Non-refundable fee
  const fees = Math.max(0, nonRefundableFee);

  // Calculate preliminary net refund
  const preliminaryNet = grossItemAmount - discountAllocation - couponAllocation + shippingRefund - fees;
  let netRefund = Math.max(0, preliminaryNet);

  // Cap at remaining captured payment to prevent over-refund
  const totalOrderPaid = (subOrder ? subOrder.totalAmount : order.totalAmount) || grossItemAmount;
  const maxAllowable = Math.max(0, totalOrderPaid - existingRefundsTotal);

  if (netRefund > maxAllowable) {
    netRefund = maxAllowable;
  }

  const breakdownSummary = `Item (৳${unitPrice} × ${itemQuantity} = ৳${grossItemAmount}) - Discounts (৳${discountAllocation + couponAllocation}) + Shipping (৳${shippingRefund}) - Fees (৳${fees}) = ৳${netRefund}`;

  return {
    grossItemAmount,
    unitPrice,
    quantity: itemQuantity,
    discountAllocation,
    couponAllocation,
    shippingRefund,
    nonRefundableFees: fees,
    netRefundAmount: Math.round(netRefund),
    maxAllowableRefund: maxAllowable,
    existingRefundsDeducted: existingRefundsTotal,
    breakdownSummary,
  };
}
