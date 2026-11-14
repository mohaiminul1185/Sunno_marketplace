import React, { useState, useEffect, useRef } from 'react';
import { Conversation, ChatMessage, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getOrCreateConversation,
  subscribeChatMessages,
  sendChatMessage,
  markConversationAsRead,
} from '../services/messagingService';
import { Send, Paperclip, X, Image, Store, ShoppingBag, ShieldCheck, User } from 'lucide-react';

export interface DirectChatModalProps {
  customerId?: string;
  customerName?: string;
  sellerId?: string;
  sellerName?: string;
  recipientId?: string;
  recipientName?: string;
  storeName?: string;
  productId?: string;
  productTitle?: string;
  productImage?: string;
  orderId?: string;
  orderNumber?: string;
  currentUserRole?: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  actor?: { id: string; name: string; role?: UserRole; email?: string; phone?: string };
  target?: {
    sellerId?: string;
    sellerName?: string;
    storeName?: string;
    productId?: string;
    productTitle?: string;
    productImage?: string;
    orderId?: string;
    orderNumber?: string;
    customerId?: string;
    customerName?: string;
  };
  onClose: () => void;
}

export const DirectChatModal: React.FC<DirectChatModalProps> = (props) => {
  const { user, userProfile, setIsAuthModalOpen } = useAuth();
  const { onClose } = props;

  // Resolve target & actor intelligently across different calling components
  const target = props.target || {};
  const actor = props.actor;

  const currentUserId =
    props.currentUserId ||
    actor?.id ||
    userProfile?.id ||
    user?.uid ||
    '';

  const currentUserName =
    props.currentUserName ||
    actor?.name ||
    userProfile?.displayName ||
    user?.displayName ||
    'Conscious Patron';

  const currentUserRole: UserRole =
    props.currentUserRole ||
    actor?.role ||
    userProfile?.role ||
    'customer';

  const sellerId =
    props.sellerId ||
    props.recipientId ||
    target.sellerId ||
    'artisan-coop';

  const sellerName =
    props.sellerName ||
    props.recipientName ||
    target.sellerName ||
    target.storeName ||
    'Artisan Workshop';

  const customerId =
    props.customerId ||
    target.customerId ||
    (currentUserRole === 'seller' ? 'customer-patron' : currentUserId);

  const customerName =
    props.customerName ||
    target.customerName ||
    (currentUserRole === 'seller' ? 'Valued Customer' : currentUserName);

  const storeName = props.storeName || target.storeName || sellerName;
  const productId = props.productId || target.productId;
  const productTitle = props.productTitle || target.productTitle;
  const productImage = props.productImage || target.productImage;
  const orderId = props.orderId || target.orderId;
  const orderNumber = props.orderNumber || target.orderNumber;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or fetch conversation
  useEffect(() => {
    let unsubscribeMessages = () => {};

    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    async function init() {
      setIsLoading(true);
      try {
        const conv = await getOrCreateConversation({
          customerId,
          customerName,
          sellerId,
          sellerName,
          storeName,
          productId,
          productTitle,
          productImage,
          orderId,
          orderNumber,
        });

        setConversation(conv);

        // Mark read
        await markConversationAsRead(conv.id, currentUserId);

        // Subscribe to real-time chat messages
        unsubscribeMessages = subscribeChatMessages(conv.id, (msgs) => {
          setMessages(msgs);
          markConversationAsRead(conv.id, currentUserId);
        });
      } catch (err) {
        console.warn('Init chat error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
    return () => unsubscribeMessages();
  }, [customerId, sellerId, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachmentUrl.trim()) return;
    if (!conversation) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    const attachToSend = attachmentUrl.trim()
      ? [{ url: attachmentUrl.trim(), name: 'Attachment', type: 'image' }]
      : undefined;

    setInputText('');
    setAttachmentUrl('');
    setShowAttachmentInput(false);

    try {
      const recipientId = currentUserId === customerId ? sellerId : customerId;

      await sendChatMessage({
        conversationId: conversation.id,
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: currentUserRole,
        recipientId,
        text: textToSend,
        attachments: attachToSend,
        productRef: productId ? { id: productId, title: productTitle || 'Craft', price: 0, image: productImage || '' } : undefined,
        orderRef: orderNumber ? { id: orderId || '', orderNumber, total: 0, status: 'Active' } : undefined,
      });
    } catch (err) {
      console.warn('Send message error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const isSenderMe = (msg: ChatMessage) => msg.senderId === currentUserId;

  return (
    <div id="direct-chat-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div id="direct-chat-modal-content" className="bg-[#fbf9f8] w-full max-w-lg rounded-3xl border border-[#c1c9be]/50 shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-white border-b border-[#c1c9be]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#002c11] text-[#a0f399] flex items-center justify-center font-bold">
              {currentUserRole === 'seller' ? <User className="w-5 h-5" /> : <Store className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#002c11]">
                  {currentUserRole === 'seller' ? customerName : storeName || sellerName}
                </h3>
                <span className="w-2 h-2 rounded-full bg-[#1b6d24] animate-pulse" />
              </div>
              <p className="text-[11px] text-[#717970]">
                {currentUserRole === 'seller' ? 'Customer Inquiry' : 'Verified Artisan Workshop'}
              </p>
            </div>
          </div>
          <button
            id="close-chat-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f0eded] text-[#717970] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product / Order Context Banner */}
        {(productTitle || orderNumber) && (
          <div className="px-4 py-2 bg-[#e8f5e9]/70 border-b border-[#c1c9be]/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {productImage ? (
                <img src={productImage} alt="Reference" className="w-7 h-7 rounded-lg object-cover border" referrerPolicy="no-referrer" />
              ) : (
                <ShoppingBag className="w-4 h-4 text-[#1b6d24]" />
              )}
              <span className="font-semibold text-[#002c11] truncate">
                {productTitle ? `Item: ${productTitle}` : `Order #${orderNumber}`}
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#1b6d24] bg-white px-2 py-0.5 rounded-full border border-[#a0f399]">
              Live Inquiries
            </span>
          </div>
        )}

        {!currentUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white m-4 rounded-3xl border border-[#c1c9be]/40">
            <div className="w-14 h-14 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center mb-4">
              <User className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-[#002c11] mb-2 font-heading">
              Sign In to Message the Artisan
            </h4>
            <p className="text-xs text-[#414941] max-w-sm mb-6 leading-relaxed">
              Connect directly with verified rural cooperatives. All your inquiries and custom order updates will be securely stored in your account.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsAuthModalOpen(true);
                onClose();
              }}
              className="px-6 py-3 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-2xl text-xs font-bold transition-all shadow-sm"
            >
              Sign In / Register
            </button>
          </div>
        ) : (
          <>
            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#fbf9f8]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-[#717970]">
                  Connecting to artisan channel...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#717970]">
                  <div className="w-12 h-12 rounded-2xl bg-[#e8f5e9] text-[#1b6d24] flex items-center justify-center mb-3">
                    <Store className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-[#002c11] mb-1">Direct Artisan Communication</h4>
              <p className="text-[11px] max-w-xs">
                Ask about sustainable materials, custom handcrafting, sizing, or delivery dispatch.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = isSenderMe(msg);
              return (
                <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs shadow-sm ${
                      mine
                        ? 'bg-[#002c11] text-white rounded-br-none'
                        : 'bg-white text-[#002c11] border border-[#c1c9be]/40 rounded-bl-none'
                    }`}
                  >
                    {!mine && (
                      <span className="block text-[10px] font-bold text-[#1b6d24] mb-0.5">
                        {msg.senderName}
                      </span>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl overflow-hidden border border-white/20"
                          >
                            <img src={att.url} alt="Attachment" className="max-h-40 w-full object-cover" referrerPolicy="no-referrer" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-[#717970] mt-1 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment URL drawer */}
        {showAttachmentInput && (
          <div className="p-3 bg-white border-t border-[#c1c9be]/30 flex items-center gap-2">
            <input
              type="url"
              placeholder="Paste photo URL..."
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-xl text-xs text-[#002c11]"
            />
            <button
              type="button"
              onClick={() => setShowAttachmentInput(false)}
              className="p-1.5 text-[#717970] hover:text-[#002c11]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#c1c9be]/30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAttachmentInput(!showAttachmentInput)}
            className="p-2 rounded-full hover:bg-[#f0eded] text-[#717970] transition-colors"
            title="Attach Image"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            id="chat-message-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message to the artisan..."
            className="flex-1 px-4 py-2.5 bg-[#fbf9f8] border border-[#c1c9be]/60 rounded-full text-xs text-[#002c11] focus:outline-none focus:border-[#1b6d24]"
          />

          <button
            id="send-chat-btn"
            type="submit"
            disabled={isSending || (!inputText.trim() && !attachmentUrl.trim())}
            className="p-2.5 bg-[#002c11] text-[#a0f399] rounded-full hover:bg-[#003d18] transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        </>
        )}
      </div>
    </div>
  );
};
