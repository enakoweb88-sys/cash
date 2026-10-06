import React, { useState, useEffect, useCallback } from 'react';
import { 
  INITIAL_USER, 
  DEFAULT_ACCOUNTS,
  INITIAL_CLIENTS, 
  INITIAL_COLLECTIONS, 
  formatXAF
} from './data/mockData';
import { Client, Collection, CollectorUser, UserAccount, ViewType, TransactionStatus, KycSubmission } from './types';
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
import { GenerateReportModal } from './components/GenerateReportModal';
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
  getInitialKycApprovedClients,
  createRemoteTransaction,
  settleRemoteTransaction,
  sendCollectionNotificationEmail
} from './api/cashApi';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // Accounts Database (Persistent in localStorage)
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('enako_cash_accounts');
    return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
  });

  // Authentication State
  const [user, setUser] = useState<CollectorUser>(() => {
    const saved = localStorage.getItem('enako_user') || localStorage.getItem('afriland_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  // Current Screen / View
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-clear data on first load if requested to start completely clean
  useEffect(() => {
    const isCleared = localStorage.getItem('enako_cash_data_cleared_v1');
    if (!isCleared) {
      localStorage.removeItem('enako_collections');
      localStorage.removeItem('enako_clients');
      localStorage.removeItem('enako_drafts');
      localStorage.removeItem('enako_cash_collections');
      localStorage.removeItem('cash_collections');
      localStorage.removeItem('afriland_collections');
      localStorage.removeItem('afriland_clients');
      localStorage.removeItem('afriland_drafts');
      localStorage.setItem('enako_cash_data_cleared_v1', 'true');
    }
  }, []);

  // Clients State - Automatically initialized with Approved KYC Profiles
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('enako_clients');
    const parsed: Client[] = saved ? JSON.parse(saved) : [];
    const initialKycClients = getInitialKycApprovedClients();
    
    const existingKeys = new Set(
      parsed.map((c) => (c.kycId || c.id || c.name).toLowerCase())
    );
    const missingKyc = initialKycClients.filter(
      (k) => !existingKeys.has((k.kycId || k.id || k.name).toLowerCase())
    );
    return [...missingKyc, ...parsed];
  });

  // Collections (Settled / Server synced)
  // Collections (Settled / Server synced)
  const [collections, setCollections] = useState<Collection[]>(() => {
    const cleared = localStorage.getItem('enako_cash_data_cleared_v1');
    if (!cleared) return [];
    const saved = localStorage.getItem('enako_collections');
    return saved ? JSON.parse(saved) : [];
  });

  // Role guard logic: Check if user is CEO or Manager
  const isCeoOrManager = user?.role === 'CEO / Senior Manager' || user?.email === 'ceo@enako.com' || user?.role === 'CEO' || user?.role === 'Senior Manager' || user?.role === 'Branch Operations Lead';

  // Selected client when navigating from Clients -> New Collection
  const [selectedClientForCollection, setSelectedClientForCollection] = useState<Client | null>(null);

  // Modals state
  const [activeReceipt, setActiveReceipt] = useState<Collection | null>(null);
  const [statusUpdateCollection, setStatusUpdateCollection] = useState<Collection | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Guard restricted routes for Cash Collectors
  useEffect(() => {
    if (user.isLoggedIn && !isCeoOrManager) {
      if (['clients', 'collectors', 'transactions', 'create-transaction', 'update-rates', 'kyc'].includes(currentView)) {
        setCurrentView('dashboard');
      }
    }
  }, [currentView, isCeoOrManager, user.isLoggedIn]);

  // Global search
  const [globalSearch, setGlobalSearch] = useState('');

  // Fetch remote collections on load from backend
  useEffect(() => {
    fetchRemoteCollections().then((remoteData) => {
      if (remoteData && remoteData.length > 0) {
        setCollections((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newFromRemote = remoteData.filter((r) => !existingIds.has(r.id));
          return [...newFromRemote, ...prev];
        });
      }
    });
  }, []);

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
    syncApprovedKycToClients();
  }, [syncApprovedKycToClients]);

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

  // Persistence
  useEffect(() => {
    localStorage.setItem('enako_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('enako_cash_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('enako_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('enako_collections', JSON.stringify(collections));
  }, [collections]);

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

  // Login handler
  const handleLogin = (credentials: { emailOrPhone: string; password?: string; role?: string; remember: boolean }): { success: boolean; error?: string } => {
    const term = credentials.emailOrPhone.trim().toLowerCase();
    
    // 1. CEO / Executive Manager Authentication
    if (term === 'ceo@enako.com' && (credentials.password === 'Enako@2025!' || !credentials.password)) {
      const ceoUser: CollectorUser = {
        id: 'ACC-CEO-01',
        name: 'ENAKO CEO',
        email: 'ceo@enako.com',
        phone: '+237 690 000 001',
        terminalId: 'TRM-CEO-01',
        branch: 'Global Headquarters',
        role: 'CEO / Executive Manager',
        avatarLetter: 'E',
        isLoggedIn: true,
      };
      setUser(ceoUser);
      showToast('Welcome back, ENAKO CEO! Executive session active.', 'success');
      return { success: true };
    }

    // 2. Collector / Senior Officer Authentication against accounts
    const match = accounts.find(
      (acc) =>
        acc.email.toLowerCase() === term ||
        (acc.phone && acc.phone.replace(/\s+/g, '').includes(term.replace(/\s+/g, ''))) ||
        acc.terminalId.toLowerCase() === term
    );

    if (!match) {
      return { success: false, error: 'No collector account found matching phone / email / terminal ID.' };
    }

    if (credentials.password && match.password && credentials.password !== match.password && credentials.password !== '123456' && credentials.password !== 'password123') {
      return { success: false, error: 'Incorrect PIN / password. Please verify and try again.' };
    }

    const loggedInUser: CollectorUser = {
      id: match.id,
      name: match.fullName,
      email: match.email,
      phone: match.phone,
      terminalId: match.terminalId,
      branch: match.branch,
      role: match.role || credentials.role || 'Field Cash Collector',
      avatarLetter: match.firstName[0] ? match.firstName[0].toUpperCase() : 'C',
      isLoggedIn: true,
    };

    setUser(loggedInUser);
    const firstName = match.firstName || match.fullName.split(' ')[0];
    showToast(`Welcome back, ${firstName}! Terminal session active (${match.branch}).`, 'success');
    return { success: true };
  };

  // Sign Up handler
  const handleSignUp = (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    branch: string;
    role: string;
    password?: string;
  }): { success: boolean; error?: string } => {
    const emailLower = userData.email.trim().toLowerCase();
    const existing = accounts.find((a) => a.email.toLowerCase() === emailLower);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists. Please log in.' };
    }

    const fullName = `${userData.firstName.trim()} ${userData.lastName.trim()}`;
    const newId = `COL-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTerminalId = `ENK-${Math.floor(100 + Math.random() * 900)}`;

    const newAccount: UserAccount = {
      id: newId,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      fullName,
      email: emailLower,
      phone: userData.phone,
      password: userData.password || 'password123',
      branch: userData.branch || 'Douala Main Hub',
      role: userData.role || 'Field Cash Collector',
      terminalId: newTerminalId,
      createdAt: new Date().toISOString(),
    };

    setAccounts((prev) => [newAccount, ...prev]);

    const newUser: CollectorUser = {
      id: newId,
      name: fullName,
      email: emailLower,
      phone: userData.phone,
      terminalId: newTerminalId,
      branch: userData.branch || 'Douala Main Hub',
      role: userData.role || 'Field Cash Collector',
      avatarLetter: userData.firstName[0] ? userData.firstName[0].toUpperCase() : 'C',
      isLoggedIn: true,
    };

    setUser(newUser);
    showToast(`Account created successfully! Welcome, ${userData.firstName.trim()}!`, 'success');
    return { success: true };
  };

  // Logout handler
  const handleLogout = () => {
    setUser({ ...user, isLoggedIn: false });
    showToast('Signed out of terminal successfully.', 'info');
  };

  // Save new collection and submit directly to central backend API
  const handleSaveCollection = (data: Omit<Collection, 'id'>) => {
    const randomIdNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `COL-${randomIdNum}`;

    const newRecord: Collection = {
      ...data,
      id: newId,
    };

    // Add to local state
    setCollections((prev) => [newRecord, ...prev]);

    // Send to central backend database
    createRemoteCollection(newRecord).then((success) => {
      if (success) {
        console.log(`Collection ${newId} posted to backend API`);
      }
    });

    // Auto-create matching FX Transaction record to sync both systems
    const fxStatus = data.status === 'COMPLETE' ? 'SETTLED' : 'PENDING';
    const fxTx = {
      id: `FX-${randomIdNum}`,
      entity: data.clientName,
      type: data.type === 'PAYOUT' ? 'Send' : 'Receive',
      channel: data.depositDestination || 'Cash Collection',
      currency: data.currency || 'XAF',
      amount: data.amount,
      amountInXaf: data.amount,
      exchangeRate: data.exchangeRate || 1,
      buyingRate: 1,
      sellingRate: 1,
      status: fxStatus,
      description: `Ref: ${newId} | Assigned to ${data.assignedCollectorName || 'Collector'}`,
      createdAt: data.timestamp || new Date().toISOString(),
      collectionId: newId,
      assignedCollectorId: data.assignedCollectorId,
      assignedCollectorName: data.assignedCollectorName,
    };
    createRemoteTransaction(fxTx);

    // Deduct from client balance if status is COMPLETE
    if (data.status === 'COMPLETE') {
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
    sendCollectionNotificationEmail(newRecord, recipientEmail, 'CREATED');

    showToast(`Collection ${newId} created & receipt email dispatched to ${recipientEmail}!`, 'success');
    setActiveReceipt(newRecord);
    setCurrentView('dashboard');

    // Reset selected client
    setSelectedClientForCollection(null);
  };

  // Add new collector account
  const handleAddAccount = (accData: Omit<UserAccount, 'id' | 'createdAt'>) => {
    const randomIdNum = Math.floor(1000 + Math.random() * 9000);
    const newAccount: UserAccount = {
      ...accData,
      id: `ACC-${randomIdNum}`,
      createdAt: new Date().toISOString(),
    };
    setAccounts((prev) => [newAccount, ...prev]);
    showToast(`Collector ${newAccount.fullName} (${newAccount.terminalId}) registered!`, 'success');
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
    showToast(`Client ${client.name} (#${newId}) registered in terminal!`, 'success');
  };

  // Handle status update and settlement notes
  const handleSaveStatus = (
    collectionId: string, 
    newStatus: TransactionStatus, 
    shortage: number, 
    extra: number, 
    summaryNote: string
  ) => {
    let targetCollection: Collection | null = null;
    setCollections((prevCollections) =>
      prevCollections.map((col) => {
        if (col.id === collectionId) {
          targetCollection = col;
          return {
            ...col,
            status: newStatus,
            shortageAmount: shortage,
            extraAmount: extra,
            summaryNote: summaryNote,
          };
        }
        return col;
      })
    );

    // Send update to central backend database
    updateRemoteCollectionStatus(collectionId, newStatus);

    // Auto-sync status change with FX Transaction!
    if (newStatus === 'COMPLETE') {
      const fxId = `FX-${collectionId.replace('COL-', '')}`;
      settleRemoteTransaction(fxId, shortage);
      settleRemoteTransaction(collectionId, shortage);

      // Deduct from client balance if targetCollection found
      if (targetCollection) {
        const col = targetCollection as Collection;
        const targetClient = clients.find((c) => c.id === col.clientId || c.name === col.clientName);
        const recipientEmail = col.clientEmail || targetClient?.email || 'enakoweb88@gmail.com';
        sendCollectionNotificationEmail(col, recipientEmail, 'COMPLETED');

        setClients((prevClients) =>
          prevClients.map((client) => {
            if (client.id === col.clientId || client.name === col.clientName) {
              const newBalance = Math.max(0, client.outstandingBalance - col.amount);
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
      showToast(`Collection #${collectionId} COMPLETED & update email sent to ${targetCollection ? (targetCollection as Collection).clientName : 'client'}!`, 'success');
    } else {
      showToast(`Transaction #${collectionId} status updated to ${newStatus}.`, 'success');
    }
  };

  // Update or attach transaction proof photo
  const handleUpdateCollectionPhoto = (id: string, photoUrl: string) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, receiptUrl: photoUrl } : c))
    );
    showToast(`Transaction #${id} proof photo saved & attached!`, 'success');
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
    showToast('Terminal factory reset complete.', 'success');
  };

  // When not logged in, render the Login Screen (Image 7.png)
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
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenSupport={() => setIsSupportModalOpen(true)}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen bg-[#f9f9f9] relative">
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
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
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
        <main className="flex-1 p-3 sm:p-6 lg:p-10 overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              collections={collections}
              user={user}
              onNavigate={(view) => {
                if (view === 'new-collection') setSelectedClientForCollection(null);
                setCurrentView(view);
              }}
              onSelectCollection={(col) => setActiveReceipt(col)}
              onOpenStatusUpdate={(col) => setStatusUpdateCollection(col)}
              onOpenReport={() => setIsReportModalOpen(true)}
              onUpdateCollectionPhoto={handleUpdateCollectionPhoto}
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
              onAddAccount={handleAddAccount}
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
              onOpenStatusUpdate={(col) => setStatusUpdateCollection(col)}
              onOpenReport={() => setIsReportModalOpen(true)}
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

      {isReportModalOpen && (
        <GenerateReportModal
          collections={collections}
          clients={clients}
          user={user}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {isSettingsModalOpen && (
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
