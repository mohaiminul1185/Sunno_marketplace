import React from 'react';
import { ActiveTab, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

interface ForbiddenViewProps {
  attemptedPath?: string;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAdminLogin?: () => void;
  onOpenBecomeSeller?: () => void;
}

export const ForbiddenView: React.FC<ForbiddenViewProps> = ({
  attemptedPath = '/admin',
  setActiveTab,
  onOpenAdminLogin,
  onOpenBecomeSeller,
}) => {
  const { role, userProfile } = useAuth();
  const isSellerRoute = attemptedPath.includes('seller');

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#fbf9f8]">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-red-200 shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden">
        {/* Top security banner stripe */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600" />

        {/* Security Badge Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-6 shadow-inner">
          <span className="material-symbols-outlined text-4xl">
            {isSellerRoute ? 'storefront' : 'gshield'}
          </span>
        </div>

        {/* Error Code & Title */}
        <div className="inline-block px-3 py-1 bg-red-100/80 text-red-800 text-xs font-mono font-bold rounded-full mb-3 uppercase tracking-wider">
          HTTP 403 • ACCESS RESTRICTED
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1b1c1c] font-heading tracking-tight mb-3">
          {isSellerRoute ? 'Artisan / Seller Account Required' : 'Access Denied / Unauthorized'}
        </h1>

        <p className="text-sm text-[#414941] leading-relaxed mb-6">
          {isSellerRoute ? (
            <>
              You are currently logged in as a{' '}
              <strong className="text-[#002c11] uppercase">{role}</strong>. The route{' '}
              <code className="bg-[#f0eded] text-red-700 px-2 py-0.5 rounded font-mono text-xs font-semibold">
                {attemptedPath}
              </code>{' '}
              is reserved for registered Bangladeshi artisans and cooperative store managers.
            </>
          ) : (
            <>
              You do not have administrative privileges to access the requested route{' '}
              <code className="bg-[#f0eded] text-red-700 px-2 py-0.5 rounded font-mono text-xs font-semibold">
                {attemptedPath}
              </code>
              . This endpoint is strictly restricted to authenticated{' '}
              <strong className="text-[#002c11]">SUNNO Platform Administrators</strong>.
            </>
          )}
        </p>

        {/* Security Audit Note Box */}
        <div className="bg-[#f7f9f7] rounded-2xl border border-[#c1c9be]/60 p-4 text-left text-xs text-[#555e54] mb-8 space-y-1.5">
          <div className="flex items-center justify-between text-[#1b1c1c] font-semibold pb-1 border-b border-[#e1e5e0]">
            <span className="flex items-center gap-1.5 text-xs text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Security Audit Event
            </span>
            <span className="font-mono text-[11px] text-[#717970]">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-[#717970]">Attempted Resource:</span>
            <span className="font-mono text-[#1b1c1c] font-medium">{attemptedPath}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#717970]">Authenticated User:</span>
            <span className="font-medium text-[#1b1c1c]">
              {userProfile?.displayName || userProfile?.email || 'Anonymous Visitor'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#717970]">Assigned Role:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-100 text-amber-900">
              {role}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#717970]">Authorization Status:</span>
            <span className="text-red-700 font-bold">REJECTED (Insufficient Privileges)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              window.location.hash = '#home';
              setActiveTab('home');
            }}
            className="px-6 py-3 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Return to Marketplace
          </button>

          {isSellerRoute ? (
            <button
              onClick={() => {
                if (onOpenBecomeSeller) {
                  onOpenBecomeSeller();
                } else {
                  window.location.hash = '#home';
                  setActiveTab('home');
                }
              }}
              className="px-6 py-3 bg-[#1b6d24] hover:bg-[#258d31] text-white text-xs font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">eco</span>
              Apply to Become a Seller
            </button>
          ) : (
            role !== 'admin' && (
              <button
                onClick={() => {
                  if (onOpenAdminLogin) {
                    onOpenAdminLogin();
                  } else {
                    window.location.hash = '#admin/login';
                    setActiveTab('admin_login');
                  }
                }}
                className="px-6 py-3 bg-white hover:bg-[#f0eded] text-[#002c11] border border-[#c1c9be] text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                Admin Login Portal
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
