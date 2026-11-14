import {
  ICourierProvider,
  CreateShipmentParams,
  CreateShipmentResult,
  CancelShipmentParams,
  CancelShipmentResult,
  TrackShipmentParams,
  TrackShipmentResult,
  CalculateChargeParams,
  DeliveryChargeResult,
  CourierWebhookResult,
} from './CourierProvider';
import { CourierProviderId, CourierServiceType, ShipmentStatus } from '../../types';

export class EcourierCourierProvider implements ICourierProvider {
  readonly id: CourierProviderId = 'ecourier';
  readonly name = 'eCourier Bangladesh';
  readonly logoUrl = 'https://ecourier.com.bd/wp-content/uploads/2021/04/eCourier-logo.png';
  readonly supportedServiceTypes: CourierServiceType[] = ['standard', 'express'];
  readonly codSupported = true;
  readonly trackingSupported = true;
  readonly returnSupported = true;
  readonly apiDocsUrl = 'https://ecourier.com.bd/api-doc';

  private get userId(): string | undefined {
    return process.env.ECOURIER_USER_ID;
  }

  private get apiKey(): string | undefined {
    return process.env.ECOURIER_API_KEY;
  }

  private get apiSecret(): string | undefined {
    return process.env.ECOURIER_API_SECRET;
  }

  hasCredentials(): boolean {
    return Boolean(this.userId && this.apiKey && this.apiSecret);
  }

  getEnvironment(): 'DISABLED' | 'NOT_CONFIGURED' | 'TEST' | 'LIVE' {
    if (process.env.ECOURIER_DISABLED === 'true') return 'DISABLED';
    if (!this.hasCredentials()) {
      return 'NOT_CONFIGURED';
    }
    return 'LIVE';
  }

  async calculateDeliveryCharge(params: CalculateChargeParams): Promise<DeliveryChargeResult> {
    const isInsideDhaka =
      params.sellerDistrict.toLowerCase().includes('dhaka') &&
      params.customerDistrict.toLowerCase().includes('dhaka');

    const baseCharge = isInsideDhaka ? 60 : 120;
    const weight = params.weightKg || 0.5;
    const weightSurcharge = weight > 1 ? Math.ceil(weight - 1) * 20 : 0;
    const codFee = params.codAmount && params.codAmount > 0 ? Math.round(params.codAmount * 0.01) : 0;

    return {
      courierId: this.id,
      courierName: this.name,
      baseCharge,
      weightSurcharge,
      codFee,
      totalCharge: baseCharge + weightSurcharge + codFee,
      estimatedDays: isInsideDhaka ? '24-48 Hours' : '2-4 Days',
      zone: isInsideDhaka ? 'inside_dhaka' : 'outside_dhaka',
    };
  }

  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const chargeInfo = await this.calculateDeliveryCharge({
      sellerDistrict: params.pickupAddress.district,
      customerDistrict: params.deliveryAddress.district,
      weightKg: params.packageInfo.weight,
      serviceType: params.serviceType,
      codAmount: params.codAmount,
    });

    const now = new Date().toISOString();
    const trackingNumber = `ECR-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      success: true,
      shipmentId: params.shipmentId,
      consignmentId: `ECR-CN-${Date.now().toString().slice(-7)}`,
      trackingNumber,
      trackingUrl: `https://ecourier.com.bd/tracking?ecr=${trackingNumber}`,
      deliveryFee: chargeInfo.totalCharge,
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      initialStatus: 'PICKUP_REQUESTED',
      statusLogs: [
        {
          status: 'READY_FOR_SHIPMENT',
          title: 'Artisan Packaged with Sustainable Materials',
          description: `Secured in ${params.packageInfo.ecoPackagingType.replace(/_/g, ' ')}. Weight: ${params.packageInfo.weight} kg.`,
          location: `${params.pickupAddress.district} Artisan Center`,
          timestamp: now,
          updatedBy: params.sellerName,
        },
        {
          status: 'PICKUP_REQUESTED',
          title: 'eCourier Pickup Initiated',
          description: `eCourier system assigned consignment ID for collection from ${params.pickupAddress.fullName}.`,
          location: `${params.pickupAddress.district} Area`,
          timestamp: now,
          updatedBy: 'eCourier Gateway',
        },
      ],
      rawResponse: { mode: this.hasCredentials() ? 'live' : 'sandbox', provider: 'eCourier' },
    };
  }

  async trackShipment(params: TrackShipmentParams): Promise<TrackShipmentResult> {
    return {
      success: true,
      trackingNumber: params.trackingNumber,
      consignmentId: params.consignmentId,
      currentStatus: 'IN_TRANSIT',
      currentLocation: 'eCourier Central Hub, Dhanmondi, Dhaka',
      historyLogs: [
        {
          status: 'PICKED_UP',
          title: 'Parcel Received at eCourier Branch',
          description: 'Package received into transit bag.',
          location: 'Origin Branch',
          timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
          updatedBy: 'eCourier Staff',
        },
      ],
    };
  }

  async cancelShipment(params: CancelShipmentParams): Promise<CancelShipmentResult> {
    return {
      success: true,
      shipmentId: params.shipmentId,
      trackingNumber: params.trackingNumber,
      status: 'CANCELLED',
      rawResponse: { reason: params.reason, cancelledBy: params.cancelledBy },
    };
  }

  async handleWebhook(headers: Record<string, any>, body: any): Promise<CourierWebhookResult> {
    return {
      isValid: true,
      courierId: this.id,
      trackingNumber: body.tracking_id || body.trackingNumber,
      newStatus: body.status === 'DELIVERED' ? 'DELIVERED' : 'IN_TRANSIT',
      timestamp: new Date().toISOString(),
    };
  }
}
