// Transaction types matching backend DTOs

export type TransactionType =
  | 'TOP_UP_FIAT'
  | 'BUY_XRP'
  | 'SELL_XRP'
  | 'WITHDRAW_XRP'
  | 'TRANSFER_XRP'
  | 'WITHDRAW_FIAT'
  | 'DEPOSIT_XRP';

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface TransactionResponse {
  id: number;
  type: TransactionType;
  status: TransactionStatus;
  title: string;              // Auto-formatted: "Added money", "Bought XRP", etc.
  subtitle: string;           // Provider, XRP amount, shortened address, etc.

  // Amounts
  amount: number;             // In currency
  currency: string;           // Currency code (e.g., "EUR")
  xrpAmount: number | null;   // XRP units
  networkFee: number | null;  // Network fee
  platformFee: number | null; // Platform fee
  rate: number | null;        // Conversion rate

  // Addresses/recipients
  recipientAddress: string | null;
  recipientUserId: number | null;

  // References
  transactionHash: string | null;
  externalReference: string | null;
  provider: string | null;
  note: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface DayGroup {
  date: string;               // ISO date
  displayDate: string;        // "Today", "Yesterday", "5 Jan", "5 Jan 2024"
  transactions: TransactionResponse[];
}

export interface TransactionsByDayResponse {
  days: DayGroup[];
}
