import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  Conversation,
  ChatMessage,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from '../types';
import { handleFirestoreError, OperationType, createAuditLog } from './dbService';
import { notifyChatMessage, notifySupportTicketUpdate } from './notificationService';

export const CONVERSATIONS_COL = 'conversations';
export const CHAT_MESSAGES_COL = 'chat_messages';
export const SUPPORT_TICKETS_COL = 'support_tickets';

// ---------------- DIRECT MESSAGING / CONVERSATIONS ----------------

export async function getOrCreateConversation(params: {
  customerId: string;
  customerName: string;
  sellerId: string;
  sellerName: string;
  storeName?: string;
  productId?: string;
  productTitle?: string;
  productImage?: string;
  orderId?: string;
  orderNumber?: string;
}): Promise<Conversation> {
  const { customerId, customerName, sellerId, sellerName, storeName, productId, productTitle, productImage, orderId, orderNumber } = params;

  // Search existing conversation between these 2 users
  try {
    const q = query(
      collection(db, CONVERSATIONS_COL),
      where('participants', 'array-contains', customerId)
    );
    const snap = await getDocs(q);
    const found = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Conversation))
      .find((c) => c.sellerId === sellerId && c.customerId === customerId);

    if (found) {
      // Update product / order context if newly provided
      if (productId && (!found.productId || found.productId !== productId)) {
        await updateDoc(doc(db, CONVERSATIONS_COL, found.id), {
          productId,
          productTitle,
          productImage,
          orderId: orderId || found.orderId,
          orderNumber: orderNumber || found.orderNumber,
          updatedAt: new Date().toISOString(),
        });
      }
      return found;
    }
  } catch (err) {
    console.warn('Search conversation warning:', err);
  }

  // Create new conversation
  const convId = `conv-${customerId.slice(0, 5)}-${sellerId.slice(0, 5)}-${Date.now()}`;
  const now = new Date().toISOString();

  const newConv: Conversation = {
    id: convId,
    participants: [customerId, sellerId],
    customerId,
    customerName,
    sellerId,
    sellerName,
    storeName: storeName || sellerName,
    productId,
    productTitle,
    productImage,
    orderId,
    orderNumber,
    lastMessageText: 'Conversation started',
    lastMessageTime: now,
    unreadCountCustomer: 0,
    unreadCountSeller: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = doc(db, CONVERSATIONS_COL, convId);
    await setDoc(ref, newConv);
    return newConv;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${CONVERSATIONS_COL}/${convId}`);
    return newConv;
  }
}

export function subscribeUserConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void
) {
  if (!userId) return () => {};
  try {
    const q = query(
      collection(db, CONVERSATIONS_COL),
      where('participants', 'array-contains', userId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const convs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
        const sorted = convs.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
        onUpdate(sorted);
      },
      (error) => {
        console.warn('Conversations snapshot error:', error);
      }
    );
  } catch {
    return () => {};
  }
}

export function subscribeChatMessages(
  conversationId: string,
  onUpdate: (messages: ChatMessage[]) => void
) {
  if (!conversationId) return () => {};
  try {
    const q = query(
      collection(db, CHAT_MESSAGES_COL),
      where('conversationId', '==', conversationId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
        const sorted = msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        onUpdate(sorted);
      },
      (error) => {
        console.warn('Chat messages snapshot error:', error);
      }
    );
  } catch {
    return () => {};
  }
}

export async function sendChatMessage(params: {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  text: string;
  attachments?: { url: string; name: string; type: string }[];
  productRef?: { id: string; title: string; price: number; image: string };
  orderRef?: { id: string; orderNumber: string; total: number; status: string };
}): Promise<ChatMessage> {
  const { conversationId, senderId, senderName, senderRole, recipientId, text, attachments, productRef, orderRef } = params;

  const msgId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const chatMsg: ChatMessage = {
    id: msgId,
    conversationId,
    senderId,
    senderName,
    senderRole,
    recipientId,
    text,
    attachments: attachments || [],
    productRef,
    orderRef,
    isRead: false,
    createdAt: now,
  };

  try {
    // 1. Save chat message
    const msgRef = doc(db, CHAT_MESSAGES_COL, msgId);
    await setDoc(msgRef, chatMsg);

    // 2. Update conversation record
    const convRef = doc(db, CONVERSATIONS_COL, conversationId);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) {
      const convData = convSnap.data() as Conversation;
      const isSenderCustomer = senderId === convData.customerId;

      await updateDoc(convRef, {
        lastMessageText: text || (attachments?.length ? 'Sent an attachment' : 'Message'),
        lastMessageTime: now,
        updatedAt: now,
        unreadCountCustomer: isSenderCustomer ? convData.unreadCountCustomer : (convData.unreadCountCustomer || 0) + 1,
        unreadCountSeller: !isSenderCustomer ? convData.unreadCountSeller : (convData.unreadCountSeller || 0) + 1,
      });
    }

    // 3. Notify recipient
    await notifyChatMessage(
      recipientId,
      senderName,
      text || 'Sent an attachment',
      conversationId,
      senderRole === 'customer'
    );

    return chatMsg;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${CHAT_MESSAGES_COL}/${msgId}`);
    throw err;
  }
}

export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const convRef = doc(db, CONVERSATIONS_COL, conversationId);
    const snap = await getDoc(convRef);
    if (!snap.exists()) return;

    const conv = snap.data() as Conversation;
    if (userId === conv.customerId) {
      await updateDoc(convRef, { unreadCountCustomer: 0 });
    } else if (userId === conv.sellerId) {
      await updateDoc(convRef, { unreadCountSeller: 0 });
    }
  } catch (err) {
    console.warn('Mark conversation read error:', err);
  }
}

// ---------------- SUPPORT TICKETS SYSTEM ----------------

export async function createSupportTicket(params: {
  creatorId: string;
  creatorName: string;
  creatorEmail?: string;
  creatorPhone?: string;
  creatorRole: UserRole;
  subject: string;
  category: SupportTicketCategory;
  priority?: SupportTicketPriority;
  orderId?: string;
  orderNumber?: string;
  sellerId?: string;
  initialMessage: string;
  attachments?: string[];
}): Promise<SupportTicket> {
  const { creatorId, creatorName, creatorEmail, creatorPhone, creatorRole, subject, category, priority, orderId, orderNumber, sellerId, initialMessage, attachments } = params;

  const ticketId = `tkt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const ticketNumber = `SUN-TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const firstMsg: SupportTicketMessage = {
    id: `msg-${Date.now()}`,
    senderId: creatorId,
    senderName: creatorName,
    senderRole: creatorRole,
    message: initialMessage,
    attachments: attachments || [],
    createdAt: now,
  };

  const ticket: SupportTicket = {
    id: ticketId,
    ticketNumber,
    creatorId,
    creatorName,
    creatorEmail,
    creatorPhone,
    creatorRole,
    subject,
    category,
    priority: priority || 'MEDIUM',
    status: 'OPEN',
    orderId,
    orderNumber,
    sellerId,
    initialMessage,
    attachments: attachments || [],
    messages: [firstMsg],
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = doc(db, SUPPORT_TICKETS_COL, ticketId);
    await setDoc(ref, ticket);

    await createAuditLog({
      action: 'SUPPORT_TICKET_CREATED',
      actorId: creatorId,
      performedBy: creatorName,
      actorRole: creatorRole,
      entityType: 'support_ticket',
      entityId: ticketId,
      targetType: 'ticket',
      targetId: ticketNumber,
      details: `Support ticket #${ticketNumber} created by ${creatorName} (${creatorRole}). Subject: "${subject}"`,
      timestamp: now,
    });

    return ticket;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${SUPPORT_TICKETS_COL}/${ticketId}`);
    throw err;
  }
}

export async function fetchUserTickets(userId: string): Promise<SupportTicket[]> {
  if (!userId || !auth.currentUser) return [];
  try {
    const q = query(
      collection(db, SUPPORT_TICKETS_COL),
      where('creatorId', '==', userId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, SUPPORT_TICKETS_COL);
    return [];
  }
}

export async function fetchAllSupportTickets(): Promise<SupportTicket[]> {
  try {
    const snap = await getDocs(collection(db, SUPPORT_TICKETS_COL));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, SUPPORT_TICKETS_COL);
    return [];
  }
}

export async function replyToSupportTicket(params: {
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  attachments?: string[];
  isInternalNote?: boolean;
  newStatus?: SupportTicketStatus;
}): Promise<SupportTicket> {
  const { ticketId, senderId, senderName, senderRole, message, attachments, isInternalNote, newStatus } = params;

  const ref = doc(db, SUPPORT_TICKETS_COL, ticketId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Ticket not found.');

  const ticket = snap.data() as SupportTicket;
  const now = new Date().toISOString();

  const newMsg: SupportTicketMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    senderId,
    senderName,
    senderRole,
    message,
    attachments: attachments || [],
    isInternalNote: isInternalNote || false,
    createdAt: now,
  };

  const updatedMessages = [...(ticket.messages || []), newMsg];
  let calculatedStatus = ticket.status;

  if (newStatus) {
    calculatedStatus = newStatus;
  } else if (senderRole === 'admin') {
    calculatedStatus = 'WAITING_FOR_CUSTOMER';
  } else if (senderRole === 'customer') {
    calculatedStatus = 'IN_PROGRESS';
  }

  const updateData: Partial<SupportTicket> = {
    messages: updatedMessages,
    status: calculatedStatus,
    updatedAt: now,
  };
  if (calculatedStatus === 'RESOLVED' || calculatedStatus === 'CLOSED') {
    updateData.resolvedAt = now;
  } else if (ticket.resolvedAt) {
    updateData.resolvedAt = ticket.resolvedAt;
  }

  await updateDoc(ref, updateData);

  // Notify creator if admin replied
  if (senderRole === 'admin' && !isInternalNote) {
    await notifySupportTicketUpdate(
      ticket.creatorId,
      ticket.ticketNumber,
      ticket.subject,
      calculatedStatus,
      false
    );
  }

  return { ...ticket, ...updateData };
}

export async function updateSupportTicketStatus(params: {
  ticketId: string;
  status: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assignedAdminId?: string;
  assignedAdminName?: string;
  adminId: string;
  adminName: string;
}): Promise<void> {
  const { ticketId, status, priority, assignedAdminId, assignedAdminName, adminId, adminName } = params;

  const ref = doc(db, SUPPORT_TICKETS_COL, ticketId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Ticket not found.');

  const ticket = snap.data() as SupportTicket;
  const now = new Date().toISOString();

  const updateData: Partial<SupportTicket> = {
    status,
    updatedAt: now,
  };
  if (status === 'RESOLVED' || status === 'CLOSED') {
    updateData.resolvedAt = now;
  }

  if (priority) updateData.priority = priority;
  if (assignedAdminId) updateData.assignedAdminId = assignedAdminId;
  if (assignedAdminName) updateData.assignedAdminName = assignedAdminName;

  await updateDoc(ref, updateData);

  await createAuditLog({
    action: `TICKET_${status}`,
    actorId: adminId,
    performedBy: adminName,
    actorRole: 'admin',
    entityType: 'support_ticket',
    entityId: ticketId,
    targetType: 'ticket',
    targetId: ticket.ticketNumber,
    details: `Admin changed ticket #${ticket.ticketNumber} status to ${status}.`,
    timestamp: now,
  });

  await notifySupportTicketUpdate(
    ticket.creatorId,
    ticket.ticketNumber,
    ticket.subject,
    status,
    false
  );
}
