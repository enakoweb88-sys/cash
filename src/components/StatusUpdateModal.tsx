import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, FileText, DollarSign, RotateCw } from 'lucide-react';
import { Collection, TransactionStatus } from '../types';
import { formatXAF, formatCommaNumber, cleanCommas } from '../data/mockData';

interface StatusUpdateModalProps {
  collection: Collection | null;
  onClose: () => void;
  onSaveStatus: (
    collectionId: string, 
    newStatus: TransactionStatus, 
    shortage: number, 
    extra: number, 
    summaryNote: string
  ) => void;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  collection,
  onClose,
  onSaveStatus,
}) => {
  if (!collection) return null;

  const [status, setStatus] = useState<TransactionStatus>(collection.status || 'COMPLETE');
  const [shortageAmount, setShortageAmount] = useState<string>(
    collection.shortageAmount !== undefined ? String(collection.shortageAmount) : '0'
  );
  const [extraAmount, setExtraAmount] = useState<string>(
    collection.extraAmount !== undefined ? String(collection.extraAmount) : '0'
  );
  const [summaryNote, setSummaryNote] = useState<string>(
    collection.summaryNote || collection.notes || ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const shortageNum = Math.max(0, Number(cleanCommas(shortageAmount)) || 0);
      const extraNum = Math.max(0, Number(cleanCommas(extraAmount)) || 0);

      onSaveStatus(
      onSaveStatus(
        collection.id,
        status,
        shortageNum,
        extraNum,
        summaryNote.trim()
      );
      setIsSubmitting(false);
      onClose();
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#e5e5e5] w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-[#2f3131] text-white flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold tracking-tight">
              Update Transaction Status #{collection.id}
            </h3>
            <p className="text-xs text-[#c8c6c5] mt-0.5 font-mono">
              Client: {collection.clientName} • {formatXAF(collection.amount)} FCFA
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#c8c6c5] hover:text-white p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-[#ffffff]">
          {/* Status Field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a1c1c] mb-1.5">
              Transaction Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TransactionStatus)}
              className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm font-bold outline-none cursor-pointer uppercase"
            >
              <option value="COMPLETE">COMPLETE (SETTLED)</option>
              <option value="PENDING">PENDING (IN PROGRESS)</option>
              <option value="CANCELLED">CANCELLED (ABORTED)</option>
            </select>
          </div>

          {/* Shortage & Extra Amounts */}
          <div className="grid grid-cols-2 gap-4 pt-1 border-t border-[#e5e5e5]">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ba1a1a] mb-1.5">
                Money Shortage (FCFA)
              </label>
              <input
                type="text"
                value={formatCommaNumber(shortageAmount)}
                onChange={(e) => setShortageAmount(cleanCommas(e.target.value))}
                placeholder="0"
                className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#ba1a1a] focus:ring-1 focus:ring-[#ba1a1a] text-sm font-mono font-bold"
              />
              <p className="text-[10px] text-[#5f5e5e] mt-1">Deficit in cash taken</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0891b2] mb-1.5">
                Money Extra (FCFA)
              </label>
              <input
                type="text"
                value={formatCommaNumber(extraAmount)}
                onChange={(e) => setExtraAmount(cleanCommas(e.target.value))}
                placeholder="0"
                className="w-full h-11 px-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm font-mono font-bold"
              />
              <p className="text-[10px] text-[#5f5e5e] mt-1">Excess cash surplus</p>
            </div>
          </div>

          {/* Summary Note */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a1c1c] mb-1.5">
              Settlement Summary Note *
            </label>
            <textarea
              rows={3}
              required
              value={summaryNote}
              onChange={(e) => setSummaryNote(e.target.value)}
              placeholder="Provide a brief summary of the settlement status, shortages, or discrepancies..."
              className="w-full p-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#e5e5e5] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-[#e5e5e5] text-xs font-bold uppercase tracking-wider text-[#1a1c1c] hover:bg-[#f3f3f3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Status...</span>
                </>
              ) : (
                <span>Save Status Update</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
