const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(saved) {
  let now = 1_000_000;
  let expired = 0;
  let nextTimer = 0;
  const timers = new Map();
  const values = new Map(saved ? [['enako_cash_last_activity', String(saved)]] : []);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  function target() {
    const handlers = new Map();
    return {
      hidden: false,
      addEventListener(name, fn) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn); },
      removeEventListener(name, fn) { handlers.get(name)?.delete(fn); },
      dispatch(name, event) { [...(handlers.get(name) || [])].forEach(fn => fn(event)); },
    };
  }
  const window = target();
  const document = target();
  const context = { exports: {}, localStorage: storage, window, document, Date: { now: () => now },
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
  };
  const source = fs.readFileSync(`${__dirname}/src/utils/idleSession.ts`, 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  const api = context.exports;
  const stop = api.watchCashInactivity(() => expired++);
  return { api, storage, window, document, stop, timers, get expired() { return expired; },
    advance(ms, runTimers = true) {
      now += ms;
      if (runTimers) for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    },
  };
}

test('expires at two minutes and removes its timer', () => {
  const s = setup();
  s.advance(119999);
  assert.equal(s.expired, 0);
  s.advance(1);
  assert.equal(s.expired, 1);
  assert.equal(s.timers.size, 0);
});

test('user activity extends the deadline', () => {
  const s = setup();
  s.advance(90000);
  s.window.dispatch('keydown');
  s.advance(90000);
  assert.equal(s.expired, 0);
  s.advance(30000);
  assert.equal(s.expired, 1);
});

test('reload preserves an existing deadline', () => {
  const s = setup(950000);
  s.advance(69999);
  assert.equal(s.expired, 0);
  s.advance(1);
  assert.equal(s.expired, 1);
});

test('returning after suspended timers cannot revive an expired session', () => {
  const s = setup();
  s.advance(120001, false);
  s.window.dispatch('pointerdown');
  assert.equal(s.expired, 1);
});

test('visibility checks expire a background session without renewing it', () => {
  const s = setup();
  s.advance(120000, false);
  s.document.dispatch('visibilitychange');
  assert.equal(s.expired, 1);
});

test('other tab activity extends the session and logout ends it', () => {
  const s = setup();
  s.advance(100000);
  s.api.beginCashSession();
  s.window.dispatch('storage', { storageArea: s.storage, key: 'enako_cash_last_activity', newValue: '1100000' });
  s.advance(30000);
  assert.equal(s.expired, 0);
  s.window.dispatch('storage', { storageArea: s.storage, key: 'enako_cash_last_activity', newValue: null });
  assert.equal(s.expired, 1);
});

test('cleanup removes listeners and pending expiration', () => {
  const s = setup();
  s.stop();
  s.advance(150000);
  s.window.dispatch('pointerdown');
  assert.equal(s.expired, 0);
  assert.equal(s.timers.size, 0);
});
