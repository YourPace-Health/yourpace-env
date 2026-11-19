import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App';

const SESSION = {
  user: { id: 'u1', email: 'ann@example.com', name: 'Ann', profilePicture: 'p.png' },
  token: 'TOKEN',
  refreshToken: 'REFRESH',
};

const profile = {
  age: 30,
  gender: 'FEMALE',
  height: 165,
  weight: 60,
  targetWeight: 55,
  fitnessGoal: 'LOSE_WEIGHT',
};

const today = new Date();
const schedules = [
  {
    scheduleId: 's1',
    title: 'Leg day',
    scheduledDate: today.toISOString(),
    durationMinutes: 30,
    burnedCalories: 0,
    targetIntensity: 'MODERATE',
    status: 'PENDING',
    details: [],
  },
  {
    scheduleId: 's2',
    title: 'Morning run',
    scheduledDate: today.toISOString(),
    durationMinutes: 20,
    burnedCalories: 200,
    targetIntensity: 'LIGHT',
    status: 'COMPLETED',
    details: [],
  },
];

function json(body, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

// Answers each endpoint the dashboard loads; tests override pieces by "METHOD /path".
function stubApi(overrides = {}) {
  const calls = [];
  const routes = {
    'GET /users/profile': () => json(profile),
    'GET /calendar/status': () => json({ connected: false }),
    'GET /water/today': () => json({ glasses: 3, targetGlasses: 8 }),
    'GET /schedules': () => json(schedules),
    'GET /health/progress-analytics': () => json({ currentStreakDays: 4, totalWorkoutsCompleted: 5, totalCaloriesAllTime: 1200 }),
    'GET /milestones': () => json([{ milestoneId: 'm1', title: 'First', description: 'd', dateAchieved: today.toISOString() }]),
    'GET /health/weight/history': () => json([]),
    'GET /mentor/history': () => json({ messages: [] }),
    'GET /meals/today': () => json({ meals: [], totalCalories: 0, targetCalories: 2000 }),
    'POST /auth/magic-link': () => json({}),
    ...overrides,
  };
  vi.stubGlobal('fetch', vi.fn((url, init = {}) => {
    const path = String(url).replace(/^.*\/api/, '').split('?')[0];
    const key = `${init.method || 'GET'} ${path}`;
    calls.push(key);
    return (routes[key] || (() => json({})))(init);
  }));
  return calls;
}

function signIn() {
  localStorage.setItem('yourpace_session', JSON.stringify(SESSION));
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  window.history.replaceState({}, '', '/');
  localStorage.clear();
  sessionStorage.clear();
  window.scrollTo = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App routing', () => {
  it('shows the landing page to visitors and opens the sign-in page', async () => {
    stubApi();
    render(<App />);
    fireEvent.click(screen.getAllByText('Get Started')[0]);
    expect(await screen.findByText('ยินดีต้อนรับกลับมา')).toBeTruthy();
    expect(window.location.pathname).toBe('/auth');

    fireEvent.click(screen.getByText('กลับหน้าแรก yourPace').closest('button'));
    expect(await screen.findAllByText('Get Started')).toBeTruthy();
    expect(window.location.pathname).toBe('/');
  });

  it('signs in from the auth page and lands on the dashboard', async () => {
    stubApi({
      'POST /auth/login': () => json({ accessToken: 'TOKEN', refreshToken: 'R', user: { userId: 'u1', email: 'ann@example.com', username: 'Ann' } }),
    });
    window.history.replaceState({}, '', '/auth');
    const { container } = render(<App />);
    await screen.findByText('ยินดีต้อนรับกลับมา');
    await waitFor(() => expect(screen.getByText('ดำเนินการต่อด้วย Google').closest('button').disabled).toBe(false));

    fireEvent.change(container.querySelector('input[type="email"]'), { target: { value: 'ann@example.com' } });
    fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: 'secret1' } });
    fireEvent.submit(container.querySelector('form'));

    expect(await screen.findByText(/ออกจากระบบ/)).toBeTruthy();
    expect(window.location.pathname).toBe('/dashboard');
  });
});

describe('App dashboard', () => {
  it('loads the user data and shows the schedules tab', async () => {
    signIn();
    const calls = stubApi();
    render(<App />);

    expect(await screen.findByText('Leg day')).toBeTruthy();
    for (const key of ['GET /users/profile', 'GET /schedules', 'GET /calendar/status', 'GET /health/progress-analytics', 'GET /milestones', 'GET /mentor/history', 'GET /meals/today']) {
      expect(calls).toContain(key);
    }
    expect(screen.getByText(/ออกจากระบบ/)).toBeTruthy();
    expect(window.location.pathname).toBe('/dashboard');
  });

  it('nudges the user to finish the health profile when it is empty', async () => {
    signIn();
    stubApi({ 'GET /users/profile': () => json({ fitnessGoal: '', height: 0 }) });
    render(<App />);
    const nudge = await screen.findAllByText(/โปรไฟล์|ข้อมูลสุขภาพ/);
    expect(nudge.length).toBeGreaterThan(0);
  });

  it('switches between the schedules, nutrition and progress tabs', async () => {
    signIn();
    stubApi();
    const { container } = render(<App />);
    await screen.findByText('Leg day');

    expect(container.textContent).toContain('แดชบอร์ดสุขภาพองค์รวม');
    fireEvent.click(screen.getByText('โภชนาการ & พลังงาน (AI Nutrition)').closest('button'));
    await waitFor(() => expect(container.textContent).not.toContain('แดชบอร์ดสุขภาพองค์รวม'));
    fireEvent.click(screen.getByText('ติดตามความคืบหน้า & สถิติสุขภาพ').closest('button'));
    expect(await screen.findByText(/แนวโน้ม/)).toBeTruthy();
    fireEvent.click(screen.getByText('ตารางการซ้อม & นัดหมาย').closest('button'));
    expect(await screen.findByText('Leg day')).toBeTruthy();
  });

  it('opens and closes the profile page', async () => {
    signIn();
    stubApi({ 'GET /equipments': () => json([]) });
    render(<App />);
    await screen.findByText('Leg day');

    fireEvent.click(screen.getByText(/ข้อมูลสุขภาพ \/ โปรไฟล์/).closest('button'));
    expect(await screen.findByText('ย้อนกลับไปที่ Dashboard')).toBeTruthy();
    expect(window.location.pathname).toBe('/profile');

    fireEvent.click(screen.getByText('ย้อนกลับไปที่ Dashboard').closest('button'));
    expect(await screen.findByText('Leg day')).toBeTruthy();
  });

  it('toggles the AI mentor chat', async () => {
    signIn();
    stubApi();
    render(<App />);
    await screen.findByText('Leg day');
    const chatButton = screen.getAllByRole('button', { name: /AI Mentor/ })[0];
    fireEvent.click(chatButton);
    expect(screen.getByText(/AI Mentor 💬/)).toBeTruthy();
    fireEvent.click(chatButton);
    expect(screen.queryByText(/AI Mentor 💬/)).toBeNull();
  });

  it('logs out and returns to the landing page', async () => {
    signIn();
    stubApi();
    render(<App />);
    await screen.findByText('Leg day');
    fireEvent.click(screen.getByText(/ออกจากระบบ/).closest('button'));
    expect((await screen.findAllByText('Get Started')).length).toBeGreaterThan(0);
    expect(localStorage.getItem('yourpace_session')).toBeNull();
    expect(window.location.pathname).toBe('/');
  });

  it('signs out when the server rejects the stored token', async () => {
    signIn();
    stubApi({ 'GET /users/profile': () => json({ error: 'expired' }, 401) });
    render(<App />);
    await waitFor(() => expect(localStorage.getItem('yourpace_session')).toBeNull());
    expect((await screen.findAllByText('ยินดีต้อนรับกลับมา')).length).toBeGreaterThan(0);
  });

  it('signs out when the schedules request is unauthorized', async () => {
    signIn();
    stubApi({ 'GET /schedules': () => json({}, 401) });
    render(<App />);
    await waitFor(() => expect(localStorage.getItem('yourpace_session')).toBeNull());
  });

  it('survives failing requests', async () => {
    signIn();
    stubApi({
      'GET /users/profile': () => Promise.reject(new Error('offline')),
      'GET /schedules': () => Promise.reject(new Error('offline')),
      'GET /water/today': () => Promise.reject(new Error('offline')),
      'GET /health/progress-analytics': () => Promise.reject(new Error('offline')),
      'GET /milestones': () => Promise.reject(new Error('offline')),
    });
    render(<App />);
    expect(await screen.findByText(/ออกจากระบบ/)).toBeTruthy();
  });

  it('deletes all plans through the dashboard', async () => {
    signIn();
    const calls = stubApi({ 'DELETE /schedules': () => json({ message: 'ok' }) });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    await screen.findByText('Leg day');
    fireEvent.click(screen.getByTitle('ลบตารางทั้งหมดที่เคยสร้างออก'));
    await waitFor(() => expect(calls).toContain('DELETE /schedules'));
  });
});

describe('App url handling', () => {
  it('reports a successful Google Calendar connection and cleans the URL', async () => {
    signIn();
    stubApi();
    window.history.replaceState({}, '', '/?google-calendar=connected');
    render(<App />);
    expect(await screen.findByText(/เชื่อมต่อกับ Google Calendar สำเร็จ/)).toBeTruthy();
    expect(window.location.search).toBe('');
    fireEvent.click(screen.getByText(/เชื่อมต่อกับ Google Calendar สำเร็จ/).closest('div').parentElement.querySelector('button'));
    await waitFor(() => expect(screen.queryByText(/เชื่อมต่อกับ Google Calendar สำเร็จ/)).toBeNull());
  });

  it('reports a failed Google Calendar connection', async () => {
    signIn();
    stubApi();
    window.history.replaceState({}, '', '/?calendar_error=token_exchange_failed');
    render(<App />);
    expect(await screen.findByText(/token_exchange_failed/)).toBeTruthy();
    expect(window.location.search).toBe('');
    fireEvent.click(screen.getByText(/token_exchange_failed/).closest('div').parentElement.querySelector('button'));
    await waitFor(() => expect(screen.queryByText(/token_exchange_failed/)).toBeNull());
  });

  it('signs in with a magic link token from the URL', async () => {
    const calls = stubApi({
      'POST /auth/verify-magic-link': () => json({ accessToken: 'MT', refreshToken: 'MR', user: { userId: 'u1', email: 'ann@example.com', username: 'Ann' } }),
    });
    window.history.replaceState({}, '', '/?magic-token=abc');
    render(<App />);
    expect(await screen.findByText(/ออกจากระบบ/)).toBeTruthy();
    expect(calls).toContain('POST /auth/verify-magic-link');
    expect(window.location.search).toBe('');
  });

  it('cleans the URL when the magic link is rejected', async () => {
    stubApi({ 'POST /auth/verify-magic-link': () => json({ error: 'expired' }, 400) });
    window.history.replaceState({}, '', '/?magic-token=bad');
    render(<App />);
    await waitFor(() => expect(window.location.search).toBe(''));
    expect((await screen.findAllByText('Get Started')).length).toBeGreaterThan(0);
  });
});
