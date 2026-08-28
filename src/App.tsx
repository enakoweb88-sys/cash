import React, { useState, useEffect } from 'react';
import { 
  INITIAL_USER, 
  INITIAL_CLIENTS, 
  INITIAL_COLLECTIONS, 
  INITIAL_DRAFTS,
  formatXAF
} from './data/mockData';
import { Client, Collection, CollectorUser, ViewType } from './types';
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
    const saved = localStorage.getItem('enako_clients') || localStorage.getItem('afriland_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  // Collections (Settled / Server synced)
  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('enako_collections') || localStorage.getItem('afriland_collections');
    return saved ? JSON.parse(saved) : INITIAL_COLLECTIONS;
  });

  // Offline Drafts
  const [drafts, setDrafts] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('enako_drafts') || localStorage.getItem('afriland_drafts');
    return saved ? JSON.parse(saved) : INITIAL_DRAFTS;
  });

  // Selected client when navigating from Clients -> New Collection
  const [selectedClientForCollection, setSelectedClientForCollection] = useState<Client | null>(null);

  // Modals state
  const [activeReceipt, setActiveReceipt] = useState<Collection | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Global search
  const [globalSearch, setGlobalSearch] = useState('');

  // Offline Mode and Sync State
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
  const handleLogin = (credentials: { id: string; remember: boolean }) => {
    setUser({
      ...user,
      id: credentials.id || 'COL-0921',
      isLoggedIn: true,
    });
    showToast(`Welcome back, Officer ${credentials.id}! Terminal AFB-092 initialized.`, 'success');
  };

  // Logout handler
  const handleLogout = () => {
    setUser({ ...user, isLoggedIn: false });
    showToast('Signed out of terminal successfully.', 'info');
  };

  // Save new collection (either submitted directly or saved as offline draft)
  const handleSaveCollection = (data: Omit<Collection, 'id'>, isDraft: boolean) => {
    const randomIdNum = Math.floor(1000 + Math.random() * 9000);
    const newId = isDraft ? `C-${randomIdNum}` : `COL-${randomIdNum}`;

    const newRecord: Collection = {
      ...data,
      id: newId,
      isDraft,
    };

    if (isDraft || isOffline) {
      // Add to drafts
      const draftRecord = { ...newRecord, isDraft: true, status: 'PENDING' as const };
      setDrafts((prev) => [draftRecord, ...prev]);
      showToast(`Draft saved locally (${formatXAF(data.amount)} XAF). Awaiting network sync.`, 'info');
      setCurrentView('dashboard');
    } else {
      // Add to synced collections
      setCollections((prev) => [newRecord, ...prev]);

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

      showToast(`Collection ${newId} submitted and settled successfully!`, 'success');
      setActiveReceipt(newRecord);
      setCurrentView('dashboard');
    }

    // Reset selected client
    setSelectedClientForCollection(null);
  };

  // Sync Drafts
  const handleSyncDrafts = () => {
    if (drafts.length === 0) {
      showToast('No pending offline drafts to sync.', 'info');
      return;
    }

    setIsSyncing(true);
    showToast(`Connecting to central vault to sync ${drafts.length} drafts...`, 'info');

    setTimeout(() => {
      // Convert drafts to completed collections
      const syncedCollections: Collection[] = drafts.map((d) => ({
        ...d,
        status: 'COMPLETE',
        isDraft: false,
      }));

      // Update client balances for all synced drafts
      setClients((prevClients) => {
        let updated = [...prevClients];
        drafts.forEach((draft) => {
          updated = updated.map((c) => {
            if (c.id === draft.clientId) {
              return {
                ...c,
                outstandingBalance: Math.max(0, c.outstandingBalance - draft.amount),
                lastVisit: 'Today',
              };
            }
            return c;
          });
        });
        return updated;
      });

      setCollections((prev) => [...syncedCollections, ...prev]);
      setDrafts([]);
      setIsSyncing(false);
      showToast(`All ${drafts.length} drafts synchronized and settled!`, 'success');
    }, 1200);
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
          isOffline={isOffline}
          onToggleOffline={() => {
            const nextState = !isOffline;
            setIsOffline(nextState);
            showToast(
              nextState 
                ? 'Offline Mode Active. New collections will be saved to local drafts.' 
                : 'Online Mode Connected. Terminal connected to Central Vault.',
              nextState ? 'info' : 'success'
            );
          }}
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
              onNavigate={(view) => {
                if (view === 'new-collection') setSelectedClientForCollection(null);
                setCurrentView(view);
              }}
              onSelectCollection={(col) => setActiveReceipt(col)}
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
              isOffline={isOffline}
            />
          )}

          {currentView === 'history' && (
            <HistoryView
              collections={[...drafts, ...collections]}
              user={user}
              clients={clients}
              onSelectCollection={(col) => setActiveReceipt(col)}
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
          isOffline={isOffline}
          onToggleOffline={() => {
            setIsOffline(!isOffline);
            showToast(!isOffline ? 'Offline Mode Active' : 'Online Mode Connected', 'info');
          }}
          onResetData={handleResetData}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}

      {isSupportModalOpen && (
        <SupportModal
          user={user}
          isOffline={isOffline}
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
