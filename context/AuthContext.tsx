import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import {
  AuthState,
  AuthStatus,
  UserProfile,
  KycStatusResponse,
  RegisterRequest,
  LoginRequest,
  VerifyOtpRequest,
  SavePersonalInfoRequest,
  SaveAddressRequest,
} from '@/types/auth';
import { api, tokenStorage, setTokenRefreshFailedCallback, ApiError } from '@/services/api';
import { webSocketService } from '@/services/websocket';

// Context value type
interface AuthContextValue extends AuthState {
  // Auth actions
  register: (data: RegisterRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  verifyOtp: (data: VerifyOtpRequest, isRegistration: boolean) => Promise<void>;
  logout: () => Promise<void>;

  // KYC actions
  refreshKycStatus: () => Promise<void>;
  savePersonalInfo: (data: SavePersonalInfoRequest) => Promise<void>;
  saveAddress: (data: SaveAddressRequest) => Promise<void>;
  startVerification: () => Promise<string>; // Returns Sumsub URL

  // User actions
  refreshProfile: () => Promise<void>;

  // Error state
  error: string | null;
  clearError: () => void;

  // Loading states
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    accessToken: null,
    refreshToken: null,
    user: null,
    kycStatus: null,
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Handle logout (also used when refresh token fails)
  const logout = useCallback(async () => {
    // Prevent multiple simultaneous logout attempts
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // Disconnect WebSocket
      webSocketService.disconnect();
      // Clear tokens
      await api.auth.logout();
    } catch (err) {
      console.error('Error during logout cleanup:', err);
    }

    // Always update state and navigate, even if cleanup fails
    setState({
      status: 'unauthenticated',
      accessToken: null,
      refreshToken: null,
      user: null,
      kycStatus: null,
    });

    // Navigate to login
    router.replace('/(auth)/login');
    setIsLoggingOut(false);
  }, [isLoggingOut]);

  // Set up token refresh failed callback
  useEffect(() => {
    setTokenRefreshFailedCallback(logout);
  }, [logout]);

  // Check for existing tokens on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = await tokenStorage.getAccessToken();
        const refreshToken = await tokenStorage.getRefreshToken();

        if (accessToken && refreshToken) {
          // Try to fetch user profile to validate token
          try {
            const [user, kycStatus] = await Promise.all([
              api.user.getProfile(),
              api.kyc.getStatus(),
            ]);

            setState({
              status: 'authenticated',
              accessToken,
              refreshToken,
              user,
              kycStatus,
            });

            // Connect to WebSocket for real-time notifications
            webSocketService.connect();
          } catch (err) {
            // Token invalid, clear and go to login
            await tokenStorage.clearTokens();
            setState({
              status: 'unauthenticated',
              accessToken: null,
              refreshToken: null,
              user: null,
              kycStatus: null,
            });
          }
        } else {
          setState(prev => ({
            ...prev,
            status: 'unauthenticated',
          }));
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          status: 'unauthenticated',
        }));
      }
    };

    initializeAuth();
  }, []);

  // Register - sends OTP
  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.register(data);
      // OTP sent successfully - navigation handled by caller
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login - sends OTP
  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.login(data);
      // OTP sent successfully - navigation handled by caller
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify OTP (for both login and registration)
  const verifyOtp = useCallback(async (data: VerifyOtpRequest, isRegistration: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[Auth] Verifying OTP...');
      const authResponse = isRegistration
        ? await api.auth.verifyRegistration(data)
        : await api.auth.verifyLogin(data);

      console.log('[Auth] OTP verified, tokens received');

      // Fetch user profile and KYC status
      console.log('[Auth] Fetching profile and KYC status...');
      let user: UserProfile;
      let kycStatus: KycStatusResponse;

      try {
        user = await api.user.getProfile();
        console.log('[Auth] Profile fetched:', user);
      } catch (profileErr) {
        console.error('[Auth] Failed to fetch profile:', profileErr);
        throw profileErr;
      }

      try {
        kycStatus = await api.kyc.getStatus();
        console.log('[Auth] KYC status fetched:', kycStatus);
      } catch (kycErr) {
        console.error('[Auth] Failed to fetch KYC status:', kycErr);
        throw kycErr;
      }

      setState({
        status: 'authenticated',
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        user,
        kycStatus,
      });

      // Connect to WebSocket for real-time notifications
      webSocketService.connect();

      // Navigate based on KYC status
      if (kycStatus.kycTier === 'NONE') {
        // Needs onboarding
        router.replace('/(onboarding)/personal-info');
      } else if (kycStatus.kycTier === 'LEVEL0' && !kycStatus.canOperate) {
        // Needs ID verification
        router.replace('/(onboarding)/verify-identity');
      } else {
        // Fully onboarded
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('[Auth] Verification error:', err);
      const message = err instanceof ApiError ? err.message : 'Verification failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh KYC status
  const refreshKycStatus = useCallback(async () => {
    try {
      const kycStatus = await api.kyc.getStatus();
      setState(prev => ({ ...prev, kycStatus }));
    } catch (err) {
      console.error('Failed to refresh KYC status:', err);
    }
  }, []);

  // Save personal info (KYC Step 1)
  const savePersonalInfo = useCallback(async (data: SavePersonalInfoRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.kyc.savePersonalInfo(data);
      await refreshKycStatus();
      // Navigate to address step
      router.push('/(onboarding)/address');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save personal info';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshKycStatus]);

  // Save address (KYC Step 2)
  const saveAddress = useCallback(async (data: SaveAddressRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.kyc.saveAddress(data);
      await refreshKycStatus();
      // Navigate to verification step
      router.push('/(onboarding)/verify-identity');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save address';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshKycStatus]);

  // Start ID verification (KYC Step 3) - returns Sumsub SDK access token
  const startVerification = useCallback(async (): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.kyc.startVerification();
      return response.accessToken;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to start verification';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    try {
      const user = await api.user.getProfile();
      setState(prev => ({ ...prev, user }));
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    register,
    login,
    verifyOtp,
    logout,
    refreshKycStatus,
    savePersonalInfo,
    saveAddress,
    startVerification,
    refreshProfile,
    error,
    clearError,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
