import React from 'react';
import { 
  Plus, 
  Wallet, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Navigation, 
  ChevronRight, 
  Check, 
  X, 
  CloudOff, 
  RotateCw,
  Eye,
  Trash2,
  FileText
} from 'lucide-react';
import { Collection, ViewType, CollectorUser } from '../types';
import { formatXAF } from '../data/mockData';

interface DashboardViewProps {
  collections: Collection[];
  drafts: Collection[];
  user?: CollectorUser;
  onNavigate: (view: ViewType) => void;
  onSelectCollection: (col: Collection) => void;
  onOpenStatusUpdate?: (col: Collection) => void;
  onSyncDrafts: () => void;
  isSyncing: boolean;
  onDeleteDraft?: (id: string) => void;
  onOpenReport?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  collections,
  drafts,
  user,
  onNavigate,
  onSelectCollection,
  onOpenStatusUpdate,
  onSyncDrafts,
  isSyncing,
  onDeleteDraft,
  onOpenReport,
}) => {
  // Extract collector's first name only
  const firstName = user?.name ? user.name.trim().split(' ')[0] : 'Collector';

  // Calculate real-time totals
  const totalCompletedAmount = collections
    .filter((c) => c.status === 'COMPLETE')
    .reduce((sum, c) => sum + c.amount, 0);

  const pendingDraftsCount = drafts.length;

  // Total visited clients count (completed + cancelled attempts)
  const visitedCount = collections.length;
  const targetClientsCount = 20;
  const completionPercentage = Math.min(100, Math.round((visitedCount / targetClientsCount) * 100));

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#e5e5e5] pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1a1c1c] mb-1">
            Welcome, {firstName}
          </h2>
          <p className="text-sm text-[#5f5e5e]">
            Today's collection status and activities.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {onOpenReport && (
            <button
              onClick={onOpenReport}
              className="flex-1 md:flex-none h-12 px-5 bg-[#ffffff] border border-[#0891b2] text-[#0891b2] hover:bg-[#ecfeff] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <FileText className="w-4 h-4 text-[#0891b2]" />
              <span>General Report</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('new-collection')}
            className="flex-1 md:flex-none h-12 px-6 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Start New Collection</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Collected */}
        <div className="bg-[#ffffff] border border-[#e5e5e5] p-4 sm:p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[#5f5e5e]">
            <span className="text-xs font-bold tracking-wider uppercase text-[#5f5e5e]">
              Total Collected Today
            </span>
            <Wallet className="w-5 h-5 text-[#0891b2]" />
          </div>

          <div className="my-3">
            <span className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0891b2] tabular-nums">
              {formatXAF(totalCompletedAmount)}
            </span>
            <span className="text-base sm:text-lg font-bold text-[#5f5e5e] ml-2">XAF</span>
          </div>

          <div className="text-xs text-[#4a4a4a] flex items-center gap-1.5 font-medium">
            <TrendingUp className="w-4 h-4 text-[#0891b2]" />
            <span>+12% vs yesterday</span>
          </div>
        </div>

        {/* Pending Drafts */}
        <div className="bg-[#ffffff] border border-[#e5e5e5] p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-center text-[#5f5e5e]">
            <span className="text-xs font-bold tracking-wider uppercase text-[#5f5e5e]">
              Pending Drafts
            </span>
            <Clock className="w-5 h-5 text-[#5f5e5e]" />
          </div>

          <div className="my-3">
            <span className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1a1c1c] tabular-nums">
              {pendingDraftsCount}
            </span>
          </div>

          <div className="text-xs text-[#0891b2] flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#0891b2]" />
            <span className="truncate">{pendingDraftsCount > 0 ? 'Awaiting network sync' : 'All local drafts synced'}</span>
          </div>
        </div>

        {/* Route Completion */}
        <div className="bg-[#ffffff] border border-[#e5e5e5] p-4 sm:p-6 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-center text-[#5f5e5e]">
            <span className="text-xs font-bold tracking-wider uppercase text-[#5f5e5e]">
              Route Completion
            </span>
            <Navigation className="w-5 h-5 text-[#0891b2]" />
          </div>

          <div className="my-3 flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1a1c1c] tabular-nums">
              {completionPercentage}
            </span>
            <span className="text-lg sm:text-xl font-bold text-[#5f5e5e]">%</span>
          </div>

          <div>
            <div className="w-full bg-[#e2e2e2] h-2 mb-1.5">
              <div
                className="bg-[#0891b2] h-2 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="text-xs text-[#5f5e5e] text-right font-medium">
              {visitedCount}/{targetClientsCount} Clients visited
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Collections */}
        <div className="lg:col-span-2 bg-[#ffffff] border border-[#e5e5e5] flex flex-col">
          <div className="p-4 sm:p-6 border-b border-[#e5e5e5] flex justify-between items-center">
            <h3 className="text-base sm:text-lg font-bold text-[#1a1c1c]">Recent Collections</h3>
            <button
              onClick={() => onNavigate('history')}
              className="text-[#0891b2] text-xs font-bold tracking-wider uppercase hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-[#f3f3f3] border-b border-[#e5e5e5] text-[#5f5e5e] text-xs font-bold tracking-wider uppercase">
                  <th className="p-4 font-normal">Client ID / Name</th>
                  <th className="p-4 font-normal">Amount (XAF)</th>
                  <th className="p-4 font-normal">Time</th>
                  <th className="p-4 font-normal text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {collections.slice(0, 5).map((col) => (
                  <tr
                    key={col.id}
                    onClick={() => onSelectCollection(col)}
                    className="hover:bg-[#f9f9f9] transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="font-mono text-sm font-semibold text-[#1a1c1c] group-hover:text-[#0891b2] transition-colors flex items-center gap-2">
                        <span>{col.clientId}</span>
                        {col.type && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border ${
                            col.type === 'PAYOUT' ? 'bg-[#ffdad6] text-[#93000a] border-[#ffb4ab]' : 'bg-[#ecfeff] text-[#0e7490] border-[#a5f3fc]'
                          }`}>
                            {col.type}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#5f5e5e] mt-0.5">
                        {col.clientName}
                      </div>
                      {col.depositDestination && (
                        <div className="text-[10px] font-mono text-[#0891b2] font-semibold mt-0.5">
                          Bank: {col.depositDestination}
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-sm font-bold text-[#1a1c1c] group-hover:text-[#0891b2] transition-colors tabular-nums font-mono">
                      {formatXAF(col.amount)}
                      {(col.shortageAmount || 0) > 0 && (
                        <div className="text-[10px] text-[#ba1a1a] font-normal">Shortage: -{formatXAF(col.shortageAmount!)}</div>
                      )}
                      {(col.extraAmount || 0) > 0 && (
                        <div className="text-[10px] text-[#0891b2] font-normal">Extra: +{formatXAF(col.extraAmount!)}</div>
                      )}
                    </td>

                    <td className="p-4 text-xs text-[#5f5e5e] font-mono">
                      {col.time}
                    </td>

                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenStatusUpdate) onOpenStatusUpdate(col);
                          else onSelectCollection(col);
                        }}
                        className="hover:opacity-80 transition-opacity cursor-pointer inline-block"
                        title="Click to update transaction status"
                      >
                        {col.status === 'COMPLETE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#ecfeff] text-[#0e7490] text-[11px] font-bold tracking-wider uppercase border border-[#a5f3fc]">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>COMPLETE</span>
                          </span>
                        ) : col.status === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#eeeeee] text-[#5f5e5e] text-[11px] font-bold tracking-wider uppercase border border-[#e5e5e5]">
                            <X className="w-3 h-3 stroke-[3]" />
                            <span>CANCELLED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#eeeeee] text-[#5f5e5e] text-[11px] font-bold tracking-wider uppercase border border-[#e5e5e5]">
                            <Clock className="w-3 h-3 text-[#0891b2]" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}

                {collections.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-sm text-[#5f5e5e]">
                      No collections recorded today yet. Click "Start New Collection" to record one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="sm:hidden divide-y divide-[#e5e5e5]">
            {collections.slice(0, 5).map((col) => (
              <div
                key={col.id}
                onClick={() => onSelectCollection(col)}
                className="p-3.5 flex items-center justify-between hover:bg-[#f9f9f9] transition-colors cursor-pointer active:bg-[#f3f3f3]"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0891b2]">{col.clientId}</span>
                    <span className="text-[11px] text-[#5f5e5e] font-mono">{col.time}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#1a1c1c] truncate mt-0.5">
                    {col.clientName}
                  </div>
                  <div className="font-mono text-sm font-bold text-[#1a1c1c] mt-1">
                    {formatXAF(col.amount)} <span className="text-xs font-sans text-[#5f5e5e]">XAF</span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {col.status === 'COMPLETE' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ecfeff] text-[#0e7490] text-[10px] font-bold tracking-wider uppercase border border-[#a5f3fc]">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>PAID</span>
                    </span>
                  ) : col.status === 'CANCELLED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#eeeeee] text-[#5f5e5e] text-[10px] font-bold tracking-wider uppercase border border-[#e5e5e5]">
                      <X className="w-3 h-3 stroke-[3]" />
                      <span>CANCELLED</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#eeeeee] text-[#5f5e5e] text-[10px] font-bold tracking-wider uppercase border border-[#e5e5e5]">
                      <Clock className="w-3 h-3" />
                      <span>DRAFT</span>
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#0891b2]" />
                </div>
              </div>
            ))}

            {collections.length === 0 && (
              <div className="p-6 text-center text-xs text-[#5f5e5e]">
                No collections recorded today yet. Click "Start New Collection" to record one.
              </div>
            )}
          </div>
        </div>

        {/* Sync Status & Offline Drafts */}
        <div className="bg-[#ffffff] border border-[#e5e5e5] flex flex-col p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 border-b border-[#e5e5e5] pb-3">
            <CloudOff className="w-5 h-5 text-[#0891b2]" />
            <h3 className="text-lg font-bold text-[#1a1c1c]">Offline Drafts</h3>
          </div>

          <p className="text-xs text-[#5f5e5e] mb-4 leading-relaxed">
            These collections are saved locally and need to be synced when network is available.
          </p>

          <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-72 pr-1">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="p-3.5 bg-[#f3f3f3] border border-[#e5e5e5] flex justify-between items-center group hover:border-[#0891b2] transition-all"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-[#1a1c1c]">
                    {draft.clientId}
                  </div>
                  <div className="font-mono text-sm font-semibold text-[#1a1c1c] mt-0.5">
                    {formatXAF(draft.amount)} XAF
                  </div>
                  <div className="text-[11px] text-[#5f5e5e] truncate max-w-[140px]">
                    {draft.clientName}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#eeeeee] text-[#1a1c1c] text-[10px] font-bold tracking-wider uppercase border border-[#e5e5e5]">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Pending</span>
                  </span>

                  {onDeleteDraft && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDraft(draft.id);
                      }}
                      className="text-[#5f5e5e] hover:text-[#0891b2] p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Discard draft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {drafts.length === 0 && (
              <div className="p-6 text-center border border-dashed border-[#e5e5e5] text-xs text-[#5f5e5e] my-auto">
                No pending offline drafts. Terminal is fully synchronized.
              </div>
            )}
          </div>

          <button
            onClick={onSyncDrafts}
            disabled={drafts.length === 0 || isSyncing}
            className={`w-full h-12 mt-4 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 border transition-all ${
              drafts.length > 0
                ? 'bg-[#0891b2] hover:bg-[#0e7490] text-white border-[#06b6d4] cursor-pointer shadow-sm'
                : 'bg-[#f9f9f9] text-[#c8c6c5] border-[#e5e5e5] cursor-not-allowed'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-white' : ''}`} />
            <span>
              {isSyncing ? 'Syncing...' : `Sync Now (${drafts.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
