import React from 'react';
import { PriceChangeAlert, Product } from '../../types';
import { Sparkles, TrendingDown, TrendingUp, X, ArrowRight } from 'lucide-react';

interface PriceChangeAlertBannerProps {
  alerts: PriceChangeAlert[];
  onSelectProduct: (productId: string) => void;
  onDismiss: () => void;
}

export const PriceChangeAlertBanner: React.FC<PriceChangeAlertBannerProps> = ({
  alerts,
  onSelectProduct,
  onDismiss,
}) => {
  if (!alerts || alerts.length === 0) return null;

  const firstAlert = alerts[0];
  const isDrop = firstAlert.direction === 'dropped';

  return (
    <div className="bg-[#f0f9f0] border-y sm:border sm:rounded-2xl border-[#1b6d24]/30 p-3.5 sm:p-4 mb-6 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isDrop ? 'bg-[#dbf5dc] text-[#1b6d24]' : 'bg-[#ffdad6] text-[#ba1a1a]'
            }`}
          >
            {isDrop ? (
              <TrendingDown className="w-5 h-5" />
            ) : (
              <TrendingUp className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#002c11]">
                {isDrop ? '🎉 Price Drop Alert on Saved Item!' : 'Price Update on Saved Item'}
              </span>
              <span className="text-[10px] bg-[#1b6d24] text-white px-2 py-0.5 rounded-full font-bold">
                {firstAlert.percentageChange}% {isDrop ? 'OFF' : 'Changed'}
              </span>
            </div>
            <p className="text-xs text-[#414941] mt-0.5">
              <span className="font-semibold text-[#002c11]">{firstAlert.productTitle}</span> is now{' '}
              <span className="font-mono font-bold text-[#002c11]">৳{firstAlert.currentPrice}</span>{' '}
              (previously ৳{firstAlert.oldPrice}).
              {alerts.length > 1 && (
                <span className="text-[#717970] ml-1">
                  +{alerts.length - 1} other saved item{alerts.length > 2 ? 's' : ''} updated.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onSelectProduct(firstAlert.productId)}
            className="text-xs font-bold bg-[#002c11] text-white hover:bg-[#1b6d24] px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
          >
            <span>View Item</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-full text-[#717970] hover:bg-[#e7e8e7] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
