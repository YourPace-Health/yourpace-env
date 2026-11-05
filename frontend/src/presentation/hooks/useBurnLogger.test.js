// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBurnLogger } from './useBurnLogger';

afterEach(() => vi.unstubAllGlobals());

const res = (status, body) => new Response(JSON.stringify(body), { status });

const setup = (fetchImpl = async () => res(200, {}), over = {}) => {
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
  vi.stubGlobal('alert', vi.fn());
  const deps = {
    getSessionToken: () => 'tok',
    getApiUrl: (p) => `https://api.test${p}`,
    getIsCalendarConnected: () => false,
    setSuccessMessage: vi.fn(),
    setWorkoutTab: vi.fn(),
    loadUserData: vi.fn().mockResolvedValue(undefined),
    loadCalendarEvents: vi.fn(),
    ...over
  };
  return { deps, hook: renderHook(() => useBurnLogger(deps)) };
};

describe('useBurnLogger calculations', () => {
  it('computes the end time from start and duration, including wrap past midnight', () => {
    const { hook } = setup();
    const { calculateEndTimeString } = hook.result.current;
    expect(calculateEndTimeString('18:00', 30)).toBe('18:30');
    expect(calculateEndTimeString('23:45', 30)).toBe('00:15');
    expect(calculateEndTimeString('', 30)).toBe('');
  });

  it('estimates calories from preset burn rate, duration and intensity', () => {
    const { hook } = setup();
    const running = hook.result.current.workoutPresets.find((p) => p.id === 'running'); // 8.5 kcal/min
    act(() => hook.result.current.handleSelectPreset(running));
    // 30 min default * 8.5 * 1.0 (MODERATE)
    expect(hook.result.current.burnForm.burnedCalories).toBe(255);
    expect(hook.result.current.burnForm.title).toBe(running.title);

    act(() => hook.result.current.handleBurnIntensityChange('INTENSE'));
    expect(hook.result.current.burnForm.burnedCalories).toBe(Math.round(30 * 8.5 * 1.25));

    act(() => hook.result.current.handleBurnDurationChange('60'));
    expect(hook.result.current.burnForm.burnedCalories).toBe(Math.round(60 * 8.5 * 1.25));
  });

  it('leaves calories empty for the custom "other" activity', () => {
    const { hook } = setup();
    const other = hook.result.current.workoutPresets.find((p) => p.id === 'other');
    act(() => hook.result.current.handleSelectPreset(other));
    expect(hook.result.current.burnForm.burnedCalories).toBe('');
    expect(hook.result.current.burnForm.selectedPresetId).toBe('other');
  });
});

describe('useBurnLogger AI estimate', () => {
  it('stores all three levels and applies the current intensity', async () => {
    const { hook } = setup(async () =>
      res(200, {
        light: { calories: 100.4, description: 'easy' },
        moderate: { calories: 200, description: 'mid' },
        intense: { calories: 300, description: 'hard' },
        explanation: 'why'
      })
    );
    await act(async () => {
      await hook.result.current.handleCalculateBurnWithN8N();
    });
    expect(hook.result.current.aiIntensityMap.LIGHT.calories).toBe(100);
    expect(hook.result.current.burnForm.burnedCalories).toBe(200);
    expect(hook.result.current.aiBurnExplanation).toBe('why');

    // switching intensity now uses the AI numbers instead of the preset formula
    act(() => hook.result.current.handleBurnIntensityChange('INTENSE'));
    expect(hook.result.current.burnForm.burnedCalories).toBe(300);
    expect(hook.result.current.isCalculatingAiBurn).toBe(false);
  });

  it('alerts the server error', async () => {
    const { hook } = setup(async () => res(500, { error: 'no ai' }));
    await act(async () => {
      await hook.result.current.handleCalculateBurnWithN8N();
    });
    expect(alert).toHaveBeenCalledWith('no ai');
  });
});

describe('useBurnLogger save', () => {
  it('posts the log, closes the modal, switches tab and refreshes', async () => {
    const { deps, hook } = setup(async () => res(201, {}));
    act(() => hook.result.current.setShowLogBurnModal(true));
    await act(async () => {
      await hook.result.current.handleSaveBurnLog({ preventDefault: vi.fn() });
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.test/schedules/log-burn');
    expect(JSON.parse(init.body)).toMatchObject({ durationMinutes: 30, burnedCalories: 255, targetIntensity: 'MODERATE' });
    expect(hook.result.current.showLogBurnModal).toBe(false);
    expect(deps.setWorkoutTab).toHaveBeenCalledWith('history');
    expect(deps.loadUserData).toHaveBeenCalled();
    expect(deps.loadCalendarEvents).not.toHaveBeenCalled();
    expect(hook.result.current.isSavingBurnLog).toBe(false);
  });

  it('also refreshes calendar events when the calendar is connected', async () => {
    const { deps, hook } = setup(async () => res(201, {}), { getIsCalendarConnected: () => true });
    await act(async () => {
      await hook.result.current.handleSaveBurnLog({ preventDefault: vi.fn() });
    });
    expect(deps.loadCalendarEvents).toHaveBeenCalledWith('tok');
  });

  it('keeps the modal open when saving fails', async () => {
    const { hook } = setup(async () => res(400, { error: 'bad' }));
    act(() => hook.result.current.setShowLogBurnModal(true));
    await act(async () => {
      await hook.result.current.handleSaveBurnLog({ preventDefault: vi.fn() });
    });
    expect(alert).toHaveBeenCalledWith('bad');
    expect(hook.result.current.showLogBurnModal).toBe(true);
  });
});
