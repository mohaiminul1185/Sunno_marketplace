import React, { useState } from 'react';
import { Product, ProductReview } from '../../types';
import { Star, MessageSquare, ShieldCheck, CheckCircle, CornerDownRight, Send } from 'lucide-react';
import { updateProductInDb } from '../../services/dbService';

interface SellerReviewsTabProps {
  products: Product[];
  storeName: string;
  onRefreshProducts?: () => void;
}

export const SellerReviewsTab: React.FC<SellerReviewsTabProps> = ({
  products,
  storeName,
  onRefreshProducts,
}) => {
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Extract all reviews across seller's products
  const allReviewsWithProduct: { review: ProductReview; product: Product }[] = [];
  products.forEach((p) => {
    if (p.reviews && p.reviews.length > 0) {
      p.reviews.forEach((r) => {
        allReviewsWithProduct.push({ review: r, product: p });
      });
    }
  });

  // Calculate overall metrics
  const totalReviews = allReviewsWithProduct.length;
  const averageRating =
    totalReviews > 0
      ? (
          allReviewsWithProduct.reduce((acc, curr) => acc + (curr.review.rating || 5), 0) /
          totalReviews
        ).toFixed(1)
      : '5.0';

  const starCounts = {
    5: allReviewsWithProduct.filter((r) => r.review.rating === 5).length,
    4: allReviewsWithProduct.filter((r) => r.review.rating === 4).length,
    3: allReviewsWithProduct.filter((r) => r.review.rating === 3).length,
    2: allReviewsWithProduct.filter((r) => r.review.rating === 2).length,
    1: allReviewsWithProduct.filter((r) => r.review.rating === 1).length,
  };

  const filteredReviews = allReviewsWithProduct.filter((item) => {
    if (starFilter === 'all') return true;
    return item.review.rating === starFilter;
  });

  const handleSendReply = async (product: Product, reviewId: string) => {
    if (!replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const updatedReviews = (product.reviews || []).map((r) => {
        if (r.id === reviewId) {
          return {
            ...r,
            sellerResponse: {
              text: replyText.trim(),
              respondedAt: new Date().toISOString(),
              respondedBy: storeName,
              sellerStoreName: storeName,
            },
          };
        }
        return r;
      });

      await updateProductInDb(product.id, {
        reviews: updatedReviews,
      });

      setReplyingReviewId(null);
      setReplyText('');
      if (onRefreshProducts) onRefreshProducts();
    } catch (err) {
      console.error('Failed to post seller response:', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
          Store Ratings & Customer Reviews
        </h1>
        <p className="text-xs text-[#414941] mt-0.5">
          Real feedback from verified buyers across Bangladesh. Maintaining a 4.5+ rating earns the SUNNO Top Artisan badge.
        </p>
      </div>

      {/* Ratings Summary Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-xs flex flex-col md:flex-row items-center gap-8">
        <div className="text-center md:text-left shrink-0">
          <div className="text-5xl font-extrabold text-[#002c11] font-heading flex items-center justify-center md:justify-start gap-2">
            <span>{averageRating}</span>
            <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-xs text-[#717970] mt-1 font-bold">
            Based on {totalReviews} verified reviews
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>SUNNO Verified Artisan</span>
          </div>
        </div>

        {/* Rating Bars */}
        <div className="flex-1 w-full space-y-1.5 max-w-md">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = (starCounts as any)[stars] || 0;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-2 text-xs">
                <span className="w-12 font-bold text-[#414941] flex items-center gap-0.5">
                  {stars} <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                </span>
                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-[11px] text-[#717970]">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Star filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStarFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            starFilter === 'all'
              ? 'bg-[#002c11] text-[#a0f399]'
              : 'bg-white border border-[#c1c9be]/60 text-[#414941] hover:bg-stone-100'
          }`}
        >
          All Reviews ({totalReviews})
        </button>
        {[5, 4, 3, 2, 1].map((s) => (
          <button
            key={s}
            onClick={() => setStarFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              starFilter === s
                ? 'bg-[#002c11] text-[#a0f399]'
                : 'bg-white border border-[#c1c9be]/60 text-[#414941] hover:bg-stone-100'
            }`}
          >
            <span>{s}</span>
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>({(starCounts as any)[s] || 0})</span>
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#c1c9be]/60 p-12 text-center text-xs text-[#717970] space-y-2">
            <Star className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-[#002c11]">No reviews in this rating category</p>
            <p className="text-[11px]">Reviews submitted by customers will show here along with verified badges.</p>
          </div>
        ) : (
          filteredReviews.map(({ review, product }) => (
            <div
              key={review.id}
              className="bg-white rounded-3xl border border-[#c1c9be]/60 p-5 shadow-xs space-y-4"
            >
              {/* Review Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#f0eded]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-xs text-[#1b6d24]">
                    {review.customerName ? review.customerName.charAt(0).toUpperCase() : 'B'}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#002c11] flex items-center gap-2">
                      <span>{review.customerName || 'Conscious Buyer'}</span>
                      {review.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 bg-emerald-50 text-emerald-800 rounded-md text-[10px] font-bold">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Verified Buyer
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-[#717970] font-mono">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < (review.rating || 5)
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-stone-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Product snippet */}
              <div className="flex items-center gap-2 p-2 bg-[#fbf9f8] rounded-xl text-xs">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-10 h-10 object-cover rounded-lg border border-[#c1c9be]/40 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-[#002c11] truncate">{product.title}</p>
                  <p className="text-[10px] text-[#717970]">{product.category} • SKU: {product.sku}</p>
                </div>
              </div>

              {/* Comment text */}
              <div className="space-y-1">
                {review.title && <h5 className="font-bold text-xs text-[#002c11]">{review.title}</h5>}
                <p className="text-xs text-[#414941] leading-relaxed">{review.comment}</p>
              </div>

              {/* Photos if any */}
              {review.photos && review.photos.length > 0 && (
                <div className="flex gap-2">
                  {review.photos.map((ph, idx) => (
                    <img
                      key={idx}
                      src={ph}
                      alt="Customer review photo"
                      className="w-16 h-16 object-cover rounded-xl border border-[#c1c9be]/60"
                    />
                  ))}
                </div>
              )}

              {/* Existing Seller Response */}
              {review.sellerResponse && (
                <div className="ml-4 pl-4 border-l-2 border-[#1b6d24] bg-[#e8f5e9]/40 p-3 rounded-r-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1 text-[#1b6d24] font-bold">
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Response from {review.sellerResponse.sellerStoreName || storeName}:</span>
                  </div>
                  <p className="text-[#002c11]">{review.sellerResponse.text}</p>
                </div>
              )}

              {/* Reply Form */}
              {!review.sellerResponse && (
                <div>
                  {replyingReviewId === review.id ? (
                    <div className="space-y-2 pt-2">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a courteous artisan response to this customer..."
                        className="w-full p-3 bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl text-xs outline-none focus:border-[#1b6d24]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingReviewId(null);
                            setReplyText('');
                          }}
                          className="px-3 py-1.5 text-xs text-[#717970] hover:text-black font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!replyText.trim() || isSubmittingReply}
                          onClick={() => handleSendReply(product, review.id)}
                          className="px-4 py-1.5 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Publish Response</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingReviewId(review.id);
                        setReplyText('');
                      }}
                      className="text-xs font-bold text-[#1b6d24] hover:underline flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Reply to this Review</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
