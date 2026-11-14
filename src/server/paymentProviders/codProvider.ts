import {
  IPaymentProvider,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  WebhookVerificationResult,
  RefundPaymentParams,
  RefundPaymentResult,
} from './PaymentProvider';
import { PaymentMethod } from '../../types';

export class CodPaymentProvider implements IPaymentProvider {
  readonly id = 'cod';
  readonly name = 'Cash on Eco Delivery (COD)';
  readonly supportedMethods: PaymentMethod[] = ['cod'];

  hasCredentials(): boolean {
    return true; // Native COD has no third-party credential requirements
  }

  getEnvironment(): 'DISABLED' | 'SANDBOX' | 'LIVE' {
    return 'LIVE';
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    return {
      success: true,
      paymentId: params.paymentId,
      gatewayReference: 'COD-DISPATCH-COLLECT',
      isTestMode: false,
      instructions: `Cash of ৳${params.amount} will be collected upon parcel inspection by courier at ${params.customerPhone}.`,
      sessionData: {
        amount: params.amount,
        phone: params.customerPhone,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    return {
      isValid: true,
      paymentStatus: 'SUCCESS',
      transactionId: `COD-${Date.now().toString().slice(-8)}`,
      gatewayReference: 'COURIER-CASH-COLLECTED',
      verifiedAmount: params.amount,
      verifiedCurrency: 'BDT',
      completedAt: new Date().toISOString(),
    };
  }

  async handleWebhook(_headers: Record<string, any>, body: any): Promise<WebhookVerificationResult> {
    return {
      isValid: true,
      isDuplicate: false,
      paymentId: body.paymentId,
      transactionId: `COD-COURIER-${Date.now()}`,
      amount: body.amount,
      currency: 'BDT',
      status: 'SUCCESS',
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    return {
      success: true,
      refundId: `REF-COD-${Date.now()}`,
      gatewayRefundRef: `COD-PAYOUT-${Date.now().toString().slice(-6)}`,
      status: 'REFUNDED',
    };
  }
}
