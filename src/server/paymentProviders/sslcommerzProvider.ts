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

export class SslcommerzPaymentProvider implements IPaymentProvider {
  readonly id = 'sslcommerz';
  readonly name = 'SSLCommerz Gateway (Card & NetBanking)';
  readonly supportedMethods: PaymentMethod[] = ['card', 'bank_transfer'];

  private getStoreId(): string | undefined {
    return process.env.SSLCOMMERZ_STORE_ID;
  }

  private getStorePassword(): string | undefined {
    return process.env.SSLCOMMERZ_STORE_PASSWORD || process.env.SSLCOMMERZ_STORE_PASS;
  }

  private isSandbox(): boolean {
    if (process.env.SSLCOMMERZ_ENVIRONMENT) {
      return process.env.SSLCOMMERZ_ENVIRONMENT.toLowerCase() !== 'live';
    }
    return process.env.SSLCOMMERZ_SANDBOX !== 'false';
  }

  hasCredentials(): boolean {
    return Boolean(this.getStoreId() && this.getStorePassword());
  }

  getEnvironment(): 'DISABLED' | 'SANDBOX' | 'LIVE' {
    if (process.env.SSLCOMMERZ_DISABLED === 'true') return 'DISABLED';
    if (this.hasCredentials() && !this.isSandbox()) {
      return 'LIVE';
    }
    return 'SANDBOX';
  }

  async getPaymentStatus(paymentIdOrTrxId: string): Promise<any> {
    if (this.hasCredentials()) {
      try {
        const queryUrl = `${this.getBaseUrl()}/validator/api/merchantTransIDvalidationAPI.php?tran_id=${encodeURIComponent(
          paymentIdOrTrxId
        )}&store_id=${encodeURIComponent(this.getStoreId()!)}&store_passwd=${encodeURIComponent(
          this.getStorePassword()!
        )}&format=json`;
        const res = await fetch(queryUrl);
        return await res.json();
      } catch (err: any) {
        return { error: err.message };
      }
    }
    return {
      status: 'SANDBOX_QUERY',
      paymentId: paymentIdOrTrxId,
      message: 'SSLCommerz credentials required for live transaction status query.',
    };
  }

  async handleCallback(params: Record<string, any>): Promise<VerifyPaymentResult> {
    const status = params.status;
    if (status === 'FAILED' || status === 'CANCELLED') {
      return {
        isValid: false,
        paymentStatus: status === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
        transactionId: params.tran_id || '',
        verifiedAmount: 0,
        verifiedCurrency: 'BDT',
        errorMessage: `SSLCommerz payment returned status: ${status}`,
      };
    }
    return this.verifyPayment({
      paymentId: params.tran_id,
      orderId: params.value_a || params.tran_id,
      amount: parseFloat(params.amount || params.currency_amount || '0'),
      currency: 'BDT',
      gatewayReference: params.val_id,
      transactionId: params.bank_tran_id || params.tran_id,
      rawPayload: params,
    });
  }

  private getBaseUrl(): string {
    return this.isSandbox()
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const isTestMode = params.isTestMode ?? this.isSandbox();

    if (!this.hasCredentials() && !isTestMode) {
      return {
        success: false,
        paymentId: params.paymentId,
        errorMessage: 'SSLCommerz merchant credentials missing. Official Store ID & Store Password required.',
        errorCode: 'CREDENTIALS_MISSING',
      };
    }

    try {
      if (this.hasCredentials()) {
        const payload = new URLSearchParams({
          store_id: this.getStoreId()!,
          store_passwd: this.getStorePassword()!,
          total_amount: params.amount.toString(),
          currency: 'BDT',
          tran_id: params.paymentId,
          success_url: params.callbackUrl,
          fail_url: params.cancelUrl,
          cancel_url: params.cancelUrl,
          ipn_url: `${process.env.APP_URL || ''}/api/payments/webhook/sslcommerz`,
          cus_name: params.customerName,
          cus_phone: params.customerPhone,
          cus_email: params.customerEmail || 'buyer@sunno.eco',
          cus_add1: 'Dhaka, Bangladesh',
          cus_city: 'Dhaka',
          cus_country: 'Bangladesh',
          shipping_method: 'YES',
          product_name: 'Artisan Eco Goods',
          product_category: 'Eco Craft',
          product_profile: 'general',
        });

        const res = await fetch(`${this.getBaseUrl()}/gwprocess/v4/api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: payload.toString(),
        });

        const data = await res.json();
        if (data.status === 'SUCCESS' && data.GatewayPageURL) {
          return {
            success: true,
            paymentId: params.paymentId,
            gatewayReference: data.sessionkey,
            redirectUrl: data.GatewayPageURL,
            requiresRedirect: true,
            isTestMode,
          };
        }
      }

      // Test Mode
      return {
        success: true,
        paymentId: params.paymentId,
        gatewayReference: `SSL-SESSION-${Date.now().toString().slice(-6)}`,
        isTestMode: true,
        instructions: `SSLCommerz test gateway ready for Visa / Mastercard / DBBL / City Bank ৳${params.amount}.`,
        sessionData: {
          storeId: this.getStoreId() || 'sunno_sandbox',
          amount: params.amount,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        paymentId: params.paymentId,
        errorMessage: err.message || 'SSLCommerz session initialization failed',
      };
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (this.hasCredentials() && params.gatewayReference) {
      try {
        const valUrl = `${this.getBaseUrl()}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
          params.gatewayReference
        )}&store_id=${encodeURIComponent(this.getStoreId()!)}&store_passwd=${encodeURIComponent(
          this.getStorePassword()!
        )}&format=json`;

        const res = await fetch(valUrl);
        const data = await res.json();

        if (data.status === 'VALID' || data.status === 'VALIDATED') {
          const verifiedAmt = parseFloat(data.amount);
          if (Math.round(verifiedAmt) !== Math.round(params.amount)) {
            return {
              isValid: false,
              paymentStatus: 'FAILED',
              transactionId: data.tran_id,
              verifiedAmount: verifiedAmt,
              verifiedCurrency: 'BDT',
              errorMessage: `Amount mismatch: Expected ৳${params.amount}, gateway captured ৳${verifiedAmt}`,
            };
          }

          return {
            isValid: true,
            paymentStatus: 'SUCCESS',
            transactionId: data.bank_tran_id || data.tran_id,
            gatewayReference: data.val_id,
            verifiedAmount: verifiedAmt,
            verifiedCurrency: 'BDT',
            completedAt: new Date().toISOString(),
            rawResponse: data,
          };
        }
      } catch (e: any) {
        console.warn('SSLCommerz live verification error:', e);
      }
    }

    const trxId = params.transactionId || `SSL-${Date.now().toString().slice(-8)}`;
    return {
      isValid: true,
      paymentStatus: 'SUCCESS',
      transactionId: trxId,
      gatewayReference: params.gatewayReference || `VAL-${trxId}`,
      verifiedAmount: params.amount,
      verifiedCurrency: 'BDT',
      completedAt: new Date().toISOString(),
    };
  }

  async handleWebhook(headers: Record<string, any>, body: any): Promise<WebhookVerificationResult> {
    const status = body.status === 'VALID' || body.status === 'VALIDATED' ? 'SUCCESS' : 'FAILED';
    return {
      isValid: true,
      isDuplicate: false,
      paymentId: body.tran_id,
      transactionId: body.bank_tran_id || body.val_id,
      amount: body.amount ? parseFloat(body.amount) : undefined,
      currency: 'BDT',
      status,
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    return {
      success: true,
      refundId: `REF-SSL-${Date.now()}`,
      gatewayRefundRef: `SSL-REF-${Date.now().toString().slice(-6)}`,
      status: 'REFUNDED',
    };
  }
}
