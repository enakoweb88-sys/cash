export type ViewType = 'dashboard' | 'new-collection' | 'clients' | 'history' | 'transactions' | 'create-transaction' | 'update-rates' | 'kyc' | 'collectors';

export type TransactionStatus = 'COMPLETE' | 'PENDING' | 'CANCELLED';

export type TransactionType = 'COLLECTING' | 'PAYOUT';

export type DepositDestination = 'ECOBANK' | 'AFRILAND FIRST BANK' | 'UBA' | 'MTN SPECTRUM';

export interface ExchangeRateItem {
  code: string;
  name: string;
  flag: string;
  buyingRate: string;
  sellingRate: string;
  change24h: number;
  lastUpdated?: string;
}

export interface Client {
  id: string; // e.g. "C-9821"
  name: string;
  address: string;
  region: string; // Country / Region / City worldwide
  lastVisit: string;
  outstandingBalance: number; // in XAF
  phone?: string;
  email?: string;
  kycStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  kycId?: string;
  idNumber?: string;
  occupation?: string;
  nationality?: string;
  bankName?: string;
  accountNumber?: string;
  verificationDate?: string;
}

export interface Collection {
  id: string; // e.g. "COL-8923"
  clientId: string;
  clientName: string;
  amount: number;
  time: string;
  timestamp: string;
  status: TransactionStatus;
  type?: TransactionType;
  depositDestination?: DepositDestination;
  location?: string;
  notes?: string;
  receiptUrl?: string;
  receiptName?: string;
  shortageAmount?: number;
  extraAmount?: number;
  summaryNote?: string;
  assignedCollectorId?: string;
  assignedCollectorName?: string;
  createdBy?: string;
  currency?: string;
  exchangeRate?: number;
  fxTransactionId?: string;
  clientEmail?: string;
}

export interface FxTransaction {
  id: string;
  entity: string;
  type: 'Send' | 'Receive';
  channel: string;
  currency: string;
  amount: number;
  amountInXaf: number;
  exchangeRate: number;
  buyingRate?: number;
  sellingRate?: number;
  buyingAmountXaf?: number;
  sellingAmountXaf?: number;
  sellingCurrency?: string;
  sellingCurrencyAmount?: number;
  marginXaf?: number;
  status: 'PENDING' | 'SETTLED' | 'CANCELLED';
  description?: string;
  createdAt: string;
  collectionId?: string;
  assignedCollectorId?: string;
  assignedCollectorName?: string;
}

export interface KycSubmission {
  id: string;
  applicantName: string;
  applicantType: string;
  email?: string;
  phone?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  payload?: Record<string, any>;
  documents?: {
    id: string;
    documentType: string;
    fileName: string;
    fileUrl?: string;
    mimeType?: string;
  }[];
  reviewedBy?: {
    id: string;
    fullName: string;
  };
  createdAt: string;
}

export interface CollectorUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  terminalId: string;
  branch: string;
  role?: string;
  avatarLetter: string;
  isLoggedIn: boolean;
}

export interface UserAccount {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
  branch: string;
  role: string;
  terminalId: string;
  createdAt: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  totalCollections?: number;
  totalVolumeXaf?: number;
}

export interface FilterOptions {
  searchQuery: string;
  region: string;
  balanceFilter: string;
}

