/**
 * SUNNO Centralized Branding & Configuration Source of Truth
 * Single authoritative source for logo assets, marketplace identity, contact information, and trust badges.
 */

export const BRAND_LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2K5yxV8pylrPtXMwom4Z5S0BPymzmBRSJzfWOobqgnvBSv-OIASXuR0xCKBCSyAQ1jXz-_2P32Fv74u7mao0FPTY5N4T0awQqtj5RfoCCy5X-Nc5dEpNcEtAQFobmnVKAvDb46MtHaVr5BNrQfvHA4GNokm9f-XSAIFibVAyNMatNuyOYqYEmhuma7_twsfIfNxeKGuzgx3LDsnmDQaTVzne6XRgrX5mX9-hx06mcC1KPG__lBkrz_g_64DRvzxKNGg';
export const BRAND_LOGO_FALLBACK = '/sunno-logo.png';

export const SUNNO_BRAND = {
  name: 'SUNNO',
  bengaliName: 'শূন্য',
  fullName: 'SUNNO Eco-Friendly Marketplace Bangladesh',
  tagline: 'Empowering Sustainable Bangladesh',
  slogan: 'Handcrafted Heritage & Zero-Waste Living from 64 Districts',
  description: 'Connecting verified rural artisan cooperatives across all 64 districts of Bangladesh with conscious patrons. Authentic jute, handloom, terracotta pottery, and certified organic goods.',
  establishedYear: '2024',
  website: 'https://sunno.eco',
  contact: {
    hotline: '+880 1712-345678',
    whatsapp: '+880 1712-345678',
    supportEmail: 'support@sunno.eco',
    artisanEmail: 'artisan@sunno.eco',
    pressEmail: 'press@sunno.eco',
    registeredOffice: 'House 42, Road 11, Block D, Banani, Dhaka-1213, Bangladesh',
    tradeLicenseNo: 'TRAD/DNCC/042819/2024',
    tinNumber: '849204810294',
    binNumber: '003928174-0101',
  },
  social: {
    facebook: 'https://facebook.com/sunnobangladesh',
    instagram: 'https://instagram.com/sunno.eco',
    linkedin: 'https://linkedin.com/company/sunno-eco',
    youtube: 'https://youtube.com/@sunnobangladesh',
  },
  logos: {
    primary: BRAND_LOGO_URL,
    fallback: BRAND_LOGO_FALLBACK,
    white: BRAND_LOGO_URL,
    icon: BRAND_LOGO_FALLBACK,
  },
  trust: {
    ecoStandard: 'Bangladesh 100% Biodegradable & Natural Material Standard',
    returnWindowDays: 7,
    freeDeliveryThreshold: 2500,
    insideDhakaCourierDays: '24–48 Hours',
    nationwideCourierDays: '2–4 Business Days',
  },
} as const;

export const BRAND_LOGO = SUNNO_BRAND.logos.primary;
export const BRAND_LOGO_REMOTE = SUNNO_BRAND.logos.primary;
