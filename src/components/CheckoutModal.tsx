import React, { useState, useEffect, useMemo } from 'react';
import {
  CartItem,
  UserAddress,
  Order,
  SubOrder,
  CartValidationResult,
  Product,
  PaymentRecord,
  PaymentProviderConfig,
  Shipment,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { BANGLADESH_DIVISIONS, ALL_64_DISTRICTS } from '../data/bangladeshDistricts';
import { getUpazilasForDistrict } from '../data/bangladeshUpazilas';
import {
  validateCartBackend,
  createMultiVendorOrder,
  fetchCustomerAddressesFromDb,
  saveCustomerAddressInDb,
  fetchDeliverySettings,
} from '../services/checkoutService';
import {
  fetchPaymentProviders,
  initiatePaymentInDb,
  verifyPaymentServerSide,
  checkUserCodEligibility,
  retryOrderPayment,
} from '../services/paymentService';
import { calculateDeliveryAvailability } from '../services/customerDiscoveryService';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { TrackingModal } from './TrackingModal';
import { BRAND_LOGO } from '../data/mockData';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  allProducts: Product[];
  onOrderSuccess: (order: Order, subOrders: SubOrder[]) => void;
  onNavigateToOrders?: () => void;
}

type CheckoutStep =
  | 'review_cart'
  | 'address'
  | 'delivery_method'
  | 'payment'
  | 'order_summary'
  | 'gateway_verification'
  | 'confirmation';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  allProducts,
  onOrderSuccess,
  onNavigateToOrders,
}) => {
  const { currentUser, userProfile, setIsAuthModalOpen } = useAuth();

  // Multi-step State
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('review_cart');
  const [validationResult, setValidationResult] = useState<CartValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Payment Providers from DB
  const [providers, setProviders] = useState<PaymentProviderConfig[]>([]);
  const [activePaymentRecord, setActivePaymentRecord] = useState<PaymentRecord | null>(null);
  const [transactionIdInput, setTransactionIdInput] = useState('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentVerificationError, setPaymentVerificationError] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Address State
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<UserAddress>({
    id: '',
    fullName: userProfile?.fullName || '',
    phone: userProfile?.phone || '',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhanmondi',
    area: '',
    streetAddress: '',
    postalCode: '',
    additionalInstructions: '',
    label: 'Home',
    isDefault: true,
  });

  // Delivery Method & Courier State
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');
  const [selectedCourierId, setSelectedCourierId] = useState<'steadfast' | 'pathao' | 'redx'>('steadfast');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Live Courier Availability & Rates calculation
  const deliveryInfo = useMemo(() => {
    const currentTotal =
      validationResult?.subtotal ||
      cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    return calculateDeliveryAvailability(addressForm.district || 'Dhaka', currentTotal);
  }, [addressForm.district, validationResult?.subtotal, cart]);

  // Handler for courier partner selection
  const handleSelectCourier = (courierId: 'steadfast' | 'pathao' | 'redx') => {
    setSelectedCourierId(courierId);
    const method: 'standard' | 'express' = courierId === 'pathao' ? 'express' : 'standard';
    setDeliveryMethod(method);
    runValidation(appliedCouponCode, addressForm.district, method);
  };

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'cod' | 'bank_transfer'>('bkash');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('bkash');
  const [mobileNumberForMFS, setMobileNumberForMFS] = useState('');

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>('');
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Placed Order State
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placedSubOrders, setPlacedSubOrders] = useState<SubOrder[]>([]);
  const [activeTrackingShipment, setActiveTrackingShipment] = useState<Shipment | null>(null);

  // Live Consignment Tracking Handler (Req 20, 24, 25)
  const handleOpenLiveTracking = () => {
    if (!placedOrder) return;
    const firstSub = placedSubOrders[0];
    const shipmentObj: Shipment = {
      id: `SHIP-${(placedOrder.id || '').replace('SUNNO-ORD-', '')}`,
      orderId: placedOrder.id,
      orderNumber: placedOrder.orderNumber || placedOrder.id,
      subOrderId: firstSub?.id || placedOrder.id,
      sellerId: placedOrder.sellerIds[0] || firstSub?.sellerId || '',
      sellerName: firstSub?.sellerName || 'SUNNO Artisan Partner',
      customerId: placedOrder.customerId || currentUser?.uid || '',
      customerName: placedOrder.customerName,
      customerPhone: placedOrder.customerPhone,
      customerEmail: placedOrder.customerEmail,
      courierId: 'steadfast',
      courierName: placedOrder.courierName || 'Steadfast Courier',
      trackingNumber: placedOrder.trackingCode || `SUNNO-TRK-2026-${Date.now().toString().slice(-6)}`,
      status: 'READY_FOR_SHIPMENT',
      serviceType: placedOrder.deliveryMethod === 'express' ? 'express' : 'standard',
      codAmount: placedOrder.paymentMethod === 'cod' ? placedOrder.finalTotal : 0,
      collectedAmount: 0,
      collectionStatus: placedOrder.paymentMethod === 'cod' ? 'pending' : 'collected',
      pickupAddress: {
        fullName: firstSub?.sellerName || 'Artisan Workshop',
        phone: '01700000000',
        division: 'Dhaka',
        district: firstSub?.shippingAddress?.district || 'Dhaka',
        streetAddress: 'Artisan Workshop Center',
      },
      deliveryAddress: placedOrder.shippingAddress,
      packageInfo: {
        weight: 1,
        itemCount: placedOrder.items.length,
        numberOfItems: placedOrder.items.length,
        ecoPackagingType: 'JUTE_BAG',
        specialInstructions: placedOrder.items.map((i) => i.title).join(', '),
      },
      statusLogs: [
        {
          status: 'READY_FOR_SHIPMENT',
          title: 'Artisan Workshop Packaged with Eco Seal',
          description: 'Parcel sealed in 100% biodegradable jute/cotton wrap. Awaiting courier hub pickup.',
          location: placedOrder.shippingAddress.district || 'Dhaka Hub',
          timestamp: new Date().toISOString(),
          updatedBy: 'Artisan Dispatch Logistics',
        },
      ],
      deliveryFee: placedOrder.deliveryFee || 60,
      estimatedDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      createdAt: placedOrder.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActiveTrackingShipment(shipmentObj);
  };

  // Load Saved Addresses and Payment Providers on mount
  useEffect(() => {
    if (currentUser?.uid) {
      fetchCustomerAddressesFromDb(currentUser.uid).then((addrs) => {
        setSavedAddresses(addrs);
        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setAddressForm(defaultAddr);
          setIsAddingNewAddress(false);
        } else {
          setSelectedAddressId('new');
          setIsAddingNewAddress(true);
        }
      });
    }

    fetchPaymentProviders().then((provs) => {
      setProviders(provs);
      const firstEnabled = provs.find((p) => p.enabled);
      if (firstEnabled) {
        setSelectedProviderId(firstEnabled.id);
        const mappedMethod = firstEnabled.supportedMethods[0] || 'bkash';
        setPaymentMethod(mappedMethod as any);
      }
    });
  }, [currentUser]);

  // Run Backend Cart Validation
  const runValidation = async (codeToUse?: string, targetDistrict?: string, targetMethod?: 'standard' | 'express') => {
    if (!cart || cart.length === 0) return;
    setIsValidating(true);
    try {
      const activeDistrict = targetDistrict || addressForm.district || 'Dhaka';
      const activeMethod = targetMethod || deliveryMethod;
      const res = await validateCartBackend(
        cart.map((c) => ({ productId: c.product.id, quantity: c.quantity })),
        codeToUse !== undefined ? codeToUse : appliedCouponCode,
        activeDistrict,
        activeMethod
      );
      setValidationResult(res);
      if (res.appliedCoupon) {
        setCouponMessage({
          type: 'success',
          text: `Coupon "${res.appliedCoupon.code}" applied: ${
            res.appliedCoupon.discountType === 'percentage'
              ? `${res.appliedCoupon.discountValue}% OFF`
              : `৳${res.appliedCoupon.discountValue} OFF`
          }`,
        });
      }
    } catch {
      // Fallback
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runValidation();
    }
  }, [isOpen, cart]);

  if (!isOpen) return null;

  // Handler for applying coupon
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsValidating(true);
    setCouponMessage(null);
    try {
      const code = couponInput.trim().toUpperCase();
      const res = await validateCartBackend(
        cart.map((c) => ({ productId: c.product.id, quantity: c.quantity })),
        code,
        addressForm.district,
        deliveryMethod
      );
      setValidationResult(res);
      if (res.appliedCoupon) {
        setAppliedCouponCode(code);
        setCouponMessage({
          type: 'success',
          text: `Coupon "${code}" applied successfully! ৳${res.discountAmount} saved.`,
        });
      } else {
        const errorText = res.errors.find((err) => err.toLowerCase().includes('coupon')) || 'Invalid or expired coupon code.';
        setCouponMessage({ type: 'error', text: errorText });
      }
    } catch {
      setCouponMessage({ type: 'error', text: 'Error applying coupon. Please try again.' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode('');
    setCouponInput('');
    setCouponMessage(null);
    runValidation('', addressForm.district, deliveryMethod);
  };

  // Handler for Address Selection
  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    setAddressForm(addr);
    setIsAddingNewAddress(false);
    runValidation(appliedCouponCode, addr.district, deliveryMethod);
  };

  // Save new address handler
  const handleSaveAddressAndContinue = async () => {
    if (!addressForm.fullName || !addressForm.phone || !addressForm.streetAddress || !addressForm.district) {
      setOrderError('Please complete all required address fields.');
      return;
    }
    setOrderError(null);

    let finalAddr = addressForm;
    if (currentUser?.uid) {
      const saved = await saveCustomerAddressInDb({
        ...addressForm,
        userId: currentUser.uid,
      });
      finalAddr = saved;
      setSavedAddresses((prev) => {
        const idx = prev.findIndex((a) => a.id === saved.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = saved;
          return clone;
        }
        return [...prev, saved];
      });
      setSelectedAddressId(saved.id);
    }

    setAddressForm(finalAddr);
    setIsAddingNewAddress(false);
    runValidation(appliedCouponCode, finalAddr.district, deliveryMethod);
    setCurrentStep('delivery_method');
  };

  // Final Order Placement Handler
  const handleFinalPlaceOrder = async () => {
    const activeAuthUser = auth.currentUser;
    if (!activeAuthUser) {
      setIsAuthModalOpen(true);
      setOrderError('Please sign in or create an account with Google or Email to securely place your order and track delivery.');
      return;
    }

    setIsSubmitting(true);
    setOrderError(null);

    try {
      const activeAddress = addressForm;
      const orderTotal = validationResult?.finalTotal ?? cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

      // Check COD Risk & Limits if Cash on Delivery is selected
      if (paymentMethod === 'cod') {
        const codCheck = await checkUserCodEligibility(
          activeAuthUser.uid,
          activeAddress.phone || userProfile?.phone || userProfile?.phoneNumber || '',
          orderTotal,
          activeAddress.district || 'Dhaka'
        );

        if (!codCheck.eligible) {
          setOrderError(`COD Unavailable: ${codCheck.reason}`);
          setIsSubmitting(false);
          setCurrentStep('payment');
          return;
        }
      }

      // Determine active courier partner name
      const activeCourierName =
        selectedCourierId === 'pathao'
          ? 'Pathao Logistics Express'
          : selectedCourierId === 'redx'
          ? 'RedX Nationwide Delivery'
          : 'Steadfast Courier';

      // Create Order & Sub-Orders in Firestore
      const { parentOrder, subOrders } = await createMultiVendorOrder({
        customerId: activeAuthUser.uid,
        customerName: activeAddress.fullName || userProfile?.fullName || userProfile?.displayName || 'Conscious Buyer',
        customerPhone: activeAddress.phone || userProfile?.phoneNumber || userProfile?.phone || '',
        customerEmail: activeAuthUser.email || userProfile?.email || '',
        shippingAddress: activeAddress,
        deliveryMethod,
        courierName: activeCourierName,
        deliveryInstructions,
        paymentMethod,
        couponCode: appliedCouponCode,
        cartItems: cart,
      });

      setPlacedOrder(parentOrder);
      setPlacedSubOrders(subOrders);

      // Initiate Payment in DB
      const initResult = await initiatePaymentInDb({
        orderId: parentOrder.id,
        orderNumber: parentOrder.orderNumber,
        customerId: parentOrder.customerId || currentUser.uid,
        customerName: parentOrder.customerName,
        customerPhone: parentOrder.customerPhone,
        customerEmail: parentOrder.customerEmail,
        provider: selectedProviderId,
        paymentMethod,
        amount: parentOrder.finalTotal,
        subOrders,
        mfsAccountNumber: mobileNumberForMFS,
      });

      setActivePaymentRecord(initResult.payment);

      if (paymentMethod === 'cod') {
        // Cash on Delivery proceeds directly to confirmation
        setCurrentStep('confirmation');
        onOrderSuccess(parentOrder, subOrders);
      } else {
        // Digital payment proceeds to official verification step
        setCurrentStep('gateway_verification');
        setTransactionIdInput(
          initResult.isTestMode
            ? `${selectedProviderId.toUpperCase()}${Date.now().toString().slice(-6)}`
            : ''
        );
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      setOrderError(err.message || 'Failed to place order. Please check stock and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify Digital Payment Handler
  const handleVerifyDigitalPayment = async () => {
    if (!activePaymentRecord || !placedOrder) return;
    if (!transactionIdInput.trim()) {
      setPaymentVerificationError('Please enter the Transaction ID (TrxID) provided by your MFS/Bank.');
      return;
    }

    setIsVerifyingPayment(true);
    setPaymentVerificationError(null);

    try {
      const verifyRes = await verifyPaymentServerSide({
        paymentId: activePaymentRecord.id,
        orderId: placedOrder.id,
        transactionId: transactionIdInput.trim().toUpperCase(),
        provider: activePaymentRecord.provider,
        amount: activePaymentRecord.amount,
        currency: 'BDT',
      });

      if (verifyRes.success && verifyRes.payment) {
        setActivePaymentRecord(verifyRes.payment);
        if (verifyRes.order) {
          setPlacedOrder(verifyRes.order);
        }
        setCurrentStep('confirmation');
        onOrderSuccess(verifyRes.order || placedOrder, placedSubOrders);
      } else {
        setPaymentVerificationError('Payment verification could not be validated. Please check the TrxID.');
      }
    } catch (err: any) {
      setPaymentVerificationError(err.message || 'Payment verification failed.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Retry with different method
  const handleSwitchToDifferentPayment = async (newMethod: any, newProvider: string) => {
    if (!placedOrder) return;
    setIsVerifyingPayment(true);
    setPaymentVerificationError(null);
    try {
      const res = await retryOrderPayment(
        placedOrder.id,
        newMethod,
        newProvider,
        placedOrder.customerId || currentUser?.uid || ''
      );
      setPaymentMethod(newMethod);
      setSelectedProviderId(newProvider);
      setActivePaymentRecord(res.payment);
      if (newMethod === 'cod') {
        setCurrentStep('confirmation');
      } else {
        setTransactionIdInput('');
      }
    } catch (e: any) {
      setPaymentVerificationError(e.message || 'Failed to switch payment method.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Available districts for chosen division
  const currentDivisionObj = BANGLADESH_DIVISIONS.find((d) => d.name === addressForm.division);
  const filteredDistricts = ALL_64_DISTRICTS.filter(
    (d) => d.division.toLowerCase() === (addressForm.division || 'Dhaka').toLowerCase()
  );
  const availableUpazilas = getUpazilasForDistrict(addressForm.district || 'Dhaka');

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#c1c9be]/60">
          {/* Modal Header & Progress Stepper */}
          <div className="p-5 sm:p-6 border-b border-[#c1c9be]/50 bg-[#fbf9f8]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] flex items-center justify-center text-[#1b6d24]">
                  <span className="material-symbols-outlined text-2xl">eco</span>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#002c11] font-heading">
                    {currentStep === 'confirmation'
                      ? 'Order Confirmed!'
                      : currentStep === 'gateway_verification'
                      ? 'Verify Payment'
                      : 'SUNNO Eco-Checkout'}
                  </h2>
                  <p className="text-xs text-[#717970]">
                    100% Sustainable Artisanal Bangladesh Marketplace
                  </p>
                </div>
              </div>
              {currentStep !== 'confirmation' && currentStep !== 'gateway_verification' && (
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full hover:bg-[#e7e8e7] text-[#414941] flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              )}
            </div>

            {/* Stepper (Steps 1 to 5) */}
            {currentStep !== 'confirmation' && currentStep !== 'gateway_verification' && (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-[11px] font-bold">
                {[
                  { key: 'review_cart', label: '1. Cart', icon: 'shopping_cart' },
                  { key: 'address', label: '2. Address', icon: 'location_on' },
                  { key: 'delivery_method', label: '3. Delivery', icon: 'local_shipping' },
                  { key: 'payment', label: '4. Payment', icon: 'payments' },
                  { key: 'order_summary', label: '5. Review', icon: 'fact_check' },
                ].map((step, idx) => {
                  const stepOrder = ['review_cart', 'address', 'delivery_method', 'payment', 'order_summary'];
                  const currentIdx = stepOrder.indexOf(currentStep);
                  const thisIdx = idx;
                  const isDone = currentIdx > thisIdx;
                  const isActive = currentStep === step.key;

                  return (
                    <button
                      key={step.key}
                      disabled={thisIdx > currentIdx}
                      onClick={() => setCurrentStep(step.key as CheckoutStep)}
                      className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 transition-all ${
                        isActive
                          ? 'bg-[#002c11] text-white shadow-xs'
                          : isDone
                          ? 'bg-[#e8f5e9] text-[#1b6d24] hover:bg-[#c8e6c9]'
                          : 'bg-[#f0eded] text-[#717970] opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isDone ? 'check' : step.icon}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                      <span className="sm:hidden font-mono text-[10px]">{idx + 1}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {orderError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-700">
                <span className="material-symbols-outlined text-red-600 shrink-0">error</span>
                <span className="flex-1 font-medium">{orderError}</span>
                <button onClick={() => setOrderError(null)} className="text-red-500 hover:text-red-700">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}

            {/* STEP 1: CART REVIEW WITH MULTI-VENDOR GROUPING */}
            {currentStep === 'review_cart' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#002c11] uppercase tracking-wider">
                    Review Items by Artisan Cooperative
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-[#e8f5e9] text-[#1b6d24] rounded-full">
                    {cart.length} Item(s)
                  </span>
                </div>

                {validationResult?.itemsBySeller && Object.keys(validationResult.itemsBySeller).length > 0 ? (
                  Object.entries(validationResult.itemsBySeller).map(([sellerId, group]: [string, any]) => (
                    <div
                      key={sellerId}
                      className="border border-[#c1c9be]/60 rounded-2xl p-4 bg-[#fbf9f8] space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-[#c1c9be]/40 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#1b6d24] text-[18px]">
                            storefront
                          </span>
                          <h4 className="text-xs font-bold text-[#002c11]">
                            {group.sellerName}
                          </h4>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#002c11]">
                          Subtotal: ৳{group.subtotal}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {group.items.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-[#c1c9be]/40"
                          >
                            <img
                              src={item.product.images[0] || BRAND_LOGO}
                              alt={item.product.title}
                              className="w-12 h-12 rounded-lg object-cover shrink-0 border border-[#c1c9be]/30"
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-[#1b1c1c] truncate">
                                {item.product.title}
                              </h5>
                              <p className="text-[11px] text-[#717970]">
                                {item.product.district} • ৳{item.unitPrice} × {item.quantity}
                              </p>
                              {item.availableStock <= 5 && (
                                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                                  Only {item.availableStock} in stock
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-mono font-bold text-[#002c11]">
                                ৳{item.itemTotal}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-2.5">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-3 bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/60"
                      >
                        <img
                          src={item.product.images[0] || BRAND_LOGO}
                          alt={item.product.title}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#c1c9be]/40"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-[#002c11] truncate">{item.product.title}</h4>
                          <p className="text-[11px] text-[#717970]">
                            {item.product.sellerName} • ৳{item.product.price} × {item.quantity}
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#002c11]">
                          ৳{item.product.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: DELIVERY ADDRESS */}
            {currentStep === 'address' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#002c11] uppercase tracking-wider">
                    Select or Enter Shipping Address
                  </h3>
                  {savedAddresses.length > 0 && !isAddingNewAddress && (
                    <button
                      onClick={() => {
                        setIsAddingNewAddress(true);
                        setSelectedAddressId('new');
                        setAddressForm({
                          id: '',
                          fullName: userProfile?.fullName || '',
                          phone: userProfile?.phone || '',
                          division: 'Dhaka',
                          district: 'Dhaka',
                          upazila: 'Dhanmondi',
                          area: '',
                          streetAddress: '',
                          postalCode: '',
                          additionalInstructions: '',
                          label: 'Home',
                          isDefault: false,
                        });
                      }}
                      className="text-xs font-bold text-[#1b6d24] hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Add New Address
                    </button>
                  )}
                </div>

                {!isAddingNewAddress && savedAddresses.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectAddress(addr)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-[#1b6d24] bg-[#e8f5e9]/30'
                            : 'border-[#c1c9be]/50 bg-white hover:border-[#1b6d24]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-[#002c11] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-[#1b6d24]">
                              {addr.label === 'Work' ? 'work' : 'home'}
                            </span>
                            {addr.label || 'Home'}
                          </span>
                          {addr.isDefault && (
                            <span className="text-[10px] bg-[#1b6d24] text-white px-2 py-0.5 rounded-full font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-[#1b1c1c]">{addr.fullName}</p>
                        <p className="text-xs text-[#717970]">{addr.phone}</p>
                        <p className="text-xs text-[#414941] mt-1 leading-relaxed">
                          {addr.streetAddress}, {addr.area && `${addr.area}, `}
                          {addr.upazila}, {addr.district}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {(isAddingNewAddress || savedAddresses.length === 0) && (
                  <div className="bg-[#fbf9f8] p-4 sm:p-5 rounded-2xl border border-[#c1c9be]/60 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-[#002c11] mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={addressForm.fullName}
                          onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                          placeholder="Recipient's full name"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#c1c9be] rounded-xl text-xs focus:outline-none focus:border-[#1b6d24]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#002c11] mb-1">
                          Phone Number (Bangladesh 11-Digit) *
                        </label>
                        <input
                          type="tel"
                          required
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          placeholder="017XXXXXXXX"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#c1c9be] rounded-xl text-xs focus:outline-none focus:border-[#1b6d24]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-[#002c11] mb-1">
                          Division *
                        </label>
                        <select
                          value={addressForm.division}
                          onChange={(e) => {
                            const newDiv = e.target.value;
                            const firstDist = ALL_64_DISTRICTS.find(
                              (d) => d.division.toLowerCase() === newDiv.toLowerCase()
                            )?.name || 'Dhaka';
                            const firstUpazila = getUpazilasForDistrict(firstDist)[0] || 'Sadar';
                            setAddressForm({
                              ...addressForm,
                              division: newDiv,
                              district: firstDist,
                              upazila: firstUpazila,
                            });
                            runValidation(appliedCouponCode, firstDist, deliveryMethod);
                          }}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#c1c9be] rounded-xl text-xs focus:outline-none focus:border-[#1b6d24]"
                        >
                          {BANGLADESH_DIVISIONS.map((div) => (
                            <option key={div.id} value={div.name}>
                              {div.name} ({div.bnName})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#002c11] mb-1">
                          District *
                        </label>
                        <select
                          value={addressForm.district}
                          onChange={(e) => {
                            const newDist = e.target.value;
                            const upazilas = getUpazilasForDistrict(newDist);
                            setAddressForm({
                              ...addressForm,
                              district: newDist,
                              upazila: upazilas[0] || 'Sadar',
                            });
                            runValidation(appliedCouponCode, newDist, deliveryMethod);
                          }}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#c1c9be] rounded-xl text-xs focus:outline-none focus:border-[#1b6d24]"
                        >
                          {filteredDistricts.map((dist) => (
                            <option key={dist.id} value={dist.name}>
                              {dist.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#002c11] mb-1">
                          Thana / Upazila *
                        </label>
                        <select
                          value={addressForm.upazila}
                          onChange={(e) => setAddressForm({ ...addressForm, upazila: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#c1c9be] rounded-xl text-xs focus:outline-none focus:border-[#1b6d24]"
                        >
                          {availableUpazilas.map((up) => (
                            <option key={up} value={up}>
                              {up}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-[#002c11] mb-1">
                          Area / Neighborhood / Sector
                        </label>
                        <input
                          type="text"
                          value={addressForm.area}
                          onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                          placeholder="e.g. Sector 4, Road 7"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#c1c9be] rounded-xl text-xs focus:outline-none focus:border-[#1b6d24]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#002c11] mb-1">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={addressForm.postalCode || ''}
                          onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                          placeholder="e.g. 1209"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#c1c9be] rounded-xl text-xs focus:outline-none focus:border-[#1b6d24]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#002c11] mb-1">
                        Street Address / Holding *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={addressForm.streetAddress}
                        onChange={(e) => setAddressForm({ ...addressForm, streetAddress: e.target.value })}
                        placeholder="House / Flat / Road name"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#c1c9be] rounded-xl text-xs focus:outline-none focus:border-[#1b6d24]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: COURIER DELIVERY & RATES */}
            {currentStep === 'delivery_method' && (
              <div className="space-y-5">
                {/* Live Courier Delivery & Rates Selection Widget */}
                <div className="bg-[#fbf9f8] p-4 sm:p-5 rounded-3xl border border-[#c1c9be]/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#1b6d24] text-lg">local_shipping</span>
                      <span className="text-xs font-bold text-[#002c11] uppercase tracking-wider font-heading">
                        Courier Delivery & Rates
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#717970]">Deliver to:</span>
                      <select
                        value={addressForm.district || 'Dhaka'}
                        onChange={(e) => {
                          const newDistrict = e.target.value;
                          setAddressForm((prev) => ({ ...prev, district: newDistrict }));
                          runValidation(appliedCouponCode, newDistrict, deliveryMethod);
                        }}
                        className="px-2.5 py-1 bg-white border border-[#c1c9be] rounded-xl text-xs font-bold text-[#002c11] focus:ring-1 focus:ring-[#1b6d24]"
                      >
                        {ALL_64_DISTRICTS.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name} ({d.division})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {deliveryInfo.courierOptions.map((opt) => {
                      const isSelected = selectedCourierId === opt.courierId;
                      return (
                        <div
                          key={opt.courierId}
                          onClick={() => handleSelectCourier(opt.courierId as any)}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#1b6d24] bg-[#e8f5e9]/40 shadow-xs'
                              : 'border-[#c1c9be]/50 bg-white hover:border-[#1b6d24]/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-[#002c11]">{opt.name}</span>
                              {opt.recommended ? (
                                <span className="text-[9px] bg-[#dbf5dc] text-[#1b6d24] px-1.5 py-0.5 rounded-full font-bold">
                                  Best
                                </span>
                              ) : opt.courierId === 'pathao' ? (
                                <span className="text-[9px] bg-[#fef3c7] text-[#92400e] px-1.5 py-0.5 rounded-full font-bold">
                                  Express 24h
                                </span>
                              ) : (
                                <span className="text-[9px] bg-[#e0f2fe] text-[#0369a1] px-1.5 py-0.5 rounded-full font-bold">
                                  Nationwide
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#717970] flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined text-[12px] text-[#1b6d24]">schedule</span>
                              Est. {opt.estimatedDays} ({deliveryInfo.estimatedTimeline})
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#c1c9be]/30">
                            <span className="text-[10px] text-[#717970]">
                              {opt.courierId === 'pathao' ? 'Priority direct' : 'Consolidated eco'}
                            </span>
                            <span className="font-mono font-bold text-xs text-[#002c11]">
                              {deliveryInfo.isFreeDelivery && opt.courierId !== 'pathao'
                                ? 'FREE'
                                : opt.courierId === 'pathao'
                                ? (deliveryInfo.isFreeDelivery ? '৳50' : addressForm.district?.toLowerCase().includes('dhaka') ? '৳80' : '৳150')
                                : (addressForm.district?.toLowerCase().includes('dhaka') ? '৳60' : '৳120')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-[#717970] pt-1 gap-1">
                    <span className="flex items-center gap-1 text-[#1b6d24] font-medium">
                      <span className="material-symbols-outlined text-sm">eco</span>
                      100% Biodegradable Boxed Packaging
                    </span>
                    <span className="font-semibold text-[#002c11]">
                      {deliveryInfo.isFreeDelivery
                        ? '🎉 Free delivery unlocked'
                        : 'Free delivery on orders over ৳1,500'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002c11] mb-1">
                    Delivery Notes & Special Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="e.g. Leave with building security guard, call before delivery"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c1c9be] rounded-xl text-xs focus:outline-none focus:border-[#1b6d24]"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: PAYMENT METHOD (DYNAMIC FROM PROVIDERS & BANGLADESH MFS) */}
            {currentStep === 'payment' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#002c11] uppercase tracking-wider">
                    Select Payment Method
                  </h3>
                  <span className="text-[11px] text-[#717970] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-[#1b6d24]">lock</span>
                    256-Bit SSL Gateway
                  </span>
                </div>

                <div className="space-y-2.5">
                  {providers
                    .filter((p) => p.enabled)
                    .map((prov) => {
                      const methodKey = prov.supportedMethods[0] || 'bkash';
                      const isSelected = selectedProviderId === prov.id;

                      const getProviderIcon = (id: string) => {
                        if (id === 'bkash') return { icon: 'account_balance_wallet', color: 'text-[#e2136e]', badge: 'Most Popular' };
                        if (id === 'nagad') return { icon: 'payments', color: 'text-[#f7941d]', badge: 'Govt Postal' };
                        if (id === 'rocket') return { icon: 'send_to_mobile', color: 'text-[#8b2374]', badge: 'DBBL' };
                        if (id === 'sslcommerz') return { icon: 'credit_card', color: 'text-[#002c11]', badge: 'Cards & Banks' };
                        return { icon: 'local_atm', color: 'text-[#1b6d24]', badge: 'Inspect & Pay' };
                      };

                      const meta = getProviderIcon(prov.id);

                      return (
                        <label
                          key={prov.id}
                          className={`flex items-center gap-3.5 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#1b6d24] bg-[#e8f5e9]/20 shadow-xs'
                              : 'border-[#c1c9be]/50 bg-white hover:border-[#1b6d24]/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentProviderChoice"
                            value={prov.id}
                            checked={isSelected}
                            onChange={() => {
                              setSelectedProviderId(prov.id);
                              setPaymentMethod(methodKey as any);
                            }}
                            className="accent-[#1b6d24] shrink-0"
                          />
                          <div className="w-10 h-10 rounded-xl bg-[#fbf9f8] flex items-center justify-center border border-[#c1c9be]/40 shrink-0">
                            <span className={`material-symbols-outlined ${meta.color} text-xl`}>
                              {meta.icon}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#002c11]">{prov.name}</span>
                              {meta.badge && (
                                <span className="text-[9px] bg-[#e8f5e9] text-[#1b6d24] px-1.5 py-0.2 rounded-md font-bold">
                                  {meta.badge}
                                </span>
                              )}
                              {prov.testMode && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md font-bold uppercase">
                                  Sandbox
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#717970] truncate">
                              {prov.instructions || `Min: ৳${prov.minOrderAmount} • Max: ৳${prov.maxOrderAmount}`}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                </div>

                {(paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'rocket') && (
                  <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/60 space-y-2">
                    <label className="block text-xs font-bold text-[#002c11]">
                      Your {paymentMethod.toUpperCase()} Account Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={mobileNumberForMFS}
                      onChange={(e) => setMobileNumberForMFS(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#c1c9be] rounded-xl text-xs focus:outline-none focus:border-[#1b6d24]"
                    />
                    <p className="text-[11px] text-[#717970]">
                      Transaction ID will be requested and cryptographically verified on the next step.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: FINAL ORDER REVIEW */}
            {currentStep === 'order_summary' && (
              <div className="space-y-5">
                <h3 className="text-sm font-extrabold text-[#002c11] uppercase tracking-wider">
                  Final Order Review
                </h3>

                <div className="border border-[#c1c9be]/60 rounded-2xl p-4 bg-[#fbf9f8] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002c11] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#1b6d24]">hub</span>
                      Sub-Orders to be created ({validationResult ? Object.keys(validationResult.itemsBySeller).length : 1})
                    </span>
                    <span className="text-xs text-[#717970]">
                      {cart.reduce((a, b) => a + b.quantity, 0)} Items total
                    </span>
                  </div>

                  {validationResult?.itemsBySeller &&
                    Object.entries(validationResult.itemsBySeller).map(([sId, g]: [string, any], idx) => (
                      <div key={sId} className="bg-white p-3 rounded-xl border border-[#c1c9be]/40 text-xs">
                        <div className="flex justify-between font-bold text-[#002c11] mb-1">
                          <span>
                            Sub-Order #{idx + 1}: {g.sellerName}
                          </span>
                          <span className="font-mono">৳{g.subtotal}</span>
                        </div>
                        <div className="text-[11px] text-[#717970]">
                          {g.items.map((i) => `${i.product.title} (×${i.quantity})`).join(', ')}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50">
                    <span className="text-[11px] font-bold text-[#717970] uppercase">Deliver To</span>
                    <p className="font-bold text-[#002c11] mt-0.5">{addressForm.fullName}</p>
                    <p className="text-[#414941] text-[11px]">
                      {addressForm.streetAddress}, {addressForm.area && `${addressForm.area}, `}
                      {addressForm.upazila}, {addressForm.district}
                    </p>
                    <p className="text-[#717970] text-[11px]">{addressForm.phone}</p>
                  </div>

                  <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/50">
                    <span className="text-[11px] font-bold text-[#717970] uppercase">Payment & Courier</span>
                    <p className="font-bold text-[#002c11] mt-0.5 uppercase">{paymentMethod} ({selectedProviderId})</p>
                    <p className="text-[#414941] text-[11px] flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[13px] text-[#1b6d24]">local_shipping</span>
                      {selectedCourierId === 'pathao'
                        ? 'Pathao Logistics Express'
                        : selectedCourierId === 'redx'
                        ? 'RedX Nationwide Delivery'
                        : 'Steadfast Courier'}
                      {' '}• <span className="capitalize">{deliveryMethod}</span>
                    </p>
                  </div>
                </div>

                {/* Promo Coupon Form */}
                <div className="bg-[#fbf9f8] p-4 rounded-2xl border border-[#c1c9be]/60 space-y-2.5">
                  <label className="block text-xs font-bold text-[#002c11]">
                    Artisan Promo Coupon
                  </label>
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g. ECOFIRST)"
                      disabled={Boolean(appliedCouponCode)}
                      className="flex-1 px-3.5 py-2 bg-white border border-[#c1c9be] rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-[#1b6d24]"
                    />
                    {appliedCouponCode ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isValidating || !couponInput.trim()}
                        className="px-4 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
                      >
                        Apply
                      </button>
                    )}
                  </form>
                </div>

                {/* Price Calculation Summary */}
                <div className="bg-[#002c11] text-white p-4 sm:p-5 rounded-2xl space-y-2.5">
                  <div className="flex justify-between text-xs text-[#c1c9be]">
                    <span>Items Subtotal:</span>
                    <span className="font-mono text-white">
                      ৳{validationResult?.subtotal ?? cart.reduce((s, i) => s + i.product.price * i.quantity, 0)}
                    </span>
                  </div>

                  {Boolean(validationResult?.discountAmount) && (
                    <div className="flex justify-between text-xs text-[#4ade80]">
                      <span>Coupon Discount ({appliedCouponCode}):</span>
                      <span className="font-mono">-৳{validationResult?.discountAmount}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-[#c1c9be]">
                    <span>
                      Courier Delivery ({selectedCourierId === 'pathao' ? 'Pathao Express' : selectedCourierId === 'redx' ? 'RedX' : 'Steadfast'} - {addressForm.district || 'Dhaka'}):
                    </span>
                    <span className="font-mono text-white">
                      {validationResult?.deliveryFee === 0 ? 'FREE' : `৳${validationResult?.deliveryFee ?? 60}`}
                    </span>
                  </div>

                  <div className="border-t border-white/20 pt-2.5 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-[#c1c9be] block">Total Amount to Pay</span>
                      <span className="text-lg font-mono font-extrabold text-[#4ade80]">
                        ৳{validationResult?.finalTotal ?? cart.reduce((s, i) => s + i.product.price * i.quantity, 0)}
                      </span>
                    </div>
                    <div className="text-right text-[10px] text-[#c1c9be]">
                      Direct Artisan Fair Share • 0% Hidden Fees
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP: DIGITAL GATEWAY VERIFICATION DIALOG */}
            {currentStep === 'gateway_verification' && activePaymentRecord && (
              <div className="space-y-5">
                <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/60 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#c1c9be]/40 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#002c11] text-[#4ade80] flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-xl">payments</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#002c11] uppercase">
                          {activePaymentRecord.provider} Payment Gateway
                        </h4>
                        <span className="text-[11px] text-[#717970]">
                          Order #{placedOrder?.orderNumber || placedOrder?.id}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#717970] uppercase block">Amount Due</span>
                      <span className="font-mono font-extrabold text-[#1b6d24] text-base">
                        ৳{activePaymentRecord.amount} BDT
                      </span>
                    </div>
                  </div>

                  {activePaymentRecord.isTestPayment && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                      <span className="material-symbols-outlined text-base text-amber-600">info</span>
                      <span>
                        <strong>Sandbox Mode:</strong> Simulated gateway active. Enter simulated TrxID below or use generated test reference.
                      </span>
                    </div>
                  )}

                  {paymentVerificationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                      <span className="material-symbols-outlined text-base text-red-600">error</span>
                      <span>{paymentVerificationError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#002c11] mb-1">
                        Enter Transaction ID (TrxID) *
                      </label>
                      <input
                        type="text"
                        value={transactionIdInput}
                        onChange={(e) => setTransactionIdInput(e.target.value.toUpperCase())}
                        placeholder="e.g. 9K72LM89"
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-[#1b6d24] rounded-xl text-xs font-mono uppercase font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-[#717970] mt-1 block">
                        Received in SMS confirmation from {activePaymentRecord.provider.toUpperCase()}
                      </span>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                      <button
                        type="button"
                        onClick={handleVerifyDigitalPayment}
                        disabled={isVerifyingPayment || !transactionIdInput.trim()}
                        className="w-full sm:flex-1 py-3 bg-[#1b6d24] hover:bg-[#002c11] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isVerifyingPayment ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Verifying Cryptographically...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm">verified</span>
                            Confirm & Verify Payment
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchToDifferentPayment('cod', 'cod')}
                        disabled={isVerifyingPayment}
                        className="w-full sm:w-auto px-4 py-3 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#1b1c1c] text-xs font-bold rounded-xl transition-colors"
                      >
                        Switch to Cash on Delivery
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: ORDER CONFIRMATION & RECEIPT */}
            {currentStep === 'confirmation' && placedOrder && (
              <div className="py-4 space-y-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-[#e8f5e9] text-[#1b6d24] mx-auto flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-4xl">verified</span>
                </div>

                <div>
                  <h3 className="text-2xl font-extrabold text-[#002c11] font-heading">
                    Order Successfully Placed!
                  </h3>
                  <p className="text-xs text-[#717970] mt-1 max-w-md mx-auto">
                    Thank you for empowering Bangladesh rural craft masters. Your order and payment state have been recorded.
                  </p>
                </div>

                {/* Order Receipt Box */}
                <div className="bg-[#fbf9f8] border border-[#c1c9be]/70 rounded-2xl p-5 text-left space-y-4 max-w-xl mx-auto">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c1c9be]/40 pb-3">
                    <div>
                      <span className="text-[11px] text-[#717970] block">Order Number</span>
                      <span className="text-sm font-mono font-extrabold text-[#002c11]">
                        {placedOrder.orderNumber || placedOrder.id}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-[#717970] block">Payment Status</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                          placedOrder.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {placedOrder.paymentStatus} ({placedOrder.paymentMethod})
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-[#717970] flex items-center justify-between border-b border-[#c1c9be]/40 pb-3">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#1b6d24]">local_shipping</span>
                      Courier: <strong className="text-[#002c11]">{placedOrder.courierName || 'Steadfast Courier'}</strong>
                    </span>
                    <span>
                      Tracking: <code className="font-mono text-[#002c11] font-bold">{placedOrder.trackingCode || placedOrder.id}</code>
                    </span>
                  </div>

                  {/* Sub-Orders Breakdown */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#002c11] block">
                      Artisan Sub-Orders ({placedSubOrders.length})
                    </span>
                    {placedSubOrders.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-white p-3 rounded-xl border border-[#c1c9be]/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#002c11]">{sub.sellerName}</span>
                          <p className="text-[11px] text-[#717970]">
                            Sub-Order ID: <code className="font-mono">{sub.id}</code>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#002c11]">৳{sub.total}</span>
                          <span className="block text-[10px] text-[#1b6d24] font-bold uppercase">
                            {sub.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleOpenLiveTracking}
                    className="px-5 py-2.5 bg-white border border-[#002c11] text-[#002c11] hover:bg-[#f4fbf4] text-xs font-bold rounded-2xl transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                    Track Live Consignment
                  </button>

                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="px-5 py-2.5 bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#1b6d24] text-xs font-bold rounded-2xl transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">receipt</span>
                    View Official Receipt
                  </button>

                  {onNavigateToOrders && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToOrders();
                      }}
                      className="px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">receipt_long</span>
                      View in My Orders
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#1b1c1c] text-xs font-bold rounded-2xl transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          {currentStep !== 'confirmation' && currentStep !== 'gateway_verification' && (
            <div className="p-4 sm:p-5 border-t border-[#c1c9be]/50 bg-[#fbf9f8] flex items-center justify-between">
              {currentStep !== 'review_cart' ? (
                <button
                  type="button"
                  onClick={() => {
                    const stepOrder: CheckoutStep[] = ['review_cart', 'address', 'delivery_method', 'payment', 'order_summary'];
                    const prevIdx = stepOrder.indexOf(currentStep) - 1;
                    if (prevIdx >= 0) setCurrentStep(stepOrder[prevIdx]);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-[#414941] hover:bg-[#e7e8e7] rounded-xl transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-[#717970] hover:bg-[#e7e8e7] rounded-xl transition-colors"
                >
                  Close
                </button>
              )}

              <div className="flex items-center gap-3">
                {currentStep === 'review_cart' && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep('address')}
                    disabled={!cart || cart.length === 0}
                    className="px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    Continue to Address
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                )}

                {currentStep === 'address' && (
                  <button
                    type="button"
                    onClick={handleSaveAddressAndContinue}
                    className="px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    Continue to Delivery
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                )}

                {currentStep === 'delivery_method' && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep('payment')}
                    className="px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    Continue to Payment
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                )}

                {currentStep === 'payment' && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep('order_summary')}
                    className="px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    Review Order Summary
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                )}

                {currentStep === 'order_summary' && (
                  <button
                    type="button"
                    onClick={handleFinalPlaceOrder}
                    disabled={isSubmitting || isValidating}
                    className="px-8 py-3 bg-[#1b6d24] hover:bg-[#002c11] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Securing Order in Database...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        Confirm & Place Eco-Order (৳{validationResult?.finalTotal})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Official Printable Receipt Modal */}
      {showReceiptModal && (
        <PaymentReceiptModal
          payment={activePaymentRecord}
          order={placedOrder}
          subOrders={placedSubOrders}
          onClose={() => setShowReceiptModal(false)}
          onTrackOrder={() => {
            setShowReceiptModal(false);
            handleOpenLiveTracking();
          }}
        />
      )}

      {/* Live Consignment Tracking Modal */}
      {activeTrackingShipment && (
        <TrackingModal
          shipment={activeTrackingShipment}
          onClose={() => setActiveTrackingShipment(null)}
          onViewInvoice={() => {
            setActiveTrackingShipment(null);
            setShowReceiptModal(true);
          }}
        />
      )}
    </>
  );
};
