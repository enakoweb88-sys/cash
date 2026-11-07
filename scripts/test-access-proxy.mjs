import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../edge/access-proxy.mjs';
import { readFileSync } from 'node:fs';

const app = "cash", origin = "https://enakootc.com";
const own = app === 'cash' ? '/api/v1/cash-collections' : '/api/v1/reports/daily';
const other = app === 'cash' ? '/api/v1/reports/daily' : '/api/v1/cash-collections';
const context = { access: {} }; // Only Cloudflare supplies this context in the deployed runtime.
const assertion = 'fixture-signed-assertion';
const request = (path = own, options = {}) => new Request(origin + path, {
  ...options, headers: { 'cf-access-jwt-assertion': assertion, ...options.headers },
});
async function withUpstream(handler, run) {
  const saved = globalThis.fetch;
  globalThis.fetch = handler;
  try { await run(); } finally { globalThis.fetch = saved; }
}

test(app + ': normal API request preserves its path, query, application token and signed assertion without forwarding cookies or host/IP overrides', async () => {
  await withUpstream(async outgoing => {
    assert.equal(new URL(outgoing.url).origin, 'https://backend-iw61.onrender.com');
    assert.equal(new URL(outgoing.url).pathname, own);
    assert.equal(new URL(outgoing.url).search, '?target=https://attacker.invalid&limit=10');
    assert.equal(outgoing.headers.get('authorization'), 'Bearer fixture-application-token');
    assert.equal(outgoing.headers.get('cf-access-jwt-assertion'), assertion);
    for (const key of ['cookie', 'cf-access-client-secret', 'x-forwarded-for', 'x-forwarded-host', 'host']) assert.equal(outgoing.headers.get(key), null);
    return new Response('fixture-document-bytes', { headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="fixture.pdf"', 'set-cookie': 'fixture=private', 'cf-access-jwt-assertion': assertion } });
  }, async () => {
    const response = await worker.fetch(request(own + '?target=https://attacker.invalid&limit=10', { headers: {
      authorization: 'Bearer fixture-application-token', cookie: 'CF_Authorization=fixture-private',
      'cf-access-client-secret': 'fixture-service-secret', 'x-forwarded-for': 'attacker', 'x-forwarded-host': 'attacker.invalid',
    } }), {}, context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.match(response.headers.get('content-disposition'), /fixture.pdf/);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('cf-access-jwt-assertion'), null);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(await response.text(), 'fixture-document-bytes');
  });
});

test(app + ': authentication requires Cloudflare context as well as the assertion; a supplied header alone cannot authenticate', async () => {
  await withUpstream(() => assert.fail('unauthenticated request reached backend'), async () => {
    assert.equal((await worker.fetch(request(), {}, {})).status, 401);
    assert.equal((await worker.fetch(new Request(origin + own), {}, context)).status, 401);
    assert.equal((await worker.fetch(request(own, { headers: { 'cf-access-jwt-assertion': 'x'.repeat(16385) } }), {}, context)).status, 401);
  });
});

test(app + ': rejects the other application, unrelated hosts, unowned paths and ambiguous encoded paths', async () => {
  await withUpstream(() => assert.fail('boundary violation reached backend'), async () => {
    for (const path of [other, other.toUpperCase(), '/api/v1/' + (app === 'cash' ? 'auth/login' : '%63ash-auth/login'), '/']) {
      assert.equal((await worker.fetch(request(path), {}, context)).status, 404, path);
    }
    assert.equal((await worker.fetch(new Request('https://attacker.invalid' + own), {}, context)).status, 404);
    for (const path of ['//attacker.invalid/api/v1/auth/login', own + '/%2fsecret', own + '/%5csecret', own + '/%252e%252e/secret', own + '/bad%zz']) assert.equal((await worker.fetch(request(path), {}, context)).status, 400, path);
  });
});

test(app + ': rejects cross-site requests, originless writes and non-API upgrades', async () => {
  await withUpstream(() => assert.fail('cross-site request reached backend'), async () => {
    for (const options of [{ headers: { origin: 'https://attacker.invalid' } }, { method: 'POST' }, { method: 'DELETE', headers: { origin: 'null' } }, { headers: { upgrade: 'websocket' } }]) {
      assert.ok([400, 403].includes((await worker.fetch(request(own, options), {}, context)).status));
    }
  });
});

test(app + ': streams JSON writes without changing their body or idempotency key', async () => {
  await withUpstream(async outgoing => {
    assert.equal(outgoing.method, 'POST');
    assert.equal(outgoing.headers.get('idempotency-key'), 'fixture-request-id');
    assert.equal(outgoing.headers.get('origin'), origin);
    assert.deepEqual(await outgoing.json(), { content: 'fixture-report' });
    return Response.json({ saved: true }, { status: 201 });
  }, async () => {
    const response = await worker.fetch(request(own, { method: 'POST', headers: { origin, 'content-type': 'application/json', 'idempotency-key': 'fixture-request-id' }, body: JSON.stringify({ content: 'fixture-report' }) }), {}, context);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { saved: true });
  });
});

test(app + ': streams multipart uploads with their original boundary and document bytes', async () => {
  const form = new FormData();
  form.append('description', 'fixture-upload');
  form.append('file', new Blob(['fixture-pdf-bytes'], { type: 'application/pdf' }), 'fixture.pdf');
  await withUpstream(async outgoing => {
    assert.match(outgoing.headers.get('content-type'), /^multipart\/form-data; boundary=/);
    const received = await outgoing.formData();
    assert.equal(received.get('description'), 'fixture-upload');
    assert.equal(received.get('file').name, 'fixture.pdf');
    assert.equal(await received.get('file').text(), 'fixture-pdf-bytes');
    return Response.json({ saved: true });
  }, async () => {
    assert.equal((await worker.fetch(request(own, { method: 'POST', headers: { origin }, body: form }), {}, context)).status, 200);
  });
});

test(app + ': preserves backend denials, conflict/rate-limit/unavailable statuses and never follows redirects', async () => {
  for (const status of [401, 403, 409, 429, 503]) {
    await withUpstream(async outgoing => {
      assert.equal(outgoing.redirect, 'manual');
      return Response.json({ message: 'fixture-denial' }, { status, headers: { 'retry-after': '10' } });
    }, async () => {
      const response = await worker.fetch(request(), {}, context);
      assert.equal(response.status, status);
      assert.equal(response.headers.get('retry-after'), '10');
    });
  }
  await withUpstream(async () => Response.redirect('https://attacker.invalid', 302), async () => {
    const response = await worker.fetch(request(), {}, context);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('location'), null);
  });
});

test(app + ': upstream failure exposes no infrastructure error or credentials', async () => {
  await withUpstream(async () => { throw Error('fixture-private-upstream-error'); }, async () => {
    const response = await worker.fetch(request(), {}, context);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { message: 'Service unavailable' });
  });
});

test(app + ': socket traffic stays OS-only, requires its origin, and returns the upgrade without buffering', async () => {
  const path = '/socket.io/?EIO=4&transport=websocket';
  if (app === 'cash') {
    await withUpstream(() => assert.fail('Cash must not proxy OS chat'), async () => {
      assert.equal((await worker.fetch(request(path, { headers: { origin, upgrade: 'websocket' } }), {}, context)).status, 404);
    });
    return;
  }
  const upgraded = { status: 101, webSocket: { fixture: true } };
  await withUpstream(async outgoing => {
    assert.equal(outgoing.headers.get('upgrade'), 'websocket');
    assert.equal(outgoing.headers.get('cf-access-jwt-assertion'), assertion);
    assert.equal(new URL(outgoing.url).pathname, '/socket.io/');
    return upgraded;
  }, async () => {
    assert.equal(await worker.fetch(request(path, { headers: { origin, upgrade: 'websocket' } }), {}, context), upgraded);
  });
  await withUpstream(() => assert.fail('invalid socket request reached backend'), async () => {
    assert.equal((await worker.fetch(request(path), {}, context)).status, 403);
    assert.equal((await worker.fetch(request(path, { headers: { origin } }), {}, context)).status, 400);
  });
});

test(app + ': route configuration keeps workers.dev and preview URLs disabled and stays on its own hostname', () => {
  const config = JSON.parse(readFileSync(new URL('../edge/wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.ok(config.routes.every(route => route.pattern.startsWith(origin + '/')));
  assert.equal(config.routes.length, app === 'os' ? 2 : 1);
});
