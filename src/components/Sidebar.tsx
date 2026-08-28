import React from 'react';
import { 
  LayoutDashboard, 
  Banknote, 
  Users, 
  FileText, 
  HelpCircle, 
  LogOut,
  X
} from 'lucide-react';
import { ViewType, CollectorUser } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  user: CollectorUser;
  onOpenReport: () => void;
  onOpenSupport: () => void;
  onLogout: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  user,
  onOpenReport,
  onOpenSupport,
  onLogout,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ViewType,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'new-collection' as ViewType,
      label: 'New Collection',
      icon: Banknote,
    },
    {
      id: 'clients' as ViewType,
      label: 'Clients',
      icon: Users,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#2f3131] text-[#ffffff] select-none border-r border-[#e5e5e5]/10">
      {/* Header / Brand */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Company Logo" className="w-10 h-10 object-contain bg-white/10 p-1 rounded-lg shrink-0 shadow-sm" />
          <div className="min-w-0">
            <h1 className="font-bold text-base tracking-tight text-white leading-tight truncate">
              Collector Portal
            </h1>
            <p className="text-[11px] font-bold tracking-wider text-[#c8c6c5] uppercase mt-0.5 truncate">
              Terminal ID: {user.terminalId}
            </p>
          </div>
        </div>

        {mobileOpen && onCloseMobile && (
          <button 
            onClick={onCloseMobile}
            className="md:hidden text-[#c8c6c5] hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <ul className="flex-1 flex flex-col gap-1 px-3 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 text-xs font-bold tracking-wider uppercase transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-[#0891b2] text-white border-l-4 border-[#22d3ee] font-black shadow-inner'
                    : 'text-[#c8c6c5] hover:bg-[#474746]/60 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Bottom Actions & Utilities */}
      <div className="px-4 mt-auto flex flex-col gap-4 pb-6 pt-4 border-t border-[#474746]/30">
        <button
          onClick={() => {
            onOpenReport();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full h-11 bg-[#0891b2] hover:bg-[#0e7490] text-white border border-[#06b6d4] flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase transition-colors shadow-sm"
        >
          <FileText className="w-4 h-4" />
          <span>Generate Report</span>
        </button>

        <ul className="flex flex-col gap-1">
          <li>
            <button
              onClick={() => {
                onOpenSupport();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold tracking-wider uppercase text-[#c8c6c5] hover:bg-[#474746]/60 hover:text-white transition-colors text-left"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Support</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                onLogout();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold tracking-wider uppercase text-[#cffafe] hover:bg-[#0891b2]/30 hover:text-white transition-colors text-left"
            >
              <LogOut className="w-4 h-4 shrink-0 text-[#22d3ee]" />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed SideNav */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 h-full z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
