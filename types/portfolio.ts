// Portfolio types matching backend DTOs

export interface PortfolioSummaryResponse {
  baseCurrency: string;      // User's default currency (e.g., "EUR")
  totalValue: number;        // Total of fiat + crypto value
  fiatValue: number;         // Total fiat holdings
  cryptoValue: number;       // XRP holdings valued at BUY rate
}

export interface AssetLine {
  asset: string;             // "XRP" or currency code (e.g., "EUR")
  type: 'FIAT' | 'CRYPTO';
  amount: number;            // Native amount
  fiatValue: number;         // Value converted to baseCurrency
  rate: number | null;       // crypto->fiat rate (null for fiat)
}

export interface PortfolioAssetsResponse {
  baseCurrency: string;
  assets: AssetLine[];
}

export interface WalletLine {
  network: string;           // "INTERNAL_LEDGER"
  address: string;           // xflowTag or phone
  asset: string;             // "XRP"
  balance: number;           // Total balance
  fiatValue: number;         // Balance in baseCurrency
  rate: number;              // XRP->fiat rate
  spendable: number;         // Available balance
  reserved: number;          // Pending balance
}

export interface PortfolioWalletsResponse {
  baseCurrency: string;
  wallets: WalletLine[];
}
