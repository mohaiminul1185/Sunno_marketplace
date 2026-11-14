import React, { useState, useEffect, useRef } from 'react';
import { Conversation, ChatMessage, Order, SubOrder } from '../../types';
import {
  subscribeUserConversations,
  subscribeChatMessages,
  sendChatMessage,
  markConversationAsRead,
} from '../../services/messagingService';
import { uploadChatAttachment } from '../../services/storageService';
import {
  MessageSquare,
  Search,
  Send,
  ShoppingBag,
  User,
  Clock,
  CheckCheck,
  Paperclip,
  ExternalLink,
  Store,
  ShieldCheck,
  Image,
  Loader2,
} from 'lucide-react';

interface SellerOrderCommunicationTabProps {
  currentSellerId: string;
  sellerStoreName: string;
  orders: Order[];
  subOrders: SubOrder[];
  onOpenOrder?: (orderId: string) => void;
}

export const SellerOrderCommunicationTab: React.FC<SellerOrderCommunicationTabProps> = ({
  currentSellerId,
  sellerStoreName,
  orders,
  subOrders,
  onOpenOrder,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachment, setShowAttachment] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;

    setIsUploadingAttachment(true);
    try {
      const res = await uploadChatAttachment(selectedConv.id, file);
      if (res.url) {
        setAttachmentUrl(res.url);
        setShowAttachment(true);
      }
    } catch (err) {
      console.warn('Chat attachment upload error:', err);
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Subscribe to all conversations for this seller
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeUserConversations(currentSellerId, (convs) => {
      setConversations(convs);
      setIsLoading(false);
      if (!selectedConv && convs.length > 0) {
        setSelectedConv(convs[0]);
      }
    });

    return () => unsubscribe();
  }, [currentSellerId]);

  // Subscribe to active conversation messages
  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      return;
    }

    // Mark as read
    markConversationAsRead(selectedConv.id, currentSellerId);

    const unsubscribe = subscribeChatMessages(selectedConv.id, (msgs) => {
      setMessages(msgs);
      markConversationAsRead(selectedConv.id, currentSellerId);
    });

    return () => unsubscribe();
  }, [selectedConv?.id, currentSellerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConv || (!inputText.trim() && !attachmentUrl.trim()) || isSending) return;

    setIsSending(true);
    try {
      const recipientId =
        selectedConv.buyerId ||
        (selectedConv.participants || []).find((p) => p !== currentSellerId) ||
        'buyer';

      await sendChatMessage({
        conversationId: selectedConv.id,
        senderId: currentSellerId,
        senderRole: 'seller',
        senderName: sellerStoreName,
        recipientId,
        text: inputText.trim() || 'Attached image',
        attachments: attachmentUrl.trim()
          ? [{ url: attachmentUrl.trim(), name: 'Item Image', type: 'image' }]
          : undefined,
      });

      setInputText('');
      setAttachmentUrl('');
      setShowAttachment(false);
    } catch (err) {
      console.error('Failed to send seller chat reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const customer = (c.customerName || '').toLowerCase();
    const orderNo = (c.orderNumber || c.orderId || '').toLowerCase();
    const prodTitle = (c.productTitle || '').toLowerCase();
    return customer.includes(q) || orderNo.includes(q) || prodTitle.includes(q);
  });

  // Find related order if available
  const relatedSubOrder = selectedConv?.orderId
    ? subOrders.find((s) => s.id === selectedConv.orderId || s.parentOrderId === selectedConv.orderId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002c11] font-heading">
          Buyer & Order Communication
        </h1>
        <p className="text-xs text-[#414941] mt-0.5">
          Real-time inquiries and order-specific messaging with conscious shoppers across Bangladesh.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-[#c1c9be]/60 shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[600px] max-h-[750px]">
        {/* Left Column: Conversations List */}
        <div className="w-full md:w-80 border-r border-[#c1c9be]/60 flex flex-col bg-[#fbf9f8]">
          {/* Search bar */}
          <div className="p-4 border-b border-[#c1c9be]/60">
            <div className="relative">
              <Search className="w-4 h-4 text-[#717970] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search buyer or order #..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#c1c9be]/60 rounded-xl text-xs outline-none focus:border-[#1b6d24]"
              />
            </div>
          </div>

          {/* Conversations stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f0eded]">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-[#717970]">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#717970] space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-stone-400" />
                <p className="font-bold text-[#002c11]">No active messages</p>
                <p className="text-[11px]">Inquiries from shoppers and order questions will appear here.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                const unread = (conv.unreadCountBySeller || (conv as any).unreadCountSeller || 0) > 0;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                      isSelected ? 'bg-[#e8f5e9] border-l-4 border-[#1b6d24]' : 'hover:bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-[#1b6d24] font-bold text-xs shrink-0">
                      {conv.customerName ? conv.customerName.charAt(0).toUpperCase() : 'B'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-[#002c11] truncate">
                          {conv.customerName || 'Conscious Buyer'}
                        </span>
                        {conv.updatedAt && (
                          <span className="text-[10px] text-[#717970] shrink-0 font-mono">
                            {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {conv.orderNumber && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-[#002c11] text-[#a0f399] rounded text-[9px] font-mono font-bold">
                            #{conv.orderNumber.slice(-8)}
                          </span>
                        </div>
                      )}

                      {conv.productTitle && (
                        <p className="text-[11px] text-[#1b6d24] font-medium truncate mt-0.5">
                          {conv.productTitle}
                        </p>
                      )}

                      <p className="text-[11px] text-[#717970] truncate mt-0.5">
                        {conv.lastMessageText || 'Chat thread opened'}
                      </p>
                    </div>

                    {unread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[#c1c9be]/60 bg-[#fbf9f8] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-[#1b6d24] font-bold text-sm">
                    {selectedConv.customerName ? selectedConv.customerName.charAt(0).toUpperCase() : 'B'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#002c11]">
                      {selectedConv.customerName || 'Conscious Buyer'}
                    </h3>
                    <p className="text-[11px] text-[#717970] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#1b6d24]" />
                      Verified SUNNO Buyer
                    </p>
                  </div>
                </div>

                {selectedConv.orderId && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[#002c11] text-[#a0f399] rounded-lg text-xs font-mono font-bold">
                      Order #{selectedConv.orderNumber || selectedConv.orderId.slice(0, 10)}
                    </span>
                    {onOpenOrder && (
                      <button
                        onClick={() => onOpenOrder(selectedConv.orderId!)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-[#e8f5e9] text-[#002c11] rounded-lg text-xs font-bold border border-[#c1c9be]/60"
                      >
                        View Order
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Order Reference Banner if tied to an order */}
              {relatedSubOrder && (
                <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-200 text-xs flex items-center justify-between text-emerald-950">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      Sub-Order <strong>{relatedSubOrder.id}</strong> (৳{relatedSubOrder.total}) • Status: <strong>{relatedSubOrder.status.toUpperCase()}</strong>
                    </span>
                  </div>
                  {relatedSubOrder.trackingCode && (
                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-300">
                      Tracking: {relatedSubOrder.trackingCode}
                    </span>
                  )}
                </div>
              )}

              {/* Messages Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/40">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-[#717970] space-y-1">
                    <MessageSquare className="w-8 h-8 text-stone-300" />
                    <p className="font-bold text-[#002c11]">No messages yet</p>
                    <p>Send a message to assist the buyer with product questions or dispatch updates.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderRole === 'seller' || m.senderId === currentSellerId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-3 text-xs shadow-xs ${
                            isMe
                              ? 'bg-[#002c11] text-white rounded-br-xs'
                              : 'bg-white border border-[#c1c9be]/60 text-[#002c11] rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.text}</p>
                          {m.attachmentUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden max-w-xs border border-white/20">
                              <img src={m.attachmentUrl} alt="Attachment" className="w-full object-cover" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-[#717970] mt-1 px-1 font-mono">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#c1c9be]/60 bg-white space-y-2">
                {showAttachment && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="Paste image/document URL..."
                      className="flex-1 bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-3 py-1.5 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAttachment(false)}
                      className="px-2 py-1 text-xs text-[#717970] hover:text-black"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                    className="p-2 text-[#717970] hover:text-[#002c11] hover:bg-[#f0eded] rounded-xl transition-colors cursor-pointer"
                    title="Upload Photo/Document"
                  >
                    {isUploadingAttachment ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#1b6d24]" />
                    ) : (
                      <Image className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAttachment(!showAttachment)}
                    className="p-2 text-[#717970] hover:text-[#002c11] hover:bg-[#f0eded] rounded-xl transition-colors"
                    title="Attach Image URL"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your reply to the buyer..."
                    className="flex-1 bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#1b6d24]"
                  />

                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachmentUrl.trim()) || isSending}
                    className="px-4 py-2.5 bg-[#002c11] hover:bg-[#1b6d24] text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-[#717970] space-y-2">
              <MessageSquare className="w-12 h-12 text-stone-300" />
              <h3 className="font-bold text-sm text-[#002c11]">Select a Conversation</h3>
              <p className="max-w-xs">
                Choose a customer thread on the left to review inquiries and send immediate order updates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
