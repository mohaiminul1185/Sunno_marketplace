import { CourierProviderId, CourierServiceType, PackageInfo, ShipmentStatus, ShipmentLog, UserAddress } from '../../types';

export interface CreateShipmentParams {
  shipmentId: string;
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
  serviceType: CourierServiceType;
  codAmount: number;
  deliveryInstructions?: string;
  isTestMode?: boolean;
}

export interface CreateShipmentResult {
  success: boolean;
  shipmentId: string;
  consignmentId?: string;
  trackingNumber: string;
  trackingUrl?: string;
  deliveryFee: number;
  estimatedDeliveryDate?: string;
  initialStatus: ShipmentStatus;
  statusLogs: ShipmentLog[];
  rawResponse?: any;
  errorMessage?: string;
  errorCode?: string;
}

export interface CancelShipmentParams {
  shipmentId: string;
  trackingNumber: string;
  consignmentId?: string;
  reason: string;
  cancelledBy: string;
}

export interface CancelShipmentResult {
  success: boolean;
  shipmentId: string;
  trackingNumber: string;
  status: ShipmentStatus;
  rawResponse?: any;
  errorMessage?: string;
}

export interface TrackShipmentParams {
  shipmentId?: string;
  trackingNumber: string;
  consignmentId?: string;
}

export interface TrackShipmentResult {
  success: boolean;
  trackingNumber: string;
  consignmentId?: string;
  currentStatus: ShipmentStatus;
  currentLocation?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  historyLogs: ShipmentLog[];
  collectedAmount?: number;
  isReturnToOrigin?: boolean;
  rawResponse?: any;
  errorMessage?: string;
}

export interface CalculateChargeParams {
  sellerDistrict: string;
  customerDistrict: string;
  weightKg?: number;
  serviceType?: CourierServiceType;
  codAmount?: number;
}

export interface DeliveryChargeResult {
  courierId: CourierProviderId;
  courierName: string;
  baseCharge: number;
  weightSurcharge: number;
  codFee: number;
  totalCharge: number;
  estimatedDays: string;
  zone: 'inside_dhaka' | 'outside_dhaka';
}

export interface RequestReturnParams {
  shipmentId: string;
  trackingNumber: string;
  consignmentId?: string;
  returnReason: string;
  pickupAddress: UserAddress;
  deliveryAddress: {
    fullName: string;
    phone: string;
    division: string;
    district: string;
    streetAddress: string;
  };
}

export interface RequestReturnResult {
  success: boolean;
  returnShipmentId?: string;
  returnTrackingNumber?: string;
  status: ShipmentStatus;
  errorMessage?: string;
  rawResponse?: any;
}

export interface CourierWebhookResult {
  isValid: boolean;
  courierId: CourierProviderId;
  trackingNumber?: string;
  consignmentId?: string;
  orderId?: string;
  subOrderId?: string;
  newStatus?: ShipmentStatus;
  location?: string;
  timestamp?: string;
  codCollected?: boolean;
  collectedAmount?: number;
  failureReason?: string;
  errorMessage?: string;
}

export interface ICourierProvider {
  readonly id: CourierProviderId;
  readonly name: string;
  readonly logoUrl: string;
  readonly supportedServiceTypes: CourierServiceType[];
  readonly codSupported: boolean;
  readonly trackingSupported: boolean;
  readonly returnSupported: boolean;
  readonly apiDocsUrl: string;

  hasCredentials(): boolean;
  getEnvironment(): 'DISABLED' | 'NOT_CONFIGURED' | 'TEST' | 'LIVE';
  createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult>;
  cancelShipment(params: CancelShipmentParams): Promise<CancelShipmentResult>;
  trackShipment(params: TrackShipmentParams): Promise<TrackShipmentResult>;
  calculateDeliveryCharge(params: CalculateChargeParams): Promise<DeliveryChargeResult>;
  requestReturn?(params: RequestReturnParams): Promise<RequestReturnResult>;
  handleWebhook(headers: Record<string, any>, body: any): Promise<CourierWebhookResult>;
}
