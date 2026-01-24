// Account types
export interface AccountDetailsResponse {
  accountId: number;
  email: string;
  phoneNumber: string;
  createdAt: string;
}

// Payment Option types
export interface PaymentOption {
  id: number;
  last4: string;
  brand: string;
  expiryMonth: string;
  expiryYear: string;
}

export type PaymentProvider = 'STRIPE' | 'FLUTTERWAVE';
export type AddCardFlow = 'SETUP_INTENT' | 'DIRECT_CARD';

export interface PaymentProviderResponse {
  provider: PaymentProvider;
  addCardFlow: AddCardFlow;
}

// Stripe setup intent response
export interface SetupIntentResponse {
  clientSecret?: string;
  provider: string;
  message?: string;
}

// Flutterwave add card request
export interface AddFlutterwaveCardRequest {
  cardNumber: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  currency: string;
}

// Flutterwave add card response
export interface AddFlutterwaveCardResponse {
  success: boolean;
  paymentOptionId: number;
  last4: string;
  brand: string;
}
