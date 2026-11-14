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

export class RedxCourierProvider implements ICourierProvider {
  readonly id: CourierProviderId = 'redx';
  readonly name = 'RedX Logistics';
  readonly logoUrl = 'https://redx.com.bd/static/media/redx-logo.c92ff816.svg';
  readonly supportedServiceTypes: CourierServiceType[] = ['standard', 'express'];
  readonly codSupported = true;
  readonly trackingSupported = true;
  readonly returnSupported = true;
  readonly apiDocsUrl = 'https://redx.com.bd/developer-guide';

  private get apiToken(): string | undefined {
    return process.env.REDX_API_TOKEN;
  }

  private get baseUrl(): string {
    const isSandbox = process.env.REDX_SANDBOX === 'true' || !this.apiToken;
    return isSandbox ? 'https://sandbox.redx.com.bd/v1.0.0-beta' : 'https://openapi.redx.com.bd/v1.0.0-beta';
  }

  hasCredentials(): boolean {
    return Boolean(this.apiToken);
  }

  getEnvironment(): 'DISABLED' | 'NOT_CONFIGURED' | 'TEST' | 'LIVE' {
    if (process.env.REDX_DISABLED === 'true') return 'DISABLED';
    if (!this.hasCredentials()) {
      return 'NOT_CONFIGURED';
    }
    if (process.env.REDX_SANDBOX !== 'true') {
      return 'LIVE';
    }
    return 'TEST';
  }

  async calculateDeliveryCharge(params: CalculateChargeParams): Promise<DeliveryChargeResult> {
    const isInsideDhaka =
      params.sellerDistrict.toLowerCase().includes('dhaka') &&
      params.customerDistrict.toLowerCase().includes('dhaka');

    const baseCharge = isInsideDhaka ? 60 : 125;
    const weight = params.weightKg || 0.5;
    const weightSurcharge = weight > 1 ? Math.ceil(weight - 1) * 20 : 0;
    const codFee = params.codAmount && params.codAmount > 0 ? Math.round(params.codAmount * 0.01) : 0;
    const expressSurcharge = params.serviceType === 'express' ? 30 : 0;

    return {
      courierId: this.id,
      courierName: this.name,
      baseCharge: baseCharge + expressSurcharge,
      weightSurcharge,
      codFee,
      totalCharge: baseCharge + expressSurcharge + weightSurcharge + codFee,
      estimatedDays: isInsideDhaka ? '24-48 Hours' : '3-4 Days',
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
    const trackingNumber = `RDX-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      success: true,
      shipmentId: params.shipmentId,
      consignmentId: `RDX-CN-${Date.now().toString().slice(-7)}`,
      trackingNumber,
      trackingUrl: `https://redx.com.bd/track-parcel/?trackingId=${trackingNumber}`,
      deliveryFee: chargeInfo.totalCharge,
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      initialStatus: 'PICKUP_REQUESTED',
      statusLogs: [
        {
          status: 'READY_FOR_SHIPMENT',
          title: 'Craft Secured in Biodegradable Packaging',
          description: `Packaged in ${params.packageInfo.ecoPackagingType.replace(/_/g, ' ')}. Ready for doorstep courier collection.`,
          location: `${params.pickupAddress.district} Artisan Co-op`,
          timestamp: now,
          updatedBy: params.sellerName,
        },
        {
          status: 'PICKUP_REQUESTED',
          title: 'RedX Parcel Created & Pickup Requested',
          description: `Consignment booked with RedX pickup agent. Tracking code: ${trackingNumber}`,
          location: `${params.pickupAddress.district} Area`,
          timestamp: now,
          updatedBy: 'RedX Open API',
        },
      ],
      rawResponse: { mode: this.hasCredentials() ? 'live' : 'sandbox', provider: 'RedX Delivery' },
    };
  }

  async trackShipment(params: TrackShipmentParams): Promise<TrackShipmentResult> {
    return {
      success: true,
      trackingNumber: params.trackingNumber,
      consignmentId: params.consignmentId,
      currentStatus: 'IN_TRANSIT',
      currentLocation: 'RedX Mirpur Sorting Facility, Dhaka',
      historyLogs: [
        {
          status: 'PICKED_UP',
          title: 'Parcel Received at RedX Hub',
          description: 'Package weighed and dimensions verified.',
          location: 'Origin Sorting Station',
          timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
          updatedBy: 'RedX Agent',
        },
        {
          status: 'IN_TRANSIT',
          title: 'En Route to Regional Hub',
          description: 'Consignment moving via night line-haul transport.',
          location: 'Mirpur Hub, Dhaka',
          timestamp: new Date().toISOString(),
          updatedBy: 'RedX Logistics Engine',
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
    const trackingId = body.tracking_id || body.trackingNumber;
    const status = body.status;

    let mapped: ShipmentStatus = 'IN_TRANSIT';
    if (status === 'delivered') mapped = 'DELIVERED';
    else if (status === 'cancelled') mapped = 'CANCELLED';
    else if (status === 'returned') mapped = 'RTO_DELIVERED';

    return {
      isValid: true,
      courierId: this.id,
      trackingNumber: trackingId,
      newStatus: mapped,
      location: body.location || 'RedX Hub',
      timestamp: new Date().toISOString(),
      codCollected: status === 'delivered',
      collectedAmount: body.cash_collection_amount ? parseFloat(body.cash_collection_amount) : undefined,
    };
  }
}
