import { useCallback, useEffect, useRef, useState } from 'react';

// Route name <-> URL path. Unknown paths fall back to the landing route.
export const ROUTE_PATHS = {
  landing: '/',
  auth: '/auth',
  dashboard: '/dashboard',
  profile: '/profile',
};

export function routeFromPath(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const match = Object.entries(ROUTE_PATHS).find(([, path]) => path === clean);
  return match ? match[0] : 'landing';
}

// Moving into the dashboard from landing/auth is an automatic redirect after
// sign-in, so it replaces the entry instead of leaving a page Back can't use.
const REPLACE_INTO_DASHBOARD = new Set(['landing', 'auth']);

/**
 * Drop-in replacement for useState('landing') that keeps the route in the URL,
 * so deep links and the browser Back/Forward buttons work without a router library.
 */
export function useHistoryRoute() {
  const [route, setRouteState] = useState(() => routeFromPath(window.location.pathname));
  const routeRef = useRef(route);

  const apply = useCallback((next) => {
    routeRef.current = next;
    setRouteState(next);
  }, []);

  useEffect(() => {
    const onPopState = () => apply(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [apply]);

  const setRoute = useCallback((next) => {
    const prev = routeRef.current;
    const target = typeof next === 'function' ? next(prev) : next;
    const path = ROUTE_PATHS[target] ?? ROUTE_PATHS.landing;
    if (window.location.pathname !== path) {
      const replace = target === 'dashboard' && REPLACE_INTO_DASHBOARD.has(prev);
      window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
    }
    apply(target);
  }, [apply]);

  return [route, setRoute];
}
