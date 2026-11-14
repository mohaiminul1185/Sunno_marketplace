# SUNNO (শূন্য) - Software Requirements Specification (SRS) & Implementation Roadmap
**Project Title**: SUNNO — Bangladesh's First Hyperlocal & Sustainable Artisanal Marketplace  
**Version**: 2.5 (Current Implemented State + Future Roadmap)  
**Target Platform**: Full-Stack Web Application (React + TypeScript + Tailwind CSS + Firebase Firestore / Cloud Run)  
**Prepared For**: Software Engineering Project Documentation, SRS Submission, and Development Audit

---

## 1. Executive Summary & Project Vision

**SUNNO (শূন্য)** is a multi-vendor eco-conscious e-commerce marketplace dedicated to traditional Bangladeshi artisans, sustainable producers, organic farmers, and eco-friendly home craftsmen across all **64 districts** of Bangladesh.

### Core Value Propositions:
1. **Hyperlocal Heritage & 64 District Geo-Discovery**: Connecting buyers directly to district-specialty products (e.g., Sundarbans Raw Honey, Tangail Khadi & Tant, Rajshahi Silk, Sylhet Cane/Bamboo, Bogura Terracotta).
2. **Eco-Verification Trust System**: Strict auditing system where green products receive verified eco-tags (Biodegradable, Organic Certified, Plastic-Free, Zero Chemical, Handloom Authentic).
3. **Three-Tier Multi-Role Architecture**: Dedicated, secured workflows for **Customers**, **Artisans/Sellers**, and **Platform Admins**.
4. **End-to-End Bangladeshi E-Commerce Experience**: Native integration with bKash, Nagad, Rocket, Upay, Bank Transfer, Cash on Delivery (COD), along with local courier workflows (Steadfast, Pathao, RedX) and digital printable invoices.

---

## 2. Technology Stack & System Architecture

| Layer | Technology / Framework | Description |
|---|---|---|
| **Frontend UI Framework** | React 18+ (Vite) | Single-Page Application (SPA) architecture with fast client-side routing |
| **Language** | TypeScript | Strong typing across all entities, props, state, and database models |
| **Styling & Design System** | Tailwind CSS + Lucide Icons | Custom eco-palette (Deep Forest Green, Bamboo Light, Warm Terracotta, Paper Neutral) |
| **State & Authentication** | React Context (`AuthContext`) + LocalStorage fallback | Multi-role session management (Guest, Customer, Seller, Admin) |
| **Database & Cloud Storage** | Google Firebase Firestore | Real-time reactive data sync, multi-collection document models, persistent storage |
| **Backend & Ingress** | Express / Node.js (Cloud Run compliant) | API proxying, SSR/SPA serving on standard port 3000 |
| **Visual Assets** | Curated high-res imagery + SVG vector iconography | Fast loading, lazy-loaded responsive imagery |

---

## 3. User Roles & Access Control Matrix (RBAC)

| Role | Access Scope | Key Permissions & Capabilities |
|---|---|---|
| **Guest / Visitor** | Public Storefront | Browse products, 64-district exploration, intelligent search, quick view, product comparison, delivery checker, add to cart/wishlist. |
| **Customer** | Storefront + Customer Portal | Place orders, track live status, download PDF-style invoices, submit product reviews with photos, initiate return/refund requests, manage addresses, earn Green Karma points, direct chat with sellers. |
| **Artisan / Seller** | Seller Portal | Onboard shop, upload/edit products, track stock, fulfill orders, generate printable courier parcel labels, view earnings, manage balance payouts, reply to customer inquiries. |
| **Admin / Super Admin** | Admin Control Panel | Audit & approve sellers/products, assign "Eco-Verified" badges, manage global categories & banners, resolve customer support tickets, manage courier logistics, process seller settlements, generate financial & analytical reports. |

---

## 4. Functional Requirements Specification (FRS)

### MODULE 1: Customer Discovery & Storefront Engine
* **1.1 Intelligent Search Bar**:
  - Live tokenized multi-field matching (Title, Category, Subcategory, District, Division, Materials, Tags).
  - Autocomplete suggestion dropdown with product thumbnails, category suggestions, district links, and price tags.
  - Keyboard navigation (`Arrow Up`, `Arrow Down`, `Enter`, `Esc`).
  - Search history persistence (`localStorage`) with individual deletion and "Clear All" capability.
  - 1-click popular search tags (e.g., "Sundarbans Raw Honey", "Bamboo Utensils", "Nakshi Kantha").
* **1.2 Strict Relevance Search Results Page**:
  - Excludes draft, archived, rejected, or suspended items.
  - Sorting options: Recommended (Eco-score boosted), Price Low to High, Price High to Low, Rating, Best Selling, Newest.
  - Multi-token relevance weighting (exact title match, tags match, district match).
* **1.3 64 Districts Geo-Exploration**:
  - Interactive district explorer displaying district heritage specialties (e.g., Khagrachari Wild Turmeric, Khulna Coconut Crafts).
  - Filter products by specific Bangladesh districts and divisions.
* **1.4 Product Showcase & Quick View**:
  - Full Product Detail view with high-res multi-image gallery, materials composition, artisan biography, stock indicators, and eco-score badge.
  - Quick View modal for previewing product details directly from grid without full page reload.
* **1.5 Product Comparison Modal**:
  - Side-by-side comparison of up to 4 eco-products (Price, Materials, Eco-Certifications, Origin District, Stock, Rating).
* **1.6 Real-Time Delivery Checker**:
  - District & Upazila postal code availability and estimated delivery SLA calculation.

---

### MODULE 2: Cart, Checkout & Payment Gateway
* **2.1 Multi-Vendor Cart Drawer**:
  - Real-time item quantity adjustment, stock limit clamping, price subtotal calculation.
  - Visual indicator for Free Eco-Packaging qualification.
* **2.2 Intelligent Multi-Step Checkout**:
  - **Step 1: Shipping Address**: Full Bangladesh 64-district selector, Upazila/Thana, detailed street address, recipient phone verification.
  - **Step 2: Delivery & Shipping Rate Engine**: Dynamic shipping fee calculation (Inside Dhaka: ৳60, Outside Dhaka / Inter-District: ৳120; express eco-courier option).
  - **Step 3: Coupon & Karma Points Engine**: Promo code validation (e.g., `ECO10`, `SUSTAINABLE`, `GREENBANGLADESH`) and Karma loyalty points deduction.
  - **Step 4: Payment Methods**:
    - **MFS Gateways**: bKash, Nagad, Rocket, Upay with simulated interactive PIN & transaction verification.
    - **Cards / Internet Banking**: Visa, Mastercard, AMEX.
    - **Cash on Delivery (COD)** with order confirmation safeguards.
* **2.3 Digital Order Receipt & Confirmation**:
  - Instant order placed confirmation with generated unique Tracking ID (`SUN-XXXXXX`), order summary breakdown, and downloadable payment receipt modal.

---

### MODULE 3: Customer Profile & Post-Purchase Experience
* **3.1 Customer Dashboard**:
  - Profile overview, default delivery addresses book, order history summary, Karma loyalty points status.
* **3.2 Real-Time Order Tracking & Timeline**:
  - 5-stage visual progress tracker: `Order Placed` ➔ `Confirmed by Artisan` ➔ `Handmade/Packaged` ➔ `In Courier Transit` ➔ `Delivered`.
  - Live courier tracking number link (Steadfast / Pathao / RedX integration ready).
* **3.3 Downloadable & Printable Invoice**:
  - Formal tax/commercial invoice with seller TIN/BIN, buyer details, itemized totals, discount notes, and printable layout.
* **3.4 Product Reviews & Ratings**:
  - 5-star rating system with text review, photo upload preview, and "Verified Buyer" tag.
* **3.5 Returns & Refunds Lifecycle**:
  - Return initiation within return policy window with reason selection and photo upload.
  - Admin/Seller return audit workflow (`Pending Review` ➔ `Approved` ➔ `Product Returned` ➔ `Refund Disbursed`).
* **3.6 Direct Messaging & Support Tickets**:
  - Direct real-time chat with product seller for customized sizing or shipping questions.
  - Support ticket creation for platform-level dispute resolution.

---

### MODULE 4: Artisan / Seller Portal
* **4.1 Seller Onboarding & KYC**:
  - Store profile setup, artisan craft story, district origin, National ID (NID) / Trade License verification submission.
* **4.2 Product Inventory & Catalog Management**:
  - Add/Edit product with title, pricing, discount, stock threshold, category, subcategory, materials composition, weight/dimensions, and multiple photo uploads.
  - Eco-Verification submission (providing eco-evidence for admin badge approval).
* **4.3 Order Fulfillment & Shipping Workflow**:
  - Real-time order list with status filtering (`Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`).
  - Courier dispatch assignment (Steadfast, Pathao, RedX, eCourier) with automatic AWB tracking number generation.
  - **Printable Courier Parcel Label Modal**: Standard 4x6 barcode shipping label with sender/recipient addresses and barcode.
* **4.4 Seller Financials & Payouts**:
  - Sales overview, platform commission calculation (e.g. 5–8%), net earnings wallet, pending payouts, and bank/bKash withdrawal requests.

---

### MODULE 5: Admin Control Panel (Super Admin & Staff)
* **5.1 Role-Based Staff Management**:
  - Staff management with roles (`Super Admin`, `Product Auditor`, `Finance Manager`, `Support Officer`).
* **5.2 Product Eco-Verification Queue**:
  - Dedicated queue to inspect seller product submissions, review materials proof, and approve/reject the coveted "Eco-Verified" badge.
* **5.3 Seller Approval & Verification Queue**:
  - Review artisan trade licenses, NIDs, and verify store credentials before publishing.
* **5.4 Categories & Homepage CMS Management**:
  - Create, edit, activate, or archive top-level categories and subcategories.
  - Banner management, hero highlight promotions, and trending tags.
* **5.5 Order Logistics & Courier Operations Hub**:
  - Global view of all platform orders, courier dispatch status, bulk status updates.
* **5.6 Financial Settlements & Revenue Dashboard**:
  - Platform GMV (Gross Merchandise Value), commission income, seller payout approval, refund disbursements.
* **5.7 Analytics & Custom Report Generator**:
  - Top performing districts, bestselling categories, customer growth, exportable CSV/PDF reports.

---

## 5. Database Schema & Data Models (Firestore / Relational Ready)

### 1. `users` Collection
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'customer' | 'seller' | 'admin';
  phone?: string;
  district?: string;
  address?: string;
  karmaPoints?: number;
  createdAt: string;
  storeId?: string; // If seller
}
```

### 2. `products` Collection
```typescript
interface Product {
  id: string;
  title: string;
  price: number;
  discount?: number;
  category: string;
  subcategory?: string;
  district: string;
  division: string;
  sellerId: string;
  sellerName: string;
  images: string[];
  stock: number;
  status: 'draft' | 'pending_verification' | 'eco_verified' | 'active' | 'out_of_stock' | 'archived';
  ecoVerified: boolean;
  ecoTypes: ('Organic' | 'Handmade' | 'Plastic-Free' | 'Recycled' | 'Biodegradable')[];
  materialsInfo: string;
  description: string;
  rating: number;
  reviewsCount: number;
  createdAt: string;
}
```

### 3. `orders` Collection
```typescript
interface Order {
  id: string; // SUN-XXXXXX
  customerId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: {
    street: string;
    upazila: string;
    district: string;
    division: string;
  };
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'cod' | 'card';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  courierInfo?: {
    provider: 'Steadfast' | 'Pathao' | 'RedX';
    trackingNumber: string;
    dispatchedAt: string;
  };
  createdAt: string;
}
```

### 4. `categories` Collection
```typescript
interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  itemCount: number;
  status: 'active' | 'archived';
  subcategories: string[];
}
```

### 5. `reviews`, `returns`, `support_tickets`, `transactions`
- Full schema support for verified reviews with ratings & images.
- Return request workflow tracking with refund approval logs.
- Support ticketing system with dispute priority.
- Financial transactions log for seller payout settlements.

---

## 6. Implementation Status vs. Future Roadmap (Phase 19 Hardening)

```
[=========== COMPLETED & PRODUCTION-HARDENED (v2.6) ===========]
  ✅ Multi-Role Auth & RBAC (Customer, Artisan Seller, Moderator, Admin, Super Admin)
  ✅ Mock Data Removal: Catalog, Coupons, and Order fetching strictly bound to Firestore
  ✅ 64 Districts Geo-Discovery & Artisan Specializations (Zero mock fallbacks)
  ✅ Strict Tokenized Professional Search Engine (Recent Searches, Autocomplete)
  ✅ Product Quick View, Side-by-Side Comparison Modal, Delivery Checker
  ✅ Multi-Vendor Cart Drawer, Shipping Fee Engine, Karma Points
  ✅ Payment Provider Registry: bKash (v1.2.0-ECOM), Nagad, Rocket, Upay (UCB MFS), SSLCommerz, Native COD
  ✅ Payout Engine: 8-Bucket Seller Balance Ledger, BEFTN/NPSB, bKash & Nagad corporate disbursement
  ✅ Logistics Provider Registry: Steadfast, Pathao, RedX, Paperfly, eCourier
  ✅ Transactional Notification Engine: Greenweb SMS (Masking/Non-masking, Sandbox & Live modes), Resend Email
  ✅ Order Lifecycle Tracker, Digital Tax Invoice, Printable Courier Parcel Labels
  ✅ Artisan Seller Portal (Inventory, Fulfillment, Financials, Direct Chat)
  ✅ Admin Control Panel (Verification Queue, CMS, Logistics Hub, Settlement Reports)
  ✅ Firebase Firestore Realtime DB Integration, Atomic Transactions & Strict Security Rules (firestore.rules & storage.rules)

[----------- READY FOR LIVE CREDENTIAL INJECTION (Zero Code Changes Needed) -----------]
  ⚙️ Live SMS Gateway: Configured for Greenweb / SSL Wireless (Activate via SMS_MODE=LIVE + SMS_PROVIDER_API_KEY)
  ⚙️ Direct Courier Webhook Sync: Steadfast, Pathao, RedX ready for API key and webhook secret injection
  ⚙️ Official Payment Aggregator: bKash & SSLCommerz merchant credentials ready in .env.example
  ⚙️ Upay MFS Integration: UpayPaymentProvider registered and sandbox/live ready
  ⚙️ Bank Electronic Fund Transfer (BEFTN/NPSB): Bank payout provider implemented for automated batch disbursement

[=========== PHASE 20 FINAL QA & SECURITY HARDENING COMPLETED (v2.7) ===========]
  ✅ Complete Production Audit across Customer, Seller, Admin, Courier, and Finance
  ✅ Customer E2E Flow: Browse -> Filter -> District -> Compare -> Cart -> Checkout -> Tracking -> Reviews
  ✅ Seller E2E Flow: Onboarding -> Products -> Multi-Tenant Isolation -> Orders -> Courier Booking -> Wallet -> Withdrawals
  ✅ Admin E2E Flow: Defense-in-depth Authorization -> Verification Queue -> CMS -> Settlements -> Audit Logs
  ✅ Firestore Rules Hardened: Row-locked transaction safety, non-negative wallet invariants, rules deployed
  ✅ Financial Ledger & Wallet Concurrency: Client mutex + Firestore runTransaction prevents double-payouts
  ✅ Payment Provider Registry: Status flags verified (LIVE/SANDBOX/DISABLED/CONFIG_REQUIRED), idempotency active
  ✅ Logistics Engine: Direct parcel generation, barcode/QR label formatting, Steadfast/Pathao/RedX integration
  ✅ Transactional Notifications: Greenweb SMS phone normalization (8801XXXXXXXXX) & Resend HTML templates
  ✅ Build & Performance QA: TypeScript tsc --noEmit and Vite production builds passing 100% green
```

---

## 7. SRS Compliance & Audit Checklist

- [x] **IEEE 830 / ISO/IEC/IEEE 29148 Standard Alignment**: Structured into Introduction, System Capabilities, User Roles, Functional & Non-Functional Specifications.
- [x] **Data Integrity**: Typed interfaces for zero runtime type collisions.
- [x] **Multi-Tenant Isolation**: Strict Firestore security rules and UI level filtering preventing cross-seller data leaks.
- [x] **Financial Concurrency Guarantee**: Row-locked Firestore transactions eliminate race conditions on seller balance withdrawals.
- [x] **Design Conformity**: Strict adherence to Bangladeshi cultural heritage, eco-color guidelines, and WCAG AA accessibility.
- [x] **Production Readiness**: Self-contained single-command build verification (`npm run build`).
