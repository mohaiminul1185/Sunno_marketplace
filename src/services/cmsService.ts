import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  SiteBrandingSettings,
  CMSHeroBanner,
  CMSSection,
  CMSVersionEntry,
  MediaAsset,
  MediaFilterCriteria,
} from '../types';
import { BRAND_LOGO, HERO_ARTISAN_IMG } from '../data/mockData';
import { createAuditLog } from './dbService';

export const SITE_SETTINGS_COL = 'site_settings';
export const CMS_SECTIONS_COL = 'cms_sections';
export const MEDIA_ASSETS_COL = 'media_assets';
export const CMS_VERSIONS_COL = 'cms_versions';

export const DEFAULT_SITE_SETTINGS: SiteBrandingSettings = {
  id: 'global-branding',
  siteName: 'SUNNO Bangladesh',
  tagline: 'Sustainable E-Commerce Marketplace Across 64 Districts',
  logoUrl: BRAND_LOGO,
  faviconUrl: BRAND_LOGO,
  contactEmail: 'contact@sunno.eco',
  contactPhone: '+880 1819-000000',
  supportHours: 'Saturday - Thursday: 9:00 AM - 8:00 PM',
  announcementText: '🌿 Welcome to SUNNO — 100% Verified Bangladesh Eco-Artisan Marketplace | Zero Single-Use Plastics',
  announcementLink: '#all_products',
  announcementActive: true,
  facebookUrl: 'https://facebook.com/sunno.eco',
  instagramUrl: 'https://instagram.com/sunno.eco',
  youtubeUrl: 'https://youtube.com/@sunnobangladesh',
  copyrightText: '© 2026 SUNNO Marketplace Ltd. Empowering Bangladesh rural artisans.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export const DEFAULT_HERO_BANNER: CMSHeroBanner = {
  id: 'banner-hero-main',
  title: 'Eco-Friendly Products from Bangladesh',
  subtitle: 'Discover authentic, locally made, and sustainable products from verified sellers across the country.',
  ctaText: 'Shop Now',
  ctaLink: '#products',
  secondaryCtaText: 'Explore Categories',
  secondaryCtaLink: '#categories',
  desktopImageUrl: HERO_ARTISAN_IMG,
  mobileImageUrl: HERO_ARTISAN_IMG,
  active: true,
  displayOrder: 1,
  badgeText: 'SUSTAINABLE LIVING',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export const DEFAULT_CMS_SECTIONS: CMSSection[] = [
  {
    id: 'sec-hero-banner',
    type: 'hero_banner',
    title: DEFAULT_HERO_BANNER.title,
    subtitle: DEFAULT_HERO_BANNER.subtitle,
    active: true,
    displayOrder: 1,
    bannerUrl: DEFAULT_HERO_BANNER.desktopImageUrl,
    mobileBannerUrl: DEFAULT_HERO_BANNER.mobileImageUrl,
    ctaText: DEFAULT_HERO_BANNER.ctaText,
    ctaLink: DEFAULT_HERO_BANNER.ctaLink,
    metadata: {
      badgeText: DEFAULT_HERO_BANNER.badgeText,
      secondaryCtaText: DEFAULT_HERO_BANNER.secondaryCtaText,
      secondaryCtaLink: DEFAULT_HERO_BANNER.secondaryCtaLink,
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-featured-categories',
    type: 'featured_categories',
    title: 'Shop by Sustainable Heritage Craft',
    subtitle: 'Preserving ancient Bengal artisan techniques with 100% eco-certified materials.',
    active: true,
    displayOrder: 2,
    itemIds: ['cat-organic-food', 'cat-handmade-crafts', 'cat-sustainable-fashion', 'cat-eco-home'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-district-highlights',
    type: 'district_highlights',
    title: 'Explore Bangladesh’s 64 Districts',
    subtitle: 'From Sundarbans Wildflower Honey to Tangail Handloom Khadi.',
    active: true,
    displayOrder: 3,
    itemIds: ['Tangail', 'Rangamati', 'Khulna', 'Sylhet', 'Bogura', 'Sirajganj'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-artisan-stories',
    type: 'artisan_stories',
    title: 'Voices of Master Artisans',
    subtitle: 'Meet the rural weavers, potters, and beekeepers preserving our sustainable heritage.',
    active: false,
    displayOrder: 4,
    metadata: {
      stories: [
        {
          artisanName: 'Anisur Rahman',
          district: 'Tangail',
          craft: 'Traditional Handloom Khadi',
          quote: 'Every thread in our loom is naturally dyed with pomegranate rinds and indigo. SUNNO ensures our 40-family cooperative earns triple standard market wages.',
          image: HERO_ARTISAN_IMG,
        },
        {
          artisanName: 'Monira Begum',
          district: 'Khulna (Sundarbans)',
          craft: 'Wildflower Honey Forager',
          quote: 'We harvest honey sustainably from mangrove deep forests without harming honeybees, packaged in recycled glass jars with jute ties.',
          image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
        },
      ],
    },
    updatedAt: new Date().toISOString(),
  },
];

// ==========================================
// SITE SETTINGS / BRANDING MANAGEMENT
// ==========================================

export async function fetchSiteSettings(): Promise<SiteBrandingSettings> {
  try {
    const docRef = doc(db, SITE_SETTINGS_COL, 'global-branding');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_SITE_SETTINGS, ...(snap.data() as SiteBrandingSettings) };
    }
    // Seed default to Firestore
    await setDoc(docRef, DEFAULT_SITE_SETTINGS);
    return DEFAULT_SITE_SETTINGS;
  } catch (err) {
    console.warn('fetchSiteSettings fallback:', err);
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function updateSiteSettings(
  settings: Partial<SiteBrandingSettings>,
  actorEmail: string = 'admin@sunno.eco'
): Promise<SiteBrandingSettings> {
  try {
    const docRef = doc(db, SITE_SETTINGS_COL, 'global-branding');
    const existing = await fetchSiteSettings();
    const updated: SiteBrandingSettings = {
      ...existing,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail,
    };
    await setDoc(docRef, updated, { merge: true });

    // Record CMS Version & Audit
    await recordCMSVersion({
      entityType: 'site_settings',
      entityId: 'global-branding',
      changeDescription: 'Updated global site branding and navigation settings',
      previousValue: existing,
      newValue: updated,
      changedByEmail: actorEmail,
    });

    await createAuditLog({
      action: 'SITE_SETTINGS_UPDATED',
      performedBy: actorEmail,
      actorEmail,
      actorRole: 'admin',
      targetType: 'site_settings',
      targetId: 'global-branding',
      details: 'Admin updated site branding, announcement, or contact info.',
      timestamp: new Date().toISOString(),
    });

    return updated;
  } catch (err) {
    console.error('updateSiteSettings error:', err);
    throw err;
  }
}

export function subscribeSiteSettings(onUpdate: (settings: SiteBrandingSettings) => void) {
  try {
    const docRef = doc(db, SITE_SETTINGS_COL, 'global-branding');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        onUpdate({ ...DEFAULT_SITE_SETTINGS, ...(snap.data() as SiteBrandingSettings) });
      } else {
        onUpdate(DEFAULT_SITE_SETTINGS);
      }
    });
  } catch {
    return () => {};
  }
}

// ==========================================
// CMS HOMEPAGE SECTIONS MANAGEMENT
// ==========================================

export async function fetchCMSSections(): Promise<CMSSection[]> {
  try {
    const snap = await getDocs(collection(db, CMS_SECTIONS_COL));
    if (snap.empty) {
      // Seed default sections
      for (const sec of DEFAULT_CMS_SECTIONS) {
        await setDoc(doc(db, CMS_SECTIONS_COL, sec.id), sec);
      }
      return DEFAULT_CMS_SECTIONS;
    }
    const sections = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CMSSection));
    return sections.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } catch (err) {
    console.warn('fetchCMSSections fallback:', err);
    return DEFAULT_CMS_SECTIONS;
  }
}

export async function saveCMSSection(
  section: CMSSection,
  actorEmail: string = 'admin@sunno.eco'
): Promise<CMSSection> {
  try {
    const docRef = doc(db, CMS_SECTIONS_COL, section.id);
    const existingSnap = await getDoc(docRef);
    const prev = existingSnap.exists() ? existingSnap.data() : null;

    const payload: CMSSection = {
      ...section,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail,
    };
    await setDoc(docRef, payload, { merge: true });

    await recordCMSVersion({
      entityType: 'cms_sections',
      entityId: section.id,
      changeDescription: `Updated CMS Section "${section.title}" (${section.type})`,
      previousValue: prev,
      newValue: payload,
      changedByEmail: actorEmail,
    });

    await createAuditLog({
      action: 'CMS_SECTION_SAVED',
      performedBy: actorEmail,
      actorEmail,
      actorRole: 'admin',
      targetType: 'cms_section',
      targetId: section.id,
      details: `Admin saved homepage CMS section: ${section.title}`,
      timestamp: new Date().toISOString(),
    });

    return payload;
  } catch (err) {
    console.error('saveCMSSection error:', err);
    throw err;
  }
}

export async function deleteCMSSection(
  sectionId: string,
  actorEmail: string = 'admin@sunno.eco'
): Promise<void> {
  try {
    const docRef = doc(db, CMS_SECTIONS_COL, sectionId);
    await deleteDoc(docRef);

    await createAuditLog({
      action: 'CMS_SECTION_DELETED',
      performedBy: actorEmail,
      actorEmail,
      actorRole: 'admin',
      targetType: 'cms_section',
      targetId: sectionId,
      details: `Admin removed homepage CMS section: ${sectionId}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('deleteCMSSection error:', err);
    throw err;
  }
}

export function subscribeCMSSections(onUpdate: (sections: CMSSection[]) => void) {
  try {
    const q = query(collection(db, CMS_SECTIONS_COL));
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const sections = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CMSSection));
        onUpdate(sections.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
      } else {
        onUpdate(DEFAULT_CMS_SECTIONS);
      }
    });
  } catch {
    return () => {};
  }
}

// ==========================================
// MEDIA LIBRARY ASSET MANAGEMENT
// ==========================================

export async function registerMediaAsset(asset: Omit<MediaAsset, 'id'>): Promise<MediaAsset> {
  try {
    const id = `media-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullAsset: MediaAsset = {
      ...asset,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, MEDIA_ASSETS_COL, id), fullAsset);
    return fullAsset;
  } catch (err) {
    console.error('registerMediaAsset error:', err);
    throw err;
  }
}

export async function fetchMediaAssets(criteria?: MediaFilterCriteria): Promise<MediaAsset[]> {
  try {
    const snap = await getDocs(collection(db, MEDIA_ASSETS_COL));
    if (snap.empty) {
      // Return initial media catalog
      return [
        {
          id: 'media-brand-logo',
          url: BRAND_LOGO,
          storagePath: 'assets/brand-logo.png',
          fileName: 'sunno-brand-logo.png',
          fileType: 'image',
          mimeType: 'image/png',
          sizeBytes: 42000,
          uploadedBy: 'system',
          category: 'logo',
          altText: 'SUNNO Brand Logo',
          tags: ['logo', 'brand'],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'media-hero-artisan',
          url: HERO_ARTISAN_IMG,
          storagePath: 'assets/hero-artisan.jpg',
          fileName: 'tangail-handloom-artisan.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 250000,
          uploadedBy: 'system',
          category: 'banner',
          altText: 'Tangail Handloom Master Artisan Weaving',
          tags: ['banner', 'artisan', 'tangail', 'handloom'],
          createdAt: new Date().toISOString(),
        },
      ];
    }

    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MediaAsset));

    if (criteria?.fileType && criteria.fileType !== 'all') {
      list = list.filter((m) => m.fileType === criteria.fileType);
    }
    if (criteria?.category && criteria.category !== 'all') {
      list = list.filter((m) => m.category === criteria.category);
    }
    if (criteria?.searchQuery && criteria.searchQuery.trim()) {
      const q = criteria.searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.fileName.toLowerCase().includes(q) ||
          m.altText?.toLowerCase().includes(q) ||
          m.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (criteria?.isArchived !== undefined) {
      list = list.filter((m) => Boolean(m.isArchived) === criteria.isArchived);
    } else {
      list = list.filter((m) => !m.isArchived);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('fetchMediaAssets fallback:', err);
    return [];
  }
}

export async function archiveMediaAsset(assetId: string, actorEmail: string = 'admin@sunno.eco'): Promise<void> {
  try {
    const ref = doc(db, MEDIA_ASSETS_COL, assetId);
    await updateDoc(ref, {
      isArchived: true,
      updatedAt: new Date().toISOString(),
    });
    await createAuditLog({
      action: 'MEDIA_ASSET_ARCHIVED',
      performedBy: actorEmail,
      actorEmail,
      actorRole: 'admin',
      targetType: 'media_asset',
      targetId: assetId,
      details: `Media asset ${assetId} archived from library`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('archiveMediaAsset error:', err);
    throw err;
  }
}

export async function restoreMediaAsset(assetId: string, actorEmail: string = 'admin@sunno.eco'): Promise<void> {
  try {
    const ref = doc(db, MEDIA_ASSETS_COL, assetId);
    await updateDoc(ref, {
      isArchived: false,
      updatedAt: new Date().toISOString(),
    });
    await createAuditLog({
      action: 'MEDIA_ASSET_RESTORED',
      performedBy: actorEmail,
      actorEmail,
      actorRole: 'admin',
      targetType: 'media_asset',
      targetId: assetId,
      details: `Media asset ${assetId} restored to active library`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('restoreMediaAsset error:', err);
    throw err;
  }
}

// ==========================================
// CMS AUDIT & VERSION HISTORY
// ==========================================

export async function recordCMSVersion(params: {
  entityType: 'site_settings' | 'cms_sections' | 'hero_banners' | 'cms_pages';
  entityId: string;
  changeDescription: string;
  previousValue: any;
  newValue: any;
  changedByEmail: string;
}): Promise<void> {
  try {
    const id = `ver-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const entry: CMSVersionEntry = {
      id,
      entityType: params.entityType,
      entityId: params.entityId,
      changeDescription: params.changeDescription,
      previousValue: params.previousValue,
      newValue: params.newValue,
      changedBy: params.changedByEmail,
      changedByEmail: params.changedByEmail,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, CMS_VERSIONS_COL, id), entry);
  } catch (err) {
    console.warn('recordCMSVersion note:', err);
  }
}

export async function fetchCMSVersionHistory(entityType?: string): Promise<CMSVersionEntry[]> {
  try {
    const snap = await getDocs(collection(db, CMS_VERSIONS_COL));
    if (snap.empty) return [];
    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CMSVersionEntry));
    if (entityType && entityType !== 'all') {
      list = list.filter((v) => v.entityType === entityType);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.warn('fetchCMSVersionHistory error:', err);
    return [];
  }
}
