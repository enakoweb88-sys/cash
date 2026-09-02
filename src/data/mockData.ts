import { Client, Collection, CollectorUser } from '../types';

export const INITIAL_USER: CollectorUser = {
  id: 'COL-001',
  name: 'Collector User',
  email: 'collector@enako.cm',
  terminalId: 'ENK-001',
  branch: 'Douala Agency',
  avatarLetter: 'C',
  isLoggedIn: false,
};

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_COLLECTIONS: Collection[] = [];

export const INITIAL_DRAFTS: Collection[] = [];

export function formatXAF(amount: number): string {
  return new Intl.NumberFormat('en-US').format(amount);
}

