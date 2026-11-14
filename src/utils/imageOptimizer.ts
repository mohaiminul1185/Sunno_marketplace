/**
 * SUNNO Marketplace - Production Image Optimizer
 * 
 * Provides responsive image sizing, thumbnail generation, WebP/AVIF auto-formatting,
 * lazy-loading dimensions, and placeholder fallbacks to eliminate layout shift (CLS)
 * and optimize network transfer across all 64 districts.
 */

export type ImageSizeVariant = 'thumb' | 'avatar' | 'card' | 'detail' | 'hero' | 'banner';

export const DEFAULT_PRODUCT_FALLBACK =
  'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=480&q=75';

export const DEFAULT_AVATAR_FALLBACK =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=75';

const VARIANT_WIDTHS: Record<ImageSizeVariant, number> = {
  thumb: 160,
  avatar: 96,
  card: 480,
  detail: 900,
  hero: 1200,
  banner: 1400,
};

const VARIANT_QUALITY: Record<ImageSizeVariant, number> = {
  thumb: 70,
  avatar: 75,
  card: 78,
  detail: 85,
  hero: 85,
  banner: 82,
};

/**
 * Transforms an image URL into a performance-optimized URL with exact width & quality.
 */
export function getOptimizedImageUrl(
  url: string | undefined | null,
  variant: ImageSizeVariant = 'card'
): string {
  if (!url || typeof url !== 'string') {
    return variant === 'avatar' ? DEFAULT_AVATAR_FALLBACK : DEFAULT_PRODUCT_FALLBACK;
  }

  const cleanUrl = url.trim();
  if (!cleanUrl) {
    return variant === 'avatar' ? DEFAULT_AVATAR_FALLBACK : DEFAULT_PRODUCT_FALLBACK;
  }

  // Optimize Unsplash images
  if (cleanUrl.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(cleanUrl);
      const width = VARIANT_WIDTHS[variant] || 480;
      const quality = VARIANT_QUALITY[variant] || 78;

      parsed.searchParams.set('w', width.toString());
      parsed.searchParams.set('q', quality.toString());
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      return parsed.toString();
    } catch {
      return cleanUrl;
    }
  }

  // Return original for data URLs or direct CDNs
  return cleanUrl;
}

/**
 * Generates responsive srcset for Unsplash images across common viewport breakpoints.
 */
export function getOptimizedSrcSet(url: string | undefined | null): string | undefined {
  if (!url || typeof url !== 'string' || !url.includes('images.unsplash.com')) {
    return undefined;
  }

  try {
    const parsed = new URL(url.trim());
    const widths = [320, 480, 640, 800, 1024];

    return widths
      .map((w) => {
        parsed.searchParams.set('w', w.toString());
        parsed.searchParams.set('q', '75');
        parsed.searchParams.set('auto', 'format');
        parsed.searchParams.set('fit', 'crop');
        return `${parsed.toString()} ${w}w`;
      })
      .join(', ');
  } catch {
    return undefined;
  }
}

/**
 * Standardizes responsive sizes attribute for product cards
 */
export const CARD_IMAGE_SIZES = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';
export const DETAIL_IMAGE_SIZES = '(max-width: 768px) 100vw, 50vw';
