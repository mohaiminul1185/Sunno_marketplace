import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Clock,
  ShieldCheck,
  Store,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  HelpCircle,
  LogOut,
  UserCheck,
  Sparkles,
  Layers,
} from 'lucide-react';

interface SellerPendingViewProps {
  onSwitchToCustomer?: () => void;
}

export const SellerPendingView: React.FC<SellerPendingViewProps> = ({ onSwitchToCustomer }) => {
  const { userProfile, logout, switchAccountMode } = useAuth();
  const seller = userProfile?.sellerProfile;
  const status = seller?.status || 'pending';

  const isRejected = status === 'rejected';
  const isSuspended = status === 'suspended' || status === 'banned';

  return (
    <div className="max-w-4xl mx-auto my-10 px-4 sm:px-6">
      {/* Status Card Header */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden ${
          isRejected
            ? 'bg-gradient-to-r from-red-900 via-red-800 to-rose-900'
            : isSuspended
            ? 'bg-gradient-to-r from-amber-950 via-amber-900 to-amber-800'
            : 'bg-gradient-to-r from-[#002c11] via-[#0b421d] to-[#1b6d24]'
        }`}
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold mb-3">
            {isRejected ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-red-300" />
                <span>Application Requires Revisions</span>
              </>
            ) : isSuspended ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                <span>Seller Account Suspended</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-[#a0f399]" />
                <span>Seller Application Under Review</span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {seller?.storeName || 'Artisan Workshop'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-2">
            {isRejected
              ? 'Your application could not be verified in its current state. Please review feedback below or contact the support desk.'
              : isSuspended
              ? 'Your store privileges are currently restricted. Please submit an appeal to reinstate your store.'
              : 'Our artisan onboarding team is auditing your store details, craft origins, and eco-standards.'}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Verification Checklist */}
        <div className="md:col-span-2 space-y-6">
          {/* Store Overview Snapshot */}
          <div className="bg-white rounded-3xl border border-[#c1c9be]/50 shadow-xs p-6">
            <h3 className="text-sm font-extrabold text-[#002c11] mb-4 flex items-center gap-2">
              <Store className="w-4 h-4 text-[#1b6d24]" />
              Application Record Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/30">
                <span className="text-[#717970] block mb-1">Registered Contact</span>
                <span className="font-bold text-[#002c11] block truncate">{seller?.fullName || userProfile?.displayName}</span>
                <span className="text-[11px] text-[#717970] font-mono">{seller?.phone || userProfile?.phone || 'No phone'}</span>
              </div>
              <div className="p-3 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/30">
                <span className="text-[#717970] block mb-1">Artisan Cluster</span>
                <span className="font-bold text-[#002c11] block">
                  {seller?.district || 'Dhaka'}, {seller?.division || 'Dhaka'}
                </span>
                <span className="text-[11px] text-[#1b6d24] font-semibold">Bangladesh</span>
              </div>
              <div className="p-3 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/30">
                <span className="text-[#717970] block mb-1">Craft Categories</span>
                <span className="font-bold text-[#002c11] block truncate">
                  {seller?.categories?.join(', ') || 'Handmade Crafts'}
                </span>
              </div>
              <div className="p-3 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/30">
                <span className="text-[#717970] block mb-1">Submission Timestamp</span>
                <span className="font-bold text-[#002c11] block">
                  {seller?.createdAt ? new Date(seller.createdAt).toLocaleDateString('en-GB') : 'Recent'}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Pipeline */}
          <div className="bg-white rounded-3xl border border-[#c1c9be]/50 shadow-xs p-6">
            <h3 className="text-sm font-extrabold text-[#002c11] mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1b6d24]" />
              Artisan Verification Milestones
            </h3>

            <div className="space-y-4">
              {[
                {
                  title: '1. Identity & NID / Cooperative Audit',
                  desc: 'Validation of national identification or trade license records.',
                  status: 'in_progress',
                },
                {
                  title: '2. Sustainable Materials Inspection',
                  desc: 'Ensuring products use 100% natural, biodegradable, or upcycled local fibers.',
                  status: 'in_progress',
                },
                {
                  title: '3. Fair Wage & Pricing Transparency',
                  desc: 'Checking that rural artisans receive direct ethical remuneration.',
                  status: 'pending',
                },
                {
                  title: '4. Zero-Plastic Packaging Onboarding',
                  desc: 'Receiving SUNNO eco-packaging dispatch guidelines & shipping barcodes.',
                  status: 'pending',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#fbf9f8] border border-[#c1c9be]/30 text-xs"
                >
                  <div className="mt-0.5">
                    {item.status === 'in_progress' ? (
                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[#f0eded] text-[#717970] flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-[#002c11]">{item.title}</h4>
                    <p className="text-[11px] text-[#717970] mt-0.5">{item.desc}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      item.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-[#f0eded] text-[#717970]'
                    }`}
                  >
                    {item.status === 'in_progress' ? 'Auditing' : 'Queued'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Support Desk & Account Controls */}
        <div className="space-y-6">
          {/* Artisan Support Desk */}
          <div className="bg-[#e8f5e9]/60 rounded-3xl border border-[#1b6d24]/20 p-6 text-xs text-[#002c11]">
            <h3 className="font-extrabold text-sm mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#1b6d24]" />
              Artisan Help & Appeals
            </h3>
            <p className="text-[#414941] leading-relaxed mb-4">
              Need to expedite your verification or provide additional cooperative documents? Reach our direct artisan relations team.
            </p>
            <div className="space-y-2 font-semibold">
              <div className="flex items-center gap-2 text-[#002c11]">
                <Phone className="w-3.5 h-3.5 text-[#1b6d24]" />
                <span>+880 9612-SUNNO (78666)</span>
              </div>
              <div className="flex items-center gap-2 text-[#002c11]">
                <Mail className="w-3.5 h-3.5 text-[#1b6d24]" />
                <span>artisan-verify@sunno.eco</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-3xl border border-[#c1c9be]/50 p-5 space-y-2 text-xs">
            <button
              onClick={() => {
                if (onSwitchToCustomer) onSwitchToCustomer();
                switchAccountMode('customer');
              }}
              className="w-full py-3 bg-[#f5f3f3] hover:bg-[#e8e6e6] text-[#002c11] font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Continue Shopping as Customer</span>
            </button>

            <button
              onClick={() => logout()}
              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
