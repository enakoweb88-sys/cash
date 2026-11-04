import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

// Use installed Chromium with a fresh temporary profile. All API responses are
// fixtures; this test never logs into or changes a real employee's account.
const browserPath = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
assert.ok(browserPath, 'Set CHROME_PATH to an installed Chromium browser');
const port = await new Promise(resolve => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
});
const profile = mkdtempSync(path.join(tmpdir(), 'enako-accountant-check-'));
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { windowsHide: true, stdio: 'ignore' });
let browser, socket;
let emptyLedger = false, collectionRequests = 0;
const errors = [];
try {
  const base = `http://127.0.0.1:${port}`;
  for (let retry = 0; ; retry++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    if (retry > 100) throw new Error('Preview did not start');
    await delay(100);
  }
  browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let debugPort;
  for (let retry = 0; ; retry++) {
    try { debugPort = Number(readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); if (debugPort) break; } catch {}
    if (retry > 100) throw new Error('Browser did not start');
    await delay(100);
  }
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.onmessage = async event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id); if (!task) return;
      clearTimeout(task.timeout); pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') {
      const request = message.params;
      const pathname = new URL(request.request.url).pathname;
      const isCollections = pathname.endsWith('/cash-collections');
      if (isCollections) collectionRequests++;
      const response = isCollections ? { items: emptyLedger ? [] : [{ id: 'COL-1111', clientName: 'Server record', amountCollected: '1000', currency: 'XAF', status: 'COMPLETE', description: '{}', collectionTime: '2026-11-04T12:00:00Z' }], totalPages: emptyLedger ? 0 : 1 } : pathname.endsWith('/transactions') ? { items: [] } : [];
      await send('Fetch.fulfillRequest', { requestId: request.requestId, responseCode: 200,
        responseHeaders: [{ name: 'content-type', value: 'application/json' }, { name: 'access-control-allow-origin', value: '*' }, { name: 'access-control-allow-headers', value: 'authorization, content-type' }, { name: 'access-control-allow-methods', value: 'GET, POST, PATCH, DELETE, OPTIONS' }],
        body: Buffer.from(JSON.stringify(response)).toString('base64') });
    }
  };
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let retry = 0; retry < 160; retry++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error(`Browser condition timed out: ${expression}`);
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
  const user = { id: 'cash-test', name: 'Cash Test', email: 'test@example.test', role: 'CEO', terminalId: 'T-1', branch: 'Douala', avatarLetter: 'C', isLoggedIn: true };
  const cached = ['COL-9027', 'COL-5942', 'COL-1111', 'LOCAL-PENDING'].map(id => ({ id, clientId: 'client', clientName: id, amount: 1000, time: 'Now', timestamp: '2026-11-04T12:00:00Z', status: 'COMPLETE', ...(id === 'LOCAL-PENDING' ? { syncState: 'pending' } : {}) }));
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('enako_user', ${JSON.stringify(JSON.stringify(user))}); localStorage.setItem('enako_cash_data_cleared_v6', 'true'); localStorage.setItem('enako_cash_last_activity', String(Date.now())); localStorage.setItem('enako_collections', ${JSON.stringify(JSON.stringify(cached))}); localStorage.setItem('enako_access_token', 'test-only');` });
  await send('Page.navigate', { url: base + '/#history' });
  await waitFor("JSON.parse(localStorage.getItem('enako_collections') || '[]').length === 2");
  const ids = await evaluate("JSON.parse(localStorage.getItem('enako_collections')).map(row => row.id)");
  assert.deepEqual(ids.sort(), ['COL-1111', 'LOCAL-PENDING'].sort());
  assert.ok(!await evaluate("document.body.innerText.includes('COL-9027') || document.body.innerText.includes('COL-5942')"));
  assert.ok(await evaluate("JSON.parse(localStorage.getItem('enako_collections_backup_before_sync_v1')).length === 4"));
  assert.equal(errors.length, 0);
  console.log('PASS: cached deleted COL IDs leave the actual cash screen and storage; pending uploads and a legacy backup are retained.');
  emptyLedger = true;
  await evaluate("window.dispatchEvent(new Event('focus'))");
  await waitFor("JSON.parse(localStorage.getItem('enako_collections') || '[]').length === 1");
  assert.ok(collectionRequests >= 2);
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('enako_collections'))[0].id"), 'LOCAL-PENDING');
  console.log('PASS: returning to the cash tab refreshes deletions, including an empty server ledger, without removing pending work.');

} finally {
  socket?.close();
  browser?.kill();
  preview.kill();
}
