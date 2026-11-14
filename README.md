# SUNNO (শূন্য) — Bangladesh's First Hyperlocal & Sustainable Artisanal Marketplace

[![Version](https://img.shields.io/badge/version-2.6.0-green.svg)](https://sunno.app)
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Framework](https://img.shields.io/badge/React-18.3-cyan.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Firebase-Firestore-amber.svg)](https://firebase.google.com/)

> **Empowering Sustainable Bangladesh** with eco-verified artisan products, 64-district geo-discovery, multi-vendor cart checkout, official itemized tax receipts, transactional notifications, and live courier parcel tracking.

---

## 1. System Overview

SUNNO connects conscious consumers directly with certified rural artisans, organic farmers, and eco-cooperatives across all **64 districts of Bangladesh**. Built on a high-concurrency full-stack architecture (React, TypeScript, Express, Vite, and Google Firebase Firestore), it enforces zero-mock database queries, strict server-side RBAC, and multi-tenant seller isolation.

### Key Capabilities
- **64 Districts Geo-Discovery**: Curated heritage crafts filtered by district specializations (e.g., Sundarbans honey, Khadi fabric, Rajshahi silk, Tangail tant, Sylhet cane).
- **Eco-Verification Trust System**: Strict 7-criteria material audit workflow before products receive the verified green leaf badge.
- **Multi-Tenant Roles (RBAC)**:
  - `customer`: Browse, compare, cart, checkout, live parcel tracking, returns, reviews, direct chat.
  - `seller`: Dedicated artisan portal, multi-product management, inventory tracking, courier parcel booking, double-entry financial wallet, withdrawal requests.
  - `moderator` & `admin`: Verification queues, CMS banners, logistics hub, settlement approvals, audit trail logs.
- **Payment & Financial Architecture**:
  - Registered providers for bKash, Nagad, DBBL Rocket, Upay, and SSLCommerz, plus Native Cash on Delivery (COD).
  - 8-bucket seller wallet balance ledger (`available`, `pending`, `processing`, `settled`, `reserved`, `refunded`, `withdrawn`, `lifetimeEarned`).
  - Atomic row-locking via Firestore transactions (`runTransaction`) preventing concurrent withdrawal double-deductions.
- **Logistics Integration Engine**:
  - Direct integration adapters for Steadfast Courier, Pathao Logistics, RedX, Paperfly, and eCourier.
  - Automated printable parcel shipping labels, itemized tax invoices, and real-time consignee tracking.
- **Transactional Notifications**:
  - Greenweb SMS gateway adapter with automatic Bangladesh phone standardization (`8801XXXXXXXXX`) and delivery receipt confirmation.
  - Resend Email gateway with responsive HTML invoice templates.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Headless UI.
- **Backend & API Server**: Express.js running on Port 3000, Vite middleware for development, Node CommonJS bundle for production.
- **Data Persistence**: Google Firebase Firestore (NoSQL, real-time listeners, security rules, composite indexes).
- **Authentication**: Firebase Authentication with email/password and Google Identity Services.
- **Storage**: Firebase Cloud Storage with strict image-only validation and 10MB size limits.

---

## 3. Environment Setup & Configuration

Copy `.env.example` to `.env` and configure appropriate credentials:

```bash
cp .env.example .env
```

### Essential Variables
| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Required application port | `3000` |
| `NODE_ENV` | Environment mode | `production` / `development` |
| `PAYMENT_MODE` | Payment execution mode | `sandbox` / `live` / `disabled` |
| `SMS_MODE` | Transactional SMS mode | `sandbox` / `live` / `disabled` |
| `EMAIL_MODE` | Transactional email mode | `sandbox` / `live` / `disabled` |
| `SMS_PROVIDER_API_KEY` | Greenweb SMS Token | Provided by Greenweb BD |
| `EMAIL_PROVIDER_API_KEY`| Resend API Key | `re_...` |
| `STEADFAST_API_KEY` | Steadfast Merchant API Key | Provided by Steadfast |
| `PATHAO_CLIENT_ID` | Pathao API Client ID | Provided by Pathao Developer Portal |

---

## 4. Development & Production Commands

```bash
# Install dependencies
npm install

# Start development server (boots on port 3000)
npm run dev

# Run TypeScript compilation & linting
npm run lint

# Build full production bundle (Vite + backend bundle)
npm run build

# Start production server
npm start
```

---

## 5. Security & Multi-Tenant Architecture

- **Server-Side Enforcement**: `firestore.rules` guarantees that Customer cannot access Admin panels, Seller A cannot access Seller B's orders or balance ledger, and wallets can never reach negative balances.
- **Zero-Mock Catalog**: Product and order discovery query live collections in Firestore without client-side mock dependencies.
- **Double-Entry Ledger**: Permanent, immutable append-only records in `financial_ledger` for every credit, debit, hold, or withdrawal reversal.
