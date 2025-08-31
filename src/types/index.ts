// Types TypeScript pour l'application de facturation

export interface AppUser {
  id: string;
  email: string;
}

export interface Invoice {
  invoiceNumber: string;
  invoiceDate: string;
  deliveryDate: string;
  paymentTerms: '10 jours à réception' | '20 jours à réception' | '30 jours à réception';
  paymentDue: string;
}

export interface CompanyInfo {
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  siret: string;
  accountName: string; // Nom associé au compte
  bic: string;
  iban: string;
  bankName: string;
  logoUrl?: string; // URL du logo uploadé sur Supabase Storage
}

export interface ClientInfo {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  siret: string;
  phone: string;
  email: string;
}

export interface Article {
  id: string;
  name: string;
  description: string[];
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface SavedInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  deliveryDate: string;
  paymentTerms: '10 jours à réception' | '20 jours à réception' | '30 jours à réception';
  paymentDue: string;
  companyInfo: CompanyInfo;
  clientInfo: ClientInfo;
  articles: Article[];
  totalAmount: number;
  status: 'draft' | 'finalized';
  createdAt: string;
  finalizedAt?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  default_company_info: CompanyInfo;
  default_client_info: ClientInfo;
  default_articles: Article[];
  created_at: string;
  updated_at: string;
}

export interface AddressSuggestion {
  place_id: string;
  description: string;
  matched_substrings: Array<{
    offset: number;
    length: number;
  }>;
}

export type ViewType = 'landing' | 'auth' | 'dashboard';
export type AuthModeType = 'signin' | 'signup';
export type MessageType = {
  type: 'success' | 'error' | 'info';
  text: string;
} | null;
