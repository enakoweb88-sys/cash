import { CollectorUser, Collection } from '../types';

const normalizedRole = (user?: CollectorUser) => (user?.role || '').trim().toLowerCase();

export const isCeoUser = (user?: CollectorUser) =>
  user?.email?.trim().toLowerCase() === 'ceo@enako.com' ||
  ['ceo', 'ceo / senior manager', 'ceo / executive manager'].includes(normalizedRole(user));

export const isSeniorCollector = (user?: CollectorUser) =>
  ['senior cash officer', 'senior cash collector', 'senior manager'].includes(normalizedRole(user));

export const hasOperationalAccess = (user?: CollectorUser) =>
  isCeoUser(user) || isSeniorCollector(user);

export const canManageCollectors = (user?: CollectorUser) => isCeoUser(user);

export const canConfigureSystem = (user?: CollectorUser) => isCeoUser(user);

export const canEditExistingRecords = (user?: CollectorUser) => isCeoUser(user);

export const normalizeCollectorRole = (role?: string) =>
  isSeniorCollector({ role } as CollectorUser) ? 'Senior Cash Officer' : 'Field Cash Collector';

export function canViewCollection(user: CollectorUser | undefined, collection: Collection): boolean {
  if (!user) return false;
  if (hasOperationalAccess(user)) return true;
  if (collection.assignedCollectorId) {
    return [user.id, user.terminalId].filter(Boolean).includes(collection.assignedCollectorId);
  }
  // Legacy records may only contain the collector's full name.
  const name = user.name?.trim().toLowerCase();
  return Boolean(name && collection.assignedCollectorName?.trim().toLowerCase() === name);
}
