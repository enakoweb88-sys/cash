import React, { useState } from 'react';
import { 
  Menu, 
  RotateCw, 
  Settings as SettingsIcon, 
  User as UserIcon,
  Search,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { ViewType, CollectorUser } from '../types';

interface TopBarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  user: CollectorUser;
  isOffline: boolean;
  onToggleOffline: () => void;
  isSyncing: boolean;
  onSync: () => void;
  pendingDraftCount: number;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenMobileMenu: () => void;
  globalSearch: string;
  onGlobalSearchChange: (query: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onNavigate,
  user,
  isOffline,
  onToggleOffline,
  isSyncing,
  onSync,
  pendingDraftCount,
  onOpenSettings,
  onOpenProfile,
  onOpenMobileMenu,
  globalSearch,
  onGlobalSearchChange,
}) => {
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <header className="w-full bg-[#ffffff] border-b border-[#e5e5e5] sticky top-0 z-30 shrink-0">
      <div className="h-16 flex items-center justify-between px-3 sm:px-4 md:px-8">
        {/* Left: Brand & Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 -ml-1 text-[#1a1c1c] hover:bg-[#eeeeee] transition-colors shrink-0"
            title="Open menu"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none min-w-0"
          >
            <img src="/logo.png" alt="E-NAKO Logo" className="h-9 w-auto object-contain shrink-0" />
            <span className="font-bold text-base sm:text-lg md:text-xl text-[#0891b2] uppercase tracking-tight truncate">
              E-NAKO
            </span>
          </div>
        </div>

        {/* Center: Navigation Tabs & Search (Desktop) */}
        <div className="hidden lg:flex items-center gap-8 justify-center">
          <nav className="flex gap-6 items-center">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`text-xs font-bold uppercase tracking-wider px-2 py-1 transition-all ${
                currentView === 'dashboard'
                  ? 'text-[#0891b2] border-b-2 border-[#0891b2] pb-1'
                  : 'text-[#5f5e5e] hover:text-[#1a1c1c]'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('history')}
              className={`text-xs font-bold uppercase tracking-wider px-2 py-1 transition-all ${
                currentView === 'history'
                  ? 'text-[#0891b2] border-b-2 border-[#0891b2] pb-1'
                  : 'text-[#5f5e5e] hover:text-[#1a1c1c]'
              }`}
            >
              History
            </button>
          </nav>

          {/* Global Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a4a]" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              placeholder="Search records or clients..."
              className="w-56 h-8 pl-8 pr-3 bg-[#ffffff] border border-[#e5e5e5] text-xs text-[#1a1c1c] placeholder:text-[#5f5e5e] outline-none focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] transition-all"
            />
          </div>
        </div>

        {/* Right: Network Status & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 text-[#0891b2] shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#4a4a4a] hover:bg-[#eeeeee] transition-colors"
            title="Search"
            aria-label="Toggle search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Online status indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase bg-[#ecfeff] text-[#0e7490] border border-[#a5f3fc]">
            <div className="w-2 h-2 rounded-full bg-[#0891b2]" />
            <span>Online System</span>
          </div>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#0891b2] hover:bg-[#eeeeee] transition-colors"
            title="Terminal Settings & Diagnostics"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* Account Profile Button */}
          <button
            onClick={onOpenProfile}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#0891b2] hover:bg-[#eeeeee] transition-colors"
            title={`${user.name} (${user.id})`}
            aria-label="Profile"
          >
            <UserIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Expandable */}
      {showMobileSearch && (
        <div className="lg:hidden px-3 py-2 bg-[#f3f3f3] border-t border-[#e5e5e5] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a4a]" />
            <input
              type="text"
              autoFocus
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              placeholder="Search records or clients..."
              className="w-full h-9 pl-8 pr-8 bg-[#ffffff] border border-[#e5e5e5] text-xs text-[#1a1c1c] placeholder:text-[#5f5e5e] outline-none focus:border-[#0891b2]"
            />
            {globalSearch && (
              <button
                onClick={() => onGlobalSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f5e5e] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowMobileSearch(false)}
            className="text-xs font-bold text-[#5f5e5e] px-2 py-1 hover:text-[#1a1c1c]"
          >
            Close
          </button>
        </div>
      )}
    </header>
  );
};
