import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Check, 
  X, 
  Clock, 
  ArrowUpDown,
  FileText,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { Collection, TransactionStatus, CollectorUser, Client } from '../types';
import { formatXAF, INITIAL_USER } from '../data/mockData';
import {
  downloadReportPDF,
  downloadReportExcel,
  downloadReportWord,
  calculateReportMetrics,
} from '../utils/exportUtils';

interface HistoryViewProps {
  collections: Collection[];
  user?: CollectorUser;
  clients?: Client[];
  onSelectCollection: (col: Collection) => void;
  onOpenStatusUpdate?: (col: Collection) => void;
  onOpenReport: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  collections,
  user = INITIAL_USER,
  clients = [],
  onSelectCollection,
  onOpenStatusUpdate,
  onOpenReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [sortBy, setSortBy] = useState<'time' | 'amount'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    return collections
      .filter((col) => {
        if (statusFilter !== 'ALL' && col.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = col.clientName.toLowerCase().includes(q);
          const matchId = col.clientId.toLowerCase().includes(q);
          const matchColId = col.id.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchColId) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'amount') {
          return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
        }
        return sortOrder === 'desc'
          ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
  }, [collections, searchQuery, statusFilter, sortBy, sortOrder]);

  const handleExportCSV = () => {
    const headers = ['Collection ID', 'Client ID', 'Client Name', 'Amount (XAF)', 'Time', 'Status', 'Location'];
    const rows = filteredHistory.map((c) => [
      c.id,
      c.clientId,
      `"${c.clientName.replace(/"/g, '""')}"`,
      c.amount,
      c.time,
      c.status,
      `"${(c.location || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `E_NAKO_Collections_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
    setExportNotice('CSV ledger exported successfully.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportExcel = () => {
    const metrics = calculateReportMetrics(
      filteredHistory,
      [],
      clients,
      'Filtered Ledger View',
      new Date(0),
      new Date()
    );
    downloadReportExcel(filteredHistory, metrics, user);
    setShowExportMenu(false);
    setExportNotice('Excel (.xlsx) ledger report exported successfully.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportPDF = () => {
    const metrics = calculateReportMetrics(
      filteredHistory,
      [],
      clients,
      'Filtered Ledger Report',
      new Date(0),
      new Date()
    );
    downloadReportPDF(filteredHistory, metrics, user);
    setShowExportMenu(false);
    setExportNotice('PDF ledger report exported successfully.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportWord = () => {
    const metrics = calculateReportMetrics(
      filteredHistory,
      [],
      clients,
      'Filtered Ledger Report',
      new Date(0),
      new Date()
    );
    downloadReportWord(filteredHistory, metrics, user);
    setShowExportMenu(false);
    setExportNotice('Word (.doc) ledger report exported successfully.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const totalFilteredAmount = filteredHistory
    .filter((c) => c.status === 'COMPLETE')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-[#e5e5e5]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1a1c1c] mb-1">
            Collection History & Ledger
          </h1>
          <p className="text-sm text-[#5f5e5e]">
            Comprehensive audit log of cash transactions recorded on this terminal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto relative">
          <button
            onClick={onOpenReport}
            className="flex-1 md:flex-none px-4 py-2.5 bg-[#ffffff] border border-[#0891b2] text-[#0891b2] text-xs font-bold uppercase tracking-wider hover:bg-[#ecfeff] transition-colors flex items-center justify-center gap-2 shadow-2xs"
          >
            <FileText className="w-4 h-4 text-[#0891b2]" />
            <span>Generate Executive Report</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative flex-1 md:flex-none">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="w-full px-4 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Ledger</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#ffffff] border border-[#e5e5e5] shadow-2xl z-50 py-1 font-mono text-xs">
                <button
                  onClick={handleExportPDF}
                  className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c] border-b border-[#f3f3f3]"
                >
                  <FileText className="w-4 h-4 text-[#0891b2]" />
                  <span>Export as PDF (.pdf)</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c] border-b border-[#f3f3f3]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#0891b2]" />
                  <span>Export as Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleExportWord}
                  className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c] border-b border-[#f3f3f3]"
                >
                  <FileText className="w-4 h-4 text-[#0891b2]" />
                  <span>Export as Word (.doc)</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c]"
                >
                  <Download className="w-4 h-4 text-[#0891b2]" />
                  <span>Export Raw CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {exportNotice && (
        <div className="bg-[#ecfeff] border border-[#a5f3fc] px-4 py-2 text-xs font-bold text-[#0e7490] flex items-center justify-between">
          <span>{exportNotice}</span>
          <button onClick={() => setExportNotice(null)} className="text-[#0891b2] hover:underline uppercase text-[10px]">Dismiss</button>
        </div>
      )}

      {/* Filter and Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a4a4a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client, ID, or reference..."
            className="w-full h-11 pl-10 pr-4 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm text-[#1a1c1c]"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm font-bold uppercase cursor-pointer"
          >
            <option value="ALL">Status: All Records</option>
            <option value="COMPLETE">Status: Complete Only</option>
            <option value="PENDING">Status: Pending Drafts</option>
            <option value="CANCELLED">Status: Cancelled Only</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <button
            onClick={() => {
              if (sortBy === 'time') {
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              } else {
                setSortBy('time');
                setSortOrder('desc');
              }
            }}
            className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] hover:bg-[#f3f3f3] text-xs font-bold uppercase tracking-wider flex items-center justify-between"
          >
            <span>Time: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            <ArrowUpDown className="w-4 h-4 text-[#0891b2]" />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="bg-[#f3f3f3] border border-[#e5e5e5] px-4 sm:px-6 py-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between text-xs font-bold uppercase tracking-wider text-[#4a4a4a]">
        <span>Showing {filteredHistory.length} transaction entries</span>
        <span className="font-mono text-xs sm:text-sm text-[#1a1c1c]">
          Settled Total: <strong className="text-[#0891b2]">{formatXAF(totalFilteredAmount)} XAF</strong>
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-[#ffffff] border border-[#e5e5e5] overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-[#eeeeee] border-b border-[#e5e5e5] text-[#5f5e5e] text-xs font-bold tracking-wider uppercase">
              <th className="p-4">Reference / Time</th>
              <th className="p-4">Client Details</th>
              <th className="p-4">Amount (XAF)</th>
              <th className="p-4">Location</th>
              <th className="p-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e5e5]">
            {filteredHistory.map((col) => (
              <tr
                key={col.id}
                onClick={() => onSelectCollection(col)}
                className="hover:bg-[#f9f9f9] transition-colors cursor-pointer group"
              >
                <td className="p-4">
                  <div className="font-mono text-xs font-bold text-[#0891b2]">
                    {col.id}
                  </div>
                  <div className="text-xs text-[#5f5e5e] font-mono mt-0.5">
                    {col.time}
                  </div>
                </td>

                <td className="p-4">
                  <div className="font-semibold text-sm text-[#1a1c1c] group-hover:text-[#0891b2] transition-colors">
                    {col.clientName}
                  </div>
                  <div className="font-mono text-xs text-[#5f5e5e]">
                    ID: {col.clientId}
                  </div>
                </td>

                <td className="p-4 font-mono text-sm font-bold text-[#1a1c1c] tabular-nums">
                  {formatXAF(col.amount)}
                  {(col.shortageAmount || 0) > 0 && (
                    <div className="text-[10px] text-[#ba1a1a] font-normal">Shortage: -{formatXAF(col.shortageAmount!)}</div>
                  )}
                  {(col.extraAmount || 0) > 0 && (
                    <div className="text-[10px] text-[#0891b2] font-normal">Extra: +{formatXAF(col.extraAmount!)}</div>
                  )}
                </td>

                <td className="p-4 text-xs text-[#5f5e5e] max-w-[200px] truncate">
                  {col.location || 'Terminal Registered Location'}
                  {col.depositDestination && (
                    <div className="text-[10px] text-[#0891b2] font-mono font-semibold">
                      Bank: {col.depositDestination}
                    </div>
                  )}
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

            {filteredHistory.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-sm text-[#5f5e5e]">
                  No collection records match your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden flex flex-col border border-[#e5e5e5] bg-[#ffffff] divide-y divide-[#e5e5e5]">
        {filteredHistory.map((col) => (
          <div
            key={col.id}
            onClick={() => onSelectCollection(col)}
            className="p-4 flex flex-col gap-2.5 hover:bg-[#f9f9f9] active:bg-[#f3f3f3] transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#0891b2]">{col.id}</span>
              {col.status === 'COMPLETE' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ecfeff] text-[#0e7490] text-[10px] font-bold tracking-wider uppercase border border-[#a5f3fc]">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  <span>COMPLETE</span>
                </span>
              ) : col.status === 'CANCELLED' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#eeeeee] text-[#5f5e5e] text-[10px] font-bold tracking-wider uppercase border border-[#e5e5e5]">
                  <X className="w-2.5 h-2.5 stroke-[3]" />
                  <span>CANCELLED</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#eeeeee] text-[#5f5e5e] text-[10px] font-bold tracking-wider uppercase border border-[#e5e5e5]">
                  <Clock className="w-2.5 h-2.5" />
                  <span>PENDING</span>
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <div className="font-bold text-sm text-[#1a1c1c] truncate">
                  {col.clientName}
                </div>
                <div className="text-xs text-[#5f5e5e] font-mono mt-0.5">
                  ID: {col.clientId} • {col.time}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono text-base font-bold text-[#0891b2] tabular-nums">
                  {formatXAF(col.amount)}
                </div>
                <div className="text-[10px] text-[#5f5e5e] uppercase">XAF</div>
              </div>
            </div>

            {col.location && (
              <div className="text-[11px] text-[#5f5e5e] truncate pt-1 border-t border-[#e5e5e5]/60">
                📍 {col.location}
              </div>
            )}
          </div>
        ))}

        {filteredHistory.length === 0 && (
          <div className="p-8 text-center text-xs text-[#5f5e5e]">
            No collection records match your criteria.
          </div>
        )}
      </div>
    </div>
  );
};
