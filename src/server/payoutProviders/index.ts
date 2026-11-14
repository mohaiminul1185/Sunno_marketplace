import { IPayoutProvider, PayoutMethod } from './PayoutProvider';
import { BkashPayoutProvider } from './bkashPayoutProvider';
import { NagadPayoutProvider } from './nagadPayoutProvider';
import { RocketPayoutProvider } from './rocketPayoutProvider';
import { BankPayoutProvider } from './bankPayoutProvider';

export * from './PayoutProvider';
export * from './bkashPayoutProvider';
export * from './nagadPayoutProvider';
export * from './rocketPayoutProvider';
export * from './bankPayoutProvider';

class PayoutProviderRegistry {
  private providers: Map<string, IPayoutProvider> = new Map();

  constructor() {
    this.register(new BkashPayoutProvider());
    this.register(new NagadPayoutProvider());
    this.register(new RocketPayoutProvider());
    this.register(new BankPayoutProvider());
  }

  register(provider: IPayoutProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): IPayoutProvider | undefined {
    return this.providers.get(id);
  }

  getProviderByMethod(method: PayoutMethod): IPayoutProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.supportedMethods.includes(method)) {
        return provider;
      }
    }
    return undefined;
  }

  getAllProviders(): IPayoutProvider[] {
    return Array.from(this.providers.values());
  }
}

export const payoutRegistry = new PayoutProviderRegistry();
