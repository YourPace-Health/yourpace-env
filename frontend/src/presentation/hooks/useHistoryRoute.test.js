// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistoryRoute, routeFromPath } from './useHistoryRoute';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('routeFromPath', () => {
  it('maps known paths and falls back to landing', () => {
    expect(routeFromPath('/')).toBe('landing');
    expect(routeFromPath('/auth')).toBe('auth');
    expect(routeFromPath('/dashboard/')).toBe('dashboard');
    expect(routeFromPath('/profile')).toBe('profile');
    expect(routeFromPath('/nope')).toBe('landing');
  });
});

describe('useHistoryRoute', () => {
  it('starts from the current URL (deep link)', () => {
    window.history.replaceState({}, '', '/profile');
    const { result } = renderHook(() => useHistoryRoute());
    expect(result.current[0]).toBe('profile');
  });

  it('pushes the new path when the route changes', () => {
    const { result } = renderHook(() => useHistoryRoute());
    act(() => result.current[1]('auth'));
    expect(result.current[0]).toBe('auth');
    expect(window.location.pathname).toBe('/auth');
  });

  it('follows browser Back/Forward', () => {
    const { result } = renderHook(() => useHistoryRoute());
    act(() => result.current[1]('auth'));
    act(() => result.current[1]('profile'));
    act(() => {
      window.history.back();
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toBe(routeFromPath(window.location.pathname));
  });

  it('replaces instead of pushing when redirecting into the dashboard after auth', () => {
    const { result } = renderHook(() => useHistoryRoute());
    act(() => result.current[1]('auth'));
    const before = window.history.length;
    act(() => result.current[1]('dashboard'));
    expect(window.location.pathname).toBe('/dashboard');
    expect(window.history.length).toBe(before);
  });

  it('keeps the query string out of the path comparison and accepts updater functions', () => {
    window.history.replaceState({}, '', '/?magic-token=abc');
    const { result } = renderHook(() => useHistoryRoute());
    expect(result.current[0]).toBe('landing');
    act(() => result.current[1]((prev) => (prev === 'landing' ? 'auth' : prev)));
    expect(result.current[0]).toBe('auth');
  });
});
