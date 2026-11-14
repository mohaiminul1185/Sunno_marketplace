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

export class RocketPaymentProvider implements IPaymentProvider {
  readonly id = 'rocket';
  readonly name = 'DBBL Rocket (MFS)';
  readonly supportedMethods: PaymentMethod[] = ['rocket'];

  private getMerchantId(): string | undefined {
    return process.env.ROCKET_MERCHANT_ID;
  }

  private isSandbox(): boolean {
    return process.env.ROCKET_SANDBOX !== 'false';
  }

  hasCredentials(): boolean {
    return Boolean(this.getMerchantId() && process.env.ROCKET_API_KEY);
  }

  getEnvironment(): 'DISABLED' | 'SANDBOX' | 'LIVE' | 'NOT_CONFIGURED' {
    if (process.env.ROCKET_DISABLED === 'true') return 'DISABLED';
    if (!this.hasCredentials()) {
      return 'NOT_CONFIGURED';
    }
    return this.isSandbox() ? 'SANDBOX' : 'LIVE';
  }

  async getPaymentStatus(paymentIdOrTrxId: string): Promise<any> {
    return {
      status: this.hasCredentials() ? 'CONFIGURED' : 'NOT_CONFIGURED',
      paymentId: paymentIdOrTrxId,
      message: 'Rocket official merchant API credentials required for live queries.',
    };
  }

  async handleCallback(params: Record<string, any>): Promise<VerifyPaymentResult> {
    return this.verifyPayment({
      paymentId: params.paymentId || params.orderId,
      orderId: params.orderId || '',
      amount: parseFloat(params.amount || '0'),
      currency: 'BDT',
      transactionId: params.trxId,
    });
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const isTestMode = params.isTestMode ?? this.isSandbox();

    if (!this.hasCredentials() && !isTestMode) {
      return {
        success: false,
        paymentId: params.paymentId,
        errorMessage: 'Rocket gateway credentials missing.',
        errorCode: 'CREDENTIALS_MISSING',
      };
    }

    return {
      success: true,
      paymentId: params.paymentId,
      gatewayReference: `ROCKET-REF-${Date.now().toString().slice(-6)}`,
      isTestMode,
      instructions: `Rocket mobile banking session ready. Account 01915000003 for Order ${params.orderNumber}.`,
      sessionData: {
        orderNumber: params.orderNumber,
        amount: params.amount,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const trxId = params.transactionId || `ROCKET-${Date.now().toString().slice(-8)}`;
    return {
      isValid: true,
      paymentStatus: 'SUCCESS',
      transactionId: trxId,
      gatewayReference: params.gatewayReference || `ROCKET-GW-${trxId}`,
      verifiedAmount: params.amount,
      verifiedCurrency: 'BDT',
      completedAt: new Date().toISOString(),
    };
  }

  async handleWebhook(headers: Record<string, any>, body: any): Promise<WebhookVerificationResult> {
    return {
      isValid: true,
      isDuplicate: false,
      paymentId: body.paymentId,
      transactionId: body.trxId,
      amount: body.amount ? parseFloat(body.amount) : undefined,
      currency: 'BDT',
      status: 'SUCCESS',
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    return {
      success: true,
      refundId: `REF-ROCKET-${Date.now()}`,
      gatewayRefundRef: `ROCKET-REF-${Date.now().toString().slice(-6)}`,
      status: 'REFUNDED',
    };
  }
}
