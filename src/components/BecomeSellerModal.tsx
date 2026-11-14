import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BANGLADESH_DIVISIONS, ALL_64_DISTRICTS } from '../data/bangladeshDistricts';
import { registerSeller, fetchSellerPlans, fetchCategories } from '../services/dbService';
import { SellerProfile, SellerPlan, Category } from '../types';

interface BecomeSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BecomeSellerModal: React.FC<BecomeSellerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { userProfile, currentUser } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [plans, setPlans] = useState<SellerPlan[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan-basic');

  // Step 1: Personal & Contact
  const [fullName, setFullName] = useState(userProfile?.fullName || userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || userProfile?.phoneNumber || '017');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [businessAddress, setBusinessAddress] = useState('');

  // Step 2: Store Concept & Products
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Bamboo & Cane',
    'Jute & Natural Fiber',
  ]);
  const [ecoProductInfo, setEcoProductInfo] = useState('');

  // Step 3: Payment Settlement & Delivery Info
  const [payoutMethod, setPayoutMethod] = useState<'bank_transfer' | 'bkash' | 'nagad'>('bank_transfer');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupDivision, setPickupDivision] = useState('Dhaka');
  const [pickupDistrict, setPickupDistrict] = useState('Dhaka');
  const [preferredCourier, setPreferredCourier] = useState('Steadfast Courier');

  // Step 4: Business Information, Verification & Terms Agreement
  const [businessType, setBusinessType] = useState<'individual' | 'cooperative' | 'registered_business'>('cooperative');
  const [nidOrTradeLicense, setNidOrTradeLicense] = useState('');
  const [uploadedDocName, setUploadedDocName] = useState('artisan_cooperative_certificate.pdf');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSellerPlans().then((p) => {
        setPlans(p);
        if (p.length > 0) {
          const defaultPlan = p.find((item) => item.price === 0) || p[0];
          setSelectedPlanId(defaultPlan.id);
        }
      });
      fetchCategories().then((cats) => setCategoriesList(cats));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const availableDistricts = ALL_64_DISTRICTS.filter((d) => d.division === division);

  const toggleCategory = (catName: string) => {
    if (selectedCategories.includes(catName)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== catName));
      }
    } else {
      setSelectedCategories([...selectedCategories, catName]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Document file size must be less than 5MB.');
        return;
      }
      setErrorMessage('');
      setUploadedDocName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (step === 1) {
      if (!fullName.trim() || !storeName.trim() || !phone.trim() || !email.trim() || !businessAddress.trim()) {
        setErrorMessage('Please fill in all representative and contact details.');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!storeDescription.trim()) {
        setErrorMessage('Please provide a description of your workshop or craft tradition.');
        return;
      }
      if (selectedCategories.length === 0) {
        setErrorMessage('Please select at least one product category.');
        return;
      }
      if (!ecoProductInfo.trim()) {
        setErrorMessage('Please describe your eco and sustainability practices.');
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!accountNumber.trim()) {
        setErrorMessage('Please provide your payout account number or mobile financial service number.');
        return;
      }
      if (payoutMethod === 'bank_transfer' && !bankName.trim()) {
        setErrorMessage('Please enter your bank name for bank payouts.');
        return;
      }
      setStep(4);
      return;
    }

    // Step 4 final submission
    if (!nidOrTradeLicense.trim()) {
      setErrorMessage('Please enter your NID, Trade License, or Artisan Cooperative Registration number.');
      return;
    }

    if (!termsAgreed) {
      setErrorMessage('You must review and agree to the SUNNO Marketplace Seller & Eco Authenticity Terms.');
      return;
    }

    setIsSubmitting(true);
    try {
      const sellerId = `seller-${Date.now()}`;
      const selectedPlan = plans.find((p) => p.id === selectedPlanId);

      const newSeller: SellerProfile = {
        id: sellerId,
        userId: currentUser?.uid || userProfile?.id || `user-anon-${Date.now()}`,
        fullName,
        phone,
        email,
        storeName,
        shopName: storeName,
        storeDescription,
        division,
        district,
        businessAddress,
        categories: selectedCategories,
        ecoProductInfo,
        businessInfo: `Business Type: ${businessType.toUpperCase()} | NID/BIN: ${nidOrTradeLicense}`,
        nidOrTradeLicense,
        planId: selectedPlanId,
        commissionRate: selectedPlan?.commissionRate || 8,
        settlementInfo: {
          method: payoutMethod,
          bankName: payoutMethod === 'bank_transfer' ? bankName : undefined,
          branchName: payoutMethod === 'bank_transfer' ? branchName : undefined,
          routingNumber: payoutMethod === 'bank_transfer' ? routingNumber : undefined,
          accountHolderName: accountHolderName || fullName,
          accountNumber,
        },
        deliveryInfo: {
          pickupAddress: pickupAddress || businessAddress,
          pickupDivision: pickupDivision || division,
          pickupDistrict: pickupDistrict || district,
          preferredCourier,
        },
        termsAgreed: true,
        termsAgreedAt: new Date().toISOString(),
        documents: [
          {
            name: uploadedDocName || 'Artisan_Accreditation_Doc.pdf',
            url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600',
            type: 'application/pdf',
          },
        ],
        status: 'pending',
        rating: 5.0,
        createdAt: new Date().toISOString(),
      };

      await registerSeller(newSeller);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setIsSuccess(false);
        setStep(1);
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting seller application:', err);
      setErrorMessage(err.message || 'Failed to submit application. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="become-seller-modal" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#fbf9f8] border border-[#c1c9be] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col">
        <button
          id="btn-close-seller-modal"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f0eded] flex items-center justify-center text-[#414941] hover:bg-[#e0dede] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">verified</span>
            </div>
            <h3 className="text-2xl font-extrabold text-[#002c11] font-heading">
              Application Submitted to SUNNO!
            </h3>
            <p className="text-sm text-[#414941] max-w-md leading-relaxed">
              Your store <strong>"{storeName}"</strong> has been registered with status{' '}
              <span className="font-bold text-[#1b6d24]">PENDING REVIEW</span>. Our eco-audit committee
              will review your sustainability claims and activate your store.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[#e8f5e9] text-[#1b6d24] text-[11px] font-bold rounded-full border border-[#a0f399] uppercase tracking-wide">
                  Artisan Accreditation
                </span>
                <span className="text-xs text-[#717970] font-medium">Step {step} of 4</span>
              </div>
              <h3 className="text-2xl font-extrabold text-[#002c11] font-heading mt-2">
                Become a Verified SUNNO Artisan Seller
              </h3>
              <p className="text-xs text-[#717970] mt-1 leading-relaxed">
                Connect your heritage rural workshop or eco cooperative to thousands of conscious consumers across Bangladesh.
              </p>

              {/* Progress Steps */}
              <div className="flex items-center gap-2 mt-4">
                <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-[#1b6d24]' : 'bg-[#e0dede]'}`} />
                <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-[#1b6d24]' : 'bg-[#e0dede]'}`} />
                <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-[#1b6d24]' : 'bg-[#e0dede]'}`} />
                <div className={`h-1.5 flex-1 rounded-full ${step >= 4 ? 'bg-[#1b6d24]' : 'bg-[#e0dede]'}`} />
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* STEP 1: Personal & Workshop Location */}
              {step === 1 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#002c11]">Step 1: Representative & Workshop Location</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Artisan / Representative Name *</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Anisur Rahman"
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Business / Shop Name *</label>
                      <input
                        type="text"
                        required
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="e.g. Sonargaon Jamdani Heritage"
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Phone Number (Bangladesh) *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Contact Email *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="artisan@domain.com"
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Division *</label>
                      <select
                        value={division}
                        onChange={(e) => {
                          setDivision(e.target.value);
                          const matching = ALL_64_DISTRICTS.filter((d) => d.division === e.target.value);
                          if (matching.length > 0) setDistrict(matching[0].name);
                        }}
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2.5 outline-none focus:border-[#002c11]"
                      >
                        {BANGLADESH_DIVISIONS.map((div) => (
                          <option key={div.id} value={div.name}>
                            {div.name} Division ({div.bnName})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">District (64 Districts) *</label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2.5 outline-none focus:border-[#002c11]"
                      >
                        {availableDistricts.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name} District
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1">Workshop / Business Physical Address *</label>
                    <input
                      type="text"
                      required
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="Village / Union, Thana, District, Bangladesh"
                      className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Store Concept & Categories */}
              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#002c11]">Step 2: Business Description & Craft Categories</h4>

                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1">Business & Craft Description *</label>
                    <textarea
                      rows={3}
                      required
                      value={storeDescription}
                      onChange={(e) => setStoreDescription(e.target.value)}
                      placeholder="Describe your craft tradition, artisan cooperative size, production techniques, and heritage story..."
                      className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1.5">Product Categories *</label>
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 bg-[#f0eded]/50 rounded-xl border border-[#c1c9be]/40">
                      {(categoriesList.length > 0 ? categoriesList.map(c => c.name) : [
                        'Bamboo & Cane',
                        'Jute & Natural Fiber',
                        'Handloom & Heritage Textiles',
                        'Clay & Terracotta Pottery',
                        'Organic Pantry & Teas',
                        'Upcycled & Reclaimed Art',
                      ]).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg font-semibold text-xs border transition-all ${
                            selectedCategories.includes(cat)
                              ? 'bg-[#002c11] text-white border-[#002c11]'
                              : 'bg-white text-[#414941] border-[#c1c9be] hover:bg-[#f5f3f3]'
                          }`}
                        >
                          {selectedCategories.includes(cat) ? '✓ ' : '+ '}
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1">
                      Eco & Sustainability Practices (Raw Materials, Chemical-Free, Fair Wage) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={ecoProductInfo}
                      onChange={(e) => setEcoProductInfo(e.target.value)}
                      placeholder="Detail your zero-plastic packaging, natural plant dyes, biodegradable fibers, and artisan wage standards..."
                      className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Payment Settlement & Delivery Info */}
              {step === 3 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#002c11]">Step 3: Payout Settlement & Courier Delivery Information</h4>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0">account_balance_wallet</span>
                    <div>
                      <p className="font-bold">Artisan Settlement Guarantee</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Earnings are deposited directly to your verified bank or mobile wallet upon order delivery.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Payout Method *</label>
                      <select
                        value={payoutMethod}
                        onChange={(e: any) => setPayoutMethod(e.target.value)}
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2.5 outline-none focus:border-[#002c11]"
                      >
                        <option value="bank_transfer">Bank Transfer (Any Bangladesh Bank)</option>
                        <option value="bkash">bKash (Merchant / Personal)</option>
                        <option value="nagad">Nagad (Merchant / Personal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">
                        {payoutMethod === 'bank_transfer' ? 'Account Number *' : 'Mobile Wallet Number *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder={payoutMethod === 'bank_transfer' ? 'e.g. 205012345678' : '01XXXXXXXXX'}
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                      />
                    </div>
                  </div>

                  {payoutMethod === 'bank_transfer' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-[#1b1c1c] mb-1">Bank Name *</label>
                        <input
                          type="text"
                          required
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. Islami Bank / DBBL"
                          className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none focus:border-[#002c11]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1b1c1c] mb-1">Branch Name</label>
                        <input
                          type="text"
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          placeholder="e.g. Sonargaon Branch"
                          className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none focus:border-[#002c11]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1b1c1c] mb-1">Routing Number</label>
                        <input
                          type="text"
                          value={routingNumber}
                          onChange={(e) => setRoutingNumber(e.target.value)}
                          placeholder="e.g. 125260..."
                          className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2 outline-none focus:border-[#002c11]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#c1c9be]/30 pt-3">
                    <h5 className="font-bold text-[#002c11] mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                      Workshop Pickup & Courier Dispatch
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-[#1b1c1c] mb-1">Pickup Address *</label>
                        <input
                          type="text"
                          value={pickupAddress}
                          onChange={(e) => setPickupAddress(e.target.value)}
                          placeholder={businessAddress || 'Physical pickup location for couriers'}
                          className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1b1c1c] mb-1">Preferred Partner Courier</label>
                        <select
                          value={preferredCourier}
                          onChange={(e) => setPreferredCourier(e.target.value)}
                          className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2.5 outline-none focus:border-[#002c11]"
                        >
                          <option value="Steadfast Courier">Steadfast Courier (64 Districts)</option>
                          <option value="Pathao Courier">Pathao Courier</option>
                          <option value="Paperfly">Paperfly Nationwide</option>
                          <option value="RedX">RedX Logistics</option>
                          <option value="Sundarban Courier">Sundarban Courier Service</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Business Info, Documents, Plan & Terms */}
              {step === 4 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#002c11]">Step 4: Verification, Plan Tier & Terms Agreement</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">Artisan Entity Type *</label>
                      <select
                        value={businessType}
                        onChange={(e: any) => setBusinessType(e.target.value)}
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3 py-2.5 outline-none focus:border-[#002c11]"
                      >
                        <option value="cooperative">Artisan Rural Cooperative</option>
                        <option value="individual">Master Independent Artisan</option>
                        <option value="registered_business">Registered Heritage Enterprise / NGO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#1b1c1c] mb-1">NID / BIN / Trade License Number *</label>
                      <input
                        type="text"
                        required
                        value={nidOrTradeLicense}
                        onChange={(e) => setNidOrTradeLicense(e.target.value)}
                        placeholder="e.g. NID-1982736481 or TL-8921"
                        className="w-full bg-white border border-[#c1c9be] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#002c11]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1">Verification Document (NID / Trade / Artisan Cert) *</label>
                    <div className="p-3 bg-white border border-dashed border-[#c1c9be] rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#1b6d24] text-[22px]">description</span>
                        <div>
                          <p className="font-bold text-[#002c11] text-xs">{uploadedDocName}</p>
                          <p className="text-[10px] text-[#717970]">PDF, JPG, PNG up to 5MB</p>
                        </div>
                      </div>
                      <label className="px-3 py-1.5 bg-[#f0eded] hover:bg-[#e0dede] text-[#002c11] rounded-lg font-bold text-xs cursor-pointer">
                        Upload File
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Plan Tier Selection */}
                  <div>
                    <label className="block font-bold text-[#1b1c1c] mb-1.5">Select Seller Plan Tier</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(plans.length > 0 ? plans : [
                        { id: 'plan-basic', name: 'Artisan Starter', price: 0, commissionRate: 8, productLimit: 15 },
                        { id: 'plan-pro', name: 'Heritage Professional', price: 1500, commissionRate: 6, productLimit: 50 },
                        { id: 'plan-premium', name: 'Master Cooperative', price: 3500, commissionRate: 5, productLimit: 500 },
                      ]).map((p: any) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPlanId(p.id)}
                          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            selectedPlanId === p.id
                              ? 'border-[#1b6d24] bg-[#e8f5e9]/40'
                              : 'border-[#c1c9be]/50 bg-white hover:border-[#1b6d24]/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-[#002c11]">{p.name}</span>
                              {selectedPlanId === p.id && (
                                <span className="material-symbols-outlined text-[#1b6d24] text-[16px]">check_circle</span>
                              )}
                            </div>
                            <p className="text-base font-extrabold text-[#002c11]">
                              ৳{p.price} <span className="text-[10px] text-[#717970] font-normal">/ {p.duration || 'yr'}</span>
                            </p>
                          </div>
                          <div className="mt-2 text-[10px] text-[#414941] space-y-0.5 border-t border-[#c1c9be]/30 pt-1.5">
                            <p>• {p.productLimit} Products quota</p>
                            <p>• {p.commissionRate}% Commission</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TERMS AGREEMENT CHECKBOX */}
                  <div className="p-3 bg-white rounded-xl border border-[#c1c9be] text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="mt-0.5 rounded text-[#1b6d24] focus:ring-[#1b6d24] w-4 h-4"
                      />
                      <div className="text-[11px] text-[#414941] leading-relaxed">
                        <span className="font-bold text-[#002c11]">Terms & Conditions Agreement: </span>
                        I hereby agree to the SUNNO Marketplace Artisan Terms of Service, 100% Bangladeshi Heritage Eco-Authenticity Pledge, and Fair Wage Guidelines. I understand that my shop will be registered with initial status{' '}
                        <span className="font-bold text-[#1b6d24]">PENDING APPROVAL</span> by the SUNNO Artisan Committee before products can be sold publicly.
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex justify-between items-center border-t border-[#c1c9be]/40">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                    className="px-4 py-2 bg-[#f0eded] text-[#414941] rounded-full font-bold text-xs hover:bg-[#e0dede]"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-[#f0eded] text-[#414941] rounded-full font-bold text-xs hover:bg-[#e0dede]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#002c11] hover:bg-[#0d4421] text-white rounded-full font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      'Submitting...'
                    ) : step < 4 ? (
                      <>
                        <span>Continue</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Application</span>
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

