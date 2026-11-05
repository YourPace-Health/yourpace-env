// Pure helpers for the 14-day trend charts (kept separate so they are easy to test).

/** The last `days` calendar dates up to and including `today`, oldest first, as YYYY-MM-DD. */
export function lastDays(days, today = new Date()) {
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    out.push(`${d.getFullYear()}-${mm}-${dd}`);
  }
  return out;
}

/**
 * One value per day: the last row for that date wins, days without a row are null.
 * `dateOf` and `valueOf` read a row; dates may be ISO timestamps (only the day is used).
 */
export function buildSeries(rows, dates, dateOf, valueOf) {
  const byDay = new Map();
  (rows || []).forEach((row) => {
    const day = String(dateOf(row) || '').slice(0, 10);
    const value = Number(valueOf(row));
    if (day && Number.isFinite(value)) byDay.set(day, value);
  });
  return dates.map((day) => (byDay.has(day) ? byDay.get(day) : null));
}

/** SVG polyline segments for a series; gaps (null) split the line so missing days are not interpolated. */
export function linePaths(series, width, height, { min, max, pad = 6 } = {}) {
  const values = series.filter((v) => v !== null);
  if (values.length === 0) return { paths: [], points: [] };

  const lo = min ?? Math.min(...values);
  let hi = max ?? Math.max(...values);
  if (hi === lo) hi = lo + 1; // flat line: avoid dividing by zero

  const stepX = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;
  const y = (v) => height - pad - ((v - lo) / (hi - lo)) * (height - pad * 2);

  const points = [];
  const paths = [];
  let current = [];
  series.forEach((v, i) => {
    if (v === null) {
      if (current.length) paths.push(current.join(' '));
      current = [];
      return;
    }
    const x = pad + i * stepX;
    const point = { x: Number(x.toFixed(1)), y: Number(y(v).toFixed(1)), value: v, index: i };
    points.push(point);
    current.push(`${point.x},${point.y}`);
  });
  if (current.length) paths.push(current.join(' '));
  return { paths, points };
}

/** Latest and first non-null value plus the change between them, for the text summary. */
export function summarize(series) {
  const values = series.filter((v) => v !== null);
  if (values.length === 0) return null;
  const first = values[0];
  const latest = values[values.length - 1];
  return { first, latest, change: Number((latest - first).toFixed(1)), count: values.length };
}
