import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Calendar,
  ChevronDown,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  DollarSign,
  Clock,
  MapPin,
  Check,
} from 'lucide-react';
import { Collection, CollectorUser, Client } from '../types';
import { formatXAF, INITIAL_CLIENTS } from '../data/mockData';
import {
  ReportPeriod,
  filterCollectionsByPeriod,
  calculateReportMetrics,
  downloadReportPDF,
  downloadReportExcel,
  downloadReportWord,
} from '../utils/exportUtils';

interface GenerateReportModalProps {
  collections: Collection[];
  drafts: Collection[];
  user: CollectorUser;
  clients?: Client[];
  onClose: () => void;
}

export const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  collections,
  drafts,
  user,
  clients = INITIAL_CLIENTS,
  onClose,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('daily');
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Filter collections and calculate metrics based on chosen timeframe
  const { filtered, periodLabel, start, end } = useMemo(() => {
    return filterCollectionsByPeriod(collections, selectedPeriod);
  }, [collections, selectedPeriod]);

  const metrics = useMemo(() => {
    return calculateReportMetrics(filtered, drafts, clients, periodLabel, start, end);
  }, [filtered, drafts, clients, periodLabel, start, end]);

  const handleDownloadPDF = () => {
    downloadReportPDF(filtered, metrics, user);
    setDownloadSuccessNotice(`Downloaded ${selectedPeriod.toUpperCase()} Report as PDF`);
    setShowExportMenu(false);
    setTimeout(() => setDownloadSuccessNotice(null), 4000);
  };

  const handleDownloadExcel = () => {
    downloadReportExcel(filtered, metrics, user);
    setDownloadSuccessNotice(`Downloaded ${selectedPeriod.toUpperCase()} Report as Excel (.xlsx)`);
    setShowExportMenu(false);
    setTimeout(() => setDownloadSuccessNotice(null), 4000);
  };

  const handleDownloadWord = () => {
    downloadReportWord(filtered, metrics, user);
    setDownloadSuccessNotice(`Downloaded ${selectedPeriod.toUpperCase()} Report as Word (.doc)`);
    setShowExportMenu(false);
    setTimeout(() => setDownloadSuccessNotice(null), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#e5e5e5] w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#2f3131] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#22d3ee]" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block">
                E-NAKO Executive Collection & Reconciliation Report
              </span>
              <span className="text-[10px] text-[#c8c6c5] font-mono">
                Terminal {user.terminalId} • {user.name} ({user.branch})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#c8c6c5] hover:text-white p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {downloadSuccessNotice && (
          <div className="bg-[#ecfeff] border-b border-[#a5f3fc] px-4 py-2 text-xs font-bold text-[#0e7490] flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#0891b2]" />
              <span>{downloadSuccessNotice}</span>
            </div>
            <button
              onClick={() => setDownloadSuccessNotice(null)}
              className="text-[#0891b2] hover:underline uppercase text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Period Selector Tabs */}
        <div className="bg-[#f3f3f3] border-b border-[#e5e5e5] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold uppercase text-[#5f5e5e] mr-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0891b2]" />
              <span>Report Timeframe:</span>
            </span>

            <div className="inline-flex border border-[#e5e5e5] bg-[#ffffff] p-0.5 shadow-2xs font-mono text-xs">
              <button
                type="button"
                onClick={() => setSelectedPeriod('daily')}
                className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                  selectedPeriod === 'daily'
                    ? 'bg-[#0891b2] text-white shadow-xs'
                    : 'text-[#5f5e5e] hover:text-[#1a1c1c] hover:bg-[#f9f9f9]'
                }`}
              >
                Daily Report
              </button>

              <button
                type="button"
                onClick={() => setSelectedPeriod('weekly')}
                className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                  selectedPeriod === 'weekly'
                    ? 'bg-[#0891b2] text-white shadow-xs'
                    : 'text-[#5f5e5e] hover:text-[#1a1c1c] hover:bg-[#f9f9f9]'
                }`}
              >
                Weekly Report
              </button>

              <button
                type="button"
                onClick={() => setSelectedPeriod('monthly')}
                className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                  selectedPeriod === 'monthly'
                    ? 'bg-[#0891b2] text-white shadow-xs'
                    : 'text-[#5f5e5e] hover:text-[#1a1c1c] hover:bg-[#f9f9f9]'
                }`}
              >
                Monthly Report
              </button>

              <button
                type="button"
                onClick={() => setSelectedPeriod('all')}
                className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                  selectedPeriod === 'all'
                    ? 'bg-[#0891b2] text-white shadow-xs'
                    : 'text-[#5f5e5e] hover:text-[#1a1c1c] hover:bg-[#f9f9f9]'
                }`}
              >
                All History
              </button>
            </div>
          </div>

          <div className="text-xs font-mono text-[#5f5e5e]">
            Showing <strong className="text-[#0891b2]">{filtered.length}</strong> transactions
          </div>
        </div>

        {/* Report Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 bg-[#ffffff]">
          {/* Institutional Heading */}
          <div className="border-b-2 border-[#0891b2] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#0891b2] uppercase tracking-tight font-sans">
                E-NAKO
              </h2>
              <p className="text-xs font-bold text-[#1a1c1c] uppercase mt-0.5">
                Cash Management & Agency Collection Division
              </p>
              <p className="text-xs text-[#5f5e5e] mt-1 font-mono">
                {metrics.periodLabel}
              </p>
            </div>

            <div className="text-left md:text-right font-mono text-xs text-[#5f5e5e] space-y-0.5">
              <div>Period: <strong className="text-[#1a1c1c]">{metrics.startDateStr} — {metrics.endDateStr}</strong></div>
              <div>Terminal: <strong className="text-[#1a1c1c]">{user.terminalId}</strong></div>
              <div>Collector: <strong className="text-[#1a1c1c]">{user.name} ({user.id})</strong></div>
            </div>
          </div>

          {/* Boss-Friendly Executive Briefing Box */}
          <div className="p-4 bg-[#ecfeff] border-l-4 border-[#0891b2] border border-[#a5f3fc] shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#0891b2]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0e7490]">
                Management Executive Summary & Calculations for Leadership
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-[#1a1c1c] font-sans font-medium">
              {metrics.bossExecutiveSummary}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="p-4 bg-[#f9f9f9] border border-[#e5e5e5] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f5e5e]">
                  Total Cash Settled
                </span>
                <DollarSign className="w-3.5 h-3.5 text-[#0891b2]" />
              </div>
              <div className="font-mono text-xl md:text-2xl font-black text-[#0891b2] tabular-nums">
                {formatXAF(metrics.totalCollected)} <span className="text-xs font-sans font-normal text-[#5f5e5e]">XAF</span>
              </div>
              <div className="text-[10px] text-[#5f5e5e] font-mono">
                {metrics.completedCount} successful settlements
              </div>
            </div>

            <div className="p-4 bg-[#f9f9f9] border border-[#e5e5e5] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f5e5e]">
                  Success Rate
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-[#0891b2]" />
              </div>
              <div className="font-mono text-xl md:text-2xl font-black text-[#1a1c1c] tabular-nums">
                {metrics.successRate.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[#5f5e5e] font-mono">
                {metrics.completedCount} of {metrics.totalAttempted} attempts
              </div>
            </div>

            <div className="p-4 bg-[#f9f9f9] border border-[#e5e5e5] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f5e5e]">
                  Avg Ticket Size
                </span>
                <Layers className="w-3.5 h-3.5 text-[#0891b2]" />
              </div>
              <div className="font-mono text-xl md:text-2xl font-black text-[#1a1c1c] tabular-nums">
                {formatXAF(Math.round(metrics.avgTicketSize))} <span className="text-xs font-sans font-normal text-[#5f5e5e]">XAF</span>
              </div>
              <div className="text-[10px] text-[#5f5e5e] font-mono">
                Per successful client visit
              </div>
            </div>

            <div className="p-4 bg-[#f9f9f9] border border-[#e5e5e5] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f5e5e]">
                  Top Single Client
                </span>
                <Award className="w-3.5 h-3.5 text-[#0891b2]" />
              </div>
              <div className="font-sans text-sm font-bold text-[#1a1c1c] truncate">
                {metrics.topClient ? metrics.topClient.name : 'None'}
              </div>
              <div className="font-mono text-xs font-bold text-[#0891b2]">
                {metrics.topClient ? `${formatXAF(metrics.topClient.amount)} XAF` : '-'}
              </div>
            </div>
          </div>

          {/* Regional Sector Distribution */}
          {metrics.sectorBreakdown.length > 0 && (
            <div className="p-4 bg-[#ffffff] border border-[#e5e5e5] space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a1c1c] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0891b2]" />
                  <span>Regional & Sector Cash Breakdown</span>
                </h4>
                <span className="text-[11px] font-mono text-[#5f5e5e]">
                  Sorted by Volume
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {metrics.sectorBreakdown.map((sec) => (
                  <div key={sec.sector} className="p-3 bg-[#f9f9f9] border border-[#e5e5e5] text-xs">
                    <div className="flex justify-between text-[#5f5e5e] font-bold text-[11px] mb-1">
                      <span>{sec.sector}</span>
                      <span className="text-[#0891b2] font-mono">{sec.percentage}%</span>
                    </div>
                    <div className="font-mono font-bold text-sm text-[#1a1c1c] mb-1">
                      {formatXAF(sec.amount)} XAF
                    </div>
                    <div className="w-full bg-[#e5e5e5] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0891b2] h-full"
                        style={{ width: `${sec.percentage}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-[#5f5e5e] mt-1.5 font-mono">
                      {sec.count} visit{sec.count > 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itemized Breakdown Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a1c1c]">
                Itemized Collections Log ({filtered.length} Records)
              </h4>
              <span className="text-xs font-mono text-[#5f5e5e]">
                {metrics.periodLabel}
              </span>
            </div>

            <div className="border border-[#e5e5e5] overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-[#f3f3f3] border-b border-[#e5e5e5] text-[#5f5e5e] uppercase">
                    <th className="p-2.5">Ref</th>
                    <th className="p-2.5">Client ID</th>
                    <th className="p-2.5">Client Name</th>
                    <th className="p-2.5">Amount (XAF)</th>
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#5f5e5e] font-sans">
                        No transactions recorded for this selected timeframe.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((col) => (
                      <tr key={col.id} className="hover:bg-[#f9f9f9]">
                        <td className="p-2.5 font-bold text-[#0891b2]">{col.id}</td>
                        <td className="p-2.5 text-[#5f5e5e]">{col.clientId}</td>
                        <td className="p-2.5 font-sans font-medium text-[#1a1c1c]">{col.clientName}</td>
                        <td className="p-2.5 font-bold text-[#1a1c1c]">{formatXAF(col.amount)}</td>
                        <td className="p-2.5 text-[#5f5e5e]">
                          {new Date(col.timestamp || Date.now()).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-2.5 text-right uppercase">
                          {col.status === 'COMPLETE' ? (
                            <span className="text-[#0e7490] bg-[#ecfeff] border border-[#a5f3fc] px-2 py-0.5 font-bold text-[10px]">
                              SETTLED
                            </span>
                          ) : col.status === 'CANCELLED' ? (
                            <span className="text-[#5f5e5e] bg-[#f3f3f3] border border-[#e5e5e5] px-2 py-0.5 font-bold text-[10px]">
                              CANCELLED
                            </span>
                          ) : (
                            <span className="text-[#4a4a4a] bg-[#eeeeee] border border-[#e5e5e5] px-2 py-0.5 text-[10px]">
                              DRAFT
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dual Signatures Clearance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-[#e5e5e5]">
            <div className="p-3 bg-[#f9f9f9] border border-[#e5e5e5]">
              <p className="text-xs font-bold uppercase text-[#5f5e5e] mb-8">
                Field Collector Certification
              </p>
              <div className="border-b border-[#1a1c1c] pb-1 font-mono text-xs font-bold text-[#1a1c1c]">
                {user.name} ({user.id})
              </div>
              <p className="text-[10px] text-[#5f5e5e] mt-1">
                Certified physically gathered cash in accordance with bank policy.
              </p>
            </div>

            <div className="p-3 bg-[#f9f9f9] border border-[#e5e5e5]">
              <p className="text-xs font-bold uppercase text-[#5f5e5e] mb-8">
                Vault Clearance & Supervisory Sign-off
              </p>
              <div className="border-b border-[#1a1c1c] pb-1 font-mono text-xs text-[#5f5e5e]">
                Authorized Cashier / Agency Manager
              </div>
              <p className="text-[10px] text-[#5f5e5e] mt-1">
                Vault deposit verified and sealed into central branch balance.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#f3f3f3] border-t border-[#e5e5e5] flex flex-wrap gap-2.5 justify-between items-center shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-[#e5e5e5] bg-[#ffffff] text-xs font-bold uppercase tracking-wider text-[#1a1c1c] hover:bg-[#e8e8e8] transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Download Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2.5 bg-[#ffffff] border border-[#0891b2] text-[#0891b2] hover:bg-[#ecfeff] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-2xs"
              >
                <Download className="w-4 h-4 text-[#0891b2]" />
                <span>Download Report</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 bottom-full mb-1.5 w-56 bg-[#ffffff] border border-[#e5e5e5] shadow-2xl z-50 py-1 font-mono text-xs">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-[#ecfeff] flex items-center gap-2.5 text-[#1a1c1c] border-b border-[#f3f3f3]"
                  >
                    <FileText className="w-4 h-4 text-[#0891b2]" />
                    <div>
                      <div className="font-bold">PDF Document (.pdf)</div>
                      <div className="text-[10px] text-[#5f5e5e] font-sans">Formal letterhead & tables</div>
                    </div>
                  </button>

                  <button
                    onClick={handleDownloadExcel}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-[#ecfeff] flex items-center gap-2.5 text-[#1a1c1c] border-b border-[#f3f3f3]"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#0891b2]" />
                    <div>
                      <div className="font-bold">Excel Workbook (.xlsx)</div>
                      <div className="text-[10px] text-[#5f5e5e] font-sans">KPI sheets & full data logs</div>
                    </div>
                  </button>

                  <button
                    onClick={handleDownloadWord}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-[#ecfeff] flex items-center gap-2.5 text-[#1a1c1c]"
                  >
                    <FileText className="w-4 h-4 text-[#0891b2]" />
                    <div>
                      <div className="font-bold">Word Document (.doc)</div>
                      <div className="text-[10px] text-[#5f5e5e] font-sans">Editable executive report</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
