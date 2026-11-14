import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Order,
  Product,
  ActiveTab,
  CustomerProfileTab,
  Message,
  UserAddress,
  SubOrder,
  Shipment,
  Invoice,
  ShipmentStatus,
  ReturnRequest,
  ProductReview,
  Conversation,
  SupportTicket,
  Notification,
  UserRole,
} from '../types';
import { fetchUserOrders, subscribeUserOrders } from '../services/dbService';
import {
  fetchCustomerAddressesFromDb,
  saveCustomerAddressInDb,
  deleteCustomerAddressFromDb,
  fetchSubOrdersForParent,
} from '../services/checkoutService';
import {
  fetchShipmentByTrackingNumber,
  fetchShipmentsBySubOrder,
  getOfficialInvoiceForOrder,
} from '../services/courierService';
import {
  fetchCustomerReturns,
  subscribeCustomerReturns,
} from '../services/returnService';
import {
  fetchCustomerReviews,
} from '../services/reviewService';
import {
  subscribeUserConversations,
  fetchUserTickets,
  replyToSupportTicket,
} from '../services/messagingService';
import {
  subscribeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';
import { TrackingModal } from './TrackingModal';
import {
  checkOrderCancellationEligibility,
  executeOrderCancellation,
  CANCELLATION_REASONS_CUSTOMER,
} from '../services/orderCancellationService';
import { InvoiceModal } from './InvoiceModal';
import { ReturnRequestModal } from './ReturnRequestModal';
import { ReturnDetailsModal } from './ReturnDetailsModal';
import { ProductReviewModal } from './ProductReviewModal';
import { DirectChatModal } from './DirectChatModal';
import { SupportTicketModal } from './SupportTicketModal';
import { Order360Modal } from './Order360Modal';
import { BANGLADESH_DIVISIONS, ALL_64_DISTRICTS } from '../data/bangladeshDistricts';
import { getUpazilasForDistrict } from '../data/bangladeshUpazilas';
import { sendUserEmailVerification } from '../services/authService';
import {
  Truck,
  FileText,
  RotateCcw,
  Star,
  MessageSquare,
  LifeBuoy,
  Bell,
  CheckCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Package,
  Send,
  Plus,
  Filter,
  CheckCheck,
  Search,
  Copy,
  Check,
  Sparkles,
  Camera,
  MapPin,
  Mail,
  Phone,
  Calendar,
  User,
  Shield,
  Key,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

const AVATAR_PRESETS = [
  { id: 'av1', label: 'Artisan Weaver', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
  { id: 'av2', label: 'Eco Patron', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
  { id: 'av3', label: 'Conscious Buyer', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
  { id: 'av4', label: 'Heritage Collector', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
  { id: 'av5', label: 'Green Living', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80' },
  { id: 'av6', label: 'Eco Explorer', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80' },
];

interface CustomerProfileViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectProduct: (product: Product) => void;
  products: Product[];
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  initialSubTab?: CustomerProfileTab;
}

export const CustomerProfileView: React.FC<CustomerProfileViewProps> = ({
  setActiveTab,
  onSelectProduct,
  products,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  initialSubTab = 'overview',
}) => {
  const {
    currentUser,
    userProfile,
    role,
    updateProfileData,
    resetPassword,
    logout,
    setIsChangePasswordOpen,
    setIsAuthModalOpen,
  } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<CustomerProfileTab>(initialSubTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Return Requests state
  const [customerReturns, setCustomerReturns] = useState<ReturnRequest[]>([]);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<{ order: Order; productId?: string } | null>(null);
  const [selectedReturnDetails, setSelectedReturnDetails] = useState<ReturnRequest | null>(null);
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>('ALL');

  // Reviews state
  const [customerReviews, setCustomerReviews] = useState<ProductReview[]>([]);
  const [selectedProductForReview, setSelectedProductForReview] = useState<{ product: any; order: Order; existingReview?: ProductReview | null } | null>(null);

  // Messaging & Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [directChatTarget, setDirectChatTarget] = useState<{
    sellerId: string;
    sellerName: string;
    storeName?: string;
    productId?: string;
    productTitle?: string;
    productImage?: string;
    orderId?: string;
    orderNumber?: string;
  } | null>(null);

  // Support Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportModalOrder, setSupportModalOrder] = useState<Order | null>(null);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<SupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('ALL');

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifTypeFilter, setNotifTypeFilter] = useState<'ALL' | 'ORDER' | 'RETURN' | 'REFUND' | 'CHAT' | 'SUPPORT'>('ALL');

  // Address state
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<UserAddress>({
    id: '',
    fullName: userProfile?.displayName || '',
    phone: userProfile?.phoneNumber || '01712345678',
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

  // Selected Order for Details & Timeline Modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [activeOrderSubOrders, setActiveOrderSubOrders] = useState<SubOrder[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Tracking & Invoice Modals
  const [activeTrackingShipment, setActiveTrackingShipment] = useState<Shipment | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  // Profile Settings state
  const [editDisplayName, setEditDisplayName] = useState(userProfile?.displayName || userProfile?.fullName || '');
  const [editPhone, setEditPhone] = useState(userProfile?.phoneNumber || userProfile?.phone || '');
  const [editDivision, setEditDivision] = useState(userProfile?.division || 'Dhaka');
  const [editDistrict, setEditDistrict] = useState(userProfile?.district || 'Dhaka');
  const [editUpazila, setEditUpazila] = useState(userProfile?.upazila || 'Dhanmondi');
  const [editStreetAddress, setEditStreetAddress] = useState(userProfile?.streetAddress || '');
  const [editPostalCode, setEditPostalCode] = useState(userProfile?.postalCode || '');
  const [savedSettingsMsg, setSavedSettingsMsg] = useState<string | null>(null);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Account Deletion Request State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Email verification state
  const [isSendingEmailVerification, setIsSendingEmailVerification] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  // Cancellation state
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(CANCELLATION_REASONS_CUSTOMER[0]);
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleConfirmCancel = async () => {
    if (!orderToCancel || !cancelConfirm) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await executeOrderCancellation({
        orderId: orderToCancel.id,
        reason: cancelReason,
        customerNotes: cancelNotes,
        cancelledBy: userProfile?.displayName || userProfile?.fullName || currentUser?.displayName || userProfile?.email || 'Customer',
        cancelledById: currentUser?.uid || userProfile?.id || orderToCancel.customerId || orderToCancel.userId,
        cancelledByRole: 'customer',
        restockInventory: true,
      });
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderToCancel.id ? { ...o, status: 'cancelled', orderStatus: 'cancelled' } : o
          )
        );
        setOrderToCancel(null);
        setCancelNotes('');
        setCancelConfirm(false);
        setSavedSettingsMsg(res.message);
        setTimeout(() => setSavedSettingsMsg(null), 4000);
      } else {
        setCancelError(res.message);
      }
    } catch (err: any) {
      setCancelError(err?.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Construct active authenticated actor
  const actor = {
    id: currentUser?.uid || userProfile?.id || '',
    name: userProfile?.fullName || userProfile?.displayName || currentUser?.displayName || 'Conscious Buyer',
    email: userProfile?.email || currentUser?.email || '',
    phone: userProfile?.phoneNumber || userProfile?.phone || '',
    role: (userProfile?.role || role || 'customer') as UserRole,
  };

  const handleBuyAgainOrder = (items: any[]) => {
    let count = 0;
    (items || []).forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        onAddToCart(prod);
        count += 1;
      } else {
        onAddToCart({
          id: item.productId || `prod-${Date.now()}`,
          title: item.title,
          price: item.price,
          images: [item.image],
          category: item.categorySnapshot || 'Handmade Crafts',
          sellerId: item.sellerId || 'artisan',
          sellerName: item.sellerName || 'SUNNO Artisan Partner',
          division: 'Dhaka',
          district: item.district || 'Dhaka',
          status: 'eco_verified',
          ecoTypes: [],
          sellerVerified: true,
          rating: 5,
          reviewsCount: 1,
          description: '',
          sku: item.sku || '',
          originInfo: '',
          materialsInfo: '',
          endOfLifeInfo: '',
          manufacturingProcess: '',
          materialComposition: '',
          claims: [],
          certifications: [],
        } as Product);
        count += 1;
      }
    });
    setSavedSettingsMsg(`Added ${count} items back to your cart!`);
    setTimeout(() => setSavedSettingsMsg(null), 3000);
  };

  useEffect(() => {
    if (userProfile || currentUser) {
      const uid = currentUser?.uid || userProfile?.id;
      if (!uid) return;

      setIsLoadingOrders(true);
      loadAddresses();
      loadReviews(uid);
      loadTickets(uid);
      setEditDisplayName(userProfile?.displayName || userProfile?.fullName || '');
      setEditPhone(userProfile?.phoneNumber || userProfile?.phone || '');
      if (userProfile?.division) setEditDivision(userProfile.division);
      if (userProfile?.district) setEditDistrict(userProfile.district);
      if (userProfile?.upazila) setEditUpazila(userProfile.upazila);
      if (userProfile?.streetAddress) setEditStreetAddress(userProfile.streetAddress);
      if (userProfile?.postalCode) setEditPostalCode(userProfile.postalCode);

      // Subscribe to real-time orders (handles immediate first load and real-time updates)
      const unsubOrders = subscribeUserOrders(uid, (orderList) => {
        setOrders(orderList);
        setIsLoadingOrders(false);
      });

      // Subscribe to real-time returns
      const unsubReturns = subscribeCustomerReturns(uid, (retList) => {
        setCustomerReturns(retList);
      });

      // Subscribe to real-time conversations
      const unsubConversations = subscribeUserConversations(uid, (convList) => {
        setConversations(convList);
      });

      // Subscribe to real-time notifications
      const unsubNotifs = subscribeUserNotifications(uid, (notifList, unread) => {
        setNotifications(notifList);
        setUnreadNotifCount(unread);
      });

      return () => {
        unsubOrders();
        unsubReturns();
        unsubConversations();
        unsubNotifs();
      };
    }
  }, [userProfile, currentUser]);

  const loadOrders = async () => {
    const uid = currentUser?.uid || userProfile?.id;
    if (!uid) return;
    setIsLoadingOrders(true);
    try {
      const list = await fetchUserOrders(uid);
      setOrders(list);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadAddresses = async () => {
    const uid = currentUser?.uid || userProfile?.id;
    if (!uid) return;
    try {
      const addrs = await fetchCustomerAddressesFromDb(uid);
      setSavedAddresses(addrs);
    } catch (err) {
      console.warn('Error loading addresses:', err);
    }
  };

  const loadReviews = async (uid: string) => {
    try {
      const revs = await fetchCustomerReviews(uid);
      setCustomerReviews(revs);
    } catch (err) {
      console.warn('Error loading reviews:', err);
    }
  };

  const loadTickets = async (uid: string) => {
    try {
      const tkts = await fetchUserTickets(uid);
      setTickets(tkts);
    } catch (err) {
      console.warn('Error loading support tickets:', err);
    }
  };

  const handleOpenTrackingForOrder = async (ord: Order) => {
    setIsTrackingLoading(true);
    try {
      if (ord.trackingCode || ord.courierTracking) {
        const trk = ord.trackingCode || ord.courierTracking;
        const found = await fetchShipmentByTrackingNumber(trk || '');
        if (found) {
          setActiveTrackingShipment(found);
          return;
        }
      }

      if (ord.subOrders && ord.subOrders.length > 0) {
        const subShipments = await fetchShipmentsBySubOrder(ord.subOrders[0].id);
        if (subShipments && subShipments.length > 0) {
          setActiveTrackingShipment(subShipments[0]);
          return;
        }
      }

      const fallbackShipment: Shipment = {
        id: `ship-${ord.id}`,
        orderId: ord.id,
        orderNumber: ord.orderNumber || ord.id,
        subOrderId: ord.subOrders?.[0]?.id || `sub-${ord.id}-1`,
        sellerId: ord.sellerIds?.[0] || 'artisan-coop',
        sellerName: ord.subOrders?.[0]?.sellerName || 'Verified Artisan Guild',
        customerId: ord.customerId || ord.userId || 'customer',
        customerName: ord.customerName,
        customerPhone: ord.customerPhone,
        courierId: 'sunno_eco',
        courierName: ord.courierTracking?.includes('REDX') ? 'RedX Express' : ord.courierTracking?.includes('PATHAO') ? 'Pathao Courier' : 'SUNNO Eco-Dispatch',
        trackingNumber: ord.trackingCode || ord.courierTracking || `TRK-SUNNO-${ord.id.slice(-6).toUpperCase()}`,
        trackingUrl: `https://sunno.eco/track/${ord.trackingCode || ord.courierTracking || ord.id}`,
        serviceType: 'standard',
        packageInfo: {
          weight: 1.2,
          itemCount: ord.items?.reduce((acc, it) => acc + it.quantity, 0) || 1,
          ecoPackagingType: 'JUTE_BAG',
          isFragile: false,
          lengthCm: 25,
          widthCm: 20,
          heightCm: 10,
        },
        status: (ord.status === 'delivered' ? 'DELIVERED' : 'IN_TRANSIT') as ShipmentStatus,
        statusLogs: [
          {
            status: 'READY_FOR_SHIPMENT',
            title: 'Artisan Workshop Dispatched',
            description: 'Packaged in 100% biodegradable zero-plastic eco packaging',
            location: `${ord.shippingAddress?.district || ord.district || 'Dhaka'} Sorting Hub`,
            timestamp: ord.createdAt,
            updatedBy: 'Artisan Workshop Guild',
          },
          {
            status: 'IN_TRANSIT',
            title: 'In Transit with Eco-Dispatch',
            description: 'Consignment en route via carbon-conscious dispatch route',
            location: `${ord.shippingAddress?.district || ord.district || 'Dhaka'} Logistics Hub`,
            timestamp: new Date().toISOString(),
            updatedBy: 'SUNNO Logistics Dispatcher',
          },
        ],
        codAmount: ord.paymentMethod === 'cod' ? (ord.finalTotal || ord.total) : 0,
        collectionStatus: ord.paymentMethod === 'cod' ? 'pending' : 'remitted',
        deliveryFee: ord.deliveryFee || 60,
        pickupAddress: {
          fullName: 'Artisan Regional Cooperative',
          phone: '+880 1700-000000',
          division: ord.shippingAddress?.division || ord.division || 'Dhaka',
          district: ord.shippingAddress?.district || ord.district || 'Dhaka',
          streetAddress: 'Artisan Center, Bangladesh',
        },
        deliveryAddress: ord.shippingAddress || {
          id: `addr-${ord.id}`,
          fullName: ord.customerName,
          phone: ord.customerPhone,
          streetAddress: ord.customerAddress || 'Customer Address',
          district: ord.district || 'Dhaka',
          division: ord.division || 'Dhaka',
          isDefault: true,
        },
        deliveryInstructions: ord.deliveryInstructions,
        createdAt: ord.createdAt,
        updatedAt: new Date().toISOString(),
      };
      setActiveTrackingShipment(fallbackShipment);
    } catch (err) {
      console.error('Error loading tracking:', err);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const handleOpenInvoiceForOrder = async (ord: Order) => {
    try {
      const inv = await getOfficialInvoiceForOrder(ord.id);
      if (inv) {
        setActiveInvoice(inv);
      }
    } catch (err) {
      console.error('Error generating invoice:', err);
    }
  };

  const handleOpenOrderModal = async (order: Order) => {
    setSelectedOrderDetails(order);
    if (order.subOrders && order.subOrders.length > 0) {
      setActiveOrderSubOrders(order.subOrders);
    } else {
      const subs = await fetchSubOrdersForParent(order.id);
      setActiveOrderSubOrders(subs);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = currentUser?.uid || userProfile?.id;
    if (!uid) return;

    const saved = await saveCustomerAddressInDb({
      ...addressForm,
      userId: uid,
    });

    setSavedAddresses((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = saved;
        return clone;
      }
      return [...prev, saved];
    });

    setIsEditingAddress(false);
  };

  const handleDeleteAddress = async (addressId: string) => {
    await deleteCustomerAddressFromDb(addressId);
    setSavedAddresses((prev) => prev.filter((a) => a.id !== addressId));
  };

  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileData({
      displayName: editDisplayName,
      fullName: editDisplayName,
      phoneNumber: editPhone,
      phone: editPhone,
      division: editDivision,
      district: editDistrict,
      upazila: editUpazila,
      streetAddress: editStreetAddress,
      postalCode: editPostalCode,
    });
    setSavedSettingsMsg('Profile information updated and saved successfully.');
    setTimeout(() => setSavedSettingsMsg(null), 3500);
  };

  const handleSelectAvatar = async (url: string) => {
    await updateProfileData({ photoURL: url });
    setIsAvatarModalOpen(false);
    setSavedSettingsMsg('Profile photo updated successfully!');
    setTimeout(() => setSavedSettingsMsg(null), 3000);
  };

  const handleResendEmailVerification = async () => {
    if (!currentUser) return;
    setIsSendingEmailVerification(true);
    setVerificationFeedback(null);
    try {
      await sendUserEmailVerification(currentUser);
      setVerificationFeedback(`Verification email sent to ${currentUser.email}! Please check your inbox.`);
    } catch (err: any) {
      setVerificationFeedback(err?.message || 'Failed to send verification email.');
    } finally {
      setIsSendingEmailVerification(false);
      setTimeout(() => setVerificationFeedback(null), 5000);
    }
  };

  const handleConfirmAccountDeletion = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setIsDeletingAccount(true);
    try {
      const now = new Date().toISOString();
      await updateProfileData({
        deletionRequested: true,
        deletionRequestedAt: now,
        deletionReason: deleteReason.trim() || 'Customer requested account closure',
      });
      setIsDeleteModalOpen(false);
      await logout();
      window.location.hash = '#home';
      setActiveTab('home');
    } catch (err: any) {
      alert(err?.message || 'Failed to submit account deletion request.');
      setIsDeletingAccount(false);
    }
  };

  const handleTriggerPasswordReset = async () => {
    if (userProfile?.email) {
      await resetPassword(userProfile.email);
      setSavedSettingsMsg(`Password reset link sent to ${userProfile.email}!`);
      setTimeout(() => setSavedSettingsMsg(null), 4000);
    }
  };

  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketDetails || !ticketReplyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const updated = await replyToSupportTicket({
        ticketId: selectedTicketDetails.id,
        message: ticketReplyText.trim(),
        senderId: actor.id,
        senderName: actor.name,
        senderRole: 'customer',
      });
      setSelectedTicketDetails(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setTicketReplyText('');
    } catch (err) {
      console.error('Error replying to ticket:', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const wishlistProducts = (products || []).filter((p) => wishlistIds.includes(p.id));

  const filteredOrders = orders.filter((o) => {
    const status = (o.status || o.orderStatus || 'confirmed').toLowerCase();
    const payStatus = (o.paymentStatus || (o.paymentMethod === 'cod' ? 'pending' : 'paid')).toLowerCase();

    if (orderStatusFilter !== 'all') {
      if (orderStatusFilter === 'pending') {
        if (status !== 'pending' && status !== 'confirmed' && payStatus !== 'pending') return false;
      } else if (orderStatusFilter === 'cancelled') {
        if (!status.includes('cancel') && !status.includes('return')) return false;
      } else if (status !== orderStatusFilter) {
        return false;
      }
    }

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase().trim();
      const matchNumber = (o.orderNumber || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q);
      const matchCustomer = (o.customerName || '').toLowerCase().includes(q) || (o.customerPhone || '').includes(q);
      const matchDistrict = (o.shippingAddress?.district || o.district || '').toLowerCase().includes(q);
      const matchTracking = (o.trackingCode || o.courierTracking || o.trackingNumber || '').toLowerCase().includes(q);
      const matchItems = (o.items || []).some(
        (it) => it.title.toLowerCase().includes(q) || (it.sellerName || '').toLowerCase().includes(q)
      );
      if (!matchNumber && !matchCustomer && !matchDistrict && !matchTracking && !matchItems) {
        return false;
      }
    }

    return true;
  });

  const filteredReturns = customerReturns.filter((r) => {
    if (returnStatusFilter === 'ALL') return true;
    return r.status === returnStatusFilter;
  });

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === 'ALL') return true;
    return t.status === ticketFilter;
  });

  const filteredNotifications = notifications.filter((n) => {
    if (notifTypeFilter === 'ALL') return true;
    return n.type === notifTypeFilter;
  });

  const availableDistrictsForForm = ALL_64_DISTRICTS.filter(
    (d) => d.division.toLowerCase() === (addressForm.division || 'Dhaka').toLowerCase()
  );
  const availableUpazilasForForm = getUpazilasForDistrict(addressForm.district || 'Dhaka');

  const availableDistrictsForSettings = ALL_64_DISTRICTS.filter(
    (d) => d.division.toLowerCase() === (editDivision || 'Dhaka').toLowerCase()
  );
  const availableUpazilasForSettings = getUpazilasForDistrict(editDistrict || 'Dhaka');

  if (!currentUser && !userProfile) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center mb-6 shadow-xs border border-[#c1c9be]/50">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-[#002c11] font-heading mb-3">
          Customer Portal & Orders
        </h2>
        <p className="text-sm text-[#717970] max-w-md mb-8">
          Sign in or create a real SUNNO account to access your live order consignments, parcel tracking, address book, artisan messages, and verified reviews.
        </p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-8 py-3.5 bg-[#1b6d24] hover:bg-[#002c11] text-white font-bold text-sm rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <span>Sign In / Create Account</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-8">
      {/* Customer Profile Header */}
      {/* Customer Profile Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar with Camera badge */}
          <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#002c11] text-[#a0f399] border-2 border-[#1b6d24] flex items-center justify-center text-2xl font-extrabold font-heading overflow-hidden shadow-inner">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAvatarModalOpen(true);
              }}
              title="Change Profile Photo"
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#1b6d24] text-white flex items-center justify-center shadow-md hover:bg-[#002c11] transition-transform active:scale-95 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#002c11] font-heading">
                {userProfile?.displayName || userProfile?.fullName || 'Conscious Buyer'}
              </h1>
            </div>

            {/* Badges Bar: Role, Email Status, Phone Status */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 bg-[#e8f5e9] text-[#1b6d24] text-[10px] font-bold rounded-full uppercase tracking-wider">
                Eco Patron
              </span>

              {currentUser?.emailVerified || userProfile?.emailVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Email Verified
                </span>
              ) : (
                <div className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Email Unverified
                  </span>
                  <button
                    type="button"
                    onClick={handleResendEmailVerification}
                    disabled={isSendingEmailVerification}
                    className="text-[10px] text-[#1b6d24] font-bold hover:underline cursor-pointer"
                  >
                    {isSendingEmailVerification ? 'Sending...' : 'Verify Email'}
                  </button>
                </div>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-sky-50 text-sky-800 text-[10px] font-bold rounded-full border border-sky-200">
                <Phone className="w-3 h-3 text-sky-600" />
                {userProfile?.phoneNumber || userProfile?.phone ? 'Mobile Connected' : 'Mobile Pending'}
              </span>
            </div>

            {verificationFeedback && (
              <p className="text-[11px] text-[#1b6d24] font-medium mt-1">
                {verificationFeedback}
              </p>
            )}

            <p className="text-xs text-[#717970] mt-1.5 flex flex-wrap items-center gap-2">
              <span className="font-medium">{userProfile?.email}</span>
              <span>•</span>
              <span>🌿 {userProfile?.ecoPoints ?? 50} SUNNO Eco Points</span>
              <span>•</span>
              <span>
                Member since {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '2026'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <button
            onClick={() => setActiveSubTab('notifications')}
            className="relative p-2.5 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#002c11] rounded-full transition-colors flex items-center justify-center cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadNotifCount}
              </span>
            )}
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-[#f0eded] hover:bg-red-50 text-[#414941] hover:text-red-700 rounded-full font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Subtabs (Including Reviews Tab) */}
      <div className="flex border-b border-[#c1c9be]/60 gap-1 sm:gap-2 overflow-x-auto text-xs sm:text-sm font-semibold pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: 'overview', label: 'My Account', icon: 'person' },
          { id: 'orders', label: `My Orders (${orders.length})`, icon: 'receipt_long' },
          { id: 'reviews', label: `My Reviews (${customerReviews.length})`, icon: 'rate_review' },
          { id: 'returns', label: `Returns & Refunds (${customerReturns.length})`, icon: 'sync' },
          { id: 'messages', label: `Messages (${conversations.length})`, icon: 'chat' },
          { id: 'support', label: `Support Tickets (${tickets.length})`, icon: 'help_center' },
          { id: 'notifications', label: `Notifications (${unreadNotifCount})`, icon: 'notifications' },
          { id: 'wishlist', label: `Wishlist (${wishlistProducts.length})`, icon: 'favorite' },
          { id: 'addresses', label: `Addresses (${savedAddresses.length})`, icon: 'pin_drop' },
          { id: 'rewards', label: 'Eco Rewards', icon: 'eco' },
          { id: 'settings', label: 'Settings', icon: 'settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`customer-tab-${tab.id}`}
            onClick={() => setActiveSubTab(tab.id as CustomerProfileTab)}
            className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === tab.id
                ? 'text-[#1b6d24] border-[#1b6d24] font-bold'
                : 'text-[#717970] border-transparent hover:text-[#002c11]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-2">
              <span className="text-xs font-bold text-[#717970] uppercase">Total Orders</span>
              <div className="text-2xl font-bold text-[#002c11]">{orders.length} Placed</div>
              <button
                onClick={() => setActiveSubTab('orders')}
                className="text-xs text-[#1b6d24] font-bold hover:underline block cursor-pointer"
              >
                Track Orders →
              </button>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-2">
              <span className="text-xs font-bold text-[#717970] uppercase">Active Returns</span>
              <div className="text-2xl font-bold text-[#002c11]">
                {customerReturns.filter((r) => r.status !== 'REFUNDED' && r.status !== 'REJECTED' && r.status !== 'CANCELLED').length} Active
              </div>
              <button
                onClick={() => setActiveSubTab('returns')}
                className="text-xs text-[#1b6d24] font-bold hover:underline block cursor-pointer"
              >
                View Return Claims →
              </button>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-2">
              <span className="text-xs font-bold text-[#717970] uppercase">Artisan Reviews</span>
              <div className="text-2xl font-bold text-[#002c11]">{customerReviews.length} Submitted</div>
              <button
                onClick={() => setActiveSubTab('reviews')}
                className="text-xs text-[#1b6d24] font-bold hover:underline block cursor-pointer"
              >
                View Reviews →
              </button>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-2">
              <span className="text-xs font-bold text-[#717970] uppercase">Eco Points</span>
              <div className="text-2xl font-bold text-[#1b6d24]">{userProfile?.ecoPoints ?? 50} Pts</div>
              <button
                onClick={() => setActiveSubTab('rewards')}
                className="text-xs text-[#1b6d24] font-bold hover:underline block cursor-pointer"
              >
                Redeem Vouchers →
              </button>
            </div>
          </div>

          {/* Customer Personal Information Card (12 Verified Fields) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f0eded]">
              <div>
                <h3 className="text-lg font-bold text-[#002c11] font-heading flex items-center gap-2">
                  <User className="w-5 h-5 text-[#1b6d24]" />
                  <span>Customer Profile &amp; Contact Information</span>
                </h3>
                <p className="text-xs text-[#717970] mt-0.5">
                  Verified customer details synced directly with real-time Firebase profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('settings')}
                className="px-4 py-2 bg-[#f0eded] hover:bg-[#002c11] hover:text-white text-[#002c11] text-xs font-bold rounded-xl transition-all border border-[#c1c9be]/60 cursor-pointer self-start sm:self-auto"
              >
                Edit in Settings
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
              {/* 1. Full Name */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">Full Name</span>
                <p className="font-bold text-sm text-[#002c11]">{userProfile?.displayName || userProfile?.fullName || 'Not specified'}</p>
              </div>

              {/* 2. Email Address */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">Email Address</span>
                <p className="font-bold text-sm text-[#002c11] truncate">{userProfile?.email || currentUser?.email || 'Not specified'}</p>
                <div className="mt-1">
                  {currentUser?.emailVerified || userProfile?.emailVerified ? (
                    <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-bold inline-flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Unverified
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Mobile Number */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">Mobile Number</span>
                <p className="font-bold text-sm text-[#002c11]">{userProfile?.phoneNumber || userProfile?.phone || 'Not provided'}</p>
                <span className="text-[10px] text-sky-700 font-bold mt-1 inline-block">
                  {userProfile?.phoneNumber || userProfile?.phone ? 'Linked' : 'Pending Verification'}
                </span>
              </div>

              {/* 4. Division */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">Division</span>
                <p className="font-bold text-sm text-[#002c11]">{userProfile?.division || 'Dhaka'}</p>
              </div>

              {/* 5. District */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">District</span>
                <p className="font-bold text-sm text-[#002c11]">{userProfile?.district || 'Dhaka'}</p>
              </div>

              {/* 6. Upazila / Thana */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">Upazila / Thana</span>
                <p className="font-bold text-sm text-[#002c11]">{userProfile?.upazila || 'Dhanmondi'}</p>
              </div>

              {/* 7. Street Address */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70 sm:col-span-2">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">Street Address &amp; Area</span>
                <p className="font-bold text-[#002c11]">{userProfile?.streetAddress || 'Not set yet (Update in Settings)'}</p>
              </div>

              {/* 8. Postal Code */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">Postal Code</span>
                <p className="font-bold text-sm text-[#002c11]">{userProfile?.postalCode || '1205'}</p>
              </div>

              {/* 9. Member Creation Date */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">Account Creation Date</span>
                <p className="font-bold text-sm text-[#002c11]">
                  {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'November 2026'}
                </p>
              </div>

              {/* 10. Role & Privileges */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">Account Role</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-sm text-[#002c11] capitalize">{userProfile?.role || 'Customer'}</span>
                  <span className="text-[10px] text-stone-500">(Protected)</span>
                </div>
              </div>

              {/* 11. Eco Verification */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-stone-200/70">
                <span className="text-[#717970] font-semibold block text-[11px] mb-1">Buyer Verification Status</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block mt-0.5">
                  Active Eco Patron
                </span>
              </div>
            </div>
          </div>

          {/* Recent Orders Preview */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0eded]">
              <div>
                <h3 className="text-lg font-bold text-[#002c11] font-heading">Recent Orders</h3>
                <p className="text-xs text-[#717970]">Your latest purchases directly supporting rural craftsmen.</p>
              </div>
              <button
                onClick={() => setActiveSubTab('orders')}
                className="text-xs text-[#1b6d24] font-bold hover:underline cursor-pointer"
              >
                View All ({orders.length}) →
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#717970] bg-[#fbf9f8] rounded-2xl border border-dashed border-[#c1c9be]/60 space-y-2">
                <Package className="w-8 h-8 text-[#c1c9be] mx-auto" />
                <p className="font-bold text-[#002c11]">No orders placed yet</p>
                <p className="text-stone-500">Discover 60+ eco-certified craft items and place your first order.</p>
                <button
                  onClick={() => {
                    window.location.hash = '#products';
                    setActiveTab('products');
                  }}
                  className="px-4 py-2 bg-[#1b6d24] text-white font-bold rounded-full text-xs hover:bg-[#002c11] transition-colors inline-block mt-2 cursor-pointer"
                >
                  Explore Marketplace Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 3).map((o) => (
                  <div key={o.id} className="p-4 rounded-2xl border border-stone-200 bg-[#fbf9f8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#002c11]">#{o.orderNumber || o.id.slice(-8)}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          ['delivered', 'completed'].includes((o.status || o.orderStatus || '').toLowerCase())
                            ? 'bg-emerald-100 text-emerald-800'
                            : ['cancelled'].includes((o.status || o.orderStatus || '').toLowerCase())
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {o.status || o.orderStatus || 'Confirmed'}
                        </span>
                      </div>
                      <p className="text-stone-500 text-[11px] mt-1">
                        Placed on {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : 'Recently'} • {o.items?.length || 1} craft items • Total: <strong className="text-[#002c11]">৳{o.finalTotal || o.total}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={async () => {
                          const ship = await fetchShipmentByTrackingNumber(o.trackingCode || o.id);
                          if (ship) {
                            setActiveTrackingShipment(ship);
                          } else {
                            setActiveSubTab('orders');
                          }
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-[#002c11] hover:text-white text-[#002c11] font-bold rounded-xl border border-stone-300 transition-colors cursor-pointer text-[11px]"
                      >
                        Track
                      </button>
                      <button
                        onClick={async () => {
                          const inv = await getOfficialInvoiceForOrder(o.id);
                          if (inv) setActiveInvoice(inv);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-[#002c11] hover:text-white text-[#002c11] font-bold rounded-xl border border-stone-300 transition-colors cursor-pointer text-[11px]"
                      >
                        Invoice
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrderDetails(o);
                        }}
                        className="px-3 py-1.5 bg-[#1b6d24] text-white font-bold rounded-xl hover:bg-[#002c11] transition-colors cursor-pointer text-[11px]"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions & Policy Guarantee Banner */}
          <div className="bg-[#f0eded] p-6 rounded-3xl border border-[#c1c9be]/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#002c11] text-[#a0f399] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#002c11] text-sm">SUNNO 100% Artisan Eco-Buyer Protection</h4>
                <p className="text-xs text-[#414941] mt-0.5">
                  7-Day hassle-free return window for damaged, wrong or missing craft goods with free doorstep pickup.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setSupportModalOrder(null);
                  setIsSupportModalOpen(true);
                }}
                className="px-4 py-2 bg-white text-[#002c11] hover:bg-[#002c11] hover:text-white rounded-xl text-xs font-bold transition-all border border-[#c1c9be]/60 cursor-pointer"
              >
                Open Support Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUNNO ORDER 360 - ORDERS, TRACKING & ARTISAN DISPATCHES */}
      {activeSubTab === 'orders' && (
        <div className="space-y-5">
          {/* Header Bar with Search & Brand Pill */}
          <div className="bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f0eded]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#e8f5e9] text-[#1b6d24] px-2.5 py-0.5 rounded-full font-mono border border-[#a0f399]">
                    SUNNO ORDER 360
                  </span>
                  <span className="text-xs text-[#717970] font-medium">Marketplace Order Command</span>
                </div>
                <h2 className="text-xl font-extrabold text-[#002c11] font-heading mt-1">
                  My Orders & Consignments
                </h2>
              </div>

              {/* Order Search Input */}
              <div className="relative min-w-[240px] sm:min-w-[320px]">
                <Search className="w-4 h-4 text-[#717970] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search orders by ID, product, artisan..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 bg-[#f4f7f4] border border-[#c1c9be]/60 rounded-full text-xs text-[#002c11] outline-none focus:border-[#1b6d24] transition-all"
                />
                {orderSearchQuery && (
                  <button
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717970] hover:text-[#002c11] text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Filter Status Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'all', label: 'All Orders', count: orders.length },
                  {
                    key: 'pending',
                    label: 'To Pay / Pending',
                    count: orders.filter(
                      (o) =>
                        (o.status || '').toLowerCase() === 'pending' ||
                        (o.paymentStatus || '').toLowerCase() === 'pending'
                    ).length,
                  },
                  {
                    key: 'processing',
                    label: 'Processing',
                    count: orders.filter((o) => (o.status || o.orderStatus) === 'processing').length,
                  },
                  {
                    key: 'shipped',
                    label: 'In Transit',
                    count: orders.filter((o) =>
                      ['shipped', 'in_transit', 'out_for_delivery'].includes((o.status || o.orderStatus || '').toLowerCase())
                    ).length,
                  },
                  {
                    key: 'delivered',
                    label: 'Delivered',
                    count: orders.filter((o) => (o.status || o.orderStatus) === 'delivered').length,
                  },
                  {
                    key: 'cancelled',
                    label: 'Cancelled / Returned',
                    count: orders.filter((o) =>
                      (o.status || o.orderStatus || '').toLowerCase().includes('cancel') ||
                      (o.status || '').toLowerCase().includes('return')
                    ).length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setOrderStatusFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      orderStatusFilter === tab.key
                        ? 'bg-[#002c11] text-white shadow-xs'
                        : 'bg-[#f0eded] text-[#414941] hover:bg-[#e7e8e7]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        orderStatusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-black/5 text-[#717970]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
              <span className="text-xs text-[#717970] font-medium">
                Showing {filteredOrders.length} of {orders.length} orders
              </span>
            </div>
          </div>

          {isLoadingOrders ? (
            <div className="bg-white p-12 rounded-3xl border border-[#c1c9be]/60 text-center text-xs text-[#717970]">
              <div className="w-8 h-8 border-3 border-[#1b6d24] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading verified order history from database...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#c1c9be]/60 text-center space-y-3">
              <Package className="w-10 h-10 text-[#c1c9be] mx-auto" />
              <h3 className="text-base font-bold text-[#002c11]">No Orders Found</h3>
              <p className="text-xs text-[#717970] max-w-sm mx-auto">
                {orderSearchQuery
                  ? `No orders matching "${orderSearchQuery}". Try clearing search or selecting a different status filter.`
                  : 'Discover eco-verified handcrafted items and 100% natural goods from artisans across 64 districts.'}
              </p>
              {orderSearchQuery ? (
                <button
                  onClick={() => setOrderSearchQuery('')}
                  className="px-6 py-2 bg-[#002c11] text-white rounded-full font-bold text-xs shadow-xs hover:bg-[#1b6d24] transition-colors"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('districts')}
                  className="px-6 py-2.5 bg-[#002c11] text-white rounded-full font-bold text-xs shadow-xs hover:bg-[#1b6d24] transition-colors"
                >
                  Browse 64 Districts
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((ord) => {
                const currentStatus = (ord.status || ord.orderStatus || 'confirmed').toLowerCase();
                const isDelivered = currentStatus === 'delivered';
                const isCancelled = currentStatus.includes('cancel');
                const orderIdDisplay = ord.orderNumber || ord.id;
                const isCopied = copiedOrderId === ord.id;

                return (
                  <div
                    key={ord.id}
                    className="bg-white p-5 sm:p-6 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-4 hover:border-[#1b6d24]/50 transition-all"
                  >
                    {/* Order Top Bar */}
                    <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-[#c1c9be]/40 text-xs">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#717970]">Order ID: </span>
                          <span className="font-mono font-bold text-[#002c11]">{orderIdDisplay}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(orderIdDisplay);
                              setCopiedOrderId(ord.id);
                              setTimeout(() => setCopiedOrderId(null), 2000);
                            }}
                            title="Copy Order ID"
                            className="p-1 text-[#717970] hover:text-[#1b6d24] rounded-md transition-colors"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="text-[#717970] hidden sm:inline">•</span>
                        <span className="text-[#717970]">
                          {new Date(ord.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {ord.sellerIds && ord.sellerIds.length > 1 && (
                          <span className="px-2 py-0.5 bg-[#e8f5e9] text-[#1b6d24] text-[10px] font-bold rounded-full border border-[#a0f399]">
                            {ord.sellerIds.length} Workshops
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                            isCancelled
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isDelivered
                              ? 'bg-[#e8f5e9] text-[#1b6d24] border-[#a0f399]'
                              : currentStatus === 'shipped' || currentStatus === 'out_for_delivery'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : currentStatus === 'processing'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {ord.status || 'Confirmed'}
                        </span>
                        <button
                          onClick={() => handleOpenOrderModal(ord)}
                          className="px-3.5 py-1.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <Sparkles className="w-3 h-3 text-[#a0f399]" />
                          <span>Order 360</span>
                        </button>
                        <button
                          onClick={() => handleOpenTrackingForOrder(ord)}
                          className="px-3 py-1.5 bg-[#e8f5e9] hover:bg-[#d8edd9] text-[#1b6d24] rounded-full text-[11px] font-bold transition-all flex items-center gap-1"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Track Live</span>
                        </button>
                        <button
                          onClick={() => handleOpenInvoiceForOrder(ord)}
                          className="px-3 py-1.5 bg-[#f0eded] hover:bg-stone-300 text-stone-800 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1"
                          title="View Official Tax Invoice"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Invoice</span>
                        </button>
                        {checkOrderCancellationEligibility(ord, 'customer', currentUser?.uid || userProfile?.id).eligible && (
                          <button
                            onClick={() => {
                              setOrderToCancel(ord);
                              setCancelReason(CANCELLATION_REASONS_CUSTOMER[0]);
                              setCancelNotes('');
                              setCancelConfirm(false);
                              setCancelError(null);
                            }}
                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Cancel Order & Restock Inventory"
                          >
                            <span className="material-symbols-outlined text-[13px]">cancel</span>
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Purchased Items with Return, Review & Chat Actions */}
                    <div className="space-y-3">
                      {ord.items?.map((item, idx) => {
                        const sellerId = item.sellerId || ord.sellerIds?.[0] || 'artisan-coop';
                        const sellerName = item.sellerName || 'Verified Artisan Cooperative';

                        return (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between text-xs p-3 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/30 gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-14 h-14 object-cover rounded-xl bg-gray-100 shrink-0 border border-[#c1c9be]/40"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-[#002c11] truncate">{item.title}</p>
                                <p className="text-[#717970] text-[11px] truncate">
                                  Qty: {item.quantity} • Unit: ৳{item.price} • Artisan: {sellerName}
                                </p>
                                <p className="text-[#1b6d24] font-mono font-bold mt-0.5">
                                  ৳{item.price * item.quantity}
                                </p>
                              </div>
                            </div>

                            {/* Item Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                              {isDelivered && (
                                <>
                                  <button
                                    onClick={() => setSelectedOrderForReturn({ order: ord, productId: item.productId || item.id })}
                                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-colors"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Request Return</span>
                                  </button>

                                  <button
                                    onClick={() => setSelectedProductForReview({ product: item, order: ord })}
                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#1b6d24] border border-emerald-200 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-colors"
                                  >
                                    <Star className="w-3 h-3" />
                                    <span>Review Product</span>
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() =>
                                  setDirectChatTarget({
                                    sellerId,
                                    sellerName,
                                    storeName: sellerName,
                                    productId: item.productId || item.id,
                                    productTitle: item.title,
                                    productImage: item.image,
                                    orderId: ord.id,
                                    orderNumber: ord.orderNumber || ord.id,
                                  })
                                }
                                className="px-3 py-1.5 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#002c11] rounded-xl font-bold text-[11px] flex items-center gap-1 transition-colors"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Chat Artisan</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Footer summary */}
                    <div className="flex flex-wrap justify-between items-center pt-3 border-t border-[#f0eded] text-xs gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-[#717970]">
                          Payment: <span className="font-bold text-[#002c11] uppercase">{ord.paymentMethod}</span> ({ord.paymentStatus})
                        </p>
                        <span className="text-[#717970] hidden sm:inline">•</span>
                        <button
                          onClick={() => handleBuyAgainOrder(ord.items)}
                          className="px-3 py-1 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#002c11] rounded-xl font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3 text-[#1b6d24]" />
                          <span>Buy Again</span>
                        </button>
                        <button
                          onClick={() => {
                            setSupportModalOrder(ord);
                            setIsSupportModalOpen(true);
                          }}
                          className="text-[#1b6d24] hover:underline font-bold flex items-center gap-1"
                        >
                          <LifeBuoy className="w-3.5 h-3.5" />
                          <span>Need Order Help?</span>
                        </button>
                      </div>
                      <div className="text-right">
                        {ord.discount ? (
                          <span className="text-[11px] text-[#1b6d24] block font-medium">
                            Discount: -৳{ord.discount}
                          </span>
                        ) : null}
                        <span className="text-xs text-[#717970]">Total: </span>
                        <span className="font-mono font-bold text-base text-[#002c11]">
                          ৳{ord.finalTotal || ord.total}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SUNNO ORDER 360 COMPREHENSIVE MODAL */}
          {selectedOrderDetails && (
            <Order360Modal
              order={selectedOrderDetails}
              onClose={() => setSelectedOrderDetails(null)}
              viewerRole="customer"
              onBuyAgain={(items) => handleBuyAgainOrder(items)}
              onOpenChat={(target) => setDirectChatTarget(target)}
              onOpenTracking={(ord) => handleOpenTrackingForOrder(ord)}
              onOpenInvoice={(ord) => handleOpenInvoiceForOrder(ord)}
              onOpenSupportTicket={(ord) => {
                setSupportModalOrder(ord);
                setIsSupportModalOpen(true);
              }}
              onOpenReview={(item, ord) => {
                setSelectedProductForReview({ product: item, order: ord });
              }}
              onOpenReturn={(ord, prodId) => {
                setSelectedOrderForReturn({ order: ord, productId: prodId });
              }}
            />
          )}
        </div>
      )}

      {/* TAB 3: RETURNS & REFUNDS TRACKER */}
      {activeSubTab === 'returns' && (
        <div className="space-y-6">
          {/* Policy Overview Header Banner */}
          <div className="bg-linear-to-r from-[#002c11] to-[#0a4820] text-white p-6 sm:p-8 rounded-3xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[#a0f399] font-bold">
                Zero-Hassle Customer Protection
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono font-bold text-[#a0f399]">
                7-Day Return Window
              </span>
            </div>
            <h2 className="text-2xl font-bold font-heading">Returns &amp; Refund Management</h2>
            <p className="text-xs text-[#c1c9be] max-w-2xl leading-relaxed">
              If an artisan craft arrives damaged, missing, or mismatched, request a return within 7 days. Our verified courier will collect the parcel from your doorstep, and 100% of your refund will be disbursed to your chosen bKash, Nagad, or Bank account upon inspection.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#c1c9be]/60">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-[#002c11]">Filter:</span>
              {[
                { id: 'ALL', label: 'All Returns' },
                { id: 'RETURN_REQUESTED', label: 'Pending Approval' },
                { id: 'RETURN_APPROVED', label: 'Approved' },
                { id: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
                { id: 'INSPECTED', label: 'Inspected' },
                { id: 'REFUNDED', label: 'Refunded' },
                { id: 'REJECTED', label: 'Rejected' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setReturnStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    returnStatusFilter === st.id
                      ? 'bg-[#002c11] text-white'
                      : 'bg-[#f0eded] text-[#414941] hover:bg-[#e7e8e7]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-[#717970] font-medium">
              Showing {filteredReturns.length} of {customerReturns.length} request(s)
            </span>
          </div>

          {/* Returns Cards List */}
          {filteredReturns.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#c1c9be]/60 text-center space-y-3">
              <RotateCcw className="w-12 h-12 text-[#c1c9be] mx-auto" />
              <h3 className="text-base font-bold text-[#002c11]">No Return Requests</h3>
              <p className="text-xs text-[#717970] max-w-sm mx-auto">
                You haven't requested any returns. You can initiate return requests from your delivered orders.
              </p>
              <button
                onClick={() => setActiveSubTab('orders')}
                className="px-6 py-2.5 bg-[#002c11] text-white rounded-full font-bold text-xs shadow-xs hover:bg-[#1b6d24] transition-colors"
              >
                Go to My Orders
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReturns.map((ret) => {
                const isCompleted = ret.status === 'REFUNDED';
                const isRejected = ret.status === 'REJECTED';

                return (
                  <div
                    key={ret.id}
                    className="bg-white p-5 sm:p-6 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-4 hover:border-[#1b6d24]/50 transition-all"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-[#c1c9be]/40 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[#002c11]">Return #{ret.id}</span>
                        <span className="text-[#717970]">•</span>
                        <span className="text-[#717970]">Order #{ret.orderNumber || ret.orderId}</span>
                        <span className="text-[#717970] hidden sm:inline">•</span>
                        <span className="text-[#717970] hidden sm:inline">
                          Requested: {new Date(ret.requestedDate || ret.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isRejected
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {ret.status.replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={() => setSelectedReturnDetails(ret)}
                          className="px-3 py-1 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-full text-[11px] font-bold transition-colors flex items-center gap-1"
                        >
                          <span>Timeline &amp; Audit</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        {ret.productImage ? (
                          <img
                            src={ret.productImage}
                            alt={ret.productTitle}
                            className="w-14 h-14 object-cover rounded-xl bg-gray-100 shrink-0 border border-[#c1c9be]/40"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-[#f0eded] flex items-center justify-center text-[#717970]">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#002c11] text-sm truncate">{ret.productTitle}</h4>
                          <p className="text-[#717970] text-xs">
                            Reason: <span className="font-semibold text-[#002c11]">{ret.returnReason}</span> • Qty: {ret.quantity}
                          </p>
                          <p className="text-[#1b6d24] font-mono font-bold mt-0.5">
                            Refund: ৳{ret.refundAmount} via {ret.refundMethod?.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#fbf9f8] p-3 rounded-2xl border border-[#c1c9be]/40 text-xs w-full sm:w-auto space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#717970]">Return Tracking:</span>
                          <span className="font-mono font-bold text-[#002c11]">{ret.returnTrackingNumber || 'Pending Schedule'}</span>
                        </div>
                        {ret.refundTransactionId && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[#717970]">Refund TxID:</span>
                            <span className="font-mono font-bold text-[#1b6d24]">{ret.refundTransactionId}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {ret.description && (
                      <p className="text-xs text-[#414941] bg-[#f0eded]/60 p-3 rounded-xl border border-[#c1c9be]/30">
                        <span className="font-bold text-[#002c11]">Note: </span>
                        {ret.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: CUSTOMER REVIEWS */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f0eded]">
              <div>
                <h3 className="text-xl font-extrabold text-[#002c11] font-heading">
                  My Verified Reviews &amp; Artisan Ratings
                </h3>
                <p className="text-xs text-[#717970] mt-0.5">
                  Your feedback empowers authentic rural artisans across 64 districts of Bangladesh.
                </p>
              </div>
              <span className="text-xs font-bold text-[#1b6d24] bg-[#e8f5e9] px-3.5 py-1.5 rounded-full w-fit">
                {customerReviews.length} Reviews Submitted
              </span>
            </div>

            {/* Awaiting Review from Delivered Orders */}
            {orders.filter((o) => ['delivered', 'completed'].includes((o.status || o.orderStatus || '').toLowerCase())).length > 0 && (
              <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#002c11]">
                  <Sparkles className="w-4 h-4 text-[#1b6d24]" />
                  <span>Delivered Crafts Awaiting Your Review</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {orders
                    .filter((o) => ['delivered', 'completed'].includes((o.status || o.orderStatus || '').toLowerCase()))
                    .flatMap((o) => (o.items || []).map((it) => ({ item: it, order: o })))
                    .slice(0, 6)
                    .map(({ item, order }) => (
                      <div key={`${order.id}-${item.productId}`} className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-10 h-10 rounded-lg object-cover bg-stone-100 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-stone-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-[#002c11] truncate">{item.title}</p>
                            <p className="text-[11px] text-stone-500">Order #{order.orderNumber || order.id.slice(-6)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProductForReview({
                              product: { id: item.productId, title: item.title, images: [item.image] },
                              order: order,
                              existingReview: null,
                            });
                          }}
                          className="px-3 py-1.5 bg-[#1b6d24] text-white font-bold rounded-lg hover:bg-[#002c11] transition-colors shrink-0 text-[11px] cursor-pointer"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Submitted Reviews List */}
            {customerReviews.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#717970] bg-[#fbf9f8] rounded-2xl border border-dashed border-[#c1c9be]/60 space-y-3">
                <Star className="w-10 h-10 text-[#c1c9be] mx-auto" />
                <h4 className="font-bold text-[#002c11] text-sm">No Reviews Submitted Yet</h4>
                <p className="max-w-md mx-auto text-stone-500">
                  Once your eco-friendly orders are delivered, your feedback helps verified artisans build trust and grow sustainably.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerReviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-white rounded-2xl border border-[#c1c9be]/60 shadow-xs space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= (rev.rating || 5)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-stone-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-stone-400">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-GB') : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {rev.productImage && (
                        <img src={rev.productImage} alt={rev.productTitle} className="w-10 h-10 rounded-lg object-cover bg-stone-100 shrink-0" />
                      )}
                      <div>
                        <h4 className="font-bold text-[#002c11]">{rev.productTitle || 'Artisan Craft'}</h4>
                        {rev.sellerName && (
                          <p className="text-[11px] text-[#1b6d24] font-medium">Shop: {rev.sellerName}</p>
                        )}
                      </div>
                    </div>

                    {rev.title && <h5 className="font-bold text-stone-800">{rev.title}</h5>}
                    <p className="text-stone-600 leading-relaxed">{rev.comment}</p>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified Purchase
                      </span>
                      {rev.status && (
                        <span className="capitalize px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px]">
                          {rev.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DIRECT ARTISAN MESSAGES */}
      {activeSubTab === 'messages' && (
        <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 sm:p-8 space-y-6 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0eded] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#002c11]">Direct Artisan Messages &amp; Workshop Chats</h3>
              <p className="text-xs text-[#717970]">
                Real-time conversations with verified Bangladeshi artisan cooperatives and craft workshops.
              </p>
            </div>
          </div>

          {conversations.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#717970] bg-[#fbf9f8] rounded-3xl border border-[#c1c9be]/40 space-y-3">
              <MessageSquare className="w-12 h-12 text-[#c1c9be] mx-auto" />
              <h4 className="font-bold text-[#002c11] text-sm">No Active Conversations</h4>
              <p className="max-w-sm mx-auto">
                You can start a direct chat with any artisan workshop directly from craft product pages or your order history!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#f0eded]">
              {conversations.map((c) => {
                const unread = c.unreadCountCustomer || 0;

                return (
                  <div
                    key={c.id}
                    onClick={() =>
                      setDirectChatTarget({
                        sellerId: c.sellerId,
                        sellerName: c.sellerName,
                        storeName: c.storeName || c.sellerName,
                        productId: c.productId,
                        productTitle: c.productTitle,
                        productImage: c.productImage,
                        orderId: c.orderId,
                        orderNumber: c.orderNumber,
                      })
                    }
                    className="py-4 px-3 rounded-2xl hover:bg-[#fbf9f8] cursor-pointer transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#002c11] text-[#a0f399] flex items-center justify-center font-bold font-heading shrink-0">
                        {c.sellerName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#002c11] text-sm truncate">{c.storeName || c.sellerName}</h4>
                          {unread > 0 && (
                            <span className="px-2 py-0.5 bg-[#1b6d24] text-white text-[10px] font-bold rounded-full">
                              {unread} new
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#717970] truncate mt-0.5">{c.lastMessageText || 'Chat started'}</p>
                        {c.productTitle && (
                          <span className="text-[10px] text-[#1b6d24] font-medium block truncate">
                            Craft: {c.productTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-xs">
                      <span className="text-[11px] text-[#717970] block">
                        {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString() : ''}
                      </span>
                      <button className="mt-1 text-[#1b6d24] font-bold hover:underline flex items-center gap-0.5">
                        <span>Open Chat</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SUPPORT TICKETS */}
      {activeSubTab === 'support' && (
        <div className="space-y-6 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-[#002c11]">Customer Support Desk</h3>
              <p className="text-xs text-[#717970]">
                Submit inquiries, report order problems, or ask policy questions directly to the SUNNO Concierge.
              </p>
            </div>
            <button
              onClick={() => {
                setSupportModalOrder(null);
                setIsSupportModalOpen(true);
              }}
              className="px-5 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Ticket</span>
            </button>
          </div>

          {/* Tickets Filter */}
          <div className="flex items-center gap-2 overflow-x-auto bg-white p-3.5 rounded-2xl border border-[#c1c9be]/60">
            <span className="text-xs font-bold text-[#002c11]">Status:</span>
            {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setTicketFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors ${
                  ticketFilter === st
                    ? 'bg-[#002c11] text-white'
                    : 'bg-[#f0eded] text-[#414941] hover:bg-[#e7e8e7]'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {filteredTickets.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#c1c9be]/60 text-center space-y-3">
              <LifeBuoy className="w-12 h-12 text-[#c1c9be] mx-auto" />
              <h4 className="font-bold text-[#002c11] text-sm">No Support Tickets</h4>
              <p className="text-xs text-[#717970] max-w-sm mx-auto">
                Need help with a consignment, payment, or artisan inquiry? Open a ticket to reach our 24/7 team.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketDetails(t)}
                  className="bg-white p-5 rounded-2xl border border-[#c1c9be]/60 shadow-xs hover:border-[#1b6d24]/60 cursor-pointer transition-all space-y-2 text-xs"
                >
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#002c11]">{t.ticketNumber || t.id}</span>
                      <span className="px-2 py-0.5 bg-[#f0eded] text-[#414941] rounded-md font-medium text-[11px]">
                        {t.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          t.priority === 'CRITICAL' || t.priority === 'HIGH'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        t.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-800'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="font-bold text-[#002c11] text-sm">{t.subject}</h4>

                  <div className="flex items-center justify-between text-[11px] text-[#717970] pt-1 border-t border-[#f0eded]">
                    <span>
                      {t.messages?.length || 1} Message(s) • Last updated: {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[#1b6d24] font-bold flex items-center gap-1">
                      <span>View Thread</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ticket Details & Reply Dialog */}
      {selectedTicketDetails && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#c1c9be]/60">
            <div className="p-5 border-b border-[#c1c9be]/50 bg-[#fbf9f8] flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#1b6d24]">
                  {selectedTicketDetails.ticketNumber || selectedTicketDetails.id}
                </span>
                <h3 className="text-base font-extrabold text-[#002c11] font-heading">
                  {selectedTicketDetails.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicketDetails(null)}
                className="w-8 h-8 rounded-full bg-[#f0eded] text-[#414941] flex items-center justify-center hover:bg-[#e7e8e7]"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              <div className="bg-[#f0eded]/60 p-3.5 rounded-2xl border border-[#c1c9be]/40 space-y-1">
                <div className="flex justify-between font-medium text-[#717970]">
                  <span>Category: <strong className="text-[#002c11]">{selectedTicketDetails.category}</strong></span>
                  <span>Status: <strong className="text-[#002c11]">{selectedTicketDetails.status}</strong></span>
                </div>
                {selectedTicketDetails.relatedOrderNumber && (
                  <p className="text-[#717970]">
                    Related Order: <strong className="text-[#002c11]">{selectedTicketDetails.relatedOrderNumber}</strong>
                  </p>
                )}
              </div>

              {/* Message Thread */}
              <div className="space-y-3 pt-2">
                {selectedTicketDetails.messages?.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl text-xs space-y-1.5 ${
                      m.senderRole === 'customer'
                        ? 'bg-[#e8f5e9] text-[#002c11] border border-[#1b6d24]/20'
                        : 'bg-[#f0eded] text-[#1b1c1c] border border-[#c1c9be]/40'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] text-[#717970]">
                      <span className="font-bold">{m.senderName} ({m.senderRole})</span>
                      <span>{new Date(m.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSendTicketReply} className="p-4 border-t border-[#c1c9be]/50 bg-[#fbf9f8] flex gap-2">
              <input
                type="text"
                value={ticketReplyText}
                onChange={(e) => setTicketReplyText(e.target.value)}
                placeholder="Type your response to SUNNO support..."
                className="flex-1 bg-white border border-[#c1c9be] rounded-xl px-4 py-2 text-xs outline-none focus:border-[#1b6d24]"
              />
              <button
                type="submit"
                disabled={!ticketReplyText.trim() || isSubmittingReply}
                className="px-5 py-2 bg-[#002c11] hover:bg-[#1b6d24] disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5"
              >
                <span>Reply</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: NOTIFICATIONS INBOX */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-5 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-[#002c11]">Notifications Inbox</h3>
              <p className="text-xs text-[#717970]">
                Real-time updates regarding orders, return authorizations, refunds, and artisan responses.
              </p>
            </div>
            {unreadNotifCount > 0 && (
              <button
                onClick={() => {
                  const uid = currentUser?.uid || userProfile?.id;
                  if (uid) markAllNotificationsAsRead(uid);
                }}
                className="px-4 py-2 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#002c11] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <CheckCheck className="w-4 h-4 text-[#1b6d24]" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#c1c9be]/60 text-center space-y-2">
                <Bell className="w-12 h-12 text-[#c1c9be] mx-auto" />
                <h4 className="font-bold text-[#002c11] text-sm">No Notifications</h4>
                <p className="text-xs text-[#717970]">You are completely caught up!</p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markNotificationAsRead(n.id);
                    if (n.targetSubTab) setActiveSubTab(n.targetSubTab as CustomerProfileTab);
                    else if (n.type === 'ORDER') setActiveSubTab('orders');
                    else if (n.type === 'RETURN' || n.type === 'REFUND') setActiveSubTab('returns');
                    else if (n.type === 'CHAT') setActiveSubTab('messages');
                    else if (n.type === 'SUPPORT') setActiveSubTab('support');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 text-xs ${
                    n.read
                      ? 'bg-white border-[#c1c9be]/60 text-[#414941]'
                      : 'bg-[#e8f5e9]/40 border-[#1b6d24]/40 text-[#002c11] shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      n.read ? 'bg-[#f0eded] text-[#717970]' : 'bg-[#002c11] text-[#a0f399]'
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#002c11]">{n.title}</h4>
                      <p className="text-xs text-[#414941] mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-[#717970] mt-1 block">
                        {new Date(n.timestamp || n.createdAt || '').toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!n.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1b6d24] shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: WISHLIST */}
      {activeSubTab === 'wishlist' && (
        <div className="space-y-4">
          {wishlistProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#c1c9be]/60 text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-[#c1c9be]">favorite_border</span>
              <h3 className="text-base font-bold text-[#002c11]">Your Wishlist is Empty</h3>
              <p className="text-xs text-[#717970] max-w-sm mx-auto">
                Save your favorite artisanal crafts while browsing our 64 district cooperatives.
              </p>
              <button
                onClick={() => setActiveTab('districts')}
                className="px-6 py-2.5 bg-[#002c11] text-white rounded-full font-bold text-xs shadow-xs hover:bg-[#1b6d24] transition-colors"
              >
                Discover Heritage Crafts
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {wishlistProducts.map((p) => {
                const isOutOfStock = typeof p.stock === 'number' && p.stock <= 0;
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-[#c1c9be]/60 overflow-hidden shadow-xs flex flex-col justify-between group hover:border-[#1b6d24]/50 transition-all"
                  >
                    <div
                      className="relative cursor-pointer overflow-hidden"
                      onClick={() => onSelectProduct(p)}
                    >
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="w-full h-40 object-cover bg-gray-100 group-hover:scale-102 transition-transform duration-300"
                      />
                      {isOutOfStock && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600/90 text-white font-bold text-[10px] rounded-md backdrop-blur-xs">
                          Out of Stock
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWishlist(p.id);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-red-500 hover:bg-white flex items-center justify-center shadow-xs transition-colors"
                        title="Remove from saved items"
                      >
                        <span className="material-symbols-outlined text-[15px]">favorite</span>
                      </button>
                    </div>
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between text-xs">
                      <div
                        className="cursor-pointer"
                        onClick={() => onSelectProduct(p)}
                      >
                        <h4 className="font-bold text-[#002c11] truncate group-hover:text-[#1b6d24] transition-colors">{p.title}</h4>
                        <p className="text-[#717970] text-[11px]">{p.district} • {p.sellerName}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#f0eded]">
                        <span className="font-mono font-bold text-[#002c11]">৳{p.price}</span>
                        <button
                          onClick={() => onAddToCart(p)}
                          disabled={isOutOfStock}
                          className="px-3 py-1 bg-[#002c11] hover:bg-[#1b6d24] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg text-[11px] transition-colors"
                        >
                          {isOutOfStock ? 'Sold Out' : 'Add to Bag'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: ADDRESSES */}
      {activeSubTab === 'addresses' && (
        <div className="space-y-5 max-w-3xl">
          <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-[#c1c9be]/60 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-[#002c11]">Saved Delivery Addresses</h3>
              <p className="text-xs text-[#717970]">Manage home, workplace, or artisan delivery locations.</p>
            </div>
            {!isEditingAddress && (
              <button
                onClick={() => {
                  setAddressForm({
                    id: '',
                    fullName: userProfile?.displayName || '',
                    phone: userProfile?.phoneNumber || '01712345678',
                    division: 'Dhaka',
                    district: 'Dhaka',
                    upazila: 'Dhanmondi',
                    area: '',
                    streetAddress: '',
                    postalCode: '',
                    additionalInstructions: '',
                    label: 'Home',
                    isDefault: savedAddresses.length === 0,
                  });
                  setIsEditingAddress(true);
                }}
                className="px-4 py-2 bg-[#002c11] text-white rounded-xl text-xs font-bold hover:bg-[#1b6d24] flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Address</span>
              </button>
            )}
          </div>

          {/* Saved Addresses List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {savedAddresses.map((addr) => (
              <div
                key={addr.id}
                className={`p-5 rounded-2xl border text-xs space-y-2 bg-white ${
                  addr.isDefault ? 'border-[#1b6d24] shadow-xs' : 'border-[#c1c9be]/60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002c11] px-2 py-0.5 bg-[#f0eded] rounded-md uppercase text-[10px]">
                    {addr.label || 'Home'}
                  </span>
                  {addr.isDefault && (
                    <span className="text-[10px] font-bold text-[#1b6d24]">Default Address</span>
                  )}
                </div>
                <p className="font-bold text-sm text-[#002c11]">{addr.fullName}</p>
                <p className="text-[#717970]">{addr.phone}</p>
                <p className="text-[#414941]">{addr.streetAddress}, {addr.upazila}, {addr.district}, {addr.division}</p>
                <div className="pt-2 flex gap-3 text-xs">
                  <button
                    onClick={() => {
                      setAddressForm(addr);
                      setIsEditingAddress(true);
                    }}
                    className="text-[#1b6d24] font-bold hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-red-600 font-bold hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit / Add Address Form */}
          {isEditingAddress && (
            <form onSubmit={handleSaveAddress} className="bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-xs space-y-4 text-xs">
              <h4 className="font-bold text-sm text-[#002c11]">
                {addressForm.id ? 'Edit Address' : 'Add New Delivery Address'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Full Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl p-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Active Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl p-2.5 outline-none focus:border-[#1b6d24]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Division *</label>
                  <select
                    value={addressForm.division}
                    onChange={(e) => {
                      const div = e.target.value;
                      const dists = ALL_64_DISTRICTS.filter((d) => d.division.toLowerCase() === div.toLowerCase());
                      setAddressForm({
                        ...addressForm,
                        division: div,
                        district: dists[0]?.name || 'Dhaka',
                        upazila: getUpazilasForDistrict(dists[0]?.name || 'Dhaka')[0] || 'Sadar',
                      });
                    }}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl p-2.5 outline-none focus:border-[#1b6d24]"
                  >
                    {BANGLADESH_DIVISIONS.map((div) => (
                      <option key={div.id} value={div.name}>{div.name} Division</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#002c11] mb-1">District *</label>
                  <select
                    value={addressForm.district}
                    onChange={(e) => {
                      const newDist = e.target.value;
                      const ups = getUpazilasForDistrict(newDist);
                      setAddressForm({
                        ...addressForm,
                        district: newDist,
                        upazila: ups[0] || 'Sadar',
                      });
                    }}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl p-2.5 outline-none focus:border-[#1b6d24]"
                  >
                    {availableDistrictsForForm.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Thana / Upazila *</label>
                  <select
                    value={addressForm.upazila}
                    onChange={(e) => setAddressForm({ ...addressForm, upazila: e.target.value })}
                    className="w-full bg-white border border-[#c1c9be] rounded-xl p-2.5 outline-none focus:border-[#1b6d24]"
                  >
                    {availableUpazilasForForm.map((up) => (
                      <option key={up} value={up}>{up}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#002c11] mb-1">Street Address *</label>
                <textarea
                  rows={2}
                  required
                  value={addressForm.streetAddress}
                  onChange={(e) => setAddressForm({ ...addressForm, streetAddress: e.target.value })}
                  placeholder="House / Flat / Road / Holding Number"
                  className="w-full bg-white border border-[#c1c9be] rounded-xl p-2.5 outline-none focus:border-[#1b6d24]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  {['Home', 'Work', 'Other'].map((lbl) => (
                    <label key={lbl} className="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="addrLabelChoice"
                        checked={addressForm.label === lbl}
                        onChange={() => setAddressForm({ ...addressForm, label: lbl })}
                        className="accent-[#1b6d24]"
                      />
                      {lbl}
                    </label>
                  ))}
                  <label className="flex items-center gap-1.5 text-xs ml-4 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                      className="accent-[#1b6d24]"
                    />
                    Set as Default
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold rounded-xl transition-colors"
                  >
                    Save Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(false)}
                    className="px-4 py-2.5 bg-[#f0eded] hover:bg-[#e7e8e7] text-[#414941] font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 9: ECO REWARDS */}
      {activeSubTab === 'rewards' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-linear-to-r from-[#002c11] to-[#0d4421] text-white p-8 rounded-3xl shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#a0f399] font-bold">SUNNO Eco Club</span>
                <h3 className="text-3xl font-extrabold font-heading mt-1">{userProfile?.ecoPoints || 180} Points</h3>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-[#a0f399]">forest</span>
              </div>
            </div>
            <p className="text-xs text-[#c1c9be] max-w-lg">
              Earn 10 Eco Points per ৳100 spent on eco-verified artisan crafts. Redeem points for artisan shipping subsidies and heritage craft discounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white p-5 rounded-2xl border border-[#c1c9be]/60 shadow-xs space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-[#002c11]">৳100 Off Bamboo Crafts</h4>
                <span className="px-2.5 py-0.5 bg-[#e8f5e9] text-[#1b6d24] rounded-full font-mono font-bold">100 Pts</span>
              </div>
              <p className="text-[#717970]">Valid on all verified Bamboo and Cane products above ৳800.</p>
              <button className="px-4 py-1.5 bg-[#002c11] text-white font-bold rounded-lg hover:bg-[#1b6d24]">
                Redeem Voucher
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#c1c9be]/60 shadow-xs space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-[#002c11]">Free Eco Courier Delivery</h4>
                <span className="px-2.5 py-0.5 bg-[#e8f5e9] text-[#1b6d24] rounded-full font-mono font-bold">150 Pts</span>
              </div>
              <p className="text-[#717970]">Free zero-plastic shipping anywhere across all 64 districts.</p>
              <button className="px-4 py-1.5 bg-[#002c11] text-white font-bold rounded-lg hover:bg-[#1b6d24]">
                Redeem Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-6 sm:p-8 space-y-6 text-xs shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#f0eded]">
              <div>
                <h3 className="text-lg font-bold text-[#002c11] font-heading flex items-center gap-2">
                  <User className="w-5 h-5 text-[#1b6d24]" />
                  <span>Personal Account &amp; Profile Preferences</span>
                </h3>
                <p className="text-xs text-[#717970] mt-0.5">
                  Update your contact info and primary delivery region across Bangladesh.
                </p>
              </div>
              <span className="text-[11px] text-stone-500 font-medium">
                Changes persist immediately to your Firebase account.
              </span>
            </div>

            {savedSettingsMsg && (
              <div className="p-3.5 bg-emerald-50 text-[#1b6d24] rounded-2xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{savedSettingsMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfileSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Full / Display Name *</label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Your legal or preferred name"
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-2.5 outline-none focus:border-[#1b6d24] font-medium text-[#002c11]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Mobile Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+880 1712-345678"
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-2.5 outline-none focus:border-[#1b6d24] font-medium text-[#002c11]"
                  />
                </div>
              </div>

              {/* Bangladesh Geographic Hierarchy Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Division *</label>
                  <select
                    value={editDivision}
                    onChange={(e) => {
                      const div = e.target.value;
                      const dists = ALL_64_DISTRICTS.filter((d) => d.division.toLowerCase() === div.toLowerCase());
                      const firstDist = dists[0]?.name || 'Dhaka';
                      setEditDivision(div);
                      setEditDistrict(firstDist);
                      setEditUpazila(getUpazilasForDistrict(firstDist)[0] || 'Sadar');
                    }}
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-2.5 outline-none focus:border-[#1b6d24] font-medium text-[#002c11]"
                  >
                    {BANGLADESH_DIVISIONS.map((div) => (
                      <option key={div.id} value={div.name}>{div.name} Division</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#002c11] mb-1">District *</label>
                  <select
                    value={editDistrict}
                    onChange={(e) => {
                      const dist = e.target.value;
                      setEditDistrict(dist);
                      setEditUpazila(getUpazilasForDistrict(dist)[0] || 'Sadar');
                    }}
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-2.5 outline-none focus:border-[#1b6d24] font-medium text-[#002c11]"
                  >
                    {availableDistrictsForSettings.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Upazila / Thana *</label>
                  <select
                    value={editUpazila}
                    onChange={(e) => setEditUpazila(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-2.5 outline-none focus:border-[#1b6d24] font-medium text-[#002c11]"
                  >
                    {availableUpazilasForSettings.map((up) => (
                      <option key={up} value={up}>{up}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#002c11] mb-1">Street Address / Area *</label>
                  <input
                    type="text"
                    required
                    value={editStreetAddress}
                    onChange={(e) => setEditStreetAddress(e.target.value)}
                    placeholder="House, Road, Area, Landmark"
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-2.5 outline-none focus:border-[#1b6d24] font-medium text-[#002c11]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#002c11] mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    placeholder="e.g. 1205"
                    className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-2.5 outline-none focus:border-[#1b6d24] font-medium text-[#002c11]"
                  />
                </div>
              </div>

              {/* Read-Only System Security Fields */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-1.5 text-stone-600 font-bold">
                  <Key className="w-4 h-4 text-stone-500" />
                  <span>Account Security &amp; Privileged Credentials (Read-Only)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="block text-stone-500 font-semibold mb-0.5">Email (Account Primary)</label>
                    <input
                      type="email"
                      disabled
                      value={userProfile?.email || currentUser?.email || ''}
                      className="w-full bg-stone-200/70 border border-stone-300 rounded-lg p-2 text-stone-700 cursor-not-allowed font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 font-semibold mb-0.5">Assigned Marketplace Role</label>
                    <input
                      type="text"
                      disabled
                      value={`Customer (${userProfile?.role || 'customer'})`}
                      className="w-full bg-stone-200/70 border border-stone-300 rounded-lg p-2 text-stone-700 cursor-not-allowed font-medium capitalize"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-stone-500">
                  Role, verification status, and administrative privileges are locked to protect marketplace integrity.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Change Profile Photo</span>
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#1b6d24] hover:bg-[#002c11] text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>

            {/* Password & Security Section */}
            <div className="pt-6 border-t border-[#f0eded] space-y-4">
              <div>
                <h4 className="font-bold text-[#002c11] text-base">Password &amp; Security</h4>
                <p className="text-xs text-[#717970] mt-1">
                  Keep your SUNNO account protected. You can change your password directly or request a secure email reset link.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="px-5 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">lock_reset</span>
                  Change Password Now
                </button>

                <button
                  type="button"
                  onClick={handleTriggerPasswordReset}
                  className="px-4 py-2.5 bg-[#f0eded] hover:bg-[#e0dede] text-[#002c11] text-xs font-bold rounded-xl border border-[#c1c9be]/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">mail</span>
                  Send Reset Link via Email
                </button>
              </div>
            </div>

            {/* Active Session Details Card */}
            <div className="pt-6 border-t border-[#f0eded] space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#1b6d24]" />
                <h4 className="font-bold text-[#002c11] text-sm">Active Session Details</h4>
              </div>
              <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-500 font-semibold block text-[11px]">Authentication Provider</span>
                  <p className="font-bold text-[#002c11] capitalize">
                    {currentUser?.providerData?.[0]?.providerId === 'google.com' ? 'Google OAuth 2.0' : 'Firebase Password Auth'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500 font-semibold block text-[11px]">User UID (Secure Identifier)</span>
                  <p className="font-mono text-[11px] text-stone-700 truncate">{currentUser?.uid || userProfile?.id}</p>
                </div>
                <div>
                  <span className="text-stone-500 font-semibold block text-[11px]">Account Created</span>
                  <p className="text-stone-700">
                    {currentUser?.metadata?.creationTime || (userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleString() : 'Recent')}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500 font-semibold block text-[11px]">Last Sign-in</span>
                  <p className="text-stone-700">
                    {currentUser?.metadata?.lastSignInTime || new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Danger Zone: Account Deletion Request */}
            <div className="pt-6 border-t border-red-200 space-y-3">
              <div className="flex items-center gap-2 text-red-700">
                <Trash2 className="w-4 h-4" />
                <h4 className="font-bold text-sm">Danger Zone: Account Deletion Request</h4>
              </div>
              <p className="text-xs text-stone-600">
                Requesting account deletion will flag your account for data sanitization and log you out immediately. To comply with Bangladeshi trade and tax regulations, completed artisan transaction invoices are retained for audit.
              </p>

              {userProfile?.deletionRequested ? (
                <div className="p-3.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Deletion Request In Progress</span>
                  </div>
                  <p className="text-[11px]">
                    Requested on {userProfile.deletionRequestedAt ? new Date(userProfile.deletionRequestedAt).toLocaleDateString('en-GB') : 'recently'}. Reason: {userProfile.deletionReason || 'Customer requested account closure'}.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Request Account Deletion</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODALS ----------------- */}

      {/* 1. Return Request Creation Modal */}
      {selectedOrderForReturn && (
        <ReturnRequestModal
          order={selectedOrderForReturn.order}
          productId={selectedOrderForReturn.productId}
          onClose={() => setSelectedOrderForReturn(null)}
          actor={actor}
          onReturnCreated={(newRet) => {
            setSelectedOrderForReturn(null);
            setCustomerReturns((prev) => [newRet, ...prev]);
            setActiveSubTab('returns');
          }}
        />
      )}

      {/* 2. Return Details & Audit Trail Modal */}
      {selectedReturnDetails && (
        <ReturnDetailsModal
          returnRequest={selectedReturnDetails}
          onClose={() => setSelectedReturnDetails(null)}
          actor={actor}
          onReturnUpdated={(updated) => {
            setSelectedReturnDetails(updated);
            setCustomerReturns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          }}
        />
      )}

      {/* 3. Product Review Modal */}
      {selectedProductForReview && (
        <ProductReviewModal
          product={selectedProductForReview.product}
          order={selectedProductForReview.order}
          existingReview={selectedProductForReview.existingReview}
          onClose={() => setSelectedProductForReview(null)}
          actor={actor}
          onReviewSubmitted={(newRev) => {
            setSelectedProductForReview(null);
            setCustomerReviews((prev) => {
              const idx = prev.findIndex((r) => r.id === newRev.id);
              if (idx >= 0) {
                const clone = [...prev];
                clone[idx] = newRev;
                return clone;
              }
              return [newRev, ...prev];
            });
          }}
        />
      )}

      {/* 4. Direct Artisan Chat Modal */}
      {directChatTarget && (
        <DirectChatModal
          recipientId={directChatTarget.sellerId}
          recipientName={directChatTarget.sellerName}
          storeName={directChatTarget.storeName}
          productId={directChatTarget.productId}
          productTitle={directChatTarget.productTitle}
          productImage={directChatTarget.productImage}
          orderId={directChatTarget.orderId}
          orderNumber={directChatTarget.orderNumber}
          onClose={() => setDirectChatTarget(null)}
          actor={actor}
        />
      )}

      {/* 5. Support Ticket Creation Modal */}
      {isSupportModalOpen && (
        <SupportTicketModal
          relatedOrderId={supportModalOrder?.id}
          relatedOrderNumber={supportModalOrder?.orderNumber || supportModalOrder?.id}
          onClose={() => {
            setIsSupportModalOpen(false);
            setSupportModalOrder(null);
          }}
          actor={actor}
          onTicketCreated={(newTicket) => {
            setIsSupportModalOpen(false);
            setSupportModalOrder(null);
            setTickets((prev) => [newTicket, ...prev]);
            setActiveSubTab('support');
          }}
        />
      )}

      {/* 6. Live Consignment Tracking Modal */}
      {activeTrackingShipment && (
        <TrackingModal
          shipment={activeTrackingShipment}
          onClose={() => setActiveTrackingShipment(null)}
          canManageStatus={false}
          onViewInvoice={async () => {
            const inv = await getOfficialInvoiceForOrder(activeTrackingShipment.orderId);
            if (inv) {
              setActiveInvoice(inv);
              setActiveTrackingShipment(null);
            }
          }}
        />
      )}

      {/* 7. Official Tax Invoice Modal */}
      {activeInvoice && (
        <InvoiceModal
          invoice={activeInvoice}
          onClose={() => setActiveInvoice(null)}
        />
      )}

      {/* 8. Order Cancellation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">cancel</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#002c11] font-heading">
                    Cancel Order #{orderToCancel.id}
                  </h3>
                  <p className="text-xs text-stone-500">
                    ৳{orderToCancel.finalTotal || orderToCancel.total} • {orderToCancel.items?.length || 0} craft items
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOrderToCancel(null)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {cancelError && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{cancelError}</span>
              </div>
            )}

            <div className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  Reason for Cancellation *
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1b6d24] font-medium"
                >
                  {CANCELLATION_REASONS_CUSTOMER.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Share any details for the artisan or customer support..."
                  className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-3 outline-none focus:border-[#1b6d24]"
                />
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Restock &amp; Refund Policy</span>
                </div>
                <p>
                  Cancelling will immediately return reserved craft inventory back to the artisan catalog. If you paid online via bKash/Card, a full refund will be initiated to your source account.
                </p>
              </div>

              <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cancelConfirm}
                  onChange={(e) => setCancelConfirm(e.target.checked)}
                  className="mt-0.5 rounded text-[#1b6d24] focus:ring-[#1b6d24]"
                />
                <span className="text-stone-700 leading-tight">
                  I confirm that I want to cancel this order and release the items back to inventory.
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setOrderToCancel(null)}
                  disabled={isCancelling}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-colors"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={!cancelConfirm || isCancelling}
                  className={`px-5 py-2.5 rounded-xl font-bold text-white transition-all flex items-center gap-2 ${
                    !cancelConfirm || isCancelling
                      ? 'bg-red-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 shadow-md cursor-pointer'
                  }`}
                >
                  {isCancelling ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      <span>Confirm Cancellation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 9. Avatar Selection Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#1b6d24]" />
                <h3 className="font-bold text-base text-[#002c11] font-heading">
                  Choose Profile Avatar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-stone-600">
                Choose one of our handcrafted Bangladeshi eco avatars or paste a custom image URL:
              </p>

              {/* Preset Avatars Grid */}
              <div className="grid grid-cols-3 gap-3">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectAvatar(preset.url)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-emerald-50 border border-stone-200 hover:border-[#1b6d24] transition-all group cursor-pointer"
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-14 h-14 rounded-xl object-cover shadow-xs group-hover:scale-105 transition-transform"
                    />
                    <span className="text-[10px] font-semibold text-stone-700 text-center leading-tight">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Image URL Option */}
              <div className="pt-2 border-t border-stone-100">
                <label className="block font-bold text-stone-700 mb-1">Or paste custom image URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 bg-[#fbf9f8] border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#1b6d24]"
                  />
                  <button
                    type="button"
                    disabled={!customAvatarUrl.trim()}
                    onClick={() => {
                      if (customAvatarUrl.trim()) {
                        handleSelectAvatar(customAvatarUrl.trim());
                        setCustomAvatarUrl('');
                      }
                    }}
                    className="px-3.5 py-2 bg-[#1b6d24] hover:bg-[#002c11] disabled:opacity-40 text-white font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. Account Deletion Request Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2 text-red-700">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base font-heading">
                  Request Account Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteReason('');
                  setDeleteConfirmText('');
                }}
                className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-2xl text-[11px] leading-relaxed">
                <strong>Warning:</strong> Submitting this request will flag your account for data sanitization and log you out immediately. Completed artisan orders and taxation invoices are preserved for bookkeeping.
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Reason for leaving (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Tell us what we could improve..."
                  className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-2.5 outline-none focus:border-red-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Type <span className="font-mono text-red-700 font-extrabold">DELETE</span> to confirm *
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full bg-[#fbf9f8] border border-stone-200 rounded-xl p-2.5 outline-none focus:border-red-600 font-mono text-xs text-red-700 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteReason('');
                    setDeleteConfirmText('');
                  }}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAccountDeletion}
                  disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeletingAccount}
                  className={`px-5 py-2 rounded-xl font-bold text-white transition-all ${
                    deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeletingAccount
                      ? 'bg-red-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 shadow-md cursor-pointer'
                  }`}
                >
                  {isDeletingAccount ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
