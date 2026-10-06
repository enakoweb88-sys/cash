import React, { useState } from 'react';
import { 
  ArrowLeft, 
  DollarSign, 
  Send, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Calculator,
  Building,
  CreditCard
} from 'lucide-react';
import { ViewType, CollectorUser } from '../types';
import { createRemoteTransaction } from '../api/cashApi';

interface CreateTransactionViewProps {
  user: CollectorUser;
  onNavigate: (view: ViewType) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const CreateTransactionView: React.FC<CreateTransactionViewProps> = ({
  user,
  onNavigate,
  onShowToast,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);

  const [transactionDate, setTransactionDate] = useState(todayStr);
  const [transactionTime, setTransactionTime] = useState(nowTimeStr);
  const [autoTime, setAutoTime] = useState(true);

  const [entity, setEntity] = useState('');
  const [type, setType] = useState<'Send' | 'Receive'>('Receive');
  const [channel, setChannel] = useState('Bank Transfer');
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [buyingRate, setBuyingRate] = useState('615');
  const [sellingRate, setSellingRate] = useState('625');
  const [sellingCurrency, setSellingCurrency] = useState('XAF');
  const [description, setDescription] = useState('');

  // Auto-update time live
  React.useEffect(() => {
    if (!autoTime) return;
    const interval = setInterval(() => {
      const current = new Date().toTimeString().split(' ')[0].substring(0, 5);
      setTransactionTime(current);
    }, 1000);
    return () => clearInterval(interval);
  }, [autoTime]);

  // Calculations
  const numAmount = Number(amount) || 0;
  const numBuyingRate = Number(buyingRate) || 1;
  const numSellingRate = Number(sellingRate) || 1;

  const amountInXaf = currency === 'XAF' ? numAmount : numAmount * numBuyingRate;
  const sellingXaf = currency === 'XAF' ? numAmount : numAmount * numSellingRate;
  const estimatedMargin = Math.max(0, sellingXaf - amountInXaf);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!entity.trim()) {
      setErrorMessage('Please enter the client / entity name.');
      return;
    }
    if (numAmount <= 0) {
      setErrorMessage('Please enter a valid transfer amount.');
      return;
    }

    setSubmitting(true);
    try {
      const createdIso = new Date(`${transactionDate}T${transactionTime}:00`).toISOString();
      const payload = {
        entity: entity.trim(),
        type,
        channel,
        amount: numAmount,
        currency,
        amountInXaf,
        exchangeRate: type === 'Receive' ? numBuyingRate : numSellingRate,
        buyingRate: numBuyingRate,
        sellingRate: numSellingRate,
        transactionDate,
        transactionTime,
        createdAt: createdIso,
        description: description.trim() 
          ? `${description.trim()} | Buy: ${numBuyingRate}, Sell: ${numSellingRate}`
          : `FX ${type}: ${numAmount} ${currency} @ ${numBuyingRate} XAF`,
        status: 'PENDING',
      };

      const ok = await createRemoteTransaction(payload);
      if (ok) {
        onShowToast(`FX Transaction for ${entity} created successfully!`, 'success');
        onNavigate('transactions');
      } else {
        setErrorMessage('Failed to save transaction to central system. Please check your connection.');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred while processing the transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 font-sans">
      {/* Page Header */}
      <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate('transactions')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0891b2] hover:underline mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to FX Transactions</span>
          </button>
          <h2 className="text-2xl font-bold text-[#1a1c1c] tracking-tight">
            Log New FX Transaction
          </h2>
          <p className="text-xs text-[#595959] mt-0.5">
            Initiate foreign currency transfers, client receive receipts, and payout disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#ecfeff] text-[#0891b2] border border-[#a5f3fc] text-xs font-bold uppercase tracking-wider">
            Terminal: {user.terminalId}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-[#ffdad6] border border-[#e4beb9] text-[#93000a] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entity & Channel Information */}
        <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#0891b2] border-b border-[#e5e5e5] pb-2">
            1. Client & Transfer Category
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1c1c] mb-1">
              Beneficiary / Client Entity *
            </label>
            <input
              type="text"
              required
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="e.g. Afriland Microfinance / Global Logistics Ltd"
              className="w-full h-12 px-4 bg-[#f9f9f9] border border-[#d6d6d6] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm text-[#1a1c1c] font-bold outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1c1c] mb-1">
                Transaction Date *
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full h-12 px-4 bg-[#f9f9f9] border border-[#d6d6d6] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm text-[#1a1c1c] font-bold outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1c1c]">
                  Transaction Time (Automatic)
                </label>
                <button
                  type="button"
                  onClick={() => setAutoTime(!autoTime)}
                  className="text-[10px] font-bold uppercase tracking-wider text-[#0891b2] hover:underline cursor-pointer"
                >
                  {autoTime ? '🟢 Live Auto-Time' : '✏️ Manual Time'}
                </button>
              </div>
              <input
                type="time"
                step="1"
                required
                value={transactionTime}
                onChange={(e) => {
                  setAutoTime(false);
                  setTransactionTime(e.target.value);
                }}
                className="w-full h-12 px-4 bg-[#f9f9f9] border border-[#d6d6d6] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm text-[#1a1c1c] font-mono font-bold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1c1c] mb-1">
                Transaction Direction *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('Receive')}
                  className={`h-12 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                    type === 'Receive'
                      ? 'bg-[#0891b2] text-white border-[#0891b2]'
                      : 'bg-[#f9f9f9] text-[#595959] border-[#d6d6d6] hover:bg-[#e5e5e5]'
                  }`}
                >
                  Receive (Inflow)
                </button>
                <button
                  type="button"
                  onClick={() => setType('Send')}
                  className={`h-12 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                    type === 'Send'
                      ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]'
                      : 'bg-[#f9f9f9] text-[#595959] border-[#d6d6d6] hover:bg-[#e5e5e5]'
                  }`}
                >
                  Send (Payout)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1c1c] mb-1">
                Payment Channel *
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full h-12 px-4 bg-[#f9f9f9] border border-[#d6d6d6] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm font-bold text-[#1a1c1c] outline-none cursor-pointer"
              >
                <option value="Bank Transfer">Bank Transfer (Ecobank / Afriland / UBA)</option>
                <option value="MTN MoMo">MTN MoMo Payout / Inflow</option>
                <option value="Orange Money">Orange Money Transfer</option>
                <option value="Crypto USDT">Crypto USDT Wallet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Currency & Forex Rates Matrix */}
        <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#0891b2] border-b border-[#e5e5e5] pb-2">
            2. Currency & Dual Exchange Rate Matrix
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1c1c] mb-1">
                Foreign Currency *
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-12 px-4 bg-[#f9f9f9] border border-[#d6d6d6] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] text-sm font-bold text-[#1a1c1c] outline-none cursor-pointer"
              >
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
                <option value="USDT">USDT (Crypto Dollar)</option>
                <option value="CNY">CNY (¥ - Chinese Yuan)</option>
                <option value="NGN">NGN (₦ - Nigerian Naira)</option>
                <option value="XAF">XAF (Fcfa - Central Africa)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1c1c] mb-1">
                Transfer Amount *
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full h-12 px-4 bg-[#f9f9f9] border border-[#d6d6d6] focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2] font-mono text-lg font-bold text-[#1a1c1c] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#595959] mb-1">
                Buying Rate (1 {currency} = XAF)
              </label>
              <input
                type="number"
                value={buyingRate}
                onChange={(e) => setBuyingRate(e.target.value)}
                placeholder="615"
                className="w-full h-12 px-4 bg-[#f9f9f9] border border-[#d6d6d6] focus:border-[#0891b2] font-mono text-sm font-bold text-[#1a1c1c] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#595959] mb-1">
                Selling Rate (1 {currency} = XAF)
              </label>
              <input
                type="number"
                value={sellingRate}
                onChange={(e) => setSellingRate(e.target.value)}
                placeholder="625"
                className="w-full h-12 px-4 bg-[#f9f9f9] border border-[#d6d6d6] focus:border-[#0891b2] font-mono text-sm font-bold text-[#1a1c1c] outline-none"
              />
            </div>
          </div>

          {/* Automatic Calculation Summary Box */}
          <div className="p-4 bg-[#2f3131] text-white border border-[#474746] space-y-2 mt-4">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#22d3ee]">
              <span>Calculated XAF Equivalent</span>
              <Calculator className="w-4 h-4" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <p className="text-[10px] text-[#c8c6c5] uppercase">Buying Cost (Inflow)</p>
                <p className="text-base font-mono font-bold">{amountInXaf.toLocaleString()} XAF</p>
              </div>
              <div>
                <p className="text-[10px] text-[#c8c6c5] uppercase">Selling Value (Outflow)</p>
                <p className="text-base font-mono font-bold">{sellingXaf.toLocaleString()} XAF</p>
              </div>
              <div>
                <p className="text-[10px] text-[#c8c6c5] uppercase">Est. Operating Margin</p>
                <p className="text-base font-mono font-bold text-[#a5f3fc]">+{estimatedMargin.toLocaleString()} XAF</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Description */}
        <div className="bg-white p-6 border border-[#e5e5e5] shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1c1c]">
            Settlement Notes & Reference Instructions
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add internal settlement notes, transaction IDs, or bank reference instructions..."
            className="w-full p-4 bg-[#f9f9f9] border border-[#d6d6d6] focus:border-[#0891b2] text-xs text-[#1a1c1c] outline-none resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="px-6 py-3 border border-[#d6d6d6] text-xs font-bold uppercase tracking-wider text-[#595959] hover:bg-[#f2f2f2] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Submitting FX Transaction...' : 'Submit FX Transaction'}
          </button>
        </div>
      </form>
    </div>
  );
};
