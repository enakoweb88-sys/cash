const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function setup(fetch, location) {
  const session = new Map(), local = new Map();
  const storage = values => ({ getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) });
  const cache = new Map();
  function load(file) {
    file = path.resolve(__dirname, file);
    if (cache.has(file)) return cache.get(file);
    const context = { exports: {}, window: { location }, localStorage: storage(local), sessionStorage: storage(session), fetch, URLSearchParams, URL, Headers, FormData, Blob, console: { warn() {}, log() {} }, require(name) { return name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts') : require(name); } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8').replace(/\bimport\.meta\b/g, '({env:{}})'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
    cache.set(file, context.exports); return context.exports;
  }
  return { session, local, api: load('src/api/cashApi.ts') };
}
const profile = { id: 'fixture-collector', name: 'Fixture Collector', email: 'fixture@example.invalid', terminalId: 'TRM-FIXTURE', branch: 'Fixture', cashLevel: 'operator', osRole: 'EMPLOYEE' };
const response = (ok, data) => ({ ok, json: async () => data });

test('cash login relies on server response and stores its credential only in sessionStorage', async () => {
  const calls=[]; const s=setup(async(url,options)=>{ calls.push({url,options});return response(true,{accessToken:'fixture-cash-token',user:profile}); });
  const r=await s.api.authenticatePortalUser('TRM-FIXTURE','fixture-password');
  assert.equal(r.success,true);assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/cash-auth/login'));
  assert.equal(JSON.parse(calls[0].options.body).identifier,'TRM-FIXTURE');assert.equal(s.session.get('enako_cash_session_v1'),'fixture-cash-token');assert.equal(s.local.size,0);
});

test('production Cash sessions use the Cash website session without cross-site cookies', async () => {
  const calls=[];
  const s=setup(async(url,options)=>{calls.push({url,options});return response(true,{accessToken:'fixture-cash-token',user:profile});},{hostname:'enakootc.com',origin:'https://enakootc.com'});
  assert.equal(s.api.resolveCashApiBaseUrl('https://api.enakoos.com/api/v1',{hostname:'enakootc.com',origin:'https://enakootc.com'}),'https://enakootc.com/api/v1');
  assert.equal(s.api.resolveCashApiBaseUrl('http://127.0.0.1:5000/api/v1/',{hostname:'localhost',origin:'http://localhost:3003'}),'http://127.0.0.1:5000/api/v1');
  await s.api.authenticatePortalUser('fixture@example.invalid','fixture-password');
  await s.api.restoreCashSession();await s.api.logoutCashSession();
  assert.equal(calls.length,3);
  for(const call of calls){assert.ok(call.url.startsWith('https://enakootc.com/api/v1/cash-auth/'));assert.equal(call.options.credentials,'same-origin');assert.equal(call.options.cache,'no-store');}
});

test('Cash documents stay on the Cash proxy and refuse external or OS document URLs', async () => {
  const calls=[];
  const s=setup(async(url,options)=>{calls.push({url,options});return {ok:true,blob:async()=>new Blob(['fixture-pdf'])};},{hostname:'enakootc.com',origin:'https://enakootc.com'});
  s.session.set('enako_cash_session_v1','fixture-cash-token');
  await s.api.fetchKycDocument('/api/v1/cash-collections/documents/fixture');
  assert.equal(calls[0].url,'https://enakootc.com/api/v1/cash-collections/documents/fixture');
  assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.headers.Authorization,'Bearer fixture-cash-token');
  for(const url of ['https://attacker.invalid/api/v1/cash-collections/documents/fixture','/api/v1/files/private/fixture'])await assert.rejects(s.api.fetchKycDocument(url));
  assert.equal(calls.length,1);
});

test('rejected login cannot use cached accounts, a CEO label or a legacy credential', async () => {
  const s=setup(async()=>response(false,{}));s.local.set('enako_cash_accounts',JSON.stringify([{password:'fixture-password',role:'CEO'}]));s.local.set('enako_access_token','fixture-old-os-token');
  const r=await s.api.authenticatePortalUser('fixture@example.invalid','fixture-password');assert.equal(r.success,false);assert.equal(s.session.has('enako_cash_session_v1'),false);
});

test('cash API never falls back to a legacy OS token', async () => {
  let headers;const s=setup(async(_,options)=>{headers=options.headers;return response(true,{items:[],totalPages:1});});s.local.set('enako_access_token','fixture-old-os-token');s.session.set('enako_cash_os_session_v1','fixture-os-token');
  await s.api.fetchRemoteCollections();assert.equal(headers.Authorization,undefined);
  s.session.set('enako_cash_session_v1','fixture-cash-token');await s.api.fetchRemoteCollections();assert.equal(headers.Authorization,'Bearer fixture-cash-token');
});

test('Cash administrators never perform an OS login or receive OS credentials, even with forged company-role metadata', async () => {
  const calls=[]; const s=setup(async(url,options)=>{ calls.push({url,options}); return response(true,{accessToken:'fixture-cash-token',user:{...profile,cashLevel:'administrator',osRole:'CEO'}}); });
  s.session.set('enako_cash_os_session_v1','legacy-os-credential');
  const result=await s.api.authenticatePortalUser('fixture@example.invalid','fixture-password');
  assert.equal(result.success,true); assert.equal(calls.length,1); assert.ok(calls[0].url.endsWith('/cash-auth/login'));
  assert.equal(s.session.has('enako_cash_os_session_v1'),false); assert.equal(s.session.has('enako_cash_os_refresh_v1'),false);
});

test('restore revalidates the server session and clears rejected credentials', async () => {
  const s=setup(async()=>response(false,{}));s.session.set('enako_cash_session_v1','fixture-expired-token');assert.equal(await s.api.restoreCashSession(),null);assert.equal(s.session.size,0);
});

test('logout clears local credentials immediately and sends the captured session for revocation', async () => {
  let headers;const s=setup(async(_,options)=>{headers=options.headers;return response(true,{});});s.session.set('enako_cash_session_v1','fixture-cash-token');
  const pending=s.api.logoutCashSession();assert.equal(s.session.size,0);await pending;assert.equal(headers.Authorization,'Bearer fixture-cash-token');
});

test('collector profiles strip legacy credential fields before reaching UI state', async () => {
  const s=setup(async()=>response(true,[{id:'fixture',fullName:'Fixture',password:'fixture-private',passwordHash:'fixture-hash',responsibilities:'fixture-private',salary:100}]));
  assert.doesNotMatch(JSON.stringify(await s.api.fetchRemoteCollectors()),/password|responsibilities|salary|fixture-private|fixture-hash/);
});

test('receipt requests cannot fall back to an unguarded email route or claim failed delivery succeeded', async () => {
  const calls=[];const s=setup(async(url,options)=>{calls.push({url,options});return response(false,{});});
  assert.equal(await s.api.sendCollectionNotificationEmail({id:'fixture-record'},'ignored@example.invalid'),false);assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/cash-collections/send-receipt'));assert.deepEqual(JSON.parse(calls[0].options.body),{collectionId:'fixture-record'});
});

test('collector creation and deactivation failures remain failures', async () => {
  const s=setup(async()=>response(false,{}));await assert.rejects(()=>s.api.createRemoteCollector({}),/registration failed/);await assert.rejects(()=>s.api.deleteRemoteCollector('fixture','Fixture reason'),/deactivation failed/);
});

test('OS titles and executive email do not grant cash permissions', () => {
  const p=setup(async()=>{throw Error('no network');});const source=fs.readFileSync(path.join(__dirname,'src/utils/permissions.ts'),'utf8');
  const context={exports:{},require:()=>({})};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
  const permissions=context.exports;assert.equal(permissions.canManageCollectors({role:'CEO',email:'ceo@example.invalid'}),false);assert.equal(permissions.canManageCollectors({cashLevel:'administrator'}),true);assert.equal(permissions.canManageCollectors({cashLevel:'operator'}),false);
});
