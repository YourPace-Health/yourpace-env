// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { TrendCharts } from './TrendCharts';
import { lastDays } from './trendData';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const today = lastDays(1)[0];

function stubFetch(map) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const key = Object.keys(map).find((k) => url.endsWith(k));
    if (!key) return new Response('[]', { status: 404 });
    return new Response(JSON.stringify(map[key]), { status: 200 });
  }));
}

describe('TrendCharts', () => {
  it('renders four labelled charts from the API data', async () => {
    stubFetch({
      '/health/weight/history': [{ logDate: today, weight: 70.2 }],
      '/water/history': [{ logDate: today, glasses: 6 }],
      '/checkin/history': [{ checkinDate: today, emotionalState: 4, energyLevel: 3 }],
    });
    render(<TrendCharts userToken="t" />);

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(4));
    const labels = screen.getAllByRole('img').map((n) => n.getAttribute('aria-label'));
    expect(labels.some((l) => l.includes('น้ำหนัก') && l.includes('70.2'))).toBe(true);
    expect(labels.some((l) => l.includes('น้ำดื่ม') && l.includes('6'))).toBe(true);
  });

  it('says so when there is no data', async () => {
    stubFetch({ '/health/weight/history': [], '/water/history': [], '/checkin/history': [] });
    render(<TrendCharts userToken="t" />);
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(4));
    expect(screen.getAllByRole('img')[0].getAttribute('aria-label')).toContain('ยังไม่มีข้อมูล');
  });

  it('shows an alert when loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    render(<TrendCharts userToken="t" />);
    expect((await screen.findByRole('alert')).textContent).toContain('ไม่สำเร็จ');
  });
});

describe('TrendCharts refresh', () => {
  it('fetches again when refreshKey changes (e.g. after logging a weight)', async () => {
    const calls = { n: 0 };
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url.endsWith('/health/weight/history')) calls.n += 1;
      return new Response('[]', { status: 200 });
    }));
    const { rerender } = render(<TrendCharts userToken="t" refreshKey={1} />);
    await waitFor(() => expect(calls.n).toBe(1));
    rerender(<TrendCharts userToken="t" refreshKey={2} />);
    await waitFor(() => expect(calls.n).toBe(2));
  });
});
