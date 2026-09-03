export type ViewType = 'dashboard' | 'new-collection' | 'clients' | 'history';

export type TransactionStatus = 'COMPLETE' | 'PENDING' | 'CANCELLED';

export type TransactionType = 'COLLECTING' | 'PAYOUT';

export type DepositDestination = 'ECOBANK' | 'AFRILAND FIRST BANK' | 'UBA' | 'MTN SPECTRUM';

export interface Client {
  id: string; // e.g. "C-9821"
  name: string;
  address: string;
  region: 'Douala' | 'Yaounde' | 'Buea';
  lastVisit: string;
  outstandingBalance: number; // in XAF
  phone?: string;
  email?: string;
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
  isDraft?: boolean;
  shortageAmount?: number;
  extraAmount?: number;
  summaryNote?: string;
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
}

export interface FilterOptions {
  searchQuery: string;
  region: string;
  balanceFilter: string;
}
