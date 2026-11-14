import { ICourierProvider } from './CourierProvider';
import { SteadfastCourierProvider } from './steadfastProvider';
import { PathaoCourierProvider } from './pathaoProvider';
import { RedxCourierProvider } from './redxProvider';
import { PaperflyCourierProvider } from './paperflyProvider';
import { EcourierCourierProvider } from './ecourierProvider';
import { SunnoEcoCourierProvider } from './sunnoEcoProvider';
import { CourierProviderId } from '../../types';

class CourierProviderRegistry {
  private providers: Map<CourierProviderId, ICourierProvider> = new Map();

  constructor() {
    this.registerProvider(new SunnoEcoCourierProvider());
    this.registerProvider(new SteadfastCourierProvider());
    this.registerProvider(new PathaoCourierProvider());
    this.registerProvider(new RedxCourierProvider());
    this.registerProvider(new PaperflyCourierProvider());
    this.registerProvider(new EcourierCourierProvider());
  }

  registerProvider(provider: ICourierProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: CourierProviderId): ICourierProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): ICourierProvider[] {
    return Array.from(this.providers.values());
  }
}

export const courierRegistry = new CourierProviderRegistry();
export * from './CourierProvider';
export * from './steadfastProvider';
export * from './pathaoProvider';
export * from './redxProvider';
export * from './paperflyProvider';
export * from './ecourierProvider';
export * from './sunnoEcoProvider';
