import { PaymentMethod, PaymentStatus } from '../../types';

export interface InitializePaymentParams {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: 'BDT';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  callbackUrl: string;
  cancelUrl: string;
  mfsAccountNumber?: string;
  isTestMode?: boolean;
}

export interface InitializePaymentResult {
  success: boolean;
  paymentId: string;
  gatewayReference?: string;
  redirectUrl?: string;
  sessionData?: Record<string, any>;
  instructions?: string;
  errorMessage?: string;
  errorCode?: string;
  isTestMode?: boolean;
  requiresRedirect?: boolean;
}

export interface VerifyPaymentParams {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: 'BDT';
  transactionId?: string;
  gatewayReference?: string;
  signature?: string;
  rawPayload?: any;
}

export interface VerifyPaymentResult {
  isValid: boolean;
  paymentStatus: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  transactionId: string;
  gatewayReference?: string;
  verifiedAmount: number;
  verifiedCurrency: string;
  errorMessage?: string;
  errorCode?: string;
  completedAt?: string;
  rawResponse?: any;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  isDuplicate: boolean;
  paymentId?: string;
  orderId?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  status?: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  errorMessage?: string;
}

export interface RefundPaymentParams {
  paymentId: string;
  orderId: string;
  transactionId: string;
  amount: number;
  reason: string;
  adminId: string;
}

export interface RefundPaymentResult {
  success: boolean;
  refundId: string;
  gatewayRefundRef?: string;
  status: 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED';
  errorMessage?: string;
}

export type PaymentEnvironment = 'DISABLED' | 'SANDBOX' | 'LIVE' | 'NOT_CONFIGURED';

export interface IPaymentProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedMethods: PaymentMethod[];

  hasCredentials(): boolean;
  getEnvironment(): PaymentEnvironment;
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  handleCallback?(params: Record<string, any>): Promise<VerifyPaymentResult>;
  getPaymentStatus?(paymentIdOrTrxId: string): Promise<any>;
  handleWebhook(headers: Record<string, any>, body: any): Promise<WebhookVerificationResult>;
  refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult>;
}
