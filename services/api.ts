import * as SecureStore from 'expo-secure-store';
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

// Configuration
const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:8080/api/v1' // Android emulator localhost
  : 'https://api.xflow.com/api/v1'; // Production URL (update this)

// Token storage keys
const ACCESS_TOKEN_KEY = 'xflow_access_token';
const REFRESH_TOKEN_KEY = 'xflow_refresh_token';

// Token storage helpers
export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
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
    const response = await fetchWithAuth<AuthResponse>('/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);

    // Store tokens
    await tokenStorage.setTokens(response.accessToken, response.refreshToken);
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
   * Verify login OTP - returns tokens
   */
  async verifyLogin(data: VerifyOtpRequest): Promise<AuthResponse> {
    const response = await fetchWithAuth<AuthResponse>('/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);

    // Store tokens
    await tokenStorage.setTokens(response.accessToken, response.refreshToken);
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
    return fetchWithAuth<FindRecipientResponse>(`/transfer/find?query=${encodeURIComponent(query)}`);
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

// ============ EXPORT ALL ============

export const api = {
  auth: authApi,
  user: userApi,
  kyc: kycApi,
  portfolio: portfolioApi,
  transaction: transactionApi,
  transfer: transferApi,
  payment: paymentApi,
};

export default api;
