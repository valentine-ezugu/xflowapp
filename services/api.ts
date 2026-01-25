import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  VerifyOtpRequest,
  RefreshTokenRequest,
  UserProfile,
  KycStatusResponse,
  SavePersonalInfoRequest,
  SaveAddressRequest,
  AddressResponse,
  KycVerifyResponse,
  CountryDto,
} from '@/types/auth';
import {
  PortfolioSummaryResponse,
  PortfolioAssetsResponse,
  PortfolioWalletsResponse,
} from '@/types/portfolio';
import {
  TransactionsByDayResponse,
  TransactionResponse,
} from '@/types/transaction';
import {
  FindRecipientResponse,
  SendPreviewRequest,
  SendPreviewResponse,
  InternalTransferRequest,
  ExternalTransferRequest,
  SendXrpResponse,
  ReceiveXrpResponse,
} from '@/types/transfer';
import {
  PaymentListResponse,
  PaymentConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
  CreatePaymentRequestData,
  RequestPaymentResponse,
  PendingRequestsResponse,
  PayRequestData,
  DeclineRequestData,
} from '@/types/payment';
import {
  AccountDetailsResponse,
  PaymentOption,
  PaymentProviderResponse,
  SetupIntentResponse,
  AddFlutterwaveCardRequest,
  AddFlutterwaveCardResponse,
} from '@/types/settings';
import {
  CreateTopUpIntentRequest,
  CreateTopUpIntentResponse,
  BuyXrpQuoteRequest,
  BuyXrpQuoteResponse,
  XrpRateInfo,
} from '@/types/topup';

// API Configuration
// Set to true to use localhost, false to use dev server
const USE_LOCALHOST = false;

const getApiBaseUrl = (): string => {
  if (!__DEV__) {
    return 'https://api.zevlian..com/api/v1'; // Production URL
  }

  // Development: use remote dev server or localhost
  if (USE_LOCALHOST) {
    // Localhost URLs by platform
    if (Platform.OS === 'web') {
      return 'http://localhost:8080/api/v1';
    } else {
      // For Expo Go on real devices, use your computer's local IP
      // Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
      // Make sure your phone is on the same WiFi network
      return 'http://192.168.1.21:8080/api/v1';
    }
  }

  // Remote dev server (works on all platforms)
  return 'https://dev-api.zevlian.com/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// Token storage keys
const ACCESS_TOKEN_KEY = 'xflow_access_token';
const REFRESH_TOKEN_KEY = 'xflow_refresh_token';

// Token storage helpers - use SecureStore on native, localStorage on web
export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      console.log('[TokenStorage] Setting tokens...');
      if (Platform.OS === 'web') {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      }
      console.log('[TokenStorage] Tokens set successfully');
    } catch (err) {
      console.error('[TokenStorage] Failed to set tokens:', err);
      throw err;
    }
  },

  async clearTokens(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  },
};

// API Error class
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Callback for handling token refresh or logout
let onTokenRefreshFailed: (() => void) | null = null;

export const setTokenRefreshFailedCallback = (callback: () => void) => {
  onTokenRefreshFailed = callback;
};

// Base fetch with auth handling
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth header if required
  if (requiresAuth) {
    const accessToken = await tokenStorage.getAccessToken();
    if (accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 - try refresh token
  if (response.status === 401 && requiresAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry with new token
      const newAccessToken = await tokenStorage.getAccessToken();
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    } else {
      // Refresh failed, trigger logout
      onTokenRefreshFailed?.();
      throw new ApiError(401, 'Session expired. Please login again.');
    }
  }

  // Handle non-OK responses
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorData: unknown;

    try {
      const errorBody = await response.text();
      errorData = errorBody;
      // Try to parse as JSON
      try {
        const jsonError = JSON.parse(errorBody);
        errorMessage = jsonError.message || jsonError.error || errorBody;
      } catch {
        errorMessage = errorBody || `HTTP ${response.status}`;
      }
    } catch {
      errorMessage = `HTTP ${response.status}`;
    }

    throw new ApiError(response.status, errorMessage, errorData);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  // Try to parse as JSON, otherwise return text
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

// Try to refresh the access token
async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken } as RefreshTokenRequest),
    });

    if (!response.ok) {
      await tokenStorage.clearTokens();
      return false;
    }

    const data: AuthResponse = await response.json();
    await tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    await tokenStorage.clearTokens();
    return false;
  }
}

// ============ AUTH API ============

export const authApi = {
  /**
   * Register a new user - sends OTP to phone
   */
  async register(data: RegisterRequest): Promise<string> {
    return fetchWithAuth<string>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
  },

  /**
   * Verify registration OTP - returns tokens
   */
  async verifyRegistration(data: VerifyOtpRequest): Promise<AuthResponse> {
    console.log('[API] verifyRegistration called');
    const response = await fetchWithAuth<AuthResponse>('/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);

    console.log('[API] verifyRegistration response:', response);

    // Store tokens
    console.log('[API] Storing tokens...');
    await tokenStorage.setTokens(response.accessToken, response.refreshToken);
    console.log('[API] Tokens stored');
    return response;
  },

  /**
   * Login existing user - sends OTP to phone
   */
  async login(data: LoginRequest): Promise<string> {
    return fetchWithAuth<string>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
  },

  /**
   * Resend OTP to phone number
   */
  async resendOtp(phoneNumber: string): Promise<string> {
    return fetchWithAuth<string>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }, false);
  },

  /**
   * Verify login OTP - returns tokens
   */
  async verifyLogin(data: VerifyOtpRequest): Promise<AuthResponse> {
    console.log('[API] verifyLogin called');
    const response = await fetchWithAuth<AuthResponse>('/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);

    console.log('[API] verifyLogin response:', response);

    // Store tokens
    console.log('[API] Storing tokens...');
    await tokenStorage.setTokens(response.accessToken, response.refreshToken);
    console.log('[API] Tokens stored');
    return response;
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthResponse | null> {
    const success = await tryRefreshToken();
    if (success) {
      const accessToken = await tokenStorage.getAccessToken();
      const refreshToken = await tokenStorage.getRefreshToken();
      return { accessToken: accessToken!, refreshToken: refreshToken! };
    }
    return null;
  },

  /**
   * Logout - clear stored tokens
   */
  async logout(): Promise<void> {
    await tokenStorage.clearTokens();
  },
};

// ============ USER API ============

export const userApi = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    return fetchWithAuth<UserProfile>('/users/profile');
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return fetchWithAuth<UserProfile>('/users/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============ KYC API ============

export const kycApi = {
  /**
   * Get KYC status and steps
   */
  async getStatus(): Promise<KycStatusResponse> {
    return fetchWithAuth<KycStatusResponse>('/kyc/status');
  },

  /**
   * Save personal information (Step 1)
   */
  async savePersonalInfo(data: SavePersonalInfoRequest): Promise<void> {
    return fetchWithAuth<void>('/kyc/personal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Save address (Step 2)
   */
  async saveAddress(data: SaveAddressRequest): Promise<void> {
    return fetchWithAuth<void>('/kyc/address', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get saved address
   */
  async getAddress(): Promise<AddressResponse> {
    return fetchWithAuth<AddressResponse>('/kyc/address');
  },

  /**
   * Start ID verification (Step 3) - returns Sumsub URL
   */
  async startVerification(): Promise<KycVerifyResponse> {
    return fetchWithAuth<KycVerifyResponse>('/kyc/verify', {
      method: 'POST',
    });
  },
};

// ============ PORTFOLIO API ============

export const portfolioApi = {
  /**
   * Get portfolio summary (total value in fiat)
   */
  async getSummary(): Promise<PortfolioSummaryResponse> {
    return fetchWithAuth<PortfolioSummaryResponse>('/portfolio/summary');
  },

  /**
   * Get detailed asset breakdown
   */
  async getAssets(): Promise<PortfolioAssetsResponse> {
    return fetchWithAuth<PortfolioAssetsResponse>('/portfolio/assets');
  },

  /**
   * Get wallet information
   */
  async getWallets(): Promise<PortfolioWalletsResponse> {
    return fetchWithAuth<PortfolioWalletsResponse>('/portfolio/wallets');
  },
};

// ============ TRANSACTION API ============

export const transactionApi = {
  /**
   * Get all transactions grouped by day
   */
  async getAll(): Promise<TransactionsByDayResponse> {
    return fetchWithAuth<TransactionsByDayResponse>('/transactions');
  },

  /**
   * Get single transaction by ID
   */
  async getById(id: number): Promise<TransactionResponse> {
    return fetchWithAuth<TransactionResponse>(`/transactions/${id}`);
  },
};

// ============ TRANSFER API ============

export const transferApi = {
  /**
   * Find recipient by query (xflowTag or wallet address)
   * Returns recent users, friends, and search results
   */
  async findRecipient(query: string): Promise<FindRecipientResponse> {
    return fetchWithAuth<FindRecipientResponse>(`/xrp/send/find-recipient?query=${encodeURIComponent(query)}`);
  },

  /**
   * Get send preview - calculates XRP/fiat conversion and fees
   * Shows what recipient actually gets after fees
   */
  async getPreview(data: SendPreviewRequest): Promise<SendPreviewResponse> {
    return fetchWithAuth<SendPreviewResponse>('/xrp/send/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Send XRP to another XFlow user (internal transfer)
   * Instant settlement, no fees
   */
  async sendInternal(data: InternalTransferRequest): Promise<SendXrpResponse> {
    return fetchWithAuth<SendXrpResponse>('/xrp/send/internal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Send XRP to external wallet address
   * On-chain transaction with network + platform fees
   */
  async sendExternal(data: ExternalTransferRequest): Promise<SendXrpResponse> {
    return fetchWithAuth<SendXrpResponse>('/xrp/send/external', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get deposit address for receiving XRP from external sources
   * Returns treasury address and user's unique destination tag
   */
  async getReceiveAddress(): Promise<ReceiveXrpResponse> {
    return fetchWithAuth<ReceiveXrpResponse>('/xrp/receive');
  },
};

// ============ PAYMENT API ============

export const paymentApi = {
  /**
   * Get list of all payment conversations
   */
  async getList(): Promise<PaymentListResponse> {
    return fetchWithAuth<PaymentListResponse>('/payments');
  },

  /**
   * Get conversation with a specific user (payments + messages)
   */
  async getConversation(userId: number): Promise<PaymentConversationResponse> {
    return fetchWithAuth<PaymentConversationResponse>(`/payments/user/${userId}`);
  },

  /**
   * Get conversation with an external address (payments only)
   */
  async getAddressConversation(address: string): Promise<PaymentConversationResponse> {
    return fetchWithAuth<PaymentConversationResponse>(`/payments/address/${encodeURIComponent(address)}`);
  },

  /**
   * Send a message to a user
   */
  async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
    return fetchWithAuth<SendMessageResponse>('/payments/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Mark messages from a user as read
   */
  async markAsRead(userId: number): Promise<void> {
    return fetchWithAuth<void>(`/payments/user/${userId}/messages/read`, {
      method: 'POST',
    });
  },

  /**
   * Get total unread message count
   */
  async getUnreadCount(): Promise<number> {
    return fetchWithAuth<number>('/payments/messages/unread/count');
  },

  /**
   * Create a payment request
   */
  async createRequest(data: CreatePaymentRequestData): Promise<RequestPaymentResponse> {
    return fetchWithAuth<RequestPaymentResponse>('/payments/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get all pending requests (received + sent)
   */
  async getPendingRequests(): Promise<PendingRequestsResponse> {
    return fetchWithAuth<PendingRequestsResponse>('/payments/requests/pending');
  },

  /**
   * Get count of pending requests awaiting your action
   */
  async getPendingRequestsCount(): Promise<number> {
    return fetchWithAuth<number>('/payments/requests/pending/count');
  },

  /**
   * Pay a request you received
   */
  async payRequest(data: PayRequestData): Promise<RequestPaymentResponse> {
    return fetchWithAuth<RequestPaymentResponse>('/payments/request/pay', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Decline a request you received
   */
  async declineRequest(data: DeclineRequestData): Promise<RequestPaymentResponse> {
    return fetchWithAuth<RequestPaymentResponse>('/payments/request/decline', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Cancel a request you sent
   */
  async cancelRequest(paymentId: number): Promise<RequestPaymentResponse> {
    return fetchWithAuth<RequestPaymentResponse>(`/payments/request/${paymentId}`, {
      method: 'DELETE',
    });
  },
};

// ============ COUNTRY API ============

export const countryApi = {
  /**
   * Get all countries with details (code, name, dialCode, flag)
   */
  async getCountries(): Promise<CountryDto[]> {
    return fetchWithAuth<CountryDto[]>('/countries/details');
  },
};

// ============ ACCOUNT API ============

export const accountApi = {
  /**
   * Get account details for current user
   */
  async getDetails(): Promise<AccountDetailsResponse> {
    return fetchWithAuth<AccountDetailsResponse>('/account');
  },
};

// ============ PAYMENT OPTIONS API ============

export const paymentOptionApi = {
  /**
   * Get list of saved payment methods
   */
  async getList(): Promise<PaymentOption[]> {
    return fetchWithAuth<PaymentOption[]>('/payment-option/list');
  },

  /**
   * Get payment provider for current user (STRIPE or FLUTTERWAVE)
   */
  async getProvider(): Promise<PaymentProviderResponse> {
    return fetchWithAuth<PaymentProviderResponse>('/payment-option/provider');
  },

  /**
   * Create Stripe SetupIntent for adding a card
   */
  async createSetupIntent(): Promise<SetupIntentResponse> {
    return fetchWithAuth<SetupIntentResponse>('/payment-option/setup-intent', {
      method: 'POST',
    });
  },

  /**
   * Add card via Flutterwave (for African users)
   */
  async addFlutterwaveCard(data: AddFlutterwaveCardRequest): Promise<AddFlutterwaveCardResponse> {
    return fetchWithAuth<AddFlutterwaveCardResponse>('/payment-option/add-card', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============ TOP-UP API ============

export const topUpApi = {
  /**
   * Get preview of XRP purchase - shows what user will receive
   * Includes markup on rate and all fees
   */
  async getPreview(data: BuyXrpQuoteRequest): Promise<BuyXrpQuoteResponse> {
    return fetchWithAuth<BuyXrpQuoteResponse>('/topups/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Create top-up intent - charges saved payment method to add funds
   * Funds are automatically converted to XRP after successful payment
   */
  async createIntent(data: CreateTopUpIntentRequest): Promise<CreateTopUpIntentResponse> {
    return fetchWithAuth<CreateTopUpIntentResponse>('/topups/intents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get XRP to fiat exchange rate (raw market rate, no markup)
   * @deprecated Use getPreview() instead for accurate buy preview
   */
  async getXrpRate(currency: string): Promise<XrpRateInfo> {
    const response = await fetchWithAuth<string>(`/xrp/rates/xrp-to-fiat?currency=${currency}`);
    const match = response.match(/1 XRP = ([\d.]+) (\w+)/);
    if (!match) {
      throw new Error('Invalid rate format');
    }
    return {
      rate: parseFloat(match[1]),
      currency: match[2],
    };
  },
};

// ============ EXPORT ALL ============

export const api = {
  auth: authApi,
  user: userApi,
  kyc: kycApi,
  portfolio: portfolioApi,
  transaction: transactionApi,
  transfer: transferApi,
  payment: paymentApi,
  country: countryApi,
  account: accountApi,
  paymentOption: paymentOptionApi,
  topUp: topUpApi,
};

export default api;
