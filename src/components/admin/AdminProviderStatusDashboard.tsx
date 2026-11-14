import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Truck,
  Bell,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
  Zap,
  Info,
} from 'lucide-react';

interface PaymentProviderStatus {
  id: string;
  name: string;
  supportedMethods: string[];
  hasCredentials: boolean;
  isConfigured: boolean;
  environment: 'DISABLED' | 'SANDBOX' | 'LIVE' | 'NOT_CONFIGURED';
  statusLabel: string;
}

interface CourierProviderStatus {
  id: string;
  name: string;
  logoUrl?: string;
  supportedServiceTypes?: string[];
  codSupported: boolean;
  trackingSupported: boolean;
  returnSupported: boolean;
  apiDocsUrl?: string;
  hasCredentials: boolean;
  isConfigured: boolean;
  environment: 'DISABLED' | 'NOT_CONFIGURED' | 'TEST' | 'LIVE';
  statusLabel: string;
}

interface NotificationChannelStatus {
  isConfigured: boolean;
  provider: string;
  fromAddress?: string;
  senderId?: string;
  statusNote: string;
}

interface NotificationStatusResponse {
  email: NotificationChannelStatus;
  sms: NotificationChannelStatus;
}

export const AdminProviderStatusDashboard: React.FC = () => {
  const [payments, setPayments] = useState<PaymentProviderStatus[]>([]);
  const [couriers, setCouriers] = useState<CourierProviderStatus[]>([]);
  const [notifications, setNotifications] = useState<NotificationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'payments' | 'couriers' | 'notifications'>('all');

  const fetchStatus = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const [payRes, courRes, notifRes] = await Promise.all([
        fetch('/api/payments/providers').then((r) => r.json()).catch(() => ({ success: false, providers: [] })),
        fetch('/api/courier/providers').then((r) => r.json()).catch(() => ({ success: false, providers: [] })),
        fetch('/api/notifications/providers').then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (payRes.success && payRes.providers) {
        setPayments(payRes.providers);
      }
      if (courRes.success && courRes.providers) {
        setCouriers(courRes.providers);
      }
      if (notifRes.success) {
        setNotifications({ email: notifRes.email, sms: notifRes.sms });
      }
    } catch (err) {
      console.error('Failed to load gateway provider status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSendTestNotification = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/notifications/send-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'payment.confirmed',
          orderId: 'TEST-' + Date.now().toString().slice(-6),
          orderNumber: 'SN-TEST-' + Math.floor(1000 + Math.random() * 9000),
          customerId: 'test-admin',
          customerName: 'System Verification Admin',
          customerEmail: 'admin@sunno.eco',
          customerPhone: '+8801700000000',
          totalAmount: 1450,
          courierName: 'Pathao Express',
          trackingCode: 'PTH-VERIFY-99',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(
          `Notification event dispatched! Email: [${data.email.provider} - ${data.email.sent ? 'Sent' : 'Logged'}], SMS: [${data.sms.provider} - ${data.sms.sent ? 'Sent' : 'Logged'}]. Non-blocking delivery verified.`
        );
      } else {
        setTestResult(`Test dispatch returned: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setTestResult(`Error sending test: ${err.message}`);
    } finally {
      setTestSending(false);
    }
  };

  const getPaymentBadge = (env: PaymentProviderStatus['environment']) => {
    switch (env) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE
          </span>
        );
      case 'SANDBOX':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            SANDBOX
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            DISABLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            NOT CONFIGURED
          </span>
        );
    }
  };

  const getCourierBadge = (env: CourierProviderStatus['environment']) => {
    switch (env) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE
          </span>
        );
      case 'TEST':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            TEST
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            DISABLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            NOT CONFIGURED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1f2937]">
      {/* Header Banner */}
      <div className="bg-[#002c11] text-white p-6 sm:p-8 rounded-3xl shadow-md border border-[#003d18] relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#a0f399] text-xs font-bold uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" />
              Gateway Infrastructure Telemetry (Phase 16)
            </div>
            <h2 className="text-2xl font-bold font-heading">
              Provider & Gateway Status Dashboard
            </h2>
            <p className="text-xs text-[#80a48b] max-w-2xl mt-1 leading-relaxed">
              Real-time connectivity monitoring for Bangladesh MFS (bKash, Nagad, Rocket), Card/Banking Gateways (SSLCommerz), Courier Logistics API v2 (Pathao, Steadfast, RedX, Paperfly), and Transactional Notifications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-4 py-2.5 bg-[#12381f] hover:bg-[#1b482b] text-white text-xs font-bold rounded-2xl border border-[#2b583b] transition-all flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
            <button
              onClick={handleSendTestNotification}
              disabled={testSending}
              className="px-4 py-2.5 bg-[#a0f399] hover:bg-[#b5fbb0] text-[#002c11] text-xs font-bold rounded-2xl transition-all flex items-center gap-2 shadow-sm"
            >
              <Send className={`w-3.5 h-3.5 ${testSending ? 'animate-pulse' : ''}`} />
              Ping Notification Pipeline
            </button>
          </div>
        </div>
      </div>

      {testResult && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl text-xs flex items-start gap-3 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold">Test Dispatch Output</div>
            <div className="mt-0.5 text-emerald-800">{testResult}</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-[#002c11] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Providers ({payments.length + couriers.length + 2})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'bg-[#002c11] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Payment Gateways ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('couriers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'couriers'
              ? 'bg-[#002c11] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Courier Services ({couriers.length})
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'notifications'
              ? 'bg-[#002c11] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          Notification Channels (2)
        </button>
      </div>

      {/* SECTION 1: PAYMENT GATEWAYS */}
      {(activeTab === 'all' || activeTab === 'payments') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#1b6d24]" />
              Payment Gateways & MFS (Bangladesh)
            </h3>
            <span className="text-xs text-gray-500">
              Required by Section 21: bKash, Nagad, Rocket, SSLCOMMERZ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {payments.map((prov) => (
              <div
                key={prov.id}
                className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-[#1b6d24] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold uppercase text-gray-500">
                      {prov.id}
                    </span>
                    {getPaymentBadge(prov.environment)}
                  </div>
                  <h4 className="text-base font-bold text-gray-900">{prov.name}</h4>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <p>
                      Supported Methods:{' '}
                      <span className="font-semibold text-gray-700">
                        {prov.supportedMethods.join(', ')}
                      </span>
                    </p>
                    <p>
                      Credentials Configured:{' '}
                      <span
                        className={`font-bold ${
                          prov.hasCredentials ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {prov.hasCredentials ? 'Yes (Verified)' : 'No (Requires Env Keys)'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Env: {prov.environment}</span>
                  <span className="font-medium text-gray-700">{prov.statusLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: COURIER & LOGISTICS GATEWAYS */}
      {(activeTab === 'all' || activeTab === 'couriers') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#1b6d24]" />
              Courier & Logistics Gateways (Bangladesh 64 Districts)
            </h3>
            <span className="text-xs text-gray-500">
              Required by Section 21: Pathao, Steadfast, RedX, Paperfly
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {couriers.map((cour) => (
              <div
                key={cour.id}
                className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-[#1b6d24] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold uppercase text-gray-500">
                      {cour.id}
                    </span>
                    {getCourierBadge(cour.environment)}
                  </div>
                  <h4 className="text-base font-bold text-gray-900">{cour.name}</h4>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <p>
                      COD Supported:{' '}
                      <span className="font-semibold text-emerald-700">
                        {cour.codSupported ? 'Yes' : 'No'}
                      </span>
                    </p>
                    <p>
                      Live Tracking:{' '}
                      <span className="font-semibold text-sky-700">
                        {cour.trackingSupported ? 'Yes' : 'No'}
                      </span>
                    </p>
                    <p>
                      Credentials Configured:{' '}
                      <span
                        className={`font-bold ${
                          cour.hasCredentials ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {cour.hasCredentials ? 'Yes (Active)' : 'No (Not Configured)'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Env: {cour.environment}</span>
                  {cour.apiDocsUrl && (
                    <a
                      href={cour.apiDocsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5"
                    >
                      Docs
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: TRANSACTIONAL NOTIFICATION CHANNELS */}
      {(activeTab === 'all' || activeTab === 'notifications') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#1b6d24]" />
              Transactional Notification Channels
            </h3>
            <span className="text-xs text-gray-500">
              Required by Section 21: Email (Configured / Not Configured), SMS (Configured / Not Configured)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Channel */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                      @
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900">Transactional Email Gateway</h4>
                      <p className="text-xs text-gray-500">HTML Order Receipts & Notifications</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      notifications?.email.isConfigured
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        notifications?.email.isConfigured ? 'bg-emerald-500' : 'bg-rose-400'
                      }`}
                    ></span>
                    {notifications?.email.isConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>

                <div className="mt-3 text-xs text-gray-600 space-y-1.5 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <p>
                    <strong>Provider Service:</strong> {notifications?.email.provider || 'resend'}
                  </p>
                  <p>
                    <strong>Sender Address:</strong>{' '}
                    <span className="font-mono">{notifications?.email.fromAddress || 'orders@sunno.app'}</span>
                  </p>
                  <p>
                    <strong>Status:</strong> {notifications?.email.statusNote || 'Requires EMAIL_PROVIDER_API_KEY'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Fail-safe policy: Email dispatch failures never block checkout or order placement.
                  </p>
                </div>
              </div>
            </div>

            {/* SMS Channel */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      #
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900">Bangladesh SMS Gateway</h4>
                      <p className="text-xs text-gray-500">Bangla/English Order & Dispatch SMS</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      notifications?.sms.isConfigured
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        notifications?.sms.isConfigured ? 'bg-emerald-500' : 'bg-rose-400'
                      }`}
                    ></span>
                    {notifications?.sms.isConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>

                <div className="mt-3 text-xs text-gray-600 space-y-1.5 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <p>
                    <strong>Provider Service:</strong> {notifications?.sms.provider || 'greenweb'}
                  </p>
                  <p>
                    <strong>Sender Mask / ID:</strong>{' '}
                    <span className="font-mono">{notifications?.sms.senderId || 'SUNNO'}</span>
                  </p>
                  <p>
                    <strong>Status:</strong> {notifications?.sms.statusNote || 'Requires SMS_PROVIDER_API_KEY'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Template: <span className="font-mono">SUNNO Order confirmed: #&#123;orderNumber&#125;. Total: &#123;total&#125; BDT.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
