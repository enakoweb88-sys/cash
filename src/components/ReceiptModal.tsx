import React, { useState } from 'react';
import { X, Printer, CheckCircle, AlertTriangle, ShieldCheck, Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Collection, CollectorUser } from '../types';
import { formatXAF } from '../data/mockData';
import { downloadReceiptPDF, downloadReceiptExcel, downloadReceiptWord } from '../utils/exportUtils';

interface ReceiptModalProps {
  collection: Collection | null;
  user: CollectorUser;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  collection,
  user,
  onClose,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  if (!collection) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    downloadReceiptPDF(collection, user);
    setDownloadNotice('PDF Receipt Slip downloaded successfully!');
    setShowExportMenu(false);
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  const handleExportExcel = () => {
    downloadReceiptExcel(collection, user);
    setDownloadNotice('Excel (.xlsx) Receipt Slip downloaded successfully!');
    setShowExportMenu(false);
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  const handleExportWord = () => {
    downloadReceiptWord(collection, user);
    setDownloadNotice('Word (.doc) Receipt Slip downloaded successfully!');
    setShowExportMenu(false);
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#e5e5e5] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 bg-[#2f3131] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#22d3ee]" />
            <span className="text-xs font-bold uppercase tracking-wider">
              E-NAKO Transaction Slip #{collection.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#c8c6c5] hover:text-white p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {downloadNotice && (
          <div className="bg-[#ecfeff] border-b border-[#a5f3fc] px-4 py-2 text-xs font-bold text-[#0e7490] flex items-center justify-between">
            <span>{downloadNotice}</span>
            <button onClick={() => setDownloadNotice(null)} className="text-[#0891b2] hover:underline">Dismiss</button>
          </div>
        )}

        {/* Slip Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-[#ffffff]">
          {/* Header */}
          <div className="text-center border-b border-[#e5e5e5] pb-4">
            <h2 className="text-xl font-bold uppercase text-[#0891b2] tracking-tight">
              E-NAKO
            </h2>
            <p className="text-xs font-semibold text-[#1a1c1c] uppercase mt-0.5">
              Cash Collection Field Terminal Receipt
            </p>
            <p className="font-mono text-[11px] text-[#5f5e5e] mt-1">
              Terminal: {user.terminalId} • Branch: {user.branch}
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            {collection.status === 'COMPLETE' ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#ecfeff] text-[#0e7490] text-xs font-bold tracking-widest border border-[#a5f3fc] uppercase">
                <CheckCircle className="w-4 h-4 text-[#0891b2]" />
                <span>OFFICIALLY COLLECTED & SETTLED</span>
              </span>
            ) : collection.status === 'CANCELLED' ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#eeeeee] text-[#5f5e5e] text-xs font-bold tracking-widest border border-[#e5e5e5] uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>VISIT ATTEMPT CANCELLED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#eeeeee] text-[#5f5e5e] text-xs font-bold tracking-widest border border-[#e5e5e5] uppercase">
                <span>OFFLINE LOCAL DRAFT (PENDING SYNC)</span>
              </span>
            )}
          </div>

          {/* Core Details Grid */}
          <div className="bg-[#f9f9f9] border border-[#e5e5e5] p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-[#e5e5e5] pb-2">
              <span className="text-[#5f5e5e] uppercase">Transaction Ref</span>
              <span className="font-bold text-[#1a1c1c]">{collection.id}</span>
            </div>

            <div className="flex justify-between border-b border-[#e5e5e5] pb-2">
              <span className="text-[#5f5e5e] uppercase">Client ID</span>
              <span className="font-bold text-[#0891b2]">{collection.clientId}</span>
            </div>

            <div className="flex justify-between border-b border-[#e5e5e5] pb-2">
              <span className="text-[#5f5e5e] uppercase">Client Name</span>
              <span className="font-bold text-[#1a1c1c] font-sans">{collection.clientName}</span>
            </div>

            <div className="flex justify-between border-b border-[#e5e5e5] pb-2">
              <span className="text-[#5f5e5e] uppercase">Collector Officer</span>
              <span className="font-bold text-[#1a1c1c] font-sans">{user.name} ({user.id})</span>
            </div>

            <div className="flex justify-between border-b border-[#e5e5e5] pb-2">
              <span className="text-[#5f5e5e] uppercase">Timestamp</span>
              <span className="font-bold text-[#1a1c1c]">{new Date(collection.timestamp).toLocaleString()}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#5f5e5e] uppercase">GPS / Location</span>
              <span className="font-bold text-[#1a1c1c] max-w-[200px] text-right truncate">
                {collection.location || 'Field Point'}
              </span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="bg-[#eeeeee] p-4 border border-[#e5e5e5] text-center">
            <div className="text-xs uppercase font-bold text-[#4a4a4a] mb-1">
              Collected Amount
            </div>
            <div className="font-mono text-3xl font-black text-[#0891b2] tabular-nums">
              {formatXAF(collection.amount)} <span className="text-base text-[#5f5e5e] font-sans font-normal">XAF</span>
            </div>
          </div>

          {collection.notes && (
            <div className="p-3 bg-[#ffffff] border border-[#e5e5e5] text-xs">
              <span className="font-bold uppercase text-[#5f5e5e] block mb-1">Field Notes:</span>
              <p className="text-[#1a1c1c]">{collection.notes}</p>
            </div>
          )}

          {/* Security barcode / stamp */}
          <div className="pt-2 text-center border-t border-dashed border-[#e5e5e5] space-y-2">
            <div className="font-mono tracking-widest text-xs font-bold text-[#4a4a4a]">
              ||||||| | ||||| |||| |||||| |||| | |||||||| |||||
            </div>
            <p className="text-[10px] text-[#5f5e5e] uppercase">
              Encrypted SHA-256 Signature verified by CollectorOS v2.4.1
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-[#f3f3f3] border-t border-[#e5e5e5] flex flex-wrap gap-2.5 items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#e5e5e5] bg-[#ffffff] text-xs font-bold uppercase tracking-wider text-[#1a1c1c] hover:bg-[#e8e8e8]"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {/* Download Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3.5 py-2 bg-[#ffffff] border border-[#0891b2] text-[#0891b2] hover:bg-[#ecfeff] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-4 h-4" />
                <span>Download Slip</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 bottom-full mb-1 w-48 bg-[#ffffff] border border-[#e5e5e5] shadow-xl z-50 py-1 font-mono text-xs">
                  <button
                    onClick={handleExportPDF}
                    className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c]"
                  >
                    <FileText className="w-4 h-4 text-[#0891b2]" />
                    <span>Download PDF (.pdf)</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c]"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#0891b2]" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={handleExportWord}
                    className="w-full px-3 py-2 text-left hover:bg-[#ecfeff] flex items-center gap-2 text-[#1a1c1c]"
                  >
                    <FileText className="w-4 h-4 text-[#0891b2]" />
                    <span>Download Word (.doc)</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
