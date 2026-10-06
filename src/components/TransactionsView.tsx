import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Download,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  FileText,
  Calendar,
  SlidersHorizontal,
  Eye
} from 'lucide-react';
import { FxTransaction, CollectorUser, ViewType } from '../types';
import { fetchRemoteTransactions, settleRemoteTransaction } from '../api/cashApi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface TransactionsViewProps {
  user: CollectorUser;
  onNavigate: (view: ViewType) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ user, onNavigate, onShowToast }) => {
  const [items, setItems] = useState<FxTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<FxTransaction | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [channelFilter, setChannelFilter] = useState('All Channels');

  // Export & Period Selection State
  const [selectedPeriodPreset, setSelectedPeriodPreset] = useState<string>('all-time');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear()); // e.g. 2026

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRemoteTransactions({
        search,
        type: typeFilter !== 'All Types' ? typeFilter : undefined,
        status: statusFilter !== 'All Status' ? statusFilter : undefined,
        channel: channelFilter !== 'All Channels' ? channelFilter : undefined,
        limit: 200,
      });
      if (res && res.items) {
        setItems(res.items);
      } else if (Array.isArray(res)) {
        setItems(res);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn('Load transactions error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, channelFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Settle Transaction Status
  const handleSettle = async (id: string) => {
    const ok = await settleRemoteTransaction(id);
    if (ok) {
      onShowToast(`Transaction #${id} marked as SETTLED.`, 'success');
      loadTransactions();
    } else {
      onShowToast('Failed to update settlement status.', 'error');
    }
  };

  // Filter items by Period Selector for display and exports
  const getFilteredItemsByPeriod = useCallback(() => {
    return items.filter((tx) => {
      const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
      const now = new Date();

      if (selectedPeriodPreset === 'current-month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      }

      if (selectedPeriodPreset === 'last-month') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return txDate.getMonth() === lastMonthDate.getMonth() && txDate.getFullYear() === lastMonthDate.getFullYear();
      }

      if (selectedPeriodPreset === 'specific-month') {
        return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
      }

      if (selectedPeriodPreset === 'last-6-months') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        return txDate >= sixMonthsAgo;
      }

      if (selectedPeriodPreset === 'year-2025') {
        return txDate.getFullYear() === 2025;
      }

      if (selectedPeriodPreset === 'year-2026') {
        return txDate.getFullYear() === 2026;
      }

      return true; // all-time
    });
  }, [items, selectedPeriodPreset, selectedMonth, selectedYear]);

  const activePeriodItems = getFilteredItemsByPeriod();

  // Period label for export title
  const getPeriodLabel = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (selectedPeriodPreset === 'current-month') return `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;
    if (selectedPeriodPreset === 'last-month') {
      const lm = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      return `${monthNames[lm.getMonth()]} ${lm.getFullYear()}`;
    }
    if (selectedPeriodPreset === 'specific-month') return `${monthNames[selectedMonth]} ${selectedYear}`;
    if (selectedPeriodPreset === 'last-6-months') return 'Last 6 Months';
    if (selectedPeriodPreset === 'year-2025') return 'Full Year 2025';
    if (selectedPeriodPreset === 'year-2026') return 'Full Year 2026';
    return 'All Time';
  };

  // Helper to load exact public/logo.svg image directly for PDF export
  const getPublicLogoDataUrl = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 300;
        canvas.height = img.naturalHeight || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = '/logo.svg';
    });
  };

  // Export PDF Report for Selected Period
  const exportPdf = async () => {
    const periodLabel = getPeriodLabel();
    const targetItems = activePeriodItems.length > 0 ? activePeriodItems : items;

    const doc = new jsPDF();

    // 1. Add logo directly from public/logo.svg
    try {
      const logoDataUrl = await getPublicLogoDataUrl();
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 14, 8, 22, 22);
      } else {
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('E-NAKO FINANCIAL SERVICES', 14, 18);
      }
    } catch (e) {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('E-NAKO FINANCIAL SERVICES', 14, 18);
    }

    // Header Metadata Right-Aligned
    doc.setFontSize(9);
    doc.setTextColor(89, 89, 89);
    doc.text(`Report Period: ${periodLabel}`, 196, 14, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 196, 19, { align: 'right' });
    doc.text(`Terminal ID: ${user.terminalId} (${user.branch || 'Main Hub'})`, 196, 24, { align: 'right' });

    // Decorative Accent Line
    doc.setDrawColor(8, 145, 178);
    doc.setLineWidth(0.8);
    doc.line(14, 32, 196, 32);

    // Section Title
    doc.setFontSize(12);
    doc.setTextColor(0, 31, 91);
    doc.setFont('helvetica', 'bold');
    doc.text(`E-NAKO FX TRANSACTIONS & CASH LEDGER - ${periodLabel.toUpperCase()}`, 14, 39);

    // Build Fixed Field Table Data
    const tableData = targetItems.map((tx) => {
      const dateStr = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A';
      const timeStr = tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

      const rateDisplay = tx.currency === 'XAF'
        ? '1.00 XAF'
        : `${Number(tx.exchangeRate || tx.buyingRate || 1).toLocaleString()} XAF`;

      return [
        `${dateStr}\n${timeStr}`,
        tx.entity || 'Client Entity',
        `${tx.type || 'Receive'}\n(${tx.channel || 'Transfer'})`,
        `${Number(tx.amount || 0).toLocaleString()} ${tx.currency || 'XAF'}`,
        rateDisplay,
        `${Number(tx.amountInXaf || tx.amount || 0).toLocaleString()} XAF`,
        tx.status || 'SETTLED',
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [['Date & Time', 'Entity / Client', 'Type / Channel', 'FX Amount', 'Rate (FCFA)', 'Total XAF', 'Status']],
      body: tableData.length > 0 ? tableData : [['No transactions found for this period', '', '', '', '', '', '']],
      theme: 'grid',
      headStyles: {
        fillColor: [8, 145, 178],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [26, 28, 28],
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 42 },
        2: { cellWidth: 28 },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
        6: { cellWidth: 18, halign: 'center' },
      },
    });

    // Save File
    doc.save(`enako_fx_report_${periodLabel.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    onShowToast(`Exported PDF Report for ${periodLabel}!`, 'success');
  };

  // Export Excel Report for Selected Period
  const exportExcel = () => {
    const periodLabel = getPeriodLabel();
    const targetItems = activePeriodItems.length > 0 ? activePeriodItems : items;

    const wsData = [
      [`ENAKO CASH & FX TRANSACTIONS REPORT - ${periodLabel.toUpperCase()}`],
      [`Period: ${periodLabel}`, `Terminal: ${user.terminalId}`, `Export Date: ${new Date().toLocaleDateString()}`],
      [],
      ['Transaction Date', 'Time', 'Entity / Client', 'Direction', 'Channel', 'Currency', 'FX Amount', 'Exchange Rate (Buying)', 'Exchange Rate (Selling)', 'XAF Equivalent', 'Status', 'Description'],
    ];

    targetItems.forEach((tx) => {
      const d = tx.createdAt ? new Date(tx.createdAt) : new Date();
      wsData.push([
        d.toLocaleDateString(),
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tx.entity || 'N/A',
        tx.type || 'Receive',
        tx.channel || 'Bank Transfer',
        tx.currency || 'XAF',
        Number(tx.amount || 0),
        Number(tx.buyingRate || tx.exchangeRate || 1),
        Number(tx.sellingRate || tx.exchangeRate || 1),
        Number(tx.amountInXaf || tx.amount || 0),
        tx.status || 'SETTLED',
        tx.description || '',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'FX_Transactions');
    XLSX.writeFile(wb, `enako_fx_ledger_${periodLabel.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
    onShowToast(`Exported Excel Ledger for ${periodLabel}!`, 'success');
  };

  // Stats for active period
  const totalVolumeXaf = activePeriodItems.reduce((acc, curr) => acc + Number(curr.amountInXaf || curr.amount || 0), 0);
  const totalCount = activePeriodItems.length;
  const pendingCount = activePeriodItems.filter((i) => i.status === 'PENDING').length;
  const settledCount = activePeriodItems.filter((i) => i.status === 'SETTLED').length;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Bar */}
      <div className="bg-white p-5 border border-[#e5e5e5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#0891b2] uppercase tracking-widest">
            <span>Cash & Exchange Operations</span>
            <span>/</span>
            <span>FX Transactions</span>
          </div>
          <h2 className="text-xl font-bold text-[#1a1c1c] tracking-tight mt-1">
            Global FX & Capital Movement Ledger
          </h2>
          <p className="text-xs text-[#595959] mt-0.5">
            Real-time monitoring of forex transfers, payout disbursements, and channel cash flow.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('update-rates')}
            className="px-4 py-2 bg-white hover:bg-[#f2f2f2] border border-[#d6d6d6] text-[#1a1c1c] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-[#0891b2]" />
            <span>Update Rates</span>
          </button>

          <button
            onClick={() => onNavigate('create-transaction')}
            className="px-4 py-2 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New FX Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#0891b2] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">VOLUME ({getPeriodLabel().toUpperCase()})</p>
            <TrendingUp className="w-4 h-4 text-[#0891b2]" />
          </div>
          <p className="text-2xl font-black text-[#1a1c1c] mt-2">{totalVolumeXaf.toLocaleString()} XAF</p>
          <p className="text-[11px] text-[#595959] mt-1 font-medium">{totalCount} entries in {getPeriodLabel()}</p>
        </div>

        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#16a34a] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">SETTLED TRANSACTIONS</p>
            <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
          </div>
          <p className="text-2xl font-black text-[#1a1c1c] mt-2">{settledCount}</p>
          <p className="text-[11px] text-[#16a34a] mt-1 font-bold">Completed in period</p>
        </div>

        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#ca8a04] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">PENDING SETTLEMENT</p>
            <Clock className="w-4 h-4 text-[#ca8a04]" />
          </div>
          <p className="text-2xl font-black text-[#1a1c1c] mt-2">{pendingCount}</p>
          <p className="text-[11px] text-[#ca8a04] mt-1 font-bold">Awaiting confirmation</p>
        </div>

        <div className="bg-white p-5 border border-[#e5e5e5] border-l-4 border-l-[#2563eb] shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#595959]">OPERATIONAL TERMINAL</p>
            <DollarSign className="w-4 h-4 text-[#2563eb]" />
          </div>
          <p className="text-xl font-bold text-[#1a1c1c] mt-2 truncate">{user.branch || 'Douala Main Hub'}</p>
          <p className="text-[11px] text-[#2563eb] mt-1 font-bold uppercase">{user.terminalId}</p>
        </div>
      </div>

      {/* Date Range & Period Export Bar (INLINE - NO POPUP) */}
      <div className="bg-white p-4 border border-[#e5e5e5] shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0891b2]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a1c1c]">
              Report Export & Period Filter
            </h3>
          </div>
          <span className="text-[11px] font-bold text-[#0891b2] uppercase tracking-wider bg-[#ecfeff] px-2.5 py-0.5 border border-[#a5f3fc]">
            Active Period: {getPeriodLabel()}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
          {/* Period Selector Options */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedPeriodPreset('current-month')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${selectedPeriodPreset === 'current-month'
                  ? 'bg-[#0891b2] text-white border-[#0891b2]'
                  : 'bg-[#f9f9f9] text-[#595959] border-[#d6d6d6] hover:bg-[#e5e5e5]'
                }`}
            >
              Current Month ({monthNames[new Date().getMonth()]})
            </button>

            <button
              onClick={() => setSelectedPeriodPreset('last-month')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${selectedPeriodPreset === 'last-month'
                  ? 'bg-[#0891b2] text-white border-[#0891b2]'
                  : 'bg-[#f9f9f9] text-[#595959] border-[#d6d6d6] hover:bg-[#e5e5e5]'
                }`}
            >
              Last Month
            </button>

            <button
              onClick={() => setSelectedPeriodPreset('last-6-months')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${selectedPeriodPreset === 'last-6-months'
                  ? 'bg-[#0891b2] text-white border-[#0891b2]'
                  : 'bg-[#f9f9f9] text-[#595959] border-[#d6d6d6] hover:bg-[#e5e5e5]'
                }`}
            >
              Last 6 Months
            </button>

            <button
              onClick={() => setSelectedPeriodPreset('year-2026')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${selectedPeriodPreset === 'year-2026'
                  ? 'bg-[#0891b2] text-white border-[#0891b2]'
                  : 'bg-[#f9f9f9] text-[#595959] border-[#d6d6d6] hover:bg-[#e5e5e5]'
                }`}
            >
              Year 2026
            </button>

            <button
              onClick={() => setSelectedPeriodPreset('year-2025')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${selectedPeriodPreset === 'year-2025'
                  ? 'bg-[#0891b2] text-white border-[#0891b2]'
                  : 'bg-[#f9f9f9] text-[#595959] border-[#d6d6d6] hover:bg-[#e5e5e5]'
                }`}
            >
              Year 2025
            </button>

            {/* Custom Month Picker */}
            <div className="flex items-center gap-1">
              <select
                value={selectedPeriodPreset === 'specific-month' ? selectedMonth : ''}
                onChange={(e) => {
                  setSelectedPeriodPreset('specific-month');
                  setSelectedMonth(Number(e.target.value));
                }}
                className="bg-[#f9f9f9] border border-[#d6d6d6] px-2.5 py-1.5 text-xs font-bold text-[#1a1c1c] outline-none"
              >
                <option value="" disabled>Select Month...</option>
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedPeriodPreset('specific-month');
                  setSelectedYear(Number(e.target.value));
                }}
                className="bg-[#f9f9f9] border border-[#d6d6d6] px-2.5 py-1.5 text-xs font-bold text-[#1a1c1c] outline-none"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportPdf}
              className="px-4 py-1.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Download PDF ({getPeriodLabel()})</span>
            </button>
            <button
              onClick={exportExcel}
              className="px-4 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel ({getPeriodLabel()})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#e5e5e5] shadow-xs overflow-hidden">
        {/* Table Filter Controls */}
        <div className="p-4 bg-[#f9f9f9] border-b border-[#e5e5e5] flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#595959]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by entity, reference or note..."
              className="w-full bg-white border border-[#d6d6d6] pl-9 pr-3 py-2 text-xs text-[#1a1c1c] font-medium outline-none focus:border-[#0891b2]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-[#d6d6d6] px-3 py-2 text-xs font-bold text-[#1a1c1c] outline-none focus:border-[#0891b2]"
            >
              <option value="All Types">All Types</option>
              <option value="Receive">Receive (Inflow)</option>
              <option value="Send">Send (Outflow)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-[#d6d6d6] px-3 py-2 text-xs font-bold text-[#1a1c1c] outline-none focus:border-[#0891b2]"
            >
              <option value="All Status">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="SETTLED">Settled</option>
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-white border border-[#d6d6d6] px-3 py-2 text-xs font-bold text-[#1a1c1c] outline-none focus:border-[#0891b2]"
            >
              <option value="All Channels">All Channels</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="MTN MoMo">MTN MoMo</option>
              <option value="Orange Money">Orange Money</option>
              <option value="Crypto USDT">Crypto USDT</option>
            </select>

            <button
              onClick={loadTransactions}
              disabled={loading}
              className="p-2 bg-white border border-[#d6d6d6] text-[#595959] hover:text-[#1a1c1c] hover:bg-[#f2f2f2] transition-colors cursor-pointer"
              title="Refresh Table"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0891b2]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2f3131] text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Entity / Beneficiary</th>
                <th className="p-3.5">Type & Channel</th>
                <th className="p-3.5">Foreign Amount</th>
                <th className="p-3.5">XAF Equivalent</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5] text-xs font-medium text-[#1a1c1c]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#595959] font-bold uppercase tracking-wider">
                    Loading FX ledger entries...
                  </td>
                </tr>
              ) : activePeriodItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#595959] font-bold">
                    <p className="mb-2">No transactions found for period: <span className="text-[#0891b2] font-black">{getPeriodLabel()}</span>.</p>
                    {items.length > 0 && (
                      <button
                        onClick={() => setSelectedPeriodPreset('all-time')}
                        className="px-4 py-1.5 bg-[#0891b2] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#0e7490] cursor-pointer"
                      >
                        View All Time ({items.length} Total Database Transactions)
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                activePeriodItems.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#f9f9f9] transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-[#595959]">
                      {new Date(tx.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 font-bold">
                      <p className="text-[#1a1c1c]">{tx.entity || 'Direct Client'}</p>
                      {tx.description && <p className="text-[10px] font-normal text-[#595959] truncate max-w-xs">{tx.description}</p>}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        {tx.type === 'Receive' ? (
                          <span className="p-1 bg-[#dcfce7] text-[#166534] rounded-xs"><ArrowDownLeft className="w-3.5 h-3.5" /></span>
                        ) : (
                          <span className="p-1 bg-[#fee2e2] text-[#991b1b] rounded-xs"><ArrowUpRight className="w-3.5 h-3.5" /></span>
                        )}
                        <span className="font-bold">{tx.type}</span>
                        <span className="text-[#595959]">· {tx.channel}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-[#0891b2]">
                      {Number(tx.amount || 0).toLocaleString()} {tx.currency || 'USD'}
                    </td>
                    <td className="p-3.5 font-black text-[#1a1c1c]">
                      {Number(tx.amountInXaf || tx.amount || 0).toLocaleString()} XAF
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border ${tx.status === 'SETTLED'
                          ? 'bg-[#dcfce7] text-[#166534] border-[#86efac]'
                          : 'bg-[#fef9c3] text-[#854d0e] border-[#fef08a]'
                        }`}>
                        {tx.status || 'SETTLED'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedTxForDetail(tx)}
                        className="px-2.5 py-1 bg-[#2f3131] hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                        title="View Full Details"
                      >
                        <Eye className="w-3 h-3 text-[#a5f3fc]" />
                        <span>Inspect</span>
                      </button>

                      {tx.status === 'PENDING' ? (
                        <button
                          onClick={() => handleSettle(tx.id)}
                          className="px-3 py-1 bg-[#16a34a] hover:bg-[#15803d] text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Settle
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-[#595959] uppercase">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Inspection Modal */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white border border-[#e5e5e5] w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#e5e5e5] bg-[#2f3131] text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a5f3fc]">FX Deal Audit Inspection</span>
                <h3 className="text-lg font-bold">Ref: {selectedTxForDetail.id}</h3>
              </div>
              <button 
                onClick={() => setSelectedTxForDetail(null)} 
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Status & Amount Block */}
              <div className="p-4 bg-[#f9f9f9] border border-[#e5e5e5] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-[#595959] uppercase">Settlement Status</p>
                  <span className={`inline-block mt-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${
                    selectedTxForDetail.status === 'SETTLED'
                      ? 'bg-[#dcfce7] text-[#166534] border-[#86efac]'
                      : 'bg-[#fef9c3] text-[#854d0e] border-[#fef08a]'
                  }`}>
                    {selectedTxForDetail.status || 'SETTLED'}
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#595959] uppercase">Total XAF Amount</p>
                  <p className="font-mono text-xl font-black text-[#1a1c1c] mt-0.5">
                    {Number(selectedTxForDetail.amountInXaf || selectedTxForDetail.amount || 0).toLocaleString()} XAF
                  </p>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#f9f9f9] border border-[#e5e5e5]">
                  <p className="text-[9px] font-bold text-[#595959] uppercase">Client / Beneficiary Entity</p>
                  <p className="font-bold text-[#1a1c1c] mt-0.5">{selectedTxForDetail.entity || 'Direct Client'}</p>
                </div>

                <div className="p-3 bg-[#f9f9f9] border border-[#e5e5e5]">
                  <p className="text-[9px] font-bold text-[#595959] uppercase">Type & Settlement Channel</p>
                  <p className="font-bold text-[#0891b2] mt-0.5">{selectedTxForDetail.type} · {selectedTxForDetail.channel}</p>
                </div>

                <div className="p-3 bg-[#f9f9f9] border border-[#e5e5e5]">
                  <p className="text-[9px] font-bold text-[#595959] uppercase">Foreign Currency & Amount</p>
                  <p className="font-mono font-bold text-[#1a1c1c] mt-0.5">
                    {Number(selectedTxForDetail.amount || 0).toLocaleString()} {selectedTxForDetail.currency || 'USD'}
                  </p>
                </div>

                <div className="p-3 bg-[#f9f9f9] border border-[#e5e5e5]">
                  <p className="text-[9px] font-bold text-[#595959] uppercase">Applied Exchange Rate</p>
                  <p className="font-mono font-bold text-[#1a1c1c] mt-0.5">
                    {selectedTxForDetail.exchangeRate || selectedTxForDetail.buyingRate || 1} XAF / {selectedTxForDetail.currency || 'USD'}
                  </p>
                </div>
              </div>

              {/* Executing Cash Collector Details */}
              <div className="p-4 bg-[#ecfeff] border border-[#a5f3fc] space-y-1">
                <p className="text-[10px] font-black text-[#0891b2] uppercase tracking-wider">
                  Assigned / Executing Field Cash Collector
                </p>
                <div className="flex justify-between items-center pt-1 text-xs">
                  <div>
                    <p className="font-bold text-[#1a1c1c]">{selectedTxForDetail.assignedCollectorName || user.name || 'Field Cash Collector'}</p>
                    <p className="text-[10px] text-[#595959]">Terminal ID: <span className="font-mono font-bold text-[#1a1c1c]">{selectedTxForDetail.assignedCollectorId || user.terminalId || 'TRM-MAIN'}</span></p>
                  </div>
                  <span className="px-2 py-0.5 bg-white border border-[#0891b2]/30 text-[#0891b2] text-[10px] font-bold uppercase">
                    {user.branch || 'Douala Main Hub'}
                  </span>
                </div>
              </div>

              {/* Timestamp & Notes */}
              <div className="p-3 bg-[#f9f9f9] border border-[#e5e5e5] space-y-1 text-xs">
                <p className="text-[9px] font-bold text-[#595959] uppercase">Date & Timestamp</p>
                <p className="font-mono text-[#1a1c1c]">{new Date(selectedTxForDetail.createdAt || Date.now()).toLocaleString()}</p>
              </div>

              {selectedTxForDetail.description && (
                <div className="p-3 bg-[#f9f9f9] border border-[#e5e5e5] space-y-1 text-xs">
                  <p className="text-[9px] font-bold text-[#595959] uppercase">Audit Notes / Description</p>
                  <p className="text-[#1a1c1c] font-medium">{selectedTxForDetail.description}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#e5e5e5] bg-[#f9f9f9] flex justify-end gap-3">
              {selectedTxForDetail.status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => {
                    handleSettle(selectedTxForDetail.id);
                    setSelectedTxForDetail(null);
                  }}
                  className="px-5 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer"
                >
                  Mark Settled
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTxForDetail(null)}
                className="px-5 py-2 border border-[#d6d6d6] text-xs font-bold uppercase tracking-wider text-[#595959] hover:bg-[#e5e5e5] cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
