const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup(environment = {}) {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, relative);
    if (cache.has(filename)) return cache.get(filename);
    const context = { exports: {}, localStorage: storage, sessionStorage: storage, URLSearchParams, console, ...environment, require(name) {
      if (!name.startsWith('.')) return require(name);
      const base = path.resolve(path.dirname(filename), name);
      return load(fs.existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`);
    } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8').replace(/\bimport\.meta\b/g, '({ env: {} })'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, context);
    cache.set(filename, context.exports);
    return context.exports;
  }
  return { load, storage };
}

const { rateInXaf, formatExchangeRate } = setup().load('src/utils/exchangeRates.ts');
test('2,300 NGN per 1,000 XAF converts NGN amounts correctly', () => {
  assert.equal(2300 * rateInXaf('NGN', 2300), 1000);
  assert.equal(23000 * rateInXaf('NGN', 2300), 10000);
  assert.equal(1000 / rateInXaf('NGN', 2300), 2300);
});
test('separate buying and selling quotes produce distinct canonical values', () => {
  assert.equal(2300 * rateInXaf('NGN', 2500), 920);
  assert.equal(2300 * rateInXaf('NGN', 2300), 1000);
});
test('other currencies retain XAF per unit and XAF stays 1:1', () => {
  assert.equal(10 * rateInXaf('USD', 615), 6150);
  assert.equal(rateInXaf('XAF', 2300), 1);
});
test('invalid quotes cannot silently become a rate of one', () => {
  for (const value of [0, -2, NaN, Infinity]) assert.equal(rateInXaf('NGN', value), 0);
});
test('transaction display recovers the naira quote from the stored canonical rate', () => {
  assert.match(formatExchangeRate('NGN', rateInXaf('NGN', 2300)), /2,300 NGN = 1,000 XAF/);
});
test('legacy naira settings preserve economic value and convert only once', () => {
  const s = setup();
  s.storage.setItem('enako_cash_exchange_rates', JSON.stringify({ NGN: { buyingRate: '400', sellingRate: '420' } }));
  const ratesApi = s.load('src/components/ExchangeRatesView.tsx');
  const rates = ratesApi.getStoredRates();
  assert.equal(Number(rates.NGN.buyingRate), 2500);
  assert.ok(Math.abs(rateInXaf('NGN', Number(rates.NGN.sellingRate)) - 0.42) < 1e-12);
  ratesApi.saveStoredRates(rates);
  assert.equal(ratesApi.getStoredRates().NGN.buyingRate, rates.NGN.buyingRate);
});

const permissions = setup().load('src/utils/permissions.ts');
const field = { id: 'collector-1', terminalId: 'TRM-1', name: 'John Doe', role: 'Field Cash Collector' };
test('field collector sees assignments by user ID or terminal only', () => {
  assert.equal(permissions.canViewCollection(field, { assignedCollectorId: field.id }), true);
  assert.equal(permissions.canViewCollection(field, { assignedCollectorId: field.terminalId }), true);
  assert.equal(permissions.canViewCollection(field, { assignedCollectorId: 'other', assignedCollectorName: 'John Doe' }), false);
});
test('legacy assignment names must match fully, never by first name', () => {
  assert.equal(permissions.canViewCollection(field, { assignedCollectorName: ' John Doe ' }), true);
  assert.equal(permissions.canViewCollection(field, { assignedCollectorName: 'John Smith' }), false);
  assert.equal(permissions.canViewCollection(undefined, {}), false);
  assert.equal(permissions.canViewCollection(field, {}), false);
});
test('senior collector role variants retain operational access with CEO-only management', () => {
  for (const role of ['Senior Cash Officer', 'Senior Cash Collector', 'Senior Manager']) {
    const senior = { ...field, role };
    assert.equal(permissions.hasOperationalAccess(senior), true);
    assert.equal(permissions.canViewCollection(senior, { assignedCollectorId: 'other' }), true);
    assert.equal(permissions.canManageCollectors(senior), false);
    assert.equal(permissions.canEditExistingRecords(senior), false);
  }
});

test('FX creation sends the session token and caches the server transaction ID', async () => {
  let sent;
  const s = setup({ fetch: async (url, options) => {
    sent = options;
    return { ok: true, json: async () => ({ id: 'server-id', amountInXaf: 1000 }) };
  } });
  s.storage.setItem('enako_access_token', 'test-session');
  const api = s.load('src/api/cashApi.ts');
  assert.equal(await api.createRemoteTransaction({ amount: 2300, currency: 'NGN', amountInXaf: 1000, exchangeRate: rateInXaf('NGN', 2300) }), true);
  assert.equal(sent.headers.Authorization, 'Bearer test-session');
  assert.equal(JSON.parse(sent.body).amountInXaf, 1000);
  assert.equal(api.getLocalTransactions()[0].id, 'server-id');
});

test('rejected FX creation reports failure without creating a false local transaction', async () => {
  const s = setup({ fetch: async () => ({ ok: false, status: 401 }) });
  const api = s.load('src/api/cashApi.ts');
  assert.equal(await api.createRemoteTransaction({ amount: 2300, currency: 'NGN' }), false);
  assert.equal(api.getLocalTransactions().length, 0);
});

test('NGN reports preserve the conversion after the server rounds the stored rate', async () => {
  const s = setup({ fetch: async () => ({ ok: true, json: async () => ({ items: [{ id: 'server-id', currency: 'NGN', amount: '2300', amountInXaf: '1000', exchangeRate: '0.4348' }] }) }) });
  const api = s.load('src/api/cashApi.ts');
  const result = await api.fetchRemoteTransactions();
  assert.equal(result.items[0].amountInXaf, 1000);
  assert.match(formatExchangeRate('NGN', result.items[0].exchangeRate), /2,300 NGN = 1,000 XAF/);
});
