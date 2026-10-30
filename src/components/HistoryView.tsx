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
import { canViewCollection } from '../utils/permissions';
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
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  collections,
  user = INITIAL_USER,
  clients = [],
  onSelectCollection,
  onOpenStatusUpdate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [sortBy, setSortBy] = useState<'time' | 'amount'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Timeframe Filter Mode: 'all' | 'day' | 'month'
  const [timeframeMode, setTimeframeMode] = useState<'all' | 'day' | 'month'>('all');
  
  // Format today's date YYYY-MM-DD for initial day picker
  const getTodayDateString = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [selectedDay, setSelectedDay] = useState<string>(getTodayDateString());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Resolve active period label
  const activePeriodLabel = useMemo(() => {
    if (timeframeMode === 'day') {
      const parts = selectedDay.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return `Daily Report (${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    }
    if (timeframeMode === 'month') {
      return `Monthly Report (${monthsList[selectedMonth]} ${selectedYear})`;
    }
    return 'All Time Collection History';
  }, [timeframeMode, selectedDay, selectedMonth, selectedYear]);

  const filteredHistory = useMemo(() => {
    return collections
      .filter((col) => {
        if (!canViewCollection(user, col)) return false;
        // Status filter
        if (statusFilter !== 'ALL' && col.status !== statusFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = col.clientName.toLowerCase().includes(q);
          const matchId = col.clientId.toLowerCase().includes(q);
          const matchColId = col.id.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchColId) return false;
        }

        // Timeframe filter: Day / Month / All
        const itemDate = new Date(col.timestamp || Date.now());

        if (timeframeMode === 'day') {
          const parts = selectedDay.split('-').map(Number);
          return (
            itemDate.getFullYear() === parts[0] &&
            itemDate.getMonth() === parts[1] - 1 &&
            itemDate.getDate() === parts[2]
          );
        }

        if (timeframeMode === 'month') {
          return (
            itemDate.getFullYear() === selectedYear &&
            itemDate.getMonth() === selectedMonth
          );
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
  }, [collections, user, searchQuery, statusFilter, sortBy, sortOrder, timeframeMode, selectedDay, selectedMonth, selectedYear]);

  // Aggregated totals for the active filtered selection
  const totalFilteredCollected = useMemo(() => {
    return filteredHistory
      .filter((c) => c.status === 'COMPLETE')
      .reduce((sum, c) => {
        const actual = c.actualAmountCollected !== undefined 
          ? Number(c.actualAmountCollected) 
          : Number(c.amount || 0);
        return sum + actual;
      }, 0);
  }, [filteredHistory]);

  const totalFilteredTarget = useMemo(() => {
    return filteredHistory.reduce((sum, c) => sum + Number(c.targetAmount || c.amount || 0), 0);
  }, [filteredHistory]);

  const totalFilteredOutstanding = useMemo(() => {
    return filteredHistory.reduce((sum, c) => {
      const target = Number(c.targetAmount || c.amount || 0);
      if (c.status === 'COMPLETE') {
        const actual = c.actualAmountCollected !== undefined ? Number(c.actualAmountCollected) : Number(c.amount || 0);
        const shortage = c.shortageAmount !== undefined ? Number(c.shortageAmount) : Math.max(0, target - actual);
        return sum + shortage;
      }
      if (c.status === 'PENDING') {
        return sum + target;
      }
      return sum;
    }, 0);
  }, [filteredHistory]);

  const handleExportPDF = () => {
    const metrics = calculateReportMetrics(
      filteredHistory,
      [],
      clients,
      activePeriodLabel,
      new Date(0),
      new Date()
    );
    downloadReportPDF(filteredHistory, metrics, user);
    setShowExportMenu(false);
    setExportNotice(`Downloaded PDF Report for ${activePeriodLabel}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportExcel = () => {
    const metrics = calculateReportMetrics(
      filteredHistory,
      [],
      clients,
      activePeriodLabel,
      new Date(0),
      new Date()
    );
    downloadReportExcel(filteredHistory, metrics, user);
    setShowExportMenu(false);
    setExportNotice(`Excel (.xlsx) report exported for ${activePeriodLabel}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportCSV = () => {
    const headers = ['Collection ID', 'Client ID', 'Client Name', 'Target Due', 'Collected', 'Outstanding', 'Time', 'Status', 'Location'];
    const rows = filteredHistory.map((c) => {
      const target = Number(c.targetAmount || c.amount || 0);
      const actual = c.actualAmountCollected !== undefined ? Number(c.actualAmountCollected) : (c.status === 'COMPLETE' ? Number(c.amount || 0) : 0);
      const shortage = c.shortageAmount !== undefined ? Number(c.shortageAmount) : (c.status === 'COMPLETE' ? Math.max(0, target - actual) : target);

      return [
        c.id,
        c.clientId,
        `"${c.clientName.replace(/"/g, '""')}"`,
        target,
        actual,
        shortage,
        c.time,
        c.status,
        `"${(c.location || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `E_NAKO_Collections_${activePeriodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
    setExportNotice('CSV ledger exported successfully.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportWord = () => {
    const metrics = calculateReportMetrics(
      filteredHistory,
      [],
      clients,
      activePeriodLabel,
      new Date(0),
      new Date()
    );
    downloadReportWord(filteredHistory, metrics, user);
    setShowExportMenu(false);
    setExportNotice('Word (.doc) ledger report exported successfully.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-[#e5e5e5]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1a1c1c] mb-1">
            Collection History & Multi-Period Ledger
          </h1>
          <p className="text-sm text-[#5f5e5e]">
            Audit logs and historical transactions. Filter by specific day or month and download official reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto relative">
          {/* Direct 1-Click Download PDF Report Button */}
          <button
            onClick={handleExportPDF}
            className="flex-1 md:flex-none px-4 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            title={`Download PDF Report for ${activePeriodLabel}`}
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>

          {/* Export Dropdown Menu */}
          <div className="relative flex-1 md:flex-none">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="w-full px-4 py-2.5 bg-white border border-[#2f3131] hover:bg-slate-50 text-[#1a1c1c] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#0891b2]" />
              <span>More Formats</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-[#e5e5e5] shadow-2xl z-50 py-1 font-mono text-xs">
                <button
                  onClick={handleExportPDF}
                  className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c] border-b border-[#f3f3f3]"
                >
                  <FileText className="w-4 h-4 text-[#0891b2]" />
                  <span>Download PDF Document (.pdf)</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c] border-b border-[#f3f3f3]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#0891b2]" />
                  <span>Download Excel Spreadsheet (.xlsx)</span>
                </button>
                <button
                  onClick={handleExportWord}
                  className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c] border-b border-[#f3f3f3]"
                >
                  <FileText className="w-4 h-4 text-[#0891b2]" />
                  <span>Download Word Document (.doc)</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c]"
                >
                  <Download className="w-4 h-4 text-[#0891b2]" />
                  <span>Download Raw CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {exportNotice && (
        <div className="bg-[#ecfeff] border border-[#a5f3fc] px-4 py-2.5 rounded-lg text-xs font-bold text-[#0e7490] flex items-center justify-between shadow-2xs">
          <span>{exportNotice}</span>
          <button onClick={() => setExportNotice(null)} className="text-[#0891b2] hover:underline uppercase text-[10px]">Dismiss</button>
        </div>
      )}

      {/* TIMEFRAME SELECTOR: Pick Day vs Pick Month vs All Time */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0891b2]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Select Report Timeframe:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTimeframeMode('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeframeMode === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setTimeframeMode('day')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeframeMode === 'day'
                  ? 'bg-[#0891b2] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pick Specific Day
            </button>
            <button
              onClick={() => setTimeframeMode('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeframeMode === 'month'
                  ? 'bg-[#0891b2] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pick Specific Month
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on selected timeframe */}
        {timeframeMode === 'day' && (
          <div className="flex flex-wrap items-center gap-3 bg-cyan-50/50 p-3 rounded-xl border border-cyan-100">
            <div className="flex items-center gap-2">
              <label htmlFor="history_day_picker" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Pick Day:
              </label>
              <input
                id="history_day_picker"
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#0891b2]"
              />
            </div>

            <button
              onClick={() => setSelectedDay(getTodayDateString())}
              className="px-3 py-2 bg-white border border-slate-300 hover:border-[#0891b2] text-[#0891b2] text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              Set to Today
            </button>

            <span className="text-xs text-slate-500 ml-auto font-medium">
              Active: <strong className="text-slate-900">{activePeriodLabel}</strong>
            </span>
          </div>
        )}

        {timeframeMode === 'month' && (
          <div className="flex flex-wrap items-center gap-3 bg-cyan-50/50 p-3 rounded-xl border border-cyan-100">
            <div className="flex items-center gap-2">
              <label htmlFor="history_month_picker" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Month:
              </label>
              <select
                id="history_month_picker"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-[#0891b2] cursor-pointer"
              >
                {monthsList.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="history_year_picker" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Year:
              </label>
              <select
                id="history_year_picker"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-[#0891b2] cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setSelectedMonth(new Date().getMonth());
                setSelectedYear(new Date().getFullYear());
              }}
              className="px-3 py-2 bg-white border border-slate-300 hover:border-[#0891b2] text-[#0891b2] text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              Set to Current Month
            </button>

            <span className="text-xs text-slate-500 ml-auto font-medium">
              Active: <strong className="text-slate-900">{activePeriodLabel}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Executive Key Metric Cards for Current Filter Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Total Settled Amount */}
        <div className="bg-white border border-cyan-200 p-4 rounded-xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0891b2] block">Total Cash Settled</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums">{formatXAF(totalFilteredCollected)}</span>
            <span className="text-xs font-bold text-slate-500">FCFA</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">In {activePeriodLabel}</span>
        </div>

        {/* Metric 2: Total Outstanding Balance (Shortfall + Pending) */}
        <div className="bg-white border border-rose-200 p-4 rounded-xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Total Outstanding Balance</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono tabular-nums">{formatXAF(totalFilteredOutstanding)}</span>
            <span className="text-xs font-bold text-rose-500">FCFA</span>
          </div>
          <span className="text-[11px] text-rose-600 font-medium mt-1 block">Uncollected &amp; deficit shortfall</span>
        </div>

        {/* Metric 3: Total Target Volume */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Target / Due Volume</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums">{formatXAF(totalFilteredTarget)}</span>
            <span className="text-xs font-bold text-slate-500">FCFA</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">{filteredHistory.length} total transaction entries</span>
        </div>
      </div>

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
            className="w-full h-11 pl-10 pr-4 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm text-[#1a1c1c] rounded-xl"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] outline-none text-sm font-bold uppercase cursor-pointer rounded-xl"
          >
            <option value="ALL">Status: All Records</option>
            <option value="COMPLETE">Status: Complete Only</option>
            <option value="PENDING">Status: Pending Only</option>
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
            className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] hover:bg-[#f3f3f3] text-xs font-bold uppercase tracking-wider flex items-center justify-between rounded-xl cursor-pointer"
          >
            <span>Time: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            <ArrowUpDown className="w-4 h-4 text-[#0891b2]" />
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-800 text-white text-[10px] font-bold tracking-wider uppercase">
              <th className="p-3.5">Reference / Time</th>
              <th className="p-3.5">Client Details</th>
              <th className="p-3.5">Target Due</th>
              <th className="p-3.5">Collected</th>
              <th className="p-3.5">Outstanding Balance</th>
              <th className="p-3.5">Location</th>
              <th className="p-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e5e5] text-xs">
            {filteredHistory.map((col) => {
              const target = Number(col.targetAmount || col.amount || 0);
              const actual = col.actualAmountCollected !== undefined 
                ? Number(col.actualAmountCollected) 
                : (col.status === 'COMPLETE' ? Number(col.amount || 0) : 0);
              const shortage = col.shortageAmount !== undefined 
                ? Number(col.shortageAmount) 
                : (col.status === 'COMPLETE' ? Math.max(0, target - actual) : target);

              return (
                <tr
                  key={col.id}
                  onClick={() => onSelectCollection(col)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <td className="p-3.5">
                    <div className="font-mono text-xs font-bold text-[#0891b2]">
                      {col.id}
                    </div>
                    <div className="text-[10px] text-[#5f5e5e] font-mono mt-0.5">
                      {col.time}
                    </div>
                  </td>

                  <td className="p-3.5">
                    <div className="font-bold text-sm text-[#1a1c1c] group-hover:text-[#0891b2] transition-colors">
                      {col.clientName}
                    </div>
                    <div className="font-mono text-[10px] text-[#5f5e5e]">
                      Collector: {col.assignedCollectorName || user.name || 'Field Agent'}
                    </div>
                  </td>

                  <td className="p-3.5 font-mono text-xs font-medium text-slate-700">
                    {formatXAF(target)} FCFA
                  </td>

                  <td className="p-3.5 font-mono text-xs font-bold text-[#166534]">
                    {formatXAF(actual)} FCFA
                  </td>

                  <td className="p-3.5 font-mono text-xs font-bold text-rose-600">
                    {shortage > 0 ? `${formatXAF(shortage)} FCFA` : '0 FCFA'}
                  </td>

                  <td className="p-3.5 text-[11px] text-[#5f5e5e] max-w-[180px] truncate">
                    {col.location || 'Douala Field Sector'}
                  </td>

                  <td className="p-3.5 text-right">
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold tracking-wider uppercase border border-emerald-200 rounded-full">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{shortage > 0 ? 'DEFICIT SETTLED' : 'COMPLETE'}</span>
                        </span>
                      ) : col.status === 'CANCELLED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 text-[10px] font-bold tracking-wider uppercase border border-rose-200 rounded-full">
                          <X className="w-3 h-3 stroke-[3]" />
                          <span>CANCELLED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold tracking-wider uppercase border border-amber-200 rounded-full">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>PENDING</span>
                        </span>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredHistory.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-xs text-slate-500">
                  <p className="text-sm font-bold text-slate-800">No records found matching this timeframe or filter.</p>
                  <p className="text-slate-500 mt-1">Try switching to "All Records" or picking a different date or month above.</p>
                </td>
              </tr>
            )}
          </tbody>

          {/* Table Total Summary Footer */}
          {filteredHistory.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs text-slate-900">
                <td colSpan={2} className="p-3.5 uppercase tracking-wider text-slate-600">
                  TOTALS ({filteredHistory.length} records)
                </td>
                <td className="p-3.5 font-mono text-slate-900">
                  {formatXAF(totalFilteredTarget)} FCFA
                </td>
                <td className="p-3.5 font-mono text-[#166534]">
                  {formatXAF(totalFilteredCollected)} FCFA
                </td>
                <td className="p-3.5 font-mono text-rose-600">
                  {formatXAF(totalFilteredOutstanding)} FCFA
                </td>
                <td colSpan={2} className="p-3.5 text-right font-normal text-slate-500">
                  {activePeriodLabel}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden flex flex-col border border-[#e5e5e5] bg-[#ffffff] divide-y divide-[#e5e5e5]">
        {filteredHistory.map((col) => {
          const target = Number(col.targetAmount || col.amount || 0);
          const actual = col.actualAmountCollected !== undefined ? Number(col.actualAmountCollected) : (col.status === 'COMPLETE' ? Number(col.amount || 0) : 0);
          const shortage = col.shortageAmount !== undefined ? Number(col.shortageAmount) : (col.status === 'COMPLETE' ? Math.max(0, target - actual) : target);

          return (
            <div
              key={col.id}
              onClick={() => onSelectCollection(col)}
              className="p-4 flex flex-col gap-2.5 hover:bg-[#f9f9f9] active:bg-[#f3f3f3] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0891b2]">{col.id}</span>
                {col.status === 'COMPLETE' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold tracking-wider uppercase border border-emerald-200 rounded-full">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span>{shortage > 0 ? 'DEFICIT SETTLED' : 'COMPLETE'}</span>
                  </span>
                ) : col.status === 'CANCELLED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-800 text-[10px] font-bold tracking-wider uppercase border border-rose-200 rounded-full">
                    <X className="w-2.5 h-2.5 stroke-[3]" />
                    <span>CANCELLED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold tracking-wider uppercase border border-amber-200 rounded-full">
                    <Clock className="w-2.5 h-2.5" />
                    <span>PENDING</span>
                  </span>
                )}
              </div>

              <div>
                <div className="font-bold text-sm text-[#1a1c1c] truncate">
                  {col.clientName}
                </div>
                <div className="text-xs text-[#5f5e5e] font-mono mt-0.5">
                  ID: {col.clientId} • {col.time}
                </div>
              </div>

              {/* Financial Metrics Row */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Target</span>
                  <span className="font-mono font-bold text-slate-800">{formatXAF(target)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-emerald-600 font-semibold block">Collected</span>
                  <span className="font-mono font-bold text-[#166534]">{formatXAF(actual)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-rose-600 font-semibold block">Outstanding</span>
                  <span className="font-mono font-bold text-rose-600">{shortage > 0 ? formatXAF(shortage) : '0'}</span>
                </div>
              </div>

              {col.location && (
                <div className="text-[11px] text-[#5f5e5e] truncate pt-1 border-t border-[#e5e5e5]/60">
                  📍 {col.location}
                </div>
              )}
            </div>
          );
        })}

        {filteredHistory.length > 0 && (
          <div className="p-4 bg-slate-100 flex flex-col gap-2 border-t-2 border-slate-300">
            <div className="text-xs font-bold uppercase text-slate-600 tracking-wider">
              Period Totals ({filteredHistory.length} records)
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Target</div>
                <div className="font-mono font-bold text-slate-800">{formatXAF(totalFilteredTarget)}</div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-700 uppercase">Collected</div>
                <div className="font-mono font-bold text-[#166534]">{formatXAF(totalFilteredCollected)}</div>
              </div>
              <div>
                <div className="text-[10px] text-rose-600 uppercase">Outstanding</div>
                <div className="font-mono font-bold text-rose-600">{formatXAF(totalFilteredOutstanding)}</div>
              </div>
            </div>
          </div>
        )}

        {filteredHistory.length === 0 && (
          <div className="p-8 text-center text-xs text-[#5f5e5e]">
            No collection records match your criteria.
          </div>
        )}
      </div>
    </div>
  );
};
