import { Collection, TransactionStatus } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1';

export async function fetchRemoteCollections(): Promise<Collection[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/cash-collections?limit=100`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch from backend');
    const data = await res.json();
    const items = data.items || [];

    return items.map((item: any) => {
      let descParsed: any = {};
      try {
        if (item.description && item.description.startsWith('{')) {
          descParsed = JSON.parse(item.description);
        }
      } catch (e) {}

      return {
        id: item.id || `COL-${Date.now()}`,
        clientId: item.clientId || 'C-CLIENT',
        clientName: item.clientName || 'Client',
        amount: Number(item.amountCollected || 0),
        time: item.collectionTime ? new Date(item.collectionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
        timestamp: item.collectionTime || new Date().toISOString(),
        status: item.status as TransactionStatus,
        type: descParsed.type || 'COLLECTING',
        depositDestination: descParsed.depositDestination,
        location: item.location,
        notes: descParsed.notes || item.description,
        shortageAmount: descParsed.shortageAmount || 0,
        extraAmount: descParsed.extraAmount || 0,
        summaryNote: descParsed.summaryNote,
        receiptUrl: item.receiptUrl,
      };
    });
  } catch (error) {
    console.warn('Backend API fetch notice:', error);
    return [];
  }
}

export async function createRemoteCollection(collection: Collection): Promise<boolean> {
  try {
    const descriptionObj = {
      type: collection.type || 'COLLECTING',
      depositDestination: collection.depositDestination,
      notes: collection.notes,
      shortageAmount: collection.shortageAmount || 0,
      extraAmount: collection.extraAmount || 0,
      summaryNote: collection.summaryNote,
    };

    const payload = {
      clientName: collection.clientName,
      location: collection.location || 'Douala Field Sector',
      amountCollected: Number(collection.amount),
      outstandingBalance: 0,
      status: collection.status || 'PENDING',
      description: JSON.stringify(descriptionObj),
      receiptUrl: collection.receiptUrl,
    };

    const res = await fetch(`${API_BASE_URL}/cash-collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (error) {
    console.warn('Backend API post notice:', error);
    return false;
  }
}

export async function updateRemoteCollectionStatus(
  collectionId: string,
  status: TransactionStatus
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/cash-collections/${collectionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    return res.ok;
  } catch (error) {
    console.warn('Backend API update status notice:', error);
    return false;
  }
}
