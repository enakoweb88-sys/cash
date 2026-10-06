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

export const DEFAULT_ACCOUNTS: UserAccount[] = [];

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_COLLECTIONS: Collection[] = [];

export function formatXAF(amount: number | string | null | undefined): string {
  if (amount === undefined || amount === null || amount === '') return '0';
  const n = Number(String(amount).replace(/,/g, ''));
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatCommaNumber(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const str = String(value).replace(/,/g, '');
  if (isNaN(Number(str)) && str !== '-') return String(value);
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function cleanCommas(value: string | number | undefined | null): string {
  return String(value || '').replace(/,/g, '');
}

