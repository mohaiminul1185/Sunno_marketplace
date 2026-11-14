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

export class UpayPaymentProvider implements IPaymentProvider {
  readonly id = 'upay';
  readonly name = 'Upay Payment (UCB MFS)';
  readonly supportedMethods: PaymentMethod[] = ['upay'];

  private getMerchantId(): string | undefined {
    return process.env.UPAY_MERCHANT_ID;
  }

  private getApiKey(): string | undefined {
    return process.env.UPAY_API_KEY;
  }

  private isSandbox(): boolean {
    return process.env.UPAY_SANDBOX !== 'false';
  }

  hasCredentials(): boolean {
    return Boolean(this.getMerchantId() && this.getApiKey());
  }

  getEnvironment(): 'DISABLED' | 'SANDBOX' | 'LIVE' | 'NOT_CONFIGURED' {
    if (process.env.UPAY_DISABLED === 'true') return 'DISABLED';
    if (!this.hasCredentials()) {
      return 'NOT_CONFIGURED';
    }
    return this.isSandbox() ? 'SANDBOX' : 'LIVE';
  }

  async getPaymentStatus(paymentIdOrTrxId: string): Promise<any> {
    return {
      status: this.hasCredentials() ? 'CONFIGURED' : 'NOT_CONFIGURED',
      paymentId: paymentIdOrTrxId,
      message: this.hasCredentials()
        ? 'Upay merchant gateway is configured.'
        : 'Upay merchant API credentials required for live queries (Set UPAY_MERCHANT_ID, UPAY_API_KEY).',
    };
  }

  async handleCallback(params: Record<string, any>): Promise<VerifyPaymentResult> {
    return this.verifyPayment({
      paymentId: params.paymentId || params.orderId,
      orderId: params.orderId || '',
      amount: parseFloat(params.amount || '0'),
      currency: 'BDT',
      transactionId: params.trxId || params.transaction_id,
    });
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const isTestMode = params.isTestMode ?? this.isSandbox();

    if (!this.hasCredentials() && !isTestMode) {
      return {
        success: false,
        paymentId: params.paymentId,
        errorMessage: 'Upay gateway credentials missing. Please configure UPAY_MERCHANT_ID and UPAY_API_KEY.',
        errorCode: 'CREDENTIALS_MISSING',
      };
    }

    return {
      success: true,
      paymentId: params.paymentId,
      gatewayReference: `UPAY-REF-${Date.now().toString().slice(-6)}`,
      isTestMode,
      instructions: `Upay mobile transaction session initiated for Order #${params.orderNumber}.`,
      sessionData: {
        orderNumber: params.orderNumber,
        amount: params.amount,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!this.hasCredentials() && !this.isSandbox()) {
      return {
        isValid: false,
        paymentStatus: 'FAILED',
        transactionId: params.transactionId || '',
        verifiedAmount: 0,
        verifiedCurrency: 'BDT',
        errorMessage: 'Upay merchant credentials missing in LIVE mode.',
        errorCode: 'CONFIG_REQUIRED',
      };
    }

    const trxId = params.transactionId || `UPAY-${Date.now().toString().slice(-8)}`;
    return {
      isValid: true,
      paymentStatus: 'SUCCESS',
      transactionId: trxId,
      gatewayReference: params.gatewayReference || `UPAY-GW-${trxId}`,
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
      refundId: `REF-UPAY-${Date.now()}`,
      gatewayRefundRef: `UPAY-REF-${Date.now().toString().slice(-6)}`,
      status: 'REFUNDED',
    };
  }
}
