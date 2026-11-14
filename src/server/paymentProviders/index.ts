import { IPaymentProvider } from './PaymentProvider';
import { BkashPaymentProvider } from './bkashProvider';
import { NagadPaymentProvider } from './nagadProvider';
import { RocketPaymentProvider } from './rocketProvider';
import { SslcommerzPaymentProvider } from './sslcommerzProvider';
import { CodPaymentProvider } from './codProvider';
import { UpayPaymentProvider } from './upayProvider';

export * from './PaymentProvider';
export * from './bkashProvider';
export * from './nagadProvider';
export * from './rocketProvider';
export * from './sslcommerzProvider';
export * from './codProvider';
export * from './upayProvider';

class PaymentProviderRegistry {
  private providers = new Map<string, IPaymentProvider>();

  constructor() {
    this.register(new BkashPaymentProvider());
    this.register(new NagadPaymentProvider());
    this.register(new RocketPaymentProvider());
    this.register(new SslcommerzPaymentProvider());
    this.register(new CodPaymentProvider());
    this.register(new UpayPaymentProvider());
  }

  register(provider: IPaymentProvider) {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  getProvider(id: string): IPaymentProvider | undefined {
    return this.providers.get(id.toLowerCase());
  }

  getAllProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }
}

export const paymentRegistry = new PaymentProviderRegistry();
