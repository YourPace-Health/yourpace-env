// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkoutPlans, TARGET_STEPS } from './useWorkoutPlans';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const res = (status, body = {}) => new Response(JSON.stringify(body), { status });

const setup = (fetchImpl = async () => res(200, {}), over = {}) => {
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  const deps = {
    getSessionToken: () => 'tok',
    getApiUrl: (p) => `https://api.test${p}`,
    getCalendarEvents: () => [{ id: 'ev1' }],
    loadCalendarEvents: vi.fn(),
    loadUserData: vi.fn().mockResolvedValue(undefined),
    setChatLog: vi.fn(),
    setIsChatOpen: vi.fn(),
    setError: vi.fn(),
    setSuccessMessage: vi.fn(),
    ...over
  };
  return { deps, hook: renderHook(() => useWorkoutPlans(deps)) };
};

describe('useWorkoutPlans cardio target', () => {
  it('exposes the target distance derived from the step goal', () => {
    const { hook } = setup();
    expect(hook.result.current.targetSteps).toBe(TARGET_STEPS);
    expect(hook.result.current.targetDistanceKm).toBe('6.0');
  });

  it('logs the cardio goal as a workout and refreshes data', async () => {
    const { deps, hook } = setup();
    await act(async () => {
      await hook.result.current.handleToggleCardioTarget();
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.test/schedules/log-burn');
    expect(JSON.parse(init.body)).toMatchObject({ durationMinutes: 60, burnedCalories: 320 });
    expect(hook.result.current.cardioSteps).toBe(TARGET_STEPS);
    expect(deps.loadUserData).toHaveBeenCalled();
  });

  it('does not log the goal twice when today\'s one already exists', async () => {
    const { deps, hook } = setup();
    act(() => hook.result.current.setWorkoutSchedules([{ scheduleId: 's1', status: 'COMPLETED', title: '🏃 เดิน/วิ่งตามเป้าหมายคาร์ดิโอ' }]));
    await act(async () => {
      await hook.result.current.handleToggleCardioTarget();
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(deps.setSuccessMessage).toHaveBeenCalled();
    expect(hook.result.current.cardioSteps).toBe(TARGET_STEPS);
  });

  it('un-completing the goal deletes its workout', async () => {
    const { deps, hook } = setup();
    act(() => {
      hook.result.current.setWorkoutSchedules([{ scheduleId: 's1', status: 'COMPLETED', title: '🏃 เดิน/วิ่งตามเป้าหมายคาร์ดิโอ' }]);
      hook.result.current.setCardioSteps(TARGET_STEPS);
    });
    await act(async () => {
      await hook.result.current.handleToggleCardioTarget();
    });
    expect(fetch.mock.calls[0][0]).toBe('https://api.test/schedules/s1');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
    expect(hook.result.current.cardioSteps).toBe(0);
    expect(hook.result.current.workoutSchedules).toEqual([]);
    expect(deps.loadUserData).toHaveBeenCalled();
  });
});

describe('useWorkoutPlans n8n planning', () => {
  it('sends the calendar and note, adds the exchange to the chat and refreshes', async () => {
    const { deps, hook } = setup(async () => res(200, { response: 'plan ready' }));
    act(() => {
      hook.result.current.setShowN8nPlanModal(true);
      hook.result.current.setN8nCustomNote('no jumping');
      hook.result.current.setN8nDaysCount(5);
    });
    await act(async () => {
      await hook.result.current.handlePlanFreeTimeWithN8N({ preventDefault: vi.fn() });
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.test/mentor/n8n-plan');
    expect(JSON.parse(init.body)).toEqual({ calendarEvents: [{ id: 'ev1' }], userNote: 'no jumping', daysCount: 5 });

    const updater = deps.setChatLog.mock.calls[0][0];
    const log = updater([{ sender: 'ai', text: 'hi' }]);
    expect(log).toHaveLength(3);
    expect(log[2]).toMatchObject({ sender: 'ai', text: 'plan ready' });
    expect(deps.setIsChatOpen).toHaveBeenCalledWith(true);
    expect(hook.result.current.showN8nPlanModal).toBe(false);
    expect(deps.loadUserData).toHaveBeenCalled();
    expect(hook.result.current.isN8nPlanning).toBe(false);
  });

  it('lets callers override the note and number of days', async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.handlePlanFreeTimeWithN8N(null, 'quick', 2);
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ userNote: 'quick', daysCount: 2 });
  });

  it('reports the server error and keeps the modal open', async () => {
    const { deps, hook } = setup(async () => res(500, { error: 'n8n down' }));
    act(() => hook.result.current.setShowN8nPlanModal(true));
    await act(async () => {
      await hook.result.current.handlePlanFreeTimeWithN8N(null);
    });
    expect(deps.setError).toHaveBeenCalledWith('n8n down');
    expect(hook.result.current.showN8nPlanModal).toBe(true);
    expect(hook.result.current.isN8nPlanning).toBe(false);
  });

  it('reports a network failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { deps, hook } = setup(async () => {
      throw new Error('offline');
    });
    await act(async () => {
      await hook.result.current.handlePlanFreeTimeWithN8N(null);
    });
    expect(deps.setError).toHaveBeenCalled();
  });
});

describe('useWorkoutPlans schedule actions', () => {
  it('deletes one schedule from the list after the API confirms', async () => {
    const { hook } = setup();
    act(() => hook.result.current.setWorkoutSchedules([{ scheduleId: 'a' }, { scheduleId: 'b' }]));
    await act(async () => {
      await hook.result.current.handleDeleteSchedule('a');
    });
    expect(hook.result.current.workoutSchedules).toEqual([{ scheduleId: 'b' }]);
  });

  it('keeps the schedule when the API refuses', async () => {
    const { hook } = setup(async () => res(404, {}));
    act(() => hook.result.current.setWorkoutSchedules([{ scheduleId: 'a' }]));
    await act(async () => {
      await hook.result.current.handleDeleteSchedule('a');
    });
    expect(hook.result.current.workoutSchedules).toHaveLength(1);
  });

  it('deletes everything only after confirmation, then refreshes shortly after', async () => {
    vi.useFakeTimers();
    const { deps, hook } = setup();
    act(() => hook.result.current.setWorkoutSchedules([{ scheduleId: 'a' }]));

    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    await act(async () => {
      await hook.result.current.handleDeleteAllSchedules();
    });
    expect(fetch).not.toHaveBeenCalled();

    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    await act(async () => {
      await hook.result.current.handleDeleteAllSchedules();
    });
    expect(fetch.mock.calls[0][0]).toBe('https://api.test/schedules');
    expect(hook.result.current.workoutSchedules).toEqual([]);

    act(() => vi.advanceTimersByTime(1300));
    expect(deps.loadCalendarEvents).toHaveBeenCalledWith('tok');
    expect(deps.loadUserData).toHaveBeenCalled();
  });

  it('completes a schedule through the status endpoint', async () => {
    const { deps, hook } = setup();
    await act(async () => {
      await hook.result.current.handleToggleScheduleStatus({ scheduleId: 's9', status: 'PENDING' });
    });
    const call = fetch.mock.calls.find(([url]) => url.endsWith('/schedules/s9/status'));
    expect(call).toBeTruthy();
    expect(JSON.parse(call[1].body).status).toBe('COMPLETED');
    expect(deps.loadUserData).toHaveBeenCalled();
  });

  it('does nothing without a session token', async () => {
    const { hook } = setup(undefined, { getSessionToken: () => null });
    await act(async () => {
      await hook.result.current.handleDeleteAllSchedules();
      await hook.result.current.handleDeleteSchedule('a');
      await hook.result.current.handleToggleCardioTarget();
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
