import { API_BASE_URL } from '../config/api';

const STORAGE_KEY = 'yourpace_session';

// The session lives in localStorage ("stay signed in") or sessionStorage.
function findSession() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (raw) return { store, session: JSON.parse(raw) };
    } catch {
      // unreadable storage entry: treat as signed out
    }
  }
  return null;
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

function bearerOf(init) {
  const headers = new Headers(init?.headers);
  const auth = headers.get('Authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

/**
 * Wraps fetch so an API call that fails with 401 because the access token expired
 * is retried once after exchanging the stored refresh token for a new pair.
 * If the refresh fails the session is cleared and onSessionExpired runs.
 */
export function createAuthFetch(baseFetch, { apiBase = API_BASE_URL, onSessionExpired = () => {} } = {}) {
  let refreshing = null;

  const refresh = () => {
    if (!refreshing) {
      refreshing = (async () => {
        const found = findSession();
        if (!found?.session.refreshToken) return null;
        try {
          const res = await baseFetch(`${apiBase}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: found.session.refreshToken }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          const updated = { ...found.session, token: data.accessToken, refreshToken: data.refreshToken };
          found.store.setItem(STORAGE_KEY, JSON.stringify(updated));
          return data.accessToken;
        } catch {
          return null;
        }
      })().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  };

  return async function authFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    const response = await baseFetch(input, init);

    const isApiCall = typeof url === 'string' && url.startsWith(apiBase) && !url.startsWith(`${apiBase}/auth/`);
    if (response.status !== 401 || !isApiCall || !bearerOf(init)) return response;

    const newToken = await refresh();
    if (!newToken) {
      clearSession();
      onSessionExpired();
      return response;
    }

    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${newToken}`);
    return baseFetch(input, { ...init, headers });
  };
}

export function installAuthRefresh() {
  window.fetch = createAuthFetch(window.fetch.bind(window), {
    onSessionExpired: () => window.location.reload(),
  });
}
