// Transaction records keep XAF per unit; the naira form quotes NGN per 1,000 XAF.
export function rateInXaf(currency: string, quotedRate: number): number {
  if (currency === 'XAF') return 1;
  if (!Number.isFinite(quotedRate) || quotedRate <= 0) return 0;
  return currency === 'NGN' ? 1000 / quotedRate : quotedRate;
}

export function formatExchangeRate(currency: string, xafPerUnit: number): string {
  if (currency === 'XAF') return '1 XAF = 1 XAF';
  if (!Number.isFinite(xafPerUnit) || xafPerUnit <= 0) return 'Rate unavailable';
  return currency === 'NGN'
    ? `${(1000 / xafPerUnit).toLocaleString(undefined, { maximumFractionDigits: 4 })} NGN = 1,000 XAF`
    : `1 ${currency} = ${xafPerUnit.toLocaleString()} XAF`;
}
