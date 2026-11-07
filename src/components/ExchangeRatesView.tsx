import { fetchCashExchangeRates, saveCashExchangeRates } from '../api/cashApi';
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
import { canEditExistingRecords } from '../utils/permissions';

export const INITIAL_CURRENCIES: Record<string, ExchangeRateItem> = {
  USD: { code: 'USD', name: 'US Dollar', flag: '💵', buyingRate: '', sellingRate: '', change24h: 0 },
  EUR: { code: 'EUR', name: 'Euro', flag: '💶', buyingRate: '', sellingRate: '', change24h: 0 },
  GBP: { code: 'GBP', name: 'British Pound', flag: '🇬🇧', buyingRate: '', sellingRate: '', change24h: 0 },
  USDT: { code: 'USDT', name: 'Tether Crypto Dollar', flag: '🪙', buyingRate: '', sellingRate: '', change24h: 0 },
  NGN: { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬', buyingRate: '', sellingRate: '', change24h: 0, quoteBasis: 'NGN_PER_1000_XAF' },
  CNY: { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳', buyingRate: '', sellingRate: '', change24h: 0 },
};

let verifiedRates: Record<string, ExchangeRateItem> = { ...INITIAL_CURRENCIES };
export function getStoredRates() { return verifiedRates; }
export function saveStoredRates(rates: Record<string, ExchangeRateItem>) { verifiedRates = rates; }

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
  const canEditRates = canEditExistingRecords(user);
  const [rates, setRates] = useState<Record<string, ExchangeRateItem>>(() => getStoredRates());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, { buyingRate: string; sellingRate: string }>>({});

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const rows: ExchangeRateItem[] = await fetchCashExchangeRates();
      const current = { ...INITIAL_CURRENCIES };
      for (const row of rows) current[row.code] = { ...row, quoteBasis: row.code === 'NGN' ? 'NGN_PER_1000_XAF' : undefined };
      saveStoredRates(current); setRates(current);
      setEditForm(Object.fromEntries(Object.entries(current).map(([code, item]) => [code, { buyingRate: item.buyingRate, sellingRate: item.sellingRate }])));
    } catch (error) { onShowToast(error instanceof Error ? error.message : 'Cash rates unavailable', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void handleRefresh(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditRates) {
      onShowToast('Senior Cash Officers can view rates but cannot change them.', 'info');
      return;
    }
    if (Object.values(editForm).some((rate: { buyingRate: string; sellingRate: string }) => !Number.isFinite(Number(rate.buyingRate)) || Number(rate.buyingRate) <= 0 || !Number.isFinite(Number(rate.sellingRate)) || Number(rate.sellingRate) <= 0)) {
      onShowToast('Enter buying and selling rates greater than zero for every currency.', 'error');
      return;
    }
    setSaving(true);
    try {
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

      await saveCashExchangeRates(Object.values(updated));
      setRates(updated);
      saveStoredRates(updated);
      setSaving(false);
      onShowToast('Live market buying & selling rates saved successfully!', 'success');
      onNavigate('transactions');
    } catch (error) { onShowToast(error instanceof Error ? error.message : 'Cash rates were not saved', 'error'); } finally { setSaving(false); }
  };

  const rateList: ExchangeRateItem[] = Object.values(rates);

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto space-y-5 pb-12 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-4">
        <div>
          <button
            onClick={() => onNavigate('transactions')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0891b2] hover:underline mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to FX Transactions</span>
          </button>
          <h2 className="text-xl font-semibold text-[#1a1c1c]">
            Exchange rates
          </h2>
          <p className="text-xs text-[#595959] mt-0.5">
            NGN rates are naira per 1,000 XAF (e.g. 2,300 NGN = 1,000 XAF). Other rates are XAF per currency unit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-[#f2f2f2] border border-[#d6d6d6] text-[#1a1c1c] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#0891b2] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Rates Form */}
      <form onSubmit={handleSave} className="min-w-0 space-y-4">
        {!canEditRates && (
          <div className="border border-[#bae6fd] bg-[#f0f9ff] px-4 py-3 text-xs font-bold text-[#075985]">
            Read-only access. Exchange-rate changes are restricted to the CEO.
          </div>
        )}
        <div className="overflow-x-auto border border-[#e5e5e5] bg-white" role="region" aria-label="Exchange rates" tabIndex={0}>
          <table className="w-full table-fixed min-w-[280px] text-left text-sm">
            <caption className="sr-only">NGN per 1,000 XAF; other currencies in XAF per unit.</caption>
            <thead className="border-b border-[#e5e5e5] bg-[#f3f3f3] text-xs text-[#595959]">
              <tr>
                <th scope="col" className="w-[30%] px-2 sm:px-4 py-3 font-semibold">Currency</th>
                <th scope="col" className="w-[23%] px-1 sm:px-3 py-3 font-semibold">Buy</th>
                <th scope="col" className="w-[23%] px-1 sm:px-3 py-3 font-semibold">Sell</th>
                <th scope="col" className="w-[24%] px-2 sm:px-4 py-3 text-right font-semibold">Spread</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5]">
          {rateList.map((curr) => {
            const buying = Number(editForm[curr.code]?.buyingRate || 0);
            const selling = Number(editForm[curr.code]?.sellingRate || 0);
            const spread = buying > 0 && selling > 0 ? (curr.code === 'NGN' ? 1000 / selling - 1000 / buying : selling - buying).toFixed(curr.code === 'NGN' ? 4 : 2) : null;
            const isPositive = curr.change24h >= 0;

            return (
              <tr
                key={curr.code}
                className="align-middle hover:bg-[#f9f9f9]"
              >
                {/* Currency Identity */}
                <th scope="row" className="px-2 sm:px-4 py-3 font-normal">
                  <span className="block text-sm font-semibold text-[#1a1c1c]">{curr.code}</span>
                  <span className="hidden sm:block mt-1 text-xs text-[#595959] break-words">{curr.name}</span>
                  <span className="block mt-1 text-[10px] text-[#595959]">{curr.code === 'NGN' ? 'NGN / 1,000 XAF' : 'XAF / unit'}</span>
                </th>

                {/* Input Fields */}
                  <td className="px-1 sm:px-3 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={curr.code === 'NGN' ? 'Buying rate in NGN per 1,000 XAF' : `${curr.code} buying rate in XAF per unit`}
                      disabled={!canEditRates}
                      value={editForm[curr.code]?.buyingRate || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          [curr.code]: { ...editForm[curr.code], buyingRate: e.target.value },
                        })
                      }
                      className="min-w-0 w-full h-11 px-1.5 sm:px-3 text-base font-medium text-[#1a1c1c] border border-[#d6d6d6] focus:border-[#0891b2] outline-none bg-white tabular-nums disabled:bg-[#eeeeee] disabled:cursor-not-allowed"
                    />
                  </td>

                  <td className="px-1 sm:px-3 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={curr.code === 'NGN' ? 'Selling rate in NGN per 1,000 XAF' : `${curr.code} selling rate in XAF per unit`}
                      disabled={!canEditRates}
                      value={editForm[curr.code]?.sellingRate || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          [curr.code]: { ...editForm[curr.code], sellingRate: e.target.value },
                        })
                      }
                      className="min-w-0 w-full h-11 px-1.5 sm:px-3 text-base font-medium text-[#166534] border border-[#d6d6d6] focus:border-[#0891b2] outline-none bg-white tabular-nums disabled:bg-[#eeeeee] disabled:cursor-not-allowed"
                    />
                  </td>

                {/* Spread Margin Preview */}
                <td className="px-2 sm:px-4 py-3 text-right">
                  <p className="text-xs font-semibold text-[#1a1c1c] tabular-nums [overflow-wrap:anywhere]">
                    {spread !== null ? `${Number(spread) >= 0 ? '+' : ''}${spread} XAF/unit` : '-'}
                  </p>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold mt-1 ${isPositive ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span>{isPositive ? `+${curr.change24h}%` : `${curr.change24h}%`}</span>
                  </span>
                </td>
              </tr>
            );
          })}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-[#e5e5e5] flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="px-5 py-2.5 border border-[#d6d6d6] text-xs font-bold uppercase tracking-wider text-[#595959] hover:bg-[#f2f2f2] cursor-pointer"
          >
            Cancel
          </button>
          {canEditRates && (
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs font-bold uppercase tracking-wider shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Rates...' : 'Save Exchange Rates'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
