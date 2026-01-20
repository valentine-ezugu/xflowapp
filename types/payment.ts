// Payment and conversation types for the Payments API

// Counterparty in payment list (summary view)
export interface PaymentCounterpartyDto {
  userId: number | null;              // null for external addresses
  displayName: string;                // firstname + surname or xflowTag or truncated address
  xflowTag: string | null;            // null for external addresses
  externalAddress: string | null;     // null for internal users
  avatarUrl?: string;
  isInternalUser: boolean;
  lastPaymentXrp: string;
  lastPaymentFiat: string;
  lastPaymentCurrency: string;
  lastPaymentWasSent: boolean;        // true = you sent, false = you received
  lastPaymentAt: string;
}

// Counterparty in conversation detail view
export interface ConversationCounterparty {
  userId: number | null;
  displayName: string;
  xflowTag: string | null;
  externalAddress: string | null;
  avatarUrl?: string;
  isInternalUser: boolean;
}

export type PaymentType = 'INTERNAL' | 'EXTERNAL_SEND' | 'EXTERNAL_RECEIVE' | 'REQUEST';

export type PaymentStatus =
  | 'COMPLETED'
  | 'PENDING'
  | 'PROCESSING'
  | 'FAILED'
  | 'REQUESTED'
  | 'DECLINED'
  | 'CANCELLED';

export interface PaymentDetailDto {
  id: number;
  type: PaymentType;
  status: PaymentStatus;
  isSent: boolean;
  xrpAmount: string;                  // Backend returns as string
  fiatValue: string;
  fiatCurrency: string;
  note?: string;
  networkFee?: string;
  platformFee?: string;
  transactionHash?: string;
  createdAt: string;
  completedAt?: string;
  canRespond: boolean;                // true if you can pay/decline this request
  isMyRequest: boolean;               // true if you created this request
  respondedAt?: string;
  fulfilledByPaymentId?: number;
}

export interface MessageDetailDto {
  id: number;
  isSent: boolean;
  content: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ConversationItem {
  itemType: 'PAYMENT' | 'MESSAGE';
  timestamp: string;
  isSent: boolean;
  payment?: PaymentDetailDto;
  message?: MessageDetailDto;
}

// GET /api/v1/payments response
export interface PaymentListResponse {
  counterparties: PaymentCounterpartyDto[];
  totalCounterparties: number;
}

// GET /api/v1/payments/user/{userId} or /address/{address} response
export interface PaymentConversationResponse {
  counterparty: ConversationCounterparty;
  items: ConversationItem[];
  totalSentXrp: string;
  totalReceivedXrp: string;
  unreadCount: number;
  chatEnabled: boolean;               // chat enabled: internal user AND completed payment
  requestEnabled: boolean;            // request enabled: internal user only
}

// Send message request/response
export interface SendMessageRequest {
  recipientId: number;
  content: string;
}

export interface SendMessageResponse {
  messageId: number;
  recipientId: number;
  content: string;
  createdAt: string;
}

// Payment request types
export interface CreatePaymentRequestData {
  recipientXflowTag: string;
  xrpAmount: string;                  // Backend expects string
  note?: string;
}

export interface RequestPaymentResponse {
  paymentId: number;
  status: PaymentStatus;
  requesterXflowTag: string;
  recipientXflowTag: string;
  xrpAmount: string;
  note?: string;
  createdAt: string;
  message: string;
}

// Pending request item
export interface PendingRequestDto {
  paymentId: number;
  isMyRequest: boolean;
  counterparty: {
    userId: number;
    displayName: string;
    xflowTag: string;
    avatarUrl?: string;
  };
  xrpAmount: string;
  note?: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface PendingRequestsResponse {
  received: PendingRequestDto[];
  sent: PendingRequestDto[];
  receivedCount: number;
  sentCount: number;
}

export interface PayRequestData {
  paymentRequestId: number;
}

export interface DeclineRequestData {
  paymentRequestId: number;
}
