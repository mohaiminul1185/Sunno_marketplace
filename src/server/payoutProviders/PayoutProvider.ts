export type PayoutEnvironment = 'DISABLED' | 'SANDBOX' | 'LIVE' | 'CONFIGURATION REQUIRED';

export type PayoutMethod = 'bkash' | 'nagad' | 'rocket' | 'bank_transfer';

export interface PayoutAccountDetails {
  accountNumber: string;
  maskedAccount?: string;
  accountType?: 'personal' | 'merchant' | 'savings' | 'current';
  accountHolderName?: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
}

export interface DisburseFundsParams {
  withdrawalId: string;
  sellerId: string;
  sellerName: string;
  storeName?: string;
  amount: number;
  currency: 'BDT';
  method: PayoutMethod;
  accountDetails: PayoutAccountDetails;
  isSandbox?: boolean;
  notes?: string;
}

export interface PayoutDisbursementResult {
  success: boolean;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED' | 'CONFIGURATION REQUIRED' | 'SANDBOX';
  transactionRef: string;
  providerId: string;
  providerName: string;
  environment: PayoutEnvironment;
  disbursedAmount: number;
  fee: number;
  timestamp: string;
  errorMessage?: string;
  rawResponse?: any;
}

export interface IPayoutProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedMethods: PayoutMethod[];

  hasCredentials(): boolean;
  getEnvironment(): PayoutEnvironment;
  disburseFunds(params: DisburseFundsParams): Promise<PayoutDisbursementResult>;
  checkPayoutStatus?(transactionRef: string): Promise<any>;
}
