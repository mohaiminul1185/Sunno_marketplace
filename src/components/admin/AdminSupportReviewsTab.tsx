import React, { useState, useEffect } from 'react';
import { Message, Review, Product } from '../../types';
import {
  fetchAllMessages,
  sendMessage,
  fetchAllReviews,
  updateReviewInDb,
  deleteReviewFromDb,
  fetchAllProducts,
} from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';

export const AdminSupportReviewsTab: React.FC<{ initialSubView?: 'support' | 'reviews' }> = ({
  initialSubView = 'support',
}) => {
  const { userProfile: currentAdmin } = useAuth();
  const [subView, setSubView] = useState<'support' | 'reviews'>(initialSubView);

  // Support State
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [supportFilter, setSupportFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviewSearch, setReviewSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [msgs, revs, prods] = await Promise.all([
          fetchAllMessages(),
          fetchAllReviews(),
          fetchAllProducts(),
        ]);
        setMessages(msgs);
        if (msgs.length > 0) setSelectedTicket(msgs[0]);
        setReviews(revs);
        setProducts(prods);
      } catch (err) {
        console.error('Error loading support and reviews:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Support Actions
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    try {
      await sendMessage({
        senderId: currentAdmin?.id || 'admin-01',
        senderName: 'SUNNO Admin Support',
        senderRole: 'admin',
        receiverId: selectedTicket.senderId,
        receiverName: selectedTicket.senderName,
        text: replyText.trim(),
        subject: `Re: ${selectedTicket.subject || 'Inquiry'}`,
        relatedEntityId: selectedTicket.relatedEntityId,
        relatedEntityType: selectedTicket.relatedEntityType,
      });
      setReplyText('');
      showToast('Support resolution message sent to user.');
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  };

  // Review Moderation Actions
  const handleToggleHideReview = async (review: Review) => {
    const newHidden = !review.flagged;
    await updateReviewInDb(review.id, { flagged: newHidden });
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, flagged: newHidden } : r)));
    showToast(newHidden ? 'Review hidden from marketplace.' : 'Review restored to marketplace.');
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to permanently remove this review?')) return;
    await deleteReviewFromDb(reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    showToast('Review permanently deleted.');
  };

  const filteredMessages = messages.filter((m) => {
    if (supportFilter === 'unread') return !m.read;
    if (supportFilter === 'read') return m.read;
    return true;
  });

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      (r.comment || '').toLowerCase().includes(reviewSearch.toLowerCase()) ||
      (r.userName || '').toLowerCase().includes(reviewSearch.toLowerCase()) ||
      (r.productId || '').toLowerCase().includes(reviewSearch.toLowerCase());
    
    if (ratingFilter === 'all') return matchesSearch;
    return matchesSearch && r.rating === Number(ratingFilter);
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#002c11] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-[#a0f399]/50">
          <span className="material-symbols-outlined text-[18px] text-[#a0f399]">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#c1c9be]/60 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#002c11] font-heading">
            Support Center & Review Moderation
          </h2>
          <p className="text-xs text-[#717970] mt-0.5">
            Resolve consumer and artisan inquiries, supervise ratings, and moderate verified buyer feedback.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#f0eded] p-1 rounded-2xl border border-[#c1c9be]/40">
          <button
            onClick={() => setSubView('support')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subView === 'support' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Support Tickets ({messages.length})
          </button>
          <button
            onClick={() => setSubView('reviews')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subView === 'reviews' ? 'bg-[#002c11] text-white shadow-sm' : 'text-[#414941] hover:text-[#002c11]'
            }`}
          >
            Review Moderation ({reviews.length})
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: SUPPORT TICKETS & MESSAGING */}
      {subView === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <div className="bg-white rounded-3xl p-5 border border-[#c1c9be]/60 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0eded]">
              <span className="text-xs font-bold text-[#002c11] uppercase tracking-wider">
                Active Inquiries
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSupportFilter('all')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                    supportFilter === 'all' ? 'bg-[#002c11] text-white' : 'text-[#717970]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSupportFilter('unread')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                    supportFilter === 'unread' ? 'bg-amber-600 text-white' : 'text-[#717970]'
                  }`}
                >
                  Unread
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#717970]">
                  No support inquiries in queue.
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedTicket(msg)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-xs ${
                      selectedTicket?.id === msg.id
                        ? 'bg-[#002c11] text-white border-[#002c11] shadow-md'
                        : 'bg-[#fbf9f8] hover:bg-[#f0eded] border-[#c1c9be]/30 text-[#002c11]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold truncate">{msg.senderName}</span>
                      <span className={`text-[10px] ${selectedTicket?.id === msg.id ? 'text-[#a0f399]' : 'text-[#717970]'}`}>
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="font-semibold text-[11px] mb-1 truncate">
                      {msg.subject || 'Marketplace Assistance'}
                    </div>
                    <p className={`line-clamp-2 text-[11px] ${selectedTicket?.id === msg.id ? 'text-zinc-300' : 'text-[#717970]'}`}>
                      {msg.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ticket Response Panel */}
          {selectedTicket ? (
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#c1c9be]/60 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between pb-4 border-b border-[#f0eded]">
                  <div>
                    <h3 className="text-base font-bold text-[#002c11] font-heading">
                      {selectedTicket.subject || 'Support Request'}
                    </h3>
                    <div className="text-xs text-[#717970] mt-0.5">
                      From: <strong>{selectedTicket.senderName}</strong> ({selectedTicket.senderRole || 'patron'}) • {new Date(selectedTicket.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                    Open Ticket
                  </span>
                </div>

                <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#c1c9be]/40 text-xs text-[#1b1c1c] leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.text}
                </div>
              </div>

              <form onSubmit={handleSendReply} className="space-y-3 pt-4 border-t border-[#f0eded]">
                <label className="block text-xs font-bold text-[#717970] uppercase">
                  Official Administrative Reply
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type official response or dispute resolution guidance..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#c1c9be]/60 focus:border-[#1b6d24] rounded-2xl p-3 text-xs outline-none"
                />
                <div className="flex justify-end gap-2.5">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-[#a0f399] text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    Send Resolution
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-white rounded-3xl p-12 border border-[#c1c9be]/60 shadow-sm flex items-center justify-center text-xs text-[#717970]">
              Select a support ticket to inspect and respond.
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 2: REVIEW MODERATION */}
      {subView === 'reviews' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717970] text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search reviews by customer, text, or product ID..."
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                className="w-full bg-white border border-[#c1c9be]/60 focus:border-[#1b6d24] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#1b1c1c] outline-none shadow-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-[#c1c9be]/60 rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => setRatingFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  ratingFilter === 'all' ? 'bg-[#002c11] text-white' : 'text-[#414941] hover:bg-[#f0eded]'
                }`}
              >
                All Ratings
              </button>
              <button
                onClick={() => setRatingFilter('5')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  ratingFilter === '5' ? 'bg-emerald-700 text-white' : 'text-[#414941] hover:bg-[#f0eded]'
                }`}
              >
                ★ 5 Stars
              </button>
              <button
                onClick={() => setRatingFilter('1')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  ratingFilter === '1' ? 'bg-red-700 text-white' : 'text-[#414941] hover:bg-[#f0eded]'
                }`}
              >
                ★ 1 Star
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#c1c9be]/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fbf9f8] border-b border-[#f0eded] text-[11px] font-bold uppercase text-[#717970]">
                    <th className="py-3.5 px-6">Patron / Reviewer</th>
                    <th className="py-3.5 px-4">Rating</th>
                    <th className="py-3.5 px-4">Product ID / Title</th>
                    <th className="py-3.5 px-6">Review Content</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eded]">
                  {filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#717970]">
                        No reviews found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredReviews.map((rev) => {
                      const prod = products.find((p) => p.id === rev.productId);
                      return (
                        <tr key={rev.id} className="hover:bg-[#f5f9f5]">
                          <td className="py-3.5 px-6 font-bold text-[#002c11] whitespace-nowrap">
                            {rev.userName || 'Verified Patron'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-amber-500 font-bold">
                              {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#414941]">
                            <div className="font-bold truncate max-w-xs">{prod?.title || rev.productId}</div>
                            <div className="text-[10px] text-[#717970] font-mono">{rev.productId}</div>
                          </td>
                          <td className="py-3.5 px-6 text-[#414941] max-w-sm leading-relaxed">
                            {rev.comment}
                          </td>
                          <td className="py-3.5 px-4">
                            {rev.flagged ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 uppercase">
                                Hidden
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                Public
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleHideReview(rev)}
                              className={`px-3 py-1 font-bold rounded-xl text-xs ${
                                rev.flagged
                                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                              }`}
                            >
                              {rev.flagged ? 'Restore' : 'Hide Review'}
                            </button>
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 font-bold rounded-xl text-xs"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
