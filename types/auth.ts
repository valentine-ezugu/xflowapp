// Auth request/response types matching backend DTOs

// Country types
export interface CountryDto {
  code: string;      // ISO-2 code: "PL", "NG", "US"
  name: string;      // Full name: "Poland", "Nigeria", "United States"
  dialCode: string;  // Phone dial code: "+48", "+234", "+1"
  flag: string;      // Flag emoji: "🇵🇱", "🇳🇬", "🇺🇸"
}

export interface RegisterRequest {
  phoneNumber: string;
  email: string;
}

export interface LoginRequest {
  phoneNumber: string;
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  otpCode: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

// KYC types
export interface SavePersonalInfoRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date: "1990-01-15"
  countryOfResidence: string; // ISO-2: "US"
  nationality: string; // ISO-2: "US"
}

export interface SaveAddressRequest {
  street: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string; // ISO-2
}

export interface KycStep {
  step: 'PROFILE' | 'ADDRESS' | 'VERIFICATION';
  complete: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface KycStatusResponse {
  kycTier: 'NONE' | 'LEVEL0' | 'LEVEL1';
  steps: KycStep[];
  canOperate: boolean;
  canReceive: boolean;
  verificationUrl: string | null;
}

export interface KycVerifyResponse {
  action: string;
  status: string;
  kycCaseId: number;
  hostedUrl: string | null;  // Deprecated - always null
  accessToken: string;       // Sumsub SDK access token
  currentTier: string | null;
}

// User profile
export interface UserProfile {
  id: number;
  firstname: string | null;
  surname: string | null;
  email: string | null;
  phoneNumber: string;
  verified: boolean;
  dateOfBirth: string | null;
  xflowTag: string | null;
  defaultCurrency: string | null; // User's fiat currency (EUR, USD, PLN, etc.) - set during onboarding
  countryOfResidence: string | null;
}

export interface AddressResponse {
  id: number;
  street: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

// Auth state for context
export type AuthStatus =
  | 'loading'           // Checking stored tokens
  | 'unauthenticated'   // No valid tokens
  | 'authenticated';    // Has valid tokens

export interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  kycStatus: KycStatusResponse | null;
}
