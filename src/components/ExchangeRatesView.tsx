import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  Save, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp, 
  CheckCircle2
} from 'lucide-react';
import { ViewType, CollectorUser, ExchangeRateItem } from '../types';

export const INITIAL_CURRENCIES: Record<string, ExchangeRateItem> = {
  USD: { code: 'USD', name: 'US Dollar', flag: '💵', buyingRate: '615', sellingRate: '625', change24h: 0.8 },
  EUR: { code: 'EUR', name: 'Euro', flag: '💶', buyingRate: '655', sellingRate: '665', change24h: 0.3 },
  GBP: { code: 'GBP', name: 'British Pound', flag: '🇬🇧', buyingRate: '780', sellingRate: '795', change24h: -0.2 },
  USDT: { code: 'USDT', name: 'Tether Crypto Dollar', flag: '🪙', buyingRate: '630', sellingRate: '645', change24h: 1.2 },
  NGN: { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬', buyingRate: '400', sellingRate: '420', change24h: -0.5 },
  CNY: { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳', buyingRate: '85', sellingRate: '90', change24h: 0.1 },
};

export function getStoredRates(): Record<string, ExchangeRateItem> {
  try {
    const raw = localStorage.getItem('enako_cash_exchange_rates');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...INITIAL_CURRENCIES, ...parsed };
    }
  } catch (e) {}
  return INITIAL_CURRENCIES;
}

export function saveStoredRates(rates: Record<string, ExchangeRateItem>) {
  try {
    localStorage.setItem('enako_cash_exchange_rates', JSON.stringify(rates));
  } catch (e) {}
}

interface ExchangeRatesViewProps {
  user: CollectorUser;
  onNavigate: (view: ViewType) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ExchangeRatesView: React.FC<ExchangeRatesViewProps> = ({
  user,
  onNavigate,
  onShowToast,
}) => {
  const [rates, setRates] = useState<Record<string, ExchangeRateItem>>(() => getStoredRates());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, { buyingRate: string; sellingRate: string }>>({});

  useEffect(() => {
    const current = getStoredRates();
    setRates(current);
    const initial: Record<string, { buyingRate: string; sellingRate: string }> = {};
    Object.keys(current).forEach((code) => {
      initial[code] = {
        buyingRate: current[code].buyingRate || '',
        sellingRate: current[code].sellingRate || '',
      };
    });
    setEditForm(initial);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      const current = getStoredRates();
      setRates(current);
      setLoading(false);
      onShowToast('Exchange rates refreshed from database', 'info');
    }, 300);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      const updated: Record<string, ExchangeRateItem> = { ...rates };
      Object.keys(editForm).forEach((code) => {
        if (updated[code]) {
          updated[code] = {
            ...updated[code],
            buyingRate: editForm[code].buyingRate.trim(),
            sellingRate: editForm[code].sellingRate.trim(),
            lastUpdated: new Date().toISOString(),
          };
        }
      });

      setRates(updated);
      saveStoredRates(updated);
      setSaving(false);
      onShowToast('Live market buying & selling rates saved successfully!', 'success');
      onNavigate('transactions');
    }, 400);
  };

  const rateList: ExchangeRateItem[] = Object.values(rates);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 font-sans">
      {/* Top Header */}
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
            Market Command & Exchange Rate Matrix
          </h2>
          <p className="text-xs text-[#595959] mt-0.5">
            Configure live market buying and selling exchange rates for Naira, USDT, Dollar, Euro, GBP & Yuan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-[#f2f2f2] border border-[#d6d6d6] text-[#1a1c1c] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#0891b2] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Matrix</span>
          </button>
        </div>
      </div>

      {/* Main Rates Form */}
      <form onSubmit={handleSave} className="bg-white border border-[#e5e5e5] shadow-xs p-6 space-y-6">
        <div className="space-y-4">
          {rateList.map((curr) => {
            const buying = Number(editForm[curr.code]?.buyingRate || 0);
            const selling = Number(editForm[curr.code]?.sellingRate || 0);
            const spread = selling > buying && buying > 0 ? (selling - buying).toFixed(curr.code === 'NGN' ? 3 : 2) : null;
            const isPositive = curr.change24h >= 0;

            return (
              <div
                key={curr.code}
                className="p-4 bg-[#f9f9f9] border border-[#e5e5e5] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Currency Identity */}
                <div className="flex items-center gap-3 sm:w-56 shrink-0">
                  <span className="text-3xl leading-none">{curr.flag}</span>
                  <div>
                    <p className="font-bold text-[#1a1c1c] text-sm leading-tight">
                      {curr.code} <span className="text-xs font-normal text-[#595959]">({curr.name})</span>
                    </p>
                    <p className="text-[10px] font-bold text-[#0891b2] uppercase tracking-wider mt-0.5">
                      {curr.code === 'NGN' ? 'NGN per 1,000 FCFA' : `1 ${curr.code} : FCFA`}
                    </p>
                  </div>
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-md">
                  <div>
                    <label className="block text-[10px] font-bold text-[#595959] uppercase tracking-wider mb-1">
                      Buying Rate {curr.code === 'NGN' ? '(FCFA / 1,000 NGN)' : '(FCFA)'}
                    </label>
                    <input
                      type="text"
                      value={editForm[curr.code]?.buyingRate || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          [curr.code]: { ...editForm[curr.code], buyingRate: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-bold text-[#1a1c1c] border border-[#d6d6d6] focus:border-[#0891b2] outline-none bg-white font-mono"
                      placeholder={curr.code === 'NGN' ? 'e.g. 400' : 'Enter buying rate...'}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#595959] uppercase tracking-wider mb-1">
                      Selling Rate {curr.code === 'NGN' ? '(FCFA / 1,000 NGN)' : '(FCFA)'}
                    </label>
                    <input
                      type="text"
                      value={editForm[curr.code]?.sellingRate || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          [curr.code]: { ...editForm[curr.code], sellingRate: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-bold text-[#166534] border border-[#d6d6d6] focus:border-[#0891b2] outline-none bg-white font-mono"
                      placeholder={curr.code === 'NGN' ? 'e.g. 420' : 'Enter selling rate...'}
                    />
                  </div>
                </div>

                {/* Spread Margin Preview */}
                <div className="sm:text-right shrink-0 sm:w-32 bg-white p-2.5 border border-[#e5e5e5]">
                  <p className="text-[9px] font-bold text-[#595959] uppercase tracking-wider">Spread Margin</p>
                  <p className="text-xs font-black text-[#1a1c1c] mt-0.5">
                    {spread !== null ? `+${spread} XAF` : '—'}
                  </p>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold mt-1 ${isPositive ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span>{isPositive ? `+${curr.change24h}%` : `${curr.change24h}%`}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-[#e5e5e5] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="px-5 py-2.5 border border-[#d6d6d6] text-xs font-bold uppercase tracking-wider text-[#595959] hover:bg-[#f2f2f2] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Rates...' : 'Save Exchange Rates'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
