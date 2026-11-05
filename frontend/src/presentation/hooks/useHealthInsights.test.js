// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHealthInsights } from './useHealthInsights';

afterEach(() => vi.unstubAllGlobals());

const jsonResponse = (status, body) => new Response(JSON.stringify(body), { status });

const setup = (fetchImpl) => {
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
  vi.stubGlobal('alert', vi.fn());
  const deps = {
    getSessionToken: () => 'tok',
    setSuccessMessage: vi.fn(),
    getApiUrl: (p) => `https://api.test${p}`,
    loadUserData: vi.fn().mockResolvedValue(undefined),
    loadProgressAnalytics: vi.fn(),
    loadMilestones: vi.fn()
  };
  const hook = renderHook(() => useHealthInsights(deps));
  return { deps, hook };
};

describe('useHealthInsights: weight', () => {
  it('rejects an empty or non-positive weight without calling the API', async () => {
    const { hook } = setup(async () => jsonResponse(201, {}));
    await act(async () => {
      await hook.result.current.handleSaveWeight({ preventDefault: vi.fn() });
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();
  });

  it('posts the weight, closes the modal and refreshes dependent data', async () => {
    const { deps, hook } = setup(async () => jsonResponse(201, {}));
    act(() => {
      hook.result.current.setShowLogWeightModal(true);
      hook.result.current.setWeightForm({ weight: '70.5', bodyFatPercentage: '18', logDate: '2026-11-05', notes: 'n' });
    });
    await act(async () => {
      await hook.result.current.handleSaveWeight({ preventDefault: vi.fn() });
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.test/health/weight');
    expect(JSON.parse(init.body)).toEqual({ weight: 70.5, bodyFatPercentage: 18, logDate: '2026-11-05', notes: 'n' });
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(hook.result.current.showLogWeightModal).toBe(false);
    expect(deps.setSuccessMessage).toHaveBeenCalledWith(expect.stringContaining('70.5'));
    expect(deps.loadUserData).toHaveBeenCalled();
    expect(deps.loadProgressAnalytics).toHaveBeenCalledWith('tok');
    expect(deps.loadMilestones).toHaveBeenCalledWith('tok');
    expect(hook.result.current.isSavingWeight).toBe(false);
  });

  it('keeps the modal open and alerts the server error', async () => {
    const { hook } = setup(async () => jsonResponse(400, { error: 'bad weight' }));
    act(() => {
      hook.result.current.setShowLogWeightModal(true);
      hook.result.current.setWeightForm((f) => ({ ...f, weight: '70' }));
    });
    await act(async () => {
      await hook.result.current.handleSaveWeight({ preventDefault: vi.fn() });
    });
    expect(alert).toHaveBeenCalledWith('bad weight');
    expect(hook.result.current.showLogWeightModal).toBe(true);
    expect(hook.result.current.isSavingWeight).toBe(false);
  });
});

describe('useHealthInsights: weekly recap', () => {
  it('stores the recap returned by the API', async () => {
    const recap = { summary: 'good week' };
    const { hook } = setup(async () => jsonResponse(200, recap));
    await act(async () => {
      await hook.result.current.handleFetchWeeklyRecap();
    });
    expect(hook.result.current.weeklyRecapData).toEqual(recap);
    expect(hook.result.current.isRecapLoading).toBe(false);
  });

  it('alerts when the recap cannot be fetched', async () => {
    const { hook } = setup(async () => jsonResponse(500, {}));
    await act(async () => {
      await hook.result.current.handleFetchWeeklyRecap();
    });
    expect(alert).toHaveBeenCalled();
    expect(hook.result.current.weeklyRecapData).toBeNull();
  });
});
