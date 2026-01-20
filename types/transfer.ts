// Find recipient response types
export interface RecipientUser {
  type: 'user';
  userId: string;
  xflowTag: string;
  displayName?: string;
}

export interface RecipientWallet {
  type: 'wallet';
  address: string;
  displayAddress: string; // truncated for display
}

export type Recipient = RecipientUser | RecipientWallet;

export interface FindRecipientResponse {
  recentUsers: RecipientUser[];
  friends: RecipientUser[];
  searchResults: Recipient[];
}

// Send preview request
// Provide exactly one recipient (recipientTag OR destinationAddress)
// Provide exactly one amount (xrpAmount OR fiatAmount)
export interface SendPreviewRequest {
  recipientTag?: string; // For internal transfer (xflowTag)
  destinationAddress?: string; // For external transfer (XRP address)
  xrpAmount?: number; // XRP amount user wants to send
  fiatAmount?: number; // OR fiat amount user wants to send
}

// Send preview response
export interface SendPreviewResponse {
  asset: string;

  // XRP amounts
  totalXrp: number;
  feeXrp: number; // Total fees (network + platform)
  networkFeeXrp: number; // XRPL network fee
  platformFeeXrp: number; // 0.5% platform fee (external only)
  recipientGetsXrp: number; // What recipient receives
  spendableXrp: number; // User's available balance
  willUseMax: boolean; // True if clamped to max

  // Fiat equivalents (in user's preferred currency)
  fiatCurrency: string;
  xrpRate: number; // 1 XRP = X fiat
  totalFiat: number; // totalXrp in fiat
  feeFiat: number; // fees in fiat
  recipientGetsFiat: number; // what recipient gets in fiat

  destinationType: 'INTERNAL' | 'EXTERNAL';
}

// Transfer request types
export interface InternalTransferRequest {
  recipientXflowTag: string;
  xrpAmount: number;
  note?: string;
}

export interface ExternalTransferRequest {
  destinationAddress: string;
  xrpAmount: number;
  destinationTag?: number;
  note?: string;
}

// Send response (matches backend SendXrpResponse)
export interface SendXrpResponse {
  transactionId: number;
  type: 'XFLOW_USER' | 'EXTERNAL_ADDRESS';
  senderXflowTag: string;
  recipientXflowTag?: string; // null for external
  destinationAddress?: string; // null for internal
  destinationTag?: number; // null for internal
  xrpAmount: number; // what recipient gets
  networkFee?: number; // null for internal
  platformFee?: number; // null for internal
  totalDebited: number; // amount + fees
  txHash?: string; // null for internal, on-chain hash for external
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  note?: string;
}
