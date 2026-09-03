import { Client, Collection, CollectorUser, UserAccount } from '../types';

export const INITIAL_USER: CollectorUser = {
  id: 'COL-001',
  name: 'Christian Enako',
  email: 'collector@enako.cm',
  phone: '+237 670 123 456',
  terminalId: 'ENK-001',
  branch: 'Douala Main Hub',
  role: 'Field Cash Collector',
  avatarLetter: 'C',
  isLoggedIn: false,
};

export const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'COL-001',
    firstName: 'Christian',
    lastName: 'Enako',
    fullName: 'Christian Enako',
    email: 'collector@enako.cm',
    phone: '+237 670 123 456',
    password: 'password123',
    branch: 'Douala Main Hub',
    role: 'Field Cash Collector',
    terminalId: 'ENK-001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'COL-002',
    firstName: 'Francis',
    lastName: 'Ngu',
    fullName: 'Francis Ngu',
    email: 'francis@enako.cm',
    phone: '+237 690 987 654',
    password: 'password123',
    branch: 'Yaoundé Branch',
    role: 'Lead Cash Auditor',
    terminalId: 'ENK-002',
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_COLLECTIONS: Collection[] = [];

export const INITIAL_DRAFTS: Collection[] = [];

export function formatXAF(amount: number): string {
  return new Intl.NumberFormat('en-US').format(amount);
}

