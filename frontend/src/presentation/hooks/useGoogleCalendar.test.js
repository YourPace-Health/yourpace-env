// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGoogleCalendar } from './useGoogleCalendar';

afterEach(() => vi.unstubAllGlobals());

const res = (status, body) => new Response(JSON.stringify(body), { status });

const setup = (fetchImpl) => {
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
  vi.stubGlobal('alert', vi.fn());
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  const deps = { getSessionToken: () => 'tok', getApiUrl: (p) => `https://api.test${p}`, setSuccessMessage: vi.fn() };
  return { deps, hook: renderHook(() => useGoogleCalendar(deps)) };
};

describe('useGoogleCalendar', () => {
  it('reports the connection status and returns it', async () => {
    const { hook } = setup(async () => res(200, { connected: true }));
    let connected;
    await act(async () => {
      connected = await hook.result.current.loadCalendarStatus('tok');
    });
    expect(connected).toBe(true);
    expect(hook.result.current.isCalendarConnected).toBe(true);
  });

  it('treats a failed status call as not connected', async () => {
    const { hook } = setup(async () => {
      throw new Error('offline');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let connected;
    await act(async () => {
      connected = await hook.result.current.loadCalendarStatus('tok');
    });
    expect(connected).toBe(false);
  });

  it('loads events and clears the loading flag', async () => {
    const { hook } = setup(async () => res(200, { items: [{ id: 'e1' }] }));
    await act(async () => {
      await hook.result.current.loadCalendarEvents('tok');
    });
    expect(hook.result.current.calendarEvents).toEqual([{ id: 'e1' }]);
    expect(hook.result.current.calendarLoading).toBe(false);
  });

  it('marks the calendar disconnected when the token was revoked (403)', async () => {
    const { hook } = setup(async (url) => (url.endsWith('/calendar/status') ? res(200, { connected: true }) : res(403, {})));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await act(async () => {
      await hook.result.current.loadCalendarStatus('tok');
      await hook.result.current.loadCalendarEvents('tok');
    });
    expect(hook.result.current.isCalendarConnected).toBe(false);
    expect(hook.result.current.calendarEvents).toEqual([]);
  });

  it('disconnects after confirmation and tells the user', async () => {
    const { deps, hook } = setup(async (url, init) => {
      if (init?.method === 'DELETE') return res(200, {});
      return res(200, { connected: true });
    });
    await act(async () => {
      await hook.result.current.loadCalendarStatus('tok');
    });
    await act(async () => {
      await hook.result.current.handleDisconnectCalendar();
    });
    expect(fetch.mock.calls.at(-1)[0]).toBe('https://api.test/calendar');
    expect(hook.result.current.isCalendarConnected).toBe(false);
    expect(deps.setSuccessMessage).toHaveBeenCalled();
  });

  it('does nothing when the user cancels the disconnect confirmation', async () => {
    const { hook } = setup(async () => res(200, {}));
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    await act(async () => {
      await hook.result.current.handleDisconnectCalendar();
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
