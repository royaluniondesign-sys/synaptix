// Headless dogfood check for the Termora web UI / headless render path.
//
// Three layers, always safe to run (never requests a token, never prints one):
//   1. Static contract checks against the render/gate source (always).
//   2. Live HTML shell check against a reachable web server (server up only).
//   3. Authenticated render check via /api/cockpit/status — only when the
//      TERMORA_TOKEN env var is provided, exchanged for a JWT when needed, and redacted.
//
// Env:
//   TERMORA_WEB_URL  base URL of the running web build (default http://127.0.0.1:4031)
//   TERMORA_TOKEN    bootstrap or JWT token used only for the authenticated live check
//
// Skips (does not fail) live layers that have no server or no token; fails on
// any broken contract when the layer is exercised.

import { existsSync, readFileSync } from 'node:fs';

const BASE_URL = process.env.TERMORA_WEB_URL ?? 'http://127.0.0.1:4031';
const TOKEN = process.env.TERMORA_TOKEN ?? null;
const REDACTED = TOKEN ? '[REDACTED]' : null;
const looksLikeJwt = (token) => token.split('.').length === 3;

const authHeaderValue = async () => {
  if (!TOKEN) return null;
  if (looksLikeJwt(TOKEN)) return `Bearer ${TOKEN}`;
  const res = await fetch(BASE_URL + '/api/auth/bootstrap', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: TOKEN }),
  });
  if (!res.ok) throw new Error(`bootstrap exchange failed with HTTP ${res.status} (token ${REDACTED})`);
  const data = await res.json();
  if (!data || typeof data.token !== 'string' || data.token.length === 0) {
    throw new Error(`bootstrap exchange did not return a JWT (token ${REDACTED})`);
  }
  return `Bearer ${data.token}`;
};

const failures = [];
const ok = (msg) => console.log(`  ok  ${msg}`);
const bad = (msg) => { failures.push(msg); console.error(`  FAIL ${msg}`); };

const read = (rel) => {
  const abs = new URL(`../${rel}`, import.meta.url).pathname;
  if (!existsSync(abs)) { bad(`missing source: ${rel}`); return ''; }
  return readFileSync(abs, 'utf8');
};

const indexHtml = read('packages/web/index.html');
if (indexHtml) {
  if (indexHtml.includes('<div id="root">')) ok('index.html mounts <div id="root">');
  else bad('index.html does not mount <div id="root">');
  if (indexHtml.includes('src="/src/main.tsx"')) ok('index.html boots /src/main.tsx');
  else bad('index.html does not reference /src/main.tsx');
}

const appModel = read('packages/web/src/lib/app-model.ts');
if (appModel) {
  if (appModel.includes('export function resolveAppSurface')) ok('app-model exposes resolveAppSurface');
  else bad('app-model missing resolveAppSurface');
  if (appModel.includes("kind: 'auth'")) ok('app-model has deterministic auth surface');
  else bad('app-model missing auth surface kind');
  if (/badgeLabel/.test(appModel)) ok('app-model derives badge labels');
  else bad('app-model missing badgeLabel');
}

const appTsx = read('packages/web/src/App.tsx');
if (appTsx) {
  if (appTsx.includes("surface.kind === 'auth'")) ok('App gates on auth surface');
  else bad('App does not gate on auth surface');
  if (/<AuthScreen/.test(appTsx)) ok('App renders AuthScreen for no-token visits');
  else bad('App does not render AuthScreen');
  if (/resolveAppSurface\(/.test(appTsx)) ok('App resolves surface from app-model');
  else bad('App does not call resolveAppSurface');
}

const authScreen = read('packages/web/src/components/AuthScreen.tsx');
if (authScreen) {
  if (authScreen.includes('onBootstrapSubmit')) ok('AuthScreen accepts bootstrap submit');
  else bad('AuthScreen missing onBootstrapSubmit');
  if (authScreen.includes('Bootstrap Token')) ok('AuthScreen labels the token field');
  else bad('AuthScreen missing Bootstrap Token label');
}

const useAuth = read('packages/web/src/hooks/useAuth.ts');
if (useAuth) {
  if (useAuth.includes("'termora_jwt'")) ok('useAuth persists JWT under termora_jwt');
  else bad('useAuth JWT storage key drift');
  if (/searchParams/.test(useAuth)) ok('useAuth accepts ?token= bootstrap');
  else bad('useAuth token param drift');
  if (/handleUnauthorized/.test(useAuth)) ok('useAuth exposes unauthorized handler');
  else bad('useAuth handleUnauthorized drift');
}

console.log(`\nheadless render contract: ${failures.length ? 'FAIL' : 'ok'}\n`);

const probe = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(BASE_URL + '/', { signal: controller.signal });
    const body = await res.text();
    if (!res.ok) return { kind: 'error', message: `GET / → HTTP ${res.status}` };
    if (!body.includes('<div id="root">')) return { kind: 'error', message: 'GET / did not serve the #root mount' };
    return { kind: 'ok' };
  } catch {
    return { kind: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
};

const probeResult = await probe();
if (probeResult.kind === 'unreachable') {
  console.log(`live web server not reachable at ${BASE_URL} — skipping live HTML/auth checks`);
} else if (probeResult.kind === 'error') {
  bad(probeResult.message);
} else {
  ok(`GET ${BASE_URL}/ serves the headless HTML shell`);

  if (!TOKEN) {
    console.log('TERMORA_TOKEN not set — skipped authenticated render check (no credentials requested)');
  } else {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const authorization = await authHeaderValue();
      const res = await fetch(BASE_URL + '/api/cockpit/status', {
        headers: { Authorization: authorization },
        signal: controller.signal,
      });
      if (!res.ok) {
        bad(`authenticated GET /api/cockpit/status → HTTP ${res.status} (token ${REDACTED})`);
      } else {
        const status = await res.json();
        if (status && typeof status === 'object' && 'git' in status && ('root' in status || 'machine' in status)) {
          ok(`authenticated status exposes git + root/machine (token ${REDACTED})`);
        } else {
          bad(`authenticated status missing expected git/root keys (token ${REDACTED})`);
        }
      }
    } catch (error) {
      bad(`authenticated status request failed: ${error?.message ?? error}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

if (failures.length) {
  console.error(`\ncheck-web-headless: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('check-web-headless ok');
