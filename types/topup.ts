// Top-up (Add Funds) types

export interface CreateTopUpIntentRequest {
  amount: number;
  currency: string;
  paymentOptionId: number;
}

export interface CreateTopUpIntentResponse {
  topUpId: number;
  paymentIntentId: string;
  clientSecret: string | null;
  status: TopUpStatus;
}

export type TopUpStatus =
  | 'INITIATED'
  | 'REQUIRES_ACTION'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'CREDITED'
  | 'FAILED'
  | 'CANCELED';

// Buy XRP Quote (preview) - shows what user will receive
export interface BuyXrpQuoteRequest {
  fiatAmount: number;
  currency?: string; // Optional, uses user's default if not provided
}

export interface BuyXrpQuoteResponse {
  // Input
  fiatAmount: number;
  currency: string;

  // Rates
  marketRate: number; // Raw rate from CoinGecko
  effectiveRate: number; // Rate after markup (what user actually pays)
  markupBps: number; // Markup in basis points (200 = 2%)

  // XRP Breakdown
  grossXrp: number; // XRP before fees
  networkFeeXrp: number; // Network fee
  platformFeeXrp: number; // Platform fee
  totalFeeXrp: number; // Total fees
  netXrp: number; // Final XRP user receives

  // Fee details
  platformFeeBps: number;

  // Validation
  minimumFiat: number;
  valid: boolean;
  errorMessage: string | null;
}

// Legacy: XRP Rate response (parsed from "1 XRP = 0.52 EUR" format)
// Deprecated: Use BuyXrpQuoteResponse instead for accurate preview
export interface XrpRateInfo {
  rate: number;
  currency: string;
}
