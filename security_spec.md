# SUNNO Marketplace — Phase 18 Financial Security Specification
## The Eight Pillars of Financial Security Architecture

This document formalizes the eight architectural pillars governing the financial, ledger, settlement, and payout systems for the SUNNO eco-friendly multi-vendor marketplace.

---

### Pillar 1: Server-Controlled Authorization & State Machine
- **Principle**: Neither the client application nor frontend state can ever directly modify wallet balances, create arbitrary credits, or transition payout requests into completed states.
- **Implementation**:
  - All status transitions (`REQUESTED` → `UNDER_REVIEW` → `APPROVED` → `PROCESSING` → `PAID` / `REJECTED` / `FAILED`) are enforced through validated server endpoints (`/api/finance/payout/disburse`) and atomic Firestore helper transactions.
  - Role-Based Access Control (RBAC) strictly prevents non-administrators from executing payouts, approving withdrawals, or modifying commission rates.

---

### Pillar 2: Atomic Concurrency & Row-Locking (`runTransaction`)
- **Principle**: Concurrent clicks, automated script spamming, or simultaneous API calls must never lead to double deductions, phantom withdrawals, or race condition exploits.
- **Implementation**:
  - `requestSellerWithdrawal` utilizes Firestore `runTransaction()` on `seller_wallets/{sellerId}` to atomically lock the wallet row.
  - The transaction re-reads the authoritative `availableBalance` inside the transaction boundary.
  - If `availableBalance < requestedAmount`, the transaction aborts with a zero-state rollback.
  - On approval, `availableBalance` is decremented and `processingBalance` is incremented within the same atomic transaction commit.

---

### Pillar 3: Zero Negative Balance Guarantee
- **Principle**: Seller wallets cannot be depleted into negative equity under standard withdrawal workflows.
- **Implementation**:
  - Strict mathematical condition `availableBalance >= amount && amount >= 500 BDT` enforced both by application transactions and declarative Firestore Security Rules (`availableBalance >= 0`).
  - Minimum payout threshold is rigidly locked to `500 BDT`.

---

### Pillar 4: Immutability of Double-Entry Financial Ledger
- **Principle**: Financial history is permanent, append-only, and auditable. Entries are never overwritten or deleted to alter financial history.
- **Implementation**:
  - Every financial movement writes a `financial_ledger` record with `direction: 'CREDIT' | 'DEBIT'`, `amount`, `balanceBefore`, `balanceAfter`, and timestamps.
  - Reversals (e.g. failed withdrawals, rejected payouts) do not mutate past debits; they generate an explicit offsetting `WITHDRAWAL_REVERSAL` ledger event with a verified audit link.

---

### Pillar 5: Idempotent Disbursement & Anti-Double Payout Engine
- **Principle**: Network retries, timeout reconnections, or dual clicks must never result in duplicate money transfers or duplicate database entries.
- **Implementation**:
  - Unique `idempotencyKey` assigned to each withdrawal request and payout transaction.
  - Before initiating any disbursement or balance deduction, existing records matching `(sellerId, idempotencyKey)` are verified. If already present, the existing record is returned safely without executing secondary transfers.

---

### Pillar 6: Multi-Factor Risk & Fraud Detection
- **Principle**: High-risk, anomalous, or suspicious withdrawal requests must be flagged and held for administrative review prior to disbursement.
- **Implementation**:
  - **Rapid Concurrent Request Flag**: Flags requests occurring within 5 minutes of a prior request.
  - **High Value Threshold Flag**: Any withdrawal exceeding ৳50,000 BDT is automatically designated with status `UNDER_REVIEW`.
  - **Account Mutation Alert**: Flags accounts whose payout destinations were updated immediately prior to a withdrawal request.

---

### Pillar 7: Environment-Aware Payout Abstraction (Mock/Sandbox/Live Guard)
- **Principle**: The platform must never claim live payout execution unless real provider credentials exist and have been verified with provider APIs. Real funds cannot be disbursed in sandbox mode.
- **Implementation**:
  - `IPayoutProvider` abstraction decouples business logic from mobile financial services (`bKash`, `Nagad`, `Rocket`, `Bank Transfer`).
  - Payout modes:
    - `DISABLED`: Missing credentials; disbursements are blocked.
    - `SANDBOX`: Test credentials active; transactions recorded with sandbox simulator references (`SANDBOX-BKASH-...`).
    - `LIVE`: Production credentials configured; authentic gateway API called.
    - `CONFIGURATION REQUIRED`: Mode detected when configuration is incomplete.

---

### Pillar 8: End-to-End Audit Trail & Role-Based Access Control (RBAC)
- **Principle**: Every financial action must have a definitive actor attribution (`actorId`, `actorRole`, `actorName`, `timestamp`, `ipOrSession`).
- **Implementation**:
  - Administrative status changes, manual credits/debits, and fee adjustments trigger audit events in `audit_logs`.
  - Real-time in-app notifications inform sellers of earnings holds, release events, withdrawal transitions, and adjustments.

---

### Pillar 9: Production Zero-Mock Enforcement & Data Store Isolation
- **Principle**: No production transaction, product listing, order lookup, or coupon calculation can rely on in-memory mock fallback datasets when the underlying database is operational.
- **Implementation**:
  - `productService.ts` and `checkoutService.ts` strictly query Firestore collections (`products`, `coupons`).
  - Empty collections trigger idempotent batch-seeding directly into Firestore rather than maintaining unpersisted volatile client states.
  - Queries return actual persisted state or propagate standard Firestore errors with safe UI retry states.

---

### Pillar 10: Transactional Notification & Provider Integrity
- **Principle**: Notifications (SMS/Email) must never be reported as delivered unless the designated provider confirms successful dispatch.
- **Implementation**:
  - Enforces `SMS_MODE` and `EMAIL_MODE` (`DISABLED` | `SANDBOX` | `LIVE`).
  - SMS delivery status (`delivered: boolean`) requires positive HTTP status and non-error provider response body from Greenweb/telecom aggregators.
  - Automatic standardization of Bangladeshi phone numbers to international E.164-compatible national format (`8801XXXXXXXXX`).
  - Order confirmation SMS events are locked to verified backend order confirmation hooks.

---

### Pillar 11: Multi-Tenant Tenant Isolation & In-Component Defensive Authorization
- **Principle**: Cross-tenant data leakage is strictly forbidden. A seller can only read, write, or view their own inventory, orders, shipments, and financial ledgers.
- **Implementation**:
  - `firestore.rules` enforces authorization at the database layer using `request.auth.uid == resource.data.sellerId`.
  - Frontend components (`SellerPortalView`, `SellerFinanceView`) enforce strict identity checks, preventing Seller B from ever listing or viewing products belonging to Seller A.
  - Administrative routes (`AdminPanelView`) enforce defense-in-depth authorization guards: unauthorized attempts are halted with HTTP 403 Forbidden screens even before querying underlying resources.

---

## Phase 27 Production Security Penetration Matrix ("Dirty Dozen" Tests)

| Attack ID | Attack Vector Description | Target Collection / Path | Malicious Payload Sample | Expected Result | Enforced Rule Gate | Status |
|---|---|---|---|---|---|---|
| **D1** | Admin Email Spoofing | `/users`, `/site_settings` | `auth.token.email = 'admin@sunno.eco'`, `email_verified = false` | `PERMISSION_DENIED` | `isSuperAdminEmail()` requires `email_verified == true` or `google.com` provider | **PASS** |
| **D2** | Privilege Escalation | `/users/{uid}` | `role: 'admin'`, `role: 'super_admin'` | `PERMISSION_DENIED` | `users/{userId}` create/update blocks non-admin role escalation | **PASS** |
| **D3** | Wallet Balance Self-Credit | `/users/{uid}` | `walletBalance: 50000`, `ecoPoints: 9999` | `PERMISSION_DENIED` | `walletBalance == 0`, `ecoPoints <= 50` on create | **PASS** |
| **D4** | Seller Self-Approval | `/seller_profiles/{uid}` | `status: 'approved'` on registration | `PERMISSION_DENIED` | Create rule requires `status in ['pending', 'under_review']` | **PASS** |
| **D5** | Seller Wallet Inflation | `/seller_wallets/{sellerId}` | `availableBalance: 500000` update | `PERMISSION_DENIED` | `request.resource.data.availableBalance <= resource.data.availableBalance` | **PASS** |
| **D6** | Order Price Tampering | `/orders/{orderId}` | `total: 10`, `subtotal: 10` on existing order | `PERMISSION_DENIED` | `request.resource.data.total == resource.data.total` | **PASS** |
| **D7** | Payment Status Falsification | `/orders/{orderId}` | `paymentStatus: 'paid'` from customer client | `PERMISSION_DENIED` | Customer cannot self-escalate `paymentStatus` to `paid` | **PASS** |
| **D8** | Delivery State Spoofing | `/orders/{orderId}` | `status: 'delivered'` from customer client | `PERMISSION_DENIED` | Customer cannot mark order as `delivered` | **PASS** |
| **D9** | Fake Payment Record Creation | `/payments/{paymentId}` | `status: 'SUCCESS'` on client create | `PERMISSION_DENIED` | Initial status must be `INITIATED` or `PENDING` | **PASS** |
| **D10** | Cross-Seller Catalog Mutation | `/products/{productId}` | Update Seller B's product with Seller A's token | `PERMISSION_DENIED` | `resource.data.sellerId == request.auth.uid` | **PASS** |
| **D11** | Customer PII Harvesting | `/addresses/{addressId}`, `/user_profiles/{uid}` | Query or read other customer's private address | `PERMISSION_DENIED` | `resource.data.userId == request.auth.uid` | **PASS** |
| **D12** | Storage CMS Asset Poisoning | `/cms/{allPaths=**}`, `/seller-documents/{userId}` | Upload or overwrite other user's KYC / CMS banner | `PERMISSION_DENIED` | `isStaffAdmin()` and `isOwner(userId)` checks in `storage.rules` | **PASS** |


