import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import {
  CourierProviderConfig,
  CourierProviderId,
  DeliverySetting,
  Shipment,
  ShipmentStatus,
  ShipmentLog,
  DeliveryRateOption,
  DeliveryCalculationParams,
  PackageInfo,
  UserAddress,
  Invoice,
  Order,
  SubOrder,
} from '../types';

export const DEFAULT_DELIVERY_SETTINGS: DeliverySetting = {
  id: 'global-delivery-settings',
  defaultCourierId: 'sunno_eco',
  defaultInsideDhaka: 60,
  defaultOutsideDhaka: 120,
  freeDeliveryThreshold: 2500,
  insideDhakaBaseRate: 60,
  outsideDhakaBaseRate: 120,
  interDistrictBaseRate: 130,
  weightRatePerKg: 20,
  expressDeliverySurcharge: 50,
  ecoPackagingDiscount: 10,
  estimatedDaysInsideDhaka: '24-48 Hours',
  estimatedDaysOutsideDhaka: '2-4 Days',
};

export const DEFAULT_COURIER_PROVIDERS: CourierProviderConfig[] = [
  {
    id: 'sunno_eco',
    name: 'SUNNO Direct Eco-Dispatch',
    slug: 'sunno-eco',
    logoUrl: '/favicon.ico',
    enabled: true,
    testMode: false,
    hasCredentials: true,
    supportedZones: ['inside_dhaka', 'outside_dhaka', 'all_64_districts'],
    supportedServiceTypes: ['standard', 'express'],
    codSupported: true,
    trackingSupported: true,
    returnSupported: true,
    baseRateInside: 50,
    baseRateOutside: 100,
    weightRatePerKg: 15,
    codFeePercent: 0,
    estimatedDaysInside: '1-2 Days (Electric Cargo)',
    estimatedDaysOutside: '2-3 Days (Co-op River & Road)',
    apiDocsUrl: 'https://sunno.eco/logistics',
    instructions: 'Direct Zero-Carbon Artisan Cooperative routing. Plastic-free biodegradable packaging mandatory.',
  },
  {
    id: 'steadfast',
    name: 'Steadfast Courier',
    slug: 'steadfast',
    logoUrl: 'https://portal.steadfast.com.bd/static/media/logo.17ecfe05.png',
    enabled: true,
    testMode: true,
    hasCredentials: true,
    supportedZones: ['inside_dhaka', 'outside_dhaka', 'all_64_districts'],
    supportedServiceTypes: ['standard', 'express'],
    codSupported: true,
    trackingSupported: true,
    returnSupported: true,
    baseRateInside: 60,
    baseRateOutside: 120,
    weightRatePerKg: 20,
    codFeePercent: 1.0,
    estimatedDaysInside: '24-48 Hours',
    estimatedDaysOutside: '2-4 Days',
    apiDocsUrl: 'https://portal.steadfast.com.bd/api-doc',
    instructions: 'Nationwide coverage in all 64 districts and 490+ Upazilas.',
  },
  {
    id: 'pathao',
    name: 'Pathao Courier',
    slug: 'pathao',
    logoUrl: 'https://pathao.com/wp-content/uploads/2019/04/Pathao-logo-dark.png',
    enabled: true,
    testMode: true,
    hasCredentials: false,
    supportedZones: ['inside_dhaka', 'outside_dhaka', 'all_64_districts'],
    supportedServiceTypes: ['standard', 'express', 'same_day'],
    codSupported: true,
    trackingSupported: true,
    returnSupported: true,
    baseRateInside: 65,
    baseRateOutside: 130,
    weightRatePerKg: 25,
    codFeePercent: 1.0,
    estimatedDaysInside: '24-36 Hours',
    estimatedDaysOutside: '2-3 Days',
    apiDocsUrl: 'https://merchant.pathao.com/developer-api',
  },
  {
    id: 'redx',
    name: 'RedX Logistics',
    slug: 'redx',
    logoUrl: 'https://redx.com.bd/static/media/redx-logo.c92ff816.svg',
    enabled: true,
    testMode: true,
    hasCredentials: false,
    supportedZones: ['inside_dhaka', 'outside_dhaka', 'all_64_districts'],
    supportedServiceTypes: ['standard', 'express'],
    codSupported: true,
    trackingSupported: true,
    returnSupported: true,
    baseRateInside: 60,
    baseRateOutside: 125,
    weightRatePerKg: 20,
    codFeePercent: 1.0,
    estimatedDaysInside: '24-48 Hours',
    estimatedDaysOutside: '3-4 Days',
    apiDocsUrl: 'https://redx.com.bd/developer-guide',
  },
  {
    id: 'paperfly',
    name: 'Paperfly Go-Fly',
    slug: 'paperfly',
    logoUrl: 'https://paperfly.com.bd/images/logo.png',
    enabled: true,
    testMode: true,
    hasCredentials: false,
    supportedZones: ['inside_dhaka', 'outside_dhaka', 'all_64_districts'],
    supportedServiceTypes: ['standard', 'express'],
    codSupported: true,
    trackingSupported: true,
    returnSupported: true,
    baseRateInside: 60,
    baseRateOutside: 110,
    weightRatePerKg: 20,
    codFeePercent: 1.0,
    estimatedDaysInside: '24-48 Hours',
    estimatedDaysOutside: '3-5 Days (Deep Union Reach)',
    apiDocsUrl: 'https://paperfly.com.bd/api-doc',
  },
  {
    id: 'ecourier',
    name: 'eCourier Bangladesh',
    slug: 'ecourier',
    logoUrl: 'https://ecourier.com.bd/wp-content/uploads/2021/04/eCourier-logo.png',
    enabled: false,
    testMode: true,
    hasCredentials: false,
    supportedZones: ['inside_dhaka', 'outside_dhaka'],
    supportedServiceTypes: ['standard', 'express'],
    codSupported: true,
    trackingSupported: true,
    returnSupported: true,
    baseRateInside: 60,
    baseRateOutside: 120,
    weightRatePerKg: 20,
    codFeePercent: 1.0,
    estimatedDaysInside: '24-48 Hours',
    estimatedDaysOutside: '2-4 Days',
    apiDocsUrl: 'https://ecourier.com.bd/api-doc',
  },
];

export async function fetchCourierProviders(): Promise<CourierProviderConfig[]> {
  try {
    const snap = await getDocs(collection(db, 'courier_providers'));
    if (snap.empty) {
      // Seed default configs if first time
      for (const prov of DEFAULT_COURIER_PROVIDERS) {
        await setDoc(doc(db, 'courier_providers', prov.id), prov, { merge: true });
      }
      return DEFAULT_COURIER_PROVIDERS;
    }
    return snap.docs.map((d) => d.data() as CourierProviderConfig);
  } catch (err) {
    console.warn('[Courier] Error reading provider configs:', err);
    return DEFAULT_COURIER_PROVIDERS;
  }
}

export async function updateCourierProviderConfig(
  providerId: CourierProviderId,
  data: Partial<CourierProviderConfig>
): Promise<CourierProviderConfig> {
  const currentProviders = await fetchCourierProviders();
  const current = currentProviders.find((p) => p.id === providerId) || DEFAULT_COURIER_PROVIDERS.find((p) => p.id === providerId);
  const updated: CourierProviderConfig = {
    ...(current as CourierProviderConfig),
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'courier_providers', providerId), updated, { merge: true });
  return updated;
}

export async function fetchDeliverySettings(): Promise<DeliverySetting> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'delivery_settings'));
    if (snap.exists()) {
      return { ...DEFAULT_DELIVERY_SETTINGS, ...snap.data() } as DeliverySetting;
    }
    await setDoc(doc(db, 'settings', 'delivery_settings'), DEFAULT_DELIVERY_SETTINGS, { merge: true });
    return DEFAULT_DELIVERY_SETTINGS;
  } catch (err) {
    console.warn('[Fetch Delivery Settings]:', err);
    return DEFAULT_DELIVERY_SETTINGS;
  }
}

export async function updateDeliverySettings(
  data: Partial<DeliverySetting>
): Promise<DeliverySetting> {
  const current = await fetchDeliverySettings();
  const updated: DeliverySetting = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'settings', 'delivery_settings'), updated, { merge: true });
  return updated;
}

export async function calculateCourierRates(
  params: DeliveryCalculationParams
): Promise<DeliveryRateOption[]> {
  try {
    const res = await fetch('/api/courier/calculate-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.rates) {
        return data.rates;
      }
    }
  } catch (err) {
    console.warn('[Courier Rate API Call]:', err);
  }

  // Fallback calculation in client
  const isInsideDhaka =
    params.sellerDistrict.toLowerCase().includes('dhaka') &&
    params.customerDistrict.toLowerCase().includes('dhaka');

  const providers = await fetchCourierProviders();
  const weight = params.weightKg || 0.5;
  const isFree = (params.orderTotal || 0) >= 2500;

  return providers
    .filter((p) => p.enabled)
    .map((p) => {
      const base = isInsideDhaka ? p.baseRateInside : p.baseRateOutside;
      const weightSurcharge = weight > 1 ? Math.ceil(weight - 1) * p.weightRatePerKg : 0;
      const codFee = params.isCod && p.codFeePercent > 0 && params.orderTotal ? Math.round(params.orderTotal * (p.codFeePercent / 100)) : 0;
      const total = base + weightSurcharge + codFee;

      return {
        courierId: p.id,
        courierName: p.name,
        logoUrl: p.logoUrl,
        serviceType: params.serviceType || 'standard',
        charge: isFree ? 0 : total,
        estimatedDeliveryDays: isInsideDhaka ? p.estimatedDaysInside : p.estimatedDaysOutside,
        isFreeDelivery: isFree,
        freeDeliveryReason: isFree ? 'Cooperative Eco-Order over ৳2,500' : undefined,
        codFee,
        totalWithCod: isFree ? codFee : total,
        isEcoPreferred: p.id === 'sunno_eco',
      };
    });
}

export async function createShipmentConsignment(params: {
  orderId: string;
  orderNumber: string;
  subOrderId: string;
  sellerId: string;
  sellerName: string;
  storeName?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  courierId: CourierProviderId;
  pickupAddress: {
    fullName: string;
    phone: string;
    division: string;
    district: string;
    upazila?: string;
    streetAddress: string;
  };
  deliveryAddress: UserAddress;
  packageInfo: PackageInfo;
  serviceType: 'standard' | 'express' | 'same_day';
  codAmount: number;
  deliveryInstructions?: string;
  userEmail?: string;
}): Promise<Shipment> {
  const shipmentId = `SHIP-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

  let apiResult: any = null;
  try {
    const res = await fetch('/api/courier/shipments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipmentId,
        ...params,
      }),
    });
    if (res.ok) {
      apiResult = await res.json();
    }
  } catch (err) {
    console.warn('[Create Shipment API Call Failed]:', err);
  }

  const providers = await fetchCourierProviders();
  const provider = providers.find((p) => p.id === params.courierId) || providers[0];

  const now = new Date().toISOString();
  const trackingNumber =
    apiResult?.trackingNumber ||
    `TRK-${params.courierId.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

  const newShipment: Shipment = {
    id: shipmentId,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    subOrderId: params.subOrderId,
    sellerId: params.sellerId,
    sellerName: params.sellerName,
    storeName: params.storeName,
    customerId: params.customerId,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    customerEmail: params.customerEmail,
    courierId: params.courierId,
    courierName: provider.name,
    consignmentId: apiResult?.consignmentId || `CID-${shipmentId}`,
    trackingNumber,
    trackingUrl: apiResult?.trackingUrl || `https://sunno.eco/track/${trackingNumber}`,
    serviceType: params.serviceType,
    packageInfo: params.packageInfo,
    status: (apiResult?.initialStatus as ShipmentStatus) || 'PICKUP_REQUESTED',
    statusLogs: apiResult?.statusLogs || [
      {
        status: 'READY_FOR_SHIPMENT',
        title: 'Artisan Packaged with Sustainable Materials',
        description: `Secured in 100% natural ${params.packageInfo.ecoPackagingType.replace(/_/g, ' ')}. Weight: ${params.packageInfo.weight} kg.`,
        location: `${params.pickupAddress.district} Artisan Hub`,
        timestamp: now,
        updatedBy: params.sellerName,
      },
      {
        status: 'PICKUP_REQUESTED',
        title: `${provider.name} Pickup Dispatched`,
        description: `Consignment registered for doorstep collection. Tracking: ${trackingNumber}`,
        location: `${params.pickupAddress.district} Logistics Hub`,
        timestamp: now,
        updatedBy: 'SUNNO Logistics Dispatcher',
      },
    ],
    codAmount: params.codAmount,
    collectedAmount: 0,
    collectionStatus: params.codAmount > 0 ? 'pending' : 'remitted',
    deliveryFee: apiResult?.deliveryFee || 60,
    estimatedDeliveryDate: apiResult?.estimatedDeliveryDate || new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    pickupAddress: params.pickupAddress,
    deliveryAddress: params.deliveryAddress,
    deliveryInstructions: params.deliveryInstructions,
    createdAt: now,
    updatedAt: now,
  };

  // Save to Firestore
  await setDoc(doc(db, 'shipments', shipmentId), sanitizeForFirestore(newShipment));

  // Update sub-order status
  try {
    await updateDoc(doc(db, 'sub_orders', params.subOrderId), {
      status: 'shipped',
      trackingNumber,
      courierName: provider.name,
      updatedAt: now,
    });
  } catch (err) {
    console.warn('[Update SubOrder Status]:', err);
  }

  return newShipment;
}

export async function updateShipmentStatus(
  shipmentId: string,
  newStatus: ShipmentStatus,
  location?: string,
  note?: string,
  updatedBy?: string
): Promise<Shipment | null> {
  const ref = doc(db, 'shipments', shipmentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const current = snap.data() as Shipment;
  const now = new Date().toISOString();

  const statusTitleMap: Record<ShipmentStatus, string> = {
    PENDING: 'Shipment Created',
    READY_FOR_SHIPMENT: 'Packaged & Ready for Dispatch',
    PICKUP_REQUESTED: 'Courier Pickup Requested',
    PICKED_UP: 'Parcel Picked Up by Courier',
    IN_TRANSIT: 'In Transit to Destination Hub',
    OUT_FOR_DELIVERY: 'Out for Doorstep Delivery',
    DELIVERED: 'Successfully Delivered to Customer',
    DELIVERY_FAILED: 'Delivery Attempt Failed / Customer Unavailable',
    RTO_REQUESTED: 'Return to Origin (RTO) Initiated',
    RTO_IN_TRANSIT: 'RTO Parcel in Transit back to Artisan',
    RTO_DELIVERED: 'RTO Parcel Returned to Artisan Workshop',
    RETURN_REQUESTED: 'Customer Requested Return',
    RETURN_APPROVED: 'Return Request Approved by SUNNO',
    RETURN_IN_TRANSIT: 'Return Parcel in Transit',
    RETURNED: 'Item Returned & Inspected',
    CANCELLED: 'Shipment Cancelled',
  };

  const newLog: ShipmentLog = {
    status: newStatus,
    title: statusTitleMap[newStatus] || newStatus,
    description: note || `Parcel status updated to ${newStatus.replace(/_/g, ' ')}.`,
    location: location || current.pickupAddress.district,
    timestamp: now,
    updatedBy: updatedBy || 'Logistics Admin',
  };

  const updatedLogs = [...(current.statusLogs || []), newLog];

  const updateData: Partial<Shipment> = {
    status: newStatus,
    statusLogs: updatedLogs,
    updatedAt: now,
  };

  if (newStatus === 'DELIVERED') {
    updateData.actualDeliveryDate = now;
    if (current.codAmount > 0) {
      updateData.collectedAmount = current.codAmount;
      updateData.collectionStatus = 'collected';
    }
  }

  await updateDoc(ref, updateData);

  // Sync sub-order status
  try {
    let subStatus = 'processing';
    if (newStatus === 'PICKED_UP' || newStatus === 'IN_TRANSIT' || newStatus === 'OUT_FOR_DELIVERY') {
      subStatus = 'shipped';
    } else if (newStatus === 'DELIVERED') {
      subStatus = 'delivered';
    } else if (newStatus === 'CANCELLED') {
      subStatus = 'cancelled';
    } else if (newStatus === 'RTO_DELIVERED' || newStatus === 'RETURNED') {
      subStatus = 'returned';
    }

    await updateDoc(doc(db, 'sub_orders', current.subOrderId), {
      status: subStatus,
      updatedAt: now,
    });
  } catch (err) {
    console.warn('[Sync SubOrder with Shipment Status]:', err);
  }

  return {
    ...current,
    ...updateData,
  } as Shipment;
}

export async function fetchShipmentsBySeller(sellerId: string): Promise<Shipment[]> {
  try {
    const q = query(
      collection(db, 'shipments'),
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Shipment);
  } catch (err) {
    console.warn('[Fetch Seller Shipments]:', err);
    // Fallback without compound index if needed
    const q2 = query(collection(db, 'shipments'), where('sellerId', '==', sellerId));
    const snap2 = await getDocs(q2);
    return snap2.docs.map((d) => d.data() as Shipment);
  }
}

export async function fetchShipmentsByCustomer(customerId: string): Promise<Shipment[]> {
  try {
    const q = query(
      collection(db, 'shipments'),
      where('customerId', '==', customerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Shipment);
  } catch (err) {
    console.warn('[Fetch Customer Shipments]:', err);
    return [];
  }
}

export async function fetchShipmentByTrackingNumber(trackingNumber: string): Promise<Shipment | null> {
  try {
    const q = query(
      collection(db, 'shipments'),
      where('trackingNumber', '==', trackingNumber)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Shipment;
    }
  } catch (err) {
    console.warn('[Fetch Tracking Number]:', err);
  }
  return null;
}

export async function fetchShipmentsBySubOrder(subOrderId: string): Promise<Shipment[]> {
  try {
    const q = query(
      collection(db, 'shipments'),
      where('subOrderId', '==', subOrderId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Shipment);
  } catch (err) {
    console.warn('[Fetch Shipments By SubOrder]:', err);
    return [];
  }
}

export async function fetchShipmentsByOrder(orderId: string): Promise<Shipment[]> {
  try {
    const q = query(
      collection(db, 'shipments'),
      where('orderId', '==', orderId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Shipment);
  } catch (err) {
    console.warn('[Fetch Shipments By Order]:', err);
    return [];
  }
}

export async function getOfficialInvoiceForOrder(orderId: string): Promise<Invoice | null> {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) {
      return null;
    }
    const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
    const shipments = await fetchShipmentsByOrder(orderId);
    return generateInvoiceFromOrder(orderData, shipments[0] || null);
  } catch (err) {
    console.warn('[Get Official Invoice]:', err);
    return null;
  }
}

export async function fetchAllShipments(): Promise<Shipment[]> {
  try {
    const snap = await getDocs(collection(db, 'shipments'));
    return snap.docs.map((d) => d.data() as Shipment);
  } catch (err) {
    console.warn('[Fetch All Shipments]:', err);
    return [];
  }
}

export function generateInvoiceFromOrder(order: Order, shipment?: Shipment | null): Invoice {
  const now = new Date();
  const invoiceNumber = `INV-${now.getFullYear()}-${order.orderNumber?.replace(/[^0-9]/g, '') || Date.now().toString().slice(-6)}`;

  const items = (order.items || []).map((item) => ({
    productId: item.productId,
    title: item.title,
    sellerName: item.sellerName || 'Artisan Workshop',
    districtOrigin: 'Bangladesh Rural Cooperative',
    quantity: item.quantity,
    unitPrice: item.price,
    totalPrice: item.price * item.quantity,
    ecoTypes: item.ecoTypes,
  }));

  const safeAddress = order.shippingAddress || {
    id: `addr-${order.id}`,
    fullName: order.customerName || 'Conscious Buyer',
    phone: order.customerPhone || '+880 1700-000000',
    streetAddress: order.customerAddress || 'Address on file',
    district: order.district || 'Dhaka',
    division: order.division || 'Dhaka',
  };

  const safeSubtotal = Number(order.subtotal ?? order.total ?? items.reduce((acc, curr) => acc + curr.totalPrice, 0));
  const safeDiscount = Number(order.discount ?? 0);
  const safeDelivery = Number(order.deliveryFee ?? order.shippingFee ?? 60);
  const safeGrandTotal = Number(order.finalTotal ?? order.total ?? Math.max(0, safeSubtotal - safeDiscount + safeDelivery));

  const qrPayload = JSON.stringify({
    inv: invoiceNumber,
    ord: order.orderNumber || order.id,
    dt: order.createdAt,
    tot: safeGrandTotal,
    pay: order.paymentMethod,
    trk: shipment?.trackingNumber || order.trackingNumber || 'Pending',
    coop: 'SUNNO Green Cooperative Guild',
  });

  return {
    invoiceNumber,
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    orderDate: order.createdAt || now.toISOString(),
    invoiceDate: now.toISOString(),
    customerName: safeAddress.fullName || order.customerName || 'Conscious Buyer',
    customerPhone: safeAddress.phone || order.customerPhone || '',
    customerEmail: order.customerEmail,
    shippingAddress: safeAddress,
    paymentMethod: order.paymentMethod || 'cod',
    paymentStatus: order.paymentStatus || 'pending',
    paymentTransactionId: order.paymentTransactionId,
    items,
    subtotal: safeSubtotal,
    discountAmount: safeDiscount,
    discountCode: order.couponCode,
    deliveryFee: safeDelivery,
    grandTotal: safeGrandTotal,
    courierName: shipment?.courierName || order.courierName || 'SUNNO Eco-Dispatch',
    trackingNumber: shipment?.trackingNumber || order.trackingNumber,
    shipmentStatus: shipment?.status || (order.deliveryStatus as ShipmentStatus) || 'PENDING',
    qrPayload,
    notes: 'Thank you for supporting Bangladesh rural eco-artisans and sustainable craftsmanship.',
  };
}
