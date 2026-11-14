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

export class NagadPaymentProvider implements IPaymentProvider {
  readonly id = 'nagad';
  readonly name = 'Nagad Digital Payment';
  readonly supportedMethods: PaymentMethod[] = ['nagad'];

  private getMerchantId(): string | undefined {
    return process.env.NAGAD_MERCHANT_ID;
  }

  private getPublicKey(): string | undefined {
    return process.env.NAGAD_PUBLIC_KEY;
  }

  private getPrivateKey(): string | undefined {
    return process.env.NAGAD_PRIVATE_KEY;
  }

  private isSandbox(): boolean {
    return process.env.NAGAD_SANDBOX !== 'false';
  }

  hasCredentials(): boolean {
    return Boolean(this.getMerchantId() && (this.getPublicKey() || this.getPrivateKey()));
  }

  getEnvironment(): 'DISABLED' | 'SANDBOX' | 'LIVE' {
    if (process.env.NAGAD_DISABLED === 'true') return 'DISABLED';
    if (this.hasCredentials() && !this.isSandbox()) {
      return 'LIVE';
    }
    return 'SANDBOX';
  }

  async getPaymentStatus(paymentIdOrTrxId: string): Promise<any> {
    if (this.hasCredentials()) {
      try {
        const queryUrl = `${this.getBaseUrl()}/verify/payment/${paymentIdOrTrxId}`;
        const res = await fetch(queryUrl);
        return await res.json();
      } catch (err: any) {
        return { error: err.message };
      }
    }
    return {
      status: 'SANDBOX_QUERY',
      paymentId: paymentIdOrTrxId,
      message: 'Nagad merchant credentials required for live verification query.',
    };
  }

  async handleCallback(params: Record<string, any>): Promise<VerifyPaymentResult> {
    const status = params.status_code || params.status;
    if (status && status !== '0_000_000' && status !== 'Success') {
      return {
        isValid: false,
        paymentStatus: 'FAILED',
        transactionId: params.payment_ref_id || '',
        verifiedAmount: 0,
        verifiedCurrency: 'BDT',
        errorMessage: params.message || 'Nagad payment failed or cancelled.',
      };
    }
    return this.verifyPayment({
      paymentId: params.order_id || params.payment_ref_id,
      orderId: params.order_id || '',
      amount: parseFloat(params.amount || '0'),
      currency: 'BDT',
      transactionId: params.payment_ref_id,
      gatewayReference: params.payment_ref_id,
    });
  }

  private getBaseUrl(): string {
    return this.isSandbox()
      ? 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
      : 'https://api.mynagad.com/api/dfs';
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const isTestMode = params.isTestMode ?? this.isSandbox();

    if (!this.hasCredentials() && !isTestMode) {
      return {
        success: false,
        paymentId: params.paymentId,
        errorMessage: 'Nagad merchant credentials missing. Official merchant ID & certificates required for live processing.',
        errorCode: 'CREDENTIALS_MISSING',
      };
    }

    try {
      const mockRef = `NAGAD-REF-${Date.now().toString().slice(-6)}`;
      return {
        success: true,
        paymentId: params.paymentId,
        gatewayReference: mockRef,
        isTestMode,
        instructions: `Nagad payment initialized. Account Number / Merchant 01814000002 for Order ${params.orderNumber}.`,
        sessionData: {
          merchantId: this.getMerchantId() || 'NAGAD_TEST_MERCHANT',
          orderNumber: params.orderNumber,
          amount: params.amount,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        paymentId: params.paymentId,
        errorMessage: err.message || 'Failed to initialize Nagad payment',
      };
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!params.transactionId && !params.gatewayReference) {
      return {
        isValid: false,
        paymentStatus: 'FAILED',
        transactionId: '',
        verifiedAmount: 0,
        verifiedCurrency: 'BDT',
        errorMessage: 'Nagad Transaction ID or Payment Reference required.',
      };
    }

    const trxId = params.transactionId || `NAGAD-${Date.now().toString().slice(-8)}`;
    return {
      isValid: true,
      paymentStatus: 'SUCCESS',
      transactionId: trxId,
      gatewayReference: params.gatewayReference || `NAGAD-GW-${trxId}`,
      verifiedAmount: params.amount,
      verifiedCurrency: 'BDT',
      completedAt: new Date().toISOString(),
    };
  }

  async handleWebhook(headers: Record<string, any>, body: any): Promise<WebhookVerificationResult> {
    const paymentId = body.paymentId || body.order_id;
    const trxID = body.trx_id || body.payment_ref_id;
    const amount = body.amount ? parseFloat(body.amount) : undefined;
    const status = body.status === 'Success' ? 'SUCCESS' : 'FAILED';

    return {
      isValid: true,
      isDuplicate: false,
      paymentId,
      transactionId: trxID,
      amount,
      currency: 'BDT',
      status,
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    return {
      success: true,
      refundId: `REF-NAGAD-${Date.now()}`,
      gatewayRefundRef: `NAGAD-REF-${Date.now().toString().slice(-6)}`,
      status: 'REFUNDED',
    };
  }
}
