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
    summaryNote: string,
    actualAmountCollected?: number,
    targetAmount?: number
  ) => void;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  collection,
  onClose,
  onSaveStatus,
}) => {
  if (!collection) return null;

  const initialTarget = collection.targetAmount || collection.amount || 0;
  const initialActual = collection.actualAmountCollected !== undefined 
    ? collection.actualAmountCollected 
    : (collection.status === 'COMPLETE' ? collection.amount : Math.max(0, initialTarget - (collection.shortageAmount || 0)));

  const [status, setStatus] = useState<TransactionStatus>(collection.status || 'COMPLETE');
  const [targetAmount, setTargetAmount] = useState<string>(String(initialTarget));
  const [actualReceived, setActualReceived] = useState<string>(String(initialActual));
  const [shortageAmount, setShortageAmount] = useState<string>(
    collection.shortageAmount !== undefined ? String(collection.shortageAmount) : String(Math.max(0, initialTarget - initialActual))
  );
  const [extraAmount, setExtraAmount] = useState<string>(
    collection.extraAmount !== undefined ? String(collection.extraAmount) : '0'
  );
  const [summaryNote, setSummaryNote] = useState<string>(
    collection.summaryNote || collection.notes || ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Recalculate shortage and extra when actualReceived or targetAmount changes
  const handleActualChange = (val: string) => {
    const cleaned = cleanCommas(val);
    setActualReceived(cleaned);
    const act = Number(cleaned) || 0;
    const tgt = Number(cleanCommas(targetAmount)) || 0;
    if (tgt > 0) {
      if (act < tgt) {
        setShortageAmount(String(tgt - act));
        setExtraAmount('0');
      } else if (act > tgt) {
        setShortageAmount('0');
        setExtraAmount(String(act - tgt));
      } else {
        setShortageAmount('0');
        setExtraAmount('0');
      }
    }
  };

  const handleSetFullPayment = () => {
    const tgt = cleanCommas(targetAmount);
    setActualReceived(tgt);
    setShortageAmount('0');
    setExtraAmount('0');
    setStatus('COMPLETE');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const tgtNum = Math.max(0, Number(cleanCommas(targetAmount)) || 0);
      const actNum = Math.max(0, Number(cleanCommas(actualReceived)) || 0);
      const shortageNum = Math.max(0, Number(cleanCommas(shortageAmount)) || 0);
      const extraNum = Math.max(0, Number(cleanCommas(extraAmount)) || 0);

      onSaveStatus(
        collection.id,
        status,
        shortageNum,
        extraNum,
        summaryNote.trim(),
        actNum,
        tgtNum
      );
      setIsSubmitting(false);
      onClose();
    }, 350);
  };

  const numTarget = Number(cleanCommas(targetAmount)) || 0;
  const numActual = Number(cleanCommas(actualReceived)) || 0;
  const numShortage = Number(cleanCommas(shortageAmount)) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#e5e5e5] w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-[#2f3131] text-white flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold tracking-tight">
              Update Received Cash #{collection.id}
            </h3>
            <p className="text-xs text-[#c8c6c5] mt-0.5 font-mono">
              Client: {collection.clientName} • Target: {formatXAF(numTarget)} FCFA
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-[#ffffff]">
          {/* Target and Actual Received Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a] mb-1.5">
                Target Amount (FCFA)
              </label>
              <input
                type="text"
                value={formatCommaNumber(targetAmount)}
                onChange={(e) => setTargetAmount(cleanCommas(e.target.value))}
                placeholder="0"
                className="w-full h-11 px-3 bg-[#f8fafc] border border-[#e5e5e5] focus:border-[#0891b2] text-sm font-mono font-bold"
              />
              <p className="text-[10px] text-[#5f5e5e] mt-1">Expected collection volume</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0891b2]">
                  Actually Received (FCFA) *
                </label>
                <button
                  type="button"
                  onClick={handleSetFullPayment}
                  className="text-[10px] text-[#0891b2] hover:underline font-bold"
                >
                  Full Paid
                </button>
              </div>
              <input
                type="text"
                required
                value={formatCommaNumber(actualReceived)}
                onChange={(e) => handleActualChange(e.target.value)}
                placeholder="0"
                className="w-full h-11 px-3 bg-[#ffffff] border-2 border-[#0891b2] text-sm font-mono font-bold text-[#1a1c1c]"
              />
              <p className="text-[10px] text-[#0891b2] mt-1">Cash handed over by client</p>
            </div>
          </div>

          {/* Real-time Shortfall / Balance Lacking Alert Banner */}
          {numShortage > 0 ? (
            <div className="p-3.5 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#dc2626] shrink-0" />
                <div>
                  <span className="font-bold">Balance Lacking: </span>
                  <span className="font-mono font-extrabold text-sm">{formatXAF(numShortage)} FCFA</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#fee2e2] border border-[#fca5a5]">
                Shortfall Logged
              </span>
            </div>
          ) : (
            <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16a34a] shrink-0" />
                <span>Full collection achieved. No shortage balance.</span>
              </div>
            </div>
          )}

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
              <option value="PENDING">PENDING (PARTIAL / IN PROGRESS)</option>
              <option value="CANCELLED">CANCELLED (ABORTED)</option>
            </select>
          </div>

          {/* Summary Note */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a1c1c] mb-1.5">
              Settlement Note & Discrepancy Reason
            </label>
            <textarea
              rows={2}
              value={summaryNote}
              onChange={(e) => setSummaryNote(e.target.value)}
              placeholder="e.g. Client paid 4.5M FCFA; remaining 500k FCFA to be completed tomorrow morning..."
              className="w-full p-3 bg-[#ffffff] border border-[#e5e5e5] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-xs outline-none resize-none"
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
