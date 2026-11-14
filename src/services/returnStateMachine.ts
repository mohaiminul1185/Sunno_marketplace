import { ReturnStatus } from '../types';

/**
 * Return State Machine — Phase 17
 * Strictly governs valid status progression for the reverse commerce workflow.
 */

export const ALLOWED_RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISPUTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED', 'DISPUTED'],
  APPROVED: ['PICKUP_SCHEDULED', 'RECEIVED', 'APPROVED_FOR_REFUND', 'EXCHANGE_PENDING', 'CANCELLED', 'DISPUTED'],
  REJECTED: ['DISPUTED', 'CLOSED', 'UNDER_REVIEW'],
  PICKUP_SCHEDULED: ['PICKED_UP', 'PICKUP_SCHEDULED', 'CANCELLED', 'DISPUTED'],
  PICKED_UP: ['RECEIVED', 'IN_TRANSIT', 'CANCELLED', 'DISPUTED'],
  RECEIVED: ['INSPECTION', 'APPROVED_FOR_REFUND', 'EXCHANGE_PENDING', 'DISPUTED'],
  INSPECTION: ['APPROVED_FOR_REFUND', 'EXCHANGE_PENDING', 'REJECTED', 'DISPUTED'],
  APPROVED_FOR_REFUND: ['REFUND_PENDING', 'REFUNDED', 'DISPUTED'],
  REFUND_PENDING: ['REFUNDED', 'DISPUTED', 'APPROVED_FOR_REFUND'],
  REFUNDED: ['CLOSED'],
  EXCHANGE_PENDING: ['EXCHANGED', 'DISPUTED'],
  EXCHANGED: ['CLOSED'],
  CANCELLED: ['CLOSED'],
  DISPUTED: ['UNDER_REVIEW', 'APPROVED', 'APPROVED_FOR_REFUND', 'EXCHANGE_PENDING', 'REJECTED', 'CLOSED'],
  CLOSED: [],

  // Legacy mappings for backwards compatibility
  RETURN_REQUESTED: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISPUTED'],
  PICKUP_REQUESTED: ['PICKUP_SCHEDULED', 'PICKED_UP', 'CANCELLED', 'DISPUTED'],
  IN_TRANSIT: ['RECEIVED', 'RECEIVED_BY_SELLER', 'DISPUTED'],
  RECEIVED_BY_SELLER: ['INSPECTION', 'APPROVED_FOR_REFUND', 'EXCHANGE_PENDING', 'DISPUTED'],
  REFUND_PROCESSING: ['REFUNDED', 'DISPUTED', 'REFUND_PENDING'],
  COMPLETED: ['CLOSED'],
};

/**
 * Normalizes legacy or case variations to canonical ReturnStatus
 */
export function normalizeReturnStatus(status: string): ReturnStatus {
  const upper = (status || '').toUpperCase().trim();
  if (upper === 'RETURN_REQUESTED') return 'REQUESTED';
  if (upper === 'RECEIVED_BY_SELLER') return 'RECEIVED';
  if (upper === 'COMPLETED') return 'REFUNDED';
  if (upper in ALLOWED_RETURN_TRANSITIONS) {
    return upper as ReturnStatus;
  }
  return 'REQUESTED';
}

/**
 * Validates if a transition from currentStatus to newStatus is permissible.
 */
export function validateReturnStatusTransition(
  currentStatus: ReturnStatus | string,
  newStatus: ReturnStatus | string
): { isValid: boolean; error?: string } {
  const normCurrent = normalizeReturnStatus(currentStatus);
  const normNew = normalizeReturnStatus(newStatus);

  if (normCurrent === normNew) {
    return { isValid: true };
  }

  const allowed = ALLOWED_RETURN_TRANSITIONS[normCurrent] || [];
  const isValid = allowed.includes(normNew);

  if (!isValid) {
    return {
      isValid: false,
      error: `Illegal return status transition: Cannot change status from "${normCurrent}" to "${normNew}". Permitted next statuses: ${allowed.join(', ') || 'None (Terminal state)'}`,
    };
  }

  return { isValid: true };
}

/**
 * Returns human-friendly Bengali and English badge labels and colors for return statuses
 */
export function getReturnStatusDisplay(status: ReturnStatus | string): {
  label: string;
  bnLabel: string;
  badgeClass: string;
  icon: string;
  stepNumber: number;
} {
  const norm = normalizeReturnStatus(status);

  switch (norm) {
    case 'REQUESTED':
    case 'RETURN_REQUESTED':
      return {
        label: 'Requested',
        bnLabel: 'আবেদন গৃহীত',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        icon: 'hourglass_empty',
        stepNumber: 1,
      };
    case 'UNDER_REVIEW':
      return {
        label: 'Under Review',
        bnLabel: 'পর্যালোচনাধীন',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        icon: 'manage_search',
        stepNumber: 2,
      };
    case 'APPROVED':
      return {
        label: 'Return Approved',
        bnLabel: 'রিটার্ন অনুমোদিত',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        icon: 'check_circle',
        stepNumber: 3,
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        bnLabel: 'বাতিলকৃত',
        badgeClass: 'bg-red-100 text-red-900 border-red-300',
        icon: 'cancel',
        stepNumber: 0,
      };
    case 'PICKUP_SCHEDULED':
      return {
        label: 'Pickup Scheduled',
        bnLabel: 'পিকআপ নির্ধারিত',
        badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
        icon: 'schedule',
        stepNumber: 4,
      };
    case 'PICKED_UP':
    case 'IN_TRANSIT':
      return {
        label: 'Picked Up / In Transit',
        bnLabel: 'পিকআপ সম্পন্ন / ট্রানজিটে',
        badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        icon: 'local_shipping',
        stepNumber: 5,
      };
    case 'RECEIVED':
    case 'RECEIVED_BY_SELLER':
      return {
        label: 'Received by Artisan',
        bnLabel: 'কারিগর কর্তৃক গৃহীত',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
        icon: 'package_2',
        stepNumber: 6,
      };
    case 'INSPECTION':
      return {
        label: 'Under Inspection',
        bnLabel: 'পরীক্ষণাধীন',
        badgeClass: 'bg-teal-100 text-teal-900 border-teal-300',
        icon: 'fact_check',
        stepNumber: 7,
      };
    case 'APPROVED_FOR_REFUND':
    case 'REFUND_PENDING':
      return {
        label: 'Refund Processing',
        bnLabel: 'রিফান্ড প্রক্রিয়াকরণ',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        icon: 'payments',
        stepNumber: 8,
      };
    case 'REFUNDED':
    case 'COMPLETED':
      return {
        label: 'Refunded',
        bnLabel: 'রিফান্ড সম্পন্ন',
        badgeClass: 'bg-green-100 text-green-900 border-green-300',
        icon: 'verified',
        stepNumber: 9,
      };
    case 'EXCHANGE_PENDING':
      return {
        label: 'Exchange Pending',
        bnLabel: 'বিনিময় প্রক্রিয়াধীন',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        icon: 'sync',
        stepNumber: 8,
      };
    case 'EXCHANGED':
      return {
        label: 'Exchanged',
        bnLabel: 'বিনিময় সম্পন্ন',
        badgeClass: 'bg-green-100 text-green-900 border-green-300',
        icon: 'published_with_changes',
        stepNumber: 9,
      };
    case 'DISPUTED':
      return {
        label: 'Disputed',
        bnLabel: 'বিরোধ উত্থাপিত',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-400 font-bold',
        icon: 'gavel',
        stepNumber: 0,
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled by Customer',
        bnLabel: 'গ্রাহক কর্তৃক বাতিল',
        badgeClass: 'bg-stone-200 text-stone-700 border-stone-300',
        icon: 'block',
        stepNumber: 0,
      };
    case 'CLOSED':
      return {
        label: 'Closed',
        bnLabel: 'বন্ধ',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: 'lock',
        stepNumber: 10,
      };
    default:
      return {
        label: norm,
        bnLabel: norm,
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: 'help',
        stepNumber: 0,
      };
  }
}

/**
 * Convenience helper to get English or Bengali label for any return status
 */
export function getReturnStatusLabel(status: ReturnStatus | string, lang: 'en' | 'bn' = 'en'): string {
  const display = getReturnStatusDisplay(status);
  return lang === 'bn' ? display.bnLabel : display.label;
}

/**
 * Convenience helper to get friendly Bengali description for return status
 */
export function getBengaliStatusDescription(status: ReturnStatus | string): string {
  const norm = normalizeReturnStatus(status);
  switch (norm) {
    case 'REQUESTED':
    case 'RETURN_REQUESTED':
      return 'আপনার রিটার্ন আবেদনটি সফলভাবে জমা হয়েছে। কারিগর বা টিম এটি যাচাই করছে।';
    case 'UNDER_REVIEW':
      return 'কারিগর ও টিম আপনার আবেদনের ছবি এবং কারণ পর্যালোচনা করছে।';
    case 'APPROVED':
      return 'রিটার্ন আবেদন অনুমোদিত হয়েছে। কুরিয়ার পিকআপ শিডিউল করা হচ্ছে।';
    case 'PICKUP_SCHEDULED':
      return 'আপনার ঠিকানা থেকে পণ্যটি সংগ্রহের জন্য কুরিয়ার নির্ধারিত হয়েছে।';
    case 'PICKED_UP':
      return 'কুরিয়ার প্রতিনিধি আপনার কাছ থেকে পণ্যটি সংগ্রহ করেছে।';
    case 'IN_TRANSIT':
      return 'পণ্যটি কারিগরের ওয়ার্কশপের উদ্দেশ্যে কুরিয়ার পথে রয়েছে।';
    case 'RECEIVED':
    case 'RECEIVED_BY_SELLER':
      return 'পণ্যটি কারিগরের ওয়ার্কশপে পৌঁছেছে এবং ইনভেন্টরি যাচাই চলছে।';
    case 'INSPECTION':
      return 'পণ্যটির গুণমান ও অবস্থা পুঙ্খানুপুঙ্খভাবে পরিদর্শন করা হচ্ছে।';
    case 'REFUND_PENDING':
    case 'APPROVED_FOR_REFUND':
      return 'পরিদর্শন সফল হয়েছে। আপনার রিফান্ডটি ডিসবার্সমেন্টের অপেক্ষায় রয়েছে।';
    case 'REFUNDED':
    case 'COMPLETED':
      return 'আপনার রিফান্ড সম্পূর্ণভাবে পরিশোধ করা হয়েছে।';
    case 'REJECTED':
      return 'নীতিমালা পূরণ না হওয়ায় রিটার্ন আবেদনটি বাতিল করা হয়েছে।';
    case 'CANCELLED':
      return 'রিটার্ন আবেদনটি বাতিল করা হয়েছে।';
    case 'DISPUTED':
      return 'রিটার্নটি নিয়ে বিরোধ তৈরি হয়েছে এবং সন্ধ্যানকারী ট্রাইব্যুনালে বিচারাধীন।';
    default:
      return 'অবস্থা হালনাগাদ করা হচ্ছে।';
  }
}

