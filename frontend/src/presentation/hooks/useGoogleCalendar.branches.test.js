import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGoogleCalendar } from './useGoogleCalendar';

const res = (status, body = {}) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('alert', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const setup = (fetchImpl, over = {}) => {
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  const deps = { getSessionToken: () => 'tok', getApiUrl: (p) => `https://api.test${p}`, setSuccessMessage: vi.fn(), ...over };
  return { deps, hook: renderHook(() => useGoogleCalendar(deps)) };
};

describe('useGoogleCalendar', () => {
  it('reads the connection status, including failures', async () => {
    const ok = setup(async () => res(200, { connected: true }));
    let connected;
    await act(async () => {
      connected = await ok.hook.result.current.loadCalendarStatus('tok');
    });
    expect(connected).toBe(true);
    expect(ok.hook.result.current.isCalendarConnected).toBe(true);

    const bad = setup(async () => res(500));
    await act(async () => {
      connected = await bad.hook.result.current.loadCalendarStatus('tok');
    });
    expect(connected).toBe(false);

    const down = setup(async () => {
      throw new Error('offline');
    });
    await act(async () => {
      connected = await down.hook.result.current.loadCalendarStatus('tok');
    });
    expect(connected).toBe(false);
  });

  it('loads events and tolerates a missing items list', async () => {
    const { hook } = setup(async () => res(200, { items: [{ id: 1 }] }));
    await act(async () => {
      await hook.result.current.loadCalendarEvents('tok');
    });
    expect(hook.result.current.calendarEvents).toEqual([{ id: 1 }]);

    const empty = setup(async () => res(200, {}));
    await act(async () => {
      await empty.hook.result.current.loadCalendarEvents('tok');
    });
    expect(empty.hook.result.current.calendarEvents).toEqual([]);
  });

  it('marks the calendar disconnected on 403 and ignores other statuses and errors', async () => {
    const forbidden = setup(async () => res(403));
    await act(async () => {
      await forbidden.hook.result.current.loadCalendarStatus; // no-op reference
      await forbidden.hook.result.current.loadCalendarEvents('tok');
    });
    expect(forbidden.hook.result.current.isCalendarConnected).toBe(false);
    expect(forbidden.hook.result.current.calendarLoading).toBe(false);

    const other = setup(async () => res(500));
    await act(async () => {
      await other.hook.result.current.loadCalendarEvents('tok');
    });
    expect(other.hook.result.current.calendarEvents).toEqual([]);

    const down = setup(async () => {
      throw new Error('offline');
    });
    await act(async () => {
      await down.hook.result.current.loadCalendarEvents('tok');
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('redirects to Google when connecting', async () => {
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { href: 'http://app/' } });
    const { hook } = setup(async () => res(200, { authUrl: 'https://accounts.google.com/x' }));
    await act(async () => {
      await hook.result.current.handleConnectCalendar();
    });
    expect(window.location.href).toBe('https://accounts.google.com/x');
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  it('does not redirect without an auth url, token or on failure', async () => {
    const noUrl = setup(async () => res(200, {}));
    await act(async () => {
      await noUrl.hook.result.current.handleConnectCalendar();
    });
    const rejected = setup(async () => res(500));
    await act(async () => {
      await rejected.hook.result.current.handleConnectCalendar();
    });
    const noToken = setup(async () => res(200), { getSessionToken: () => null });
    await act(async () => {
      await noToken.hook.result.current.handleConnectCalendar();
      await noToken.hook.result.current.handleDisconnectCalendar();
    });
    expect(fetch).not.toHaveBeenCalled();

    const down = setup(async () => {
      throw new Error('offline');
    });
    await act(async () => {
      await down.hook.result.current.handleConnectCalendar();
    });
    expect(alert).toHaveBeenCalled();
  });

  it('disconnects after confirmation', async () => {
    const { deps, hook } = setup(async () => res(200));
    await act(async () => {
      await hook.result.current.handleDisconnectCalendar();
    });
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
    expect(deps.setSuccessMessage).toHaveBeenCalled();
    expect(hook.result.current.isCalendarConnected).toBe(false);
  });

  it('does not disconnect when cancelled, rejected, or offline', async () => {
    const cancelled = setup(async () => res(200));
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    await act(async () => {
      await cancelled.hook.result.current.handleDisconnectCalendar();
    });
    expect(fetch).not.toHaveBeenCalled();

    const rejected = setup(async () => res(500));
    await act(async () => {
      await rejected.hook.result.current.handleDisconnectCalendar();
    });
    expect(rejected.deps.setSuccessMessage).not.toHaveBeenCalled();

    const down = setup(async () => {
      throw new Error('offline');
    });
    await act(async () => {
      await down.hook.result.current.handleDisconnectCalendar();
    });
    expect(alert).toHaveBeenCalled();
  });
});
