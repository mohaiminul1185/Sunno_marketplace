import { Product, DistrictInfo, QueueSubmission } from '../types';
export * from './imageAssets';
import {
  BURIGANGA_DHAKA_HERO,
  SYLHET_TEA_IMG,
  RANGAMATI_HANDLOOM_IMG,
  SUNDARBANS_HONEY_IMG,
  HERO_ARTISAN_IMG,
} from './imageAssets';

export const DIVISIONS_DATA: { [key: string]: string[] } = {
  'Dhaka Division': ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail', 'Faridpur', 'Manikganj', 'Munshiganj', 'Narsingdi'],
  'Chittagong Division': ['Chittagong', 'Cox\'s Bazar', 'Rangamati', 'Bandarban', 'Khagrachhari', 'Comilla', 'Noakhali'],
  'Sylhet Division': ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
  'Rajshahi Division': ['Rajshahi', 'Bogra', 'Pabna', 'Naogaon', 'Natore', 'Sirajganj'],
  'Khulna Division': ['Khulna', 'Bagerhat (Sundarbans)', 'Jessore', 'Kushtia', 'Satkhira'],
  'Barisal Division': ['Barisal', 'Patuakhali', 'Bhola', 'Jhalokati', 'Pirojpur'],
  'Rangpur Division': ['Rangpur', 'Dinajpur', 'Kurigram', 'Gaibandha'],
  'Mymensingh Division': ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur']
};

export const DISTRICTS_LIST: DistrictInfo[] = [
  {
    id: 'dhaka',
    name: 'Dhaka',
    division: 'Dhaka Division',
    specialty: 'Jute Crafts, Jamdani & Terracotta Art',
    heroImage: BURIGANGA_DHAKA_HERO,
    description: 'Discover sustainable craftsmanship, organic textiles, and heritage artistry from the heart of Bangladesh.',
    artisanCount: 420
  },
  {
    id: 'sylhet',
    name: 'Sylhet',
    division: 'Sylhet Division',
    specialty: 'Organic Tea & Woven Bamboo Crafts',
    heroImage: SYLHET_TEA_IMG,
    description: 'Home to century-old organic tea gardens and sustainable wild bamboo weaving cooperatives nestled in mist-covered valleys.',
    artisanCount: 310
  },
  {
    id: 'rangamati',
    name: 'Rangamati',
    division: 'Chittagong Division',
    specialty: 'Indigenous Heritage Handloom & Natural Plant Dyes',
    heroImage: RANGAMATI_HANDLOOM_IMG,
    description: 'Chakma and Marma artisan handloom weaving using handspun organic cotton and zero-chemical forest plant dyes.',
    artisanCount: 185
  },
  {
    id: 'sundarbans',
    name: 'Bagerhat (Sundarbans)',
    division: 'Khulna Division',
    specialty: 'Wild Forest Raw Honey & Sundari Wood Carvings',
    heroImage: SUNDARBANS_HONEY_IMG,
    description: 'Ethically harvested raw wildflower honey by Mouli collectors alongside certified reclaimed mangrove wood crafts.',
    artisanCount: 140
  },
  {
    id: 'tangail',
    name: 'Tangail',
    division: 'Dhaka Division',
    specialty: 'Handloom Cotton & Bamboo Flutes',
    heroImage: HERO_ARTISAN_IMG,
    description: 'World-renowned heritage weavers creating superfine eco-spun cotton saris and hand-carved river reeds.',
    artisanCount: 260
  },
  {
    id: 'rajshahi',
    name: 'Rajshahi',
    division: 'Rajshahi Division',
    specialty: 'Pure Silk Sericulture & Brassware',
    heroImage: SYLHET_TEA_IMG,
    description: 'Centuries of organic sericulture delivering cruelty-free peace silk and recycled copper-brass metallurgy.',
    artisanCount: 195
  }
];

import { BANGLADESH_60_ECO_PRODUCTS } from './bangladeshEcoProducts';
export { BANGLADESH_60_ECO_PRODUCTS };
export const INITIAL_PRODUCTS: Product[] = BANGLADESH_60_ECO_PRODUCTS;

export const INITIAL_QUEUE_SUBMISSIONS: QueueSubmission[] = [
  {
    id: 'queue-1',
    trackingId: 'ENV-8842',
    productId: INITIAL_PRODUCTS[1].id,
    product: INITIAL_PRODUCTS[1], // Handwoven Jute Tote Bag
    submittedAgo: '2 hrs ago',
    submittedDate: 'Oct 24, 2024',
    status: 'pending',
    internalNotes: 'Sample fabric fiber inspection matches certified jute grade A. Sourcing documentation looks authentic from Faridpur cluster.'
  },
  {
    id: 'queue-2',
    trackingId: 'ENV-8839',
    productId: INITIAL_PRODUCTS[5].id,
    product: INITIAL_PRODUCTS[5], // Bamboo Travel Cutlery Set
    submittedAgo: '5 hrs ago',
    submittedDate: 'Oct 24, 2024',
    status: 'pending',
    internalNotes: 'Cutlery finish uses food-grade oil. Awaiting lab certificate verification on straw glue-free construction.'
  },
  {
    id: 'queue-3',
    trackingId: 'ENV-8820',
    productId: INITIAL_PRODUCTS[6].id,
    product: INITIAL_PRODUCTS[6], // Forest Glaze Ceramic Mug
    submittedAgo: '1 day ago',
    submittedDate: 'Oct 23, 2024',
    status: 'flagged',
    internalNotes: 'Flagged: missing lead testing laboratory documentation for the copper oxide green glaze. Requesting updated certificate from seller.'
  },
  {
    id: 'queue-4',
    trackingId: 'ENV-8815',
    productId: INITIAL_PRODUCTS[2].id,
    product: INITIAL_PRODUCTS[2], // Organic Neem Soap Set
    submittedAgo: '2 days ago',
    submittedDate: 'Oct 22, 2024',
    status: 'under_review',
    internalNotes: 'Verification of seed-packaging germination rate underway. Ingredients 100% natural.'
  }
];

export { INITIAL_ECO_COLLECTIONS as CURATED_ECO_COLLECTIONS } from '../services/customerDiscoveryService';

