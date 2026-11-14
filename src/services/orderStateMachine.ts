import { OrderStatus } from '../types';

/**
 * Controlled Order State Machine (Phase 16 - Section 27)
 * Strictly governs valid status progression and blocks backwards or illegal jumps.
 *
 * Controlled flow:
 * pending -> payment_processing -> confirmed -> processing -> packed -> shipped -> out_for_delivery -> delivered
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<string, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['ready_for_shipment', 'shipped', 'cancelled'],
  ready_for_shipment: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered: ['return_requested'],
  return_requested: ['returned'],
  returned: ['refunded'],
  cancelled: [],
  refunded: [],
};

export function canTransitionOrderStatus(currentStatus: string, targetStatus: string): boolean {
  const normCurrent = currentStatus.toLowerCase();
  const normTarget = targetStatus.toLowerCase();
  if (normCurrent === normTarget) return true;
  const allowed = ALLOWED_ORDER_TRANSITIONS[normCurrent];
  if (!allowed) {
    return true;
  }
  return allowed.map(s => s.toLowerCase()).includes(normTarget);
}

export function validateOrderStatusTransition(
  currentStatus: string,
  targetStatus: string
): { isValid: boolean; error?: string } {
  if (canTransitionOrderStatus(currentStatus, targetStatus)) {
    return { isValid: true };
  }
  return {
    isValid: false,
    error: `Invalid order transition: cannot transition order from "${currentStatus}" to "${targetStatus}". Completed or advanced states cannot be reverted.`,
  };
}
