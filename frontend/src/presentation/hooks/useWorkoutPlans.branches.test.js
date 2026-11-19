import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkoutPlans } from './useWorkoutPlans';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('alert', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const res = (status, body = {}) => new Response(JSON.stringify(body), { status });

const setup = (fetchImpl = async () => res(200, {}), over = {}) => {
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  const deps = {
    getSessionToken: () => 'tok',
    getApiUrl: (p) => `https://api.test${p}`,
    getCalendarEvents: () => [],
    loadCalendarEvents: vi.fn(),
    loadUserData: vi.fn().mockResolvedValue(undefined),
    setChatLog: vi.fn(),
    setIsChatOpen: vi.fn(),
    setError: vi.fn(),
    setSuccessMessage: vi.fn(),
    ...over,
  };
  return { deps, hook: renderHook(() => useWorkoutPlans(deps)) };
};

describe('cardio target edge cases', () => {
  it('reports no change when the API rejects the log', async () => {
    const { deps, hook } = setup(async () => res(500));
    await act(async () => {
      await hook.result.current.handleToggleCardioTarget();
    });
    expect(deps.setSuccessMessage).not.toHaveBeenCalled();
  });

  it('survives a network failure while logging the goal', async () => {
    const { hook } = setup(async () => {
      throw new Error('offline');
    });
    await act(async () => {
      await hook.result.current.handleToggleCardioTarget();
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('un-completing without a stored workout only resets the steps', async () => {
    const { deps, hook } = setup();
    await act(async () => {
      hook.result.current.setCardioSteps(8000);
    });
    await act(async () => {
      await hook.result.current.handleToggleCardioTarget();
    });
    expect(hook.result.current.cardioSteps).toBe(0);
    expect(deps.loadUserData).not.toHaveBeenCalled();
  });
});

describe('planning edge cases', () => {
  it('does nothing without a token', async () => {
    const { hook } = setup(undefined, { getSessionToken: () => null });
    await act(async () => {
      await hook.result.current.handlePlanFreeTimeWithN8N({ preventDefault: () => {} });
      await hook.result.current.handleToggleScheduleStatus({ scheduleId: 'a', status: 'PENDING' });
      await hook.result.current.handleToggleGCalEvent({ summary: 'x' });
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the default message when the AI gives no text and no note was typed', async () => {
    const { deps, hook } = setup(async () => res(200, {}));
    await act(async () => {
      await hook.result.current.handlePlanFreeTimeWithN8N(undefined, '   ', 0);
    });
    const [updater] = deps.setChatLog.mock.calls[0];
    const log = updater([]);
    expect(log[0].text).toContain('จาก Google Calendar');
    expect(log[1].text).toContain('เรียบร้อยแล้ว');
  });

  it('falls back to a generic error without a server message', async () => {
    const { deps, hook } = setup(async () => res(500, {}));
    await act(async () => {
      await hook.result.current.handlePlanFreeTimeWithN8N();
    });
    expect(deps.setError).toHaveBeenCalledWith('ไม่สามารถเชื่อมต่อกับ n8n AI ได้');
  });
});

describe('delete and complete edge cases', () => {
  it('does not delete anything when the user cancels', async () => {
    const { hook } = setup();
    fetch.mockClear();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    await act(async () => {
      await hook.result.current.handleDeleteAllSchedules();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('survives failures when deleting', async () => {
    const { hook } = setup(async () => {
      throw new Error('offline');
    });
    await act(async () => {
      await hook.result.current.handleDeleteAllSchedules();
      await hook.result.current.handleDeleteSchedule('s1');
      await hook.result.current.handleToggleScheduleStatus({ scheduleId: 's2', status: 'PENDING' });
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('refuses a delete-all that the server rejects', async () => {
    const { deps, hook } = setup(async () => res(500));
    await act(async () => {
      await hook.result.current.handleDeleteAllSchedules();
    });
    expect(deps.setSuccessMessage).not.toHaveBeenCalled();
  });
});

describe('toggling schedule status', () => {
  it('ignores schedules without an id', async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.handleToggleScheduleStatus({ status: 'PENDING' });
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(hook.result.current.getScheduleId(null)).toBeNull();
    expect(hook.result.current.getScheduleId({ schedule_id: 'x' })).toBe('x');
    expect(hook.result.current.getScheduleId({ scheduleID: 'y' })).toBe('y');
  });

  it('deletes a completed manual log (no exercises)', async () => {
    const { deps, hook } = setup();
    await act(async () => {
      await hook.result.current.handleToggleScheduleStatus({ scheduleId: 's1', status: 'COMPLETED', title: 'Run', details: [] });
    });
    expect(fetch.mock.calls[0][0]).toContain('/schedules/s1');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
    expect(deps.loadUserData).toHaveBeenCalled();
  });

  it('puts a completed plan with exercises back to pending', async () => {
    const { deps, hook } = setup();
    await act(async () => {
      await hook.result.current.handleToggleScheduleStatus({ scheduleId: 's1', status: 'COMPLETED', title: 'Leg', details: [{}] });
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body).status).toBe('PENDING');
    expect(deps.setSuccessMessage).toHaveBeenCalled();
  });

  it('survives a failed pending update and a rejected completion', async () => {
    const { hook } = setup(async () => {
      throw new Error('offline');
    });
    await act(async () => {
      await hook.result.current.handleToggleScheduleStatus({ scheduleId: 's1', status: 'COMPLETED', details: [{}] });
    });
    expect(console.error).toHaveBeenCalled();

    const second = setup(async () => res(500));
    await act(async () => {
      await second.hook.result.current.handleToggleScheduleStatus({ scheduleId: 's1', status: 'COMPLETED', details: [{}] });
      await second.hook.result.current.handleToggleScheduleStatus({ scheduleId: 's1', status: 'PENDING' });
    });
    expect(second.deps.loadUserData).not.toHaveBeenCalled();
  });
});

describe('Google Calendar event toggling', () => {
  const event = {
    summary: 'Morning run (YourPaceEvent)',
    description: 'เผาผลาญประมาณ: 250 kcal',
    start: { dateTime: '2026-03-01T07:00:00+07:00' },
    end: { dateTime: '2026-03-01T08:30:00+07:00' },
  };

  it('saves a calendar event as a completed workout with parsed calories and duration', async () => {
    const { deps, hook } = setup();
    await act(async () => {
      await hook.result.current.handleToggleGCalEvent(event);
    });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ title: 'Morning run', durationMinutes: 90, burnedCalories: 250, scheduledDate: '2026-03-01', skipGoogleCalendar: true });
    expect(deps.loadUserData).toHaveBeenCalled();
  });

  it('uses defaults for events without times or calories, and reads kcal from free text', async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.handleToggleGCalEvent({ description: 'burn 120 kcal today' });
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ title: 'การออกกำลังกาย', durationMinutes: 60, burnedCalories: 120 });

    await act(async () => {
      await hook.result.current.handleToggleGCalEvent({ summary: 'All day', start: { date: '2026-03-02' }, end: { date: '2026-03-01' } });
    });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ durationMinutes: 60, burnedCalories: 300, scheduledDate: '2026-03-02' });
  });

  it('alerts when the server rejects the save or is unreachable', async () => {
    const rejected = setup(async () => res(400, { error: 'nope' }));
    await act(async () => {
      await rejected.hook.result.current.handleToggleGCalEvent(event);
    });
    expect(alert).toHaveBeenCalledWith('nope');

    const generic = setup(async () => res(400, {}));
    await act(async () => {
      await generic.hook.result.current.handleToggleGCalEvent(event);
    });
    expect(alert).toHaveBeenCalledWith('ไม่สามารถบันทึกการออกกำลังกายได้');

    const down = setup(async () => {
      throw new Error('offline');
    });
    await act(async () => {
      await down.hook.result.current.handleToggleGCalEvent(event);
    });
    expect(alert).toHaveBeenCalledWith('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  });

  it('undoes a completed event by deleting its matching workout', async () => {
    const { deps, hook } = setup();
    await act(async () => {
      hook.result.current.setWorkoutSchedules([{ scheduleId: 'done1', title: 'Morning run', status: 'COMPLETED' }, { scheduleId: 'p', title: 'Other', status: 'PENDING' }]);
    });
    await act(async () => {
      await hook.result.current.handleToggleGCalEvent(event);
    });
    expect(fetch.mock.calls[0][0]).toContain('/schedules/done1');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
    expect(deps.loadUserData).toHaveBeenCalled();
  });

  it('survives a failing undo', async () => {
    const { hook } = setup(async () => {
      throw new Error('offline');
    });
    await act(async () => {
      hook.result.current.setWorkoutSchedules([{ scheduleId: 'done1', title: 'Morning run', status: 'COMPLETED' }]);
    });
    await act(async () => {
      await hook.result.current.handleToggleGCalEvent(event);
    });
    expect(console.error).toHaveBeenCalled();
  });
});
