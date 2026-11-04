import type { Collection } from '../types';

// Only explicitly unsynced work may survive absence from a complete server snapshot.
export function reconcileCollections(local: Collection[], remote: Collection[], requestedAt: number) {
  const pending = local.filter(row => row.syncState === 'pending' || row.syncState === 'failed' || (row.syncedAt || 0) > requestedAt);
  const pendingIds = new Set(pending.map(row => row.id));
  return [...pending, ...remote.filter(row => !pendingIds.has(row.id)).map(row => ({ ...row, syncState: 'synced' as const }))];
}
