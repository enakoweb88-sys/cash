const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function setup(fetch) {
  const data = new Map();
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, relative);
    if (cache.has(filename)) return cache.get(filename);
    const context = { exports: {}, localStorage: storage, sessionStorage: storage, fetch, URLSearchParams, console, require(name) {
      if (!name.startsWith('.')) return require(name);
      return load(path.resolve(path.dirname(filename), name + '.ts'));
    } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8').replace(/\bimport\.meta\b/g, '({ env: {} })'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
    cache.set(filename, context.exports); return context.exports;
  }
  return { load, storage };
}
const { reconcileCollections } = setup().load('src/utils/collectionSync.ts');
test('server deletions remove cached COL records, including an empty ledger', () => {
  const cached = [{ id: 'COL-9027' }, { id: 'COL-5942' }, { id: 'keep' }];
  assert.deepEqual(Array.from(reconcileCollections(cached, [{ id: 'keep' }], 100), row => row.id), ['keep']);
  assert.equal(reconcileCollections(cached, [], 100).length, 0);
});
test('pending uploads, failed uploads and writes newer than the snapshot survive refresh', () => {
  const cached = [{ id: 'pending', syncState: 'pending' }, { id: 'failed', syncState: 'failed' }, { id: 'new', syncedAt: 101 }, { id: 'deleted', syncedAt: 50 }];
  assert.deepEqual(Array.from(reconcileCollections(cached, [], 100), row => row.id), ['pending', 'failed', 'new']);
});
test('all collection pages are fetched before absence means deletion', async () => {
  const calls = [];
  const api = setup(async url => { calls.push(url); return { ok: true, json: async () => ({ items: [{ id: url.includes('page=2') ? 'older' : 'newer' }], totalPages: 2 }) }; }).load('src/api/cashApi.ts');
  assert.deepEqual(Array.from(await api.fetchRemoteCollections(), row => row.id), ['newer', 'older']);
  assert.equal(calls.length, 2);
});
test('failed or incomplete snapshots reject instead of clearing saved collections', async () => {
  const api = setup(async () => ({ ok: false })).load('src/api/cashApi.ts');
  await assert.rejects(() => api.fetchRemoteCollections(), /Failed to fetch/);
  const partial = setup(async url => url.includes('page=2') ? { ok: false } : { ok: true, json: async () => ({ items: [{ id: 'one' }], totalPages: 2 }) }).load('src/api/cashApi.ts');
  await assert.rejects(() => partial.fetchRemoteCollections(), /Failed to fetch/);
});
test('a successful empty transaction response cannot resurrect deleted local FX records', async () => {
  const fixture = setup(async () => ({ ok: true, json: async () => ({ items: [] }) }));
  fixture.storage.setItem('enako_cash_transactions', JSON.stringify([{ id: 'FX-9027' }, { id: 'FX-5942' }]));
  assert.equal((await fixture.load('src/api/cashApi.ts').fetchRemoteTransactions()).items.length, 0);
});
