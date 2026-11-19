import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SchedulesView } from './SchedulesView';

afterEach(cleanup);

const iso = (offsetDays, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const dateOnly = (offsetDays) => iso(offsetDays).slice(0, 10);

const schedule = (over = {}) => ({
  scheduleId: 's1',
  title: 'Leg day',
  scheduledDate: iso(0),
  durationMinutes: 40,
  burnedCalories: 250.4,
  targetIntensity: 'INTENSE',
  status: 'PENDING',
  details: [{ sets: 3, reps: 12, durationSeconds: 45, exercise: { name: 'Squat' } }],
  ...over,
});

const base = (over = {}) => ({
  calendarEvents: [],
  calendarLoading: false,
  cardioSteps: 0,
  completedPlansCount: 1,
  getScheduleId: (s) => s.scheduleId,
  getSessionToken: () => 'tok',
  handleConnectCalendar: vi.fn(),
  handleDeleteAllSchedules: vi.fn(),
  handleDeleteSchedule: vi.fn(),
  handleOpenWarmupGuide: vi.fn(),
  handleToggleCardioTarget: vi.fn(),
  handleToggleGCalEvent: vi.fn(),
  handleToggleScheduleStatus: vi.fn(),
  handleWaterGlassesChange: vi.fn(),
  isCalendarConnected: false,
  isN8nPlanning: false,
  isProfilePending: false,
  loadCalendarEvents: vi.fn(),
  schedulesLoading: false,
  setShowLogBurnModal: vi.fn(),
  setShowN8nPlanModal: vi.fn(),
  setWorkoutTab: vi.fn(),
  targetDistanceKm: 3,
  targetSteps: 4000,
  targetWaterGlasses: 10,
  totalBurned: 320,
  totalPlansCount: 3,
  upcomingPlansCount: 2,
  waterGlasses: 4,
  workoutSchedules: [],
  workoutTab: 'plan',
  ...over,
});

describe('SchedulesView dashboard cards', () => {
  it('toggles the cardio target and shows the achieved state', () => {
    const p = base({ cardioSteps: 1000 });
    const { rerender } = render(<SchedulesView {...p} />);
    fireEvent.click(screen.getByText('ทำสำเร็จแล้ว', { selector: 'button' }));
    expect(p.handleToggleCardioTarget).toHaveBeenCalledTimes(1);

    rerender(<SchedulesView {...base({ cardioSteps: 5000, handleToggleCardioTarget: p.handleToggleCardioTarget })} />);
    fireEvent.click(screen.getByText(/สำเร็จวันนี้แล้ว/));
    expect(p.handleToggleCardioTarget).toHaveBeenCalledTimes(2);
  });

  it('opens the burn logger and changes the water count', () => {
    const p = base();
    const { container } = render(<SchedulesView {...p} />);
    fireEvent.click(screen.getByText('บันทึกเพิ่ม'));
    expect(p.setShowLogBurnModal).toHaveBeenCalledWith(true);

    // every other small button on the page, including the water +/- controls
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    expect(p.handleWaterGlassesChange).toHaveBeenCalled();
  });

  it('offers the AI planner and clears all plans when schedules exist', () => {
    const p = base({ workoutSchedules: [schedule()] });
    render(<SchedulesView {...p} />);
    fireEvent.click(screen.getAllByText(/n8n AI/)[0]);
    expect(p.setShowN8nPlanModal).toHaveBeenCalled();
    fireEvent.click(screen.getByTitle('ลบตารางทั้งหมดที่เคยสร้างออก'));
    expect(p.handleDeleteAllSchedules).toHaveBeenCalled();
  });

  it('shows a busy planner button', () => {
    const { container } = render(<SchedulesView {...base({ isN8nPlanning: true })} />);
    expect(container.querySelector('button[disabled]')).toBeTruthy();
  });
});

describe('SchedulesView workout list', () => {
  it('shows a loading state and an empty state', () => {
    const { container, rerender } = render(<SchedulesView {...base({ schedulesLoading: true, totalPlansCount: 0 })} />);
    expect(container.textContent).not.toContain('ยังไม่มีตารางการออกกำลังกาย');
    expect(container.querySelector('.spinner')).toBeTruthy();

    rerender(<SchedulesView {...base({ totalPlansCount: 0 })} />);
    expect(container.textContent).toContain('ยังไม่มีตารางการออกกำลังกาย');

    rerender(<SchedulesView {...base({ totalPlansCount: 0, isProfilePending: true })} />);
    expect(container.textContent).toContain('กรุณาตั้งค่าข้อมูลสุขภาพ');
  });

  it('lists upcoming plans with their exercises and wires the row actions', () => {
    const upcoming = schedule({ scheduleId: 'later', title: 'Chest day', scheduledDate: iso(2), status: 'PENDING' });
    const p = base({ workoutSchedules: [schedule(), upcoming, schedule({ scheduleId: 'done', title: 'Old run', status: 'COMPLETED', scheduledDate: iso(-3), details: [] })] });
    render(<SchedulesView {...p} />);

    expect(screen.getByText('Leg day')).toBeTruthy();
    expect(screen.getByText('Chest day')).toBeTruthy();
    expect(screen.queryByText('Old run')).toBeNull(); // completed plans live in the history tab
    expect(screen.getByText(/กิจกรรมวันนี้/)).toBeTruthy();
    expect(screen.getAllByText('Squat').length).toBe(2);

    fireEvent.click(screen.getAllByTitle('ลบรายการนี้')[0]);
    expect(p.handleDeleteSchedule).toHaveBeenCalledWith('s1');

    fireEvent.click(screen.getAllByText(/วอร์มอัพ\/ยืดเหยียด/)[0]);
    expect(p.handleOpenWarmupGuide).toHaveBeenCalledWith('Leg day', expect.stringContaining('Squat'), 'warmup');

    fireEvent.click(screen.getAllByTitle('บันทึกว่าทำสำเร็จแล้ว')[0]);
    expect(p.handleToggleScheduleStatus).toHaveBeenCalled();
  });

  it('lists completed plans, newest first, in the history tab', () => {
    const p = base({
      workoutTab: 'history',
      workoutSchedules: [
        schedule({ scheduleId: 'a', title: 'Older', status: 'COMPLETED', scheduledDate: iso(-5), details: undefined }),
        schedule({ scheduleId: 'b', title: 'Newer', status: 'COMPLETED', scheduledDate: iso(-1), burnedCalories: 0 }),
        schedule({ scheduleId: 'c', title: 'Pending one', status: 'PENDING' }),
      ],
    });
    const { container } = render(<SchedulesView {...p} />);
    expect(screen.queryByText('Pending one')).toBeNull();
    const text = container.textContent;
    expect(text.indexOf('Newer')).toBeLessThan(text.indexOf('Older'));
    fireEvent.click(screen.getByText('Newer').closest('div').parentElement.querySelector('button[title*="ยกเลิก"]'));
    expect(p.handleToggleScheduleStatus).toHaveBeenCalled();
  });

  it('switches between the plan and history tabs', () => {
    const p = base();
    render(<SchedulesView {...p} />);
    fireEvent.click(screen.getByText(/ประวัติ/, { selector: 'button, button *' }));
    expect(p.setWorkoutTab).toHaveBeenCalledWith('history');
    fireEvent.click(screen.getByText(/แผน|กำลังจะมาถึง/, { selector: 'button, button *' }));
    expect(p.setWorkoutTab).toHaveBeenCalledWith('plan');
  });
});

describe('SchedulesView Google Calendar', () => {
  it('asks to connect when the calendar is not linked', () => {
    const p = base();
    render(<SchedulesView {...p} />);
    fireEvent.click(screen.getByText('Connect Google Calendar'));
    expect(p.handleConnectCalendar).toHaveBeenCalled();
  });

  it('shows a spinner while events load and an empty state when there are none', () => {
    const { container, rerender } = render(<SchedulesView {...base({ isCalendarConnected: true, calendarLoading: true })} />);
    expect(container.querySelectorAll('.spinner').length).toBeGreaterThan(0);
    rerender(<SchedulesView {...base({ isCalendarConnected: true })} />);
    expect(container.textContent).not.toContain('Connect Google Calendar');
  });

  it('refreshes events on demand', () => {
    const p = base({ isCalendarConnected: true });
    render(<SchedulesView {...p} />);
    fireEvent.click(screen.getByTitle('รีเฟรชตารางงาน'));
    expect(p.loadCalendarEvents).toHaveBeenCalled();
  });

  const events = () => [
    {
      id: 'g1',
      summary: 'Morning run (YourPaceEvent)',
      description: '✅ บันทึกจาก yourPace\n⏱️ 30 นาที\n- Jog 10 min\n- Sprint 5 min\nnotes here',
      start: { dateTime: iso(1, 7) },
      end: { dateTime: iso(1, 8) },
    },
    {
      id: 'g2',
      summary: 'Team lunch',
      location: 'Cafe',
      start: { dateTime: iso(0, 12) },
      end: { dateTime: iso(0, 13) },
    },
    { id: 'g3', start: { date: dateOnly(3) }, end: { date: dateOnly(4) } },
    {
      id: 'g4',
      summary: 'Yoga (YourPaceEvent)',
      description: 'just a free text description',
      start: { dateTime: iso(2, 18) },
      end: { dateTime: iso(2, 19) },
    },
  ];

  it('shows plan events from the calendar and approves them', () => {
    const p = base({ isCalendarConnected: true, calendarEvents: events() });
    render(<SchedulesView {...p} />);

    expect(screen.getAllByText('Morning run').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Yoga').length).toBeGreaterThan(0);
    expect(screen.getByText('Team lunch')).toBeTruthy();
    expect(screen.getByText(/Cafe/)).toBeTruthy();
    expect(screen.getByText(/ไม่มีชื่อ/)).toBeTruthy();

    fireEvent.click(screen.getAllByTitle('บันทึกว่าทำสำเร็จแล้ว (Approve)')[0]);
    expect(p.handleToggleGCalEvent).toHaveBeenCalled();

    fireEvent.click(screen.getAllByText(/วอร์มอัพ\/ยืดเหยียด/)[0]);
    expect(p.handleOpenWarmupGuide).toHaveBeenCalled();
  });

  it('marks calendar events as done when a matching workout is completed', () => {
    const p = base({
      isCalendarConnected: true,
      calendarEvents: events(),
      workoutSchedules: [schedule({ scheduleId: 'x', title: 'Morning run', status: 'COMPLETED', scheduledDate: iso(1) })],
    });
    const { rerender } = render(<SchedulesView {...p} />);
    expect(screen.queryAllByText('สำเร็จแล้ว (ยกเลิก)')).toHaveLength(0); // completed ones are hidden from the plan tab

    rerender(<SchedulesView {...base({ ...p, workoutTab: 'history' })} />);
    fireEvent.click(screen.getByText('สำเร็จแล้ว (ยกเลิก)'));
    expect(p.handleToggleGCalEvent).toHaveBeenCalled();
  });
});
