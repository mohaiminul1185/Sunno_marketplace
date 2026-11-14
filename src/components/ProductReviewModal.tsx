import React, { useState } from 'react';
import { Product, Order, ProductReview } from '../types';
import { submitProductReview } from '../services/reviewService';
import { Star, CheckCircle, AlertTriangle, X, Image as ImageIcon, Sparkles, ShieldCheck } from 'lucide-react';

interface ProductReviewModalProps {
  product: { id: string; title: string; image?: string; sellerId?: string; sellerName?: string; price?: number };
  order: Order;
  existingReview?: ProductReview | null;
  onClose: () => void;
  onSuccess: (review: ProductReview) => void;
  actor: { id: string; name: string; email?: string; avatar?: string };
}

export const ProductReviewModal: React.FC<ProductReviewModalProps> = ({
  product,
  order,
  existingReview,
  onClose,
  onSuccess,
  actor,
}) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [qualityRating, setQualityRating] = useState<number>(existingReview?.productQualityRating || 5);
  const [packagingRating, setPackagingRating] = useState<number>(existingReview?.packagingRating || 5);
  const [deliveryRating, setDeliveryRating] = useState<number>(existingReview?.deliveryRating || 5);
  const [title, setTitle] = useState<string>(existingReview?.title || '');
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(existingReview?.photos || []);
  const [photoInputUrl, setPhotoInputUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleAddPhoto = () => {
    if (!photoInputUrl.trim()) return;
    if (photoUrls.length >= 4) {
      setErrorMsg('Maximum 4 photos allowed.');
      return;
    }
    setPhotoUrls([...photoUrls, photoInputUrl.trim()]);
    setPhotoInputUrl('');
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a review summary title.');
      return;
    }
    if (!comment.trim() || comment.length < 10) {
      setErrorMsg('Please write at least 10 characters in your detailed review.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const sellerId = product.sellerId || order.sellerIds?.[0] || 'artisan-coop';

      const result = await submitProductReview({
        productId: product.id,
        productTitle: product.title,
        productImage: product.image,
        orderId: order.id,
        orderNumber: order.orderNumber,
        sellerId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        productQualityRating: qualityRating,
        packagingRating: packagingRating,
        deliveryRating: deliveryRating,
        photos: photoUrls,
        actor,
        existingReviewId: existingReview?.id,
      });

      onSuccess(result);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="product-review-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div id="product-review-modal-content" className="bg-[#fbf9f8] w-full max-w-xl rounded-3xl border border-[#c1c9be]/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#c1c9be]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002c11]">
                {existingReview ? 'Update Your Review' : 'Verified Buyer Review'}
              </h3>
              <p className="text-xs text-[#717970]">
                Order #{order.orderNumber || order.id.slice(-8).toUpperCase()} • Delivered Craft
              </p>
            </div>
          </div>
          <button
            id="close-review-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f0eded] text-[#717970] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Header */}
          <div className="p-3.5 bg-white rounded-2xl border border-[#c1c9be]/30 flex items-center gap-3">
            <img
              src={product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=200'}
              alt={product.title}
              className="w-12 h-12 rounded-xl object-cover border border-[#c1c9be]/30"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-[#002c11] line-clamp-1">{product.title}</h4>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#1b6d24]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="font-semibold">Verified Eco Patron Purchase</span>
              </div>
            </div>
          </div>

          {/* Star Rating Selector */}
          <div className="bg-white p-4 rounded-2xl border border-[#c1c9be]/30 text-center space-y-2">
            <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider">
              Overall Craft Experience
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-[#e6a100] text-[#e6a100]'
                        : 'text-[#c1c9be]'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-[#002c11]">
              {rating === 5 && '🌟 Exceptional Craftsmanship'}
              {rating === 4 && '✨ High Quality & Mindful'}
              {rating === 3 && '👍 Good Product'}
              {rating === 2 && '⚠️ Needs Improvement'}
              {rating === 1 && '👎 Not Satisfied'}
            </span>
          </div>

          {/* Sub-Ratings Grid (Quality, Packaging, Delivery) */}
          <div className="bg-white p-4 rounded-2xl border border-[#c1c9be]/30 space-y-3">
            <h5 className="text-xs font-bold text-[#002c11] uppercase tracking-wider">
              Detailed Eco Ratings
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Product Quality */}
              <div>
                <label className="block text-[11px] text-[#717970] mb-1 font-medium">Handmade Quality</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setQualityRating(s)}>
                      <Star className={`w-4 h-4 ${qualityRating >= s ? 'fill-[#e6a100] text-[#e6a100]' : 'text-[#c1c9be]'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Eco Packaging */}
              <div>
                <label className="block text-[11px] text-[#717970] mb-1 font-medium">Plastic-Free Packaging</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setPackagingRating(s)}>
                      <Star className={`w-4 h-4 ${packagingRating >= s ? 'fill-[#1b6d24] text-[#1b6d24]' : 'text-[#c1c9be]'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Speed */}
              <div>
                <label className="block text-[11px] text-[#717970] mb-1 font-medium">Delivery Experience</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setDeliveryRating(s)}>
                      <Star className={`w-4 h-4 ${deliveryRating >= s ? 'fill-[#e6a100] text-[#e6a100]' : 'text-[#c1c9be]'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Title & Written Review */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1">
                Review Headline *
              </label>
              <input
                id="review-headline-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Authentic heritage texture, zero plastic wrapping!"
                className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1">
                Written Review *
              </label>
              <textarea
                id="review-comment-input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share details about the texture, sustainability, utility, and feel of this handmade craft..."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24] resize-none"
                required
              />
            </div>
          </div>

          {/* Photo Attachments */}
          <div>
            <label className="block text-xs font-bold text-[#002c11] uppercase tracking-wider mb-1.5">
              Add Photos (Optional)
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                id="review-photo-input"
                type="url"
                value={photoInputUrl}
                onChange={(e) => setPhotoInputUrl(e.target.value)}
                placeholder="Paste image URL..."
                className="flex-1 px-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="px-3 py-2 bg-[#e8f5e9] text-[#1b6d24] text-xs font-bold rounded-xl hover:bg-[#c8e6c9] transition-colors"
              >
                Add
              </button>
            </div>

            {photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photoUrls.map((url, idx) => (
                  <div key={idx} className="relative w-14 h-14 rounded-xl border border-[#c1c9be]/50 overflow-hidden">
                    <img src={url} alt="Review attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#c1c9be]/30 flex items-center justify-between">
            <button
              id="cancel-review-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#717970] hover:text-[#002c11] transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-product-review-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#002c11] text-[#a0f399] text-xs font-bold rounded-full hover:bg-[#003d18] transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-[#a0f399] border-t-transparent rounded-full animate-spin" />
                  <span>Publishing Review...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{existingReview ? 'Update Review' : 'Publish Verified Review'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
