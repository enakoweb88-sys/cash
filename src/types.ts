export type ViewType = 'dashboard' | 'new-collection' | 'clients' | 'history';

export type TransactionStatus = 'COMPLETE' | 'PENDING' | 'CANCELLED';

export interface Client {
  id: string; // e.g. "C-9821"
  name: string;
  address: string;
  region: 'North Sector' | 'South Sector' | 'East Sector' | 'West Sector';
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
  location?: string;
  notes?: string;
  receiptUrl?: string;
  receiptName?: string;
  isDraft?: boolean;
}

export interface CollectorUser {
  id: string;
  name: string;
  email: string;
  terminalId: string;
  branch: string;
  avatarLetter: string;
  isLoggedIn: boolean;
}

export interface FilterOptions {
  searchQuery: string;
  region: string;
  balanceFilter: string;
}
