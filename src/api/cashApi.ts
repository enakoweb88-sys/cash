import { Client, Collection, TransactionStatus, UserAccount } from '../types';

const getApiBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  return resolveCashApiBaseUrl(envUrl, typeof window !== 'undefined' ? window.location : undefined);
};

// Cash uses its own Access-protected hostname and its own edge proxy.
export function resolveCashApiBaseUrl(configured: string | undefined, location?: { hostname: string; origin: string }) {
  if (location?.hostname === 'enakootc.com') return location.origin + '/api/v1';
  return configured && configured !== 'undefined' ? configured.replace(/\/$/, '') : 'https://api.enakoos.com/api/v1';
}

const API_BASE_URL = getApiBaseUrl();

export async function fetchRemoteCollections(): Promise<Collection[]> {
  try {
    const items: any[] = [];
    let page = 1;
    while (true) {
      const res = await cashFetch(`${API_BASE_URL}/cash-collections?limit=100&page=${page}`, {
        headers: { 'Content-Type': 'application/json', ...cashHeaders() }, cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch collections from backend');
      const data = await res.json();
      if (!Array.isArray(data.items)) throw new Error('Invalid collection response');
      items.push(...data.items);
      if (!data.totalPages || page >= Number(data.totalPages)) break;
      page++;
    }

    return items.map((item: any) => {
      let descParsed: any = {};
      try {
        if (item.description && item.description.startsWith('{')) {
          descParsed = JSON.parse(item.description);
        }
      } catch (e) {}

      const targetAmount = descParsed.targetAmount || Number(item.amountCollected || 0);
      const actualAmount = descParsed.actualAmountCollected !== undefined 
        ? Number(descParsed.actualAmountCollected) 
        : (item.status === 'COMPLETE' ? Number(item.amountCollected || 0) : 0);
      const shortageAmount = descParsed.shortageAmount !== undefined
        ? Number(descParsed.shortageAmount)
        : Math.max(0, targetAmount - actualAmount);

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
        shortageAmount,
        extraAmount: descParsed.extraAmount || 0,
        targetAmount,
        actualAmountCollected: actualAmount,
        summaryNote: descParsed.summaryNote,
        receiptUrl: item.receiptUrl || descParsed.receiptUrl,
        receiptName: item.receiptName || descParsed.receiptName,
        assignedCollectorId: item.collectorId,
        assignedCollectorName: item.collector?.fullName,
        clientEmail: descParsed.clientEmail || item.clientEmail,
      };
    });
  } catch (error) {
    console.warn('Backend API fetch notice:', error);
    throw error;
  }
}

export async function createRemoteCollection(collection: Collection): Promise<boolean> {
  try {
    const descriptionObj = {
      type: collection.type || 'COLLECTING',
      depositDestination: collection.depositDestination,
      notes: collection.notes,
      targetAmount: collection.targetAmount || collection.amount,
      actualAmountCollected: collection.actualAmountCollected !== undefined ? collection.actualAmountCollected : (collection.status === 'COMPLETE' ? collection.amount : 0),
      shortageAmount: collection.shortageAmount || 0,
      extraAmount: collection.extraAmount || 0,
      summaryNote: collection.summaryNote,
      assignedCollectorId: collection.assignedCollectorId,
      assignedCollectorName: collection.assignedCollectorName,
      receiptUrl: collection.receiptUrl,
      receiptName: collection.receiptName,
      clientEmail: collection.clientEmail,
    };

    const payload = {
      id: collection.id,
      collectorId: collection.assignedCollectorId,
      currency: collection.currency || 'XAF',
      clientName: collection.clientName,
      location: collection.location || 'Douala Field Sector',
      amountCollected: Number(collection.amount),
      outstandingBalance: collection.shortageAmount || 0,
      collectionTime: collection.timestamp,
      status: collection.status || 'PENDING',
      description: JSON.stringify(descriptionObj),
      receiptUrl: collection.receiptUrl,
    };

    const form = new FormData();
    for (const [key, value] of Object.entries(payload)) if (value !== undefined) form.append(key, String(value));
    if (collection.receiptUrl?.startsWith('data:')) { const blob = await (await cashFetch(collection.receiptUrl)).blob(); form.append('receipt', blob, collection.receiptName || 'receipt.' + (blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : 'jpg')); }
    const headers = new Headers(cashHeaders()); headers.delete('Content-Type');
    const res = await cashFetch(API_BASE_URL + '/cash-collections', { method: 'POST', headers, body: form });

    return res.ok;
  } catch (error) {
    console.warn('Backend API post notice:', error);
    return false;
  }
}

export async function updateRemoteCollectionStatus(
  collectionId: string,
  status: TransactionStatus,
  metadata?: {
    actualAmountCollected?: number;
    shortageAmount?: number;
    extraAmount?: number;
    summaryNote?: string;
  }
): Promise<boolean> {
  try {
    const res = await cashFetch(`${API_BASE_URL}/cash-collections/${collectionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...cashHeaders() },
      body: JSON.stringify({ status, ...metadata }),
    });

    return res.ok;
  } catch (error) {
    console.warn('Backend API update status notice:', error);
    return false;
  }
}

// ─── COLLECTORS / USERS API (SUPABASE BACKEND) ───

export async function fetchRemoteClients(): Promise<any[]> {
  try {
    const res = await cashFetch(`${API_BASE_URL}/cash-collections/clients`, {
      headers: { 'Content-Type': 'application/json', ...cashHeaders() },
    });
    if (!res.ok) throw new Error('Records could not be loaded. Check your access and connection.');
    const clients = await res.json();
    return Array.isArray(clients) ? clients : [];
  } catch (error) {
    console.warn('Backend clients fetch notice:', error);
    return [];
  }
}

export async function createRemoteClient(clientData: any): Promise<any | null> {
  try {
    const res = await cashFetch(`${API_BASE_URL}/cash-collections/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...cashHeaders() },
      body: JSON.stringify(clientData),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Backend client create notice:', error);
    return null;
  }
}

function safeCollectorProfile(value: any): UserAccount {
  return { id: value.id, firstName: value.firstName || '', lastName: value.lastName || '', fullName: value.fullName || '', email: value.email || '', phone: value.phone || '', branch: value.branch || '', role: value.role || '', terminalId: value.terminalId || '', createdAt: value.createdAt, status: value.status };
}

export async function fetchRemoteCollectors(): Promise<any[]> {
  try {
    const res = await cashFetch(`${API_BASE_URL}/cash-collections/collectors`, {
      headers: { 'Content-Type': 'application/json', ...cashHeaders() },
    });
    if (!res.ok) return [];
    const collectors = await res.json();
    return Array.isArray(collectors) ? collectors.map(safeCollectorProfile) : [];
  } catch (error) {
    console.warn('Backend collectors fetch notice:', error);
    return [];
  }
}

export async function createRemoteCollector(collectorData: any): Promise<any> {
  const res = await cashFetch(API_BASE_URL + '/cash-collections/collectors', { method: 'POST', headers: cashHeaders(), body: JSON.stringify(collectorData) });
  if (!res.ok) throw new Error('Collector registration failed. Check details and cash administrator access.');
  return safeCollectorProfile(await res.json());
}

export async function deleteRemoteCollector(id: string, reason: string): Promise<boolean> {
  const res = await cashFetch(API_BASE_URL + '/cash-collections/collectors/' + encodeURIComponent(id), { method: 'DELETE', headers: cashHeaders(), body: JSON.stringify({ confirmation: id, reason }) });
  if (!res.ok) throw new Error('Collector deactivation failed. Only dedicated cash accounts can be deactivated.');
  return true;
}

export async function deleteAllRemoteCollectors(): Promise<boolean> {
  try {
    const res = await cashFetch(`${API_BASE_URL}/cash-collections/collectors`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...cashHeaders() },
    });
    return res.ok;
  } catch (error) {
    console.warn('Backend all collectors delete notice:', error);
    return false;
  }
}

// ─── FX TRANSACTIONS API ───

export function getLocalTransactions(): any[] {
  try {
    const raw = localStorage.getItem('enako_cash_transactions');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalTransaction(tx: any) {
  try {
    const current = getLocalTransactions();
    const exists = current.find((item) => item.id === tx.id);
    if (!exists) {
      const updated = [tx, ...current];
      localStorage.setItem('enako_cash_transactions', JSON.stringify(updated));
    }
  } catch (e) {}
}

const REAL_DATABASE_TRANSACTION_RECORDS: any[] = [];


export async function fetchRemoteTransactions(params?: {
  search?: string;
  limit?: number;
  dateRange?: string;
  type?: string;
  status?: string;
  channel?: string;
}): Promise<any> {
  let remoteItems: any[] = [];
  let remoteSucceeded = false;
  try {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.limit) q.append('limit', String(params.limit || 200));
    if (params?.dateRange) q.append('dateRange', params.dateRange);
    if (params?.type) q.append('type', params.type);
    if (params?.status) q.append('status', params.status);
    if (params?.channel) q.append('channel', params.channel);

    const headers = getAuthHeaders();
    const res = await cashFetch(`${API_BASE_URL}/cash-transactions?${q.toString()}`, {
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      remoteItems = data.items || (Array.isArray(data) ? data : []);
      remoteSucceeded = true;
    }
  } catch (error) {
    console.warn('Remote transactions fetch notice:', error);
  }

  if (!remoteSucceeded) throw new Error('Transactions could not be loaded from the server.');
  const combined = remoteItems;

  // Map database item properties cleanly
  const mapped = combined.map((item: any) => {
    // The database rate has four decimal places. For NGN, recover the effective
    // rate from the saved monetary amounts instead of inverting that rounded rate.
    const appliedRate = item.currency === 'NGN' && Number(item.amount) > 0 && Number(item.amountInXaf) > 0
      ? Number(item.amountInXaf) / Number(item.amount)
      : Number(item.exchangeRate || item.buyingRate || 1);
    return {
      id: String(item.id || item.reference || `FX-${Math.floor(Math.random() * 10000)}`),
      entity: item.entity || 'Client Entity',
      type: item.type || 'Receive',
      channel: item.channel || 'Bank Transfer',
      currency: item.currency || 'XAF',
      amount: Number(item.amount || 0),
      amountInXaf: Number(item.amountInXaf || item.amount || 0),
      exchangeRate: appliedRate,
      buyingRate: Number(item.buyingRate || appliedRate),
      sellingRate: Number(item.sellingRate || appliedRate),
      status: (item.status || 'SETTLED').toUpperCase(),
      description: item.description || item.reference || '',
      createdAt: item.createdAt || new Date().toISOString(),
    };
  });

  // Filter combined if params passed
  let filtered = mapped;
  if (params?.search) {
    const term = params.search.toLowerCase();
    filtered = filtered.filter((tx) =>
      (tx.entity || '').toLowerCase().includes(term) ||
      (tx.id || '').toLowerCase().includes(term) ||
      (tx.currency || '').toLowerCase().includes(term)
    );
  }
  if (params?.type && params.type !== 'All Types') {
    filtered = filtered.filter((tx) => tx.type === params.type);
  }
  if (params?.status && params.status !== 'All Status') {
    filtered = filtered.filter((tx) => tx.status === params.status);
  }

  return { items: filtered, totals: [] };
}

const cashTransactionRequests = new Map<string, string>();
export async function createRemoteTransaction(payload: any): Promise<boolean> {
  const signature = JSON.stringify(payload);
  const requestKey = cashTransactionRequests.get(signature) || crypto.randomUUID();
  cashTransactionRequests.set(signature, requestKey);
  const newTx = {
    id: payload.id || `FX-${Math.floor(1000 + Math.random() * 9000)}`,
    ...payload,
    createdAt: payload.createdAt || new Date().toISOString(),
  };

  try {
    const res = await cashFetch(`${API_BASE_URL}/cash-transactions`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Idempotency-Key': requestKey },
      body: JSON.stringify(newTx),
    });
    if (!res.ok) return false;
    const saved = await res.json();
    cashTransactionRequests.delete(signature);
    return true;
  } catch (error) {
    console.warn('Remote transaction creation note:', error);
    return false;
  }
}

export async function settleRemoteTransaction(id: string, charges?: number): Promise<boolean> {
  const res = await cashFetch(API_BASE_URL + '/cash-transactions/' + encodeURIComponent(id) + '/status/SETTLED', { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ charges: charges || 0 }) });
  if (!res.ok) throw new Error('Settlement was not saved. Refresh and check the transaction status.');
  return true;
}

export interface CashProfile { id: string; name: string; email: string; terminalId: string; branch: string; cashLevel: 'operator' | 'administrator' }
const CASH_TOKEN = 'enako_cash_session_v1';
export const hasCashSession = () => Boolean(sessionStorage.getItem(CASH_TOKEN));
export const clearCashSession = () => { sessionStorage.removeItem(CASH_TOKEN); sessionStorage.removeItem('enako_cash_os_session_v1'); sessionStorage.removeItem('enako_cash_os_refresh_v1'); };
const cashHeaders = (): Record<string, string> => ({ 'Content-Type': 'application/json', ...(sessionStorage.getItem(CASH_TOKEN) ? { Authorization: 'Bearer ' + sessionStorage.getItem(CASH_TOKEN) } : {}) });
const getAuthHeaders = cashHeaders;
async function cashFetch(url: string, options: RequestInit = {}) { return fetch(url, { ...options, credentials: 'same-origin', cache: 'no-store' }); }
export async function authenticatePortalUser(identifier: string, password: string): Promise<{ success: boolean; user?: CashProfile; error?: string }> {
  clearCashSession();
  try {
    const res = await cashFetch(API_BASE_URL + '/cash-auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) });
    if (!res.ok) return { success: false, error: 'Invalid cash credentials, account not provisioned, or too many attempts.' };
    const data = await res.json();
    if (!data.accessToken || !data.user || !['operator', 'administrator'].includes(data.user.cashLevel)) return { success: false, error: 'Invalid authentication response.' };
    sessionStorage.setItem(CASH_TOKEN, data.accessToken);
    return { success: true, user: data.user };
  } catch { clearCashSession(); return { success: false, error: 'Unable to reach the authentication service.' }; }
}
export async function restoreCashSession(): Promise<CashProfile | null> {
  if (!hasCashSession()) return null;
  try {
    const res = await cashFetch(API_BASE_URL + '/cash-auth/me', { headers: cashHeaders(), cache: 'no-store' });
    if (!res.ok) { clearCashSession(); return null; }
    return await res.json();
  } catch { clearCashSession(); return null; }
}
export async function logoutCashSession(): Promise<void> {
  const headers = cashHeaders(), authenticated = hasCashSession();
  clearCashSession();
  if (authenticated) await cashFetch(API_BASE_URL + '/cash-auth/logout', { method: 'POST', headers });
}

// Real KYC Submissions loaded dynamically from Backend API / Database
const REAL_DATABASE_KYC_RECORDS: any[] = [];

export async function fetchKycDocument(fileUrl: string, submissionId?: string, documentId?: string): Promise<Blob> {
  const url = new URL(fileUrl, new URL(API_BASE_URL).origin);
  if (url.origin !== new URL(API_BASE_URL).origin || !url.pathname.startsWith('/api/v1/cash-collections/documents/')) throw new Error('This legacy document requires the approved Cash document migration');
  const response = await cashFetch(url.href, { headers: cashHeaders() });
  if (!response.ok) throw new Error('Cash document unavailable or access denied'); return response.blob();
}

export async function fetchRemoteKycSubmissions(params?: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<any[]> {

  const q = new URLSearchParams();
  if (params?.status) q.append('status', params.status);
  if (params?.search) q.append('search', params.search);
  if (params?.limit) q.append('limit', String(params.limit || 100));

  const response = await cashFetch(API_BASE_URL + '/cash-kyc/submissions?' + q.toString(), { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('KYC records could not be loaded. Check management access.');
  const sourceList = await response.json();
  if (!Array.isArray(sourceList)) throw new Error('Invalid KYC response');

  // Map backend objects into KycSubmission format
  const mappedSubmissions = sourceList.map((item: any) => {
    const rawStatus = (item.kycStatus || item.status || (item.isVerified ? 'APPROVED' : 'PENDING')).toUpperCase();
    const validStatus = ['APPROVED', 'REJECTED', 'UNDER_REVIEW', 'PENDING'].includes(rawStatus)
      ? rawStatus
      : (item.isVerified ? 'APPROVED' : 'PENDING');

    return {
      id: String(item.id || item._id || `KYC-${Math.floor(Math.random() * 10000)}`),
      applicantName: item.applicantName || item.fullName || item.name || item.username || item.email || 'Registered User',
      applicantType: (item.applicantType || item.role || item.userType || 'INDIVIDUAL').toUpperCase(),
      email: item.email || item.personalEmail || '',
      phone: item.phone || item.phoneNumber || item.emergencyContact || '',
      status: validStatus,
      rejectionReason: item.rejectionReason || item.kycReason || item.reason || '',
      createdAt: item.createdAt || item.kycSubmittedAt || item.dateOfBirth || new Date().toISOString(),
      payload: item.payload || item.profileData || {
        fullName: item.fullName || item.name || item.applicantName,
        email: item.email || item.personalEmail,
        phone: item.phone || item.phoneNumber,
        cniNumber: item.cniNumber || item.identityNumber || item.taxpayerId,
        department: item.department?.name || item.department,
        address: item.address,
      },
      documents: item.documents || item.kycDocuments || item.attachments || [
        ...(item.cniUrl ? [{ id: 'cni-1', documentType: 'National ID (CNI)', fileName: 'CNI_Document.pdf', fileUrl: item.cniUrl }] : []),
        ...(item.avatarUrl ? [{ id: 'avatar-1', documentType: 'Profile Identity Photo', fileName: 'Profile_Photo.jpg', fileUrl: item.avatarUrl }] : []),
      ],
    };
  });

  // Local filter application
  let filtered = mappedSubmissions;
  if (params?.search) {
    const term = params.search.toLowerCase();
    filtered = filtered.filter(
      (k) =>
        (k.applicantName || '').toLowerCase().includes(term) ||
        (k.email || '').toLowerCase().includes(term) ||
        (k.applicantType || '').toLowerCase().includes(term)
    );
  }

  if (params?.status) {
    filtered = filtered.filter((k) => k.status === params.status);
  }

  return filtered;
}

export async function reviewRemoteKycSubmission(
  id: string,
  reviewData: { status: string; rejectionReason?: string }
): Promise<boolean> {
  const response = await cashFetch(API_BASE_URL + '/cash-kyc/submissions/' + encodeURIComponent(id) + '/review', { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(reviewData) });
  if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.message || 'KYC review was not saved'); }
  return true;
}

export async function submitClientKyc(formData: FormData): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await cashFetch(`${API_BASE_URL}/cash-kyc/submissions`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }

    if (res.ok) {
      return { success: true, data: json };
    }
    return { success: false, error: json.message || `Submission failed with status ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network connection failed' };
  }
}

export function extractClientFromKycSubmission(item: any): Client {
  const p = item.payload || {};
  const name = item.applicantName || p.fullName || p.accountName || p.signature || 'Verified Client';
  const address = p.residentialAddress || p.address || item.address || 'International / Global Address';
  
  // Extract region / country worldwide
  let region = p.nationality || p.country || '';
  if (!region && address) {
    const parts = String(address).split(',');
    if (parts.length > 1) {
      region = parts[parts.length - 1].trim();
    } else {
      region = address.trim();
    }
  }
  if (!region) region = 'Global';

  const phone = item.phone || p.phoneNumber || p.phone || undefined;
  const email = item.email || p.emailAddress || p.email || undefined;
  const subId = item.id || `SUB-${Date.now()}`;
  const cleanId = `C-KYC-${subId.slice(-6).toUpperCase()}`;

  return {
    id: cleanId,
    name: name.trim(),
    address: address.trim(),
    region,
    lastVisit: 'Newly Onboarded (KYC)',
    outstandingBalance: 0,
    phone: phone ? String(phone).trim() : undefined,
    email: email ? String(email).trim() : undefined,
    kycStatus: 'APPROVED',
    kycId: subId,
    idNumber: p.idNumber || p.cniNumber || p.idCardNumber || undefined,
    occupation: p.occupation || p.sourceOfFunds || undefined,
    nationality: p.nationality || undefined,
    bankName: p.bankName || undefined,
    accountNumber: p.accountNumber || undefined,
    verificationDate: new Date(item.createdAt || Date.now()).toLocaleDateString(),
  };
}

export function getInitialKycApprovedClients(): Client[] {
  return [];
}


// ─── AUTOMATED EMAIL NOTIFICATION SERVICE ───

export async function sendCollectionNotificationEmail(collection: Collection, _clientEmail?: string, _eventType: 'CREATED' | 'COMPLETED' = 'CREATED', _pdfBase64?: string): Promise<boolean> {
  try {
    const res = await cashFetch(API_BASE_URL + '/cash-collections/send-receipt', { method: 'POST', headers: cashHeaders(), body: JSON.stringify({ collectionId: collection.id }) });
    return res.ok;
  } catch { return false; }
}

export async function sendKycDecisionNotificationEmail(
  applicantName: string,
  email?: string,
  status: 'APPROVED' | 'REJECTED' = 'APPROVED',
  rejectionReason?: string
): Promise<boolean> {
  // Cash KYC review is persisted by its dedicated API. Email requires independently configured Cash delivery.
  return false;
}
export async function cashDocumentUrl(url: string) {
  const target = new URL(url, new URL(API_BASE_URL).origin);
  if (target.origin !== new URL(API_BASE_URL).origin || !target.pathname.startsWith('/api/v1/cash-collections/documents/')) throw new Error('Legacy receipt requires migration or an authorized retrieval link');
  const response = await cashFetch(target.href, { headers: cashHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error('Receipt could not be retrieved'); return URL.createObjectURL(await response.blob());
}

export async function saveCollectionReceipt(id: string, dataUrl: string) {
  const blob = await (await cashFetch(dataUrl)).blob(), form = new FormData();
  form.append('receipt', blob, blob.type === 'image/png' ? 'receipt.png' : 'receipt.jpg');
  const headers = new Headers(cashHeaders()); headers.delete('Content-Type');
  const response = await cashFetch(API_BASE_URL + '/cash-collections/' + encodeURIComponent(id) + '/receipt', { method: 'POST', headers, body: form });
  if (!response.ok) throw new Error('Receipt was not saved. Only pending collections can be updated.'); return response.json();
}

export async function fetchCashExchangeRates() {
  const response = await cashFetch(API_BASE_URL + '/cash-transactions/exchange-rates', { headers: cashHeaders() });
  if (!response.ok) throw new Error('Cash exchange rates could not be loaded'); return response.json();
}
export async function saveCashExchangeRates(rates: unknown[]) {
  const response = await cashFetch(API_BASE_URL + '/cash-transactions/exchange-rates', { method: 'POST', headers: cashHeaders(), body: JSON.stringify({ rates }) });
  if (!response.ok) throw new Error('Cash exchange rates were not saved'); return response.json();
}
