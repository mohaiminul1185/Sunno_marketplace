import React, { useState } from 'react';

export type LegalPolicyType = 
  | 'about' 
  | 'terms' 
  | 'privacy' 
  | 'returns' 
  | 'refunds' 
  | 'shipping' 
  | 'seller_policy' 
  | 'eco_verification' 
  | 'faq' 
  | 'contact';

interface LegalTrustModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPolicy?: LegalPolicyType;
}

export const LegalTrustModal: React.FC<LegalTrustModalProps> = ({
  isOpen,
  onClose,
  initialPolicy = 'about',
}) => {
  const [activePolicy, setActivePolicy] = useState<LegalPolicyType>(initialPolicy);

  // Sync state if initialPolicy changes
  React.useEffect(() => {
    if (initialPolicy) {
      setActivePolicy(initialPolicy);
    }
  }, [initialPolicy]);

  if (!isOpen) return null;

  const POLICIES: { id: LegalPolicyType; label: string; icon: string }[] = [
    { id: 'about', label: 'About SUNNO', icon: 'storefront' },
    { id: 'eco_verification', label: 'Eco-Verification Standards', icon: 'verified_user' },
    { id: 'terms', label: 'Terms & Conditions', icon: 'gavel' },
    { id: 'privacy', label: 'Privacy Policy', icon: 'lock' },
    { id: 'returns', label: '7-Day Return Policy', icon: 'assignment_return' },
    { id: 'refunds', label: 'Refund & Wallet Policy', icon: 'account_balance_wallet' },
    { id: 'shipping', label: 'Shipping & Eco-Packaging', icon: 'local_shipping' },
    { id: 'seller_policy', label: 'Artisan & Seller Code', icon: 'handshake' },
    { id: 'faq', label: 'Frequently Asked Questions', icon: 'help_outline' },
    { id: 'contact', label: 'Contact & Support', icon: 'support_agent' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-[#c1c9be]/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#c1c9be]/30 flex items-center justify-between bg-[#fbf9f8]">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#1b6d24] text-[26px]">shield</span>
            <div>
              <h2 className="font-bold text-lg text-[#002c11] font-heading">
                SUNNO Trust & Policy Center
              </h2>
              <p className="text-xs text-[#717970]">
                Official legal agreements, environmental verification rules, and customer protections
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f0eded] hover:bg-[#eae8e7] flex items-center justify-center text-[#414941] hover:text-[#002c11] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body (Sidebar + Content) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Policy Navigation Tabs */}
          <div className="w-full md:w-64 bg-[#f5f3f3] p-3 border-r border-[#c1c9be]/30 overflow-y-auto shrink-0 flex md:flex-col gap-1">
            {POLICIES.map((policy) => {
              const isSelected = activePolicy === policy.id;
              return (
                <button
                  key={policy.id}
                  onClick={() => setActivePolicy(policy.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all whitespace-nowrap md:whitespace-normal ${
                    isSelected
                      ? 'bg-[#002c11] text-white shadow-sm'
                      : 'text-[#414941] hover:bg-white hover:text-[#002c11]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isSelected ? 'text-[#a0f399]' : 'text-[#717970]'}`}>
                    {policy.icon}
                  </span>
                  <span>{policy.label}</span>
                </button>
              );
            })}
          </div>

          {/* Policy Content Area */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto text-sm text-[#414941] leading-relaxed space-y-4">
            {activePolicy === 'about' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#002c11] font-heading">
                  About SUNNO Marketplace
                </h3>
                <p>
                  <strong>SUNNO</strong> is Bangladesh’s first dedicated multi-vendor eco-friendly marketplace, created to connect conscious urban consumers with skilled village artisans, rural handloom weavers, organic cultivators, and sustainable producers across all 64 administrative districts of Bangladesh.
                </p>
                <div className="bg-[#f5f3f3] p-4 rounded-2xl border border-[#c1c9be]/30 space-y-2">
                  <h4 className="font-bold text-[#002c11] text-xs uppercase tracking-wider">Our Core Pillars:</h4>
                  <ul className="list-disc pl-5 text-xs space-y-1">
                    <li><strong>100% Eco-Verified Verification:</strong> Every item is inspected for biodegradability, organic certifications, recycled content, or non-toxic natural inputs.</li>
                    <li><strong>Fair-Trade Artisan Payouts:</strong> Transparent double-entry ledgers ensure craftsmen receive timely weekly bank/MFS payouts.</li>
                    <li><strong>Zero-Plastic Packaging:</strong> Shipments are packaged in banana-fiber boxes, jute twines, and recycled corrugated paper.</li>
                  </ul>
                </div>
              </div>
            )}

            {activePolicy === 'eco_verification' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#002c11] font-heading">
                  Eco-Verification Standards & Badge Criteria
                </h3>
                <p>
                  To earn the coveted <span className="bg-[#002c11] text-[#a0f399] px-2 py-0.5 rounded-full text-xs font-bold font-mono">ECO-VERIFIED</span> badge, seller listings must satisfy our strict 5-point standard:
                </p>
                <div className="space-y-3">
                  <div className="p-3.5 bg-[#f0eded] rounded-xl border border-[#c1c9be]/40">
                    <h5 className="font-bold text-[#002c11] text-xs">1. Raw Material Authenticity</h5>
                    <p className="text-xs text-[#414941] mt-0.5">
                      Must use organic fibers (Jute, Khadi, Cotton), wild harvested resources (Sundarbans Honey, Clay/Terracotta, Cane/Bamboo), or verified upcycled inputs. No toxic lead glazes or non-biodegradable synthetic fibers.
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#f0eded] rounded-xl border border-[#c1c9be]/40">
                    <h5 className="font-bold text-[#002c11] text-xs">2. Ethical Production</h5>
                    <p className="text-xs text-[#414941] mt-0.5">
                      Zero child labor, fair living wages for rural artisans, and humane workshop conditions across all 64 districts.
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#f0eded] rounded-xl border border-[#c1c9be]/40">
                    <h5 className="font-bold text-[#002c11] text-xs">3. Organic Food Testing</h5>
                    <p className="text-xs text-[#414941] mt-0.5">
                      Food products are subject to pesticide and formalin screenings in accordance with BSTI and Bangladesh Food Safety Authority (BFSA) guidelines.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activePolicy === 'terms' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#002c11] font-heading">
                  Terms & Conditions of Service
                </h3>
                <p className="text-xs">
                  Effective Date: August 31, 2026. By accessing or using the SUNNO Marketplace platform (sunno.eco), you agree to be bound by these Terms.
                </p>
                <h4 className="font-bold text-[#002c11] text-sm">1. Customer Accounts & Purchases</h4>
                <p className="text-xs">
                  All users must provide accurate identity and delivery details. Orders placed with Cash-on-Delivery (COD) must be received in good faith. Fraudulent cancellations or repeated delivery refusals may result in account restrictions.
                </p>
                <h4 className="font-bold text-[#002c11] text-sm">2. Multi-Vendor Order Fulfillment</h4>
                <p className="text-xs">
                  Because SUNNO connects independent artisans across Bangladesh, orders containing products from multiple sellers will be dispatched in separate eco-friendly parcels directly from the respective artisan workshops.
                </p>
              </div>
            )}

            {activePolicy === 'privacy' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#002c11] font-heading">
                  Privacy Policy & Data Security
                </h3>
                <p className="text-xs">
                  SUNNO values your personal information and adheres to strict data privacy principles:
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1.5">
                  <li><strong>Data Collection:</strong> We collect only necessary contact and shipping details to fulfill your artisan orders and facilitate courier deliveries.</li>
                  <li><strong>No Third-Party Ad Selling:</strong> We never sell, rent, or trade your phone numbers, addresses, or purchase history to third-party advertisers.</li>
                  <li><strong>Financial Security:</strong> Payment information processed through bKash, Nagad, Rocket, Upay, or SSLCommerz is encrypted with bank-grade TLS/SSL. We never store credit card numbers or MFS PINs.</li>
                </ul>
              </div>
            )}

            {activePolicy === 'returns' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#002c11] font-heading">
                  7-Day Artisan Return Policy
                </h3>
                <p className="text-xs">
                  We guarantee customer satisfaction. If an artisan item arrives damaged, defective, or significantly different from the listed description:
                </p>
                <div className="bg-[#e8f5e9] p-4 rounded-2xl border border-[#a0f399]/40 space-y-2 text-xs text-[#002c11]">
                  <p className="font-bold">✓ Easy Step-by-Step Return Process:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Go to your <strong>Customer Profile → Orders</strong> tab.</li>
                    <li>Click <strong>Request Return</strong> within 7 days of parcel delivery.</li>
                    <li>Upload clear photos showing the damaged or incorrect item.</li>
                    <li>Our courier partner will pick up the item at no cost to you.</li>
                  </ol>
                </div>
              </div>
            )}

            {activePolicy === 'refunds' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#002c11] font-heading">
                  Refund & Wallet Policy
                </h3>
                <p className="text-xs">
                  Approved returns and cancelled prepaid orders are refunded promptly:
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1.5">
                  <li><strong>bKash / Nagad / Rocket / Upay:</strong> 2 to 5 business days back to your original MFS account.</li>
                  <li><strong>Bank Debit / Credit Cards:</strong> 5 to 10 banking days depending on the card issuer.</li>
                  <li><strong>SUNNO Eco-Wallet:</strong> Instant credit with a 5% bonus eco-point reward for future sustainable purchases.</li>
                </ul>
              </div>
            )}

            {activePolicy === 'shipping' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#002c11] font-heading">
                  Shipping Rates & Eco-Packaging
                </h3>
                <p className="text-xs">
                  SUNNO delivers nationwide across all 64 districts in partnership with certified green courier fleets.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#f0eded] p-3 rounded-xl border border-[#c1c9be]/40">
                    <span className="font-bold block text-[#002c11]">Inside Dhaka Metropolitan</span>
                    <span className="text-sm font-extrabold text-[#1b6d24] mt-1 block">৳60 BDT</span>
                    <span className="text-[11px] text-[#717970]">Estimated 24–48 Hours</span>
                  </div>
                  <div className="bg-[#f0eded] p-3 rounded-xl border border-[#c1c9be]/40">
                    <span className="font-bold block text-[#002c11]">All Other 63 Districts</span>
                    <span className="text-sm font-extrabold text-[#1b6d24] mt-1 block">৳120 BDT</span>
                    <span className="text-[11px] text-[#717970]">Estimated 2–4 Business Days</span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-[#1b6d24]">
                  🎉 Orders of ৳2,500 BDT or more qualify for 100% Free Nationwide Delivery!
                </p>
              </div>
            )}

            {activePolicy === 'seller_policy' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#002c11] font-heading">
                  Artisan & Seller Code of Conduct
                </h3>
                <p className="text-xs">
                  Sellers on SUNNO are partners in building an ethical, sustainable Bangladesh:
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1.5">
                  <li><strong>Listing Accuracy:</strong> All product specs, dimensions, weights, and districts of origin must be genuine.</li>
                  <li><strong>Prompt Fulfillment:</strong> Orders must be prepared and packaged within 24 hours of notification.</li>
                  <li><strong>Platform Commission:</strong> Fixed transparent tiered rates (5%–12%) deducted automatically with double-entry ledger bookkeeping.</li>
                </ul>
              </div>
            )}

            {activePolicy === 'faq' && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-[#002c11] font-heading mb-2">
                  Frequently Asked Questions (FAQ)
                </h3>
                <details className="bg-[#f0eded] p-3 rounded-xl cursor-pointer">
                  <summary className="font-bold text-xs text-[#002c11]">How do I track my artisan shipment?</summary>
                  <p className="text-xs text-[#414941] mt-2">
                    Once your order is confirmed, you receive an SMS with the live courier tracking number (Steadfast, Pathao, RedX, or SUNNO Eco-Fleet). You can also view live real-time checkpoints under your Customer Profile → Orders tab.
                  </p>
                </details>
                <details className="bg-[#f0eded] p-3 rounded-xl cursor-pointer">
                  <summary className="font-bold text-xs text-[#002c11]">Are all products really made in Bangladesh?</summary>
                  <p className="text-xs text-[#414941] mt-2">
                    Yes, 100% of SUNNO products originate from artisans, weavers, potters, and organic growers located across the 64 districts of Bangladesh.
                  </p>
                </details>
                <details className="bg-[#f0eded] p-3 rounded-xl cursor-pointer">
                  <summary className="font-bold text-xs text-[#002c11]">What payment methods are supported?</summary>
                  <p className="text-xs text-[#414941] mt-2">
                    We accept bKash, Nagad, Rocket, Upay, Visa, MasterCard, UnionPay, American Express, and Cash on Delivery (COD).
                  </p>
                </details>
              </div>
            )}

            {activePolicy === 'contact' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#002c11] font-heading">
                  Contact & Artisan Support
                </h3>
                <div className="bg-[#f5f3f3] p-4 rounded-2xl border border-[#c1c9be]/30 space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#1b6d24]">mail</span>
                    <div>
                      <span className="font-bold text-[#002c11] block">Email Support:</span>
                      <span className="text-[#414941]">support@sunno.eco / contact@sunno.eco</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#1b6d24]">call</span>
                    <div>
                      <span className="font-bold text-[#002c11] block">Customer Hotline (24/7):</span>
                      <span className="text-[#414941]">+880 1712-345678 / +880 9612-SUNNO</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#1b6d24]">location_on</span>
                    <div>
                      <span className="font-bold text-[#002c11] block">Artisan Hub Office:</span>
                      <span className="text-[#414941]">Level 4, Eco Tower, Green Road, Dhanmondi, Dhaka 1205, Bangladesh</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-[#f0eded] border-t border-[#c1c9be]/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#002c11] text-white hover:bg-[#0d4421] text-xs font-bold rounded-full transition-colors"
          >
            Close Policy Center
          </button>
        </div>
      </div>
    </div>
  );
};
