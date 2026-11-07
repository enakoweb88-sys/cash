import { saveCollectionReceipt } from './api/cashApi';
import { reconcileCollections } from './utils/collectionSync';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  INITIAL_USER, 
  INITIAL_CLIENTS, 
  INITIAL_COLLECTIONS, 
  formatXAF
} from './data/mockData';
import { Client, Collection, CollectorUser, UserAccount, CollectorRegistration, ViewType, TransactionStatus, KycSubmission } from './types';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { NewCollectionView } from './components/NewCollectionView';
import { HistoryView } from './components/HistoryView';
import { TransactionsView } from './components/TransactionsView';
import { CreateTransactionView } from './components/CreateTransactionView';
import { ExchangeRatesView } from './components/ExchangeRatesView';
import { KycView } from './components/KycView';
import { CollectorsView } from './components/CollectorsView';
import { LoginView } from './components/LoginView';
import { ReceiptModal } from './components/ReceiptModal';
import { SettingsModal } from './components/SettingsModal';
import { SupportModal } from './components/SupportModal';
import { ProfileModal } from './components/ProfileModal';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { 
  fetchRemoteCollections, 
  createRemoteCollection, 
  updateRemoteCollectionStatus,
  fetchRemoteKycSubmissions,
  extractClientFromKycSubmission,
  createRemoteTransaction,
  settleRemoteTransaction,
  sendCollectionNotificationEmail,
  fetchRemoteCollectors,
  fetchRemoteClients,
  createRemoteClient,
  createRemoteCollector,
  deleteRemoteCollector,
  authenticatePortalUser, restoreCashSession, logoutCashSession, CashProfile
} from './api/cashApi';
import { generateReceiptPdfBase64 } from './utils/exportUtils';
import { beginCashSession, LAST_ACTIVITY_KEY, watchCashInactivity } from './utils/idleSession';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  canConfigureSystem,
  canEditExistingRecords,
  canManageCollectors,
  hasOperationalAccess,
} from './utils/permissions';

const VALID_VIEWS: ViewType[] = [
  'dashboard',
  'new-collection',
  'clients',
  'collectors',
  'history',
  'transactions',
  'create-transaction',
  'update-rates',
  'kyc',
];

const getInitialView = (): ViewType => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '').trim() as ViewType;
    if (VALID_VIEWS.includes(hash)) {
      return hash;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = (urlParams.get('view') || urlParams.get('tab')) as ViewType;
    if (viewParam && VALID_VIEWS.includes(viewParam)) {
      return viewParam;
    }
    const saved = localStorage.getItem('enako_cash_current_view') as ViewType;
    if (saved && VALID_VIEWS.includes(saved)) {
      return saved;
    }
  }
  return 'dashboard';
};

export default function App() {
  // Profiles are server responses, never an offline credential database.
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [user, setUser] = useState<CollectorUser>(INITIAL_USER);

  // Current Screen / View (Persisted across page reloads via URL hash & localStorage)
  const [currentView, setCurrentView] = useState<ViewType>(getInitialView);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync currentView with localStorage and URL hash
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enako_cash_current_view', currentView);
      if (window.location.hash !== `#${currentView}`) {
        window.history.replaceState(null, '', `#${currentView}`);
      }
    }
  }, [currentView]);

  // Listen to browser Back/Forward navigation or manual hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim() as ViewType;
      if (VALID_VIEWS.includes(hash)) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Ensure field collectors stay within authorized views
  useEffect(() => {
    if (!hasOperationalAccess(user) && !['dashboard', 'new-collection', 'history'].includes(currentView)) {
      setCurrentView('dashboard');
    }
  }, [user, currentView]);

  // Legacy shared ledgers remain untouched for approved migration/export, never trusted as this session's records.
  const [clients, setClients] = useState<Client[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  // Role guard logic: Check if user is CEO or Manager
  const hasFullOperationalAccess = hasOperationalAccess(user);
  const mayEditExistingRecords = canEditExistingRecords(user);
  const mayManageCollectors = canManageCollectors(user);
  const mayConfigureSystem = canConfigureSystem(user);

  // Selected client when navigating from Clients -> New Collection
  const [selectedClientForCollection, setSelectedClientForCollection] = useState<Client | null>(null);

  // Modals state
  const [activeReceipt, setActiveReceipt] = useState<Collection | null>(null);
  const [statusUpdateCollection, setStatusUpdateCollection] = useState<Collection | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Guard restricted routes for Cash Collectors
  useEffect(() => {
    if (user.isLoggedIn && !hasFullOperationalAccess) {
      if (['clients', 'collectors', 'transactions', 'create-transaction', 'update-rates', 'kyc'].includes(currentView)) {
        setCurrentView('dashboard');
      }
    }
  }, [currentView, hasFullOperationalAccess, user.isLoggedIn]);

  // Global search
  const [globalSearch, setGlobalSearch] = useState('');

  const collectionRefreshBusy = useRef(false);
  // Fetch an authoritative snapshot; records deleted on the server must leave the cache.
  useEffect(() => {
    if (!user.isLoggedIn) return;
    let active = true;
    const refresh = async () => {
      if (collectionRefreshBusy.current) return;
      collectionRefreshBusy.current = true;
      const requestedAt = Date.now();
      try {
        const remote = await fetchRemoteCollections();
        if (active) setCollections(previous => reconcileCollections(previous, remote, requestedAt));
      } catch (error) { console.warn('Collection refresh failed; local records preserved.', error); }
      finally { collectionRefreshBusy.current = false; }
    };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [user.isLoggedIn, user.id]);

  // Only authorized administrators can list collector profiles.
  useEffect(() => {
    if (!user.isLoggedIn || !canManageCollectors(user)) return;
    let active = true;
    fetchRemoteCollectors().then(rows => { if (active) setAccounts(rows); });
    return () => { active = false; };
  }, [user.isLoggedIn, user.id, user.cashLevel]);

  // Load manually registered clients from the shared database on every device.
  useEffect(() => {
    if (!user.isLoggedIn) return;
    fetchRemoteClients().then(async (remoteClients) => {
      setClients((previous) => {
        const merged = [...previous];
        for (const remoteClient of remoteClients) {
          const index = merged.findIndex((client) => client.id === remoteClient.id);
          if (index >= 0) merged[index] = { ...merged[index], ...remoteClient };
          else merged.push(remoteClient);
        }
        return merged;
      });

    });
  }, [user.isLoggedIn, user.id]);

  // Auto-sync approved KYC submissions to Client Directory
  const syncApprovedKycToClients = useCallback(async () => {
    try {
      const submissions = await fetchRemoteKycSubmissions();
      const approved = submissions.filter((s: any) => s.status === 'APPROVED');
      if (approved.length > 0) {
        setClients((prevClients) => {
          let updated = [...prevClients];
          let addedCount = 0;
          for (const sub of approved) {
            const extracted = extractClientFromKycSubmission(sub);
            const exists = updated.some(
              (c) =>
                (c.kycId && c.kycId === sub.id) ||
                (c.email && extracted.email && c.email.toLowerCase() === extracted.email.toLowerCase()) ||
                (c.phone && extracted.phone && c.phone === extracted.phone) ||
                c.name.toLowerCase() === extracted.name.toLowerCase()
            );

            if (!exists) {
              updated = [extracted, ...updated];
              addedCount++;
            }
          }
          return updated;
        });
      }
    } catch (e) {
      console.warn('KYC client sync note:', e);
    }
  }, []);

  useEffect(() => {
    if (user.isLoggedIn && user.cashLevel === 'administrator') void syncApprovedKycToClients();
  }, [syncApprovedKycToClients, user.isLoggedIn, user.id, user.cashLevel]);

  const handleAutoCreateClientFromKyc = (sub: KycSubmission) => {
    const newClient = extractClientFromKycSubmission(sub);
    setClients((prev) => {
      const exists = prev.some(
        (c) => c.kycId === sub.id || c.name.toLowerCase() === newClient.name.toLowerCase()
      );
      if (exists) return prev;
      return [newClient, ...prev];
    });
    showToast(`Client profile auto-created for ${newClient.name}!`, 'success');
  };

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Retire legacy profile/credential caches; authentication state is restored from the server.
  useEffect(() => {
    localStorage.removeItem('enako_cash_accounts');
    localStorage.removeItem('enako_user');
    localStorage.removeItem('afriland_user');
    localStorage.removeItem('enako_access_token');
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('enako_access_token');
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
  };

  const acceptProfile = (profile: CashProfile) => {
    setUser({ id: profile.id, name: profile.name, email: profile.email, terminalId: profile.terminalId, branch: profile.branch, cashLevel: profile.cashLevel, role: profile.cashLevel === 'administrator' ? 'Cash Administrator' : 'Field Cash Collector', avatarLetter: profile.name[0]?.toUpperCase() || 'C', isLoggedIn: true });
  };

  const handleLogin = async (credentials: { emailOrPhone: string; password?: string; role?: string; remember: boolean }): Promise<{ success: boolean; error?: string }> => {
    if (!credentials.password) return { success: false, error: 'Enter your password.' };
    const result = await authenticatePortalUser(credentials.emailOrPhone, credentials.password);
    if (!result.success || !result.user) return { success: false, error: result.error };
    setAccounts([]); setCollections([]); setClients([]);
    acceptProfile(result.user);
    beginCashSession();
    showToast('Signed in to Cash Dashboard.', 'success');
    return { success: true };
  };

  const handleSignUp = (): { success: boolean; error?: string } => ({ success: false, error: 'Ask an authorized cash administrator to create and provision your account.' });

  // Deactivation preserves cash history and requires an explicit target confirmation.
  const handleDeleteAccount = async (id: string) => {
    const confirmation = window.prompt('Deactivate this collector and retain all history. Enter collector ID: ' + id);
    if (confirmation !== id) return;
    const reason = window.prompt('Reason for deactivation (at least 10 characters):');
    if (!reason || reason.trim().length < 10) return;
    try {
      await deleteRemoteCollector(id, reason.trim());
      setAccounts(previous => previous.filter(account => account.id !== id));
      showToast('Collector deactivated. Collection history retained.', 'info');
    } catch { showToast('Deactivation failed. Only dedicated cash-managed accounts can be deactivated.', 'error'); }
  };

  // Logout handler
  const handleLogout = useCallback(() => {
    const loggedOutUser: CollectorUser = {
      ...INITIAL_USER,
      isLoggedIn: false,
    };
    setUser(loggedOutUser);
    void logoutCashSession().catch(() => {});
    setAccounts([]); setCollections([]); setClients([]);
    localStorage.removeItem('enako_user');
    localStorage.removeItem('afriland_user');
    localStorage.removeItem('enako_access_token');
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('enako_access_token');
    sessionStorage.removeItem('access_token');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setActiveReceipt(null);
    setStatusUpdateCollection(null);
    setIsSettingsModalOpen(false);
    setIsSupportModalOpen(false);
    setIsProfileModalOpen(false);
    setMobileMenuOpen(false);
    localStorage.removeItem('enako_cash_current_view');
    if (typeof window !== 'undefined') {
      window.location.hash = '';
      window.history.replaceState(null, '', window.location.pathname);
    }
    setCurrentView('dashboard');
    setToastMessage({ text: 'Signed out of terminal successfully.', type: 'info' });
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const profile = await restoreCashSession();
      if (!active) return;
      if (profile) acceptProfile(profile);
      else { setUser(INITIAL_USER); setAccounts([]); setCollections([]); setClients([]); }
    };
    void restore();
    const timer = window.setInterval(restore, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!user.isLoggedIn) return;
    return watchCashInactivity(() => {
      handleLogout();
      setToastMessage({ text: 'Signed out after 2 minutes of inactivity. Please sign in again.', type: 'info' });
    });
  }, [user.isLoggedIn, handleLogout]);

  // Save new collection and submit directly to central backend API
  const handleSaveCollection = async (data: Omit<Collection, 'id'>) => {
    const newId = 'COL-' + crypto.randomUUID();

    const newRecord: Collection = {
      ...data,
      id: newId,
      syncState: 'pending',
      status: user.cashLevel === 'administrator' ? data.status : 'PENDING',
      assignedCollectorId: user.cashLevel === 'administrator' ? (data.assignedCollectorId || user.id) : user.id,
    };

    const saved = await createRemoteCollection(newRecord);
    if (!saved) { showToast('Collection was not saved. Check access and submitted details.', 'error'); return; }
    newRecord.syncState = 'synced'; newRecord.syncedAt = Date.now();
    setCollections(previous => [newRecord, ...previous]);

    // The server creates the linked accounting record atomically with the collection.

    // Deduct from client balance if status is COMPLETE
    if (newRecord.status === 'COMPLETE') {
      setClients((prevClients) =>
        prevClients.map((client) => {
          if (client.id === data.clientId) {
            const newBalance = Math.max(0, client.outstandingBalance - data.amount);
            return {
              ...client,
              outstandingBalance: newBalance,
              lastVisit: 'Just now',
            };
          }
          return client;
        })
      );
    }

    // Trigger automated email dispatch to client with receipt PDF attached
    const targetClient = clients.find((c) => c.id === data.clientId || c.name === data.clientName);
    const recipientEmail = data.clientEmail || targetClient?.email || 'enakoweb88@gmail.com';
    let pdfBase64: string | undefined;
    try {
      pdfBase64 = generateReceiptPdfBase64(newRecord, { name: data.assignedCollectorName || user.name, terminalId: user.terminalId });
    } catch (err) {
      console.warn('Could not generate receipt PDF base64 for email:', err);
    }
    if (user.cashLevel === 'administrator') void sendCollectionNotificationEmail(newRecord, recipientEmail, 'CREATED', pdfBase64);

    showToast('Collection saved. Receipt delivery is tracked separately.', 'success');
    setActiveReceipt(newRecord);
    setCurrentView('dashboard');

    // Reset selected client
    setSelectedClientForCollection(null);
  };

  // Password exists only in the registration request, never profile state/storage.
  const handleAddAccount = async (data: CollectorRegistration) => {
    if (!canManageCollectors(user)) throw new Error('Cash administrator permission required');
    const account: UserAccount = await createRemoteCollector(data);
    setAccounts(previous => [account, ...previous]);
    showToast('Collector account created. Access provisioning approval is required before login.', 'info');
  };

  // Add new client to database
  const handleAddNewClient = (newClientData: Omit<Client, 'id'>) => {
    const randomIdNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `C-${randomIdNum}`;
    const client: Client = {
      ...newClientData,
      id: newId,
    };
    setClients((prev) => [client, ...prev]);
    createRemoteClient(client).then((savedClient) => {
      if (savedClient) {
        setClients((prev) => prev.map((item) => item.id === client.id ? { ...item, ...savedClient } : item));
        showToast(`Client ${client.name} (#${newId}) is available on all terminals.`, 'success');
      } else {
        showToast(`Client ${client.name} was saved on this device, but server sync failed.`, 'error');
      }
    });
  };

  // Handle status update, received amounts, and settlement notes
  const handleSaveStatus = async (
    collectionId: string, 
    newStatus: TransactionStatus, 
    shortage: number, 
    extra: number, 
    summaryNote: string,
    actualAmountCollected?: number,
    targetAmount?: number
  ) => {
    // Locate target collection synchronously from state
    const existingCol = collections.find((c) => c.id === collectionId);
    const tgt = targetAmount || existingCol?.targetAmount || existingCol?.amount || 0;
    const act = actualAmountCollected !== undefined 
      ? actualAmountCollected 
      : (existingCol?.actualAmountCollected !== undefined ? existingCol.actualAmountCollected : (newStatus === 'COMPLETE' ? (existingCol?.amount || tgt) : 0));

    const updatedCol: Collection = existingCol
      ? {
          ...existingCol,
          status: newStatus,
          targetAmount: tgt,
          actualAmountCollected: act,
          shortageAmount: shortage,
          extraAmount: extra,
          summaryNote: summaryNote,
          amount: act > 0 ? act : tgt,
        }
      : {
          id: collectionId,
          clientId: 'C-CLIENT',
          clientName: 'Client',
          amount: act > 0 ? act : tgt,
          targetAmount: tgt,
          actualAmountCollected: act,
          time: 'Now',
          timestamp: new Date().toISOString(),
          status: newStatus,
          shortageAmount: shortage,
          extraAmount: extra,
          summaryNote: summaryNote,
        };

    const saved = await updateRemoteCollectionStatus(collectionId, newStatus, { actualAmountCollected: act, shortageAmount: shortage, extraAmount: extra, summaryNote });
    if (!saved) { showToast('Status was not saved. The record may already be final or inaccessible.', 'error'); return; }
    setCollections((prevCollections) =>
      prevCollections.map((col) => {
        if (col.id === collectionId) {
          return {
            ...col,
            syncState: 'synced',
            syncedAt: Date.now(),
            status: newStatus,
            targetAmount: tgt,
            actualAmountCollected: act,
            shortageAmount: shortage,
            extraAmount: extra,
            summaryNote: summaryNote,
            amount: act > 0 ? act : tgt,
          };
        }
        return col;
      })
    );

    // Auto-sync status change with FX Transaction!
    if (newStatus === 'COMPLETE') {
      // Deduct from client balance and dispatch completion alert
      const targetClient = clients.find((c) => c.id === updatedCol.clientId || c.name === updatedCol.clientName);
      const recipientEmail = updatedCol.clientEmail || targetClient?.email || 'enakoweb88@gmail.com';
      let pdfBase64: string | undefined;
      try {
        pdfBase64 = generateReceiptPdfBase64(updatedCol, { name: updatedCol.assignedCollectorName || user.name, terminalId: user.terminalId });
      } catch (err) {
        console.warn('Could not generate settlement receipt PDF base64 for email:', err);
      }
      if (user.cashLevel === 'administrator') void sendCollectionNotificationEmail(updatedCol, recipientEmail, 'COMPLETED', pdfBase64);

      if (existingCol) {
        setClients((prevClients) =>
          prevClients.map((client) => {
            if (client.id === existingCol.clientId || client.name === existingCol.clientName) {
              const newBalance = Math.max(0, client.outstandingBalance - existingCol.amount);
              return {
                ...client,
                outstandingBalance: newBalance,
                lastVisit: 'Just now',
              };
            }
            return client;
          })
        );
      }
      showToast('Collection completed. Receipt delivery is tracked separately.', 'success');
    } else {
      showToast(`Transaction #${collectionId} status updated to ${newStatus}.`, 'success');
    }
  };

  // Update or attach transaction proof photo
  const handleUpdateCollectionPhoto = async (id: string, photoUrl: string) => {
    try { const stored = await saveCollectionReceipt(id, photoUrl); setCollections(previous => previous.map(item => item.id === id ? { ...item, receiptUrl: stored.receiptUrl } : item)); showToast('Receipt stored securely', 'success'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Receipt could not be saved', 'error'); throw error; }
  };

  // Select client from Clients directory and jump to New Collection screen
  const handleSelectClientForCollection = (client: Client) => {
    setSelectedClientForCollection(client);
    setCurrentView('new-collection');
  };

  // Reset demo data
  const handleResetData = () => {
    setClients(INITIAL_CLIENTS);
    setCollections(INITIAL_COLLECTIONS);
    setUser(INITIAL_USER);
    localStorage.removeItem('enako_clients');
    localStorage.removeItem('enako_collections');
    localStorage.removeItem('enako_drafts');
    localStorage.removeItem('enako_user');
    localStorage.removeItem('afriland_clients');
    localStorage.removeItem('afriland_collections');
    localStorage.removeItem('afriland_drafts');
    localStorage.removeItem('afriland_user');
    handleLogout();
    showToast('Terminal reset complete and session signed out.', 'success');
  };

  // When not logged in, render the Login Screen
  if (!user.isLoggedIn) {
    return (
      <LoginView
        currentUser={user}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
      />
    );
  }

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] min-h-screen flex flex-col md:flex-row antialiased select-none font-sans">
      {/* Side Navigation Bar (Desktop fixed & Mobile Drawer) */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'new-collection' && currentView !== 'new-collection') {
            setSelectedClientForCollection(null);
          }
          setCurrentView(view);
        }}
        user={user}
        onOpenSupport={() => setIsSupportModalOpen(true)}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen bg-[#f9f9f9] relative min-w-0">
        {/* Top Header Bar */}
        <TopBar
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'new-collection' && currentView !== 'new-collection') {
              setSelectedClientForCollection(null);
            }
            setCurrentView(view);
          }}
          user={user}
          onOpenSettings={() => {
            if (mayConfigureSystem) setIsSettingsModalOpen(true);
          }}
          canConfigureSystem={mayConfigureSystem}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onLogout={handleLogout}
          globalSearch={globalSearch}
          onGlobalSearchChange={(q) => {
            setGlobalSearch(q);
            if (q.trim() && currentView !== 'history' && currentView !== 'clients') {
              setCurrentView('history');
            }
          }}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className={`p-4 border shadow-lg flex items-center gap-3 text-xs font-bold uppercase tracking-wider ${
              toastMessage.type === 'success'
                ? 'bg-[#0891b2] text-white border-[#0e7490]'
                : toastMessage.type === 'error'
                ? 'bg-[#ba1a1a] text-white border-[#93000a]'
                : 'bg-[#2f3131] text-white border-[#474746]'
            }`}>
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#a5f3fc]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-[#ffdad6]" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Active Page View */}
        <main className="flex-1 p-3 sm:p-6 lg:p-10 overflow-y-auto min-w-0">
          {currentView === 'dashboard' && (
            <DashboardView
              collections={collections}
              user={user}
              onNavigate={(view) => {
                if (view === 'new-collection') setSelectedClientForCollection(null);
                setCurrentView(view);
              }}
              onSelectCollection={(col) => setActiveReceipt(col)}
              onOpenStatusUpdate={mayEditExistingRecords ? (col) => setStatusUpdateCollection(col) : undefined}
              onUpdateCollectionPhoto={mayEditExistingRecords ? handleUpdateCollectionPhoto : undefined}
            />
          )}

          {currentView === 'clients' && (
            <ClientsView
              clients={clients}
              onSelectClientForCollection={handleSelectClientForCollection}
              onAddNewClient={handleAddNewClient}
              onSyncKyc={syncApprovedKycToClients}
            />
          )}

          {currentView === 'new-collection' && (
            <NewCollectionView
              clients={clients}
              accounts={accounts}
              currentUser={user}
              initialSelectedClient={selectedClientForCollection}
              onSaveCollection={handleSaveCollection}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'collectors' && (
            <CollectorsView
              accounts={accounts}
              collections={collections}
              currentUser={user}
              onAddAccount={mayManageCollectors ? handleAddAccount : undefined}
              onDeleteAccount={mayManageCollectors ? handleDeleteAccount : undefined}
              onShowToast={showToast}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'history' && (
            <HistoryView
              collections={collections}
              user={user}
              clients={clients}
              onSelectCollection={(col) => setActiveReceipt(col)}
              onOpenStatusUpdate={mayEditExistingRecords ? (col) => setStatusUpdateCollection(col) : undefined}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView
              user={user}
              onNavigate={setCurrentView}
              onShowToast={showToast}
            />
          )}

          {currentView === 'create-transaction' && (
            <CreateTransactionView
              user={user}
              onNavigate={setCurrentView}
              onShowToast={showToast}
            />
          )}

          {currentView === 'update-rates' && (
            <ExchangeRatesView
              user={user}
              onNavigate={setCurrentView}
              onShowToast={showToast}
            />
          )}

          {currentView === 'kyc' && (
            <KycView
              user={user}
              onShowToast={showToast}
              onAutoCreateClient={handleAutoCreateClientFromKyc}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ReceiptModal
        collection={activeReceipt}
        user={user}
        onClose={() => setActiveReceipt(null)}
      />

      <StatusUpdateModal
        collection={statusUpdateCollection}
        onClose={() => setStatusUpdateCollection(null)}
        onSaveStatus={handleSaveStatus}
      />

      {isSettingsModalOpen && mayConfigureSystem && (
        <SettingsModal
          user={user}
          isOffline={false}
          onToggleOffline={() => {}}
          onResetData={handleResetData}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}

      {isSupportModalOpen && (
        <SupportModal
          user={user}
          isOffline={false}
          onClose={() => setIsSupportModalOpen(false)}
        />
      )}

      {isProfileModalOpen && (
        <ProfileModal
          user={user}
          onLogout={handleLogout}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
}
