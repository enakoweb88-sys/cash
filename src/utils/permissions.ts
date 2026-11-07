import { CollectorUser, Collection } from '../types';

// Display helpers are based on server-granted cash access, never email/title.
export const isCeoUser = (user?: CollectorUser) => user?.cashLevel === 'administrator';
export const isSeniorCollector = (user?: CollectorUser) => user?.cashLevel === 'administrator';
export const hasOperationalAccess = (user?: CollectorUser) => user?.cashLevel === 'administrator';
export const canManageCollectors = hasOperationalAccess;
export const canConfigureSystem = hasOperationalAccess;
export const canEditExistingRecords = hasOperationalAccess;

export const normalizeCollectorRole = (role?: string) =>
  'Field Cash Collector';

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
