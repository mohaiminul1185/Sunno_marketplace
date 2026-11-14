/**
 * SUNNO Marketplace - Comprehensive SEO & Structured Data Service
 * 
 * Complies with Google AI Studio SEO standards, OpenGraph Protocol,
 * Twitter Cards, and Schema.org rich results (Product, Organization, CollectionPage).
 */

import { Product, Category } from '../types';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

export interface PageSeoConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string;
  type?: 'website' | 'product' | 'article';
  jsonLd?: Record<string, any>;
}

const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80';

const BASE_URL = 'https://sunno.eco';

/**
 * Sets or updates an existing meta tag in document.head
 */
function setMetaTag(attributeName: 'name' | 'property', attributeValue: string, content: string): void {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Sets or updates canonical link element in document.head
 */
function setCanonicalUrl(url: string): void {
  if (typeof document === 'undefined') return;

  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/**
 * Injects or updates Schema.org JSON-LD structured data
 */
function setJsonLdScript(data: Record<string, any> | null): void {
  if (typeof document === 'undefined') return;

  const scriptId = 'sunno-schema-jsonld';
  let script = document.head.querySelector<HTMLScriptElement>(`#${scriptId}`);

  if (!data) {
    if (script) script.remove();
    return;
  }

  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.text = JSON.stringify(data, null, 2);
}

/**
 * Updates full page metadata including social cards and structured data
 */
export function updatePageSeo(config: PageSeoConfig): void {
  if (typeof document === 'undefined') return;

  // 1. Page Title
  document.title = config.title;

  // 2. Standard Meta Description
  setMetaTag('name', 'description', config.description);

  // 3. Canonical URL
  setCanonicalUrl(config.canonicalUrl);

  // 4. OpenGraph Metadata
  setMetaTag('property', 'og:title', config.title);
  setMetaTag('property', 'og:description', config.description);
  setMetaTag('property', 'og:url', config.canonicalUrl);
  setMetaTag('property', 'og:type', config.type || 'website');
  setMetaTag('property', 'og:image', config.imageUrl || DEFAULT_BANNER);
  setMetaTag('property', 'og:site_name', 'SUNNO Marketplace');

  // 5. Twitter Card Metadata
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', config.title);
  setMetaTag('name', 'twitter:description', config.description);
  setMetaTag('name', 'twitter:image', config.imageUrl || DEFAULT_BANNER);

  // 6. Schema.org JSON-LD
  if (config.jsonLd) {
    setJsonLdScript(config.jsonLd);
  }
}

/**
 * Generates Product Schema.org structured data for verified eco products
 */
export function buildProductJsonLd(product: Product, canonicalUrl: string): Record<string, any> {
  const imageUrl =
    product.images && product.images.length > 0
      ? getOptimizedImageUrl(product.images[0], 'detail')
      : DEFAULT_BANNER;

  const isAvailable =
    product.status !== 'out_of_stock' &&
    (typeof product.stock !== 'number' || product.stock > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: [imageUrl],
    description: product.description || product.shortDescription || `${product.title} from ${product.district}, Bangladesh.`,
    sku: product.id,
    mpn: product.id,
    brand: {
      '@type': 'Brand',
      name: product.sellerName || 'SUNNO Artisan Guild',
    },
    category: product.category,
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'BDT',
      price: product.price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.sellerName || 'SUNNO Artisan Partner',
      },
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'District of Origin',
        value: product.district,
      },
      {
        '@type': 'PropertyValue',
        name: 'Eco Verification',
        value: product.status === 'eco_verified' ? 'Verified Eco-Friendly' : 'Sustainable Heritage',
      },
      {
        '@type': 'PropertyValue',
        name: 'Eco Score',
        value: product.ecoScore || 85,
      },
    ],
  };
}

/**
 * Generates Category CollectionPage Schema.org structured data
 */
export function buildCategoryJsonLd(category: Category, canonicalUrl: string): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} | SUNNO Eco Marketplace Bangladesh`,
    description: category.description || `Browse authentic verified ${category.name} from Bangladeshi artisans.`,
    url: canonicalUrl,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${BASE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Categories',
          item: `${BASE_URL}/#categories`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: category.name,
          item: canonicalUrl,
        },
      ],
    },
  };
}

/**
 * Generates 64 Districts Directory Schema.org structured data
 */
export function buildDistrictsJsonLd(districtName: string, canonicalUrl: string): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: districtName === 'All' 
      ? '64 Districts of Bangladesh Artisan Heritage Directory | SUNNO' 
      : `${districtName} District Authentic Crafts & Eco Products | SUNNO Bangladesh`,
    description: `Discover indigenous handcrafts, organic foods, and heritage artisanal creations originating from ${districtName}, Bangladesh.`,
    url: canonicalUrl,
  };
}
