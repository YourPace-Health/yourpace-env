import { describe, it, expect } from 'vitest';
import { buildSeries, lastDays, linePaths, summarize } from './trendData';

describe('lastDays', () => {
  it('returns N dates ending today, oldest first, across month boundaries', () => {
    expect(lastDays(3, new Date(2026, 10, 1))).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });
});

describe('buildSeries', () => {
  const dates = ['2026-11-01', '2026-11-02', '2026-11-03'];

  it('maps rows to days, leaving gaps as null', () => {
    const rows = [{ d: '2026-11-01T00:00:00Z', v: 70 }, { d: '2026-11-03', v: '71.5' }];
    expect(buildSeries(rows, dates, (r) => r.d, (r) => r.v)).toEqual([70, null, 71.5]);
  });

  it('lets the last row for a day win and ignores bad values', () => {
    const rows = [{ d: '2026-11-02', v: 1 }, { d: '2026-11-02', v: 2 }, { d: '2026-11-03', v: 'abc' }];
    expect(buildSeries(rows, dates, (r) => r.d, (r) => r.v)).toEqual([null, 2, null]);
  });

  it('copes with missing input', () => {
    expect(buildSeries(undefined, dates, (r) => r.d, (r) => r.v)).toEqual([null, null, null]);
  });
});

describe('linePaths', () => {
  it('returns nothing for an empty series', () => {
    expect(linePaths([null, null], 100, 50)).toEqual({ paths: [], points: [] });
  });

  it('splits the line at gaps instead of interpolating', () => {
    const { paths, points } = linePaths([1, 2, null, 3, 4], 100, 50);
    expect(paths).toHaveLength(2);
    expect(points).toHaveLength(4);
  });

  it('puts higher values higher up (smaller y) and honours min/max', () => {
    const { points } = linePaths([1, 5], 100, 50, { min: 1, max: 5, pad: 0 });
    expect(points[0].y).toBe(50);
    expect(points[1].y).toBe(0);
  });

  it('handles a flat series without NaN', () => {
    const { points } = linePaths([3, 3, 3], 100, 50);
    expect(points.every((p) => Number.isFinite(p.y))).toBe(true);
  });
});

describe('summarize', () => {
  it('reports first, latest and change', () => {
    expect(summarize([null, 70, null, 68.5])).toEqual({ first: 70, latest: 68.5, change: -1.5, count: 2 });
  });
  it('returns null without data', () => {
    expect(summarize([null])).toBeNull();
  });
});
