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

export class SunnoEcoCourierProvider implements ICourierProvider {
  readonly id: CourierProviderId = 'sunno_eco';
  readonly name = 'SUNNO Direct Eco-Dispatch (Co-op Logistics)';
  readonly logoUrl = '/favicon.ico';
  readonly supportedServiceTypes: CourierServiceType[] = ['standard', 'express'];
  readonly codSupported = true;
  readonly trackingSupported = true;
  readonly returnSupported = true;
  readonly apiDocsUrl = 'https://sunno.eco/logistics-network';

  hasCredentials(): boolean {
    return true; // Native zero-carbon cooperative network
  }

  getEnvironment(): 'DISABLED' | 'TEST' | 'LIVE' {
    return 'LIVE';
  }

  async calculateDeliveryCharge(params: CalculateChargeParams): Promise<DeliveryChargeResult> {
    const isInsideDhaka =
      params.sellerDistrict.toLowerCase().includes('dhaka') &&
      params.customerDistrict.toLowerCase().includes('dhaka');

    const baseCharge = isInsideDhaka ? 50 : 100; // Subsidized eco-rate
    const weight = params.weightKg || 0.5;
    const weightSurcharge = weight > 1 ? Math.ceil(weight - 1) * 15 : 0;
    const codFee = 0; // Free COD on cooperative dispatch

    return {
      courierId: this.id,
      courierName: this.name,
      baseCharge,
      weightSurcharge,
      codFee,
      totalCharge: baseCharge + weightSurcharge + codFee,
      estimatedDays: isInsideDhaka ? '1-2 Days (Electric Cargo)' : '2-3 Days (Co-op River & Road)',
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
    const trackingNumber = `SNO-ECO-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      success: true,
      shipmentId: params.shipmentId,
      consignmentId: `SNO-CN-${Date.now().toString().slice(-7)}`,
      trackingNumber,
      trackingUrl: `https://sunno.eco/track/${trackingNumber}`,
      deliveryFee: chargeInfo.totalCharge,
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      initialStatus: 'PICKUP_REQUESTED',
      statusLogs: [
        {
          status: 'READY_FOR_SHIPMENT',
          title: 'Artisan Packaged with Zero Plastic',
          description: `Sealed in 100% biodegradable ${params.packageInfo.ecoPackagingType.replace(/_/g, ' ')}. Natural twine bound.`,
          location: `${params.pickupAddress.district} Rural Cooperative Hub`,
          timestamp: now,
          updatedBy: params.sellerName,
        },
        {
          status: 'PICKUP_REQUESTED',
          title: 'SUNNO Electric Cargo / Co-op Dispatch Assigned',
          description: `Designated rural green runner assigned for pickup from ${params.pickupAddress.fullName}. Zero carbon routing activated.`,
          location: `${params.pickupAddress.district} District Center`,
          timestamp: now,
          updatedBy: 'SUNNO Eco Logistics',
        },
      ],
      rawResponse: { mode: 'native_cooperative_logistics', zeroEmissionCertified: true },
    };
  }

  async trackShipment(params: TrackShipmentParams): Promise<TrackShipmentResult> {
    return {
      success: true,
      trackingNumber: params.trackingNumber,
      consignmentId: params.consignmentId,
      currentStatus: 'IN_TRANSIT',
      currentLocation: 'SUNNO Sustainable Hub, Savar, Dhaka',
      historyLogs: [
        {
          status: 'PICKED_UP',
          title: 'Collected by SUNNO Green Runner',
          description: 'Package verified with Artisan Guild seal.',
          location: 'Rural Artisan Cluster',
          timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
          updatedBy: 'SUNNO Cooperative Agent',
        },
        {
          status: 'IN_TRANSIT',
          title: 'Zero-Emission Cargo Transit',
          description: 'Electric cargo van en route to district distribution point.',
          location: 'Savar Central Eco-Hub, Dhaka',
          timestamp: new Date().toISOString(),
          updatedBy: 'SUNNO Green Fleet Hub',
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
      trackingNumber: body.trackingNumber,
      newStatus: body.status || 'IN_TRANSIT',
      location: body.location || 'SUNNO Eco Logistics Hub',
      timestamp: new Date().toISOString(),
    };
  }
}
