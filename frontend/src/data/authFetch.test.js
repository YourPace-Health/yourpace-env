// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthFetch } from './authFetch';

const BASE = 'https://api.test/api';
const KEY = 'yourpace_session';

const json = (status, body) => new Response(JSON.stringify(body), { status });

function setSession(store, extra = {}) {
  store.setItem(KEY, JSON.stringify({ user: { id: 1 }, token: 'old', refreshToken: 'r1', ...extra }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('createAuthFetch', () => {
  it('passes successful responses through untouched', async () => {
    const base = vi.fn().mockResolvedValue(json(200, { ok: true }));
    const f = createAuthFetch(base, { apiBase: BASE });
    const res = await f(`${BASE}/dashboard/summary`, { headers: { Authorization: 'Bearer old' } });
    expect(res.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('refreshes on 401 and retries once with the new token', async () => {
    setSession(localStorage);
    const base = vi.fn(async (url, init) => {
      if (url === `${BASE}/auth/refresh`) return json(200, { accessToken: 'new', refreshToken: 'r2' });
      return new Headers(init.headers).get('Authorization') === 'Bearer new' ? json(200, { ok: 1 }) : json(401, {});
    });
    const f = createAuthFetch(base, { apiBase: BASE });

    const res = await f(`${BASE}/water/today`, { headers: { Authorization: 'Bearer old' } });

    expect(res.status).toBe(200);
    const saved = JSON.parse(localStorage.getItem(KEY));
    expect(saved.token).toBe('new');
    expect(saved.refreshToken).toBe('r2');
    expect(saved.user).toEqual({ id: 1 });
  });

  it('shares one refresh between concurrent 401s', async () => {
    setSession(sessionStorage);
    let refreshCalls = 0;
    const base = vi.fn(async (url, init) => {
      if (url === `${BASE}/auth/refresh`) {
        refreshCalls += 1;
        return json(200, { accessToken: 'new', refreshToken: 'r2' });
      }
      return new Headers(init.headers).get('Authorization') === 'Bearer new' ? json(200, {}) : json(401, {});
    });
    const f = createAuthFetch(base, { apiBase: BASE });
    const init = { headers: { Authorization: 'Bearer old' } };

    const results = await Promise.all([f(`${BASE}/a`, init), f(`${BASE}/b`, init), f(`${BASE}/c`, init)]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refreshCalls).toBe(1);
    expect(JSON.parse(sessionStorage.getItem(KEY)).token).toBe('new');
  });

  it('clears the session and reports expiry when refresh fails', async () => {
    setSession(localStorage);
    const base = vi.fn(async (url) => (url === `${BASE}/auth/refresh` ? json(401, {}) : json(401, {})));
    const onSessionExpired = vi.fn();
    const f = createAuthFetch(base, { apiBase: BASE, onSessionExpired });

    const res = await f(`${BASE}/water/today`, { headers: { Authorization: 'Bearer old' } });

    expect(res.status).toBe(401);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not try to refresh auth endpoints, other hosts, or calls without a token', async () => {
    setSession(localStorage);
    const base = vi.fn().mockResolvedValue(json(401, {}));
    const f = createAuthFetch(base, { apiBase: BASE });

    await f(`${BASE}/auth/login`, { headers: { Authorization: 'Bearer old' } });
    await f('https://other.example/x', { headers: { Authorization: 'Bearer old' } });
    await f(`${BASE}/water/today`);

    expect(base).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('gives up without a stored refresh token', async () => {
    setSession(localStorage, { refreshToken: undefined });
    const base = vi.fn().mockResolvedValue(json(401, {}));
    const onSessionExpired = vi.fn();
    const f = createAuthFetch(base, { apiBase: BASE, onSessionExpired });

    await f(`${BASE}/water/today`, { headers: { Authorization: 'Bearer old' } });

    expect(onSessionExpired).toHaveBeenCalled();
    expect(base).toHaveBeenCalledTimes(1);
  });
});
