import React, { useState } from 'react';
import { ActiveTab, SellerPortalTab } from '../types';
import { LegalTrustModal, LegalPolicyType } from './LegalTrustModal';

interface FooterProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectDistrictByName?: (district: string) => void;
  onOpenPolicy?: (policy: LegalPolicyType) => void;
  onOpenTrackOrder?: () => void;
  onSelectSellerTab?: (tab: SellerPortalTab) => void;
}

export const Footer: React.FC<FooterProps> = ({
  setActiveTab,
  onSelectDistrictByName,
  onOpenPolicy,
  onOpenTrackOrder,
  onSelectSellerTab,
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localPolicyModal, setLocalPolicyModal] = useState<LegalPolicyType | null>(null);

  const handleOpenPolicyTab = (policy: LegalPolicyType) => {
    if (onOpenPolicy) {
      onOpenPolicy(policy);
    } else {
      setLocalPolicyModal(policy);
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setEmail('');
    }
  };

  return (
    <>
      <footer className="w-full mt-20 bg-[#f0eded] border-t border-[#c1c9be]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-6 md:px-8 py-16 max-w-[1280px] mx-auto">
          {/* Brand & Copyright */}
          <div className="flex flex-col gap-4 col-span-1 md:col-span-2">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2 text-left focus:outline-none w-fit"
            >
              <span className="text-2xl font-extrabold text-[#002c11] tracking-tight font-heading">
                SUNNO
              </span>
            </button>
            <p className="text-base text-[#414941] max-w-sm leading-relaxed">
              Empowering Sustainable Bangladesh through conscious commerce, eco-verified verification standards, and 64-district local heritage.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }
                }}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                  copied
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-[#c1c9be] text-[#414941] hover:text-[#002c11] hover:bg-[#f5f3f3]'
                }`}
                title={copied ? 'Link Copied!' : 'Share SUNNO'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copied ? 'check' : 'share'}
                </span>
              </button>
              <span className="text-xs text-[#717970]">
                {copied ? 'Link copied to clipboard!' : 'Eco-Verified Artisan Network of Bangladesh'}
              </span>
            </div>

            {/* Quick Trust Badges in Footer */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => handleOpenPolicyTab('eco_verification')}
                className="px-2.5 py-1 bg-white border border-[#c1c9be]/50 rounded-full text-[11px] font-bold text-[#002c11] flex items-center gap-1 hover:border-[#1b6d24]"
              >
                <span className="material-symbols-outlined text-[13px] text-[#1b6d24]">eco</span>
                Eco-Verified Standards
              </button>
              <button
                onClick={() => handleOpenPolicyTab('returns')}
                className="px-2.5 py-1 bg-white border border-[#c1c9be]/50 rounded-full text-[11px] font-bold text-[#002c11] flex items-center gap-1 hover:border-[#1b6d24]"
              >
                <span className="material-symbols-outlined text-[13px] text-[#1b6d24]">assignment_return</span>
                7-Day Easy Returns
              </button>
              <button
                onClick={() => handleOpenPolicyTab('shipping')}
                className="px-2.5 py-1 bg-white border border-[#c1c9be]/50 rounded-full text-[11px] font-bold text-[#002c11] flex items-center gap-1 hover:border-[#1b6d24]"
              >
                <span className="material-symbols-outlined text-[13px] text-[#1b6d24]">local_shipping</span>
                Free Shipping &gt; ৳2,500
              </button>
            </div>
          </div>

          {/* Links: Explore */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1 font-heading">
              Explore & Heritage
            </h4>
            <button
              onClick={() => handleOpenPolicyTab('about')}
              className="text-left text-sm text-[#414941] hover:text-[#002c11] transition-colors"
            >
              About SUNNO
            </button>
            <button
              onClick={() => handleOpenPolicyTab('eco_verification')}
              className="text-left text-sm text-[#414941] hover:text-[#002c11] transition-colors"
            >
              Sustainability Standards
            </button>
            <button
              onClick={() => {
                window.location.hash = '#products';
                setActiveTab('products');
              }}
              className="text-left text-sm text-[#414941] hover:text-[#002c11] transition-colors font-medium"
            >
              All Eco Products
            </button>
            <button
              onClick={() => {
                window.location.hash = '#districts';
                setActiveTab('districts');
                if (onSelectDistrictByName) onSelectDistrictByName('All');
              }}
              className="text-left text-sm text-[#414941] hover:text-[#002c11] transition-colors"
            >
              64 District Craft Catalog
            </button>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.location.hash = '#seller/onboarding';
                if (onSelectSellerTab) onSelectSellerTab('onboarding');
                setActiveTab('seller_portal');
              }}
              className="text-left text-sm text-[#1b6d24] font-semibold hover:underline transition-colors"
            >
              Seller Portal &amp; Onboarding
            </button>
            <button
              onClick={() => handleOpenPolicyTab('seller_policy')}
              className="text-left text-sm text-[#414941] hover:text-[#002c11] transition-colors"
            >
              Artisan Code of Conduct
            </button>
          </div>

          {/* Links: Legal Policies, Support & Newsletter */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1 font-heading">
              Trust &amp; Legal Policies
            </h4>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-[#414941]">
              <button
                onClick={() => handleOpenPolicyTab('terms')}
                className="text-left hover:text-[#002c11] transition-colors"
              >
                Terms &amp; Conditions
              </button>
              <button
                onClick={() => handleOpenPolicyTab('privacy')}
                className="text-left hover:text-[#002c11] transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => handleOpenPolicyTab('returns')}
                className="text-left hover:text-[#002c11] transition-colors"
              >
                Return Policy
              </button>
              <button
                onClick={() => handleOpenPolicyTab('refunds')}
                className="text-left hover:text-[#002c11] transition-colors"
              >
                Refund Policy
              </button>
              <button
                onClick={() => handleOpenPolicyTab('shipping')}
                className="text-left hover:text-[#002c11] transition-colors"
              >
                Shipping Policy
              </button>
              <button
                onClick={() => handleOpenPolicyTab('faq')}
                className="text-left hover:text-[#002c11] transition-colors"
              >
                FAQ Center
              </button>
              <button
                onClick={() => handleOpenPolicyTab('contact')}
                className="text-left hover:text-[#002c11] transition-colors col-span-2 text-[#1b6d24] font-medium"
              >
                Contact &amp; 24/7 Hotline
              </button>
              {onOpenTrackOrder && (
                <button
                  onClick={onOpenTrackOrder}
                  className="text-left text-[#1b6d24] font-bold hover:underline transition-colors flex items-center gap-1 col-span-2 pt-1 border-t border-[#c1c9be]/30"
                >
                  <span className="material-symbols-outlined text-xs">local_shipping</span>
                  Track Live Consignment
                </button>
              )}
            </div>

            {/* Newsletter Input */}
            <form onSubmit={handleSubscribe} className="mt-2">
              <p className="text-xs text-[#414941] mb-1.5 font-medium">
                Join the green movement:
              </p>
              <div className="flex">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="bg-[#ffffff] border border-[#c1c9be] rounded-l-lg px-3 py-2 text-xs w-full focus:outline-none focus:border-[#002c11]"
                />
                <button
                  type="submit"
                  className="bg-[#002c11] text-white px-3 py-2 rounded-r-lg hover:bg-[#0d4421] transition-colors shrink-0"
                  title="Subscribe"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
              {subscribed && (
                <p className="text-xs text-[#1b6d24] font-medium mt-1">
                  ✓ Thank you for supporting sustainable Bangladesh!
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="border-t border-[#c1c9be]/60 py-4 px-6 text-center text-xs text-[#717970] flex flex-col sm:flex-row items-center justify-between max-w-[1280px] mx-auto gap-2">
          <div>
            © 2026 SUNNO Marketplace. Empowering Sustainable Bangladesh. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => handleOpenPolicyTab('terms')} className="hover:underline">Terms</button>
            <span>•</span>
            <button onClick={() => handleOpenPolicyTab('privacy')} className="hover:underline">Privacy</button>
            <span>•</span>
            <button onClick={() => handleOpenPolicyTab('eco_verification')} className="hover:underline">Eco Standards</button>
          </div>
        </div>
      </footer>

      {/* Standalone Legal Trust Modal */}
      {localPolicyModal && (
        <LegalTrustModal
          isOpen={!!localPolicyModal}
          onClose={() => setLocalPolicyModal(null)}
          initialPolicy={localPolicyModal}
        />
      )}
    </>
  );
};
