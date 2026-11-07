// Deployed as a route on this application's existing Access-protected hostname.
// No credentials, account grants or application data are stored in this Worker.
const SITE_ORIGIN = "https://enakootc.com";
const APPLICATION = "cash";
const BACKEND_ORIGIN = 'https://backend-iw61.onrender.com';
const CASH_ROUTES = new Set(['cash-auth', 'cash-collections', 'cash-transactions', 'cash-kyc']);

function failure(status, message) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export default {
  async fetch(request, _env, ctx) {
    const url = new URL(request.url);
    if (url.origin !== SITE_ORIGIN) return failure(404, 'Not found');
    let path;
    try { path = decodeURIComponent(url.pathname).toLowerCase(); }
    catch { return failure(400, 'Invalid request path'); }
    // Refuse ambiguous routing rather than forwarding encoded separators or a second encoding.
    if (/%2f|%5c/i.test(url.pathname) || /[%\\\\]/.test(path) || path.includes('//') || path.split('/').some(part => part === '.' || part === '..')) {
      return failure(400, 'Invalid request path');
    }
    const socket = path.startsWith('/socket.io/');
    const api = path.startsWith('/api/v1/');
    const moduleName = path.split('/')[3];
    if ((!api && !socket) || (socket && APPLICATION !== 'os') ||
        (api && (APPLICATION === 'cash' ? !CASH_ROUTES.has(moduleName) : moduleName.startsWith('cash-')))) {
      return failure(404, 'Not found');
    }
    // Access must authenticate this invocation, not just a client-supplied header.
    // NestJS independently verifies the signature, issuer, expiry and OS/Cash audience.
    const assertion = request.headers.get('cf-access-jwt-assertion');
    if (!ctx?.access || !assertion || assertion.length > 16384) return failure(401, 'Secure sign-in required. Reload this page.');
    const origin = request.headers.get('origin');
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if ((origin && origin !== SITE_ORIGIN) || ((unsafe || socket) && origin !== SITE_ORIGIN)) {
      return failure(403, 'Origin rejected');
    }
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(request.method)) return failure(405, 'Method not allowed');
    const upgrade = request.headers.get('upgrade');
    if (socket && (request.method !== 'GET' || upgrade?.toLowerCase() !== 'websocket')) return failure(400, 'WebSocket upgrade required');
    if (!socket && upgrade) return failure(400, 'Invalid upgrade');
    // A fixed destination prevents an open proxy. Never forward website cookies,
    // service secrets, client IP/host overrides, or client-supplied redirect targets.
    const headers = new Headers();
    for (const name of ['authorization', 'content-type', 'accept', 'origin', 'idempotency-key', 'x-payment-status-token', 'range', 'sec-websocket-protocol']) {
      const value = request.headers.get(name);
      if (value !== null) headers.set(name, value);
    }
    headers.set('cf-access-jwt-assertion', assertion);
    if (socket) headers.set('upgrade', 'websocket');
    const target = new URL(url.pathname + url.search, BACKEND_ORIGIN);
    try {
      const upstreamRequest = new Request(target, request);
      const response = await fetch(new Request(upstreamRequest, { headers, redirect: 'manual' }));
      if (socket && response.status === 101) return response;
      // Do not follow a redirect with the user's credentials.
      if (response.status >= 300 && response.status < 400) return failure(502, 'Service unavailable');
      const responseHeaders = new Headers(response.headers);
      for (const name of ['set-cookie', 'cf-access-jwt-assertion', 'access-control-allow-origin', 'access-control-allow-credentials']) responseHeaders.delete(name);
      responseHeaders.set('Cache-Control', 'private, no-store');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
    } catch {
      return failure(502, 'Service unavailable');
    }
  },
};
