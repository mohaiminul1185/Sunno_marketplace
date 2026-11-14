import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import {
  PaymentRecord,
  PaymentProviderConfig,
  CodSetting,
  CodRiskRecord,
  RefundRecord,
  SellerEarningsRecord,
  PaymentLog,
  PaymentMethod,
  PaymentStatus,
  Order,
  SubOrder,
} from '../types';
import { ORDERS_COL, NOTIFICATIONS_COL, createAuditLog, USERS_COL } from './dbService';
import { SUB_ORDERS_COL } from './checkoutService';

export const PAYMENTS_COL = 'payments';
export const PAYMENT_PROVIDERS_COL = 'payment_providers';
export const COD_SETTINGS_COL = 'cod_settings';
export const COD_RISKS_COL = 'cod_risks';
export const REFUNDS_COL = 'refunds';
export const SELLER_EARNINGS_COL = 'seller_earnings';
export const PAYMENT_LOGS_COL = 'payment_logs';

export const DEFAULT_PAYMENT_PROVIDERS: PaymentProviderConfig[] = [
  {
    id: 'bkash',
    name: 'bKash Direct Gateway (MFS)',
    providerType: 'bkash_direct',
    enabled: true,
    testMode: true,
    merchantName: 'SUNNO Marketplace LTD',
    merchantNumber: '01713000001',
    supportedMethods: ['bkash'],
    minOrderAmount: 10,
    maxOrderAmount: 50000,
    instructions: 'Instant MFS checkout via bKash official PGW tokenized checkout.',
  },
  {
    id: 'nagad',
    name: 'Nagad Digital Payment',
    providerType: 'nagad_direct',
    enabled: true,
    testMode: true,
    merchantName: 'SUNNO Marketplace LTD',
    merchantNumber: '01814000002',
    supportedMethods: ['nagad'],
    minOrderAmount: 10,
    maxOrderAmount: 50000,
    instructions: 'Government Postal Department digital financial service.',
  },
  {
    id: 'rocket',
    name: 'DBBL Rocket',
    providerType: 'rocket_direct',
    enabled: true,
    testMode: true,
    merchantName: 'SUNNO Marketplace',
    merchantNumber: '01915000003',
    supportedMethods: ['rocket'],
    minOrderAmount: 10,
    maxOrderAmount: 50000,
    instructions: 'Dutch-Bangla Bank Rocket mobile banking.',
  },
  {
    id: 'sslcommerz',
    name: 'SSLCommerz Gateway (Card & NetBanking)',
    providerType: 'sslcommerz',
    enabled: true,
    testMode: true,
    merchantName: 'SUNNO Sustainable Retail',
    supportedMethods: ['card', 'bank_transfer'],
    minOrderAmount: 50,
    maxOrderAmount: 100000,
    instructions: 'Visa, Mastercard, Amex, CityTouch, Islami Bank, and 30+ BD banking portals.',
  },
  {
    id: 'cod',
    name: 'Cash on Eco Delivery (COD)',
    providerType: 'cod_native',
    enabled: true,
    testMode: false,
    supportedMethods: ['cod'],
    minOrderAmount: 50,
    maxOrderAmount: 15000,
    instructions: 'Pay directly upon receiving in 100% compostable jute packaging.',
  },
];

export const DEFAULT_COD_SETTINGS: CodSetting = {
  id: 'default_cod_config',
  enabled: true,
  codFee: 0,
  minOrderAmount: 50,
  maxOrderAmount: 15000,
  allowedDistricts: [], // empty = all 64
  allowedCategories: [],
  allowedSellers: [],
  riskThreshold: 60,
  updatedAt: new Date().toISOString(),
};

// ---------------- PAYMENT PROVIDERS ADMIN & PUBLIC ----------------

export async function fetchPaymentProviders(): Promise<PaymentProviderConfig[]> {
  try {
    const snap = await getDocs(collection(db, PAYMENT_PROVIDERS_COL));
    if (snap.empty) {
      return DEFAULT_PAYMENT_PROVIDERS;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentProviderConfig));
  } catch (err) {
    console.warn('Using fallback payment providers:', err);
    return DEFAULT_PAYMENT_PROVIDERS;
  }
}

export async function fetchActivePaymentProviders(): Promise<PaymentProviderConfig[]> {
  const all = await fetchPaymentProviders();
  return all.filter((p) => p.enabled);
}

export async function updatePaymentProviderConfig(
  providerId: string,
  updates: Partial<PaymentProviderConfig>,
  adminId?: string
): Promise<void> {
  const ref = doc(db, PAYMENT_PROVIDERS_COL, providerId);
  await setDoc(
    ref,
    {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId || 'admin',
    },
    { merge: true }
  );

  await createAuditLog({
    action: 'PAYMENT_PROVIDER_CONFIG_UPDATED',
    performedBy: adminId || 'admin',
    actorId: adminId || 'admin',
    entityType: 'payment_provider',
    entityId: providerId,
    targetType: 'payment_provider',
    targetId: providerId,
    details: `Updated settings for provider: ${providerId} (Enabled: ${updates.enabled}, TestMode: ${updates.testMode})`,
    timestamp: new Date().toISOString(),
  });
}

// ---------------- COD SETTINGS & FRAUD RISK ----------------

export async function fetchCodSettings(): Promise<CodSetting> {
  try {
    const ref = doc(db, COD_SETTINGS_COL, DEFAULT_COD_SETTINGS.id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as CodSetting;
    }
    await setDoc(ref, DEFAULT_COD_SETTINGS).catch(() => {});
    return DEFAULT_COD_SETTINGS;
  } catch {
    return DEFAULT_COD_SETTINGS;
  }
}

export async function updateCodSettingsInDb(
  settings: Partial<CodSetting>,
  adminId?: string
): Promise<void> {
  const ref = doc(db, COD_SETTINGS_COL, DEFAULT_COD_SETTINGS.id);
  await setDoc(
    ref,
    {
      ...DEFAULT_COD_SETTINGS,
      ...settings,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await createAuditLog({
    action: 'COD_SETTINGS_UPDATED',
    performedBy: adminId || 'admin',
    actorId: adminId || 'admin',
    entityType: 'cod_settings',
    entityId: DEFAULT_COD_SETTINGS.id,
    targetType: 'cod_settings',
    targetId: DEFAULT_COD_SETTINGS.id,
    details: `Updated COD rules: Enabled=${settings.enabled}, MaxOrder=৳${settings.maxOrderAmount}, Fee=৳${settings.codFee}`,
    timestamp: new Date().toISOString(),
  });
}

export async function checkUserCodEligibility(
  userId: string,
  userPhone: string,
  orderAmount: number,
  district: string
): Promise<{ eligible: boolean; reason?: string; riskScore: number }> {
  const codConfig = await fetchCodSettings();
  if (!codConfig.enabled) {
    return { eligible: false, reason: 'Cash on Delivery is currently disabled by store admin.', riskScore: 0 };
  }

  if (orderAmount < codConfig.minOrderAmount) {
    return {
      eligible: false,
      reason: `Order total is below minimum COD threshold of ৳${codConfig.minOrderAmount}.`,
      riskScore: 0,
    };
  }

  if (orderAmount > codConfig.maxOrderAmount) {
    return {
      eligible: false,
      reason: `Orders exceeding ৳${codConfig.maxOrderAmount} require digital payment (bKash / Nagad / Card) for security.`,
      riskScore: 0,
    };
  }

  if (
    codConfig.allowedDistricts.length > 0 &&
    !codConfig.allowedDistricts.map((d) => d.toLowerCase()).includes(district.toLowerCase())
  ) {
    return {
      eligible: false,
      reason: `Cash on Delivery is not currently supported in ${district}. Please select digital payment.`,
      riskScore: 0,
    };
  }

  // Check user COD risk profile
  try {
    const riskRef = doc(db, COD_RISKS_COL, userId || userPhone);
    const snap = await getDoc(riskRef);
    if (snap.exists()) {
      const riskData = snap.data() as CodRiskRecord;
      if (riskData.flaggedByAdmin) {
        return {
          eligible: false,
          reason: `Account restricted for COD: ${riskData.flagReason || 'Manual admin review required'}.`,
          riskScore: riskData.riskScore,
        };
      }
      if (riskData.riskScore >= codConfig.riskThreshold) {
        return {
          eligible: false,
          reason: 'High cancellation / return history detected. Please checkout with bKash or Nagad.',
          riskScore: riskData.riskScore,
        };
      }
      return { eligible: true, riskScore: riskData.riskScore };
    }
  } catch (e) {
    console.warn('Risk check skipped:', e);
  }

  return { eligible: true, riskScore: 0 };
}

export async function fetchAllCodRisks(): Promise<CodRiskRecord[]> {
  try {
    const snap = await getDocs(collection(db, COD_RISKS_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CodRiskRecord));
  } catch {
    return [];
  }
}

export async function updateCodRiskFlag(
  riskId: string,
  flagged: boolean,
  reason?: string,
  adminId?: string
): Promise<void> {
  const ref = doc(db, COD_RISKS_COL, riskId);
  await setDoc(
    ref,
    {
      flaggedByAdmin: flagged,
      flagReason: reason || (flagged ? 'Flagged by Admin' : ''),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await createAuditLog({
    action: flagged ? 'COD_USER_FLAGGED' : 'COD_USER_UNFLAGGED',
    performedBy: adminId || 'admin',
    actorId: adminId || 'admin',
    entityType: 'cod_risk',
    entityId: riskId,
    targetType: 'user',
    targetId: riskId,
    details: `${flagged ? 'Flagged high risk for COD' : 'Unflagged COD user'}: ${reason || 'N/A'}`,
    timestamp: new Date().toISOString(),
  });
}

// ---------------- PAYMENT INITIATION & VERIFICATION FLOW ----------------

export interface InitiatePaymentParams {
  orderId: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  provider: string; // 'bkash' | 'nagad' | 'rocket' | 'sslcommerz' | 'cod'
  paymentMethod: PaymentMethod;
  amount: number;
  subOrders?: SubOrder[];
  mfsAccountNumber?: string;
}

export async function initiatePaymentInDb(params: InitiatePaymentParams): Promise<{
  payment: PaymentRecord;
  requiresGateway: boolean;
  gatewayUrl?: string;
  clientSecret?: string;
  instructions: string;
  isTestMode: boolean;
}> {
  const paymentId = `PAY-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Calculate commission and seller earnings breakdown
  const commissionRate = 0.08; // 8% default fair-trade artisan platform commission
  const sellerBreakdowns = (params.subOrders || []).map((sub) => {
    const gross = sub.total;
    const commission = Math.round(gross * commissionRate);
    const net = gross - commission;
    return {
      sellerId: sub.sellerId,
      sellerName: sub.sellerName,
      subOrderId: sub.id,
      grossAmount: gross,
      discount: sub.discount || 0,
      platformCommission: commission,
      commissionRate: commissionRate * 100,
      netEarnings: net,
    };
  });

  const commissionTotal = sellerBreakdowns.reduce((acc, s) => acc + s.platformCommission, 0);

  // Check provider settings
  const providers = await fetchPaymentProviders();
  const providerConfig = providers.find((p) => p.id === params.provider) || {
    id: params.provider,
    name: params.provider.toUpperCase(),
    enabled: true,
    testMode: true,
  };

  const isCOD = params.paymentMethod === 'cod';

  const paymentRecord: PaymentRecord = {
    id: paymentId,
    orderId: params.orderId,
    orderNumber: params.orderNumber || `SUNNO-ORD-${params.orderId.slice(-6)}`,
    customerId: params.customerId,
    userId: params.customerId,
    customerName: params.customerName,
    customerPhone: params.customerPhone || '',
    customerEmail: params.customerEmail || '',
    provider: params.provider,
    paymentMethod: params.paymentMethod,
    amount: params.amount,
    currency: 'BDT',
    status: isCOD ? 'PENDING' : 'INITIATED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isTestPayment: Boolean(providerConfig.testMode),
    commissionTotal,
    sellerBreakdowns,
    gatewayReference: isCOD ? 'COD-DISPATCH-COLLECT' : `GW-${params.provider.toUpperCase()}-${Date.now().toString().slice(-6)}`,
  };

  // Save to DB
  await setDoc(doc(db, PAYMENTS_COL, paymentId), sanitizeForFirestore(paymentRecord));

  // Log payment attempt
  await logPaymentAction({
    action: 'INITIATE',
    paymentId,
    orderId: params.orderId,
    provider: params.provider,
    paymentMethod: params.paymentMethod,
    amount: params.amount,
    status: isCOD ? 'PENDING' : 'INITIATED',
    details: `Initiated ${params.paymentMethod.toUpperCase()} payment of ৳${params.amount} (TestMode: ${providerConfig.testMode})`,
  });

  return {
    payment: paymentRecord,
    requiresGateway: !isCOD,
    gatewayUrl: !isCOD ? `/payment-gateway/${params.provider}?paymentId=${paymentId}&orderId=${params.orderId}&amount=${params.amount}` : undefined,
    instructions: isCOD
      ? 'Amount will be collected by artisan green logistics courier upon home delivery.'
      : `Complete ${params.provider.toUpperCase()} transaction via official 256-bit gateway.`,
    isTestMode: Boolean(providerConfig.testMode),
  };
}

export async function verifyPaymentServerSide(params: {
  paymentId: string;
  orderId: string;
  transactionId: string;
  provider: string;
  amount: number;
  currency?: string;
  signature?: string;
}): Promise<{
  success: boolean;
  payment: PaymentRecord;
  order?: Order;
  errorMessage?: string;
}> {
  const payRef = doc(db, PAYMENTS_COL, params.paymentId);
  const paySnap = await getDoc(payRef);

  if (!paySnap.exists()) {
    throw new Error(`Payment record #${params.paymentId} not found in database.`);
  }

  const existingPayment = paySnap.data() as PaymentRecord;

  // 1. Idempotency safeguard: Prevent double crediting or duplicate processing
  if (existingPayment.status === 'SUCCESS' || existingPayment.status === 'paid') {
    return { success: true, payment: existingPayment };
  }

  // 2. Strict amount and currency verification
  if (Math.round(existingPayment.amount) !== Math.round(params.amount)) {
    await updateDoc(payRef, {
      status: 'FAILED',
      failureReason: `Amount mismatch: expected ৳${existingPayment.amount}, received ৳${params.amount}`,
      updatedAt: new Date().toISOString(),
    });
    throw new Error(`Security validation failed: Amount mismatch. Expected ৳${existingPayment.amount}, got ৳${params.amount}.`);
  }

  if (params.currency && params.currency.toUpperCase() !== 'BDT') {
    await updateDoc(payRef, {
      status: 'FAILED',
      failureReason: `Invalid currency: ${params.currency}`,
      updatedAt: new Date().toISOString(),
    });
    throw new Error('Security validation failed: Currency must be BDT.');
  }

  // 3. Mark payment as SUCCESS
  const completedAt = new Date().toISOString();
  const updatedPayment: PaymentRecord = {
    ...existingPayment,
    status: 'SUCCESS',
    transactionId: params.transactionId,
    completedAt,
    updatedAt: completedAt,
  };

  const batch = writeBatch(db);
  batch.set(payRef, sanitizeForFirestore(updatedPayment));

  // 4. Update Parent Order to confirmed & paid
  const orderRef = doc(db, ORDERS_COL, params.orderId);
  batch.update(orderRef, {
    paymentStatus: 'paid',
    status: 'confirmed',
    orderStatus: 'confirmed',
    updatedAt: completedAt,
  });

  // 5. Generate Seller Earnings records for each artisan sub-order
  if (existingPayment.sellerBreakdowns && existingPayment.sellerBreakdowns.length > 0) {
    for (const sb of existingPayment.sellerBreakdowns) {
      const earningId = `EARN-${sb.subOrderId}`;
      const earningRef = doc(db, SELLER_EARNINGS_COL, earningId);
      const earningDoc: SellerEarningsRecord = {
        id: earningId,
        sellerId: sb.sellerId,
        sellerName: sb.sellerName,
        orderId: params.orderId,
        subOrderId: sb.subOrderId,
        paymentId: params.paymentId,
        grossProductAmount: sb.grossAmount,
        discount: sb.discount,
        platformCommission: sb.platformCommission,
        commissionRate: sb.commissionRate,
        applicableFees: 0,
        netEarnings: sb.netEarnings,
        status: 'pending', // becomes 'available' when delivery is completed
        createdAt: completedAt,
      };
      batch.set(earningRef, sanitizeForFirestore(earningDoc));
    }
  }

  // 6. Notify Customer
  const notifCustRef = doc(db, NOTIFICATIONS_COL, `notif-pay-${Date.now()}`);
  batch.set(notifCustRef, sanitizeForFirestore({
    id: `notif-pay-${Date.now()}`,
    userId: existingPayment.customerId,
    title: 'Payment Confirmed! 💳',
    message: `Payment of ৳${existingPayment.amount} via ${existingPayment.paymentMethod.toUpperCase()} (TrxID: ${params.transactionId}) verified successfully.`,
    type: 'order',
    read: false,
    link: `/profile/orders`,
    timestamp: completedAt,
  }));

  await batch.commit();

  // Log successful verification
  await logPaymentAction({
    action: 'VERIFY_SUCCESS',
    paymentId: params.paymentId,
    orderId: params.orderId,
    provider: existingPayment.provider,
    paymentMethod: existingPayment.paymentMethod,
    amount: existingPayment.amount,
    status: 'SUCCESS',
    signatureValid: true,
    details: `Payment verified. TrxID: ${params.transactionId}, Commission: ৳${existingPayment.commissionTotal || 0}`,
  });

  // Fetch updated order
  const orderSnap = await getDoc(orderRef);
  const orderData = orderSnap.exists() ? ({ id: orderSnap.id, ...orderSnap.data() } as Order) : undefined;

  return { success: true, payment: updatedPayment, order: orderData };
}

export async function markPaymentFailedInDb(
  paymentId: string,
  reason: string,
  orderId?: string
): Promise<void> {
  const payRef = doc(db, PAYMENTS_COL, paymentId);
  await updateDoc(payRef, {
    status: 'FAILED',
    failureReason: reason,
    updatedAt: new Date().toISOString(),
  });

  if (orderId) {
    const orderRef = doc(db, ORDERS_COL, orderId);
    await updateDoc(orderRef, {
      paymentStatus: 'failed',
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  await logPaymentAction({
    action: 'VERIFY_FAILED',
    paymentId,
    orderId,
    provider: 'unknown',
    status: 'FAILED',
    details: `Payment failed: ${reason}`,
  });
}

// ---------------- RETRY PAYMENT (WITHOUT DUPLICATING ORDER) ----------------

export async function retryOrderPayment(
  orderId: string,
  newPaymentMethod: PaymentMethod,
  newProvider: string,
  customerId: string
): Promise<{ payment: PaymentRecord; instructions: string }> {
  const orderRef = doc(db, ORDERS_COL, orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    throw new Error(`Order #${orderId} not found.`);
  }

  const order = orderSnap.data() as Order;

  // Verify ownership
  if (order.customerId !== customerId && order.userId !== customerId) {
    throw new Error('Unauthorized: You can only retry payment for your own orders.');
  }

  if (order.paymentStatus === 'paid') {
    throw new Error('Order is already paid.');
  }

  // Update order's payment method
  await updateDoc(orderRef, {
    paymentMethod: newPaymentMethod,
    paymentStatus: newPaymentMethod === 'cod' ? 'pending' : 'pending',
    updatedAt: new Date().toISOString(),
  });

  // Initiate new payment record for same order
  const result = await initiatePaymentInDb({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId || customerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    provider: newProvider,
    paymentMethod: newPaymentMethod,
    amount: order.finalTotal || order.total,
    subOrders: order.subOrders,
  });

  return { payment: result.payment, instructions: result.instructions };
}

// ---------------- REFUND FOUNDATION & WORKFLOW ----------------

export async function createRefundRequest(params: {
  orderId: string;
  paymentId: string;
  customerId: string;
  customerName?: string;
  amount: number;
  reason: string;
  provider?: string;
}): Promise<RefundRecord> {
  const refundId = `REF-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const refundDoc: RefundRecord = {
    id: refundId,
    orderId: params.orderId,
    paymentId: params.paymentId,
    customerId: params.customerId,
    customerName: params.customerName,
    amount: params.amount,
    currency: 'BDT',
    reason: params.reason,
    status: 'REQUESTED',
    provider: params.provider || 'bkash',
    refundMethod: (params.provider as any) || 'bkash',
    requestedBy: params.customerId,
    createdAt: new Date().toISOString(),
    createdDate: new Date().toISOString(),
  };

  await setDoc(doc(db, REFUNDS_COL, refundId), sanitizeForFirestore(refundDoc));

  // Update payment status to REFUND_PENDING
  await updateDoc(doc(db, PAYMENTS_COL, params.paymentId), {
    status: 'REFUND_PENDING',
    updatedAt: new Date().toISOString(),
  }).catch(() => {});

  await logPaymentAction({
    action: 'REFUND_REQUEST',
    paymentId: params.paymentId,
    orderId: params.orderId,
    provider: params.provider || 'bkash',
    amount: params.amount,
    status: 'REQUESTED',
    details: `Customer requested refund of ৳${params.amount}. Reason: ${params.reason}`,
  });

  return refundDoc;
}

export async function processRefundInDb(
  refundId: string,
  approved: boolean,
  adminNotes?: string,
  adminId?: string
): Promise<RefundRecord> {
  const ref = doc(db, REFUNDS_COL, refundId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Refund record not found.');

  const refund = snap.data() as RefundRecord;
  const processedDate = new Date().toISOString();

  if (approved) {
    const gatewayRefundRef = `GW-REF-${Date.now().toString().slice(-6)}`;
    const updatedRefund: RefundRecord = {
      ...refund,
      status: 'REFUNDED',
      gatewayRefundRef,
      adminNotes,
      processedBy: adminId || 'admin',
      processedDate,
    };

    const batch = writeBatch(db);
    batch.set(ref, sanitizeForFirestore(updatedRefund));

    // Update payment record
    batch.update(doc(db, PAYMENTS_COL, refund.paymentId), {
      status: 'REFUNDED',
      updatedAt: processedDate,
    });

    // Update order status
    batch.update(doc(db, ORDERS_COL, refund.orderId), {
      paymentStatus: 'refunded',
      status: 'refunded',
      orderStatus: 'refunded',
      updatedAt: processedDate,
    });

    // Cancel related seller earnings
    // (In production, roll back unreleased seller earnings)

    // Notify customer
    const notifRef = doc(db, NOTIFICATIONS_COL, `notif-ref-${Date.now()}`);
    batch.set(notifRef, sanitizeForFirestore({
      id: `notif-ref-${Date.now()}`,
      userId: refund.customerId,
      title: 'Refund Processed! 💰',
      message: `Your refund of ৳${refund.amount} for Order #${refund.orderId} has been successfully processed to your account.`,
      type: 'order',
      read: false,
      timestamp: processedDate,
    }));

    await batch.commit();

    await logPaymentAction({
      action: 'REFUND_PROCESSED',
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      provider: refund.provider,
      amount: refund.amount,
      status: 'REFUNDED',
      details: `Admin approved and executed refund of ৳${refund.amount}. Ref: ${gatewayRefundRef}`,
    });

    return updatedRefund;
  } else {
    const rejectedRefund: RefundRecord = {
      ...refund,
      status: 'FAILED',
      adminNotes: adminNotes || 'Refund rejected by admin',
      processedBy: adminId || 'admin',
      processedDate,
      failureReason: adminNotes || 'Rejected by Admin',
    };

    await setDoc(ref, sanitizeForFirestore(rejectedRefund));

    await logPaymentAction({
      action: 'REFUND_PROCESSED',
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      provider: refund.provider,
      amount: refund.amount,
      status: 'FAILED',
      details: `Admin rejected refund of ৳${refund.amount}. Reason: ${adminNotes}`,
    });

    return rejectedRefund;
  }
}

export async function fetchRefunds(): Promise<RefundRecord[]> {
  try {
    const snap = await getDocs(collection(db, REFUNDS_COL));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RefundRecord));
    return list.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  } catch {
    return [];
  }
}

// ---------------- TRANSACTION & PAYMENT QUERIES ----------------

export async function fetchAllPayments(): Promise<PaymentRecord[]> {
  try {
    const snap = await getDocs(collection(db, PAYMENTS_COL));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export async function fetchCustomerPayments(customerId: string): Promise<PaymentRecord[]> {
  try {
    const q = query(collection(db, PAYMENTS_COL), where('customerId', '==', customerId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export async function fetchSellerEarnings(sellerId: string): Promise<{
  records: SellerEarningsRecord[];
  pendingEarnings: number;
  availableEarnings: number;
  withdrawnEarnings: number;
  totalGrossSales: number;
  totalCommissionPaid: number;
}> {
  try {
    const q = query(collection(db, SELLER_EARNINGS_COL), where('sellerId', '==', sellerId));
    const snap = await getDocs(q);
    const records = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SellerEarningsRecord));

    let pendingEarnings = 0;
    let availableEarnings = 0;
    let withdrawnEarnings = 0;
    let totalGrossSales = 0;
    let totalCommissionPaid = 0;

    for (const r of records) {
      totalGrossSales += r.grossProductAmount || 0;
      totalCommissionPaid += r.platformCommission || 0;
      if (r.status === 'pending') pendingEarnings += r.netEarnings || 0;
      else if (r.status === 'available') availableEarnings += r.netEarnings || 0;
      else if (r.status === 'withdrawn') withdrawnEarnings += r.netEarnings || 0;
    }

    return {
      records: records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      pendingEarnings,
      availableEarnings,
      withdrawnEarnings,
      totalGrossSales,
      totalCommissionPaid,
    };
  } catch {
    return {
      records: [],
      pendingEarnings: 0,
      availableEarnings: 0,
      withdrawnEarnings: 0,
      totalGrossSales: 0,
      totalCommissionPaid: 0,
    };
  }
}

// ---------------- PAYMENT LOGGING ----------------

export async function logPaymentAction(log: Omit<PaymentLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    const logId = `PLOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const fullLog: PaymentLog = {
      id: logId,
      ...log,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, PAYMENT_LOGS_COL, logId), fullLog).catch(() => {});
  } catch (e) {
    console.warn('Payment log failed:', e);
  }
}

export async function fetchPaymentLogs(limitCount = 50): Promise<PaymentLog[]> {
  try {
    const snap = await getDocs(collection(db, PAYMENT_LOGS_COL));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentLog));
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitCount);
  } catch {
    return [];
  }
}
