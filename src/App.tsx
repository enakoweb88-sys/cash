import React, { useState, useEffect } from 'react';
import { 
  INITIAL_USER, 
  INITIAL_CLIENTS, 
  INITIAL_COLLECTIONS, 
  INITIAL_DRAFTS,
  formatXAF
} from './data/mockData';
import { Client, Collection, CollectorUser, ViewType, TransactionStatus } from './types';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { NewCollectionView } from './components/NewCollectionView';
import { HistoryView } from './components/HistoryView';
import { LoginView } from './components/LoginView';
import { ReceiptModal } from './components/ReceiptModal';
import { GenerateReportModal } from './components/GenerateReportModal';
import { SettingsModal } from './components/SettingsModal';
import { SupportModal } from './components/SupportModal';
import { ProfileModal } from './components/ProfileModal';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { fetchRemoteCollections, createRemoteCollection, updateRemoteCollectionStatus } from './api/cashApi';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // Authentication State
  const [user, setUser] = useState<CollectorUser>(() => {
    const saved = localStorage.getItem('enako_user') || localStorage.getItem('afriland_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  // Current Screen / View
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Clients State
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('enako_clients');
    if (saved && (saved.includes('C-9821') || saved.includes('Alpha Boutiques') || saved.includes('Jean-Luc'))) {
      localStorage.removeItem('enako_clients');
      return [];
    }
    return saved ? JSON.parse(saved) : [];
  });

  // Collections (Settled / Server synced)
  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('enako_collections');
    if (saved && (saved.includes('COL-8923') || saved.includes('Marché Central'))) {
      localStorage.removeItem('enako_collections');
      return [];
    }
    return saved ? JSON.parse(saved) : [];
  });

  // Offline Drafts
  const [drafts, setDrafts] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('enako_drafts');
    if (saved && (saved.includes('C-9001') || saved.includes('Kamer Logistics'))) {
      localStorage.removeItem('enako_drafts');
      return [];
    }
    return saved ? JSON.parse(saved) : [];
  });

  // Selected client when navigating from Clients -> New Collection
  const [selectedClientForCollection, setSelectedClientForCollection] = useState<Client | null>(null);

  // Modals state
  const [activeReceipt, setActiveReceipt] = useState<Collection | null>(null);
  const [statusUpdateCollection, setStatusUpdateCollection] = useState<Collection | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('enako_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('enako_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('enako_collections', JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem('enako_drafts', JSON.stringify(drafts));
  }, [drafts]);

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
  const handleLogin = (credentials: { email: string; password?: string; remember: boolean }) => {
    setUser((prev) => {
      const firstName = prev.name ? prev.name.trim().split(' ')[0] : 'Collector';
      return {
        ...prev,
        email: credentials.email || prev.email,
        isLoggedIn: true,
      };
    });
    const firstName = user.name ? user.name.trim().split(' ')[0] : 'Collector';
    showToast(`Welcome back, ${firstName}! Terminal session active.`, 'success');
  };

  // Sign Up handler
  const handleSignUp = (userData: { firstName: string; lastName: string; email: string; password?: string }) => {
    const fullName = `${userData.firstName.trim()} ${userData.lastName.trim()}`;
    const newUser: CollectorUser = {
      id: `COL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: fullName,
      email: userData.email,
      terminalId: `ENK-${Math.floor(100 + Math.random() * 900)}`,
      branch: 'Douala Main Hub',
      avatarLetter: userData.firstName[0] ? userData.firstName[0].toUpperCase() : 'C',
      isLoggedIn: true,
    };
    setUser(newUser);
    showToast(`Account created successfully! Welcome, ${userData.firstName.trim()}!`, 'success');
  };

  // Logout handler
  const handleLogout = () => {
    setUser({ ...user, isLoggedIn: false });
    showToast('Signed out of terminal successfully.', 'info');
  };

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync offline drafts to backend
  const handleSyncDrafts = async () => {
    if (drafts.length === 0) return;
    setIsSyncing(true);
    let successCount = 0;
    const remainingDrafts: Collection[] = [];
    const syncedCollections: Collection[] = [];

    for (const draft of drafts) {
      const ok = await createRemoteCollection(draft);
      if (ok) {
        successCount++;
        syncedCollections.push({ ...draft, isDraft: false });
      } else {
        remainingDrafts.push(draft);
      }
    }

    if (successCount > 0) {
      setCollections((prev) => [...syncedCollections, ...prev]);
      setDrafts(remainingDrafts);
      showToast(`Successfully synced ${successCount} draft(s) to central system!`, 'success');
    } else {
      showToast('Could not sync drafts. Backend server unreachable or offline.', 'error');
    }
    setIsSyncing(false);
  };

  // Save new collection and submit directly to central backend API or save as draft
  const handleSaveCollection = (data: Omit<Collection, 'id'>, isDraft: boolean) => {
    const randomIdNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `COL-${randomIdNum}`;

    const newRecord: Collection = {
      ...data,
      id: newId,
      isDraft: isDraft,
    };

    if (isDraft) {
      setDrafts((prev) => [newRecord, ...prev]);
      showToast(`Draft ${newId} saved offline in local queue.`, 'info');
      setCurrentView('dashboard');
      setSelectedClientForCollection(null);
      return;
    }

    // Add to local state
    setCollections((prev) => [newRecord, ...prev]);

    // Send to central backend database
    createRemoteCollection(newRecord).then((success) => {
      if (success) {
        console.log(`Collection ${newId} posted to backend API`);
      }
    });

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

    showToast(`Collection ${newId} submitted directly to central system!`, 'success');
    setActiveReceipt(newRecord);
    setCurrentView('dashboard');

    // Reset selected client
    setSelectedClientForCollection(null);
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
    setCollections((prevCollections) =>
      prevCollections.map((col) => {
        if (col.id === collectionId) {
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

    showToast(`Transaction #${collectionId} status updated to ${newStatus}.`, 'success');
  };

  // Select client from Clients directory and jump to New Collection screen
  const handleSelectClientForCollection = (client: Client) => {
    setSelectedClientForCollection(client);
    setCurrentView('new-collection');
  };

  // Delete / discard single draft
  const handleDeleteDraft = (draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    showToast(`Draft ${draftId} removed from local queue.`, 'info');
  };

  // Reset demo data
  const handleResetData = () => {
    setClients(INITIAL_CLIENTS);
    setCollections(INITIAL_COLLECTIONS);
    setDrafts(INITIAL_DRAFTS);
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
          isOffline={false}
          onToggleOffline={() => {}}
          isSyncing={isSyncing}
          onSync={handleSyncDrafts}
          pendingDraftCount={drafts.length}
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
              drafts={drafts}
              user={user}
              onNavigate={(view) => {
                if (view === 'new-collection') setSelectedClientForCollection(null);
                setCurrentView(view);
              }}
              onSelectCollection={(col) => setActiveReceipt(col)}
              onOpenStatusUpdate={(col) => setStatusUpdateCollection(col)}
              onSyncDrafts={handleSyncDrafts}
              isSyncing={isSyncing}
              onDeleteDraft={handleDeleteDraft}
              onOpenReport={() => setIsReportModalOpen(true)}
            />
          )}

          {currentView === 'clients' && (
            <ClientsView
              clients={clients}
              onSelectClientForCollection={handleSelectClientForCollection}
              onAddNewClient={handleAddNewClient}
            />
          )}

          {currentView === 'new-collection' && (
            <NewCollectionView
              clients={clients}
              initialSelectedClient={selectedClientForCollection}
              onSaveCollection={handleSaveCollection}
              onNavigate={setCurrentView}
              isOffline={false}
            />
          )}

          {currentView === 'history' && (
            <HistoryView
              collections={[...drafts, ...collections]}
              user={user}
              clients={clients}
              onSelectCollection={(col) => setActiveReceipt(col)}
              onOpenStatusUpdate={(col) => setStatusUpdateCollection(col)}
              onOpenReport={() => setIsReportModalOpen(true)}
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
          drafts={drafts}
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
          draftCount={drafts.length}
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
